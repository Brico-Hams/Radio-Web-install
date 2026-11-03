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
| `--bg` | `#FFFFFF` | `#111518` | Background |
| `--surface` | `#F6F7F8` | `#1C2329` | Cards and panels |
| `--text` | `#23272B` | `#F6F8FA` | Primary text |
| `--text-muted` | `#59636B` | `#BAC4CC` | Secondary text |
| `--border` | `#DCE1E5` | `#38434C` | Borders |
| `--link` | `#AA410B` | `#FFA06A` | Links |
| `--focus` | `#F26B1D` | `#FFC18F` | Focus ring |
| `--brand-orange` | `#F26B1D` | `#F26B1D` | Bricohams orange |
| `--on-accent` | `#23272B` | `#23272B` | Text on orange |

Source of truth: the official colour manual `BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`, which is not included in the repository. The brand graphite is `--brand-ink`. The theme is applied with `data-theme` on the root element and `localStorage`.

Primary buttons: `--on-accent` text on `--brand-orange: #F26B1D` in both themes, never white on orange. Orange is not used as small text on a light background. Visible focus with `outline: 3px solid var(--focus)`. Main controls are 44 px, with internally scrolling tables, horizontal mobile navigation, and animations only when reduced motion is not requested.

Calculated WCAG 2.1 contrast (minimum 4.5:1 for text and 3:1 for the focus ring):

| Pair | Light | Dark |
| --- | --- | --- |
| `--text` / `--bg` | 15.0 | 17.2 |
| `--text` / `--surface` | 14.0 | 14.9 |
| `--text-muted` / `--bg` | 6.1 | 10.3 |
| `--text-muted` / `--surface` | 5.7 | 9.0 |
| `--link` / `--bg` | 6.0 | 9.2 |
| `--link` / `--surface` | 5.6 | 7.9 |
| `--on-accent` / `--brand-orange` | 4.9 | 4.9 |
| `--focus` / `--bg` | 3.05 | 11.6 |

Logo: original PNG only, never filtered or inverted; in dark mode it sits on a discreet white plate (`--plate`). Error and warning states keep explicit text and meet AA in both themes.

## Structure

- Fixed top bar: connection status (copy of `#radio-status`), mode badge (`#mode-badge`), and “⌁ Connect” button, which triggers the section's button and is disabled along with it.
- Sidebar: logo, navigation, and, on radio pages, numbered steps (0 Backups and connection … 4 Firmware) leading to each section.
- Label above the title: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typography

`Inter` for the interface and `Montserrat` 700–800 for large headings, falling back to system fonts (`system-ui`, Segoe UI, Roboto…). No external web fonts are loaded, to comply with the CSP and work offline.

## Voice

- Clear, technical, honest Spanish: explain limitations before making promises.
- Direct safety warnings: what can go wrong and what to do.
- Do not claim compatibility or operations that have not been verified.
- Data source attribution is always visible.
