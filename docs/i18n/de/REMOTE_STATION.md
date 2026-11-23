# Integrierte Remote-Station

Die ursprüngliche Entwicklung BricoHam Remote Station wird als
`remote-station/` in **Bricohams Radio Workspace / RadiCodex** übernommen.
Der eigene Code, seine Tests, Dokumente und mobilen Projekte bleiben vollständig erhalten,
ohne Caches, lokale SDKs, Geheimnisse oder Build-Binärdateien.
Die Root-Lizenz GPL-3.0-or-later und die MIT-Hinweise der Komponente bleiben bestehen;
die Lizenzen von Abhängigkeiten und Drittanbieter-Ressourcen werden nicht geändert.

## Wann welche Remote-Implementierung verwenden

Das Projekt enthält zwei unabhängige Remote-Stationen:

| Name in der Oberfläche | Code | Verwenden, wenn |
| --- | --- | --- |
| **Remote-Station (Python-Host/Agent)** | `remote-station/`, `station.html` | Du einen koordinierenden HTTPS-Host, Python-Headless-Agenten und Web-/Android-/iOS-Clients brauchst. Der Android-Client verbindet sich nur. |
| **Remote shack (rigctld, Desktop)** | `remote-agent.cjs`, `remote-station.cjs`, `remote-relay.cjs`, `remoto.html` (README: «Remote shack») | Du ein Funkgerät über Hamlib `rigctld` aus der Desktop-App/vom Raspberry Pi steuern willst, mit eigenem Relay, Opus-Audio und FTX-1-Tuner. |

Sie teilen weder Ports noch Konfiguration (die zweite verwendet `~/.radicodex/`). Die
Funkgerätekataloge und die CAT-Analyse des FTX-1 sind absichtlich doppelt vorhanden: Sie wurden
nicht vereinheitlicht, weil die Formate voneinander abweichen. Die TX-Schutzfunktionen (TX
standardmäßig deaktiviert, Schutz vor hohem SWR, Zeitlimits für
ATAS/Abstimmung, Notstopp und PTT-Wächter) bleiben in beiden erhalten.

## Integration und Grenzen

- Die Webnavigation verlinkt **Remote-Station (Python-Host/Agent)** nur einmal.
  Sie bereitet eine validierte HTTPS-URL vor
  und öffnet den vom Host ausgelieferten Client; sie erfasst oder sendet keine Tokens. Der Eintrag
  **Remote shack (rigctld, Desktop)** erscheint nur auf dem Desktop.
- RadiCodex Android enthält einen internen HTTPS-Bildschirm: ohne native
  JavaScript-Brücken, Dateizugriff oder gemischte Inhalte. Er fixiert den ausgewählten Ursprung,
  weist ungültige Zertifikate zurück und fragt ausschließlich nach der Berechtigung für das Mikrofon.
  Beim Wechsel in den Hintergrund zerstört er die Seite/Sitzung, ohne automatische Wiederverbindung.
- Der dedizierte Android-Client und das iPhone/iPad-Projekt verbleiben in
  `remote-station/apps/web-console/`, mit offizieller BricoHams-Marke, -Farben, -Typografie und
  -Ressourcen. iOS erfordert einen Mac/Xcode zum Kompilieren und Signieren.
- Der koordinierende Host und die Headless-Agenten werden getrennt ausgeführt.
  Der [unabhängige Android-USB-Agent](../../../remote-station/docs/agente-android-usb.md)
  hat ein eigenes APK, eine ausgehende WSS-Verbindung und schreibgeschütztes FTX-1-CAT, mit
  expliziter Auswahl und Diagnose ES/EN/FR/PT. Seine physische OTG-Abnahme,
  Audio, PTT, CW, Digitalbetriebsarten und Zubehör stehen weiterhin aus; er wird nicht mit
  dem Client verwechselt, und diese Funktionen werden nicht als implementiert dargestellt.
  Der lokale Node-Firmware-Server **wird nicht im Internet veröffentlicht** und
  nicht zu einem Remote-Proxy gemacht. Kopien/Codeplugs oder Anbieter werden nicht offengelegt.
