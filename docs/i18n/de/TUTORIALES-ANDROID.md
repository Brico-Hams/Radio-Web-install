# Anleitungen zu RadiCodex by BricoHams

Schritt-für-Schritt-Anleitung zur einzigen RadiCodex-by-BricoHams-APK (`org.bricohams.radicodex`, native Kotlin-App). Jede Anleitung nennt das Ziel, was du brauchst, die Schritte mit den genauen Bildschirmtexten, das erwartete Ergebnis und die üblichen Fehler. Der vollständige technische Umfang und die Einschränkungen stehen in [RadiCodex by BricoHams](ANDROID.md). Als experimentell gekennzeichnete Funktionen sind nicht mit einem echten Funkgerät validiert: Teste sie zuerst mit einer Kunstantenne oder nur im Empfang.

## Bevor du anfängst

### Installation und Voraussetzungen

**Ziel:** die APK installiert und lauffähig haben.

**Du brauchst:** ein Handy mit Android 8.0 (API 26) oder neuer. Die App braucht weder Server noch Konto.

1. Lade die APK herunter und prüfe ihren veröffentlichten SHA-256 (siehe [RadiCodex by BricoHams](ANDROID.md)).
2. Öffne die Datei im Dateimanager oder im Browser. Android fragt, ob die Installation aus dieser App erlaubt werden soll: Erlaube sie nur für diesen Schritt.
3. Die APK wird nicht über Google Play verteilt. Debug-APKs nutzen den Debug-Schlüssel; die Release-APK `RadiCodex-1.0.0.apk` ist nur dann mit dem Release-Schlüssel signiert, wenn die Release sie enthält (prüfe ihren SHA-256).
4. Öffne RadiCodex. Du siehst den Hinweis „Lokale Daten. Daten vor dem Deinstallieren exportieren."

**Erwartetes Ergebnis:** der Startbildschirm mit den Bereichen „Deine Funkstation", „Funk und Empfang", „Deine Daten und Sicherungen" und „Umfang und Datenschutz".

**Häufige Fehler:**

- Android blockiert die Installation: Die Erlaubnis, aus der App zu installieren, die die APK öffnet, fehlt.
- Das Deinstallieren der App löscht die lokalen Daten (private SQLite): Nutze vorher „Alle Daten als JSON exportieren".

### Berechtigungen und wofür sie angefordert werden

RadiCodex sammelt und sendet keine Daten. Das sind die Berechtigungen des Manifests und ihr Zweck:

| Berechtigung | Wofür sie verwendet wird |
| --- | --- |
| Standort (genau und ungefähr) | Eine einmalige GPS-Position im ARDF und „Letzte GPS-Position verwenden" bei Satelliten. Keine Verfolgung im Hintergrund |
| Mikrofon | Nur wenn du „Audioaufnahme starten" drückst oder SSTV in CAT Multi-Radio empfängst. Die Erlaubnis startet keine Aufnahme |
| Internet und Netzwerkstatus | HTTPS-Download von TLEs (CelesTrak) und Frequenzen (SatNOGS) und WLAN-Verbindung zum Rotor (192.168.4.1) |
| Bluetooth (Suchen und Verbinden) | AZ/EL-Rotor über BLE |
| USB-Host | Funkgeräte über OTG-Kabel. Android fragt für jedes Gerät nach und verbindet nie von selbst beim Anstecken |

Mikrofon, GPS, USB-Host, BLE und Kompass sind für die Installation nicht erforderlich: Ohne sie sind nur die zugehörigen Funktionen deaktiviert.

### Sprache wählen

1. Öffne auf dem Startbildschirm „RadiCodex-Sprache".
2. Wähle „Systemsprache", Español, English (US), Français oder Deutsch.

**Erwartetes Ergebnis:** Die Sprache wird auf dem Handy gespeichert und für alle Bildschirme übernommen. Rufzeichen, Kanalnamen und Benutzerdateien werden nicht übersetzt.

## Anleitungen

### 1. Logbuch

**Ziel:** Kontakte erfassen, suchen und Daten sicher verschieben.

**Du brauchst:** nur das Handy. Funktioniert offline.

**Einen Kontakt hinzufügen**

