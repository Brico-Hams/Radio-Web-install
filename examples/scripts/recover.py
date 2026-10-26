"""Find copies of dead GitHub repos: Software Heritage archive, Wayback Machine snapshot, surviving forks/mirrors."""
import json
import subprocess
import sys
import urllib.parse
import urllib.request


def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kb-recover"}), timeout=60) as r:
            return json.load(r)
    except Exception as e:  # noqa: BLE001 - report and continue with the next source
        return {"error": str(e)}


for repo in [line.strip() for line in open(sys.argv[1], encoding="utf-8") if line.strip()]:
    url = f"https://github.com/{repo}"
    swh = get(f"https://archive.softwareheritage.org/api/1/origin/{url}/visits/?per_page=1")
    swh_s = (f"SWH ultima visita {swh[0]['date'][:10]} -> https://archive.softwareheritage.org/browse/origin/?origin_url={url}"
             if isinstance(swh, list) and swh else "SWH no")
    wb = get("https://archive.org/wayback/available?url=" + urllib.parse.quote(url))
    snap = (wb.get("archived_snapshots") or {}).get("closest") or {}
    wb_s = f"Wayback {snap['timestamp'][:8]} {snap['url']}" if snap else "Wayback no"
    name = repo.split("/")[1]
    r = subprocess.run(["gh", "search", "repos", name, "--limit", "8", "--json", "fullName,pushedAt"],
                       capture_output=True, text=True, encoding="utf-8")
    forks = [f"{x['fullName']} ({x['pushedAt'][:10]})" for x in json.loads(r.stdout or "[]")
             if x["fullName"].lower() != repo.lower() and name.lower() in x["fullName"].lower()]
    print(f"- **{repo}**: {swh_s}; {wb_s}; copias/forks: {', '.join(forks) or 'ninguna'}", flush=True)
