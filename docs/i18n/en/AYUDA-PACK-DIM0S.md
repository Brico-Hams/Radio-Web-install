# Dim0s pack: inventory and Karina V3/UV-K1

Revision: 25-10-2026. Repository supplied by the user:
`Dim0s/quansheng-UV-K5v3-K1-firmware-pack`.
Inspected commit: `52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c`.

## What changed since the previous inspection

The local Karina package initially reviewed was **V1**. This repository
announces firmware for **K5 V3, K1, and devices with bootloader 7.x** and
contains another Karina package with separate K1/V3 binaries. Therefore:

- It is incorrect to claim that only Karina V1 exists.
- It remains correct to reject the earlier package's V1 binary for V3.
- There is new evidence of **Karina PY32 binaries**, but not that they are
  compatible with Armel multiboot or that their sources are available.
- This reference does not make the pack an official source for each author.

The repository header recommends saving calibration. Its Karina information
says there is no link to the source repository and describes it as closed
firmware, with builds reposted in an external channel. This alone does not
prove a specific license: the MIT notice stated by the user still needs a
verifiable source/rights holder.

## Nature and limits of the inventory

The complete, untruncated Git tree contains binaries, apps, documents, Python
drivers, and compressed files. No `.c`/`.h` source files, Makefile, or
LICENSE/COPYING/NOTICE by name were found in that tree. We do not claim to have
inspected every ZIP/RAR internally in the repository. The 21-09-2026 ZIP for
Karina was inspected, without running its files.

The pack is not copied into the web repository; EXE, APK, drivers, and
calibrations are not installed. Its PDFs, files, and firmware are not
redistributed. A locally calculated SHA-256 hash detects changes from that
download but does not establish authorship, license, safety, or correspondence
to source code.

## Families present

The following features are **claims by the inspected README's maintainer**, not
features certified by Bricohams. Consult the author and specific manual for
each build.

| Folder/project | Description in the pack | Status on this website |
| --- | --- | --- |
| BD1AHN | Variant with three VFOs | Documented reference; no validated protocol |
| Calypso | Version 1.5.0 and 1.7.0 folders | Cataloged; no features inferred |
| Delta | Password and data protection according to maintainer | Cryptographic properties are not certified |
| E25WOP | CW features and accessories according to maintainer | Do not connect accessories using instructions for another board |
| F4HWN | Releases and apps, including historical versions | Prefer the official Armel source already integrated |
| GOGU | F4HWN variant with messaging and other features | Multiboot claimed by maintainer; not locally validated |
| HAWK | Its own documentation and files | Cataloged; no features inferred |
| IJV | Versions with free/paid features according to the pack | Do not distribute or enable paid features without a license |
| IOTCU | Variant with a Si4732 module according to the pack | Requires specific hardware/firmware; do not infer that a stock radio has it |
| KA50 / KA52 / KA52M | Spectrum; KA52M has 2/3 VFO variants | Multiple VFOs do not equal simultaneous RF receivers |
| Karina | Spectrum, capture, and its own presets | New K1/V3 binaries; no verified Armel slots |
| Matoz | Its own files | Cataloged; no features inferred |
| N7SIX | Spectrum/CW features according to maintainer | Multiboot claimed, not certified |
| NR7Y | CW features according to maintainer | Do not assume electrical compatibility of accessories |
| PrepperRadio | FSK-mode messaging according to the pack | Do not certify encryption, network, or compatibility between variants |

The README also mentions Sonic through an external link and clarifies that it
is not in the pack at that time. A mention is not an inspected binary. Stock
firmware and factory calibration folders are reference material: **do not use
another unit's calibration as your own backup**.

## Multiboot: claim versus verification

The maintainer lists F4HWN, GOGU, IOTCU, and N7SIX as compatible with Armel
multiboot, along with external Sonic. **Karina is not on that list.** Format,
map, identification, CFG banks, restoration, protocol, integrity, and hardware
boot must be checked before expanding the inspector.

The website retains its list of recognized F4HWN images. No string is modified
and no file is renamed to bypass it. These sources are not automatically added
to the verified-download catalog for original authors.

## Karina 21-09-2026: ZIP evidence

File: `Karina/21.09.2026.zip`, 2296162 bytes.
SHA-256 of download:

