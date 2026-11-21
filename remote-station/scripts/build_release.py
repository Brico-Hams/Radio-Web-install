import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Build a wheel with the compiled web console.")
    parser.add_argument("--output", type=Path, default=root / "dist")
    args = parser.parse_args()
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if npm is None:
        parser.error("Node.js 22/npm is required to build the console, not to run the wheel.")
    subprocess.run(
        [npm, "run", "build", "--prefix", str(root / "apps" / "web-console")], check=True
    )
    with tempfile.TemporaryDirectory(prefix="bricoham-release-") as directory:
        stage = Path(directory)
        for package in ("bricoham_remote_station", "bricoham_station_agent"):
            for source in (root / package).rglob("*.py"):
                destination = stage / source.relative_to(root)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
        for name in ("pyproject.toml", "README.md", "LICENSE"):
            shutil.copy2(root / name, stage / name)
        shutil.copytree(
            root / "apps" / "web-console" / "dist",
            stage / "bricoham_remote_station" / "web_console",
        )
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "wheel",
                "--no-deps",
                "--wheel-dir",
                str(args.output.resolve()),
                str(stage),
            ],
            check=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
