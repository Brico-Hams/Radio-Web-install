# Yaesu-FTX-1-Wissen: Forschungsreferenz

## Einführung und Sicherheitslegende

Dieses Dokument fasst zusammen, was aus 22 öffentlichen Repositories über das
Yaesu FTX-1 gelernt wurde (CAT-Befehle, USB, Speicher, Firmware, Hardware,
Satelliten und Remote-Architekturen), und vergleicht es mit dem, was Bricohams
bereits leistet. Es ist Referenzmaterial: Es ersetzt weder das offizielle
Yaesu-Handbuch „CAT Operation Reference Manual“ noch die Benutzerhilfe
`docs/AYUDA-FTX1.md`.

Wo die Quellen liegen: Jedes Repository ist unverändert in
`third_party/ftx1/<carpeta>` geklont. Die Tabelle mit URL, Commit und Lizenz
jedes einzelnen steht in `third_party/ftx1/SOURCES.md`. Die Zitate werden als
`[carpeta:ruta]` geschrieben, wobei der Ordner unter `third_party/ftx1/` liegt.
Die Zitate `[SOURCES.md]` verweisen auf `third_party/ftx1/SOURCES.md`.

Sicherheitslegende. Diese Kennzeichnungen markieren Zeilen und Absätze:

- **ESCRIBE EN LA RADIO**: speichert Daten, die im Funkgerät erhalten bleiben
  (Speicher, Menü, Uhr, Zustand), oder ändert den Zustand des Funkgeräts.
- **REGION/LIMITES TX**: ändert oder betrifft die Bänder oder die Leistung, mit
  denen das Funkgerät senden darf.
- **CALIBRACION**: berührt Werkskalibrierdaten.
- **FIRMWARE**: liest, bereitet vor oder lädt Firmware.

Dieses Projekt automatisiert nie etwas, das mit **REGION/LIMITES TX**,
**CALIBRACION** oder **FIRMWARE** markiert ist. Es automatisiert auch keine
Sendevorgänge (PTT, CW, Antennentuner). Alles mit **ESCRIBE EN LA RADIO**
Markierte, das das Werkzeug dennoch anbietet (Speicher, Menü), verlangt vorher
Lesen, Sicherung, Simulation und Prüfung durch erneutes Lesen.

