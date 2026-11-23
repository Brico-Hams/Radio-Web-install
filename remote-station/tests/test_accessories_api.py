import json
import threading
import unittest
from http.client import HTTPConnection
from types import SimpleNamespace

from test_accessories import FakeAmp, FakeTuner, catalog
from test_station_devices import FakeModbus

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_station_agent.accessories import StationAccessories
from bricoham_station_agent.cat import CatError
from bricoham_station_agent.server import StationAgentHTTPServer, cat_frequency_reader, ptt_transmitting
from bricoham_station_agent.station_devices import Outlet, PowerDevice


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


class StubPtt:
    def __init__(self):
        self.lease_active = False
        self.tune_refusal_code = None

    def tune_refusal(self):
        return self.tune_refusal_code

    def snapshot(self):
        return {"lease_active": self.lease_active}

    def close(self):
        pass


class TuneAndPowerApiTests(unittest.TestCase):
    def setUp(self):
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        self.tuner = FakeTuner()
        self.ptt = StubPtt()
        self.accessories = StationAccessories(
            catalog=catalog(),
            config={
                "amplifier": {"device": "test-amp", "operate_allowed": True},
                "tuner": {"device": "yaesu-ftx1-internal-atu"},
            },
            amplifier=FakeAmp(),
            tuner=self.tuner,
        )
        self.relay = FakeModbus()
        self.power = PowerDevice(
            "relays", "modbus", [Outlet("radio", 0, "radio"), Outlet("fan", 1)], self.relay,
            enabled=True, is_transmitting=lambda: ptt_transmitting(self.ptt),
        )
        self.agent = StationAgentHTTPServer(
            0, TokenAuthenticator(self.tokens), lambda: [],
            accessories=self.accessories, ptt=self.ptt, power=self.power,
        )
        self.thread = threading.Thread(target=self.agent.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.agent.shutdown()
        self.agent.server_close()
        self.thread.join(timeout=2)

    def call(self, path, method="GET", payload=None, token=None):
        client = HTTPConnection(*self.agent.server_address, timeout=5)
        try:
            headers = {"Content-Type": "application/json"}
            if token != "none":
                headers["Authorization"] = f"Bearer {token or self.tokens[Role.OPERATOR]}"
            client.request(method, path, body=json.dumps(payload) if payload is not None else None, headers=headers)
            response = client.getresponse()
            return response.status, json.loads(response.read())
        finally:
            client.close()

    def test_tune_goes_through_the_safety_rules_and_stops(self):
        path = "/api/v1/accessories"
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": 50})[1]["error"]["code"], "accessories_power_too_high")
        self.ptt.lease_active = True
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": 5})[1]["error"]["code"], "accessories_tx")
        self.ptt.lease_active = False
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": 5})[0], 200)
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": 5})[1]["error"]["code"], "accessories_busy")
        status, body = self.call(path, "POST", {"operation": "emergency_stop"})
        self.assertFalse(body["tuner"]["tuning"])
        self.assertEqual(self.tuner.calls, ["start", "stop"])
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": True})[0], 400)

    def test_tune_out_of_band_is_refused_before_the_tuner_is_started(self):
        path = "/api/v1/accessories"
        self.ptt.tune_refusal_code = "ptt_out_of_band"
        status, body = self.call(path, "POST", {"operation": "tune", "power_w": 5})
        self.assertEqual((status, body["error"]["code"]), (409, "accessories_tx_out_of_band"))
        self.assertEqual(self.tuner.calls, [])
        self.ptt.tune_refusal_code = None
        self.assertEqual(self.call(path, "POST", {"operation": "tune", "power_w": 5})[0], 200)

    def test_operate_refused_while_ptt_lease_is_held(self):
        path = "/api/v1/accessories"
        self.call(path, "POST", {"operation": "band", "frequency_hz": 14_200_000})
        self.ptt.lease_active = True
        self.assertEqual(self.call(path, "POST", {"operation": "operate"})[1]["error"]["code"], "accessories_tx")

    def test_power_route_is_authenticated_and_refuses_while_transmitting(self):
        self.assertEqual(self.call("/api/v1/power", token="none")[0], 401)
        self.assertEqual(self.call("/api/v1/power", token=self.tokens[Role.LISTENER])[0], 403)
        status, body = self.call("/api/v1/power")
        self.assertEqual((status, body["online"], body["outlets"]["fan"]), (200, True, False))
        self.assertEqual(self.call("/api/v1/power", "POST", {"operation": "set", "outlet": "fan", "on": True})[1]["verified"], True)
        self.ptt.lease_active = True
        status, body = self.call("/api/v1/power", "POST", {"operation": "set", "outlet": "fan", "on": False})
        self.assertEqual((status, body["error"]["code"]), (409, "power_transmitting"))
        self.assertTrue(self.power.status()["outlets"]["fan"])

    def test_power_route_validates_and_guards_critical_outlets(self):
        post = lambda payload: self.call("/api/v1/power", "POST", payload)
        self.assertEqual(post({"operation": "set", "outlet": "fan", "on": "yes"})[0], 400)
        self.assertEqual(post({"operation": "cycle", "outlet": "fan"})[1]["error"]["code"], "power_cycle_unsupported")
        self.assertEqual(post({"operation": "set", "outlet": "nope", "on": True})[0], 404)
        self.assertEqual(post({"operation": "set", "outlet": "radio", "on": False})[1]["error"]["code"], "power_confirm_required")
        self.assertEqual(post({"operation": "set", "outlet": "radio", "on": False, "confirm": True})[0], 200)

    def test_cat_frequency_reader_uses_the_frequency_query_and_tolerates_busy(self):
        class FakeCat:
            queries = {"MD": SimpleNamespace(result_name="mode_code"), "FA": SimpleNamespace(result_name="frequency_hz")}
            outcome = {"frequency_hz": 14_200_000}

            def read(self, command):
                assert command == "FA"
                if isinstance(self.outcome, Exception):
                    raise self.outcome
                return self.outcome

        cat = FakeCat()
        read = cat_frequency_reader(cat)
        self.assertEqual(read(), 14_200_000)
        cat.outcome = CatError("cat_busy")
        self.assertIsNone(read())
        cat.outcome = CatError("cat_io_failed")
        with self.assertRaises(CatError):
            read()
        self.assertIsNone(cat_frequency_reader(SimpleNamespace(queries={})))

    def test_power_disabled_by_default_and_not_configured(self):
        self.power.enabled = False
        status, body = self.call("/api/v1/power", "POST", {"operation": "set", "outlet": "fan", "on": True})
        self.assertEqual((status, body["error"]["code"]), (403, "power_control_disabled"))
        self.agent.power = None
        self.assertEqual(self.call("/api/v1/power")[0], 503)


if __name__ == "__main__":
    unittest.main()
    unittest.main()
