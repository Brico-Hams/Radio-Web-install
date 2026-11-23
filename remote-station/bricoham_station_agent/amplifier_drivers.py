# SPDX-License-Identifier: GPL-3.0-or-later
"""Linear amplifier drivers: Elecraft KPA, Expert/SPE, ACOM and Gemini.

Python mirror of station-amplifier-drivers.cjs. Every command and layout comes from a reference source
under data/third-party/refs (see docs/THIRD-PARTY-REUSE.md for the licences):
- Elecraft KPA: Hamlib amplifiers/elecraft/kpa.c, kpa1500.c (LGPL-2.1+, (c) 2019 Michael Black W9MDB).
- Expert/SPE: Hamlib amplifiers/expert/expert.c (LGPL-2.1+, (c) 2023 Michael Black W9MDB, (c) 2026 Mikael
  Nousiainen OH3BHX), macexpert-spe SPEProtocol.swift (MIT, (c) 2026 Manoj Ramawarrier VU2CPL) and
  SPE-1.3-2K-FA-Remote-server (GPL-3.0, OH2GEK).
- ACOM: ACOM-Controller MainWindow.xaml.cs (MIT, (c) 2019 Bjorn Ekelund).
- Gemini: Hamlib amplifiers/gemini/gemini.c (LGPL-2.1+).
All models are source-implemented but not hardware-tested.

Safety: the drivers never power an amplifier off, STANDBY is always read back (an unconfirmed STANDBY raises),
and the links are opened lazily, so constructing a driver never touches a port.
Transport contract: write(bytes), read(timeout) -> bytes (empty on timeout), flush(), close().
"""

from __future__ import annotations

import re
import socket
import time
from typing import Any, Callable

READ_TIMEOUT_S = 1.0
CONFIRM_READS = 3


class AmplifierError(Exception):
    pass


def read_until(transport: Any, is_complete: Callable[[bytes], Any], timeout: float = READ_TIMEOUT_S, max_reads: int = 64) -> Any:
    buffer = b""
    for _ in range(max_reads):
        chunk = transport.read(timeout)
        if not chunk:
            raise AmplifierError("amplifier timeout")
        buffer += bytes(chunk)
        result = is_complete(buffer)
        if result is not None:
            return result
    raise AmplifierError("amplifier timeout")


def _number(text: Any) -> float | None:
    try:
        return float(str(text).strip())
    except ValueError:
        return None


def _flush(transport: Any) -> None:
    if hasattr(transport, "flush"):
        transport.flush()


def _confirm_standby(read_operate: Callable[[], bool]) -> None:
    """Re-reads until the amplifier reports STANDBY; never sends another toggle."""
    for _ in range(CONFIRM_READS):
        if read_operate() is False:
            return
    raise AmplifierError("STANDBY not confirmed")


# ---------------------------------------------------------------- Elecraft KPA (Hamlib kpa.c / kpa1500.c)

# Hamlib kpa.c kpa_fault_list.
KPA_FAULTS = {
    0x10: "Watchdog Timer was reset", 0x20: "PA Current is too high", 0x40: "Temperature is too high",
    0x60: "Input power is too high", 0x61: "Gain is too low", 0x70: "Invalid frequency",
    0x80: "50V supply voltage too low or too high", 0x81: "5V supply voltage too low or too high",
    0x82: "10V supply voltage too low or too high", 0x83: "12V supply voltage too low or too high",
    0x84: "-12V supply voltage too low or too high", 0x85: "5V or 400V LPF board supply voltages not detected",
    0x90: "Reflected power is too high", 0x91: "SWR very high", 0x92: "ATU no match",
    0xB0: "Dissipated power too high", 0xC0: "Forward power too high",
    0xE0: "Forward power too high for current setting", 0xF0: "Gain is too high",
}


def parse_kpa_reply(text: str, command: str) -> float:
    match = re.fullmatch(rf"\^{command}(-?\d+(?:\.\d+)?);?", text.strip())
    if not match:
        raise AmplifierError(f"amplifier protocol: unexpected ^{command} reply")
    return float(match.group(1))


def kpa_fault_text(code: float) -> str | None:
    code = int(code)
    if code == 0:
        return None
    return KPA_FAULTS.get(code, f"Unknown fault code=0x{code:02x}")


