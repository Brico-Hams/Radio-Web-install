#!/usr/bin/env python3
"""Build Bricohams CHIRP CSVs for the Quansheng UV-K5 V3 (Spain).

Writes to chirp/:
- FM repeaters (2 m / 70 cm) from data/channel-templates/ES.json (HearHam), split by EA district into
  files of at most 200 memories.
- Every frequency OurAirports lists for Spanish airports, civil and military (AM, receive only).
- PMR446 and CB 27 MHz channels (receive only).

With --with-web it also downloads the public URE-derived listings (ea5pg.es, ea4t.es, EA7EER blog),
merges them with HearHam and writes the result to chirp/local/. Those listings carry no open licence,
so chirp/local/ stays out of git (see .gitignore).
Usage: python scripts/build-chirp-spain.py [--with-web]
"""
import csv
import html
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tmp"
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/"
UA = "BricohamsRadioWorkspace (+https://github.com/Brico-Hams/Radio-Web-install)"
# Highest priority first: when sources disagree, the first one wins; a missing tone is filled from the next.
WEB_LISTINGS = [
    ("ea5pg.es", "https://www.ea5pg.es/repetidores-vhf-uhf-espanol/"),
    ("ea4t.es", "https://ea4t.es/listado-de-repetidores-de-vhf"),
    ("ea4t.es", "https://ea4t.es/listado-de-repetidores-de-uhf"),
    ("ea7eer", "https://ea7eerblog.wordpress.com/repetidores-vhf/"),
    ("ea7eer", "https://ea7eerblog.wordpress.com/repetidores-uhf/"),
]
MEMORIES = 200
HEADER = ["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "DtcsCode",
          "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Power", "Comment",
          "URCALL", "RPT1CALL", "RPT2CALL", "DVCODE"]
# chirp_common.TONES
TONES = {67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100.0, 103.5, 107.2, 110.9,
         114.8, 118.8, 123.0, 127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9,
         171.3, 173.8, 177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5, 210.7, 218.1,
         225.7, 229.1, 233.6, 241.8, 250.3, 254.1}
HAM_BANDS = ((144.0, 146.0), (430.0, 440.0))  # Spanish 2 m / 70 cm allocations
# Civil VHF (incl. VOR-borne ATIS), Spanish military VHF up to 144 MHz, military UHF.
AIR_BANDS = ((108.0, 144.0), (225.0, 400.0))
RX_ONLY_BANDS = AIR_BANDS + ((26.96, 27.41), (446.0, 446.2))
DIGITAL = re.compile(r"D-?STAR|DMR|C4FM|FUSION|YSF|TETRA|NXDN|P25", re.I)
AIR_KINDS = {"APPROACH": "APP", "GMC": "GND", "CLD": "DEL", "CLNC": "DEL", "DLV": "DEL", "RADIO": "RDO",
             "BANDAAERIA": "AIR", "AUTOINFORMACION": "INFO", "BAACOMPANYFREQ": "OPS"}
REGIONS_ES = {"AN": "Andalucía", "AR": "Aragón", "AS": "Asturias", "CB": "Cantabria", "CE": "Ceuta",
              "CL": "Castilla y León", "CM": "Castilla-La Mancha", "CN": "Canarias", "CT": "Cataluña",
              "EX": "Extremadura", "GA": "Galicia", "IB": "Baleares", "MC": "Murcia", "MD": "Madrid",
              "ML": "Melilla", "NC": "Navarra", "PV": "País Vasco", "RI": "La Rioja", "VC": "C. Valenciana"}
# Repeaters published in the user's own OpenWebRX bookmarks (bricohams-sdr) that HearHam lacks.
EXTRA_REPEATERS = [{"callsign": "ED5YBF", "rx": "438.77500", "tx": "431.17500", "tone": "77.0", "region": "Murcia",
                    "city": "Sierra de Carrascoy", "source": "https://ea5rcz.es/ed5ybf/"}]
CB = [26.965, 26.975, 26.985, 27.005, 27.015, 27.025, 27.035, 27.055, 27.065, 27.075, 27.085, 27.105, 27.115,
      27.125, 27.135, 27.155, 27.165, 27.175, 27.185, 27.205, 27.215, 27.225, 27.255, 27.235, 27.245, 27.265,
      27.275, 27.285, 27.295, 27.305, 27.315, 27.325, 27.335, 27.345, 27.355, 27.365, 27.375, 27.385,
      27.395, 27.405]  # CEPT channels 1-40 (23/24/25 are out of order by design)


