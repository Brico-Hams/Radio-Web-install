# Icom IC-705 and IC-9700 custom firmware (transverters)

The Icom page of this application prepares the custom firmware by Dawid SQ6EMM for the Icom IC-705 (E/J, v1.40) and the IC-9700 (E, v1.50). It is designed for microwave transverters. It is not an Icom product and is not affiliated with Icom: it is an amateur radio community project under the MIT licence. Bricohams has NOT tested it on any radio.

The firmware is distributed only as patches. You supply the official Icom `.dat` file, the browser applies the patch on your computer and you get a `.dat` that you install with the normal SD card update procedure. Nothing is uploaded to any server and the radio is NOT programmed over USB or Web Serial.

## What the firmware does

- Transverters: 8 slots (`TRV1` to `TRV8`), with the real RF frequency on the display and over CI-V up to 122 GHz.
- Per transverter: maximum TX power, TX delay (up to 300 ms, all modes) and, on the IC-9700, PTT inhibit.
- IC-9700: independent active transverter for MAIN and SUB, the MAIN/SUB exchange keeps it, and in SAT mode the TX settings follow the SUB transverter.
- Spectrum and waterfall scale of 10, 6, 3 or 1 dB per division, with the noise floor anchored automatically.
- IC-705: extended TX ranges and 4 m (70 MHz) TX on the E base; the J variant extends 1.6-54, 68-74.8, 118-174 and 400-470 MHz. Transmit only where your licence allows it.
- SD card apps: MENU, SET, Apps.
- Own A/B bootloader with fallback to the other firmware block.
- The opening screen states that the firmware is by Dawid SQ6EMM; the radio version text stays official.

## Supported files

The browser computes the MD5 of the file you pick and compares it with this list (`docs/patches/index.json` of the project). Only unmodified official files are accepted.

| Radio | Official file | Input MD5 | Release | Output MD5 |
| --- | --- | --- | --- | --- |
| IC-9700 E 1.50 | `9700E150.dat` | `6f04fd2248ba39254ed01b30b52ce36a` | `20261113v3` | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 E 1.40 | `705E140.dat` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `20261113v1` | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 J 1.40 | `705J140.dat` | `b605171288db4a74e0992a8f2afcb1c3` | `20261113v1` | `d7a7f87b9b16f262b188fe3735b3682b` |

The output file keeps the release name, for example `9700E150_20261113v3.dat`. The page only offers the download if the MD5 of the result matches exactly the one of the build tested by the author.

## How the container works

The Icom `.dat` file is a container with several layers. The patch undoes them, modifies the image and closes them again:

1. Autokey transform: the content is obfuscated with a key that depends on the data itself and is decoded byte by byte.
2. LZSS compression: the firmware image is compressed; it is decompressed to patch it and compressed again at the end.
3. MD5 seal: the container ends with the MD5 of its content, which is recalculated after the patch.
4. Initial bootstrap at address `0x10000`, where the own A/B bootloader is installed.

The patch is a JSON file with operations of the type copy N bytes from address X of the official image, plus the new code of the project. Because it only contains instructions and its own code, it includes no byte of the Icom firmware: that is why it needs your official file. Before offering the result, the page checks that the input MD5 and the output MD5 are the expected ones.

## A/B bootloader

The firmware keeps two blocks (A and B). If the new one does not start or you want to go back to the previous one, the bootloader lets you pick the other block:

- IC-9700: hold POWER while connecting the DC supply, about 5 s.
- IC-705: hold POWER at power-on until the LED blinks, about 3 s.

Always keep the official file: reinstalling it returns the radio to the factory firmware.

## SD card installation

1. Download the official `.dat` for your radio and version from Icom (see the table) and do not modify it.
2. On the Icom page choose or drag that file, wait for it to be recognised and press the button to prepare the firmware.
3. Download the resulting `.dat` once the page confirms that the MD5 matches.
4. Copy the file to the SD card following the firmware update procedure in the Icom manual for your radio.
5. Update the radio with that procedure and wait for it to finish without cutting the power.
6. Check the opening screen and review the transverter menu.

## Offline alternative

The project includes a command line tool that does the same without a browser: `third_party/icom-custom-firmware/icom_patch.py`. It runs with Python 3, for example `python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat`, from the project folder. The result must have the same output MD5 as the table. The project browser test is run with `npm run test:icom-upstream`.

## Adding a new release

Releases are declared in `releases.json` of the original project. To publish a new one, the JSON patch is generated in `patches/` and the index is regenerated with `tools/build_index.py`, which writes `docs/patches/index.json`. Then copy the patch and the index into `third_party/icom-custom-firmware/docs/patches/` and add the new patch to the allowed file list of `server.cjs`. This vendored copy is not edited by hand: it is updated by bringing a new commit of the original project.

## Safety

- It is unofficial firmware: it can brick the radio and can void the Icom warranty.
- Transmit only on frequencies and at powers that your licence allows. The IC-705 extends the TX ranges and using them properly is your responsibility.
- Check the TX delay and the power of each transverter slot with a dummy load before connecting a transverter or an antenna.
- Only unmodified official files are accepted and the output must match the tested MD5.
- Keep the official file and the SD card to go back, and do not cut the power during the update.

## Licence and attribution

Based on icom-custom-firmware by Dawid SQ6EMM (MIT licence). Repository: [icom-custom-firmware](https://github.com/sq6emm/icom-custom-firmware). Patcher web page: [web patcher](https://sq6emm.github.io/icom-custom-firmware/). Forum thread: [mikrofale.cafe](https://mikrofale.cafe/showthread.php?tid=1296). The MIT licence text is in `third_party/icom-custom-firmware/LICENSE` and is published together with the application.

## Where it lives in this repository

- `icom.html` and `icom-ui.js`: the page and its logic.
- `third_party/icom-custom-firmware/`: unchanged copy of the original project at commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`.
- `third_party/icom-byof/`: unchanged copy of the reverse-engineering documentation at commit `a91231f64e8afbe34353994786e8276a3b54f1a9`. More detail in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) and [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md).
- `tests/icom.test.cjs`: tests of the page and of the served files.

Bricohams has NOT tested this firmware on a real radio. The automatic tests only check the page and the published files; the validation of the patch is that of the original author.
