# Bricohams Android-Beta

## Umfang der APK

Die Startseite bietet **Systemsprache**, **Español**, **English (US)**, **Français**
und **Deutsch**. Die Auswahl wird lokal gespeichert und gilt für alle Ansichten,
einschließlich USB-Kanäle, CAT, Satelliten und SSTV. Rufzeichen, Kanalnamen und
Benutzerdateien werden nicht übersetzt; die Marke bleibt Bricohams.

Beim Öffnen von Satelliten werden TLE/Frequenzen von CelesTrak und SatNOGS per HTTPS automatisch aktualisiert, wenn der Katalog fehlt oder mindestens 24 h alt ist. In Einstellungen lässt sich dies abschalten. Gespeicherter Standort und Funkkanäle werden nicht gesendet; die Server erhalten die normale HTTPS-Anfrage einschließlich IP-Adresse. Offline-Import bleibt verfügbar. Diese Revision bewahrt die Funktionen von 0.8.0 und bereitet APKs 0.8.3-beta mit versionCode 12 vor. Tests, Lint und Build benötigen JDK 17 und SDK 35 und sind lokal mit Java 8 nicht ausführbar. CI muss die neue APK vor der Verteilung prüfen.

Ohne gespeicherten Beobachter öffnet sich die Offline-Weltkarte ohne GPS-Berechtigung oder erfundenen Standort. Satelliten, Abdeckungen und ausgewählte Flugbahn erscheinen mit gültigen TLE und werden bei sichtbarer Karte alle 5 s aktualisiert. Der gespeicherte Katalog funktioniert offline bis zum TLE-Verfall. Beim ersten Laden werden empfangbare Satelliten ausgewählt (bis zu 20 Einträge ohne Frequenzen); die gespeicherte Auswahl einschließlich Keine bleibt erhalten. Überflugberechnungen benötigen weiterhin den Standort in Einstellungen. Fehler werden angezeigt.

Beim späteren Push des Tags v0.5.2 hängt Android Beta beide APKs 0.8.3-beta (Debug-App und instrumentierte Tests) sowie SHA256SUMS-android an die vom Installer-Workflow erstellte Release an. Keine lokale Veröffentlichung.

Die [integrierte Validierung V3/Android](VALIDACION-INTEGRAL-V3-ANDROID.md) unterscheidet
Host-Tests von Tests mit Telefon/Funkgerät und enthält die Matrix für Kontakte,
Kanäle je Slot und CAT. Das Audit läuft noch und ist nicht zertifiziert.

Native Kotlin-Anwendung für Android 8.0/API 26 oder höher, ohne Server
oder Konten. Es handelt sich um eine unabhängige
Implementierung: Sie enthält weder Code noch Ressourcen von Look4sat, Robot36
oder HAMRS. Die Version `0.8.3-beta` ersetzt deren vollständigen Funktionsumfang nicht.

| Funktion | Status |
| --- | --- |
| Kontakte im Logbuch | Erstellen, suchen, anzeigen, bearbeiten und nach Bestätigung löschen; lokale SQLite-Datenbank |
| Kontaktaustausch | ADIF ASCII-Export/-Import mit Vorschau, JSON UTF-8 und Wiederherstellung einer JSON-Sicherung |
| LoTW | ADIF-Export für TQSL am Computer; keine Signatur und kein Upload von Android |
| ARDF | Dauerhafte Sitzungen, Peiler 1-10, Verlauf, Zähler, Intervalle je Peiler und gefilterte Summe der GPS-Segmente |
| GPS | Einzelne Telefonposition mit Genauigkeit und Zeitpunkt des Fixes, nach vorheriger Genehmigung |
| ARDF-Export | JSON mit Sitzungen, Beobachtungen, Kontakten und Koordinaten, sofern vorhanden |
| Morse aus Text | Punkte/Striche; Leerzeichen zwischen Buchstaben und `/` zwischen Wörtern |
| Morse aus Audiodatei | Experimentell: WAV PCM mono 16 Bit, konfigurierbarer Ton und Geschwindigkeit |
| Mikrofon | Aufnahme im Vordergrund bis zu 60 s und anschließende Morse-/Robot36-Decodierung; kein Mithören oder kontinuierliches Decodieren |
| USB/CAT RX | CDC ACM und erkannte USB-Seriell-Adapter mit einem Port, Identifikation F4HWN v6+, Abfrage, bestätigte temporäre Abstimmung und STOP; experimentell |
| CAT TX (PTT) | Robot36-Senden über eine am Funkgerät (Taste 9) aktivierte Lease, Rufzeichen erforderlich, Begrenzung auf 120 s, Ablehnung bei TX-Sperre und außerhalb der Bänder; experimentell |
| Satelliten | SGP4 offline, importierter TLE-Katalog, manueller Beobachter, Vorhersage für 24 h und Doppler-RX-Tracking über CAT während des ausgewählten Überflugs |
| SSTV Robot36 | Decodierung von WAV oder Mikrofonaufnahme, auch mit Abstimmung per CAT, sowie Robot36-Codierer zum Senden per PTT CAT; experimentell |
| Kanäle, Subtöne und Leistung schreiben | F4HWN-v6-Editor für FM-Kanäle per USB mit vollständiger Sicherung und erneutem Einlesen |

Die Oberfläche verwendet das originale Bricohams-PNG und einen orangefarbenen
Akzent auf dunklem Hintergrund. Das Symbol behält die Originalmarke bei,
statt eine Variante zu erfinden; lint weist auf seine unkonventionelle
Launcher-Silhouette hin. Die Farbpalette der Website wurde noch nicht geändert:
Die endgültige Migration steht noch aus.

## Installation und Daten

Die Entwicklungs-APK ist mit dem Debug-Schlüssel des Android-Tools signiert,
nicht mit einer Bricohams-Vertriebsidentität. Überprüfe damit die veröffentlichte
SHA-256-Prüfsumme. Es handelt sich weder um eine Google-Play-Version noch um
eine stabile Veröffentlichung. Android fragt nach der Berechtigung, die
Installation über die App zuzulassen, mit der du die APK öffnest. Es werden
keine Treiber installiert und keine Änderungen am Funkgerät vorgenommen.
Optionale CAT-RX-Befehle ändern vorübergehend die Empfangsfrequenz, nicht die
dauerhafte Programmierung des Funkgeräts.

Die Daten werden in einer privaten SQLite-Datenbank der App gespeichert. Es
gibt keine Telemetrie, Hintergrund-Standortdienste oder
Daten-Uploads. Die automatische Sicherung und System-Datenübertragung sind im
Manifest/den Extraktionsregeln deaktiviert. **Exportiere die Daten vor der
Deinstallation:** Durch die Deinstallation werden lokale Daten gelöscht.
Die JSON-Wiederherstellung startet von der Startseite und löscht niemals
vorhandene Daten.

Für Exporte wird der Android-Dateiauswahldialog verwendet; ein allgemeiner
Speicherzugriff ist nicht erforderlich. Der ausgewählte Anbieter kann entfernt
sein: Wenn du eine Cloud auswählst, teilst du den Inhalt mit diesem Anbieter.
Das JSON enthält personenbezogene Daten und Standorte; prüfe das Ziel und
veröffentliche es nicht. Es wird kein LoTW-Zertifikat angefordert oder gespeichert.

