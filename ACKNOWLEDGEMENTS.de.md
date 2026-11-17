# Danksagungen und Quellen

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace ist eine **unabhängige Implementierung für Interoperabilität**. Dokumentierte oder veröffentlichte Formate und Protokolle wurden untersucht. Der vorkompilierte Katalog verteilt F4HWN-v6.1.0-Images und Bricohams-Ableitungen: Apache-2.0-Lizenz und NOTICE des Ursprungsprojekts bleiben erhalten, ergänzt um GPL-3.0-or-later für Bricohams-Beiträge. Hashes, Herkunft und Optionen stehen in `precompiled/catalog.json`; Hinweise und beide Lizenzen liegen den Binärdateien bei. Es besteht keine Verbindung zu den genannten Projekten oder Unterstützung durch sie. Marken gehören ihren jeweiligen Inhabern.

## Protokoll- und Formatreferenzen

Die nativen Werkzeuge für Viewer/Tastatur, Neustart, Wartung, DFU, App-Verwaltung und RF-Filterung/-Export sind unabhängige Implementierungen für Interoperabilität. Sie laden keine UV-Studio-Skripte und kopieren dessen Oberfläche nicht. Dadurch geht die Urheberschaft fremder Firmware, Apps, Logos oder Ressourcen nicht auf Bricohams über; es stellt auch keine rechtliche Garantie dar. Originallizenzen und Hinweise bleiben verbindlich.

