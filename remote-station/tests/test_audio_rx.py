import json
import struct
import sys
import threading
import time
import types
import unittest
from http.client import HTTPConnection
from pathlib import Path
from unittest.mock import patch

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_station_agent.audio import AudioCapture, AudioConfig, AudioError
from bricoham_station_agent.server import StationAgentHTTPServer


class FakeSoundDevice(types.ModuleType):
    class PortAudioError(Exception):
        pass

    def __init__(self):
        super().__init__("sounddevice")
        self.name = "Station ADC"
        self.opened = []
        self.closed = threading.Event()
        self.live = False

    def query_devices(self, device, kind):
        assert device == 3 and kind == "input"
        return {"name": self.name}

    def check_input_settings(self, **kwargs):
        assert kwargs["device"] == 3 and kwargs["channels"] == 1

    def RawInputStream(self, **kwargs):
        self.opened.append(kwargs)
        owner = self

        class Stream:
            def start(self):
                kwargs["callback"](b"\x34\x12" * 160, 160, None, None)
                if owner.live:

                    def feed():
                        while not owner.closed.wait(0.02):
                            kwargs["callback"](b"\x34\x12" * 160, 160, None, None)

                    threading.Thread(target=feed, daemon=True).start()

            def close(self):
                owner.closed.set()

        return Stream()


