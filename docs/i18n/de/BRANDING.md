# Markenleitfaden · Bricohams

## Name

- Produkt: **Bricohams Radio Workspace**.
- Kurzform: **Bricohams** (obere Leiste und Fußzeile).
- Seitenleiste: ursprüngliches Bricohams-Logo mit Untertitel `RADIO WORKSPACE`, ohne den bereits im Bild enthaltenen Namen zu wiederholen.

## Logo

[bricohams-logo.png](../../../bricohams-logo.png) ist die **ursprüngliche PNG-Datei mit 1200 × 446 Pixeln**, die [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/) verwendet. Sie stammt aus [assets/logo-bricohams.png, Commit 767edd6](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png). Ihr SHA-256 lautet `0e1bec16953129cfc9c946d24e56347ddfb38878137ba43c7e84729acf811c87` und ist identisch mit dem in die Studio-Seite eingebetteten PNG, geprüft am 2026-10-21.

Sie ersetzt das frühere SVG-Symbol eines „B“ mit Wellen, das nicht das Bricohams-Logo war. Das Logo wird weder neu gezeichnet noch durch eine erfundene Markenvariante ersetzt.

Verwendungsregeln:

- Nicht verzerren, beschneiden, umfärben oder mit Schatten versehen. Den ursprünglichen Hintergrund und das Seitenverhältnis 1200:446 mit `height: auto` beibehalten.
- Seitenleiste: vollständiges Bild mit 166 px Breite (auf den verfügbaren Platz begrenzt); mobil 128 px mit Untertitel daneben. Die Marke auf kleinen Bildschirmen nicht ausblenden.
- README: 240 px breit bei proportionaler Höhe. Favicons und die Linux-Desktopverknüpfung verwenden dasselbe PNG; es gibt keine genehmigte quadratische Variante.
- Zwischen Bild und Untertitel mindestens 10 px auf dem Desktop und 14 px mobil lassen. Diese Maße sind Layoutentscheidungen des Projekts, keine zusätzlichen offiziellen Markenvorgaben.
- Nicht so mit Logos von OpenGD77, Quansheng, F4HWN oder grid.radio kombinieren, dass eine Zugehörigkeit suggeriert wird.

Am 25-10-2026 angeforderte firmwarespezifische Ausnahme: Das monochrome
LCD erfordert eine proportionale Anpassung des Originals auf 128 × 48,
ohne Farbe und auf leerem Hintergrund, mit `Bricohams BETA` darunter.
Sie wird aus dem ursprünglichen PNG erzeugt; es wird kein neues
Markenzeichen gezeichnet. Sie ersetzt nicht das farbige PNG auf Web
oder Android. Erstellung und Grenzen im
[Firmwareleitfaden](BRICOHAMS-FIRMWARE.md#boot-branding-implementiert).

## Farbpalette

Offizielles BricoHams-Farbhandbuch v1.1 (03.11.2026), PDF
`BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`
(nicht im Repository enthalten). Es ersetzt alle früheren Paletten
(`#f7941d`, `#F26B21`, `#a64b00`, `#0b1418`, `#0e1420`, `#111d22`, `#172131`,
`#89b9ff`, `#205da8`, `#0A2540` und `#FF6B00`), die nicht wieder verwendet werden dürfen.

Die Auswahl Darstellung bietet System, Hell und Dunkel; sie wird in
`localStorage` gespeichert und vor dem Rendern als `data-theme` auf `<html>` gesetzt.
Android folgt dem Systemmodus (`res/values/colors.xml` und
`res/values-night/colors.xml`). Zustände behalten immer ausdrücklichen Text.

Beide Themes: `--brand-ink` `#23272B` (Graphit), `--brand-orange` `#F26B1D`
(CTA und Details) und `--on-accent` `#23272B` (Text auf Orange).

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Hintergrund |
| `--surface` | `#F6F7F8` | `#1C2329` | Karten und Bereiche |
| `--border` | `#DCE1E5` | `#38434C` | Ränder |
| `--text` | `#23272B` | `#F6F8FA` | Haupttext |
| `--text-muted` | `#59636B` | `#BAC4CC` | Sekundärtext |
| `--link` | `#AA410B` | `#FFA06A` | Links und Akzenttext |
| `--focus` | `#F26B1D` | `#FFC18F` | 3-px-Kontur `:focus-visible` |

Regeln (WCAG 2.2 AA):

- Primäre Schaltfläche: orangefarbener Hintergrund `#F26B1D` mit graphitfarbenem Text `#23272B` in beiden Themes. Nie weißer Text auf Orange (3,05:1).
- Das Orange `#F26B1D` wird nicht als kleiner Text auf Weiß verwendet; im hellen Theme gilt `#AA410B`.
- Logo: nur das Original-PNG, ohne Filter oder Invertierung; im dunklen Theme auf einer dezenten weißen Platte mit abgerundeten Ecken.
- Typografie: Inter für die Oberfläche und Montserrat 700-800 für große Überschriften, mit dem Systemschrift-Stack als Rückfall und ohne Nachladen externer Schriften.
- Zustände (Erfolg/Warnung/Fehler): funktionale Farben mit AA-Kontrast in beiden Themes; sie ersetzen nie das Orange der CTA.
- Nur Druck: Pantone 426 C (Graphit) und 165 C (Orange; 158 C als Alternative). Es sind keine Bildschirmfarben.
- Firmware mit monochromem LCD: Startlogo und Zeichenkette „Bricohams“, ohne Farben.

| Paar | Hell | Dunkel |
| --- | --- | --- |
| Text / Hintergrund | 14,6:1 | 17,0:1 |
| Sekundärtext / Hintergrund | 5,9:1 | 10,4:1 |
| Link / Hintergrund | 6,5:1 | 8,5:1 |
| Graphit auf Orange (Schaltfläche) | 4,9:1 | 4,9:1 |
| Orange / Hintergrund (nicht textlich) | 3,05:1 | 6,03:1 |
| Weiß auf Orange (verboten) | 3,05:1 | 3,05:1 |

Die Werte sind Näherungen (nach der WCAG-Formel berechnet); die automatischen
Tests jeder Plattform prüfen das Minimum von 4,5:1 für Text.

## Aufbau

- Feste obere Leiste: Verbindungsstatus (Kopie von `#radio-status`), Moduskennzeichen (`#mode-badge`) und Schaltfläche „⌁ Verbinden“, die die Schaltfläche im Abschnitt auslöst und zusammen mit ihr deaktiviert wird.
- Seitenleiste: Logo, Navigation und auf Funkgeräteseiten nummerierte Schritte (0 Sicherungen und Verbindung … 4 Firmware), die zum jeweiligen Abschnitt führen.
- Beschriftung über dem Titel: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typografie

Systemschrift (`system-ui`, Segoe UI, Roboto…), keine externen Webfonts, um die CSP einzuhalten und keine Ressourcen Dritter zu laden.

## Sprache

- Klares, technisches und ehrliches Spanisch: Grenzen werden vor Versprechen erklärt.
- Direkte Sicherheitswarnungen: was schiefgehen kann und was zu tun ist.
- Keine Behauptung ungeprüfter Kompatibilität oder Funktionen.
- Quellenangaben für Daten sind stets sichtbar.
