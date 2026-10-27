# Baofeng DM-32UV: open firmware, OpenGD77, and how to build it

Revision: 26-10-2026. Research into source code and how to build firmware
for the DM-32UV on GitHub, Codeberg, GitLab, GitFlic, the OpenGD77 website, and the
Telegram groups OpenGD77 EA, Baofeng DM-32UV EA, Baofeng DM-32UV RU, and OpenGD77 Rus.
Nothing in this guide has been tested on a Bricohams radio: each fact identifies its source.

## Summary

| Question | Answer |
| --- | --- |
| Is source code available for the OpenGD77 port to the DM-32 (OpenDM32)? | **No.** It is distributed only as a binary. The groups and OpenGD77 website confirm this |
| Can OpenGD77 be installed on the DM-32? | Yes, experimentally: official CPS (type “DM32/UV008”) or [grid.radio](https://grid.radio/opengd77/). The groups say there is no stable version |
| Is there open firmware that can be compiled? | **Yes: [RadioFoundry](https://github.com/RadioFoundry/RadioFoundry)** (MIT). FM and two-way DMR voice, CTCSS/DCS, APRS, GPS, and hotspot tested on the air |
| What is the current OpenGD77 license? | BSD-style with a commercial-use prohibition (not GPL) since 2019. Only the old [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) mirror is GPL-2.0 |
| AMBE codec? | Proprietary (DVSI). No open project distributes it: it is extracted from the user's own factory firmware |

## Hardware

| Block | Component |
| --- | --- |
| SoC | Hongruan HR_C7000 (Dahua DH4570): C-SKY CK803S core at 168 MHz, 288 KB SRAM, integrated DMR/FM modem, no internal flash |
| RF transceiver | FD6818 (no public datasheet; registers are broadly compatible with BK4819/AT1846S) |
| Program flash | GD25Q80 / 25Q16, 1 MB class, execute in place at `0x03000000` |
| Data flash | GD25Q128 or Puya PY25Q128HA, 16 MB: codeplug, calibration, contacts |
| Display | 240x320 color, ST7789-class controller on an 8-bit i8080 bus |
| Other | ALPU-MP (I2C authentication), RDA5807M (commercial FM), GPS ATGM336H, battery-backed RTC |
| Programming | 2-pin K1 jack with USB-serial cable at 115200 baud. USB-C is on the battery and only charges |

Program flash map:

| Range | Contents |
| --- | --- |
| `0x03000000-0x0300BFFF` | Baofeng bootloader (PTT+SK1 update mode). Never touch |
| `0x0300C000-0x030E7FFF` | Application (880 KB in RadioFoundry) |
| `0x030E8000-0x030FFFFF` | Codec slot (RadioFoundry) |

In data flash, below `0x700000` are the factory codeplug and **calibration** (the 4 KB page whose last byte is 2). Never write there.

Complete details, much of them measured on a radio: [RadioFoundry's hardware-dm32.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/spec/hardware-dm32.md),
with clock and PLL, peripherals, interrupts, pinout, FD6818 registers, audio paths,
calibration format, and protocols. HR_C7000 datasheets (documents 1 and 2), annotated board photo,
and charger schematic at [yo3hjv/Baofeng-DM32](https://github.com/yo3hjv/Baofeng-DM32)
(no license: linked only).

## Factory firmware families

| Firmware | Family | Note |
| --- | --- | --- |
| `DM32.01.*` | ROW, most common | Basis for OpenDM32 and RadioFoundry (`DM32.01.01.049`) |
| `DM32.NRF.*` / Fanti | Taiwan, same branch as `01.*` | |
| `DM32.00.*` / `UV32.*` | HR-Vocoder | RadioFoundry accepts its codec (`DM32.00.01.046HRVocoder`) |

Crossing families soft-bricks the radio: recover in update mode (PTT+SK1).
`BFUV32-V2` file: 256-byte header (`BFUV32-V2` ... `END`) followed by the raw image
linked at `0x0300C000`. It is not encrypted or signed.

## Step 0: backup

Before installing any firmware, back up **both** flash chips. They contain each radio's unique RX/TX calibration and ALPU key:

- `OpenUV008_Flasher_v1` by andynvkz ([infotex58, topic 1155](http://infotex58.ru/forum/index.php?topic=1155.0)): radio off, click Read, turn it on when prompted. Repeat for the program flash and the data flash.
- Alternative: the Python scripts at [rogerclarkmelbourne/DM32](https://github.com/rogerclarkmelbourne/DM32/tree/main/python).
- grid.radio also offers browser-based Backup/Restore for both chips.
- If a cable fails, try another USB-serial chip (CH340, FTDI, or CP2102). According to RadioFoundry, the HR_C7000 ROM responds only with FTDI.

## Install OpenGD77 (experimental)

1. Complete step 0 and save the files somewhere safe.
2. Install OpenGD77 CPS `E2026.05.26.01` or later ([experimental downloads](https://www.opengd77.com/downloads/PC_CPS/Experimental/)).
3. Under Radio Type, choose **DM32/UV008** and open Extras > Firmware loader.
4. With the radio off, hold **PTT + SK1** and turn it on. The green LED indicates update mode. Connect the cable.
5. Choose the firmware (reference: `OpenGD77_DM32_20260704.bin`) and wait for it to finish.
6. Write the default codeplug.
7. To return to factory firmware, repeat with Baofeng firmware from its CPS in update mode.

Alternative with no installation: [grid.radio](https://grid.radio/opengd77/) with Chrome or Edge
(Web Serial, no Zadig). Procedure source: [xreflector.es guide (PDF)](https://radio.xreflector.es/wp-content/uploads/2026/07/Install-OpenGD77-on-Baofeng-DM-32_EN.pdf).

According to the groups (August–October 2026): no stable version, low DMR audio, and various faults. It covers only the `01.*` family. Authors: andynvkz (UV008 port), Koshak and RA4FHE (DM-32), Roger VK3KYY (CPS).

## Build firmware: RadioFoundry

[RadioFoundry](https://github.com/RadioFoundry/RadioFoundry) is new, open DMR firmware
(MIT, created 24-10-2026), with a shared core and a per-radio layer. It is not derived from
OpenGD77 code. Releases are not published yet: you have to build it.

```text
git clone https://github.com/RadioFoundry/RadioFoundry
cd RadioFoundry
git submodule update --init
tools/build-csky-toolchain.sh            # GCC csky-elf en ~/toolchains/csky-elf (unos 45 min)
make BOARD=dm32                          # build/dm32/rfoundry_dm32.bin
tools/hrc7000_codec.py --stock DM32.01.01.049.bin   # tu firmware de fabrica: anade el codec en local
tools/serial_loader.py --model dm32 build/dm32/rfoundry_dm32_codec.bin --wrap build/dm32/rfoundry_dm32_codec_BFUV32.bin
```

| Step | Details |
| --- | --- |
| Toolchain | `tools/build-csky-toolchain.sh` or Docker image `tools/docker/csky-toolchain/run.sh make BOARD=dm32` |
| Codec | `tools/hrc7000_codec.py` checks factory firmware by SHA-256 and copies the codec on your machine. It is never uploaded to the repository or shared. Without the codec, only FM works |
| Flashing | `tools/serial_loader.py` speaks the Baofeng bootloader protocol (YMODEM at 115200). `--wrap` creates the `BFUV32-V2` file for the official updater. `--stock ARCHIVO` returns to factory firmware |
| Migrate the codeplug | Run `tools/dm32_migrate.py all --image ... --dry-run` first. It uses `dmrconf` from qdmr 0.15 |
| Safety | RadioFoundry does not touch the bootloader or data flash below `0x700000` |
| Status | Its own documentation says the flashing and migration tools have not been tested on a radio. Start with `--dry-run`, connect an antenna, and do not transmit until verified |

Boot checklist: [dm32-bringup.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/testing/dm32-bringup.md).

## Baofeng bootloader protocol

Enter by holding PTT + SK1 while powering on (green LED). Cable at 115200 8N1.

| Step | Host | Radio |
| --- | --- | --- |
| 1 | `52` | `06` |
| 2 | `4D 00 00 00 01` | `4D 01 09` |
| 3 | `06` | `BFUV32-V2` |
| 4 | `45 00 00 00 00` | `06` |
| 5 | `31` | `43` |
| 6 | `01` | `43` |
| 7 | `00 FF` + 128-byte block (name, NUL, size in ASCII) + CRC-16/XMODEM. Erases the application (up to 15 s) | `06 43` |
| 8 | For each KB: `02`, number n, `FF-n`, 1024 bytes, CRC | `06` |
| 9 | `04` | reboot |

The bootloader is separate and survives a failed write: if the image does not start,
remove the battery and re-enter update mode.

## Other resources found

| Resource | What it provides |
| --- | --- |
| [M7OCM/DM-32UV](https://github.com/M7OCM/DM-32UV) | Official CPS and firmware archive; Mods branch with patched factory firmware (no ALPU check, expanded bands, GPS NMEA fix) and its patching script |
| [Chicago-Offline/dm32-info](https://github.com/Chicago-Offline/dm32-info) | Specifications, firmware versions with SHA-256, and community map |
| [gzalo/dm32-uv](https://github.com/gzalo/dm32-uv) (MIT) | Reverse engineering of the bootloader and ROM |
| [infamy/DM32-Protocol-Spec](https://github.com/infamy/DM32-Protocol-Spec) | CPS programming protocol |
| [chaffed/CHiRP-DM32UV-Support](https://github.com/chaffed/CHiRP-DM32UV-Support), [fivelidz/dm32uv-linux](https://github.com/fivelidz/dm32uv-linux), [insideTheFlux/dm32uv-tools](https://github.com/insideTheFlux/dm32uv-tools) | Codeplug programming from CHIRP, Linux, and mapping tools |
| Open FD6818 drivers | [bf-k61-firmware-aura](https://github.com/sophiel-meow/bf-k61-firmware-aura) (GPL-3.0, Rust) |
| [jasiek/baocoder](https://github.com/jasiek/baocoder) | AMBE codec extracted from the DM-32: proprietary, **do not use** |
| [dongrat/HR_C70X0SDKlib](https://github.com/dongrat/HR_C70X0SDKlib) | Announced as an HR_C7000 SDK, but empty on 26-10-2026 |
| GitFlic, GitLab, Codeberg | Nothing about the DM-32 or HR_C7000 |

## Licenses and limits

- RadioFoundry is MIT; current OpenGD77 prohibits commercial use; OpenDM32 does not publish source code.
  No code from incompatible licenses is mixed, and third-party firmware is not redistributed.
- The AMBE codec is used only when extracted from the radio's own factory firmware.
- Calibration and the ALPU key belong to each radio: do not copy them from another unit.
- Transmit only on authorized bands, even if modified firmware allows it.

Bricohams also maintains a technical dossier and a C-SKY port skeleton in the private
`dm32uv-opengd77-port` repository. The recommended route today is to build RadioFoundry.