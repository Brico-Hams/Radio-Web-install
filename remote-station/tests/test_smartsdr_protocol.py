import re
import struct
import unittest
from collections import deque

from bricoham_remote_station.drivers.smartsdr_protocol import (
    MAX_SMARTSDR_SEQUENCE,
    Cmd,
    SmartSdrCommandError,
    SmartSdrError,
    SmartSdrReadCommand,
    SmartSdrSession,
    build_query,
    decode_meter_payload,
    describe_error,
    normalize_meters,
    parse_discovery_packet,
    parse_discovery_string,
    parse_legacy_discovery,
    parse_line,
    parse_meter_list,
    parse_pgxl_status,
    parse_response,
    scale_meter,
)

DISCOVERY = (
    "model=FLEX-6600 serial=1234-5678-6600-0001 version=3.4.1.2 name=Shack_Radio "
    "callsign=EA1ABC ip=192.168.1.50 port=4992"
)
METER_LIST = (
    "meter 1.src=TX-#1.num=1#1.nam=FWDPWR#1.low=0.0#1.hi=53.0#1.unit=dBm#1.fps=40"
    "#2.nam=SWR#2.low=1.0#2.hi=999.0#2.unit=SWR#2.fps=40"
    "#3.nam=ALC#3.low=-150.0#3.hi=20.0#3.unit=dBFS#3.fps=40"
    "#4.nam=PATEMP#4.low=-40.0#4.hi=150.0#4.unit=degC#4.fps=10"
    "#5.nam=+13.8A#5.low=0.0#5.hi=20.0#5.unit=Volts#5.fps=10"
)


def vita_packet(payload: bytes, class_word=None, timestamps=False) -> bytes:
    payload += b"\x00" * (-len(payload) % 4)
    header_words = [0x800]  # stream ID
    flags = 3 << 28
    if class_word is not None:
        flags |= 1 << 27
        header_words += [0x00001C2D, class_word]
    if timestamps:
        flags |= 3 << 22 | 1 << 20
        header_words += [1, 2, 3]
    size = 1 + len(header_words) + len(payload) // 4
    words = [flags | size] + header_words
    return struct.pack(f">{len(words)}I", *words) + payload


def meter_word(meter_id: int, value: int) -> bytes:
    return struct.pack(">I", meter_id << 16 | (value & 0xFFFF))


class Clock:
    t = 100.0

    def __call__(self) -> float:
        return self.t


class FakeTransport:
    def __init__(self, clock: Clock, replies=None) -> None:
        self.clock = clock
        self.sent: list[str] = []
        self.lines: deque[bytes] = deque()
        self.replies = replies or {}
        self.closed = False

    def send(self, data: bytes) -> None:
        sequence, command = re.match(r"C(\d+)\|(.*)\n", data.decode()).groups()
        self.sent.append(command)
        code, message = self.replies.get(command, ("0", ""))
        self.lines.append(f"R{sequence}|{code}|{message}".encode())

    def recv_line(self, timeout: float):
        if self.lines:
            return self.lines.popleft()
        self.clock.t += timeout
        return None

    def close(self) -> None:
        self.closed = True


def make_session(**kwargs):
    clock = Clock()
    transport = FakeTransport(clock, kwargs.pop("replies", None))
    session = SmartSdrSession(transport, clock=clock, **kwargs)
    session.meters = parse_meter_list(METER_LIST)
    return session, transport, clock


