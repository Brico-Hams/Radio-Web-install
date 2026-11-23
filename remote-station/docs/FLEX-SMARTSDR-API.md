# FlexRadio SmartSDR API: source notes

Facts paraphrased from FlexRadio's public wiki at
https://github.com/flexradio/smartsdr-api-docs/wiki, read on 2026-11-22.
Short syntax lines are quoted. These notes are the repo's source for the
FlexRadio driver; when something is unverified it says so. Confirm
everything on the wire before enabling TX features.

Pages read:
- SmartSDR-Ethernet-API
- SmartSDR-TCPIP-API
- Discovery-protocol
- Metering-Protocol
- TCPIP-meter
- TCPIP-slice
- TCPIP-transmit
- TCPIP-atu
- TCPIP-display-pan
- TCPIP-interlock
- TCPIP-keepalive
- TCPIP-amplifier
- TCPIP-client
- TCPIP-sub
- TCPIP-stream
- PowerGenius-Ethernet-API
- SmartSDR-Command-Line-API

Pages not read (pendiente de fuente):
- TCPIP-xmit
- TCPIP-ping
- TCPIP-filt
- TCPIP-dax
- TCPIP-remote-audio
- TCPIP-display-panafall
- TCPIP-display-panf
- SmartSDR-Status-Responses
- SmartSDR-Supported-Modes

## Discovery

- Port: the wiki is inconsistent. Discovery-protocol says UDP 4991 (the
  VITA-49 port) and SmartSDR-Ethernet-API says UDP 4992. Listen on both.
- Format for firmware after v1.1.3: a VITA-49 extension data packet with
  stream ID 0x800 and class ID 0x534CFFFF. The payload is one ASCII string:
  `model=%s serial=%s version=%s name=%s callsign=%s ip=%u.%u.%u.%u port=%u`.
  Spaces in `name` are sent as `_`.
- Older format (v1.1.3 and earlier): the fields are ip (uint32), port
  (uint16), radios (uint16), mask (uint32), then length-prefixed model,
  serial and name strings of up to 32 characters each.

## TCP command channel (port 4992)

- On connect the radio sends the version line `V<a.b.c.d>`, then the handle
  line `H<hex32>`.
- Command format: `C[D]<seq>|<command>` terminated by CR and/or LF. `seq` is
  a 32-bit number. The optional `D` asks for debug output.
- Reply format: `R<seq>|<hex>|<message>[|debug]`. Each command gets exactly
  one reply. A hex value of 0 means OK.
- Status: `S<handle>|<message>`. Status is asynchronous and in order. Handle
  0 means the change came from the system. The decimal separator is `.`.
- Messages: `M<num>|text`. Bits 24-25 of `num` give the severity: 0 info,
  1 warning, 2 error, 3 fatal.
- Keepalive: `keepalive enable` makes the radio expect a ping about once
  per second. After 15 s without one, it drops the client. The ping syntax
  is pendiente de fuente (TCPIP-ping was not read).
- Error codes: 50000016 malformed, 5000002C wrong parameter count,
  5000002D bad field, 50000033 out of range, 5000000D invalid slice or not
  yours, 50000068 slice locked, 50004001 not licensed, 500000A3 unknown
  subscription object.

## Commands

- **Client**
  - `client gui [<client_id>]` registers the client. v3 and later return the
    client_id.
  - `client udpport <port>` sets the UDP port for VITA-49 streams.
  - `client program` is not implemented: do not use it.
  - `client disconnect [<handle>]`.
- **Slice**
  - `slice create [freq=<MHz>] [pan=<id>] [ant=..] [txant=..] [mode=..]`
    returns `<slice>`.
  - `slice list` returns the slice numbers separated by spaces.
  - `slice tune <slice> <MHz> [autopan=0|1]`. A GUI client can only tune its
    own slices.
  - `slice set <slice> mode=<usb|lsb|cw|am|digu|...> rxant= txant= tx=1|0 rit_on= rit_freq= xit_on= xit_freq= audio_level= audio_mute= agc_mode= squelch=`.
  - `slice remove <slice>`, `slice lock|unlock <slice>`,
    `slice move <MHz> pan=<id>` (click to tune).
  - RX filter edges: pendiente de fuente (TCPIP-filt was not read).