1. Öffne den Reiter „Logbuch". Für ein POTA- oder SOTA-Logbuch lege unter „Logbücher" eines an: Fülle den Logbuchnamen, „Park- oder Gipfelreferenz (leer bei Allgemein)" (Beispiele EA-0123 und EA4/MD-001) und „Mein Stationsrufzeichen" aus und drücke „Logbuch erstellen".
2. Gib „Rufzeichen" ein (3 bis 20 Zeichen: Buchstaben, Ziffern und /).
3. Lass das Feld „UTC ISO" leer, um beim Speichern die aktuelle Zeit zu verwenden, oder gib das Datum ein.
4. Fülle „Frequenz MHz", die Betriebsart, „Rapport gesendet", „Rapport empfangen" und „Notizen" aus.
5. Drücke „Neuen Kontakt speichern".

**Erwartetes Ergebnis:** Der Kontakt ist auf dem Handy gespeichert; Rufzeichen und Notizen werden geleert, Frequenz und Betriebsart bleiben erhalten. Gibt es dasselbe Rufzeichen, Band und dieselbe Betriebsart schon, erscheint eine Warnung mit „Nicht speichern" oder „Trotzdem speichern". Zum Bearbeiten tippst du den Kontakt an und nutzt „Kontaktänderungen speichern", „Bearbeitung abbrechen" oder „Diesen Kontakt löschen" (mit Bestätigung).

**Suchen**

1. Tippe in „Dieses Logbuch durchsuchen: Rufzeichen, Notizen, Modus oder Frequenz".
2. Drücke „Kontakte suchen"; um wieder alles zu sehen, „Alle Kontakte anzeigen".

Es werden die 50 neuesten Treffer angezeigt; Exporte enthalten das ganze Logbuch.

**ADIF mit Vorschau importieren**

1. Drücke „ADIF in dieses Logbuch importieren (Vorschau)" und wähle die Datei.
2. Prüfe die Vorschau: Sie listet die „Felder NICHT übernommen" und überspringt identische Kontakte. Nichts wird gespeichert, bevor du bestätigst.
3. Bestätige, um in einer einzigen Transaktion zu importieren.

Akzeptiert wird nur ASCII-ADIF bis 16 MiB und 50000 Kontakte. Mache vorher eine JSON-Sicherung.

**JSON-Sicherung und Wiederherstellung**

1. Sichern: „Alle Daten als JSON exportieren" (Startbildschirm) oder „Vollständiges JSON exportieren (mit Akzenten)" (Logbuch).
2. Wiederherstellen: „Bricohams-JSON-Sicherung importieren", Dialog „Lokale Sicherung importieren", „JSON wählen". Es wird nie überschrieben: Bei einem ID-Konflikt wird der gesamte Import abgebrochen.

**Export für LoTW**

1. Drücke „Dieses Logbuch als ADIF exportieren (ASCII)".
2. Signiere und lade die Datei mit TQSL auf einem Computer hoch: Diese APK lädt nicht zu LoTW hoch.

**Häufige Fehler:**

- Rufzeichen abgelehnt: Es muss Buchstaben, Ziffern und / enthalten.
- POTA- oder SOTA-Referenz im falschen Format (EA-0123, EA4/MD-001).
- ADIF mit UTF-8 oder Steuerzeichen: nicht akzeptiert; behalte das Original.

### 2. ARDF und GPS

**Ziel:** Sender-Beobachtungen mit der Handyposition festhalten.

**Du brauchst:** Standortberechtigung und freien Himmel für das GPS (optional: Speichern ohne Koordinaten ist möglich).

1. Tippe im Reiter „ARDF" bei „Name der neuen Sitzung" einen Namen ein und drücke „ARDF-Sitzung erstellen" (oder wähle eine Sitzung).
2. Gib „Sender (1-10)" und „Beobachtungsnotizen" ein.
3. Drücke „GPS-Position einmal abrufen (30 s)" und bestätige den Dialog „Position für ARDF". Warte auf die Position.
4. Drücke „Manuelle Beobachtung speichern".
5. Drücke „Statistik und Beobachtungen der Sitzung" zum Prüfen und „Sitzungen und Kontakte als JSON exportieren" zum Sichern.

**Erwartetes Ergebnis:** Die Beobachtung wird mit der Handyposition (nicht der des Senders) gespeichert, wenn eine aktuelle Position vorliegt; sonst ohne Koordinaten. Jede Position gilt nur für eine Beobachtung, simulierte Positionen werden verworfen. Die Statistik summiert GPS-Segmente mit Genauigkeit von 50 m oder besser, Alter von höchstens 30 s und Abstand von höchstens 120 s; sie ist keine vollständige Strecke.

**Häufige Fehler:**

- „Keine aktuelle Position nach 30 s": Suche freien Himmel oder aktiviere das GPS.
- GPS deaktiviert oder keine Berechtigung: Die Beobachtung wird ohne Koordinaten gespeichert.

