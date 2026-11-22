# Diagnostico remoto / Remote diagnostics / Diagnostic distant / Ferndiagnose

## ES - Datenschutz und Funktionsweise

Das System erfasst **minimierte technische Daten**, keine versteckte Telemetrie. Der
Fernversand ist standardmäßig deaktiviert und erfordert eine Zustimmung sowie einen
vom Administrator konfigurierten HTTPS-Empfänger. Ein zentraler BricoHams-Dienst
wird nicht vorausgesetzt.

Der Vertrag akzeptiert ausschließlich Softwareversion, Komponente, generische
Plattform und bis zu 16 Ereignisse mit Code, Bereich, Schweregrad, Fehlerkategorie
und Zeilennummer. Nicht zulässig sind Meldungen, Werte von Ausnahmen, Pfade,
Benutzernamen, Tokens, Rufzeichen, QSOs, Frequenzen, Audio, Standort, Ports sowie
Kennungen des Geräts oder der Installation. Zusätzliche Felder werden abgelehnt:
Es wird nicht versucht, beliebigen Text zu bereinigen, um ihn danach zu senden.

**Absolute Anonymität wird nicht versprochen.** Der Empfänger, sein Anbieter oder
ein Proxy können IP, Autorisierungsdaten, Uhrzeit und Verbindungsmetadaten
kennen. Der Betreiber des Empfängers muss seine eigenen Protokolle und seine
Aufbewahrungsrichtlinie konfigurieren.

### Clients

- Web-Stationskonsole, Android/Tablet und iPhone/iPad: In den Einstellungen
  lassen sich lokale Protokolle prüfen, herunterladen, importieren, einmal senden,
  den automatischen Versand im Vordergrund aktivieren und löschen. Die automatische
  Zustimmung wird nicht gespeichert; Trennen oder Neustarten deaktiviert sie. Es
  wird der HTTPS-Host dieser Sitzung verwendet.
- RadiCodex: Die Diagnosekarte erlaubt es, den Versand mit HTTPS-URL und einem
  ausschließlich im Speicher gehaltenen Token zu prüfen und zu autorisieren. Es wird
  nur im Vordergrund gesendet; Deaktivieren oder Neustarten verhindert neue
  Sendungen. Eine bereits gestartete Anfrage kann angekommen sein.
- HTML5-Workspace: Jede Werkzeugseite bietet JSON-Ansicht, Download, lokales
  Löschen und manuellen Versand über den autorisierten lokalen Server. GitHub
  Pages erhält keine Berichte: im HTTPS-Client herunterladen und importieren.
- Die alten detaillierten USB-Berichte sind privat und werden über diese
  Mechanismen nicht gesendet. Vor einer manuellen Weitergabe separat prüfen.

Die native Protokollierung und die Prüfung des HTTPS-Ursprungs befinden sich in der
Android-Bibliothek `station-core`, die ohne Abhängigkeiten von der RadiCodex-Oberfläche
wiederverwendbar ist. Jede Anwendung initialisiert das Protokoll mit ihrer Komponente
aus dem geschlossenen Vertrag und ihrer öffentlichen Version; diese Identität kann
sich innerhalb derselben Anwendung nicht ändern. RadiCodex behält `radicodex` und
seine kompilierte Version. Der unabhängige Agent verwendet `station-agent`, ohne
USB-Kennungen in den Berichten. Der JSON-Vertrag wird aus derselben Python-Definition
erzeugt und mit der Bibliothek paketiert. Diese Auslagerung implementiert für sich
allein weder den OTG-Agenten noch ändert sie Zustimmung, Grenzen, Aufbewahrung,
TLS-Prüfung oder die HTTPS-Empfangsbestätigung.

Die JS-Clients behalten bis zu 128 Ereignisse und RadiCodex bis zu 500 Einträge.
Der logische Verfall beträgt sieben Tage und wird beim Lesen/Schreiben geprüft; ein
ausgeschaltetes Gerät führt keine Bereinigung durch. Das Löschen hier entfernt nur
lokale Protokolle: Bereits empfangene Berichte werden nicht zurückgezogen, und ein
physisches Löschen von Sicherungskopien ist nicht garantiert. Speicher- und
Zustellfehler werden angezeigt; die Erlaubnis zum Senden bedeutet nicht
bestätigte Zustellung.

### Empfänger und Python-Agenten

Der Koordinator aktiviert den Empfang mit:

```text
bricohams-station-host --diagnostic-report-database <ruta-privada>/reports.sqlite3
```

Die üblichen TLS- und Stationsargumente ergänzen; das Beispiel ersetzt nicht die
HTTPS-Konfiguration. Wenn der Koordinator neben dem lokalen Workspace (Port 8787)
läuft, einen anderen Port verwenden, zum Beispiel `--port 8443`.

`BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN` mit zufälligen, exklusiven Zugangsdaten
von mindestens 32 Zeichen konfigurieren. Die Rolle `diagnostic_reporter` kann
Berichte zustellen, steuert aber kein RF und ruft keine Berichte ab. Administrator/
Operator können ebenfalls zustellen; nur der Administrator ruft
`GET /api/v1/diagnostic-reports` ab. Der Empfang ist deaktiviert, wenn die
Datenbank nicht konfiguriert ist.

Host und Agent erzeugen lokale Protokolle in `~/.bricohams/diagnostics`, konfigurierbar
mit `--diagnostic-directory`. Um den Versand an einen Empfänger zu autorisieren:

```text
--diagnostics-opt-in --diagnostics-url https://diagnostic.example.org
```

Das Geheimnis wird über `BRICOHAM_DIAGNOSTICS_TOKEN` bereitgestellt, niemals in der URL,
in Argumenten des Berichts oder im Quellcode. Zugangsdaten der Stationssteuerung nicht
wiederverwenden; der Start lehnt diese Wiederverwendung in den Python-Agenten ab.
`--diagnostics-ca <archivo>` erlaubt es, einer eigenen CA zu vertrauen, ohne TLS zu
umgehen. Die Warteschlangen im Speicher sind auf 128 Ereignisse begrenzt; bei Überlast
wird das Verwerfen der ältesten gemeldet. Der Worker führt keine I/O im RF-Logging-Pfad
aus. Lokale Protokolle überstehen den Neustart; die Remote-Warteschlange ist keine
dauerhafte Outbox und wird mit neuen Ereignissen wiederaufgebaut, nicht mit dem
gesamten Verlauf.

Der Empfängerspeicher begrenzt auf 500 Berichte, liefert dem Administrator die letzten
50 und wendet sieben Tage logische Aufbewahrung sowie ein Seitenlimit von SQLite an.
Er speichert keine IP im Bericht. Die API begrenzt auf 4096 Bytes pro Bericht und 60
Zustellungen pro Minute. Bei einem HTTPS-/Bestätigungsfehler wird mit einer Wartezeit
zwischen 60 und 600 Sekunden erneut versucht. Nur HTTP 202 mit genau
`{"accepted":true}` bestätigt den Empfang.

### Lokaler Node-Workspace

`npm start` erzeugt einen lokalen minimierten Verlauf, getrennt von den originalen
Konsolenausgaben, die detaillierte Diagnosen enthalten können und privat bleiben.
Der JSONL-Verlauf hält höchstens 128 Berichte und einen logischen Verfall von sieben
Tagen. Er wird nicht über eine öffentliche Lese-API bereitgestellt.

Im Prozessumfeld konfigurieren:

```text
BRICOHAM_DIAGNOSTICS_OPT_IN=1
BRICOHAM_DIAGNOSTICS_URL=https://diagnostic.example.org
BRICOHAM_DIAGNOSTICS_TOKEN=<secreto-exclusivo>
BRICOHAM_DIAGNOSTICS_CA=<archivo-CA-opcional>
```

Die Autorisierung aktiviert die technischen Logs des Hosts und die Weiterleitung eines
Browserberichts, wenn Senden gedrückt wird. Ohne sie gibt es kein Diagnosenetz.
Der lokale POST verlangt den exakten Ursprung, geschlossenes JSON und ein Größenlimit.
Der Server bleibt auf Loopback; er ist kein Proxy für CAT, PTT oder Remote-Firmware.

## EN - Benutzerhilfe

Der Fernversand ist standardmäßig ausgeschaltet. Vor der Zustimmung das JSON
prüfen. Erlaubt sind nur öffentliche Softwaremetadaten und feste Fehlerkategorien;
Meldungen, Geheimnisse, Rufzeichen, QSOs, Frequenzen, Audio, Standort sowie Geräte-
und Installationskennungen sind ausgeschlossen. HTTPS verbirgt Ihre IP oder die
Verbindungsmetadaten nicht vor dem Empfänger.

Die Einstellungen im gemeinsamen Stationsclient, Diagnose in RadiCodex oder das
technische Panel im Workspace verwenden. Nutzer von Pages laden das JSON herunter und
importieren es in den HTTPS-Stationsclient. Die automatische Client-Zustimmung gilt
nur für die Sitzung und nur im Vordergrund. Das Löschen lokaler Protokolle ruft
zugestellte Berichte nicht zurück und löscht Sicherungen nicht physisch. Begrenzte
Protokolle verfallen logisch nach sieben Tagen, wenn die Anwendung aktiv ist. Alte
detaillierte USB-Exporte sind privat und werden nie automatisch hochgeladen.