Notation: Die Befehle sind ASCII und enden mit `;`. `P1` ist die Seite: 0 =
MAIN, 1 = SUB, sofern nicht anders angegeben. `?;` ist die Ablehnung des
Funkgeräts. „Nur Setzen“ bedeutet, dass es weder Lesen noch Antwort gibt. CAT
erfordert MAIN-Firmware 1.08 oder neuer
[gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Es wurden drei
Revisionen des CAT-Handbuchs gesehen: 2306, 2507(-B) und 2508-C
[captobie-ftx1-remote:ftx1-cat-manual-errata.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md]. Das Handbuch
2508-C hat 89 Befehlsfamilien im Index (90 mit `EO`, das nur in der
Detailtabelle steht) und 580 Detailzeilen, davon 427 für `EX`
[rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].

Kein untersuchtes Repository enthält Code, der Firmware schreibt, Region oder
TX-Grenzen ändert (außer dem Regionswerkzeug aus Abschnitt 5 und den
Leistungsmenüs `PC`/`EX`) oder Kalibrierung schreibt. Von der Firmware wird nur
die Version mit `VE` gelesen.

## CAT-Befehlsreferenz

Die Widersprüche zwischen den Quellen und die Fehler des Handbuchs bleiben in der
Spalte Notizen erhalten. Die Zeilen mit **ESCRIBE EN LA RADIO** ändern Daten, die
erhalten bleiben. Die TX-Zeilen (`TX`, `MX`, `KY`) und die zum Starten des Tuners
(`AC`) aktivieren den Sender: Dieses Projekt verwendet sie nicht.

| Befehl | Setzen | Lesen | Antwort | Parameter | Notizen | Quellen |
|---|---|---|---|---|---|---|
| AB | `AB;` | - | - | Kopiert MAIN nach SUB | Nur Setzen. Rigplane nennt es „M=S equalize“; es ist keine VFO-A/B-Operation | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| AC | `AC P1 P2 P3;` | `AC;` | `AC P1 P2 P3;` | P1 0 intern/1 extern; P2 0 ATU, 2 ATAS; P3 0 OFF, 1 ON, 3 START (2 reserviert) | P3=3 startet den Tuner und **sendet**. Am Funkgerät geprüft: P1=0 tut bei einem Optima nichts, P1=1 funktioniert. Formen: intern `AC003;`/`AC000;`, extern `AC103;`/`AC100;`, ATAS `AC123;`/`AC120;`; ATAS lehnt alles außer `AC12x` ab; `AC;` kann am Ende ungleich null bleiben (PO wird überwacht); **am Funkgerät gemessen bei einem ATAS-Abgleich: `AC100` während des gesamten Abgleichs** (das Funkgerät meldet es, ohne dass der Bediener es ändert; Konsole: keine Bedieneränderung); Antenne `EX030704;`, Tunertyp `EX030701;`/`EX030702;`. **ESCRIBE EN LA RADIO** (Zustand) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| AG | `AG P1 nnn;` | `AG P1;` | `AG P1 nnn;` | AF-Verstärkung, 3 Ziffern, 000-255 | Verwendet von gnfrazier, rigplane, WebUI, iTracMan und SEM | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| AI | `AI0;`/`AI1;` | `AI;` | `AI s;` | Automatische Information OFF/ON | Keine Quelle beschreibt das Format der unaufgeforderten Nachrichten; die Apps fragen ab, statt sich auf AI zu verlassen. Siehe Abschnitt 3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| AM | `AM;` | - | - | Speichert den Zustand von VFO-A MAIN im gewählten Speicherkanal (ohne Kanalargument) | Nur Setzen. Speichert Ton/CTCSS, Betriebsart und Ablage (MW nicht). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| AO | Lesen/Setzen | ja | - | AMC-Ausgangspegel 001-100 (ITM: `AOnnn`) | In rigplane nicht implementiert | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| BA | `BA;` | - | - | Kopiert SUB nach MAIN | Nur Setzen | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| BC | `BC P1 s;` | `BC P1;` | `BC P1 s;` | Auto-Notch (DNF) OFF/ON pro Seite | SUB-Form am Prüfstand getestet | [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| BD | `BD P1;` | - | - | Band abwärts | Ohne Antwort. Rigplane sendet `BD0;`; WebUI und POK `BDv;` | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BI | `BI s;` | `BI;` | `BI s;` | Break-in OFF/ON | EUG liest den Zustand am Offset 2 | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| BM | `BM;` | - | - | Speichert den Zustand von VFO-B SUB im gewählten Speicher | Nur Setzen. Speichert den echten SUB-VFO (kann den Kanal beschädigen, z. B. bei 144 MHz hängen geblieben). **ESCRIBE EN LA RADIO** | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| BP | `BP P1 P2 nnn;` | `BP P1 P2;` | `BP P1 P2 nnn;` | Manueller Notch. P2=0: Zustand 000/001; P2=1: Frequenz 001-320 (x10 Hz = 10-3200 Hz) | Das Handbuch hat keinen Befehl für die Notch-Breite. Die Antwort kann in Betriebsarten ohne Notch (FM) nicht numerisch sein (`BP01F35;`). SUB-Form `BP10`/`BP11` | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| BS | `BS P1 nn;` | Lesen liefert `?;` | - | Bandwahl, nn 00-14 (gnfrazier: 5=14 MHz, 6=18, 7=21, 8=24.5, 9=28, 10=50 MHz) | Nur Schreiben. **Widerspruch**: PR2EM, ITM, POK und RZO verwenden es; die Notizen von WebUI sagen, dass das Funkgerät (und sein Mock) es ablehnt. PR2EM: Das 11-m-Band hat keinen Code und sendet `FA027555000;` + `MD02;`. RZO verwendet `BS113` | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [rzochowski-cat-ftx1:cat-presets.json] |
| BU | `BU P1;` | - | - | Band aufwärts | Ohne Antwort | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] |
| CF | `CF P1 0 0 rx tx 000;` (Clarifier ein/aus); `CF P1 0 1 +/-nnnn;` (Ablage) | `CF P1 00;` / `CF P1 01;` (rigplane `CF000;`/`CF001;`) | `CF P1 0 P3 ...;` (11 Zeichen) | P3 0 = CLAR-Einstellung, 1 = CLAR-Frequenz; Ablage +/-0000-9999 Hz (die Doku von gnfrazier sagt +/-9995; ew1abz-memory +/-9990 in Speichern) | ew1abz-control verwendet dieselben zwei Formen | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| CH | Setzen | - | - | Speicherkanal aufwärts/abwärts | In rigplane nicht implementiert; POK verwendet es | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [pokibon3-FTX1Controller:js/ftx1.js] |
| CN | `CN P1 P2 ppp;` | `CN P1 P2;` | `CN P1 P2 ppp;` | P2 0 = CTCSS (ppp 000-049, Index einer Tabelle mit 50 Tönen), 1 = DCS (000-103, 104 Codes) | Index: 00=67.0 ... 12=100.0 ... 49=254.1 Hz (vollständige Tabelle bei fritzsche). MW ignoriert CN; CN vor AM setzen. Rigplane implementiert nur CTCSS | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:rigs/ftx1.toml] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| CO | `CO P1 P2 nnnn;` | `CO P1 P2;` | `CO P1 P2 nnnn;` | P2 0 = Contour ein/aus, 1 = Contour-Frequenz, 2 = APF ein/aus, 3 = APF-Frequenz | Rigplane verwendet `CO00/CO02/CO03`. EUG verwendet `CO02;`/`CO020000;`/`CO020001;` als APF-Schalter | [rigplane-rigplane-core:rigs/ftx1.toml] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| CS | `CS s;` | `CS;` | `CS s;` | CW-Spot | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| CT | `CT P1 P2;` | `CT P1;` | `CT P1 P2;` (das echte Funkgerät antwortet mit einstelligem P2) | P2 0 OFF, 1 TONE (ENC ein/DEC aus), 2 TSQL (ENC+DEC), 3 DCS, 4 PR FREQ, 5 REV TONE | **Weicht von den Codes 1 und 2 von P8 in MW/MR ab (vertauscht)**, siehe Abschnitt 4 | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] |
| DA | Lesen/Setzen | `DA;` | - | Kontrast 00-20 und TFT/LED-Helligkeit 00-20. Das Setzen ist kombiniert (`DA00` + drei 2-stellige Werte), man muss vorher lesen und mischen | Absichtlich nicht öffentlich in rigplane. captobie listet es unter den verwendeten Befehlen | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| DN | Setzen | - | - | MIC DOWN | Die Titel in Index und Detail unterscheiden sich | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| DT | `DT0 yyyymmdd;` / `DT1 hhmmss;` | Lesen | - | Datum und Uhrzeit | In rigplane nicht implementiert. **ESCRIBE EN LA RADIO** (Uhr) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| EO | Setzen | - | - | Encoder-Offset, 6 Selektoren (MAIN/SUB/beide x Hauptdrehknopf/FUNC, +/-, Hz/kHz/MHz) | Hat eine Detailseite, aber keinen Eintrag im Index | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| EX | `EX P1P2P3 P4;` (Menüadresse + Wert) | `EX P1P2P3;` | `EX P1P2P3 P4;` | 427 Menüadressen; die Breite von P4 variiert je nach Element. Bekannt: `EX010413` MOD SOURCE DATA, `EX010113` SSB, `EX010514/15` RTTY-Mark/Shift, `EX010417` PSK-Ton von DATA, `EX0202 05+n` CW-Speichertyp, `EX020203` CW weight, `EX060103` APRS AF MUTE, `EX030204` SCAN RESUME, `EX050201` MY POSITION Breitengrad, `EX030604/05/06` CH-STEP je Betriebsart | **ESCRIBE EN LA RADIO** (Menü). Am Funkgerät geprüfte Fehler: `EX020203` P4 ist die Abweichung gegenüber 2.5 in Schritten von 0.1 (00=2.5, 20=4.5); `EX040107` AUTO POWER OFF 2 Ziffern, 00=OFF, 01-24 = 0.5-12 h; `EX010322` DCS CODE braucht 3 Ziffern 000-103; `EX030503` HF MAX POWER maximal 100 W ganzzahlig (**REGION/LIMITES TX**); `EX030504` 50M MAX POWER 005-100 (vermutet); der Block `EX05xx` legt MY POSITION auf P2=02 und SD CARD, SOFT VERSION, **CALIBRACION** und RESET auf P2=03-06; `EX050109` antwortet `?;`. Nur vermutet: Unstimmigkeiten zwischen den P1/P3-Bereichen des Handbuchs und der Tabelle 3 (OS, RPT SHIFT, SPEED UNIT, WIND UNIT, ANT2, RF-SQL VR, TUN-LIN, MOD SOURCE, MIC-Liste, FM DIAL STEP, DTMF-Anzahl). Direktes Schreiben von EX kann CAT-Geschwindigkeit, Stoppbit, Timeout oder TUN/LIN-Port ändern (die Wiederherstellung von PR2EM lässt sie aus). SEM ordnet die Antwort der 8-stelligen Adresse zu. Die Aktionselemente des Katalogs (CALIBRACION, RESET) werden nie gesendet | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/menu.py] [Semyonic-ftx1-programmer:src/cat/transport.ts] [pokibon3-FTX1Controller:js/exmenu.js] |
| EX01 (audio) | `EX01` + Kategorie 01-05 + Parameter 01-03 + 2-stelliger Wert mit Vorzeichen | Lesen | - | AF-Equalizer je Betriebsart: Höhen/Mitten/Tiefen von -20 bis +10 | Es ist eine konkrete Verwendung von `EX`. **ESCRIBE EN LA RADIO** | [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| FA | `FA fffffffff;` | `FA;` | `FA fffffffff;` | MAIN-Frequenz, 9 Ziffern in Hz. ITM begrenzt das Setzen auf 30 kHz-470 MHz; RX ab Werk 30 kHz-174 MHz und 400-470 MHz | Verwendet von gnfrazier, bg7nzl, ew1abz-*, PR2EM und WebUI. FB/f Sub ist nicht zuverlässig, wenn MAIN auf einem 6-m-Kanal steht (captobie). PR2EM liest `FA;` nach dem Setzen erneut | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [captobie-ftx1-remote:CLAUDE.md] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| FB | `FB fffffffff;` | `FB;` | `FB fffffffff;` | SUB-Frequenz, 9 Ziffern | Bei Split `ST1` wird FB zum TX-VFO, in der Betriebsart von MAIN. In Look4Sat: FA = Downlink (RX), FB = Uplink (TX) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| FD | nicht dokumentiert | - | unaufgefordert | Der erste Parameter ist die Scope-Seite | Unaufgeforderte Nachricht, die `SS`-Abfragen auslöst (laut einem Kommentar von RZO) | [rzochowski-cat-ftx1:serial-server.mjs] |
| FN | Lesen/Setzen | ja | `FN;`/`FN d;` | Fine Tuning OFF/ON/Fast | In rigplane nicht implementiert. POK verwendet es als FUNC-Zuordnung | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] [pokibon3-FTX1Controller:js/ftx1.js] |
| FR | `FR nn;` | `FR;` | `FR nn;` | 00 = Dual-Empfang, 01 = Einzel-Empfang (POK: `FR0v;`) | Zustand der Empfängerfunktion | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| FS | (FT-991A) | - | - | Nur im FT-991A-Profil von POK | Gehört nicht zum FTX-1 | [pokibon3-FTX1Controller:js/ft991a.js] |
| FT | `FT v;` | `FT;` | `FT v;` | Wählt den Sender MAIN/SUB (0/1) | Gibt keine Sendeerlaubnis. `SC<lado>1` verschiebt VS/FT. In Look4Sat aktiviert die Wahl von SUB das PTT nicht | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| GP | Lesen/Setzen | ja | - | Vier 5-V-CMOS-Ausgänge LOW/HIGH | In rigplane nicht öffentlich. **ESCRIBE EN LA RADIO** (physische Ausgänge) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| GT | `GT P1 P2;` | `GT P1;` | `GT P1 P3;` | Setzen P2: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO. Antwort P3: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO-FAST, 5 AUTO-MID, 6 AUTO-SLOW | Setzen und Antwort verwenden unterschiedliche Kodierungen (Handbuch); die Antworten 4/5/6 bedeuten AUTO. `GT0` ohne Antwort in C4FM | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| ID | - | `ID;` | `ID0840;` | Feste Modell-ID 0840 | Validiert von ew1abz-*, rigplane und RZO. POK nennt `0800` in einem Kommentar als alte ID; sein FT-991A-Profil verwendet `0570`/`0670` | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| IF | - | `IF;` | `IF` + Kanal(5) + Frequenz(9) + Clar-Vorzeichen(1) + Clar(4) + RX-Clar(1) + TX-Clar(1) + Betriebsart(1) + VFO/Speicher(1) + Ton(1) + `00` + Shift(1) + `;` (30 Zeichen) | Zusammengesetzter Zustand von MAIN; gleiches Format wie MR | Das Prüfstand-Funkgerät antwortete mit Shift `3` (der IF-Abschnitt des Handbuchs dokumentiert es nicht; OS dokumentiert 3 = ARS). Es gibt kein Feld für PTT oder Split | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| IS | `IS P1 0 +/-nnnn;` | `IS P1;` | `IS P1 0 +/-nnnn;` | IF-Shift +/-0000-1200 Hz in Schritten von 20 | Eigenheit: P2 muss `0` sein; das `1` von Hamlib wurde vom Funkgerät abgelehnt | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KM | `KM n texto;` | `KM n;` | - | Tastenspeicher 1-5, bis zu 50 Zeichen | Das Funkgerät hängt `}` selbst an; mehr als 50 ergibt `?;`; `KM<n>;` ist ein Lesen (ein Platz lässt sich nicht leeren). Zeichen A-Z 0-9 `/ ? , . = + - ( ) @ :`; Prosigns `=` BT, `+` AR, `(` KN. SEM: Der Text darf weder `}` noch `;` enthalten. **ESCRIBE EN LA RADIO**. Index und Detail mit unterschiedlichen Titeln | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| KP | `KP nn;` | `KP;` | `KP nn;` | Index des CW-Tons, 2 Ziffern 00-75 = 300 + 10n Hz | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KR | Lesen/Setzen | ja | - | CW-Keyer OFF/ON (`KR0/1`) | gnfrazier hat `set_cw_keyer` (Zeichenkette nicht gefunden) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| KS | `KS nnn;` | `KS;` | `KS nnn;` | CW-Geschwindigkeit in WPM, 3 Ziffern, 4-60 | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| KY | `KY P1 P2;` | - | - | P1 0 = CW-Speicher TEXT, 1 = CW-Speicher MESSAGE; P2 1-5 spielt ab, 0 stoppt (`KY00` stoppt) | **Sendet**, wenn BK-IN aktiv ist; ein zweites KY startet die Nachricht neu. Es gibt keine KY-Form mit freiem Text: Getipptes CW ist KM auf Platz 5 und danach KY. EUG verwendet `KY ` + Text in Großbuchstaben + `;` | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |
| LK | `LK s;` | `LK;` | `LK s;` | Panel-/Drehknopfsperre OFF/ON | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [rzochowski-cat-ftx1:serial-server.mjs] |
| LM | Lesen/Setzen | ja | - | Aufnahme/Laden von Sprachnachrichten, Kanal/Zustand. `LM0;` wählt den Platz (schärft die Aufnahme); `LM1` nimmt auf die SD auf | Eigenheit: `LM1` nimmt das RX-Audio auf die SD des Funkgeräts auf, es ist keine Wiedergabe. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| MA | `MA;` | - | - | Speicher (mit MC gewählt) nach VFO MAIN | Nur Setzen. Lädt nur die Frequenz (fritzsche: nicht die Töne) | [fritzsche-yaesu-ftx1:cat_format.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MB | `MB;` | - | - | Speicher nach VFO SUB | Lädt einen Anzeigepuffer, nicht den echten VFO-B SUB (ew1abz) | [gnfrazier-ftxcat:ftxcontrol.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] |
| MC | `MC P1 ccccc;` | 2508-C: `MC P1;` (2507-B: `MC;`) | `MC P1 ccccc;` | P1 Seite; Kanal 00001-00999 (auch P-nnL/U, 5 MHz, EMGCH) | Fritzsche nennt MC „6-stellig“ (Seite + 5). Das Handbuch sagt 00001-00099 bei MC und 00001-00999 bei MR/MW/MZ; am Funkgerät geprüft 1-999. Ein leerer Platz lässt sich nicht wählen (der vorherige bleibt ohne Hinweis erhalten). `MC0` vor `VM011`. Laut fritzsche nur Setzen (ohne Antwort) | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [gnfrazier-ftxcat:ftxcontrol.py] |
| MD | `MD P1 m;` | `MD P1;` | `MD P1 m;` | Betriebsarten: 0 = WFM (ew1abz) / „LSB oder FM“ (fritzsche), 1 LSB, 2 USB, 3 CW-U, 4 FM, 5 AM, 6 RTTY-L, 7 CW-L, 8 DATA-L, 9 RTTY-U, A DATA-FM, B FM-N, C DATA-U, D AM-N, E PSK, F DATA-FM-N, H C4FM-DN, I C4FM-VW | **Widerspruch bei `0`**: ew1abz sagt WFM und fritzsche „LSB (oder FM bei einigen Modellen)“. Die Liste von fritzsche lässt E und I aus; bg7nzl und ew1abz enthalten sie. In C4FM antwortet `MD` mit `H`; das Handbuch listet auch `I`. ITM liest den Code `0` als AMS-Sentinel, nicht als Fehler (kein CAT-Befehl zur Wahl von AMS). Das Funkgerät lehnt es während TX ab (Prüfstand von rigplane) | [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py] [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| MG | `MG nnn;` | `MG;` | `MG nnn;` | Mikrofonverstärkung, 3 Ziffern (ITM 0-100) | | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| ML | `ML P1 ...;` | `ML P1;` | - | Monitor: Zustand (P1=0) / Pegel 000-100 (P1=1; WebUI `ML0nnn`) | **Konflikt**: Das Handbuch dokumentiert es; das Live-Funkgerät von rigplane antwortet `?;` und sagt, es werde über das EX-Menü gesteuert | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| MR | - | `MR ccccc;` | `MR` + ccccc + Frequenz(9) + Clar-Vorzeichen(1) + Clar(4) + RX-Clar + TX-Clar + Betriebsart + Typ + Ton + `00` + Shift + `;` (27 Parameter-Bytes, 30 Zeichen) | Liest einen Kanal, ohne ihn zu wählen | Siehe Abschnitt 4. Leerer Kanal ergibt `?;`. `MR00000` liefert im Speichermodus den aktiven Kanal, nicht den VFO | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| MS | Lesen/Setzen | ja | - | Messgeräte-Selektor MAIN/SUB 0-5 (`MS<main><sub>;`) | Wahl des Panel-Messgeräts; rigplane sah `MS35;` mit Auswahl VDD. Nicht öffentlich | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.cs] |
| MT | `MT ccccc tag12;` | `MT ccccc;` | `MT ccccc tag12;` (17 Parameterzeichen) | 12-Zeichen-Name, mit Leerzeichen aufgefüllt; ASCII 0x20-0x7D ohne `;` | **ESCRIBE EN LA RADIO**. Leerer Kanal ergibt `?;` | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| MW | `MW` + 27-Zeichen-Eintrag (siehe MR) + `;` | keine (nur Setzen) | - | Erstellt oder überschreibt einen Kanal | **ESCRIBE EN LA RADIO**. P9 (`00`) muss `00` sein, sonst `?;`. Speichert den Ton NICHT (fällt auf Code 12 / 100.0 Hz zurück). Position 17 muss `+`/`-` sein (`S` gilt nicht; fritzsche). Die Detailtabelle des Handbuchs lässt Lesen/Antwort aus | [fritzsche-yaesu-ftx1:cat_format.md] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MX | `MX P1;` | `MX;` | `MX0;`/`MX1;` | MOX OFF/ON | TX-Aktion; bg7nzl verwendet sie. Rigplane schützt sie mit verwalteter TX-Autorität | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| MZ | `MZ ccccc s fffffffff;` | `MZ ccccc;` | `MZ ccccc s fffffffff;` (15 Zeichen) | s 0 = Split aus, 1 = ein; TX-Frequenz in 9 Ziffern Hz | **ESCRIBE EN LA RADIO**. Split-Speichereintrag; wird nach AM geschrieben | [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| NA | `NA P1 s;` | `NA P1;` | `NA P1 s;` | Narrow OFF/ON (captobie: P1 0 = MAIN, 1 = SUB) | `SH` ändert sich mit NAR in SSB/CW/RTTY/DATA nicht (die tatsächliche Breite ist die Voreinstellung des Menüs NAR WIDTH) | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| NL | `NL P1 nnn;` | `NL P1;` | `NL P1 nnn;` | Noise-Blanker-Pegel OFF/001-010 (mit 3 Ziffern geschrieben; PR2EM und WebUI `NL0nnn;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] |
| OI | - | `OI;` | gleiches Format wie IF | Zusammengesetzter Zustand von SUB (Gegenband) | ew1abz-control verwendet es für die SUB-Frequenz | [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| OS | `OS P1 d;` | `OS P1;` | `OS P1 d;` | d 0 Simplex, 1 Plus, 2 Minus, 3 ARS | **Nur FM-Modus** (in anderen ohne Hinweis ignoriert). Fehler: Die Reihenfolge der OS-Seite und die der Tabelle 3 unterscheiden sich (Tabelle 3: 0 -, 1 Simplex, 2 +, 3 ARS); die App folgt der OS-Seite. Nur Richtung; die Ablage ist ein Wert des EX-Menüs | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] |
| PA | `PA P1 P2;` | `PA P1;` | `PA P1 P2;` | P1 0 = HF/50 MHz, 1 = VHF, 2 = UHF. HF/50: 0 IPO, 1 AMP1, 2 AMP2. VHF/UHF: 0 OFF, 1 ON | Pro Bandgruppe, nicht pro Kanal | [bg7nzl-ftx1ctl:ftx1cat.py] [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| PB | Lesen/Setzen | ja | - | Wiedergabe/Stopp einer Sprachnachricht (`PB0<ranura>;`, `PB00;` stoppt; ITM Plätze 0-5) | **Sendet**, wenn bei aktivem TX abgespielt wird | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PC | `PC P1 nnn;` | `PC;` | `PC P1 nnn;` | P1 1 = Feld-Bedienteil (Handbuch 005-010 W), 2 = SPA-1 (005-100 W) | **REGION/LIMITES TX**. **Widerspruch**: bg7nzl (Prüfstand): Das Bedienteil akzeptiert 001-010 W; rigplane: `PC2000;` ergibt `?;`, Minimum 5 W mit SPA-1. gnfrazier: 5-10 W im Feld, 5-100 W mit SPA-1, mit einem TODO zu Zehntelwatt; WebUI akzeptiert Bruchwerte (`PC10.5;`) und prüft, ob >6 W abgelehnt wird, um auf Akku zu schließen. ITM erkennt das aktive Bedienteil an der Antwort. Fehler: Die Grenze HF MAX POWER gehört zu `EX`, 100 W ganzzahlig | [bg7nzl-ftx1ctl:ftx1cat.py] [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:README.md] [gnfrazier-ftxcat:ftxcontrol.py] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| PL | `PL nnn;` | `PL;` | `PL nnn;` | Pegel des Sprachprozessors 0-100 (echte Spur `PL003;`) | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| PR | `PR P1 s;` | `PR P1;` | `PR P1 s;` | P1 0 = Sprachprozessor, 1 = parametrischer Mikrofon-Equalizer; s OFF/ON | **Fehler (am Funkgerät geprüft)**: Das Handbuch sagt 1 = OFF, 2 = ON; das Funkgerät verwendet 0 = OFF, 1 = ON (ITM: Lesen akzeptiert `0` oder `2` als aus) | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:tests/FTX1WinController.Tests/CatCommandsTests.cs] |
| PS | `PS s;` | `PS;` | `PS s;` | Ein-/Ausschalten | `PS0;` schaltet das Funkgerät aus. EUG sendet es beim Beenden der App; SEM verlangt, dass es „scharf“ ist. **ESCRIBE EN LA RADIO** (Zustand) | [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/MainActivity.java] [Semyonic-ftx1-programmer:src/cat/commands.ts] |
| QI | `QI;` | - | - | Speichert QMB | Nur Setzen. **ESCRIBE EN LA RADIO** | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Vfo.cs] |
| QR | `QR;` | - | - | Ruft QMB ab | Nur Setzen. ITM hat beim Abrufen einen Schutz gegen Race Conditions | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/RadioController.Vfo.cs] |
| QS | `QS;` | - | - | Schneller Split | Nur POK | [pokibon3-FTX1Controller:js/ftx1.js] |
| RA | `RA P1 s;` | `RA P1;` | `RA P1 s;` | HF-Abschwächer (12 dB laut WebUI) | Bei einem Prüfstandstest mit MAIN auf 461.550 MHz abgelehnt (`?;`) | [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| RC | `RC;` | - | - | `reset_clarifier` von rigplane | **In 2508-C nicht dokumentiert** (nur Profilherkunft) | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| RG | `RG P1 nnn;` | `RG P1;` | `RG P1 nnn;` | HF-Verstärkung 000-255 | | [rigplane-rigplane-core:rigs/ftx1.toml] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| RI | - | `RI P1;` | Funkstatus mit 8 Feldern | `RI0` (P7 Scan-Zustand, P8 Squelch); `RI1` antwortet `?;`. PR2EM: 7 Zeichen (HI-SWR[0], rec[1], TX[2], tuning[4], scan[5], busy[6]) | Der Tuner-Sweep verwendet es, um den Tuner zu erkennen (Ziffer 6). **Am Funkgerät gemessen bei einem ATAS-Abgleich: `RI0` mit gleichzeitig aktivem HI-SWR + TX + tuning** (das HI-SWR-Flag zeigt keinen Fehler an, solange der Motor sucht; der Agent ignoriert es bei ATAS und bricht per Zeit ab) | [captobie-ftx1-remote:CLAUDE.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| RL | `RL P1 nn;` | `RL P1;` | `RL P1 nn;` | DNR-Pegel OFF/01-10 (EUG: Form `RL000;`) | | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| RM | - | `RM P1;` | `RM P1 nnn 000;` (rigplane: `RM{tipo}{main:03d}{sub:03d}`) | Messwerte P1 1..8: 1 S-MAIN, 2 S-SUB, 3 COMP, 4 ALC, 5 PO, 6 SWR, 7 IDD, 8 VDD; Wert 000-255 | Roh, unkalibriert. bg7nzl (nur in der PC-Software; nichts wird ins Funkgerät geschrieben, **CALIBRACION** auf Hostseite): VDD ~ roh*13.8/203, IDD roh*3/255, COMP roh*30/255 dB, ALC roh*200/252 %, SWR 1+0.333(e^(0.0151 roh)-1), PO stückweise linear bis 15 W. Rigplane: roh 210 ~ 13.8 V (Prüfstand). Der Index sagt RM Set=X, aber das Detail zeigt eine Zeile `P1=0`. RZO bemerkt Anordnungen mit einem oder zwei Werten. EUG liest `RM8;` alle 5 s, um auf ein 6-W- oder 10-W-Bedienteil zu schließen | [bg7nzl-ftx1ctl:ftx1cat.py] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| SC | `SC P1 m;` | `SC;` liefert den letzten Befehl (z. B. `SC11;`) | - | Scan: m 0 OFF, 1 UP, 2 DOWN | `SC0;`/`SC1;` als Lesen ergibt `?;`. Jeder Stopp beendet beide Scans. `SC<lado>1` verschiebt VS/FT auf diese Seite | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SD | `SD nnnn;` | `SD;` | `SD nnnn;` | Break-in-Verzögerung (ms); 2-stelliger Index: 0-5 = 30/50/100/150/200/250 ms und danach Schritte von 100 ms (6-33 bis 3000 ms) | `VD` verwendet dieselbe Tabelle 00-33 | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| SF | Lesen/Setzen | ja | - | Zuordnung des FUNC-Knopfs (`SF0<perilla>;`) | Nur Frontpanel; RZO und POK verwenden es | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js] |
| SH | `SH P1 0 nn;` (gnfrazier) / `SH P1 nnn;` (rigplane) | `SH P1;` | `SH P1 nnn;` | Filterbreitencode | **Widerspruch** in der Setzen-Zeichenkette: gnfrazier `SH{lado}0{codigo:02d}`; rigplane `SH{rx}{codigo:03d}` (gleiche Ziffern). WebUI `SH00nn;` liest 2 Zeichen an den Offsets 2-3 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:js/cat/ftx1.js] |
| SM | - | `SM P1;` | `SM P1 nnn;` | S-Meter (0-255) | Die SUB-Abfrage liefert immer Seite 0 (`SM1;` ohne brauchbare Antwort; RZO verwendet die VFO-Ziffer des eingereihten Befehls) | [rigplane-rigplane-core:rigs/ftx1.toml] [gnfrazier-ftxcat:ftxcontrol.py] [rzochowski-cat-ftx1:serial-server.mjs] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] |
| SQ | `SQ P1 nnn;` | `SQ P1;` | `SQ P1 nnn;` | Squelch | **Widerspruch**: WebUI sagt 000-100; ITM und SEM 0-255 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [git-jcw-FTX-1-WebUI:docs/FTX1-CAT-NOTES.md] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Dsp.cs] |
| SS | Lesen/Setzen | ja | - | Scope-Einstellungen, 7 Selektoren (Geschwindigkeit/Peak/Marker/Farbe/Pegel/Span/Modus). `SS04+/-dd.d;` D-LEVEL; `SS01` D-PEAK (Ziffer +1); `SS02` Marker; `SS03` Farbe (Hex-Ziffer +1, Farben 1-11 = `0-9,A`) | RZO fragt beim Start `SS04 SS05 SS00 SS03 SS06` ab. PR2EM-A: Schieberegler -60..60 in halben Schritten. In rigplane nicht implementiert | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] [rzochowski-cat-ftx1:serial-server.mjs] |
| ST | `ST s;` | `ST;` | `ST s;` | Split OFF/ON | `ST1` schaltet die Doppelanzeige aus (`FR01`). WebUI vermerkt, dass `ST` auf der Ablehnungsliste seines Mocks steht, und verwendet es nicht; Look4Sat sendet `ST1;`/`ST0;` ohne Antwortauswertung | [gnfrazier-ftxcat:ftxcontrol.py] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] [git-jcw-FTX-1-WebUI:js/cat/mock-radio.js] |
| SV | `SV;` | - | - | Tauscht MAIN/SUB | Nur Setzen. Funktioniert nicht im VFO-/Speichermodus. Bei captobie verschiebt es nur die Audiozuordnung beim Dual-Empfang | [fritzsche-yaesu-ftx1:cat_format.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md] |
| TS | Lesen/Setzen | ja | - | TXW (TX-Überwachung) OFF/ON | Zurückgehalten: nur bei aktivem Split wirksam, aber das Funkgerät echot bei ausgeschaltetem Split. In rigplane durch verwaltetes TX geschützt | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatCommands.Func.cs] |
| TX | `TX0;`/`TX1;` | `TX;` | `TX0` RX, `TX1` TX über CAT, `TX2` TX über das Funkgerät (Panel/Mikro/VOX) | PTT | gnfrazier liest `TX2` als „sendet“. Das Setzen akzeptiert nur 0/1 (captobie). Hamlib `t` liefert 3 für TX2 | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] |
| UP | Setzen | - | - | MIC UP | | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VD | Lesen/Setzen | ja | - | VOX-Verzögerung, Tabelle 00-33, Schritte von 100 ms (je MIC/USB/BLUETOOTH) | In rigplane nicht öffentlich | [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VE | - | `VE P1;` | Version in BCD | P1 0 MAIN, 1 DISPLAY, 2 SDR, 3 DSP, 4 SPA-1, 5 FC-80 | **FIRMWARE**: nur Lesen; nichts wird geschrieben. Nicht verfügbare CPUs werden ausgelassen oder antworten leer | [gnfrazier-ftxcat:ftxcontrol.py] [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| VG | Lesen/Setzen | ja | - | VOX-Verstärkung 000-100 | In rigplane nicht öffentlich | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] |
| VM | `VM P1 pp;` | `VM P1;` | `VM P1 pp;` | pp 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 5-MHz-Band, 91 EMG. fritzsche: `VM000;` VFO; `VM;` Speicher | **Widerspruch**: fritzsche dokumentiert `VM;` als „auf Speicher wechseln“; ew1abz verwendet `VM011;`. `VM011` schlägt stillschweigend fehl, außer man schreibt direkt davor `MC0`. Das Handbuch listet `VM` zweimal (der erste Detaileintrag kopiert AM) | [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md] [fritzsche-yaesu-ftx1:cat_format.md] [captobie-ftx1-remote:ftx1-cat-manual-errata.md] [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md] |
| VS | `VS v;` | `VS;` | `VS v;` | Wählt das TX/RX-Paar MAIN/SUB | Look4Sat verwendet es mit `FT1;`, um SUB als TX zu wählen | [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md] [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt] |
| VX | `VX s;` | `VX;` | `VX s;` | VOX OFF/ON | | [rigplane-rigplane-core:rigs/ftx1.toml] |
| ZI | Setzen | - | - | Automatisches CW-Zero-in pro Seite (`ZI0;`) | In rigplane nicht implementiert | [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv] [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/EcranComenzi.java] |

Weitere CAT-Fakten:

- Es gibt keinen CAT-Befehl für D-COLOR, DG-ID TX/RX, HRI MODE, das Abrufen oder
  Lesen von HOME-Kanälen, MAG und die WIRES-X-Einstellungen
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Es gibt keinen dokumentierten Befehl zum Löschen eines Speicherkanals
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]. Die
  Leistung pro Kanal ist per CAT nicht programmierbar
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].
- Es gibt in 2508-C keinen MAIN/SUB-Tracking-Befehl
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1.md].
- Nicht aufgelöster **Widerspruch**: Das Profil von rigplane verwendet die
  Hamlib-Modell-ID 2028 [rigplane-rigplane-core:rigs/ftx1.toml]; captobie
  verwendet 1051, erstmals in Hamlib 4.7 [captobie-ftx1-remote:CLAUDE.md].
- Nur vermutete Fehler (nicht geprüft): Tippfehler „mesc“, „SYNBOL“, „Bycycle“
  und „LONGTUDE“; die Lage des USB-Anschlusses ist uneinheitlich; das
  CAT-Handbuch erwähnt das USB-Audio nicht
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md].
- Versteckte oder spezielle undokumentierte Befehle (SPR/SPW und andere) stehen
  absichtlich außerhalb dieser Tabelle; siehe Abschnitt 5.
## USB-, serielle und Audioschnittstellen

**Ports (Dual-UART CP210x)**

- Der USB-C-Anschluss stellt einen internen Hub bereit: Silicon-Labs-Dual-UART
  CP2105 (VID 10C4 PID EA70; die zweite serielle Funktion erscheint als
  26AA:0030) und einen USB-Audio-Codec (VID 0D8C PID 0016)
  [rigplane-rigplane-core:rigs/ftx1.toml] [captobie-ftx1-remote:CLAUDE.md].
- Enhanced COM Port = CAT-1 (CAT-Befehle). Standard COM Port = CAT-2 (PTT, CW,
  DATA oder sekundäres CAT)
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Treiber: Silicon Labs Dual CP210x USB to UART Bridge; Windows zeigt „Enhanced
  COM Port (COMx)“ und „Standard COM Port (COMy)“. Linux
  `/dev/ttyUSB0`/`ttyUSB1`; macOS `/dev/tty.SLAB_USBtoUART`; auf dem Pi ist nach
  ID `...CP2105...-if00-port0` CAT und die Schnittstelle 1 der Tastport
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [captobie-ftx1-remote:Pi/README.md].
- bg7nzl wählt für CAT nur den „Enhanced COM Port“ und für PTT den „Standard COM
  Port“ (Standardports im Code COM11/COM12)
  [bg7nzl-ftx1ctl:docs/user_manual_en.md] [bg7nzl-ftx1ctl:ftx1cat.py].
- CAT-3 ist die rückseitige UART TUNER/LINEAR; sie wird für USB nicht benötigt,
  und `TUN/LIN PORT SELECT` sollte auf dem Standardwert bleiben
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/cat-version-diff.md].
- WSL2: `usbipd bind/attach` des CP2105 (10c4:ea70) macht ihn unter Windows
  unbrauchbar [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Unter
  Linux muss man den Benutzer zur Gruppe `dialout` hinzufügen
  [gnfrazier-ftxcat:faq.md].
- Ein Pi mit Unterspannung reißt den USB-Hub des Funkgeräts mit. `cp210x ttyUSB...: failed set request` stoppt die CW-Tastung
  [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md].
- Die Audiodienste scheitern mit „Device or resource busy“, wenn ein anderer
  Client die Soundkarte belegt [captobie-ftx1-remote:Pi/README.md].

**Geschwindigkeit und Rahmenformat**

- Optionen von CAT-1 RATE: 4800, 9600, 19200, 38400, 115200; ab Werk 38400;
  jedes PRESET (5) hat sein eigenes CAT-1 RATE
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Standardmäßig 38400 8N1 bei gnfrazier, bg7nzl, ew1abz-control,
  ew1abz-memory-manipulator, rigplane, PR2EM, ITM, WebUI, SEM, Look4Sat und den
  meisten Android-Apps; EUG verwendet 4800 8N1 am DATA-Port
  [gnfrazier-ftxcat:ftxcontrol.py] [bg7nzl-ftx1ctl:ftx1cat.py]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/config.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [rigplane-rigplane-core:rigs/ftx1.toml] [Eugen68-Yaesu-FTX1-CAT-Control:README.md].
- **Widerspruch**: Die Pi-Konfiguration von captobie setzt CAT-1 auf **115200**
  (`rigctld -s 115200`) [captobie-ftx1-remote:Pi/README.md]; auch RZO empfiehlt
  115200 [rzochowski-cat-ftx1:README.md]; alle anderen 38400. POK probiert 38400,
  4800, 9600, 19200 und 115200 [pokibon3-FTX1Controller:js/serial.js].
- Menüelemente (OPERATION SETTING, GENERAL): `CAT-1 RATE`, `CAT-1 TIME OUT TIMER` (z. B. 100 ms), `CAT-1 CAT-3 STOP BIT` = 1 Bit, `CAT-2 RATE`, `CAT-2 TIME OUT TIMER`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Sie von Hand zu
  ändern ist **ESCRIBE EN LA RADIO**; kein Werkzeug schreibt sie.
- PTT-Schutz durch RTS/DTR an CAT-2 (auf OFF stellen, wenn CAT-2 als CAT mit
  Flusskontrolle verwendet wird): `RADIO SETTING, MODE SSB/AM/FM/DATA/RTTY RPTT SELECT`,
  `CW SETTING, MODE CW RPTT SELECT`, `CW SETTING, PC KEYING`,
  `PRESET, PRESET1-5 RPTT SELECT`
  [gnfrazier-ftxcat:Installation_and_Transceiver_Setup.md]. Das Öffnen des
  Tastports hebt kurz DTR/RTS an
  [captobie-ftx1-remote:Pi/README.md].
- DTR/RTS je nach App (**die Apps stimmen nicht überein**): PR2EM deaktiviert sie
  vor dem Öffnen (sie könnten mit RPTT das PTT aktivieren); WebUI senkt sie (die
  Leitungen von Standard COM können senden); Look4Sat erzwingt falsch; BYF
  aktiviert sie; POK setzt beim FT-991A RTS ein und DTR aus
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/app.py]
  [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt]
  [pokibon3-FTX1Controller:js/ft991a.js].

**PTT-Methoden (nur zur Information; dieses Projekt sendet nicht)**

- CAT `TX1;`/`TX0;` [gnfrazier-ftxcat:ftxcontrol.py]; MOX `MX1;`/`MX0;`
  [bg7nzl-ftx1ctl:ftx1cat.py]; RTS an CAT-2 [bg7nzl-ftx1ctl:ftx1cat.py]
  [bg7nzl-ftx1ctl:docs/user_manual_en.md]; RTS/DTR an CAT-2 für CW
  [captobie-ftx1-remote:docs/cw-protocol.md].
- CW-Relais von captobie: TCP 8534 mit JSON, standardmäßig RTS-Leitung,
  `playoutDelayMs` 300 (20-1000), `heartbeatTimeoutMs` 1000, `maxKeyDownMs`
  5000; verwendet nur CAT-2, nie den CAT-Port von rigctld
  [captobie-ftx1-remote:docs/cw-protocol.md] [captobie-ftx1-remote:CLAUDE.md].

**USB-Audio**

- Codec 0D8C:0016 unter dem internen Hub [rigplane-rigplane-core:rigs/ftx1.toml].
- **Widerspruch** bei den Kanälen: Das Profil von rigplane sagt, das RX-Audio
  liege nur auf dem LINKEN Kanal (der rechte ist Hintergrundrauschen;
  `rx_audio_channel = "left"`) [rigplane-rigplane-core:rigs/ftx1.toml]; captobie
  sagt, es sei Stereo mit Main links und Sub rechts beim Dual-Empfang, an den
  physischen Empfänger gebunden, auch wenn im Panel getauscht wird, und dass
  `SV` sie nur beim Dual-Empfang verschiebt [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- Abtastrate: ALSA dsnoop/dmix von captobie mit 2 Kanälen, 48000 Hz, S16_LE
  („erste Schätzung“, unbestätigt)
  [captobie-ftx1-remote:Pi/asound-ftx1.conf]; CLAUDE.md nennt auch
  Stereo-Aufnahme mit 44.1 kHz und 48 kHz in den Windows-Daten
  [captobie-ftx1-remote:CLAUDE.md]. `YaesuCatBackendConfig` von rigplane
  unterstützt `audio_sample_rate`, `rx_device` und `tx_device`
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Um TX-Audio vom PC zu senden, braucht man MOD SOURCE = USB (`RADIO SETTING, MODE SSB/AM/FM/DATA, MOD SOURCE`: MIC, USB, Bluetooth, AUTO; im PRESET: MIC,
  USB, REAR, AUTO). **Widerspruch/Fehler**: Der Wert 2 ist im Preset REAR und je
  Betriebsart Bluetooth. Außerdem `USB MOD GAIN` (ALC beobachten)
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md]
  [captobie-ftx1-remote:ftx1-cat-manual-errata.md]
  [captobie-ftx1-remote:Pi/README.md].
- Rigplane verwendet für das FTX-1 keinen Hardware-Scope; das Panadapter stammt
  aus dem RX-Audio [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].

**Zeiten und Latenz**

- `post_write_delay` von Hamlib = 50 ms; captobie verwendet 10 (27 Tausend
  saubere Antworten auf dem Mac, 17 Tausend auf dem Pi; 0 oder 5 ergaben
  manchmal verschobene Antworten). Das Funkgerät antwortet in ~5 ms; ein Lesen
  dauert ~14 ms bei Verzögerung 10. `rigctld -m 1051 -r <puerto> -s 115200 -t 4532 -o -C post_write_delay=10` (`-o` ist für VFO-Argumente nötig)
  [captobie-ftx1-remote:CLAUDE.md]
  [captobie-ftx1-remote:Pi/README.md].
- fritzsche: mindestens 50 ms zwischen Befehlen; MW antwortet nicht, danach
  warten [fritzsche-yaesu-ftx1:cat_format.md]. gnfrazier: 0.1 s nach dem Öffnen,
  0.05 s nach dem Schreiben, Lesen mit 1.0 s Timeout
  [gnfrazier-ftxcat:ftxcontrol.py]. bg7nzl: 2 ms nach dem Schreiben,
  `read_until(;)`, Timeout 1.0 s, Messwerte mit ~1 Hz
  [bg7nzl-ftx1ctl:ftx1cat.py] [bg7nzl-ftx1ctl:docs/user_manual_en.md].
  ew1abz: Lese-Timeout 200 ms und Abfrage der TUI alle 500 ms
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs]
  [ew1abz-yaesu-ftx-1-control:ftx1-ctl/src/app.rs].
- Rigplane: Live-Abfragestufen (Frequenz/Betriebsart) 1.0 s und langsame Stufe
  mit TTL von 120 s; ein externer CAT-Client pausiert die Abfrage
  [rigplane-rigplane-core:rigs/ftx1.toml].
- Weitere Apps: PR2EM 0.8 s Antwort-Timeout und 20 ms zwischen Schreibvorgängen;
  ITM Half-Duplex-FIFO mit 1.2 s Timeout und 40 ms Takt; WebUI nur ein Befehl
  gleichzeitig unterwegs, Lesen 350 ms, Setzen wartet 12 ms auf `?;` (150 ms
  beim Tuner); RZO 1.5 s (2 s für ID) und 40 ms zwischen den ersten Abfragen;
  POK schnelle Abfrage 200 ms, langsame 1500 ms, Pegel 6000 ms; SEM 1 s Timeout
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py]
  [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs]
  [git-jcw-FTX-1-WebUI:js/cat/cat-link.js]
  [rzochowski-cat-ftx1:serial-server.mjs] [pokibon3-FTX1Controller:js/ftx1.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts].
- Ein Speicherscan läuft mit ~9-10 Kanälen/s
  [captobie-ftx1-remote:CLAUDE.md]. Während TX werden Betriebsart und Split mit
  `?;` abgelehnt, die Frequenz wird akzeptiert
  [rigplane-rigplane-core:rigs/ftx1.toml].

**Automatische Information (AI)**

- `AI0;`/`AI1;` existiert [gnfrazier-ftxcat:ftxcontrol.py]
  [rigplane-rigplane-core:rigs/ftx1.toml]. Kein Repository beschreibt das
  unaufgeforderte Format. SEM, WebUI und dieses Projekt schalten AI beim
  Verbinden aus und fragen ab; RZO probiert `AI1;` und fragt wieder ab, wenn es
  kein Ack gibt [Semyonic-ftx1-programmer:src/cat/commands.ts]
  [git-jcw-FTX-1-WebUI:js/radio.js] [rzochowski-cat-ftx1:serial-server.mjs].

**Weitere Fakten**

- Rigplane: `has_lan=false`, 2 Empfänger, Höchstleistung 100 W und Mindestleistung
  5 W, einheitliches VFO-Schema `ab_shared`
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/guide/ftx1-usb-setup.md].
- Sicherungstipp: Speicher und Konfiguration auf der SD-Karte sichern, bevor
  Skripte verwendet werden; das Funkgerät sei „temperamental“ und es könne ein
  vollständiger Reset nötig sein [gnfrazier-ftxcat:README.md].
- Die Skalierung der Messwerte von Optima/SPA-1 in bg7nzl ist ungenau
  [bg7nzl-ftx1ctl:docs/user_manual_en.md].
- Android: PR2EM-A und Look4Sat listen alle Ports auf und fragen zur Laufzeit
  nach Berechtigung; BYF filtert in `usb_device_filter.xml` nach 10C4:EA70; EUG
  verwendet den ersten Treiber und Port für CAT und lässt den Leser des
  DATA-Ports aus, weil gleichzeitige Verwalter die Zuverlässigkeit von CAT
  beeinträchtigten
  [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt]
  [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/res/xml/usb_device_filter.xml]
  [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Web Serial: WebUI und SEM filtern nach VID 0x10C4; POK fragt den Port ohne
  Filter an [git-jcw-FTX-1-WebUI:js/cat/transport.js]
  [Semyonic-ftx1-programmer:src/cat/transport.ts]
  [pokibon3-FTX1Controller:js/serial.js].

## Speicherformat und wie Speicher gelesen und geschrieben werden

**Kennungen und Kanalbereiche**
[ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs]

- 00001-00999 Speicherkanäle; `P-01L`...`P-50U` PMS; 50001-50020 5-MHz-Band;
  `EMGCH` Notruf. Die Kennungen haben bei MR/MW/MT/MZ 5 Zeichen.
- Kanaltyp (Position 25 von MR/MW): 0 VFO, 1 Memory Channel, 2 Memory Tune, 3
  QMB, 4 reserviert, 5 PMS. Die MW-Tabelle von fritzsche stimmt überein; ihr
  MR-Text listet nur 0/1/2 [fritzsche-yaesu-ftx1:cat_format.md].
- `VM`-Codes: 00 VFO, 10 MT, 11 Memory, 20 PMS, 21 P-01L..P-50U, 51 5-MHz-Band,
  91 EMG
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Bereichskonflikt: MC 00001-00099 gegenüber MR/MW/MZ 00001-00999
  [captobie-ftx1-remote:FTX-1 CAT Manual Errors.md]; das Profil von rigplane
  listet nur die Kanäle 1-99 [rigplane-rigplane-core:rigs/ftx1.toml]; die
  Lücken-CSV spricht von bis zu 09999 bei MC
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv];
  gnfrazier kommentiert „MC P2 = 00001-00099“
  [gnfrazier-ftxcat:ftxcontrol.py]. captobie sah 277-278 Kanäle in seinem
  Funkgerät [captobie-ftx1-remote:CLAUDE.md]. Die HOME-Kanäle lassen sich per
  CAT weder lesen noch abrufen.

**MR/MW-Eintrag (27 Parameterzeichen nach `MR`/`MW`; 30 mit `;`)**
[fritzsche-yaesu-ftx1:cat_format.md]
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

| Position (ab 1) | Feld |
|---|---|
| 1-2 | `MR`/`MW` |
| 3-7 | Kanal (5) |
| 8-16 | Frequenz in Hz (9) |
| 17 | Vorzeichen des Clarifiers `+`/`-` (MR kann `S` zeigen; in MW muss es `+`/`-` sein) |
| 18-21 | Clarifier-Ablage in Hz (4); ew1abz: -9990..+9990 |
| 22 | RX-Clarifier 0/1 |
| 23 | TX-Clarifier 0/1 |
| 24 | Betriebsart (Codes von MD) |
| 25 | Kanaltyp (oben) |
| 26 | SQL-Typ: 0 OFF, 1 CTCSS ENC/DEC, 2 CTCSS ENC, 3 DCS, 4 PR FREQ, 5 REV TONE |
| 27-28 | fest `00` (ew1abz: „nicht zugeordnet“, könnte ARS/Split/M-GRP kodieren) |
| 29 | Shift 0 Simplex, 1 Plus, 2 Minus (MW auch `3` ARS laut ew1abz `to_mw_char`) |
| 30 | `;` |

- Beispiel `MR00008145675000+000000412002;`
  [fritzsche-yaesu-ftx1:cat_format.md]. Testantwort von ew1abz-control
  `IF00000014074000-050010200000;`
  [ew1abz-yaesu-ftx-1-control:ftx1/src/lib.rs].
- **Widerspruch/Fehler**: Die MR-Notiz im Abschnitt MA von fritzsche sagt
  „Tonmodus an Position 18“ (Fehler; die MR-Tabelle sagt 26)
  [fritzsche-yaesu-ftx1:cat_format.md].
- Vertauschung der SQL-Codes gegenüber CT: In MW/MR 1 = ENC/DEC und 2 = ENC; in
  CT 1 = ENC (TONE) und 2 = ENC/DEC (TSQL); `CmdCt::set` vertauscht sie
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md]
  [fritzsche-yaesu-ftx1:cat_format.md].
- ARS: wird mit `OS` P2=3 gespeichert; MR trägt keine ARS-Markierung, daher
  liefern Lesevorgänge die aufgelöste Richtung (Plus/Minus)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md].

**Unterstützte und nicht unterstützte Felder**
[ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-channel-fields.md]

- Unterstützt: Kanalnummer, RX-Frequenz, Richtung der Ablage, Betriebsart (17),
  Clarifier, SQL-Typ, CTCSS-Ton (CN, 50 Töne), DCS (104 Codes), Name (12 ASCII),
  ARS und TX-Frequenz bei Split (MZ).
- Nicht unterstützt: Ablagefrequenz (EX-Menü pro Band: 28 MHz 0-1000 kHz in
  10-kHz-Schritten, 50 MHz 0-4000 kHz in 10-kHz-Schritten, 144 und 430 MHz 0-100
  MHz in 50-kHz-Schritten), M-GRP, IPO/Preamp, DNF, DNR, Narrow, Abschwächer,
  NB-Pegel, AGC (alle global pro Seite oder Band, nicht pro Kanal); Kompressor
  und Sprach-EQ sind ebenfalls nicht pro Kanal
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].

**Werkzeug ew1abz-yaesu-ftx-1-memory-manipulator (`ftx1-mm`)**

- CSV-Spalten: Channel Number, Frequency (Hz), Memory Tag, Mode, Channel Type,
  Squelch Type, Shift (Hz), Clarifier Offset (Hz), Rx Clarifier Enabled, Tx
  Clarifier Enabled, CTCSS Tone, DCS Tone; optional `Split TX (Hz)`
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/main.rs]
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- SQL-Namen in der CSV: `CtcssOff`, `CtcssEnc` (TONE des Funkgeräts),
  `CtcssEncDec` (TSQ), `Dcs`; Ablagen `Simplex`, `PlusShift`,
  `MinusShift`, `Ars`; Kanaltyp `MemoryChannel` usw.; Clarifier-Markierungen
  `RxClarifierOff/On`.
- Lesen: Schleife `MR` + `MT` (+ `CN`, `MZ`) pro Kanal in eine CSV. Schreiben:
  CSV mit `MW`/`MT` pro Kanal (**ESCRIBE EN LA RADIO**)
  [ew1abz-yaesu-ftx-1-memory-manipulator:CLAUDE.md].
- Schreibsequenz pro Kanal (13 Schritte): `MW` (legt den Platz an), `VM` P2=11,
  `MC`, `VM` P2=00, `MD` FM, `OS` Shift, `MD` tatsächliche Betriebsart, `FA`,
  `CT`, `CN` CTCSS, `CN` DCS, `AM` (bestätigt), `MT` Name (`MZ` nach `AM`, wenn
  Split vorliegt)
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Sie ist additiv: Sie berührt nur die Kanäle der CSV und löscht nichts.
  Validiert mit einem Rundlauf von 16 Kanälen: Lesen, Schreiben und Lesen
  byteidentisch
  [ew1abz-yaesu-ftx-1-memory-manipulator:doc/memory-write-sequence.md].
- Optionen: `--read-radio`, `--write-radio`, `--check-data`, `--print`,
  `--port` (Standard `/dev/ttyUSB0`), `--speed` (38400), `--file`,
  `--allow-any-frequency`
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- **REGION/LIMITES TX** (weich): Validierung von 30 kHz-174 MHz und 400-470 MHz;
  `--allow-any-frequency` überspringt sie (modifizierte Funkgeräte MARS-CAP,
  SATCOM, Lücke 174-400 MHz)
  [ew1abz-yaesu-ftx-1-memory-manipulator:src/ftx1.rs].
- Nicht zusammenhängende Kanäle sind erlaubt; Zeilen mit `#` sind Kommentare; die
  Tabellenkalkulation entfernt führende Nullen und `.0` (das Werkzeug füllt auf 5
  auf und ordnet den Ton nach Wert zu)
  [ew1abz-yaesu-ftx-1-memory-manipulator:README.md].
- CHIRP-Konvertierung (`chirp_ft897_to_ftx1.py`): FM zu FM, NFM zu FM-N, AM, LSB,
  USB, CW zu CW-U, DIG zu DATA-U, PKT zu DATA-FM; Duplex ""/+/- zu
  Simplex/PlusShift/MinusShift; Tone ""/Tone/TSQL/DTCS zu
  CtcssOff/CtcssEnc/CtcssEncDec/Dcs; Name auf 12 gekürzt. Mit Begründung auf
  stderr ausgelassen werden: DV (D-STAR), WFM, Cross-Ton, TSQL-R/DTCS-R,
  Split-Duplex, ungültige Frequenz oder Position
  [ew1abz-yaesu-ftx-1-memory-manipulator:chirp_ft897_to_ftx1.py]. Umnummerieren:
  `renumber_channels.py`
  [ew1abz-yaesu-ftx-1-memory-manipulator:renumber_channels.py].

**Werkzeug fritzsche-yaesu-ftx1 (Speicherprogrammierer)**

- Upload-Strategien (**ESCRIBE EN LA RADIO**): (1) analog ohne Ton:
  `VM000;`, `FA...;`, `MW...;`; (2) analog mit Ton/DCS: `MW`, `CT0x`, `CN...`,
  `MC0nnnnn`, `AM;` (Reihenfolge der Doku) gegenüber der Reihenfolge von
  CLAUDE.md `MW`,
  `MC0nnnnn`, `VM000`, `MA`, `CT`, `CN`, `AM` (**die Reihenfolge unterscheidet
  sich zwischen**
  [fritzsche-yaesu-ftx1:cat_format.md] und [fritzsche-yaesu-ftx1:CLAUDE.md]); (3)
  digital C4FM/DN: `MD0H;` und danach `MW` direkt.
- Bezeichnung „Rufzeichen-Stadt“ mit bis zu 12 Zeichen; Umlaute werden mit
  `CharConverter.js` in ASCII umgewandelt [fritzsche-yaesu-ftx1:CLAUDE.md]. MC
  6-stellig (`MC000011`), MR 5-stellig [fritzsche-yaesu-ftx1:CLAUDE.md].
- **REGION/LIMITES TX** (weich): Die Validierung überspringt Frequenzen außerhalb
  von HF 0.1-174, VHF 174-350, Flugfunk 350-400 und UHF 400-524 MHz
  [fritzsche-yaesu-ftx1:CLAUDE.md]. **Widerspruch** zur Werksabdeckung von
  ew1abz (30 kHz-174 und 400-470 MHz).
- CSV-Formate: CHIRP (`--chirp-csv`) mit `Location,Name,Frequency,Duplex,Offset, Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment`; und
  das von relais.dl3el.de (`--csv`), durch `;` getrennt mit deutschem
  Dezimalkomma, ohne Feld Location (`--start-mem` nummeriert); DMR, D-Star und
  Tetra sind ausgeschlossen. In der Doku gibt es eine Unstimmigkeit zwischen
  `--start-mem` und `--mem-start`
  [fritzsche-yaesu-ftx1:csv_formats.md].
- Download/Prüfung: `node js/download.js [--verify]` exportiert nach CHIRP;
  die Prüfung vergleicht MR mit dem erneuten Lesen von `MC` + `FA`
  [fritzsche-yaesu-ftx1:CLAUDE.md]. `MA` lädt nur die Frequenz; `AM`/`BM`
  speichern den tatsächlichen VFO-Zustand. Der Upload unterstützt kein Löschen
  [fritzsche-yaesu-ftx1:csv_formats.md].

**Weitere Werkzeuge**

- captobie: listet mit `MR` und `MT`, ein leerer Kanal antwortet `?;` und es
  stoppt nach 100 aufeinanderfolgenden leeren; `VM011` schlägt fehl, außer direkt
  davor steht `MC0`. Schreibt Tastenspeicher (`KM`), das Menü für den
  CW-Speichertyp und tiefe Einstellungen über `EX` (**ESCRIBE EN LA RADIO**); die
  Aktionselemente des Katalogs (einschließlich CALIBRACION/RESET) werden nie
  gesendet [captobie-ftx1-remote:CLAUDE.md].
- gnfrazier: VFO/Speicher mit `VM P1;`, `MC`, `MA`, `MB`; ohne CSV und ohne
  Massenfunktion [gnfrazier-ftxcat:ftxcontrol.py].
- ew1abz-control: lokale Frequenzspeicher in TOML (`[[freq_memory]]`), nicht die
  des Funkgeräts [ew1abz-yaesu-ftx-1-control:README.md].
- rigplane: schreibgeschützte Speicherliste (`MR` + `MT`, Kanäle 1-99); die
  Schreibfamilien sind geplant
  [rigplane-rigplane-core:rigs/ftx1.toml]
  [rigplane-rigplane-core:docs/validation/cat-audits/ftx1-command-gaps.csv].
- PR2EM und SEM: Speichereditoren mit CSV (SEM importiert auch ADMS-14 und FT5D
  `.dat`); PR2EM liest nach `MW` zur Bestätigung erneut; SEM begrenzt die
  verwalteten Kanäle auf 1-99 und das Lesen auf 1-999 (**ESCRIBE EN LA RADIO**)
  [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/commands.py]
  [Semyonic-ftx1-programmer:src/cat/codec.ts]
  [Semyonic-ftx1-programmer:src/io/adms14-csv.ts]
  [Semyonic-ftx1-programmer:src/io/ft5d-dat.ts].

## Regionswerkzeug und TX-Bereiche

Nur Zusammenfassung. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX**
**CALIBRACION**. Dieses Projekt verwendet es nicht, automatisiert es nicht und
bildet es nicht nach. Für Details muss man zum Original-Repository gehen
(`https://github.com/Evgeny161rus/ftx1-region-tool`, Kopie in
`third_party/ftx1/Evgeny161rus-ftx1-region-tool`).

**Was es ist.** Ein Kommandozeilenwerkzeug in Python, das undokumentierte
Servicebefehle verwendet, die in der MAIN-Firmware vorhanden, im CAT-Handbuch
aber nicht enthalten sind, um einzelne Bytes des EEPROM des Funkgeräts zu lesen
und zu schreiben. Die Bytes, die es ändert, liegen neben der
Werkskalibriertabelle [Evgeny161rus-ftx1-region-tool:README.md]
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Es berührt das EEPROM nur über
diese Servicebefehle (`SPR` Lesen, `SPW` Schreiben); es verwendet weder Menüs
noch normale Befehle.

**Was sich ändert, im Konzept.** Der Ziel- oder Regionscode des Funkgeräts. Von
diesem Code hängt die Bandtabelle ab, in der die Firmware das Senden erlaubt. Ihn
zu ändern erweitert oder beschneidet die TX-Bereiche; das Werkzeug dokumentiert
je Region unterschiedliche Tabellen (eng auf Amateurfunkbänder, breiter oder fast
durchgehend). Das Werkzeug selbst warnt, dass eine sehr breite Region Bereiche
anbieten kann, in denen der HF-Pfad nicht für den Betrieb ausgelegt ist
[Evgeny161rus-ftx1-region-tool:README.md]. Es ist für eine bestimmte Version der
MAIN-Firmware (V01.13) gemacht; bei anderen Versionen muss man zuerst auslesen,
weil Adressen und Codes abweichen können.

**Schutzmaßnahmen des Werkzeugs.** Vorheriger EEPROM-Dump mit Prüfsummen;
automatische Sicherung vor dem Schreiben (bricht ab, wenn sie nicht gelesen
werden kann); Ablehnung eines unbekannten aktuellen Codes, außer man erzwingt es;
Simulationsmodus; ausdrückliche Bestätigung; erneutes Lesen mit Wiederholungen
nach dem Schreiben; danach muss das Funkgerät vollständig aus- und wieder
eingeschaltet werden
[Evgeny161rus-ftx1-region-tool:README.md]. Ein generischer Schreibbefehl
erlaubt es, jedes Byte zu erreichen, einschließlich der Kalibrierung
[Evgeny161rus-ftx1-region-tool:README.md]. Alte Versionen hatten einen
Lesefehler, der beschädigte Dumps und Sicherungen erzeugte.

**Risiken.**

- Verlust der Kalibrierung: Es wird Service-EEPROM neben ihr geschrieben; der
  vorherige vollständige Dump ist das einzige Sicherheitsnetz.
- Recht und Zulassung: Das Senden außerhalb dessen, was die Lizenz oder die
  Typzulassung erlaubt, liegt in der Verantwortung des Benutzers; die Änderung
  der Region kann sie verletzen [Evgeny161rus-ftx1-region-tool:README.md].
- Garantie: Die Änderung kann die Garantie erlöschen lassen
  [Evgeny161rus-ftx1-region-tool:README.md].
- Der Autor bietet es „wie besehen“ an und lehnt jede Haftung für Schäden,
  Datenverlust oder Fehlfunktionen ab [Evgeny161rus-ftx1-region-tool:README.md].
- Wenn die Firmware den Code beim Start wiederherstellt, gibt das Repository an,
  dass ein externer Programmer nötig wäre und ein Dump bearbeitet werden müsste
  [Evgeny161rus-ftx1-region-tool:README.md].

**Wie man zurückkehrt, im Konzept.** Den ursprünglichen Regionscode (im
vorherigen Dump gespeichert) mit demselben Werkzeug wieder setzen und das
Funkgerät neu starten. Bei Schäden an der Kalibrierung aus dem vollständigen Dump
wiederherstellen oder einen Yaesu-Service in Anspruch nehmen.

**In diesem Projekt.** `SPR`/`SPW`, Änderungen von Region oder TX-Grenzen und
jedes Schreiben von Kalibrierung sind absichtlich ausgeschlossen.

### Steckbrief des Werkzeugs

Links: [Original-Repository](https://github.com/Evgeny161rus/ftx1-region-tool/)
und [in diesem Projekt enthaltene Kopie](https://github.com/Brico-Hams/Radio-Web-install/tree/main/third_party/ftx1/Evgeny161rus-ftx1-region-tool).
Dieser Steckbrief beschreibt nur; er enthält keine EEPROM-Adressen,
Regionscode-Werte, keine Syntax des Schreibframes und keine Schritt-für-Schritt-
Anleitung.

**Sprache und Voraussetzungen.**

- Ein einzelnes Python-Skript (`ftx1_region.py`), signiert „R6AAF“, das Python
  3.8 oder neuer und die Bibliothek `pyserial` benötigt. Diese installiert es
  beim ersten Mal selbst mit `pip` (bei Bedarf mit `--user` oder `ensurepip`),
  außer `FTX1_NO_AUTOINSTALL=1` ist gesetzt
  [Evgeny161rus-ftx1-region-tool:README.md]
  [Evgeny161rus-ftx1-region-tool:requirements.txt].
- Läuft unter Windows, Linux und macOS über das normale USB-CAT-Kabel: Man muss
  den „Enhanced“-Port des CP2105 verwenden (standardmäßig 38400 Baud, `--baud`
  ändert das, `--port` erzwingt den Port). Das Funkgerät muss nicht geöffnet
  werden.
- Ohne Argumente öffnet sich ein interaktives Menü. Die Oberfläche ist russisch,
  englisch oder beides; die Wahl wird in `~/.ftx1_region_lang` gespeichert, und
  `--lang` ändert sie nur für dieses eine Mal
  [Evgeny161rus-ftx1-region-tool:ftx1_region.py].
- Das Repository enthält außerdem eine Schritt-für-Schritt-Anleitung auf
  Russisch, die hier nicht zusammengefasst wird.

**Unterstützte Firmware.**

- Sie ist für das FTX-1 mit MAIN V01.13 gemacht: Aus diesem Image stammen die
  Regionstabelle und die TX-Bereichstabellen, die sie verwendet. Bei anderen
  Versionen muss man zuerst einen Dump erstellen und mit `info` prüfen, weil
  Adressen und Codes abweichen können
  [Evgeny161rus-ftx1-region-tool:README.md].
- Das Lesen der Version nutzt `VE`; die Identifikation nutzt `ID` (das FTX-1
  antwortet mit `ID0840`).
- Sie erreicht nur die ersten 64 KiB des EEPROMs (16-Bit-Adresse) von den
  128 KiB des Chips; Region, Kalibrierung und Einstellungen liegen am Anfang.

**FT-710-Profil.** Mit `--radio ft710` (oder durch Auswahl im Menü) verwendet
dasselbe Werkzeug ein anderes Profil: 32-KiB-SPI-EEPROM, andere Position des
Codes und eines „4K“-Indikators, Identifikation `ID0710` und vor dem Schreiben
immer eine vollständige Kopie. Es dient zum Dumpen, Sondieren, Ändern der Region
und Analysieren von Dateien des FT-710
[Evgeny161rus-ftx1-region-tool:ftx1_region.py]. Beim FT-710 verwendet die
Regionsänderung zusätzlich einen Befehl `JP`; beim FTX-1 ist dieser Befehl ein
Platzhalter, der `?;` antwortet, deshalb werden hier die EEPROM-Serviceaufträge
verwendet.

**Unterbefehle, die nur lesen** (das Funkgerät nicht verändern):

- `ports`: listet die seriellen Ports auf und markiert den des CAT.
- `info`: liest `ID`, die Version und den aktuellen Regionscode; zeigt seinen
  Namen und die TX-Bereiche, die die Firmware für diesen Code erlaubt.
- `list`: Tabelle der bekannten Regionscodes (Name, ob „weit“ und eine
  Beschreibung); sie ist lokal und spricht nicht mit dem Funkgerät.
- `dump`: sichert das EEPROM in eine `.bin` und eine `.txt` (siehe unten).
- `read`: liest ein einzelnes EEPROM-Byte.
- `probe` (gedacht für das FT-710): Nur-Lese-Abfragen von `ID`, `VE`, `JP` und
  EEPROM-Lesevorgänge; speichert ein Protokoll im Dump-Ordner und sagt, ob der
  vollständige Dump per CAT möglich ist.
- `analyze`: analysiert offline eine bereits gespeicherte `.bin` (Größe,
  Region, nicht leere Blöcke) und vergleicht sie mit `--diff` mit einer anderen.
- `hardware`: gibt nur Anleitungen für einen Dump mit externem Programmer aus
  (SPI-Chip des FT-710, CH341A und SOP8-Klemme, zwei Dumps und den
  Fingerabdruck vergleichen, keine 5 V an einen 3,3-V-Chip legen).
- `patch`: ändert offline den Regionscode innerhalb einer Kopie eines Dumps und
  speichert eine neue Datei; es berührt das Funkgerät nicht, aber das Ergebnis
  ist dafür gedacht, mit einem externen Programmer geschrieben zu werden
  (**REGION/LIMITES TX**).

**Unterbefehle, die schreiben:**

- `set`: ändert den Regionscode (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX**).
  Akzeptiert den Code oder den Namen oder fragt danach und zeigt die Tabelle.
- `write`: schreibt ein einzelnes Byte an eine beliebige EEPROM-Position,
  einschließlich der Kalibrierung (**ESCRIBE EN LA RADIO** **REGION/LIMITES TX**
  **CALIBRACION**); eine Option für Experten, die nicht blind verwendet werden
  darf.
- Die Menüoption „set“ (ohne Argumente) tut dasselbe wie `set`.

**Dump und Kopien.**

- Der Dump wird Byte für Byte gelesen, mit etwa 12 ms pro Byte: Der normale Dump
  (die ersten 4 KiB: Header, Kalibrierung und Region) dauert etwa 50 s, der
  vollständige mit 64 KiB (`--full`) etwa 13 Minuten. `--double` liest zweimal
  und vergleicht.
- Neben der `.bin` speichert es eine `.txt` mit Datum, Port, Identifikation,
  Firmware, Region, der SHA-256-Summe und der Anzahl fehlerhafter Bytes.
- Ohne `--out` landen die Dumps im Ordner `dumps` neben dem Skript und die
  automatischen Kopien vor dem Schreiben im Ordner `backups`; beide werden
  selbst angelegt, und der vollständige Pfad wird am Ende ausgegeben.
- Die automatische Kopie vor `set` umfasst die ersten 512 Bytes des EEPROMs
  (Header, Kalibrierung und Region); beim FT-710 ist es immer das gesamte
  EEPROM.

**Schutzmaßnahmen.**

- `set --dry-run`: zeigt den aktuellen und den neuen Code mit ihren Bereichen und
  hält an, ohne etwas zu schreiben.
- Ist der aktuelle Code unbekannt, verweigert es das Schreiben außer mit
  `--force`.
- Automatische Kopie vorab und ihre Verifikation: Wird ein Byte nicht gelesen
  oder stimmt die Region der Kopie nicht mit der aktuellen überein, bricht es ab
  (`--no-backup` lässt sie aus).
- Ausdrückliche Bestätigung (man muss `yes` eintippen; `--yes` lässt sie aus).
- Zurücklesen nach dem Schreiben, mit Wiederholungen und Pausen, weil die
  Firmware direkt danach die Tabellen wechselt; kann nicht gelesen werden, warnt
  es mit `write sent, but the readback failed` (kein Schreibfehler).
- Das Funkgerät muss vollständig aus- und wieder eingeschaltet und erneut mit
  `info` geprüft werden. Springt der Code zurück, stellt die Firmware ihn beim
  Start wieder her, und ein externer Programmer wäre nötig.
- CAT-Fehler schließen das Menü nicht; sie werden nur ausgegeben.

**Bekannte und behobene Fehler.** Am 2026-11-09 wurde das Lesen von `SPR`
korrigiert: Die Antwort wurde bis zum ersten `;` gelesen, aber dieses Byte kann
auch ein Datenbyte oder die Prüfsumme sein, sodass der Datenstrom verschoben
wurde und die folgenden Antworten zu früheren Adressen mit korrekter Prüfsumme
gehörten. Ergebnis: beschädigte Dumps und Kopien, und `set` schrieb und schlug
danach bei der Verifikation fehl. Jetzt wird eine Antwort fester Länge gelesen,
der Puffer geleert und wiederholt, die Vorabkopie wird verifiziert und auch
`ID`. Die früheren Dumps wurden als `_CORRUPT` markiert und taugen nicht zur
Wiederherstellung [Evgeny161rus-ftx1-region-tool:README.md].

**Versteckte CAT-Befehle, die es dokumentiert.** Nach der geordneten Tabelle der
Befehle der MAIN-Firmware beschreibt das Werkzeug einen Block versteckter
Befehle: `DP`, `SP`, `EO`, `FD`, `KT`, `PE`, `ZZ`, `VE`, `JP`, `A0`, `A1`, `A2`,
`RL`, `EX` und `SW`. Es werden nur die Namen genannt; vom Werkzeug verwendet
werden `SPR` und `SPW` (Lesen und Schreiben eines EEPROM-Bytes), und `SPIR`
antwortet am echten Funkgerät
[Evgeny161rus-ftx1-region-tool:README.md].

**Rechtliche und Nutzungshinweise.** Nur dort senden, wo die Lizenz es erlaubt;
die Änderung der Region kann die Typzulassung und die Garantie verletzen; es wird
Service-EEPROM neben der Kalibrierung geschrieben, daher vor dem ersten
Schreiben einen Dump erstellen; es wird „wie besehen“ und ohne Garantie
angeboten, und der Autor lehnt jede Haftung für Schäden, Datenverlust, defekte
Geräte oder die Verletzung lokaler Gesetze ab
[Evgeny161rus-ftx1-region-tool:README.md].

## Firmware (Reid-n0rc)

Nur Zusammenfassung. **FIRMWARE**. Dieses Projekt lädt, patcht und bereitet
keine Firmware vor.

Fakten des Repositorys `Reid-n0rc-FTX-1_Firmware`
[Reid-n0rc-FTX-1_Firmware:README.md] [Reid-n0rc-FTX-1_Firmware:AGENTS.md]:

- Stand: „gerade erst begonnen, nichts dekodiert“. `decomp/` enthält nur
  `.gitkeep`; die Aufgaben T01-T11 stehen auf `todo` und ihre Abschnitte mit
  Ergebnissen sind leer [Reid-n0rc-FTX-1_Firmware:decomp/.gitkeep]
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md].
- Der Mikrocontroller ist nicht identifiziert (die Hardware-Erhebung T03 steht
  aus). Die Chips des FT-710 erscheinen nur als Vergleichshypothesen
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T03-hardware-survey.md].
- Images (nicht geprüft, Blog eines Händlers vom März 2026): DISPLAY
  V01-09, MAIN V01-12, DSP V01-07, SDR V01-06; möglicherweise ein getrenntes
  Image für das Feld-Bedienteil und den Verstärkerkörper (Optima)
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T02-sources.md]
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md]. Andere Quellen nennen MAIN 01-13 und
  DISPLAY 01-10 als die neuesten
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Container: in diesem Repository unbekannt; Hypothese vom Typ FT-710 (`.SFL`
  mit ASCII-Header, Größenangabe und CRC sowie kodierter Nutzlast). Ein anderes
  Repository (sq9pd) bestätigt in der Praxis ein Format dieser Art
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T04-container-decode.md]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Update-Verfahren: in diesem Repository nicht dokumentiert (T06 offen); beim
  FT-710 liest die DISPLAY-CPU die SD-Karte, beim FTX-1 ungeprüft
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T06-update-path.md]. Zusammengefasst ist
  das offizielle Yaesu-Update der einzige unterstützte Weg; offizielle und
  Drittanbieter-Firmwaredateien werden nach dem Yaesu-Verfahren geladen
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- Werkzeuge: Ghidra 12.1.4 ohne grafische Oberfläche sowie Skripte für Namen und
  Export [Reid-n0rc-FTX-1_Firmware:tools/README.md]. In diesem Repository gibt
  es keine Ergebnisse zu CAT; T07 plant, die dokumentierte CAT-Tabelle mit der
  der Firmware zu vergleichen
  [Reid-n0rc-FTX-1_Firmware:docs/tasks/T07-cat-commands.md].
