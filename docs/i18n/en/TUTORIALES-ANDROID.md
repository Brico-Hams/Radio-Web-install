# RadiCodex by BricoHams Tutorials

Step-by-step guide to the single RadiCodex by BricoHams APK (`org.bricohams.radicodex`, native Kotlin app). Each tutorial gives the goal, what you need, the steps with the exact on-screen texts, the expected result and the usual errors. The full technical scope and limitations are in [RadiCodex by BricoHams](ANDROID.md). Features marked as experimental have no validation with a real radio: try them first with a dummy load or in receive-only mode.

## Before you start

### Installation and requirements

**Goal:** have the APK installed and working.

**You need:** a phone with Android 8.0 (API 26) or later. The app needs no server and no account.

1. Download the APK and check its published SHA-256 (see [RadiCodex by BricoHams](ANDROID.md)).
2. Open the file from the file manager or the browser. Android will ask you to authorize installing from that app: accept it only for this step.
3. The APK is not distributed through Google Play. Debug APKs use the debug key; the release APK `RadiCodex-1.0.0.apk` is signed with the release key only if the release includes it (check its SHA-256).
4. Open RadiCodex. You will see the notice "Local data. Export your data before uninstalling."

**Expected result:** the main screen with the sections "Your radio workspace", "Radio and reception", "Your data and backups" and "Scope and privacy".

**Common errors:**

- Android blocks the installation: you still need to authorize installing from the app that opens the APK.
- Uninstalling the app deletes the local data (private SQLite): use "Export all data as JSON" first.

### Permissions and why they are requested

RadiCodex does not collect or send data. These are the manifest permissions and their purpose:

| Permission | What it is used for |
| --- | --- |
| Location (precise and approximate) | A one-off GPS position in ARDF and "Use last GPS position" in Satellites. There is no background tracking |
| Microphone | Only when you press "Start audio capture" or receive SSTV in CAT multi-radio. Granting it does not start recording |
| Internet and network state | HTTPS download of TLEs (CelesTrak) and frequencies (SatNOGS) and the Wi-Fi link to the rotor (192.168.4.1) |
| Bluetooth (scan and connect) | AZ/EL rotor over BLE |
| USB host | Radios over an OTG cable. Android asks for permission for each device and never connects by itself when you plug it in |

Microphone, GPS, USB host, BLE and compass are not required to install the app: without them only the matching features are disabled.

### Choosing the language

1. On the main screen open "RadiCodex language".
2. Choose "System language", Español, English (US), Français or Deutsch.

**Expected result:** the language is saved on the phone and applied to all screens. Callsigns, channel names and user files are not translated.

## Tutorials

### 1. Logbook

**Goal:** record contacts, search them and move data safely.

**You need:** only the phone. It works offline.

**Add a contact**

1. Open the "Logbook" tab. For a POTA or SOTA logbook, create one under "Logbooks": fill in "Logbook name", "Park or summit reference (blank for General)" (examples EA-0123 and EA4/MD-001), "My station call" and press "Create logbook".
2. Type "Callsign" (3 to 20 characters: letters, numbers and /).
3. Leave "UTC ISO (example 2026-10-25T16:00:00Z)" empty to use the current time when saving, or type the date.
4. Fill in "Frequency MHz", the mode, "Report sent", "Report received" and "Notes".
5. Press "Save new contact".

**Expected result:** the contact is saved on the phone; callsign and notes are cleared and frequency and mode are kept. If the same callsign, band and mode already exist, a warning appears with "Do not save" or "Save anyway". To edit, tap the contact and use "Save contact changes", "Cancel editing" or "Delete this contact" (asks for confirmation).

**Search**

1. Type in "Search this logbook: call, notes, mode or frequency".
2. Press "Search contacts"; to see everything again press "Show all contacts".

The 50 most recent matches are shown; exports include the whole logbook.

**Import ADIF with preview**

1. Press "Import ADIF into this logbook (preview)" and choose the file.
2. Review the preview: it lists the "Fields NOT kept" and skips identical contacts. Nothing is saved until you accept.
3. Accept to import in a single transaction.

Only ASCII ADIF up to 16 MiB and 50000 contacts is accepted. Make a JSON backup first.

