import threading
import time
import unittest
import uuid
from socketserver import StreamRequestHandler, ThreadingTCPServer

from bricoham_station_agent.rotor import RotorConfig, RotorController, RotorError


class RotorPeer(StreamRequestHandler):
    def handle(self):
        command = self.rfile.readline(512).decode("ascii").strip()
        with self.server.guard:
            self.server.commands.append(command)
            operation = command.partition(" ")[0]
            if operation in self.server.responses:
                reply = self.server.responses[operation]
            elif operation == "+p":
                azimuth, elevation = self.server.position
                reply = f"get_pos:\nAzimuth: {azimuth}\nElevation: {elevation}\nRPRT 0\n".encode()
            elif operation == "+P":
                _, azimuth, elevation = command.split()
                self.server.position = float(azimuth), float(elevation)
                reply = f"set_pos: {azimuth} {elevation}\nRPRT 0\n".encode()
            elif operation == "+S":
                reply = b"stop:\nRPRT 0\n"
            else:
                reply = b"unknown:\nRPRT -1\n"
        self.wfile.write(reply)


class RotorBroker(ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self):
        self.guard = threading.Lock()
        self.commands = []
        self.responses = {}
        self.position = (20.0, 0.0)
        super().__init__(("127.0.0.1", 0), RotorPeer)
        self.thread = threading.Thread(target=self.serve_forever)
        self.thread.start()

    def stop(self):
        self.shutdown()
        self.server_close()
        self.thread.join(timeout=2)


class RotorTests(unittest.TestCase):
    def setUp(self):
        self.broker = RotorBroker()
        self.rotor = RotorController(
            RotorConfig(
                self.broker.server_address[1],
                "Test controller",
                0,
                360,
                0,
                90,
                True,
            )
        )

    def tearDown(self):
        self.rotor.close()
        self.broker.stop()

    def move(self, azimuth=90, elevation=0):
        return self.rotor.operate(
            {
                "operation": "move",
                "request_id": str(uuid.uuid4()),
                "azimuth_deg": azimuth,
                "elevation_deg": elevation,
            }
        )

    def test_metadata_does_not_contact_backend_and_position_uses_documented_erp(self):
        self.assertFalse(self.rotor.snapshot()["lease_active"])
        self.assertEqual(self.broker.commands, [])
        result = self.rotor.snapshot(read_position=True)
        self.assertEqual(result["position"], {"azimuth_deg": 20, "elevation_deg": 0})
        self.assertEqual(self.broker.commands, ["+p"])

    def test_limits_types_and_unknown_operations_fail_before_backend_io(self):
        for value in (True, "90\n+S", float("nan"), float("inf"), 10**400, -1, 361):
            with self.subTest(value=str(value)[:20]), self.assertRaises(ValueError):
                self.move(value)
        with self.assertRaises(ValueError):
            self.move(90, 91)
        with self.assertRaises(ValueError):
            self.rotor.operate({"operation": "send_cmd", "value": "R"})
        self.assertEqual(self.broker.commands, [])

    def test_move_has_exclusive_lease_and_stop_never_requires_ownership(self):
        result = self.move(123.123456789, 25.5)
        lease = result["lease_id"]
        self.assertEqual(self.broker.position, (123.123456789, 25.5))
        self.assertNotIn("lease_id", self.rotor.snapshot())
        with self.assertRaisesRegex(RotorError, "rotor_busy"):
            self.move(140)
        with self.assertRaisesRegex(RotorError, "rotor_lease_expired"):
            self.rotor.operate({"operation": "renew", "lease_id": "not-the-owner"})
        self.assertTrue(
            self.rotor.operate({"operation": "renew", "lease_id": lease})["lease_active"]
        )
        self.assertFalse(self.rotor.operate({"operation": "stop"})["lease_active"])
        self.assertEqual(self.broker.commands[-1], "+S")
        with self.assertRaisesRegex(RotorError, "rotor_lease_expired"):
            self.rotor.operate({"operation": "renew", "lease_id": lease})

    def test_missing_heartbeat_stops_motion_without_an_http_client(self):
        self.move()
        deadline = time.monotonic() + 4.5
        while time.monotonic() < deadline and "+S" not in self.broker.commands:
            time.sleep(0.03)
        self.assertIn("+S", self.broker.commands)
        self.assertFalse(self.rotor.snapshot()["lease_active"])

    def test_renewal_cannot_extend_absolute_motion_deadline(self):
        lease = self.move()["lease_id"]
        started = time.monotonic()
        while time.monotonic() - started < 32:
            time.sleep(0.1)
            try:
                self.rotor.operate({"operation": "renew", "lease_id": lease})
            except RotorError as error:
                self.assertIn(str(error), ("rotor_busy", "rotor_lease_expired"))
                if str(error) == "rotor_lease_expired":
                    break
        else:
            self.fail("Renewals bypassed the absolute 30-second motion deadline")
        elapsed = time.monotonic() - started
        self.assertIn("+S", self.broker.commands)
        self.assertGreaterEqual(elapsed, 29.8)
        self.assertLess(elapsed, 31.5)

    def test_lost_move_ack_is_not_retried_and_stop_failure_latches_motion_off(self):
        self.broker.responses["+P"] = b""
        self.broker.responses["+S"] = b"stop:\nRPRT -1\n"
        with self.assertRaises(RotorError):
            self.move()
        snapshot = None
        deadline = time.monotonic() + 5
        while snapshot is None:
            try:
                snapshot = self.rotor.snapshot()
            except RotorError as error:
                # The watchdog thread may still hold the lock after the failed move.
                if str(error) != "rotor_busy" or time.monotonic() > deadline:
                    raise
                time.sleep(0.01)
        self.assertTrue(snapshot["stop_failed"])
        self.assertEqual(sum(cmd.startswith("+P ") for cmd in self.broker.commands), 1)
        with self.assertRaisesRegex(RotorError, "rotor_stop_unconfirmed"):
            self.move()
        del self.broker.responses["+S"]
        self.assertFalse(self.rotor.operate({"operation": "stop"})["stop_failed"])

    def test_bad_position_frames_never_cause_motion(self):
        for reply in (
            b"get_pos:\nAzimuth: nan\nElevation: 0\nRPRT 0\n",
            b"get_pos:\nAzimuth: 999\nElevation: 0\nRPRT 0\n",
            b"wrong_command:\nRPRT 0\n",
            b"get_pos:\n" + b"x" * 600 + b"\nRPRT 0\n",
        ):
            self.broker.responses["+p"] = reply
            with self.subTest(reply=reply[:20]), self.assertRaises(RotorError):
                self.move()
        self.assertFalse(any(cmd.startswith("+P ") for cmd in self.broker.commands))

    def test_close_stops_active_motion_and_fixed_elevation_and_read_only_are_enforced(self):
        self.move()
        self.rotor.close()
        self.assertEqual(self.broker.commands[-1], "+S")
        with self.assertRaisesRegex(RotorError, "rotor_closed"):
            self.rotor.snapshot()
        readonly = RotorController(
            RotorConfig(
                self.broker.server_address[1],
                "Azimuth only",
                0,
                360,
                0,
                0,
                False,
            )
        )
        try:
            with self.assertRaisesRegex(RotorError, "rotor_motion_disabled"):
                readonly.operate(
                    {
                        "operation": "move",
                        "request_id": str(uuid.uuid4()),
                        "azimuth_deg": 90,
                        "elevation_deg": 0,
                    }
                )
            with self.assertRaises(ValueError):
                readonly.operate(
                    {
                        "operation": "move",
                        "request_id": str(uuid.uuid4()),
                        "azimuth_deg": 90,
                        "elevation_deg": 1,
                    }
                )
        finally:
            readonly.close()

    def test_stop_cancels_a_move_that_arrives_late_and_recent_moves_cannot_replay(self):
        identifier = str(uuid.uuid4())
        self.rotor.operate({"operation": "stop", "cancel_request_id": identifier})
        command = {
            "operation": "move",
            "request_id": identifier,
            "azimuth_deg": 90,
            "elevation_deg": 0,
        }
        with self.assertRaisesRegex(RotorError, "rotor_request_cancelled_or_repeated"):
            self.rotor.operate(command)
        self.assertEqual(self.broker.commands, ["+S"])
        command["request_id"] = str(uuid.uuid4())
        self.rotor.operate(command)
        self.rotor.operate({"operation": "stop"})
        with self.assertRaisesRegex(RotorError, "rotor_request_cancelled_or_repeated"):
            self.rotor.operate(command)
        self.assertEqual(sum(cmd.startswith("+P ") for cmd in self.broker.commands), 1)