- Die Handbücher, dekodierten Images und Ghidra-Projekte werden nicht
  versioniert; die Firmware bleibt Eigentum von Yaesu
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md] [SOURCES.md].
- Regel des Repositorys: kein Schreiben ins Funkgerät ohne jedes Mal erteilte
  Freigabe des Eigentümers (Firmware-Upload, EEPROM, ungetestete CAT-Befehle)
  [Reid-n0rc-FTX-1_Firmware:AGENTS.md].

**Risiken.** Ein unterbrochenes oder fehlgeschlagenes Update kann Einstellungen
verlieren oder das Funkgerät unbrauchbar machen; man sollte vorher Speicher und
Einstellungen sichern und die Original-Firmware aufbewahren. Eine
Drittanbieter-Firmware ist von Yaesu nicht freigegeben. Die Firmwareversion
lässt sich risikolos mit `VE` lesen
[sq9pd-Yaesu-FTX-1-mod:README.md] [gnfrazier-ftxcat:ftxcontrol.py].

## Hardware-Modifikationen und Frontabdeckung

Zusammenfassung. Patches und Patchdaten werden nicht wiedergegeben.

**Schützende Frontabdeckung (radiohyperactivity).** Hilfsdateien für eine
selbstgebaute Abdeckung für das FTX-1 Field: PE-Schaumvorlagen (A4 und US
Letter, SVG und PDF), FreeCAD-Quellen und druckbare STL (Schaumvorlagen von 1 bis
5 mm und Gehäuse von 20 bis 40 mm Tiefe in 2-mm-Schritten). Es gibt keine
elektrische Modifikation und kein Schreiben ins Funkgerät
[radiohyperactivity-ftx1-front-cover:README.md].

