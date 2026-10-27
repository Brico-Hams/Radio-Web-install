# OpenGD77: models, variants, and support scope

**Documentation verified: 2026-10-25.** Companion to [Configuration and usage help](AYUDA-OPENGD77.md). This guide distinguishes project-documented compatibility, catalog targets, and names recognized by the connector. Not every radio has been physically tested.

## 1. How to read the tables

- **Guide:** the model or variant appears in the official English guide consulted. A mention in a title, screenshot, or example is not complete installation instructions.
- **Package:** a file was observed in a specific official index. This does not certify every hardware revision with a similar commercial name.
- **Catalog:** a `firmware-core.js`, `TARGETS` target; it is a package selector, not a firmware loader.
- **Identification:** a label in `gd77-connector.js`, `MODELS`; it interprets a protocol number. It does not by itself prove full operational compatibility.
- **Unconfirmed:** the consulted sources do not provide sufficient evidence; that does not necessarily mean impossible or nonexistent.

**All OpenGD77 families are radio-read-only in this web app.** The standard codeplug can be read, edited, and saved locally, but **writing is BLOCKED** because the backup does not include a verified, complete copy of MCU firmware. The external CPS may offer other operations; that does not change web permission. No firmware is flashed from the catalog. [L]

## 2. Model and target matrix

In this table, “ID” indicates the label the connector may return. Names with or without hyphens or spaces are grouped only to make lookup easier; this does not make different variants the same hardware.

| Model or designation | Official evidence and restrictions | Target in `TARGETS` | Label in `MODELS` | Practical conclusion |
| --- | --- | --- | --- | --- |
| Radioddity GD-77 / GD77 | Installation and operation documented; `OpenGD77.zip` package [G, F1] | `GD-77`, MK22 | `GD-77` | Choose its package, not GD77S |
| Radioddity GD-77S / GD77S | Documented without display/keypad; voice prompts essential; its own package [G, F1] | `GD-77S`, MK22 | `GD-77S` | Zones can access only the first 16 channels through the selector |
| Baofeng DM-1801 / DM1801 | Hardware version 1 only; guide excludes 2022 revision [G, F1] | `DM-1801`, MK22 | `DM-1801` | Verify the board; the front panel is not enough |
| Baofeng DM-1801A / DM1801A | Hardware version 1 only; the newer 2022 revision is also excluded [G, F1] | `DM-1801A`, MK22 | `DM-1801A` | Different image from DM1801; the A is not an optional suffix |
| Baofeng RD-5R / RD5R | Installation documented; no hotspot because of USB limitation during TX [G, F1] | `RD-5R`, MK22 | `RD-5R` | Do not confuse it with every DM-5R or UV-5R |
| TYT MD-9600 / MD9600 | Mobile radio documented with RF revisions and separate HW packages [G, F3] | `MD-9600-V1`, `-V2`, `-V4`, `-V5`, STM32 | `MD-9600` | The ID does not automatically select a revision |
| Retevis RT-90 / RT90 | Documented alongside MD-9600; same revision caution [G] | No RT90 key; relevant MD9600 targets | No RT90 label; table offers `MD-9600` | Official family association, not a guarantee for every board |
| TYT MD-UV380 / standard UV380 | Installation/operation documented; `OpenMDUV380.zip` package [G, F2] | `MD-UV380`, STM32 | `MD-UV380` | Do not select based on name similarity for an MD-380 |
| Retevis RT-3S / RT3S | Documented alongside MD-UV380 [G] | No RT3S key; target `MD-UV380` names it in its label | No RT3S label | Official association; check the unit's GPS and hardware |
| TYT MD-UV390 / UV390 | Included in the guide title and GPS screen [G] | No target with this name | No UV390 label | Official mention, yes; exact image assignment for each variant is unconfirmed here |
| MD-UV380 10W **non-PLUS** | Guide describes a power-scale option on the non-PLUS UV380 platform [G: Radio Options — Mode] | No dedicated non-PLUS 10W target | No separate ID | The scale does not certify power or change hardware; check variant notes |
| MD-UV380 10W **PLUS** | Separate official `OpenMDUV380_10W_PLUS.zip` package [F2] | `MD-UV380-10W-PLUS`, STM32 | No separate PLUS ID | Different hardware according to the local label; do not treat as standard UV380 |
| UV390 marketed as 10W or PLUS | No specific assignment verified in the consulted sources | No UV390 PLUS target | No specific ID | Do not extrapolate the UV380 PLUS image based only on the marketing claim |
| Baofeng DM-1701 / DM1701 | Installation/operation documented; `OpenDM1701.zip` package [G, F2] | `DM-1701`, STM32 | `DM-1701` | Do not confuse with RGB |
| Baofeng DM-1701 RGB / DM1701RGB | Label anticipated by the connector; no model-specific documentation verified here [L] | No RGB target | `DM-1701 RGB` | ID recognition, not a confirmed package or installation |
| Retevis RT-84 / RT84 | Installation guide and its own `OpenRT84.zip` package [G, F2] | `RT-84`, STM32 | No RT84 label | Sharing a chapter with DM1701 does not authorize exchanging ZIP files |
| TYT MD-2017 / MD2017 | Control diagram in guide and official `OpenMD2017.zip` package [G, F4] | `MD-2017`, STM32 | `MD-2017` | Publication evidence; do not extrapolate the UV380 manual in full |
| MD-380 / MD380 | Connector label; no target or package verified for it in this review [L] | No target | `MD-380` | **Not MD-UV380**; bands and variant compatibility are not certified here |
| DM-32 / DM32 | Anticipated identification label [L] | No target | `DM-32`, logical family SERIAL | No firmware, GPS, APRS, or complete memory map certified based on that name |
| UV008 | Anticipated identification label [L] | No target | `UV008`, logical family SERIAL | No commercial equivalence or RF capability certified |

