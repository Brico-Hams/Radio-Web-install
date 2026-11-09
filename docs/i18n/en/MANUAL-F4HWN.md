# F4HWN (FH4) manual: Bricohams menu guide

Reference manual for the F4HWN (FH4) firmware on the Quansheng UV-K5 and UV-K6:
locking, backlight and the radio's 68 menus. Bricohams edition of 8-11-2026.
[Complete manual in PDF](../../manuals/Manual_F4HWN_FH4_Bricohams_v2.pdf)
(13 pages; it includes the 3-page printable quick reference annex, pages
11-13). The PDF is in Spanish.

## First: enable ALL

Press MENU and select `ALL` before using this guide. Without ALL, not all menus
will appear.

1. Press the radio's MENU key.
2. On the selection screen, find the ALL option.
3. Confirm ALL, then enter the general menu to see every option.

If you do not select ALL, only some of the available menus will appear, the
visible numbering may look incomplete compared with this guide, and the total
number of options may vary with the firmware version and build. After selecting
ALL, use the guide by menu name and not only by number.

## Scope and numbering

F4HWN (FH4) is a custom firmware developed by Armel, F4HWN, for the Quansheng
UV-K5 family and compatible variants, including the UV-K6. It adds improvements
to the interface, reception, configurable keys, scanning and power management.
Which features are available depends on both the radio and the build options.

The 68 entries follow the manual's editorial order, not the universal numbering
of every F4HWN version. The real list can change between builds. Always locate
settings by their short name (mnemonic) if the number does not match, and check
`SysInf` to know which build you have installed. Some of the options listed are
conditional or may show different labels.

Bricohams note: the images in this web installer are F4HWN v6.1.0 for
UV-K5 V3 / UV-K1 (Bricohams editions in slots). Menus are found by mnemonic and
the options depend on the build.

Numbering discrepancy flagged by the manual itself: section 2.3 of the PDF
numbers BLTime, BLMin and BLMax as 38, 39 and 40, while the table numbers them
36, 37 and 38. This guide follows the table.

## Critical menus step by step

### KeyLck (30): automatic lock

1. Press MENU on the main screen.
2. Find `KeyLck` with the navigation keys.
3. Press MENU to edit and select OFF or a time between 00:15 and 10:00, in
   15-second steps.
4. Confirm with MENU and leave with EXIT.
5. Wait the configured time without pressing keys and check the lock. To
   unlock, use the combination provided by your edition; on many variants it
   is a long press of F/#.

Tip: 00:30-01:00 for carrying; OFF for continuous handling. The scope of this
lock depends on `SetLck`.

### SetLck (63): lock scope

1. Open MENU and find `SetLck`.
2. Press MENU to change the setting.
3. Select KEYS to lock only the keys, leaving PTT operational, or KEYS+PTT to
   lock the transmit button as well.
4. Confirm, exit and test the behavior safely, without transmitting outside
   authorized frequencies.

Tip: KEYS+PTT prevents accidental transmissions while carrying; KEYS lets you
use PTT without unlocking.

### BLTime, BLMin, BLMax and BLTxRx: steady light

1. Find `BLTime` (36 in the table) and select ON to keep the backlight on
   permanently. Other options: OFF or 5 seconds to 5 minutes, in 5 s steps.
2. Enter `BLMin` (37): set the minimum or idle brightness, normally 0-9; start
   with 0-2 to save power.
3. Enter `BLMax` (38): set the wake-up brightness, normally 1-10; 3-5 is a
   practical starting point.
4. Check `BLTxRx` (39): OFF, TX, RX or TX/RX; choose which events turn on the
   lighting.
5. Confirm each value and watch the screen at idle, during reception and during
   permitted transmission. If it turns off unexpectedly, review the minimum
   brightness values and the temporary-off shortcuts.

Battery life: keeping the backlight on, especially with high BLMin/BLMax, can
noticeably reduce battery life. BLTime=ON with high brightness drains the
battery sooner; for daily use try BLTime=10-20 s and low brightness. ON is
useful on the bench, with adequate power or when visibility takes priority.

## Reference for the 68 menus

Functional organization of the manual. The numbering may not match different
builds; always prioritize the mnemonic.

