import unittest
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.drivers import opengd77_usb as gd77
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat


def radio_info(model=gd77.OpenGd77Model.GD77, version=1):
    return (
        b"R\x00\x2e"
        + version.to_bytes(4, "little")
        + tuple(gd77.OpenGd77Model).index(model).to_bytes(4, "little")
        + b"R2026.05.04".ljust(16, b"\x00")
        + b"May 04 2026".ljust(16, b"\x00")
        + b"\xfd;\x00\xff\x12\x34"
    )


class OpenGd77UsbTests(unittest.TestCase):
    def test_radio_info_decodes_only_known_fields_and_explicit_model(self):
        for model in gd77.OpenGd77Model:
            with self.subTest(model=model):
                result = gd77.parse_radio_info(model, radio_info(model))
                self.assertEqual(
                    result,
                    {
                        "model": model.value,
                        "structure_version": 1,
                        "firmware": "R2026.05.04",
                        "build": "May 04 2026",
                    },
                )
        with self.assertRaises(ValueError):
            gd77.parse_radio_info(gd77.OpenGd77Model.MDUV380, radio_info())
        for frame in (
            radio_info(version=0),
            radio_info(version=5),
            b"R\x00\x2d" + radio_info()[3:],
            radio_info()[:-1],
            radio_info() + b"\x00",
            radio_info()[:7] + (99).to_bytes(4, "little") + radio_info()[11:],
            radio_info()[:11] + b"\xff" + radio_info()[12:],
        ):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                gd77.parse_radio_info(gd77.OpenGd77Model.GD77, frame)

    def test_fragmented_length_framing_uses_no_cps_commands_or_control_lines(self):
        port = ScriptedPort(radio_info())
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port) as factory:
            cat = SerialCat(CatConfig("OpenGD77 GD-77", "COM_TEST", 115200))
            self.addCleanup(cat.close)
            catalog = cat.catalog()
            self.assertEqual(catalog["queries"], ["INFO"])
            self.assertFalse(catalog["radio_control_available"])
            factory.assert_not_called()
            result = cat.read("INFO")
            self.assertEqual(result["device_information"]["model"], "GD-77")
            self.assertNotIn("reply_hex", result)
            self.assertFalse(result["data_is_simulated"])
            self.assertFalse(result["hardware_validation_complete"])
            self.assertEqual(port.writes, [b"R\x09\x00\x00\x00\x00\x00\x2e"])
            self.assertFalse(port.rts)
            self.assertFalse(port.dtr)
            for command in ("FA", "TX", "PTT", "SCREEN", "W", "C", "INFO;"):
                with self.assertRaises(ValueError):
                    cat.read(command)
            self.assertEqual(len(port.writes), 1)
            with self.assertRaises(ValueError):
                cat.reserve_transmitter()

    def test_rejection_bad_lengths_unknown_versions_and_disconnect_close_without_retry(self):
        for response, error in (
            (b"-", "cat_request_rejected"),
            (b"W", "cat_invalid_response"),
            (b"R\xff\xff", "cat_invalid_response"),
            (radio_info(version=5), "cat_invalid_response"),
            (radio_info()[:14], "cat_timeout"),
        ):
            port = ScriptedPort(response)
            with (
                self.subTest(error=error),
                patch("bricoham_station_agent.cat.serial.Serial", return_value=port),
            ):
                cat = SerialCat(CatConfig("OpenGD77 GD-77", "COM_TEST", 115200, timeout=0.1))
                self.addCleanup(cat.close)
                with self.assertRaisesRegex(CatError, error):
                    cat.read("INFO")
                self.assertTrue(port.closed)
                self.assertEqual(port.writes, [gd77.RADIO_INFO_QUERY])