Das Deployment verwendet genau die oben genannten Optionen/Umgebungsvariablen.
Eigenen HTTPS-Empfänger, dedizierte Diagnose-Zugangsdaten, bei Bedarf CA,
Aufbewahrung und Proxy-Protokollierung konfigurieren. Die Reporter-Rolle kann die
Funkhardware nicht steuern. Es werden kein öffentlicher BricoHams-Sammler, keine
absolute Anonymität, keine bestätigte Zustellung ohne Empfangsquittung und keine
physische Hardwarevalidierung vorausgesetzt.

## FR - Benutzerhilfe

Der Fernversand ist standardmäßig deaktiviert. Das JSON vor der Zustimmung prüfen.
Zulässig sind nur öffentliche Softwaremetadaten und feste Fehlerkategorien: weder
Meldungen, Geheimnisse, Rufzeichen, QSOs, Frequenzen, Audio, Standort noch Geräte-/
Installationskennungen. HTTPS verbirgt Ihre IP oder die Verbindungsmetadaten nicht
vor dem Empfänger.

Konfiguration des Stationsclients, Diagnose von RadiCodex oder das technische
Workspace-Panel verwenden. Auf Pages das JSON herunterladen und anschließend im
HTTPS-Client importieren. Die automatische Zustimmung der Clients gilt nur für die
Sitzung und den Vordergrund. Das lokale Löschen entfernt keine empfangenen Berichte
und löscht Sicherungen nicht physisch. Die logische Aufbewahrung von sieben Tagen
wird angewendet, wenn die Anwendung aktiv ist. Die alten detaillierten USB-Exporte
bleiben privat.

Das Deployment verwendet genau die oben genannten Optionen und Variablen. Eigenen
HTTPS-Empfänger, exklusives Diagnosegeheimnis, bei Bedarf CA, Aufbewahrung und
Proxy-Protokolle konfigurieren. Die Reporter-Rolle steuert das Funkgerät nicht. Es
werden kein öffentlicher BricoHams-Sammler, keine absolute Anonymität und keine
Hardwarevalidierung vorausgesetzt.

## DE - Benutzerhilfe

Der Fernversand ist standardmäßig aus. JSON vor der Zustimmung prüfen. Erlaubt
sind nur öffentliche Softwaremetadaten und feste Fehlerkategorien: keine Meldungen,
Geheimnisse, Rufzeichen, QSOs, Frequenzen, Audiodaten, Standorte oder Geräte- und
Installationskennungen. HTTPS verbirgt IP und Verbindungsmetadaten nicht vor dem
Empfänger.

Stationsclient-Einstellungen, RadiCodex-Diagnose oder das technische Workspace-Panel
verwenden. Auf Pages JSON herunterladen und im HTTPS-Client importieren. Automatische
Client-Zustimmung gilt nur für die Sitzung im Vordergrund. Lokales Löschen ruft
gesendete Berichte nicht zurück und löscht Sicherungen nicht physisch. Begrenzte
Protokolle verfallen logisch nach sieben Tagen bei aktiver Anwendung. Alte
detaillierte USB-Exporte bleiben privat und werden nie automatisch gesendet.

Deployment verwendet die oben angegebenen Optionen und Umgebungsvariablen. Eigenen
HTTPS-Empfänger, exklusives Diagnosegeheimnis, gegebenenfalls CA, Aufbewahrung und
Proxy-Protokolle konfigurieren. Reporter darf keine Funkhardware steuern. Es werden
kein öffentlicher BricoHams-Empfänger, absolute Anonymität oder Hardwarevalidierung
vorausgesetzt.

## PT - Benutzerhilfe

Der Fernversand ist standardmäßig deaktiviert. Das JSON vor der Autorisierung
prüfen. Erlaubt sind nur öffentliche Softwaremetadaten und feste Fehlerkategorien:
keine Meldungen, Geheimnisse, Rufzeichen, QSOs, Frequenzen, Audio, Standort oder
Geräte-/Installationskennungen. HTTPS verbirgt die IP oder die Verbindungsmetadaten
nicht vor dem Empfänger.

Die Konfiguration des Stationsclients, die Diagnose von RadiCodex oder das technische
Workspace-Panel verwenden. Auf Pages das JSON herunterladen und im HTTPS-Client
importieren. Die automatische Zustimmung des Clients gilt nur während der Sitzung im
Vordergrund. Das Löschen lokaler Protokolle ruft gesendete Berichte nicht zurück und
löscht Sicherungskopien nicht physisch. Die begrenzten Protokolle verfallen logisch
nach sieben Tagen, wenn die Anwendung aktiv ist. Alte detaillierte USB-Exporte
bleiben privat.

Die oben genannten Optionen und Variablen verwenden, um einen eigenen HTTPS-Empfänger,
exklusives Geheimnis, optionale CA, Aufbewahrung und Proxy-Protokolle zu
konfigurieren. Die Reporter-Rolle steuert das Funkgerät nicht. Es werden kein
öffentlicher BricoHams-Empfänger, keine absolute Anonymität und keine physische
Hardwarevalidierung vorausgesetzt.
