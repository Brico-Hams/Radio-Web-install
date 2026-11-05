#!/usr/bin/env python3
"""Genera un vídeo por firmware Bricohams (UV-K5 V3 / UV-K1) desde precompiled/catalog.json.

No hay emulación del firmware: las escenas son RECREACIONES etiquetadas, con datos
tomados únicamente del catálogo firmado (tamaño, SHA-256, opciones, módulos).
Salida: docs/video/firmware/<id>.mp4 (subtítulos es/en/de/fr/it incrustados) y .<lang>.srt.
Requiere Pillow y ffmpeg.
"""
import json, os, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "video" / "firmware"
LANGS = ["es", "en", "de", "fr", "it"]
W, H, FPS, SLIDE = 1280, 720, 10, 5.0
BG, FG, ACC, WARN, LCD_BG, LCD_FG = (18, 22, 28), (236, 240, 244), (255, 193, 143), (255, 96, 96), (170, 190, 150), (20, 28, 20)

def font(size, bold=False):
    for name in (("consolab.ttf" if bold else "consola.ttf"), "DejaVuSansMono.ttf"):
        for base in (r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu"):
            p = Path(base) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

T = {
    "banner": {"es": "RECREACIÓN FIEL · NO ES CAPTURA DEL HARDWARE", "en": "FAITHFUL RECREATION · NOT A HARDWARE CAPTURE",
               "de": "GETREUE NACHBILDUNG · KEINE HARDWARE-AUFNAHME", "fr": "RECONSTITUTION FIDÈLE · PAS UNE CAPTURE MATÉRIELLE",
               "it": "RICOSTRUZIONE FEDELE · NON È UNA CATTURA HARDWARE"},
    "intro": {"es": "{ed} {ver} para UV-K5 V3 / UV-K1. Sin emulador del firmware: escenas recreadas con datos del catálogo firmado.",
              "en": "{ed} {ver} for UV-K5 V3 / UV-K1. No firmware emulator: scenes recreated from signed catalog data.",
              "de": "{ed} {ver} für UV-K5 V3 / UV-K1. Kein Firmware-Emulator: Szenen aus den signierten Katalogdaten nachgebildet.",
              "fr": "{ed} {ver} pour UV-K5 V3 / UV-K1. Pas d'émulateur du firmware : scènes reconstituées à partir du catalogue signé.",
              "it": "{ed} {ver} per UV-K5 V3 / UV-K1. Nessun emulatore del firmware: scene ricostruite dai dati del catalogo firmato."},
    "ident": {"es": "Identidad verificada: {size} bytes, {free} bytes libres en el slot de 120832 B, SHA-256 {sha}…",
              "en": "Verified identity: {size} bytes, {free} bytes free in the 120832 B slot, SHA-256 {sha}…",
              "de": "Geprüfte Identität: {size} Bytes, {free} Bytes frei im 120832-B-Slot, SHA-256 {sha}…",
              "fr": "Identité vérifiée : {size} octets, {free} octets libres dans le slot de 120832 o, SHA-256 {sha}…",
              "it": "Identità verificata: {size} byte, {free} byte liberi nello slot da 120832 B, SHA-256 {sha}…"},
    "opts": {"es": "Opciones de compilación verificadas: {on} activas y {off} desactivadas; módulos: {mods}.",
             "en": "Verified build options: {on} enabled and {off} disabled; modules: {mods}.",
             "de": "Geprüfte Build-Optionen: {on} aktiv, {off} inaktiv; Module: {mods}.",
             "fr": "Options de compilation vérifiées : {on} actives, {off} désactivées ; modules : {mods}.",
             "it": "Opzioni di build verificate: {on} attive, {off} disattivate; moduli: {mods}."},
    "feat": {"es": "Función del módulo según el manifiesto: {text}", "en": "Module feature per the manifest: {text}",
             "de": "Modulfunktion laut Manifest: {text}", "fr": "Fonction du module selon le manifeste : {text}",
             "it": "Funzione del modulo secondo il manifesto: {text}"},
    "status": {"es": "Estado: Beta, compilado con ARM GCC 13.3.1. No probado en hardware: no flashees sin copia completa y cable de recuperación.",
               "en": "Status: Beta, built with ARM GCC 13.3.1. Not hardware-tested: do not flash without a full backup and a recovery cable.",
               "de": "Status: Beta, gebaut mit ARM GCC 13.3.1. Nicht auf Hardware getestet: nicht ohne vollständiges Backup und Wiederherstellungskabel flashen.",
               "fr": "Statut : bêta, compilé avec ARM GCC 13.3.1. Non testé sur matériel : ne flashez pas sans sauvegarde complète ni câble de récupération.",
               "it": "Stato: Beta, compilato con ARM GCC 13.3.1. Non testato su hardware: non flashare senza backup completo e cavo di recupero."},
}
FEAT = {
    "ardfStatistics": {"lines": ["ARDF", "STATISTICS", "KEY 8: OBSERVE", "SNAPSHOT 140 B"],
        "text": {"es": "estadísticas ARDF, instantánea de 140 B, observación manual con la tecla 8, sin escrituras persistentes.",
                 "en": "ARDF statistics, 140 B snapshot, manual observation on key 8, no persistent writes.",
                 "de": "ARDF-Statistik, 140-B-Snapshot, manuelle Beobachtung mit Taste 8, keine dauerhaften Schreibvorgänge.",
                 "fr": "statistiques ARDF, instantané de 140 o, observation manuelle avec la touche 8, sans écriture persistante.",
                 "it": "statistiche ARDF, snapshot da 140 B, osservazione manuale con il tasto 8, nessuna scrittura persistente."}},
    "spectrumPresets": {"lines": ["SPECTRUM", "PRESETS 208 B", "CHUNKS 104 B", "PAUSED SCAN"],
        "text": {"es": "presets de espectro de 208 B en bloques de 104 B; requiere escaneo en pausa; sin escrituras persistentes.",
                 "en": "208 B spectrum presets in 104 B chunks; paused scan required; no persistent writes.",
                 "de": "208-B-Spektrum-Presets in 104-B-Blöcken; pausierter Scan nötig; keine dauerhaften Schreibvorgänge.",
                 "fr": "préréglages de spectre de 208 o par blocs de 104 o ; balayage en pause requis ; sans écriture persistante.",
                 "it": "preset di spettro da 208 B in blocchi da 104 B; scansione in pausa richiesta; nessuna scrittura persistente."}},
    "satPasses": {"lines": ["SATELLITE", "CAT RX KEY 8", "CAT TX KEY 9", "PASSES KEY 0"],
        "text": {"es": "CAT RX (tecla 8), CAT TX armado con tecla 9 (cualquier tecla aborta, máx. 120 s) y 64 pasos en tecla 0.",
                 "en": "CAT RX (key 8), CAT TX armed with key 9 (any key aborts, max 120 s) and 64 passes on key 0.",
                 "de": "CAT RX (Taste 8), CAT TX mit Taste 9 scharfgeschaltet (jede Taste bricht ab, max. 120 s) und 64 Überflüge auf Taste 0.",
                 "fr": "CAT RX (touche 8), CAT TX armé par la touche 9 (toute touche interrompt, max. 120 s) et 64 passages sur la touche 0.",
                 "it": "CAT RX (tasto 8), CAT TX armato con il tasto 9 (qualsiasi tasto interrompe, max 120 s) e 64 passaggi sul tasto 0."}},
    "plain": {"lines": ["F4HWN BASE", "MULTIBOOT", "BACKUP READ", "CRC 0x073E"],
        "text": {"es": "base F4HWN multiboot con lectura física de respaldo (0x0738) y CRC (0x073e), sin ampliar escritura RAW.",
                 "en": "F4HWN multiboot base with physical backup read (0x0738) and CRC (0x073e), without widening RAW writes.",
                 "de": "F4HWN-Multiboot-Basis mit physischem Backup-Lesen (0x0738) und CRC (0x073e), ohne RAW-Schreibrechte zu erweitern.",
                 "fr": "base F4HWN multiboot avec lecture physique de sauvegarde (0x0738) et CRC (0x073e), sans élargir l'écriture RAW.",
                 "it": "base F4HWN multiboot con lettura fisica di backup (0x0738) e CRC (0x073e), senza ampliare la scrittura RAW."}},
}

def feature(build):
    mod = "satPasses" if "satPasses" in build else "ardfStatistics" if "ardfStatistics" in build else \
        "spectrumPresets" if "spectrumPresets" in build else "plain"
    return FEAT[mod]

def wrap(draw, text, fnt, width):
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= width:
            cur = trial
        else:
            lines.append(cur); cur = word
    return lines + [cur]

def base(title, idx):
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 64], fill=(40, 20, 20)); d.text((24, 14), "RECREACIÓN / RECREATION · NOT A HARDWARE CAPTURE", font=font(28, True), fill=WARN)
    d.text((24, 84), title, font=font(40, True), fill=ACC)
    d.text((W - 90, H - 40), f"{idx}/5", font=font(24), fill=(140, 150, 160))
    return img, d

