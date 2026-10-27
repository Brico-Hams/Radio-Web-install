# Allgemeine Konfiguration, Sicherungen und Diagnose

Revision: 25-10-2026. Konzeptionell auf FM/DMR anwendbar; Menünamen,
Bereiche und Tasten hängen vom Modellleitfaden und Build ab.

## Vor der Konfiguration

### Anbieter und automatischer Download in der installierten Version

Öffne unter Repeater **RepeaterBook-API konfigurieren**, gib den individuellen
freigegebenen Token und User-Agent ein und bestätige deine Genehmigung. Sie
werden nur bis zum Neustart im Serverspeicher behalten; das Token-Feld wird
nach dem Absenden geleert. Die Variablen `RB_USER_TOKEN`,
`RB_APPROVED_USER_AGENT` und `RB_APPROVED=yes` können weiterhin zur
Konfiguration des Prozesses über die Umgebung verwendet werden.

Unter DMR-Kontakte importiert **DMR automatisch herunterladen** einen
RadioID-Stapel nach Land/Region (1-10 Seiten, maximal 1024) in das lokale
Codeplug. Räume sind Talkgroups: Die BrandMeister-Option verwendet ein TG-
Präfix, kein RadioID-Land. Speichere die Gruppen als Gruppenrufkontakte mit
einem numerischen TG-Namen; weise danach im CPS das TG dem Kanal zu. Dadurch
wird der Hotspot weder abonniert noch ein Raum geöffnet. Es wird nicht ins
Funkgerät geschrieben und beim Start nicht stillschweigend synchronisiert.

Für Quansheng bereitest du unter SAT/Überflüge FM- oder Doppler-Kanäle vor und
drückst **Vorbereitete SAT-/Doppler-Kanäle in Quansheng-Konfiguration laden**,
nachdem du eine FM-Vorlage gewählt hast. Dafür muss eine F4HWN-v6-Konfiguration
gelesen/geöffnet worden sein. Es lädt keine TLE in das Firmwaremodul: Es
bereitet gestaffelte Empfangsspeicher mit manuellem Wechsel vor.

Notiere Modell, Platinenrevision, MCU-Familie, Firmware und Datum/Build.
Speichere ein Foto von SysInf/Radio Info, Originaldateien und deren Hashes.
Notiere Kabeltyp, Port, Browser und verwendetes Programm. Es darf immer nur
eine Anwendung den Port geöffnet haben: CHIRP, CPS, Studio und andere Tabs
schließen.

Verwechsle diese Objekte nicht:

| Objekt | Inhalt | Ersetzt nicht |
| --- | --- | --- |
| Firmware | Programm, das der Prozessor ausführt | Individuelle Kalibrierung |
| Codeplug/Konfiguration | Kanäle, Kontakte, Zonen und Einstellungen je nach Format | Firmware- oder vollständige Funkgerätesicherung |
| Kalibrierung | Individuelle Einstellwerte des Geräts | Konfiguration eines anderen Funkgeräts desselben Modells |
| Physischer Flash | Image eines bestimmten Speichers | Speicher anderer Chips, sofern diese nicht im angegebenen Umfang enthalten sind |
| Manifest/SHA256SUMS | Namen, Hashes und Metadaten | Digitale Herstellersignatur |
| TLE | Orbitale Elemente und Epoche | Aktive Frequenzen oder garantierter Satellitendienst |

Exportiere die Sicherung `.rwb.json` aus dem Browser und bewahre das Original
unverändert auf. IndexedDB hängt von Ursprung, Browser und Profil ab. Beim
Wechsel zwischen localhost, 127.0.0.1, Pages oder privatem Modus werden
möglicherweise unterschiedliche Sicherungen angezeigt. Lösche keine
Browserdaten, um USB-Probleme zu beheben, bevor du sie exportiert hast.

## Beta und PRO-Modus

Die Anwendung und die Bricohams-Builds befinden sich in der Phase **Beta / Validierung**.
Aktiviere vor dem Anschließen **PRO-Modus**, wenn du die angeklickten Aktionen
ohne Bestätigungswörter oder Einverständnis zum lokalen Löschen von Kanälen
ausführen möchtest. Die PRO-Auswahl genehmigt auch den anfänglichen Lesevorgang,
ohne ein weiteres Kästchen anzukreuzen. Die Auswahl gilt für diese Seite/Sitzung;
beim Neuladen wird sie nicht stillschweigend gespeichert. Sie entfernt weder
die Modellauswahl noch die WebUSB-/Web-Serial-Berechtigungen des Browsers,
die vollständige Sicherung, CRC, Hash-Prüfung, erneutes Einlesen, Sperre während
laufender Aufgaben oder Main-Schutz. Bestätigungen im externen CPS/Studio werden
dadurch nicht gesteuert. Während eines Vorgangs darfst du auch mit PRO weder
navigieren noch die Verbindung trennen. Eine Teilsicherung erlaubt niemals
Schreibvorgänge, unabhängig von diesem Modus.