Vor der Migration von SQLite-Schema 1 wird die unveränderte Datenbank privat nach `bricohams-v1-backup.db` kopiert. Die Migration ist transaktional: Kontakte kommen ins allgemeine Logbuch; bei Fehlern bleibt Schema 1 unverändert.

## Logbuch

Kontakte sind in Aktivitätslogbüchern organisiert: Allgemein (immer vorhanden), POTA und SOTA. Logbuch wechseln wählt das aktive Buch. Erstelle ein Buch mit ASCII-Name, Vorlage, Referenz (POTA `EA-0123`, SOTA `EA4/MD-001`; bei Allgemein leer) und Stationsrufzeichen, für POTA/SOTA erforderlich. Schnelleingabe behält Frequenz und Modus; unverändertes RST wechselt zwischen 59 und 599 für Sprache/CW-RTTY. Leeres UTC verwendet die Zeit beim Speichern. Suche und ADIF-Import/Export gelten für das gewählte Buch; JSON enthält alle Bücher. POTA schlägt `INDICATIVO@PARQUE-AAAAMMDD.adi` vor.

Vor dem Speichern vergleicht die Duplikatwarnung Rufzeichen, ADIF-Band (oder Frequenz außerhalb der Bänder), Modus und bei POTA/SOTA den UTC-Tag. Nicht speichern bewahrt das Formular; Trotzdem speichern fügt den Kontakt hinzu. `EA2XYZ` und `EA2XYZ/P` sind verschieden. ADIF-Import überspringt nur Kontakte mit identischen erhaltenen Feldern. ADIF exportiert bei Bedarf BAND, STATION_CALLSIGN und MY_POTA_REF/MY_SOTA_REF; importierte Aktivitätsfelder und widersprüchliches BAND werden als nicht erhalten gemeldet. Keine Online-Rufzeichensuche oder POTA/SOTA-Uploads; Bücher lassen sich nicht umbenennen oder löschen.

1. Öffne Logbuch und gib Rufzeichen, UTC ISO, Frequenz in MHz, Modus,
   gesendete/empfangene Reports und Notizen ein.
2. Speichere den Kontakt. Die Liste zeigt die letzten 50; der Export enthält alle.
3. Beim Bearbeiten wird der Kontakt mit seiner ursprünglichen ID geöffnet;
   beim Speichern entsteht kein Duplikat. Löschen erfordert eine Bestätigung
   und kann nicht rückgängig gemacht werden.
4. Exportiere ADIF zum Austausch/TQSL oder JSON, um den gesamten Text aufzubewahren.

Das Datum wird als ISO-Zeitpunkt interpretiert; ADIF wandelt es in UTC um.
Die im Formular zulässigen Frequenzen von 0.1-1300 MHz sind keine
Sendeerlaubnis. Die Modi eines Eintrags behaupten nicht, dass das Funkgerät
sie unterstützt. Noch nicht gespeicherte Formulare werden beim Wechsel des
Bereichs verworfen. Die Rotation erhält die Felder des aktuellen Bereichs
über den Android-Status.

ADIF enthält CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD und COMMENT.
Der ASCII-Export lehnt Notizen mit Akzenten, Zeilenumbrüchen oder anderen
unzulässigen Zeichen ab: Er entfernt oder ersetzt sie nicht stillschweigend.
JSON erhält UTF-8. Der Export bestätigt nicht, dass LoTW einen Kontakt annimmt;
Signatur, Upload, Antwort des Dienstes und Bestätigung sind getrennte Schritte.

### Kontakte suchen

Gib in Logbuch einen Teil des Rufzeichens, der Notizen, des Modus, der Frequenz
oder der UTC-Zeit ein und tippe auf Kontakte suchen. Beim Vergleich wird die
Groß-/Kleinschreibung ignoriert; Akzente werden nicht entfernt und Bereiche/
reguläre Ausdrücke nicht interpretiert. Angezeigt werden die Anzahl der Treffer
und die letzten 50 passenden Kontakte. Alle Kontakte anzeigen entfernt den
Filter. Die angewandte Suche bleibt bei Rotation erhalten; durch Tippen auf
Suchen wird das Formular neu erstellt und noch nicht gespeicherte Änderungen
an der Bearbeitung werden verworfen. Exportieren enthält immer alle Kontakte,
nicht nur die Treffer.

### ADIF mit Vorschau importieren

Tippe in Logbuch auf ADIF importieren (Vorschau). Der Dateiauswahldialog lässt
beliebige Dateien zu, geprüft wird jedoch ADIF-Text in ASCII mit höchstens
16 MiB und 50000 Kontakten. Pro Header oder Datensatz sind höchstens 512 Felder zulässig.
ADX/XML, UTF-8 und andere Binärformate werden nicht unterstützt. Das Lesen
berücksichtigt die deklarierte Länge: Text wie `<EOR>` in COMMENT beendet den
Datensatz nicht. Unterstützt werden Header mit EOH oder Datensätze ohne Header,
groß-/kleinschreibungsunabhängige Bezeichnungen und ADIF-Typsuffixe. Jeder
Datensatz muss mit EOR enden.

Erforderliche Felder: CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM oder HHMMSS),
FREQ in MHz, MODE, RST_SENT und RST_RCVD. COMMENT ist optional. Es gelten
dieselben Kontaktgrenzen wie bei der manuellen Eingabe; Modi wie FT8 werden
nicht stillschweigend in andere Modi umgewandelt. Eine Zeitangabe HHMM erhält
die Sekunden 00. Beim Export bleiben Sekundenbruchteile nicht erhalten.
Die Frequenz wird nicht aus BAND abgeleitet und fehlende Reports werden nicht erfunden.

Die Vorschau zeigt die Anzahl der Kontakte und **nicht übernommene Felder**,
beispielsweise BAND, SUBMODE, GRIDSQUARE oder LoTW-Bestätigungsdaten.
Header-Metadaten werden nicht in die Kontakte übernommen. Bewahre die
Originaldatei auf: Dieser Import ist kein verlustfreier Ersatz für jedes ADIF.
Abbrechen speichert nichts. Eine fehlerhafte Datei oder ein ungültiger Datensatz
bricht den gesamten Vorgang ab, bevor der Import angeboten wird. Doppelte
Bezeichnungen, unmögliche Datumsangaben und abgeschnittene Längen sind explizite Fehler.

Nach Bestätigung wird alles in einer SQLite-Transaktion hinzugefügt. Schlägt
ein Einfügevorgang fehl, wird der gesamte Satz zurückgerollt. Datensätze,
deren übernommene Felder mit einem vorhandenen Kontakt oder einem Datensatz
derselben Datei übereinstimmen, werden übersprungen: Rufzeichen, UTC-Zeitpunkt,
numerisch normalisierte Frequenz, Modus, beide Reports und Notizen. Weicht
eines davon ab, wird ein neuer Kontakt angelegt; es wird niemals nach
Rufzeichen/Zeit überschrieben. Interne IDs werden neu generiert; externe
ADIF-IDs werden nicht verwendet. Ein erneuter Import desselben Inhalts erzeugt
keine identischen Duplikate. Nicht übernommene Felder fließen nicht in den
Vergleich ein. Exportiere zuvor eine JSON-Sicherung und prüfe die Ergebniszähler.

