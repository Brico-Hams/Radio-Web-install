# Bricohams V3: Local Modular Build

## Identity and Scope

**BETA, undergoing validation and testing.** New builds declare
`stability: "beta"` and the validation scope in `build-info.json`, covered by
SHA256SUMS. `hardwareTested: false` is retained until that exact binary has been tested.
A real radio read using F4HWN v6.0.0 does not validate this Bricohams firmware.
The web PRO Mode reduces confirmations; it does not change modules, licenses, or
firmware protections.

Edition derived from the open F4HWN base for **UV-K5 V3 / UV-K1 PY32**. It is not Karina,
does not support UV-K5 V1, and does not add its own bootloader. It reuses the
upstream multiboot and retains its protocol identity, `F4HWN v6.1.0`. The on-screen
edition becomes `Bricohams` through a CMake variable, without patching the binary.

Pinned base:

- Repository: <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Version declared by the presets: `v6.1.0`.
- License/attribution: the original `LICENSE` and `NOTICE` are included.
- Local reference sources are in `Documents\Multiboot\Fusion61`.
  Its unconfirmed change in `App/settings.c` is preserved and **not included**.

This open base was chosen to continue on the V3 hardware and its slots.
The limitations that prevent deriving Karina are documented in [KARINA.md](KARINA.md).
Its algorithms, menus, and drivers have not been ported.

## Build on Demand

### Independent Line: Bricohams App Platform

`firmware/platform` starts a line distinct from the F4HWN application.
It contains an in-memory package validator/loader, an initial service contract,
and diagnostic and blocks apps written in C and tested on desktop.
It now includes a **buildable experimental resident** with PY32 startup and LCD/keyboard glue.
It has not been verified to boot on the radio. **It is not a validated, installable
replacement for Labs or a complete SDK.**
Its connection to physical USB, Flash, LCD, keyboard, or RF has not been tested.

The experimental BHA1 format is not FAP1 and must not be installed with the
existing web app loader. Integers are little-endian:

| Offset | Bytes | Field |
| --- | ---: | --- |
| 0 | 4 | Magic ASCII BHA1 |
| 4 | 4 | Header size, 64 |
| 8 | 4 | API version, 2 |
| 12 | 4 | Architecture, 1 = Cortex-M Thumb |
| 16 | 4 | Code size, even, 2..4096 |
| 20 | 4 | Initialized data, 0..1024 |
| 24 | 4 | BSS, zeroed when loaded |
| 28 | 4 | Even entry offset within code, without Thumb bit |
| 32 | 4 | Requested capabilities: display 1, keyboard 2, RX 4 |
| 36 | 4 | CRC-32 of concatenated code and data |
| 40 | 16 | Printable ASCII name, zero-padded if shorter than 16 |
| 56 | 4 | Reserved, zero |
| 60 | 4 | CRC-32 of the first 60 bytes |

Code and data follow, with no trailing bytes. Code, data, and BSS together
must not exceed 4096 bytes: this is an initial budget, not a measurement of
the resident firmware. The loader validates everything before modifying the
destination buffer, copies code/data, and zeros BSS. It does not call the code,
resolve relocations, or know the final link address. The output descriptor
must be independent of the input and destination buffers; memory and its
lifetime are the caller's responsibility.

CRCs detect corruption; **they do not authenticate the author**. Capabilities
are an admission filter, not a sandbox: native code on an unisolated MCU can
access peripherals directly. Do not execute untrusted code or claim calibration
isolation based on this filter. This component has no TX API or Flash writing.

The resident's boot, LCD, and keyboard still need validation on PY32; Flash/USB/RF
drivers, real stack and timing measurements, physical transactional installation,
recovery, and full hardware integration of the apps remain incomplete. Doom has not
been implemented. This format is provisional and does not demonstrate physical
operation of the apps. The previous profile line is not being replaced.

#### First App: Display Diagnostics

`bh_api.h` defines an experimental C ABI version 2 with version, size, context,
and callbacks to clear, write text, and present the display, plus a private app
state buffer and its size. It receives START, KEY, TICK,
and STOP events. Keys are platform identifiers, not UART codes:
EXIT has value 1. The app returns continue, exit, or an explicit error;
if a callback fails, it requests no further display services.

`diagnostics.c` displays four Bricohams lines and accepts EXIT/STOP without
writing to RF or storage. Its desktop execution uses simulated services;
version/size, missing callbacks, and errors at each stage are checked.
This does not execute ARM instructions on the radio.

```powershell
node scripts\build-platform-app.cjs firmware-builds\diagnostics-nuevo
```

It requires the ARM tools already used by the project and a new destination.
It produces ELF, a code BIN, `diagnostics.bha`, a license, and a manifest
with SHA-256 hashes of the sources and package. The API 2 build package is
300 bytes: 64 bytes of header and 236 bytes of code/constants.
`app.ld` links the app at `0x20002000`; this address is experimental,
**not reserved in F4HWN firmware and must not be used there**.
Mutable globals and dynamic relocations are not supported. The future core
must reserve the region, stack, and buffers without overlap before allowing
execution of the entry point in Thumb mode.

The loader's C test accepts `diagnostics.bha` as an argument and checks
the real ARM package, its CRCs, and the copy in RAM. This is a load test,
not a test of ARM execution, Flash installation, or firmware boot.

#### Second App: Blocks

`blocks.c` implements an original four-cell piece game with seven
shapes, rotation without wall kicks, collisions, falling, locking, line
clearing, game over, and restart. It uses no code, images, sounds, or data
from Tetris or Doom. The text board is 10 columns by 6 rows to test the
current callbacks; it is not a final graphical LCD port.

LEFT/RIGHT move, ROTATE turns, DOWN drops one step, DROP locks the piece,
RESTART starts over, and EXIT exits. Each TICK drops one step: the core
must define the cadence, independently of loop speed.
The pseudorandom sequence is deterministic and resets on START/RESTART.
Lines are counted in state but are not yet displayed as a score.

The core must provide the state in aligned memory, zeroed before the first
event and exclusive to this app. The manifest reserves an external budget
of 256 bytes; this is not package BSS. The API 2 contract includes this buffer
and replaces the initial API 1. The loader rejects API 1 packages: distinct
binary contracts are not silently mixed.

```powershell
node scripts\build-platform-app.cjs firmware-builds\blocks-nuevo blocks
```

The app compiles for Cortex-M0+ without a C library or division helpers:
940 bytes per package (64-byte header, 876 bytes of code/constants).
Desktop tests verify movement, rotation, line clearing, game over, restart,
service errors, and 10000 events with undefined-behavior checks. The C loader
also validates and copies the real ARM package. **That ARM code has not been
run on the radio. The experimental resident includes a launcher, but not an
external package installer.**

#### Portable Launcher

`bh_launcher.c` manages one native app at a time with an exclusive, aligned
256-byte buffer. Initialize a new instance and keep it at the same address
for its entire lifetime: the contract contains a pointer to its own memory.
Do not copy instances or reinitialize them while an app is running.

START is sent exclusively by `bh_launcher_start`; the dispatcher
accepts KEY, TICK, and STOP. When switching apps, STOP is sent to the previous one;
exit or error releases the app and clears all its state. A STOP error prevents
starting the next app. Reentrant start/stop/dispatch calls during a callback
are rejected. Ticks must be delivered serially from the main loop; this is not
an interrupt-safe API.

The launcher invokes already-linked C functions for desktop tests.
**It does not turn an ARM package address into a function or execute BHA1
on the PC.** MCU execution bridging, Flash installation, drivers, an LCD menu,
and recovery are still missing. This is a tested portable lifecycle, not a
bootable resident launcher or a sandbox.

#### Persistent Installation with Two Banks

`bh_store.c` implements portable storage for **one package and its previous
version** in two abstract 8192-byte banks. It is not yet a multi-app catalog.
The driver must provide read, write, and erase operations exclusively for
those banks; no radio Flash address has been assigned and the F4HWN map is
not reused.

Before erasing, the complete BHA1 API 2 package is validated and the previous
version is queried. Only the inactive bank is erased, then read-back verifies
that every byte is `0xff`, including the confirmation marker:
an erase ACK without an actual erase is rejected before programming.
The package is written in chunks that do not cross 128-byte pages, and each
chunk is read back. The BHS1 header contains version, generation, length, and
package CRC; it is read back before writing `DONE` as the final confirmation.
The header and package are validated again after confirmation. The previous
bank is not erased at the end.

Reading selects the most recent valid generation and can recover the previous
one if the new one is incomplete or corrupt. If neither is valid but a
confirmed corrupt bank exists, an error is reported and it is not automatically
overwritten. A driver error aborts without simulating success. Equal generations
are ambiguous and rejected; when `uint32_t` is exhausted, a new installation
is blocked rather than allowing wraparound.

The caller must provide scratch space independent of the package of at least
4160 bytes and serialize all operations. This maximum includes a 64-byte header
and 4096 bytes of combined code/data: the individual maximum code and data
sizes are not added because the BHA1 contract limits total RAM to 4096.
This reduces scratch by 1024 bytes compared with the initial allocation without
reducing the set of valid packages. Tests cover both 4096-byte code and
3072-byte code plus 1024-byte data, and rejection without I/O when scratch
is one byte too small. There is no heap or internal full-bank buffer. After a
final write/read-back error, installation may already be confirmed: query again
before retrying; do not assume rollback.

