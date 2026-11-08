# F4HWN-(FH4)-Handbuch: Bricohams-Menüleitfaden

Referenzhandbuch zur F4HWN-(FH4)-Firmware für Quansheng UV-K5 und UV-K6:
Sperre, Hintergrundbeleuchtung und die 68 Menüs des Geräts. Bricohams-Ausgabe
vom 8-11-2026. [Vollständiges Handbuch als PDF](../../manuals/Manual_F4HWN_FH4_Bricohams_v2.pdf)
(13 Seiten; enthält den druckbaren Anhang mit der 3-seitigen Kurzübersicht,
Seiten 11-13). Das PDF ist auf Spanisch.

## Zuerst: ALL aktivieren

Drücken Sie MENU und wählen Sie `ALL`, bevor Sie diese Anleitung verwenden. Ohne
ALL erscheinen nicht alle Menüs.

1. Drücken Sie die MENU-Taste des Geräts.
2. Suchen Sie auf dem Auswahlbildschirm die Option ALL.
3. Bestätigen Sie ALL und rufen Sie dann das allgemeine Menü auf, um alle
   Optionen zu sehen.

Wenn Sie ALL nicht wählen, erscheint nur ein Teil der verfügbaren Menüs, die
sichtbare Nummerierung kann im Vergleich zu dieser Anleitung unvollständig
wirken und die Gesamtzahl der Optionen kann je nach Firmware-Version und Build
variieren. Verwenden Sie die Anleitung nach der Auswahl von ALL anhand des
Menünamens und nicht nur anhand der Nummer.

## Umfang und Nummerierung

F4HWN (FH4) ist eine von Armel, F4HWN, entwickelte angepasste Firmware für die
Quansheng-UV-K5-Familie und kompatible Varianten, einschließlich des UV-K6. Sie
bringt Verbesserungen bei Oberfläche, Empfang, konfigurierbaren Tasten, Suchlauf
und Energieverwaltung. Welche Funktionen verfügbar sind, hängt sowohl vom Gerät
als auch von den Build-Optionen ab.

Die 68 Einträge folgen der redaktionellen Reihenfolge des Handbuchs, nicht der
allgemeinen Nummerierung aller F4HWN-Versionen. Die tatsächliche Liste kann sich
zwischen Builds ändern. Suchen Sie Einstellungen immer über ihren Kurznamen
(Mnemonic), wenn die Nummer nicht übereinstimmt, und prüfen Sie `SysInf`, um zu
wissen, welcher Build installiert ist. Einige genannte Optionen sind bedingt
oder können andere Bezeichnungen zeigen.

Bricohams-Hinweis: Die Images dieses Web-Installers sind F4HWN v6.1.0 für
UV-K5 V3 / UV-K1 (Bricohams-Ausgaben in Slots). Menüs werden über ihr Mnemonic
gefunden, und die Optionen hängen vom Build ab.

Vom Handbuch selbst genannte Abweichung in der Nummerierung: Abschnitt 2.3 des
PDF nummeriert BLTime, BLMin und BLMax mit 38, 39 und 40, während die Tabelle
sie mit 36, 37 und 38 nummeriert. Diese Anleitung folgt der Tabelle.

## Kritische Menüs Schritt für Schritt

### KeyLck (30): automatische Sperre

1. Drücken Sie auf dem Hauptbildschirm MENU.
2. Suchen Sie `KeyLck` mit den Navigationstasten.
3. Drücken Sie MENU zum Bearbeiten und wählen Sie OFF oder eine Zeit zwischen
   00:15 und 10:00 in 15-Sekunden-Schritten.
4. Bestätigen Sie mit MENU und verlassen Sie das Menü mit EXIT.
5. Warten Sie die eingestellte Zeit ohne Tastendruck ab und prüfen Sie die
   Sperre. Zum Entsperren verwenden Sie die für Ihre Ausgabe vorgesehene
   Kombination; bei vielen Varianten ist es ein langer Druck auf F/#.

Tipp: 00:30-01:00 für den Transport; OFF für Dauerbetrieb. Der Umfang dieser
Sperre hängt von `SetLck` ab.

