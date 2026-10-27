# Dim0s-Pack: Inventar und Karina V3/UV-K1

Revision: 25-10-2026. Vom Benutzer bereitgestelltes Repository:
`Dim0s/quansheng-UV-K5v3-K1-firmware-pack`.
Untersuchter Commit: `52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c`.

## Was sich gegenüber der vorherigen Untersuchung geändert hat

Das zunächst lokal geprüfte Karina-Paket war **V1**. Dieses Repository
kündigt Firmwares für **K5 V3, K1 und Geräte mit Bootloader 7.x** an und
enthält ein weiteres Karina-Paket mit separaten K1-/V3-Binärdateien. Daher gilt:

- Die Aussage, es gebe nur Karina V1, ist nicht korrekt.
- Weiterhin korrekt ist, das V1-Binary aus dem vorherigen Paket für V3 abzulehnen.
- Es gibt neue Nachweise für **Karina-PY32-Binärdateien**, aber nicht dafür,
  dass sie mit Armel-Multiboot kompatibel sind oder dass ihre Quellen verfügbar sind.
- Dieser Hinweis macht das Pack nicht zur offiziellen Quelle jedes Autors.

Der Repository-Header empfiehlt, Kalibrierungen aufzubewahren. In den
Karina-Informationen steht, dass es keinen Link zum Quellrepository gibt; die
Firmware wird als geschlossen beschrieben, Builds würden in einem externen
Kanal erneut veröffentlicht. Das beweist für sich genommen keine konkrete
Lizenz: Der vom Benutzer angegebene MIT-Hinweis wartet weiterhin auf eine
überprüfbare Quelle/einen Rechteinhaber.

## Art und Grenzen des Inventars

Der vollständige, nicht abgeschnittene Git-Baum enthält Binärdateien, Apps,
Dokumente, Python-Treiber und komprimierte Dateien. In diesem Baum wurden
keine Quell-Dateien `.c`/`.h`, Makefile oder LICENSE/COPYING/NOTICE nach Namen
gefunden. Es wird nicht behauptet, alle ZIP/RAR-Dateien im Repository von
innen untersucht zu haben. Das ZIP vom 21-09-2026 wurde für Karina untersucht,
ohne Dateien daraus auszuführen.

Das Pack wird nicht in das Web-Repository kopiert und EXE, APK, Treiber oder
Kalibrierungen werden nicht installiert. Die PDFs, Dateien und Firmwares werden
nicht weiterverteilt. Ein lokal berechneter SHA-256-Hash erkennt Änderungen
gegenüber diesem Download, belegt aber weder Urheberschaft noch Lizenz,
Sicherheit oder Übereinstimmung mit Quellcode.

## Enthaltene Familien

Die folgenden Funktionen sind **Angaben des Pack-Zusammenstellers** aus dem
untersuchten README und keine von Bricohams zertifizierten Eigenschaften.
Für jeden Build sind Autor und zugehöriges Handbuch maßgeblich.

| Ordner/Projekt | Im Pack beschriebener Schwerpunkt | Status auf dieser Website |
| --- | --- | --- |
| BD1AHN | Variante mit drei VFOs | Dokumentationshinweis; kein validiertes Protokoll |
| Calypso | Ordner der Versionen 1.5.0 und 1.7.0 | Inventarisiert; keine Funktionen abgeleitet |
| Delta | Passwort und Datenschutz laut Zusammensteller | Kryptografische Eigenschaften werden nicht zertifiziert |
| E25WOP | CW-Funktionen und Zubehör laut Zusammensteller | Zubehör nicht nach Rezept für eine andere Platine anschließen |
| F4HWN | Releases und Apps, einschließlich historischer Versionen | Integrierte offizielle Armel-Quelle bevorzugen |
| GOGU | F4HWN-Variante mit Nachrichten und weiteren Funktionen | Multiboot vom Zusammensteller behauptet; lokal nicht validiert |
| HAWK | Eigene Dokumentation und Dateien | Inventarisiert; keine Funktionen abgeleitet |
| IJV | Versionen mit kostenlosen/kostenpflichtigen Funktionen laut Pack | Kostenpflichtige Funktionen nicht ohne Lizenz weitergeben oder aktivieren |
| IOTCU | Variante mit Si4732-Modul laut Pack | Konkrete Hardware/Firmware erforderlich; nicht annehmen, dass ein serienmäßiges Funkgerät es enthält |
| KA50 / KA52 / KA52M | Spektrum; KA52M mit 2-/3-VFO-Varianten | Mehrere VFOs entsprechen nicht gleichzeitig aktiven RF-Empfängern |
| Karina | Eigenes Spektrum, Aufnahme und Presets | Neue K1-/V3-Binärdateien; keine geprüften Armel-Slots |
| Matoz | Eigene Dateien | Inventarisiert; keine Funktionen abgeleitet |
| N7SIX | Spektrum/CW-Funktionen laut Zusammensteller | Multiboot behauptet, nicht zertifiziert |
| NR7Y | CW-Funktionen laut Zusammensteller | Elektrische Kompatibilität von Zubehör nicht annehmen |
| PrepperRadio | Nachrichten über FSK-Betriebsarten laut Pack | Verschlüsselung, Netz oder Variantenkompatibilität nicht zertifizieren |

