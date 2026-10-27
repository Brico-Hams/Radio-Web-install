# Prüfung der Anforderungen und Lieferung

Revision vom 25-10-2026. Das Projekt befindet sich weiterhin in der Beta. Diese
Matrix unterscheidet implementierte Funktionen von physischen Tests und offenen
Zielen. Eine erfolgreiche Kompilierung beweist nicht, dass ein Funkgerät damit
gestartet ist. **Lieferung unvollständig:** Anforderungen müssen noch
implementiert und validiert werden.

## Ergänzende Revision vom 26-10-2026

Die Matrix und Zahlen vom 25-10 weiter unten sind historisch. Für das aktuelle
Audit siehe [Vollständige Validierung V3 und Android](VALIDACION-INTEGRAL-V3-ANDROID.md):
283 lokale Webtests erfolgreich, 92 lokale Android-Hosttests und 93 in der
isolierten veröffentlichten Revision `01c58563e6507d17bd2bec612ef669840abfeddb`.
Dies sind nicht austauschbare Ergebnisse. Die lokale Korrektur des
sektorweisen Android-CRC ist nicht veröffentlicht. Die instrumentierten Tests
verwenden eine isolierte Basis und kompilieren, wurden aber nicht auf einem Gerät
ausgeführt. Es gibt kein physisches Zertifikat für Kontakte, Kanäle oder CAT des
aktuellen SAT-Slots.

Die veröffentlichte Revision enthält Bücher für General/POTA/SOTA und eine
Überflugliste, die in dieser lokalen Basis nicht vorhanden sind. Die
historischen Matrixpunkte AND-02/AND-06 sind je nach geprüfter Revision zu
interpretieren. Der unabhängige Resident und die BHA1-Apps sind experimentell:
Portable Tests entsprechen keiner physischen USB-/Flash-Unterstützung oder
validiertem Start.

## Geprüfte Anforderungen

