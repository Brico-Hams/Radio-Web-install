# Common configuration, backups, and diagnostics

Revision: 25-10-2026. Conceptually applicable to FM/DMR; menu names, ranges,
and buttons depend on the model guide and build.

## Before configuring

### Providers and automatic downloads in the installed version

In Repeaters, open **Configure RepeaterBook API**, enter the approved
individual token and User-Agent, and confirm your approval. It is retained only
in server memory until restart; the token field is cleared after submission.
The `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT`, and `RB_APPROVED=yes`
environment variables remain available to configure the process.

In DMR Contacts, **Automatic DMR download** imports a RadioID batch by
country/region (1-10 pages, maximum 1024) into the local codeplug. Rooms are
talkgroups: the BrandMeister option uses a TG prefix, not a RadioID country.
Save groups with group-call type and a numeric TG name; then assign the TG to
the channel in CPS. It does not subscribe the hotspot or open a room. It does
not write to the radio or silently sync at startup.

For Quansheng, in SAT/passes, prepare FM or Doppler channels and click **Load
SAT / Doppler prepared in Quansheng configuration** after choosing an FM
template. This requires F4HWN v6 configuration to have been read/opened. It
does not load TLEs into the firmware module: it prepares stepped receive
memories with manual switching.

Record the model, board revision, MCU family, firmware, and date/build. Save a
SysInf/Radio Info photo, original files, and their hashes. Note the cable type,
port, browser, and program used. Only one application should have the port
open: close CHIRP, CPS, Studio, and other tabs.

Do not confuse these objects:

| Object | Contents | Does not replace |
| --- | --- | --- |
| Firmware | Program run by the processor | Individual calibration |
| Codeplug/configuration | Channels, contacts, zones, and settings depending on format | Firmware backup or backup of the entire radio |
| Calibration | Adjustment values specific to the unit | Configuration from another unit of the same model |
| Physical Flash | Image of a specific memory | Memories of other chips not included in the declared scope |
| Manifest/SHA256SUMS | Names, hashes, and metadata | Manufacturer's digital signature |
| TLE | Orbital elements and epoch | Active frequencies or a guarantee of satellite service |

Export the `.rwb.json` backup outside the browser and keep the original
unedited. IndexedDB depends on origin, browser, and profile. Switching between
localhost, 127.0.0.1, Pages, or private mode may mean you do not see the same
backups. Do not clear browser data to fix USB before exporting them.

## Beta and PRO mode

The application and Bricohams builds are in **Beta / validation**. Enable
**PRO mode** before connecting if you want to carry out the actions you select
without typing confirmation words or accepting local channel deletion. The
PRO selection also authorizes the initial read without checking another box.
It is an option for this page/session; it is not silently remembered on reload.
It does not remove model selection, browser WebUSB/Web Serial permissions, full
backup, CRC, hash checks, reread, operation locks, or Main protection. It does
not control confirmations in external CPS/Studio. Do not navigate or unplug
during an operation, even in PRO mode. A partial backup never enables writes,
regardless of this mode.

## Analog channel glossary

| Setting | Meaning | How to choose and check |
| --- | --- | --- |
| RX | Frequency the radio listens on | Use the repeater's published output or the simplex frequency |
| TX | Frequency it transmits on | For a repeater, use its input; do not reverse RX/TX by intuition |
| Offset and direction | TX difference from RX | Check the resulting TX frequency, not just the sign |
| Mode | FM, AM, or another supported mode | Must match the signal; AM reception does not authorize AM TX |
| Step | VFO step | Not channel bandwidth; select the appropriate raster |
| W/N / bandwidth | FM channel deviation/filter | Match the system; narrow does not create a digital mode |
| SQL | Audio-open threshold | Start low and raise only enough to close noise without losing signals |
| CTCSS TX | Subaudible tone transmitted | Only if the repeater requires it |
| DCS TX | Subaudible digital code | Not equivalent to DMR Color Code; observe polarity if applicable |
| CTCSS/DCS RX | Additional condition for opening audio | Leave unfiltered for diagnostics; does not encrypt communications |
| Power | RF output level | Lowest sufficient permitted level; values depend on calibration |
| RX-only / TXLock | Prevents transmission on this channel | Keep enabled for listening and unverified imports |
| Busy lock | Blocks TX when activity is detected | Does not remove the need to listen before transmitting |
| TOT | Maximum continuous TX time | Helps if PTT sticks; not the scan interval |
| VOX | Activates TX from audio | Disable during USB/headphone tests and in noisy environments |
| Compander | Dynamic-range processing | Use only if the other end is compatible |
| Reverse | Temporarily swaps input/output | Recheck RX/TX on exit; do not unintentionally change the saved channel |

### Example workflow for a repeater

1. Copy RX, TX, mode, bandwidth, and tone from the responsible operator's
   publication.
2. Create or duplicate a compatible template; keep RX-only while reviewing.
3. Listen without an RX filter to check activity and frequency.
4. Verify that the TX tone is required, not just an assumption from the provider.
5. Check legality, power, and inclusion in lists/zones.
6. Save to memory. Reselect the channel to check persistence.
7. In this website, export the result; do not assume editing a file wrote it to
the radio.

No universal transmission frequencies are provided: they depend on location,
license, band, service, and specific repeater.

## DMR glossary