The Quansheng targets `UV-K1` and `UV-K5-V3` that also exist in `TARGETS` are **not OpenGD77**. They are outside the scope of this guide.

### Aliases and additional names in the guide

| Names | What is confirmed | What must not be inferred |
| --- | --- | --- |
| GD-77 ↔ TYT MD-760 | The installation section identifies MD-760 as another name for GD-77 | Compatibility with any other similar TYT model |
| DM-1801 version 1 ↔ Baofeng DM-860 | The guide states this explicitly | That a 2022 DM-1801 becomes compatible because it is called DM-860 |
| RD-5R ↔ Baofeng DM-5R **Tier 2** | Explicit alias in installation instructions | That every DM-5R, including other designs/versions, is an RD-5R |
| MD-9600 ↔ Retevis RT-90 | Official joint installation and operation treatment | One image for all revisions from both brands |
| MD-UV380 ↔ Retevis RT-3S | Official joint treatment, also reflected in the catalog label | Identity with MD-380 or automatic compatibility with all 10W versions |
| TYT MD-730 and GD-77S | MD-730 appears in the update-entry control list alongside GD77/GD77S/MD760 | That this isolated mention confirms a full GD77S↔MD730 alias or separate target |
| DM-1701 and RT-84 | Both have instructions in the same chapter | Image alias: separate ZIP files exist |
| MD-UV390 and MD-UV380 | The guide documents UV390 in its scope and GPS discussion | Interchangeable image for every UV390 revision |
| MD-2017 and Retevis RT82 or other commercial names | No alias confirmed in the sources reviewed | Do not use MD2017 images based only on a retailer's equivalence claim |
| DM1701RGB, DM32, UV008, and other radios | Only the local labels listed | A transport family does not prove identical hardware |

This table avoids turning commercial proximity, external appearance, or inclusion in the same index into technical equivalence.

## 3. Web families and identification protocol

The following classification is **what the connector implements**, not a universal inventory of microcontrollers in every radio sold under that name:

| `radioType` | Interpreted label | Logical family and transport selected by code |
| --- | --- | --- |
| 0 | GD-77 | MK22 / USB |
| 1 | GD-77S | MK22 / USB |
| 2 | DM-1801 | MK22 / USB |
| 3 | RD-5R | MK22 / USB |
| 4 | DM-1801A | MK22 / USB |
| 5 | MD-9600 | STM32 / USB |
| 6 | MD-UV380 | STM32 / USB |
| 7 | MD-380 | STM32 / USB |
| 8 | DM-1701 | STM32 / USB |
| 9 | MD-2017 | STM32 / USB |
| 10 | DM-1701 RGB | STM32 / USB |
| 11 | DM-32 | SERIAL / WebSerial at 115200 |
| 12 | UV008 | SERIAL / WebSerial at 115200 |

`connect()` requests a 46-byte RadioInfo structure, accepts structure **versions 1 through 4**, checks the type range, and requires the selected family to match. It extracts model, firmware, and build. If those data are not recognized, it rejects the structure: do not guess a memory map.

