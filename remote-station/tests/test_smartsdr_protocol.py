import unittest

from bricoham_remote_station.drivers.smartsdr_protocol import (
    MAX_SMARTSDR_SEQUENCE,
    SmartSdrReadCommand,
    build_query,
    parse_response,
)


class SmartSdrProtocolTests(unittest.TestCase):
    def test_only_info_query_is_encoded_with_a_bounded_sequence(self) -> None:
        self.assertEqual(build_query(SmartSdrReadCommand.INFO, 16), b"C16|info\n")
        for sequence in (-1, MAX_SMARTSDR_SEQUENCE + 1, True):
            with self.subTest(sequence=sequence), self.assertRaises(ValueError):
                build_query(SmartSdrReadCommand.INFO, sequence)
        with self.assertRaises(ValueError):
            build_query("xmit", 16)

    def test_parses_documented_success_response_and_preserves_info_message(self) -> None:
        response = parse_response(
            b'R16|0|model="FLEX-6700",software_ver=0.0.3,mac=00:18:31:78:4F:B4\r\n',
            expected_sequence=16,
        )
        self.assertTrue(response.succeeded)
        self.assertEqual(response.error_code, 0)
        self.assertIn('model="FLEX-6700"', response.message)

    def test_parses_nonzero_hex_error_code(self) -> None:
        response = parse_response(b"R7|0000000A|denied\n", expected_sequence=7)
        self.assertFalse(response.succeeded)
        self.assertEqual(response.error_code, 10)

    def test_rejects_mismatched_malformed_and_oversized_responses(self) -> None:
        malformed = (
            b"S16|slice 0",
            b"R17|0|wrong sequence\n",
            b"R16|xyz|bad code\n",
            b"R16|100000000|wide code\n",
            b"R16|0|embedded\nline\n",
            b"R16|0|non-ascii-\xff\n",
            b"R16|0|missing terminator",
            b"R16|0|two terminators\n\n",
            b"R16|0|" + b"x" * 16_384 + b"\n",
        )
        for frame in malformed:
            with self.subTest(frame=frame[:32]), self.assertRaises(ValueError):
                parse_response(frame, expected_sequence=16)


if __name__ == "__main__":
    unittest.main()