### SetLck (63): Umfang der Sperre

1. Öffnen Sie MENU und suchen Sie `SetLck`.
2. Drücken Sie MENU, um die Einstellung zu ändern.
3. Wählen Sie KEYS, um nur die Tasten zu sperren und PTT bedienbar zu lassen,
   oder KEYS+PTT, um auch die Sendetaste zu sperren.
4. Bestätigen Sie, verlassen Sie das Menü und testen Sie die Funktion sicher,
   ohne außerhalb der zugelassenen Frequenzen zu senden.

Tipp: KEYS+PTT verhindert versehentliches Senden beim Transport; mit KEYS lässt
sich PTT ohne Entsperren nutzen.

### BLTime, BLMin, BLMax und BLTxRx: Dauerlicht

1. Suchen Sie `BLTime` (36 in der Tabelle) und wählen Sie ON, um die
   Hintergrundbeleuchtung dauerhaft eingeschaltet zu lassen. Weitere Optionen:
   OFF oder 5 Sekunden bis 5 Minuten in 5-s-Schritten.
2. Rufen Sie `BLMin` (37) auf: Stellen Sie die minimale bzw. Ruhehelligkeit ein,
   normalerweise 0-9; beginnen Sie mit 0-2, um Energie zu sparen.
3. Rufen Sie `BLMax` (38) auf: Stellen Sie die Helligkeit bei Aktivierung ein,
   normalerweise 1-10; 3-5 ist ein praktischer Ausgangspunkt.
4. Prüfen Sie `BLTxRx` (39): OFF, TX, RX oder TX/RX; wählen Sie, welche
   Ereignisse die Beleuchtung aktivieren.
5. Bestätigen Sie jeden Wert und beobachten Sie das Display im Ruhezustand,
   beim Empfang und beim erlaubten Senden. Wenn es sich unerwartet ausschaltet,
   prüfen Sie die Werte der Mindesthelligkeit und die Kurzbefehle zum
   vorübergehenden Ausschalten.

Akkulaufzeit: Eine dauerhaft eingeschaltete Hintergrundbeleuchtung, besonders
bei hohen BLMin/BLMax-Werten, kann die Akkulaufzeit spürbar verkürzen.
BLTime=ON mit hoher Helligkeit entlädt den Akku schneller; für den täglichen
Gebrauch probieren Sie BLTime=10-20 s und geringe Helligkeit. ON ist nützlich
auf dem Tisch, bei geeigneter Stromversorgung oder wenn die Sichtbarkeit Vorrang
hat.

## Referenz der 68 Menüs

Funktionale Gliederung des Handbuchs. Die Nummerierung kann bei anderen Builds
abweichen; richten Sie sich immer nach dem Mnemonic.

