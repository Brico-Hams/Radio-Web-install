"""FlexRadio SmartSDR client codec and guarded session.

Every syntax, port and scale comes from remote-station/docs/FLEX-SMARTSDR-API.md.
Anything that file marks "pendiente de fuente" is not implemented here. The
JS mirror for the Node remote shack is smartsdr-core.cjs.
"""

import math
import re
import socket
import struct
import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Callable, Optional

SMARTSDR_TCP_PORT = 4992
SMARTSDR_DISCOVERY_PORTS = (4991, 4992)
PGXL_TCP_PORT = 9008
DISCOVERY_CLASS_ID = 0x534CFFFF
MAX_SMARTSDR_FRAME_BYTES = 16_384
MAX_SMARTSDR_SEQUENCE = 0xFFFF_FFFF


class SmartSdrReadCommand(StrEnum):
    INFO = "info"


@dataclass(frozen=True)
class SmartSdrResponse:
    sequence: int
    error_code: int
    message: str

    @property
    def succeeded(self) -> bool:
        return self.error_code == 0


def _validate_sequence(sequence: int) -> None:
    if (
        isinstance(sequence, bool)
        or not isinstance(sequence, int)
        or not 0 <= sequence <= MAX_SMARTSDR_SEQUENCE
    ):
        raise ValueError("La secuencia SmartSDR debe ser un entero sin signo de 32 bits.")


def build_query(command: SmartSdrReadCommand, sequence: int) -> bytes:
    if not isinstance(command, SmartSdrReadCommand):
        raise ValueError("Solo se permiten consultas SmartSDR predefinidas.")
    _validate_sequence(sequence)
    return f"C{sequence}|{command.value}\n".encode("ascii")


def parse_response(frame: bytes, expected_sequence: int) -> SmartSdrResponse:
    _validate_sequence(expected_sequence)
    if not isinstance(frame, bytes):
        raise ValueError("La respuesta SmartSDR debe ser bytes.")
    if not frame or len(frame) > MAX_SMARTSDR_FRAME_BYTES:
        raise ValueError("La respuesta SmartSDR está vacía o excede el tamaño máximo.")

    if frame.endswith(b"\r\n"):
        content = frame[:-2]
    elif frame.endswith((b"\r", b"\n")):
        content = frame[:-1]
    else:
        raise ValueError("La respuesta SmartSDR no tiene un terminador de línea.")
    if not content or b"\r" in content or b"\n" in content:
        raise ValueError("La respuesta SmartSDR debe contener exactamente una línea.")
    if any(byte < 0x20 or byte > 0x7E for byte in content):
        raise ValueError("La respuesta SmartSDR contiene datos no ASCII imprimibles.")

    fields = content.split(b"|", 2)
    if len(fields) != 3 or not fields[0].startswith(b"R"):
        raise ValueError("La trama no tiene el formato de respuesta SmartSDR.")

    sequence_text, error_text, message_text = fields[0][1:], fields[1], fields[2]
    if not sequence_text.isdigit():
        raise ValueError("La secuencia de respuesta SmartSDR no es decimal.")
    sequence = int(sequence_text)
    if sequence != expected_sequence:
        raise ValueError("La respuesta SmartSDR no coincide con la secuencia esperada.")

    if (
        not error_text
        or len(error_text) > 8
        or any(byte not in b"0123456789abcdefABCDEF" for byte in error_text)
    ):
        raise ValueError("El código de respuesta SmartSDR debe ser hexadecimal de 32 bits.")

    return SmartSdrResponse(
        sequence=sequence,
        error_code=int(error_text, 16),
        message=message_text.decode("ascii"),
    )


# --- Error codes (FLEX-SMARTSDR-API.md, "Error codes") ----------------------

ERROR_CODES = {
    0x50000016: "malformed command",
    0x5000002C: "wrong parameter count",
    0x5000002D: "bad field",
    0x50000033: "out of range",
    0x5000000D: "invalid slice or not yours",
    0x50000068: "slice locked",
    0x50004001: "not licensed",
    0x500000A3: "unknown subscription object",
    0x5000003D: "TX not supported",
    0x50000042: "not ready",
    0x50000043: "no transmitter",
}