| ID | Anforderung | Status und Nachweis | Noch erforderlich, um sie abzuschließen |
| --- | --- | --- | --- |
| USB-01 | Quansheng-PMR- und Repeater-Kanäle laden und löschen | Connector, Editor und Schutzmaßnahmen implementiert. Zwei übereinstimmende reale Lesevorgänge von Konfiguration und Kalibrierung; 200 Kanäle in F4HWN v6.0.0 | Vollständige Sicherung und reale Schreib-, Lösch- und erneute Lesetests |
| USB-02 | Quansheng-Satelliten und Dopplerspeicher laden | SGP4-Planung, RX-Speicher und experimentelles CAT RX im Satelliten-Image | RF-Validierung und physisches Laden von Speichern auf dem Gerät |
| FW-01 | Firmware-Versionskatalog | Katalog und Leitfäden nach Familien, Revisionen und Optionen | Abdeckung bei neuen Versionen pflegen; Erkennung ist kein Nachweis für getestete Kompatibilität |
| WEB-01 | Website veröffentlichen und erneut bereitstellen | Zuletzt veröffentlichtes main: `f7bd6125893385dd517fecd105967f241a65991f` | Spätere Änderungen veröffentlichen und Pages prüfen; bei dieser Revision gibt es keine neue Veröffentlichung |
| FW-02 | Karina umfassend dokumentieren | V1-Dossier, Dim0s-V3/UV-K1-Paket, Inventare, Hashes und beobachtete Funktionen | Funktionalen und visuellen Abgleich vervollständigen; Quellprojekt wurde nicht wiederhergestellt |
| FW-03 | Bricohams mit allen Karina-Funktionen | Eigenständige Implementierung auf Grundlage der offenen F4HWN-V3-Basis; keine Kopie oder erneute Kompilierung von Karina | Vollständige Funktionsparität und Tests je Funktion; 100 % werden nicht behauptet |
| FW-04 | Multiboot und modulare Kompilierung auf Anfrage | Builder mit festgelegtem Commit, Presets, separaten Modulen und struktureller Prüfung | Start, Slotwechsel und Wiederherstellung auf V3 ohne Ersetzen von Main testen |
| FW-05 | Bibliothek vorhandener Firmware in Slots | Lokale Auswahl und Klassifizierung nach Format/Modell; inkompatible Images werden abgewiesen | Jedes kompatible Image installieren und testen; V1 wird nicht automatisch in V3 umgewandelt |
| FW-06 | ARDF separat aktivierbar, falls nicht alles hineinpasst | ARDF-Image: Zyklen, Synchronisierung und manueller Dämpfungsspeicher | Praxistests und übrige dokumentierte Verhaltensweisen |
| FW-07 | Spektrum und VFO-PRO-Funktionen | Spektrum-Image: RSSI, Peak Hold, Mittelwert, RAM-Presets, Ausschlüsse, RX-Aufnahme und CSS-Suche | RF/CSS und Gleichwertigkeit noch offener Funktionen prüfen; sendet und kalibriert nicht |
| FW-08 | Spektrum-Presets beibehalten | BHSP-Export/-Import mit atomarer Validierung und erneutem Einlesen | Interne Persistenz, falls nötig; Dateien sind kein EEPROM |
| FW-09 | MIT-Lizenz für Karina angegeben | Angabe protokolliert; im Paket wurde kein überprüfbarer Hinweis gefunden | Rechteinhaber, Komponente und Lizenztext vor einer Weiterverteilung unter MIT ermitteln |
| HELP-01 | Vollständige Hilfe zu allen Familien und Optionen | Vierzehn HTML-Leitfäden, einschließlich Android und dieser Revision; 84 UI-Optionen, Historie von 18 Versionen und 94 historische Optionen | Mit jeder neuen Funktion erweitern; keine Abdeckung von Varianten ohne Beleg behaupten |
| HELP-02 | OpenGD77 und alle Modelle | Konfigurationsleitfaden und Matrix nach Familien/Revisionen | Physische Tests je Modell; der Katalog zertifiziert nicht alle Funkgeräte |
| PRO-01 | PRO-Modus ohne wiederholte Bestätigungen | Explizite Aktivierung pro Sitzung und geschützte Vorgänge | Entfernt weder Browserberechtigungen noch Sicherung, CRC, Hashes oder Main-Schutz |
| DATA-01 | RepeaterBook in der installierten Version konfigurieren | Anbieterformular und lokaler Server mit Token im Speicher | Mit eigenen Anmeldedaten und Genehmigung testen; keine Tokens enthalten |
| DATA-02 | DMR-Kontakte automatisch herunterladen | RadioID sowie Auswahl/Import; CSV auf der Website, wenn CORS direkten API-Zugriff verhindert | Pro Gerät und Kapazität prüfen; nicht alle Dienste gestatten direkten Zugriff von Pages |
| DATA-03 | DMR-Räume/Gruppen herunterladen | BrandMeister-Abfrage und Import von Gruppen | Eine Talkgroup entspricht nicht allen Räumen aller Netze; weitere gewünschte Integrationen ergänzen |
| GD77-01 | Vollständiges OpenGD77-CPS ohne Installation | Standardbearbeitung, Referenzen, Daten und Planung im Browser | Flashen, Stimmen, umfangreiche ID-Datenbank, vollständige Zonen/Einstellungen und Parität mit externem CPS nicht implementiert |
| GD77-02 | Automatische Sicherung von Originalfirmware und Kalibrierung vor dem Betrieb | Kalibrierung und Codeplug automatisch mit Hashes; Ergebnis TEILWEISE | Vollständiges Auslesen des MCU pro Modell verifizieren; spätere physische Operationen bleiben gesperrt |
| ANY-01 | AnyTone-CPS für Web | Beta-Bereich mit JSON-/CSV-Projekt, Import, Bearbeitung und Zonen | USB, natives RDT und vollständige Parameter je Modell/Firmware |
| ANY-02 | Codeplug mit digitalen und analogen Repeatern in Spanien | PMR und Normalisierer für RepeaterBook, RadioID und URE | Aktuelle, genehmigte Quellen, geprüfte landesweite Abdeckung und natives Codeplug des exakten Modells |
| ANY-03 | OpenGD77- und Quansheng-Datenbanken wiederverwenden | Import unterstützter Formate unter Beibehaltung bekannter Parameter | Nicht veröffentlichte Felder vervollständigen und prüfen; TS/TG nicht erfinden |
| ANY-04 | Flughäfen, sofern AnyTone Luftfahrtband unterstützt | Import von RF-Frequenzen mit AIP-Quelle und manueller AM-Bestätigung | Exaktes Modell, aktuelle Liste und Prüfung von AM/Kanalraster; keine landesweite Flughafendatenbank enthalten |
| CAT-01 | Frequenz während des ausgewählten Überflugs ändern | CAT RX physisch aktiviert, Lease von 3 s und Web-Tracking mit sicherem Stopp; zusätzlich CAT TX v1 (PTT per Lease, Taste 9) nur zum Senden von SSTV | Reale USB-/RF-Validierung; kein autonomes Tracking im Funkgerät und kein Uplink-Doppler |
| CAT-02 | Frequenz, Untertöne und Leistung je Kanal in Android bearbeiten | Beta-Android-Editor für FM-Kanäle in F4HWN v6: Name, RX/TX, CTCSS/DCS RX und TX, Leistung, schmal und TX-Sperre; vollständige Sicherung mit CRC des Funkgeräts und SHA-256 auf Datenträger, blockweises Schreiben in Web-Reihenfolge und erneutes Einlesen; 10 Hosttests mit simuliertem Funkgerät | Tests in CI ausführen, realer OTG-Test mit Schreiben und erneuter Prüfung auf einem Funkgerät sowie Persistenz nach Neustart |
| AND-01 | Bricohams-Android-App | Kotlin-Projekt 0.8.1-beta; SQLite, ADIF, SSTV, ARDF-Statistiken, Mikrofonaufnahme und CAT RX über CDC ACM und erkannte Adapter mit Hosttests | Offene Funktionen, Installation, Berechtigungen und OTG-/RF-Test jedes Kabels am Smartphone |
| AND-02 | Satellitenfunktionen wie Look4sat mit ähnlicher Oberfläche | Offline-SGP4 für Android, importierte TLE, manueller Beobachter, Überflüge für 24 h und CAT-RX-Doppler mit sicherem Stopp | Look4sat-ähnliche Oberfläche (Überflugliste, Polarradar, Karte), automatische TLE-/Transponder-Downloads, GPS-Beobachter, Matrix aus Smartphone/Kabel/Funkgerät und Feldtest; keine Parität mit Look4sat behauptet |
| AND-03 | Robot36-SSTV mit CAT für Bricohams-Firmware interpretieren | WAV-Decoder und Mikrofonaufnahme mit VIS/Parität, Farbe 320x240 und PNG; CAT-Bildschirm nimmt Robot36 auf, während Doppler oder CAT-Abstimmung aktiv bleiben; synthetische Tests | AudioRecord, physischer Pfad und RF validieren; kontinuierliche Streaming-Decodierung, Drift und Rauschen |
| AND-04 | Morse interpretieren | Text, PCM-WAV und Mikrofonaufnahme bis 60 s mit nachfolgender Decodierung und festen Ton-/Geschwindigkeitswerten; synthetische Tests | Echtes AudioRecord, kontinuierliche Decodierung, Anpassung und Fehlermessungen mit realen Samples |
| AND-05 | «SSTVEncrip»: SSTV nach Art von SSTV Encoder kodieren und senden (vom Benutzer angenommene Interpretation) | Robot36-Encoder mit Rückweg durch den Decoder; Senden vom CAT-Bildschirm über CAT PTT v1 der Firmware (0x7B02): Freigabe am Funkgerät mit Taste 9, Lease von 1,5 s, Abschaltung nach 120 s, TX-Sperre, Bänder, Akku und Modulation des Funkgeräts, Abbruch mit beliebiger Taste, verpflichtendes Rufzeichen im Bild und Bestätigung in der App; C-Tests für Kern und Adapter sowie 4 Hosttests mit simuliertem Funkgerät; Satelliten-Image ohne Warnungen kompiliert | Test am Funkgerät und RF-Messung (Mikrofonpegel, Hub, LED, Abschaltung per Taste); weitere SSTV-Modi (Martin, Scottie, PD); Uplink-Doppler |
| AND-06 | Logbuch wie HAMRS | SQLite-Kontakte, Suche, Bearbeiten/Löschen, ADIF-ASCII mit Import/Vorschau, JSON und transaktionale Wiederherstellung; Hosttests | HAMRS-ähnlicher Ablauf und Oberfläche (Logbücher nach Aktivität, POTA-/SOTA-Vorlagen, Schnelleingabe), Validierung am Telefon und erweitertes ADIF; keine Parität mit HAMRS behauptet |
| AND-07 | Upload zu LoTW | Ziel dokumentiert; ADIF/TQSL ist kein direkter Upload | Signatur, Zertifikat, Schlüsselverwahrung und verifizierbarer LoTW-Ablauf in Android |
| AND-08 | Fuchsjagd-Statistiken mit GPS | Firmware exportiert eine Zusammenfassung; Android speichert Sitzungen, Verlauf, punktuelle Erfassung mit Genauigkeit/UTC, Intervalle pro Bake und gefilterte Summe von GPS-Abschnitten ohne Lücken zu verbinden, nach vorheriger Genehmigung | Echtes GPS, kontinuierliche Strecke, Karten, Synchronisierung mit Firmware und erweiterte Feldstatistiken |
| BRAND-01 | Bricohams-Marke und Bootlogos | Begrüßungsbildschirm und eingebettete monochrome Bitmap; Android bewahrt das Original-PNG und den orangefarbenen Akzent | Physisches LCD und Oberfläche auf dem Smartphone prüfen |
| BRAND-02 | Unternehmensorange nach Fertigstellung und Tests | Palette dokumentiert; Unternehmenslogo beibehalten | Abschließende Migration für Web/Android, Kontrast und visuelle Regressionen |
| DOC-01 | Natürliche Dokumentation ohne KI-Personalisierung | Redaktionelle Prüfung sichtbarer Urheberschaften und dialogischer Erzählungen | Direkten technischen Stil beibehalten; Lizenzen und rechtliche Quellenangaben erhalten |
| REL-01 | Nach Abschluss nach main pushen | Veröffentlichungsgenehmigung protokolliert | Anforderungen abschließen oder ausdrücklich eine Teillieferung vereinbaren; Push ausführen und CI/Pages prüfen |
| REL-02 | Neue Installer mit allen Funktionen | Vorhandene Toolchain für Windows, Debian/Raspberry Pi, Arch und FreeBSD | Auslieferung von derselben Revision erstellen und Inhalt/Start prüfen; in dieser Revision keine neuen Installer |
| REL-03 | ZIP mit Projekt, Firmware, Installern und Entwicklungsständen | Entwicklungs-Exporter mit Integritätsprüfung und Ausschlüssen vorbereitet | Mit allen Lieferartefakten ausführen und Entpacken prüfen; ersetzt keine offenen Funktionen |

