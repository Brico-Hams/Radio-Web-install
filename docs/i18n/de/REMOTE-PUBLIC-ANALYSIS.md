# Analyse der öffentlichen Funktionen von RemoteMyShack

Übersetzung von `remote-station/docs/analisis-publico.md` (spanische Quelle maßgeblich).

## Umfang und Grenzen

Geprüft am 20. November 2026 anhand der unten verlinkten öffentlichen Seiten und
der im Kontext gelieferten Bilder. Diese Analyse hält kommerzielle Aussagen und
Funktionskategorien fest; sie untersucht nicht den Code des Dienstes, umgeht
keine Kontrollen und validiert seine Funktion nicht unabhängig. Code, Marken,
Texte, Grafiken und private Protokolle werden nicht kopiert. Die Oberfläche von
BricoHams hat eine eigene Identität und ein eigenes Design.

Die Liste des Herstellers ist keine Kompatibilitätsspezifikation für BricoHams.
Die auf der FTX-1-Seite genannte Yaesu-Beta wird dort als dokumentationsbasiert
ohne Test des Herstellers dieses Produkts bezeichnet.

## Öffentlich angekündigte Kategorien

| Kategorie | Angekündigte Beschreibung | BricoHams-Status |
|---|---|---|
| Responsive Webkonsole/PWA | Nutzung von Telefon, Tablet und Computer; Installation auf dem Startbildschirm | Umgesetzt: `remote.webmanifest`, `remoto.webmanifest`, `remote-sw.js` (nur statische Dateien, nie `/api` oder Token) und `remote-station/apps/web-console/public/sw.js` |
| CAT-Steuerung | Frequenz, VFO/Split, Bänder, Betriebsarten, Filter, RIT/XIT und DSP/Pegel je nach Funkgerät | Umgesetzt über `rigctld` in `remote-agent.cjs`; Erweiterungen je Funkgerät nur mit Quelle (`remote-catalog.cjs`) |
| Scope und Wasserfall | Scope des Funkgeräts, Einstellung und Signalauswahl zum Abstimmen | Teilweise: lokaler Wasserfall in der Konsole; kein Wasserfall beim „öffentlichen Mithören“ (pendiente de fuente) |
| Audio | Empfang mit geringer Latenz und TX-Audio von Mikrofon/Headset | Umgesetzt (RX und TX mit Lease in `remote-agent.cjs`); Gast-TX erfordert ausdrückliche Erlaubnis |
| Abstimm-Peripherie | FlexControl, CTR2-MIDI und Tastatur/Paddle laut öffentlicher Seite | Offen |
| Stationszubehör | Verstärker, Tuner, Umschalter, Relais, PDU und Rotoren | Teilweise: Rotor (`rotor.py`, Android `Rotor*`); Rest offen |
| Multi-Radio | Auswahl mehrerer Geräte pro Station | Teilweise: Radioregister, Lease/PTT je Funkgerät und `GET /api/radios` in `remote-ops.cjs`; ein Agent steuert noch ein `rigctld` |
| Rollen/Gäste | Gäste mit Rechten je Funkgerät, nur Hören oder Senden, und Limits | Im Node-Agenten umgesetzt: eigenes Token je Gast, Bänder und max. Leistung im Agenten erzwungen, Widerruf (`remote-ops.cjs`, `/api/guests`); keine Einladungs-UI und kein Python/Android |
| Logbuch und Betrieb | ADIF-Logbuch, Karten, Diplome, DX-Cluster, Alarme, TX-Verlauf | Teilweise: TX-Verlauf mit CSV (`/api/txlog.csv`); Rest offen |
| Digitale Betriebsarten | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR und RADE je nach Tarif/Produkt | Teilweise: eingeschränktes WSJT-X (siehe `REMOTE_STATION.md`); Rest offen |
| TX-Sicherheit | Freigabe bei Verbindungsverlust, Zeitlimit und Bediener-Ausschluss | Umgesetzt: 1-s-Herzschlag, Zeitlimit, SWR, ein Bediener, Freigabe bei Ausblenden/Fokusverlust/Hintergrund (Web und Android) |
| Ferngesteuertes Ein-/Ausschalten | Funkgerät ein-/ausschalten | Teilweise: FTX-1-Ausschalten `PS0` (`docs/FTX1-KNOWLEDGE.md`) mit Bestätigung im Node-Agenten; IC-705 `18 00`/`18 01` nur als getesteter Python-Builder (`icom_civ.py`), nicht verdrahtet; Rest pendiente de fuente |
| Öffentliches Mithören | Nur-Hören-Audio | Umgesetzt, standardmäßig aus, ohne Steuerung und ratenbegrenzt (`listenLive`) |
| Agent-Update | Hinweis auf neue Versionen | Umgesetzt, Opt-in: nur GitHub-Releases, Ed25519-Signatur + SHA-256, nie Installation ohne Zustimmung |
| Netzwerk | Agent mit ausgehender Verbindung, direkte verschlüsselte Verbindung oder Relay | Umgesetzt (`remote-relay.cjs`, TLS) |
| Anwendungen | Mobiles Web und Apple-TV-App nur zum Hören | Web/Android umgesetzt; Apple TV außerhalb des Umfangs |