class KpaDriver:
    id = "elecraft-kpa"

    def __init__(self, transport: Any, *, read_timeout: float = READ_TIMEOUT_S) -> None:
        self._transport = transport
        self._timeout = read_timeout

    def _read_semicolon(self) -> str:
        return read_until(self._transport, lambda buffer: buffer.decode("latin1") if b";" in buffer else None, self._timeout)

    def _wake(self) -> None:
        # Hamlib kpa_transaction: wake the amplifier with ';' until it echoes ';'.
        _flush(self._transport)
        for _ in range(3):
            self._transport.write(b";")
            if self._read_semicolon().strip() == ";":
                return

    def _ask(self, command: str) -> str:
        self._wake()
        self._transport.write(command.encode("latin1"))
        return self._read_semicolon().strip()

    def _send(self, command: str) -> None:
        self._wake()
        self._transport.write(command.encode("latin1"))
        self._wake()

    def _read_operate(self) -> bool:
        # ^ON is the power switch and ^OP the operate flag (kpa_get_powerstat); ^ON0 is never sent.
        if parse_kpa_reply(self._ask("^ON;"), "ON") == 0:
            return False
        reply = self._ask("^OP;")
        return parse_kpa_reply(re.sub(r"^\^OP", "^ON", reply), "ON") == 1

    def set_operate(self, on: bool) -> None:
        self._send("^OS1;" if on else "^OS0;")
        if not on:
            _confirm_standby(self._read_operate)

    def set_band(self, band: str, frequency_hz: float | None = None) -> None:
        if isinstance(frequency_hz, (int, float)):
            self._send(f"^FR{int(frequency_hz // 1000):05d};")

    def read(self) -> dict[str, Any]:
        operate = self._read_operate()
        swr = parse_kpa_reply(self._ask("^SW;"), "SW") / 10
        fault = kpa_fault_text(parse_kpa_reply(self._ask("^SF;"), "SF"))
        power_w = None
        try:
            power_w = parse_kpa_reply(self._ask("^PWF;"), "PWF")
        except AmplifierError:
            pass  # the forward power is informative only
        return {"operate": operate, "swr": swr, "fault": fault, "power_w": power_w, "temp_c": None}

    def close(self) -> None:
        if hasattr(self._transport, "close"):
            self._transport.close()


# ---------------------------------------------------------------- Expert / SPE (Hamlib expert.c, macexpert SPEProtocol.swift)

EXPERT_CMD_OPERATE = 0x0D
EXPERT_CMD_STATUS = 0x90
EXPERT_STATUS_LENGTH = 67
EXPERT_BANDS = ("160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m")


def build_expert_frame(data: list[int]) -> bytes:
    """Host frame: 55 55 55 CNT DATA... CHK (CHK = sum of DATA mod 256)."""
    return bytes([0x55, 0x55, 0x55, len(data), *data, sum(data) % 256])


def parse_expert_status(buffer: bytes) -> dict[str, Any] | None:
    """AA AA AA 43 <67 CSV bytes> CHKlo CHKhi ',' CR LF; returns None while the frame is incomplete."""
    start = buffer.find(b"\xaa\xaa\xaa")
    if start < 0 or len(buffer) < start + 4:
        return None
    length = buffer[start + 3]
    if length != EXPERT_STATUS_LENGTH:
        raise AmplifierError(f"amplifier protocol: status length {length}")
    end = start + 4 + length + 5
    if len(buffer) < end:
        return None
    data = buffer[start + 4:start + 4 + length]
    checksum = sum(data) & 0xFFFF
    if (checksum & 0xFF) != buffer[start + 4 + length] or (checksum >> 8) != buffer[start + 5 + length]:
        raise AmplifierError("amplifier protocol: status checksum")
    fields = [field.strip() for field in data.decode("latin1").split(",")]
    if len(fields) < 20 or fields[2] not in ("S", "O"):
        raise AmplifierError("amplifier protocol: status fields")
    warning, alarm = fields[18], fields[19]
    try:
        band = EXPERT_BANDS[int(fields[6])]
    except (ValueError, IndexError):
        band = None
    return {
        "id": fields[1], "operate": fields[2] == "O", "tx": fields[3] == "T", "band": band,
        "power_w": _number(fields[10]), "swr_atu": _number(fields[11]), "swr": _number(fields[12]),
        "temp_c": _number(fields[15]),
        "warning": None if warning in ("", "N") else f"warning {warning}",
        "fault": None if alarm in ("", "N") else f"alarm {alarm}",
    }


