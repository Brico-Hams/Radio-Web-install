# Inside the modified Icom firmware (IC-705 / IC-9700)

Technical knowledge base about Dawid SQ6EMM's modified firmware: what is modified, where and how. It synthesizes two MIT repositories vendored unchanged: `third_party/icom-custom-firmware/` (commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`) and `third_party/icom-byof/` (commit `a91231f64e8afbe34353994786e8276a3b54f1a9`). Every fact cites its source file. The per-address detail of each patch is in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md) and the user guide is [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 1. Scope and sources

| Source | Content |
|---|---|
| `third_party/icom-byof/IC705_DAT_FORMAT.md` | The `.dat` container format |
| `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | IC-705 flash map |
| `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | IC-9700 flash map and A/B slots |
| `third_party/icom-byof/FREQUENCY_RANGES.md` | Band plans per region |
| `third_party/icom-byof/UNDOCUMENTED_CIV.md` | Undocumented CI-V commands |
| `third_party/icom-custom-firmware/releases.json` | List of releases and features |
| `third_party/icom-custom-firmware/docs/patches/` | JSON patches consumed by the patcher |

No Icom byte is distributed: the patches only contain the project's own bytes plus references to copy bytes from the official firmware supplied by the user.

## 2. The `.dat` container

### 2.1 Header and per-radio parameters

According to `third_party/icom-byof/IC705_DAT_FORMAT.md`, the file starts with the magic `44 00 77 55`. On the IC-705 the header is 0x64 bytes (fields f38, f44, f4c, f54 and f5c), holds four MD5 digests and ends with a 2-byte footer (`40 75`). The transform parameters depend on the model, according to `third_party/icom-byof/README.md`:

| Radio | KEY | START |
|---|---|---|
| IC-705 | `0x19` | `0x64` |
| IC-9700 | `0x2b` | `0x38` |
| IC-905 | `0x7f` | `0x88` |

The IC-905 is signed with RSA-2048 and SHA-256, so it cannot be repacked; it is only documented.

### 2.2 Autokey transform

According to `third_party/icom-byof/icom_rza1_decode.py`, the cipher is a byte-wise autokey: `plain = stored ^ ((prev_plain + abs_offset - KEY) & 255)`. The counter starts at `0x4b` in each domain and the plaintext padding is `FF`. The key is recovered without knowing it:

- `deriveKey` looks for a 16-byte monotonic run with step -1 between offsets `0x20` and `0x8000` and obtains `KEY = (run[0] + s) & 255`.
- `findStart` sweeps s from `0x10` to `0xFFF` with windows of `0x1000` or `0x10000`, reverses the autokey backwards anchored on `FF` and looks for the ARM vectors `18f09fe5 18f09fe5`.

The JavaScript version is in `third_party/icom-custom-firmware/docs/js/codec.js`.

### 2.3 LZSS compression

According to `third_party/icom-byof/IC705_DAT_FORMAT.md` and `third_party/icom-byof/ic_rza1_repack.py`, Okumura LZSS is used:

| Parameter | Value |
|---|---|
| Window (ring) | 4096 bytes |
| Initial cursor | `0xFEE` |
| Flags | LSB first, 1 = literal, 0 = 2-byte match |
| Index | `lo` plus the high 4 bits of `hi` shifted by 4 positions (`(hi & 0xF0) << 4`) |
| Length | `(hi & 15) + 3`, that is 3 to 18 |
| End of stream | explicit output length, no end marker |

Decompression supports overlap (a copy may read bytes just written). The compressor uses hash chains with a 3-byte key (newest first), `max_chain=256`, the first longest match wins and one-step lazy matching is applied. This set of rules makes the JS port bit-identical to the Python one. The output is roughly 2% smaller than Icom's. Even so, the IC-9700 slot can grow by up to about 1.3 MiB because of the added code and the realignment of the graphics pack.

### 2.4 MD5 seal

`findMd5Region` computes the MD5 incrementally in steps of `0x1000` until the running digest equals the next 16 bytes. According to `third_party/icom-byof/README.md` the sealed region is `0x9c0000` bytes on the IC-705 and `0x800000` on the IC-9700. After repacking the seal must be recomputed.

### 2.5 Bootstrap and main image

According to `third_party/icom-byof/IC705_DAT_FORMAT.md`:

