#!/usr/bin/env python3
"""Turn Telegram Desktop JSON exports of Quansheng groups into a private, local knowledge base.

Usage: python -I tg_kb.py OUTPUT_DIR EXPORT_DIR [EXPORT_DIR ...]
Each EXPORT_DIR is a Telegram Desktop "ChatExport_*" folder containing result.json.

Privacy: author names, user ids, @usernames, phone numbers and e-mails are dropped or masked;
only technical content is kept. The output is third-party material: keep it local, never in git.
"""
import csv
import hashlib
import json
import pathlib
import re
import struct
import sys
from collections import defaultdict

THEMES = {
    "Firmware F4HWN / Fusion / Multiboot": r"f4hwn|fusion|armel|multi ?boot|multiboot|labs edition|fieldops",
    "Firmware Karina / RO-KO / Robzyl / IJV / egzumer / otros": r"karina|ro-?ko|robzyl|robby|\bijv\b|egzumer|fagci|joaquim|osfw|reborn|1o11|oneofeleven|\bcec\b",
    "Flasheo, bootloader y recuperacion": r"flash|прошив|bootloader|dfu|\bptt\b.*(encend|power|вкл)|brick|кирпич|recuper|восстанов|k5prog|uvtools|uv studio|firmware updater",
    "Calibracion": r"calib|калибр|eeprom|0x1e00|0xb000",
    "Programacion: CHIRP, CPS y canales": r"chirp|\bcps\b|programa(r|cion)|канал|memor|codeplug|csv",
    "Hardware V1 / V3 / K1 / K6 y diferencias": r"\bv1\b|\bv3\b|\bk1\b|\bk6\b|k5\(8\)|kr5|py32|dp32|версия|revisi|hardware|плат|placa",
    "Modificaciones: SI4732, BK1080, antena, filtros": r"si473|bk1080|mod(ificac|s?\b)|доработ|antena|антенн|filtro|фильтр|soldar|пайк|smd",
    "Bateria, carga y alimentacion": r"bater|аккум|carga|заряд|usb-?c|consumo|ток",
    "Espectro, escaner y RX": r"spectrum|espectro|спектр|scan|escan|сканер|squelch|шумодав|\brx\b|recepci",
    "Modos digitales y especiales: APRS, SSTV, ARDF, satelites, CW": r"aprs|sstv|ardf|fox ?hunt|sat(elit|ellite|ellit)|спутник|\biss\b|\bcw\b|morse|телеграф|doppler|доплер",
    "Potencia, TX y legalidad": r"potencia|мощност|\btx\b|transmi|передат|licencia|лиценз|pmr|ilegal|legal",
}
THEME_RES = {name: re.compile(pattern, re.I) for name, pattern in THEMES.items()}
PRIVATE = [
    (re.compile(r"\+?\d[\d\s().-]{7,}\d"), "[telefono]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[correo]"),
    (re.compile(r"(?<![\w/])@\w{3,}"), "@[usuario]"),
]
LINK = re.compile(r"https?://[^\s<>\")\]]+")


