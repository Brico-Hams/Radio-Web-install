# Third-party reuse ledger

Developer document (not part of the translated help center). It records where third-party code and knowledge enters this project, under which licence and with which limits. The reference collection lives under `data/third-party/refs/` and is ignored by git: it is never committed or redistributed.

## Policy

- This project is GPL-3.0-or-later. Code may be adapted only when the licence of the source is compatible with it.
- **REUSE** (code may be adapted): MIT, BSD (2/3-clause), Apache-2.0, LGPL, GPL-2.0-or-later and GPL-3.0. A GPL-2.0-only source is not compatible and counts as FACTS.
- **FACTS** (read only for protocol and hardware facts, implemented in our own words): repositories without a licence, PolyForm Noncommercial, Baofeng Public License, AGPL, and anything unclear or not yet verified.
- Never use OEM binaries, keys, calibration data, memory dumps or decompiled code.
- When code is adapted: keep the original copyright and licence notice plus an `SPDX-License-Identifier` line in the adapted file, add a row to the adapted-files table below (repo, file, licence, changes) and extract the smallest useful part, never a whole repository.
- Every protocol command, scale or limit must cite a reference file in this repository; otherwise the UI shows "pendiente de fuente" and keeps the control disabled.
- Never move pins, memory maps or registers from one radio model to another.
- A licence found only in a local copy is not proof of the upstream licence: re-check LICENSE, NOTICE and per-file SPDX before the first adaptation, and record the commit.

## Collection repositories

Licences are those stated in the collection catalogue (inventory 2026-11-23); "to verify" means no reliable licence statement, so the repository is FACTS until verified.

| Repository | Licence | Class | Intended use |
|---|---|---|---|
| RadioFoundry | MIT | REUSE | Driver layering, tests and documentation patterns; keep LICENSE, SPDX and NOTICE of third-party parts |
| RadioFoundry-SoapyLR20xx | MIT with Semtech BSD notices | REUSE | Only useful for LR20xx hardware; snapshot is partial (symlinks missing) |
| RadioFoundryGateway | MIT upstream (not downloaded) | FACTS | Nothing until downloaded and pinned to a commit |
| Radtel-RT950-Hertzz | GPL-3.0 | REUSE | Main reference for the RT-950 Pro (AT32F403A) bring-up, drivers and tools; hardware revision must match. Candidate build only (Beta, TX inhibited, `firmware-candidates.yml`, see docs/FIRMWARE-ACTUALIZACIONES.md); no source adapted into this repository |
| Radtel-RT950-Ferrite | PolyForm Noncommercial 1.0.0 | FACTS | Architecture, TX safety and persistence ideas only |
| Radtel-RT950-APRS-KISS | No licence found | FACTS | APRS/KISS behaviour and test ideas |
| Radtel-Web-Flasher-nicsure | No licence found | FACTS | Protocol and backup procedure observations; no OEM binaries, keys or dumps |
| nicsure/JKI reverse-engineering repos | No clear licence, contain OEM/decompiled material | FACTS | Technical facts with attribution and confidence; clean implementation only |
| Quansheng-UV-K5 | Apache-2.0 (local copy; check dependencies) | REUSE | UI, keyboard and driver organisation patterns; never pins, RFIC, calibration or memory maps for another radio |
| Quansheng-UV-K5-Research | To verify | FACTS | UV-K5 facts only |
| Quansheng-UV | To verify | FACTS | Variant facts once the exact variant is identified |
| Baofeng-UV-K6 | Baofeng Public License 1.0 | FACTS | UV-K6 facts only |
| md380tools | To verify | FACTS | DMR/codeplug facts; DSP, bootloader, RFIC and memory are model specific |
| OpenGD77-preserved | GPL-2.0 per local docs (or-later not confirmed) | FACTS | DMR, hotspot and channel concepts until the per-file licence is confirmed as GPL-2.0-or-later |
| OpenRTX | Several licences (per file) | FACTS | Modular architecture; per-file review needed before any adaptation |
| Adafruit_BusIO, GFX, ILI9341, SH110X, GPS, Zero_DMA, Zero_FFT, RTClib | To verify | FACTS | Check the real display, bus and MCU first |
| U8g2_Arduino, Goertzel, DTMF, Time | To verify | FACTS | Tone detection and display facts; measure rates and timing on real audio |
| RadioLib, Heltec boards, ESP OLED driver | To verify | FACTS | Only for compatible LoRa/ESP hardware |
| Other Arduino libraries (Firmata, Keyboard, Ethernet, SD, Servo, WaveHC, HotButton, EspUsbHost) | To verify | FACTS | Not included automatically |
| IJV (UV-K5 V1 firmware, N3.60) | Freeware, modification/reverse engineering forbidden by default; express author permission for analysis reported by the owner 2026-11-25, written document pending | FACTS | Behavioural analysis of the retune path only (docs/IJV-ANALISIS-RETUNE.md); no IJV code, bytes, listings or tables are committed |
| Yaesu / Icom reference material | Not firmware | FACTS | CAT/CI-V facts only, from `docs/FTX1-KNOWLEDGE.md` and `data/third-party/IC-705_ENG_CI-V_6.txt`; one adapter per model |

