import json
import logging
import secrets
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from bricoham_remote_station.drivers import ftx1_cat as ftx
from bricoham_station_agent.audio import AudioError
from bricoham_station_agent.audio_tx import AudioTransmitter, TxAudioSession
from bricoham_station_agent.cat import CatError, Ftx1TransmitChannel, SerialCat
from bricoham_station_agent.guests import TxLog, guest_tx_refusal
from bricoham_station_agent.radio_settings import settings_request_identifier
from bricoham_station_agent.txsafety import TxInhibit, parse_tx_ranges

LOGGER = logging.getLogger("bricoham.station_agent.ptt")
LEASE_SECONDS = 2.0
TRANSACTION_SECONDS = 0.7
WATCHDOG_INTERVAL = 0.05
MAX_RETRY_DELAY = 1.0
CRITICAL_LOG_INTERVAL = 5.0


def next_retry_delay(current: float) -> float:
    return min(max(current, WATCHDOG_INTERVAL) * 2, MAX_RETRY_DELAY)


class PttError(Exception):
    pass


@dataclass(frozen=True)
class PttConfig:
    enabled: bool
    frequency_min_hz: int
    frequency_max_hz: int
    power_max_watts: int
    max_transmit_seconds: int
    # Optional explicit out-of-band ranges [{"start_hz", "end_hz"}]; empty keeps the inhibit "not-configured".
    tx_ranges: tuple[tuple[int, int], ...] = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "tx_ranges", parse_tx_ranges(self.tx_ranges))
        if (
            type(self.enabled) is not bool
            or any(
                type(value) is not int
                for value in (
                    self.frequency_min_hz,
                    self.frequency_max_hz,
                    self.power_max_watts,
                    self.max_transmit_seconds,
                )
            )
            or not 30_000 <= self.frequency_min_hz < self.frequency_max_hz <= 470_000_000
            or not 5 <= self.power_max_watts <= 100
            or not 1 <= self.max_transmit_seconds <= 30
        ):
            raise ValueError(
                "PTT requires explicit boolean and integer frequency/power/time limits."
            )

    @classmethod
    def load(cls, path: Path) -> "PttConfig":
        value = json.loads(path.read_text(encoding="utf-8"))
        required = {
            "enabled",
            "frequency_min_hz",
            "frequency_max_hz",
            "power_max_watts",
            "max_transmit_seconds",
        }
        if not isinstance(value, dict) or set(value) not in (required, required | {"tx_ranges"}):
            raise ValueError("PTT requires exactly the documented local configuration fields.")
        return cls(**value)


@dataclass(frozen=True)
class PttOperator:
    """Who is asking to key: a label for the TX log and, for guests, their per-radio permission."""

    label: str
    guest_id: str | None = None
    permission: dict[str, object] | None = None


