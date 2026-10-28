<img src="bricohams-logo.png" alt="Bricohams" width="240" height="89">

<p><a href="README.md">Spanish</a> · <a href="README.en.md">English (US)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.fr.md">Français</a></p>

# Bricohams Radio Workspace

Two workspaces with their own WebUSB/Web Serial connectors, local operations, and automatic backup before enabling writes.

## Quansheng: prebuilt catalog, viewer, and RF log

- Nine v6.1.0 images served with the website: Bricohams ARDF, Satellite,
  Spectrum, Labs, and Fusion, plus official F4HWN Fusion, FieldOps, Transfer, and Labs.
  No build or folder selection is required. SHA-256, size,
  and structure are checked before preparing a slot; installation still requires a backup.
- LCD viewer at startup, automatic start on connection, pause before
  any operation, and PNG capture. The port is shared without two readers.
- Short/long remote keyboard, no PTT, with a full backup,
  manual enablement, and key-by-key confirmation. F1/F2 may perform transmit functions
  depending on the radio; UART transmission does not mean execution was confirmed.
- Native restart with literal confirmation, no retries or slot change;
  closes the port and revokes permissions. Manually check startup.
- RF log v2 at the end with history and safe CSV export. Only data
  received from firmware; no UTC dates or calibrated measurements are invented.
- Catalog of six upstream Labs apps v6.1.0 with SHA-256, FAP1, and ABI/API
  verified: preparing or downloading does not install or run them. Includes SystemInfo,
  BroadcastFM, and four games/demos; no beacons or emergency apps.
- Native maintenance: PNG/BIN logo, calibration and external Flash backup/restore,
  with reread and calibration-sector protection.
- Two-step native factory assistant: verified stock Flash and DFU
  by model, with a full backup and explicit confirmations. Stock images
  are downloaded from pinned official links and validated by SHA-256.
  Tested in simulation; the physical unit has not been factory-reset.
- Own-tools panel with internal shortcuts, without delegating operations
  to UV Studio: main DFU v6/v7, maintenance, apps, slots, and RF.
- PY32 main DFU: v6 BIN or v7 FWAT/FWA1 package, with backup and two
  confirmations. Does not synchronize external Main or certify startup.
- External v7 resources: CRC and Build ID must match the active firmware;
  header at the end and firmware validation. Installed separately
  after DFU and creating a new backup. Support tested in simulation.
- Local RF filters by name/frequency/event and CSV/JSON export,
  without inventing UTC event times or calibrated RF measurements.
- The four Bricohams slots on the test unit were written on
  2026-10-26, with CRC and preservation of Main/configuration/calibration.
  Startup and manual functional tests per slot are still pending.
  The viewer received 24 LCD frames and one RF frame over COM4 with DTR active;
  no stored RF history was received.

Catalog and licenses in `precompiled/`; regeneration by the maintainer:
`npm run publish:firmware`. Requires the five pinned local builds
and access to the official publication; this is not a requirement for end users.
Instructions and limitations in [Quansheng help](docs/i18n/en/AYUDA-QUANSHENG.md).

## AnyTone Beta: web preparation

The new [AnyTone section](anytone.html) prepares a **portable project**, not a
proprietary RDT or a CSV certified for the CPS of a specific version.
It does not implement USB programming or modify the radio.

- Initial set: the same 16 PMR446 channels as the other families, RX only.
- Imports standard 128 KiB OpenGD77 binaries and Quansheng
  F4HWN v6 configurations. Preserves nominal RX/TX; CC/TS and the known group
  contact TG in OpenGD77. Omits non-FM Quansheng modes without confusing AM with DMR.
- Imports authorized RepeaterBook JSON, reuses the existing normalizer
  for FM/DMR, and filters for Spain. No verified national list is included.
  Unpublished TS/TG values remain pending: they are never inferred from frequency.
- Also supports the RadioID `rptrs` registry: Spain, ACTIVE status,
  valid offset and CC. Uses published TS/TG; if only TS is published,
  TG0 remains pending. ACTIVE is a registry status, not proof of RF.
- Supports the URE JSON `items` list of repeaters (not beacons): converts
  only FM mode and frequencies/offsets with explicit units.
  Preserves the published tone as a note without enabling it. URE warns
  that the list may contain outdated data; check with the holder.
- Edits and deletes channels, organizes zone tags, and exports reopenable
  JSON and exchange CSV. All channels are locked for TX.
- D868/D878/D578 profiles are groupings for preparing data, not a
  certification of variants or limits. Airband AM is enabled only with the Other
  profile and manual confirmation that AM is supported by the exact radio.