## Adapted files

| Repo | Upstream file | Local file | Licence | Changes |
|---|---|---|---|---|
| Hamlib | `rigs/icom/xiegu.c`, `rigs/icom/icom.c`, `rigs/icom/icom_defs.h`, `tests/testg90swr.c` | `remote-native-cat.cjs` (`XieguCivRig`, `XIEGU_MODELS`), `tests/remote-native-cat.test.cjs`, `data/remote-station-catalog.json` | LGPL-2.1-or-later | Per-model CI-V address, baud range and Hamlib model number; command/sub-command codes (03/04/05/06/07/0F/15/1C); S-meter calibration tables (X108G, X6100) and the default SWR table; the G90 rule that rejects non-BCD SWR replies; tolerance for the non-standard PTT acknowledgement. Rewritten in JavaScript with an injected transport, TX gating (`allowTx`, PTT off never gated, release after a failed key-up) and deterministic tests built from the frames in `testg90swr.c`. |
| Hamlib | `rotators/gs232a/gs232a.c`, `rotators/gs232a/gs232b.c` (Copyright (c) 2001-2012 Stephane Fillod) | `station-devices.cjs`, `remote-station/bricoham_station_agent/station_devices.py` | LGPL-2.1-or-later | Copyright (c) 2001-2012 Stephane Fillod. Re-implemented the GS-232A/B frames (`Waaa eee<CR>`, `C2<CR>`, `S<CR>`), reply formats (`+0aaa+0eee`, `AZ=aaa EL=eee`) and baud ranges in JavaScript and Python with strict reply validation, explicit baud, elevation limits from the agent config, lease/deadman/stop handled by the existing rotor layer. Speed and continuous-move commands were not taken. |
| Hamlib | `rotators/spid/spid.c`, `rotators/spid/spid.txt` (Copyright (c) Norvald H. Ryeng, LA6YKA; Hamlib authors) | `station-devices.cjs`, `remote-station/bricoham_station_agent/station_devices.py` | LGPL-2.1-or-later | Copyright (c) Norvald H. Ryeng, LA6YKA; Hamlib authors. Re-implemented the 13-byte Rot2Prog set/status/stop frames and the 12-byte reply decoding (`-360`, `PH`/`PV` resolution) in JavaScript and Python; resolution is read before every move and validated against 1/2/4 pulses per degree; no Rot1Prog or MD-01 support. |
| Hamlib | `amplifiers/elecraft/kpa.c`, `kpa1500.c`, `kpa.h` | `station-amplifier-drivers.cjs`, `remote-station/bricoham_station_agent/amplifier_drivers.py` (KPA driver) | LGPL-2.1-or-later | (c) 2019 Michael Black W9MDB. Re-implemented as a standalone driver over an injectable transport: `;` wake-up, `^OS`/`^ON`/`^OP`/`^SW`/`^SF`/`^PWF`/`^FR` commands, fault table; STANDBY is read back, `^ON0` is never sent, parse of the reply prefixes corrected where `kpa.c` reuses the wrong one. |
| Hamlib | `amplifiers/expert/expert.c` | same files (Expert driver) | LGPL-2.1-or-later | (c) 2023 Michael Black W9MDB, (c) 2026 Mikael Nousiainen OH3BHX. Frame builder (`55 55 55 CNT DATA CHK`), 67-byte status parser with 16-bit checksum; OPERATE toggle (`0x0D`) is sent at most once and only after a status read. |
| Hamlib | `amplifiers/gemini/gemini.c`, `dx1200.c`, `gemini.h` | same files (Gemini driver) | LGPL-2.1-or-later | Hamlib authors. `S` status parser, `R`/`R0`/`R1` operate; `TRIP` treated as a fault; no band follow because the Hamlib band table is not coherent. |
| DeDuben7/quansheng-uvk5-ardf (Scout ARDF v1.3, commit `52c12b6b7fd8`) | `core/`, `platform/uv-k5-v3-py32f071/` (built whole from a pinned checkout; `LICENSE` and `NOTICE` read and shipped) | `scripts/build-upstream-ardf.cjs` (source transforms only; nothing vendored in this repository) | Apache-2.0 | Copyright 2026 DeDuben7 (NOTICE also credits Dual Tachyon, egzumer/reald, armel, Arm CMSIS). Candidate build only: boot screen replaced by the Bricohams logo (`ui/welcome.c`), PIN unlock disabled and `radio_tx_start` unreachable (`scout/tx.c`), build marker added. LICENSE and NOTICE are copied next to the image with an `ATTRIBUTION.txt`. No binaries, flashers or PDFs taken. |
| reald/uv-k1-k5v3-firmware-custom (tag ARDF-K5v3_K1-v0.6, commit `bfdf068f3c78`) | `App/app/ardf.h` (`ARDF_DURATION_CORR`, K1/K2 clock model) | `firmware/bricohams/ardf.c` (`bh_ardf_clock_ppm`), `ardf_foxhunt.inc`, `firmware/tests/ardf_test.c` | Apache-2.0 | Copyright 2024 Dennis Real. Only the formula idea is adapted (ticks/minute = K1 + K2*T/10, nominal 6000 ticks per minute); rewritten as an integer-only pure function with the module's slow-positive ppm sign, a +-50000 ppm clamp, input validation, a cycle temperature accumulator and session-only K1 (key 0), with deterministic host tests. EEPROM persistence (sector 0x00D000), the temperature ADC code, menus, distance model and gain cheats were not taken. The clone lives under the gitignored `data/third-party/refs/`; no binaries, `.exe` tools or CHIRP module copied. |
| jewelux/quansheng-k5-v3-admin-user (MILI, commit `dc8c1767b1e1`) | `firmware-v3/` with preset `AdminUser-SAM-RXOnly` (built whole from a pinned checkout; root `LICENSE` and `firmware-v3/LICENSE` read and shipped) | `scripts/build-upstream-ardf.cjs` (source transforms only; nothing vendored in this repository) | Apache-2.0 | Candidate build only: the preset must resolve `ENABLE_PREVENT_TX` to true (RX-only as upstream declares), boot screen replaced by the Bricohams logo (`App/ui/welcome.c`), `EDITION_STRING=Bricohams`, build marker added. Licence files copied next to the image with an `ATTRIBUTION.txt`; the upstream has no NOTICE file. No binaries, flashers or PDFs taken. |
| macexpert-spe | `SPEProtocol.swift` | same files (Expert driver) | MIT | (c) 2026 Manoj Ramawarrier VU2CPL. Status CSV field order and example frame used as test data; no code copied. |
| SPE-1.3-2K-FA-Remote-server | `server.py`, `README.md` | same files (Expert driver) | GPL-3.0-only | OH2GEK. Request frames `55 55 55 01 90 90` and `55 55 55 01 0D 0D` and the status request flow, re-written in the project style with safety checks. |
| ACOM-Controller | `MainWindow.xaml.cs`, `README.md` | same files (ACOM driver) | MIT | (c) 2019 Bjorn Ekelund. Telemetry enable/disable, operate/standby frames, 72-byte telemetry offsets, per-model temperature offsets and error codes; every error code counts as a fault. |
| POTACAT | `lib/flex-scope.js` | `remote-station/bricoham_remote_station/drivers/smartsdr_protocol.py`, `smartsdr-core.cjs` | Apache-2.0 | Copyright 2026 Casey Stanton; file SPDX header. FFT packet parser (class 0x8003), pixel-to-level mapping, frame assembler with junk-frame drop and `display pan set` sizing, ported; added strict length checks, stream filtering and tests. |
| ThetisLink | `sdr-remote-server/src/tx_orphan.rs` (`OrphanWatch`) | `remote-txsafety.cjs` (`OrphanWatch`), `remote-agent.cjs` (`watchTx`) | GPL-2.0-or-later | The two-consecutive-ticks rule and fire-once behaviour, ported from Rust to JavaScript as a pure class with SPDX and notice kept. The "agent keyed it" flag comes from the agent, so a front-panel transmission is never touched; it fires through the existing PTT-off path and TX log. Not ported to Python: `PttController._expire` already unkeys every orphan case there (lease expiry, cap, revoked guest, failed unkey retry), proven by `remote-station/tests/test_tx_inhibit.py`. Reference snapshot has no git commit (local copy of 2026-11-23). |
| RemoteRig | `common/protocol.cpp` (`occupiedSpan`) | `remote-txsafety.cjs` (`occupiedSpan`), `remote-station/bricoham_station_agent/txsafety.py` (`occupied_span`) | MIT | Copyright (c) 2026 Yoann / RemoteRig Project; MIT text kept in both files. Qt types replaced by numbers, this product's mode names, fallback widths (CW 200, AM 6000, FM-like 12000, other 2700 Hz) used only when the rig reports no passband, `null`/`None` for an unknown carrier or mode. |
| RemoteRig | `server/servercore.cpp` (out-of-band edge handling, `checkClientAlive`) | `remote-agent.cjs`, `remote-station/bricoham_station_agent/ptt.py`, `server.py` | MIT | Logic only, own code: cut an ongoing transmission when the span crosses out of the configured ranges and log only the crossing. Ranges come only from explicit station configuration (`txRanges` / `tx_ranges`); off and reported "not-configured" when absent. `checkClientAlive` was only compared with the existing heartbeat (1 s) and lease thresholds, which are stricter and unchanged. |
| remoteAudio | `audio/nodes/doorman/doorman.go` | `remote-audio.cjs` (`txWrite`, `txBegin`) | MIT | Copyright (c) 2016 Tobias Wellnitz, DH1TW; notice kept in the file. Single-talker idea: audio from anyone but the current talker is dropped until the talker has been silent; here the talker is the PTT lease owner's audio socket, the silence window is 200 ms on an injectable clock, and the sink is killed when the talker changes or PTT is keyed again so no tail of a former owner is played. |
| remoteAudio | `audio/nodes/vox/vox.go`, `audio/nodes/trx/trx.go` (`SetPTT`, VOX and PTT gating) | `remote-vox.js`, `remote-ui.js`, `remote-station/apps/web-console/src/PttPanel.tsx` | MIT | Copyright (c) 2016 Tobias Wellnitz, DH1TW; notice and SPDX kept in `remote-vox.js`. RMS threshold (default 0.1) and hold time (default 500 ms) rewritten as a pure state machine with injected clock and PTT callbacks. It never keys on its own: it calls the same PTT request, heartbeat and lease path as the PTT button, is never persisted, and disarms on hidden page, control loss, link down, PTT button, any refusal or agent cut. |
| RemoteRig | `common/speechproc.cpp`, `common/speechproc.h` | `remote-speech-proc.js` | MIT | Copyright (c) 2026 Yoann / RemoteRig Project; notice and SPDX kept in the file. High-pass, presence peak and low-pass biquads and the soft-knee compressor rewritten in JavaScript with bounded operator ranges, smoothed gain, automatic make-up, a final peak limiter below full scale, and bit-identical samples while off. |
## Reviewed, nothing adapted

