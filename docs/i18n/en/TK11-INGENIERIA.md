# TK-11: interoperability engineering and path toward custom firmware

Knowledge base on the Quansheng TK-11. Every fact carries its source; anything not confirmed is marked **UNVERIFIED**. This project does not flash firmware on the TK-11 and this document does not change that.

## Scope and rules

- Only public sources and this repository's implementation are used. No binary has been decompiled and no TK-11 Manager code has been copied.
- The CHIRP-to-TK11-csv code is GPL-3.0 and is ported with attribution in `ACKNOWLEDGEMENTS.md`. The CHIRP driver is GPL-2.0-or-later.
- For TK-11 Manager, only the behavior published in its presentation is described. Its license is not known.
- Nothing written here has been tested on a real radio except what `tk11-connector.js` already does.

## Sources

| Id | Source | Content |
|---|---|---|
| [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) | URZ article on TK-11 Manager | Features and safety measures of the tool |
| [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) | CHIRP-to-TK11-csv (GPL-3.0) | TK-11 CSV import format |
| [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) | CHIRP tk11.py driver | CPS protocol and memory map |
| [F4](https://github.com/armel/tk11-teardown) | Teardown by armel (Apache-2.0) | MCU, memory, and lack of documentation |
| F5 | `tk11-connector.js` and `tk11-ui.js` in this repository | Independent implementation based on F3 |
| [F6](https://github.com/spm81/Multi-UVTools) | Multi-UVTools by spm81 (no LICENSE) | Claims about TK-11 offsets; data only, no code reused; single source, **UNVERIFIED**; it is based on CHIRP's TK11 module, so it is not independent of F3 for shared offsets |
| [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf) | MVSilicon AP8048B datasheet | Pins, SWD, code encryption in SPI Flash, update via SD/USB |
| [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) | MVSilicon AP8048C datasheet | Same as F7 for variant C |
| [F9](https://github.com/rob-w/tk11-firmware-custom) | rob-w/tk11-firmware-custom (fork of F4) | Described as an open reimplementation of the firmware, but it only contains a README, LICENSE, PDF, and JPG; no code or binaries; last push 2025-04-29 |
| [F10](https://github.com/qshosfw/hermes) | README of qshosfw/hermes (GPL-3.0) | Secondary source that calls the TK-11 a radio with a Beken BK4819 |
| [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) | Teardown photo, view A back of PCB V2.0 | Visual observation by the author of this document |

## Hardware

| Item | Data | Source |
|---|---|---|
| MCU | MVSilicon AP8048, based on Arm Cortex-M3 | [F4](https://github.com/armel/tk11-teardown) |
| Internal Flash | 2 MB | [F4](https://github.com/armel/tk11-teardown) |
| Internal SRAM | 128 KB | [F4](https://github.com/armel/tk11-teardown) |
| External EEPROM or SPI Flash | None identified on the PCB | [F4](https://github.com/armel/tk11-teardown) |
| Persistent data | Bootloader, firmware, calibration, settings, and 999 channels would be in the internal Flash; this is a deduction by the teardown author, **UNVERIFIED** | [F4](https://github.com/armel/tk11-teardown) |
| Datasheet | There is no complete public datasheet; details are only given under NDA | [F4](https://github.com/armel/tk11-teardown) |
| SDK and tools | There is no public SDK or toolchain for the AP8048 according to F4. GitHub searches (2026-11-09) for `AP8048` and `tk11 firmware`: 0 repositories; no firmware source, update file, update protocol, or bootloader key combination was found on github.com, urez.org, or spm81.github.io. An MVSilicon SDK exists for a sibling chip, leadercxn/bp1048_sdk_v0.1.12 (not reviewed; license unknown). F9 provides no code | [F4](https://github.com/armel/tk11-teardown), [F9](https://github.com/rob-w/tk11-firmware-custom) |
| MCU variant | There are datasheets for AP8048A, B, and C in F4. Which one the TK-11 uses is **UNVERIFIED**: the marking in the photo is not legible | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| SWD port | The B and C datasheets (LQFP48 7x7 mm) list "Serial wire debug (SWD) interface": GPIO_C[13] = SWCLK, GPIO_C[14] = SWDIO, on pins 2 (SWCLK) and 3 (SWDIO) in B and C. DVSS ground: pin 38 (B), pin 39 (C); IOVDD 3.3 V: pin 40 (B). Contradiction: the F4 README says the chip has no external programming or debug interface. Whether SWD is active or locked on the TK-11 is **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf), [F4](https://github.com/armel/tk11-teardown) |
| Reset | Neither of the two pin tables lists an NRST pin; POWER_KEY pin: 17 in B and C | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| SPI Flash interface and code encryption | Pins GPIO_A[13..18] = FSH_HOLD, FSH_SCK, FSH_SI, FSH_WP, FSH_SO, FSH_CS = pins 21 to 26 in both variants. The feature list includes "Code encryption mechanism in SPI-flash". That the "2 MB internal Flash" is an SPI Flash in the package that uses those pins is a **deduction** from the datasheets, **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Update channel according to the datasheet | "Firmware updatable through SD/USB drive" (B and C); the AP8048A one speaks of booting from SPI Flash and updating via SD or USB disk. It is not known whether the TK-11 uses it: **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Core and memory according to the datasheet | Cortex-M3 at 96 MHz and 128 KB of SRAM | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| RF chip | F4 includes datasheets for the BK4819 and BK4829 (Beken). Photo observation: two QFN chips with a Beken logo in shielded areas, consistent with BK4819/BK4829; the exact part numbers are **UNVERIFIED**. F10 calls the TK-11 a Beken BK4819 radio (secondary source) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg), [F10](https://github.com/qshosfw/hermes) |
| FM receiver | F4 includes the RDA5807M datasheet; the photo shows an SOP chip marked "5807M" (observation) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Unpopulated SOP-8 footprint | Photo observation: an empty SOP-8 footprint next to the MCU; its function is **UNVERIFIED** (usually an optional SPI Flash or EEPROM) | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Test pads | Photo observation: no labeled SWD pads are visible at that resolution | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| CPS link | Serial at 38400 baud with DTR active | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Display and audio | Not identified in this document: **UNVERIFIED** | F5 |

## CPS protocol

### Frame

Each message carries a header, payload, CRC, and trailer. The payload and the CRC are masked with a 16-byte cyclic XOR, and the CRC is computed over the plaintext payload ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

```text
AB CD LL LL [carga util][CRC16-XMODEM LE]  DC BA
LL LL = longitud de la carga util (u16 LE)
clave XOR = 16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80
```

The 32-bit "magic" value is generated randomly by the official CPS; with a fixed value (5) the radio responds the same way, but it must be the same throughout the session ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

### Command table

| Id | Name | Payload | Source |
|---|---|---|---|
| `0x01F4` | Connection request | Type u16, length 4, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01F5` | Connection response | Firmware string in bytes 4 to 19; the parsing is from F5, **UNVERIFIED** against the official CPS | F5 |
| `0x01FB` | Memory read | Type u16, length 12, address u32 (`0x080000` plus the offset), size u16, 2 zero bytes, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FC` | Read response | 12 header bytes and the data; maximum `0x200` per block | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FD` | Memory write | The same 16-byte header and the data; maximum `0x200` per block | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FE` | Write response | 16-byte frame in total; success is checked by the code | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x05DD` | Reset | Only type and length; the driver defines it and its actual use in the official CPS is **UNVERIFIED** | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Others | Any update, calibration, or bootloader command | Undocumented: **UNVERIFIED** | F5 |

The driver's memory limit is `0x23000` (140 KiB) starting from the base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)). It is not known whether `0x080000` is a real Flash address or a logical CPS address: **UNVERIFIED**.

## Memory map

Offsets are relative to the base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Offset | Size | Content | Source |
|---|---|---|---|
| `0x00000` | 999 × 64 B (`0xF9C0`) | Channels | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x0F9C0` to `0x10FFF` | `0x1640` | Undocumented; may contain calibration, **UNVERIFIED** | F5 |
| `0x11000` | 1011 B | Per-channel usage flag (`0xFF` is empty); the last 12 are not identified | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x12000` | `0x48` | FM radio: VFO, channel id, memory flag, and 32 frequencies | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x13000` | `0xF8` | General settings | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x14000` | `0x70` | General settings 2: erase and wake-up codes, device name | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x15000` | `0x10` | Current selection: 8 u16 values for A, B, frequency, channel, and NOAA | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x16000` | 32 × `0x80` | Scan lists; they end exactly at `0x17000` | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x17000` | 4 B | 6-digit power-on password, u32 little endian, according to Multi-UVTools; **UNVERIFIED**, gap in CHIRP | [F6](https://github.com/spm81/Multi-UVTools) |
| `0x1A000` | 16 × 24 B | DTMF contacts: 16 B name and 8 B code | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x1A800` | 16 × 24 B | 5-tone contacts: same as DTMF | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22000` | 16 × 40 B | NOAA SAME decoding addresses: 8 B address and 32 B text | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22280` | 128 B | NOAA SAME event control | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x23000` | End | CPS memory limit | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Rest | Gaps between structures | Undocumented; always preserved | F5 |
| `0x0D6008` | 1024 B | 128x64 monochrome boot logo according to Multi-UVTools (relative to the base `0x080000`, like the rest); outside the CPS `0x23000` window; **UNVERIFIED** | [F6](https://github.com/spm81/Multi-UVTools) |

### Calibration: resolving the overlap

Multi-UVTools ([F6](https://github.com/spm81/Multi-UVTools), single source, **UNVERIFIED**) claims that the TK-11 calibration occupies `0x010000`-`0x021000` (68 KB) and that its EEPROM cleaner preserves `0x010000`-`0x015010` and `0x020000`-`0x021000`. Its code says it is based on CHIRP's TK11 module, so it is not independent of F3 for shared offsets. The range `0x11000`-`0x1A980` collides with CHIRP structures (usage, FM, settings, lists, contacts), so it cannot all be calibration. The parts that fall in CHIRP gaps are `0x10000`-`0x10FFF` and `0x20000`-`0x20FFF`: candidates, **UNVERIFIED**. `tk11-connector.js` never writes any of these areas (the `UNVERIFIED_REGIONS` list is only used to name them when comparing backups) nor the logo.

The main VFO (A-F01 to A-F11 and B-F01 to B-F11 in CHIRP's menus) has no structure of its own in the driver: where VFO frequencies are stored is **UNVERIFIED**. The only documented VFO is the FM radio's. "Zones" do not appear in any source: the closest thing is the 32 scan lists, each with a 16 B name, two u16 priorities, and 48 u16 channels ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)); whether the TK-11 has zones like DMR is **UNVERIFIED**.

### Channel record (64 bytes)

Frequencies are stored in units of 10 Hz and CTCSS tones in tenths of a hertz; DCS codes are stored as the octal number read as decimal ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Byte | Field | Notes |
|---|---|---|
| 0 | `rx_freq` | u32 |
| 4 | `freq_diff` | u32, offset |
| 8 | `tx_non_standard_1` | Undocumented |
| 9 | `tx_non_standard_2` | Undocumented |
| 10 | `rx_qt_type` | 0 none, 1 CTCSS, 2 normal DCS, 3 inverted DCS |
| 11 | `tx_qt_type` | Same as the previous one |
| 12 | `freq_dir` | 0 simplex, 1 plus, 2 minus |
| 13 | `band` | The low nibble set to 1 is narrowband (according to F5) |
| 14 | `step` | Step |
| 15 | `encrypt` | 0 to 10 |
| 16 | `power` | 0 low, 1 medium, 2 high |
| 17 | `busy` | Busy channel lockout |
| 18 | `reverse` | Frequency reversal |
| 19 | `dtmf_decode_flag` | Signaling decode |
| 20 | `ptt_id` | 0 to 3 |
| 21 | `mode` | 0 FM, 1 AM, 2 LSB, 3 USB, 4 CW |
| 22 | `scan_list` | `0xFF` none |
| 23 | `sq` | 0 to 8 |
| 24 | `name` | 16 ASCII bytes |
| 40 | `rx_qt` | u32 |
| 44 | `tx_qt` | u32 |
| 48 | `unknown` | 8 undocumented bytes |
| 56 | `tx_qt2` | Undocumented u32 |
| 60 | `signal` | 0 DTMF, 1 5 tones |
| 61 | `unknown_2` | 3 undocumented bytes |

### General settings (`0x13000`)

| Bytes | Fields | Source |
|---|---|---|
| 0 to 16 | A/B channel, NOAA squelch, TOT, NOAA scan, keypad lock, VOX, microphone, frequency mode, display, AGC, power saving, dual watch, backlight, call channel (u16), beep | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 17 to 27 | Four side-key actions, scan mode, auto lock, boot screen, alarm, end-of-TX tone, repeater tail, tail tone | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 28 to 40 | Noise reduction, transposition, A and B volumes, key tone, language, NOAA SAME, signal bar | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 41 to 55 | Brightness, erase code, DTMF side tone, DTMF response, tone search, CW tone (u16) | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 56 to 127 | DTMF block: separator, group, timings, 8 B identifier, and up and down codes | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 128 to 215 | 5-tone block: same as DTMF plus protocol and 15 user frequencies | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 216 to 247 | Two 16-character lines of the welcome text | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |

## TK-11 CSV format

The CSV that TK-11 Manager imports and that nikantgr's converter generates has a fixed header. That TK-11 Manager imports it as is is **UNVERIFIED** on my part: [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) only says it exports and imports CSV, and [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) describes it as the format of Quansheng's software.

```text
No.,Name,RX Freq[MHZ],TX Freq[MHZ],QT Encode Type,QT Encode1,QT Decode Type,QT Decode,MSW,Band,Powrer,Busy Lock,ScanList,Demode,Freq Reverse,SQ,Encrypt,Signaling Decode,PTTID,Signal
1,PMR01,446.00625,0.15300,Null,Null,Null,Null,2K,12.5K,Low,OFF,1,FM,OFF,3,OFF,OFF,OFF,DTMF
2,,,,,,,,,,,,,,,,,,,
```

### Columns

The header spells "Powrer" with that typo and it is kept as is. The default values are the ones the converter sets.

| Column | Observed values | Notes | Source |
|---|---|---|---|
| `No.` | 1, 2, 3, … | Sequential from 1; gaps are empty rows | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Name` | Text | Maximum 12 characters according to the author ("i think"), **UNVERIFIED**; the memory allows 16 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `RX Freq[MHZ]` | 446.00625 | MHz with 5 decimals | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `TX Freq[MHZ]` | 145.07500 | Absolute frequency; `0.15300` means no TX | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode Type` | Null, Ctcss, NDCS, IDCS | NDCS is normal DCS and IDCS is inverted | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode1` | Null, 77.0, 023 | CTCSS tone or DCS code | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode Type` | Null, Ctcss, NDCS, IDCS | Same as encoding | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode` | Null, 77.0, 023 | Same as encoding | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `MSW` | 2K | Meaning **UNVERIFIED**; CHIRP lists 2K to 5K | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Band` | 12.5K, 25K | Bandwidth: narrow or wide | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Powrer` | Low, Middle, High | Power | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Busy Lock` | ON, OFF | Busy channel lockout | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `ScanList` | 1 | The converter always writes 1; the numbering 1 to 32 and the no-list value are **UNVERIFIED** | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Demode` | FM, AM, LSB, USB, CW | Modulation | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Freq Reverse` | ON, OFF | Frequency reversal | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `SQ` | 3 | Squelch from 0 to 8 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Encrypt` | OFF | Encryption; the converter only writes OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signaling Decode` | OFF | The converter only writes OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `PTTID` | OFF | Other values **UNVERIFIED**; CHIRP's are used | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signal` | DTMF, 5TONE | Signaling type | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |

### Conversion from CHIRP

The converter ([F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py)) does the following and is ported to `tk11-connector.js`:

- Renumbers from 1 between the lowest and the highest memory, and leaves empty rows in the gaps.
- Computes the TX frequency from the duplex: minus and plus subtract and add the offset, split takes the offset as TX, off writes `0.15300`, and the rest copy the RX.
- Converts Tone into encode CTCSS, TSQL into CTCSS on both sides, DTCS and DTCS-R according to polarity (N normal, R inverted), and Cross according to the cross mode.
- NFM gives a 12.5K band and any other mode 25K; demodulation only supports FM, AM, LSB, USB, and CW.
- Publishes variants with quotes, with a decimal comma, and with the regional-settings separator. Here the first two are ported and the third is not.
- Changes in this repository: power is taken from CHIRP (Low and High; the rest is Middle).

The public functions of `R.TK11` are `channelsToTk11Csv`, `channelsFromCsv` (detects TK-11 or CHIRP by the header), and `chirpCsvToTk11Csv`. Import only fills the table on the page; the radio does not change until the write-channels button is pressed, which first requires a verified backup. Invalid rows are skipped with their reason.

## What TK-11 Manager exposes

All of the following comes from [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/); the tool has not been run or analyzed.

| Capability | Published detail | Comparison with CHIRP |
|---|---|---|
| Execution | In the browser, with no Internet and no data sent | Same protocol; CHIRP is desktop |
| Protocol | Based on CHIRP's TK11 driver, according to the article | Same memory map |
| Channels | Full management of all 999 | Same |
| Settings | General, keys, and quick functions | Same |
| Scan lists | Yes | Same; zones are not mentioned |
| DTMF and 5 tones | Contacts and signals | Same |
| FM radio | Yes | Same |
| Backups | Automatic on every read; restore | Not automatic in CHIRP |
| Safety | Verifies the firmware before modifying, writes only changed blocks, and verifies byte by byte | Improvement in method, not in format |
| Advanced tools | Memory viewer | No viewer in CHIRP |
| Data | Exports and imports CSV and opens CHIRP images | Same for CSV |
| Firmware update | Not mentioned | No public tool offers it |
| Interface | Virtual walkie-talkie and seven themes plus a customizable one | No equivalent |

Conclusion: the article does not reveal any memory region, setting, or command that is not in the CHIRP driver. What "verifying the firmware" means and how it does it is **UNVERIFIED**.

## Path toward functional firmware

### Steps

All steps are **UNVERIFIED** until they are done with a test radio. None is implemented in this application.

1. **SWD access and read protection.** According to the AP8048B and AP8048C datasheets ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)), SWCLK is pin 2 and SWDIO is pin 3 of the LQFP48; ground on pin 38 (B) or 39 (C) and IOVDD of 3.3 V on pin 40 (B). There is no NRST pin. Connect a probe (ST-Link, J-Link, or CMSIS-DAP) with OpenOCD and read only the IDCODE and the AP list (see "Hardware procedure"). Never run an unlock or mass erase: on many MCUs that destroys the Flash.
2. **Full Flash dump.** If debugging is open, read the 2 MB with the probe, twice, and compare the SHA-256 hashes. Keep the dump as a private backup and do not redistribute it. Then search it for a known channel record to find out whether `0x080000` is a real address.
3. **Identify the bootloader.** Check the dump for the vector table, the size and address of the loader, and whether it verifies a signature or CRC.
4. **Capture the update protocol.** With the official updater and a USB analyzer (USBPcap with Wireshark, or a hardware analyzer), capture a full update of a test radio: how it enters loader mode, whether it reuses the AB CD frame, XOR, and CRC, and the file format (header, encryption, signature). Two versions must be compared. No captured write must ever be replayed to a radio.
5. **AP8048 toolchain and SDK.** An `arm-none-eabi-gcc` compiler for Cortex-M3 works for the core, but the peripherals (clock, GPIO, LCD, keypad, audio, RF) are only in the MVSilicon SDK or in documentation under NDA ([F4](https://github.com/armel/tk11-teardown)). If there is no SDK, the registers will have to be deduced from the board.
6. **Minimal blink and LCD test.** Load a small program into the 128 KB SRAM with the debugger and run it without writing to Flash, to turn on the backlight or the flashlight and then draw on the LCD. This way nothing permanent is touched.
7. **Porting.** Only once step 6 is solved: write the display, keypad, audio, and RF drivers, preserve the bootloader, and keep the same memory map and CPS protocol so that CHIRP and TK-11 Manager keep working. The F4HWN K5 firmware cannot be ported as is: it has a different MCU (Cortex-M0), a different memory map, and external EEPROM ([F4](https://github.com/armel/tk11-teardown)).

### Feasibility verdict

A complete custom firmware is not feasible today. There are three hard blockers: the AP8048 has no public SDK ([F4](https://github.com/armel/tk11-teardown)), there is no public update protocol, and it is not known whether SWD debugging is open. The manufacturer's datasheet lowers the SWD blocker from "unknown" to "documented by the manufacturer, status on the TK-11 unverified" ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)). A new blocker appears: the code encryption in SPI Flash that those datasheets mention. The realistic option is a boot goal (blink and LCD from SRAM) with an expendable radio, and only if step 1 goes well. A complete firmware with RF, audio, and menus would be a project of months with hardware reverse engineering, and even then with no guarantee that the chip allows it.

## Hardware procedure (test radio)

Everything is **UNVERIFIED** until it is done. Only with a test radio, never with the daily-use radio.

1. Identify the variant (A, B, or C) from the chip marking with a magnifying glass.
2. Locate by continuity pins 2 (SWCLK), 3 (SWDIO), ground, and 3.3 V from the LQFP48 (pin 1 dot) to test pads or vias. Prefer a via over soldering to the pin.
3. Prepare a CMSIS-DAP, ST-Link, or J-Link probe with the radio powered by its own battery, VTref at 3.3 V, and a speed of 100 kHz.
4. Read-only OpenOCD session, which reads only the DP IDCODE and the AP list:

```text
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -c "adapter speed 100" -c "swd newdap ap8048 cpu -enable" -c "dap create ap8048.dap -chain-position ap8048.cpu" -c "init" -c "dap info" -c "shutdown"
```

5. Since there is no NRST, connect with the radio running (no "connect under reset").
6. Only if the AP responds: create a cortex_m target, run `mdw 0x00000000 8` to see the vector table and do `dump_image` of the code region twice, comparing the SHA-256 hashes.
7. Search the dump for a known channel record to relate CPS offset 0 to a Flash address.
8. Forbidden: any erase, unlock, Flash write, option bytes, or mass erase command. The radio goes on a dummy load and never transmits.
9. USB capture, only if an official updater and its file appear: USBPcap and Wireshark on the CPS cable, compare two versions, and never replay captured writes.
10. Optional: logic analyzer on pins 21 to 26 (FSH) during boot to see whether Flash reads go through them; according to the datasheet the data is expected to be encrypted.

## What can be done without an expendable radio

- (a) Read-only backups with the CPS plus this panel's "Compare two backups" tool: changing a menu option on the radio, making a new backup, and comparing them helps map unknown fields and confirm or reject the Multi-UVTools offsets (for `0x17000`: set a power-on password, make the backup, and compare). It requires a TK-11, but never writes.
- (b) Read-only SWD probe of the IDCODE (requires opening the radio; affects the warranty).
- (c) Desk research on the datasheets.

Everything else needs an expendable radio.

### Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Flash erase when unlocking debugging | Bootloader, calibration, and channels are lost | Never unlock; dump first with debugging open |
| Calibration outside the CPS backup | Radio out of specification after a failure | The CPS does not expose it (the map reaches `0x23000`); the full dump is needed |
| Overwriting the bootloader | Radio unusable without a probe | Flash only the application region and keep the dump |
| Replayed update captures | An incompatible version bricks the radio | Do not replay captured writes |
| Copyright and NDA | Legal problems when publishing dumps or datasheets | Do not redistribute dumps or documents under NDA; check local law on reverse engineering |
| Radio regulatory compliance | A custom firmware may transmit out of band or without type approval | Respect band limits and local regulations |
| False sense of safety from testing | This repository's tests only cover the simulated CPS | Always test on a test radio |

## Changelog

### 2026-11-09

What was learned:

- The CHIRP driver is GPL-2.0-or-later, not GPL-3.0-or-later; last commit of the file 2026-03-19 ([F3](https://raw.githubusercontent.com/kk7ds/chirp/master/chirp/drivers/tk11.py)).
- CHIRP's scan lists end exactly at `0x17000` (32 × `0x80` from `0x16000`).
- Multi-UVTools has no LICENSE and its claims about the TK-11 are single-source and not independent of CHIRP ([F6](https://github.com/spm81/Multi-UVTools)).
- rob-w/tk11-firmware-custom contains no code or binaries ([F9](https://github.com/rob-w/tk11-firmware-custom)).
- armel/tk11-teardown includes datasheets for AP8048A/B/C, BK4819, BK4829, and RDA5807M ([F4](https://github.com/armel/tk11-teardown/tree/main/datasheet)).
- The AP8048B and AP8048C datasheets list SWD (pins 2 and 3), code encryption in SPI Flash, and update via SD/USB, and do not list NRST ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)).
- Photo observations: mVsilicon AP8048 LQFP48 MCU, two Beken QFNs, one "5807M" SOP, and an empty SOP-8 footprint ([F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg)).
- F10 calls the TK-11 a Beken BK4819 radio (secondary source) ([F10](https://github.com/qshosfw/hermes)).
- GitHub searches for `AP8048` and `tk11 firmware`: 0 repositories; no public firmware source, update file, or update protocol.
- urez.org only has the TK-11 Manager article and says nothing about firmware ([F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/)).

Code changes:

- CHIRP license corrected to GPL-2.0-or-later in `tk11-connector.js`.
- New `UNVERIFIED_REGIONS` list (never writable) and `describeOffset` and `diffImages` functions in `R.TK11`.
- "Compare two backups" button in the TK-11 panel: read-only, does not touch the radio.
