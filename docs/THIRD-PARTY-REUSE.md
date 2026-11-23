# Third-party reuse

| Repo | File | Licence | What changed |
| --- | --- | --- | --- |
| POTACAT | `lib/flex-scope.js` | Apache-2.0 (Copyright 2026 Casey Stanton; file SPDX header) | FFT packet parser (class 0x8003), pixel-to-level mapping, frame assembler with junk-frame drop and `display pan set` sizing, ported to `remote-station/bricoham_remote_station/drivers/smartsdr_protocol.py` and `smartsdr-core.cjs`; added strict length checks, stream filtering and tests. |
| POTACAT | `lib/smartsdr.js` | GPL-3.0 | Facts only: `xmit 1\|0` syntax; implemented in our own words behind `allow_tx`, time cap and SWR trip. |
| Hamlib | `rigs/flexradio/smartsdr.c` | LGPL-2.1-or-later | Facts only: `xmit %d` syntax confirms the POTACAT source. |

Not found in any reference: ping/keepalive syntax and waterfall-tile layout (kept "pendiente de fuente").
Reference repos live in `data/third-party/` (gitignored, never committed).
