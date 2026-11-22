# TK-11: Interoperabilitäts-Engineering und Weg zu einer eigenen Firmware

Wissensbasis zum Quansheng TK-11. Jede Angabe nennt ihre Quelle; was nicht bestätigt ist, wird als **UNVERIFIED** gekennzeichnet. Dieses Projekt flasht keine Firmware auf den TK-11, und dieses Dokument ändert daran nichts.

## Umfang und Regeln

- Es werden nur öffentliche Quellen und die Implementierung dieses Repositorys verwendet. Es wurde keine Binärdatei dekompiliert und kein Code von TK-11 Manager kopiert.
- Der Code von CHIRP-to-TK11-csv steht unter GPL-3.0 und wurde mit Namensnennung in `ACKNOWLEDGEMENTS.md` portiert. Der CHIRP-Treiber steht unter GPL-2.0-or-later.
- Von TK-11 Manager wird nur das Verhalten beschrieben, das seine Präsentation veröffentlicht. Seine Lizenz ist nicht bekannt.
- Nichts von dem, was hier steht, wurde an einem echten Funkgerät getestet, außer dem, was `tk11-connector.js` bereits tut.

## Quellen

| Id | Quelle | Inhalt |
|---|---|---|
| [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) | URZ-Artikel über TK-11 Manager | Funktionen und Sicherheitsmaßnahmen des Werkzeugs |
| [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) | CHIRP-to-TK11-csv (GPL-3.0) | CSV-Importformat des TK-11 |
| [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) | CHIRP-Treiber tk11.py | CPS-Protokoll und Speicherkarte |
| [F4](https://github.com/armel/tk11-teardown) | Teardown von armel (Apache-2.0) | MCU, Speicher und fehlende Dokumentation |
| F5 | `tk11-connector.js` und `tk11-ui.js` aus diesem Repository | Unabhängige Implementierung auf Basis von F3 |
| [F6](https://github.com/spm81/Multi-UVTools) | Multi-UVTools von spm81 (ohne LICENSE) | Behauptungen zu Offsets des TK-11; nur Daten, ohne Code wiederzuverwenden; Einzelquelle, **UNVERIFIED**; basiert auf dem TK11-Modul von CHIRP und ist daher bei gemeinsamen Offsets nicht unabhängig von F3 |
| [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf) | Datenblatt AP8048B von MVSilicon | Pins, SWD, Code-Verschlüsselung im SPI-Flash, Update per SD/USB |
| [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) | Datenblatt AP8048C von MVSilicon | Wie F7 für Variante C |
| [F9](https://github.com/rob-w/tk11-firmware-custom) | rob-w/tk11-firmware-custom (Fork von F4) | Als offene Neuimplementierung der Firmware beschrieben, enthält aber nur README, LICENSE, PDF und JPG; kein Code, keine Binärdateien; letzter Push 2025-04-29 |
| [F10](https://github.com/qshosfw/hermes) | README von qshosfw/hermes (GPL-3.0) | Sekundärquelle, die den TK-11 als Funkgerät mit Beken BK4819 bezeichnet |
| [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) | Teardown-Foto, Ansicht A Rückseite der PCB V2.0 | Visuelle Beobachtung des Autors dieses Dokuments |

## Hardware

| Element | Angabe | Quelle |
|---|---|---|
| MCU | AP8048 von MVSilicon, auf Basis von Arm Cortex-M3 | [F4](https://github.com/armel/tk11-teardown) |
| Interner Flash | 2 MB | [F4](https://github.com/armel/tk11-teardown) |
| Interner SRAM | 128 KB | [F4](https://github.com/armel/tk11-teardown) |
| EEPROM oder externer SPI-Flash | Auf der PCB keiner identifiziert | [F4](https://github.com/armel/tk11-teardown) |
| Persistente Daten | Bootloader, Firmware, Kalibrierung, Einstellungen und 999 Kanäle lägen im internen Flash; das ist eine Schlussfolgerung des Teardown-Autors, **UNVERIFIED** | [F4](https://github.com/armel/tk11-teardown) |
| Datenblatt | Es gibt kein vollständiges öffentliches Datenblatt; Details gibt es nur unter NDA | [F4](https://github.com/armel/tk11-teardown) |
| SDK und Werkzeuge | Laut F4 gibt es kein öffentliches SDK und keine Toolchain für den AP8048. GitHub-Suchen (2026-11-09) nach `AP8048` und `tk11 firmware`: 0 Repositorys; auf github.com, urez.org und spm81.github.io wurde weder Firmware-Quellcode noch eine Update-Datei, ein Update-Protokoll oder eine Bootloader-Tastenkombination gefunden. Es gibt ein MVSilicon-SDK für einen Schwesterchip, leadercxn/bp1048_sdk_v0.1.12 (nicht geprüft; Lizenz unbekannt). F9 liefert keinen Code | [F4](https://github.com/armel/tk11-teardown), [F9](https://github.com/rob-w/tk11-firmware-custom) |
| MCU-Variante | In F4 gibt es Datenblätter für AP8048A, B und C. Welche Variante im TK-11 steckt, ist **UNVERIFIED**: Die Beschriftung auf dem Foto ist nicht lesbar | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| SWD-Port | Die Datenblätter von B und C (LQFP48 7x7 mm) führen "Serial wire debug (SWD) interface" auf: GPIO_C[13] = SWCLK, GPIO_C[14] = SWDIO, an den Pins 2 (SWCLK) und 3 (SWDIO) bei B und C. Masse DVSS: Pin 38 (B), Pin 39 (C); IOVDD 3,3 V: Pin 40 (B). Widerspruch: Das README von F4 sagt, der Chip habe keine externe Programmier- oder Debug-Schnittstelle. Ob SWD im TK-11 aktiv oder gesperrt ist, ist **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf), [F4](https://github.com/armel/tk11-teardown) |
| Reset | Keine der beiden Pin-Tabellen führt einen NRST-Pin auf; Pin POWER_KEY: 17 bei B und C | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| SPI-Flash-Schnittstelle und Code-Verschlüsselung | Pins GPIO_A[13..18] = FSH_HOLD, FSH_SCK, FSH_SI, FSH_WP, FSH_SO, FSH_CS = Pins 21 bis 26 bei beiden Varianten. Die Funktionsliste enthält "Code encryption mechanism in SPI-flash". Dass der "interne 2-MB-Flash" ein SPI-Flash im Gehäuse ist, der diese Pins nutzt, ist eine **Schlussfolgerung** aus den Datenblättern, **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Update-Kanal laut Datenblatt | "Firmware updatable through SD/USB drive" (B und C); das Datenblatt des AP8048A spricht von Booten aus SPI-Flash und Update über SD- oder USB-Laufwerk. Ob der TK-11 das nutzt, ist nicht bekannt: **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Kern und Speicher laut Datenblatt | Cortex-M3 mit 96 MHz und 128 KB SRAM | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| HF-Chip | F4 enthält Datenblätter von BK4819 und BK4829 (Beken). Beobachtung auf dem Foto: zwei QFN-Chips mit Beken-Logo in abgeschirmten Bereichen, vereinbar mit BK4819/BK4829; die genauen Typen sind **UNVERIFIED**. F10 nennt den TK-11 ein Funkgerät mit Beken BK4819 (Sekundärquelle) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg), [F10](https://github.com/qshosfw/hermes) |
| FM-Empfänger | F4 enthält das Datenblatt des RDA5807M; das Foto zeigt einen SOP-Chip mit der Aufschrift "5807M" (Beobachtung) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Unbestückter SOP-8-Footprint | Beobachtung auf dem Foto: ein leerer SOP-8-Footprint neben der MCU; seine Funktion ist **UNVERIFIED** (meist ein optionaler SPI-Flash oder EEPROM) | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Testpads | Beobachtung auf dem Foto: Bei dieser Auflösung sind keine beschrifteten SWD-Pads zu sehen | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| CPS-Verbindung | Seriell mit 38400 Baud bei aktivem DTR | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Display und Audio | In diesem Dokument nicht identifiziert: **UNVERIFIED** | F5 |

## CPS-Protokoll

### Rahmen

Jede Nachricht besteht aus Kopf, Nutzdaten, CRC und Abschluss. Nutzdaten und CRC werden mit einem zyklischen 16-Byte-XOR maskiert, und der CRC wird über die unmaskierten Nutzdaten berechnet ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

```text
AB CD LL LL [carga util][CRC16-XMODEM LE]  DC BA
LL LL = longitud de la carga util (u16 LE)
clave XOR = 16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80
```

Den 32-Bit-Wert "magic" erzeugt die offizielle CPS zufällig; mit einem festen Wert (5) antwortet das Funkgerät genauso, aber er muss in der gesamten Sitzung derselbe sein ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

### Befehlstabelle

| Id | Name | Nutzdaten | Quelle |
|---|---|---|---|
| `0x01F4` | Verbindungsanfrage | Typ u16, Länge 4, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01F5` | Verbindungsantwort | Firmware-Zeichenkette in den Bytes 4 bis 19; die Analyse stammt aus F5, **UNVERIFIED** gegenüber der offiziellen CPS | F5 |
| `0x01FB` | Speicher lesen | Typ u16, Länge 12, Adresse u32 (`0x080000` plus Offset), Größe u16, 2 Nullbytes, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FC` | Leseantwort | 12 Bytes Kopf und die Daten; maximal `0x200` pro Block | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FD` | Speicher schreiben | Derselbe 16-Byte-Kopf und die Daten; maximal `0x200` pro Block | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FE` | Schreibantwort | Rahmen von insgesamt 16 Bytes; der Erfolg wird am Code geprüft | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x05DD` | Neustart | Nur Typ und Länge; der Treiber definiert ihn, seine tatsächliche Verwendung in der offiziellen CPS ist **UNVERIFIED** | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Andere | Jeder Befehl für Update, Kalibrierung oder Bootloader | Nicht dokumentiert: **UNVERIFIED** | F5 |

Die Speichergrenze des Treibers ist `0x23000` (140 KiB) ab der Basis `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)). Ob `0x080000` eine echte Flash-Adresse oder eine logische CPS-Adresse ist, ist nicht bekannt: **UNVERIFIED**.

## Speicherkarte

Die Offsets beziehen sich auf die Basis `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Offset | Größe | Inhalt | Quelle |
|---|---|---|---|
| `0x00000` | 999 × 64 B (`0xF9C0`) | Kanäle | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x0F9C0` bis `0x10FFF` | `0x1640` | Nicht dokumentiert; kann Kalibrierung enthalten, **UNVERIFIED** | F5 |
| `0x11000` | 1011 B | Nutzungsanzeige pro Kanal (`0xFF` bedeutet leer); die letzten 12 sind nicht identifiziert | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x12000` | `0x48` | FM-Radio: VFO, Kanal-Id, Speicheranzeige und 32 Frequenzen | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x13000` | `0xF8` | Allgemeine Einstellungen | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x14000` | `0x70` | Allgemeine Einstellungen 2: Lösch- und Reaktivierungscodes, Gerätename | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x15000` | `0x10` | Aktuelle Auswahl: 8 u16-Werte für A, B, Frequenz, Kanal und NOAA | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x16000` | 32 × `0x80` | Suchlauflisten; enden genau bei `0x17000` | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x17000` | 4 B | Einschaltpasswort mit 6 Ziffern, u32 Little Endian, laut Multi-UVTools; **UNVERIFIED**, Lücke in CHIRP | [F6](https://github.com/spm81/Multi-UVTools) |
| `0x1A000` | 16 × 24 B | DTMF-Kontakte: Name mit 16 B und Code mit 8 B | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x1A800` | 16 × 24 B | 5-Ton-Kontakte: wie DTMF | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22000` | 16 × 40 B | NOAA-SAME-Dekodierungsadressen: 8 B Adresse und 32 B Text | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22280` | 128 B | NOAA-SAME-Ereignissteuerung | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x23000` | Ende | Speichergrenze der CPS | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Rest | Lücken zwischen den Strukturen | Nicht dokumentiert; werden immer beibehalten | F5 |
| `0x0D6008` | 1024 B | Start-Logo 128x64 monochrom laut Multi-UVTools (relativ zur Basis `0x080000`, wie der Rest); außerhalb des `0x23000`-Fensters der CPS; **UNVERIFIED** | [F6](https://github.com/spm81/Multi-UVTools) |

### Kalibrierung: Auflösung der Überlappung

Multi-UVTools ([F6](https://github.com/spm81/Multi-UVTools), Einzelquelle, **UNVERIFIED**) behauptet, die Kalibrierung des TK-11 belege `0x010000`-`0x021000` (68 KB) und sein EEPROM-Cleaner behalte `0x010000`-`0x015010` und `0x020000`-`0x021000` bei. Sein Code gibt an, auf dem TK11-Modul von CHIRP zu basieren, ist also bei gemeinsamen Offsets nicht unabhängig von F3. Der Bereich `0x11000`-`0x1A980` kollidiert mit CHIRP-Strukturen (Nutzung, FM, Einstellungen, Listen, Kontakte), daher kann er nicht vollständig Kalibrierung sein. Die Teile, die in CHIRP-Lücken fallen, sind `0x10000`-`0x10FFF` und `0x20000`-`0x20FFF`: Kandidaten, **UNVERIFIED**. `tk11-connector.js` schreibt nie in eine dieser Zonen (die Liste `UNVERIFIED_REGIONS` dient nur dazu, sie beim Vergleich von Kopien zu benennen) und auch nicht in das Logo.

Das Haupt-VFO (A-F01 bis A-F11 und B-F01 bis B-F11 in den CHIRP-Menüs) hat im Treiber keine eigene Struktur: Wo die VFO-Frequenzen gespeichert werden, ist **UNVERIFIED**. Das einzige dokumentierte VFO ist das des FM-Radios. Die "Zonen" tauchen in keiner Quelle auf: Am nächsten kommen die 32 Suchlauflisten, jede mit einem Namen von 16 B, zwei u16-Prioritäten und 48 u16-Kanälen ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)); ob der TK-11 Zonen wie bei DMR hat, ist **UNVERIFIED**.

### Kanaleintrag (64 Bytes)

Die Frequenzen werden in Einheiten von 10 Hz gespeichert und die CTCSS-Töne in Zehntelhertz; die DCS-Codes werden als die dezimal gelesene Oktalzahl gespeichert ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Byte | Feld | Hinweise |
|---|---|---|
| 0 | `rx_freq` | u32 |
| 4 | `freq_diff` | u32, Ablage |
| 8 | `tx_non_standard_1` | Nicht dokumentiert |
| 9 | `tx_non_standard_2` | Nicht dokumentiert |
| 10 | `rx_qt_type` | 0 keiner, 1 CTCSS, 2 DCS normal, 3 DCS invertiert |
| 11 | `tx_qt_type` | Wie das vorherige |
| 12 | `freq_dir` | 0 Simplex, 1 plus, 2 minus |
| 13 | `band` | Das niedrige Nibble auf 1 bedeutet Schmalband (laut F5) |
| 14 | `step` | Schritt |
| 15 | `encrypt` | 0 bis 10 |
| 16 | `power` | 0 niedrig, 1 mittel, 2 hoch |
| 17 | `busy` | Sperre bei belegtem Kanal |
| 18 | `reverse` | Frequenzumkehr |
| 19 | `dtmf_decode_flag` | Signalisierungsdekodierung |
| 20 | `ptt_id` | 0 bis 3 |
| 21 | `mode` | 0 FM, 1 AM, 2 LSB, 3 USB, 4 CW |
| 22 | `scan_list` | `0xFF` keine |
| 23 | `sq` | 0 bis 8 |
| 24 | `name` | 16 Bytes ASCII |
| 40 | `rx_qt` | u32 |
| 44 | `tx_qt` | u32 |
| 48 | `unknown` | 8 Bytes nicht dokumentiert |
| 56 | `tx_qt2` | u32 nicht dokumentiert |
| 60 | `signal` | 0 DTMF, 1 5 Töne |
| 61 | `unknown_2` | 3 Bytes nicht dokumentiert |

### Allgemeine Einstellungen (`0x13000`)

| Bytes | Felder | Quelle |
|---|---|---|
| 0 bis 16 | Kanal A/B, NOAA-Squelch, TOT, NOAA-Suchlauf, Tastensperre, VOX, Mikrofon, Frequenzmodus, Anzeige, AGC, Energiesparen, Dual Watch, Hintergrundbeleuchtung, Anrufkanal (u16), Piepton | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 17 bis 27 | Vier Seitentasten-Aktionen, Suchlaufmodus, automatische Sperre, Startbildschirm, Alarm, TX-Ende-Ton, Repeater-Nachlauf, Nachlaufton | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 28 bis 40 | Rauschminderung, Transposition, Lautstärken A und B, Tastenton, Sprache, NOAA SAME, Signalbalken | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 41 bis 55 | Helligkeit, Löschcode, DTMF-Seitenton, DTMF-Antwort, Tonsuche, CW-Ton (u16) | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 56 bis 127 | DTMF-Block: Trennzeichen, Gruppe, Zeiten, Kennung mit 8 B und Codes für Hoch- und Herunterfahren | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 128 bis 215 | 5-Ton-Block: wie DTMF plus Protokoll und 15 Benutzerfrequenzen | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 216 bis 247 | Zwei Zeilen mit je 16 Zeichen des Begrüßungstextes | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |

## CSV-Format des TK-11

Die CSV, die TK-11 Manager importiert und die der Konverter von nikantgr erzeugt, hat einen festen Kopf. Dass TK-11 Manager sie unverändert importiert, ist von meiner Seite **UNVERIFIED**: [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) sagt nur, dass er CSV exportiert und importiert, und [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) beschreibt sie als das Format der Quansheng-Software.

```text
No.,Name,RX Freq[MHZ],TX Freq[MHZ],QT Encode Type,QT Encode1,QT Decode Type,QT Decode,MSW,Band,Powrer,Busy Lock,ScanList,Demode,Freq Reverse,SQ,Encrypt,Signaling Decode,PTTID,Signal
1,PMR01,446.00625,0.15300,Null,Null,Null,Null,2K,12.5K,Low,OFF,1,FM,OFF,3,OFF,OFF,OFF,DTMF
2,,,,,,,,,,,,,,,,,,,
```

### Spalten

Der Kopf schreibt "Powrer" mit diesem Tippfehler, und er wird unverändert beibehalten. Die Standardwerte sind die, die der Konverter festlegt.

| Spalte | Beobachtete Werte | Hinweise | Quelle |
|---|---|---|---|
| `No.` | 1, 2, 3, … | Fortlaufend ab 1; Lücken sind leere Zeilen | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Name` | Text | Höchstens 12 Zeichen laut Autor ("i think"), **UNVERIFIED**; der Speicher erlaubt 16 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `RX Freq[MHZ]` | 446.00625 | MHz mit 5 Dezimalstellen | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `TX Freq[MHZ]` | 145.07500 | Absolute Frequenz; `0.15300` bedeutet kein TX | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode Type` | Null, Ctcss, NDCS, IDCS | NDCS ist normales DCS und IDCS invertiertes | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode1` | Null, 77.0, 023 | CTCSS-Ton oder DCS-Code | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode Type` | Null, Ctcss, NDCS, IDCS | Wie bei der Codierung | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode` | Null, 77.0, 023 | Wie bei der Codierung | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `MSW` | 2K | Bedeutung **UNVERIFIED**; CHIRP listet 2K bis 5K | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Band` | 12.5K, 25K | Bandbreite: schmal oder breit | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Powrer` | Low, Middle, High | Leistung | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Busy Lock` | ON, OFF | Sperre bei belegtem Kanal | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `ScanList` | 1 | Der Konverter schreibt immer 1; die Nummerierung 1 bis 32 und der Wert ohne Liste sind **UNVERIFIED** | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Demode` | FM, AM, LSB, USB, CW | Modulation | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Freq Reverse` | ON, OFF | Frequenzumkehr | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `SQ` | 3 | Squelch von 0 bis 8 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Encrypt` | OFF | Verschlüsselung; der Konverter schreibt nur OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signaling Decode` | OFF | Der Konverter schreibt nur OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `PTTID` | OFF | Andere Werte **UNVERIFIED**; es werden die von CHIRP verwendet | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signal` | DTMF, 5TONE | Signalisierungstyp | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |

### Konvertierung aus CHIRP

Der Konverter ([F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py)) tut Folgendes und wurde nach `tk11-connector.js` portiert:

- Nummeriert ab 1 neu zwischen dem niedrigsten und dem höchsten Speicher und lässt in den Lücken leere Zeilen.
- Berechnet die TX-Frequenz mit dem Duplex: minus und plus ziehen die Ablage ab bzw. addieren sie, split nimmt die Ablage als TX, off schreibt `0.15300`, und der Rest kopiert die RX.
- Wandelt Tone in CTCSS für die Codierung um, TSQL in CTCSS für beide Seiten, DTCS und DTCS-R je nach Polarität (N normal, R invertiert) und Cross je nach Kreuzmodus.
- NFM ergibt ein Band von 12.5K und jeder andere Modus 25K; die Demodulation erlaubt nur FM, AM, LSB, USB und CW.
- Veröffentlicht Varianten mit Anführungszeichen, mit Dezimalkomma und mit dem Trennzeichen der Regionaleinstellung. Hier werden die ersten beiden portiert und die dritte nicht.
- Änderungen dieses Repositorys: Die Leistung wird aus CHIRP übernommen (Low und High; der Rest ist Middle).

Die öffentlichen Funktionen von `R.TK11` sind `channelsToTk11Csv`, `channelsFromCsv` (erkennt TK-11 oder CHIRP am Kopf) und `chirpCsvToTk11Csv`. Der Import füllt nur die Tabelle der Seite; das Funkgerät ändert sich erst, wenn die Schaltfläche zum Schreiben der Kanäle gedrückt wird, die vorher eine verifizierte Kopie verlangt. Ungültige Zeilen werden mit ihrem Grund ausgelassen.

## Was TK-11 Manager bietet

Alles Folgende stammt aus [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/); das Werkzeug wurde weder ausgeführt noch analysiert.

| Fähigkeit | Veröffentlichte Angabe | Vergleich mit CHIRP |
|---|---|---|
| Ausführung | Im Browser, ohne Internet und ohne Datenversand | Gleiches Protokoll; CHIRP ist eine Desktop-Anwendung |
| Protokoll | Basiert laut Artikel auf dem TK11-Treiber von CHIRP | Gleiche Speicherkarte |
| Kanäle | Vollständige Verwaltung aller 999 | Gleich |
| Einstellungen | Allgemeine, Tasten und Schnellfunktionen | Gleich |
| Suchlauflisten | Ja | Gleich; Zonen werden nicht erwähnt |
| DTMF und 5 Töne | Kontakte und Signale | Gleich |
| FM-Radio | Ja | Gleich |
| Kopien | Automatisch bei jedem Lesen; Wiederherstellung | In CHIRP nicht automatisch |
| Sicherheit | Prüft die Firmware vor Änderungen, schreibt nur geänderte Blöcke und verifiziert Byte für Byte | Verbesserung der Methode, nicht des Formats |
| Erweiterte Werkzeuge | Speicheranzeige | Keine Anzeige in CHIRP |
| Daten | Exportiert und importiert CSV und öffnet CHIRP-Images | Gleich bei CSV |
| Firmware-Update | Nicht erwähnt | Kein öffentliches Werkzeug bietet es an |
| Oberfläche | Virtuelles Funkgerät und sieben Themes plus ein anpassbares | Kein Äquivalent |

Fazit: Der Artikel offenbart keine Speicherregion, Einstellung oder keinen Befehl, die nicht im CHIRP-Treiber stehen. Was "die Firmware verifizieren" bedeutet und wie er es tut, ist **UNVERIFIED**.

## Weg zu einer funktionsfähigen Firmware

### Schritte

Alle Schritte sind **UNVERIFIED**, bis sie mit einem Testfunkgerät durchgeführt wurden. Keiner davon wird in dieser Anwendung implementiert.

1. **SWD-Zugriff und Leseschutz.** Laut den Datenblättern des AP8048B und AP8048C ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)) ist SWCLK der Pin 2 und SWDIO der Pin 3 des LQFP48; Masse an Pin 38 (B) oder 39 (C) und IOVDD mit 3,3 V an Pin 40 (B). Es gibt keinen NRST-Pin. Eine Sonde (ST-Link, J-Link oder CMSIS-DAP) mit OpenOCD verbinden und nur den IDCODE und die AP-Liste lesen (siehe "Hardware-Verfahren"). Niemals ein Entsperren oder Komplettlöschen ausführen: Bei vielen MCUs zerstört das den Flash.
2. **Vollständiger Flash-Dump.** Wenn das Debugging offen ist, die 2 MB mit der Sonde zweimal lesen und die SHA-256 vergleichen. Den Dump als private Kopie aufbewahren und nicht weiterverbreiten. Danach darin nach einem bekannten Kanaleintrag suchen, um zu wissen, ob `0x080000` eine echte Adresse ist.
3. **Den Bootloader identifizieren.** Im Dump die Vektortabelle, die Größe und die Adresse des Laders sowie ansehen, ob er Signatur oder CRC prüft.
4. **Das Update-Protokoll mitschneiden.** Mit dem offiziellen Updater und einem USB-Analysator (USBPcap mit Wireshark oder ein Hardware-Analysator) ein vollständiges Update eines Testfunkgeräts mitschneiden: wie es in den Lader-Modus wechselt, ob es den Rahmen AB CD, XOR und CRC wiederverwendet und das Dateiformat (Kopf, Verschlüsselung, Signatur). Zwei Versionen müssen verglichen werden. Es darf kein mitgeschnittener Schreibvorgang an ein Funkgerät erneut gesendet werden.
5. **Toolchain und SDK des AP8048.** Ein Compiler `arm-none-eabi-gcc` für Cortex-M3 reicht für den Kern, aber die Peripherie (Takt, GPIO, LCD, Tastatur, Audio, HF) steht nur im SDK von MVSilicon oder in Dokumentation unter NDA ([F4](https://github.com/armel/tk11-teardown)). Gibt es kein SDK, müssen die Register aus der Platine abgeleitet werden.
6. **Minimaler Test mit Blinken und LCD.** Ein kleines Programm mit dem Debugger in den 128-KB-SRAM laden und ausführen, ohne in den Flash zu schreiben, um die Hintergrundbeleuchtung oder die Taschenlampe einzuschalten und danach auf das LCD zu zeichnen. So wird nichts Dauerhaftes angetastet.
7. **Portierung.** Nur wenn Schritt 6 gelöst ist: die Treiber für Display, Tastatur, Audio und HF schreiben, den Bootloader beibehalten und dieselbe Speicherkarte und dasselbe CPS-Protokoll beibehalten, damit CHIRP und TK-11 Manager weiter funktionieren. Die K5-Firmware von F4HWN lässt sich nicht unverändert portieren: Sie hat eine andere MCU (Cortex-M0), eine andere Speicherkarte und externes EEPROM ([F4](https://github.com/armel/tk11-teardown)).

### Machbarkeitsurteil

Eine vollständige eigene Firmware ist heute nicht machbar. Es gibt drei harte Blockaden: Der AP8048 hat kein öffentliches SDK ([F4](https://github.com/armel/tk11-teardown)), es gibt kein öffentliches Update-Protokoll, und es ist nicht bekannt, ob das SWD-Debugging offen ist. Das Datenblatt des Herstellers stuft die SWD-Blockade von "unbekannt" auf "vom Hersteller dokumentiert, Zustand im TK-11 ungeprüft" herab ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)). Es entsteht eine neue Blockade: die Code-Verschlüsselung im SPI-Flash, die diese Datenblätter erwähnen. Realistisch ist ein Boot-Ziel (Blinken und LCD aus dem SRAM) mit einem opferbaren Funkgerät, und nur wenn Schritt 1 gut ausgeht. Eine vollständige Firmware mit HF, Audio und Menüs wäre ein Projekt über Monate mit Hardware-Reverse-Engineering, und selbst dann ohne Garantie, dass der Chip es zulässt.

## Hardware-Verfahren (Testfunkgerät)

Alles ist **UNVERIFIED**, bis es durchgeführt wurde. Nur mit einem Testfunkgerät, niemals mit dem täglich genutzten Funkgerät.

1. Die Variante (A, B oder C) anhand der Beschriftung des Chips mit einer Lupe identifizieren.
2. Per Durchgangsprüfung die Pins 2 (SWCLK), 3 (SWDIO), Masse und 3,3 V vom LQFP48 (Punkt an Pin 1) bis zu Testpads oder Vias lokalisieren. Besser ein Via verwenden, statt an den Pin zu löten.
3. Eine CMSIS-DAP-, ST-Link- oder J-Link-Sonde vorbereiten, wobei das Funkgerät von seinem eigenen Akku gespeist wird, VTref auf 3,3 V und Geschwindigkeit von 100 kHz.
4. Schreibgeschützte OpenOCD-Sitzung, die nur den IDCODE des DP und die AP-Liste liest:

```text
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -c "adapter speed 100" -c "swd newdap ap8048 cpu -enable" -c "dap create ap8048.dap -chain-position ap8048.cpu" -c "init" -c "dap info" -c "shutdown"
```

5. Da es keinen NRST gibt, mit laufendem Funkgerät verbinden (ohne "connect under reset").
6. Nur wenn der AP antwortet: ein Ziel cortex_m erstellen, `mdw 0x00000000 8` ausführen, um die Vektortabelle zu sehen, und `dump_image` der Coderegion zweimal ausführen und die SHA-256 vergleichen.
7. Im Dump nach einem bekannten Kanaleintrag suchen, um den Offset 0 der CPS mit einer Flash-Adresse in Beziehung zu setzen.
8. Verboten: jeder Befehl zum Löschen, Entsperren, Schreiben in den Flash, zu Option Bytes oder Komplettlöschen. Das Funkgerät hängt an einer Dummy-Last und sendet niemals.
9. USB-Mitschnitt, nur wenn ein offizieller Updater und seine Datei auftauchen: USBPcap und Wireshark am CPS-Kabel, zwei Versionen vergleichen und niemals mitgeschnittene Schreibvorgänge erneut senden.
10. Optional: Logikanalysator an den Pins 21 bis 26 (FSH) während des Bootens, um zu sehen, ob die Flash-Lesezugriffe darüber laufen; laut Datenblatt ist zu erwarten, dass die Daten verschlüsselt sind.

## Was ohne opferbares Funkgerät möglich ist

- (a) Schreibgeschützte Sicherungskopien mit der CPS plus dem Werkzeug "Zwei Kopien vergleichen" dieses Panels: Eine Menüoption im Funkgerät ändern, eine neue Kopie anfertigen und beide vergleichen dient dazu, unbekannte Felder zu kartieren und die Offsets von Multi-UVTools zu bestätigen oder zu verwerfen (für `0x17000`: ein Einschaltpasswort setzen, die Kopie anfertigen und vergleichen). Erfordert einen TK-11, schreibt aber nie.
- (b) Schreibgeschützte SWD-Sonde des IDCODE (erfordert das Öffnen des Funkgeräts; betrifft die Garantie).
- (c) Schreibtischrecherche zu den Datenblättern.

Alles andere benötigt ein opferbares Funkgerät.

### Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Löschen des Flash beim Entsperren des Debuggings | Bootloader, Kalibrierung und Kanäle gehen verloren | Niemals entsperren; vorher bei offenem Debugging dumpen |
| Kalibrierung außerhalb der CPS-Kopie | Funkgerät nach einem Fehler außerhalb der Spezifikation | Die CPS legt sie nicht offen (die Karte reicht bis `0x23000`); der vollständige Dump ist nötig |
| Überschreiben des Bootloaders | Funkgerät ohne Sonde unbrauchbar | Nur die Anwendungsregion flashen und den Dump aufbewahren |
| Erneut gesendete Update-Mitschnitte | Eine inkompatible Version blockiert das Funkgerät | Keine mitgeschnittenen Schreibvorgänge erneut senden |
| Urheberrecht und NDA | Rechtliche Probleme bei der Veröffentlichung von Dumps oder Datenblättern | Keine Dumps oder Dokumente unter NDA weiterverbreiten; das lokale Recht zum Reverse Engineering prüfen |
| Funkrechtliche Konformität | Eine eigene Firmware kann außerhalb des Bands oder ohne Zulassung senden | Die Bandgrenzen und die lokalen Vorschriften einhalten |
| Falsche Sicherheit durch die Tests | Die Tests dieses Repositorys decken nur die simulierte CPS ab | Immer an einem Testfunkgerät testen |

## Änderungsprotokoll

### 2026-11-09

Gewonnene Erkenntnisse:

- Der CHIRP-Treiber steht unter GPL-2.0-or-later, nicht GPL-3.0-or-later; letzter Commit der Datei 2026-03-19 ([F3](https://raw.githubusercontent.com/kk7ds/chirp/master/chirp/drivers/tk11.py)).
- Die Suchlauflisten von CHIRP enden genau bei `0x17000` (32 × `0x80` ab `0x16000`).
- Multi-UVTools hat keine LICENSE, und seine Behauptungen zum TK-11 sind Einzelquellen und nicht unabhängig von CHIRP ([F6](https://github.com/spm81/Multi-UVTools)).
- rob-w/tk11-firmware-custom enthält weder Code noch Binärdateien ([F9](https://github.com/rob-w/tk11-firmware-custom)).
- armel/tk11-teardown enthält Datenblätter von AP8048A/B/C, BK4819, BK4829 und RDA5807M ([F4](https://github.com/armel/tk11-teardown/tree/main/datasheet)).
- Die Datenblätter von AP8048B und AP8048C führen SWD (Pins 2 und 3), Code-Verschlüsselung im SPI-Flash und Update per SD/USB auf und führen keinen NRST auf ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)).
- Beobachtungen auf dem Foto: MCU mVsilicon AP8048 LQFP48, zwei Beken-QFN, ein SOP "5807M" und ein leerer SOP-8-Footprint ([F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg)).
- F10 nennt den TK-11 ein Funkgerät mit Beken BK4819 (Sekundärquelle) ([F10](https://github.com/qshosfw/hermes)).
- GitHub-Suchen nach `AP8048` und `tk11 firmware`: 0 Repositorys; keine öffentlichen Firmware-Quellen, -Dateien oder Update-Protokolle.
- urez.org hat nur den Artikel zu TK-11 Manager und sagt nichts zur Firmware ([F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/)).

Änderungen im Code:

- Lizenz von CHIRP in `tk11-connector.js` auf GPL-2.0-or-later korrigiert.
- Neue Liste `UNVERIFIED_REGIONS` (nie beschreibbar) und Funktionen `describeOffset` und `diffImages` in `R.TK11`.
- Schaltfläche "Zwei Kopien vergleichen" im TK-11-Panel: nur lesend, berührt das Funkgerät nicht.
