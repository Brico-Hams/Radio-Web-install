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
