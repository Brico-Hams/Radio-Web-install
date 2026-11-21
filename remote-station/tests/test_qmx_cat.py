import unittest

from bricoham_remote_station.drivers.qmx_cat import (
    QmxMode,
    QmxReadCommand,
    build_query,
    parse_frequency_reply,
    parse_mode_reply,
)


class QmxCatProtocolTests(unittest.TestCase):
    def test_only_documented_read_queries_are_encoded(self) -> None:
        for command in QmxReadCommand:
            with self.subTest(command=command):
                encoded = build_query(command)
                self.assertEqual(encoded, f"{command.value};".encode("ascii"))
                self.assertNotIn(b"\r", encoded)
                self.assertNotIn(b"\n", encoded)

        with self.assertRaises(ValueError):
            build_query("TX")

    def test_frequency_reply_requires_expected_prefix_and_eleven_digits(self) -> None:
        frequency = parse_frequency_reply(
            QmxReadCommand.VFO_A_FREQUENCY,
            b"FA00014074000;",
        )
        self.assertEqual(frequency, 14_074_000)

        for frame in (b"FB00014074000;", b"FA14074000;", b"FA00014074000\r;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(QmxReadCommand.VFO_A_FREQUENCY, frame)

    def test_mode_reply_accepts_documented_mode_codes_only(self) -> None:
        self.assertEqual(parse_mode_reply(b"MD2;"), QmxMode.USB)
        with self.assertRaisesRegex(ValueError, "no documentado"):
            parse_mode_reply(b"MD4;")

    def test_mode_reply_rejects_line_endings_and_oversized_frames(self) -> None:
        with self.assertRaises(ValueError):
            parse_mode_reply(b"MD2;\r\n")
        with self.assertRaises(ValueError):
            parse_mode_reply(b"MD" + b"2" * 63 + b";")


if __name__ == "__main__":
    unittest.main()
