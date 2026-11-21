import socket
import struct
import time
import unittest
from unittest.mock import patch

from bricoham_station_agent.wsjtx import WsjtxError, WsjtxReceiver, parse_packet


def text(value: str | None) -> bytes:
    if value is None:
        return struct.pack(">I", 0xFFFFFFFF)
    encoded = value.encode("utf-8")
    return struct.pack(">I", len(encoded)) + encoded


def packet(kind: int, payload: bytes = b"", identity: str = "WSJT-X") -> bytes:
    return struct.pack(">III", 0xADBCCBDA, 3, kind) + text(identity) + payload


def status_packet() -> bytes:
    return packet(
        1,
        struct.pack(">Q", 14_074_000)
        + b"".join(text(value) for value in ("FT8", "N0CALL", "-10", "FT8"))
        + b"\x00\x00\x01"
        + struct.pack(">II", 1500, 1700)
        + text("EA1ABC")
        + text("IN70")
        + text("AA00"),
    )


def decode_packet() -> bytes:
    return packet(
        2,
        b"\x01"
        + struct.pack(">IidI", 43_200_000, -12, 0.2, 1500)
        + text("~")
        + text("CQ N0CALL AA00")
        + b"\x01\x01",
    )


class WsjtxTests(unittest.TestCase):
    def test_opt_in_commands_use_observed_schema_and_pin_instance_endpoint(self) -> None:
        for schema in (2, 3):
            with self.subTest(schema=schema):
                identity = "WSJT-X-é"
                receiver = WsjtxReceiver(0, identity, commands_enabled=True)
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
                    try:
                        sender.settimeout(1)
                        address = ("127.0.0.1", receiver.port)
                        header = struct.pack(">III", 0xADBCCBDA, schema, 0)
                        sender.sendto(
                            header
                            + text(identity)
                            + struct.pack(">I", schema)
                            + text("2.7")
                            + text("test"),
                            address,
                        )
                        deadline = time.monotonic() + 1
                        while not receiver.snapshot()["commands_ready"]:
                            if time.monotonic() >= deadline:
                                self.fail("WSJT-X peer was not received")
                            time.sleep(0.01)
                        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as other:
                            other.sendto(packet(6, identity=identity), address)
                            deadline = time.monotonic() + 1
                            while not receiver.snapshot()["ignored_packets"]:
                                if time.monotonic() >= deadline:
                                    self.fail("Second endpoint was not rejected")
                                time.sleep(0.01)
                        for operation, kind, suffix in (
                            ("replay", 7, b""),
                            ("halt_tx", 8, b"\x00"),
                        ):
                            result = receiver.operate(
                                {
                                    "operation": operation,
                                    "request_id": f"wsjtx-{operation}-0001",
                                }
                            )
                            received, source = sender.recvfrom(1024)
                            self.assertEqual(
                                received,
                                struct.pack(">III", 0xADBCCBDA, schema, kind)
                                + text(identity)
                                + suffix,
                            )
                            self.assertEqual(source, address)
                            self.assertEqual(result["delivery"], "sent_unconfirmed")
                            self.assertFalse(result["transmission_stopped_confirmed"])
                        with self.assertRaisesRegex(WsjtxError, "request_repeated"):
                            receiver.operate(
                                {
                                    "operation": "halt_tx",
                                    "request_id": "wsjtx-halt_tx-0001",
                                }
                            )
                        with self.assertRaisesRegex(WsjtxError, "replay_rate_limited"):
                            receiver.operate(
                                {
                                    "operation": "replay",
                                    "request_id": "wsjtx-replay-0002",
                                }
                            )
                        sender.settimeout(0.05)
                        with self.assertRaises(TimeoutError):
                            sender.recvfrom(1024)
                    finally:
                        receiver.close()

    def test_commands_reject_invalid_disabled_stale_closed_and_failed_delivery(self) -> None:
        operation = {"operation": "halt_tx", "request_id": "halt-request-test-0001"}
        receiver = WsjtxReceiver(0, "WSJT-X")
        try:
            with self.assertRaisesRegex(WsjtxError, "commands_disabled"):
                receiver.operate(operation)
            for invalid in (
                {"operation": "reply", "request_id": "halt-request-test-0001"},
                {**operation, "endpoint": "192.0.2.1"},
                {**operation, "request_id": "short"},
            ):
                with self.assertRaises(ValueError):
                    receiver.operate(invalid)
        finally:
            receiver.close()
        receiver = WsjtxReceiver(0, "WSJT-X", commands_enabled=True)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
            try:
                with self.assertRaisesRegex(WsjtxError, "instance_unavailable"):
                    receiver.operate(operation)
                sender.sendto(status_packet(), ("127.0.0.1", receiver.port))
                deadline = time.monotonic() + 1
                while not receiver.snapshot()["commands_ready"]:
                    if time.monotonic() >= deadline:
                        self.fail("WSJT-X peer was not received")
                    time.sleep(0.01)
                with patch(
                    "bricoham_station_agent.wsjtx.time.monotonic",
                    return_value=time.monotonic() + 61,
                ):
                    with self.assertRaisesRegex(WsjtxError, "instance_unavailable"):
                        receiver.operate(operation)
                with patch("socket.socket.sendto", side_effect=OSError("private detail")):
                    with self.assertLogs("bricoham.station_agent.wsjtx", level="WARNING"):
                        with self.assertRaisesRegex(WsjtxError, "command_io_failed"):
                            receiver.operate(operation)
                with self.assertRaisesRegex(WsjtxError, "request_repeated"):
                    receiver.operate(operation)
                sender.sendto(packet(6), ("127.0.0.1", receiver.port))
                deadline = time.monotonic() + 1
                while receiver.snapshot()["last_message_type"] != 6:
                    if time.monotonic() >= deadline:
                        self.fail("WSJT-X close was not received")
                    time.sleep(0.01)
                with self.assertRaisesRegex(WsjtxError, "instance_unavailable"):
                    receiver.operate({**operation, "request_id": "halt-request-test-0002"})
                sender.settimeout(0.05)
                with self.assertRaises(TimeoutError):
                    sender.recvfrom(1024)
            finally:
                receiver.close()

    def test_status_and_decode_parse_documented_fields_not_tx_commands(self) -> None:
        kind, identity, status = parse_packet(status_packet() + b"\x00")
        self.assertEqual((kind, identity), (1, "WSJT-X"))
        self.assertEqual(status["dial_frequency_hz"], 14_074_000)
        self.assertFalse(status["transmitting_in_wsjtx"])
        decoded = parse_packet(decode_packet())[2]
        self.assertEqual(decoded["snr_db"], -12)
        self.assertEqual(decoded["message"], "CQ N0CALL AA00")
        self.assertTrue(decoded["low_confidence"])
        self.assertTrue(decoded["off_air"])
        self.assertIsNone(parse_packet(decode_packet()[:-1])[2]["off_air"])
        schema2 = status_packet()[:4] + struct.pack(">I", 2) + status_packet()[8:]
        self.assertEqual(parse_packet(schema2)[2]["dial_frequency_hz"], 14_074_000)
        heartbeat = packet(0, struct.pack(">I", 3) + text("2.7") + text("revision"))
        schema2_heartbeat = heartbeat[:4] + struct.pack(">I", 2) + heartbeat[8:]
        self.assertEqual(parse_packet(schema2_heartbeat)[2]["version"], "2.7")
        with self.assertRaises(ValueError):
            parse_packet(packet(0))

    def test_malformed_headers_strings_bool_and_truncated_packets_fail(self) -> None:
        for data in (
            b"",
            b"\x00" * 20,
            struct.pack(">III", 0xADBCCBDA, 1, 1) + text("WSJT-X"),
            status_packet()[:-1],
            packet(2, b"\x02"),
            struct.pack(">III", 0xADBCCBDA, 3, 0) + struct.pack(">I", 2049),
            packet(0, b"\x00" * 9000),
        ):
            with self.subTest(data=data[:16]), self.assertRaises(ValueError):
                parse_packet(data)

    def test_real_loopback_udp_filters_instances_caps_history_and_marks_stale(self) -> None:
        receiver = WsjtxReceiver(0, "WSJT-X")
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            address = ("127.0.0.1", receiver.port)
            for data in (
                b"invalid",
                packet(6, identity="another"),
                packet(8),
                status_packet(),
                *([decode_packet()] * 105),
            ):
                sender.sendto(data, address)
                time.sleep(0.001)
            sender.sendto(packet(8), address)
            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                state = receiver.snapshot()
                if len(state["decodes"]) == 100 and state["ignored_packets"] >= 3:
                    break
                time.sleep(0.01)
            self.assertTrue(state["connected"])
            self.assertEqual(state["status"]["dial_frequency_hz"], 14_074_000)
            self.assertEqual(len(state["decodes"]), 100)
            self.assertGreaterEqual(state["invalid_packets"], 1)
            self.assertGreaterEqual(state["ignored_packets"], 2)
            self.assertFalse(state["commands_enabled"])
            with patch(
                "bricoham_station_agent.wsjtx.time.monotonic", return_value=time.monotonic() + 61
            ):
                self.assertFalse(receiver.snapshot()["connected"])
            sender.settimeout(0.05)
            with self.assertRaises(TimeoutError):
                sender.recvfrom(1024)
        finally:
            sender.close()
            receiver.close()

    def test_clear_and_close_do_not_invent_live_status(self) -> None:
        receiver = WsjtxReceiver(0, "WSJT-X")
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            for data in (status_packet(), decode_packet(), packet(3), packet(6)):
                sender.sendto(data, ("127.0.0.1", receiver.port))
                time.sleep(0.01)
            deadline = time.monotonic() + 1
            while time.monotonic() < deadline and receiver.snapshot()["last_message_type"] != 6:
                time.sleep(0.01)
            state = receiver.snapshot()
            self.assertFalse(state["connected"])
            self.assertIsNone(state["status"])
            self.assertEqual(state["decodes"], [])
        finally:
            sender.close()
            receiver.close()

    def test_close_cannot_be_reopened_by_late_decode_or_clear(self) -> None:
        receiver = WsjtxReceiver(0, "WSJT-X", commands_enabled=True)
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            address = ("127.0.0.1", receiver.port)
            for data in (status_packet(), packet(6), decode_packet(), packet(3)):
                sender.sendto(data, address)
            deadline = time.monotonic() + 2
            while receiver.snapshot()["ignored_packets"] < 2:
                if time.monotonic() >= deadline:
                    self.fail("Late datagrams were not processed")
                time.sleep(0.01)
            state = receiver.snapshot()
            self.assertFalse(state["connected"])
            self.assertFalse(state["commands_ready"])
            self.assertIsNone(state["status"])
            self.assertIsNone(state["status_age_seconds"])
            self.assertEqual(state["decodes"], [])
            with self.assertRaisesRegex(WsjtxError, "instance_unavailable"):
                receiver.operate({"operation": "halt_tx", "request_id": "closed-session-0001"})
            sender.sendto(packet(0, struct.pack(">I", 3) + text("2.7") + text("test")), address)
            deadline = time.monotonic() + 2
            while not receiver.snapshot()["commands_ready"]:
                if time.monotonic() >= deadline:
                    self.fail("New heartbeat did not restore the pinned instance")
                time.sleep(0.01)
            self.assertIsNone(receiver.snapshot()["status_age_seconds"])
        finally:
            sender.close()
            receiver.close()

    def test_closed_history_is_preserved_until_valid_session_reopens(self) -> None:
        heartbeat = packet(0, struct.pack(">I", 3) + text("2.7") + text("test"))
        for reopening in (heartbeat, status_packet()):
            with self.subTest(message_type=int.from_bytes(reopening[8:12], "big")):
                receiver = WsjtxReceiver(0, "WSJT-X", commands_enabled=True)
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
                    try:
                        address = ("127.0.0.1", receiver.port)
                        for data in (status_packet(), decode_packet(), packet(6)):
                            sender.sendto(data, address)
                        deadline = time.monotonic() + 2
                        while receiver.snapshot()["last_message_type"] != 6:
                            if time.monotonic() >= deadline:
                                self.fail("WSJT-X close not received")
                            time.sleep(0.01)
                        closed = receiver.snapshot()
                        self.assertFalse(closed["connected"])
                        self.assertEqual(len(closed["decodes"]), 1)
                        self.assertIsNone(closed["status"])
                        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as other:
                            other.sendto(reopening, address)
                            deadline = time.monotonic() + 2
                            while receiver.snapshot()["ignored_packets"] == 0:
                                if time.monotonic() >= deadline:
                                    self.fail("Unpinned reopening was not rejected")
                                time.sleep(0.01)
                        self.assertEqual(len(receiver.snapshot()["decodes"]), 1)
                        sender.sendto(reopening, address)
                        deadline = time.monotonic() + 2
                        while not receiver.snapshot()["connected"]:
                            if time.monotonic() >= deadline:
                                self.fail("Pinned reopening was not received")
                            time.sleep(0.01)
                        reopened = receiver.snapshot()
                        self.assertEqual(reopened["decodes"], [])
                        self.assertEqual(
                            reopened["status"] is not None, reopening == status_packet()
                        )
                        sender.sendto(decode_packet(), address)
                        deadline = time.monotonic() + 2
                        while len(receiver.snapshot()["decodes"]) != 1:
                            if time.monotonic() >= deadline:
                                self.fail("New session decode was not received")
                            time.sleep(0.01)
                    finally:
                        receiver.close()

    def test_receive_only_session_also_drops_history_on_reopening(self) -> None:
        receiver = WsjtxReceiver(0, "WSJT-X")
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
            try:
                address = ("127.0.0.1", receiver.port)
                for data in (status_packet(), decode_packet(), packet(6)):
                    sender.sendto(data, address)
                deadline = time.monotonic() + 2
                while receiver.snapshot()["last_message_type"] != 6:
                    if time.monotonic() >= deadline:
                        self.fail("WSJT-X close not received")
                    time.sleep(0.01)
                self.assertEqual(len(receiver.snapshot()["decodes"]), 1)
                sender.sendto(status_packet(), address)
                deadline = time.monotonic() + 2
                while not receiver.snapshot()["connected"]:
                    if time.monotonic() >= deadline:
                        self.fail("WSJT-X status not received")
                    time.sleep(0.01)
                self.assertEqual(receiver.snapshot()["decodes"], [])
                self.assertFalse(receiver.snapshot()["commands_ready"])
            finally:
                receiver.close()

    def test_status_age_does_not_refresh_on_heartbeat_or_decode(self) -> None:
        receiver = WsjtxReceiver(0, "WSJT-X")
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            address = ("127.0.0.1", receiver.port)
            sender.sendto(status_packet(), address)
            deadline = time.monotonic() + 2
            while receiver.snapshot()["status"] is None:
                if time.monotonic() >= deadline:
                    self.fail("WSJT-X status not received")
                time.sleep(0.01)
            with receiver._lock:
                receiver._status_seen -= 120
            sender.sendto(decode_packet(), address)
            deadline = time.monotonic() + 2
            while len(receiver.snapshot()["decodes"]) != 1:
                if time.monotonic() >= deadline:
                    self.fail("WSJT-X decode not received")
                time.sleep(0.01)
            state = receiver.snapshot()
            self.assertTrue(state["connected"])
            self.assertLess(state["last_seen_age_seconds"], 1)
            self.assertGreaterEqual(state["status_age_seconds"], 120)
            sender.sendto(status_packet(), address)
            deadline = time.monotonic() + 2
            while receiver.snapshot()["status_age_seconds"] >= 120:
                if time.monotonic() >= deadline:
                    self.fail("Updated status did not reset its age")
                time.sleep(0.01)
            self.assertLess(receiver.snapshot()["status_age_seconds"], 1)
        finally:
            sender.close()
            receiver.close()
