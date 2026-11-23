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

Die Bandliste ist auf die Bänder beschränkt, auf denen das Funkgerät laut Repository-Daten senden kann: Icom IC-705 und IC-9700 (Bandpläne aus `FREQUENCY_RANGES.md`), Yaesu FTX-1 (14 Bänder aus `third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml`), TH-D75 (Bereiche von Band A), OpenGD77 (Standardgrenzen, weder Bandplan noch Genehmigung), Quansheng und AnyTone. truSDX und QMX haben nur den CAT-Abstimmbereich (keine TX-Grenzen). Hat ein Funkgerät keine TX-Daten im Repository (z. B. TK11), wird «pendiente de fuente» angezeigt.

## SWR vom Funkgerät messen

Die App sendet nie selbst: Sie senden, und das Messinstrument wird nur gelesen, solange das Funkgerät TX meldet. Die Punkte (Frequenz, SWR) werden wie ein importiertes CSV über die Modellkurve gelegt. Am Desktop wird die Remote-Station verwendet (`GET /api/remote/swr`) oder, für das FTX-1, direktes Web Serial (nur lesend `TX;`, `FA;` und `RM6;`); unter Android liest der Antennenbildschirm (WebView ohne Netz, strenge CSP) das Profil-Funkgerät per CAT. Senden Sie nie ohne angepasste Last oder Antenne.

| Funkgerät | SWR-Messinstrument per CAT | Quelle |
| --- | --- | --- |
| Icom IC-705 | ok | CI-V `15 12` (IC-705-CI-V-Referenzhandbuch S. 5) und TX `1C 00` (S. 15); `rigs/ic705.toml` |
| Icom IC-7300 | teilweise (Skala bis SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300.toml`) |
| Icom IC-7300MK2 | teilweise (Skala bis SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300mk2.toml`) |
| Icom IC-7610 | teilweise (Skala bis SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7610.toml`) |
| Icom IC-9700 | teilweise (Skala bis SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic9700.toml`) |
| Icom IC-905 | teilweise (Skala bis SWR 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic905.toml`) |
| Icom IC-7100 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7200 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7410 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7600 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7700 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7760 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7800 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-7850 / IC-7851 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-9100 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Icom IC-R8600 | pendiente de fuente | nur Empfänger, sendet nicht |
| Yaesu FTX-1 | teilweise (ungefähre Skala) | `RM6;` in `docs/FTX1-KNOWLEDGE.md` |
| Yaesu FT-710 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FT-991A | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FTDX10 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FTDX101D | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FTDX101MP | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FTDX3000 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FT-817 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FT-818 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FT-857 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Yaesu FT-897 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Kenwood TS-590S | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Kenwood TS-590SG | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Kenwood TS-890S | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Kenwood TS-990S | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Kenwood TH-D75 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Elecraft K3S | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Elecraft K4 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-6400 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-6400M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-6600 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-6600M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-6700 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-8400 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-8400M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-8600 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio FLEX-8600M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio AURORA-510 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio AURORA-510M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio AURORA-520 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| FlexRadio AURORA-520M | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| QRP Labs QMX / QMX+ | pendiente de fuente | `SW;` ohne dokumentierte Skala |
| QRP Labs QCX | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| QRP Labs QDX | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| (tr)uSDX | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Hermes Lite 2 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Quansheng UV-K5 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| OpenGD77 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Radtel RT-950 Pro | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| Radtel RT-S10 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| AnyTone D878 | pendiente de fuente | kein SWR-Lesebefehl im Repository |
| TK11 | pendiente de fuente | kein SWR-Lesebefehl im Repository |

Die als teilweise markierten Icom haben nur die dokumentierten Punkte SWR 1,0 bis 3,0 (Rohwert 0 bis 120); ein höherer Rohwert wird verworfen. Der von der Remote-Station gelesene Hamlib-Pegel `SWR` wird bei einem Funkgerät nur angezeigt, wenn Hamlib ihn liefert; das Repository dokumentiert nicht, welche Backends das tun, daher bleiben die obigen Funkgeräte «pendiente de fuente».
