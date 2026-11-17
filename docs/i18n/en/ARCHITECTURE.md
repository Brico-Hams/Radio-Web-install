# Bricohams Radio Workspace architecture

Bricohams Radio Workspace is a **local** web application. A small Node.js server serves a fixed allowlist of static files and a few read-only APIs. All communication with the radio takes place in the browser through WebUSB or Web Serial.

<a id="modos-de-ejecución"></a>
## Runtime modes

On startup, `runtime-mode.js` requests `runtime.json` (a relative path, without caching). Only `{"mode":"local"}` enables local mode; if the file is missing, returns 404, is not JSON, or the page is opened through `file://`, the application starts in **web mode** without errors. `server.cjs` serves it as `{"mode":"local"}`, and `scripts/build-pages.cjs` generates `{"mode":"web"}` in `dist/`. The top badge shows “Web · GitHub Pages” or “Local · installed”.

| Aspect | Web (Pages) | Local |
| --- | --- | --- |
| Server | None, static files only | `server.cjs` at `127.0.0.1:8787` |
| F4HWN / ARDF K1-K5 V3 firmware | Stable release history from Armel and reald through `api.github.com`; the user loads the file and its size and published SHA-256 are checked | Server-verified download; ARDF, versions before v6, and SA818 are download-only |
| OpenGD77 firmware | Manual ZIP upload (filename and ZIP signature; no publisher hash) | Download through the server |
| RadioID | Load `user.csv` (100 MiB, filtered, 5,000 rows displayed) and an optional profile in `localStorage` | API through the server |
| RepeaterBook | Unavailable | Approved token, server-side only |
| Satellites | Daily `data/satellites.json` (`scripts/fetch-satellites.cjs`) | Live TLEs |

Client paths are always relative. Each HTML file declares its CSP in `<meta>`; because `<meta>` does not support `frame-ancestors`, `app.js` stops if the page is framed. The web version has its own origin (see ADR-013).

## Component view

```mermaid
flowchart LR
  subgraph Equipo["Equipo del usuario (127.0.0.1)"]
    subgraph Navegador["Chrome / Edge de escritorio"]
      UI["app.js / radio-ui.js / planning-ui.js<br/>Interfaz"]
      CON["gd77-connector.js<br/>quansheng-connector.js"]
      TR["transports.js<br/>WebUSB / Web Serial"]
      CORE["radio-core.js<br/>CRC, tramas, permisos"]
      CP["codeplug-editor.js<br/>planning-core.js"]
      BK["backup-store.js<br/>IndexedDB + SHA-256"]
    end
    SRV["server.cjs<br/>estáticos + API"]
    FW["firmware-service.cjs<br/>catálogo y descargas verificadas"]
    DS["data-service.cjs<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak"]
  end
  Radio[("Radio<br/>OpenGD77 / UV-K1 / UV-K5 V3")]
  Ext[("Proveedores oficiales<br/>GitHub Releases, opengd77.com,<br/>RadioID, RepeaterBook, SatNOGS, CelesTrak")]
  UI --> CON --> TR --> Radio
  CON --> CORE
  CON --> BK
  UI --> CP
  UI -- "fetch /api/*" --> SRV
  SRV --> FW --> Ext
  SRV --> DS --> Ext
```

## Modules