### 3. USB-CAT-RX (F4HWN, experimentell)

**Ziel:** den Empfang einer Quansheng mit dem Bricohams-SAT-RX-v1-Image (Basis F4HWN v6+) abstimmen.

**Du brauchst:** ein USB-OTG-Datenkabel (CDC ACM oder ein Einzelport-Adapter CH34x, CP210x, FTDI oder Prolific). CAT läuft nur über USB, nicht über Bluetooth.

1. Aktiviere am Funkgerät SAT RX und drücke Taste 8 (`CAT READY RX`).
2. Öffne in der App „Experimentelles USB-CAT-RX öffnen" (Bildschirm „USB / CAT-Funkgerät") und drücke „USB-Gerät wählen".
3. Bestätige die USB-Berechtigung von Android.
4. Drücke „CAT RX abfragen", um den Zustand zu bestätigen.
5. Gib „RX-Frequenz MHz (bis zu 5 Dezimalstellen)" ein (10-Hz-Schritte, VHF 136-174 oder UHF 400-470) und drücke „RX abstimmen (wird bis STOP erneuert)".
6. Zum Beenden „STOP: zurück zum nominalen RX" und „USB trennen".

**Erwartetes Ergebnis:** Die App erneuert die Abstimmung alle 1,2 s; hört sie damit auf, kehrt das Funkgerät nach 3 s zum nominalen RX zurück. Die Tasten 4, 5 und 6 am Funkgerät führen zurück in den manuellen Modus.

**Doppler für einen Überflug:** Wähle bei Satelliten einen Überflug, verbinde CAT und drücke „Doppler für den gewählten Überflug starten" (nur innerhalb des Überflugfensters); „Verfolgung stoppen und USB trennen" beendet ihn.

**Häufige Fehler:**

- Kein Gerät: Prüfe OTG-Adapter, Kabel und Firmware; ein beliebiges Gerät wird nie verwendet.
- USB-Berechtigung abgelehnt oder abgelaufen: Wähle das Gerät erneut.
- USB getrennt: Wähle das Gerät erneut, bevor du CAT nutzt.

### 4. Quansheng-Kanaleditor (Beta)

**Ziel:** Name, Frequenzen, Subtöne und Leistung vorhandener FM-Kanäle auf F4HWN v6 ändern.

**Du brauchst:** ein USB-OTG-Kabel, Labs-Firmware v6.1 oder neuer (F4HWN v6.0 ist nur lesbar) und 10 bis 20 Minuten für die Sicherung.

1. Öffne „Quansheng-Kanäle über USB bearbeiten (Beta)" („Quansheng-Kanäle") und drücke „1. USB-Gerät wählen und verbinden".
2. Drücke „2. Vollständige Sicherung (Flash 2 MiB, 10-20 min)". Die Sicherung wird im privaten Speicher der App mit SHA256SUMS gespeichert und geprüft; kopiere sie vom Handy herunter.
3. Drücke „3. Kanäle aus dem Funkgerät lesen".
4. Drücke „4. Kanal wählen" und bearbeite Name (1-10 ASCII), RX (MHz), TX (MHz), RX-Ton und TX-Ton (OFF, CTCSS in Hz wie 88.5, oder DCS wie D023N / D023I), Leistung (USER, LOW1-LOW5, MID, HIGH), Schmalband (12,5 kHz) und „TX auf diesem Kanal sperren".
5. Drücke „5. Änderungen auf die lokale Kopie anwenden".
6. Drücke „6. Ins Funkgerät schreiben und zurücklesen" und bestätige den Dialog „Kanäle ins Funkgerät schreiben".
7. Starte das Funkgerät danach neu.

**Erwartetes Ergebnis:** „Schreiben durch Zurücklesen verifiziert". Das Schreiben ist nicht gegen Stromausfall gesichert: Trenne das Funkgerät nicht und schalte es nicht aus.

**Häufige Fehler:**

- „Schreiben blockiert": Die vollständige, geprüfte Sicherung dieser Sitzung fehlt.
- Jeder Fehler, jede Trennung oder das Verlassen des Bildschirms macht die Sitzung ungültig: neu verbinden und die Sicherung wiederholen.
- RX und TX müssen im selben Band liegen (136-174 oder 400-470 MHz).
- Prüfe, dass Frequenzen, Töne und Leistung für dich zulässig sind.

### 5. OpenGD77 über USB

**Ziel:** den Bildschirm eines OpenGD77-Funkgeräts sehen und seine Uhr auf UTC stellen.