def row(name, freq, mode, tstep, comment, duplex="off", offset=0.0, tone=""):
    t = f"{float(tone):.1f}" if tone else "88.5"
    return {"Name": name, "Frequency": f"{freq:.6f}", "Duplex": duplex, "Offset": f"{offset:.6f}",
            "Tone": "Tone" if tone else "", "rToneFreq": t, "cToneFreq": t, "DtcsCode": "023",
            "DtcsPolarity": "NN", "RxDtcsCode": "023", "CrossMode": "Tone->Tone", "Mode": mode, "TStep": tstep,
            "Skip": "", "Power": "High" if duplex != "off" else "Low", "Comment": comment,
            "URCALL": "", "RPT1CALL": "", "RPT2CALL": "", "DVCODE": ""}


def in_band(freq, bands):
    return any(lo <= freq <= hi for lo, hi in bands)


def unique_name(base, used, suffix):
    name = base[:10]
    if name in used:
        name = f"{base[:9 - len(suffix)]} {suffix}"[:10]
    n = 2
    while name in used:
        name = f"{base[:8]}{n:02d}"[:10]
        n += 1
    used.add(name)
    return name


def fetch(url, name):
    cache = CACHE / name
    if not cache.exists():
        CACHE.mkdir(exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            cache.write_bytes(r.read())
    return cache.read_text(encoding="utf-8", errors="replace")


def parse_listing(source, url, text):
    """Rows like: ED1YAB | 145.725 MHz -600 kHz FM (RV58 – R5) Subtono 77.0 Hz IN82PO Radio Club Rioja."""
    out = []
    for tr in re.findall(r"<tr.*?</tr>", text, re.S | re.I):
        cells = [html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c))).strip()
                 for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S | re.I)]
        if len(cells) < 2 or not re.match(r"E[A-H]\d[A-Z]{2,3}\b", cells[0]):
            continue
        call, info = re.match(r"E[A-H]\d[A-Z]{2,3}", cells[0]).group(), " ".join(cells[1:])
        f = re.search(r"\b(\d{3})[.,](\d{3})(?:[.,](\d{1,2}))?", info)
        if not f:
            continue
        rx = float(f"{f[1]}.{f[2]}{f[3] or ''}")
        off = re.search(r"([+\-−–])\s*(\d+(?:[.,]\d+)?)\s*(kHz|MHz)", info[f.end():])
        offset = 0.0
        if off:
            offset = float(off[2].replace(",", ".")) / (1000 if off[3] == "kHz" else 1)
            offset = offset if off[1] == "+" else -offset
        tone = re.search(r"Subtono:?\s*(\d{2,3}(?:[.,]\d)?)", info, re.I)
        loc = re.search(r"\b([A-R]{2}\d{2}[A-X]{2})\b", info)
        owner = info[loc.end():].strip(" –-") if loc else ""
        out.append({"callsign": call, "rx": rx, "tx": round(rx + offset, 5),
                    "tone": tone[1].replace(",", ".") if tone else "", "digital": bool(DIGITAL.search(info)),
                    "region": " ".join(filter(None, [owner, loc[1] if loc else ""])), "city": "",
                    "source": url, "label": source})
    return out


def hearham():
    template = json.loads((ROOT / "data/channel-templates/ES.json").read_text(encoding="utf-8"))
    rows = [{**c, "rx": float(c["rx"]), "tx": float(c["tx"]), "digital": False, "label": "HearHam"}
            for c in template["channels"]]
    known = {(c["callsign"], c["rx"]) for c in rows}
    return rows + [{**c, "rx": float(c["rx"]), "tx": float(c["tx"]), "digital": False, "label": "ea5rcz.es"}
                   for c in EXTRA_REPEATERS if (c["callsign"], float(c["rx"])) not in known]


def merge(sources):
    """Merge per (callsign, RX kHz); earlier sources win, a missing tone is filled from later ones."""
    merged = {}
    for c in sources:
        key = (c["callsign"].upper(), round(c["rx"] * 1000))
        if key not in merged:
            merged[key] = dict(c, labels=[c["label"]])
            continue
        m = merged[key]
        m["labels"].append(c["label"])
        if not m["tone"] and c["tone"]:
            m["tone"] = c["tone"]
        m["digital"] = m["digital"] or c["digital"]
    return list(merged.values())


