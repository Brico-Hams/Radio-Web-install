# OpenGD77: Modelle, Varianten und Umfang der Unterstützung

**Dokumentarische Überprüfung: 2026-10-25.** Ergänzung zu [Hilfe zur Konfiguration und Verwendung](AYUDA-OPENGD77.md). Hier werden die vom Projekt dokumentierte Kompatibilität, Katalogziele und vom Connector erkannte Namen getrennt aufgeführt. Es wurden nicht alle Geräte physisch getestet.

## 1. So sind die Tabellen zu verstehen

- **Leitfaden:** Das Modell oder die Variante wird im eingesehenen offiziellen englischen Leitfaden erwähnt. Eine Erwähnung im Titel, Screenshot oder Beispiel ist keine vollständige Installationsanleitung.
- **Paket:** Eine Datei wurde in einem bestimmten offiziellen Index gefunden. Dies zertifiziert nicht jede Hardwarerevision mit ähnlichem Handelsnamen.
- **Katalog:** Ziel in `firmware-core.js`, `TARGETS`; eine Paketauswahl, kein Firmware-Ladeprogramm.
- **Identifizierung:** Bezeichnung in `gd77-connector.js`, `MODELS`; ermöglicht die Interpretation einer Protokollnummer. Beweist für sich allein keine vollständige Betriebsfähigkeit.
- **Nicht bestätigt:** In den konsultierten Quellen gibt es keine ausreichenden Belege; das bedeutet nicht unbedingt, dass es unmöglich oder nicht vorhanden ist.

**Alle OpenGD77-Familien sind in dieser Webanwendung auf reinen Radio-Lesezugriff beschränkt.** Der Standard-Codeplug lässt sich lokal lesen, bearbeiten und speichern, aber **das Schreiben ist GESPERRT**, da das Backup keine verifizierte vollständige Kopie der MCU-Firmware enthält. Die externe CPS kann weitere Vorgänge anbieten; dadurch ändert sich die Webberechtigung nicht. Über den Katalog wird keine Firmware geflasht. [L]

## 2. Modell- und Zielmatrix

In dieser Tabelle steht «ID» für die Bezeichnung, die der Connector zurückgeben kann. Namen mit oder ohne Bindestrich beziehungsweise Leerzeichen werden nur zur leichteren Suche zusammengefasst; dadurch werden unterschiedliche Varianten nicht zu derselben Hardware.

