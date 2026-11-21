import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from bricoham_remote_station.logbook import (
    ExportLimitError,
    Qso,
    add_qso,
    export_adif,
    main,
    read_qsos,
)


class LogbookTests(unittest.TestCase):
    def test_qso_is_persistent_normalized_and_exported_with_correct_units(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "logbook.sqlite3"
            identifier = add_qso(
                database, Qso("ea1abc/p", "2026-11-20T14:15:16+01:00", 14_074_001, "USB")
            )
            self.assertGreater(identifier, 0)
            self.assertEqual(
                read_qsos(database),
                (Qso("EA1ABC/P", "2026-11-20T13:15:16+00:00", 14_074_001, "USB"),),
            )
            adif = export_adif(database)
            self.assertIn("<CALL:8>EA1ABC/P", adif)
            self.assertIn("<QSO_DATE:8>20261120 <TIME_ON:6>131516", adif)
            self.assertIn("<FREQ:9>14.074001 <MODE:3>SSB <SUBMODE:3>USB", adif)
            self.assertEqual(adif.count("<EOR>"), 1)

    def test_invalid_inputs_fail_before_creating_a_database(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "logbook.sqlite3"
            for qso in (
                Qso("EA1ABC", "2026-11-20T12:00:00", 14_074_000, "CW"),
                Qso("EA1ABC'; DROP TABLE x;", "2026-11-20T12:00:00Z", 14_074_000, "CW"),
                Qso("EA1ABC", "2026-11-20T12:00:00Z", -1, "CW"),
                Qso("EA1ABC", "2026-11-20T12:00:00Z", 14_074_000, "DATA"),
            ):
                with self.subTest(qso=qso), self.assertRaises(ValueError):
                    add_qso(database, qso)
                self.assertFalse(database.exists())

    def test_export_is_read_only_and_orders_qsos_by_utc_time(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "logbook.sqlite3"
            add_qso(database, Qso("EA2ABC", "2026-11-20T14:00:00Z", 7_000_000, "CW"))
            add_qso(database, Qso("EA1ABC", "2026-11-20T14:00:00+01:00", 14_074_000, "FT8"))
            before = database.read_bytes()
            adif = export_adif(database)
            self.assertLess(adif.index("EA1ABC"), adif.index("EA2ABC"))
            self.assertIn("<FREQ:1>7", adif)
            self.assertEqual(before, database.read_bytes())

    def test_missing_database_returns_explicit_cli_error(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "missing.sqlite3"
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                main(["--database", str(database), "list"])
            self.assertEqual(error.exception.code, 2)
            self.assertFalse(database.exists())

    def test_web_export_limit_does_not_limit_cli_export(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "logbook.sqlite3"
            for call in ("EA1ABC", "EA2ABC"):
                add_qso(database, Qso(call, "2026-11-20T12:00:00Z", 7_000_000, "CW"))
            with self.assertRaises(ExportLimitError):
                export_adif(database, max_records=1)
            self.assertEqual(export_adif(database).count("<EOR>"), 2)
            self.assertEqual(read_qsos(database, limit=1, offset=1)[0].call, "EA2ABC")


if __name__ == "__main__":
    unittest.main()
