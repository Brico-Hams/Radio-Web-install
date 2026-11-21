import json
import sqlite3
import tempfile
import threading
import unittest
from contextlib import closing
from http.client import HTTPConnection
from pathlib import Path
from unittest.mock import patch

from bricoham_remote_station.logbook import ExportLimitError, Qso, read_qsos
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator

QSO = {
    "call": "ea1abc/p",
    "started_at": "2026-11-20T14:15:16+01:00",
    "frequency_hz": 14_074_001,
    "mode": "USB",
}


class LogbookApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.database = Path(self.directory.name) / "logbook.sqlite3"
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        self.server = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            TokenAuthenticator(self.tokens),
            DeterministicSimulator(),
            logbook_database=self.database,
        )
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.start()

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.directory.cleanup()

    def request(
        self, method="GET", path="/api/v1/logbook", role=Role.ADMIN, body=None, extra_headers=None
    ):
        headers = {"Content-Type": "application/json"}
        if role is not None:
            headers["Authorization"] = f"Bearer {self.tokens[role]}"
        headers.update(extra_headers or {})
        connection = HTTPConnection(*self.server.server_address, timeout=5)
        try:
            connection.request(method, path, body=body, headers=headers)
            response = connection.getresponse()
            return response.status, response.read(), dict(response.getheaders())
        finally:
            connection.close()

    def test_create_persists_normalizes_and_exports_without_simulator_data(self) -> None:
        status, body, _ = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["qsos"], [])
        status, body, _ = self.request("POST", body=json.dumps(QSO), role=Role.OPERATOR)
        self.assertEqual(status, 201)
        self.assertGreater(json.loads(body)["qso_id"], 0)
        self.assertEqual(
            read_qsos(self.database),
            (Qso("EA1ABC/P", "2026-11-20T13:15:16+00:00", 14_074_001, "USB"),),
        )
        status, body, headers = self.request(path="/api/v1/logbook/adif", role=Role.LISTENER)
        self.assertEqual(status, 200)
        self.assertIn(b"<FREQ:9>14.074001 <MODE:3>SSB <SUBMODE:3>USB", body)
        self.assertIn("attachment;", headers["Content-Disposition"])

    def test_roles_and_authentication_protect_contact_data(self) -> None:
        for path in ("/api/v1/logbook", "/api/v1/logbook/adif"):
            self.assertEqual(self.request(path=path, role=None)[0], 401)
            self.assertEqual(self.request(path=path, role=Role.GUEST)[0], 403)
        status, body, _ = self.request(role=Role.LISTENER)
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(body)["can_write"])
        for role, expected in ((None, 401), (Role.GUEST, 403), (Role.LISTENER, 403)):
            self.assertEqual(self.request("POST", body=json.dumps(QSO), role=role)[0], expected)
        self.assertEqual(read_qsos(self.database), ())

    def test_operator_can_store_and_export_explicit_ft4_contact(self) -> None:
        status, _, _ = self.request(
            "POST", body=json.dumps({**QSO, "mode": "FT4"}), role=Role.OPERATOR
        )
        self.assertEqual(status, 201)
        status, body, _ = self.request(role=Role.LISTENER)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["qsos"][0]["mode"], "FT4")
        status, body, _ = self.request(path="/api/v1/logbook/adif", role=Role.LISTENER)
        self.assertEqual(status, 200)
        self.assertIn(b"<MODE:4>MFSK <SUBMODE:3>FT4", body)

    def test_rejects_bad_fields_types_lengths_origins_and_content_types(self) -> None:
        for payload in (
            {**QSO, "call": None},
            {**QSO, "mode": 1},
            {**QSO, "frequency_hz": True},
            {**QSO, "frequency_hz": 2**64},
            {**QSO, "started_at": "2026-11-20T14:15:16"},
            {**QSO, "call": "A" * 33},
            {**QSO, "unknown": "field"},
            [],
        ):
            with self.subTest(payload=payload):
                self.assertEqual(self.request("POST", body=json.dumps(payload))[0], 400)
        self.assertEqual(self.request("POST", body=b"\xff")[0], 400)
        self.assertEqual(self.request("POST", body="x" * 4097)[0], 413)
        self.assertEqual(
            self.request(
                "POST", body=json.dumps(QSO), extra_headers={"Content-Type": "text/plain"}
            )[0],
            415,
        )
        self.assertEqual(
            self.request(
                "POST", body=json.dumps(QSO), extra_headers={"Origin": "https://other.invalid"}
            )[0],
            403,
        )
        self.assertEqual(read_qsos(self.database), ())

    def test_pagination_is_bounded_and_invalid_parameters_fail(self) -> None:
        with closing(sqlite3.connect(self.database)) as connection, connection:
            connection.executemany(
                "INSERT INTO bricoham_qsos(call, started_at, frequency_hz, mode) VALUES(?,?,?,?)",
                [(f"EA{i}ABC", "2026-11-20T12:00:00+00:00", 7_000_000, "CW") for i in range(51)],
            )
        status, body, _ = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(len(json.loads(body)["qsos"]), 50)
        self.assertTrue(json.loads(body)["has_more"])
        _, body, _ = self.request(path="/api/v1/logbook?offset=50")
        self.assertEqual(json.loads(body)["qsos"][0]["call"], "EA50ABC")
        self.assertFalse(json.loads(body)["has_more"])
        for suffix in ("?offset=-1", "?offset=x", "?offset=0&offset=1", "?limit=1"):
            self.assertEqual(self.request(path="/api/v1/logbook" + suffix)[0], 400)

    def test_body_limit_accepts_exact_boundary_and_rejects_larger_body(self) -> None:
        body = json.dumps(QSO).ljust(4096)
        self.assertEqual(self.request("POST", body=body)[0], 201)
        self.assertEqual(self.request("POST", body=body + " ")[0], 413)
        self.assertEqual(len(read_qsos(self.database)), 1)

    def test_unconfigured_storage_failure_and_export_limit_are_explicit(self) -> None:
        self.server.logbook_database = None
        self.assertEqual(self.request()[0], 503)
        self.assertEqual(self.request("POST", body=json.dumps(QSO))[0], 503)
        self.server.logbook_database = self.database
        with patch("bricoham_remote_station.server.export_adif", side_effect=ExportLimitError):
            self.assertEqual(self.request(path="/api/v1/logbook/adif")[0], 413)
        with (
            patch("bricoham_remote_station.server.read_qsos", side_effect=sqlite3.OperationalError),
            self.assertLogs("bricoham.coordinator", level="ERROR"),
        ):
            status, body, _ = self.request()
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body)["error"]["code"], "logbook_storage_error")


if __name__ == "__main__":
    unittest.main()