## Glossar für Analogkanäle

| Einstellung | Bedeutung | Auswahl und Prüfung |
| --- | --- | --- |
| RX | Frequenz, die das Funkgerät empfängt | Veröffentlichte Ausgabe des Repeaters oder Simplexfrequenz verwenden |
| TX | Frequenz, auf der gesendet wird | Bei Repeatern deren Eingabe verwenden; RX/TX nicht intuitiv vertauschen |
| Offset und Richtung | Differenz von TX zu RX | Resultierende TX-Frequenz prüfen, nicht nur das Vorzeichen |
| Modus | FM, AM oder andere unterstützte Betriebsart | Muss zum Signal passen; AM-Empfang berechtigt nicht zu AM-TX |
| Step | VFO-Schrittweite | Nicht die Kanalbandbreite; passendes Raster auswählen |
| W/N / Bandbreite | FM-Hub/Filter des Kanals | Auf das System abstimmen; schmal erzeugt keinen digitalen Modus |
| SQL | Schwelle zum Öffnen des Audios | Niedrig beginnen und nur so weit erhöhen, dass Rauschen unterdrückt wird, ohne Signale zu verlieren |
| CTCSS TX | Übertragener Subaudio-Ton | Nur falls vom Repeater verlangt |
| DCS TX | Digitaler Subaudio-Code | Nicht gleich Color Code bei DMR; gegebenenfalls Polarität beachten |
| CTCSS/DCS RX | Zusätzliche Bedingung zum Öffnen des Audios | Bei der Diagnose ungefiltert lassen; verschlüsselt keine Kommunikation |
| Leistung | RF-Ausgangsleistung | Niedrigste ausreichende und zulässige Stufe; Werte hängen von der Kalibrierung ab |
| RX-only / TXLock | Verhindert das Senden auf diesem Kanal | Beim Empfang und bei nicht überprüften Importen aktiviert lassen |
| Busy lock | TX-Sperre bei erkannter Belegung | Ersetzt nicht die Pflicht, vor dem Senden zuzuhören |
| TOT | Maximale Dauer des ununterbrochenen TX | Hilft bei klemmender PTT; ist nicht das Scanintervall |
| VOX | Aktiviert TX über Audio | Bei USB-, Kopfhörer- und lauten Umgebungstests deaktivieren |
| Compander | Dynamikverarbeitung | Nur verwenden, wenn die Gegenstation kompatibel ist |
| Reverse | Tauscht Eingang/Ausgang vorübergehend | RX/TX beim Beenden erneut prüfen; gespeicherten Kanal nicht unbeabsichtigt ändern |

### Beispiel: mit einem Repeater arbeiten

1. RX, TX, Modus, Bandbreite und Ton aus der Veröffentlichung des Betreibers übernehmen.
2. Eine kompatible Vorlage erstellen oder duplizieren; RX-only während der Prüfung beibehalten.
3. Ohne RX-Filter zuhören und Aktivität sowie Frequenz prüfen.
4. Prüfen, dass der TX-Ton tatsächlich erforderlich ist und nicht nur vom Anbieter angenommen wurde.
5. Gesetzmäßigkeit, Leistung und Zugehörigkeit zu Listen/Zonen überprüfen.
6. Im Speicher sichern. Kanal erneut auswählen und Persistenz prüfen.
7. Auf dieser Website das Ergebnis exportieren; nicht annehmen, dass die Bearbeitung einer Datei sie ins Funkgerät geschrieben hat.

Es gibt keine universellen Sendefrequenzen: Sie hängen von Ort, Lizenz, Band,
Dienst und konkretem Repeater ab.

## DMR-Glossar

