import logging
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Protocol

import serial

from bricoham_remote_station.cat_diagnostics import ReadQuery, read_profiles
from bricoham_remote_station.drivers import ftx1_cat as ftx1
from bricoham_remote_station.drivers import icom_civ as icom
from bricoham_remote_station.drivers import opengd77_usb as opengd77
from bricoham_remote_station.drivers import yaesu_cat as yaesu
from bricoham_station_agent import menu_settings
from bricoham_station_agent.radio_settings import (
    RadioSettingsConfig,
    settings_request_identifier,
)

LOGGER = logging.getLogger("bricoham.station_agent.cat")


class SerialPort(Protocol):
    port: str | None
    rts: bool
    dtr: bool

    def open(self) -> None: ...
    def close(self) -> None: ...
    def reset_input_buffer(self) -> None: ...
    def write(self, data: bytes) -> int: ...
    def read(self, size: int = 1) -> bytes: ...


@dataclass(frozen=True)
class CatConfig:
    model: str
    port: str
    baudrate: int
    stopbits: int = 1
    timeout: float = 1.0

    def __post_init__(self) -> None:
        if not self.port.strip() or len(self.port) > 256 or "://" in self.port:
            raise ValueError("Selecciona explícitamente una ruta de puerto serie local.")
        if type(self.baudrate) is not int or not 300 <= self.baudrate <= 115200:
            raise ValueError("La velocidad CAT debe estar entre 300 y 115200 baud.")
        if type(self.stopbits) is not int or self.stopbits not in (1, 2):
            raise ValueError("Los bits de parada deben ser 1 o 2.")
        if not 0.1 <= self.timeout <= 2:
            raise ValueError("El plazo CAT debe estar entre 0.1 y 2 segundos.")


class CatError(Exception):
    pass