- Airports: JSON `{"results":[{"name":"SERVICIO","frequencyMHz":"123.45000",
  "source":"Referencia AIP vigente"}]}`. This is a format example, not an
  airport assignment. Uses RF frequencies, not 8.33 channel designators,
  and cross-checks each service with [AIP ENAIRE](https://aip.enaire.es/).
- Export before leaving; there is no automatic save. Do not publish projects
  from your unit. Tones, private contacts/RX lists, DMR ID, model-specific limits,
  and proprietary settings require review in the correct CPS.

To produce a native national codeplug, the exact model/firmware and
current authorized repeater and airport sources are still needed. Frequencies
are not invented, and empty repeater coverage is not described as complete.

## Custom firmware: ARDF, Satellite, and Spectrum Beta images

The builder accepts `--module ardf` to include an own cycle core and
keyboard/display adapter in Fox Hunt resident on F4HWN v6.1.0
Multiboot. The new ARDF image records manual observations with 8
(counter, first/last relative instant, and attenuation per beacon) and allows
query/export as JSON over USB/UART from the web, without GPS or automatic location.
It retains the last session in RAM on exit; it is cleared on restart
or reconfiguration. A second image, `--module satellite`, applies manual Doppler
for RX only, with adjustable radial velocity, corrected-frequency display,
and output through the upstream RF restore flow. It does not include TLE/SGP4 or
autonomous orbital tracking. The new Satellite image includes its own experimental RX
CAT, enabled with 8 in SAT RX, with a 3-second lease
and a web panel for query/temporary tuning. It does not control TX or modify
channels, tones, or power. The radio does not calculate orbits on its own.
The browser now supports RX tracking of the selected pass with SGP4 and
CAT renewal, stopping manually/on hiding the page and when the pass ends.
Requires physical enablement and has been tested with simulated transport,
not on RF. It does not automatically start future passes or load TLE into the MCU.
The builder requires separate images.
This is not Karina or 100% equivalence. The current images measure
113960 bytes (ARDF with statistics) and 113868 bytes (Satellite with CAT);
both were written to slots and CRC-verified, with manual startup still pending;
eight native C suites test the cores and adapters with simulated RF.
The third image, `--module spectrum`, connects the custom core to the receiver
and display: 128 RSSI points, peak hold, average, pause, and eight RAM presets.
The presets do not survive exit/power-off and do not write EEPROM.
PTT captures the strongest measured point in its own VFO-PRO RX view,
with step tuning, direct RX entry, audio, and RX gain adjustment;
it does not transmit or edit calibration. Supports centering new windows and
cycling through RAM presets, with up to 16 exact session exclusions
and optional CTCSS/DCS search on FM capture, without saving tones.The prebuilt image with boot logo and preset transfer measures 118040 bytes. It lets
presets be saved in local BHSP files and restored to RAM with the
scan paused, atomic validation, and reread; it does not write EEPROM.
Real-world detection remains
pending validation. New builds include a Beta welcome message and a
monochrome logo embedded in LOGO mode, without overwriting the external logo
or changing startup preferences.
See [build, controls, licenses, and limitations](docs/i18n/en/BRICOHAMS-FIRMWARE.md#new-independent-ardf-core).

**BETA - under validation and testing.** **PRO Mode**, explicitly enabled for this session,
avoids repetitive confirmations when pressing operations, but does not remove USB permissions,
full backup, hardware/firmware checks, hashes, CRC, reread, or Main protection. It does not enable writes with partial copies.

**Real UV-K5 V3 test (declared model), F4HWN v6.0.0:** identification, calibration, configuration with 200 channels, and query of five slots succeeded on COM4; calibration/configuration matched in two independent reads. The physical Flash command does not respond in v6.0. This version's automatic backup is corrected to preserve read-only access and save a partial copy, rather than invalidate the connection by attempting an unavailable command. No physical data has been written/deleted. Details and procedure in [Quansheng help](docs/i18n/en/AYUDA-QUANSHENG.md).

## Documentation

[Complete documentation and reference index by language](ayuda-referencias.en.html).

### Bricohams Beta for Android

The native 0.8.3-beta APK includes editable local contacts with search and ADIF import with preview, ADIF/JSON export, ARDF sessions with history, statistics, filtered GPS segments and point GPS observations, and experimental text and PCM WAV Morse. It includes temporary RX CAT over USB CDC ACM and recognized CH34x/CP210x/FTDI/Prolific adapters. Calculates SGP4 passes offline with imported TLE and supports RX Doppler tracking of the selected pass. Captures microphone audio in the foreground for up to 60 s for subsequent Morse or Robot36 decoding; this is not continuous decoding. Includes F4HWN v6 channel editing with full verified backup and readback; no LoTW upload. Decodes experimental Robot36 SSTV from WAV and exports PNG. Builds for Android 8.0+;
host tests do not replace tests on a phone.
See [features, permissions, build, and limitations](docs/i18n/en/ANDROID.md).

VersionCode 12 preserves the 0.8.0 activity logbooks (General/POTA/SOTA), quick entry and duplicate confirmation, satellite selection, polar pass radar, offline world map, full-pass WAV recording, and SSTV image search. Optional CelesTrak/SatNOGS updates run on opening, every 24 h. The map appears without GPS permission or an observer; pass predictions require your saved location. Cached valid TLE work offline, and saved selections are preserved. Controls and validation are localized. Host tests, lint, and APK 0.8.3 passed CI with JDK 17/SDK 35; physical phone installation and permissions remain untested.

| Document | Contents |
| --- | --- |
| [Delivery status](docs/i18n/en/ESTADO-ENTREGA.md) | Review of all requests, evidence, outstanding items, and publication and export conditions |
| [Help and support](ayuda.en.html) (in the app: <http://127.0.0.1:8787/ayuda.html>) | Getting started, USB drivers (unofficial support), common errors, and frequently asked questions |
| [Complete firmware library](ayuda-firmwares.en.html) / [Markdown index](docs/i18n/en/AYUDA-FIRMWARES.md) | Guides by family, model, revision, and version: F4HWN, ARDF, Karina, Bricohams, and OpenGD77; menus, FM/DMR configuration, and every catalog option with an ON/OFF matrix. Included offline in installers and the local server. Regenerate with `npm run build:help`. |
| [Quansheng from 0 to 100%](docs/i18n/en/AYUDA-QUANSHENG.md#getting-started-from-0-to-100) | Complete phased path: identify, backups, choose and flash firmware, basic settings, channels, scanning, multiboot, verification, and recovery |
| [UV-K5 V3 / UV-K1 technical atlas](docs/i18n/en/ATLAS-UV-K5-V3.md) (web: [ayuda-atlas-uv-k5-v3.html](ayuda-atlas-uv-k5-v3.en.html)) | Internal hardware: PY32F071 pinout, internal and external Flash, EEPROM map, serial protocol, DFU bootloader, SWD, build, mods, schematics, teardown photos, and verified repositories |
| [Baofeng DM-32UV](docs/i18n/en/DM32UV-FIRMWARE.md) (web: [ayuda-dm32uv.html](ayuda-dm32uv.en.html)) | HR_C7000/FD6818 hardware, OpenGD77 status and license on the DM-32, installation and backups, how to build the open RadioFoundry firmware, and bootloader protocol |
| [Karina](docs/i18n/en/KARINA.md) / [community repositories](docs/i18n/en/ENLACES-COMUNIDAD.md) | Search for Karina source code (closed source), functional specification for reimplementing it, and verified catalog of Quansheng and DM-32UV repositories |
| [Examples](docs/i18n/en/EJEMPLOS.md) / [third-party hashes](docs/i18n/en/BINARIOS-TERCEROS.md) | `examples/`: open firmware (F4HWN v6.3.0, moto) with its license, PMR446 channels, and analysis scripts; SHA-256 index and origin of third-party binaries, which are not redistributed |
| [docs/ARCHITECTURE.md](docs/i18n/en/ARCHITECTURE.md) | Components, data flow, modules, and security layers |
| [docs/DECISIONS.md](docs/i18n/en/DECISIONS.md) | Architecture decisions and why each technology was chosen |
| [docs/DEPLOYMENT.md](docs/i18n/en/DEPLOYMENT.md) | Installation, configuration, updates, and unsupported deployments |
| [docs/BRANDING.md](docs/i18n/en/BRANDING.md) | Bricohams brand: logo, palette, typography, and tone |
| [AUTHORS.md](AUTHORS.en.md) | Authors |
| [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.en.md) | Acknowledgments, sources, and third-party licenses |
| [SUPPORT.md](SUPPORT.en.md) / [SECURITY.md](SECURITY.en.md) | Support and private vulnerability reporting |

## Getting started

### Providers in the installed version

- **Repeaters > Configure RepeaterBook API**: enter the `rbuapp_` token,
  approved User-Agent with contact information, and confirm approval. This is applied only to
  server memory until it restarts. The token is not returned or
  stored in the browser. Existing environment variables remain
  another way to configure it persistently. Never put tokens in URLs.
- **DMR Contacts > Automatic DMR download**: downloads and imports into the open local codeplug
  a RadioID batch of 1-10 pages, limited to 1024 contacts.
  Adjust country/region to avoid exceeding capacity; if a page fails, it is not
  partially imported. This is not a bulk callsign database.
- **BrandMeister rooms/groups**: queries the public list by TG prefix
  (`214` for Spain). They are imported as group calls, not private contacts,
  with the name `TG` plus number. Does not enable hotspot subscriptions
  or assign groups to channels. Does not integrate DMR+/TGIF or rooms from other networks.
- **Quansheng > SAT / passes**: updates TLE, queries an FM frequency,
  calculates the pass, and prepares Doppler memories. Select an FM template
  from the read configuration and click **Load prepared SAT / Doppler into
  Quansheng configuration**. These are stepped RX memories, not native orbital loading
  or control of the firmware Doppler module. Save the binary;
  writing still requires a full backup.

Automatic means running the batch when clicked, not silent downloads at
startup or periodic synchronization. RadioID and the authenticated RepeaterBook API
require the installed server. BrandMeister also supports direct lookup
in Pages; RepeaterBook allows authorized JSON import without installation.

Requires Node.js 22+. The only runtime dependency is `satellite.js` 6.0.1 (MIT), for SGP4 orbital propagation; it is served from the computer, not a CDN. In a fresh repository checkout:

```powershell
npm ci --ignore-scripts
npm start
```

Open <http://127.0.0.1:8787>. Always use the same origin to preserve IndexedDB history. Chrome or desktop Edge recommended. Opening the HTML files lets you read the guides, but storage and APIs may vary by browser. Automatic firmware downloads require this local Node server; static hosting uses web mode (see below). The server rejects other Hosts/origins: publishing it requires deliberately adapting the HTTPS deployment and its access controls.
## Web mode (GitHub Pages) and local mode

The same application can be used in two ways. At startup it reads `runtime.json`: if it is missing or invalid, it runs in **web mode**; the local server serves it with `{"mode":"local"}`. The top badge shows “Web · GitHub Pages” or “Local · installed.”

| Feature | Web (static site) | Local (`npm start`) |
| --- | --- | --- |
| Radio connection, partial backups, offline editing | Yes; OpenGD77 blocks subsequent processes without a full firmware copy | Same |
| F4HWN firmware | Catalog from `api.github.com`; download the file from the official source and load it: size and published SHA-256 are verified | Server-verified download |
| OpenGD77 firmware | Manually loaded ZIP (name and ZIP format checked; the editor does not publish a hash, SHA-256 is local only) | Server download |
| RadioID contacts | Load `user.csv` from radioid.net (max. 100 MiB, country/zone filter, max. 5000 shown) | API query through the server |
| Profile (callsign + DMR ID) | Optional, only in your browser; marked “(you)” | N/A |
| RepeaterBook | Import authorized JSON; no authenticated query | Yes, with your approved token |
| BrandMeister groups | Direct query by prefix and import into the local file | Query through server |
| Satellites | `data/satellites.json` generated daily from SatNOGS | Live TLE |

Satellite data covers NORAD 25544, 27607, 43017, and 43678 (SatNOGS DB / Libre Space Foundation, CC BY-SA 4.0); a warning appears if it is more than 7 days old. To publish your own copy on GitHub Pages, see [docs/DEPLOYMENT.md](docs/i18n/en/DEPLOYMENT.md).

**OpenGD77 CPS check:** a visible capabilities and limitations matrix
is available on its page. No full parity or automatic complete MCU firmware copy is claimed. Connecting automatically starts calibration and codeplug reads, persists the copy and its hashes, and opens the codeplug for offline work. While the original firmware is missing, subsequent radio operations—including reread and capture—are blocked, also in PRO. A downloaded official image is not a backup of the unit and does not restore the commercial firmware already replaced.
See [web scope and mandatory backup](docs/i18n/en/AYUDA-OPENGD77.md).

### Local installers

Download the [latest Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest) and its `SHA256SUMS` file. Choose an installer from **Assets**, not the automatically generated ZIP/tar.gz files under “Source code.” [Complete local installation guide](docs/i18n/en/DEPLOYMENT.md#local-installers).
After installation, to prepare a Quansheng, follow [getting started from 0 to 100%](docs/i18n/en/AYUDA-QUANSHENG.md#getting-started-from-0-to-100)
and consult the [UV-K5 V3 technical atlas](docs/i18n/en/ATLAS-UV-K5-V3.md).

- Windows 11 x64: extract the entire `*-windows-x64.zip`, open PowerShell in that folder, and run `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1`. Node.js included, no administrator privileges; launch the app from the Start menu.
- Debian, Ubuntu, and Raspberry Pi OS: check `dpkg --print-architecture`, download **only** the `.deb` for your architecture (amd64, arm64, or armhf), and run `sudo apt install ./nombre-del-paquete.deb`. Node.js included; armhf requires an ARMv7 CPU or later. Open the app from the menu or run `bricohams-radio`.
- Arch Linux: install `base-devel` and `nodejs` with pacman, extract `*-arch.tar.gz`, review `PKGBUILD`, and run `makepkg -si` as a regular user. Start with `bricohams-radio`.
- FreeBSD 14 amd64: extract `*-freebsd-amd64.tar.gz`, enter the folder, and run `su -c './install.sh'` (install Node 22 with `pkg` if missing). Start with `bricohams-radio` as a regular user.

All installers include **Bricohams Quansheng Studio** (UV-K1 / UV-K5 V3 with F4HWN Fusion 6), from the [Brico-Hams/Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio) repository. It opens at <http://127.0.0.1:8787/studio.html> or from the Quansheng workspace. The copy is downloaded when packaging, at the commit and SHA-256 pinned in `studio.lock.json`, and the server checks it again before serving. It is served with its own CSP that only allows its scripts by hash and prevents it from connecting to the network. From source, run `npm run fetch:studio` once. In web mode, the link opens the [public Studio page](https://brico-hams.github.io/Bricohams-Studio/).

Check the SHA-256 before installing. Launchers open the default browser and keep the server running in the background only on `127.0.0.1:8787`. If your default browser is incompatible, open that address in Chrome, Edge, or Brave. Closing the tab does not stop the server; it does not start automatically after reboot. Always use the same browser, profile, and origin to preserve your backups. USB drivers are configured separately: [Help](ayuda.en.html#drivers). WebUSB/Web Serial support in Chromium is not guaranteed on FreeBSD.

## Actual support status

| Family | Actual reads | Modifications | Limitations |
| --- | --- | --- | --- |
| OpenGD77 MK22 | Identification, 4096 B calibration, standard 128 KiB codeplug | CPS writing implementation included, **blocked by backup policy** | No verified protocol here to extract the complete MCU firmware. That copy is not simulated or unlocked with downloaded firmware. |
| OpenGD77 STM32 | Identification, 512 B calibration, standard 128 KiB codeplug | Same: writing blocked | Normal OpenGD77 CDC mode, not DFU. Unknown structures are rejected. |
| DM-32 / UV008 with OpenGD77 | Same operations at 115200 baud with Web Serial | Same: writing blocked | No boot ROM, microcode, or stock firmware flashing. |
| Quansheng UV-K1 / UV-K5 V3 PY32F071 with F4HWN v6+ | Identification, 512 B calibration, slot query and CRC | Install/delete slots 1-4 and reset banks 1-4, **only after a verified full copy** | Physical Flash backup requires Labs v6.1+ with 0x0738 commands. Other editions preserve calibration and block writes if the backup cannot be completed. |

There is no full parity with grid.radio or UV Studio. The viewer, keyboard, and Quansheng restart, calibration/Flash restore, stock DFU, main DFU, and external resources have their own native implementation. Stock DFU is pinned to hashes/models; main DFU validates a v6 PY32 BIN or v7 FWAT/FWA1 package and does not synchronize external Main. v7 resources are installed separately with a new backup and matching Build ID; there is no automatic installation or resource support in inactive slots. Labs Apps supports cataloging, exporting, installing, moving to an empty slot, and individual/global deletion with verification. Apps are not run automatically, and account or zone editing is not implemented. `.app` file management is described below. Changing firmware in Multiboot or selecting SetCfg is done on the radio itself; no remote command is invented. Third-party binary licenses remain in effect: independent code does not guarantee freedom from legal risks.

## Codeplug: contacts, repeaters, and satellites

Both pages include a **Codeplug: contacts, repeaters, and SAT** panel. No provider is queried when they open. Queries are explicit actions and pass through the local server; codeplugs, calibration, and radio identifiers are not sent.

### RadioID / OpenGD77 contacts

1. Open a standard 128 KiB codeplug in the editor or read it from your radio.
2. Select **DMR Contacts**, enter the country in the provider's language (e.g. `Spain`) and, optionally, the state/province (`Madrid`).
3. Search the [RadioID API](https://radioid.net/api/dmr/user/). One page is loaded per action; the previous/next buttons navigate all available pages. The text filter applies only to the visible page, not the whole database.
4. Select contacts from the necessary pages and add them to the local file. The selection is retained when changing pages; the counter includes all selected pages.
5. Save the modified binary using **Save 128 KiB binary**. Optionally save the selected contacts as JSON.

Adds **private digital contacts** by callsign/ID (total capacity: 1024), not the bulk call-identification database or talkgroups. Existing private IDs are deduplicated, existing contact indexes are respected, and none are overwritten. Errors or insufficient space abort the batch without modifying the original file. Names are limited to the codeplug's ASCII format. Quansheng does not support DMR contacts.

### RepeaterBook repeaters

Source: [official API and access policy](https://www.repeaterbook.com/wiki/doku.php?id=api). **Data courtesy of RepeaterBook.com.**

Since March 2026 this has not been an open API: it requires approval for **this application** and an associated individual token for distributed applications. Having a token for another application does not authorize this one. No scraping is performed, RepeaterBook records are not included in the repository, and the database is not downloaded without permission. This integration is for personal/authorized programming, not to create an alternate directory or redistribute data.

If RepeaterBook approves your use of this application, configure these variables in the same PowerShell session where you start the server:

```powershell
$env:RB_APPROVED = "yes"
$env:RB_USER_TOKEN = "<tu token individual rbuapp_ asociado a esta aplicacion>"
$env:RB_APPROVED_USER_AGENT = "<el User-Agent aprobado con nombre/version y correo real de contacto>"
npm start
```

Do not paste the token into chat, the browser, a URL, a commit, or a public file. The program does not read `.env`; if you choose to save variables yourself, protect that file. Shared `app_` tokens are not accepted in this distributed deployment. An approval variable only expresses your configuration: the provider validates actual authorization. On HTTP 429, it does not retry automatically and enforces a minimum cooldown of 15 minutes.

In the interface, you can query by country/zone and mode (FM; also DMR in OpenGD77), or open a RepeaterBook export JSON you are authorized to use (`results`, up to 8 MiB). The US, Canada, and Mexico require a RepeaterBook state/province ID. Zone, text, and band filters apply to visible results; records without confirmed mode, out of range, non-operational, or corrupt are excluded **with counts and examples of the reason**.

- **OpenGD77:** choose an existing template with the same mode as the batch and add to free positions. No arbitrary binary values are created and channels are not reordered. Name, nominal RX/TX, and Color Code are imported when applicable; other settings come from the template. **All new channels are RX only and have no inherited RX/TX tones.** DMR retains the template's TS/contact/RX list: no talkgroup or repeater TS is invented. Review those settings in the CPS before enabling TX. Save the local binary.
- **Quansheng:** FM only; reads/opens the 41344-byte F4HWN v6 logical configuration and allows channels to be added from a template or memories deleted from the local file. Includes analog PMR446 channels 1-16 RX only; repeaters/SAT are prepared from providers. Beta transmission requires a full Flash backup and reread; v6.0 cannot enable it. Also exports CHIRP CSV with `Duplex=off` (TX disabled): this is exchange, not a dump or installation. JSON projects are not native radio formats either.
- Only VHF 136-174 and UHF 400-470 MHz frequencies are prepared. Select your unit's actual band: single-band radios, different revisions, and regional restrictions may support less. Universal compatibility is not promised.
### SAT and upcoming passes

1. Select **SAT / passes**, enter a NORAD ID and the orbital provider: [SatNOGS DB](https://db.satnogs.org/) or [CelesTrak](https://celestrak.org/NORAD/elements/).
2. **Update orbital elements** downloads the latest available TLE. Checksum, NORAD, epoch, and propagation are verified. Elements older than seven days, more than 24 h in the future, or with a prediction window extending more than seven days from the epoch are rejected. An error is not replaced with another provider or older elements.
3. **Query SatNOGS frequencies** returns confirmed, active FM/narrow FM spot frequencies within VHF/UHF. Data modes, USB/LSB, and linear transponders are not converted to FM channels. Exclusion counts are visible. Data is community-sourced and may not reflect current operating status: check with the satellite operator.
4. Authorize local use of location and enter latitude/longitude/altitude or click **Use my location**. Only then is browser permission requested. Coordinates are not sent to providers or saved automatically.
5. Calculate passes over the next 24/48 hours above the selected minimum elevation. Local SGP4 uses the observer's position, 5 s samples, and crossings refined to 0.5 s. Start, maximum, end, elevation, and azimuths are shown in **UTC**. Passes already in progress or truncated by the window are indicated. No terrain, atmospheric refraction, or field-accuracy guarantee.
6. You can export a JSON plan (**includes your position**, consent required) and the TLE with a provenance/license JSON. Check that the browser saved both TLE files. The plan is invalidated when parameters change and must be recalculated after 15 minutes. A prepared SAT FM channel is nominal RX only: it does not control Doppler or enable an uplink.
7. **Doppler channels (Quansheng UV-K5 V3 / UV-K1 and OpenGD77):** choose a calculated pass and between 1 and 10 channels. The pass Doppler shift (SGP4 radial velocity) is divided into equal frequency steps. Each channel is tuned, in 10 Hz steps, to the center of its step and used during the UTC window when the received frequency falls within that step; windows are shorter near closest approach. Each channel shows its window and maximum error at the endpoints, accounting for frequency rounding to 10 Hz and rounding the error upward. On an ISS pass over Madrid, with 5 channels, the error is below 0.7 kHz at 145.8 MHz and 2 kHz at 437.8 MHz. RX only: change memories at the indicated time. The radio does not track Doppler by itself, and no TX uplinks are generated.

SatNOGS DB / Libre Space Foundation: data attribution [CC BY-SA 4.0](https://wiki.satnogs.org/SatNOGS_DB); its TLE may cite third-party orbital sources. Derived JSON/CSV retains attribution and license link. The SGP4 dependency includes its MIT license in the installed package.

7. **OpenGD77: native SAT list in the local codeplug.** After opening/reading a 128 KiB codeplug, **Load satellite into SAT list in local codeplug** writes the satellite to custom data block **type 3** (offset `0x1EE60`, 25 records of 100 bytes: 8-character name, nibble-packed TLE fields, LE frequencies), using the same format as the official CPS. Existing satellites (replaced by name and sorted), the `OpenGD77` header, and other blocks (boot image, melody, theme) are preserved. If the area has no header and is not erased (`0xFF`), or the block chain is inconsistent, the operation is canceled without modifying the file. Only the downlink (RX1) is saved; uplink, CTCSS, and APRS are set to zero. **View satellites in codeplug** decodes the list. Save the binary and apply it with the official CPS: direct radio writing remains blocked until there is a complete MCU backup.

**Installation limits:** F4HWN supports stepped FM/SAT memories here in the v6 configuration, but not a native SAT orbital table. Channel transmission is Beta with a full backup; only reading has been physically tested in v6.0. The OpenGD77 SAT list is modified in the local binary, not on the radio. OpenGD77 writing remains blocked until a complete MCU firmware copy is verified. Local OpenGD77 deletion removes references from the 68 standard zones and 64 scan lists, including priorities and designated TX channel; it does not renumber other memories. Extended Scanner zones are not supported. Always preserve the original file. The UV-K5 V3 does not validate OpenGD77 hardware. Queries/imports do not grant write permissions.

## Official firmware downloads

On each page, click **Query official models**, select the exact model and revision, and query the stable catalog. For Quansheng, **Query stable versions** shows the recognized history of the two projects, ordered from newest to oldest within each project. No Internet query occurs when opening the page. Selecting the OpenGD77 family does not identify the target model by itself: check the device label, power, and hardware revision.

- **F4HWN UV-K1 / UV-K5 V3:** [Armel releases](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases), recognized stable v4.x/v5.x/v6.x history. Includes Fusion and, in v6, FieldOps, Labs, and Transfer. v4 binaries are filtered by K1/K5 V3 hardware. SA818 variants are clearly identified. Only F4HWN v6.x without SA818 can be prepared for slots; earlier versions and SA818 are **download only**.
- **ARDF UV-K1 / UV-K5 V3:** [reald project releases](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases), stable versions with the `ARDF-K5v3_K1-v...` label and recognized combined binary (including v0.5 and v0.5.1). They are **download only**: Multiboot compatibility is not claimed and the connector is not enabled for ARDF.
- Both Quansheng projects require size and SHA-256 published by GitHub; the server and browser verify the bytes. History is paginated (up to 1000 releases per project; exceeding the limit produces an explicit error). An error from either source cancels the query without displaying a partial catalog. Betas, development builds, original firmware of unverified provenance, locally built binaries, and V1/V2 models are not offered. Files from local folders are not copied to the site. Verifying a hash is not equivalent to a digital signature or compatibility certification.
- **OpenGD77:** only the [official server](https://www.opengd77.com/downloads/releases/), latest stable `RYYYYMMDD` folder by family, and files recognized for the model. MD-9600 distinguishes V1/V2/V4/V5, and MD-UV380 distinguishes 10W PLUS. The original ZIP is preserved: **it is not flashed or treated as a codeplug**. The official index does not publish a hash: HTTPS, size, and ZIP format signature are checked, and SHA-256 is calculated locally. No cryptographic verification of the editor is claimed, and each ZIP file is not decompressed/validated.
- MD-380, DM-32, and UV008 are not offered until a confirmed asset source is available. Links are not invented and mirrors are not used.

Downloads go through a local server API with fixed destinations, restricted redirects, byte/time limits, and at most two simultaneous downloads. Catalogs expire after ten minutes; repeating a query within that period uses the cache. Error responses are displayed rather than replaced with fictitious files or versions. User URLs are not accepted and firmware is not written to the server's disk. The official source receives the computer's download request, but does not receive calibration, backups, codeplugs, or radio identifiers.

After downloading, you can save a provenance manifest with model, version, URL, size, hashes, and limitations. Check that the browser saved both files. Only a verified F4HWN BIN with a matching model enables **Prepare image for slot**; this does not install anything. Changing the model clears the prepared image. Installation retains all backup and confirmation barriers; a download never replaces the firmware copy already on the radio.

The OpenGD77 editor opens binaries exactly 131072 bytes and modifies existing FM/DMR channels (ASCII name, RX, TX, mode, Color Code, TS, and RX only), preserving other fields. It also allows adding channels from an explicit template and private contacts through the provider panel. It does not import CPS JSON, create channels with arbitrary settings, or handle extended channels 1025+. BCD validation does not replace checking the model's bands or authorization to transmit.

OpenGD77 reads do not send the save settings/VFO command or restart the device: they read already-persisted values and do not force changes still present in RAM to be saved.
## F4HWN Labs apps and custom firmware (Quansheng)

- **On-demand local Bricohams V3:** `npm run build:bricohams -- --source "<Fusion61>" --output "<directorio nuevo>" --preset Fusion --option ENABLE_VOX=OFF` builds an independent edition from the pinned F4HWN v6.1.0 commit. Supports Fusion/Labs/FieldOps/Transfer and verified boolean options; preserves multiboot and generates firmware, map, ELF, metadata, licenses, and SHA256SUMS compatible with the web verifier. It is not Karina or a V1 version; it is also not the online v6.3.0 catalog. Fusion and Labs have been built and local Fusion reproducibility verified, without physical testing or flashing. Instructions and results in [BRICOHAMS-FIRMWARE.md](docs/i18n/en/BRICOHAMS-FIRMWARE.md).
- **Local Multiboot library:** in **Firmware Slots / Multiconfig**, select your Multiboot folder. `.bin` files are read in the browser without uploading them to the server. Each image indicates whether it meets slot checks or why it is blocked. Only F4HWN v6.x images with valid PY32 vectors are prepared; not Karina V1, stock, older versions, or packed/SA818/beta/development variants. The local SHA-256 does not prove authenticity. Installation still requires a full backup and confirmation; Main remains protected. See the [Karina case file, hardware, and Bricohams feasibility](docs/i18n/en/KARINA.md).
- **Apps:** in the Quansheng workspace, **F4HWN Labs apps** lists app slots in external Flash, installs a `.app`, and deletes it. Works only with the Labs edition running. Before touching the radio, the FAP1 header and code/assets CRCs are checked. The app is written in this order: code, assets, and finally the header. Each block is reread from physical Flash and compared byte for byte; if it fails, the operation is canceled without confirming the header. The firmware's final check validates only the header and compatibility, not the code CRC; it does not replace rereading. Like other writes, it requires the full backup. `.app` files are downloaded from [F4HWN's archive/apps](https://github.com/armel/uv-k1-k5v3-firmware-custom/tree/main/archive/apps), using the folder for your version.
- **Custom firmware:** choose an edition (Labs, Fusion...) and enable or disable `ENABLE_*` options. The web app generates the request for the *Custom firmware* workflow in the build repository. When loading the downloaded artifact (`SHA256SUMS`, `build-info.json`, `.bin`), it checks each SHA-256 and leaves only the `.bin` specified by `build-info.json` ready in **Install in slot**. The manifest must also cover `build-info.json`; duplicate names are rejected. These hashes detect corruption; they do not prove authenticity or compatibility. The [f4hwn-options.js](f4hwn-options.js) catalog is regenerated with `node scripts/f4hwn-options.cjs <bricohams-firmware>/options/<version>.json > f4hwn-options.js`.

## Automatic backups and device protection

1. Select the model and authorize local reading.
2. Connect: the radio is identified and the backup starts automatically.
3. Save calibration in IndexedDB, calculate SHA-256, and reread to check persistence.
4. Quansheng: read **all 2 MiB of external Flash** and compare its full CRC-32 with the value calculated by the radio (`0x073E`, Labs with physical CRC support). If firmware does not offer that verification or it does not match, writing is blocked. At 38400 baud this may take 10-20 minutes or more. The progress bar shows actual byte progress.
5. Extract the `Main` image from slot 0 and verify the header, size, and CRC-32. Compare logical and physical calibration.
6. Persist the result and verify all SHA-256 values again. Only then is a write permission granted for that connection.
7. Request an automatic `.rwb.json` download with manifest, Base64 files, sizes, and hashes. The browser may block it: check Downloads and repeat from history.

**What base firmware means:** `Main` is the application firmware stores after normal installation. The entire image described by its header is copied (up to 118 KiB). It is not necessarily the currently selected firmware and **does not include the factory internal bootloader** or other MCU bytes. This protocol does not support claiming a complete copy of the entire chip. If Main is missing or its CRC does not match, writing is not enabled.

OpenGD77 preserves calibration and codeplug, but marks the backup **partial** because the complete internal firmware has not been extracted. The application does not confuse a codeplug with firmware.

On transport, CRC, quota, read, or storage errors, there is no write permission. Before each modification, the saved backup is reread and compared with the original permission hashes: deleting or corrupting it also revokes writing. Disconnecting the cable, reconnecting, or using another radio invalidates permission. Each new connection requires a new copy. Writes are exclusive, Main cannot be selected as a destination, image bytes precede the header, and CRC is verified after installation. Deleting firmware and resetting a bank are separate actions with written confirmation.

Do not disconnect or close the browser during an operation. Do not connect an external tool to the same port at the same time. The linked original tools **do not inherit these safeguards**.

## Data security

- No telemetry, accounts, CDN, or radio files sent to servers. `satellite.js` is installed locally from npm with a pinned version and lockfile.
- Backups remain in the computer's browser profile; this application does not encrypt them. They may contain identifiers, channels, configurations, and other private data. Protect the profile and files using your operating system's safeguards.
- IndexedDB is not an external file guaranteed to last forever. Export backups; clearing browser data or using another origin loses access to history. Persistent storage is requested when the browser allows it.
- A partial/failed backup retains files already confirmed in history. Do not delete those copies.
- The server serves only a fixed list of application files, listens only on `127.0.0.1`, and sends CSP, Permissions-Policy, `nosniff`, and `no-referrer`. It does not serve editor configuration, tests, or arbitrary paths.
- Radio and file metadata are displayed as text, not HTML. `eval` is not used.
- SHA-256 detects accidental corruption; it does not prove firmware authenticity. Use images from a trusted source. No software can guarantee absolute security or recovery from power failures.

## Tests and validation

```powershell
npm test
npm run check
```

Tests in `tests/connectors.test.cjs` use simulated devices: byte fragmentation, frames, CRC, calibration, family maps, full backup, failed persistence, permissions, slots, reset, Main protection, post-write verification, and binary editing. The OpenGD77 write encoder is exercised with an isolated VM that replaces the barrier only within the test; production code is not unlocked. No hardware is written.

`tests/firmware.test.cjs` checks allowed sources and redirects, stable catalogs by model, limits, hashes, formats, cache, expiration, concurrency, independent browser verification, and server routes/privacy. It uses simulated network responses and a temporary local server; it does not depend on the Internet or download firmware on each run.

`tests/planning.test.cjs` verifies atomic channel/contact import and limits, byte-for-byte OpenGD77 type 3 SAT block against the CPS format (initialization, block preservation, replacement, rejection of corrupt/non-empty areas, invalid TLE and more than 25 satellites), byte preservation, BCD IDs, deduplication, filters, RX-only CSV, rejection of incompatible satellite modes, TLE checksum/age, SGP4 propagation against an independent Vallado vector, windows/elevation crossings, RadioID pagination, server-only RepeaterBook credentials, HTTP 429 cooldown, and API isolation. No test uses real credentials, writes radios, or queries RepeaterBook.

`tests/site.test.cjs` verifies branding, favicon, and no inline scripts/styles on all pages; that the server serves help and logo with correct type and headers; help anchors and local links; that every error-table message exists literally in code; relative links throughout the documentation; license, authorship, and package metadata; and absence of emails, secrets, and corrupt characters.

The desktop/mobile interface, disabled states, and IndexedDB storage are also checked in a browser. USB reads have been physically tested on a unit declared as UV-K5 V3 with F4HWN v6.0.0; writes, RF, and OpenGD77 radios have not. Field compatibility or 100% operation on all devices is not certified. Before using writes on a valuable device, validate with test hardware and a known recovery procedure.

## Interoperability references

Independent implementation based on inspected protocol formats; reference code and firmware are not distributed.

- [OpenGD77 CPS](https://grid.radio/opengd77/), protocol `C` / `R` / `W` / `X`, modes, and codeplug map.
- [UV Studio](https://armel.github.io/uvstudio/).
- [F4HWN firmware UART](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/app/uart.c), message and response contracts.
- [Multiboot format and map](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/driver/mb_flash.h).
- [Multiboot and Multiconfig](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig).

Lookup performed on October 18, 2026. Firmware and protocols may change; unknown formats are explicitly rejected.

## License

Copyright (C) 2026 Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF and Pedro Roca.
Founders and board members of [Bricohams](https://bricohams.org) ([bricohams.com](https://bricohams.com)).

This program is free software: you may redistribute it and/or modify it under the terms of the [GNU General Public License](LICENSE) version 3 or (at your option) any later version (GPL-3.0-or-later). It is distributed **without any warranty**. Dependencies and third-party sources retain their own licenses: see [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.en.md).

Bricohams is not affiliated with OpenGD77, grid.radio, F4HWN, Quansheng, RadioID, RepeaterBook, SatNOGS, or CelesTrak. The trademarks belong to their owners.