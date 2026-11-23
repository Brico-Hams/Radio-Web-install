# Integrated remote station

The original BricoHam Remote Station development is incorporated as
`remote-station/` into **Bricohams Radio Workspace / RadiCodex**.
The component's own code, tests, documents, and mobile projects are kept intact,
without caches, local SDKs, secrets, or build binaries.
The root GPL-3.0-or-later license and the component's MIT notices are preserved;
the licenses of dependencies and third-party assets are not changed.

## When to use each remote implementation

The project contains two independent remote stations:

| Name in the interface | Code | Use when |
| --- | --- | --- |
| **Remote station (Python host/agent)** | `remote-station/`, `station.html` | You need a coordinating HTTPS host, headless Python agents, and web/Android/iOS clients. The Android client only connects. |
| **Remote shack (rigctld, desktop)** | `remote-agent.cjs`, `remote-station.cjs`, `remote-relay.cjs`, `remoto.html` (README: «Remote shack») | You want to control a radio through Hamlib `rigctld` from the desktop/Raspberry Pi app, with its own relay, Opus audio, and the FTX-1 tuner. |

They do not share ports or configuration (the second one uses `~/.radicodex/`). The
radio catalogs and the FTX-1 CAT parsing are duplicated on purpose: they have not
been unified because the formats differ. The TX protections (TX
disabled by default, high-SWR protection, ATAS/tuning time limits,
emergency stop, and PTT watchdogs) are kept in both.

## Integration and limits

- The web navigation links **Remote station (Python host/agent)** only once.
  It prepares a validated HTTPS URL
  and opens the client served by the host; it does not collect or send tokens. The
  **Remote shack (rigctld, desktop)** entry appears only on the desktop.
- RadiCodex Android includes an internal HTTPS screen: no native JavaScript
  bridges, file access, or mixed content. It pins the selected origin,
  rejects invalid certificates, and requests permission only for the microphone.
  When moved to the background it destroys the page/session, with no automatic reconnection.
- The dedicated Android client and the iPhone/iPad project remain in
  `remote-station/apps/web-console/`, with official BricoHams branding, colors, typography, and assets.
  iOS requires a Mac/Xcode to build and sign.
- The coordinating host and the headless agents run separately.
  The [independent USB Android agent](../../../remote-station/docs/agente-android-usb.md)
  has its own APK, an outbound WSS link, and read-only FTX-1 CAT, with
  explicit selection and ES/EN/FR/PT diagnostics. Its physical OTG acceptance,
  audio, PTT, CW, digital modes, and accessories are still pending; it is not confused
  with the client, and those functions are not presented as implemented.
  The local Node firmware server **is not published on the Internet** nor
  turned into a remote proxy. No copies/codeplugs or providers are exposed.
- The existing USB connectors, memory, firmware, and native functions are not
  changed. The station CAT profiles are independent and opt-in.
- Protocol identifiers, `BRICOHAM_*` variables, Python packages,
  and application IDs are kept to avoid breaking existing configuration/clients.
  The aliases `bricohams-station-host` and `bricohams-station-agent` are added.

## Build and run

At the root, with Node 22 and Python 3.12 or later:

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

The host and agent packages are generated in `remote-station/dist/` (a local folder, ignored by git: the artifacts are not versioned).
On POSIX, use `python3` and `remote-station/.venv/bin/python`.
The [secure deployment guide](../../../remote-station/docs/despliegue-seguro.md)
describes TLS/CA/hostname, optional mTLS, and secrets separated by role/link.
The [multilingual help](../../../remote-station/docs/help/README.md) is integrated
into the HTTPS client and the dedicated clients.

The connection URL contains no tokens, paths, or parameters. It must point to the
HTTPS host that serves the built console, not to the agent port.
For RadiCodex WebView, a certificate chain trusted by
Android is required; a TLS error is never bypassed. The dedicated Capacitor client requires
the exact origins documented on the host.

## RF validation and safety

