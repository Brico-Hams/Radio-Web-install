# Deployment

Two deployments are supported: **local** (a Node server on the computer connected to the radio) and **public web on GitHub Pages** (a static site; see [Public web on GitHub Pages](#public-web-on-github-pages)).

## Requirements

The official public entry point is <https://brico-hams.github.io/Radio-Web-install/>. Share this URL, not old copies or local previews. `index.html` declares this canonical URL; tool and help pages are sections of the same site, not alternative versions.

- Node.js 22 or later **only for running from source, Arch, and FreeBSD**. The `.deb` packages and Windows ZIP include Node.
- Git only for cloning and updating an installation from source.
- Desktop Chrome, Edge, or Brave, for WebUSB/Web Serial. Firefox and Safari are not supported.
- The USB drivers required by the radio: see [Help › Drivers](../../../ayuda.html#drivers).

## Installing from source

```powershell
git clone https://github.com/Brico-Hams/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Open <http://127.0.0.1:8787>. If you open `localhost`, the server redirects to `127.0.0.1`: it validates the `Host` header and serves only that origin. Always use the same origin to retain IndexedDB history.

To include Bricohams Quansheng Studio in the local copy, run `npm run fetch:studio`. It downloads `studio.html` from `Brico-Hams/Bricohams-Studio` at the commit pinned in `studio.lock.json`, and checks its size and SHA-256. The file is not tracked because it contains embedded firmware.

**Updating Studio (author):** once the new commit is on GitHub, run `node scripts/fetch-studio.cjs --update <commit-completo>`. The command rewrites `studio.lock.json` with the size, SHA-256, and CSP hashes of its scripts. Review the diff and commit the lock file.

`--ignore-scripts` prevents third-party installation scripts from running. The `satellite.js` version is pinned in `package-lock.json`.

## Verification

```powershell
npm test
npm run check
```

Both commands must finish without failures. Then open the help page and check that the Bricohams logo is displayed.

## Local installers

Download your system's file and `SHA256SUMS` from the **Assets** of the [latest Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest). Packages have been published since `v0.3.0`. The automatic “Source code (zip)” and “Source code (tar.gz)” links are not installers.

| System | File | Installation |
| --- | --- | --- |
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS arm64/armhf | `.deb` for amd64, arm64, or armhf | `sudo apt install ./nombre-del-paquete.deb` (choose only your architecture) |
| Arch Linux | `*-arch.tar.gz` | Extract and run `makepkg -si` (requires `base-devel` and `nodejs`). |
| FreeBSD 14 amd64 | `*-freebsd-amd64.tar.gz` | Extract and run `su -c './install.sh'` (installs `node22` through `pkg` if needed). |
| Windows 11 x64 | `*-windows-x64.zip` | Extract the ZIP and run `powershell -ExecutionPolicy Bypass -File .\Install.ps1`; adds a Start menu shortcut. |

The `.deb` packages and Windows ZIP include Node.js 22. Arch uses its distribution's `nodejs` package. FreeBSD requires `pkg` and the `node22` package. 32-bit Raspberry Pi OS needs an ARMv7 or newer processor. The installer does not configure automatic startup or elevate privileges to start the application.

After installation, launch **Bricohams Radio Workspace** from the applications/Start menu, or run `bricohams-radio` on Arch and FreeBSD. The server is bound to `127.0.0.1:8787`; do not expose it to the network. On FreeBSD, Chromium may not provide WebUSB/Web Serial, so radio access is best-effort.

### Verifying the download

Check the hash before running the installer. In PowerShell:

```powershell
Get-FileHash .\bricohams-radio-workspace-v0.3.0-windows-x64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Compare the complete hash with the line for the same filename in `SHA256SUMS` (case does not matter). On Linux:

```sh
sha256sum bricohams-radio-workspace-v0.3.0-amd64.deb
cat SHA256SUMS
```

On FreeBSD use `sha256 nombre-del-archivo`. Replace the name/version with the file actually downloaded. Do not install if the hash differs. Checksums verify integrity, not a publisher signature: the packages are not code-signed.

### Windows 11 x64

1. Download `*-windows-x64.zip` and **extract all its contents**; do not run the script inside the ZIP.
2. Open PowerShell in the folder containing `Install.ps1`, `Start.ps1`, `app`, and `runtime`.
3. Run as a normal user:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
   ```

4. It installs in `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` and creates **Bricohams Radio Workspace** in the Start menu. No UAC or separate Node installation is needed.
5. Open that shortcut. If your default browser is not Chrome, Edge, or Brave, manually open <http://127.0.0.1:8787> in one of them.

`ExecutionPolicy Bypass` affects only the process running the command; do not permanently change PowerShell policy. Corporate policy may block scripts even with this option: consult your administrator. The current installer is a ZIP with scripts, not a signed `.exe`/MSI, and does not install WinUSB drivers.

### Debian, Ubuntu, and Raspberry Pi OS

Check the **operating system** architecture (not just the processor):

```sh
dpkg --print-architecture
```

Download only the `.deb` with the matching suffix: `amd64`, `arm64`, or `armhf`. 64-bit Raspberry Pi OS uses `arm64`; the 32-bit version uses `armhf` and needs ARMv7 or newer. Raspberry Pi 1 and original Zero/Zero W with ARMv6 are not supported.

From the downloads folder, for an amd64 computer and the initial version:

```sh
sudo apt install ./bricohams-radio-workspace-v0.3.0-amd64.deb
bricohams-radio
```

Replace the filename with your own. Node is included in `/opt/bricohams-radio-workspace`; the launcher also appears in the applications menu. Do not run `bricohams-radio` with `sudo`: browser backups and permissions must belong to your user.

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

Run `makepkg` as a normal user. The `*-arch.tar.gz` archive contains the recipe; `*-arch-source.tar.gz` contains the application that the recipe downloads from the same Release and verifies using SHA-256. It is not a binary package ready for `pacman -U`, nor a package published in AUR. Internet access during the build and Node.js 22 or later are required.

### FreeBSD 14 amd64

```sh
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-freebsd-amd64.tar.gz -C bricohams-installer
cd bricohams-installer
su -c './install.sh'
bricohams-radio
```

Installation needs root and available `pkg` repositories to install `node22` if missing. The program installs in `/usr/local/libexec/bricohams-radio-workspace`, with launcher `/usr/local/bin/bricohams-radio`. Return to your normal user to start it. It is not a native `.pkg` package or an official port. The local server and file editing do not guarantee radio connectivity: that depends on Chromium providing the required USB/serial APIs and permissions.

### First startup, permissions, and shutdown

- Always open <http://127.0.0.1:8787> in the same browser and profile: backups belong to that origin, not the installation folder. The badge should show **Local · installed**.
- Launchers start the server in the background; closing the tab does not stop it. No automatic startup at login is configured. From source, `npm start` stays in the terminal and is stopped with `Ctrl+C`.
- The installer does not configure USB drivers or permissions. See [Help › Drivers](../../../ayuda.html#drivers): WinUSB where applicable on Windows; udev rules and the `dialout`/`uucp` group depending on the Linux distribution. Log out and back in after changing groups, and do not run the browser as root.
- If the port is occupied, identify the process before stopping it. On Windows: `Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess`, then `Get-Process -Id <PID>` and, only if it is the Bricohams server, `Stop-Process -Id <PID>`. On Linux use `ss -lptn 'sport = :8787'`; on FreeBSD, `sockstat -4 -l`. Confirm the PID's command and user, and stop only that process with `kill <PID>`.
- Linux/FreeBSD logs are in `${XDG_STATE_HOME:-$HOME/.local/state}/bricohams-radio/server.log`. On Windows, if startup fails, run `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\runtime\node.exe" "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\app\server.cjs"` from PowerShell to see the error.
- Internet access is not needed to serve the interface and edit local files. Provider queries and firmware downloads do require it.

## Configuration

| Variable | Use |
| --- | --- |
| `RB_USER_TOKEN` | Application token approved by RepeaterBook (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | User-Agent registered during approval. |
| `RB_APPROVED` | Must be `yes` to enable the feature. |

Only the server reads these variables. Do not save them in the repository. Port `8787` and interface `127.0.0.1` are fixed in `server.cjs` for security.

PowerShell example for source installations, valid only for the current session:

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

If using the installed ZIP, set these variables in PowerShell and run `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\Start.ps1"` from that same session. Stop any running server first: an existing process retains its previous environment. There is not yet a settings screen that saves these keys; do not paste them into the browser or public files.

## Updating

**Installers:** first export `.rwb.json` backups, stop the server, and download/verify the new Release. On Windows rerun the extracted installer; on Debian/Ubuntu/Raspberry Pi use `sudo apt install ./nuevo-paquete.deb`; on Arch rebuild the new recipe with `makepkg -si`; on FreeBSD run the new `install.sh`. Restart the launcher and reload the browser. Published releases do not change when `main` is updated; fixes require another version.

**Source code:**

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Export your backups before updating the browser or clearing site data.

## Multilingual documentation

Help is published in Spanish (original), U.S. English, German, Italian, and French. Translated sources are in `docs/i18n/<idioma>/` (same filename as the original) and `README.<idioma>.md`; `npm run build:help` generates `ayuda-*.html` and `ayuda-*.<idioma>.html` with a language selector. `docs/i18n/<idioma>/F4HWN-PRESETS.md` is generated automatically.

When changing a Spanish document, update all four translations and check that headings, code blocks, inline code, table rows, images, and links are retained:

```powershell
node scripts/i18n.cjs --fix --strict
npm run build:help
```

`--fix` adjusts relative link and image paths for each translation's folder and points them to the sibling translation. It also repairs anchors for translated Markdown headings; HTML help keeps stable anchors across languages. Validation includes architecture, branding, decisions, and deployment. The reference index is generated from every guide's translated title and links each language version, including U.S. English. The complete help and FAQ center is available in Spanish, U.S. English, French, and German; its translations are generated from the Spanish HTML and versioned translation resources. Strict validation also checks complete coverage and that the generated HTML is up to date. Italian guides and the index remain available; their help-center link uses the Spanish original. Commands and exact diagnostic messages are preserved for troubleshooting. External sources retain the language published by their authors. If the translated text and original disagree, Spanish takes precedence.

## Automatic startup (optional, from source)

Installers already start in the background when the launcher is opened, but not at login. These examples are for a repository copy with Node installed; adapt the paths and do not combine them with another server on the same port.

On Windows, as a scheduled task at login:

```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server.cjs" -WorkingDirectory "C:\ruta\Radio-Web-install"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Bricohams Radio Workspace" -Action $action -Trigger $trigger
```

On Linux, as a systemd user service (`~/.config/systemd/user/bricohams-radio.service`):

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

Enable it with `systemctl --user enable --now bricohams-radio`.

<a id="web-pública-en-github-pages"></a>
## Public web on GitHub Pages

The static site is generated with `npm run build:pages` (`dist/` folder) and published by `.github/workflows/pages.yml`. It does not include `server.cjs`: `runtime.json` is `{"mode":"web"}` and the application runs in web mode (see [Architecture](ARCHITECTURE.md#runtime-modes)).

### Why a dedicated origin

IndexedDB (radio backups) and `localStorage` (profile) are isolated by
origin, not by path. The initial recommendation was a dedicated account at
`https://<org>.github.io/`. The current site,
`https://brico-hams.github.io/Radio-Web-install/`, uses the shared-origin
exception: it shares storage with other projects on
`brico-hams.github.io`, including Bricohams Studio. Do not present a
subpath as isolation. Export backups outside the browser; changing
origins does not automatically migrate profile data. All client paths
remain relative.

### Steps (performed by the author)

1. Create the account or organization `<org>`.
2. Create the `<org>.github.io` repository and upload this code (pushing requires explicit author confirmation).
3. In *Settings › Pages*, choose “GitHub Actions” as the source and enable “Enforce HTTPS”.
4. Create the Actions variable `PAGES_ORIGIN` with `https://<org>.github.io` (no trailing slash). The workflow uses it to retrieve the previous `data/satellites.json`.
   The workflow runs only in the `<org>/<org>.github.io` repository (`if: github.repository == ...` guard): elsewhere it is skipped to avoid publishing under a shared origin that would expose backups and the profile (IndexedDB) to other pages.
   Deliberate exception: if the author accepts a shared origin, create the repository variable `PAGES_SHARED_ORIGIN_ACCEPTED` with value `true`. Variables are not copied to forks, so a fork remains protected. The current official site uses this exception at `https://brico-hams.github.io/Radio-Web-install/` (see ADR-014).
   The first push may run before `PAGES_ORIGIN` is defined: this is harmless; previous-data retrieval is skipped and a warning is issued.
5. Run the workflow manually the first time (*Actions › Pages › Run workflow*).

### What the workflow does

- Runs on each push to `main`, daily at 05:17 UTC, and manually.
- Installs with `npm ci --ignore-scripts`, runs `npm test`, builds `dist/`, and generates `dist/data/satellites.json` with `scripts/fetch-satellites.cjs`.
- Minimal permissions (`contents: read`, `pages: write`, `id-token: write`), no secrets, and each action pinned by commit SHA.

### Satellites

`scripts/fetch-satellites.cjs` queries SatNOGS for the NORAD IDs in `data/satellites.config.json` (25544, 27607, 43017, and 43678). If a satellite fails or its TLE is invalid, it retains that satellite's last known good data from the previous file; the web application warns when `fetchedAt` is older than 7 days. Attribution: SatNOGS DB / Libre Space Foundation, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Static site security

Each HTML file contains a CSP in `<meta>` (no inline scripts or styles; `connect-src` allows only `'self'` and `https://api.github.com`), and the application refuses to run inside a frame because GitHub Pages does not allow custom headers. There are no accounts, uploads, or telemetry. RadioID is not replicated, and RepeaterBook is unavailable on the web.

Available installers are published on [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases). To generate a new release, create and push a `v*` tag; GitHub Actions validates the project, downloads Node.js 22 runtimes while verifying checksums, and attaches installers along with `SHA256SUMS`. Releases include `.deb` amd64/arm64/armhf, `PKGBUILD` for Arch, a FreeBSD installer tarball, and a Windows 11 x64 ZIP. The first release must be published by pushing a tag; this repository does not create or push tags automatically.

## Exporting the project

The [requirements review](ESTADO-ENTREGA.md) lists implemented features
and outstanding work. While it remains incomplete, export requires `--beta`:
it generates a development snapshot, not a certified final delivery.
It does not build installers, publish, or program any radio.

With Node.js 22+, Git, and the system's archive tools:

```powershell
npm run export:project -- --beta `
  --firmware 'C:\ruta\Multiboot\Bricohams' `
  --installers 'C:\ruta\instalables-verificados' `
  --android 'C:\ruta\Android-0.8.3-beta' `
  --output 'C:\ruta\entregas\Bricohams-desarrollo.zip'
```

The destination must be a new ZIP. Windows uses `tar.exe` (bsdtar);
Linux/FreeBSD need `zip`. The tool uses its own temporary directory
and cleans it up on completion, including after errors.

If rebuilt desktop installers are unavailable, replace `--installers`
with `--without-installers`. This is an explicit omission for Beta
snapshots only: the manifest records `desktopInstallersIncluded: false`
and there is no `installers` folder. Old packages are not reused as new.
The APK specified by `--android` is still included and checked independently.

Contents:

- `android`, when `--android` is specified: Beta debug APK, test APK,
  guide, licenses, build manifest, and SHA256SUMS from a delivery created
  by `scripts/build-android.ps1`. Checks all hashes, host tests with no
  failures, lint with no errors, and exact correspondence of every Android
  source with `project`, without missing or duplicate files.
  Also compares the version and guide. If the APK belongs to earlier
  sources, it aborts: rebuild before exporting. Preserves instrumentation
  and hardware test flags; it does not turn them into executed tests.
  Cryptographic APK signature verification is the builder's responsibility;
  the exporter checks integrity/declared provenance, not APK execution.
  Without `--android`, the manifest records `android: null` and no APK is
  included; it is not presented as a delivery with an Android installer.

- `project`: current sources, including new files not ignored by Git,
  documentation, and tools. Installed dependencies are excluded:
  run `npm ci --ignore-scripts` after extraction. Studio is retrieved with
  `npm run fetch:studio` using the lock; installers do include it.
- `history.bundle`: HEAD history, recoverable with
  `git clone history.bundle historial`. Uncommitted changes are in
  `project`, not the bundle. The manifest indicates revision and dirty state.
- `firmware`: all subfolders of the specified root containing
  `artifacts/build-info.json`, their verified artifacts, and the sources
  from their isolated clone. Checks SHA256SUMS, upstream revision, and
  declared source hashes. A modified source or invalid manifest aborts.
  Targets without artifacts are listed as excluded, not as builds.
  If a historical folder contains only artifacts directly (for example
  Fusion/Labs), it aborts instead of omitting that firmware: locate its
  original build with `source` and `artifacts` in `firmware-builds`.
  Collect complete builds in a delivery root before exporting.
- `installers`: packages listed in SHA256SUMS in the specified folder.
  Must contain Windows x64, Debian amd64/arm64/armhf, Arch recipe and
  sources, and FreeBSD amd64. Checks integrity, not execution or revision
  provenance: build and test them first. Do not mix in older versions
  to make a delivery appear new.
- `export-info.json` and `SHA256SUMS`: inventory, sizes, hashes, revisions,
  included/excluded builds, and incomplete-state warning.

It does not copy `.git`, `.env`, keys/certificates, caches, `node_modules`,
`dist`, radio backups, or downloaded data from the project tree. From
`data`, it includes only `satellites.config.json`. It does not copy the
separate Multiboot library, radio calibrations, or browser configuration.
Firmware and installer folders must be build outputs, not personal data
folders. Also review Git history before sharing: excluding a current
secret does not remove it from old commits. Exclusions do not replace
that review or authorize redistribution of components without their licenses.

Extract into a new folder and verify inside `Bricohams`:

```sh
sha256sum --check SHA256SUMS
```

In PowerShell, compare each line with `Get-FileHash -Algorithm SHA256`,
or use `export-info.json` to iterate paths and compare size and SHA-256.
Also check the ZIP hash shown by the exporter. None of these hashes is a
digital signature. Extraction/startup testing and functional coverage
remain independent delivery conditions.

## Unsupported deployments

- **Static hosting other than GitHub Pages:** untested. For Pages, see the section above.
- **LAN or Internet:** would require HTTPS, authentication, changes to `Host` validation, and CSRF review. Unsupported: credentials and radio data would be exposed.
- **Containers:** WebUSB/Web Serial run in the host's browser. A container would provide only the server and complicate access to `127.0.0.1`.

## Uninstalling

First export your backups and stop only the identified server process as explained above.

- **Windows:** delete `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` and its Start menu shortcut (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bricohams Radio Workspace.lnk`). The ZIP installer does not register an uninstaller in “Installed apps”.
- **Debian/Ubuntu/Raspberry Pi OS:** `sudo apt remove bricohams-radio-workspace`.
- **Arch:** `sudo pacman -R bricohams-radio-workspace`.
- **FreeBSD:** the installer does not register an application package in `pkg`. Delete only `/usr/local/libexec/bricohams-radio-workspace` and `/usr/local/bin/bricohams-radio` as root. Do not uninstall Node if other applications use it.
- **Source code:** delete your repository copy and, if configured, its scheduled task or user service.

Uninstalling does not remove browser backups. If you also want to delete them, **export the files first**, then clear site data for `http://127.0.0.1:8787` in the browser. Linux/FreeBSD user logs can be deleted separately after reviewing them.
