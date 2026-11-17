"""Respaldo de solo lectura del codeplug del Baofeng DM-1801 usando dmrconfig -r.

Seguridad: la única invocación a dmrconfig es ["-r"]. No hay API de escritura.
"""
from __future__ import annotations

import hashlib
import json
import os
import stat
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

VID_PID = "VID_15A2&PID_0073"
READ_TIMEOUT_S = 240
APP_VERSION = "1.0.0"
ATTEMPTS = 3
RETRY_DELAY_S = 4
IMG_NAME = "device.img"
CONF_NAME = "device.conf"

UNAVAILABLE = {
    "Calibración": "No disponible: ni dmrconfig ni documentación verificada ofrecen lectura para el firmware de fábrica del DM-1801.",
    "Flash completa": "No disponible: sin método verificado de volcado para el firmware de fábrica de esta variante.",
    "Firmware de fábrica": "No disponible: no existe lectura documentada; el protocolo de actualización es solo escritura.",
}


class BackupError(Exception):
    """Error con mensaje claro para el usuario."""


@dataclass
class FileInfo:
    name: str
    size: int
    sha256: str


@dataclass
class BackupResult:
    folder: Path
    files: list[FileInfo] = field(default_factory=list)


def resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    return Path(__file__).resolve().parents[2]


def find_dmrconfig() -> Path:
    env = os.environ.get("DM1801_DMRCONFIG")
    candidates = [Path(env)] if env else []
    base = resource_dir()
    candidates += [base / "vendor" / "dmrconfig" / "dmrconfig.exe", base / "dmrconfig.exe"]
    for c in candidates:
        if c.is_file():
            return c
    raise BackupError("No se encontró dmrconfig.exe incluido con la aplicación.")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def detect_radio() -> bool:
    """True si hay un dispositivo HID 15A2:0073 presente (no abre la radio)."""
    if sys.platform != "win32":
        return False
    cmd = [
        "powershell", "-NoProfile", "-NonInteractive", "-Command",
        f"@(Get-PnpDevice -PresentOnly | Where-Object {{ $_.InstanceId -like '*{VID_PID}*' }}).Count",
    ]
    try:
        out = subprocess.run(
            cmd, capture_output=True, stdin=subprocess.DEVNULL, text=True, timeout=30,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        ).stdout.strip()
    except (OSError, subprocess.TimeoutExpired) as e:
        raise BackupError(f"No se pudo consultar los dispositivos USB: {e}") from e
    return out.isdigit() and int(out) > 0


def check_folder_writable(folder: Path) -> None:
    if not folder.is_dir():
        raise BackupError("La carpeta seleccionada no existe.")
    try:
        with tempfile.TemporaryFile(dir=folder):
            pass
    except OSError as e:
        raise BackupError(
            "No se puede escribir en la carpeta seleccionada (Windows, p. ej. «Acceso controlado a carpetas», "
            "bloquea apps sin firmar en Documentos/Escritorio). Elige otra carpeta, como C:\\Users\\<tú>\\DM1801-Backups."
        ) from e


def _new_run_folder(parent: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for n in range(100):
        name = f"dm1801-backup-{stamp}" + (f"-{n}" if n else "")
        target = parent / name
        try:
            target.mkdir()  # falla si existe: nunca sobrescribe
            return target
        except FileExistsError:
            continue
        except OSError as e:
            raise BackupError(f"No se pudo crear la carpeta de respaldo: {e}") from e
    raise BackupError("No se pudo crear una carpeta de respaldo única.")


def validate_outputs(folder: Path) -> list[FileInfo]:
    infos = []
    for name in (IMG_NAME, CONF_NAME):
        p = folder / name
        if not p.is_file() or p.stat().st_size == 0:
            raise BackupError(f"La lectura no generó un {name} válido.")
        infos.append(FileInfo(name, p.stat().st_size, sha256_file(p)))
    with open(folder / IMG_NAME, "rb") as f:
        if f.read(4) != b"1801":
            raise BackupError("device.img no tiene la cabecera esperada del DM-1801.")
    return infos


def _explain(returncode: int, output: str) -> str:
    low = output.lower()
    if "permission" in low or "denied" in low:
        return "Acceso denegado al guardar o al dispositivo. Elige otra carpeta o cierra otros programas."
    if not low.strip() or "no radio" in low or "not found" in low or "cannot" in low or "hid" in low:
        return ("No se pudo comunicar con la radio. Comprueba que está encendida, conectada por el cable "
                "USB de programación y que ningún otro programa (CPS) la usa; luego reintenta.")
    return f"dmrconfig terminó con error (código {returncode}). Reintenta con la radio reconectada."


def _clear(folder: Path) -> None:
    # Solo toca archivos de esta ejecución (carpeta recién creada).
    for p in folder.iterdir():
        try:
            p.unlink()
        except OSError:
            pass


def _cleanup_failed(folder: Path) -> None:
    _clear(folder)
    try:
        folder.rmdir()
    except OSError:
        pass


def run_backup(parent: Path, dmrconfig: Path | None = None, command_prefix: list[str] | None = None,
               timeout: int = READ_TIMEOUT_S, retry_delay: float = RETRY_DELAY_S) -> BackupResult:
    parent = Path(parent)
    check_folder_writable(parent)
    exe = dmrconfig or find_dmrconfig()
    cmd = (command_prefix or [str(exe)]) + ["-r"]
    folder = _new_run_folder(parent)
    proc = None
    for attempt in range(ATTEMPTS):
        if attempt:
            _clear(folder)
            time.sleep(retry_delay)  # la radio puede tardar en salir de la sesión anterior
        try:
            proc = subprocess.run(
                cmd, cwd=folder, capture_output=True, stdin=subprocess.DEVNULL, text=True, errors="replace", timeout=timeout,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except subprocess.TimeoutExpired:
            _cleanup_failed(folder)
            raise BackupError("La lectura excedió el tiempo límite. Reconecta la radio e inténtalo de nuevo.")
        except OSError as e:
            _cleanup_failed(folder)
            raise BackupError(f"No se pudo ejecutar dmrconfig: {e}") from e
        if proc.returncode == 0:
            break
    if proc.returncode != 0:
        _cleanup_failed(folder)
        raise BackupError(_explain(proc.returncode & 0xFFFFFFFF, proc.stderr + proc.stdout))
    try:
        infos = validate_outputs(folder)
    except BackupError:
        _cleanup_failed(folder)
        raise
    _write_manifest(folder, exe, infos)
    for fi in infos:
        os.chmod(folder / fi.name, stat.S_IREAD)
    return BackupResult(folder, infos)


def _write_manifest(folder: Path, exe: Path, infos: list[FileInfo]) -> None:
    manifest = {
        "app": "dm1801-backup", "app_version": APP_VERSION,
        "created": datetime.now().astimezone().isoformat(timespec="seconds"),
        "radio_usb_id": "15A2:0073", "mode": "read-only (dmrconfig -r)",
        "dmrconfig_sha256": sha256_file(exe) if exe.is_file() else None,
        "files": [fi.__dict__ for fi in infos],
        "not_available": list(UNAVAILABLE),
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
