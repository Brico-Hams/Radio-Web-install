import json
import unittest
from pathlib import Path

from bricoham_remote_station.drivers.icom_civ import (
    Ic705Meter,
    build_ic705_meter_query,
    build_ic705_state_query,
    ic705_meter_value,
    parse_ic705_meter_reply,
    parse_ic705_state_reply,
)

MODEL = json.loads((Path(__file__).resolve().parents[2] / "data" / "remote-meter-model.json").read_text("utf-8"))


def reply(sub: int, high: int, low: int) -> bytes:
    return bytes((0xFE, 0xFE, 0xE0, 0xA4, 0x15, sub, high, low, 0xFD))


class Ic705MeterTests(unittest.TestCase):
    def test_queries_follow_the_guide(self) -> None:
        # IC-705 CI-V Reference Guide printed p.4: command 15, sub 02/11/12/13/14/15/16.
        self.assertEqual(build_ic705_meter_query(Ic705Meter.S_METER), bytes.fromhex("FEFEA4E01502FD"))
        self.assertEqual(build_ic705_meter_query(Ic705Meter.SWR), bytes.fromhex("FEFEA4E01512FD"))
        self.assertEqual(build_ic705_state_query(False), bytes.fromhex("FEFEA4E01C00FD"))
        self.assertEqual(build_ic705_state_query(True), bytes.fromhex("FEFEA4E01C01FD"))
        with self.assertRaises(ValueError):
            build_ic705_meter_query(0x15)

    def test_anchor_values(self) -> None:
        cases = [
            (Ic705Meter.S_METER, 0x01, 0x20, (9.0, "S")),
            (Ic705Meter.S_METER, 0x02, 0x41, (69.0, "S+dB")),
            (Ic705Meter.PO, 0x01, 0x43, (50.0, "%")),
            (Ic705Meter.PO, 0x02, 0x13, (100.0, "%")),
            (Ic705Meter.SWR, 0x00, 0x00, (1.0, "")),
            (Ic705Meter.SWR, 0x00, 0x48, (1.5, "")),
            (Ic705Meter.SWR, 0x00, 0x80, (2.0, "")),
            (Ic705Meter.SWR, 0x01, 0x20, (3.0, "")),
            (Ic705Meter.SWR, 0x02, 0x00, (None, "")),
            (Ic705Meter.ALC, 0x01, 0x20, (100.0, "%")),
            (Ic705Meter.COMP, 0x01, 0x30, (15.0, "dB")),
            (Ic705Meter.COMP, 0x02, 0x10, (25.5, "dB")),
            (Ic705Meter.VD, 0x00, 0x75, (5.0, "V")),
            (Ic705Meter.VD, 0x02, 0x41, (16.0, "V")),
            (Ic705Meter.ID, 0x01, 0x21, (2.0, "A")),
            (Ic705Meter.ID, 0x02, 0x41, (4.0, "A")),
        ]
        for meter, high, low, expected in cases:
            with self.subTest(meter=meter, raw=(high, low)):
                raw = parse_ic705_meter_reply(meter, reply(meter.value, high, low))
                value, unit = ic705_meter_value(meter, raw)
                self.assertEqual(unit, expected[1])
                if expected[0] is None:
                    self.assertIsNone(value)
                else:
                    self.assertAlmostEqual(value, expected[0])

    def test_invalid_frames_are_rejected(self) -> None:
        for frame in (
            reply(0x02, 0x0A, 0x20),
            reply(0x02, 0x03, 0x00),
            reply(0x12, 0x01, 0x20),
            bytes.fromhex("FEFEE094150201 20FD".replace(" ", "")),
            reply(0x02, 0x01, 0x20)[:-1],
        ):
            with self.subTest(frame=frame.hex()), self.assertRaises(ValueError):
                parse_ic705_meter_reply(Ic705Meter.S_METER, frame)
        with self.assertRaises(ValueError):
            parse_ic705_state_reply(True, bytes.fromhex("FEFEE0A41C0103FD"))
        self.assertEqual(parse_ic705_state_reply(True, bytes.fromhex("FEFEE0A41C0102FD")), 2)
        self.assertEqual(parse_ic705_state_reply(False, bytes.fromhex("FEFEE0A41C0001FD")), 1)

    def test_matches_the_shared_model_anchors(self) -> None:
        profile = MODEL["profiles"]["ic705"]["meters"]
        for name, meter in (("po", Ic705Meter.PO), ("swr", Ic705Meter.SWR), ("alc", Ic705Meter.ALC),
                            ("comp", Ic705Meter.COMP), ("vdd", Ic705Meter.VD), ("id", Ic705Meter.ID)):
            self.assertEqual(int(profile[name]["sub"], 16), meter.value)
            for raw, value in profile[name]["points"]:
                self.assertAlmostEqual(ic705_meter_value(meter, raw)[0], value)


if __name__ == "__main__":
    unittest.main()