| Repo | Upstream file | Local file | Licence | Changes |
|---|---|---|---|---|
| k3ng_rotator_controller | `README.md`, `rotator_features.h` | documentation only | GPL-3.0 | Used to confirm that GS-232A and GS-232B emulation differ; the emulation source is not in the reference copy, so no frames or code were taken. |
| remoteRotator | (reference only) | none | see its `LICENSE` | No code adapted. |
| remoteAudio | `audiocodec/opus/encoder.go` | none | MIT | Compared only (Opus options); the existing encoder settings were kept. |
| ATU-100-EXT-YAF-2E0UMK | whole repo reviewed | nothing | MIT, DG4SN / 2E0UMK | Reviewed: only a debug bit-banged UART TX, no host command set, so no driver. Catalog entry `atu-100-ext` stays `pendiente de fuente`. |
| POTACAT | `lib/smartsdr.js` | facts only (own implementation) | GPL-3.0 | Facts only: `xmit 1\|0` syntax; implemented in our own words behind `allow_tx`, time cap and SWR trip. |
| Telegram-Radio-Source-Archive | `source-files/loose/*.py` (CHIRP drivers), `docs/REVERSE_ENGINEERING.md` | nothing (`docs/ARCHIVO-TELEGRAM-ANALISIS.md` only) | GPL-2.0-or-later | Reviewed for classification: the local copy holds no firmware C source (`source-packages/` is empty), so no code was adapted. Drivers without a licence header (Robzyl, GOGUFW) and Karina are FACTS. The BK4819 retune sequence there is an unvalidated reconstruction and was not implemented. |
## Engineering method for new radios