Lass den Bildschirm geöffnet, bis du die Vorschau bestätigst. Rotation/Schließen
vor der Bestätigung verwirft die Vorschau, ohne zu speichern. Ein bereits
bestätigter Import kann im Hintergrund abgeschlossen werden, auch wenn dieser
Bildschirm geschlossen wird; prüfe das Logbuch, bevor du ihn wiederholst.
Es gibt keinen dauerhaften Importdienst.

### JSON-Sicherung wiederherstellen
Tippe auf der Startseite auf Bricohams-JSON-Sicherung importieren und wähle
eine von dieser App exportierte Sicherung der Version 1 aus. Die Datei darf
bis zu 16 MiB und 50000 Datensätze je Tabelle enthalten. UTF-8, Format, Felder,
IDs, Kontakte, Datumsangaben, Koordinaten und Verweise zwischen Sitzungen und
Beobachtungen werden geprüft. ADIF oder JSON anderer Anwendungen wird nicht importiert.

Der Import erfolgt als Transaktion: Jeder Fehler setzt sämtliche Änderungen
zurück. Neue IDs werden hinzugefügt; identische Datensätze bleiben ohne
Duplikat erhalten. Eine vorhandene ID mit abweichendem Inhalt bricht den
Import ab, ohne sie zu überschreiben. Sitzungen werden nicht anhand des Namens
zusammengeführt. Die Rückmeldung zeigt die Anzahl neu hinzugefügter Datensätze.
Dies ist weder eine destruktive Wiederherstellung noch ein vollständiger
Ersatz der Datenbank.

## ARDF und GPS

1. Erstelle eine Sitzung oder wähle eine vorhandene aus.
2. Gib Peiler 1-10 und Notizen an.
3. Tippe optional auf Position abrufen und akzeptiere den Datenschutzhinweis
   sowie die Android-Berechtigung für den präzisen Standort. Ohne Berechtigung
   kannst du ohne GPS fortfahren.
4. Warte bei aktiviertem GPS auf einen aktuellen Fix; er wird höchstens
   30 Sekunden lang angefordert. Eine historische Position des Anbieters wird
   nicht verwendet.
5. Speichere die Beobachtung. Ein Fix wird nur bis zu 30 Sekunden akzeptiert,
   gemessen mit einer monotonen Uhr; seine Genauigkeit und GPS-UTC werden
   getrennt vom Erfassungszeitpunkt der Beobachtung gespeichert.

Speichern ohne aktuellen Fix erzeugt ausdrücklich eine Beobachtung OHNE
Koordinaten und weist darauf hin. Eine Position wird nicht erfunden. Beim
Verlassen des Bildschirms, Ausblenden/Schließen der Aktivität oder Beenden der
Anfrage werden Aktualisierungen abgebrochen. Von Android als simuliert
markierte Positionen werden verworfen. Jeder Fix kann höchstens für eine
Beobachtung verwendet werden; fordere einen neuen an, wenn du eine weitere
Messung brauchst.

Die Koordinate gehört zum Telefon, nicht zum Sender. Es gibt keine
Triangulation, Peilung, RSSI, kontinuierliche Strecke, Karte, Synchronisierung
mit den RAM-Statistiken der Firmware oder automatische Einstufung gefundener
Peiler. Die Zähler beruhen auf manuellen Beobachtungen. Diese Funktionen sind
noch nicht umgesetzt.

### ARDF-Statistiken und Verlauf

Tippe in der ausgewählten Sitzung auf Sitzungsstatistiken und Beobachtungen.
Das Panel liest die dauerhafte SQLite-Datenbank und zeigt:

- Anzahl der Beobachtungen und wie viele Koordinaten enthalten.
- Intervall zwischen der ersten und letzten Beobachtung, nicht die Betriebszeit
  oder die Dauer seit dem Erstellen der Sitzung. Null oder eine Beobachtung
  ergibt 0 s.
- Je Peiler: Anzahl, erste/letzte UTC, Anzahl mit Koordinaten und mittleres
  Intervall zwischen Einträgen. Bei nur einer Beobachtung gibt es keinen Mittelwert.
- Die letzten 100 Beobachtungen mit Notizen, UTC und Koordinaten/Genauigkeit/
  Zeitpunkt des Fixes oder OHNE Koordinaten. Der JSON-Export enthält alle.

Die Summe der GPS-Segmente nutzt Haversine auf einer Kugel mit Radius
6371008.8 m, nur zwischen aufeinanderfolgenden Telefonbeobachtungen. Beide
müssen eine angegebene Genauigkeit von <=50 m und einen Fix haben, der 0 bis
30 s vor der Erfassung liegt. Erfassungszeit und Fixzeit müssen steigen; der
Abstand darf höchstens 120 s betragen. Eine Beobachtung ohne GPS, mit
ungenauer, alter oder zukünftiger Position unterbricht die Kette: Es werden
keine Punkte über sie hinweg verbunden. Wiederholte Fixes oder gleiche
Zeitpunkte erzeugen keine Segmente. Die Anzahl der Segmente wird angegeben.

**Dies ist keine vollständige Strecke**, tatsächlich zurückgelegte Entfernung,
Entfernung zu einem Peiler, Geschwindigkeit oder Rennwertung. Es gibt keine
GPS-Rauschfilterung: Drift kann die Summe auch ohne Bewegung erhöhen. Lücken
können sie verringern. Abschnitte werden nicht interpoliert und aus einer
Beobachtung wird nicht abgeleitet, dass ein Peiler gefunden wurde. Importierte
Daten behalten ihre UTC; Uhränderungen und die Genauigkeit des Anbieters
beeinflussen die Ergebnisse. Statistiken werden neu berechnet, ohne Daten oder
JSON-Format zu ändern.

## Experimentelles USB CDC und CAT RX

Öffne auf der Startseite Experimentelles CAT RX USB und wähle ausdrücklich ein
Gerät anhand von VID, PID, Treiber und Name aus. Das Telefon benötigt USB-Host/
OTG. Unterstützt werden **standardmäßiges CDC ACM** mit einer Steuer- und einer
Bulk-Datenschnittstelle sowie erkannte CH34x-, CP210x-, FTDI- oder Prolific-
Adapter mit einem Port. Mehrdeutige/Mehrport-Geräte werden abgelehnt; ein Port
wird nicht geraten. Vor dem Öffnen des Geräts fordert die App die Android-
USB-Berechtigung an. Wenn das System beim Erteilen der Berechtigung den
Bildschirm neu erstellt, wähle das Gerät erneut aus. Beim Einstecken eines
Kabels wird nicht automatisch verbunden.

