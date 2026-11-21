from dataclasses import dataclass
from enum import StrEnum

MAX_SMARTSDR_FRAME_BYTES = 16_384
MAX_SMARTSDR_SEQUENCE = 0xFFFF_FFFF


class SmartSdrReadCommand(StrEnum):
    INFO = "info"


@dataclass(frozen=True)
class SmartSdrResponse:
    sequence: int
    error_code: int
    message: str

    @property
    def succeeded(self) -> bool:
        return self.error_code == 0


def _validate_sequence(sequence: int) -> None:
    if (
        isinstance(sequence, bool)
        or not isinstance(sequence, int)
        or not 0 <= sequence <= MAX_SMARTSDR_SEQUENCE
    ):
        raise ValueError("La secuencia SmartSDR debe ser un entero sin signo de 32 bits.")


def build_query(command: SmartSdrReadCommand, sequence: int) -> bytes:
    if not isinstance(command, SmartSdrReadCommand):
        raise ValueError("Solo se permiten consultas SmartSDR predefinidas.")
    _validate_sequence(sequence)
    return f"C{sequence}|{command.value}\n".encode("ascii")


def parse_response(frame: bytes, expected_sequence: int) -> SmartSdrResponse:
    _validate_sequence(expected_sequence)
    if not isinstance(frame, bytes):
        raise ValueError("La respuesta SmartSDR debe ser bytes.")
    if not frame or len(frame) > MAX_SMARTSDR_FRAME_BYTES:
        raise ValueError("La respuesta SmartSDR está vacía o excede el tamaño máximo.")

    if frame.endswith(b"\r\n"):
        content = frame[:-2]
    elif frame.endswith((b"\r", b"\n")):
        content = frame[:-1]
    else:
        raise ValueError("La respuesta SmartSDR no tiene un terminador de línea.")
    if not content or b"\r" in content or b"\n" in content:
        raise ValueError("La respuesta SmartSDR debe contener exactamente una línea.")
    if any(byte < 0x20 or byte > 0x7E for byte in content):
        raise ValueError("La respuesta SmartSDR contiene datos no ASCII imprimibles.")

    fields = content.split(b"|", 2)
    if len(fields) != 3 or not fields[0].startswith(b"R"):
        raise ValueError("La trama no tiene el formato de respuesta SmartSDR.")

    sequence_text, error_text, message_text = fields[0][1:], fields[1], fields[2]
    if not sequence_text.isdigit():
        raise ValueError("La secuencia de respuesta SmartSDR no es decimal.")
    sequence = int(sequence_text)
    if sequence != expected_sequence:
        raise ValueError("La respuesta SmartSDR no coincide con la secuencia esperada.")

    if (
        not error_text
        or len(error_text) > 8
        or any(byte not in b"0123456789abcdefABCDEF" for byte in error_text)
    ):
        raise ValueError("El código de respuesta SmartSDR debe ser hexadecimal de 32 bits.")

    return SmartSdrResponse(
        sequence=sequence,
        error_code=int(error_text, 16),
        message=message_text.decode("ascii"),
    )
