"""One bounded COM19 identity query; never imports production transports."""

import argparse
import binascii
import hashlib
import json
import struct
import time
from datetime import datetime, timezone
from pathlib import Path

KEY = bytes.fromhex("16 6c 14 e6 2e 91 0d 40 21 35 d5 40 13 03 e9 80")
TIMEOUT = 4.0
MAX_RX = 256


def extract_identity_frame(data):
    """Match the host connector's AB CD sync search, with a finite byte budget."""
    if len(data) > MAX_RX:
        raise ValueError("Receive byte budget exceeded")
    offset = data.find(b"\xab\xcd")
    if offset < 0 or len(data) < offset + 4:
        return None
    size = struct.unpack_from("<H", data, offset + 2)[0]
    if size != 40:
        raise ValueError("Unexpected identity frame size after synchronization")
    if len(data) < offset + size + 8:
        return None
    return bytes(data[offset:offset + size + 8]), offset


def identity_frame(timestamp):
    body = struct.pack("<HHI", 0x0514, 4, timestamp)
    crc = binascii.crc_hqx(body, 0)
    encoded = bytes(b ^ KEY[i % 16] for i, b in enumerate(body + struct.pack("<H", crc)))
    return b"\xab\xcd\x08\x00" + encoded + b"\xdc\xba"


def validate_identity(frame):
    if len(frame) < 12 or frame[:2] != b"\xab\xcd" or frame[-2:] != b"\xdc\xba":
        raise ValueError("Invalid frame delimiters or incomplete frame")
    size = struct.unpack_from("<H", frame, 2)[0]
    if size != 40 or len(frame) != size + 8:
        raise ValueError("Unexpected identity reply length (expected 48 bytes)")
    body = bytes(b ^ KEY[i % 16] for i, b in enumerate(frame[4:-2]))
    opcode, length = struct.unpack_from("<HH", body)
    if opcode != 0x0515 or length != 36:
        raise ValueError("Unexpected reply opcode or declared data length")
    crc = struct.unpack_from("<H", body, size)[0]
    if crc != 0xFFFF and crc != binascii.crc_hqx(body[:size], 0):
        raise ValueError("Invalid reply CRC")
    version_bytes = body[4:20].split(b"\0", 1)[0]
    if not version_bytes or any(b < 32 or b > 126 for b in version_bytes):
        raise ValueError("Invalid firmware version text")
    return {
        "opcode": "0x0515",
        "frame_length": len(frame),
        "data_length": length,
        "crc": "ffff_protocol_marker" if crc == 0xFFFF else "calculated_crc_valid",
        "version": version_bytes.decode("ascii"),
        "sha256": hashlib.sha256(frame).hexdigest(),
    }


def run(output):
    import serial

    output = output.resolve()
    root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
    if not output.is_relative_to(root.resolve()):
        raise ValueError("Evidence must be under ignored tmp/radio-functional-tests")
    output.mkdir(parents=True, exist_ok=False)
    frame = identity_frame(int(time.time() * 1000) & 0xFFFFFFFF)
    record = {
        "date_utc": datetime.now(timezone.utc).isoformat(),
        "target_evidence": "User physically confirmed Quansheng cable on COM19",
        "reported_firmware": "Bricohams SAT; version and physical mode not supplied",
        "changed_condition": "Bounded AB CD synchronization matches quansheng-connector.js receiveResponse; prior harness rejected any leading noise",
        "initial_physical_radio_state": "Not directly observable; firmware/mode unknown",
        "port": "COM19",
        "settings": {"baud": 38400, "data_bits": 8, "parity": "none", "stop_bits": 1,
                     "dtr": False, "rts": False, "rtscts": False, "dsrdtr": False,
                     "xonxoff": False, "exclusive_windows_handle": True},
        "runtime": {"pyserial": serial.VERSION},
        "allowlist": [{"opcode": "0x0514", "frame_hex": frame.hex(" "),
                       "expected_reply": "0x0515, 48 bytes, data length 36",
                       "reason": "Documented version/session query, no persistent write",
                       "timeout_seconds": TIMEOUT, "rx_byte_limit": MAX_RX, "attempts": 1}],
        "tx_completed_bytes": 0, "write_calls_attempted": 0, "rx_bytes": 0,
        "result": "preflight", "closed": False,
        "challenge_data": "Discarded; no raw RX payload saved",
    }
    log = output / "result.json"

    def save():
        log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    save()  # Persist target, exact allowlist and settings before any port open.
    port = serial.Serial(port=None, baudrate=38400, bytesize=8, parity="N",
                         stopbits=1, timeout=0.1, write_timeout=1,
                         rtscts=False, dsrdtr=False, xonxoff=False)
    port.dtr = False
    port.rts = False
    port.port = "COM19"
    received = bytearray()
    started = None
    try:
        port.open()
        record["opened"] = True
        record["control_lines_configured_after_open"] = {"dtr": port.dtr, "rts": port.rts}
        record["write_calls_attempted"] = 1
        save()
        written = port.write(frame)
        record["tx_completed_bytes"] = written
        if written != len(frame):
            raise RuntimeError("Short identity query write; no retry")
        deadline = time.monotonic() + TIMEOUT
        started = time.monotonic()
        parsed = None
        while time.monotonic() < deadline:
            received.extend(port.read(1))
            parsed = extract_identity_frame(received)
            if parsed:
                break
            if len(received) >= MAX_RX:
                raise ValueError("Receive byte budget exhausted before identity frame")
        if parsed is None:
            raise TimeoutError("Identity response incomplete after 4 seconds; no retry")
        reply, offset = parsed
        record["preamble_discarded_bytes"] = offset
        record["response"] = validate_identity(reply)
        record["result"] = "validated_identity_reply_only"
    except (serial.SerialException, OSError, ValueError, RuntimeError) as error:
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
    return 0 if record["result"] == "validated_identity_reply_only" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    raise SystemExit(run(parser.parse_args().output))