class AudioTests(unittest.TestCase):
    def setUp(self):
        self.sd = FakeSoundDevice()
        self.module_patch = patch.dict(sys.modules, {"sounddevice": self.sd})
        self.module_patch.start()
        self.config = AudioConfig(3, 8000, 20, "Station ADC")

    def tearDown(self):
        self.module_patch.stop()

    def test_config_bounds_and_explicit_device(self):
        for data in (
            {},
            {"device": True, "sample_rate": 8000, "block_ms": 20},
            {"device": 3, "sample_rate": 48001, "block_ms": 20},
            {"device": 3, "sample_rate": 8000, "block_ms": 5},
            {"device": 3, "sample_rate": 8001, "block_ms": 10},
        ):
            with patch.object(Path, "read_text", return_value=json.dumps(data)):
                with self.assertRaises(ValueError):
                    AudioConfig.load(Path("audio.json"))
        with patch.object(
            Path,
            "read_text",
            return_value=json.dumps(
                {"device": 3, "device_name": "Station ADC", "sample_rate": 8000, "block_ms": 20}
            ),
        ):
            self.assertEqual(AudioConfig.load(Path("audio.json")), self.config)

    def test_guard_changed_device_and_overrun(self):
        capture = AudioCapture(self.config)
        self.assertEqual(capture.metadata()["sample_rate"], 8000)
        self.assertEqual(self.sd.opened, [])
        self.sd.name = "Different ADC"
        with self.assertRaisesRegex(AudioError, "audio_device_changed"):
            capture.open()
        self.assertEqual(self.sd.opened, [])
        self.sd.name = "Station ADC"
        session = capture.open()
        with self.assertRaisesRegex(AudioError, "audio_busy"):
            capture.open()
        for _ in range(8):
            session._callback(b"\x00\x00" * 160, 160, None, None)
        with self.assertRaisesRegex(AudioError, "audio_overflow"):
            session.read()
        session.close()
        self.assertTrue(self.sd.closed.is_set())
        capture.close()
        with self.assertRaisesRegex(AudioError, "audio_stopped"):
            capture.open()

    def test_missing_dependency_and_unsupported_device_fail_without_opening(self):
        capture = AudioCapture(self.config)
        with patch.dict(sys.modules, {"sounddevice": None}):
            with (
                self.assertLogs("bricoham.station_agent.audio", level="WARNING"),
                self.assertRaisesRegex(AudioError, "audio_dependency_missing"),
            ):
                capture.open()
        with patch.object(self.sd, "check_input_settings", side_effect=ValueError("unsupported")):
            with (
                self.assertLogs("bricoham.station_agent.audio", level="WARNING"),
                self.assertRaisesRegex(AudioError, "audio_capture_failed"),
            ):
                capture.open()
        self.assertEqual(self.sd.opened, [])

    def test_native_start_failure_and_unexpected_failure_both_release_capture(self):
        capture = AudioCapture(self.config)
        for error in (self.sd.PortAudioError("device unavailable"), RuntimeError("bug")):
            closed = threading.Event()

            class FailedStream:
                def __init__(self, cause, closed_event):
                    self.cause = cause
                    self.closed_event = closed_event

                def start(self):
                    raise self.cause

                def close(self):
                    self.closed_event.set()

            with patch.object(self.sd, "RawInputStream", return_value=FailedStream(error, closed)):
                if isinstance(error, self.sd.PortAudioError):
                    with self.assertLogs("bricoham.station_agent.audio", level="WARNING") as logs:
                        with self.assertRaisesRegex(AudioError, "audio_capture_failed") as failure:
                            capture.open()
                    self.assertIs(failure.exception.__cause__, error)
                    self.assertIn("device unavailable", "\n".join(logs.output))
                else:
                    with self.assertRaisesRegex(RuntimeError, "bug"):
                        capture.open()
            self.assertTrue(closed.is_set())
        session = capture.open()
        session.close()

    def test_native_cleanup_failure_preserves_startup_error(self):
        capture = AudioCapture(self.config)
        start_error = self.sd.PortAudioError("cannot start")

        class FailedStream:
            def start(self):
                raise start_error

            def close(self):
                raise self_error

        self_error = self.sd.PortAudioError("cannot close")
        with patch.object(self.sd, "RawInputStream", return_value=FailedStream()):
            with self.assertLogs("bricoham.station_agent.audio", level="WARNING") as logs:
                with self.assertRaises(AudioError) as failure:
                    capture.open()
        self.assertIs(failure.exception.__cause__, start_error)
        self.assertEqual(str(failure.exception), "audio_capture_failed")
        self.assertIn("cannot close", "\n".join(logs.output))
        session = capture.open()
        session.close()

    def test_stream_auth_proxy_bytes_and_disconnect(self):
        tokens = {role: role.value.ljust(32, "x") for role in Role}
        auth = TokenAuthenticator(tokens)
        capture = AudioCapture(self.config)
        self.sd.live = True
        agent = StationAgentHTTPServer(0, auth, lambda: [], audio=capture)
        coordinator = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            auth,
            DeterministicSimulator(),
            station_agent_port=agent.server_address[1],
        )
        servers = (agent, coordinator)
        threads = [threading.Thread(target=server.serve_forever) for server in servers]
        for thread in threads:
            thread.start()
        try:
            for server in servers:
                for role, expected in ((None, 401), (Role.GUEST, 403), (Role.LISTENER, 200)):
                    conn = HTTPConnection(*server.server_address, timeout=5)
                    headers = {"Authorization": f"Bearer {tokens[role]}"} if role else {}
                    conn.request("GET", "/api/v1/audio", headers=headers)
                    response = conn.getresponse()
                    self.assertEqual(response.status, expected)
                    response.read()
                    conn.close()
                self.assertEqual(self.sd.opened, [])
            conn = HTTPConnection(*coordinator.server_address, timeout=5)
            conn.request(
                "GET",
                "/api/v1/audio/stream",
                headers={"Authorization": f"Bearer {tokens[Role.LISTENER]}"},
            )
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
            self.assertEqual(response.read(4), struct.pack("<I", 320))
            self.assertEqual(response.read(320), b"\x34\x12" * 160)
            competing = HTTPConnection(*agent.server_address, timeout=5)
            competing.request(
                "GET",
                "/api/v1/audio/stream",
                headers={"Authorization": f"Bearer {tokens[Role.LISTENER]}"},
            )
            self.assertEqual(competing.getresponse().status, 409)
            competing.close()
            response.close()
            conn.close()
            self.assertTrue(self.sd.closed.wait(2))
        finally:
            for server in reversed(servers):
                server.shutdown()
                server.server_close()
            for thread in threads:
                thread.join(5)

    def test_coordinator_shutdown_closes_active_capture(self):
        auth = TokenAuthenticator({Role.ADMIN: "a" * 32})
        self.sd.live = True
        agent = StationAgentHTTPServer(0, auth, lambda: [], audio=AudioCapture(self.config))
        coordinator = CoordinatorHTTPServer(
            ("127.0.0.1", 0),
            auth,
            DeterministicSimulator(),
            station_agent_port=agent.server_address[1],
        )
        servers = (agent, coordinator)
        threads = [threading.Thread(target=server.serve_forever) for server in servers]
        for thread in threads:
            thread.start()
        conn = HTTPConnection(*coordinator.server_address, timeout=5)
        try:
            conn.request(
                "GET", "/api/v1/audio/stream", headers={"Authorization": "Bearer " + "a" * 32}
            )
            response = conn.getresponse()
            self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
            start = time.monotonic()
            coordinator.shutdown()
            coordinator.server_close()
            self.assertTrue(self.sd.closed.wait(2))
            self.assertLess(time.monotonic() - start, 2.5)
            response.close()
        finally:
            conn.close()
            agent.shutdown()
            agent.server_close()
            for thread in threads:
                thread.join(5)


if __name__ == "__main__":
    unittest.main()
