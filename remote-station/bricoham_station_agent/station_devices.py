"""Station devices: power/relay control and serial rotor controllers.

Mirror of station-devices.cjs. Every protocol fact is cited in
remote-station/docs/STATION-DEVICES-SOURCES.md; anything not listed there is "pendiente de fuente".
Device contract (compatible with the station accessories layer): id, type, status(), commands, safe_state().
TX safety: nothing here transmits. Switching is default-off, refused while transmitting, and rotor
STOP is always allowed.
"""

from __future__ import annotations

import json
import re
import socket
import struct
import threading
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field

PENDING = "pendiente de fuente"
CRITICAL_ROLES = frozenset({"radio", "amp"})
MODBUS_PORT = 502
MODBUS_UNIT = 1
MODBUS_COILS = 8
COIL_ON = 0xFF00  # Waveshare wiki: 0xFF00 on, 0x0000 off, 0x5500 toggle
COIL_OFF = 0x0000


class DeviceError(Exception):
    def __init__(self, code: str, message: str | None = None, status: int = 400) -> None:
        super().__init__(message or code)
        self.code = code
        self.status = status


# --- Digital Loggers REST (https://www.digital-loggers.com/rest.html) ---


@dataclass(frozen=True)
class HttpRequest:
    method: str
    path: str
    headers: dict[str, str]
    body: str


def dli_request(operation: str, outlet: int, value: bool = False) -> HttpRequest:
    if type(outlet) is not int or not 0 <= outlet <= 7:
        raise DeviceError("outlet_invalid", "DLI outlets are zero-based 0-7.")
    base = f"/restapi/relay/outlets/{outlet}"
    if operation == "set":
        return HttpRequest(
            "PUT",
            f"{base}/transient_state/",
            {"X-CSRF": "x", "Content-Type": "application/x-www-form-urlencoded"},
            f"value={'true' if value else 'false'}",
        )
    if operation == "cycle":
        return HttpRequest("POST", f"{base}/cycle/", {"X-CSRF": "x"}, "")
    if operation == "read":
        return HttpRequest("GET", f"{base}/physical_state/", {"Accept": "application/json"}, "")
    raise DeviceError("operation_invalid", "Unknown DLI operation.")


def urllib_dli_transport(
    host: str, username: str, password: str, port: int = 80, timeout: float = 3.0
) -> Callable[[HttpRequest], tuple[int, str]]:
    """HTTP digest transport; the credentials never leave this closure."""
    base = f"http://{host}:{port}"
    manager = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    manager.add_password(None, base, username, password)
    opener = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(manager))

    def transport(request: HttpRequest) -> tuple[int, str]:
        call = urllib.request.Request(
            base + request.path,
            data=request.body.encode("ascii") if request.body else None,
            headers=request.headers,
            method=request.method,
        )
        try:
            with opener.open(call, timeout=timeout) as reply:
                return reply.status, reply.read(4096).decode("utf-8", "replace")
        except urllib.error.HTTPError as error:
            return error.code, ""
        except OSError as error:
            raise DeviceError("transport", "DLI unreachable.", 502) from error

    return transport


# --- Waveshare Modbus POE ETH Relay (https://www.waveshare.com/wiki/Modbus_POE_ETH_Relay) ---
# FC 01/05/0F PDU layouts: Modbus Application Protocol V1.1b3 (modbus.org).


def _mbap(transaction: int, unit: int, pdu: bytes) -> bytes:
    return struct.pack(">HHHB", transaction & 0xFFFF, 0, len(pdu) + 1, unit) + pdu


def _check_coil(coil: int) -> None:
    if type(coil) is not int or not 0 <= coil < MODBUS_COILS:
        raise DeviceError("outlet_invalid", "Relay coils are 0x0000-0x0007.")


