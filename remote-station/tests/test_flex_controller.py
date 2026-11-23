import json
import re
import tempfile
import unittest
from collections import deque
from pathlib import Path

from bricoham_station_agent.flex import FlexConfig, FlexController, FlexError

METER_LIST = "meter 1.src=TX-#1.num=1#1.nam=FWDPWR#1.low=0.0#1.hi=53.0#1.unit=dBm#1.fps=40"
REQUEST_A = "a1b2c3d4e5f6a7b8"
REQUEST_B = "b1b2c3d4e5f6a7b8"


class Clock:
    t = 100.0

    def __call__(self) -> float:
        return self.t


class FakeTransport:
    def __init__(self, clock, replies=None) -> None:
        self.clock = clock
        self.sent: list[str] = []
        self.lines: deque[bytes] = deque([b"V3.4.1.2", b"H0000ABCD"])
        self.replies = replies or {}
        self.closed = False

    def send(self, data: bytes) -> None:
        sequence, command = re.match(r"C(\d+)\|(.*)\n", data.decode()).groups()
        self.sent.append(command)
        code, message = self.replies.get(command, ("0", ""))
        self.lines.append(f"R{sequence}|{code}|{message}".encode())

    def recv_line(self, timeout: float):
        if self.lines:
            return self.lines.popleft()
        self.clock.t += timeout
        return None

    def close(self) -> None:
        self.closed = True


def make(allow_tx=True, replies=None, **config):
    clock = Clock()
    transport = FakeTransport(clock, {"meter list": ("0", METER_LIST), **(replies or {})})
    settings = {"host": "192.168.1.50", "allow_tx": allow_tx, "tune_limit": 20, "tx_cap_s": 30, **config}
    controller = FlexController(FlexConfig(**settings), lambda host, port: transport, clock)
    return controller, transport, clock


class FlexControllerTests(unittest.TestCase):
    def test_connect_sets_interlock_to_cap_and_subscribes(self) -> None:
        controller, transport, _ = make()
        snapshot = controller.snapshot()
        self.assertTrue(snapshot["connected"])
        self.assertEqual(transport.sent[:3], ["client gui", "interlock timeout=30000", "meter list"])
        self.assertEqual(transport.sent[-2:], ["sub meter all", "sub slice all"])
        self.assertIn("ptt_xmit", snapshot["pending_de_fuente"])

    def test_tx_is_default_off_and_limited(self) -> None:
        controller, transport, _ = make(allow_tx=False)
        with self.assertRaises(FlexError) as caught:
            controller.operate({"action": "tune_start", "tune_power": 5})
        self.assertEqual(str(caught.exception), "flex_tx_disabled")
        self.assertNotIn("transmit tune on", transport.sent)
        controller, transport, _ = make()
        with self.assertRaises(FlexError) as caught:
            controller.operate({"action": "tune_start", "tune_power": 21})
        self.assertEqual(str(caught.exception), "flex_tune_limit")
        controller.operate({"action": "tune_start", "tune_power": 10})
        self.assertEqual(transport.sent[-2:], ["transmit set tunepower=10", "transmit tune on"])

    def test_time_cap_unkeys_with_fake_clock(self) -> None:
        controller, transport, clock = make()
        controller.operate({"action": "tune_start", "tune_power": 10})
        clock.t += 31
        controller.pump_once()
        self.assertEqual(transport.sent[-1], "transmit tune off")
        self.assertFalse(controller.snapshot()["tx"]["active"])

    def test_emergency_stop_and_close_unkey(self) -> None:
        controller, transport, _ = make()
        controller.operate({"action": "tune_start", "tune_power": 10})
        self.assertTrue(controller.operate({"action": "emergency_stop"})["ok"])
        self.assertEqual(transport.sent[-1], "transmit tune off")
        controller.close()
        self.assertTrue(transport.closed)
        with self.assertRaises(FlexError):
            controller.snapshot()

    def test_settings_use_documented_names_backup_and_no_repeat(self) -> None:
        controller, transport, _ = make()
        result = controller.operate(
            {"action": "set_setting", "request_id": REQUEST_A, "name": "miclevel", "value": 40}
        )
        self.assertEqual(result["readback"], "ack_only")
        self.assertEqual(transport.sent[-1], "transmit set miclevel=40")
        with self.assertRaises(FlexError):
            controller.operate(
                {"action": "set_setting", "request_id": REQUEST_A, "name": "miclevel", "value": 41}
            )
        for name in ("max_power_level", "region", "vox_level"):
            with self.assertRaises(ValueError):
                controller.operate(
                    {"action": "set_setting", "request_id": REQUEST_B, "name": name, "value": 10}
                )
        with self.assertRaises(ValueError):
            controller.operate(
                {"action": "set_setting", "request_id": REQUEST_B, "name": "rfpower", "value": 101}
            )

    def test_tunepower_setting_respects_the_station_limit(self) -> None:
        controller, _, _ = make()
        with self.assertRaises(FlexError) as caught:
            controller.operate(
                {"action": "set_setting", "request_id": REQUEST_A, "name": "tunepower", "value": 50}
            )
        self.assertEqual(str(caught.exception), "flex_tune_limit")

    def test_amplifier_stays_standby_by_default(self) -> None:
        controller, transport, _ = make()
        with self.assertRaises(FlexError) as caught:
            controller.operate({"action": "amplifier", "handle": "1A", "operate": True})
        self.assertEqual(str(caught.exception), "flex_amplifier_standby")
        self.assertNotIn("amplifier set 1A operate=1", transport.sent)

    def test_config_requires_documented_fields(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "flex.json"
            path.write_text(json.dumps({"host": "radio", "allow_tx": False, "tune_limit": 10, "tx_cap_s": 20}))
            self.assertFalse(FlexConfig.load(path).allow_tx)
            path.write_text(json.dumps({"host": "radio", "allow_tx": False, "tune_limit": 10, "tx_cap_s": 20, "x": 1}))
            with self.assertRaises(ValueError):
                FlexConfig.load(path)
        with self.assertRaises(ValueError):
            FlexConfig("radio", True, 10, 120)


if __name__ == "__main__":
    unittest.main()
