"""FlexRadio SmartSDR controller for the station agent.

Wraps drivers/smartsdr_protocol.SmartSdrSession (source: remote-station/docs/FLEX-SMARTSDR-API.md).
TX is default off, only through the guarded tune/ATU flow (operator action, tunepower <= tune_limit,
time cap, verified TX off). `xmit` PTT is an explicit operator action under the same guards; the
panadapter FFT feeds the scope stream. ping/keepalive, waterfall tiles and vox_* values are pendiente de fuente.
"""

import json
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from bricoham_remote_station.drivers.icom_scope import PIXEL_MAX, ScopeFrame
from bricoham_remote_station.drivers.smartsdr_protocol import (
    SMARTSDR_TCP_PORT,
    Cmd,
    PanFrameAssembler,
    SmartSdrError,
    SmartSdrSession,
    TcpTransport,
    UdpTransport,
    parse_fft_packet,
)
from bricoham_station_agent.radio_settings import settings_request_identifier

LOGGER = logging.getLogger("bricoham.station_agent.flex")
# Documented 0-100 ranges only (transmit set); max_power_level and region are never written.
SETTINGS = ("rfpower", "tunepower", "miclevel")
# ping (keepalive) syntax and VITA-49 waterfall tiles are in none of the references read.
PENDING = ("vox_level", "vox_delay", "hwalc_enabled", "waterfall_tiles", "keepalive")
SCOPE_MAX_COLUMNS = 425  # the web console accepts at most 689 pixels per row; 850 bins / 2
SCOPE_PAN_WAIT_S = 2.0
# Same live-data envelope the coordinator checks for every agent payload.
ENVELOPE = {
    "api_version": "v1",
    "source": "smartsdr_tcp",
    "status": "experimental",
    "data_is_simulated": False,
    "hardware_validation_complete": False,
}


class FlexError(Exception):
    pass


def _scope_pixels(levels: bytes) -> bytes:
    """0..255 levels -> 0..PIXEL_MAX pixels, keeping the peak when the row is decimated to fit."""
    step = -(-len(levels) // SCOPE_MAX_COLUMNS)
    return bytes(
        round(max(levels[i : i + step]) * PIXEL_MAX / 255) for i in range(0, len(levels), step)
    )


@dataclass(frozen=True)
class FlexConfig:
    host: str
    allow_tx: bool
    tune_limit: int
    tx_cap_s: float
    port: int = SMARTSDR_TCP_PORT
    swr_limit: float = 3.0
    allow_amplifier_operate: bool = False
    udp_port: int | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.host, str) or not 1 <= len(self.host) <= 253:
            raise ValueError("A radio host is required.")
        if type(self.allow_tx) is not bool or type(self.allow_amplifier_operate) is not bool:
            raise ValueError("allow_tx and allow_amplifier_operate must be explicit booleans.")
        if type(self.tune_limit) is not int or not 0 <= self.tune_limit <= 100:
            raise ValueError("tune_limit must be an integer 0..100.")
        if isinstance(self.tx_cap_s, bool) or not isinstance(self.tx_cap_s, int | float):
            raise ValueError("tx_cap_s must be a number.")
        if not 1 <= self.tx_cap_s <= 60:
            raise ValueError("tx_cap_s must be between 1 and 60 seconds.")
        if type(self.port) is not int or not 1 <= self.port <= 65535:
            raise ValueError("Invalid port.")
        if self.udp_port is not None and (type(self.udp_port) is not int or not 1 <= self.udp_port <= 65535):
            raise ValueError("Invalid udp_port.")
        if isinstance(self.swr_limit, bool) or not isinstance(self.swr_limit, int | float) or self.swr_limit < 1:
            raise ValueError("swr_limit must be a number >= 1.")

    @classmethod
    def load(cls, path: Path) -> "FlexConfig":
        payload = json.loads(path.read_text(encoding="utf-8"))
        required = {"host", "allow_tx", "tune_limit", "tx_cap_s"}
        optional = {"port", "swr_limit", "allow_amplifier_operate", "udp_port"}
        if (
            not isinstance(payload, dict)
            or not required.issubset(payload)
            or set(payload) - required - optional
        ):
            raise ValueError("Unexpected FlexRadio configuration fields.")
        return cls(**payload)