def modbus_read_coils(transaction: int, unit: int, start: int, quantity: int) -> bytes:
    _check_coil(start)
    if type(quantity) is not int or quantity < 1 or start + quantity > MODBUS_COILS:
        raise DeviceError("outlet_invalid", "Invalid coil count.")
    return _mbap(transaction, unit, struct.pack(">BHH", 0x01, start, quantity))


def modbus_write_coil(transaction: int, unit: int, coil: int, on: bool) -> bytes:
    _check_coil(coil)
    return _mbap(transaction, unit, struct.pack(">BHH", 0x05, coil, COIL_ON if on else COIL_OFF))


def modbus_write_coils(transaction: int, unit: int, start: int, states: list[bool]) -> bytes:
    _check_coil(start)
    if not states or start + len(states) > MODBUS_COILS:
        raise DeviceError("outlet_invalid", "Invalid coil count.")
    bits = sum(1 << index for index, state in enumerate(states) if state)
    return _mbap(transaction, unit, struct.pack(">BHHBB", 0x0F, start, len(states), 1, bits))


def parse_modbus_response(frame: bytes, *, transaction: int, unit: int, function: int) -> bytes:
    """Returns the PDU. An exception reply is the function code + 0x80 and an exception code."""
    if len(frame) < 9:
        raise DeviceError("modbus_short", "Short Modbus reply.", 502)
    reply_tid, protocol, length, reply_unit = struct.unpack(">HHHB", frame[:7])
    if (
        reply_tid != transaction & 0xFFFF
        or protocol != 0
        or length != len(frame) - 6
        or reply_unit != unit
    ):
        raise DeviceError("modbus_mismatch", "Modbus reply does not match the request.", 502)
    pdu = frame[7:]
    if pdu[0] == function | 0x80:
        raise DeviceError("modbus_exception", f"Modbus exception 0x{pdu[1]:02x}.", 502)
    if pdu[0] != function:
        raise DeviceError("modbus_mismatch", "Unexpected Modbus function.", 502)
    return pdu


def tcp_modbus_exchange(
    host: str, port: int = MODBUS_PORT, timeout: float = 3.0
) -> Callable[[bytes], bytes]:
    def exchange(frame: bytes) -> bytes:
        try:
            with socket.create_connection((host, port), timeout=timeout) as peer:
                peer.sendall(frame)
                data = b""
                while len(data) < 6 or len(data) < 6 + struct.unpack(">H", data[4:6])[0]:
                    chunk = peer.recv(256)
                    if not chunk:
                        raise DeviceError("modbus_short", "Modbus link closed.", 502)
                    data += chunk
                return data
        except OSError as error:
            raise DeviceError("transport", "Modbus relay unreachable.", 502) from error

    return exchange


# --- Power / relay device ---


@dataclass(frozen=True)
class Outlet:
    name: str
    index: int
    role: str = "other"


