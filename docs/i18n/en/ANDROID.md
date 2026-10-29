# Bricohams Android Beta

## APK scope

The main screen offers **System language**, **Español**, **English (US)**, **Français**,
and **Deutsch**. The choice is saved locally and applies to every screen, including USB
channels, CAT, satellites, and SSTV. Switching languages does not translate callsigns,
channel names, or user files; the branding remains Bricohams.

Opening Satellites automatically updates TLE/frequencies over HTTPS from CelesTrak and SatNOGS if the catalog is missing or at least 24 h old. Settings can disable automatic updates. Your saved location and radio channels are not sent; servers receive the normal HTTPS request, including the IP address. Offline import remains available. This revision preserves the 0.8.0 features and prepares 0.9.0-beta APKs, versionCode 13. Android tests, lint and builds require JDK 17 and SDK 35; they cannot run locally with Java 8. CI must verify the new APK before distribution.

Without a saved observer the screen opens on the offline world map, without asking for GPS permission or inventing a location. Satellites, footprints and the selected track appear after valid TLE are available and refresh every 5 s while the map is visible. Cached TLE work offline until they expire. On the first catalog load, receivable satellites are selected (up to 20 catalog entries if frequencies are unavailable); saved selections, including None, are preserved. Pass predictions still require your position in Settings. Errors remain visible.

On a later v0.5.2 tag push, Android Beta attaches both 0.9.0-beta APKs (debug app and instrumented tests) and SHA256SUMS-android to the release created by the installer workflow. Nothing is published locally.

The [V3/Android comprehensive validation](VALIDACION-INTEGRAL-V3-ANDROID.md) distinguishes
host tests from phone/radio tests and includes the contact, channels-by-slot,
and CAT matrices. The audit is in progress, not certified.

Native Kotlin application for Android 8.0/API 26 or later, with no server
or accounts. It is an independent implementation: it
does not include code or resources from Look4sat, Robot36, or HAMRS.
Version `0.9.0-beta` does not replace their full feature sets.

| Feature | Status |
| --- | --- |
| Logbook contacts | Create, search, view, edit, and delete with confirmation; local SQLite |
| Contact exchange | ADIF ASCII export/import with preview, UTF-8 JSON, and JSON backup restoration |
| LoTW | Export ADIF for TQSL on a computer; no signing or upload from Android |
| ARDF | Persistent sessions, beacons 1-10, history, counters, intervals per beacon, and filtered sum of GPS segments |
| GPS | Phone position fix, with accuracy and fix time, after authorization |
| ARDF export | JSON with sessions, observations, contacts, and coordinates when available |
| Text Morse | Dots/dashes; spaces between letters and `/` between words |
| Morse from audio file | Experimental 16-bit mono PCM WAV, configured tone/speed |
| Microphone | Foreground capture up to 60 s and subsequent Morse/Robot36 decoding; no continuous listening or decoding |
| USB/CAT RX | CDC ACM and recognized single-port USB-serial adapters, F4HWN v6+ identification, query, confirmed temporary tuning, and STOP; experimental |
| CAT TX (PTT) | Robot36 transmission with PTT via a lease armed on the radio (key 9), required callsign, 120 s limit, rejection for TX lock and bands; experimental |
| Satellites | Offline SGP4, imported TLE catalog, manual observer, 24-hour prediction, and CAT RX Doppler tracking during the selected pass |
| SSTV Robot36 | WAV or microphone-capture decoding, including while CAT is tuning, and a Robot36 encoder for transmission over CAT PTT; experimental |
| Channel, tone, and power writing | F4HWN v6 FM channel editor over USB with full backup and readback |

The interface uses the original Bricohams PNG and orange accents on a dark
background. The icon retains the original brand rather than inventing a
variant; lint warns that its launcher silhouette is unconventional. The web
palette has not yet been changed: its final migration remains pending.

## Installation and data

The development APK is signed with the Android tool's debug key, not a
Bricohams distribution identity. Verify the published SHA-256 alongside it.
It is not a Google Play version or a stable release. Android will ask you to
authorize installation from the application that opens the APK. It does not
install drivers or modify the radio. Optional CAT RX commands temporarily
change the receive tuning, not the radio's persistent programming.

Data is stored in the application's private SQLite database. There is no
telemetry, background location service, or personal-data upload. INTERNET
permission is used only for the requested HTTPS satellite data downloads.
System automatic backup and data transfer are disabled in the manifest/extraction
rules. **Export before uninstalling:** uninstalling deletes local data.
JSON restoration starts from Home and never deletes existing data.

