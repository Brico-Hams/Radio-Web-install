# Remote-CW, Tastatur/MIDI und Logbuch (`remote-cw.cjs`, `remote-log.cjs`, `remote-controls.js`)

Eigenes Design; die RemoteMyShack-Liste (`data/third-party/RMS-2026-11-22.md`) dient nur als Referenz.

## Remote-CW-Senden (Keyer des Funkgeräts)

| Funkgerät | Befehl | Quelle |
| --- | --- | --- |
| Yaesu FTX-1 | `KM{slot}{TEXT};` dann `KY0{slot};`, Stopp `KY00;`, bis 50 Zeichen | `docs/FTX1-KNOWLEDGE.md` Zeilen KM/KY |
| Icom IC-705 | CI-V `FE FE A4 E0 17 <ASCII> FD`, bis 30 Zeichen, Stopp = Daten `FF` | IC-705 CI-V-Handbuch S.3, S.5, S.18 |
| Andere sendefähige Katalog-Funkgeräte | Hamlib `rigctl b` / `\send_morse` | Nur Hamlib-Name; Unterstützung je Modell nicht belegt (teilweise) |
| Nativer Keyer Kenwood KY, Elecraft KY, QMX, (tr)uSDX, Flex, Hermes Lite 2 | pendiente de fuente | keine Quelle im Repository |

Der Text ist in Großbuchstaben und auf den belegten Zeichensatz beschränkt, die Dauer ist begrenzt (Standard 60 s, maximal 120 s). Senden ist standardmäßig aus, nur eine Nachricht gleichzeitig, wird abgelehnt solange der Sender gesperrt ist (SWR-Auslösung, Notstopp) und `stop()` ist immer erlaubt. Niemals ohne angepasste Last oder Antenne senden. Die Speicher F1-F8 ersetzen `{CALL}`, `{MYCALL}`, `{RST}` und `{NR}`.

## Logbuch

- ADIF-Import/-Export mit denselben Regeln wie der Android-Import: nur ASCII, 16 MB / 50000 Datensätze, keine doppelten Felder, Pflichtfelder CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD.
- Dupe-Prüfung nach Rufzeichen, Band und Modus. DXCC-, WAS- (nur DXCC 291), Locator- und POTA-Fortschritt wird aus den Logbuchfeldern gezählt; keine Präfixtabelle zur Ableitung von Entities.
- DX-Spots werden gegen das Logbuch als `new-call`, `new-slot` oder `worked` markiert.
- Grayline: Sonnenposition und Terminator zum Zeichnen über `data/world-land-110m.txt`.

## Tastatur und MIDI

MIDI-Note- und Control-Change-Nachrichten (MIDI-1.0-Format) werden auf Abstimm-, Band-, CW-Speicher- und Stopp-Aktionen abgebildet. PTT, Abstimmträger und Verstärker-Betrieb können nie zugewiesen werden. Esc stoppt immer. FlexControl-HID- und CTR2-MIDI-Gerätelayouts: pendiente de fuente (Zuweisungen legt der Betreiber fest).

## Agent und Konsole

Der Agent akzeptiert `{"cmd":"cw","text":"CQ TEST","wpm":20,"slot":5}` und `{"cmd":"cwstop"}` auf `POST /api/cmd`. `cwEnabled` in `remote-agent.json` ist standardmäßig `false`, `cwMaxSeconds` begrenzt die Nachricht. Eine Nachricht stoppt bei `cwstop`, bei jedem PTT-Loslassen oder SWR-Abschalten, wenn der Operator die Kontrolle verliert, wenn das Funkgerät trennt und wenn der Agent schließt. Die Konsole hat einen CW-Tab (Text, WPM, Speicher F1-F8, Esc zum Stoppen). Icom-Modelle laufen über die Hamlib-Basis, da kein CI-V-Transport über rigctld belegt ist.

## Unterstützungsmatrix pro Funkgerät