class PowerDevice:
    """kind "dli": transport(HttpRequest) -> (status, body). kind "modbus": transport(frame) -> bytes."""

    type = "power"

    def __init__(
        self,
        device_id: str,
        kind: str,
        outlets: list[Outlet],
        transport: Callable,
        *,
        enabled: bool = False,
        is_transmitting: Callable[[], bool] | None = None,
        unit: int = MODBUS_UNIT,
    ) -> None:
        if kind not in ("dli", "modbus"):
            raise ValueError("Unknown power device kind.")
        names = {outlet.name for outlet in outlets}
        if (
            not outlets
            or len(names) != len(outlets)
            or any(
                not re.fullmatch(r"[a-z0-9_-]{1,32}", o.name) or not 0 <= o.index <= 7
                for o in outlets
            )
        ):
            raise ValueError("Outlets need unique lowercase names and an index 0-7.")
        self.id = device_id
        self.kind = kind
        self.outlets = outlets
        self.enabled = enabled
        self.commands = ("set", "cycle", "read") if kind == "dli" else ("set", "read")
        self._transport = transport
        self._is_transmitting = is_transmitting
        self._unit = unit
        self._transaction = 0
        self._lock = threading.Lock()

    def _outlet(self, name: str) -> Outlet:
        for outlet in self.outlets:
            if outlet.name == name:
                return outlet
        raise DeviceError("outlet_unknown", "Unknown outlet.", 404)

    def _next_transaction(self) -> int:
        self._transaction = (self._transaction + 1) & 0xFFFF
        return self._transaction

    def _dli(self, operation: str, index: int, value: bool = False) -> str:
        status, body = self._transport(dli_request(operation, index, value))
        if not 200 <= status < 300:
            raise DeviceError("dli_http", f"DLI HTTP {status}.", 502)
        return body

    def _read_all(self) -> dict[str, bool]:
        if self.kind == "dli":
            states = {}
            for outlet in self.outlets:
                try:
                    value = json.loads(self._dli("read", outlet.index))
                except ValueError:
                    value = None
                if not isinstance(value, bool):
                    raise DeviceError("dli_response", "Unexpected DLI state reply.", 502)
                states[outlet.name] = value
            return states
        tid = self._next_transaction()
        pdu = parse_modbus_response(
            self._transport(modbus_read_coils(tid, self._unit, 0, MODBUS_COILS)),
            transaction=tid,
            unit=self._unit,
            function=0x01,
        )
        if len(pdu) < 3 or pdu[1] != 1:
            raise DeviceError("modbus_mismatch", "Unexpected coil reply.", 502)
        return {o.name: bool((pdu[2] >> o.index) & 1) for o in self.outlets}

    def _guard(self, outlet: Outlet, *, off: bool, confirm: bool) -> None:
        if not self.enabled:
            raise DeviceError(
                "control_disabled", "Switching is disabled in the configuration.", 403
            )
        critical = outlet.role in CRITICAL_ROLES
        if critical and (self._is_transmitting is None or self._is_transmitting() is not False):
            raise DeviceError(
                "transmitting", "The radio/amplifier outlet cannot be switched while transmitting.", 409
            )
        if critical and off and confirm is not True:
            raise DeviceError(
                "confirm_required", "Confirm powering off or cycling the radio or amplifier outlet.", 409
            )

    def status(self) -> dict[str, object]:
        with self._lock:
            try:
                return {
                    "id": self.id,
                    "type": self.type,
                    "online": True,
                    "control_enabled": self.enabled,
                    "outlets": self._read_all(),
                }
            except DeviceError as error:
                return {
                    "id": self.id,
                    "type": self.type,
                    "online": False,
                    "control_enabled": self.enabled,
                    "error": error.code,
                }

    def set(self, name: str, on: bool, *, confirm: bool = False) -> dict[str, object]:
        outlet = self._outlet(name)
        self._guard(outlet, off=not on, confirm=confirm)
        with self._lock:
            if self.kind == "dli":
                self._dli("set", outlet.index, on)
            else:
                tid = self._next_transaction()
                parse_modbus_response(
                    self._transport(modbus_write_coil(tid, self._unit, outlet.index, on)),
                    transaction=tid,
                    unit=self._unit,
                    function=0x05,
                )
            physical = self._read_all()[name]
        return {"outlet": name, "requested": bool(on), "physical": physical, "verified": physical == bool(on)}

    def cycle(self, name: str, *, confirm: bool = False) -> dict[str, object]:
        if self.kind != "dli":
            raise DeviceError("cycle_unsupported", f"Relay cycle on this device is {PENDING}.", 501)
        outlet = self._outlet(name)
        self._guard(outlet, off=True, confirm=confirm)
        with self._lock:
            self._dli("cycle", outlet.index)
            return {"outlet": name, "physical": self._read_all()[name]}

    def safe_state(self) -> dict[str, str]:
        # Cutting power is never a safe state: every outlet stays as it is.
        return {"action": "none"}


# --- Serial rotor controllers (Hamlib rotorez.txt/.c, RT-21 manual Appendix F) ---


