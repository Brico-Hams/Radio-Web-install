<img src="bricohams-logo.png" alt="Bricohams" width="240" height="89">

<p><a href="README.md">Spanisch</a> · <a href="README.en.md">Englisch (US)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italienisch</a> · <a href="README.fr.md">Französisch</a></p>

# Bricohams Radio-Arbeitsbereich

Zwei Bereiche mit jeweils eigenen Anschlüssen WebUSB/Web Serial, lokale Vorgänge und automatische Sicherung, bevor Schreibvorgänge zugelassen werden.

## Quansheng: Vorkompilierter Katalog, Viewer und RF-Protokoll

- Neun Images v6.1.0, die über das Web bereitgestellt werden: Bricohams ARDF, Satellite,
Spectrum, Labs und Fusion, sowie F4HWN die offiziellen Fusion, FieldOps, Transfer und Labs.
Es ist keine Kompilierung oder Ordnerauswahl erforderlich. Vor der Vorbereitung eines slot werden SHA-256, Größe
und Struktur überprüft; für die Installation ist weiterhin eine Sicherung erforderlich.
- LCD-Anzeige zu Beginn, automatischer Start beim Anschließen, Pause vor
jedem Vorgang und Erfassung PNG. Der Anschluss wird gemeinsam genutzt, ohne dass zwei Lesegeräte erforderlich sind.
- Fernbedienung (kurzer/langer Tastendruck), ohne PTT, mit vollständiger Sicherung,
manueller Freigabe und Bestätigung per Tastendruck. F1/F2 können je nach Funkgerät Sende-Funktionen ausführen; 
das Senden UART entspricht nicht einer bestätigten Ausführung.- Nativer Neustart mit expliziter Bestätigung, ohne erneute Versuche oder Änderung von slot; 
schließt den Port und entzieht Berechtigungen. Startvorgang manuell überprüfen.
- RF-Protokoll v2 am Ende, inklusive Historie und sicherem Export CSV. Nur Daten,
die von der Firmware empfangen wurden; keine erfundenen UTC-Zeitstempel oder kalibrierten Messwerte.
- Katalog mit sechs „Labs“-Apps (Upstream v6.1.0), mit verifizierten SHA-256,
FAP1 sowie ABI/API: Vorbereitung oder Download führen weder zu einer Installation noch zur Ausführung. 
Enthält SystemInfo, BroadcastFM und vier Spiele/Demos; keine Beacons oder Notfall-Apps.
- Native Wartungsfunktionen: Logo-Verwaltung (PNG/BIN), Backup/Restore der Kalibrierung
und externer Flash, inklusive Rücklesen und Schutz des Kalibrierungssektors.
- Nativer Werks-Assistent in zwei Schritten: Verifizierte Stock-Flash und DFU-Modus
(modellabhängig), mit vollständigem Backup und ausdrücklichen Bestätigungen. Die Stock-Images
werden über festgelegte offizielle Links bezogen und mittels SHA-256. validiert.
In der Simulation getestet; keine tatsächliche Wiederherstellung des physischen Geräts durchgeführt.
- Eigene Toolbox mit internem Zugriff; keine Auslagerung von Vorgängen an externe Prozesse.a UV Studio: Haupt-DFU v6/v7, Wartung, Apps, Slots und HF.
- Haupt-DFU PY32: BIN v6 oder Paket v7 FWAT/FWA1, mit Backup und zwei
Bestätigungen. Keine Synchronisierung externer Main-Daten und keine Zertifizierung des Startvorgangs.
- Externe Ressourcen v7:, CRC und Build ID müssen mit der aktiven
Firmware übereinstimmen; Header am Ende sowie Validierung der Firmware. Die Installation erfolgt separat
nach der DFU und der Erstellung eines neuen Backups. Unterstützung in der Simulation verifiziert.
- Lokale HF-Filter (nach Name/Frequenz/Ereignis) und Export CSV/JSON;
keine künstliche Generierung von UTC-Zeitstempeln für Ereignisse; keine kalibrierten HF-Messungen.
- Die vier Slots Bricohams der Testeinheit wurden am
26-10-2026 aufgezeichnet, inklusive CRC und Erhalt von Main/Konfiguration/Kalibrierung. 
Der Startvorgang sowie manuelle Funktionstests durch slot stehen noch aus. 
Der Viewer empfing 24 LCD-Frames sowie einen HF-Datensatz über COM4 bei aktivem DTR-Signal; 
gespeicherte HF-Historien wurden nicht empfangen.

Katalog und Lizenzen unter `precompiled/`; Neu-Generierung durch den Wartungsverantwortlichen:
`npm run publish:firmware`. Erfordert die fünf festgelegten lokalen Kompilate.und Zugang zur offiziellen Veröffentlichung ist keine Anforderung für den Endbenutzer. Anweisungen und Grenzen in [Hilfe Quansheng](docs/i18n/de/AYUDA-QUANSHENG.md).

## AnyTone Beta: Web-Vorbereitung

Der neue [Abschnitt AnyTone](anytone.html) bereitet ein **tragbares Projekt** vor, kein proprietäres RDT oder ein CSV zertifiziertes CPS für eine bestimmte Version. Es implementiert keine Programmierung USB und ändert das Funkgerät nicht. 
- Grundlage: dieselben 16 Kanäle PMR446 wie bei den anderen Familien, nur RX. - Importiert OpenGD77 Standard-Binärdateien von 128 KiB und Konfigurationen Quansheng   F4HWN v6. Beibehaltung der nominalen RX/TX; CC/TS und der TG des bekannten Gruppen-Contacts   in OpenGD77. Überspringt Modi Quansheng nicht FM, verwechselt AM nicht mit DMR. - Importiert JSON RepeaterBook autorisiert, verwendet den bestehenden Normalisierer wieder
für FM/DMR und filtert Spanien. Es gibt keine überprüfte nationale Liste inklusive. TS/TG, die nicht veröffentlicht sind, bleiben ausstehend: werden niemals nach Frequenz abgeleitet. - Unterstützt auch die Registrierung RadioID `rptrs`: Spanien, Status ACTIVE,Verschiebung und gültige CC. Verwende veröffentlichte TS/TG; wenn nur TS veröffentlicht werden, bleibt TG0 ausstehend. ACTIVE ist ein Registrierungsstatus, kein RF-Beweis. - Unterstützt die Auflistung JSON URE `items` von Repeatern (keine Beacons): wandelt nur FM-Modus und Frequenzen/Verschiebungen mit expliziten Einheiten um. Behalte den veröffentlichten Subton als Notiz bei, ohne ihn zu aktivieren. URE weist darauf hin, dass die Liste veraltete Daten enthalten kann; mit dem Eigentümer überprüfen. - Bearbeitet und löscht Kanäle, organisiert Zonenlabels und exportiert JSON wieder öffnbar und CSV zum Austausch. Alle Kanäle sind für TX gesperrt. - Die Profile D868/D878/D578 sind Gruppierungen zur Datenvorbereitung, keine Zertifizierung von Varianten oder Grenzen. Luft-AM wird nur mit dem Profil 'Andere' und manueller Bestätigung der AM-Unterstützung im genauen Funkgerät aktiviert.

- Flughäfen: JSON `{"results":[{"name":"SERVICIO","frequencyMHz":"123.45000",
  "source":"Referencia AIP vigente"}]}`. Das Beispiel dient nur als Format, keine 
  Flughafen-Zuweisung. Verwende RF-Frequenzen, keine Kanalbezeichner 8.33,
