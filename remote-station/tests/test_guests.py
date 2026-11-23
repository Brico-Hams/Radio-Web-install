import csv
import io
import json
import tempfile
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from unittest.mock import patch

from test_ptt import PttPort

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.guests import (
    CSV_COLUMNS,
    GuestStore,
    TxLog,
    band_of,
    guest_tx_refusal,
    normalize_bands,
)
from bricoham_station_agent.ptt import PttConfig, PttController
from bricoham_station_agent.server import StationAgentHTTPServer

RADIO = "ftx-1"


class FakeClock:
    def __init__(self, now=1_700_000_000.0):
        self.now = now

    def __call__(self):
        return self.now


class Tokens:
    def __init__(self):
        self.count = 0

    def __call__(self, _size):
        self.count += 1
        return f"{self.count:02d}".ljust(43, "x")


def make_store(clock, directory=None):
    tokens = Tokens()
    ids = iter(f"{index:012x}" for index in range(1, 50))
    return GuestStore(
        directory, clock=clock, token_source=tokens, id_source=lambda _n: next(ids)
    )


class GuestStoreTests(unittest.TestCase):
    def test_invite_authenticate_expire_and_revoke(self):
        clock = FakeClock()
        store = make_store(clock)
        guest, token = store.invite("Ana", {RADIO: {"transmit": False}}, 1)
        self.assertTrue(token.startswith("g_"))
        self.assertNotIn("token", json.dumps(store.list()))
        self.assertNotIn(token, json.dumps(store.list()))
        grant = store.authenticate(token)
        self.assertEqual((grant.id, grant.label), (guest["id"], "Ana"))
        self.assertFalse(grant.permission(RADIO)["transmit"])
        self.assertIsNone(store.authenticate(token + "x"))
        self.assertIsNone(store.authenticate("g_" + "z" * 40))
        clock.now += 3600
        self.assertIsNone(store.authenticate(token))
        clock.now -= 3600
        self.assertTrue(store.revoke(guest["id"]))
        self.assertIsNone(store.authenticate(token))
        self.assertFalse(store.is_active_id(guest["id"]))
        self.assertFalse(store.revoke("unknown"))
        self.assertFalse(store.revoke("g000000000099"))

    def test_invalid_invitations_are_rejected(self):
        store = make_store(FakeClock())
        good = {RADIO: {"transmit": True}}
        for label, permissions, ttl in (
            ("", good, 24),
            ("bad;label", good, 24),
            ("Ana", {}, 24),
            ("Ana", good, 0),
            ("Ana", good, 24 * 91),
            ("Ana", good, True),
            ("Ana", {RADIO: {"transmit": "yes"}}, 24),
            ("Ana", {RADIO: {"transmit": True, "bands": ["99m"]}}, 24),
            ("Ana", {RADIO: {"transmit": True, "max_power_w": 0}}, 24),
            ("Ana", {RADIO: {"transmit": True, "max_power_w": True}}, 24),
            ("Ana", {"bad id": {"transmit": True}}, 24),
            ("Ana", {RADIO: {"transmit": True, "extra": 1}}, 24),
        ):
            with self.assertRaises(ValueError, msg=repr((label, permissions, ttl))):
                store.invite(label, permissions, ttl)
        self.assertEqual(store.list(), [])

    def test_persistence_keeps_only_the_token_hash(self):
        clock = FakeClock()
        with tempfile.TemporaryDirectory() as directory:
            store = make_store(clock, Path(directory))
            guest, token = store.invite("Ana", {RADIO: {"transmit": True, "bands": ["20m"]}})
            raw = (Path(directory) / "remote-guests.json").read_text(encoding="utf-8")
            self.assertNotIn(token, raw)
            reloaded = make_store(clock, Path(directory))
            self.assertEqual(reloaded.authenticate(token).id, guest["id"])
            reloaded.revoke(guest["id"])
            self.assertIsNone(make_store(clock, Path(directory)).authenticate(token))
            (Path(directory) / "remote-guests.json").write_text("{", encoding="utf-8")
            with self.assertRaises(ValueError):
                make_store(clock, Path(directory))

    def test_bands_and_tx_policy(self):
        self.assertEqual(band_of(14_250_000), "20m")
        self.assertEqual(band_of(15_000_000), "")
        self.assertEqual(normalize_bands(None), [])
        self.assertIsNone(normalize_bands(["nope"]))
        custom = normalize_bands([{"name": "x", "min_hz": 1, "max_hz": 2}])
        self.assertEqual(custom[0]["max_hz"], 2)
        listen = {"transmit": False, "bands": [], "max_power_w": None}
        self.assertEqual(
            guest_tx_refusal(listen, freq_hz=14_250_000, power_w=5), "ptt_guest_listen_only"
        )
        self.assertEqual(
            guest_tx_refusal(None, freq_hz=14_250_000, power_w=5), "ptt_guest_no_radio_permission"
        )
        limited = {"transmit": True, "bands": normalize_bands(["40m"]), "max_power_w": 20}
        self.assertEqual(
            guest_tx_refusal(limited, freq_hz=14_250_000, power_w=10), "ptt_guest_band_limit"
        )
        self.assertEqual(
            guest_tx_refusal(limited, freq_hz=None, power_w=10), "ptt_guest_frequency_unknown"
        )
        self.assertEqual(
            guest_tx_refusal(limited, freq_hz=7_100_000, power_w=25), "ptt_guest_power_limit"
        )
        self.assertEqual(
            guest_tx_refusal(limited, freq_hz=7_100_000, power_w=None), "ptt_guest_power_unknown"
        )
        self.assertIsNone(guest_tx_refusal(limited, freq_hz=7_100_000, power_w=20))
        free = {"transmit": True, "bands": [], "max_power_w": None}
        self.assertIsNone(guest_tx_refusal(free, freq_hz=None, power_w=None))


