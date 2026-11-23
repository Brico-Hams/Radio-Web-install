# Station device protocols: source notes (2026-11-22)

Facts paraphrased from official or open-source documents, with their URLs.
Anything not listed here is pendiente de fuente.

## Digital Loggers Web Power Switch (REST)

Source: https://www.digital-loggers.com/rest.html. The full reference is in
rest_api_reference.pdf, linked from that page, which was not read.

- Only WiFi-capable, Atheros-based controllers support the REST API. The
  Pro lists it; LPC and EPC support is unverified. Enable "Allow REST-style
  API" on the External APIs page.
- Authentication is HTTP Digest. Non-admin users can only toggle outlets.
  Firmware 1.10.x and later also has access tokens (not read).
- Base: `http://<ip>/restapi/`. Outlets are zero-based (0-7).
- Writes need the header `X-CSRF: x`. For reads, send
  `Accept: application/json`.
- Requests:
  - Set an outlet: `PUT /restapi/relay/outlets/<n>/transient_state/` with
    form data `value=true|false`. For the persistent state use `.../state/`.
  - Cycle an outlet: `POST /restapi/relay/outlets/<n>/cycle/`.
  - Read: `GET /restapi/relay/outlets/<n>/physical_state/` (or `state/` or
    `transient_state/`). All outlets: `outlets/all;/state/`.
  - Several outlets (firmware 1.10.11+): `POST /restapi/relay/set_outlet_transient_states/`
    with the JSON body `[[[0,false],[1,true]]]`.
- Notes:
  - The JSON shape of the read reply is not documented in the pages read;
    the code accepts only a bare JSON boolean and rejects anything else.
  - The form `Content-Type` for the PUT is assumed to be
    `application/x-www-form-urlencoded` ("form data" in the reference).
  - Change the default credentials.
  - An "on" request may be delayed by the on-sequence and cycle delays.
  - The physical state cannot be set directly.
  - Outlet locks can only be set from the keypad or UOM, not over REST.

## Waveshare Modbus POE ETH Relay (Modbus TCP)

Source: https://www.waveshare.com/wiki/Modbus_POE_ETH_Relay (parts marked
(summary) were not checked against the raw page).

- Port 502 when the transfer protocol is Modbus TCP (configured with
  VirCom). Set the gateway type to "Multi-host non-storage type".
- Unit ID 0x01 (summary). Factory IP 192.168.1.254 (summary).
- Function codes: 01 read coils, 03 read holding registers, 05 write single
  coil, 06 write single register, 0F write multiple coils.
- Coils:
  - Relays 1-8 at 0x0000-0x0007 (functions 01/05/0F). Values: 0xFF00 on,
    0x0000 off, 0x5500 toggle.
  - All relays at 0x00FF (function 05), with the same values.
- Holding register 0x8000 is the software version (summary). An exception
  reply is the function code + 0x80 (summary).
- Modbus TCP example for relay 0 on: `00 00 00 00 00 06 01 05 00 00 FF 00`
  (summary).
- Modbus PDU layouts used by the code (FC 01 `01 addr qty`, FC 05
  `05 addr value`, FC 0F `0F addr qty bytecount data`, MBAP header with
  protocol 0 and length = PDU + 1): Modbus Application Protocol V1.1b3
  (https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf), not
  re-read in this session. The test frames other than the relay 0 example
  are derived from it.
- Safety: protect the load with a fuse and confirm the relay state after
  power-up.

## Rotors: Hy-Gain DCU-1, Idiom Press Rotor-EZ / RotorCard, Green Heron RT-21

