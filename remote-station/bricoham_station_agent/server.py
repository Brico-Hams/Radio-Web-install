import argparse
import json
import logging
import signal
import sqlite3
import ssl
import sys
import threading
import time
from http import HTTPStatus
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from bricoham_remote_station.cat_diagnostics import protocol_json_value
from bricoham_remote_station.diagnostic_reports import (
    add_diagnostic_arguments,
    configure_diagnostics,
)
from bricoham_remote_station.drivers.icom_scope import ScopeFrame
from bricoham_remote_station.drivers.yaesu_cat import YaesuModel
from bricoham_remote_station.secure_http import (
    RequestJsonError,
    SecureHTTPServer,
    SecureRequestHandler,
)
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.transport_security import server_tls_context, validate_listen
from bricoham_remote_station.websocket_transport import (
    TX_AUDIO_PATH,
    WebSocketError,
    WebSocketPeer,
    accept_websocket,
    read_auth_token,
)
from bricoham_station_agent import __version__
from bricoham_station_agent.audio import AudioCapture, AudioConfig, AudioError
from bricoham_station_agent.audio_tx import AudioTransmitter, TxAudioConfig
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat
from bricoham_station_agent.inventory import (
    API_VERSION,
    DeviceEnumerationError,
    DeviceEnumerator,
    DeviceInventory,
    enumerate_serial_ports,
)
from bricoham_station_agent.accessories import StationAccessories, support_matrix
from bricoham_station_agent.ptt import PttConfig, PttController, PttError
from bricoham_station_agent.radio_settings import RadioSettingsConfig
from bricoham_station_agent.rotor import RotorConfig, RotorController, RotorError
from bricoham_station_agent.wsjtx import WsjtxError, WsjtxReceiver

LOGGER = logging.getLogger("bricoham.station_agent")
HEALTH_PATH = "/healthz"
DEVICES_PATH = f"/api/{API_VERSION}/devices"
CAT_PATH = f"/api/{API_VERSION}/cat"
DIGITAL_PATH = f"/api/{API_VERSION}/digital"
ROTOR_PATH = f"/api/{API_VERSION}/rotor"
SETTINGS_PATH = f"/api/{API_VERSION}/radio-settings"
PTT_PATH = f"/api/{API_VERSION}/ptt"
AUDIO_PATH = f"/api/{API_VERSION}/audio"
ACCESSORIES_PATH = f"/api/{API_VERSION}/accessories"
AUDIO_STREAM_PATH = f"{AUDIO_PATH}/stream"
SCOPE_PATH = f"{CAT_PATH}/scope"
_INVENTORY_ROLES = frozenset({Role.ADMIN, Role.OPERATOR})


class StationAgentHTTPServer(SecureHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        port: int,
        authenticator: TokenAuthenticator,
        enumerator: DeviceEnumerator,
        cat: SerialCat | None = None,
        wsjtx: WsjtxReceiver | None = None,
        *,
        host: str = "127.0.0.1",
        tls_context: ssl.SSLContext | None = None,
        rotor: RotorController | None = None,
        audio: AudioCapture | None = None,
        ptt: PttController | None = None,
        accessories: StationAccessories | None = None,
    ) -> None:
        self.accessories = accessories
        self.authenticator = authenticator
        self.inventory = DeviceInventory(enumerator)
        self.cat = cat
        self.wsjtx = wsjtx
        self.rotor = rotor
        self.audio = audio
        self.ptt = ptt
        try:
            validate_listen(host, tls_context)
            super().__init__((host, port), StationAgentRequestHandler, tls_context=tls_context)
        except (OSError, ValueError):
            self._close_integrations()
            raise

    def _close_integrations(self) -> None:
        try:
            # The amplifier returns to STANDBY and any tune stops before the radio is released.
            if self.accessories is not None:
                self.accessories.emergency_stop("close")
        finally:
            try:
                if self.ptt is not None:
                    self.ptt.close()
            finally:
                self._close_other_integrations()

    def _close_other_integrations(self) -> None:
        if self.audio is not None:
            self.audio.close()
        try:
            if self.cat is not None:
                self.cat.close()
        finally:
            try:
                if self.wsjtx is not None:
                    self.wsjtx.close()
            finally:
                if self.rotor is not None:
                    self.rotor.close()

    def server_close(self) -> None:
        try:
            super().server_close()
        finally:
            self._close_integrations()


