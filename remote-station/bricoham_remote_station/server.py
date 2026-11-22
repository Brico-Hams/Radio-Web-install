import argparse
import ipaddress
import json
import logging
import mimetypes
import os
import socket
import sqlite3
import ssl
import sys
import threading
import time
from collections import deque
from dataclasses import asdict
from http import HTTPStatus
from http.client import HTTPConnection, HTTPException, HTTPSConnection
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from bricoham_remote_station import __version__
from bricoham_remote_station.android_agent import (
    ANDROID_AGENT_PATH,
    ANDROID_AGENT_PROTOCOL,
    AndroidAgentError,
    AndroidReadonlyAgent,
)
from bricoham_remote_station.capabilities import capability_catalog
from bricoham_remote_station.cat_diagnostics import diagnostic_catalog
from bricoham_remote_station.contracts import API_VERSION
from bricoham_remote_station.diagnostic_reports import (
    REPORT_PATH,
    DiagnosticStore,
    add_diagnostic_arguments,
    configure_diagnostics,
)
from bricoham_remote_station.logbook import (
    ExportLimitError,
    Qso,
    add_qso,
    export_adif,
    initialize_logbook,
    read_qsos,
)
from bricoham_remote_station.radio_candidates import radio_candidate_catalog
from bricoham_remote_station.secure_http import (
    RequestJsonError,
    SecureHTTPServer,
    SecureRequestHandler,
)
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_remote_station.transport_security import (
    AgentLink,
    server_tls_context,
    validate_client_origin,
    validate_listen,
)
from bricoham_remote_station.websocket_transport import (
    TX_AUDIO_PATH,
    WebSocketError,
    WebSocketPeer,
    accept_websocket,
    bridge_audio,
    connect_websocket,
    read_auth_token,
)

LOGGER = logging.getLogger("bricoham.coordinator")
HEALTH_PATH = "/healthz"
STATUS_PATH = f"/api/{API_VERSION}/status"
CAPABILITIES_PATH = f"/api/{API_VERSION}/capabilities"
RADIOS_PATH = f"/api/{API_VERSION}/radios"
PROTOCOLS_PATH = f"/api/{API_VERSION}/protocols"
DIAGNOSTICS_PATH = f"/api/{API_VERSION}/diagnostics"
DEVICES_PATH = f"/api/{API_VERSION}/devices"
CAT_PATH = f"/api/{API_VERSION}/cat"
DIGITAL_PATH = f"/api/{API_VERSION}/digital"
ROTOR_PATH = f"/api/{API_VERSION}/rotor"
SETTINGS_PATH = f"/api/{API_VERSION}/radio-settings"
PTT_PATH = f"/api/{API_VERSION}/ptt"
AUDIO_PATH = f"/api/{API_VERSION}/audio"
AUDIO_STREAM_PATH = f"{AUDIO_PATH}/stream"
LOGBOOK_PATH = f"/api/{API_VERSION}/logbook"
ADIF_PATH = f"{LOGBOOK_PATH}/adif"

_READ_ROLES = frozenset({Role.ADMIN, Role.OPERATOR, Role.LISTENER})
_DIAGNOSTIC_ROLES = frozenset({Role.ADMIN, Role.OPERATOR})
_CAPABILITY_ROLES = frozenset(Role)
_STATION_AGENT_PORT = 8791
_MAX_AGENT_RESPONSE_BYTES = 1_000_000
_PACKAGED_WEB_DIRECTORY = Path(__file__).resolve().parent / "web_console"
_WEB_CONSOLE_DIRECTORY = (
    _PACKAGED_WEB_DIRECTORY
    if _PACKAGED_WEB_DIRECTORY.is_dir()
    else Path(__file__).resolve().parents[1] / "apps" / "web-console" / "dist"
)
_STATIC_SECURITY_HEADERS = {
    "Cache-Control": "no-cache",
    "Content-Security-Policy": (
        "default-src 'self'; connect-src 'self'; img-src 'self' data:; "
        "style-src 'self'; script-src 'self'; object-src 'none'; "
        "base-uri 'none'; frame-ancestors 'none'"
    ),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}


def _is_loopback(host: str) -> bool:
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


