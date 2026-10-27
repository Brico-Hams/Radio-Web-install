# Hilfebibliothek für Funkgeräte und Firmware

Revision: 25-10-2026. Originalhilfe von Bricohams; ersetzt keine offiziellen
Handbücher und zertifiziert keine Kombinationen, die nicht auf Hardware
getestet wurden.

## Dokumente und empfohlene Reihenfolge

| Leitfaden | Worum es geht |
| --- | --- |
| [Allgemeine Konfiguration und Verfahren](AYUDA-CONFIGURACION.md) | Frequenzen, FM/DMR, Töne, Sicherungen, Repeater, Satelliten, USB und Ergebnisprüfung |
| [Quansheng F4HWN](AYUDA-QUANSHENG.md) | Einstieg von 0 bis 100 %, V1/V2/V3-Hardware, Versionen v4/v5/v6, Editionen, Menüs, Slots, CFG, Apps und Wiederherstellung |
| [Technischer Atlas UV-K5 V3](ATLAS-UV-K5-V3.md) | Innenleben: PY32F071-Pinbelegung, Speicher, serielles Protokoll, Bootloader, SWD, Kompilierung, Mods, Schaltpläne und Fotos |
| [Alle F4HWN-Kompilierungsoptionen](AYUDA-OPCIONES-F4HWN.md) | Bedeutung jeder Katalogoption, Abhängigkeiten und Vorsichtsmaßnahmen |
| [F4HWN-Presetwerte](F4HWN-PRESETS.md) | ON/OFF-Matrizen von 18 veröffentlichten Versionen v4.3.0-v6.3.0, alle Presets und lokale v6.1.0-Profile |
| [ARDF](AYUDA-ARDF.md) | Manuelle Verstärkung, Zyklen, Synchronisierung, Entfernung und Hardwareunterschiede |
| [Original-Egzumer](AYUDA-EGZUMER.md) | V1-Quellen, Apache-2.0-Lizenz und jede untersuchte Makefile-Option |
| [Dim0s-Pack und Karina V3/K1](AYUDA-PACK-DIM0S.md) | Inventar der Varianten, neue PY32-Nachweise, Hashes und Multiboot-/Lizenzgrenzen |
| [OpenGD77: Konfiguration und Betrieb](AYUDA-OPENGD77.md) | FM/DMR, Codeplug, Kanäle, TG, TS, Filter, GPS, APRS und Satelliten |
| [OpenGD77: Funkgeräte und Revisionen](AYUDA-OPENGD77-MODELOS.md) | Modelle, Aliasnamen, Revisionen, Varianten und Unterschiede zwischen Katalog und Identifikation |
| [Karina](KARINA.md) | Inventar, dokumentierte Funktionen, Suche nach Quellcode (geschlossen), Spezifikation zur Reimplementierung und Quellen |
| [Baofeng DM-32UV](DM32UV-FIRMWARE.md) | HR_C7000/FD6818-Hardware, OpenGD77-Status und -Lizenz, Installation, Kompilierung von RadioFoundry und Bootloader-Protokoll |
| [Beispiele](EJEMPLOS.md) | Offene Firmwares F4HWN v6.3.0 und moto samt Lizenz, Beispielkanäle PMR446 und Analyseskripte |
| [Erste Schritte mit Satelliten](INICIACION-SATELITE.md) | Eigener spanischer Leitfaden zum Einstieg mit FM-Satelliten und dem BH-Satélite-Image |
| [Satellitenantennen](ANTENAS-SATELITE.md) | Dualband-Yagi und V-Dipol mit eigenem MoM-Verfahren simuliert, Zeichnungen und STL-Teile |
| [Binärdateien Dritter](BINARIOS-TERCEROS.md) | SHA-256 und Herkunft von Karina, offiziellen/gepatchten DM-32UV-Firmwares, OpenGD77 DM32 und Werksimages für K1/K5 V3; keine Weiterverteilung |
| [Community-Repositories](ENLACES-COMUNIDAD.md) | Geprüfter Katalog von Quansheng- und DM-32UV-Repositories, wiederhergestellte defekte Links und Suche auf anderen Forge-Plattformen |
| [Bricohams V3](BRICOHAMS-FIRMWARE.md) | Reproduzierbare lokale Kompilierung von Fusion und Labs sowie ausgelieferte Artefakte |
| [AnyTone](AYUDA-ANYTONE.md) | Lokaler JSON-/CSV-Vorbereiter; kein RDT-CPS oder USB-Programmiergerät |
| [Android](ANDROID.md) | Experimentelles Logbuch, FM-Kanäle, CAT und Audio; Berechtigungen und Tests je Revision |
| [Vollständige Validierung V3 und Android](VALIDACION-INTEGRAL-V3-ANDROID.md) | Nachweise, behobene Fehler, Datenisolierung, offene Tests und Grenzen von Mods |