### 01-13: basic radio, audio and transmission parameters

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 01 | `Step` | Tuning step. | 0.01; 0.05; 0.1; 0.25; 0.5; 1; 1.25; 2.5; 5; 6.25; 8.33; 9; 10; 12.5; 15; 20; 25; 30; 50; 100; 125; 200; 250 and 500 kHz, depending on the build. |
| 02 | `Power` | Channel transmit power. Actual power depends on frequency, battery and calibration. | USER, LOW1-LOW5, MID and HIGH. Approximations: below 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W and 5 W; USER uses `SetPwr`. |
| 03 | `RxDCS` | Filters reception using digital DCS codes. It must match the received signal. | OFF and normal (N) or inverted (I) codes from the available standard table, such as D023N/D023I up to D754. |
| 04 | `TxDCS` | Sends a DCS code during transmission. It provides no privacy or encryption. | OFF and DCS codes from the standard table in polarity N or I. |
| 05 | `RxCTCS` | Opens the audio only when it detects the selected analog CTCSS subtone. | OFF or standard tones from 67.0 to 254.1 Hz, including 88.5, 100.0 and 123.0 Hz. |
| 06 | `TxCTCS` | Adds the chosen CTCSS subtone to the transmitted audio; use it when a repeater requires an access tone. | OFF or standard tones from 67.0 to 254.1 Hz. |
| 07 | `TxODir` | Direction of the transmit offset. | OFF (no offset), + (transmits above RX) or − (below). |
| 08 | `TxOffs` | Size of the TX/RX offset in MHz; adjustable in the radio's steps. Example: 0.600 MHz on a repeater that requires it. | Nominally between 0 and 999.99999 MHz depending on band limits. |
| 09 | `W/N` | Channel width. Match it to the channel and the applicable rules. | WIDE (approx. 25 kHz) or NARROW (12.5 kHz; may use the narrower setting of `SetNFM`). |
| 10 | `BusyCL` | Busy-channel lockout. | OFF allows pressing PTT when activity is detected; ON prevents transmitting when the channel is considered busy. |
| 11 | `Compnd` | Audio compander: compresses audio on transmit and/or expands it on receive; both ends should be compatible. | OFF, TX, RX or TX/RX. |
| 12 | `Mode` | Demodulation mode. Modes and transmit capability depend on the hardware and version. | FM, AM and, when the build includes it, USB. |
| 13 | `TXLock` | Channel-specific transmit lock. | OFF enables TX subject to the other restrictions; ON makes the channel receive-only. |

### 14-23: memories, channels and scan lists

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 14 | `ScAdd1` | Includes the current channel in scan list 1; it can also belong to other lists. | OFF / ON. |
| 15 | `ScAdd2` | Includes the current channel in scan list 2. | OFF / ON. |
| 16 | `ScAdd3` | Includes the current channel in scan list 3. | OFF / ON. |
| 17 | `SList1` | Priority/channel parameters for list 1 on variants that expose this entry. The exact meaning may vary. | Programmed memory channels (0-199) and no-priority selection depending on the edition. |
| 18 | `SList2` | Priority/channel parameters for list 2; check the on-screen label. | Memory positions 0-199 and priority disabling depending on the edition. |
| 19 | `SList3` | Priority/channel parameters for list 3. | Memory positions 0-199 and priority disabling depending on the edition. |
| 20 | `SList` | List used when scanning starts. | LIST [0] (channels without a list), LIST [1], LIST [2], LIST [3], LISTS [1,2,3] or ALL (all channels). |
| 21 | `ChSave` | Saves the VFO frequency and settings to a free or selected memory. Review before confirming, as it may overwrite data. | Memory 0-199. |
| 22 | `ChDele` | Deletes the selected memory channel. It affects stored data: save a copy with CHIRP before mass deletion. | Memory 0-199. |
| 23 | `ChName` | Edits the displayed name of a memory channel. | Memory 0-199; up to 10 characters in the documented versions: letters, numbers, spaces and some symbols. |