# GS-232A/B and SPID Rot2Prog frames follow Hamlib rotators/gs232a/gs232a.c, gs232b.c and
# rotators/spid/spid.c, spid.txt (LGPL-2.1-or-later, Stephane Fillod / Norvald H. Ryeng);
# see docs/THIRD-PARTY-REUSE.md. Frames are latin-1 text so SPID binary bytes survive str I/O.
GS232_BAUDS = (150, 300, 600, 1200, 2400, 4800, 9600)  # Hamlib serial_rate_min/max 150..9600
GS232B_BAUDS = (1200, 2400, 4800, 9600)  # Hamlib gs232b serial_rate_min/max 1200..9600
SPID_PULSES = (1, 2, 4)  # spid.txt: 1, 0.5 and 0.25 deg/pulse
SPID_STOP = "W" + "\x00" * 10 + "\x0f "
SPID_STATUS = "W" + "\x00" * 10 + "\x1f "


@dataclass(frozen=True)
class RotorProtocol:
    label: str
    bauds: tuple[int, ...]
    heading_read: bool
    elevation: bool = False
    default_baud: int | None = 4800  # None: the operator must choose the documented baud explicitly
    reply_end: str = ";"
    reply_len: int | None = None


ROTOR_PROTOCOLS = {
    "dcu1": RotorProtocol("Hy-Gain DCU-1 / DCU-1X", (4800,), False),
    "rotorez": RotorProtocol("Idiom Press Rotor-EZ / RotorCard", (4800,), True),
    "rt21": RotorProtocol("Green Heron RT-21", (4800, 9600), True),
    "gs232a": RotorProtocol("Yaesu GS-232A", GS232_BAUDS, True, True, None, "\n"),
    "gs232b": RotorProtocol("Yaesu GS-232B", GS232B_BAUDS, True, True, None, "\n"),
    "rot2prog": RotorProtocol("SPID Rot2Prog", (600,), True, True, 600, "", 12),
}


def rotor_frames(
    protocol: str,
    operation: str,
    degrees: float | None = None,
    elevation: float = 0.0,
    pulses: tuple[int, int] | None = None,
) -> list[str] | None:
    """Frames for one operation; pulses = (az, el) pulses per degree, required by Rot2Prog moves."""
    spec = ROTOR_PROTOCOLS.get(protocol)
    if spec is None:
        raise DeviceError("protocol_unknown", "Unknown rotor protocol.")
    if operation == "move":
        if (
            isinstance(degrees, bool)
            or not isinstance(degrees, int | float)
            or not 0 <= degrees <= 450
        ):
            raise DeviceError("heading_invalid", "Heading out of range.")
        if isinstance(elevation, bool) or not isinstance(elevation, int | float):
            raise DeviceError("heading_invalid", "Elevation out of range.")
        if not spec.elevation:
            return [f"AP1{round(degrees):03d};", "AM1;"]
        if protocol == "rot2prog":
            if not -20 <= elevation <= 210:  # Hamlib Rot2Prog min_el/max_el
                raise DeviceError("heading_invalid", "Elevation out of range.")
            if pulses is None or pulses[0] not in SPID_PULSES or pulses[1] not in SPID_PULSES:
                raise DeviceError("rotor_resolution_unknown", "Rot2Prog resolution is unknown.", 502)
            h = round(pulses[0] * (360 + degrees))
            v = round(pulses[1] * (360 + elevation))
            if not 0 <= h <= 9999 or not 0 <= v <= 9999:
                raise DeviceError("heading_invalid", "Position out of range.")
            return [f"W{h:04d}{chr(pulses[0])}{v:04d}{chr(pulses[1])}/ "]
        if not 0 <= elevation <= 180:  # Hamlib GS-232 max_el
            raise DeviceError("heading_invalid", "Elevation out of range.")
        return [f"W{round(degrees):03d} {round(elevation):03d}\r"]
    if operation == "read":
        if not spec.heading_read:
            return None
        if protocol == "rot2prog":
            return [SPID_STATUS]
        if spec.elevation:
            return ["C2\r"]
        return ["BI1;" if protocol == "rt21" else "AI1;"]
    if operation == "stop":
        if protocol == "rot2prog":
            return [SPID_STOP]
        if spec.elevation:
            return ["S\r"]
        # A bare ';' stops Rotor-EZ and RT-21; for the DCU-1 Hamlib sends AS1; (its README disagrees).
        return [";", "AS1;"] if protocol == "dcu1" else [";"]
    raise DeviceError("operation_invalid", "Unknown rotor operation.")


