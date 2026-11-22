# Prüfung von karina-v3-k1 und Integration in BricoHams (UV-5K V3)

## Dokumentierte Upstream-Prüfung

| Feld | Wert |
|---|---|
| Repository | https://github.com/autumn1rain/karina-v3-k1 |
| Revision (HEAD) | `0f5dbcba599b3598e6d415352ef9fd234d2d2a79` (letzter Push 2026-11-04) |
| Lizenz | Apache-2.0 |
| Releases | `v2026.11.02` (karina-v3/k1 `.bin` und `.packed.bin`, `calibration.bin`; „fix button lock fn1 fn2 by keyboard lock F“) und `v2026.10.30` |
| Angegebene Basis | fagci uv-k5 mod v1.2.1 |
| Inhalt | Nur README (5 Sprachen), PDF-Handbuch, LICENSE und Dokumentationsseite. **Es gibt keinen Firmware-Quellcode.** |

## Methode und Lizenzen

Upstream veröffentlicht keine Quellen, daher wird keine Binärdatei kopiert oder dekompiliert.
Die portierten Funktionen sind eine unabhängige Neuimplementierung (Clean-Room) auf Grundlage des
im öffentlichen Handbuch beschriebenen Verhaltens, aufbauend auf der in BricoHams bereits festgelegten F4HWN-Basis.
Der neue Code steht unter GPL-3.0-or-later (BricoHams); die Apache-2.0-Hinweise der Basis bleiben erhalten.
autumn1rain/karina-v3-k1 (Apache-2.0) wird als Ursprung der funktionalen Ideen genannt.
Die Firmwares bleiben mit `derivedFromKarina:false` markiert.

## Inventar

| Karina-Funktion | Status in BricoHams | Grund |
|---|---|---|
| Scan-Listen, CTCSS/DCS-Scan | Vorhanden | F4HWN `SCAN_SUBAUDIBLE`, Scan-Listen |
| Roger, Scrambler, AFC, AM fix, LNA, rx_filt, STE | Vorhanden | In der Basis enthalten |
| Tastensperre und seitliche FN1/FN2 (Fix v2026.11.02) | Vorhanden | `set_lck` / `SET_LCK_ACTIONS` |
| Spektrum mit Presets, Blacklist, RX-Aufnahme | Vorhanden | Spectrum-Modul |
| **Integrierte Band-Presets** | **Portiert** (Spectrum, Taste 2) | 11 RX-Fenster innerhalb von 136–174 / 400–470 MHz |
| **Loot (Aufnahmeliste)** | **Portiert** (Spectrum, Tasten 1/7 bei der Aufnahme) | 32 Einträge, ohne Alter; nur RX |
| Auto-Beacons F+1/2/3, DCS→dBm-Tabelle, PTT-Holder, Randomizer | Inkompatibel | TX: kollidiert mit den RF-Grenzen; ARDF/Satellite/Spectrum deaktivieren das Beacon |
| Tx3k, DEV, 03t, c0db, SCR-Register, F_Corr/PWR | Inkompatibel | Sie schreiben Kalibrierung oder RF-Register |
| Konfigurations-Presets 0/1/2, Sql2, FN1/FN2-Belegung | Inkompatibel | Sie ändern das Layout von Speicher/vorheriger Konfiguration |
| Presets CB, 10 m, 7 m, 6 m, Air, Sat 240, Riv 300, LoRa, GSM, 23 cm | Inkompatibel | Außerhalb der RX-Schutzgrenze des Moduls |
| Schritte 25/100 kHz im Spektrum | Inkompatibel | Das Modul unterstützt 1,25/2,5/6,25/12,5 kHz und 128 Bins |
| Turbo, ECO, Mult, hybrider Squelch, dynamische Lautstärke, Modem, AM-Ton | Nicht portiert | Kein Flash-/RAM-Spielraum (Spectrum: 1364 B frei) oder nicht dokumentierter Algorithmus |
| Karina-Builds K1/V1, eigener Bootloader | Außerhalb des Umfangs | Andere Hardware/anderer Bootloader |

Die Bandfenster verwenden 128 Bins bei 12,5 kHz (6,25 kHz bei PMR), nicht die 80–160 Schritte bei
25 kHz von Karina.

## Tests

Software (ausgeführt): `bands_loot_test`, `spectrum_adapter_test` (Zyklus über 11 Bänder, RF-Grenzen,
Loot mit Deduplizierung, Scrollen und Blacklist), `presets_test`, `spectrum_test` mit `-Wall -Wextra -Wconversion -Werror`;
`node --test tests/bricohams-build.test.cjs` (15/15); Kompilierung der Spectrum-Variante mit ARM GCC 13.3.1.

Spectrum-Build: Image 119 468 B (Slot 120 832 B, 1 364 B frei), RAM 13 600 B (2 784 B frei).
Kalibrierung, RF-Grenzen und Vektoren unverändert; keine neuen persistenten Schreibvorgänge.

Auf Hardware ausstehend (UV-5K V3): Start, LCD/Tasten, tatsächliches Verhalten von Bändern und Loot.
Die Varianten fusion, labs, ardf und satellite enthalten diese Quellen nicht und wurden nicht neu kompiliert.

## Reproduzierbare Spectrum-Kompilierung (2026-11-04)

Zwei unabhängige Kompilierungen mit `--preset FieldOps --module spectrum --option ENABLE_FEAT_F4HWN_BEACON=OFF` (ARM GCC 13.3.1, F4HWN-Basis v6.1.0 `f556a96`, lokale unveröffentlichte Fusion61-Quellen) ergaben eine identische `bricohams.fieldops.spectrum.v6.1.0.bin`:
120 284 B (Slot 120 832 B, 548 B frei), SHA-256 `CF5E8C52B9599D4CF68D1F003991D758A92B2FFD6BB4E30DFC090333261A8145`. Auch die `.elf` und `build-info.json` stimmen überein.
11/11 Host-Tests der Firmware erfolgreich. **Die Binärdatei ist nicht im signierten Katalog**: Es gibt weder einen physischen Test auf einem UV-5K V3 noch eine CI-Signatur. Am 2026-11-05 nur als unsignierter Pre-Release veröffentlicht (`fw-spectrum-presets-v6.1.0`).

Ausstehende Schritte am realen Funkgerät (kein blindes Flashen): 1) vollständige Sicherung des Funkgeräts mit dem F4HWN-Ablauf von Web Install und Überprüfung ihrer CRC; 2) das Image nur mit einem Bootloader/Multiboot laden, der den Slot unterstützt, und mit einem Wiederherstellungskabel; 3) Start, LCD/Tasten, Taste 2 (11 Bänder, nur RX) und Tasten 1/7 bei der Aufnahme (Loot) prüfen; 4) die Sicherung wiederherstellen und die F4HWN-Erkennung sowie die automatische Sicherung mit einem gestörten UART-Frame bestätigen.
