import time
import unittest
from unittest.mock import patch

from test_ptt import PttPort

from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.ptt import PttConfig, PttController, PttError, PttOperator
from bricoham_station_agent.txsafety import TxInhibit, occupied_span, parse_tx_ranges

BAND = [{"start_hz": 14_000_000, "end_hz": 14_350_000}]
EDGE = 14_350_000
GUEST = {"transmit": True, "bands": [], "max_power_w": None}


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class TxInhibitPureTests(unittest.TestCase):
    def test_occupied_span_sidebands_and_centred_modes(self):
        self.assertEqual(occupied_span(14_200_000, "USB", 2400), (14_200_000, 14_202_400))
        self.assertEqual(occupied_span(14_200_000, "LSB", 2400), (14_197_600, 14_200_000))
        self.assertEqual(occupied_span(14_200_000, "USB"), (14_200_000, 14_202_700))
        self.assertEqual(occupied_span(14_200_000, "DATA_L"), (14_197_300, 14_200_000))
        self.assertEqual(occupied_span(14_200_000, "CW_L"), (14_199_900, 14_200_100))
        self.assertEqual(occupied_span(14_200_000, "FM_N"), (14_194_000, 14_206_000))
        self.assertEqual(occupied_span(14_200_000, "AM"), (14_197_000, 14_203_000))
        for carrier, mode in ((None, "USB"), (14_200_000, None), (14_200_000, " "), (True, "USB")):
            self.assertIsNone(occupied_span(carrier, mode))

    def test_band_edge_lsb_stays_inside_and_usb_leaves(self):
        inhibit = TxInhibit(parse_tx_ranges(BAND), lambda message: None)
        self.assertEqual(inhibit.evaluate(EDGE, "LSB")[0], "inside")
        self.assertEqual(inhibit.evaluate(EDGE, "USB")[0], "outside")

    def test_ranges_are_validated_and_empty_means_not_configured(self):
        inhibit = TxInhibit(parse_tx_ranges(None))
        self.assertFalse(inhibit.configured)
        self.assertEqual(inhibit.observe(EDGE, "USB"), "not-configured")
        self.assertEqual(inhibit.snapshot()["state"], "not-configured")
        for bad in ("x", [{"start_hz": 5, "end_hz": 5}], [{"start_hz": 1}], [1], [{"start_hz": 1.5, "end_hz": 9}]):
            with self.assertRaises(ValueError):
                parse_tx_ranges(bad)

    def test_only_a_crossing_is_logged_and_unknown_is_not_a_crossing(self):
        logs = []
        inhibit = TxInhibit(parse_tx_ranges(BAND), logs.append)
        for carrier in (14_200_000, 14_210_000):
            self.assertEqual(inhibit.observe(carrier, "USB"), "inside")
        self.assertEqual(logs, [])
        self.assertEqual(inhibit.observe(EDGE, "USB"), "outside")
        self.assertEqual(inhibit.observe(EDGE, "USB"), "outside")
        self.assertEqual(len(logs), 1)
        self.assertEqual(inhibit.observe(None, "USB"), "unknown")
        self.assertEqual(inhibit.observe(EDGE, "USB"), "outside")
        self.assertEqual(len(logs), 1)
        inhibit.observe(14_200_000, "USB")
        self.assertEqual(len(logs), 2)


