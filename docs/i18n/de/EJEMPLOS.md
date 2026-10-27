# Beispiele: offene Firmware, Kanäle und Skripte

Revision: 26-10-2026. Beispieldateien aus dem Ordner `examples/` des Repositorys. Enthalten sind nur Binärdateien, deren Lizenz eine Weiterverbreitung erlaubt, zusammen mit der jeweiligen Lizenz. Firmware Dritter ohne diese Lizenz (Karina, Baofeng, OpenGD77 DM32) erscheint nur im [Hash-Index](BINARIOS-TERCEROS.md).

## Offene Firmware

| Ordner | Inhalt | Lizenz | Für |
| --- | --- | --- | --- |
| [examples/firmware/f4hwn-v6.3.0](../../../examples/firmware/f4hwn-v6.3.0/SHA256SUMS) | `f4hwn.fusion`, `fieldops`, `labs` und `transfer` v6.3.0 sowie der CHIRP-Treiber derselben Veröffentlichung | Apache-2.0 (Firmware, mit `LICENSE` und `NOTICE`); GPL-2.0 oder später (CHIRP-Treiber, im Header) | Quansheng UV-K5 V3 und UV-K1 (PY32F071) |
| [examples/firmware/moto-v1.3.2](../../../examples/firmware/moto-v1.3.2/SHA256SUMS) | Moto-Bootloader 1.3.2 als `.bin` und `.uf2` | Apache-2.0 | UV-K5 V3 / UV-K1. Ein Wechsel des Bootloaders ist riskant: siehe [Atlas](ATLAS-UV-K5-V3.md#bootloader-und-flashen) |

Quelle: offizielle Releases von [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0) und [muzkr/moto](https://github.com/muzkr/moto/releases/tag/v1.3.2). Die SHA-256-Werte stimmen mit den von GitHub für jede Datei veröffentlichten Werten überein. Vor der Verwendung prüfen:

```text
cd examples/firmware/f4hwn-v6.3.0
sha256sum -c SHA256SUMS
```

Firmware der Hauptversion flashen: [Inbetriebnahme von 0 bis 100 %](AYUDA-QUANSHENG.md#inbetriebnahme-von-0-bis-100-). Die neueste Version findest du stets im armel-Release; diese Kopien sind eine feste Referenz.

## Kanäle

| Datei | Inhalt |
| --- | --- |
| [examples/channels/pmr446-solo-rx.chirp.csv](../../../examples/channels/pmr446-solo-rx.chirp.csv) | Die 16 PMR446-Kanäle im CHIRP-CSV-Format, schmales FM und deaktiviertes TX (`Duplex = off`). Vorlage zum Import in CHIRP oder diese Website |

Amateurfunkgeräte sind nicht für PMR446 zugelassen: Die Datei ist nur zum Zuhören.

## Skripte

Eigener Bricohams-Code unter der Repository-Lizenz (GPL-3.0-or-later). Mit `python -I` ausführen.

| Skript | Funktion |
| --- | --- |
| [tg_kb.py](../../../examples/scripts/tg_kb.py) | Wandelt JSON-Exporte von Telegram Desktop aus technischen Gruppen in eine lokale thematische Wissensdatenbank (Firmware, Flashen, Kalibrierung, Mods) um, mit einem Dateikatalog (SHA-256, Ziel-MCU anhand der Vektortabelle) und Linkkatalog. Entfernt Autoren, Aliasse, Telefonnummern und E-Mail-Adressen. Das Ergebnis ist Material Dritter: lokal speichern |
| [test_tg_kb.py](../../../examples/scripts/test_tg_kb.py) | Test von `tg_kb.py` mit einem synthetischen Export: `python -I test_tg_kb.py` |
| [check_repos.py](../../../examples/scripts/check_repos.py) | Liest eine Liste `owner/repo` und erstellt eine Tabelle mit Status, letztem Push, Lizenz, Sternen und MCU (V3/K1, falls PY32-Code vorhanden). Benötigt `gh` mit Sitzung |
| [recover.py](../../../examples/scripts/recover.py) | Sucht für gelöschte Repositories nach einer Kopie in Software Heritage, einem Snapshot in Wayback Machine und Forks mit demselben Namen |

Typische Verwendung:

```text
python -I tg_kb.py salida ChatExport_grupo1 ChatExport_grupo2
python -I check_repos.py repos.txt > repos.md
python -I recover.py caidos.txt
```