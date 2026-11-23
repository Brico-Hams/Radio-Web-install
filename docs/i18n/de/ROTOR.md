# Bricohams-AZ/EL-Rotor über die Android-App

Bindet die Android-App an den Rotor des Schwesterprojekts
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
(ESP32 + zwei Schrittmotoren + Endschalter) an. Zusammen bilden sie die
komplette Bricohams-Satellitenstation:

```
 Satélites (SGP4, TLE, pases) ──► Rotor AZ/EL (ESP32, SGP4 propio) ──► antena
          │                         ▲  Wi-Fi 192.168.4.1 o BLE seguro
          └──► CAT USB (Doppler) ───┼──► radio Quansheng con firmware Bricohams
                                    └── móvil: hora UTC, ubicación, norte (brújula), nivel
```

Das Smartphone dient als **GPS, Uhr, Kompass und Neigungsmesser** des Rotors, sodass die
Station diese Module nicht braucht. Der Rotor verfolgt den Überflug mit seinem eigenen SGP4 und
seinen Sicherheitsbegrenzern; die App bereitet ihn vor, schärft ihn scharf und überwacht ihn, während CAT
den Doppler des Funkgeräts parallel korrigiert.

## Voraussetzungen

- Rotor mit der Firmware von antenaSatCommrotor `0.3.0-prototype` oder neuer
  (API 2, enthält die Änderung aus [hardware/rotor](../../../hardware/rotor/README.md)),
  um die Uhrzeit des Smartphones zu nutzen. Mit älterer Firmware (API 1) funktioniert die App,
  aber die UTC-Zeit muss vom GNSS des Rotors kommen.
- Über USB am Rotor eingerichtetes Steuer-Token (24-128 Zeichen) und, für
  BLE, die 6-stellige PIN des Rotors.
- Standort in Satelliten › Einstellungen eingerichtet (oder der des ausgewählten Überflugs).

## Ablauf

1. Öffne unter **Satelliten** einen Überflug und tippe auf **Rotor AZ/EL: diesen
   Überflug vorbereiten und verfolgen**. Der Bildschirm berechnet die Bahn (300 Punkte) und vergleicht sie mit der
   Mechanik des Rotors.
2. Wähle **Rotor-WLAN** (verbinde dich vorher mit seinem Netz; die App erzwingt den Datenverkehr
   über das WLAN, auch wenn es kein Internet hat) oder **Sicheres Bluetooth** (beim ersten Mal mit der
   PIN koppeln). Gib das Token ein und tippe auf **Verbinden**.
3. **Homing**: sucht die Endschalter von AZ und EL. Nach dem Homing steht die Antenne
   auf EL 0° und zeigt auf den **Kabelschnitt** (mechanisches AZ -180°).
4. Vor dem Kalibrieren gibt die App an, **auf welche wahre Peilung der Kabelschnitt
   gelegt werden soll**, damit ihn der Überflug nicht kreuzt (Mitte des Himmelsbogens, den der Überflug nicht
   besucht). Drehe das Stativ in diese Richtung.
5. **Norden und Wasserwaage mit dem Smartphone kalibrieren**: Lege das Smartphone flach auf den Boom,
   die Oberseite zu den Elementen. Die App nutzt den Rotationsvektor,
   korrigiert die magnetische Missweisung mit dem WMM-Modell von Android und mittelt die
   letzten Messwerte; außerdem prüft sie, ob das Smartphone waagerecht liegt (±1°). Du kannst
   den Azimut von Hand eingeben, wenn es keinen Kompass gibt oder Metall in der Nähe ist.
6. **Überflug vorbereiten**: sendet UTC-Zeit und Standort, lädt das TLE (nur dieser
   Satellit, id 0), wählt ihn aus und fährt die Antenne zum AOS-Punkt.
7. **Ab AOS automatisch verfolgen**: Die App hält den Bildschirm eingeschaltet und
   fragt ab 1 s vor AOS alle 2 s `/api/track` ab. Antwortet der Rotor, dass die
   Antenne mehr als 15° abweicht (Erfassung), richtet sie die Antenne auf die Stelle neu aus, an der der Satellit
   sein wird, und versucht es erneut. Sie wird bei LOS oder bei einem Rotorfehler entschärft.
8. Öffne **CAT** im selben Überflug für den Doppler des Funkgeräts: Beides läuft
   gleichzeitig.

**Motoren STOPP** ist immer oben und entschärft die automatische Verfolgung.

## Warnungen des Plans

- **Kabel**: Die Firmware hält an, wenn der mechanische Azimut ±180° überschreiten würde. Bei
  kalibriertem Rotor warnt die App und schlägt die neue Peilung des Schnitts vor.