| File | Side | Responsibility |
| --- | --- | --- |
| `index.html`, `opengd77.html`, `quansheng.html`, `ayuda.html` | Browser | Page skeletons with `body[data-page]`, without inline scripts. |
| `app.js` | Browser | Shared interface (branding, navigation, footer), guides, and searchable help page. |
| `radio-ui.js` | Browser | Connection panel, automatic backups, history, export, and protected actions. |
| `transports.js` | Browser | `USBTransport` (CDC over WebUSB, `1FC9:0094`) and `SerialTransport` (Web Serial), with exact reads and timeouts. |
| `radio-core.js` | Browser / Node | CRC-16/CRC-32, binary utilities, write permissions, and SHA-256. |
| `gd77-connector.js` | Browser | OpenGD77 CPS protocol (`C`/`R`/`W`/`X`) and MK22, STM32, and SERIAL maps. |
| `quansheng-connector.js` | Browser | F4HWN UART protocol (XOR obfuscation, CRC), calibration and Flash reads, Multiboot slots. |
| `backup-store.js` | Browser | IndexedDB persistence, verified readback, and `.rwb.json` export. |
| `codeplug-editor.js` | Browser / Node | Binary OpenGD77 codeplug reading and writing: channels, contacts, and type 3 SAT block. |
| `planning-core.js` | Browser / Node | Filters, deduplication, CSV, TLE validation, and SGP4 passes with `satellite.js`. |
| `planning-ui.js` | Browser | “Codeplug: contacts, repeaters, and SAT” panel. |
| `firmware-catalog.js` | Browser / Node | Allowed models and firmware sources. |
| `server.cjs` | Node | HTTP server at `127.0.0.1:8787`, file allowlist, security headers, and `/api/*` routing. |
| `firmware-service.cjs` | Node | Queries GitHub Releases and opengd77.com with controlled redirects, size limits, and caching. |
| `runtime-mode.js` | Browser | Detects the mode (`runtime.json`; web if missing). |
| `radioid-csv.js` | Browser / Node | Filtered `user.csv` reading and optional local profile. |
| `scripts/build-pages.cjs`, `scripts/fetch-satellites.cjs` | Node | Generate `dist/` and `data/satellites.json` for Pages. |
| `data-service.cjs` | Node | Read-only proxy to RadioID, RepeaterBook (server-side credentials only), SatNOGS, and CelesTrak. |

## Connection and automatic backup flow

```mermaid
sequenceDiagram
  participant U as Usuario
  participant UI as radio-ui.js
  participant C as Conector
  participant R as Radio
  participant B as backup-store.js
  U->>UI: Selecciona el modelo y pulsa Conectar
  UI->>C: open() (gesto del usuario)
  C->>R: Identificación
  C->>R: Leer calibración
  C->>B: Guardar, calcular SHA-256 y releer
  C->>R: Leer Flash o codeplug completo (según la familia)
  C->>C: Verificar CRC, tamaños y cabeceras
  C->>B: Persistir y volver a verificar los hashes
  B-->>UI: Copia completa o parcial
  UI-->>U: Permiso de escritura solo si la copia es completa
  UI->>U: Descarga automática del .rwb.json
```

Before any write, the backup is reread and compared with the hashes in the permission. Disconnecting the radio, swapping it for another, or deleting the backup revokes the permission.

## Security layers

1. **Network:** the server listens only on `127.0.0.1`, requires `Host: 127.0.0.1:<puerto>`, and serves a fixed file allowlist.
2. **Browser:** CSP `default-src 'self'; script-src 'self'; style-src 'self'`, `Permissions-Policy`, `nosniff`, `no-referrer`, and `no-store`. No `eval` is used and no HTML is built from radio data.
3. **Equipment:** writes require a *fail-closed* permission tied to a verified backup. Main is never a target. Erasing or resetting requires typed confirmation.
4. **External sources:** official providers only, redirects to allowed hosts, size limits, and visible SHA-256. RepeaterBook credentials are never sent to the browser.
5. **Data:** no telemetry or uploads. Backups stay in the local profile's IndexedDB and are exported to user files.

## Known limitations

- **OpenGD77:** no verified protocol is available here for extracting the MCU's complete firmware. The backup is marked **partial**, and writing to the radio remains blocked.
- **Quansheng:** a complete physical Flash backup requires the read and CRC capabilities of F4HWN Labs v6.1+. The web application implements Beta configuration/channel writing with backup and readback, and Bricohams SAT images include experimental CAT RX. This does not demonstrate persistent writes or CAT operation on a specific radio; see the [validation matrix](VALIDACION-INTEGRAL-V3-ANDROID.md).
- **RepeaterBook:** requires a token approved by RepeaterBook and is available only in the local version.
- **Web:** satellite data may be up to one day old (a warning appears after 7 days), and firmware/RadioID files are loaded manually.
- **Hardware:** earlier reads from one Quansheng unit exist, but they do not certify writes, the independent resident, or the current combination of APK, SAT slot, and phone. Physical tests for this revision are pending.

## Security review (SonarQube 2026-11-13)

### Fixed