_HEADING = re.compile(r"[\x01;]?(\d{3}(?:\.\d)?);?")


def parse_heading(reply: str) -> float:
    """Rotor-EZ replies ';xxx', the RT-21 replies 'xxx;' or 'xxx.y;' (optionally after SOH)."""
    match = _HEADING.fullmatch(reply.strip())
    if match is None or float(match.group(1)) > 450:
        raise DeviceError("rotor_response", "Unexpected heading reply.", 502)
    return float(match.group(1))


_GS232A_REPLY = re.compile(r"\+0(\d{3})\+0(\d{3})")
_GS232B_REPLY = re.compile(r"AZ=(\d{3})(?:\s*EL=(\d{3}))?")  # some 12PR1A units answer AZ only


def parse_rotor_reply(protocol: str, reply: str) -> tuple[float, float, int, int]:
    """Returns (azimuth, elevation, az pulses/deg, el pulses/deg); pulses are 0 unless Rot2Prog."""
    if protocol == "gs232a":
        match = _GS232A_REPLY.fullmatch(reply.strip())
        if match is not None:
            return float(match.group(1)), float(match.group(2)), 0, 0
    elif protocol == "gs232b":
        match = _GS232B_REPLY.fullmatch(reply.strip())
        if match is not None:
            return float(match.group(1)), float(match.group(2) or 0), 0, 0
    elif protocol == "rot2prog":
        # 12-byte frame: 'W', H1-H4, PH, V1-V4, PV, ' ' (spid.txt); angle = digits - 360.
        if len(reply) == 12 and reply[0] == "W" and reply[11] == " ":
            data = [ord(char) for char in reply]
            if all(value <= 9 for value in data[1:5] + data[6:10]) and (
                data[5] in SPID_PULSES and data[10] in SPID_PULSES
            ):
                azimuth = data[1] * 100 + data[2] * 10 + data[3] + data[4] / 10 - 360
                elevation = data[6] * 100 + data[7] * 10 + data[8] + data[9] / 10 - 360
                return azimuth, elevation, data[5], data[10]
    else:
        return parse_heading(reply), 0.0, 0, 0
    raise DeviceError("rotor_response", "Unexpected position reply.", 502)