### 01-13: grundlegende Funk-, Audio- und Sendeparameter

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 01 | `Step` | Abstimmschritt. | 0,01; 0,05; 0,1; 0,25; 0,5; 1; 1,25; 2,5; 5; 6,25; 8,33; 9; 10; 12,5; 15; 20; 25; 30; 50; 100; 125; 200; 250 und 500 kHz, je nach Build. |
| 02 | `Power` | Sendeleistung des Kanals. Die tatsächliche Leistung hängt von Frequenz, Akku und Kalibrierung ab. | USER, LOW1-LOW5, MID und HIGH. Näherungswerte: unter 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W und 5 W; USER übernimmt `SetPwr`. |
| 03 | `RxDCS` | Filtert den Empfang mit digitalen DCS-Codes. Muss zum empfangenen Signal passen. | OFF und normale (N) oder invertierte (I) Codes der verfügbaren Standardtabelle, z. B. D023N/D023I bis D754. |
| 04 | `TxDCS` | Sendet beim Senden einen DCS-Code. Bietet weder Privatsphäre noch Verschlüsselung. | OFF und DCS-Codes der Standardtabelle in Polarität N oder I. |
| 05 | `RxCTCS` | Öffnet das Audio nur, wenn der gewählte analoge CTCSS-Subton erkannt wird. | OFF oder genormte Töne von 67,0 bis 254,1 Hz, darunter 88,5, 100,0 und 123,0 Hz. |
| 06 | `TxCTCS` | Fügt dem gesendeten Audio den gewählten CTCSS-Subton hinzu; verwenden, wenn ein Repeater einen Zugangston verlangt. | OFF oder Standardtöne von 67,0 bis 254,1 Hz. |
| 07 | `TxODir` | Richtung der Sendeablage. | OFF (keine Ablage), + (sendet oberhalb von RX) oder − (unterhalb). |
| 08 | `TxOffs` | Größe der TX/RX-Ablage in MHz; in den Schritten des Geräts einstellbar. Beispiel: 0,600 MHz bei einem Repeater, der sie verlangt. | Nominell zwischen 0 und 999,99999 MHz je nach Bandgrenzen. |
| 09 | `W/N` | Kanalbreite. An Kanal und geltende Regeln anpassen. | WIDE (ca. 25 kHz) oder NARROW (12,5 kHz; kann die schmalere Einstellung von `SetNFM` verwenden). |
| 10 | `BusyCL` | Sendesperre bei belegtem Kanal. | OFF erlaubt PTT trotz erkannter Aktivität; ON verhindert das Senden, wenn der Kanal als belegt gilt. |
| 11 | `Compnd` | Audio-Kompander: komprimiert das Audio beim Senden und/oder expandiert es beim Empfang; beide Seiten sollten kompatibel sein. | OFF, TX, RX oder TX/RX. |
| 12 | `Mode` | Demodulationsmodus. Modi und Sendefähigkeit hängen von Hardware und Version ab. | FM, AM und, wenn der Build es enthält, USB. |
| 13 | `TXLock` | Kanalspezifische Sendesperre. | OFF erlaubt TX vorbehaltlich der übrigen Einschränkungen; ON macht den Kanal zu einem reinen Empfangskanal. |

### 14-23: Speicher, Kanäle und Suchlauflisten

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 14 | `ScAdd1` | Nimmt den aktuellen Kanal in Suchlaufliste 1 auf; er kann auch zu anderen Listen gehören. | OFF / ON. |
| 15 | `ScAdd2` | Nimmt den aktuellen Kanal in Suchlaufliste 2 auf. | OFF / ON. |
| 16 | `ScAdd3` | Nimmt den aktuellen Kanal in Suchlaufliste 3 auf. | OFF / ON. |
| 17 | `SList1` | Prioritäts-/Kanalparameter für Liste 1 bei Varianten, die diesen Eintrag anbieten. Die genaue Bedeutung kann variieren. | Programmierte Speicherkanäle (0-199) und Auswahl ohne Priorität je nach Ausgabe. |
| 18 | `SList2` | Prioritäts-/Kanalparameter für Liste 2; Bezeichnung auf dem Display prüfen. | Speicherplätze 0-199 und Deaktivierung der Priorität je nach Ausgabe. |
| 19 | `SList3` | Prioritäts-/Kanalparameter für Liste 3. | Speicherplätze 0-199 und Deaktivierung der Priorität je nach Ausgabe. |
| 20 | `SList` | Beim Start des Suchlaufs verwendete Liste. | LIST [0] (Kanäle ohne Liste), LIST [1], LIST [2], LIST [3], LISTS [1,2,3] oder ALL (alle Kanäle). |
| 21 | `ChSave` | Speichert Frequenz und Einstellungen des VFO in einem freien oder gewählten Speicher. Vor dem Bestätigen prüfen, da Daten überschrieben werden können. | Speicher 0-199. |
| 22 | `ChDele` | Löscht den gewählten Speicherkanal. Betrifft gespeicherte Daten: vor einem Massenlöschen eine Kopie mit CHIRP sichern. | Speicher 0-199. |
| 23 | `ChName` | Bearbeitet den angezeigten Namen eines Speicherkanals. | Speicher 0-199; bis zu 10 Zeichen in den dokumentierten Versionen: Buchstaben, Ziffern, Leerzeichen und einige Symbole. |

