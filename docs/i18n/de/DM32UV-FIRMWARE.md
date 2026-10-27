# Baofeng DM-32UV: offene Firmware, OpenGD77 und wie man sie baut

Stand: 26-10-2026. Ergebnis der Suche nach dem Quellcode und der Möglichkeit, Firmware
für das DM-32UV auf GitHub, Codeberg, GitLab, GitFlic, der OpenGD77-Website und in den
Telegram-Gruppen OpenGD77 EA, Baofeng DM-32UV EA, Baofeng DM-32UV RU und OpenGD77 Rus zu
bauen. Nichts in diesem Leitfaden wurde an einem Bricohams-Funkgerät getestet: Für jede
Angabe ist die Quelle genannt.

## Zusammenfassung

| Frage | Antwort |
| --- | --- |
| Gibt es Quellcode des OpenGD77-Ports für das DM-32 (OpenDM32)? | **Nein.** Es wird nur als Binärdatei verbreitet. Das bestätigen die Gruppen und die OpenGD77-Website |
| Lässt sich OpenGD77 auf dem DM-32 installieren? | Ja, in einer experimentellen Version: mit der offiziellen CPS (Typ «DM32/UV008») oder [grid.radio](https://grid.radio/opengd77/). Laut den Gruppen gibt es keine stabile Version |
| Gibt es eine offene Firmware, die sich bauen lässt? | **Ja: [RadioFoundry](https://github.com/RadioFoundry/RadioFoundry)** (MIT). FM- und DMR-Sprache in beide Richtungen, CTCSS/DCS, APRS, GPS und Hotspot wurden über Funk getestet |
| Aktuelle Lizenz von OpenGD77? | Seit 2019 BSD-ähnlich mit Verbot der kommerziellen Nutzung (keine GPL). Nur der alte Mirror [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) steht unter GPL-2.0 |
| AMBE-Codec? | Proprietär (DVSI). Kein offenes Projekt verbreitet ihn: Nutzer extrahieren ihn aus der Werksfirmware ihres eigenen Geräts |

## Hardware

| Baustein | Komponente |
| --- | --- |
| SoC | Hongruan HR_C7000 (Dahua DH4570): C-SKY-CK803S-Kern mit 168 MHz, 288 KB SRAM, integriertes DMR/FM-Modem, kein interner Flash |
| HF-Transceiver | FD6818 (kein öffentliches Datenblatt; Register ähneln in ihrer Funktion denen von BK4819/AT1846S) |
| Programm-Flash | GD25Q80 / 25Q16, Klasse 1 MB, Ausführung vor Ort bei `0x03000000` |
| Daten-Flash | GD25Q128 oder Puya PY25Q128HA, 16 MB: Codeplug, Kalibrierung, Kontakte |
| Display | 240x320 Farbe, Controller der ST7789-Klasse am 8-Bit-i8080-Bus |
| Sonstiges | ALPU-MP (I2C-Authentifizierung), RDA5807M (kommerzielles FM), GPS ATGM336H, RTC mit Batterie |
| Programmierung | 2-polige K1-Buchse mit USB-Seriell-Kabel bei 115200 Baud. USB-C befindet sich am Akku und dient nur zum Laden |

Speicherkarte des Programm-Flashs:

| Bereich | Inhalt |
| --- | --- |
| `0x03000000-0x0300BFFF` | Baofeng-Bootloader (Aktualisierungsmodus PTT+SK1). Niemals verändern |
| `0x0300C000-0x030E7FFF` | Anwendung (880 KB in RadioFoundry) |
| `0x030E8000-0x030FFFFF` | Codec-Slot (RadioFoundry) |

Im Daten-Flash liegen unterhalb von `0x700000` der Werks-Codeplug und die
**Kalibrierung** (die 4-KB-Seite, deren letztes Byte den Wert 2 hat). Niemals beschreiben.

Vollständige Details, größtenteils an einem Funkgerät gemessen: [hardware-dm32.md von RadioFoundry](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/spec/hardware-dm32.md),
mit Takt und PLL, Peripherie, Interrupts, Pinbelegung, FD6818-Registern, Audiopfaden,
Kalibrierungsformat und Protokollen. Datenblätter für den HR_C7000 (Dokumente 1 und 2),
annotiertes Platinenfoto und Ladeschaltung unter [yo3hjv/Baofeng-DM32](https://github.com/yo3hjv/Baofeng-DM32)
(ohne Lizenz: hier wird nur darauf verwiesen).

## Werksfirmware-Familien

| Firmware | Familie | Hinweis |
| --- | --- | --- |
| `DM32.01.*` | ROW, am weitesten verbreitet | Grundlage von OpenDM32 und RadioFoundry (`DM32.01.01.049`) |
| `DM32.NRF.*` / Fanti | Taiwan, derselbe Zweig wie `01.*` | |
| `DM32.00.*` / `UV32.*` | HR-Vocoder | RadioFoundry unterstützt den Codec (`DM32.00.01.046HRVocoder`) |

Ein Wechsel zwischen Familien führt zu einem Soft-Brick: Wiederherstellung im
Aktualisierungsmodus (PTT+SK1). Datei `BFUV32-V2`: 256-Byte-Kopfzeile (`BFUV32-V2` ... `END`)
und danach das rohe, bei `0x0300C000` gelinkte Image. Sie ist weder verschlüsselt noch signiert.

## Schritt 0: Sicherung

Sichere vor jeder Firmware beide Flash-Speicher. Sie enthalten die **Kalibrierung RX/TX**
und den ALPU-Schlüssel, die für jedes Funkgerät einzigartig sind:

- `OpenUV008_Flasher_v1` von andynvkz ([infotex58, Thema 1155](http://infotex58.ru/forum/index.php?topic=1155.0)): Funkgerät ausgeschaltet lassen, Read wählen und auf Aufforderung einschalten. Für Programm- und Daten-Flash wiederholen.
- Alternative: die Python-Skripte von [rogerclarkmelbourne/DM32](https://github.com/rogerclarkmelbourne/DM32/tree/main/python).
- grid.radio bietet im Browser ebenfalls Backup/Restore der beiden Chips.
- Wenn ein Kabel nicht funktioniert, einen anderen USB-Seriell-Chip (CH340, FTDI oder CP2102) probieren. Laut RadioFoundry antwortet das ROM des HR_C7000 nur mit FTDI.

## OpenGD77 installieren (experimentell)

1. Schritt 0 ausführen und die Dateien sicher aufbewahren.
2. OpenGD77 CPS `E2026.05.26.01` oder neuer installieren ([experimentelle Downloads](https://www.opengd77.com/downloads/PC_CPS/Experimental/)).
3. Unter Radio Type **DM32/UV008** auswählen und Extras > Firmware loader öffnen.
4. Funkgerät ausgeschaltet lassen: **PTT + SK1** gedrückt halten und einschalten. Die grüne LED zeigt den Aktualisierungsmodus an. Kabel anschließen.
5. Firmware auswählen (Referenz: `OpenGD77_DM32_20260704.bin`) und den Vorgang abschließen lassen.
6. Den Standard-Codeplug schreiben.
7. Um zur Werksfirmware zurückzukehren, mit der Baofeng-CPS im Aktualisierungsmodus wiederholen.

Alternative ohne Installation: [grid.radio](https://grid.radio/opengd77/) mit Chrome oder Edge
(Web Serial, ohne Zadig). Quelle des Verfahrens: [Anleitung von xreflector.es (PDF)](https://radio.xreflector.es/wp-content/uploads/2026/07/Install-OpenGD77-on-Baofeng-DM-32_EN.pdf).

Laut den Gruppen (August bis Oktober 2026): keine stabile Version, leise DMR-Audioausgabe
und mehrere Fehler. Nur die Familie `01.*` wird unterstützt. Autoren: andynvkz (UV008-Port),
Koshak und RA4FHE (DM-32), Roger VK3KYY (CPS).

## Firmware bauen: RadioFoundry

[RadioFoundry](https://github.com/RadioFoundry/RadioFoundry) ist eine neue, offene DMR-Firmware
(MIT, erstellt am 24-10-2026) mit gemeinsamem Kern und einer Ebene pro Funkgerät. Sie leitet
sich nicht aus dem OpenGD77-Code ab. Es gibt noch keine Releases: Die Firmware muss gebaut werden.

```text
git clone https://github.com/RadioFoundry/RadioFoundry
cd RadioFoundry
git submodule update --init
tools/build-csky-toolchain.sh            # GCC csky-elf en ~/toolchains/csky-elf (unos 45 min)
make BOARD=dm32                          # build/dm32/rfoundry_dm32.bin
tools/hrc7000_codec.py --stock DM32.01.01.049.bin   # tu firmware de fabrica: anade el codec en local
tools/serial_loader.py --model dm32 build/dm32/rfoundry_dm32_codec.bin --wrap build/dm32/rfoundry_dm32_codec_BFUV32.bin
```

| Schritt | Details |
| --- | --- |
| Toolchain | `tools/build-csky-toolchain.sh` oder Docker-Image `tools/docker/csky-toolchain/run.sh make BOARD=dm32` |
| Codec | `tools/hrc7000_codec.py` prüft die Werksfirmware mit SHA-256 und kopiert den Codec auf deinen Rechner. Er wird nie ins Repository hochgeladen oder geteilt. Ohne Codec funktioniert nur FM |
| Flashen | `tools/serial_loader.py` verwendet das Baofeng-Bootloader-Protokoll (YMODEM bei 115200). `--wrap` erstellt die Datei `BFUV32-V2` für den offiziellen Updater. `--stock ARCHIVO` stellt die Werksfirmware wieder her |
| Codeplug migrieren | Zuerst `tools/dm32_migrate.py all --image ... --dry-run`. Verwendet `dmrconf` von qdmr 0.15 |
| Sicherheit | RadioFoundry verändert weder den Bootloader noch den Daten-Flash unterhalb von `0x700000` |
| Status | Laut eigener Dokumentation wurden die Flash- und Migrationstools noch nicht an einem Funkgerät getestet. Mit `--dry-run` beginnen, Antenne anschließen und erst nach Überprüfung senden |

Boot-Checkliste: [dm32-bringup.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/testing/dm32-bringup.md).

## Baofeng-Bootloader-Protokoll

Mit PTT + SK1 beim Einschalten starten (grüne LED). Kabel mit 115200 8N1.

| Schritt | Host | Funkgerät |
| --- | --- | --- |
| 1 | `52` | `06` |
| 2 | `4D 00 00 00 01` | `4D 01 09` |
| 3 | `06` | `BFUV32-V2` |
| 4 | `45 00 00 00 00` | `06` |
| 5 | `31` | `43` |
| 6 | `01` | `43` |
| 7 | `00 FF` + 128-Byte-Block (Name, NUL, Größe als ASCII) + CRC-16/XMODEM. Löscht die Anwendung (bis zu 15 s) | `06 43` |
| 8 | Für jedes KB: `02`, Nummer n, `FF-n`, 1024 Bytes, CRC | `06` |
| 9 | `04` | Neustart | 

Der Bootloader ist separat gespeichert und übersteht einen fehlgeschlagenen Schreibvorgang:
Wenn das Image nicht startet, Akku entfernen und erneut in den Aktualisierungsmodus wechseln.

## Weitere gefundene Ressourcen

| Ressource | Beitrag |
| --- | --- |
| [M7OCM/DM-32UV](https://github.com/M7OCM/DM-32UV) | CPS-Archiv und offizielle Firmware; Zweig Mods mit gepatchter Werksfirmware (ohne ALPU-Prüfung, erweiterte Bänder, GPS-NMEA-Korrektur) und Patch-Skript |
| [Chicago-Offline/dm32-info](https://github.com/Chicago-Offline/dm32-info) | Spezifikationen, Firmwareversionen mit SHA-256 und Community-Karte |
| [gzalo/dm32-uv](https://github.com/gzalo/dm32-uv) (MIT) | Reverse Engineering des Bootloaders und ROMs |
| [infamy/DM32-Protocol-Spec](https://github.com/infamy/DM32-Protocol-Spec) | CPS-Programmierprotokoll |
| [chaffed/CHiRP-DM32UV-Support](https://github.com/chaffed/CHiRP-DM32UV-Support), [fivelidz/dm32uv-linux](https://github.com/fivelidz/dm32uv-linux), [insideTheFlux/dm32uv-tools](https://github.com/insideTheFlux/dm32uv-tools) | Codeplug-Programmierung mit CHIRP, Linux und Mapping-Tools |
| Offene FD6818-Treiber | [bf-k61-firmware-aura](https://github.com/sophiel-meow/bf-k61-firmware-aura) (GPL-3.0, Rust) |
| [jasiek/baocoder](https://github.com/jasiek/baocoder) | Aus dem DM-32 extrahierter AMBE-Codec: proprietär, **nicht verwenden** |
| [dongrat/HR_C70X0SDKlib](https://github.com/dongrat/HR_C70X0SDKlib) | Als HR_C7000-SDK angekündigt, am 26-10-2026 jedoch leer |
| GitFlic, GitLab, Codeberg | Nichts zum DM-32 oder HR_C7000 |

## Lizenzen und Einschränkungen

- RadioFoundry steht unter MIT; die aktuelle OpenGD77-Lizenz verbietet kommerzielle Nutzung; OpenDM32 veröffentlicht keinen Quellcode. Es wird kein Code inkompatibler Lizenzen vermischt und keine Firmware Dritter weitergegeben.
- Der AMBE-Codec wird nur verwendet, wenn er aus der Werksfirmware des eigenen Funkgeräts extrahiert wurde.
- Kalibrierung und ALPU-Schlüssel sind gerätespezifisch: nicht von einem anderen Gerät kopieren.
- Nur in zugelassenen Bändern senden, auch wenn eine modifizierte Firmware es ermöglicht.

Bricohams pflegt außerdem ein technisches Dossier und ein Port-Grundgerüst für C-SKY im privaten
Repository `dm32uv-opengd77-port`. Derzeit wird empfohlen, RadioFoundry zu bauen.