Auf den Webseiten kannst du die Browsersuche (Ctrl+F) verwenden.
Die Markdown-Dokumente bleiben für die Offline-Nutzung im Repository erhalten.
Die Webhilfe ist auch im lokalen Server, auf Pages und in den Installern enthalten.

## Was „unterstützt“ bedeutet

Es gibt vier unterschiedliche Begriffe:

1. **Vom Firmwareprojekt unterstützt:** Upstream pflegt ein Image.
2. **Vom Connector erkannt:** Diese Website kennt eine Identifikationsstruktur.
3. **Im Katalog veröffentlicht:** Ein Dateiname aus einer autorisierten Quelle
   wird erkannt. Das bedeutet nicht, dass die Datei mit dieser Website
   installiert werden kann.
4. **Auf einem Funkgerät getestet:** Dafür braucht es einen physischen Nachweis
   für das genaue Modell und den Build. Automatisierte Tests dieser Website
   sind keine solche Zertifizierung.

Eine Tabellenzeile berechtigt nicht dazu, Firmware einer anderen Revision zu
verwenden. „Download“ bedeutet nicht „Flashen“; „geprüfte Datei“ bedeutet nicht
„digital signiert“.

## Versionsabdeckung

| Familie | Konkreter Umfang dieser Bibliothek | Grenze |
| --- | --- | --- |
| F4HWN Quansheng PY32 | 18 erkannte veröffentlichte Versionen; 84 UI-Optionen und 94 verschiedene Schlüssel im Preset-Verlauf nach Commit | Funktionen von v6 werden nicht älteren Versionen zugeschrieben |
| ARDF Quansheng | Erkannte Veröffentlichungen des V3-/UV-K1-Repositorys; lokaler ARDF-Leitfaden v0.5 und Hinweise zur Weiterentwicklung | Schreiben in Slots wird ohne geprüfte Kompatibilität nicht freigegeben |
| Bricohams auf F4HWN | Fusion, Labs, ARDF, Satellite und Spectrum v6.1.0, dokumentierte Optionen und Hashes | Vorherige Lesevorgänge und Slot-CRCs zertifizieren weder Start noch alle Funktionen |
| Eigenständige Bricohams-Plattform | Experimenteller Resident, Diagnostics und Blocks in BHA1, portable Speicherung und Übertragung | Kein physisch validierter Start und keine USB-/Flash-Integration; BHA1 ist kein FAP1 und wird nicht mit dem bestehenden Web-Loader installiert |
| Karina | Lokales V1-Paket und am 21-09-2026 untersuchtes V3/K1-Paket von Dim0s | PY32-Binärdateien sind vorhanden; Quellen und Armel-Multiboot-Kompatibilität nicht nachgewiesen |
| OpenGD77 | Dokumentierte Familien und Modelle; Versionen nach Datum/Build und Vertriebsvarianten identifiziert | Keine universelle Menütabelle für alle historischen Builds |
| Quansheng-Serienfirmware, UVMOD, OneOfEleven | Identifikation und Referenzen zur Vermeidung von Verwechslungen | Keine in dieser Website enthaltenen Protokolle oder Compiler |