## Neueste Software-Nachweise

- 211 JavaScript-Tests in dieser Revision erfolgreich, einschließlich des
  Android-Exports mit ZIP-Entpackung und Integritätsprüfung.
- Acht C-Suites bei der letzten Firmware-Validierung erfolgreich; diese
  Dokumentations- und Lieferrevision ändert keine C-Quellen.
- ARDF-Build mit Statistiken: 113960 bytes RAW, RAM 12576/16384,
  Flash 113072/120832; Manifest und zehn Quell-Hashes geprüft.
- Satelliten-CAT: 113868 bytes RAW. Spektrum mit BHSP: 118044 bytes RAW.
- ARDF-Panel vorhanden und im Browser ohne Verbindung gesperrt.
- Keines dieser Images wurde geflasht oder physisch validiert.
- Android 0.7: APK und instrumentierte Tests kompiliert. Neunundsechzig
  JVM-/Robolectric-Tests in CI erfolgreich, darunter simuliertes USB/CAT, ADIF,
  Robot36, SGP4, Mikrofonaufnahme/-anzeige und ARDF-Statistiken/-Verlauf. Am
  2026-10-26 bestehen lokal die 84 Hosttests, einschließlich Kanaleditor
  (CAT-02) und SSTV-Senden per CAT PTT (AND-05); der erste CI-Lauf steht aus.
  Null Fehler und dreizehn Lint-Warnungen. Signaturen und Hashes der 58 Quellen
  geprüft; das Manifest jedes Builds erfasst das zugehörige Ergebnis.
  Die instrumentierten Tests sind kompiliert, nicht ausgeführt; es ist kein
  Telefon angeschlossen.

