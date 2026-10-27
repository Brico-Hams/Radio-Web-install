# OpenGD77 help: configuration and safe use

**Verification date: 2026-10-25.** Originally written in Spanish, based on the official sources listed at the end and this application's code. This is not a translation of the manual or a guarantee that every build works.

To choose a radio, a board revision, or a specific image, see [Models and compatibility](AYUDA-OPENGD77-MODELOS.md). This guide explains how to organize a configuration, use documented features, and recognize the limits of the web editor.

## Local channel deletion (Beta)

In a standard 128 KiB codeplug, **Delete from file** frees the selected memory
and removes its references in the 68 standard zones (80 channels per
zone) and 64 scan lists (32 channels per list). It also clears references as
priority 1, priority 2, and designated TX channel, setting them to
zero. It preserves names, flags, other channels, and their numbers; it does not renumber.
It does not modify contacts or the SAT list. The map is cross-checked against the
[public CPS binary parser](https://grid.radio/opengd77/js/g77.js).

This procedure does not support Scanner formats with extended zones. It operates on
an in-memory copy: export the edited binary under a different name and keep
the original. Normal mode requests confirmation; PRO skips it for this session.
It does not write to the radio: physical OpenGD77 writing remains blocked until
the required complete MCU backup is available. The connected Quansheng radio does
not allow validation of OpenGD77 hardware.

## Import REMER repeaters (local file only)

The planner's REMER tab offers the VHF/FM frequencies transcribed from the
reference supplied by the user. Select the memories you need and
add them to the open codeplug; the application rereads it with the
OpenGD77 parser to check that the name, frequencies, and mode appear in the list.
The memories are prepared for reception only. Published CTCSS values remain
reference notes: tones are neither encoded nor verified over RF.

The list does not certify that a frequency, tone, location, or repeater remains
current. Confirm the information with REMER and the competent authorities before
any use. HF/SSB frequencies in the same reference are shown for context and are not
imported as VHF channels. Parser acceptance of a channel only confirms
that the standard binary structure is readable; it does not prove that
firmware displays it after writing, that RF can be received, or that the radio has
been programmed. Physical writing remains blocked.

## Import CPS or CHIRP CSV channels

Under **Prepared channels**, import `Channels.csv` exported from OpenGD77 CPS
or a CSV with standard CHIRP headers (`Name`, `Frequency`, `Duplex`, `Offset`,
`Mode`). The parser accepts only analog FM channels within VHF 136-174 MHz
and UHF 400-470 MHz. For CHIRP it resolves `+`, `-`, `split`, and `off`, and rejects
frequencies, offsets, or modes it cannot validate. Records are converted to RX-only
channels; source tones are noted, not programmed. Review
the prepared-channel table, choose an FM template, and save the local binary
to inspect it before using the CPS.

Digital/DMR rows from `Channels.csv` are explicitly excluded: contacts,
TG groups, RX lists, and zone references in `Contacts.csv`,
`TG_Lists.csv`, and `Zones.csv` are not migrated with this import. Those files
are related tables, not an independent binary codeplug. Proprietary Retevis/RT950 CSVs
and `.4rdmf` files are not interpreted based on their extension
or frequency columns: verified specifications are needed to map the fields. An excluded
row is shown with its line number and reason; it is not silently discarded or mixed
into the binary.

## Web check without installation (25-10-2026)

The interface includes a **OpenGD77 CPS: real web availability** matrix.
It is served as a static HTTPS site, without installing Node or the local package.
Physical access requires WebUSB/Web Serial and browser permissions; it may
require a system driver. Mobile compatibility is not guaranteed.

| Feature | Web without installed server |
| --- | --- |
| Open/save standard codeplug, edit/delete channels, and clear references | Available |
| Import RadioID user.csv | Available; direct API query has no CORS |
| BrandMeister groups | Direct prefix query and import as groups |
| RepeaterBook | Import authorized JSON; authenticated query only with a server |
| SAT list, published TLEs, SGP4 passes, and Doppler memories | Available in browser |
| Back up calibration/codeplug on connection | Automatic, persisted and hashed; partial copy |
| Copy unit's MCU firmware | Not fully implemented and verified by model |
| Radio operations after partial backup | Blocked, including new read/capture |
| Flashing, restore, voice files, bulk ID database, and full zone/settings editor | Not implemented here |

Full parity with grid.radio or desktop CPS is not promised.
Provider headers were checked: BrandMeister allows the web origin;
RadioID does not return Access-Control-Allow-Origin for the tested query.
These limits are not hidden with public proxies or fake data.

### Required prior backup

Connecting identifies the unit and automatically runs BackupManager before
enabling any other radio operation. Identification and the reads
needed to create the copy are the only exceptions. Calibration and codeplug
are saved in IndexedDB and reread with SHA-256 before exporting the manifest.
If MCU firmware is missing, the result reports **PARTIAL BACKUP**, permission is not granted, and new reads, captures, writes, and restores are blocked, including
in PRO. The copy lets you open the codeplug and edit it offline without touching the radio.

This protection does not create a nonexistent firmware reader. It is not possible to claim
that the complete original firmware is backed up automatically. Arbitrary MCU
modes/addresses are not tested to make the feature appear to work.
If “original” means factory commercial firmware already replaced,
only a pre-installation copy is useful; reading OpenGD77 does not recover those bytes.
## 1. Before connecting or transmitting

1. Identify the manufacturer, full model, hardware revision, and installed firmware. “UV380,” “10W,” and “10W PLUS” are not equivalent.
2. Record the CPS version, firmware date/build, language, and hardware modifications. Also keep the installed package name and its provenance.
3. Check your authorization, band plan, and parameters published by the repeater or network operator. A frequency field accepted by software **does not authorize transmission**.
4. Start with **receive-only** channels, VOX disabled, and APRS beacons disabled. Connect an appropriate antenna before any transmission.
5. Save original backups outside the browser. Do not calibrate or install other firmware to solve a simple channel error.

OpenGD77 is aimed at amateur radio. It does not necessarily retain every feature of commercial firmware. The guide consulted says SMS TX/RX and commercial scan lists are unsupported, and privacy/encryption are not part of its goals. Do not interpret this description as a worldwide legal opinion. [G: Introduction]

### Three different meanings of “supported”

| Evidence | What it demonstrates | What it does not demonstrate |
| --- | --- | --- |
| A model appears in the manual | There is documentation for that family or feature | That any commercial revision is compatible |
| Exists in `firmware-core.js`, `TARGETS` | The catalog recognizes a target and some package names | USB installation, authenticity by itself, or compatibility with your board |
| Exists in `gd77-connector.js`, `MODELS` | The connector knows an identification value from the protocol | Physical tests on every model, flashing, or write permission |
| Radio responds to identification | A recognized structure and matching family were received | Complete backup or universal memory compatibility |
| Editor displays channels | It can interpret the standard file area | That it read extended channels, all user data, or firmware |

**Actual status of this web app: OpenGD77 writing is BLOCKED.** The implemented backup saves calibration and standard codeplug, but returns `complete: false`: a verified protocol for copying the complete internal MCU firmware is missing. Therefore, write permission is not granted. Downloading an official image **does not replace** a unit backup. The fact that an external CPS permits writing does not remove this block. [L]

## 2. Firmware, codeplug, calibration, and backups

| Item | Contents or purpose | Caution |
| --- | --- | --- |
| Firmware | Program that runs the radio | Choose the exact family, revision, and variant; this is not a channel list |
| Codeplug | Configuration: channels, contacts, groups, zones, and other settings | Manufacturer format and OpenGD77 format are not interchangeable without checking |
| Calibration | Unit-specific RF settings | Do not copy from another radio or edit without specific instruments and procedure |
| EEPROM / Flash | Memory regions whose contents depend on the radio | “Flash” does not necessarily mean MCU firmware or a complete clone |
| MCU ROM / internal memory | Internal image CPS may handle as a separate backup on some radios | The web app has no verified complete read to grant permission |
| Voice files, ID database, orbital data | Additional resources loaded with CPS | Do not assume they are included in a 128 KiB codeplug |

The guide recommends backing up EEPROM, Flash, calibration, MCU ROM, and codeplug before the first configuration write. Check which copies are actually available in the CPS and model used; this list does not certify that every radio exposes identical regions. Archive the originals, not just the edited file. [G: Backup Before You Do Anything Else]

### Available web workflow

1. Open the app on `localhost` or HTTPS and use a browser that exposes WebUSB or WebSerial, depending on the family. Compatibility depends on browser and operating system.
2. Select the correct family: `MK22`, `STM32`, or `SERIAL`. Confirm the physical identification before connecting.
3. Close CPS, MMDVMHost, and any program using the radio. Authorize only the expected device.
4. The connection identifies the radio and requests an automatic backup. Check the log and errors: the expected result is **partial**, not complete.
5. Check the `.rwb.json` file download. History lets you export the manifest and individual binaries again. The browser may reject persistent storage: export to a folder of your own.
6. The partial backup's codeplug opens automatically for offline editing. **Read codeplug** remains blocked without a complete backup. You can also open a standard binary of exactly **131072 bytes (128 KiB)**; supported extensions do not replace content validation.
7. Edit the local file and use **Save 128 KiB binary**. This does not modify the radio. Writing remains blocked.
8. Disconnect from the app before changing pages or opening CPS.

The form edits existing channels: ASCII name up to 16 characters, RX, TX, FM/DMR, CC, TS, and receive-only. It preserves fields that are not edited; it is not a full editor for every CPS feature. Planning tools can also add template-based channels, contacts, and satellite data to the local file. This does not prove that every firmware feature is implemented in the browser. [L]

**Important limit:** web reading covers the standard 128 KiB area and does not include extended channels **1025 and later**. Do not describe the file as a complete clone or a copy of every zone and resource in an extended configuration. A backup or CPS JSON, firmware ZIP, and binary of matching size are not automatically a valid codeplug.

### Working with external CPS

The guide requires **OpenGD77 CPS** for a radio already running OpenGD77; not the commercial CPS from Radioddity, Baofeng, TYT, or Retevis. It recommends creating a new codeplug or importing CSV and reviewing the result. Save the original and a working copy before writing. After a CPS-approved write, read back and check one channel per scenario. This procedure is not presented as a way to unlock the web app. [G: Codeplug compatibility; CPS software]

## 3. Mental model: how the data fits together

```text
Identidad propia: indicativo + DMR ID
Contactos digitales: destinos TG o llamadas privadas
Lista TG / RX Group: selección de destinos para un canal
Canal: RX/TX + modo + tonos o CC/TS + destino/lista + restricciones
Zona: selección ordenada de canales
Exploración: canales de la zona o intervalo del VFO
```

An **ID database** displays correspondent names. It does not replace contacts or assign the transmit TG. A **digital contact** can represent a group or a private call: the type matters as much as the number.

In CPS or commercial codeplugs, you will find “RX Group,” “RX Group List,” or “receive group.” OpenGD77 documents using **TG Lists** to select TGs from the channel and, depending on the filter, limit what is received. Do not assume an imported list reproduces the commercial firmware's reception rules exactly. [G: CPS software — Overview]

### Recommended programming order

1. Enter your callsign and DMR ID when applicable.
2. Create group-type digital contacts for the required TGs; keep private calls separate.
3. Create useful TG lists by repeater, geographic area, or use.
4. Create channels with the actual service frequencies, mode, and parameters.
5. Assign a TG list or direct contact, depending on the chosen workflow.
6. Group channels into small, ordered zones.
7. Review scan skips, power, TOT, and receive-only settings.
8. Save, review, and test reception first.

There is no need to duplicate a channel for every TG when RX/TX, CC, and repeater use are the same and a TG list covers the destinations. Separate channels may be useful for different TS, operating conditions, or restrictions.

**Version nuance:** the CPS overview recommends at least one TG list with a group contact; `Channel Details` also documents choosing **TG Lst or Contact**, not both at once. These workflows should be checked in the CPS/build used; they are not grounds for claiming all versions handle both identically.
## 4. Channel fields and practical meaning

| Field | FM | DMR | What to check |
| --- | --- | --- | --- |
| Name | Local identification | Local identification | A name does not configure the repeater |
| RX | Frequency the radio receives | Frequency the radio receives | Usually repeater output |
| TX | Frequency the radio transmits | Frequency the radio transmits | Usually repeater input |
| Mode | FM / narrow FM | DMR | Must match the service |
| BW | 25 or 12.5 kHz in guide | Not equivalent to selecting TS | Follow local channel plan |
| RX CSS | CTCSS or DCS reception | Not applicable as a DMR filter | Incorrect tone can mute valid audio |
| TX CSS | Transmitted CTCSS or DCS | Not applicable | Use the tone required by the repeater |
| Color Code | Not applicable | CC 0–15 | Not a TG or analog tone |
| Timeslot | Not applicable | TS1 or TS2 | Must match network assignment |
| TG List / Contact | Not a DTMF tone list | Selectable or direct destination | Verify group/private type and possible overrides |
| DMR ID | Does not by itself identify an FM transmission | Own digital identity | May have a channel-specific setting |
| RX Only | Prevents TX | Prevents TX | Very useful while preparing |
| TOT | Transmission limit | Transmission limit | Check actual duration and alert |
| Ch Power | Own power or Master | Own power or Master | Displayed value is not an RF measurement |
| Zone Skip / All Skip | Scanning exclusion | Scanning exclusion | They are separate controls |
| Channel location | Repeater coordinates | Repeater coordinates | Do not confuse with operator location |
| APRS | FM beacon profile | May require separate FM frequency | Not equivalent to APRS reception |

**Simplex:** RX and TX match. **Repeater:** program both frequencies explicitly; do not rely only on an offset sign. VFO tuning step is not FM bandwidth.

`Reverse` swaps repeater RX/TX operation; `Talkaround` transmits on the RX frequency for direct operation. They are not the same, and the guide describes them as mutually exclusive. Use them only after checking where the radio will actually transmit. `Force DMO` forces direct DMR operation even when frequencies differ; it is not a general option to “improve coverage.” [G: Channel Quick Menu; Channel Details]

## 5. Scenario A: FM listening or repeater channel

1. Create an FM channel and start with `RX Only`.
2. Enter RX and TX according to the service operator; use the same frequency for simplex.
3. Set wide/narrow FM according to the channel plan.
4. Enter the required **TX** tone. Leave RX CSS unset during diagnosis unless there is a known need.
5. Set squelch to remove noise without closing on weak signals; do not use it as a substitute for the correct tone.
6. Add the channel to a zone; review `Zone Skip` and `All Skip`.
7. Check receive audio. Only afterward, if authorized, enable TX with prudent power and make a brief test.

CTCSS and DCS control audio opening or access; **they do not encrypt conversations**. Monitor helps distinguish no signal from filter squelch. VFO tone scan may find CTCSS or DCS, and the guide says it applies the result to both RX and TX: review both before transmitting.

The **1750 Hz** opening tone and **DTMF** sequences are distinct from CTCSS/DCS. Do not send DTMF to controllers unless you know their function and have authorization. The sound heard locally does not always exactly reproduce transmitted DTMF: the guide notes hardware differences on MD-UV380 and MD-9600. [G: FM specific functionality]

## 6. Scenario B: DMR repeater with multiple TGs

1. Get RX, TX, CC, and TG-by-TS assignments from the repeater operator.
2. Enter your valid DMR ID. Do not use someone else's ID or a TG number as your own identity.
3. Create **Group Call** contacts with their TG numbers; create a TG list and assign it to the channel.
4. Configure channel RX/TX, CC, and TS. Initially choose a known TG allowed on that TS.
5. Check reception with the intended filters; for diagnosis, relax filters in a controlled way and then restore normal settings.
6. Check that no manual TG/TS selection remains from an earlier test.
7. If transmission is appropriate, listen first, activate the TG under network rules, and leave pauses between transmissions.

Hearing a TG does not mean it is permanently linked to the repeater. Static/dynamic TGs, reflectors, and activation rules depend on the **network and administrator**, not only the codeplug.

### Temporary selection, contacts, and private calls

In the reference keypad layout, `#` enters a TG and pressing `#` twice enters a private destination. The TS-change key and contacts with preferred TS may change the active TS. Equivalent controls vary by radio; check the model table.

A manual selection or **override** may take precedence over the channel or list. The guide documents clearing the TS override by holding the TS key, and exiting a private call by selecting a TG or using other model-specific controls. Check the visible destination and TS **before PTT**.

Do not confuse a DMR “private call” with confidentiality. It is not encrypted because it is private. Automatic reception or acceptance of private calls also depends on firmware options. [G: DMR specific functionality; Making and receiving DMR Private Calls]

### DMR filters are not all the same

| Control | What it affects | Caution |
| --- | --- | --- |
| DMR Filter Off | Does not limit by the TG/contact criterion of other modes | Does not remove all signal requirements |
| TG | Filters by selected TG | May hide other groups that are being received |
| Ct | Filters by codeplug private-call contacts, according to the guide | Do not confuse with TG list |
| TGL | Filters by groups in the TG list | Check list content and assignment |
| TS Filter | Listens to the intended slot or can search for activity between slots | Disabling it does not create two simultaneous receivers |
| CC Scan, formerly CC Filter | Searches for a valid CC to receive | Not “ignore all CCs”; it can delay or miss the beginning |

The guide explains that the DMR circuit needs a CC and firmware searches for a match when `CC Scan` is enabled. It is not recommended for normal operation when CC is known. It also explains that listening to both TS uses a selection algorithm, not independent simultaneous reception. Visual inversion of CC/TS and mode may indicate filter settings, not a display failure. [G: Filters (Channel)]

**Ordered diagnosis:** frequency and mode → RF signal → CC → TS → TG/call type → filters → network link status. Changing everything at once makes it impossible to know what fixed the problem.

## 7. Zones, RX groups, and scanning

A **zone** is an ordered collection of channels; not a band or network. A channel can appear in multiple zones. A **TG list** groups digital destinations; it does not say which channels to scan.

The guide does not implement commercial **Scan Lists** as an equivalent feature. To reproduce a scan set, create a zone with those channels and scan the zone. Importing the “Scan List” field from a commercial file is not enough.

### Scenario C: scan a local zone

1. Create a zone with channels you actually want to monitor.
2. Check that each can be used individually and is not excluded by `Zone Skip`.
3. Start scanning with your model's control. On GD-77 and several models using the reference mapping, press and hold up.
4. Adjust `Scan dwell` if weak or intermittent signals are missed: more time per channel improves the chance of detecting them, but slows the sweep.
5. Choose the behavior: `Hold` stays while there is a signal; `Pause` resumes after the delay; `Stop` ends when it finds a valid signal.
6. Use temporary exclusion for a noisy channel if available. Do not confuse it with persistent `Zone Skip` or `All Skip` editing.
7. For `All Channels`, review `All Skip` separately.

VFO scanning uses lower/upper limits and a step, not a zone. `Dual Watch` alternates attention between VFOs; **it does not demonstrate simultaneous dual reception**. Spectrum sweep is another display, not a calibrated analyzer. [G: Scanning; VFO specific functionality; Channel Details]

On GD-77S, organize zones with **up to 16 accessible channels** through its selector; the format allowing larger zones does not expand the physical control.

`Roaming`, in the guide consulted, orders the zone by distance to repeaters when operator location and channel coordinates are available. It does not verify each repeater is operational or select the strongest by RF. It does not order `All Channels` and is disabled during scanning. [G: Roaming]

## 8. Screens, controls, and preserving changes

| Screen or mode | Use | Check |
| --- | --- | --- |
| VFO A/B | Tuning and parameter tests | Review RX and TX, not only the highlighted frequency |
| Channel | Operation from codeplug and zone | Check effective zone, channel, TG, and TS |
| Channel Details | Edit channel or VFO data | Distinguish applying temporarily from saving |
| Last Heard | Review received digital activity | Does not represent every network user |
| Radio Info | Battery, date/time, and location depending on unit | Time may be lost if there is no RTC |
| RSSI | Guidance on received level | Not a substitute for a calibrated RF meter |
| GPS | Status of installed receiver | Missing or `None` is not fixed by loading a codeplug |
| Satellite | Predictions and orbital operation | Requires valid time, location, and orbital elements |

In `Channel Details`, the guide distinguishes **Green** to confirm, **SK2 + Green** to save persistently, and **Red** to cancel. Configuration lock may prevent permanent changes. These names describe logical controls, not physically identical keys on all radios.

Temporary channel power, TG, and TS settings may not change the codeplug. After testing, change channels or check the details to see what was stored. Keep a known-good file version on the computer.

Display options include, depending on platform/build, backlight, contrast, inversion, colors, and day/night mode. A GD-77 with inverted screen does not physically become the “Black” LCD variant. Do not extrapolate color themes to monochrome models or screenshots to the screenless GD-77S. [G: Main screens; Display Options; Channel Details]
## 9. Accessibility and sound

OpenGD77 documents sound alerts, voice prompt repetition, and voice levels. Voice resources are loaded **separately with CPS**; changing the menu language does not automatically change the installed voice.

1. Check that the voice file is appropriate for the firmware and language.
2. Select `Prompt`: silent, beeps, beeps without keys, or voice, depending on availability.
3. Test `Voice`, `Voice L2`, and `Voice L3`: they change when information is announced and its level of detail; they are not three languages.
4. Use the control equivalent to SK1 to repeat the last announcement; if it is already speaking, it may stop it.
5. Adjust beep volume and DMR/TOT start/end alerts without removing necessary warnings.
6. Complete a test without relying on the display before using the configuration while mobile.

On **GD-77S**, loading voice files is essential for practical operation because there is no display or keypad. The mode button cycles through TG, scanning, TS, CC, filters, zone, and power controls; SK1/SK2 functions depend on the announced mode. Do not apply GD-77 screen-model key sequences. [G: Sound Options — Prompt; GD-77S operation]

FM and DMR microphone gain are adjusted separately. More gain does not mean greater range: it can reduce intelligibility. VOX may trigger unintended transmissions; disable it during configuration, tests, and USB connection.

## 10. Power, battery, and calibration

**Master** power is used in VFO and channels that inherit that setting; a channel may have its own power. The guide says channel-specific power is highlighted and a change made during operation may be temporary. Use the model's details-save procedure to make it persistent.

There is no single scale valid for all handhelds and mobile radios. The guide distinguishes 5 W radios, 10 W variants, and mobile radios; additionally, the scale option on a **non-PLUS 10W UV380** does not turn a standard handheld into different hardware. The **10W PLUS requires its specific image**. [G: Controlling Tx power; Radio Options — Mode; F2]

Good practices:

- Use the lowest necessary power and an appropriate antenna.
- Check power supply, battery, connectors, and SWR before investigating a suspected power issue.
- Do not interpret a screen value as a guarantee of measured power.
- Do not try to get 10 W by changing a label, menu, or calibration on a 5 W unit.
- Do not copy calibration from another radio, even if it is the same model.
- Do not edit reference, deviation, or power settings to fix a CC/TG error.
- Calibration requires instruments, a suitable load, and the specific procedure. If unavailable, keep the original values.

A radio can get very hot during prolonged transmissions, especially as a hotspot. Power that is tolerable for intermittent voice does not guarantee safe continuous operation.

## 11. DMR hotspot over USB

The guide documents the radio as a **DMR voice** modem for MMDVMHost/Pi-Star and discusses BlueDV with compatibility caveats. It is not browser network access or a Wi-Fi access point, and it does not turn every radio into a duplex repeater.

### Scenario D: compatible radio as a hotspot

1. Confirm the model and build support it. **RD-5R/DM-5R does not support hotspot** because of the USB limitation during TX.
2. Select the appropriate hotspot option on the radio; do not keep a CPS/web session active at the same time.
3. Connect the correct programming cable to the computer or MMDVMHost device.
4. In Pi-Star, the guide identifies modem type `OpenGD77 DMR hotspot (USB)`. If missing, check the host version and documentation.
5. Configure frequency, CC, ID, and network according to regulations and the host. Verify the mode on the radio display.
6. Start with low power, ventilation, and short tests. Do not extrapolate a handheld percentage/power table to a mobile radio.
7. If USB resets during TX, first address RF ingress: the guide recommends a separate external antenna, USB RF protection, and suitable host measures. Avoid using the antenna on the laptop in this setup.

Host `RFLevel`/percentage values are not universal watts. The guide describes special handling of value 100 in some implementations; do not use it as a rule for every build. Group management, authentication, and links also depend on host software and network. [G: Hotspot mode]

## 12. APRS: what it can and cannot do

The guide documents **FM APRS AFSK transmission at 1200 or 300 baud** and **no APRS AX.25 reception/decoding**. Do not promise a map of received stations, two-way APRS messaging, or a general-purpose TNC.

These are different mechanisms:

| Mechanism | Where the data travels | Dependencies |
| --- | --- | --- |
| FM APRS | AFSK packet on an FM frequency | APRS profile, callsign, location, and suitable frequency |
| Position through DMR Talker Alias | Information in DMR stream | Repeater/network support and TA settings |
| Publication on an APRS website | Subsequent infrastructure processing | Receiver coverage, gateway, and network; not guaranteed by transmitting |

### Scenario E: first FM APRS beacon

1. Configure the callsign and an APRS profile in OpenGD77 CPS. The guide describes up to **8 profiles**, not a universal number for every future version.
2. Set SSID, destination/path, symbol, comment, speed, and frequency according to the local network. Do not copy a terrestrial path to a satellite.
3. Provide a valid manual position or a real GPS fix. Do not select GPS as the source if the radio has no working receiver.
4. Assign the profile to the relevant channel or VFO.
5. Start with `Manual`; verify location and frequency before sending a test beacon.
6. Check reception with suitable infrastructure or a receiver, not only the local beep. Some models do not play audio feedback.
7. Only then enable `PTT`, `Auto`, or `Smart` if needed. Review interval and decay so you do not occupy the channel unnecessarily.

In `PTT`, the guide places the beacon when PTT is released, subject to timers; `Auto` uses intervals and `Smart` adjusts for movement and turns. Invalid location may prevent a beacon or display `Location?`. Temporary disable and key combinations depend on the model.

A profile can set a different TX frequency; if it does not, the analog channel/VFO frequency is used. On a DMR channel, the guide requires an explicit APRS frequency for this FM function. A profile's own frequency does not apply the same way in satellite mode or APRS `PTT` mode: check these exceptions before use. [G: FM APRS location transmission; APRS Options]

The TA `APRS` or `Both` option does not enable an AX.25 receiver. The guide warns about transmitted Talker Alias problems on Motorola repeaters/networks; keep TA TX disabled unless the system is known to support it. TA reception does not depend on enabling its transmission. Do not publish personal coordinates automatically without considering privacy.

## 13. GPS, NMEA, and logging

GPS is a **hardware capability**, not something that appears by installing a file. The guide documents optional receivers and modifications in certain families; not every unit with the same name has GPS.

| Status/option | Meaning in guide | Consequence |
| --- | --- | --- |
| `None` | No module detected | Check variant, installation, and compatibility; do not assume a menu fault |
| `Off` | GPS disabled | MD-9600/RT-90 have power-control restrictions |
| `On` | Receiver enabled | Needs to acquire position; test outdoors |
| `NMEA` | GPS data sent over serial USB | Prevents normal CPS communication until changed to `Off` or `On` |
| `Log` | NMEA logging in Flash | Uses space and may displace other resources |

No indoor fix does not prove the module is faulty. Wait outdoors and check the GPS screen. Direction derived from movement is not a magnetic compass that works while stationary. With working GPS, the guide documents clock updates and position use by other functions.

**Memory warning:** on devices with 1 MB Flash, such as the GD-77 example in the guide, enabling GPS logging uses DMR ID database space and may **delete its data**; voice files also affect available space. Disable logging and reload the database if you need to restore it. Do not attribute the logging capacity of one Flash to every model. [G: General Options — GPS; GPS Screen]

MK22 packages with the `_NMEA` suffix are published variants; their existence does not prove an unmodified radio has GPS. Do not confuse an **NMEA variant image** with the menu's **NMEA USB output mode**. Check build notes and hardware before choosing one. [F1]
## 14. Satellites: preparation and operation

The documented satellite screen predicts passes, displays azimuth/elevation, and applies Doppler correction to RX/TX. It does not turn the radio into a receiver for every orbital mode or certify full duplex.

### Scenario F: prepare for a pass

1. Check the satellite's current operational status and rules in current operator/AMSAT sources.
2. Update **Keps/TLE** orbital elements and parameters for the satellites you will actually use with CPS.
3. Enter the correct location and date/time; check UTC versus local time. A large time offset shifts predictions.
4. Confirm frequencies, mode, tones, and whether the satellite currently allows voice, beacon, or APRS.
5. Review the pass list and then the polar view or live data.
6. Test reception before transmitting. Adjust antenna, orientation, and power for the pass; do not apply generic terrestrial-repeater rules.
7. If using satellite APRS, use its specific parameters. The guide allows profiles named for the satellite to customize expected values.

The guide says uploading Keps with CPS also sets date/time. Radios without RTC may lose it when powered off; do not extrapolate retention to the entire catalog. Its RTC list for MD-9600/RT-90, UV380/RT-3S, and DM-1701 reflects the scope of the text, not certification of every later model.

Old orbital data, the wrong hemisphere, or confusing decimal degrees with another format produce incorrect predictions even when firmware works properly. Alarms, automatic satellite switching, and special tone controls depend on build/platform. Editing satellite data locally in this web app **does not load it onto the radio** while writing remains blocked. [G: Satellite Screen; L]

## 15. USB, connection modes, and firmware

**Normal/CPS use and bootloader are different modes.** Identification by CPS may not work in update mode, and a blank screen does not prove the radio is broken. The cable must suit the hardware; not all two-pin connectors imply the same cable or protocol.

The guide distinguishes MK22 and STM32 installation: for STM32 updates it documents the STM DFUSe driver; normal CPS communication uses a different port/driver context. Do not change drivers randomly or assume a DFU driver resolves WebUSB or WebSerial in normal mode.

### If you need to install or update firmware outside the web app

1. Check the model and revision in [the matrix](AYUDA-OPENGD77-MODELOS.md), as well as instructions for the specific package.
2. Keep available backups and the original firmware for the unit.
3. Use the **OpenGD77 CPS** firmware loader specified by the project, not the commercial loader for an OpenGD77 image.
4. Check the “donor” firmware required by that family. The guide says to select it in the loader to provide AMBE codec components; it is not installed as a replacement by following another radio's instructions.
5. Confirm model, variant, language, and revision before starting. A correct donor selection may enable DMR; without the required procedure, the guide describes FM-only operation.
6. Follow the **model- and revision-specific** bootloader sequence with stable power. There is no universal combination here.
7. After installation, check identification, audio, RX/TX, and configuration; create backups that CPS supports.

No recovery instructions are offered for bridging boards, erasing regions, or writing another unit's calibration. If identification is ambiguous, stop the update until the hardware is documented.

## 16. Symptom-based diagnostics

| Symptom | Checks, from lower to higher impact | What to avoid |
| --- | --- | --- |
| Connect is disabled | HTTPS/localhost, browser API, family, and confirmation | Changing firmware just to enable a button |
| USB/serial permission but no identification | Normal mode, correct cable, CPS/host closed, correct family | Forcing another family or assuming a memory map |
| Unknown identification structure | Record model/build and message; use tools documented for that version | Skipping connector validation |
| Partial backup and blocked writing | Export calibration/codeplug and manifest; preserve state | Treating a downloaded ZIP as an MCU backup |
| File will not open | Exactly 131072 bytes and standard format; not JSON or firmware | Padding or truncating a file to make it fit |
| Channels 1025+ are missing | Explicit web editor limit | Saving standard area as if it were an extended backup |
| FM has signal but no audio | RX CSS, squelch, mute, mode/bandwidth, and volume | Recalibrating RF first |
| DMR has signal but no audio | CC, TS, TG/contact, filters, and link status | Using CC Scan permanently without need |
| Hears one TG but transmits on another | Override, direct contact, TG list, and active TS | Trusting only the channel name |
| Cannot open the repeater | Actual TX, FM tone or DMR CC/TS, coverage, and access rules | Raising power without checking configuration |
| RX Only error / TX unavailable | Receive-only, TX Inhibit, band limits, and TOT | Removing restrictions without authorization |
| DMR names do not appear | ID database loaded, length/space, received Talker Alias | Confusing ID database with TG list |
| Expected channels are not scanned | Active zone, Zone Skip, All Skip, and scan mode | Looking for an unimplemented commercial Scan List |
| USB drops during TX | RF ingress, separate antenna, and setup; RD-5R is not hotspot-capable | Disabling protections or insisting at maximum power |
| CPS stops communicating after enabling GPS | `NMEA` output: switch back to `Off` or `On` | Reinstalling firmware before checking USB mode |
| GPS shows `None` / does not acquire | Actual module presence, build support, and outdoor test | Assuming factory GPS based on commercial name |
| APRS shows `Location?` or does not transmit | Position, profile, callsign, frequency, beacon mode, TX Inhibit | Enabling automatic beacons to “test more” |
| Satellite passes are inconsistent | Time, date, UTC, location, TLE, and actual satellite status | Changing frequencies by intuition |
| GD-77S has no voice | Voice files loaded, volume, and control mode | Applying GD-77 screen-model instructions |
| MD-9600/RT-90 has no RX/TX after update | HW image and actual revision, power, and backups | Flashing revisions at random based on a universal rule |
| An option is missing | Model, variant, language, and date/build | Assuming every screenshot is from the installed version |

## 17. Glossary

| Term | Meaning |
| --- | --- |
| AMBE | Digital voice codec whose integration requires the documented donor procedure |
| APRS | Station/position information exchange system; here FM AFSK is distinguished from DMR data |
| Build | Specific firmware compilation; record date and revision |
| CC | DMR Color Code, value 0–15 |
| Codeplug | Radio configuration file/structure |
| Contact | Digital destination with a number and call type |
| CPS | Computer program for configuring and maintaining the radio |
| CTCSS / DCS / CSS | FM tone/code signaling systems; not encryption |
| DMO | Direct digital operation, without repeater |
| DMR ID | Station's digital identifier; not the TG |
| DTMF | Signaling with tone pairs for control or dialing |
| Keps / TLE | Orbital data used to predict satellites |
| MCU | Microcontroller that runs firmware |
| MMDVMHost | Host software for digital modems, used in hotspot scenario |
| NMEA | Navigation-message format; also the name of an output or variant depending on context |
| Override | Temporary selection that takes precedence over a saved value |
| PTT / VOX | Push-to-talk transmission / voice activation |
| RTC | Real-time clock; presence and retention depend on the radio |
| RX / TX | Receive / transmit |
| RX Group / TG List | Contact grouping; check semantics in the CPS/firmware used |
| SK1 / SK2 | Logical names for side keys; positions vary by model |
| TA | Talker Alias, additional information transmitted in DMR |
| TG | Talkgroup, a DMR group-call destination |
| TOT | Timer limiting a transmission |
| TS | DMR Timeslot, 1 or 2 |
| VFO | Frequency-tuning mode |
| Zone | Ordered collection of channels |

## 18. Sources, versions, and licenses

Consulted on **2026-10-25**, with a guide download for local reading and limited queries of official indexes; the forum archive was not crawled in bulk.

- **[G] Official English guide:** [maintained Markdown](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md). For a reproducible reference, the API consulted reports the file's last modification as [33de63dcb002fcd837419fda25a2e535b940dbcd, 2026-03-08](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md). Citation section names identify functional evidence.
- **[R] Official guide repository:** [LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide). Its README explains separation from the former repository for licensing reasons, declares **GPL 2 for these documents**, and notes that only the English version is maintained; the Chinese version is outdated.
- **[W] Project website:** [opengd77.com](https://www.opengd77.com/). At the time consulted, its homepage explains the interactive forum closure and bot traffic problem.
- **[A] Static archive:** [archived forum index](https://www.opengd77.com/archive/index.html). Presented as a snapshot, with visible date July 2025; it is not proof of every 2026 build feature. Registration, profiles, or other links may not work.
- **[F1] Observed MK22 index:** [GD77, 2026-05-04, revision 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/). Includes packages specific to GD77, GD77S, DM1801, DM1801A, and RD5R, with variants by target.
- **[F2] Observed STM32 handheld index:** [MDUV380_DM1701, 2026-05-04, revision ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/). Includes `OpenMDUV380_10W_PLUS.zip` separate from standard, as well as DM1701 and RT84.
- **[F3] Observed mobile index:** [MD9600, 2026-05-04, revision e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/). Contains HW V1/V2/V4/V5 images.
- **[F4] Observed MD2017 index:** [2026-05-05, revision 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/). Confirms a published package, not equivalence with another model.
- **[C] Verified maintenance notes:** [MDUV380_DM1701 changelog dated 2026-05-04](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/changelog.txt). Describes codec-link adaptation to recent tools, not a promise of every model's features.
- **[L] Local evidence from this application:** [`firmware-core.js`](../../../firmware-core.js), `TARGETS`; [`gd77-connector.js`](../../../gd77-connector.js), `MODELS`, `connect`, `backup`, `readCodeplugRaw`; [`radio-ui.js`](../../../radio-ui.js), permission state, reading/editing, and export. Describes implementation, not a physical test campaign.

The consulted `Latest` paths redirected to those directories; they may change and do not mean “stable for any radio.” The guide, packages, and forum archive have different timelines. In case of discrepancies, prioritize verified instructions for the exact package and hardware without automatically extrapolating later changes.

**Licenses:** the cited GPL 2 statement applies to the guide repository. It is not assumed to be MIT or extended to current firmware, donors, codec, voice files, CPS, images, or all dependencies. Check the specific license for each component before redistributing; a public download does not remove use or distribution conditions.