- **Transmit**
  - `transmit tune on|off`.
  - `transmit set rfpower=0-100 tunepower=0-100 max_power_level=0-100 miclevel=0-100 hwalc_enabled= vox= vox_level= vox_delay= dax=0|1`.
  - `transmit bandset <band> rfpower= tunepower= hwalc_enabled=`.
  - Errors: 5000003D TX not supported, 50000042 not ready, 50000043 no
    transmitter.
  - `xmit 0|1` syntax: pendiente de fuente.
- **ATU**
  - `atu start` needs a TX slice and READY state.
  - `atu bypass`.
  - `atu dump` returns mode, memories, profile, frequency, C, L and High Z.
  - Subscribe with `sub atu all`.
  - The status field names are pendiente de fuente.
- **Amplifier (radio side)**
  - `amplifier create ip= port= model= serial_num= ant=ANT1:PORTB,...`.
  - `amplifier set <handle> operate=0|1`.
  - Subscribe with `sub amplifier all`.
- **Power Genius XL (PGXL)**
  - TCP 9008. Discovery is UDP 9008 on the subnet.
  - `status` returns `state=STANDBY ...`. The full list of fields is
    pendiente de fuente.
  - `setup read`, `flexradio read=A|B`, `catradio read=A|B`.
  - `save` reboots the amplifier.
  - Its meters are FWD, RL (return loss), DRV, ID and TEMP.
- **Subscriptions**: `sub <object> <id|all>` and `unsub ...`. The objects
  include amplifier, atu, meter, pan, radio, slice, tx and audio_stream.

## Meters

- `meter list` returns
  `meter <id>.src=..#<id>.nam=..#<id>.low=..#<id>.hi=..#<id>.unit=..#<id>.fps=..`.
  Always read the IDs at runtime: they differ between radios.
- `sub meter all` or `sub meter <id>`. The radio sends VITA-49 meter packets
  at about 10 Hz. Each 32-bit word is the meter ID in the upper 16 bits and
  an int16 value in the lower 16 bits. Ignore an ID until its context has
  arrived.
- Names from the wiki example:
  - FWDPWR: dBm, 0 to 53.
  - REFPWR: dBm.
  - SWR: SWR, 1.0 to 999.0.
  - PATEMP: degC.
  - ALC and HWALC: dBFS, -150 to 20.
  - LEVEL: per slice, dBm. This is the closest meter to an S-meter.
  - +13.8A and +13.8B: Volts.
- Scaling: dBm and dBFS use int16/128. Volts and amps use int16/1024 for
  radio meters, but the external-meter section says 256, so this is
  unverified. TEMPC and TEMPF use 64 (external meters).

## Panadapter and waterfall

- `display pan c freq=<MHz> [ant=] [x=<px>] [y=<px>]` returns
  `<pan_stream_id>,<waterfall_stream_id>`. The wiki says only GUI clients
  can do this.
- `display pan s <id> center= bandwidth= xpixels= ypixels= fps= min_dbm= max_dbm= average= autocenter=`.
- `display pan r <id>` removes the display. Subscribe with `sub pan all`.
- The VITA-49 bin, FFT and waterfall-tile layouts are pendiente de fuente:
  the Panadapter page is empty and the panafall pages were not read.

## Streams and audio

- `stream create type=remote_audio_rx compression=none|opus`
- `stream create type=remote_audio_tx`
- `stream create type=dax_rx dax_channel=<n>`
- `stream create type=dax_iq daxiq_channel=<n>`
- `stream remove <id>`

## TX safety

- `interlock timeout=<ms>` unkeys automatically after that time.
- Ethernet interlock: `interlock create type=AMP|ANT ...`, then
  `interlock ready|not_ready <id>`. An AMP interlock goes back to NOT READY
  after each transmission. Remove the interlock before disconnecting.
- The interlock states are PTT_REQUESTED, TRANSMITTING, READY and NOT READY.
- What the radio does to TX when a client disconnects is not documented.
  The client must unkey explicitly (`transmit tune off`, plus the TX-off
  command once sourced).

## SmartSDR CAT (Kenwood emulation)

Not described on any page read: pendiente de fuente.
