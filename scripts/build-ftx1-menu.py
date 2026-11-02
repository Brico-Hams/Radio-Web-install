"""Generate ftx1-menu.js from `pdftotext -raw CAT-FTX1.pdf all.txt` (Yaesu FTX-1 CAT manual, Table 3 MENU Chart).
Usage: python -I scripts/build-ftx1-menu.py all.txt ftx1-menu.js. The manual itself is not distributed here."""
import json, re, sys

lines = [l.rstrip() for l in open(sys.argv[1], encoding="utf-8", errors="replace")]
start = next(i for i, l in enumerate(lines) if l.startswith("Table 3 (MENU Chart)"))
lines = lines[start:]
end = next((i for i, l in enumerate(lines) if re.match(r"^Table [4-9]", l)), len(lines))
lines = lines[:end]

P1_NAMES = {"RADIO SETTING", "CW SETTING", "OPERATION SETTING", "DISPLAY SETTING", "EXTENSION SETTING",
            "APRS SETTING", "APRS BEACON", "APRS FILTER", "PRESET", "BLUETOOTH"}
# Writing these can cut the CAT link or touch calibration/fixed values: read-only in the web editor.
READ_ONLY = {"CAT-1 RATE", "CAT-1 TIME OUT TIMER", "CAT-1 CAT-3 STOP BIT", "CAT-2 RATE", "CAT-2 TIME OUT TIMER",
             "CAT-3 RATE", "CAT-3 TIME OUT TIMER", "TUN/LIN PORT SELECT", "REF FREQ ADJ", "APRS DESTINATION", "Device Name : Status"}

p1 = p1name = p2 = p2name = None
items, pending = [], None
skip = re.compile(r"^(CAT \(Computer|Table 3|P1 P2 P3 Function)")


def finish(item, digits):
    item["digits"] = None if digits in (None, "-") else int(digits)
    if item["digits"] is None and digits == "-":
        return  # not settable through CAT according to the manual
    # pdftotext cannot tell where the function name ends when it carries a digit or a range.
    fix = re.match(r"^(RPT SHIFT\(\d+MHz\)|MAIN STEPS PER REV\.|Mic-E|Bluetooth) (.*)$", item["name"])
    if fix:
        item["name"], item["desc"] = fix.group(1), fix.group(2) + " " + item["desc"]
    fix = re.match(r"^([1-5]) (.*)$", item["desc"].strip())
    if item["name"] in ("CW MEMORY", "BULLETIN") and fix:
        item["name"], item["desc"] = f"{item['name']} {fix.group(1)}", fix.group(2)
    if item["name"] == "INTERVAL TIME":
        item["desc"], item["digits"] = re.sub(r"\s1$", "", item["desc"].strip()), 1
    desc = re.sub(r"\s+", " ", item["desc"]).strip().replace("�", "°")
    item["desc"] = desc
    opts = re.findall(r"(\d+)\s*:\s*(.+?)(?=\s+\d+\s*:|\s*/\s*\d+\s*:|$)", desc)
    if opts and re.match(r"^\d+\s*:", desc) and (item["name"] == "RPT SHIFT" or not re.search(r"\s-\s\d+\s*:", desc)):
        item["options"] = [[v, t.strip(" /")] for v, t in opts]
    if re.search(r"characters|xxxxxx", desc):
        item["kind"] = "text"
    elif re.search(r"[+-]\d\d|\(-\d+\)", desc):
        item["kind"] = "signed"
    else:
        item["kind"] = "number"
    item["readOnly"] = item["name"] in READ_ONLY
    items.append(item)


i = 0
while i < len(lines):
    l = lines[i]
    if skip.match(l) or not l.strip():
        i += 1; continue
    if re.fullmatch(r"\d\d", l) and i + 1 < len(lines) and re.fullmatch(r"\(.+\)", lines[i + 1]):
        name = lines[i + 1][1:-1]
        if name in P1_NAMES:
            p1, p1name = l, name
        else:
            p2, p2name = l, name
        i += 2; continue
    m = re.fullmatch(r"(\d\d) (.+?)\s+(\d+|-)", l)
    m2 = re.fullmatch(r"(\d\d) ([A-Za-z].*)", l)
    if pending and re.fullmatch(r"\d+", l):
        finish(pending, l); pending = None; i += 1; continue
    if m or m2:
        if pending:  # item without digits (e.g. MIC P2): length checked against the radio's answer
            finish(pending, None); pending = None
        if m:
            p3, rest, digits = m.groups()
            fn = re.match(r"(.+?)\s{2,}(.*)$", rest) or re.match(r"([A-Z0-9][A-Z0-9 ./()&'\-]*?[A-Z0-9)])\s+((?:[-+]?\d|Up to|xx|APYX|Latitude|Longitude|See|0:|00).*)$", rest)
            name, desc = (fn.group(1), fn.group(2)) if fn else (rest, "")
            item = dict(p1=p1, p2=p2, p3=p3, group=f"{p1name} / {p2name}", name=name.strip(), desc=desc)
            finish(item, digits)
        else:
            pending = dict(p1=p1, p2=p2, p3=m2.group(1), group=f"{p1name} / {p2name}", name=m2.group(2).strip(), desc="")
        i += 1; continue
    if pending:
        pending["desc"] += " " + l
    i += 1
if pending:
    finish(pending, None)

out = sys.argv[2]
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write("(function (root) {\n  \"use strict\";\n")
    f.write("  // Generated from the Yaesu FTX-1 CAT Operation Reference Manual, Table 3 (MENU Chart).\n")
    f.write("  // Items marked \"-\" in the manual (not settable by CAT) are omitted.\n")
    f.write("  const R = root.RadioWorkspace;\n  R.FTX1_MENU = Object.freeze([\n")
    f.write(",\n".join("    " + json.dumps(it, ensure_ascii=True) for it in items))
    f.write("\n  ].map(Object.freeze));\n  if (typeof module !== \"undefined\") module.exports = R;\n})(globalThis);\n")
print(len(items), "items")