Exports use the Android file picker; general storage access is not required.
The selected provider may be remote: choosing a cloud service means sharing
the content with that provider. JSON contains personal data and locations;
check its destination and do not publish it. No LoTW certificate is requested
or stored.

Before migrating SQLite schema 1, the untouched database is copied to `bricohams-v1-backup.db` in private storage. Migration is transactional: existing contacts enter General, and failure leaves schema 1 unchanged.

## Logbook

Contacts are grouped in activity logbooks: General (always present), POTA and SOTA. Switch logbook selects the active book. Create a book with an ASCII name, template, park/summit reference (POTA `EA-0123`, SOTA `EA4/MD-001`; blank for General) and station call, required for POTA/SOTA. Quick entry keeps frequency and mode for the next QSO; untouched RST changes between 59 and 599 for voice/CW-RTTY. Leave UTC blank to use the current time on Save. Search and ADIF import/export apply to the selected book; JSON includes every book. POTA proposes `INDICATIVO@PARQUE-AAAAMMDD.adi` as the export filename.

Before saving, a duplicate warning compares call, ADIF band (or frequency outside bands) and mode, plus UTC day for POTA/SOTA. Do not save keeps the form unchanged; Save anyway adds a new contact. `EA2XYZ` and `EA2XYZ/P` are distinct. ADIF import instead skips contacts with all preserved fields identical. ADIF exports BAND, STATION_CALLSIGN and MY_POTA_REF/MY_SOTA_REF where applicable; inconsistent BAND and activity fields on import are reported as not preserved. No online call lookup or POTA/SOTA upload is provided; logbooks cannot be renamed or deleted.

1. Open Logbook and enter callsign, ISO UTC, frequency in MHz, mode,
sent/received reports, and notes.
2. Save the contact. The list shows the latest 50; exports include all contacts.
3. Edit opens the contact with its original ID; saving does not create a duplicate.
   Deleting requires confirmation and cannot be undone.
4. Export ADIF for exchange/TQSL or JSON to preserve all text.

The date is interpreted as an ISO instant; ADIF converts it to UTC. The
form's supported frequencies, 0.1-1300 MHz, do not authorize transmission.
The modes in an entry do not assert that the radio supports them. Unsaved
forms are discarded when changing sections. Rotation retains the current
section's fields through Android state.

ADIF includes CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD, and COMMENT.
ASCII export rejects notes with accents, line breaks, or other unsupported
characters: it does not silently remove or replace them. JSON preserves UTF-8.
Export does not certify that LoTW will accept a contact; signing, uploading,
service response, and confirmation are separate steps.

### Search contacts

From Logbook, enter part of a callsign, notes, mode, frequency, or UTC and
tap Search contacts. Matching is case-insensitive; it does not remove accents
or interpret ranges/regular expressions. The total number of matches and the
50 most recent matches are shown. Show all contacts removes the filter. The
applied search survives rotation; tapping Search creates the form again and
discards unsaved edit changes. Export always includes all contacts, not just
matches.

### Import ADIF with preview

From Logbook, tap Import ADIF (preview). The picker allows any file, but the
app validates text ADIF in ASCII, up to 16 MiB and 50000 contacts. Each header
or record is limited to 512 fields. ADX/XML, UTF-8, and other binary formats
are not supported. Parsing respects declared lengths: text such as `<EOR>`
inside COMMENT does not end a record. A header with EOH or headerless records
are accepted; tags are case-insensitive and ADIF type suffixes are supported.
Each record must end with EOR.

Required fields: CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM or HHMMSS),
FREQ in MHz, MODE, RST_SENT, and RST_RCVD. COMMENT is optional. The same
contact limits as manual entry apply; modes such as FT8 are not silently
converted to others. An HHMM time is represented with seconds 00. The format
does not preserve fractions of a second when exporting. Frequency is not
inferred from BAND, and missing reports are not invented.

The preview shows the number of contacts and **fields not preserved**,
for example BAND, SUBMODE, GRIDSQUARE, or LoTW confirmation data. Header
metadata is not added to contacts. Keep the original file: this import is
not a lossless replacement for every ADIF file. Cancel saves nothing. A
malformed file or invalid record cancels everything before import is offered.
Duplicate tags, impossible dates, and truncated lengths are explicit errors.

On acceptance, everything is added in a SQLite transaction. If an insert
fails, the whole set is rolled back. Records whose preserved fields are
identical to an existing record or one in the same file are skipped: callsign,
UTC instant, normalized numeric frequency, mode, both reports, and notes.
If any field differs, a new contact is added; records are never overwritten
by callsign/time. Internal IDs are generated anew; external ADIF IDs are not
used. Reimporting the same content does not duplicate identical contacts.
Unpreserved fields are not part of the comparison. Export a JSON backup first
and review the result counts.