**JSON backup and restore**

1. To save: "Export all data as JSON" (main screen) or "Export full JSON (with accents)" (logbook).
2. To restore: "Import Bricohams JSON backup", dialog "Import local backup", "Choose JSON". It never overwrites: if an ID conflicts, the whole import is cancelled.

**Export for LoTW**

1. Press "Export this logbook as ADIF (ASCII)".
2. Sign and upload the file with TQSL on a computer: this APK does not upload to LoTW.

**Common errors:**

- Callsign rejected: it must contain letters, numbers and /.
- POTA or SOTA reference in the wrong format (EA-0123, EA4/MD-001).
- ADIF with UTF-8 or control characters: not accepted; keep the original.

### 2. ARDF and GPS

**Goal:** note beacon observations with the phone position.

**You need:** location permission and open sky for the GPS (optional: you can save without coordinates).

1. In the "ARDF" tab, type "New session name" and press "Create ARDF session" (or "Select session").
2. Enter "Beacon (1-10)" and "Observation notes".
3. Press "Get GPS position once (30 s)" and accept the "Position for ARDF" dialog. Wait for the position.
4. Press "Save manual observation".
5. Press "Session statistics and observations" to review and "Export sessions and contacts as JSON" to save.

**Expected result:** the observation is saved with the phone position (not the beacon position) if there is a recent fix; otherwise it is saved without coordinates. Each position is used for one observation only and simulated ones are discarded. The statistics add GPS segments with accuracy of 50 m or better, age of 30 s or less and separation of 120 s or less; they are not a complete track.

**Common errors:**

- "No recent position after 30 s": look for open sky or enable the GPS.
- GPS disabled or no permission: the observation is saved without coordinates.

### 3. USB CAT RX (F4HWN, experimental)

**Goal:** tune the receiver of a Quansheng running the Bricohams SAT RX v1 image (F4HWN v6+ base).

**You need:** USB OTG data cable (CDC ACM or a single-port CH34x, CP210x, FTDI or Prolific adapter). CAT works over USB only, not Bluetooth.

1. On the radio enable SAT RX and press key 8 (`CAT READY RX`).
2. In the app open "Open experimental USB CAT RX" (screen "USB / CAT radio") and press "Choose USB device".
3. Accept the Android USB permission.
4. Press "Query CAT RX" to confirm the state.
5. Type "RX frequency MHz (up to 5 decimals)" (10 Hz steps, VHF 136-174 or UHF 400-470) and press "Tune RX (renewed until STOP)".
6. To finish, "STOP: return to nominal RX" and "Disconnect USB".

**Expected result:** the app renews the tune every 1.2 s; if it stops renewing, the radio returns to nominal RX after 3 s. Keys 4, 5 and 6 on the radio return to manual mode.

**Doppler for a pass:** from Satellites pick a pass, connect CAT and press "Start Doppler for the selected pass" (only inside the pass window); "Stop tracking and disconnect USB" ends it.

**Common errors:**

- No device: check the OTG adapter, the cable and the firmware; an arbitrary device is never used.
- USB permission rejected or expired: choose the device again.
- USB disconnected: choose the device again before using CAT.

### 4. Quansheng channel editor (Beta)

**Goal:** change the name, frequencies, sub-tones and power of existing FM channels on F4HWN v6.

**You need:** USB OTG cable, Labs v6.1 or later firmware (F4HWN v6.0 is read-only) and 10 to 20 minutes for the backup.

1. Open "Edit Quansheng channels over USB (Beta)" ("Quansheng channels") and press "1. Choose USB device and connect".
2. Press "2. Full backup (2 MiB Flash, 10-20 min)". The backup is saved and verified in the app's private storage with SHA256SUMS; copy it off the phone.
3. Press "3. Read channels from the radio".
4. Press "4. Choose channel" and edit Name (1-10 ASCII), RX (MHz), TX (MHz), RX tone and TX tone (OFF, CTCSS in Hz such as 88.5, or DCS such as D023N / D023I), Power (USER, LOW1-LOW5, MID, HIGH), Narrow band (12.5 kHz) and "Lock TX on this channel".
5. Press "5. Apply changes to the local copy".
6. Press "6. Write to the radio and read back" and confirm the "Write channels to the radio" dialog.
7. Restart the radio when it finishes.