class SmartSdrFlexTests(unittest.TestCase):
    def test_discovery_string_and_vita_packet(self) -> None:
        radio = parse_discovery_string(DISCOVERY)
        self.assertEqual((radio.model, radio.name, radio.ip, radio.port), ("FLEX-6600", "Shack Radio", "192.168.1.50", 4992))
        packet = vita_packet(DISCOVERY.encode(), class_word=0x534CFFFF, timestamps=True)
        self.assertEqual(parse_discovery_packet(packet), radio)
        with self.assertRaises(ValueError):
            parse_discovery_packet(vita_packet(DISCOVERY.encode(), class_word=0x12345678))
        with self.assertRaises(ValueError):
            parse_discovery_string("model=FLEX-6600 serial=1 ip=999.1.1.1 port=4992")

    def test_legacy_discovery_header_only(self) -> None:
        legacy = parse_legacy_discovery(struct.pack(">IHHI", 0xC0A80132, 4992, 1, 0xFFFFFF00))
        self.assertEqual((legacy["ip"], legacy["port"], legacy["radios"]), ("192.168.1.50", 4992, 1))
        self.assertFalse(legacy["verified"])

    def test_line_kinds(self) -> None:
        self.assertEqual(parse_line(b"V1.4.0.0\n"), ("version", "1.4.0.0"))
        self.assertEqual(parse_line(b"H1A2B3C4D\n"), ("handle", 0x1A2B3C4D))
        kind, reply = parse_line(b"R5|50000033|out of range\n")
        self.assertEqual((kind, reply.sequence, reply.error_code), ("reply", 5, 0x50000033))
        self.assertEqual(describe_error(0x50000033), "out of range")
        kind, status = parse_line(b"S0|slice 0 RF_frequency=14.200000 mode=USB\n")
        self.assertEqual((status.handle, status.object, status.ids), (0, "slice", ("0",)))
        self.assertEqual(status.fields, {"RF_frequency": "14.200000", "mode": "USB"})
        kind, message = parse_line(b"M01000007|Careful\n")
        self.assertEqual((message.severity, message.text), ("warning", "Careful"))
        self.assertEqual(parse_line(b"M03000001|x\n")[1].severity, "fatal")

    def test_meter_list_packet_and_normalization(self) -> None:
        meters = parse_meter_list(METER_LIST)
        self.assertEqual(meters[1].name, "FWDPWR")
        self.assertEqual((meters[2].low, meters[2].high), (1.0, 999.0))
        self.assertEqual(meters[5].name, "+13.8A")
        payload = b"".join([meter_word(1, 5120), meter_word(2, 192), meter_word(3, -2560), meter_word(9, 1)])
        self.assertEqual(decode_meter_payload(payload)[2], (3, -2560))
        self.assertEqual(scale_meter(-2560, "dBFS"), (-20.0, True))
        self.assertEqual(scale_meter(192, "SWR"), (1.5, False))
        session, _, _ = make_session()
        normalized = session.ingest_meter_packet(vita_packet(payload))
        self.assertEqual(normalized["po"], 10.0)
        self.assertEqual(normalized["swr"], 1.5)
        self.assertEqual(normalized["alc"], 0.1)
        self.assertIn("SWR", normalized["unverified"])
        self.assertEqual(normalize_meters({})["po"], None)

    def test_out_of_range_meter_is_rejected(self) -> None:
        session, _, _ = make_session()
        session.ingest_meter_packet(vita_packet(meter_word(1, 20000)))
        self.assertEqual(session.rejected_meters, 1)
        self.assertNotIn("FWDPWR", session.readings)

    def test_command_builders_are_allowlisted(self) -> None:
        self.assertEqual(Cmd.slice_tune(0, 14.2), "slice tune 0 14.200000")
        self.assertEqual(Cmd.slice_set_mode(1, "digu"), "slice set 1 mode=digu")
        self.assertEqual(Cmd.slice_set_rit(0, True, 150), "slice set 0 rit_on=1 rit_freq=150")
        self.assertEqual(Cmd.transmit_set(rfpower=50, tunepower=10), "transmit set rfpower=50 tunepower=10")
        self.assertEqual(Cmd.amplifier_operate("1A2B", False), "amplifier set 1A2B operate=0")
        self.assertEqual(Cmd.stream_remote_audio_rx("opus"), "stream create type=remote_audio_rx compression=opus")
        for bad in (lambda: Cmd.transmit_set(max_power_level=100), lambda: Cmd.transmit_set(rfpower=101),
                    lambda: Cmd.slice_set_mode(0, "fm"), lambda: Cmd.subscribe("evil"),
                    lambda: Cmd.amplifier_operate("1;rm", True)):
            with self.assertRaises(ValueError):
                bad()

    def test_pgxl_status(self) -> None:
        self.assertEqual(parse_pgxl_status("state=STANDBY")["state"], "STANDBY")
        with self.assertRaises(ValueError):
            parse_pgxl_status("hello")

    def test_setup_sets_interlock_to_tx_cap_and_matches_sequences(self) -> None:
        session, transport, _ = make_session(replies={"meter list": ("0", METER_LIST)}, tx_cap_s=12)
        transport.lines.extend([b"V3.4.1.2", b"H0000ABCD", b"S0|slice 0 mode=USB"])
        session.handshake()
        session.connect_setup(udp_port=4993)
        self.assertEqual((session.version, session.handle), ("3.4.1.2", 0xABCD))
        self.assertIn("interlock timeout=12000", transport.sent)
        self.assertEqual(transport.sent[:2], ["client gui", "client udpport 4993"])
        self.assertEqual(session.status[("slice", ("0",))]["mode"], "USB")
        self.assertEqual(transport.sent[-1], "sub meter all")

    def test_command_error_raises(self) -> None:
        session, _, _ = make_session(replies={"slice remove 3": ("5000000D", "")})
        with self.assertRaises(SmartSdrCommandError):
            session.command(Cmd.slice_remove(3))

    def test_tx_is_off_by_default_and_limited(self) -> None:
        session, transport, _ = make_session()
        with self.assertRaises(SmartSdrError):
            session.tune_start(10)
        self.assertEqual(transport.sent, [])
        session, transport, _ = make_session(allow_tx=True, tune_limit=20)
        with self.assertRaises(SmartSdrError):
            session.tune_start(21)
        with self.assertRaises(SmartSdrError):
            session.amplifier_operate("1A", True)
        self.assertEqual(transport.sent, [])

    def test_tune_is_time_capped_and_unkeyed(self) -> None:
        session, transport, clock = make_session(allow_tx=True, tx_cap_s=30)
        session.tune_start(10)
        self.assertEqual(transport.sent, ["transmit set tunepower=10", "transmit tune on"])
        clock.t += 31
        session.tick()
        self.assertEqual(transport.sent[-1], "transmit tune off")
        self.assertIsNone(session.tx_deadline)

    def test_unverified_tx_off_is_reported(self) -> None:
        session, _, _ = make_session(allow_tx=True, replies={"transmit tune off": ("50000042", "")})
        session.tune_start(5)
        self.assertFalse(session.unkey())
        self.assertTrue(session.tx_off_unverified)

    def test_high_swr_trips_and_blocks(self) -> None:
        session, transport, clock = make_session(allow_tx=True, swr_limit=3.0, swr_trip_s=1.0)
        session.tune_start(10)
        high = vita_packet(meter_word(2, 512))  # 4.0
        session.ingest_meter_packet(high)
        self.assertFalse(session.swr_tripped)
        clock.t += 1.0
        session.ingest_meter_packet(high)
        self.assertTrue(session.swr_tripped)
        self.assertEqual(transport.sent[-1], "transmit tune off")
        with self.assertRaises(SmartSdrError):
            session.tune_start(10)

    def test_close_unkeys_and_sets_amplifier_standby(self) -> None:
        session, transport, _ = make_session(allow_tx=True, allow_amplifier_operate=True)
        session.amplifier_operate("1A", True)
        session.close()
        self.assertEqual(transport.sent[-2:], ["transmit tune off", "amplifier set 1A operate=0"])
        self.assertTrue(transport.closed)


