# HF/VHF wire antennas: designer and analyzer

**Antennas** page of the application. It complements the [satellite antennas](ANTENAS-SATELITE.md) and uses the same method-of-moments solver (`hardware/antenas/mom.py`), ported to JavaScript in `antenna-core.js`. Everything is computed in the browser and works offline.

## Limits and safety

- This is **simulation only**: perfect conductors, thin wire and no ohmic losses.
- There is no lossy ground: height above ground is modelled in free space or with a perfect ground plane (image) at z = 0.
- Always check the antenna with an analyzer before transmitting.
- Never transmit without a matched antenna or load.
- Trap, balun and coax values are entered by the user; there is no cable database.

## Features

| Feature | What it does | Source of the numbers |
| --- | --- | --- |
| Geometry | 2D/3D view, editable wire and load tables | User data |
| Sweep and tuning | SWR, R, X, Smith chart and Nelder-Mead tuning for minimum SWR | Moment model |
| Radiation | Azimuth and elevation cuts, 3D pattern, gain in dBi and currents | Moment model |
| Matching | Balun 1:1, 1:2, 1:4, 1:6, 1:9, L-network and coax | Line and circuit formulas |

## Templates and traps

Templates are provided for a half-wave dipole, an inverted V and a multiband trap dipole (2 to 5 bands and up to 8 parallel LC traps). Fix C to compute L, or L to compute C, with the resonance `f = 1/(2π√(LC))`. Each section starts from c/(4f) with no invented shortening factors: use the advisor and automatic tuning.

## Measurement CSV format

The analyzer file may contain frequency and SWR columns, or frequency, R and X. The header, the units Hz, kHz or MHz, the separator (comma, semicolon or tab) and the decimal comma are detected. Example: `frecuencia;swr`.

## Bands per radio

The band list is limited to the bands the radio can transmit on according to repository data: Icom IC-705 and IC-9700 (band plans in `FREQUENCY_RANGES.md`), Yaesu FTX-1 (14 bands from `third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml`), TH-D75 (band A ranges), OpenGD77 (default limits, not a band plan or an authorisation), Quansheng and AnyTone. truSDX and QMX only carry the CAT tuning range (not TX limits). If a radio has no TX data in the repository (e.g. TK11), «pendiente de fuente» is shown.

## Measure SWR from the radio

The app never keys the radio: you transmit, and the meter is read only while the radio reports TX. The (frequency, SWR) points are overlaid on the model curve like an imported CSV. On desktop the remote station is used (`GET /api/remote/swr`) or, for the FTX-1, direct Web Serial (read-only `TX;`, `FA;` and `RM6;`); on Android the antenna screen (network-less WebView, strict CSP) reads the profile radio over CAT. Never transmit without a matched load or an antenna.

| Radio | SWR meter via CAT | Source |
| --- | --- | --- |
| Icom IC-705 | ok | CI-V `15 12` (IC-705 CI-V Reference Guide p. 5) and TX `1C 00` (p. 15); `rigs/ic705.toml` |
| Icom IC-7300 | partial (scale up to SWR 3.0) | CI-V `15 12` / `1C 00` (`rigs/ic7300.toml`) |
| Icom IC-7300MK2 | partial (scale up to SWR 3.0) | CI-V `15 12` / `1C 00` (`rigs/ic7300mk2.toml`) |
| Icom IC-7610 | partial (scale up to SWR 3.0) | CI-V `15 12` / `1C 00` (`rigs/ic7610.toml`) |
| Icom IC-9700 | partial (scale up to SWR 3.0) | CI-V `15 12` / `1C 00` (`rigs/ic9700.toml`) |
| Icom IC-905 | partial (scale up to SWR 3.0) | CI-V `15 12` / `1C 00` (`rigs/ic905.toml`) |
| Icom IC-7100 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7200 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7410 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7600 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7700 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7760 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7800 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-7850 / IC-7851 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-9100 | pendiente de fuente | no SWR read command in the repository |
| Icom IC-R8600 | pendiente de fuente | receiver only, it never transmits |
| Yaesu FTX-1 | partial (approximate scale) | `RM6;` in `docs/FTX1-KNOWLEDGE.md` |
| Yaesu FT-710 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FT-991A | pendiente de fuente | no SWR read command in the repository |
| Yaesu FTDX10 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FTDX101D | pendiente de fuente | no SWR read command in the repository |
| Yaesu FTDX101MP | pendiente de fuente | no SWR read command in the repository |
| Yaesu FTDX3000 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FT-817 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FT-818 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FT-857 | pendiente de fuente | no SWR read command in the repository |
| Yaesu FT-897 | pendiente de fuente | no SWR read command in the repository |
| Kenwood TS-590S | pendiente de fuente | no SWR read command in the repository |
| Kenwood TS-590SG | pendiente de fuente | no SWR read command in the repository |
| Kenwood TS-890S | pendiente de fuente | no SWR read command in the repository |
| Kenwood TS-990S | pendiente de fuente | no SWR read command in the repository |
| Kenwood TH-D75 | pendiente de fuente | no SWR read command in the repository |
| Elecraft K3S | pendiente de fuente | no SWR read command in the repository |
| Elecraft K4 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-6400 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-6400M | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-6600 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-6600M | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-6700 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-8400 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-8400M | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-8600 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio FLEX-8600M | pendiente de fuente | no SWR read command in the repository |
| FlexRadio AURORA-510 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio AURORA-510M | pendiente de fuente | no SWR read command in the repository |
| FlexRadio AURORA-520 | pendiente de fuente | no SWR read command in the repository |
| FlexRadio AURORA-520M | pendiente de fuente | no SWR read command in the repository |
| QRP Labs QMX / QMX+ | pendiente de fuente | `SW;` without a documented scale |
| QRP Labs QCX | pendiente de fuente | no SWR read command in the repository |
| QRP Labs QDX | pendiente de fuente | no SWR read command in the repository |
| (tr)uSDX | pendiente de fuente | no SWR read command in the repository |
| Hermes Lite 2 | pendiente de fuente | no SWR read command in the repository |
| Quansheng UV-K5 | pendiente de fuente | no SWR read command in the repository |
| OpenGD77 | pendiente de fuente | no SWR read command in the repository |
| Radtel RT-950 Pro | pendiente de fuente | no SWR read command in the repository |
| Radtel RT-S10 | pendiente de fuente | no SWR read command in the repository |
| AnyTone D878 | pendiente de fuente | no SWR read command in the repository |
| TK11 | pendiente de fuente | no SWR read command in the repository |

The Icom radios marked partial only have the sourced SWR 1.0 to 3.0 points (raw 0 to 120); a higher raw value is discarded. The Hamlib `SWR` level read by the remote station is shown for any radio only when Hamlib returns it; the repository does not document which backends do, so the radios above stay «pendiente de fuente».