Keep the screen open until you accept the preview. Rotating/closing before
acceptance discards the preview without saving. An accepted import can finish
in the background even if that screen is closed; check the logbook before
repeating it. There is no persistent import service.

### Restore a JSON backup

From Home, tap Import Bricohams JSON backup and select a version 1 backup
exported by this application. The file supports up to 16 MiB and 50000 records
per table. UTF-8, format, fields, IDs, contacts, dates, coordinates, and
references between sessions/observations are validated. ADIF and JSON from
other applications are not imported.

The import is transactional: any error rolls back all its changes. New IDs
are added; identical records are retained without duplication. An existing
ID with different content cancels the import without overwriting it. Different
sessions are not merged by name. The result shows how many new records were
added. This is not a destructive restore or a complete database replacement.
## ARDF and GPS

1. Create a session or select an existing one.
2. Enter beacon 1-10 and notes.
3. Optionally, tap Get position and accept the privacy notice and Android
   precise location permission. You can continue without GPS if permission is denied.
4. With GPS enabled, wait for a recent fix; the request runs for up to
   30 seconds. A historical provider position is not used.
5. Save the observation. A fix is accepted only if it is no more than
   30 seconds old, using a monotonic clock; its accuracy and GPS UTC are
   stored separately from the observation's recording time.

Saving without a recent fix explicitly creates an observation WITHOUT
coordinates and reports that fact. It does not fabricate a position. Leaving
the screen, hiding/closing the activity, or ending the request cancels updates.
Positions marked as simulated by Android are discarded. Each fix is used at
most once for one observation; request another if you need another measurement.

The coordinate belongs to the phone, not the transmitter. There is no
triangulation, bearing, RSSI, continuous track, map, synchronization with
the firmware's RAM statistics, or automatic classification of found beacons.
Counters are manual observations. These features remain pending.

### ARDF statistics and history

In the selected session, tap Session statistics and observations. The panel
reads the persistent SQLite database and shows:

- Number of observations and how many contain coordinates.
- Interval between the first and last observation, not active time or the
  duration since session creation. Zero or one observation yields 0 s.
- Per beacon: count, first/last UTC, count with coordinates, and mean interval
  between recordings. A single observation has no mean.
- The latest 100 observations with notes, UTC, and coordinates/accuracy/fix
  time, or WITHOUT coordinates. JSON export includes them all.

The sum of GPS segments uses Haversine on a sphere with radius 6371008.8 m,
only between consecutive phone observations. Both must have declared accuracy
<=50 m and a fix 0 to 30 s before recording. Recording and fix times must
increase, with a maximum separation of 120 s. An observation without GPS,
inaccurate, old, or future breaks the chain: points on either side are not
joined by skipping over it. Repeated fixes or identical times do not create
segments. The number of segments is reported.

**This is not a complete track**, actual distance traveled, distance to a
beacon, speed, or race score. There is no GPS noise filter: drift can increase
the sum even without movement. Gaps can reduce it. Segments are not interpolated,
and observing a beacon does not imply it has been found. Imported data retains
its UTC; clock changes and provider accuracy affect results. Statistics are
recomputed without changing the data or JSON format.

## Experimental USB CDC and CAT RX

From Home, open Experimental USB CAT RX and explicitly select a device by
VID, PID, driver, and name. The phone must support USB host/OTG. **Standard CDC
ACM** with one control interface and one bulk data interface is supported, as
are recognized CH34x, CP210x, FTDI, or Prolific adapters with a single port.
Ambiguous/multiport composites are rejected; a port is never guessed.
The application requests Android USB permission before opening the device.
If the system recreates the screen when permission is granted, select it again.
There is no automatic connection when a cable is plugged in.

The USB-serial drivers come from **usb-serial-for-android 3.9.0**, with the MIT
license included in the assets and release. Only its recognized-device table
is used; an unknown VID/PID is not forced onto a driver. The dependency is
pinned and JitPack is restricted to that module. No root or external phone
driver installation is required. A cable that works as COM on Windows is not
proof of Android compatibility. Not all Quansheng USB-C ports expose data.
The implementation does not yet certify the physical UV-K5 V3 cable; OpenGD77
and AnyTone do not use this CAT protocol.

Requires the Bricohams Satellites image with CAT RX v1, based on F4HWN v6+.
Original F4HWN does not include this module because its version is recognized.
Firmware is not installed from this screen:

1. Start SAT RX on the radio and enable CAT physically with key 8.
2. Select the correct device and grant Android permission.
3. The application configures CDC to 38400, 8N1, identifies using
   `0x0514/0x0515`, and queries `0x7B00/0x7B01`.
4. Query the status or enter MHz in exact 10 Hz steps:
   136-174 or 400-470 MHz. A queued response does not mean the change was
   applied; the app queries until confirmed, with up to ten attempts.
5. Each SET lasts a **3000 ms** firmware lease. The manual panel does not
   renew it automatically. The pass tracking described below renews only
   during an explicitly started session.
6. STOP requests the nominal frequency. When the screen is hidden, unsent
   SETs are cancelled, STOP is attempted if there is remote/pending state,
   and interfaces/connection are released. USB disconnection invalidates the
   session. Returning requires reconnecting; prior tuning is not resumed.

The status is the firmware's latest response, not an RF measurement. QUERY
does not renew the lease. If the cable is disconnected, STOP delivery cannot
be guaranteed: an error is reported, and the lease restores nominal only if
the radio loop is still running. Check the frequency on the radio. CRC, XOR,
and sequence checks detect protocol failures, but are not encryption or
authentication. CAT RX does not transmit or do PTT (that is separate CAT TX),
nor does it touch firmware, EEPROM, or calibration. Channel editing is separate,
in the channel editor.

USB operations are serialized outside the UI thread, retain leftover bytes
from bulk packets, and verify partial transfers. No background services are
used. These features have simulated USB tests; OTG and RF tests with real
phones/radios are still missing.

## Quansheng USB channel editor (Beta)

Local audit correction: the physical CRC is requested in 512 sectors of
4096 bytes, not in a 2 MiB command that exceeds the `0x073E` limit. The
address, length, status, and CRC of each sector, including the last, are
checked. This correction requires rebuilding and installing the APK; it does
not change an already downloaded version. See the
[validation report](VALIDACION-INTEGRAL-V3-ANDROID.md).

Screen: “Edit Quansheng channels over USB (Beta).” This is the Android port
of the web editor: same F4HWN v6 commands, same backup, and same write with
readback. It edits existing FM channels only.

1. Choose the cable (OTG with CDC or a recognized USB-serial adapter) and
   connect. The radio is identified with `0x0514`. F4HWN v6.0 is read-only.
2. Full backup: 512 bytes of calibration, 2 MiB external Flash in 128-byte
   blocks with `0x0738`, CRC-32 checked by the radio with `0x073E`, and Main
   firmware validated by its `FMB1` header and CRC. It takes 10-20 minutes
   at 38400 baud; the screen stays on. It is saved in the app's private storage
   with `SHA256SUMS`. Requires Labs v6.1+.
3. Read channels: 41344-byte logical configuration (`0x051B`).
4. Choose a channel and edit name, RX, TX, RX and TX tone (OFF, CTCSS in Hz
   such as `88.5` or DCS such as `D023N` / `D023I`), power (USER, LOW1-LOW5,
   MID, HIGH), narrowband, and TX lock. Frequencies 136-174 and 400-470 MHz
   must be in the same band, as on the web. Other channel bits are preserved.
5. Apply to the local copy: the radio is not written yet.
6. Write: confirm, re-verify the backup by SHA-256, and check that the radio
   is still the same as when read. Hide affected channels, write 8-byte blocks
   (`0x051D`), show them again, and reread the entire configuration. If the
   readback does not match, report it and do not mark it as successful.
   VFO, settings, calibration, and banks are protected.

Disconnecting, leaving the screen, or any error closes the session: reconnect
and back up again before writing. This is not a transaction resilient to power
loss. Restart the radio after writing.
## SGP4 satellites and pass tracking

From Home open Satellites. The redesigned interface uses original Bricohams styling and code, not Look4sat assets: an AOS/LOS countdown header and **Passes**, **Map**, **Satellites**, **Settings** tabs.

The engine is **satellite.js 6.0.1** (MIT), the same UMD distribution as the web, run through **Rhino 1.7.15** (MPL 2.0). Licenses and source links are included. Engine SHA-256:
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
One shared Rhino context runs fixed assets only, never downloaded code, without Java access.

