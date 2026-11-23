import re
import unittest
from pathlib import Path

from bricoham_remote_station.android_agent import AndroidReadonlyAgent

READONLY_CAT = (
    Path(__file__).resolve().parents[2]
    / "android/station-agent/src/main/java/org/bricohams/stationagent/ReadonlyCat.kt"
)
# Host queries that the Android agent deliberately does not forward.
# Meter reads are served by the host agent only; the Android agent keeps its smaller allowlist.
EXCLUDED_HOST_QUERIES: frozenset[str] = frozenset(
    {"SM0", "SM1", "RM1", "RM2", "RM3", "RM4", "RM5", "RM6", "RM7", "RM8"}
)


class AndroidAllowlistContractTests(unittest.TestCase):
    def test_every_host_query_is_in_the_android_allowlist_or_explicitly_excluded(self):
        source = READONLY_CAT.read_text(encoding="utf-8")
        match = re.search(r"val commands = setOf\((.*?)\)", source, re.DOTALL)
        self.assertIsNotNone(match)
        android = set(re.findall(r'"([A-Z0-9]+)"', match.group(1)))
        host = set(AndroidReadonlyAgent().queries)
        self.assertEqual(host - EXCLUDED_HOST_QUERIES - android, set())


if __name__ == "__main__":
    unittest.main()
