# Requirements and delivery review

Revision of 25-10-2026. The project remains in Beta. This matrix distinguishes
implemented features from physical tests and outstanding goals.
A successful build does not prove that a radio has booted it.
**Incomplete delivery:** requirements remain to be implemented and validated.

## Supplemental review of 26-10-2026

The matrix and figures below dated 25-10 are historical. For the current
audit, see [V3 and Android end-to-end validation](VALIDACION-INTEGRAL-V3-ANDROID.md):
283 successful local web tests, 92 local Android host tests, and 93 in the
isolated published revision `01c58563e6507d17bd2bec612ef669840abfeddb`.
These results are not interchangeable. The local Android sector-CRC fix has
not been published. Instrumented tests use an isolated database and compile,
but have not been run on a device. There is no physical certification of the
current SAT slot's contacts, channels, or CAT.

The published revision includes General/POTA/SOTA logbooks and a pass list
that are not in this local checkout. Historical matrix items AND-02/AND-06
must be interpreted according to the revision being evaluated.
The independent resident and BHA1 apps are experimental: portable tests do not
equal physical USB/Flash support or validated boot.

## Reviewed requests

| ID | Request | Status and evidence | Outstanding before completion |
| --- | --- | --- | --- |
| USB-01 | Load and delete Quansheng PMR and repeater channels | Connector, editor, and safeguards implemented. Two matching real configuration/calibration reads; 200 channels in F4HWN v6.0.0 | Full backup and real write, delete, and reread tests |
| USB-02 | Load satellites and Quansheng Doppler memories | SGP4 planning, RX memories, and experimental CAT RX in the Satellites image | RF validation and physical memory loading on the unit |
| FW-01 | Firmware version catalog | Catalog and guides by family, revision, and options | Maintain coverage as new versions are added; recognition does not mean tested compatibility |
| WEB-01 | Publish and redeploy the website | Latest published main: `f7bd6125893385dd517fecd105967f241a65991f` | Publish later changes and check Pages; no new publication in this revision |
| FW-02 | Document Karina comprehensively | V1 dossier, V3/UV-K1 Dim0s package, inventories, hashes, and observed features | Complete functional and visual comparison; source project has not been recovered |
| FW-03 | Bricohams with all Karina features | Independent implementation on the open F4HWN V3 base; not a Karina copy or rebuild | Complete functional parity and per-feature tests; 100% is not claimed |
| FW-04 | Multiboot and on-demand modular builds | Builder pinned to a commit, presets, separate modules, and structural verification | Test boot, slot switching, and recovery on V3 without replacing Main |
| FW-05 | Existing firmware library in slots | Local selection and classification by format/model, with incompatible images rejected | Install and test each compatible image; no automatic V1-to-V3 conversion |
| FW-06 | ARDF activatable and separate if everything does not fit | ARDF image: cycles, synchronization, and manual attenuation memory | Field tests and remaining documented behaviors |
| FW-07 | Spectrum and VFO-PRO features | Spectrum image: RSSI, peak hold, averaging, RAM presets, exclusions, RX capture, and CSS search | Verify RF/CSS and equivalence of outstanding features; does not transmit or calibrate |
| FW-08 | Preserve spectrum presets | BHSP export/import with atomic validation and reread | Internal persistence if needed; files are not EEPROM |
| FW-09 | MIT license stated for Karina | Statement recorded; no verifiable notice found in the package | Identify rights holder, component, and license text before redistributing it as MIT |
| HELP-01 | Complete help for all families and options | Fourteen HTML guides, including Android and this review; 84 interface options, 18-version history, and 94 historical options | Expand for each new feature; do not claim variant coverage without evidence |
| HELP-02 | OpenGD77 and all its models | Configuration guide and matrix by family/revision | Physical testing by model; the catalog does not certify every radio |
| PRO-01 | PRO mode without repeated confirmations | Explicit per-session activation and protected operations | Does not remove browser permissions or backup, CRC, hashes, or Main protection |
| DATA-01 | Configure RepeaterBook in the installed version | Provider form and local server with token in memory | Test with your own credentials and authorization; no tokens included |
| DATA-02 | Automatically download DMR contacts | RadioID and selection/import; CSV on the web when CORS prevents direct API access | Verify by equipment and capability; not every service allows direct access from Pages |
| DATA-03 | Download DMR rooms/groups | BrandMeister query and group import | A talkgroup is not equivalent to every room on every network; complete other requested integrations |
| GD77-01 | Full OpenGD77 CPS with no installation | Standard editing, references, data, and planning in browser | Flashing, voice prompts, large ID database, complete zones/settings, and parity with external CPS are not implemented |
| GD77-02 | Automatically back up original firmware and calibration before operation | Automatic calibration and codeplug with hashes; PARTIAL result | Verified full MCU read by model; subsequent physical operations remain blocked |
| ANY-01 | AnyTone web CPS | Beta section with JSON/CSV project, import, editing, and zones | USB, native RDT, and complete parameters by model/firmware |
| ANY-02 | Codeplug with Spanish digital and analog repeaters | PMR and RepeaterBook, RadioID, and URE normalizers | Current authorized sources, verified nationwide coverage, and native codeplug for the exact model |
| ANY-03 | Reuse OpenGD77 and Quansheng databases | Supported format imports preserving known parameters | Complete and review unpublished fields; do not invent TS/TG |
| ANY-04 | Airports if AnyTone supports the air band | RF frequency import with AIP source and manual AM confirmation | Exact model, current list, and AM/spacing verification; no national airport database included |
| CAT-01 | Change frequency during the selected pass | CAT RX physically enabled, 3 s lease, web tracking with safe stop; separately, CAT TX v1 (PTT by lease, key 9) only for sending SSTV | Real USB/RF validation; no autonomous tracking in the radio or uplink Doppler |
| CAT-02 | Edit frequency, subtones, and power per channel from Android | Android Beta channel editor for F4HWN v6 FM: name, RX/TX, RX and TX CTCSS/DCS, power, narrow, and TX lock; full backup with radio CRC and on-disk SHA-256, block writes in web order and reread; 10 host tests with simulated radio | Run tests in CI, real OTG write/reread test on a radio, and persistence after reboot |
| AND-01 | Bricohams Android app | Kotlin project 0.8.2-beta; SQLite, ADIF, SSTV, ARDF statistics, microphone capture, and CAT RX over CDC ACM and recognized adapters, with host tests | Outstanding features, installation, permissions, and OTG/RF testing of each cable on a phone |
| AND-02 | Look4sat-like satellite features with a similar interface | Offline Android SGP4, imported TLEs, manual observer, 24 h passes, and CAT RX Doppler with safe stop | Look4sat-style interface (pass list, polar radar, map), automatic TLE/transponder downloads, observer GPS, phone/cable/radio matrix and field testing; Look4sat parity is not claimed |
| AND-03 | Robot36 SSTV with CAT against Bricohams firmware | WAV decoder and microphone capture with VIS/parity, 320x240 color and PNG; CAT screen records Robot36 while Doppler or CAT tuning remains active; synthetic tests | AudioRecord, physical path, and RF validation; continuous streaming decoding, drift, and noise |
| AND-04 | Decode Morse | Text, PCM WAV, and microphone capture up to 60 s with post-capture decoding and fixed tone/speed; synthetic tests | Real AudioRecord, continuous decoding, adaptation, and error measurements on real samples |
| AND-05 | “SSTVEncrip”: encode and send SSTV like SSTV Encoder (interpretation accepted by the user) | Robot36 encoder with round trip through decoder; send from CAT screen with firmware CAT PTT v1 (0x7B02): arm on radio with key 9, 1.5 s lease, 120 s cutoff, TX lock, bands, battery and radio modulation, abort on any key, callsign required on image and confirmation in app; core/adapter C tests and 4 host tests with simulated radio; satellite image builds without warnings | Radio test and RF measurement (microphone level, deviation, LED, key cutoff); other SSTV modes (Martin, Scottie, PD); uplink Doppler |
| AND-06 | HAMRS-like logbook | SQLite contacts, search, edit/delete, ASCII ADIF with import/preview, JSON and transactional restore; host tests | HAMRS-like workflow and interface (activity logbooks, POTA/SOTA templates, quick entry), phone validation, and expanded ADIF; HAMRS parity is not claimed |
| AND-07 | Upload to LoTW | Goal documented; ADIF/TQSL is not direct upload | Signing, certificate, key custody, and verifiable LoTW workflow from Android |
| AND-08 | Fox-hunt statistics with GPS | Firmware exports summary; Android stores sessions, history, point fixes with accuracy/UTC, beacon intervals, and filtered sums of GPS segments without joining gaps, with prior authorization | Real GPS, continuous track, maps, firmware synchronization, and expanded field statistics |
| BRAND-01 | Bricohams branding and boot logos | Welcome screen and embedded monochrome bitmap; Android preserves original PNG and orange accent | Check physical LCD and phone interface |
| BRAND-02 | Corporate orange on completion and testing | Palette documented; corporate logo preserved | Final web/Android migration, contrast, and visual regressions |
| DOC-01 | Natural documentation without AI personalization | Editorial review of visible authorship and conversational narratives | Maintain a direct technical style; preserve licenses and legal attribution |
| REL-01 | Push to main when finished | Publication authorization recorded | Close requirements or explicitly agree to partial delivery; push and check CI/Pages |
| REL-02 | New installers with all features | Existing build chain for Windows, Debian/Raspberry Pi, Arch, and FreeBSD | Build from delivery revision and test contents/boot; no new installers in this revision |
| REL-03 | ZIP with project, firmware, installers, and development builds | Development exporter prepared with integrity checks and exclusions | Run it with all delivery artifacts and check extraction; does not replace outstanding features |

