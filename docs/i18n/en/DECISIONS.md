# Decision log (ADR)

Each decision records the context, the decision, rejected alternatives, and consequences.

## ADR-001 · JavaScript without a framework or build step

- **Context:** the tool handles binary protocols and must be auditable by any radio amateur.
- **Decision:** native JavaScript modules, HTML, and CSS, without React, Vue, bundlers, or transpilers.
- **Alternatives:** React/Vite (more dependencies and supply-chain exposure) or TypeScript (requires compilation).
- **Consequences:** the code you read is exactly what runs, and the browser does not load `node_modules`. In exchange, interface state is managed manually.

## ADR-002 · WebUSB and Web Serial for radio communication

- **Context:** OpenGD77 MK22/STM32 exposes CDC over USB; DM-32/UV008 and Quansheng use a serial port.
- **Decision:** WebUSB for `1FC9:0094` and Web Serial for serial cables, matching the reference web CPS.
- **Alternatives:** a native application (installation and signing per operating system) or Electron (large attack surface).
- **Consequences:** works only in desktop Chrome, Edge, and Brave. On Windows, OpenGD77 USB requires WinUSB (see [help](../../../ayuda.html#drivers)).

## ADR-003 · Local Node server with a single dependency

- **Context:** firmware downloads and provider data need to bypass CORS, enforce host allowlists, and hide credentials.
- **Decision:** `server.cjs` with standard Node 22 modules (`http`, `fetch`, `crypto`) and pinned `satellite.js` 6.0.1 as the only dependency.
- **Alternatives:** Express/Fastify (more dependencies) or a public proxy (exposes data and credentials).
- **Consequences:** installs with `npm ci --ignore-scripts`, reducing supply-chain risk.

## ADR-004 · Loopback only, strict CSP, and file allowlist

- **Decision:** listen on `127.0.0.1:8787`, validate `Host`, serve only listed files, and send a CSP without `unsafe-inline`.
- **Reason:** mitigate DNS rebinding, arbitrary file reads, and XSS.
- **Consequence:** `localhost` is not served: GET/HEAD navigations are redirected (307) to `127.0.0.1` to maintain a single IndexedDB origin; requests with an `Origin` header are rejected. Network deployment would require redesign (HTTPS and authentication) and is unsupported.

## ADR-005 · Mandatory automatic backup before writing

- **Decision:** on connection, calibration and base firmware or codeplug are copied, saved in IndexedDB, hashed with SHA-256, and reread; only then is a connection-bound write permission issued. Any failure keeps writing blocked (*fail-closed*).
- **Rejected alternative:** optional backups, risking irreversible loss of calibration.
- **Consequences:** connection takes longer (a Quansheng's 2 MiB at 38,400 baud takes 10–20 minutes), but no writes occur without a verified backup.

## ADR-006 · IndexedDB and `.rwb.json` export

- **Decision:** browser IndexedDB for history, and JSON export with a manifest, Base64 content, and hashes.
- **Alternatives:** storing backups on the server (would break the “no uploads” promise) or the File System Access API (not available in every browser).
- **Consequences:** the application does not encrypt backups. Users must export them and protect their browser profile.

## ADR-007 · Official firmware sources only, no mirrors

- **Decision:** the catalog is limited to GitHub Releases from the official F4HWN repository (`armel/uv-k1-k5v3-firmware-custom`), the ARDF project for K1/K5 V3 (`reald/uv-k1-k5v3-firmware-custom`), and opengd77.com, with restricted redirects and size limits. Quansheng includes recognized stable release history with published SHA-256. ARDF, F4HWN before v6, and SA818 are download-only; they do not expand write support.
- **Consequences:** if a provider changes its structure, downloads fail explicitly instead of falling back to unverified sources. SHA-256 detects corruption but does not prove authenticity.

## ADR-008 · RepeaterBook credentials on the server only

- **Decision:** `data-service.cjs` reads `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT`, and `RB_APPROVED` from environment variables, and the browser never receives them. A cooldown applies after HTTP 429, and the attribution “Data courtesy of RepeaterBook.com” is displayed.
- **Consequences:** without an approved token, the feature appears disabled.

## ADR-009 · Local SGP4 calculation

- **Decision:** TLEs come from SatNOGS/CelesTrak, and propagation runs in the browser with `satellite.js`. The user's position never leaves the computer.
- **Validation:** tests use an independent Vallado test vector.

## ADR-010 · Tests with `node:test` and simulated devices

- **Decision:** use Node's native runner, without Jest or Mocha. Radios, network, and server are simulated; tests never write to hardware or use real credentials.

## ADR-011 · GPL-3.0-or-later license

- **Context:** interoperability references use Apache-2.0 (F4HWN, egzumer, DualTachyon), MIT (satellite.js), and GPL-2.0 (OpenGD77).
- **Decision:** GPL-3.0-or-later, a copyleft license that keeps improvements free and is compatible with Apache-2.0 and MIT dependencies.
- **Note:** no code from OpenGD77 or the other references is distributed; the implementation is independent. The rights holder may change the license before receiving third-party contributions.

## ADR-012 · Bricohams branding with its own assets

- **Decision:** the name “Bricohams Radio Workspace” and original Bricohams Studio PNG, without redrawing or recoloring, retaining its aspect ratio. The interface keeps its own dark palette. On 2026-10-21, the SVG “B” icon was replaced because it did not match the brand identity. Provenance and hash in [BRANDING.md](BRANDING.md).
- **Consequence:** no OpenGD77, Quansheng, or F4HWN logos are used, and non-affiliation is stated.

## ADR-013 · Static web application on a dedicated origin

- **Context:** installation-free use is desired, but IndexedDB and `localStorage` are isolated by origin, and radio backups are sensitive data.
- **Decision:** publish a static site on GitHub Pages at the root of a dedicated account or organization (`https://<org>.github.io/`), not under a subpath of `bricohams.github.io` (home of Bricohams Studio). The application detects the mode with `runtime.json` (web if missing), uses relative paths only, and declares CSP in `<meta>`. Satellite data is generated daily by a workflow; features requiring a server or credentials (RepeaterBook, firmware downloads, RadioID API) are replaced with manual file loading or remain local-only.
- **Rejected alternatives:** a subpath of `bricohams.github.io` (shares origin and storage with other projects); a public proxy (would send data and credentials through a third party); replicating RadioID (volume and licensing).
- **Consequences:** the web version has fewer features than the local version, and the author must create the account or organization and configure Pages. Installable packages are coming soon.

## ADR-014 · Accepted deployment on a shared origin

- **Context:** the author decided to publish at `https://anatolbricoham.github.io/Radio-Web-install/`, without creating a dedicated account.
- **Decision:** allow deployment outside `<org>/<org>.github.io` only if the repository variable `PAGES_SHARED_ORIGIN_ACCEPTED=true` exists. Partially supersedes ADR-013.
- **Accepted risk:** `anatolbricoham.github.io` shares an origin with the account's other project pages (for example `Ham-Clock`, `antenaSatCommrotor`, `Fox_Hunt_Beacon`). If modified, any of them could read the radio backups and profile stored by this web application. Recommendation to users: export `.rwb.json` backups and do not rely on browser storage.
- **Exit strategy:** create a dedicated account or organization, move the web application to its root, and delete the variable.

### Provenance update, 26-10-2026

The current repository is `Brico-Hams/Radio-Web-install`, and the documented
Pages URL is `https://brico-hams.github.io/Radio-Web-install/`. The earlier
`anatolbricoham` addresses are historical context for ADR-014, not the current
URL for deployment or data retrieval. The exception still uses a shared
origin: all projects on `brico-hams.github.io` share it, not just this
subpath. Users' IndexedDB data has not been migrated automatically.