| Modell oder Bezeichnung | Offizielle Belege und Einschränkungen | Ziel in `TARGETS` | Bezeichnung in `MODELS` | Praktische Schlussfolgerung |
| --- | --- | --- | --- | --- |
| Radioddity GD-77 / GD77 | Installation und Betrieb dokumentiert; Paket `OpenGD77.zip` [G, F1] | `GD-77`, MK22 | `GD-77` | Das dafür vorgesehene Paket wählen, nicht GD77S |
| Radioddity GD-77S / GD77S | Ohne Display/Tastatur dokumentiert; Sprachansagen sind unverzichtbar; eigenes Paket [G, F1] | `GD-77S`, MK22 | `GD-77S` | Zonen mit den ersten 16 über den Wahlschalter erreichbaren Kanälen |
| Baofeng DM-1801 / DM1801 | Nur Hardwareversion 1; laut Leitfaden ist die Revision von 2022 ausgeschlossen [G, F1] | `DM-1801`, MK22 | `DM-1801` | Platine prüfen; die Frontplatte reicht nicht aus |
| Baofeng DM-1801A / DM1801A | Nur Hardwareversion 1; auch die neuere Revision von 2022 ausgeschlossen [G, F1] | `DM-1801A`, MK22 | `DM-1801A` | Anderes Image als DM1801; das A ist kein entbehrlicher Zusatz |
| Baofeng RD-5R / RD5R | Installation dokumentiert; wegen USB-Beschränkung beim Senden kein Hotspot [G, F1] | `RD-5R`, MK22 | `RD-5R` | Nicht mit beliebigem DM-5R oder UV-5R verwechseln |
| TYT MD-9600 / MD9600 | Mobilgerät mit HF-Revisionen und separaten HW-Paketen dokumentiert [G, F3] | `MD-9600-V1`, `-V2`, `-V4`, `-V5`, STM32 | `MD-9600` | Die ID wählt die Revision nicht automatisch aus |
| Retevis RT-90 / RT90 | Zusammen mit MD-9600 dokumentiert; gleiche Vorsicht wegen der Revision [G] | Kein RT90-Schlüssel; passende MD9600-Ziele | Keine RT90-Bezeichnung; die Tabelle bietet `MD-9600` | Offizielle Zuordnung zur Familie, keine Garantie für jede Platine |
| TYT MD-UV380 / standard UV380 | Installation und Betrieb dokumentiert; Paket `OpenMDUV380.zip` [G, F2] | `MD-UV380`, STM32 | `MD-UV380` | Nicht wegen des ähnlichen Namens für MD-380 verwenden |
| Retevis RT-3S / RT3S | Zusammen mit MD-UV380 dokumentiert [G] | Kein RT3S-Schlüssel; das Ziel `MD-UV380` nennt es in seiner Bezeichnung | Keine RT3S-Bezeichnung | Offizielle Zuordnung; GPS und Gerätehardware prüfen |
| TYT MD-UV390 / UV390 | Im Titel und auf dem GPS-Bildschirm des Leitfadens enthalten [G] | Kein Ziel mit diesem Namen | Keine UV390-Bezeichnung | Offizielle Erwähnung ja; die genaue Image-Zuordnung für jede Variante ist hier nicht bestätigt |
| MD-UV380 10W **nicht PLUS** | Der Leitfaden beschreibt eine Leistungs-Skalierungsoption auf der UV380-Plattform ohne PLUS [G: Radio Options — Mode] | Kein eigenes Ziel für 10W ohne PLUS | Keine separate ID | Die Skalierung belegt keine Leistung und ändert die Hardware nicht; Variantenhinweise prüfen |
| MD-UV380 10W **PLUS** | Separates offizielles Paket `OpenMDUV380_10W_PLUS.zip` [F2] | `MD-UV380-10W-PLUS`, STM32 | Keine separate PLUS-ID | Laut lokaler Bezeichnung andere Hardware; nicht als Standard-UV380 behandeln |
| UV390 mit der Verkaufsbezeichnung 10W oder PLUS | In den konsultierten Quellen keine spezifische Zuordnung bestätigt | Kein UV390-PLUS-Ziel | Keine spezifische ID | Das UV380-PLUS-Image nicht nur aufgrund der Verkaufsbezeichnung übertragen |
| Baofeng DM-1701 / DM1701 | Installation und Betrieb dokumentiert; Paket `OpenDM1701.zip` [G, F2] | `DM-1701`, STM32 | `DM-1701` | Nicht mit RGB verwechseln |
| Baofeng DM-1701 RGB / DM1701RGB | Vom Connector vorgesehene Bezeichnung; hier keine spezifische Dokumentation geprüft [L] | Kein RGB-Ziel | `DM-1701 RGB` | Erkennung einer ID, kein bestätigtes Paket oder Installation |
| Retevis RT-84 / RT84 | Installationsleitfaden und eigenes Paket `OpenRT84.zip` [G, F2] | `RT-84`, STM32 | Keine RT84-Bezeichnung | Gemeinsames Kapitel mit DM1701 erlaubt keinen Austausch der ZIP-Dateien |
| TYT MD-2017 / MD2017 | Tastenübersicht im Leitfaden und offizielles Paket `OpenMD2017.zip` [G, F4] | `MD-2017`, STM32 | `MD-2017` | Veröffentlichungsbeleg; den UV380-Leitfaden nicht vollständig übertragen |
| MD-380 / MD380 | Connector-Bezeichnung; bei dieser Abfrage kein Ziel oder verifiziertes Paket dafür [L] | Kein Ziel | `MD-380` | **Nicht MD-UV380**; Frequenzbänder und Kompatibilität der Varianten sind hier nicht zertifiziert |
| DM-32 / DM32 | Vorgesehene Identifizierungsbezeichnung [L] | Kein Ziel | `DM-32`, logische Familie SERIAL | Firmware, GPS, APRS oder vollständige Zuordnung werden durch diesen Namen nicht zertifiziert |
| UV008 | Vorgesehene Identifizierungsbezeichnung [L] | Kein Ziel | `UV008`, logische Familie SERIAL | Keine Zertifizierung kommerzieller Gleichwertigkeit oder HF-Fähigkeiten |