| Element | Detail |
|---|---|
| Bootstrap | DAT `0x64` to `0x10064`, mapped to flash `0x18000000`, 0x10000 bytes |
| Loader | bootstrap `+0x4000`, length `0x9bc`, copied to RAM `0x20004000`; entry `0x20004840`; LZSS routine at `0x200044dc` |
| Main header | DAT `0x10064`: `csz` and `osz` (two LE32 on the IC-9700) |
| Main stream | starts at `0x1006c`, decompressed to RAM `0x20005000`, entry `0x20005060`, ARMv7-A |
| Aux1 | decompressed to RAM `0x20000008` (Thumb) |
| Aux2 | decompressed to flash `0x08000000` (Cortex-M) |

On the IC-9700 a graphics pack is chained at slot + `csz` + 8 and moves with the main stream; `repack` realigns it to 4 bytes and pads with `FF`. The patches use two MD5s per radio: the whole file (`md5`) and the decompressed main image (`main_md5`), plus a bootstrap MD5 of their own.

`repack(..., new_bootstrap)` (in `third_party/icom-byof/ic_rza1_repack.py`) requires exactly `0x10000` bytes, the tag at `0x4f00` to `0x4f10` equal to the original and ARM vectors at the start. Otherwise Icom's updater takes its legacy path and rewrites slot A.

### 2.6 Round trip: decode, patch, repack

1. Decode: undo the autokey, locate the main stream and decompress it.
2. Patch: apply the JSON operations to the main image (and optionally the bootstrap).
3. Repack: compress with the LZSS described above, encrypt again and recompute the MD5s.

The result must be byte-identical to the one tested on a radio: the patcher only offers the download if the output MD5 equals `output.md5`; otherwise it writes nothing (according to `third_party/icom-custom-firmware/docs/js/patch.js`). That is why the compressor must reproduce the algorithm exactly, and why only unmodified official firmware is accepted as input.

## 3. Platform and memory map

The CPU is a Renesas RZ/A1H (R7S721001, IC101) with the flash memory-mapped by XIP at `0x18000000` (according to `third_party/icom-byof/IC705_FLASH_LAYOUT.md`).

### 3.1 IC-705

ISSI IS25LP128 flash of 16 MiB, RDID `9D 60 18`, 4 KiB sectors. The first `0x600000` bytes of flash match the decoded body; the DSP, WLAN and resources lie beyond. The stock main image size is `0x376000` (`output_size`); the patches produce `0x386000`.

### 3.2 IC-9700

S25FL127S flash of 16 MiB, RDID `01 20 18`, 64 KiB sectors, IC181 (according to `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`):

| Region | Offset | Notes |
|---|---|---|
| Bootstrap | `0x0` | 0x10000 bytes |
| Slot A | `0x10000` | 0x7f0000 bytes |
| Slot B | `0x800000` | 0x7f0000 bytes |
| Marker | `0xff0000` | 16 bytes `SX3913 V0.10-000` means boot slot B |

Inside each slot there are offsets +`0x3e0000`, +`0x3e4000`, +`0x3f0000` to `0x793000` and +`0x7e0000` / +`0x7ec000`. Stock E1.50 values: `csz` `0x2145F4`, `osz` `0x405334`, `csz2` `0x80C2C`, `osz2` `0x2675BC`. The stock loader has no automatic fallback: the SD updater writes the inactive slot and then sets the marker.

### 3.3 Areas that must never be overwritten

The two GT24C1024 EEPROMs (IC191 and IC192) hold settings and calibration. They are not firmware and must **never** be overwritten. The bootstrap tag at `0x4f00` to `0x4f10` must not be touched either. The CI-V service commands (section 6) can erase or misalign that data.

## 4. Patch mechanism

According to `third_party/icom-custom-firmware/docs/patches/`, each patch is a JSON with `name`, `description`, `load_address`, `image_size`, `input`, `output`, `ops` and optionally `bootstrap`. `hex` operations write the project's own bytes and `copy_from` operations copy `len` bytes from the official firmware to another position (relocation). Addresses are absolute: the main image is loaded at `0x20005000` and bootstrap operations are offsets from its start.