class CoordinatorHTTPServer(SecureHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        address: tuple[str, int],
        authenticator: TokenAuthenticator,
        simulator: DeterministicSimulator,
        web_console_directory: Path | None = None,
        station_agent_port: int = _STATION_AGENT_PORT,
        logbook_database: Path | None = None,
        tls_context: ssl.SSLContext | None = None,
        agent_link: AgentLink | None = None,
        client_origins: tuple[str, ...] = (),
        diagnostic_report_database: Path | None = None,
        android_agent_token: str | None = None,
    ) -> None:
        self.authenticator = authenticator
        self.simulator = simulator
        self.web_console_directory = web_console_directory or _WEB_CONSOLE_DIRECTORY
        self.station_agent_port = station_agent_port
        self.logbook_database = logbook_database
        self.diagnostic_reports = (
            DiagnosticStore(diagnostic_report_database)
            if diagnostic_report_database is not None
            else None
        )
        self._diagnostic_upload_lock = threading.Lock()
        self._diagnostic_upload_times: deque[float] = deque()
        self._audio_lock = threading.Lock()
        self._audio_stopping = False
        self._audio_connections: dict[socket.socket, socket.socket | None] = {}
        validate_listen(address[0], tls_context)
        self.agent_link = agent_link
        if agent_link is not None and authenticator.authenticate(f"Bearer {agent_link.token}"):
            raise ValueError(
                "El token de enlace al agente debe ser distinto de los tokens de usuario."
            )
        self.agent_tls_context = agent_link.context() if agent_link else None
        self.android_agent: AndroidReadonlyAgent | None = None
        self.android_authenticator: TokenAuthenticator | None = None
        if android_agent_token is not None:
            if tls_context is None or agent_link is not None:
                raise ValueError("Android agent requires HTTPS and no HTTPS station-agent link.")
            if (
                not 32 <= len(android_agent_token) <= 256
                or any(not 33 <= ord(char) <= 126 for char in android_agent_token)
                or authenticator.authenticate(f"Bearer {android_agent_token}") is not None
            ):
                raise ValueError("Android agent requires a distinct 32..256 character token.")
            self.android_authenticator = TokenAuthenticator({Role.OPERATOR: android_agent_token})
            self.android_agent = AndroidReadonlyAgent()
        self.client_origins = frozenset(validate_client_origin(origin) for origin in client_origins)
        if self.client_origins and tls_context is None:
            raise ValueError("Los clientes de otros orígenes requieren un host HTTPS.")
        if logbook_database is not None:
            initialize_logbook(logbook_database)
        super().__init__(address, CoordinatorRequestHandler, tls_context=tls_context)
        self._configure_own_origins(address[0])

    def _configure_own_origins(self, bind_host: str) -> None:
        # Own origins come from the configured listen address, never from the Host header.
        host = bind_host.strip("[]").lower()
        self._wildcard_bind = host in ("", "0.0.0.0", "::")
        names: set[str] = set()
        if not self._wildcard_bind:
            names.add(host)
        if self._wildcard_bind or _is_loopback(host):
            names |= {"localhost", "127.0.0.1", "::1"}
        self._own_hosts = frozenset(names)

    def origin_allowed(self, origin: str | None) -> bool:
        if origin is None:
            return False
        if origin in self.client_origins:
            return True
        try:
            parts = urlsplit(origin)
            hostname = parts.hostname
            port = parts.port or (443 if parts.scheme == "https" else 80)
        except ValueError:
            return False
        if (
            parts.scheme != ("https" if self.tls_context else "http")
            or hostname is None
            or parts.path
            or parts.query
            or parts.username is not None
            or port != self.server_address[1]
        ):
            return False
        if hostname in self._own_hosts:
            return True
        if self._wildcard_bind:
            # Wildcard bind: accept only IP literals; DNS rebinding needs a hostname.
            try:
                ipaddress.ip_address(hostname)
            except ValueError:
                return False
            return True
        return False
    def server_close(self) -> None:
        if self.android_agent is not None:
            self.android_agent.close()
        with self._audio_lock:
            self._audio_stopping = True
            connections = list(self._audio_connections.items())
        for downstream, upstream in connections:
            for sock in (upstream, downstream):
                if sock is not None:
                    try:
                        sock.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
        super().server_close()