Die Quansheng-Ziele `UV-K1` und `UV-K5-V3`, die ebenfalls in `TARGETS` enthalten sind, sind **kein OpenGD77**. Sie sind nicht Gegenstand dieses Leitfadens.

### Weitere Aliasnamen und Bezeichnungen im Leitfaden

| Namen | Was bestätigt ist | Was nicht daraus abgeleitet werden darf |
| --- | --- | --- |
| GD-77 ↔ TYT MD-760 | Der Installationsabschnitt bezeichnet MD-760 als GD-77 | Kompatibilität mit anderen ähnlichen TYT-Geräten |
| DM-1801 Version 1 ↔ Baofeng DM-860 | Im Leitfaden ausdrücklich angegeben | Dass ein DM-1801 von 2022 durch die Bezeichnung DM-860 wieder kompatibel wird |
| RD-5R ↔ Baofeng DM-5R **Tier 2** | Ausdrücklicher Alias bei der Installation | Dass jedes DM-5R, einschließlich anderer Designs/Versionen, ein RD-5R ist |
| MD-9600 ↔ Retevis RT-90 | Offizielle gemeinsame Behandlung bei Installation und Betrieb | Ein Image für alle Revisionen beider Marken |
| MD-UV380 ↔ Retevis RT-3S | Offizielle gemeinsame Behandlung; auch in der Katalogbezeichnung dargestellt | Identität mit MD-380 oder automatische Kompatibilität aller 10W-Versionen |
| TYT MD-730 und GD-77S | MD-730 erscheint in der Liste der Bedienelemente für den Wechsel in den Aktualisierungsmodus neben GD77/GD77S/MD760 | Diese isolierte Erwähnung bestätigt hier weder einen vollständigen Alias GD77S↔MD730 noch ein separates Ziel |
| DM-1701 und RT-84 | Beide haben Anweisungen im selben Kapitel | Image-Alias: Es gibt unterschiedliche ZIP-Dateien |
| MD-UV390 und MD-UV380 | Der Leitfaden dokumentiert UV390 in seinem Umfang und beim GPS | Austauschbares Image für jede UV390-Revision |
| MD-2017 und Retevis RT82 oder andere Handelsnamen | Mit den untersuchten Quellen wurde kein Alias bestätigt | MD2017-Images nicht aufgrund einer Händlerangabe verwenden |
| DM1701RGB, DM32, UV008 und andere Geräte | Nur die angegebenen lokalen Bezeichnungen | Eine Transportfamilie beweist keine identische Hardware |

Die Tabelle verhindert, dass aus kommerzieller Nähe, äußerlicher Ähnlichkeit oder der Zugehörigkeit zum selben Index eine technische Gleichwertigkeit abgeleitet wird.

## 3. Familien und Identifizierungsprotokoll der Webanwendung

Die folgende Einteilung entspricht **der Implementierung des Connectors**, nicht einem universellen Verzeichnis aller Mikrocontroller in Geräten, die unter ähnlichen Bezeichnungen verkauft werden:

| `radioType` | Interpretierte Bezeichnung | Logische Familie und vom Code ausgewählter Transport |
| --- | --- | --- |
| 0 | GD-77 | MK22 / USB |
| 1 | GD-77S | MK22 / USB |
| 2 | DM-1801 | MK22 / USB |
| 3 | RD-5R | MK22 / USB |
| 4 | DM-1801A | MK22 / USB |
| 5 | MD-9600 | STM32 / USB |
| 6 | MD-UV380 | STM32 / USB |
| 7 | MD-380 | STM32 / USB |
| 8 | DM-1701 | STM32 / USB |
| 9 | MD-2017 | STM32 / USB |
| 10 | DM-1701 RGB | STM32 / USB |
| 11 | DM-32 | SERIAL / WebSerial bei 115200 |
| 12 | UV008 | SERIAL / WebSerial bei 115200 |

`connect()` fordert eine 46 Byte große RadioInfo-Struktur an, akzeptiert Strukturversionen **1 bis 4**, prüft den Typbereich und verlangt, dass die ausgewählte Familie übereinstimmt. Modell, Firmware und Build werden ausgelesen. Wenn diese Daten nicht erkannt werden, wird die Struktur abgewiesen: Eine Speicherbelegung darf nicht geraten werden.