und vergleiche jeden Dienst mit [AIP ENAIRE](https://aip.enaire.es/).
- Exportiere vor dem Verlassen; es gibt kein automatisches Speichern. Veröffentliche keine Projekte
aus deiner Einheit. Töne, private Kontakte/RX-Listen, DMR-ID, modellabhängige Grenzen
und proprietäre Einstellungen müssen im richtigen CPS überprüft werden.

Um einen nativen nationalen Codeplug zu erstellen, fehlen das genaue Modell/Firmware und
autorisierte aktuelle Quellen für Repeater und Flughäfen. Frequenzen werden nicht erfunden und eine leere Repeaterabdeckung wird nicht als vollständig deklariert.

## Eigene Firmware: Images ARDF, Satelliten und Beta-Spektrum

Der Builder unterstützt `--module ardf`, um einen eigenen Zyklus-Kern und
einen residenten Fox Hunt Tastatur/Display-Adapter über F4HWN v6.1.0
Multiboot einzubinden. Das neue Image ARDF zeichnet manuelle Beobachtungen mit 8 auf
(Zähler, erster/letzter relativer Moment und Dämpfung pro Beacon) und ermöglicht  
das Abfragen/Exportieren von JSON nach USB/UART über das Web, ohne GPS oder automatische Ortung. Speichert die letzte Sitzung im RAM beim Schließen; wird beim Neustart oder bei der Neukonfiguration gelöscht. Ein zweites Bild, `--module satellite`, wendet manuelles Doppler annur RX, mit einstellbarer Radialgeschwindigkeit, Frequenzkorrigiertem Display und Ausgang über den RF-Upstream-Restaurationsfluss. TLE/SGP4 oder autonome Orbitverfolgung sind nicht enthalten. Das neue Satellitenbild enthält CAT eigenen experimentellen RX, aktiviert mit 8 in SAT RX, mit einer 3 Sekunden Lease und einem Webpanel für Abfrage/temporäres Tuning. TX wird nicht gesteuert und es werden keine Kanäle, Töne oder Leistungen verändert. Das Radio berechnet Orbitbahnen nicht selbst. Der Browser ermöglicht jetzt RX-Tracking des ausgewählten Durchgangs mit SGP4 und Erneuerung CAT, mit manueller Pausenfunktion/beim Verstecken der Seite und am Ende des Durchgangs. Physische Aktivierung ist erforderlich und mit simuliertem Transport, nicht in RF, getestet. Zukünftige Durchgänge werden nicht automatisch gestartet und TLEs werden nicht im MCU geladen. Der Builder verlangt separate Bilder. Es ist weder Karina noch gleichwertig mit 100 %. Die aktuellen Bilder messen
113960 Bytes (ARDF mit Statistiken) und 113868 Bytes (Satelliten mit CAT);
beide wurden in Slots geschrieben und per CRC überprüft, manueller Start ausstehend;
acht native C-Suiten prüfen die Kerne und Adapter mit simuliertem RF.Das dritte Bild, `--module spectrum`, verbindet den eigenen Kern mit dem Empfänger und Display: 128 RSSI-Punkte, Peak-Hold, Durchschnitt, Pause und acht RAM-Presets. Die Presets überleben nicht das Ausschalten/Verlassen und schreiben EEPROM nicht. PTT erfasst den stärksten gemessenen Punkt in einer eigenen VFO-PRO RX Ansicht, mit Schrittweise Abstimmung, direktem RX-Eingang, Audio und RX-Verstärkungsanpassung; es sendet nicht und bearbeitet keine Kalibrierung. Ermöglicht das Zentrieren neuer Fenster und das zirkuläre Durchlaufen der RAM-Presets, mit bis zu 16 genauen Ausschlüssen pro Sitzung und optionaler CTCSS/DCS Suche bei FM-Erfassung, ohne Töne zu speichern. Das vorcompilierte Bild mit Bootlogo und Preset-Transfer misst 118040 Bytes. Ermöglicht das Speichern der Presets in lokalen BHSP-Dateien und deren Wiederherstellung in den RAM mit pausiertem Scan, atomarer Validierung und erneuter Lektüre; schreibt EEPROM nicht. Die tatsächliche Erkennung folgt.
noch zu bestätigen. Die neuen Builds enthalten eine Beta-Begrüßung und ein einfarbiges Logo, das im LOGO-Modus eingebettet ist, ohne das externe Logo zu überschreiben oder die Einschaltpräferenzen zu ändern. Siehe [Bau, Steuerungen, Lizenzen und Grenzen](docs/i18n/de/BRICOHAMS-FIRMWARE.md#neuer-eigenständiger-ardf-kern).**BETA - in Validierung und Tests.** Der **PRO-Modus**, der ausdrücklich für diese Sitzung aktiviert wurde, vermeidet wiederholte Bestätigungen beim Drücken von Operationen, entfernt aber nicht die Berechtigungen USB, vollständige Sicherung, Hardware-/Firmware-Prüfungen, Hashes, CRC, erneutes Lesen oder Schutz von Main. Er ermöglicht auch keine Schreibvorgänge mit Teilkopien.
**Echter Test UV-K5 V3 (angemeldetes Modell), F4HWN v6.0.0:** Identifikation, Kalibrierung, Konfiguration mit 200 Kanälen und Abfrage von fünf korrekten Slots in COM4; Kalibrierung/Konfiguration stimmen bei zwei unabhängigen Messungen überein. Der Befehl für die physische Flash reagiert in v6.0. nicht. Das automatische Backup dieser Version wurde korrigiert, um den Nur-Lese-Zugriff zu erhalten und eine Teilkopie zu speichern, statt die Verbindung zu deaktivieren, weil ein nicht vorhandener Befehl ausgeführt wurde. Es wurden keine physischen Daten geschrieben/gelöscht. Details und Verfahren in [Hilfe Quansheng](docs/i18n/de/AYUDA-QUANSHENG.md).

## Dokumentation

[Vollständiger Dokumentations- und Referenzindex nach Sprache](ayuda-referencias.de.html).

### Android Bricohams Beta

Die native APK 0.8.3-beta enthält bearbeitbare lokale Kontakte mit Suche und ADIF-Import mit Vorschau, ADIF/JSON-Export, ARDF-Sitzungen mit Verlauf, Statistiken, gefilterten GPS-Segmenten und einzelnen GPS-Beobachtungen sowie experimentelles Morse-Decoding aus Text und PCM-WAV. Sie bietet temporäres RX-CAT über USB CDC ACM und erkannte CH34x/CP210x/FTDI/Prolific-Adapter. SGP4-Überflüge werden offline aus importierten TLE berechnet; der ausgewählte Überflug unterstützt RX-Doppler-Nachführung. Das Mikrofon wird bis zu 60 s im Vordergrund aufgenommen, um anschließend Morse oder Robot36 zu decodieren; keine kontinuierliche Decodierung. F4HWN-v6-Kanäle lassen sich mit vollständig geprüfter Sicherung und Rücklesen bearbeiten; kein LoTW-Upload. Experimentelles Robot36-SSTV wird aus WAV decodiert und als PNG exportiert. Android 8.0+; Host-Tests ersetzen keine Tests auf dem Telefon. Siehe [Funktionen, Berechtigungen, Kompilierung und Grenzen](docs/i18n/de/ANDROID.md).

VersionCode 12 bewahrt die 0.8.0-Logbücher (Allgemein/POTA/SOTA), Schnelleingabe, Duplikatbestätigung, Satellitenauswahl, Polarradar, Offline-Weltkarte, WAV-Überflugaufnahme und SSTV-Bildsuche. Optionale CelesTrak-/SatNOGS-Aktualisierungen erfolgen beim Öffnen, alle 24 h. Die Karte erscheint ohne GPS-Berechtigung oder Beobachter; Überflüge benötigen den gespeicherten Standort. Gültige gespeicherte TLE funktionieren offline; die Auswahl bleibt erhalten. Bedienelemente und Validierung sind übersetzt. Host-Tests, Lint und APK 0.8.3 wurden in CI mit JDK 17/SDK 35 geprüft; Installation und Berechtigungen auf einem echten Telefon sind noch offen.

| Dokument | Inhalt |
| --- | --- |

| [Lieferstatus](docs/i18n/de/ESTADO-ENTREGA.md) | Überprüfung aller Anfragen, Belege, offenen Punkte und Veröffentlichungs- und Exportbedingungen |
| [Hilfe und Support](ayuda.de.html) (in der App: <http://127.0.0.1:8787/ayuda.html>) | Erste Schritte, Treiber USB (inoffizieller Support), häufige Fehler und FAQs |
| [Komplette Firmware-Bibliothek](ayuda-firmwares.de.html) / [Markdown-Index](docs/i18n/de/AYUDA-FIRMWARES.md) | Anleitungen nach Familie, Modell, Revision und Version: F4HWN, ARDF, Karina, Bricohams und OpenGD77; Menüs, FM/DMR-Konfiguration und alle Optionen des Katalogs mit ON/OFF-Matrix. Inklusive offline in Installern und lokalem Server. Regenerieren mit `npm run build:help`. |
| [Quansheng von 0 bis 100 %](docs/i18n/de/AYUDA-QUANSHENG.md#inbetriebnahme-von-0-bis-100-) | Vollständiger Ablauf nach Phasen: identifizieren, Sicherungen, Firmware auswählen und flashen, Grundeinstellungen, Kanäle, Scannen, multiboot, Überprüfung und Wiederherstellung |
| [Technisches Atlas UV-K5 V3 / UV-K1](docs/i18n/de/ATLAS-UV-K5-V3.md) (Web: [ayuda-atlas-uv-k5-v3.html](ayuda-atlas-uv-k5-v3.de.html)) | Hardware innen: Pinout von PY32F071, flash intern und extern, Karten EEPROM, serielles Protokoll, Bootloader DFU, SWD, Kompilierung, Mods, Schaltpläne, Teardown-Fotos und verifizierte Repositories |
| [Baofeng DM-32UV](docs/i18n/de/DM32UV-FIRMWARE.md) (Web: [ayuda-dm32uv.html](ayuda-dm32uv.de.html)) | Hardware HR_C7000/FD6818, Status und Lizenz von OpenGD77 auf dem DM-32, Installation und Kopien, wie man die Open-Source-Firmware RadioFoundry kompiliert und Bootloader-Protokoll |

| [Karina](docs/i18n/de/KARINA.md) / [Community-Repositories](docs/i18n/de/ENLACES-COMUNIDAD.md) | Suche nach dem Quellcode von Karina (geschlossen), funktionale Spezifikation, um ihn neu zu implementieren, und überprüfter Katalog der Repositories Quansheng und DM-32UV |
| [Beispiele](docs/i18n/de/EJEMPLOS.md) / [Drittanbieter-Hashes](docs/i18n/de/BINARIOS-TERCEROS.md) | `examples/`: offene Firmwares (F4HWN v6.3.0, Moto) mit ihrer Lizenz, Kanäle PMR446 und Analysseskripte; Index von SHA-256 und Ursprung der Drittanbieter-Binärdateien, die nicht weiterverteilt werden |
| [docs/ARCHITECTURE.md](docs/i18n/de/ARCHITECTURE.md) | Komponenten, Datenfluss, Module und Sicherheitsschichten |
| [docs/DECISIONS.md](docs/i18n/de/DECISIONS.md) | Architekturentscheidungen und warum jede Technologie gewählt wurde |
| [docs/DEPLOYMENT.md](docs/i18n/de/DEPLOYMENT.md) | Installation, Konfiguration, Updates und nicht unterstützte Deployments |
| [docs/BRANDING.md](docs/i18n/de/BRANDING.md) | Marke Bricohams: Logo, Farbpalette, Typografie und Ton |

| [AUTHORS.md](AUTHORS.de.md) | Autoren |
| [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.de.md) | Danksagungen, Quellen und Lizenzen von Dritten |
| [SUPPORT.md](SUPPORT.de.md) / [SECURITY.md](SECURITY.de.md) | Unterstützung und privater Bericht von Sicherheitslücken |

## Start

### Anbieter in der installierten Version

- **Repeater > API konfigurieren RepeaterBook**: Token eingeben `rbuapp_`,
  genehmigten User-Agent mit Kontakt bereitstellen und die Genehmigung bestätigen. Gilt nur für
  den Speicher des Servers bis zum Neustart. Das Token wird weder zurückgegeben noch
  im Browser gespeichert. Bestehende Umgebungsvariablen bleiben ein anderer Weg für persistente Konfiguration. Setze niemals Tokens in URLs.
- **DMR-Kontakte > Automatischer DMR-Download**: lädt und importiert in den geöffneten lokalen Codeplug
  einen RadioID-Block von 1-10 Seiten, begrenzt auf 1024 Kontakte.
  Passe Land/Region an, um die Kapazität nicht zu überschreiten; wenn eine Seite fehlschlägt, wird sie nicht weiter...

 importiert teilweise. Es ist keine große Basis von Rufzeichen.
- **Räume/Gruppen BrandMeister**: schau dir die öffentliche Liste nach TG-Präfix an
 (`214` für Spanien). Werden als Gruppenanrufe importiert, nicht als private Kontakte,
 mit Name `TG` plus Nummer. Aktiviert keine Hotspot-Abonnements.
 weist keine Gruppen Kanälen zu. Es integriert weder DMR+/TGIF noch Chaträume anderer Netzwerke.
- **Quansheng > SAT / Durchgänge**: aktualisiert TLE, fragt eine FM-Frequenz ab,
  berechnet den Durchgang und bereitet Doppler-Speicher vor. Wählt eine FM-Vorlage
  aus der eingelesenen Konfiguration und drückt **SAT / vorbereitete Doppler in
  Konfiguration Quansheng laden**. Das sind gestufte RX-Speicher, lädt keine native Umlaufbahn
  noch steuert das Doppler-Modul der Firmware. Speichert die Binärdatei;
  zum Schreiben ist weiterhin ein vollständiges Backup erforderlich.

Automatisch bedeutet, das Batch beim Drücken auszuführen, keine stillen Downloads beim Start
  oder periodische Synchronisation. RadioID und die authentifizierte API RepeaterBook
  benötigen den installierten Server. BrandMeister unterstützt auch direkte Abfragen
  in Pages; RepeaterBook erlaubt das Importieren von JSON autorisiert ohne Installation.
Erfordert Node.js 22+.. Die einzige Laufzeitabhängigkeit ist `satellite.js` 6.0.1 (MIT), für die Orbitale Ausbreitung SGP4; wird vom Rechner bereitgestellt, nicht von einem CDN. In einer neuen Kopie des Repositories:

```powershell
npm ci --ignore-scripts
npm start
```

Öffne <http://127.0.0.1:8787>. Verwende immer dieselbe Quelle, um den Verlauf IndexedDB zu behalten. Chrome oder Edge vom Desktop empfohlen. Das Öffnen der HTML als Dateien ermöglicht das Nachschlagen der Anleitungen, aber Speicherung und APIs können je nach Browser variieren. Der automatische Firmware-Download benötigt diesen lokalen Node-Server; bei einem statischen Hosting wird der Webmodus verwendet (siehe unten). Der Server lehnt andere Hosts/Quellen ab: um ihn zu veröffentlichen, muss die HTTPS-Bereitstellung und ihre Zugriffskontrollen bewusst angepasst werden.

## Webmodus (GitHub Pages) und lokaler Modus

Die gleiche Anwendung kann auf zwei Arten genutzt werden. Beim Start liest sie `runtime.json`: fehlt sie oder ist ungültig, funktioniert sie im **Webmodus**; der lokale Server liefert sie mit `{"mode":"local"}`. Das obere Badge zeigt «Web · GitHub Pages» oder «Lokal · installiert».

| Funktion | Web (statische Seite) | Lokal (`npm start`) |
| --- | --- | --- |
| Verbindung zum Radio, Teilkopien, Offline-Bearbeitung | Ja; OpenGD77 blockiert nachfolgende Prozesse ohne vollständige Firmware-Kopie | Gleich |
| Firmware F4HWN | Katalog von `api.github.com`; lade die Datei von der offiziellen Quelle herunter und lade sie hoch: Größe und SHA-256 veröffentlicht | Download vom Server überprüft |
| Firmware OpenGD77 | ZIP manuell hochgeladen (Name und ZIP-Format überprüft; der Herausgeber veröffentlicht keinen Hash, SHA-256 nur lokal) | Download über den Server |
| Kontakte RadioID | Uploads `user.csv` von radioid.net (max. 100 MiB, Filter nach Land/Region, max. 5000 angezeigt) | Abfrage über die API durch den Server |
| Profil (Rufzeichen + DMR-ID) | Optional, nur in deinem Browser; markiere „(du)“ | Nicht zutreffend |


| RepeaterBook | Autorisierter Import von JSON; keine authentifizierte Abfrage | Ja, mit deinem genehmigten Token |
| Gruppen BrandMeister | Direkte Abfrage nach Präfix und Import in die lokale Datei | Abfrage über Server |
| Satelliten | `data/satellites.json` täglich erzeugt ab SatNOGS | Live TLE |

Satellitendaten decken NORAD 25544, 27607, 43017 und 43678 ab (SatNOGS DB / Libre Space Foundation, CC BY-SA 4.0); es wird gewarnt, wenn sie älter als 7 Tage sind. Um deine eigene Kopie auf GitHub Pages zu veröffentlichen, siehe [docs/DEPLOYMENT.md](docs/i18n/de/DEPLOYMENT.md).

**CPS Überprüfung OpenGD77:** Es gibt eine sichtbare Matrix von Fähigkeiten und Grenzen auf ihrer Seite. Eine vollständige Parität oder automatische vollständige Kopie der MCU-Firmware wird nicht behauptet. Das Anschließen startet automatisch die Kalibrierung und den Codeplug, speichert die Kopie und ihre Hashes und öffnet den Codeplug für die Offline-Bearbeitung. Solange die originale Firmware fehlt, werden nachfolgende Radiooperationen blockiert, einschließlich neuer Lese- und Aufnahmeversuche, auch in PRO. Ein heruntergeladenes offizielles Image dient nicht als Backup für die Einheit und stellt die bereits ersetzte kommerzielle Firmware nicht wieder her.

Siehe [Web-Reichweite und obligatorische Sicherung](docs/i18n/de/AYUDA-OPENGD77.md).

### Lokale Installer

Lade die [neueste Version](https://github.com/Brico-Hams/Radio-Web-install/releases/latest) und die Datei `SHA256SUMS` herunter. Wähle einen Installer unter **Assets**, nicht die automatisch erzeugten ZIP-/tar.gz-Archive unter «Source code». Siehe die [vollständige Anleitung zur lokalen Installation](docs/i18n/de/DEPLOYMENT.md#lokale-installationspakete).

Um nach der Installation ein Quansheng vorzubereiten, folge der [Anleitung von 0 bis 100 %](docs/i18n/de/AYUDA-QUANSHENG.md#inbetriebnahme-von-0-bis-100-) und lies den [Technik-Atlas UV-K5 V3](docs/i18n/de/ATLAS-UV-K5-V3.md).
- Windows 11 x64: entpacke alles `*-windows-x64.zip`, öffne PowerShell in diesem Ordner und führe `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1` aus. Node.js inklusive, ohne Administratorrechte; starte die App über das Startmenü. - Debian, Ubuntu und Raspberry Pi OS: siehe `dpkg --print-architecture`, lade **nur** das `.deb` für deine Architektur (amd64, arm64 oder armhf) herunter und führe `sudo apt install ./nombre-del-paquete.deb` aus. Node.js inklusive; armhf erfordert CPU ARMv7 oder neuer. Öffne die App über das Menü oder führe `bricohams-radio` aus. - Arch Linux: installiere `base-devel` und `nodejs` mit pacman, entpacke `*-arch.tar.gz`, überprüfe `PKGBUILD` und führe `makepkg -si` als normaler Benutzer aus. Starte mit `bricohams-radio`.
- FreeBSD 14 amd64: extrahiere `*-freebsd-amd64.tar.gz`, gehe in den Ordner und führe `su -c './install.sh'` aus (installiere Node 22 mit `pkg`, falls es fehlt). Starte mit `bricohams-radio` als normaler Benutzer.Alle Installer beinhalten **Bricohams Quansheng Studio** (UV-K1 / UV-K5 V3 mit F4HWN Fusion 6), aus dem Repository [Brico-Hams/Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio). Es wird in <http://127.0.0.1:8787/studio.html> oder vom Bereich Quansheng geöffnet. Die Kopie wird beim Packen heruntergeladen, im Commit und mit dem SHA-256 festgelegt auf `studio.lock.json`, und der Server prüft sie erneut, bevor er sie ausliefert. Sie wird mit einer eigenen CSP ausgeliefert, die nur ihre Skripte per Hash zulässt und den Netzwerkzugang blockiert. Vom Quellcode aus wird `npm run fetch:studio` einmal ausgeführt. Im Web-Modus führt der Link zur [öffentlichen Studio-Seite](https://brico-hams.github.io/Bricohams-Studio/).Überprüfe das SHA-256, bevor du es installierst. Die Launcher öffnen den Standardbrowser und lassen den Server nur in `127.0.0.1:8787` im Hintergrund laufen. Wenn dein Standardbrowser nicht unterstützt wird, öffne diese Adresse in Chrome, Edge oder Brave. Das Schließen des Tabs stoppt den Server nicht; es gibt keinen automatischen Start nach einem Neustart des Computers. Verwende immer denselben Browser, dasselbe Profil und denselben Ursprung, um deine Kopien zu behalten. Die Treiber USB werden separat konfiguriert: [Hilfe](ayuda.de.html#drivers). In FreeBSD ist der Support WebUSB/Web Serial für Chromium nicht garantiert.

## Echter Support-Status

| Familie | Tatsächliches Lesen | Änderungen | Grenzen |
| --- | --- | --- | --- |

| OpenGD77 MK22 | Identifikation, Kalibrierung 4096 B, Standard-Codeplug 128 KiB | CPS-Schreibimplementierung enthalten, **durch Backup-Richtlinie gesperrt** | Es gibt hier kein überprüftes Protokoll, um die komplette MCU-Firmware zu extrahieren. Diese Kopie wird nicht simuliert und auch nicht mit heruntergeladener Firmware entsperrt. |
| OpenGD77 STM32 | Identifikation, Kalibrierung 512 B, Standard-Codeplug 128 KiB | Gleich: Schreibgeschützt | Normalmodus CDC OpenGD77, kein DFU. Unbekannte Strukturen werden abgelehnt. |
| DM-32 / UV008 mit OpenGD77 | Dieselben Operationen bei 115200 Baud mit Web Serial | Gleich: Schreibgeschützt | Kein Boot-ROM, Mikrocode oder Flashen der Stock-Firmware. |
| Quansheng UV-K1 / UV-K5 V3 PY32F071 mit F4HWN v6+ | Identifikation, Kalibrierung 512 B, Slot-Abfrage und CRC | Slots installieren/löschen 1-4 und Bänke zurücksetzen 1-4, **nur nach vollständig überprüfter Sicherung** | Die physische Sicherung Flash erfordert Labs v6.1+ mit Befehlen 0x0738. In anderen Ausgaben wird die Kalibrierung beibehalten und Schreibvorgänge werden blockiert, wenn sie nicht abgeschlossen werden kann. |Es gibt keine vollständige Parität mit grid.radio oder UV Studio. Viewer, Tastatur und Neustart Quansheng, Kalibrierungswiederherstellung/Flash, DFU-Stock, Haupt-DFU und externe Ressourcen haben eine eigenständige native Implementierung. DFU-Stock ist auf Hashes/Modelle festgelegt; der Haupt-DFU überprüft BIN v6 PY32 oder Paket v7 FWAT/FWA1 und synchronisiert Main nicht extern. Ressourcen v7 werden separat mit neuer Sicherung und passendem Build ID installiert; es gibt keine automatische Installation oder Unterstützung für Ressourcen in inaktiven Slots. Apps Labs ermöglicht Katalogisierung, Export, Installation, Verschieben in einen freien Slot und individuelles/ globales Löschen mit Überprüfung. Apps werden nicht automatisch ausgeführt, und es werden keine Konten oder Zonenedition implementiert. Die Dateiverwaltung `.app` wird weiter unten beschrieben. Firmware ändern in Multiboot oder SetCfg auswählen erfolgt direkt auf dem Radio; es gibt keinen Befehl re
erfundene moto. Die Lizenzen von Drittanbieter-Binärdateien bleiben bestehen: unabhängiger Code bedeutet nicht garantiert abwesenes rechtliches Risiko.

## Codeplug: Kontakte, Repeater und Satelliten

Beide Seiten beinhalten ein Panel **Codeplug: Kontakte, Repeater und SAT**. Es wird kein Anbieter beim Öffnen abgefragt. Abfragen sind explizite Aktionen und laufen über den lokalen Server; es werden keine Codeplugs, Kalibrierungen oder Funkgeräte-IDs gesendet.

### Kontakte RadioID / OpenGD77

1. Öffnet einen Standard-Codeplug von 128 KiB im Editor oder liest den von deinem Funkgerät.
2. Wähle **DMR-Kontakte**, gib das Land in der Sprache des Anbieters ein (z. B. `Spain`) und optional den Bundesstaat/die Provinz (`Madrid`).
3. Suche in der [API von RadioID](https://radioid.net/api/dmr/user/). Es wird eine Seite pro Aktion geladen; die Schaltflächen vorherige/ nächste blättern durch alle verfügbaren Seiten. Der Textfilter wirkt nur auf der sichtbaren Seite, nicht auf die gesamte Datenbank.

4. Wähle Kontakte von den benötigten Seiten aus und füge sie der lokalen Datei hinzu. Die Auswahl bleibt beim Seitenwechsel erhalten; der Zähler umfasst alle ausgewählten Seiten.
5. Speichere die geänderte Binärdatei mit **Binärdatei speichern 128 KiB**. Optional kannst du die Kontakt-Auswahl in JSON speichern.
Es werden **private digitale Kontakte** nach Rufzeichen/ID hinzugefügt (Gesamtkapazität: 1024), nicht die großflächige Anrufer-ID-Datenbank oder Talkgroups. Bereits vorhandene private IDs werden dedupliziert, vorhandene Kontaktindizes bleiben erhalten und es wird nichts überschrieben. Fehler oder Platzmangel brechen den Vorgang ab, ohne die Originaldatei zu verändern. Namen sind auf das ASCII-Format des Codeplugs beschränkt. Quansheng unterstützt keine DMR-Kontakte.

### Repeater RepeaterBook

Quelle: [offizielle API und Zugriffsrichtlinien](https://www.repeaterbook.com/wiki/doku.php?id=api). **Daten bereitgestellt von RepeaterBook.com.**
Seit März 2026 ist es keine offene API mehr: Sie erfordert die Genehmigung von **dieser Anwendung** und ein individuelles Token, das für verteilte Anwendungen zugeordnet ist. Ein Token einer anderen Anwendung berechtigt nicht diese. Es wird kein Scraping durchgeführt, keine RepeaterBook-Einträge werden im Repository enthalten und die Datenbank wird nicht ohne Erlaubnis heruntergeladen. Diese Integration ist für persönliche/autorisierten Programmierung gedacht, nicht um ein alternatives Verzeichnis zu erstellen oder Daten weiterzugeben.

Wenn RepeaterBook die Nutzung dieser Anwendung genehmigt, konfiguriere diese Variablen im selben PowerShell, in dem du den Server startest:

```powershell
$env:RB_APPROVED = "yes"
$env:RB_USER_TOKEN = "<tu token individual rbuapp_ asociado a esta aplicacion>"
$env:RB_APPROVED_USER_AGENT = "<el User-Agent aprobado con nombre/version y correo real de contacto>"
npm start
```

Füge den Token nicht im Chat, im Browser, in einer URL, in einem Commit oder in einer öffentlichen Datei ein. Das Programm liest `.env` nicht; wenn du Variablen selbst speichern willst, schütze diese Datei. In diesem verteilten Setup werden keine geteilten Tokens `app_` akzeptiert. Eine Genehmigungsvariable drückt nur deine Einstellung aus: Der Anbieter überprüft die tatsächliche Autorisierung. Bei HTTP 429 wird nicht automatisch erneut versucht und es gilt eine Mindestabkühlung von 15 Minuten.
In der Oberfläche kannst du nach Land/Zone und Modus (FM; auch DMR in OpenGD77) suchen, oder eine JSON-Exportdatei RepeaterBook öffnen, für die du eine Berechtigung hast (`results`, bis 8 MiB). Die USA, Kanada und Mexiko erfordern die ID des Bundesstaates/der Provinz RepeaterBook. Der Filter für Zone, Text und Band wird auf die sichtbaren Ergebnisse angewendet; Einträge ohne Bestätigung des Modus, außerhalb des Bereichs, nicht funktionsfähig oder beschädigt, werden **mit Zählung und Beispielen für den Grund** ausgeschlossen.
- **OpenGD77:** wähle eine bestehende Vorlage auf die gleiche Weise wie das Batch aus und füge sie in freie Positionen ein. Es werden keine willkürlichen Binärwerte erstellt und keine Kanäle umgeordnet. Name, Nenn-RX/TX und Color Code werden importiert, wenn zutreffend; die anderen Einstellungen stammen aus der Vorlage. **Alle neuen Kanäle sind nur RX und ohne vererbte RX/TX-Töne.** DMR behält TS/Kontakt/RX-Liste der Vorlage bei: Es wird keine Talkgroup oder TS des Repeaters erfunden. Überprüfe diese Parameter im CPS, bevor du TX aktivierst. Speichere das lokale Binärfile.
- **Quansheng:** nur FM; liest/öffnet logische Konfiguration F4HWN v6 von 41344 Bytes und erlaubt es, Kanäle über eine Vorlage hinzuzufügen oder Speicher vom lokalen Datei zu löschen. Beinhaltet PMR446 analoge 1-16 nur RX; Repeater/SAT werden über Anbieter vorbereitet. Der Beta-Versand erfordert vollständige Flash Sicherung und erneutes Einlesen; v6.0 kann dies nicht aktivieren. Exportiert auch CSV CHIRP mit `Duplex=off` (TX deaktiviert): ist Austausch, kein Dump oder Installation. Die Projekte JSON sind ebenfalls keine nativen Radioformate.- Es werden nur VHF 136-174 und UHF 400-470 MHz Frequenzen vorbereitet. Wähle das echte Band deines Geräts: Monoband-Funkgeräte, unterschiedliche Revisionen und regionale Einschränkungen können weniger unterstützen. Universelle Kompatibilität wird nicht versprochen.

### SAT und kommende Überflüge

1.Wähle **SAT / Überflüge**, gib eine NORAD-Nummer und den Orbitalanbieter ein: [SatNOGS DB](https://db.satnogs.org/) oder [CelesTrak](https://celestrak.org/NORAD/elements/).
2. **Orbitaldaten aktualisieren** lädt die aktuellsten TLEs herunter. Prüft Checksumme, NORAD, Epoche und Propagation. Elemente, die älter als sieben Tage sind, mehr als 24 h in der Zukunft liegen oder deren Vorhersagefenster sieben Tage ab Epoche überschreitet, werden abgelehnt. Ein Fehler wird nicht durch einen anderen Anbieter oder ältere Elemente ersetzt.
3. **Frequenzen abfragen SatNOGS** bietet aktive, bestätigte und innerhalb von VHF/UHF liegende FM/FM-Narrow-Frequenzen. Datenmodi, USB/LSB und lineare Transponder werden nicht in FM-Kanäle umgewandelt. Die Anzahl der ausgeschlossenen Frequenzen ist sichtbar. Die Daten stammen aus der Community und spiegeln möglicherweise nicht den aktuellen Betriebszustand wider: Überprüfe beim Satellitenbetreiber.4. Erlaubt die lokale Positionsnutzung und schreibt Breitengrad/Längengrad/Höhe oder drücke **Meine Position verwenden**. Erst dann wird die Erlaubnis vom Browser angefordert. Es werden keine Koordinaten an Anbieter gesendet oder automatisch gespeichert. 
5. Berechnet die Überflüge der nächsten 24/48 Stunden über der gewählten Minimalhöhe. Es wird SGP4 lokal mit der Position des Beobachters, 5-Proben und verfeinerte Kreuzungen bei 0,5 s verwendet. Start, Maximum, Ende, Höhe und Azimut werden in **UTC** angezeigt. Bereits laufende oder durch das Zeitfenster abgeschnittene Überflüge werden markiert. Ohne Gelände, atmosphärische Refraktion oder Feldgenauigkeitsgarantie.

6. Du kannst einen Plan JSON exportieren (**einschließlich deiner Position**, obligatorische Zustimmung) und das TLE zusammen mit einem JSON der Herkunft/Lizenz. Überprüfe, dass der Browser beide TLE-Dateien gespeichert hat. Der Plan wird ungültig, wenn die Parameter geändert werden, und muss nach 15 Minuten neu berechnet werden. Ein vorbereiteter SAT-FM-Kanal ist nur RX nominal: er kontrolliert kein Doppler und aktiviert keinen Aufwärtslink.
7. **Doppler-Kanäle (Quansheng UV-K5 V3 / UV-K1 und OpenGD77):** Wähle einen berechneten Durchgang und zwischen 1 und 10 Kanälen. Die Doppler-Verschiebung des Durchgangs (Radialgeschwindigkeit SGP4) wird in gleiche Frequenzsprünge unterteilt. Jeder Kanal wird in Schritten von 10 Hz auf das Zentrum seines Sprungs abgestimmt und während des UTC-Fensters verwendet, in dem die empfangene Frequenz in diesen Sprung fällt; die Fenster sind nahe dem maximalen Annäherungspunkt kürzer. Jeder Kanal gibt sein Fenster und seinen maximalen Fehler an den Enden an, wobei die Rundung der Frequenz auf 10 Hz und das Aufrunden des Fehlers berücksichtigt wird. Bei einem ISS-Durchgang über Madrid, mit 5 Kanälen, liegt der Fehler unter 0,7 kHz bei 145,8 MHz und unter 2 kHz bei 437,8 MHz. Nur RX: Speicher zur angegebenen Zeit wechseln. Das Funkgerät folgt nicht 
der Doppler allein und es werden keine TX-Erhöhungen erzeugt.SatNOGS DB / Libre Space Foundation: Datenzuordnung [CC BY-SA 4.0](https://wiki.satnogs.org/SatNOGS_DB); ihre TLEs können externe Orbitquellen angeben. Die JSON/CSV-Abkömmlinge behalten Zuordnung und Lizenzlink bei. Die Abhängigkeit SGP4 enthält ihre Lizenz MIT im installierten Paket.
7. **OpenGD77: native SAT-Liste im lokalen Codeplug.** Nach dem Öffnen/Lesen eines 128 KiB großen Codeplugs schreibt **Satellit in die SAT-Liste des lokalen Codeplugs laden** den Satelliten in den benutzerdefinierten Datenblock **vom Typ 3** (Offset `0x1EE60`, 25 Einträge à 100 Bytes: Name mit 8 Zeichen, TLE-Felder in Nibbles gepackt, LE-Frequenzen), im gleichen Format wie das offizielle CPS. Vorhandene Satelliten bleiben erhalten (werden nach Name ersetzt und sortiert), die Kopfzeile `OpenGD77` und die anderen Blöcke (Boot-Bild, Melodie, Thema). Wenn der Bereich keine Kopfzeile hat und nicht gelöscht ist (`0xFF`), oder die Blockkette inkohärent ist, wird der Vorgang abgebrochen, ohne die Datei zu ändern. Es wird nur der Download gespeichert (RX1); Upload, CTCSS und APRS bleiben bei null. **Codeplug-Satelliten ansehen** dekodiert die Liste. Speichere die Binärdatei und wende sie an.
mit dem offiziellen CPS: Das direkte Schreiben ins Radio bleibt gesperrt, bis ein vollständiges MCU-Backup vorliegt.**Installationsgrenzen:** F4HWN unterstützt hier gestufte FM/SAT-Speicher in der Konfiguration v6, aber keine nativen SAT-Orbitaltabellen. Der Kanalversand ist Beta mit vollständigem Backup; nur das Lesen wurde physisch in v6.0. getestet. Die SAT-Liste OpenGD77 wird im lokalen Binärfile geändert, nicht im Radio. Das Schreiben OpenGD77 bleibt gesperrt, bis eine vollständige Kopie der MCU-Firmware überprüft wurde. Das lokale Löschen OpenGD77 entfernt Referenzen in den 68 Standardzonen und 64 Scanlisten, einschließlich Prioritäten und zugewiesenem TX-Kanal; andere Speicher werden nicht neu nummeriert. Erweiterte Scannerbereiche werden nicht unterstützt. Die Originaldatei immer aufbewahren. Die UV-K5 V3 validiert keine Hardware OpenGD77.. Abfragen/Importe erzeugen keine Schreibrechte.

## Offizielle Firmware-Downloads

Auf jeder Seite klicke auf **Offizielle Modelle einsehen**, wähle das genaue Modell und die Revision aus und sieh dir den stabilen Katalog an. In Quansheng zeigt **Stabile Versionen einsehen** die anerkannte Historie der beiden Projekte, sortiert von neu nach alt innerhalb jedes Projekts. Beim Öffnen der Seite wird das Internet nicht abgefragt. Die Auswahl der Familie OpenGD77 identifiziert nicht automatisch das Zielmodell: Überprüfe das Etikett des Geräts, die Leistung und die Hardware-Revision.


- **F4HWN UV-K1 / UV-K5 V3:** [Armel-Veröffentlichungen](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases), stabile Historie v4.x/v5.x/v6.x anerkannt. Beinhaltet Fusion und, in v6, FieldOps, Labs und Transfer. Die Binärdateien v4 werden nach Hardware K1/K5 V3. gefiltert. Die Varianten SA818 werden ausdrücklich identifiziert. Nur F4HWN v6.x ohne SA818 kann für Slots vorbereitet werden; frühere Versionen und SA818 sind **nur Download**.
- **ARDF UV-K1 / UV-K5 V3:** [Releases des Reald-Projekts](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases), stabile Versionen mit dem Tag `ARDF-K5v3_K1-v...` und anerkanntem Binärpaket (einschließlich v0.5 und v0.5.1). Nur **Download**: keine Kompatibilität mit Multiboot wird zugesichert noch der Connector für ARDF aktiviert.
- Beide Projekte Quansheng erfordern Größe und SHA-256 veröffentlicht von GitHub; der Server und der Browser überprüfen die Bytes. Der Verlauf wird paginiert (bis zu 1000 Beiträge pro Projekt; das Überschreiten des Limits führt zu einem expliziten Fehler). Ein Fehler in einer der Quellen bricht die Abfrage ab, ohne ein teilweise erstelltes Verzeichnis anzuzeigen. Es werden keine Betas, Entwicklungsversionen, Original-Firmware nicht verifizierter Herkunft, lokal kompilierte Binärdateien oder V1/V2.-Modelle angeboten. Dateien aus lokalen Ordnern werden nicht auf die Seite kopiert. Die Überprüfung eines Hashes ist nicht gleichbedeutend mit digitaler Signatur oder Kompatibilitätszertifizierung.- **OpenGD77:** nur [offizieller Server](https://www.opengd77.com/downloads/releases/), letzter stabiler Ordner `RYYYYMMDD` nach Familie und vom Modell erkannte Dateien. MD-9600 unterscheidet V1/V2/V4/V5 und MD-UV380 unterscheidet 10W PLUS. Die Original-ZIP wird behalten: **wird nicht geflasht noch als Codeplug behandelt**. Der offizielle Index veröffentlicht keinen Hash: HTTPS, Größe und ZIP-Format-Signatur werden überprüft, und SHA-256 wird lokal berechnet. Es wird keine kryptografische Prüfung des Herausgebers behauptet, noch werden alle Dateien der ZIP entpackt/validiert.
- MD-380, DM-32 und UV008 werden nicht angeboten, solange keine bestätigte Quellen für die Assets vorliegen. Es werden keine Links erfunden oder auf Mirrors zurückgegriffen.Die Downloads laufen über eine API des lokalen Servers mit festen Zielen, eingeschränkten Weiterleitungen, Byte-/Zeitlimits und höchstens zwei gleichzeitigen Downloads. Die Kataloge verfallen nach zehn Minuten; innerhalb dieses Zeitraums eine Abfrage zu wiederholen, nutzt den Cache. Fehlermeldungen werden angezeigt, ohne dass sie durch Dateien oder fiktive Versionen ersetzt werden. Benutzer-URLs werden nicht akzeptiert und die Firmware wird nicht auf der Festplatte des Servers gespeichert. Die offizielle Quelle erhält die Downloadanfrage vom Gerät, aber keine Kalibrierungen, Backups, Codeplugs oder Radio-IDs.
Nach dem Herunterladen kannst du ein Herkunftsmanifest mit Modell, Version, URL, Größe, Hashes und Einschränkungen speichern. Prüfe, ob der Browser beide Dateien gespeichert hat. Nur ein verifizierter BIN F4HWN mit übereinstimmendem Modell erlaubt es, **Bild für slot vorzubereiten**; dabei wird nichts installiert. Ein Modellwechsel löscht das vorbereitete Bild. Die Installation behält alle Sicherungs- und Bestätigungsmechanismen bei; ein Download ersetzt niemals die bereits im Radio enthaltene Firmware-Kopie.Der Editor OpenGD77 öffnet Binärdateien von genau 131072 Bytes und ändert vorhandene FM-/DMR-Kanäle (ASCII-Name, RX, TX, Modus, Color Code, TS und nur RX), wobei andere Felder erhalten bleiben. Er erlaubt auch, Kanäle über eine explizite Vorlage hinzuzufügen und private Kontakte über das Anbieter-Panel zu verwalten. Die JSON des CPS spielt keine Rolle, er erstellt keine Kanäle mit willkürlichen Einstellungen und verwaltet keine erweiterten Kanäle 1025+.. Die BCD-Validierung ersetzt nicht die Überprüfung der Modellbänder oder die Sendeerlaubnis.

Die OpenGD77-Auslesungen senden keinen Befehl zum Speichern der Einstellungen/VFO und starten das Gerät nicht neu: sie lesen die bereits gespeicherten Werte aus und erzwingen nicht das Speichern von Änderungen, die noch im RAM vorhanden sind.

## Apps von F4HWN Labs und maßgeschneiderte Firmware (Quansheng)
- **Bricohams V3 lokal auf Anfrage:** `npm run build:bricohams -- --source "<Fusion61>" --output "<directorio nuevo>" --preset Fusion --option ENABLE_VOX=OFF` kompiliert eine unabhängige Ausgabe über den festgelegten Commit von F4HWN v6.1.0. Unterstützt Fusion/Labs/FieldOps/Transfer und überprüfte boolesche Optionen; behält multiboot bei und erzeugt Firmware, Karte, ELF, Metadaten, Lizenzen und SHA256SUMS, die mit dem Web-Validator kompatibel sind. Es ist kein Karina noch eine V1 Version; auch nicht der Online-Katalog v6.3.0. Fusion und Labs wurden kompiliert und lokale Reproduzierbarkeit von Fusion überprüft, ohne physische Tests oder Flashen. Anleitungen und Ergebnisse in [BRICOHAMS-FIRMWARE.md](docs/i18n/de/BRICOHAMS-FIRMWARE.md)- **Lokale Bibliothek Multiboot:** Wähle in **Firmware Slots / Multiconfig** deinen Ordner Multiboot aus. Die `.bin` werden im Browser gelesen, ohne auf den Server hochgeladen zu werden. Jedes Bild zeigt an, ob es die Slot-Prüfungen erfüllt oder warum es blockiert wird. Es werden nur Bilder F4HWN v6.x mit gültigen PY32 Vektoren vorbereitet; keine Karina V1, Stock, alte Versionen oder Varianten packed/SA818/beta/desarrollo.. Die lokale SHA-256 beweist keine Authentizität. Die Installation erfordert weiterhin vollständige Sicherung und Bestätigung; Main bleibt geschützt. Siehe [Akten Karina, Hardware und Machbarkeit Bricohams](docs/i18n/de/KARINA.md).- **Apps:** im Bereich Quansheng, **Apps von F4HWN Labs** listet die App-Slots auf der externen Flash auf, installiert eine `.app` und löscht sie wieder. Funktioniert nur mit gestarteter Labs-Version. Bevor das Radio angefasst wird, werden die FAP1-Header und die CRCs des Codes und der Assets überprüft. Die App wird in dieser Reihenfolge geschrieben: Code, Assets und zuletzt der Header. Jeder Block wird von der physischen Flash gelesen und byteweise verglichen; wenn er fehlschlägt, wird ohne Bestätigung des Headers abgebrochen. Die finale Firmware-Prüfung validiert nur den Header und die Kompatibilität, nicht den CRC des Codes; sie ersetzt nicht das erneute Lesen. Wie bei allen Schreibvorgängen wird ein vollständiges Backup verlangt. Die `.app` werden von [archive/apps von F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/tree/main/archive/apps) heruntergeladen, wobei der Ordner deiner Version genutzt wird.- **Firmware nach Maß:** Du wählst eine Edition (Labs, Fusion...) und aktivierst oder deaktivierst Optionen `ENABLE_*`. Die Website erstellt die Anfrage für den Workflow *Firmware à la carte* aus dem Kompilations-Repository. Beim Laden des heruntergeladenen Artefakts (`SHA256SUMS`, `build-info.json`, `.bin`) prüft es jede SHA-256 und lässt ausschließlich das von `build-info.json` angegebene `.bin` in **Installieren auf slot** bereit. Das Manifest muss auch `build-info.json` abdecken; doppelte Namen werden abgelehnt. Diese Hashes erkennen Beschädigungen, garantieren aber weder Authentizität noch Kompatibilität. Der Katalog [f4hwn-options.js](f4hwn-options.js) wird mit `node scripts/f4hwn-options.cjs <bricohams-firmware>/options/<version>.json > f4hwn-options.js` neu erstellt.

## Automatische Kopien und Geräteschutz

1. Modell auswählen und lokale Leseberechtigung autorisieren.
2. Verbinden: Das Radio wird erkannt und die Sicherung startet automatisch.
3. Kalibrierung in IndexedDB speichern, SHA-256 berechnen und zum Überprüfen der Persistenz erneut einlesen.4. Quansheng: **die 2 MiB von Flash extern** lesen und deren gesamten CRC-32 mit dem von der Funkstation berechneten vergleichen (`0x073E`, Labs mit physischem CRC-Support). Wenn die Firmware diese Überprüfung nicht anbietet oder sie nicht übereinstimmt, wird das Schreiben blockiert. Bei 38400 Baud kann es 10-20 Minuten oder länger dauern. Die Leiste zeigt den tatsächlichen Fortschritt in Bytes. 
5. Das `Main`-Image aus slot 0 extrahieren und Header, Größe sowie CRC-32. überprüfen. Die logische Kalibrierung mit der physischen vergleichen.
6. Das Ergebnis speichern und alle SHA-256. erneut prüfen. Erst dann wird eine schreibberechtigte Erlaubnis für die Verbindung erteilt.
7. Einen automatischen Download `.rwb.json` mit Manifest, Base64-Dateien, Größen und Hashes anfordern. Der Browser kann ihn blockieren: Downloads prüfen und über den Verlauf erneut starten.**Was bedeutet Basis-Firmware:** `Main` ist die Anwendung, die die Firmware nach der normalen Installation speichert. Das gesamte Bild, wie durch seinen Header beschrieben, wird kopiert (bis zu 118 KiB). Es ist nicht unbedingt die aktuell ausgewählte Firmware und **enthält nicht den werkseitig eingebauten Bootloader** oder andere Bytes des MCU. Dieses Protokoll erlaubt es nicht, eine vollständige Kopie des gesamten Chips zu bestätigen. Wenn Main fehlt oder sein CRC nicht übereinstimmt, wird das Schreiben nicht aktiviert.

OpenGD77 behält Kalibrierung und Codeplug bei, markiert das Backup jedoch als **teilweise**, weil die vollständige Extraktion der internen Firmware fehlt. Die Anwendung verwechselt einen Codeplug nicht mit einer Firmware.Bei Transport-, CRC-, Quoten-, Lese- oder Speicherfehlern gibt es keine Schreibberechtigung. Vor jeder Änderung wird die gespeicherte Sicherung erneut gelesen und mit den ursprünglichen Hashes der Berechtigung verglichen: sie zu löschen oder zu beschädigen entzieht ebenfalls das Schreibrecht. Ein abgezogenes Kabel, ein Wiederanschluss oder eine andere Funkverbindung machen die Berechtigung ungültig. Jede neue Verbindung erfordert eine neue Kopie. Die Schreibungen sind exklusiv, Main kann nicht als Ziel ausgewählt werden, die Bildbytes kommen vor dem Header und der CRC wird nach der Installation überprüft. Firmware löschen und Bank zurücksetzen sind verschiedene Aktionen mit schriftlicher Bestätigung.

Trenne während einer Operation nicht den Browser und schließe ihn nicht. Schließe kein externes Werkzeug gleichzeitig an denselben Anschluss an. Die verknüpften Originalwerkzeuge **erben diese Barrieren nicht**.

## Datensicherheit

- Ohne Telemetrie, Konten, CDN oder Versand von Radiodateien an Server. `satellite.js` wird lokal über npm mit fester Version und Lockfile installiert.- Die Kopien bleiben im Browserprofil des Geräts; sie werden von dieser Anwendung nicht verschlüsselt. Sie können Identifikatoren, Kanäle, Konfigurationen und andere private Daten enthalten. Schütze das Profil und die Dateien mit den Maßnahmen deines Betriebssystems. 
- IndexedDB ist keine für immer garantierte externe Datei. Exportiere die Kopien; das Löschen von Browserdaten oder die Nutzung einer anderen Quelle führt zum Verlust des Zugriffs auf den Verlauf. Persistenter Speicher wird angefragt, wenn der Browser dies erlaubt. 
- Eine teilweise/fehlgeschlagene Kopie behält die bereits bestätigten Dateien im Verlauf. Lösche diese Kopien nicht. 
- Der Server liefert nur eine feste Liste von Anwendungsdateien, hört nur auf `127.0.0.1` und sendet CSP, Permissions-Policy, `nosniff` und `no-referrer`. Er liefert keine Editor-Konfiguration, Tests oder beliebige Pfade.

- Radio- und Dateimetadaten werden als Text angezeigt, nicht als HTML. `eval` wird nicht verwendet.
- SHA-256 erkennt zufällige Beschädigungen, zeigt aber nicht die Authentizität der Firmware. Verwende Bilder aus einer vertrauenswürdigen Quelle. Keine Software kann absolute Sicherheit oder Wiederherstellung bei Stromausfällen garantieren.
## Tests und Validierung

```powershell
npm test
npm run check
```

Die Tests von `tests/connectors.test.cjs` verwenden simulierte Geräte: Byte-Fragmentierung, Frames, CRC, Kalibrierung, Karten nach Familie, vollständige Sicherung, fehlgeschlagene Persistenz, Berechtigungen, Slots, Reset, Schutz von Main, nachträgliche Überprüfung und binäre Bearbeitung. Der Schreibcoder OpenGD77 wird mit einer isolierten VM getestet, die die Barriere nur innerhalb des Tests ersetzt; der Produktivcode wird nicht entsperrt. Es wird nicht auf Hardware geschrieben.

`tests/firmware.test.cjs` prüft zulässige Quellen und Weiterleitungen, stabile Kataloge nach Modell, Limits, Hashes, Formate, Cache, Ablauf, Konkurrenz, browserunabhängige Überprüfung und Serverpfade/-privatsphäre. Es verwendet simulierte Netzwerkantworten und einen temporären lokalen Server; es hängt nicht vom Internet ab und lädt nicht bei jeder Ausführung Firmware herunter.`tests/planning.test.cjs` überprüft die atomare Importierung von Kanälen/Kontakten und Grenzen, SAT-Block OpenGD77 Typ 3 Byte für Byte im Vergleich zum CPS-Format (Initialisierung, Blockerhalt, Ersatz, Ablehnung beschädigter/nicht leerer Zonen, ungültige TLEs und mehr als 25 Satelliten), Beibehaltung von Bytes, BCD-IDs, Duplizierungserkennung, Filter, CSV nur RX, Ablehnung inkompatibler Satellitenmodi, Prüf-/TLE-Alter, SGP4-Propagation gegenüber einem unabhängigen Bahnvektor, Fenster/Elevationskreuzungen, RadioID-Paginierung, Server-only-Zugangsdaten RepeaterBook, HTTP-Abkühlung 429 und API-Isolierung. Kein Test verwendet echte Zugangsdaten, schreibt Radios oder fragt RepeaterBook ab.
`tests/site.test.cjs` überprüft die Marke, das Favicon und das Fehlen von Inline-Skripten/-Stilen auf allen Seiten; dass der Server die Hilfe und das Logo mit ihrem Typ und den Headern bereitstellt; die Anker und lokalen Links der Hilfe; dass jede Nachricht in der Fehler-Tabelle buchstäblich im Code existiert; die relativen Links der gesamten Dokumentation; die Lizenz, die Urheberschaft und die Metadaten des Pakets; und das Fehlen von E-Mails, Geheimnissen und beschädigten Zeichen.Es wird auch im Browser die Desktop-/Mobile-Oberfläche, die deaktivierten Zustände und der Speicher IndexedDB überprüft. Physisch getestet wurde das Lesen USB eines als UV-K5 V3 deklarierten Geräts mit F4HWN v6.0.0; Schreiben, RF oder Funk OpenGD77. wurden nicht getestet. Es wird keine Feldkompatibilität oder Funktionsfähigkeit des 100% der Geräte zertifiziert. Bevor Schreiben auf ein wertvolles Gerät durchgeführt wird, muss mit Testhardware und einem bekannten Wiederherstellungsverfahren validiert werden.

## Interoperabilitätsreferenzen

Unabhängige Implementierung basierend auf den inspizierten Protokollformaten; der Code der Referenzen oder ihre Firmware wird nicht verteilt. 
- [OpenGD77 CPS](https://grid.radio/opengd77/), Protokoll `C` / `R` / `W` / `X`, Modi und Codeplug-Karte.

- [UV Studio](https://armel.github.io/uvstudio/).
- [UART der Firmware F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/app/uart.c), Nachrichten- und Antwortverträge.
- [Format und Karte Multiboot](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/driver/mb_flash.h).
- [Multiboot und Multiconfig](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig).
Abfrage durchgeführt am 18 Oktober 2026. Firmware und Protokolle können sich ändern; es wird ausdrücklich bei unbekannten Formaten fehlschlagen.

## Lizenz

Copyright (C) 2026 Anatol Emilio Lopez Maitchovcow (EA5KAO), Diego Roca (EA5JEF) und Pedro Roca.
Gründer und Vorstandsmitglieder von [Bricohams](https://bricohams.org) ([bricohams.com](https://bricohams.com)).

Dieses Programm ist freie Software: Sie können es unter den Bedingungen der [GNU General Public License](LICENSE) Version 3 oder (nach Ihrer Wahl) jeder späteren Version (GPL-3.0-or-later) weitergeben und/oder modifizieren. Es wird **ohne jegliche Garantie** verteilt. Abhängigkeiten und Drittquellen behalten ihre eigenen Lizenzen: siehe [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.de.md).
Bricohams ist nicht mit OpenGD77, grid.radio, F4HWN, Quansheng, RadioID, RepeaterBook, SatNOGS oder CelesTrak verbunden. Die Marken gehören ihren jeweiligen Eigentümern.