class CoordinatorRequestHandler(SecureRequestHandler):
    server: CoordinatorHTTPServer
    protocol_version = "HTTP/1.1"
    server_version = "BricoHamCoordinator"
    sys_version = ""
    reserved_paths = (PTT_PATH,)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == ANDROID_AGENT_PATH:
            self._accept_android_agent()
            return
        if path == TX_AUDIO_PATH:
            self._proxy_tx_audio()
            return
        if path == HEALTH_PATH:
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "service": "Bricohams Radio Workspace - Remote Station Coordinator",
                    "version": __version__,
                    "api_version": API_VERSION,
                },
            )
            return

        if not path.startswith("/api/"):
            self._serve_web_console(path)
            return

        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return

        if path == STATUS_PATH:
            if role not in _READ_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            self._send_json(HTTPStatus.OK, self.server.simulator.snapshot())
            return

        if path in (LOGBOOK_PATH, ADIF_PATH):
            self._serve_logbook(path, role)
            return

        if path == CAPABILITIES_PATH:
            if role not in _CAPABILITY_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            self._send_json(HTTPStatus.OK, capability_catalog())
            return

        if path == RADIOS_PATH:
            if role not in _CAPABILITY_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            self._send_json(HTTPStatus.OK, radio_candidate_catalog())
            return

        if path == PROTOCOLS_PATH:
            if role not in _CAPABILITY_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            self._send_json(HTTPStatus.OK, diagnostic_catalog())
            return

        if path in (AUDIO_PATH, AUDIO_STREAM_PATH):
            if role not in _READ_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            elif urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "audio_invalid_query")
            else:
                self._serve_audio(path)
            return

        if path in (DEVICES_PATH, CAT_PATH, DIGITAL_PATH, ROTOR_PATH, SETTINGS_PATH, PTT_PATH):
            if role not in _DIAGNOSTIC_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            if path == PTT_PATH and urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "ptt_invalid_query")
                return
            self._serve_station_agent_data(path)
            return

        if path == REPORT_PATH:
            if role != Role.ADMIN:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            elif self.server.diagnostic_reports is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "diagnostics_not_configured")
            elif "?" in self.path:
                self._send_error(HTTPStatus.BAD_REQUEST, "diagnostic_invalid_query")
            else:
                try:
                    reports = self.server.diagnostic_reports.read()
                except sqlite3.Error:
                    LOGGER.error("Diagnostic report store read failed")
                    self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "diagnostic_storage_failed")
                    return
                self._send_json(HTTPStatus.OK, {"schema_version": 1, "reports": reports})
            return

        if path == DIAGNOSTICS_PATH:
            if role not in _DIAGNOSTIC_ROLES:
                self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "api_version": API_VERSION,
                    "simulator": True,
                    "hardware_discovered": False,
                    "cat_operations_enabled": False,
                    "tx_enabled": False,
                },
            )
            return

        self._send_error(HTTPStatus.NOT_FOUND, "not_found")

    def _accept_diagnostic_report(self) -> None:
        self.close_connection = True
        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return
        if role not in (_DIAGNOSTIC_ROLES | {Role.DIAGNOSTIC_REPORTER}):
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return
        origin = self.headers.get("Origin")
        if origin is not None and not self.server.origin_allowed(origin):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        store = self.server.diagnostic_reports
        if store is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "diagnostics_not_configured")
            return
        now = time.monotonic()
        with self.server._diagnostic_upload_lock:
            times = self.server._diagnostic_upload_times
            while times and times[0] < now - 60:
                times.popleft()
            if len(times) >= 60:
                self._send_error(HTTPStatus.TOO_MANY_REQUESTS, "diagnostic_rate_limited")
                return
            times.append(now)
        try:
            store.add(self.request_json())
        except RequestJsonError as error:
            self._send_error(error.status, str(error))
            return
        except ValueError:
            self._send_error(HTTPStatus.BAD_REQUEST, "diagnostic_invalid_report")
            return
        except (OSError, sqlite3.Error):
            LOGGER.error("Diagnostic report store write failed")
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "diagnostic_storage_failed")
            return
        self._send_json(HTTPStatus.ACCEPTED, {"accepted": True})

    def do_POST(self) -> None:
        if urlsplit(self.path).path == REPORT_PATH:
            self._accept_diagnostic_report()
            return
        if urlsplit(self.path).path in (ROTOR_PATH, SETTINGS_PATH, PTT_PATH, DIGITAL_PATH):
            self._operate_station_agent(urlsplit(self.path).path)
            return
        if urlsplit(self.path).path != LOGBOOK_PATH:
            self._method_not_allowed()
            return
        self.close_connection = True
        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return
        if role not in _DIAGNOSTIC_ROLES:
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return
        database = self.server.logbook_database
        if database is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "logbook_not_configured")
            return
        origin = self.headers.get("Origin")
        if origin is not None and not self.server.origin_allowed(origin):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        if self.headers.get_content_type() != "application/json":
            self._send_error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "json_required")
            return
        lengths = self.headers.get_all("Content-Length", [])
        if self.headers.get("Transfer-Encoding") is not None or len(lengths) != 1:
            self._send_error(HTTPStatus.BAD_REQUEST, "invalid_body_length")
            return
        if not lengths[0].isascii() or not lengths[0].isdigit() or len(lengths[0]) > 6:
            self._send_error(HTTPStatus.BAD_REQUEST, "invalid_body_length")
            return
        length = int(lengths[0])
        if length > 4096:
            self._send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "body_too_large")
            return
        previous_timeout = self.connection.gettimeout()
        try:
            self.connection.settimeout(5)
            body = self.rfile.read(length)
        except OSError:
            self._send_error(HTTPStatus.REQUEST_TIMEOUT, "body_read_timeout")
            return
        finally:
            self.connection.settimeout(previous_timeout)
        try:
            if urlsplit(self.path).query:
                raise ValueError("POST does not accept parameters")
            if len(body) != length:
                raise ValueError("Incomplete body")
            payload = json.loads(body)
            fields = {"call", "started_at", "frequency_hz", "mode"}
            if not isinstance(payload, dict) or set(payload) != fields:
                raise ValueError("Invalid QSO fields")
            identifier = add_qso(database, Qso(**payload))
        except (ValueError, UnicodeDecodeError, OverflowError, RecursionError):
            self._send_error(HTTPStatus.BAD_REQUEST, "invalid_qso")
            return
        except (sqlite3.Error, OSError):
            LOGGER.exception("No se pudo guardar el QSO en el logbook")
            self._send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "logbook_storage_error")
            return
        self._send_json(HTTPStatus.CREATED, {"api_version": API_VERSION, "qso_id": identifier})

    def _operate_station_agent(self, path: str) -> None:
        self.close_connection = True
        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return
        if role not in _DIAGNOSTIC_ROLES:
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return
        if path == DIGITAL_PATH and urlsplit(self.path).query:
            self._send_error(HTTPStatus.BAD_REQUEST, "wsjtx_invalid_query")
            return
        origin = self.headers.get("Origin")
        if origin is not None and not self.server.origin_allowed(origin):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        try:
            payload = self.request_json()
        except RequestJsonError as error:
            self._send_error(error.status, str(error))
            return
        self._serve_station_agent_data(
            path,
            method="POST",
            body=json.dumps(payload).encode("ascii"),
        )

    def do_PUT(self) -> None:
        self._method_not_allowed()

    def do_OPTIONS(self) -> None:
        origin = self.headers.get("Origin")
        requested = {
            value.strip().lower()
            for value in self.headers.get("Access-Control-Request-Headers", "").split(",")
            if value.strip()
        }
        method = self.headers.get("Access-Control-Request-Method")
        path = urlsplit(self.path).path
        if (
            origin not in self.server.client_origins
            or not path.startswith("/api/v1/")
            or method not in ("GET", "POST")
            or (
                method == "POST"
                and path not in (LOGBOOK_PATH, ROTOR_PATH, SETTINGS_PATH, PTT_PATH, DIGITAL_PATH)
            )
            or requested - {"authorization", "content-type"}
        ):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        self._send_json(
            HTTPStatus.OK,
            {"api_version": API_VERSION},
            headers={
                "Access-Control-Allow-Methods": "GET, POST",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
            },
        )

    def do_PATCH(self) -> None:
        self._method_not_allowed()

    def do_DELETE(self) -> None:
        self._method_not_allowed()

    def _method_not_allowed(self) -> None:
        self.close_connection = True
        self._send_error(
            HTTPStatus.METHOD_NOT_ALLOWED,
            "method_not_allowed",
            headers={"Allow": "GET", "Connection": "close"},
        )

    def _send_error(
        self,
        status: HTTPStatus,
        code: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._send_json(
            status,
            {
                "api_version": API_VERSION,
                "error": {"code": code},
            },
            headers=headers,
        )

    def _send_json(
        self,
        status: HTTPStatus,
        payload: dict[str, object],
        headers: dict[str, str] | None = None,
    ) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        origin = self.headers.get("Origin")
        if origin in self.server.client_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        if self.close_connection and (headers is None or "Connection" not in headers):
            self.send_header("Connection", "close")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _serve_logbook(self, path: str, role: Role) -> None:
        if role not in _READ_ROLES:
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return
        database = self.server.logbook_database
        if database is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "logbook_not_configured")
            return
        try:
            params = parse_qs(urlsplit(self.path).query, keep_blank_values=True, max_num_fields=4)
            if path == ADIF_PATH:
                if params:
                    raise ValueError("Export does not accept parameters")
            else:
                if set(params) - {"offset"} or len(params.get("offset", ["0"])) != 1:
                    raise ValueError("Invalid pagination")
                offset_text = params.get("offset", ["0"])[0]
                if not offset_text.isascii() or not offset_text.isdigit() or len(offset_text) > 9:
                    raise ValueError("Invalid offset")
                offset = int(offset_text)
        except ValueError:
            self._send_error(HTTPStatus.BAD_REQUEST, "invalid_logbook_request")
            return
        try:
            if path == ADIF_PATH:
                body = export_adif(database, max_records=5000).encode("ascii")
            else:
                qsos = read_qsos(database, limit=51, offset=offset)
        except ExportLimitError:
            self._send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "use_cli_export")
            return
        except (sqlite3.Error, OSError, ValueError):
            LOGGER.exception("No se pudo leer el logbook")
            self._send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "logbook_storage_error")
            return
        if path == LOGBOOK_PATH:
            self._send_json(
                HTTPStatus.OK,
                {
                    "api_version": API_VERSION,
                    "qsos": [asdict(qso) for qso in qsos[:50]],
                    "offset": offset,
                    "has_more": len(qsos) > 50,
                    "can_write": role in _DIAGNOSTIC_ROLES,
                },
            )
        else:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/x-adif; charset=us-ascii")
            self.send_header("Content-Disposition", 'attachment; filename="bricoham-logbook.adi"')
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            origin = self.headers.get("Origin")
            if origin in self.server.client_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.end_headers()
            self.wfile.write(body)

    def _proxy_tx_audio(self) -> None:
        if self.server.android_agent is not None:
            self._send_error(HTTPStatus.NOT_IMPLEMENTED, "android_agent_operation_unsupported")
            return
        origins = self.headers.get_all("Origin", [])
        if len(origins) != 1 or not self.server.origin_allowed(origins[0]):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        client: WebSocketPeer | None = None
        agent: WebSocketPeer | None = None
        with self.server._audio_lock:
            if self.server._audio_stopping:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "audio_tx_stopped")
                return
            self.server._audio_connections[self.connection] = None
        try:
            client = accept_websocket(self)
            token = read_auth_token(client)
            if self.server.authenticator.authenticate(f"Bearer {token}") not in _DIAGNOSTIC_ROLES:
                raise WebSocketError("audio_tx_unauthorized")
            if self.server.agent_link is not None:
                url = urlsplit(self.server.agent_link.url)
                agent = connect_websocket(
                    url.hostname, url.port or 443, context=self.server.agent_tls_context
                )
                token = self.server.agent_link.token
            else:
                agent = connect_websocket("127.0.0.1", self.server.station_agent_port)
            with self.server._audio_lock:
                if self.server._audio_stopping:
                    raise WebSocketError("audio_tx_stopped")
                self.server._audio_connections[self.connection] = agent.sock
            agent.send_json({"token": token})
            prepared = agent.receive(timeout=5)
            if not isinstance(prepared, str):
                raise WebSocketError("audio_tx_invalid_reply")
            value = json.loads(prepared)
            if not isinstance(value, dict) or value.get("event") != "prepared":
                raise WebSocketError("audio_tx_preparation_failed")
            client.send(prepared)
            bridge_audio(client, agent)
        except (WebSocketError, OSError, ValueError, RecursionError) as error:
            LOGGER.warning(
                "TX audio proxy ended (%s)",
                error if isinstance(error, WebSocketError) else type(error).__name__,
            )
            if client is None:
                self._send_error(HTTPStatus.BAD_REQUEST, "audio_tx_invalid_upgrade")
            else:
                try:
                    client.send_json({"event": "error", "code": "audio_tx_link_failed"})
                except (OSError, WebSocketError):
                    LOGGER.info("TX audio proxy peer already disconnected")
        finally:
            if agent is not None:
                agent.close()
            if client is not None:
                client.close()
            with self.server._audio_lock:
                self.server._audio_connections.pop(self.connection, None)

    def _serve_audio(self, path: str) -> None:
        if self.server.android_agent is not None:
            self._send_error(HTTPStatus.NOT_IMPLEMENTED, "android_agent_operation_unsupported")
            return
        if self.server.agent_link is not None:
            upstream = urlsplit(self.server.agent_link.url)
            connection = HTTPSConnection(
                upstream.hostname,
                upstream.port or 443,
                timeout=5,
                context=self.server.agent_tls_context,
            )
            authorization = f"Bearer {self.server.agent_link.token}"
        else:
            connection = HTTPConnection("127.0.0.1", self.server.station_agent_port, timeout=5)
            authorization = self.headers.get("Authorization", "")
        started = False
        response = None
        with self.server._audio_lock:
            if self.server._audio_stopping:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "audio_stopped")
                return
            self.server._audio_connections[self.connection] = None
        try:
            connection.request("GET", path, headers={"Authorization": authorization})
            with self.server._audio_lock:
                if self.server._audio_stopping:
                    return
                self.server._audio_connections[self.connection] = connection.sock
            response = connection.getresponse()
            if response.status != 200:
                raw = response.read(4097)
                try:
                    code = json.loads(raw)["error"]["code"]
                except (ValueError, KeyError, TypeError):
                    code = ""
                if (
                    response.status in (400, 403, 409, 503)
                    and isinstance(code, str)
                    and code.startswith("audio_")
                    and len(code) < 64
                    and code.replace("_", "").isascii()
                    and code.replace("_", "").isalnum()
                ):
                    self._send_error(HTTPStatus(response.status), code)
                else:
                    self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_request_failed")
                return
            if path == AUDIO_PATH:
                raw = response.read(4097)
                data = json.loads(raw)
                if (
                    len(raw) > 4096
                    or not isinstance(data, dict)
                    or type(data.get("enabled")) is not bool
                ):
                    raise ValueError("Invalid audio metadata")
                self._send_json(HTTPStatus.OK, data)
                return
            if (
                response.getheader("Content-Type") != "application/vnd.bricoham.pcm"
                or response.getheader("Transfer-Encoding", "").lower() != "chunked"
            ):
                raise ValueError("Invalid audio stream")
            self.close_connection = True
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/vnd.bricoham.pcm")
            self.send_header("Transfer-Encoding", "chunked")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Connection", "close")
            origin = self.headers.get("Origin")
            if origin in self.server.client_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.end_headers()
            started = True
            while True:
                data = response.read1(8192)
                if not data:
                    break
                self.wfile.write(f"{len(data):x}\r\n".encode("ascii") + data + b"\r\n")
                self.wfile.flush()
            # A capture stream is never expected to finish normally.
        except (OSError, TimeoutError, HTTPException, ValueError, UnicodeError) as error:
            LOGGER.warning("Audio proxy failed (%s)", type(error).__name__)
            if not started:
                self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_audio_failed")
        finally:
            if response is not None:
                response.close()
            connection.close()
            with self.server._audio_lock:
                self.server._audio_connections.pop(self.connection, None)

    def _accept_android_agent(self) -> None:
        agent = self.server.android_agent
        authenticator = self.server.android_authenticator
        if agent is None or authenticator is None:
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return
        if self.headers.get_all("Origin", []):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        peer: WebSocketPeer | None = None
        try:
            peer = accept_websocket(
                self, path=ANDROID_AGENT_PATH, protocol=ANDROID_AGENT_PROTOCOL
            )
            token = read_auth_token(peer)
            if authenticator.authenticate(f"Bearer {token}") is None:
                raise AndroidAgentError("android_agent_unauthorized", HTTPStatus.UNAUTHORIZED)
            agent.serve(peer)
        except (AndroidAgentError, WebSocketError, OSError) as error:
            code = (
                str(error) if isinstance(error, AndroidAgentError) else "android_agent_link_failed"
            )
            LOGGER.warning("Android agent connection ended (%s)", code)
            if peer is None:
                self._send_error(HTTPStatus.BAD_REQUEST, "android_agent_invalid_upgrade")
            else:
                try:
                    peer.send_json({"type": "error", "code": code})
                except (WebSocketError, OSError):
                    LOGGER.info("Android agent peer already disconnected")
        finally:
            if peer is not None:
                peer.close()
            self.close_connection = True

    def _serve_android_agent_data(self, path: str, method: str) -> None:
        agent = self.server.android_agent
        if agent is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "android_agent_unavailable")
            return
        if method != "GET" or path not in (CAT_PATH, DEVICES_PATH):
            self._send_error(HTTPStatus.NOT_IMPLEMENTED, "android_agent_operation_unsupported")
            return
        try:
            query = urlsplit(self.path).query
            if path == DEVICES_PATH:
                if query:
                    raise AndroidAgentError("android_agent_invalid_query", HTTPStatus.BAD_REQUEST)
                payload = agent.inventory()
            elif query:
                try:
                    params = parse_qs(query, keep_blank_values=True, strict_parsing=True)
                except ValueError as error:
                    raise AndroidAgentError(
                        "cat_invalid_query", HTTPStatus.BAD_REQUEST
                    ) from error
                if set(params) != {"command"} or len(params["command"]) != 1:
                    raise AndroidAgentError("cat_invalid_query", HTTPStatus.BAD_REQUEST)
                payload = agent.read(params["command"][0])
            else:
                payload = agent.catalog()
        except AndroidAgentError as error:
            self._send_error(error.status, str(error))
            return
        self._send_json(HTTPStatus.OK, payload)

    def _serve_station_agent_data(
        self,
        path: str,
        *,
        method: str = "GET",
        body: bytes | None = None,
    ) -> None:
        if self.server.android_agent is not None:
            self._serve_android_agent_data(path, method)
            return
        query = urlsplit(self.path).query if path in (CAT_PATH, ROTOR_PATH) else ""
        target = path + ("?" + query if query else "")
        timeout = (
            4 if path in (ROTOR_PATH, SETTINGS_PATH, PTT_PATH) else 3 if path == CAT_PATH else 2
        )
        if self.server.agent_link is not None:
            upstream = urlsplit(self.server.agent_link.url)
            connection = HTTPSConnection(
                upstream.hostname,
                upstream.port or 443,
                timeout=timeout,
                context=self.server.agent_tls_context,
            )
            authorization = f"Bearer {self.server.agent_link.token}"
        else:
            connection = HTTPConnection(
                "127.0.0.1",
                self.server.station_agent_port,
                timeout=timeout,
            )
            authorization = self.headers.get("Authorization", "")
        try:
            connection.request(
                method,
                target,
                body=body,
                headers={
                    "Authorization": authorization,
                    **({"Content-Type": "application/json"} if body is not None else {}),
                },
            )
            response = connection.getresponse()
            body = response.read(_MAX_AGENT_RESPONSE_BYTES + 1)
        except ssl.SSLCertVerificationError:
            LOGGER.warning("Station agent TLS certificate verification failed")
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_tls_failed")
            return
        except ssl.SSLError as error:
            LOGGER.warning("Station agent TLS negotiation failed (%s)", type(error).__name__)
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_tls_failed")
            return
        except HTTPException as error:
            LOGGER.warning("Station agent HTTP response invalid (%s)", type(error).__name__)
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_invalid_response")
            return
        except (OSError, TimeoutError) as error:
            LOGGER.warning("Station agent unavailable (%s)", type(error).__name__)
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "station_agent_unavailable")
            return
        finally:
            connection.close()

        if len(body) > _MAX_AGENT_RESPONSE_BYTES:
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_response_too_large")
            return
        if response.status != HTTPStatus.OK:
            if path != DEVICES_PATH and response.status in (400, 403, 409, 503):
                try:
                    error_payload = json.loads(body)
                except (ValueError, UnicodeDecodeError):
                    error_payload = None
                if isinstance(error_payload, dict):
                    error = error_payload.get("error")
                    code = error.get("code") if isinstance(error, dict) else None
                    if (
                        isinstance(code, str)
                        and len(code) < 64
                        and code.startswith(("cat_", "wsjtx_", "rotor_", "ptt_"))
                        and code.replace("_", "").isascii()
                        and code.replace("_", "").isalnum()
                    ):
                        self._send_error(HTTPStatus(response.status), code)
                        return
            status = (
                HTTPStatus.FORBIDDEN
                if response.status == HTTPStatus.FORBIDDEN
                else HTTPStatus.BAD_GATEWAY
            )
            self._send_error(status, "station_agent_request_failed")
            return

        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_invalid_response")
            return
        if not isinstance(payload, dict) or not (
            _is_device_inventory(payload)
            if path == DEVICES_PATH
            else _is_live_agent_data(path, payload, method=method)
        ):
            self._send_error(HTTPStatus.BAD_GATEWAY, "station_agent_invalid_response")
            return
        self._send_json(HTTPStatus.OK, payload)

    def _serve_web_console(self, url_path: str) -> None:
        root = self.server.web_console_directory.resolve()
        if not root.is_dir():
            self._send_error(HTTPStatus.NOT_FOUND, "web_console_not_built")
            return

        relative_path = unquote(url_path).lstrip("/")
        if not relative_path:
            relative_path = "index.html"

        try:
            requested_file = (root / relative_path).resolve()
            requested_file.relative_to(root)
        except ValueError:
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return

        if requested_file.is_file():
            file_path = requested_file
        elif Path(relative_path).suffix == "":
            file_path = root / "index.html"
        else:
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return

        try:
            body = file_path.read_bytes()
        except OSError:
            LOGGER.exception("No se pudo leer un archivo de la consola web")
            self._send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "static_file_error")
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for name, value in _STATIC_SECURITY_HEADERS.items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)


