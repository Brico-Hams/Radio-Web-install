# Icom custom firmware (IC-705 / IC-9700)

Custom firmware releases for the Icom IC-705 and IC-9700 by Dawid SQ6EMM: transverter
support (TRV1–TRV8, RF display up to 122 GHz, CI-V frequency translation, per-transverter
max TX power, TX delay and PTT inhibit) and an A/B bootloader that keeps the previous
firmware in the radio and lets you switch back.

**Web patcher:** https://sq6emm.github.io/icom-custom-firmware/

**Discussion, questions and reports:** the official place is the forum thread
https://mikrofale.cafe/showthread.php?tid=1296

No Icom firmware is distributed here. You download the official `.dat` from Icom yourself;
the patcher (running entirely in your browser — the file never leaves your computer) applies
the patch and offers the result **only if it is byte-identical to the build that was tested**
(MD5 checked on input and output). There is always exactly one patch per official file: the
latest release.

| Official file | Release | Output MD5 |
|---|---|---|
| IC-9700 `9700E150.dat` (`6f04fd2248ba39254ed01b30b52ce36a`) | 20261113v3 — TRV per MAIN/SUB (DUAL, SAT), scope dB/div, SD apps, A/B bootloader | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 `705E140.dat` (`2c9c1d7f3fc80ef173e01d841cd1248a`) | 20261113v1 — TRV, scope dB/div, SD apps, A/B bootloader, extended TX ranges | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 `705J140.dat` (`b605171288db4a74e0992a8f2afcb1c3`) | 20261113v1 — TRV, scope dB/div, A/B bootloader, extended TX ranges | `d7a7f87b9b16f262b188fe3735b3682b` |

The IC-705 releases extend the TX frequency ranges beyond the amateur bands. You alone are
responsible for transmitting only where your licence and national regulations allow.

## Command line

```sh
python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat
```

## Before you use it

- This is **not Icom software**. Use at your own risk; it may void your warranty.
- Releases that include the custom bootloader rewrite the radio's bootloader once during
  the SD-card update. A power loss at that moment can require recovery with a flash
  programmer — use a stable power supply.
- IC-9700 slot switch: hold POWER while connecting the DC supply (~5 s) to boot the other
  firmware slot. IC-705: hold POWER at power-on until the LED blinks (~3 s).
- Before connecting a transverter, verify TX delay (scope SEND vs RF) and output power on a
  dummy load.
- You alone are responsible for transmitting only where your licence and national
  regulations allow.

## Repository layout

- `docs/` — the web patcher (GitHub Pages).
- `patches/` — release patches; `releases.json` — which patch is the current release for
  each official file; `tools/build_index.py` regenerates `docs/patches/index.json`.
- `icom_patch.py`, `ic_rza1_repack.py`, `icom_rza1_decode.py` — command-line patcher.
- Reverse-engineering tools and format documentation:
  https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware

License: MIT (see `LICENSE`).
