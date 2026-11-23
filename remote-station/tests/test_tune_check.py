import unittest

from bricoham_remote_station.tune_check import TuneCheck


def run_to_reading(check: TuneCheck) -> None:
    assert check.confirming() and check.entered() and check.finished()


class TuneCheckTests(unittest.TestCase):
    def test_success_needs_low_swr_and_tx_off_readback(self) -> None:
        check = TuneCheck(swr_limit=3)
        run_to_reading(check)
        self.assertTrue(check.final_swr(1.4))
        self.assertTrue(check.stopping())
        self.assertTrue(check.verified(True))
        self.assertEqual(check.result()["outcome"], "success")
        self.assertEqual(check.state, "done")

    def test_high_swr_fails(self) -> None:
        check = TuneCheck(swr_limit=3)
        run_to_reading(check)
        check.final_swr(3.5)
        check.stopping()
        check.verified(True)
        self.assertEqual((check.outcome, check.reason), ("fail", "swr-high"))

    def test_tx_still_on_is_never_success(self) -> None:
        check = TuneCheck()
        run_to_reading(check)
        check.final_swr(1.2)
        check.stopping()
        check.verified(False)
        self.assertEqual((check.outcome, check.reason), ("fail", "tx-stuck"))

    def test_time_cap_reports_timeout_and_first_cut_wins(self) -> None:
        check = TuneCheck()
        check.confirming()
        check.entered()
        self.assertTrue(check.cut("timeout", "time-cap"))
        self.assertFalse(check.cut("fail", "swr-trip"))
        check.final_swr(1.1)
        check.stopping()
        check.verified(True)
        self.assertEqual((check.outcome, check.reason), ("timeout", "time-cap"))

    def test_not_started_and_out_of_order_calls_do_not_raise(self) -> None:
        check = TuneCheck()
        self.assertFalse(check.entered())
        self.assertFalse(check.verified(True))
        check.confirming()
        self.assertTrue(check.not_started())
        self.assertEqual(check.reason, "not-started")
        self.assertFalse(check.cut("bogus", "x"))
        self.assertFalse(check.tick(5) and check.state == "done")

    def test_cut_after_stopping_cannot_erase_result(self) -> None:
        check = TuneCheck()
        run_to_reading(check)
        check.final_swr(1.3)
        check.stopping()
        self.assertFalse(check.cut("fail", "late"))
        check.verified(True)
        self.assertEqual(check.outcome, "success")


if __name__ == "__main__":
    unittest.main()