`bh_store_load` connects bank selection to validated loading into RAM:
it copies code/data and clears BSS, without jumping to the entry point. Scratch
and RAM must be independent, as must the output descriptor. An undersized
destination returns `BH_STORE_NO_SPACE`; errors do not modify RAM or the
descriptor. The caller must reserve the real link address before execution;
this helper does not validate addresses or turn bytes into a function.

Tests with simulated NOR cover 322 interruptions/read, write, and erase failures
during first installation and update, including partial writes, false write/erase
ACKs, corruption, maximum-size packages, equal generations, alternation, and
generation exhaustion. Each interruption during an update verifies that the
previous bank remains unchanged. Loading code/data/BSS and RAM preservation on
errors are also tested. This does not test power-loss tolerance or atomicity
of the real chip. SPI/Flash driver, sector reservation, USB installer, and
integration with the resident launcher remain incomplete.

Maintained platform tests (desktop C11 compiler required):

```powershell
cmake -S firmware\platform -B firmware-builds\platform-tests -DBUILD_TESTING=ON
cmake --build firmware-builds\platform-tests
ctest --test-dir firmware-builds\platform-tests --no-tests=error --output-on-failure
```

All eight C tests and the JavaScript/C integration test pass through
CMake/CTest on desktop. The integration test is enabled if Node.js is found.
The `firmware-modules.yml` workflow also includes this separate suite on Linux
with undefined-behavior checks; the local workflow change does not mean it has
already run on GitHub.

#### Experimental BHT1 Receiver and Transfer Client

`bh_transfer.c` implements the receiver state machine, without a serial/USB driver.
`scripts/platform-transfer.cjs` encodes requests, validates responses, and provides
`uploadPackage(exchange, bytes, session)`, where `exchange` must deliver a complete
frame and return exactly its response. It does not open ports or provide installation
in the current web app.

Each request has a 24-byte header and up to 128 bytes of payload.
All integers are little-endian u32:

| Offset | Field |
| --- | --- |
| 0 | Magic BHT1 |
| 4 | Operation: BEGIN 1, DATA 2, COMMIT 3, ABORT 4, STATUS 5 |
| 8 | Nonzero session ID, chosen by the client |
| 12 | Offset in package for DATA; zero for other operations |
| 16 | Payload length |
| 20 | CRC-32 of header and payload, with this field set to zero |

BEGIN contains two u32 values: total length (66..4160) and CRC-32 of the entire BHA1.
DATA sends contiguous blocks of 1..128 bytes. A duplicate block is accepted
only if it exactly matches bytes already received and does not advance the offset
twice; gaps and partial overlaps are rejected. A duplicate BEGIN with the same
session/length/CRC retains progress. A different session cannot interrupt an
active transfer. ABORT cancels without calling the installer; STATUS queries
without extending the timeout. The transfer expires 30000 ms after BEGIN or
the last valid DATA, using unsigned differences to handle wraparound.
An expired or cancelled session requires a new ID.

COMMIT requires all bytes, a correct total CRC, and BHA1/API/capability
validation before invoking the installer callback. A duplicate COMMIT does not
invoke it again, whether it succeeded or returned an error: a write error may
mean Flash was already confirmed. The client does not automatically retry a
COMMIT whose response is lost; it must query STATUS and storage before deciding
on a new operation.

The BHR1 response is 32 bytes: magic, operation, session, result, bytes
received, state, installer result (i32), and CRC of the first 28 bytes.
Results: OK 0, BAD_FRAME 1, BAD_SESSION 2, BUSY 3, BAD_OFFSET 4,
INCOMPLETE 5, BAD_PACKAGE 6, INSTALL_ERROR 7, EXPIRED 8, BAD_STATE 9.
States: IDLE 0, RECEIVING 1, DONE 2, FAILED 3, CANCELLED 4, TIMED_OUT 5.
The client rejects an incorrect CRC, session, operation, state, or offset ACK.

The caller must serialize calls, keep the instance and staging alive,
and provide independent buffers for the instance, staging, frame, and response.
4160 bytes of staging are required. The callback receives that staging only during COMMIT and must not modify or retain it. A reentrant call returns BUSY without
producing a response. The future physical transport must limit waits, report
disconnections, and implement flow control. The transfer API receives complete
frames; assembling an arbitrarily fragmented stream belongs to `bh_stream.c`,
described below.
CRCs and the session ID **do not authenticate the sender**.

`bh_stream.c` consumes one byte per call, recognizes BHT1 magic and a length
limited to 128 bytes, and checks the CRC before passing the frame to the receiver.
It requires no length prefix or additional delimiters. It tolerates fragmented or
concatenated frames. It searches for magic again after noise, an impossible length,
or an incorrect CRC; magic inside a valid payload is not interpreted as a second
request. It returns explicit framing errors, and only `BH_STREAM_REPLY` authorizes
sending its BHR1 buffer. The caller must report or log these errors, not simulate
success.

A partial frame expires after 1000 ms without new bytes, using unsigned
differences to tolerate wraparound. `bh_stream_poll` allows checking this timeout
without receiving another byte. A timeout discards only the partial frame; it does
not cancel the transfer session or alter the previous bank. The driver must report
a disconnection and decide whether to allow resuming the existing session.
Calls and buffers must be serialized; the installer callback must not reenter the
stream. There is no heap: the assembly buffer occupies 152 bytes, in addition to
the structure, response, staging, and validator temporary memory.

The desktop integration sends the raw BHT1 stream from JS to the C receiver over
pipes, installs to simulated NOR, and validates the subsequent RAM load; it covers
two generations, a maximum-size package, and repeats without reinstalling, adding
noise before each frame. The length prefix used only by the first harness has been
removed. The same test with the real ARM packages for Diagnostics and Blocks
completes 34 JS/C exchanges, including cancellation and rejection of an incorrect
total CRC without replacing the active bank. The C test also checks 10000 malformed
frames without changing the session or calling the installer. The stream tests all
cut points of a STATUS frame, concatenated frames, maximum payload, nested magic,
recovery after corruption, timeout across wraparound, and 100000 noise bytes.
The receiver and stream also compile for Cortex-M0+. **They are not linked to the
resident and do not write physical Flash**: staging, scratch, app RAM, and stack
must be budgeted together before integration; buffers cannot simply be added
without checking the 16 KiB limit.

With the current maximum buffers, staging and scratch total 8320 bytes:
they already exceed the 8192 bytes reserved for CORE by 128 bytes, even before
structures, framebuffer, or app state. APP and STACK have their own 4096-byte
regions; those are not free RAM for these buffers. Reducing scratch removes waste,
but **does not by itself solve integration**. The receiver will not be connected
to the resident by simply adding these buffers, nor will the stack be reduced
without measurements to hide the excess. Block-based storage/verification or
reuse of memory with tested lifetimes and overlaps is needed, while retaining the
current contract that prevents package and scratch from overlapping during
installation.

#### First Experimental Independent PY32 Resident

```powershell
node scripts\build-platform-resident.cjs firmware-builds\residente-nuevo firmware\Fusion61
```

The second argument specifies the local reference tree containing the PY32
CMSIS/LL headers and `Core/Src/system_py32f071.c`. Its F4HWN application is not
linked: startup, linker, shell, text, framebuffer, and display/keyboard glue for
this image are in `firmware/platform`. BSD/Apache attributions for third-party
components are retained; this is neither code recovered from Karina nor a claim
of independence from all licenses. ARM GNU Toolchain is required, and existing
destinations are not overwritten.

The builder first compiles Diagnostics and Blocks as independent BHA1 API 2
packages and incorporates them unmodified into the resident's Flash. When an app
starts, `resident_apps.c` validates its package, copies it to the 4096-byte region
at `0x20002000`, clears BSS, and prepares the Thumb entry with memory barriers.
The ARM code contains this execution path: **compiling it does not demonstrate
that the jump or apps work on the MCU**. Only these packages built alongside the
resident are supported; loading from USB or external storage is not available,
and dual-bank storage is not yet connected.

Linker-verified map:

- Application Flash from `0x08002800`, 118 KiB; excludes the bootloader.
- Core RAM: `0x20000000..0x20001fff`, 8 KiB.
- Executable app RAM: `0x20002000..0x20002fff`, 4 KiB.
- Stack: `0x20003000..0x20003fff`, 4 KiB; no heap.

The custom startup initializes data/BSS and VTOR. It disables and clears inherited
external NVIC interrupts and pending SysTick/PendSV; it then enables only the
1 ms SysTick as a time base. The ISR only increments a 32-bit `volatile` counter:
it does not call the launcher or draw. LCD updates do not rely on polling COUNTFLAG
or lose counter ticks while drawing. It preserves the clocks provided by the
bootloader, using the CMSIS calculation to read their frequency. It does not
program internal Flash or channel storage. The initial glue uses an ST7565 LCD
through GPIO and a keyboard matrix; it does not initialize RF or provide a TX API.
This is not a guarantee of physically blocking TX, and jumping from another
firmware that leaves peripherals active is not supported.

