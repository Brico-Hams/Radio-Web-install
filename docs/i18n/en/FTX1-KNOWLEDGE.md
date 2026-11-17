# Yaesu FTX-1 knowledge: research reference

## Introduction and safety legend

This document gathers what was learned from 22 public repositories about the
Yaesu FTX-1 (CAT commands, USB, memories, firmware, hardware, satellites and
remote architectures) and compares it with what Bricohams already does. It is
reference material: it does not replace Yaesu's official "CAT Operation
Reference Manual" or the user help `docs/AYUDA-FTX1.md`.

Where the sources are: each repository is cloned unchanged in
`third_party/ftx1/<carpeta>`. The table with the URL, commit and licence of each
one is in `third_party/ftx1/SOURCES.md`. Citations are written
`[carpeta:ruta]`, with the folder under `third_party/ftx1/`. The `[SOURCES.md]`
citations point to `third_party/ftx1/SOURCES.md`.

Safety legend. These labels mark rows and paragraphs:

- **ESCRIBE EN LA RADIO** (WRITES TO THE RADIO): saves data that persists in the
  radio (memory, menu, clock, state) or changes the state of the radio.
- **REGION/LIMITES TX** (REGION/TX LIMITS): changes or affects the bands or the
  power on which the radio can transmit.
- **CALIBRACION** (CALIBRATION): touches factory calibration data.
- **FIRMWARE**: reads, prepares or loads firmware.

This project never automates anything marked **REGION/LIMITES TX**,
**CALIBRACION** or **FIRMWARE**. It does not automate transmission either (PTT,
CW, tuner). Everything marked **ESCRIBE EN LA RADIO** that the tool does offer
(memories, menu) requires reading first, making a backup, simulating and
verifying by reading back.

