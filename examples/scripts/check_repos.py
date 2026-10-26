"""Check GitHub repos: existence, activity, license and target MCU (V3/K1 PY32F071 vs V1 DP32G030)."""
import json
import subprocess
import sys


def gh(path):
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, encoding="utf-8")
    return json.loads(r.stdout) if r.returncode == 0 else None


def target(repo, branch):
    tree = gh(f"repos/{repo}/git/trees/{branch}?recursive=1") or {}
    paths = " ".join(t["path"].lower() for t in tree.get("tree", []))
    v3 = any(k in paths for k in ("py32", "py32f071", "puya"))
    v1 = any(k in paths for k in ("dp32g030", "dp32"))
    # PY32 sources mean the code builds for V3/K1; DP32 leftovers are common in V3 forks.
    return "V3/K1" if v3 else "V1" if v1 else "?"


print("| repo | estado | ultimo push | licencia | estrellas | MCU | descripcion |")
print("|---|---|---|---|---:|---|---|")
for repo in [line.strip() for line in open(sys.argv[1], encoding="utf-8") if line.strip()]:
    info = gh(f"repos/{repo}")
    if not info:
        print(f"| {repo} | NO EXISTE / privado | | | | | |")
        continue
    state = "archivado" if info.get("archived") else "fork" if info.get("fork") else "activo"
    lic = (info.get("license") or {}).get("spdx_id") or "sin licencia"
    desc = (info.get("description") or "").replace("|", "/")[:90]
    print(f"| {info['full_name']} | {state} | {info['pushed_at'][:10]} | {lic} | {info['stargazers_count']} | "
          f"{target(info['full_name'], info['default_branch'])} | {desc} |", flush=True)