In dieser Tabelle gibt es keine eigenen IDs für RT90, RT3S, RT84, UV390, HW V1/V2/V4/V5 oder 10W PLUS. Daher kann die Liste nicht alle Varianten eindeutig erkennen. Sie garantiert auch nicht, welchen Wert eine nicht getestete Firmware zurückgeben wird.

Das Web-Backup verwendet unterschiedliche Kalibrierungskarten für MK22 und die übrigen Familien sowie Segmente zur Rekonstruktion des Standard-Codeplugs. Dass dieser Weg im Code vorhanden ist, belegt für sich allein weder physische Tests noch Gültigkeit für zukünftige Builds oder eine vollständige Kopie bei jedem SERIAL-Modell. Bei einer unerwarteten Antwort den Fehler aufbewahren und die Familie nicht erzwingen. [L]

## 4. MD-9600 / RT-90: HW-Revisionen 1, 2, 4 und 5

Das Projekt erklärt, dass sich PLL und Zwischenfrequenz während der Produktion geändert haben. Der Platinenaufdruck reicht möglicherweise nicht aus: Bei einigen Geräten änderte sich die Hardware, ohne dass sich diese Markierung änderte. Der Katalog löst diese Mehrdeutigkeit nicht.

| Lokales Ziel | Im offiziellen Index beobachtete Datei [F3] | Auswahlkriterium |
| --- | --- | --- |
| `MD-9600-V1` | `MD9600_firmware_HW_V1.zip` | HF-Revision mit HW1 kompatibel und für das Gerät dokumentiert |
| `MD-9600-V2` | `MD9600_firmware_HW_V2.zip` | HF-Revision mit HW2 kompatibel |
| `MD-9600-V4` | `MD9600_firmware_HW_V4.zip` | HF-Revision mit HW4 kompatibel |
| `MD-9600-V5` | `MD9600_firmware_HW_V5.zip` | HF-Revision mit HW5 kompatibel; laut Leitfaden ist für Platine 4A Firmware V5 vorgesehen |

Der Index enthält außerdem japanische Varianten mit dem Präfix `Japanese_`. Im lokalen Katalog oder in diesem Index gibt es kein Ziel V3: Keines aus der numerischen Reihenfolge ableiten.

Der Leitfaden warnt außerdem, dass einige sehr alte Geräte mit Platinenmarkierung Version 2 möglicherweise Firmware V1 benötigen. Obwohl der historische Text bei fehlendem RX/TX vorschlägt, eine andere Revision auszuprobieren, macht dieser Leitfaden daraus **kein universelles Verfahren zum blinden Flashen**. Platine und Gerät dokumentieren, die Anweisungen für die jeweilige Revision beachten und Sicherungen aufbewahren.

Ein passender Codeplug mit einem falschen HW-Image kann RX/TX außer Betrieb setzen. Änderungen an TG, Filtern oder Tönen beheben keine falsche PLL-/IF-Auswahl. Die HW-Firmwareversion ist weder die CPS-Version noch die Version der RadioInfo-Struktur.

## 5. UV380, UV390, RT3S und 10W-Varianten

| Fall | Beleg | Grenze der Schlussfolgerung |
| --- | --- | --- |
| Standard-UV380 / RT3S | Gemeinsamer Leitfaden und lokales Ziel `MD-UV380` | Gerät, GPS-Ausstattung und Build prüfen |
| UV380 10W ohne PLUS | `Mode`-Option zur Anpassung der angezeigten Leistungsskala laut Leitfaden | Die Auswahl der Skala erhöht nicht die tatsächliche Sendeleistung |
| UV380 10W PLUS | Offizielle ZIP-Datei und separates lokales Ziel | Das Standard-Image nicht laden, nur weil beide «UV380» heißen |
| UV390 | Im Geltungsbereich und im GPS-Abschnitt des Leitfadens erwähnt | Kein lokaler Selektor zertifiziert automatisch seine Variante |
| UV390 10W/PLUS laut Händler | Hier keine konkrete Übereinstimmung verifiziert | Platine und offizielle Hinweise prüfen, bevor ein Image ausgewählt wird |