class SerialRotorBackend:
    """rotctld-compatible exchange() so RotorController keeps its lease, deadman and stop logic.

    serial exposes write(str), read() -> str and flush(); a pyserial wrapper or a fake in tests.
    """

    def __init__(self, protocol: str, serial: object, baud: int | None = None) -> None:
        spec = ROTOR_PROTOCOLS.get(protocol)
        if spec is None:
            raise ValueError("Unknown rotor protocol.")
        if baud is None:
            baud = spec.default_baud
        if baud is None:
            raise ValueError(f"Choose a baud explicitly for {spec.label}.")
        if baud not in spec.bauds:
            raise ValueError(f"Baud {baud} is not documented for {spec.label}.")
        self.protocol = protocol
        self.baud = baud
        self.heading_read = spec.heading_read
        self._serial = serial

    def exchange(self, command: str, expected: str) -> list[str]:
        if expected == "get_pos":
            azimuth, elevation, _, _ = self._read_position()
            return [f"Azimuth: {azimuth}", f"Elevation: {elevation}"]
        if expected == "set_pos":
            _, az_text, el_text = command.split()
            pulses = None
            if self.protocol == "rot2prog":
                _, _, az_pulses, el_pulses = self._read_position()
                pulses = (az_pulses, el_pulses)
            elevation = float(el_text) if ROTOR_PROTOCOLS[self.protocol].elevation else 0.0
            for frame in rotor_frames(self.protocol, "move", float(az_text), elevation, pulses) or []:
                self._serial.write(frame)
            return []
        if expected == "stop":
            for frame in rotor_frames(self.protocol, "stop") or []:
                self._serial.write(frame)
            return []
        raise DeviceError("operation_invalid", "Unsupported rotor exchange.")

    def _read_position(self) -> tuple[float, float, int, int]:
        frames = rotor_frames(self.protocol, "read")
        if frames is None:
            raise DeviceError("rotor_no_heading_read", "sin lectura de rumbo")
        self._serial.flush()
        self._serial.write(frames[0])
        return parse_rotor_reply(self.protocol, self._serial.read())


def open_serial_rotor_backend(protocol: str, port: str, baud: int | None = None) -> SerialRotorBackend:
    import serial  # pyserial, already required by cat.py

    spec = ROTOR_PROTOCOLS.get(protocol)
    if spec is None:
        raise ValueError("Unknown rotor protocol.")
    baud = baud or spec.default_baud
    if baud is None:
        raise ValueError(f"Choose a baud explicitly for {spec.label}.")

    class Wire:
        def __init__(self) -> None:
            self._port = serial.Serial(port, baud, bytesize=8, parity="N", stopbits=1, timeout=0.7)

        def write(self, text: str) -> None:
            self._port.write(text.encode("latin-1"))

        def read(self) -> str:
            if spec.reply_len:
                data = self._port.read(spec.reply_len)
            else:
                data = self._port.read_until(spec.reply_end.encode("ascii"))
            return data.decode("latin-1")

        def flush(self) -> None:
            self._port.reset_input_buffer()

    return SerialRotorBackend(protocol, Wire(), baud)


# --- Signal path (radio -> amplifier -> tuner -> switch -> antenna) ---

STAGES = ("radio", "amplifier", "tuner", "switch", "antenna")

# No public protocol found: listed, never controlled.
PENDING_DEVICES = {
    "antenna-genius": ("4O3A Antenna Genius", "switch"),
    "tuner-genius-xl": ("4O3A Tuner Genius XL", "tuner"),
    "power-genius-xl": ("4O3A Power Genius XL", "amplifier"),
    "iboot-pdu": ("Dataprobe iBoot-PDU", "power"),
    "alpha-87a": ("Alpha 87A", "amplifier"),
    "om2000a-plus": ("OM Power OM2000A+", "amplifier"),
}


@dataclass(frozen=True)
class ListedDevice:
    id: str
    label: str = ""
    model: str | None = None
    stage: str | None = None
    commands: tuple[str, ...] = field(default=(), init=False)

    @property
    def type(self) -> str:
        return "unsupported" if self.model in PENDING_DEVICES else "listed"

    def status(self) -> dict[str, object]:
        pending = self.model in PENDING_DEVICES
        return {
            "id": self.id,
            "type": self.type,
            "control": PENDING if pending else "none",
            "controllable": False,
        }

    def safe_state(self) -> dict[str, str]:
        return {"action": "none"}


def build_signal_path(devices: list[ListedDevice]) -> dict[str, object]:
    stages: list[dict[str, object]] = [{"stage": name, "devices": []} for name in STAGES]
    for device in devices:
        known = PENDING_DEVICES.get(device.model or "")
        stage = known[1] if known else device.stage
        target = next((item for item in stages if item["stage"] == stage), None)
        if target is None:
            continue
        target["devices"].append(  # type: ignore[union-attr]
            {
                "id": device.id,
                "label": device.label or (known[0] if known else device.id),
                "model": device.model,
                "control": PENDING if known else "configured",
                "controllable": not known,
            }
        )
    return {"stages": stages, "missing": [s["stage"] for s in stages if not s["devices"]]}


