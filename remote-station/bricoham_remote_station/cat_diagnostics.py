import argparse
import json
from collections.abc import Callable
from dataclasses import asdict, dataclass, is_dataclass
from functools import partial
from typing import Literal

from bricoham_remote_station.contracts import API_VERSION
from bricoham_remote_station.drivers import (
    elecraft_k3s_cat as k3s,
)
from bricoham_remote_station.drivers import (
    elecraft_k4_cat as k4,
)
from bricoham_remote_station.drivers import (
    ftx1_cat as ftx1,
)
from bricoham_remote_station.drivers import hermes_lite_protocol as hermes
from bricoham_remote_station.drivers import icom_civ as icom
from bricoham_remote_station.drivers import (
    kenwood_cat as kenwood,
)
from bricoham_remote_station.drivers import (
    qmx_cat as qmx,
)
from bricoham_remote_station.drivers import smartsdr_protocol as smartsdr
from bricoham_remote_station.drivers import (
    trusdx_cat as trusdx,
)
from bricoham_remote_station.drivers import yaesu_cat as yaesu
from bricoham_remote_station.radio_candidates import radio_candidates


@dataclass(frozen=True)
class ReadQuery:
    request: bytes
    decoder: Callable[[bytes], object] | None = None
    result_name: str = "decoded"


@dataclass(frozen=True)
class ReadProfile:
    protocol: str
    queries: dict[str, ReadQuery]
    binding_status: Literal["model_profile", "family_syntax_only"] = "model_profile"


def _decode_smartsdr(frame: bytes) -> smartsdr.SmartSdrResponse:
    response = smartsdr.parse_response(frame, expected_sequence=1)
    if not response.succeeded:
        raise ValueError(f"Error SmartSDR 0x{response.error_code:08X}: {response.message}")
    return response


