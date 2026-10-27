# Karina: technisches Dossier und Grenzen einer Ableitung Bricohams

Inspektionsdatum: 2026-10-25.

## 1. Status und Umfang

**Neue Beweise von 25-10-2026:** der bereitgestellte Link Dim0s enthält
ein weiteres Paket Karina für **V3 und UV-K1**, mit Vektoren PY32. Dieses Dossier
beschreibt das Paket **V1 lokal**, nicht alle vorhandenen Varianten Karina.
Der [Bericht Karina V3 und Pack Dim0s](AYUDA-PACK-DIM0S.md) dokumentiert den Download,
Inventar und Hashes. Es wurde keine Kompatibilität mit Armel-Slots nachgewiesen noch Quellen/Hinweise MIT in dieser ZIP gefunden.

Dieses Dokument beschreibt Beweise des lokalen Pakets **Karina-2026.08.21 K5V1
(Fw+Cal+Instr+K5prog+Rolling)** und vergleicht sie mit den angegebenen offenen Referenzen als Referenz. Es ist kein wiederhergestellter Quellcode, eine vollständige Übersetzung dessen
keine Handbücher noch eine Firmware-Zertifizierung. Es wurde keine Binärdatei Karina Bricohams erstellt, der Bootloader modifiziert, ein Radio geflasht oder multiboot V1. getestet. Wenn eine **unabhängige Bricohams V3 Edition basierend auf F4HWN** erstellt wurde,beschrieben in [BRICOHAMS-FIRMWARE.md](BRICOHAMS-FIRMWARE.md); es enthält keinen Code
Karina und ist nicht als dessen Port gedacht.

**Sperre für Ableitung Karina:** Das Paket enthält keine C-Quellen, Assembler, Linker, Makefile oder eine Lizenz der Firmware. Einen `.bin` zu haben, liefert weder das Build-Projekt noch erlaubt es, die Lizenz eines anderen Projekts zuzuschreiben. Die drei Python-Dateien sind Treiber CHIRP, keine Prozessor-Firmware.