**Modifikation sq9pd (Drittanbieter-Firmware).** **FIRMWARE**
**ESCRIBE EN LA RADIO** (der Benutzer müsste das Ergebnis mit dem
Yaesu-Updateverfahren laden; das Werkzeug bereitet nur Dateien vor). Sie ist
nicht offiziell und nicht von Yaesu freigegeben. Zusammenfassung dessen, was sie
bietet [sq9pd-Yaesu-FTX-1-mod:README.md]:

- Ausgangspunkt sind die offiziellen Firmwares MAIN 01-13 und DISPLAY 01-10; sie
  akzeptiert nur genau diese Eingabedateien (Prüfung von Größe und Fingerabdruck;
  lehnt bereits modifizierte Dateien ab) [sq9pd-Yaesu-FTX-1-mod:manifest.json]
  [sq9pd-Yaesu-FTX-1-mod:patch.py].
- Vier Seiten mit je fünf konfigurierbaren Tasten in der unteren Zeile, 70
  zuweisbare Funktionen, Uhr in der oberen Leiste, nativer Scan-Knopf und
  Kurzbefehle (APRS, FIL/NOTCH/NB/AMC) sowie zwei kleine Korrekturen (BEEP LEVEL
  = 0 ohne stumme Pieptöne und ein Tippfehler „DELY“).