## Latest software evidence

- 211 successful JavaScript tests in this revision, including Android export
  with ZIP extraction and integrity verification.
- Eight C suites passed in the latest firmware validation; this documentation
  and delivery revision does not change C sources.
- ARDF build with statistics: 113960 bytes RAW, RAM 12576/16384,
  Flash 113072/120832; manifest and ten source hashes checked.
- Satellite CAT: 113868 bytes RAW. Spectrum with BHSP: 118044 bytes RAW.
- ARDF panel present and locked when the browser is offline.
- None of these images has been flashed or physically validated.
- Android 0.7: APK and instrumented tests compiled. Sixty-nine JVM/Robolectric
  tests passed in CI, including simulated USB/CAT, ADIF, Robot36, SGP4,
  microphone capture/screen, and ARDF statistics/history. On 2026-10-26, 84
  host tests pass locally, including channel editor (CAT-02) and SSTV sending
  via CAT PTT (AND-05); their first CI run is pending. Zero errors and thirteen
  lint warnings. Signatures and hashes for 58 sources verified; each build
  manifest records its corresponding result. Instrumented tests are compiled,
  not run; no phone is connected.

The numbers are dated evidence, not a counter that replaces testing each
revision. Earlier builds remain developmental builds; a folder name containing
`final` does not make them stable releases.

