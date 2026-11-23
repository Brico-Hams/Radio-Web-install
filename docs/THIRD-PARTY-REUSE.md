# Third-party code reuse

This project is GPL-3.0-or-later. Code adapted from other projects is listed
here with its licence and what changed. Reference copies live under
`data/third-party/` (gitignored, never committed).

| Repo | File(s) | Licence | Used in | What changed |
| --- | --- | --- | --- | --- |
| Hamlib | `rotators/gs232a/gs232a.c`, `rotators/gs232a/gs232b.c` (Copyright (c) 2001-2012 Stephane Fillod) | LGPL-2.1-or-later (SPDX `LGPL-2.1-or-later`) | `station-devices.cjs`, `remote-station/bricoham_station_agent/station_devices.py` | Re-implemented the GS-232A/B frames (`Waaa eee<CR>`, `C2<CR>`, `S<CR>`), reply formats (`+0aaa+0eee`, `AZ=aaa EL=eee`) and baud ranges in JavaScript and Python with strict reply validation, explicit baud, elevation limits from the agent config, lease/deadman/stop handled by the existing rotor layer. Speed and continuous-move commands were not taken. |
| Hamlib | `rotators/spid/spid.c`, `rotators/spid/spid.txt` (Copyright (c) Norvald H. Ryeng, LA6YKA; Hamlib authors) | LGPL-2.1-or-later (SPDX `LGPL-2.1-or-later`) | same files | Re-implemented the 13-byte Rot2Prog set/status/stop frames and the 12-byte reply decoding (`-360`, `PH`/`PV` resolution) in JavaScript and Python; resolution is read before every move and validated against 1/2/4 pulses per degree; no Rot1Prog or MD-01 support. |
| k3ng_rotator_controller | `README.md`, `rotator_features.h` | GPL-3.0 | documentation only | Used to confirm that GS-232A and GS-232B emulation differ; the emulation source is not in the reference copy, so no frames or code were taken. |
| remoteRotator | (reference only) | see its `LICENSE` | none | No code adapted. |