Observed pattern (exact figures in [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md)): a vector or literal patch near `0x20005024`, many small 3 or 4 byte BL or B branches that divert existing routines, and own code appended at the end of the image (on the IC-9700 the image grows from `0x2040A334` to `0x2040FE10`). In the bootstrap the patched loader extends beyond the original one (which ends at `+0x49bc`) up to the preserved tag.

## 5. Features of the custom firmware

The features are listed in `third_party/icom-custom-firmware/releases.json`. The sources do not publish the source code of the custom firmware, only the patch bytes; where the how is not stated, it is not invented.

| Feature | What it does |
|---|---|
| TRV1 to TRV8 | Eight transverters with RF and IF frequencies, kept after power-off |
| RF display | Shows the real frequency up to 122 GHz |
| Extended CI-V | 6-byte frequency above 1.4 GHz on the IC-9700 |
| IC-9700 MAIN, SUB, DUAL, SAT | Transmit settings follow the receiver that transmits |
| Scope scale | dB/div 10, 6, 3 and 1 with automatic noise floor |
| Power limit | Maximum per transverter: 100, 50, 25, 10 or 5 %; never raises the radio's power |
| TX delay | Up to 300 ms per transverter |
| PTT inhibit | Per transverter |
| IC-705 TX ranges | Extended according to `third_party/icom-byof/FREQUENCY_RANGES.md` (section 7) |
| SD apps | Included in the releases that state it in `releases.json` |
| A/B bootloader | Slot selector (section 5.1) |

### 5.1 A/B bootloader

According to `third_party/icom-custom-firmware/docs/index.html` and its `README.md`, the firmware keeps two slots (A and B), as Icom's updater already alternates between them. The custom bootloader detects a structurally damaged slot and falls back to the other one automatically. Key combinations to switch slot:

| Radio | Combination |
|---|---|
| IC-9700 | Hold POWER while connecting the DC supply, about 5 s |
| IC-705 | Hold POWER at power-on until the LED blinks, about 3 s |

The bootloader exists in a single copy and the SD updater writes it once, when the update starts. **If power is lost at that moment a flash programmer may be needed to recover** (for example CH341A). Use a reliable power supply.

## 6. Undocumented CI-V commands

According to `third_party/icom-byof/UNDOCUMENTED_CIV.md`. Default addresses: IC-705 `0xA4`, IC-9700 `0xA2`, IC-905 `0xAC`; controller `0xE0`. Reads are safe; writes and actions can erase settings or misalign the radio.

| Command | Effect | Protection |
|---|---|---|
| `1A D0` | Factory reset, clears all settings | No password |
| `1A E1` | Second reset variant | One data byte must be 0 |
| `1A E0` | Enters the factory alignment mode | Model password |
| `1A D2` | DV self-test | Model password |
| `1A D7` | Adjust a secondary subsystem | Model password |
| `1A D5` | Reads the region code | Read |
| `1A D6` | Reads a calibration measurement | Read |
| `1A D8` | Reads a status byte, IC-705 only | Read |
| `1A D9` and `1A DA` | Reads microwave calibration, IC-905 only | Read |
| `1A E4` | Reads a minor service value | Read |
| `1A D1` and `1A D3` | Test-mode flag and diagnostic, IC-705 | Internal permission |
| `1A E2`, `1A E3`, `1A E5` | Service sub-mode, target and data write | Write |
| `1A E7` | Audio or DSP option, IC-705 and IC-905 | Write |

Alignment passwords (`E0`): `SX-4075 Adjust` (IC-705), `SX-3913 Adjust` (IC-9700), `SX-4209 Adjust` (IC-905). Sub-commands present per radio: IC-705 D0 to D3, D5 to D8 and E0 to E7; IC-9700 D0, D2, D5 to D7 and E0 to E7; IC-905 D0, D2, D5 to D7, D9, DA, E0 to E7 and E9.

Others: IC-705 `0x24` and `0x28`; IC-9700 `0x28 00` (band recall), `0x1C 02`, `0x1C 03` and `0x0D`; IC-905 uses a 6-byte BCD frequency from 1.389 GHz.

## 7. Frequency tables

According to `third_party/icom-byof/FREQUENCY_RANGES.md`. The factory destination (diode matrix, cached in the configuration) selects a band plan that limits transmission. Which bands you may use depends on your licence and regulations.