class SmartSdrProtocolTests(unittest.TestCase):
    def test_only_info_query_is_encoded_with_a_bounded_sequence(self) -> None:
        self.assertEqual(build_query(SmartSdrReadCommand.INFO, 16), b"C16|info\n")
        for sequence in (-1, MAX_SMARTSDR_SEQUENCE + 1, True):
            with self.subTest(sequence=sequence), self.assertRaises(ValueError):
                build_query(SmartSdrReadCommand.INFO, sequence)
        with self.assertRaises(ValueError):
            build_query("xmit", 16)

    def test_parses_documented_success_response_and_preserves_info_message(self) -> None:
        response = parse_response(
            b'R16|0|model="FLEX-6700",software_ver=0.0.3,mac=00:18:31:78:4F:B4\r\n',
            expected_sequence=16,
        )
        self.assertTrue(response.succeeded)
        self.assertEqual(response.error_code, 0)
        self.assertIn('model="FLEX-6700"', response.message)

    def test_parses_nonzero_hex_error_code(self) -> None:
        response = parse_response(b"R7|0000000A|denied\n", expected_sequence=7)
        self.assertFalse(response.succeeded)
        self.assertEqual(response.error_code, 10)

    def test_rejects_mismatched_malformed_and_oversized_responses(self) -> None:
        malformed = (
            b"S16|slice 0",
            b"R17|0|wrong sequence\n",
            b"R16|xyz|bad code\n",
            b"R16|100000000|wide code\n",
            b"R16|0|embedded\nline\n",
            b"R16|0|non-ascii-\xff\n",
            b"R16|0|missing terminator",
            b"R16|0|two terminators\n\n",
            b"R16|0|" + b"x" * 16_384 + b"\n",
        )
        for frame in malformed:
            with self.subTest(frame=frame[:32]), self.assertRaises(ValueError):
                parse_response(frame, expected_sequence=16)


if __name__ == "__main__":
    unittest.main()