There are no distinct IDs in this table for RT90, RT3S, RT84, UV390, HW V1/V2/V4/V5, or 10W PLUS. That absence means the list cannot unambiguously detect every variant. It also does not guarantee what value each untested firmware will return.

The web backup uses different calibration maps for MK22 and other families, plus segments for reconstructing the standard codeplug. The fact that the code offers this path does not by itself confirm physical testing, validity on future builds, or a complete copy on every SERIAL model. If the response is unexpected, keep the error and do not force the family. [L]

## 4. MD-9600 / RT-90: HW1, HW2, HW4, and HW5 revisions

The project explains that PLL and intermediate-frequency changes occurred during production. Board silkscreen may not be sufficient: there are units whose hardware changed without changing that marking. The catalog does not resolve this ambiguity.

| Local target | File observed in the official index [F3] | Selection criterion |
| --- | --- | --- |
| `MD-9600-V1` | `MD9600_firmware_HW_V1.zip` | RF revision compatible with HW1, documented for the unit |
| `MD-9600-V2` | `MD9600_firmware_HW_V2.zip` | RF revision compatible with HW2 |
| `MD-9600-V4` | `MD9600_firmware_HW_V4.zip` | RF revision compatible with HW4 |
| `MD-9600-V5` | `MD9600_firmware_HW_V5.zip` | RF revision compatible with HW5; guide directs board 4A to V5 firmware |

The index also contains Japanese variants with the `Japanese_` prefix. No V3 target was observed in the local catalog or that index: do not invent one based on numerical continuity.

The guide also warns that some very old units marked as board version 2 may need V1 firmware. Although the historical text suggests trying another revision if there is no RX/TX, this guide **does not turn that observation into a universal blind-flashing procedure**. Document the board/unit, consult that revision's instructions, and keep backups.

A correct codeplug with the wrong HW image can leave RX/TX nonfunctional. Changing TGs, filters, or tones will not fix an incorrect PLL/IF selection. The firmware HW number is not the CPS version or the RadioInfo structure version.

## 5. UV380, UV390, RT3S, and 10W variants

| Case | Evidence | Conclusion limit |
| --- | --- | --- |
| Standard UV380 / RT3S | Joint guide and local `MD-UV380` target | Check whether the unit has GPS and check the build |
| UV380 10W non-PLUS | `Mode` option adapting the displayed scale according to the guide | Selecting the scale does not increase physical output power |
| UV380 10W PLUS | Official ZIP and separate local target | Do not load the standard image just because both names include “UV380” |
| UV390 | Mentioned in guide scope and GPS discussion | No local selector automatically certifies its variant |
| Commercial UV390 10W/PLUS | No specific mapping verified here | Identify the board and official notes before choosing an image |

Do not infer that non-PLUS and PLUS versions share installation procedure, display, GPS, or calibration. Nor that all handhelds marketed as “10W” deliver that measured power.

## 6. Bands, power, and capabilities: documented and pending

No commercial table of RX/TX ranges or watts by radio is published here: the consulted sources do not verify regional variants and revisions consistently. Only supported information is provided, with its limits noted.

| Capability | Usable evidence | Do not extrapolate to… |
| --- | --- | --- |
| FM and DMR | Functional objective and modes in the guide for supported platforms; DMR requires the codec/donor procedure | Every connector label or installation without the correct donor |
| VHF/UHF | Guide covers limits for both bands and FM/DMR channels | Simultaneous dual reception or exact ranges guaranteed for every model |
| 200/220 MHz band | Manual describes software limits and warns that a suitable 200 MHz RX/PA section is missing and significant spurious emissions occur | Calling all equipment “triband” or recommending TX there |
| 5 W / 10 W / mobile power | Separate scales and tables in the guide, plus separate PLUS package | One common maximum power or tolerance for continuous operation |
| Display/keypad | GD77S has neither; other controls and sizes vary | A screenshot or shortcut being universal |
| GPS | Guide covers optional receiver in MD9600/RT90 and UV380/RT3S; GPS screen also mentions UV390, DM1701, and RT84 with GPS installed | All units, or GPS guaranteed in DM1701RGB/DM32/UV008 |
| RTC | Satellite chapter lists MD9600/RT90, UV380/RT3S, and DM1701 in its context | Automatically classifying every other later model as “no RTC” |
| FM APRS TX | Documented by the guide; requires a profile and position | APRS reception, two-way messaging, or identical resources in every build |
| NMEA / GPS logging | Options documented when suitable hardware and memory are available | NMEA suffix adding a receiver or having no effect on the ID database |
| Hotspot | Documented for supported platforms; RD5R/DM5R excluded because of USB during TX | RD5R, full duplex, or all new connector labels |
| Satellites | Pass prediction and Doppler correction documented with time/position/Keps | All space modes or hearing one's own transmission in duplex |
| Voice accessibility | External voice files and alert levels; essential on GD77S | Voice files automatically included in any ZIP/language |

