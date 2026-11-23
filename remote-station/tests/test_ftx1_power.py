import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.drivers.ftx1_cat import build_power_set
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat
from bricoham_station_agent.radio_settings import RadioSettingsConfig


class FtxPowerPort(ScriptedPort):
    def __init__(self):
        super().__init__(b"")
        self.head = 2
        self.level = 25
        self.tx = 0
        self.tuner = b"AC000;"
        self.ignore_setting = False
        self.late_echo = False
        self.echo = b""
        self.change_head_after_set = False
        self.delay = 0
        self.ready_at = 0
        self.frequency = {b"FA": 14_250_000, b"FB": 7_074_000}
        self.modes = {b"MD0": b"2", b"MD1": b"1"}
        self.identity = b"ID0840;"
        self.change_identity_after_set = False

    def write(self, data):
        self.writes.append(data)
        self.ready_at = time.monotonic() + self.delay
        if self.change_identity_after_set and len(data) > 4:
            self.identity = b"ID0761;"
        if data == b"ID;":
            reply = self.identity
        elif data == b"PC;":
            reply = f"PC{self.head}{self.level:03d};".encode("ascii")
        elif data == b"TX;":
            reply = f"TX{self.tx};".encode("ascii")
        elif data == b"AC;":
            reply = self.tuner
        elif data[:-1] in self.frequency:
            reply = data[:2] + f"{self.frequency[data[:2]]:09d};".encode("ascii")
        elif data[:-1] in self.modes:
            reply = data[:3] + self.modes[data[:3]] + b";"
        elif data[:2] in self.frequency and len(data) == 12:
            if not self.ignore_setting:
                self.frequency[data[:2]] = int(data[2:-1])
            if self.late_echo:
                self.echo = data
            return len(data)
        elif data[:3] in self.modes and len(data) == 5:
            if not self.ignore_setting:
                self.modes[data[:3]] = data[3:4]
            if self.late_echo:
                self.echo = data
            return len(data)
        elif data.startswith(b"PC") and len(data) == 7:
            if not self.ignore_setting:
                self.level = int(data[3:6])
            if self.change_head_after_set:
                self.head, self.level = 1, 5
            if self.late_echo:
                self.echo = data
            return len(data)
        else:
            raise AssertionError(f"Unexpected or unsafe FTX-1 command: {data!r}")
        self.buffer.extend(self.echo + data + reply)
        self.echo = b""
        return len(data)

    def read(self, size=1):
        if time.monotonic() < self.ready_at:
            time.sleep(0.002)
            return b""
        return super().read(size)


