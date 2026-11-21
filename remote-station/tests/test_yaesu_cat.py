import unittest

from bricoham_remote_station.drivers.yaesu_cat import (
    YaesuBand,
    YaesuMode,
    YaesuModel,
    YaesuReadCommand,
    build_frequency_set,
    build_mode_set,
    build_power_set,
    build_query,
    parse_frequency_reply,
    parse_identification_reply,
    parse_mode_reply,
    parse_parameter_reply,
    parse_tuner_busy_reply,
    read_commands,
)


class YaesuCatProtocolTests(unittest.TestCase):
    def test_documented_cw_power_tx_and_accessory_states_are_model_specific(self) -> None:
        for model in YaesuModel:
            with self.subTest(model=model):
                self.assertEqual(
                    parse_parameter_reply(model, YaesuReadCommand.KEYER_SPEED, b"KS004;"), 4
                )
                self.assertEqual(
                    parse_parameter_reply(model, YaesuReadCommand.KEY_PITCH, b"KP75;"), 1050
                )
                self.assertIs(parse_parameter_reply(model, YaesuReadCommand.KEYER, b"KR1;"), True)
                self.assertIs(
                    parse_parameter_reply(model, YaesuReadCommand.BREAK_IN, b"BI0;"), False
                )
                self.assertEqual(
                    parse_parameter_reply(model, YaesuReadCommand.TX_STATE, b"TX2;"), 2
                )
                for command, frame in (
                    (YaesuReadCommand.KEYER_SPEED, b"KS003;"),
                    (YaesuReadCommand.KEY_PITCH, b"KP76;"),
                    (YaesuReadCommand.KEYER, b"KR2;"),
                    (YaesuReadCommand.POWER, b"PC201;"),
                    (YaesuReadCommand.TX_STATE, b"TX3;"),
                ):
                    with self.assertRaises(ValueError):
                        parse_parameter_reply(model, command, frame)
                self.assertFalse(parse_tuner_busy_reply(model, b"AC001;"))
                busy = b"AC003;" if model is YaesuModel.FT_710 else b"AC002;"
                self.assertTrue(parse_tuner_busy_reply(model, busy))
                invalid = b"AC002;" if model is YaesuModel.FT_710 else b"AC003;"
                with self.assertRaises(ValueError):
                    parse_tuner_busy_reply(model, invalid)
        self.assertTrue(parse_tuner_busy_reply(YaesuModel.FT_710, b"AC021;"))
        self.assertFalse(parse_tuner_busy_reply(YaesuModel.FT_710, b"AC020;"))

    def test_setters_enforce_model_ranges_and_do_not_offer_ptt_or_keying(self) -> None:
        self.assertEqual(build_power_set(YaesuModel.FTDX101MP, 200), b"PC200;")
        for model in YaesuModel:
            with self.subTest(model=model):
                maximum = (
                    470_000_000
                    if model is YaesuModel.FT_991A
                    else (60_000_000 if model is YaesuModel.FTDX3000 else 75_000_000)
                )
                command = YaesuReadCommand.FREQUENCY_B
                expected = (
                    b"FB60000000;" if model is YaesuModel.FTDX3000 else f"FB{maximum:09d};".encode()
                )
                self.assertEqual(build_frequency_set(model, command, maximum), expected)
                for invalid in (True, 29_999, maximum + 1, "14250000"):
                    with self.assertRaises(ValueError):
                        build_frequency_set(model, command, invalid)
                self.assertEqual(build_mode_set(model, YaesuReadCommand.MAIN_MODE, "2"), b"MD02;")
                for command in (YaesuReadCommand.TX_STATE, YaesuReadCommand.KEYER):
                    with self.assertRaises(ValueError):
                        build_mode_set(model, command, "1")
                if model is not YaesuModel.FTDX101MP:
                    with self.assertRaises(ValueError):
                        build_power_set(model, 101)
                    with self.assertRaises(ValueError):
                        parse_parameter_reply(model, YaesuReadCommand.POWER, b"PC200;")
        for model in (YaesuModel.FT_991A, YaesuModel.FTDX3000):
            with self.assertRaises(ValueError):
                build_mode_set(model, YaesuReadCommand.SUB_MODE, "2")

    def test_read_commands_are_model_specific_for_secondary_mode(self) -> None:
        self.assertIn(YaesuReadCommand.SUB_MODE, read_commands(YaesuModel.FT_710))
        self.assertNotIn(YaesuReadCommand.SUB_MODE, read_commands(YaesuModel.FT_991A))
        self.assertNotIn(YaesuReadCommand.SUB_MODE, read_commands(YaesuModel.FTDX3000))

    def test_only_model_documented_read_queries_are_encoded(self) -> None:
        expected = {
            YaesuModel.FT_710: {b"FA;", b"FB;", b"MD0;", b"MD1;", b"ID;"},
            YaesuModel.FT_991A: {b"FA;", b"FB;", b"MD0;", b"ID;"},
            YaesuModel.FTDX10: {b"FA;", b"FB;", b"MD0;", b"MD1;", b"ID;"},
            YaesuModel.FTDX101D: {b"FA;", b"FB;", b"MD0;", b"MD1;", b"ID;"},
            YaesuModel.FTDX101MP: {b"FA;", b"FB;", b"MD0;", b"MD1;", b"ID;"},
            YaesuModel.FTDX3000: {b"FA;", b"FB;", b"MD0;", b"ID;"},
        }
        for model, commands in expected.items():
            with self.subTest(model=model):
                self.assertEqual(
                    {
                        build_query(model, command)
                        for command in YaesuReadCommand
                        if command.value.encode("ascii") + b";" in commands
                    },
                    commands,
                )
                with self.assertRaises(ValueError):
                    build_query(model, "TX")
        for model in (YaesuModel.FT_991A, YaesuModel.FTDX3000):
            with self.subTest(model=model), self.assertRaises(ValueError):
                build_query(model, YaesuReadCommand.SUB_MODE)
        with self.assertRaises(ValueError):
            build_query("FT-710", YaesuReadCommand.FREQUENCY_A)

    def test_frequency_reply_widths_are_model_specific_and_values_are_hz(self) -> None:
        replies = {
            YaesuModel.FT_710: (b"FA014250000;", 14_250_000),
            YaesuModel.FT_991A: (b"FB145000000;", 145_000_000),
            YaesuModel.FTDX10: (b"FA014074000;", 14_074_000),
            YaesuModel.FTDX101D: (b"FA070740000;", 70_740_000),
            YaesuModel.FTDX101MP: (b"FB000030000;", 30_000),
            YaesuModel.FTDX3000: (b"FA14250000;", 14_250_000),
        }
        for model, (frame, expected_hz) in replies.items():
            with self.subTest(model=model):
                command = (
                    YaesuReadCommand.FREQUENCY_B
                    if frame.startswith(b"FB")
                    else YaesuReadCommand.FREQUENCY_A
                )
                self.assertEqual(parse_frequency_reply(model, command, frame), expected_hz)

    def test_frequency_rejects_mismatches_malformed_data_and_cross_model_widths(self) -> None:
        invalid = (
            (YaesuModel.FT_710, YaesuReadCommand.FREQUENCY_A, b"FA14250000;"),
            (YaesuModel.FTDX3000, YaesuReadCommand.FREQUENCY_A, b"FA014250000;"),
            (YaesuModel.FT_710, YaesuReadCommand.FREQUENCY_A, b"FB014250000;"),
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, b"FA014250000;"),
            (YaesuModel.FT_710, YaesuReadCommand.FREQUENCY_A, b"FA01425A000;"),
            (YaesuModel.FT_710, YaesuReadCommand.FREQUENCY_A, "FA014250000;"),
            (YaesuModel.FT_710, "FA", b"FA014250000;"),
        )
        for model, command, frame in invalid:
            with (
                self.subTest(model=model, command=command, frame=frame),
                self.assertRaises(ValueError),
            ):
                parse_frequency_reply(model, command, frame)

    def test_mode_parsers_keep_model_specific_codes_and_band_selectors(self) -> None:
        valid = (
            (
                YaesuModel.FT_710,
                YaesuReadCommand.MAIN_MODE,
                b"MD02;",
                YaesuBand.MAIN,
                YaesuMode.USB,
            ),
            (
                YaesuModel.FT_710,
                YaesuReadCommand.SUB_MODE,
                b"MD1F;",
                YaesuBand.SUB,
                YaesuMode.DATA_FM_NARROW,
            ),
            (
                YaesuModel.FT_991A,
                YaesuReadCommand.MAIN_MODE,
                b"MD0E;",
                YaesuBand.MAIN,
                YaesuMode.C4FM,
            ),
            (
                YaesuModel.FTDX10,
                YaesuReadCommand.MAIN_MODE,
                b"MD0E;",
                YaesuBand.MAIN,
                YaesuMode.PSK,
            ),
            (
                YaesuModel.FTDX101D,
                YaesuReadCommand.SUB_MODE,
                b"MD1A;",
                YaesuBand.SUB,
                YaesuMode.DATA_FM,
            ),
            (
                YaesuModel.FTDX101MP,
                YaesuReadCommand.MAIN_MODE,
                b"MD0D;",
                YaesuBand.MAIN,
                YaesuMode.AM_NARROW,
            ),
            (
                YaesuModel.FTDX3000,
                YaesuReadCommand.MAIN_MODE,
                b"MD0A;",
                YaesuBand.MAIN,
                YaesuMode.PACKET_FM,
            ),
        )
        for model, command, frame, band, mode in valid:
            with self.subTest(model=model, frame=frame):
                self.assertEqual(parse_mode_reply(model, command, frame), (band, mode))

    def test_mode_parser_rejects_wrong_band_codes_and_unsupported_modes(self) -> None:
        invalid = (
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, b"MD12;"),
            (YaesuModel.FT_991A, YaesuReadCommand.MAIN_MODE, b"MD0F;"),
            (YaesuModel.FTDX10, YaesuReadCommand.MAIN_MODE, b"MD0G;"),
            (YaesuModel.FTDX3000, YaesuReadCommand.MAIN_MODE, b"MD0E;"),
            (YaesuModel.FTDX3000, YaesuReadCommand.FREQUENCY_A, b"MD03;"),
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, b"MD0;"),
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, b"MD02;\r\n"),
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, b"MD02;" + b" " * 64),
            (YaesuModel.FT_710, "MD0", b"MD02;"),
            (YaesuModel.FT_710, YaesuReadCommand.MAIN_MODE, None),
        )
        for model, command, frame in invalid:
            with (
                self.subTest(model=model, command=command, frame=frame),
                self.assertRaises(ValueError),
            ):
                parse_mode_reply(model, command, frame)

    def test_identification_is_exact_and_model_specific(self) -> None:
        ids = {
            YaesuModel.FT_710: "0800",
            YaesuModel.FT_991A: "0670",
            YaesuModel.FTDX10: "0761",
            YaesuModel.FTDX101D: "0681",
            YaesuModel.FTDX101MP: "0682",
            YaesuModel.FTDX3000: "0462",
        }
        for model, expected_id in ids.items():
            with self.subTest(model=model):
                self.assertEqual(
                    parse_identification_reply(model, f"ID{expected_id};".encode("ascii")),
                    expected_id,
                )
                wrong_id = "0000" if expected_id != "0000" else "0001"
                with self.assertRaises(ValueError):
                    parse_identification_reply(model, f"ID{wrong_id};".encode("ascii"))
        with self.assertRaises(ValueError):
            parse_identification_reply(YaesuModel.FT_710, "ID0800;")


if __name__ == "__main__":
    unittest.main()