1. **Data:** Settings downloads the CelesTrak amateur TLE group (256 KiB maximum) and SatNOGS DB transmitters (16 MiB, CC BY-SA 4.0) over HTTPS. On opening or returning to Satellites, the optional automatic update runs if the catalog is missing or at least 24 h old. Failed attempts are retried automatically no sooner than 15 min later; the button retries immediately, without duplicate downloads. There is no periodic background service. Live, active transmitters must belong to catalog satellites and have a downlink in 136-174 or 400-470 MHz in 10 Hz steps. If SatNOGS fails, new TLE retain previous frequencies with a warning. Offline TLE file import remains available. Private files are written atomically. Lines must have 69 characters, valid checksum and matching NORAD; Alpha-5 and duplicate NORAD are rejected. TLE expire after seven days; epochs over 24 h in the future are rejected and the prediction window must be valid.
2. **Observer:** latitude/longitude in degrees, WGS84 height in **km** (-0.5 to 9). Use last GPS position requests location permission and copies the latest GPS/network fix with age and accuracy. Review it and Save and calculate passes. Minimum elevation is 0-60 degrees.
3. **Satellites:** search by name/NORAD, checkboxes and All, With RX, None shortcuts. The initial download selects satellites with in-band RX.
4. **Passes:** the next **24 h** fill progressively. Cards show NORAD, name, maximum elevation, local day/AOS/LOS, entry/exit azimuth, modes, countdown and progress. Sampling uses 5 s with crossings refined to 500 ms; below the horizon adaptive multiples of 5 s preserve the web grid and bound the elevation change so a crossing cannot be skipped (under 0.3 degrees/s even at 200 km). AOS/LOS use the chosen elevation threshold; maxima are sampled, not continuously optimized.
5. **Details:** tap a card or header for the polar radar (north up, horizon at edge, zenith at centre; green AOS, red LOS, orange current position interpolated between 60 SGP4 samples), live azimuth/elevation/range/Doppler, UTC times and SatNOGS downlink selection or manual MHz. Connect CAT: Doppler, SSTV and recording opens CAT with that pass.
6. **Map:** offline Natural Earth 1:110m public-domain coastlines, satellites, coverage above 0 degrees, observer and selected track for 45 min before/after. Tap to select; updates every 5 s while visible.

Position, satellite selection and last downlink per satellite persist privately, outside field JSON. No uplink is inferred; linear transponders are unsupported.

### Doppler RX for the selected pass

Selecting a pass opens CAT with a snapshot of the TLE, observer, downlink,
and window. It does not connect USB or send commands by itself. Connect the
device, enter SAT RX, and enable CAT with key 8 on the radio. Tap **Start
Doppler for selected pass** only when inside the window. It does not start
on a schedule in the background.

The orbit is propagated at the current time and radial velocity is calculated
as a range difference centered on one second. The receive correction is
`f_rx = f_nominal * (1 - velocidad_radial / 299792.458 km/s)`, rounded to
10 Hz. Nonnegative elevation, valid TLE, and an in-band RX frequency are
required. Only temporary RX SETs are sent, never TX/PTT, channels, or EEPROM.

After each confirmation, the next update waits 750 ms, even if rounding does
not change the frequency; this renews the 3 s lease. No second USB operation
is queued simultaneously. Tracking stops at pass end, TLE expiry, horizon,
disconnection/error, an unapplied response, a confirmation/interval of 2 s
or longer, repeated/backward clock, or a UTC jump relative to monotonic time
of more than 500 ms. Manual controls are locked while tracking; Stop remains
available.

Stopping, hiding the screen, or disconnecting cancels future SETs, attempts
STOP, and closes USB. Returning does not resume: reconnect and start a new
session. If STOP fails, this is reported without claiming restoration. The
lease only helps while the firmware loop continues running. The screen shows
calculations and the latest confirmation, not an RF measurement or verified
actual position. The phone/cable/firmware/radio combination still needs
field validation.

### Record the pass and find SSTV

In CAT, Record full pass (WAV until LOS) captures the microphone while Doppler remains active. Connect the radio speaker to the phone. Audio is captured at 48 kHz and averaged 3:1 into **WAV 16 kHz mono** in private storage, about 1.9 MB/min. It stops at LOS, two hours, manual stop or leaving the screen; the WAV header remains valid on errors. It cannot run alongside 60 s Robot36 reception.

Satellites, Settings, **Pass recordings** lists duration and size. SSTV scans 60 s windows every 23 s so a complete 37 s image fits, rejects duplicates less than 10 s apart and saves PNG beside the WAV. Export copies WAV to your chosen destination. Delete removes WAV and associated PNG only after confirmation and cannot be undone. Synthetic tests do not certify RF reception or real AudioRecord hardware.

### Bricohams AZ/EL rotor