class ExpertDriver:
    id = "expert-spe"

    def __init__(self, transport: Any, *, read_timeout: float = READ_TIMEOUT_S) -> None:
        self._transport = transport
        self._timeout = read_timeout

    def read(self) -> dict[str, Any]:
        _flush(self._transport)
        self._transport.write(build_expert_frame([EXPERT_CMD_STATUS]))
        return read_until(self._transport, parse_expert_status, self._timeout)

    def _command(self, code: int) -> None:
        _flush(self._transport)
        self._transport.write(build_expert_frame([code]))

        def ack(buffer: bytes) -> bool | None:
            start = buffer.find(b"\xaa\xaa\xaa")
            if start < 0 or len(buffer) < start + 6:
                return None
            if buffer[start + 3] != 1 or buffer[start + 4] != buffer[start + 5]:
                raise AmplifierError("amplifier protocol: ack")
            return True

        read_until(self._transport, ack, self._timeout)

    def set_operate(self, on: bool) -> None:
        # 0x0D toggles OPERATE: only sent when the status shows the opposite state, at most once per call.
        if self.read()["operate"] == on:
            return
        self._command(EXPERT_CMD_OPERATE)
        if on:
            if self.read()["operate"] is not True:
                raise AmplifierError("OPERATE not confirmed")
            return
        _confirm_standby(lambda: self.read()["operate"])

    def close(self) -> None:
        if hasattr(self._transport, "close"):
            self._transport.close()


# ---------------------------------------------------------------- ACOM (ACOM-Controller MainWindow.xaml.cs)

ACOM_ENABLE_TELEMETRY = bytes([0x55, 0x92, 0x04, 0x15])
ACOM_DISABLE_TELEMETRY = bytes([0x55, 0x91, 0x04, 0x16])
ACOM_OPERATE = bytes([0x55, 0x81, 0x08, 0x02, 0x00, 0x06, 0x00, 0x1A])
ACOM_STANDBY = bytes([0x55, 0x81, 0x08, 0x02, 0x00, 0x05, 0x00, 0x1B])
ACOM_FRAME_LENGTH = 72
ACOM_STATES = {5: "STANDBY", 6: "RECEIVE", 7: "TRANSMIT", 10: "OFF"}
ACOM_BANDS = ("?m", "160m", "80m", "40/60m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m")
# Per model: temperature offset and whether the amplifier itself shows a temperature (Configuration()).
ACOM_MODELS = {
    "500S": (282, False), "600S": (273, True), "700S": (282, True), "1200S": (281, True), "2020S": (282, False),
}
_ACOM_ERRORS = {
    0x00: "Hot switching", 0x08: "Hot switching", 0x03: "Drive power at wrong time", 0x04: "Reflected power warning",
    0x05: "Reflected power warning", 0x06: "Drive power too high", 0x07: "Drive power too high",
    0x0C: "RF power at wrong time", 0x0E: "Stop transmission first", 0x0F: "Remove drive power",
    0x24: "Excessive PAM current", 0x25: "Excessive PAM current", 0x39: "Excessive PAM current",
    0x44: "Excessive PAM current", 0x45: "Excessive PAM current", 0x59: "Excessive PAM current", 0x70: "CAT error",
}


def acom_error_text(code: int) -> str | None:
    if code == 0xFF:
        return None
    return f"{_ACOM_ERRORS.get(code, 'ERROR - See display')} (0x{code:02x})"


def parse_acom_telemetry(buffer: bytes, model: str = "700S") -> dict[str, Any] | None:
    """72-byte frame starting 55 2F whose byte sum is 0 mod 256; returns the newest valid frame or None."""
    if model not in ACOM_MODELS:
        raise AmplifierError(f"unknown ACOM model {model}")
    temp_offset, shows_temp = ACOM_MODELS[model]
    found = None
    index = 0
    while index + ACOM_FRAME_LENGTH <= len(buffer):
        if buffer[index] == 0x55 and buffer[index + 1] == 0x2F:
            frame = buffer[index:index + ACOM_FRAME_LENGTH]
            if sum(frame) & 0xFF == 0:
                found = frame
                index += ACOM_FRAME_LENGTH
                continue
        index += 1
    if found is None:
        return None

    def word(offset: int) -> int:
        return found[offset] + found[offset + 1] * 256

    status = found[3] >> 4
    off = status == 10
    swr = word(26) / 100
    return {
        "state": ACOM_STATES.get(status, "UNKNOWN"),
        "operate": status in (6, 7),
        "tx": status == 7,
        "temp_c": None if off or not shows_temp else word(16) - temp_offset,
        "drive_w": None if off else word(20) / 10,
        "power_w": None if off else word(22),
        "reflected_w": None if off else word(24),
        "swr": None if off or swr == 0 else swr,
        "band": None if off else ACOM_BANDS[found[69] & 0x0F],
        # Every error or warning code counts as a fault: the safe answer is STANDBY.
        "fault": None if off else acom_error_text(found[66]),
    }


