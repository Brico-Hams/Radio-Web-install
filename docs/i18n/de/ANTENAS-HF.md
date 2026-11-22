# HF/VHF-Drahtantennen: Entwurf und Analyse

Seite **Antennen** der Anwendung. Sie ergänzt die [Satellitenantennen](ANTENAS-SATELITE.md) und nutzt denselben Momentenmethoden-Löser (`hardware/antenas/mom.py`), nach JavaScript portiert in `antenna-core.js`. Alles wird im Browser berechnet und funktioniert offline.

## Grenzen und Sicherheit

- Es handelt sich **nur um Simulation**: ideale Leiter, dünner Draht und keine ohmschen Verluste.
- Es gibt keinen verlustbehafteten Boden: Die Höhe über Grund wird im freien Raum oder mit einer perfekten Erdebene (Spiegelbild) bei z = 0 modelliert.
- Prüfe die Antenne vor dem Senden immer mit einem Analysator.
- Sende nie ohne angepasste Antenne oder Last.
- Werte für Traps, Balun und Koax gibt der Benutzer ein; es gibt keine Kabeldatenbank.

## Funktionen

| Funktion | Was sie tut | Herkunft der Zahlen |
| --- | --- | --- |
| Geometrie | 2D/3D-Ansicht, editierbare Draht- und Lasttabellen | Benutzerdaten |
| Wobbelung und Abstimmung | SWR, R, X, Smith-Diagramm und Nelder-Mead-Abstimmung auf minimales SWR | Momentenmodell |
| Strahlung | Azimut- und Elevationsschnitte, 3D-Diagramm, Gewinn in dBi und Ströme | Momentenmodell |
| Anpassung | Balun 1:1, 1:2, 1:4, 1:6, 1:9, L-Netzwerk und Koax | Leitungs- und Schaltungsformeln |

## Vorlagen und Traps

Es gibt Vorlagen für einen Halbwellendipol, einen Inverted-V und einen Mehrband-Trapdipol (2 bis 5 Bänder und bis zu 8 parallele LC-Traps). Lege C fest, um L zu berechnen, oder L, um C zu berechnen, mit der Resonanz `f = 1/(2π√(LC))`. Jeder Abschnitt beginnt bei c/(4f) ohne erfundene Verkürzungsfaktoren: Nutze den Berater und die automatische Abstimmung.

## CSV-Format der Messung

Die Datei des Analysators kann Spalten für Frequenz und SWR oder für Frequenz, R und X enthalten. Kopfzeile, Einheiten Hz, kHz oder MHz, Trennzeichen (Komma, Semikolon oder Tabulator) und Dezimalkomma werden erkannt. Beispiel: `frecuencia;swr`.

## Bänder pro Funkgerät

Die Bandliste ist auf die Bänder beschränkt, auf denen das Funkgerät laut Repository-Daten senden kann: Icom IC-705 und IC-9700 (Bandpläne aus `FREQUENCY_RANGES.md`), OpenGD77 (Standardgrenzen, weder Bandplan noch Genehmigung), Quansheng und AnyTone. Hat ein Funkgerät keine TX-Daten im Repository, wird «pendiente de fuente» angezeigt.
