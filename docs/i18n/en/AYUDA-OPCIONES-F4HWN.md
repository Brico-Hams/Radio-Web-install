# F4HWN: reference for all catalog options

Revision: 25-10-2026. This table covers **every key** in the v6.3.0 web catalog,
commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Descriptions indicate the purpose of each feature; they do not guarantee that
an arbitrary combination will compile or work on your radio.
The 10 additional keys found in published presets from 18 historical versions
are also included, without presenting them as options in the current interface.

## How to read the options

- ON/OFF here are **build** decisions, not necessarily switches available in
the radio menu.
- A compiled feature may need further configuration, resources, hardware, an
app, or external tools.
- OFF usually removes code/interface; it does not necessarily erase old data.
- A missing name does not mean OFF: it may not exist or may not be exposed by
that catalog. The [preset matrix](F4HWN-PRESETS.md) uses N/D.
- The web form uses v6.3.0; the local Bricohams builder is pinned to v6.1.0.
Do not mix options/defaults without comparing both tables.
- The maximum PY32 image budget accepted by slots is 118 KiB
(120832 bytes). Enabling everything does not guarantee it will fit in Flash/RAM.
- Upstream warns that several non-F4HWN options that are disabled by default
are unsupported unless explicitly documented. Enabling them just because a
checkbox exists is not recommended.

## Platform and protocols

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `DEV` | Development build identity and handling | Not a user feature; the Bricohams builder requires OFF and the stable catalog excludes development builds |
| `ENABLE_FEAT_F4HWN` | F4HWN feature layer, identity, and related menus | Required by the Bricohams profile; do not use OFF to feign compatibility |
| `ENABLE_UART` | UART communication and associated protocol code | Must remain enabled for compatible serial management; does not by itself set every command |
| `ENABLE_USB` | Native USB support and its PY32 transport | Requires the correct hardware/cable; does not add data USB to a V1 |
| `ENABLE_EXTRA_UART_CMD` | Additional base UART commands | Extra control surface; only for known tools and compatible versions |
| `ENABLE_UART_RW_BK_REGS` | UART read/write access to BK registers | Advanced diagnostics; may change RF operation, so do not enable without need |
| `ENABLE_SWD` | SWD debugging availability, depending on implementation | Not a web-copy mode; check pin and board effects |
| `ENABLE_LTO` | Link-time optimization across compilation units | Changes output/size; verify toolchain compatibility and stub checks |
| `ENABLE_NO_HEAP` | Removes the base linker's heap reservation | Only if the program does not need dynamic allocation; not a general speed boost |
| `ENABLE_FEAT_F4HWN_DEBUG` | F4HWN diagnostic instrumentation | May consume memory/change timing; not needed for normal use |
| `ENABLE_AGC_SHOW_DATA` | Display of automatic gain control data | Diagnostic tool; not automatic calibration |
| `ENABLE_BYP_RAW_DEMODULATORS` | Base RAW demodulation paths | Advanced option/unsupported by some presets; consult the implementation, do not assume better reception |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | Physical external Flash access commands | Needed for this website's full backup on compatible Labs; do not confuse with calibration reading |

## Multiboot, CFG, and overlays

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | External image manager and associated banks | Does not support V1 or make every `.bin` compatible |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | Runtime CFG bank switching | Changes settings/channels; it does not restore another firmware and requires compatible data |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | RAM workspace/execution used by multiboot and overlays | Keep the isolation check; do not disable in the Bricohams profile |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | External app loader and menu | Requires overlay RAM and compatible app ABI/API/caps; experimental |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | Beam service available to overlay apps | Depends on the app loader; does not mean a specific app is included |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | System information through the associated overlay/service | Depends on apps; affects diagnostic code/stack use according to the source |

The inspected CMake rejects APPS without MULTIBOOT_OVERLAY and BEAM/INFO overlay
without APPS. These dependencies were verified; they are not an exhaustive list
of all possible interactions. Do not edit a binary to pretend another API exists.