### Manual frequencies are not certification

In `Radio Options — Band Limits`, the guide distinguishes:

- Software TX limits, with defaults referring to the U.S.: **144–148, 222–225, and 420–450 MHz**. **These are not Spain's band plan or local authorization.**
- General tuning limits described for the platforms in that chapter: **127–178, 190–282, and 380–564 MHz**, explicitly excluding the intermediate range on MD9600/RT90.
- The AT1846S circuit specifications cited by the text itself: **134–174, 200–260, and 400–520 MHz**, alongside warnings about out-of-spec operation.

These numbers describe different contexts. They must not be turned into “bands guaranteed on all models” or applied to DM32, UV008, RGB, or MD380 because they appear in a local array. The manual warns of spurious emissions in the intermediate band due to missing suitable stages: **this guide does not recommend transmitting there**. Configure your country's authorized limits and your equipment's actual restrictions.

### Codeplug limits versus radio capability

The web editor covers the standard **128 KiB** binary and excludes channels **1025+**. This does not claim that all radios have the same maximum total channels, contacts, IDs, or zones. Voice resources, GPS logging, and ID databases compete for memory on some platforms. The selected ID-database entry length also changes its capacity. Check the CPS/build and the actual memory in your unit.

## 7. Controls and bootloader: no universal sequence

The guide uses logical names such as SK1, SK2, Green, Red, and Orange. Their positions differ by radio and, on mobile radios, by panel or microphone.

| Family/model | Documented operational difference | Caution |
| --- | --- | --- |
| GD-77 | Two side keys and top button; manual reference | Do not map positions to every Baofeng |
| GD-77S | 16-position selector and voice-announced modes | No visual menus or numeric keypad |
| DM-1801 / DM-860 | Dedicated MR/VFO and A/B controls | Similar buttons do not validate the 2022 revision |
| RD-5R / DM-5R Tier 2 | A/B and Band replace left/right; long access to quick menu | Does not have the same physical Orange button as GD77 |
| MD-UV380 / RT-3S | Rotary knob and different arrow functions | Check context: channel/VFO or menu |
| DM-1701 / RT-84 | P1/P2 perform left/right functions | Own packages and positions are not interchangeable by intuition |
| MD-9600 / RT-90 | Panel and microphone have specific mappings | According to the guide, VFO scanning is not fully controlled from the panel |
| MD-2017 | Guide includes a specific control diagram | Do not substitute the UV380 diagram |
| RGB / DM32 / UV008 / MD380 | No model-specific instructions verified in this review | Do not invent key combinations |

To install firmware, follow the instructions for the project's **exact variant** and the corresponding loader in OpenGD77 CPS. The guide distinguishes side-key combinations on MK22, P1 and top button on the mobile radio, and PTT with another key on some STM32 handhelds. No universal recipe is reproduced because neither identification nor commercial name is enough to validate every case.

On STM32, the DFU bootloader context and its driver differ from normal CPS/USB mode. A blank screen during an update may be normal. Do not try random combinations or write files from another family to make a port appear.

## 8. Safe selection scenarios

### “I have a DM-1801; does the DM1801 package work?”

1. Determine whether it is hardware version 1 or the newer 2022 revision.
2. If it is the revision excluded by the guide, do not use the OpenDM1801 package based only on the name.
3. If it is a DM1801A, do not substitute DM1801: the catalog and publication have different targets.
4. If you cannot determine the revision, keep the current configuration and stop installation.

### “My RT3S appears as the MD-UV380 family”

The association is documented by the project and the catalog label. Still check the hardware, GPS presence, and image notes. The group name does not prove two-channel simultaneous reception or make the radio a 10W PLUS.

### “The connector recognizes DM32; can it be programmed now?”

The label is anticipated as type 11 and SERIAL transport. There is no DM32 firmware target in `TARGETS`. No official package or full feature set has been confirmed here. The web app does not grant write permission, even if identification and reading complete. OpenGD77 status on the DM-32, installation, backups, and building open firmware: [DM-32UV guide](DM32UV-FIRMWARE.md).

### “There is an official MD2017 ZIP; why isn't it at the beginning of the manual?”

