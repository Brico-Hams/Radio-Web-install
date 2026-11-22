# APRS chat on the radios supported by RadiCodex

Status of the APRS chat (the **APRS Chat** screen of the main menu). The chat only speaks **KISS**: it uses `Aprs.kt` (`Kiss`, `KissDecoder`, `Ax25Frame`, `AprsText`, `AprsMessenger`) over a `KissLink` (`KissLink.kt`). A radio without APRS/KISS reachable from the app is **not simulated** and does not appear as a chat source. The same table is shown in the app (`AprsChatRadios.kt`).

Available links:

- **RT-950 Pro (KISS over BLE)**: `Rt950BleKissLink`, over `BleRt950Transport` (`ffe1`). Frame behavior is the same as before the chat was extracted from `Rt950Activity`.
- **KISS TCP (external TNC)**: `TcpKissLink`, an unencrypted TCP socket to a host and port typed by the user (Direwolf, a TNC bridge). This is the generic route for radios without native KISS; the radio is handled by that TNC, not by RadiCodex. Connection timeout 5 s, read timeout 500 ms, socket closed when leaving the screen.

## Status per radio

| radio | APRS/KISS route | status | source |
| --- | --- | --- | --- |
| Radtel RT-950 Pro, receive | KISS over BLE (`ffe1`), with the "KISS TNC over BLE (RX)/(TX)" options enabled on the radio | pending on-air test | the text `strings_rt950.xml:57` gives it as verified, but there is no recorded test of this version on a radio; `Rt950Ble.kt:23-27`; `ACKNOWLEDGEMENTS.md:34` |
| Radtel RT-950 Pro, RF transmit | KISS over BLE | **disabled by default (firmware lockup)**; only with the "Experimental TX" switch (Advanced) | `strings_rt950.xml:57` (TX "INFERENCE not verified"); lalmonte/radiochat-aprs@9c7b092; erkanz/radtel-RT950PRO@51c84d4; SP3ARK/Radtel-950-Pro-Bluetooth-Programmator@a8bb41a `README.md:235-238`; incident 2026-11-12 |
| Any radio + external KISS TNC | KISS over TCP | pending on-air test | `KissLink.kt` (`TcpKissLink`); unit test with `ServerSocket` in `AprsChatTest.kt` (not an on-air test) |
| Quansheng UV-K5 / BricoHams Satellite | none in RadiCodex (cloning/CAT) | not supported | `Diagnostics.kt:12` |
| Quansheng UV-K10 Pro | none; APRS only as a firmware plan, no firmware | not supported | `docs/UV-K10-PRO-VIABILIDAD.md:7,55` |
| Quansheng TK-11 | none (cloning on the web) | not supported | `docs/TK11-INGENIERIA.md` (no APRS/KISS) |
| OpenGD77 (GD-77, GD-77S, DM-1801, RD-5R, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017, DM-32, UV008) | only an APRS FM TX beacon in the firmware; no AX.25 reception or TNC | not supported | `OpenGd77.kt:25-38`; `docs/AYUDA-OPENGD77.md:384-386` |
| AnyTone D878 | none; channel template only | not supported | `ChannelTemplates.kt:39,265`; `docs/AYUDA-ANYTONE.md` |
| Yaesu FT-817/818/857/897 | CAT only | not supported | `RigCat.kt:15-18` |
| Yaesu FTX-1 | CAT only in RadiCodex | not supported | `RigCat.kt:21`; `Diagnostics.kt:13` |
| Icom IC-705 (CI-V) | CAT only in RadiCodex | not supported | `RigCat.kt:19` |
| (tr)uSDX, QRP Labs QMX/QMX+ and QDX/QDX-M | CAT only (HF) | not supported | `RigCat.kt:23-26` |

"Not supported" means that RadiCodex currently has no APRS/KISS route for that radio, not that the hardware lacks APRS. If the hardware offers its own KISS TNC (for example over Bluetooth or USB), RadiCodex does not reach it: **pending source**. With an external TNC on the network, the TCP route is used.

## RT-950 Pro: transmission

