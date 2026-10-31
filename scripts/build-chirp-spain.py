#!/usr/bin/env python3
"""Build Bricohams CHIRP CSVs for the Quansheng UV-K5 V3: Spanish FM repeaters and airport ATC (RX only).

Repeaters come from data/channel-templates/ES.json (HearHam, refreshed by fetch-channel-templates.cjs).
Airports come from OurAirports (public domain), downloaded into tmp/ on each run.
Usage: python scripts/build-chirp-spain.py
"""
import csv
import io
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "chirp"
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/"
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
AIR_BAND = (118.0, 137.0)
ATC_TYPES = {"TWR": "TWR", "APP": "APP", "APPROACH": "APP", "ATIS": "ATIS", "GND": "GND"}
# Repeaters published in the user's own OpenWebRX bookmarks (bricohams-sdr) that HearHam lacks.
EXTRA_REPEATERS = [{"callsign": "ED5YBF", "rx": "438.77500", "tx": "431.17500", "tone": "77.0", "region": "Murcia",
                    "regionId": "ES-MU", "city": "Sierra de Carrascoy", "source": "https://ea5rcz.es/ed5ybf/"}]


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


def repeaters():
    template = json.loads((ROOT / "data/channel-templates/ES.json").read_text(encoding="utf-8"))
    rows, used, dropped = [], set(), []
    channels = template["channels"] + EXTRA_REPEATERS
    known = {(c["callsign"], c["rx"]) for c in template["channels"]}
    channels = template["channels"] + [c for c in EXTRA_REPEATERS if (c["callsign"], c["rx"]) not in known]
    seen = set()
    for c in channels:
        rx, tx = float(c["rx"]), float(c["tx"])
        tone = c["tone"].strip()
        if not (in_band(rx, HAM_BANDS) and in_band(tx, HAM_BANDS)) or (tone and float(tone) not in TONES):
            dropped.append(f'{c["callsign"]} {c["rx"]} (out of band or invalid tone)')
            continue
        if (c["callsign"], rx) in seen:
            dropped.append(f'{c["callsign"]} {c["rx"]} (duplicate)')
            continue
        seen.add((c["callsign"], rx))
        offset = round(tx - rx, 5)
        duplex = "" if offset == 0 else ("+" if offset > 0 else "-")
        # 12.5 kHz raster channels are narrow-band; the rest keep the classic 25 kHz FM.
        narrow = round(rx * 1000) % 25 != 0
        city = "" if c["city"].strip() in ("", "Spain") else c["city"].strip()
        comment = " · ".join(filter(None, [c["region"], city, "sin tono publicado" if not tone else "",
                                           c["source"]]))
        name = unique_name(re.sub(r"[^A-Z0-9]", "", c["callsign"].upper()), used, "V" if rx < 300 else "U")
        rows.append(row(name, rx, "NFM" if narrow else "FM", "12.50" if narrow else "25.00", comment,
                        duplex, abs(offset), tone))
    return rows, dropped


def fetch_csv(name):
    cache = ROOT / "tmp" / name
    if not cache.exists():
        cache.parent.mkdir(exist_ok=True)
        req = urllib.request.Request(OURAIRPORTS + name, headers={"User-Agent": "BricohamsRadioWorkspace"})
        with urllib.request.urlopen(req, timeout=120) as r:
            cache.write_bytes(r.read())
    return list(csv.DictReader(io.StringIO(cache.read_text(encoding="utf-8"))))


def air_freq(mhz):
    """OurAirports may hold 8.33 kHz channel designators; return (real MHz, CHIRP TStep)."""
    khz = round(float(mhz) * 1000)
    block, rest = khz - khz % 25, khz % 25
    if rest == 0:
        return block / 1000, "25.00"
    if rest in (5, 10, 15):
        return (block + (rest - 5) * 25 / 3) / 1000, "8.33"
    return None, None  # not a valid 25 kHz or 8.33 kHz channel (data error upstream)


def airports():
    ap = {a["ident"]: a for a in fetch_csv("airports.csv") if a["iso_country"] == "ES"}
    rows, used, seen, dropped, invalid = [], set(), {}, 0, []
    freqs = sorted(fetch_csv("airport-frequencies.csv"), key=lambda f: (f["airport_ident"], f["type"].upper()))
    for f in freqs:
        a = ap.get(f["airport_ident"])
        kind = ATC_TYPES.get(f["type"].strip().upper())
        if not a or not kind:
            continue
        icao = a["icao_code"] or a["gps_code"]
        freq, tstep = air_freq(f["frequency_mhz"])
        if freq is None:
            invalid.append(f'{icao} {kind} {f["frequency_mhz"]}')
            continue
        if not re.fullmatch(r"(LE|GC|GE)[A-Z]{2}", icao or "") or not AIR_BAND[0] <= freq < AIR_BAND[1]:
            dropped += 1
            continue
        # A shared approach frequency (e.g. CANARIAS APP) is stored once.
        key = (freq, "APP") if kind == "APP" else (freq, icao)
        if key in seen:
            seen[key]["Comment"] += f" · {icao}"
            continue
        comment = f'{a["name"]} ({a["municipality"]}) · {f["description"].strip()} · {icao}'
        seen[key] = row(unique_name(f"{icao} {kind}", used, "2"), freq, "AM", tstep, comment)
        rows.append(seen[key])
    return rows, dropped, invalid


def write(name, rows):
    assert len(rows) <= MEMORIES, f"{name}: {len(rows)} > {MEMORIES} memories"
    with open(OUT / name, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, HEADER, lineterminator="\r\n")
        w.writeheader()
        for i, r in enumerate(rows, 1):
            w.writerow({"Location": i, **r})
    validate(OUT / name)


def validate(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    assert rows and list(rows[0]) == HEADER, path
    names, keys = set(), set()
    for i, r in enumerate(rows, 1):
        f, off = float(r["Frequency"]), float(r["Offset"])
        assert int(r["Location"]) == i, (path, i)
        assert 1 <= len(r["Name"]) <= 10 and r["Name"].isascii() and r["Name"] not in names, (path, r["Name"])
        names.add(r["Name"])
        key = (r["Frequency"], r["Duplex"], r["Offset"], r["Tone"], r["rToneFreq"], r["Name"])
        assert key not in keys, (path, key)
        keys.add(key)
        assert float(r["rToneFreq"]) in TONES and float(r["cToneFreq"]) in TONES, (path, r["Name"])
        if r["Mode"] == "AM":
            assert r["Duplex"] == "off" and AIR_BAND[0] <= f < AIR_BAND[1], (path, r["Name"])
        else:
            tx = f + {"+": off, "-": -off, "": 0}[r["Duplex"]]
            assert r["Mode"] in ("FM", "NFM") and in_band(f, HAM_BANDS) and in_band(tx, HAM_BANDS), (path, r["Name"])


def main():
    OUT.mkdir(exist_ok=True)
    rep, rep_dropped = repeaters()
    air, air_dropped, air_invalid = airports()
    write("repetidores-espana-fm.csv", rep)
    write("aeropuertos-espana-am-rx.csv", air)
    print(f"repeaters: {len(rep)} ({len(rep_dropped)} dropped: {rep_dropped})")
    print(f"airport frequencies: {len(air)} ({air_dropped} without ICAO code or out of band; invalid channel: {air_invalid})")


if __name__ == "__main__":
    main()
