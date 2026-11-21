import argparse
import copy
import json
import logging
import sqlite3
import tempfile
import threading
import time
import unittest
from contextlib import closing
from http.client import HTTPConnection
from pathlib import Path
from unittest.mock import patch

from bricoham_remote_station.diagnostic_reports import (
    REPORT_PATH,
    DiagnosticRuntime,
    DiagnosticStore,
    configure_diagnostics,
    validate_report,
)
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator


def report():
    return {
        "schema_version": 1,
        "component": "station-agent",
        "version": "0.1.0",
        "platform": "windows",
        "events": [
            {
                "code": "operation_failed",
                "source": "cat",
                "severity": "error",
                "error_type": "protocol",
                "line": 123,
            }
        ],
    }


class DiagnosticTests(unittest.TestCase):
    def test_corrupt_stored_reports_are_rejected_instead_of_returning_private_data(self):
        with tempfile.TemporaryDirectory() as directory:
            store = DiagnosticStore(Path(directory) / "reports.sqlite3")
            store.add(report())
            with closing(store._connect()) as connection, connection:
                connection.execute(
                    "UPDATE diagnostic_reports SET report=?", ('{"token":"private"}',)
                )
            with self.assertRaises(sqlite3.DatabaseError):
                store.read()

    def test_outgoing_credential_cannot_reuse_radio_authority(self):
        args = argparse.Namespace(
            diagnostics_opt_in=True,
            diagnostics_url="https://collector.example",
            diagnostics_ca=None,
            diagnostic_directory=Path("unused"),
        )
        with patch.dict(
            "os.environ",
            {
                "BRICOHAM_DIAGNOSTICS_TOKEN": "d" * 32,
                "BRICOHAM_OPERATOR_TOKEN": "d" * 32,
            },
        ):
            with self.assertRaisesRegex(ValueError, "must_not_reuse"):
                configure_diagnostics(args, "station-agent")

    def test_close_drains_more_than_one_local_batch(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = DiagnosticRuntime("station-agent", Path(directory))
            for _ in range(50):
                runtime.record("operation_failed", "cat", "error")
            runtime.close()
            self.assertEqual(
                sum(len(item["report"]["events"]) for item in runtime.store.read()), 51
            )

    def test_unknown_fields_values_and_private_payloads_are_rejected(self):
        self.assertEqual(validate_report(report()), report())
        for mutate in [
            lambda value: value.update(token="secret", callsign="EA5XYZ"),
            lambda value: value["events"][0].update(message="COM9 user@station password"),
            lambda value: value["events"][0].update(source="EA5XYZ"),
            lambda value: value["events"][0].update(line=True),
            lambda value: value.update(schema_version=True),
            lambda value: value.update(events=[]),
            lambda value: value.update(events=value["events"] * 17),
        ]:
            value = report()
            mutate(value)
            with self.assertRaises(ValueError):
                validate_report(value)

    def test_local_log_drops_messages_arguments_paths_and_exception_values(self):
        with tempfile.TemporaryDirectory() as directory:
            with DiagnosticRuntime("station-agent", Path(directory)) as runtime:
                record = logging.LogRecord(
                    "bricoham.cat",
                    logging.ERROR,
                    r"C:\Users\private\cat.py",
                    17,
                    "secret=%s callsign=%s",
                    ("TOKEN_NOT_FOR_REPORT", "EA5XYZ"),
                    (ValueError, ValueError("https://user:password@station"), None),
                )
                runtime.emit(record)
                runtime.flush_local()
                runtime.close()
                stored = json.dumps(runtime.store.read())
                for secret in ("TOKEN_NOT_FOR_REPORT", "EA5XYZ", "private", "password", "https"):
                    self.assertNotIn(secret, stored)
                self.assertIn('"line": 17', stored)
                self.assertIn('"error_type": "input"', stored)

    def test_disabled_upload_never_opens_network_and_urls_cannot_contain_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("bricoham_remote_station.diagnostic_reports.HTTPSConnection") as connection:
                with DiagnosticRuntime(
                    "station-agent", Path(directory), url="https://collector.example"
                ) as runtime:
                    self.assertFalse(runtime.flush_remote())
                    connection.assert_not_called()
            for url in (
                "http://collector.example",
                "https://user:secret@collector.example",
                "https://collector.example/path",
                "https://collector.example?token=secret",
            ):
                with self.assertRaises(ValueError):
                    DiagnosticRuntime("station-agent", Path(directory), url=url)

    def test_slow_storage_does_not_block_radio_thread_logging(self):
        with tempfile.TemporaryDirectory() as directory:
            with DiagnosticRuntime("station-agent", Path(directory)) as runtime:
                entered, release = threading.Event(), threading.Event()
                original = runtime.store.add

                def slow_store(value):
                    entered.set()
                    if not release.wait(3):
                        raise TimeoutError("test store not released")
                    original(value)

                with patch.object(runtime.store, "add", side_effect=slow_store):
                    runtime.record("operation_failed", "ptt", "error")
                    self.assertTrue(entered.wait(1))
                    start = time.monotonic()
                    runtime.record("operation_failed", "ptt", "error")
                    self.assertLess(time.monotonic() - start, 0.1)
                    release.set()

    def test_store_caps_history_expires_old_reports_and_clears_only_diagnostics(self):
        with tempfile.TemporaryDirectory() as directory:
            store = DiagnosticStore(Path(directory) / "reports.sqlite3")
            with patch("bricoham_remote_station.diagnostic_reports.MAX_REPORTS", 3):
                for _ in range(5):
                    store.add(report())
                self.assertEqual(len(store.read()), 3)
            with patch(
                "bricoham_remote_station.diagnostic_reports.time.time",
                return_value=time.time() + 8 * 86400,
            ):
                self.assertEqual(store.read(), [])
            store.add(report())
            store.clear()
            self.assertEqual(store.read(), [])

    def test_collector_requires_roles_and_origin_and_never_accepts_private_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            auth = TokenAuthenticator(
                {
                    Role.ADMIN: "a" * 32,
                    Role.DIAGNOSTIC_REPORTER: "r" * 32,
                    Role.GUEST: "g" * 32,
                }
            )
            with CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                auth,
                DeterministicSimulator(),
                diagnostic_report_database=Path(directory) / "collector.sqlite3",
            ) as server:
                worker = threading.Thread(target=server.serve_forever, daemon=True)
                worker.start()

                def request(token, method="POST", value=None, origin=None):
                    connection = HTTPConnection(*server.server_address, timeout=3)
                    try:
                        headers = {"Content-Type": "application/json"}
                        if token:
                            headers["Authorization"] = f"Bearer {token}"
                        if origin:
                            headers["Origin"] = origin
                        connection.request(
                            method,
                            REPORT_PATH,
                            json.dumps(value or report()) if method == "POST" else None,
                            headers,
                        )
                        response = connection.getresponse()
                        return response.status, json.loads(response.read())
                    finally:
                        connection.close()

                try:
                    self.assertEqual(request(None)[0], 401)
                    self.assertEqual(request("g" * 32)[0], 403)
                    self.assertEqual(request("r" * 32, origin="https://foreign.example")[0], 403)
                    self.assertEqual(request("r" * 32), (202, {"accepted": True}))
                    private = copy.deepcopy(report())
                    private["events"][0]["message"] = "EA5XYZ secret"
                    self.assertEqual(request("r" * 32, value=private)[0], 400)
                    self.assertEqual(request("r" * 32, method="GET")[0], 403)
                    status, result = request("a" * 32, method="GET")
                    self.assertEqual(status, 200)
                    self.assertEqual(len(result["reports"]), 1)
                    self.assertNotIn("secret", json.dumps(result))
                finally:
                    server.shutdown()
                    worker.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