class TxLogTests(unittest.TestCase):
    def test_entry_duration_band_power_and_csv(self):
        clock = FakeClock(1_700_000_000.0)
        log = TxLog(clock=clock)
        log.begin(operator="Ana", radio=RADIO, freq_hz=14_250_000, power_w=25)
        self.assertTrue(log.is_open())
        clock.now += 12.4
        entry = log.end()
        self.assertFalse(log.is_open())
        self.assertIsNone(log.end())
        self.assertEqual(entry["duration_s"], 12)
        self.assertEqual((entry["band"], entry["power_w"], entry["radio"]), ("20m", 25, RADIO))
        self.assertTrue(entry["start"].endswith("Z"))
        rows = list(csv.reader(io.StringIO(log.to_csv())))
        self.assertEqual(tuple(rows[0]), CSV_COLUMNS)
        self.assertEqual(rows[1][2:], ["12", "Ana", RADIO, "20m", "14250000", "25"])

    def test_csv_neutralises_formulas_and_persists(self):
        clock = FakeClock()
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "tx.jsonl"
            log = TxLog(file, clock=clock)
            log.begin(operator="=HYPERLINK(1)", radio=RADIO, freq_hz=None, power_w=None)
            log.begin(operator='say "hi", ok', radio=RADIO, freq_hz=7_100_000, power_w=10)
            log.end()
            self.assertEqual(len(log.entries()), 2)
            self.assertIn("'=HYPERLINK(1)", log.to_csv())
            self.assertIn('"say ""hi"", ok"', log.to_csv())
            file.write_text(file.read_text(encoding="utf-8") + '{"torn', encoding="utf-8")
            self.assertEqual(len(TxLog(file, clock=clock).entries()), 2)