SUPPORT_MATRIX = (
    ("Digital Loggers Web Power Switch (REST)", "HTTP + digest", "ok", "digital-loggers.com/rest.html"),
    ("Waveshare Modbus POE ETH Relay", "Modbus TCP 502", "ok", "waveshare.com wiki + Modbus spec V1.1b3"),
    ("Hy-Gain DCU-1 / DCU-1X", "serial 4800 8N1", "partial", "Hamlib rotorez; RT-21 manual App. F"),
    ("Idiom Press Rotor-EZ / RotorCard", "serial 4800 8N1", "ok", "Hamlib rotorez"),
    ("Green Heron RT-21", "serial 4800/9600 8N1", "ok", "RT-21 manual App. F; Hamlib rotorez.c"),
    ("Yaesu GS-232A", "serial 150-9600 8N1 (baud explicit)", "partial", "Hamlib gs232a.c; no hardware validation"),
    ("Yaesu GS-232B", "serial 1200-9600 8N1 (baud explicit)", "partial", "Hamlib gs232b.c; no hardware validation"),
    ("SPID Rot2Prog", "serial 600 8N1", "partial", "Hamlib spid.c, spid.txt; no hardware validation"),
    ("Hy-Gain DCU2 / DCU3 / YRC-1", "serial 9600", PENDING, "catalog only (Hamlib 406)"),
    *((label, "network", PENDING, "STATION-DEVICES-SOURCES.md") for label, _ in PENDING_DEVICES.values()),
)


def build_power_device(
    config: dict,
    environ: dict[str, str],
    is_transmitting: Callable[[], bool],
    *,
    dli_transport: Callable[..., Callable] = urllib_dli_transport,
    modbus_exchange: Callable[..., Callable] = tcp_modbus_exchange,
) -> PowerDevice:
    """Builds the power device from the local agent JSON; DLI credentials come only from the environment."""
    allowed = {"id", "kind", "host", "port", "enabled", "outlets"}
    if not isinstance(config, dict) or not {"id", "kind", "host", "outlets"} <= set(config) <= allowed:
        raise ValueError("Power config needs id, kind, host and outlets (optional port, enabled).")
    kind = config["kind"]
    host = config["host"]
    port = config.get("port")
    if kind not in ("dli", "modbus") or not isinstance(host, str) or not host or not isinstance(config["id"], str):
        raise ValueError("Power config has an invalid id, kind or host.")
    if port is not None and (type(port) is not int or not 1 <= port <= 65535):
        raise ValueError("Power config port is invalid.")
    if type(config.get("enabled", False)) is not bool or not isinstance(config["outlets"], list):
        raise ValueError("Power config enabled/outlets are invalid.")
    outlets = []
    for item in config["outlets"]:
        if not isinstance(item, dict) or not {"name", "index"} <= set(item) <= {"name", "index", "role"}:
            raise ValueError("Each outlet needs name, index and optional role.")
        outlets.append(Outlet(item["name"], item["index"], item.get("role", "other")))
    if kind == "dli":
        user, password = environ.get("BRICOHAM_POWER_USER"), environ.get("BRICOHAM_POWER_PASSWORD")
        if not user or not password:
            raise ValueError("DLI needs BRICOHAM_POWER_USER and BRICOHAM_POWER_PASSWORD in the agent environment.")
        transport = dli_transport(host, user, password, port or 80)
    else:
        transport = modbus_exchange(host, port or MODBUS_PORT)
    return PowerDevice(
        config["id"], kind, outlets, transport,
        enabled=config.get("enabled", False), is_transmitting=is_transmitting,
    )