From a pass detail, **AZ/EL rotor: prepare and track this pass** opens the
rotor control of [antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
over its Wi-Fi (`192.168.4.1`, the only allowed plain HTTP destination) or over
PIN-encrypted BLE. The phone sends UTC time, location, TLE and north/level
calibration from its compass; the app warns about cable-stop crossings, passes
that are too fast or overhead, moves the antenna to AOS and arms automatic
tracking while CAT corrects Doppler. Full guide in [ROTOR.md](../../ROTOR.md);
firmware patch and low-cost build in
[hardware/rotor](../../../hardware/rotor/README.md). Not tested with a physical rotor.

## Experimental Morse WAV

The picker accepts audio, but the parser requires RIFF/WAVE linear PCM mono
16-bit, 8-48 kHz, 0.1-60 seconds, and a maximum of 8 MiB. Float, stereo, MP3,
truncated data, and inconsistent lengths are rejected.

Configure the actual tone between 300 and 1200 Hz and speed between 5 and
45 words per minute. The detector uses windows of about 5 ms and Goertzel
tone energy; it interprets mark and space durations using the configured
speed. It does not automatically estimate speed or frequency. This is not
speech recognition or a statistical confidence measure. The output shows
text, dots/dashes, and an uncertainty warning; `?` identifies unrecognized
codes, not every possible error.

Weak recordings, noise, fading, tone shift, irregular timing, or incorrect
settings may produce wrong text even when `?` does not appear. Compare the
result with the audio. Keep the screen open during processing: a settings
change or activity closure can discard the result in progress. No microphone
capture or transmission occurs here.

## SSTV Robot36 from WAV

From Home, open SSTV Robot36 from WAV and tap Decode Robot36 WAV. Select
RIFF/WAVE linear PCM mono 16-bit, up to 8 MiB, 37-60 seconds, with a sample
rate of **8/16/24/32/40/48 kHz**. 44.1 kHz, MP3, float, and stereo are not
supported. This does not select images for transmission. Audio must contain
the complete header: 1900 Hz leaders, 1200 Hz break, VIS **8** with even
parity, stop, and all 240 Robot36 lines. It does not guess the mode from a
partial image or accept other VIS codes.

The custom implementation uses an FIR Hilbert transform to estimate the
instantaneous frequency and align the first porch. Timing is 150 ms per line:
9 ms sync, 3 ms porch, 88 ms luminance, 4.5 ms separator, 1.5 ms porch, and
44 ms chrominance. Luminance has 320 samples per line; chrominance has
160 samples and shares Cr/Cb between pairs of lines. YCbCr full-range is
converted to RGB and clipped to 0-255. Technical reference consulted:
[Robot36 by Ahmet Inan, fixed revision](https://github.com/xdsopl/robot36/tree/5860ded4716170b562c3e915c7eebb879742dcd4),
published as CC0. No C code or images from that project are included. This
is not a rebuild or copy of the Android Robot36 application.

Supported sample rates are reduced to 8 kHz by averaging blocks. This is not
a professional audio front end or complete alias/noise suppression. There is
no clock-drift, slant, Doppler, noise, clipped-audio, or line-recovery
compensation. Sync and the color separator are checked on each line. If data
is missing or sync is lost, the operation fails and does not offer a complete
image or an older PNG. Detecting the header/lines does not prove that every
pixel is correct.

After decoding, a **320x240** image is displayed. Save image PNG opens the
Android picker. The chosen provider may be a cloud service: choose the
location with the image's private content in mind. It is not automatically
saved to the gallery. The image remains in RAM; rotation or closing discards
the preview. Export first. If writing the PNG fails, the partial file is
 discarded.

The WAV importer does not use a microphone, USB audio, PTT, or transmit; this
screen does not change the radio frequency. Optional capture opens separately
as described below. Behavior with RF recordings and physical audio paths
still needs validation. Synthetic tests do not replace those checks.

## SSTV Robot36 over CAT: tuned reception and PTT transmission

The CAT screen has three SSTV actions below the USB connection.

**Receive.** Start pass Doppler or tune manually, connect the radio speaker
to the phone's audio input, and tap *Record Robot36 (CAT keeps tuning)*.
Recording uses the same 60 s capture as the microphone screen and does not
stop CAT tracking, which runs on another thread. Tap *Stop recording and
decode* when the image is complete.

**Transmit.** Requires the Bricohams Satellites image with CAT TX v1 (command
`0x7B02`, see `BRICOHAMS-FIRMWARE.md`). Steps:

1. Enter the callsign. **Required**: without a valid callsign, the picker does
   not open, and the callsign is printed in the image's bottom strip.
2. Connect the phone's audio output to the radio's microphone input. The
   radio's USB-C remains dedicated to CAT; the phone needs a 3.5 mm jack or
   an OTG hub with audio.
3. On the radio, in SAT RX, press key 9: `CAT TX ARMED`.
4. Tap *Send Robot36 over CAT PTT*, choose the image (scaled to 320x240), and
   confirm the dialog showing frequency, callsign, and duration (~37 s).

The app checks PTT and does not transmit if the radio is not armed, the limit
has been reached, or TX is rejected. It activates PTT, waits for radio
confirmation, and only then plays audio, renewing the lease every 400 ms. If
renewal fails (key pressed on the radio, limit, lock) or the screen enters
the background, audio stops, PTT is released, and this is confirmed by a
readback. If readback fails, the radio releases PTT on its own after 1.5 s.
Audio is limited to 110 s, below the radio's 120 s cutoff.

Transmission uses the radio VFO's TX frequency, without uplink Doppler
correction, and is not allowed during pass tracking. A license and an
authorized SSTV frequency are required. **Not validated on a radio or RF.**
## Morse and Robot36 microphone capture

From Home, tap Receive Morse / Robot36 with microphone. Select a mode;
for Morse, enter tone from 300 to 1200 Hz and speed from 5 to 45 wpm.
Robot36 ignores those two fields. `RECORD_AUDIO` permission is requested only
when tapping Start audio capture. **Granting permission does not record**:
you must tap Start again. Denial does not prevent WAV import or other
features. No capture starts when the application opens.

Input is system AudioRecord/MIC, 16-bit mono PCM at 48 kHz. Android selects
the input device; there is no route selector, radio volume control, or guarantee
of compatibility with a USB audio adapter. A CAT cable does not carry audio.
If the hardware does not support this format, opening fails, or the input
disappears, an error is shown and the resource is released; audio is not
fabricated. First test with a known signal and check level, clipping, and route.

Start before the Robot36 header. At least 37 s and a complete image with the
same sync limits as the WAV importer are required. Tap Stop and decode when
the signal ends. Capture stops automatically at **60 seconds**, by sample
limit and timer; it is not padded with silence. Audio is kept only in memory
during the operation. No WAV is written or sent over the network. A Robot36
image can be saved as PNG with the Android picker; Morse audio displays text,
dots/dashes, and an experimental warning.

Cancel and discard audio, leave, lock the phone, open another activity, or
rotate to stop capture when the app loses foreground, release the microphone,
and discard the pending result. **It does not resume** on return. The image
preview does not survive rotation. There is no service, background recording,
PTT, TX, or continuous streaming decode: capture first, decode afterward.
A correct synthetic result does not validate real RF reception or a phone's
microphone path.

## Build

Requirements: JDK 17, Android SDK 35, Build Tools 35.0.0, and access to the
official dependency repositories during the first build. SDKs, JDKs,
certificates, and debug keys are not included in the repository.

```powershell
$env:JAVA_HOME = 'C:\ruta\jdk-17'
$env:ANDROID_HOME = 'C:\ruta\android-sdk'
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

The wrapper uses Gradle 8.9 with the official SHA-256 pinned. AGP 8.7.3 and
Kotlin 2.0.21 are pinned. The application uses Android views and platform
SQLite, without Compose, Room, or a backend: this reduces runtime dependencies
and allows real storage and permissions to be checked first. Runtime libraries
are usb-serial-for-android 3.9.0 and its AndroidX annotations, Rhino 1.7.15,
and satellite.js 6.0.1 embedded as an asset. JUnit, Robolectric, and AndroidX
Test are test-only. Their licenses do not replace those for Android, Gradle,
or the project.

Outputs:

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Reports in `android/app/build/reports/`.

To deliver a verified set on Windows with the same requirements:

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.9.0-beta'
```

The destination must be new. The script runs tests/lint, verifies APK
signatures, and includes the application, instrumented APK, guide, licenses,
`build-info.json`, and `SHA256SUMS`. The manifest identifies revision, dirty
state, sources by hash, capabilities, and unavailable features. It always
states that the signature is debug and physical testing is pending; a build
does not become a stable release.

With a test phone/emulator connected and authorized by ADB:

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Use a test device. Each instrumented persistence test remaps `bricohams.db`
to a private `instrumentation-<UUID>.db`; it does not open or clear the real
logbook and deletes only its own database. The test APK is not the everyday
application.

## Validation performed and pending

The initial historical validation covered 84 host tests: five for
models/ADIF, four for ADIF import, three for audio, eight for storage/UI,
eight for CAT protocol, two for CAT screen, five for channel codec, five for
Quansheng memory/backup/write, eight for simulated USB CDC/serial, four for
the Robot36 core (including encoder round trip), two for SSTV screen, four
for SSTV CAT PTT transmission with simulated radio, three for SGP4/TLE, four
for tracking, two for satellite screen, five for PCM capture, six for
microphone screen, and six for ARDF statistics. They check SQLite after
close/reopen, update/delete, JSON export, null/valid coordinates, screen
startup, saving and activity recreation, UTC ordering with fractions, and
idempotent JSON restore with rollback for conflicts/invalid data. Synthetic
audio is checked at 8/16/44.1/48 kHz and 5/15/30/45 wpm, including silence
and incorrect tone. These are not error measurements on real recordings.
ARDF checks 222.39016 m across the equator's date line (0.01 m tolerance),
UTC ordering, per-beacon averages, sessions isolated after SQLite
close/reopen, and history display. Gaps, accuracy, old/future/repeated fixes,
simultaneous records, and duplicate IDs are tested. These are not field GPS
measurements. Capture checks exactly 2880000 samples at the 60 s limit,
manual stop without padding, cancellation before opening and during a blocking
read, explicit errors, and release. The screen checks permission without
auto-start, known Morse decoding and Robot36 320x240 from simulated input,
recovery after failure, timer, and cancellation on exit without resuming.
These are not AudioRecord tests on real hardware.

CAT checks CRC against a known vector, frames of all lengths, upstream `FFFF`
response CRCs, identification, noise/timeout, sequence and wrap, bands, SET
cancellation, and the difference between queued/applied. CDC checks permissions,
unambiguous selection, configuration, partial writes, one packet read across
multiple calls, failures, and close. Serial adapters check driver selection
by VID/PID, rejection of multiport/unknown devices, 38400 8N1 parameters,
partial reads, error propagation without repeating SET, and close on
configuration failure. The integration test exercises screen, identification,
CAT RX SET, and STOP before closing when the activity is hidden, using a
simulated device. Channels: tone, power, and flag reads; edits changing only
channel bytes; all 50 CTCSS and 104 DCS round trips; rejections without touching
the copy. A simulated F4HWN radio checks full backup (radio CRC, Main,
calibration), SHA-256 on disk, web write order, readback, and locks for
settings, modified radio, v6.0, CRC, and rejected block. The subsequent audit
adds checks for all 512 CRC sectors, incorrect response metadata, physical
reads without identification or with ranges that overflow an integer, and
backup/write cancellation. The editor session is tied to foreground state
and its generation: leaving, disconnecting, or invalidating it prevents the
next USB exchange and discards old tasks that have not started. A command
already sent may have been applied; cancellation does not roll back or make
a write atomic. Keep the backup and repeat identification, read, and verification
before writing again. Screen tests check errors without USB and deletion of
editing copies on exit, with no automatic resume. After an error, the transport
is closed and a new connection is required, not just another tap on Backup.
Current results, separate from published main and physical testing, are in
the [validation matrix](VALIDACION-INTEGRAL-V3-ANDROID.md).
ADIF checks round trip, tags inside comments, optional header, minute-only
times, unpreserved fields, truncated/invalid records, and ASCII. SQLite checks
duplicates and rollback using an injected real insertion failure. The UI tests
search after rotation and preview cancellation/acceptance. SSTV checks 320x240
geometry, timing, grayscale levels at 8/16/48 kHz, and RGB/CMY bars at 8 kHz:
maximum error of 12 levels per channel at tested interior gray points and 15
at tested color points. It rejects other VIS codes, incorrect parity, silence,
missing lines, and unsupported sample rates/durations. The UI exports a PNG
that is reopened and verified as 320x240, and offers no export after failure.
Error rates and quality on real recordings have not been measured. SGP4 checks
a fixed test TLE against the web: epoch, azimuth/elevation (0.00001 degree
tolerance), range (1 m), AOS/LOS (500 ms), maximum, and Doppler in 10 Hz steps.
Checksum, age, bands, window, renewal with no frequency change, cancellation,
discontinuous clock, late/pending response, and USB errors are checked. The
combined test applies calculated Doppler to a simulated CAT radio and restores
nominal with STOP. The UI imports a catalog, calculates passes offline,
transmits the selected snapshot, and rejects an expired pass without SET while
closing USB.

The APK and instrumented APK build. Lint completes with no errors; it retains
warnings for newer test dependency versions, the original icon shape, and
typography. These are not suppressed or treated as functional failures.

No Android phone is connected and no emulator has been run in this validation.
Instrumented tests are compiled, **not run**. Installation, usability and
permissions on a phone, real GPS, real audio routes, and all features marked
as unimplemented remain pending.