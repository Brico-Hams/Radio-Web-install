# ARDF Quansheng: Empfang und Konfiguration – Hilfe

Revision: 25-10-2026. Hauptbeleg: `ARDFv05/ARDF.md` und das Repository reald V3/UV-K1. Dies ist eine eigene Zusammenfassung der Konfiguration, keine Kopie des Handbuchs. Die folgenden Namen und Bereiche entsprechen dem untersuchten Dokument; ohne Prüfung werden sie v0.2/v0.4 oder V1/V2-Zweigen nicht zugeschrieben.

## Hardware, Versionen und Grenzen

| Familie | Zugehörige Quelle | Verhältnis zu dieser Website |
| --- | --- | --- |
| V1 DP32 | reald/uv-k5-firmware-custom | Nicht mit dem PY32-Connector installieren |
| V2 | Von reald verlinktes DL9CAT-V2-Projekt | Außerhalb des Katalogs/Connectors |
| V3 / UV-K1 PY32 | reald/uv-k1-k5v3-firmware-custom | Erkannte stabile Releases zum Herunterladen |

Der Katalog erkennt Tags `ARDF-K5v3_K1-vX.Y[.Z]` aus der V3-Quelle, keine beliebigen Dateien, nur weil sie «ARDF» im Namen tragen. Auf dieser Website sind sie weiterhin **nur Downloads**, auch mit PY32-Vektoren: Die ARDF-Slotvalidierung ist nicht freigeschaltet. Der Ordner ARDFv05 enthält Quellen und geerbte Dateien; dadurch wird nicht jede Binärdatei aus seinem Archiv zu einem aktuellen ARDF-Build.

Upstream dokumentiert in den offiziellen ARDF-Releases deaktiviertes TX. Setze das bei fremden Builds nicht voraus: Prüfe `ENABLE_PREVENT_TX` und die Version. Richtungsfinder-Firmware macht das Funkgerät nicht zu einem 80-Meter-Empfänger; das Dokument nennt eine untere Chipgrenze von etwa 18 MHz, daher ist es für ARDF bei 3.5 MHz ungeeignet.

## Modi und Einstellungen

| Einstellung | Steuerung | Auswahl und Prüfung |
| --- | --- | --- |
| ARDF=OFF | Betrieb außerhalb des ARDF-Bildschirms/-Modus | Belegt weder kompiliertes noch erlaubtes TX |
| ARDF=DF Simple | Einfache Peilung mit manueller Verstärkung | Suche ohne Zyklen; keine Korrektur des Zyklustakts nötig |
| ARDF=ARDF | Zyklen und Fuchs-Anzeige | Synchronisierung mit dem tatsächlichen Ereignis konfigurieren |
| Mode=AM | AM-Demodulation der Aktivitätssignale | An das tatsächliche Signal anpassen; aktiviert kein AM-TX |
| Step | Abstimmraster | Das Handbuch schlägt 1 kHz vor; verhindert Rundung der gewünschten Frequenz |
| Sql | Squelch | Das Handbuch schlägt 0 für kontinuierliches Hören vor; Lautstärke vorsichtig einstellen |
| RxMode | VFO-Empfang | MAIN ONLY vermeidet Umschalten und Flackern des Verstärkungsverlaufs |
| Manuelle Verstärkung | Empfindlichkeit/Dämpfung je Index | Niedrigerer Index verringert Empfindlichkeit; bei starkem Signal reduzieren |
| NumFox | Anzahl der Sender pro Zyklus | Dokument: 1-10; 0 deaktiviert die Zeitsteuerung; Standard 5 |
| FoxDur | Dauer jedes Durchgangs | Dokument: Standard 60 s, Bereich 1.00-999.99 s; Eingabeeinheiten des Builds prüfen |
| EndSig | Warnung vor Ende des Durchgangs | 0 deaktiviert; Dokument 1-30 s. Vor Kopfhörern Lautstärke senken |
| GainRe | Verstärkung je Fuchs/VFO speichern | Laut Dokument OFF, VFO A, VFO B oder BOTH |
| RSS100 | Referenz zur Entfernungsschätzung | Null deaktiviert; keine RF-Kalibrierung des ganzen Funkgeräts |
| ClkCor | Korrektur des internen Timers | Nur nach Messung der Abweichung; Wert eines anderen Geräts nicht übernehmen |
| SetNav | Tastenorientierung K1/K5 | Korrigieren, wenn UP/DOWN umgekehrt wirken |
| ChSave | Speicherkonfiguration sichern | In MR erforderlich; VFO und MR sind nicht dasselbe |

Änderungen der Verstärkung je Index werden als ungefähr 5 dB beschrieben; das ist kein zertifizierter Dämpfer. Ein sehr nahes Signal kann trotz reduzierter Verstärkung übersteuern. Antenne, Polarisation, Ausrichtung und Umgebung sind relevant.

## Inbetriebnahme nur für Empfang