The menu lets the user select Diagnostics/Blocks with UP/DOWN and open with MENU.
In Blocks: 4/6 move left/right, MENU rotates, DOWN drops, `*` drops directly,
0 restarts, and EXIT returns. Three stable keyboard samples 10 ms apart are
required; a held key does not repeat and key combinations are not accepted.
The shell requests a tick no more than every 500 ms, without catch-up bursts.
Game ticks use unsigned time differences to tolerate millisecond counter wrap.
The ISR must be serviced before the next millisecond; an app may not mask
interrupts. This cannot be enforced for untrusted native code: actual timings
must be measured.

ELF, experimental BIN, map, compiler stack reports, BHA1 packages, manifests
with SHA-256, and licenses/notices are produced. The builder checks BIN limits,
stack/Reset/SysTick vectors against ELF symbols, targets for all remaining
vectors, RAM limits, and absence of unresolved symbols. Its tests reject
incorrect Thumb vectors, overlapping RAM, and missing symbols without needing
the ARM compiler. Individual stack reports **do not prove** the maximum
cumulative stack usage. The shell and renderer are tested on desktop, including
ticks at 499/500 ms, time wrap, return to menu, errors, and text limits.
The 3x5 renderer is original and includes no fonts or resources from other firmware.

**Do not load this BIN with the current web installer or as a multiboot slot.**
It does not implement F4HWN slot identification/CRC, USB protocol, recovery, or
external app installation. The manifest keeps `hardwareTested: false` and
`installableWithCurrentWeb: false`. The first boot test must be done with a
verified full backup and a verified recovery path.

### Distribution by Functional Image

#### Module Rebuild and Tests on 2026-10-26

The three profiles were rebuilt from the pinned commit, with Bricohams branding
and Beacon and VOX disabled. No code from the Karina binary was incorporated,
and these builds were not installed during this check.

| Profile | BIN (bytes) | Linked Flash / 120832 | RAM / 16384 |
| --- | ---: | ---: | ---: |
| ARDF | 113960 | 113072 | 12576 |
| Satellites (includes CAT TX) | 114844 | 113956 | 12384 |
| Spectrum | 118040 | 117152 | 13440 |

Linked Flash excludes the 888-byte multiboot stub, which is also stored in the BIN.
The builder verifies vectors, identity, image limits, and stub isolation.

All nine desktop C tests passed with Zig 0.13.0 as the C compiler: ARDF and its
adapter, Doppler, CAT RX, CAT TX, Satellites adapter, Spectrum, preset codec, and
Spectrum adapter. Adapters use simulated RF/display primitives; these results do
not certify RF, audio, physical boot, or complete functional compatibility with
Karina. All seven JavaScript builder tests also passed.

This is a verified rebuild of existing modules, not a new implementation of all
Karina functions. In particular, it does not establish equivalent dynamic volume,
autocapture with noise filtering, internal AM/squelch timing, AM generator,
complete persistent state presets, or menu equivalence. Auto-responses or TX
beacons are not implemented just because they appear in the Karina documentation.
Protocol identity remains F4HWN: renaming it without updating connectors and memory
maps would break interoperability with existing connectors and memory maps.

Functions are distributed across separate images when Flash/RAM prevent a
single image. The goal is to preserve Main and distribute compatible images in
slots 1-4, not invent dynamic code loading or mix bank formats.
No slots are assigned and no hardware is written automatically.

| Functional image | Actual status |
| --- | --- |
| Bricohams ARDF | Beta image built with `--module ardf`, cycles, and manual attenuation memory in Fox Hunt |
| Bricohams Satellites | Beta image with manual Doppler and CAT RX v1, built with `--module satellite`; no autonomous orbital tracking |
| Bricohams Spectrum | Beta image `--module spectrum`: 128 RX points, peak hold, averaging, RAM multipreset, and VFO-PRO RX capture with frequency entry |
| Other Karina-documented functions | Require reconstruction and testing; they are not claimed to be included by renaming an image |

Separation does not recover Karina code or guarantee that its algorithms are
equivalent. Each image must have its own manifest, actual modules, limits,
sources/licenses, and structural validation. The budget must be measured after
each combination is linked. Main is not replaced to demonstrate the selector,
and binaries from other projects will not be installed automatically.

### Custom Satellite Core

`firmware/bricohams/doppler.c` calculates frequency corrections using radial
velocity in mm/s. Positive means the satellite is moving away: RX decreases
and nominal uplink increases. Frequencies are expressed in 10 Hz units and
rounded to the nearest step. The formula matches the classical nonrelativistic
model used by the web planner; it does not reproduce a Karina algorithm or enable
transmission. The output always declares `receive_only=true`.

`BRICOHAMS_ENABLE_SATELLITE=OFF` excludes the library. It validates VHF
136-174/UHF 400-470 for both nominal and corrected frequencies, and radial
velocity up to 12 km/s in either direction. Invalid input preserves the previous
output and returns an explicit error. It does not generate TLE, UTC time, position,
SGP4 passes, or radial velocity: those data must come from a validated predictor.
It also does not implement CAT, automatic tracking, or persistence.
Tests compare 241 velocities against a double-precision reference, including
signs, limits, and rounding within half a unit (5 Hz).

### Satellite Image: Manual Receive Doppler

User guides associated with this image: [Satellite Basics](INICIACION-SATELITE.md)
(concepts, passes, Doppler, operation with keys 4/5/6/8/9, and CAT) and
[Satellite Antennas](ANTENAS-SATELITE.md) (simulated dual-band Yagi and V-dipole,
with printable STL parts).

The builder accepts `--module satellite` instead of `--module ardf` in the
FieldOps command below, with Beacon and VOX OFF. It rejects combining both:
they use different screens/keys in the same resident mode. The binary name
includes the module to avoid confusing the images.

The `satellite_foxhunt.inc` adapter takes nominal RX and TX from the selected
VFO/channel upon entering Fox Hunt and displays `SAT RX`. Both frequencies must
be within the supported bands. It does not change VFO data or TX frequency; the
calculated uplink result is not applied to the transmitter. It changes only RX
tuning and its filter through existing primitives. On exit, the Fox Hunt flow
restores VFO registers using `RADIO_SetupRegisters`. This must be verified on
hardware.

| Key | Manual Doppler |
| --- | --- |
| 4 | Decrease radial velocity by 500 m/s (approaching is negative) |
| 5 | Zero velocity: restore nominal RX frequency |
| 6 | Increase radial velocity by 500 m/s (receding is positive) |
| 8 | Enable temporary CAT RX / disable and return to nominal RX; requires a valid VFO |
| 9 | Arm / disarm CAT PTT (CAT TX v1) to send SSTV from the app |
| 2 | Existing Fox Hunt audio: mute, beeps, received audio; starts with the saved upstream setting |
| EXIT | Exit and restore the VFO RF configuration |

Manual limit +/-12 km/s, without wraparound. Velocity and corrected frequency
are shown on screen. `SAT INVALID VFO` means the nominal input or correction is
out of range: no new RF write is made, and the last accepted tuning is retained;
key 5 resets to zero if the nominal value is valid. Changing channel/nominal
frequency requires exiting and reentering. New keys respect the keyboard lock
and do not use F as a reverse key. There is no TLE, automatic satellite selection,
UTC clock, SGP4, or pass prediction inside the radio. A valid radial velocity
from an external predictor must be supplied manually, or an absolute RX frequency
via the new experimental CAT. It is not inferred from RSSI.

The build labeled SAT RX measured 112320 bytes, RAM 12352/16384, and Flash
111432/120832; any subsequent change must be measured again.
Adapter tests simulate RF primitives: they check signs, limits, applied frequency,
absence of TX/VFO changes, and recovery after errors. They do not certify reception,
audio, or physical restoration. The mode is receive-only except when CAT PTT is
armed with 9 (see CAT TX); the rest of the firmware retains upstream TX.
This is not firmware globally locked against TX or a full-duplex radio.

#### CAT RX Bricohams v1 Implemented

The `Satellite-CAT-final-20261025` image measures 113868 bytes RAW,
RAM 12384/16384, and Flash 112980/120832. It includes a Bricohams boot logo
and an original experimental endpoint, not compatibility with Kenwood/Yaesu CAT
protocols or CAT support from other F4HWN editions.

In SAT RX, press 8 with the keyboard unlocked: `CAT READY RX`.
A valid command displays `SAT CAT RX`. Keys 4/5/6 disable CAT
and return control to manual Doppler; 8 disables it and restores the entry
nominal RX frequency. Locking the keyboard cancels CAT and returns to nominal RX.
Exiting the mode clears CAT state before restoring the VFO through the upstream
flow. Reentering requires enabling it again with 8.

Each SET renews a 3000 ms lease. On expiry, nominal RX is applied,
any pending SET is discarded, and `CAT TIMEOUT` is displayed; CAT remains
enabled for a new valid command. QUERY, invalid commands, and errors do not
renew the lease. A correction from a lost pass is not held indefinitely.
The timeout is checked in the RX loop, not an interrupt: it depends on the
firmware continuing to execute that loop. It is not a hardware watchdog or
a guarantee against a CPU lockup.

The endpoint reuses existing USB CDC/UART frames with obfuscation and CRC;
**this is not encryption or authentication**. It accepts only absolute frequencies
in 10 Hz units, within 136-174 or 400-470 MHz inclusive, and applies them only
in locally enabled SAT RX. It does not modify channels, tones, power, EEPROM,
Flash, or TX. Modulation/bandwidth are those of the entry VFO. Do not use it as
transmission control or claim that RF tuning has been measured: confirmation
means the RX primitives were invoked.

