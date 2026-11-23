"""FTX-1 remote menu (EX) settings: shared model and safe-write engine.

Python port of radio-settings.cjs. The model is derived from the same sources:
ftx1-menu.js (FTX-1 CAT Operation Reference Manual, Table 3 EX menu),
data/radio-settings-catalog.json (exclusion rules shared with Node and Android) and
docs/FTX1-KNOWLEDGE.md (errata and REGION/LIMITES TX, CALIBRACION flags).
Items without a sourced range stay read-only as "pendiente de fuente".
"""

import json
import os
import re
import threading
import time
from collections import deque
from collections.abc import Callable
from pathlib import Path

PENDING = "pendiente de fuente"
OPERATOR_WRITE_MIN_INTERVAL = 1.0
AUDIT_LIMIT = 500
_EX_ANSWER = re.compile(r"^EX(\d{2})(\d{2})(\d{2})([\x20-\x7e]*);$")
_MENU_LINE = re.compile(r'^\s*(\{"p1".*\}),?\s*$')


class MenuSettingsError(Exception):
    """Carries a stable error code; cat.py maps it to a CatError."""


def _root() -> Path:
    override = os.environ.get("BRICOHAM_RADIO_SETTINGS_DIR")
    return Path(override) if override else Path(__file__).resolve().parents[2]


def load_rules(root: Path | None = None) -> dict:
    path = (root or _root()) / "data" / "radio-settings-catalog.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise MenuSettingsError("cat_menu_settings_unavailable") from error


def load_menu(root: Path | None = None) -> list[dict]:
    path = (root or _root()) / "ftx1-menu.js"
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise MenuSettingsError("cat_menu_settings_unavailable") from error
    items = [json.loads(match.group(1)) for line in lines if (match := _MENU_LINE.match(line))]
    if not items:
        raise MenuSettingsError("cat_menu_settings_unavailable")
    return items


def classify_exclusion(name: str, rules: dict, key: str = "") -> dict | None:
    forced = rules.get("excludedKeys", {}).get(key)
    if forced:
        return next((rule for rule in rules["exclusions"] if rule["id"] == forced), None)
    return next((rule for rule in rules["exclusions"] if re.search(rule["match"], name)), None)


def parse_range(item: dict) -> dict | None:
    if item.get("options"):
        return {"options": [{"value": value, "label": label} for value, label in item["options"]]}
    desc = str(item.get("desc", ""))
    step = re.search(r"(\d+)\s*\w+/step", desc)
    unit = re.search(r"\b(msec|min|sec|Hz|kHz|dB|%)\b", desc)
    common: dict = {}
    if step:
        common["step"] = int(step.group(1))
    if unit:
        common["unit"] = unit.group(1)
    if item.get("kind") == "signed":
        match = re.match(r"^-(\d+) - -00 \(or \+00\) - \+(\d+)", desc)
        return {"min": -int(match.group(1)), "max": int(match.group(2)), **common} if match else None
    if item.get("kind") == "number":
        match = re.search(r"P4\s*=\s*(\d+)\s*-\s*(\d+)", desc) or re.match(
            r"^(\d+)\s*-\s*(\d+)(?:\s+\w+)?$", desc.strip()
        )
        return {"min": int(match.group(1)), "max": int(match.group(2)), **common} if match else None
    return None


def _is_pending_name(name: str, rules: dict) -> bool:
    return any(name == entry or name.startswith(f"{entry} ") for entry in rules["pendingNames"])


