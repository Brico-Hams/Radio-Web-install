import json
from dataclasses import dataclass
from pathlib import Path


def settings_request_identifier(value: object) -> str:
    if (
        not isinstance(value, str)
        or not 16 <= len(value) <= 64
        or not value.isascii()
        or not value.replace("-", "").replace("_", "").isalnum()
    ):
        raise ValueError("Invalid request identifier.")
    return value


@dataclass(frozen=True)
class RadioSettingsConfig:
    power_adjustment_enabled: bool
    power_level_max: int
    tuner_switching_enabled: bool
    frequency_adjustment_enabled: bool = False
    mode_adjustment_enabled: bool = False

    def __post_init__(self) -> None:
        if (
            type(self.power_adjustment_enabled) is not bool
            or type(self.tuner_switching_enabled) is not bool
            or type(self.frequency_adjustment_enabled) is not bool
            or type(self.mode_adjustment_enabled) is not bool
            or type(self.power_level_max) is not int
            or not 0 <= self.power_level_max <= 255
        ):
            raise ValueError(
                "Explicit booleans and a model-specific power limit 0..255 are required."
            )

    @classmethod
    def load(cls, path: Path) -> "RadioSettingsConfig":
        payload = json.loads(path.read_text(encoding="utf-8"))
        required = {
            "power_adjustment_enabled",
            "power_level_max",
            "tuner_switching_enabled",
        }
        optional = {"frequency_adjustment_enabled", "mode_adjustment_enabled"}
        if (
            not isinstance(payload, dict)
            or not required.issubset(payload)
            or set(payload) - required - optional
        ):
            raise ValueError("Unexpected radio settings configuration fields.")
        return cls(**payload)

    def metadata(self, *, model: str = "IC-7300") -> dict[str, object]:
        if model not in ("IC-7300", "FTX-1"):
            raise ValueError("Radio settings are not implemented for this model.")
        return {
            "power_adjustment_enabled": self.power_adjustment_enabled,
            "power_level_max": self.power_level_max,
            "power_unit": "watts_setpoint" if model == "FTX-1" else "cat_position_0_255",
            "tuner_switching_enabled": self.tuner_switching_enabled,
            "frequency_adjustment_enabled": self.frequency_adjustment_enabled,
            "mode_adjustment_enabled": self.mode_adjustment_enabled,
            "tune_enabled": False,
        }
