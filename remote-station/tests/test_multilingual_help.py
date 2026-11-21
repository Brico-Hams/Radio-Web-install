import json
import unittest

from scripts.build_help import ROOT, generated_files


class MultilingualHelpTests(unittest.TestCase):
    def test_checked_in_help_and_offline_model_list_match_canonical_sources(self) -> None:
        for path, text in generated_files().items():
            with self.subTest(path=path.relative_to(ROOT)):
                self.assertEqual(path.read_text(encoding="utf-8"), text)
        profiles = json.loads(
            (ROOT / "apps" / "web-console" / "src" / "agent-profiles.json").read_text(
                encoding="utf-8"
            )
        )
        models = {profile["model"]: profile for profile in profiles}
        self.assertEqual(models["KX2"]["commands"], ["FA", "FB", "MD", "MD$", "BW", "BW$"])
        self.assertNotIn("IC-7800", models)
