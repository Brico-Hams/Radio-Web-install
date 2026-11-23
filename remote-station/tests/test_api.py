import json
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path
from types import SimpleNamespace

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.server import StationAgentHTTPServer

ADMIN_TOKEN = "a" * 32
OPERATOR_TOKEN = "b" * 32
LISTENER_TOKEN = "c" * 32
GUEST_TOKEN = "d" * 32


def fake_serial_port() -> SimpleNamespace:
    return SimpleNamespace(
        device="COM7",
        description="USB serial adapter",
        hwid="USB VID:PID=1234:5678 SER=private-serial",
        vid=0x1234,
        pid=0x5678,
        manufacturer="Example",
        product="USB serial adapter",
        interface="Interface 0",
        serial_number="private-serial",
    )


class CoordinatorAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.web_console_temp = tempfile.TemporaryDirectory()
        cls.web_console_directory = Path(cls.web_console_temp.name)
        (cls.web_console_directory / "index.html").write_text(
            "<html>console test</html>",
            encoding="utf-8",
        )
        assets = cls.web_console_directory / "assets"
        assets.mkdir()
        (assets / "app.js").write_text("console.log('test')", encoding="utf-8")
        cls.authenticator = TokenAuthenticator(
            {
                Role.ADMIN: ADMIN_TOKEN,
                Role.OPERATOR: OPERATOR_TOKEN,
                Role.LISTENER: LISTENER_TOKEN,
                Role.GUEST: GUEST_TOKEN,
            }
        )
        cls.agent_server = StationAgentHTTPServer(
            0,
            cls.authenticator,
            lambda: [fake_serial_port()],
        )
        cls.agent_thread = threading.Thread(target=cls.agent_server.serve_forever, daemon=True)
        cls.agent_thread.start()
        cls.server = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            cls.authenticator,
            DeterministicSimulator(),
            web_console_directory=cls.web_console_directory,
            station_agent_port=cls.agent_server.server_address[1],
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.agent_server.shutdown()
        cls.agent_server.server_close()
        cls.agent_thread.join(timeout=2)
        cls.web_console_temp.cleanup()

    def raw_request(
        self,
        path: str,
        token: str | None = None,
        method: str = "GET",
    ) -> tuple[int, bytes, dict[str, str]]:
        connection = HTTPConnection("127.0.0.1", self.port, timeout=2)
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        result = (response.status, response.read(), dict(response.getheaders()))
        connection.close()
        return result

    def request(
        self,
        path: str,
        token: str | None = None,
        method: str = "GET",
    ) -> tuple[int, dict[str, object], dict[str, str]]:
        status, body, headers = self.raw_request(path, token, method)
        return status, json.loads(body), headers

    def test_health_is_public_and_does_not_expose_station_data(self) -> None:
        status, body, _ = self.request("/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertNotIn("frequency_hz", body)

    def test_station_status_requires_a_valid_token_and_reports_demo_data(self) -> None:
        status, body, _ = self.request("/api/v1/status")
        self.assertEqual(status, 401)
        self.assertEqual(body["error"]["code"], "unauthorized")

        status, body, headers = self.request("/api/v1/status", LISTENER_TOKEN)
        self.assertEqual(status, 200)
        self.assertTrue(body["data_is_simulated"])
        self.assertFalse(body["hardware_connected"])
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")

    def test_roles_limit_station_data_but_allow_capability_discovery(self) -> None:
        status, _, _ = self.request("/api/v1/status", GUEST_TOKEN)
        self.assertEqual(status, 403)

        status, body, _ = self.request("/api/v1/capabilities", GUEST_TOKEN)
        self.assertEqual(status, 200)
        self.assertFalse(body["hardware_validation_complete"])

        status, body, _ = self.request("/api/v1/radios", GUEST_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(len(body["candidates"]), 68)
        self.assertFalse(body["hardware_validation_complete"])

        status, body, _ = self.request("/api/v1/feature-parity", GUEST_TOKEN)
        self.assertEqual(status, 200)
        self.assertIn("yaesu-ftx-1", [radio["id"] for radio in body["radios"]])
        status, _, _ = self.request("/api/v1/feature-parity")
        self.assertEqual(status, 401)

        status, body, _ = self.request("/api/v1/diagnostics", LISTENER_TOKEN)
        self.assertEqual(status, 403)
        status, body, _ = self.request("/api/v1/diagnostics", OPERATOR_TOKEN)
        self.assertEqual(status, 200)
        self.assertFalse(body["tx_enabled"])

    def test_device_inventory_is_proxied_only_for_admin_and_operator(self) -> None:
        for token in (LISTENER_TOKEN, GUEST_TOKEN):
            status, _, _ = self.request("/api/v1/devices", token)
            self.assertEqual(status, 403)

        status, body, _ = self.request("/api/v1/devices", ADMIN_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(body["devices"][0]["port"], "COM7")
        self.assertNotIn("private-serial", json.dumps(body))

        status, body, _ = self.request("/api/v1/devices", OPERATOR_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(body["schema_version"], "1.0")

    def test_transmit_route_is_absent_and_mutating_methods_are_rejected(self) -> None:
        status, body, _ = self.request("/api/v1/tx", ADMIN_TOKEN)
        self.assertEqual(status, 404)
        self.assertEqual(body["error"]["code"], "not_found")
        status, _, headers = self.request("/api/v1/status", ADMIN_TOKEN, "POST")
        self.assertEqual(status, 405)
        self.assertEqual(headers["Allow"], "GET")

    def test_protocol_catalog_is_authenticated_read_only_and_not_hardware_support(self) -> None:
        status, _, _ = self.request("/api/v1/protocols")
        self.assertEqual(status, 401)
        status, body, headers = self.request("/api/v1/protocols", GUEST_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(body["api_version"], "v1")
        self.assertFalse(body["transport_enabled"])
        self.assertFalse(body["hardware_validation_complete"])
        self.assertEqual(len(body["candidates"]), 68)
        k3s = next(candidate for candidate in body["candidates"] if candidate["model"] == "K3S")
        self.assertEqual(k3s["hardware_status"], "unsupported")
        self.assertTrue(any(query["command"] == "OM" for query in k3s["queries"]))
        self.assertEqual(headers["Cache-Control"], "no-store")
        status, _, _ = self.request("/api/v1/protocols", ADMIN_TOKEN, "POST")
        self.assertEqual(status, 405)

    def test_unknown_bearer_is_rejected(self) -> None:
        status, _, _ = self.request("/api/v1/status", "x" * 32)
        self.assertEqual(status, 401)

    def test_web_console_serves_assets_and_spa_routes_without_authentication(self) -> None:
        status, body, headers = self.raw_request("/")
        self.assertEqual(status, 200)
        self.assertIn(b"console test", body)
        self.assertEqual(headers["Content-Type"], "text/html")
        self.assertIn("default-src 'self'", headers["Content-Security-Policy"])
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["X-Frame-Options"], "DENY")

        status, body, headers = self.raw_request("/assets/app.js")
        self.assertEqual(status, 200)
        self.assertIn(b"console.log", body)
        self.assertIn("javascript", headers["Content-Type"])

        status, body, _ = self.raw_request("/radio")
        self.assertEqual(status, 200)
        self.assertIn(b"console test", body)

    def test_web_console_blocks_traversal_and_missing_assets(self) -> None:
        status, body, _ = self.raw_request("/%2e%2e/README.md")
        self.assertEqual(status, 404)
        self.assertEqual(json.loads(body)["error"]["code"], "not_found")

        status, body, _ = self.raw_request("/assets/missing.js")
        self.assertEqual(status, 404)
        self.assertEqual(json.loads(body)["error"]["code"], "not_found")


if __name__ == "__main__":
    unittest.main()