### 24-32: Tasten, Sperre und Energiesparen

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 24 | `ScnRev` | Verhalten bei Signalerkennung während des Suchlaufs. | STOP (anhalten), CARRIER (fortsetzen, wenn das Signal endet, mit wählbarer Wartezeit von 0,25 bis 20 s) oder TIMEOUT (nach 5-120 s fortsetzen, auch wenn das Signal anhält). |
| 25 | `F1Shrt` | Funktion des kurzen Drucks auf die Seitentaste F1. | Je nach Build: NONE, MONITOR, SCAN, POWER, FLASHLIGHT, VOX, FM RADIO, VFO A/B, VFO/MEM, LOCK KEYPAD, 1750 Hz, BACKLIGHT und weitere. |
| 26 | `F1Long` | Funktion des langen Drucks auf die Seitentaste F1; kann für Sperre oder Monitor reserviert werden. | Dieselben zuweisbaren Aktionsgruppen wie `F1Shrt`. |
| 27 | `F2Shrt` | Funktion des kurzen Drucks auf die Seitentaste F2. | Eine Aktion aus der verfügbaren Liste, z. B. SCAN, POWER, MONITOR, MUTE oder Wechsel des RX MODE. |
| 28 | `F2Long` | Funktion des langen Drucks auf F2. | Gleichwertige Zuweisungsoptionen, abhängig von den im Build aktivierten Funktionen. |
| 29 | `M Long` | Aktion des langen Drucks auf MENU. | Kann Taschenlampe, Suchlauf, VFO/Speicher-Wechsel, Sperre, Licht und weiteren von der Ausgabe vorgesehenen Funktionen zugewiesen werden. |
| 30 | `KeyLck` | Timer der automatischen Tastensperre. Der Umfang der Sperre wird in `SetLck` (63) festgelegt. | OFF oder von 00:15 bis 10:00 min in 15-s-Intervallen. |
| 31 | `TxTOut` | Maximale Dauer der Dauersendung (TOT). Läuft sie ab, wird TX unterbrochen; `SetTOT` steuert die Art der Warnung. | 5-s-Intervalle, typischerweise von 30 s bis 15 min je nach Firmware. |
| 32 | `BatSav` | Energiesparen des Empfängers. Höhere Werte begünstigen die Laufzeit, können aber die Erkennung kurzer Signale verschlechtern. | OFF oder Ruhe/Aktiv-Verhältnisse 1:1, 1:2, 1:3, 1:4 und 1:5. |

### 33-41: Anzeige, Hintergrundbeleuchtung und Kontrast

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 33 | `BatTxt` | Akkuinformation in der Oberfläche. | NONE (kein Text), VOLTAGE (Spannung in V) oder PERCENT (geschätzter Prozentwert). |
| 34 | `ChDisp` | Kanaldarstellung. Für die Anzeige ist ein gespeicherter Name nötig. | FREQ (Frequenz), CHANNEL NUMBER (Nummer), NAME (Name) oder NAME+FREQ. |
| 35 | `POnMsg` | Einschaltbild/-meldung; genaue Bezeichnungen je nach Ausgabe. | ALL/FULL (vollständige Information), SOUND, MESSAGE, VOLTAGE oder NONE. |
| 36 | `BLTime` | Dauer der Hintergrundbeleuchtung. ON erhöht den Verbrauch; `BLMin` und `BLMax` regeln die Helligkeit. | OFF, 5 s bis 5 min in 5-s-Schritten oder ON (immer an). |
| 37 | `BLMin` | Minimale bzw. Ruhehelligkeit. 0 reduziert sie auf das Minimum oder schaltet das Licht im Ruhezustand aus; ein höherer Wert verbraucht mehr. | Stufen 0-9 (einige Controller zeigen 0-10). |
| 38 | `BLMax` | Maximale Helligkeit bei aktivem Display. Verwenden Sie das lesbare Minimum; der Kontrast lässt sich separat mit `SetCtr` einstellen. | Stufen 1-10. |
| 39 | `BLTxRx` | Aktivierung der Beleuchtung während der Kommunikation; steuert die Einschaltereignisse beim Senden oder Empfangen. | OFF, TX, RX oder TX/RX. |
| 40 | `SetCtr` | LCD-Kontrast. Einstellen, um Lesbarkeit und Schattierung auszugleichen, besonders bei visueller Invertierung. | Werte 1-15. |
| 41 | `SetInv` | Invertiert das Erscheinungsbild des Displays. Ändert den Verbrauch der Beleuchtung nicht so wie `BLTime`. | OFF (normal) oder ON (invertiert). |

