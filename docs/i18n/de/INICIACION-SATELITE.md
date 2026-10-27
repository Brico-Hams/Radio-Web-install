# Erste Schritte mit Satelliten

Autoren: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF und Pedro
Roca, Gründer und Vorstandsmitglieder von Bricohams.
Informationen: <https://bricohams.org> und <https://bricohams.com>.

Einführungsleitfaden auf Spanisch zum Firmware-Image **BH Satélite** (Bricohams
Satelliten) für Quansheng UV-K5 V3/K1. Der Antennenabschnitt hat eine eigene
Seite: [Antennen für Satelliten](ANTENAS-SATELITE.md).

## Ursprung und Danksagungen

Dieser Leitfaden entstand aus der Lektüre von *Radioamadores no Espaço — Guia básico para
operar satélites* von Carlos Vicente PT2VM, Version 1.1 vom 04/09/2025, auf
Portugiesisch. Der Autor erlaubt die kostenlose, nicht gewinnorientierte
Weitergabe, genehmigt jedoch nicht ausdrücklich Übersetzungen oder abgeleitete
Werke. Außerdem enthält das Werk Antennendesigns von PY4ZBZ und PY5LO, deren
Nutzung PT2VM gestattet wurde.

Deshalb ist dieses Dokument **keine wörtliche Übersetzung und reproduziert
keine Bilder daraus**. Es folgt einem ähnlichen thematischen Ablauf, mit
eigenen Texten, Schaubildern und Antennen von Bricohams, angepasst an Spanien
und den UV-K5 mit BH Satélite. Wir empfehlen, das Original von PT2VM zu lesen.

Wenn der Autor die Übersetzung genehmigt, veröffentlichen wir sie separat mit
entsprechender Quellenangabe.

## Inhalt

