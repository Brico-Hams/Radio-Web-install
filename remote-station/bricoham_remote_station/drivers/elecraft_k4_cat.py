from enum import IntEnum, StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_number, parse_ascii_cat_reply


class ElecraftK4ReadCommand(StrEnum):
    VFO_A_FREQUENCY = "FA"
    VFO_B_FREQUENCY = "FB"
    VFO_A_MODE = "MD"
    VFO_B_MODE = "MD$"


class ElecraftK4Mode(IntEnum):
    LSB = 1
    USB = 2
    CW = 3
    FM = 4
    AM = 5
    DATA = 6
    CW_REVERSE = 7
    DATA_REVERSE = 9


_FREQUENCY_COMMANDS = (
    ElecraftK4ReadCommand.VFO_A_FREQUENCY,
    ElecraftK4ReadCommand.VFO_B_FREQUENCY,
)
_MODE_COMMANDS = (
    ElecraftK4ReadCommand.VFO_A_MODE,
    ElecraftK4ReadCommand.VFO_B_MODE,
)


def build_query(command: ElecraftK4ReadCommand) -> bytes:
    if not isinstance(command, ElecraftK4ReadCommand):
        raise ValueError("Solo se permiten consultas K4 predefinidas.")
    return f"{command.value};".encode("ascii")


def parse_frequency_reply(command: ElecraftK4ReadCommand, frame: bytes) -> int:
    if not isinstance(command, ElecraftK4ReadCommand) or command not in _FREQUENCY_COMMANDS:
        raise ValueError("La consulta debe ser FA o FB.")
    return parse_ascii_cat_number(command.value, frame, 11)


def parse_mode_reply(command: ElecraftK4ReadCommand, frame: bytes) -> ElecraftK4Mode:
    if not isinstance(command, ElecraftK4ReadCommand) or command not in _MODE_COMMANDS:
        raise ValueError("La consulta debe ser MD o MD$.")
    payload = parse_ascii_cat_reply(command.value, frame)
    if len(payload) != 1 or not payload.isdigit():
        raise ValueError("El modo K4 debe ser un código numérico de un dígito.")
    try:
        return ElecraftK4Mode(int(payload))
    except ValueError as error:
        raise ValueError(f"Código de modo K4 no documentado: {payload.decode('ascii')}") from error
