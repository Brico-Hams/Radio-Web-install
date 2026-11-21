"""Explicit DAC output, muted except while its PTT owner authorizes playback."""

import json
import logging
import secrets
import sys
import threading
import time
from collections import deque
from collections.abc import Buffer
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from bricoham_station_agent.audio import AudioError

LOGGER = logging.getLogger("bricoham.station_agent.audio_tx")
SAMPLE_RATE = 48_000
BLOCK_SAMPLES = 960
BLOCK_BYTES = BLOCK_SAMPLES * 2
MAX_FRAME_AGE = 0.3


class NativeOutputStream(Protocol):
    def start(self) -> None: ...
    def close(self) -> None: ...


@dataclass(frozen=True)
class TxAudioConfig:
    device: int
    device_name: str
    channels: int
    channel: int

    def __post_init__(self) -> None:
        if (
            type(self.device) is not int
            or self.device < 0
            or not isinstance(self.device_name, str)
            or not 1 <= len(self.device_name) <= 256
            or type(self.channels) is not int
            or self.channels not in (1, 2)
            or type(self.channel) is not int
            or not 0 <= self.channel < self.channels
        ):
            raise ValueError("Select an explicit named DAC and mono/stereo output channel.")

    @classmethod
    def load(cls, path: Path) -> "TxAudioConfig":
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict) or set(value) != {
            "device",
            "device_name",
            "channels",
            "channel",
        }:
            raise ValueError("Unexpected TX audio configuration fields.")
        return cls(**value)


class AudioTransmitter:
    def __init__(self, config: TxAudioConfig) -> None:
        self.config = config
        self._lock = threading.Lock()
        self._active: TxAudioSession | None = None
        self._closed = False

    def open(self) -> "TxAudioSession":
        with self._lock:
            if self._closed:
                raise AudioError("audio_tx_stopped")
            if self._active is not None:
                raise AudioError("audio_tx_busy")
            session = TxAudioSession(self)
            self._active = session
        opened = False
        try:
            session.open_native()
            with self._lock:
                if self._closed or self._active is not session:
                    raise AudioError("audio_tx_stopped")
            opened = True
            return session
        finally:
            if not opened:
                try:
                    session.close()
                except AudioError:
                    LOGGER.error("TX audio cleanup after failed preparation failed")

    def claim(self, identifier: str) -> "TxAudioSession":
        with self._lock:
            session = self._active
            if session is None or not secrets.compare_digest(session.identifier, identifier):
                raise AudioError("audio_tx_session_invalid")
            session.claim()
            return session

    def close(self) -> None:
        with self._lock:
            self._closed = True
            session = self._active
        if session is not None:
            session.close()


class TxAudioSession:
    def __init__(self, owner: AudioTransmitter) -> None:
        self.owner = owner
        self.identifier = secrets.token_urlsafe(32)
        self._lock = threading.Lock()
        self._blocks: deque[bytes] = deque()
        self._native_lock = threading.Lock()
        self._last_frame = 0.0
        self._failure: str | None = None
        self._closed = False
        self._claimed = False
        self._playing = False
        self._stream: NativeOutputStream | None = None
        self._silence = bytes(BLOCK_BYTES * owner.config.channels)
        self._native_errors: tuple[type[Exception], ...] = (OSError, ValueError)

    def open_native(self) -> None:
        with self._native_lock:
            with self._lock:
                if self._closed:
                    raise AudioError("audio_tx_stopped")
            self._open_native()
            with self._lock:
                if self._closed:
                    raise AudioError("audio_tx_stopped")

    def _open_native(self) -> None:
        if sys.byteorder != "little":
            raise AudioError("audio_tx_unsupported_byte_order")
        try:
            import sounddevice as sd
        except (ImportError, OSError) as error:
            LOGGER.warning("TX audio dependency unavailable (%s)", type(error).__name__)
            raise AudioError("audio_tx_dependency_missing") from error
        self._native_errors = (OSError, ValueError, sd.PortAudioError)
        config = self.owner.config
        try:
            info = sd.query_devices(config.device, "output")
            if info["name"] != config.device_name:
                raise AudioError("audio_tx_device_changed")
            sd.check_output_settings(
                device=config.device,
                channels=config.channels,
                dtype="int16",
                samplerate=SAMPLE_RATE,
            )
            self._stream = sd.RawOutputStream(
                device=config.device,
                channels=config.channels,
                dtype="int16",
                samplerate=SAMPLE_RATE,
                blocksize=BLOCK_SAMPLES,
                callback=self._callback,
            )
            self._stream.start()
        except self._native_errors as error:
            LOGGER.warning("TX DAC initialization failed (%s)", type(error).__name__)
            raise AudioError("audio_tx_output_failed") from error

    def _fail(self, code: str) -> None:
        self._failure = code
        self._playing = False
        self._blocks.clear()

    def push(self, block: bytes) -> None:
        with self._lock:
            if self._closed or self._failure is not None:
                raise AudioError(self._failure or "audio_tx_stopped")
            if len(block) != BLOCK_BYTES:
                self._fail("audio_tx_invalid_frame")
                raise AudioError("audio_tx_invalid_frame")
            if self._playing and len(self._blocks) >= 8:
                self._fail("audio_tx_overflow")
                raise AudioError("audio_tx_overflow")
            config = self.owner.config
            if config.channels == 2:
                stereo = bytearray(BLOCK_BYTES * 2)
                stereo[config.channel * 2 :: 4] = block[::2]
                stereo[config.channel * 2 + 1 :: 4] = block[1::2]
                block = bytes(stereo)
            if not self._playing:
                while len(self._blocks) >= 2:
                    self._blocks.popleft()
            self._blocks.append(block)
            self._last_frame = time.monotonic()

    def _healthy(self) -> bool:
        return (
            not self._closed
            and self._failure is None
            and (time.monotonic() - self._last_frame < MAX_FRAME_AGE)
        )

    def healthy(self) -> bool:
        with self._lock:
            return self._healthy()

    def ready(self) -> bool:
        with self._lock:
            return self._healthy() and len(self._blocks) >= 2 and not self._claimed

    def claim(self) -> None:
        with self._lock:
            if not self._healthy() or len(self._blocks) < 2 or self._claimed:
                raise AudioError("audio_tx_not_ready")
            self._claimed = True

    def unmute(self) -> None:
        with self._lock:
            if not self._claimed or not self._healthy() or len(self._blocks) < 2:
                raise AudioError("audio_tx_not_ready")
            self._playing = True

    def mute(self) -> None:
        with self._lock:
            self._playing = self._claimed = False
            self._blocks.clear()

    def _callback(self, outdata: Buffer, frames: int, timing: object, status: object) -> None:
        del timing
        view = memoryview(outdata).cast("B")
        view[:] = bytes(view.nbytes)
        with self._lock:
            if status or frames != BLOCK_SAMPLES or view.nbytes != len(self._silence):
                self._fail("audio_tx_output_status_error")
                return
            if self._closed or not self._playing:
                return
            if not self._healthy() or not self._blocks:
                self._fail("audio_tx_underflow")
                return
            view[:] = self._blocks.popleft()

    def close(self) -> None:
        with self._lock:
            self._closed = True
            self._playing = self._claimed = False
            self._blocks.clear()
        with self._native_lock:
            stream, self._stream = self._stream, None
            try:
                if stream is not None:
                    try:
                        stream.close()
                    except self._native_errors as error:
                        LOGGER.error("TX DAC close failed (%s)", type(error).__name__)
                        raise AudioError("audio_tx_close_failed") from error
            finally:
                with self.owner._lock:
                    if self.owner._active is self:
                        self.owner._active = None