## Delivery conditions

1. Review every ID and close its outstanding item with evidence, or record an
   approved scope change. Do not replace a requirement with a button or mock.
2. Test software, documentation, local startup, and actual capabilities.
   For hardware: full backup, identification, and authorized tests.
3. Apply and verify the orange palette when features are complete.
4. Build installers from the same revision and verify contents, licenses,
   integrity, and startup. Do not reuse older packages as new ones.
5. Publish to main, check CI and Pages, and record the published revision.
6. Export sources, history, firmware artifacts with their sources and
   licenses, installers, and verifiable developmental builds. Include an
   inventory and hashes.
7. Extract the ZIP to another directory, verify hashes, and test startup.
   Check that it contains no credentials, radio backups, or calibrations.

## Export scope

The exporter creates a **Beta development snapshot**; it does not certify that
the matrix is complete. It requires acceptance through `--beta`. It does not
publish, build, or flash. Its use is described in
[Deployment](DEPLOYMENT.md#exporting-the-project). Final delivery remains
conditional on the items above.

Development builds are verifiable Bricohams builds and the Git history of
HEAD together with the current source state. The exporter does not include all
of `Documents/Multiboot` by default: it contains third-party packages,
configurations, and calibrations that must not be confused with a project
distribution. Failed build directories are reported, not presented as
firmware. The `--android` option includes a Beta APK delivery only if all
source hashes exactly match the exported snapshot; it includes a guide,
licenses, and build evidence. It does not include historical APK development
builds without their corresponding sources or invent physical validation.