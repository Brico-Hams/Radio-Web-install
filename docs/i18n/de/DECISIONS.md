# Entscheidungsprotokoll (ADR)

Jede Entscheidung nennt Kontext, Beschluss, verworfene Alternativen und Folgen.

## ADR-001 · JavaScript ohne Framework und Build-Schritt

- **Kontext:** Das Werkzeug verarbeitet Binärprotokolle und muss von jedem Funkamateur geprüft werden können.
- **Entscheidung:** native JavaScript-Module, HTML und CSS, ohne React, Vue, Bundler oder Transpiler.
- **Alternativen:** React/Vite (mehr Abhängigkeiten und Lieferkettenrisiken) oder TypeScript (erfordert Kompilierung).
- **Folgen:** Der gelesene Code ist genau der ausgeführte; der Browser lädt keine `node_modules`. Dafür wird der Oberflächenzustand manuell verwaltet.

## ADR-002 · WebUSB und Web Serial für die Funkgerätekommunikation

- **Kontext:** OpenGD77 MK22/STM32 stellt CDC über USB bereit; DM-32/UV008 und Quansheng verwenden eine serielle Schnittstelle.
- **Entscheidung:** WebUSB für `1FC9:0094` und Web Serial für serielle Kabel, wie beim Referenz-Web-CPS.
- **Alternativen:** native Anwendung (Installation und Signierung je Betriebssystem) oder Electron (große Angriffsfläche).
- **Folgen:** funktioniert nur in Chrome, Edge und Brave auf dem Desktop. Unter Windows benötigt OpenGD77 USB WinUSB (siehe [Hilfe](../../../ayuda.html#drivers)).

## ADR-003 · Lokaler Node-Server mit einer einzigen Abhängigkeit

- **Kontext:** Firmwaredownloads und Anbieterdaten müssen CORS umgehen, Host-Positivlisten durchsetzen und Zugangsdaten verbergen.
- **Entscheidung:** `server.cjs` mit Node-22-Standardmodulen (`http`, `fetch`, `crypto`) und festgeschriebenem `satellite.js` 6.0.1 als einziger Abhängigkeit.
- **Alternativen:** Express/Fastify (mehr Abhängigkeiten) oder öffentlicher Proxy (legt Daten und Zugangsdaten offen).
- **Folgen:** Installation mit `npm ci --ignore-scripts` und geringeres Lieferkettenrisiko.

## ADR-004 · Nur Loopback, strikte CSP und Dateipositivliste

- **Entscheidung:** auf `127.0.0.1:8787` lauschen, `Host` prüfen, nur aufgelistete Dateien ausliefern und eine CSP ohne `unsafe-inline` senden.
- **Grund:** DNS-Rebinding, beliebige Dateizugriffe und XSS abmildern.
- **Folge:** `localhost` wird nicht bedient: GET/HEAD-Navigationen werden (307) auf `127.0.0.1` umgeleitet, um einen einzigen IndexedDB-Origin zu erhalten; mit `Origin`-Header werden sie abgewiesen. Netzwerkbetrieb würde eine Neugestaltung mit HTTPS und Authentifizierung erfordern und wird nicht unterstützt.

## ADR-005 · Verpflichtende automatische Sicherung vor dem Schreiben

- **Entscheidung:** Beim Verbinden werden Kalibrierung und Basisfirmware oder Codeplug kopiert, in IndexedDB gespeichert, mit SHA-256 gehasht und erneut gelesen. Erst dann wird eine an die Verbindung gebundene Schreibberechtigung erteilt. Jeder Fehler hält das Schreiben gesperrt (*fail-closed*).
- **Verworfene Alternative:** optionale Sicherung mit dem Risiko eines unwiederbringlichen Kalibrierungsverlusts.
- **Folgen:** Das Verbinden dauert länger (2 MiB eines Quansheng bei 38.400 Baud benötigen 10–20 Minuten), aber ohne verifizierte Sicherung wird nie geschrieben.

## ADR-006 · IndexedDB und `.rwb.json`-Export

- **Entscheidung:** IndexedDB im Browser für den Verlauf, JSON-Export mit Manifest, Base64-Inhalt und Hashes.
- **Alternativen:** Sicherungen auf dem Server speichern (würde das Versprechen „keine Uploads“ brechen) oder File System Access API (nicht in allen Browsern verfügbar).
- **Folgen:** Die Anwendung verschlüsselt Sicherungen nicht. Benutzer müssen sie exportieren und ihr Browserprofil schützen.

## ADR-007 · Nur offizielle Firmwarequellen, keine Spiegelserver

- **Entscheidung:** Der Katalog beschränkt sich auf GitHub Releases des offiziellen F4HWN-Repositorys (`armel/uv-k1-k5v3-firmware-custom`), des ARDF-Projekts für K1/K5 V3 (`reald/uv-k1-k5v3-firmware-custom`) sowie opengd77.com, mit eingeschränkten Weiterleitungen und Größenlimits. Quansheng umfasst die anerkannte stabile Versionshistorie mit veröffentlichtem SHA-256. ARDF, F4HWN vor v6 und SA818 werden nur zum Download angeboten; sie erweitern nicht die Schreibunterstützung.
- **Folgen:** Ändert ein Anbieter seine Struktur, schlägt der Download ausdrücklich fehl, statt auf ungeprüfte Quellen auszuweichen. SHA-256 erkennt Beschädigungen, belegt aber keine Echtheit.

## ADR-008 · RepeaterBook-Zugangsdaten nur auf dem Server

- **Entscheidung:** `data-service.cjs` liest `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` und `RB_APPROVED` aus Umgebungsvariablen; der Browser erhält sie nie. Nach HTTP 429 gilt eine Wartezeit, und die Quellenangabe „Data courtesy of RepeaterBook.com“ wird angezeigt.
- **Folgen:** Ohne genehmigtes Token erscheint die Funktion deaktiviert.

## ADR-009 · Lokale SGP4-Berechnung

- **Entscheidung:** TLEs kommen von SatNOGS/CelesTrak; die Bahnberechnung erfolgt im Browser mit `satellite.js`. Die Benutzerposition verlässt den Rechner nicht.
- **Validierung:** Tests verwenden einen unabhängigen Vallado-Testvektor.

## ADR-010 · Tests mit `node:test` und simulierten Geräten

- **Entscheidung:** Nodes nativen Testläufer verwenden, ohne Jest oder Mocha. Funkgeräte, Netzwerk und Server werden simuliert; Tests schreiben nie auf Hardware und verwenden keine echten Zugangsdaten.

## ADR-011 · Lizenz GPL-3.0-or-later

- **Kontext:** Interoperabilitätsreferenzen verwenden Apache-2.0 (F4HWN, egzumer, DualTachyon), MIT (satellite.js) und GPL-2.0 (OpenGD77).
- **Entscheidung:** GPL-3.0-or-later, eine Copyleft-Lizenz, die Verbesserungen frei hält und mit Apache-2.0- und MIT-Abhängigkeiten kompatibel ist.
- **Hinweis:** Es wird kein Code von OpenGD77 oder den anderen Referenzen verteilt; die Implementierung ist unabhängig. Der Rechteinhaber kann die Lizenz ändern, bevor Beiträge Dritter eingehen.

## ADR-012 · Bricohams-Marke mit eigenen Ressourcen

- **Entscheidung:** Name „Bricohams Radio Workspace“ und ursprüngliches Bricohams-Studio-PNG, ohne Neuzeichnen oder Umfärben und mit unverändertem Seitenverhältnis. Die Oberfläche behält ihre eigene dunkle Palette. Am 2026-10-21 wurde das SVG-Symbol eines „B“ ersetzt, das nicht der Markenidentität entsprach. Herkunft und Hash in [BRANDING.md](BRANDING.md).
- **Folge:** Keine Logos von OpenGD77, Quansheng oder F4HWN; auf die fehlende Zugehörigkeit wird hingewiesen.

## ADR-013 · Statische Webanwendung auf eigenem Origin

- **Kontext:** Nutzung ohne Installation ist erwünscht, aber IndexedDB und `localStorage` sind nach Origin isoliert, und Funkgerätesicherungen sind sensible Daten.
- **Entscheidung:** Statische Website auf GitHub Pages im Stamm einer eigenen Organisation oder eines eigenen Kontos (`https://<org>.github.io/`), nicht in einem Unterpfad von `bricohams.github.io` (wo Bricohams Studio liegt). Die Anwendung erkennt den Modus über `runtime.json` (Webmodus bei fehlender Datei), nutzt nur relative Pfade und deklariert die CSP in `<meta>`. Satellitendaten werden täglich durch einen Workflow erzeugt. Funktionen mit Server- oder Zugangsdatenbedarf (RepeaterBook, Firmwaredownload, RadioID-API) werden durch manuelles Laden ersetzt oder bleiben lokal.
- **Verworfene Alternativen:** Unterpfad von `bricohams.github.io` (teilt Origin und Speicher mit anderen Projekten); öffentlicher Proxy (Daten und Zugangsdaten würden über Dritte laufen); RadioID replizieren (Umfang und Lizenz).
- **Folgen:** Die Webversion bietet weniger Funktionen als die lokale Version; der Autor muss Konto oder Organisation erstellen und Pages konfigurieren. Installierbare Pakete folgen demnächst.

## ADR-014 · Veröffentlichung auf gemeinsamem Origin akzeptiert

- **Kontext:** Der Autor entschied sich für `https://anatolbricoham.github.io/Radio-Web-install/`, ohne ein eigenes Konto anzulegen.
- **Entscheidung:** Bereitstellung außerhalb von `<org>/<org>.github.io` nur zulassen, wenn die Repositoryvariable `PAGES_SHARED_ORIGIN_ACCEPTED=true` existiert. Ersetzt ADR-013 teilweise.
- **Akzeptiertes Risiko:** `anatolbricoham.github.io` teilt den Origin mit anderen Projektseiten dieses Kontos (etwa `Ham-Clock`, `antenaSatCommrotor`, `Fox_Hunt_Beacon`). Jede davon könnte nach einer Änderung die gespeicherten Funkgerätesicherungen und das Profil lesen. Empfehlung: `.rwb.json`-Sicherungen exportieren und sich nicht auf den Browserspeicher verlassen.
- **Ausstieg:** Eigenes Konto oder eigene Organisation erstellen, die Website in deren Stamm verschieben und die Variable löschen.

### Aktualisierung der Herkunft, 26-10-2026

Das aktuelle Repository ist `Brico-Hams/Radio-Web-install`, die dokumentierte
Pages-URL lautet `https://brico-hams.github.io/Radio-Web-install/`. Die früheren
`anatolbricoham`-Adressen sind historischer Kontext zu ADR-014, nicht die
aktuelle URL für Bereitstellung oder Datenabruf. Die Ausnahme bleibt ein
gemeinsamer Origin: Alle Projekte von `brico-hams.github.io` teilen ihn,
nicht nur dieser Unterpfad. Benutzer-IndexedDB wurde nicht automatisch migriert.