### 42-52: Signale, Töne und DTMF-Signalisierung

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 42 | `Beep` | Bestätigungston bei Tastendruck. | OFF / ON. |
| 43 | `Roger` | Hinweis beim Loslassen von PTT. Die Gepflogenheiten des Kanals beachten. | OFF, ROGER (Piepton) oder MDC (datenartige Signalisierung bei Builds, die sie anbieten). |
| 44 | `STE` | Unterdrückung des Rauschschwanzes am Ende einer Aussendung; benötigt Kompatibilität, um wirksam zu sein. | OFF / ON. |
| 45 | `RP STE` | Unterdrückung des Rauschschwanzes über einen Repeater. | OFF oder Verzögerungen 100-1000 ms (100-ms-Schritte), je nach Version. |
| 46 | `1 Call` | Schnellrufkanal, der dem Zugriff über eine kompatible Verknüpfung/Taste zugewiesen ist. | Speicher 0-199. |
| 47 | `UPCode` | DTMF-Zeichenfolge, die beim Drücken von PTT gesendet werden kann. | Bis zu 16 Zeichen, mit Ziffern 0-9 und zulässigen DTMF-Symbolen. |
| 48 | `DWCode` | DTMF-Zeichenfolge, die beim Loslassen von PTT gesendet werden kann. | Bis zu 16 Zeichen des zulässigen DTMF-Alphabets. |
| 49 | `PTT ID` | Zeitpunkt der Aussendung der DTMF-Kennung. | OFF, UP CODE, DOWN CODE, UP+DOWN CODE oder APOLLO QUINDAR (je nach Ausgabe). |
| 50 | `D ST` | Lokale Wiedergabe der DTMF-Töne beim Wählen. | OFF / ON. |
| 51 | `D Prel` | Vorlaufzeit der DTMF-Signalisierung; lässt die Verbindung sich stabilisieren, bevor Töne gesendet werden. | Werte 3-99 Einheiten zu 10 ms (30-990 ms). |
| 52 | `D Live` | DTMF-Decoder in Echtzeit auf dem Display. Erfordert hinreichend sauberen Tonempfang. | OFF / ON. |

### 53-60: System, Empfang und Feineinstellungen

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 53 | `VOX` | Sprachgesteuertes Senden. Mit Umgebungsgeräuschen testen; ein ungeeigneter Schwellwert führt zu unerwünschten Auslösungen. | OFF oder Empfindlichkeitsstufen 1-10. |
| 54 | `SysInf` | Systeminformationen, normalerweise nur lesbar: Firmware-Version und Daten wie Akkuspannung. Die genauen Informationen hängen vom Build ab. | Abfrage / nur lesbar. |
| 55 | `RxMode` | Verwaltung des Zweikanalempfangs: steuert, welcher VFO gehört wird und welcher sendet. | MAIN ONLY, DUAL RX RESPOND, CROSS BAND oder MAIN TX DUAL RX. |
| 56 | `Sql` | Squelch-Stufe. 0 lässt das Audio offen; hohe Stufen erfordern ein stärkeres Signal zum Öffnen des Squelch. | 0-9. |
| 57 | `SetPwr` | Legt die Leistung fest, die Power=USER verwendet (Nennwerte). | Unter 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W oder 5 W. |
| 58 | `SetPTT` | Verhalten von PTT. Bei ONEPUSH den TX-Zustand prüfen. | CLASSIC (zum Senden gedrückt halten) oder ONEPUSH (Umschalten per Tastendruck). |
| 59 | `SetTOT` | Art der Warnung vor dem TX-Zeitlimit. Ersetzt nicht die Einstellung `TxTOut`. | OFF, SOUND (Ton), VISUAL (Display) oder ALL (beides). |
| 60 | `SetEOT` | Hinweis am Ende der Aussendung. Unterscheidet sich von `Roger`, das dem gesendeten Audio Signalisierung hinzufügt. | OFF, SOUND, VISUAL oder ALL. |

