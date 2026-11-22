# Review of karina-v3-k1 and integration into BricoHams (UV-5K V3)

## Recorded upstream review

| Field | Value |
|---|---|
| Repository | https://github.com/autumn1rain/karina-v3-k1 |
| Revision (HEAD) | `0f5dbcba599b3598e6d415352ef9fd234d2d2a79` (last push 2026-11-04) |
| License | Apache-2.0 |
| Releases | `v2026.11.02` (karina-v3/k1 `.bin` and `.packed.bin`, `calibration.bin`; “fix button lock fn1 fn2 by keyboard lock F”) and `v2026.10.30` |
| Declared base | fagci uv-k5 mod v1.2.1 |
| Contents | Only the README (5 languages), PDF manual, LICENSE and documentation site. **There is no firmware source code.** |

## Method and licenses

Upstream does not publish sources, so no binary is copied or decompiled.
The ported features are an independent reimplementation (clean-room) based on the
behavior described in the public manual, on top of the F4HWN base already pinned in BricoHams.
The new code is GPL-3.0-or-later (BricoHams); the Apache-2.0 notices of the base are preserved.
autumn1rain/karina-v3-k1 (Apache-2.0) is credited as the origin of the functional ideas.
The firmwares remain marked `derivedFromKarina:false`.

## Inventory

| Karina feature | Status in BricoHams | Reason |
|---|---|---|
| Scan lists, CTCSS/DCS scan | Exists | F4HWN `SCAN_SUBAUDIBLE`, scan lists |
| Roger, scrambler, AFC, AM fix, LNA, rx_filt, STE | Exists | Present in the base |
| Keyboard lock and side FN1/FN2 (fix v2026.11.02) | Exists | `set_lck` / `SET_LCK_ACTIONS` |
| Spectrum with presets, blacklist, RX capture | Exists | Spectrum module |
| **Built-in band presets** | **Ported** (spectrum, key 2) | 11 RX windows within 136–174 / 400–470 MHz |
| **Loot (capture list)** | **Ported** (spectrum, keys 1/7 in capture) | 32 entries, no age; RX only |
| Auto-beacons F+1/2/3, DCS→dBm table, PTT-Holder, randomizer | Incompatible | TX: conflicts with the RF limits; ARDF/Satellite/Spectrum disable the beacon |
| Tx3k, DEV, 03t, c0db, SCR registers, F_Corr/PWR | Incompatible | They write calibration or RF registers |
| Configuration presets 0/1/2, Sql2, FN1/FN2 map | Incompatible | They change the memory/prior configuration layout |
| CB, 10 m, 7 m, 6 m, Air, Sat 240, Riv 300, LoRa, GSM, 23 cm presets | Incompatible | Outside the module's RX guard |
| 25/100 kHz steps in spectrum | Incompatible | The module supports 1.25/2.5/6.25/12.5 kHz and 128 bins |
| Turbo, ECO, Mult, hybrid squelch, dynamic volume, modem, AM tone | Not ported | No flash/RAM margin (spectrum: 1364 B free) or undocumented algorithm |
| Karina K1/V1 builds, own bootloader | Out of scope | Different hardware/bootloader |

The band windows use 128 bins at 12.5 kHz (6.25 kHz in PMR), not Karina's 80–160 steps at
25 kHz.

## Tests

Software (executed): `bands_loot_test`, `spectrum_adapter_test` (11-band cycle, RF limits,
loot with dedupe, scroll and blacklist), `presets_test`, `spectrum_test` with `-Wall -Wextra -Wconversion -Werror`;
`node --test tests/bricohams-build.test.cjs` (15/15); ARM GCC 13.3.1 build of the spectrum variant.

Spectrum build: image 119,468 B (slot 120,832 B, 1,364 B free), RAM 13,600 B (2,784 B free).
Calibration, RF limits and vectors unchanged; no new persistent writes.

Pending on hardware (UV-5K V3): boot, LCD/keys, actual band and loot behavior.
The fusion, labs, ardf and satellite variants do not include these sources and have not been rebuilt.

## Reproducible Spectrum build (2026-11-04)

Two independent builds with `--preset FieldOps --module spectrum --option ENABLE_FEAT_F4HWN_BEACON=OFF` (ARM GCC 13.3.1, F4HWN base v6.1.0 `f556a96`, unpublished local Fusion61 sources) produced an identical `bricohams.fieldops.spectrum.v6.1.0.bin`:
120,284 B (slot 120,832 B, 548 B free), SHA-256 `CF5E8C52B9599D4CF68D1F003991D758A92B2FFD6BB4E30DFC090333261A8145`. The `.elf` and `build-info.json` also match.
11/11 firmware host tests passed. **The binary is not in the signed catalog**: there is no physical test on a UV-5K V3 and no CI signature. Published on 2026-11-05 only as an unsigned pre-release (`fw-spectrum-presets-v6.1.0`).

Steps pending on a real radio (no blind flashing): 1) full backup of the radio with the Web Install F4HWN flow and verification of its CRC; 2) load the image only with a bootloader/Multiboot that supports the slot and with a recovery cable; 3) check boot, LCD/keys, key 2 (11 bands, RX only) and keys 1/7 in capture (Loot); 4) restore the backup and confirm F4HWN identification and automatic backup with a noisy UART frame.
