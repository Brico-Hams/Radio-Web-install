import unittest

from bricoham_remote_station.capabilities import (
    capability_catalog,
    ftx1_capabilities,
    qmx_plus_capabilities,
    trusdx_capabilities,
)
from bricoham_remote_station.contracts import CapabilityStatus


class CapabilityRegistryTests(unittest.TestCase):
    def test_ftx1_features_are_not_claimed_as_hardware_verified(self) -> None:
        capabilities = ftx1_capabilities()
        for capability in capabilities:
            with self.subTest(function=capability.function):
                self.assertEqual(
                    capability.status,
                    CapabilityStatus.EXPERIMENTAL
                    if capability.function
                    in (
                        "cat_read",
                        "cat_write",
                        "rx_audio",
                        "tx_audio",
                        "spa1_control",
                        "remote_ptt",
                    )
                    else CapabilityStatus.UNSUPPORTED,
                )
                self.assertIsNone(capability.hardware_used)
                self.assertIsNone(capability.validated_at)
                if capability.source_document is not None:
                    self.assertTrue(capability.source_document.startswith("https://"))

        cat_read = next(item for item in capabilities if item.function == "cat_read")
        self.assertIn("Hz", cat_read.implementation)
        self.assertIn("2508-C.pdf", cat_read.source_document)

    def test_native_scope_functions_are_explicitly_unavailable(self) -> None:
        capabilities = {item.function: item for item in ftx1_capabilities()}
        for function in ("native_spectrum", "native_waterfall"):
            with self.subTest(function=function):
                self.assertEqual(capabilities[function].status, CapabilityStatus.UNSUPPORTED)
                self.assertIsNone(capabilities[function].hardware_used)

        self.assertIn(
            "no demuestra un flujo", " ".join(capabilities["native_spectrum"].limitations)
        )

    def test_transmit_capability_remains_experimental_without_hardware_validation(self) -> None:
        capabilities = {item.function: item for item in ftx1_capabilities()}
        self.assertEqual(capabilities["remote_ptt"].status, CapabilityStatus.EXPERIMENTAL)

    def test_catalog_is_versioned_and_keeps_simulated_claims_separate(self) -> None:
        catalog = capability_catalog()
        self.assertEqual(catalog["schema_version"], "1.0")
        self.assertEqual(catalog["api_version"], "v1")
        self.assertFalse(catalog["hardware_validation_complete"])
        self.assertEqual(len(catalog["models"]), 3)

    def test_trusdx_and_qmx_plus_are_candidates_not_claimed_support(self) -> None:
        for capability in (*trusdx_capabilities(), *qmx_plus_capabilities()):
            with self.subTest(model=capability.model, function=capability.function):
                self.assertEqual(
                    capability.status,
                    CapabilityStatus.EXPERIMENTAL
                    if capability.function in ("cat_read", "rx_audio")
                    else CapabilityStatus.UNSUPPORTED,
                )
                self.assertIsNone(capability.hardware_used)
                self.assertIsNone(capability.validated_at)

        trusdx_cat = next(item for item in trusdx_capabilities() if item.function == "cat_read")
        self.assertIn("codec", trusdx_cat.implementation.casefold())
        self.assertIn("opt-in", trusdx_cat.implementation)

        trusdx_ptt = next(item for item in trusdx_capabilities() if item.function == "remote_ptt")
        self.assertIn("RTS", " ".join(trusdx_ptt.limitations))


if __name__ == "__main__":
    unittest.main()
