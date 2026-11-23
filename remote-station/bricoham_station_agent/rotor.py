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

    @classmethod
    def load(cls, path: Path) -> "RotorConfig":
        payload = json.loads(path.read_text(encoding="utf-8"))
        fields = {
            "port",
            "label",
            "azimuth_min",
            "azimuth_max",
            "elevation_min",
            "elevation_max",
            "motion_enabled",
        }
        if not isinstance(payload, dict) or set(payload) != fields:
            raise ValueError("Rotor configuration requires exactly the documented fields.")
        return cls(**payload)

    def position(self, azimuth: object, elevation: object) -> tuple[float, float]:
        azimuth, elevation = _number(azimuth), _number(elevation)
        if not self.azimuth_min <= azimuth <= self.azimuth_max:
            raise ValueError("Azimuth is outside configured mechanical limits.")
        if not self.elevation_min <= elevation <= self.elevation_max:
            raise ValueError("Elevation is outside configured mechanical limits.")
        return azimuth, elevation


class RotorController:
    def __init__(self, config: RotorConfig, backend: object | None = None) -> None:
        self.config = config
        # Optional direct serial controller (station_devices.SerialRotorBackend) replacing rotctld.
        self._backend = backend
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
        if self._backend is not None:
            try:
                return self._backend.exchange(command, expected)
            except Exception as error:
                LOGGER.warning("Serial rotor failed (%s)", type(error).__name__)
                raise RotorError("rotor_transport_failed") from error
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
                float(lines[0][9:]),
                float(lines[1][11:]),
            )
        except ValueError as error:
            raise RotorError("rotor_invalid_position") from error
        return {"azimuth_deg": azimuth, "elevation_deg": elevation}

    def _can_read_position(self) -> bool:
        return self._backend is None or bool(getattr(self._backend, "heading_read", True))

    def _snapshot(self) -> dict[str, object]:
        return {
            "api_version": "v1",
            "source": "hamlib_rotctld" if self._backend is None else "serial_rotor",
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
                if self._can_read_position():
                    result["position"] = self._position()
                    result["observed_at"] = time.time()
                else:
                    result["position"] = None
                    result["heading_note"] = "sin lectura de rumbo"
            return result
        finally:
            self._lock.release()

    def operate(self, payload: object) -> dict[str, object]:
        if not isinstance(payload, dict):
            raise ValueError("Rotor operation must be an object.")
        operation = payload.get("operation")
        fields = {
            "move": {"operation", "request_id", "azimuth_deg", "elevation_deg"},
            "renew": {"operation", "lease_id"},
            "stop": {"operation"},
        }
        if (
            not isinstance(operation, str)
            or operation not in fields
            or (
                set(payload) != fields[operation]
                and not (operation == "stop" and set(payload) == {"operation", "cancel_request_id"})
            )
        ):
            raise ValueError("Unknown operation or unexpected fields.")
        position = None
        if operation == "move":
            position = self.config.position(payload["azimuth_deg"], payload["elevation_deg"])
        request_id = payload.get("request_id" if operation == "move" else "cancel_request_id")
        if ("request_id" in payload or "cancel_request_id" in payload) and (
            not isinstance(request_id, str)
            or not 16 <= len(request_id) <= 64
            or not request_id.isascii()
            or not request_id.replace("-", "").replace("_", "").isalnum()
        ):
            raise ValueError("Invalid motion request identifier.")
        if operation == "move" and request_id is None:
            raise ValueError("Motion requires a unique request identifier.")
        if operation == "renew" and (
            not isinstance(payload["lease_id"], str)
            or len(payload["lease_id"]) > 128
            or not payload["lease_id"].isascii()
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
                if self._lease is not None:
                    raise RotorError("rotor_busy")
                if request_id in self._blocked_requests:
                    raise RotorError("rotor_request_cancelled_or_repeated")
                if self._can_read_position():
                    self._position()
                assert position is not None
                azimuth, elevation = position
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
            if operation in ("move", "renew"):
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
