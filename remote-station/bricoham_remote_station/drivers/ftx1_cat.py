import math
from dataclasses import dataclass
from enum import IntEnum, StrEnum

from bricoham_remote_station.drivers.cat_codec import (
    parse_ascii_cat_number,
    parse_ascii_cat_reply,
)


class Ftx1ReadCommand(StrEnum):
    # Legacy member names: FA/FB address MAIN/SUB, not the active VFO selection.
    VFO_A_FREQUENCY = "FA"
    VFO_B_FREQUENCY = "FB"
    MODE = "MD0"
    SUB_MODE = "MD1"
    IDENTIFICATION = "ID"
    POWER = "PC"
    TUNER = "AC"
    TX_STATE = "TX"
    TRANSMITTER = "FT"
    SPLIT = "ST"
    MAIN_INFORMATION = "IF"
    VOX = "VX"
    KEYER_SPEED = "KS"
    KEY_PITCH = "KP"
    KEYER = "KR"
    BREAK_IN = "BI"


class Ftx1Mode(StrEnum):
    LSB = "1"
    USB = "2"
    CW_U = "3"
    FM = "4"
    AM = "5"
    RTTY_L = "6"
    CW_L = "7"
    DATA_L = "8"
    RTTY_U = "9"
    DATA_FM = "A"
    FM_N = "B"
    DATA_U = "C"
    AM_N = "D"
    PSK = "E"
    DATA_FM_N = "F"
    C4FM_DN = "H"
    C4FM_VW = "I"


class Ftx1TxState(IntEnum):
    RX = 0
    CAT_TX = 1
    RADIO_TX = 2


@dataclass(frozen=True)
class Ftx1PowerReading:
    head: str
    watts: int


@dataclass(frozen=True)
class Ftx1MainInformation:
    frequency_hz: int
    mode: Ftx1Mode
    is_vfo: bool
    tx_clarifier_enabled: bool
    simplex: bool


def parse_transmitter_reply(frame: bytes) -> str:
    payload = parse_ascii_cat_reply("FT", frame)
    if payload not in (b"0", b"1"):
        raise ValueError("Invalid FTX-1 transmitter selection.")
    return "MAIN" if payload == b"0" else "SUB"


def parse_split_reply(frame: bytes) -> bool:
    payload = parse_ascii_cat_reply("ST", frame)
    if payload not in (b"0", b"1"):
        raise ValueError("Invalid FTX-1 split state.")
    return payload == b"1"


def parse_vox_reply(frame: bytes) -> bool:
    payload = parse_ascii_cat_reply("VX", frame)
    if payload not in (b"0", b"1"):
        raise ValueError("Invalid FTX-1 VOX state.")
    return payload == b"1"


def parse_keyer_speed_reply(frame: bytes) -> int:
    speed = parse_ascii_cat_number("KS", frame, 3)
    if not 4 <= speed <= 60:
        raise ValueError("FTX-1 keyer speed is outside the documented 4..60 WPM range.")
    return speed


def parse_key_pitch_reply(frame: bytes) -> int:
    code = parse_ascii_cat_number("KP", frame, 2)
    if code > 75:
        raise ValueError("FTX-1 key pitch is outside the documented 300..1050 Hz range.")
    return 300 + 10 * code


def parse_keyer_reply(frame: bytes) -> bool:
    code = parse_ascii_cat_number("KR", frame, 1)
    if code not in (0, 1):
        raise ValueError("Invalid FTX-1 CW keyer state.")
    return code == 1


def parse_break_in_reply(frame: bytes) -> bool:
    code = parse_ascii_cat_number("BI", frame, 1)
    if code not in (0, 1):
        raise ValueError("Invalid FTX-1 break-in state.")
    return code == 1


def parse_main_information(frame: bytes) -> Ftx1MainInformation:
    payload = parse_ascii_cat_reply("IF", frame)
    if (
        len(payload) != 27
        or not payload[:14].isdigit()
        or payload[14:15] not in (b"+", b"-")
        or not payload[15:19].isdigit()
        or payload[19:20] not in (b"0", b"1")
        or payload[20:21] not in (b"0", b"1")
        or payload[22:23] not in (b"0", b"1", b"2", b"3", b"5")
        or payload[23:24] not in (b"0", b"1", b"2", b"3", b"4", b"5")
        or payload[24:26] != b"00"
        # 3 = ARS: undocumented in the IF section, sent by a real FTX-1 (see docs/FTX1-KNOWLEDGE.md).
        or payload[26:27] not in (b"0", b"1", b"2", b"3")
    ):
        raise ValueError("Invalid FTX-1 MAIN information layout (2508-C).")
    return Ftx1MainInformation(
        parse_frequency_reply(Ftx1ReadCommand.VFO_A_FREQUENCY, b"FA" + payload[5:14] + b";"),
        Ftx1Mode(payload[21:22].decode("ascii")),
        payload[:5] == b"00000" and payload[22:23] == b"0",
        payload[20:21] == b"1",
        payload[26:27] == b"0",
    )