Little-endian binary contract, private command `0x7B00`, response `0x7B01`.
The upstream Size header expresses data length, excluding the header.
No new commands are assigned for unrelated firmware.

| Request offset | Bytes | Contents |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 SET_RX, 2 STOP_RX |
| 2 | 2 | Sequence, echoed in the response |
| 4 | 4 | RX frequency in 10 Hz; zero required for QUERY/STOP |

The request must be exactly 8 bytes; there are no optional fields.

| Response offset | Bytes | Contents |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status |
| 2 | 2 | Sequence; zero if length does not allow processing the request |
| 4 | 4 | Capabilities 7: bit 0 SET_RX, bit 1 QUERY, bit 2 STOP/lease; no TX/persistent write |
| 8 | 4 | Last software-applied frequency, 10 Hz; zero if CAT is disabled |
| 12 | 4 | Flags: bit 0 locally enabled, bit 1 remote lease, bit 2 change pending |

Statuses: 0 query succeeded, 1 queued, 2 incorrect length/fields,
3 unsupported version, 4 unsupported operation, 5 CAT not enabled,
6 frequency out of band. Every error preserves previous state.
SET/STOP return 1: **this does not mean applied**. The RX loop applies the
validated change, updates the reported frequency, and clears the pending bit. A later SET arriving before
application replaces the earlier one; it does not create an unbounded queue.
STOP requests nominal RX and ends the lease without disabling the possibility
of another command while locally enabled.

The web connector exposes `getCatStatus`, `setCatReceive(frequency10Hz)`, and
`stopCatReceive`. It validates sequence/version/capabilities, distinguishes
pending from applied state, and checks the result using bounded queries.
It does not retry SET or renew automatically. A failure invalidates the
connection through the existing flow and requires reconnecting. These are not
persistent programming functions and do not authorize writes without a backup.

#### CAT TX Bricohams v1 (PTT by Lease)

Added on 2026-10-26 to send SSTV from the Android app. This is a remote PTT
for an external audio source connected to the radio's microphone input; it does
not change frequency, power, tones, EEPROM, or Flash. The firmware does not
generate audio: the app plays Robot36 over a cable to the microphone input while
holding PTT.

Safety measures, in order:

1. **Confirmation on the radio.** Only key 9 in SAT RX arms PTT
   (`CAT TX ARMED`); the host cannot arm it. Locking the keyboard, exiting
   SAT RX, or pressing 9 again disarms it.
2. **1500 ms lease.** The host renews the KEY command; if it stops, the radio
   releases PTT on its own. A queued KEY command also expires.
3. **120 s transmission limit.** On reaching the limit, the radio releases PTT,
   disarms, and displays `CAT TX LIMIT`; it must be armed again with 9.
4. **Radio bands and TX lock.** Before transmitting, the same checks as the
   Fox Hunt beacon (`FOXHUNT_TxState`) are applied: TX lock by band, low battery
   or high voltage, and FM modulation. If a check fails, `CAT TX DENIED` is
   displayed and no further KEY command works until rearmed with 9.
5. **Any key aborts.** During transmission the loop is modal: it does not run
   RX measurement or Fox Hunt Geiger beeps, only UART and keyboard. Any new key
   releases PTT and disarms.
6. **Callsign required.** The app does not transmit without a valid callsign and
   prints it in the Robot36 image.

It transmits on the entry VFO's TX frequency (with its offset), without uplink
Doppler correction. The red LED lights as with normal PTT, and the screen shows
`CAT TX ON AIR` and the TX frequency. While transmitting, CAT RX commands are
accepted but applied upon returning to RX.

Contract: private command `0x7B02`, response `0x7B03`, little-endian.

| Request offset | Bytes | Contents |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 KEY (activate or renew lease), 2 UNKEY |
| 2 | 2 | Sequence, echoed in the response |
| 4 | 4 | Reserved, required to be zero |

| Response offset | Bytes | Contents |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status |
| 2 | 2 | Sequence; zero if length does not allow processing the request |
| 4 | 4 | Capabilities 8: PTT with lease; no frequency, power, or persistent write |
| 8 | 4 | Flags: bit 0 armed, bit 1 transmitting, bit 2 KEY pending, bit 3 limit reached; bits 8-15 VFO rejection status |
| 12 | 4 | Milliseconds transmitting, zero when not transmitting |

Statuses: 0 success (KEY: already transmitting), 1 queued (KEY pending or UNKEY
pending application), 2 length or reserved field, 3 version, 4 operation,
5 not armed, 7 rejected by the radio, 8 120 s limit. UNKEY is always accepted.
CAT RX capabilities remain 7: CAT TX is a separate endpoint.

Verified on 2026-10-26: `cat_tx_test` (protocol, lease, limit, rejection) and
`satellite_adapter_test` (key arming, modal transmission, key abort, rejection,
limit, disarm on lock and exit) pass with simulated RF primitives. The F4HWN
v6.1.0 Fusion image with `--module satellite` and
`ENABLE_FEAT_F4HWN_FOXHUNT=ON` compiles without warnings: Flash 113212/120832,
RAM 12384/16384. **Not validated on a radio; no RF measurements.**

In **Quansheng > Operations** there is a Beta CAT RX panel to query, tune during
a lease, and return to nominal. Its status is the latest response, not continuous
telemetry. Web pass tracking is described below; Android has an experimental USB
client with SGP4 orbital tracking. Controls are disabled without a connection or
during another operation. Testing requires booting the new image: connecting to
the original firmware does not install it or activate CAT.

The eight C suites include protocol, ranges, invalid lengths, echoed sequence,
expiration across rollover, no renewal on query, local/keyboard-lock cancellation,
and adapter flow with simulated RF. JavaScript tests simulate transport, pending
responses, incorrect sequence, and errors; they do not replace a CAT USB/radio test.
The manifest includes `catRx` and hashes of the applied code. It has not been
flashed or physically certified.

#### Web Pass Tracking Implemented over CAT RX

In **SAT / passes**, update TLE/frequencies, enter a location with consent,
calculate passes, and select a pass and a specific FM frequency.
**Track selected pass using CAT RX** starts only during the selected pass
interval and while the satellite is above the horizon. No unattended future
start is scheduled. The prediction must be less than 15 minutes old, and the
TLE must be within its maximum validity of seven days. The radio requires the
CAT image above, SAT RX, and physical enablement using 8.

`catPassTarget` reuses satellite.js/SGP4 and the existing TLE validations.
It calculates observer-satellite distance at t-0.5 and t+0.5 seconds, derives
radial velocity, and applies `fRX = fNominal * (1 - vRadial/c)`.
It rounds to 10 Hz and rejects results outside supported RX bands.
It supports only specific FM/narrow FM frequencies, not linear transponders.
The observer is fixed for the session: it does not track mobile GPS or point antennas.

`CatPassTracker` takes an independent copy of the plan: later changes do not
silently alter the active session. The UI locks radio/programming operations and
plan parameters while tracking the pass. **Stop CAT tracking** stays outside the
locked fieldset and remains operational. After each confirmed SET, it waits
750 ms before calculating the next, approximately one update per second depending
on the link. It renews even when the rounded frequency does not change to maintain
the lease. It does not keep two SETs in flight or promise a fixed real-time rate.

Tracking stops when the pass ends, the page is hidden/closed, consent is withdrawn
or data changes, the connection is lost, a propagation error is detected, or a late
confirmation arrives. It also rejects clock reversals and update intervals longer
than 2000 ms. A suspended browser is not a real-time controller: if it cannot send
STOP, restoration depends on the firmware's 3 s lease. The computer's UTC clock
must be correct; there is no automatic external synchronization.

On cancellation, the controller waits for any in-flight SET before sending STOP,
preventing a late SET from reactivating tracking. It does not retry SET after
cancellation or restart sessions automatically. Restoration errors are displayed,
not treated as success. The UI shows the last calculated frequency and geometry,
not an RF measurement.

Six JavaScript core tests cover Doppler checked against SGP4 range calculations,
validation, plan snapshot, renewal, cancellation during SET, pass end,
discontinuities, late responses, and disconnection. Browser test with simulated
transport: two RX SETs, manual STOP, and STOP when simulating a hidden page, with
no errors and the stop button usable while parameters are locked.
These commands have not been run on a real radio. The Android APK includes
temporary CAT RX over CDC and recognized USB-serial adapters with its own SGP4
tracking. Orbital calculation remains outside the MCU; TLE/SGP4 have not been
added to the MCU.

### Custom Spectrum Presets, Without Writing EEPROM

`firmware/bricohams/presets.c` defines a 208-byte BHSP v1 container
with up to 8 presets: 8-character ASCII name, start frequency, step, points,
settling, and samples. It uses explicit little-endian integers, IEEE CRC32,
and zero reserved bytes; it does not serialize C structs or depend on their
alignment. The active selection is part of the container.

The codec checks configurations and rejects corruption, unknown version/reserved
fields, and invalid lengths. It decodes to a temporary before replacing state;
it encodes to a temporary before replacing the destination. Buffers must not
overlap the state. No EEPROM/Flash address has been reserved: persistence uses
a local file and the RAM transfer described below, not internal storage.
Tests verify round-trip and corruption of each of the 208 bytes.