**Du brauchst:** ein OpenGD77-Funkgerät und ein OTG-Datenkabel.

1. Öffne „OpenGD77 über USB: Bildschirm und Uhr" und drücke „USB-Gerät wählen"; bestätige die Berechtigung.
2. Die App zeigt Modell, Firmware und „USB-Funktionen" mit „Unterstützt" oder „Nicht unterstützt".
3. Drücke „Bildschirm erfassen", um den Bildschirm des Funkgeräts zu sehen.
4. Drücke „UTC-Uhr synchronisieren" und öffne das Satellitenmenü des Funkgeräts erneut, um die Überflüge neu zu berechnen.
5. Nutze „Verbindung prüfen" zum Testen und „USB trennen" zum Beenden.

**Erwartetes Ergebnis:** „Bildschirm erfasst.", „Uhr gesendet" oder „Verbindung in Ordnung.". OpenGD77 hat kein Abstimm-CAT über USB: keine Frequenz, Betriebsart, Kanal, PTT oder Doppler vom Handy, und der Flash wird nie beschrieben.

**Häufige Fehler:**

- „Kein USB-CDC-Funkgerät verbunden": Verwende ein OTG-Datenkabel.
- Unbekannte Kennung: Die App nimmt kein Modell an.

### 6. CAT Multi-Radio

**Ziel:** Frequenz, Betriebsart, Speicher, Satelliten und digitale Betriebsarten eines Funkgeräts über USB steuern.

**Du brauchst:** ein USB-OTG-Kabel oder die Schnittstelle des Funkgeräts. Modelle in der Liste „Gerätemodell": Yaesu FT-817/FT-817ND, FT-818ND, FT-857/FT-857D, FT-897/FT-897D (4800 Baud), Icom IC-705 (115200, CI-V-Adresse standardmäßig A4), Yaesu FTX-1 (38400, MAIN-Firmware 1.08 oder neuer, Port Enhanced COM CAT-1) und (tr)uSDX (115200 mit Firmware 2.00t oder neuer; 38400 als Rückfall). Die physischen Tests stehen aus: Diese Geräte sind nicht zertifiziert.

**Verbinden und abstimmen**

1. Öffne „CAT Multi-Radio (FT-817, FT-857, IC-705, FTX-1, (tr)uSDX)" („Bricohams CAT Multi-Radio").
2. Wähle unter „Funkgerät" das „Gerätemodell", prüfe „Baudrate" (beim IC-705 auch „CI-V-Adresse (hex)"), drücke „USB-Gerät wählen" und „Verbinden".
3. Gib unter „Frequenz und Betriebsart" die „Frequenz (MHz)" ein und drücke „VFO A setzen" oder „VFO B setzen".
4. Wähle „Betriebsart" (LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV) und drücke „Betriebsart setzen"; „Lesen" aktualisiert die Anzeige.
5. „PTT-Test 3 s" öffnet den Dialog „PTT-Test": Er verlangt ein Rufzeichen, sendet 3 s und braucht eine passende Antenne oder Kunstantenne.

**Speicher**

1. Gib unter „Speicher" „Von Kanal" und „Bis Kanal" an (höchstens 100 pro Lesevorgang; Grenzen IC-705 0..99, FTX-1 1..999, übrige 1..99) und drücke „Speicher lesen".
2. Nur IC-705 und FTX-1 können Speicher lesen. FT-817/857/897 und (tr)uSDX nicht.
3. Das Antippen einer Zeile bietet „Abstimmen" (wirkt auf VFO A) und, nur beim FTX-1, „Bearbeiten".
4. Speicher schreiben (nur FTX-1): „Neuer Kanal" oder „Bearbeiten" öffnet „Speicherkanal" mit Kanal, RX-Frequenz (MHz), Betriebsart, „Name (max. 12 Zeichen)" und „Split-TX-Frequenz (MHz, leer = Simplex)". Drücke „Speichern"; enthält der Kanal schon Daten, musst du das Ersetzen bestätigen.

**Erwartetes Ergebnis:** „Kanal N gespeichert und geprüft." nach dem Zurücklesen.

**Satellit und im Speicher ablegen**

1. Drücke bei einem Überflug in Satelliten „In CAT Multi-Radio öffnen", oder gib „Downlink (MHz)", „Uplink (MHz, optional)" und „Doppler-Schritt (Hz)" ein (1 bis 5000, Standard 100).
2. Drücke „Verfolgung starten"; „Verfolgung stoppen" beendet sie. Mit Uplink wird Split verwendet; die FT-817-Familie programmiert den Uplink auf VFO B höchstens alle 5 s neu.
3. Nur FTX-1: „Transponder im Speicher ablegen" öffnet den Editor mit Downlink, Uplink und Satellitenname (höchstens 12 Zeichen) im ersten freien Kanal.

