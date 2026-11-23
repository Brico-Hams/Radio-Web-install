import unittest

from bricoham_remote_station.feature_parity import feature_parity_catalog


class FeatureParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = feature_parity_catalog()
        cls.radios = {radio["id"]: radio for radio in cls.catalog["radios"]}

    def test_every_radio_lists_every_feature_with_a_valid_status(self) -> None:
        order = self.catalog["feature_order"]
        self.assertGreater(len(order), 0)
        for radio in self.radios.values():
            self.assertEqual(list(radio["features"]), order)

    def test_supported_radio_enables_its_transmit_path(self) -> None:
        ftx1 = self.radios["yaesu-ftx-1"]
        self.assertEqual(ftx1["label"], "Yaesu FTX-1")
        for feature in ("freqMode", "ptt", "txMeters", "tune", "audioTx"):
            self.assertEqual(ftx1["features"][feature]["status"], "ok")

    def test_partial_radio_carries_a_reason(self) -> None:
        beta = self.radios["icom-ic-7300mk2"]["features"]
        self.assertEqual(beta["ptt"]["status"], "partial")
        self.assertTrue(beta["ptt"]["reason"])

    def test_receive_only_radio_has_no_transmit_features(self) -> None:
        receiver = self.radios["icom-ic-r8600"]["features"]
        for feature in ("ptt", "txMeters", "tune", "audioTx", "accessories"):
            self.assertEqual(receiver[feature]["status"], "na")
        self.assertEqual(receiver["audioRx"]["status"], "ok")

    def test_pending_features_explain_why(self) -> None:
        for radio in self.radios.values():
            for name, feature in radio["features"].items():
                if feature["status"] == "pendiente":
                    self.assertTrue(feature["reason"], f"{radio['id']}.{name}")


if __name__ == "__main__":
    unittest.main()
