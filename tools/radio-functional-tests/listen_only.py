"""Bounded receive-only COM19 diagnostic; records no serial payload."""

import argparse
import hashlib
import json
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

WINDOW_SECONDS = 5.0
MAX_RX = 128
MAX_HEADERS = 4


def run(output):
    import serial

    output = output.resolve()
    root = Path(__file__).resolve().parents[2] / "tmp" / "radio-functional-tests"
    if not output.is_relative_to(root.resolve()):
        raise ValueError("Evidence must be under ignored tmp/radio-functional-tests")
    output.mkdir(parents=True, exist_ok=False)
    record = {
        "date_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "Receive-only link/startup-byte diagnostic after identity timeout",
        "port": "COM19",
        "settings": {"baud": 38400, "data_bits": 8, "parity": "none", "stop_bits": 1,
                     "dtr": False, "rts": False, "rtscts": False, "dsrdtr": False,
                     "xonxoff": False, "exclusive_windows_handle": True},
        "runtime": {"pyserial": serial.VERSION},
        "transmit_calls": 0,
        "rx_bytes": 0,
        "first_rx_prefix_hex": None,
        "outer_headers_hex": [],
        "result": "preflight",
        "closed": False,
    }
    log = output / "listen.json"

    def save():
        log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    save()
    port = serial.Serial(port=None, baudrate=38400, bytesize=8, parity="N",
                         stopbits=1, timeout=0.1, write_timeout=1,
                         rtscts=False, dsrdtr=False, xonxoff=False)
    port.dtr = False
    port.rts = False
    port.port = "COM19"
    prefix = bytearray()
    rolling = deque(maxlen=4)
    headers = []
    digest = hashlib.sha256()
    count = 0
    started = None
    try:
        port.open()
        record["opened"] = True
        record["control_lines_configured_after_open"] = {"dtr": port.dtr, "rts": port.rts}
        record["result"] = "listening"
        save()
        deadline = time.monotonic() + WINDOW_SECONDS
        started = time.monotonic()
        while time.monotonic() < deadline and count < MAX_RX:
            data = port.read(1)
            if not data:
                continue
            byte = data[0]
            count += 1
            digest.update(data)
            if len(prefix) < 4:
                prefix.append(byte)
            rolling.append(byte)
            if (len(rolling) == 4 and rolling[0] == 0xAB and rolling[1] == 0xCD
                    and len(headers) < MAX_HEADERS):
                headers.append(bytes(rolling).hex(" "))
        record["rx_bytes"] = count
        record["rx_sha256"] = digest.hexdigest()
        record["first_rx_prefix_hex"] = prefix.hex(" ") if prefix else None
        record["outer_headers_hex"] = headers
        record["result"] = "completed"
    except (serial.SerialException, OSError) as error:
        record["result"] = "stopped"
        record["error_type"] = type(error).__name__
        record["error"] = str(error)
    finally:
        if started is not None:
            record["elapsed_ms"] = round((time.monotonic() - started) * 1000, 2)
        try:
            port.close()
        finally:
            record["closed"] = not port.is_open
            save()
    print(json.dumps(record, indent=2))
    return 0 if record["result"] == "completed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    raise SystemExit(run(parser.parse_args().output))
