from dataclasses import dataclass
from enum import StrEnum

METIS_UDP_PORT = 1024
DISCOVERY_REQUEST = b"\xef\xfe\x02" + bytes(60)
HERMES_LITE_BOARD_ID = 0x06
DISCOVERY_REPLY_BYTES = 60


class HermesLiteDiscoveryStatus(StrEnum):
    IDLE = "idle"
    STREAMING = "streaming"


@dataclass(frozen=True)
class HermesLiteDiscoveryReply:
    status: HermesLiteDiscoveryStatus
    mac_address: str
    gateware_version_raw: int
    board_id: int


def build_discovery_request() -> bytes:
    return DISCOVERY_REQUEST


def parse_discovery_reply(packet: bytes) -> HermesLiteDiscoveryReply:
    if not isinstance(packet, bytes):
        raise ValueError("La respuesta de descubrimiento debe ser bytes.")
    if len(packet) != DISCOVERY_REPLY_BYTES:
        raise ValueError("La respuesta de descubrimiento debe contener exactamente 60 bytes.")
    if packet[:2] != b"\xef\xfe":
        raise ValueError("La respuesta de descubrimiento no tiene la cabecera Metis.")

    try:
        status = {
            0x02: HermesLiteDiscoveryStatus.IDLE,
            0x03: HermesLiteDiscoveryStatus.STREAMING,
        }[packet[2]]
    except KeyError as error:
        raise ValueError("El estado Metis de descubrimiento no está documentado.") from error

    board_id = packet[10]
    if board_id != HERMES_LITE_BOARD_ID:
        raise ValueError("La respuesta no identifica el board Hermes-Lite ID 0x06.")

    mac_address = ":".join(f"{byte:02X}" for byte in packet[3:9])
    return HermesLiteDiscoveryReply(
        status=status,
        mac_address=mac_address,
        gateware_version_raw=packet[9],
        board_id=board_id,
    )
