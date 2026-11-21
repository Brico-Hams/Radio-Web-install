import unittest

from bricoham_remote_station.drivers.trusdx_cat import (
    TruSdxMode,
    TruSdxReadCommand,
    build_query,
    parse_frequency_reply,
    parse_identification_reply,
    parse_mode_reply,
)


class TruSdxCatProtocolTests(unittest.TestCase):
    def test_only_documented_read_queries_are_encoded(self) -> None:
        expected = {b"FA;", b"MD;", b"IF;", b"ID;"}
        self.assertEqual({build_query(command) for command in TruSdxReadCommand}, expected)
        with self.assertRaises(ValueError):
            build_query("TX0")

    def test_frequency_reply_requires_exactly_eleven_digits(self) -> None:
        self.assertEqual(parse_frequency_reply(b"FA00014195000;"), 14_195_000)
        for frame in (b"FA14195000;", b"FA0001419500A;", b"MD2;"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                parse_frequency_reply(frame)

    def test_mode_reply_accepts_only_documented_modes(self) -> None:
        self.assertEqual(parse_mode_reply(b"MD1;"), TruSdxMode.LSB)
        self.assertEqual(parse_mode_reply(b"MD4;"), TruSdxMode.FM)
        self.assertEqual(parse_mode_reply(b"MD5;"), TruSdxMode.AM)
        with self.assertRaisesRegex(ValueError, "no documentado"):
            parse_mode_reply(b"MD6;")

    def test_identification_and_frame_boundaries_are_validated(self) -> None:
        self.assertEqual(parse_identification_reply(b"ID020;"), "020")
        for frame in (b"ID019;", b"ID020;\r\n", b"FA" + b"1" * 63 + b";"):
            with self.subTest(frame=frame), self.assertRaises(ValueError):
                if frame.startswith(b"ID"):
                    parse_identification_reply(frame)
                else:
                    parse_frequency_reply(frame)


if __name__ == "__main__":
    unittest.main()
