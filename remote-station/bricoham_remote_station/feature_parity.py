"""Read-only per-radio remote feature matrix for the React console.

Python mirror of remote-parity.cjs featureStates(); both read data/remote-feature-parity.json.
"""

import json
from pathlib import Path
from typing import Any

from bricoham_remote_station.contracts import API_VERSION

DATA_DIRECTORY = Path(__file__).resolve().parents[2] / "data"
PARITY_PATH = DATA_DIRECTORY / "remote-feature-parity.json"
CATALOG_PATH = DATA_DIRECTORY / "remote-station-catalog.json"
STATUSES = frozenset({"ok", "partial", "pendiente", "na"})


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def feature_parity_catalog(
    parity_path: Path = PARITY_PATH, catalog_path: Path = CATALOG_PATH
) -> dict[str, Any]:
    """Every radio with every feature, its status and the reason shown when it is greyed out."""
    data = _load(parity_path)
    catalog = {item["id"]: item for item in _load(catalog_path).get("radios", [])}
    order = data["featureOrder"]
    families = data["families"]
    radios = []
    for row in data["rows"]:
        family = families[row["family"]]
        statuses = row.get("features") or family["features"]
        entry = catalog.get(row["id"], {})
        label = " ".join(part for part in (entry.get("maker"), entry.get("model")) if part)
        features = {}
        for feature, status in zip(order, statuses, strict=True):
            if status not in STATUSES:
                raise ValueError(f"{row['id']}.{feature}: unknown status {status}")
            reason = (row.get("reasons") or {}).get(feature) or (family.get("reasons") or {}).get(feature) or ""
            features[feature] = {"status": status, "reason": reason}
        radios.append({"id": row["id"], "label": label or row["id"], "features": features})
    return {
        "api_version": API_VERSION,
        "feature_order": order,
        "radios": radios,
    }