#### Preset File Transfer Implemented

The `Spectrum-PresetFiles-beta-20261025` image includes export and import of
the full RAM table, from **Quansheng> Operations > Bricohams Spectrum Presets Beta**. The `.bhsp` file is exactly
208 bytes, with no private calibration or channel configuration data.
The transfer does not write EEPROM or Flash and does not grant permission
for persistent programming. The web app does not upload it to servers. It
must still be downloaded and retained; it is not saved automatically on the
phone or radio.

Before transfer: enter SPEC RX, save at least one preset with 8, pause with 4
(`HOLD`), disable MULTI if it was active, and unlock the keyboard. Transfers
from RX capture are not accepted. Import does not require existing presets.
Exporting an empty table returns an error. Enablement depends on the radio's
physical state, not a web boolean. Pressing any processed key during a transfer
discard its partial state. Exiting the mode also discards it.

Export captures a complete BHSP snapshot and returns it in two fragments.
Import receives both fragments into a temporary buffer, validates the complete
file, and only then replaces the RAM table. An interruption, missing fragment,
different token, or incorrect CRC does not replace the table. The general codec
format supports more configurations than the adapter; import requires 128 points,
settling of 10/20/40/80 ms, steps of 125/250/625/1250 in 10 Hz units, averaging
of 1/2/4/8, and a complete window within 136-174 or 400-470 MHz. Names, selection,
reserved fields, and unused records must be canonical.

Import does not tune, resume the sweep, or restore gain, blacklist, CSS, or audio.
Key 9 loads the next preset using the existing behavior, and 4 resumes. The web
app rereads the full table after confirming import and requires byte-for-byte
equality. A read-back error is shown as an unverified import: if COMMIT was
accepted, it cannot be claimed that the table remains unchanged.

Experimental private little-endian protocol `0x7B10` / response `0x7B11`,
over existing USB CDC/UART frames. This is not encryption or authentication.
Requests: version 1 (byte 0), operation (byte 1), nonzero 32-bit token
(bytes 2-5), and for operations 2/3 only, a 104-byte fragment. Other commands
are exactly 6 bytes. Response: version 1, status, and same token, followed by
104 bytes only for successful exports. Errors are 6 bytes. C structs are not
serialized.

| Operation | Action |
| --- | --- |
| 0 | Create snapshot and read first 104 bytes |
| 1 | Read second 104 bytes from the same snapshot and close transfer |
| 2 | Start import with first 104 bytes |
| 3 | Receive second 104 bytes |
| 4 | Validate and apply the complete RAM table |
| 5 | Discard partial transfer without modifying presets |

A new operation 0/2 replaces the previous transfer. Operations 1/3/4 require
the correct token and phase. The transfer expires 5000 ms after it starts;
individual fragments do not extend that window.
Statuses: 0 success, 2 invalid request, 3 required physical state not met,
4 table empty/invalid for export, 5 wrong phase/token/expired,
6 corrupt/unsupported file, 7 configuration not supported by adapter.
There are no automatic retries or COMMIT after a fragment error.

The build records `spectrumPresets` and source hashes in the manifest.
Tests simulate radio and transport: they cover reading, CRC, atomic commit,
file recovery, different read-back, sequence/token, expiry/rollover, invalid
lengths, and blocking during capture/MULTI/keyboard lock. This preserves presets
between sessions in files; it is not equivalent to EEPROM persistence.
Physical USB has not been tested.

### Spectrum Image, VFO-PRO RX, and Multipreset

`--module spectrum` replaces `--module ardf` in the FieldOps command
documented below, using a new output directory. It requires resident Fox Hunt ON,
Beacon OFF, and app overlay OFF. Each adapter needs its own image. Fox Hunt mode
displays `SPEC RX`; the upstream original analyzer remains available through
its other actions.

The custom sweep covers 128 points: 64 below center, center, and 63 above.
The entire window must fit in 136-174 or 400-470 MHz. On entry, it takes the
selected VFO/channel center. It does not change memories, channel RX/TX, or
calibration. Modulation and bandwidth remain those of the original VFO; entering
an RX frequency does not configure a new channel profile. Gain uses existing
presets and allows adjustment only of the four R13 RX fields documented from
capture. Arbitrary register editing is not available. The exit flow restores RF
using `RADIO_SetupRegisters`; this restoration and RF operation remain pending
physical testing.

| Key | Custom sweep |
| --- | --- |
| 0 | Enable/disable circular traversal of RAM presets; requires two or more |
| 4 | Pause/resume sweep and window change |
| 5 | Reset peak hold to current levels |
| 6 | Step 1.25, 2.5, 6.25, 12.5 kHz; resets the frame |
| 7 | Average 1, 2, 4, 8 samples per point; resets the frame |
| * | RX settling 20, 40, 80, 10 ms, circular; resets the frame |
| 8 | Save to the next RAM preset; if there are eight, replace the selected one |
| 9 | Load the next RAM preset circularly |
| 3 / arrows | Upstream attenuation; changing gain resets non-comparable measurements |
| 1 | Clear session exclusions and reset measurements |
| 2 | No action during sweep; audio muted |
| PTT | Capture strongest measured point into VFO-PRO RX; does not transmit |
| EXIT | Exit, discard RAM presets, and restore the VFO |

Raw RSSI and peaks are displayed on an automatic scale from 0 to the frame's
maximum peak, not calibrated dBm or an FFT. The scale may change. Each tune
applies frequency, RX filter, and BK4819 receive reset, then waits at least the
selected settling time based on actual SysTick before accepting samples. It does
not block while waiting. Each sample comes from a different iteration. Modal-loop
delays also affect cadence: no sweep rate, resolution bandwidth, or instrument
accuracy is guaranteed.

Settling starts at 20 ms on each mode entry and is saved individually in
RAM/BHSP presets. Earlier files with 20 ms remain supported; other values besides
10/20/40/80 are rejected without replacing the table. VFO-PRO capture and gain
changes retain their independent 20 ms wait. The 10 ms mode is experimental:
its availability does not demonstrate that the PLL, filter, or RSSI has stabilized
under all conditions. It is not a reproduction of Karina's internal Delay or Turbo
parameter and does not reduce CSS time.

`SPECTRUM ERROR` stops new tuning if the window does not fit in band or the core
returns an error. The endpoints are not silently clipped: load a valid preset,
reduce the step, or exit and change the center. New keys respect the keyboard lock.

#### Custom VFO-PRO Capture: Receive Only

The functional reference is section 4.4, page 22 of the August 2026 Karina V1
manual: active capture and detailed view. The V3 implementation is original.
PTT does not enable TX or apply uplink offset/tones. This does not establish
complete equivalence with Karina VFO-PRO.

PTT selects the highest current average RSSI among completed points; ties go to
the first. In the first frame it considers only completed points; afterward it
also considers points from the previous sweep not yet updated. It does not choose
by historical peaks or identify stations. With no completed points, `WAIT SAMPLES`
provides a notice and tuning is not changed.

| Key | RX capture |
| --- | --- |
| Up / down | Tune one sweep step, without leaving RX bands |
| 2 | Enable/disable received audio through the upstream path |
| 3 | Upstream attenuation |
| MENU | Toggle help and RX gain view: R13/R43 readings and selected field |
| 6, in gain view | Select LNAs, LNA, MIX, or PGA |
| 1 / 7, in gain view | Decrease/increase selected RX field index, without wraparound |
| 4 | Include/exclude captured frequency in the session blacklist |
| 9 | Enable/disable optional CTCSS/DCS search, only if original VFO is FM |
| * | Direct entry of eight RX digits; 43512500 represents 435.12500 MHz |
| 5 | Center a new sweep on the captured frequency if the full window fits |
| PTT | No action; does not transmit |
| EXIT | Return to the original sweep center, reset measurements, and retain presets |

Tuning and gain changes wait at least 20 ms before displaying raw RSSI;
`SETTLING` is shown during the wait. `BAND LIMIT` retains the last frequency
when an attempt would leave the band. `SPAN OUT OF BAND` retains the capture
and previous center if 5 cannot fit the entire window.
Registers and indices are raw values, not certified calibration. Only the R13 RX
fields described below are modified; deviation, microphone, AFC, and TX are not
edited. Optional CTCSS/DCS search is described below. There is no findings list
or saving frequencies to memories.

For direct entry, MENU applies only eight valid digits; * deletes one digit
(cancels if empty), and EXIT cancels without tuning. Number keys do not trigger
capture actions while digits are being entered. PTT also does not transmit.
`ENTER 8 DIGITS`, `FULL: 8 DIGITS`, and `RX OUT OF BAND` report rejection;
the last accepted tuning remains unchanged.

Pressing EXIT again while in sweep exits the mode through the upstream flow.
Fine tuning does not change the center until 5 is pressed and never modifies
channel RX/TX. With the keyboard locked, arrows retain upstream attenuation
behavior and do not tune. Audio starts muted in capture; its setting from before
entering the mode is retained on exit. Fox Hunt setting writes are suppressed
in this image: gain and new options are session-only. Outside this mode, the
firmware retains upstream TX; it is not globally RX-only.

#### Manual RX Gain and Exclusions