**Karte „Digitale Betriebsarten"**

1. Wähle „Digitale Betriebsart", „Band und Frequenz" und „Periode".
2. Drücke „Abstimmen": Das setzt VFO A auf die Dial-Frequenz und die Datenbetriebsart (DATA_U bei FT-817/818/857/897 und FTX-1; USB bei IC-705 und (tr)uSDX; beim IC-705 aktiviere DATA ON am Funkgerät).
3. Die UTC-Uhrzeile zeigt den nächsten geraden oder ungeraden Slot. Erscheint „Automatische Zeit ist aus: FT8 braucht die Uhr auf ±1 s genau.", aktiviere die automatische Zeit von Android.
4. Für ein externes Modem (FT8CN, JS8Call oder eine andere App) drücke „Port für eine Digital-App freigeben" und wähle in dieser App dasselbe Funkgerät.

Von der App angebotene Standard-Dial-Frequenzen (MHz; es werden nur die im Bereich des Funkgeräts angezeigt; es sind Frequenzen der Community: prüfe sie lokal):

| Betriebsart | Perioden (s) | Dial-Frequenzen |
| --- | --- | --- |
| FT8 | 15 | 1.840, 3.573, 5.357, 7.074, 10.136, 14.074, 18.100, 21.074, 24.915, 28.074, 50.313, 144.174 |
| FT4 | 7.5 | 3.575, 7.0475, 10.140, 14.080, 18.104, 21.140, 24.919, 28.180, 50.318, 144.170 |
| JS8 | 15, 30, 10, 6 | 1.842, 3.578, 7.078, 10.130, 14.078, 18.104, 21.078, 24.922, 28.078, 50.318, 144.178 |
| WSPR | 120 | 0.136, 0.4742, 1.8366, 3.5686, 5.2872, 7.0386, 10.1387, 14.0956, 18.1046, 21.0946, 24.9246, 28.1246, 50.293, 144.489 |
| Q65 | 15, 30, 60, 120, 300 | 50.275, 144.116 |
| JT65 | 60 | 1.838, 3.570, 7.076, 10.138, 14.076, 18.102, 21.076, 24.917, 28.076, 50.310 |
| JT9 | 60 | 1.839, 3.572, 7.078, 10.140, 14.078, 18.104, 21.078, 24.919, 28.078 |
| FST4 | 60, 120, 300, 900, 1800 | 0.136, 0.4742 |
| FST4W | 120, 300, 900, 1800 | 0.136, 0.4742 |

Digitale Betriebsarten und Speicher sind als noch nicht auf einem echten Handy validiert aufgeführt.

**Häufige Fehler:**

- „Dieses Gerät erlaubt kein Lesen der Speicher": Dieses Funkgerät unterstützt das Lesen nicht.
- Frequenz außerhalb des Bereichs des Funkgeräts: Die Meldung nennt den unterstützten Bereich.
- Die Verbindung wird beim Verlassen des Bildschirms oder Abziehen des USB geschlossen: neu verbinden.
- IC-705: Es stellt zwei serielle Ports bereit; wähle den richtigen („Port N").

### 7. Satelliten

**Ziel:** Überflüge offline berechnen (SGP4), auf Karte und Radar verfolgen und mit Doppler empfangen.

**Du brauchst:** die Beobachterposition und, um den Katalog zu aktualisieren, eine Internetverbindung. Danach funktioniert es offline, solange die TLEs höchstens 7 Tage alt sind.

1. Öffne „SGP4-Satelliten und Überflüge öffnen" („Bricohams Satelliten"). Fehlt der Katalog oder ist er 24 h oder älter, aktualisiert er sich selbst (HTTPS mit CelesTrak und SatNOGS; dein Standort wird nicht gesendet). Von Hand geht es mit „TLE und Frequenzen aktualisieren" oder „TLE-Datei importieren" im Reiter „Einstellungen", wo sich auch die automatische Aktualisierung abschalten lässt.
2. Gib in „Einstellungen" Breite, Länge, Höhe (km, WGS84-Ellipsoid) und Mindesthöhe (0-60) ein, oder drücke „Letzte GPS-Position verwenden", dann „Speichern und Überflüge berechnen".
3. Wähle in „Satelliten" mit „Nach Name oder NORAD suchen", „Alle", „Mit RX" oder „Keine".
4. In „Überflüge" siehst du die nächsten 24 h mit dem Countdown zu AOS und LOS. Öffne einen Überflug, um das Polarradar (grün AOS, rot LOS, orange aktuelle Position) und die Liste der Downlinks („Downlink für CAT RX", „Andere Frequenz (MHz)") zu sehen.
5. In „Karte" erscheinen Satelliten, Footprint und eine Spur von ±45 min, alle 5 s aktualisiert; tippe einen Satelliten an, um ihn zu wählen.
6. Zum Empfangen: „CAT verbinden: Doppler, SSTV und Aufnahme" (Quansheng, siehe Anleitung 3) oder „In CAT Multi-Radio öffnen" (Anleitung 6).
7. Einen Überflug aufnehmen: Drücke im verbundenen CAT „Ganzen Überflug aufnehmen (WAV bis LOS)" und „Überflugaufnahme stoppen"; das WAV ist 16 kHz mono und endet bei LOS, nach 2 h oder beim Verlassen des Bildschirms.
8. SSTV suchen: Öffne in „Einstellungen" „Überflugaufnahmen" und drücke „SSTV" (es durchsucht 60-s-Fenster alle 23 s nach Robot36-Bildern); es gibt auch „Exportieren" und „Löschen" mit Bestätigung.

