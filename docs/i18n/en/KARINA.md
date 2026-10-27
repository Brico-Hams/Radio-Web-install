# Karina: technical case file and limits of a Bricohams derivative

Inspection date: 2026-10-25.

## 1. Status and scope

**New evidence from 2026-10-25:** the Dim0s link supplied afterward contains
another Karina package for **V3 and UV-K1**, with PY32 vectors. This case file
describes the **local V1 package**, not all existing Karina variants.
The [Karina V3 and Dim0s pack report](AYUDA-PACK-DIM0S.md) documents the download,
inventory, and hashes. Compatibility with Armel slots has not been demonstrated,
and no sources/MIT notice were found in that ZIP.

This document describes evidence from the local **Karina-2026.08.21 K5V1
(Fw+Cal+Instr+K5prog+Rolling)** package and compares it with the open references listed
as references. It is not recovered source code, a complete translation of its manuals,
or firmware certification. No Bricohams Karina binary has been created,
the bootloader has not been modified, no radio has been flashed, and V1 multiboot has not been tested.
An independent **Bricohams V3 edition based on F4HWN** has been built,
described in [BRICOHAMS-FIRMWARE.md](BRICOHAMS-FIRMWARE.md); it does not include Karina code
and is not intended to be its port.

**Blocker for deriving Karina:** the package contains no C or assembler sources,
linker, Makefile, or firmware license. Having a `.bin` does not provide its
build project or allow assigning it another project's license.
The three Python files are CHIRP drivers, not processor firmware.

The MIT license attribution for the firmware remains an unverified claim;
the component, rights holder, and text or verifiable
source have not been identified. No such notice was found in the inspected package,
and the licenses of the drivers or F4HWN are not changed by it. Even if
MIT is confirmed for Karina, its source project is still required for a rebuild.

