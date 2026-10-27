# Examples: open firmware, channels, and scripts

Revision: 26-10-2026. Example files from the repository's `examples/` folder. Only
binaries whose licenses permit redistribution are included, with their license alongside. Third-party
firmware without that license (Karina, Baofeng, OpenGD77 DM32) appears only in the
[hash index](BINARIOS-TERCEROS.md).

## Open firmware

| Folder | Contents | License | For |
| --- | --- | --- | --- |
| [examples/firmware/f4hwn-v6.3.0](../../../examples/firmware/f4hwn-v6.3.0/SHA256SUMS) | `f4hwn.fusion`, `fieldops`, `labs`, and `transfer` v6.3.0, plus the CHIRP driver from the same release | Apache-2.0 (firmware, with `LICENSE` and `NOTICE`); GPL-2.0 or later (CHIRP driver, in its header) | Quansheng UV-K5 V3 and UV-K1 (PY32F071) |
| [examples/firmware/moto-v1.3.2](../../../examples/firmware/moto-v1.3.2/SHA256SUMS) | Moto bootloader 1.3.2 in `.bin` and `.uf2` | Apache-2.0 | UV-K5 V3 / UV-K1. Changing the bootloader is risky: see the [atlas](ATLAS-UV-K5-V3.md#bootloader-y-flasheo) |

Source: official releases of [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0)
and [muzkr/moto](https://github.com/muzkr/moto/releases/tag/v1.3.2). The SHA-256 hashes match those published by GitHub for each file. Check before use:

```text
cd examples/firmware/f4hwn-v6.3.0
sha256sum -c SHA256SUMS
```

Flashing the main firmware: [getting started from 0 to 100%](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100).
The latest version is always in the armel release; these copies are a fixed reference.

## Channels

| File | Contents |
| --- | --- |
| [examples/channels/pmr446-solo-rx.chirp.csv](../../../examples/channels/pmr446-solo-rx.chirp.csv) | The 16 PMR446 channels in CHIRP CSV format, narrow FM and TX disabled (`Duplex = off`). Template for importing into CHIRP or this website |

Amateur radios are not approved for PMR446: this file is for listening only.

## Scripts

Bricohams' own code, under the repository license (GPL-3.0-or-later). Run with `python -I`.

| Script | What it does |
| --- | --- |
| [tg_kb.py](../../../examples/scripts/tg_kb.py) | Converts Telegram Desktop JSON exports from technical groups into a local knowledge base organized by topic (firmware, flashing, calibration, mods), with a file catalog (SHA-256, target MCU from the vector table) and links. Removes authors, aliases, phone numbers, and email addresses. The result is third-party material: keep it local |
| [test_tg_kb.py](../../../examples/scripts/test_tg_kb.py) | Test of `tg_kb.py` using a synthetic export: `python -I test_tg_kb.py` |
| [check_repos.py](../../../examples/scripts/check_repos.py) | Reads an `owner/repo` list and produces a table with status, latest push, license, stars, and MCU (V3/K1 if PY32 code exists). Requires `gh` with a session |
| [recover.py](../../../examples/scripts/recover.py) | For deleted repositories: searches Software Heritage for a copy, the Wayback Machine for a capture, and forks with the same name |

Typical usage:

```text
python -I tg_kb.py salida ChatExport_grupo1 ChatExport_grupo2
python -I check_repos.py repos.txt > repos.md
python -I recover.py caidos.txt
```