Das README erwähnt außerdem Sonic über einen externen Link und stellt klar,
dass es zu diesem Zeitpunkt nicht im Pack enthalten ist. Eine Erwähnung ist
kein untersuchtes Binary. Ordner mit Serienfirmware und Werkskalibrierungen
sind Referenzmaterial: **Kalibrierungen anderer Geräte nicht als eigene
Sicherung verwenden**.

## Multiboot: Behauptung und Prüfung

Der Zusammensteller nennt F4HWN, GOGU, IOTCU und N7SIX als mit Armel-Multiboot
kompatibel, außerdem Sonic aus externer Quelle. **Karina ist nicht in dieser
Liste enthalten.** Bevor der Inspector erweitert wird, müssen Format,
Speicherplan, Identifikation, CFG-Bänke, Wiederherstellung, Protokoll,
Integrität und Start auf Hardware überprüft werden.

Die Website behält ihre Liste erkannter F4HWN-Images bei. Eine Zeichenfolge
wird weder geändert noch eine Datei umbenannt, um die Prüfung zu umgehen.
Diese Quellen werden nicht automatisch zum Katalog der Downloads mit
verifizierten Originalautoren hinzugefügt.

## Karina 21-09-2026: Nachweis des ZIP

Datei: `Karina/21.09.2026.zip`, 2296162 bytes.
SHA-256 des Downloads:

```text
619368c7d08cd2dfdda13aeec4ae5d8fadd70eb78d60bbe908832d53385e2999
```

Der [Index der Drittanbieter](BINARIOS-TERCEROS.md) enthält einen Download mit
demselben Namen, aber 2161962 Bytes und einem anderen SHA-256. Dass beide ZIP
denselben Inhalt haben, ist nicht nachgewiesen. Dieses Inventar und die folgenden
extrahierten Hashes gelten ausschließlich für den oben angegebenen Download mit
2296162 Bytes, nicht für jede Datei namens `21.09.2026.zip`.

Inventar im Inneren: Ordner K1 und K5V3, zwei RAW-Dateien, zwei packed-Dateien,
zwei Kopien von `calib11.bin`, zwei CHIRP-Treiber und drei PDFs. Kein C-Projekt,
Makefile, Linker oder LICENSE-Hinweis nach Dateiname enthalten. Russische Namen
einiger Einträge weisen beim Auflisten des ZIP Codierungsprobleme auf; sie
wurden weder als Quellnamen interpretiert noch wurde ihr Inhalt ausgeführt.

| RAW-Image | Bytes | SP | Reset |
| --- | ---: | --- | --- |
| `k1_210926_3.bin` | 76288 | `0x20004000` | `0x08010AF5` |
| `v3_210926_3.bin` | 76352 | `0x20004000` | `0x08010B39` |

Diese Vektoren sind für beide Images ein Nachweis der PY32-Familie und
unterscheiden sich von `Reset=0x0000010B` des V1-Pakets. Ein Vektor innerhalb
des Bereichs und eine zulässige Größe **beweisen keine Kompatibilität mit dem
Multiboot-Loader**. Die packed-Varianten sind andere Container; nicht blind
18 bytes abschneiden.