The guide evolves section by section, and its header does not necessarily list every later publication. The control diagram and official index are specific additional evidence. Do not infer that every detail for another model applies to MD2017 without review.

### “I want to restore my MD9600 using another unit's backup”

Do not use another radio's calibration. Distinguish codeplug, resources, calibration, and firmware; identify the RF revision and keep your unit's backups. A downloaded image does not replace the MCU backup required by the web app policy.

## 9. Compatibility diagnostics

| Clue | Cautious interpretation | Action |
| --- | --- | --- |
| Present in catalog but not in `MODELS` under its alias | Download target and identification do not have to use the same name | Review the documented family; do not require literal equality for every alias |
| Present in `MODELS` but not catalog | There is a protocol label, not a selected downloadable firmware | Do not choose a similar model as a substitute |
| Radio responds as MD9600 | Family is known, but not necessarily HW1/2/4/5 | Determine revision before installation |
| It is a UV380 and the seller says “Plus” | May be hardware with a different image | Verify board and full designation |
| It is a UV390 and appears in the guide | Official mention, but no specific local selector | Find the exact variant notes; do not assume the UV380 ZIP |
| It is an MD380 without “UV” | Different model name | Do not load `OpenMDUV380.zip` based on a partial name match |
| Selected family is rejected | Identification does not match expected transport or supported format | Keep the error and do not disable the check |
| Backup finishes as incomplete | The web flow lacks a complete MCU copy | Export what was read; keep writing blocked |
| A feature in screenshots is missing | Build, platform, resources, or hardware differ | Compare version and notes, not just brand/model |

### Checklist before claiming support

- [ ] Full model and manufacturer recorded.
- [ ] Actual board revision confirmed when required.
- [ ] Firmware, build, and CPS recorded.
- [ ] Alias supported by a source, not just a retailer.
- [ ] Image selected by model/variant, not resemblance.
- [ ] GPS, RTC, power, display, and bands not assumed without evidence.
- [ ] Normal USB mode distinguished from bootloader.
- [ ] Original backups exported and their scope understood.
- [ ] 128 KiB limit and extended channels acknowledged.
- [ ] Web writing remains **BLOCKED**.

## 10. Sources and time scope

All sources below were consulted on **2026-10-25**. The links identify evidence; they do not authorize downloading firmware for any radio in every circumstance.

| Key | Verified source | Provides |
| --- | --- | --- |
| G | [Official English guide](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md); [fixed reference 33de63dcb002fcd837419fda25a2e535b940dbcd](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md) | Installation models, 2022 DM1801 warning, explicit aliases, controls, and platform-specific features |
| R | [LibreDMR/OpenGD77_UserGuide repository](https://github.com/LibreDMR/OpenGD77_UserGuide) | Guide provenance and GPL 2 statement for its documents; only English is maintained |
| W | [OpenGD77 home page](https://www.opengd77.com/) | Forum status and access to static archive |
| A | [Forum archive](https://www.opengd77.com/archive/index.html) | Historical context; visible snapshot is from July 2025, not a 2026 compatibility matrix |
| F1 | [GD77, 2026-05-04 / 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/) | MK22 packages by model and NMEA/Japanese variants where available |
| F2 | [MDUV380_DM1701, 2026-05-04 / ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/) | Separate ZIP files for UV380, UV380 10W PLUS, DM1701, and RT84 |
| F3 | [MD9600, 2026-05-04 / e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/) | HW V1/V2/V4/V5 ZIP files and Japanese variants |
| F4 | [MD2017, 2026-05-05 / 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/) | MD2017 image publication and Japanese variant |
| L | [`firmware-core.js`](../../../firmware-core.js), [`gd77-connector.js`](../../../gd77-connector.js), [`radio-ui.js`](../../../radio-ui.js) | Catalog, protocol labels, and actual scope of web reading/editing/blocking |

The `Latest` paths for those families pointed to the dated indexes cited; this does not claim they are every available build or that “Latest” means stable for every unit. The names `Japanese`, `JA`, or `NMEA` identify distribution variants, not new models or capability equivalence.

The GPL 2 license declared by the guide README **does not prove an MIT firmware license** or a single license for CPS, voice files, donors, and codec. Check each component's terms before redistribution.

**Blocks and gaps explicitly retained:** no complete MCU copy in the web app; ambiguous commercial revisions on some radios; no verified UV390 variant mapping; no demonstrated full support for DM1701RGB, DM32, UV008, and MD380 based only on their labels. None of these gaps is filled by attributing general-manual features to every model.