# Egzumer: source, configuration, and differences from V3

Revision: 25-10-2026. Inspected source:
`egzumer/uv-k5-firmware-custom`, commit
`7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3`.

## What this repository provides

It publishes C code, headers, a Makefile, and documentation for a reimplementation
of the original-family Quansheng UV-K5/K6/5R firmware. The README explains the
origins of DualTachyon, OneOfEleven modifications, and the fagci analyzer.
This codebase is not the PY32 port for UV-K5 V3/UV-K1.

Its LICENSE contains **Apache License 2.0**, not MIT. Preserve its notices,
attributions, and those of components when deriving code. Egzumer's license
does not show that another image called Karina uses the same license or that
the exact sources for that binary are available.

## Hardware and use in this website

| Aspect | Original Egzumer | F4HWN PY32 on this website |
| --- | --- | --- |
| Family | Original UV-K5 V1 / DP32 platform | UV-K5 V3 / UV-K1 PY32 |
| Build system | Makefile and 0/1 flags | CMake and preset options |
| Analyzer | fagci base with Egzumer changes | Port and modifications by version |
| Memory/data | Its firmware map | Equivalence is not assumed |
| Armel v6 multiboot | Not documented as a feature of this codebase | Specific extension of the PY32 project |
| Web slot preparation | Not supported | Only recognized and checked images |

Do not use a V1 flasher or original Egzumer image on a V3. K5/K6 in a title
does not prove the MCU revision. Check the board and project. The Bricohams V3
command does not include an Egzumer compiler.

## Features and user settings

The README documents AM correction, SSB demodulation, spectrum, fast scanning,
name editing, display modes, assignable keys, battery, backlight, microphone,
and CTCSS/DCS search. SSB here describes receive demodulation; it does not mean
an SSB transmitter.

For RX/TX, step, bandwidth, SQL, tones, VOX, TOT, and channel lock concepts,
see [common configuration](AYUDA-CONFIGURACION.md). Use the menu name, not
numbers carried over from F4HWN v6 or Karina. The order and names were changed
from stock firmware.

The official wiki is the reference for key sequences in the installed build:

- [Wiki and manual](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
- [Releases](https://github.com/egzumer/uv-k5-firmware-custom/releases).

Not all its shortcuts have been verified on hardware, and they are not
automatically carried over to derivative firmware. The README warns of dynamic
range limits, overload, and input filters; AM fix cannot eliminate physical
limits. An antenna with more signal can worsen reception in a strong RF
environment.

## Build options in the inspected commit

Makefile `?=` values are defaults that a make argument can override. 0/1 are
not CMake or radio-menu ON/OFF values. Explanations of shared features are in
[F4HWN reference and historical options](AYUDA-OPCIONES-F4HWN.md); sharing a
name does not guarantee identical implementation or storage.

| Option | Default | Purpose |
| --- | --- | --- |
| ENABLE_UART | 1 | Configuration communication with a PC |
| ENABLE_AIRCOPY | 0 | Compatible AirCopy transfer |
| ENABLE_FMRADIO | 1 | FM broadcast receiver |
| ENABLE_NOAA | 0 | NOAA weather functions |
| ENABLE_VOICE | 0 | Voice announcements |
| ENABLE_VOX | 1 | Audio-triggered TX; configure/disable to avoid accidents |
| ENABLE_ALARM | 0 | Alarm function with possible transmissions; do not use as a test |
| ENABLE_TX1750 | 0 | Repeater access tone |
| ENABLE_PWRON_PASSWORD | 0 | Power-on password; does not encrypt all memory |
| ENABLE_DTMF_CALLING | 1 | DTMF call logic |
| ENABLE_FLASHLIGHT | 1 | Hardware LED/flashlight |
| ENABLE_BIG_FREQ | 1 | Large frequency font |
| ENABLE_SMALL_BOLD | 1 | Small bold text |
| ENABLE_CUSTOM_MENU_LAYOUT | 1 | Alternative menu layout |
| ENABLE_KEEP_MEM_NAME | 1 | Retain name when editing a memory |
| ENABLE_WIDE_RX | 1 | Receive extended ranges; not TX authorization |
| ENABLE_TX_WHEN_AM | 0 | Allow TX path while in AM RX mode; does not demonstrate AM modulation |
| ENABLE_F_CAL_MENU | 0 | Frequency calibration with instruments |
| ENABLE_CTCSS_TAIL_PHASE_SHIFT | 0 | CTCSS tail phase handling |
| ENABLE_BOOT_BEEPS | 0 | Startup sounds |
| ENABLE_SHOW_CHARGE_LEVEL | 0 | Display charge level |
| ENABLE_REVERSE_BAT_SYMBOL | 0 | Battery display variant |
| ENABLE_NO_CODE_SCAN_TIMEOUT | 1 | Code-search timeout behavior |
| ENABLE_AM_FIX | 1 | AM reception/gain correction |
| ENABLE_SQUELCH_MORE_SENSITIVE | 1 | More sensitive squelch criterion |
| ENABLE_FASTER_CHANNEL_SCAN | 1 | Faster scan speed |
| ENABLE_RSSI_BAR | 1 | Signal strength indicator |
| ENABLE_AUDIO_BAR | 1 | Audio indicator |
| ENABLE_COPY_CHAN_TO_VFO | 1 | Copy memory to VFO |
| ENABLE_SPECTRUM | 1 | Spectrum analyzer |
| ENABLE_REDUCE_LOW_MID_TX_POWER | 0 | Variant of low/medium power targets |
| ENABLE_BYP_RAW_DEMODULATORS | 0 | Advanced RAW demodulation paths |
| ENABLE_BLMIN_TMP_OFF | 0 | Minimum backlight temporary handling |
| ENABLE_SCAN_RANGES | 1 | Scan ranges |
| ENABLE_AM_FIX_SHOW_DATA | 0 | AM fix diagnostic data |
| ENABLE_AGC_SHOW_DATA | 0 | AGC diagnostic data |
| ENABLE_UART_RW_BK_REGS | 0 | RF register access; do not enable routinely |
| ENABLE_CLANG | 0 | Compile with Clang in the project configuration |
| ENABLE_SWD | 0 | SWD debugging support |
| ENABLE_OVERLAY | 0 | Memory overlay for this codebase, not firmware slots |
| ENABLE_LTO | 1 | Link-time optimization |

In that Makefile, Clang forces LTO=0; with LTO=1, OVERLAY=0 is forced. These
rules belong to this codebase and must not be copied to PY32 CMake without
analysis. Enabling options can exceed memory or break combinations; the
existence of an option does not imply support for every combination.

To build, use the toolchain and procedure in its README in a pinned checkout;
preserve the map, license, and hashes, and validate on V1 hardware. Egzumer was
not built, flashed, or tested during this documentation addition.

## Relationship to Karina and Bricohams

A genealogy of similar features cannot reconstruct Karina's exact sources.
Drivers and names mentioned by Egzumer are not proof either. Bricohams V3
currently derives from F4HWN PY32, not this original repository. A Bricohams
V1 project would be a different build and require separate hardware validation.

## Pinned sources

- [README at the commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/README.md).
- [Makefile at the commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/Makefile).
- [Apache-2.0 license](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/LICENSE).
- [V3 pack and new Karina evidence](AYUDA-PACK-DIM0S.md).