Notation: commands are ASCII terminated by `;`. `P1` is the side: 0 = MAIN,
1 = SUB, unless stated otherwise. `?;` is the radio's rejection. "Set only"
means it has no read and no answer. CAT requires MAIN firmware 1.08 or later
[gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Three
revisions of the CAT manual have been seen: 2306, 2507(-B) and 2508-C
[captobie-ftx1-remote:ftx1-cat-manual-errata.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. The 2508-C
manual has 89 command families in the index (90 with `EO`, which is only in the
detail table) and 580 detail rows, 427 of them for `EX`
[rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].

No studied repository contains code that writes firmware, changes region or TX
limits (except the region tool in section 5 and the `PC`/`EX` power menus), or
writes calibration. Of the firmware, only the version is read, with `VE`.

## CAT command reference

Disagreements between sources and errata in the manual are kept in the Notes
column. Rows with **ESCRIBE EN LA RADIO** change data that persists. The TX rows
(`TX`, `MX`, `KY`) and the tuner start row (`AC`) activate the transmitter: this
project does not use them.

| Command | Set | Read | Answer | Parameters | Notes | Sources |
|---|---|---|---|---|---|---|
| AB | `AB;` | - | - | Copies MAIN to SUB | Set only. Rigplane calls it "M=S equalize"; it is not a VFO A/B operation | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| AC | `AC P1 P2 P3;` | `AC;` | `AC P1 P2 P3;` | P1 0 internal/1 external; P2 0 ATU, 2 ATAS; P3 0 OFF, 1 ON, 3 START (2 reserved) | P3=3 starts the tuner and **transmits**. Verified on a radio: P1=0 does nothing on an Optima, P1=1 works. Forms: internal `AC003;`/`AC000;`, external `AC103;`/`AC100;`, ATAS `AC123;`/`AC120;`; ATAS rejects anything other than `AC12x`; `AC;` may stay non-zero when it finishes (PO is watched); antenna `EX030704;`, tuner type `EX030701;`/`EX030702;`. **ESCRIBE EN LA RADIO** (state) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| AG | `AG P1 nnn;` | `AG P1;` | `AG P1 nnn;` | AF gain, 3 digits, 000-255 | Used by gnfrazier, rigplane, WebUI, iTracMan and SEM | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| AI | `AI0;`/`AI1;` | `AI;` | `AI s;` | Auto information OFF/ON | No source describes the format of unsolicited messages; the apps poll instead of relying on AI. See section 3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| AM | `AM;` | - | - | Saves the state of VFO-A MAIN into the selected memory channel (no channel argument) | Set only. Saves tone/CTCSS, mode and shift (MW does not). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| AO | read/set | yes | - | AMC output level 001-100 (ITM: `AOnnn`) | Not implemented in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| BA | `BA;` | - | - | Copies SUB to MAIN | Set only | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| BC | `BC P1 s;` | `BC P1;` | `BC P1 s;` | Auto notch (DNF) OFF/ON per side | SUB form tested on the bench | [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| BD | `BD P1;` | - | - | Band down | No answer. Rigplane sends `BD0;`; WebUI and POK `BDv;` | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BI | `BI s;` | `BI;` | `BI s;` | Break-in OFF/ON | EUG reads the state at offset 2 | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| BM | `BM;` | - | - | Saves the state of VFO-B SUB into the selected memory | Set only. Saves the real SUB VFO (can corrupt the channel, e.g. stuck at 144 MHz). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| BP | `BP P1 P2 nnn;` | `BP P1 P2;` | `BP P1 P2 nnn;` | Manual notch. P2=0: state 000/001; P2=1: frequency 001-320 (x10 Hz = 10-3200 Hz) | The manual has no notch width command. The answer may be non-numeric (`BP01F35;`) in modes without notch (FM). SUB form `BP10`/`BP11` | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BS | `BS P1 nn;` | the read gives `?;` | - | Band selection, nn 00-14 (gnfrazier: 5=14 MHz, 6=18, 7=21, 8=24.5, 9=28, 10=50 MHz) | Write only. **Disagreement**: PR2EM, ITM, POK and RZO use it; the WebUI notes say the radio (and its mock) rejects it. PR2EM: the 11 m band has no code and it sends `FA027555000;` + `MD02;`. RZO uses `BS113` | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [rzochowski-cat-ftx1:cat-presets.json] |
| BU | `BU P1;` | - | - | Band up | No answer | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] |
| CF | `CF P1 0 0 rx tx 000;` (clarifier on/off); `CF P1 0 1 +/-nnnn;` (offset) | `CF P1 00;` / `CF P1 01;` (rigplane `CF000;`/`CF001;`) | `CF P1 0 P3 ...;` (11 characters) | P3 0 = CLAR setting, 1 = CLAR frequency; offset +/-0000-9999 Hz (the gnfrazier doc says +/-9995; ew1abz-memory +/-9990 in memories) | ew1abz-control uses the same two forms | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| CH | set | - | - | Memory channel up/down | Not implemented in rigplane; POK uses it | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [pokibon3-FTX1Controller:js/ftx1.js] |
| CN | `CN P1 P2 ppp;` | `CN P1 P2;` | `CN P1 P2 ppp;` | P2 0 = CTCSS (ppp 000-049, index into a table of 50 tones), 1 = DCS (000-103, 104 codes) | Index: 00=67.0 ... 12=100.0 ... 49=254.1 Hz (full table in fritzsche). MW ignores CN; set CN before AM. Rigplane only implements CTCSS | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| CO | `CO P1 P2 nnnn;` | `CO P1 P2;` | `CO P1 P2 nnnn;` | P2 0 = contour on/off, 1 = contour frequency, 2 = APF on/off, 3 = APF frequency | Rigplane uses `CO00/CO02/CO03`. EUG uses `CO02;`/`CO020000;`/`CO020001;` as the APF switch | [rigplane-rigplane-core:rigs/ftx1.toml] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| CS | `CS s;` | `CS;` | `CS s;` | CW spot | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| CT | `CT P1 P2;` | `CT P1;` | `CT P1 P2;` (the real radio answers P2 with one digit) | P2 0 OFF, 1 TONE (ENC on/DEC off), 2 TSQL (ENC+DEC), 3 DCS, 4 PR FREQ, 5 REV TONE | **Differs from codes 1 and 2 of P8 in MW/MR (swapped)**, see section 4 | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| DA | read/set | `DA;` | - | Contrast 00-20 and TFT/LED brightness 00-20. The set is combined (`DA00` + three 2-digit values), so read and merge first | Intentionally not public in rigplane. captobie lists it among the commands used | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| DN | set | - | - | MIC DOWN | The titles in the index and in the detail differ | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| DT | `DT0 yyyymmdd;` / `DT1 hhmmss;` | read | - | Date and time | Not implemented in rigplane. **ESCRIBE EN LA RADIO** (clock) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| EO | set | - | - | Encoder offset, 6 selectors (MAIN/SUB/both x main dial/FUNC, +/-, Hz/kHz/MHz) | Has a detail page but no index entry | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| EX | `EX P1P2P3 P4;` (menu address + value) | `EX P1P2P3;` | `EX P1P2P3 P4;` | 427 menu addresses; the width of P4 varies by item. Known: `EX010413` MOD SOURCE DATA, `EX010113` SSB, `EX010514/15` RTTY mark/shift, `EX010417` DATA PSK tone, `EX0202 05+n` CW memory type, `EX020203` CW weight, `EX060103` APRS AF MUTE, `EX030204` SCAN RESUME, `EX050201` MY POSITION latitude, `EX030604/05/06` CH-STEP per mode | **ESCRIBE EN LA RADIO** (menu). Errata verified on a radio: `EX020203` P4 is the offset from 2.5 in steps of 0.1 (00=2.5, 20=4.5); `EX040107` AUTO POWER OFF 2 digits, 00=OFF, 01-24 = 0.5-12 h; `EX010322` DCS CODE needs 3 digits 000-103; `EX030503` HF MAX POWER maximum 100 W whole (**REGION/LIMITES TX**); `EX030504` 50M MAX POWER 005-100 (suspected); the `EX05xx` block places MY POSITION at P2=02 and SD CARD, SOFT VERSION, **CALIBRACION** and RESET at P2=03-06; `EX050109` answers `?;`. Only suspected: inconsistencies between the P1/P3 ranges of the manual and Table 3 (OS, RPT SHIFT, SPEED UNIT, WIND UNIT, ANT2, RF-SQL VR, TUN-LIN, MOD SOURCE, MIC list, FM DIAL STEP, DTMF count). Writing EX directly can change the CAT rate, stop bit, timeout or TUN/LIN port (PR2EM's restore skips them). SEM matches the answer with the 8-character address. The action items of the catalogue (CALIBRACION, RESET) are never sent | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/menu.py] [Semyonic-ftx1-programmer:src/cat/transport.ts] [pokibon3-FTX1Controller:js/exmenu.js] |
| EX01 (audio) | `EX01` + category 01-05 + parameter 01-03 + signed 2-digit value | read | - | AF equalizer per mode: treble/mid/bass from -20 to +10 | A specific use of `EX`. **ESCRIBE EN LA RADIO** | [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| FA | `FA fffffffff;` | `FA;` | `FA fffffffff;` | MAIN frequency, 9 digits in Hz. ITM limits the set to 30 kHz-470 MHz; factory RX 30 kHz-174 MHz and 400-470 MHz | Used by gnfrazier, bg7nzl, ew1abz-*, PR2EM and WebUI. FB/f Sub is not reliable with MAIN on a 6 m channel (captobie). PR2EM reads `FA;` back after setting | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [captobie-ftx1-remote:CLAUDE.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| FB | `FB fffffffff;` | `FB;` | `FB fffffffff;` | SUB frequency, 9 digits | With split `ST1`, FB becomes the TX VFO, in MAIN's mode. In Look4Sat: FA = downlink (RX), FB = uplink (TX) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| FD | undocumented | - | unsolicited | The first parameter is the scope side | Unsolicited message that triggers `SS` queries (per a comment in RZO) | [rzochowski-cat-ftx1:serial-server.mjs] |
| FN | read/set | yes | `FN;`/`FN d;` | Fine tuning OFF/ON/Fast | Not implemented in rigplane. POK uses it as a FUNC assignment | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] [pokibon3-FTX1Controller:js/ftx1.js] |
| FR | `FR nn;` | `FR;` | `FR nn;` | 00 = dual receive, 01 = single receive (POK: `FR0v;`) | Receiver function state | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| FS | (FT-991A) | - | - | Only in POK's FT-991A profile | Not an FTX-1 command | [pokibon3-FTX1Controller:js/ft991a.js] |
| FT | `FT v;` | `FT;` | `FT v;` | Selects the MAIN/SUB transmitter (0/1) | Does not give permission to transmit. `SC<lado>1` moves VS/FT. In Look4Sat, choosing SUB does not activate PTT | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| GP | read/set | yes | - | Four 5 V CMOS outputs LOW/HIGH | Not public in rigplane. **ESCRIBE EN LA RADIO** (physical outputs) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| GT | `GT P1 P2;` | `GT P1;` | `GT P1 P3;` | Set P2: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO. Answer P3: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO-FAST, 5 AUTO-MID, 6 AUTO-SLOW | The set and the answer use different encodings (manual); answers 4/5/6 mean AUTO. `GT0` gets no answer in C4FM | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| ID | - | `ID;` | `ID0840;` | Fixed model ID 0840 | Validated by ew1abz-*, rigplane and RZO. POK cites `0800` as an old ID in a comment; its FT-991A profile uses `0570`/`0670` | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| IF | - | `IF;` | `IF` + channel(5) + frequency(9) + clar sign(1) + clar(4) + RX clar(1) + TX clar(1) + mode(1) + VFO/mem(1) + tone(1) + `00` + shift(1) + `;` (30 characters) | Composite MAIN state; same format as MR | The bench radio answered shift `3` (the manual's IF section does not document it; OS documents 3 = ARS). There is no PTT or split field | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| IS | `IS P1 0 +/-nnnn;` | `IS P1;` | `IS P1 0 +/-nnnn;` | IF shift +/-0000-1200 Hz in steps of 20 | Quirk: P2 must be `0`; Hamlib's `1` was rejected by the radio | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KM | `KM n texto;` | `KM n;` | - | Keyer memory 1-5, up to 50 characters | The radio adds `}` itself; more than 50 gives `?;`; `KM<n>;` is a read (a slot cannot be emptied). Characters A-Z 0-9 `/ ? , . = + - ( ) @ :`; prosigns `=` BT, `+` AR, `(` KN. SEM: the text cannot contain `}` or `;`. **ESCRIBE EN LA RADIO**. Index and detail with different titles | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| KP | `KP nn;` | `KP;` | `KP nn;` | CW tone index, 2 digits 00-75 = 300 + 10n Hz | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KR | read/set | yes | - | CW keyer OFF/ON (`KR0/1`) | gnfrazier has `set_cw_keyer` (string not located) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KS | `KS nnn;` | `KS;` | `KS nnn;` | CW speed in WPM, 3 digits, 4-60 | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KY | `KY P1 P2;` | - | - | P1 0 = CW TEXT memory, 1 = CW MESSAGE memory; P2 1-5 plays, 0 stops (`KY00` stops) | **Transmits** if BK-IN is on; a second KY restarts the message. There is no free-text KY form: typed CW is KM in slot 5 and then KY. EUG uses `KY ` + uppercase text + `;` | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |
| LK | `LK s;` | `LK;` | `LK s;` | Panel/dial lock OFF/ON | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [rzochowski-cat-ftx1:serial-server.mjs] |
| LM | read/set | yes | - | Voice message recording/loading, channel/state. `LM0;` selects the slot (arms recording); `LM1` records to the SD | Quirk: `LM1` records the RX audio to the radio's SD, it is not playback. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| MA | `MA;` | - | - | Memory (chosen with MC) to VFO MAIN | Set only. Loads only the frequency (fritzsche: not the tones) | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MB | `MB;` | - | - | Memory to VFO SUB | Loads a display buffer, not the real VFO-B SUB (ew1abz) | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| MC | `MC P1 ccccc;` | 2508-C: `MC P1;` (2507-B: `MC;`) | `MC P1 ccccc;` | P1 side; channel 00001-00999 (also P-nnL/U, 5 MHz, EMGCH) | Fritzsche calls MC "6 digits" (side + 5). The manual says 00001-00099 in MC and 00001-00999 in MR/MW/MZ; verified on a radio 1-999. An empty slot cannot be chosen (it keeps the previous one without warning). `MC0` before `VM011`. According to fritzsche it is set only (no answer) | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MD | `MD P1 m;` | `MD P1;` | `MD P1 m;` | Modes: 0 = WFM (ew1abz) / "LSB or FM" (fritzsche), 1 LSB, 2 USB, 3 CW-U, 4 FM, 5 AM, 6 RTTY-L, 7 CW-L, 8 DATA-L, 9 RTTY-U, A DATA-FM, B FM-N, C DATA-U, D AM-N, E PSK, F DATA-FM-N, H C4FM-DN, I C4FM-VW | **Disagreement on `0`**: ew1abz says WFM and fritzsche "LSB (or FM on some models)". Fritzsche's list omits E and I; bg7nzl and ew1abz include them. In C4FM `MD` answers `H`; the manual also lists `I`. ITM reads code `0` as an AMS sentinel, not as a failure (no CAT command to choose AMS). The radio rejects it during TX (rigplane bench) | [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| MG | `MG nnn;` | `MG;` | `MG nnn;` | Microphone gain, 3 digits (ITM 0-100) | | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| ML | `ML P1 ...;` | `ML P1;` | - | Monitor: state (P1=0) / level 000-100 (P1=1; WebUI `ML0nnn`) | **Conflict**: the manual documents it; rigplane's live radio answers `?;` and says it is controlled through the EX menu | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| MR | - | `MR ccccc;` | `MR` + ccccc + freq(9) + clar sign(1) + clar(4) + RX clar + TX clar + mode + type + tone + `00` + shift + `;` (27 parameter bytes, 30 characters) | Reads a channel without selecting it | See section 4. An empty channel gives `?;`. `MR00000` in Memory mode returns the active channel, not the VFO | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| MS | read/set | yes | - | MAIN/SUB meter selector 0-5 (`MS<main><sub>;`) | Panel meter selection; rigplane saw `MS35;` selecting VDD. Not public | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| MT | `MT ccccc tag12;` | `MT ccccc;` | `MT ccccc tag12;` (17 parameter characters) | 12-character name padded with spaces; ASCII 0x20-0x7D without `;` | **ESCRIBE EN LA RADIO**. An empty channel gives `?;` | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| MW | `MW` + 27-character record (see MR) + `;` | none (set only) | - | Creates or overwrites a channel | **ESCRIBE EN LA RADIO**. P9 (`00`) must be `00` or it gives `?;`. Does NOT save the tone (it goes back to code 12 / 100.0 Hz). Position 17 must be `+`/`-` (`S` is not valid; fritzsche). The manual's detail table omits the read/answer | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MX | `MX P1;` | `MX;` | `MX0;`/`MX1;` | MOX OFF/ON | TX action; bg7nzl uses it. Rigplane protects it with managed TX authority | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MZ | `MZ ccccc s fffffffff;` | `MZ ccccc;` | `MZ ccccc s fffffffff;` (15 characters) | s 0 = split off, 1 = on; TX frequency in 9 digits Hz | **ESCRIBE EN LA RADIO**. Split memory record; it is written after AM | [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| NA | `NA P1 s;` | `NA P1;` | `NA P1 s;` | Narrow OFF/ON (captobie: P1 0 = MAIN, 1 = SUB) | `SH` does not change with NAR in SSB/CW/RTTY/DATA (the real width is the preset of the NAR WIDTH menu) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| NL | `NL P1 nnn;` | `NL P1;` | `NL P1 nnn;` | Noise blanker level OFF/001-010 (written with 3 digits; PR2EM and WebUI `NL0nnn;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| OI | - | `OI;` | same format as IF | Composite SUB state (opposite band) | ew1abz-control uses it for the SUB frequency | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| OS | `OS P1 d;` | `OS P1;` | `OS P1 d;` | d 0 Simplex, 1 Plus, 2 Minus, 3 ARS | **FM mode only** (silently ignored in others). Erratum: the order on the OS page and that of Table 3 differ (Table 3: 0 -, 1 simplex, 2 +, 3 ARS); the app follows the OS page. Direction only; the offset is an EX menu value | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| PA | `PA P1 P2;` | `PA P1;` | `PA P1 P2;` | P1 0 = HF/50 MHz, 1 = VHF, 2 = UHF. HF/50: 0 IPO, 1 AMP1, 2 AMP2. VHF/UHF: 0 OFF, 1 ON | Per band group, not per channel | [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| PB | read/set | yes | - | Voice message playback/stop (`PB0<ranura>;`, `PB00;` stops; ITM slots 0-5) | **Transmits** if played with TX active | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PC | `PC P1 nnn;` | `PC;` | `PC P1 nnn;` | P1 1 = field head (manual 005-010 W), 2 = SPA-1 (005-100 W) | **REGION/LIMITES TX**. **Disagreement**: bg7nzl (bench): the head accepts 001-010 W; rigplane: `PC2000;` gives `?;`, minimum 5 W with SPA-1. gnfrazier: 5-10 W in the field, 5-100 W with SPA-1, with a TODO about tenths of a watt; WebUI accepts fractions (`PC10.5;`) and probes whether >6 W is rejected to infer battery. ITM discovers the active head from the answer. Erratum: the HF MAX POWER limit belongs to `EX`, 100 W whole | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:README.md] [gnfrazier-ftxcat:ftxcontrol.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| PL | `PL nnn;` | `PL;` | `PL nnn;` | Speech processor level 0-100 (real trace `PL003;`) | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PR | `PR P1 s;` | `PR P1;` | `PR P1 s;` | P1 0 = speech processor, 1 = parametric mic equalizer; s OFF/ON | **Erratum (verified on a radio)**: the manual says 1 = OFF, 2 = ON; the radio uses 0 = OFF, 1 = ON (ITM: the read accepts `0` or `2` as off) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] |
| PS | `PS s;` | `PS;` | `PS s;` | Power on/off | `PS0;` turns the radio off. EUG sends it when leaving the app; SEM requires it to be "armed". **ESCRIBE EN LA RADIO** (state) | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/MainActivity.java] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| QI | `QI;` | - | - | Saves QMB | Set only. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| QR | `QR;` | - | - | Recalls QMB | Set only. ITM has a guard against races in the recall | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/RadioController.Vfo.cs] |
| QS | `QS;` | - | - | Quick split | POK only | [pokibon3-FTX1Controller:js/ftx1.js] |
| RA | `RA P1 s;` | `RA P1;` | `RA P1 s;` | RF attenuator (12 dB according to WebUI) | Rejected (`?;`) with MAIN at 461.550 MHz in a bench test | [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| RC | `RC;` | - | - | Rigplane's `reset_clarifier` | **Not documented in 2508-C** (profile provenance only) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| RG | `RG P1 nnn;` | `RG P1;` | `RG P1 nnn;` | RF gain 000-255 | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| RI | - | `RI P1;` | radio state of 8 fields | `RI0` (P7 scan state, P8 squelch); `RI1` answers `?;`. PR2EM: 7 characters (HI-SWR[0], rec[1], TX[2], tuning[4], scan[5], busy[6]) | The tuner-sweep uses it to detect the tuner (digit 6) | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| RL | `RL P1 nn;` | `RL P1;` | `RL P1 nn;` | DNR level OFF/01-10 (EUG: `RL000;` form) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| RM | - | `RM P1;` | `RM P1 nnn 000;` (rigplane: `RM{tipo}{main:03d}{sub:03d}`) | Meters P1 1..8: 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD; value 000-255 | Raw, uncalibrated. bg7nzl (only in the PC software; nothing is written to the radio, host-side **CALIBRACION**): VDD ~ raw*13.8/203, IDD raw*3/255, COMP raw*30/255 dB, ALC raw*200/252 %, SWR 1+0.333(e^(0.0151 raw)-1), PO piecewise linear up to 15 W. Rigplane: raw 210 ~ 13.8 V (bench). The index says RM Set=X but the detail shows a `P1=0` row. RZO notes layouts of one or two values. EUG reads `RM8;` every 5 s to infer a 6 W or 10 W head | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| SC | `SC P1 m;` | `SC;` returns the last command (e.g. `SC11;`) | - | Scan: m 0 OFF, 1 UP, 2 DOWN | `SC0;`/`SC1;` as a read gives `?;`. Any stop halts both scans. `SC<lado>1` moves VS/FT to that side | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SD | `SD nnnn;` | `SD;` | `SD nnnn;` | Break-in delay (ms); 2-digit index: 0-5 = 30/50/100/150/200/250 ms and then steps of 100 ms (6-33 up to 3000 ms) | `VD` uses the same 00-33 table | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| SF | read/set | yes | - | FUNC knob assignment (`SF0<perilla>;`) | Front panel only; RZO and POK use it | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| SH | `SH P1 0 nn;` (gnfrazier) / `SH P1 nnn;` (rigplane) | `SH P1;` | `SH P1 nnn;` | Filter width code | **Disagreement** in the set string: gnfrazier `SH{lado}0{codigo:02d}`; rigplane `SH{rx}{codigo:03d}` (same digits). WebUI `SH00nn;` reads 2 characters at offsets 2-3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| SM | - | `SM P1;` | `SM P1 nnn;` | S meter (0-255) | The SUB query always returns side 0 (`SM1;` with no useful answer; RZO uses the VFO digit of the queued command) | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| SQ | `SQ P1 nnn;` | `SQ P1;` | `SQ P1 nnn;` | Squelch | **Disagreement**: WebUI says 000-100; ITM and SEM 0-255 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SS | read/set | yes | - | Scope settings, 7 selectors (speed/peak/marker/colour/level/span/mode). `SS04+/-dd.d;` D-LEVEL; `SS01` D-PEAK (digit +1); `SS02` marker; `SS03` colour (hex digit +1, colours 1-11 = `0-9,A`) | RZO queries `SS04 SS05 SS00 SS03 SS06` at start. PR2EM-A: slider -60..60 in half steps. Not implemented in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] [rzochowski-cat-ftx1:serial-server.mjs] |
| ST | `ST s;` | `ST;` | `ST s;` | Split OFF/ON | `ST1` turns off the dual display (`FR01`). WebUI notes that `ST` is in its mock's rejection list and does not use it; Look4Sat sends `ST1;`/`ST0;` without parsing an answer | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] [git-jcw-FTX-1-WebUI:js/cat/mock-radio.js] |
| SV | `SV;` | - | - | Swaps MAIN/SUB | Set only. Not valid in VFO/Memory mode. In captobie it only moves the audio map in dual receive | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| TS | read/set | yes | - | TXW (TX watch) OFF/ON | Held back: only effective with Split on, but the radio echoes with Split off. Protected by managed TX in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| TX | `TX0;`/`TX1;` | `TX;` | `TX0` RX, `TX1` TX by CAT, `TX2` TX by the radio (panel/mic/VOX) | PTT | gnfrazier reads `TX2` as "transmitting". The set only accepts 0/1 (captobie). Hamlib `t` gives 3 for TX2 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] |
| UP | set | - | - | MIC UP | | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VD | read/set | yes | - | VOX delay, table 00-33, steps of 100 ms (per MIC/USB/BLUETOOTH) | Not public in rigplane | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VE | - | `VE P1;` | version in BCD | P1 0 MAIN, 1 DISPLAY, 2 SDR, 3 DSP, 4 SPA-1, 5 FC-80 | **FIRMWARE**: read only; nothing is written. CPUs that are not available are skipped or answer empty | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| VG | read/set | yes | - | VOX gain 000-100 | Not public in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VM | `VM P1 pp;` | `VM P1;` | `VM P1 pp;` | pp 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 5 MHz band, 91 EMG. fritzsche: `VM000;` VFO; `VM;` memory | **Disagreement**: fritzsche documents `VM;` as "switch to memory"; ew1abz uses `VM011;`. `VM011` fails silently unless `MC0` is written right before. The manual lists `VM` twice (the first detail entry copies AM) | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [fritzsche-yaesu-ftx1:cat_format.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| VS | `VS v;` | `VS;` | `VS v;` | Selects the MAIN/SUB TX/RX pair | Look4Sat uses it with `FT1;` to choose SUB as TX | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| VX | `VX s;` | `VX;` | `VX s;` | VOX OFF/ON | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| ZI | set | - | - | Automatic CW zero-in per side (`ZI0;`) | Not implemented in rigplane | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |

Other CAT facts:

- There is no CAT command for D-COLOR, DG-ID TX/RX, HRI MODE, recalling or
  reading HOME channels, MAG, or the WIRES-X settings
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- There is no documented command to erase a memory channel
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]. Power
  per channel cannot be programmed through CAT
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].
- There is no MAIN/SUB tracking command in 2508-C
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].
- Unreconciled **disagreement**: rigplane's profile uses the Hamlib model id
  2028 [rigplane-rigplane-core:rigs/ftx1.toml]; captobie uses 1051, first in
  Hamlib 4.7 [captobie-ftx1-remote:CLAUDE.md].
- Only suspected errata (not verified): the typographical errors "mesc",
  "SYNBOL", "Bycycle" and "LONGTUDE"; the location of the USB connector is
  inconsistent; the CAT manual does not mention USB audio
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Hidden or special undocumented commands (SPR/SPW and others) are left out of
  this table on purpose; see section 5.

## USB, serial and audio interfaces

**Ports (dual CP210x UART)**

- The USB-C connector exposes an internal hub: a Silicon Labs CP2105 dual UART
  (VID 10C4 PID EA70; the second serial function shows up as 26AA:0030) and a
  USB audio codec (VID 0D8C PID 0016)
  [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md].
- Enhanced COM Port = CAT-1 (CAT commands). Standard COM Port = CAT-2 (PTT, CW,
  DATA or secondary CAT)
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Driver: Silicon Labs Dual CP210x USB to UART Bridge; Windows shows
  "Enhanced COM Port (COMx)" and "Standard COM Port (COMy)". Linux
  `/dev/ttyUSB0`/`ttyUSB1`; macOS `/dev/tty.SLAB_USBtoUART`; on a Pi, by id,
  `...CP2105...-if00-port0` is CAT and interface 1 is the keying port
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [captobie-ftx1-remote:Pi/README.md].
- bg7nzl picks only the "Enhanced COM Port" for CAT and the "Standard COM Port"
  for PTT (default ports in code COM11/COM12)
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] [bg7nzl-ftx1ctl:ftx1cat.py].
- CAT-3 is the rear TUNER/LINEAR UART; it is not needed for USB and it is best
  to leave `TUN/LIN PORT SELECT` at its default
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md].
- WSL2: `usbipd bind/attach` of the CP2105 (10c4:ea70) leaves it unusable in
  Windows [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. On Linux
  the user has to be added to the `dialout` group [gnfrazier-ftxcat:faq.md].
- An undervolted Pi drops the radio's USB hub. `cp210x ttyUSB...: failed set request` stops CW keying
  [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md].
- The audio services fail with "Device or resource busy" if another client
  holds the sound card [captobie-ftx1-remote:Pi/README.md].

**Speed and frame format**

- CAT-1 RATE options: 4800, 9600, 19200, 38400, 115200; factory 38400;
  each PRESET (5) has its own CAT-1 RATE
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Default 38400 8N1 in gnfrazier, bg7nzl, ew1abz-control,
  ew1abz-memory-manipulator, rigplane, PR2EM, ITM, WebUI, SEM, Look4Sat and most
  Android apps; EUG uses 4800 8N1 on the DATA port
  [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/config.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:README.md].
- **Disagreement**: captobie's Pi setup puts CAT-1 at **115200**
  (`rigctld -s 115200`) [captobie-ftx1-remote:Pi/README.md]; RZO also
  recommends 115200 [rzochowski-cat-ftx1:README.md]; the rest, 38400. POK probes
  38400, 4800, 9600, 19200 and 115200 [pokibon3-FTX1Controller:js/serial.js].
- Menu items (OPERATION SETTING, GENERAL): `CAT-1 RATE`, `CAT-1 TIME OUT TIMER` (e.g. 100 ms), `CAT-1 CAT-3 STOP BIT` = 1 bit, `CAT-2 RATE`, `CAT-2 TIME OUT TIMER`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Changing them by hand
  is **ESCRIBE EN LA RADIO**; no tool writes them.
- PTT protection by RTS/DTR on CAT-2 (set to OFF if CAT-2 is used as CAT
  with flow control): `RADIO SETTING, MODE SSB/AM/FM/DATA/RTTY RPTT SELECT`,
  `CW SETTING, MODE CW RPTT SELECT`, `CW SETTING, PC KEYING`,
  `PRESET, PRESET1-5 RPTT SELECT`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Opening the keying
  port briefly raises DTR/RTS
  [captobie-ftx1-remote:Pi/README.md].
- DTR/RTS depending on each app (**the apps do not agree**): PR2EM clears them
  before opening (they could trigger PTT with RPTT); WebUI lowers them (the
  Standard COM lines can transmit); Look4Sat forces them to false; BYF sets
  them; POK on FT-991A sets RTS on and DTR off
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/app.py]
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt]
  [pokibon3-FTX1Controller:js/ft991a.js].

**PTT methods (informational; this project does not transmit)**

- CAT `TX1;`/`TX0;` [gnfrazier-ftxcat:ftxcontrol.py]; MOX `MX1;`/`MX0;`
  [bg7nzl-ftx1ctl:ftx1cat.py]; RTS on CAT-2 [bg7nzl-ftx1ctl:ftx1cat.py]
  [bg7nzl-ftx1ctl:docs/user_manual_en.md]; RTS/DTR on CAT-2 for CW
  [captobie-ftx1-remote:docs/cw-protocol.md].
- captobie's CW relay: TCP 8534 with JSON, default RTS line,
  `playoutDelayMs` 300 (20-1000), `heartbeatTimeoutMs` 1000, `maxKeyDownMs`
  5000; it uses only CAT-2, never rigctld's CAT port
  [captobie-ftx1-remote:docs/cw-protocol.md] [captobie-ftx1-remote:CLAUDE.md].

**USB audio**

- Codec 0D8C:0016 under the internal hub [rigplane-rigplane-core:rigs/ftx1.toml].
- Channel **disagreement**: rigplane's profile says RX audio is only on the LEFT
  channel (the right one is background noise; `rx_audio_channel = "left"`) [rigplane-rigplane-core:rigs/ftx1.toml]; captobie says stereo with
  Main on the left and Sub on the right in dual receive, tied to the physical
  receiver even if it is swapped on the panel, and that `SV` moves them only in
  dual receive [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- Sample rate: captobie's ALSA dsnoop/dmix at 2 channels, 48000 Hz,
  S16_LE ("initial estimate", unconfirmed)
  [captobie-ftx1-remote:Pi/asound-ftx1.conf]; CLAUDE.md also cites stereo
  capture at 44.1 kHz and 48 kHz in the Windows data
  [captobie-ftx1-remote:CLAUDE.md]. Rigplane's `YaesuCatBackendConfig` supports
  `audio_sample_rate`, `rx_device` and `tx_device`
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- To send TX audio from the PC, MOD SOURCE = USB is needed (`RADIO SETTING, MODE SSB/AM/FM/DATA, MOD SOURCE`: MIC, USB, Bluetooth, AUTO; in
  PRESET: MIC, USB, REAR, AUTO). **Disagreement/erratum**: the value 2 is REAR in
  the preset and Bluetooth per mode. Also `USB MOD GAIN` (watch the ALC)
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md]
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:Pi/README.md].
- Rigplane does not use the hardware scope for the FTX-1; the panadapter comes
  from the RX audio [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].

**Timing and latency**

- Hamlib's `post_write_delay` = 50 ms; captobie uses 10 (27 thousand clean
  answers on Mac, 17 thousand on Pi; 0 or 5 sometimes gave out-of-step answers).
  The radio answers in ~5 ms; one read ~14 ms with a delay of 10. `rigctld -m 1051 -r <puerto> -s 115200 -t 4532 -o -C post_write_delay=10` (`-o` is needed for VFO
  arguments) [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- fritzsche: minimum 50 ms between commands; MW does not answer, wait afterwards
  [fritzsche-yaesu-ftx1:cat_format.md]. gnfrazier: 0.1 s after opening, 0.05 s
  after writing, read with a 1.0 s timeout [gnfrazier-ftxcat:ftxcontrol.py].
  bg7nzl: 2 ms after writing, `read_until(;)`, 1.0 s timeout, meters at ~1 Hz
  [bg7nzl-ftx1ctl:ftx1cat.py] [bg7nzl-ftx1ctl:docs/user_manual_en.md].
  ew1abz: read timeout 200 ms and TUI polling every 500 ms
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/app.rs].
- Rigplane: live polling levels (frequency/mode) 1.0 s and a slow level with a
  TTL of 120 s; an external CAT client pauses polling
  [rigplane-rigplane-core:rigs/ftx1.toml].
- Other apps: PR2EM 0.8 s answer timeout and 20 ms between writes;
  ITM half-duplex FIFO with a 1.2 s timeout and 40 ms pacing; WebUI a single
  command in flight, read 350 ms, sets wait 12 ms for `?;` (150 ms on the
  tuner); RZO 1.5 s (2 s for ID) and 40 ms between initial queries; POK
  fast polling 200 ms, slow 1500 ms, levels 6000 ms; SEM 1 s timeout
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py]
  [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs]
  [git-jcw-FTX-1-WebUI:js/cat/cat-link.js]
  [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts].
- A memory scan runs at ~9-10 channels/s
  [captobie-ftx1-remote:CLAUDE.md]. During TX, mode and split are rejected with
  `?;` and the frequency is accepted [rigplane-rigplane-core:rigs/ftx1.toml].

**Auto information (AI)**

- `AI0;`/`AI1;` exists [gnfrazier-ftxcat:ftxcontrol.py]
  [rigplane-rigplane-core:rigs/ftx1.toml]. No repository describes the
  unsolicited format. SEM, WebUI and this project turn AI off on connection and
  poll; RZO tries `AI1;` and goes back to polling if there is no ack
  [Semyonic-ftx1-programmer:src/cat/commands.ts]
  [git-jcw-FTX-1-WebUI:js/radio.js] [rzochowski-cat-ftx1:serial-server.mjs].

**Other facts**

- Rigplane: `has_lan=false`, 2 receivers, maximum power 100 W and minimum 5 W,
  single VFO scheme `ab_shared`
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Backup tip: save memory and settings to the SD card before running
  scripts; the radio is "temperamental" and a full reset may be needed
  [gnfrazier-ftxcat:README.md].
- The Optima/SPA-1 meter scaling in bg7nzl is inexact
  [bg7nzl-ftx1ctl:docs/user_manual_en.md].
- Android: PR2EM-A and Look4Sat enumerate all ports and ask for permission at
  runtime; BYF filters by 10C4:EA70 in `usb_device_filter.xml`; EUG uses the
  first driver and port for CAT and leaves the DATA port reader off
  because concurrent managers broke CAT reliability
  [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/res/xml/usb_device_filter.xml]
  [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Web Serial: WebUI and SEM filter by VID 0x10C4; POK asks for the port without a
  filter
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts]
  [pokibon3-FTX1Controller:js/serial.js].

## Memory format and how they are read and written

**Identifiers and channel ranges**
[ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs]

- 00001-00999 memory channels; `P-01L`...`P-50U` PMS; 50001-50020 5
  MHz band; `EMGCH` emergency. Identifiers are 5 characters in
  MR/MW/MT/MZ.
- Channel type (position 25 of MR/MW): 0 VFO, 1 Memory Channel, 2 Memory Tune,
  3 QMB, 4 reserved, 5 PMS. fritzsche's MW table matches; its MR text
  only lists 0/1/2 [fritzsche-yaesu-ftx1:cat_format.md].
- `VM` codes: 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 5
  MHz band, 91 EMG
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Range conflict: MC 00001-00099 versus MR/MW/MZ 00001-00999
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md]; rigplane's profile only
  lists channels 1-99 [rigplane-rigplane-core:rigs/ftx1.toml]; the gaps CSV
  speaks of up to 09999 for MC
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv];
  gnfrazier comments "MC P2 = 00001-00099"
  [gnfrazier-ftxcat:ftxcontrol.py]. captobie saw 277-278 channels on its radio
  [captobie-ftx1-remote:CLAUDE.md]. HOME channels cannot be read or
  recalled through CAT.

**MR/MW record (27 parameter characters after `MR`/`MW`; 30 with `;`)**
[fritzsche-yaesu-ftx1:cat_format.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

| Position (from 1) | Field |
|---|---|
| 1-2 | `MR`/`MW` |
| 3-7 | channel (5) |
| 8-16 | frequency in Hz (9) |
| 17 | clarifier sign `+`/`-` (MR may show `S`; in MW it must be `+`/`-`) |
| 18-21 | clarifier offset in Hz (4); ew1abz: -9990..+9990 |
| 22 | RX clarifier 0/1 |
| 23 | TX clarifier 0/1 |
| 24 | mode (MD codes) |
| 25 | channel type (above) |
| 26 | SQL type: 0 OFF, 1 CTCSS ENC/DEC, 2 CTCSS ENC, 3 DCS, 4 PR FREQ, 5 REV TONE |
| 27-28 | fixed `00` (ew1abz: "unmapped", could encode ARS/split/M-GRP) |
| 29 | shift 0 simplex, 1 plus, 2 minus (MW also `3` ARS per ew1abz `to_mw_char`) |
| 30 | `;` |

- Example `MR00008145675000+000000412002;`
  [fritzsche-yaesu-ftx1:cat_format.md]. ew1abz-control test answer
  `IF00000014074000-050010200000;`
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs].
- **Disagreement/erratum**: the MR note in fritzsche's MA section says "tone
  mode at position 18" (erratum; the MR table says 26)
  [fritzsche-yaesu-ftx1:cat_format.md].
- Swap of SQL codes versus CT: in MW/MR 1 = ENC/DEC and 2 = ENC; in CT
  1 = ENC (TONE) and 2 = ENC/DEC (TSQL); `CmdCt::set` swaps them
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]
  [fritzsche-yaesu-ftx1:cat_format.md].
- ARS: it is saved with `OS` P2=3; MR does not carry the ARS mark, so reads
  return the resolved direction (plus/minus)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].

**Supported and unsupported fields**
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

- Supported: channel number, RX frequency, shift direction, mode
  (17), clarifier, SQL type, CTCSS tone (CN, 50 tones), DCS (104 codes),
  name (12 ASCII), ARS and split TX frequency (MZ).
- Unsupported: shift frequency (EX menu per band: 28 MHz 0-1000
  kHz in steps of 10 kHz, 50 MHz 0-4000 kHz in steps of 10 kHz, 144 and 430 MHz
  0-100 MHz in steps of 50 kHz), M-GRP, IPO/preamp, DNF, DNR, narrow, attenuator,
  NB level, AGC (all global per side or band, not per channel); voice compressor
  and EQ are not per channel either
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].

**ew1abz-yaesu-ftx-1-memory-manipulator tool (`ftx1-mm`)**

- CSV columns: Channel Number, Frequency (Hz), Memory Tag, Mode, Channel Type,
  Squelch Type, Shift (Hz), Clarifier Offset (Hz), Rx Clarifier Enabled, Tx
  Clarifier Enabled, CTCSS Tone, DCS Tone; optional `Split TX (Hz)`
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- SQL names in the CSV: `CtcssOff`, `CtcssEnc` (the radio's TONE),
  `CtcssEncDec` (TSQ), `Dcs`; shifts `Simplex`, `PlusShift`,
  `MinusShift`, `Ars`; channel type `MemoryChannel`, etc.; clarifier flags
  `RxClarifierOff/On`.
- Read: `MR` + `MT` (+ `CN`, `MZ`) loop per channel to CSV. Write: CSV to
  `MW`/`MT` per channel (**ESCRIBE EN LA RADIO**)
  [ew1abz-yaesu-ftx-1-memory-manipulator:CLAUDE.md].
- Write sequence per channel (13 steps): `MW` (creates the slot), `VM` P2=11,
  `MC`, `VM` P2=00, `MD` FM, `OS` shift, `MD` real mode, `FA`, `CT`, `CN` CTCSS,
  `CN` DCS, `AM` (commits), `MT` name (`MZ` after `AM` if there is split)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- It is additive: it only touches the channels in the CSV and does not erase.
  Validated with a round trip of 16 channels read, write and read byte for byte
  identical
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Options: `--read-radio`, `--write-radio`, `--check-data`, `--print`,
  `--port` (default `/dev/ttyUSB0`), `--speed` (38400), `--file`,
  `--allow-any-frequency`
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- **REGION/LIMITES TX** (soft): validation of 30 kHz-174 MHz and 400-470 MHz;
  `--allow-any-frequency` skips it (modified MARS-CAP, SATCOM radios,
  174-400 MHz gap)
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs].
- Non-contiguous channels are allowed; `#` lines are comments; the
  spreadsheet strips leading zeros and `.0` (the tool pads to 5 and
  matches the tone by value)
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- CHIRP conversion (`chirp_ft897_to_ftx1.py`): FM to FM, NFM to FM-N, AM, LSB, USB,
  CW to CW-U, DIG to DATA-U, PKT to DATA-FM; duplex ""/+/- to
  Simplex/PlusShift/MinusShift; Tone ""/Tone/TSQL/DTCS to
  CtcssOff/CtcssEnc/CtcssEncDec/Dcs; name truncated to 12. Skipped with a reason
  on stderr: DV (D-STAR), WFM, cross tone, TSQL-R/DTCS-R, split duplex,
  invalid frequency or location
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]. Renumbering:
  `renumber_channels.py`
  [ew1abz-yaesu-ftx-1-memory-manipulator:renumber_channels.py].

**fritzsche-yaesu-ftx1 tool (memory programmer)**

- Upload strategies (**ESCRIBE EN LA RADIO**): (1) analog without tone:
  `VM000;`, `FA...;`, `MW...;`; (2) analog with tone/DCS: `MW`, `CT0x`, `CN...`,
  `MC0nnnnn`, `AM;` (the doc's order) versus CLAUDE.md's order `MW`,
  `MC0nnnnn`, `VM000`, `MA`, `CT`, `CN`, `AM` (**the order differs between**
  [fritzsche-yaesu-ftx1:cat_format.md] and [fritzsche-yaesu-ftx1:CLAUDE.md]); (3)
  digital C4FM/DN: `MD0H;` and then `MW` directly.
- "Callsign-City" label of up to 12 characters; umlauts are converted to ASCII
  with `CharConverter.js` [fritzsche-yaesu-ftx1:CLAUDE.md]. MC of 6 digits
  (`MC000011`), MR of 5 [fritzsche-yaesu-ftx1:CLAUDE.md].
- **REGION/LIMITES TX** (soft): validation skips frequencies outside HF
  0.1-174, VHF 174-350, air 350-400 and UHF 400-524 MHz
  [fritzsche-yaesu-ftx1:CLAUDE.md]. **Disagreement** with ew1abz's factory
  coverage (30 kHz-174 and 400-470 MHz).
- CSV formats: CHIRP (`--chirp-csv`) with `Location,Name,Frequency,Duplex,Offset, Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment`; and
  the relais.dl3el.de one (`--csv`) separated by `;` with a German decimal comma,
  no Location field (`--start-mem` numbers them); DMR, D-Star and Tetra are
  excluded. There is an inconsistency in the doc between `--start-mem` and
  `--mem-start`
  [fritzsche-yaesu-ftx1:csv_formats.md].
- Download/verification: `node js/download.js [--verify]` exports to CHIRP;
  verifying compares MR with the `MC` + `FA` re-read
  [fritzsche-yaesu-ftx1:CLAUDE.md]. `MA` loads only the frequency; `AM`/`BM`
  save the real VFO state. Upload does not support erasing
  [fritzsche-yaesu-ftx1:csv_formats.md].

**Other tools**

- captobie: lists with `MR` and `MT`, an empty channel answers `?;` and it stops
  after 100 consecutive empty ones; `VM011` fails unless `MC0` comes right
  before. It writes keyer memory (`KM`), the CW memory type menu and deep
  settings through `EX` (**ESCRIBE EN LA RADIO**); the action items of the
  catalogue (including CALIBRACION/RESET) are never sent
  [captobie-ftx1-remote:CLAUDE.md].
- gnfrazier: VFO/memory with `VM P1;`, `MC`, `MA`, `MB`; no CSV or bulk
  [gnfrazier-ftxcat:ftxcontrol.py].
- ew1abz-control: local frequency memories in TOML (`[[freq_memory]]`),
  not the radio's [ew1abz-yaesu-ftx-1-control:README.md].
- rigplane: read-only memory list (`MR` + `MT`, channels 1-99); the write
  families are planned
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv].
- PR2EM and SEM: memory editors with CSV (SEM also imports ADMS-14 and FT5D
  `.dat`); PR2EM reads back to confirm after `MW`; SEM limits managed channels
  to 1-99 and reading to 1-999 (**ESCRIBE EN LA RADIO**)
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py]
  [Semyonic-ftx1-programmer:src/cat/codec.ts]
  [Semyonic-ftx1-programmer:src/io/adms14-csv.ts]
  [Semyonic-ftx1-programmer:src/io/ft5d-dat.ts].

## Region tool and TX ranges

Summary only. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** **CALIBRACION**.
This project does not use it, does not automate it and does not reproduce it. For
details go to the original repository
(`https://github.com/Evgeny161rus/ftx1-region-tool`, copy in
`third_party/ftx1/Evgeny161rus-ftx1-region-tool`).

**What it is.** A command-line tool in Python that uses undocumented service
commands, present in the MAIN firmware but absent from the CAT manual, to read and
write individual bytes of the radio's EEPROM. The bytes it modifies are next to
the factory calibration table
[Evgeny161rus-ftx1-region-tool:README.md]
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. It only touches the EEPROM
through those service commands (`SPR` read, `SPW` write); it does not use menus
or normal commands.

**What it changes, in concept.** The radio's destination or region code. The
table of bands on which the firmware allows transmitting depends on that code.
Changing it widens or narrows the TX ranges; the tool documents different tables
per region (narrow for amateur bands, wider, or almost continuous). The tool
itself warns that a very wide region can offer ranges where the RF path is not
designed to work
[Evgeny161rus-ftx1-region-tool:README.md]. It is made for one specific version of
the MAIN firmware (V01.13); on other versions you must dump first because the
addresses and codes may differ.

**The tool's safeguards.** A prior EEPROM dump with checksums; an automatic
backup before writing (it aborts if it cannot be read); rejection of an unknown
current code unless forced; a simulation mode; explicit confirmation; read-back
with retries after writing; the radio must be fully powered off and on
afterwards
[Evgeny161rus-ftx1-region-tool:README.md]. A generic write command
can reach any byte, including the calibration
[Evgeny161rus-ftx1-region-tool:README.md]. Old versions had a
read bug that produced corrupt dumps and backups.

**Risks.**

- Loss of calibration: service EEPROM is written next to it; the full prior
  dump is the only safety net.
- Legal and type approval: transmitting outside what the licence or the type
  approval allows is the user's responsibility; changing the region may
  breach them [Evgeny161rus-ftx1-region-tool:README.md].
- Warranty: the change may void the warranty
  [Evgeny161rus-ftx1-region-tool:README.md].
- The author offers it "as is" and disclaims liability for damage, data loss
  or malfunction [Evgeny161rus-ftx1-region-tool:README.md].
- If the firmware restores the code at boot, the repository says that an
  external programmer and editing a dump would be needed
  [Evgeny161rus-ftx1-region-tool:README.md].

**How to revert, in concept.** Put the original region code back
(saved in the prior dump) with the same tool, and restart the radio.
If the calibration was damaged, restore from the full dump or turn to
a Yaesu technical service.

**In this project.** `SPR`/`SPW`, region or TX limit changes and any
calibration write are excluded on purpose.

## Firmware (Reid-n0rc)

Summary only. **FIRMWARE**. This project does not load, patch or prepare
firmware.

Facts from the `Reid-n0rc-FTX-1_Firmware` repository
[Reid-n0rc-FTX-1_Firmware:README.md] [Reid-n0rc-FTX-1_Firmware:AGENTS.md]:

- Status: "just started, nothing decoded". `decomp/` only contains
  `.gitkeep`; tasks T01-T11 are in `todo` and their findings sections
  are empty [Reid-n0rc-FTX-1_Firmware:decomp/.gitkeep]
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md].
- The microcontroller is not identified (the T03 hardware survey is
  pending). The FT-710 chips appear only as comparison hypotheses
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T03-hardware-survey.md].
- Images (unverified, a retailer's blog from March 2026): DISPLAY
  V01-09, MAIN V01-12, DSP V01-07, SDR V01-06; possibly a separate image for the
  field head and the amplifier body (Optima)
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T02-sources.md]
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md]. Other sources cite MAIN 01-13 and
  DISPLAY 01-10 as the latest
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Container: unknown in this repository; FT-710-like hypothesis (`.SFL`
  with an ASCII header, a size tag and CRC, and an encoded payload). Another
  repository (sq9pd) confirms in practice a format of that kind
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Update procedure: not documented in this repository (T06
  pending); on the FT-710 the DISPLAY CPU reads the SD card, unchecked on
  the FTX-1 [Reid-n0rc-FTX-1_Firmware:docs/tasks/T06-update-path.md]. In short,
  Yaesu's official update is the only supported path; official firmware files
  and third-party ones are loaded following Yaesu's process
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Tools: headless Ghidra 12.1.4 and scripts for names and
  export [Reid-n0rc-FTX-1_Firmware:tools/README.md]. There are no findings
  about CAT in this repository; T07 plans to compare the documented CAT table with
  the firmware's [Reid-n0rc-FTX-1_Firmware:docs/tasks/T07-cat-commands.md].
- The manuals, decoded images and Ghidra projects are not versioned; the
  firmware remains Yaesu's [Reid-n0rc-FTX-1_Firmware:AGENTS.md] [SOURCES.md].
- Repository rule: no write to the radio without the owner's approval every
  time (firmware load, EEPROM, untested CAT commands)
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md].

**Risks.** An interrupted or failed update can lose settings or
leave the radio unusable; save memories and settings beforehand and keep
the original firmware. Third-party firmware is not approved by Yaesu. The
firmware version can be read safely with `VE`
[sq9pd-Yaesu-FTX-1-mod:README.md] [gnfrazier-ftxcat:ftxcontrol.py].

## Hardware modifications and front cover

Summary. Patches and patching data are not reproduced.

**Protective front cover (radiohyperactivity).** Support files for a homemade
cover for the FTX-1 Field: PE foam templates (A4 and US Letter, SVG and
PDF), FreeCAD sources and printable STL (foam templates from 1 to 5 mm and
a case 20 to 40 mm deep in steps of 2 mm). There is no electrical
modification or writing to the radio [radiohyperactivity-ftx1-front-cover:README.md].

**sq9pd modification (third-party firmware).** **FIRMWARE**
**ESCRIBE EN LA RADIO** (the user would have to load the result with
Yaesu's update process; the tool only prepares files). It is not
official nor approved by Yaesu. Summary of what it offers
[sq9pd-Yaesu-FTX-1-mod:README.md]:

- It starts from the official MAIN 01-13 and DISPLAY 01-10 firmware and accepts
  only those exact input files (size and fingerprint checks; it rejects
  already modified files) [sq9pd-Yaesu-FTX-1-mod:manifest.json]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Four pages of five configurable buttons in the bottom row, 70
  assignable functions, a clock in the top bar, a native scan button and
  shortcuts (APRS, FIL/NOTCH/NB/AMC), and two minor fixes (BEEP LEVEL = 0 without
  muted beeps and a "DELY" typo).
- **SWR SCAN**: it **transmits RF** while sweeping (101 points). It requires VFO
  mode, the tuner off and no SPLIT/RIT/XIT; it forces AM and low power; it does
  not trim the sweep to the band limits, so the whole range must be legal for
  transmitting (**REGION/LIMITES TX**, the user's responsibility); it adds no
  cut-off for high SWR; the factory 60 s TOT stays active; during the sweep CAT
  blocks changes and TX start.
- It runs offline (Python 3.9+ or a browser page); no uploads or
  analytics; the original files are not distributed. The tool's tests
  indicate that interactive patching in the browser is "not tested
  yet" [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json].
- Risks: a failed update can lose settings or leave the radio
  unusable; the safeguards "cannot guarantee protection against every failure";
  if TX persists, turn the radio off. To revert: reinstall the original MAIN and
  DISPLAY and do a factory reset (it erases the user settings).

Other hardware mentions: external mAT-30 tuner through the
TUNER/LINEAR connector with a mAT-CY cable
[hatandspecs-ftx1-tuner-sweep:docs/usage.md]; an external CH341A programmer as
a resource of the region tool
[Evgeny161rus-ftx1-region-tool:README.md].

## Tuner sweep

**WARNING: every step TRANSMITS.** **ESCRIBE EN LA RADIO** (it changes the VFO
live and activates TX; it does not write memory, menu or EEPROM)
[hatandspecs-ftx1-tuner-sweep:README.md]. This project does not implement the
sweep or start the tuner.

`hatandspecs-ftx1-tuner-sweep` is a local Flask application
(`http://127.0.0.1:5000`) that steps the FTX-1's VFO through the chosen bands
and triggers an external automatic tuner so that it stores a memory per
frequency (tested with a mAT-30, FTX-1 Optima, 15 m and 12 m)
[hatandspecs-ftx1-tuner-sweep:README.md] [hatandspecs-ftx1-tuner-sweep:docs/usage.md].

| Command | Meaning | Source |
|---|---|---|
| `FA<9 digitos Hz>;` | sets or reads the MAIN frequency | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `AC103;` | starts tuning of the external tuner (equivalent to holding [TUNER] for 2 s); **transmits** | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md] |
| `AC101;` | stops tuning and leaves the tuner in the circuit | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `RI;` | tuner activity (8 digits, the sixth is tuning) | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `PC;` | reads the configured power | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `MD0;` | reads the MAIN mode | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |

- Menu needed on the radio: TUN/LIN PORT SELECT = EXT-TUNER and TUNER SELECT =
  EXT [hatandspecs-ftx1-tuner-sweep:docs/usage.md]. Serial 38400 8N1 on CAT-1.
- Algorithm: per range, sorted frequencies (first = lower edge + 1 kHz,
  last = upper edge - 1 kHz, intermediate ones on a 10 kHz grid); per
  frequency: `FA`, a 300 ms wait, `AC103;`, a fixed 5 s wait polling
  `RI;` every 300 ms, and always `AC101;`. `RI` is not reliable with external
  tuners (one-way trigger line), so the end of tuning is not trusted
  [hatandspecs-ftx1-tuner-sweep:app.py]
  [hatandspecs-ftx1-tuner-sweep:AGENTS.md].
- Band privileges come from an editable `bandplans.tsv` (exact for the US by
  class; other countries approximate) or from custom ranges in Hz
  [hatandspecs-ftx1-tuner-sweep:docs/band-privileges.md].
- Safety: recommended power of 5 W or less and the app only reads it; each step
  transmits for about 5 s; it requires a prior checklist; Stop ends the
  current step; it does not detect whether the frequency is busy; no
  automated tests [hatandspecs-ftx1-tuner-sweep:docs/usage.md]
  [hatandspecs-ftx1-tuner-sweep:app.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md].

## Satellites and Look4Sat

`juanmmmmmmm-Look4Sat-FTX1` is an experimental Look4Sat fork with "Yaesu
FTX-1" as a radio model, over direct USB OTG (no PC or rigctld). **ESCRIBE
EN LA RADIO** (VFO, mode, split and CTCSS); no **REGION/LIMITES TX**,
**CALIBRACION** or **FIRMWARE** was found
[juanmmmmmmm-Look4Sat-FTX1:README.md].

- Model: MAIN = RX/downlink, SUB = TX/uplink
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/RadioTrackingService.kt].
- Start: MAIN mode according to the downlink mode, SUB mode according to the
  uplink one; initial SUB frequency = TX base or middle of the uplink band; then
  `FT1;` + `VS1;` (SUB as the TX side).
- Commands used: `FA%09d;`, `FB%09d;`, `MD0<codigo>;`/`MD1<codigo>;`,
  `FT0/1;`, `VS0/1;`, `ST1/ST0;`, `CN10%03d;` (CTCSS tone on SUB, index 000-049,
  standard tones only with a tolerance of 0.05 Hz) and `CT11;`/`CT10;`; a
  harmless `FA;` check after 150 ms on connection
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Doppler: each 1 s cycle computes the position and the radial velocity, maps the
  uplink base to the downlink with the linear transponder's band step and
  applies `getUplinkFreq`/`getDownlinkFreq`; the user's downlink offset is
  applied before the mapping for the uplink and after it for the downlink; linear
  transponders only
  [juanmmmmmmm-Look4Sat-FTX1:core/domain/src/main/java/com/rtbishop/look4sat/core/domain/utility/DopplerFrequencyCalculator.kt].
- Manual tuning: it reads FB/FA, compares with the last value sent (20 Hz threshold) and
  after two stable reads recomputes the TX base and resumes corrections.
- FM: CTCSS only on SUB's uplink encoder, configurable; tracking does not
  apply a chosen tone by itself.
- PTT: the software never sends it (`pttOn()` logs and returns false);
  DTR/RTS forced to false; only the microphone's physical PTT.
- `stopTracking()` only cancels the task: it does **not restore** the previous
  frequency, mode, split, VFO or CTCSS.

## Remote architectures, tunnel and WebUI

| App | Design | Transport and ports | Security and authentication | Latency |
|---|---|---|---|---|
| evertonma-FTX-1CAT_PR2EM | Local desktop; CAT builders and parsers separated from the Tk interface; worker thread with a queue (groups by key) | pyserial, local only | No network or authentication | Transport with RLock; unsolicited frames go to a callback [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/worker.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| evertonma-FTX-1CAT_PR2EM_Android | Local Android; a single executor serializes CAT | USB host serial | Only USB permission at runtime | Blocking queries with timeout; sliders with 90 ms debounce [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt] |
| Eugen68-Yaesu-FTX1-CAT-Control | Local Android; CAT and DATA share one USB connection | CAT port + DATA port (RTS/DTR) + USB audio | None | Event-driven reads; DATA reader off to protect CAT [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| iTracMan-FTX1WinController | WPF: commands, async facade, serialized connection and serial transport | Two virtual COM ports (CAT-1 and CAT-2 for PTT) | Local | FIFO, 1.2 s, 40 ms [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs] |
| pokibon3-FTX1Controller | Browser PWA with Web Serial; DSP in AudioWorklet/Worker | Web Serial to the Enhanced COM; Standard COM for key/PTT | Secure context; no authentication (local) | See section 3 [pokibon3-FTX1Controller:js/serial.js] |
| git-jcw-FTX-1-WebUI | Static interface with Web Serial and an Electron wrapper; queue in `cat-link.js` | Web Serial | Electron: permissions only for `file:` pages, context isolation, sandbox, single instance, external links to the browser; **no IPC bridge, no authentication and no explicit CSP in `main.cjs`** | One command in flight; sets are prioritized and grouped [git-jcw-FTX-1-WebUI:electron/main.cjs] [git-jcw-FTX-1-WebUI:js/cat/cat-link.js] |
| rzochowski-cat-ftx1 | Nuxt/Vue client, Nuxt API routes and a Node server `serial-server.mjs` on `127.0.0.1:3001` with `serialport`; state through **SSE** (`/events`, no WebSocket) | HTTP and SSE on loopback; 8N1 with configurable baud rates | Loopback only but CORS `*`; **no authentication** | Queue with timeouts; initial queries every 40 ms; 150 ms refresh after setting [rzochowski-cat-ftx1:nuxt.config.ts] [rzochowski-cat-ftx1:serial-server.mjs] [rzochowski-cat-ftx1:server/api/command.post.ts] |
| Semyonic-ftx1-programmer | Browser TS app (codec, commands, transport, stores, UI) | Web Serial | Simulation mode (dry-run) by default and writes blocked until "armed"; `PS0`, `TX1` and `MX1` require arming; no per-operation confirmation or automatic backup [Semyonic-ftx1-programmer:src/store/connection.ts] [Semyonic-ftx1-programmer:src/cat/transport.ts] | Serialized writes and queries |
| byf3332-Yaesu-FTX1-Cat-Tunnel | **Tunnel**: raw USB serial to TCP bridge; foreground service | TCP server on port **4532**, listens on `0.0.0.0`, **one client at a time (a new one replaces the previous)**; no UDP, WebSocket, virtual COM or rigctl | **None** (no authentication or encryption) | TCP_NODELAY and keepalive; USB read 200 ms, serial write 2 s, TCP read 1 s; transparent byte pass-through [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt] [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatBridgeService.kt] |
| juanmmmmmmm-Look4Sat-FTX1 | Android; FTX-1 controller in `core:data`, one shared USB controller | USB serial | USB permission at runtime | I/O mutex serializes transactions; 1 s loop [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/injection/MainContainer.kt] |
| captobie-ftx1-remote | Remote suite with Hamlib's `rigctld` (Mac/iOS/iPad, Windows, Pi as relay), Pi audio stream and CW relay | `rigctld` TCP 4532; CW TCP 8534; audio Main left/Sub right | Not evaluated in the notes | `post_write_delay` of 10 ms [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md] |
| rigplane-rigplane-core | Asynchronous multi-radio library with a web interface; `yaesu-cat` backend | USB CAT-1 (no LAN) | Not evaluated in the notes | Tiered polling [rigplane-rigplane-core:rigs/ftx1.toml] |

Notes for this project: BYF's TCP tunnel and RZO's local server have no
authentication; any remote solution of our own should require
authentication and limit access to the local network or to an encrypted tunnel.

## Summary by repository

| Folder | Purpose | Language | Licence | Features |
|---|---|---|---|---|
| captobie-ftx1-remote | Remote control suite via Hamlib `rigctld` (Mac/iOS/iPad, Windows, Pi) with CAT manual errata | Swift, C#/WinUI3, Python, Arduino | MIT; the Hamlib binaries in `Vendor/` are LGPL/GPL | Hamlib 1051 client, Pi audio, CW relay (TCP 8534), memory listing and scanning, EX catalogue, verified errata |
| fritzsche-yaesu-ftx1 | Memory programmer: upload and download repeater lists | JavaScript (Web Serial and Node CLI) | No upstream licence ("as is"); MIT permission according to the owner, per the user | CHIRP and relais.dl3el.de CSV, MW/AM/CT/CN strategies, download and verification, frequency validation |
| ew1abz-yaesu-ftx-1-control | TUI and library for tuning and clarifier | Rust (`ftx1` and `ftx1-ctl`) | No upstream licence; MIT permission according to the user | `ID`/`FA`/`IF`/`OI`/`CF`, simulated radio, 38400, TOML memories |
| ew1abz-yaesu-ftx-1-memory-manipulator | Memory backup and restore through CSV (`ftx1-mm`) | Rust and Python | MIT (only in `Cargo.toml`) | MR/MT/CN/MZ read, MW+AM write, CHIRP converter, renumbering, CAT 2507-B and 2508-C differences |
| gnfrazier-ftxcat | Python CAT control module (experimental) | Python (pyserial) | MIT | About 45 functions (frequency, mode, PTT, power, AGC, meters, VFO/memory, clarifier, CW, NB/DNR/DNF), USB/CAT installation guide, WSL2 notes |
| bg7nzl-ftx1ctl | Graphical console with meters, audio waterfall, manual notch and NET rigctl server | Python | No upstream licence; MIT permission according to the user | CAT + PTT by RTS, RM meter conversion, BP notch, PA preamp, PC power, rigctl TCP 4532 for WSJT-X/JTDX |
| rigplane-rigplane-core | Asynchronous multi-radio library with a web interface; FTX-1 through `yaesu-cat` | Python and Svelte/TS | MIT | Profile `rigs/ftx1.toml`, CAT audit against the manual (89 families), USB guide, MAIN/SUB semantics |
| evertonma-FTX-1CAT_PR2EM | Desktop tool for control, memories and menu | Python (Tkinter, pyserial) | PolyForm Noncommercial 1.0.0 (not compatible with GPL; reference only) | Quick controls, memory editor with CSV, EX menu editor with JSON backup, simulator and tests |
| evertonma-FTX-1CAT_PR2EM_Android | Android version: basic CAT control | Kotlin | PolyForm Noncommercial 1.0.0 | Frequency, mode, band, 4 sliders, EX editor, USB port selector |
| Eugen68-Yaesu-FTX1-CAT-Control | Android suite for CAT, CW, RTTY and logbook | Java, ONNX and native library | MIT | AI CW decoder, RTTY, ADIF logbook, cluster, PSK Reporter, USB audio, CW and voice memories |
| iTracMan-FTX1WinController | Controller for Windows | C# / WPF | MIT | Full function panel, meters, messages, presets, local audio, dual COM, xUnit tests |
| pokibon3-FTX1Controller | Browser PWA with Web Serial | JavaScript (WASM for CW and FT8) | No upstream licence; MIT permission according to the user; `js/cwdec/` is GPL | USB audio, waterfall, CW decoder and keying, FT8/FT4, FUNC/EX menus, memories, offline PWA, FT-991A profile |
| git-jcw-FTX-1-WebUI | Web Serial interface and Electron application | JavaScript | MIT | Waterfall derived from audio, 4 meters, tuner logic, band memory, bounded power, simulated radio |
| rzochowski-cat-ftx1 | Local web panel | Nuxt/Vue (TypeScript) and Node serialport | No upstream licence; MIT permission according to the user | State through SSE, scope controls, presets, manual CAT command, loopback server (CORS `*`, no authentication) |
| Semyonic-ftx1-programmer | Memory and menu programmer in the browser | TypeScript (JSX prototypes) | GPL-3.0 | Memory and EX editing, CSV/ADMS-14/FT5D import, simulation and arming, debug console |
| byf3332-Yaesu-FTX1-Cat-Tunnel | Android USB serial to TCP bridge | Kotlin | WTFPL 2 | Raw TCP tunnel 4532 without authentication, 10C4:EA70 filter |
| juanmmmmmmm-Look4Sat-FTX1 | Satellite tracking with FTX-1 Doppler control | Kotlin (Android) | GPL-3.0 | MAIN/SUB Doppler at 1 s, CTCSS, manual tuning detection, no PTT by software |
| Evgeny161rus-ftx1-region-tool | Reads and writes EEPROM and changes the region code through CAT | Python | No upstream licence; MIT permission according to the user | Undocumented service commands, EEPROM dump, automatic backup, RU/EN interface. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** |
| Reid-n0rc-FTX-1_Firmware | Firmware analysis project | Markdown, Java (Ghidra), Python, shell | No upstream licence; MIT permission according to the user; the firmware remains Yaesu's | Task board T01-T11 without findings, Ghidra scripts. **FIRMWARE** |
| sq9pd-Yaesu-FTX-1-mod | Offline patcher for MAIN 01-13 / DISPLAY 01-10 firmware | Python and JavaScript | No upstream licence; MIT permission according to the user | Button pages, SWR SCAN, patching with fingerprint check. **FIRMWARE** |
| radiohyperactivity-ftx1-front-cover | Homemade protective front cover for FTX-1 Field | CAD (FreeCAD, STL, SVG) | GPL-3.0 | PE foam templates, printable cases from 20 to 40 mm |
| hatandspecs-ftx1-tuner-sweep | VFO sweep that triggers an external tuner | Python (Flask) and HTML | MIT | FA/AC/RI/PC/MD, bands according to licence, 1 kHz margin, fixed wait. **TRANSMITS** |

The licences in the Licence column come from `third_party/ftx1/SOURCES.md`.
The MIT permission "according to the user" is not in writing in this repository
[SOURCES.md]. The PolyForm Noncommercial code (evertonma) is kept only as a
reference and is not copied into this GPL-3.0 project [SOURCES.md].

## Comparison with Bricohams

What exists comes from this project's notes: the web/desktop tool
(`ftx1.html`, `ftx1-core.js`, `ftx1-menu.js`, `ftx1-ui.js`) through Web Serial and
RadiCodex on Android (`RigActivity`, `YaesuFtx1` and `Ftx1Rig` in
`RigProtocols.kt`). Every write is range-checked before sending and
verified by reading back. Rules of this work: receive and VFO only; nothing
activates the transmitter.

Values of "Status in this branch": "Already existed", "Added" (planned
features) or "Out of scope (reason)".

| Feature | Repos that have it | Web/desktop | Android | Status in this branch |
|---|---|---|---|---|
| Connect and identify (`ID;` = `ID0840;`, `AI0;`) | Almost all | Yes | Yes | Already existed |
| Read VFO A/B frequency | Almost all | Yes (`FA;`/`FB;`) | Yes | Already existed |
| Set VFO A/B frequency with verification | Almost all | API only, no control in the interface | Yes | Added (VFO panel on web); on Android it already existed |
| MAIN mode (`MD0 m;`) | Almost all | No | Yes | Added (web, with read-back); on Android it already existed |
| Split `ST0`/`ST1` | ITM, Look4Sat, SEM, rigplane | No | Yes (satellite tracking) | Added (web); on Android it already existed |
| Read and write memories 1-999 | fritzsche, ew1abz-memory, PR2EM, SEM, POK | Yes | Yes (one at a time) | Already existed |
| JSON backup/restore and CSV of memories | ew1abz-memory, fritzsche, PR2EM, SEM | Yes | No | Already existed (web). Android: out of scope (not planned in this branch) |
| EX menu: read, write, backup and differences | PR2EM, SEM, POK, captobie, RZO | Yes (read-only items rejected) | No | Already existed (web). Android: out of scope (not planned in this branch) |
| AF, RF, SQL, width, IF shift, AGC, preamp, attenuator and power (web) | gnfrazier, rigplane, WebUI, ITM, bg7nzl | Yes, with read-back | - | Already existed |
| AF, RF, SQL, width, IF shift, AGC, preamp, attenuator and power (Android) | The same | - | They exist in `Ftx1Rig` but with no screen | Added (connection in `RigActivity`) |
| `RM1`-`RM8` meters (web) | WebUI, bg7nzl, PR2EM, ITM, rigplane | Yes, every 1 s | - | Already existed |
| `RM1`-`RM8` meters (Android) | The same | - | Only MAIN S-meter | Added (in `RigActivity`; `supportsMeter` and `supportsRfPower` for `Ftx1Rig`) |
| Noise blanker `NL` (OFF/001-010) | gnfrazier, PR2EM, WebUI | No | No | Added (web and Android) |
| DNR `RL` (OFF/01-10) | gnfrazier, PR2EM, EUG, ITM | No | No | Added (web and Android) |
| Auto notch `BC` OFF/ON | WebUI, ITM, rigplane | No | No | Added (web and Android) |
| Manual notch `BP` (state P2=0; frequency 001-320 x10 Hz with P2=1; in FM the non-numeric answer is null) | bg7nzl, WebUI, ITM, rigplane | No | No | Added (web and Android) |
| Narrow `NA` OFF/ON | gnfrazier, WebUI, SEM | No | No | Added (web and Android) |
| Clarifier `CF` (on/off and offset -9999..+9999 Hz) | gnfrazier, ew1abz-control, ITM | No | No | Added (web and Android) |
| CW speed `KS` (4-60 WPM) | gnfrazier, WebUI, ITM, EUG | No | No | Added (web and Android) |
| Panel lock `LK` OFF/ON | gnfrazier, SEM, RZO, POK | No | No | Added (web and Android) |
| Split memories `MZ` | ew1abz-memory, SEM | No | Yes | Already existed (Android). Web: out of scope (not planned in this branch) |
| PMS, 5 MHz band, EMGCH | ew1abz-memory, SEM | No | No | Out of scope (not planned in this branch) |
| Erase a memory channel | none (no documented command) | No | No | Out of scope (there is no documented command) |
| PTT (`TX`/`MX`), CW keying (`KY`, `PB`, CW relay) | bg7nzl, gnfrazier, EUG, captobie, ITM | No | Existing 3 s PTT test | Out of scope (activates the transmitter) |
| Tuner start (`AC` P3=3) and tuner sweep | WebUI, ITM, hatandspecs | No | No | Out of scope (activates the transmitter) |
| Band change `BS`/`BU`/`BD` and swap `AB`/`BA`/`SV` | PR2EM, ITM, WebUI, SEM, POK | No | No | Out of scope (set only, cannot be verified) |
| `SPR`/`SPW` (service EEPROM) | Evgeny161rus-ftx1-region-tool | No | No | Out of scope (writes service EEPROM) |
| Region and TX limit change | Evgeny161rus-ftx1-region-tool | No | No | Out of scope (changes the TX bands, legal and warranty) |
| Calibration | none (only reset/calibration in the EX menu) | No | No | Out of scope (risk of losing calibration) |
| Firmware or patch loading | sq9pd, Reid-n0rc | No | No | Out of scope (can leave the radio unusable) |
| Satellite Doppler | Look4Sat-FTX1 | No | Tracking by `RigTracker` (FA, FB, ST) | Already existed (Android). Web: out of scope (not planned in this branch) |
| Scope, waterfall and USB audio | WebUI, POK, ITM, RZO | No | No | Out of scope (not planned in this branch) |
| Decoders (CW, RTTY, FT8) and logbook | EUG, POK | No | Separate FT8/FT4 digital module | Out of scope (not planned in this branch) |
| TCP tunnel/rigctl and remote access | BYF, bg7nzl, captobie, RZO | No | No | Out of scope (not planned in this branch; no authentication in the references) |
| Clock `DT`, display `DA`, voice `LM`/`PB` and keyer `KM` memories | SEM, ITM, EUG | No | No | Out of scope (**ESCRIBE EN LA RADIO** with no need for receive/VFO) |

Summary of the planned features: they are receive and VFO only, every
write is range-checked before sending and verified by reading back, and nothing
activates the transmitter. On web: `NL`, `RL`, `BC`, `BP`, `NA`, `CF`, `KS`, `LK`
(P1: 0 = MAIN, 1 = SUB), the VFO panel (frequency A/B with the existing API, MAIN
mode with `MD0 m;` and read-back) and split `ST0`/`ST1`. On Android: wire the
`Ftx1Rig` settings (AF, RF, SQL, width, IF shift, AGC,
preamp, attenuator and power) and the `RM1`-`RM8` meters into
`RigActivity`, and report `supportsMeter` and `supportsRfPower` for `Ftx1Rig`.
Excluded on purpose: PTT/KY/CW keying, tuner start, `BU`/`BD`/`SV`/`AB`/`BA`,
`SPR`/`SPW`, region or TX limit changes, calibration and firmware loading.