Funkgerätevergleich: Die 44 Modelle der Liste des Dritten (geprüft am
22. November 2026: 17 Icom, 13 FlexRadio, 4 Kenwood, 7 Yaesu, 2 Elecraft und
Hermes Lite 2) sind in `data/remote-station-catalog.json` enthalten (IC-7850 und
IC-7851 teilen sich einen Eintrag). BricoHams ergänzt (tr)uSDX, QMX/QMX+ und
QCX/QDX. Fernes Ein-/Ausschalten hat nur für das Ausschalten des FTX-1 (`PS0`)
und für den IC-705 (CI-V `18 00`/`18 01`, CI-V-Handbuch des IC-705 S. 5 und
S. 18; Builder in `remote-station/bricoham_remote_station/drivers/icom_civ.py`)
eine Quelle; der Rest bleibt „pendiente de fuente“.

Die beschriebenen Fähigkeiten, Tarifstufen, Preise und Kompatibilitäten gehören
zum analysierten Produkt. Sie werden nicht als Spezifikation nachgebaut und
nicht als Funktionen von BricoHams dargestellt.

Die Liste des Dritten umfasst 44 Modelle von Icom, FlexRadio, Kenwood, Yaesu,
Elecraft und Hermes Lite. Der Eigentümer hat TRuSDX und QMX+ als BricoHams-
Kandidaten ergänzt; die Unterstützung dieser beiden wird dem Dritten nicht
zugeschrieben. Die 46 Kandidaten stehen in der
[Verbindungsmatrix](../../../remote-station/docs/radio-conexiones-candidatas.md).

## Kriterien für eine eigene Alternative

1. Beobachtbarkeit, RX-Steuerung und reproduzierbare Dokumentation priorisieren.
2. CAT-Steuerung, Audiomedien, Station und Konsole durch versionierte Verträge
   trennen.
3. Jede Familie/jedes Modell nur mit öffentlichen Referenzen und Tests umsetzen.
4. PTT/TX bis zur ausdrücklichen Freigabe und Sicherheitstests mit Hardware
   inaktiv halten.
5. Responsive Web/PWA für den Bediener priorisieren; im Agenten eine lokale
   Konfigurationsoberfläche hosten, ohne dass der Browser die Grenzen des
   Agenten umgehen kann.
6. Einen separaten nativen Android-Client verwenden, falls USB-Host/OTG ein
   Agentenweg wird; dieser Weg wird nicht für jedes Telefon vorausgesetzt.

## Primärquellen

- [RemoteMyShack: Funktionen, Sicherheit und Funkgeräte](https://www.remotemyshack.com/#pricing)
- [RemoteMyShack: öffentliche Yaesu-FTX-1-Seite](https://www.remotemyshack.com/radios/yaesu-ftx-1)
- [Hamlib: FTX-1-Backend](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1)
- [Hamlib: Versionshinweise 4.7](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Hamlib: Dokumentation von `rigctld`](https://github.com/Hamlib/Hamlib/blob/master/doc/man1/rigctld.1)
- [DL2MAN: (tr)uSDX, CAT und Streaming](https://dl2man.de/5-trusdx-details/)
- [QRP Labs: QMX+ und CAT-Handbuch](https://qrp-labs.com/qmxp.html)

Das FTX-1/SPA-1-Datenblatt hält fest, welche Belege aus Hamlib stammen und
welche Primär-/Hardwareprüfung noch aussteht.