**Expected result:** "Write verified by read-back". The write is not power-fail safe: do not disconnect or switch off the radio.

**Common errors:**

- "Write blocked": the complete verified backup for this session is missing.
- Any error, disconnection or leaving the screen invalidates the session: reconnect and repeat the backup.
- RX and TX must be in the same band (136-174 or 400-470 MHz).
- Check that frequencies, tones and power are legal for you.

### 5. OpenGD77 over USB

**Goal:** see the screen of an OpenGD77 radio and set its clock to UTC.

**You need:** an OpenGD77 radio and an OTG data cable.

1. Open "OpenGD77 over USB: screen and clock" and press "Choose USB device"; accept the permission.
2. The app shows the model, the firmware and "USB functions" with "Supported" or "Not supported".
3. Press "Capture screen" to see the radio screen.
4. Press "Sync UTC clock" and reopen the radio's Satellite menu to recalculate the passes.
5. Use "Check link" to test the connection and "Disconnect USB" when you finish.

**Expected result:** "Screen captured.", "Clock sent" or "Link OK.". OpenGD77 has no tuning CAT over USB: there is no frequency, mode, channel, PTT or Doppler from the phone, and the Flash is never written.

**Common errors:**

- "No USB CDC radio connected": use an OTG data cable.
- Unknown identification: the app does not assume any model.

### 6. CAT multi-radio

**Goal:** control frequency, mode, memories, satellites and digital modes of a radio over USB.

**You need:** USB OTG cable or the radio's interface. Models in the "Radio model" list: Yaesu FT-817/FT-817ND, FT-818ND, FT-857/FT-857D, FT-897/FT-897D (4800 baud), Icom IC-705 (115200, CI-V address A4 by default), Yaesu FTX-1 (38400, MAIN firmware 1.08 or later, Enhanced COM CAT-1 port) and (tr)uSDX (115200 with firmware 2.00t or later; 38400 as fallback). Physical tests are pending: these radios are not certified.

**Connect and tune**

1. Open "CAT multi-radio (FT-817, FT-857, IC-705, FTX-1, (tr)uSDX)" ("Bricohams CAT multi-radio").
2. Under "Radio" choose "Radio model", check "Baud rate" (on the IC-705 also "CI-V address (hex)"), press "Choose USB device" and "Connect".
3. Under "Frequency and mode" type "Frequency (MHz)" and press "Set VFO A" or "Set VFO B".
4. Choose "Mode" (LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV) and press "Set mode"; "Read" refreshes the reading.
5. "PTT test 3 s" opens the "PTT test" dialog: it requires a callsign, transmits for 3 s and needs a suitable antenna or dummy load.

**Memories**

1. Under "Memories" enter "From channel" and "To channel" (maximum 100 per read; limits IC-705 0..99, FTX-1 1..999, others 1..99) and press "Read memories".
2. Only the IC-705 and FTX-1 can read memories. The FT-817/857/897 and the (tr)uSDX cannot.
3. Tapping a row offers "Tune" (applies to VFO A) and, on the FTX-1 only, "Edit".
4. Memory writing (FTX-1 only): "New channel" or "Edit" opens "Memory channel" with Channel, RX frequency (MHz), Mode, "Name (max. 12 characters)" and "Split TX frequency (MHz, empty = simplex)". Press "Save"; if the channel already has data, you must confirm the replacement.

**Expected result:** "Channel N saved and verified." after a read-back.

**Satellite and saving to memory**

1. From a pass in Satellites press "Open in CAT multi-radio", or type "Downlink (MHz)", "Uplink (MHz, optional)" and "Doppler step (Hz)" (1 to 5000, default 100).
2. Press "Start tracking"; "Stop tracking" ends it. With an uplink, split is used; the FT-817 family reprograms the uplink on VFO B at most every 5 s.
3. FTX-1 only: "Save transponder to memory" opens the editor with the downlink, uplink and satellite name (maximum 12 characters) in the first free channel.

**"Digital modes" card**