Sources:
- https://github.com/Hamlib/Hamlib/blob/master/rotators/rotorez/rotorez.txt
- https://github.com/Hamlib/Hamlib/blob/master/rotators/rotorez/rotorez.c
- The Green Heron RT-21 manual, Appendix F "Communications Protocol"
  (https://www.greenheronengineering.com/wp-content/uploads/2019/08/RT-21_Manual_current.pdf).

### Common

- Serial 4800 8N1, no handshake (Hamlib caps). The RT-21 manual adds that
  9600 8N1 is optional and that the USB port works too.
- Commands end with `;`. A bare `;` clears the buffer and, on Rotor-EZ and
  RT-21, stops rotation.

### DCU-1 / DCU-1X

- Set a heading: `AP1NNN;` then `AM1;`. NNN needs leading zeros.
- Reading the heading is not supported.
- Stop conflicts between sources: Hamlib sends `AS1;` but its README says
  stop is not supported. Verify on hardware.

### Rotor-EZ

- `AP1xxx<CR>` executes immediately. `AP1xxx;` followed by `AM1;` also
  executes.
- `AI1;` reads the heading as `;xxx`.
- `;` stops rotation.
- Options are case-sensitive: E/e, O/o, S/s, J/j (disabling jam protection
  is NOT recommended), V version.

### RT-21

The manual describes the protocol as a superset of DCU-1. The command
letters below come from Hamlib and match the manual's descriptions.

- Read the heading: 3 digits (`AI1;` reply `xxx;`), or with tenths (`BI1;`
  reply `xxx.y;`).
- Set a heading for the next `AMn;`: `AP1xxx[.y];`. Hamlib sends
  `AP1%05.1f\r;` to execute immediately.
- Stop: `;`. The manual adds a stop command with a short ramp-down.
- Other read commands exist: heading plus status (1 running, 2 stopped), the
  model and version string, and the pot A/D value. Their exact letters are
  pendiente de fuente, because the PDF table cells were not extracted.
- Safety:
  - The brake paddle or a manual control overrides RS-232 rotation, with a
    5 s brake delay.
  - Flush stray replies before reading.

## Pendiente de fuente (no public protocol found)

- 4O3A Power Genius XL: only the FlexRadio wiki notes in
  FLEX-SMARTSDR-API.md (TCP 9008 status, setup and meters). The full field
  list is unknown.
- 4O3A Tuner Genius XL and Antenna Genius: nothing found.
- Dataprobe iBoot-PDU: the vendor advertises REST, Telnet and SNMP, but the
  syntax was not read (the page returned HTTP 429).
- Alpha 87A and OM Power OM2000A+: not located.

## Per-radio support matrix

Station devices (power outlets, rotors, signal path) are radio-independent.
The only radio-coupled behaviour is the TX interlock: switching a radio or
amplifier outlet is refused while the radio transmits. The interlock reads the
TX state through the Hamlib rigctld generic path (`hamlibModel` in
`data/remote-station-catalog.json`). Native TX-state fallbacks have not been
verified per radio, so rows relying on rigctld only are `ok` where the catalog
lists a Hamlib model and `partial` where the link is not rigctld-native.
Source for every row: `data/remote-station-catalog.json` entry of the radio.

| radio | link | feature status |
|---|---|---|
| Icom IC-705 | usb, lan, wifi | ok (rigctld 3085; LAN/Wi-Fi via wfview) |
| Icom IC-7100 | usb | ok (rigctld 3070) |
| Icom IC-7200 | usb | ok (rigctld 3061) |
| Icom IC-7300 | usb | ok (rigctld 3073) |
| Icom IC-7300MK2 | usb | ok (rigctld 3094, Beta) |
| Icom IC-7410 | usb | ok (rigctld 3067) |
| Icom IC-7600 | usb | ok (rigctld 3063) |
| Icom IC-7610 | usb, lan | ok (rigctld 3078; LAN via wfview) |
| Icom IC-7700 | usb | ok (rigctld 3062) |
| Icom IC-7760 | usb, lan | ok (rigctld 3092, Alpha) |
| Icom IC-7800 | usb | ok (rigctld 3056) |
| Icom IC-7850 / IC-7851 | usb, lan | ok (rigctld 3075; LAN via wfview) |
| Icom IC-905 | usb, lan, wifi | ok (rigctld 3090; LAN/Wi-Fi via wfview) |
| Icom IC-9100 | usb | ok (rigctld 3068) |
| Icom IC-9700 | usb, lan | ok (rigctld 3081; LAN via wfview) |
| Icom IC-R8600 | usb, lan | ok (rigctld 3079; receive only, no TX interlock needed) |
| FlexRadio FLEX-6400 | lan, wifi | partial (rigctld 23005 via SmartSDR CAT; native TX state pendiente de fuente) |
| FlexRadio FLEX-6400M | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-6600 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-6600M | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-6700 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-8400 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-8400M | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-8600 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio FLEX-8600M | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio AURORA-510 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio AURORA-510M | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio AURORA-520 | lan, wifi | partial (same as FLEX-6400) |
| FlexRadio AURORA-520M | lan, wifi | partial (same as FLEX-6400) |
| Kenwood TS-590S | usb | ok (rigctld 2031) |
| Kenwood TS-590SG | usb | ok (rigctld 2037) |
| Kenwood TS-890S | usb | ok (rigctld 2041) |
| Kenwood TS-990S | usb | ok (rigctld 2039) |
| Yaesu FT-710 | usb | ok (rigctld 1049) |
| Yaesu FT-991A | usb | ok (rigctld 1035) |
| Yaesu FTDX10 | usb | ok (rigctld 1042) |
| Yaesu FTDX101D | usb | ok (rigctld 1040) |
| Yaesu FTDX101MP | usb | ok (rigctld 1044) |
| Yaesu FTDX3000 | usb | ok (rigctld 1037) |
| Yaesu FTX-1 | usb | ok (rigctld 1051; direct CAT `TX`/`RI0` in the catalog `cat` block) |
| Elecraft K3S | usb | ok (rigctld 2043) |
| Elecraft K4 | usb, lan, wifi | ok (rigctld 2047; network port 9200) |
| QRP Labs QMX / QMX+ | usb | ok (rigctld 2057) |
| QRP Labs QCX / QDX | usb | ok (rigctld 2052) |
| DL2MAN (tr)uSDX | usb | ok (rigctld 2055) |
| Hermes Lite 2 | lan | partial (rigctld 2040 via piHPSDR CAT, Beta) |
| Xiegu | not in catalog | pendiente de fuente (no catalog entry) |
| Quansheng | not in catalog | pendiente de fuente (no catalog entry) |

Rotor models in the catalog (Hy-Gain DCU-1 / DCU-1X, Green Heron RT-21,
Hy-Gain DCU2 / DCU3 / YRC-1) and the amplifier models (Elecraft KPA1500,
Gemini DX1200 / HF-1K, Expert 1.3K-FA / 1.5K-FA / 2K-FA) are accessory rows,
not radios: DCU-1 and RT-21 are covered above; DCU2 / DCU3 / YRC-1 are
`pendiente de fuente` for direct serial control (Hamlib model 406 only); the
amplifiers are `pendiente de fuente` for direct control (Hamlib ampctld only).