from dataclasses import dataclass
from enum import IntEnum, StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_number, parse_ascii_cat_reply


class ElecraftK3SReadCommand(StrEnum):
    VFO_A_FREQUENCY = "FA"
    VFO_B_FREQUENCY = "FB"
    VFO_A_MODE = "MD"
    VFO_B_MODE = "MD$"
    VFO_A_BANDWIDTH = "BW"
    VFO_B_BANDWIDTH = "BW$"
    DATA_SUBMODE = "DT"
    LEGACY_IDENTIFICATION = "ID"
    OPTION_MODULES = "OM"


class ElecraftLegacyModel(StrEnum):
    K3 = "K3"
    KX3 = "KX3"
    KX2 = "KX2"


def legacy_read_commands(model: ElecraftLegacyModel) -> tuple[ElecraftK3SReadCommand, ...]:
    if not isinstance(model, ElecraftLegacyModel):
        raise ValueError("Select an explicit documented Elecraft legacy model.")
    return (
        ElecraftK3SReadCommand.VFO_A_FREQUENCY,
        ElecraftK3SReadCommand.VFO_B_FREQUENCY,
        ElecraftK3SReadCommand.VFO_A_MODE,
        ElecraftK3SReadCommand.VFO_B_MODE,
        ElecraftK3SReadCommand.VFO_A_BANDWIDTH,
        ElecraftK3SReadCommand.VFO_B_BANDWIDTH,
    )


class ElecraftK3SMode(IntEnum):
    LSB = 1
    USB = 2
    CW = 3
    FM = 4
    AM = 5
    DATA = 6
    CW_REVERSE = 7
    DATA_REVERSE = 9


class ElecraftK3SDataSubmode(IntEnum):
    DATA_A = 0
    AFSK_A = 1
    FSK_D = 2
    PSK_D = 3


@dataclass(frozen=True)
class ElecraftK3SOptions:
    installed_modules: str
    k3s_rf_board: bool


def build_query(command: ElecraftK3SReadCommand) -> bytes:
    if not isinstance(command, ElecraftK3SReadCommand):
        raise ValueError("Solo se permiten consultas K3S predefinidas.")
    return f"{command.value};".encode("ascii")


def _check_command(
    command: ElecraftK3SReadCommand, allowed: tuple[ElecraftK3SReadCommand, ...]
) -> None:
    if not isinstance(command, ElecraftK3SReadCommand) or command not in allowed:
        raise ValueError("La consulta K3S no corresponde al parser seleccionado.")


def parse_frequency_reply(command: ElecraftK3SReadCommand, frame: bytes) -> int:
    _check_command(
        command,
        (ElecraftK3SReadCommand.VFO_A_FREQUENCY, ElecraftK3SReadCommand.VFO_B_FREQUENCY),
    )
    return parse_ascii_cat_number(command.value, frame, 11)


def parse_mode_reply(command: ElecraftK3SReadCommand, frame: bytes) -> ElecraftK3SMode:
    _check_command(command, (ElecraftK3SReadCommand.VFO_A_MODE, ElecraftK3SReadCommand.VFO_B_MODE))
    code = parse_ascii_cat_number(command.value, frame, 1)
    try:
        return ElecraftK3SMode(code)
    except ValueError as error:
        raise ValueError(f"Código de modo K3S no documentado: {code}") from error


def parse_legacy_mode_reply(
    model: ElecraftLegacyModel, command: ElecraftK3SReadCommand, frame: bytes
) -> ElecraftK3SMode:
    legacy_read_commands(model)
    mode = parse_mode_reply(command, frame)
    if model is ElecraftLegacyModel.KX2 and mode is ElecraftK3SMode.FM:
        raise ValueError("FM is not applicable to KX2 in the G5 reference.")
    return mode


def parse_bandwidth_reply(command: ElecraftK3SReadCommand, frame: bytes) -> int:
    _check_command(
        command,
        (ElecraftK3SReadCommand.VFO_A_BANDWIDTH, ElecraftK3SReadCommand.VFO_B_BANDWIDTH),
    )
    return parse_ascii_cat_number(command.value, frame, 4) * 10


def parse_data_submode_reply(frame: bytes, mode: ElecraftK3SMode) -> ElecraftK3SDataSubmode:
    if not isinstance(mode, ElecraftK3SMode) or mode not in (
        ElecraftK3SMode.DATA,
        ElecraftK3SMode.DATA_REVERSE,
    ):
        raise ValueError("DT solo es válido cuando el modo K3S observado es DATA o DATA-REV.")
    code = parse_ascii_cat_number(ElecraftK3SReadCommand.DATA_SUBMODE.value, frame, 1)
    try:
        return ElecraftK3SDataSubmode(code)
    except ValueError as error:
        raise ValueError(f"Submodo DATA K3S no documentado: {code}") from error


def parse_legacy_identification_reply(frame: bytes) -> str:
    payload = parse_ascii_cat_reply(ElecraftK3SReadCommand.LEGACY_IDENTIFICATION.value, frame)
    if payload != b"017":
        raise ValueError("La identificación legacy Elecraft debe ser ID017.")
    return payload.decode("ascii")


def parse_option_modules_reply(frame: bytes) -> ElecraftK3SOptions:
    payload = parse_ascii_cat_reply(ElecraftK3SReadCommand.OPTION_MODULES.value, frame)
    positions = b"APXSDFfLVR--"
    if len(payload) != 13 or payload[:1] != b" ":
        raise ValueError("OM K3S debe contener un espacio y 12 posiciones de módulos.")
    modules = payload[1:]
    if any(
        actual not in (expected, ord("-"))
        for actual, expected in zip(modules, positions, strict=True)
    ):
        raise ValueError("OM K3S contiene un módulo no documentado en su posición.")
    return ElecraftK3SOptions(
        installed_modules=modules.replace(b"-", b"").decode("ascii"),
        k3s_rf_board=modules[9:10] == b"R",
    )