- **SWR SCAN**: **sendet HF**, während es durchfährt (101 Punkte). Verlangt
  VFO-Modus, ausgeschalteten Tuner und kein SPLIT/RIT/XIT; erzwingt AM und
  niedrige Leistung; beschneidet den Durchlauf nicht auf die Bandgrenzen, daher
  muss der gesamte Bereich zum Senden zulässig sein (**REGION/LIMITES TX**,
  Verantwortung des Benutzers); fügt keine Abschaltung bei hohem SWR hinzu; der
  Werks-TOT von 60 s bleibt aktiv; während des Durchlaufs blockiert CAT Änderungen
  und den TX-Start.
- Läuft offline (Python 3.9+ oder Browserseite); ohne Uploads und ohne Analytik;
  die Originaldateien werden nicht verteilt. Die Tests des Werkzeugs besagen,
  dass das interaktive Patchen im Browser „noch nicht getestet“ ist
  [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json].
- Risiken: Ein fehlgeschlagenes Update kann Einstellungen verlieren oder das
  Funkgerät unbrauchbar machen; die Schutzmaßnahmen „können keinen Schutz vor
  jedem Fehler garantieren“; wenn das TX anhält, das Funkgerät ausschalten.
  Rückgängig machen: die originalen MAIN und DISPLAY neu installieren und einen
  Werksreset durchführen (löscht die Benutzereinstellungen).