Daraus darf nicht geschlossen werden, dass Versionen ohne PLUS und PLUS dasselbe Installationsverfahren, Display, GPS oder dieselbe Kalibrierung verwenden. Ebenso wenig liefern alle als «10W» angebotenen Handfunkgeräte nachweislich diese gemessene Leistung.

## 6. Bänder, Leistung und Funktionen: dokumentiert und noch offen

Hier wird keine Handelstabelle zu RX/TX-Bereichen oder Wattzahlen pro Funkgerät veröffentlicht: Die konsultierten Quellen verifizieren regionale Varianten und Revisionen nicht einheitlich. Es werden nur belegte Angaben gemacht und ihre Grenzen genannt.

| Funktion | Verwendbarer Beleg | Nicht übertragen auf … |
| --- | --- | --- |
| FM und DMR | Funktionsumfang und Modi des Leitfadens für unterstützte Plattformen; DMR erfordert das Codec-/Donor-Verfahren | Jede Connector-Bezeichnung oder eine Installation ohne passenden Donor |
| VHF/UHF | Der Leitfaden behandelt Grenzwerte beider Bänder und FM-/DMR-Kanäle | Gleichzeitigen Dualempfang oder exakte, für alle Modelle garantierte Bereiche |
| 200/220-MHz-Band | Das Handbuch beschreibt Softwaregrenzen und warnt, dass für 200 MHz ein geeigneter RX-/PA-Abschnitt fehlt und erhebliche Störsignale auftreten | Alle Geräte als «Triband» betrachten oder TX dort empfehlen |
| Leistung 5 W / 10 W / Mobilgerät | Der Leitfaden enthält unterschiedliche Skalen und Tabellen sowie ein separates PLUS-Paket | Eine gemeinsame maximale Leistung oder Eignung für Dauerbetrieb |
| Display/Tastatur | GD77S hat beides nicht; Bedienelemente und Größen anderer Modelle unterscheiden sich | Dass ein Screenshot oder eine Tastenkombination überall gilt |
| GPS | Der Leitfaden behandelt optionale Empfänger bei MD9600/RT90 und UV380/RT3S; der GPS-Bildschirm erwähnt auch UV390, DM1701 und RT84 mit installiertem GPS | Alle Geräte oder garantiertes GPS bei DM1701RGB/DM32/UV008 |
| RTC | Das Satellitenkapitel zählt MD9600/RT90, UV380/RT3S und DM1701 in seinem Kontext auf | Jedes andere, spätere Modell automatisch als «ohne RTC» einstufen |
| FM-APRS-TX | Im Leitfaden dokumentiert; Profil und Position erforderlich | APRS-Empfang, bidirektionale Nachrichten oder identische Ressourcen in jedem Build |
| NMEA / GPS-Aufzeichnung | Optionen bei entsprechender Hardware und ausreichendem Speicher dokumentiert | Dass der Zusatz NMEA einen Empfänger hinzufügt oder die ID-Datenbank unberührt lässt |
| Hotspot | Für kompatible Plattformen dokumentiert; RD5R/DM5R wegen USB während TX ausgeschlossen | RD5R, Vollduplex oder jede neue Connector-Bezeichnung |
| Satelliten | Bahnvorhersage und Doppler-Korrektur bei korrekter Zeit/Position/Keps dokumentiert | Alle Weltraum-Modi oder Empfang der eigenen Übertragung im Duplexbetrieb |
| Sprachzugänglichkeit | Externe Sprachdateien und Ansagestufen; bei GD77S unverzichtbar | Automatisch integrierte Ansagen in jeder ZIP-/Sprachversion |

### Frequenzen im Handbuch sind keine Zulassung

Unter `Radio Options — Band Limits` unterscheidet der Leitfaden:

- Software-TX-Grenzwerte mit einem auf die USA bezogenen Standardwert: **144–148, 222–225 und 420–450 MHz**. **Das ist weder der spanische Bandplan noch eine örtliche Sendeberechtigung.**
- Allgemeine, für die Plattformen in diesem Kapitel beschriebene Abstimmgrenzen: **127–178, 190–282 und 380–564 MHz**; bei MD9600/RT90 ist der mittlere Bereich ausdrücklich ausgeschlossen.
- Die vom Text zitierte Spezifikation des AT1846S-Schaltkreises: **134–174, 200–260 und 400–520 MHz**, zusammen mit Warnungen vor Betrieb außerhalb der Spezifikation.

