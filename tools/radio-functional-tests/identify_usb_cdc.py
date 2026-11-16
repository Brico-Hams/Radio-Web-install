"""One bounded read-only identity query on the user-confirmed USB CDC COM18."""

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import serial

from identify_readonly import extract_identity_frame, identity_frame, validate_identity

PORT = "COM18"
BAUD = 38400
TIMEOUT = 4.0
MAX_RX = 256


def run(output):
    output = output.resolve()
    root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
    if not output.is_relative_to(root.resolve()):
        raise ValueError("Evidence must be under ignored tmp/radio-functional-tests")
    output.mkdir(parents=True, exist_ok=False)
    frame = identity_frame(int(time.time() * 1000) & 0xFFFFFFFF)
    record = {
        "date_utc": datetime.now(timezone.utc).isoformat(),
        "target_evidence": "User physically confirmed COM18 USB-C belongs to same powered radio",
        "reported_firmware": "Bricohams SAT; exact version unknown",
        "port": PORT,
        "transport": "USB CDC; not CH340 jack",
        "settings": {"baud": BAUD, "data_bits": 8, "parity": "none", "stop_bits": 1,
                     "dtr": True, "rts": False, "rtscts": False, "dsrdtr": False,
                     "xonxoff": False, "exclusive_windows_handle": True},
        "runtime": {"pyserial": serial.VERSION},
        "control_line_source_policy": {
            "dtr": "Virtual CDC callback sets volatile dtr_enable for sends; no PTT/reset connection found",
            "rts": "Firmware weak callback is no-op",
            "padding": "16-byte request is not an exact 64-byte multiple; no extra byte",
        },
        "allowlist": [{"opcode": "0x0514", "frame_hex": frame.hex(" "),
                       "expected_reply": "0x0515, 48 bytes, data length 36, valid CRC policy and printable version",
                       "reason": "Documented read-only identity/session query",
                       "timeout_seconds": TIMEOUT, "rx_byte_limit": MAX_RX, "attempts": 1}],
        "tx_completed_bytes": 0, "write_calls_attempted": 0, "rx_bytes": 0,
        "result": "preflight", "closed": False,
        "challenge_data": "Discarded; only validated printable version retained",
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
        written = port.write(frame)
        record["tx_completed_bytes"] = written
        if written != len(frame):
            raise RuntimeError("Short identity query write; no retry")
        record["usb_padding_bytes"] = 0
        deadline = time.monotonic() + TIMEOUT
        started = time.monotonic()
        parsed = None
        while time.monotonic() < deadline and len(received) < MAX_RX:
            received.extend(port.read(1))
            parsed = extract_identity_frame(received)
            if parsed:
                break
        if parsed is None:
            if len(received) >= MAX_RX:
                raise ValueError("Receive byte budget exhausted before identity frame")
            raise TimeoutError("Identity response incomplete after 4 seconds; no retry")
        reply, offset = parsed
        record["preamble_discarded_bytes"] = offset
        record["response"] = validate_identity(reply)
        record["rx_bytes"] = len(received)
        record["rx_sha256"] = hashlib.sha256(received).hexdigest()
        record["result"] = "validated_identity_reply"
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
    return 0 if record["result"] == "validated_identity_reply" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    raise SystemExit(run(parser.parse_args().output))
