import time
import unittest
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.drivers import icom_civ as icom
from bricoham_remote_station.drivers import yaesu_cat as yaesu
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat
from bricoham_station_agent.radio_settings import RadioSettingsConfig


class YaesuSettingsPort(ScriptedPort):
    def __init__(self, model):
        super().__init__(b"")
        self.model = model
        self.ids = {
            "FT-710": b"0800",
            "FT-991A": b"0670",
            "FTDX10": b"0761",
            "FTDX101D": b"0681",
            "FTDX101MP": b"0682",
            "FTDX3000": b"0462",
        }
        self.id = self.ids[model]
        self.tx = b"0"
        self.tuner = b"001"
        self.ignore_setting = False
        self.values = {
            b"PC": b"025",
            b"FA": b"14250000" if model == "FTDX3000" else b"014250000",
            b"FB": b"07074000" if model == "FTDX3000" else b"007074000",
            b"MD0": b"2",
            b"MD1": b"1",
        }

    def write(self, data):
        self.writes.append(data)
        command = data[:-1]
        if command in (b"ID", b"TX", b"AC"):
            payload = {b"ID": self.id, b"TX": self.tx, b"AC": self.tuner}[command]
            self.buffer.extend(data + command + payload + b";")
        elif command in self.values:
            if command == b"MD1" and self.model in ("FT-991A", "FTDX3000"):
                raise AssertionError("Undocumented secondary mode query")
            self.buffer.extend(data + command + self.values[command] + b";")
        else:
            prefix = command[:3] if command.startswith(b"MD") else command[:2]
            if prefix not in self.values or not command[len(prefix) :]:
                raise AssertionError(f"Unsafe/unknown request: {data}")
            if not self.ignore_setting:
                self.values[prefix] = command[len(prefix) :]
        return len(data)