„Alle Versionen“ wird als Matrix der Familien, Unterschiede und Quellen je
Version dokumentiert, nicht als Versprechen, dass jedes Menü bereits in der
ersten Firmware vorhanden ist. Notiere für einen konkreten Build Modell,
Revision, Datum, Dateiname, Commit (falls vorhanden) und Hash. Vergleiche
Handbuch und Versionshinweise. Nicht Bestätigtes wird als solches markiert,
anstatt Werte, Shortcuts oder Speicherpläne zu erfinden.

## Sicherheitsregel und gesetzmäßige Nutzung

- Identifiziere die tatsächliche Hardware, nicht nur das Gehäuse.
- Bewahre die Originalkalibrierung und das Codeplug vor einer Migration auf.
- Führe Löschungen, Wiederherstellungen oder Reset nicht wegen eines Portfehlers
  aus, ohne zuvor die Ursache zu kennen.
- Für OpenGD77 hält diese Website das Schreiben gesperrt, weil sie keine
  vollständige, verifizierte MCU-Firmware-Sicherung erhält.
- Bei Quansheng erfordern Änderungen eine vollständige Sicherung; Main ist geschützt.
- Importierte Empfangsdaten beginnen als RX-only.
- Aktiviere TX nicht automatisch oder außerhalb zugelassener Frequenzen. Ein
  PMR-/GMRS-/FRS-/MURS-Firmwareprofil zertifiziert kein Funkgerät.

## Lizenzen: getrennte Komponenten

Die Benutzerangabe „die Lizenz ist MIT“ wird als noch einer Komponente, einem
Rechteinhaber und dem originalen Lizenztext zuzuordnende Erklärung festgehalten.
Sie ändert weder die Lizenz Dritter noch die des bestehenden Repositorys:

- Die Website erklärt GPL-3.0-or-later in ihrem Manifest und der Datei LICENSE.
- Die untersuchten F4HWN-Quellen enthalten Apache-2.0 und NOTICE.
- CHIRP-Treiber aus dem Karina-Paket enthalten GPL-Hinweise.
- Die genaue Lizenz der Karina-Firmware erscheint nicht im untersuchten Paket.
  Die MIT-Angabe des Benutzers enthält keine Quellen und belegt nicht, auf
  welche Dateien/Versionen sie sich bezieht. Der entsprechende Hinweis wird
  ergänzt, sobald es eine überprüfbare Referenz gibt.
- OpenGD77 und seine Komponenten unterliegen ihren eigenen Hinweisen; MIT
  nicht voraussetzen.

Vollständige Handbücher, Karina-Firmware, fremde Kalibrierungen oder Software
Dritter werden nicht allein deshalb weiterverteilt, weil sie zitiert werden.

## Diese Bibliothek aktualisieren

Wertetabellen werden aus festgelegten Katalogen generiert, nicht aus dem Gedächtnis:

```powershell
npm run build:help
```

Wenn ein Katalog geändert wird, müssen Bedeutung neuer Optionen, Versionen und
Abhängigkeiten geprüft, die Seiten neu generiert und die Hilfetests ausgeführt
werden. Beim Öffnen eines Leitfadens wird weder das Funkgerät abgefragt noch
seine Konfiguration geändert.

Der historische Snapshot befindet sich in `f4hwn-history-presets.json`: Er
speichert Commit, SHA-256 und Inhalt von CMakePresets.json für jede Version.
Seine Aktualisierung erfolgt ausdrücklich mit `node scripts/fetch-help-presets.cjs`
aus dem Repository-Stammverzeichnis; dies ruft öffentliche Daten von GitHub ab,
greift jedoch nicht auf Funkgeräte zu und lädt keine lokalen Dateien hoch.
Der normale Hilfegenerator funktioniert offline und lädt keine Quellen herunter.
