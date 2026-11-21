import unittest

from bricoham_remote_station.drivers.kenwood_cat import (
    KenwoodModeCommand,
    KenwoodModel,
    KenwoodReadCommand,
    build_mode_query,
    build_query,
    parse_frequency_reply,
    parse_mode_reply,
)


class KenwoodCatProtocolTests(unittest.TestCase):
    def test_only_frequency_queries_are_encoded(self) -> None:
        self.assertEqual(
            {build_query(command) for command in KenwoodReadCommand},
            {b"FA;", b"FB;"},
        )
        with self.assertRaises(ValueError):
            build_query("TX")

    def test_frequency_reply_requires_matching_command_and_eleven_digits(self) -> None:
        self.assertEqual(
            parse_frequency_reply(
                KenwoodReadCommand.VFO_A_FREQUENCY,
                b"FA00014074000;",
            ),
            14_074_000,
        )
        for command, frame in (
            (KenwoodReadCommand.VFO_A_FREQUENCY, b"FB00014074000;"),
            (KenwoodReadCommand.VFO_A_FREQUENCY, b"FA14074000;"),
            (KenwoodReadCommand.VFO_A_FREQUENCY, b"FA0001407400A;"),
            ("FA", b"FA00014074000;"),
        ):
            with self.subTest(command=command, frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(command, frame)

    def test_reply_rejects_line_endings_and_oversized_frames(self) -> None:
        for frame in (b"FA00014074000;\r\n", b"FA" + b"1" * 63 + b";"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(KenwoodReadCommand.VFO_A_FREQUENCY, frame)

    def test_mode_commands_are_gated_by_model(self) -> None:
        self.assertEqual(
            build_mode_query(KenwoodModel.TS_990S, KenwoodModeCommand.SUB_MODE), b"OM1;"
        )
        for model, command in (
            (KenwoodModel.TS_590S, KenwoodModeCommand.SUB_MODE),
            (KenwoodModel.TS_990S, KenwoodModeCommand.CURRENT_MODE),
            (KenwoodModel.TS_890S, KenwoodModeCommand.MAIN_MODE),
            ("TS-890S", KenwoodModeCommand.VFO_A_FREQUENCY_MODE),
            (KenwoodModel.TS_590SG, "MD"),
        ):
            with self.subTest(model=model, command=command), self.assertRaises(ValueError):
                build_mode_query(model, command)

    def test_model_specific_mode_responses_preserve_raw_codes(self) -> None:
        sf = parse_mode_reply(
            KenwoodModel.TS_890S,
            KenwoodModeCommand.VFO_B_FREQUENCY_MODE,
            b"SF1000140740002;",
        )
        self.assertEqual(sf.frequency_hz, 14_074_000)
        self.assertEqual(sf.mode_code, "2")
        om = parse_mode_reply(KenwoodModel.TS_990S, KenwoodModeCommand.SUB_MODE, b"OM1D;")
        self.assertEqual(om.mode_code, "D")
        self.assertIsNone(om.frequency_hz)
        md = parse_mode_reply(KenwoodModel.TS_590SG, KenwoodModeCommand.CURRENT_MODE, b"MD2;")
        self.assertEqual(md.mode_code, "2")

    def test_mode_response_rejects_wrong_receiver_and_malformed_payload(self) -> None:
        for frame in (b"SF0000140740002;", b"SF10001407400A2;", b"SF12;", b"SF100014074000?;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_mode_reply(
                    KenwoodModel.TS_890S, KenwoodModeCommand.VFO_B_FREQUENCY_MODE, frame
                )


if __name__ == "__main__":
    unittest.main()