1. Choose "Digital mode", "Band and frequency" and "Period".
2. Press "Tune": it sets VFO A to the dial frequency and the data mode (DATA_U on the FT-817/818/857/897 and FTX-1; USB on the IC-705 and (tr)uSDX; on the IC-705 enable DATA ON on the radio).
3. The UTC clock line shows the next even or odd slot. If "Automatic time is off: FT8 needs the clock within ±1 s." appears, enable Android automatic time.
4. To use an external modem (FT8CN, JS8Call or another app) press "Release port for a digital app" and select the same radio in that app.

Standard dial frequencies offered by the app (MHz; only those inside the radio's range are shown; they are community frequencies: verify them locally):

| Mode | Periods (s) | Dial frequencies |
| --- | --- | --- |
| FT8 | 15 | 1.840, 3.573, 5.357, 7.074, 10.136, 14.074, 18.100, 21.074, 24.915, 28.074, 50.313, 144.174 |
| FT4 | 7.5 | 3.575, 7.0475, 10.140, 14.080, 18.104, 21.140, 24.919, 28.180, 50.318, 144.170 |
| JS8 | 15, 30, 10, 6 | 1.842, 3.578, 7.078, 10.130, 14.078, 18.104, 21.078, 24.922, 28.078, 50.318, 144.178 |
| WSPR | 120 | 0.136, 0.4742, 1.8366, 3.5686, 5.2872, 7.0386, 10.1387, 14.0956, 18.1046, 21.0946, 24.9246, 28.1246, 50.293, 144.489 |
| Q65 | 15, 30, 60, 120, 300 | 50.275, 144.116 |
| JT65 | 60 | 1.838, 3.570, 7.076, 10.138, 14.076, 18.102, 21.076, 24.917, 28.076, 50.310 |
| JT9 | 60 | 1.839, 3.572, 7.078, 10.140, 14.078, 18.104, 21.078, 24.919, 28.078 |
| FST4 | 60, 120, 300, 900, 1800 | 0.136, 0.4742 |
| FST4W | 120, 300, 900, 1800 | 0.136, 0.4742 |

Digital modes and memories are listed as pending validation on a real phone.

**Common errors:**

- "This radio cannot read memories": that radio does not support reading.
- Frequency outside the radio's range: the message states the supported range.
- The connection closes when you leave the screen or unplug the USB: connect again.
- IC-705: it exposes two serial ports; choose the right one ("port N").

### 7. Satellites

**Goal:** calculate passes offline (SGP4), follow them on the map and radar and receive with Doppler.

**You need:** the observer position and, to update the catalog, an Internet connection. Afterwards it works offline while the TLEs are no older than 7 days.

1. Open "Open SGP4 satellites and passes" ("Bricohams Satellites"). If the catalog is missing or 24 h old or more, it updates by itself (HTTPS with CelesTrak and SatNOGS; your location is not sent). To do it by hand use "Update TLE and frequencies" or "Import TLE file" in the "Settings" tab, where automatic updating can also be disabled.
2. In "Settings" enter latitude, longitude, height (km, WGS84 ellipsoid) and minimum elevation (0-60), or press "Use last GPS position", then "Save and calculate passes".
3. In "Satellites" choose with "Search by name or NORAD", "All", "With RX" or "None".
4. In "Passes" you will see the next 24 h with the AOS and LOS countdown. Open a pass to see the polar radar (green AOS, red LOS, orange current position) and the list of downlinks ("Downlink for CAT RX", "Other frequency (MHz)").
5. In "Map" satellites, footprint and a ±45 min track appear, refreshed every 5 s; tap a satellite to select it.
6. To receive: "Connect CAT: Doppler, SSTV and recording" (Quansheng, see tutorial 3) or "Open in CAT multi-radio" (tutorial 6).
7. To record a pass: on the connected CAT press "Record full pass (WAV until LOS)" and "Stop pass recording"; the WAV is 16 kHz mono and stops at LOS, after 2 h or when you leave the screen.
8. To search for SSTV: in "Settings" open "Pass recordings" and press "SSTV" (it scans 60 s windows every 23 s for Robot36 images); there are also "Export" and "Delete" with confirmation.

**Expected result:** passes with AOS, maximum and LOS. Doppler over CAT only corrects reception (Quansheng); there is no uplink correction on the Quansheng.

**Common errors:**

- No passes: the observer has not been saved in "Settings".
- Expired TLEs (older than 7 days): update the catalog.
- After a failed download, automatic updating waits 15 minutes.

For bands and an introduction to reception see [Introduction to satellite reception](INICIACION-SATELITE.md).

### 8. AZ/EL rotor

**Goal:** point a rotor at the selected pass.

**You need:** the Bricohams rotor over Wi-Fi (192.168.4.1) or "secure Bluetooth" (6-digit PIN, BLE), the 24 to 128 ASCII character token set over USB on the rotor, and the physical emergency stop within reach. There is no test with a physical rotor.

1. In a pass detail press "AZ/EL rotor: prepare and track this pass".
2. Choose Wi-Fi or Bluetooth, enter the token or the PIN and press "Connect".
3. Press "Homing (find limit switches)".
4. Press "Calibrate north and level with the phone": with the phone flat on the boom and its top towards the elements, use "Use compass heading" or type "True azimuth of the antenna (0-359.9°)", tick "I confirm the mast is level" and press "Calibrate".
5. Press "Send phone time and location" (firmware 0.3.0-prototype supports it; the API 1 firmware uses GNSS time).
6. Press "Prepare pass: load TLE and point at AOS" and read the cable-cut warning.
7. Press "Follow automatically from AOS"; "Cancel automatic tracking" stops it.

**Expected result:** the rotor points at AOS and follows the pass with the screen kept on.

**Common errors:**

- 409: another client controls the rotor.
- BLE link lost while moving: the rotor enters a fault; use "Clear fault (requires new homing)".
- The rotor stops at the cable stop, above 89° or if the satellite is faster than the motor.
- "STOP motors" halts the movement at any time. Details are in the rotor guide in the repository (docs/ROTOR.md, Spanish only).

### 9. Live audio reception

**Goal:** capture audio with the microphone and decode it afterwards as Morse or SSTV.

**You need:** microphone permission and the radio audio playing near the microphone.

1. Open "Receive Morse / Robot36 with microphone" ("Audio reception").
2. Choose Morse or SSTV. For Morse set "Morse tone (300 to 1200 Hz)" and "Morse speed (5 to 45 WPM)".
3. Press "Start audio capture". If Android asks for permission, grant it and press again: the permission does not start recording.
4. Press "Stop and decode" (or "Cancel and discard audio").

**Expected result:** the audio (mono PCM 48 kHz, up to 60 s for Morse or 200 s for SSTV) stays in memory only and is neither saved nor transmitted. Leaving the screen cancels the capture. Decoding is experimental.

**Common errors:**

- SSTV needs the complete VIS header: start before the transmission.
- No microphone permission: you can still use the WAV importers.

### 10. Morse

**Goal:** turn Morse text or a WAV file into text.

1. In the "Morse" tab type dots and dashes (space between letters, `/` between words, `?` for an unknown code) and press "Interpret Morse text".
2. For a file (experimental): set "Tone (300-1200 Hz)" and "Speed (5-45 words/minute)" as whole numbers and press "Import and decode Morse WAV".

**Expected result:** the decoded text. The WAV must be mono 16-bit PCM, 8 to 48 kHz, 0.1 to 60 s and up to 8 MiB. It is not an adaptive decoder: verify the result.

**Common errors:**

- Tone or speed out of range or not whole numbers.
- Stereo WAV or another format.

### 11. SSTV Robot36 (WAV, microphone and transmission)

**Goal:** decode SSTV images and, optionally, transmit one with CAT PTT (experimental).

**Decode a WAV**

1. Press "Open SSTV Robot36 from WAV" ("SSTV from audio") and "Decode SSTV WAV".
2. Choose a mono 16-bit PCM WAV, 8000-48000 Hz, up to 200 s and 24 MiB, with a complete VIS header (modes Robot36/72, Martin M1/M2, Scottie S1/S2, PD90/120/180).
3. Press "Save PNG image" before leaving or rotating the screen: the image only lives in memory.

**Receive with the microphone:** use tutorial 9 with SSTV, or on the CAT RX screen "Record SSTV (CAT keeps tuning)" and "Stop recording and decode".

**Transmit with CAT TX and PTT (experimental, no RF validation)**

1. You need a license, a frequency authorized for SSTV and an audio cable from the phone to the radio microphone input.
2. On the radio, in SAT RX, arm PTT with key 9 (`CAT TX ARMED`).
3. On the CAT screen type "Callsign (required)": it is printed on the image.
4. Choose the mode in "SSTV mode (only those that fit the 110 s transmission limit)" (TX: Robot36/72, Martin M2, Scottie S2, PD90).
5. Press "Send SSTV via CAT PTT" and confirm "Transmit" in the "Transmit SSTV" dialog.
6. To stop, "Cancel / Stop TX (releases PTT)" or any key on the radio.

**Expected result:** image sent with PTT released and confirmed by the radio; the app does not measure RF. CAT multi-radio also has "Send image", "Stop TX", "Receive SSTV" and "Stop receiving".

**Common errors:**

- Rejection because of TX lock, band, battery or modulation on the radio.
- Without arming with key 9 or without a callsign nothing is transmitted.
- Nothing is transmitted during pass tracking.

### 12. Own digital modes

**Goal:** receive and generate `FT8`, `FT4` and `FT2` with the RadiCodex decoder, with no other apps.

1. Press "Digital modes FT8 / FT4 / FT2" on the main screen, or "Built-in decoder and TX" in the CAT digital modes card.
2. Choose the mode: `FT8` (15 s slot), `FT4` (7.5 s) or `FT2` (3.75 s, candidate). You will see the UTC clock and the slot.
3. To receive press "Listen" (microphone or Android USB audio input) or "Decode WAV". `FT4` and `FT2` receive is not available yet.
4. To transmit enter your callsign and a message containing it, then press "Save WAV" or "Transmit in the next slot". The app does not key PTT: use the operator's PTT or VOX. "Stop TX" stops at once.

**Expected result:** the list shows UTC, SNR, DT, Hz and message; the transmission plays once, 0.5 s after the slot starts.

**Common errors:**

- Invalid message, no callsign, or tone outside 100-5000 Hz.
- Without microphone permission it cannot listen.
- `FT2` is a legacy candidate, validated against one external receiver only.

## Frequently asked problems

- No USB device appears: use an OTG data cable (not charge-only) and check that the radio is in the right CAT mode.
- Android does not grant the USB permission: choose the device again; the permission expires or is per device.
- The app goes back to nominal RX: the tune was not renewed in time (3 s without renewal).
- No passes appear: save the observer and update the TLEs.
- I lost my data after reinstalling: uninstalling deletes the local database; export the JSON first.
- Italian does not appear in the app: the app only offers Español, English (US), Français and Deutsch; the guide is available in Italian.
- General configuration help: [Configuration help](AYUDA-CONFIGURACION.md). OpenGD77: [OpenGD77 help](AYUDA-OPENGD77.md).

## Safety when transmitting

- Transmit only with a license, on a frequency you are authorized to use, and with a dummy load or suitable antenna and minimum power during tests.
- A callsign is required for SSTV over CAT and for the PTT test; it must contain letters, numbers and /.
- PTT limits: the radio cuts off at 120 s and the app limits audio to 110 s; the "PTT test 3 s" lasts 3 s; the app renews PTT every 400 ms and the radio releases it after 1.5 s if the app fails.
- Any radio key aborts the transmission; nothing is transmitted during pass tracking.
- Do not transmit towards inactive satellites or in segments that are not yours; compliance with regulations is your responsibility.
- Transmit functions are experimental and have no RF validation.

## Demonstration video

Video showing the main screens (the tutorials have more detail): [bricohams-android-demo.mp4](../../media/bricohams-android-demo.mp4).

Chapters, in the order of the tutorials:

1. Start and language.
2. Logbook.
3. ARDF and GPS.
4. Morse.
5. Satellites.
6. Multi-radio CAT.
7. Radios over USB: F4HWN CAT RX, OpenGD77 and Quansheng channel editor.
8. Audio and SSTV Robot36.
9. Digital modes FT8, FT4 and FT2.
