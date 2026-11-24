import socket
import threading
import unittest
from http import HTTPStatus
from http.client import HTTPConnection

from bricoham_remote_station.secure_http import (
    MAX_CONNECTIONS_PER_IP,
    SecureHTTPServer,
    SecureRequestHandler,
)
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator


def serve(server):
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return thread


class OriginAllowlistTests(unittest.TestCase):
    def setUp(self):
        self.server = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            TokenAuthenticator({Role.ADMIN: "a" * 32}),
            DeterministicSimulator(),
        )
        self.addCleanup(self.server.server_close)
        self.port = self.server.server_address[1]
        self.addCleanup(self.server.shutdown)
        serve(self.server)

    def test_allowed_foreign_and_malformed_origins(self):
        allowed = self.server.origin_allowed
        self.assertTrue(allowed(f"http://127.0.0.1:{self.port}"))
        self.assertTrue(allowed(f"http://localhost:{self.port}"))
        self.assertFalse(allowed(f"http://evil.example:{self.port}"))
        self.assertFalse(allowed(f"https://127.0.0.1:{self.port}"))
        self.assertFalse(allowed("http://127.0.0.1:1"))
        self.assertFalse(allowed(f"http://127.0.0.1:{self.port}/path"))
        self.assertFalse(allowed("null"))
        self.assertFalse(allowed(None))

    def test_dns_rebinding_host_header_does_not_authorize_its_own_origin(self):
        evil = f"evil.example:{self.port}"
        for origin, expected in ((f"http://{evil}", 403), (f"http://127.0.0.1:{self.port}", None)):
            connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
            self.addCleanup(connection.close)
            connection.putrequest("GET", "/api/v1/audio/tx", skip_host=True)
            connection.putheader("Host", evil)
            connection.putheader("Origin", origin)
            connection.endheaders()
            status = connection.getresponse().status
            if expected is None:
                self.assertNotEqual(status, 403)
            else:
                self.assertEqual(status, expected)


class StopHandler(SecureRequestHandler):
    protocol_version = "HTTP/1.1"
    reserved_paths = ("/stop",)

    def _reply(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Length", "2")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        self._reply()

    def do_POST(self):
        self.request_json()
        self._reply()


class ConnectionPoolTests(unittest.TestCase):
    def setUp(self):
        self.server = SecureHTTPServer(("127.0.0.1", 0), StopHandler)
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.port = self.server.server_address[1]
        serve(self.server)

    def request(self, method, path):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            body = b"{}" if method == "POST" else None
            connection.request(
                method, path, body=body, headers={"Content-Type": "application/json"}
            )
            return connection.getresponse().status
        finally:
            connection.close()

    def test_stop_works_when_idle_sockets_exhaust_the_per_ip_pool(self):
        idle = []
        for _ in range(MAX_CONNECTIONS_PER_IP):
            sock = socket.create_connection(("127.0.0.1", self.port), timeout=5)
            idle.append(sock)
            self.addCleanup(sock.close)
        deadline = threading.Event()
        deadline.wait(0.3)
        self.assertEqual(self.request("POST", "/stop"), 200)
        # The server releases the reserved slot after the reply is sent; wait for it.
        released = threading.Event()
        for _ in range(500):
            if not self.server._reserved_ips:
                break
            released.wait(0.01)
        self.assertFalse(self.server._reserved_ips)
        self.assertEqual(self.request("GET", "/other"), 503)


class RejectingHandler(SecureRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_POST(self):
        self.close_connection = True
        self.send_response(HTTPStatus.UNAUTHORIZED)
        self.send_header("Content-Length", "2")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(b"no")


class EarlyRejectionTests(unittest.TestCase):
    def test_body_arriving_after_early_rejection_does_not_reset_the_connection(self):
        server = SecureHTTPServer(("127.0.0.1", 0), RejectingHandler)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        serve(server)
        sock = socket.create_connection(server.server_address, timeout=5)
        self.addCleanup(sock.close)
        sock.sendall(
            b"POST /x HTTP/1.1\r\nHost: t\r\nContent-Type: application/json\r\n"
            b"Content-Length: 64\r\n\r\n"
        )
        reply = b""
        while not reply.endswith(b"no"):
            chunk = sock.recv(4096)
            self.assertTrue(chunk)
            reply += chunk
        self.assertTrue(reply.startswith(b"HTTP/1.1 401"))
        # The body reaches the server only after it answered; closing over it must not RST.
        sock.sendall(b"x" * 64)
        self.assertEqual(sock.recv(4096), b"")


if __name__ == "__main__":
    unittest.main()