1. [Was ist ein Amateurfunksatellit](#que-es-un-satelite-de-radioaficionado)
2. [Wer darf empfangen und wer darf senden](#quien-puede-escuchar-y-quien-puede-transmitir)
3. [Begriffe zum Überflug](#conceptos-del-pase)
4. [UTC-Zeit, Locator und Koordinaten](#hora-utc-localizador-y-coordenadas)
5. [Überflüge vorhersagen und Satellitenaktivität prüfen](#predecir-pases-y-saber-si-el-satelite-esta-activo)
6. [Doppler-Effekt](#efecto-doppler)
7. [FM-Satelliten für den Einstieg](#satelites-fm-para-empezar)
8. [Stationsausrüstung](#equipo-de-la-estacion)
9. [Betrieb mit BH Satélite auf dem UV-K5](#operar-con-bh-satelite-en-la-uv-k5)
10. [So führst du ein QSO über Satellit](#como-hacer-un-qso-por-satelite)
11. [Kontakte protokollieren und bestätigen](#registrar-y-confirmar-contactos)
12. [SSTV und APRS von der ISS](#sstv-y-aprs-desde-la-iss)
13. [Checkliste für den Überflug](#lista-de-comprobacion-del-pase)
14. [Glossar](#glosario)
15. [Quellen](#referencias)

## Was ist ein Amateurfunksatellit

Ein Amateurfunksatellit ist eine Funkstation im Orbit, die auf einer Frequenz
empfängt, dem **Uplink**, und auf einer anderen Frequenz, dem **Downlink**,
weiterleitet. Viele tragen die Kennung OSCAR, kurz für *Orbiting Satellite
Carrying Amateur Radio*, mit einer Seriennummer wie SO-50 oder AO-7.

Nach ihrer Funktion gibt es drei Haupttypen:

- **FM-Repeater.** Sie funktionieren wie ein Bergrepeater, aber in Hunderten
  Kilometern Höhe. Es ist immer nur ein QSO gleichzeitig möglich; sie sind
  der beste Einstieg mit einem Handfunkgerät.
- **Lineare Transponder.** Sie übertragen einen ganzen Bandabschnitt von
  mehreren zehn kHz und ermöglichen viele gleichzeitige QSOs in SSB oder CW.
  Üblicherweise sind Vollduplexgeräte und SSB beim Senden erforderlich.
- **Digitale Satelliten und Baken.** Dazu gehören APRS, Telemetrie und SSTV.
  Viele lassen sich mit einfacher Ausrüstung empfangen.

Fast alle Satelliten, die wir verwenden, befinden sich im **niedrigen Erdorbit
(LEO)**, in 400 bis 1000 km Höhe. Sie umrunden die Erde in etwa 90-100 Minuten;
ein Überflug über deine Station dauert 5 bis 15 Minuten. Die Internationale
Raumstation (ISS) in rund 400 km Höhe ist der bekannteste bemannte Satellit
für Funkamateure.

## Wer darf empfangen und wer darf senden

- **Satellitenempfang** ist allen mit einem geeigneten Empfänger möglich.
- **Zum Senden** brauchst du eine gültige Amateurfunkgenehmigung. Halte dich
  an die Bänder, Betriebsarten und Leistungen der geltenden, im BOE
  veröffentlichten Vorschriften.
- Die Satellitensegmente der IARU-Region 1 sind **145,800-146,000 MHz** und
  **435,000-438,000 MHz**. Führe dort keine terrestrischen Gespräche.
- **Militärische UHF-Satelliten** wie FleetSatCom oder UHF Follow-On sind
  keine Amateurfunksatelliten. Ihre Nutzung ist illegal und wird verfolgt.
  Der UV-K5 darf dafür nicht verwendet werden.

## Begriffe zum Überflug

![Geometrie eines Satellitenüberflugs](../../atlas/sat-pase-orbital.svg)

| Begriff | Bedeutung |
| --- | --- |
| AOS | *Acquisition of Signal*: Der Satellit erscheint über dem Horizont |
| TCA | *Time of Closest Approach*: höchste Elevation und geringste Entfernung |
| LOS | *Loss of Signal*: Der Satellit verschwindet hinter dem Horizont |
| Azimut | Horizontale Richtung in Grad: 0 Norden, 90 Osten, 180 Süden, 270 Westen |
| Elevation | Winkel über dem Horizont von 0 bis 90 Grad |
| Fußabdruck | Gebiet der Erde, das der Satellit zu einem bestimmten Zeitpunkt abdeckt |
| TLE / Keps | Orbitparameter, mit denen Programme Überflüge berechnen |

Zwei Stationen können miteinander kommunizieren, wenn beide zur gleichen
Zeit innerhalb des Fußabdrucks liegen. Bei einem LEO-Satelliten beträgt die
typische Reichweite etwa 4000-5000 km. Von Spanien aus ist der Kontakt mit
weiten Teilen Europas und Nordafrikas möglich.

Überflüge mit einer maximalen Elevation unter 15-20 Grad sind kurz und
schwach; Gebäude und Berge können sie abschatten. Wähle zum Einstieg Überflüge
mit mehr als 30 Grad.

## UTC-Zeit, Locator und Koordinaten

- **UTC.** Vorhersagen, Aktivitätsmeldungen und Protokolle verwenden UTC. Auf
der spanischen Halbinsel liegt UTC im Winter 1 h und im Sommer 2 h hinter der
Ortszeit.
- **Maidenhead-Locator.** Ein vierstelliger Code, etwa IM97 in der Region
  Murcia, bezeichnet dein Rasterfeld. Bei Satelliten-QSOs werden Rufzeichen
  und Rasterfeld ausgetauscht; für viele Diplome zählen Rasterfelder.
- **Koordinaten.** Trage Breite, Länge und Höhe im Prädiktor präzise ein.
  Schon einige Kilometer Abweichung können den Überflug um mehrere zehn
  Sekunden verschieben.

## Überflüge vorhersagen und Satellitenaktivität prüfen

Vorhersageprogramme verwenden TLE, die laufend veröffentlicht und aktualisiert
werden. Verwende stets TLE der letzten Tage.

| Werkzeug | Plattform | Hinweise |
| --- | --- | --- |
| Bricohams-Android-App | Android | Eigenes SGP4 und CAT RX zu BH Satélite; siehe [Android](ANDROID.md) |
| Gpredict | Windows, Linux und macOS | Frei, mit Rotor- und Funkgerätesteuerung |
| Orbitron | Windows | Kostenlos und klassisch, mit Vorhersage und Doppler |
| ISS Detector | Android | Einfach; Amateurfunksatelliten erfordern eine Erweiterung |
| Heavens-Above / N2YO | Web | Sichtbare Überflüge und ISS |
| AMSAT Pass Predictions | Web | Überflüge von Amateurfunksatelliten |

Ein Satellit im Orbit bedeutet nicht, dass sein Transponder funktioniert. Vor
dem Überflug:

- Prüfe die Statusseite von AMSAT, auf der Betreiber berichten, was sie hören.
- Lies die Satellitenmeldungen: Manche werden nur nach Zeitplan oder über
  bestimmten Regionen aktiviert.
- Prüfe aktuelle Aufzeichnungen automatischer Stationen auf SatNOGS.

## Doppler-Effekt

![Dopplerverschiebung während eines Überflugs](../../atlas/sat-doppler.svg)

Ein LEO-Satellit bewegt sich mit etwa 7,5 km/s. Während er sich nähert,
empfangen wir sein Signal oberhalb der Nennfrequenz; während er sich entfernt,
unterhalb davon. Die Verschiebung beträgt ungefähr:

```text
desplazamiento = frecuencia x velocidad radial / velocidad de la luz
```

| Band | Frequenz | Ungefähres maximales Doppler bei 7 km/s |
| --- | --- | --- |
| 2 m | 145,8 MHz | ± 3,4 kHz |
| 70 cm | 436,8 MHz | ± 10,2 kHz |

Praktische Folgen:

- Bei FM fällt der 70-cm-Downlink ohne Korrektur aus dem Filter. Der 2-m-
  Downlink wird meist auch ohne Korrektur toleriert.
- Korrigiere vor allem die höhere Frequenz. Bei FM-Satelliten wird der
  UHF-Downlink üblicherweise in 5-kHz-Schritten nachgeführt.
- Die Änderung ist um TCA herum am schnellsten, besonders bei hohen Überflügen.
- Bei gestaffelten Speichern wechselst du im Verlauf des Überflugs von der
  höchsten zur niedrigsten Frequenz. Mit BH Satélite kannst du beim Empfang
  auch manuell oder per CAT korrigieren; siehe unten.

## FM-Satelliten für den Einstieg

> Frequenzen und Satellitenstatus ändern sich. Prüfe AMSAT vor der
> Programmierung und sende nicht an einen inaktiven Satelliten oder im Testmodus.

| Satellit | Uplink (TX) | Downlink (RX) | Ton | Hinweise |
| --- | --- | --- | --- | --- |
| SO-50 | 145,850 MHz | 436,795 MHz | 67,0 Hz | 74,4 Hz aktiviert den Timer; stark frequentiert |
| ISS, gekreuzter Repeater | 145,990 MHz | 437,800 MHz | 67,0 Hz | Zeitweise aktiv |
| ISS, ARISS-Sprache in Region 1 | 145,200 MHz | 145,800 MHz | — | Schulkontakte: nur zuhören |
| ISS, APRS | 145,825 MHz | 145,825 MHz | — | Packet-Digipeater mit 1200 bps |
| PO-101 | 437,500 MHz | 145,900 MHz | 141,3 Hz | Geplante Aktivierungen |

![Gestaffelter Speicherplan, Beispiel SO-50](../../atlas/sat-memorias-fm.svg)

## Stationsausrüstung

![Tragbare Station mit BH Satélite](../../atlas/sat-estacion-bh.svg)

- **Funkgerät.** Der UV-K5 arbeitet halbduplex: Während des Sendens empfängt
er nicht, daher kannst du dein eigenes Echo über den Satelliten nicht hören.
  Mit zwei Funkgeräten, einem zum Senden und einem zum Empfangen, hörst du
  dein eigenes Signal in Echtzeit. So lässt sich am besten feststellen, ob
  dein Signal ankommt.
- **Antenne.** Sie ist der wichtigste Teil. Siehe
  [Antennen für Satelliten](ANTENAS-SATELITE.md): eine handgeführte Dualband-
  Yagi mit Maßzeichnung und druckbaren STL-Teilen sowie ein fest montierter
  V-Dipol zum Empfang der ISS.
- **Polarisation.** Das Satellitensignal dreht sich während des Überflugs.
  Wenn es verblasst, drehe die Hand-Yagi um ihre Achse, um es wieder aufzunehmen.
- **Kopfhörer und Aufnahme.** Umgebungsgeräusche überdecken schwache Signale.
  Mit einer Aufzeichnung kannst du Rufzeichen später überprüfen.
- **Leistung.** Mit einer Yagi reichen 2-5 W für FM-Satelliten. Mehr Leistung
  gleicht eine schlecht ausgerichtete Antenne nicht aus und beeinträchtigt
  andere Nutzer.

## Betrieb mit BH Satélite auf dem UV-K5

BH Satélite ist das Beta-Image der Bricohams-Firmware mit dem Profil
Satelliten. Technische Details, Grenzen und Protokoll:
[Bricohams-Firmware](BRICOHAMS-FIRMWARE.md).

> **Experimentell.** Doppler-, CAT-RX- und CAT-TX-Funktionen wurden mit
> simulierten RF-Primitiven in Software getestet. **Sie wurden noch nicht im
> Funkgerät oder mit RF-Messungen validiert.** Teste zuerst im Empfang.

1. **Richtigen Slot auswählen.** Bei Multi-Boot-Funkgeräten hat jeder Slot
   seine eigene Kanaldatenbank. Programmiere Satellitenspeicher **nur im
   BH-Satélite-Slot**. Erstelle vorher eine vollständige Sicherung mit
   [Quansheng](AYUDA-QUANSHENG.md).
2. **Speicher.** Erstelle einen Speicher mit RX gleich dem nominalen Downlink
   und TX gleich dem Uplink, einschließlich Ton. Du kannst auch den Plan mit
   fünf gestaffelten Speichern verwenden.
3. **SAT RX.** Wähle den Speicher und rufe den Fox-Hunt-/SAT-Modus auf. Auf dem
   Bildschirm erscheint `SAT RX`; RX und TX des Kanals werden als Nennwerte
   übernommen.
4. **Manueller Doppler.** Mit den Tasten 4 und 6 ziehst du 500 m/s
   Radialgeschwindigkeit ab oder addierst sie, mit Taste 5 setzt du sie auf
   null. Zu Beginn des Überflugs nähert sich der Satellit; verwende daher
   negative Geschwindigkeiten, um weiter oben zu empfangen.
5. **CAT RX über Android.** Drücke 8 am Funkgerät, damit `CAT READY RX` angezeigt
   wird. Die Bricohams-App berechnet den Überflug mit SGP4 und sendet die
   korrigierte RX-Frequenz. Jeder Befehl läuft nach 3 s ab, wenn er nicht
   erneuert wird. Mit den Tasten 4, 5 und 6 kehrst du zur manuellen Steuerung zurück.
6. **Senden.** Für den Uplink wird die nominale TX-Frequenz des Kanals verwendet:
   BH Satélite **korrigiert den Doppler beim Senden nicht**. Für SSTV erfordert
   CAT PTT eine lokale Freigabe mit Taste 9, ein Lease von 1500 ms und ein
   Limit von 120 s.
7. **Beenden.** EXIT stellt die RF-Konfiguration des VFO wieder her.

Der UV-K5 kann mit F4HWN-Firmwares auch lineare Transponder in SSB **empfangen**.
Zum Senden über sie sind SSB beim TX und Vollduplex nötig, was der UV-K5 nicht
bietet. OpenGD77 umfasst auf kompatiblen Funkgeräten einen eigenen Satellitenmodus:
[OpenGD77](AYUDA-OPENGD77.md).

## So führst du ein QSO über Satellit

1. **Zuerst zuhören.** Höre dir ein oder zwei vollständige Überflüge an, bevor
   du sendest, um den Ablauf und übliche Rufzeichen kennenzulernen.
2. **Kurz und deutlich.** Ein typisches QSO tauscht Rufzeichen und Rasterfelder
   aus, zum Beispiel: „EA5XXX, IM97“. Bestätige den anderen mit „QSL, 73“.
3. **Immer nur eine Sendung gleichzeitig.** Wenn auf einem FM-Repeater zwei
   Stationen gleichzeitig senden, ist keine zu hören. Warte auf eine Lücke
   und rufe nicht ununterbrochen.
4. **Nicht den Kanal blockieren.** Ein Überflug dauert nur einige Minuten und
   wird von vielen Stationen geteilt. Bei stark frequentierten Satelliten ist
   ein Kontakt pro Überflug eine gute Regel.
5. **Prüfen, ob du ankommst.** Mit zwei Funkgeräten kannst du deinen eigenen
   Downlink hören. Wenn du dich nicht hörst, prüfe Ausrichtung, Dopplerspeicher
   und Ton, bevor du erneut rufst.

Übliche Codes und Ausdrücke:

| Ausdruck | Bedeutung |
| --- | --- |
| QRZ | Wer ruft mich? |
| QSL | Empfangen oder bestätigt |
| QTH / grid | Standort oder Rasterfeld |
| 73 | Viele Grüße |
| QRT | Ich beende das Senden |
| Rover | Station, die unterwegs seltene Rasterfelder aktiviert |

## Kontakte protokollieren und bestätigen

- Notiere Datum und **UTC**-Zeit, Rufzeichen, Raster des Gegenübers, Satellit
  und Betriebsart.
- Verwende in ADIF `PROP_MODE` = `SAT` und `SAT_NAME`, zum Beispiel `SO-50`.
  Das Logbuch der Android-App exportiert ADIF.
- Lade deine Kontakte bei LoTW oder eQSL hoch, um sie bestätigen zu lassen.
  Für das ARRL-VUCC-Diplom über Satellit sind 100 bestätigte Rasterfelder nötig.

## SSTV und APRS von der ISS

- **SSTV.** Bei von ARISS angekündigten Veranstaltungen sendet die ISS Bilder
  in FM auf 145,800 MHz, üblicherweise in PD120 oder Robot36. Ein V-Dipol oder
  eine Yagi und ein Decoder genügen. Die Bricohams-App decodiert Robot36 aus WAV.
- **APRS.** Der ISS-Digipeater auf 145,825 MHz leitet Packet-Frames weiter.
  Zum Senden von Frames brauchst du eine Lizenz und ein TNC oder eine
  kompatible App.
- **Sprachfunkempfang.** Während ARISS-Schulkontakten hörst du nur den
  Downlink auf 145,800 MHz. Sende nicht auf dem Uplink.

## Checkliste für den Überflug

1. Aktualisiere die TLE und prüfe UTC-Zeit des Überflugs, maximale Elevation
   sowie AOS- und LOS-Richtungen.
2. Bestätige bei AMSAT, dass der Satellit aktiv ist.
3. Prüfe, dass das Funkgerät im BH-Satélite-Slot startet und Speicher RX, TX
   und den richtigen Ton enthält.
4. Prüfe Antenne, Koaxialkabel, Diplexer, Kopfhörer und Aufnahmegerät.
5. Richte die Antenne vor AOS auf den Horizont aus, an dem der Satellit erscheint.
6. Verfolge den Satelliten während des Überflugs, drehe die Antenne für die
   Polarisation und korrigiere den Doppler.
7. Protokolliere nach dem Überflug die Kontakte in UTC und überprüfe die Aufnahme.

## Glossar

| Begriff | Definition |
| --- | --- |
| Uplink / subida | Frequenz, auf der wir zum Satelliten senden |
| Downlink / bajada | Frequenz, auf der der Satellit weiterleitet |
| Transponder | Gerät im Satelliten, das den Uplink in den Downlink umsetzt |
| Halbduplex | Während des Sendens wird nicht empfangen |
| Vollduplex | Gleichzeitiger Empfang und Sendung; das eigene Echo ist hörbar |
| CTCSS | Subaudio-Ton, der den Repeater des Satelliten öffnet |
| SGP4 | Orbit-Ausbreitungsmodell, das mit den TLE verwendet wird |
| CAT | Steuerung des Funkgeräts durch Computer oder Smartphone |

## Quellen

- Carlos Vicente PT2VM, *Radioamadores no Espaço — Guia básico para operar
  satélites*, v1.1, 04/09/2025. Inspirierte den thematischen Ablauf; wird nicht reproduziert.
- AMSAT: <https://www.amsat.org>. Satellitenstatus, Frequenzen und Vorhersagen.
- ARISS: <https://www.ariss.org>. Funkamateure an Bord der ISS.
- CelesTrak: <https://celestrak.org>. TLE-Orbitparameter.
- SatNOGS: <https://satnogs.org>. Offenes Netz von Bodenstationen.
- Bricohams: [Antennen für Satelliten](ANTENAS-SATELITE.md),
  [Bricohams-Firmware](BRICOHAMS-FIRMWARE.md), [Android](ANDROID.md) und
  [Quansheng](AYUDA-QUANSHENG.md).
