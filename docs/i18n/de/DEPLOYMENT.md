# Bereitstellung

Zwei Bereitstellungsarten werden unterstützt: **lokal** (Node-Server auf demselben Rechner, an den das Funkgerät angeschlossen wird) und **öffentliche Website auf GitHub Pages** (statische Website, siehe [Öffentliche Website auf GitHub Pages](#web-pública-en-github-pages)).

## Voraussetzungen

- Node.js 22 oder neuer **nur für den Betrieb aus dem Quellcode, Arch und FreeBSD**. Die `.deb`-Pakete und das Windows-ZIP enthalten Node.
- Git nur zum Klonen und Aktualisieren einer Quellcodeinstallation.
- Chrome, Edge oder Brave auf dem Desktop für WebUSB/Web Serial. Firefox und Safari werden nicht unterstützt.
- Die vom Funkgerät benötigten USB-Treiber: siehe [Hilfe › Treiber](../../../ayuda.html#drivers).

## Installation aus dem Quellcode

```powershell
git clone https://github.com/Brico-Hams/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Öffne <http://127.0.0.1:8787>. Beim Aufruf von `localhost` leitet der Server auf `127.0.0.1` um: Er prüft den `Host`-Header und bedient nur diesen Origin. Verwende immer denselben Origin, damit der IndexedDB-Verlauf erhalten bleibt.

Um Bricohams Quansheng Studio in die lokale Kopie aufzunehmen, führe `npm run fetch:studio` aus. Dadurch wird `studio.html` aus `Brico-Hams/Bricohams-Studio` am in `studio.lock.json` festgelegten Commit heruntergeladen und auf Größe sowie SHA-256 geprüft. Die Datei wird nicht versioniert, da sie eingebettete Firmware enthält.

**Studio aktualisieren (Autor):** Sobald der neue Commit auf GitHub liegt, führe `node scripts/fetch-studio.cjs --update <commit-completo>` aus. Der Befehl schreibt `studio.lock.json` mit Größe, SHA-256 und CSP-Hashes der Skripte neu. Prüfe den Diff und committe die Lockdatei.

`--ignore-scripts` verhindert die Ausführung fremder Installationsskripte. Die Version von `satellite.js` ist in `package-lock.json` festgelegt.

## Überprüfung

```powershell
npm test
npm run check
```

Beide Befehle müssen fehlerfrei enden. Öffne anschließend die Hilfeseite und prüfe, ob das Bricohams-Logo angezeigt wird.

## Lokale Installationspakete

Lade die Datei für dein System und `SHA256SUMS` aus den **Assets** des [neuesten Releases](https://github.com/Brico-Hams/Radio-Web-install/releases/latest) herunter. Pakete sind seit `v0.3.0` veröffentlicht. Die automatisch erzeugten Links „Source code (zip)“ und „Source code (tar.gz)“ sind keine Installationspakete.

| System | Datei | Installation |
| --- | --- | --- |
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS arm64/armhf | `.deb` für amd64, arm64 oder armhf | `sudo apt install ./nombre-del-paquete.deb` (nur die eigene Architektur wählen) |
| Arch Linux | `*-arch.tar.gz` | Entpacken und `makepkg -si` ausführen (benötigt `base-devel` und `nodejs`). |
| FreeBSD 14 amd64 | `*-freebsd-amd64.tar.gz` | Entpacken und `su -c './install.sh'` ausführen (installiert bei Bedarf `node22` über `pkg`). |
| Windows 11 x64 | `*-windows-x64.zip` | ZIP entpacken und `powershell -ExecutionPolicy Bypass -File .\Install.ps1` ausführen; legt eine Startmenüverknüpfung an. |

Die `.deb`-Pakete und das Windows-ZIP enthalten Node.js 22. Arch verwendet das Distributionspaket `nodejs`. FreeBSD benötigt `pkg` und das Paket `node22`. Raspberry Pi OS mit 32 Bit erfordert einen ARMv7-Prozessor oder neuer. Der Installer richtet keinen automatischen Start ein und erhöht beim Anwendungsstart keine Rechte.

Starte nach der Installation **Bricohams Radio Workspace** über das Anwendungs-/Startmenü oder führe unter Arch und FreeBSD `bricohams-radio` aus. Der Server ist an `127.0.0.1:8787` gebunden; mache ihn nicht im Netzwerk zugänglich. Unter FreeBSD bietet Chromium möglicherweise kein WebUSB/Web Serial, sodass Funkgerätezugriff nur nach bestem Bemühen möglich ist.

### Download prüfen

Prüfe den Hash vor dem Ausführen des Installers. In PowerShell:

```powershell
Get-FileHash .\bricohams-radio-workspace-v0.3.0-windows-x64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Vergleiche den vollständigen Hash mit der Zeile desselben Dateinamens in `SHA256SUMS` (Groß-/Kleinschreibung ist unerheblich). Unter Linux:

```sh
sha256sum bricohams-radio-workspace-v0.3.0-amd64.deb
cat SHA256SUMS
```

Unter FreeBSD verwende `sha256 nombre-del-archivo`. Ersetze Name/Version durch die tatsächlich heruntergeladene Datei. Bei abweichendem Hash nicht installieren. Die Prüfsummen belegen Integrität, keine Herausgebersignatur: Die Pakete sind nicht codesigniert.

### Windows 11 x64

1. Lade `*-windows-x64.zip` herunter und **entpacke den gesamten Inhalt**; das Skript nicht im ZIP ausführen.
2. Öffne PowerShell im Ordner mit `Install.ps1`, `Start.ps1`, `app` und `runtime`.
3. Führe als normaler Benutzer aus:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
   ```

4. Die Installation erfolgt in `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` und erstellt **Bricohams Radio Workspace** im Startmenü. Weder UAC noch eine separate Node-Installation sind nötig.
5. Öffne diese Verknüpfung. Ist der Standardbrowser nicht Chrome, Edge oder Brave, öffne <http://127.0.0.1:8787> manuell in einem davon.

`ExecutionPolicy Bypass` betrifft nur den Prozess, der den Befehl ausführt; ändere die PowerShell-Richtlinie nicht dauerhaft. Unternehmensrichtlinien können Skripte auch mit dieser Option blockieren: Wende dich an die Administration. Der aktuelle Installer ist ein ZIP mit Skripten, keine signierte `.exe`/MSI-Datei, und installiert keine WinUSB-Treiber.

### Debian, Ubuntu und Raspberry Pi OS

Prüfe die Architektur des **Betriebssystems** (nicht nur des Prozessors):

```sh
dpkg --print-architecture
```

Lade nur das `.deb` mit passendem Suffix herunter: `amd64`, `arm64` oder `armhf`. Raspberry Pi OS mit 64 Bit nutzt `arm64`; mit 32 Bit nutzt es `armhf` und benötigt ARMv7 oder neuer. Raspberry Pi 1 und ursprüngliche Zero/Zero W mit ARMv6 werden nicht unterstützt.

Im Downloadordner, für einen amd64-Rechner und die erste Version:

```sh
sudo apt install ./bricohams-radio-workspace-v0.3.0-amd64.deb
bricohams-radio
```

Ersetze den Dateinamen durch deine Datei. Node ist in `/opt/bricohams-radio-workspace` enthalten; der Starter erscheint auch im Anwendungsmenü. Führe `bricohams-radio` nicht mit `sudo` aus: Browsersicherungen und Berechtigungen müssen deinem Benutzer gehören.

### Arch Linux

```sh
sudo pacman -S --needed base-devel nodejs
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-arch.tar.gz -C bricohams-installer
cd bricohams-installer
less PKGBUILD
makepkg -si
bricohams-radio
```

Führe `makepkg` als normaler Benutzer aus. `*-arch.tar.gz` enthält das Baurezept; `*-arch-source.tar.gz` enthält die Anwendung, die dieses Rezept aus demselben Release lädt und per SHA-256 prüft. Es ist weder ein fertiges Binärpaket für `pacman -U` noch ein im AUR veröffentlichtes Paket. Internetzugang während des Builds und Node.js 22 oder neuer sind erforderlich.

### FreeBSD 14 amd64

```sh
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-freebsd-amd64.tar.gz -C bricohams-installer
cd bricohams-installer
su -c './install.sh'
bricohams-radio
```

Die Installation benötigt root und verfügbare `pkg`-Repositorys, um bei Bedarf `node22` zu installieren. Das Programm liegt in `/usr/local/libexec/bricohams-radio-workspace`, der Starter in `/usr/local/bin/bricohams-radio`. Wechsle zum Starten wieder zu deinem normalen Benutzer. Es ist weder ein natives `.pkg`-Paket noch ein offizieller Port. Lokaler Server und Dateibearbeitung garantieren keine Funkgeräteverbindung: Diese hängt von den nötigen USB-/seriellen APIs und Berechtigungen in Chromium ab.

### Erster Start, Berechtigungen und Beenden

- Öffne <http://127.0.0.1:8787> immer im selben Browser und Profil: Sicherungen gehören zu diesem Origin, nicht zum Installationsordner. Das Kennzeichen muss **Lokal · installiert** anzeigen.
- Die Starter starten den Server im Hintergrund; das Schließen des Tabs beendet ihn nicht. Automatischer Start bei der Anmeldung wird nicht eingerichtet. Aus dem Quellcode bleibt `npm start` im Terminal und wird mit `Ctrl+C` beendet.
- Der Installer konfiguriert keine USB-Treiber oder Berechtigungen. Siehe [Hilfe › Treiber](../../../ayuda.html#drivers): gegebenenfalls WinUSB unter Windows, udev-Regeln und die Gruppe `dialout`/`uucp` je nach Linux-Distribution. Nach Gruppenänderungen neu anmelden und den Browser nicht als root ausführen.
- Ist der Port belegt, identifiziere den Prozess vor dem Beenden. Unter Windows: `Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess`, dann `Get-Process -Id <PID>` und nur beim Bricohams-Server `Stop-Process -Id <PID>`. Unter Linux `ss -lptn 'sport = :8787'`, unter FreeBSD `sockstat -4 -l`. Prüfe Befehl und Benutzer der PID und beende nur diesen Prozess mit `kill <PID>`.
- Linux-/FreeBSD-Protokolle liegen in `${XDG_STATE_HOME:-$HOME/.local/state}/bricohams-radio/server.log`. Bei Startproblemen unter Windows führe in PowerShell `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\runtime\node.exe" "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\app\server.cjs"` aus, um den Fehler zu sehen.
- Für Oberfläche und Bearbeitung lokaler Dateien ist kein Internet nötig. Anbieterabfragen und Firmwaredownloads benötigen es.

## Konfiguration

| Variable | Verwendung |
| --- | --- |
| `RB_USER_TOKEN` | Von RepeaterBook genehmigtes Anwendungstoken (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | Bei der Genehmigung registrierter User-Agent. |
| `RB_APPROVED` | Muss zum Aktivieren der Funktion `yes` sein. |

Nur der Server liest diese Variablen. Nicht im Repository speichern. Port `8787` und Schnittstelle `127.0.0.1` sind aus Sicherheitsgründen in `server.cjs` festgelegt.

PowerShell-Beispiel für Quellcodeinstallation, nur für die aktuelle Sitzung:

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

Beim installierten ZIP setze die Variablen in PowerShell und führe `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\Start.ps1"` in derselben Sitzung aus. Beende vorher laufende Server: Ein vorhandener Prozess behält seine alte Umgebung. Es gibt noch keinen Einstellungsdialog zum Speichern dieser Schlüssel; füge sie weder im Browser noch in öffentlichen Dateien ein.

## Aktualisierung

**Installer:** Exportiere zuerst `.rwb.json`-Sicherungen, beende den Server und lade/prüfe das neue Release. Unter Windows den entpackten Installer erneut ausführen; unter Debian/Ubuntu/Raspberry Pi `sudo apt install ./nuevo-paquete.deb`; unter Arch das neue Rezept mit `makepkg -si` bauen; unter FreeBSD das neue `install.sh` ausführen. Starter erneut öffnen und Browser neu laden. Veröffentlichte Releases ändern sich nicht bei Aktualisierung von `main`; Korrekturen benötigen eine neue Version.

**Quellcode:**

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Exportiere Sicherungen vor Browseraktualisierungen oder dem Löschen von Websitedaten.

## Mehrsprachige Dokumentation

Die Hilfe erscheint auf Spanisch (Original), US-Englisch, Deutsch, Italienisch und Französisch. Übersetzte Quellen liegen in `docs/i18n/<idioma>/` (gleicher Dateiname wie das Original) und `README.<idioma>.md`; `npm run build:help` erzeugt `ayuda-*.html` und `ayuda-*.<idioma>.html` mit Sprachauswahl. `docs/i18n/<idioma>/F4HWN-PRESETS.md` wird automatisch erzeugt.

Aktualisiere bei Änderungen an einem spanischen Dokument alle vier Übersetzungen und prüfe Überschriften, Codeblöcke, Inline-Code, Tabellenzeilen, Bilder und Links auf Vollständigkeit:

```powershell
node scripts/i18n.cjs --fix --strict
npm run build:help
```

`--fix` passt relative Link- und Bildpfade an den Übersetzungsordner an und verweist auf die entsprechende Übersetzung. Bei Abweichungen zwischen Übersetzung und Original ist Spanisch maßgeblich.

## Automatischer Start (optional, aus dem Quellcode)

Installer starten beim Öffnen des Starters bereits im Hintergrund, aber nicht bei der Anmeldung. Diese Beispiele gelten für eine Repositorykopie mit installiertem Node; passe Pfade an und kombiniere sie nicht mit einem weiteren Server auf demselben Port.

Unter Windows als geplante Aufgabe bei der Anmeldung:

```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server.cjs" -WorkingDirectory "C:\ruta\Radio-Web-install"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Bricohams Radio Workspace" -Action $action -Trigger $trigger
```

Unter Linux als systemd-Benutzerdienst (`~/.config/systemd/user/bricohams-radio.service`):

```ini
[Unit]
Description=Bricohams Radio Workspace

[Service]
WorkingDirectory=%h/Radio-Web-install
ExecStart=/usr/bin/node server.cjs
Restart=on-failure

[Install]
WantedBy=default.target
```

Aktivieren mit `systemctl --user enable --now bricohams-radio`.

<a id="web-pública-en-github-pages"></a>
## Öffentliche Website auf GitHub Pages

Die statische Website wird mit `npm run build:pages` (Ordner `dist/`) erzeugt und durch `.github/workflows/pages.yml` veröffentlicht. `server.cjs` ist nicht enthalten: `runtime.json` enthält `{"mode":"web"}`, und die Anwendung läuft im Webmodus (siehe [Architektur](ARCHITECTURE.md#modos-de-ejecución)).

### Warum ein eigener Origin

IndexedDB (Funkgerätesicherungen) und `localStorage` (Profil) werden nach
Origin isoliert, nicht nach Pfad. Anfangs wurde ein eigenes Konto unter
`https://<org>.github.io/` empfohlen. Die aktuelle Website
`https://brico-hams.github.io/Radio-Web-install/` nutzt die Ausnahme für
gemeinsamen Origin: Sie teilt Speicher mit anderen Projekten von
`brico-hams.github.io`, einschließlich Bricohams Studio. Ein Unterpfad
darf nicht als Isolation dargestellt werden. Exportiere Sicherungen
außerhalb des Browsers; ein Origin-Wechsel migriert Profildaten nicht
automatisch. Alle Client-Pfade bleiben relativ.

### Schritte (durch den Autor)

1. Konto oder Organisation `<org>` erstellen.
2. Repository `<org>.github.io` erstellen und diesen Code hochladen (Push erfordert ausdrückliche Bestätigung des Autors).
3. Unter *Settings › Pages* „GitHub Actions“ als Quelle wählen und „Enforce HTTPS“ aktivieren.
4. Actions-Variable `PAGES_ORIGIN` mit `https://<org>.github.io` (ohne abschließenden Schrägstrich) erstellen. Der Workflow ruft damit die bisherige `data/satellites.json` ab.
   Der Workflow läuft nur im Repository `<org>/<org>.github.io` (Bedingung `if: github.repository == ...`); in anderen wird er übersprungen, um Sicherungen und Profil (IndexedDB) nicht durch Veröffentlichung auf gemeinsamem Origin anderen Seiten zugänglich zu machen.
   Bewusste Ausnahme: Akzeptiert der Autor den gemeinsamen Origin, wird die Repositoryvariable `PAGES_SHARED_ORIGIN_ACCEPTED` mit Wert `true` erstellt. Variablen werden nicht in Forks kopiert, daher bleiben Forks geschützt. Die aktuelle offizielle Website nutzt diese Ausnahme unter `https://brico-hams.github.io/Radio-Web-install/` (siehe ADR-014).
   Der erste Push kann vor dem Setzen von `PAGES_ORIGIN` erfolgen: Das ist harmlos, der Abruf vorheriger Daten wird mit Warnung übersprungen.
5. Den Workflow beim ersten Mal manuell starten (*Actions › Pages › Run workflow*).

### Aufgaben des Workflows

- Läuft bei jedem Push auf `main`, täglich um 05:17 UTC und manuell.
- Installiert mit `npm ci --ignore-scripts`, führt `npm test` aus, baut `dist/` und erzeugt `dist/data/satellites.json` mit `scripts/fetch-satellites.cjs`.
- Minimale Berechtigungen (`contents: read`, `pages: write`, `id-token: write`), keine Geheimnisse; jede Aktion ist auf einen Commit-SHA festgelegt.

### Satelliten

`scripts/fetch-satellites.cjs` fragt SatNOGS für die NORAD-IDs aus `data/satellites.config.json` ab (25544, 27607, 43017 und 43678). Schlägt ein Satellit fehl oder ist sein TLE ungültig, bleiben dessen letzte gültige Daten aus der vorherigen Datei erhalten; die Webanwendung warnt, wenn `fetchedAt` älter als 7 Tage ist. Quellenangabe: SatNOGS DB / Libre Space Foundation, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Sicherheit der statischen Website

Jede HTML-Datei enthält eine CSP in `<meta>` (keine Inline-Skripte oder -Stile; `connect-src` nur `'self'` und `https://api.github.com`), und die Anwendung verweigert den Betrieb in Frames, da GitHub Pages keine eigenen Header erlaubt. Es gibt keine Konten, Uploads oder Telemetrie. RadioID wird nicht repliziert; RepeaterBook ist im Web nicht verfügbar.

Verfügbare Installer erscheinen auf [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases). Für eine neue Veröffentlichung erstelle und pushe ein Tag `v*`; GitHub Actions prüft das Projekt, lädt Node.js-22-Laufzeitumgebungen mit Prüfsummenprüfung herunter und hängt Installer sowie `SHA256SUMS` an. Releases enthalten `.deb` für amd64/arm64/armhf, `PKGBUILD` für Arch, einen FreeBSD-Installer als Tarball und ein Windows-11-x64-ZIP. Das erste Release muss durch Push eines Tags veröffentlicht werden; dieses Repository erstellt oder pusht Tags nicht automatisch.

## Projekt exportieren

Die [Anforderungsprüfung](ESTADO-ENTREGA.md) nennt implementierte und
ausstehende Punkte. Solange sie unvollständig bleibt, erfordert der Export
`--beta`: Er erzeugt einen Entwicklungsstand, keine zertifizierte
Endauslieferung. Er baut keine Installer, veröffentlicht nichts und
programmiert kein Funkgerät.

Mit Node.js 22+, Git und den Archivwerkzeugen des Systems:

```powershell
npm run export:project -- --beta `
  --firmware 'C:\ruta\Multiboot\Bricohams' `
  --installers 'C:\ruta\instalables-verificados' `
  --android 'C:\ruta\Android-0.8.1-beta' `
  --output 'C:\ruta\entregas\Bricohams-desarrollo.zip'
```

Das Ziel muss eine neue ZIP-Datei sein. Windows verwendet `tar.exe`
(bsdtar), Linux/FreeBSD benötigen `zip`. Das Werkzeug verwendet ein eigenes
temporäres Verzeichnis und räumt es am Ende auch bei Fehlern auf.

Sind keine neu gebauten Desktopinstaller verfügbar, ersetze `--installers`
durch `--without-installers`. Diese ausdrückliche Auslassung ist nur für
Beta-Snapshots vorgesehen: Das Manifest vermerkt
`desktopInstallersIncluded: false`, und es gibt keinen Ordner `installers`.
Alte Pakete werden nicht als neue wiederverwendet. Die mit `--android`
angegebene APK wird dennoch separat geprüft und aufgenommen.

Inhalt:

- `android`, wenn `--android` angegeben ist: Beta-Debug-APK, Test-APK,
  Anleitung, Lizenzen, Buildmanifest und SHA256SUMS einer mit
  `scripts/build-android.ps1` erstellten Auslieferung. Prüft sämtliche
  Hashes, fehlerfreie Hosttests, Lint ohne Fehler sowie exakte
  Übereinstimmung jeder Android-Quelle mit `project`, ohne fehlende oder
  doppelte Dateien. Vergleicht auch Version und Anleitung. Gehört die APK
  zu älteren Quellen, wird abgebrochen: vor dem Export neu bauen.
  Kennzeichen für Instrumentierungs- und Hardwaretests bleiben erhalten;
  sie werden nicht zu ausgeführten Tests umgedeutet. Kryptografische
  APK-Signaturprüfung ist Aufgabe des Builders; der Exporter prüft
  Integrität und deklarierte Herkunft, führt die APK aber nicht aus.
  Ohne `--android` vermerkt das Manifest `android: null`; es wird keine
  APK aufgenommen und keine Auslieferung mit Android-Installer behauptet.

- `project`: aktuelle Quellen, einschließlich neuer, nicht von Git
  ignorierter Dateien, Dokumentation und Werkzeuge. Installierte
  Abhängigkeiten fehlen: Nach dem Entpacken `npm ci --ignore-scripts`
  ausführen. Studio wird über `npm run fetch:studio` anhand der Lockdatei
  abgerufen; Installer enthalten es hingegen.
- `history.bundle`: HEAD-Verlauf, wiederherstellbar mit
  `git clone history.bundle historial`. Noch nicht committete Änderungen
  liegen in `project`, nicht im Bundle. Das Manifest nennt Revision und
  Dirty-Status.
- `firmware`: alle Unterordner des angegebenen Stamms mit
  `artifacts/build-info.json`, deren verifizierte Artefakte und die Quellen
  ihres isolierten Klons. Prüft SHA256SUMS, Upstream-Revision und
  deklarierte Quellhashes. Geänderte Quelle oder ungültiges Manifest
  führen zum Abbruch. Ziele ohne Artefakte gelten als ausgeschlossen,
  nicht als Builds. Enthält ein historischer Ordner nur direkt abgelegte
  Artefakte (z. B. Fusion/Labs), wird abgebrochen statt die Firmware
  auszulassen: Suche den Originalbuild mit `source` und `artifacts` in
  `firmware-builds`. Vollständige Builds vor dem Export in einem
  Auslieferungsstamm sammeln.
- `installers`: in SHA256SUMS des angegebenen Ordners aufgeführte Pakete.
  Muss Windows x64, Debian amd64/arm64/armhf, Arch-Rezept und -Quellen sowie
  FreeBSD amd64 enthalten. Prüft Integrität, nicht Ausführung oder
  Revisionsherkunft: zuerst bauen und testen. Keine alten Versionen
  mischen, um eine neue Auslieferung vorzutäuschen.
- `export-info.json` und `SHA256SUMS`: Inventar, Größen, Hashes, Revisionen,
  enthaltene/ausgeschlossene Builds und Warnung zum unvollständigen Stand.

Aus dem Projektbaum werden weder `.git`, `.env`, Schlüssel/Zertifikate,
Caches, `node_modules`, `dist`, Funkgerätesicherungen noch heruntergeladene
Daten kopiert. Aus `data` wird nur `satellites.config.json` aufgenommen.
Die fremde Multiboot-Bibliothek, Gerätekalibrierungen und
Browserkonfiguration werden nicht kopiert. Firmware- und Installerordner
müssen Buildausgaben sein, keine persönlichen Datenordner. Prüfe vor dem
Teilen auch den Git-Verlauf: Ein aktuell ausgeschlossenes Geheimnis bleibt
in alten Commits erhalten. Ausschlüsse ersetzen diese Prüfung nicht und
erlauben keine Weiterverteilung von Komponenten ohne deren Lizenzen.

In einen neuen Ordner entpacken und innerhalb von `Bricohams` prüfen:

```sh
sha256sum --check SHA256SUMS
```

Vergleiche in PowerShell jede Zeile mit `Get-FileHash -Algorithm SHA256`
oder gehe die Pfade anhand von `export-info.json` durch und prüfe Größe
und SHA-256. Prüfe auch den vom Exporter angezeigten ZIP-Hash. Keiner
dieser Hashes ist eine digitale Signatur. Entpack-/Starttest und
Funktionsabdeckung bleiben eigenständige Auslieferungsbedingungen.

## Nicht unterstützte Bereitstellungen

- **Anderes statisches Hosting als GitHub Pages:** nicht getestet. Für Pages siehe oben.
- **Lokales Netzwerk oder Internet:** würde HTTPS, Authentifizierung, geänderte `Host`-Prüfung und CSRF-Prüfung erfordern. Nicht unterstützt: Zugangsdaten und Funkgerätedaten wären offengelegt.
- **Container:** WebUSB/Web Serial laufen im Browser des Hosts. Ein Container würde nur den Server bereitstellen und den Zugriff auf `127.0.0.1` erschweren.

## Deinstallation

Exportiere zuerst deine Sicherungen und beende nur den wie oben identifizierten Serverprozess.

- **Windows:** Ordner `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` und Startmenüverknüpfung (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bricohams Radio Workspace.lnk`) löschen. Der ZIP-Installer registriert keinen Deinstaller unter „Installierte Apps“.
- **Debian/Ubuntu/Raspberry Pi OS:** `sudo apt remove bricohams-radio-workspace`.
- **Arch:** `sudo pacman -R bricohams-radio-workspace`.
- **FreeBSD:** Der Installer registriert kein Anwendungspaket in `pkg`. Nur `/usr/local/libexec/bricohams-radio-workspace` und `/usr/local/bin/bricohams-radio` als root löschen. Node nicht deinstallieren, wenn andere Anwendungen es verwenden.
- **Quellcode:** Repositorykopie und gegebenenfalls zugehörige geplante Aufgabe oder Benutzerdienst löschen.

Die Deinstallation löscht keine Browsersicherungen. Falls du auch diese löschen möchtest, **exportiere zuerst die Dateien** und lösche danach die Websitedaten für `http://127.0.0.1:8787` im Browser. Linux-/FreeBSD-Benutzerprotokolle können nach Prüfung separat gelöscht werden.