def read_profiles() -> dict[str, ReadProfile]:
    profiles: dict[str, ReadProfile] = {}
    ftx_queries = {
        command.value: ReadQuery(ftx1.build_query(command)) for command in ftx1.Ftx1ReadCommand
    }
    for command in (ftx1.Ftx1ReadCommand.VFO_A_FREQUENCY, ftx1.Ftx1ReadCommand.VFO_B_FREQUENCY):
        ftx_queries[command.value] = ReadQuery(
            ftx1.build_query(command),
            partial(ftx1.parse_frequency_reply, command),
            "frequency_hz",
        )
    ftx_queries["ID"] = ReadQuery(b"ID;", ftx1.parse_identification_reply, "identification")
    for command in (ftx1.Ftx1ReadCommand.MODE, ftx1.Ftx1ReadCommand.SUB_MODE):
        ftx_queries[command.value] = ReadQuery(
            ftx1.build_query(command), partial(ftx1.parse_mode_reply, command), "mode_code"
        )
    ftx_queries["PC"] = ReadQuery(b"PC;", ftx1.parse_power_reply, "power_control")
    ftx_queries["AC"] = ReadQuery(b"AC;", ftx1.parse_tuner_reply, "tuner")
    ftx_queries["TX"] = ReadQuery(b"TX;", ftx1.parse_tx_reply, "tx_state")
    ftx_queries["FT"] = ReadQuery(b"FT;", ftx1.parse_transmitter_reply, "transmitter")
    ftx_queries["ST"] = ReadQuery(b"ST;", ftx1.parse_split_reply, "split_enabled")
    ftx_queries["IF"] = ReadQuery(b"IF;", ftx1.parse_main_information, "main_information")
    ftx_queries["VX"] = ReadQuery(b"VX;", ftx1.parse_vox_reply, "vox_enabled")
    ftx_queries["KS"] = ReadQuery(b"KS;", ftx1.parse_keyer_speed_reply, "cw_keyer_speed_wpm")
    ftx_queries["KP"] = ReadQuery(b"KP;", ftx1.parse_key_pitch_reply, "cw_pitch_hz")
    ftx_queries["KR"] = ReadQuery(b"KR;", ftx1.parse_keyer_reply, "cw_keyer_enabled")
    ftx_queries["BI"] = ReadQuery(b"BI;", ftx1.parse_break_in_reply, "cw_break_in_enabled")
    profiles["FTX-1"] = ReadProfile("CAT ASCII", ftx_queries)

    tru_queries = {
        command.value: ReadQuery(trusdx.build_query(command))
        for command in trusdx.TruSdxReadCommand
    }
    tru_queries["FA"] = ReadQuery(b"FA;", trusdx.parse_frequency_reply, "frequency_hz")
    tru_queries["MD"] = ReadQuery(b"MD;", trusdx.parse_mode_reply, "mode_code")
    tru_queries["ID"] = ReadQuery(b"ID;", trusdx.parse_identification_reply, "identification")
    profiles["(tr)uSDX"] = ReadProfile("CAT ASCII", tru_queries)

    qmx_queries = {
        command.value: ReadQuery(qmx.build_query(command)) for command in qmx.QmxReadCommand
    }
    for command in (qmx.QmxReadCommand.VFO_A_FREQUENCY, qmx.QmxReadCommand.VFO_B_FREQUENCY):
        qmx_queries[command.value] = ReadQuery(
            qmx.build_query(command), partial(qmx.parse_frequency_reply, command), "frequency_hz"
        )
    qmx_queries["MD"] = ReadQuery(b"MD;", qmx.parse_mode_reply, "mode_code")
    profiles["QMX+"] = ReadProfile("CAT ASCII", qmx_queries)

    k4_queries = {
        command.value: ReadQuery(k4.build_query(command)) for command in k4.ElecraftK4ReadCommand
    }
    for command in (
        k4.ElecraftK4ReadCommand.VFO_A_FREQUENCY,
        k4.ElecraftK4ReadCommand.VFO_B_FREQUENCY,
    ):
        k4_queries[command.value] = ReadQuery(
            k4.build_query(command), partial(k4.parse_frequency_reply, command), "frequency_hz"
        )
    for command in (k4.ElecraftK4ReadCommand.VFO_A_MODE, k4.ElecraftK4ReadCommand.VFO_B_MODE):
        k4_queries[command.value] = ReadQuery(
            k4.build_query(command), partial(k4.parse_mode_reply, command), "mode_code"
        )
    profiles["K4"] = ReadProfile("CAT ASCII", k4_queries)

    k3s_queries = {
        command.value: ReadQuery(k3s.build_query(command)) for command in k3s.ElecraftK3SReadCommand
    }
    for command in (
        k3s.ElecraftK3SReadCommand.VFO_A_FREQUENCY,
        k3s.ElecraftK3SReadCommand.VFO_B_FREQUENCY,
    ):
        k3s_queries[command.value] = ReadQuery(
            k3s.build_query(command), partial(k3s.parse_frequency_reply, command), "frequency_hz"
        )
    for command in (k3s.ElecraftK3SReadCommand.VFO_A_MODE, k3s.ElecraftK3SReadCommand.VFO_B_MODE):
        k3s_queries[command.value] = ReadQuery(
            k3s.build_query(command), partial(k3s.parse_mode_reply, command), "mode_code"
        )
    for command in (
        k3s.ElecraftK3SReadCommand.VFO_A_BANDWIDTH,
        k3s.ElecraftK3SReadCommand.VFO_B_BANDWIDTH,
    ):
        k3s_queries[command.value] = ReadQuery(
            k3s.build_query(command), partial(k3s.parse_bandwidth_reply, command), "bandwidth_hz"
        )
    k3s_queries["ID"] = ReadQuery(b"ID;", k3s.parse_legacy_identification_reply, "legacy_id")
    k3s_queries["OM"] = ReadQuery(b"OM;", k3s.parse_option_modules_reply, "option_modules")
    profiles["K3S"] = ReadProfile("CAT ASCII", k3s_queries)
    for model in k3s.ElecraftLegacyModel:
        queries = {
            command.value: k3s_queries[command.value] for command in k3s.legacy_read_commands(model)
        }
        for command in (
            k3s.ElecraftK3SReadCommand.VFO_A_MODE,
            k3s.ElecraftK3SReadCommand.VFO_B_MODE,
        ):
            queries[command.value] = ReadQuery(
                k3s.build_query(command),
                partial(k3s.parse_legacy_mode_reply, model, command),
                "mode_code",
            )
        profiles[model.value] = ReadProfile("CAT ASCII", queries)

    for model in kenwood.KenwoodModel:
        queries = {
            command.value: ReadQuery(
                kenwood.build_query(command),
                partial(kenwood.parse_frequency_reply, command),
                "frequency_hz",
            )
            for command in kenwood.KenwoodReadCommand
        }
        for command in kenwood.mode_commands(model):
            queries[command.value] = ReadQuery(
                kenwood.build_mode_query(model, command),
                partial(kenwood.parse_mode_reply, model, command),
                "raw_mode_reading",
            )
        profiles[model.value] = ReadProfile("CAT ASCII", queries)
    for model in icom.IcomCivModel:
        catalog_model = (
            "IC-R8600 (receiver)" if model is icom.IcomCivModel.IC_R8600 else model.value
        )
        profiles[catalog_model] = ReadProfile(
            "Icom CI-V",
            {
                "03": ReadQuery(
                    icom.build_query(model, icom.IcomReadCommand.FREQUENCY),
                    partial(icom.parse_frequency_reply, model),
                    "frequency_hz",
                ),
                "04": ReadQuery(
                    icom.build_query(model, icom.IcomReadCommand.MODE),
                    partial(icom.parse_mode_reply, model),
                    "mode_code",
                ),
            },
        )
    for model in yaesu.YaesuModel:
        queries = {}
        for command in yaesu.read_commands(model):
            if command in (
                yaesu.YaesuReadCommand.FREQUENCY_A,
                yaesu.YaesuReadCommand.FREQUENCY_B,
            ):
                decoder = partial(yaesu.parse_frequency_reply, model, command)
                result_name = "frequency_hz"
            elif command is yaesu.YaesuReadCommand.IDENTIFICATION:
                decoder = partial(yaesu.parse_identification_reply, model)
                result_name = "identification"
            else:
                decoder = partial(yaesu.parse_mode_reply, model, command)
                result_name = "band_mode_codes"
            queries[command.value] = ReadQuery(
                yaesu.build_query(model, command), decoder, result_name
            )
        profiles[model.value] = ReadProfile("CAT ASCII", queries)
    for candidate in radio_candidates():
        if candidate.manufacturer == "FlexRadio":
            profiles[candidate.model] = ReadProfile(
                "SmartSDR TCP syntax",
                {
                    "info": ReadQuery(
                        smartsdr.build_query(smartsdr.SmartSdrReadCommand.INFO, sequence=1),
                        _decode_smartsdr,
                        "response",
                    )
                },
                binding_status="family_syntax_only",
            )
        elif candidate.manufacturer == "Hermes Lite":
            profiles[candidate.model] = ReadProfile(
                "openHPSDR Protocol 1 discovery",
                {
                    "discovery": ReadQuery(
                        hermes.build_discovery_request(), hermes.parse_discovery_reply, "discovery"
                    )
                },
                binding_status="family_syntax_only",
            )
    return profiles


