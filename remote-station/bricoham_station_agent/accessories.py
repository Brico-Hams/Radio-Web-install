"""Station accessories supervision (external tuner and linear amplifier).

Python mirror of station-accessories.cjs; both read data/station-accessories-catalog.json.
Only devices with a protocol source in the repo get a driver, the rest are "pendiente de fuente".
Safety contract: the amplifier is STANDBY by default and returns to STANDBY on disconnect, high SWR,
fault, lease expiry, band change, emergency stop and shutdown. Nothing here keys a transmitter.
"""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any, Callable, Protocol

PENDING = "pendiente de fuente"
# 10 W is the FTX-1 field head maximum (control-potencia-acoplador.md, PC command).
TUNE_POWER_MAX_W = 10
TUNE_MAX_SECONDS = 20
STANDBY_REASONS = frozenset(
    {"disconnect", "swr", "fault", "lease", "emergency", "close", "band_change", "mismatch", "operator"}
)
# ITU Radio Regulations Region 1 amateur allocations, same table as tools-core.js BAND_SPECS.
BANDS_REGION1_MHZ = (
    ("160m", 1.81, 2.0), ("80m", 3.5, 3.8), ("60m", 5.3515, 5.3665), ("40m", 7.0, 7.2),
    ("30m", 10.1, 10.15), ("20m", 14.0, 14.35), ("17m", 18.068, 18.168), ("15m", 21.0, 21.45),
    ("12m", 24.89, 24.99), ("10m", 28.0, 29.7), ("6m", 50.0, 52.0), ("4m", 70.0, 70.5),
    ("2m", 144.0, 146.0), ("70cm", 430.0, 440.0), ("23cm", 1240.0, 1300.0),
)
CATALOG_PATH = Path(__file__).resolve().parents[2] / "data" / "station-accessories-catalog.json"


class AmplifierDriver(Protocol):
    def set_operate(self, on: bool) -> None: ...
    def set_band(self, band: str) -> None: ...
    def read(self) -> dict[str, Any]: ...


class TunerBridge(Protocol):
    def start(self) -> None: ...
    def stop(self) -> None: ...


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def band_of(frequency_hz: float | None) -> str | None:
    if not isinstance(frequency_hz, (int, float)) or isinstance(frequency_hz, bool):
        return None
    megahertz = frequency_hz / 1e6
    for name, low, high in BANDS_REGION1_MHZ:
        if low <= megahertz <= high:
            return name
    return None