| Einstellung | Bedeutung | Häufiger Fehler |
| --- | --- | --- |
| Radio ID | Eigene Teilnehmerkennung | Mit TG verwechseln oder die ID einer anderen Person verwenden |
| TX-Kontakt | Anrufziel und Gruppen-/Einzelrufart | Einen Einzelrufkontakt verwenden, obwohl Gruppe erforderlich ist |
| TG | Talkgroup, Gruppenkennung | Annehmen, dass sie allein das Netzwerk des Repeaters programmiert |
| TS 1/2 | Time Slot des Kanals | Mit Kanalnummer oder Color Code verwechseln |
| CC 0-15 | DMR-Zugangs-Color-Code | Als Passwort oder CTCSS-Ton behandeln |
| RX Group | Gruppe der Empfangs-Talkgroups | Mit Kanalzone verwechseln |
| Zone | Organisierte Kanalliste | Erwarten, dass TS/CC automatisch geändert werden |
| DMR-Filter | Bedingungen zur Audioannahme | Ein offener Filter berechtigt nicht, in jeder TG zu senden |
| Hotspot | Persönliche RF-/Netzwerkschnittstelle | Ist standardmäßig kein herkömmlicher Repeater mit zwei Slots |
| ID-Datenbank | Zuordnung von ID, Rufzeichen und Name | Erstellt keine TX-Kontakte und ermöglicht keinen Netzzugang |

Für die DMR-Konfiguration in OpenGD77 folge dem [eigenen Leitfaden](AYUDA-OPENGD77.md).
Quansheng F4HWN/Karina/ARDF wird hier nicht als DMR-Funkgerät dokumentiert.

## Scan und Dual Watch

Beim Scannen werden Kanäle nacheinander aufgerufen; nicht der gesamte Bereich
gleichzeitig abgehört. Höhere Geschwindigkeit kann kurze Träger, Töne oder
digitale Header verpassen. Zeitgesteuertes Fortsetzen, Fortsetzen bei Träger
oder Anhalten sind unterschiedliche Verhaltensweisen.

Prioritätskanäle und Dual Watch ergänzen weitere Besuche im Zyklus und können
die effektive Hörzeit verändern. Prüfe, welcher Kanal für TX verwendet wird:
Hauptkanal, zuletzt empfangener Kanal oder der im Antwortmodus festgelegte.
Schalte zur Empfangsdiagnose den Scan aus und verwende ein einzelnes VFO.

## Systemeinstellungen

| Gruppe | Was geändert wird | Vorsicht |
| --- | --- | --- |
| Hintergrundbeleuchtung/Kontrast/Invertierung | Lesbarkeit und Verbrauch | Ändert nicht die RF-Empfindlichkeit |
| Beeps/Sprache/Hinweise | Oberflächensignale | Lautstärke vor dem Verwenden von Kopfhörern reduzieren |
| Energiesparen/Sleep/APO | Empfangszyklus oder Abschaltung | Kann Signalerkennung verzögern und Sitzungen unterbrechen |
| Akkukapazität | Schätzung/Verwaltung je nach Firmware | Ändert die physische Kapazität nicht und kalibriert die Spannung nicht |
| Tastatur-/PTT-Sperre | Erlaubte Aktionen | Prüfen, ob damit auch TX gesperrt wird und wie die Entsperrung in diesem Build funktioniert |
| Datum/Uhrzeit/UTC | Protokollierung, Position und Orbits | Zeitzone ersetzt keine korrekte Uhr |
| Position/GPS | Berechnungen oder darauf angewiesene Dienste | Datenschutz beachten und GPS nicht annehmen, wenn das Modell keines hat |
| Shortcuts/Tasten | Kurze/lang gedrückte Aktionen | Änderungen dokumentieren; keine Kombinationen anderer Modelle übernehmen |
| Reset | Setzt Wertgruppen zurück | Kann Kanäle/Einstellungen löschen; nicht als erste Diagnose verwenden |
| Kalibrierung | Frequenz, Pegel und weitere Prüfstandparameter | Nicht ohne Instrumente und Projektverfahren ändern |

## Repeater, RadioID und Satelliten auf dieser Website

- Webmodus: RadioID über `user.csv`; lokaler Modus: Abfrage über den Server.
  Importierte Einzelkontakte erstellen keine Zonen und weisen Kanälen kein TG zu.
- RepeaterBook benötigt die lokale Version und einen freigegebenen Token. Eine
  externe Quelle kann unvollständig oder veraltet sein. Betriebsstatus beim
  Verantwortlichen prüfen.
- OpenGD77 verwendet hier ein Standard-Codeplug mit 128 KiB. Importierte Kanäle
  basieren auf einer kompatiblen Vorlage und sind zunächst RX-only; Zone im
  CPS überprüfen.