def lcd(d, lines, x=640, y=170):
    d.rectangle([x, y, x + 560, y + 280], fill=LCD_BG, outline=(90, 100, 90), width=6)
    f = font(40, True)
    for i, line in enumerate(lines):
        d.text((x + 28, y + 24 + i * 60), line, font=f, fill=LCD_FG)
    d.text((x, y + 300), "LCD 128x64 (recreation)", font=font(22), fill=(140, 150, 160))

def slides(e):
    b = e["build"]; opts = b["effectiveOptions"]
    on = sorted(k for k, v in opts.items() if v is True); off = sorted(k for k, v in opts.items() if v is False)
    mods = ", ".join(b.get("modules", [])) or "—"; feat = feature(b)
    out = []
    img, d = base(e["edition"] + " " + e["version"], 1); lcd(d, ["BRICOHAMS", e["edition"].replace("BH ", "").upper(), e["version"], "F4HWN BASE"])
    d.text((24, 170), "UV-K5 V3 / UV-K1", font=font(36), fill=FG); d.text((24, 230), "Beta · hardwareBootTested=false", font=font(30), fill=FG)
    out.append(img)
    img, d = base("Identity (catalog.json)", 2)
    rows = [f"id      {e['id']}", f"size    {e['size']} B", f"free    {b['memory']['slotFreeBytes']} B / slot {b['memory']['slotCapacityBytes']} B",
            f"preset  {b['preset']}", f"sha256  {e['sha256'][:32]}", f"        {e['sha256'][32:]}", f"gcc     13.3.1"]
    for i, r in enumerate(rows): d.text((40, 170 + i * 52), r, font=font(34), fill=FG)
    out.append(img)
    img, d = base("Build options", 3)
    d.text((40, 170), f"ON: {len(on)}   OFF: {len(off)}   modules: {mods}", font=font(34), fill=FG)
    shown = [k for k in off if "VOX" in k or "BEACON" in k or k in ("ENABLE_NOAA", "ENABLE_VOICE", "ENABLE_AIRCOPY")]
    d.text((40, 240), "OFF (selection):", font=font(30, True), fill=ACC)
    for i, k in enumerate(shown): d.text((60, 290 + i * 42), "x " + k, font=font(30), fill=FG)
    d.text((660, 240), "ON (selection):", font=font(30, True), fill=ACC)
    sel = [k for k in on if k in ("ENABLE_SPECTRUM", "ENABLE_FEAT_F4HWN_FOXHUNT", "ENABLE_FEAT_F4HWN_MULTIBOOT", "ENABLE_UART", "ENABLE_USB", "ENABLE_SWD")]
    for i, k in enumerate(sel): d.text((680, 290 + i * 42), "+ " + k, font=font(30), fill=FG)
    out.append(img)
    img, d = base("Module feature (manifest)", 4); lcd(d, feat["lines"])
    out.append(img)
    img, d = base("Status", 5)
    for i, r in enumerate(["Beta · built from pinned upstream f556a96", "Catalog signed (Ed25519); web installer verifies it",
                           "NOT hardware-tested: backup + recovery cable first", "Recreation: no real LCD/keys were captured"]):
        d.text((40, 180 + i * 70), r, font=font(34), fill=FG)
    out.append(img)
    return out, dict(ed=e["edition"], ver=e["version"], size=e["size"], free=b["memory"]["slotFreeBytes"], sha=e["sha256"][:12],
                     on=len(on), off=len(off), mods=mods, text=None, feat=feat)