- Die bestehenden USB-Konnektoren, Speicher-, Firmware- und nativen Funktionen werden nicht
  geändert. Die CAT-Profile der Station sind unabhängig und Opt-in.
- Protokollbezeichner, `BRICOHAM_*`-Variablen, Python-Pakete
  und Application-IDs bleiben erhalten, um bestehende Konfigurationen/Clients nicht zu brechen.
  Es werden die Aliase `bricohams-station-host` und `bricohams-station-agent` hinzugefügt.

## Kompilieren und ausführen

Im Root-Verzeichnis, Node 22 und Python 3.12 oder höher:

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

Die Host- und Agent-Pakete werden in `remote-station/dist/` erzeugt (lokaler Ordner, von git ignoriert: Die Artefakte sind nicht versioniert).
Unter POSIX verwende `python3` und `remote-station/.venv/bin/python`.
Der [Leitfaden für sicheres Deployment](../../../remote-station/docs/despliegue-seguro.md)
beschreibt TLS/CA/Hostname, optionales mTLS und nach Rolle/Verbindung getrennte Geheimnisse.
Die [mehrsprachige Hilfe](../../../remote-station/docs/help/README.md) ist
im HTTPS-Client und in den dedizierten Clients integriert.

Die Verbindungs-URL enthält keine Tokens, Pfade oder Parameter. Sie muss auf den
HTTPS-Host zeigen, der die kompilierte Konsole ausliefert, nicht auf den Port des Agenten.
Für RadiCodex WebView ist eine für Android vertrauenswürdige Zertifikatskette erforderlich;
ein TLS-Fehler wird nie übergangen. Der dedizierte Capacitor-Client erfordert
die im Host dokumentierten exakten Ursprünge.

## Validierung und HF-Sicherheit

CAT, Audio, PTT, Rotoren, Leistung und ATU behalten ihre Interlocks und dokumentierten Zustände.
PTT erfordert Opt-in und unabhängige Limits; der Verlust des Clients
aktiviert den Watchdog, garantiert aber keinen physischen Stopp. Prüfe RX am Funkgerät.
Es wird weder eine USB-/HF-/Mobil-Abnahme noch vollständige Kompatibilität erklärt, nur weil
ein Profil vorhanden ist. Aktives Remote-CW, aktives WSJT-X, nativer FTX-1-Scope und der
Android-Headless-OTG-Agent stehen weiterhin aus; sie werden nicht als reale Funktionen simuliert.
## Diagnose

Alle Komponenten verfügen über ein minimiertes technisches Protokoll und Optionen zum Senden
mit Einwilligung. Siehe [Diagnose und Datenschutz](DIAGNOSTICS.md) für den
geschlossenen Vertrag, den HTTPS-Empfänger, Rollen, Aufbewahrung und Unterschiede zwischen den Clients.

### Gemeinsame native Android-Bibliothek

`android/station-core` enthält das minimierte Protokoll und den HTTPS-Validator, die zuvor
an RadiCodex gekoppelt waren. Es bewahrt das öffentliche Kotlin-Paket, um bestehende Aufrufe
und Bildschirme nicht zu verändern; es erhält Komponente/Version explizit, validiert beide
gegen den Vertrag und weist Identitätsänderungen innerhalb derselben Anwendung zurück.
Gespeicherte Berichte einer anderen Komponente oder Version werden nicht als eigene neu umhüllt.
Der generierte Vertrag wird als Asset der Bibliothek in jedes verbrauchende APK übernommen.
Das Senden bleibt standardmäßig deaktiviert, und die Zugangsdaten verbleiben nur im Speicher.
Es ist noch kein ausführbarer Android-OTG-Agent: USB, Dienst und Verbindung zum Host
stehen weiterhin aus. Das RadiCodex-APK behält seine Identität und seinen bestehenden HTTPS-Client.
Die Tests der Bibliothek und der Verbindung/Diagnose von RadiCodex bestehen, ebenso beide
Lints und der APK-Build. Verifiziert werden die 53 generierten Ressourcen, die Debug-Signatur v2 und der JSON-Vertrag
im aktualisierten APK. Die auf diese Extraktion beschränkte Sicherheitsprüfung
findet keine bestätigten Schwachstellen; sie zertifiziert nicht das gesamte Produkt.

