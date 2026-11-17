"""One fixed read-only Bricohams CAT RX status query on USB CDC COM18."""

import argparse
import binascii
import hashlib
import json
import struct
import time
from datetime import datetime, timezone
from pathlib import Path

import serial

from identify_readonly import KEY

PORT = "COM18"
BAUD = 38400
TIMEOUT = 1.5
MAX_RX = 128
IDENTITY_LOG = Path("tmp/radio-functional-tests/2026-11-02T1122-USB-COM18-bc25/result.json")


def frame(command, payload):
    size = (len(payload) + 5) & ~1
    body = bytearray(size + 2)
    struct.pack_into("<HH", body, 0, command, len(payload))
    body[4:4 + len(payload)] = payload
    struct.pack_into("<H", body, size, binascii.crc_hqx(body[:size], 0))
    encoded = bytes(value ^ KEY[index % 16] for index, value in enumerate(body))
    return b"\xab\xcd" + struct.pack("<H", size) + encoded + b"\xdc\xba"


def cat_query_frame(sequence=1):
    if not 0 < sequence <= 0xFFFF:
        raise ValueError("Fixed CAT query sequence out of range")
    return frame(0x7B00, struct.pack("<BBHI", 1, 0, sequence, 0))


def decode_cat_reply(packet, expected_sequence):
    if len(packet) < 12 or packet[:2] != b"\xab\xcd" or packet[-2:] != b"\xdc\xba":
        raise ValueError("Invalid CAT reply delimiters")
    size = struct.unpack_from("<H", packet, 2)[0]
    if size != 20 or len(packet) != size + 8:
        raise ValueError("Unexpected CAT reply frame length")
    body = bytes(value ^ KEY[index % 16] for index, value in enumerate(packet[4:-2]))
    command, data_length = struct.unpack_from("<HH", body)
    if command != 0x7B01 or data_length != 16:
        raise ValueError("Unexpected CAT reply opcode or payload length")
    crc = struct.unpack_from("<H", body, size)[0]
    if crc != 0xFFFF and crc != binascii.crc_hqx(body[:size], 0):
        raise ValueError("Invalid CAT reply CRC")
    data = body[4:20]
    version, status = data[0], data[1]
    sequence = struct.unpack_from("<H", data, 2)[0]
    capabilities, frequency, flags = struct.unpack_from("<III", data, 4)
    valid_frequency = 13600000 <= frequency <= 17400000 or 40000000 <= frequency <= 47000000
    if version != 1 or sequence != expected_sequence:
        raise ValueError("CAT version/sequence rejected")
    if capabilities != 7 or flags > 7:
        raise ValueError("Unknown CAT capabilities or state flags")
    if (flags & 1 and not valid_frequency) or (not flags & 1 and (frequency != 0 or flags != 0)):
        raise ValueError("Inconsistent CAT active/frequency state")
    return {
        "opcode": "0x7B01", "frame_length": len(packet), "data_length": data_length,
        "crc": "ffff_protocol_marker" if crc == 0xFFFF else "calculated_crc_valid",
        "version": version, "status": status, "sequence": sequence,
        "capabilities": capabilities, "active": bool(flags & 1),
        "remote": bool(flags & 2), "pending": bool(flags & 4),
        "applied_frequency_10hz": frequency if flags & 1 else None,
    }


def decode_cat_status(packet, expected_sequence=1):
    result = decode_cat_reply(packet, expected_sequence)
    if result["status"] != 0:
        raise ValueError("CAT status rejected")
    return result


def prior_identity_is_valid(path):
    path = path.resolve()
    root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
    if not path.is_relative_to(root.resolve()):
        raise ValueError("Identity evidence must be under ignored tmp/radio-functional-tests")
    prior = json.loads(path.read_text(encoding="utf-8"))
    return (
        prior.get("port") == PORT
        and prior.get("transport") == "USB CDC; not CH340 jack"
        and prior.get("result") == "validated_identity_reply"
        and prior.get("response", {}).get("version") == "F4HWN v6.1.0"
        and prior.get("response", {}).get("opcode") == "0x0515"
        and prior.get("closed") is True
    )


