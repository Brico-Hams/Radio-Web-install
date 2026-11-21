import time
import unittest
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.drivers import icom_civ as icom
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat
from bricoham_station_agent.radio_settings import RadioSettingsConfig


class SettingsPort(ScriptedPort):
    def __init__(self):
        super().__init__(b"")
        self.level = 25
        self.tuner = 0
        self.tx = 0
        self.ptt_tune = 0
        self.ack = b"\xfe\xfe\xe0\x94\xfb\xfd"
        self.ignore_setting = False
        self.response_delay = 0
        self.ready_at = 0

    def write(self, data):
        self.ready_at = time.monotonic() + self.response_delay
        self.writes.append(data)
        command = data[4:-1]
        if command == b"\x1c\x00":
            payload = bytes((self.tx,))
        elif command == b"\x1c\x01":
            payload = bytes((self.tuner,))
        elif command == b"\x14\x0a":
            payload = bytes.fromhex(f"{self.level:04d}")
        elif command == b"\x1a\x05\x00\x35":
            payload = bytes((self.ptt_tune,))
        elif command[:2] == b"\x14\x0a" and len(command) == 4:
            if not self.ignore_setting:
                self.level = int(command[2:].hex())
            self.buffer.extend(data + self.ack)
            return len(data)
        elif command[:2] == b"\x1c\x01" and len(command) == 3:
            if not self.ignore_setting:
                self.tuner = command[2]
            self.buffer.extend(data + self.ack)
            return len(data)
        else:
            raise AssertionError(f"Unexpected or unsafe serial command: {data.hex()}")
        self.buffer.extend(data + b"\xfe\xfe\xe0\x94" + command + payload + b"\xfd")
        return len(data)

    def read(self, size=1):
        if time.monotonic() < self.ready_at:
            time.sleep(0.002)
            return b""
        return super().read(size)