Vereinigung aus `data/remote-station-catalog.json`, den Python-Treibern und den Android-Profilen (`Profile.kt`). `ok` = belegter Befehl und angebunden; `partial` = nur als Hamlib-Basis `b` / `send_morse` belegt (Unterstützung je Modell ungeprüft; der Agent lehnt ab, wenn rigctld einen Fehler meldet); `pendiente de fuente` = keine Quelle im Repository, deaktiviert. Digitales Dekodieren/Senden (FT8/FT4/WSPR/CW/RTTY/PSK31/SSTV-Decoder auf dem Remote-Audio) ist noch nicht in die gemeinsame Schicht portiert: für alle Geräte `pendiente de fuente`.

| Funkgerät | Verbindung | CW senden | Keyer-Speicher | Digital dekodieren/senden |
| --- | --- | --- | --- | --- |
| Yaesu FTX-1 | rohes CAT (`KM`/`KY`) | ok | ok | pendiente de fuente |
| Icom IC-705 | CI-V-Plan (Handbuch S.3, S.5, S.18), über Hamlib gesendet | partial | partial | pendiente de fuente |
| Icom IC-7100, IC-7200, IC-7300, IC-7300MK2, IC-7410 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7600, IC-7610, IC-7700, IC-7760, IC-7800 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7850 / IC-7851, IC-905, IC-9100, IC-9700 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-R8600 | nur Empfänger | nicht zutreffend | nicht zutreffend | pendiente de fuente |
| FlexRadio FLEX-6400, 6400M, 6600, 6600M, 6700 | SmartSDR CAT über Hamlib `b`; nativer Keyer pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio FLEX-8400, 8400M, 8600, 8600M | SmartSDR CAT über Hamlib `b`; nativer Keyer pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio AURORA-510, 510M, 520, 520M | SmartSDR CAT über Hamlib `b`; nativer Keyer pendiente de fuente | partial | partial | pendiente de fuente |
| Kenwood TS-590S, TS-590SG, TS-890S, TS-990S | Hamlib `b`; natives `KY` pendiente de fuente | partial | partial | pendiente de fuente |
| Yaesu FT-710, FT-991A, FTDX10, FTDX101D, FTDX101MP, FTDX3000 | Hamlib `b`; natives `KY` pendiente de fuente (nur FTX-1 ist belegt) | partial | partial | pendiente de fuente |
| Elecraft K3S, K4 | Hamlib `b`; natives `KY` pendiente de fuente | partial | partial | pendiente de fuente |
| QRP Labs QMX / QMX+, QCX / QDX | Hamlib `b`; nativer Keyer pendiente de fuente | partial | partial | pendiente de fuente |
| DL2MAN (tr)uSDX | Hamlib `b`; nativer Keyer pendiente de fuente | partial | partial | pendiente de fuente |
| Hermes Lite 2 | piHPSDR-CAT über Hamlib `b` | partial | partial | pendiente de fuente |
| Yaesu FT-817, FT-818, FT-857, FT-897 (nur Android) | Fünf-Byte-CAT, kein Keyer-Befehl belegt | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Kenwood TH-D75 (nur Android) | CAT nur lesend | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Quansheng UV-K5, OpenGD77, Radtel RT-950 Pro / RT-S10, AnyTone D878, KISS-TNC (nur Android) | kein Remote-Shack-Pfad, kein CW-Keyer | nicht zutreffend | nicht zutreffend | pendiente de fuente |

Xiegu ist weder im Katalog noch in den Python-Treibern oder Android-Profilen enthalten, daher gibt es keine Zeile.

## Pendiente de fuente (deaktiviert)

QRZ.com-XML-Abfrage, TQSL-Kommandozeile (LoTW), DX-Cluster-Telnet-Zeilenformat, FT8/FT4/WSPR/CW/RTTY/PSK31-Decoder, SSTV in der Web-Konsole, DXCC-Präfixtabelle, FlexControl-HID.
