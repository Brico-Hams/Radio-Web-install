import json
import math
import unittest
from pathlib import Path

from bricoham_remote_station.drivers.ftx1_cat import (
    alc_percent,
    build_meter_query,
    comp_db,
    drain_amps,
    parse_meter_reply,
    parse_smeter_reply,
    po_watts,
    s_units,
    swr_from_raw,
    vdd_volts,
)

MODEL = json.loads((Path(__file__).resolve().parents[2] / "data" / "remote-meter-model.json").read_text("utf-8"))


class Ftx1MeterTests(unittest.TestCase):
    def test_bench_frames_parse(self) -> None:
        # Raw frames read from a real FTX-1 in RX (PC2100: SPA-1 head, 100 W).
        keys = ["smeter", "smeter-sub", "comp", "alc", "po", "swr", "id", "vdd"]
        frames = [b"RM1000000;", b"RM2000000;", b"RM3000000;", b"RM4000000;",
                  b"RM5000000;", b"RM6000000;", b"RM7000000;", b"RM8201000;"]
        readings = [parse_meter_reply(frame) for frame in frames]
        self.assertEqual([reading.key for reading in readings], keys)
        self.assertEqual(readings[-1].raw, 201)
        self.assertEqual(parse_smeter_reply(b"SM0000;").key, "smeter")
        self.assertEqual(build_meter_query(6), b"RM6;")

    def test_invalid_frames_are_rejected(self) -> None:
        for frame in (b"RM9000000;", b"RM4300000;", b"RM4000001;", b"RM400;"):
            with self.assertRaises(ValueError):
                parse_meter_reply(frame)
        with self.assertRaises(ValueError):
            parse_smeter_reply(b"SM2000;")
        with self.assertRaises(ValueError):
            build_meter_query(0)

    def test_scales_match_the_shared_model(self) -> None:
        meters = MODEL["meters"]
        self.assertAlmostEqual(vdd_volts(201), 13.66, places=2)
        self.assertAlmostEqual(vdd_volts(meters["vdd"]["raw203"]), meters["vdd"]["scale"])
        self.assertAlmostEqual(drain_amps(255), meters["id"]["scale"])
        self.assertAlmostEqual(comp_db(255), meters["comp"]["scale"])
        self.assertEqual(alc_percent(252), meters["alc"]["cap"])
        self.assertEqual(alc_percent(255), meters["alc"]["cap"])
        self.assertEqual(swr_from_raw(0), 1.0)
        self.assertTrue(math.isinf(swr_from_raw(255)))
        self.assertAlmostEqual(swr_from_raw(100), 1 + meters["swr"]["c"] * (math.exp(meters["swr"]["b"] * 100) - 1))
        for raw, watts in meters["po"]["points"]:
            self.assertAlmostEqual(po_watts(raw, "field"), watts)
        self.assertIsNone(po_watts(128, "SPA-1"))
        self.assertEqual(s_units(meters["smeter"]["s9raw"]), (9, 0.0))
        for raw, over in meters["smeter"]["over"]:
            self.assertAlmostEqual(s_units(raw)[1], over)
        self.assertEqual([s_units(raw)[0] for raw in (0, 14, 42, 81, 103)], [0, 1, 3, 5, 7])


if __name__ == "__main__":
    unittest.main()