def ftx1_settings(rules: dict | None = None, menu: list[dict] | None = None) -> list[dict]:
    rules = rules or load_rules()
    result = []
    for item in menu or load_menu():
        key = f"EX{item['p1']}{item['p2']}{item['p3']}"
        base = {
            "id": f"ex-{item['p1']}{item['p2']}{item['p3']}",
            "label": item["name"],
            "group": item["group"],
            "type": "enum" if item.get("options") else item["kind"],
            "digits": item["digits"],
            "read": f"{key};",
            "write": f"{key}<value>;",
            "source": "ftx1-menu.js; docs/FTX1-KNOWLEDGE.md",
            "risk": "low",
            "writable": False,
            "readOnlyReason": None,
        }
        value_range = parse_range(item)
        if value_range:
            base.update(value_range)
        excluded = classify_exclusion(item["name"], rules, key)
        if excluded:
            result.append(
                {**base, "risk": excluded["scope"], "exclusion": excluded["id"], "readOnlyReason": excluded["reason"]}
            )
        elif item.get("readOnly"):
            result.append({**base, "readOnlyReason": "Read-only in the FTX-1 menu map."})
        elif item["kind"] == "text":
            result.append({**base, "readOnlyReason": "Text items are not written remotely."})
        elif _is_pending_name(item["name"], rules) or key in rules["pendingKeys"]:
            result.append({**base, "pending": True, "readOnlyReason": rules["pendingReason"]})
        elif not value_range:
            result.append({**base, "pending": True, "readOnlyReason": f"{PENDING}: no sourced range in the manual text."})
        else:
            result.append({**base, "writable": True})
    return result


def encode_value(setting: dict, value: object) -> str:
    """Wire string for an operator value, or ValueError when outside the sourced range."""
    if setting["type"] == "enum":
        text = value if isinstance(value, str) else str(value)
        if not any(option["value"] == text for option in setting["options"]):
            raise ValueError("Value outside the sourced options.")
        return text
    if isinstance(value, bool):
        raise ValueError("Integer value required.")
    if isinstance(value, str):
        if not re.fullmatch(r"[+-]?\d+", value):
            raise ValueError("Integer value required.")
        number = int(value)
    elif isinstance(value, int):
        number = value
    else:
        raise ValueError("Integer value required.")
    if not setting["min"] <= number <= setting["max"]:
        raise ValueError("Value outside the sourced range.")
    step = setting.get("step")
    if step and (number - setting["min"]) % step:
        raise ValueError("Value must follow the sourced step.")
    if setting["type"] == "signed":
        return f"{'-' if number < 0 else '+'}{abs(number):0{setting['digits'] - 1}d}"
    return f"{abs(number):0{setting['digits']}d}"


def parse_reply(setting: dict, reply: str) -> str | None:
    """Value text of an EX answer; None when the radio answers ?; (item not available, e.g. EX050109)."""
    text = reply.replace("\0", "").replace("\r", "").replace("\n", "").strip()
    if text in ("?;", "?"):
        return None
    match = _EX_ANSWER.match(text)
    if not match or "".join(match.group(1, 2, 3)) != setting["read"][2:8]:
        raise ValueError("Unexpected EX reply.")
    return match.group(4)


def _hard_excluded(setting: dict, rules: dict) -> bool:
    return classify_exclusion(setting.get("label", ""), rules, setting["read"][:8]) is not None