### 61-68: erweiterte Oberfläche und Build-Optionen

| Nr. | Menü | Funktion | Optionen |
| --- | --- | --- | --- |
| 61 | `SetMet` | Stil der Signalstärkeanzeige (S-Meter). | TINY oder CLASSIC. |
| 62 | `SetGUI` | Stil/Größe der Hauptschrift des VFO. Ändert die Darstellung, nicht die Empfindlichkeit des Funkgeräts. | TINY oder CLASSIC. |
| 63 | `SetLck` | Umfang der Tastensperre. Arbeitet mit dem Timer `KeyLck` zusammen. | KEYS (nur Tasten) oder KEYS+PTT (Tasten und Sendetaste). |
| 64 | `SetTmr` | Anzeige der Empfangs-/Sendetimer. | OFF / ON. |
| 65 | `SetOff` | Automatisches Ausschalten des Geräts. | OFF oder wählbare Frist von 1 min bis 2 h, normalerweise in 1-min-Schritten. |
| 66 | `SetNFM` | Bandbreite, wenn `W/N` auf schmal steht. NARROWER ist nur in Builds vorhanden, die es enthalten. | NARROW (~12,5 kHz) oder NARROWER (~6,25 kHz). |
| 67 | `SetVol` | Einstellung der internen Verstärkung/Lautstärke; entspricht nicht dem physischen Lautstärkeregler. | Stufen 0-63 bei Builds mit ENABLE_FEAT_F4HWN_VOL. |
| 68 | `SetKey` | Neuzuweisung einer Sondertaste bei RescueOps-Varianten. Nicht in allen Builds verfügbar. | MENU, UP, DOWN, EXIT oder STAR. |

## Empfehlungen für den Betrieb

- Sichern Sie mit CHIRP eine Kopie der Speicher und der Konfiguration, bevor Sie
  flashen, wiederherstellen oder Kanäle löschen: [CHIRP-Modul F4HWN](AYUDA-QUANSHENG.md).
- CTCSS-/DCS-Töne wählen Signale aus: Sie bieten weder Privatsphäre noch
  Verschlüsselung noch die Gewähr eines freien Kanals.
- Beachten Sie stets die geltenden Band-, Leistungs- und Lizenzgrenzen. Die
  technische Fähigkeit, außerhalb eines Bandes zu senden, ist keine Erlaubnis.
- Wenn ein Eintrag die Nummer wechselt oder fehlt, prüfen Sie `SysInf` und
  ziehen Sie den installierten Build heran, bevor Sie die Einstellung deuten.

## Quellen

- Originalrepository: <https://github.com/armel/uv-k1-k5v3-firmware-custom>
- Definition von Liste und Optionen:
  <https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/ui/menu.c>
- Dokumentationsreferenz der Menüs:
  <https://deepwiki.com/armel/uv-k1-k5v3-firmware-custom/8.1-menu-item-reference>
- CHIRP-Treiber mit konfigurierbaren Werten:
  <https://github.com/armel/uv-k5-chirp-driver>

Redaktioneller Hinweis: unabhängige technische Anleitung, erstellt mit der
bereitgestellten grafischen Identität von Bricohams. Sie wird nicht als
offizielle Dokumentation des Entwicklers dargestellt. Bereiche und Funktionen
können je nach Build variieren.

[Quansheng und Versionen](AYUDA-QUANSHENG.md) · [F4HWN-Build-Optionen](AYUDA-OPCIONES-F4HWN.md) · [Bricohams-Firmware](BRICOHAMS-FIRMWARE.md)
