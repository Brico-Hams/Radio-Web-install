import binascii
import contextlib
import io
import json
import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import check_cat_query_contract as contract
from identify_readonly import KEY
from read_sat_status import decode_cat_status, frame


def reply(sequence, status, *, capabilities=7, flags=0, frequency=0, version=1):
    return frame(0x7B01, struct.pack("<BBHIII", version, status, sequence,
                                   capabilities, frequency, flags))


class ContractTests(unittest.TestCase):
    def test_exact_allowlist_operation_zero_and_request_crc(self):
        for version, operation, seq, frequency, status in contract.CASES:
            packet = contract.request_frame(seq)
            self.assertEqual(len(packet), 20)
            body = bytes(b ^ KEY[i % 16] for i, b in enumerate(packet[4:-2]))
            self.assertEqual(struct.unpack_from("<HHBBHI", body),
                             (0x7B00, 8, version, 0, seq, frequency))
            self.assertEqual(struct.unpack_from("<H", body, 12)[0],
                             binascii.crc_hqx(body[:12], 0))
            self.assertEqual(operation, 0)
        for sequence in (0, 5, 65535):
            with self.assertRaises(ValueError):
                contract.request_frame(sequence)

    def test_only_exact_case_rejections_pass_and_old_status_parser_stays_strict(self):
        for seq, status in ((1, 0), (2, 3), (3, 2), (4, 0)):
            self.assertEqual(contract.decode_contract_reply(reply(seq, status), seq)["status"], status)
            for wrong in (s for s in range(7) if s != status):
                with self.assertRaises(ValueError):
                    contract.decode_contract_reply(reply(seq, wrong), seq)
        for seq, status in ((2, 3), (3, 2)):
            with self.assertRaises(ValueError):
                decode_cat_status(reply(seq, status), seq)

    def test_reject_bad_envelope_crc_sequence_capabilities_and_state(self):
        packet = reply(2, 3)
        corrupt = bytearray(packet)
        corrupt[-4] ^= 1
        invalid = (packet[:-1], bytes(corrupt), reply(3, 3), reply(2, 3, version=0),
                   reply(2, 3, capabilities=3), reply(2, 3, flags=8),
                   reply(2, 3, frequency=1), reply(2, 3, flags=1),
                   frame(0x7B00, bytes(16)), frame(0x7B01, bytes(15)),
                   contract.request_frame(2))
        for data in invalid:
            with self.subTest(length=len(data)):
                with self.assertRaises(ValueError):
                    contract.decode_contract_reply(data, 2)
        marker_body = bytearray(b ^ KEY[i % 16] for i, b in enumerate(packet[4:-2]))
        marker_body[-2:] = b"\xff\xff"
        encoded = bytes(b ^ KEY[i % 16] for i, b in enumerate(marker_body))
        self.assertEqual(contract.decode_contract_reply(packet[:4] + encoded + packet[-2:], 2)["crc"],
                         "ffff_protocol_marker")

    def run_fake(self, replies, *, short_write=False, open_error=False, timeout=False):
        events = []

        class FakePort:
            is_open = False

            def __init__(self, **settings):
                self.dtr = self.rts = False
                self.settings = settings
                self.sent = []
                self.data = bytearray()

            def open(self):
                assert self.port == "COM18" and self.dtr and not self.rts
                assert self.settings["baudrate"] == 38400
                assert not any(self.settings[k] for k in ("rtscts", "dsrdtr", "xonxoff"))
                events.append("open")
                if open_error:
                    raise OSError("mock busy port")
                self.is_open = True

            def write(self, data):
                self.sent.append(bytes(data))
                assert data == contract.request_frame(len(self.sent))
                events.append("write")
                self.data = bytearray(replies[len(self.sent) - 1])
                return len(data) - int(short_write)

            def read(self, size):
                assert size == 1
                return bytes([self.data.pop(0)]) if self.data else b""

            def close(self):
                self.is_open = False
                events.append("close")

        root = contract.ROOT / "tmp" / "radio-functional-tests"
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            output = Path(tmp) / "offline"
            with patch.object(contract.serial, "Serial", FakePort), \
                    patch.object(contract, "prior_identity_is_valid", return_value=True), \
                    contextlib.redirect_stdout(io.StringIO()):
                if timeout:
                    ticks = iter(i * 0.4 for i in range(100))
                    with patch.object(contract.time, "monotonic", lambda: next(ticks)):
                        code = contract.run(output)
                else:
                    code = contract.run(output)
            record = json.loads((output / "result.json").read_text())
        return code, record, events

    def test_single_session_four_requests_and_unchanged_state(self):
        code, record, events = self.run_fake([reply(s, r) for s, r in ((1, 0), (2, 3), (3, 2), (4, 0))])
        self.assertEqual(code, 0)
        self.assertEqual(events, ["open"] + ["write"] * 4 + ["close"])
        self.assertTrue(record["closed"])
        self.assertEqual(record["tx_completed_bytes"], 80)
        self.assertEqual(record["rx_bytes"], 112)
        self.assertEqual(record["baseline_state"], record["final_state"])
        self.assertTrue(all(t["result"] == "pass" for t in record["tests"]))

    def test_unexpected_error_stops_remaining_and_closes(self):
        code, record, events = self.run_fake([reply(1, 0), reply(2, 0)])
        self.assertEqual(code, 1)
        self.assertEqual(events, ["open", "write", "write", "close"])
        self.assertEqual(record["state_comparison"], "pending")
        self.assertFalse(any(t["result"] == "pass" for t in record["tests"]))
        self.assertTrue(record["closed"])

    def test_state_change_and_active_baseline_stop(self):
        for replies, writes in (
            ([reply(1, 0, flags=1, frequency=14500000)], 1),
            ([reply(1, 0), reply(2, 3), reply(3, 2), reply(4, 0, flags=1, frequency=14500000)], 4),
        ):
            code, record, events = self.run_fake(replies)
            self.assertEqual(code, 1)
            self.assertEqual(events.count("write"), writes)
            self.assertTrue(record["closed"])
            self.assertNotEqual(record["result"], "validated_query_contract")

    def test_short_write_open_failure_timeout_and_byte_limit_close_without_retry(self):
        for replies, options, writes in (
            ([b""], {"short_write": True}, 1),
            ([], {"open_error": True}, 0),
            ([b""], {"timeout": True}, 1),
            ([b"x" * 128], {}, 1),
        ):
            code, record, events = self.run_fake(replies, **options)
            self.assertEqual(code, 1)
            self.assertEqual(events.count("write"), writes)
            self.assertTrue(record["closed"])
            self.assertLessEqual(record["rx_bytes"], 128)

    def test_missing_identity_blocks_before_open(self):
        with patch.object(contract, "prior_identity_is_valid", return_value=False), \
                patch.object(contract.serial, "Serial") as serial_class:
            with self.assertRaises(ValueError):
                contract.run(contract.ROOT / "tmp" / "radio-functional-tests" / "not-created")
            serial_class.assert_not_called()


if __name__ == "__main__":
    unittest.main()
