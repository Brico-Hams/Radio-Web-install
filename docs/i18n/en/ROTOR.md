# Bricohams AZ/EL rotor from the Android app

Integrates the Android app with the rotor of the sister project
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
(ESP32 + two stepper motors + limit switches). Together they make up the
complete Bricohams satellite station:

```
 Satélites (SGP4, TLE, pases) ──► Rotor AZ/EL (ESP32, SGP4 propio) ──► antena
          │                         ▲  Wi-Fi 192.168.4.1 o BLE seguro
          └──► CAT USB (Doppler) ───┼──► radio Quansheng con firmware Bricohams
                                    └── móvil: hora UTC, ubicación, norte (brújula), nivel
```

The phone acts as the rotor's **GPS, clock, compass, and inclinometer**, so the
station does not need those modules. The rotor follows the pass with its own SGP4 and
its safety limiters; the app prepares it, arms it, and watches over it while CAT
corrects the radio's Doppler in parallel.

## Requirements

- Rotor with antennaSatCommrotor firmware `0.3.0-prototype` or later
  (API 2, includes the change from [hardware/rotor](../../../hardware/rotor/README.md))
  to use the phone's time. With older firmware (API 1) the app works,
  but the UTC time must come from the rotor's GNSS.
- Control token configured over USB on the rotor (24-128 characters) and, for
  BLE, the rotor's 6-digit PIN.
- Location configured in Satellites › Settings (or that of the selected pass).

## Usage flow

1. In **Satellites**, open a pass and tap **Rotor AZ/EL: prepare and track this
   pass**. The screen calculates the trajectory (300 points) and compares it with the
   rotor's mechanics.
2. Choose **Rotor Wi-Fi** (connect to its network beforehand; the app forces the traffic
   over Wi-Fi even if it has no internet) or **Secure Bluetooth** (pair with the
   PIN the first time). Enter the token and tap **Connect**.
3. **Homing**: finds the AZ and EL limit switches. After homing the antenna
   rests at EL 0° pointing at the **cable cutoff** (mechanical AZ -180°).
4. Before calibrating, the app indicates **which true heading to leave the cable
   cutoff toward** so that the pass does not cross it (middle of the arc of sky that the pass does not
   visit). Turn the tripod toward that heading.
5. **Calibrate north and level with the phone**: rest the phone flat on the boom,
   with the top toward the elements. The app uses the rotation vector,
   corrects the magnetic declination with Android's WMM model, and averages the
   latest readings; it also checks that the phone is level (±1°). You can
   enter the azimuth by hand if there is no compass or there is metal nearby.
6. **Prepare pass**: sends UTC time and location, loads the TLE (only that
   satellite, id 0), selects it, and moves the antenna to the AOS point.
7. **Track automatically from AOS**: the app keeps the screen on and,
   starting 1 s before AOS, requests `/api/track` every 2 s. If the rotor replies that the
   antenna is more than 15° off (acquisition), it re-points it to where the satellite
   will be and retries. It disarms at LOS or if the rotor enters a fault.
8. Open **CAT** on the same pass for the radio's Doppler: both work at the
   same time.

**STOP motors** is always at the top and disarms automatic tracking.

## Plan warnings

- **Cable**: the firmware stops if the mechanical azimuth would cross ±180°. With the
  rotor calibrated, the app warns and proposes the new cutoff heading.
- **Speed**: if the pass demands more °/s than the motor profile, the rotor
  stops near the maximum. The firmware's `esp32_nema17` profile goes from 2.25 to
  ~5.9°/s.
- **Zenith**: above 89° the firmware stops tracking.
- The percentage of the pass that can be tracked without stops is shown.

## Safety

- Keep the physical emergency stop within reach: the app does not replace it.
- With BLE, if the link drops while the rotor is moving, the firmware enters
  **fault** on purpose; you must **Clear fault**, repeat homing, and calibrate.
- The time sent by the app is valid for **10 minutes**; as long as the rotor screen
  is open the app resends it every 60 s. If the rotor has a valid GNSS fix, that
  takes priority.
- There is only one owner of the motion: if another client (web, BLE) controls the rotor,
  the app receives 409 and displays it.

## Technical details

| Piece | File |
| --- | --- |
| Protocol (JSON HTTP/BLE, 20-byte frames, TLE 3LE) | `android/.../RotorProtocol.kt` |
| Typed client and HTTP transport bound to Wi-Fi | `RotorClient.kt` |
| BLE transport with encrypted pairing (MITM) | `RotorBle.kt` |
| Cable, speed, zenith plan, and suggested cutoff | `RotorPlanner.kt` |
| Compass + level with declination | `RotorCompass.kt` |
| Screen | `RotorActivity.kt` |

- Cleartext HTTP only to `192.168.4.1` (`network_security_config.xml`);
  the rest of the app still requires HTTPS. Every request carries `X-Control-Token`.
- New permissions: `ACCESS_NETWORK_STATE`, `BLUETOOTH_SCAN` (without location),
  `BLUETOOTH_CONNECT` and, up to Android 11, `BLUETOOTH`/`BLUETOOTH_ADMIN` and
  location for scanning.

## Validation

- Host tests (Robolectric): `RotorTest` (frames, reassembly and STOP
  precedence, limits, TLE, API 1/2 states, client, planner) and
  `RotorActivityTest` (connection with simulated transport, prepare pass, stop,
  errors) and the button from `SatelliteActivityTest`.
- Firmware `0.3.0-prototype`: `esp32` and `esp32_nema17` build with PlatformIO.
- **Pending**: test with a physical rotor, real Wi-Fi and BLE, and a real phone
  compass.

## Remote rotator

- The remote console (`remote.html`, also inside `RemoteShackActivity` and `RemoteStationActivity`) shows the rotator panel: read, go to AZ/EL, park and stop, through `/api/rotor`.
- Only one client controls the rotator at a time (3 s lease renewed every 1 s); others get `rotor_busy`. Stop is available to any authenticated client.
- Closing the page, losing the connection or an expired lease stops the rotator. Each movement is capped at 30 s.
- Motion is off by default (`motion` in the rotator config); without it the rotator is read-only.
- Warning: never transmit without a matched load or antenna.
- Satellite tracking: in the planner, "Export pass for the rotator (.json)" produces `radicodex-pass-track` (`t`/`az`/`el` samples, Doppler-independent). The console imports it and only starts moving after the track button is pressed.
- Speed and limit switches: pendiente de fuente (disabled).
- Support: Hamlib `rotctld` with the catalog models (`data/remote-station-catalog.json`) and the Bricohams BLE/AP protocol on Android. GS-232A/B and SPID ROT2PROG: pendiente de fuente.