Die USB-Seriell-Treiber stammen aus **usb-serial-for-android 3.9.0**;
die MIT-Lizenz ist den Assets und der Veröffentlichung beigefügt. Verwendet
wird ausschließlich dessen Tabelle erkannter Geräte; eine unbekannte VID/PID
wird keinem Treiber aufgezwungen. Die Abhängigkeit ist festgelegt und JitPack
auf dieses Modul beschränkt. Auf dem Telefon sind weder Root noch externe
Treiberinstallation nötig. Ein Kabel, das unter Windows als COM-Port
funktioniert, ist damit nicht automatisch Android-kompatibel. Auch stellen
nicht alle USB-C-Anschlüsse von Quansheng Daten bereit. Die Implementierung
zertifiziert das Kabel der physischen UV-K5 V3 noch nicht; OpenGD77 und AnyTone
verwenden dieses CAT-Protokoll nicht.

Erforderlich ist das Bricohams-Satelliten-Image mit CAT RX v1 auf Basis von
F4HWN v6+. Die Originalversion von F4HWN enthält dieses Modul nicht; sie wird
anhand ihrer Version erkannt. Über diesen Bildschirm wird keine Firmware installiert:

1. Starte SAT RX am Funkgerät und aktiviere CAT physisch mit Taste 8.
2. Wähle das richtige Gerät und erteile die Android-Berechtigung.
3. Die App konfiguriert CDC auf 38400, 8N1, identifiziert sich über
   `0x0514/0x0515` und fragt `0x7B00/0x7B01` ab.
4. Frage den Status ab oder gib MHz in exakten 10-Hz-Schritten ein:
   136-174 oder 400-470 MHz. Eine eingereihte Antwort bedeutet nicht, dass
   sie angewendet wurde; es wird bis zur Bestätigung, höchstens zehnmal, abgefragt.
5. Jedes SET gilt in der Firmware für eine Lease von **3000 ms**. Im manuellen
   Panel gibt es keine automatische Erneuerung. Das nachfolgend beschriebene
   Überflug-Tracking erneuert sie nur während einer ausdrücklich gestarteten Sitzung.
6. STOP fordert die Nennfrequenz an. Beim Ausblenden des Bildschirms werden
   noch nicht gesendete SET abgebrochen, bei entferntem/ausstehendem Status
   wird STOP versucht und Schnittstellen/Verbindung werden freigegeben. Das
   Trennen von USB macht die Sitzung ungültig. Eine erneute Verbindung ist
   erforderlich; eine vorherige Abstimmung wird nicht fortgesetzt.

Der Status ist die letzte Antwort der Firmware, keine HF-Messung. QUERY
verlängert die Lease nicht. Bei einer Kabeltrennung kann die Zustellung von
STOP nicht garantiert werden: Der Fehler wird gemeldet, und die Lease stellt
die Nennfrequenz nur wieder her, wenn die Schleife des Funkgeräts weiterläuft.
Prüfe die Frequenz am Funkgerät. CRC, XOR und Sequenzprüfung erkennen
Protokollfehler, sind aber weder Verschlüsselung noch Authentifizierung.
CAT RX führt weder TX/PTT aus (das ist separat CAT TX) noch verändert es
Firmware, EEPROM oder Kalibrierung. Die Kanalbearbeitung erfolgt separat im Kanaleditor.

USB-Vorgänge werden außerhalb des UI-Threads serialisiert; überschüssige Bytes
aus Bulk-Paketen bleiben erhalten und Teilschreibvorgänge werden geprüft.
Hintergrunddienste werden nicht verwendet. Diese Funktionen sind mit
simuliertem USB getestet; OTG- und HF-Tests mit realem Telefon/Funkgerät fehlen.

## Quansheng-Kanaleditor per USB (Beta)

Lokale Auditkorrektur: Die physische CRC wird in 512 Sektoren zu je 4096 Byte
abgefragt, nicht in einem 2-MiB-Befehl, der die Grenze `0x073E` überschreitet.
Adresse, Länge, Status und CRC jedes Sektors, einschließlich des letzten,
werden geprüft. Für diese Korrektur muss die APK neu erstellt und installiert
werden; eine bereits heruntergeladene Version ändert sie nicht. Siehe den
[Validierungsbericht](VALIDACION-INTEGRAL-V3-ANDROID.md).

Bildschirm „Quansheng-Kanäle per USB bearbeiten (Beta)“. Es ist der Android-Port
des Webeditors: dieselben F4HWN-v6-Befehle, dieselbe Sicherung und derselbe
Schreibvorgang mit erneutem Einlesen. Bearbeitet werden nur vorhandene FM-Kanäle.

1. Kabel auswählen (OTG mit CDC oder erkannter USB-Seriell-Adapter) und
   verbinden. Das Funkgerät wird über `0x0514` identifiziert. F4HWN v6.0 bleibt schreibgeschützt.
2. Vollständige Sicherung: 512 Byte Kalibrierung, 2 MiB externer Flash in
   128-Byte-Blöcken mit `0x0738`, vom Funkgerät geprüfte CRC-32 mit `0x073E`
   und Main-Firmware, validiert anhand Header `FMB1` und CRC. Bei 38400 Baud
   dauert es 10-20 Minuten; der Bildschirm bleibt eingeschaltet. Gespeichert
   wird im privaten Speicher der App mit `SHA256SUMS`. Labs v6.1+ erforderlich.
3. Kanäle lesen: logische Konfiguration von 41344 Byte (`0x051B`).
4. Kanal wählen und Name, RX, TX, RX- und TX-Ton bearbeiten (OFF, CTCSS in Hz
   wie `88.5` oder DCS wie `D023N` / `D023I`), Leistung (USER, LOW1-LOW5, MID, HIGH),
   Schmalband und TX-Sperre. Frequenzen 136-174 und 400-470 MHz innerhalb
desselben Bands, wie im Web. Die übrigen Kanalbits bleiben erhalten.
5. Auf die lokale Kopie anwenden: Das Funkgerät wird noch nicht beschrieben.
6. Schreiben: bestätigen, die Sicherung erneut anhand SHA-256 prüfen und
   sicherstellen, dass das Funkgerät seit dem Einlesen unverändert ist.
   Betroffene Kanäle ausblenden, 8-Byte-Blöcke (`0x051D`) schreiben, wieder
   einblenden und die gesamte Konfiguration erneut einlesen. Bei Abweichung
   wird ein Fehler gemeldet und der Vorgang nicht als erfolgreich gewertet.
   VFO, Einstellungen, Kalibrierung und Bänke sind geschützt.

Durch Trennen, Verlassen des Bildschirms oder einen Fehler wird die Sitzung
beendet: Vor dem Schreiben erneut verbinden und sichern. Der Vorgang ist nicht
gegen Stromausfall abgesichert. Starte das Funkgerät nach dem Schreiben neu.
## Satelliten-SGP4 und Überflug-Tracking

Unter Start Satelliten öffnen. Die neue Oberfläche nutzt eigenen Bricohams-Code und -Farben, keine Look4sat-Ressourcen: AOS/LOS-Countdown und **Überflüge**, **Karte**, **Satelliten**, **Einstellungen**.

Engine: **satellite.js 6.0.1** (MIT), dieselbe UMD-Distribution wie im Web, über **Rhino 1.7.15** (MPL 2.0). Lizenzen und Quelllinks sind enthalten. SHA-256:
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
Ein gemeinsamer Rhino-Kontext führt nur feste Assets aus, nie heruntergeladenen Code, ohne Java-Zugriff.