| Projekt | Verwendung als Referenz | Lizenz |
| --- | --- | --- |
| [OpenGD77-Web-CPS (grid.radio)](https://grid.radio/opengd77/) | CPS-Protokoll `C`/`R`/`W`/`X`, Modi, Speicherbelegung, Treiberanleitung | Website Dritter |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Codeplug-Format und benutzerdefinierter Datenblock (Satelliten vom Typ 3) | GPL-2.0 |
| [CHIRP-to-TK11-csv](https://github.com/nikantgr/CHIRP-to-TK11-csv) `convert_chirp_to_tk11.py` (© 2025 Nikos K. Kantarakias, SY1EBE) | TK-11-CSV-Importformat (Spalten, Werte, Töne) und Umwandlung von CHIRP nach TK-11; die Logik von `chirpToTk11Rows` und `tk11RowsToCsv` in `tk11-connector.js` ist eine geänderte JavaScript-Portierung (Leistung aus CHIRP übernommen, keine Regionalvariante) | GPL-3.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) und dessen [Wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, Slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Slot-/Sicherungsablauf und LCD/RF-Log-Interoperabilitätsreferenz; festgelegte Revision `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. Der Web-Viewer ist unabhängig implementiert, keine Kopie des Website-Codes | Website Dritter |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Vorgänger der F4HWN-Firmware und ihres Protokolls | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Quansheng-Basisprotokoll | Apache-2.0 |
| [(tr)uSDX · DL2MAN](https://dl2man.de/) und [uSDX · PE1NNZ](https://github.com/threeme3/usdx) | **Mitautoren der (tr)uSDX-Unterstützung** der APK: Guido (PE1NNZ, Konzept, Schaltung und Code des uSDX) und Manuel (DL2MAN, (tr)uSDX, Sandwich-Platine und Klasse-E-Tiefpass). CAT-Befehle und Audiostreaming nach [„(tr)uSDX Details“](https://dl2man.de/5-trusdx-details/). Ihr Code wird nicht wiederverwendet | Projekt und Firmware ihrer Autoren |
| Handbücher von Yaesu (FT-817ND/818ND/857D/897D, FTX-1 CAT 2508-C) und Icom (IC-705 CI-V Rev. 6) | Multi-Radio-CAT der APK, nach diesen Dokumenten geschrieben | Herstellerdokumentation |
| CAT-Handbücher von QRP Labs (QMX Firmware 1.04_003, QDX Rev. 1.06) | QMX/QMX+- und QDX/QDX-M-CAT der APK, nach diesen Dokumenten geschrieben | Herstellerdokumentation |
| [icom-custom-firmware · sq6emm](https://github.com/sq6emm/icom-custom-firmware) (Dawid SQ6EMM), [Webseite](https://sq6emm.github.io/icom-custom-firmware/) und [Forenthread](https://mikrofale.cafe/showthread.php?tid=1296) | Icom-IC-705/IC-9700-Custom-Firmware für Transverter, nur als Patches verteilt. Unverändert in `third_party/icom-custom-firmware/` enthalten (Commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`, Lizenz in [LICENSE](third_party/icom-custom-firmware/LICENSE)); die Seite `icom.html` nutzt den Browser-Patcher des Projekts. Bricohams hat sie auf keinem Funkgerät getestet | MIT |
| [ic705-ic9700-ic905-bring-your-own-firmware · sq6emm](https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware) (Dawid SQ6EMM) | Reverse-Engineering-Dokumentation der Icom-IC-705/IC-9700/IC-905-Firmware (Containerformat, Flash-Karte, Frequenzbereiche, undokumentiertes CI-V) und Python-Werkzeuge. Unverändert in `third_party/icom-byof/` enthalten (Commit `a91231f64e8afbe34353994786e8276a3b54f1a9`, Lizenz in [LICENSE](third_party/icom-byof/LICENSE)); zusammengefasst in `docs/ICOM-FIRMWARE-INTERNALS.md`. Es ist keine Icom-Firmware enthalten | MIT |
| [FT8CN](https://github.com/N0BOY/FT8CN) (BG7YOZ) | Nur untersucht, um zu verstehen, wie es CAT, USB-Seriell und Audio unter Android löst; kein Code und keine Ressourcen übernommen | MIT |
| [OscarWatch · magicbug/OscarWatch-Tracker](https://github.com/magicbug/OscarWatch-Tracker) (© 2026 Peter Goodhall, MM9SQL) | Nur Funktionsideen: Überflüge als `.ics`-Kalender exportieren, gemeinsame Überflüge mit einer DX-Station per Locator und Tag/Nacht-Grenze auf der Karte. Von Grund auf in Kotlin und JavaScript nach RFC 5545 und astronomischen Standardformeln neu implementiert; kein C#-Code, Text oder Asset wird kopiert oder übersetzt | AGPL-3.0-or-later |

### Yaesu FTX-1 (`third_party/ftx1/`)

Unveränderte Kopien, auf den angegebenen Commit fixiert, als Referenz für `docs/FTX1-KNOWLEDGE.md` und zur Neuimplementierung von FTX-1-CAT-Befehlen. Es wird kein Code kopiert. Details und Lizenzstatus in [`third_party/ftx1/SOURCES.md`](third_party/ftx1/SOURCES.md).

| Projekt | Commit | Lizenz |
| --- | --- | --- |
| [evertonma/FTX-1CAT_PR2EM_Android](https://github.com/evertonma/FTX-1CAT_PR2EM_Android) | `80aa3a2` | PolyForm Noncommercial 1.0.0 |
| [Evgeny161rus/ftx1-region-tool](https://github.com/Evgeny161rus/ftx1-region-tool) | `ba3692e` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [Semyonic/ftx1-programmer](https://github.com/Semyonic/ftx1-programmer) | `304d486` | GPL-3.0 |
| [evertonma/FTX-1CAT_PR2EM](https://github.com/evertonma/FTX-1CAT_PR2EM) | `9f15f99` | PolyForm Noncommercial 1.0.0 |
| [hatandspecs/ftx1-tuner-sweep](https://github.com/hatandspecs/ftx1-tuner-sweep) | `473e05a` | MIT |
| [juanmmmmmmm/Look4Sat-FTX1](https://github.com/juanmmmmmmm/Look4Sat-FTX1) | `b4f93d0` | GPL-3.0 |
| [gnfrazier/ftxcat](https://github.com/gnfrazier/ftxcat) | `08dbd7d` | MIT |
| [git-jcw/FTX-1-WebUI](https://github.com/git-jcw/FTX-1-WebUI) | `0b89d46` | MIT |
| [iTracMan/FTX1WinController](https://github.com/iTracMan/FTX1WinController) | `9f5d8f7` | MIT |
| [pokibon3/FTX1Controller](https://github.com/pokibon3/FTX1Controller) | `adf730a` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [radiohyperactivity/ftx1-front-cover](https://github.com/radiohyperactivity/ftx1-front-cover) | `df6813b` | GPL-3.0 |
| [Reid-n0rc/FTX-1_Firmware](https://github.com/Reid-n0rc/FTX-1_Firmware) | `38f3ed9` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [ew1abz/yaesu-ftx-1-control](https://github.com/ew1abz/yaesu-ftx-1-control) | `273d6c3` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [Eugen68/Yaesu-FTX1-CAT-Control](https://github.com/Eugen68/Yaesu-FTX1-CAT-Control) | `ea922b9` | MIT |
| [fritzsche/yaesu-ftx1](https://github.com/fritzsche/yaesu-ftx1) | `a53baa3` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [byf3332/Yaesu-FTX1-Cat-Tunnel](https://github.com/byf3332/Yaesu-FTX1-Cat-Tunnel) | `7df422a` | WTFPL 2 |
| [ew1abz/yaesu-ftx-1-memory-manipulator](https://github.com/ew1abz/yaesu-ftx-1-memory-manipulator) | `bad68d5` | MIT |
| [sq9pd/Yaesu-FTX-1-mod](https://github.com/sq9pd/Yaesu-FTX-1-mod) | `ee71225` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [captobie/ftx1-remote](https://github.com/captobie/ftx1-remote) | `0fb8dd5` | MIT |
| [bg7nzl/ftx1ctl](https://github.com/bg7nzl/ftx1ctl) | `36ceffc` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |
| [rigplane/rigplane-core](https://github.com/rigplane/rigplane-core) | `71a5bff` | MIT |
| [rzochowski/cat-ftx1](https://github.com/rzochowski/cat-ftx1) | `e77b599` | Keine Lizenz angegeben; MIT-Erlaubnis laut Nutzer (EA5KGV), 2026-11-17 |

## Abhängigkeiten

| Paket | Verwendung | Lizenz |
| --- | --- | --- |
| [satellite.js](https://github.com/shashwatak/satellite-js) 6.0.1 | SGP4/SDP4-Bahnberechnung | MIT |

## Datenquellen

| Anbieter | Daten | Bedingungen |
| --- | --- | --- |
| [RadioID.net](https://radioid.net/) | DMR-Kontakte | RadioID-Bedingungen |
| [RepeaterBook](https://www.repeaterbook.com/) | Repeater | Genehmigtes Token erforderlich. “Data courtesy of RepeaterBook.com” |
| [SatNOGS DB](https://db.satnogs.org/) | Sender und TLE | CC BY-SA 4.0 |
| [CelesTrak](https://celestrak.org/) | TLE | CelesTrak-Bedingungen |
| [opengd77.com](https://www.opengd77.com/downloads/) und [F4HWN GitHub Releases](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases) | Offizielle Firmware | Lizenzen der jeweiligen Projekte |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) (F4HWN) | Sieben UV-K1-Zerlegungsfotos in `docs/atlas/`, auf 1600 px verkleinert | Apache-2.0 |

## Dokumentation und Werkzeuge

- Bricohams-Identität: [Original-Logo von Bricohams Studio](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png), ohne Neuzeichnung oder Umfärbung beibehalten. Herkunft und Prüfung im [Markenleitfaden](docs/i18n/de/BRANDING.md).
- [MDN: Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) und [WebUSB API](https://developer.mozilla.org/docs/Web/API/WebUSB_API).
- Vallado, Crawford, Hujsak und Kelso, *Revisiting Spacetrack Report #3* (2006): in den Tests verwendeter SGP4-Testvektor.
- [Zadig](https://zadig.akeo.ie/) (WinUSB unter Windows), [WCH CH341SER](https://www.wch-ic.com/downloads/CH341SER_EXE.html), [Silicon Labs CP210x](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers) und [Prolific PL2303](https://www.prolific.com.tw/) — verlinkt, nicht weiterverteilt.

Vielen Dank an die Amateurfunkgemeinschaft und die Autoren dieser Projekte für die Veröffentlichung ihrer Arbeit.

# Vorkompilierte Labs-Apps

Der Testkatalog verteilt SystemInfo, BroadcastFM, Cube3D, Tetris, Breakout und Minesweeper von Armel F4HWN aus dem Archiv v6.1.0 unter Apache-2.0. Originalnamen, Header, Lizenz und NOTICE bleiben erhalten. Manifeste nennen Herkunft und SHA-256; die Urheberschaft wird nicht Bricohams zugeschrieben und eine Funktionsprüfung auf Hardware wird nicht behauptet.