class RadioSettingsTests(unittest.TestCase):
    def setUp(self):
        self.port = SettingsPort()
        self.factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        self.mock = self.factory.start()
        self.addCleanup(self.factory.stop)
        self.cat = SerialCat(
            CatConfig("IC-7300", "COM_TEST", 19200, timeout=0.1),
            settings=RadioSettingsConfig(True, 120, True),
        )
        self.addCleanup(self.cat.close)

    def power(self, level=100):
        return self.cat.operate_settings(
            {
                "operation": "set_power",
                "request_id": "settings-request-0001",
                "power_level": level,
            }
        )

    def tuner(self, enabled=True):
        return self.cat.operate_settings(
            {
                "operation": "set_tuner",
                "request_id": "settings-tuner-0001",
                "enabled": enabled,
            }
        )

    def test_metadata_is_passive_and_power_setting_is_bcd_with_verified_readback(self):
        self.assertEqual(self.cat.settings_catalog()["power_unit"], "cat_position_0_255")
        self.mock.assert_not_called()
        result = self.power()
        self.assertEqual(result["power_level"], 100)
        self.assertFalse(result["tx_active"])
        self.assertFalse(result["data_is_simulated"])
        self.assertIn(bytes.fromhex("FEFE94E0140A0100FD"), self.port.writes)
        self.assertFalse(self.port.rts)
        self.assertFalse(self.port.dtr)
        count = len(self.port.writes)
        with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
            self.power()
        self.assertEqual(len(self.port.writes), count)

    def test_inputs_local_limit_and_unsupported_operations_fail_without_serial_io(self):
        for value in (True, "100", 100.5, -1, 121, 256, float("nan")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.power(value)
        for operation in ("tune", "ptt", "send_cmd"):
            with self.assertRaises(ValueError):
                self.cat.operate_settings({"operation": operation})
        with self.assertRaises(ValueError):
            self.tuner(2)
        self.mock.assert_not_called()
        with self.assertRaises(ValueError):
            SerialCat(
                CatConfig("IC-705", "COM_TEST", 19200),
                settings=RadioSettingsConfig(True, 120, True),
            )

    def test_rx_and_not_tuning_are_required_before_any_setting_write(self):
        for tx, tuner in ((1, 0), (0, 2)):
            self.port.tx, self.port.tuner = tx, tuner
            with (
                self.subTest(tx=tx, tuner=tuner),
                self.assertRaisesRegex(CatError, "cat_settings_require_rx"),
            ):
                self.cat.operate_settings(
                    {
                        "operation": "set_power",
                        "request_id": f"guard-request-{tx}-{tuner}",
                        "power_level": 100,
                    }
                )
        self.assertTrue(all(len(frame) == 7 for frame in self.port.writes))

    def test_tuner_on_requires_local_ptt_tune_off_and_never_sends_start_tuning(self):
        self.port.ptt_tune = 1
        with self.assertRaisesRegex(CatError, "cat_disable_ptt_tune_locally"):
            self.tuner()
        self.assertNotIn(bytes.fromhex("FEFE94E01C0101FD"), self.port.writes)
        self.port.ptt_tune = 0
        result = self.cat.operate_settings(
            {
                "operation": "set_tuner",
                "request_id": "settings-tuner-0002",
                "enabled": True,
            }
        )
        self.assertEqual(result["tuner_state"], 1)
        result = self.cat.operate_settings(
            {
                "operation": "set_tuner",
                "request_id": "settings-tuner-0003",
                "enabled": False,
            }
        )
        self.assertEqual(result["tuner_state"], 0)
        self.assertNotIn(bytes.fromhex("FEFE94E01C0102FD"), self.port.writes)
        self.assertNotIn(bytes.fromhex("FEFE94E01C0001FD"), self.port.writes)

    def test_lost_ack_and_readback_mismatch_close_port_and_never_retry_setting(self):
        self.port.ack = b""
        with self.assertRaisesRegex(CatError, "cat_timeout"):
            self.power()
        self.assertTrue(self.port.closed)
        self.assertEqual(self.port.writes.count(bytes.fromhex("FEFE94E0140A0100FD")), 1)
        self.port.ack = b"\xfe\xfe\xe0\x94\xfb\xfd"
        self.port.ignore_setting = True
        with self.assertRaisesRegex(CatError, "cat_setting_readback_mismatch"):
            self.cat.operate_settings(
                {
                    "operation": "set_power",
                    "request_id": "settings-request-0002",
                    "power_level": 50,
                }
            )
        observed = self.cat.operate_settings({"operation": "read"})
        self.assertEqual(observed["power_level"], 100)

    def test_multiple_slow_replies_share_the_real_three_second_transaction_budget(self):
        self.cat.config = CatConfig("IC-7300", "COM_TEST", 19200, timeout=1)
        self.port.response_delay = 0.6
        started = time.monotonic()
        with self.assertRaisesRegex(CatError, "cat_timeout"):
            self.power()
        elapsed = time.monotonic() - started
        self.assertGreaterEqual(elapsed, 2.9)
        self.assertLess(elapsed, 3.6)
        self.assertGreater(len(self.port.writes), 3)
        self.assertEqual(self.port.writes.count(bytes.fromhex("FEFE94E0140A0100FD")), 1)
        self.assertTrue(self.port.closed)

    def test_disabled_settings_and_unconfigured_transport_never_open_port(self):
        with self.cat._lock, self.assertRaisesRegex(CatError, "cat_busy"):
            self.power()
        self.cat.settings = RadioSettingsConfig(False, 120, False)
        for function in (self.power, self.tuner):
            with self.assertRaisesRegex(CatError, "disabled"):
                function()
        self.cat.settings = None
        with self.assertRaisesRegex(CatError, "cat_settings_not_configured"):
            self.cat.operate_settings({"operation": "read"})
        self.mock.assert_not_called()

    def test_setting_decoder_rejects_wrong_radio_bcd_range_and_tuner_states(self):
        for frame in (
            "FEFEE098140A0100FD",
            "FEFEE094140A0260FD",
            "FEFEE094140A00FAFD",
            "FEFEE094140A0100FDFD",
        ):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                icom.parse_ic7300_setting(icom.Ic7300Setting.POWER, bytes.fromhex(frame))
        with self.assertRaises(ValueError):
            icom.parse_ic7300_setting(icom.Ic7300Setting.TUNER, bytes.fromhex("FEFEE0941C0103FD"))
        with self.assertRaises(ValueError):
            icom.parse_ic7300_setting_ack(bytes.fromhex("FEFEE098FBFD"))
        self.assertFalse(icom.parse_ic7300_setting_ack(bytes.fromhex("FEFEE094FAFD")))
