from enum import IntEnum, StrEnum


class IcomCivModel(StrEnum):
    IC_705 = "IC-705"
    IC_7100 = "IC-7100"
    IC_7200 = "IC-7200"
    IC_7300 = "IC-7300"
    IC_7300_MK2 = "IC-7300MK2"
    IC_7410 = "IC-7410"
    IC_7600 = "IC-7600"
    IC_7610 = "IC-7610"
    IC_7700 = "IC-7700"
    IC_7760 = "IC-7760"
    IC_7850 = "IC-7850"
    IC_7851 = "IC-7851"
    IC_905 = "IC-905"
    IC_9100 = "IC-9100"
    IC_9700 = "IC-9700"
    IC_R8600 = "IC-R8600"


class IcomReadCommand(IntEnum):
    FREQUENCY = 0x03
    MODE = 0x04


class IcomCivMode(IntEnum):
    LSB = 0x00
    USB = 0x01
    AM = 0x02
    CW = 0x03
    RTTY = 0x04
    FM = 0x05
    WFM = 0x06
    CW_REVERSE = 0x07
    RTTY_REVERSE = 0x08
    DV = 0x17
    DD = 0x22


CONTROLLER_ADDRESS = 0xE0
_RADIO_ADDRESSES = {
    IcomCivModel.IC_705: 0xA4,
    IcomCivModel.IC_7100: 0x88,
    IcomCivModel.IC_7200: 0x76,
    IcomCivModel.IC_7300: 0x94,
    IcomCivModel.IC_7300_MK2: 0xB6,
    IcomCivModel.IC_7410: 0x80,
    IcomCivModel.IC_7600: 0x7A,
    IcomCivModel.IC_7610: 0x98,
    IcomCivModel.IC_7700: 0x74,
    IcomCivModel.IC_7760: 0xB2,
    IcomCivModel.IC_7850: 0x8E,
    IcomCivModel.IC_7851: 0x8E,
    IcomCivModel.IC_905: 0xAC,
    IcomCivModel.IC_9100: 0x7C,
    IcomCivModel.IC_9700: 0xA2,
    IcomCivModel.IC_R8600: 0x96,
}
_PREAMBLE = b"\xfe\xfe"
_END = 0xFD
_FREQUENCY_DATA_BYTES = 5
_MODE_DATA_LENGTHS = (1, 2)


class Ic7300Setting(StrEnum):
    POWER = "140A"
    TX = "1C00"
    TUNER = "1C01"
    PTT_TUNE = "1A050035"


def build_ic7300_setting_query(setting: Ic7300Setting) -> bytes:
    if not isinstance(setting, Ic7300Setting):
        raise ValueError("Select a documented IC-7300 setting.")
    return b"\xfe\xfe\x94\xe0" + bytes.fromhex(setting.value) + b"\xfd"


def parse_ic7300_setting(setting: Ic7300Setting, frame: bytes) -> int:
    request = build_ic7300_setting_query(setting)
    prefix = b"\xfe\xfe\xe0\x94" + request[4:-1]
    length = 2 if setting is Ic7300Setting.POWER else 1
    if (
        not isinstance(frame, bytes)
        or len(frame) != len(prefix) + length + 1
        or not frame.startswith(prefix)
        or frame[-1:] != b"\xfd"
    ):
        raise ValueError("Invalid IC-7300 setting reply.")
    data = frame[len(prefix) : -1]
    if setting is Ic7300Setting.POWER:
        if any(byte >> 4 > 9 or byte & 15 > 9 for byte in data):
            raise ValueError("Invalid power BCD.")
        value = (data[0] >> 4) * 1000 + (data[0] & 15) * 100 + (data[1] >> 4) * 10 + (data[1] & 15)
        if value > 255:
            raise ValueError("Power position exceeds the documented range.")
        return value
    if data[0] not in ((0, 1, 2) if setting is Ic7300Setting.TUNER else (0, 1)):
        raise ValueError("Unknown IC-7300 setting state.")
    return data[0]


def build_ic7300_power_set(level: int) -> bytes:
    if type(level) is not int or not 0 <= level <= 255:
        raise ValueError("Power position must be an integer from 0 to 255, not watts.")
    return b"\xfe\xfe\x94\xe0\x14\x0a" + bytes.fromhex(f"{level:04d}") + b"\xfd"


def build_ic7300_tuner_set(enabled: bool) -> bytes:
    if type(enabled) is not bool:
        raise ValueError("Tuner switching requires an explicit boolean.")
    return b"\xfe\xfe\x94\xe0\x1c\x01" + bytes((int(enabled), 0xFD))


