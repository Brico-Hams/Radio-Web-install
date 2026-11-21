from collections.abc import Iterable
from dataclasses import dataclass
from itertools import islice
from typing import Protocol

from serial.tools import list_ports

API_VERSION = "v1"
SCHEMA_VERSION = "1.0"
MAX_PORTS = 256
MAX_METADATA_LENGTH = 256


class PortInfo(Protocol):
    device: str
    description: str
    vid: int | None
    pid: int | None
    manufacturer: str | None
    product: str | None
    interface: str | None


class DeviceEnumerator(Protocol):
    def __call__(self) -> Iterable[PortInfo]: ...


class DeviceEnumerationError(Exception):
    """Raised when the operating system cannot provide a safe inventory."""


def enumerate_serial_ports() -> list[PortInfo]:
    try:
        return list(list_ports.comports(include_links=False))
    except OSError as error:
        raise DeviceEnumerationError("serial_port_enumeration_failed") from error


def _bounded_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    clean_value = value.strip()
    if not clean_value:
        return None
    return clean_value[:MAX_METADATA_LENGTH]


def _usb_id(value: object) -> str | None:
    if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 0xFFFF:
        return f"{value:04X}"
    return None


@dataclass(frozen=True)
class DeviceInventory:
    enumerator: DeviceEnumerator = enumerate_serial_ports

    def snapshot(self) -> dict[str, object]:
        try:
            ports = list(islice(self.enumerator(), MAX_PORTS + 1))
        except DeviceEnumerationError:
            raise
        except OSError as error:
            raise DeviceEnumerationError("serial_port_enumeration_failed") from error

        if len(ports) > MAX_PORTS:
            raise DeviceEnumerationError("device_limit_exceeded")

        devices: list[dict[str, object]] = []
        for port in ports:
            path = _bounded_text(port.device)
            if path is None:
                raise DeviceEnumerationError("invalid_device_path")
            devices.append(
                {
                    "port": path,
                    "description": _bounded_text(port.description),
                    # PySerial's hwid may contain a USB serial number; omit it entirely.
                    "hwid": None,
                    "vid": _usb_id(port.vid),
                    "pid": _usb_id(port.pid),
                    "manufacturer": _bounded_text(port.manufacturer),
                    "product": _bounded_text(port.product),
                    "interface": _bounded_text(port.interface),
                    "classification": "unknown",
                }
            )

        return {
            "api_version": API_VERSION,
            "schema_version": SCHEMA_VERSION,
            "devices": devices,
        }
