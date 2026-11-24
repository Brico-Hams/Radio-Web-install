import json
import logging
import socket
import ssl
import sys
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOGGER = logging.getLogger("bricoham.http")
NORMAL_CONNECTIONS = 28
RESERVED_CONNECTIONS = 4
MAX_CONNECTIONS_PER_IP = 8
RESERVED_TIMEOUT_SECONDS = 2
LINGER_MAX_BYTES = 65536
LINGER_IDLE_SECONDS = 0.5
LINGER_TOTAL_SECONDS = 2


class RequestJsonError(Exception):
    def __init__(self, status: HTTPStatus, code: str) -> None:
        super().__init__(code)
        self.status = status


class SecureHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(
        self,
        address: tuple[str, int],
        handler: type[BaseHTTPRequestHandler],
        *,
        tls_context: ssl.SSLContext | None = None,
    ) -> None:
        self.tls_context = tls_context
        self._connections = threading.BoundedSemaphore(NORMAL_CONNECTIONS)
        self._reserve = threading.BoundedSemaphore(RESERVED_CONNECTIONS)
        self._slot_lock = threading.Lock()
        self._per_ip: dict[str, int] = {}
        self._reserved_ips: set[str] = set()
        self._slots: dict[socket.socket, tuple[str, bool]] = {}
        super().__init__(address, handler)

    def is_reserved(self, request: socket.socket) -> bool:
        with self._slot_lock:
            slot = self._slots.get(request)
        return slot is not None and slot[1]

    def _admit(self, request: socket.socket, ip: str) -> bool:
        # Normal slots are capped per IP; the small reserve is only for
        # short-lived priority requests (authenticated PTT stop).
        with self._slot_lock:
            if self._per_ip.get(ip, 0) < MAX_CONNECTIONS_PER_IP and self._connections.acquire(
                blocking=False
            ):
                reserved = False
            elif ip not in self._reserved_ips and self._reserve.acquire(blocking=False):
                reserved = True
                self._reserved_ips.add(ip)
                request.settimeout(RESERVED_TIMEOUT_SECONDS)
            else:
                return False
            if not reserved:
                self._per_ip[ip] = self._per_ip.get(ip, 0) + 1
            self._slots[request] = (ip, reserved)
        return True

    def _release(self, request: socket.socket) -> None:
        with self._slot_lock:
            slot = self._slots.pop(request, None)
            if slot is None:
                return
            ip, reserved = slot
            if reserved:
                self._reserved_ips.discard(ip)
                self._reserve.release()
                return
            remaining = self._per_ip.get(ip, 1) - 1
            if remaining > 0:
                self._per_ip[ip] = remaining
            else:
                self._per_ip.pop(ip, None)
            self._connections.release()

    def get_request(self) -> tuple[socket.socket, tuple[str, int]]:
        connection, address = super().get_request()
        connection.settimeout(5)
        if self.tls_context is not None:
            try:
                connection = self.tls_context.wrap_socket(
                    connection,
                    server_side=True,
                    do_handshake_on_connect=False,
                )
            except (OSError, ssl.SSLError):
                connection.close()
                raise
        return connection, address

    def process_request(self, request: socket.socket, client_address: tuple[str, int]) -> None:
        if not self._admit(request, str(client_address[0])):
            self.shutdown_request(request)
            LOGGER.warning("HTTP connection limit reached")
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self._release(request)
            raise

    def process_request_thread(
        self,
        request: socket.socket,
        client_address: tuple[str, int],
    ) -> None:
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._release(request)

    def handle_error(self, request: socket.socket, client_address: tuple[str, int]) -> None:
        error = sys.exception()
        if isinstance(error, ssl.SSLError | TimeoutError | ConnectionError):
            LOGGER.warning("HTTP/TLS connection rejected (%s)", type(error).__name__)
        else:
            super().handle_error(request, client_address)


class SecureRequestHandler(BaseHTTPRequestHandler):
    reserved_paths: tuple[str, ...] = ()

    def parse_request(self) -> bool:
        if not super().parse_request():
            return False
        server = self.server
        if (
            isinstance(server, SecureHTTPServer)
            and server.is_reserved(self.request)
            and (self.command != "POST" or self.path.partition("?")[0] not in self.reserved_paths)
        ):
            self.close_connection = True
            self.send_error(HTTPStatus.SERVICE_UNAVAILABLE)
            return False
        return True

    def request_json(self) -> object:
        self.close_connection = True
        if self.headers.get_content_type() != "application/json":
            raise RequestJsonError(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "json_required")
        lengths = self.headers.get_all("Content-Length", [])
        if (
            self.headers.get("Transfer-Encoding") is not None
            or len(lengths) != 1
            or not lengths[0].isascii()
            or not lengths[0].isdigit()
            or len(lengths[0]) > 6
        ):
            raise RequestJsonError(HTTPStatus.BAD_REQUEST, "invalid_body_length")
        length = int(lengths[0])
        if length > 4096:
            raise RequestJsonError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "body_too_large")
        try:
            body = self.rfile.read(length)
        except OSError as error:
            raise RequestJsonError(HTTPStatus.REQUEST_TIMEOUT, "body_read_timeout") from error
        try:
            if len(body) != length or "?" in self.path:
                raise ValueError("Incomplete body or unexpected query")
            return json.loads(body)
        except (ValueError, UnicodeDecodeError, RecursionError) as error:
            raise RequestJsonError(HTTPStatus.BAD_REQUEST, "invalid_json") from error

    def setup(self) -> None:
        if isinstance(self.request, ssl.SSLSocket):
            self.request.do_handshake()
        super().setup()

    def finish(self) -> None:
        super().finish()
        if self.close_connection and self._request_declares_body():
            self._drain_unread_body()

    def _request_declares_body(self) -> bool:
        headers = getattr(self, "headers", None)
        if headers is None:
            return False
        length = headers.get("Content-Length", "")
        return headers.get("Transfer-Encoding") is not None or (length.isdigit() and int(length) > 0)

    def _drain_unread_body(self) -> None:
        # Early rejections (401/403/400) answer before the body is read. Closing a socket
        # with unread inbound bytes makes Windows (and Linux) send a RST that can destroy the
        # response the client has not read yet (WinError 10053/10054). The response is already
        # flushed here, so drain a bounded amount and let the client close first.
        sock = self.request
        deadline = time.monotonic() + LINGER_TOTAL_SECONDS
        remaining = LINGER_MAX_BYTES
        try:
            if not isinstance(sock, ssl.SSLSocket):
                sock.shutdown(socket.SHUT_WR)
            while remaining > 0:
                left = deadline - time.monotonic()
                if left <= 0:
                    break
                sock.settimeout(min(left, LINGER_IDLE_SECONDS))
                chunk = sock.recv(min(4096, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
        except (OSError, ValueError):
            LOGGER.debug("Unread request body drain ended early")

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        path = self.path.partition("?")[0].partition("#")[0][:256]
        LOGGER.info("HTTP method=%s path=%s status=%s", ascii(self.command), ascii(path), code)

    def log_message(self, format: str, *args: object) -> None:
        LOGGER.warning("HTTP request diagnostic; details omitted to protect request secrets")