CAT, audio, PTT, rotators, power, and ATU keep their documented interlocks and states.
PTT requires opt-in and independent limits; losing the client
triggers the watchdog, which does not guarantee a physical stop. Check RX on the radio.
USB/RF/mobile acceptance or full compatibility is not claimed just because
a profile exists. Active remote CW, active WSJT-X, native FTX-1 scope, and headless
Android OTG agent are still pending; they are not simulated as real functions.
## Diagnostics

All components have minimized technical logging and options to send it
with consent. See [diagnostics and privacy](DIAGNOSTICS.md) for the closed
contract, HTTPS receiver, roles, retention, and differences between clients.

### Shared Android native library

`android/station-core` contains the minimized logging and the HTTPS validator previously
coupled to RadiCodex. It keeps the public Kotlin package so as not to alter existing calls
or screens; it receives component/version explicitly, validates both
against the contract, and rejects identity changes within the same application.
Stored reports from another component or version are not re-enveloped as its own.
The generated contract is incorporated as a library asset into each consuming APK.
Sending remains disabled by default and credentials stay only in memory.
It is not yet an executable Android OTG agent: USB, service, and link to the host
are still pending. The RadiCodex APK keeps its identity and existing HTTPS client.
The library tests and the RadiCodex connection/diagnostics tests pass, along with both
lints and the APK build. The 53 generated resources, the debug v2 signature, and the JSON
contract inside the updated APK are verified. The security review limited to this extraction
finds no confirmed vulnerabilities; it does not certify the complete product.

## Upstream sources and first FTX-1 USB check

Public GitLab sources and links to maintained Hamlib were reviewed, without accessing
private/paid Patreon or running downloaded code. Patreon provided no
verifiable content; the GitLab search is bounded, not a complete inventory.
The [Yaesu bugs](../../../remote-station/docs/hardware/yaesu-cat.md),
[Xiegu risks](../../../remote-station/docs/hardware/xiegu-candidates.md), and
[OpenGD77 restrictions](../../../remote-station/docs/hardware/opengd77-usb.md)
document evidence, licenses, candidates, and limits without copying code/tables.
FTX-1 now requires ID0840 before and after frequency/mode/power adjustments;
a wrong model or lost identity prevents confirming the adjustment, with no retry.
**230 Python tests** pass, along with Ruff and verification of the 53 generated resources.

The [real USB check](../../../remote-station/docs/hardware/ftx1-spa1.md) resolved a
missing driver with an official signed package and verified 15 queries over the
Enhanced interface at 38400/8N1, with no setters or TX. IF returns P10=3, undocumented
in 2508-C: it is rejected and PTT stays blocked when it cannot verify a
safe state. RF acceptance, audio, reconnection, firmware, or the complete product is not claimed.
The updated wheel and ZIPAPP were verified outside the source tree: they reject an
ID from another model without setters and read ID0840 on the real USB unit. The shared
bundle remains identical in the wheel and dedicated APK; the four SHA256 values match.
The security review scoped to the FTX-1 identity guard found no confirmed
vulnerabilities; it is not a global certification.

## Operational desktop

The shared web/Android/iPhone/iPad client presents the agent controls
before catalogs and protocol references. The CAT/PTT/rotator/power/
logbook links scroll the page; they do not issue commands or change permissions or sessions.
The coordinator card does not authorize TX and the demo remains identified.
The components keep their keys, handlers, and shutdown mechanisms.

The [comparative UX study](../../RADIO_UX_RESEARCH.md) documents public sources,
original decisions, and limits. It is not a copy of commercial products,
a user ranking, or a visual/hardware acceptance. The main controls
have a minimum of 44 px; touch and visual checks remain pending.
This step does not finish the redesign of all the native Workspace screens.
The portal organizes radio/agent, host, and operation in three steps, with no network or
credential storage. In RadiCodex, the configuration collapses during
the connection without recreating the WebView; disconnection and status remain visible.
When disconnecting or moving to the background, the configuration returns, without reconnecting.