Short version of the method in the collection notes, in our own words. See also [MAPA-TECNICO-PROYECTO.md](MAPA-TECNICO-PROYECTO.md).

1. **Board profile per radio.** Keep one profile per model and PCB revision (SKU, MCU, RF chip, codec, display, memory, OEM firmware, cable, recovery mode). Radios sharing a case can use different boards; never merge pinouts or tables by brand or name.
2. **Signal classes.** Mark each pin, register, command and limit as *documented* (datasheet, schematic or a file in this repo), *measured* (own measurement with instrument, unit, firmware and date), *inferred* (reverse engineering or community report) or *pending*. Only documented or measured items may drive hardware; pending items stay disabled and show "pendiente de fuente".
3. **Port procedure.**
   1. Record URL, commit, hash, licence and dependencies.
   2. Define the function and its interface without tying it to pins.
   3. Separate the algorithm from I/O and test parsers and state machines on the host with fake clocks and transports.
   4. Add a model-specific hardware layer that fails the build when a mandatory pin is missing.
   5. Validate RX, memory and recovery without TX.
   6. Test TX only on a dummy load with suitable instruments.
   7. Document differences and attribution; release per model and revision with hash and rollback.
4. **Safety coordinator.** Station peripherals (rotor, ATU, amplifier, power, relays) get separate adapters per model, and one coordinator checks permissions, band and antenna/ATU/amplifier before TX, then watches time, temperature and SWR. On any error PTT drops first and the amplifier goes to STANDBY; an independent stop path must not depend on the network. The software never keys by itself.
## Reference facts (Hamlib caps, wfview)