Weitere Hardware-Erwähnungen: externer Tuner mAT-30 über den Anschluss
TUNER/LINEAR mit Kabel mAT-CY
[hatandspecs-ftx1-tuner-sweep:docs/usage.md]; ein externer Programmer CH341A als
Hilfsmittel des Regionswerkzeugs
[Evgeny161rus-ftx1-region-tool:README.md].

### Web-Werkzeug von sq9pd (ftx-1-mod.sq9pd.pl)

**FIRMWARE**. Links: [Website](https://ftx-1-mod.sq9pd.pl/) und
[Repository](https://github.com/sq9pd/Yaesu-FTX-1-mod). Die Website konnte nicht
automatisch abgerufen werden (HTTP 403, 2026-11-17). Diese Beschreibung stammt
aus dem Ordner `site/` des Repositorys: eine statische Webanwendung
(`index.html`, `app.js`, `content.js`, `patch-core.js`, `patch-data.js`, dazu
Stylesheet und Bilder), die offenbar das ausliefert, was die Website bereitstellt
(nicht verifiziert)
[sq9pd-Yaesu-FTX-1-mod:site/index.html] [sq9pd-Yaesu-FTX-1-mod:site/app.js]
[sq9pd-Yaesu-FTX-1-mod:site/content.js] [sq9pd-Yaesu-FTX-1-mod:site/patch-core.js]
[sq9pd-Yaesu-FTX-1-mod:site/patch-data.js]. Dieses Projekt benutzt sie nicht und
gibt keine Patches wieder.

- **Was der Benutzer bekommt.** Eine Seite auf Polnisch (Standard) oder Englisch,
  die die Modifikation mit drei Screenshots erklärt (Hauptbildschirm,
  Tastenkonfiguration und SWR-SCAN-Diagramm), dazu die Anleitung und die Grenzen
  von SWR SCAN, den Weg zurück zur Original-Firmware und zwei Dateiauswahlfelder
  (MAIN und DISPLAY), die die modifizierten `.SFL`-Dateien zum Herunterladen
  erzeugen. Die Seite programmiert das Funkgerät nicht: Das Laden erledigt der
  Benutzer mit dem Yaesu-Updateverfahren [sq9pd-Yaesu-FTX-1-mod:README.md]
  [sq9pd-Yaesu-FTX-1-mod:READMEPL.md].
- **Wo sie läuft.** Alles im Browser, auf dem Rechner des Benutzers: Die Seite
  gibt an, dass Dateien nie auf einen Server hochgeladen werden, dass die
  SHA-256-Prüfung und das Patchen lokal erfolgen, ohne Analytik und ohne externe
  Bibliotheken. Passend dazu verbietet die Content Security Policy der Seite
  jede Netzwerkverbindung (`connect-src 'none'`), und der Code stellt keine
  Anfragen. Sie verlangt Web Crypto (HTTPS oder localhost) und ein
  Einwilligungs-Kästchen vor dem Patchen. Die Originaldateien und die gepatchten
  Dateien sind nicht im Repository enthalten.
- **Welche Version sie akzeptiert.** Die Lieferung „FTX-1 MAIN V40 + DISPLAY
  V35“, basierend auf den Yaesu-Firmwares MAIN 01-13 und DISPLAY 01-10: nur die
  exakten offiziellen Dateien `FTX-1_MAIN_V0113.SFL` und
  `FTX-1_DISPLAY_V0110.SFL`. Andere Versionen werden nicht unterstützt. V40 und
  V35 sind Versionen der Modifikation (die Dateinamen behalten die Werksnummern)
  und enthalten nicht die CW-Audio-Korrektur von MAIN V41
  [sq9pd-Yaesu-FTX-1-mod:manifest.json].
- **Modifikationen, auf Funktionsebene.**
  - Vier Seiten mit je fünf konfigurierbaren Tasten in der unteren Zeile (in den
    Anzeigeeinstellungen zuweisbar), mit 70 zuweisbaren Funktionen und
    Standardbelegung.
  - Uhr in der oberen Leiste; spektrumsunabhängige Funktionen sind bei
    ausgeblendetem Spektrum verfügbar.
  - Kurzbefehle: APRS (Modem, Stations- und Nachrichtenlisten, Bake), 3DSS,
    Tuner und Antenne, Filterbreite und -verschiebung, Notch, Contour, NB, AMC
    und Einstellungen, die den FUNC-Regler aktivieren.
  - Nativer Scan des gewählten Empfängers; Band- und Modenlisten mit kurzem
    Tastendruck und alternativer Aktion bei langem Tastendruck.
  - **SWR SCAN**: Antennenanpassungs-Durchlauf mit 101 Punkten um die
    VFO-Frequenz, mit vier Durchlaufbreiten; **sendet HF** und ist kein
    unabhängig kalibriertes Messgerät (**REGION/LIMITES TX**: Der gesamte
    Durchlauf muss zulässig sein). Er hat eigene Fehlercodes.
  - Zwei Korrekturen der Original-Firmware (stumme Pieptöne bei BEEP LEVEL = 0
    und ein Menü-Tippfehler).
- **Sicherheitsprüfungen.** Geprüft werden beim Auswählen der SHA-256 der Datei,
  ihre Größe, der Header, das Größenfeld und der CRC des SFL-Formats, der Hash
  der dekodierten Nutzlast und dass die Originalbytes übereinstimmen, bevor die
  Unterschiede angewendet werden; danach werden CRC und SHA-256 des Ergebnisses
  gegen den erwarteten Wert geprüft. Eine Datei einer anderen Version, eine
  bereits modifizierte oder eine beschädigte Datei wird abgelehnt; der Download
  wird nur bei verifiziertem Ergebnis freigegeben, und der erwartete und der
  tatsächliche Hash werden angezeigt. Die Python-Version wiederholt dieselben
  Prüfungen und speichert das Ergebnis nicht, wenn sie fehlschlagen
  [sq9pd-Yaesu-FTX-1-mod:patch.py] [sq9pd-Yaesu-FTX-1-mod:SHA256SUMS.txt].
- **Teststand.** Die Ergebnisdatei meldet „PASS“ bei der Offline-Verifikation:
  Die Python- und JavaScript-Ergebnisse sind für MAIN und DISPLAY Byte für Byte
  identisch, die Negativfälle bestehen, und die Oberfläche (Polnisch und
  Englisch, schmales Layout) wird korrekt dargestellt. Das interaktive Patchen im
  Browser steht als „not yet tested in browser; Python and JS engine verified“
  [sq9pd-Yaesu-FTX-1-mod:TEST_RESULTS.json]. Nichts davon wurde hier getestet.
- **Rückkehr zur Werks-Firmware.** Vorher Einstellungen und Speicher sichern, die
  originalen MAIN und DISPLAY mit dem Yaesu-Verfahren neu installieren und einen
  Werksreset durchführen (löscht die Benutzereinstellungen); die
  Neuinstallation der Original-Firmware ersetzt den Reset nicht
  [sq9pd-Yaesu-FTX-1-mod:README.md].
- **Warnungen.** Inoffizielle, nicht von Yaesu freigegebene Modifikation, auf
  Verantwortung des Benutzers und ohne Garantie; ein Fehler oder ein
  unterbrochenes Update kann Einstellungen verlieren oder das Funkgerät
  unbrauchbar machen; die Software-Schutzmaßnahmen garantieren keinen Schutz vor
  jedem Fehler, und wenn das Funkgerät weiter sendet, muss es ausgeschaltet
  werden. Das Werkzeug ist kein Compiler und kein allgemeiner Firmware-Editor.

## Tuner-Sweep (Antennentuner-Durchlauf)

**ACHTUNG: Jeder Schritt SENDET.** **ESCRIBE EN LA RADIO** (ändert den VFO live
und aktiviert das TX; schreibt weder Speicher noch Menü noch EEPROM)
[hatandspecs-ftx1-tuner-sweep:README.md]. Dieses Projekt implementiert den
Sweep nicht und startet den Tuner nicht.

`hatandspecs-ftx1-tuner-sweep` ist eine lokale Flask-Anwendung
(`http://127.0.0.1:5000`), die den VFO des FTX-1 durch die gewählten Bänder
fährt und einen externen automatischen Tuner auslöst, damit er pro Frequenz einen
Speicher ablegt (getestet mit einem mAT-30, FTX-1 Optima, 15 m und 12 m)
[hatandspecs-ftx1-tuner-sweep:README.md] [hatandspecs-ftx1-tuner-sweep:docs/usage.md].

| Befehl | Bedeutung | Quelle |
|---|---|---|
| `FA<9 digitos Hz>;` | setzt oder liest die MAIN-Frequenz | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `AC103;` | startet die Abstimmung des externen Tuners (entspricht 2 s Halten von [TUNER]); **sendet** | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md] |
| `AC101;` | stoppt die Abstimmung und lässt den Tuner im Signalweg | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `RI;` | Tuner-Aktivität (8 Ziffern, die sechste ist tuning) | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `PC;` | liest die eingestellte Leistung | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |
| `MD0;` | liest die MAIN-Betriebsart | [hatandspecs-ftx1-tuner-sweep:ftx1_cat.py] |

- Nötiges Menü am Funkgerät: TUN/LIN PORT SELECT = EXT-TUNER und TUNER SELECT =
  EXT [hatandspecs-ftx1-tuner-sweep:docs/usage.md]. Seriell 38400 8N1 über CAT-1.
- Algorithmus: pro Bereich sortierte Frequenzen (erste = untere Kante + 1 kHz,
  letzte = obere Kante - 1 kHz, dazwischen in einem 10-kHz-Raster); pro
  Frequenz: `FA`, Warten von 300 ms, `AC103;`, festes Warten von 5 s mit Abfrage
  von `RI;` alle 300 ms und immer `AC101;`. `RI` ist mit externen Tunern nicht
  zuverlässig (unidirektionale Auslöseleitung), daher wird dem Ende der
  Abstimmung nicht vertraut [hatandspecs-ftx1-tuner-sweep:app.py]
  [hatandspecs-ftx1-tuner-sweep:AGENTS.md].
- Die Bandprivilegien stammen aus der editierbaren `bandplans.tsv` (USA genau je
  Klasse; andere Länder näherungsweise) oder aus eigenen Bereichen in Hz
  [hatandspecs-ftx1-tuner-sweep:docs/band-privileges.md].
- Sicherheit: empfohlene Leistung von 5 W oder weniger, und die App liest sie
  nur; jeder Schritt sendet etwa 5 s; verlangt vorab eine Checkliste; Stopp
  beendet den laufenden Schritt; erkennt nicht, ob die Frequenz belegt ist; keine
  automatischen Tests [hatandspecs-ftx1-tuner-sweep:docs/usage.md]
  [hatandspecs-ftx1-tuner-sweep:app.py] [hatandspecs-ftx1-tuner-sweep:AGENTS.md].

### ATAS-Abgleich am Funkgerät gemessen (FTX-1)

Am Funkgerät gemessen bei einem ATAS-Abgleich (`AC123;`) [medido en radio: ajuste ATAS, FTX-1]:

- Während des gesamten Abgleichs meldet das Funkgerät `TX2`, `MD07` (CW-L), `PC2005` und `AC100`;
  `RI0` hält HI-SWR + TX + tuning gleichzeitig.
- Am Ende stellt das Funkgerät Betriebsart und Leistung selbst wieder her; die
  Software schreibt sie nicht erneut.
- Node-Konsole (`remote.html`): solange `state.tune` existiert, zeigt sie
  „ATAS wird abgeglichen... N s / max“, kennzeichnet die Betriebsart als
  temporären Abgleichmodus (nicht als Bedieneränderung protokolliert und nicht
  pro Band gemerkt) und hält bei Änderung von `state.tuneResult` eine
  dauerhafte Karte mit Ergebnis, Grund, End-SWR („ungefähr“ bei der
  unkalibrierten RM6-Kurve) und der Prüfung von TX aus.

## Satelliten und Look4Sat

`juanmmmmmmm-Look4Sat-FTX1` ist ein experimenteller Fork von Look4Sat mit „Yaesu
FTX-1“ als Funkgerätemodell, über direktes USB OTG (ohne PC und ohne rigctld).
**ESCRIBE EN LA RADIO** (VFO, Betriebsart, Split und CTCSS); es wurde weder
**REGION/LIMITES TX** noch **CALIBRACION** noch **FIRMWARE** gefunden
[juanmmmmmmm-Look4Sat-FTX1:README.md].

- Modell: MAIN = RX/Downlink, SUB = TX/Uplink
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/RadioTrackingService.kt].
- Start: MAIN-Betriebsart nach der Downlink-Betriebsart, SUB-Betriebsart nach der
  des Uplinks; anfängliche SUB-Frequenz = TX-Basis oder Mitte des Uplink-Bandes;
  danach `FT1;` + `VS1;` (SUB als TX-Seite).