| Datei | Lokal berechneter SHA-256 |
| --- | --- |
| `k1_210926_3.bin` | `81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82` |
| `v3_210926_3.bin` | `40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4` |
| `k1_210926_3.packed.bin` | `de1d74fd1a3901776c977fb58342264a69ad687c61c58a4063b63e91cd1123bc` |
| `v3_210926_3.packed.bin` | `5ec8598ca8cc5c0df0030137d5fd774bade8569d27b8021fcde147248f088d34` |

`calib11.bin` wurde nicht wiederhergestellt und es wird nicht dazu geraten.
Beide Kopien sind 512 bytes groß und haben denselben Hash; dadurch werden sie
nicht zu Originalkalibrierungen der beiden Funkgeräte des Benutzers.

## Vom Zusammensteller beschriebene Karina-V3-Konfigurationen

| Funktion | Beschriebene Bedeutung | Vorsicht/Version |
| --- | --- | --- |
| Spektrum Delay | Kompromiss zwischen Messdauer und Geschwindigkeit | Niedrigere Werte können Empfindlichkeit kosten; keine universelle „optimale“ Zahl übernehmen |
| Turbo | Beschleunigt den Sweep | Kann laut eigenem Hinweis Signale überspringen |
| Roger 5 | Im Zusammenhang mit experimentellen RX-Änderungen wiederverwendeter Parameter | Bedeutung ändert sich: Am 21-09-2026 werden permanente Beschleunigungen angekündigt; nicht nur als Roger-Ton behandeln |
| Dynamische Lautstärke | Behandlung von Audio/Endsignalen | Wahrnehmungseinstellung, keine RF-Kalibrierung |
| Nah-/Fernaufnahme | Automatische Frequenzsuche | Wirkt auf Verbrauch/Latenz; garantiert weder die Lokalisierung eines Signals noch die Erfassung aller Signale |
| Drei Presets | Laut Versionshinweisen ab Juli 2026 Konfigurationszustände | Enthalten eigene Daten; sind keine Armel-Firmware-Slots |
| Beacon/Auto-Antwort | Funktionen, die automatisch senden können | Nicht als Grundeinstellung oder zum Testen des Funkgeräts aktivieren |
| Erweitertes SQL | Juli-Hinweise nennen den Bereich 0-15 | Nicht ohne Prüfung auf frühere Versionen anwenden |
| CHIRP-Einstellungen/Tasten | Hinweise warnen vor Inkompatibilitäten und Sperren mit NONE | Nicht mit generischem Treiber schreiben und keine Werte anderer Firmware übernehmen |

Der Eintrag vom 21-09-2026 beschreibt Änderungen am AM-Squelch-Abschluss,
Beschleunigung, Aufnahme sowie CTCSS/DCS-Messungen. Der vom 21-08-2026
beschreibt eine mit Roger 5 zusammenhängende RX-Sperrkorrektur. Es sind
Pack-Hinweise, keine Testergebnisse. Die Datei vom 15-08-2026 ist als Test
gekennzeichnet.

Der Pack-Text enthält Löschvorgänge, das Laden von Kalibrierungen und sogar
Anweisungen, Verifikationsfehler zu ignorieren. **Diese Hinweise werden nicht
zu Anleitungen dieser Website.** Bei einem Verifikationsfehler anhalten,
Sicherungen aufbewahren und Werkzeug/Hardware/Version prüfen; den Erfolg nicht
aufgrund eines Hinweises Dritter behaupten.

## Was für einen echten Port oder eine Integration noch fehlt

1. Exakte Quellen und Lizenz des Karina-Autors für K1/V3.
2. Reproduzierbare Kompilierung und Speicherplan.
3. Spezifikation/Protokoll sowie echte CFG-/Kalibrierungskompatibilität.
4. Nachweis der Multiboot-Funktion oder einer bewiesenen kompatiblen Implementierung.
5. Physische Lese-, Sicherungs-, Start-, Wiederherstellungs- und Recovery-Tests.

Karina wurde aus diesem Link weder portiert noch kompiliert oder geflasht.
Der neue Nachweis korrigiert die Hardwareabdeckung, hebt diese Anforderungen
aber nicht auf.

## Festgehaltene Quellen

- [Vollständiger Pack-Baum](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c).
- [Karina-Ordner](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Karina-Hinweise und Änderungsdatei](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Egzumer: andere Originalquelle](AYUDA-EGZUMER.md).
- [Dossier zum Karina-V1-Paket](KARINA.md).
