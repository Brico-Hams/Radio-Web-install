"""Tune check state machine, mirror of TuneCheck in remote-meters.cjs.

requested -> confirming -> tuning -> reading -> stopping -> verifying -> done.
Methods return False and never raise when called out of order; the first cut/outcome wins so a later
reset cannot erase a lost alert. The class only models the sequence: the caller performs the CAT I/O
(operator-initiated tune, readback, final SWR read, TX-off readback).
"""

from __future__ import annotations

import math

STATES = ("requested", "confirming", "tuning", "reading", "stopping", "verifying", "done")
OUTCOMES = ("success", "fail", "timeout")


class TuneCheck:
    def __init__(self, kind: str = "internal", swr_limit: float = 3, max_seconds: int = 30) -> None:
        self.kind = kind
        self.swr_limit = swr_limit
        self.max_seconds = max_seconds
        self.state = "requested"
        self.outcome: str | None = None
        self.reason: str | None = None
        self.swr: float | None = None
        self.tx_off: bool | None = None
        self.seconds = 0

    def _move(self, source: str, target: str) -> bool:
        if self.state != source:
            return False
        self.state = target
        return True

    def confirming(self) -> bool:
        return self._move("requested", "confirming")

    def entered(self) -> bool:
        """Readback proved the radio entered tune."""
        return self._move("confirming", "tuning")

    def not_started(self) -> bool:
        return self.cut("fail", "not-started")

    def tick(self, seconds: int) -> bool:
        if self.state == "done":
            return False
        self.seconds = seconds
        return True

    def cut(self, outcome: str, reason: str | None = None) -> bool:
        if self.state in ("done", "stopping", "verifying"):
            return False
        if self.outcome or outcome not in OUTCOMES:
            return False
        self.outcome = outcome
        self.reason = reason or "other"
        self.state = "reading"
        return True

    def finished(self) -> bool:
        """Natural end of the tune (the radio left tune by itself)."""
        return self._move("tuning", "reading")

    def final_swr(self, value: float | None) -> bool:
        if self.state not in ("reading", "stopping"):
            return False
        self.swr = float(value) if isinstance(value, (int, float)) and not math.isnan(value) else None
        return True

    def stopping(self) -> bool:
        return self._move("reading", "stopping")

    def verified(self, tx_off: bool) -> bool:
        """Final step: TX off confirmed by readback (True) or not (False)."""
        if self.state not in ("stopping", "verifying"):
            return False
        self.tx_off = bool(tx_off)
        if not self.outcome:
            high = self.swr is not None and self.swr >= self.swr_limit
            self.outcome = "fail" if high else "success"
            self.reason = "swr-high" if high else None
        if not self.tx_off and self.outcome == "success":
            self.outcome = "fail"
            self.reason = "tx-stuck"
        self.state = "done"
        return True

    def result(self) -> dict:
        return {
            "state": self.state,
            "outcome": self.outcome,
            "reason": self.reason,
            "kind": self.kind,
            "seconds": self.seconds,
            "swr": self.swr,
            "txOff": self.tx_off,
        }
