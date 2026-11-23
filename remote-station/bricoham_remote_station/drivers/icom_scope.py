"""Icom CI-V scope waveform ("27 00") frame assembler.

Source: the MIT-licensed rigplane project vendored in third_party/ftx1/rigplane-rigplane-core
(docs/api/scope.md and src/rigplane/scope/__init__.py), which cites the IC-705, IC-7300, IC-7610
and IC-9700 CI-V Reference Guides. Layout:

    FE FE <to> <from> 27 00 <receiver> <seq_bcd> <seq_max_bcd> <data...> FD

Sequence 1 data: mode, start frequency (5 BCD bytes, least significant first), end frequency
(same format), out-of-range flag, then pixels. Later sequences carry only pixels. Pixel
amplitude is 0x00..0xA0. In mode 0 (centre) the two frequencies are the centre and the half-span.
This module parses frames only; the live reader is SerialCat.scope_stream (bricoham_station_agent/cat.py).
"""

from dataclasses import dataclass

from bricoham_remote_station.drivers.icom_civ import CONTROLLER_ADDRESS

MAX_PIXELS = 689
PIXEL_MAX = 160
_FIRST_SEQUENCE_MIN = 14


@dataclass(frozen=True)
class ScopeFrame:
    mode: int
    start_hz: int
    end_hz: int
    out_of_range: bool
    pixels: bytes


def _bcd_byte(value: int) -> int:
    if value >> 4 > 9 or value & 15 > 9:
        raise ValueError("Invalid BCD in scope frame.")
    return (value >> 4) * 10 + (value & 15)


def _bcd_frequency(data: bytes, signed: bool = False) -> int:
    # IC-705 guide p.28: an "F" in the 1 GHz digit of the lower edge means a negative frequency.
    negative = signed and data[-1] >> 4 == 0xF
    if negative:
        data = data[:-1] + bytes((data[-1] & 0x0F,))
    value = sum(_bcd_byte(byte) * 100**index for index, byte in enumerate(data))
    return -value if negative else value


def scope_payload(frame: bytes, radio_address: int | None = None) -> tuple[int, bytes] | None:
    """Return (receiver, payload) for a complete 27 00 frame addressed to the controller, else None."""
    if (
        not isinstance(frame, bytes)
        or len(frame) < 9
        or frame[:2] != b"\xfe\xfe"
        or frame[-1] != 0xFD
        or frame[2] != CONTROLLER_ADDRESS
        or frame[4:6] != b"\x27\x00"
        or (radio_address is not None and frame[3] != radio_address)
    ):
        return None
    return frame[6], frame[7:-1]


class ScopeAssembler:
    def __init__(self) -> None:
        self._reset()

    def _reset(self) -> None:
        self._expected = 0
        self._max = 0
        self._meta: tuple[int, int, int, bool] | None = None
        self._pixels = bytearray()

    def feed(self, payload: bytes) -> ScopeFrame | None:
        if len(payload) < 2:
            return None
        try:
            seq, seq_max = _bcd_byte(payload[0]), _bcd_byte(payload[1])
        except ValueError:
            self._reset()
            return None
        if seq == 1:
            self._reset()
            if len(payload) < _FIRST_SEQUENCE_MIN or seq_max < 1:
                return None
            try:
                start = _bcd_frequency(payload[3:8], signed=payload[2] != 0)
                end = _bcd_frequency(payload[8:13])
            except ValueError:
                return None
            mode = payload[2]
            if mode == 0:
                start, end = start - end, start + end
            out_of_range = payload[13] != 0
            if out_of_range:
                return ScopeFrame(mode, start, end, True, b"")
            self._meta = (mode, start, end, False)
            self._expected, self._max = 2, seq_max
            self._pixels.extend(payload[14:])
            return self._finish() if seq_max == 1 else None
        if self._meta is None or seq != self._expected or seq_max != self._max or seq > self._max:
            self._reset()
            return None
        self._pixels.extend(payload[2:])
        if len(self._pixels) > MAX_PIXELS:
            self._reset()
            return None
        self._expected += 1
        return self._finish() if seq == self._max else None

    def _finish(self) -> ScopeFrame:
        assert self._meta is not None
        frame = ScopeFrame(*self._meta, bytes(self._pixels))
        self._reset()
        return frame