class SerialCat:
    def __init__(self, config: CatConfig, *, settings: RadioSettingsConfig | None = None) -> None:
        profiles = read_profiles()
        profile = profiles.get(config.model)
        if profile is None or profile.protocol not in (
            "CAT ASCII",
            "Icom CI-V",
            "OpenGD77 USB CPS",
        ):
            raise ValueError("El modelo no tiene un perfil CAT serie implementado.")
        self.config = config
        if settings is not None:
            if config.model not in ("IC-7300", "FTX-1", *yaesu.YaesuModel):
                raise ValueError("Radio settings require a documented model-specific profile.")
            if config.model == "IC-7300" and (
                settings.frequency_adjustment_enabled or settings.mode_adjustment_enabled
            ):
                raise ValueError("Frequency/mode adjustments are not implemented for IC-7300.")
            if config.model == "FTX-1" and (
                settings.tuner_switching_enabled or not 5 <= settings.power_level_max <= 100
            ):
                raise ValueError("FTX-1 requires a 5..100 W setpoint limit and no tuner switching.")
            if config.model in yaesu.YaesuModel:
                model = yaesu.YaesuModel(config.model)
                if settings.tuner_switching_enabled or not (
                    5 <= settings.power_level_max <= yaesu.power_limit(model)
                ):
                    raise ValueError(
                        "Yaesu requires a model-specific watts limit and no tuner switching."
                    )
        self.settings = settings
        self._menu: menu_settings.MenuSettingsService | None = None
        self._menu_connection: SerialPort | None = None
        self._setting_requests: deque[str] = deque(maxlen=256)
        self.queries = {
            command: query
            for command, query in profile.queries.items()
            if query.decoder is not None
        }
        self.protocol = profile.protocol
        self._port: SerialPort | None = None
        self._lock = threading.Lock()

    def catalog(self) -> dict[str, object]:
        return {
            "api_version": "v1",
            "model": self.config.model,
            "status": "experimental",
            "hardware_validation_complete": False,
            "data_is_simulated": False,
            "queries": list(self.queries),
            "tx_control_enabled": False,
            **(
                {
                    "protocol": self.protocol,
                    "radio_control_available": False,
                    "notice": (
                        "OpenGD77 USB CPS identification only; no tuning, mode, channel or PTT."
                    ),
                }
                if self.protocol == "OpenGD77 USB CPS"
                else {}
            ),
        }

    def _open(self) -> SerialPort:
        connection = serial.Serial(
            port=None,
            baudrate=self.config.baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=self.config.stopbits,
            timeout=0.05,
            write_timeout=min(0.5, self.config.timeout),
            xonxoff=False,
            rtscts=False,
            dsrdtr=False,
            exclusive=True,
        )
        self._port = connection
        connection.rts = False
        connection.dtr = False
        connection.port = self.config.port
        connection.open()
        return connection

    def close(self) -> None:
        with self._lock:
            self._close()

    def reserve_transmitter(self) -> "Ftx1TransmitChannel":
        if self.config.model != "FTX-1":
            raise ValueError("CAT PTT is implemented only for FTX-1.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        return Ftx1TransmitChannel(self)

    def _close(self) -> None:
        connection, self._port = self._port, None
        if connection is not None:
            try:
                connection.close()
            except OSError as error:
                LOGGER.warning("CAT close failed (%s)", type(error).__name__)
                raise CatError("cat_close_failed") from error

    def read(self, command: str) -> dict[str, object]:
        query = self.queries.get(command)
        if query is None:
            raise ValueError("La consulta no tiene decoder en la allowlist del modelo.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        try:
            try:
                connection = self._port if self._port is not None else self._open()
                frame = self._exchange(connection, query)
            except (OSError, TimeoutError) as error:
                LOGGER.warning("CAT I/O failed (%s)", type(error).__name__)
                self._close()
                raise CatError("cat_io_failed") from error
            except CatError:
                self._close()
                raise
            try:
                if query.decoder is None:
                    raise ValueError("No decoder")
                decoded = query.decoder(frame)
            except ValueError as error:
                self._close()
                raise CatError("cat_invalid_response") from error
            return {
                **self.catalog(),
                "command": command,
                "observed_at": time.time(),
                query.result_name: decoded,
                **({"reply_hex": frame.hex()} if self.protocol != "OpenGD77 USB CPS" else {}),
            }
        finally:
            self._lock.release()

    def settings_catalog(self) -> dict[str, object]:
        if self.settings is None:
            raise CatError("cat_settings_not_configured")
        metadata: dict[str, object] = {
            "api_version": "v1",
            "model": self.config.model,
            "status": "experimental",
            "hardware_validation_complete": False,
            "data_is_simulated": False,
            **self.settings.metadata(model=self.config.model),
            **(
                {
                    "mode_options": [
                        {"code": mode.value, "label": mode.name.replace("_", "-")}
                        for mode in ftx1.Ftx1Mode
                    ]
                }
                if self.config.model == "FTX-1"
                else {}
            ),
        }

        if self.config.model in yaesu.YaesuModel:
            model = yaesu.YaesuModel(self.config.model)
            minimum, maximum = yaesu.frequency_limits(model)
            main_sub = model in (yaesu.YaesuModel.FTDX101D, yaesu.YaesuModel.FTDX101MP)
            metadata.update(
                {
                    "mode_options": yaesu.mode_options(model),
                    "frequency_min_hz": minimum,
                    "frequency_max_hz": maximum,
                    "receiver_options": [
                        {
                            "receiver": "MAIN",
                            "label": "MAIN" if main_sub else "VFO-A",
                            "mode_supported": True,
                        },
                        {
                            "receiver": "SUB",
                            "label": "SUB" if main_sub else "VFO-B",
                            "mode_supported": yaesu.YaesuReadCommand.SUB_MODE
                            in yaesu.read_commands(model),
                        },
                    ],
                }
            )
        return metadata

    def operate_settings(self, payload: object) -> dict[str, object]:
        metadata = self.settings_catalog()
        assert self.settings is not None
        if self.config.model == "FTX-1":
            return self._operate_ftx1_settings(payload, metadata)
        if self.config.model in yaesu.YaesuModel:
            return self._operate_yaesu_settings(payload, metadata)
        if not isinstance(payload, dict):
            raise ValueError("Settings operation must be an object.")
        operation = payload.get("operation")
        if operation == "read":
            if set(payload) != {"operation"}:
                raise ValueError("Unexpected read fields.")
            request = None
            setting = None
            target = None
        elif operation in ("set_power", "set_tuner"):
            field = "power_level" if operation == "set_power" else "enabled"
            if set(payload) != {"operation", "request_id", field}:
                raise ValueError("Unexpected setting fields.")
            identifier = settings_request_identifier(payload["request_id"])
            if operation == "set_power":
                target = payload[field]
                request = icom.build_ic7300_power_set(target)
                setting = icom.Ic7300Setting.POWER
                if target > self.settings.power_level_max:
                    raise ValueError("Power exceeds the locally configured CAT level limit.")
                if not self.settings.power_adjustment_enabled:
                    raise CatError("cat_power_adjustment_disabled")
            else:
                request = icom.build_ic7300_tuner_set(payload[field])
                target = int(payload[field])
                setting = icom.Ic7300Setting.TUNER
                if not self.settings.tuner_switching_enabled:
                    raise CatError("cat_tuner_switching_disabled")
        else:
            raise ValueError("Unknown settings operation; tuning and PTT are not available.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        try:
            if request is not None:
                if identifier in self._setting_requests:
                    raise CatError("cat_setting_request_repeated")
                self._setting_requests.append(identifier)
            deadline = time.monotonic() + 3
            try:
                connection = self._port if self._port is not None else self._open()

                def read(setting: icom.Ic7300Setting) -> int:
                    frame = self._exchange(
                        connection,
                        ReadQuery(icom.build_ic7300_setting_query(setting)),
                        deadline=deadline,
                    )
                    return icom.parse_ic7300_setting(setting, frame)

                tx = read(icom.Ic7300Setting.TX)
                tuner = read(icom.Ic7300Setting.TUNER)
                if request is not None:
                    if tx != 0 or tuner == 2:
                        raise CatError("cat_settings_require_rx")
                    if setting is icom.Ic7300Setting.TUNER and target == 1:
                        if read(icom.Ic7300Setting.PTT_TUNE) != 0:
                            raise CatError("cat_disable_ptt_tune_locally")
                    frame = self._exchange(connection, ReadQuery(request), deadline=deadline)
                    if not icom.parse_ic7300_setting_ack(frame):
                        raise CatError("cat_setting_rejected")
                power = read(icom.Ic7300Setting.POWER)
                tuner = read(icom.Ic7300Setting.TUNER)
                tx = read(icom.Ic7300Setting.TX)
                actual = power if setting is icom.Ic7300Setting.POWER else tuner
                if request is not None and actual != target:
                    raise CatError("cat_setting_readback_mismatch")
            except (OSError, ValueError, CatError) as error:
                self._close()
                LOGGER.warning("Radio settings transaction failed (%s)", type(error).__name__)
                if request is not None and isinstance(error, OSError | ValueError):
                    raise CatError("cat_setting_unconfirmed") from error
                if isinstance(error, CatError):
                    raise
                raise CatError("cat_invalid_response") from error
            LOGGER.info("Radio settings operation=%s verified", operation)
            return {
                **metadata,
                "power_level": power,
                "tuner_state": tuner,
                "tx_active": bool(tx),
                "observed_at": time.time(),
            }
        finally:
            self._lock.release()

    def _menu_service(self) -> menu_settings.MenuSettingsService:
        if self._menu is None:
            assert self.settings is not None
            self._menu = menu_settings.MenuSettingsService(
                menu_settings.ftx1_settings(),
                exchange=self._menu_exchange,
                is_transmitting=self._menu_is_transmitting,
                write_enabled=self.settings.menu_write_enabled,
                log=LOGGER.info,
            )
        return self._menu

    def _menu_exchange(self, command: str, expect_reply: bool) -> str | None:
        connection = self._menu_connection
        assert connection is not None
        deadline = time.monotonic() + 3
        request = f"{command};".encode("ascii")
        if expect_reply:
            return self._exchange(connection, ReadQuery(request), deadline=deadline).decode(
                "ascii", errors="replace"
            )
        connection.reset_input_buffer()
        self._write_request(connection, request, deadline)
        return None

    def _menu_is_transmitting(self) -> bool | None:
        try:
            reply = self._menu_exchange(ftx1.Ftx1ReadCommand.TX_STATE.value, True)
            return ftx1.parse_tx_reply((reply or "").encode("ascii")) is not ftx1.Ftx1TxState.RX
        except (CatError, OSError, ValueError):
            return None

    def _operate_menu(self, payload: dict, metadata: dict[str, object]) -> dict[str, object]:
        operation = payload.get("operation")
        try:
            service = self._menu_service()
        except menu_settings.MenuSettingsError as error:
            raise CatError(str(error)) from error
        if operation == "menu_list":
            if set(payload) != {"operation"}:
                raise ValueError("Unexpected menu list fields.")
            return {**metadata, "menu": service.listing(), "audit": service.audit()[-20:]}
        if operation == "menu_read" and set(payload) == {"operation", "id"}:
            args: tuple = (payload["id"],)
        elif operation == "menu_write" and set(payload) == {"operation", "id", "value", "request_id"}:
            args = (payload["id"], payload["value"])
            identifier = settings_request_identifier(payload["request_id"])
        else:
            raise ValueError("Unknown menu operation.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        try:
            if operation == "menu_write":
                if identifier in self._setting_requests:
                    raise CatError("cat_setting_request_repeated")
                self._setting_requests.append(identifier)
            try:
                self._menu_connection = self._port if self._port is not None else self._open()
                if operation == "menu_read":
                    return {**metadata, **service.read(*args)}
                return {**metadata, **service.write(*args)}
            except menu_settings.MenuSettingsError as error:
                if str(error) == "cat_menu_unknown_setting":
                    raise ValueError("Unknown menu setting.") from error
                raise CatError(str(error)) from error
            except (OSError, CatError) as error:
                self._close()
                if isinstance(error, CatError):
                    raise
                raise CatError("cat_invalid_response") from error
        finally:
            self._menu_connection = None
            self._lock.release()

    def _operate_ftx1_settings(
        self, payload: object, metadata: dict[str, object]
    ) -> dict[str, object]:
        assert self.settings is not None
        if not isinstance(payload, dict):
            raise ValueError("FTX-1 settings operation must be an object.")
        operation = payload.get("operation")
        if isinstance(operation, str) and operation.startswith("menu_"):
            return self._operate_menu(payload, metadata)
        identifier = None
        target = None
        request = None
        receiver = None
        if operation in ("read", "read_operating") and set(payload) == {"operation"}:
            pass
        elif operation == "set_power" and set(payload) == {
            "operation",
            "request_id",
            "power_level",
        }:
            identifier = settings_request_identifier(payload["request_id"])
            target = payload["power_level"]
            ftx1.build_power_set("SPA-1", target)
            if target > self.settings.power_level_max:
                raise ValueError("Power exceeds the locally configured watts setpoint limit.")
            if not self.settings.power_adjustment_enabled:
                raise CatError("cat_power_adjustment_disabled")
        elif operation in ("set_frequency", "set_mode"):
            field = "frequency_hz" if operation == "set_frequency" else "mode_code"
            if set(payload) != {"operation", "request_id", "receiver", field}:
                raise ValueError("Unexpected FTX-1 operating control fields.")
            identifier = settings_request_identifier(payload["request_id"])
            receiver = payload["receiver"]
            if not isinstance(receiver, str) or receiver not in ("MAIN", "SUB"):
                raise ValueError("Select MAIN or SUB explicitly, not an inferred active VFO.")
            if operation == "set_frequency":
                target = payload[field]
                command = (
                    ftx1.Ftx1ReadCommand.VFO_A_FREQUENCY
                    if receiver == "MAIN"
                    else ftx1.Ftx1ReadCommand.VFO_B_FREQUENCY
                )
                request = ftx1.build_frequency_set(command, target)
                if not self.settings.frequency_adjustment_enabled:
                    raise CatError("cat_frequency_adjustment_disabled")
            else:
                if not isinstance(payload[field], str):
                    raise ValueError("A documented FTX-1 mode code is required.")
                target = ftx1.Ftx1Mode(payload[field])
                command = (
                    ftx1.Ftx1ReadCommand.MODE
                    if receiver == "MAIN"
                    else ftx1.Ftx1ReadCommand.SUB_MODE
                )
                request = ftx1.build_mode_set(command, target)
                if not self.settings.mode_adjustment_enabled:
                    raise CatError("cat_mode_adjustment_disabled")
        else:
            raise ValueError("Unknown FTX-1 setting; no tuner, PTT or tuning is available.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        try:
            if identifier is not None:
                if identifier in self._setting_requests:
                    raise CatError("cat_setting_request_repeated")
                self._setting_requests.append(identifier)
            deadline = time.monotonic() + 3
            try:
                connection = self._port if self._port is not None else self._open()

                def read(command: ftx1.Ftx1ReadCommand) -> bytes:
                    return self._exchange(
                        connection, ReadQuery(ftx1.build_query(command)), deadline=deadline
                    )

                if target is not None:
                    ftx1.parse_identification_reply(read(ftx1.Ftx1ReadCommand.IDENTIFICATION))
                tx = ftx1.parse_tx_reply(read(ftx1.Ftx1ReadCommand.TX_STATE))
                tuner = ftx1.parse_tuner_reply(read(ftx1.Ftx1ReadCommand.TUNER))
                power = (
                    ftx1.parse_power_reply(read(ftx1.Ftx1ReadCommand.POWER))
                    if operation in ("read", "set_power")
                    else None
                )
                busy = tuner.tuning_requested
                if target is not None:
                    if tx is not ftx1.Ftx1TxState.RX or busy:
                        raise CatError("cat_settings_require_rx")
                    if power is not None:
                        if power.head == "field" and target > 10:
                            raise CatError("cat_power_head_limit_exceeded")
                        request = ftx1.build_power_set(power.head, target)
                    assert request is not None
                    connection.reset_input_buffer()
                    self._write_request(connection, request, deadline)
                    # A different reply prefix fences delayed setter echo before readback.
                    ftx1.parse_identification_reply(read(ftx1.Ftx1ReadCommand.IDENTIFICATION))
                    ftx1.parse_tx_reply(read(ftx1.Ftx1ReadCommand.TX_STATE))
                    if power is not None:
                        observed = ftx1.parse_power_reply(read(ftx1.Ftx1ReadCommand.POWER))
                        if observed.head != power.head or observed.watts != target:
                            raise CatError("cat_setting_readback_mismatch")
                        power = observed
                receivers: dict[str, dict[str, int | str]] = {}
                if power is None:
                    for side, frequency_command, mode_command in (
                        ("MAIN", ftx1.Ftx1ReadCommand.VFO_A_FREQUENCY, ftx1.Ftx1ReadCommand.MODE),
                        (
                            "SUB",
                            ftx1.Ftx1ReadCommand.VFO_B_FREQUENCY,
                            ftx1.Ftx1ReadCommand.SUB_MODE,
                        ),
                    ):
                        receivers[side] = {
                            "frequency_hz": ftx1.parse_frequency_reply(
                                frequency_command, read(frequency_command)
                            ),
                            "mode_code": ftx1.parse_mode_reply(
                                mode_command, read(mode_command)
                            ).value,
                        }
                    if receiver is not None:
                        field = "frequency_hz" if operation == "set_frequency" else "mode_code"
                        if receivers[receiver][field] != target:
                            raise CatError("cat_setting_readback_mismatch")
                if target is not None or power is None:
                    tx = ftx1.parse_tx_reply(read(ftx1.Ftx1ReadCommand.TX_STATE))
                    tuner = ftx1.parse_tuner_reply(read(ftx1.Ftx1ReadCommand.TUNER))
                    busy = tuner.tuning_requested
            except (OSError, ValueError, CatError) as error:
                self._close()
                LOGGER.warning("FTX-1 settings transaction failed (%s)", type(error).__name__)
                if isinstance(error, CatError):
                    raise
                raise CatError(
                    "cat_setting_unconfirmed" if target is not None else "cat_invalid_response"
                ) from error
            LOGGER.info("FTX-1 settings operation=%s verified", operation)
            return {
                **metadata,
                **(
                    {"power_level": power.watts, "power_head": power.head}
                    if power is not None
                    else {"receivers": receivers}
                ),
                "tuner_busy": busy,
                "tx_active": tx is not ftx1.Ftx1TxState.RX,
                "observed_at": time.time(),
            }
        finally:
            self._lock.release()

    def _operate_yaesu_settings(
        self, payload: object, metadata: dict[str, object]
    ) -> dict[str, object]:
        assert self.settings is not None
        model = yaesu.YaesuModel(self.config.model)
        if not isinstance(payload, dict):
            raise ValueError("Settings operation must be an object.")
        operation = payload.get("operation")
        identifier = None
        request = None
        command = None
        target = None
        receiver = None
        if operation in ("read", "read_operating"):
            if set(payload) != {"operation"}:
                raise ValueError("Unexpected read fields.")
        elif operation == "set_power":
            if set(payload) != {"operation", "request_id", "power_level"}:
                raise ValueError("Unexpected power fields.")
            identifier = settings_request_identifier(payload["request_id"])
            target = payload["power_level"]
            request = yaesu.build_power_set(model, target)
            command = yaesu.YaesuReadCommand.POWER
            if target > self.settings.power_level_max:
                raise ValueError("Power exceeds the local watts limit.")
            if not self.settings.power_adjustment_enabled:
                raise CatError("cat_power_adjustment_disabled")
        elif operation in ("set_frequency", "set_mode"):
            field = "frequency_hz" if operation == "set_frequency" else "mode_code"
            if set(payload) != {"operation", "request_id", "receiver", field}:
                raise ValueError("Unexpected operating control fields.")
            identifier = settings_request_identifier(payload["request_id"])
            receiver = payload["receiver"]
            if receiver not in ("MAIN", "SUB"):
                raise ValueError("Select an explicit receiver.")
            target = payload[field]
            if operation == "set_frequency":
                command = (
                    yaesu.YaesuReadCommand.FREQUENCY_A
                    if receiver == "MAIN"
                    else yaesu.YaesuReadCommand.FREQUENCY_B
                )
                request = yaesu.build_frequency_set(model, command, target)
                if not self.settings.frequency_adjustment_enabled:
                    raise CatError("cat_frequency_adjustment_disabled")
            else:
                command = (
                    yaesu.YaesuReadCommand.MAIN_MODE
                    if receiver == "MAIN"
                    else yaesu.YaesuReadCommand.SUB_MODE
                )
                request = yaesu.build_mode_set(model, command, target)
                if not self.settings.mode_adjustment_enabled:
                    raise CatError("cat_mode_adjustment_disabled")
        else:
            raise ValueError("Unknown Yaesu setting; no PTT, tuner switching or keying.")
        if not self._lock.acquire(blocking=False):
            raise CatError("cat_busy")
        try:
            if identifier is not None:
                if identifier in self._setting_requests:
                    raise CatError("cat_setting_request_repeated")
                self._setting_requests.append(identifier)
            deadline = time.monotonic() + 3
            setting_sent = False
            try:
                connection = self._port if self._port is not None else self._open()

                def read(query_command: yaesu.YaesuReadCommand) -> bytes:
                    return self._exchange(
                        connection,
                        ReadQuery(yaesu.build_query(model, query_command)),
                        deadline=deadline,
                    )

                def status() -> tuple[bool, bool]:
                    tx = yaesu.parse_parameter_reply(
                        model,
                        yaesu.YaesuReadCommand.TX_STATE,
                        read(yaesu.YaesuReadCommand.TX_STATE),
                    )
                    return tx != 0, yaesu.parse_tuner_busy_reply(
                        model, read(yaesu.YaesuReadCommand.TUNER)
                    )

                yaesu.parse_identification_reply(model, read(yaesu.YaesuReadCommand.IDENTIFICATION))
                tx_active, tuner_busy = status()
                if request is not None:
                    if tx_active or tuner_busy:
                        raise CatError("cat_settings_require_rx")
                    connection.reset_input_buffer()
                    setting_sent = True
                    self._write_request(connection, request, deadline)
                    yaesu.parse_identification_reply(
                        model, read(yaesu.YaesuReadCommand.IDENTIFICATION)
                    )
                power = yaesu.parse_parameter_reply(
                    model, yaesu.YaesuReadCommand.POWER, read(yaesu.YaesuReadCommand.POWER)
                )
                receivers: dict[str, dict[str, int | str | None]] = {}
                if operation not in ("read", "set_power"):
                    for side, frequency_command, mode_command in (
                        (
                            "MAIN",
                            yaesu.YaesuReadCommand.FREQUENCY_A,
                            yaesu.YaesuReadCommand.MAIN_MODE,
                        ),
                        (
                            "SUB",
                            yaesu.YaesuReadCommand.FREQUENCY_B,
                            yaesu.YaesuReadCommand.SUB_MODE,
                        ),
                    ):
                        mode_code = None
                        if mode_command in yaesu.read_commands(model):
                            mode_frame = read(mode_command)
                            yaesu.parse_mode_reply(model, mode_command, mode_frame)
                            mode_code = mode_frame[len(mode_command.value) : -1].decode("ascii")
                        frequency_hz = yaesu.parse_frequency_reply(
                            model, frequency_command, read(frequency_command)
                        )
                        minimum, maximum = yaesu.frequency_limits(model)
                        if not minimum <= frequency_hz <= maximum:
                            raise ValueError(
                                "Operating frequency is outside the model's CAT range."
                            )
                        receivers[side] = {
                            "frequency_hz": frequency_hz,
                            "mode_code": mode_code,
                        }
                if request is not None:
                    observed = power if operation == "set_power" else receivers[receiver][field]
                    if observed != target:
                        raise CatError("cat_setting_readback_mismatch")
                    tx_active, tuner_busy = status()
                    if tx_active or tuner_busy:
                        raise CatError("cat_settings_require_rx")
            except (OSError, ValueError, CatError) as error:
                self._close()
                LOGGER.warning("Yaesu settings transaction failed (%s)", type(error).__name__)
                if isinstance(error, CatError):
                    raise
                raise CatError(
                    "cat_setting_unconfirmed" if setting_sent else "cat_invalid_response"
                ) from error
            LOGGER.info("Yaesu settings model=%s operation=%s verified", model.value, operation)
            return {
                **metadata,
                "power_level": power,
                "tx_active": tx_active,
                "tuner_busy": tuner_busy,
                "observed_at": time.time(),
                **({"receivers": receivers} if receivers else {}),
            }
        finally:
            self._lock.release()

    def _write_request(self, connection: SerialPort, request: bytes, deadline: float) -> None:
        if time.monotonic() >= deadline:
            raise CatError("cat_timeout")
        if connection.write(request) != len(request):
            raise CatError("cat_short_write")
        if time.monotonic() >= deadline:
            raise CatError("cat_timeout")

    def _exchange(
        self, connection: SerialPort, query: ReadQuery, *, deadline: float | None = None
    ) -> bytes:
        connection.reset_input_buffer()
        deadline = min(
            deadline if deadline is not None else float("inf"),
            time.monotonic() + self.config.timeout,
        )
        self._write_request(connection, query.request, deadline)
        if self.protocol == "OpenGD77 USB CPS":
            frame = bytearray()
            while time.monotonic() < deadline:
                chunk = connection.read(1)
                if not chunk:
                    continue
                frame.extend(chunk)
                if len(frame) == 1 and frame != b"R":
                    raise CatError(
                        "cat_request_rejected" if frame == b"-" else "cat_invalid_response"
                    )
                if len(frame) == 3 and frame != b"R\x00\x2e":
                    raise CatError("cat_invalid_response")
                if len(frame) == opengd77.RADIO_INFO_SIZE + 3:
                    return bytes(frame)
            raise CatError("cat_timeout")
        terminator = b"\xfd" if self.protocol == "Icom CI-V" else b";"
        frame = bytearray()
        echoes = 0
        while time.monotonic() < deadline:
            chunk = connection.read(1)
            if not chunk:
                continue
            frame.extend(chunk)
            if len(frame) > 256:
                raise CatError("cat_frame_too_large")
            if chunk == terminator:
                if frame == query.request:
                    echoes += 1
                    if echoes > 4:
                        raise CatError("cat_excessive_echo")
                    frame.clear()
                    continue
                return bytes(frame)
        raise CatError("cat_timeout")


class Ftx1TransmitChannel:
    """Exclusive CAT reservation, retained until RX is confirmed or shutdown."""

    def __init__(self, owner: SerialCat) -> None:
        self._owner = owner
        self._released = False

    def _connection(self) -> SerialPort:
        if self._released:
            raise CatError("cat_transmitter_channel_closed")
        return self._owner._port if self._owner._port is not None else self._owner._open()

    def read(self, command: ftx1.Ftx1ReadCommand, deadline: float) -> bytes:
        try:
            return self._owner._exchange(
                self._connection(), ReadQuery(ftx1.build_query(command)), deadline=deadline
            )
        except (OSError, CatError) as error:
            self._owner._close()
            raise CatError("cat_transmitter_read_failed") from error

    def set_tx(self, enabled: bool, deadline: float) -> None:
        try:
            connection = self._connection()
            connection.reset_input_buffer()
            self._owner._write_request(connection, ftx1.build_tx_set(enabled), deadline)
            # TX setter echoes resemble replies; fence with a different documented prefix.
            ftx1.parse_identification_reply(
                self.read(ftx1.Ftx1ReadCommand.IDENTIFICATION, deadline)
            )
            expected = ftx1.Ftx1TxState.CAT_TX if enabled else ftx1.Ftx1TxState.RX
            if ftx1.parse_tx_reply(self.read(ftx1.Ftx1ReadCommand.TX_STATE, deadline)) != expected:
                raise CatError("cat_transmitter_state_unconfirmed")
        except (OSError, ValueError, CatError) as error:
            self._owner._close()
            raise CatError("cat_transmitter_state_unconfirmed") from error

    def release(self) -> None:
        if not self._released:
            self._released = True
            try:
                self._owner._close()
            finally:
                self._owner._lock.release()
