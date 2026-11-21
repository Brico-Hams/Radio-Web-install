from enum import StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_number, parse_ascii_cat_reply


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
    POWER = "PC"
    TX_STATE = "TX"
    TUNER = "AC"
    KEYER_SPEED = "KS"
    KEY_PITCH = "KP"
    KEYER = "KR"
    BREAK_IN = "BI"


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

_CONTROL_READS = frozenset(
    {
        YaesuReadCommand.POWER,
        YaesuReadCommand.TX_STATE,
        YaesuReadCommand.TUNER,
        YaesuReadCommand.KEYER_SPEED,
        YaesuReadCommand.KEY_PITCH,
        YaesuReadCommand.KEYER,
        YaesuReadCommand.BREAK_IN,
    }
)


def frequency_limits(model: YaesuModel) -> tuple[int, int]:
    if not isinstance(model, YaesuModel):
        raise ValueError("Select a documented Yaesu model.")
    maximum = (
        470_000_000
        if model is YaesuModel.FT_991A
        else (60_000_000 if model is YaesuModel.FTDX3000 else 75_000_000)
    )
    return 30_000, maximum


def power_limit(model: YaesuModel) -> int:
    if not isinstance(model, YaesuModel):
        raise ValueError("Select a documented Yaesu model.")
    return 200 if model is YaesuModel.FTDX101MP else 100


def mode_options(model: YaesuModel) -> list[dict[str, str]]:
    if not isinstance(model, YaesuModel):
        raise ValueError("Select a documented Yaesu model.")
    return [{"code": code, "label": mode.value} for code, mode in _MODE_CODES[model].items()]


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
    return tuple(
        command
        for command in YaesuReadCommand
        if command in _SUPPORTED_COMMANDS[model] | _CONTROL_READS
    )


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


def build_frequency_set(model: YaesuModel, command: YaesuReadCommand, frequency_hz: int) -> bytes:
    _validate_model_command(model, command)
    minimum, maximum = frequency_limits(model)
    if command not in (YaesuReadCommand.FREQUENCY_A, YaesuReadCommand.FREQUENCY_B):
        raise ValueError("Select an explicit frequency command.")
    if type(frequency_hz) is not int or not minimum <= frequency_hz <= maximum:
        raise ValueError("Frequency must be integer Hz within the model's documented range.")
    return f"{command.value}{frequency_hz:0{_FREQUENCY_WIDTH[model]}d};".encode("ascii")


def build_mode_set(model: YaesuModel, command: YaesuReadCommand, code: str) -> bytes:
    _validate_model_command(model, command)
    if command not in (YaesuReadCommand.MAIN_MODE, YaesuReadCommand.SUB_MODE):
        raise ValueError("Select a documented mode selector.")
    if not isinstance(code, str) or code not in _MODE_CODES[model]:
        raise ValueError("Mode code is not documented for this model.")
    return f"{command.value}{code};".encode("ascii")


def build_power_set(model: YaesuModel, watts: int) -> bytes:
    if type(watts) is not int or not 5 <= watts <= power_limit(model):
        raise ValueError("Power must be integer watts within the model's documented range.")
    return f"PC{watts:03d};".encode("ascii")


def parse_parameter_reply(model: YaesuModel, command: YaesuReadCommand, frame: bytes) -> int | bool:
    _validate_model_command(model, command)
    specs = {
        YaesuReadCommand.POWER: (3, 5, power_limit(model)),
        YaesuReadCommand.TX_STATE: (1, 0, 2),
        YaesuReadCommand.KEYER_SPEED: (3, 4, 60),
        YaesuReadCommand.KEY_PITCH: (2, 0, 75),
        YaesuReadCommand.KEYER: (1, 0, 1),
        YaesuReadCommand.BREAK_IN: (1, 0, 1),
    }
    if command not in specs:
        raise ValueError("This command does not return a supported scalar parameter.")
    digits, minimum, maximum = specs[command]
    code = parse_ascii_cat_number(command.value, frame, digits)
    if not minimum <= code <= maximum:
        raise ValueError("CAT parameter is outside the model's documented range.")
    if command is YaesuReadCommand.KEY_PITCH:
        return 300 + 10 * code
    if command in (YaesuReadCommand.KEYER, YaesuReadCommand.BREAK_IN):
        return code == 1
    return code


def parse_tuner_busy_reply(model: YaesuModel, frame: bytes) -> bool:
    payload = _parse_payload(model, YaesuReadCommand.TUNER, frame)
    if model is YaesuModel.FT_710:
        if len(payload) != 3 or payload[:1] != b"0" or payload[1:2] not in (b"0", b"2"):
            raise ValueError("Invalid FT-710 tuner/accessory layout.")
        if payload[2:] not in (
            (b"0", b"1", b"3") if payload[1:2] == b"0" else (b"0", b"1", b"2", b"3")
        ):
            raise ValueError("Undocumented FT-710 tuner state.")
        return payload[2:] != b"0" if payload[1:2] == b"2" else payload[2:] == b"3"
    if len(payload) != 3 or payload[:2] != b"00" or payload[2:] not in (b"0", b"1", b"2"):
        raise ValueError("Invalid model-specific tuner response.")
    return payload[2:] == b"2"


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
