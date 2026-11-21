import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bricoham_remote_station import diagnostic_reports as diagnostics  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    if not (root / "server.cjs").is_file() or not (root / "android/app").is_dir():
        parser.error("Run this generator from the integrated Radio-Web-install source tree")
    contract = {
        "schema_version": 1,
        "components": sorted(diagnostics.COMPONENTS),
        "platforms": sorted(diagnostics.PLATFORMS),
        "sources": sorted(diagnostics.SOURCES),
        "codes": sorted(diagnostics.CODES),
        "error_types": sorted(diagnostics.ERROR_TYPES),
        "severities": sorted(diagnostics.SEVERITIES),
        "max_events": diagnostics.MAX_EVENTS,
        "max_report_bytes": diagnostics.MAX_REPORT_BYTES,
        "retention_seconds": diagnostics.RETENTION_SECONDS,
        "report_fields": ["schema_version", "component", "version", "platform", "events"],
        "event_fields": ["code", "source", "severity", "error_type", "line"],
    }
    text = json.dumps(contract, indent=2, ensure_ascii=True) + "\n"
    outputs = {
        root / "diagnostic-contract.mjs": "export const contract = " + text.rstrip() + ";\n",
        root / "android/station-core/src/main/assets/diagnostic-contract.json": text,
    }
    for path, content in outputs.items():
        if args.check:
            if not path.is_file() or path.read_bytes() != content.encode("utf-8"):
                print(f"Diagnostic contract missing or stale: {path.name}", file=sys.stderr)
                return 1
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
