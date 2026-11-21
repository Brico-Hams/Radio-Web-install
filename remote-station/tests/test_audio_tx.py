import sys
import threading
import time
import types
import unittest
from unittest.mock import patch

from test_ptt import PttPort

from bricoham_station_agent.audio import AudioError
from bricoham_station_agent.audio_tx import (
    BLOCK_BYTES,
    BLOCK_SAMPLES,
    AudioTransmitter,
    TxAudioConfig,
)
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.ptt import PttConfig, PttController, PttError


class FakeDac(types.ModuleType):
    class PortAudioError(Exception):
        pass

    def __init__(self):
        super().__init__("sounddevice")
        self.name = "Station USB DAC"
        self.opened = []
        self.closed = threading.Event()
        self.output = []
        self.callback = None
        self.channels = 2
        self.start_hook = lambda: None
        self.close_hook = lambda: None

    def query_devices(self, device, kind):
        assert device == 4 and kind == "output"
        return {"name": self.name}

    def check_output_settings(self, **kwargs):
        assert kwargs["device"] == 4 and kwargs["samplerate"] == 48000

    def RawOutputStream(self, **kwargs):
        self.opened.append(kwargs)
        self.callback = kwargs["callback"]
        self.channels = kwargs["channels"]
        owner = self

        class Stream:
            def start(self):
                owner.start_hook()
                owner.tick()

            def close(self):
                owner.close_hook()
                owner.closed.set()

        return Stream()

    def tick(self, *, status=None):
        block = bytearray(BLOCK_BYTES * self.channels)
        assert self.callback is not None
        self.callback(block, BLOCK_SAMPLES, None, status)
        self.output.append(bytes(block))
        return bytes(block)