## Reception, audio, and spectrum

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_FMRADIO` | FM broadcast reception using supported hardware | Not the FM mode of a VHF/UHF channel |
| `ENABLE_NOAA` | NOAA weather reception features | Geographic availability; not a universal weather network |
| `ENABLE_WIDE_RX` | Extended reception ranges supported by the code | Sensitivity/filters vary by band; does not enable legal TX outside the band |
| `ENABLE_SPECTRUM` | Base spectrum analyzer | Do not assume it works simultaneously with other features or performs like a lab analyzer |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | F4HWN spectrum analyzer enhancements | Interacts with SPECTRUM and persisted parameters depending on the build |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | More sensitive squelch criteria | May cause noise-triggered openings; adjust SQL and test |
| `ENABLE_FEAT_F4HWN_NARROWER` | Narrower FM filter variant and related menu | Match the system bandwidth; does not change the VFO raster |
| `ENABLE_FEAT_F4HWN_VOL` | Software adjustment of RX audio | Different from the knob and RF gain |
| `ENABLE_FEAT_F4HWN_AUDIO` | F4HWN RX audio profiles/processing | Choose the audio profile afterward; does not fix an incorrectly tuned frequency |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | RX/TX audio display | Does not measure RF power or bench modulation quality |
| `ENABLE_AUDIO_BAR` | Audio level bar | Visual indicator; does not guarantee lack of distortion |
| `ENABLE_RSSI_BAR` | Signal-strength bar | RSSI does not guarantee decodable audio |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | Extended A/B listening cycle and priorities | Check RxMode and TX reply destination; not four parallel receivers |

## Scanning, memories, and logging

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_FASTER_CHANNEL_SCAN` | Base channel-scan speed improvements | Different from the additional F4HWN fast mode |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | F4HWN fast scan modes | May miss short signals or tone recognition |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | Scan progress indicator | Does not itself change the list or range |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | RSSI information while scanning | Interpret alongside noise/attenuation, not as distance |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | Information about subaudible tones/codes detected while scanning | Confirm the tone before programming it for TX |
| `ENABLE_SCAN_RANGES` | Scanning within configured ranges | Configure the correct limits and step |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | Changes the base timeout for code/tone searching | Not the TX TOT; check consumption and mode exit behavior |
| `ENABLE_COPY_CHAN_TO_VFO` | Copy memory parameters to the VFO | Temporary copy; does not replace saving the memory |
| `ENABLE_KEEP_MEM_NAME` | Preserve memory names in supported operations | Check the destination when overwriting channels |
| `ENABLE_FEAT_F4HWN_MEM` | SysInf page showing Flash and SRAM use | Program memory information, not channel or EEPROM expansion |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | Restore operating state on power-up | May resume scanning/spectrum; check before testing |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | VFO parameter reset action | Not equivalent to restoring calibration or all data |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | RX/TX activity logging to external Flash | Privacy, storage consumption, and format compatibility |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | Circular log reuse when full | May replace older entries; export them if you need to keep them |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | RF Log access/display through K5Viewer tools | Requires a compatible tool version and protocol |

## Interface, display, and power

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_BIG_FREQ` | Large frequency display | Reduces space for other data depending on the layout |
| `ENABLE_SMALL_BOLD` | Small bold font | Changes legibility, not channel parameters |
| `ENABLE_CUSTOM_MENU_LAYOUT` | Custom menu order/layout | Menu numbers are no longer a stable reference across builds |
| `ENABLE_BOOT_BEEPS` | Startup sounds | Check volume and headphones |
| `ENABLE_VOICE` | Voice prompts available in the base | Do not assume a particular language or complete menu coverage |
| `ENABLE_SHOW_CHARGE_LEVEL` | Battery level display | Estimate; not a capacity or charger-status test |
| `ENABLE_REVERSE_BAT_SYMBOL` | Battery symbol orientation/display variant | Visual only |
| `ENABLE_PWRON_PASSWORD` | Power-on access control | Risk of lockout; does not encrypt memory or replace physical security |
| `ENABLE_FEAT_F4HWN_CTR` | Contrast control | Adjust SetCtr for the specific display |
| `ENABLE_FEAT_F4HWN_INV` | Display inversion | Visual setting |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | Visible RX/TX counters | Not a transmission limit; TOT sets the limit |
| `ENABLE_FEAT_F4HWN_SLEEP` | Deep sleep/power-off after inactivity, depending on firmware | Check SetOff before extended sessions |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | USB-C charging handling/indicator depending on board and firmware | Does not change charging electronics or make a damaged battery safe |
| `ENABLE_FEAT_F4HWN_LOGO` | F4HWN startup logo/interface | Does not prove image provenance |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | Logo/display during screen saver | May affect the SetSav menu |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | Group menus into categories | Locations differ from the classic list |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | Action/shortcut selector | Check short/long assignments to avoid accidental TX |
| `ENABLE_FEAT_F4HWN_QRCODE` | Information/link QR codes | Opening links is not part of backup and does not certify a file |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | Display/control compatible with an external viewer | This website does not implement every viewer feature |
| `ENABLE_FEAT_F4HWN_GAME` | Built-in game in profiles that support it | Uses Flash/RAM; different from Labs game apps |
| `ENABLE_FLASHLIGHT` | Hardware flashlight/LED feature | Does not modify the radio or indicate a universal bootloader mode |

## TX, transfer, and regional profiles

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_VOX` | Voice/audio-activated transmission | Configure sensitivity afterward; OFF in both delivered Bricohams builds |
| `ENABLE_TX1750` | Generate a 1750 Hz access tone | Only when required by the system and permitted |
| `ENABLE_DTMF_CALLING` | DTMF calling/identification logic | Not equivalent to DMR; configure IDs and timing with the other party |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | CTCSS tone-end phase handling | Only if the receiver/repeater uses it; not encryption |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | Changes base low/medium power targets | Verify with instruments; not a universal calibration |
| `ENABLE_AIRCOPY` | AirCopy transfer feature | Requires both ends to be compatible; does not copy this website's complete MCU |
| `ENABLE_AIRCOPY_UART` | UART transfer variant | Cable/protocol and firmware must match |
| `ENABLE_AIRCOPY_FLASH` | Flash-related AirCopy features | Advanced data operation; do not assume safe restoration across revisions |
| `ENABLE_FEAT_F4HWN_PMR` | PMR-related profile/restrictions | Does not certify antenna, power, or equipment for license-exempt service |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | U.S. band/service regional profiles | Legal requirements depend on service and equipment; not universally applicable |
| `ENABLE_FEAT_F4HWN_CA` | Base Canadian band-limit profile | Do not confuse with Carrier Aggregation or an additional receiver |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | RescueOps interface/operation profile | Does not authorize professional frequencies or make the device certified safety equipment |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | RX signal-finding tool with attenuation/history | Not the timed ARDF firmware or a GPS tracker |
| `ENABLE_FEAT_F4HWN_BEACON` | Built-in Morse beacon | May transmit automatically; keep disabled until configured legally and under control |
| `ENABLE_FEAT_F4HWN_BEAM` | Beam transfer of channel/VFO parameters using base packets | The inspected payload includes frequency, offset, tones, mode, and name. Requires compatible ends/protocol; it is not a directional antenna or APRS |
| `ENABLE_F_CAL_MENU` | RF reference calibration menu | Requires instruments and procedure; do not enable to troubleshoot USB |