1. **Daten:** Einstellungen lädt CelesTrak-Amateur-TLE (maximal 256 KiB) und SatNOGS-DB-Sender (16 MiB, CC BY-SA 4.0) per HTTPS. Die optionale automatische Aktualisierung erfolgt beim Öffnen oder Zurückkehren, wenn der Katalog fehlt oder mindestens 24 h alt ist. Nach Fehlern wird frühestens nach 15 min automatisch erneut versucht; die Schaltfläche erlaubt sofortige Wiederholung ohne doppelte Downloads. Kein periodischer Hintergrunddienst. Lebende, aktive Sender müssen zum Katalog gehören und einen Downlink in 136-174 oder 400-470 MHz in 10-Hz-Schritten haben. Bei SatNOGS-Fehlern behalten neue TLE bisherige Frequenzen mit Warnung. Offline-TLE-Import bleibt verfügbar. Private Dateien werden atomar geschrieben. 69 Zeichen, Prüfsumme und NORAD werden geprüft; Alpha-5 und doppelte NORAD werden abgelehnt. TLE verfallen nach sieben Tagen; Epochen über 24 h in der Zukunft werden abgelehnt, das ganze Vorhersagefenster muss gültig sein.
2. **Beobachter:** Breite/Länge in Grad, WGS84-Höhe in **km** (-0.5 bis 9). Letzte GPS-Position verwenden fordert Standortzugriff an und kopiert den letzten GPS-/Netzpunkt mit Alter und Genauigkeit. Prüfen und Speichern und Überflüge berechnen wählen. Mindestelevation 0-60 Grad.
3. **Satelliten:** Name/NORAD-Suche, Kontrollkästchen und Alle, Mit RX, Keine. Beim ersten Download werden Satelliten mit RX im Funkbereich ausgewählt.
4. **Überflüge:** die nächsten **24 h** erscheinen fortlaufend. Karten zeigen NORAD, Name, maximale Elevation, lokalen Tag/AOS/LOS, Azimute, Modi, Countdown und Fortschritt. Abtastung alle 5 s, Übergänge auf 500 ms verfeinert; unter dem Horizont adaptive Vielfache von 5 s zur Erhaltung des Webrasters und Begrenzung der Elevation, damit kein Übergang übersprungen wird (unter 0.3 Grad/s selbst bei 200 km). AOS/LOS beziehen sich auf die gewählte Schwelle; Maxima werden abgetastet, nicht kontinuierlich optimiert.
5. **Detail:** Karte oder Kopf antippen: Polarradar (Norden oben, Horizont am Rand, Zenit mittig; AOS grün, LOS rot, aktuelle Position orange zwischen 60 SGP4-Punkten interpoliert), Live-Azimut/Elevation/Entfernung/Doppler, UTC und SatNOGS-Downlink oder manuelle MHz. CAT verbinden: Doppler, SSTV und Aufnahme öffnet CAT mit diesem Überflug.
6. **Karte:** offline Natural-Earth-Küsten 1:110m, gemeinfrei, Satelliten, Abdeckung oberhalb 0 Grad, Beobachter und gewählte Flugbahn 45 min davor/danach. Antippen wählt aus; Aktualisierung alle 5 s bei sichtbarer Karte.

Position, Auswahl und letzter Downlink je Satellit werden privat gespeichert, außerhalb des Feld-JSON. Kein abgeleiteter Uplink; keine linearen Transponder.

### Doppler-RX des ausgewählten Überflugs

Mit der Auswahl eines Überflugs wird CAT mit einer Momentaufnahme von TLE,
Beobachter, Downlink und Zeitfenster geöffnet. Dabei wird weder USB verbunden
noch ein Befehl gesendet. Verbinde das Gerät, rufe SAT RX auf und aktiviere
CAT am Funkgerät mit Taste 8. Tippe erst dann, wenn du dich im Zeitfenster
befindest, auf **Doppler für ausgewählten Überflug starten**. Es gibt keinen
geplanten Start im Hintergrund.

Die Umlaufbahn wird für den aktuellen Zeitpunkt propagiert; die radiale
Geschwindigkeit wird als zentrierte Bereichsdifferenz über eine Sekunde
berechnet. Die Empfangskorrektur lautet
`f_rx = f_nominal * (1 - velocidad_radial / 299792.458 km/s)`, gerundet
auf 10 Hz. Erforderlich sind eine Elevation von mindestens null, gültiger
TLE und eine RX-Frequenz im Band. Gesendet werden ausschließlich temporäre
SET-RX-Befehle, niemals TX/PTT, Kanäle oder EEPROM.

Nach jeder Bestätigung wird 750 ms bis zur nächsten Aktualisierung gewartet,
auch wenn die Rundung die Frequenz nicht ändert; dadurch wird die 3-s-Lease
erneuert. Es werden keine zwei USB-Vorgänge gleichzeitig eingereiht. Beendet
wird bei Überflugende, abgelaufenem TLE, Horizont, Trennung/Fehler, nicht
angewendeter Antwort, Intervall/Bestätigung von mindestens 2 s, wiederholter
oder rückwärts laufender Uhr oder einem UTC-Sprung gegenüber der monotonen
Uhr von mehr als 500 ms. Während des Trackings sind manuelle Bedienelemente
gesperrt; die Stoppfunktion bleibt verfügbar.

Beim Stoppen, Ausblenden des Bildschirms oder Trennen werden zukünftige SET
abgebrochen, STOP versucht und USB geschlossen. Bei Rückkehr wird nicht
fortgesetzt: Verbinde erneut und starte eine neue Sitzung. Schlägt STOP fehl,
wird dies gemeldet; eine Wiederherstellung wird nicht behauptet. Die Lease
hilft nur, solange die Firmware ihre Schleife weiter ausführt. Der Bildschirm
zeigt Berechnungen und die letzte Bestätigung, keine HF-Messung oder verifizierte
tatsächliche Position. Die Kombination aus Telefon/Kabel/Firmware/Funkgerät
muss noch im Feld validiert werden.

### Überflug aufnehmen und SSTV suchen

In CAT nimmt Ganzen Überflug aufnehmen (WAV bis LOS) das Mikrofon bei aktivem Doppler auf. Funklautsprecher mit dem Telefon verbinden. Aufnahme bei 48 kHz, 3:1-Mittelung zu privatem **WAV 16 kHz mono**, etwa 1.9 MB/min. Stopp bei LOS, nach zwei Stunden, manuell oder beim Verlassen; WAV-Kopf bleibt auch bei Fehlern gültig. Nicht gleichzeitig mit dem 60-s-Robot36-Empfang.

Satelliten, Einstellungen, Überflugaufnahmen zeigt Dauer und Größe. SSTV prüft 60-s-Fenster alle 23 s, damit ein ganzes 37-s-Bild hineinpasst, verwirft Duplikate mit weniger als 10 s Abstand und speichert PNG neben WAV. Exportieren kopiert WAV zum gewählten Ziel. Löschen entfernt WAV und zugehörige PNG nach Bestätigung unwiderruflich. Synthetische Tests zertifizieren weder HF-Empfang noch reale AudioRecord-Hardware.

## Experimentelles Morse-WAV

