import unittest

from bricoham_remote_station.simulator import DeterministicSimulator


class DeterministicSimulatorTests(unittest.TestCase):
    def test_snapshot_is_identified_as_simulated_and_not_hardware(self) -> None:
        snapshot = DeterministicSimulator().snapshot()
        self.assertEqual(snapshot["api_version"], "v1")
        self.assertTrue(snapshot["data_is_simulated"])
        self.assertFalse(snapshot["hardware_connected"])
        self.assertEqual(snapshot["source"], "deterministic_simulator")
        self.assertTrue(snapshot["radio_profile"]["profile_only"])

    def test_scope_is_unavailable_without_synthetic_samples(self) -> None:
        snapshot = DeterministicSimulator().snapshot()
        self.assertEqual(snapshot["spectrum"]["status"], "unsupported")
        self.assertIsNone(snapshot["spectrum"]["samples"])
        self.assertEqual(
            snapshot["spectrum"]["message"],
            "Espectro nativo no disponible: pendiente de validación del protocolo.",
        )
        self.assertEqual(snapshot["waterfall"]["status"], "unsupported")
        self.assertIsNone(snapshot["waterfall"]["data"])

    def test_transmission_stays_disabled(self) -> None:
        tx = DeterministicSimulator().snapshot()["tx"]
        self.assertFalse(tx["enabled"])
        self.assertFalse(tx["ptt_available"])
        self.assertEqual(tx["state"], "blocked")

    def test_snapshots_are_deterministic(self) -> None:
        simulator = DeterministicSimulator()
        self.assertEqual(simulator.snapshot(), simulator.snapshot())


if __name__ == "__main__":
    unittest.main()
