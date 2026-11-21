import socket
import struct
import time
import unittest
from unittest.mock import patch

from bricoham_station_agent.wsjtx import WsjtxReceiver, parse_packet


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
