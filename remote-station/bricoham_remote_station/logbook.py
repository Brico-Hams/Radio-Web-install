import argparse
import json
import re
import sqlite3
from contextlib import closing
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

MODES = ("CW", "SSB", "USB", "LSB", "AM", "FM", "RTTY", "FT8", "FT4")
_MAX_SQLITE_INTEGER = 2**63 - 1


@dataclass(frozen=True)
class Qso:
    call: str
    started_at: str
    frequency_hz: int
    mode: str


class ExportLimitError(ValueError):
    pass


def validate_qso(qso: Qso) -> Qso:
    if not isinstance(qso.call, str) or not 1 <= len(qso.call) <= 32:
        raise ValueError("El indicativo debe tener entre 1 y 32 caracteres.")
    if not isinstance(qso.mode, str) or not isinstance(qso.started_at, str):
        raise ValueError("El modo y la fecha/hora deben ser texto.")
    if len(qso.started_at) > 64:
        raise ValueError("La fecha/hora es demasiado larga.")
    call = qso.call.strip().upper()
    if not re.fullmatch(r"[A-Z0-9]+(?:/[A-Z0-9]+)*", call):
        raise ValueError("El indicativo debe contener letras ASCII, dígitos y barras internas.")
    mode = qso.mode.upper()
    if mode not in MODES:
        raise ValueError(f"Modo no soportado por este logbook: {mode}")
    if (
        isinstance(qso.frequency_hz, bool)
        or not isinstance(qso.frequency_hz, int)
        or not 0 < qso.frequency_hz <= _MAX_SQLITE_INTEGER
    ):
        raise ValueError("La frecuencia debe ser un entero positivo en Hz válido para SQLite.")
    timestamp = datetime.fromisoformat(qso.started_at)
    if timestamp.tzinfo is None:
        raise ValueError("La fecha/hora del QSO debe incluir zona horaria.")
    try:
        utc_timestamp = timestamp.astimezone(UTC).isoformat()
    except OverflowError as error:
        raise ValueError("La fecha/hora UTC queda fuera del rango admitido.") from error
    return Qso(call, utc_timestamp, qso.frequency_hz, mode)


def initialize_logbook(database: Path) -> None:
    with closing(sqlite3.connect(database)) as connection, connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS bricoham_qsos ("
            "id INTEGER PRIMARY KEY, call TEXT NOT NULL, started_at TEXT NOT NULL, "
            "frequency_hz INTEGER NOT NULL CHECK(frequency_hz > 0), mode TEXT NOT NULL)"
        )


def add_qso(database: Path, qso: Qso) -> int:
    qso = validate_qso(qso)
    initialize_logbook(database)
    with closing(sqlite3.connect(database)) as connection, connection:
        cursor = connection.execute(
            "INSERT INTO bricoham_qsos (call, started_at, frequency_hz, mode) VALUES (?, ?, ?, ?)",
            (qso.call, qso.started_at, qso.frequency_hz, qso.mode),
        )
        identifier = cursor.lastrowid
        if identifier is None:
            raise RuntimeError("SQLite no devolvió el identificador del QSO.")
    return identifier


def read_qsos(database: Path, *, limit: int | None = None, offset: int = 0) -> tuple[Qso, ...]:
    if limit is not None and (type(limit) is not int or limit < 1):
        raise ValueError("El límite debe ser un entero positivo.")
    if type(offset) is not int or offset < 0:
        raise ValueError("El desplazamiento debe ser un entero no negativo.")
    if not database.is_file():
        raise ValueError("La base de datos de logbook no existe.")
    with closing(sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)) as connection:
        rows = connection.execute(
            "SELECT call, started_at, frequency_hz, mode FROM bricoham_qsos "
            "ORDER BY started_at, id LIMIT ? OFFSET ?",
            (-1 if limit is None else limit, offset),
        ).fetchall()
    return tuple(validate_qso(Qso(*row)) for row in rows)


def _adif_field(name: str, value: str) -> str:
    return f"<{name}:{len(value)}>{value}"


def export_adif(database: Path, *, max_records: int | None = None) -> str:
    if max_records is not None and (type(max_records) is not int or max_records < 1):
        raise ValueError("El límite de exportación debe ser un entero positivo.")
    qsos = read_qsos(database, limit=None if max_records is None else max_records + 1)
    if max_records is not None and len(qsos) > max_records:
        raise ExportLimitError("Usa la CLI para exportar el logbook completo.")
    records = []
    for qso in qsos:
        timestamp = datetime.fromisoformat(qso.started_at)
        frequency = f"{qso.frequency_hz // 1_000_000}.{qso.frequency_hz % 1_000_000:06d}"
        frequency = frequency.rstrip("0").rstrip(".")
        mode = "SSB" if qso.mode in ("USB", "LSB") else "MFSK" if qso.mode == "FT4" else qso.mode
        fields = [
            _adif_field("CALL", qso.call),
            _adif_field("QSO_DATE", timestamp.strftime("%Y%m%d")),
            _adif_field("TIME_ON", timestamp.strftime("%H%M%S")),
            _adif_field("FREQ", frequency),
            _adif_field("MODE", mode),
        ]
        if qso.mode != mode:
            fields.append(_adif_field("SUBMODE", qso.mode))
        records.append(" ".join(fields) + " <EOR>")
    return (
        _adif_field("ADIF_VER", "3.1.4")
        + " "
        + _adif_field("PROGRAMID", "BricoHam")
        + " <EOH>\n"
        + "\n".join(records)
        + "\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Logbook SQLite local; no conecta ni controla radios."
    )
    parser.add_argument("--database", type=Path, required=True)
    subcommands = parser.add_subparsers(dest="action", required=True)
    add = subcommands.add_parser(
        "add", help="Guardar un QSO con fecha/hora y frecuencia explícitas."
    )
    add.add_argument("--call", required=True)
    add.add_argument("--started-at", required=True, help="ISO 8601 con zona horaria.")
    add.add_argument("--frequency-hz", required=True, type=int)
    add.add_argument("--mode", required=True, choices=MODES)
    subcommands.add_parser("list", help="Leer QSOs en orden cronológico UTC.")
    subcommands.add_parser("export-adif", help="Escribir ADIF en stdout sin modificar el logbook.")
    args = parser.parse_args(argv)
    database = args.database.resolve()
    try:
        if args.action == "add":
            identifier = add_qso(
                database, Qso(args.call, args.started_at, args.frequency_hz, args.mode)
            )
            print(json.dumps({"qso_id": identifier}))
        elif args.action == "list":
            print(json.dumps([asdict(qso) for qso in read_qsos(database)], indent=2))
        else:
            print(export_adif(database), end="")
    except (ValueError, sqlite3.Error, OSError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
