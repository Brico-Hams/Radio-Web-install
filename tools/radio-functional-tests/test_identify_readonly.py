import binascii
import contextlib
import io
import json
import struct
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from identify_readonly import KEY, MAX_RX, extract_identity_frame, identity_frame, run, validate_identity
from listen_only import run as listen_only
import identify_usb_cdc
import read_sat_status


def reply(opcode=0x0515, length=36, crc_marker=True):
    body = struct.pack("<HH", opcode, length) + b"F4HWN v6.1.0\0".ljust(16, b"\0") + bytes(20)
    crc = 0xFFFF if crc_marker else binascii.crc_hqx(body, 0)
    encoded = bytes(b ^ KEY[i % 16] for i, b in enumerate(body + struct.pack("<H", crc)))
    return b"\xab\xcd\x28\x00" + encoded + b"\xdc\xba"


def cat_reply(sequence=1, status=0, capabilities=7, frequency=0, flags=0, crc_marker=True):
    data = struct.pack("<BBHIII", 1, status, sequence, capabilities, frequency, flags)
    body = struct.pack("<HH", 0x7B01, len(data)) + data
    crc = 0xFFFF if crc_marker else binascii.crc_hqx(body, 0)
    encoded = bytes(b ^ KEY[i % 16] for i, b in enumerate(body + struct.pack("<H", crc)))
    return b"\xab\xcd\x14\x00" + encoded + b"\xdc\xba"


