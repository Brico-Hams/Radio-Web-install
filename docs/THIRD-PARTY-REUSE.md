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