def describe_error(code: int) -> str:
    return ERROR_CODES.get(code, f"unknown error 0x{code:08X}")


class SmartSdrError(Exception):
    pass


class SmartSdrCommandError(SmartSdrError):
    def __init__(self, command: str, response: SmartSdrResponse) -> None:
        super().__init__(f"{command}: {describe_error(response.error_code)}")
        self.command = command
        self.response = response


# --- VITA-49 container and discovery ----------------------------------------


@dataclass(frozen=True)
class VitaPacket:
    packet_type: int
    stream_id: Optional[int]
    class_id: Optional[int]  # last class-ID word: information class << 16 | packet class
    payload: bytes


def parse_vita_packet(packet: bytes) -> VitaPacket:
    """Split a VITA-49 packet (standard header layout, big endian) into its payload."""
    if not isinstance(packet, bytes) or len(packet) < 4 or len(packet) % 4:
        raise ValueError("Paquete VITA-49 inválido.")
    (word0,) = struct.unpack(">I", packet[:4])
    packet_type = word0 >> 28
    has_class = bool(word0 >> 27 & 1)
    has_trailer = bool(word0 >> 26 & 1)
    tsi = word0 >> 22 & 3
    tsf = word0 >> 20 & 3
    size_words = word0 & 0xFFFF
    if size_words < 1 or size_words * 4 > len(packet):
        raise ValueError("El tamaño VITA-49 no coincide con el paquete.")
    offset = 4
    stream_id = None
    if packet_type in (1, 3, 4, 5):
        stream_id = struct.unpack_from(">I", packet, offset)[0] if offset + 4 <= len(packet) else None
        offset += 4
    class_id = None
    if has_class:
        if offset + 8 > size_words * 4:
            raise ValueError("Cabecera VITA-49 truncada.")
        class_id = struct.unpack_from(">I", packet, offset + 4)[0]
        offset += 8
    if tsi:
        offset += 4
    if tsf:
        offset += 8
    end = size_words * 4 - (4 if has_trailer else 0)
    if offset > end:
        raise ValueError("Cabecera VITA-49 truncada.")
    return VitaPacket(packet_type, stream_id, class_id, packet[offset:end])


@dataclass(frozen=True)
class SmartSdrRadio:
    model: str
    serial: str
    version: str
    name: str
    callsign: str
    ip: str
    port: int