def run(output):
    output = output.resolve()
    root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
    if not output.is_relative_to(root.resolve()):
        raise ValueError("Evidence must be under ignored tmp/radio-functional-tests")
    if not prior_identity_is_valid(IDENTITY_LOG):
        raise ValueError("Validated COM18 F4HWN v6.1.0 identity is required")
    output.mkdir(parents=True, exist_ok=False)
    request = cat_query_frame()
    record = {
        "date_utc": datetime.now(timezone.utc).isoformat(),
        "port": PORT, "transport": "USB CDC", "prior_identity": "F4HWN v6.1.0 validated on COM18",
        "settings": {"baud": BAUD, "data_bits": 8, "parity": "none", "stop_bits": 1,
                     "dtr": True, "rts": False, "rtscts": False, "dsrdtr": False,
                     "xonxoff": False, "exclusive_windows_handle": True},
        "allowlist": [{"opcode": "0x7B00", "operation": 0, "sequence": 1,
                       "frequency_10hz": 0, "frame_hex": request.hex(" "),
                       "expected_reply": "0x7B01, payload 16, CAT v1, status 0, matching sequence, capabilities 7",
                       "reason": "Source-reviewed pure CAT RX status/capability query; operation 0 does not mutate receiver state",
                       "timeout_seconds": TIMEOUT, "rx_byte_limit": MAX_RX, "attempts": 1}],
        "tx_completed_bytes": 0, "write_calls_attempted": 0, "rx_bytes": 0,
        "result": "preflight", "closed": False,
    }
    log = output / "result.json"

    def save():
        log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    save()
    port = serial.Serial(port=None, baudrate=BAUD, bytesize=8, parity="N",
                         stopbits=1, timeout=0.1, write_timeout=1,
                         rtscts=False, dsrdtr=False, xonxoff=False)
    port.dtr = True
    port.rts = False
    port.port = PORT
    received = bytearray()
    started = None
    try:
        port.open()
        record["opened"] = True
        record["control_lines_configured_after_open"] = {"dtr": port.dtr, "rts": port.rts}
        record["write_calls_attempted"] = 1
        save()
        written = port.write(request)
        record["tx_completed_bytes"] = written
        if written != len(request):
            raise RuntimeError("Short CAT status query write; no retry")
        record["usb_padding_bytes"] = 0
        started = time.monotonic()
        deadline = started + TIMEOUT
        parsed = None
        while time.monotonic() < deadline and len(received) < MAX_RX:
            received.extend(port.read(1))
            if len(received) >= 4:
                # Reuse the identity synchronizer's bounded prefix search, then enforce
                # this endpoint's exact expected outer frame size below.
                offset = received.find(b"\xab\xcd")
                if offset >= 0 and len(received) >= offset + 4:
                    size = struct.unpack_from("<H", received, offset + 2)[0]
                    if size != 20:
                        raise ValueError("Unexpected CAT reply frame size")
                    if len(received) >= offset + size + 8:
                        parsed = bytes(received[offset:offset + size + 8])
                        break
        if parsed is None:
            if len(received) >= MAX_RX:
                raise ValueError("CAT receive byte budget exhausted")
            raise TimeoutError("CAT status response incomplete; no retry")
        record["preamble_discarded_bytes"] = received.find(b"\xab\xcd")
        record["response"] = decode_cat_status(parsed)
        record["result"] = "validated_sat_status"
    except (serial.SerialException, OSError, ValueError, RuntimeError, TimeoutError) as error:
        record["result"] = "stopped"
        record["error_type"] = type(error).__name__
        record["error"] = str(error)
    finally:
        if started is not None:
            record["elapsed_read_ms"] = round((time.monotonic() - started) * 1000, 2)
        record["rx_bytes"] = len(received)
        record["rx_sha256"] = hashlib.sha256(received).hexdigest()
        try:
            port.close()
        finally:
            record["closed"] = not port.is_open
            save()
    print(json.dumps(record, indent=2))
    return 0 if record["result"] == "validated_sat_status" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    raise SystemExit(run(parser.parse_args().output))