def parse_ic7300_setting_ack(frame: bytes) -> bool:
    if frame == b"\xfe\xfe\xe0\x94\xfb\xfd":
        return True
    if frame == b"\xfe\xfe\xe0\x94\xfa\xfd":
        return False
    raise ValueError("Invalid IC-7300 setting acknowledgement.")


class Ic705Meter(IntEnum):
    """CI-V command 15 sub-commands (IC-705 CI-V Reference Guide, printed p.4 / txt page 5)."""

    S_METER = 0x02
    PO = 0x11
    SWR = 0x12
    ALC = 0x13
    COMP = 0x14
    VD = 0x15
    ID = 0x16


# Anchor points (raw 0000-0255, value) cited by the guide; values in between are linear interpolations, not
# calibrations. data/remote-meter-model.json profiles.ic705 carries the same table.
_IC705_POINTS = {
    Ic705Meter.PO: ((0, 0.0), (143, 50.0), (213, 100.0)),  # percent of full power
    Ic705Meter.SWR: ((0, 1.0), (48, 1.5), (80, 2.0), (120, 3.0)),
    Ic705Meter.ALC: ((0, 0.0), (120, 100.0)),  # 0120 = maximum, percent of that
    Ic705Meter.COMP: ((0, 0.0), (130, 15.0), (210, 25.5)),  # dB
    Ic705Meter.VD: ((0, 0.0), (75, 5.0), (241, 16.0)),  # volts
    Ic705Meter.ID: ((0, 0.0), (121, 2.0), (241, 4.0)),  # amperes
}
_IC705_S9_RAW = 120
_IC705_S_OVER = (241, 60.0)  # raw 0241 = S9+60 dB


def build_ic705_meter_query(meter: Ic705Meter) -> bytes:
    if not isinstance(meter, Ic705Meter):
        raise ValueError("Select a documented IC-705 meter sub-command.")
    return _PREAMBLE + bytes(
        (_RADIO_ADDRESSES[IcomCivModel.IC_705], CONTROLLER_ADDRESS, 0x15, meter.value, _END)
    )


def parse_ic705_meter_reply(meter: Ic705Meter, frame: bytes) -> int:
    """FE FE E0 A4 15 <sub> <2 BCD bytes 0000-0255> FD -> raw value."""
    request = build_ic705_meter_query(meter)
    prefix = _PREAMBLE + bytes((CONTROLLER_ADDRESS, _RADIO_ADDRESSES[IcomCivModel.IC_705], 0x15, meter.value))
    if (
        not isinstance(frame, bytes)
        or len(frame) != len(request) + 2
        or not frame.startswith(prefix)
        or frame[-1] != _END
    ):
        raise ValueError("Invalid IC-705 meter reply.")
    data = frame[len(prefix) : -1]
    if any(byte >> 4 > 9 or byte & 15 > 9 for byte in data):
        raise ValueError("Invalid IC-705 meter BCD.")
    raw = (data[0] >> 4) * 1000 + (data[0] & 15) * 100 + (data[1] >> 4) * 10 + (data[1] & 15)
    if raw > 255:
        raise ValueError("IC-705 meter value exceeds the documented 0000-0255 range.")
    return raw


def _interpolate(points: tuple[tuple[int, float], ...], raw: int) -> float:
    previous = points[0]
    for point in points[1:]:
        if raw <= point[0]:
            return previous[1] + (point[1] - previous[1]) * (raw - previous[0]) / (point[0] - previous[0])
        previous = point
    return previous[1]


def ic705_meter_value(meter: Ic705Meter, raw: int) -> tuple[float | None, str]:
    """Raw -> (value, unit). SWR above 0120 and ALC above its maximum are not given by the guide."""
    if not isinstance(meter, Ic705Meter) or type(raw) is not int or not 0 <= raw <= 255:
        raise ValueError("Invalid IC-705 meter reading.")
    if meter is Ic705Meter.S_METER:
        if raw <= _IC705_S9_RAW:
            return raw * 9 / _IC705_S9_RAW, "S"
        over_raw, over_db = _IC705_S_OVER
        return 9 + min(over_db, (raw - _IC705_S9_RAW) * over_db / (over_raw - _IC705_S9_RAW)), "S+dB"
    points = _IC705_POINTS[meter]
    value = _interpolate(points, raw)
    if meter is Ic705Meter.SWR:
        return (None if raw > points[-1][0] else value), ""
    unit = {Ic705Meter.PO: "%", Ic705Meter.ALC: "%", Ic705Meter.COMP: "dB", Ic705Meter.VD: "V", Ic705Meter.ID: "A"}[meter]
    return (min(value, 100.0) if meter is Ic705Meter.ALC else value), unit