Without open source, reconstruction remains an independent implementation
based on documented behavior. Availability of Karina source is no longer
maintained as a prerequisite for writing new functions. It is still impossible to promise
a Karina rebuild or 100% equivalence without implementation and testing. The first custom
ARDF core, its contract, and pending integration points are described in
[Bricohams](BRICOHAMS-FIRMWARE.md#nuevo-nucleo-independiente-ardf).
Three independent images are now built for V3 slots: ARDF with cycles,
Satellites with manual RX Doppler, and Spectrum with 128 points, averaging, peak hold,
and eight RAM session presets, plus its own receive-only VFO-PRO capture.
Capture supports step tuning, numeric RX entry, audio, and adjustments
to the documented R13 RX fields while preserving other bits. It supports
centering windows and cycling through RAM presets, with a temporary blacklist of 16 exact
frequencies and optional FM CTCSS/DCS search through the upstream detector,
pending RF validation. It does not edit calibration,
save tones, or transmit.
Satellites does not implement TLE/SGP4 or autonomous tracking. During the
initial inspection none had been flashed. On 2026-10-26 CRCs of the Bricohams
slots in external Flash were subsequently verified, as recorded in the [Quansheng guide](AYUDA-QUANSHENG.md).
This does not validate ARDF/Satellite/Spectrum startup, Karina equivalence, or RF.
Splitting by function does not mean all Karina modules have been recreated.
Spectrum presets can now be exported/imported over USB/UART in BHSP files,
with validation and reread; they do not persist internally in EEPROM. The
Satellite image has experimental CAT RX and orbital tracking from the web,
not within the MCU. ARDF can export a summary of manual observations,
without GPS. Functions and behaviors remain to be reconstructed and verified.

Documenting observed functions and preparing a custom implementation
on an open base are possible. That implementation must not be announced as recompiled Karina
or claimed equivalent without verification.

**Source search (2026-10-26).** No public Karina source code was found
in the sources consulted; this does not prove it does not exist.
The Dim0s pack describes it as closed firmware with no repository, and no sources
were located in the reviewed Spanish- and Russian-language Telegram groups. Sources
were also not located in searches conducted on GitHub, Codeberg, GitLab, Gitee,
GitFlic, or GitVerse. According to the Russian group,
Karina continues [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, which permits closed derivatives) and shares spectrum code with
[PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5) (Apache-2.0, V1).
Those are the open bases for reimplementing its functions; `fagci/s0v4`,
`hawk5`, and `k1-fw` have no license and are not copied. The Karina binary
is not decompiled. V3 hardware and protocols are in the [technical atlas](ATLAS-UV-K5-V3.md).

## 2. Method and evidence sources

- Recursive inventory of the supplied folder, without running EXE files, drivers, or
  binaries.
- SHA-256 and inspection of the images' initial vectors.
- Text extraction from five PDFs, 102 pages total, using PDF.js in an isolated
  tools directory, outside the web dependencies.
- Review of the README files, Makefile, linker, and license for open references.
- Comparison of local images with the PY32 connector checks.

The PDFs produced font warnings during extraction. Diagrams,
stable/test version colors, and screenshots have not been visually verified
page by page. Therefore no stability is inferred from a missing color, and the inventory is not considered an exhaustive description of the
internal implementation. The summaries below are original and do not reproduce the complete manuals.

## 3. Package inventory

24 files: 13 `.bin`, 5 PDFs, 3 `.py`, 1 `.exe`, 1 `.ini`, 1 `.txt`.

### 3.1. Images and data

| File | Bytes | Cautious classification |
| --- | --- | --- |
| `v1_210826_2.bin` | 61412 | Karina V1 image with the latest package filename |
| `v1_210826_2.packed.bin` | 61430 | Update container, not an interchangeable RAW image |
| `30.07fw_2.bin` | 61280 | Older image; filename does not certify stability |
| `30.07fw_2.packed.bin` | 61298 | Packed variant of the older image |
| `16.10fw_7.bin` | 61040 | Historical image; year is not established by the filename |
| `Config-29.01.26.bin` | 7424 | Configuration; not firmware |
| `28.11.25calib_mic.bin` | 512 | Data labeled as microphone calibration |
| `29.01.26calib_sql.bin` | 512 | Data labeled as SQL calibration |
| `30.07calib_mic.bin` | 512 | Data labeled as microphone calibration |
| `30.07calib_sql.bin` | 512 | Data labeled as SQL calibration |
| `Rolling back (BACKUP)/k5_v4.00.07_publish.bin` | 58726 | Recovery image from the package; origin unverified |
| `Rolling back (BACKUP)/Reborn-RUS.bin` | 61006 | Another firmware; do not assume it is Karina |
| `Rolling back (BACKUP)/my_calibration-FIRST-Power.bin` | 512 | Possible calibration specific to another unit |

The `calib` labels do not prove that a file is the original backup of
the user's radio. **Do not apply another unit's calibration or include it in a
public repository.** The K5prog EXE has also not been run or certified.

### 3.2. Verified fingerprints

| File | SHA-256 |
| --- | --- |
| `v1_210826_2.bin` | `c7612a86325d10d768efc9fc7330bede203226879aae0a7d6f026418d55166f9` |
| `v1_210826_2.packed.bin` | `7690da5a740fb24c9a36e711f0410c27b7e99e9ab450d0ef0cdc161b21c11c52` |
| `30.07fw_2.bin` | `9e97e28325468a70aebe19a288cd44878e16ad705f05485c92d2bf9dc50f05b7` |
| `30.07fw_2.packed.bin` | `e53b74b9e755175b72acec8e470e90db0c7c08ac53f1023e10e7e3faeee2d08f` |
| `16.10fw_7.bin` | `af51612d4d20b2637c6da2c72d62493f537621685c1ab604165f0e05fc1fe1ee` |

These fingerprints were calculated locally; they are not hashes checked against
a signed publication from the author.

### 3.3. Manuals

| Local document | Pages | Use in this case file |
| --- | ---: | --- |
| `00-UV-K5V1-КРАТКО установка и настройка.pdf` | 2 | Installation and configuration introduction |
| `01-UV-K5V1-ПОДРОБНО-Прошивка, Восстановление, CHIRP.pdf` | 17 | Installation, recovery, and CHIRP reference |
| `02-UV-K5V1_Инструкция Karina_21.08.26.pdf` | 29 | Main functional reference from August 2026 |
| `03-UV-K5V1_История версий Karina.pdf` | 16 | Change history, not a substitute for source code |
| `UV-K5(8)_FW_Karina_mod_15.06.2025-R8.pdf` | 38 | Older manual, not automatically equivalent to the 2026 manual |
## 4. Hardware and memory: do not confuse V1 and V3

The main manual's cover identifies UV-K5, UV-K5+, UV-K5(8), and UV-K6 **V1**.
The radio previously described by the user was a **UV-K5 V3**.

| Family | Relevant base | Consequence |
| --- | --- | --- |
| UV-K5 V1 | DP32G030 ecosystem / OneOfEleven reference | Different image and map; this website does not support V3 slots |
| UV-K5 V3 / UV-K1 | F4HWN PY32F071 in `Multiboot/Fusion61` | Existing connector for slots 1-4 and protected Main |

`v1_210826_2.bin` reads `SP=0x20003FF0` and `Reset=0x0000010B`.
The RAW files `16.10fw_7.bin` and `30.07fw_2.bin` show the same vectors.
The V3 connector expects a Thumb reset within the application starting at
`0x08002800`. Karina V1 **does not pass** that check.

The inspected OneOfEleven linker declares 60 KiB of FLASH and 16 KiB of RAM.
The 61412-byte Karina image leaves only 28 bytes compared with 60 KiB;
this is a size comparison against that reference, not an internal Karina map.
It does not demonstrate space for another firmware or a bootloader.
The 18 additional bytes in `.packed.bin` files are not usable free space.

The Karina manual cover warns that it does not support Si4732 and that expanded
M24M01/M24M02 memories are not used as expanded memory. There is no evidence
in the package of firmware slots compatible with F4HWN V3 Multiboot.

## 5. Functional documentation for Karina

The functions in this section come from the manual text, not from hardware tests
or inspection of implementation code.

### 5.1. Display and status (main manual, pages 3-4)

- VFO/channel display and last active receiver.
- Power-saving, keypad-lock, and function-mode indicators.
- Dual watch, CTCSS/DCS information, and membership in scan lists.
- Battery, signal meter, names, and frequency.
- AM/FM/SSB mode indication; the SSB label does not demonstrate receiver
  performance equivalent to a dedicated SSB radio.

### 5.2. Menus and persistence (pages 5-9)

- SQL, tuning step, power, offset, tones, and bandwidth.
- Busy-channel lock, memory save, and name style.
- Power saving, VOX, dual watch, and scan behavior.
- RX/TX audio settings and specific filtering functions.
- Hidden menus and advanced parameters: they must be documented against sources before
  being exposed in a Bricohams build.

The manual distinguishes VFO-, band-, and memory-specific parameters, and explains that some
channel changes persist only after an explicit save. A port must not
confuse temporary settings with persisted data.

### 5.3. Keypad, listening, and scanning (pages 10-16)

- Short, long, and function-key combinations.
- VFO/MR switching, copying settings, and frequency entry.
- Scanning and functions assignable to side keys.
- The manual warns of possible problems assigning `NONE` to FN1/FN2 with
  external tools; driver compatibility must be verified.

The manual also describes automatic TX and randomization functions. Their
presence in the documentation does not make them requirements for the new firmware.
They are not automated, and sequences for interfering with services are not provided here.
An initial derivative should preserve legal limits and keep automatic TX off.

### 5.4. Spectrum analyzer (pages 17-24)

- Spectrum display and activity visualization.
- Tuning, active-frequency selection, and relationship to memories.
- Free-entry ranges and presets.
- Multipreset and scan parameters.
- Detailed view called VFO-PRO.
- Gain parameters and receiver registers, including LNA/PGA.
- The manual states that certain parameters may be written to calibration
  when exiting the spectrum analyzer: do not treat them as harmless visual controls.

Algorithms, filters, timings, limits, and register mappings have not been verified
in Karina sources. It is not correct to implement assumed offsets based on
screenshots or text.

### 5.5. Troubleshooting and evolution (pages 25-29 and separate history)

The manual covers usage and configuration problems; the history lists changes to reception, squelch, power saving, scanning, subtones, and spectrum.
The 2026-08-21 entry mentions a reception lock fix associated
with a mode described as Roger 5 and references `29.01.26calib_sql.bin`.
This does not certify that the file is suitable for another unit.

The history spans versions from 2023-2026. Its stable/test color coding
is not reliably preserved in text extraction.
It is not claimed that all binaries in the folder are stable.

## 6. CHIRP: what is present and what it does not prove

| Python file | Observation |
| --- | --- |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py` | Declared UV-K5/1 model, based on Egzumer/F4HWN/Karina |
| `Chirp dr Karina-by_M2Boo-K1-2.py` | Declared UV-K5V3/K1 model, despite being in the V1 package |
| `chirp_uvk5_fagci_osfw.py` | UV-K5/Fagci driver; does not demonstrate compatibility with the latest Karina image |

The driver headers indicate GPL v2 or later. That license
applies to those files; it does not establish a license for the attached closed firmware.
The drivers declare 38400 baud and `0x2000` bytes of data memory.
The two F4HWN/Karina derivatives declare data writes up to `0x1D00` and
calibration from `0x1E00`. These are driver declarations, not proof that
all three work with every revision.

These Python files were not imported or run. A CHIRP module executes code on
the PC; it must be reviewed and selected for the exact model, firmware, and version.
The presence of a V3 driver does not turn the V1 binary into V3 firmware.

## 7. Modular builds, patches, and multiboot

| Concept | What it does | What it does not demonstrate |
| --- | --- | --- |
| UVMOD | Combines selected binary patches on a supported image | Karina sources, C compilation, or multiboot |
| Make/CMake options | Include/exclude code and produce an image | Multiple resident firmwares at the same time |
| RAM overlays | Share runtime memory between sections | Complete firmware slots selectable at startup |
| F4HWN V3 Multiboot | Stores images in external Flash and manages them through its protocol | Compatibility with V1 or an arbitrary image |

OneOfEleven has Apache-2.0 sources and `ENABLE_*` options in its Makefile.
These include reception, spectrum/panadapter, interface, scanning, and communication functions. Dependencies exist: for example, the Makefile adjusts UART options and LTO/overlay coexistence. It is not enough to enable everything.
A OneOfEleven base would be a OneOfEleven/DualTachyon derivative, not Karina.
## 8. Local Multiboot library integrated into the website

In Quansheng, select **Local library** and choose the
`Documents/Multiboot` folder. The browser reads only the selected `.bin` files:
no API is configured to read arbitrary paths on the computer, and the files are not uploaded
to GitHub.

The local inspection found 9 files that pass the current checks:

| Edition | Versions | Local origin |
| --- | --- | --- |
| Fusion | 6.0.0 and 6.1.0 | `Fusion61/archive` |
| FieldOps | 6.0.0 and 6.1.0 | `Fusion61/archive` |
| Labs | 6.0.0 and 6.1.0 | `Fusion61/archive` |
| Transfer | 6.0.0 and 6.1.0 | `Fusion61/archive` |
| Locally built Fusion | 6.1.0 string | `Fusion61/build/Fusion/f4hwn.fusion.bin` |

In the browser test selecting the complete Multiboot folder, 71 images were
examined: 9 accepted and 62 blocked. A separate test of `Fusion61/archive`
examined 44: 8 accepted and 36 blocked. These results correspond
to the inspected local contents and will change when files are added.

Each entry shows its status or reason for being blocked. Length,
PY32 vectors, F4HWN v6.x identification, and excluded variant names are checked.
SHA-256 is calculated locally. A version string and correct vectors
**do not certify authenticity, correspondence with source, or physical
compatibility**. The local build is not presented as signed by Armel.

ARDFv05 contains sources, but no completed ARDF image was found in its
inspected firmware directories; `archive` contains earlier Fusion images
and stock images. No supposed ARDF image inferred from a folder name is offered.
ARDF catalog releases remain download only.

Preparing an image does not write anything. Installation still requires a
compatible connection, verified full backup, slot 1-4, confirmation, and final CRC.
Main remains protected. Karina V1 is also blocked when given a false
F4HWN name because its vectors do not meet the PY32 format.

## 9. Contract required for a reproducible Bricohams version

This is pending work, not functionality Karina already has:

1. Obtain Karina's exact sources, license, dependencies, and tools,
   or approve an alternative open base and record its differences.
2. Select hardware separately. V1 and V3 require different projects/profiles and binaries.
   For the user's existing slots, the applicable base is PY32,
   not the package's V1 binary.
3. Reproduce the build unchanged before modifying it; record commit,
   toolchain, options, map, and hashes. Do not invent an upstream SHA.
4. Create minimal profiles with dependencies and FLASH/RAM budgets.
   Reject unknown options and combinations that do not fit.
5. Preserve upstream identity/license and add Bricohams branding without artificially
   altering a string to pass slot validation.
6. Deliver `.bin`, map, size report, `build-info.json`, and `SHA256SUMS`
   covering both firmware and metadata. Do not confuse a hash with a signature.
7. For V3, test startup, CFG switching, own calibration, backup,
   recovery, and slots against F4HWN. For V1, first demonstrate
   physical storage support and a bootloader recovery strategy.
8. Publish only after bench testing; document RF limits and do not automatically enable
   transmissions outside permitted bands.

The website already has an options form for the
`Brico-Hams/bricohams-firmware` workflow; it is not a Karina compiler. This task
did not run that workflow. An independent local builder has been added
for F4HWN v6.1.0 and used to generate Bricohams Fusion and Labs editions. The rest of
this section remains a requirement for deriving Karina, not a claim that Karina
functions have been reimplemented in those binaries.

## 10. Recovery and operational limitations

The rollback `readme.txt` describes operations that erase data. They are not
automated and should not be applied because of a USB failure. Before any
migration, original unit backups, hardware identification,
and a tested recovery procedure are required.

The website maintains write barriers. The original package files
and the Multiboot folder have not been touched. PDFs,
EXE files, calibration files, or Karina firmware are not redistributed.

## 11. External sources consulted

- [UVMOD: tool](https://whosmatt.github.io/uvmod/index.html).
- [UVMOD: README](https://github.com/whosmatt/uvmod).
- [OneOfEleven: project](https://github.com/OneOfEleven/uv-k5-firmware-custom).
- [OneOfEleven: Makefile](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/Makefile).
- [OneOfEleven: linker](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/firmware.ld).
- [OneOfEleven: Apache-2.0 license](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/LICENSE).
- [F4HWN V3/UV-K1](https://github.com/armel/uv-k1-k5v3-firmware-custom).

External references were consulted on their published branch during the
inspection; no commit has been pinned for a new derivative. Their functions or
licenses are not attributed to the Karina binary without evidence.

## 12. Community research (2026-10-26)

Targeted searches in the Telegram groups “QuanSheng UV-K5 en español” and
“Quansheng uv-k5, uv-k5 (8), kr5plus,” on GitHub, Codeberg, GitLab, Gitee, GitVerse,
and GitFlic (signed in), and in the Dim0s pack. No authors or personal data.

### Source code

| Evidence | Source |
| --- | --- |
| “There is no repository link; the firmware is closed”; builds at `t.me/quansheng_V3_K1` | `Karina/информация.txt` from the [Dim0s pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) |
| “Karina has no GitHub; versions are published on her Russian forum” | Spanish-language group |
| Karina is “the direct continuation of fagci b5,” and Punktracker shares its spectrum code | Russian-language group |
| “Karina mod Fagci based” topic (created 2024-02-22) and developer channel “k5fw” | Russian-language group |
| No Karina sources or Quansheng projects were found in the GitFlic and GitVerse searches | Searches on 2026-10-26; not proof of nonexistence |

Conclusion: **no public Karina sources were located in this review**.
The identified open reference base is
[fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod) (Apache-2.0, which
permits closed derivatives) and [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1, with AFC Doppler). `fagci/s0v4`, `hawk5`, and `k1-fw` have no license:
they may be read, not copied. Decompiling the Karina binary to reconstruct its source
would be a derivative work; European law allows decompilation only for interoperability.

### V3/K1 versions in the Dim0s pack

`21.09.2026` (current) and older versions `23.03.2026`, `11.04.2026`, `10.05.2026`, `22.05.2026`,
`14.06.2026`, `28.06.2026`, `27.07.26`, `29.07.26`, `01.08.26`, `06.08.26`, `11.08.26`,
`15.08.26` (test), `21.08.2026`, and `testfsk7`. `.packed` files are for the official flasher only;
the others are for open flashers.

### Functional specification for a clean reimplementation

Original summary of `информация.txt` and the pack's change log, without copying code:

| Function | Described behavior |
| --- | --- |
| Multiband spectrum | Multiple bands at once (air, marine, LPD, PMR, custom). “Delay” (2400 by default, 1100 recommended) and “Turbo”; faster as squelch rises above the noise |
| Accelerations | Permanent since 21.09.26 (previously linked to Roger 5); AM with xtal 3 in Roger 5 |
| Dynamic volume | Long press on 9 (shows “D”) |
| Beacons and auto-response | F + long press on 1/2/3; beacon with long FN2, duration based on TxTime |
| AM tone generator | Included |
| Long-range capture | SQL=3, SAVE=1:3, Roger=3, and long press on 1 (higher power consumption) |
| Three state presets | Calibration, channels, and settings; select with 0/1/2 at startup |
| Reception | Auto-capture with noise filter, longer CTCSS/DCS measurements, slow squelch closure in AM, adjustable LNA |
| Flashing | Over factory firmware; after flashing, PTT+EXIT at startup to erase, load the original calibration, then Karina's |
| CHIRP | Channels tab only: changing “Parameters” breaks the beacon and may lock the radio |
| Known bugs | First memory unnamed in spectrum, incorrect frequencies in multiband EXP mode, reversed arrows in K1 menu |

Recommended path: start from F4HWN V3 (Apache-2.0), port the spectrum from fagci-mod and
PUNKTRACKER, implement these functions as original code, and publish it openly. The V3 hardware
and protocols are in the [technical atlas](ATLAS-UV-K5-V3.md), and the repository catalog is in
[community links](ENLACES-COMUNIDAD.md).