The register view lets key 6 select the R13 fields documented by upstream
`BK4819_InitAGC`: LNAs (bits 9:8, indices 0-3), LNA
(7:5, 0-7), MIX (4:3, 0-3), and PGA (2:0, 0-7). 1 decreases and 7 increases;
`GAIN LIMIT` rejects overflow without writing. Each adjustment reads R13,
changes only the selected mask, and preserves all other bits, including unknown
15:10. It does not change R43, R7E, or AGC tables. Fox Hunt already fixes AGC
on entry; no second AGC policy is enabled.
The gain indices are not calibrated dB or values interchangeable with Karina.
`RX GAIN SESSION` reports the adjustment and settling is awaited again.
When exiting the register view, MAN is shown instead of ATT; the number after
MAN is the last preset index, not effective attenuation. Manual adjustment
remains active when returning to sweep and changing window, but is not saved in
presets. Changing the gain preset with 3 or the upstream attenuation arrows
replaces those fields and returns to ATT.
Exiting the mode restores RF through the upstream flow, pending physical testing.
Gain is not saved to EEPROM and is not calibrated.

The blacklist contains 16 exact frequencies in 10 Hz units, not ranges.
In capture, 4 toggles the frequency: `FREQ EXCLUDED` / `FREQ INCLUDED`;
`BLACKLIST FULL` rejects a new entry without evicting another. BL indicates the
count, and X marks an excluded capture. In sweep, 1 clears the list, resets
measurements, and displays `BLACKLIST CLEARED`.

During sweep, each matching point is skipped without tuning or reading RSSI,
and its level/peak is zeroed. A marker is drawn, not a measurement.
Automatic PTT capture ignores excluded points; `POINTS EXCLUDED` reports when
all completed points are excluded. Skipping also advances at frame or preset end,
without waiting for signal or spinning in a blocking loop. The list is retained
across presets and steps during the session: if a different grid does not match
exactly, a neighboring frequency is not excluded. Manual tuning can listen to an
excluded frequency so it can be included again with 4. This is not an RF access
or TX restriction. The list is discarded on exit/power-off and is never written
to persistent memory.

#### Optional CTCSS/DCS RX Search

In FM capture, 9 enables `CSS SEARCH...`; pressing 9 again disables it.
`CSS NEEDS FM` rejects enabling in other modes without writing RF.
The search reuses upstream `BK4819_SetScanFrequency`,
`BK4819_GetCxCSSScanResult`, and DCS tables/decoders. It is not an original DSP
decoder or certification of hardware detection. The detector's temporary
configuration does not modify the channel's TX/RX tone or enable transmission.

R51 is saved before enabling and restored when disabled, returning to sweep with
EXIT/5, or exiting the mode. The search primitive may reset the RX path, so R13
gain and R7E AGC registers are preserved and reapplied. Calibration is not
written and results are not saved. Changing frequency restarts the search at
that frequency; changing gain discards the previous candidate and indication.

Results are ignored during the first 500 ms after tuning/enabling and are queried
at most every 250 ms. A tone requires two consecutive valid results of the same
type and index, separated by that interval. A missing or invalid result breaks
confirmation. A confirmed indication expires after 1500 ms without new
confirmations; a tone from an earlier transmission is not kept indefinitely.

CTCSS is displayed in Hz to one decimal place and accepts only a measurement
within 0.5 Hz of the upstream table nominal; this is a display filter, not a
measured instrument tolerance. DCS is validated with the upstream Golay decoder,
first normal and then with its 23 bits inverted; it is displayed in octal with
N/I. This polarity is an interpretation of the observed codeword, pending
comparison with a real generator/radio.

The audio/blacklist line is replaced with the tone or `CSS SEARCH...` while
active; audio and exclusion keys remain functional. RSSI is not used to claim
tone validity, audio is not tone-filtered, and results are not copied to memories.
Noise, weak carriers, or frozen detection registers may cause false matches:
check against a known source before using the indication to configure another
radio. Adapter tests simulate chip and decoder results and verify timing,
normal/inverted modes, rejection, expiry, rollover, and restoration of
R51/R13/R7E; they do not measure actual RF detection.

#### Session Multipreset

RAM1...RAM8 presets store window, step, and averaging, not gain, measurements,
or calibration. P0/0 indicates there are none. They do not survive exit/power-off
and do not write EEPROM. The new image supports importing/exporting the RAM table
over USB/UART to BHSP files, as described above.

For different windows: PTT captures, * enters another RX frequency, MENU accepts,
5 returns to a centered sweep, and 8 saves. Repeat for the required ranges.
With two or more presets, 0 starts `MULTI` from the selected one. After 128 points,
the frame is displayed and the next iteration starts another preset; after the
last, it returns to the first. Each window resets its levels/peaks: measurements
from different bands are not mixed. This is not parallel scanning, threshold
search, or a station list.

4 also pauses the transition; 0 disables MULTI without deleting presets.
`SAVE 2 PRESETS` reports if there are fewer than two. Changing step, averaging,
or gain resets the current frame without skipping it; it does not change the preset
until saved with 8. PTT suspends traversal during capture; EXIT or 5 returns to
sweep. Presets and MULTI are discarded on exit.

Build with boot logo and preset transfer: 118044 bytes, RAM 13440/16384,
Flash 117156/120832; 888-byte Multiboot stub and 83 isolation branches checked.
This combination has little headroom: modules cannot be added without rechecking
size and RAM. All eight C suites pass, including partial/complete capture, RX
entry, rejections, reading without writing R43, multipreset cycles, pause,
averaging, exact exclusions, and limits. 524288 combinations are checked:
all 65536 R13 values, across four fields and both directions, including no
wraparound and exact preservation of unrelated bits. The three Spectrum suites
pass without ARDF/Satellites. These tests simulate RF and display; they do not
validate the physical radio.

#### Selection from the Web

In Quansheng, **Custom Firmware > Local Bricohams Images**, select ARDF,
Satellites, or Spectrum and copy the PowerShell command. It does not use online
catalog checkboxes, compile in the browser, or install anything. It requires
local ARM tools, a Fusion61 with the pinned commit, and a new destination.
Command paths must be adapted for the computer. Then load all files from
`artifacts`, including SHA256SUMS and build-info, into the existing verifier.
Preparing and installing a slot is still separate and requires a verified backup;
Main is preserved.

### New Independent ARDF Core

The original implementation is based on documented behavior and binary
inspection, without waiting for Karina sources. This **does not establish 100%
equivalence** or turn the F4HWN base into a complete rewrite from scratch.

`firmware/bricohams/ardf.c` and `ardf.h` are an independently written C99 core:
ARDF or Karina implementations have not been copied. It implements cycles for
1-10 transmitters, no-cycle mode (0), transmitter/phase synchronization,
turn-end warning, and gain-index memory by VFO/transmitter with an A/B mask.
It does not control the RF chip, TX, speaker, display, keyboard, EEPROM, or
calibration.

Contract:

- `bh_ardf_init` validates before changing state. Reconfiguration clears gain
  history. A rejected configuration preserves state.
- The input clock is monotonic `uint32_t` milliseconds; rollover between calls
  is allowed, but backwards jumps or intervals of 2^32 ms or more are not.
  The adapter must convert the radio's tick base.
- `correction_ppm` from -50000 to 50000 changes clock advancement; positive
  speeds it up. It is not another firmware's `ClkCor` value or an RF oscillator
  adjustment. Fractions are retained between updates.
- Duration is 1000 to 999990 ms, warning is 0 to 30000 ms and cannot exceed
  the turn. These are limits of this implementation, not binary equivalence.
- `max_gain_index` must come from an RF table validated for the hardware; the
  core does not assume an index represents 5 dB.
- Gain lookup returns `available=false` if there is no history; in that case the
  output index is unchanged. The caller must check the result, not turn it into
  a default RF adjustment.
- Functions return explicit errors; a future adapter must report them. Do not
  call concurrently from interrupts and UI.
- `BRICOHAMS_ENABLE_ARDF=OFF` excludes the entire library at build time.
  This is a build selection, not dynamic module loading.

Native tests (C compiler, CMake, and generator available on PATH):

```powershell
cmake -S .\firmware -B .\firmware-builds\core-tests -G Ninja -DBUILD_TESTING=ON
cmake --build .\firmware-builds\core-tests
ctest --test-dir .\firmware-builds\core-tests --output-on-failure
```

The `firmware-modules.yml` workflow runs the C tests and also checks the
configuration without ARDF. These are core tests, not radio validation.
ARM compilation checks instruction and dependency compatibility, but does not
replace running the tests.

**Beta integration available:** `--module ardf` includes the core and an adapter
in resident Fox Hunt. The builder validates every integration point against its
pinned checkout before writing changes. It requires Fox Hunt ON, app overlay OFF,
and Beacon OFF; original sources are not modified. The clock comes from actual
10 ms SysTick, not counting loop iterations. It uses only the existing Fox Hunt
attenuation table; indices are stored in RAM and recalled manually, not on
automatic transmitter changes. No new configuration or calibration is written.

Build:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\USER\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\ardf-beta' `
  --preset FieldOps `
  --option ENABLE_FEAT_F4HWN_BEACON=OFF `
  --option ENABLE_VOX=OFF `
  --module ardf
```

