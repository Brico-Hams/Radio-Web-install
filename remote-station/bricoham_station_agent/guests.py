"""Per-radio guest tokens, TX band/power limits and TX log with CSV export.

Mirrors the rules of remote-ops.cjs in the Node agent. Pure logic with injected clock and
token source so it is deterministic in tests. Nothing here keys a transmitter: the PTT
controller asks this module for a refusal before it ever writes TX.
"""

import hashlib
import hmac
import json
import math
import os
import re
import secrets
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

# IARU Region 1 band edges, the same table remote-ops.cjs BAND_PLAN uses (lo/hi in Hz).
BAND_PLAN: dict[str, tuple[int, int]] = {
    "160m": (1_810_000, 2_000_000),
    "80m": (3_500_000, 3_800_000),
    "60m": (5_250_000, 5_450_000),
    "40m": (7_000_000, 7_200_000),
    "30m": (10_100_000, 10_150_000),
    "20m": (14_000_000, 14_350_000),
    "17m": (18_068_000, 18_168_000),
    "15m": (21_000_000, 21_450_000),
    "12m": (24_890_000, 24_990_000),
    "10m": (28_000_000, 29_700_000),
    "6m": (50_000_000, 52_000_000),
    "2m": (144_000_000, 146_000_000),
    "70cm": (430_000_000, 440_000_000),
}
GUEST_ID = re.compile(r"g[0-9a-f]{12}")
RADIO_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")
LABEL = re.compile(r"[\w .@-]{1,40}")
BAND_NAME = re.compile(r"[\w .-]{1,16}")
INVITE_MAX_HOURS = 24 * 90
MAX_POWER_LIMIT_W = 10_000
CSV_COLUMNS = (
    "start",
    "end",
    "duration_s",
    "operator",
    "radio",
    "band",
    "freq_hz",
    "power_w",
)


def band_of(freq: object) -> str:
    if not isinstance(freq, (int, float)) or isinstance(freq, bool):
        return ""
    for name, (low, high) in BAND_PLAN.items():
        if low <= freq <= high:
            return name
    return ""


def normalize_bands(items: object) -> list[dict[str, object]] | None:
    """Band names from BAND_PLAN or explicit {name, min_hz, max_hz} ranges; None when invalid."""
    if items is None:
        return []
    if not isinstance(items, list) or len(items) > 32:
        return None
    out: list[dict[str, object]] = []
    for item in items:
        if isinstance(item, str) and item in BAND_PLAN:
            low, high = BAND_PLAN[item]
            out.append({"name": item, "min_hz": low, "max_hz": high})
        elif (
            isinstance(item, dict)
            and set(item) == {"name", "min_hz", "max_hz"}
            and all(
                type(item[key]) is int and item[key] > 0 for key in ("min_hz", "max_hz")
            )
            and item["max_hz"] >= item["min_hz"]
            and isinstance(item["name"], str)
            and BAND_NAME.fullmatch(item["name"])
        ):
            out.append(dict(item))
        else:
            return None
    return out


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class GuestGrant:
    """An authenticated guest as seen by the HTTP layer."""

    id: str
    label: str
    permissions: dict[str, dict[str, object]]

    def permission(self, radio_id: str) -> dict[str, object] | None:
        return self.permissions.get(radio_id)


