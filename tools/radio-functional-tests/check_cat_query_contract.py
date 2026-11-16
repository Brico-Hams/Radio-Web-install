"""Four fixed operation-0 CAT queries, one session, on authorized USB CDC COM18."""

import argparse
import hashlib
import json
import struct
import time
from datetime import datetime, timezone
from pathlib import Path

import serial

from read_sat_status import (
    BAUD, IDENTITY_LOG, MAX_RX, PORT, TIMEOUT,
    decode_cat_reply, frame, prior_identity_is_valid,
)

# (version, operation, sequence, frequency, exact expected status)
CASES = ((1, 0, 1, 0, 0), (0, 0, 2, 0, 3),
         (1, 0, 3, 1, 2), (1, 0, 4, 0, 0))
STATE_KEYS = ("version", "capabilities", "active", "remote", "pending",
              "applied_frequency_10hz")
ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILES = (
    "firmware/bricohams/cat_rx.c",
    "firmware/bricohams/cat_rx.h",
    "scripts/bricohams-modules.cjs",
    "Multiboot/Multiboot/Fusion61/App/app/uart.c",
)


def request_frame(sequence):
    case = next((case for case in CASES if case[2] == sequence), None)
    if case is None:
        raise ValueError("Only fixed contract cases 1 through 4 are allowed")
    return frame(0x7B00, struct.pack("<BBHI", *case[:4]))


def decode_contract_reply(packet, sequence):
    case = next((case for case in CASES if case[2] == sequence), None)
    if case is None:
        raise ValueError("Unknown contract case")
    result = decode_cat_reply(packet, sequence)
    if result["status"] != case[4]:
        raise ValueError("Reply does not match this case's exact documented status")
    return result


def state_snapshot(response):
    return {key: response[key] for key in STATE_KEYS}


def receive(port, received):
    deadline = time.monotonic() + TIMEOUT
    while time.monotonic() < deadline and len(received) < MAX_RX:
        received.extend(port.read(1))
        offset = received.find(b"\xab\xcd")
        if offset >= 0 and len(received) >= offset + 4:
            size = struct.unpack_from("<H", received, offset + 2)[0]
            if size != 20:
                raise ValueError("Unexpected CAT reply outer length")
            if len(received) >= offset + size + 8:
                return bytes(received[offset:offset + size + 8]), offset
    if len(received) >= MAX_RX:
        raise ValueError("CAT receive byte budget exhausted")
    raise TimeoutError("CAT contract response incomplete; no retry")


def run(output):
    output = output.resolve()
    if not output.is_relative_to((ROOT / "tmp" / "radio-functional-tests").resolve()):
        raise ValueError("Evidence must be under ignored tmp/radio-functional-tests")
    if not prior_identity_is_valid(IDENTITY_LOG):
        raise ValueError("Prior validated COM18 F4HWN v6.1.0 identity is required")
    output.mkdir(parents=True, exist_ok=False)
    record = {
        "date_utc": datetime.now(timezone.utc).isoformat(),
        "port": PORT, "transport": "USB CDC; user-selected same radio/session",
        "initial_state": "Previously queried inactive CAT; require fresh inactive baseline",
        "prior_identity": "F4HWN v6.1.0; exact running binary not established",
        "settings": {"baud": BAUD, "data_bits": 8, "parity": "none", "stop_bits": 1,
                     "dtr": True, "rts": False, "rtscts": False, "dsrdtr": False,
                     "xonxoff": False, "exclusive_windows_handle": True},
        "source_sha256": {
            name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
            for name in SOURCE_FILES
        },
        "allowlist": [
            {"opcode": "0x7B00", "version": v, "operation": op, "sequence": seq,
             "frequency_parameter_10hz": freq, "expected_status": status,
             "frame_hex": request_frame(seq).hex(" "), "expected_reply": "0x7B01, payload 16, CAT v1, matching sequence, capabilities 7",
             "reason": "Operation 0 has no receiver-state mutation; exact error contract",
             "timeout_seconds": TIMEOUT, "rx_byte_limit": MAX_RX, "attempts": 1}
            for v, op, seq, freq, status in CASES
        ],
        "tests": [], "result": "preflight", "closed": False,
        "write_calls_attempted": 0, "tx_completed_bytes": 0, "rx_bytes": 0,
        "usb_padding_bytes": 0, "state_comparison": "pending",
    }
    log = output / "result.json"

    def save():
        log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    save()
    port = serial.Serial(port=None, baudrate=BAUD, bytesize=8, parity="N",
                         stopbits=1, timeout=0.05, write_timeout=1,
                         rtscts=False, dsrdtr=False, xonxoff=False)
    baseline = None
    try:
        port.dtr = True
        port.rts = False
        port.port = PORT
        port.open()
        record["opened"] = True
        record["control_lines_after_open"] = {"dtr": port.dtr, "rts": port.rts}
        if not port.dtr or port.rts:
            raise RuntimeError("Unexpected CDC control-line policy")
        for _, _, sequence, _, expected in CASES:
            test = {"sequence": sequence, "expected_status": expected,
                    "result": "started"}
            record["tests"].append(test)
            received = bytearray()
            started = time.monotonic()
            try:
                request = request_frame(sequence)
                record["write_calls_attempted"] += 1
                save()
                written = port.write(request)
                record["tx_completed_bytes"] += written
                test["tx_bytes"] = written
                if written != len(request):
                    raise RuntimeError("Short CAT request write; no retry")
                reply, offset = receive(port, received)
                response = decode_contract_reply(reply, sequence)
                test["response"] = response
                test["preamble_discarded_bytes"] = offset
                state = state_snapshot(response)
                if baseline is None:
                    if any(response[k] for k in ("active", "remote", "pending")):
                        raise ValueError("Baseline CAT is not inactive; stop without further queries")
                    baseline = state
                    record["baseline_state"] = baseline
                elif state != baseline:
                    raise ValueError("Observed CAT state changed; stop remaining queries")
                test["result"] = "matched_expected_reply_state_unchanged"
            finally:
                test["elapsed_ms"] = round((time.monotonic() - started) * 1000, 2)
                test["rx_bytes"] = len(received)
                test["rx_sha256"] = hashlib.sha256(received).hexdigest()
                record["rx_bytes"] += len(received)
                save()
        record["final_state"] = state
        record["state_comparison"] = "equal_baseline_final_and_intermediate"
        record["result"] = "validated_query_contract"
        for test in record["tests"]:
            test["result"] = "pass"
    except (serial.SerialException, OSError, ValueError, RuntimeError) as error:
        record["result"] = "stopped"
        record["error_type"] = type(error).__name__
        record["error"] = str(error)
        if record["tests"]:
            record["tests"][-1]["result"] = "failed_stop_remaining"
    finally:
        try:
            port.close()
        finally:
            record["closed"] = not port.is_open
            save()
    print(json.dumps(record, indent=2))
    return 0 if record["result"] == "validated_query_contract" and record["closed"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    raise SystemExit(run(parser.parse_args().output))