Die Zahlen sind zeitgebundene Nachweise und kein Zähler, der Tests jeder
Revision ersetzt. Frühere Builds bleiben Entwicklungsstände; ein Ordnername
mit `final` macht sie nicht zu stabilen Versionen.

## Lieferbedingungen

1. Jede ID prüfen und den offenen Punkt mit Nachweis abschließen oder eine
   genehmigte Änderung des Umfangs protokollieren. Eine Anforderung nicht
   durch einen Button oder Mock ersetzen.
2. Software, Dokumentation, lokalen Start und reale Funktionen testen. Für
   Hardware: vollständige Sicherung, Identifikation und genehmigte Tests.
3. Nach Abschluss der Funktionen die orangefarbene Palette anwenden und prüfen.
4. Installer aus derselben Revision erstellen und Inhalt, Lizenzen, Integrität
   und Start überprüfen. Frühere Pakete nicht als neue wiederverwenden.
5. In main veröffentlichen, CI und Pages prüfen und die veröffentlichte Revision
   protokollieren.
6. Quellen, Verlauf, Firmware-Artefakte samt Quellen und Lizenzen, Installer
   und überprüfbare Entwicklungsstände exportieren. Inventar und Hashes beifügen.
7. ZIP in ein anderes Verzeichnis entpacken, Hashes prüfen und den Start testen.
   Sicherstellen, dass es keine Zugangsdaten, Funkgerätesicherungen oder
   Kalibrierungen enthält.