class RotorExtensionTests(unittest.TestCase):
    def setUp(self):
        self.broker = RotorBroker()
        self.rotor = RotorController(
            RotorConfig(
                self.broker.server_address[1], "Ext", 0, 360, 0, 90, True,
                park_azimuth=180, park_elevation=0, azimuth_offset=5, elevation_offset=0,
            )
        )

    def tearDown(self):
        self.rotor.close()
        self.broker.stop()

    @staticmethod
    def op(operation, **fields):
        return {"operation": operation, "request_id": str(uuid.uuid4()), **fields}

    def test_offset_is_applied_to_reads_and_writes(self):
        self.assertEqual(self.rotor.snapshot(read_position=True)["position"]["azimuth_deg"], 25)
        self.rotor.operate(self.op("move", azimuth_deg=100, elevation_deg=10))
        self.assertEqual(self.broker.position, (95.0, 10.0))

    def test_park_goes_to_configured_position(self):
        result = self.rotor.operate(self.op("park"))
        self.assertEqual(result["accepted_target"], {"azimuth_deg": 180.0, "elevation_deg": 0.0})
        self.assertEqual(self.broker.position, (175.0, 0.0))
        self.assertTrue(result["capabilities"]["park"])

    def test_park_without_configuration_is_refused_before_backend_io(self):
        bare = RotorController(RotorConfig(self.broker.server_address[1], "Bare", 0, 360, 0, 0, True))
        try:
            with self.assertRaisesRegex(RotorError, "rotor_park_not_configured"):
                bare.operate(self.op("park"))
            self.assertFalse(bare.snapshot()["capabilities"]["park"])
        finally:
            bare.close()
        self.assertEqual(self.broker.commands, [])

    def test_tracking_retargets_only_with_the_live_lease(self):
        lease = self.rotor.operate(self.op("move", azimuth_deg=10, elevation_deg=0))["lease_id"]
        with self.assertRaisesRegex(RotorError, "rotor_busy"):
            self.rotor.operate(self.op("move", azimuth_deg=20, elevation_deg=0))
        with self.assertRaisesRegex(RotorError, "rotor_busy"):
            self.rotor.operate(self.op("move", azimuth_deg=20, elevation_deg=0, lease_id="other"))
        result = self.rotor.operate(self.op("move", azimuth_deg=20, elevation_deg=5, lease_id=lease))
        self.assertEqual(result["lease_id"], lease)
        self.assertEqual(self.broker.position, (15.0, 5.0))

    def test_invalid_park_or_offset_configuration_is_rejected(self):
        for kwargs in ({"park_azimuth": 10}, {"azimuth_offset": 181}, {"park_azimuth": 400, "park_elevation": 0}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                RotorConfig(1234, "X", 0, 360, 0, 90, True, **kwargs)
