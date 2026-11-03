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

Neugestaltung vom 28.10.2026: Bricohams-Orange, neutrale Flächen und klar
gegliederte Karten. Website und Installationspakete verwenden dasselbe Design.
Darstellung bietet System, Hell und Dunkel; die Auswahl wird lokal ohne Konto
gespeichert und folgt im Systemmodus den Systemeinstellungen. Die Hilfe nutzt
dieselbe Auswahl. Android passt seine nativen Bedienelemente an das System an.
Das Originallogo bleibt unverändert. Zustände behalten immer ausdrücklichen Text.

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Hintergrund |
| `--surface` | `#F6F7F8` | `#1C2329` | Karten und Bereiche |
| `--text` | `#23272B` | `#F6F8FA` | Haupttext |
| `--text-muted` | `#59636B` | `#BAC4CC` | Sekundärtext |
| `--border` | `#DCE1E5` | `#38434C` | Ränder |
| `--link` | `#AA410B` | `#FFA06A` | Links |
| `--focus` | `#F26B1D` | `#FFC18F` | Fokusring |
| `--brand-orange` | `#F26B1D` | `#F26B1D` | Bricohams-Orange |
| `--on-accent` | `#23272B` | `#23272B` | Text auf Orange |

Maßgebliche Quelle: das offizielle Farbhandbuch `BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`, das nicht im Repository enthalten ist. Das Markengrafit ist `--brand-ink`. Das Thema wird mit `data-theme` am Wurzelelement und `localStorage` angewendet.

Primäre Schaltflächen: Text `--on-accent` auf `--brand-orange: #F26B1D` in beiden Themes, nie Weiß auf Orange. Orange wird nicht als kleiner Text auf hellem Hintergrund verwendet. Sichtbarer Fokus mit `outline: 3px solid var(--focus)`. Hauptbedienelemente mit 44 px, intern scrollende Tabellen, horizontale mobile Navigation und Animationen nur ohne angeforderte Bewegungsreduktion.

Berechneter WCAG-2.1-Kontrast (mindestens 4,5:1 für Text und 3:1 für den Fokusring):

| Paar | Hell | Dunkel |
| --- | --- | --- |
| `--text` / `--bg` | 15,0 | 17,2 |
| `--text` / `--surface` | 14,0 | 14,9 |
| `--text-muted` / `--bg` | 6,1 | 10,3 |
| `--text-muted` / `--surface` | 5,7 | 9,0 |
| `--link` / `--bg` | 6,0 | 9,2 |
| `--link` / `--surface` | 5,6 | 7,9 |
| `--on-accent` / `--brand-orange` | 4,9 | 4,9 |
| `--focus` / `--bg` | 3,05 | 11,6 |

Logo: nur das Original-PNG, nie gefiltert oder invertiert; im dunklen Modus liegt es auf einer dezenten weißen Platte (`--plate`). Fehler- und Warnzustände behalten ausdrücklichen Text und erfüllen AA in beiden Themes.

## Aufbau

- Feste obere Leiste: Verbindungsstatus (Kopie von `#radio-status`), Moduskennzeichen (`#mode-badge`) und Schaltfläche „⌁ Verbinden“, die die Schaltfläche im Abschnitt auslöst und zusammen mit ihr deaktiviert wird.
- Seitenleiste: Logo, Navigation und auf Funkgeräteseiten nummerierte Schritte (0 Sicherungen und Verbindung … 4 Firmware), die zum jeweiligen Abschnitt führen.
- Beschriftung über dem Titel: `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typografie

`Inter` für die Oberfläche und `Montserrat` 700–800 für große Überschriften, mit Rückfall auf Systemschriften (`system-ui`, Segoe UI, Roboto…). Es werden keine externen Webfonts geladen, um die CSP einzuhalten und offline zu funktionieren.

## Sprache

- Klares, technisches und ehrliches Spanisch: Grenzen werden vor Versprechen erklärt.
- Direkte Sicherheitswarnungen: was schiefgehen kann und was zu tun ist.
- Keine Behauptung ungeprüfter Kompatibilität oder Funktionen.
- Quellenangaben für Daten sind stets sichtbar.
