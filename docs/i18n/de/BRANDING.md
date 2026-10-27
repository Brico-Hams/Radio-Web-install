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
- Seitenleiste: vollständiges Bild mit 178 px Breite (auf den verfügbaren Platz begrenzt); mobil 144 px mit Untertitel daneben. Die Marke auf kleinen Bildschirmen nicht ausblenden.
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

**Am 25-10-2026 angeforderte Änderung:** Die vom Benutzer vorgegebene
Unternehmensfarbe ist **Orange**. Die unten aufgeführte blaugrüne Palette
beschreibt die aktuelle Webimplementierung, nicht das angestrebte
Erscheinungsbild. Android verwendet bereits `#FF9800` als Themenakzent;
das belegt weder Kontrast noch Bedienbarkeit aller Bedienelemente und Geräte.
Die endgültige Umstellung der Weboberfläche auf Orange erfolgt nach
Fertigstellung und Test der Funktionen in der gewünschten Reihenfolge.
Exakter Farbton und Kontraste müssen vor dem Ersetzen der Tokens geprüft
werden; das Originallogo nicht umfärben und Zustände nicht nur durch Farbe
vermitteln.

Von Bricohams Studio inspirierte Oberfläche: dunkler Hintergrund, Karten und blaugrüner Akzent. Die folgende Palette gehört zu Radio Workspace; sie behauptet weder eine exakte Übereinstimmung mit den Studio-Farben noch eine Umfärbung des Logos.

| Token | Farbe | Verwendung | Kontrast (AA) |
| --- | --- | --- | --- |
| `--bg` | `#0b1418` | Hintergrund | — |
| `--panel` | `#111d22` | Karten und Bereiche | — |
| `--line` | `#1f3238` | Ränder | dekorativ |
| `--text` | `#e6f1f2` | Haupttext | 16,2:1 auf Hintergrund; 14,9:1 auf Bereich |
| `--muted` | `#8fa7ab` | Sekundärtext | 7,4:1 auf Hintergrund; 6,8:1 auf Bereich |
| `--accent` (`--mint`) | `#2bb3a3` | Akzent, Fokus und Erfolgszustände | 7,2:1 auf Hintergrund; 6,6:1 auf Bereich |
| `--blue` | `#89b9ff` | Links und sekundärer Akzent | 8,5:1 auf Bereich |

Text primärer Schaltflächen: `#042420` auf der Akzentfarbe (6,3:1).

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