| Setting | Meaning | Common mistake |
| --- | --- | --- |
| Radio ID | Subscriber's own identifier | Confusing it with a TG or using someone else's |
| TX Contact | Call destination and group/private type | Using a private contact when a group is required |
| TG | Talkgroup, group identifier | Assuming this alone programs the repeater network |
| TS 1/2 | Channel Time Slot | Confusing it with channel number or Color Code |
| CC 0-15 | DMR access Color Code | Treating it like a password or CTCSS tone |
| RX Group | Set of receive groups | Confusing it with a channel zone |
| Zone | Organized channel list | Expecting it to change TS/CC automatically |
| DMR filter | Conditions for accepting audio | An open filter does not authorize transmission on any TG |
| Hotspot | Personal RF/network interface | Not a conventional two-slot repeater by default |
| ID database | Relationship between ID, callsign, and name | Does not create TX contacts or enable network access |

To configure DMR on OpenGD77, follow its [own guide](AYUDA-OPENGD77.md).
Quansheng F4HWN/Karina/ARDF are not documented here as DMR radios.

## Scanning and dual watch

Scanning visits channels sequentially; it does not mean listening to the whole
range simultaneously. Higher speed can miss short carriers, tones, or digital
headers. Resume by time, resume by carrier, and stop are different behaviors.

Priority channels and dual watch add visits to the cycle; they can change the
useful listening time. Check which channel is used for TX: primary, last
received, or the one configured by the reply mode. When diagnosing reception,
use one VFO and disable scanning.

## System settings

| Group | What it changes | Caution |
| --- | --- | --- |
| Backlight/contrast/inversion | Legibility and power use | Does not change RF sensitivity |
| Beeps/voice/alerts | Interface signals | Lower volume before using headphones |
| Power saving/sleep/APO | Receive cycle or power-off | May delay signal detection and interrupt sessions |
| Battery capacity | Estimate/manager depending on firmware | Does not physically change capacity or calibrate voltage |
| Keypad/PTT lock | Permitted actions | Check whether it also blocks TX and how to unlock that build |
| Date/time/UTC | Logging, position, and orbits | Time zone does not replace a correct clock |
| Position/GPS | Calculations or services that use it | Protect privacy and do not assume GPS if the model lacks it |
| Shortcuts/keys | Short/long-press actions | Record changes; do not copy combinations from another model |
| Reset | Restores groups of values | May erase channels/settings; do not use as the first diagnostic step |
| Calibration | Frequency, levels, and other bench parameters | Do not touch without instruments and the project's procedure |

## Repeaters, RadioID, and satellites on this website

- Web mode: RadioID through `user.csv`; local mode: server lookup. Imported
  private contacts do not create zones or assign TGs to channels.
- RepeaterBook requires the local version and an approved token. External
  sources may be incomplete or out of date. Check operating status with the
  responsible operator.
- OpenGD77 uses a standard 128 KiB codeplug here. Imported channels use a
  compatible template and start RX-only; review the zone in CPS.
- Quansheng can read F4HWN v6 configuration, add FM channels from a template,
  and delete memories from the local file. Beta sending requires a full Flash
  backup and reread; v6.0 remains read-only. It also exports projects/CSV.
  There is no native Quansheng SAT orbital table.
- OpenGD77 distinguishes its native SAT table from listening channels. Check
  the editor's real limits and capabilities before assuming an extended file
  will work.
- Doppler is not a repeater offset. It depends on time, orbit, and position;
  stepped channels are approximations, not continuous tracking.
- Update TLEs, time, and position; verify epoch and active frequency. A
  predicted pass does not guarantee an active transponder or reception.
- For reception, disable inherited tones unless there is a known requirement.
  Do not enable automatic uplink/TX by importing a satellite.

## USB connection: do not confuse modes

| Operation family | Expected mode | What not to do |
| --- | --- | --- |
| Quansheng: reading and slots | Compatible F4HWN firmware booted normally, serial protocol | Do not enter the bootloader just to check channels |
| Quansheng: external flashing | Hardware-specific mode and tool | Do not use a V1 tool on V3 or confuse packed/RAW |
| OpenGD77: web CPS reading | Normal OpenGD77 firmware and family transport | Do not select DFU or boot ROM |
| OpenGD77: firmware installation | Official tool and model-specific sequence | Do not use the website as an MCU flasher |

Desktop Chrome/Edge, HTTPS or 127.0.0.1, and device permission are required
for browser APIs. A charging cable may supply power without carrying data.
Direct USB-C and the side serial cable are different paths. Do not change the
driver for an unrelated device or replace every CDC with WinUSB: verify IDs and
interface before acting.

### Timeout / “0 of 1 bytes”

1. Save the exact message and the last successful operation.
2. Close other programs and tabs using the port.
3. Disconnect safely and start the radio in normal mode.
4. Verify the correct hardware, firmware, and port; try a data cable.
5. Retry a read, without writing or deleting.
6. If it identifies but fails to read, record the exact firmware and command/
stage. Identification does not prove support for every command.
7. If the error persists, stop and preserve the logs. Do not arbitrarily raise
baud rates or remove the backup protection.

## Post-operation checklist

- The exported file has the expected format/size and an original copy.
- Changes survive closing and reopening the file.
- RX/TX, tones, mode, TS/CC, and RX-only are correct where applicable.
- The zone/list/bank is the one intended, not just the memory number.
- “Prepared” has not been confused with “installed.”
- A CRC check covers the data it declares, not all firmware security or
calibration in other chips.

Sources: this website's connectors, editor, and planner; manuals linked in the
[F4HWN](AYUDA-QUANSHENG.md) and [OpenGD77](AYUDA-OPENGD77.md) guides.