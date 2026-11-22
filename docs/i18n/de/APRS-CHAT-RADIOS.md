# APRS-Chat auf den von RadiCodex unterstützten Funkgeräten

Status des APRS-Chats (Bildschirm **APRS-Chat** im Hauptmenü). Der Chat spricht nur **KISS**: Er nutzt `Aprs.kt` (`Kiss`, `KissDecoder`, `Ax25Frame`, `AprsText`, `AprsMessenger`) über einen `KissLink` (`KissLink.kt`). Ein Funkgerät ohne von der App erreichbares APRS/KISS wird **nicht simuliert** und erscheint nicht als Chatquelle. Dieselbe Tabelle wird in der App angezeigt (`AprsChatRadios.kt`).

Verfügbare Verbindungen:

- **RT-950 Pro (KISS über BLE)**: `Rt950BleKissLink`, über `BleRt950Transport` (`ffe1`). Das Verhalten der Frames ist dasselbe wie vor der Auslagerung des Chats aus `Rt950Activity`.
- **KISS TCP (externer TNC)**: `TcpKissLink`, unverschlüsselter TCP-Socket zu einem vom Benutzer eingegebenen Host und Port (Direwolf, eine TNC-Brücke). Das ist der generische Weg für Funkgeräte ohne natives KISS; das Funkgerät wird von diesem TNC verwaltet, nicht von RadiCodex. Verbindungszeitlimit 5 s, Lesen mit Zeitlimit von 500 ms, Socket wird beim Verlassen des Bildschirms geschlossen.

## Status pro Funkgerät

| Funkgerät | APRS/KISS-Weg | Status | Quelle |
| --- | --- | --- | --- |
| Radtel RT-950 Pro, Empfang | KISS über BLE (`ffe1`), mit am Funkgerät aktivierten Optionen „KISS TNC over BLE (RX)/(TX)“ | Funktest ausstehend | der Text `strings_rt950.xml:57` führt ihn als verifiziert, aber es gibt keinen aufgezeichneten Test dieser Version an einem Funkgerät; `Rt950Ble.kt:23-27`; `ACKNOWLEDGEMENTS.md:34` |
| Radtel RT-950 Pro, HF-Senden | KISS über BLE | **standardmäßig deaktiviert (Firmware-Blockade)**; nur mit dem Schalter „Experimentelles TX“ (Erweitert) | `strings_rt950.xml:57` (TX „SCHLUSSFOLGERUNG nicht verifiziert“); lalmonte/radiochat-aprs@9c7b092; erkanz/radtel-RT950PRO@51c84d4; SP3ARK/Radtel-950-Pro-Bluetooth-Programmator@a8bb41a `README.md:235-238`; Vorfall vom 2026-11-12 |
| Beliebiges Funkgerät + externer KISS-TNC | KISS über TCP | Funktest ausstehend | `KissLink.kt` (`TcpKissLink`); Unit-Test mit `ServerSocket` in `AprsChatTest.kt` (kein Funktest) |
| Quansheng UV-K5 / BricoHams Satellite | keiner in RadiCodex (Klonen/CAT) | nicht unterstützt | `Diagnostics.kt:12` |
| Quansheng UV-K10 Pro | keiner; APRS nur als Firmware-Plan, ohne Firmware | nicht unterstützt | `docs/UV-K10-PRO-VIABILIDAD.md:7,55` |
| Quansheng TK-11 | keiner (Klonen im Web) | nicht unterstützt | `docs/TK11-INGENIERIA.md` (ohne APRS/KISS) |
| OpenGD77 (GD-77, GD-77S, DM-1801, RD-5R, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017, DM-32, UV008) | nur eine APRS-FM-TX-Bake in der Firmware; ohne AX.25-Empfang oder TNC | nicht unterstützt | `OpenGd77.kt:25-38`; `docs/AYUDA-OPENGD77.md:384-386` |
| AnyTone D878 | keiner; nur Kanalvorlage | nicht unterstützt | `ChannelTemplates.kt:39,265`; `docs/AYUDA-ANYTONE.md` |
| Yaesu FT-817/818/857/897 | nur CAT | nicht unterstützt | `RigCat.kt:15-18` |
| Yaesu FTX-1 | nur CAT in RadiCodex | nicht unterstützt | `RigCat.kt:21`; `Diagnostics.kt:13` |
| Icom IC-705 (CI-V) | nur CAT in RadiCodex | nicht unterstützt | `RigCat.kt:19` |
| (tr)uSDX, QRP Labs QMX/QMX+ und QDX/QDX-M | nur CAT (HF) | nicht unterstützt | `RigCat.kt:23-26` |