```text
619368c7d08cd2dfdda13aeec4ae5d8fadd70eb78d60bbe908832d53385e2999
```

The [third-party index](BINARIOS-TERCEROS.md) lists a download with the
same name but 2161962 bytes and a different SHA-256. The two ZIP files have
not been shown to have equivalent contents. This inventory and the extracted
hashes below apply only to the 2296162-byte download stated above, not to any
file named `21.09.2026.zip`.

Inner inventory: K1 and K5V3 folders, two RAW images, two packed images, two
copies of `calib11.bin`, two CHIRP drivers, and three PDFs. It contains no C
project, Makefile, linker script, or LICENSE notice by name. The Russian names of
some entries show encoding problems when listing the ZIP; they have not been
reinterpreted as source names, and no content has been executed.

| Imagen RAW | Bytes | SP | Reset |
| --- | ---: | --- | --- |
| `k1_210926_3.bin` | 76288 | `0x20004000` | `0x08010AF5` |
| `v3_210926_3.bin` | 76352 | `0x20004000` | `0x08010B39` |

These vectors provide evidence of the PY32 family in both images, unlike
`Reset=0x0000010B` in the V1 package. A vector within range and an acceptable
size **do not prove** compatibility with the multiboot loader. Packed variants
are different containers; do not blindly remove 18 bytes.

| File | Local SHA-256 |
| --- | --- |
| `k1_210926_3.bin` | `81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82` |
| `v3_210926_3.bin` | `40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4` |
| `k1_210926_3.packed.bin` | `de1d74fd1a3901776c977fb58342264a69ad687c61c58a4063b63e91cd1123bc` |
| `v3_210926_3.packed.bin` | `5ec8598ca8cc5c0df0030137d5fd774bade8569d27b8021fcde147248f088d34` |

`calib11.bin` has not been restored, and doing so is not recommended. Both
copies are 512 bytes and have the same hash, which still does not make them
the user's original calibration for either radio.

## Karina V3 settings described by the maintainer

| Feature | Description given | Caution/version |
| --- | --- | --- |
| Spectrum Delay | Tradeoff between measurement time and speed | Lower values may reduce sensitivity; do not copy a universally “optimal” number |
| Turbo | Speeds up the sweep | May skip signals, according to the note itself |
| Roger 5 | Parameter reused for experimental RX changes | Meaning changes: on 21-09-2026 permanent acceleration is announced; do not treat it only as a Roger tone |
| Dynamic volume | Audio/tail handling | Perceptual setting, not RF calibration |
| Near/far capture | Automatic frequency detection | Affects power use/latency; does not guarantee locating or recording every signal |
| Three presets | Configuration states from July 2026 notes | Include their own data; they are not Armel firmware slots |
| Beacon/auto-reply | Features that may transmit automatically | Not enabled as an initial configuration or to test the radio |
| Extended SQL | July notes describe range 0-15 | Do not apply to earlier versions without verification |
| CHIRP settings/keys | Notes warn of incompatibilities and lockups with NONE | Do not write with a generic driver or copy values from other firmware |

The 21-09-2026 entry describes AM squelch closing, acceleration, capture, and
CTCSS/DCS measurement changes. The 21-08-2026 entry describes an RX lockup fix
related to Roger 5. These are pack notes, not test results. The 15-08-2026 file
is identified as a test build.

The pack text includes deletion, calibration loading, and even instructions
to ignore verification errors. **These are not turned into instructions on
this website.** If verification fails, stop, preserve backups, and check the
tool/hardware/version; do not declare success based on a third-party note.

## What is needed for a real port or integration

1. Exact sources and license from the author for Karina K1/V3.
2. Reproducible build and memory map.
3. Specification/protocol and real CFG/calibration compatibility.
4. Verification of the multiboot mechanism or a demonstrated compatible
implementation.
5. Physical read, backup, boot, restoration, and recovery tests.

Karina has not been ported, compiled, or flashed from this link. The new
evidence corrects hardware coverage; it does not remove those requirements.

## Pinned sources

- [Complete pack tree](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c).
- [Karina folder](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Karina notes and change log](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Egzumer: separate original source](AYUDA-EGZUMER.md).
- [Karina V1 package dossier](KARINA.md).