## Upstream-Quellen und erste USB-Prüfung des FTX-1

Es wurden öffentliche GitLab-Quellen und Links zu gepflegtem Hamlib geprüft, ohne Zugriff
auf privates/kostenpflichtiges Patreon und ohne heruntergeladenen Code auszuführen. Patreon lieferte keinen
überprüfbaren Inhalt; die GitLab-Suche ist eingegrenzt, kein vollständiges Inventar.
Die [Yaesu-Bugs](../../../remote-station/docs/hardware/yaesu-cat.md),
[Xiegu-Risiken](../../../remote-station/docs/hardware/xiegu-candidates.md) und
[OpenGD77-Einschränkungen](../../../remote-station/docs/hardware/opengd77-usb.md)
dokumentieren Belege, Lizenzen, Kandidaten und Grenzen, ohne Code/Tabellen zu kopieren.
Der FTX-1 verlangt nun ID0840 vor und nach Änderungen von Frequenz/Betriebsart/Leistung;
ein falsches Modell oder eine verlorene Identität verhindern die Bestätigung der Einstellung, ohne Wiederholung.
Es bestehen **230 Python-Tests**, Ruff und die Verifikation der 53 generierten Ressourcen.

Die [reale USB-Prüfung](../../../remote-station/docs/hardware/ftx1-spa1.md) löste
den fehlenden Treiber mit einem offiziellen signierten Paket und verifizierte 15 Abfragen über die
Enhanced-Schnittstelle mit 38400/8N1, ohne Setter und ohne TX. IF liefert P10=3, das in
2508-C nicht dokumentiert ist: Es wird zurückgewiesen, und PTT bleibt gesperrt, wenn kein sicherer
Zustand geprüft werden kann. Es wird weder RF-, Audio-, Wiederverbindungs-, Firmware-Abnahme noch ein vollständiges Produkt erklärt.
Aktualisiertes Wheel und ZIPAPP wurden außerhalb des Quellbaums verifiziert: Sie weisen eine
ID eines anderen Modells ohne Setter zurück und lesen ID0840 am realen USB-Gerät. Das gemeinsame
Bundle bleibt in Wheel und dediziertem APK identisch; die vier SHA256-Werte stimmen überein.
Die auf die FTX-1-Identitätsprüfung beschränkte Sicherheitsprüfung fand keine
bestätigten Schwachstellen; sie ist keine globale Zertifizierung.

## Operativer Desktop

Der gemeinsame Web-/Android-/iPhone-/iPad-Client zeigt die Steuerelemente des Agenten
vor den Katalogen und Protokollreferenzen an. Die Links CAT/PTT/Rotor/Leistung/
Logbuch scrollen die Seite; sie senden keine Befehle und ändern keine Berechtigungen oder Sitzungen.
Die Karte des Koordinators autorisiert kein TX, und die Demonstration bleibt gekennzeichnet.
Die Komponenten behalten ihre Keys, Handler und Schließmechanismen.

Die [vergleichende UX-Studie](../../RADIO_UX_RESEARCH.md) dokumentiert öffentliche Quellen,
ursprüngliche Entscheidungen und Grenzen. Sie ist keine Kopie kommerzieller Produkte,
kein Nutzerranking und keine visuelle/Hardware-Abnahme. Die Hauptsteuerelemente
haben mindestens 44 px; Touch- und visuelle Prüfungen stehen noch aus.
Dieser Schritt schließt das Redesign aller nativen Bildschirme des Workspace nicht ab.
Das Portal gliedert Funkgerät/Agent, Host und Betrieb in drei Schritte, ohne Netzwerk und ohne
Speicherung von Zugangsdaten. In RadiCodex klappt sich die Konfiguration während
der Verbindung ein, ohne die WebView neu zu erstellen; Trennen und Status bleiben sichtbar.
Beim Trennen oder Wechsel in den Hintergrund kehrt die Konfiguration zurück, ohne Wiederverbindung.

