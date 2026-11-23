import json
import unittest
from pathlib import Path

from bricoham_remote_station.drivers import ftx1_cat
from bricoham_station_agent.accessories import (
    CATALOG_PATH,
    TUNE_POWER_MAX_W,
    AccessorySupervisor,
    StationAccessories,
    band_of,
    load_catalog,
    support_matrix,
)

ROOT = Path(__file__).resolve().parents[2]


class FakeAmp:
    def __init__(self, fail_standby=False, reading=None):
        self.calls = []
        self.fail_standby = fail_standby
        self.reading = reading

    def set_operate(self, on):
        self.calls.append(("operate", on))
        if self.fail_standby and not on:
            raise OSError("serial")

    def set_band(self, band):
        self.calls.append(("band", band))

    def read(self):
        if isinstance(self.reading, Exception):
            raise self.reading
        return self.reading


class FakeTuner:
    def __init__(self):
        self.calls = []

    def start(self):
        self.calls.append("start")

    def stop(self):
        self.calls.append("stop")


def catalog():
    data = load_catalog()
    data["devices"].append({"id": "test-amp", "kind": "amplifier", "status": "partial", "driver": "test"})
    return data


def build(amp=None, tuner=None, operate_allowed=True, clock=None, **extra):
    config = {
        "amplifier": {"device": "test-amp", "operate_allowed": operate_allowed},
        "tuner": {"device": "yaesu-ftx1-internal-atu" if tuner else None},
    }
    amp = amp or FakeAmp()
    kwargs = {"clock": clock} if clock else {}
    return StationAccessories(catalog=catalog(), config=config, amplifier=amp, tuner=tuner, **kwargs, **extra), amp