**Erwartetes Ergebnis:** Überflüge mit AOS, Maximum und LOS. Doppler über CAT korrigiert nur den Empfang (Quansheng); es gibt keine Uplink-Korrektur bei der Quansheng.

**Häufige Fehler:**

- Keine Überflüge: Der Beobachter wurde in „Einstellungen" nicht gespeichert.
- Abgelaufene TLEs (älter als 7 Tage): Aktualisiere den Katalog.
- Nach einem fehlgeschlagenen Download wartet die automatische Aktualisierung 15 Minuten.

Zu Bändern und einer Einführung in den Empfang siehe [Einführung in den Satellitenempfang](INICIACION-SATELITE.md).

### 8. AZ/EL-Rotor

**Ziel:** einen Rotor auf den gewählten Überflug ausrichten.

**Du brauchst:** den Bricohams-Rotor über WLAN (192.168.4.1) oder „sicheres Bluetooth" (6-stellige PIN, BLE), das per USB am Rotor gesetzte Token mit 24 bis 128 ASCII-Zeichen und den physischen Not-Aus in Reichweite. Es gibt keinen Test mit einem echten Rotor.

1. Drücke im Detail eines Überflugs „AZ/EL-Rotor: diesen Überflug vorbereiten und verfolgen".
2. Wähle WLAN oder Bluetooth, gib Token oder PIN ein und drücke „Verbinden".
3. Drücke „Referenzfahrt (Endschalter suchen)".
4. Drücke „Nord und Waage mit dem Handy kalibrieren": Mit dem Handy flach auf dem Boom und der Oberseite zu den Elementen nutze „Kompasskurs übernehmen" oder gib den rechtweisenden Azimut der Antenne (0-359,9°) ein, bestätige, dass der Mast waagerecht ist, und drücke „Kalibrieren".
5. Drücke „Zeit und Standort des Handys senden" (die Firmware 0.3.0-prototype unterstützt das; die API-1-Firmware nutzt GNSS-Zeit).
6. Drücke „Überflug vorbereiten: TLE laden und auf AOS richten" und lies die Warnung zum Kabelschnitt.
7. Drücke „Ab AOS automatisch verfolgen"; „Automatische Verfolgung abbrechen" stoppt sie.

**Erwartetes Ergebnis:** Der Rotor richtet sich auf AOS aus und folgt dem Überflug bei eingeschaltetem Bildschirm.

**Häufige Fehler:**

- 409: Ein anderer Client steuert den Rotor.
- BLE-Verbindung in Bewegung verloren: Der Rotor geht in einen Fehler; nutze „Fehler löschen (neue Referenzfahrt nötig)".
- Der Rotor stoppt am Kabelanschlag, über 89° oder wenn der Satellit schneller ist als der Motor.
- „Motoren STOPPEN" hält die Bewegung jederzeit an. Details stehen in der Rotor-Anleitung im Repository (docs/ROTOR.md, nur auf Spanisch).

### 9. Live-Audioempfang

**Ziel:** Audio mit dem Mikrofon aufnehmen und danach als Morse oder SSTV dekodieren.

**Du brauchst:** die Mikrofonberechtigung und das Audio des Funkgeräts nahe am Mikrofon.