### 24-32: keys, lock and power saving

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 24 | `ScnRev` | Behavior when a signal is detected during scanning. | STOP (stop), CARRIER (resume when the signal ends, with a selectable wait of 0.25 to 20 s) or TIMEOUT (resume after 5-120 s even if the signal continues). |
| 25 | `F1Shrt` | Short-press function of the F1 side button. | Depending on the build: NONE, MONITOR, SCAN, POWER, FLASHLIGHT, VOX, FM RADIO, VFO A/B, VFO/MEM, LOCK KEYPAD, 1750 Hz, BACKLIGHT and others. |
| 26 | `F1Long` | Long-press function of the F1 side button; it can be reserved for lock or monitor. | Same families of assignable actions as `F1Shrt`. |
| 27 | `F2Shrt` | Short-press function of the F2 side button. | An action from the available list, for example SCAN, POWER, MONITOR, MUTE or changing RX MODE. |
| 28 | `F2Long` | Long-press function of F2. | Equivalent assignment options, subject to the functions enabled in the build. |
| 29 | `M Long` | Long-press action of MENU. | It can be assigned to flashlight, scan, VFO/memory switch, lock, light and other functions provided by the edition. |
| 30 | `KeyLck` | Automatic keypad lock timer. The lock scope is defined in `SetLck` (63). | OFF or from 00:15 to 10:00 min in 15 s intervals. |
| 31 | `TxTOut` | Maximum continuous transmission time (TOT). When it runs out it interrupts TX; `SetTOT` controls how it warns. | 5 s intervals, typically from 30 s to 15 min depending on the firmware. |
| 32 | `BatSav` | Receiver power saving. Higher values favor battery life but may worsen detection of brief signals. | OFF or sleep/active ratios 1:1, 1:2, 1:3, 1:4 and 1:5. |

### 33-41: display, backlight and contrast

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 33 | `BatTxt` | Battery information on the interface. | NONE (no text), VOLTAGE (voltage in V) or PERCENT (estimated percentage). |
| 34 | `ChDisp` | Channel display. A saved name is required to show it. | FREQ (frequency), CHANNEL NUMBER (number), NAME (name) or NAME+FREQ. |
| 35 | `POnMsg` | Power-on screen/message; exact labels depend on the edition. | ALL/FULL (complete information), SOUND, MESSAGE, VOLTAGE or NONE. |
| 36 | `BLTime` | Backlight duration. ON increases consumption; `BLMin` and `BLMax` modulate the brightness. | OFF, 5 s to 5 min in 5 s steps, or ON (always on). |
| 37 | `BLMin` | Minimum or idle brightness. 0 reduces it to the minimum or turns the light off at idle; a higher value consumes more. | Levels 0-9 (some controllers show 0-10). |
| 38 | `BLMax` | Maximum brightness with the screen active. Use the minimum legible level; contrast can be adjusted separately with `SetCtr`. | Levels 1-10. |
| 39 | `BLTxRx` | Lighting activation during communication; controls the light-on events when transmitting or receiving. | OFF, TX, RX or TX/RX. |
| 40 | `SetCtr` | LCD contrast. Adjust it to balance legibility and shading, especially if visual inversion is used. | Values 1-15. |
| 41 | `SetInv` | Inverts the screen appearance. It does not change backlight consumption in the way `BLTime` does. | OFF (normal) or ON (inverted). |

### 42-52: alerts, tones and DTMF signaling

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 42 | `Beep` | Key-press confirmation beep. | OFF / ON. |
| 43 | `Roger` | Alert when releasing PTT. Respect the channel's practices. | OFF, ROGER (beep) or MDC (data-type signaling on builds that offer it). |
| 44 | `STE` | Squelch tail elimination at the end of a transmission; it needs compatibility to be effective. | OFF / ON. |
| 45 | `RP STE` | Squelch tail elimination through a repeater. | OFF or delays of 100-1000 ms (100 ms steps), depending on the version. |
| 46 | `1 Call` | Quick-call channel assigned for access via a compatible shortcut/key. | Memory 0-199. |
| 47 | `UPCode` | DTMF string that can be sent when pressing PTT. | Up to 16 characters, with digits 0-9 and permitted DTMF symbols. |
| 48 | `DWCode` | DTMF string that can be sent when releasing PTT. | Up to 16 characters from the permitted DTMF alphabet. |
| 49 | `PTT ID` | When the DTMF identification is sent. | OFF, UP CODE, DOWN CODE, UP+DOWN CODE or APOLLO QUINDAR (depending on the edition). |
| 50 | `D ST` | Local playback of DTMF tones while dialing. | OFF / ON. |
| 51 | `D Prel` | DTMF signaling lead time; lets the link settle before sending tones. | Values 3-99 units of 10 ms (30-990 ms). |
| 52 | `D Live` | Real-time on-screen DTMF decoder. It requires sufficiently clean tone reception. | OFF / ON. |