def district(callsign):
    d = re.search(r"\d", callsign)
    return f"EA{d.group()}" if d else "EA0"


def repeaters(channels):
    rows, dropped = [], {"digital": 0, "band": [], "tone": []}
    used = set()
    for c in sorted(channels, key=lambda c: (district(c["callsign"]), c["callsign"], c["rx"])):
        rx, tx, tone = c["rx"], c["tx"], str(c["tone"]).strip()
        if c["digital"]:
            dropped["digital"] += 1
            continue
        if not (in_band(rx, HAM_BANDS) and in_band(tx, HAM_BANDS)):
            dropped["band"].append(f'{c["callsign"]} {rx}')
            continue
        if tone and float(tone) not in TONES:
            dropped["tone"].append(f'{c["callsign"]} {tone}')
            tone = ""
        offset = round(tx - rx, 5)
        duplex = "" if offset == 0 else ("+" if offset > 0 else "-")
        # 12.5 kHz raster channels are narrow-band; the rest keep the classic 25 kHz FM.
        narrow = round(rx * 1000) % 25 != 0
        city = "" if c.get("city", "").strip() in ("", "Spain") else c["city"].strip()
        comment = " · ".join(filter(None, [c["region"], city, "sin tono publicado" if not tone else "",
                                           "/".join(dict.fromkeys(c["labels"])), c["source"]]))
        name = unique_name(c["callsign"].upper(), used, "V" if rx < 300 else "U")
        rows.append((district(c["callsign"]), row(name, rx, "NFM" if narrow else "FM",
                                                  "12.50" if narrow else "25.00", comment, duplex, abs(offset), tone)))
    return rows, dropped


def air_freq(mhz):
    """OurAirports may hold 8.33 kHz channel designators; return (real MHz, CHIRP TStep) or (None, None)."""
    khz = round(float(mhz) * 1000)
    block, rest = khz - khz % 25, khz % 25
    if rest == 0:
        return block / 1000, "25.00"
    if rest in (5, 10, 15):
        return (block + (rest - 5) * 25 / 3) / 1000, "8.33"
    return None, None  # not a valid 25 kHz or 8.33 kHz channel (data error upstream)


def airports():
    ap = {a["ident"]: a for a in csv.DictReader(io.StringIO(fetch(OURAIRPORTS + "airports.csv", "airports.csv")))
          if a["iso_country"] == "ES"}
    freqs = csv.DictReader(io.StringIO(fetch(OURAIRPORTS + "airport-frequencies.csv", "airport-frequencies.csv")))
    freqs = [f for f in freqs if f["airport_ident"] in ap]
    rows, used, seen, dropped = [], set(), {}, []
    for f in sorted(freqs, key=lambda f: (ap[f["airport_ident"]]["iso_region"], f["airport_ident"], f["type"].upper())):
        a = ap[f["airport_ident"]]
        code = a["icao_code"] or a["gps_code"] or a["local_code"] or a["ident"].replace("-", "")
        kind = re.sub(r"[^A-Z]", "", f["type"].upper().translate(str.maketrans("ÀÁÈÉÍÒÓÚ", "AAEEIOOU")))
        kind = AIR_KINDS.get(kind, kind)[:9 - len(code)] or "FREQ"
        freq, tstep = air_freq(f["frequency_mhz"])
        if freq is None or not in_band(freq, AIR_BANDS):
            dropped.append(f'{code} {f["type"]} {f["frequency_mhz"]}')
            continue
        # A shared approach frequency (e.g. CANARIAS APP) is stored once.
        key = (freq, "APP") if kind == "APP" else (freq, code)
        if key in seen:
            if code not in seen[key]["Comment"]:
                seen[key]["Comment"] += f" · {code}"
            continue
        military = freq >= 137 or "MIL" in (f["type"] + f["description"]).upper()
        comment = " · ".join(filter(None, [f'{a["name"]} ({a["municipality"]})', f["description"].strip(),
                                           "militar" if military else "", code]))
        seen[key] = row(unique_name(f"{code} {kind}", used, "2"), freq, "AM", tstep, comment)
        rows.append((a["iso_region"].split("-")[-1], seen[key]))
    return rows, dropped


