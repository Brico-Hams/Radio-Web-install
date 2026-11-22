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

The band list is limited to the bands the radio can transmit on according to repository data: Icom IC-705 and IC-9700 (band plans in `FREQUENCY_RANGES.md`), OpenGD77 (default limits, not a band plan or an authorisation), Quansheng and AnyTone. If a radio has no TX data in the repository, «pendiente de fuente» is shown.