### 53-60: system, reception and fine settings

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 53 | `VOX` | Voice-activated transmission. Test with ambient noise; an unsuitable threshold causes unwanted activations. | OFF or sensitivity levels 1-10. |
| 54 | `SysInf` | System information, normally read-only: firmware version and data such as battery voltage. The exact information depends on the build. | Query / read-only. |
| 55 | `RxMode` | Dual-watch management: controls which VFO is heard and which transmits. | MAIN ONLY, DUAL RX RESPOND, CROSS BAND or MAIN TX DUAL RX. |
| 56 | `Sql` | Squelch level. 0 leaves the audio open; high levels require a stronger signal to open the squelch. | 0-9. |
| 57 | `SetPwr` | Defines the power used by Power=USER (nominal values). | Below 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W or 5 W. |
| 58 | `SetPTT` | PTT behavior. Check the TX state when using ONEPUSH. | CLASSIC (hold to transmit) or ONEPUSH (toggle with presses). |
| 59 | `SetTOT` | Form of the TX time-limit warning. It does not replace the `TxTOut` setting. | OFF, SOUND (sound), VISUAL (screen) or ALL (both). |
| 60 | `SetEOT` | End-of-transmission alert. Different from `Roger`, which adds signaling to the transmitted audio. | OFF, SOUND, VISUAL or ALL. |

### 61-68: advanced interface and build options

| No. | Menu | Function | Options |
| --- | --- | --- | --- |
| 61 | `SetMet` | Signal-strength meter (S-meter) style. | TINY or CLASSIC. |
| 62 | `SetGUI` | Style/size of the main VFO typeface. It changes the presentation, not the radio's sensitivity. | TINY or CLASSIC. |
| 63 | `SetLck` | Keypad lock scope. It works with the `KeyLck` timer. | KEYS (keys only) or KEYS+PTT (keys and transmit button). |
| 64 | `SetTmr` | Display of receive/transmit timers. | OFF / ON. |
| 65 | `SetOff` | Automatic power-off of the radio. | OFF or a selectable period from 1 min to 2 h, normally in 1 min steps. |
| 66 | `SetNFM` | Bandwidth when `W/N` is set to narrow. NARROWER is only present in builds that include it. | NARROW (~12.5 kHz) or NARROWER (~6.25 kHz). |
| 67 | `SetVol` | Internal gain/volume adjustment; it is not the same as the physical volume control. | Levels 0-63 in builds with ENABLE_FEAT_F4HWN_VOL. |
| 68 | `SetKey` | Remapping of a special key on RescueOps variants. It is not available in all builds. | MENU, UP, DOWN, EXIT or STAR. |

## Operating recommendations

- Save a copy of the memories and the configuration with CHIRP before flashing,
  restoring or deleting channels: [F4HWN CHIRP module](AYUDA-QUANSHENG.md).
- CTCSS/DCS tones select signals: they provide no privacy, encryption or
  guarantee of a free channel.
- Always respect the applicable band, power and licence limits. The technical
  ability to transmit outside a band is not the same as authorization.
- If an entry changes number or is missing, check `SysInf` and consult the
  installed build before interpreting the setting.

## Sources

- Original repository: <https://github.com/armel/uv-k1-k5v3-firmware-custom>
- List and options definition:
  <https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/ui/menu.c>
- Menu documentation reference:
  <https://deepwiki.com/armel/uv-k1-k5v3-firmware-custom/8.1-menu-item-reference>
- CHIRP driver with configurable values:
  <https://github.com/armel/uv-k5-chirp-driver>

Editorial note: independent technical guide prepared with the Bricohams graphic
identity provided. It is not presented as official documentation from the
developer. Ranges and functions may vary by build.

[Quansheng and versions](AYUDA-QUANSHENG.md) · [F4HWN build options](AYUDA-OPCIONES-F4HWN.md) · [Bricohams firmware](BRICOHAMS-FIRMWARE.md)
