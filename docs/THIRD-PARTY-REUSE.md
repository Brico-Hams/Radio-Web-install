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
| Radtel-RT950-Hertzz | GPL-3.0 | REUSE | Main reference for the RT-950 Pro (AT32F403A) bring-up, drivers and tools; hardware revision must match |
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
| Yaesu / Icom reference material | Not firmware | FACTS | CAT/CI-V facts only, from `docs/FTX1-KNOWLEDGE.md` and `data/third-party/IC-705_ENG_CI-V_6.txt`; one adapter per model |

## Adapted files

| Repo | Upstream file | Local file | Licence | Changes |
|---|---|---|---|---|
| Hamlib | `rigs/icom/xiegu.c`, `rigs/icom/icom.c`, `rigs/icom/icom_defs.h`, `tests/testg90swr.c` | `remote-native-cat.cjs` (`XieguCivRig`, `XIEGU_MODELS`), `tests/remote-native-cat.test.cjs`, `data/remote-station-catalog.json` | LGPL-2.1-or-later | Per-model CI-V address, baud range and Hamlib model number; command/sub-command codes (03/04/05/06/07/0F/15/1C); S-meter calibration tables (X108G, X6100) and the default SWR table; the G90 rule that rejects non-BCD SWR replies; tolerance for the non-standard PTT acknowledgement. Rewritten in JavaScript with an injected transport, TX gating (`allowTx`, PTT off never gated, release after a failed key-up) and deterministic tests built from the frames in `testg90swr.c`. |
| Hamlib | `rotators/gs232a/gs232a.c`, `rotators/gs232a/gs232b.c` (Copyright (c) 2001-2012 Stephane Fillod) | `station-devices.cjs`, `remote-station/bricoham_station_agent/station_devices.py` | LGPL-2.1-or-later (SPDX `LGPL-2.1-or-later`) | Re-implemented the GS-232A/B frames (`Waaa eee<CR>`, `C2<CR>`, `S<CR>`), reply formats (`+0aaa+0eee`, `AZ=aaa EL=eee`) and baud ranges in JavaScript and Python with strict reply validation, explicit baud, elevation limits from the agent config, lease/deadman/stop handled by the existing rotor layer. Speed and continuous-move commands were not taken. |
| Hamlib | `rotators/spid/spid.c`, `rotators/spid/spid.txt` (Copyright (c) Norvald H. Ryeng, LA6YKA; Hamlib authors) | `station-devices.cjs`, `remote-station/bricoham_station_agent/station_devices.py` | LGPL-2.1-or-later (SPDX `LGPL-2.1-or-later`) | Re-implemented the 13-byte Rot2Prog set/status/stop frames and the 12-byte reply decoding (`-360`, `PH`/`PV` resolution) in JavaScript and Python; resolution is read before every move and validated against 1/2/4 pulses per degree; no Rot1Prog or MD-01 support. |
| k3ng_rotator_controller | `README.md`, `rotator_features.h` | documentation only | GPL-3.0 | Used to confirm that GS-232A and GS-232B emulation differ; the emulation source is not in the reference copy, so no frames or code were taken. |
| remoteRotator | (reference only) | none | see its `LICENSE` | No code adapted. |
| Hamlib | `amplifiers/elecraft/kpa.c`, `kpa1500.c`, `kpa.h` | `station-amplifier-drivers.cjs`, `remote-station/bricoham_station_agent/amplifier_drivers.py` (KPA driver) | LGPL-2.1-or-later, (c) 2019 Michael Black W9MDB | Re-implemented as a standalone driver over an injectable transport: `;` wake-up, `^OS`/`^ON`/`^OP`/`^SW`/`^SF`/`^PWF`/`^FR` commands, fault table; STANDBY is read back, `^ON0` is never sent, parse of the reply prefixes corrected where `kpa.c` reuses the wrong one. |
| Hamlib | `amplifiers/expert/expert.c` | same files (Expert driver) | LGPL-2.1-or-later, (c) 2023 Michael Black W9MDB, (c) 2026 Mikael Nousiainen OH3BHX | Frame builder (`55 55 55 CNT DATA CHK`), 67-byte status parser with 16-bit checksum; OPERATE toggle (`0x0D`) is sent at most once and only after a status read. |
| Hamlib | `amplifiers/gemini/gemini.c`, `dx1200.c`, `gemini.h` | same files (Gemini driver) | LGPL-2.1-or-later, Hamlib authors | `S` status parser, `R`/`R0`/`R1` operate; `TRIP` treated as a fault; no band follow because the Hamlib band table is not coherent. |
| macexpert-spe | `SPEProtocol.swift` | same files (Expert driver) | MIT, (c) 2026 Manoj Ramawarrier VU2CPL | Status CSV field order and example frame used as test data; no code copied. |
| SPE-1.3-2K-FA-Remote-server | `server.py`, `README.md` | same files (Expert driver) | GPL-3.0, OH2GEK | Request frames `55 55 55 01 90 90` and `55 55 55 01 0D 0D` and the status request flow, re-written in the project style with safety checks. |
| ACOM-Controller | `MainWindow.xaml.cs`, `README.md` | same files (ACOM driver) | MIT, (c) 2019 Bjorn Ekelund | Telemetry enable/disable, operate/standby frames, 72-byte telemetry offsets, per-model temperature offsets and error codes; every error code counts as a fault. |
| ATU-100-EXT-YAF-2E0UMK | whole repo reviewed | nothing | MIT, DG4SN / 2E0UMK | Reviewed: only a debug bit-banged UART TX, no host command set, so no driver. Catalog entry `atu-100-ext` stays `pendiente de fuente`. |

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

Notes:

- The reference tree is Hamlib 5.0-dev while the catalogue pins `hamlibVersion` 4.7.2. The extracted caps are reference facts; the `dump_caps` of the installed `rigctld` still decides at runtime.
- Declared but unreached meters (COMP, ID, VD, TEMP over Hamlib) are listed per radio in `data/remote-meter-model.json` (`backend.unreached`) and are not upgraded.
- Re-run `node scripts/hamlib-caps-extract.cjs`, `node scripts/remote-caps-apply.cjs` and `node scripts/remote-parity-docs.cjs` after updating the references.
