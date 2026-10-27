# Acknowledgments and sources

[Español](ACKNOWLEDGEMENTS.md) · [English (US)](ACKNOWLEDGEMENTS.en.md) · [Français](ACKNOWLEDGEMENTS.fr.md) · [Deutsch](ACKNOWLEDGEMENTS.de.md)

Bricohams Radio Workspace is an **independent implementation for interoperability**. Documented or published formats and protocols were studied. The precompiled catalog distributes F4HWN v6.1.0 and Bricohams-derived images: it retains the upstream Apache-2.0 license and NOTICE, alongside GPL-3.0-or-later for Bricohams contributions. Hashes, provenance, and options are in `precompiled/catalog.json`; notices and both licenses accompany the binaries. There is no affiliation with or endorsement by the referenced projects. Trademarks belong to their owners.

## Protocol and format references

The native viewer/keyboard, restart, maintenance, DFU, app management, and RF filtering/export tools are independent implementations for interoperability. They neither load UV Studio scripts nor copy its interface. This does not transfer authorship of third-party firmware, apps, logos, or resources to Bricohams and does not constitute a legal guarantee. Original licenses and notices remain mandatory.

| Project | Reference use | License |
| --- | --- | --- |
| [OpenGD77 web CPS (grid.radio)](https://grid.radio/opengd77/) | CPS `C`/`R`/`W`/`X` protocol, modes, memory maps, driver guide | Third-party website |
| [OpenGD77](https://www.opengd77.com/) · [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) | Codeplug format and custom data block (type 3 satellites) | GPL-2.0 |
| [F4HWN · armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) and its [wiki](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki) | UART, Multiboot, Multiconfig, slots, CRC | Apache-2.0 |
| [UV Studio](https://armel.github.io/uvstudio/) | Slot/backup workflow and LCD/RF Log interoperability reference; pinned revision `e7aa946f6de002559e1aaf3f91765db7fc2ed567`. The web viewer is independently implemented, not copied from the site's code | Third-party website |
| [egzumer/uv-k5-firmware-custom](https://github.com/egzumer/uv-k5-firmware-custom) | Predecessor of F4HWN firmware and its protocol | Apache-2.0 |
| [DualTachyon/uv-k5-firmware](https://github.com/DualTachyon/uv-k5-firmware) | Base Quansheng protocol | Apache-2.0 |

## Dependencies

| Package | Use | License |
| --- | --- | --- |
| [satellite.js](https://github.com/shashwatak/satellite-js) 6.0.1 | SGP4/SDP4 propagation | MIT |

## Data sources

| Provider | Data | Terms |
| --- | --- | --- |
| [RadioID.net](https://radioid.net/) | DMR contacts | RadioID terms |
| [RepeaterBook](https://www.repeaterbook.com/) | Repeaters | Approved token required. “Data courtesy of RepeaterBook.com” |
| [SatNOGS DB](https://db.satnogs.org/) | Transmitters and TLE | CC BY-SA 4.0 |
| [CelesTrak](https://celestrak.org/) | TLE | CelesTrak terms |
| [opengd77.com](https://www.opengd77.com/downloads/) and [F4HWN GitHub Releases](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases) | Official firmware | Each project's licenses |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) (F4HWN) | Seven UV-K1 teardown photos in `docs/atlas/`, resized to 1600 px | Apache-2.0 |

## Documentation and tools

- Bricohams identity: [original Bricohams Studio logo](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png), retained without redrawing or recoloring. Provenance and verification in the [branding guide](docs/i18n/en/BRANDING.md).
- [MDN: Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) and [WebUSB API](https://developer.mozilla.org/docs/Web/API/WebUSB_API).
- Vallado, Crawford, Hujsak, and Kelso, *Revisiting Spacetrack Report #3* (2006): SGP4 test vector used in the tests.
- [Zadig](https://zadig.akeo.ie/) (WinUSB on Windows), [WCH CH341SER](https://www.wch-ic.com/downloads/CH341SER_EXE.html), [Silicon Labs CP210x](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers), and [Prolific PL2303](https://www.prolific.com.tw/) — linked, not redistributed.

Thanks to the amateur radio community and these projects' authors for publishing their work.

# Precompiled Labs apps

The test catalog redistributes Armel F4HWN's SystemInfo, BroadcastFM, Cube3D, Tetris, Breakout, and Minesweeper from the v6.1.0 archive under Apache-2.0. Their original names, headers, license, and NOTICE are preserved. Manifests identify provenance and SHA-256; authorship is not attributed to Bricohams and functional hardware validation is not claimed.
