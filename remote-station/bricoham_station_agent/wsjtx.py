import copy
import logging
import math
import socket
import struct
import threading
import time
from collections import deque

LOGGER = logging.getLogger("bricoham.station_agent.wsjtx")


class _Reader:
    def __init__(self, packet: bytes) -> None:
        self.packet = packet
        self.position = 0

    def number(self, kind: str) -> int | float:
        size = struct.calcsize(">" + kind)
        if self.position + size > len(self.packet):
            raise ValueError("wsjtx_truncated_packet")
        value = struct.unpack_from(">" + kind, self.packet, self.position)[0]
        self.position += size
        return value

    def integer(self, kind: str = "I") -> int:
        return int(self.number(kind))

    def boolean(self) -> bool:
        value = self.integer("B")
        if value not in (0, 1):
            raise ValueError("wsjtx_invalid_boolean")
        return bool(value)

    def text(self) -> str | None:
        size = self.integer()
        if size == 0xFFFFFFFF:
            return None
        if size > 2048 or self.position + size > len(self.packet):
            raise ValueError("wsjtx_invalid_string_length")
        value = self.packet[self.position : self.position + size].decode("utf-8")
        self.position += size
        return value


def parse_packet(packet: bytes) -> tuple[int, str, dict[str, object]]:
    if not 16 <= len(packet) <= 8192:
        raise ValueError("wsjtx_invalid_packet_length")
    reader = _Reader(packet)
    magic, schema = reader.integer(), reader.integer()
    if magic != 0xADBCCBDA or schema not in (2, 3):
        raise ValueError("wsjtx_unsupported_header")
    kind = reader.integer()
    identity = reader.text()
    if not identity or len(identity) > 128:
        raise ValueError("wsjtx_invalid_identity")
    fields: dict[str, object] = {}
    if kind == 0:
        fields = (
            {
                "maximum_schema": reader.integer(),
                "version": reader.text(),
                "revision": reader.text(),
            }
            if reader.position < len(packet) or schema == 3
            else {
                "maximum_schema": 2,
                "version": None,
                "revision": None,
            }
        )
    elif kind == 1:
        fields = {
            "dial_frequency_hz": reader.integer("Q"),
            "mode": reader.text(),
            "dx_call": reader.text(),
            "report": reader.text(),
            "tx_mode": reader.text(),
            "tx_enabled_in_wsjtx": reader.boolean(),
            "transmitting_in_wsjtx": reader.boolean(),
            "decoding": reader.boolean(),
            "rx_df_hz": reader.integer(),
            "tx_df_hz": reader.integer(),
            "de_call": reader.text(),
            "de_grid": reader.text(),
            "dx_grid": reader.text(),
        }
    elif kind == 2:
        fields["new"] = reader.boolean()
        milliseconds = reader.integer()
        if milliseconds >= 86_400_000:
            raise ValueError("wsjtx_invalid_time")
        fields["time_since_midnight_ms"] = milliseconds
        fields["snr_db"] = reader.integer("i")
        delta_time = reader.number("d")
        if not math.isfinite(delta_time):
            raise ValueError("wsjtx_invalid_delta_time")
        fields.update(
            {
                "delta_time_seconds": delta_time,
                "delta_frequency_hz": reader.integer(),
                "mode": reader.text(),
                "message": reader.text(),
                "low_confidence": reader.boolean(),
                "off_air": reader.boolean() if reader.position < len(packet) else None,
            }
        )
    return kind, identity, fields


class WsjtxReceiver:
    def __init__(self, port: int, identity: str) -> None:
        if type(port) is not int or not 0 <= port <= 65535:
            raise ValueError("El puerto UDP debe estar entre 0 y 65535.")
        if not identity or len(identity) > 128:
            raise ValueError("Selecciona el Id exacto de instancia WSJT-X (máximo 128 caracteres).")
        self.identity = identity
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            self._socket.bind(("127.0.0.1", port))
            self._socket.settimeout(0.2)
        except OSError:
            self._socket.close()
            raise
        self.port = self._socket.getsockname()[1]
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._receive, name="wsjtx-rx")
        self._last_seen: float | None = None
        self._schema: int | None = None
        self._last_message_type: int | None = None
        self._closed = False
        self._failed = False
        self._status: dict[str, object] | None = None
        self._decodes: deque[dict[str, object]] = deque(maxlen=100)
        self._invalid_packets = 0
        self._ignored_packets = 0
        self._thread.start()

    def close(self) -> None:
        self._stop.set()
        self._thread.join(timeout=1)
        self._socket.close()
        if self._thread.is_alive():
            raise RuntimeError("No se pudo detener el receptor WSJT-X.")

    def _receive(self) -> None:
        while not self._stop.is_set():
            try:
                packet, _ = self._socket.recvfrom(65535)
            except TimeoutError:
                continue
            except OSError:
                LOGGER.exception("WSJT-X UDP receiver failed")
                with self._lock:
                    self._failed = True
                return
            try:
                kind, identity, fields = parse_packet(packet)
            except (ValueError, UnicodeDecodeError):
                with self._lock:
                    self._invalid_packets += 1
                continue
            with self._lock:
                if identity != self.identity or kind not in (0, 1, 2, 3, 6):
                    self._ignored_packets += 1
                    continue
                self._last_seen = time.monotonic()
                self._schema = int.from_bytes(packet[4:8], "big")
                self._last_message_type = kind
                self._closed = kind == 6
                if kind == 1:
                    self._status = fields
                elif kind == 2:
                    self._decodes.append(fields)
                elif kind == 3:
                    self._decodes.clear()
                elif kind == 6:
                    self._status = None

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            age = None if self._last_seen is None else time.monotonic() - self._last_seen
            return {
                "api_version": "v1",
                "source": "wsjtx_udp",
                "authenticated": False,
                "trust": "untrusted_local_udp",
                "suitable_for_control": False,
                "data_is_simulated": False,
                "schema": self._schema,
                "supported_schemas": [2, 3],
                "last_message_type": self._last_message_type,
                "instance_id": self.identity,
                "connected": age is not None and age < 60 and not self._closed and not self._failed,
                "receiver_failed": self._failed,
                "last_seen_age_seconds": age,
                "status": copy.deepcopy(self._status),
                "decodes": copy.deepcopy(list(self._decodes)),
                "invalid_packets": self._invalid_packets,
                "ignored_packets": self._ignored_packets,
                "commands_enabled": False,
            }
