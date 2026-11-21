import unittest

from bricoham_remote_station.drivers.elecraft_k4_cat import (
    ElecraftK4Mode,
    ElecraftK4ReadCommand,
    build_query,
    parse_frequency_reply,
    parse_mode_reply,
)


class ElecraftK4CatProtocolTests(unittest.TestCase):
    def test_only_documented_get_commands_are_encoded(self) -> None:
        self.assertEqual(
            {build_query(command) for command in ElecraftK4ReadCommand},
            {b"FA;", b"FB;", b"MD;", b"MD$;"},
        )
        with self.assertRaises(ValueError):
            build_query("FA14074000")

    def test_frequency_reply_is_eleven_digit_hertz_value(self) -> None:
        self.assertEqual(
            parse_frequency_reply(
                ElecraftK4ReadCommand.VFO_A_FREQUENCY,
                b"FA00014074000;",
            ),
            14_074_000,
        )
        self.assertEqual(
            parse_frequency_reply(
                ElecraftK4ReadCommand.VFO_B_FREQUENCY,
                b"FB00005035000;",
            ),
            5_035_000,
        )
        with self.assertRaises(ValueError):
            parse_frequency_reply(ElecraftK4ReadCommand.VFO_A_MODE, b"MD00014074000;")

    def test_mode_reply_requires_matching_vfo_query_and_documented_code(self) -> None:
        self.assertEqual(
            parse_mode_reply(ElecraftK4ReadCommand.VFO_A_MODE, b"MD2;"),
            ElecraftK4Mode.USB,
        )
        self.assertEqual(
            parse_mode_reply(ElecraftK4ReadCommand.VFO_B_MODE, b"MD$9;"),
            ElecraftK4Mode.DATA_REVERSE,
        )
        for frame, command in (
            (b"MD$2;", ElecraftK4ReadCommand.VFO_A_MODE),
            (b"MD0;", ElecraftK4ReadCommand.VFO_A_MODE),
            (b"MD8;", ElecraftK4ReadCommand.VFO_A_MODE),
            (b"MDX;", ElecraftK4ReadCommand.VFO_A_MODE),
            (b"MD2;", ElecraftK4ReadCommand.VFO_B_FREQUENCY),
            (b"MD2;", "MD"),
        ):
            with self.subTest(frame=frame, command=command), self.assertRaises(ValueError):
                parse_mode_reply(command, frame)

    def test_reply_rejects_line_endings_and_oversized_frames(self) -> None:
        for frame in (b"FA00014074000;\r\n", b"FA" + b"1" * 63 + b";"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(ElecraftK4ReadCommand.VFO_A_FREQUENCY, frame)


if __name__ == "__main__":
    unittest.main()