Der Dateiauswahldialog lässt Audio zu, der Parser verlangt jedoch RIFF/WAVE
PCM linear mono mit 16 Bit, 8-48 kHz, 0.1-60 Sekunden und maximal 8 MiB.
Float, Stereo, MP3, abgeschnittene Daten und widersprüchliche Längen werden abgelehnt.

Stelle den tatsächlichen Ton zwischen 300 und 1200 Hz und die Geschwindigkeit
zwischen 5 und 45 Wörtern pro Minute ein. Der Detektor verwendet Fenster von
etwa 5 ms und Goertzel-Tonenergie; Marke- und Pausenzeiten werden anhand der
eingestellten Geschwindigkeit interpretiert. Geschwindigkeit und Frequenz
werden nicht automatisch geschätzt. Es handelt sich weder um Spracherkennung
noch um ein statistisches Konfidenzmaß. Die Ausgabe zeigt Text, Punkte/Striche
und einen Unsicherheitshinweis; `?` kennzeichnet nicht erkannte Codes, nicht
alle möglichen Fehler.

Schwache Aufnahmen, Rauschen, Fading, Tonverschiebung, unregelmäßige Zeitgebung
oder falsche Einstellungen können zu falschem Text führen, auch wenn kein `?`
erscheint. Vergleiche das Ergebnis mit dem Audio. Lass den Bildschirm während
der Berechnung geöffnet: Eine Einstellungsänderung oder das Schließen der
Aktivität kann das laufende Ergebnis verwerfen. Über den WAV-Import wird kein
Mikrofon aufgenommen und es wird nichts gesendet.

## SSTV Robot36 aus WAV

Öffne auf der Startseite SSTV Robot36 aus WAV und tippe auf Robot36-WAV
decodieren. Wähle RIFF/WAVE PCM linear mono mit 16 Bit, bis zu 8 MiB,
37-60 Sekunden und einer Abtastrate von **8/16/24/32/40/48 kHz**. 44.1 kHz,
MP3, Float und Stereo werden nicht unterstützt. Bilder zum Senden werden
nicht ausgewählt. Das Audio muss den vollständigen Header enthalten:
1900-Hz-Vorlauf, 1200-Hz-Break, VIS **8** mit gerader Parität, Stop und die
240 Robot36-Zeilen. Der Modus wird nicht aus einem Teilbild erraten und andere
VIS werden nicht akzeptiert.

