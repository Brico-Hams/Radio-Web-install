import unittest
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.drivers.ftx1_cat import (
    Ftx1Mode,
    Ftx1ReadCommand,
    Ftx1TxState,
    build_query,
    parse_break_in_reply,
    parse_frequency_field,
    parse_frequency_reply,
    parse_identification_reply,
    parse_key_pitch_reply,
    parse_keyer_reply,
    parse_keyer_speed_reply,
    parse_mode_reply,
    parse_power_reply,
    parse_tuner_reply,
    parse_tx_reply,
)
from bricoham_station_agent.cat import CatConfig, SerialCat


class Ftx1CatProtocolTests(unittest.TestCase):
    def test_only_documented_read_queries_are_encoded(self) -> None:
        expected = {
            b"FA;",
            b"FB;",
            b"MD0;",
            b"MD1;",
            b"ID;",
            b"PC;",
            b"AC;",
            b"TX;",
            b"FT;",
            b"ST;",
            b"IF;",
            b"VX;",
            b"KS;",
            b"KP;",
            b"KR;",
            b"BI;",
        }
        self.assertEqual({build_query(command) for command in Ftx1ReadCommand}, expected)
        with self.assertRaises(ValueError):
            build_query("TX1")

    def test_frequency_field_preserves_nine_digits_without_assuming_units(self) -> None:
        self.assertEqual(
            parse_frequency_field(Ftx1ReadCommand.VFO_A_FREQUENCY, b"FA000014074;"),
            "000014074",
        )
        for command, frame in (
            (Ftx1ReadCommand.VFO_A_FREQUENCY, b"FB000014074;"),
            (Ftx1ReadCommand.VFO_A_FREQUENCY, b"FA0000140740;"),
            (Ftx1ReadCommand.MODE, b"MD2;"),
            ("FA", b"FA000014074;"),
        ):
            with self.subTest(command=command, frame=frame), self.assertRaises(ValueError):
                parse_frequency_field(command, frame)

    def test_identification_is_not_used_to_infer_head_or_spa1_configuration(self) -> None:
        self.assertEqual(parse_identification_reply(b"ID0840;"), "0840")
        with self.assertRaises(ValueError):
            parse_identification_reply(b"ID0841;")

    def test_primary_manual_frequency_example_is_hz_and_documented_limits_are_enforced(self):
        self.assertEqual(
            parse_frequency_reply(Ftx1ReadCommand.VFO_A_FREQUENCY, b"FA014250000;"),
            14_250_000,
        )
        self.assertEqual(
            parse_frequency_reply(Ftx1ReadCommand.VFO_B_FREQUENCY, b"FB470000000;"),
            470_000_000,
        )
        for frame in (b"FA000014074;", b"FA470000001;", b"FA014.25000;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(Ftx1ReadCommand.VFO_A_FREQUENCY, frame)

    def test_mode_queries_require_main_or_sub_and_reserved_codes_are_rejected(self):
        self.assertEqual(parse_mode_reply(Ftx1ReadCommand.MODE, b"MD02;"), Ftx1Mode.USB)
        self.assertEqual(parse_mode_reply(Ftx1ReadCommand.SUB_MODE, b"MD1H;"), Ftx1Mode.C4FM_DN)
        for frame in (b"MD12;", b"MD0G;", b"MD0J;", b"MD00;", b"MD02;TX1;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_mode_reply(Ftx1ReadCommand.MODE, frame)

    def test_power_and_tuner_telemetry_never_infer_an_independent_spa1_link(self):
        reading = parse_power_reply(b"PC2050;")
        self.assertEqual((reading.head, reading.watts), ("SPA-1", 50))
        self.assertEqual(parse_power_reply(b"PC1005;").watts, 5)
        for frame in (b"PC1001;", b"PC1011;", b"PC2101;", b"PC3050;", b"PC20.5;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_power_reply(frame)
        reading = parse_tuner_reply(b"AC001;")
        self.assertEqual(
            (reading.controller, reading.accessory, reading.state_code),
            ("internal_optima", "antenna_tuner", 1),
        )
        self.assertEqual(parse_tuner_reply(b"AC122;").accessory, "ATAS")
        for frame in (b"AC002;", b"AC011;", b"AC201;", b"AC123;TX1;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_tuner_reply(frame)
        self.assertEqual(parse_tx_reply(b"TX0;"), Ftx1TxState.RX)
        self.assertEqual(parse_tx_reply(b"TX2;"), Ftx1TxState.RADIO_TX)
        with self.assertRaises(ValueError):
            parse_tx_reply(b"TX3;")

    def test_selected_serial_profile_reads_hz_and_spa1_without_any_probe_setter(self):
        for response, command in ((b"FA014250000;", "FA"), (b"PC2050;", "PC")):
            port = ScriptedPort(response)
            with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
                cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
                try:
                    result = cat.read(command)
                    self.assertFalse(result["tx_control_enabled"])
                    if command == "FA":
                        self.assertEqual(result["frequency_hz"], 14_250_000)
                    else:
                        self.assertEqual(result["power_control"].head, "SPA-1")
                        self.assertEqual(result["power_control"].watts, 50)
                    self.assertEqual(port.writes, [command.encode("ascii") + b";"])
                finally:
                    cat.close()

    def test_cw_parameters_enforce_primary_units_ranges_and_exact_frame_shape(self):
        for decoder, cases in (
            (parse_keyer_speed_reply, ((b"KS004;", 4), (b"KS060;", 60))),
            (parse_key_pitch_reply, ((b"KP00;", 300), (b"KP35;", 650), (b"KP75;", 1050))),
            (parse_keyer_reply, ((b"KR0;", False), (b"KR1;", True))),
            (parse_break_in_reply, ((b"BI0;", False), (b"BI1;", True))),
        ):
            for frame, expected in cases:
                with self.subTest(frame=frame):
                    self.assertEqual(decoder(frame), expected)
                    self.assertIs(type(decoder(frame)), type(expected))
        for decoder, frames in (
            (parse_keyer_speed_reply, (b"KS003;", b"KS061;", b"KS20;", b"KS020;KY01;")),
            (parse_key_pitch_reply, (b"KP76;", b"KP3.5;", b"KP035;", b"KS35;")),
            (parse_keyer_reply, (b"KR2;", b"KR01;", b"KR1;\r", b"KR1;BI1;")),
            (parse_break_in_reply, (b"BI2;", b"BI01;", b"BI;", b"BI1;KY01;")),
        ):
            for frame in frames:
                with self.subTest(frame=frame), self.assertRaises(ValueError):
                    decoder(frame)

    def test_cw_serial_reads_do_not_enable_keying_or_write_memories(self):
        for command, frame, field, expected in (
            ("KS", b"KS020;", "cw_keyer_speed_wpm", 20),
            ("KP", b"KP35;", "cw_pitch_hz", 650),
            ("KR", b"KR1;", "cw_keyer_enabled", True),
            ("BI", b"BI0;", "cw_break_in_enabled", False),
        ):
            port = ScriptedPort(frame)
            with self.subTest(command=command), patch(
                "bricoham_station_agent.cat.serial.Serial", return_value=port
            ):
                cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
                try:
                    result = cat.read(command)
                    self.assertEqual(result[field], expected)
                    self.assertFalse(result["tx_control_enabled"])
                    self.assertEqual(port.writes, [command.encode("ascii") + b";"])
                    self.assertFalse(port.rts or port.dtr)
                    for forbidden in ("KY", "KY01", "KM1", "KR1", "BI1"):
                        with self.assertRaises(ValueError):
                            cat.read(forbidden)
                    self.assertEqual(port.writes, [command.encode("ascii") + b";"])
                finally:
                    cat.close()


if __name__ == "__main__":
    unittest.main()