„Nicht unterstützt“ bedeutet, dass RadiCodex heute keinen APRS/KISS-Weg für dieses Funkgerät hat, nicht dass der Hardware APRS fehlt. Bietet die Hardware einen eigenen KISS-TNC (zum Beispiel über Bluetooth oder USB), erreicht RadiCodex ihn nicht: **Quelle ausstehend**. Mit einem externen TNC im Netzwerk wird der TCP-Weg verwendet.

## RT-950 Pro: Senden

- Dass der BLE-Schreibvorgang bestätigt wird, **beweist nicht**, dass das Funkgerät per HF sendet. Das Senden muss mit einem **zweiten Empfänger** bestätigt werden.
- Laut dem README von [lalmonte/radiochat-aprs@9c7b092](https://github.com/lalmonte/radiochat-aprs/tree/9c7b092) akzeptieren manche Firmwares den KISS-Schreibvorgang, ohne den PTT zu aktivieren.
- [erkanz/radtel-RT950PRO@51c84d4](https://github.com/erkanz/radtel-RT950PRO/tree/51c84d4) berichtet von funktionierendem TX mit einer gepatchten v0.29.
- Beide READMEs werden so zitiert, wie sie im Auftrag genannt wurden; RadiCodex hat weder ihren Inhalt noch ihre Lizenzen geprüft (**Quelle ausstehend**; es wird kein Code wiederverwendet).
- Der Chat schreibt nicht in den Speicher des Funkgeräts. Die Kanäle 961–990 (`0x7800–0x7BFF`) bleiben geschützt, wie in `docs/RADTEL-RT950-PRO.md` angegeben.

## Sendesicherheit

- Vor jedem Senden zeigt die App eine Warnung, dass die Nachricht **per HF gesendet wird**, mit Absender, Empfänger, Text und dem Hinweis zur Verbindung, und verlangt eine Bestätigung.
- Das eigene Rufzeichen ist Pflicht und wird mit `Ax25Address.isValid` validiert (1–6 Zeichen A–Z/0–9, SSID 0–15). Die automatische Empfangsbestätigung (ack) wird ohne gültiges Rufzeichen ebenfalls deaktiviert.
- Ohne ack sendet `AprsMessenger` bis zu 3-mal alle 30 s erneut (`Aprs.kt`).
- Bereits im Repository vorhandene Grenzen: Text von 1 bis 67 ASCII-Zeichen ohne `{ | ~` (`AprsText`), Pfad mit bis zu 8 Repeatern (`Ax25Frame.encode`).
- Grenzen der RT-950-Pro-Verbindung laut dem README von erkanz/radtel-RT950PRO@51c84d4 (sie stehen nicht im Repository): höchstens 182 AX.25-Bytes, 6 Repeater und 127 Informationsbytes. Sie werden in `Rt950BleKissLink` durchgesetzt (`Ax25Limits.RT950`). Für einen generischen TCP-TNC gilt nur die Grenze von 8 Repeatern; weitere Grenzen: **Quelle ausstehend**.
- Senden erfordert eine Amateurfunklizenz.
- **RT-950 Pro, standardmäßig nur Empfang:** `Rt950BleKissLink.send()` weigert sich zu schreiben, außer der Schalter „Experimentelles TX (Risiko einer Firmware-Blockade)“ (Erweitert, deaktiviert, mit Warnung) ist aktiv. Ohne ihn gibt es auch kein automatisches ack und keine erneuten Sendungen. Erneute Sendungen werden sofort abgebrochen, wenn die BLE-Verbindung schließt oder ein Schreibvorgang fehlschlägt. Der KISS-TCP-TNC ist nicht betroffen.
- Nach jeder Klon-/Kopier-/Schreibsitzung (`Rt950Activity`) wird verlangt, das Funkgerät aus- und wieder einzuschalten, bevor KISS verwendet wird; die Warnung erscheint auch im Chat, bis der Benutzer „Ich habe das Funkgerät neu gestartet“ bestätigt.

## Quelle ausstehend

- Inhalt und Lizenz der READMEs von lalmonte/radiochat-aprs@9c7b092 und erkanz/radtel-RT950PRO@51c84d4 (zitiert, nicht geprüft).
- HF-Senden des RT-950 Pro mit der Option „KISS TNC over BLE (TX)“ in jeder Firmware.
- Eigener KISS/APRS-Weg von FTX-1, IC-705, UV-K10 Pro, AnyTone D878 und TK-11.
- AX.25-Grenzen eines konkreten externen TNC.

## Funktests

| Datum | Funkgerät | Test | Ergebnis |
|---|---|---|---|
| 2026-11-12 07:30 | Radtel RT-950 Pro (Firmware nicht identifiziert), S20 FE, KISS-Verbindung über BLE | APRS-Nachricht von EA5KAO an EA5KAO, „RadiCodex prueba APRS 1“, mit 3 Versuchen im Abstand von 30 s. Zweiter Empfänger: BricoHams-SDR, Empfänger 3, 144,800 MHz, Packet. | **Nicht aussagekräftig.** Die App schrieb den Frame über BLE, aber das Kontroll-SDR stand auf 436,795 MHz NFM (70-cm-Satellitenprofil) und nicht auf 144,800 MHz Packet, konnte ihn also nicht empfangen. |
| 2026-11-12 07:50 | Radtel RT-950 Pro (Firmware nicht identifiziert), mit dem APRS des Funkgeräts auf Kanal A bei 144,800 MHz | Dieselbe Nachricht, „RadiCodex prueba APRS 2“, mit 3 Versuchen. | **Nicht aussagekräftig.** Der Frame wurde über BLE geschrieben, aber das Kontroll-SDR stand weiterhin auf 436,795 MHz NFM und nicht auf 144,800 MHz Packet; mit dem Empfänger auf 144,800 Packet wiederholen. |
| 2026-11-12 09:44 | Radtel RT-950 Pro, APRS auf Kanal A bei 144,800 MHz | „RadiCodex prueba APRS 3“, 4 Versuche zwischen 09:44:10 und 09:45:40. Zweiter Empfänger: BricoHams-SDR, V3, Profil „144,800 MHz · APRS 2 m“, NFM mit sekundärer Packet-Dekodierung; Paketfenster vom Browser aus überwacht. | **Nicht empfangen.** Das Fenster zeigte in etwa 5 Minuten keinen Frame, weder von EA5KAO noch von anderen Stationen. Damit ist auch die Dekodierkette des SDR (2-m-Antenne des V3 und direwolf) nicht überprüft. Offen bleibt eine unabhängige Kontrolle: das SDR-Audio während des Sendens abhören oder die TX-LED des Funkgeräts beobachten. |
| 2026-11-12 10:13 | Radtel RT-950 Pro, neuer KISS-Modus (Commit 9064001): ohne `ff31`-Entsperrung, Schreiben auf **FF31** | „RadiCodex prueba APRS 4“, 4 Versuche. Reales GATT: MTU 23 (lehnt 247 ab), `ff31` nur Schreiben mit Antwort, `ffe1` Lesen, Schreiben mit und ohne Antwort sowie Benachrichtigung. | **Nicht empfangen** am SDR (V3, 144,800, Packet). |
| 2026-11-12 10:21 | Wie zuvor, Schreiben auf **FFE1** | „RadiCodex prueba APRS 5“, 4 Versuche. | **Nicht empfangen.** Das SDR hat seit 09:41 keinen APRS-Frame von irgendjemandem dekodiert: Die 2-m-Empfangskette des SDR bleibt ungeprüft. |
| 2026-11-12 10:24 | Radtel RT-950 Pro, ohne RadiCodex: Bake aus dem eigenen APRS-Menü des Funkgeräts gestartet, mit Kanal A bei 144,800 MHz | Referenzkontrolle. | **Das Funkgerät sendet nicht:** Die TX-LED leuchtet nicht und das SDR empfängt nichts. Mit dieser Konfiguration oder Firmware funktioniert das APRS-TX des Geräts nicht einmal aus seinem eigenen Menü. Deshalb erlauben die Tests 1–5 keine Bewertung von RadiCodex. |
| 2026-11-12 (nachmittags) | Radtel RT-950 Pro, Senden aus RadiCodex über KISS BLE | Senden einer APRS-Nachricht aus dem Chat. | **Vorfall: Die Firmware des Funkgeräts ist eingefroren** (Bericht des Benutzers). Seitdem ist die RT-950-Verbindung standardmäßig nur Empfang. |

**Fazit (2026-11-12):** Das APRS-TX des RT-950 Pro dieses Geräts ist **in seinem aktuellen Zustand nicht unterstützt**. Der Fehler liegt im Funkgerät (nicht identifizierte Konfiguration oder Firmware), nicht in RadiCodex. Bevor der Chat erneut getestet wird, muss erreicht werden, dass die eigene Bake des Funkgeräts die TX-LED aufleuchten lässt und an einem zweiten Empfänger erscheint, zum Beispiel durch Identifizieren der Firmware oder Ausprobieren des erkanz-Patches für die v0.29. Aus RadiCodex ist der KISS-Modus ohne Entsperrung zu verwenden (Commit 9064001).

## Abschlussdiagnose RT-950 Pro (2026-11-14)

Durchgeführt nach dem offiziellen Handbuch des Herstellers ([radtel-950PRO_2.pdf](https://cdn.shopify.com/s/files/1/0564/8855/8800/files/radtel-950PRO_2.pdf?v=1756451146), Menütabelle: APRS Set → 1. APRS ON/OFF; 5. Advanced → 5. TNC Type OFF/KISS; User Key → PF2 → Beacon TX):

| Prüfung | Ergebnis |
|---|---|
| APRS ON, TNC Type = KISS, Beacon Setup mit Rufzeichen und fester Position, PF2 = Beacon TX | Am Funkgerät konfiguriert |
| PTT A auf 145,500 MHz (Sprache) | **Sendet** (rote LED) |
| PF2 (Beacon TX) mit Kanal A auf 144,800 MHz | **Sendet nicht** (keine rote LED); das SDR (V3, 144,800 MHz, Packet) empfängt nichts |

**Fazit:** Das Funkgerät sendet auf Kanal A, strahlt aber kein APRS aus, nicht einmal seine eigene Bake. Es ist ein Fehler dieses Geräts oder seiner Firmware (nicht identifizierte Version), nicht von RadiCodex. In RadiCodex bleibt das TX zum RT-950 standardmäßig deaktiviert, die KISS-Verbindung ist nur Empfang. Für einen neuen Versuch muss die Firmware identifiziert und Radtel befragt oder eine Firmware ausprobiert werden, die APRS-TX dokumentiert, wie der erkanz-Patch für die v0.29.