Die eigene Implementierung verwendet eine FIR-Hilbert-Transformation zur
Schätzung der Momentanfrequenz und richtet den ersten Porch aus. Das Timing
beträgt 150 ms je Zeile: Sync 9 ms, Porch 3 ms, Luminanz 88 ms,
Farbtrennung 4.5 ms, Porch 1.5 ms und Chrominanz 44 ms. Luminanz hat 320
Abtastwerte je Zeile; Chrominanz 160 Abtastwerte und teilt Cr/Cb zwischen
Zeilenpaaren. YCbCr mit vollem Wertebereich wird in RGB umgewandelt und das
Ergebnis auf 0-255 begrenzt. Herangezogene technische Referenz:
[Robot36 von Ahmet Inan, fester Stand](https://github.com/xdsopl/robot36/tree/5860ded4716170b562c3e915c7eebb879742dcd4),
veröffentlicht unter CC0. C-Code und Bilder dieses Projekts sind nicht enthalten.
Es ist weder eine Neukompilierung noch eine Kopie der Android-App Robot36.

Unterstützte Abtastraten werden durch Mittelung von Blöcken auf 8 kHz
reduziert. Es handelt sich weder um einen professionellen Audio-Frontend noch
um vollständige Alias-/Rauschunterdrückung. Eine Driftkorrektur des Takts,
Schräglage, Doppler, Rauschen, beschnittenes Audio oder die Wiederherstellung
von Zeilen sind nicht vorhanden. Sync und Farbtrennung jeder Zeile werden
geprüft. Fehlen Daten oder geht die Synchronisierung verloren, schlägt der
Vorgang fehl; ein vollständiges Bild oder ein früheres PNG wird nicht
angeboten. Das Erkennen von Header/Zeilen beweist nicht, dass alle Pixel korrekt sind.

Nach der Decodierung wird ein Bild mit **320x240** angezeigt. Bild als PNG
speichern öffnet den Android-Dateiauswahldialog. Der ausgewählte Anbieter
kann eine Cloud sein: Berücksichtige beim Ziel den privaten Inhalt des Bildes.
Es wird nicht automatisch in der Galerie gespeichert. Das Bild bleibt im RAM;
Rotation oder Schließen verwirft die Vorschau. Exportiere es vorher. Bei
Fehlern beim Schreiben des PNG wird die Teildatei verworfen.

Der WAV-Import verwendet kein Mikrofon, USB-Audio oder PTT und sendet nichts;
die Funkfrequenz wird über diesen Bildschirm nicht geändert. Die optionale
Aufnahme wird wie folgt separat geöffnet. Das Verhalten mit HF-Aufnahmen und
physischen Audioverbindungen muss noch validiert werden. Synthetische Tests
ersetzen diese Prüfungen nicht.

## SSTV Robot36 per CAT: abgestimmter Empfang und Senden mit PTT

Im CAT-Bildschirm gibt es unter der USB-Verbindung drei SSTV-Aktionen.

**Empfang.** Starte Doppler für den Überflug oder stimme manuell ab, verbinde
den Lautsprecher des Funkgeräts mit dem Audioeingang des Mobiltelefons und
tippe auf *Robot36 aufnehmen (CAT stimmt weiter ab)*. Die Aufnahme verwendet
dieselbe 60-s-Aufnahme wie der Mikrofonbildschirm und stoppt das CAT-Tracking
nicht; dieses läuft in einem anderen Thread. Tippe nach Ende des Bildes auf
*Aufnahme stoppen und decodieren*.

**Senden.** Erforderlich ist das Bricohams-Satelliten-Image mit CAT TX v1
(Befehl `0x7B02`, siehe `BRICOHAMS-FIRMWARE.md`). Schritte:

1. Gib das Rufzeichen ein. **Es ist erforderlich**: Ohne gültiges Rufzeichen
   wird der Dateiauswahldialog nicht geöffnet; es wird in den unteren Bildstreifen gedruckt.
2. Verbinde den Audioausgang des Mobiltelefons mit dem Mikrofoneingang des
   Funkgeräts. USB-C am Funkgerät bleibt für CAT; das Mobiltelefon benötigt
   eine 3,5-mm-Buchse oder einen OTG-Hub mit Audio.
3. Drücke am Funkgerät in SAT RX Taste 9: `CAT TX ARMED`.
4. Tippe auf *Robot36 per PTT CAT senden*, wähle das Bild (wird auf 320x240
   skaliert) und bestätige den Dialog mit Frequenz, Rufzeichen und Dauer (~37 s).

Die App fragt den PTT-Status ab und sendet nicht, wenn das Funkgerät nicht
aktiviert ist, das Limit erreicht ist oder TX abgelehnt wird. Sie aktiviert
PTT, wartet auf Bestätigung des Funkgeräts und gibt erst dann Audio wieder;
die Lease wird alle 400 ms erneuert. Schlägt eine Erneuerung fehl (Taste am
Funkgerät gedrückt, Limit, Sperre) oder wechselt der Bildschirm in den
Hintergrund, wird das Audio abgeschnitten, PTT freigegeben und dies durch
erneutes Lesen bestätigt. Scheitert das erneute Lesen, gibt das Funkgerät
PTT nach 1,5 s selbst frei. Audio ist auf 110 s begrenzt, unterhalb der
120-s-Abschaltung des Funkgeräts.

Gesendet wird auf der TX-Frequenz des VFO im Funkgerät, ohne Doppler-Korrektur
für den Uplink; während des Trackings eines Überflugs ist das nicht möglich.
Du brauchst eine Lizenz und eine für SSTV zugelassene Frequenz. **Nicht am
Funkgerät oder per HF validiert.**
## Morse- und Robot36-Mikrofonaufnahme

Tippe auf der Startseite auf Morse / Robot36 mit Mikrofon empfangen. Wähle
den Modus; für Morse gib den Ton zwischen 300 und 1200 Hz und die
Geschwindigkeit zwischen 5 und 45 ppm ein. Robot36 ignoriert diese beiden
Felder. Die Berechtigung `RECORD_AUDIO` wird erst angefordert, wenn du auf
Audioaufnahme starten tippst. **Die Berechtigung zu erteilen startet keine
Aufnahme**: Du musst erneut auf Starten tippen. Eine Ablehnung verhindert
weder den WAV-Import noch die übrigen Funktionen. Beim Öffnen der App startet
keine Aufnahme.

Die Eingabe erfolgt über AudioRecord/MIC des Systems, PCM mono mit 16 Bit bei
48 kHz. Android wählt das Eingabegerät aus; es gibt keine Auswahl der
Audioverbindung, keine Lautstärkeregelung des Funkgeräts und keine Garantie
für Kompatibilität mit einem USB-Audioadapter. Das CAT-Kabel überträgt nicht
automatisch Audio. Unterstützt die Hardware dieses Format nicht, schlägt das
Öffnen fehl oder verschwindet die Eingabe; ein Fehler wird angezeigt und die
Ressource freigegeben. Audio wird nicht erfunden. Teste zunächst ein bekanntes
Signal und prüfe Pegel, Übersteuerung und Signalweg.

Starte vor dem Robot36-Header. Erforderlich sind mindestens 37 s und ein
vollständiges Bild mit denselben Sync-Grenzen wie beim WAV-Import. Tippe nach
Ende des Signals auf Stoppen und decodieren. Die Aufnahme endet automatisch
nach **60 Sekunden**, begrenzt durch die Anzahl der Samples und den Timer;
Stille wird nicht aufgefüllt. Das Audio bleibt während des Vorgangs nur im
Speicher. Es wird keine WAV-Datei geschrieben und nichts über das Netzwerk
gesendet. Das Robot36-Bild kann über den Android-Dateiauswahldialog als PNG
gespeichert werden; Morse-Audio zeigt Text, Punkte/Striche und einen
experimentellen Hinweis.

Durch Abbrechen und Verwerfen des Audios, Verlassen, Sperren des Telefons,
Öffnen einer anderen Aktivität oder Rotation wird die Aufnahme beim Verlust
des Vordergrunds angehalten, das Mikrofon freigegeben und das ausstehende
Ergebnis verworfen. **Bei der Rückkehr wird nicht fortgesetzt.** Die Bildvorschau
bleibt bei Rotation nicht erhalten. Es gibt weder Dienst, Hintergrundaufnahme,
PTT, TX noch kontinuierliche Streaming-Decodierung: Zuerst wird aufgenommen,
danach decodiert. Ein korrektes synthetisches Ergebnis validiert weder den
realen HF-Empfang noch den Mikrofonpfad eines Telefons.

## Kompilierung

Voraussetzungen: JDK 17, Android SDK 35, Build Tools 35.0.0 und Zugriff auf
die offiziellen Abhängigkeits-Repositories beim ersten Build. SDK, JDK,
Zertifikate und Debug-Schlüssel sind nicht im Repository enthalten.

```powershell
$env:JAVA_HOME = 'C:\ruta\jdk-17'
$env:ANDROID_HOME = 'C:\ruta\android-sdk'
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

Der Wrapper verwendet Gradle 8.9 mit festgelegtem offiziellem SHA-256. AGP
8.7.3 und Kotlin 2.0.21 sind festgelegt. Die App verwendet Android-Views und
SQLite der Plattform, ohne Compose, Room oder Backend: Dadurch sinken die
Laufzeitabhängigkeiten und realer Speicher sowie Berechtigungen lassen sich
zuerst prüfen. Die Laufzeitbibliotheken sind usb-serial-for-android 3.9.0 und
seine AndroidX-Annotationen, Rhino 1.7.15 sowie satellite.js 6.0.1 als
integriertes Asset. JUnit, Robolectric und AndroidX Test
werden nur für Tests verwendet.
Ihre Lizenzen ersetzen nicht die Lizenzen von Android, Gradle oder dem Projekt.

Ausgaben:

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Berichte in `android/app/build/reports/`.

Um unter Windows ein geprüftes Paket mit denselben Voraussetzungen zu liefern:

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.8.3-beta'
```

Das Zielverzeichnis muss neu sein. Das Skript führt Tests/lint aus, prüft die
APK-Signaturen und enthält App, instrumentierte APK, Anleitung, Lizenzen,
`build-info.json` und `SHA256SUMS`. Das Manifest weist Revision, Dirty-Status,
Quellen anhand ihrer Hashes, Fähigkeiten und nicht verfügbare Funktionen aus.
Es deklariert immer Debug-Signatur und ausstehenden physischen Test; ein Build
wird dadurch nicht zu einer stabilen Version.

Mit verbundenem, per ADB autorisiertem Testtelefon/-emulator:

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Verwende ein Testgerät. Jeder instrumentierte Persistenztest leitet
`bricohams.db` auf eine private Datenbank `instrumentation-<UUID>.db` um;
er öffnet oder löscht nicht das echte Logbuch und entfernt nur seine eigene
Datenbank. Die Test-APK ist nicht für den normalen Gebrauch bestimmt.

## Durchgeführte und ausstehende Validierung

Die ursprüngliche historische Validierung umfasste 84 Host-Tests: fünf zu
Modellen/ADIF, vier zum ADIF-Import, drei zu Audio, acht zu Speicherung/UI,
acht zum CAT-Protokoll, zwei zum CAT-Bildschirm, fünf zum Kanalcodec, fünf zu
Quansheng-Speicher/Sicherung/Schreiben und acht zu simuliertem USB CDC/seriell,
vier zum Robot36-Kern (einschließlich Hin- und Rückweg des Codierers), zwei
zum SSTV-Bildschirm, vier zum SSTV-Senden per PTT CAT mit simuliertem
Funkgerät, drei zu SGP4/TLE, vier zum Tracking, zwei zum Satellitenbildschirm,
fünf zur PCM-Aufnahme, sechs zum Mikrofonbildschirm und sechs zu ARDF-Statistiken.
Geprüft werden SQLite nach Schließen/erneutem Öffnen, Aktualisierung/Löschen,
JSON-Export, fehlende/gültige Koordinaten, Bildschirmstart, Speichern und
Wiederherstellen der Aktivität, UTC-Sortierung mit Sekundenbruchteilen sowie
idempotente JSON-Wiederherstellung mit Rollback bei Konflikten/ungültigen
Daten. Synthetisches Audio wird bei 8/16/44.1/48 kHz und 5/15/30/45 ppm
einschließlich Stille und falschem Ton geprüft. Dies sind keine Fehlermessungen
mit realen Aufnahmen.
ARDF prüft 222.39016 m beim Überqueren der Datumsgrenze am Äquator
(Toleranz 0.01 m), UTC-Sortierung, getrennte Mittelwerte je Peiler, isolierte
Sitzungen nach Schließen/erneutem Öffnen von SQLite und Anzeige des Verlaufs.
Lücken, Genauigkeit, alte/zukünftige/wiederholte Fixes, gleichzeitige Einträge
und doppelte IDs werden getestet. Es sind keine GPS-Feldmessungen.
Die Aufnahme prüft exakt 2880000 Samples für die 60-s-Grenze, manuelles
Stoppen ohne Auffüllen, Abbruch vor dem Öffnen und während blockierendem Lesen,
explizite Fehler und Freigabe. Der Bildschirm prüft die Berechtigung ohne
Autostart, Decodierung bekannten Morse und Robot36 320x240 aus simulierter
Eingabe, Wiederherstellung nach Fehler, Timer und Abbruch beim Verlassen ohne
Fortsetzung. Dies sind keine AudioRecord-Tests auf realer Hardware.

CAT prüft CRC anhand eines bekannten Vektors, Frames aller Längen, CRC `FFFF`
von Upstream-Antworten, Identifikation, Rauschen/Timeout, Sequenz und Wrap,
Bänder, Abbruch von SET und den Unterschied zwischen eingereiht und angewendet.
CDC prüft Berechtigungen, eindeutige Auswahl, Konfiguration, Teilschreibvorgänge,
Lesen eines Pakets über mehrere Aufrufe, Fehler und Schließen. Die seriellen
Adapter prüfen Treiberauswahl anhand VID/PID, Ablehnung von Mehrport-/unbekannten
Geräten, Parameter 38400 8N1, teilweises Lesen, Fehlerweitergabe ohne
wiederholtes SET und Schließen bei Konfigurationsfehler. Der integrierte Test
führt mit einem simulierten Gerät durch Bildschirm, Identifikation, SET RX und
STOP vor dem Schließen beim Ausblenden der Aktivität.
Kanäle: Lesen von Tönen, Leistung und Flags; Bearbeitung, die nur Kanalbytes
ändert; Hin- und Rückweg aller 50 CTCSS und 104 DCS; Ablehnungen ohne Änderung
der Kopie. Ein simuliertes F4HWN-Funkgerät prüft vollständige Sicherung (CRC
des Funkgeräts, Main, Kalibrierung), SHA-256 auf Datenträger, Web-Schreibfolge,
erneutes Lesen und Sperren bei Einstellungen, geändertem Funkgerät, v6.0, CRC
und abgelehntem Block. Das spätere Audit ergänzt Prüfungen der 512 CRC-Sektoren,
fehlerhafte Antwortmetadaten, physisches Lesen ohne Identifikation oder mit
Bereichen, die einen Integer überlaufen lassen, sowie Abbruch von Sicherung/
Schreibvorgang.
Die Editor-Sitzung ist an Vordergrund und Generation gebunden: Verlassen,
Trennen oder Ungültigmachen verhindert den nächsten USB-Austausch und verwirft
alte Aufgaben, die noch nicht begonnen haben. Ein bereits gesendeter Befehl
kann angewendet worden sein; Abbruch führt keinen Rollback aus und macht einen
Schreibvorgang nicht atomar. Bewahre die Sicherung auf und wiederhole vor dem
nächsten Schreiben Identifikation, Lesen und Prüfung. Bildschirmtests prüfen
Fehler ohne USB und Löschen der Bearbeitungskopien beim Verlassen, ohne
automatische Wiederaufnahme. Nach einem Fehler wird der Transport geschlossen
und eine neue Verbindung ist nötig; erneutes Tippen auf Sicherung genügt nicht.
Aktuelle Ergebnisse, getrennt von veröffentlichtem main und physischen Tests,
stehen in der [Validierungsmatrix](VALIDACION-INTEGRAL-V3-ANDROID.md).
ADIF prüft Roundtrip, Bezeichnungen in Kommentaren, optionalen Header, Zeiten
in Minuten, nicht übernommene Felder, UTC, Deduplizierung, abgeschnittene/
ungültige Datensätze und ASCII. SQLite prüft Duplikate und Rollback mit einem
eingespeisten echten Einfügefehler. Die Oberfläche testet Suche nach Rotation
und Vorschau mit Abbrechen/Bestätigen.
SSTV prüft Geometrie 320x240, zeitlichen Start, Graustufen bei 8/16/48 kHz
und RGB/CMY-Balken bei 8 kHz: maximaler Fehler von 12 Pegeln je Kanal an den
inneren Graupunkten und 15 an den geprüften Farbpunkten. Abweichender VIS,
falsche Parität, Stille, fehlende Zeilen und nicht unterstützte Abtastraten/
Dauern werden abgelehnt. Die Oberfläche exportiert ein PNG, das erneut geöffnet
und als 320x240 geprüft wird; nach einem Fehler wird kein Export angeboten.
Fehlerraten oder Qualität realer Aufnahmen wurden nicht gemessen.
SGP4 wird anhand eines festen Test-TLE mit dem Web verglichen: Epoche,
Azimut/Elevation (Toleranz 0.00001 Grad), Bereich (1 m), AOS/LOS (500 ms),
Maximum und Doppler in 10-Hz-Schritten. Prüfsumme, Alter, Bänder, Zeitfenster,
Erneuerung ohne Frequenzänderung, Abbruch, unregelmäßige Uhr, verspätete/
ausstehende Antwort und USB-Fehler werden geprüft. Der kombinierte Test
wendet den berechneten Doppler auf ein simuliertes CAT-Funkgerät an und stellt
mit STOP die Nennfrequenz wieder her. Die Oberfläche importiert einen Katalog,
berechnet Überflüge offline, übergibt die ausgewählte Momentaufnahme und
weist einen abgelaufenen Überflug ohne SET ab und schließt USB.

Die APK und die instrumentierte APK werden kompiliert. Lint wird ohne Fehler
abgeschlossen; Warnungen zu neueren Versionen von Testabhängigkeiten, zur Form
des Originalsymbols und zur Typografie bleiben bestehen. Sie werden weder
unterdrückt noch als Funktionsfehler eingestuft.

Bei dieser Validierung war weder ein Android-Telefon noch ein Emulator
verbunden. Die instrumentierten Tests sind kompiliert, **nicht ausgeführt**.
Installation, Bedienbarkeit und Berechtigungen auf dem Telefon, echtes GPS,
reale Audioverbindungen und alle als nicht implementiert markierten Funktionen
bleiben ausstehend.