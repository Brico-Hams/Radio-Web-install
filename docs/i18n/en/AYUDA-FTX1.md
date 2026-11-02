# Yaesu FTX-1 guide: memories and settings

The FTX-1 Beta web editor reads, edits, copies and writes the memories and the
menu settings of the Yaesu FTX-1 from the browser, through the USB CAT port and
Web Serial. It only uses the commands documented in Yaesu's official FTX-1 "CAT
Operation Reference Manual". It does not replace ADMS or Yaesu software, and it
does not send data to any server.

## Requirements and connection

- Chrome or Edge on `localhost` or HTTPS (Web Serial).
- MAIN firmware 1.08 or later: the manual states that CAT does not work with
  earlier versions.
- USB-C cable to the radio. Windows shows two "Silicon Labs Dual CP210x" ports;
  either the `Enhanced COM Port` (CAT-1) or the `Standard COM Port` (CAT-2) works.
- Close any other CAT program (WSJT-X, loggers, cat-ftx1) before connecting.
- Speed: `CAT-1 RATE` or `CAT-2 RATE` depending on the port (factory 38400 and
  4800 bps). A real FTX-1 answered on CAT-2 at 4800 bps.

On connection the page sends `ID;` and requires the FTX-1 answer `ID0840;`.
It then sends `AI0;` to turn auto information off while it works.

## Memories

"Read memories" queries the selected channels (1-999) with `MR` and the name with
`MT`. An empty channel answers `?;` and is shown as free. You can edit:

| Field | Command | Values |
|---|---|---|
| Frequency | `MW` | 0.030000-470.000000 MHz |
| Mode | `MW` | LSB, USB, CW-U, CW-L, FM, FM-N, AM, AM-N, RTTY, DATA, PSK, C4FM |
| Tone | `MW` | OFF, CTCSS ENC/DEC, CTCSS ENC, DCS, PR FREQ, REV TONE |
| Shift | `MW` | Simplex, + or - |
| Name | `MT` | Up to 12 ASCII characters |

The clarifier is kept as read. The subtone frequency, the DCS code and the
offset width are not part of `MR`/`MW`: they are global FM menu settings
(`TONE FREQ`, `DCS CODE`, `RPT SHIFT(144MHz)`, `RPT SHIFT(430MHz)`) that you can
change in the settings section. There is no documented command to erase a
channel: an occupied channel cannot be made empty from the web page.

"Copy channel" duplicates a channel into another position in the editor. "Export
CSV" creates a CSV with CHIRP columns; "Import CSV" accepts CHIRP or OpenGD77 CSV
files with FM channels and places them from the start channel you choose. Source
tones are lost on import: review them before writing.

## Radio settings (menu)

The table is generated from table 3 (MENU Chart) of the manual with
`scripts/build-ftx1-menu.py`. Each setting is read with `EX` and written with the
same command, respecting the number of digits and the documented values. Items
marked "-" in the manual are not offered. Settings that can cut the CAT link
(CAT rates, timers and stop bits, TUN/LIN port), the `REF FREQ ADJ` reference
adjustment, the fixed APRS destination and the Bluetooth status stay read-only.

## Backup, simulation and writing

Writing stays locked until three steps are completed in the same session:

1. Read from the radio.
2. Download the JSON backup of that read (`bricohams-ftx1-backup`).
3. Press "Simulate write" and review the difference table.

Only the changed channels or settings are sent. Each one is read back and
compared with what was sent; if the radio answers `?;` or a different value, the
write stops and names the channel or setting. To undo, load the JSON backup with
"Restore JSON backup", simulate and write again.

## Limits

- Memory channels 1-999 only. PMS, 5 MHz, emergency channel and split memories
  (`MZ`) are not edited.
- The cat-ftx1 README warns that some real FTX-1 answers differ from the manual.
  Try a free channel first and always keep the backup.
- Modes marked "-" in the manual (for example code `0`, used by some real
  channels) are read and shown but never written: choose another mode first.
- The Yaesu manual is not distributed with this project.