class AccessoriesTests(unittest.TestCase):
    def test_catalog_lists_pending_devices_without_driver(self):
        rows = {row["id"]: row for row in support_matrix()}
        self.assertGreaterEqual(len(rows), 15)
        for device_id in ("elecraft-kat500", "elecraft-kpa500", "elecraft-kpa1500", "expert-fa", "icom-ic705-internal-atu"):
            self.assertEqual(rows[device_id]["status"], "pendiente de fuente")
            self.assertFalse(rows[device_id]["enabled"])
        self.assertTrue(all(row["source"] for row in rows.values()))
        self.assertEqual(json.loads(CATALOG_PATH.read_text(encoding="utf-8"))["format"], "radicodex-station-accessories-catalog")

    def test_ftx1_tuner_frames_match_catalog_and_driver(self):
        radios = json.loads((ROOT / "data" / "remote-station-catalog.json").read_text(encoding="utf-8"))
        tuner = next(item for item in radios["radios"] if item["id"] == "yaesu-ftx-1")["cat"]["tuner"]
        self.assertEqual(tuner["internal"]["start"], "AC103")
        self.assertEqual(tuner["atas"]["start"], "AC123")
        # AC103 = optima internal, antenna_tuner, state 3 (tuning); the driver treats it as a tune request.
        self.assertTrue(ftx1_cat.parse_tuner_reply(b"AC003;").tuning_requested)
        self.assertFalse(ftx1_cat.parse_tuner_reply(b"AC001;").tuning_requested)

    def test_band_mapping(self):
        self.assertEqual(band_of(14_200_000), "20m")
        self.assertEqual(band_of(7_250_000), None)
        self.assertIsNone(band_of(None))
        self.assertIsNone(band_of(True))

    def test_default_standby_without_driver(self):
        accessories = StationAccessories(config={})
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "standby")
        self.assertEqual(accessories.operate(), {"ok": False, "reason": "unsupported"})

    def test_operate_refusals(self):
        off, _ = build(operate_allowed=False)
        off.follow_band(14_200_000)
        self.assertEqual(off.operate()["reason"], "disabled")
        accessories, amp = build()
        self.assertEqual(accessories.operate()["reason"], "band_unknown")
        accessories.follow_band(14_200_000)
        self.assertEqual(accessories.operate(tx=True)["reason"], "tx")
        self.assertEqual(accessories.operate(tuning=True)["reason"], "tuning")
        self.assertEqual(accessories.operate(swr_tripped=True)["reason"], "swr")
        self.assertNotIn(("operate", True), amp.calls)
        self.assertEqual(accessories.operate(), {"ok": True})

    def test_safety_events_return_to_standby(self):
        for reason in ("disconnect", "swr", "lease", "emergency", "close"):
            accessories, amp = build()
            accessories.follow_band(7_100_000)
            accessories.operate()
            accessories.standby(reason)
            self.assertEqual(accessories.snapshot()["amplifier"]["state"], "standby")
            self.assertEqual(amp.calls[-1], ("operate", False))

    def test_failed_standby_blocks_operate(self):
        accessories, amp = build(FakeAmp(fail_standby=True))
        accessories.follow_band(14_200_000)
        accessories.operate()
        self.assertFalse(accessories.standby("disconnect")["confirmed"])
        self.assertEqual(accessories.operate()["reason"], "standby_pending")
        amp.fail_standby = False
        self.assertTrue(accessories.standby("operator")["confirmed"])
        self.assertTrue(accessories.operate()["ok"])

    def test_band_change_refused_in_tx_and_drops_operate(self):
        accessories, amp = build()
        accessories.follow_band(14_200_000)
        accessories.operate()
        self.assertEqual(accessories.follow_band(7_100_000, tx=True), {"ok": False, "reason": "tx"})
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "operate")
        self.assertEqual(accessories.follow_band(7_100_000)["band"], "40m")
        self.assertEqual(accessories.snapshot()["amplifier"]["standby_reason"], "band_change")
        self.assertEqual(amp.calls[-2:], [("operate", False), ("band", "40m")])

    def test_readout_trips(self):
        cases = [({"swr": 3.5}, "swr"), ({"swr": 1.2, "fault": "OVERTEMP"}, "fault"), ({"operate": True}, "mismatch")]
        for reading, reason in cases:
            accessories, _ = build(FakeAmp(reading=reading))
            accessories.follow_band(14_200_000)
            if reason != "mismatch":
                accessories.operate()
            accessories.poll()
            self.assertEqual(accessories.snapshot()["amplifier"]["standby_reason"], reason)
        accessories, _ = build(FakeAmp(reading=OSError("timeout")))
        accessories.follow_band(14_200_000)
        accessories.operate()
        accessories.poll()
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "fault")

    def test_tune_rules_and_time_cap(self):
        now = [100.0]
        tuner = FakeTuner()
        accessories, _ = build(tuner=tuner, clock=lambda: now[0], tune_max_seconds=20)
        self.assertEqual(accessories.start_tune(tx=True, power_w=5)["reason"], "tx")
        self.assertEqual(accessories.start_tune()["reason"], "power_unknown")
        self.assertEqual(accessories.start_tune(power_w=TUNE_POWER_MAX_W + 1)["reason"], "power_too_high")
        accessories.follow_band(14_200_000)
        accessories.operate()
        self.assertEqual(accessories.start_tune(power_w=5)["reason"], "amp_operate")
        accessories.standby("operator")
        self.assertEqual(tuner.calls, [])
        self.assertTrue(accessories.start_tune(power_w=5)["ok"])
        self.assertEqual(accessories.start_tune(power_w=5)["reason"], "busy")
        self.assertEqual(accessories.operate()["reason"], "tuning")
        now[0] += 19
        accessories.tick()
        self.assertTrue(accessories.snapshot()["tuner"]["tuning"])
        now[0] += 1
        accessories.tick()
        self.assertFalse(accessories.snapshot()["tuner"]["tuning"])
        self.assertEqual(accessories.snapshot()["tuner"]["last"]["reason"], "time_cap")
        self.assertEqual(tuner.calls, ["start", "stop"])

    def test_emergency_stop(self):
        tuner = FakeTuner()
        accessories, amp = build(tuner=tuner)
        accessories.follow_band(14_200_000)
        accessories.start_tune(power_w=5)
        self.assertTrue(accessories.emergency_stop()["ok"])
        self.assertEqual(tuner.calls, ["start", "stop"])
        self.assertEqual(amp.calls[-1], ("operate", False))