class YaesuSettingsTests(unittest.TestCase):
    def test_read_operating_rejects_out_of_range_frequency_without_fabricating_state(self):
        port = YaesuSettingsPort("FT-710")
        port.values[b"FA"] = b"999999999"
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            cat = self.configured("FT-710", port)
            with self.assertRaisesRegex(CatError, "cat_invalid_response"):
                cat.operate_settings({"operation": "read_operating"})
            self.assertTrue(port.closed)

    def configured(self, model, port, **flags):
        cat = SerialCat(
            CatConfig(model, "COM_TEST", 38400, timeout=0.1),
            settings=RadioSettingsConfig(
                power_adjustment_enabled=True,
                power_level_max=200 if model == "FTDX101MP" else 100,
                tuner_switching_enabled=False,
                frequency_adjustment_enabled=True,
                mode_adjustment_enabled=True,
                **flags,
            ),
        )
        self.addCleanup(cat.close)
        return cat

    def test_all_six_models_read_and_adjust_with_explicit_selectors_and_no_tx(self):
        for model in yaesu.YaesuModel:
            port = YaesuSettingsPort(model.value)
            with (
                self.subTest(model=model),
                patch("bricoham_station_agent.cat.serial.Serial", return_value=port) as factory,
            ):
                cat = self.configured(model.value, port)
                config = cat.settings_catalog()
                factory.assert_not_called()
                result = cat.operate_settings({"operation": "read_operating"})
                secondary_mode = model not in (yaesu.YaesuModel.FT_991A, yaesu.YaesuModel.FTDX3000)
                self.assertEqual(config["receiver_options"][1]["mode_supported"], secondary_mode)
                self.assertEqual(
                    result["receivers"]["SUB"]["mode_code"], "1" if secondary_mode else None
                )
                payload = {
                    "operation": "set_frequency",
                    "request_id": "yaesu-frequency-001",
                    "receiver": "SUB",
                    "frequency_hz": 7_100_000,
                }
                self.assertEqual(
                    cat.operate_settings(payload)["receivers"]["SUB"]["frequency_hz"], 7_100_000
                )
                frame = b"FB07100000;" if model is yaesu.YaesuModel.FTDX3000 else b"FB007100000;"
                self.assertEqual(port.writes.count(frame), 1)
                count = len(port.writes)
                with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
                    cat.operate_settings(payload)
                self.assertEqual(len(port.writes), count)
                self.assertEqual(
                    cat.operate_settings(
                        {
                            "operation": "set_mode",
                            "request_id": "yaesu-mode-request-001",
                            "receiver": "MAIN",
                            "mode_code": "3",
                        }
                    )["receivers"]["MAIN"]["mode_code"],
                    "3",
                )
                watts = 200 if model is yaesu.YaesuModel.FTDX101MP else 100
                self.assertEqual(
                    cat.operate_settings(
                        {
                            "operation": "set_power",
                            "request_id": "yaesu-power-request-001",
                            "power_level": watts,
                        }
                    )["power_level"],
                    watts,
                )
                self.assertTrue(
                    all(
                        not frame.startswith((b"TX0", b"TX1", b"AC0", b"KY", b"KM"))
                        for frame in port.writes
                    )
                )
                self.assertFalse(port.rts)
                self.assertFalse(port.dtr)

    def test_wrong_model_tx_and_tuner_prevent_writes_and_uncertain_setter_is_not_retried(self):
        for model, tx, tuner, identity, error in (
            ("FT-710", b"0", b"001", b"0670", "cat_invalid_response"),
            ("FT-710", b"2", b"001", b"0800", "cat_settings_require_rx"),
            ("FT-710", b"0", b"003", b"0800", "cat_settings_require_rx"),
            ("FT-710", b"0", b"021", b"0800", "cat_settings_require_rx"),
            ("FT-991A", b"0", b"002", b"0670", "cat_settings_require_rx"),
        ):
            port = YaesuSettingsPort(model)
            port.tx, port.tuner, port.id = tx, tuner, identity
            with (
                self.subTest(model=model, tx=tx, tuner=tuner),
                patch("bricoham_station_agent.cat.serial.Serial", return_value=port),
            ):
                cat = self.configured(model, port)
                with self.assertRaisesRegex(CatError, error):
                    cat.operate_settings(
                        {
                            "operation": "set_power",
                            "request_id": "yaesu-guard-request-001",
                            "power_level": 50,
                        }
                    )
                self.assertNotIn(b"PC050;", port.writes)
                self.assertTrue(port.closed)
        port = YaesuSettingsPort("FTDX3000")
        port.ignore_setting = True
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            cat = self.configured("FTDX3000", port)
            payload = {
                "operation": "set_frequency",
                "request_id": "yaesu-uncertain-001",
                "receiver": "SUB",
                "frequency_hz": 7_100_000,
            }
            with self.assertRaisesRegex(CatError, "cat_setting_readback_mismatch"):
                cat.operate_settings(payload)
            self.assertEqual(port.writes.count(b"FB07100000;"), 1)
            with self.assertRaisesRegex(CatError, "cat_setting_request_repeated"):
                cat.operate_settings(payload)
            self.assertEqual(port.writes.count(b"FB07100000;"), 1)

    def test_undocumented_secondary_mode_disabled_flags_and_invalid_limits_never_open(self):
        with patch("bricoham_station_agent.cat.serial.Serial") as factory:
            for model in ("FT-991A", "FTDX3000"):
                cat = self.configured(model, None)
                with self.assertRaises(ValueError):
                    cat.operate_settings(
                        {
                            "operation": "set_mode",
                            "request_id": "yaesu-sub-mode-001",
                            "receiver": "SUB",
                            "mode_code": "2",
                        }
                    )
            cat = SerialCat(
                CatConfig("FTDX10", "COM_TEST", 38400),
                settings=RadioSettingsConfig(False, 50, False),
            )
            with self.assertRaisesRegex(CatError, "cat_frequency_adjustment_disabled"):
                cat.operate_settings(
                    {
                        "operation": "set_frequency",
                        "request_id": "yaesu-disabled-001",
                        "receiver": "MAIN",
                        "frequency_hz": 14_250_000,
                    }
                )
            with self.assertRaises(ValueError):
                SerialCat(
                    CatConfig("FT-710", "COM_TEST", 38400),
                    settings=RadioSettingsConfig(False, 200, False),
                )
            factory.assert_not_called()


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