Without `--module`, the builder does not apply adapters or include custom cores.
`--module karina` and other unimplemented names are explicitly rejected.
The manifest includes hashes of applied files and original GPL-3.0-or-later
licenses alongside the upstream Apache-2.0 LICENSE/NOTICE.
`sourceChangesIncluded: false` means uncommitted local changes from the reference
repository are not included; module changes do appear under `modules` and
`moduleSources`.

In Fox Hunt, with the keyboard unlocked:

| Key | ARDF module |
| --- | --- |
| 4 | Number of transmitters: OFF, 1...10, OFF. Resets synchronization and history |
| 5 | Duration: 15...120 s, in 15 s steps; initial 60 s. Resets synchronization |
| 6 | Select the transmitter number to synchronize |
| 7 | Synchronize the selected transmitter's start with the actual event |
| 8 | Save current attenuation and record a manual observation of the current transmitter |
| 9 | Manually recall saved attenuation for the current transmitter, if available |
| EXIT | Exit Fox Hunt, retaining upstream behavior |

The context line shows number/duration/selection before synchronization,
and transmitter/countdown afterward. `!` indicates the final 5 seconds: no
new beep is added. `ARDF ERROR` reports a core error; changing number/duration
reinitializes it. F does not reverse the new actions on 4-9.
The existing keyboard lock continues to block these keys. Each entry to the
mode starts OFF; there is no persistent restore or two-VFO memory in this first
adapter (the core itself supports two banks).

Structural build on 2026-10-25:
112672-byte image, RAM 12448/16384, linked Flash 111784/120832,
888-byte Multiboot stub with 83 branches checked. These are measurements for
this combination, not guaranteed capacity for any set of modules.
Adapter tests use simulated radio calls; keys, synchronization, display, errors,
and manual save/recall are checked. **It has not been installed or validated on
hardware.** Outside Fox Hunt, the firmware retains upstream TX capabilities;
Beacon/VOX OFF does not block all TX. Do not use it as certified ARDF firmware.

**Pending:** physical validation of display, timing, and attenuation; persistence/VFO
options; competition settings; and reception. The custom analyzer, RX capture,
and multipreset are integrated in the separate `spectrum` image, not ARDF.
The described functions do not establish full parity with Karina.

### ARDF Per-Beacon Statistics Implemented

The `ARDF-Stats-final-20261025` image includes the boot logo and manual
per-beacon observations: 113960 bytes RAW, RAM 12576/16384, and Flash
113072/120832. This is not automatic detection or position estimation.

In synchronized ARDF, each processed press of 8 saves attenuation as before
and records an observation for the transmitter in the current turn.
The cycle is updated before attribution to avoid using the previous turn when
its boundary is crossed. Each of the ten beacons has a counter, first/last
session-relative timestamp, and last attenuation index. RSSI, bearing, frequency,
and GPS coordinates are not sampled or stored. Index 0-5 belongs to the upstream
six-step table; it does not represent dB.

Counters saturate at 65535 without wrapping; a flag indicates if more
observations were attempted. In that case totals are a minimum, not an exact
count. First/last time and index continue to update. Time is elapsed since
entering/reconfiguring ARDF, not since synchronizing a beacon. A uint32
millisecond clock is used: a session must be shorter than 2^32 ms (about
49.7 days). It is not UTC or GPS, and `receivedAt` in JSON is the computer's
receipt time.

Reentering ARDF or changing transmitter count/duration starts a new session and
clears previous observations. Resynchronizing with 7 does not clear data if
count/duration are unchanged. On exit, time is frozen and the last RAM table
is retained until a new session starts, reconfiguration, or radio restart/power-off.
EEPROM/Flash is not written for these statistics; upstream Fox Hunt settings
save behavior outside this table remains unchanged.

In **Quansheng > Operations > Bricohams Beta ARDF Statistics**,
**Query and download ARDF statistics** obtains a snapshot and prompts to download
JSON. There is no continuous polling or upload to services. A completed session
or OFF state can be queried, but not a radio that has never started ARDF since
boot. The UI identifies module errors, saturation, and missing position.
The download must be confirmed in the browser before discarding the session.

JSON includes the connector's `connectionSession` and a firmware `session` counter,
local to that boot. These are not global IDs: for reconnections or restarts, retain
the original files and do not merge sessions using only the number.
`observations` contains one record per observed beacon, not an event per key press
or a GPS track. It exports the summarized table; it does not reconstruct
intermediate observations.

Experimental private little-endian protocol: command `0x7B20`, response
`0x7B21`. Request exactly 4 bytes: version 1, operation 0 (query),
16-bit sequence. Response is 140 bytes, plus a 4-byte upstream header:
within its 144-byte response limit.

| Response offset | Bytes | Contents |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status: 0 success, 2 invalid request, 3 no session started |
| 2 | 1 | Flags: active=1, synchronized=2, module error=4, counter saturated=8 |
| 3 | 1 | Transmitter count, 0-10 |
| 4 | 2 | Echoed sequence; zero for invalid request length |
| 6 | 2 | Reserved, zero |
| 8 | 4 | Nonzero session counter, reset at boot |
| 12 | 4 | Turn duration in ms |
| 16 | 4 | Session elapsed time in ms |
| 20 | 120 | Ten 12-byte records, beacons 1-10 |

Each record contains uint16 counter, uint8 gain index, uint8 valid (0/1),
uint32 first timestamp, and uint32 last timestamp. Records without observations
are zero. The connector validates length, version, sequence, reserved fields,
beacon number, index, time order, and consistency before delivering or exporting
data. Invalid requests do not clear or change the table. Transport obfuscation
is not encryption/authentication.

C tests with simulated radio: turn boundaries, first/last time, counter saturation,
restarts, read after exit, invalid lengths, and clock rollover. JavaScript tests
verify snapshots and rejection of sequence, beacon, index, time, reserved fields,
and missing session. Physical USB integration and display remain pending.
A phone location is not attributed to a past observation: future GPS logging
must capture its own timestamps/accuracy and consent.

### New Independent Spectrum Acquisition Core

`firmware/bricohams/spectrum.c` and `spectrum.h` implement an original C99
state machine, without copying Karina algorithms. It configures 1 to 128 points,
start frequency and step in 10 Hz units, settling of 1-1000 ms, and averaging of
1-16 RSSI samples per point. Each point retains mean level and peak hold; resetting
peaks uses current levels. `BRICOHAMS_ENABLE_SPECTRUM=OFF` excludes this library.

The adapter must request `bh_spectrum_frequency`, validate the actual band,
tune the receiver, and call `bh_spectrum_tuned` only on success. Samples before
settling return `NOT_SETTLED` and are not included. Tuning is required again after
each point, even when there is only one point. `frames` increments after a sweep
completes. Values are raw RSSI, **not calibrated dBm**; the adapter must ensure
a larger value represents a stronger signal.

The clock has the same monotonic 32-bit contract as ARDF; functions are not called
concurrently. The adapter determines cadence and takes distinct RF readings:
calling repeatedly with the same reading does not create independent samples.
The core does not control AGC/LNA/PGA, transmit TX, calculate an FFT, or save
presets/calibration.

Tests exercise limits, point changes, exact frequency calculation, averaging,
peaks, settling, rollover, 128 points with 16 maximum RSSI samples, and atomic
rejection of invalid/overflowing configuration. This is not the Karina analyzer.
The `spectrum` image adapter connects this core to receiver and display within the
Beta scope described above; physical validation remains pending.

Requirements on PATH: Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain,
and Python 3 for the upstream format checker. No external Python packages or
new npm dependencies are required.

Configuration used and tested on Windows:

- Arm GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, detected by CMake.

From this repository root, in PowerShell:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

The destination **must be new**: an existing build is not deleted or overwritten.
If a build fails, an error is shown and no artifact set marked successful is
provided; use a new destination when retrying. Sources and diagnostic results
remain in the failed destination.

For Labs, replace `--preset Fusion` with `--preset Labs` and use another
destination. `FieldOps` and `Transfer` are also accepted, although these two
profiles were not compiled in this validation.

Each `--option` accepts exactly `ENABLE_XXX=ON` or `ENABLE_XXX=OFF`.
The `--option` argument can be repeated for different features, but not for
the same name. Available options are the Boolean options of the **pinned local
commit**, not those of the online v6.3.0 form. Unknown keys, arbitrary values,
`DEV`, other hardware, and invented versions are not accepted.

To list them without building:

```powershell
$p = Get-Content 'C:\Users\USER\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

The builder resolves preset inheritance and requires these to remain enabled:

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

These conditions preserve the slot-management profile; they do not guarantee
that every remaining combination is useful or safe. The linker must accept RAM
and Flash usage, and upstream checks must pass. Budgets are not reduced and
checks are not skipped to make an image fit.

## Sources, Build, and Reproducibility

The script clones the **local** repository into a separate folder and checks out
the pinned commit. It does not modify the Fusion61 folder, apply its uncommitted
diff, download Karina, or change the version to bypass the inspector.

`SOURCE_DATE_EPOCH` is set to the commit time, `TZ=UTC`, and `LC_ALL=C`.
With the specified toolchain, two Fusion builds in different paths produced the
same `.bin` SHA-256. This verifies local firmware reproducibility, not byte-for-byte
identity of ELF, maps, or reports containing absolute paths, nor reproducibility
with another toolchain.

The builder:

1. Validates arguments, commit, and options before creating the destination.
2. Clones sources and configures CMake in Release.
3. Builds with the selected preset, Bricohams edition, and resolved options.
4. Retains the format and RAM-restorer isolation checks.
5. Checks binary length, PY32 vectors, version, and edition marker.
6. Emits artifacts, effective options, tools, and hashes.

The `source` directory retains the checkout used. The `artifacts` folder
contains firmware, ELF, map, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`,
and `SHA256SUMS`. All except the manifest itself are included in SHA256SUMS.
The hash detects changes relative to the manifest; **it is not a digital signature**.