Every row records what was taken from a third-party source and what was changed.

| Repo | File | Licence | What was taken | What changed |
| --- | --- | --- | --- | --- |
| Hamlib (reference tree 5.0-dev) | `rigs/{icom,kenwood,yaesu,yaesu/ftx1,flexradio}/*.c`, `riglist.h` | LGPL-2.1-or-later | Facts only: model numbers and the declared levels, functions, VFO operations and handler presence of each backend caps struct | No code or calibration table was copied. `scripts/hamlib-caps-extract.cjs` (own code) records the facts in `data/remote-hamlib-caps.json`; `remote-hamlib-caps.cjs` derives the parity and meter statuses; `scripts/remote-caps-apply.cjs` writes them |
| wfview | CI-V command usage for Icom radios | GPL-3.0-or-later | Read as a cross-check of which meters and operations Icom radios expose; nothing copied | Nothing vendored |
| Hamlib | `rigs/flexradio/smartsdr.c` | LGPL-2.1-or-later | Facts only: `xmit %d` syntax confirms the POTACAT source | Nothing copied |

Notes:

- The reference tree is Hamlib 5.0-dev while the catalogue pins `hamlibVersion` 4.7.2. The extracted caps are reference facts; the `dump_caps` of the installed `rigctld` still decides at runtime.
- Declared but unreached meters (COMP, ID, VD, TEMP over Hamlib) are listed per radio in `data/remote-meter-model.json` (`backend.unreached`) and are not upgraded.
- Re-run `node scripts/hamlib-caps-extract.cjs`, `node scripts/remote-caps-apply.cjs` and `node scripts/remote-parity-docs.cjs` after updating the references.
- Not found in any reference: ping/keepalive syntax and waterfall-tile layout (kept "pendiente de fuente").
- Reference repos live in `data/third-party/` (gitignored, never committed).
