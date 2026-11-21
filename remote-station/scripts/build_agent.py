import argparse
import shutil
import subprocess
import sys
import tempfile
import tomllib
import zipapp
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Build a standalone headless station agent.")
    parser.add_argument("--output", type=Path, default=root / "dist")
    args = parser.parse_args()
    project = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))["project"]
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="bricoham-agent-") as directory:
        stage = Path(directory)
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-deps",
                "--no-compile",
                "--only-binary=:all:",
                "--target",
                str(stage),
                *project["dependencies"],
            ],
            check=True,
        )
        shared = stage / "bricoham_remote_station"
        shared.mkdir()
        for name in (
            "__init__.py",
            "contracts.py",
            "security.py",
            "cat_diagnostics.py",
            "radio_candidates.py",
            "transport_security.py",
            "secure_http.py",
            "websocket_transport.py",
            "diagnostic_reports.py",
        ):
            shutil.copy2(root / "bricoham_remote_station" / name, shared / name)
        for package in (
            Path("bricoham_station_agent"),
            Path("bricoham_remote_station") / "drivers",
        ):
            for source in (root / package).rglob("*.py"):
                destination = stage / source.relative_to(root)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
        shutil.copy2(root / "LICENSE", stage / "LICENSE")
        shutil.copy2(root / "bricoham_station_agent" / "__main__.py", stage / "__main__.py")
        zipapp.create_archive(
            stage,
            output / "bricoham-station-agent.pyz",
            compressed=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
