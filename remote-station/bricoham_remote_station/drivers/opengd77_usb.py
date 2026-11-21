"""Read-only RadioInfo framing, matching the destination's OpenGD77 connector."""

from enum import StrEnum


class OpenGd77Model(StrEnum):
    GD77 = "GD-77"
    GD77S = "GD-77S"
    DM1801 = "DM-1801"
    RD5R = "RD-5R"
    DM1801A = "DM-1801A"
    MD9600 = "MD-9600"
    MDUV380 = "MD-UV380"
    MD380 = "MD-380"
    DM1701 = "DM-1701"
    MD2017 = "MD-2017"
    DM1701_RGB = "DM-1701 RGB"
    DM32 = "DM-32"
    UV008 = "UV008"


RADIO_INFO_SIZE = 46
RADIO_INFO_QUERY = b"R\x09\x00\x00\x00\x00\x00\x2e"


def profile_name(model: OpenGd77Model) -> str:
    if not isinstance(model, OpenGd77Model):
        raise ValueError("Select an explicit OpenGD77 firmware model.")
    return f"OpenGD77 {model.value}"


def parse_radio_info(model: OpenGd77Model, frame: bytes) -> dict[str, int | str]:
    if not isinstance(model, OpenGd77Model):
        raise ValueError("Select an explicit OpenGD77 firmware model.")
    if not isinstance(frame, bytes) or len(frame) != RADIO_INFO_SIZE + 3:
        raise ValueError("RadioInfo requires one complete 46-byte payload.")
    if frame[:3] != b"R\x00\x2e":
        raise ValueError("Invalid RadioInfo response header/length.")
    payload = frame[3:]
    version = int.from_bytes(payload[:4], "little")
    radio_type = int.from_bytes(payload[4:8], "little")
    models = tuple(OpenGd77Model)
    if not 1 <= version <= 4 or radio_type >= len(models):
        raise ValueError("Unknown RadioInfo version or model; do not infer a memory map.")
    if models[radio_type] is not model:
        raise ValueError("RadioInfo model does not match the explicitly selected profile.")

    def text(field: bytes) -> str:
        value, separator, padding = field.partition(b"\x00")
        if separator and any(padding):
            raise ValueError("RadioInfo text has nonzero data after its terminator.")
        if not value or any(byte < 32 or byte > 126 for byte in value):
            raise ValueError("RadioInfo firmware/build must be printable ASCII.")
        return value.decode("ascii")

    return {
        "model": model.value,
        "structure_version": version,
        "firmware": text(payload[8:24]),
        "build": text(payload[24:40]),
    }
