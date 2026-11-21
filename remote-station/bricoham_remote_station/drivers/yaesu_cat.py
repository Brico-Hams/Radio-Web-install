from enum import StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_reply


class YaesuModel(StrEnum):
    FT_710 = "FT-710"
    FT_991A = "FT-991A"
    FTDX10 = "FTDX10"
    FTDX101D = "FTDX101D"
    FTDX101MP = "FTDX101MP"
    FTDX3000 = "FTDX3000"


class YaesuReadCommand(StrEnum):
    FREQUENCY_A = "FA"
    FREQUENCY_B = "FB"
    MAIN_MODE = "MD0"
    SUB_MODE = "MD1"
    IDENTIFICATION = "ID"


class YaesuBand(StrEnum):
    MAIN = "MAIN"
    SUB = "SUB"


class YaesuMode(StrEnum):
    LSB = "LSB"
    USB = "USB"
    CW_U = "CW-U"
    CW = "CW"
    CW_L = "CW-L"
    CW_R = "CW-R"
    FM = "FM"
    FM_NARROW = "FM-N"
    AM = "AM"
    AM_NARROW = "AM-N"
    RTTY_LSB = "RTTY-LSB"
    RTTY_USB = "RTTY-USB"
    FSK_LSB = "FSK-LSB"
    FSK_USB = "FSK-USB"
    DATA_LSB = "DATA-LSB"
    DATA_USB = "DATA-USB"
    DATA_FM = "DATA-FM"
    DATA_FM_NARROW = "DATA-FM-N"
    PSK = "PSK"
    C4FM = "C4FM"
    PACKET_L = "PKT-L"
    PACKET_U = "PKT-U"
    PACKET_FM = "PKT-FM"


_SUPPORTED_COMMANDS = {
    YaesuModel.FT_710: frozenset(YaesuReadCommand),
    YaesuModel.FT_991A: frozenset(
        {
            YaesuReadCommand.FREQUENCY_A,
            YaesuReadCommand.FREQUENCY_B,
            YaesuReadCommand.MAIN_MODE,
            YaesuReadCommand.IDENTIFICATION,
        }
    ),
    YaesuModel.FTDX10: frozenset(YaesuReadCommand),
    YaesuModel.FTDX101D: frozenset(YaesuReadCommand),
    YaesuModel.FTDX101MP: frozenset(YaesuReadCommand),
    YaesuModel.FTDX3000: frozenset(
        {
            YaesuReadCommand.FREQUENCY_A,
            YaesuReadCommand.FREQUENCY_B,
            YaesuReadCommand.MAIN_MODE,
            YaesuReadCommand.IDENTIFICATION,
        }
    ),
}

_FREQUENCY_WIDTH = {
    YaesuModel.FT_710: 9,
    YaesuModel.FT_991A: 9,
    YaesuModel.FTDX10: 9,
    YaesuModel.FTDX101D: 9,
    YaesuModel.FTDX101MP: 9,
    YaesuModel.FTDX3000: 8,
}

_IDENTIFICATION = {
    YaesuModel.FT_710: "0800",
    YaesuModel.FT_991A: "0670",
    YaesuModel.FTDX10: "0761",
    YaesuModel.FTDX101D: "0681",
    YaesuModel.FTDX101MP: "0682",
    YaesuModel.FTDX3000: "0462",
}

_NEWCAT_MODES = {
    "1": YaesuMode.LSB,
    "2": YaesuMode.USB,
    "3": YaesuMode.CW_U,
    "4": YaesuMode.FM,
    "5": YaesuMode.AM,
    "6": YaesuMode.RTTY_LSB,
    "7": YaesuMode.CW_L,
    "8": YaesuMode.DATA_LSB,
    "9": YaesuMode.RTTY_USB,
    "A": YaesuMode.DATA_FM,
    "B": YaesuMode.FM_NARROW,
    "C": YaesuMode.DATA_USB,
    "D": YaesuMode.AM_NARROW,
    "E": YaesuMode.PSK,
    "F": YaesuMode.DATA_FM_NARROW,
}
_MODE_CODES = {
    YaesuModel.FT_710: _NEWCAT_MODES,
    YaesuModel.FT_991A: {
        "1": YaesuMode.LSB,
        "2": YaesuMode.USB,
        "3": YaesuMode.CW_U,
        "4": YaesuMode.FM,
        "5": YaesuMode.AM,
        "6": YaesuMode.RTTY_LSB,
        "7": YaesuMode.CW_L,
        "8": YaesuMode.DATA_LSB,
        "9": YaesuMode.RTTY_USB,
        "A": YaesuMode.DATA_FM,
        "B": YaesuMode.FM_NARROW,
        "C": YaesuMode.DATA_USB,
        "D": YaesuMode.AM_NARROW,
        "E": YaesuMode.C4FM,
    },
    YaesuModel.FTDX10: _NEWCAT_MODES,
    YaesuModel.FTDX101D: _NEWCAT_MODES,
    YaesuModel.FTDX101MP: _NEWCAT_MODES,
    YaesuModel.FTDX3000: {
        "1": YaesuMode.LSB,
        "2": YaesuMode.USB,
        "3": YaesuMode.CW,
        "4": YaesuMode.FM,
        "5": YaesuMode.AM,
        "6": YaesuMode.FSK_LSB,
        "7": YaesuMode.CW_R,
        "8": YaesuMode.PACKET_L,
        "9": YaesuMode.FSK_USB,
        "A": YaesuMode.PACKET_FM,
        "B": YaesuMode.FM_NARROW,
        "C": YaesuMode.PACKET_U,
        "D": YaesuMode.AM_NARROW,
    },
}


