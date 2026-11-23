# Third-party reuse

This project is GPL-3.0-or-later. Every row records what was taken from a third-party source and what was changed.

| Repo | File | Licence | What was taken | What changed |
| --- | --- | --- | --- | --- |
| Hamlib (reference tree 5.0-dev) | `rigs/{icom,kenwood,yaesu,yaesu/ftx1,flexradio}/*.c`, `riglist.h` | LGPL-2.1-or-later | Facts only: model numbers and the declared levels, functions, VFO operations and handler presence of each backend caps struct | No code or calibration table was copied. `scripts/hamlib-caps-extract.cjs` (own code) records the facts in `data/remote-hamlib-caps.json`; `remote-hamlib-caps.cjs` derives the parity and meter statuses; `scripts/remote-caps-apply.cjs` writes them |
| wfview | CI-V command usage for Icom radios | GPL-3.0-or-later | Read as a cross-check of which meters and operations Icom radios expose; nothing copied | Nothing vendored |

Notes:

- The reference tree is Hamlib 5.0-dev while the catalogue pins `hamlibVersion` 4.7.2. The extracted caps are reference facts; the `dump_caps` of the installed `rigctld` still decides at runtime.
- Declared but unreached meters (COMP, ID, VD, TEMP over Hamlib) are listed per radio in `data/remote-meter-model.json` (`backend.unreached`) and are not upgraded.
- Re-run `node scripts/hamlib-caps-extract.cjs`, `node scripts/remote-caps-apply.cjs` and `node scripts/remote-parity-docs.cjs` after updating the references.