def _is_device_inventory(payload: dict[str, object]) -> bool:
    devices = payload.get("devices")
    return (
        payload.get("api_version") == API_VERSION
        and payload.get("schema_version") == "1.0"
        and isinstance(devices, list)
        and len(devices) <= 256
        and all(_is_inventory_device(device) for device in devices)
    )


def _is_live_agent_data(path: str, payload: dict[str, object], *, method: str = "GET") -> bool:
    if payload.get("api_version") != API_VERSION or payload.get("data_is_simulated") is not False:
        return False
    if path == DIGITAL_PATH and method == "POST":
        return (
            payload.get("operation") in ("replay", "halt_tx")
            and payload.get("delivery") == "sent_unconfirmed"
            and payload.get("transmission_stopped_confirmed") is False
            and payload.get("trust") == "untrusted_local_udp"
        )
    if path == PTT_PATH:
        return (
            payload.get("model") == "FTX-1"
            and payload.get("status") == "experimental"
            and payload.get("hardware_validation_complete") is False
            and all(
                type(payload.get(flag)) is bool
                for flag in (
                    "enabled",
                    "tx_audio_required",
                    "lease_active",
                    "rx_confirmed",
                    "stop_failed",
                )
            )
            and payload.get("lease_seconds") == 2.0
            and all(
                type(payload.get(field)) is int
                for field in (
                    "max_transmit_seconds",
                    "frequency_min_hz",
                    "frequency_max_hz",
                    "power_max_watts",
                )
            )
            and 1 <= payload["max_transmit_seconds"] <= 30
            and 30_000 <= payload["frequency_min_hz"] < payload["frequency_max_hz"] <= 470_000_000
            and 5 <= payload["power_max_watts"] <= 100
            and (
                "lease_id" not in payload
                or isinstance(payload["lease_id"], str)
                and 32 <= len(payload["lease_id"]) <= 128
                and payload["lease_id"].isascii()
            )
        )
    if path == ROTOR_PATH:
        return (
            payload.get("source") == "hamlib_rotctld"
            and payload.get("status") == "experimental"
            and payload.get("hardware_validation_complete") is False
            and isinstance(payload.get("motion_enabled"), bool)
            and isinstance(payload.get("lease_active"), bool)
            and isinstance(payload.get("stop_failed"), bool)
            and isinstance(payload.get("label"), str)
            and isinstance(payload.get("limits"), dict)
        )
    if path == SETTINGS_PATH:
        return (
            payload.get("status") == "experimental"
            and payload.get("hardware_validation_complete") is False
            and payload.get("tune_enabled") is False
            and type(payload.get("power_level_max")) is int
            and (
                (
                    payload.get("model") == "IC-7300"
                    and payload.get("power_unit") == "cat_position_0_255"
                    and 0 <= payload["power_level_max"] <= 255
                )
                or (
                    payload.get("model") == "FTX-1"
                    and payload.get("power_unit") == "watts_setpoint"
                    and 5 <= payload["power_level_max"] <= 100
                    and payload.get("tuner_switching_enabled") is False
                )
            )
            and isinstance(payload.get("power_adjustment_enabled"), bool)
            and isinstance(payload.get("tuner_switching_enabled"), bool)
            and all(
                flag not in payload or isinstance(payload[flag], bool)
                for flag in ("frequency_adjustment_enabled", "mode_adjustment_enabled")
            )
            and (
                payload.get("model") == "FTX-1"
                or not (
                    payload.get("frequency_adjustment_enabled")
                    or payload.get("mode_adjustment_enabled")
                )
            )
        )
    if path == CAT_PATH:
        queries = payload.get("queries")
        return (
            payload.get("status") == "experimental"
            and payload.get("hardware_validation_complete") is False
            and payload.get("tx_control_enabled") is False
            and isinstance(payload.get("model"), str)
            and isinstance(queries, list)
            and len(queries) <= 32
            and all(isinstance(query, str) for query in queries)
        )
    decodes = payload.get("decodes")
    return (
        payload.get("source") == "wsjtx_udp"
        and payload.get("authenticated") is False
        and payload.get("suitable_for_control") is False
        and payload.get("trust") == "untrusted_local_udp"
        and (
            payload.get("commands_enabled") is False
            or (
                payload.get("commands_enabled") is True
                and payload.get("allowed_operations") == ["replay", "halt_tx"]
                and type(payload.get("commands_ready")) is bool
            )
        )
        and isinstance(payload.get("connected"), bool)
        and isinstance(decodes, list)
        and len(decodes) <= 100
    )