class FlexController:
    def __init__(
        self, config: FlexConfig, transport_factory=TcpTransport, clock=time.monotonic, udp_factory=UdpTransport
    ) -> None:
        self.config = config
        self._factory = transport_factory
        self._udp_factory = udp_factory
        self._clock = clock
        self._lock = threading.RLock()
        self._session: SmartSdrSession | None = None
        self._closed = False
        self._backup: dict[str, int | None] = {}
        self._seen: deque[str] = deque(maxlen=256)

    def _ensure(self) -> SmartSdrSession:
        if self._closed:
            raise FlexError("flex_closed")
        if self._session is not None:
            return self._session
        try:
            session = SmartSdrSession(
                self._factory(self.config.host, self.config.port),
                allow_tx=self.config.allow_tx,
                allow_amplifier_operate=self.config.allow_amplifier_operate,
                tx_cap_s=float(self.config.tx_cap_s),
                tune_limit=self.config.tune_limit,
                swr_limit=float(self.config.swr_limit),
                clock=self._clock,
            )
            session.handshake()
            session.connect_setup(udp_port=self.config.udp_port)
            session.command(Cmd.subscribe("slice"))
        except (SmartSdrError, OSError, ValueError) as error:
            raise FlexError("flex_unreachable") from error
        self._session = session
        return session

    def _drop(self) -> None:
        session, self._session = self._session, None
        if session is not None:
            try:
                session.close()
            except (SmartSdrError, OSError, ValueError):
                LOGGER.warning("Flex session closed with TX off not verified")

    def pump_once(self, timeout: float = 0.0) -> None:
        """Process S/M lines and enforce the TX time cap; the daemon thread calls this."""
        with self._lock:
            if self._session is None:
                return
            try:
                self._session.pump(timeout)
            except (SmartSdrError, OSError, ValueError):
                self._drop()

    def start_watchdog(self) -> threading.Thread:
        def loop() -> None:
            while not self._closed:
                self.pump_once(0.05)
                time.sleep(0.05)

        thread = threading.Thread(target=loop, name="flex-watchdog", daemon=True)
        thread.start()
        return thread

    def snapshot(self) -> dict:
        with self._lock:
            session = self._ensure()
            slices = {
                key[1][0]: dict(fields)
                for key, fields in session.status.items()
                if key[0] == "slice" and key[1]
            }
            return {
                **ENVELOPE,
                "connected": True,
                "version": session.version,
                "slices": slices,
                "tx": {
                    "enabled": self.config.allow_tx,
                    "active": session.tx_deadline is not None,
                    "swr_tripped": session.swr_tripped,
                    "off_unverified": session.tx_off_unverified,
                    "tune_limit": self.config.tune_limit,
                    "cap_s": self.config.tx_cap_s,
                },
                "settings": {name: None for name in SETTINGS},
                "pending_de_fuente": list(PENDING),
            }

    def operate(self, payload: object) -> dict:
        if not isinstance(payload, dict) or not isinstance(payload.get("action"), str):
            raise ValueError("Invalid Flex operation.")
        action = payload["action"]
        with self._lock:
            session = self._ensure()
            try:
                return {**ENVELOPE, **self._run(session, action, payload)}
            except SmartSdrError as error:
                raise FlexError(self._code(error)) from error
            except OSError as error:
                self._drop()
                raise FlexError("flex_unreachable") from error

    @staticmethod
    def _code(error: SmartSdrError) -> str:
        text = str(error)
        if "TX desactivado" in text:
            return "flex_tx_disabled"
        if "ROE alta" in text:
            return "flex_swr_tripped"
        if "límite" in text:
            return "flex_tune_limit"
        if "OPERATE" in text:
            return "flex_amplifier_standby"
        return "flex_command_failed"

    def _run(self, session: SmartSdrSession, action: str, payload: dict) -> dict:
        if action == "emergency_stop":
            return {"ok": session.emergency_stop()}
        if action == "tune_stop":
            return {"ok": session.unkey()}
        if action == "ptt_stop":
            return {"ok": session.unkey()}
        if action == "ptt_start":
            session.ptt_start()
            return {"ok": True, "cap_s": self.config.tx_cap_s}
        if action == "reset_swr":
            session.reset_swr_trip()
            return {"ok": True}
        if action in ("tune_start", "atu_start"):
            power = payload.get("tune_power")
            if type(power) is not int:
                raise ValueError("tune_power must be an integer.")
            (session.tune_start if action == "tune_start" else session.atu_start)(power)
            return {"ok": True, "cap_s": self.config.tx_cap_s}
        if action == "set_frequency":
            session.command(Cmd.slice_tune(payload.get("slice"), payload.get("mhz")))
            return {"ok": True}
        if action == "set_mode":
            session.command(Cmd.slice_set_mode(payload.get("slice"), payload.get("mode")))
            return {"ok": True}
        if action == "amplifier":
            session.amplifier_operate(payload.get("handle"), payload.get("operate") is True)
            return {"ok": True}
        if action == "set_setting":
            return self._set_setting(session, payload)
        if action == "restore_settings":
            for name, value in list(self._backup.items()):
                if value is not None:
                    session.command(Cmd.transmit_set(**{name: value}))
            return {"ok": True, "restored": sorted(n for n, v in self._backup.items() if v is not None)}
        raise ValueError("Unknown Flex action.")

    def _set_setting(self, session: SmartSdrSession, payload: dict) -> dict:
        request_id = settings_request_identifier(payload.get("request_id"))
        name, value = payload.get("name"), payload.get("value")
        if name not in SETTINGS:
            raise ValueError("Setting without documented range.")
        if request_id in self._seen:
            raise FlexError("flex_request_repeated")
        if name in ("rfpower", "tunepower") and session.tx_deadline is not None:
            raise FlexError("flex_settings_require_rx")
        if name == "tunepower" and type(value) is int and value > self.config.tune_limit:
            raise FlexError("flex_tune_limit")
        # The radio status field names are pendiente de fuente: previous value known only if the
        # `transmit` status object was already received; the readback is the code-0 reply.
        previous = session.status.get(("transmit", ()), {}).get(name)
        self._backup.setdefault(name, int(previous) if previous is not None and str(previous).isdigit() else None)
        session.command(Cmd.transmit_set(**{name: value}))
        self._seen.append(request_id)
        return {"ok": True, "name": name, "value": value, "backup": self._backup[name], "readback": "ack_only"}

    def _pan_geometry(self, session: SmartSdrSession, pan_id: str):
        fields = session.status.get(("display", ("pan", pan_id)), {})
        try:
            center, bandwidth = float(fields["center"]), float(fields["bandwidth"])
        except (KeyError, ValueError):
            return None
        if not (center > 0 and bandwidth > 0):
            return None
        return round((center - bandwidth / 2) * 1e6), round((center + bandwidth / 2) * 1e6)

    def _find_pan(self, session: SmartSdrSession):
        for key in session.status:
            if key[0] == "display" and len(key[1]) == 2 and key[1][0] == "pan":
                return key[1][1]
        return None

    def scope_stream(self, seconds: float, max_fps: float):
        """Yield ScopeFrame rows from the radio's own panadapter (receive-only) for at most `seconds`."""
        if self.config.udp_port is None:
            raise FlexError("flex_scope_needs_udp_port")
        with self._lock:
            session = self._ensure()
            try:
                session.command(Cmd.subscribe("pan"))
            except (SmartSdrError, OSError, ValueError) as error:
                raise FlexError("flex_command_failed") from error
        pan_id = None
        wait_until = self._clock() + SCOPE_PAN_WAIT_S
        while pan_id is None and self._clock() < wait_until:
            self.pump_once(0.05)
            with self._lock:
                pan_id = self._find_pan(session)
        if pan_id is None:
            raise FlexError("flex_scope_no_pan")
        try:
            with self._lock:
                session.command(Cmd.pan_layout(pan_id))
            udp = self._udp_factory(self.config.host, self.config.udp_port)
        except (SmartSdrError, OSError, ValueError) as error:
            raise FlexError("flex_scope_unavailable") from error
        stream_id = int(pan_id, 16)
        assembler = PanFrameAssembler()
        min_gap = 1.0 / max(0.1, min(float(max_fps), 30.0))
        deadline = self._clock() + max(0.0, float(seconds))
        last = None
        try:
            while self._clock() < deadline and not self._closed and self._session is session:
                self.pump_once(0.0)
                data = udp.recv(0.05)
                packet = parse_fft_packet(data) if data else None
                if packet is None or packet.stream_id != stream_id:
                    continue
                levels = assembler.feed(packet)
                now = self._clock()
                if levels is None or (last is not None and now - last < min_gap):
                    continue
                with self._lock:
                    edges = self._pan_geometry(session, pan_id)
                if edges is None or edges[1] <= edges[0]:
                    continue
                last = now
                yield ScopeFrame(1, edges[0], edges[1], False, _scope_pixels(levels))
        finally:
            udp.close()

    def close(self) -> None:
        with self._lock:
            self._closed = True
            self._drop()