### 7.1 IC-705 (5 plans, RX 0.030 to 470 MHz)

| Plan | 160 m | 80 m | 40 m | 6 m | 4 m | 2 m | 70 cm |
|---|---|---|---|---|---|---|---|
| 0 | 1.800-2.000 | 3.500-4.000 | 7.000-7.300 | 50.0-54.0 | no | 144-146 | 430-440 |
| 1 | 1.800-2.000 | 3.500-4.000 | 7.000-7.300 | 50.0-54.0 | no | 144-148 | 430-450 |
| 2 | 1.810-2.000 | 3.500-3.800 | 7.000-7.200 | 50.0-52.0 | 70.000-70.500 | 144-146 | 430-440 |
| 3 | 1.810-1.850 | 3.500-3.800 | 7.000-7.200 | 50.0-52.0 | 70.150-70.250 | 144-146 | 430-440 |
| 4 | 1.800-1.825 | 3.500-3.540 | 7.000-7.100 | 50.0-54.0 | no | 144-147 | 430-440 |

The IC-705 contains a complete factory calibration set for 70 MHz: the 4 m band is region-locked, not absent from the hardware (plans 2 and 3).

### 7.2 IC-9700 (9 plans, strictly tri-band)

| Plan | 2 m | 70 cm | 23 cm |
|---|---|---|---|
| 0 | 144-146 | 430-440 | 1260-1300 |
| 1 and 7 | 144-148 | 430-450 | 1240-1300 |
| 2 and 4 | 144-146 | 430-440 | 1240-1300 |
| 3 | 144-146 | 430-434 and 435-438 | 1240-1245 and 1270-1298 |
| 5 | 144-146 | 430-432 | 1260-1265 |
| 6 | 144-146 | 430-440 | 1260-1300 |
| 8 | 144-147 | 430-440 | 1260-1270 |

There are no hidden bands on the IC-9700: the variants only change the band edges. Mechanism: region code, plan-map table, plan index and a per-plan limits table that enables transmission.

## 8. Reverse-engineering toolchain

| Tool | Function |
|---|---|
| `icom_rza1_decode.py` | RZ/A1 family decoder |
| `ic_rza1_repack.py` | Container repacker |
| `ic705_decode.py` | Full IC-705 decode with ELF output |
| `ic705.py` | Decompose, rebuild and verify (uses numpy) |
| `ic705_codec.py` | Independent LZSS diagnostics with many options |
| `extract_streams.py` | Container parser |
| `ghidra_scripts/ExportRecovered.java` | Exports decompiled C after importing the ELF into Ghidra |
| `test_ic705_codec.py`, `test_ic705_decode_real.py`, `test_repack.py` | Tests |

The exact command lines are in `third_party/icom-byof/README.md`. In `third_party/icom-custom-firmware/` the patcher `icom_patch.py` reproduces a release offline: give it the official `.dat` and the JSON from `docs/patches/` and it checks the output MD5.

To add a release: add the entry to `releases.json`, generate the patch and run `tools/build_index.py`, which writes `docs/patches/index.json` and copies the active patches. There is also an experimental patch in `third_party/icom-byof/patches/9700E150_trv16c.json`.

## 9. How Bricohams uses it

The `icom.html` page hosts the web patcher, served by the web and by the desktop server (`server.cjs`). The browser reads your official `.dat`, applies the patch and offers the result only if the MD5 matches. Safety rules: use only your own official firmware, check TX delay and power on a dummy load before connecting a transverter, use a reliable power supply during the update and assume that use is at your own risk and may void the warranty. See [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 10. Licence and attribution

Both repositories are MIT, by Dawid SQ6EMM. Repositories: `https://github.com/sq6emm/icom-custom-firmware` and `https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware`; forum: `https://mikrofale.cafe/showthread.php?tid=1296`. They are vendored unchanged under `third_party/` and credited in the ACKNOWLEDGEMENTS files.

## 11. Improvement proposals

Ideas based on the documentation; they are proposals and are not implemented:

- Check `main_md5` in the browser before applying the patch, to give a clearer error.
- Detect the active IC-9700 slot by reading the marker `0xff0000` from a flash dump.
- Add to the patch report an automatic comparison of regions against the flash map when the document allows it.
- Document the IC-705 4 m calibration range as a reference, without enabling transmission.