- A confirmed BLE write **does not prove** that the radio transmits over RF. Transmission must be confirmed with a **second receiver**.
- According to the README of [lalmonte/radiochat-aprs@9c7b092](https://github.com/lalmonte/radiochat-aprs/tree/9c7b092), some firmwares accept the KISS write without activating the PTT.
- [erkanz/radtel-RT950PRO@51c84d4](https://github.com/erkanz/radtel-RT950PRO/tree/51c84d4) reports working TX with a patched v0.29.
- Both READMEs are cited as referred to in the assignment; RadiCodex has not verified their content or their licenses (**pending source**; no code is reused).
- The chat does not write to the radio's memory. Channels 961–990 (`0x7800–0x7BFF`) remain protected as stated in `docs/RADTEL-RT950-PRO.md`.

## Transmission safety

- Before every send the app shows a warning that the message **will be transmitted over RF**, with source, recipient, text, and the link note, and requires confirmation.
- The own callsign is mandatory and is validated with `Ax25Address.isValid` (1–6 characters A–Z/0–9, SSID 0–15). Automatic acknowledgment (ack) is also disabled without a valid callsign.
- Without an ack, `AprsMessenger` resends up to 3 times every 30 s (`Aprs.kt`).
- Limits already present in the repository: text of 1 to 67 ASCII characters without `{ | ~` (`AprsText`), path of up to 8 repeaters (`Ax25Frame.encode`).
- RT-950 Pro link limits, according to the README of erkanz/radtel-RT950PRO@51c84d4 (they are not in the repository): maximum 182 AX.25 bytes, 6 repeaters, and 127 information bytes. They are enforced in `Rt950BleKissLink` (`Ax25Limits.RT950`). For a generic TCP TNC only the 8-repeater limit applies; other limits: **pending source**.
- Transmitting requires an amateur radio license.
- **RT-950 Pro, receive-only by default:** `Rt950BleKissLink.send()` refuses to write unless the "Experimental TX (risk of firmware lockup)" switch (Advanced, off, with a warning) is active. Without it there is also no automatic ack or resends. Resends are canceled immediately if the BLE link closes or a write fails. The TCP KISS TNC is not affected.
- After any cloning/copy/write session (`Rt950Activity`) the user is asked to power-cycle the radio before using KISS; the warning also appears in the chat until the user confirms "I have restarted the radio".

## Pending source

- Content and license of the READMEs of lalmonte/radiochat-aprs@9c7b092 and erkanz/radtel-RT950PRO@51c84d4 (cited, not verified).
- RF transmission of the RT-950 Pro with the "KISS TNC over BLE (TX)" option on each firmware.
- Own KISS/APRS route of FTX-1, IC-705, UV-K10 Pro, AnyTone D878, and TK-11.
- AX.25 limits of a specific external TNC.

## On-air tests

| Date | Radio | Test | Result |
|---|---|---|---|
| 2026-11-12 07:30 | Radtel RT-950 Pro (unidentified firmware), S20 FE, KISS link over BLE | APRS message from EA5KAO to EA5KAO, "RadiCodex prueba APRS 1", with 3 attempts at 30 s intervals. Second receiver: BricoHams SDR, receiver 3, 144.800 MHz, packet. | **Inconclusive.** The app wrote the frame over BLE, but the monitoring SDR was on 436.795 MHz NFM (70 cm satellite profile) and not on 144.800 MHz packet, so it could not receive it. |
| 2026-11-12 07:50 | Radtel RT-950 Pro (unidentified firmware), with the radio's APRS on channel A at 144.800 MHz | The same message, "RadiCodex prueba APRS 2", with 3 attempts. | **Inconclusive.** The frame was written over BLE, but the monitoring SDR was still on 436.795 MHz NFM and not on 144.800 MHz packet; repeat with the receiver on 144.800 packet. |
| 2026-11-12 09:44 | Radtel RT-950 Pro, APRS on channel A at 144.800 MHz | "RadiCodex prueba APRS 3", 4 attempts between 09:44:10 and 09:45:40. Second receiver: BricoHams SDR, V3, profile "144.800 MHz · APRS 2 m", NFM with secondary packet decoding; packet panel watched from the browser. | **Not received.** The panel showed no frame in about 5 minutes, neither from EA5KAO nor from other stations. So the SDR's decoding chain (the V3's 2 m antenna and direwolf) is not verified either. An independent check remains pending: listen to the SDR audio during transmission or watch the radio's TX LED. |
| 2026-11-12 10:13 | Radtel RT-950 Pro, new KISS mode (commit 9064001): no `ff31` unlock, write to **FF31** | "RadiCodex prueba APRS 4", 4 attempts. Real GATT: MTU 23 (rejects 247), `ff31` write-with-response only, `ffe1` read, write with and without response, and notification. | **Not received** on the SDR (V3, 144.800, packet). |
| 2026-11-12 10:21 | Same, write to **FFE1** | "RadiCodex prueba APRS 5", 4 attempts. | **Not received.** The SDR has not decoded any APRS frame from anyone since 09:41: the SDR's 2 m receive chain remains unverified. |
| 2026-11-12 10:24 | Radtel RT-950 Pro, without RadiCodex: beacon launched from the radio's own APRS menu, with channel A at 144.800 MHz | Reference control. | **The radio does not transmit:** the TX LED does not light and the SDR receives nothing. With this configuration or firmware, the unit's APRS TX does not work even from its own menu. Therefore tests 1–5 do not allow assessing RadiCodex. |
| 2026-11-12 (afternoon) | Radtel RT-950 Pro, sending from RadiCodex over KISS BLE | Sending an APRS message from the chat. | **Incident: the radio's firmware froze** (user report). Since then the RT-950 link is receive-only by default. |

**Conclusion (2026-11-12):** the APRS TX of this unit's RT-950 Pro is **not supported in its current state**. The fault is in the radio (unidentified configuration or firmware), not in RadiCodex. Before testing the chat again, the radio's own beacon must be made to light the TX LED and appear on a second receiver, for example by identifying the firmware or trying erkanz's patch for v0.29. From RadiCodex, the KISS mode without unlock must be used (commit 9064001).

## Final RT-950 Pro diagnosis (2026-11-14)

Done according to the manufacturer's official manual ([radtel-950PRO_2.pdf](https://cdn.shopify.com/s/files/1/0564/8855/8800/files/radtel-950PRO_2.pdf?v=1756451146), menu table: APRS Set → 1. APRS ON/OFF; 5. Advanced → 5. TNC Type OFF/KISS; User Key → PF2 → Beacon TX):

| Check | Result |
|---|---|
| APRS ON, TNC Type = KISS, Beacon Setup with callsign and fixed position, PF2 = Beacon TX | Configured on the radio |
| PTT A on 145.500 MHz (voice) | **Transmits** (red LED) |
| PF2 (Beacon TX) with channel A on 144.800 MHz | **Does not transmit** (no red LED); the SDR (V3, 144.800 MHz, packet) receives nothing |

**Conclusion:** the radio transmits on channel A, but does not emit APRS, not even its own beacon. It is a fault of this unit or its firmware (unidentified version), not of RadiCodex. In RadiCodex, TX to the RT-950 stays disabled by default, with the KISS link receive-only. To try again, the firmware must be identified and Radtel consulted, or a firmware that documents APRS TX must be tried, such as erkanz's patch for v0.29.