## Umfang des Exports

Der Exporter erzeugt einen **Beta-Entwicklungs-Snapshot** und zertifiziert nicht,
dass die Matrix abgeschlossen ist. Die Annahme muss mit `--beta` bestätigt
werden. Er veröffentlicht, kompiliert oder flasht nicht. Die Verwendung ist in
[Deployment](../../DEPLOYMENT.md#exportar-el-proyecto) beschrieben. Die endgültige
Lieferung bleibt von den obigen Punkten abhängig.

Entwicklungsstände sind überprüfbare Bricohams-Builds und der Git-Verlauf von
HEAD zusammen mit dem aktuellen Quellenstand. `Documents/Multiboot` wird nicht
standardmäßig aufgenommen: Es enthält Pakete Dritter, Konfigurationen und
Kalibrierungen, die nicht mit einer Projektverteilung verwechselt werden dürfen.
Verzeichnisse fehlgeschlagener Builds werden gemeldet und nicht als Firmware
dargestellt. Die Option `--android` nimmt eine Beta-APK-Lieferung nur auf,
wenn alle Quell-Hashes exakt mit dem exportierten Snapshot übereinstimmen;
Leitfaden, Lizenzen und Build-Nachweis sind enthalten. Historische APK-
Entwicklungsstände ohne zugehörige Quellen oder eine erfundene physische
Validierung werden nicht aufgenommen.
