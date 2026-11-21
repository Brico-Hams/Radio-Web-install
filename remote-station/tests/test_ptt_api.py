import json
import threading
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

from test_ptt import PttPort

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.ptt import PttConfig, PttController
from bricoham_station_agent.server import StationAgentHTTPServer


class PttApiTests(unittest.TestCase):
    def setUp(self):
        self.port = PttPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        self.ptt = PttController(self.cat, PttConfig(True, 14_200_000, 14_300_000, 30, 5))
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        auth = TokenAuthenticator(self.tokens)
        self.agent = StationAgentHTTPServer(0, auth, lambda: [], cat=self.cat, ptt=self.ptt)
        self.host = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            auth,
            DeterministicSimulator(),
            station_agent_port=self.agent.server_address[1],
        )
        self.threads = []
        for server in (self.agent, self.host):
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            self.threads.append(thread)

    def tearDown(self):
        for server in (self.host, self.agent):
            server.shutdown()
            server.server_close()
        for thread in self.threads:
            thread.join(timeout=2)
            self.assertFalse(thread.is_alive())

    def request(
        self,
        payload=None,
        *,
        direct=False,
        role=Role.OPERATOR,
        headers=None,
        raw=None,
        path="/api/v1/ptt",
    ):
        server = self.agent if direct else self.host
        connection = HTTPConnection(*server.server_address, timeout=5)
        try:
            connection.request(
                "POST" if payload is not None or raw is not None else "GET",
                path,
                body=raw
                if raw is not None
                else json.dumps(payload)
                if payload is not None
                else None,
                headers={
                    "Content-Type": "application/json",
                    **({"Authorization": f"Bearer {self.tokens[role]}"} if role else {}),
                    **(headers or {}),
                },
            )
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_proxy_start_renew_stop_and_metadata_never_leak_lease(self):
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.port.writes, [])
        self.assertEqual(self.request({"operation": "stop"})[0], 200)
        status, started = self.request(
            {
                "operation": "start",
                "request_id": "http-ptt-start-request-0001",
            }
        )
        self.assertEqual(status, 200)
        self.assertTrue(started["lease_active"])
        self.assertEqual(self.port.tx, 1)
        for direct in (True, False):
            self.assertNotIn("lease_id", self.request(direct=direct)[1])
        self.assertEqual(
            self.request(
                {
                    "operation": "renew",
                    "lease_id": started["lease_id"],
                }
            )[0],
            200,
        )
        self.assertEqual(self.request({"operation": "stop"})[0], 200)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.port.writes.count(b"TX1;"), 1)

    def test_both_hops_authorize_roles_before_hardware_and_host_checks_origin(self):
        for direct in (False, True):
            for role, expected in ((None, 401), (Role.LISTENER, 403), (Role.GUEST, 403)):
                for payload in (None, {"operation": "stop"}):
                    self.assertEqual(self.request(payload, direct=direct, role=role)[0], expected)
        self.assertEqual(
            self.request(
                {"operation": "stop"},
                headers={"Origin": "https://untrusted.example"},
            )[0],
            403,
        )
        self.assertEqual(self.port.writes, [])

    def test_invalid_requests_and_delayed_start_cancellation_reach_no_tx_on(self):
        for direct in (True, False):
            self.assertEqual(self.request(direct=direct, path="/api/v1/ptt?x=1")[0], 400)
            for invalid in (
                {"operation": "start"},
                {"operation": "start", "request_id": "short"},
                {"operation": "stop", "enabled": True},
                {"operation": "renew", "lease_id": 1},
            ):
                self.assertEqual(self.request(invalid, direct=direct)[0], 400)
            self.assertEqual(self.request(raw="x" * 4097, direct=direct)[0], 413)
        self.assertEqual(self.port.writes, [])
        self.assertEqual(
            self.request(
                {
                    "operation": "stop",
                    "cancel_request_id": "http-ptt-cancel-request-0001",
                }
            )[0],
            200,
        )
        self.assertEqual(
            self.request(
                {
                    "operation": "start",
                    "request_id": "http-ptt-cancel-request-0001",
                }
            )[0],
            409,
        )
        self.assertNotIn(b"TX1;", self.port.writes)