def diagnostic_catalog() -> dict[str, object]:
    profiles = read_profiles()
    return {
        "api_version": API_VERSION,
        "schema_version": "1.0",
        "transport_enabled": False,
        "hardware_validation_complete": False,
        "candidates": [
            {
                "manufacturer": candidate.manufacturer,
                "model": candidate.model,
                "hardware_status": "unsupported",
                "binding_status": (
                    profiles[candidate.model].binding_status
                    if candidate.model in profiles
                    else "unimplemented"
                ),
                "protocol": profiles[candidate.model].protocol
                if candidate.model in profiles
                else None,
                "queries": [
                    {
                        "command": command,
                        "reply_decoder": query.decoder is not None,
                    }
                    for command, query in profiles[candidate.model].queries.items()
                ]
                if candidate.model in profiles
                else [],
            }
            for candidate in radio_candidates()
        ],
    }


def inspect_query(model: str, command: str, frame: bytes | None = None) -> dict[str, object]:
    profiles = read_profiles()
    if model not in profiles:
        raise ValueError("No existe un perfil de protocolo implementado para ese modelo.")
    profile = profiles[model]
    if command not in profile.queries:
        raise ValueError("La consulta no pertenece a la allowlist del modelo.")
    query = profile.queries[command]
    result: dict[str, object] = {
        "schema_version": "1.0",
        "model": model,
        "protocol": profile.protocol,
        "command": command,
        "request_hex": query.request.hex(),
        "transport_enabled": False,
        "hardware_status": "unsupported",
        "binding_status": profile.binding_status,
        "reply_decoder": query.decoder is not None,
    }
    if frame is not None:
        if query.decoder is None:
            raise ValueError(
                "Esta consulta no tiene decoder offline; no se interpreta la respuesta."
            )
        result[query.result_name] = query.decoder(frame)
    return result


def protocol_json_value(value: object) -> object:
    if is_dataclass(value) and not isinstance(value, type):
        return asdict(value)
    if isinstance(value, bytes):
        return value.hex()
    raise TypeError(f"Tipo no serializable: {type(value).__name__}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Diagnóstico CAT offline: no conecta, no envía y no modifica radios."
    )
    subcommands = parser.add_subparsers(dest="action", required=True)
    subcommands.add_parser(
        "list", help="Listar candidatos y consultas implementadas, sin soporte físico."
    )
    query = subcommands.add_parser(
        "query", help="Generar una consulta o validar bytes de una respuesta."
    )
    query.add_argument("--model", required=True)
    query.add_argument("--command", required=True)
    query.add_argument("--reply-hex", help="Una sola trama completa en hexadecimal.")
    args = parser.parse_args(argv)
    try:
        result = (
            diagnostic_catalog()
            if args.action == "list"
            else inspect_query(
                args.model,
                args.command,
                bytes.fromhex(args.reply_hex) if args.reply_hex is not None else None,
            )
        )
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2, default=protocol_json_value))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