- Verwendete Befehle: `FA%09d;`, `FB%09d;`, `MD0<codigo>;`/`MD1<codigo>;`,
  `FT0/1;`, `VS0/1;`, `ST1/ST0;`, `CN10%03d;` (CTCSS-Ton auf SUB, Index 000-049,
  nur Standardtöne mit einer Toleranz von 0.05 Hz) und `CT11;`/`CT10;`; eine
  harmlose Prüfung `FA;` nach 150 ms beim Verbinden
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1CatProtocol.kt]
  [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/framework/Ftx1Controller.kt].
- Doppler: Jeder 1-s-Zyklus berechnet Position und Radialgeschwindigkeit, bildet
  die Uplink-Basis mit dem Bandschritt des linearen Transponders auf den Downlink
  ab und wendet `getUplinkFreq`/`getDownlinkFreq` an; der Downlink-Versatz des
  Benutzers wird für den Uplink vor der Abbildung und für den Downlink danach
  angewendet; nur lineare Transponder
  [juanmmmmmmm-Look4Sat-FTX1:core/domain/src/main/java/com/rtbishop/look4sat/core/domain/utility/DopplerFrequencyCalculator.kt].
- Manuelle Abstimmung: liest FB/FA, vergleicht mit dem zuletzt Gesendeten
  (Schwelle von 20 Hz) und berechnet nach zwei stabilen Lesevorgängen die
  TX-Basis neu und nimmt die Korrekturen wieder auf.
- FM: CTCSS nur im Uplink-Encoder von SUB, konfigurierbar; das Tracking wendet
  einen gewählten Ton nicht von selbst an.
- PTT: Die Software sendet es nie (`pttOn()` protokolliert und liefert falsch);
  DTR/RTS auf falsch erzwungen; nur das physische PTT des Mikrofons.
- `stopTracking()` bricht nur die Aufgabe ab: Es stellt vorherige Frequenz,
  Betriebsart, Split, VFO oder CTCSS **nicht wieder her**.

## Remote-Architekturen, Tunnel und WebUI

| App | Entwurf | Transport und Ports | Sicherheit und Authentifizierung | Latenz |
|---|---|---|---|---|
| evertonma-FTX-1CAT_PR2EM | Lokaler Desktop; CAT-Builder und -Parser von der Tk-Oberfläche getrennt; Worker-Thread mit Warteschlange (gruppiert nach Schlüssel) | pyserial, nur lokal | Weder Netzwerk noch Authentifizierung | Transport mit RLock; unaufgeforderte Rahmen an einen Callback [evertonma-FTX-1CAT_PR2EM:ftx1cat/ui/worker.py] [evertonma-FTX-1CAT_PR2EM:ftx1cat/cat/transport.py] |
| evertonma-FTX-1CAT_PR2EM_Android | Lokales Android; ein einziger Executor serialisiert CAT | USB-Host seriell | Nur USB-Berechtigung zur Laufzeit | Blockierende Abfragen mit Timeout; Schieberegler mit 90 ms Debounce [evertonma-FTX-1CAT_PR2EM_Android:app/src/main/java/com/pr2em/ftx1cat/CatRadio.kt] |
| Eugen68-Yaesu-FTX1-CAT-Control | Lokales Android; CAT und DATA teilen sich eine USB-Verbindung | CAT-Port + DATA-Port (RTS/DTR) + USB-Audio | Keine | Ereignisgesteuerte Lesevorgänge; DATA-Leser ausgeschaltet, um CAT zu schützen [Eugen68-Yaesu-FTX1-CAT-Control:app/src/main/java/com/example/yaesucatcontroladv/RadioManager.java] |
| iTracMan-FTX1WinController | WPF: Befehle, asynchrone Fassade, serialisierte Verbindung und serieller Transport | Zwei virtuelle COM (CAT-1 und CAT-2 für PTT) | Lokal | FIFO, 1.2 s, 40 ms [iTracMan-FTX1WinController:src/FTX1WinController/Cat/CatConnection.cs] |
| pokibon3-FTX1Controller | Browser-PWA mit Web Serial; DSP in AudioWorklet/Worker | Web Serial zum Enhanced COM; Standard COM für Taste/PTT | Sicherer Kontext; ohne Authentifizierung (lokal) | Siehe Abschnitt 3 [pokibon3-FTX1Controller:js/serial.js] |
| git-jcw-FTX-1-WebUI | Statische Oberfläche mit Web Serial und Electron-Hülle; Warteschlange in `cat-link.js` | Web Serial | Electron: Berechtigungen nur für `file:`-Seiten, Kontextisolierung, Sandbox, nur eine Instanz, externe Links im Browser; **ohne IPC-Brücke, ohne Authentifizierung und ohne explizite CSP in `main.cjs`** | Ein Befehl gleichzeitig unterwegs; Einstellungen werden priorisiert und gruppiert [git-jcw-FTX-1-WebUI:electron/main.cjs] [git-jcw-FTX-1-WebUI:js/cat/cat-link.js] |
| rzochowski-cat-ftx1 | Nuxt/Vue-Client, API-Routen von Nuxt und ein Node-Server `serial-server.mjs` auf `127.0.0.1:3001` mit `serialport`; Zustand über **SSE** (`/events`, kein WebSocket) | HTTP und SSE auf Loopback; 8N1 mit konfigurierbaren Baudraten | Nur Loopback, aber CORS `*`; **ohne Authentifizierung** | Warteschlange mit Timeouts; erste Abfragen alle 40 ms; Aktualisierung nach 150 ms nach dem Setzen [rzochowski-cat-ftx1:nuxt.config.ts] [rzochowski-cat-ftx1:serial-server.mjs] [rzochowski-cat-ftx1:server/api/command.post.ts] |
| Semyonic-ftx1-programmer | TS-Browser-App (Codec, Befehle, Transport, Stores, UI) | Web Serial | Simulationsmodus (Dry-run) standardmäßig und Schreiben bis zum „Scharfschalten“ gesperrt; `PS0`, `TX1` und `MX1` verlangen Scharfschaltung; keine Bestätigung pro Vorgang und keine automatische Sicherung [Semyonic-ftx1-programmer:src/store/connection.ts] [Semyonic-ftx1-programmer:src/cat/transport.ts] | Schreibvorgänge und Abfragen serialisiert |
| byf3332-Yaesu-FTX1-Cat-Tunnel | **Tunnel**: Brücke USB seriell zu rohem TCP; Vordergrunddienst | TCP-Server auf Port **4532**, lauscht auf `0.0.0.0`, **ein Client gleichzeitig (ein neuer ersetzt den vorherigen)**; kein UDP, WebSocket, virtuelles COM oder rigctl | **Keine** (weder Authentifizierung noch Verschlüsselung) | TCP_NODELAY und Keepalive; USB-Lesen 200 ms, serielles Schreiben 2 s, TCP-Lesen 1 s; transparente Byte-Weitergabe [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatTcpBridge.kt] [byf3332-Yaesu-FTX1-Cat-Tunnel:app/src/main/java/com/byf3332/cattunnel/CatBridgeService.kt] |
| juanmmmmmmm-Look4Sat-FTX1 | Android; FTX-1-Controller in `core:data`, ein gemeinsamer USB-Controller | USB seriell | USB-Berechtigung zur Laufzeit | E/A-Mutex serialisiert Transaktionen; 1-s-Schleife [juanmmmmmmm-Look4Sat-FTX1:core/data/src/main/java/com/rtbishop/look4sat/core/data/injection/MainContainer.kt] |
| captobie-ftx1-remote | Remote-Suite mit `rigctld` von Hamlib (Mac/iOS/iPad, Windows, Pi als Relais), Audiostrom des Pi und CW-Relais | `rigctld` TCP 4532; CW TCP 8534; Audio Main links/Sub rechts | In den Notizen nicht bewertet | `post_write_delay` von 10 ms [captobie-ftx1-remote:CLAUDE.md] [captobie-ftx1-remote:Pi/README.md] |
| rigplane-rigplane-core | Asynchrone Multi-Funkgeräte-Bibliothek mit Weboberfläche; Backend `yaesu-cat` | USB CAT-1 (ohne LAN) | In den Notizen nicht bewertet | Abfrage in Stufen [rigplane-rigplane-core:rigs/ftx1.toml] |

Hinweise für dieses Projekt: Der TCP-Tunnel von BYF und der lokale Server von RZO
haben keine Authentifizierung; jede eigene Remote-Lösung sollte Authentifizierung
verlangen und den Zugriff auf das lokale Netz oder einen verschlüsselten Tunnel
beschränken.

## Übersicht pro Repository