class GuestStore:
    def __init__(
        self,
        directory: Path | None = None,
        *,
        clock: Callable[[], float] = time.time,
        token_source: Callable[[int], str] = secrets.token_urlsafe,
        id_source: Callable[[int], str] = secrets.token_hex,
    ) -> None:
        self._file = directory / "remote-guests.json" if directory else None
        self._clock = clock
        self._token_source = token_source
        self._id_source = id_source
        self._lock = threading.Lock()
        self._guests: list[dict[str, object]] = []
        if self._file is not None and self._file.exists():
            try:
                loaded = json.loads(self._file.read_text(encoding="utf-8")).get("guests", [])
                if not isinstance(loaded, list):
                    raise ValueError("guests")
                self._guests = loaded
            except (OSError, ValueError, AttributeError) as error:
                raise ValueError("guests_store_corrupt") from error

    def _save(self) -> None:
        if self._file is None:
            return
        self._file.parent.mkdir(parents=True, exist_ok=True)
        temporary = self._file.with_suffix(".tmp")
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(json.dumps({"guests": self._guests}, indent=2) + "\n")
        os.replace(temporary, self._file)

    def _active(self, guest: dict[str, object] | None) -> bool:
        return (
            guest is not None
            and not guest.get("revoked_at")
            and self._clock() < float(guest["expires_at"])  # type: ignore[arg-type]
        )

    def _view(self, guest: dict[str, object]) -> dict[str, object]:
        return {
            "id": guest["id"],
            "label": guest["label"],
            "permissions": guest["permissions"],
            "created_at": guest["created_at"],
            "expires_at": guest["expires_at"],
            "revoked_at": guest.get("revoked_at") or None,
            "active": self._active(guest),
        }

    def invite(
        self, label: object, permissions: object, ttl_hours: object = 24
    ) -> tuple[dict[str, object], str]:
        """Returns (guest view, token); the token is shown once, only its SHA-256 is kept."""
        if not isinstance(label, str) or not LABEL.fullmatch(label):
            raise ValueError("guest_invalid_label")
        if (
            isinstance(ttl_hours, bool)
            or not isinstance(ttl_hours, (int, float))
            or not math.isfinite(ttl_hours)
            or not 0 < ttl_hours <= INVITE_MAX_HOURS
        ):
            raise ValueError("guest_invalid_expiry")
        if not isinstance(permissions, dict) or not permissions:
            raise ValueError("guest_needs_radio")
        normalized: dict[str, dict[str, object]] = {}
        for radio_id, permission in permissions.items():
            if (
                not isinstance(radio_id, str)
                or not RADIO_ID.fullmatch(radio_id)
                or not isinstance(permission, dict)
                or type(permission.get("transmit")) is not bool
                or not set(permission) <= {"transmit", "bands", "max_power_w"}
            ):
                raise ValueError("guest_invalid_permission")
            bands = normalize_bands(permission.get("bands"))
            if bands is None:
                raise ValueError("guest_invalid_bands")
            limit = permission.get("max_power_w")
            if limit is not None and (
                isinstance(limit, bool)
                or not isinstance(limit, (int, float))
                or not math.isfinite(limit)
                or not 0 < limit <= MAX_POWER_LIMIT_W
            ):
                raise ValueError("guest_invalid_power")
            normalized[radio_id] = {
                "transmit": permission["transmit"],
                "bands": bands,
                "max_power_w": limit,
            }
        token = f"g_{self._token_source(32)}"
        now = self._clock()
        guest: dict[str, object] = {
            "id": f"g{self._id_source(6)}",
            "label": label,
            "permissions": normalized,
            "token_hash": _sha256(token),
            "created_at": now,
            "expires_at": now + ttl_hours * 3600,
            "revoked_at": None,
        }
        with self._lock:
            self._guests.append(guest)
            self._save()
            return self._view(guest), token

    def authenticate(self, token: object) -> GuestGrant | None:
        if not isinstance(token, str) or not token.startswith("g_") or len(token) > 128:
            return None
        if not token.isascii():
            return None
        digest = _sha256(token)
        found: dict[str, object] | None = None
        with self._lock:
            for guest in self._guests:
                if hmac.compare_digest(str(guest["token_hash"]), digest):
                    found = guest
            if not self._active(found):
                return None
            assert found is not None
            return GuestGrant(str(found["id"]), str(found["label"]), dict(found["permissions"]))  # type: ignore[arg-type]

    def revoke(self, guest_id: object) -> bool:
        if not isinstance(guest_id, str) or not GUEST_ID.fullmatch(guest_id):
            return False
        with self._lock:
            guest = next((item for item in self._guests if item["id"] == guest_id), None)
            if guest is None:
                return False
            if not guest.get("revoked_at"):
                guest["revoked_at"] = self._clock()
                self._save()
            return True

    def is_active_id(self, guest_id: str) -> bool:
        with self._lock:
            return self._active(next((item for item in self._guests if item["id"] == guest_id), None))

    def list(self) -> list[dict[str, object]]:
        with self._lock:
            return [self._view(guest) for guest in self._guests]


