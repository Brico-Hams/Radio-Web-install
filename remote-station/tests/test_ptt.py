import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from test_ftx1_power import FtxPowerPort

from bricoham_remote_station.drivers import ftx1_cat as ftx
from bricoham_station_agent.cat import CatConfig, CatError, SerialCat
from bricoham_station_agent.ptt import PttConfig, PttController, PttError


class PttPort(FtxPowerPort):
    def __init__(self):
        super().__init__()
        self.transmitter = 0
        self.split = 0
        self.vfo = True
        self.tx_clarifier = 0
        self.shift = 0
        self.ignore_start = False
        self.ignore_stop = False
        self.vox = 0

    def write(self, data):
        reply = None
        if data in (b"TX0;", b"TX1;"):
            self.writes.append(data)
            if not (self.ignore_stop if data == b"TX0;" else self.ignore_start):
                self.tx = int(data[2:3])
            if self.late_echo:
                self.echo = data
            return len(data)
        if data == b"ID;":
            reply = b"ID0840;"
        elif data == b"FT;":
            reply = f"FT{self.transmitter};".encode("ascii")
        elif data == b"ST;":
            reply = f"ST{self.split};".encode("ascii")
        elif data == b"VX;":
            reply = f"VX{self.vox};".encode("ascii")
        elif data == b"IF;":
            reply = (
                f"IF00000{self.frequency[b'FA']:09d}+00000{self.tx_clarifier}"
                + self.modes[b"MD0"].decode("ascii")
                + f"{0 if self.vfo else 1}000{self.shift};"
            ).encode("ascii")
        if reply is not None:
            self.writes.append(data)
            self.buffer.extend(self.echo + data + reply)
            self.echo = b""
            return len(data)
        return super().write(data)


