"""Opt-in station ADC capture. No device is opened until a listener connects."""

import json
import logging
import queue
import struct
import sys
import threading
from collections.abc import Buffer
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

LOGGER = logging.getLogger("bricoham.station_agent.audio")


class NativeInputStream(Protocol):
    def start(self) -> None: ...

    def close(self) -> None: ...


class AudioError(Exception):
    pass


@dataclass(frozen=True)
class AudioConfig:
    device: int
    sample_rate: int
    block_ms: int
    device_name: str | None = None

    @classmethod
    def load(cls, path: Path) -> "AudioConfig":
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) - {
                "device",
                "device_name",
                "sample_rate",
                "block_ms",
            }:
                raise ValueError("Invalid audio fields")
            device, rate, block = (data[key] for key in ("device", "sample_rate", "block_ms"))
            name = data.get("device_name")
            if (
                type(device) is not int
                or device < 0
                or type(rate) is not int
                or not 8000 <= rate <= 48000
                or type(block) is not int
                or not 10 <= block <= 100
                or rate * block % 1000
                or (name is not None and (not isinstance(name, str) or not 1 <= len(name) <= 256))
            ):
                raise ValueError("Invalid audio configuration")
            return cls(device, rate, block, name)
        except (OSError, KeyError, ValueError, UnicodeError) as error:
            raise ValueError("Invalid audio configuration") from error


class AudioCapture:
    def __init__(self, config: AudioConfig) -> None:
        self.config = config
        self._lock = threading.Lock()
        self._closed = threading.Event()
        self._active = False

    def metadata(self) -> dict[str, object]:
        return {
            "api_version": "v1",
            "enabled": True,
            "format": "BHR1",
            "device": self.config.device,
            "device_name": self.config.device_name,
            "sample_rate": self.config.sample_rate,
            "block_ms": self.config.block_ms,
            "channels": 1,
            "bits": 16,
            "hardware_validated": False,
        }

    def close(self) -> None:
        self._closed.set()

    def open(self) -> "AudioSession":
        with self._lock:
            if self._closed.is_set():
                raise AudioError("audio_stopped")
            if self._active:
                raise AudioError("audio_busy")
            self._active = True
        opened = False
        try:
            session = AudioSession(self)
            opened = True
            return session
        finally:
            if not opened:
                with self._lock:
                    self._active = False


class AudioSession:
    def __init__(self, capture: AudioCapture) -> None:
        self.capture = capture
        self.blocks: queue.Queue[bytes] = queue.Queue(maxsize=8)
        self.failed = threading.Event()
        self.empty_reads = 0
        self.stream: NativeInputStream | None = None
        config = capture.config
        started = False
        native_errors: tuple[type[Exception], ...] = (OSError, ValueError)
        try:
            if sys.byteorder != "little":
                raise AudioError("audio_unsupported_byte_order")
            try:
                import sounddevice as sd
            except ImportError as error:
                LOGGER.warning("Audio dependency unavailable", exc_info=True)
                raise AudioError("audio_dependency_missing") from error
            except OSError as error:
                LOGGER.warning("Audio native library unavailable", exc_info=True)
                raise AudioError("audio_capture_failed") from error
            native_errors = (OSError, ValueError, sd.PortAudioError)
            try:
                info = sd.query_devices(config.device, "input")
                if config.device_name is not None and info["name"] != config.device_name:
                    raise AudioError("audio_device_changed")
                sd.check_input_settings(
                    device=config.device, channels=1, dtype="int16", samplerate=config.sample_rate
                )
                self.stream = sd.RawInputStream(
                    device=config.device,
                    channels=1,
                    dtype="int16",
                    samplerate=config.sample_rate,
                    blocksize=config.sample_rate * config.block_ms // 1000,
                    callback=self._callback,
                )
                self.stream.start()
                if capture._closed.is_set():
                    raise AudioError("audio_stopped")
            except native_errors as error:
                LOGGER.warning("Audio capture initialization failed", exc_info=True)
                raise AudioError("audio_capture_failed") from error
            started = True
        finally:
            if not started:
                try:
                    self._close_stream()
                except native_errors:
                    LOGGER.warning("Audio cleanup after failed startup failed", exc_info=True)

    def _callback(self, indata: Buffer, frames: int, time_info: object, status: object) -> None:
        del time_info
        expected = self.capture.config.sample_rate * self.capture.config.block_ms // 1000
        if status or frames != expected or memoryview(indata).nbytes != expected * 2:
            self.failed.set()
            return
        try:
            self.blocks.put_nowait(bytes(indata))
        except queue.Full:
            self.failed.set()

    def read(self) -> bytes:
        if self.failed.is_set():
            raise AudioError("audio_overflow_or_capture_error")
        if self.capture._closed.is_set():
            raise AudioError("audio_stopped")
        try:
            block = self.blocks.get(timeout=1)
        except queue.Empty:
            self.empty_reads += 1
            if self.empty_reads >= 3:
                raise AudioError("audio_capture_timeout") from None
            return b""
        self.empty_reads = 0
        if self.failed.is_set():
            raise AudioError("audio_overflow_or_capture_error")
        return block

    def header(self) -> bytes:
        return struct.pack("<4sIHH", b"BHR1", self.capture.config.sample_rate, 1, 16)

    def _close_stream(self) -> None:
        if self.stream is not None:
            self.stream.close()
            self.stream = None

    def close(self) -> None:
        try:
            self._close_stream()
        finally:
            with self.capture._lock:
                self.capture._active = False