def guest_tx_refusal(
    permission: dict[str, object] | None, *, freq_hz: int | float | None, power_w: int | float | None
) -> str | None:
    """None when keying is allowed, else a stable error code. Unknown freq/power under a limit refuses."""
    if permission is None:
        return "ptt_guest_no_radio_permission"
    if not permission["transmit"]:
        return "ptt_guest_listen_only"
    bands = permission["bands"]
    if bands:
        if freq_hz is None:
            return "ptt_guest_frequency_unknown"
        if not any(band["min_hz"] <= freq_hz <= band["max_hz"] for band in bands):  # type: ignore[index]
            return "ptt_guest_band_limit"
    limit = permission["max_power_w"]
    if limit is not None:
        if power_w is None:
            return "ptt_guest_power_unknown"
        if power_w > limit:  # type: ignore[operator]
            return "ptt_guest_power_limit"
    return None


def _csv_cell(value: object) -> str:
    text = "" if value is None else str(value)
    # Cells starting with = + - @ are neutralised so a spreadsheet never evaluates an operator-chosen label.
    if re.match(r"[=+\-@\t\r]", text) and not re.fullmatch(r"-?\d+(\.\d+)?", text):
        text = f"'{text}"
    if re.search(r'[",\n\r]', text):
        return '"' + text.replace('"', '""') + '"'
    return text


def _iso(seconds: float) -> str:
    return (
        datetime.fromtimestamp(seconds, UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )


class TxLog:
    """One entry per transmission: time, duration, operator, radio, band, frequency and power."""

    def __init__(
        self,
        file: Path | None = None,
        *,
        clock: Callable[[], float] = time.time,
        max_entries: int = 5000,
    ) -> None:
        self._file = file
        self._clock = clock
        self._max = max_entries
        self._lock = threading.Lock()
        self._entries: list[dict[str, object]] = []
        self._open: dict[str, object] | None = None
        if file is not None and file.exists():
            for line in file.read_text(encoding="utf-8").splitlines():
                try:
                    self._entries.append(json.loads(line))
                except ValueError:
                    continue  # a torn last line
            self._entries = self._entries[-max_entries:]

    def begin(
        self,
        *,
        operator: str,
        radio: str,
        freq_hz: int | float | None,
        power_w: int | float | None,
    ) -> None:
        with self._lock:
            if self._open is not None:
                self._end()
            self._open = {
                "start": self._clock(),
                "operator": operator or "local",
                "radio": radio,
                "freq_hz": freq_hz,
                "power_w": power_w,
            }

    def end(self) -> dict[str, object] | None:
        with self._lock:
            return self._end()

    def _end(self) -> dict[str, object] | None:
        opened = self._open
        if opened is None:
            return None
        self._open = None
        finished = self._clock()
        entry = {
            "start": _iso(float(opened["start"])),  # type: ignore[arg-type]
            "end": _iso(finished),
            "duration_s": max(0, math.floor(finished - float(opened["start"]) + 0.5)),  # type: ignore[arg-type]
            "operator": opened["operator"],
            "radio": opened["radio"],
            "band": band_of(opened["freq_hz"]),
            "freq_hz": opened["freq_hz"],
            "power_w": opened["power_w"],
        }
        self._entries.append(entry)
        del self._entries[: -self._max]
        if self._file is not None:
            try:
                self._file.parent.mkdir(parents=True, exist_ok=True)
                descriptor = os.open(self._file, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
                with os.fdopen(descriptor, "a", encoding="utf-8") as handle:
                    handle.write(json.dumps(entry) + "\n")
            except OSError:
                pass  # the log must never block un-keying
        return entry

    def entries(self) -> list[dict[str, object]]:
        with self._lock:
            return list(self._entries)

    def is_open(self) -> bool:
        with self._lock:
            return self._open is not None

    def to_csv(self) -> str:
        rows = [
            ",".join(_csv_cell(entry.get(column)) for column in CSV_COLUMNS)
            for entry in self.entries()
        ]
        return "\r\n".join([",".join(CSV_COLUMNS), *rows]) + "\r\n"
