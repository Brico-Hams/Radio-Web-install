# -*- coding: utf-8 -*-
"""
Configurações persistentes do usuário (porta, baud, tamanho da janela...).

Ficam em um JSON na pasta de dados do usuário:
  * Windows: %APPDATA%\\FTX1CAT\\settings.json
  * Linux/macOS: ~/.config/ftx1cat/settings.json
O arquivo de log do aplicativo fica na mesma pasta.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

log = logging.getLogger(__name__)

DEFAULTS: Dict[str, Any] = {
    "port": "",
    "baud": "38400",
    "geometry": "1280x760",
    "auto_read_group": True,
    "show_cat_commands": True,
    "backup_dir": "",
    "func_parameter": "",
}


def config_dir() -> Path:
    base = os.environ.get("APPDATA")
    if base:
        return Path(base) / "FTX1CAT"
    return Path.home() / ".config" / "ftx1cat"


class Settings:
    def __init__(self, path: Path = None):
        self.path = path or (config_dir() / "settings.json")
        self.data: Dict[str, Any] = dict(DEFAULTS)
        self.load()

    def load(self) -> None:
        try:
            with open(self.path, encoding="utf-8") as f:
                stored = json.load(f)
            if isinstance(stored, dict):
                self.data.update({k: v for k, v in stored.items() if k in DEFAULTS})
        except FileNotFoundError:
            pass
        except (OSError, ValueError) as exc:
            log.warning("could not read settings %s: %s", self.path, exc)

    def save(self) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except OSError as exc:
            log.warning("could not save settings %s: %s", self.path, exc)

    def get(self, key: str) -> Any:
        return self.data.get(key, DEFAULTS.get(key))

    def set(self, key: str, value: Any) -> None:
        self.data[key] = value