class AcomDriver:
    id = "acom"

    def __init__(self, transport: Any, *, model: str = "700S", read_timeout: float = READ_TIMEOUT_S) -> None:
        parse_acom_telemetry(b"", model)
        self._transport = transport
        self._model = model
        self._timeout = read_timeout
        self._enable = True

    def read(self) -> dict[str, Any]:
        if self._enable:
            self._transport.write(ACOM_ENABLE_TELEMETRY)
            self._enable = False
        try:
            return read_until(self._transport, lambda buffer: parse_acom_telemetry(buffer, self._model), self._timeout)
        except AmplifierError:
            self._enable = True
            raise

    def set_operate(self, on: bool) -> None:
        _flush(self._transport)
        self._transport.write(ACOM_OPERATE if on else ACOM_STANDBY)
        if not on:
            _confirm_standby(lambda: self.read()["operate"])

    def close(self) -> None:
        try:
            self._transport.write(ACOM_DISABLE_TELEMETRY)
        finally:
            if hasattr(self._transport, "close"):
                self._transport.close()


# ---------------------------------------------------------------- Gemini DX1200 / HF-1K (Hamlib gemini.c)

def parse_gemini_status(line: str) -> dict[str, Any]:
    """Comma separated KEY=value items in one line (gemini_parse_status_response)."""
    status: dict[str, Any] = {}
    for item in (part.strip() for part in re.split(r"[,\r\n]", line)):
        if "=" not in item:
            continue
        key, _, value = item.partition("=")
        key, value = key.upper(), value.strip()
        found = None
        if key == "BAND" and (found := re.match(r"([\d.]+)\s*([KkMm])", value)):
            status["band_hz"] = float(found.group(1)) * (1e3 if found.group(2).upper() == "K" else 1e6)
        elif key == "ANTENNA":
            status["antenna"] = value[:1]
        elif key == "POWER" and (found := re.match(r"(\d+)W(\d+)", value)):
            status["power_current_w"], status["power_peak_w"] = float(found.group(1)), float(found.group(2))
        elif key == "VSWR":
            status["swr"] = _number(value)
        elif key == "CURRENT":
            status["current_a"] = _number(value)
        elif key == "TEMPERATURE":
            status["temp_c"] = _number(value)
        elif key == "STATE":
            status["state"] = value
        elif key == "PTT":
            status["tx"] = value.upper() == "TX"
        elif key == "TRIP":
            status["trip"] = value
    if not status:
        raise AmplifierError("amplifier protocol: no status items")
    return status


class GeminiDriver:
    id = "gemini"

    def __init__(self, transport: Any, *, read_timeout: float = READ_TIMEOUT_S) -> None:
        self._transport = transport
        self._timeout = read_timeout

    def _ask(self, command: str) -> str:
        _flush(self._transport)
        self._transport.write(f"{command}\n".encode("latin1"))
        return read_until(self._transport, lambda buffer: buffer.decode("latin1") if b"\n" in buffer else None, self._timeout)

    def _read_operate(self) -> bool:
        # "R\n" answers 0 (STANDBY) or 1 (OPERATE), see gemini_get_powerstat.
        match = re.match(r"\s*(\d+)", self._ask("R"))
        if not match or match.group(1) not in ("0", "1"):
            raise AmplifierError("amplifier protocol: R reply")
        return match.group(1) == "1"

    def set_operate(self, on: bool) -> None:
        _flush(self._transport)
        self._transport.write(b"R1\n" if on else b"R0\n")
        if not on:
            _confirm_standby(self._read_operate)

    def read(self) -> dict[str, Any]:
        status = parse_gemini_status(self._ask("S"))
        operate = self._read_operate()
        # The value of TRIP when nothing tripped is not documented: only empty or NONE count as clear.
        trip = status.get("trip")
        fault = f"TRIP {trip}" if trip and trip.upper() != "NONE" else None
        return {
            "operate": operate, "tx": status.get("tx"), "swr": status.get("swr"), "power_w": status.get("power_peak_w"),
            "temp_c": status.get("temp_c"), "current_a": status.get("current_a"), "fault": fault,
        }

    def close(self) -> None:
        if hasattr(self._transport, "close"):
            self._transport.close()