def build_ic705_state_query(tuner: bool) -> bytes:
    """1C 00 transceiver status (00 RX, 01 TX) or 1C 01 antenna tuner (00 OFF, 01 ON, 02 Tune); guide txt page 15."""
    return _PREAMBLE + bytes((_RADIO_ADDRESSES[IcomCivModel.IC_705], CONTROLLER_ADDRESS, 0x1C, 1 if tuner else 0, _END))


def parse_ic705_state_reply(tuner: bool, frame: bytes) -> int:
    request = build_ic705_state_query(tuner)
    prefix = _PREAMBLE + bytes((CONTROLLER_ADDRESS, _RADIO_ADDRESSES[IcomCivModel.IC_705], 0x1C, 1 if tuner else 0))
    if not isinstance(frame, bytes) or len(frame) != len(request) + 1 or not frame.startswith(prefix) or frame[-1] != _END:
        raise ValueError("Invalid IC-705 state reply.")
    if frame[-2] not in ((0, 1, 2) if tuner else (0, 1)):
        raise ValueError("Unknown IC-705 state.")
    return frame[-2]


def build_query(model: IcomCivModel, command: IcomReadCommand) -> bytes:
    if not isinstance(model, IcomCivModel):
        raise ValueError("El modelo debe pertenecer a la lista CI-V documentada.")
    if not isinstance(command, IcomReadCommand):
        raise ValueError("Solo se permiten consultas CI-V de frecuencia o modo.")
    return _PREAMBLE + bytes((_RADIO_ADDRESSES[model], CONTROLLER_ADDRESS, command.value, _END))


def parse_frequency_reply(model: IcomCivModel, frame: bytes) -> int:
    payload = _parse_reply(model, IcomReadCommand.FREQUENCY, frame, (11,))
    if len(payload) != _FREQUENCY_DATA_BYTES:
        raise ValueError("La respuesta CI-V de frecuencia debe contener cinco bytes BCD.")

    frequency_hz = 0
    for byte_index, value in enumerate(payload):
        high_nibble, low_nibble = value >> 4, value & 0x0F
        if high_nibble > 9 or low_nibble > 9:
            raise ValueError("La respuesta CI-V de frecuencia contiene BCD no válido.")
        frequency_hz += (high_nibble * 10 + low_nibble) * (100**byte_index)
    return frequency_hz


def parse_mode_reply(model: IcomCivModel, frame: bytes) -> IcomCivMode:
    payload = _parse_reply(model, IcomReadCommand.MODE, frame, (7, 8))
    if len(payload) not in _MODE_DATA_LENGTHS:
        raise ValueError("La respuesta CI-V de modo debe contener uno o dos bytes.")
    if len(payload) == 2 and payload[1] not in (0x01, 0x02, 0x03):
        raise ValueError("La respuesta CI-V de modo contiene un filtro no válido.")
    try:
        return IcomCivMode(payload[0])
    except ValueError as error:
        raise ValueError(f"Código de modo CI-V no documentado: 0x{payload[0]:02X}.") from error


def _parse_reply(
    model: IcomCivModel,
    command: IcomReadCommand,
    frame: bytes,
    valid_lengths: tuple[int, ...],
) -> bytes:
    if not isinstance(model, IcomCivModel):
        raise ValueError("El modelo debe pertenecer a la lista CI-V documentada.")
    if not isinstance(frame, bytes):
        raise ValueError("La respuesta CI-V debe ser bytes.")
    if len(frame) not in valid_lengths:
        raise ValueError("La respuesta CI-V tiene una longitud no válida.")
    if frame[:2] != _PREAMBLE or frame[-1] != _END:
        raise ValueError("La respuesta CI-V debe comenzar FE FE y terminar FD.")
    if frame[2] != CONTROLLER_ADDRESS:
        raise ValueError("La respuesta CI-V no está dirigida al controlador E0.")
    if frame[3] != _RADIO_ADDRESSES[model]:
        raise ValueError("La dirección CI-V de la respuesta no coincide con el modelo.")
    if frame[4] != command.value:
        raise ValueError("La respuesta CI-V no coincide con la consulta.")
    return frame[5:-1]
