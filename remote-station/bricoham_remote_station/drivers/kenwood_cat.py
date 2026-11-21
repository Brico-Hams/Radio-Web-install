from dataclasses import dataclass
from enum import StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_reply


class KenwoodReadCommand(StrEnum):
    VFO_A_FREQUENCY = "FA"
    VFO_B_FREQUENCY = "FB"


class KenwoodModel(StrEnum):
    TS_590S = "TS-590S"
    TS_590SG = "TS-590SG"
    TS_890S = "TS-890S"
    TS_990S = "TS-990S"


class KenwoodModeCommand(StrEnum):
    CURRENT_MODE = "MD"
    VFO_A_FREQUENCY_MODE = "SF0"
    VFO_B_FREQUENCY_MODE = "SF1"
    MAIN_MODE = "OM0"
    SUB_MODE = "OM1"


@dataclass(frozen=True)
class KenwoodModeReading:
    mode_code: str
    frequency_hz: int | None = None


_MODEL_MODE_COMMANDS = {
    KenwoodModel.TS_590S: (KenwoodModeCommand.CURRENT_MODE,),
    KenwoodModel.TS_590SG: (KenwoodModeCommand.CURRENT_MODE,),
    KenwoodModel.TS_890S: (
        KenwoodModeCommand.VFO_A_FREQUENCY_MODE,
        KenwoodModeCommand.VFO_B_FREQUENCY_MODE,
    ),
    KenwoodModel.TS_990S: (KenwoodModeCommand.MAIN_MODE, KenwoodModeCommand.SUB_MODE),
}


def build_query(command: KenwoodReadCommand) -> bytes:
    if not isinstance(command, KenwoodReadCommand):
        raise ValueError("Solo se permiten consultas Kenwood predefinidas.")
    return f"{command.value};".encode("ascii")


def parse_frequency_reply(command: KenwoodReadCommand, frame: bytes) -> int:
    if not isinstance(command, KenwoodReadCommand):
        raise ValueError("La consulta debe ser una orden de frecuencia Kenwood.")
    payload = parse_ascii_cat_reply(command.value, frame)
    if len(payload) != 11 or not payload.isdigit():
        raise ValueError("La frecuencia Kenwood debe contener 11 dígitos en Hz.")
    return int(payload)


def build_mode_query(model: KenwoodModel, command: KenwoodModeCommand) -> bytes:
    if not isinstance(model, KenwoodModel) or not isinstance(command, KenwoodModeCommand):
        raise ValueError("El modelo y la consulta Kenwood deben ser valores predefinidos.")
    if command not in mode_commands(model):
        raise ValueError("La consulta de modo no pertenece al perfil Kenwood seleccionado.")
    return f"{command.value};".encode("ascii")


def mode_commands(model: KenwoodModel) -> tuple[KenwoodModeCommand, ...]:
    if not isinstance(model, KenwoodModel):
        raise ValueError("El modelo Kenwood debe ser un valor predefinido.")
    return _MODEL_MODE_COMMANDS[model]


def parse_mode_reply(
    model: KenwoodModel, command: KenwoodModeCommand, frame: bytes
) -> KenwoodModeReading:
    build_mode_query(model, command)
    payload = parse_ascii_cat_reply(command.value, frame)
    frequency_hz = None
    if model == KenwoodModel.TS_890S:
        if len(payload) != 12 or not payload[:11].isdigit():
            raise ValueError("SF de TS-890S debe contener 11 dígitos de Hz y un código de modo.")
        frequency_hz = int(payload[:11])
        payload = payload[11:]
    if len(payload) != 1 or not (b"0" <= payload <= b"9" or b"A" <= payload <= b"Z"):
        raise ValueError("La respuesta Kenwood debe contener un código de modo ASCII.")
    return KenwoodModeReading(mode_code=payload.decode("ascii"), frequency_hz=frequency_hz)
