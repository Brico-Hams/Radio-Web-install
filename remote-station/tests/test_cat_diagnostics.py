import contextlib
import io
import json
import unittest
from unittest.mock import patch

from bricoham_remote_station.cat_diagnostics import diagnostic_catalog, inspect_query, main


class CatDiagnosticsTests(unittest.TestCase):
    def test_cli_uses_real_decoders_without_connecting(self) -> None:
        output = io.StringIO()
        with (
            patch("socket.socket", side_effect=AssertionError("No conectar")),
            contextlib.redirect_stdout(output),
        ):
            status = main(
                [
                    "query",
                    "--model",
                    "K3S",
                    "--command",
                    "BW$",
                    "--reply-hex",
                    b"BW$0270;".hex(),
                ]
            )
        result = json.loads(output.getvalue())
        self.assertEqual(status, 0)
        self.assertEqual(result["bandwidth_hz"], 2700)
        self.assertEqual(result["request_hex"], b"BW$;".hex())
        self.assertFalse(result["transport_enabled"])
        self.assertEqual(result["hardware_status"], "unsupported")

    def test_hertz_frequency_and_raw_modes_are_not_conflated(self) -> None:
        k4 = inspect_query("K4", "FA", b"FA00014074000;")
        self.assertEqual(k4["frequency_hz"], 14_074_000)
        ftx = inspect_query("FTX-1", "FA", b"FA014250000;")
        self.assertEqual(ftx["frequency_hz"], 14_250_000)
        kenwood = inspect_query("TS-990S", "OM1", b"OM1D;")
        self.assertEqual(kenwood["raw_mode_reading"].mode_code, "D")

    def test_rejects_unknown_commands_missing_decoders_and_invalid_frames(self) -> None:
        for model, command, frame in (
            ("Unknown-1", "FA", None),
            ("K4", "TX", None),
            ("K4", "FA00014074000", None),
            ("TS-990S", "MD", None),
            ("K3S", "DT", b"DT2;"),
            ("K4", "FA", b"FB00014074000;"),
        ):
            with self.subTest(model=model, command=command), self.assertRaises(ValueError):
                inspect_query(model, command, frame)

    def test_cli_reports_hex_errors_with_nonzero_exit(self) -> None:
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            main(["query", "--model", "K4", "--command", "FA", "--reply-hex", "zz"])
        self.assertEqual(error.exception.code, 2)

    def test_icom_and_yaesu_profiles_bind_the_correct_model(self) -> None:
        icom = inspect_query("IC-7300", "03", bytes.fromhex("FEFEE094030040071400FD"))
        self.assertEqual(icom["frequency_hz"], 14_074_000)
        self.assertEqual(icom["request_hex"], "fefe94e003fd")
        for model, address in (("IC-7100", "88"), ("IC-7200", "76")):
            with self.subTest(model=model):
                result = inspect_query(
                    model,
                    "03",
                    bytes.fromhex(f"FEFEE0{address}030040071400FD"),
                )
                self.assertEqual(result["frequency_hz"], 14_074_000)
                self.assertEqual(result["request_hex"], f"fefe{address}e003fd")
        receiver = inspect_query("IC-R8600 (receiver)", "03")
        self.assertEqual(receiver["request_hex"], "fefe96e003fd")
        for model, frame in (
            ("FT-710", b"FA014074000;"),
            ("FTDX3000", b"FA14074000;"),
        ):
            with self.subTest(model=model):
                result = inspect_query(model, "FA", frame)
                self.assertEqual(result["frequency_hz"], 14_074_000)
        for model, command, frame in (
            ("IC-7610", "03", bytes.fromhex("FEFEE094030040071400FD")),
            ("FT-991A", "MD1", None),
            ("FTDX3000", "FA", b"FA014074000;"),
            ("FT-710", "ID", b"ID0670;"),
            ("IC-7800", "03", None),
        ):
            with self.subTest(model=model, command=command), self.assertRaises(ValueError):
                inspect_query(model, command, frame)

    def test_binary_mode_reply_is_json_serializable(self) -> None:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status = main(
                [
                    "query",
                    "--model",
                    "IC-7300",
                    "--command",
                    "04",
                    "--reply-hex",
                    "FEFEE094040102FD",
                ]
            )
        self.assertEqual(status, 0)
        self.assertEqual(json.loads(output.getvalue())["mode_code"], 1)

    def test_network_protocols_are_family_only_and_surface_radio_errors(self) -> None:
        response = inspect_query("FLEX-8600", "info", b"R1|0|model=FLEX-8600\n")
        self.assertEqual(response["request_hex"], b"C1|info\n".hex())
        self.assertEqual(response["binding_status"], "family_syntax_only")
        with self.assertRaisesRegex(ValueError, "SmartSDR"):
            inspect_query("FLEX-8600", "info", b"R1|50000015|invalid command\n")
        with self.assertRaises(ValueError):
            inspect_query("FLEX-8600", "info", b"R2|0|model=FLEX-8600\n")

    def test_catalog_does_not_turn_codec_coverage_into_hardware_support(self) -> None:
        catalog = diagnostic_catalog()
        self.assertFalse(catalog["hardware_validation_complete"])
        candidates = catalog["candidates"]
        self.assertEqual(len(candidates), 49)
        self.assertTrue(
            all(candidate["hardware_status"] == "unsupported" for candidate in candidates)
        )
        k3s = next(candidate for candidate in candidates if candidate["model"] == "K3S")
        dt = next(query for query in k3s["queries"] if query["command"] == "DT")
        self.assertFalse(dt["reply_decoder"])
        self.assertEqual(
            {
                candidate["model"]
                for candidate in candidates
                if candidate["binding_status"] == "unimplemented"
            },
            {"IC-7800"},
        )


if __name__ == "__main__":
    unittest.main()