Die Lizenzzuordnung MIT zur Firmware bleibt eine noch zu identifizierende Erklärung von Komponente, Inhaber und überprüfbarem Text oder Quelle. Dieser Hinweis wurde im inspizierten Paket nicht gefunden, und die Lizenzen der Treiber oder F4HWN. werden dadurch nicht geändert. Auch wenn MIT für Karina bestätigt wird, fehlt weiterhin das Quellprojekt für eine Neukompilierung.
Da keine offenen Quellen verfügbar sind, wird eine unabhängige Implementierung auf Grundlage des dokumentierten Verhaltens entwickelt. Die Verfügbarkeit von Karina-Quellcode ist keine Voraussetzung für neue Funktionen. Eine Neukompilierung von Karina oder eine hundertprozentige Gleichwertigkeit kann ohne Implementierung und Tests jedoch nicht zugesichert werden. Der erste eigene ARDF-Kern, seine Schnittstellenvereinbarung und die noch offenen Integrationspunkte werden in [Bricohams](BRICOHAMS-FIRMWARE.md#neuer-eigenständiger-ardf-kern) beschrieben.
Es werden bereits drei eigenständige Images für Slots V3: ARDF mit Zyklen gebaut, Satelliten mit manuellem Doppler RX und Spektrum mit 128 Punkten, Durchschnitt, Peak Hold und acht RAM-Session-Presets, plus eigene VFO-PRO-Aufnahme nur für Empfang. 
Die Aufnahme ermöglicht Abstimmung in Schritten, numerischen RX-Eingang, Audio und Einstellungen in den dokumentierten RX-Feldern von R13, während die anderen Bits erhalten bleiben. Sie erlaubt Fenster zu zentrieren und die RAM-Presets zyklisch zu durchlaufen, mit temporärer Blacklist von 16 exakten Frequenzen und optionaler CTCSS/DCS FM-Suche über den Upstream-Detektor, noch zu validieren im RF. Es bearbeitet keine Kalibrierung.
speichert keine Töne und überträgt nichts. Satelliten implementieren weder TLE/SGP4 noch autonome Nachverfolgung. Bei der ersten Inspektion war keine geflasht. Der 26-10-2026 wurde später die CRC der Slots Bricohams in Flash extern überprüft, wie im [Leitfaden Quansheng](AYUDA-QUANSHENG.md) vermerkt.Das validiert nicht den Start von SAT/ARDF/Espectro, die Äquivalenz Karina noch RF.
Das Teilen nach Funktion bedeutet nicht, dass alle Module Karina neu erstellt wurden.
Die Spektrum-Presets werden bereits über USB/UART in BHSP-Dateien exportiert/importiert,
mit Validierung und erneuter Lesung; sie haben keine interne Persistenz EEPROM. Das Satellitenbild
verfügt über CAT experimentelles RX und Orbitalverfolgung über das Web, nicht innerhalb des MCU.
ARDF ermöglicht den Export einer Zusammenfassung manueller Beobachtungen,
ohne GPS. Es bleiben Funktionen und Verhaltensweisen zu rekonstruieren und zu prüfen.

Man kann beobachtete Funktionen dokumentieren und eine eigene Implementierung
auf einer offenen Basis vorbereiten. Diese Implementierung sollte nicht als Karina
neu kompiliert angekündigt werden noch Äquivalenz behauptet werden, ohne sie zu überprüfen.

**Quellensuche (26-10-2026).** Es wurden keine öffentlichen Quellcodes gefunden.
de Karina in den konsultierten Quellen; es ist kein Beweis für Nicht-Existenz.
Das Paket Dim0s wird als geschlossene Firmware ohne Repository angegeben, und in den geprüften Gruppen von
Telegram auf Spanisch und Russisch wurden keine Quellen gefunden. Auch wurde nichtwurden in den durchgeführten Suchen in GitHub, Codeberg, GitLab, Gitee, GitFlic noch GitVerse gefunden. Laut der russischen Gruppe, Karina bleibt [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod) (Apache-2.0, das geschlossene Derivate erlaubt) und teilt Spektralcodes mit [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5) (Apache-2.0, V1). Diese beiden sind die offenen Datenbanken, um ihre Funktionen neu zu implementieren; `fagci/s0v4`, `hawk5` und `k1-fw` haben keine Lizenz und werden nicht kopiert. Das Binärprogramm Karina wird nicht dekompiliert. Hardware und Protokolle des V3 im [technischen Atlas](ATLAS-UV-K5-V3.md). 

## 2. Methode und Beweisquellen

- Rekursives Inventar des bereitgestellten Ordners, ohne EXE, Treiber oder Binärdateien auszuführen. 
- SHA-256 und Lesen der ersten Vektoren der Bilder.

- Textextraktion aus fünf PDFs, 102 Seiten insgesamt, mit PDF.js in einem
  isolierten Werkzeugverzeichnis, außerhalb von Web-Abhängigkeiten.
- Abfrage der README, Makefile, Linker und Lizenz der offenen Referenzen.
- Kontrast der lokalen Bilder mit den Überprüfungen des Steckers PY32.

Die PDFs haben während der Extraktion Schriftenwarnungen erzeugt. Die Diagramme, Farben der stabilen/ Testversionen und Screenshots wurden nicht seitenweise visuell überprüft. Daher wird keine Stabilität aus einer verlorenen Farbe abgeleitet, und das Inventar wird nicht als vollständige Dokumentation der internen Implementierung betrachtet. Die folgenden Zusammenfassungen sind eigenständig und geben nicht die vollständigen Handbücher wieder.

## 3. Paket-Inventar

24 Dateien: 13 `.bin`, 5 PDF, 3 `.py`, 1 `.exe`, 1 `.ini`, 1 `.txt`.

### 3.1. Bilder und Daten

| Datei | Bytes | Vorsichtige Klassifikation |
| --- | ---: | --- |

| `v1_210826_2.bin` | 61412 | Bild Karina V1 des neuesten Pakets nach Namen |
| `v1_210826_2.packed.bin` | 61430 | Update-Container, kein austauschbares RAW-Bild |
| `30.07fw_2.bin` | 61280 | Vorheriges Bild; der Name garantiert keine Stabilität |
| `30.07fw_2.packed.bin` | 61298 | Verpackte Variante des vorherigen |
| `16.10fw_7.bin` | 61040 | Historisches Bild; Jahr nicht durch den Namen nachgewiesen |
| `Config-29.01.26.bin` | 7424 | Konfiguration; keine Firmware |
| `28.11.25calib_mic.bin` | 512 | Daten als Mikrofonkalibrierung gekennzeichnet |
| `29.01.26calib_sql.bin` | 512 | Daten als SQL-Kalibrierung gekennzeichnet |
| `30.07calib_mic.bin` | 512 | Daten als Mikrofonkalibrierung gekennzeichnet |
| `30.07calib_sql.bin` | 512 | Daten als SQL-Kalibrierung gekennzeichnet |

| `Rolling back (BACKUP)/k5_v4.00.07_publish.bin` | 58726 | Paketwiederherstellungsbild; Herkunft nicht überprüft |
| `Rolling back (BACKUP)/Reborn-RUS.bin` | 61006 | Andere Firmware; nicht davon ausgehen, dass sie Karina |
| `Rolling back (BACKUP)/my_calibration-FIRST-Power.bin` | 512 | Mögliche spezifische Kalibrierung einer anderen Einheit |

Die Etiketten `calib` beweisen nicht, dass eine Datei das Original-Backup des Radios des Benutzers ist. **Keine fremden Kalibrierungen anwenden oder in einem öffentlichen Repository einschließen.** Die EXE K5prog wurde ebenfalls nicht ausgeführt oder zertifiziert.

### 3.2. Verifizierte Spuren

| Datei | SHA-256 |
| --- | --- |
| `v1_210826_2.bin` | `c7612a86325d10d768efc9fc7330bede203226879aae0a7d6f026418d55166f9` |
| `v1_210826_2.packed.bin` | `7690da5a740fb24c9a36e711f0410c27b7e99e9ab450d0ef0cdc161b21c11c52` |
| `30.07fw_2.bin` | `9e97e28325468a70aebe19a288cd44878e16ad705f05485c92d2bf9dc50f05b7` |
| `30.07fw_2.packed.bin` | `e53b74b9e755175b72acec8e470e90db0c7c08ac53f1023e10e7e3faeee2d08f` |
| `16.10fw_7.bin` | `af51612d4d20b2637c6da2c72d62493f537621685c1ab604165f0e05fc1fe1ee` |

Es sind lokal berechnete Spuren, keine Hashes, die mit einer signierten Veröffentlichung des Autors abgeglichen wurden.

### 3.3. Handbücher

| Lokales Dokument | Seiten | Verwendung in diesem Fall |
| --- | ---: | --- |
| `00-UV-K5V1-КРАТКО установка и настройка.pdf` | 2 | Einführung in Installation und Konfiguration |
| `01-UV-K5V1-ПОДРОБНО-Прошивка, Восстановление, CHIRP.pdf` | 17 | Installations-, Wiederherstellungs- und CHIRP | Referenz  
| `02-UV-K5V1_Инструкция Karina_21.08.26.pdf` | 29 | Hauptfunktionale Referenz von August 2026 |  
| `03-UV-K5V1_История версий Karina.pdf` | 16 | Änderungsverlauf, kein Ersatz für den Quellcode |  
| `UV-K5(8)_FW_Karina_mod_15.06.2025-R8.pdf` | 38 | Frühere Anleitung, nicht automatisch gleichwertig zu der von 2026 |  

## 4. Hardware und Speicher: nicht verwechseln V1 und V3  

Das Titelblatt des Haupthandbuchs identifiziert UV-K5, UV-K5+, UV-K5(8) und UV-K6 **V1**.  
Das vom Benutzer zuvor beschriebene Funkgerät war **UV-K5 V3**.  

| Familie | Relevante Basis | Konsequenz |

| --- | --- | --- |
| UV-K5 V1 | Ökosystem DP32G030 / Referenz OneOfEleven | Verschiedenes Bild und Karte; keine Slot-Unterstützung V3 auf dieser Website |
| UV-K5 V3 / UV-K1 | F4HWN PY32F071 in `Multiboot/Fusion61` | Vorhandener Slot-Stecker 1-4 und Main geschützt |

In `v1_210826_2.bin` werden `SP=0x20003FF0` und `Reset=0x0000010B` gelesen. 
Die RAW `16.10fw_7.bin` und `30.07fw_2.bin` zeigen dieselben Vektoren. 
Der Stecker V3 erwartet einen Thumb-Reset innerhalb der Anwendung ab `0x08002800`. Karina V1 **besteht** diese Prüfung nicht.

Der befragte Linker von OneOfEleven gibt 60 KiB von FLASH und 16 KiB von RAM an. 
Die 61412 Bytes des Images Karina lassen nur 28 Bytes gegenüber 60 KiB übrig; 
es ist ein Größenvergleich mit dieser Referenz, keine interne Karte von Karina. 
Es zeigt keinen Platz für andere Firmware oder einen Boot-Manager. 
Die zusätzlichen 18 Bytes der `.packed.bin` sind kein nutzbarer freier Speicher.
Das Handbuchcover Karina weist darauf hin, dass Si4732 nicht unterstützt wird und dass die erweiterten Speicher M24M01/M24M02 nicht als erweiterter Speicher genutzt werden. Es gibt keine Anzeichen dafür, dass das Firmware-Slot-Paket mit Multiboot F4HWN V3. kompatibel ist.

## 5. Funktionale Dokumentation von Karina

Die Funktionen dieses Abschnitts stammen aus dem Handbuchtext, nicht aus Hardwaretests oder der Überprüfung des Implementierungscodes.

### 5.1. Bildschirm und Status (Haupthandbuch, Seiten 3-4)

- Anzeige von VFO/Kanälen und letztem aktiven Empfänger.
- Sparindikatoren, Tastensperre und Funktionsmodus.
- Duales Abhören, Informationen CTCSS/DCS und Zugehörigkeit zu Scanlisten.
- Batterie, Signalstärke, Namen und Frequenz.
- Anzeige der Modi AM/FM/SSB; das Etikett SSB zeigt keinen Empfänger mit
  gleichwertigen Funktionen wie ein spezielles SSB Gerät.

### 5.2. Menüs und Persistenz (Seiten 5-9)

- SQL, Abstimmvorgang, Leistung, Verschiebung, Töne und Bandbreite.

- Kanalsperre, Speicher speichern und Namensstil.
- Energiesparen, VOX, Doppelausgabe und Scanverhalten.
- RX/TX-Audioeinstellungen und spezifische Filterfunktionen.
- Versteckte Menüs und erweiterte Parameter: sollten gegen Quellen dokumentiert werden, bevor sie in einem Build freigegeben werden Bricohams.
Das Handbuch unterscheidet Parameter nach VFO, Band und Speicher und erklärt, dass einige Kanalwechsel nur nach explizitem Speichern bestehen bleiben. Ein Port sollte vorübergehende Einstellungen nicht mit persistierten Daten verwechseln.

### 5.3. Tastatur, Hören und Scannen (Seiten 10-16)

- Kurze, lange Aktionen und Kombinationen mit der Funktionstaste.
- Wechsel VFO/MR, Kopieren von Einstellungen und Frequenzeingabe.
- Scannen und Funktionen, die den Seitentasten zugewiesen werden können.
- Das Handbuch warnt vor möglichen Problemen beim Zuweisen von `NONE` zu FN1/FN2 über externe Werkzeuge; die Treiberkompatibilität sollte überprüft werden.

Das Handbuch beschreibt auch Funktionen für automatisches TX und Randomisierung. Ihre Erwähnung in der Dokumentation macht sie nicht zu Anforderungen für die neue Firmware.
Hier werden keine Sequenzen zur Störung von Diensten automatisiert oder bereitgestellt. Eine erste Ableitung muss rechtliche Beschränkungen einhalten und die automatische Übertragung ausgeschaltet sein.

### 5.4. Spektrumanalysator (Seiten 17-24)

- Spektrumsanzeige und Aktivitätsvisualisierung.- Abstimmung, aktive Frequenzauswahl und Beziehung zu den Speichern. 
- Freie Eingangsbereiche und Voreinstellungen. 
- Multipreset und Erkundungsparameter. 
- Detaillierte Ansicht namens VFO-PRO. 
- Verstärkungsparameter und Empfängerprotokolle, einschließlich LNA/PGA. 
- Das Handbuch weist darauf hin, dass bestimmte Parameter beim Verlassen des Spektrums während der Kalibrierung geschrieben werden können: nicht als harmlose visuelle Steuerung behandeln.

Algorithmen, Filter, Zeiten, Grenzen oder Registerzuweisungen in Quellen Karina wurden nicht überprüft. Es ist nicht korrekt, angenommene Offsets aus Aufnahmen oder Texten zu implementieren.

### 5.5. Diagnose und Entwicklung (Seiten 25-29 und separates Protokoll)

Das Handbuch enthält Nutzungs- und Konfigurationsprobleme; das Protokoll bezieht sich auf
Empfangsänderungen, Squelch, Einsparung, Scannen, Subtöne und Spektrum. Der Eingang von 21-08-2026 erwähnt eine Empfangssperrkorrektur, die mit einem Modus verbunden ist, der als Roger 5 beschrieben wird, und verweist auf `29.01.26calib_sql.bin`. Das garantiert nicht, dass diese Datei für eine andere Einheit geeignet ist.Die Historie reicht bis zu Versionen von 2023-2026.. Ihre Farbcodierung stabil/Test wird bei der Textextraktion nicht zuverlässig beibehalten. Es wird nicht erklärt, dass alle Binärdateien im Ordner stabil sind.

## 6. CHIRP: was vorhanden ist und was nicht getestet wird

| Python-Datei | Beobachtung |
| --- | --- |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py` | Erklärtes Modell UV-K5/1, basierend auf Egzumer/F4HWN/Karina |
| `Chirp dr Karina-by_M2Boo-K1-2.py` | Erklärtes Modell UV-K5V3/K1, obwohl es im Paket V1 enthalten ist |
| `chirp_uvk5_fagci_osfw.py` | Treiber UV-K5/Fagci, zeigt keine Kompatibilität mit dem neuesten Image Karina |

Die Kopfzeilen der Treiber geben GPL v2 oder später an. Diese Lizenz bezieht sich auf diese Dateien, bescheinigt jedoch nicht die Lizenz der beigefügten proprietären Firmware.
Die Treiber geben 38400 Baud und Datenspeicher von `0x2000` Bytes an. Die beiden Derivate F4HWN/Karina geben Datenschreiben bis `0x1D00` und Kalibrierung ab `0x1E00` an. Das sind Angaben der Treiber, kein Beweis dafür, dass alle drei für alle Revisionen geeignet sind.Diese Python-Dateien wurden weder importiert noch ausgeführt. Ein Modul CHIRP führt Code auf dem PC aus; es muss überprüft und für ein konkretes Modell, Firmware und Version ausgewählt werden. Die Präsenz eines Treibers V3 verwandelt das Binary V1 nicht in Firmware V3.

## 7. Modulare Kompilierung, Patches und multiboot

| Konzept | Was es macht | Was es nicht zeigt |
| --- | --- | --- |
| UVMOD | Kombiniert ausgewählte Binär-Patches auf ein unterstütztes Image | Quellen von Karina, C-Kompilierung oder multiboot |
| Make/CMake-Optionen | Schließen Code ein/ausschließen und erzeugen ein Image | Mehrere Resident-Firmwares gleichzeitig |

| Overlays RAM | Teilen Ausführungs-Speicher zwischen Abschnitten | Voll auswählbare Firmware-Slots beim Einschalten |
| Multiboot F4HWN V3 | Speichert Bilder auf externem Flash und verwaltet sie über ihr Protokoll | Kompatibilität mit V1 oder mit einem beliebigen Bild |

OneOfEleven verfügt über Quellen Apache-2.0 und Optionen `ENABLE_*` im Makefile.  
Dazu gehören Empfang, Spektrum/Panadapter, Schnittstelle, Scannen und Kommunikationsfunktionen. Die Abhängigkeiten existieren: Das Makefile passt zum Beispiel Optionen UART und die Koexistenz von LTO/Overlay an. Es reicht nicht, einfach alle zu markieren. Eine Basis OneOfEleven wäre eine Ableitung von OneOfEleven/DualTachyon, nicht Karina.  

## 8. Lokale Bibliothek Multiboot in die Webseite integriert  

In Quansheng **Lokale Bibliothek** auswählen und den Ordner `Documents/Multiboot` wählen. Der Browser liest nur die ausgewählten `.bin`: Es wird keine API konfiguriert, die beliebige Pfade vom Rechner liest, und die Dateien werden nicht zu GitHub hochgeladen.  

Die lokale Überprüfung fand 9 Dateien, die die aktuellen Prüfungen bestehen:  

| Edition | Versionen | Lokale Quelle |

| --- | --- | --- |
| Fusion | 6.0.0 und 6.1.0 | `Fusion61/archive` |
| FieldOps | 6.0.0 und 6.1.0 | `Fusion61/archive` |
| Labs | 6.0.0 und 6.1.0 | `Fusion61/archive` |
| Übertragung | 6.0.0 und 6.1.0 | `Fusion61/archive` |
| Lokal kompilierte Fusion | Kette 6.1.0 | `Fusion61/build/Fusion/f4hwn.fusion.bin` |

Im Browser-Test beim Auswählen des gesamten Ordners Multiboot wurden
71 Bilder überprüft: 9 zugelassen und 62 blockiert. Der separate Test von
`Fusion61/archive` überprüfte 44: 8 zugelassen und 36 blockiert. Diese Ergebnisse
entsprechen dem lokal inspizierten Inhalt und ändern sich beim Hinzufügen von Dateien.

Jeder Eintrag gibt seinen Status oder den Blockierungsgrund an. Es werden Länge,
PY32 Vektoren, Identifikation F4HWN v6.x und Namen ausgeschlossener Varianten überprüft.
SHA-256 wird lokal berechnet. Eine Versionskette und einige korrekte Vektoren
**Sie bescheinigen keine Authentizität, Übereinstimmung mit den Quellen noch physische Kompatibilität**. Die lokale Kompilierung wird nicht als von Armel signiert präsentiert.

ARDFv05 enthält Quellen, aber es wurde kein ARDF Bild in den inspizierten Firmware-Verzeichnissen gefunden; `archive` enthält Fusion-Bildervorherige und Lagerbestände. Es wird kein angeblicher ARDF angeboten, der vom Ordnernamen abgeleitet ist.
Die ARDF Veröffentlichungen des Katalogs bleiben nur zum Download verfügbar.

Ein Bild vorzubereiten schreibt nichts. Die Installation erfordert weiterhin eine kompatible Verbindung, überprüfte vollständige Sicherung, slot 1-4, Bestätigung und finale CRC.
Main bleibt geschützt. Karina V1 wird ebenfalls mit einem falschen Namen F4HWN gesperrt, weil seine Vektoren nicht das PY32.-Format erfüllen.

## 9. Vertrag erforderlich für eine reproduzierbare Version Bricohams

Dies ist die ausstehende Arbeit, nicht Funktionen, die Karina bereits hat:

1. Exakte Quellen von Karina beschaffen, Lizenz, Abhängigkeiten und Werkzeuge,
     oder eine alternative offene Basis genehmigen und ihre Unterschiede dokumentieren.
2. Separate Hardware auswählen. V1 und V3 benötigen unterschiedliche Projekte/Profiles und Binärdateien. Für die vorhandenen Slots des Benutzers ist die anwendbare Basis PY32, nicht die Binärdatei V1 aus dem Paket. 3. Die Kompilierung ohne Änderungen abspielen, bevor man sie ändert; Commit protokollieren,toolchain, Optionen, Karte und Hashes. Kein SHA vom Upstream erfinden.
4. Minimale Profile mit Abhängigkeiten und Budget von FLASH/RAM erstellen.
Unbekannte Optionen und Kombinationen, die nicht passen, ablehnen.
5. Identität/Lizenz des Upstreams beibehalten und Marke Bricohams hinzufügen, ohne künstlich eine Kette zu verändern, um die Slot-Validierung zu umgehen.
6. `.bin`, Karte, Größenbericht, `build-info.json` und `SHA256SUMS` liefern, die sowohl Firmware als auch Metadaten abdecken. Hash nicht mit Signatur verwechseln.
7. Für V3 Booten, Wechsel von CFG, eigene Kalibrierung, Backup, Wiederherstellung und Slots gegen F4HWN. testen. Für V1 zuerst die physische Speicherunterstützung und eine Bootloader-Wiederherstellungsstrategie demonstrieren.
8. Nur nach Banktests veröffentlichen; RF-Grenzen dokumentieren und nicht aktivieren
automatisch Emissionen außerhalb erlaubter Bänder.

Die Website hat bereits ein Optionsformular für den Workflow `Brico-Hams/bricohams-firmware`; es ist kein Compiler Karina. In dieser Aufgabe wurde dieser Workflow nicht ausgeführt. Es wurde ein unabhängiger lokaler Konstruktor hinzugefügtfür F4HWN v6.1.0 und generierte die Änderungen Bricohams Fusion und Labs. Der Rest dieses Abschnitts bleibt erforderlich, um Karina abzuleiten, keine Behauptung, dass die Funktionen Karina in diesen Binärdateien neu implementiert wurden.

## 10. Wiederherstellung und Betriebsgrenzen

Das `readme.txt` des Rollbacks beschreibt Vorgänge, die Daten löschen. Sie werden nicht automatisiert und es wird nicht empfohlen, sie bei einem USB-Fehler anzuwenden. Vor jeder Migration werden Original-Backups des Laufwerks, Hardware-Identifikation und ein getestetes Wiederherstellungsverfahren benötigt.

Die Website behält die Schreibschutzbarrieren bei. Die Originaldateien des Pakets und der Ordner Multiboot wurden nicht verändert. PDF, EXE, Kalibrierungen oder Firmware Karina werden nicht weitergegeben.

## 11. Externe Quellen konsultiert


- [UVMOD: Werkzeug](https://whosmatt.github.io/uvmod/index.html).
- [UVMOD: README](https://github.com/whosmatt/uvmod).
- [OneOfEleven: Projekt](https://github.com/OneOfEleven/uv-k5-firmware-custom).
- [OneOfEleven: Makefile](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/Makefile).
- [OneOfEleven: Linker](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/firmware.ld).
- [OneOfEleven: Lizenz Apache-2.0](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/LICENSE).
- [F4HWN V3/UV-K1](https://github.com/armel/uv-k1-k5v3-firmware-custom).

Externe Referenzen wurden in ihrem veröffentlichten Zweig während der Inspektion konsultiert; es wurde kein Commit für einen neuen Ableger festgelegt. Ihre Funktionen oder Lizenzen werden dem Binärfile Karina ohne Beweise nicht zugeschrieben.

## 12. Community-Untersuchung (26-10-2026)

Gezielte Suchen in den Telegram Gruppen „QuanSheng UV-K5 auf Spanisch“ und „Quansheng uv-k5, uv-k5 (8), kr5plus“, in GitHub, Codeberg, GitLab, Gitee, GitVerse und GitFlic (mit angemeldetem Konto), sowie im Pack von Dim0s. Ohne Autoren oder persönliche Daten.

### Quellcode

| Beweis | Quelle |
| --- | --- |

| «keine Repository-Links, Firmware ist geschlossen» (kein Repository, Firmware geschlossen); Builds in `t.me/quansheng_V3_K1` | `Karina/информация.txt` von [pack Dim0s](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) |
| «Karina hat kein github, veröffentlicht die Versionen in seinem russischen Forum» | Spanische Gruppe |
| Karina ist «die direkte Fortsetzung von Fagci b5» und Punktracker teilt seinen Spektrencode | Russische Gruppe |
| Thema «Karina mod Fagci basierend» (erstellt 22-02-2024) und Kanal des Entwicklers «k5fw» | Russische Gruppe |
| Es wurden keine Quellen Karina noch Projekte Quansheng bei den durchgeführten Suchen in GitFlic und GitVerse | Suchen vom 26-10-2026 gefunden; kein Beweis für Nichtexistenz |

Fazit: **Es wurden in dieser Überprüfung keine öffentlichen Quellen von Karina gefunden**.
Die identifizierte offene Referenzbasis ist
[fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod) (Apache-2.0, die geschlossene Ableitungen erlaubt) und [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1, mit AFC Doppler). `fagci/s0v4`, `hawk5` und `k1-fw` haben keine Lizenz:
Sie können gelesen, aber nicht kopiert werden. Die Binärdatei von Karina zu dekompilieren, um die Quelle wiederherzustellen, wäre ein abgeleitetes Werk; das europäische Gesetz erlaubt das Dekompilieren nur für Interoperabilität.

### Versionen V3/K1 des Packs Dim0s

`21.09.2026` (aktuell) und ältere `23.03.2026`, `11.04.2026`, `10.05.2026`, `22.05.2026`,`14.06.2026`, `28.06.2026`, `27.07.26`, `29.07.26`, `01.08.26`, `06.08.26`, `11.08.26`, `15.08.26` (Tests), `21.08.2026` und `testfsk7`. Die `.packed` sind nur für den offiziellen Flasher; die anderen für offene Flasher.

### Funktionale Spezifikation für eine saubere Neuimplementierung

Eigene Zusammenfassung von `информация.txt` und dem Änderungsprotokoll des Packs, ohne Code zu kopieren:

| Funktion | Beschriebenes Verhalten |
| --- | --- |
| Multiband-Spektrum | Mehrere Bänder gleichzeitig (Luftfahrt, Marine, LPD, PMR, eigene). „Delay“ (2400 Standard, 1100 empfohlen) und „Turbo“; schneller, je höher der Squelch über dem Rauschen |
| Beschleunigungen | Ab 21.09.26 permanent (früher an Roger 5 gebunden); AM mit Kristall 3 in Roger 5 |

| Dynamisches Volumen | Langer Druck auf 9 (zeigt «D») |
| Signale und automatische Antwort | F + langer Druck auf 1/2/3; Signal mit FN2 Länge, Dauer gemäß TxTime |
| AM-Ton Generator | Inbegriffen |
| Langstreckenaufnahme | SQL=3, SPEICHERN=1:3, Roger=3 und langer Druck auf 1 (mehr Verbrauch) |
| Drei Zustands-Presets | Kalibrierung, Kanäle und Einstellungen; Auswahl mit 0/1/2 beim Einschalten |
| Empfang | Autocapture mit Rauschfilter, längere CTCSS/DCS Messungen, langsames Schließen des Squelch bei AM, LNA einstellbar |
| Flashen | Über Werksfirmware; nach dem Flashen PTT+EXIT beim Einschalten zum Löschen, Laden der Originalkalibrierung und danach die von Karina |
| CHIRP | Nur der Tab „Kanäle“: Ändern der „Parameter“ zerstört das Beacon und kann das Radio blockieren |

| Bekannte Fehler | Erster Speicher ohne Namen im Spektrum, falsche Frequenzen im EXP-Multiband-Modus, umgekehrte Pfeile im Menü des K1 |

Empfohlener Weg: Ausgehend von F4HWN V3 (Apache-2.0), das Spektrum von fagci-mod übernehmen und
PUNKTRACKER, diese Funktionen als eigenen Code implementieren und offen veröffentlichen. Die Hardware
und die Protokolle des V3 sind im [technischen Atlas](ATLAS-UV-K5-V3.md) und das Verzeichnis der Repositorien in [Community-Links](ENLACES-COMUNIDAD.md).