class FtxPowerTests(unittest.TestCase):
    def setUp(self):
        self.port = FtxPowerPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        self.factory = factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(
            CatConfig("FTX-1", "COM_TEST", 38400, timeout=0.1),
            settings=RadioSettingsConfig(True, 50, False),
        )
        self.addCleanup(self.cat.close)

    def power(self, level=40, identifier="ftx1-power-request-0001"):
        return self.cat.operate_settings(
            {"operation": "set_power", "request_id": identifier, "power_level": level}
        )

    def enable_operating(self):
        self.cat.close()
        self.cat = SerialCat(
            self.cat.config,
            settings=RadioSettingsConfig(
                True,
                50,
                False,
                frequency_adjustment_enabled=True,
                mode_adjustment_enabled=True,
            ),
        )
        self.addCleanup(self.cat.close)

    def test_local_operating_flags_are_independent_strict_and_default_disabled(self):
        base = {
            "power_adjustment_enabled": True,
            "power_level_max": 50,
            "tuner_switching_enabled": False,
        }
        flags = ("frequency_adjustment_enabled", "mode_adjustment_enabled", "menu_write_enabled")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings.json"
            path.write_text(json.dumps(base), encoding="utf-8")
            config = RadioSettingsConfig.load(path)
            self.assertFalse(config.frequency_adjustment_enabled)
            self.assertFalse(config.mode_adjustment_enabled)
            self.assertFalse(config.menu_write_enabled)
            for flag in flags:
                path.write_text(json.dumps({**base, flag: True}), encoding="utf-8")
                config = RadioSettingsConfig.load(path)
                for other in flags:
                    self.assertEqual(getattr(config, other), other == flag)
                for invalid in (0, 1, "true", None):
                    with self.subTest(flag=flag, invalid=invalid):
                        path.write_text(json.dumps({**base, flag: invalid}), encoding="utf-8")
                        with self.assertRaises(ValueError):
                            RadioSettingsConfig.load(path)
            path.write_text(json.dumps({**base, "allow_ptt": True}), encoding="utf-8")
            with self.assertRaises(ValueError):
                RadioSettingsConfig.load(path)
        self.factory.assert_not_called()

    def test_operating_read_is_explicit_main_sub_not_an_active_vfo_assumption(self):
        result = self.cat.operate_settings({"operation": "read_operating"})
        self.assertEqual(
            result["receivers"],
            {
                "MAIN": {"frequency_hz": 14_250_000, "mode_code": "2"},
                "SUB": {"frequency_hz": 7_074_000, "mode_code": "1"},
            },
        )
        self.assertFalse(result["frequency_adjustment_enabled"])
        self.assertTrue(
            all(
                frame in (b"TX;", b"AC;", b"FA;", b"FB;", b"MD0;", b"MD1;")
                for frame in self.port.writes
            )
        )

    def test_frequency_and_mode_adjustments_are_targeted_and_readback_verified(self):
        self.enable_operating()
        for index, (operation, receiver, field, target, expected_frame) in enumerate(
            (
                ("set_frequency", "MAIN", "frequency_hz", 30_000, b"FA000030000;"),
                ("set_frequency", "SUB", "frequency_hz", 470_000_000, b"FB470000000;"),
                ("set_mode", "MAIN", "mode_code", "3", b"MD03;"),
                ("set_mode", "SUB", "mode_code", "H", b"MD1H;"),
            )
        ):
            result = self.cat.operate_settings(
                {
                    "operation": operation,
                    "receiver": receiver,
                    field: target,
                    "request_id": f"operating-adjustment-{index:04d}",
                }
            )
            self.assertEqual(result["receivers"][receiver][field], target)
            self.assertEqual(self.port.writes.count(expected_frame), 1)
            self.assertFalse(result["tx_active"])
        with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
            self.cat.operate_settings(
                {
                    "operation": "set_frequency",
                    "receiver": "MAIN",
                    "frequency_hz": 14_250_000,
                    "request_id": "operating-adjustment-0003",
                }
            )

    def test_wrong_radio_identity_prevents_every_ftx1_setting(self):
        for operation, field, value in (
            ("set_power", "power_level", 40),
            ("set_frequency", "frequency_hz", 7_078_000),
            ("set_mode", "mode_code", "2"),
        ):
            port = FtxPowerPort()
            port.identity = b"ID0761;"
            self.factory.return_value = port
            cat = SerialCat(
                self.cat.config,
                settings=RadioSettingsConfig(
                    True, 50, False,
                    frequency_adjustment_enabled=True,
                    mode_adjustment_enabled=True,
                ),
            )
            self.addCleanup(cat.close)
            with self.subTest(operation=operation):
                with self.assertRaisesRegex(CatError, "cat_setting_unconfirmed"):
                    cat.operate_settings({
                        "operation": operation,
                        "request_id": "wrong-radio-request-0001",
                        **({"receiver": "MAIN"} if operation != "set_power" else {}),
                        field: value,
                    })
                self.assertEqual(port.writes, [b"ID;"])
                self.assertTrue(port.closed)

    def test_identity_change_after_setter_never_confirms_or_retries_the_adjustment(self):
        self.enable_operating()
        self.port.change_identity_after_set = True
        payload = {
            "operation": "set_frequency",
            "receiver": "SUB",
            "frequency_hz": 7_078_000,
            "request_id": "identity-change-request-0001",
        }
        with self.assertRaisesRegex(CatError, "cat_setting_unconfirmed"):
            self.cat.operate_settings(payload)
        self.assertEqual(self.port.writes.count(b"FB007078000;"), 1)
        self.assertEqual(self.port.writes.count(b"ID;"), 2)
        self.assertTrue(self.port.closed)
        count = len(self.port.writes)
        with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
            self.cat.operate_settings(payload)
        self.assertEqual(len(self.port.writes), count)

    def test_operating_controls_reject_disabled_invalid_targets_before_opening_port(self):
        for operation, field, value, code in (
            ("set_frequency", "frequency_hz", 14_250_000, "cat_frequency_adjustment_disabled"),
            ("set_mode", "mode_code", "2", "cat_mode_adjustment_disabled"),
        ):
            with self.assertRaisesRegex(CatError, code):
                self.cat.operate_settings(
                    {
                        "operation": operation,
                        "receiver": "MAIN",
                        field: value,
                        "request_id": "disabled-operating-request-0001",
                    }
                )
        self.enable_operating()
        for value in (True, "14250000", 14_250_000.5, 29_999, 470_000_001):
            with self.assertRaises(ValueError):
                self.cat.operate_settings(
                    {
                        "operation": "set_frequency",
                        "receiver": "MAIN",
                        "frequency_hz": value,
                        "request_id": "invalid-frequency-request-0001",
                    }
                )
        for receiver, value in (("ACTIVE", "2"), ([], "2"), ("MAIN", "G"), ("MAIN", 2)):
            with self.assertRaises(ValueError):
                self.cat.operate_settings(
                    {
                        "operation": "set_mode",
                        "receiver": receiver,
                        "mode_code": value,
                        "request_id": "invalid-mode-request-0001",
                    }
                )
        self.factory.assert_not_called()
        with self.assertRaises(ValueError):
            SerialCat(
                CatConfig("IC-7300", "COM_TEST", 19200),
                settings=RadioSettingsConfig(True, 120, False, mode_adjustment_enabled=True),
            )

    def test_operating_controls_share_rx_guards_and_reject_mismatch_or_delayed_echo(self):
        self.enable_operating()
        command = {
            "operation": "set_frequency",
            "receiver": "MAIN",
            "frequency_hz": 14_074_000,
            "request_id": "operating-rx-guard-0001",
        }
        self.port.tx = 1
        with self.assertRaisesRegex(CatError, "cat_settings_require_rx"):
            self.cat.operate_settings(command)
        self.assertEqual(self.port.frequency[b"FA"], 14_250_000)
        self.port.tx = 0
        self.port.ignore_setting = True
        command["request_id"] = "operating-mismatch-0001"
        with self.assertRaisesRegex(CatError, "cat_setting_readback_mismatch"):
            self.cat.operate_settings(command)
        self.port.late_echo = True
        command["request_id"] = "operating-late-echo-0001"
        with self.assertRaisesRegex(CatError, "cat_setting_unconfirmed"):
            self.cat.operate_settings(command)
        self.assertEqual(self.port.writes.count(b"FA014074000;"), 2)
        self.assertTrue(self.port.closed)

    def test_watts_setpoint_uses_observed_head_and_readback_without_tuner_or_tx_setters(self):
        self.assertEqual(self.cat.settings_catalog()["power_unit"], "watts_setpoint")
        self.factory.assert_not_called()
        result = self.power()
        self.assertEqual((result["power_level"], result["power_head"]), (40, "SPA-1"))
        self.assertFalse(result["tx_active"])
        self.assertFalse(result["tuner_busy"])
        self.assertEqual(self.port.writes.count(b"PC2040;"), 1)
        self.assertTrue(
            all(frame in (b"ID;", b"TX;", b"AC;", b"PC;", b"PC2040;") for frame in self.port.writes)
        )
        with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
            self.power()
        self.assertFalse(self.port.rts)
        self.assertFalse(self.port.dtr)

    def test_field_head_range_never_probed_by_a_setting_and_other_head_changes_fail(self):
        self.port.head, self.port.level = 1, 5
        with self.assertRaisesRegex(CatError, "cat_power_head_limit_exceeded"):
            self.power(11)
        self.assertNotIn(b"PC1011;", self.port.writes)
        result = self.power(8, "field-valid-request-0001")
        self.assertEqual((result["power_level"], result["power_head"]), (8, "field"))
        self.assertIn(b"PC1008;", self.port.writes)
        self.port.head = 2
        self.port.change_head_after_set = True
        with self.assertRaisesRegex(CatError, "cat_setting_readback_mismatch"):
            self.power(20, "head-change-request-0001")

    def test_rx_and_tuner_atas_guards_precede_any_setting_write(self):
        for index, (tx, tuner) in enumerate(
            (
                (1, b"AC000;"),
                (2, b"AC000;"),
                (0, b"AC003;"),
                (0, b"AC121;"),
                (0, b"AC122;"),
                (0, b"AC123;"),
            )
        ):
            self.port.tx, self.port.tuner = tx, tuner
            with self.assertRaisesRegex(CatError, "cat_settings_require_rx"):
                self.power(identifier=f"ftx1-guard-request-{index:04d}")
        self.assertTrue(
            all(frame in (b"ID;", b"TX;", b"AC;", b"PC;") for frame in self.port.writes)
        )

    def test_inputs_units_disabled_flags_and_no_unsupported_operations(self):
        for level in (True, "5", 5.5, 0, 4, 51, 101, float("nan")):
            with self.subTest(level=level), self.assertRaises(ValueError):
                self.power(level)
        for operation in ("set_tuner", "tune", "ptt", "send_cmd"):
            with self.assertRaises(ValueError):
                self.cat.operate_settings({"operation": operation})
        self.factory.assert_not_called()
        for config in (RadioSettingsConfig(True, 120, False), RadioSettingsConfig(True, 10, True)):
            with self.assertRaises(ValueError):
                SerialCat(CatConfig("FTX-1", "COM_TEST", 38400), settings=config)
        disabled = SerialCat(
            CatConfig("FTX-1", "COM_TEST", 38400),
            settings=RadioSettingsConfig(False, 10, False),
        )
        with self.assertRaisesRegex(CatError, "cat_power_adjustment_disabled"):
            disabled.operate_settings(
                {
                    "operation": "set_power",
                    "request_id": "disabled-request-0001",
                    "power_level": 5,
                }
            )
        self.factory.assert_not_called()
        for head, value in (("other", 5), ("field", 11), ("SPA-1", True), ("SPA-1", 101)):
            with self.assertRaises(ValueError):
                build_power_set(head, value)

    def test_readback_and_delayed_setter_echo_never_confirm_an_ignored_write(self):
        self.port.ignore_setting = True
        with self.assertRaisesRegex(CatError, "cat_setting_readback_mismatch"):
            self.power()
        self.port.late_echo = True
        with self.assertRaisesRegex(CatError, "cat_setting_unconfirmed"):
            self.power(identifier="delayed-echo-request-0001")
        self.assertTrue(self.port.closed)
        self.assertEqual(self.port.writes.count(b"PC2040;"), 2)

    def test_shared_lock_and_aggregate_deadline_apply_to_ftx1(self):
        self.cat._lock.acquire()
        try:
            with self.assertRaisesRegex(CatError, "cat_busy"):
                self.power()
            self.factory.assert_not_called()
        finally:
            self.cat._lock.release()
        self.cat.config = CatConfig("FTX-1", "COM_TEST", 38400, timeout=2)
        self.port.delay = 0.6
        started = time.monotonic()
        with self.assertRaisesRegex(CatError, "cat_timeout"):
            self.power(identifier="deadline-request-0001")
        elapsed = time.monotonic() - started
        self.assertGreaterEqual(elapsed, 2.9)
        self.assertLess(elapsed, 3.8)
        self.assertTrue(self.port.closed)
