from dataclasses import asdict, dataclass
from enum import StrEnum
from typing import Literal

API_VERSION = "v1"
CAPABILITY_SCHEMA_VERSION = "1.0"
STATUS_SCHEMA_VERSION = "1.0"


class CapabilityStatus(StrEnum):
    VERIFIED = "verified"
    IMPLEMENTED_UNTESTED = "implemented_untested"
    EXPERIMENTAL = "experimental"
    UNSUPPORTED = "unsupported"


@dataclass(frozen=True)
class CapabilityRecord:
    manufacturer: str
    model: str
    connection: str
    function: str
    status: CapabilityStatus
    source_document: str | None
    implementation: str
    test: str | None
    hardware_used: str | None
    validated_at: str | None
    limitations: tuple[str, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "manufacturer": self.manufacturer,
            "model": self.model,
            "connection": self.connection,
            "function": self.function,
            "status": self.status.value,
            "source_document": self.source_document,
            "implementation": self.implementation,
            "test": self.test,
            "hardware_used": self.hardware_used,
            "validated_at": self.validated_at,
            "limitations": list(self.limitations),
        }


@dataclass(frozen=True)
class RadioProfile:
    manufacturer: str
    model: str
    profile_only: bool
    accessory_profile: str


@dataclass(frozen=True)
class TransmissionStatus:
    enabled: bool
    ptt_available: bool
    state: Literal["blocked"]
    reason: str


@dataclass(frozen=True)
class SpectrumStatus:
    status: Literal["unsupported"]
    samples: None
    message: str


@dataclass(frozen=True)
class WaterfallStatus:
    status: Literal["unsupported"]
    data: None
    message: str


@dataclass(frozen=True)
class StationSnapshot:
    api_version: str
    schema_version: str
    station_id: str
    name: str
    callsign: str
    source: Literal["deterministic_simulator"]
    data_is_simulated: Literal[True]
    hardware_connected: Literal[False]
    radio_profile: RadioProfile
    frequency_hz: int
    vfo: Literal["A", "B"]
    mode: str
    band: str
    tx: TransmissionStatus
    spectrum: SpectrumStatus
    waterfall: WaterfallStatus

    def to_dict(self) -> dict[str, object]:
        return asdict(self)