Diese Zahlen beschreiben unterschiedliche Zusammenhänge. Sie dürfen nicht zu «garantierten Bändern aller Modelle» zusammengefasst oder auf DM32, UV008, RGB oder MD380 übertragen werden, nur weil diese in einem lokalen Array erscheinen. Das Handbuch warnt vor Störaussendungen im mittleren Band, da geeignete Stufen fehlen: **Dieser Leitfaden empfiehlt dort keinen Sendebetrieb.** Stelle die für dein Land zugelassenen Grenzwerte und tatsächlichen Geräteeinschränkungen ein.

### Codeplug-Grenzen und Gerätefähigkeiten

Der Webeditor unterstützt das Standard-Binärformat von **128 KiB** und lässt Kanäle **1025+** aus. Das bedeutet nicht, dass alle Funkgeräte dieselbe Höchstzahl an Kanälen, Kontakten, IDs oder Zonen haben. Sprachdateien, GPS-Aufzeichnungen und ID-Datenbanken konkurrieren auf manchen Plattformen um Speicher. Auch die pro ID-Eintrag gewählte Länge verändert die Kapazität. CPS/Build und tatsächlichen Speicher des Geräts prüfen.

## 7. Bedienelemente und Bootloader: keine universelle Tastenkombination

Der Leitfaden verwendet logische Bezeichnungen wie SK1, SK2, Green, Red und Orange. Ihre Positionen unterscheiden sich je nach Funkgerät und bei Mobilgeräten je nach Bedienfeld oder Mikrofon.

| Familie/Modell | Dokumentierter Betriebsunterschied | Vorsicht |
| --- | --- | --- |
| GD-77 | Zwei Seitentasten und obere Taste; Referenz des Handbuchs | Positionen nicht auf jedes Baofeng übertragen |
| GD-77S | Wahlschalter mit 16 Positionen und per Sprache angesagte Modi | Keine Bildschirmmenüs oder Zifferntastatur |
| DM-1801 / DM-860 | Eigene MR/VFO- und A/B-Bedienelemente | Die Revision von 2022 ist nicht allein durch ähnliche Tasten validiert |
| RD-5R / DM-5R Tier 2 | A/B und Band ersetzen links/rechts; langes Drücken öffnet das Schnellmenü | Keine physische Orange-Taste wie beim GD77 |
| MD-UV380 / RT-3S | Drehregler und Pfeiltasten haben andere Funktionen | Kontext prüfen: Kanal/VFO oder Menü |
| DM-1701 / RT-84 | P1/P2 übernehmen links/rechts-Funktionen | Eigene Pakete; Positionen nicht intuitiv austauschen |
| MD-9600 / RT-90 | Bedienfeld und Mikrofon mit spezifischen Zuordnungen | Laut Leitfaden lässt sich die VFO-Suche nicht vollständig am Bedienfeld steuern |
| MD-2017 | Der Leitfaden enthält eine eigene Bedienelementübersicht | Nicht durch die UV380-Übersicht ersetzen |
| RGB / DM32 / UV008 / MD380 | In dieser Abfrage wurden keine spezifischen Anweisungen verifiziert | Keine Tastenkombination erfinden |

Verwende zur Firmwareinstallation die Anweisungen für die **genaue Variante** des Projekts und den passenden Updater in OpenGD77 CPS. Der Leitfaden unterscheidet seitliche Tastenkombinationen bei MK22, P1 und obere Taste bei Mobilgeräten sowie PTT mit einer anderen Taste bei bestimmten STM32-Handfunkgeräten. Es wird keine universelle Anleitung wiedergegeben, da weder Identifizierung noch Handelsname alle Fälle validieren.

Bei STM32 unterscheidet sich der DFU-Bootloader samt Treiber vom normalen CPS-/USB-Modus. Während der Aktualisierung kann ein leerer Bildschirm normal sein. Keine beliebigen Tastenkombinationen ausprobieren und keine Dateien einer anderen Familie schreiben, um einen Anschluss zu erzwingen.

## 8. Szenarien zur sicheren Auswahl

### «Ich habe einen DM-1801. Ist das DM1801-Paket geeignet?»

