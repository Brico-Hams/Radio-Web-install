import argparse
import json
import logging
import os
import re
import sqlite3
import ssl
import sys
import threading
import time
from collections import deque
from contextlib import closing
from http.client import HTTPException, HTTPSConnection
from pathlib import Path
from urllib.parse import urlsplit

from bricoham_remote_station import __version__

REPORT_PATH = "/api/v1/diagnostic-reports"
COMPONENTS = frozenset(
    {
        "station-host",
        "station-agent",
        "workspace-web",
        "workspace-host",
        "station-web",
        "station-android",
        "station-ios",
        "radicodex",
    }
)
PLATFORMS = frozenset({"windows", "linux", "macos", "web", "android", "ios", "unknown"})
SOURCES = frozenset(
    {
        "server",
        "http",
        "cat",
        "audio",
        "ptt",
        "rotor",
        "settings",
        "digital",
        "api",
        "ui",
        "usb",
        "native",
        "unknown",
    }
)
CODES = frozenset(
    {
        "started",
        "runtime_log",
        "uncaught_error",
        "operation_failed",
        "connection_failed",
        "upload_failed",
        "usb_failed",
    }
)
ERROR_TYPES = frozenset(
    {"none", "exception", "timeout", "connection", "tls", "permission", "input", "protocol", "io"}
)
SEVERITIES = frozenset({"info", "warning", "error"})
MAX_EVENTS = 16
MAX_REPORT_BYTES = 4096
RETENTION_SECONDS = 7 * 86400
MAX_REPORTS = 500
_SOURCES_BY_MODULE = {
    "server": "server",
    "secure_http": "http",
    "cat": "cat",
    "cat_diagnostics": "cat",
    "audio_rx": "audio",
    "audio_tx": "audio",
    "ptt": "ptt",
    "rotor": "rotor",
    "radio_settings": "settings",
    "wsjtx": "digital",
}


def validate_report(value: object) -> dict:
    if not isinstance(value, dict) or set(value) != {
        "schema_version",
        "component",
        "version",
        "platform",
        "events",
    }:
        raise ValueError("diagnostic_invalid_report")
    if type(value["schema_version"]) is not int or value["schema_version"] != 1:
        raise ValueError("diagnostic_invalid_version")
    version = value["version"]
    if not isinstance(version, str) or not re.fullmatch(r"\d{1,4}\.\d{1,4}\.\d{1,4}", version):
        raise ValueError("diagnostic_invalid_product_version")
    for field, allowed in (("component", COMPONENTS), ("platform", PLATFORMS)):
        if not isinstance(value[field], str) or value[field] not in allowed:
            raise ValueError("diagnostic_invalid_metadata")
    events = value["events"]
    if not isinstance(events, list) or not 1 <= len(events) <= MAX_EVENTS:
        raise ValueError("diagnostic_invalid_events")
    for event in events:
        if not isinstance(event, dict) or set(event) != {
            "code",
            "source",
            "severity",
            "error_type",
            "line",
        }:
            raise ValueError("diagnostic_invalid_event")
        for field, allowed in (
            ("code", CODES),
            ("source", SOURCES),
            ("severity", SEVERITIES),
            ("error_type", ERROR_TYPES),
        ):
            if not isinstance(event[field], str) or event[field] not in allowed:
                raise ValueError("diagnostic_invalid_event")
        if type(event["line"]) is not int or not 0 <= event["line"] <= 100000:
            raise ValueError("diagnostic_invalid_line")
    encoded = json.dumps(value, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > MAX_REPORT_BYTES:
        raise ValueError("diagnostic_report_too_large")
    return json.loads(encoded)


class DiagnosticStore:
    def __init__(self, database: Path) -> None:
        database.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.database = database
        self._lock = threading.Lock()
        with closing(self._connect()) as connection, connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS diagnostic_reports "
                "(id INTEGER PRIMARY KEY, received REAL NOT NULL, report TEXT NOT NULL)"
            )
            self._purge(connection)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database)
        connection.execute("PRAGMA max_page_count=2048")
        return connection

    @staticmethod
    def _purge(connection: sqlite3.Connection) -> None:
        connection.execute(
            "DELETE FROM diagnostic_reports WHERE received < ?", (time.time() - RETENTION_SECONDS,)
        )
        connection.execute(
            "DELETE FROM diagnostic_reports WHERE id NOT IN "
            "(SELECT id FROM diagnostic_reports ORDER BY id DESC LIMIT ?)",
            (MAX_REPORTS,),
        )

    def add(self, report: object) -> None:
        serialized = json.dumps(validate_report(report), separators=(",", ":"))
        with self._lock, closing(self._connect()) as connection, connection:
            connection.execute(
                "INSERT INTO diagnostic_reports(received,report) VALUES (?,?)",
                (time.time(), serialized),
            )
            self._purge(connection)

    def read(self) -> list[dict]:
        with self._lock, closing(self._connect()) as connection, connection:
            self._purge(connection)
            return [
                {"received": received, "report": self._stored_report(report)}
                for received, report in connection.execute(
                    "SELECT received,report FROM diagnostic_reports ORDER BY id DESC LIMIT 50"
                )
            ]

    @staticmethod
    def _stored_report(serialized: str) -> dict:
        try:
            return validate_report(json.loads(serialized))
        except (ValueError, TypeError) as error:
            raise sqlite3.DatabaseError("Invalid stored diagnostic report") from error

    def clear(self) -> None:
        with self._lock, closing(self._connect()) as connection, connection:
            connection.execute("DELETE FROM diagnostic_reports")


