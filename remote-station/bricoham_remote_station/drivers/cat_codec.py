MAX_CAT_FRAME_BYTES = 64


def parse_ascii_cat_reply(command: str, frame: bytes) -> bytes:
    if not command or not command.isascii():
        raise ValueError("El comando CAT debe ser ASCII y no estar vacío.")
    if len(frame) > MAX_CAT_FRAME_BYTES:
        raise ValueError("La respuesta CAT excede el tamaño máximo.")
    if b"\r" in frame or b"\n" in frame:
        raise ValueError("La respuesta CAT no debe contener CR ni LF.")
    if not frame.endswith(b";"):
        raise ValueError("La respuesta CAT no está terminada en punto y coma.")
    if not frame.startswith(command.encode("ascii")):
        raise ValueError("La respuesta CAT no coincide con la consulta.")
    payload = frame[len(command) : -1]
    if not payload or any(byte < 0x20 or byte > 0x7E for byte in payload):
        raise ValueError("La respuesta CAT contiene datos no válidos.")
    return payload


def parse_ascii_cat_number(command: str, frame: bytes, digits: int) -> int:
    if digits < 1:
        raise ValueError("La longitud del campo CAT debe ser positiva.")
    payload = parse_ascii_cat_reply(command, frame)
    if len(payload) != digits or not payload.isdigit():
        raise ValueError(f"El campo CAT {command} debe contener {digits} dígitos decimales.")
    return int(payload)