def pmr_cb():
    rows = [row(f"PMR{n:02d}", 446.00625 + (n - 1) * 0.0125, "NFM", "6.25", f"PMR446 canal {n} · solo RX")
            for n in range(1, 17)]
    for mode in ("AM", "FM"):
        rows += [row(f"CB{n:02d} {mode}", f, mode, "5.00", f"CB 27 MHz canal {n} {mode} · solo RX")
                 for n, f in enumerate(CB, 1)]
    return rows


def pack(groups, prefix, single, label=str.lower):
    """Pack ordered (group, row) pairs into files of at most MEMORIES rows without splitting a group."""
    files, cur, names = [], [], []
    order = list(dict.fromkeys(g for g, _ in groups))
    for g in order:
        part = [r for k, r in groups if k == g]
        assert len(part) <= MEMORIES, f"group {g} has {len(part)} rows"
        if len(cur) + len(part) > MEMORIES:
            files.append((names, cur))
            cur, names = [], []
        cur, names = cur + part, names + [g]
    if cur:
        files.append((names, cur))
    if len(files) == 1:
        return [(single, files[0][1])]
    return [(f"{prefix}-{label(names[0])}-{label(names[-1])}.csv", rows) for names, rows in files]


def write(out, name, rows):
    assert 0 < len(rows) <= MEMORIES, f"{name}: {len(rows)} rows"
    with open(out / name, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, HEADER, lineterminator="\r\n")
        w.writeheader()
        for i, r in enumerate(rows, 1):
            w.writerow({"Location": i, **r})
    validate(out / name)
    return name, len(rows)


def validate(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    assert rows and list(rows[0]) == HEADER, path
    names, keys = set(), set()
    for i, r in enumerate(rows, 1):
        f, off = float(r["Frequency"]), float(r["Offset"])
        assert int(r["Location"]) == i, (path, i)
        assert 1 <= len(r["Name"]) <= 10 and r["Name"].isascii() and r["Name"] not in names, (path, r["Name"])
        names.add(r["Name"])
        key = (r["Frequency"], r["Mode"], r["Name"])
        assert key not in keys, (path, key)
        keys.add(key)
        assert float(r["rToneFreq"]) in TONES and float(r["cToneFreq"]) in TONES, (path, r["Name"])
        if r["Duplex"] == "off":
            assert in_band(f, RX_ONLY_BANDS) and r["Mode"] in ("AM", "FM", "NFM"), (path, r["Name"])
        else:
            tx = f + {"+": off, "-": -off, "": 0}[r["Duplex"]]
            assert r["Mode"] in ("FM", "NFM") and in_band(f, HAM_BANDS) and in_band(tx, HAM_BANDS), (path, r["Name"])


def build(out, channels, report):
    out.mkdir(exist_ok=True)
    for old in out.glob("*.csv"):
        old.unlink()
    rep, rep_dropped = repeaters(channels)
    air, air_dropped = airports()
    written = [write(out, n, r) for n, r in pack(rep, "repetidores-fm", "repetidores-espana-fm.csv")]
    written += [write(out, n, r) for n, r in pack(air, "aeropuertos-am-rx", "aeropuertos-espana-am-rx.csv")]
    written.append(write(out, "pmr446-cb-rx.csv", pmr_cb()))
    print(f"[{report}] repeaters: {len(rep)}; digital left out: {rep_dropped['digital']}; "
          f"out of band: {rep_dropped['band']}; invalid tone cleared: {rep_dropped['tone']}")
    print(f"[{report}] airport frequencies: {len(air)}; dropped: {air_dropped}")
    for name, n in written:
        print(f"  {out.relative_to(ROOT) / name}: {n}")


def main():
    base = hearham()
    build(ROOT / "chirp", merge(base), "open data")
    if "--with-web" in sys.argv:
        web = []
        for i, (label, url) in enumerate(WEB_LISTINGS):
            web += parse_listing(label, url, fetch(url, f"repeaters-web-{i}.html"))
        # ea5pg.es (2024) and ea4t.es first, then HearHam, then the 2017 EA7EER copy.
        old = [c for c in web if c["label"] == "ea7eer"]
        recent = [c for c in web if c["label"] != "ea7eer"]
        build(ROOT / "chirp" / "local", merge(recent + base + old), "with web listings")


if __name__ == "__main__":
    main()
