# Brand guide · Bricohams

## Name

- Product: **Bricohams Radio Workspace**.
- Short form: **Bricohams** (top bar and footer).
- Sidebar: original Bricohams logo with the subtitle `RADIO WORKSPACE`, without repeating the name already included in the image.

## Logo

[bricohams-logo.png](../../../bricohams-logo.png) is the **original 1200 × 446 PNG** used by [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/). It was obtained from [assets/logo-bricohams.png, commit 767edd6](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png). Its SHA-256 is `0e1bec16953129cfc9c946d24e56347ddfb38878137ba43c7e84729acf811c87`, identical to the PNG embedded in the Studio page, checked on 2026-10-21.

It replaces the previous SVG “B” icon with waves, which was not the Bricohams logo. Do not redraw it or invent a brand variant.

Usage rules:

- Do not stretch, crop, recolor, or add shadows. Keep the original background and the 1200:446 aspect ratio, with `height: auto`.
- Sidebar: full image at 178 px wide (limited to the available space); on mobile, 144 px with the subtitle beside it. Do not hide the brand on small screens.
- README: 240 px wide with proportional height. Favicons and the Linux desktop shortcut use the same PNG; there is no approved square variant.
- Leave at least 10 px between image and subtitle on desktop, and 14 px on mobile. These measurements are project layout decisions, not additional official brand guidelines.
- Do not combine it with OpenGD77, Quansheng, F4HWN, or grid.radio logos in a way that suggests affiliation.

Firmware-specific exception requested on 25-10-2026: the monochrome LCD
requires a proportional 128 × 48 adaptation of the original, without color,
on an empty background, with `Bricohams BETA` underneath. It is generated
from the original PNG; no new brand mark is drawn. It does not replace the
color PNG on the web or Android. Build details and limitations are in the
[firmware guide](BRICOHAMS-FIRMWARE.md#boot-branding-implemented).

## Palette

**Change requested on 25-10-2026:** the corporate color specified by the
user is **orange**. The teal palette below describes the current web
implementation, not the target identity. Android already uses
`#FF9800` as its theme accent; this does not establish contrast or usability
across all controls and devices. The final web migration to orange will
take place after features are complete and tested, following the requested
sequence. The exact shade and contrast must be validated before replacing
the tokens; do not recolor the original logo or rely on color alone to
communicate states.

Interface inspired by Bricohams Studio: dark background, cards, and a teal accent. The following palette belongs to Radio Workspace; it is not a claim of an exact match to Studio's colors or a recoloring of the logo.

| Token | Color | Use | Contrast (AA) |
| --- | --- | --- | --- |
| `--bg` | `#0b1418` | Background | — |
| `--panel` | `#111d22` | Cards and panels | — |
| `--line` | `#1f3238` | Borders | decorative |
| `--text` | `#e6f1f2` | Primary text | 16.2:1 on background; 14.9:1 on panel |
| `--muted` | `#8fa7ab` | Secondary text | 7.4:1 on background; 6.8:1 on panel |
| `--accent` (`--mint`) | `#2bb3a3` | Accent, focus, and success states | 7.2:1 on background; 6.6:1 on panel |
| `--blue` | `#89b9ff` | Links and secondary accent | 8.5:1 on panel |

Primary button text: `#042420` on the accent (6.3:1).

## Structure

- Fixed top bar: connection status (copy of `#radio-status`), mode badge (`#mode-badge`), and “⌁ Connect” button, which triggers the section's button and is disabled along with it.
- Sidebar: logo, navigation, and, on radio pages, numbered steps (0 Backups and connection … 4 Firmware) leading to each section.
- Label above the title: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typography

System font (`system-ui`, Segoe UI, Roboto…), without external web fonts, to comply with the CSP and avoid loading third-party resources.

## Voice

- Clear, technical, honest Spanish: explain limitations before making promises.
- Direct safety warnings: what can go wrong and what to do.
- Do not claim compatibility or operations that have not been verified.
- Data source attribution is always visible.