| Ordner | Zweck | Sprache | Lizenz | Funktionen |
|---|---|---|---|---|
| captobie-ftx1-remote | Fernsteuerungs-Suite über Hamlib `rigctld` (Mac/iOS/iPad, Windows, Pi) mit Fehlern des CAT-Handbuchs | Swift, C#/WinUI3, Python, Arduino | MIT; die Hamlib-Binärdateien in `Vendor/` sind LGPL/GPL | Hamlib-Client 1051, Audio des Pi, CW-Relais (TCP 8534), Speicherliste und -scan, EX-Katalog, geprüfte Fehler |
| fritzsche-yaesu-ftx1 | Speicherprogrammierer: Repeaterlisten hoch- und herunterladen | JavaScript (Web Serial und Node-CLI) | Keine Upstream-Lizenz („wie besehen“); MIT-Erlaubnis laut Eigentümer, durch den Benutzer | CSV CHIRP und relais.dl3el.de, Strategien MW/AM/CT/CN, Download und Prüfung, Frequenzvalidierung |
| ew1abz-yaesu-ftx-1-control | TUI und Bibliothek für Abstimmung und Clarifier | Rust (`ftx1` und `ftx1-ctl`) | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer | `ID`/`FA`/`IF`/`OI`/`CF`, simuliertes Funkgerät, 38400, TOML-Speicher |
| ew1abz-yaesu-ftx-1-memory-manipulator | Sicherung und Wiederherstellung von Speichern per CSV (`ftx1-mm`) | Rust und Python | MIT (nur in `Cargo.toml`) | Lesen MR/MT/CN/MZ, Schreiben MW+AM, CHIRP-Konverter, Umnummerieren, CAT-Unterschiede 2507-B und 2508-C |
| gnfrazier-ftxcat | Python-Modul zur CAT-Steuerung (experimentell) | Python (pyserial) | MIT | Etwa 45 Funktionen (Frequenz, Betriebsart, PTT, Leistung, AGC, Messwerte, VFO/Speicher, Clarifier, CW, NB/DNR/DNF), Installationsanleitung USB/CAT, WSL2-Notizen |
| bg7nzl-ftx1ctl | Grafische Konsole mit Messwerten, Audio-Wasserfall, manuellem Notch und NET-rigctl-Server | Python | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer | CAT + PTT über RTS, Umrechnung der RM-Messwerte, Notch BP, Preamp PA, Leistung PC, rigctl TCP 4532 für WSJT-X/JTDX |
| rigplane-rigplane-core | Asynchrone Multi-Funkgeräte-Bibliothek mit Weboberfläche; FTX-1 über `yaesu-cat` | Python und Svelte/TS | MIT | Profil `rigs/ftx1.toml`, CAT-Audit gegen das Handbuch (89 Familien), USB-Anleitung, MAIN/SUB-Semantik |
| evertonma-FTX-1CAT_PR2EM | Desktop-Werkzeug für Steuerung, Speicher und Menü | Python (Tkinter, pyserial) | PolyForm Noncommercial 1.0.0 (nicht GPL-kompatibel; nur Referenz) | Schnellregler, Speichereditor mit CSV, EX-Menüeditor mit JSON-Sicherung, Simulator und Tests |
| evertonma-FTX-1CAT_PR2EM_Android | Android-Version: grundlegende CAT-Steuerung | Kotlin | PolyForm Noncommercial 1.0.0 | Frequenz, Betriebsart, Band, 4 Schieberegler, EX-Editor, USB-Port-Auswahl |
| Eugen68-Yaesu-FTX1-CAT-Control | Android-Suite für CAT, CW, RTTY und Logbuch | Java, ONNX und native Bibliothek | MIT | CW-Decoder mit KI, RTTY, ADIF-Logbuch, Cluster, PSK Reporter, USB-Audio, CW- und Sprachspeicher |
| iTracMan-FTX1WinController | Controller für Windows | C# / WPF | MIT | Vollständiges Funktionspanel, Messwerte, Nachrichten, Presets, lokales Audio, doppeltes COM, xUnit-Tests |
| pokibon3-FTX1Controller | Browser-PWA mit Web Serial | JavaScript (WASM für CW und FT8) | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer; `js/cwdec/` ist GPL | USB-Audio, Wasserfall, CW-Decoder und -Tastung, FT8/FT4, FUNC/EX-Menüs, Speicher, Offline-PWA, FT-991A-Profil |
| git-jcw-FTX-1-WebUI | Web-Serial-Oberfläche und Electron-Anwendung | JavaScript | MIT | Aus dem Audio abgeleiteter Wasserfall, 4 Messwerte, Tuner-Logik, Bandspeicher, begrenzte Leistung, simuliertes Funkgerät |
| rzochowski-cat-ftx1 | Lokales Web-Panel | Nuxt/Vue (TypeScript) und Node serialport | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer | Zustand über SSE, Scope-Regler, Presets, manueller CAT-Befehl, Server auf Loopback (CORS `*`, ohne Authentifizierung) |
| Semyonic-ftx1-programmer | Speicher- und Menüprogrammierer im Browser | TypeScript (JSX-Prototypen) | GPL-3.0 | Bearbeitung von Speichern und EX, Import CSV/ADMS-14/FT5D, Simulation und Scharfschaltung, Debug-Konsole |
| byf3332-Yaesu-FTX1-Cat-Tunnel | Android-Brücke USB seriell zu TCP | Kotlin | WTFPL 2 | Roher TCP-Tunnel 4532 ohne Authentifizierung, Filter 10C4:EA70 |
| juanmmmmmmm-Look4Sat-FTX1 | Satellitenverfolgung mit Doppler-Steuerung des FTX-1 | Kotlin (Android) | GPL-3.0 | Doppler MAIN/SUB im 1-s-Takt, CTCSS, Erkennung manueller Abstimmung, kein PTT per Software |
| Evgeny161rus-ftx1-region-tool | Liest und schreibt EEPROM und ändert den Regionscode per CAT | Python | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer | Undokumentierte Servicebefehle, EEPROM-Dump, automatische Sicherung, Oberfläche RU/EN. **ESCRIBE EN LA RADIO** **REGION/LIMITES TX** |
| Reid-n0rc-FTX-1_Firmware | Projekt zur Firmware-Analyse | Markdown, Java (Ghidra), Python, Shell | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer; die Firmware bleibt Eigentum von Yaesu | Aufgabentafel T01-T11 ohne Ergebnisse, Ghidra-Skripte. **FIRMWARE** |
| sq9pd-Yaesu-FTX-1-mod | Offline-Patcher für Firmware MAIN 01-13 / DISPLAY 01-10 | Python und JavaScript | Keine Upstream-Lizenz; MIT-Erlaubnis laut Benutzer | Tastenseiten, SWR SCAN, Patchen mit Fingerabdruckprüfung. **FIRMWARE** |
| radiohyperactivity-ftx1-front-cover | Selbstgebaute schützende Frontabdeckung für FTX-1 Field | CAD (FreeCAD, STL, SVG) | GPL-3.0 | PE-Schaumvorlagen, druckbare Gehäuse von 20 bis 40 mm |
| hatandspecs-ftx1-tuner-sweep | VFO-Durchlauf, der einen externen Tuner auslöst | Python (Flask) und HTML | MIT | FA/AC/RI/PC/MD, Bänder nach Lizenz, Spielraum von 1 kHz, festes Warten. **SENDET** |

Die Lizenzen der Spalte Lizenz stammen aus `third_party/ftx1/SOURCES.md`.
Die MIT-Erlaubnis „laut Benutzer“ liegt in diesem Repository nicht schriftlich
vor [SOURCES.md]. Der PolyForm-Noncommercial-Code (evertonma) wird nur als
Referenz aufbewahrt und nicht in dieses GPL-3.0-Projekt kopiert [SOURCES.md].
## Vergleich mit Bricohams

Was existiert, stammt aus den Notizen dieses Projekts: das Web-/Desktop-Werkzeug
(`ftx1.html`, `ftx1-core.js`, `ftx1-menu.js`, `ftx1-ui.js`) über Web Serial und
RadiCodex auf Android (`RigActivity`, `YaesuFtx1` und `Ftx1Rig` in
`RigProtocols.kt`). Jedes Schreiben wird vor dem Senden auf Bereich geprüft und
durch erneutes Lesen verifiziert. Regeln dieser Arbeit: nur Empfang und VFO;
nichts aktiviert den Sender.

Werte von „Stand in diesem Zweig“: „Bereits vorhanden“, „Hinzugefügt“ (geplante
Funktionen) oder „Außerhalb des Umfangs (Grund)“.

| Funktion | Repos, die sie haben | Web/Desktop | Android | Stand in diesem Zweig |
|---|---|---|---|---|
| Verbinden und identifizieren (`ID;` = `ID0840;`, `AI0;`) | Fast alle | Ja | Ja | Bereits vorhanden |
| VFO-A/B-Frequenz lesen | Fast alle | Ja (`FA;`/`FB;`) | Ja | Bereits vorhanden |
| VFO-A/B-Frequenz mit Prüfung setzen | Fast alle | Nur API, ohne Bedienelement in der Oberfläche | Ja | Hinzugefügt (VFO-Panel im Web); auf Android bereits vorhanden |
| MAIN-Betriebsart (`MD0 m;`) | Fast alle | Nein | Ja | Hinzugefügt (Web, mit erneutem Lesen); auf Android bereits vorhanden |
| Split `ST0`/`ST1` | ITM, Look4Sat, SEM, rigplane | Nein | Ja (Satellitenverfolgung) | Hinzugefügt (Web); auf Android bereits vorhanden |
| Speicher 1-999 lesen und schreiben | fritzsche, ew1abz-memory, PR2EM, SEM, POK | Ja | Ja (einzeln) | Bereits vorhanden |
| JSON-Sicherung/-Wiederherstellung und CSV der Speicher | ew1abz-memory, fritzsche, PR2EM, SEM | Ja | Nein | Bereits vorhanden (Web). Android: außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| EX-Menü: lesen, schreiben, Sicherung und Unterschiede | PR2EM, SEM, POK, captobie, RZO | Ja (schreibgeschützte Elemente abgelehnt) | Nein | Bereits vorhanden (Web). Android: außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| AF, RF, SQL, Bandbreite, IF-Shift, AGC, Preamp, Abschwächer und Leistung (Web) | gnfrazier, rigplane, WebUI, ITM, bg7nzl | Ja, mit erneutem Lesen | - | Bereits vorhanden |
| AF, RF, SQL, Bandbreite, IF-Shift, AGC, Preamp, Abschwächer und Leistung (Android) | Dieselben | - | Vorhanden in `Ftx1Rig`, aber ohne Bildschirm | Hinzugefügt (Anbindung in `RigActivity`) |
| Messwerte `RM1`-`RM8` (Web) | WebUI, bg7nzl, PR2EM, ITM, rigplane | Ja, jede Sekunde | - | Bereits vorhanden |
| Messwerte `RM1`-`RM8` (Android) | Dieselben | - | Nur S-Meter MAIN | Hinzugefügt (in `RigActivity`; `supportsMeter` und `supportsRfPower` für `Ftx1Rig`) |
| Noise Blanker `NL` (OFF/001-010) | gnfrazier, PR2EM, WebUI | Nein | Nein | Hinzugefügt (Web und Android) |
| DNR `RL` (OFF/01-10) | gnfrazier, PR2EM, EUG, ITM | Nein | Nein | Hinzugefügt (Web und Android) |
| Auto-Notch `BC` OFF/ON | WebUI, ITM, rigplane | Nein | Nein | Hinzugefügt (Web und Android) |
| Manueller Notch `BP` (Zustand P2=0; Frequenz 001-320 x10 Hz mit P2=1; in FM ist die nicht numerische Antwort null) | bg7nzl, WebUI, ITM, rigplane | Nein | Nein | Hinzugefügt (Web und Android) |
| Narrow `NA` OFF/ON | gnfrazier, WebUI, SEM | Nein | Nein | Hinzugefügt (Web und Android) |
| Clarifier `CF` (ein/aus und Ablage -9999..+9999 Hz) | gnfrazier, ew1abz-control, ITM | Nein | Nein | Hinzugefügt (Web und Android) |
| CW-Geschwindigkeit `KS` (4-60 WPM) | gnfrazier, WebUI, ITM, EUG | Nein | Nein | Hinzugefügt (Web und Android) |
| Panelsperre `LK` OFF/ON | gnfrazier, SEM, RZO, POK | Nein | Nein | Hinzugefügt (Web und Android) |
| Split-Speicher `MZ` | ew1abz-memory, SEM | Nein | Ja | Bereits vorhanden (Android). Web: außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| PMS, 5-MHz-Band, EMGCH | ew1abz-memory, SEM | Nein | Nein | Außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| Einen Speicherkanal löschen | keines (kein dokumentierter Befehl) | Nein | Nein | Außerhalb des Umfangs (es gibt keinen dokumentierten Befehl) |
| PTT (`TX`/`MX`), CW-Tastung (`KY`, `PB`, CW-Relais) | bg7nzl, gnfrazier, EUG, captobie, ITM | Nein | Vorhandener PTT-Test von 3 s | Außerhalb des Umfangs (aktiviert den Sender) |
| Tuner-Start (`AC` P3=3) und Tuner-Sweep | WebUI, ITM, hatandspecs | Nein | Nein | Außerhalb des Umfangs (aktiviert den Sender) |
| Bandwechsel `BS`/`BU`/`BD` und Tausch `AB`/`BA`/`SV` | PR2EM, ITM, WebUI, SEM, POK | Nein | Nein | Außerhalb des Umfangs (nur Setzen, nicht überprüfbar) |
| `SPR`/`SPW` (Service-EEPROM) | Evgeny161rus-ftx1-region-tool | Nein | Nein | Außerhalb des Umfangs (schreibt Service-EEPROM) |
| Änderung von Region und TX-Grenzen | Evgeny161rus-ftx1-region-tool | Nein | Nein | Außerhalb des Umfangs (ändert die TX-Bänder, Recht und Garantie) |
| Kalibrierung | keines (nur Reset/Kalibrierung im EX-Menü) | Nein | Nein | Außerhalb des Umfangs (Risiko des Kalibrierverlusts) |
| Firmware- oder Patch-Upload | sq9pd, Reid-n0rc | Nein | Nein | Außerhalb des Umfangs (kann das Funkgerät unbrauchbar machen) |
| Satelliten-Doppler | Look4Sat-FTX1 | Nein | Verfolgung über `RigTracker` (FA, FB, ST) | Bereits vorhanden (Android). Web: außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| Scope, Wasserfall und USB-Audio | WebUI, POK, ITM, RZO | Nein | Nein | Außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| Decoder (CW, RTTY, FT8) und Logbuch | EUG, POK | Nein | Separates Digitalmodul FT8/FT4 | Außerhalb des Umfangs (in diesem Zweig nicht geplant) |
| TCP-Tunnel/rigctl und Fernzugriff | BYF, bg7nzl, captobie, RZO | Nein | Nein | Außerhalb des Umfangs (in diesem Zweig nicht geplant; ohne Authentifizierung in den Referenzen) |
| Uhr `DT`, Anzeige `DA`, Sprachspeicher `LM`/`PB` und Tastenspeicher `KM` | SEM, ITM, EUG | Nein | Nein | Außerhalb des Umfangs (**ESCRIBE EN LA RADIO** ohne Notwendigkeit für Empfang/VFO) |

Zusammenfassung der geplanten Funktionen: Sie betreffen nur Empfang und VFO, jedes
Schreiben wird vor dem Senden auf Bereich geprüft und durch erneutes Lesen
verifiziert, und nichts aktiviert den Sender. Im Web: `NL`, `RL`, `BC`, `BP`, `NA`,
`CF`, `KS`, `LK` (P1: 0 = MAIN, 1 = SUB), das VFO-Panel (Frequenz A/B mit der
vorhandenen API, MAIN-Betriebsart mit `MD0 m;` und erneutem Lesen) und Split
`ST0`/`ST1`. Auf Android: die Einstellungen von `Ftx1Rig` (AF, RF, SQL,
Bandbreite, IF-Shift, AGC, Preamp, Abschwächer und Leistung) und die Messwerte
`RM1`-`RM8` an `RigActivity` anbinden und `supportsMeter` und `supportsRfPower`
für `Ftx1Rig` melden. Absichtlich ausgeschlossen: PTT/KY/CW-Tastung, Tuner-Start,
`BU`/`BD`/`SV`/`AB`/`BA`, `SPR`/`SPW`, Änderungen von Region oder TX-Grenzen,
Kalibrierung und Firmware-Upload.