# ---------------------------------------------------------------- registry and links

DRIVER_FACTORIES = {"elecraft-kpa": KpaDriver, "expert-spe": ExpertDriver, "acom": AcomDriver, "gemini": GeminiDriver}


def create_amplifier_driver(driver_id: str, transport: Any, **options: Any) -> Any:
    factory = DRIVER_FACTORIES.get(driver_id)
    if factory is None:
        raise AmplifierError(f"no amplifier driver '{driver_id}'")
    if factory is AcomDriver and options.get("model"):
        return factory(transport, model=options["model"])
    return factory(transport)


class SerialTransport:
    """Lazy serial link: the port is opened on first use. The baud rate has no default and comes from the config."""

    def __init__(self, port: str, baud: int, serial_module: Any = None) -> None:
        if not port or not isinstance(baud, int) or baud <= 0:
            raise AmplifierError("amplifier serial port and baud are required")
        self._port_name = port
        self._baud = baud
        self._serial_module = serial_module
        self._port: Any = None

    def _open(self) -> Any:
        if self._port is None:
            serial_module = self._serial_module
            if serial_module is None:
                import serial as serial_module  # lazy: nothing opens at construction
            port = serial_module.Serial(port=None, baudrate=self._baud, timeout=0.05, write_timeout=0.5, exclusive=True)
            port.rts = False
            port.dtr = False
            port.port = self._port_name
            port.open()
            self._port = port
        return self._port

    def write(self, data: bytes) -> None:
        port = self._open()
        port.write(bytes(data))
        port.flush()

    def read(self, timeout: float) -> bytes:
        port = self._open()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            chunk = port.read(256)
            if chunk:
                return bytes(chunk)
        return b""

    def flush(self) -> None:
        if self._port is not None:
            self._port.reset_input_buffer()

    def close(self) -> None:
        port, self._port = self._port, None
        if port is not None:
            port.close()


class TcpTransport:
    """Lazy TCP link (serial-to-network servers, Gemini network port)."""

    def __init__(self, host: str, port: int, *, connect_timeout: float = 3.0, socket_module: Any = socket) -> None:
        if not re.fullmatch(r"[\w.:-]{1,253}", host or ""):
            raise AmplifierError("amplifier host invalid")
        if not isinstance(port, int) or not 0 < port < 65536:
            raise AmplifierError("amplifier port invalid")
        self._host, self._port, self._connect_timeout = host, port, connect_timeout
        self._socket_module = socket_module
        self._socket: Any = None

    def _open(self) -> Any:
        if self._socket is None:
            self._socket = self._socket_module.create_connection((self._host, self._port), timeout=self._connect_timeout)
        return self._socket

    def write(self, data: bytes) -> None:
        self._open().sendall(bytes(data))

    def read(self, timeout: float) -> bytes:
        connection = self._open()
        connection.settimeout(timeout)
        try:
            return connection.recv(4096)
        except (TimeoutError, socket.timeout):
            return b""

    def flush(self) -> None:
        if self._socket is None:
            return
        self._socket.settimeout(0)
        try:
            while self._socket.recv(4096):
                pass
        except (BlockingIOError, TimeoutError, socket.timeout):
            pass

    def close(self) -> None:
        connection, self._socket = self._socket, None
        if connection is not None:
            connection.close()


def driver_from_config(catalog: dict[str, Any], config: dict[str, Any]) -> Any | None:
    """Builds the amplifier driver from the local accessories config, or None when nothing is configured."""
    amp = config.get("amplifier") or {}
    device = next((item for item in catalog["devices"] if item["id"] == amp.get("device")), None)
    if not device or not device.get("driver"):
        return None
    if amp.get("host") and amp.get("tcp_port"):
        transport: Any = TcpTransport(amp["host"], amp["tcp_port"])
    elif amp.get("port") and amp.get("baud"):
        transport = SerialTransport(amp["port"], amp["baud"])
    else:
        return None
    return create_amplifier_driver(device["driver"], transport, model=amp.get("model"))