def _is_inventory_device(device: object) -> bool:
    if not isinstance(device, dict):
        return False
    optional_text_fields = (
        "description",
        "vid",
        "pid",
        "manufacturer",
        "product",
        "interface",
    )
    port = device.get("port")
    return (
        isinstance(port, str)
        and 0 < len(port) <= 256
        and "hwid" in device
        and device["hwid"] is None
        and device.get("classification") == "unknown"
        and "serial_number" not in device
        and all(
            field in device and (device[field] is None or isinstance(device[field], str))
            for field in optional_text_fields
        )
    )


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bricohams Radio Workspace - Remote Station coordinator"
    )
    add_diagnostic_arguments(parser)
    parser.add_argument("--diagnostic-report-database", type=Path)
    parser.add_argument("--host", default="127.0.0.1", help="Dirección local de escucha")
    parser.add_argument("--tls-cert", type=Path)
    parser.add_argument("--tls-key", type=Path)
    parser.add_argument("--station-agent-url", help="URL base HTTPS del agente remoto.")
    parser.add_argument(
        "--android-agent",
        action="store_true",
        help="Enable the read-only outbound Android USB link (dedicated token and HTTPS).",
    )
    parser.add_argument("--station-agent-ca", type=Path)
    parser.add_argument("--station-agent-client-cert", type=Path)
    parser.add_argument("--station-agent-client-key", type=Path)
    parser.add_argument("--client-origin", action="append", default=[])
    parser.add_argument("--port", type=int, default=8790, help="Puerto de escucha")
    parser.add_argument(
        "--logbook-database",
        type=Path,
        help="Activar el logbook web en este archivo SQLite (crea la tabla si no existe).",
    )
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("--port debe estar entre 1 y 65535.")
    if args.host != "127.0.0.1" and (args.tls_cert is None or args.tls_key is None):
        parser.error("La escucha remota requiere --tls-cert y --tls-key.")
    if args.android_agent and (
        args.tls_cert is None or args.tls_key is None or args.station_agent_url is not None
    ):
        parser.error("--android-agent requires TLS credentials and no --station-agent-url.")
    if args.station_agent_ca is not None and args.station_agent_url is None:
        parser.error("--station-agent-ca requiere --station-agent-url.")
    if (args.station_agent_client_cert is None) != (args.station_agent_client_key is None):
        parser.error("mTLS requires --station-agent-client-cert and --station-agent-client-key.")
    if args.station_agent_client_cert is not None and args.station_agent_url is None:
        parser.error("mTLS client credentials require --station-agent-url.")
    return args


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = _parse_args(argv)
    try:
        authenticator = TokenAuthenticator.from_environment()
    except ValueError as error:
        print(f"Configuración no válida: {error}", file=sys.stderr)
        return 2

    diagnostics = None
    try:
        diagnostics = configure_diagnostics(args, "station-host")
        server = CoordinatorHTTPServer(
            (args.host, args.port),
            authenticator,
            DeterministicSimulator(),
            logbook_database=args.logbook_database,
            tls_context=server_tls_context(args.tls_cert, args.tls_key),
            agent_link=AgentLink(
                args.station_agent_url,
                os.environ.get("BRICOHAM_STATION_AGENT_TOKEN", ""),
                args.station_agent_ca,
                args.station_agent_client_cert,
                args.station_agent_client_key,
            )
            if args.station_agent_url
            else None,
            client_origins=tuple(args.client_origin),
            diagnostic_report_database=args.diagnostic_report_database,
            android_agent_token=os.environ.get("BRICOHAM_ANDROID_AGENT_TOKEN", "")
            if args.android_agent else None,
        )
    except (OSError, sqlite3.Error, ValueError):
        LOGGER.exception("No se pudo iniciar el coordinador o abrir el logbook configurado")
        if diagnostics is not None:
            diagnostics.close()
        return 2
    with diagnostics, server:
        scheme = "https" if server.tls_context else "http"
        LOGGER.info("Coordinador escuchando en %s://%s:%s", scheme, args.host, args.port)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            LOGGER.info("Coordinador detenido")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