class PttFixture(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        patcher = patch.object(time, "monotonic", self.clock)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.port = PttPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        self.addCleanup(self.cat.close)
        self.revoked = set()

    def controller(self, ranges=BAND, max_seconds=30):
        config = PttConfig(True, 14_000_000, 14_400_000, 30, max_seconds, ranges)
        ptt = PttController(
            self.cat, config, guest_active=lambda guest_id: guest_id not in self.revoked
        )
        self.addCleanup(ptt.close)
        ptt.operate({"operation": "stop"})
        return ptt

    def start(self, ptt, name="a", operator=None):
        return ptt.operate(
            {"operation": "start", "request_id": f"ptt-start-request-{name}-0001"}, operator
        )

    def set_radio(self, frequency, mode=b"2"):
        self.port.frequency[b"FA"], self.port.modes[b"MD0"] = frequency, mode


class TxInhibitPttTests(PttFixture):
    def test_no_ranges_behaviour_is_unchanged_and_reports_not_configured(self):
        ptt = self.controller(ranges=())
        self.assertEqual(ptt.snapshot()["tx_inhibit"]["state"], "not-configured")
        self.assertFalse(ptt.snapshot()["tx_inhibit"]["configured"])
        self.set_radio(EDGE)
        self.start(ptt)
        self.assertEqual(self.port.tx, 1)
        self.assertIsNone(ptt.tune_refusal())

    def test_key_up_is_refused_out_of_band_and_never_sends_tx_on(self):
        ptt = self.controller()
        self.set_radio(EDGE, b"2")
        with self.assertRaisesRegex(PttError, "ptt_out_of_band"):
            self.start(ptt, "usb")
        self.assertNotIn(b"TX1;", self.port.writes)
        self.assertEqual(ptt.snapshot()["tx_inhibit"]["state"], "outside")
        self.set_radio(EDGE, b"1")
        ptt.operate({"operation": "stop"})
        self.start(ptt, "lsb")
        self.assertEqual(self.port.tx, 1)

    def test_unknown_mode_refuses_a_new_key_up(self):
        ptt = self.controller()
        self.set_radio(14_200_000, b"0")
        with self.assertRaises(PttError):
            self.start(ptt)
        self.assertNotIn(b"TX1;", self.port.writes)
        self.assertEqual(ptt.tune_refusal(), "ptt_out_of_band_unknown")

    def test_crossing_while_keyed_unkeys_once_and_logs_once(self):
        ptt = self.controller()
        self.set_radio(14_340_000)
        lease = self.start(ptt)["lease_id"]
        self.clock.now += 0.5
        ptt.operate({"operation": "renew", "lease_id": lease})
        self.set_radio(EDGE)
        with self.assertLogs("bricoham.station_agent.txsafety", "WARNING") as logs:
            with self.assertRaisesRegex(PttError, "ptt_out_of_band"):
                ptt.operate({"operation": "renew", "lease_id": lease})
        self.assertEqual(len(logs.records), 1)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.port.writes.count(b"TX0;"), 2)  # arm + the single unkey
        with self.assertRaisesRegex(PttError, "lease_expired"):
            ptt.operate({"operation": "renew", "lease_id": lease})
        ptt._expire()
        self.assertEqual(self.port.writes.count(b"TX0;"), 2)

    def test_ptt_off_preempts_even_when_out_of_band(self):
        ptt = self.controller()
        self.set_radio(14_340_000)
        self.start(ptt)
        self.set_radio(EDGE)
        ptt.operate({"operation": "stop"})
        self.assertEqual(self.port.tx, 0)

    def test_tune_is_checked_once_with_the_operator_mode_and_temporary_cw_l_is_ignored(self):
        ptt = self.controller()
        self.set_radio(14_340_000, b"2")
        self.assertIsNone(ptt.tune_refusal())
        reads = self.port.writes.count(b"IF;")
        # The FTX-1 switches to CW-L during an ATAS tune: nothing reads or judges it afterwards.
        self.set_radio(14_340_000, b"7")
        self.clock.now += 5
        ptt._expire()
        self.assertEqual(self.port.writes.count(b"IF;"), reads)
        self.assertEqual(ptt.snapshot()["tx_inhibit"]["state"], "inside")
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.cat.read("FA")["frequency_hz"], 14_340_000)  # channel released
        self.set_radio(EDGE, b"2")
        self.assertEqual(ptt.tune_refusal(), "ptt_out_of_band")
        self.assertNotIn(b"TX1;", self.port.writes)


class OrphanCoverageTests(PttFixture):
    """The Python agent has no separate orphan watch: every orphan case is already unkeyed by _expire."""

    def test_lease_expiry_unkeys_exactly_once(self):
        ptt = self.controller(ranges=())
        self.start(ptt)
        self.clock.now += 1.9
        ptt._expire()
        self.assertEqual(self.port.tx, 1)
        self.clock.now += 0.2
        ptt._expire()
        ptt._expire()
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.port.writes.count(b"TX0;"), 2)

    def test_maximum_transmit_cap_unkeys_despite_renewals(self):
        ptt = self.controller(ranges=(), max_seconds=2)
        lease = self.start(ptt)["lease_id"]
        for _ in range(5):
            self.clock.now += 0.6
            try:
                ptt.operate({"operation": "renew", "lease_id": lease})
            except PttError:
                break
        else:
            self.fail("the cap never ended the transmission")
        self.assertEqual(self.port.tx, 0)

    def test_revoked_guest_is_unkeyed_by_the_watchdog_path(self):
        ptt = self.controller(ranges=())
        self.start(ptt, "g", PttOperator("guest", "guest-1", GUEST))
        self.assertEqual(self.port.tx, 1)
        self.revoked.add("guest-1")
        ptt._expire()
        self.assertEqual(self.port.tx, 0)
        ptt._expire()
        self.assertEqual(self.port.writes.count(b"TX0;"), 2)

    def test_failed_unkey_is_retried_until_rx_is_confirmed(self):
        ptt = self.controller(ranges=())
        self.start(ptt)
        self.port.ignore_stop = True
        self.clock.now += 3
        with self.assertRaises(Exception):
            ptt._expire()
        self.assertTrue(ptt._stop_failed)
        self.port.ignore_stop = False
        ptt._expire()
        self.assertEqual(self.port.tx, 0)
        self.assertFalse(ptt._stop_failed)

    def test_front_panel_transmission_is_never_touched(self):
        ptt = self.controller(ranges=())
        self.port.tx = 2
        before = list(self.port.writes)
        self.clock.now += 100
        ptt._expire()
        self.assertEqual(self.port.writes, before)
        self.assertEqual(self.port.tx, 2)


if __name__ == "__main__":
    unittest.main()