1. Genaue Hardware und ARDF-Firmware identifizieren; ursprüngliche Konfiguration sichern.
2. Antenne anschließen und Lautstärke niedrig einstellen; langsam erhöhen, besonders mit Kopfhörern.
3. DF Simple wählen, um Empfang ohne Uhr zu prüfen.
4. Modulation, Raster und Frequenz des autorisierten Ereignissignals auswählen.
5. MAIN ONLY verwenden; bei Eingabe einer Frequenz prüfen, ob du im VFO bist.
6. Verstärkung und Ausrichtung anpassen, ohne maximales Rauschen mit einem Nutzsignal zu verwechseln.
7. Für zeitgesteuerte Wettkämpfe NumFox/FoxDur konfigurieren und mit dem tatsächlichen Zyklus gemäß Bildschirm/Anleitung der installierten Version synchronisieren.
8. Falls nötig speichern; beim erneuten Laden VFO/Speicher prüfen.

Es werden keine universellen Synchronisierungsfolgen empfohlen: Tasten und Modi können sich zwischen Versionen ändern. Sende kein Testsignal ohne Genehmigung.

## Hinweis zur Verstärkung

GainRe behält Werte je Fuchs zu Beginn seines Durchgangs bei. Eine nützliche Einstellung ist VFO A für die Fuchsfrequenz mit gespeicherter Verstärkung, VFO B für eine kontinuierliche Bake ohne diese Speicherung. Wenn NumFox=0 ist oder GainRe den aktiven VFO nicht einschließt, ist keine Verlaufstabelle je Fuchs zu erwarten. Das Dokument weist darauf hin, dass die sichtbare Tabelle andere Grenzen als das NumFox-Maximum haben kann: Aus der Anzeige von 10 Durchgängen nicht auf 10 Verlaufseinträge schließen.

## Entfernung: Schätzung, keine Navigation

Die Vorhersage beruht auf einem ungefähren Ausbreitungsmodell und RSS100 als Referenz für Sender-Antenne-Empfänger. Gelände, Leistung, Höhe und Hindernisse ändern das Ergebnis; vertraue der Zahl nicht als tatsächlicher Entfernung. Das Handbuch beschreibt eine Referenzmessung 100 m vom Ereignissender entfernt, mit stabilem Signal und bekannter Ausrichtung. Null deaktiviert die Funktion. Sie ersetzt weder Karten noch persönliche Sicherheit oder Anweisungen des Veranstalters.

## Uhrkorrektur

Das Handbuch beschreibt die Abweichung des internen Resonators. Für den konkreten Fall, die real verstrichenen Sekunden zu messen, während das Gerät eine Stunde anzeigt:

```text
correccion = 6000 - (segundos_reales * 100 / 60)
```

Das Dokument nennt für ClkCor den Bereich -500 bis 500. Diese Formel gilt nur für das Verfahren dieser Version, nicht für ein beliebiges Uhrmenü eines anderen Funkgeräts. Sie korrigiert nicht den RF-Oszillator und erfordert keine Änderung der RF-Kalibrierung. Nach einer Änderung erneut messen und Synchronisierung prüfen.

## Überprüfbare historische Unterschiede

- Laut Dokument befand sich SetNav vor v0.4 in einem versteckten Menü; setze denselben Ort nicht für alle Versionen voraus.
- Welche Änderungen v0.2, v0.4, v0.5 und v0.5.1 enthalten, steht in den jeweiligen Releases; ein neueres Tag belegt für sich keine Datenkompatibilität.
- Verwende das CHIRP-Modul des jeweiligen Releases. Der Standard-UV-K5-Treiber bildet die ARDF-Einstellungen nicht unbedingt ab.
- V1/V2 nicht auf V3-Flashen übertragen. Das Handbuch warnt, dass k5prog/k5prog_win V1 nicht die passenden Werkzeuge für V3 sind.

## Diagnose

| Problem | Nichtdestruktive Prüfung |
| --- | --- |
| Es lassen sich nur drei Ziffern eingeben | Vielleicht bist du im Speicher statt im VFO |
| Die eingegebene Frequenz ändert sich | Step/Raster und Bandgrenzen prüfen |
| Verstärkungsverlauf flackert | Dual-Empfang deaktivieren |
| Fuchs-Tabelle fehlt | NumFox und GainRe für den aktiven VFO prüfen |
| CHIRP zeigt andere Einstellungen | Speicher sichern und Modul/Version prüfen |
| Pfeile vertauscht | SetNav; nicht wegen äußerlicher Ähnlichkeit die Firmware wechseln |
| Fehler Header short read | Programme schließen, Datenkabel/-anschluss, Modus und Firmware prüfen; Speicher nicht löschen |
| Entfernung unplausibel | RSS100-Referenz, Antenne, Leistung und Gelände; RF nicht blind neu kalibrieren |

## Quellen

- [ARDF-V3- und UV-K1-Projekt](https://github.com/reald/uv-k1-k5v3-firmware-custom).
- [ARDF-Handbuch des Projekts](https://github.com/reald/uv-k1-k5v3-firmware-custom/blob/main/ARDF.md).
- [ARDF-V3-Releases](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases).
- [ARDF-V1-Projekt](https://github.com/reald/uv-k5-firmware-custom).
- [Gemeinsame Konfiguration](AYUDA-CONFIGURACION.md).

Der Remote-Branch kann sich weiterentwickeln. Halte für eine Wiederholung der Konfiguration die genaue Version von Handbuch, Firmware und Treiber zusammen mit deiner Kopie fest.