def build_tx_set(enabled: bool) -> bytes:
    if type(enabled) is not bool:
        raise ValueError("An explicit boolean is required for CAT PTT.")
    return b"TX1;" if enabled else b"TX0;"


@dataclass(frozen=True)
class Ftx1TunerReading:
    controller: str
    accessory: str
    state_code: int

    @property
    def tuning_requested(self) -> bool:
        return self.state_code != 0 if self.accessory == "ATAS" else self.state_code == 3


def build_query(command: Ftx1ReadCommand) -> bytes:
    if not isinstance(command, Ftx1ReadCommand):
        raise ValueError("Solo se permiten consultas FTX-1 predefinidas.")
    return f"{command.value};".encode("ascii")


def parse_frequency_field(command: Ftx1ReadCommand, frame: bytes) -> str:
    if not isinstance(command, Ftx1ReadCommand) or command not in {
        Ftx1ReadCommand.VFO_A_FREQUENCY,
        Ftx1ReadCommand.VFO_B_FREQUENCY,
    }:
        raise ValueError("El comando no devuelve una frecuencia VFO.")
    payload = parse_ascii_cat_reply(command.value, frame)
    if len(payload) != 9 or not payload.isdigit():
        raise ValueError("El campo de frecuencia FTX-1 debe contener 9 dígitos.")
    return payload.decode("ascii")


def parse_frequency_reply(command: Ftx1ReadCommand, frame: bytes) -> int:
    frequency = int(parse_frequency_field(command, frame))
    if not 30_000 <= frequency <= 470_000_000:
        raise ValueError("FTX-1 frequency is outside the documented 2508-C range in Hz.")
    return frequency


def build_frequency_set(command: Ftx1ReadCommand, frequency_hz: int) -> bytes:
    if not isinstance(command, Ftx1ReadCommand) or command not in (
        Ftx1ReadCommand.VFO_A_FREQUENCY,
        Ftx1ReadCommand.VFO_B_FREQUENCY,
    ):
        raise ValueError("Select an explicit FTX-1 MAIN/SUB frequency command.")
    if type(frequency_hz) is not int or not 30_000 <= frequency_hz <= 470_000_000:
        raise ValueError("FTX-1 frequency must be integer Hz in the documented range.")
    return f"{command.value}{frequency_hz:09d};".encode("ascii")


def build_mode_set(command: Ftx1ReadCommand, mode: Ftx1Mode) -> bytes:
    if (
        not isinstance(command, Ftx1ReadCommand)
        or command not in (Ftx1ReadCommand.MODE, Ftx1ReadCommand.SUB_MODE)
        or not isinstance(mode, Ftx1Mode)
    ):
        raise ValueError("Select an explicit FTX-1 MAIN/SUB mode and documented mode enum.")
    return f"{command.value}{mode.value};".encode("ascii")


def parse_mode_reply(command: Ftx1ReadCommand, frame: bytes) -> Ftx1Mode:
    if not isinstance(command, Ftx1ReadCommand) or command not in (
        Ftx1ReadCommand.MODE,
        Ftx1ReadCommand.SUB_MODE,
    ):
        raise ValueError("Select an explicit MAIN/SUB mode query.")
    payload = parse_ascii_cat_reply(command.value, frame)
    if len(payload) != 1:
        raise ValueError("FTX-1 mode requires one documented code.")
    try:
        return Ftx1Mode(payload.decode("ascii"))
    except ValueError as error:
        raise ValueError("Undocumented or reserved FTX-1 mode.") from error


def parse_power_reply(frame: bytes) -> Ftx1PowerReading:
    payload = parse_ascii_cat_reply("PC", frame)
    if len(payload) != 4 or payload[:1] not in (b"1", b"2") or not payload[1:].isdigit():
        raise ValueError("Invalid FTX-1 power control response.")
    watts = int(payload[1:])
    if not 5 <= watts <= (10 if payload[:1] == b"1" else 100):
        raise ValueError("Power value is outside the documented 2508-C range; no scale inferred.")
    return Ftx1PowerReading("field" if payload[:1] == b"1" else "SPA-1", watts)


def build_power_set(head: str, watts: int) -> bytes:
    if head not in ("field", "SPA-1"):
        raise ValueError("An explicitly observed FTX-1 head is required.")
    if type(watts) is not int or not 5 <= watts <= (10 if head == "field" else 100):
        raise ValueError("Power setpoint must be whole watts in the documented head range.")
    return f"PC{1 if head == 'field' else 2}{watts:03d};".encode("ascii")