## Verifikation dieser Integration

- Node-Ziel: **483 erfolgreiche Tests**, einschließlich Installer, Übersetzungen,
  Diagnoseverträgen, lokalem Ursprung und realer HTTPS-Zustellung.
- Python-Host/Agent: **212 erfolgreiche Tests** und Ruff ohne Fehler.
- Gemeinsamer Client: **61 erfolgreiche Tests**, Lint und TypeScript/Vite-Build.
- RadiCodex: sechs gezielte Tests zu Verbindung/Diagnose, APK-Build und Lint.
- Dedizierter Android-Client: APK kompiliert und Lint; Android-/iOS-Projekte
  mit demselben kompilierten Client synchronisiert.
- Beide APKs sind **debug**, mit verifizierter APK-Signatur v2: keine Produktionssignatur.
- Außerhalb des Quellbaums installiertes Wheel: Diagnosemodul, CLI und verpackte Konsole
  verifiziert. Headless-ZIPAPP mit `--help` ausgeführt.
- Auf die Diagnose beschränkte Sicherheitsprüfung: keine bestätigten
  Schwachstellen. Sie ist keine Zertifizierung des übrigen Produkts.
- Visuelle Validierung mit dem integrierten Browser durch CDP-Timeout blockiert.
  Das Verhalten des Workspace-Panels wird durch DOM-Tests geprüft,
  ohne ihnen eine visuelle Prüfung zuzuschreiben.

Späteres CAT-Inkrement: FTX-1 übernimmt die Lesevorgänge KS/KP/KR/BI, abgeglichen mit
dem Primärhandbuch, ohne Keying und ohne Schreiben von Speichern. Bestanden: 23 gezielte
Python-Tests und zehn Client-Tests zu Verbindung, Navigation und neu generierten Profilen;
Ruff, Lint/Build und Verifikation der 53 generierten Ressourcen korrekt.
Wheel und ZIPAPP führen die verpackten Decoder aus; gemeinsames Bundle identisch
in Wheel, APK und Android-/iOS-Assets, per SHA256 geprüft.

Die Pakete befinden sich in `remote-station/dist/`: Unterverzeichnisse `agent/`
und `host/`, dazu die beiden Debug-APKs. `SHA256SUMS` erlaubt die Integritätsprüfung.
Die physische USB-/RF-Abnahme, Tests auf Mobilgeräten, iOS-Kompilierung/-Signierung
und ausdrücklich ausstehende Funktionen werden von diesen Ergebnissen nicht abgedeckt.

## Erweiterung Yaesu, OpenGD77 und neue Kandidaten

- Die sieben Yaesu des Katalogs haben dokumentierte schreibgeschützte CW-Abfragen.
  FT-710, FT-991A, FTDX10, FTDX101D/MP und FTDX3000 enthalten Opt-in-Einstellungen für
  Frequenz, Betriebsart und Leistungssollwert je Modell. Korrekte ID, RX, nicht
  belegter Tuner, lokales Limit, Deduplizierung und Readback werden ohne Aktivierung von TX verifiziert.
  FTDX101MP erlaubt bis zu 200 W Sollwert; die anderen sechs erben dieses Limit nicht.
  FT-991A und FTDX3000 erfinden kein MD1: sekundäre Betriebsart null und Steuerung deaktiviert.
  [Handbücher, Seiten und Einschränkungen](../../../remote-station/docs/hardware/yaesu-cat.md).
- 13 experimentelle Profile zur
  [OpenGD77-USB-CPS-Identifikation](../../../remote-station/docs/hardware/opengd77-usb.md)
  werden in den Headless-Agenten und die gemeinsame Konsole integriert. Nur INFO, ohne Betreten/Verlassen von
  CPS, ohne Speicher zu schreiben, ohne zu senden und ohne RF-CAT abzuleiten. Unbekannte Firmware/Modelle
  werden zurückgewiesen; alte Builds ohne R9 werden nicht als kompatibel dargestellt.
  Die ursprüngliche lokale Programmierung/Anzeige des Workspace bleibt erhalten.