def read_commands(model: YaesuModel) -> tuple[YaesuReadCommand, ...]:
    if not isinstance(model, YaesuModel):
        raise ValueError("El modelo debe ser uno de los modelos Yaesu documentados.")
    return tuple(command for command in YaesuReadCommand if command in _SUPPORTED_COMMANDS[model])


def _validate_model_command(model: YaesuModel, command: YaesuReadCommand) -> None:
    if not isinstance(model, YaesuModel):
        raise ValueError("El modelo debe ser uno de los modelos Yaesu documentados.")
    if not isinstance(command, YaesuReadCommand):
        raise ValueError("La consulta debe ser un comando CAT Yaesu predefinido.")
    if command not in read_commands(model):
        raise ValueError("El comando CAT no está documentado para este modelo.")


def _parse_payload(
    model: YaesuModel,
    command: YaesuReadCommand,
    frame: bytes,
) -> bytes:
    _validate_model_command(model, command)
    if not isinstance(frame, bytes):
        raise ValueError("La respuesta CAT debe ser bytes.")
    return parse_ascii_cat_reply(command.value, frame)


def build_query(model: YaesuModel, command: YaesuReadCommand) -> bytes:
    _validate_model_command(model, command)
    return f"{command.value};".encode("ascii")


def parse_frequency_reply(
    model: YaesuModel,
    command: YaesuReadCommand,
    frame: bytes,
) -> int:
    if not isinstance(command, YaesuReadCommand):
        raise ValueError("La consulta debe ser un comando CAT Yaesu predefinido.")
    if command not in {
        YaesuReadCommand.FREQUENCY_A,
        YaesuReadCommand.FREQUENCY_B,
    }:
        raise ValueError("El comando no devuelve una frecuencia CAT.")
    payload = _parse_payload(model, command, frame)
    if len(payload) != _FREQUENCY_WIDTH[model] or not payload.isdigit():
        raise ValueError("La respuesta de frecuencia no tiene el formato CAT del modelo.")
    return int(payload)


def parse_mode_reply(
    model: YaesuModel,
    command: YaesuReadCommand,
    frame: bytes,
) -> tuple[YaesuBand, YaesuMode]:
    if not isinstance(command, YaesuReadCommand):
        raise ValueError("La consulta debe ser un comando CAT Yaesu predefinido.")
    if command not in {YaesuReadCommand.MAIN_MODE, YaesuReadCommand.SUB_MODE}:
        raise ValueError("El comando no devuelve un modo de operación.")
    payload = _parse_payload(model, command, frame)
    if len(payload) != 1:
        raise ValueError("La respuesta de modo CAT debe contener un código.")
    try:
        mode = _MODE_CODES[model][payload.decode("ascii")]
    except (KeyError, UnicodeDecodeError) as exc:
        raise ValueError(
            "La respuesta contiene un modo CAT no documentado para el modelo."
        ) from exc
    band = YaesuBand.MAIN if command is YaesuReadCommand.MAIN_MODE else YaesuBand.SUB
    return band, mode


def parse_identification_reply(model: YaesuModel, frame: bytes) -> str:
    payload = _parse_payload(model, YaesuReadCommand.IDENTIFICATION, frame)
    expected_id = _IDENTIFICATION[model].encode("ascii")
    if payload != expected_id:
        raise ValueError("La identificación CAT no coincide con el modelo seleccionado.")
    return payload.decode("ascii")