def parse_tuner_reply(frame: bytes) -> Ftx1TunerReading:
    payload = parse_ascii_cat_reply("AC", frame)
    if (
        len(payload) != 3
        or payload[:1] not in (b"0", b"1")
        or payload[1:2] not in (b"0", b"2")
        or payload[2:]
        not in ((b"0", b"1", b"3") if payload[1:2] == b"0" else (b"0", b"1", b"2", b"3"))
    ):
        raise ValueError("Undocumented FTX-1 tuner/accessory response.")
    return Ftx1TunerReading(
        "internal_optima" if payload[:1] == b"0" else "external",
        "antenna_tuner" if payload[1:2] == b"0" else "ATAS",
        int(payload[2:]),
    )


def parse_tx_reply(frame: bytes) -> Ftx1TxState:
    payload = parse_ascii_cat_reply("TX", frame)
    if payload not in (b"0", b"1", b"2"):
        raise ValueError("Undocumented FTX-1 TX state.")
    return Ftx1TxState(int(payload))


def parse_identification_reply(frame: bytes) -> str:
    payload = parse_ascii_cat_reply(Ftx1ReadCommand.IDENTIFICATION.value, frame)
    if payload != b"0840":
        raise ValueError("La respuesta no coincide con el ID CAT documentado del FTX-1.")
    return payload.decode("ascii")


# Meters. RM P1 selects 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD with a raw 000-255 value and a
# reserved 000 tail; SM P1 nnn is the S meter (docs/FTX1-KNOWLEDGE.md RM and SM rows, CAT manual 2508-C).
# The scales mirror data/remote-meter-model.json (host-side estimates of bg7nzl-ftx1ctl ftx1cat.py, not calibrated);
# remote-meters.cjs is the reference and tests/test_ftx1_meters.py compares both.
FTX1_METER_KEYS = {1: "smeter", 2: "smeter-sub", 3: "comp", 4: "alc", 5: "po", 6: "swr", 7: "id", 8: "vdd"}
_PO_POINTS = ((55, 0.5), (73, 1.0), (113, 3.0), (139, 5.0), (164, 7.5), (189, 10.0), (255, 15.0))
_S_STEPS = ((0, 0), (14, 1), (42, 3), (81, 5), (103, 7))
_S_OVER = ((202, 20.0), (233, 40.0), (255, 60.0))
_S9_RAW = 128


@dataclass(frozen=True)
class Ftx1MeterReading:
    key: str
    raw: int


def build_meter_query(selector: int) -> bytes:
    if selector not in FTX1_METER_KEYS:
        raise ValueError("Undocumented FTX-1 RM meter selector.")
    return f"RM{selector};".encode("ascii")


def parse_meter_reply(frame: bytes) -> Ftx1MeterReading:
    payload = parse_ascii_cat_reply("RM", frame)
    if len(payload) != 7 or not payload.isdigit() or int(payload[:1]) not in FTX1_METER_KEYS:
        raise ValueError("Invalid FTX-1 RM meter response.")
    raw = int(payload[1:4])
    if raw > 255 or payload[4:] != b"000":
        raise ValueError("FTX-1 RM meter value outside 0-255 or non-zero reserved field.")
    return Ftx1MeterReading(FTX1_METER_KEYS[int(payload[:1])], raw)


def parse_smeter_reply(frame: bytes) -> Ftx1MeterReading:
    payload = parse_ascii_cat_reply("SM", frame)
    if len(payload) != 4 or payload[:1] not in (b"0", b"1") or not payload.isdigit() or int(payload[1:]) > 255:
        raise ValueError("Invalid FTX-1 SM S-meter response.")
    return Ftx1MeterReading("smeter" if payload[:1] == b"0" else "smeter-sub", int(payload[1:]))


def swr_from_raw(raw: int) -> float:
    if raw >= 255:
        return math.inf
    if raw <= 0:
        return 1.0
    return 1 + 0.333 * (math.exp(0.0151 * raw) - 1)


def alc_percent(raw: int) -> float:
    return min(200.0, raw * 200 / 252)


def comp_db(raw: int) -> float:
    return raw * 30 / 255


def drain_amps(raw: int) -> float:
    return raw * 3 / 255


def vdd_volts(raw: int) -> float:
    return raw * 13.8 / 203


def po_watts(raw: int, head: str) -> float | None:
    # The piecewise scale is only cited for the field head; with the SPA-1 the PO scale is pendiente de fuente.
    if head != "field":
        return None
    if raw <= 0:
        return 0.0
    previous = (0, 0.0)
    for point in _PO_POINTS:
        if raw <= point[0]:
            return previous[1] + (point[1] - previous[1]) * (raw - previous[0]) / (point[0] - previous[0])
        previous = point
    return previous[1]


def s_units(raw: int) -> tuple[int, float]:
    # (S units, dB over S9).
    if raw < _S9_RAW:
        return [units for start, units in _S_STEPS if raw >= start][-1], 0.0
    previous = (_S9_RAW, 0.0)
    for point in _S_OVER:
        if raw <= point[0]:
            return 9, previous[1] + (point[1] - previous[1]) * (raw - previous[0]) / (point[0] - previous[0])
        previous = point
    return 9, previous[1]