1. Feststellen, ob es sich um Hardwareversion 1 oder die neue Revision von 2022 handelt.
2. Wenn es die laut Leitfaden ausgeschlossene Revision ist, das OpenDM1801-Paket nicht allein wegen des Namens verwenden.
3. Bei DM1801A nicht durch DM1801 ersetzen: Katalog und Veröffentlichung haben unterschiedliche Ziele.
4. Wenn die Revision nicht feststellbar ist, aktuelle Konfiguration behalten und Installation abbrechen.

### «Mein RT3S wird als MD-UV380-Familie erkannt»

Die Zuordnung ist durch das Projekt und die Katalogbezeichnung dokumentiert. Prüfe trotzdem Hardware, GPS-Ausstattung und Image-Hinweise. Der Gruppenname beweist weder gleichzeitigen Empfang auf zwei Kanälen noch macht er das Funkgerät zu einem 10W PLUS.

### «Der Connector erkennt DM32. Kann ich es jetzt programmieren?»

Die Bezeichnung ist als Typ 11 und Transport SERIAL vorgesehen. In `TARGETS` gibt es kein DM32-Firmwareziel. Ein offizielles Paket und alle Funktionen wurden hier nicht bestätigt. Die Webanwendung gewährt keine Schreibberechtigung, selbst wenn Identifizierung und Lesen erfolgreich sind. Status von OpenGD77 auf dem DM-32, Installation, Sicherungen und das Bauen offener Firmware: [DM-32UV-Leitfaden](DM32UV-FIRMWARE.md).

### «Es gibt eine offizielle ZIP-Datei für MD2017. Warum steht es nicht am Anfang des Handbuchs?»

Der Leitfaden wird abschnittsweise aktualisiert, und sein Titelbereich listet nicht notwendigerweise jede spätere Veröffentlichung auf. Die Bedienelementübersicht und der offizielle Index sind konkrete zusätzliche Belege. Daraus folgt nicht, dass alle Details eines anderen Modells ohne Prüfung für MD2017 gelten.

### «Ich möchte meinen MD9600 mit einer Sicherung eines anderen Geräts wiederherstellen»

Keine fremde Kalibrierung verwenden. Codeplug, Ressourcen, Kalibrierung und Firmware unterscheiden; HF-Revision bestimmen und Sicherungen des eigenen Geräts aufbewahren. Ein heruntergeladenes Image ersetzt nicht das von der Webrichtlinie verlangte MCU-Backup.

## 9. Kompatibilitätsdiagnose

| Hinweis | Vorsichtige Interpretation | Maßnahme |
| --- | --- | --- |
| Im Katalog, aber nicht mit seinem Alias in `MODELS` | Downloadziel und Identifizierung müssen nicht denselben Namen verwenden | Dokumentierte Familie prüfen; keine wörtliche Übereinstimmung aller Aliase verlangen |
| In `MODELS`, aber nicht im Katalog | Es gibt eine Protokollbezeichnung, aber keine ausgewählte herunterladbare Firmware | Kein ähnliches Modell als Ersatz wählen |
| Gerät meldet sich als MD9600 | Familie ist bekannt, aber nicht unbedingt HW1/2/4/5 | Revision vor der Installation bestimmen |
| UV380 und Händler sagt «Plus» | Möglicherweise Hardware mit eigenem Image | Platine und vollständige Bezeichnung prüfen |
| UV390 wird im Leitfaden erwähnt | Offizielle Erwähnung, aber kein eigener lokaler Selektor | Exakte Hinweise dieser Variante suchen, nicht UV380-ZIP annehmen |
| MD380 ohne «UV» | Anderer Modellname | `OpenMDUV380.zip` nicht wegen der Namensähnlichkeit laden |
| Ausgewählte Familie wird abgewiesen | Identifizierung stimmt nicht mit erwartetem Transport oder unterstütztem Format überein | Fehler sichern und Prüfung nicht deaktivieren |
| Backup endet unvollständig | Im Webablauf fehlt ein vollständiges MCU-Backup | Gelesene Daten exportieren; Schreiben gesperrt lassen |
| Eine Funktion aus Screenshots fehlt | Abweichender Build, Plattform, Ressourcen oder Hardware | Version und Hinweise vergleichen, nicht nur Marke/Modell |

