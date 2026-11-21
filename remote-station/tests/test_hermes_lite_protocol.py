import unittest

from bricoham_remote_station.drivers.hermes_lite_protocol import (
    DISCOVERY_REPLY_BYTES,
    DISCOVERY_REQUEST,
    HERMES_LITE_BOARD_ID,
    HermesLiteDiscoveryStatus,
    build_discovery_request,
    parse_discovery_reply,
)


class HermesLiteProtocolTests(unittest.TestCase):
    def test_builds_the_fixed_read_only_metis_discovery_request(self) -> None:
        request = build_discovery_request()
        self.assertEqual(request, b"\xef\xfe\x02" + bytes(60))
        self.assertEqual(request, DISCOVERY_REQUEST)
        self.assertEqual(len(request), 63)

    def test_parses_documented_hermes_lite_reply_fields(self) -> None:
        packet = bytearray(DISCOVERY_REPLY_BYTES)
        packet[:11] = bytes((0xEF, 0xFE, 0x02, 0x00, 0x1C, 0xC0, 0xA2, 0x13, 0xDD, 0x4A, 0x06))
        reply = parse_discovery_reply(bytes(packet))
        self.assertEqual(reply.status, HermesLiteDiscoveryStatus.IDLE)
        self.assertEqual(reply.mac_address, "00:1C:C0:A2:13:DD")
        self.assertEqual(reply.gateware_version_raw, 0x4A)
        self.assertEqual(reply.board_id, HERMES_LITE_BOARD_ID)

    def test_accepts_streaming_status_without_starting_or_changing_a_stream(self) -> None:
        packet = b"\xef\xfe\x03" + bytes(6) + b"\x00\x06" + bytes(49)
        reply = parse_discovery_reply(packet)
        self.assertEqual(reply.status, HermesLiteDiscoveryStatus.STREAMING)

    def test_rejects_bad_length_header_status_and_board_id(self) -> None:
        good = b"\xef\xfe\x02" + bytes(6) + b"\x00\x06" + bytes(49)
        malformed = (
            good[:-1],
            good + b"\x00",
            b"\x00\x00" + good[2:],
            b"\xef\xfe\x04" + good[3:],
            b"\xef\xfe\x02" + good[3:10] + b"\x05" + good[11:],
        )
        for packet in malformed:
            with self.subTest(packet=packet[:11]), self.assertRaises(ValueError):
                parse_discovery_reply(packet)

        with self.assertRaises(ValueError):
            parse_discovery_reply(bytearray(good))


if __name__ == "__main__":
    unittest.main()
