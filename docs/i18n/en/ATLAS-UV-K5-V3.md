# Technical atlas of the Quansheng UV-K5 V3 and UV-K1

Revision: 26-10-2026. Hardware, communications, flashing, and development
knowledge base for the UV-K5 V3 and its twin, the UV-K1. Pins, memories, and
protocols come from the open-source code currently running on these radios
([F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom), Apache-2.0) and
the [armel teardown](https://github.com/armel/k1-teardown), not assumptions.
For step-by-step radio setup, use the [getting started from 0 to 100%](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100).

| Block | Component |
| --- | --- |
| MCU | Puya PY32F071 (PY32F071C1BT6), Cortex-M0+ at 72 MHz, 128 KB flash, 16 KB SRAM |
| Transceiver | Beken BK4829 |
| FM radio | Beken BK1080 |
| Data memory | PUYA PY25Q16HB SPI Flash, 2 MB |
| Display | ST7565, 128x64 monochrome |
| Audio | LM4898/LN4898 amplifier |
| USB-C | Charging and programming (virtual CDC serial port) |

## Versions and how to identify them

Firmware for one version does not work on another: the microcontroller is
different, and the image will not start or will leave the radio without a display.

| Version | MCU | Data memory | USB-C | Reference open firmware |
| --- | --- | --- | --- | --- |
| V1 (UV-K5, K5(8), K6, 5R Plus) | DP32G030, 48 MHz, 64 KB | 8 KB I2C EEPROM (expandable) | Charging only | [armel/uv-k5-firmware-custom](https://github.com/armel/uv-k5-firmware-custom) |
| V2 | PY32F030 / PY32G030 | I2C EEPROM | Charging only | [muzkr/uv-k5-firmware-custom](https://github.com/muzkr/uv-k5-firmware-custom) |
| **V3 and UV-K1** | **PY32F071**, 72 MHz, 128 KB | **2 MB PY25Q16 SPI Flash** | **Charging and programming** | [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) |

- **Sticker under the battery:** “V2” or “V3.” If unmarked, it is usually V1,
  but the ARDF manual warns of V3 labels on V2 hardware: this is not conclusive.
- **USB-C appears as a serial port** when connected to a PC: V3/K1.
- **Bootloader version** (power on while holding PTT): UV-K5 V3 reports
  `7.00.07`; UV-K1 `7.02.02` or `7.03.0x`. UV-K5(8) V3 radios with `7.0.11`
  are reported in groups: if you see another number, check before flashing.
- K1 and K5 V3 share a board (silkscreen `K1-V5.0`) and firmware. In factory
  Flash, only the second line of the startup message differs (`0x007030`).
- A V3 `.bin` begins with its vector table: word 0 = stack in SRAM
  (`0x2000xxxx`), word 1 = reset at `0x0800xxxx` with bit 0 set to 1. A V1
  binary has reset near `0x000000xx`.

## Architecture

The PY32F071 controls everything: it programs BK4829 registers on each change
of frequency, mode, filter, or power; reads the S-meter; and manages audio,
display, keypad, and memory.

![UV-K5 V3 block diagram: MCU, transceiver, memory, display, keypad, audio, USB, and battery](../../atlas/bloques-v3.svg)

## PY32F071 pinout

Assignment used by F4HWN for V3/K1 (`App/board.c`, `App/driver/*.c`). The
physical pin number is in the [PY32F071 datasheet](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf).

| Pin | Function | Configuration | Driver |
| --- | --- | --- | --- |
| PA0 | Flash SPI2 SCK | AF8 SPI2 | `py25q16.c` |
| PA1, PA2 | Flash SPI2 MISO/MOSI | AF9 SPI2, prescaler /2, DMA1 | `py25q16.c` |
| PA3 | Flash SPI CS | Output | `py25q16.c` |
| PA4 | Voice DAC / RX audio capture | Analog, TIM6 + DMA | `voice.c` |
| PA5 | LCD SPI1 SCK | AF0 SPI1, prescaler /64 | `st7565.c` |
| PA6 | LCD A0 (data/command) | Output | `st7565.c` |
| PA7 | LCD SPI1 MOSI | AF0 SPI1 | `st7565.c` |
| PA8 | Audio amplifier enable | Output | `gpio.h` |
| PA9, PA10 | USART1 TX/RX (Kenwood jack) | AF1, 38400 baud | `uart.c` |
| PA11, PA12 | USB FS D-/D+ (CDC) | USB | `vcp.c` |
| PA13, PA14 | SWDIO / SWCLK | SWD when compiled with `ENABLE_SWD` | `board.c` |
| PB0 | Battery voltage | ADC1 channel 8, 12 bits | `board.c` |
| PB1 | Reserved analog | Analog mode | `board.c` |
| PB2 | LCD CS | Output | `st7565.c` |
| PB3-PB6 | Keypad columns | Outputs | `keyboard.c` |
| PB8 | BK4829 SCK | Output, bit-bang | `bk4829.c` |
| PB9 | Bidirectional BK4829 SDIO | Output/input, bit-bang | `bk4829.c` |
| PB10 | PTT | Pull-up input, active low | `gpio.h` |
| PB12-PB15 | Keypad rows | Pull-up inputs | `keyboard.c` |
| PC13 | Flashlight | Output | `board.c` |
| PF5, PF6 | BK1080 SCL/SDA | I2C bit-bang | `i2c.c` |
| PF8 | LCD backlight | PWM via TIM7 + DMA | `backlight.c` |
| PF9 | BK4829 CS | Output | `bk4829.c` |

### Keypad matrix

The firmware drives one column low and reads the four rows. “Column 0” means
no active column and reads the side keys. PTT is separate on PB10.

| Row | Col 0 | PB6 | PB5 | PB4 | PB3 |
| --- | --- | --- | --- | --- | --- |
| PB15 | SIDE1 | MENU | UP | DOWN | EXIT |
| PB14 | SIDE2 | 1 | 2 | 3 | * |
| PB13 | - | 4 | 5 | 6 | 0 |
| PB12 | - | 7 | 8 | 9 | F |

## Buses and peripherals

| Peripheral | Bus | Notes |
| --- | --- | --- |
| BK4829 | 3-wire bit-bang: CS PF9, SCK PB8, SDIO PB9 | 8-bit register + 16-bit value. Driver uses the same API as V1 BK4819 (`bk4819.h`) |
| PY25Q16 Flash | SPI2 + DMA1, CS PA3 | 4 KB sectors; exposed as “EEPROM” through a translation table |
| ST7565 LCD | SPI1, A0 PA6, CS PB2 | 8 pages of 128 columns, least significant bit at top |
| BK1080 | I2C bit-bang PF5/PF6 | Only with `ENABLE_FMRADIO` |
| Kenwood jack | USART1 PA9/PA10 | 38400 8N1 |
| USB-C | USB FS PA11/PA12, CDC | Same protocol as the jack |
| Voice and audio | DAC PA4, enable PA8 | Labs apps use PA4 as ADC for APRS/AFSK |

## Internal memory

![Internal Flash map: 10 KB bootloader, application from 0x08002800 through 118 KB](../../atlas/flash-interna-v3.svg)

- Bootloader `0x08000000-0x080027FF` (10 KB), never overwritten by DFU.
- Application from `0x08002800`, maximum `0x1D800` bytes (`Core/py32f071xb.ld`).
- 256-byte erase pages; 16 KB SRAM.

## 2 MB external Flash

![External Flash map with factory firmware and F4HWN multiboot](../../atlas/flash-externa-v3.svg)

| Range | Contents (F4HWN multiboot) |
| --- | --- |
| `0x000000-0x00BFFF` | Configuration bank 0: channels, names, VFO, settings |
| `0x010000-0x010FFF` | **Calibration** (512 useful bytes), unique to each radio |
| `0x011000-0x011FFF` | Startup logo: 8-byte header + 1024-byte bitmap (factory signature `0x9ABC5A5A`) |
| `0x018000-0x01FFFF` | RX/TX log, 8 sectors |
| `0x020000 + n*0x20000` | Slots 0-4, 128 KB: 64-byte `FMB1` header (size, CRC-32, name, version) and image at +0x1000. Slot 0 = protected copy of main |
| `0x0C0000-0x0FFFFF` | Configuration banks 1-4 (64 KB) |
| `0x100000` / `0x101000` | Redundant `FMP3` multiboot state |
| `0x102000-` | Overlaid `FAP1` apps, 8 KB slots |
| `0x1DE000-0x1FFFFF` | Interoperability reserve for Sonic |

Factory firmware stores voice at `0x100000-0x196FFF`, the same area used by
F4HWN. To return to factory firmware, use the guided restoration in
[UV Studio](https://armel.github.io/uvstudio/), which rebuilds that area
without touching calibration.

## Logical EEPROM map

`eeprom_compat.c` translates 16-bit EEPROM addresses to SPI Flash to reuse
V1 code and CHIRP drivers. Addresses outside the table read as `0xFF`.

| Logical address | Physical Flash | Contents |
| --- | --- | --- |
| `0x0000-0x3FFF` | `0x000000` | Frequencies for 1024 memories x 16 bytes |
| `0x4000-0x7FFF` | `0x004000` | Names for 1024 memories x 16 bytes |
| `0x8000-0x886D` | `0x008000` | Attributes and list names |
| `0x9000-0x90E8` | `0x009000` | 14 VFOs and Fox Hunt/Beacon |
| `0xA000-0xA177` | `0x00A000` | Settings, FM, lists, AES, spectrum, F4HWN, version |
| `0xB000-0xB1FF` | `0x010000` | Calibration |
| `0xC000-0xCFFF` | `0x011000` | Startup logo |

This is the F4HWN map. Factory firmware, Karina, IJV, and Matoz use another:
a CHIRP driver only works with the firmware it was written for.
## Calibration

- Each radio has its own calibration at `0x010000`. It is not interchangeable:
  “Karina calibrations” or those from another unit were calculated for a different radio.
- Back up before flashing with UV Studio (“dump calib”) or this website's read
  function; [K5Tool-bin](https://github.com/Gulihg/K5Tool-bin) extracts values
  from a dump. Examples of 512-byte dumps are in
  [k1-teardown/openocd](https://github.com/armel/k1-teardown/tree/main/openocd).
- F4HWN commands reject writes to this sector.

## Serial programming protocol

The same over the Kenwood jack or USB-C: 38400 baud 8N1, inherited from V1.

![Frame: AB CD, length, type, size, data, CRC16, and DC BA; block obfuscated with XOR](../../atlas/trama-serie.svg)

XOR obfuscation key (index i mod 16): `16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80`.
CRC-16 XMODEM: polynomial `0x1021`, initial value 0, over type, size, and
data before obfuscation. In replies, the radio pads the CRC with `clave[n] ^ 0xFF`. A robust reader
requires consistent header, footer, and length and only logs CRC mismatches.

| Request | Response | Use | Data |
| --- | --- | --- | --- |
| `0x0514` | `0x0515` | Greeting and identification | u32 timestamp |
| `0x051B` | `0x051C` | Read EEPROM | u16 offset, u8 size, u8 pad, u32 timestamp |
| `0x051D` | `0x051E` | Write EEPROM | u16 offset, u8 size, bool allowPassword, u32 timestamp, data |
| `0x0527` | `0x0528` | RSSI | - |
| `0x0529` | - | Battery voltage and current | - |
| `0x052F` | - | Greeting variant | u32 timestamp |
| `0x05DD` | - | Reboot | - |
| `0x0601` / `0x0602` | - | BK4829 registers (only `ENABLE_UART_RW_BK_REGS`) | register, value |

F4HWN Fusion extensions: `0x0720-0x0729` slots and banks, `0x0730-0x0737`
overlaid apps, `0x0738` physical Flash read, `0x073A`/`0x073C` sector erase
and programming (reject calibration), `0x073E` CRC-32 of a range. Slot 0
cannot be erased or overwritten. K5Viewer injects keys with
`AA 55 03|04 <tecla>`; PTT is locked.

## Bootloader and flashing

With the radio off, hold PTT and power on: LED on, display off. The factory
bootloader listens over USB-C and the jack using the same frames.

![DFU sequence: notice 0x0518, greeting 0x0530, pages 0x0519, and acknowledgments 0x051A](../../atlas/secuencia-dfu.svg)

Bricohams Studio and UV Studio accept only bootloader `7.00.07` for UV-K5 V3
and `7.02.02`/`7.03.0x` for UV-K1, and validate `.bin` vectors before opening
the port. A V1 image can be “flashed” but will not boot.

| Tool | Use |
| --- | --- |
| [UV Studio](https://armel.github.io/uvstudio/) | Flashing, multiboot, calibration dump, factory restoration |
| [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/) | Channels, settings, slots, and main firmware |
| [Multi-UVTools](https://spm81.github.io/Multi-UVTools/) | Multi-model web flasher |
| [Moto](https://github.com/muzkr/moto) | Alternative UF2 bootloader: USB “MOTO” drive and drag `.uf2`. Risky, no serial commands |

`*.packed.bin` files are for the official updater; flat `.bin` files are for
the open tools.

## SWD and recovery

If the bootloader is damaged, SWD (PA13 SWDIO, PA14 SWCLK) with an ST-Link is
the only option. The PY32 is treated as an STM32F0 with a different TAP ID:

```text
openocd -f interface/stlink.cfg -c "set CPUTAPID 0x0bc11477" -f target/stm32f0x.cfg -c "adapter speed 1000" -c "init; reset halt; dump_image K1_PY32F071.bin 0x08000000 0x00020000; shutdown"
```

Do not flash a complete external Flash image with a programmer: you would
erase calibration. The “Factory_Reconstructed” images from k1-teardown are
for guided restoration with UV Studio.

## Build firmware

Recommended base: [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom),
which already handles PY32 startup, Puya HAL, SPI Flash, BK4829, USB, and protocol.

```text
git clone --depth 1 https://github.com/armel/uv-k1-k5v3-firmware-custom
cd uv-k1-k5v3-firmware-custom
./compile-firmware.sh Fusion
./compile-firmware.sh Fusion -DENABLE_VOX=OFF
./compile-firmware.sh All
```

The container uses ARM GNU Toolchain 13.3.rel1, CMake, and Ninja. Presets:
Custom, Fusion, FieldOps, Transfer, Labs, and Max. Output in `build/<Preset>`.

| Path | Contents |
| --- | --- |
| `App/driver/` | `bk4829.c`, `py25q16.c`, `st7565.c`, `keyboard.c`, `uart.c`, `vcp.c`, `eeprom_compat.c`, `mb_flash.c` |
| `App/app/` | `spectrum.c`, `scanner.c`, `menu.c`, `uart.c`, `fm.c`, `aircopy.c`, `foxhunt.c` |
| `Core/py32f071xb.ld` | Linked at `0x08002800`, 118 KB |
| `CMakePresets.json` | `ENABLE_*` flags by edition |

The reproducible Bricohams build is in [Bricohams V3](BRICOHAMS-FIRMWARE.md),
and each option in [F4HWN options](AYUDA-OPCIONES-F4HWN.md). Before flashing
your own build, check the vectors and that it does not exceed `0x1D800` bytes.

## Hardware modifications

The [comprehensive validation matrix](VALIDACION-INTEGRAL-V3-ANDROID.md)
extends compatibility, testing, limits, and pending evidence criteria.
There is no general certification of V1 modifications on V3. The
[Android/CAT/memory diagram](../../atlas/android-cat-validacion.svg) is functional,
not a measured electrical schematic or soldering guide.

| Modification | V3/K1 | Notes |
| --- | --- | --- |
| Expand EEPROM (M24M02, 24C512) | Not directly applicable | V3 uses 2 MB SPI Flash, not interchangeable I2C EEPROM. V1 reference: [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki) |
| SI4732 HF receiver (v5/v6.8 boards) | Not verified on V3 | References cataloged here are V1 (CEC HF, Reborn, losehu, Robzyl 512K); they do not demonstrate PY32 support |
| SMA antenna (17 cm, 38 cm) | Conditional accessory | Check connector, mechanical stress, band, and SWR; length or improved RX does not certify TX |
| Satellite mod (coils, LNA) | Unconfirmed | No schematic or measurements for an adaptation to this V3 revision |
| TX low-pass filter | Review required | [Nannk/quansheng-lpf-mod](https://codeberg.org/Nannk/quansheng-lpf-mod); verify the measured board |
| 27 MHz mod | V1 reference, not validated on V3 | [Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Hardware_Mods_27Mhz); requires its own RF network and measurements; do not extrapolate values |
| Programming cable | Direct USB-C | Kenwood USB-serial cable (USART1) also works |
| Coprocessor or ESP32 | Designed for V1 | [ESPRI](https://github.com/kamilsss655/ESPRI), [UVK5-Coprocessor](https://github.com/wabulutian/UVK5-Coprocessor), [UVE5](https://github.com/losehu/UVE5) |

Firmware that raises output above 5 W can burn out the final stage.
Transmitting outside your licensed bands is illegal even if the firmware allows it.

## Schematics and images

No complete, verified V3/K1 electrical schematic was identified in the sources
for this review. This does not prove that none exists elsewhere. Available
references:

- [armel K1 teardown](https://github.com/armel/k1-teardown) (Apache-2.0): high-resolution photos, dumps, annotated firmware, and datasheets.
- [UV-K1 board photos](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/UV%E2%80%90K1-PCB) in the wiki.
- [V1 reverse-engineered KiCad schematic](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/tree/main/hardware/KiCad/UVK5_reversing_06-02-2024): CPU, RX, TX, audio, charger, and BK1080. Sheets [RX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_RX), [TX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_TX), and [interactive BOM](https://htmlpreview.github.io/?https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/ibom.html). No license declared: link only.
- Datasheets: [BK4829](https://github.com/armel/k1-teardown/blob/main/datasheet/BK4829-BEKEN.pdf), [PY32F071](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf), [PY25Q16HB](https://github.com/armel/k1-teardown/blob/main/datasheet/PY25Q16HB_Datasheet_V1.2.pdf), [BK1080](https://github.com/armel/k1-teardown/blob/main/datasheet/BK1080-BEKEN.pdf), [BK4819 registers](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/BK4819V3Registers_List_20201218.pdf).

UV-K1 teardown photos (same board as the K5 V3). Author: F4HWN (armel),
[armel/k1-teardown](https://github.com/armel/k1-teardown), Apache-2.0 license;
reduced to 1600 px.

![Complete teardown: battery, antenna, knob, case with speaker, board, and aluminum chassis](../../atlas/k1-view-a.jpg)

![Board, display side: LCD, LED, SMA, potentiometer, and keypad connector; K1-V5.0 ZG13 silkscreen](../../atlas/k1-view-b-recto.jpg)

![Board, RF and MCU side: filter coils, Kenwood jacks, USB-C, and QFP48 MCU](../../atlas/k1-view-b-verso.jpg)

![Close-up of the 2 MB PUYA PY25Q16HB SPI Flash](../../atlas/k1-view-c-recto.jpg)

![Close-up of the PUYA PY32F071 LQFP48 MCU beside USB-C and the 4R7 inductor](../../atlas/k1-view-c-verso.jpg)

![Disassembled front: bezel, rubber keypad, and 4x4 matrix contact board](../../atlas/k1-view-d-front.jpg)

![Assembly order: front bezel, inner chassis, and main board](../../atlas/k1-view-e-front-back.jpg)
## Firmware and repositories for V3/K1

Verified with the GitHub API on 26-10-2026; “V3/K1” means the tree contains
PY32 code.

| Repository | License | Last push | What it is |
| --- | --- | --- | --- |
| [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-25 | F4HWN Fusion PY32, reference base |
| [Robby69400/Sonic](https://github.com/Robby69400/Sonic) | Apache-2.0 | 2026-10-25 | Robzyl successor, F4HWN fork with multiboot |
| [Gogu-Qs/GOGUFW-UV-K1-Messenger](https://github.com/Gogu-Qs/GOGUFW-UV-K1-Messenger) | Apache-2.0 | 2026-10-24 | Messaging, ACK, range |
| [N7SIX/UV-K1Series_ApeX-Edition_v7.6.0](https://github.com/N7SIX/UV-K1Series_ApeX-Edition_v7.6.0) | Apache-2.0 | 2026-10-11 | ApeX edition |
| [reald/uv-k1-k5v3-firmware-custom](https://github.com/reald/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-19 | ARDF; see [ARDF guide](AYUDA-ARDF.md) |
| [fagci/k1-fw](https://github.com/fagci/k1-fw) | No license | 2026-07-19 | fagci firmware for K1/K5 V3 |
| [muzkr/moto](https://github.com/muzkr/moto) | Apache-2.0 | 2025-12-31 | UF2 bootloader |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) | Apache-2.0 | 2026-09-28 | Photos, dumps, and datasheets |
| [EthanYan6/uv-k1-k5v3-firmware-custom-3ch](https://github.com/EthanYan6/uv-k1-k5v3-firmware-custom-3ch) | Apache-2.0 | 2026-08-10 | 3-channel listening |
| [qbs524/uv-k1-k5v3-firmware-custom-main-chn](https://github.com/qbs524/uv-k1-k5v3-firmware-custom-main-chn) | Apache-2.0 | 2025-12-24 | F4HWN in Chinese |
| [qrp73/K5TOOL](https://github.com/qrp73/K5TOOL) | GPL-3.0 | 2025-12-18 | EEPROM and command-line flashing |
| [knoinok/quansheng_toolkit](https://github.com/knoinok/quansheng_toolkit) | - | 2026-05-08 | K1/K5 V3 desktop toolkit |
| [Dim0s/quansheng-UV-K5v3-K1-firmware-pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) | - | 2026-10-25 | Collection of V3/K1 binaries; see [Dim0s pack](AYUDA-PACK-DIM0S.md) |

Dead links and where they live now:

- `Robby69400/Robzyl*`: deleted; copies at [K5Quan/Robzyl_K1_](https://github.com/K5Quan/Robzyl_K1_), [K5Quan/Robzyl_512K](https://github.com/K5Quan/Robzyl_512K), and [simoncottingham/Robzyl_K5](https://github.com/simoncottingham/Robzyl_K5); the author continues with Sonic.
- `joaquimorg/uv-k5` and `new_ui`: renamed to [UV-KX](https://github.com/joaquimorg/UV-KX), [UV-KX-firmware](https://github.com/joaquimorg/UV-KX-firmware), and [uv-kx-tools](https://github.com/joaquimorg/uv-kx-tools) (V1).
- `armel/uvtools2`: now [Robby69400/uvtools2](https://github.com/Robby69400/uvtools2); the website remains at <https://armel.github.io/uvtools2/>.
- `bg6ud/uv-k1-k5v3-firmware-custom`: deleted; see F4HWN V3 forks.

No Quansheng material was found on GitFlic, GitVerse, GitLab, or Gitee; the
Russian community publishes binaries on 4PDA and Telegram.

## Karina and closed-source code

Karina is closed-source (see [Karina](KARINA.md)). According to Russian
groups, it continues [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, which permits closed derivatives). To reproduce its features
cleanly: describe them from the manual and changelog, start from F4HWN V3 and
the spectrum code in fagci-mod and [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1). `fagci/s0v4`, `hawk5`, and `k1-fw` have no license: they may
be read, not copied. Do not decompile Karina's binary to reconstruct its source.

## Sources

- Code: [F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom) (`App/board.c`, `App/driver/*`, `App/app/uart.c`, `mb_flash.h`, `eeprom_compat.c`), [moto](https://github.com/muzkr/moto), Bricohams Studio (`bkFlashMain`).
- Hardware: [k1-teardown](https://github.com/armel/k1-teardown), [Quansheng UV-K5 Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki).
- Community: targeted searches in Spanish- and Russian-language Telegram groups, without authors or personal data; [Dim0s pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack).
- V1 references: [amnemonic](https://github.com/amnemonic/Quansheng_UV-K5_Firmware), [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki), [egzumer wiki](https://github.com/egzumer/uv-k5-firmware-custom/wiki).