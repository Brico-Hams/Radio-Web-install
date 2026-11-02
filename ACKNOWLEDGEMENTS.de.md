# Danksagungen und Quellen

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace ist eine **unabhängige Implementierung für Interoperabilität**. Dokumentierte oder veröffentlichte Formate und Protokolle wurden untersucht. Der vorkompilierte Katalog verteilt F4HWN-v6.1.0-Images und Bricohams-Ableitungen: Apache-2.0-Lizenz und NOTICE des Ursprungsprojekts bleiben erhalten, ergänzt um GPL-3.0-or-later für Bricohams-Beiträge. Hashes, Herkunft und Optionen stehen in `precompiled/catalog.json`; Hinweise und beide Lizenzen liegen den Binärdateien bei. Es besteht keine Verbindung zu den genannten Projekten oder Unterstützung durch sie. Marken gehören ihren jeweiligen Inhabern.

## Protokoll- und Formatreferenzen

Die nativen Werkzeuge für Viewer/Tastatur, Neustart, Wartung, DFU, App-Verwaltung und RF-Filterung/-Export sind unabhängige Implementierungen für Interoperabilität. Sie laden keine UV-Studio-Skripte und kopieren dessen Oberfläche nicht. Dadurch geht die Urheberschaft fremder Firmware, Apps, Logos oder Ressourcen nicht auf Bricohams über; es stellt auch keine rechtliche Garantie dar. Originallizenzen und Hinweise bleiben verbindlich.

| Projekt | Verwendung als Referenz | Lizenz |
| --- | --- | --- |
| [OpenGD77-Web-CPS (grid.radio)](https://grid.radio/opengd77/) | CPS-Protokoll `C`/`R`/`W`/`X`, Modi, Speicherbelegung, Treiberanleitung | Website Dritter |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Codeplug-Format und benutzerdefinierter Datenblock (Satelliten vom Typ 3) | GPL-2.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) und dessen [Wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, Slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Slot-/Sicherungsablauf und LCD/RF-Log-Interoperabilitätsreferenz; festgelegte Revision `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. Der Web-Viewer ist unabhängig implementiert, keine Kopie des Website-Codes | Website Dritter |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Vorgänger der F4HWN-Firmware und ihres Protokolls | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Quansheng-Basisprotokoll | Apache-2.0 |
| [(tr)uSDX · DL2MAN](https://dl2man.de/) und [uSDX · PE1NNZ](https://github.com/threeme3/usdx) | **Mitautoren der (tr)uSDX-Unterstützung** der APK: Guido (PE1NNZ, Konzept, Schaltung und Code des uSDX) und Manuel (DL2MAN, (tr)uSDX, Sandwich-Platine und Klasse-E-Tiefpass). CAT-Befehle und Audiostreaming nach [„(tr)uSDX Details“](https://dl2man.de/5-trusdx-details/). Ihr Code wird nicht wiederverwendet | Projekt und Firmware ihrer Autoren |
| Handbücher von Yaesu (FT-817ND/818ND/857D/897D, FTX-1 CAT 2508-C) und Icom (IC-705 CI-V Rev. 6) | Multi-Radio-CAT der APK, nach diesen Dokumenten geschrieben | Herstellerdokumentation |
| CAT-Handbücher von QRP Labs (QMX Firmware 1.04_003, QDX Rev. 1.06) | QMX/QMX+- und QDX/QDX-M-CAT der APK, nach diesen Dokumenten geschrieben | Herstellerdokumentation |
| [FT8CN](https://github.com/N0BOY/FT8CN) (BG7YOZ) | Nur untersucht, um zu verstehen, wie es CAT, USB-Seriell und Audio unter Android löst; kein Code und keine Ressourcen übernommen | MIT |

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