class MenuSettingsService:
    """Read current value as backup, validate, write, read back, restore on mismatch, audit everything."""

    def __init__(
        self,
        settings: list[dict],
        *,
        exchange: Callable[[str, bool], str | None],
        is_transmitting: Callable[[], bool | None],
        write_enabled: bool,
        rules: dict | None = None,
        clock: Callable[[], float] = time.monotonic,
        min_interval: float = OPERATOR_WRITE_MIN_INTERVAL,
        log: Callable[[str], None] | None = None,
    ) -> None:
        self._settings = {setting["id"]: setting for setting in settings}
        self._exchange = exchange
        self._is_transmitting = is_transmitting
        self._write_enabled = write_enabled
        self._rules = rules or load_rules()
        self._clock = clock
        self._min_interval = min_interval
        self._log = log or (lambda _message: None)
        self._audit: deque[dict] = deque(maxlen=AUDIT_LIMIT)
        self._busy = threading.Lock()
        self._last_write = float("-inf")

    def _record(self, event: str, **detail: object) -> None:
        entry = {"at": time.time(), "event": event, **detail}
        self._audit.append(entry)
        self._log(f"menu settings {json.dumps(entry, sort_keys=True)}")

    def audit(self) -> list[dict]:
        return list(self._audit)

    def listing(self) -> list[dict]:
        return [
            {**setting, **({"writable": False, "readOnlyReason": "Remote menu writes are disabled (--radio-settings-config menu_write_enabled)."} if setting["writable"] and not self._write_enabled else {})}
            for setting in self._settings.values()
        ]

    def _setting(self, identifier: object) -> dict:
        if not isinstance(identifier, str) or identifier not in self._settings:
            raise MenuSettingsError("cat_menu_unknown_setting")
        return self._settings[identifier]

    def _read(self, setting: dict) -> str | None:
        return parse_reply(setting, self._exchange(setting["read"][:-1], True) or "")

    def read(self, identifier: object) -> dict:
        setting = self._setting(identifier)
        value = self._read(setting)
        return {"id": setting["id"], "value": value, "available": value is not None}

    def write(self, identifier: object, value: object) -> dict:
        setting = self._setting(identifier)
        if not self._write_enabled:
            self._record("refused", id=setting["id"], reason="disabled")
            raise MenuSettingsError("cat_menu_write_disabled")
        if not setting["writable"] or _hard_excluded(setting, self._rules):
            self._record("refused", id=setting["id"], reason="read-only")
            raise MenuSettingsError("cat_menu_setting_read_only")
        if not self._busy.acquire(blocking=False):
            raise MenuSettingsError("cat_busy")
        try:
            now = self._clock()
            if now - self._last_write < self._min_interval:
                raise MenuSettingsError("cat_menu_rate_limited")
            try:
                encoded = encode_value(setting, value)
            except ValueError:
                self._record("rejected", id=setting["id"], reason="range")
                raise
            if self._is_transmitting() is not False:
                self._record("refused", id=setting["id"], reason="transmitting-or-unknown")
                raise MenuSettingsError("cat_menu_tx_active")
            self._last_write = now
            return self._transaction(setting, encoded)
        finally:
            self._busy.release()

    def _command(self, setting: dict, value: str) -> str:
        return setting["write"].replace("<value>", value)[:-1]

    def _transaction(self, setting: dict, encoded: str) -> dict:
        backup = self._read(setting)
        if backup is None:
            self._record("failed", id=setting["id"], target=encoded, error="backup-unavailable")
            raise MenuSettingsError("cat_menu_backup_unavailable")
        self._record("backup", id=setting["id"], backup=backup, target=encoded)
        if self._is_transmitting() is not False:
            self._record("refused", id=setting["id"], reason="tx-started")
            raise MenuSettingsError("cat_menu_tx_active")
        try:
            self._exchange(self._command(setting, encoded), False)
            observed = self._read(setting)
            if observed != encoded:
                raise MenuSettingsError("cat_menu_readback_mismatch")
        except (MenuSettingsError, OSError, ValueError) as error:
            restored = False
            try:
                self._exchange(self._command(setting, backup), False)
                restored = self._read(setting) == backup
            except (MenuSettingsError, OSError, ValueError):
                restored = False
            self._record(
                "failed", id=setting["id"], backup=backup, target=encoded, error=str(error), restored=restored
            )
            if isinstance(error, MenuSettingsError) and str(error) == "cat_menu_readback_mismatch":
                raise MenuSettingsError(
                    "cat_menu_restored" if restored else "cat_menu_restore_failed"
                ) from error
            raise MenuSettingsError("cat_menu_restored" if restored else "cat_menu_restore_failed") from error
        self._record("written", id=setting["id"], backup=backup, value=encoded)
        return {"id": setting["id"], "backup": backup, "value": encoded}