class SupervisorTests(unittest.TestCase):
    def make(self, frequencies, tx=None, amp=None, tuner=None):
        accessories, amp = build(amp or FakeAmp(reading={}), tuner=tuner)
        state = {"tx": False, "frequencies": list(frequencies)}

        def read():
            value = state["frequencies"].pop(0)
            if isinstance(value, Exception):
                raise value
            return value

        supervisor = AccessorySupervisor(
            accessories, is_transmitting=lambda: state["tx"], read_frequency=read
        )
        return supervisor, accessories, amp, state

    def test_frequency_feeds_band_and_busy_radio_changes_nothing(self):
        supervisor, accessories, amp, _ = self.make([14_200_000, None, 7_100_000])
        supervisor.step()
        self.assertEqual(accessories.snapshot()["amplifier"]["band"], "20m")
        supervisor.step()
        self.assertEqual(accessories.snapshot()["amplifier"]["band"], "20m")
        supervisor.step()
        self.assertEqual(accessories.snapshot()["amplifier"]["band"], "40m")

    def test_radio_link_loss_forces_standby_and_stops_tune(self):
        tuner = FakeTuner()
        supervisor, accessories, amp, _ = self.make([14_200_000, OSError("cat_io_failed"), OSError("x")], tuner=tuner)
        supervisor.step()
        accessories.operate()
        supervisor.step()
        snapshot = accessories.snapshot()["amplifier"]
        self.assertEqual((snapshot["state"], snapshot["standby_reason"]), ("standby", "disconnect"))
        accessories.start_tune(power_w=5)
        supervisor.step()
        self.assertFalse(accessories.snapshot()["tuner"]["tuning"])
        self.assertEqual(accessories.snapshot()["tuner"]["last"]["reason"], "disconnect")

    def test_lease_loss_forces_standby_and_band_change_waits_for_rx(self):
        supervisor, accessories, amp, state = self.make([14_200_000, 7_100_000, 7_100_000])
        supervisor.step()
        accessories.operate()
        state["tx"] = True
        supervisor.step()
        self.assertEqual(accessories.snapshot()["amplifier"]["band"], "20m")
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "operate")
        state["tx"] = False
        supervisor.step()
        snapshot = accessories.snapshot()["amplifier"]
        self.assertEqual((snapshot["state"], snapshot["standby_reason"], snapshot["band"]), ("standby", "lease", "40m"))

    def test_swr_trip_forces_standby_and_blocks_operate_until_clear(self):
        amp = FakeAmp(reading={"swr": 4.0})
        supervisor, accessories, amp, _ = self.make([14_200_000, 14_200_000], amp=amp)
        supervisor.step()
        self.assertEqual(accessories.snapshot()["amplifier"]["standby_reason"], "swr")
        self.assertEqual(accessories.operate()["reason"], "swr")
        amp.reading = {"swr": 1.5}
        supervisor.step()
        self.assertTrue(accessories.operate()["ok"])

    def test_swr_trip_stops_a_running_tune(self):
        tuner = FakeTuner()
        supervisor, accessories, amp, _ = self.make([14_200_000, 14_200_000], amp=FakeAmp(reading={"swr": 1.0}), tuner=tuner)
        supervisor.step()
        accessories.start_tune(power_w=5)
        amp.reading = {"swr": 5.0}
        supervisor.step()
        self.assertEqual(accessories.snapshot()["tuner"]["last"]["reason"], "swr")

    def test_unexpected_failure_triggers_emergency_stop(self):
        supervisor, accessories, amp, _ = self.make([14_200_000])
        supervisor.step()
        accessories.operate()
        supervisor._is_transmitting = lambda: 1 / 0

        class OneShot:
            calls = 0

            def wait(self, interval):
                OneShot.calls += 1
                return OneShot.calls > 1

        supervisor._stop = OneShot()
        supervisor._run()
        self.assertEqual(accessories.snapshot()["amplifier"]["state"], "fault")
        self.assertEqual(amp.calls[-1], ("operate", False))


if __name__ == "__main__":
    unittest.main()
    unittest.main()
