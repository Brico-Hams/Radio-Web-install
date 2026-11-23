# Third-party reuse

RadiCodex is GPL-3.0-or-later. Reference repositories live under `data/third-party/refs/` (gitignored, never committed).
Every row records what was adapted; code is never vendored as a whole repository.

| Repo | File | Licence | Used in | What changed |
|---|---|---|---|---|
| Hamlib | `amplifiers/elecraft/kpa.c`, `kpa1500.c`, `kpa.h` | LGPL-2.1-or-later, (c) 2019 Michael Black W9MDB | `station-amplifier-drivers.cjs`, `remote-station/bricoham_station_agent/amplifier_drivers.py` (KPA driver) | Re-implemented as a standalone driver over an injectable transport: `;` wake-up, `^OS`/`^ON`/`^OP`/`^SW`/`^SF`/`^PWF`/`^FR` commands, fault table; STANDBY is read back, `^ON0` is never sent, parse of the reply prefixes corrected where `kpa.c` reuses the wrong one. |
| Hamlib | `amplifiers/expert/expert.c` | LGPL-2.1-or-later, (c) 2023 Michael Black W9MDB, (c) 2026 Mikael Nousiainen OH3BHX | same files (Expert driver) | Frame builder (`55 55 55 CNT DATA CHK`), 67-byte status parser with 16-bit checksum; OPERATE toggle (`0x0D`) is sent at most once and only after a status read. |
| Hamlib | `amplifiers/gemini/gemini.c`, `dx1200.c`, `gemini.h` | LGPL-2.1-or-later, Hamlib authors | same files (Gemini driver) | `S` status parser, `R`/`R0`/`R1` operate; `TRIP` treated as a fault; no band follow because the Hamlib band table is not coherent. |
| macexpert-spe | `SPEProtocol.swift` | MIT, (c) 2026 Manoj Ramawarrier VU2CPL | same files (Expert driver) | Status CSV field order and example frame used as test data; no code copied. |
| SPE-1.3-2K-FA-Remote-server | `server.py`, `README.md` | GPL-3.0, OH2GEK | same files (Expert driver) | Request frames `55 55 55 01 90 90` and `55 55 55 01 0D 0D` and the status request flow, re-written in the project style with safety checks. |
| ACOM-Controller | `MainWindow.xaml.cs`, `README.md` | MIT, (c) 2019 Bjorn Ekelund | same files (ACOM driver) | Telemetry enable/disable, operate/standby frames, 72-byte telemetry offsets, per-model temperature offsets and error codes; every error code counts as a fault. |
| ATU-100-EXT-YAF-2E0UMK | whole repo reviewed | MIT, DG4SN / 2E0UMK | nothing | Reviewed: only a debug bit-banged UART TX, no host command set, so no driver. Catalog entry `atu-100-ext` stays `pendiente de fuente`. |