def support_matrix(catalog: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    catalog = catalog or load_catalog()
    return [
        {
            **{key: device.get(key) for key in ("id", "kind", "maker", "model", "link", "status", "tune", "safetyStop", "source")},
            "enabled": bool(device.get("driver")),
        }
        for device in catalog["devices"]
    ]


class StationAccessories:
    def __init__(
        self,
        *,
        catalog: dict[str, Any] | None = None,
        config: dict[str, Any] | None = None,
        amplifier: AmplifierDriver | None = None,
        tuner: TunerBridge | None = None,
        swr_limit: float = 3.0,
        tune_max_seconds: float = TUNE_MAX_SECONDS,
        clock: Callable[[], float] = time.monotonic,
        log: Callable[[str], None] = lambda message: None,
    ) -> None:
        self._catalog = catalog or load_catalog()
        config = config or {}
        self._clock = clock
        self._log = log
        self._swr_limit = swr_limit
        self._tune_max = min(tune_max_seconds, 60)
        self._amp_device = self._find(config.get("amplifier", {}).get("device"))
        self._tuner_device = self._find(config.get("tuner", {}).get("device"))
        self._amp = amplifier if self._amp_device and self._amp_device.get("driver") else None
        self._tuner = tuner if self._tuner_device and self._tuner_device.get("driver") else None
        self._operate_allowed = config.get("amplifier", {}).get("operate_allowed") is True
        self._lock = threading.RLock()
        self._state = "standby"
        self._band: str | None = None
        self._reason: str | None = None
        self._pending_standby = False
        self._readout: dict[str, Any] | None = None
        self._tune_started: float | None = None
        self._tune_result: dict[str, Any] | None = None

    def _find(self, device_id: Any) -> dict[str, Any] | None:
        return next((item for item in self._catalog["devices"] if item["id"] == device_id), None)

    def standby(self, reason: str = "operator") -> dict[str, Any]:
        with self._lock:
            if reason not in STANDBY_REASONS:
                reason = "operator"
            self._state = "fault" if reason == "fault" else "standby"
            self._reason = reason
            if self._amp is None:
                return {"ok": True, "confirmed": True}
            try:
                self._amp.set_operate(False)
            except Exception as error:  # the next operate stays blocked until a standby is confirmed
                self._pending_standby = True
                self._log(f"Amplifier STANDBY not confirmed: {error}")
                return {"ok": False, "confirmed": False, "error": str(error)}
            self._pending_standby = False
            return {"ok": True, "confirmed": True}

    def operate(self, *, tx: bool = False, tuning: bool = False, swr_tripped: bool = False) -> dict[str, Any]:
        with self._lock:
            refusal = (
                "unsupported" if self._amp is None
                else "disabled" if not self._operate_allowed
                else "tx" if tx
                else "tuning" if tuning or self._tune_started is not None
                else "swr" if swr_tripped
                else "fault" if self._state == "fault"
                else "standby_pending" if self._pending_standby
                else "band_unknown" if self._band is None
                else None
            )
            if refusal:
                return {"ok": False, "reason": refusal}
            try:
                self._amp.set_operate(True)
            except Exception as error:
                self.standby("fault")
                return {"ok": False, "reason": "driver_error", "error": str(error)}
            self._state = "operate"
            self._reason = None
            return {"ok": True}

    def follow_band(self, frequency_hz: float | None, *, tx: bool = False) -> dict[str, Any]:
        with self._lock:
            nxt = band_of(frequency_hz)
            if nxt == self._band:
                return {"ok": True, "band": self._band}
            if tx:
                return {"ok": False, "reason": "tx"}
            if self._state == "operate":
                self.standby("band_change")
            self._band = nxt
            if self._amp is not None and nxt:
                try:
                    self._amp.set_band(nxt)
                except Exception as error:
                    self._log(f"Amplifier band not applied: {error}")
                    return {"ok": False, "reason": "driver_error", "band": nxt}
            return {"ok": True, "band": nxt}

    def poll(self) -> dict[str, Any] | None:
        with self._lock:
            if self._amp is None or not hasattr(self._amp, "read"):
                return None
            try:
                reading = self._amp.read()
            except Exception:
                if self._state == "operate":
                    self.standby("fault")
                return None
            swr = reading.get("swr")
            self._readout = {
                "power_w": reading.get("power_w"), "temp_c": reading.get("temp_c"),
                "swr": swr, "fault": reading.get("fault"),
            }
            if reading.get("fault"):
                self.standby("fault")
            elif isinstance(swr, (int, float)) and swr > self._swr_limit:
                self.standby("swr")
            elif reading.get("operate") is True and self._state != "operate":
                self.standby("mismatch")
            return dict(self._readout)

    def start_tune(self, *, tx: bool = False, power_w: float | None = None) -> dict[str, Any]:
        with self._lock:
            if self._tuner is None:
                return {"ok": False, "reason": "unsupported"}
            if tx:
                return {"ok": False, "reason": "tx"}
            if self._tune_started is not None:
                return {"ok": False, "reason": "busy"}
            if self._state == "operate":
                return {"ok": False, "reason": "amp_operate"}
            if not isinstance(power_w, (int, float)) or isinstance(power_w, bool):
                return {"ok": False, "reason": "power_unknown"}
            if power_w > TUNE_POWER_MAX_W:
                return {"ok": False, "reason": "power_too_high"}
            try:
                self._tuner.start()
            except Exception as error:
                return {"ok": False, "reason": "driver_error", "error": str(error)}
            self._tune_started = self._clock()
            return {"ok": True}

    def stop_tune(self, reason: str, swr: float | None = None) -> dict[str, Any]:
        with self._lock:
            started, self._tune_started = self._tune_started, None
            try:
                if self._tuner is not None:
                    self._tuner.stop()
            except Exception as error:
                self._log(f"Tuner stop not confirmed: {error}")
            if started is not None:
                self._tune_result = {"reason": reason, "swr": swr, "seconds": round(self._clock() - started)}
            return {"ok": True}

    def tick(self) -> None:
        with self._lock:
            if self._tune_started is not None and self._clock() - self._tune_started >= self._tune_max:
                self.stop_tune("time_cap")

    def emergency_stop(self, reason: str = "emergency") -> dict[str, Any]:
        with self._lock:
            standby = self.standby(reason)
            self.stop_tune(reason)
            return {"ok": standby["ok"]}

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            tuning = self._tune_started is not None
            return {
                "amplifier": {
                    "device": self._amp_device["id"] if self._amp_device else None,
                    "supported": self._amp is not None,
                    "status": self._amp_device["status"] if self._amp_device else PENDING,
                    "state": self._state,
                    "band": self._band,
                    "operate_allowed": self._operate_allowed,
                    "standby_reason": self._reason,
                    "pending_standby": self._pending_standby,
                    "readout": dict(self._readout) if self._readout else None,
                },
                "tuner": {
                    "device": self._tuner_device["id"] if self._tuner_device else None,
                    "supported": self._tuner is not None,
                    "status": self._tuner_device["status"] if self._tuner_device else PENDING,
                    "tuning": tuning,
                    "seconds": int(self._clock() - self._tune_started) if tuning else 0,
                    "max_seconds": round(self._tune_max),
                    "max_power_w": TUNE_POWER_MAX_W,
                    "last": dict(self._tune_result) if self._tune_result else None,
                },
            }
