import json
import threading
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

from test_serial_cat import ScriptedPort

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.server import StationAgentHTTPServer

# Burst layout from third_party/ftx1/rigplane-rigplane-core docs/api/scope.md and IC-705 CI-V guide p.28.
BURST = bytes.fromhex("fefee094270000" "0101" "01" "0040071400" "0050020000" "00" "0908" "fd")


class ScopeProxyTests(unittest.TestCase):
    def start(self, model: str, response: bytes) -> None:
        self.port = ScriptedPort(response)
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(CatConfig(model, "COM_TEST", 115200))
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        auth = TokenAuthenticator(self.tokens)
        self.agent = StationAgentHTTPServer(0, auth, lambda: [], cat=self.cat)
        self.host = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            auth,
            DeterministicSimulator(),
            station_agent_port=self.agent.server_address[1],
        )
        threads = []
        for server in (self.agent, self.host):
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            threads.append(thread)

        def stop() -> None:
            for server in (self.host, self.agent):
                server.shutdown()
                server.server_close()
            for thread in threads:
                thread.join(timeout=2)

        self.addCleanup(stop)

    def get(self, path: str, role: Role = Role.OPERATOR) -> tuple[int, bytes]:
        connection = HTTPConnection(*self.host.server_address, timeout=5)
        try:
            connection.request("GET", path, headers={"Authorization": f"Bearer {self.tokens[role]}"})
            response = connection.getresponse()
            return response.status, response.read()
        finally:
            connection.close()

    def test_coordinator_streams_scope_frames_and_switches_the_output_off(self) -> None:
        self.start("IC-7300", BURST)
        status, body = self.get("/api/v1/cat/scope?seconds=0.3&fps=10")
        self.assertEqual(status, 200)
        first = json.loads(body.splitlines()[0])
        self.assertEqual((first["start_hz"], first["end_hz"], first["pixels"]), (14074000, 25000, [9, 8]))
        self.assertEqual(self.port.writes[-1], bytes.fromhex("fefe94e02711" "00fd"))

    def test_scope_needs_a_sourced_radio_the_right_role_and_a_valid_query(self) -> None:
        self.start("K4", b"")
        status, body = self.get("/api/v1/cat/scope")
        self.assertEqual((status, json.loads(body)["error"]["code"]), (501, "cat_scope_not_sourced"))
        self.assertEqual(self.get("/api/v1/cat/scope", Role.LISTENER)[0], 403)
        self.assertEqual(self.get("/api/v1/cat/scope?seconds=99")[0], 400)
        self.assertEqual(self.get("/api/v1/cat/scope?other=1")[0], 400)
        self.assertEqual(self.port.writes, [])


if __name__ == "__main__":
    unittest.main()