## Other parameters, not Boolean checkboxes

### Historical options or options not exposed by the current form

Their existence is verified in presets by commit; it does not imply current support.
For older features not verified on hardware, the code's purpose is preserved
without giving speculative operating sequences.

| Option | Explanation | Caution/follow-up configuration |
| --- | --- | --- |
| `ENABLE_ALARM` | Historical base alarm feature | May generate audio or TX depending on implementation; do not enable it to test a port or use it as an emergency system |
| `ENABLE_AM_FIX` | AM gain/reception fixes in historical branches | Does not turn TX into AM or improve every RF condition |
| `ENABLE_AM_FIX_SHOW_DATA` | Visible diagnostics for the AM fix | Requires the corresponding feature; not automatic calibration |
| `ENABLE_BLMIN_TMP_OFF` | Temporary minimum-backlight handling in branches that include it | Check that version's key/power-saving logic; does not affect sensitivity |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | TriVFO service in the overlay system in presets that declare it | Not exposed by the web catalog; do not assume three physical receivers or compatibility with apps from another release |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | Channel reset action in earlier branches | Not guaranteed to equal RESET_VFO; check its scope before losing settings |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | Screenshot code in earlier versions | May use a different protocol/tool from current K5Viewer |
| `ENABLE_NAVIG_LEFT_RIGHT` | Navigation layout selection in historical presets | Do not copy it to versions with SetNav without reviewing migration |
| `ENABLE_REGA` | Historical test/alarm signaling for the REGA emergency network using ZVEI tones | May activate TX automatically. Do not test on emergency frequencies or routinely assign to keys; requires authorization and the service's procedure |
| `ENABLE_TX_WHEN_AM` | Allows a TX path while AM reception mode is selected in the historical base | Does not guarantee AM output modulation or legal authorization; do not enable to attempt aviation or other service TX |

### Identity and tool parameters

| CMake parameter | What it means | How it is handled here |
| --- | --- | --- |
| `CMAKE_BUILD_TYPE` | Build configuration level | Local builder Release |
| `TARGET` | Executable/artifact name | Local builder bricohams; not automatically a hardware target |
| `EDITION_STRING` | Displayed edition identity | Bricohams in the local builder, preserving upstream protocol identity |
| `VERSION_STRING_1/2` | Displayed component versions | Do not change to bypass validation |
| `AUTHOR_STRING`, `AUTHOR_STRING_1/2` | Upstream attribution and identity | Preserve notices and compatibility; do not claim others' authorship |
| `SQL_TONE` | Base parameter used in specific configurations | Not exposed by --option; do not change it using an SA818 recipe on a normal radio |
| `SOURCE_DATE_EPOCH` | Reproducible build time | Set to the commit in the local builder; does not adjust the radio clock |

These arbitrary values are not allowed in the local builder through `--option`.
The Boolean/default list and the meaning of "absent" are in the
[generated matrix](F4HWN-PRESETS.md).

## Verifying a combination

1. Choose a version and preset as a unit; do not copy flags from another commit.
2. Change only what is needed and record the request.
3. Build and address dependency, RAM, Flash, and RAM isolation errors.
4. Check the binary, metadata, map, and SHA256SUMS.
5. Prepare a slot without writing; verify the inspector accepts it.
6. Perform a controlled physical test with the original backup and known recovery.

A successful build does not prove RF performance, the absence of bugs, or data
compatibility with every firmware in the historical set.

## Sources

- [v6.3.0 catalog presets](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [Inspected v6.1 feature CMake](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/CMakeLists.txt).
- [SysInf memory information](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [Inspected Beam payload](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/app/beam.c).
- [Historical REGA module, purpose reference](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/App/app/rega.c).
- [Upstream README and manuals](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- Versioned `f4hwn-options.js` catalog and `scripts/build-bricohams.cjs` builder
  in this repository.