## Binaries Generated on 2026-10-25

Both have `ENABLE_VOX=OFF`; other options are those of their upstream preset.

| Profile | Binary | RAW bytes | RAM per linker | Flash per linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

RAW size includes the RAM-restoration section and does not equal the report's
FLASH line. Both RAW files are below the 120832-byte maximum. The isolation
check reports 888 bytes and 83 jumps checked.

SHA-256:

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs retains `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` and
`ENABLE_FEAT_F4HWN_OVERLAY_APPS`; Fusion does not. Physical backup capability
requires the radio's compatible protocol and has not been tested on hardware.
No new `.app` files were generated: existing ones need compatible ABI/API.

## Use on the Web and Slots

Copy the delivered artifacts to:

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

In **Quansheng > Custom Firmware > Verify downloaded build**, select together
**all** files from an artifacts folder. The verifier requires every SHA256SUMS
entry, including map, ELF, and licenses. After verification, **Use this firmware**
prepares it in the slots panel.

Alternatively, select `Documents\Multiboot` in the local library: both `.bin`
files appear as additional images that can be prepared. The library checks
structure and displays a hash, but does not automatically verify the adjacent
manifest; use the build form for that.

Installation retains full backup, confirmation, and slot CRC. Use
**slots 1-4, not Main**. No radio data has been written or erased.
Fusion and Labs here are local experimental builds, not official signed or
bench-certified releases. The upstream stable toolchain does not change the
derivation's experimental status.

## Hardware Validation Pending

Software validation completed: 149 tests, syntax check, and Pages build passed.
In the browser, all 7 manifest files for each edition were verified, both firmware
images prepared, and installation remained blocked without connection/backup.
After delivery, selecting Multiboot examined 73 images: 11 structurally accepted
and 62 blocked. There were no JavaScript errors in that check.

Before considering it suitable for operational use, unit identification, original
backup, boot and recovery test, calibration, menus, RX, and CFG/slot switching
remain pending. The previous USB error is not claimed to be resolved.
These binaries are not published or flashed automatically.
## Boot Branding Implemented

The builder applies the Bricohams welcome to all new editions, with or without
an adapter. It retains upstream license notices and does not alter the reference
repository. Integration points are validated once: a different source or duplicate
patch stops the build. The manifest records hashes in `brandingSources`, separate
from `moduleSources`; `sourceChangesIncluded: false` still refers to local changes
in the upstream repository, not to the absence of these original patches.

With `ENABLE_FEAT_F4HWN_LOGO=ON`, the LOGO startup mode and calls to
`UI_DisplayLogo` show a monochrome 128x48 adaptation of the original Bricohams
logo, plus `Bricohams BETA` in the last row. It occupies a 768-byte bitmap in
internal Flash. The custom external Flash logo is not read or overwritten: it
is retained, but not displayed in that mode in these derived images. Disabling
LOGO at build time excludes the bitmap through unused-code elimination; this
option is not forced.

NONE/SOUND modes still show no welcome; the stored startup preference is not
changed. In text modes, personal messages and voltage are retained; only empty
default messages are replaced with Bricohams/RADIO BETA, and the footer identifies
the Beta edition. The logo is not claimed to appear in every startup mode.

`scripts/generate-bootlogo.ps1` generates `firmware/bricohams/bootlogo.h`
from the original PNG using System.Drawing on Windows. The builder consumes the
already generated header without requiring PowerShell or that library to build.
Aspect ratio is retained against a white background; luminance threshold 190
converts dark and orange strokes to active pixels on the monochrome LCD.
The PNG's SHA-256 is recorded in the header. This is a hardware-specific
adaptation, not a replacement for the web/Android color asset.

Beta images with boot logo built on 2026-10-25:

| Module | Directory under Documents/Multiboot/Bricohams | RAW bytes | RAM | Flash |
| --- | --- | ---: | ---: | ---: |
| ARDF | `ARDF-Bootlogo-final-20261025/artifacts` | 113452 | 12448/16384 | 112564/120832 |
| Satellites | `Satellite-Bootlogo-final-20261025/artifacts` | 113096 | 12352/16384 | 112208/120832 |
| Spectrum/VFO-PRO/CSS | `Spectrum-Bootlogo-final-20261025/artifacts` | 116808 | 13248/16384 | 115920/120832 |

Earlier measurements in other folders are from previous builds, without this
bitmap. The logo still needs physical verification on the LCD; compiling and
rendering the bitmap on a computer does not validate contrast, orientation, or
legibility on the radio. They have not been flashed.

## Later Requested Phase: Bricohams Android

The native `0.8.2-beta` APK includes a logbook with search and ADIF import,
ADIF/JSON, JSON restore, ARDF sessions with history/statistics and filtered
segment totals, one-off GPS, experimental text/WAV Morse,
and temporary CAT RX over USB CDC ACM and recognized CH34x/CP210x/FTDI/Prolific
adapters. The [Android guide](ANDROID.md) distinguishes available features from
following objectives. It includes Robot36 SSTV from WAV with PNG export,
and offline SGP4 with imported TLE catalogs, passes, and RX Doppler tracking.
It includes foreground microphone capture up to 60 s for later Morse/Robot36
decoding. It does not include continuous decoding, channel writing, or LoTW
upload. Full equivalence with Karina and physical firmware/phone validation
remain pending.

### Target Functions

- Control Quansheng from Android: read state, adjust frequency, tones, and
  per-channel power, and access other options actually exposed by the
  hardware/firmware. Distinguish temporary VFO settings from persistent writes;
  do not rewrite the entire codeplug to change one field if the protocol allows
  a narrower operation.
- Satellite tracking with Look4sat-like functionality: satellite selection,
  TLE, pass prediction, observer location, and CAT frequency Doppler correction
  during the selected pass.
- SSTV reception/decoding, including Robot36; SSTV transmission as a goal to
  validate with available audio and PTT paths.
- Morse interpretation from audio, with uncertainty indicated.
- A logbook functionally inspired by HAMRS: contacts, query, edit, ADIF export,
  and a goal of signing/uploading to LoTW.
- Fox hunting: sessions, beacons, times, observations, GPS track, positions, and
  search statistics, with export and offline field use for functions that do not
  require services.
- Bricohams branding in app, firmware, boot logos, documentation, and artifacts.
  Final migration of web and app to corporate orange after features are complete
  and tested, as requested.

### Provisional Assumptions and Limits

Without answers to the clarifying questions, USB OTG with a programming cable is
the planned initial transport. Bluetooth would require a verified adapter and
protocol; Bluetooth is not assumed to be built into the radio. A programming
serial cable does not imply audio transport: SSTV and Morse need a separately
verified audio input/output path. It is not assumed that Android can maintain
USB and that audio path on every phone without testing.

CAT is not considered available just because channel read/write exists. First
verify the firmware's actual capabilities and, if needed, design a versioned
custom protocol with capability query, model-specific validation, acknowledgments,
errors, and disconnect recovery. TX, band limits, and backup protections remain
in force. Tracking must not enable TX automatically or continue issuing changes
after losing the connection or stopping the pass.

Direct LoTW upload remains a goal, not a completed integration. The accepted
signing mechanism and secure management of the callsign certificate on Android
must be verified. The initial alternative is ADIF for signing with TQSL on a
computer; exporting ADIF is not equivalent to uploading it to LoTW. Do not include
certificates, keys, or passwords in the repository, diagnostic logs, or exported
projects.

The requested term "encriptions" needs clarification: it is not automatically
interpreted as encryption of amateur radio communications. Encryption support
or its legality is not claimed.

GPS provides the phone's location, not the beacon's. An estimated transmitter
location requires sufficient observations/bearings and must show uncertainty;
RSSI alone cannot establish an exact location. Tracks and positions are private
by default, require explicit permissions, and are not published automatically.

The cited apps are functional references, not available source code or permission
to copy code, assets, or trademarks. Prefer sources with compatible licenses and
preserve attribution; where unavailable, implement independently from
documentation and permitted observable behavior, without bypassing protections.
Do not claim parity without testing.

### Criteria Before Declaring the Phase Complete

1. Close the function matrix for each image and validate boot, recovery, RX,
   register restoration, and supported operations on identified hardware with
   a complete backup.
2. Approve the Android architecture and phone/cable/radio/firmware matrix;
   check CAT control, disconnections, and read-back after channel changes.
3. Compare passes/Doppler against known references, test SSTV/Morse with known
   samples and then real audio, and validate ADIF records and LoTW signing/upload
   separately.
4. Test GPS, denied permissions, no network, field sessions, and statistics
   without inventing beacon positions.
5. Apply and verify Bricohams branding and boot logos within display limits,
   retaining required licenses and notices. Apply the orange palette at the end
   with accessible contrast, without confusing danger, success, and warning
   states. Deliver the APK and artifacts identified by version/hash only when
   their validation status is explicit.