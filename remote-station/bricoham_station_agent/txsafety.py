# SPDX-License-Identifier: GPL-3.0-or-later
#
# Pure out-of-band TX inhibit helpers for the station agent (no I/O, no clock). Mirrors the Node agent's
# remote-txsafety.cjs. occupied_span is adapted from RemoteRig, common/protocol.cpp
#   SPDX-License-Identifier: MIT
#   Copyright (c) 2026 Yoann (LICENSE) / Copyright (c) 2026 RemoteRig Project (LICENSE.txt)
#   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
#   associated documentation files (the "Software"), to deal in the Software without restriction,
#   including without limitation the rights to use, copy, modify, merge, publish, distribute,
#   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
#   furnished to do so, subject to the following conditions: The above copyright notice and this
#   permission notice shall be included in all copies or substantial portions of the Software.
#   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
#   NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
#   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
#   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#   Changes: Qt types to plain numbers, this product's FTX-1 mode names, wider fallback for FM-like
#   modes, None when the carrier or the mode is unknown.
#
# The crossing-only logging follows RemoteRig server/servercore.cpp (MIT, same notice).
import logging
import re
from collections.abc import Callable, Iterable

LOGGER = logging.getLogger("bricoham.station_agent.txsafety")

NOT_CONFIGURED = "not-configured"
MAX_RANGES = 64
_UPPER_MODES = {"USB", "DIGU", "DATAU", "RTTYU", "RTTYR", "PKTUSB"}
_LOWER_MODES = {"LSB", "DIGL", "DATAL", "RTTYL", "RTTY", "PKTLSB"}


def occupied_span(
    carrier_hz: int | float | None, mode: str | None, passband_hz: int | float | None = None
) -> tuple[int | float, int | float] | None:
    """Occupied spectrum (low, high) in Hz for a displayed carrier; None when carrier or mode is unknown.

    The rig's reported passband is used when positive, otherwise a fallback width.
    """
    if (
        isinstance(carrier_hz, bool)
        or not isinstance(carrier_hz, (int, float))
        or carrier_hz < 0
        or not isinstance(mode, str)
        or not mode.strip()
    ):
        return None
    name = re.sub(r"[^A-Z0-9]", "", mode.upper())
    width = passband_hz if isinstance(passband_hz, (int, float)) and passband_hz > 0 else 0
    if not width:
        if "CW" in name:
            width = 200
        elif name.startswith("AM"):
            width = 6000
        elif "FM" in name:
            width = 12000
        else:
            width = 2700
    if name in _UPPER_MODES or "USB" in name:
        return carrier_hz, carrier_hz + width
    if name in _LOWER_MODES or "LSB" in name:
        return max(0, carrier_hz - width), carrier_hz
    return max(0, carrier_hz - width / 2), carrier_hz + width / 2


def parse_tx_ranges(value: object) -> tuple[tuple[int, int], ...]:
    """Allowed TX ranges from the explicit station configuration: [{"start_hz", "end_hz"}]. Empty = not configured."""
    if value is None:
        return ()
    if not isinstance(value, (list, tuple)) or len(value) > MAX_RANGES:
        raise ValueError("tx_ranges must be a list of {start_hz, end_hz} ranges.")
    ranges = []
    for item in value:
        if isinstance(item, tuple) and len(item) == 2:
            item = {"start_hz": item[0], "end_hz": item[1]}
        start = item.get("start_hz") if isinstance(item, dict) else None
        end = item.get("end_hz") if isinstance(item, dict) else None
        if (
            not isinstance(item, dict)
            or set(item) != {"start_hz", "end_hz"}
            or type(start) is not int
            or type(end) is not int
            or not 0 <= start < end
        ):
            raise ValueError("Each tx_ranges entry needs integer start_hz < end_hz in Hz.")
        ranges.append((start, end))
    return tuple(ranges)


class TxInhibit:
    """Out-of-band verdicts against explicit ranges. Never enabled unless ranges are configured."""

    def __init__(
        self,
        ranges: Iterable[tuple[int, int]] = (),
        log: Callable[[str], None] = LOGGER.warning,
    ) -> None:
        self.ranges = tuple(ranges)
        self.configured = bool(self.ranges)
        self._log = log
        self._state = "unknown" if self.configured else NOT_CONFIGURED
        self._span: tuple[int | float, int | float] | None = None
        self._last_known: str | None = None

    def evaluate(
        self, carrier_hz: int | float | None, mode: str | None, passband_hz: float | None = None
    ) -> tuple[str, tuple[int | float, int | float] | None]:
        if not self.configured:
            return NOT_CONFIGURED, None
        span = occupied_span(carrier_hz, mode, passband_hz)
        if span is None:
            return "unknown", None
        inside = any(span[0] >= start and span[1] <= end for start, end in self.ranges)
        return ("inside" if inside else "outside"), span

    def observe(
        self, carrier_hz: int | float | None, mode: str | None, passband_hz: float | None = None
    ) -> str:
        """Updates the reported state; only a crossing is logged."""
        if not self.configured:
            return NOT_CONFIGURED
        self._state, self._span = self.evaluate(carrier_hz, mode, passband_hz)
        if self._state != "unknown" and self._state != self._last_known:
            if self._state == "outside" and self._span is not None:
                self._log(
                    f"TX out of band in {mode}: emission would span {self._span[0]} to {self._span[1]} Hz"
                )
            elif self._last_known == "outside":
                self._log("TX span is back inside an allowed range")
            self._last_known = self._state
        return self._state

    def snapshot(self) -> dict[str, object]:
        return {
            "configured": self.configured,
            "state": self._state,
            "span": None
            if self._span is None
            else {"low_hz": self._span[0], "high_hz": self._span[1]},
            "ranges": [{"start_hz": start, "end_hz": end} for start, end in self.ranges],
        }