1. Öffne „Morse / Robot36 mit Mikrofon empfangen" („Audioempfang").
2. Wähle Morse oder SSTV. Stelle für Morse den Ton (300 bis 1200 Hz) und die Geschwindigkeit (5 bis 45 WPM) ein.
3. Drücke „Audioaufnahme starten". Fragt Android nach der Berechtigung, erteile sie und drücke erneut: Die Berechtigung startet keine Aufnahme.
4. Drücke „Stoppen und dekodieren" (oder „Abbrechen und Audio verwerfen").

**Erwartetes Ergebnis:** Das Audio (Mono-PCM 48 kHz, bis 60 s für Morse oder 200 s für SSTV) bleibt nur im Speicher und wird weder gespeichert noch gesendet. Das Verlassen des Bildschirms bricht die Aufnahme ab. Die Dekodierung ist experimentell.

**Häufige Fehler:**

- SSTV braucht den vollständigen VIS-Header: Beginne vor der Aussendung.
- Keine Mikrofonberechtigung: Die WAV-Importer kannst du weiter nutzen.

### 10. Morse

**Ziel:** Morse-Text oder eine WAV-Datei in Text umwandeln.

1. Tippe im Reiter „Morse" Punkte und Striche ein (Leerzeichen zwischen Buchstaben, `/` zwischen Wörtern, `?` für einen unbekannten Code) und drücke „Morse-Text auswerten".
2. Für eine Datei (experimentell): Stelle „Ton (300-1200 Hz)" und „Geschwindigkeit (5-45 Wörter/Minute)" als ganze Zahlen ein und drücke „Morse-WAV importieren und dekodieren".

**Erwartetes Ergebnis:** der dekodierte Text. Die WAV muss Mono-16-Bit-PCM sein, 8 bis 48 kHz, 0,1 bis 60 s und bis 8 MiB. Es ist kein adaptiver Dekoder: Prüfe das Ergebnis.

**Häufige Fehler:**

- Ton oder Geschwindigkeit außerhalb des Bereichs oder keine ganzen Zahlen.
- Stereo-WAV oder ein anderes Format.

### 11. SSTV Robot36 (WAV, Mikrofon und Senden)

**Ziel:** SSTV-Bilder dekodieren und optional eines per CAT-PTT senden (experimentell).

**Eine WAV dekodieren**

1. Drücke „SSTV Robot36 aus WAV öffnen" („SSTV aus Audiodateien") und „SSTV-WAV dekodieren".
2. Wähle eine Mono-16-Bit-PCM-WAV, 8000-48000 Hz, bis 200 s und 24 MiB, mit vollständigem VIS-Header (Modi Robot36/72, Martin M1/M2, Scottie S1/S2, PD90/120/180).
3. Drücke „PNG-Bild speichern", bevor du den Bildschirm verlässt oder drehst: Das Bild lebt nur im Speicher.

**Mit dem Mikrofon empfangen:** nutze Anleitung 9 mit SSTV, oder im CAT-RX-Bildschirm „SSTV aufnehmen (CAT stimmt weiter ab)" und „Aufnahme stoppen und dekodieren".

**Mit CAT TX und PTT senden (experimentell, ohne HF-Validierung)**

1. Du brauchst eine Lizenz, eine für SSTV zugelassene Frequenz und ein Audiokabel vom Handy zum Mikrofoneingang des Funkgeräts.
2. Aktiviere am Funkgerät in SAT RX das PTT mit Taste 9 (`CAT TX ARMED`).
3. Gib im CAT-Bildschirm „Rufzeichen (erforderlich)" ein: Es wird ins Bild gedruckt.
4. Wähle die Betriebsart unter „SSTV-Modus (nur solche, die in das Sendelimit von 110 s passen)" (TX: Robot36/72, Martin M2, Scottie S2, PD90).
5. Drücke „SSTV über CAT-PTT senden" und bestätige „Senden" im Dialog „SSTV senden".
6. Zum Stoppen „TX abbrechen / stoppen (löst PTT)" oder eine beliebige Taste am Funkgerät.

**Erwartetes Ergebnis:** Bild gesendet, PTT gelöst und vom Funkgerät bestätigt; die App misst kein HF. CAT Multi-Radio hat außerdem „Bild senden", „TX stoppen", „SSTV empfangen" und „Empfang stoppen".

**Häufige Fehler:**

- Ablehnung wegen TX-Sperre, Band, Akku oder Modulation des Funkgeräts.
- Ohne Aktivierung mit Taste 9 oder ohne Rufzeichen wird nichts gesendet.
- Während der Überflugverfolgung wird nichts gesendet.