def ts(t):
    ms = int(round(t * 1000)); return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"

def make(e, tmp):
    imgs, ctx = slides(e); frames = Path(tmp) / e["id"]; frames.mkdir(parents=True, exist_ok=True)
    for i, img in enumerate(imgs): img.save(frames / f"s{i}.png")
    OUT.mkdir(parents=True, exist_ok=True)
    srts = {}
    for lang in LANGS:
        cues = [T["intro"][lang].format(**ctx), T["ident"][lang].format(**ctx), T["opts"][lang].format(**ctx),
                T["feat"][lang].format(text=ctx["feat"]["text"][lang]), T["status"][lang]]
        srts[lang] = "\n".join(f"{i + 1}\n{ts(i * SLIDE + .1)} --> {ts((i + 1) * SLIDE - .1)}\n{c}\n" for i, c in enumerate(cues))
        (OUT / f"{e['id']}.{lang}.srt").write_text(srts[lang], encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for i in range(5): cmd += ["-loop", "1", "-t", str(SLIDE), "-framerate", str(FPS), "-i", str(frames / f"s{i}.png")]
    for lang in LANGS: cmd += ["-i", str(OUT / f"{e['id']}.{lang}.srt")]
    filt = "".join(f"[{i}:v]" for i in range(5)) + "concat=n=5:v=1:a=0,format=yuv420p[v]"
    cmd += ["-filter_complex", filt, "-map", "[v]"]
    for i in range(len(LANGS)): cmd += ["-map", str(5 + i)]
    cmd += ["-c:v", "libx264", "-crf", "28", "-c:s", "mov_text", "-movflags", "+faststart"]
    for i, lang in enumerate(LANGS): cmd += [f"-metadata:s:s:{i}", f"language={'spa eng deu fra ita'.split()[i]}", f"-metadata:s:s:{i}", f"title={lang}"]
    cmd += [str(OUT / f"{e['id']}.mp4")]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    catalog = json.loads((ROOT / "precompiled" / "catalog.json").read_text(encoding="utf-8"))
    ids = {"bricohams-fusion", "bricohams-labs", "bricohams-ardf", "bricohams-satellite", "bricohams-spectrum"}
    with tempfile.TemporaryDirectory() as tmp:
        for e in catalog["entries"]:
            if e["id"] in ids:
                make(e, tmp); print("ok", e["id"])