class PttController:
    def __init__(
        self,
        cat: SerialCat,
        config: PttConfig,
        *,
        tx_audio: AudioTransmitter | None = None,
        tx_log: TxLog | None = None,
        radio_id: str = "ftx-1",
        guest_active: Callable[[str], bool] | None = None,
    ) -> None:
        if cat.config.model != "FTX-1":
            raise ValueError("Guarded PTT is implemented only for FTX-1.")
        self.cat = cat
        self.config = config
        self.tx_audio = tx_audio
        self.tx_log = tx_log
        self.radio_id = radio_id
        self.guest_active = guest_active
        self.tx_inhibit = TxInhibit(config.tx_ranges)
        self._owner = PttOperator("local")
        self._checked: tuple[int, int | float] | None = None
        self._voice: TxAudioSession | None = None
        self._lock = threading.Lock()
        self._shutdown = threading.Event()
        self._channel: Ftx1TransmitChannel | None = None
        self._lease: str | None = None
        self._lease_until = self._maximum_until = 0.0
        self._rx_confirmed = False
        self._stop_failed = False
        self._closed = False
        self._requests: deque[str] = deque(maxlen=256)
        self._thread = threading.Thread(target=self._watchdog, name="ptt-deadman", daemon=True)
        self._thread.start()

    def _snapshot(self) -> dict[str, object]:
        return {
            "api_version": "v1",
            "model": "FTX-1",
            "status": "experimental",
            "data_is_simulated": False,
            "hardware_validation_complete": False,
            "enabled": self.config.enabled,
            "tx_audio_required": self.tx_audio is not None,
            "lease_active": self._lease is not None,
            "rx_confirmed": self._rx_confirmed,
            "stop_failed": self._stop_failed,
            "lease_seconds": LEASE_SECONDS,
            "max_transmit_seconds": self.config.max_transmit_seconds,
            "frequency_min_hz": self.config.frequency_min_hz,
            "frequency_max_hz": self.config.frequency_max_hz,
            "power_max_watts": self.config.power_max_watts,
            "tx_inhibit": self.tx_inhibit.snapshot(),
        }

    def snapshot(self) -> dict[str, object]:
        if not self._lock.acquire(blocking=False):
            raise PttError("ptt_busy")
        try:
            return self._snapshot()
        finally:
            self._lock.release()

    def _guard(
        self, *, transmitting: bool, deadline: float, operator: PttOperator | None = None
    ) -> None:
        assert self._channel is not None
        operator = operator or self._owner
        channel = self._channel
        state = ftx.parse_tx_reply(channel.read(ftx.Ftx1ReadCommand.TX_STATE, deadline))
        expected = ftx.Ftx1TxState.CAT_TX if transmitting else ftx.Ftx1TxState.RX
        if state != expected:
            raise PttError("ptt_unexpected_tx_state")
        if ftx.parse_tuner_reply(
            channel.read(ftx.Ftx1ReadCommand.TUNER, deadline)
        ).tuning_requested:
            raise PttError("ptt_tuner_busy")
        power = ftx.parse_power_reply(channel.read(ftx.Ftx1ReadCommand.POWER, deadline))
        if power.watts > self.config.power_max_watts:
            raise PttError("ptt_power_limit")
        if ftx.parse_transmitter_reply(
            channel.read(ftx.Ftx1ReadCommand.TRANSMITTER, deadline)
        ) != "MAIN" or ftx.parse_split_reply(channel.read(ftx.Ftx1ReadCommand.SPLIT, deadline)):
            raise PttError("ptt_requires_main_simplex_vfo")
        info = ftx.parse_main_information(
            channel.read(ftx.Ftx1ReadCommand.MAIN_INFORMATION, deadline)
        )
        if not info.is_vfo or not info.simplex or info.tx_clarifier_enabled:
            raise PttError("ptt_requires_main_simplex_vfo")
        if info.mode not in (ftx.Ftx1Mode.LSB, ftx.Ftx1Mode.USB):
            raise PttError("ptt_requires_ssb")
        if not self.config.frequency_min_hz <= info.frequency_hz <= self.config.frequency_max_hz:
            raise PttError("ptt_frequency_limit")
        # Explicit out-of-band ranges (off unless configured): the SSB sideband decides which edge matters.
        if self.tx_inhibit.configured and self.tx_inhibit.observe(
            info.frequency_hz, info.mode.name
        ) != "inside":
            raise PttError("ptt_out_of_band")        # Guest band and power limits are checked against the live radio, on start and on every renew.
        if operator.guest_id is not None:
            refusal = guest_tx_refusal(
                operator.permission, freq_hz=info.frequency_hz, power_w=power.watts
            )
            if refusal is not None:
                raise PttError(refusal)
        self._checked = (info.frequency_hz, power.watts)
        if self.tx_audio is not None:
            if ftx.parse_vox_reply(channel.read(ftx.Ftx1ReadCommand.VOX, deadline)):
                raise PttError("ptt_disable_vox_locally")
            if self._voice is None or not self._voice.healthy():
                raise PttError("ptt_audio_unavailable")

    def tune_refusal(self) -> str | None:
        """Out-of-band check for an ATU tune, done once before it starts with the operator's mode and frequency.

        The radio's own temporary mode during the tune (CW-L on the FTX-1) is never evaluated.
        """
        if not self.tx_inhibit.configured:
            return None
        if not self._lock.acquire(blocking=False):
            return "ptt_busy"
        try:
            if self._closed or self._lease is not None or self._channel is not None:
                return "ptt_busy"
            channel = self.cat.reserve_transmitter()
            try:
                info = ftx.parse_main_information(
                    channel.read(
                        ftx.Ftx1ReadCommand.MAIN_INFORMATION,
                        time.monotonic() + TRANSACTION_SECONDS,
                    )
                )
            finally:
                channel.release()
        except (CatError, ValueError):
            # Unknown frequency or mode fails closed for a new key-up.
            return "ptt_out_of_band_unknown"
        finally:
            self._lock.release()
        if self.tx_inhibit.observe(info.frequency_hz, info.mode.name) != "inside":
            return "ptt_out_of_band"
        return None

    def _release_channel(self) -> None:
        channel, self._channel = self._channel, None
        if channel is not None:
            channel.release()

    def _stop(self) -> None:
        if self._voice is not None:
            self._voice.mute()
            self._voice = None
        self._lease = None
        self._rx_confirmed = False
        self._stop_failed = True
        if self._channel is None:
            self._channel = self.cat.reserve_transmitter()
        self._channel.set_tx(False, time.monotonic() + TRANSACTION_SECONDS)
        self._release_channel()
        self._rx_confirmed = True
        self._stop_failed = False
        if self.tx_log is not None:
            self.tx_log.end()
        self._owner = PttOperator("local")
        LOGGER.info("PTT RX confirmed")

    def _owner_revoked(self) -> bool:
        guest_id = self._owner.guest_id
        return bool(
            self._lease is not None
            and guest_id is not None
            and self.guest_active is not None
            and not self.guest_active(guest_id)
        )

    def revoke_guest(self, guest_id: str) -> None:
        """Unkeys at once when the revoked guest holds the lease; a no-op otherwise."""
        if not self._lock.acquire(timeout=1.5):
            raise PttError("ptt_busy")
        try:
            if not self._closed and self._lease is not None and self._owner.guest_id == guest_id:
                self._stop()
        except (CatError, ValueError) as error:
            raise PttError("ptt_transaction_unconfirmed") from error
        finally:
            self._lock.release()

    def _expire(self) -> None:
        if (
            self._stop_failed
            or self._owner_revoked()
            or (
                self._lease is not None
                and (
                    time.monotonic() >= min(self._lease_until, self._maximum_until)
                    or self._voice is not None
                    and not self._voice.healthy()
                )
            )
        ):
            self._stop()

    def operate(
        self, payload: object, operator: PttOperator | None = None
    ) -> dict[str, object]:
        operator = operator or PttOperator("local")
        if not isinstance(payload, dict) or not isinstance(payload.get("operation"), str):
            raise ValueError("PTT operation must be an object.")
        operation = payload["operation"]
        allowed = {
            "start": (
                {"operation", "request_id", "audio_session_id"}
                if self.tx_audio is not None
                else {"operation", "request_id"}
            ),
            "renew": {"operation", "lease_id"},
            "stop": {"operation"},
        }
        if operation not in allowed or (
            set(payload) != allowed[operation]
            and not (operation == "stop" and set(payload) == {"operation", "cancel_request_id"})
        ):
            raise ValueError("Unknown PTT operation or fields.")
        identifier = None
        if "request_id" in payload or "cancel_request_id" in payload:
            identifier = settings_request_identifier(
                payload["request_id"] if operation == "start" else payload["cancel_request_id"]
            )
        if operation == "start" and self.tx_audio is not None:
            settings_request_identifier(payload["audio_session_id"])
        if operation == "renew" and (
            not isinstance(payload["lease_id"], str)
            or not payload["lease_id"].isascii()
            or not 32 <= len(payload["lease_id"]) <= 128
        ):
            raise ValueError("Invalid PTT lease identifier.")
        acquired = (
            self._lock.acquire(timeout=1.5)
            if operation == "stop"
            else self._lock.acquire(blocking=False)
        )
        if not acquired:
            raise PttError("ptt_busy")
        try:
            if self._closed:
                raise PttError("ptt_closed")
            if operation == "stop":
                if identifier is not None:
                    self._requests.append(identifier)
                self._stop()
            else:
                self._expire()
                if operation == "renew":
                    if self._lease is None or not secrets.compare_digest(
                        self._lease, payload["lease_id"]
                    ):
                        raise PttError("ptt_lease_expired")
                    deadline = min(
                        time.monotonic() + TRANSACTION_SECONDS,
                        self._lease_until,
                        self._maximum_until,
                    )
                    try:
                        self._guard(transmitting=True, deadline=deadline)
                    except (CatError, ValueError, PttError):
                        self._stop()
                        raise
                    if time.monotonic() >= min(self._lease_until, self._maximum_until):
                        self._stop()
                        raise PttError("ptt_lease_expired")
                    self._lease_until = min(time.monotonic() + LEASE_SECONDS, self._maximum_until)
                else:
                    if not self.config.enabled:
                        raise PttError("ptt_disabled")
                    if not self._rx_confirmed or self._stop_failed:
                        raise PttError("ptt_rx_confirmation_required")
                    if self._lease is not None:
                        raise PttError("ptt_busy")
                    if identifier in self._requests:
                        raise PttError("ptt_request_cancelled_or_repeated")
                    assert identifier is not None
                    self._requests.append(identifier)
                    try:
                        if self.tx_audio is not None:
                            self._voice = self.tx_audio.claim(payload["audio_session_id"])
                        self._channel = self.cat.reserve_transmitter()
                        self._guard(
                            transmitting=False,
                            deadline=time.monotonic() + TRANSACTION_SECONDS,
                            operator=operator,
                        )
                    except (CatError, ValueError, PttError, AudioError):
                        self._rx_confirmed = False
                        if self._voice is not None:
                            self._voice.mute()
                            self._voice = None
                        self._release_channel()
                        raise
                    self._rx_confirmed = False
                    self._lease = secrets.token_urlsafe(32)
                    self._owner = operator
                    now = time.monotonic()
                    self._maximum_until = now + self.config.max_transmit_seconds
                    self._lease_until = min(now + LEASE_SECONDS, self._maximum_until)
                    try:
                        self._channel.set_tx(
                            True, min(now + TRANSACTION_SECONDS, self._lease_until)
                        )
                        if self.tx_log is not None and self._checked is not None:
                            self.tx_log.begin(
                                operator=operator.label,
                                radio=self.radio_id,
                                freq_hz=self._checked[0],
                                power_w=self._checked[1],
                            )
                        if self._voice is not None:
                            self._voice.unmute()
                    except (CatError, ValueError, AudioError):
                        self._stop()
                        raise
                    LOGGER.warning("PTT CAT TX confirmed; exclusive lease and watchdog active")
            result = self._snapshot()
            if operation in ("start", "renew"):
                result["lease_id"] = self._lease
            return result
        except AudioError as error:
            LOGGER.error("PTT audio unavailable (%s)", error)
            raise PttError("ptt_audio_unavailable") from error
        except (CatError, ValueError) as error:
            LOGGER.error("PTT transaction unconfirmed (%s)", type(error).__name__)
            raise PttError("ptt_transaction_unconfirmed") from error
        finally:
            self._lock.release()

    def _watchdog(self) -> None:
        delay = WATCHDOG_INTERVAL
        last_critical = float("-inf")
        while not self._shutdown.wait(delay):
            with self._lock:
                try:
                    self._expire()
                    delay = WATCHDOG_INTERVAL
                except (CatError, ValueError, PttError) as error:
                    # Never stop retrying the unkey; only slow down and rate-limit the log.
                    delay = next_retry_delay(delay)
                    now = time.monotonic()
                    if now - last_critical >= CRITICAL_LOG_INTERVAL:
                        last_critical = now
                        LOGGER.critical(
                            "PTT RX NOT confirmed (%s); use local stop", type(error).__name__
                        )

    def close(self) -> None:
        self._shutdown.set()
        with self._lock:
            if self._closed:
                return
            self._closed = True
            try:
                if self._channel is not None or self._lease is not None or self._stop_failed:
                    self._stop()
            except (CatError, ValueError, PttError) as error:
                LOGGER.critical(
                    "PTT shutdown RX NOT confirmed (%s); use local stop", type(error).__name__
                )
            finally:
                self._release_channel()
        self._thread.join(timeout=2)
        if self.tx_audio is not None:
            self.tx_audio.close()
