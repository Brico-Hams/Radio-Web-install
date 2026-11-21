import contextlib
import io
import json
import socket
import threading
import time
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

from test_ftx1_power import FtxPowerPort
from test_radio_settings import SettingsPort
from test_serial_cat import ScriptedPort
from test_wsjtx import decode_packet, status_packet

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.radio_settings import RadioSettingsConfig
from bricoham_station_agent.server import StationAgentHTTPServer, _parse_args
from bricoham_station_agent.wsjtx import WsjtxReceiver


class LiveAgentApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        auth = TokenAuthenticator(self.tokens)
        self.serial = ScriptedPort(b"FA00014074000;")
        self.serial_patch = patch(
            "bricoham_station_agent.cat.serial.Serial", return_value=self.serial
        )
        self.serial_patch.start()
        self.cat = SerialCat(CatConfig("K4", "COM7", 38400))
        self.wsjtx = WsjtxReceiver(0, "WSJT-X")
        self.agent = StationAgentHTTPServer(0, auth, lambda: [], self.cat, self.wsjtx)
        self.coordinator = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            auth,
            DeterministicSimulator(),
            station_agent_port=self.agent.server_address[1],
        )
        self.threads = [
            threading.Thread(target=server.serve_forever)
            for server in (self.agent, self.coordinator)
        ]
        for thread in self.threads:
            thread.start()

    def tearDown(self) -> None:
        for server in (self.coordinator, self.agent):
            server.shutdown()
            server.server_close()
        for thread in self.threads:
            thread.join(timeout=2)
        self.serial_patch.stop()

    def request(
        self, path: str, role=Role.ADMIN, direct=False, *, method="GET", payload=None, headers=None
    ):
        server = self.agent if direct else self.coordinator
        connection = HTTPConnection(*server.server_address, timeout=5)
        try:
            connection.request(
                method,
                path,
                body=json.dumps(payload) if payload is not None else None,
                headers={
                    **({"Authorization": f"Bearer {self.tokens[role]}"} if role else {}),
                    **({"Content-Type": "application/json"} if payload is not None else {}),
                    **(headers or {}),
                },
            )
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def configure_settings(self, model="IC-7300", *, operating=False):
        self.cat.close()
        self.serial_patch.stop()
        self.serial = FtxPowerPort() if model == "FTX-1" else SettingsPort()
        self.serial_patch = patch(
            "bricoham_station_agent.cat.serial.Serial", return_value=self.serial
        )
        self.serial_patch.start()
        self.cat = SerialCat(
            CatConfig(model, "COM_TEST", 38400 if model == "FTX-1" else 19200),
            settings=RadioSettingsConfig(
                True,
                50 if model == "FTX-1" else 120,
                model == "IC-7300",
                frequency_adjustment_enabled=operating,
                mode_adjustment_enabled=operating,
            ),
        )
        self.agent.cat = self.cat

    def test_ftx1_power_proxy_preserves_watts_units_and_rejects_tuner_commands(self):
        self.configure_settings("FTX-1", operating=True)
        path = "/api/v1/radio-settings"
        status, metadata = self.request(path)
        self.assertEqual(status, 200)
        self.assertEqual(metadata["power_unit"], "watts_setpoint")
        self.assertTrue(metadata["frequency_adjustment_enabled"])
        self.assertIn({"code": "2", "label": "USB"}, metadata["mode_options"])
        self.assertEqual(self.serial.writes, [])
        status, result = self.request(
            path,
            role=Role.OPERATOR,
            method="POST",
            payload={
                "operation": "set_power",
                "request_id": "api-ftx-power-request-0001",
                "power_level": 40,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual((result["power_level"], result["power_head"]), (40, "SPA-1"))
        self.assertEqual(result["power_unit"], "watts_setpoint")
        self.assertIn(b"PC2040;", self.serial.writes)
        for operation, receiver, field, target in (
            ("set_frequency", "MAIN", "frequency_hz", 14_260_000),
            ("set_mode", "SUB", "mode_code", "H"),
        ):
            status, state = self.request(
                path,
                method="POST",
                payload={
                    "operation": operation,
                    "receiver": receiver,
                    field: target,
                    "request_id": f"api-ftx-{operation}-0001",
                },
            )
            self.assertEqual(status, 200)
            self.assertEqual(state["receivers"][receiver][field], target)
        self.assertIn(b"FA014260000;", self.serial.writes)
        self.assertIn(b"MD1H;", self.serial.writes)
        status, _ = self.request(
            path,
            method="POST",
            payload={
                "operation": "set_tuner",
                "request_id": "api-ftx-tuner-request-0001",
                "enabled": True,
            },
        )
        self.assertEqual(status, 400)
        self.assertFalse(
            any(frame.startswith(b"AC") and frame != b"AC;" for frame in self.serial.writes)
        )
        args = _parse_args(
            [
                "--enable-experimental-cat",
                "--serial-model",
                "FTX-1",
                "--serial-port",
                "COM_TEST",
                "--serial-baud",
                "38400",
                "--radio-settings-config",
                "ftx.json",
            ]
        )
        self.assertEqual(args.serial_model, "FTX-1")

    def test_radio_settings_proxy_preserves_limits_readback_and_conflict_errors(self):
        self.configure_settings()
        path = "/api/v1/radio-settings"
        self.assertEqual(self.request(path)[0], 200)
        self.assertEqual(self.serial.writes, [])
        status, result = self.request(path, method="POST", payload={"operation": "read"})
        self.assertEqual(status, 200)
        self.assertEqual(result["power_level"], 25)
        command = {
            "operation": "set_power",
            "request_id": "api-settings-request-0001",
            "power_level": 100,
        }
        status, result = self.request(path, role=Role.OPERATOR, method="POST", payload=command)
        self.assertEqual(status, 200)
        self.assertEqual(result["power_level"], 100)
        self.assertEqual(result["power_unit"], "cat_position_0_255")
        status, error = self.request(path, method="POST", payload=command)
        self.assertEqual(status, 409)
        self.assertEqual(error["error"]["code"], "cat_setting_request_repeated")
        command["power_level"] = 121
        self.assertEqual(self.request(path, method="POST", payload=command)[0], 400)
        self.assertEqual(self.serial.level, 100)

    def test_radio_settings_roles_and_origin_are_checked_before_serial_io(self):
        self.configure_settings()
        path = "/api/v1/radio-settings"
        for direct in (True, False):
            for role, expected in ((None, 401), (Role.LISTENER, 403), (Role.GUEST, 403)):
                for method in ("GET", "POST"):
                    self.assertEqual(
                        self.request(
                            path, role, direct, method=method, payload={"operation": "read"}
                        )[0],
                        expected,
                    )
        self.assertEqual(
            self.request(
                path,
                method="POST",
                payload={"operation": "read"},
                headers={"Origin": "https://evil.example"},
            )[0],
            403,
        )
        self.assertEqual(self.serial.writes, [])
        self.cat.settings = None
        status, result = self.request(path, method="POST", payload={"operation": "read"})
        self.assertEqual(status, 503)
        self.assertEqual(result["error"]["code"], "cat_settings_not_configured")

    def test_cat_metadata_never_opens_port_and_read_uses_selected_profile(self) -> None:
        status, payload = self.request("/api/v1/cat")
        self.assertEqual(status, 200)
        self.assertEqual(payload["model"], "K4")
        self.assertEqual(self.serial.writes, [])
        status, payload = self.request("/api/v1/cat?command=FA", role=Role.OPERATOR)
        self.assertEqual(status, 200)
        self.assertEqual(payload["frequency_hz"], 14_074_000)
        self.assertEqual(self.serial.writes, [b"FA;"])
        self.assertFalse(payload["data_is_simulated"])
        self.assertEqual(self.request("/api/v1/cat?command=TX")[0], 400)
        self.assertEqual(self.request("/api/v1/cat?command=FA&command=FB")[0], 400)
        self.assertEqual(self.serial.writes, [b"FA;"])

    def test_live_paths_enforce_roles_at_both_services_before_any_cat_write(self) -> None:
        for direct in (False, True):
            for path in ("/api/v1/cat?command=FA", "/api/v1/digital"):
                for role, expected in ((None, 401), (Role.LISTENER, 403), (Role.GUEST, 403)):
                    self.assertEqual(self.request(path, role, direct)[0], expected)
        self.assertEqual(self.serial.writes, [])

    def test_udp_decode_is_available_through_authenticated_coordinator(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
            for packet in (status_packet(), decode_packet()):
                sender.sendto(packet, ("127.0.0.1", self.wsjtx.port))
            deadline = time.monotonic() + 1
            while time.monotonic() < deadline and not self.wsjtx.snapshot()["decodes"]:
                time.sleep(0.01)
        status, payload = self.request("/api/v1/digital")
        self.assertEqual(status, 200)
        self.assertTrue(payload["connected"])
        self.assertEqual(payload["decodes"][0]["message"], "CQ N0CALL AA00")
        self.assertTrue(payload["decodes"][0]["off_air"])
        self.assertFalse(payload["commands_enabled"])
        self.assertFalse(payload["authenticated"])
        self.assertFalse(payload["suitable_for_control"])
        self.assertEqual(payload["trust"], "untrusted_local_udp")

    def test_disabled_integrations_and_transport_failures_keep_explicit_errors(self) -> None:
        self.agent.cat = None
        try:
            status, payload = self.request("/api/v1/cat")
            self.assertEqual(status, 503)
            self.assertEqual(payload["error"]["code"], "cat_not_configured")
        finally:
            self.agent.cat = self.cat
        self.serial.response = b"FA00;"
        status, payload = self.request("/api/v1/cat?command=FA")
        self.assertEqual(status, 503)
        self.assertEqual(payload["error"]["code"], "cat_invalid_response")

    def test_cli_requires_explicit_opt_in_and_complete_local_configuration(self) -> None:
        for args in (
            ["--serial-model", "K4"],
            ["--enable-experimental-cat"],
            ["--wsjtx-id", "WSJT-X"],
            ["--wsjtx-id", "", "--wsjtx-udp-port", "2237"],
            ["--radio-settings-config", "unsafe.json"],
        ):
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                _parse_args(args)
        args = _parse_args(
            [
                "--enable-experimental-cat",
                "--serial-model",
                "K4",
                "--serial-port",
                "COM7",
                "--serial-baud",
                "38400",
                "--wsjtx-id",
                "WSJT-X",
                "--wsjtx-udp-port",
                "2237",
            ]
        )
        self.assertTrue(args.enable_experimental_cat)
        self.assertEqual(args.wsjtx_udp_port, 2237)