## Verification of this integration

- Node target: **483 passing tests**, including installers, translations,
  diagnostics contracts, local origin, and real HTTPS delivery.
- Python host/agent: **212 passing tests** and Ruff with no errors.
- Shared client: **61 passing tests**, lint, and TypeScript/Vite build.
- RadiCodex: six focused connection/diagnostics tests, APK build, and lint.
- Dedicated Android client: APK built and linted; Android/iOS projects
  synchronized with the same built client.
- Both APKs are **debug**, with verified APK v2 signature: not a production signature.
- Wheel installed outside the source tree: diagnostics module, CLI, and packaged
  console verified. Headless ZIPAPP run with `--help`.
- Security review limited to diagnostics: no confirmed
  vulnerabilities. It is not a certification of the rest of the product.
- Visual validation with the integrated browser blocked by a CDP timeout.
  The behavior of the Workspace panel is checked through DOM tests,
  without attributing a visual check to them.

Later CAT increment: FTX-1 adds KS/KP/KR/BI reads checked against
the primary manual, with no keying or memory writes. 23 focused Python tests
and ten client tests on connection, navigation, and regenerated profiles pass;
Ruff, lint/build, and verification of the 53 generated resources are correct.
The wheel and ZIPAPP run the packaged decoders; the shared bundle is identical
in the wheel, APK, and Android/iOS assets, checked by SHA256.

The packages are in `remote-station/dist/`: `agent/`
and `host/` subdirectories, plus the two debug APKs. `SHA256SUMS` allows checking integrity.
Physical USB/RF acceptance, tests on mobile devices, iOS build/signing,
and explicitly pending functions are not covered by these results.

## Yaesu, OpenGD77, and new candidates expansion

- The seven Yaesu radios in the catalog have documented read-only CW queries.
  FT-710, FT-991A, FTDX10, FTDX101D/MP, and FTDX3000 incorporate opt-in adjustments of
  frequency, mode, and power setpoint per model. Correct ID, RX, tuner
  not busy, local limit, deduplication, and readback are verified without enabling TX.
  FTDX101MP supports a setpoint of up to 200 W; the other six do not inherit that limit.
  FT-991A and FTDX3000 do not invent MD1: secondary mode null and control disabled.
  [Manuals, pages, and restrictions](../../../remote-station/docs/hardware/yaesu-cat.md).
- 13 experimental profiles of
  [OpenGD77 USB CPS identification](../../../remote-station/docs/hardware/opengd77-usb.md)
  are integrated into the headless agent and the shared console. INFO only, without entering/leaving
  CPS, writing memory, transmitting, or inferring RF CAT. Unknown firmware/models
  are rejected; old builds without R9 are not presented as compatible.
  The original local programming/screen of the Workspace is kept.
- [Researched Xiegu and Lab599](../../../remote-station/docs/hardware/xiegu-candidates.md)
  are added as candidates without transport: the pending addresses, framing, and response
  details are not guessed from Icom, Kenwood, or Hamlib.
  The catalog contains 68 candidates, not 68 certified radios.
- [FlexRadio SmartSDR](../../../remote-station/docs/FLEX-SMARTSDR-API.md): client
  `smartsdr_protocol.py` / `smartsdr-core.cjs` (discovery, TCP 4992 session,
  VITA-49 meters, guarded TX that is off by default). VITA-49 panadapter and
  waterfall: pending source.
- Final verification: **223 Python tests**, **66 client tests**, and **44 focused
  Node tests** pass; Ruff, lint, and build are correct. A transient WinError 10053
  abort in a rotator test was repeated in isolation and the later full suite
  passed, without changing the controller or the HTTP limits.
- The updated ZIPAPP and wheel were run outside the source tree; the two debug
  APKs verify the v2 signature. SHA256SUMS matches the four packages. The current
  bundle matches byte for byte across the wheel, dedicated APK, and Android/iOS assets.
  RadiCodex keeps its APK: it loads the current interface from the HTTPS host,
  and does not incorporate a new CAT engine in the WebView.