- [Untersuchte Xiegu und Lab599](../../../remote-station/docs/hardware/xiegu-candidates.md)
  werden als Kandidaten ohne Transport hinzugefügt: Adressen, Framing und ausstehende
  Antwortdetails werden nicht von Icom, Kenwood oder Hamlib erraten.
  Der Katalog enthält 68 Kandidaten, nicht 68 zertifizierte Funkgeräte.
- Abschlussverifikation: **223 Python-Tests**, **66 des Clients** und **44 gezielte
  Node-Tests** erfolgreich; Ruff, Lint und Build korrekt. Ein vorübergehender Abbruch
  WinError 10053 eines Rotor-Tests wurde isoliert wiederholt, und die
  anschließende vollständige Suite bestand, ohne den Controller oder die HTTP-Limits zu ändern.
- Aktualisiertes ZIPAPP und Wheel wurden außerhalb des Quellbaums ausgeführt; die beiden Debug-
  APKs verifizieren die Signatur v2. SHA256SUMS stimmt mit den vier Paketen überein. Das aktuelle
  Bundle stimmt byteweise zwischen Wheel, dediziertem APK und Android-/iOS-Assets überein.
  RadiCodex behält sein APK: Es lädt die aktuelle Oberfläche vom HTTPS-Host
  und enthält keine neue CAT-Engine in der WebView.
- Die Veröffentlichung bleibt blockiert: HTTPS hat keine Zugangsdaten, und SSH weist die
  publickey-Authentifizierung zurück. Der offizielle Schlüssel von github.com wurde in einer
  isolierten Datei verifiziert, ohne SSH-Profile zu ändern oder die Host-Prüfung zu deaktivieren.

Diese Inkremente schließen weder aktives CW, aktives WSJT-X/CAT-Broker, unabhängigen Android-
USB-OTG-Agent, iOS-/Produktionssignierung noch plattformübergreifende physische Abnahme ab.

## Sprachen der operativen Steuerelemente

Frequenz/Betriebsart und Leistung/Tuner verwenden die ES/EN/FR/PT-Auswahl des gemeinsamen
Clients, einschließlich Fehlern und Sicherheitshinweisen. Ein Sprachwechsel bewahrt
Messwerte, bearbeitete Werte, Limits und Berechtigungen; er mountet keine Steuerelemente neu und sendet keine
CAT-Anfragen. Die verlinkten technischen Referenzen behalten ihre Originalsprache.

Verifikation: **72 Client-Tests**, Lint und TypeScript/Vite korrekt;
sechs neue Fälle prüfen Sprachwechsel mit SUB ohne Betriebsart und das 200-W-Limit
des FTDX101MP, ohne Einschränkungen zu verändern. Wheel außerhalb des Quellbaums neu installiert
und dediziertes APK neu kompiliert, mit verifiziertem Lint und Debug-Signatur v2.
Das Bundle stimmt per SHA256 in Wheel, APK und Android-/iOS-Assets überein; SHA256SUMS
wird für die beiden betroffenen Pakete aktualisiert. ZIPAPP und RadiCodex-APK ändern sich nicht.
Es wird weder iOS-Kompilierung noch physische Abnahme noch Produktionssignierung zugeschrieben.

## Begrenzte WSJT-X-Befehle

Der Agent und der Host enthalten ein authentifiziertes POST für Replay und Halt Tx,
ausschließlich mit lokalem `--enable-wsjtx-safe-commands`. Die gemeinsame Konsole
Web/Android/iPhone/iPad bietet beide Aktionen in ES/EN/FR/PT an. Es gibt keinen TX-Start,
kein Reply, keinen Free Text und kein Configure; der CAT-Broker und der vollständige Digitalbetrieb
stehen weiterhin aus. Siehe [Aktivierung und UDP-Limits](../../../remote-station/docs/agente-cat-wsjtx.md).