class ProtocolTests(unittest.TestCase):
    def test_cat_status_reply_validation_and_request_contract(self):
        request = read_sat_status.cat_query_frame()
        self.assertEqual(len(request), 20)
        body = bytes(b ^ KEY[i % 16] for i, b in enumerate(request[4:-2]))
        self.assertEqual(struct.unpack_from("<HH", body), (0x7B00, 8))
        self.assertEqual(body[4:12], bytes.fromhex("01 00 01 00 00 00 00 00"))
        for marker in (True, False):
            result = read_sat_status.decode_cat_status(cat_reply(crc_marker=marker))
            self.assertEqual(result["capabilities"], 7)
            self.assertFalse(result["active"])
            self.assertIsNone(result["applied_frequency_10hz"])
        for packet in (cat_reply(sequence=2), cat_reply(status=1), cat_reply(capabilities=3),
                       cat_reply(flags=1), cat_reply()[:-1]):
            with self.subTest(packet_length=len(packet)):
                with self.assertRaises(ValueError):
                    read_sat_status.decode_cat_status(packet)

    def test_cat_status_harness_requires_verified_usb_identity_and_never_tunes(self):
        events = []
        expected_reply = cat_reply()

        class FakePort:
            is_open = False

            def __init__(self, **settings):
                self.dtr = self.rts = False
                self.settings = settings
                self.sent = []
                self.data = iter(expected_reply)

            def open(self):
                assert self.port == "COM18" and self.dtr and not self.rts
                self.is_open = True
                events.append("open")

            def write(self, data):
                self.sent.append(bytes(data))
                events.append("write")
                return len(data)

            def read(self, size):
                try:
                    return bytes([next(self.data)])
                except StopIteration:
                    return b""

            def close(self):
                self.is_open = False
                events.append("close")

        root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            base = Path(tmp)
            identity = base / "identity.json"
            identity.write_text(json.dumps({
                "port": "COM18", "transport": "USB CDC; not CH340 jack",
                "result": "validated_identity_reply", "response": {
                    "version": "F4HWN v6.1.0", "opcode": "0x0515"
                }, "closed": True
            }))
            output = base / "status"
            fake = SimpleNamespace(Serial=FakePort, SerialException=OSError, VERSION="fake")
            with patch.dict("sys.modules", {"serial": fake}), \
                    patch.object(read_sat_status, "serial", fake), \
                    patch.object(read_sat_status, "IDENTITY_LOG", identity), \
                    contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(read_sat_status.run(output), 0)
            result = json.loads((output / "result.json").read_text())
            self.assertEqual(result["result"], "validated_sat_status")
            self.assertEqual(result["response"]["capabilities"], 7)
            self.assertEqual(result["tx_completed_bytes"], 20)
            self.assertEqual(result["usb_padding_bytes"], 0)
            self.assertTrue(result["closed"])
            self.assertEqual(events, ["open", "write", "close"])

    def test_usb_cdc_identity_uses_virtual_dtr_no_rts_and_no_padding(self):
        events = []
        expected_reply = reply(crc_marker=True)

        class FakePort:
            is_open = False

            def __init__(self, **settings):
                self.dtr = self.rts = False
                self.settings = settings
                self.sent = []
                self.data = iter(expected_reply)

            def open(self):
                assert self.port == "COM18" and self.dtr and not self.rts
                assert not any(self.settings[k] for k in ("rtscts", "dsrdtr", "xonxoff"))
                self.is_open = True
                events.append("open")

            def write(self, data):
                self.sent.append(bytes(data))
                events.append("write")
                return len(data)

            def read(self, size):
                try:
                    return bytes([next(self.data)])
                except StopIteration:
                    return b""

            def close(self):
                self.is_open = False
                events.append("close")

        root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            output = Path(tmp) / "usb"
            with patch.object(identify_usb_cdc.serial, "Serial", FakePort), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(identify_usb_cdc.run(output), 0)
            result = json.loads((output / "result.json").read_text())
            self.assertEqual(result["port"], "COM18")
            self.assertTrue(result["settings"]["dtr"])
            self.assertFalse(result["settings"]["rts"])
            self.assertEqual(result["tx_completed_bytes"], 16)
            self.assertEqual(result["usb_padding_bytes"], 0)
            self.assertEqual(result["response"]["version"], "F4HWN v6.1.0")
            self.assertNotIn("challenge", result["response"])
            self.assertTrue(result["closed"])
            self.assertEqual(events, ["open", "write", "close"])

    def test_receive_only_listen_never_writes_and_caps_header_capture(self):
        events = []

        class FakePort:
            is_open = False

            def __init__(self, **settings):
                self.dtr = self.rts = True
                self.settings = settings
                self.data = iter(b"\xab\xcd\x28\x00\x11\x22\x33\x44")

            def open(self):
                assert self.port == "COM19" and not self.dtr and not self.rts
                assert not any(self.settings[k] for k in ("rtscts", "dsrdtr", "xonxoff"))
                self.is_open = True
                events.append("open")

            def write(self, data):
                events.append("write")
                raise AssertionError("Receive-only listen must never write")

            def read(self, size):
                try:
                    return bytes([next(self.data)])
                except StopIteration:
                    return b""

            def close(self):
                self.is_open = False
                events.append("close")

        root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            output = Path(tmp) / "listen"
            fake = SimpleNamespace(Serial=FakePort, SerialException=OSError, VERSION="fake")
            ticks = iter(i * 0.5 for i in range(32))
            with patch.dict("sys.modules", {"serial": fake}), patch("listen_only.time.monotonic", lambda: next(ticks)), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(listen_only(output), 0)
            result = json.loads((output / "listen.json").read_text())
            self.assertEqual(result["rx_bytes"], 8)
            self.assertEqual(result["first_rx_prefix_hex"], "ab cd 28 00")
            self.assertEqual(result["outer_headers_hex"], ["ab cd 28 00"])
            self.assertEqual(result["transmit_calls"], 0)
            self.assertTrue(result["closed"])
            self.assertEqual(events, ["open", "close"])

    def test_bad_reply_stops_after_one_write_and_closes(self):
        events = []

        class FakePort:
            is_open = False

            def __init__(self, **settings):
                self.dtr = self.rts = True
                self.data = iter(b"\xab\xcd\xff\xff")
                self.settings = settings

            def open(self):
                assert self.port == "COM19" and not self.dtr and not self.rts
                assert not any(self.settings[k] for k in ("rtscts", "dsrdtr", "xonxoff"))
                self.is_open = True
                events.append("open")

            def write(self, data):
                events.append("write")
                return len(data)

            def read(self, size):
                return bytes([next(self.data)])

            def close(self):
                self.is_open = False
                events.append("close")

        root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            output = Path(tmp) / "offline"
            fake = SimpleNamespace(Serial=FakePort, SerialException=OSError, VERSION="fake")
            with patch.dict("sys.modules", {"serial": fake}), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(run(output), 1)
            result = json.loads((output / "result.json").read_text())
            self.assertTrue(result["closed"])
            self.assertEqual(result["rx_bytes"], 4)
            self.assertEqual(events, ["open", "write", "close"])

    def test_bounded_sync_with_preamble_and_split_header(self):
        frame = reply()
        self.assertIsNone(extract_identity_frame(b"noise\xab"))
        self.assertIsNone(extract_identity_frame(b"noise" + frame[:12]))
        self.assertEqual(extract_identity_frame(b"noise" + frame), (frame, 5))
        self.assertEqual(extract_identity_frame(b"\xab" + frame), (frame, 1))
        with self.assertRaises(ValueError):
            extract_identity_frame(bytes(MAX_RX + 1))
        with self.assertRaises(ValueError):
            extract_identity_frame(b"noise\xab\xcd\xff\xff")

    def test_request_only_identification_and_crc(self):
        frame = identity_frame(0x04030201)
        body = bytes(b ^ KEY[i % 16] for i, b in enumerate(frame[4:-2]))
        self.assertEqual(frame[:4], bytes.fromhex("ab cd 08 00"))
        self.assertEqual(frame[-2:], bytes.fromhex("dc ba"))
        self.assertEqual(body[:8], bytes.fromhex("14 05 04 00 01 02 03 04"))
        self.assertEqual(struct.unpack_from("<H", body, 8)[0], binascii.crc_hqx(body[:8], 0))

    def test_reply_crc_modes_and_no_challenge_output(self):
        for marker in (True, False):
            result = validate_identity(reply(crc_marker=marker))
            self.assertEqual(result["version"], "F4HWN v6.1.0")
            self.assertNotIn("challenge", result)

    def test_reject_malformed_protocol(self):
        frame = reply(crc_marker=False)
        corrupt = bytearray(frame)
        corrupt[24] ^= 1
        invalid = [b"", frame[:-1], b"\0" + frame[1:], frame[:-2] + b"\0\0",
                   frame[:2] + b"\x29\0" + frame[4:], reply(opcode=0x0518),
                   reply(length=35), bytes(corrupt)]
        for data in invalid:
            with self.subTest(length=len(data)):
                with self.assertRaises(ValueError):
                    validate_identity(data)


if __name__ == "__main__":
    unittest.main()
