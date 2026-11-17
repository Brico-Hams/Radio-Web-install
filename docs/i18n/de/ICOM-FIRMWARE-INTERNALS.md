# Im Inneren der modifizierten Icom-Firmware (IC-705 / IC-9700)

Technische Wissensbasis zur modifizierten Firmware von Dawid SQ6EMM: was geändert wird, wo und wie. Sie fasst zwei unverändert eingebundene MIT-Repositories zusammen: `third_party/icom-custom-firmware/` (Commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`) und `third_party/icom-byof/` (Commit `a91231f64e8afbe34353994786e8276a3b54f1a9`). Jede Aussage nennt ihre Quelldatei. Die Details je Adresse jedes Patches stehen in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md), die Benutzeranleitung in [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 1. Umfang und Quellen

| Quelle | Inhalt |
|---|---|
| `third_party/icom-byof/IC705_DAT_FORMAT.md` | Format des `.dat`-Containers |
| `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | Flash-Karte des IC-705 |
| `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | Flash-Karte und A/B-Slots des IC-9700 |
| `third_party/icom-byof/FREQUENCY_RANGES.md` | Bandpläne je Region |
| `third_party/icom-byof/UNDOCUMENTED_CIV.md` | Undokumentierte CI-V-Befehle |
| `third_party/icom-custom-firmware/releases.json` | Liste der Versionen und Funktionen |
| `third_party/icom-custom-firmware/docs/patches/` | JSON-Patches, die der Patcher verwendet |

Es wird kein Icom-Byte verteilt: Die Patches enthalten nur eigene Bytes des Projekts sowie Verweise zum Kopieren von Bytes aus der offiziellen Firmware, die der Benutzer selbst liefert.

## 2. Der `.dat`-Container

### 2.1 Header und Parameter je Funkgerät

Laut `third_party/icom-byof/IC705_DAT_FORMAT.md` beginnt die Datei mit der Kennung `44 00 77 55`. Beim IC-705 ist der Header 0x64 Bytes groß (Felder f38, f44, f4c, f54 und f5c), enthält vier MD5-Summen und endet mit einem 2-Byte-Abschluss (`40 75`). Die Parameter der Transformation hängen vom Modell ab, laut `third_party/icom-byof/README.md`:

| Radio | KEY | START |
|---|---|---|
| IC-705 | `0x19` | `0x64` |
| IC-9700 | `0x2b` | `0x38` |
| IC-905 | `0x7f` | `0x88` |

Der IC-905 ist mit RSA-2048 und SHA-256 signiert und kann daher nicht neu gepackt werden; er ist nur dokumentiert.

### 2.2 Autokey-Transformation

Laut `third_party/icom-byof/icom_rza1_decode.py` ist die Verschlüsselung ein byteweiser Autokey: `plain = stored ^ ((prev_plain + abs_offset - KEY) & 255)`. Der Zähler beginnt in jeder Domäne bei `0x4b` und das Klartext-Padding ist `FF`. Der Schlüssel wird ohne Vorwissen wiedergewonnen:

- `deriveKey` sucht einen 16-Byte-Lauf mit Schritt -1 zwischen den Offsets `0x20` und `0x8000` und erhält `KEY = (run[0] + s) & 255`.
- `findStart` durchläuft s von `0x10` bis `0xFFF` mit Fenstern von `0x1000` oder `0x10000`, kehrt den Autokey rückwärts mit Anker auf `FF` um und sucht die ARM-Vektoren `18f09fe5 18f09fe5`.

Die JavaScript-Version liegt in `third_party/icom-custom-firmware/docs/js/codec.js`.

### 2.3 LZSS-Kompression

Laut `third_party/icom-byof/IC705_DAT_FORMAT.md` und `third_party/icom-byof/ic_rza1_repack.py` wird Okumura-LZSS verwendet:

| Parameter | Wert |
|---|---|
| Fenster (Ring) | 4096 Bytes |
| Anfangscursor | `0xFEE` |
| Flags | LSB zuerst, 1 = Literal, 0 = 2-Byte-Treffer |
| Index | `lo` plus die oberen 4 Bits von `hi`, um 4 Stellen verschoben (`(hi & 0xF0) << 4`) |
| Länge | `(hi & 15) + 3`, also 3 bis 18 |
| Strom-Ende | explizite Ausgabelänge, keine Endmarke |

Die Dekompression unterstützt Überlappung (eine Kopie darf gerade geschriebene Bytes lesen). Der Kompressor nutzt Hash-Ketten mit 3-Byte-Schlüssel (neueste zuerst), `max_chain=256`, der erste längste Treffer gewinnt und es wird Lazy Matching mit einem Schritt angewendet. Diese Regeln machen den JS-Port bitgleich zum Python-Code. Die Ausgabe ist etwa 2 % kleiner als die von Icom. Dennoch kann der Slot des IC-9700 durch den zusätzlichen Code und die Neuausrichtung des Grafikpakets um bis zu etwa 1,3 MiB wachsen.

### 2.4 MD5-Siegel

`findMd5Region` berechnet das MD5 inkrementell in Schritten von `0x1000`, bis die laufende Summe den nächsten 16 Bytes entspricht. Laut `third_party/icom-byof/README.md` ist die versiegelte Region beim IC-705 `0x9c0000` Bytes groß und beim IC-9700 `0x800000`. Nach dem Neupacken muss das Siegel neu berechnet werden.

### 2.5 Bootstrap und Hauptabbild

Laut `third_party/icom-byof/IC705_DAT_FORMAT.md`:

| Element | Detail |
|---|---|
| Bootstrap | DAT `0x64` bis `0x10064`, auf Flash `0x18000000` abgebildet, 0x10000 Bytes |
| Loader | Bootstrap `+0x4000`, Länge `0x9bc`, nach RAM `0x20004000` kopiert; Einstieg `0x20004840`; LZSS-Routine bei `0x200044dc` |
| Haupt-Header | DAT `0x10064`: `csz` und `osz` (zwei LE32 beim IC-9700) |
| Hauptstrom | beginnt bei `0x1006c`, wird nach RAM `0x20005000` dekomprimiert, Einstieg `0x20005060`, ARMv7-A |
| Aux1 | wird nach RAM `0x20000008` dekomprimiert (Thumb) |
| Aux2 | wird nach Flash `0x08000000` dekomprimiert (Cortex-M) |

Beim IC-9700 ist ein Grafikpaket bei Slot + `csz` + 8 angehängt und wandert mit dem Hauptstrom; `repack` richtet es auf 4 Bytes aus und füllt mit `FF` auf. Die Patches verwenden zwei MD5 je Funkgerät: die ganze Datei (`md5`) und das dekomprimierte Hauptabbild (`main_md5`), zusätzlich ein eigenes Bootstrap-MD5.

`repack(..., new_bootstrap)` (in `third_party/icom-byof/ic_rza1_repack.py`) verlangt genau `0x10000` Bytes, das Tag bei `0x4f00` bis `0x4f10` gleich dem Original und ARM-Vektoren am Anfang. Sonst nimmt Icoms Updater seinen alten Pfad und überschreibt Slot A.

### 2.6 Rundlauf: dekodieren, patchen, neu packen

1. Dekodieren: den Autokey rückgängig machen, den Hauptstrom finden und dekomprimieren.
2. Patchen: die JSON-Operationen auf das Hauptabbild (und optional den Bootstrap) anwenden.
3. Neu packen: mit dem oben beschriebenen LZSS komprimieren, erneut verschlüsseln und die MD5 neu berechnen.

Das Ergebnis muss byteidentisch mit dem an einem Funkgerät getesteten sein: Der Patcher bietet den Download nur an, wenn das Ausgabe-MD5 gleich `output.md5` ist; sonst schreibt er nichts (laut `third_party/icom-custom-firmware/docs/js/patch.js`). Deshalb muss der Kompressor den Algorithmus exakt nachbilden, und deshalb wird nur unveränderte offizielle Firmware als Eingabe akzeptiert.

## 3. Plattform und Speicherkarte

Die CPU ist ein Renesas RZ/A1H (R7S721001, IC101); der Flash ist per XIP bei `0x18000000` eingeblendet (laut `third_party/icom-byof/IC705_FLASH_LAYOUT.md`).

### 3.1 IC-705

ISSI-IS25LP128-Flash mit 16 MiB, RDID `9D 60 18`, 4-KiB-Sektoren. Die ersten `0x600000` Bytes des Flash entsprechen dem dekodierten Körper; DSP, WLAN und Ressourcen liegen dahinter. Die Größe des Original-Hauptabbilds ist `0x376000` (`output_size`); die Patches erzeugen `0x386000`.

### 3.2 IC-9700

S25FL127S-Flash mit 16 MiB, RDID `01 20 18`, 64-KiB-Sektoren, IC181 (laut `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`):

| Region | Offset | Hinweise |
|---|---|---|
| Bootstrap | `0x0` | 0x10000 Bytes |
| Slot A | `0x10000` | 0x7f0000 Bytes |
| Slot B | `0x800000` | 0x7f0000 Bytes |
| Marker | `0xff0000` | 16 Bytes `SX3913 V0.10-000` bedeutet Start von Slot B |

Innerhalb jedes Slots gibt es die Offsets +`0x3e0000`, +`0x3e4000`, +`0x3f0000` bis `0x793000` und +`0x7e0000` / +`0x7ec000`. Originalwerte von E1.50: `csz` `0x2145F4`, `osz` `0x405334`, `csz2` `0x80C2C`, `osz2` `0x2675BC`. Der Original-Loader hat keinen automatischen Fallback: Der SD-Updater schreibt den inaktiven Slot und setzt danach den Marker.

### 3.3 Bereiche, die nie überschrieben werden dürfen

Die beiden GT24C1024-EEPROMs (IC191 und IC192) enthalten Einstellungen und Kalibrierung. Sie sind keine Firmware und dürfen **nie** überschrieben werden. Auch das Bootstrap-Tag bei `0x4f00` bis `0x4f10` darf nicht angetastet werden. Die CI-V-Servicebefehle (Abschnitt 6) können diese Daten löschen oder dejustieren.

## 4. Patch-Mechanismus

Laut `third_party/icom-custom-firmware/docs/patches/` ist jeder Patch ein JSON mit `name`, `description`, `load_address`, `image_size`, `input`, `output`, `ops` und optional `bootstrap`. `hex`-Operationen schreiben eigene Bytes des Projekts, `copy_from`-Operationen kopieren `len` Bytes aus der offiziellen Firmware an eine andere Stelle (Verlagerung). Die Adressen sind absolut: Das Hauptabbild wird bei `0x20005000` geladen, und Bootstrap-Operationen sind Offsets ab dessen Anfang.

Beobachtetes Muster (genaue Zahlen in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md)): ein Vektor- oder Literal-Patch nahe `0x20005024`, viele kleine BL- oder B-Sprünge von 3 oder 4 Bytes, die bestehende Routinen umleiten, und eigener Code am Ende des Abbilds (beim IC-9700 wächst das Abbild von `0x2040A334` auf `0x2040FE10`). Im Bootstrap reicht der gepatchte Loader über den originalen hinaus (der bei `+0x49bc` endet) bis zum erhaltenen Tag.

## 5. Funktionen der angepassten Firmware

Die Funktionen sind in `third_party/icom-custom-firmware/releases.json` aufgeführt. Die Quellen veröffentlichen nicht den Quelltext der angepassten Firmware, nur die Patch-Bytes; wo das Wie nicht genannt wird, wird nichts erfunden.

| Funktion | Was sie tut |
|---|---|
| TRV1 bis TRV8 | Acht Transverter mit RF- und ZF-Frequenzen, nach dem Ausschalten gespeichert |
| RF-Anzeige | Zeigt die reale Frequenz bis 122 GHz |
| Erweitertes CI-V | 6-Byte-Frequenz über 1,4 GHz beim IC-9700 |
| IC-9700 MAIN, SUB, DUAL, SAT | Sendeeinstellungen folgen dem sendenden Empfänger |
| Scope-Skala | dB/div 10, 6, 3 und 1 mit automatischem Rauschteppich |
| Leistungsgrenze | Maximum je Transverter: 100, 50, 25, 10 oder 5 %; erhöht nie die Leistung des Geräts |
| TX-Verzögerung | Bis zu 300 ms je Transverter |
| PTT-Sperre | Je Transverter |
| TX-Bereiche des IC-705 | Erweitert laut `third_party/icom-byof/FREQUENCY_RANGES.md` (Abschnitt 7) |
| SD-Apps | In den Versionen enthalten, die es in `releases.json` angeben |
| A/B-Bootloader | Slot-Auswahl (Abschnitt 5.1) |

### 5.1 A/B-Bootloader

Laut `third_party/icom-custom-firmware/docs/index.html` und dessen `README.md` hält die Firmware zwei Slots (A und B), wie es Icoms Updater bereits abwechselnd tut. Der angepasste Bootloader erkennt einen strukturell beschädigten Slot und wechselt automatisch zum anderen. Tastenkombinationen zum Slot-Wechsel:

| Radio | Kombination |
|---|---|
| IC-9700 | POWER gedrückt halten, während die DC-Versorgung angeschlossen wird, etwa 5 s |
| IC-705 | POWER beim Einschalten halten, bis die LED blinkt, etwa 3 s |

Der Bootloader existiert nur einmal, und der SD-Updater schreibt ihn einmal zu Beginn der Aktualisierung. **Geht in diesem Moment die Stromversorgung verloren, kann ein Flash-Programmer zur Wiederherstellung nötig sein** (zum Beispiel CH341A). Verwende eine zuverlässige Stromversorgung.

## 6. Undokumentierte CI-V-Befehle

Laut `third_party/icom-byof/UNDOCUMENTED_CIV.md`. Standardadressen: IC-705 `0xA4`, IC-9700 `0xA2`, IC-905 `0xAC`; Controller `0xE0`. Lesebefehle sind sicher; Schreibbefehle und Aktionen können Einstellungen löschen oder das Gerät dejustieren.

| Befehl | Wirkung | Schutz |
|---|---|---|
| `1A D0` | Werksreset, löscht alle Einstellungen | Kein Passwort |
| `1A E1` | Zweite Reset-Variante | Ein Datenbyte muss 0 sein |
| `1A E0` | Wechselt in den Werks-Abgleichmodus | Modellpasswort |
| `1A D2` | DV-Selbsttest | Modellpasswort |
| `1A D7` | Abgleich eines Nebensystems | Modellpasswort |
| `1A D5` | Liest den Regionscode | Lesen |
| `1A D6` | Liest einen Kalibriermesswert | Lesen |
| `1A D8` | Liest ein Statusbyte, nur IC-705 | Lesen |
| `1A D9` und `1A DA` | Liest Mikrowellen-Kalibrierung, nur IC-905 | Lesen |
| `1A E4` | Liest einen kleinen Servicewert | Lesen |
| `1A D1` und `1A D3` | Testmodus-Flag und Diagnose, IC-705 | Interne Berechtigung |
| `1A E2`, `1A E3`, `1A E5` | Service-Untermodus, Ziel und Datenschreibzugriff | Schreiben |
| `1A E7` | Audio- oder DSP-Option, IC-705 und IC-905 | Schreiben |

Abgleichpasswörter (`E0`): `SX-4075 Adjust` (IC-705), `SX-3913 Adjust` (IC-9700), `SX-4209 Adjust` (IC-905). Vorhandene Unterbefehle je Gerät: IC-705 D0 bis D3, D5 bis D8 und E0 bis E7; IC-9700 D0, D2, D5 bis D7 und E0 bis E7; IC-905 D0, D2, D5 bis D7, D9, DA, E0 bis E7 und E9.

Weitere: IC-705 `0x24` und `0x28`; IC-9700 `0x28 00` (Bandabruf), `0x1C 02`, `0x1C 03` und `0x0D`; IC-905 nutzt eine 6-Byte-BCD-Frequenz ab 1,389 GHz.

## 7. Frequenztabellen

Laut `third_party/icom-byof/FREQUENCY_RANGES.md`. Das Werksziel (Diodenmatrix, in der Konfiguration zwischengespeichert) wählt einen Bandplan, der das Senden begrenzt. Welche Bänder du nutzen darfst, hängt von deiner Lizenz und den Vorschriften ab.

### 7.1 IC-705 (5 Pläne, RX 0,030 bis 470 MHz)

| Plan | 160 m | 80 m | 40 m | 6 m | 4 m | 2 m | 70 cm |
|---|---|---|---|---|---|---|---|
| 0 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | nein | 144-146 | 430-440 |
| 1 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | nein | 144-148 | 430-450 |
| 2 | 1,810-2,000 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,000-70,500 | 144-146 | 430-440 |
| 3 | 1,810-1,850 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,150-70,250 | 144-146 | 430-440 |
| 4 | 1,800-1,825 | 3,500-3,540 | 7,000-7,100 | 50,0-54,0 | nein | 144-147 | 430-440 |

Der IC-705 enthält einen kompletten Werkskalibriersatz für 70 MHz: Das 4-m-Band ist regionsgesperrt, nicht in der Hardware fehlend (Pläne 2 und 3).

### 7.2 IC-9700 (9 Pläne, strikt Dreiband)

| Plan | 2 m | 70 cm | 23 cm |
|---|---|---|---|
| 0 | 144-146 | 430-440 | 1260-1300 |
| 1 und 7 | 144-148 | 430-450 | 1240-1300 |
| 2 und 4 | 144-146 | 430-440 | 1240-1300 |
| 3 | 144-146 | 430-434 und 435-438 | 1240-1245 und 1270-1298 |
| 5 | 144-146 | 430-432 | 1260-1265 |
| 6 | 144-146 | 430-440 | 1260-1300 |
| 8 | 144-147 | 430-440 | 1260-1270 |

Der IC-9700 hat keine versteckten Bänder: Die Varianten ändern nur die Bandgrenzen. Mechanismus: Regionscode, Plan-Map-Tabelle, Planindex und eine Grenztabelle je Plan, die das Senden freigibt.

## 8. Werkzeuge für das Reverse Engineering

| Werkzeug | Funktion |
|---|---|
| `icom_rza1_decode.py` | Decoder der RZ/A1-Familie |
| `ic_rza1_repack.py` | Container-Repacker |
| `ic705_decode.py` | Vollständige IC-705-Dekodierung mit ELF-Ausgabe |
| `ic705.py` | Zerlegen, Neuaufbauen und Prüfen (nutzt numpy) |
| `ic705_codec.py` | Unabhängige LZSS-Diagnose mit vielen Optionen |
| `extract_streams.py` | Container-Parser |
| `ghidra_scripts/ExportRecovered.java` | Exportiert dekompiliertes C nach dem ELF-Import in Ghidra |
| `test_ic705_codec.py`, `test_ic705_decode_real.py`, `test_repack.py` | Tests |

Die genauen Kommandozeilen stehen in `third_party/icom-byof/README.md`. In `third_party/icom-custom-firmware/` reproduziert der Patcher `icom_patch.py` eine Version offline: Man gibt ihm die offizielle `.dat` und das JSON aus `docs/patches/`, und er prüft das Ausgabe-MD5.

Eine Version hinzufügen: den Eintrag in `releases.json` anlegen, den Patch erzeugen und `tools/build_index.py` ausführen, das `docs/patches/index.json` schreibt und die aktiven Patches kopiert. Es gibt außerdem einen experimentellen Patch in `third_party/icom-byof/patches/9700E150_trv16c.json`.

## 9. Wie Bricohams es nutzt

Die Seite `icom.html` hostet den Web-Patcher, ausgeliefert von der Web-Version und vom Desktop-Server (`server.cjs`). Der Browser liest deine offizielle `.dat`, wendet den Patch an und bietet das Ergebnis nur an, wenn das MD5 übereinstimmt. Sicherheitsregeln: nur eigene offizielle Firmware verwenden, TX-Verzögerung und Leistung vor dem Anschluss eines Transverters an einer Dummy-Load prüfen, bei der Aktualisierung eine zuverlässige Stromversorgung nutzen und akzeptieren, dass die Nutzung auf eigene Gefahr geschieht und die Garantie erlöschen kann. Siehe [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 10. Lizenz und Namensnennung

Beide Repositories sind MIT, von Dawid SQ6EMM. Repositories: `https://github.com/sq6emm/icom-custom-firmware` und `https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware`; Forum: `https://mikrofale.cafe/showthread.php?tid=1296`. Sie sind unverändert unter `third_party/` eingebunden und in den ACKNOWLEDGEMENTS-Dateien genannt.

## 11. Verbesserungsvorschläge

Ideen auf Grundlage der Dokumentation; es sind Vorschläge und nicht umgesetzt:

- `main_md5` im Browser vor dem Anwenden des Patches prüfen, um eine klarere Fehlermeldung zu geben.
- Den aktiven IC-9700-Slot erkennen, indem der Marker `0xff0000` aus einem Flash-Dump gelesen wird.
- Dem Patch-Bericht einen automatischen Vergleich der Regionen mit der Flash-Karte hinzufügen, wenn das Dokument es erlaubt.
- Den 4-m-Kalibrierbereich des IC-705 als Referenz dokumentieren, ohne das Senden freizuschalten.