Die [Stationsgeräte](../../../remote-station/docs/dispositivos-estacion.md)
(Digital-Loggers- und Waveshare-Modbus-Relais, DCU-1/Rotor-EZ/RT-21-Rotoren)
werden mit Bestätigung geschaltet, schalten Funkgerät/PA nie während des Sendens
und erlauben jederzeit Stopp. Signalwege und Geräte ohne öffentliches Protokoll: "pendiente de fuente".

Der erste Loopback-Ursprung von Heartbeat/Status bleibt bis zum Neustart des
Agenten fixiert. Abweichender Ursprung, abgelaufene/geschlossene Instanz, nicht
zulässige Felder und wiederholte IDs werden zurückgewiesen; Replay hat ein Limit von einer Anfrage pro Sekunde.
Dies authentifiziert den WSJT-X-Prozess nicht. Die Zustellung deklariert stets
`sent_unconfirmed` und bestätigt keinen RF-Stopp; die UI verlangt nach einem Fehler
eine neue Abfrage, ohne Wiederholungen. Physische Schutzmaßnahmen beibehalten und RX prüfen.

Verifikation: **228 Python-Tests** und **74 des Clients** korrekt,
einschließlich POST über zwei validierte TLS-Verbindungen, CORS und Zurückweisung einer Antwort,
die einen RF-Stopp bestätigen will. Ruff, Lint, TypeScript/Vite und 53 generierte
Ressourcen korrekt. Ein Timeout der Workspace-Diagnose bei der
gleichzeitigen Ausführung wurde isoliert und danach in der vollständigen Suite mit zwei
Workern wiederholt; beide bestanden, ohne diesen Test oder seine Limits zu ändern.

Wheel und ZIPAPP außerhalb des Quellbaums ausgeführt; dediziertes APK mit Build,
Lint und Debug-Signatur v2 korrekt. Bundle identisch in Wheel/APK/Android-/iOS-Assets
und SHA256SUMS aktualisiert. Auf dieses Inkrement und seine Authentifizierungs-/TLS-Helfer
beschränkte Sicherheitsprüfung: keine bestätigten Schwachstellen.
Sie zertifiziert weder das gesamte Produkt noch WSJT-X im realen Betrieb noch Hardware.

## Sprachen, ohne aktive Steuerelemente zu unterbrechen

PTT, Rotor, RX-Audio und das CAT/WSJT-X-Panel teilen sich ES/EN/FR/PT, einschließlich
Sicherheitshinweisen und lokalen Frame-Fehlern. Die Callbacks für Stopp und
Erneuerung behalten bei einem Sprachwechsel ihre Identität; durch diesen Wechsel wird weder die Lease neu gestartet,
noch START/MOVE/STOP gesendet, noch die Audiografik neu erstellt.
Die technischen Antworten des Agenten und externe Fehler behalten ihr Format/ihre Sprache.

**89 Client-Tests**, Lint und TypeScript/Vite korrekt. Die neuen Fälle
prüfen aktives PTT/Rotor mit Erneuerung und nachfolgendem Stopp, das Ausbleiben neuer
Befehle beim Sprachwechsel, die Erhaltung von AudioContext/Knoten/Anfrage,
übersetzbare Frame-Fehler ohne erneutes Öffnen des Audios und die erhaltene CAT-Auswahl.
Das vorbereitete TX-Mikrofon bewahrt beim Sprachwechsel ebenfalls Instanz und Sitzung;
Fokusverlust schließt es weiterhin und fordert RX an.
Die erste Prüfung erkannte eine verzögerte visuelle Übersetzung im Helper; Übersetzung
und Rendering wurden getrennt und der Callback stabilisiert, bevor die vollständige Suite validiert wurde.
Wheel außerhalb des Quellbaums neu installiert und dediziertes APK neu kompiliert, mit geprüftem Lint
und Debug-Signatur v2. Dasselbe Bundle erscheint in Wheel/APK/Android/iOS,
und SHA256SUMS stimmt mit den vier Paketen überein. ZIPAPP und RadiCodex-APK ändern sich nicht.
Es wird weder physische/mobile Abnahme noch iOS-Kompilierung/-Signierung zugeschrieben.
