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

Official BricoHams color manual v1.1 (2026-11-03), PDF
`BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`
(not included in the repository). It replaces all previous palettes
(`#f7941d`, `#F26B21`, `#a64b00`, `#0b1418`, `#0e1420`, `#111d22`, `#172131`,
`#89b9ff`, `#205da8`, `#0A2540`, and `#FF6B00`), which must not be used again.

The Appearance selector offers System, Light, and Dark; it is stored in
`localStorage` and applied as `data-theme` on `<html>` before painting.
Android follows the system mode (`res/values/colors.xml` and
`res/values-night/colors.xml`). States always retain explicit text.

Both themes: `--brand-ink` `#23272B` (graphite), `--brand-orange` `#F26B1D`
(CTAs and details), and `--on-accent` `#23272B` (text on orange).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Background |
| `--surface` | `#F6F7F8` | `#1C2329` | Cards and panels |
| `--border` | `#DCE1E5` | `#38434C` | Borders |
| `--text` | `#23272B` | `#F6F8FA` | Primary text |
| `--text-muted` | `#59636B` | `#BAC4CC` | Secondary text |
| `--link` | `#AA410B` | `#FFA06A` | Links and accent text |
| `--focus` | `#F26B1D` | `#FFC18F` | 3 px `:focus-visible` outline |

Rules (WCAG 2.2 AA):

- Primary button: orange `#F26B1D` background with graphite `#23272B` text in both themes. Never white text on orange (3.05:1).
- Orange `#F26B1D` is not used as small text on white; in light mode `#AA410B` is used.
- Logo: only the original PNG, without filters or inversion; in dark mode, on a discreet white plate with rounded corners.
- Typography: Inter for the interface and Montserrat 700-800 for large headings, with the system font stack as fallback and no remote fonts loaded.
- States (success/warning/error): functional colors with AA contrast in both themes; they never replace the CTA orange.
- Print only: Pantone 426 C (graphite) and 165 C (orange; 158 C alternative). They are not screen colors.
- Monochrome LCD firmware: boot logo and “Bricohams” string, without colors.

| Pair | Light | Dark |
| --- | --- | --- |
| Text / background | 14.6:1 | 17.0:1 |
| Secondary text / background | 5.9:1 | 10.4:1 |
| Link / background | 6.5:1 | 8.5:1 |
| Graphite on orange (button) | 4.9:1 | 4.9:1 |
| Orange / background (non-text) | 3.05:1 | 6.03:1 |
| White on orange (prohibited) | 3.05:1 | 3.05:1 |

The figures are approximate (computed with the WCAG formula); each platform's
automated tests check the 4.5:1 minimum for text.

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
