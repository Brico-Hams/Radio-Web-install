import json
import threading
import unittest
from http.client import HTTPConnection

from test_accessories import FakeAmp, catalog

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_station_agent.accessories import StationAccessories
from bricoham_station_agent.server import StationAgentHTTPServer


class AccessoriesApiTests(unittest.TestCase):
    def setUp(self):
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        self.amp = FakeAmp()
        self.accessories = StationAccessories(
            catalog=catalog(),
            config={"amplifier": {"device": "test-amp", "operate_allowed": True}},
            amplifier=self.amp,
        )
        self.agent = StationAgentHTTPServer(
            0, TokenAuthenticator(self.tokens), lambda: [], accessories=self.accessories
        )
        self.thread = threading.Thread(target=self.agent.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.agent.shutdown()
        self.agent.server_close()
        self.thread.join(timeout=2)

    def request(self, method="GET", payload=None, role=Role.OPERATOR):
        client = HTTPConnection(*self.agent.server_address, timeout=5)
        try:
            client.request(
                method,
                "/api/v1/accessories",
                body=json.dumps(payload) if payload is not None else None,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.tokens[role]}",
                },
            )
            response = client.getresponse()
            return response.status, json.loads(response.read())
        finally:
            client.close()

    def test_snapshot_starts_in_standby_and_lists_pending_devices(self):
        status, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(body["amplifier"]["state"], "standby")
        pending = {row["id"] for row in body["support"] if row["status"] == "pendiente de fuente"}
        self.assertIn("elecraft-kpa500", pending)

    def test_operate_needs_band_then_standby_and_emergency_stop_return(self):
        self.assertEqual(self.request("POST", {"operation": "operate"})[0], 409)
        self.assertEqual(self.request("POST", {"operation": "band", "frequency_hz": 14_200_000})[0], 200)
        status, body = self.request("POST", {"operation": "operate"})
        self.assertEqual((status, body["amplifier"]["state"]), (200, "operate"))
        status, body = self.request("POST", {"operation": "emergency_stop"})
        self.assertEqual((status, body["amplifier"]["state"]), (200, "standby"))
        self.assertEqual(self.amp.calls[-1], ("operate", False))

    def test_server_close_forces_standby_and_bad_requests_are_rejected(self):
        self.request("POST", {"operation": "band", "frequency_hz": 7_100_000})
        self.request("POST", {"operation": "operate"})
        self.assertEqual(self.request("POST", {"operation": "tune"})[0], 400)
        self.assertEqual(self.request("POST", {"operation": "band", "frequency_hz": True})[0], 400)
        self.assertEqual(self.request("POST", {"operation": "standby", "extra": 1})[0], 400)
        self.assertEqual(self.request("POST", {"operation": "standby"}, role=Role.LISTENER)[0], 403)
        self.agent.shutdown()
        self.agent.server_close()
        self.assertEqual(self.accessories.snapshot()["amplifier"]["state"], "standby")
        self.assertEqual(self.amp.calls[-1], ("operate", False))
        self.thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