class GuestApiTests(unittest.TestCase):
    def setUp(self):
        self.port = PttPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        self.ptt = PttController(self.cat, PttConfig(True, 14_200_000, 14_300_000, 30, 5))
        self.clock = FakeClock()
        self.store = make_store(self.clock)
        self.log = TxLog(clock=self.clock)
        self.tokens = {role: role.value.ljust(32, "x") for role in Role}
        self.agent = StationAgentHTTPServer(
            0,
            TokenAuthenticator(self.tokens),
            lambda: [],
            cat=self.cat,
            ptt=self.ptt,
            guests=self.store,
            tx_log=self.log,
            radio_id=RADIO,
        )
        self.thread = threading.Thread(target=self.agent.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.agent.shutdown()
        self.agent.server_close()
        self.thread.join(timeout=2)
        self.assertFalse(self.thread.is_alive())

    def request(self, path, payload=None, *, role=Role.ADMIN, token=None, method=None):
        connection = HTTPConnection(*self.agent.server_address, timeout=5)
        try:
            bearer = token or (self.tokens[role] if role else None)
            connection.request(
                method or ("POST" if payload is not None else "GET"),
                path,
                body=json.dumps(payload) if payload is not None else None,
                headers={
                    "Content-Type": "application/json",
                    **({"Authorization": f"Bearer {bearer}"} if bearer else {}),
                },
            )
            response = connection.getresponse()
            body = response.read()
            if response.getheader("Content-Type", "").startswith("text/csv"):
                return response.status, body.decode("utf-8")
            return response.status, json.loads(body)
        finally:
            connection.close()

    def invite(self, **body):
        status, result = self.request("/api/v1/guests", {"label": "Ana", **body})
        self.assertEqual(status, 201)
        return result["guest"], result["token"]

    def start(self, token, request_id="guest-start-request-0001"):
        return self.request(
            "/api/v1/ptt",
            {"operation": "start", "request_id": request_id},
            role=None,
            token=token,
        )

    def arm(self):
        self.assertEqual(self.request("/api/v1/ptt", {"operation": "stop"})[0], 200)

    def test_listen_only_guest_is_refused_tx_but_can_listen_and_unkey(self):
        _guest, token = self.invite(transmit=False)
        self.arm()
        status, body = self.start(token)
        self.assertEqual((status, body["error"]["code"]), (403, "ptt_guest_listen_only"))
        self.assertNotIn(b"TX1;", self.port.writes)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.log.entries(), [])
        self.assertEqual(self.request("/api/v1/ptt", role=None, token=token)[0], 200)
        self.assertEqual(
            self.request("/api/v1/ptt", {"operation": "stop"}, role=None, token=token)[0], 200
        )
        for path in ("/api/v1/cat", "/api/v1/devices", "/api/v1/accessories"):
            self.assertEqual(self.request(path, role=None, token=token)[0], 401)
        self.assertEqual(self.request("/api/v1/txlog", role=None, token=token)[0], 401)
        self.assertEqual(self.request("/api/v1/guests", role=None, token=token)[0], 401)

    def test_out_of_band_guest_is_refused_before_keying(self):
        _guest, token = self.invite(transmit=True, bands=["40m"])
        self.arm()
        status, body = self.start(token)
        self.assertEqual((status, body["error"]["code"]), (409, "ptt_guest_band_limit"))
        self.assertNotIn(b"TX1;", self.port.writes)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.log.entries(), [])

    def test_power_limit_is_enforced_against_the_live_radio(self):
        _guest, token = self.invite(transmit=True, bands=["20m"], max_power_w=10)
        self.arm()
        status, body = self.start(token)
        self.assertEqual((status, body["error"]["code"]), (409, "ptt_guest_power_limit"))
        self.assertNotIn(b"TX1;", self.port.writes)

    def test_guest_without_permission_for_this_radio_is_refused(self):
        token = self.store.invite("Bea", {"other-radio": {"transmit": True}})[1]
        self.arm()
        status, body = self.start(token)
        self.assertEqual((status, body["error"]["code"]), (403, "guest_no_radio_permission"))
        self.assertNotIn(b"TX1;", self.port.writes)

    def test_allowed_guest_transmits_is_logged_and_revocation_unkeys(self):
        guest, token = self.invite(transmit=True, bands=["20m"], max_power_w=30)
        self.arm()
        status, started = self.start(token)
        self.assertEqual(status, 200)
        self.assertEqual(self.port.tx, 1)
        self.assertTrue(self.log.is_open())
        self.clock.now += 3
        status, _ = self.request(
            "/api/v1/guests/revoke", {"id": guest["id"]}, role=Role.OPERATOR
        )
        self.assertEqual(status, 403)
        self.assertEqual(self.port.tx, 1)
        status, _ = self.request("/api/v1/guests/revoke", {"id": guest["id"]})
        self.assertEqual(status, 200)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.start(token, "guest-start-request-0002")[0], 401)
        self.assertEqual(
            self.request(
                "/api/v1/ptt",
                {"operation": "renew", "lease_id": started["lease_id"]},
                role=None,
                token=token,
            )[0],
            401,
        )
        entry = self.log.entries()[0]
        self.assertEqual(
            (entry["operator"], entry["radio"], entry["band"], entry["power_w"], entry["duration_s"]),
            ("Ana", RADIO, "20m", 25, 3),
        )
        self.assertEqual(self.request("/api/v1/guests/revoke", {"id": "gnope"})[0], 404)

    def test_watchdog_unkeys_when_the_guest_is_revoked_directly_in_the_store(self):
        guest, token = self.invite(transmit=True)
        self.arm()
        self.assertEqual(self.start(token)[0], 200)
        self.store.revoke(guest["id"])
        deadline = time.monotonic() + 2
        while self.port.tx and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(len(self.log.entries()), 1)

    def test_operator_tx_is_logged_with_its_role_and_csv_route_is_admin_only(self):
        self.arm()
        status, _ = self.request(
            "/api/v1/ptt", {"operation": "start", "request_id": "operator-start-request-01"},
            role=Role.OPERATOR,
        )
        self.assertEqual(status, 200)
        self.clock.now += 5
        self.assertEqual(self.request("/api/v1/ptt", {"operation": "stop"})[0], 200)
        status, text = self.request("/api/v1/txlog.csv")
        self.assertEqual(status, 200)
        rows = list(csv.reader(io.StringIO(text)))
        self.assertEqual(rows[0], list(CSV_COLUMNS))
        self.assertEqual(rows[1][2:], ["5", "operator", RADIO, "20m", "14250000", "25"])
        self.assertEqual(self.request("/api/v1/txlog")[1]["entries"][0]["operator"], "operator")
        for role, expected in ((None, 401), (Role.OPERATOR, 403), (Role.LISTENER, 403), (Role.GUEST, 403)):
            for path in ("/api/v1/txlog.csv", "/api/v1/txlog", "/api/v1/guests"):
                self.assertEqual(self.request(path, role=role)[0], expected, (role, path))
        self.assertEqual(self.request("/api/v1/guests", {"label": "x"}, role=Role.OPERATOR)[0], 403)
        self.assertEqual(self.request("/api/v1/txlog.csv", {"a": 1})[0], 405)

    def test_guest_listing_never_exposes_tokens_and_static_guest_role_still_cannot_key(self):
        guest, token = self.invite(transmit=False)
        status, listing = self.request("/api/v1/guests")
        self.assertEqual(status, 200)
        self.assertEqual(listing["guests"][0]["id"], guest["id"])
        self.assertNotIn(token, json.dumps(listing))
        self.arm()
        self.assertEqual(
            self.request(
                "/api/v1/ptt",
                {"operation": "start", "request_id": "static-guest-request-0001"},
                role=Role.GUEST,
            )[0],
            403,
        )
        self.assertNotIn(b"TX1;", self.port.writes)
        self.assertEqual(self.request("/api/v1/guests", {"label": "bad;"})[0], 400)
        self.assertEqual(self.request("/api/v1/guests", {"label": "Ok", "extra": 1})[0], 400)


if __name__ == "__main__":
    unittest.main()