def text_of(value):
    """Telegram stores text as a string or a list of strings/entities."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(part if isinstance(part, str) else str(part.get("text", "")) for part in value)
    return ""


def scrub(text):
    for pattern, replacement in PRIVATE:
        text = pattern.sub(replacement, text)
    return text.strip()


def firmware_target(path):
    """Classify a Quansheng image by its Cortex-M vector table (SP, reset)."""
    try:
        head = path.read_bytes()[:8]
    except OSError:
        return ""
    if len(head) < 8:
        return ""
    sp, reset = struct.unpack("<II", head)
    if not (0x20000000 <= sp <= 0x20008000):
        return "cifrado/empaquetado o no es imagen ARM"
    if 0x08002800 <= reset < 0x08020000:
        return "V3/K1 (PY32F071, aplicacion en 0x08002800)"
    if reset < 0x00010000 and reset & 1:
        return "V1/K5(8)/K6 (DP32G030, flash en 0x0)"
    return f"desconocido (reset 0x{reset:08x})"


def firmware_version(path):
    try:
        data = path.read_bytes()
    except OSError:
        return ""
    found = re.findall(rb"(?:F4HWN|EGZUMER|Karina|KARINA|RO-?KO|UV-K5)[^\x00\r\n]{0,40}", data)
    return "; ".join(sorted({item.decode("latin-1").strip() for item in found}))[:200]


def load(export_dir):
    export_dir = pathlib.Path(export_dir)
    data = json.loads((export_dir / "result.json").read_text(encoding="utf-8"))
    messages = [m for m in data.get("messages", []) if isinstance(m, dict)]
    by_id = {m.get("id"): m for m in messages}
    topics = {m["id"]: text_of(m.get("title", "")) or "Tema" for m in messages
              if m.get("action") == "topic_created"}
    cache = {}

    def topic_of(message):
        seen = []
        current = message
        while current is not None:
            key = current.get("id")
            if key in cache:
                result = cache[key]
                break
            if key in topics:
                result = topics[key]
                break
            seen.append(key)
            parent = current.get("reply_to_message_id")
            current = by_id.get(parent) if parent is not None else None
        else:
            result = "General"
        for key in seen:
            cache[key] = result
        return result

    return data.get("name", export_dir.name), export_dir, messages, topic_of


def build(output, exports):
    output = pathlib.Path(output)
    output.mkdir(parents=True, exist_ok=True)
    by_theme = defaultdict(list)
    files = {}
    links = defaultdict(set)
    stats = []
    for export in exports:
        name, base, messages, topic_of = load(export)
        kept = 0
        for message in messages:
            if message.get("type") != "message":
                continue
            text = scrub(text_of(message.get("text", "")))
            attachment = message.get("file") or message.get("photo")
            file_name = message.get("file_name") or (pathlib.Path(attachment).name if isinstance(attachment, str) else "")
            for url in LINK.findall(text):
                links[url.rstrip(".,;")].add(name)
            if isinstance(attachment, str) and not attachment.startswith("("):
                path = (base / attachment).resolve()
                if path.is_file() and base.resolve() in path.parents:
                    digest = hashlib.sha256(path.read_bytes()).hexdigest()
                    entry = files.setdefault(digest, {"sha256": digest, "name": file_name or path.name,
                        "bytes": path.stat().st_size, "mime": message.get("mime_type", ""),
                        "first_seen": message.get("date", "")[:10], "groups": set(), "path": str(path)})
                    entry["groups"].add(name)
            haystack = f"{text} {file_name}"
            themes = [theme for theme, pattern in THEME_RES.items() if pattern.search(haystack)]
            if not themes or (len(text) < 40 and not file_name):
                continue
            kept += 1
            record = {"group": name, "topic": topic_of(message), "id": message.get("id"),
                      "date": message.get("date", "")[:16].replace("T", " "), "text": text, "file": file_name}
            for theme in themes:
                by_theme[theme].append(record)
        stats.append((name, len(messages), kept))

    for theme, records in by_theme.items():
        slug = re.sub(r"[^a-z0-9]+", "-", theme.lower()).strip("-")[:60]
        with open(output / f"tema-{slug}.md", "w", encoding="utf-8") as out:
            out.write(f"# {theme}\n\n{len(records)} mensajes. Contenido de terceros, uso privado; sin autores.\n\n")
            for r in sorted(records, key=lambda item: item["date"]):
                out.write(f"## {r['date']} · {r['group']} · {r['topic']} · msg {r['id']}\n\n")
                if r["file"]:
                    out.write(f"Adjunto: `{r['file']}`\n\n")
                out.write(r["text"][:3000] + ("\n\n[...]" if len(r["text"]) > 3000 else "") + "\n\n")

    with open(output / "archivos.csv", "w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)
        writer.writerow(["sha256", "nombre", "bytes", "mime", "primera_vez", "grupos", "radio_objetivo", "version_en_binario", "ruta"])
        for entry in sorted(files.values(), key=lambda e: e["first_seen"]):
            path = pathlib.Path(entry["path"])
            binary = path.suffix.lower() in {".bin", ".hex"}
            writer.writerow([entry["sha256"], entry["name"], entry["bytes"], entry["mime"], entry["first_seen"],
                             " | ".join(sorted(entry["groups"])), firmware_target(path) if binary else "",
                             firmware_version(path) if binary else "", entry["path"]])

    with open(output / "enlaces.md", "w", encoding="utf-8") as out:
        out.write("# Enlaces citados\n\n")
        for url in sorted(links):
            out.write(f"- {url} ({', '.join(sorted(links[url]))})\n")

    with open(output / "INDICE.md", "w", encoding="utf-8") as out:
        out.write("# Base de conocimiento Quansheng (Telegram, privada)\n\n")
        out.write("Material de terceros procesado en local: no publicar ni subir a git. Sin autores, alias, telefonos ni correos.\n\n")
        out.write("| Grupo | Mensajes | Relevantes |\n| --- | ---: | ---: |\n")
        for name, total, kept in stats:
            out.write(f"| {name} | {total} | {kept} |\n")
        out.write(f"\nArchivos unicos: {len(files)} (ver archivos.csv). Enlaces: {len(links)} (ver enlaces.md).\n\n## Temas\n\n")
        for theme in THEMES:
            if theme in by_theme:
                slug = re.sub(r"[^a-z0-9]+", "-", theme.lower()).strip("-")[:60]
                out.write(f"- [{theme}](tema-{slug}.md): {len(by_theme[theme])} mensajes\n")
    return stats, len(files), len(links)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    print(build(sys.argv[1], sys.argv[2:]))
