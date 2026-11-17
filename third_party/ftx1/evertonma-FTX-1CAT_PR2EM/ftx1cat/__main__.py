#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ponto de entrada:  python -m ftx1cat [--simulate] [--port COM4] [--baud 38400] [--debug]
"""

import argparse
import logging
import logging.handlers
import os
import sys
from pathlib import Path


def _fix_tcl_paths() -> None:
    """Algumas instalações do Python no Windows guardam Tcl/Tk em `tcl/`, mas o
    tkinter tenta encontrá-los em `lib/`. Definir estes caminhos antes de criar
    a janela permite iniciar o app sem configurar variáveis no PowerShell."""
    root = Path(sys.base_prefix) / "tcl"
    if not root.is_dir():
        return
    tcl = next((p for p in root.glob("tcl*") if (p / "init.tcl").is_file()), None)
    tk = next((p for p in root.glob("tk*") if (p / "tk.tcl").is_file()), None)
    if tcl:
        os.environ.setdefault("TCL_LIBRARY", str(tcl))
    if tk:
        os.environ.setdefault("TK_LIBRARY", str(tk))


def setup_logging(debug: bool) -> Path:
    """Log em arquivo (rotativo) na pasta de configuração do usuário."""
    from .ui.settings import config_dir

    path = config_dir() / "ftx1cat.log"
    path.parent.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(path, maxBytes=500_000, backupCount=3,
                                                   encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.addHandler(handler)
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    return path


def parse_args(argv=None):
    from . import __version__

    parser = argparse.ArgumentParser(prog="ftx1cat", description="Yaesu FTX-1 CAT Menu — by PR2EM")
    parser.add_argument("--simulate", action="store_true",
                        help="run with a simulated radio (no serial port needed)")
    parser.add_argument("--port", help="serial port to preselect (e.g. COM4)")
    parser.add_argument("--baud", help="baud rate to preselect (default: last used or 38400)")
    parser.add_argument("--debug", action="store_true",
                        help="write CAT TX/RX traffic to the log file")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    log_path = setup_logging(args.debug)
    _fix_tcl_paths()
    from .ui.app import App

    logging.getLogger(__name__).info("starting (log: %s)", log_path)
    app = App(simulate=args.simulate, port=args.port, baud=args.baud)
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
