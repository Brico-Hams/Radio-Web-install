import json
import logging
import math
import secrets
import socket
import threading
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path

LOGGER = logging.getLogger("bricoham.station_agent.rotor")
LEASE_SECONDS = 3.0
MAX_MOTION_SECONDS = 30.0


class RotorError(Exception):
    pass


def _number(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError("Rotor values must be finite numbers, not booleans or text.")
    try:
        number = float(value)
    except OverflowError as error:
        raise ValueError("Rotor value is too large.") from error
    if not math.isfinite(number):
        raise ValueError("Rotor values must be finite.")
    return number


@dataclass(frozen=True)
class RotorConfig:
    port: int
    label: str
    azimuth_min: float
    azimuth_max: float
    elevation_min: float
    elevation_max: float
    motion_enabled: bool
    # Optional: parking target and calibration offsets (reported = rotctld value + offset).
    park_azimuth: float | None = None
    park_elevation: float | None = None
    azimuth_offset: float = 0.0
    elevation_offset: float = 0.0

    def __post_init__(self) -> None:
        if type(self.port) is not int or not 1 <= self.port <= 65535:
            raise ValueError("Select an explicit local rotctld TCP port.")
        if not isinstance(self.label, str) or not 1 <= len(self.label.strip()) <= 80:
            raise ValueError("A local rotator label is required.")
        if type(self.motion_enabled) is not bool:
            raise ValueError("motion_enabled must explicitly be true or false.")
        amin, amax, emin, emax = (
            _number(value)
            for value in (
                self.azimuth_min,
                self.azimuth_max,
                self.elevation_min,
                self.elevation_max,
            )
        )
        if not (-180 <= amin < amax <= 450 and amax - amin <= 450):
            raise ValueError("Invalid azimuth limits; no wraparound or normalization is inferred.")
        if not -90 <= emin <= emax <= 180:
            raise ValueError("Invalid elevation limits; use 0/0 for an azimuth-only controller.")
        for offset in (self.azimuth_offset, self.elevation_offset):
            if not -180 <= _number(offset) <= 180:
                raise ValueError("Calibration offsets must be within +/-180 degrees.")
        if (self.park_azimuth is None) != (self.park_elevation is None):
            raise ValueError("Set both park_azimuth and park_elevation, or neither.")
        if self.park_azimuth is not None:
            self.position(self.park_azimuth, self.park_elevation)

    @classmethod
    def load(cls, path: Path) -> "RotorConfig":
        payload = json.loads(path.read_text(encoding="utf-8"))
        required = {
            "port",
            "label",
            "azimuth_min",
            "azimuth_max",
            "elevation_min",
            "elevation_max",
            "motion_enabled",
        }
        optional = {"park_azimuth", "park_elevation", "azimuth_offset", "elevation_offset"}
        if (
            not isinstance(payload, dict)
            or not required <= set(payload)
            or not set(payload) <= required | optional
        ):
            raise ValueError("Rotor configuration requires exactly the documented fields.")
        return cls(**payload)

    @property
    def park(self) -> tuple[float, float] | None:
        if self.park_azimuth is None or self.park_elevation is None:
            return None
        return float(self.park_azimuth), float(self.park_elevation)

    def position(self, azimuth: object, elevation: object) -> tuple[float, float]:
        azimuth, elevation = _number(azimuth), _number(elevation)
        if not self.azimuth_min <= azimuth <= self.azimuth_max:
            raise ValueError("Azimuth is outside configured mechanical limits.")
        if not self.elevation_min <= elevation <= self.elevation_max:
            raise ValueError("Elevation is outside configured mechanical limits.")
        return azimuth, elevation


class RotorController:
    def __init__(self, config: RotorConfig) -> None:
        self.config = config
        self._lock = threading.Lock()
        self._shutdown = threading.Event()
        self._lease: str | None = None
        self._lease_until = 0.0
        self._motion_until = 0.0
        self._stop_failed = False
        self._closed = False
        self._blocked_requests: deque[str] = deque(maxlen=256)
        self._thread = threading.Thread(target=self._watchdog, name="rotor-deadman", daemon=True)
        self._thread.start()

    def _exchange(self, command: str, expected: str) -> list[str]:
        deadline = time.monotonic() + 0.7
        try:
            with socket.create_connection(("127.0.0.1", self.config.port), timeout=0.7) as peer:
                peer.settimeout(max(0.001, deadline - time.monotonic()))
                peer.sendall(command.encode("ascii") + b"\n")
                buffer = bytearray()
                lines: list[str] = []
                total = 0
                while total <= 512:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise TimeoutError
                    peer.settimeout(remaining)
                    chunk = peer.recv(1)
                    if not chunk:
                        raise RotorError("rotor_invalid_response")
                    buffer.extend(chunk)
                    total += 1
                    if chunk != b"\n":
                        continue
                    line = bytes(buffer).decode("ascii").rstrip("\r\n")
                    buffer.clear()
                    lines.append(line)
                    if len(lines) > 5:
                        raise RotorError("rotor_invalid_response")
                    if line.startswith("RPRT "):
                        if lines[0].partition(":")[0] != expected:
                            raise RotorError("rotor_invalid_response")
                        if line != "RPRT 0":
                            LOGGER.warning("Rotator backend rejected an operation")
                            raise RotorError("rotor_backend_error")
                        return lines[1:-1]
                raise RotorError("rotor_invalid_response")
        except (OSError, UnicodeDecodeError) as error:
            LOGGER.warning("Rotator transport failed (%s)", type(error).__name__)
            raise RotorError("rotor_transport_failed") from error

    def _position(self) -> dict[str, float]:
        lines = self._exchange("+p", "get_pos")
        try:
            if (
                len(lines) != 2
                or not lines[0].startswith("Azimuth: ")
                or not lines[1].startswith("Elevation: ")
            ):
                raise ValueError("Invalid ERP position")
            azimuth, elevation = self.config.position(
                float(lines[0][9:]) + self.config.azimuth_offset,
                float(lines[1][11:]) + self.config.elevation_offset,
            )
        except ValueError as error:
            raise RotorError("rotor_invalid_position") from error
        return {"azimuth_deg": azimuth, "elevation_deg": elevation}

    def _snapshot(self) -> dict[str, object]:
        return {
            "api_version": "v1",
            "source": "hamlib_rotctld",
            "status": "experimental",
            "data_is_simulated": False,
            "hardware_validation_complete": False,
            "label": self.config.label,
            "motion_enabled": self.config.motion_enabled,
            "limits": {
                "azimuth_min": self.config.azimuth_min,
                "azimuth_max": self.config.azimuth_max,
                "elevation_min": self.config.elevation_min,
                "elevation_max": self.config.elevation_max,
            },
            "lease_active": self._lease is not None,
            "stop_failed": self._stop_failed,
            "lease_seconds": LEASE_SECONDS,
            "max_motion_seconds": MAX_MOTION_SECONDS,
            "park": (
                None
                if self.config.park is None
                else {"azimuth_deg": self.config.park[0], "elevation_deg": self.config.park[1]}
            ),
            "calibration_offset": {
                "azimuth_deg": self.config.azimuth_offset,
                "elevation_deg": self.config.elevation_offset,
            },
            # Speed and limit/overlap switches are not exposed by the rotctld ERP commands cited in
            # docs/control-rotores.md: reported as unavailable ("pendiente de fuente").
            "capabilities": {
                "read_position": True,
                "goto": self.config.motion_enabled,
                "stop": True,
                "park": self.config.motion_enabled and self.config.park is not None,
                "tracking": self.config.motion_enabled,
                "speed": None,
                "limit_switches": None,
            },
        }

    def _acquire(self, *, wait: bool = False) -> None:
        acquired = self._lock.acquire(timeout=2.2) if wait else self._lock.acquire(blocking=False)
        if not acquired:
            raise RotorError("rotor_busy")
        if self._closed:
            self._lock.release()
            raise RotorError("rotor_closed")

    def snapshot(self, *, read_position: bool = False) -> dict[str, object]:
        self._acquire()
        try:
            self._expire()
            result = self._snapshot()
            if read_position:
                result["position"] = self._position()
                result["observed_at"] = time.time()
            return result
        finally:
            self._lock.release()

    def operate(self, payload: object) -> dict[str, object]:
        if not isinstance(payload, dict):
            raise ValueError("Rotor operation must be an object.")
        operation = payload.get("operation")
        fields = {
            "move": {"operation", "request_id", "azimuth_deg", "elevation_deg"},
            "park": {"operation", "request_id"},
            "renew": {"operation", "lease_id"},
            "stop": {"operation"},
        }
        # Moves may carry the live lease to retarget it (satellite tracking stream).
        extra = {"move": {"lease_id"}, "park": {"lease_id"}}.get(operation, set())
        if (
            not isinstance(operation, str)
            or operation not in fields
            or (
                not fields[operation] <= set(payload) <= fields[operation] | extra
                and not (operation == "stop" and set(payload) == {"operation", "cancel_request_id"})
            )
        ):
            raise ValueError("Unknown operation or unexpected fields.")
        position = None
        if operation == "park":
            position = self.config.park
            if position is None:
                raise RotorError("rotor_park_not_configured")
        elif operation == "move":
            position = self.config.position(payload["azimuth_deg"], payload["elevation_deg"])
        request_id = payload.get("cancel_request_id" if operation == "stop" else "request_id")
        if ("request_id" in payload or "cancel_request_id" in payload) and (
            not isinstance(request_id, str)
            or not 16 <= len(request_id) <= 64
            or not request_id.isascii()
            or not request_id.replace("-", "").replace("_", "").isalnum()
        ):
            raise ValueError("Invalid motion request identifier.")
        if operation in ("move", "park") and request_id is None:
            raise ValueError("Motion requires a unique request identifier.")
        for key in ("lease_id",):
            if key in payload and (
                not isinstance(payload[key], str)
                or len(payload[key]) > 128
                or not payload[key].isascii()
            ):
                raise ValueError("Invalid lease identifier.")
        self._acquire(wait=operation == "stop")
        try:
            if operation != "stop":
                self._expire()
            if operation == "stop":
                if request_id is not None:
                    self._blocked_requests.append(request_id)
                self._stop()
            elif operation == "renew":
                if self._lease is None or not secrets.compare_digest(
                    self._lease,
                    payload["lease_id"],
                ):
                    raise RotorError("rotor_lease_expired")
                self._lease_until = min(time.monotonic() + LEASE_SECONDS, self._motion_until)
            else:
                if not self.config.motion_enabled:
                    raise RotorError("rotor_motion_disabled")
                if self._stop_failed:
                    raise RotorError("rotor_stop_unconfirmed")
                retarget = self._lease is not None
                if retarget and not secrets.compare_digest(self._lease, payload.get("lease_id", "")):
                    raise RotorError("rotor_busy")
                if request_id in self._blocked_requests:
                    raise RotorError("rotor_request_cancelled_or_repeated")
                self._position()
                assert position is not None
                azimuth = position[0] - self.config.azimuth_offset
                elevation = position[1] - self.config.elevation_offset
                if not retarget:
                    self._lease = secrets.token_urlsafe(32)
                self._blocked_requests.append(request_id)
                self._lease_until = time.monotonic() + LEASE_SECONDS
                self._motion_until = time.monotonic() + MAX_MOTION_SECONDS
                try:
                    if self._exchange(f"+P {azimuth} {elevation}", "set_pos"):
                        raise RotorError("rotor_invalid_response")
                except RotorError:
                    try:
                        self._stop()
                    except RotorError:
                        LOGGER.error("Rotator move failed and its stop could not be confirmed")
                    raise
            result = self._snapshot()
            if operation in ("move", "park", "renew"):
                result["lease_id"] = self._lease
            if position is not None:
                result["accepted_target"] = {
                    "azimuth_deg": position[0],
                    "elevation_deg": position[1],
                }
            return result
        finally:
            self._lock.release()

    def _stop(self) -> None:
        self._lease = None
        self._stop_failed = True
        if self._exchange("+S", "stop"):
            raise RotorError("rotor_invalid_response")
        self._stop_failed = False

    def _expire(self) -> None:
        if self._lease is not None and time.monotonic() >= min(
            self._lease_until,
            self._motion_until,
        ):
            self._stop()

    def _watchdog(self) -> None:
        while not self._shutdown.wait(0.1):
            # Do not take the lock when no deadline is due, so ordinary operations never see a
            # spurious "rotor_busy" caused by the watchdog tick itself.
            if self._lease is None or time.monotonic() < min(self._lease_until, self._motion_until):
                continue
            with self._lock:
                try:
                    self._expire()
                except RotorError as error:
                    LOGGER.error("Rotator deadman failed: %s; motion is now blocked", error)

    def close(self) -> None:
        self._shutdown.set()
        with self._lock:
            if self._closed:
                return
            self._closed = True
            if self._lease is not None:
                try:
                    self._stop()
                except RotorError:
                    LOGGER.error("Rotator shutdown stop failed; use the local emergency stop")
        self._thread.join(timeout=2)
