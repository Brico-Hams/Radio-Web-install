from enum import IntEnum, StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_reply


class TruSdxReadCommand(StrEnum):
    VFO_FREQUENCY = "FA"
    MODE = "MD"
    STATUS = "IF"
    IDENTIFICATION = "ID"


class TruSdxMode(IntEnum):
    LSB = 1
    USB = 2
    CW = 3
    FM = 4
    AM = 5


def build_query(command: TruSdxReadCommand) -> bytes:
    if not isinstance(command, TruSdxReadCommand):
        raise ValueError("Solo se permiten consultas (tr)uSDX predefinidas.")
    return f"{command.value};".encode("ascii")


def parse_frequency_reply(frame: bytes) -> int:
    payload = parse_ascii_cat_reply(TruSdxReadCommand.VFO_FREQUENCY.value, frame)
    if len(payload) != 11 or not payload.isdigit():
        raise ValueError("La frecuencia (tr)uSDX debe contener 11 dígitos en Hz.")
    return int(payload)


def parse_mode_reply(frame: bytes) -> TruSdxMode:
    payload = parse_ascii_cat_reply(TruSdxReadCommand.MODE.value, frame)
    if len(payload) != 1 or not payload.isdigit():
        raise ValueError("El modo (tr)uSDX debe ser un código numérico de un dígito.")
    try:
        return TruSdxMode(int(payload))
    except ValueError as error:
        raise ValueError(
            f"Código de modo (tr)uSDX no documentado: {payload.decode('ascii')}"
        ) from error


def parse_identification_reply(frame: bytes) -> str:
    payload = parse_ascii_cat_reply(TruSdxReadCommand.IDENTIFICATION.value, frame)
    if payload != b"020":
        raise ValueError("La identificación CAT no coincide con el ID documentado del (tr)uSDX.")
    return payload.decode("ascii")