- Publication remains blocked: HTTPS has no credentials and SSH rejects
  publickey authentication. The official github.com key was verified in an isolated
  file, without modifying SSH profiles or disabling host checking.

These increments do not finish active CW, active WSJT-X/CAT broker, independent
USB OTG Android agent, iOS/production signing, or cross-platform physical acceptance.

## Languages of the operational controls

Frequency/mode and power/tuner use the ES/EN/FR/PT selector of the shared
client, including errors and safety warnings. Changing language keeps
readings, edited values, limits, and permissions; it does not remount controls or issue
CAT requests. The linked technical references keep their original language.

Verification: **72 client tests**, lint, and TypeScript/Vite pass;
six new cases check language changes with SUB without mode and the
200 W limit of FTDX101MP, without altering restrictions. Wheel reinstalled outside the source
tree and dedicated APK rebuilt with lint and debug v2 signature verified.
The bundle matches by SHA256 in the wheel, APK, and Android/iOS assets; SHA256SUMS
is updated for the two affected packages. ZIPAPP and the RadiCodex APK do not change.
iOS build, physical acceptance, or production signing is not claimed.

## Limited WSJT-X commands

The agent and the host incorporate an authenticated POST for Replay and Halt Tx,
exclusively with local `--enable-wsjtx-safe-commands`. The shared web/Android/iPhone/iPad
console offers both actions in ES/EN/FR/PT. There is no TX start,
Reply, Free Text, or Configure; the CAT broker and full digital operation
remain pending. See [activation and UDP limits](../../../remote-station/docs/agente-cat-wsjtx.md).

The first loopback Heartbeat/Status origin is pinned until the agent
restarts. A different origin, an expired/closed instance, unsupported fields,
and repeated IDs are rejected; Replay has a limit of one request per second.
This does not authenticate the WSJT-X process. Delivery always declares
`sent_unconfirmed` and does not confirm an RF stop; the UI requires a new query
after an error, with no retries. Keep physical protections and check RX.

Verification: **228 Python tests** and **74 client tests** pass,
including POST over two validated TLS links, CORS, and rejection of a response
claiming to confirm an RF stop. Ruff, lint, TypeScript/Vite, and 53 generated
resources are correct. A Workspace diagnostics timeout in the concurrent
run was repeated in isolation and then in the full suite with two
workers; both passed without changing that test or its limits.

Wheel and ZIPAPP run outside the source tree; dedicated APK with build,
lint, and debug v2 signature correct. Bundle identical in wheel/APK/Android/iOS assets
and SHA256SUMS updated. Security review limited to this increment
and its authentication/TLS helpers: no confirmed vulnerabilities.
It does not certify the whole product, WSJT-X in real operation, or hardware.

## Languages without interrupting active controls

PTT, rotator, RX audio, and the CAT/WSJT-X panel share ES/EN/FR/PT, including
safety warnings and local framing errors. The stop and
renewal callbacks keep their identity when changing language; the lease is not restarted,
START/MOVE/STOP is not sent, and the audio graph is not recreated because of that change.
The agent's technical responses and external errors keep their format/language.

**89 client tests**, lint, and TypeScript/Vite pass. The new cases
check active PTT/rotator with renewal and subsequent stop, no
new commands when changing language, preservation of AudioContext/node/request,
translatable framing errors without reopening audio, and preserved CAT selection.
The prepared TX microphone also keeps its instance and session when changing
language; losing focus still closes it and requests RX.
The initial check detected deferred visual translation in the helper; translation
and rendering were separated and the callback made stable before validating the full suite.
Wheel reinstalled outside the source tree and dedicated APK rebuilt with lint
and debug v2 signature checked. The same bundle appears in wheel/APK/Android/iOS
and SHA256SUMS matches the four packages. ZIPAPP and the RadiCodex APK do not change.
Physical/mobile acceptance or iOS build/signing is not claimed.
