# Third-party code reuse

Code adapted from other projects. The project is GPL-3.0-or-later; every row lists the origin, its licence and what changed. Reference repositories are never vendored.

| Project | Source file(s) | Licence | Used in | What was adapted and changed |
| --- | --- | --- | --- | --- |
| Hamlib | `rigs/icom/xiegu.c`, `rigs/icom/icom.c`, `rigs/icom/icom_defs.h`, `tests/testg90swr.c` | LGPL-2.1-or-later | `remote-native-cat.cjs` (`XieguCivRig`, `XIEGU_MODELS`), `tests/remote-native-cat.test.cjs`, `data/remote-station-catalog.json` | Per-model CI-V address, baud range and Hamlib model number; command/sub-command codes (03/04/05/06/07/0F/15/1C); S-meter calibration tables (X108G, X6100) and the default SWR table; the G90 rule that rejects non-BCD SWR replies; tolerance for the non-standard PTT acknowledgement. Rewritten in JavaScript with an injected transport, TX gating (`allowTx`, PTT off never gated, release after a failed key-up) and deterministic tests built from the frames in `testg90swr.c`. |