### 12. Eigene digitale Modi

**Ziel:** `FT8`, `FT4` und `FT2` mit dem RadiCodex-Decoder empfangen und erzeugen, ohne weitere Apps.

1. Tippe auf „Digitale Modi FT8 / FT4 / FT2“ im Hauptbildschirm oder auf „Eigener Decoder und TX“ in der Karte der digitalen Modi im CAT.
2. Wähle den Modus: `FT8` (Slot von 15 s), `FT4` (7,5 s) oder `FT2` (3,75 s, Kandidat). Du siehst die UTC-Uhr und den Slot.
3. Zum Empfangen tippe auf „Hören“ (Mikrofon oder USB-Audioeingang von Android) oder „WAV dekodieren“. Der Empfang von `FT4` und `FT2` ist noch nicht verfügbar.
4. Zum Senden gib dein Rufzeichen und eine Nachricht mit diesem Rufzeichen ein und tippe auf „WAV speichern“ oder „Im nächsten Slot senden“. Die App schaltet kein PTT: Nutze das PTT des Bedieners oder VOX. „TX stoppen“ beendet sofort.

**Erwartetes Ergebnis:** Die Liste zeigt UTC, SNR, DT, Hz und Nachricht; die Aussendung läuft einmal, 0,5 s nach Slot-Beginn.

**Häufige Fehler:**

- Ungültige Nachricht, kein Rufzeichen oder Ton außerhalb von 100-5000 Hz.
- Ohne Mikrofonberechtigung ist kein Empfang möglich.
- `FT2` ist ein Legacy-Kandidat, nur gegen einen externen Empfänger validiert.

## Häufige Probleme

- Kein USB-Gerät erscheint: Nutze ein OTG-Datenkabel (nicht nur zum Laden) und prüfe, ob das Funkgerät im richtigen CAT-Modus ist.
- Android erteilt die USB-Berechtigung nicht: Wähle das Gerät erneut; die Berechtigung läuft ab oder gilt pro Gerät.
- Die App kehrt zum nominalen RX zurück: Die Abstimmung wurde nicht rechtzeitig erneuert (3 s ohne Erneuerung).
- Es erscheinen keine Überflüge: Speichere den Beobachter und aktualisiere die TLEs.
- Ich habe nach der Neuinstallation meine Daten verloren: Das Deinstallieren löscht die lokale Datenbank; exportiere vorher das JSON.
- Italienisch erscheint nicht in der App: Die App bietet nur Español, English (US), Français und Deutsch an; die Anleitung gibt es auf Italienisch.
- Allgemeine Konfigurationshilfe: [Konfigurationshilfe](AYUDA-CONFIGURACION.md). OpenGD77: [OpenGD77-Hilfe](AYUDA-OPENGD77.md).

## Sicherheit beim Senden

- Sende nur mit Lizenz, auf einer Frequenz, die du nutzen darfst, mit Kunstantenne oder passender Antenne und bei Tests mit minimaler Leistung.
- Ein Rufzeichen ist für SSTV über CAT und für den PTT-Test erforderlich; es muss Buchstaben, Ziffern und / enthalten.
- PTT-Grenzen: Das Funkgerät schaltet nach 120 s ab und die App begrenzt das Audio auf 110 s; der „PTT-Test 3 s" dauert 3 s; die App erneuert das PTT alle 400 ms und das Funkgerät löst es nach 1,5 s, falls die App ausfällt.
- Jede Taste am Funkgerät bricht die Aussendung ab; während der Überflugverfolgung wird nichts gesendet.
- Sende nicht zu inaktiven Satelliten oder in Segmenten, die nicht deine sind; die Einhaltung der Vorschriften liegt bei dir.
- Die Sendefunktionen sind experimentell und haben keine HF-Validierung.

## Demonstrationsvideo

Video mit den wichtigsten Bildschirmen (die Anleitungen sind ausführlicher): [bricohams-android-demo.mp4](../../media/bricohams-android-demo.mp4).

Kapitel in der Reihenfolge der Anleitungen:

1. Start und Sprache.
2. Logbuch.
3. ARDF und GPS.
4. Morse.
5. Satelliten.
6. CAT Multi-Radio.
7. Funkgeräte per USB: CAT RX F4HWN, OpenGD77 und Quansheng-Kanaleditor.
8. Audio und SSTV Robot36.
9. Digitale Betriebsarten FT8, FT4 und FT2.
