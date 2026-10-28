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
- Sidebar: full image at 166 px wide (limited to the available space); on mobile, 128 px with the subtitle beside it. Do not hide the brand on small screens.
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

Redesigned on 2026-10-28: Bricohams orange, neutral surfaces, and clearly
structured cards. The website and installers share the same design.
Appearance offers System, Light, and Dark; the preference is stored locally,
without an account, and follows system changes when set to System. Help uses
the same preference. Android adapts its native controls to the system.
The original logo is unchanged. States always retain explicit text.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#f3f5f9` | `#0e1420` | Background |
| `--panel` | `#ffffff` | `#172131` | Cards and panels |
| `--line` | `#dce2eb` | `#334157` | Decorative borders |
| `--text` | `#19263b` | `#edf2fb` | Primary text |
| `--muted` | `#526179` | `#afbdd1` | Secondary text |
| `--mint` | `#a64b00` | `#ffb456` | Accent text |
| `--blue` | `#205da8` | `#9dc5ff` | Links and focus |

Primary buttons: `#241407` text on `--accent: #f7941d`. Tests check a
minimum 4.5:1 text contrast in both palettes. Main controls are 44 px,
with visible focus, internally scrolling tables, horizontal mobile navigation,
and animations only when reduced motion is not requested.

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
