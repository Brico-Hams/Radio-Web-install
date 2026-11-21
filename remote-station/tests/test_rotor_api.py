import json
import threading
import unittest
from http.client import HTTPConnection

from test_rotor import RotorBroker

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.rotor import RotorConfig, RotorController
from bricoham_station_agent.server import StationAgentHTTPServer


class RotorApiTests(unittest.TestCase):
    def setUp(self):
        self.broker = RotorBroker()
        self.rotor = RotorController(
            RotorConfig(
                self.broker.server_address[1],
                "Rotator test",
                0,
                360,
                0,
                0,
                True,
            )
        )
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        auth = TokenAuthenticator(self.tokens)
        self.agent = StationAgentHTTPServer(0, auth, lambda: [], rotor=self.rotor)
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
        self.broker.stop()

    def request(
        self,
        *,
        payload=None,
        role=Role.OPERATOR,
        direct=False,
        method="GET",
        path="/api/v1/rotor",
        headers=None,
        raw=None,
    ):
        server = self.agent if direct else self.host
        client = HTTPConnection(*server.server_address, timeout=5)
        try:
            client.request(
                method,
                path,
                body=raw
                if raw is not None
                else (json.dumps(payload) if payload is not None else None),
                headers={
                    "Content-Type": "application/json",
                    **({"Authorization": f"Bearer {self.tokens[role]}"} if role else {}),
                    **(headers or {}),
                },
            )
            response = client.getresponse()
            return response.status, json.loads(response.read())
        finally:
            client.close()

    def test_host_agent_broker_chain_moves_renews_and_stops_without_simulation(self):
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.broker.commands, [])
        self.assertEqual(
            self.request(path="/api/v1/rotor?command=position")[1]["position"],
            {
                "azimuth_deg": 20,
                "elevation_deg": 0,
            },
        )
        status, result = self.request(
            method="POST",
            payload={
                "operation": "move",
                "request_id": "rotor-api-request-0001",
                "azimuth_deg": 100,
                "elevation_deg": 0,
            },
        )
        self.assertEqual(status, 200)
        self.assertFalse(result["data_is_simulated"])
        self.assertEqual(self.broker.position, (100, 0))
        self.assertEqual(
            self.request(
                method="POST",
                payload={
                    "operation": "renew",
                    "lease_id": result["lease_id"],
                },
            )[0],
            200,
        )
        self.assertFalse(
            self.request(
                method="POST",
                payload={
                    "operation": "stop",
                },
            )[1]["lease_active"]
        )

    def test_both_services_authorize_before_any_backend_io(self):
        for direct in (True, False):
            for role, expected in ((None, 401), (Role.LISTENER, 403), (Role.GUEST, 403)):
                for method in ("GET", "POST"):
                    self.assertEqual(
                        self.request(
                            direct=direct,
                            role=role,
                            method=method,
                            payload={"operation": "stop"},
                        )[0],
                        expected,
                    )
        self.assertEqual(self.broker.commands, [])

    def test_invalid_bodies_origins_commands_and_limits_never_reach_controller(self):
        for direct in (True, False):
            self.assertEqual(
                self.request(
                    direct=direct,
                    method="POST",
                    payload={
                        "operation": "move",
                        "request_id": "rotor-api-invalid-0001",
                        "azimuth_deg": 361,
                        "elevation_deg": 0,
                    },
                )[0],
                400,
            )
            self.assertEqual(self.request(direct=direct, method="POST", raw="{")[0], 400)
            self.assertEqual(self.request(direct=direct, method="POST", raw=" " * 4097)[0], 413)
            self.assertEqual(
                self.request(direct=direct, path="/api/v1/rotor?command=reset")[0], 400
            )
        self.assertEqual(
            self.request(
                method="POST",
                payload={"operation": "stop"},
                headers={"Origin": "https://evil.test"},
            )[0],
            403,
        )
        self.assertEqual(self.broker.commands, [])

    def test_busy_expired_and_unconfigured_errors_remain_explicit(self):
        payload = {
            "operation": "move",
            "request_id": "rotor-api-request-0001",
            "azimuth_deg": 100,
            "elevation_deg": 0,
        }
        self.assertEqual(self.request(method="POST", payload=payload)[0], 200)
        status, error = self.request(method="POST", payload=payload)
        self.assertEqual(status, 409)
        self.assertEqual(error["error"]["code"], "rotor_busy")
        self.request(method="POST", payload={"operation": "stop"})
        status, error = self.request(
            method="POST",
            payload={
                "operation": "renew",
                "lease_id": "stale",
            },
        )
        self.assertEqual(status, 409)
        self.assertEqual(error["error"]["code"], "rotor_lease_expired")
        self.agent.rotor = None
        try:
            status, error = self.request()
            self.assertEqual(status, 503)
            self.assertEqual(error["error"]["code"], "rotor_not_configured")
        finally:
            self.agent.rotor = self.rotor