class PttTests(unittest.TestCase):
    def setUp(self):
        self.port = PttPort()
        factory = patch("bricoham_station_agent.cat.serial.Serial", return_value=self.port)
        self.factory = factory.start()
        self.addCleanup(factory.stop)
        self.cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        self.addCleanup(self.cat.close)
        self.ptt = PttController(self.cat, PttConfig(True, 14_200_000, 14_300_000, 30, 5))
        self.addCleanup(self.ptt.close)

    def arm(self):
        return self.ptt.operate({"operation": "stop"})

    def start(self, identifier="ptt-start-request-0001"):
        return self.ptt.operate({"operation": "start", "request_id": identifier})

    def test_primary_if_layout_and_transmit_codec_reject_ambiguous_frames(self):
        self.port.write(b"IF;")
        frame = bytes(self.port.buffer)[3:]
        info = ftx.parse_main_information(frame)
        self.assertEqual((info.frequency_hz, info.mode), (14_250_000, ftx.Ftx1Mode.USB))
        self.assertTrue(info.is_vfo and info.simplex)
        self.assertFalse(info.tx_clarifier_enabled)
        for malformed in (frame + b"TX1;", frame[:-2] + b"3;", frame.replace(b"+", b"x")):
            with self.assertRaises(ValueError):
                ftx.parse_main_information(malformed)
        self.assertEqual(ftx.build_tx_set(False), b"TX0;")
        with self.assertRaises(ValueError):
            ftx.build_tx_set(1)

    def test_default_passive_config_and_explicit_rx_before_start(self):
        self.assertFalse(self.ptt.snapshot()["rx_confirmed"])
        self.assertEqual(self.port.writes, [])
        with self.assertRaisesRegex(PttError, "rx_confirmation"):
            self.start()
        self.assertEqual(self.port.writes, [])
        for values in (
            (1, 14_200_000, 14_300_000, 30, 5),
            (True, 14_200_000, 14_300_000, 30, 31),
            (True, 14_200_000, 14_300_000, True, 5),
        ):
            with self.assertRaises(ValueError):
                PttConfig(*values)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ptt.json"
            payload = {
                "enabled": False,
                "frequency_min_hz": 14_200_000,
                "frequency_max_hz": 14_300_000,
                "power_max_watts": 30,
                "max_transmit_seconds": 5,
            }
            path.write_text(json.dumps(payload), encoding="utf-8")
            self.assertFalse(PttConfig.load(path).enabled)
            path.write_text(json.dumps({**payload, "enable_cw": True}), encoding="utf-8")
            with self.assertRaises(ValueError):
                PttConfig.load(path)
        self.ptt.config = PttConfig(False, 14_200_000, 14_300_000, 30, 5)
        self.arm()
        with self.assertRaisesRegex(PttError, "ptt_disabled"):
            self.start()
        self.assertNotIn(b"TX1;", self.port.writes)

    def test_exclusive_lease_has_no_public_secret_and_blocks_other_cat_work(self):
        self.arm()
        result = self.start()
        self.assertTrue(result["lease_active"])
        self.assertEqual(self.port.tx, 1)
        self.assertNotIn("lease_id", self.ptt.snapshot())
        with self.assertRaisesRegex(CatError, "cat_busy"):
            self.cat.read("FA")
        with self.assertRaisesRegex(PttError, "lease_expired"):
            self.ptt.operate({"operation": "renew", "lease_id": "x" * 43})
        self.ptt.operate({"operation": "renew", "lease_id": result["lease_id"]})
        self.arm()
        self.assertEqual(self.port.tx, 0)
        self.assertEqual(self.cat.read("FA")["frequency_hz"], 14_250_000)
        with self.assertRaisesRegex(PttError, "repeated"):
            self.start()

    def test_every_documented_guard_rejects_before_any_tx_on(self):
        cases = (
            ("tx", 2),
            ("tuner", b"AC003;"),
            ("level", 40),
            ("transmitter", 1),
            ("split", 1),
            ("vfo", False),
            ("tx_clarifier", 1),
            ("shift", 1),
        )
        for field, invalid in cases:
            with self.subTest(field=field):
                self.arm()
                before = getattr(self.port, field)
                setattr(self.port, field, invalid)
                with self.assertRaises(PttError):
                    self.start(f"ptt-guard-{field}-0001")
                setattr(self.port, field, before)
        for frequency, mode in ((14_199_999, b"2"), (14_250_000, b"3")):
            self.arm()
            self.port.frequency[b"FA"] = frequency
            self.port.modes[b"MD0"] = mode
            with self.assertRaises(PttError):
                self.start(f"ptt-guard-frequency-{frequency}-{mode.decode()}")
            self.port.frequency[b"FA"], self.port.modes[b"MD0"] = 14_250_000, b"2"
        self.assertNotIn(b"TX1;", self.port.writes)

    def test_cancelled_delayed_start_and_uncertain_start_never_retry_tx_on(self):
        self.ptt.operate(
            {
                "operation": "stop",
                "cancel_request_id": "ptt-cancelled-start-0001",
            }
        )
        with self.assertRaisesRegex(PttError, "cancelled"):
            self.start("ptt-cancelled-start-0001")
        self.port.ignore_start = True
        with self.assertRaisesRegex(PttError, "unconfirmed"):
            self.start()
        self.assertEqual(self.port.writes.count(b"TX1;"), 1)
        self.assertEqual(self.port.tx, 0)
        self.assertFalse(self.ptt.snapshot()["lease_active"])

    def test_failed_stop_retains_exclusive_channel_until_rx_is_confirmed(self):
        self.arm()
        self.start()
        self.port.ignore_stop = True
        with self.assertRaisesRegex(PttError, "unconfirmed"):
            self.arm()
        self.assertTrue(self.ptt.snapshot()["stop_failed"])
        with self.assertRaisesRegex(CatError, "cat_busy"):
            self.cat.read("FA")
        self.port.ignore_stop = False
        deadline = time.monotonic() + 1
        while self.ptt.snapshot()["stop_failed"] and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertFalse(self.ptt.snapshot()["stop_failed"])
        self.assertEqual(self.port.tx, 0)

    def test_watchdog_stops_real_elapsed_lease_and_cannot_resurrect_it(self):
        self.arm()
        result = self.start()
        started = time.monotonic()
        while self.port.tx and time.monotonic() - started < 3:
            time.sleep(0.02)
        elapsed = time.monotonic() - started
        self.assertGreaterEqual(elapsed, 1.9)
        self.assertLess(elapsed, 3)
        self.assertEqual(self.port.tx, 0)
        with self.assertRaisesRegex(PttError, "lease_expired"):
            self.ptt.operate({"operation": "renew", "lease_id": result["lease_id"]})

    def test_maximum_duration_survives_renewals_and_local_changes_force_rx(self):
        self.ptt.config = PttConfig(True, 14_200_000, 14_300_000, 30, 1)
        self.arm()
        result = self.start()
        started = time.monotonic()
        while time.monotonic() - started < 0.8:
            self.ptt.operate({"operation": "renew", "lease_id": result["lease_id"]})
            time.sleep(0.15)
        while self.port.tx and time.monotonic() - started < 1.8:
            time.sleep(0.02)
        self.assertEqual(self.port.tx, 0)
        self.assertLess(time.monotonic() - started, 1.8)
        self.arm()
        result = self.start("ptt-second-start-request-0001")
        self.port.level = 40
        with self.assertRaisesRegex(PttError, "power_limit"):
            self.ptt.operate({"operation": "renew", "lease_id": result["lease_id"]})
        self.assertEqual(self.port.tx, 0)

    def test_late_tx_setter_echo_is_not_readback_and_shutdown_requests_rx(self):
        self.arm()
        self.port.late_echo = True
        with self.assertRaises(PttError):
            self.start()
        self.port.late_echo = False
        self.arm()
        self.start("ptt-close-start-request-0001")
        self.ptt.close()
        self.assertEqual(self.port.tx, 0)
        self.assertFalse(self.ptt._thread.is_alive())