- **Geschwindigkeit**: Verlangt der Überflug mehr °/s als das Motorprofil, hält der Rotor
  nahe am Maximum an. Das Profil `esp32_nema17` der Firmware steigt von 2,25 auf
  ~5,9°/s.
- **Zenit**: Oberhalb von 89° stoppt die Firmware die Verfolgung.
- Es wird der Prozentsatz des Überflugs angezeigt, der ohne Stopps verfolgt werden kann.

## Sicherheit

- Halte den physischen Not-Aus griffbereit: Die App ersetzt ihn nicht.
- Bricht bei BLE die Verbindung ab, während sich der Rotor bewegt, geht die Firmware absichtlich in
  **Fehler**; du musst den **Fehler löschen**, das Homing wiederholen und kalibrieren.
- Die von der App gesendete Uhrzeit gilt **10 Minuten**; solange der Rotor-Bildschirm
  geöffnet ist, sendet die App sie alle 60 s erneut. Hat der Rotor ein gültiges GNSS, hat dieses
  Vorrang.
- Es gibt nur einen Besitzer der Bewegung: Steuert ein anderer Client (Web, BLE) den Rotor,
  erhält die App 409 und zeigt es an.

## Technische Details

| Baustein | Datei |
| --- | --- |
| Protokoll (JSON HTTP/BLE, 20-Byte-Frames, TLE 3LE) | `android/.../RotorProtocol.kt` |
| Typisierter Client und an das WLAN gebundener HTTP-Transport | `RotorClient.kt` |
| BLE-Transport mit verschlüsselter Kopplung (MITM) | `RotorBle.kt` |
| Plan für Kabel, Geschwindigkeit, Zenit und vorgeschlagenen Schnitt | `RotorPlanner.kt` |
| Kompass + Wasserwaage mit Missweisung | `RotorCompass.kt` |
| Bildschirm | `RotorActivity.kt` |

- HTTP im Klartext nur zu `192.168.4.1` (`network_security_config.xml`);
  der Rest der App verlangt weiterhin HTTPS. Jede Anfrage trägt `X-Control-Token`.
- Neue Berechtigungen: `ACCESS_NETWORK_STATE`, `BLUETOOTH_SCAN` (ohne Standort),
  `BLUETOOTH_CONNECT` und, bis Android 11, `BLUETOOTH`/`BLUETOOTH_ADMIN` sowie
  Standort zum Scannen.

## Validierung

- Host-Tests (Robolectric): `RotorTest` (Frames, Wiederzusammensetzung und Vorrang von
  STOPP, Grenzen, TLE, API-1/2-Zustände, Client, Planer) und
  `RotorActivityTest` (Verbindung mit simuliertem Transport, Überflug vorbereiten, stoppen,
  Fehler) sowie die Schaltfläche aus `SatelliteActivityTest`.
- Firmware `0.3.0-prototype`: `esp32` und `esp32_nema17` lassen sich mit PlatformIO kompilieren.
- **Ausstehend**: Test mit physischem Rotor, echtem WLAN und BLE sowie echtem Smartphone-
  Kompass.

## Fernsteuerung des Rotors

- Die Remote-Konsole (`remote.html`, auch in `RemoteShackActivity` und `RemoteStationActivity`) zeigt das Rotor-Panel: lesen, AZ/EL anfahren, parken und stoppen über `/api/rotor`.
- Nur ein Client steuert den Rotor gleichzeitig (3-s-Lease, jede 1 s erneuert); andere erhalten `rotor_busy`. Stopp steht jedem authentifizierten Client offen.
- Schließen der Seite, Verbindungsverlust oder ein abgelaufener Lease stoppt den Rotor. Jede Bewegung ist auf 30 s begrenzt.
- Bewegung ist standardmäßig aus (`motion` in der Rotor-Konfiguration); ohne sie wird der Rotor nur gelesen.
- Warnung: niemals ohne angepasste Last oder Antenne senden.
- Satellitenverfolgung: im Planer erzeugt „Überflug für den Rotor exportieren (.json)“ `radicodex-pass-track` (Proben `t`/`az`/`el`, Doppler-unabhängig). Die Konsole importiert die Datei und bewegt erst nach Druck auf die Verfolgungstaste.
- Geschwindigkeit und Endschalter: pendiente de fuente (deaktiviert).
- Unterstützung: Hamlib `rotctld` mit den Katalogmodellen (`data/remote-station-catalog.json`) und das Bricohams-BLE/AP-Protokoll auf Android. GS-232A/B und SPID ROT2PROG: nur im Stationsagenten über `--rotor-serial` (Hamlib-Frames, ohne Hardware-Validierung); der BLE/AP-Rotor bleibt unverändert.