class AudioTxTests(unittest.TestCase):
    def setUp(self):
        self.sd = FakeDac()
        module = patch.dict(sys.modules, {"sounddevice": self.sd})
        module.start()
        self.addCleanup(module.stop)
        self.audio = AudioTransmitter(TxAudioConfig(4, "Station USB DAC", 2, 1))
        self.addCleanup(self.audio.close)

    def prepare(self):
        session = self.audio.open()
        self.addCleanup(session.close)
        session.push(b"\x34\x12" * BLOCK_SAMPLES)
        session.push(b"\x34\x12" * BLOCK_SAMPLES)
        return session

    def test_explicit_dac_is_lazy_named_and_rejects_bad_channels(self):
        self.assertEqual(self.sd.opened, [])
        for values in ((True, "DAC", 2, 0), (4, "", 2, 0), (4, "DAC", 2, 2)):
            with self.assertRaises(ValueError):
                TxAudioConfig(*values)
        self.sd.name = "Different device"
        with self.assertRaisesRegex(AudioError, "device_changed"):
            self.audio.open()
        self.assertEqual(self.sd.opened, [])
        self.sd.name = "Station USB DAC"
        with patch.dict(sys.modules, {"sounddevice": None}):
            with (
                self.assertLogs("bricoham.station_agent.audio_tx"),
                self.assertRaisesRegex(AudioError, "dependency_missing"),
            ):
                self.audio.open()
        self.assertEqual(self.sd.opened, [])

    def test_no_pcm_leaks_before_ptt_and_only_explicit_stereo_channel_is_filled(self):
        session = self.prepare()
        self.assertEqual(self.sd.output, [bytes(BLOCK_BYTES * 2)])
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))
        with self.assertRaisesRegex(AudioError, "session_invalid"):
            self.audio.claim("x" * 43)
        self.assertIs(self.audio.claim(session.identifier), session)
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))
        session.unmute()
        self.assertEqual(self.sd.tick(), b"\0\0\x34\x12" * BLOCK_SAMPLES)
        session.mute()
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))
        with self.assertRaisesRegex(AudioError, "audio_tx_busy"):
            self.audio.open()

    def test_bounded_prebuffer_drops_old_muted_samples_and_underflow_fails_closed(self):
        session = self.prepare()
        for level in range(10):
            session.push(bytes((level, 0)) * BLOCK_SAMPLES)
        self.audio.claim(session.identifier)
        session.unmute()
        self.assertEqual(self.sd.tick(), b"\0\0\x08\0" * BLOCK_SAMPLES)
        self.assertEqual(self.sd.tick(), b"\0\0\x09\0" * BLOCK_SAMPLES)
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))
        self.assertFalse(session.healthy())
        with self.assertRaisesRegex(AudioError, "underflow"):
            session.push(bytes(BLOCK_BYTES))

    def test_overflow_invalid_frame_and_native_status_never_become_silent_success(self):
        for fault in ("overflow", "invalid", "native"):
            session = self.prepare()
            self.audio.claim(session.identifier)
            session.unmute()
            if fault == "overflow":
                with self.assertRaisesRegex(AudioError, "overflow"):
                    for _ in range(9):
                        session.push(bytes(BLOCK_BYTES))
            elif fault == "invalid":
                with self.assertRaisesRegex(AudioError, "invalid_frame"):
                    session.push(b"x")
            else:
                self.sd.tick(status=True)
            self.assertFalse(session.healthy())
            session.close()

    def test_ptt_requires_audio_capability_vox_off_and_stops_before_lease_on_audio_loss(self):
        port = PttPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=port)
        factory.start()
        self.addCleanup(factory.stop)
        cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        self.addCleanup(cat.close)
        ptt = PttController(
            cat,
            PttConfig(True, 14_200_000, 14_300_000, 30, 5),
            tx_audio=self.audio,
        )
        self.addCleanup(ptt.close)
        ptt.operate({"operation": "stop"})
        with self.assertRaises(ValueError):
            ptt.operate({"operation": "start", "request_id": "audio-start-request-0001"})
        session = self.prepare()
        port.vox = 1
        with self.assertRaisesRegex(PttError, "disable_vox"):
            ptt.operate(
                {
                    "operation": "start",
                    "request_id": "audio-start-request-0002",
                    "audio_session_id": session.identifier,
                }
            )
        self.assertNotIn(b"TX1;", port.writes)
        port.vox = 0
        ptt.operate({"operation": "stop"})
        session.push(bytes(BLOCK_BYTES))
        session.push(bytes(BLOCK_BYTES))
        result = ptt.operate(
            {
                "operation": "start",
                "request_id": "audio-start-request-0003",
                "audio_session_id": session.identifier,
            }
        )
        self.assertTrue(result["lease_active"])
        self.assertEqual(port.tx, 1)
        started = time.monotonic()
        while port.tx and time.monotonic() - started < 1.5:
            time.sleep(0.02)
        self.assertEqual(port.tx, 0)
        self.assertLess(time.monotonic() - started, 1.5)
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))

    def test_shutdown_during_native_start_closes_dac_without_publishing_a_session(self):
        entered, release = threading.Event(), threading.Event()
        failures = []

        def delayed_start():
            entered.set()
            release.wait(2)

        def opening():
            try:
                self.audio.open()
            except AudioError as error:
                failures.append(str(error))

        self.sd.start_hook = delayed_start
        opener = threading.Thread(target=opening)
        closer = threading.Thread(target=self.audio.close)
        opener.start()
        try:
            self.assertTrue(entered.wait(1))
            closer.start()
            deadline = time.monotonic() + 1
            while not self.audio._closed and time.monotonic() < deadline:
                time.sleep(0.001)
        finally:
            release.set()
            opener.join(2)
            if closer.ident is not None:
                closer.join(2)
        self.assertFalse(opener.is_alive())
        self.assertFalse(closer.is_alive())
        self.assertEqual(failures, ["audio_tx_stopped"])
        self.assertTrue(self.sd.closed.is_set())
        self.assertEqual(self.sd.tick(), bytes(BLOCK_BYTES * 2))

    def test_duplicate_close_cannot_release_dac_reservation_while_native_close_blocks(self):
        session = self.prepare()
        entered, release = threading.Event(), threading.Event()

        def delayed_close():
            entered.set()
            release.wait(2)

        self.sd.close_hook = delayed_close
        threads = [threading.Thread(target=session.close) for _ in range(2)]
        threads[0].start()
        try:
            self.assertTrue(entered.wait(1))
            threads[1].start()
            with self.assertRaisesRegex(AudioError, "audio_tx_busy"):
                self.audio.open()
        finally:
            release.set()
            for thread in threads:
                if thread.ident is not None:
                    thread.join(2)
        self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.sd.close_hook = lambda: None
        self.audio.open().close()

    def test_failed_start_preserves_original_error_when_native_cleanup_also_fails(self):
        def fail():
            raise ValueError("native error")

        self.sd.start_hook = self.sd.close_hook = fail
        with (
            self.assertLogs("bricoham.station_agent.audio_tx"),
            self.assertRaisesRegex(AudioError, "audio_tx_output_failed"),
        ):
            self.audio.open()
