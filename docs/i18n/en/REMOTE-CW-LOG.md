# Remote CW, keyboard/MIDI and log (`remote-cw.cjs`, `remote-log.cjs`, `remote-controls.js`)

Own design; the RemoteMyShack list (`data/third-party/RMS-2026-11-22.md`) is reference only.

## Remote CW send (radio keyer)

| Radio | Command | Source |
| --- | --- | --- |
| Yaesu FTX-1 | `KM{slot}{TEXT};` then `KY0{slot};`, stop `KY00;`, up to 50 characters | `docs/FTX1-KNOWLEDGE.md` rows KM/KY |
| Icom IC-705 | CI-V `FE FE A4 E0 17 <ASCII> FD`, up to 30 characters, stop = data `FF` | IC-705 CI-V guide p.3, p.5, p.18 |
| Other transmit-capable catalog radios | Hamlib `rigctl b` / `\send_morse` | Hamlib name only; per-model support not sourced (partial) |
| Kenwood KY, Elecraft KY, QMX, (tr)uSDX, Flex, Hermes Lite 2 native keyer | pendiente de fuente | no source in the repo |

The text is uppercase, limited to the sourced character set, and the duration is capped (60 s by default, 120 s maximum). Sending is off by default, one message at a time, refused while the transmitter is blocked (SWR trip, emergency stop) and `stop()` is always allowed. Never transmit without a matched load or antenna. F1-F8 memories expand `{CALL}`, `{MYCALL}`, `{RST}` and `{NR}`.

## Log

- ADIF import/export with the same rules as the Android importer: ASCII only, 16 MB / 50000 records, no duplicate fields, required fields CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD.
- Duplicate check by call, band and mode. DXCC, WAS (only DXCC 291), grid and POTA progress are counted from the fields stored in the log; no prefix table is used to derive entities.
- DX spots are marked `new-call`, `new-slot` or `worked` against the log.
- Grayline: solar position and terminator to draw over `data/world-land-110m.txt`.

## Keyboard and MIDI

MIDI note and control-change messages (MIDI 1.0 layout) map to tuning, band, CW memory and stop actions. PTT, tune carrier and amplifier operate can never be bound. Escape always stops. FlexControl HID and CTR2-MIDI device layouts: pendiente de fuente (bindings are operator-defined).

## Agent and console

The agent accepts `{"cmd":"cw","text":"CQ TEST","wpm":20,"slot":5}` and `{"cmd":"cwstop"}` on `POST /api/cmd`. `cwEnabled` in `remote-agent.json` is `false` by default, `cwMaxSeconds` caps the message. A message stops on `cwstop`, on any PTT release or SWR trip, when the operator loses control, when the radio disconnects and when the agent closes. The console has a CW tab (text, WPM, F1-F8 memories, Esc to stop). The F1-F8 memories are stored per operator in the agent (`remote-cw-memories.json`, `GET`/`POST /api/cw/memories`, 8 entries of up to 50 sourced characters), never in the browser; Enter in the text field sends. Listen-only guests are refused for `cw` and for the memories, guests with TX are also held to their band and power limits, and `cwstop` is never refused or rate limited. A message that reaches its time cap gets its stop frame. Icom models go through the Hamlib baseline because no CI-V transport through rigctld is sourced.

## Support matrix per radio

Union of `data/remote-station-catalog.json`, the Python drivers and the Android profiles (`Profile.kt`). `ok` = sourced command and wired; `partial` = sourced only as the Hamlib `b` / `send_morse` baseline (per-model support unverified; the agent refuses when rigctld answers an error); `pendiente de fuente` = no source in the repo, disabled. Digital decode/transmit (FT8/FT4/WSPR/CW/RTTY/PSK31/SSTV decoders on the remote audio) is not ported to the shared layer yet, so it is `pendiente de fuente` for every radio.