- Quansheng kann eine F4HWN-v6-Konfiguration lesen, FM-Kanäle auf einer Vorlage
  ergänzen und Speicher aus der lokalen Datei löschen. Beta-Übertragung erfordert
  vollständige Flash-Sicherung und erneutes Einlesen; v6.0 bleibt schreibgeschützt.
  Es exportiert auch Projekte/CSV. Es gibt keine native Quansheng-SAT-Orbittabelle.
- OpenGD77 unterscheidet native SAT-Tabelle und Empfangskanäle. Prüfe Grenzen
  und tatsächliche Fähigkeiten des Editors, bevor du annimmst, dass eine
  erweiterte Datei verwendbar ist.
- Doppler ist kein Repeater-Offset. Er hängt von Zeitpunkt, Orbit und Position
  ab; gestaffelte Kanäle sind Näherungen, kein kontinuierliches Tracking.
- TLE, Uhrzeit und Position aktualisieren; Epoche und aktive Frequenz prüfen.
  Ein vorhergesagter Überflug garantiert weder einen aktiven Transponder noch Empfang.
- Für den Empfang alte Töne deaktivieren, sofern sie nicht nachweislich benötigt
  werden. Durch den Import eines Satelliten keinen Uplink/automatischen TX aktivieren.

## USB-Verbindung: Betriebsarten nicht verwechseln

| Betriebsfamilie | Erwarteter Modus | Was nicht zu tun ist |
| --- | --- | --- |
| Quansheng: Lesen und Slots | Kompatible F4HWN-Firmware normal gestartet, serielles Protokoll | Nicht nur für die Kanalanzeige den Bootloader-Modus verwenden |
| Quansheng: externes Flashen | Hardware-spezifischer Modus und passendes Werkzeug | Kein V1-Werkzeug für V3 verwenden und packed/RAW nicht verwechseln |
| OpenGD77: Web-CPS-Lesen | Normale OpenGD77-Firmware und Transport der jeweiligen Familie | Weder DFU noch Boot-ROM auswählen |
| OpenGD77: Firmware installieren | Offizielles Werkzeug und Vorgehensweise des Modells | Die Website nicht wie einen MCU-Flasher verwenden |

Chrome/Edge auf dem Desktop, HTTPS oder 127.0.0.1 und eine Geräteberechtigung
sind für Browser-APIs erforderlich. Ein Ladekabel kann Strom zuführen, ohne
Daten zu übertragen. USB-C direkt und seitliches serielles Kabel sind
unterschiedliche Verbindungen. Ändere nicht den Treiber eines fremden Geräts
und ersetze nicht alle CDC-Geräte durch WinUSB: Identifikatoren und Schnittstelle
vorher prüfen.

### Zeitüberschreitung / „0 von 1 Bytes“

1. Exakte Meldung und letzten erfolgreichen Vorgang speichern.
2. Andere Programme und Tabs schließen, die den Port verwenden.
3. Sicher trennen und das Funkgerät im Normalmodus starten.
4. Hardware, Firmware und richtigen Port prüfen; ein Datenkabel testen.
5. Einen Lesevorgang erneut versuchen, ohne zu schreiben oder zu löschen.
6. Wenn die Identifikation funktioniert, das Lesen aber fehlschlägt, genaue
   Firmware sowie Befehl/Phase notieren. Die Identifikation beweist nicht, dass
   alle Befehle unterstützt werden.
7. Bei erneutem Fehler anhalten und Protokolle sichern. Baudrate nicht beliebig
   erhöhen und Sicherungsschutz nicht entfernen.

## Checkliste nach der Konfiguration

- Die exportierte Datei hat das erwartete Format/die erwartete Größe und eine Originalkopie.
- Änderungen bleiben nach Schließen und erneutem Öffnen der Datei erhalten.
- RX/TX, Töne, Modus, TS/CC und RX-only sind korrekt, soweit zutreffend.
- Zone/Liste/Bank entspricht der Absicht, nicht nur die Speichernummer.
- „Vorbereitet“ wurde nicht mit „installiert“ verwechselt.
- Eine CRC-Prüfung deckt nur die angegebenen Daten ab, nicht die gesamte
  Firmware-Sicherheit oder die Kalibrierung anderer Chips.

Quellen: Connector, Editor und Planer dieser Website; in den Leitfäden
[F4HWN](AYUDA-QUANSHENG.md) und [OpenGD77](AYUDA-OPENGD77.md) verlinkte Handbücher.