def _error_type(error: BaseException | None) -> str:
    if error is None:
        return "none"
    if isinstance(error, ssl.SSLError):
        return "tls"
    if isinstance(error, TimeoutError):
        return "timeout"
    if isinstance(error, ConnectionError):
        return "connection"
    if isinstance(error, PermissionError):
        return "permission"
    if isinstance(error, ValueError):
        return "input"
    if isinstance(error, OSError):
        return "io"
    return "exception"


class DiagnosticRuntime(logging.Handler):
    def __init__(
        self,
        component: str,
        directory: Path,
        *,
        url: str | None = None,
        token: str | None = None,
        ca: Path | None = None,
        opt_in: bool = False,
    ) -> None:
        super().__init__(logging.WARNING)
        if component not in COMPONENTS:
            raise ValueError("diagnostic_invalid_component")
        self.component = component
        self.platform = {"win32": "windows", "linux": "linux", "darwin": "macos"}.get(
            sys.platform, "unknown"
        )
        self.target = None
        if url is not None:
            parsed = urlsplit(url)
            if (
                url != url.strip()
                or len(url) > 2048
                or parsed.scheme != "https"
                or not parsed.hostname
                or parsed.username
                or parsed.password
                or parsed.path not in ("", "/")
                or parsed.query
                or parsed.fragment
                or "?" in url
                or "#" in url
            ):
                raise ValueError("diagnostic_https_base_url_required")
            if parsed.port is not None and not 1 <= parsed.port <= 65535:
                raise ValueError("diagnostic_invalid_port")
            self.target = parsed
        if ca is not None and self.target is None:
            raise ValueError("diagnostic_ca_requires_url")
        if opt_in and (
            self.target is None
            or token is None
            or len(token) < 32
            or any(not 33 <= ord(character) <= 126 for character in token)
        ):
            raise ValueError("diagnostic_opt_in_requires_https_and_secret")
        self.opt_in = opt_in
        self.token = token if opt_in else None
        self.context = (
            ssl.create_default_context(cafile=str(ca) if ca else None) if opt_in else None
        )
        self.store = DiagnosticStore(directory / f"{component}.sqlite3")
        self._pending: deque[tuple[int, dict]] = deque(maxlen=128)
        self._local_events: deque[dict] = deque(maxlen=128)
        self._pending_lock = threading.Lock()
        self._wake = threading.Event()
        self._overflow = False
        self._storage_retry = 0.0
        self._sequence = 0
        self._stop = threading.Event()
        self._thread = None
        logging.getLogger().addHandler(self)
        self.record("started", "server", "info")
        self._thread = threading.Thread(target=self._run, name="diagnostics", daemon=True)
        self._thread.start()

    def _report(self, events: list[dict]) -> dict:
        return {
            "schema_version": 1,
            "component": self.component,
            "version": __version__,
            "platform": self.platform,
            "events": events,
        }

    def record(
        self,
        code: str,
        source: str,
        severity: str,
        *,
        line: int = 0,
        error_type: str = "none",
    ) -> None:
        event = {
            "code": code,
            "source": source,
            "severity": severity,
            "line": line,
            "error_type": error_type,
        }
        validate_report(self._report([event]))
        with self._pending_lock:
            self._overflow |= len(self._local_events) == self._local_events.maxlen
            self._local_events.append(event)
            if self.opt_in:
                self._overflow |= len(self._pending) == self._pending.maxlen
                self._sequence += 1
                self._pending.append((self._sequence, event))
        self._wake.set()

    def flush_local(self) -> None:
        if time.monotonic() < self._storage_retry:
            return
        with self._pending_lock:
            batch = [
                self._local_events.popleft()
                for _ in range(min(MAX_EVENTS, len(self._local_events)))
            ]
            overflow, self._overflow = self._overflow, False
        if overflow:
            sys.stderr.write("Diagnostic buffer full; oldest technical events discarded.\n")
        if not batch:
            return
        try:
            self.store.add(self._report(batch))
        except (OSError, sqlite3.Error):
            sys.stderr.write(
                "Diagnostic local storage failed; bounded buffer retained for retry.\n"
            )
            self._storage_retry = time.monotonic() + 10
            with self._pending_lock:
                self._local_events = deque([*batch, *self._local_events], maxlen=128)

    def emit(self, record: logging.LogRecord) -> None:
        # Never format/copy messages, arguments, traceback values or paths.
        self.record(
            "runtime_log",
            _SOURCES_BY_MODULE.get(record.module, "unknown"),
            "error" if record.levelno >= logging.ERROR else "warning",
            line=record.lineno
            if type(record.lineno) is int and 0 <= record.lineno <= 100000
            else 0,
            error_type=_error_type(record.exc_info[1] if record.exc_info else None),
        )

    def flush_remote(self) -> bool:
        if not self.opt_in or self.target is None:
            return False
        with self._pending_lock:
            batch = list(self._pending)[:MAX_EVENTS]
        if not batch:
            return True
        connection = HTTPSConnection(
            self.target.hostname, self.target.port or 443, context=self.context, timeout=5
        )
        try:
            connection.request(
                "POST",
                REPORT_PATH,
                json.dumps(self._report([event for _, event in batch])),
                {"Content-Type": "application/json", "Authorization": f"Bearer {self.token}"},
            )
            response = connection.getresponse()
            body = response.read(257)
            acknowledgement = json.loads(body) if len(body) <= 256 else None
            if (
                response.status != 202
                or not isinstance(acknowledgement, dict)
                or set(acknowledgement) != {"accepted"}
                or acknowledgement["accepted"] is not True
            ):
                raise ValueError("diagnostic_upload_not_acknowledged")
        except (OSError, ValueError, HTTPException) as error:
            sys.stderr.write(
                f"Diagnostic HTTPS upload failed ({_error_type(error)}); retained for retry.\n"
            )
            return False
        finally:
            connection.close()
        watermark = batch[-1][0]
        with self._pending_lock:
            while self._pending and self._pending[0][0] <= watermark:
                self._pending.popleft()
        return True

    def _run(self) -> None:
        delay = 60
        next_upload = time.monotonic() + delay
        while not self._stop.is_set():
            self._wake.wait(1)
            self._wake.clear()
            for _ in range(128 // MAX_EVENTS):
                with self._pending_lock:
                    if not self._local_events:
                        break
                self.flush_local()
                if time.monotonic() < self._storage_retry:
                    break
            if self.opt_in and time.monotonic() >= next_upload:
                delay = 60 if self.flush_remote() else min(delay * 2, 600)
                next_upload = time.monotonic() + delay

    def close(self) -> None:
        logging.getLogger().removeHandler(self)
        self.opt_in = False
        self._stop.set()
        self._wake.set()
        if self._thread is not None and self._thread is not threading.current_thread():
            self._thread.join(timeout=6)
        for _ in range(128 // MAX_EVENTS):
            with self._pending_lock:
                if not self._local_events:
                    break
            self.flush_local()
            if time.monotonic() < self._storage_retry:
                break
        self.token = None
        super().close()

    def __enter__(self) -> "DiagnosticRuntime":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


def add_diagnostic_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--diagnostic-directory", type=Path, default=Path.home() / ".bricohams" / "diagnostics"
    )
    parser.add_argument("--diagnostics-opt-in", action="store_true")
    parser.add_argument(
        "--diagnostics-url", help="HTTPS collector base URL; never include a token."
    )
    parser.add_argument("--diagnostics-ca", type=Path)


def configure_diagnostics(args: argparse.Namespace, component: str) -> DiagnosticRuntime:
    token = os.environ.get("BRICOHAM_DIAGNOSTICS_TOKEN")
    if (
        args.diagnostics_opt_in
        and token
        and any(
            token == os.environ.get(name)
            for name in (
                "BRICOHAM_ADMIN_TOKEN",
                "BRICOHAM_OPERATOR_TOKEN",
                "BRICOHAM_LISTENER_TOKEN",
                "BRICOHAM_GUEST_TOKEN",
                "BRICOHAM_STATION_AGENT_TOKEN",
            )
        )
    ):
        raise ValueError("diagnostic_secret_must_not_reuse_station_credentials")
    return DiagnosticRuntime(
        component,
        args.diagnostic_directory,
        url=args.diagnostics_url,
        ca=args.diagnostics_ca,
        opt_in=args.diagnostics_opt_in,
        token=token,
    )
