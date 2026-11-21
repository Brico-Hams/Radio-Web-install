import json
import logging
import socket
import ssl
import sys
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOGGER = logging.getLogger("bricoham.http")


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
        self._connections = threading.BoundedSemaphore(32)
        super().__init__(address, handler)

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
        if not self._connections.acquire(blocking=False):
            self.shutdown_request(request)
            LOGGER.warning("HTTP connection limit reached")
            return
        try:
            super().process_request(request, client_address)
        except RuntimeError:
            self._connections.release()
            raise

    def process_request_thread(
        self,
        request: socket.socket,
        client_address: tuple[str, int],
    ) -> None:
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._connections.release()

    def handle_error(self, request: socket.socket, client_address: tuple[str, int]) -> None:
        error = sys.exception()
        if isinstance(error, ssl.SSLError | TimeoutError | ConnectionError):
            LOGGER.warning("HTTP/TLS connection rejected (%s)", type(error).__name__)
        else:
            super().handle_error(request, client_address)


class SecureRequestHandler(BaseHTTPRequestHandler):
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

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        path = self.path.partition("?")[0].partition("#")[0][:256]
        LOGGER.info("HTTP method=%s path=%s status=%s", ascii(self.command), ascii(path), code)

    def log_message(self, format: str, *args: object) -> None:
        LOGGER.warning("HTTP request diagnostic; details omitted to protect request secrets")
