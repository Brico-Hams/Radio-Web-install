from enum import IntEnum, StrEnum

from bricoham_remote_station.drivers.cat_codec import parse_ascii_cat_reply


class QmxReadCommand(StrEnum):
    VFO_A_FREQUENCY = "FA"
    VFO_B_FREQUENCY = "FB"
    RX_VFO = "FR"
    TX_VFO = "FT"
    SPLIT = "SP"
    MODE = "MD"
    STATUS = "IF"
    TX_STATE = "TQ"
    IDENTIFICATION = "ID"
    FIRMWARE_VERSION = "VN"
    SIGNAL_METER = "SM"
    SWR_METER = "SW"
    POWER_METER = "PC"


class QmxMode(IntEnum):
    LSB = 1
    USB = 2
    CW = 3
    AM = 5
    FSK = 6
    CW_REVERSE = 7
    SWR = 8
    FSK_REVERSE = 9


def build_query(command: QmxReadCommand) -> bytes:
    if not isinstance(command, QmxReadCommand):
        raise ValueError("Solo se permiten consultas QMX+ predefinidas.")
    return f"{command.value};".encode("ascii")


def parse_frequency_reply(command: QmxReadCommand, frame: bytes) -> int:
    if command not in {QmxReadCommand.VFO_A_FREQUENCY, QmxReadCommand.VFO_B_FREQUENCY}:
        raise ValueError("El comando no devuelve una frecuencia VFO.")
    payload = parse_ascii_cat_reply(command.value, frame)
    if len(payload) != 11 or not payload.isdigit():
        raise ValueError("La frecuencia QMX+ debe contener 11 dígitos en Hz.")
    return int(payload)


def parse_mode_reply(frame: bytes) -> QmxMode:
    payload = parse_ascii_cat_reply(QmxReadCommand.MODE.value, frame)
    if len(payload) != 1 or not payload.isdigit():
        raise ValueError("El modo QMX+ debe ser un código numérico de un dígito.")
    try:
        return QmxMode(int(payload))
    except ValueError as error:
        message = f"Código de modo QMX+ no documentado: {payload.decode('ascii')}"
        raise ValueError(message) from error
