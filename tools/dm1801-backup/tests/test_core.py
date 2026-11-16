import os
import stat
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from dm1801_backup import core  # noqa: E402

FAKE = Path(__file__).with_name("fake_dmrconfig.py")


def fake(mode: str) -> list[str]:
    os.environ["FAKE_MODE"] = mode
    return [sys.executable, str(FAKE)]


class BackupTests(unittest.TestCase):
    def test_success_hashes_and_manifest(self):
        with TemporaryDirectory() as d:
            res = core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("ok"))
            self.assertEqual({f.name for f in res.files}, {"device.img", "device.conf"})
            img = next(f for f in res.files if f.name == "device.img")
            self.assertEqual(img.size, 4 + 1024)
            self.assertEqual(img.sha256, core.sha256_file(res.folder / "device.img"))
            self.assertTrue((res.folder / "manifest.json").is_file())
            self.assertFalse(os.stat(res.folder / "device.img").st_mode & stat.S_IWRITE)

    def test_never_overwrites(self):
        with TemporaryDirectory() as d:
            a = core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("ok"))
            b = core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("ok"))
            self.assertNotEqual(a.folder, b.folder)
            self.assertTrue((a.folder / "device.img").exists())

    def test_radio_missing_cleans_up(self):
        with TemporaryDirectory() as d:
            with self.assertRaisesRegex(core.BackupError, "comunicar con la radio"):
                core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("noradio"), retry_delay=0)
            self.assertEqual(list(Path(d).iterdir()), [])

    def test_bad_header_rejected(self):
        with TemporaryDirectory() as d:
            with self.assertRaisesRegex(core.BackupError, "cabecera"):
                core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("badheader"))

    def test_missing_folder(self):
        with self.assertRaisesRegex(core.BackupError, "no existe"):
            core.run_backup(Path("Z:/no/existe/xyz"), command_prefix=fake("ok"))

    def test_only_read_flag(self):
        with TemporaryDirectory() as d:
            core.run_backup(Path(d), dmrconfig=FAKE, command_prefix=fake("args"))

    def test_vendored_binary_present(self):
        self.assertTrue(core.find_dmrconfig().is_file())

    def test_unavailable_components(self):
        self.assertEqual(set(core.UNAVAILABLE), {"Calibración", "Flash completa", "Firmware de fábrica"})


if __name__ == "__main__":
    unittest.main()