class StationAgentRequestHandler(SecureRequestHandler):
    server: StationAgentHTTPServer
    protocol_version = "HTTP/1.1"
    server_version = "BricoHamStationAgent"
    sys_version = ""
    reserved_paths = (PTT_PATH,)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == TX_AUDIO_PATH:
            self._receive_tx_audio()
            return
        if path == HEALTH_PATH:
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "service": "BricoHam Station Agent",
                    "version": __version__,
                    "api_version": API_VERSION,
                },
            )
            return

        if path not in (
            DEVICES_PATH,
            CAT_PATH,
            DIGITAL_PATH,
            ROTOR_PATH,
            SETTINGS_PATH,
            PTT_PATH,
            AUDIO_PATH,
            AUDIO_STREAM_PATH,
            ACCESSORIES_PATH,
            SCOPE_PATH,
        ):
            self._send_error(HTTPStatus.NOT_FOUND, "not_found")
            return

        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return
        if role not in (
            _INVENTORY_ROLES | {Role.LISTENER}
            if path in (AUDIO_PATH, AUDIO_STREAM_PATH)
            else _INVENTORY_ROLES
        ):
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return

        if path in (AUDIO_PATH, AUDIO_STREAM_PATH):
            if urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "audio_invalid_query")
                return
            if path == AUDIO_PATH:
                self._send_json(
                    HTTPStatus.OK,
                    self.server.audio.metadata()
                    if self.server.audio
                    else {"api_version": "v1", "enabled": False},
                )
                return
            if self.server.audio is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "audio_not_configured")
                return
            self._stream_audio()
            return

        if path == ACCESSORIES_PATH:
            if urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "accessories_invalid_query")
                return
            if self.server.accessories is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "accessories_not_configured")
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "api_version": "v1",
                    "data_is_simulated": False,
                    **self.server.accessories.snapshot(),
                    "support": support_matrix(),
                },
            )
            return

        if path == SCOPE_PATH:
            self._stream_scope()
            return

        if path == PTT_PATH:
            if urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "ptt_invalid_query")
                return
            if self.server.ptt is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "ptt_not_configured")
                return
            try:
                payload = self.server.ptt.snapshot()
            except PttError as error:
                self._send_error(HTTPStatus.CONFLICT, str(error))
                return
            self._send_json(HTTPStatus.OK, payload)
            return

        if path == ROTOR_PATH:
            if self.server.rotor is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "rotor_not_configured")
                return
            try:
                query = urlsplit(self.path).query
                if query not in ("", "command=position"):
                    raise ValueError("Invalid rotor query")
                payload = self.server.rotor.snapshot(read_position=bool(query))
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "rotor_invalid_query")
                return
            except RotorError as error:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, str(error))
                return
            self._send_json(HTTPStatus.OK, payload)
            return

        if path == SETTINGS_PATH:
            if self.server.cat is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "cat_settings_not_configured")
                return
            try:
                if urlsplit(self.path).query:
                    raise ValueError("Settings metadata does not accept a query.")
                payload = self.server.cat.settings_catalog()
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "cat_invalid_settings_query")
                return
            except CatError as error:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, str(error))
                return
            self._send_json(HTTPStatus.OK, payload)
            return

        if path == CAT_PATH:
            if self.server.cat is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "cat_not_configured")
                return
            try:
                params = parse_qs(
                    urlsplit(self.path).query, keep_blank_values=True, max_num_fields=1
                )
                if not params:
                    payload = self.server.cat.catalog()
                elif set(params) == {"command"} and len(params["command"]) == 1:
                    payload = self.server.cat.read(params["command"][0])
                else:
                    raise ValueError("Invalid query")
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "cat_invalid_query")
                return
            except CatError as error:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, str(error))
                return
            self._send_json(HTTPStatus.OK, payload)
            return

        if path == DIGITAL_PATH:
            if self.server.wsjtx is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "wsjtx_not_configured")
                return
            self._send_json(HTTPStatus.OK, self.server.wsjtx.snapshot())
            return

        try:
            inventory = self.server.inventory.snapshot()
        except DeviceEnumerationError as error:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, str(error))
            return
        self._send_json(HTTPStatus.OK, inventory)

    def _receive_tx_audio(self) -> None:
        if self.headers.get_all("Origin", []):
            self._send_error(HTTPStatus.FORBIDDEN, "origin_not_allowed")
            return
        peer: WebSocketPeer | None = None
        session = None
        try:
            peer = accept_websocket(self)
            token = read_auth_token(peer)
            if self.server.authenticator.authenticate(f"Bearer {token}") not in _INVENTORY_ROLES:
                raise WebSocketError("audio_tx_unauthorized")
            ptt = self.server.ptt
            if ptt is None or ptt.tx_audio is None:
                raise AudioError("audio_tx_not_configured")
            if ptt.cat.read("VX").get("vox_enabled") is not False:
                raise AudioError("audio_tx_disable_vox_locally")
            session = ptt.tx_audio.open()
            peer.send_json({"event": "prepared", "audio_session_id": session.identifier})
            ready = False
            last_reply = time.monotonic()
            while True:
                data = peer.receive(timeout=0.3)
                if not isinstance(data, bytes):
                    raise AudioError("audio_tx_invalid_frame")
                session.push(data)
                if not ready and session.ready():
                    peer.send_json({"event": "ready", "audio_session_id": session.identifier})
                    ready = True
                    last_reply = time.monotonic()
                elif time.monotonic() - last_reply >= 0.8:
                    peer.send_json({"event": "alive"})
                    last_reply = time.monotonic()
        except (AudioError, CatError, WebSocketError, OSError) as error:
            LOGGER.warning(
                "TX audio connection ended (%s)",
                error if isinstance(error, WebSocketError | AudioError) else type(error).__name__,
            )
            if peer is None:
                self._send_error(HTTPStatus.BAD_REQUEST, "audio_tx_invalid_upgrade")
            else:
                code = (
                    str(error)
                    if isinstance(error, AudioError | WebSocketError)
                    else "audio_tx_link_failed"
                )
                try:
                    peer.send_json({"event": "error", "code": code})
                except (OSError, WebSocketError):
                    LOGGER.info("TX audio error could not be delivered to disconnected client")
        finally:
            try:
                if peer is not None:
                    peer.close()
            finally:
                if session is not None:
                    session.close()

    def _stream_scope(self) -> None:
        """Bounded NDJSON stream of CI-V scope frames (receive-only); ends after `seconds` or on disconnect."""
        cat = self.server.cat
        if cat is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "cat_not_configured")
            return
        try:
            params = parse_qs(urlsplit(self.path).query, keep_blank_values=True, max_num_fields=2)
            if not set(params) <= {"seconds", "fps"} or any(len(v) != 1 for v in params.values()):
                raise ValueError("Invalid query")
            seconds = float(params.get("seconds", ["10"])[0])
            fps = float(params.get("fps", ["5"])[0])
            frames = cat.scope_stream(seconds, fps)
            first = next(frames, None)
        except ValueError:
            self._send_error(HTTPStatus.BAD_REQUEST, "cat_invalid_query")
            return
        except CatError as error:
            self._send_error(
                HTTPStatus.NOT_IMPLEMENTED
                if str(error) == "cat_scope_not_sourced"
                else HTTPStatus.SERVICE_UNAVAILABLE,
                str(error),
            )
            return
        self.close_connection = True
        try:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/x-ndjson")
            self.send_header("Transfer-Encoding", "chunked")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Connection", "close")
            self.end_headers()

            def emit(frame: ScopeFrame) -> None:
                line = (
                    json.dumps(
                        {
                            "start_hz": frame.start_hz,
                            "end_hz": frame.end_hz,
                            "out_of_range": frame.out_of_range,
                            "pixels": list(frame.pixels),
                        },
                        separators=(",", ":"),
                    )
                    + "\n"
                ).encode("ascii")
                self.wfile.write(f"{len(line):x}\r\n".encode("ascii") + line + b"\r\n")
                self.wfile.flush()

            if first is not None:
                emit(first)
            for frame in frames:
                emit(frame)
            self.wfile.write(b"0\r\n\r\n")
        except CatError as error:
            LOGGER.warning("Scope stream failed: %s", error)
        except (OSError, TimeoutError):
            pass
        finally:
            frames.close()

    def _stream_audio(self) -> None:
        try:
            session = self.server.audio.open()
        except AudioError as error:
            self._send_error(
                HTTPStatus.CONFLICT
                if str(error) == "audio_busy"
                else HTTPStatus.SERVICE_UNAVAILABLE,
                str(error),
            )
            return
        self.close_connection = True
        try:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/vnd.bricoham.pcm")
            self.send_header("Transfer-Encoding", "chunked")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Connection", "close")
            self.end_headers()

            def chunk(data: bytes) -> None:
                self.wfile.write(f"{len(data):x}\r\n".encode("ascii") + data + b"\r\n")
                self.wfile.flush()

            chunk(session.header())
            while True:
                block = session.read()
                chunk(len(block).to_bytes(4, "little") + block)
        except AudioError as error:
            LOGGER.warning("Audio stream failed: %s", error)
        except (OSError, TimeoutError):
            pass
        finally:
            session.close()

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        if path not in (ROTOR_PATH, SETTINGS_PATH, PTT_PATH, DIGITAL_PATH, ACCESSORIES_PATH):
            self._method_not_allowed()
            return
        self.close_connection = True
        role = self.server.authenticator.authenticate(self.headers.get("Authorization"))
        if role is None:
            self._send_error(HTTPStatus.UNAUTHORIZED, "unauthorized")
            return
        if role not in _INVENTORY_ROLES:
            self._send_error(HTTPStatus.FORBIDDEN, "forbidden")
            return
        if path == ACCESSORIES_PATH:
            self._operate_accessories()
            return
        if path == DIGITAL_PATH:
            if self.server.wsjtx is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "wsjtx_not_configured")
                return
            if urlsplit(self.path).query:
                self._send_error(HTTPStatus.BAD_REQUEST, "wsjtx_invalid_query")
                return
            try:
                result = self.server.wsjtx.operate(self.request_json())
            except RequestJsonError as error:
                self._send_error(error.status, str(error))
                return
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "wsjtx_invalid_operation")
                return
            except WsjtxError as error:
                self._send_error(
                    HTTPStatus.CONFLICT
                    if str(error) in ("wsjtx_command_request_repeated", "wsjtx_replay_rate_limited")
                    else HTTPStatus.SERVICE_UNAVAILABLE,
                    str(error),
                )
                return
            self._send_json(HTTPStatus.OK, result)
            return
        if path == PTT_PATH:
            if self.server.ptt is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "ptt_not_configured")
                return
            try:
                result = self.server.ptt.operate(self.request_json())
            except RequestJsonError as error:
                self._send_error(error.status, str(error))
                return
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "ptt_invalid_operation")
                return
            except PttError as error:
                self._send_error(
                    HTTPStatus.SERVICE_UNAVAILABLE
                    if str(error) in ("ptt_disabled", "ptt_transaction_unconfirmed")
                    else HTTPStatus.CONFLICT,
                    str(error),
                )
                return
            self._send_json(HTTPStatus.OK, result)
            return
        if path == SETTINGS_PATH:
            if self.server.cat is None:
                self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "cat_settings_not_configured")
                return
            try:
                result = self.server.cat.operate_settings(self.request_json())
            except RequestJsonError as error:
                self._send_error(error.status, str(error))
                return
            except ValueError:
                self._send_error(HTTPStatus.BAD_REQUEST, "cat_invalid_settings_operation")
                return
            except CatError as error:
                status = (
                    HTTPStatus.CONFLICT
                    if str(error)
                    in (
                        "cat_busy",
                        "cat_settings_require_rx",
                        "cat_disable_ptt_tune_locally",
                        "cat_setting_request_repeated",
                        "cat_power_head_limit_exceeded",
                    )
                    else HTTPStatus.SERVICE_UNAVAILABLE
                )
                self._send_error(status, str(error))
                return
            self._send_json(HTTPStatus.OK, result)
            return
        if self.server.rotor is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "rotor_not_configured")
            return
        try:
            payload = self.request_json()
            result = self.server.rotor.operate(payload)
        except RequestJsonError as error:
            self._send_error(error.status, str(error))
            return
        except ValueError:
            self._send_error(HTTPStatus.BAD_REQUEST, "rotor_invalid_operation")
            return
        except RotorError as error:
            status = (
                HTTPStatus.CONFLICT
                if str(error)
                in (
                    "rotor_busy",
                    "rotor_lease_expired",
                    "rotor_stop_unconfirmed",
                    "rotor_request_cancelled_or_repeated",
                    "rotor_park_not_configured",
                )
                else HTTPStatus.SERVICE_UNAVAILABLE
            )
            self._send_error(status, str(error))
            return
        self._send_json(HTTPStatus.OK, result)

    def _operate_accessories(self) -> None:
        accessories = self.server.accessories
        if accessories is None:
            self._send_error(HTTPStatus.SERVICE_UNAVAILABLE, "accessories_not_configured")
            return
        if urlsplit(self.path).query:
            self._send_error(HTTPStatus.BAD_REQUEST, "accessories_invalid_query")
            return
        try:
            payload = self.request_json()
        except RequestJsonError as error:
            self._send_error(error.status, str(error))
            return
        operation = payload.get("operation") if isinstance(payload, dict) else None
        # A held PTT lease counts as TX: operate and band changes are refused meanwhile.
        ptt = self.server.ptt
        try:
            transmitting = bool(ptt is not None and ptt.snapshot()["lease_active"])
        except PttError:
            transmitting = True
        if operation == "standby" and set(payload) == {"operation"}:
            result = accessories.standby("operator")
        elif operation == "emergency_stop" and set(payload) == {"operation"}:
            result = accessories.emergency_stop("emergency")
        elif operation == "stop_tune" and set(payload) == {"operation"}:
            result = accessories.stop_tune("operator")
        elif operation == "operate" and set(payload) == {"operation"}:
            result = accessories.operate(tx=transmitting)
        elif (
            operation == "band"
            and set(payload) == {"operation", "frequency_hz"}
            and isinstance(payload["frequency_hz"], (int, float))
            and not isinstance(payload["frequency_hz"], bool)
        ):
            result = accessories.follow_band(payload["frequency_hz"], tx=transmitting)
        else:
            self._send_error(HTTPStatus.BAD_REQUEST, "accessories_invalid_operation")
            return
        if not result.get("ok"):
            refused = result.get("reason") in ("unsupported", "disabled")
            self._send_error(
                HTTPStatus.SERVICE_UNAVAILABLE if refused else HTTPStatus.CONFLICT,
                f"accessories_{result.get('reason', 'standby_unconfirmed')}",
            )
            return
        self._send_json(
            HTTPStatus.OK,
            {"api_version": "v1", "data_is_simulated": False, **result, **accessories.snapshot()},
        )

    def do_PUT(self) -> None:
        self._method_not_allowed()

    def do_PATCH(self) -> None:
        self._method_not_allowed()

    def do_DELETE(self) -> None:
        self._method_not_allowed()

    def _method_not_allowed(self) -> None:
        self.close_connection = True
        self._send_error(HTTPStatus.METHOD_NOT_ALLOWED, "method_not_allowed")

    def _send_error(self, status: HTTPStatus, code: str) -> None:
        self._send_json(
            status,
            {"api_version": API_VERSION, "error": {"code": code}},
            headers={"Allow": "GET"} if status == HTTPStatus.METHOD_NOT_ALLOWED else None,
        )

    def _send_json(
        self,
        status: HTTPStatus,
        payload: dict[str, object],
        headers: dict[str, str] | None = None,
    ) -> None:
        body = json.dumps(
            payload, ensure_ascii=False, separators=(",", ":"), default=protocol_json_value
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "BricoHams Station Agent — base URL http://127.0.0.1:<port>; "
            "default loopback port 8791. "
            f"Read-only inventory: GET {DEVICES_PATH}."
        )
    )
    add_diagnostic_arguments(parser)
    parser.add_argument(
        "--port",
        type=int,
        default=8791,
        help="Loopback port (default: 8791).",
    )
    parser.add_argument("--enable-experimental-cat", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--tls-cert", type=Path)
    parser.add_argument("--tls-key", type=Path)
    parser.add_argument(
        "--tls-client-ca",
        type=Path,
        help="Require a client certificate signed by this CA on every agent TLS connection.",
    )
    parser.add_argument(
        "--rotor-config", type=Path, help="Explicit local rotctld JSON configuration."
    )
    parser.add_argument(
        "--rotor-serial",
        help="PROTOCOL:PORT[:BAUD] (dcu1, rotorez, rt21) to drive the rotor over serial "
        "instead of rotctld; the JSON port field is then unused.",
    )
    parser.add_argument("--serial-model")
    parser.add_argument("--radio-settings-config", type=Path)
    parser.add_argument("--ptt-config", type=Path, help="Local default-off guarded FTX-1 PTT JSON.")
    parser.add_argument(
        "--accessories-config",
        type=Path,
        help="Local station-accessories JSON ({'amplifier': {'device', 'operate_allowed'}, 'tuner': {'device'}}); "
        "the amplifier stays in STANDBY unless operate_allowed is true.",
    )
    parser.add_argument("--audio-config", type=Path, help="Explicit RX audio input JSON.")
    parser.add_argument(
        "--tx-audio-config",
        type=Path,
        help="Explicit muted USB DAC output JSON; requires guarded FTX-1 PTT.",
    )
    parser.add_argument("--serial-port")
    parser.add_argument("--serial-baud", type=int)
    parser.add_argument("--serial-stopbits", type=int, choices=(1, 2), default=1)
    parser.add_argument("--wsjtx-udp-port", type=int)
    parser.add_argument(
        "--enable-wsjtx-safe-commands",
        action="store_true",
        help="Opt-in local WSJT-X Replay/Halt Tx only; never enables transmission.",
    )
    parser.add_argument(
        "--wsjtx-id", help="Id exacto de instancia WSJT-X; sin lanzamiento automático."
    )
    args = parser.parse_args(argv)
    if not 0 <= args.port <= 65535:
        parser.error("--port debe estar entre 0 y 65535.")
    if args.tls_client_ca is not None and (args.tls_cert is None or args.tls_key is None):
        parser.error("--tls-client-ca requires both --tls-cert and --tls-key.")
    serial_options = (args.serial_model, args.serial_port, args.serial_baud)
    if args.enable_experimental_cat:
        if any(value is None for value in serial_options):
            parser.error("CAT requiere --serial-model, --serial-port y --serial-baud explícitos.")
    elif any(value is not None for value in serial_options) or args.serial_stopbits != 1:
        parser.error("Las opciones serie requieren --enable-experimental-cat.")
    if args.radio_settings_config and (
        not args.enable_experimental_cat
        or args.serial_model not in ("IC-7300", "FTX-1", *YaesuModel)
    ):
        parser.error("--radio-settings-config requires a documented IC-7300 or Yaesu CAT model.")
    if args.ptt_config and (not args.enable_experimental_cat or args.serial_model != "FTX-1"):
        parser.error("--ptt-config requires explicit experimental FTX-1 CAT.")
    if args.tx_audio_config and not args.ptt_config:
        parser.error("--tx-audio-config requires --ptt-config.")
    if (args.wsjtx_udp_port is None) != (args.wsjtx_id is None):
        parser.error("WSJT-X requiere --wsjtx-udp-port y --wsjtx-id juntos.")
    if args.enable_wsjtx_safe_commands and args.wsjtx_id is None:
        parser.error("--enable-wsjtx-safe-commands requires explicit WSJT-X port and Id.")
    if args.wsjtx_id is not None and not 1 <= len(args.wsjtx_id) <= 128:
        parser.error("--wsjtx-id debe tener entre 1 y 128 caracteres.")
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
        tls_context = server_tls_context(args.tls_cert, args.tls_key, client_ca=args.tls_client_ca)
        diagnostics = configure_diagnostics(args, "station-agent")
        validate_listen(args.host, tls_context)
        rotor_config = RotorConfig.load(args.rotor_config) if args.rotor_config else None
        audio = AudioCapture(AudioConfig.load(args.audio_config)) if args.audio_config else None
        settings_config = (
            RadioSettingsConfig.load(args.radio_settings_config)
            if args.radio_settings_config
            else None
        )
        ptt_config = PttConfig.load(args.ptt_config) if args.ptt_config else None
        tx_config = TxAudioConfig.load(args.tx_audio_config) if args.tx_audio_config else None
        cat = (
            SerialCat(
                CatConfig(
                    args.serial_model,
                    args.serial_port,
                    args.serial_baud,
                    args.serial_stopbits,
                ),
                settings=settings_config,
            )
            if args.enable_experimental_cat
            else None
        )
        wsjtx = (
            WsjtxReceiver(
                args.wsjtx_udp_port,
                args.wsjtx_id,
                commands_enabled=args.enable_wsjtx_safe_commands,
            )
            if args.wsjtx_id
            else None
        )
        rotor_backend = None
        if args.rotor_serial:
            if rotor_config is None:
                raise ValueError("--rotor-serial requires --rotor-config for limits and motion_enabled.")
            from bricoham_station_agent.station_devices import open_serial_rotor_backend

            protocol, _, rest = args.rotor_serial.partition(":")
            port, _, baud = rest.rpartition(":") if rest.count(":") else (rest, "", "4800")
            rotor_backend = open_serial_rotor_backend(protocol, port, int(baud or "4800"))
        rotor = RotorController(rotor_config, rotor_backend) if rotor_config else None
        ptt = None
        if ptt_config is not None:
            assert cat is not None
            ptt = PttController(
                cat, ptt_config, tx_audio=AudioTransmitter(tx_config) if tx_config else None
            )
        # No amplifier or tuner driver has a protocol source yet, so only supervision (STANDBY, emergency stop) is active.
        accessories = (
            StationAccessories(config=json.loads(args.accessories_config.read_text(encoding="utf-8")))
            if args.accessories_config
            else None
        )
        server = StationAgentHTTPServer(
            args.port,
            authenticator,
            enumerate_serial_ports,
            cat,
            wsjtx,
            host=args.host,
            rotor=rotor,
            audio=audio,
            tls_context=tls_context,
            ptt=ptt,
            accessories=accessories,
        )
    except ValueError as error:
        LOGGER.error("Configuración del agente no válida: %s", error)
        if diagnostics is not None:
            diagnostics.close()
        return 2
    except (OSError, sqlite3.Error) as error:
        LOGGER.error("No se pudo configurar el agente (%s)", type(error).__name__)
        if diagnostics is not None:
            diagnostics.close()
        return 2
    with diagnostics, server:
        host, port = server.server_address
        scheme = "https" if server.tls_context else "http"
        LOGGER.info("Agente escuchando en %s://%s:%s", scheme, host, port)
        if args.tls_client_ca is not None:
            LOGGER.info("mTLS required on all agent connections; bearer roles remain required.")
        LOGGER.info(
            "Inventario de solo lectura: GET %s://%s:%s%s", scheme, host, port, DEVICES_PATH
        )
        if cat is not None:
            LOGGER.warning(
                "CAT experimental activado: puerto explícito y consultas allowlist. "
                "El driver USB puede producir pulsos de control al abrir: validar físicamente."
            )
        if settings_config is not None:
            LOGGER.warning(
                "%s settings configured: power=%s tuner=%s frequency=%s mode=%s "
                "maximum=%s unit=%s; "
                "not measured RF power; PTT requires a separate --ptt-config",
                args.serial_model,
                settings_config.power_adjustment_enabled,
                settings_config.tuner_switching_enabled,
                settings_config.frequency_adjustment_enabled,
                settings_config.mode_adjustment_enabled,
                settings_config.power_level_max,
                settings_config.metadata(model=args.serial_model)["power_unit"],
            )
        if wsjtx is not None:
            LOGGER.info(
                "WSJT-X UDP en 127.0.0.1:%s; Replay/Halt Tx opt-in=%s; no habilita TX",
                wsjtx.port,
                wsjtx.commands_enabled,
            )
        if ptt is not None:
            LOGGER.warning(
                "Guarded PTT configured: enabled=%s, MAIN simplex SSB only; "
                "requires explicit RX confirmation, local RF protection and operator supervision",
                ptt.config.enabled,
            )
        previous = _install_shutdown_handlers(server)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            LOGGER.info("Agente detenido")
        finally:
            _restore_handlers(previous)
            # Always unkey and release the radio, whatever ended the loop.
            if ptt is not None:
                ptt.close()
    return 0


def _install_shutdown_handlers(server: StationAgentHTTPServer) -> dict[int, object]:
    def handler(signum: int, _frame: object = None) -> None:
        LOGGER.info("Señal %s recibida; apagado ordenado", signum)
        # shutdown() blocks until serve_forever() returns, so run it off the signal context.
        threading.Thread(target=server.shutdown, name="signal-shutdown", daemon=True).start()

    previous: dict[int, object] = {}
    names = ("SIGTERM", "SIGHUP")
    for name in names:
        number = getattr(signal, name, None)
        if number is None:
            continue
        try:
            previous[number] = signal.signal(number, handler)
        except (ValueError, OSError):
            continue
    return previous


def _restore_handlers(previous: dict[int, object]) -> None:
    for number, handler in previous.items():
        try:
            signal.signal(number, handler)  # type: ignore[arg-type]
        except (ValueError, OSError, TypeError):
            pass


if __name__ == "__main__":
    raise SystemExit(main())
