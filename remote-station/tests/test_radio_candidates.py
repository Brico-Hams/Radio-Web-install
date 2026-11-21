import unittest
from collections import Counter

from bricoham_remote_station.radio_candidates import (
    RADIO_CANDIDATE_SCHEMA_VERSION,
    radio_candidate_catalog,
    radio_candidates,
)


class RadioCandidateCatalogTests(unittest.TestCase):
    def test_catalog_contains_reference_owner_and_primary_elecraft_candidates(self) -> None:
        catalog = radio_candidate_catalog()
        candidates = radio_candidates()
        self.assertEqual(catalog["api_version"], "v1")
        self.assertEqual(catalog["schema_version"], RADIO_CANDIDATE_SCHEMA_VERSION)
        self.assertFalse(catalog["hardware_validation_complete"])
        self.assertEqual(len(candidates), 49)
        self.assertEqual(
            Counter(candidate.evidence_source for candidate in candidates),
            {"third_party_listing": 44, "manufacturer_project_docs": 5},
        )
        self.assertEqual(
            Counter(candidate.manufacturer for candidate in candidates),
            {
                "Icom": 17,
                "FlexRadio": 13,
                "Kenwood": 4,
                "Yaesu": 7,
                "Elecraft": 5,
                "Hermes Lite": 1,
                "DL2MAN": 1,
                "QRP Labs": 1,
            },
        )
        self.assertIn("(tr)uSDX", {candidate.model for candidate in candidates})
        self.assertIn("QMX+", {candidate.model for candidate in candidates})

    def test_candidate_models_are_unique_and_not_claimed_as_supported(self) -> None:
        candidates = radio_candidates()
        identities = [(candidate.manufacturer, candidate.model) for candidate in candidates]
        self.assertEqual(len(identities), len(set(identities)))
        for candidate in candidates:
            with self.subTest(model=candidate.model):
                self.assertEqual(candidate.bricoham_status, "candidate")
                self.assertTrue(candidate.source_url.startswith("https://"))

    def test_third_party_testing_claims_are_not_promoted_to_bricoham_validation(self) -> None:
        candidates = radio_candidates()
        third_party_tested = {
            candidate.model for candidate in candidates if candidate.third_party_tested == "yes"
        }
        beta_models = {
            candidate.manufacturer
            for candidate in candidates
            if candidate.third_party_support_status == "beta"
        }
        self.assertEqual(
            third_party_tested,
            {"IC-705", "IC-7300MK2", "IC-7610", "FLEX-6600"},
        )
        self.assertEqual(beta_models, {"Kenwood", "Yaesu", "Elecraft", "Hermes Lite"})
        self.assertTrue(all(candidate.bricoham_status == "candidate" for candidate in candidates))


if __name__ == "__main__":
    unittest.main()
