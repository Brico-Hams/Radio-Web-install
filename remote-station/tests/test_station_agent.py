import contextlib
import io
import json
import signal
import threading
import unittest
from http.client import HTTPConnection
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_station_agent.inventory import DeviceEnumerationError, DeviceInventory
from bricoham_station_agent.server import (
    StationAgentHTTPServer,
    _install_shutdown_handlers,
    _parse_args,
)

ADMIN_TOKEN = "a" * 32
OPERATOR_TOKEN = "b" * 32
LISTENER_TOKEN = "c" * 32
GUEST_TOKEN = "d" * 32


def fake_port(**updates: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "device": "COM7",
        "description": "USB Serial Adapter",
        "hwid": "USB VID:PID=1234:5678 SER=private-serial",
        "vid": 0x1234,
        "pid": 0x5678,
        "manufacturer": "Example",
        "product": "USB Serial Adapter",
        "interface": "Interface 0",
        "serial_number": "private-serial",
    }
    values.update(updates)
    return SimpleNamespace(**values)


class StationAgentTests(unittest.TestCase):
    def test_sigterm_handler_shuts_down_and_unkeys_ptt(self) -> None:
        ptt = MagicMock()
        server = StationAgentHTTPServer(
            0,
            TokenAuthenticator({Role.ADMIN: ADMIN_TOKEN}),
            lambda: [],
            ptt=ptt,
        )
        installed = {}
        with patch(
            "bricoham_station_agent.server.signal.signal",
            side_effect=lambda number, handler: installed.setdefault(number, handler),
        ):
            previous = _install_shutdown_handlers(server)
        self.assertIn(signal.SIGTERM, installed)
        serving = threading.Thread(target=server.serve_forever)
        serving.start()
        installed[signal.SIGTERM](signal.SIGTERM, None)
        serving.join(5)
        self.assertFalse(serving.is_alive())
        server.server_close()
        ptt.close.assert_called()
        self.assertEqual(set(previous), set(installed))

    def test_cli_default_override_and_help(self) -> None:
        self.assertEqual(_parse_args([]).port, 8788)
        self.assertEqual(_parse_args(["--port", "0"]).port, 0)

        help_output = io.StringIO()
        with contextlib.redirect_stdout(help_output), self.assertRaises(SystemExit) as exit_info:
            _parse_args(["--help"])
        self.assertEqual(exit_info.exception.code, 0)
        normalized_help = " ".join(help_output.getvalue().split())
        self.assertIn("127.0.0.1:<port>", normalized_help)
        self.assertIn("default loopback port 8788", normalized_help)
        self.assertIn("GET /api/v1/devices", normalized_help)

    def test_inventory_omits_unique_hardware_identifiers(self) -> None:
        inventory = DeviceInventory(lambda: [fake_port()]).snapshot()
        self.assertEqual(inventory["api_version"], "v1")
        self.assertEqual(inventory["schema_version"], "1.0")
        device = inventory["devices"][0]
        self.assertEqual(
            set(device),
            {
                "port",
                "description",
                "hwid",
                "vid",
                "pid",
                "manufacturer",
                "product",
                "interface",
                "classification",
            },
        )
        self.assertEqual(device["port"], "COM7")
        self.assertIsNone(device["hwid"])
        self.assertEqual(device["classification"], "unknown")
        self.assertNotIn("serial_number", device)
        self.assertNotIn("private-serial", json.dumps(inventory))

    def test_inventory_has_explicit_port_and_metadata_limits(self) -> None:
        with self.assertRaisesRegex(DeviceEnumerationError, "device_limit_exceeded"):
            DeviceInventory(lambda: [fake_port()] * 257).snapshot()

        device = DeviceInventory(
            lambda: [fake_port(description="D" * 300, vid=-1, pid=True)]
        ).snapshot()["devices"][0]
        self.assertEqual(len(device["description"]), 256)
        self.assertIsNone(device["vid"])
        self.assertIsNone(device["pid"])

    def test_invalid_or_failed_enumeration_returns_a_specific_error(self) -> None:
        with self.assertRaisesRegex(DeviceEnumerationError, "invalid_device_path"):
            DeviceInventory(lambda: [fake_port(device=" ")]).snapshot()

        def fail() -> list[SimpleNamespace]:
            raise OSError("hardware detail must not escape")

        with self.assertRaisesRegex(DeviceEnumerationError, "serial_port_enumeration_failed"):
            DeviceInventory(fail).snapshot()

    @classmethod
    def setUpClass(cls) -> None:
        cls.server = StationAgentHTTPServer(
            0,
            TokenAuthenticator(
                {
                    Role.ADMIN: ADMIN_TOKEN,
                    Role.OPERATOR: OPERATOR_TOKEN,
                    Role.LISTENER: LISTENER_TOKEN,
                    Role.GUEST: GUEST_TOKEN,
                }
            ),
            lambda: [fake_port()],
        )
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(
        self,
        path: str,
        token: str | None = None,
        method: str = "GET",
    ) -> tuple[int, dict[str, object], dict[str, str]]:
        connection = HTTPConnection("127.0.0.1", self.port, timeout=2)
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        result = (response.status, json.loads(response.read()), dict(response.getheaders()))
        connection.close()
        return result

    def test_health_is_public_and_inventory_requires_admin_or_operator(self) -> None:
        status, body, _ = self.request("/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")

        status, body, _ = self.request("/api/v1/devices")
        self.assertEqual(status, 401)
        self.assertEqual(body["error"]["code"], "unauthorized")
        for token in (LISTENER_TOKEN, GUEST_TOKEN):
            status, _, _ = self.request("/api/v1/devices", token)
            self.assertEqual(status, 403)
        for token in (ADMIN_TOKEN, OPERATOR_TOKEN):
            status, body, headers = self.request("/api/v1/devices", token)
            self.assertEqual(status, 200)
            self.assertEqual(body["devices"][0]["port"], "COM7")
            self.assertEqual(headers["Cache-Control"], "no-store")

    def test_agent_binds_loopback_and_rejects_mutation(self) -> None:
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        status, body, headers = self.request("/api/v1/devices", ADMIN_TOKEN, "POST")
        self.assertEqual(status, 405)
        self.assertEqual(body["error"]["code"], "method_not_allowed")
        self.assertEqual(headers["Allow"], "GET")


if __name__ == "__main__":
    unittest.main()