| Radio | Link | CW send | Keyer memories | Digital decode/TX |
| --- | --- | --- | --- | --- |
| Yaesu FTX-1 | raw CAT (`KM`/`KY`) | ok | ok | pendiente de fuente |
| Icom IC-705 | CI-V plan (guide p.3, p.5, p.18), sent through Hamlib | partial | partial | pendiente de fuente |
| Icom IC-7100, IC-7200, IC-7300, IC-7300MK2, IC-7410 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7600, IC-7610, IC-7700, IC-7760, IC-7800 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7850 / IC-7851, IC-905, IC-9100, IC-9700 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-R8600 | receiver only | not applicable | not applicable | pendiente de fuente |
| FlexRadio FLEX-6400, 6400M, 6600, 6600M, 6700 | SmartSDR CAT via Hamlib `b`; native keyer pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio FLEX-8400, 8400M, 8600, 8600M | SmartSDR CAT via Hamlib `b`; native keyer pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio AURORA-510, 510M, 520, 520M | SmartSDR CAT via Hamlib `b`; native keyer pendiente de fuente | partial | partial | pendiente de fuente |
| Kenwood TS-590S, TS-590SG, TS-890S, TS-990S | Hamlib `b`; native `KY` pendiente de fuente | partial | partial | pendiente de fuente |
| Yaesu FT-710, FT-991A, FTDX10, FTDX101D, FTDX101MP, FTDX3000 | Hamlib `b`; native `KY` pendiente de fuente (only FTX-1 is sourced) | partial | partial | pendiente de fuente |
| Elecraft K3S, K4 | Hamlib `b`; native `KY` pendiente de fuente | partial | partial | pendiente de fuente |
| QRP Labs QMX / QMX+, QCX / QDX | Hamlib `b`; native keyer pendiente de fuente | partial | partial | pendiente de fuente |
| DL2MAN (tr)uSDX | Hamlib `b`; native keyer pendiente de fuente | partial | partial | pendiente de fuente |
| Hermes Lite 2 | piHPSDR CAT via Hamlib `b` | partial | partial | pendiente de fuente |
| Yaesu FT-817, FT-818, FT-857, FT-897 (Android only) | five-byte CAT, no keyer command sourced | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Kenwood TH-D75 (Android only) | read-only CAT | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Quansheng UV-K5, OpenGD77, Radtel RT-950 Pro / RT-S10, AnyTone D878, KISS TNC (Android only) | no remote shack path, no CW keyer | not applicable | not applicable | pendiente de fuente |

Xiegu is not in the catalog, the Python drivers or the Android profiles, so there is no row for it.

## QSO book, QRZ.com and LoTW (Node agent, owner only)

The console tab "Libro QSO" reuses `remote-log.cjs` (ADIF import/export, duplicates, DXCC/WAS/grid/POTA progress) on top of `remote-qsl.cjs`, which stores the book in `qso-log.json` next to `remote-agent.json` (0600).

- QRZ.com lookup is off by default. Enable it in `remote-agent.json`: `"qrz": {"enabled": true, "username": "...", "password": "..."}`. The XML flow follows `third_party/ftx1/Eugen68-Yaesu-FTX1-CAT-Control/.../QrzLookupHelper.java`. HTTPS only, 8 s timeout, 20 lookups per minute. Credentials and session key stay in the agent: never in browser storage, responses, logs or URLs shown to the user.
- LoTW upload runs your local TQSL: `"lotw": {"tqslPath": "C:\\path\\to\\tqsl.exe", "args": ["...", "{file}"], "timeoutSeconds": 120}`. The TQSL command line is pendiente de fuente in this repo, so you give the argument array yourself; `{file}` is replaced with a temporary ADIF of the pending QSOs. No shell, no stdin, certificate passwords are never handled (TQSL manages them), and nothing is sent without a click plus a confirmation. Exit code 0 marks the QSOs as sent.

## Pendiente de fuente (disabled)

TQSL command line arguments (operator-configured, see above), DX cluster telnet line format, FT8/FT4/WSPR/CW/RTTY/PSK31 decoders, SSTV on the web console, DXCC prefix table, FlexControl HID.