_IPV4 = re.compile(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$")


def parse_discovery_string(text: str) -> SmartSdrRadio:
    """`model=%s serial=%s version=%s name=%s callsign=%s ip=%u.%u.%u.%u port=%u`; `_` in name is a space."""
    fields = {}
    for token in text.split():
        key, sep, value = token.partition("=")
        if sep:
            fields[key] = value
    match = _IPV4.match(fields.get("ip", ""))
    if not fields.get("model") or not fields.get("serial") or not match:
        raise ValueError("Descubrimiento SmartSDR sin model, serial o ip válidos.")
    if any(int(part) > 255 for part in match.groups()):
        raise ValueError("Dirección IP de descubrimiento fuera de rango.")
    port_text = fields.get("port", str(SMARTSDR_TCP_PORT))
    if not port_text.isdigit() or not 0 < int(port_text) <= 65535:
        raise ValueError("Puerto de descubrimiento inválido.")
    return SmartSdrRadio(
        model=fields["model"],
        serial=fields["serial"],
        version=fields.get("version", ""),
        name=fields.get("name", "").replace("_", " "),
        callsign=fields.get("callsign", ""),
        ip=fields["ip"],
        port=int(port_text),
    )


def parse_discovery_packet(packet: bytes) -> SmartSdrRadio:
    vita = parse_vita_packet(packet)
    if vita.class_id != DISCOVERY_CLASS_ID:
        raise ValueError("El paquete no tiene la clase de descubrimiento 0x534CFFFF.")
    text = vita.payload.rstrip(b"\x00").decode("ascii", errors="strict")
    return parse_discovery_string(text)


def parse_legacy_discovery(payload: bytes) -> dict:
    """Firmware <= 1.1.3: ip uint32, port uint16, radios uint16, mask uint32.

    The byte order and the width of the length prefix of the model, serial and
    name strings are pendiente de fuente: only the fixed header is decoded
    (big endian, unverified) and the strings are not.
    """
    if len(payload) < 12:
        raise ValueError("Descubrimiento heredado demasiado corto.")
    ip, port, radios, mask = struct.unpack(">IHHI", payload[:12])
    return {
        "ip": ".".join(str(byte) for byte in ip.to_bytes(4, "big")),
        "port": port,
        "radios": radios,
        "mask": mask,
        "strings": "pendiente de fuente",
        "verified": False,
    }


# --- Line parsing: V / H / R / S / M ----------------------------------------


@dataclass(frozen=True)
class SmartSdrStatus:
    handle: int
    message: str
    object: str
    ids: tuple
    fields: dict


@dataclass(frozen=True)
class SmartSdrMessage:
    number: int
    severity: str
    text: str


SEVERITIES = ("info", "warning", "error", "fatal")


def parse_status(message: str, handle: int = 0) -> SmartSdrStatus:
    tokens = message.split()
    if not tokens:
        raise ValueError("Estado SmartSDR vacío.")
    ids = []
    fields = {}
    for token in tokens[1:]:
        key, sep, value = token.partition("=")
        if sep:
            fields[key] = value
        elif not fields:
            ids.append(token)
    return SmartSdrStatus(handle, message, tokens[0], tuple(ids), fields)


def parse_line(line):
    """Classify one line from the radio. Returns (kind, value) or raises ValueError."""
    text = line.decode("ascii") if isinstance(line, bytes) else line
    text = text.strip("\r\n")
    if not text or len(text) > MAX_SMARTSDR_FRAME_BYTES:
        raise ValueError("Línea SmartSDR vacía o demasiado larga.")
    kind, rest = text[0], text[1:]
    if kind == "V":
        return "version", rest
    if kind == "H":
        return "handle", int(rest, 16)
    if kind == "R":
        sequence, _, tail = rest.partition("|")
        code, _, message = tail.partition("|")
        if not sequence.isdigit() or not code:
            raise ValueError("Respuesta SmartSDR mal formada.")
        return "reply", SmartSdrResponse(int(sequence), int(code, 16), message)
    if kind == "S":
        handle, sep, message = rest.partition("|")
        if not sep:
            raise ValueError("Estado SmartSDR mal formado.")
        return "status", parse_status(message, int(handle, 16))
    if kind == "M":
        number, sep, body = rest.partition("|")
        if not sep:
            raise ValueError("Mensaje SmartSDR mal formado.")
        value = int(number, 16)
        return "message", SmartSdrMessage(value, SEVERITIES[value >> 24 & 3], body)
    raise ValueError("Tipo de línea SmartSDR desconocido.")


# --- Meters -----------------------------------------------------------------


@dataclass(frozen=True)
class MeterDef:
    id: int
    source: str
    name: str
    low: Optional[float]
    high: Optional[float]
    unit: str
    fps: Optional[int]


def _float_or_none(text):
    try:
        value = float(text)
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def parse_meter_list(message: str) -> dict:
    """`meter <id>.src=..#<id>.nam=..#<id>.low=..#<id>.hi=..#<id>.unit=..#<id>.fps=..`."""
    body = message[6:] if message.startswith("meter ") else message
    raw: dict = {}
    for entry in body.split("#"):
        match = re.match(r"^(\d+)\.(\w+)=(.*)$", entry.strip())
        if match:
            raw.setdefault(int(match.group(1)), {})[match.group(2)] = match.group(3)
    return {
        meter_id: MeterDef(
            meter_id,
            fields.get("src", ""),
            fields.get("nam", ""),
            _float_or_none(fields.get("low")),
            _float_or_none(fields.get("hi")),
            fields.get("unit", ""),
            int(fields["fps"]) if fields.get("fps", "").isdigit() else None,
        )
        for meter_id, fields in raw.items()
    }


def decode_meter_payload(payload: bytes) -> list:
    """Each 32-bit word: meter ID in the upper 16 bits, int16 value in the lower 16."""
    if len(payload) % 4:
        raise ValueError("La carga de medidores no es múltiplo de 4 bytes.")
    return [
        (word >> 16, (word & 0xFFFF) - 0x10000 if word & 0x8000 else word & 0xFFFF)
        for (word,) in struct.iter_unpack(">I", payload)
    ]


# unit -> (divisor, verified). SWR and Volts/Amps/degC are not confirmed for radio meters.
METER_SCALES = {
    "dbm": (128, True),
    "dbfs": (128, True),
    "swr": (128, False),
    "volts": (1024, False),
    "amps": (1024, False),
    "degc": (64, False),
    "degf": (64, False),
}


def scale_meter(raw: int, unit: str):
    scale = METER_SCALES.get(unit.lower())
    if scale is None:
        return None, False
    return raw / scale[0], scale[1]


def normalize_meters(readings: dict) -> dict:
    """Map name -> (value, verified) to the model used by the other radios.

    po / ref in watts (from dBm), swr, alc (linear fraction of full scale from dBFS),
    plus fraction.swr / fraction.alc like remote-agent.cjs. Unverified scalings are listed.
    """
    out = {"po": None, "ref": None, "swr": None, "alc": None, "alcDbfs": None,
           "paTempC": None, "level": None, "supplyVolts": None, "fraction": {"swr": None, "alc": None},
           "unverified": []}

    def get(name):
        item = readings.get(name)
        if item is not None and not item[1] and name not in out["unverified"]:
            out["unverified"].append(name)
        return None if item is None else item[0]

    for name, key in (("FWDPWR", "po"), ("REFPWR", "ref")):
        dbm = get(name)
        if dbm is not None:
            out[key] = round(10 ** (dbm / 10) / 1000, 3)
    out["swr"] = get("SWR")
    dbfs = get("ALC")
    if dbfs is not None:
        out["alcDbfs"] = dbfs
        out["alc"] = round(min(1.0, 10 ** (dbfs / 20)), 3)
    out["paTempC"] = get("PATEMP")
    out["level"] = get("LEVEL")
    out["supplyVolts"] = get("+13.8A")
    if out["swr"] is not None:
        out["fraction"]["swr"] = round(min(1.0, max(0.0, (out["swr"] - 1) / 4)), 3)
    out["fraction"]["alc"] = out["alc"]
    return out


# --- Command builders (pure; the session decides what may be sent) -----------

SLICE_MODES = ("usb", "lsb", "cw", "am", "digu")
SUBSCRIBE_OBJECTS = ("amplifier", "atu", "meter", "pan", "radio", "slice", "tx", "audio_stream")
# Ranges documented as 0-100; vox_level, vox_delay and hwalc_enabled values: pendiente de fuente.
TRANSMIT_SET_PERCENT = ("rfpower", "tunepower", "miclevel")
TRANSMIT_SET_BOOL = ("dax",)
_HEX_ID = re.compile(r"^(0[xX])?[0-9A-Fa-f]{1,8}$")


def _int(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f"{name} debe ser un entero entre {low} y {high}.")
    return value


def _mhz(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError("La frecuencia debe ser MHz finitos y positivos.")
    return f"{value:.6f}"


def _hex_id(value, name):
    if not isinstance(value, str) or not _HEX_ID.match(value):
        raise ValueError(f"{name} inválido.")
    return value


def frame_command(sequence: int, command: str) -> bytes:
    _validate_sequence(sequence)
    if not command or "\r" in command or "\n" in command or any(ord(c) < 0x20 or ord(c) > 0x7E for c in command):
        raise ValueError("Comando SmartSDR no imprimible o multilínea.")
    return f"C{sequence}|{command}\n".encode("ascii")


class Cmd:
    @staticmethod
    def client_gui(client_id=None):
        if client_id is None:
            return "client gui"
        if not isinstance(client_id, str) or not re.match(r"^[0-9A-Fa-f-]{1,40}$", client_id):
            raise ValueError("client_id inválido.")
        return f"client gui {client_id}"

    @staticmethod
    def client_udpport(port):
        return f"client udpport {_int(port, 1, 65535, 'udpport')}"

    @staticmethod
    def slice_list():
        return "slice list"

    @staticmethod
    def slice_create(freq_mhz, mode=None):
        text = f"slice create freq={_mhz(freq_mhz)}"
        if mode is not None:
            text += f" mode={Cmd._mode(mode)}"
        return text

    @staticmethod
    def _mode(mode):
        if mode not in SLICE_MODES:
            raise ValueError("Modo SmartSDR sin fuente (SmartSDR-Supported-Modes no leída).")
        return mode

    @staticmethod
    def slice_tune(slice_no, freq_mhz):
        return f"slice tune {_int(slice_no, 0, 0xFFFF, 'slice')} {_mhz(freq_mhz)}"

    @staticmethod
    def slice_set_mode(slice_no, mode):
        return f"slice set {_int(slice_no, 0, 0xFFFF, 'slice')} mode={Cmd._mode(mode)}"

    @staticmethod
    def slice_set_rit(slice_no, on, hz):
        return f"slice set {_int(slice_no, 0, 0xFFFF, 'slice')} rit_on={int(bool(on))} rit_freq={_int(hz, -10**6, 10**6, 'rit_freq')}"

    @staticmethod
    def slice_set_xit(slice_no, on, hz):
        return f"slice set {_int(slice_no, 0, 0xFFFF, 'slice')} xit_on={int(bool(on))} xit_freq={_int(hz, -10**6, 10**6, 'xit_freq')}"

    @staticmethod
    def slice_remove(slice_no):
        return f"slice remove {_int(slice_no, 0, 0xFFFF, 'slice')}"

    @staticmethod
    def meter_list():
        return "meter list"

    @staticmethod
    def subscribe(obj, target="all"):
        if obj not in SUBSCRIBE_OBJECTS:
            raise ValueError("Objeto de suscripción no documentado.")
        if target != "all" and not (isinstance(target, int) and not isinstance(target, bool) and target >= 0):
            raise ValueError("Destino de suscripción inválido.")
        return f"sub {obj} {target}"

    @staticmethod
    def unsubscribe(obj, target="all"):
        return Cmd.subscribe(obj, target).replace("sub ", "unsub ", 1)

    @staticmethod
    def transmit_tune(on):
        return f"transmit tune {'on' if on else 'off'}"

    @staticmethod
    def transmit_set(**params):
        if not params:
            raise ValueError("transmit set sin parámetros.")
        parts = []
        for key, value in params.items():
            if key in TRANSMIT_SET_PERCENT:
                parts.append(f"{key}={_int(value, 0, 100, key)}")
            elif key in TRANSMIT_SET_BOOL:
                parts.append(f"{key}={_int(value, 0, 1, key)}")
            else:
                raise ValueError(f"{key} no está permitido (max_power_level/region excluidos; vox_*: pendiente de fuente).")
        return "transmit set " + " ".join(parts)

    @staticmethod
    def atu_start():
        return "atu start"

    @staticmethod
    def atu_bypass():
        return "atu bypass"

    @staticmethod
    def atu_dump():
        return "atu dump"

    @staticmethod
    def interlock_timeout(ms):
        return f"interlock timeout={_int(ms, 1, 3_600_000, 'timeout')}"

    @staticmethod
    def amplifier_operate(handle, operate):
        return f"amplifier set {_hex_id(handle, 'handle')} operate={int(bool(operate))}"

    @staticmethod
    def pan_create(freq_mhz):
        return f"display pan c freq={_mhz(freq_mhz)}"

    @staticmethod
    def pan_set(pan_id, **params):
        allowed = {"center": _mhz, "bandwidth": _mhz,
                   "xpixels": lambda v: str(_int(v, 1, 65535, "xpixels")),
                   "ypixels": lambda v: str(_int(v, 1, 65535, "ypixels")),
                   "fps": lambda v: str(_int(v, 1, 1000, "fps")),
                   "min_dbm": lambda v: f"{float(v):.1f}", "max_dbm": lambda v: f"{float(v):.1f}"}
        if not params or any(key not in allowed for key in params):
            raise ValueError("Parámetros de pan no documentados.")
        return f"display pan s {_hex_id(pan_id, 'pan')} " + " ".join(f"{k}={allowed[k](v)}" for k, v in params.items())

    @staticmethod
    def pan_remove(pan_id):
        return f"display pan r {_hex_id(pan_id, 'pan')}"

    @staticmethod
    def stream_remote_audio_rx(compression="opus"):
        if compression not in ("none", "opus"):
            raise ValueError("compression debe ser none u opus.")
        return f"stream create type=remote_audio_rx compression={compression}"

    @staticmethod
    def stream_remove(stream_id):
        return f"stream remove {_hex_id(stream_id, 'stream')}"


# --- Power Genius XL (TCP 9008) ----------------------------------------------


def parse_pgxl_status(text: str) -> dict:
    """`status` reply: `state=STANDBY ...`. Only key=value pairs; the field list is pendiente de fuente."""
    fields = {}
    for token in text.split():
        key, sep, value = token.partition("=")
        if sep:
            fields[key] = value
    if "state" not in fields:
        raise ValueError("La respuesta PGXL no contiene state=.")
    return fields


PGXL_STATUS_COMMAND = "status"


# --- Session -----------------------------------------------------------------


class TcpTransport:
    def __init__(self, host: str, port: int = SMARTSDR_TCP_PORT, timeout: float = 5.0) -> None:
        self._sock = socket.create_connection((host, port), timeout=timeout)
        self._buffer = b""

    def send(self, data: bytes) -> None:
        self._sock.sendall(data)

    def recv_line(self, timeout: float):
        self._sock.settimeout(max(timeout, 0.001))
        while b"\n" not in self._buffer:
            if len(self._buffer) > MAX_SMARTSDR_FRAME_BYTES:
                raise SmartSdrError("Línea SmartSDR demasiado larga.")
            try:
                chunk = self._sock.recv(4096)
            except socket.timeout:
                return None
            if not chunk:
                raise SmartSdrError("La radio cerró la conexión.")
            self._buffer += chunk
        line, _, self._buffer = self._buffer.partition(b"\n")
        return line

    def close(self) -> None:
        try:
            self._sock.close()
        except OSError:
            pass


@dataclass
class SmartSdrSession:
    """One SmartSDR TCP session. TX needs allow_tx (default off) and is time capped.

    No keepalive is sent: the ping syntax is pendiente de fuente, so the radio may
    drop an idle client after 15 s if keepalive was enabled by someone else.
    """

    transport: object
    allow_tx: bool = False
    allow_amplifier_operate: bool = False
    tx_cap_s: float = 30.0
    tune_limit: int = 20
    swr_limit: float = 3.0
    swr_trip_s: float = 1.0
    clock: Callable[[], float] = time.monotonic
    on_status: Optional[Callable] = None
    on_message: Optional[Callable] = None
    version: str = ""
    handle: int = 0
    meters: dict = field(default_factory=dict)
    status: dict = field(default_factory=dict)
    readings: dict = field(default_factory=dict)
    rejected_meters: int = 0
    tx_deadline: Optional[float] = None
    swr_tripped: bool = False
    tx_off_unverified: bool = False
    _seq: int = 1
    _amplifiers: set = field(default_factory=set)
    _swr_since: Optional[float] = None

    def handshake(self, timeout: float = 5.0) -> None:
        deadline = self.clock() + timeout
        while not (self.version and self.handle):
            remaining = deadline - self.clock()
            if remaining <= 0:
                raise SmartSdrError("La radio no envió V y H.")
            self._dispatch(self.transport.recv_line(remaining))

    def _dispatch(self, line):
        if line is None:
            return None
        kind, value = parse_line(line)
        if kind == "version":
            self.version = value
        elif kind == "handle":
            self.handle = value
        elif kind == "status":
            key = (value.object, value.ids)
            self.status.setdefault(key, {}).update(value.fields)
            if self.on_status:
                self.on_status(value)
        elif kind == "message":
            if self.on_message:
                self.on_message(value)
        return kind, value

    def command(self, text: str, timeout: float = 5.0, check: bool = True) -> SmartSdrResponse:
        sequence = self._seq
        self._seq = (self._seq + 1) & MAX_SMARTSDR_SEQUENCE
        self.transport.send(frame_command(sequence, text))
        deadline = self.clock() + timeout
        while True:
            remaining = deadline - self.clock()
            if remaining <= 0:
                raise SmartSdrError(f"{text}: sin respuesta.")
            item = self._dispatch(self.transport.recv_line(remaining))
            if item and item[0] == "reply" and item[1].sequence == sequence:
                if check and not item[1].succeeded:
                    raise SmartSdrCommandError(text, item[1])
                return item[1]

    def pump(self, timeout: float = 0.0) -> None:
        """Process asynchronous S/M lines (also enforces the TX time cap)."""
        self._dispatch(self.transport.recv_line(timeout))
        self.tick()

    def connect_setup(self, client_id=None, udp_port=None) -> None:
        self.command(Cmd.client_gui(client_id))
        if udp_port is not None:
            self.command(Cmd.client_udpport(udp_port))
        self.command(Cmd.interlock_timeout(int(self.tx_cap_s * 1000)))
        listing = self.command(Cmd.meter_list())
        self.meters = parse_meter_list(listing.message)
        self.command(Cmd.subscribe("meter"))

    # TX: every method below is an explicit operator action.

    def _require_tx(self, tune_power) -> None:
        if not self.allow_tx:
            raise SmartSdrError("TX desactivado por configuración.")
        if self.swr_tripped:
            raise SmartSdrError("ROE alta: reinicia la alerta antes de transmitir.")
        _int(tune_power, 0, 100, "tunepower")
        if tune_power > self.tune_limit:
            raise SmartSdrError("tunepower supera el límite de sintonía de la estación.")

    def tune_start(self, tune_power: int) -> None:
        self._require_tx(tune_power)
        self.command(Cmd.transmit_set(tunepower=tune_power))
        self.command(Cmd.transmit_tune(True))
        self.tx_deadline = self.clock() + self.tx_cap_s

    def atu_start(self, tune_power: int) -> None:
        self._require_tx(tune_power)
        self.command(Cmd.transmit_set(tunepower=tune_power))
        self.command(Cmd.atu_start())
        self.tx_deadline = self.clock() + self.tx_cap_s

    def unkey(self, attempts: int = 3) -> bool:
        """Send `transmit tune off`; a reply with code 0 counts as verified TX off."""
        for _ in range(attempts):
            try:
                if self.command(Cmd.transmit_tune(False), timeout=2.0, check=False).succeeded:
                    self.tx_deadline = None
                    self.tx_off_unverified = False
                    return True
            except (SmartSdrError, OSError, ValueError):
                continue
        self.tx_off_unverified = True
        return False

    def tick(self) -> None:
        if self.tx_deadline is not None and self.clock() >= self.tx_deadline:
            self.unkey()

    def reset_swr_trip(self) -> None:
        self.swr_tripped = False
        self._swr_since = None

    def amplifier_operate(self, handle: str, operate: bool) -> None:
        if operate:
            if not self.allow_amplifier_operate:
                raise SmartSdrError("Amplificador: OPERATE desactivado (STANDBY por defecto).")
            if self.swr_tripped:
                raise SmartSdrError("ROE alta: amplificador bloqueado.")
        self.command(Cmd.amplifier_operate(handle, operate))
        (self._amplifiers.add if operate else self._amplifiers.discard)(handle)

    def emergency_stop(self) -> bool:
        ok = self.unkey()
        for handle in sorted(self._amplifiers):
            try:
                self.command(Cmd.amplifier_operate(handle, False), timeout=2.0, check=False)
                self._amplifiers.discard(handle)
            except (SmartSdrError, OSError, ValueError):
                ok = False
        return ok

    def close(self) -> None:
        try:
            self.emergency_stop()
        finally:
            self.transport.close()

    # Meters

    def ingest_meter_packet(self, packet: bytes) -> dict:
        for meter_id, raw in decode_meter_payload(parse_vita_packet(packet).payload):
            meter = self.meters.get(meter_id)
            if meter is None:
                continue
            value, verified = scale_meter(raw, meter.unit)
            if value is None:
                continue
            if meter.low is not None and meter.high is not None:
                margin = (meter.high - meter.low) * 0.1
                if not meter.low - margin <= value <= meter.high + margin:
                    self.rejected_meters += 1
                    continue
            self.readings[meter.name] = (value, verified)
        normalized = normalize_meters(self.readings)
        self._check_swr(normalized["swr"])
        return normalized

    def _check_swr(self, swr) -> None:
        if swr is None or swr <= self.swr_limit or self.tx_deadline is None:
            self._swr_since = None
            return
        now = self.clock()
        if self._swr_since is None:
            self._swr_since = now
        elif now - self._swr_since >= self.swr_trip_s:
            self.swr_tripped = True
            self.emergency_stop()