**xml:S6358 – Android application backup should be disabled or restricted** (MEDIUM) — `android/app/src/fdroid/AndroidManifest.xml:6`.
- *Why it was a flaw:* with backup enabled, local data (preferences, files, databases) can be exported to Google Cloud or through `adb backup`, or restored from a tampered copy (CWE-922, OWASP M9/A1). The F-Droid flavor's `<application>` overlay did not declare the attribute, so the analysis saw it as implicit (default `true`).
- *Change:* `android:allowBackup="false"` is added to the overlay.
- *No loss of functionality:* the main manifest already declares `allowBackup="false"`, `fullBackupContent="false"` and `dataExtractionRules`; the merged value does not change. Check: the fdroid flavor's `manifest merger report` (`processFdroidReleaseMainManifest`) shows `allowBackup=false`.

**xml:S5332 – Clear-text protocols should not be used** (LOW) — same file, line 6.
- *Why it was a flaw:* on Android < 9 `usesCleartextTraffic` is implicitly `true`, which allows unencrypted http (interception and tampering, CWE-319, CWE-200).
- *Change:* `android:usesCleartextTraffic="false"` is added to the overlay.
- *No loss of functionality:* the main manifest already sets it to `false` and defines `networkSecurityConfig`; the merged result is identical. Check: same merger report; rotor/radio behaviour does not change.

**kotlin:S2245 – Pseudorandom number generators (PRNGs) should not be used in security contexts** (MEDIUM) — `android/app/src/main/java/org/bricohams/radio/Rt950Protocol.kt:156`.
- *Why it was a flaw:* `Random()` is not a cryptographically secure generator; an attacker who knows or guesses its internal state can predict the next values (CWE-338, CWE-330, OWASP A2 Cryptographic Failures). The default value of `Rt950Session.random` used `Random()`.
- *Change:* the default value becomes `SecureRandom()` (`java.security.SecureRandom`, a subclass of `java.util.Random`). The parameter type is still `Random`, so tests can inject a seeded instance.
- *No loss of functionality:* `buildKeyFrame` still uses the same ranges (`nextInt(2)+1`, `nextInt(5)`, `nextInt(KEYS.size)`), so the RT-950 protocol bytes keep their format. Check: (`Rt950ProtocolTest`: `headersAndKeySelection`, `readAllSkipsUnknownRegions`).

**kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/Rt950ProtocolTest.kt:93` (and lines 67, 175, 309). Not modified.
- *Why Sonar flags it:* same reason as above (non-cryptographic PRNG, CWE-338/CWE-330).
- *Decision:* it is a unit test that uses `Random(it.toLong())` with a fixed seed to build reproducible key frames; it is not a security context (it generates no secrets) and `SecureRandom` would make the test non-deterministic. Left unchanged.
- *No loss of functionality:* nothing is touched. Check: `Rt950ProtocolTest` still passes; the production class accepts any injected `Random`.

### Not changed - requires decision

- **Sonar javascript S4036 (LOW, CWE-426/427)** — `scripts/build-platform-app.cjs:16,20,27,30`, `scripts/build-platform-resident.cjs:55,73,82,85,87,89`, `scripts/export-project.cjs:48,94,177,178,181,230`. The scripts call `arm-none-eabi-*`, `git` and `zip` by name. There is no fixed absolute path valid on every machine (the ARM toolchain and git are installed in different locations); inventing one or requiring a new environment variable would change usage. Decision: accept the risk (development tools run by the developer) or define an environment variable for the toolchain path. (The `tar.exe` call on line 228 already uses an absolute path.)
- **kotlin:S1313 (LOW)** — `android/app/src/main/java/org/bricohams/radio/RotorProtocol.kt:14`. `AP_HOST = "192.168.4.1"` is the factory address of the ESP32 rotor access point; moving it to configuration would break the default connection.
- **kotlin:S2245 (MEDIUM)** — `android/app/src/test/java/org/bricohams/radio/FtxEnhancedDecoderTest.kt:59`. It is a unit test with a fixed-seed `Random(7)` to reproduce the error pattern; it is not a security context and `SecureRandom` would make the test non-deterministic.
- **kotlin:S7204 (HIGH)** — `android/app/build.gradle.kts:52`. Enabling `isMinifyEnabled` requires ProGuard/R8 rules (there is no `proguard-rules.pro`) and validating on a device that reflection/JSON/BLE still work; this cannot be guaranteed without physical tests. Decision: create the keep rules and test a minified release APK.
