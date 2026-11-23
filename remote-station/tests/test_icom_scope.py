import unittest

from bricoham_remote_station.drivers.icom_scope import ScopeAssembler, ScopeFrame, scope_payload

# Layout from third_party/ftx1/rigplane-rigplane-core/docs/api/scope.md (frequency: 5 BCD bytes, LSB first).
FREQ_14074000 = bytes((0x00, 0x40, 0x07, 0x14, 0x00))
HALF_25000 = bytes((0x00, 0x50, 0x02, 0x00, 0x00))


def civ(*data: int, to: int = 0xE0, source: int = 0x94) -> bytes:
    return bytes((0xFE, 0xFE, to, source, 0x27, 0x00, 0x00, *data, 0xFD))


class IcomScopeTests(unittest.TestCase):
    def test_rebuilds_a_three_sequence_centre_mode_frame(self) -> None:
        assembler = ScopeAssembler()
        first = scope_payload(civ(0x01, 0x03, 0x00, *FREQ_14074000, *HALF_25000, 0x00, 1, 2, 3), 0x94)
        assert first is not None
        self.assertEqual(first[0], 0)
        self.assertIsNone(assembler.feed(first[1]))
        self.assertIsNone(assembler.feed(scope_payload(civ(0x02, 0x03, 4, 5))[1]))  # type: ignore[index]
        frame = assembler.feed(scope_payload(civ(0x03, 0x03, 160, 6))[1])  # type: ignore[index]
        self.assertEqual(frame, ScopeFrame(0, 14049000, 14099000, False, bytes((1, 2, 3, 4, 5, 160, 6))))

    def test_single_packet_and_out_of_range(self) -> None:
        assembler = ScopeAssembler()
        single = assembler.feed(scope_payload(civ(0x01, 0x01, 0x01, *FREQ_14074000, *HALF_25000, 0x00, 9, 8))[1])  # type: ignore[index]
        self.assertEqual(single, ScopeFrame(1, 14074000, 25000, False, b"\x09\x08"))
        oor = assembler.feed(scope_payload(civ(0x01, 0x01, 0x00, *FREQ_14074000, *HALF_25000, 0x01))[1])  # type: ignore[index]
        assert oor is not None
        self.assertTrue(oor.out_of_range)
        self.assertEqual(oor.pixels, b"")

    def test_rejects_sequence_gaps_other_frames_and_bad_bcd(self) -> None:
        assembler = ScopeAssembler()
        self.assertIsNone(assembler.feed(scope_payload(civ(0x02, 0x02, 1))[1]))  # type: ignore[index]
        assembler.feed(scope_payload(civ(0x01, 0x03, 0x00, *FREQ_14074000, *HALF_25000, 0x00, 1))[1])  # type: ignore[index]
        self.assertIsNone(assembler.feed(scope_payload(civ(0x03, 0x03, 1))[1]))  # type: ignore[index]
        self.assertIsNone(scope_payload(bytes((0xFE, 0xFE, 0xE0, 0x94, 0x03, 0xFD))))
        self.assertIsNone(scope_payload(civ(0x01, 0x01), 0xA4))
        self.assertIsNone(assembler.feed(bytes((0x0A, 0x01, 0, 0))))


    def test_negative_lower_edge_marked_with_f_in_the_gigahertz_digit(self) -> None:
        # IC-705 CI-V guide p.28 (local data/third-party/IC-705_ENG_CI-V_6.txt): "F" = lower edge is negative.
        negative = bytes((0x00, 0x00, 0x05, 0x00, 0xF0))
        frame = ScopeAssembler().feed(bytes((0x01, 0x01, 0x01, *negative, *HALF_25000, 0x00, 5)))
        assert frame is not None
        self.assertEqual((frame.start_hz, frame.end_hz), (-50000, 25000))


if __name__ == "__main__":
    unittest.main()