### Checkliste, bevor du Unterstützung behauptest

- [ ] Vollständiges Modell und Hersteller notiert.
- [ ] Tatsächliche Platinenrevision bestätigt, sofern erforderlich.
- [ ] Firmware, Build und CPS notiert.
- [ ] Alias durch eine Quelle belegt, nicht nur durch einen Händler.
- [ ] Image nach Modell/Variante und nicht nach Ähnlichkeit ausgewählt.
- [ ] GPS, RTC, Leistung, Display und Bänder ohne Beleg nicht vorausgesetzt.
- [ ] Normaler USB-Modus vom Bootloader unterschieden.
- [ ] Original-Sicherungen exportiert und Umfang jeder Sicherung verstanden.
- [ ] Beschränkung auf 128 KiB und erweiterte Kanäle berücksichtigt.
- [ ] Web-Schreibzugriff weiterhin **GESPERRT**.

## 10. Quellen und zeitlicher Geltungsbereich

Alle folgenden Quellen wurden am **2026-10-25** konsultiert. Die Links belegen Informationen, sind aber keine Berechtigung, Firmware auf ein beliebiges anderes Gerät zu laden.

| Kennung | Verifizierte Quelle | Beitrag |
| --- | --- | --- |
| G | [Offizieller englischer Leitfaden](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md); [feste Referenz 33de63dcb002fcd837419fda25a2e535b940dbcd](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md) | Installationsmodelle, DM1801-Warnung von 2022, ausdrückliche Aliase, Bedienelemente und plattformspezifische Funktionen |
| R | [Repository LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide) | Herkunft des Leitfadens und GPL-2-Angabe für dessen Dokumente; gepflegt wird nur Englisch |
| W | [OpenGD77-Startseite](https://www.opengd77.com/) | Forenstatus und Zugang zum statischen Archiv |
| A | [Forumarchiv](https://www.opengd77.com/archive/index.html) | Historischer Kontext; der sichtbare Snapshot stammt aus Juli 2025 und ist keine aktualisierte Matrix für 2026 |
| F1 | [GD77, 2026-05-04 / 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/) | MK22-Pakete je Modell und, sofern vorhanden, NMEA-/Japanese-Varianten |
| F2 | [MDUV380_DM1701, 2026-05-04 / ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/) | Eigene ZIP-Dateien für UV380, UV380 10W PLUS, DM1701 und RT84 |
| F3 | [MD9600, 2026-05-04 / e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/) | ZIP-Dateien für HW V1/V2/V4/V5 und japanische Varianten |
| F4 | [MD2017, 2026-05-05 / 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/) | Veröffentlichung des MD2017-Images und einer japanischen Variante |
| L | [`firmware-core.js`](../../../firmware-core.js), [`gd77-connector.js`](../../../gd77-connector.js), [`radio-ui.js`](../../../radio-ui.js) | Katalog, Protokollbezeichnungen und tatsächlicher Umfang von Lesen/Bearbeiten/Web-Sperre | 

Die `Latest`-Pfade dieser Familien verwiesen auf die genannten datierten Indizes; es wird nicht behauptet, dass sie alle verfügbaren Builds enthalten oder dass «Latest» für jedes Gerät stabil bedeutet. Die Bezeichnungen `Japanese`, `JA` oder `NMEA` kennzeichnen Vertriebsvarianten, keine neuen Modelle oder gleiche Fähigkeiten.

Die in der README des Leitfadens angegebene GPL-2-Lizenz **belegt weder eine MIT-Lizenz der Firmware** noch eine einheitliche Lizenz für CPS, Sprachdateien, Donor-Firmware und Codec. Vor der Weiterverbreitung die Bedingungen jeder Komponente prüfen.

**Ausdrücklich beibehaltene Sperren und Lücken:** fehlendes vollständiges MCU-Backup im Web; mehrdeutige Handelsrevision bei bestimmten Geräten; keine verifizierte variantenspezifische Zuordnung für UV390; keine nachgewiesene vollständige Unterstützung von DM1701RGB, DM32, UV008 und MD380 allein aufgrund ihrer Bezeichnungen. Diese Lücken werden nicht dadurch geschlossen, dass jedem Modell die Funktionen des allgemeinen Handbuchs zugeschrieben werden.