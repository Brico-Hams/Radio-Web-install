# Radio and firmware help library

Revision: 25-10-2026. Original Bricohams help; it does not replace official
manuals or certify combinations that have not been tested on hardware.

## Documents and recommended reading order

| Guide | What it covers |
| --- | --- |
| [Common configuration and procedures](AYUDA-CONFIGURACION.md) | Frequencies, FM/DMR, tones, backups, repeaters, satellites, USB, and checking results |
| [Quansheng F4HWN](AYUDA-QUANSHENG.md) | Setup from 0 to 100%, V1/V2/V3 hardware, v4/v5/v6 versions, editions, menus, slots, CFG, apps, and recovery |
| [UV-K5 V3 technical atlas](ATLAS-UV-K5-V3.md) | How it works internally: PY32F071 pinout, memories, serial protocol, bootloader, SWD, build, mods, schematics, and photos |
| [All F4HWN build options](AYUDA-OPCIONES-F4HWN.md) | Meaning of every catalog option, dependencies, and cautions |
| [F4HWN preset values](F4HWN-PRESETS.md) | ON/OFF matrices for 18 published versions v4.3.0-v6.3.0, all presets, and local v6.1.0 profiles |
| [ARDF](AYUDA-ARDF.md) | Manual gain, cycles, synchronization, distance, and hardware differences |
| [Original Egzumer](AYUDA-EGZUMER.md) | V1 sources, Apache-2.0 license, and every option in the inspected Makefile |
| [Dim0s pack and Karina V3/K1](AYUDA-PACK-DIM0S.md) | Variant inventory, new PY32 evidence, hashes, and multiboot/license limits |
| [OpenGD77: configuration and use](AYUDA-OPENGD77.md) | FM/DMR, codeplug, channels, TG, TS, filters, GPS, APRS, and satellites |
| [OpenGD77: radios and revisions](AYUDA-OPENGD77-MODELOS.md) | Models, aliases, revisions, variants, and the difference between catalog and identification |
| [Karina](KARINA.md) | Inventory, documented features, source-code search (closed), reimplementation specification, and sources |
| [Baofeng DM-32UV](DM32UV-FIRMWARE.md) | HR_C7000/FD6818 hardware, OpenGD77 status and license, installation, building RadioFoundry, and bootloader protocol |
| [Examples](EJEMPLOS.md) | Open F4HWN v6.3.0 and moto firmware with license, example PMR446 channels, and analysis scripts |
| [Satellite basics](INICIACION-SATELITE.md) | Original Spanish guide for getting started with FM satellites and the BH Satélite image |
| [Satellite antennas](ANTENAS-SATELITE.md) | Dual-band Yagi and V dipole simulated with custom MoM, plans, and STL parts |
| [Third-party binaries](BINARIOS-TERCEROS.md) | SHA-256 and origin of Karina, official/patched DM-32UV firmware, OpenGD77 DM32, and K1/K5 V3 factory images, without redistribution |
| [Community repositories](ENLACES-COMUNIDAD.md) | Verified Quansheng and DM-32UV repository catalog, recovered dead links, and searches on other forges |
| [Bricohams V3](BRICOHAMS-FIRMWARE.md) | Reproducible local builds of Fusion and Labs and delivered artifacts |
| [AnyTone](AYUDA-ANYTONE.md) | Local JSON/CSV preparer; not RDT CPS or a USB programmer |
| [Android](ANDROID.md) | Experimental logbook, FM channels, CAT, and audio; permissions and revision-specific tests |
| [V3 and Android validation](VALIDACION-INTEGRAL-V3-ANDROID.md) | Evidence, corrected failures, data isolation, outstanding tests, and mod limits |

On web pages, use browser search (Ctrl+F). Markdown documents remain in the
repository for offline reference. Web help is also included in the local
server, Pages, and installers.

## What “supported” means

There are four different concepts:

1. **Supported by the firmware project:** upstream maintains an image.
2. **Recognized by the connector:** this website knows an identification
   structure.
3. **Published in the catalog:** a filename from an authorized source is
   recognized. This does not mean this website can install it.
4. **Tested on a radio:** requires physical evidence for the exact model and
   build. Automated tests for this website are not that certification.

A row in a table does not authorize use of firmware from another revision.
“Download” does not mean “flash”; “verified file” does not mean “digitally
signed.”

## Version coverage

| Family | Specific coverage in this library | Limit |
| --- | --- | --- |
| F4HWN Quansheng PY32 | 18 recognized published versions; 84 interface options and 94 distinct keys in the commit-based preset history | v6 features are not attributed to older versions |
| ARDF Quansheng | Recognized releases from the V3/UV-K1 repository; local ARDF v0.5 guide and evolution warnings | Writes to slots are not enabled without verified compatibility |
| Bricohams on F4HWN | Fusion, Labs, ARDF, Satellite, and Spectrum v6.1.0, with documented options and hashes | Prior reads and slot CRCs do not certify boot or every feature |
| Independent Bricohams platform | Experimental resident, Diagnostics, and Blocks in BHA1, portable storage and transfer | No validated physical boot or USB/Flash integration; BHA1 is not FAP1 and cannot be installed with the existing web loader |
| Karina | Local V1 package and Dim0s V3/K1 package from 21-09-2026 inspected | PY32 binaries exist; source and Armel multiboot compatibility have not been demonstrated |
| OpenGD77 | Documented families and models; versions identified by date/build and distribution variants | No universal menu table applies to all historical builds |
| Quansheng stock, UVMOD, OneOfEleven | Identification and references to prevent confusion | Not protocols or compilers built into this website |

“All versions” is documented as a matrix of families, differences, and sources
by version; it is not a promise that every menu exists starting with the first
firmware. For a specific build, note model, revision, date, filename, commit if
available, and hash. Check its manual and release notes. Anything unconfirmed
is marked as such rather than inventing values, shortcuts, or maps.

## Safety and legal-use rule

- Identify the actual hardware, not just the casing.
- Preserve the original calibration and codeplug before migrating.
- Do not erase, restore, or reset in response to a port error without first
  understanding the cause.
- On OpenGD77, this website keeps writing blocked because it cannot obtain a
  verified complete MCU firmware backup.
- On Quansheng, mutations require a full backup; Main is protected.
- Data imported for listening starts RX-only.
- Do not enable automatic TX or transmit outside authorized frequencies. A
  firmware PMR/GMRS/FRS/MURS profile does not certify a radio.

## Licenses: separate components

The user's statement “the license is MIT” is recorded as pending association
with the original component, rights holder, and license text. This does not
change third-party or existing repository licenses:

- The website declares GPL-3.0-or-later in its manifest and LICENSE file.
- Inspected F4HWN sources include Apache-2.0 and NOTICE.
- CHIRP drivers in the Karina package contain GPL notices.
- The exact Karina firmware license does not appear in the inspected package.
  The user's MIT statement provides no sources and does not establish which
  files/versions it applies to. The corresponding notice will be included when
  there is a verifiable reference.
- OpenGD77 and its components are governed by their own notices; do not assume MIT.

Complete manuals, Karina firmware, another party's calibrations, and third-
party software are not redistributed simply because they are cited.

## Updating this library

Value tables are generated from pinned catalogs, not memory:

```powershell
npm run build:help
```

When a catalog changes, review the meaning of new options, versions, and
dependencies, regenerate the pages, and run the help tests. The radio is not
queried and its configuration is not changed when opening a guide.

The historical snapshot is in `f4hwn-history-presets.json`: it stores the
commit, SHA-256, and CMakePresets.json content for each version. Updating it
must be explicit, using `node scripts/fetch-help-presets.cjs` from the
repository root; it makes public queries to GitHub, does not access radios or
upload local files. The normal help generator works offline and does not
 download sources.