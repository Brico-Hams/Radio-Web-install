"""Uso: python -m dm1801_backup            (GUI)
       python -m dm1801_backup detect     (CLI)
       python -m dm1801_backup backup CARPETA
"""
import sys

from . import core


def cli(argv: list[str]) -> int:
    try:
        if argv[0] == "detect":
            found = core.detect_radio()
            print("Radio detectada" if found else "Radio no detectada")
            return 0 if found else 1
        if argv[0] == "backup" and len(argv) == 2:
            res = core.run_backup(argv[1])
            print(f"Respaldo en: {res.folder}")
            for fi in res.files:
                print(f"{fi.name}\t{fi.size} bytes\tSHA256 {fi.sha256}")
            return 0
    except core.BackupError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2
    print(__doc__, file=sys.stderr)
    return 64


if __name__ == "__main__":
    if len(sys.argv) > 1:
        sys.exit(cli(sys.argv[1:]))
    from .gui import main
    main()
