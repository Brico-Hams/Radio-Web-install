# Bricohams V3: lokale modulare Kompilierung

## Identität und Geltungsbereich

**BETA, in Validierung und Erprobung.** Neue Builds geben
`stability: "beta"` und den Validierungsumfang in `build-info.json`, abgedeckt durch
SHA256SUMS. Es bleibt `hardwareTested: false` bis genau diese Binärdatei geprüft wurde.
Das tatsächliche Auslesen eines Funkgeräts mit F4HWN v6.0.0 validiert diese Bricohams-Firmware nicht.
Der PRO-Modus der Website reduziert Bestätigungen, ändert aber weder Module noch Lizenzen oder
Firmware-Schutzmechanismen.

Von der offenen F4HWN-Basis abgeleitete Edition für **UV-K5 V3 / UV-K1 PY32**. Sie ist nicht Karina,
unterstützt UV-K5 V1 nicht und fügt keinen eigenen Bootloader hinzu. Sie verwendet den Multiboot des
Upstream und behält dessen Protokollidentität `F4HWN v6.1.0`. Die Display-Edition wird
Die Display-Edition wird über eine CMake-Variable auf `Bricohams` umgestellt, ohne die Binärdatei zu patchen.

Festgelegte Basis:

- Repository: <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Von den Presets angegebene Version: `v6.1.0`.
- Lizenz/Urhebervermerk: die originalen `LICENSE` und `NOTICE` werden mitgeliefert.
- Die lokalen Referenzquellen liegen unter `Documents\Multiboot\Fusion61`.
  Die nicht bestätigte Änderung in `App/settings.c` bleibt erhalten und wird **nicht einbezogen**.

Diese offene Basis wurde ausgewählt, um auf der V3-Hardware und ihren Slots weiterzuarbeiten.
Die Einschränkungen, die eine Ableitung von Karina verhindern, sind dokumentiert in [KARINA.md](KARINA.md).
Ihre Algorithmen, Menüs und Treiber wurden nicht portiert.

## Bei Bedarf kompilieren

### Eigenständige Linie: Bricohams-Anwendungsplattform

`firmware/platform` eröffnet eine von der F4HWN-Anwendung getrennte Entwicklungslinie.
Sie enthält einen Validator/Loader für Pakete im Speicher, einen ersten Dienstvertrag
sowie Diagnose- und Block-Apps, die in C geschrieben und am Desktop getestet wurden.
Sie enthält jetzt einen **kompilierbaren experimentellen Residenten** mit Startcode und Anbindung für
LCD/Tastatur des PY32. Es wurde nicht geprüft, ob er auf dem Funkgerät startet. **Er ist kein
validierter, installierbarer Ersatz für Labs und auch kein vollständiges SDK.**
Die Verbindung mit physischem USB, Flash, LCD, Tastatur oder RF wurde nicht getestet.

Das experimentelle BHA1-Format ist kein FAP1 und darf nicht mit dem
vorhandenen App-Loader im Web installiert werden. Die Ganzzahlen sind little-endian kodiert:

| Offset | Bytes | Feld |
| --- | ---: | --- |
| 0 | 4 | Magic ASCII BHA1 |
| 4 | 4 | Größe Header, 64 |
| 8 | 4 | Version API, 2 |
| 12 | 4 | Architektur, 1 = Cortex-M Thumb |
| 16 | 4 | Codegröße, gerade, 2..4096 |
| 20 | 4 | Initialisierte Daten, 0..1024 |
| 24 | 4 | BSS, beim Laden auf null setzen |
| 28 | 4 | Gerader Einstiegsoffset innerhalb des Codes, ohne Thumb-Bit |
| 32 | 4 | Angeforderte Capabilities: Display 1, Tastatur 2, RX 4 |
| 36 | 4 | CRC-32 über verketteten Code und Daten |
| 40 | 16 | Druckbarer ASCII-Name, mit Nullen aufgefüllt, falls kürzer als 16 |
| 56 | 4 | Reserviert, null |
| 60 | 4 | CRC-32 der ersten 60 Bytes |

Danach folgen Code und Daten ohne überzählige Bytes. Code, Daten und BSS dürfen zusammen nicht größer als 4096 Bytes sein: Dies ist ein anfängliches Budget, keine Messung
der residenten Firmware. Der Loader validiert alles, bevor er den
Zielpuffer verändert, kopiert Code/Daten und setzt BSS auf null. Er ruft den Code nicht auf,
löst keine Relokationen auf und kennt die endgültige Link-Adresse nicht. Der Ausgabedeskriptor muss von den Eingabe- und Zielpuffern unabhängig sein; Speicher und Lebensdauer liegen in der Verantwortung des Aufrufers.

CRC erkennt Beschädigungen, **authentifiziert aber nicht den Urheber**. Die Capabilities
sind ein Zulassungsfilter, keine Sandbox: nativer Code kann auf einem MCU ohne
Isolation direkt auf Peripheriegeräte zugreifen. Führe keinen
nicht vertrauenswürdigen Code aus und behaupte aufgrund dieses Filters keine Kalibrierungsisolation.
Diese Komponente bietet weder eine TX-API noch Flash-Schreibzugriffe.

Noch zu validieren sind Startvorgang, LCD und Tastatur des Residenten auf PY32; außerdem fehlen
Flash-/USB-/RF-Treiber, reale Stack- und Zeitmessungen, eine physische transaktionale Installation,
Wiederherstellung und vollständige Hardwareintegration der Apps. Es wurde nicht
implementado Doom. Dieses Format ist vorläufig und belegt keine
physische Funktion der Apps. Die bisherige Profil-Linie wird nicht ersetzt.

#### Erste App: Bildschirmdiagnose

`bh_api.h` definiert eine experimentelle C-ABI Version 2 mit Version, Größe, Kontext und Callbacks
zum Löschen, Schreiben von Text und Anzeigen auf dem Bildschirm sowie einem Statuspuffer
für den privaten App-Zustand samt Größe. Sie empfängt die Ereignisse START, KEY, TICK
und STOP. Tasten sind Plattform-IDs und keine UART-Codes:
EXIT hat den Wert 1. Die App gibt „fortfahren“, „beenden“ oder einen expliziten Fehler zurück;
schlägt ein Callback fehl, fordert sie keine weiteren Bildschirmdienste an.

`diagnostics.c` zeigt vier Bricohams-Zeilen an und akzeptiert EXIT/STOP, ohne
auf RF oder Speicher zuzugreifen. Der Desktop-Ausführung verwendet simulierte Dienste;
geprüft werden Version/Größe, fehlende Callbacks und Fehler in
jeder Phase. Dadurch werden keine ARM-Instruktionen auf dem Funkgerät ausgeführt.

```powershell
node scripts\build-platform-app.cjs firmware-builds\diagnostics-nuevo
```

Erfordert die bereits vom Projekt verwendeten ARM-Werkzeuge und ein
neues Zielverzeichnis. Erzeugt ELF, BIN-Code, `diagnostics.bha`, Lizenz und Manifest
mit SHA-256 der Quellen und des Pakets. Der API-2-Build umfasst 300 Bytes für das
Paket: 64 Header und 236 Code/Konstanten.
`app.ld` linkt die App auf `0x20002000`; diese Adresse ist experimentell,
**Sie ist in der F4HWN-Firmware nicht reserviert und darf dort nicht verwendet werden**.
Veränderliche globale Variablen oder dynamische Relokationen werden nicht unterstützt. Der künftige Kern
muss Region, Stack und Puffer überschneidungsfrei reservieren, bevor er
die Ausführung des Einstiegspunkts im Thumb-Modus zulässt.

Der C-Test des Loaders akzeptiert als Argument `diagnostics.bha` und prüft
das reale ARM-Paket, seine CRCs und das Kopieren in den RAM. Dies ist ein Ladetest,
kein Test der ARM-Ausführung, Flash-Installation oder des Firmware-Starts.

#### Zweite App: Blocks

`blocks.c` implementiert ein eigenständiges Spiel mit vierzelligen Steinen und sieben
Formen, Drehung ohne Wall-Kicks, Kollisionen, Fallbewegung, Fixierung, Löschen von
Zeilen, Spielende und Neustart. Es verwendet keinen Code, keine Bilder, Sounds oder Daten
von Tetris oder Doom. Das Text-Spielfeld hat 10 Spalten und 6 Zeilen, um
die aktuellen Callbacks zu testen; es ist keine fertige Grafikportierung für das LCD.

LEFT/RIGHT bewegen den Stein, ROTATE dreht ihn, DOWN lässt ihn einen Schritt fallen, DROP setzt ihn ab,
RESTART startet neu und EXIT beendet das Spiel. Bei jedem TICK fällt der Stein einen Schritt: Der Kern
muss die Taktung vorgeben, unabhängig von der Schleifengeschwindigkeit.
Die Pseudozufallsfolge ist deterministisch und wird bei START/RESTART zurückgesetzt.
Die Zeilen werden im Zustand gezählt, aber noch nicht als Punktestand angezeigt.

Der Kern muss den Zustand in ausgerichtetem Speicher bereitstellen, der vor
dem ersten Ereignis auf null gesetzt und ausschließlich dieser App zugeordnet ist. Das Manifest reserviert
ein externes Budget von 256 Bytes; es ist kein BSS des Pakets. Der API-2-Vertrag
enthält diesen Puffer und ersetzt die anfängliche API 1. Der Loader weist
API-1-Pakete zurück; unterschiedliche Binärverträge werden nicht stillschweigend vermischt.

```powershell
node scripts\build-platform-app.cjs firmware-builds\blocks-nuevo blocks
```

Die App wird für Cortex-M0+ ohne C-Bibliothek und Divisionshelfer kompiliert:
940 Bytes für das paquete (64 Header, 876 Code/Konstanten).
Die Desktop-Tests prüfen Bewegung, Drehung, das Löschen einer
Zeile, Spielende, Neustart, Dienstfehler und 10000 Ereignisse
mit Prüfung auf undefiniertes Verhalten. Auch der C-Loader validiert und
kopiert das echte ARM-Paket. **Dieser ARM-Code wurde nicht auf dem Funkgerät ausgeführt.
Der experimentelle Resident enthält einen Launcher, aber keinen Installer
für externe Pakete.**

#### Portabler Launcher

`bh_launcher.c` verwaltet jeweils eine native App mit einem ausgerichteten Puffer
von 256 Bytes. Initialisiere eine neue Instanz und behalte sie während ihrer
gesamten Lebensdauer an derselben Adresse: Der Vertrag enthält einen Zeiger auf ihren
eigenen Speicher. Instanzen dürfen während einer App weder kopiert noch neu initialisiert werden.

START wird ausschließlich über `bh_launcher_start` gesendet; der Dispatcher
akzeptiert KEY, TICK und STOP. Beim App-Wechsel wird der vorherigen App STOP übergeben;
bei Beendigung oder Fehler wird die App freigegeben und ihr Zustand vollständig gelöscht. Ein STOP-Fehler verhindert
den Start der nächsten App. Wiedereintritte in start/stop/dispatch
während eines Callbacks werden zurückgewiesen. Ticks müssen seriell aus der Hauptschleife eintreffen;
die API ist nicht interruptsicher.

Der Launcher ruft bereits gelinkte C-Funktionen für Desktop-Tests auf.
**Er wandelt die Adresse eines ARM-Pakets nicht in eine Funktion um und führt BHA1
auf dem PC nicht aus.** Die Ausführungsbrücke für den MCU, Flash-Installation,
Treiber, LCD-Menü und Wiederherstellung fehlen noch. Es ist ein portabler Lebenszyklus,
der getestet wurde, kein startfähiger Resident-Launcher und keine Sandbox.

#### Persistente Installation mit zwei Bänken

`bh_store.c` implementiert portable Speicherung für **ein Paket und seine
vorherige Version** in zwei abstrakten Bänken zu je 8192 Bytes. Dies ist noch
kein Katalog für mehrere Apps. Der Treiber muss Lesen, Schreiben und Löschen
ausschließlich dieser Bänke bereitstellen; es wurde keine
Adresse im Funkgeräte-Flash zugewiesen und auch nicht die F4HWN-Speicherkarte wiederverwendet.

Vor dem Löschen wird das vollständige BHA1-API-2-Paket validiert und die
vorherige Version abgefragt. Nur der inaktive Bank wird gelöscht und anschließend durch Auslesen geprüft,
dass alle Bytes `0xff` sind, einschließlich des Bestätigungsmarkers:
Eine Löschbestätigung ohne tatsächliches Löschen wird vor der Programmierung zurückgewiesen.
Es wird in Fragmenten geschrieben,
die keine 128-Byte-Seiten überschreiten, und jedes Fragment wird zurückgelesen. Der Header
BHS1 enthält Version, Generation, Länge und CRC des Pakets; vor dem Schreiben von
`DONE` als endgültige Bestätigung wird er erneut ausgelesen. Header und Paket werden nach der Bestätigung nochmals validiert.
Der vorherige Bank wird am Ende nicht gelöscht.

Beim Lesen wird die neueste gültige Generation ausgewählt; ist die neue Version
unvollständig oder beschädigt, kann die vorherige wiederhergestellt werden. Ist keine gültig,
aber ein bestätigter Bank beschädigt, wird ein Fehler gemeldet und nicht automatisch
darüber installiert. Ein Treiberfehler bricht ab, ohne Erfolg vorzutäuschen.
Gleiche Generationen sind mehrdeutig und werden zurückgewiesen; bei Erschöpfung von `uint32_t` wird
eine neue Installation gesperrt, statt einen Überlauf zuzulassen.

Der Aufrufer muss einen vom Paket unabhängigen Scratch-Puffer von mindestens 4160 Bytes bereitstellen und alle Vorgänge serialisieren. Dieses Maximum umfasst 64 Header-Bytes und insgesamt 4096 Bytes Code/Daten; die individuellen Code- und Datenmaxima werden nicht addiert, da der BHA1-Vertrag den Gesamtspeicher auf 4096 Bytes begrenzt. Gegenüber dem ursprünglichen Scratch-Puffer werden 1024 Bytes eingespart, ohne gültige Pakete auszuschließen. Getestet werden sowohl 4096 Bytes Code als auch 3072 Bytes Code plus 1024 Bytes Daten sowie die Zurückweisung ohne E/A bei einem um ein Byte zu kleinen Scratch-Puffer. Es gibt keinen Heap und keinen internen Puffer in Bankgröße. Nach einem abschließenden Schreib-/Lesefehler kann die Installation bereits bestätigt worden sein: Vor einem erneuten Versuch muss erneut abgefragt werden; ein Rollback darf nicht angenommen werden.

`bh_store_load` verbindet die Bankauswahl mit dem validierten Laden in den RAM: Es kopiert Code/Daten und löscht BSS, ohne zum Einstiegspunkt zu springen. Scratch und RAM müssen voneinander unabhängig sein, ebenso der Ausgabedeskriptor. Ein zu kleines Ziel gibt `BH_STORE_NO_SPACE` zurück; Fehler verändern weder RAM noch Deskriptor. Der Aufrufer muss vor der Ausführung die tatsächliche Link-Adresse reservieren; dieser Helfer validiert keine Adressen und macht aus Bytes keine Funktion.

Tests mit simuliertem NOR decken 322 Unterbrechungen/Fehler beim Lesen,
Schreiben und Löschen bei Erstinstallation und Aktualisierung ab, einschließlich
Teilschreibvorgängen, falschen Schreib-/Lösch-ACKs, Beschädigung, maximalem Paket,
gleichen Generationen, Wechseln und erschöpfter Generationsnummer.
Bei jeder Unterbrechung einer Aktualisierung wird geprüft, dass sich der vorherige Bank nicht ändert.
Außerdem werden das Laden von Code/Daten/BSS und der Erhalt des RAMs
bei Fehlern getestet. Das belegt keine Toleranz gegenüber Stromausfällen
und keine Atomarität des echten Chips. SPI-/Flash-Treiber,
Sektorreservierung, USB-Installer und Anbindung an den Resident-Launcher fehlen noch.

Laufende Plattformtests (C11-Desktop-Compiler erforderlich):

```powershell
cmake -S firmware\platform -B firmware-builds\platform-tests -DBUILD_TESTING=ON
cmake --build firmware-builds\platform-tests
ctest --test-dir firmware-builds\platform-tests --no-tests=error --output-on-failure
```

Alle acht C-Tests und der JavaScript/C-Integrationstest bestehen über
CMake/CTest am Desktop. Der Integrationstest wird aktiviert, wenn Node.js gefunden wird.
Der Workflow `firmware-modules.yml` nimmt diese getrennte Testsuite ebenfalls auf
unter Linux mit Prüfung auf undefiniertes Verhalten auf; die lokale Workflow-Änderung
bedeutet nicht, dass sie bereits auf GitHub ausgeführt wurde.

#### Experimenteller BHT1-Empfänger und Übertragungsclient

`bh_transfer.c` implementiert die Zustandsmaschine des Empfängers, ohne seriellen/USB-Treiber.
`scripts/platform-transfer.cjs` kodiert Anfragen, validiert
Antworten und stellt `uploadPackage(exchange, bytes, session)` bereit; `exchange`
muss einen vollständigen Frame übergeben und genau dessen Antwort zurückgeben.
Es öffnet keine Ports und bietet keine Installation im aktuellen Web-Frontend.

Jede Anfrage besitzt einen 24-Byte-Header und bis zu 128 Bytes Payload.
Alle Ganzzahlen sind u32 little-endian kodiert:

| Offset | Feld |
| --- | --- |
| 0 | Magic BHT1 |
| 4 | Operation: BEGIN 1, DATA 2, COMMIT 3, ABORT 4, STATUS 5 |
| 8 | Nicht-null Sitzungs-ID, vom Client ausgewählt |
| 12 | Offset im Paket für DATA; bei anderen Operationen null |
| 16 | Payload-Länge |
| 20 | CRC-32 von Header und Payload; dieses Feld wird dafür auf null gesetzt |

BEGIN enthält zwei u32-Werte: Gesamtlänge (66..4160) und CRC-32 des gesamten BHA1.
DATA sendet zusammenhängende Blöcke von 1..128 Bytes. Ein doppelter Block wird nur akzeptiert,
wenn er exakt mit bereits empfangenen Bytes übereinstimmt und den Offset nicht doppelt erhöht;
Lücken und teilweise Überlappungen werden zurückgewiesen. Ein wiederholtes BEGIN derselben
Sitzung/Länge/CRC behält den Fortschritt bei. Eine andere Sitzung kann einen laufenden Empfang nicht
unterbrechen. ABORT bricht ab, ohne den Installer aufzurufen;
STATUS fragt den Status ab, ohne die Frist zu verlängern. Der Empfang läuft 30000 ms nach BEGIN oder dem letzten gültigen DATA ab;
Zeitdifferenzen werden bei Überlauf als vorzeichenlos behandelt.
Für eine abgelaufene oder abgebrochene Sitzung ist eine neue ID erforderlich.

COMMIT erfordert alle Bytes, eine korrekte Gesamt-CRC sowie die Validierung von BHA1/API/
Capabilities, bevor der Installer-Callback aufgerufen wird. Ein wiederholtes COMMIT ruft den Callback
nicht erneut auf, weder nach Erfolg noch nach Fehler: Ein Schreibfehler
kann bedeuten, dass der Flash bereits bestätigt wurde. Der Client
wiederholt ein COMMIT mit verlorener Antwort nicht automatisch; er muss
vor einer neuen Aktion STATUS und Speicherstatus abfragen.

Die BHR1-Antwort ist 32 Bytes lang: Magic, Operation, Sitzung, Ergebnis, empfangene Bytes,
Status, Installer-Ergebnis (i32), CRC der ersten 28 Bytes.
Ergebnisse: OK 0, BAD_FRAME 1, BAD_SESSION 2, BUSY 3, BAD_OFFSET 4,
INCOMPLETE 5, BAD_PACKAGE 6, INSTALL_ERROR 7, EXPIRED 8, BAD_STATE 9.
Statuswerte: IDLE 0, RECEIVING 1, DONE 2, FAILED 3, CANCELLED 4, TIMED_OUT 5.
Der Client weist falsche CRC, Sitzung, Operation, Status oder Offset-ACKs zurück.

Der Aufrufer muss Aufrufe serialisieren, Instanz und Staging gültig halten
und separate Puffer für Instanz, Staging, Frame und
Antwort bereitstellen. Erforderlich ist ein Staging-Puffer von 4160 Bytes. Der Callback erhält dieses Staging
nur während COMMIT und darf es weder verändern noch behalten. Ein wiedereintretender Aufruf
gibt BUSY zurück, ohne eine Antwort zu erzeugen. Der künftige physische Transport muss Wartezeiten begrenzen, Verbindungsabbrüche melden
und Flusskontrolle ausführen. Die Transfer-API empfängt vollständige Frames;
das Zusammensetzen eines beliebig fragmentierten Datenstroms übernimmt
`bh_stream.c`, descrito a continuacion.
CRC und Sitzungs-ID **authentifizieren den Absender nicht**.

`bh_stream.c` verarbeitet pro Aufruf ein Byte, erkennt die Magic BHT1 und eine Länge
bis höchstens 128 Bytes und prüft die CRC, bevor es den Frame an den
Empfänger übergibt. Es benötigt weder Längenpräfix noch zusätzliche Trennzeichen.
Es toleriert fragmentierte oder verkettete Frames. Nach Rauschen, ungültiger Länge
oder falscher CRC sucht es erneut nach der Magic; eine Magic innerhalb einer gültigen Payload
wird nicht als zweite Anfrage interpretiert. Es gibt explizite Framing-Fehler zurück;
nur `BH_STREAM_REPLY` erlaubt das Senden seines BHR1-Puffers.
Der Aufrufer muss diese Fehler melden oder protokollieren und darf keinen Erfolg vortäuschen.

Ein unvollständiger Frame läuft nach 1000 ms ohne neue Bytes ab; vorzeichenlose
Differenzen behandeln einen Überlauf korrekt. `bh_stream_poll` prüft die Frist
auch ohne weiteres empfangenes Byte. Ein Timeout verwirft nur den Teil-Frame, bricht aber
weder die Transfersitzung ab noch verändert es den vorherigen Bank. Der Treiber muss
einen Verbindungsabbruch melden und entscheiden, ob die Sitzung fortgesetzt werden kann.
Aufrufe und Puffer müssen serialisiert werden; der Installer-Callback darf
nicht erneut in den Stream eintreten. Es gibt keinen Heap: Der Zusammensetzungspuffer benötigt 152 Bytes,
zusätzlich zu Struktur, Antwort, Staging und temporärem Speicher des Validators.

Die Desktop-Integration sendet den rohen BHT1-Datenstrom über Pipes von JS an den C-Empfänger,
installiert in simuliertes NOR und validiert das anschließende Laden in den RAM; sie deckt zwei
Generationen, das Maximalpaket und Wiederholungen ohne erneute Installation ab und fügt vor jedem Frame Rauschen ein.
Das nur im ersten Harness verwendete Längenpräfix wurde entfernt.
Derselbe Test mit den echten ARM-Paketen
für Diagnostics und Blocks führt 34 JS/C-Austausche durch, einschließlich
Abbruch und Zurückweisung einer falschen Gesamt-CRC, ohne den aktiven Bank zu ersetzen.
Der C-Test prüft außerdem 10000 fehlerhafte Frames, ohne Sitzung oder Installer-Aufruf zu verändern.
Der Stream testet alle Trennstellen eines STATUS-Frames, verkettete Frames,
maximale Payload, verschachtelte Magic,
Wiederherstellung nach Beschädigung, Timeout bei Überlauf und 100000 Bytes Rauschen.
Empfänger und Stream werden außerdem für
Cortex-M0+ kompiliert. **Sie sind weder mit dem Residenten gelinkt noch schreiben sie physischen Flash**:
Staging, Scratch, App-RAM und Stack müssen vor der Integration gemeinsam budgetiert werden;
Puffer dürfen nicht ohne Prüfung des 16-KiB-Limits einfach addiert werden.

Mit den aktuellen maximalen Puffern belegen Staging und Scratch zusammen 8320 Bytes:
Das überschreitet die für CORE reservierten 8192 Bytes bereits um 128, noch bevor
Strukturen, Framebuffer oder App-Zustand hinzukommen. APP und STACK besitzen
jeweils eigene 4096-Byte-Bereiche; sie sind kein freier RAM für diese Puffer.
Die Verkleinerung des Scratch-Puffers vermeidet Verschwendung, **löst aber für sich
genommen das Integrationsproblem nicht**. Der Empfänger wird nicht durch bloßes Addieren dieser Puffer
an den Residenten angeschlossen; auch der Stack wird nicht ohne Messungen verkleinert, um den Überlauf zu kaschieren.
Erforderlich sind blockweises Speichern/Prüfen oder eine Speicherwiederverwendung
mit geprüften Lebensdauern und Überlappungen, wobei der Vertrag erhalten bleibt,
der eine Überlappung von Paket und Scratch während der Installation verhindert.

#### Erster experimenteller eigenständiger PY32-Resident

```powershell
node scripts\build-platform-resident.cjs firmware-builds\residente-nuevo firmware\Fusion61
```

Das zweite Argument bezeichnet den lokalen Referenzbaum mit den
CMSIS/LL-PY32-Headern und `Core/Src/system_py32f071.c`. Seine
F4HWN-Anwendung wird nicht gelinkt: Startcode, Linker, Shell, Text, Framebuffer und Display-/Tastaturanbindung
Anzeige/Tastatur dieses Images befinden sich in `firmware/platform`. Die BSD-/Apache-Urhebervermerke der Drittkomponenten bleiben
der Drittkomponenten bleiben erhalten; dies ist kein aus Karina
wiederhergestellter Code und auch keine Behauptung vollständiger Lizenzunabhängigkeit.
Erfordert die ARM GNU Toolchain und überschreibt keine vorhandenen Zielverzeichnisse.

Der Builder kompiliert zunächst Diagnostics und Blocks als unabhängige BHA1-API-2-Pakete
und nimmt sie unverändert in den Flash des Residenten auf. Beim Start einer
App validiert `resident_apps.c` das Paket, kopiert es in den 4096-Byte-Bereich
bei `0x20002000`, löscht BSS und bereitet den Thumb-Einstieg mit Speicherbarrieren vor.
Der ARM-Code enthält diesen Ausführungspfad: **Die Kompilierung beweist nicht, dass
der Sprung oder die Apps auf dem MCU funktionieren**. Zugelassen sind nur diese Pakete,
die zusammen mit dem Residenten gebaut werden; Laden über USB oder externen Speicher
gibt es nicht, und der Dual-Bank-Speicher ist noch nicht angebunden.

Vom Linker geprüfte Speicherkarte:

- Anwendungs-Flash ab `0x08002800`, 118 KiB; ohne Bootloader.
- RAM des Kerns: `0x20000000..0x20001fff`, 8 KiB.
- Ausführbarer RAM für eine App: `0x20002000..0x20002fff`, 4 KiB.
- Stack: `0x20003000..0x20003fff`, 4 KiB; ohne Heap.

Der eigene Startup-Code initialisiert Daten/BSS und VTOR. Er deaktiviert und löscht
übernommene externe NVIC-Interrupts sowie ausstehende SysTick/PendSV-Ereignisse;
danach aktiviert er ausschließlich SysTick mit 1 ms als Zeitbasis.
Die ISR erhöht lediglich einen `volatile` 32-Bit-Zähler: Sie ruft weder den Launcher auf
noch zeichnet sie. LCD-Aktualisierungen hängen weder von der COUNTFLAG-Abfrage ab noch
verlieren sie Zählerschritte während des Zeichnens. Die vom Bootloader bereitgestellten Takte bleiben erhalten;
ihre Frequenz wird mit der CMSIS-Berechnung ausgelesen. Der Code programmiert weder den internen
Flash noch den Kanalspeicher. Die erste Anbindung verwendet das ST7565-LCD
über GPIO und eine Tastaturmatrix; sie initialisiert kein RF und bietet keine TX-API. Dies
garantiert keine physische TX-Sperre; auch ein Sprung aus
anderer Firmware mit aktiven Peripheriegeräten wird nicht unterstützt.

Im Menü wählst du Diagnostics/Blocks mit UP/DOWN und öffnest mit MENU.
In Blocks: 4/6 links/rechts, MENU drehen, DOWN absenken, `*` caida directa,
0 neu starten und EXIT zurück. Erforderlich sind drei stabile Tastaturabtastungen
im Abstand von 10 ms; gehaltene Tasten werden nicht wiederholt und Tastenkombinationen nicht akzeptiert.
Die Shell fordert höchstens alle 500 ms einen Tick an, ohne Nachhol-Bursts.
Spiel-Ticks verwenden vorzeichenlose Zeitdifferenzen, um einen Überlauf
des Millisekundenzählers zu tolerieren. Die ISR muss vor der nächsten Millisekunde bearbeitet werden;
eine App darf Interrupts nicht maskieren. Das lässt sich jedoch bei nicht vertrauenswürdigem
nativem Code nicht erzwingen; reale Laufzeiten müssen gemessen werden.

Erzeugt werden ELF, experimentelles BIN, Map-Datei, Compiler-Stackberichte,
BHA1-Pakete, Manifeste mit SHA-256 sowie Lizenzen/Hinweise. Der Builder prüft
BIN-Grenzen, Stack-/Reset-/SysTick-Vektoren gegen ELF-Symbole,
Ziele aller übrigen Vektoren, RAM-Grenzen und fehlende
unaufgelöste Symbole. Seine Tests weisen falsche Thumb-Vektoren, überlappenden RAM
und fehlende Symbole auch ohne ARM-Compiler zurück.
Einzelne Stackberichte **belegen nicht** den maximalen kumulierten Stackbedarf.
Shell und Renderer werden am Desktop getestet, einschließlich Ticks bei
499/500 ms, Zeitüberlauf, Rückkehr zum Menü, Fehlern und Textgrenzen.
Der 3x5-Renderer ist eigenständig und enthält keine Schriftarten oder Ressourcen anderer Firmware.

**Dieses BIN nicht mit dem aktuellen Web-Installer und nicht als Multiboot-Slot laden.**
Es implementiert weder F4HWN-Slotkennung/CRC noch USB-Protokoll, Wiederherstellung oder
Installation externer Apps. Das Manifest enthält weiterhin `hardwareTested: false`
und `installableWithCurrentWeb: false`. Der erste Starttest muss
mit einer vollständig geprüften Sicherung und einem verifizierten Wiederherstellungsweg erfolgen.

### Verteilung auf Funktions-Images

#### Neukompilierung und Modultests vom 26.10.2026

Die drei Profile wurden aus dem festgelegten Commit mit Bricohams-Branding
sowie deaktiviertem Beacon und VOX neu kompiliert. Es wurde kein Code aus der Karina-Binärdatei
übernommen und diese Builds wurden während dieser Prüfung nicht installiert.

| Profil | BIN (Bytes) | Gelinkter Flash / 120832 | RAM / 16384 |
| --- | ---: | ---: | ---: |
| ARDF | 113960 | 113072 | 12576 |
| Satelliten (einschließlich CAT TX) | 114844 | 113956 | 12384 |
| Spektrum/VFO-PRO | 118040 | 117152 | 13440 |

Der gelinkte Flash enthält nicht die 888 Bytes des Multiboot-Stubs, die ebenfalls im BIN gespeichert sind. Der Builder prüft Vektoren, Identität,
Image-Grenzen und die Isolation des Stubs.

Die neun C-Desktoptests bestanden mit Zig 0.13.0 als C-Compiler:
ARDF und Adapter, Doppler, CAT RX, CAT TX, Satelliten-Adapter,
Spektrum, Preset-Codec und Spektrum-Adapter. Die Adapter verwenden
simulierte RF-/Display-Primitiven; diese Ergebnisse zertifizieren weder RF noch Audio,
physischen Start noch vollständige funktionale Kompatibilität mit Karina.
Auch die sieben JavaScript-Tests des Builders bestanden.

Dies ist eine geprüfte Neukompilierung vorhandener Module, keine
Neuimplementierung aller Karina-Funktionen. Insbesondere belegt sie weder
dynamische Lautstärke, gleichwertige automatische Erfassung mit Rauschfilter,
gleichwertige interne AM-/Squelch-Zeitsteuerung, AM-Generator,
vollständige persistente Status-Presets noch Menügleichheit.
Automatische Antworten oder TX-Baken werden nicht implementiert, nur weil sie
in der Karina-Dokumentation stehen. Die Protokollidentität bleibt F4HWN:
Eine Umbenennung ohne Aktualisierung von Connectors und Speicherzuordnungen würde die
bestehende Interoperabilität brechen.

Wenn Flash/RAM ein einzelnes Image verhindern, werden Funktionen auf getrennte Images
verteilt. Ziel ist es, Main zu erhalten und kompatible Images auf
Slots 1–4 zu verteilen, keine dynamische Code-Ladung zu erfinden und keine Bankformate zu mischen.
Slots werden nicht zugewiesen und Hardware wird nicht automatisch beschrieben.

| Funktions-Image | Tatsächlicher Status |
| --- | --- |
| Bricohams ARDF | Beta-Image mit `--module ardf`, Zyklen und manueller Dämpfungsspeicherung in Fox Hunt erstellt |
| Bricohams Satelliten | Beta-Image mit manuellem Doppler und CAT RX v1, erstellt mit `--module satellite`; keine autonome Orbitverfolgung |
| Bricohams Spektrum | Beta-Image `--module spectrum`: 128 RX-Punkte, Peak-Hold, Mittelung, RAM-Multipreset und VFO-PRO-RX-Erfassung mit Frequenzeingabe |
| Übrige dokumentierte Karina-Funktionen | Erfordern Rekonstruktion und Tests; sie gelten nicht allein durch Umbenennung eines Images als enthalten |

Die Aufteilung stellt keinen Karina-Code wieder her und garantiert nicht, dass die Algorithmen
gleichwertig sind. Jedes Image benötigt ein eigenes Manifest, tatsächliche Module, Grenzen,
Quellen/Lizenzen und strukturelle Validierung. Das Budget muss
nach dem Linken jeder Kombination gemessen werden. Main wird nicht ersetzt, um den
Selektor zu demonstrieren, und Binärdateien anderer Projekte werden nicht automatisch installiert.

### Eigener Satellitenkern

`firmware/bricohams/doppler.c` berechnet Frequenzkorrekturen anhand der
Radialgeschwindigkeit in mm/s. Ein positiver Wert bedeutet, dass sich der Satellit entfernt: RX sinkt
und der nominale Uplink steigt. Frequenzen werden in Einheiten von
10 Hz angegeben und auf den nächsten Schritt gerundet. Die Formel entspricht dem
klassischen nichtrelativistischen Modell der Webplanung; sie reproduziert keinen
Karina-Algorithmus und aktiviert keine Übertragung. Die Ausgabe setzt stets `receive_only=true`.

`BRICOHAMS_ENABLE_SATELLITE=OFF` schließt die Bibliothek aus. Geprüft werden VHF
136–174/UHF 400–470 sowohl für nominale als auch korrigierte Frequenzen sowie Radialgeschwindigkeiten von
bis zu 12 km/s in beide Richtungen. Bei ungültiger Eingabe bleibt die Ausgabe
unverändert und ein expliziter Fehler wird zurückgegeben. Es erzeugt weder TLE, UTC-Zeit, Position,
SGP4-Pässe noch Radialgeschwindigkeit: Diese Daten müssen aus einem
validierten Prädiktor stammen. CAT, automatische Verfolgung und Persistenz werden ebenfalls nicht implementiert.
Die Tests vergleichen 241 Geschwindigkeiten mit einer Double-Precision-Referenz und prüfen
Vorzeichen, Grenzen und Rundung auf höchstens eine halbe Einheit (5 Hz).

### Satelliten-Image: manueller Dopplerempfang

Zu diesem Image gehörende Benutzeranleitungen: [Satelliteneinstieg](INICIACION-SATELITE.md)
(Konzepte, Pässe, Doppler, Bedienung mit den Tasten 4/5/6/8/9 und CAT) sowie
[Satellitenantennen](ANTENAS-SATELITE.md) (Dualband-Yagi und V-Dipol
als Modelle mit druckbaren STL-Teilen).

Der Builder akzeptiert im folgenden FieldOps-Befehl `--module satellite` statt `--module ardf`,
mit Beacon und VOX auf OFF. Eine Kombination beider Module wird abgewiesen:
Sie verwenden unterschiedliche Anzeigen/Tasten desselben Resident-Modus. Der Dateiname
der Binärdatei enthält das Modul und verhindert Verwechslungen zwischen Images.

Der Adapter `satellite_foxhunt.inc` übernimmt beim Eintritt in Fox Hunt die nominalen RX- und TX-Frequenzen des VFO/Kanals
und zeigt `SAT RX` an. Beide Frequenzen müssen innerhalb der
zulässigen Bänder liegen. Die VFO-Daten oder TX-Frequenz werden nicht verändert;
das berechnete Uplink-Ergebnis wird nicht auf den Sender angewandt.
Ausschließlich die RX-Abstimmung und ihr Filter werden über die
vorhandenen Primitiven geändert. Beim Verlassen stellt der Fox-Hunt-Ablauf die VFO-Register
mit `RADIO_SetupRegisters` wieder her. Dies muss auf Hardware überprüft werden.

| Taste | Manueller Doppler |
| --- | --- |
| 4 | Radialgeschwindigkeit um 500 m/s verringern (Annäherung ist negativ) |
| 5 | Geschwindigkeit null: nominale RX-Frequenz wiederherstellen |
| 6 | Radialgeschwindigkeit um 500 m/s erhöhen (Entfernung ist positiv) |
| 8 | Temporäres CAT RX aktivieren/deaktivieren und auf nominales RX zurückstellen; gültiger VFO erforderlich |
| 9 | CAT-PTT scharf-/unscharfschalten (CAT TX v1), um SSTV aus der App zu senden |
| 2 | Vorhandenes Fox-Hunt-Audio: stumm, Signaltöne, empfangenes Audio; startet mit gespeicherter Upstream-Einstellung |
| EXIT | Beenden und RF-Konfiguration des VFO wiederherstellen |

Manuelle Grenze: +/-12 km/s, ohne Überlauf. Geschwindigkeit und korrigierte Frequenz
werden auf dem Bildschirm angezeigt. `SAT INVALID VFO` bedeutet, dass die nominale Eingabe oder
Korrektur außerhalb des zulässigen Bereichs liegt: Es erfolgt kein neuer RF-Schreibvorgang, und
die letzte akzeptierte Abstimmung bleibt bestehen; Taste 5 setzt auf null zurück, sofern der Nominalwert gültig ist.
Für einen Wechsel von Kanal/Nominalfrequenz musst du den Modus verlassen und erneut öffnen.
Die neuen Tasten beachten die Tastensperre und verwenden F nicht als Umschalter.
Es gibt weder TLE, automatische Satellitenauswahl, UTC-Uhr noch SGP4 oder
Passvorhersage im Funkgerät. Eine korrekte Radialgeschwindigkeit wird manuell
aus einem externen Prädiktor übernommen oder eine absolute RX-Frequenz
über das neue experimentelle CAT gesetzt. Sie wird nicht aus RSSI abgeleitet.

Der Build mit der Kennzeichnung SAT RX maß 112320 Bytes, RAM 12352/16384 und Flash
111432/120832; jede spätere Änderung muss erneut gemessen werden.
Die Adaptertests simulieren RF-Primitiven und prüfen Vorzeichen,
Grenzwerte, angewandte Frequenz, unveränderte TX/VFO-Werte sowie Wiederherstellung
nach Fehlern. Sie zertifizieren weder Empfang noch Audio oder physische Wiederherstellung.
Der Modus ist auf Empfang ausgelegt, außer wenn CAT-PTT mit 9 scharfgeschaltet wird (siehe CAT TX); die übrige Firmware behält die TX-Funktionalität des Upstreams.
Die Firmware sperrt TX nicht global und das Gerät ist kein Vollduplexgerät.

#### CAT RX Bricohams v1 implementiert

Das Image `Satellite-CAT-final-20261025` misst 113868 Bytes RAW,
RAM 12384/16384 und Flash 112980/120832. enthält ein Bricohams-Bootlogo und einen
eigenen experimentellen Endpunkt; es ist nicht mit CAT-Protokollen von
Kenwood/Yaesu oder CAT-Unterstützung anderer F4HWN-Editionen kompatibel.

Drücke in SAT RX bei entsperrter Tastatur 8: `CAT READY RX`.
Ein gültiger Befehl zeigt `SAT CAT RX`. Die Tasten 4/5/6 deaktivieren CAT
und geben die Kontrolle an den manuellen Doppler zurück; 8 deaktiviert es und stellt die
nominale Eingangs-RX-Frequenz wieder her. Durch Sperren der Tastatur wird CAT beendet und auf die nominale RX-Frequenz zurückgestellt.
Beim Verlassen des Modus wird der CAT-Zustand vor der Wiederherstellung des
VFO durch den Upstream-Ablauf gelöscht. Beim erneuten Eintritt muss CAT wieder mit 8 aktiviert werden.

Jedes SET erneuert ein Lease von 3000 ms. Nach Ablauf wird die nominale RX-Frequenz angewandt,
ausstehende SET-Befehle werden verworfen und `CAT TIMEOUT`; CAT bleibt
für einen neuen gültigen Befehl aktiviert. QUERY, ungültige Befehle und Fehler
verlängern das Lease nicht. Eine Korrektur eines verpassten Passes bleibt nicht unbegrenzt bestehen.
Der Timeout wird in der RX-Schleife und nicht in einem Interrupt geprüft:
Er setzt voraus, dass die Firmware diese Schleife weiter ausführt. Es handelt sich nicht um einen Hardware-Watchdog
und nicht um eine Garantie bei blockierter CPU.

Der Endpunkt verwendet vorhandene USB-CDC/UART-Frames mit Verschleierung und
CRC wieder; **dies ist weder Verschlüsselung noch Authentifizierung**. Er akzeptiert nur absolute Frequenzen
in 10-Hz-Einheiten, einschließlich 136–174 oder 400–470 MHz, und wendet sie nur an
wenn SAT RX lokal aktiviert ist. Kanäle, Subtöne, Leistung,
EEPROM, Flash oder TX werden nicht geändert. Modulation/Bandbreite entsprechen dem Eingangs-VFO.
Verwende es nicht zur Sendesteuerung und behaupte nicht, die RF-Abstimmung sei
gemessen worden: Die Bestätigung besagt lediglich, dass die RX-Primitiven aufgerufen wurden.

Binärvertrag little-endian, privater Befehl `0x7B00`, Antwort `0x7B01`.
Der Size-Header des Upstreams gibt die Datenlänge ohne Header an.
Fremder Firmware werden keine neuen Befehle zugewiesen.

| Anfrageoffset | Bytes | Inhalt |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 SET_RX, 2 STOP_RX |
| 2 | 2 | Sequenz, in der Antwort wiederholt |
| 4 | 4 | RX-Frequenz in 10 Hz; für QUERY/STOP muss sie null sein |

Die Anfrage muss genau 8 Bytes lang sein; optionale Felder gibt es nicht.

| Antwortoffset | Bytes | Inhalt |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status |
| 2 | 2 | Sequenz; null, wenn die Länge keine Verarbeitung der Anfrage erlaubt |
| 4 | 4 | Capabilities 7: Bit 0 SET_RX, Bit 1 QUERY, Bit 2 STOP/Lease; kein TX/kein dauerhaftes Schreiben |
| 8 | 4 | Zuletzt per Software angewandte Frequenz in 10 Hz; null, wenn CAT deaktiviert |
| 12 | 4 | Flags: Bit 0 lokal aktiviert, Bit 1 Remote-Lease, Bit 2 Änderung ausstehend |

Statuswerte: 0 Abfrage erfolgreich, 1 eingereiht, 2 falsche Länge/Felder,
3 Version nicht unterstützt, 4 Operation nicht unterstützt, 5 CAT nicht aktiviert,
6 Frequenz außerhalb des Bands. Jeder Fehler erhält den vorherigen Zustand.
SET/STOP geben 1 zurück: **Das bedeutet nicht, dass die Änderung angewandt wurde**. Die RX-Schleife wendet die
validierte Änderung an, aktualisiert die gemeldete Frequenz und löscht das Pending-Bit.
Ein weiteres SET vor der Anwendung ersetzt das vorherige, statt eine
unbegrenzte Warteschlange anzulegen. STOP fordert die nominale RX-Frequenz an und beendet das Lease, ohne
weitere Befehle zu verhindern, solange es physisch aktiviert bleibt.

Der Web-Connector stellt `getCatStatus`, `setCatReceive(frequency10Hz)` und
`stopCatReceive`. Er validiert Sequenz/Version/Capabilities, unterscheidet den
den ausstehenden vom angewandten Status und prüft das Ergebnis über begrenzte Abfragen.
Er wiederholt SET-Befehle nicht und verlängert Leases nicht automatisch. Ein Fehler macht die
Verbindung gemäß dem bestehenden Ablauf ungültig und erfordert eine erneute Verbindung. Dies sind keine Funktionen zur
dauerhaften Programmierung und sie erlauben kein Schreiben ohne Sicherung.

#### CAT TX Bricohams v1 (PTT mit Lease)

Am 26.10.2026 hinzugefügt, um SSTV aus der Android-App zu senden. Es ist eine Remote-PTT
für eine externe Audioquelle am Mikrofoneingang des
Funkgeräts; Frequenz, Leistung, Subtöne, EEPROM und Flash werden nicht geändert. Die Firmware
erzeugt das Audio nicht: Die App spielt Robot36 über ein Kabel am Mikrofoneingang
ab, während sie die PTT aktiviert hält.

Sicherheitsmaßnahmen in Reihenfolge:

1. **Bestätigung am Funkgerät.** Nur Taste 9 in SAT RX schaltet PTT scharf (`CAT TX ARMED`); der Host kann sie nicht scharfschalten. Tastatursperre, Verlassen von SAT RX oder erneutes Drücken von 9 schalten sie unscharf.
2. **Lease von 1500 ms.** Der Host erneuert den KEY-Befehl; wenn er dies nicht mehr tut, gibt das Funkgerät PTT automatisch frei. Ein eingereihter KEY-Befehl läuft ebenfalls ab.
3. **Limit von 120 s pro Aussendung.** Bei Erreichen gibt das Funkgerät PTT frei, schaltet sie unscharf und zeigt `CAT TX LIMIT`; zum erneuten Senden muss 9 wieder scharfgeschaltet werden.
4. **Bänder und TX-Sperre des Funkgeräts.** Vor dem Senden gelten dieselben Prüfungen wie für die Fox-Hunt-Bake (`FOXHUNT_TxState`): TX-Sperre nach Band, niedriger Batteriestand oder hohe Spannung sowie FM-Modulation. Bei Fehler erscheint `CAT TX DENIED`; KEY-Befehle funktionieren erst nach erneutem Scharfschalten mit 9.
5. **Jede Taste bricht ab.** Während der Aussendung ist die Schleife modal: Es laufen weder RX-Messung noch Fox-Hunt-Geiger-Signaltöne, sondern nur UART und Tastatur. Jede neue Taste gibt PTT frei und schaltet sie unscharf.
6. **Rufzeichen erforderlich.** Die App sendet nicht ohne gültiges Rufzeichen und druckt es in das Robot36-Bild.

Gesendet wird auf der TX-Frequenz des Eingangs-VFO (mit dessen Offset), ohne
Uplink-Dopplerkorrektur. Die rote LED leuchtet wie bei normaler PTT und
der Bildschirm zeigt `CAT TX ON AIR` und die TX-Frequenz. Während der Aussendung werden
CAT-RX-Befehle angenommen, aber erst bei Rückkehr zu RX angewandt.

Vertrag: privater Befehl `0x7B02`, Antwort `0x7B03`, little-endian.

| Anfrageoffset | Bytes | Inhalt |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 KEY (Lease aktivieren oder erneuern), 2 UNKEY |
| 2 | 2 | Sequenz, in der Antwort wiederholt |
| 4 | 4 | Reserviert, null obligatorio |

| Antwortoffset | Bytes | Inhalt |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status |
| 2 | 2 | Sequenz; null, wenn die Länge keine Verarbeitung der Anfrage erlaubt |
| 4 | 4 | Capabilities 8: PTT mit Lease; keine Frequenz, Leistung oder dauerhafte Speicherung |
| 8 | 4 | Flags: Bit 0 scharfgeschaltet, Bit 1 sendet, Bit 2 KEY ausstehend, Bit 3 Zeitlimit erreicht; Bits 8–15 VFO-Status der Zurückweisung |
| 12 | 4 | Sendedauer in Millisekunden; null, wenn nicht gesendet wird |

Statuswerte: 0 erfolgreich (KEY: sendet bereits), 1 eingereiht (KEY ausstehend oder UNKEY ausstehend und noch nicht angewandt), 2 falsche Länge oder reserviertes Feld, 3 Version, 4 Operation,
5 nicht scharfgeschaltet, 7 vom Funkgerät abgewiesen, 8 Zeitlimit 120 s. UNKEY wird
immer akzeptiert. Die CAT-RX-Capabilities bleiben 7: CAT TX ist ein separater Endpunkt.

Geprüft am 26.10.2026: `cat_tx_test` (Protokoll, Lease, Limit, Zurückweisung) und `satellite_adapter_test` (Scharfschaltung per Taste, modale Aussendung, Tastenabbruch, Zurückweisung, Limit, Unscharfschaltung durch Sperre und Beenden) bestehen mit simulierten RF-Primitiven. Das F4HWN-v6.1.0-Fusion-Image mit `--module satellite` und
`ENABLE_FEAT_F4HWN_FOXHUNT=ON` kompiliert ohne Warnungen: Flash 113212/120832,
RAM 12384/16384. **Keine Validierung am Funkgerät oder RF-Messung.**

Unter **Quansheng > Betrieb** gibt es ein CAT-RX-Beta-Panel zum Abfragen,
Abstimmen während eines Lease und Zurücksetzen auf den Nominalwert. Der Status zeigt die letzte
Antwort, keine kontinuierliche Telemetrie. Die Web-Passverfolgung wird
weiter unten beschrieben; Android verfügt über einen experimentellen USB-Client mit SGP4-Orbitverfolgung. Die Bedienelemente sind deaktiviert, wenn keine Verbindung besteht oder
ein anderer Vorgang läuft. Zum Testen muss das neue Image gestartet werden:
Eine Verbindung mit der Original-Firmware installiert das Image nicht und aktiviert CAT nicht.

Die acht C-Suites decken Protokoll, Bereiche, ungültige Längen,
gespiegelte Sequenzen, Ablauf bei Überlauf, keine Verlängerung durch
Abfragen, lokale Abbrüche/Sperre und Adapterabläufe mit simuliertem RF ab.
JavaScript-Tests simulieren Transport, ausstehende Antworten,
falsche Sequenzen und Fehler; sie ersetzen keinen CAT-Test per USB/Funkgerät.
Das Manifest enthält `catRx` und Hashes des angewandten Codes. Es wurde nicht
geflasht und die physische Funktion nicht zertifiziert.

#### Web-Passverfolgung über CAT RX implementiert

Unter **SAT / Pässe** kannst du TLE/Frequenzen aktualisieren, eine mit Einwilligung angegebene Position eintragen,
Pässe berechnen und einen Pass sowie eine einzelne FM-Frequenz auswählen.
**Ausgewählten Pass mit CAT RX verfolgen** startet nur innerhalb des Zeitfensters
des ausgewählten Passes, wenn der Satellit über dem Horizont steht. Ein unbeaufsichtigter
künftiger Start wird nicht programmiert. Die Vorhersage darf höchstens
15 Minuten alt sein und das TLE muss die maximale Gültigkeit von sieben Tagen einhalten.
Das Funkgerät benötigt das oben beschriebene CAT-Image, SAT RX und die physische Aktivierung mit 8.

`catPassTarget` verwendet satellite.js/SGP4 und die vorhandene TLE-Validierung
erneut. Sie berechnet die Beobachter-Satelliten-Entfernung bei t-0,5 und t+0,5 Sekunden,
ermittelt die Radialgeschwindigkeit und wendet `fRX = fNominal * (1 - vRadial/c)` an.
Sie rundet auf 10 Hz und weist Ergebnisse außerhalb der zulässigen RX-Bänder zurück.
Zugelassen sind nur einzelne FM-/Narrow-FM-Frequenzen, keine linearen Transponder.
Der Beobachterstandort bleibt während der Sitzung unverändert: Es wird weder mobiles GPS verfolgt noch eine Antenne ausgerichtet.

`CatPassTracker` erstellt eine unabhängige Kopie des Plans: spätere Änderungen
ändern die aktive Sitzung nicht stillschweigend. Die Benutzeroberfläche sperrt Funk-/Programmieraktionen
und Planparameter während der Passverfolgung.
**Detener seguimiento CAT** liegt außerhalb des gesperrten Fieldsets und bleibt
bedienbar. Nach jedem bestätigten SET wartet das System 750 ms, bevor es den
nächsten Wert berechnet – abhängig von der Verbindung etwa eine Aktualisierung pro Sekunde.
Das Lease wird auch erneuert, wenn sich die gerundete Frequenz nicht ändert.
Zwei SETs laufen nie gleichzeitig; eine feste Echtzeit-Aktualisierungsrate wird nicht zugesichert.

Die Verfolgung endet mit dem Pass, beim Ausblenden/Schließen der Seite, beim Widerruf
der Einwilligung/Ändern von Daten, Verbindungsverlust, einem Ausbreitungsfehler
oder einer verspäteten Bestätigung. Auch rückwärts laufende Uhrzeiten
und Aktualisierungsintervalle über 2000 ms werden zurückgewiesen. Un navegador
ist kein Echtzeit-Controller: Kann ein suspendierter Browser STOP nicht senden,
hängt die Wiederherstellung vom 3-s-Lease der Firmware ab. Die UTC-Uhr des
Geräts muss stimmen; eine automatische externe Synchronisierung gibt es nicht.

Beim Abbruch wartet der Controller vor dem Senden von
STOP auf ein laufendes SET; dadurch wird verhindert, dass ein verspätetes SET die Verfolgung erneut aktiviert. SET wird nach dem Abbruch nicht
wiederholt und Sitzungen werden nicht automatisch neu gestartet. Fehler bei der
Wiederherstellung werden angezeigt und nicht als Erfolg ausgegeben. Die Oberfläche
zeigt die zuletzt berechnete Frequenz und Geometrie, keine RF-Messung.

Sechs JavaScript-Kernprüfungen decken Doppler im Vergleich mit
SGP4-Entfernungsberechnungen, Validierungen, Plansnapshot, Lease-Erneuerung,
Abbruch während SET, Passende, Diskontinuitäten, verspätete Antworten
und Verbindungsabbruch ab. Browser-Test mit simuliertem Transport: zwei RX-SETs,
manuelles STOP und STOP beim simulierten Ausblenden der Seite, ohne Fehler und mit weiterhin
bedienbarem Stoppknopf bei gesperrten Parametern.
Diese Befehle wurden nicht am echten Funkgerät ausgeführt. Die Android-APK enthält
temporäres CAT RX über CDC sowie erkannte USB-Seriell-Adapter mit eigener SGP4-Verfolgung. Die Orbitberechnung bleibt außerhalb des MCU;
TLE/SGP4 wurden nicht in den MCU aufgenommen.

### Eigene Spektrum-Presets ohne EEPROM-Schreibzugriff

`firmware/bricohams/presets.c` definiert einen BHSP-v1-Container mit 208 Bytes
für bis zu 8 Presets: 8-stelliger ASCII-Name, Startfrequenz,
Schrittweite, Punkte, Einschwingzeit und Messwerte. Explizite little-endian-Ganzzahlen,
IEEE-CRC32 und Nullwerte für reservierte Bytes werden verwendet; C-Structs werden nicht serialisiert und die
Ausrichtung ist unerheblich. Die aktive Auswahl ist Teil des Containers.

Der Codec prüft Konfigurationen und weist Beschädigungen, unbekannte Versionen/reservierte Werte
sowie ungültige Längen zurück. Vor dem Ersetzen des Zustands wird temporär dekodiert;
vor dem Ersetzen des Ziels wird temporär kodiert. Die Puffer dürfen sich nicht
mit dem Zustand überschneiden. CRC ist weder Signatur noch Authentifizierung.
Es wurde keine Adresse in EEPROM/Flash reserviert: Die Daten bleiben erhalten über
lokale Datei und die unten beschriebene RAM-Übertragung erhalten, nicht durch interne Speicherung.
Die Tests prüfen den Roundtrip und die Beschädigung jedes der 208 Bytes.

#### Preset-Übertragung in Dateien implementiert

Das Image `Spectrum-PresetFiles-beta-20261025` enthält den Export und Import
der gesamten RAM-Tabelle über **Quansheng > Operaciones >
Bricohams-Beta-Spektrum-Presets**. Die Datei `.bhsp` ist genau
208 Bytes groß und enthält keine privaten Kalibrierungs- oder Kanaleinstellungsdaten.
Die Übertragung schreibt weder EEPROM noch Flash und erlaubt keine
dauerhafte Programmierung.
Die Website lädt die Datei nicht auf Server hoch. Du musst sie weiterhin herunterladen und
aufbewahren; sie wird nicht automatisch auf dem Telefon oder Funkgerät gespeichert.

Vor der Übertragung: SPEC RX öffnen, mit 8 mindestens ein Preset speichern,
mit 4 pausieren (`HOLD`), MULTI falls aktiv deaktivieren und die Tastatur
entsperren. Während der RX-Erfassung ist keine Übertragung zulässig. Für den Import
sind keine vorherigen Presets erforderlich. Der Export einer leeren Tabelle erzeugt einen Fehler.
Die Freigabe hängt vom physischen Status des Funkgeräts ab, nicht von einem booleschen
Wert im Web. Jede während einer Übertragung verarbeitete Taste
verwirft den Teilzustand. Beim Verlassen des Modus wird er ebenfalls verworfen.

Der Export erstellt einen vollständigen BHSP-Snapshot und gibt ihn in zwei
Fragmenten zurück. Der Import empfängt beide Fragmente in einem temporären Puffer, validiert
die gesamte Datei und ersetzt erst danach die RAM-Tabelle. Eine Unterbrechung,
ein fehlendes Fragment, ein abweichendes Token oder eine falsche CRC ersetzt die Tabelle nicht.
Das allgemeine Codec-Format erlaubt mehr Konfigurationen als der Adapter;
der Import erfordert 128 Punkte, 10/20/40/80 ms Einschwingzeit, Schrittweiten 125/250/625/1250 in Einheiten
von 10 Hz, Mittelung 1/2/4/8 und ein vollständig innerhalb von 136–174 oder 400–470 MHz liegendes Fenster.
Namen, Auswahl, reservierte Felder und ungenutzte Datensätze müssen kanonisch sein.

Der Import stimmt nicht ab, setzt den Scan nicht fort und stellt Verstärkung,
Blacklist, CSS oder Audio nicht wieder her. Taste 9 ruft gemäß vorhandenem Verhalten
das nächste Preset ab; mit 4 wird fortgesetzt. Nach Bestätigung liest das Web die vollständige Tabelle erneut ein
und verlangt Byte-Gleichheit. Ein Fehler beim erneuten
Einlesen wird als nicht verifizierter Import angezeigt: Wurde COMMIT bereits
angenommen, kann nicht behauptet werden, dass die vorherige Tabelle weiterhin besteht.

Experimentelles privates little-endian-Protokoll `0x7B10` / Antwort `0x7B11`,
über vorhandene USB-CDC/UART-Frames. Es ist weder verschlüsselt noch authentifiziert.
Anfragen: Version 1 (Byte 0), Operation (Byte 1), nicht-null Token
32 Bit (Bytes 2–5) und nur für Operationen 2/3 ein 104-Byte-Fragment.
Alle anderen Befehle sind genau 6 Bytes lang. Antwort: Version 1,
Status und dasselbe Token, gefolgt von 104 Bytes ausschließlich bei erfolgreichen
Exporten. Fehlerantworten sind 6 Bytes lang. C-Structs werden nicht serialisiert.

| Operation | Aktion |
| --- | --- |
| 0 | Snapshot erstellen und erste 104 Bytes lesen |
| 1 | Zweite 104 Bytes desselben Snapshots lesen und Übertragung schließen |
| 2 | Import mit den ersten 104 Bytes beginnen |
| 3 | Zweite 104 Bytes empfangen |
| 4 | Vollständige RAM-Tabelle validieren und anwenden |
| 5 | Teilübertragung verwerfen, Presets nicht ändern |

Eine neue Operation 0/2 ersetzt die vorherige Übertragung. Die Operationen
1/3/4 erfordern korrektes Token und richtige Phase. Die Übertragung läuft
5000 ms nach ihrem Start ab; einzelne Fragmente verlängern das Zeitfenster nicht.
Statuswerte: 0 erfolgreich, 2 ungültige Anfrage, 3 erforderlicher physischer Zustand fehlt,
4 leere/ungültige Tabelle für den Export, 5 falsche Phase/Token/abgelaufen,
6 beschädigte/nicht unterstützte Datei, 7 vom Adapter nicht unterstützte Konfiguration.
Nach Fragmentfehlern gibt es weder automatische Wiederholungen noch COMMIT.

Der Build dokumentiert `spectrumPresets` und Quell-Hashes im
Manifest. Die Tests simulieren Funkgerät und Transport und umfassen Lesen,
CRC, atomaren Commit, Wiederherstellung der Datei, abweichendes erneutes Einlesen,
Sequenz/Token, Ablauf/Überlauf, ungültige Längen und Sperre bei
Erfassung/Multipreset/Tastatur. Presets bleiben dadurch über Dateien zwischen Sitzungen erhalten;
Dateien, nicht durch EEPROM-Persistenz. Physisches USB wurde nicht getestet.

### Spektrum-Image, VFO-PRO RX und Multipreset

`--module spectrum` ersetzt `--module ardf` im unten dokumentierten FieldOps-Befehl
und benötigt ein neues Ausgabeverzeichnis. Fox Hunt muss
resident ON, Beacon OFF und Overlay-Apps OFF sein. Jeder Adapter benötigt sein
eigenes Image. Fox Hunt zeigt `SPEC RX`; der ursprüngliche
Upstream-Analysator bleibt über seine anderen Aktionen verfügbar.

Der eigene Scan umfasst 128 Punkte: 64 unterhalb der Mitte, den Mittelpunkt
und 63 darüber. Das gesamte Fenster muss in 136–174 oder 400–470 MHz liegen.
Beim Eintritt übernimmt er die Mitte des ausgewählten VFO/Kanals. Speicher,
RX/TX des Kanals und Kalibrierung werden nicht geändert. Modulation und Bandbreite entsprechen weiterhin dem
ursprünglichen VFO; die Eingabe eines RX-Werts konfiguriert kein neues Kanalprofil.
Die Verstärkung verwendet vorhandene Presets und erlaubt aus der Erfassung nur die Anpassung der vier
dokumentierten RX-Felder von R13. Eine beliebige Registerbearbeitung
ist nicht möglich. Der Beenden-Ablauf stellt RF mit `RADIO_SetupRegisters` wieder her;
diese Wiederherstellung und die RF-Funktion müssen noch physisch getestet werden.

| Taste | Barrido propio |
| --- | --- |
| 0 | Zyklischen Durchlauf der RAM-Presets aktivieren/deaktivieren; mindestens zwei erforderlich |
| 4 | Scan und Fensterwechsel pausieren/fortsetzen |
| 5 | Peak-Hold auf die aktuellen Pegel zurücksetzen |
| 6 | Schrittweite 1.25, 2.5, 6.25, 12.5 kHz; Frame zurücksetzen |
| 7 | Mittelung mit 1, 2, 4 oder 8 Messungen pro Punkt; Frame zurücksetzen |
| * | RX-Einschwingzeit 20, 40, 80, 10 ms, zyklisch; Frame zurücksetzen |
| 8 | Im nächsten RAM-Preset speichern; wenn acht vorhanden sind, das ausgewählte ersetzen |
| 9 | Nächstes RAM-Preset zyklisch laden |
| 3 / Pfeiltasten | Upstream-Dämpfung; Verstärkungswechsel setzt nicht vergleichbare Messungen zurück |
| 1 | Sitzungsausschlüsse löschen und Messungen zurücksetzen |
| 2 | Keine Aktion während des Scans; Audio stummgeschaltet |
| PTT | Stärksten gemessenen Punkt in VFO-PRO RX erfassen; nicht senden |
| EXIT | Beenden, RAM-Presets verwerfen und den VFO wiederherstellen |

Angezeigt werden Roh-RSSI und Spitzenwerte mit automatischer Skala von 0 bis zum Maximum der
Spitzenwerte des Frames, keine kalibrierten dBm-Werte und keine FFT. Die Skala kann sich ändern.
Bei jeder Abstimmung werden Frequenz und RX-Filter gesetzt und der BK4819-Empfang zurückgesetzt;
vor der Annahme von Messwerten wird mindestens die ausgewählte Einschwingzeit des echten SysTicks abgewartet. No
wartet nicht blockierend. Jeder Messwert stammt aus einer anderen Iteration.
Auch Verzögerungen in der modalen Schleife beeinflussen die Taktung; es werden weder
Scanrate, Auflösungsbandbreite noch Messgenauigkeit garantiert.

Die Einschwingzeit beginnt bei jedem Eintritt in den Modus mit 20 ms und wird
individuell in RAM-/BHSP-Presets gespeichert. Frühere Dateien mit 20 ms
bleiben zulässig; andere Werte als 10/20/40/80 werden zurückgewiesen, ohne
die Tabelle zu ersetzen. VFO-PRO-Erfassung und Verstärkungsänderungen behalten
ihre unabhängige Wartezeit von 20 ms bei. Der 10-ms-Modus ist experimentell:
Seine Verfügbarkeit beweist nicht, dass PLL, Filter oder RSSI
unter allen Bedingungen stabil sind. Es ist keine Nachbildung des
internen Karina-Parameters Delay oder Turbo und verkürzt nicht die CSS-Zeit.

`SPECTRUM ERROR` stoppt neue Abstimmungen, wenn das Fenster nicht ins Band passt
oder der Kern einen Fehler zurückgibt. Die Grenzen werden nicht stillschweigend beschnitten:
Du musst ein gültiges Preset laden, die Schrittweite reduzieren oder den Modus verlassen und die Mitte ändern.
Die neuen Tasten beachten die Tastensperre.

#### Eigene VFO-PRO-Erfassung: nur Empfang

Als Funktionsreferenz dient Abschnitt 4.4, Seite 22 des Karina-V1-Handbuchs
vom August 2026: aktive Erfassung und Detailansicht. Die Implementierung ist
eigenständig für V3. PTT aktiviert weder TX noch wendet sie Uplink-Offset/Subtöne an.
Sie belegt keine vollständige Gleichwertigkeit mit Karina VFO-PRO.

PTT wählt den höchsten aktuellen mittleren RSSI der abgeschlossenen Punkte; bei Gleichstand
den ersten. Im ersten Frame werden nur bereits abgeschlossene Punkte berücksichtigt;
danach auch die noch nicht aktualisierten Punkte des vorherigen Durchlaufs.
Es wählt weder nach historischen Spitzenwerten noch identifiziert es Sender. Ohne abgeschlossene Punkte
zeigt `WAIT SAMPLES` an und die Abstimmung bleibt unverändert.

| Taste | RX-Erfassung |
| --- | --- |
| Aufwärts / abwärts | Einen Scan-Schritt abstimmen, ohne die RX-Bänder zu verlassen |
| 2 | Empfangsaudio über den Upstream-Pfad aktivieren/deaktivieren |
| 3 | Atenuacion upstream |
| MENU | Hilfe- und RX-Verstärkungsansicht umschalten: R13/R43-Messwerte und ausgewähltes Feld |
| 6, in Verstärkungsansicht | LNAs, LNA, MIX oder PGA auswählen |
| 1 / 7, in Verstärkungsansicht | Index des ausgewählten RX-Felds verringern/erhöhen, ohne Überlauf |
| 4 | Erfasste Frequenz in der Sitzungs-Blacklist ein-/ausschließen |
| 9 | Optionale CTCSS/DCS-Suche aktivieren/deaktivieren, nur wenn der ursprüngliche VFO FM ist |
| * | Direkte RX-Eingabe mit acht Ziffern; 43512500 entspricht 435.12500 MHz |
| 5 | Einen neuen Scan auf die erfasste Frequenz zentrieren, sofern das ganze Fenster hineinpasst |
| PTT | Keine Aktion; sendet nicht |
| EXIT | Zur ursprünglichen Scan-Mitte zurückkehren, Messungen zurücksetzen und Presets behalten |

Nach Abstimmungen und Verstärkungsänderungen werden mindestens 20 ms abgewartet, bevor
Roh-RSSI angezeigt wird; solange erscheint `SETTLING`. `BAND LIMIT` behält die letzte
Frequenz bei einem Versuch, das Band zu verlassen, bei. `SPAN OUT OF BAND` behält Erfassung
und vorherige Mitte bei, wenn 5 nicht das gesamte Fenster unterbringen kann.
Register und Indizes sind Rohwerte, keine zertifizierte Kalibrierung.
Nur die unten beschriebenen RX-Felder von R13 werden geändert; Abweichung,
Mikrofon, AFC und TX werden nicht bearbeitet. Die optionale CTCSS/DCS-Suche ist unten beschrieben.
Es gibt keine Fundliste und keine Speicherung der Frequenz in Kanalspeichern.

Bei direkter Eingabe übernimmt MENU nur acht gültige Ziffern; * löscht eine Ziffer
(bei leerem Feld wird abgebrochen) und EXIT bricht ohne Abstimmung ab. Ziffern lösen während der Eingabe
keine Erfassungsaktionen aus. PTT
sendet ebenfalls nicht. `ENTER 8 DIGITS`, `FULL: 8 DIGITS` und `RX OUT OF BAND` melden
Zurückweisungen; die letzte akzeptierte Abstimmung bleibt erhalten.

Ein weiteres EXIT im Scan-Modus beendet den Modus über den Upstream-Ablauf. Die Feinabstimmung
ändert die Mitte erst nach Drücken von 5 und ändert niemals RX/TX des Kanals.
Bei gesperrter Tastatur behalten die Pfeiltasten die Upstream-Dämpfungsfunktion und
stimmen nicht ab. Das Audio ist bei der Erfassung anfangs stummgeschaltet; die vorherige Einstellung
bleibt beim Verlassen erhalten. Schreibvorgänge für Fox-Hunt-Einstellungen
sind in diesem Image unterdrückt: Verstärkung und neue Optionen gelten nur für die Sitzung.
Außerhalb dieses Modus behält die Firmware die Upstream-TX-Funktion bei; sie ist nicht global RX-only.

#### Manuelle RX-Verstärkung und Ausschlüsse

In der Registeransicht wählst du mit 6 die von `BK4819_InitAGC` des Upstreams dokumentierten
R13-Felder aus: LNAs (Bits 9:8, Indizes 0–3), LNA
(7:5, 0–7), MIX (4:3, 0–3) und PGA (2:0, 0–7). 1 verringert und 7 erhöht;
`GAIN LIMIT` weist Überläufe zurück, ohne zu schreiben. Jede Anpassung liest R13,
ändert ausschließlich die ausgewählte Maske und erhält alle anderen
Bits einschließlich der unbekannten Bits 15:10. R43, R7E oder AGC-Tabellen werden nicht geändert.
Fox Hunt stellt AGC bereits beim Eintritt ein; es wird keine zweite AGC-Strategie aktiviert.

Indizes sind keine kalibrierten dB-Werte und nicht mit Karina-Werten austauschbar.
`RX GAIN SESSION` meldet die Anpassung; anschließend wird die Einschwingzeit erneut abgewartet.
Beim Verlassen der Registeransicht wird MAN statt ATT angezeigt; die Zahl
nach MAN ist der letzte Preset-Index und keine tatsächliche Dämpfung.
Die manuelle Einstellung bleibt bei Rückkehr zum Scan und beim Fensterwechsel aktiv, wird aber
nicht in Presets gespeichert. Ein Wechsel des Verstärkungs-Presets mit 3 oder den Pfeiltasten
der Upstream-Dämpfung ersetzt diese Felder und kehrt zu ATT zurück.
Beim Verlassen stellt der Upstream-Ablauf RF wieder her; ein physischer Test steht noch aus.
Die Verstärkung wird weder in EEPROM gespeichert noch kalibriert.

Die Blacklist enthält 16 exakte Frequenzen in 10-Hz-Einheiten, keine Bereiche.
4 schaltet bei der Erfassung die Frequenz um: `FREQ EXCLUDED` / `FREQ INCLUDED`;
`BLACKLIST FULL` weist einen neuen Eintrag zurück, ohne einen anderen zu entfernen. BL zeigt die Anzahl
und X markiert die ausgeschlossene Erfassung. Im Scan-Modus leert 1 die Liste, setzt Messungen zurück
und zeigt `BLACKLIST CLEARED`.

Beim Scan wird jeder passende Punkt ohne Abstimmung oder RSSI-Abfrage übersprungen;
Pegel/Spitze werden auf null gesetzt. Angezeigt wird eine Markierung, kein Messwert.
Die automatische PTT-Erfassung ignoriert ausgeschlossene Punkte; `POINTS EXCLUDED`
meldet, wenn alle abgeschlossenen Punkte ausgeschlossen sind. Der Scan wird auch
nach Frame- oder Preset-Ende fortgesetzt, ohne auf ein Signal zu warten oder in einer blockierenden Schleife zu drehen.
Die Liste bleibt während der Sitzung zwischen Presets und Schrittweiten erhalten: Trifft ein anderes
Raster nicht exakt überein, wird keine benachbarte Frequenz ausgeschlossen.
Manuelle Abstimmung kann eine ausgeschlossene Frequenz weiterhin empfangen, damit sie
mit 4 wieder aufgenommen werden kann. Dies ist keine RF-Zugriffs- oder TX-Beschränkung.
Beim Verlassen/Ausschalten wird die Liste verworfen und nie dauerhaft gespeichert.

#### Optionale CTCSS/DCS-RX-Suche

In der FM-Erfassung aktiviert 9 `CSS SEARCH...`; erneutes Drücken von 9 deaktiviert die Suche.
`CSS NEEDS FM` weist eine Aktivierung bei anderen Modulationen zurück, ohne RF zu schreiben.
Die Suche verwendet erneut `BK4819_SetScanFrequency`, `BK4819_GetCxCSSScanResult`
sowie Upstream-Tabellen/DCS-Decoder. Es ist kein eigener DSP-Decoder
und keine zertifizierte Hardware-Erkennung. Die temporäre Konfiguration
des Detektors ändert weder den TX/RX-Ton des Kanals noch aktiviert sie Senden.

R51 wird vor Aktivierung gespeichert und beim Deaktivieren, bei Rückkehr zum
Scan mit EXIT/5 oder beim Verlassen des Modus wiederhergestellt. Die Suchprimitive kann den RX-Pfad zurücksetzen;
daher bleiben die Verstärkungsregister R13
und AGC R7E erhalten und werden erneut angewandt. Kalibrierung wird nicht geschrieben und das Ergebnis nicht gespeichert.
Bei einem Frequenzwechsel wird die Suche für diese Frequenz neu gestartet; bei einer
Verstärkungsänderung werden vorheriger Kandidat und Anzeige verworfen.

Ergebnisse werden während der ersten 500 ms nach Abstimmung/Aktivierung ignoriert
und höchstens alle 250 ms abgefragt. Für einen Ton sind zwei aufeinanderfolgende
gültige Ergebnisse desselben Typs und Index mit diesem Abstand erforderlich.
Ein fehlendes oder ungültiges Ergebnis unterbricht die Bestätigung. Die Anzeige
läuft nach 1500 ms ohne neue Bestätigung ab; ein Ton einer vorherigen Übertragung
bleibt nicht unbegrenzt erhalten.

CTCSS wird in Hz mit einer Dezimalstelle angezeigt; ein Messwert wird nur akzeptiert, wenn er
höchstens 0,5 Hz vom Upstream-Tabellenwert abweicht; dies ist ein Anzeigefilter,
keine gemessene Instrumententoleranz. DCS wird mit dem Upstream-Golay-Decoder
validiert, zuerst normal und anschließend mit invertierten
23 Bits; angezeigt wird Oktal mit N/I. Diese Polarität ist eine Interpretation
des beobachteten Codeworts und muss noch mit echtem Generator/Funkgerät verglichen werden.

Die Audio-/Blacklist-Zeile wird bei aktiver Suche durch den Ton oder `CSS SEARCH...`
ersetzt; Audio- und Ausschlusstasten funktionieren weiterhin.
RSSI wird nicht verwendet, um die Gültigkeit eines Subtons zu behaupten; Audio wird nicht nach Ton gefiltert
und Ergebnisse werden nicht in Speicher kopiert. Rauschen, schwache Träger oder
eingefrorene Erkennungsregister können falsche Treffer ergeben: Prüfe
das Ergebnis mit einer bekannten Quelle, bevor du damit ein anderes Funkgerät
konfigurierst. Adaptertests simulieren Chip- und Decodergebnisse und prüfen
Zeitsteuerung, normal/invertiert, Zurückweisung, Ablauf,
Überlauf und Wiederherstellung von R51/R13/R7E; sie messen keine echte RF-Erkennung.

#### Sitzungs-Multipreset

RAM1...RAM8-Presets speichern Fenster, Schrittweite und Mittelung, keine Verstärkung, Messungen
oder Kalibrierung. P0/0 bedeutet, dass keine vorhanden sind. Beim Verlassen/Ausschalten gehen sie verloren;
schreiben nicht in EEPROM. Das neue Image ermöglicht den Import/Export der
RAM-Tabelle über USB/UART in BHSP-Dateien, wie oben beschrieben.

Für andere Fenster: Mit PTT erfassen, mit * eine andere RX-Frequenz eingeben, mit MENU übernehmen,
mit 5 zum zentrierten Scan zurückkehren und mit 8 speichern. Für die benötigten Bereiche wiederholen.
Mit mindestens zwei Presets startet 0 `MULTI` ab dem ausgewählten Preset. Al completar
Nach 128 Punkten wird der Frame angezeigt; in der nächsten Iteration startet das nächste Preset.
Nach dem letzten folgt wieder das erste. Jedes Fenster setzt Pegel/Spitzen zurück:
Messwerte aus unterschiedlichen Bändern werden nicht vermischt. Es ist weder paralleler Scan,
Schwellwertsuche noch Senderliste.

4 pausiert auch den Übergang; 0 deaktiviert MULTI, ohne Presets zu löschen.
`SAVE 2 PRESETS` meldet, wenn nicht zwei vorhanden sind. Ein Wechsel von Schrittweite, Mittelung oder Verstärkung
setzt den aktuellen Frame zurück, überspringt ihn aber nicht; das Preset wird erst durch Speichern mit 8 geändert.
PTT unterbricht den Ablauf während der Erfassung; EXIT oder 5 kehren zum Scan zurück.
Beim Verlassen werden Presets und MULTI verworfen.

Build mit Bootlogo und Preset-Übertragung: 118044 Bytes, RAM 13440/16384, Flash 117156/120832; Multiboot-Stub 888 Bytes und 83 geprüfte Isolationszweige. Der Spielraum dieser Kombination ist gering: Weitere Module erfordern eine erneute Größen- und RAM-Prüfung.
Die acht C-Suites bestehen; sie umfassen teilweise/vollständige Erfassung, RX-Eingabe, Zurückweisungen, Lesen ohne Schreiben von R43, Multipreset-Zyklen, Pause, Mittelung, exakte Ausschlüsse und Grenzwerte. Geprüft werden 524288 Kombinationen: alle 65536 möglichen R13-Werte in vier Feldern und beide Richtungen, einschließlich fehlendem Überlauf und exakter Erhaltung nicht betroffener Bits.
Die drei Spektrum-Suites bestehen ohne ARDF/Satelliten.
Diese Tests simulieren RF und Anzeige; sie validieren das echte Funkgerät nicht.

#### Auswahl über die Website

Unter Quansheng wählst du **Benutzerdefinierte Firmware > Lokale Bricohams-Images**, anschließend ARDF, Satelliten oder Spektrum, und kopierst den PowerShell-Befehl. Es werden weder Kontrollkästchen des Online-Katalogs verwendet noch im Browser kompiliert oder etwas installiert. Erforderlich sind die lokalen ARM-Werkzeuge, ein Fusion61 mit dem festgelegten Commit und ein neues Zielverzeichnis. Die Pfade im Befehl müssen an den Computer angepasst werden. Danach lädst du alle Dateien aus `artifacts`, einschließlich SHA256SUMS und build-info, in den vorhandenen Prüfer. Vorbereitung und Installation eines Slots sind davon unabhängig und erfordern eine verifizierte Sicherung; Main bleibt erhalten.

### Neuer eigenständiger ARDF-Kern

Die eigenständige Implementierung basiert auf dokumentiertem Verhalten und der Analyse von Binärdateien,
ohne auf Karina-Quellcode angewiesen zu sein. Dies **belegt weder 100%ige Gleichwertigkeit** noch
macht es aus der F4HWN-Basis eine vollständige Neuentwicklung.

`firmware/bricohams/ardf.c` und `ardf.h` bilden einen eigenständig geschriebenen C99-Kern;
die ARDF- oder Karina-Implementierungen wurden nicht kopiert.
Er implementiert Zyklen mit 1–10 Sendern, einen zyklusfreien Modus (0), Synchronisierung von
Sender/Phase, eine Warnung zum Schichtende sowie einen Verstärkungsindex-Speicher je
VFO/Sender mit A/B-Maske. Er steuert weder RF-Chip, TX, Lautsprecher, Anzeige,
Tastatur, EEPROM noch Kalibrierung.

Vertrag:

- `bh_ardf_init` validiert vor einer Zustandsänderung. Eine Neukonfiguration löscht die
  Verstärkungshistorie. Eine abgewiesene Konfiguration lässt den Zustand unverändert.
- Die Eingabeuhr ist monoton und verwendet `uint32_t` Millisekunden; zulässig ist
  ein Überlauf zwischen Aufrufen, nicht aber Rücksprünge oder Intervalle von
  2^32 ms oder länger. Der Adapter muss die Tick-Basis des Funkgeräts umrechnen.
- `correction_ppm` zwischen -50000 und 50000 verändert den Uhrfortschritt;
  positive Werte beschleunigen ihn. Dies ist weder der `ClkCor`-Wert anderer Firmware noch eine
  Einstellung des RF-Oszillators. Bruchteile bleiben zwischen Aktualisierungen erhalten.
- Dauer von 1000 bis 999990 ms, Warnung von 0 bis 30000 ms und nicht länger als die
  Schicht. Dies sind Grenzen dieser Implementierung, keine binäre Gleichwertigkeit.
- `max_gain_index` muss aus einer für die
  Hardware validierten RF-Tabelle stammen; der Kern nimmt nicht an, dass ein Index 5 dB entspricht.
- Das Auslesen der Verstärkung liefert `available=false`, wenn keine Historie vorhanden ist;
  in diesem Fall bleibt der Ausgabeindex unverändert. Der Aufrufer muss das Ergebnis prüfen
  und darf daraus keine standardmäßige RF-Einstellung machen.
- Funktionen geben explizite Fehler zurück; der künftige Adapter muss
  diese melden. Nicht gleichzeitig aus Interrupts und UI aufrufen.
- `BRICOHAMS_ENABLE_ARDF=OFF` schließt die gesamte Bibliothek beim Kompilieren aus.
  Dies ist eine Build-Auswahl, kein dynamisches Laden eines Moduls.

Native Tests (C-Compiler, CMake und Generator müssen im PATH verfügbar sein):

```powershell
cmake -S .\firmware -B .\firmware-builds\core-tests -G Ninja -DBUILD_TESTING=ON
cmake --build .\firmware-builds\core-tests
ctest --test-dir .\firmware-builds\core-tests --output-on-failure
```

Der Workflow `firmware-modules.yml` führt die C-Tests aus und prüft außerdem
die Konfiguration ohne ARDF. Es sind Kerntests, keine Funkgerätevalidierung.
Der ARM-Build ermöglicht die Prüfung von Instruktionskompatibilität und
Abhängigkeiten, ersetzt aber nicht die Ausführung der Tests.

**Beta-Integration verfügbar:** `--module ardf` bindet den Kern und einen
Adapter im residenten Fox Hunt ein. Der Builder validiert alle Integrationspunkte
gegen den festgelegten Checkout, bevor Änderungen geschrieben werden. Erfordert
Fox Hunt ON, Overlay-Apps OFF und Beacon OFF; die Originalquellen bleiben unverändert.
Die Uhr kommt vom echten 10-ms-SysTick und zählt nicht Schleifeniterationen.
Es verwendet ausschließlich die vorhandene Fox-Hunt-Dämpfungstabelle; die Indizes
werden im RAM gespeichert und manuell wiederhergestellt, nicht automatisch beim Wechsel
des Senders. Es schreibt weder neue Konfiguration noch Kalibrierung.

Build:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\USER\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\ardf-beta' `
  --preset FieldOps `
  --option ENABLE_FEAT_F4HWN_BEACON=OFF `
  --option ENABLE_VOX=OFF `
  --module ardf
```

Ohne `--module` wendet der Builder keine Adapter an und bindet keine eigenen Kerne ein.
`--module karina` und andere nicht implementierte Namen werden ausdrücklich abgewiesen.
Das Manifest enthält die Hashes der angewandten Dateien und die eigenen
GPL-3.0-or-later-Lizenzen sowie LICENSE/NOTICE Apache-2.0 des Upstreams.
`sourceChangesIncluded: false` bedeutet, dass nicht bestätigte lokale Änderungen
aus dem Referenz-Repository nicht einbezogen werden; Moduländerungen hingegen
unter `modules` und `moduleSources` erscheinen.

In Fox Hunt bei entsperrter Tastatur:

| Taste | ARDF-Modul |
| --- | --- |
| 4 | Anzahl Sender: OFF, 1...10, OFF. Setzt Synchronisierung und Historie zurück |
| 5 | Dauer: 15...120 s in 15-s-Schritten; Standard 60 s. Setzt Synchronisierung zurück |
| 6 | Nummer des Senders auswählen, der synchronisiert wird |
| 7 | Beginn des ausgewählten Senders mit dem tatsächlichen Ereignis synchronisieren |
| 8 | Aktuelle Dämpfung speichern und eine manuelle Beobachtung des aktuellen Senders aufzeichnen |
| 9 | Gespeicherte Dämpfung des aktuellen Senders manuell wiederherstellen, sofern vorhanden |
| EXIT | Fox Hunt beenden; Upstream-Verhalten bleibt erhalten |

Die Kontextzeile zeigt vor der Synchronisierung Nummer/Dauer/Auswahl
und danach Sender/Countdown. `!` kennzeichnet die letzten 5 Sekunden: Es wird kein
neuer Signalton hinzugefügt. `ARDF ERROR` meldet einen Kernfehler; ein Wechsel von
Nummer/Dauer initialisiert ihn neu. F kehrt die neuen Aktionen 4–9 nicht um.
Die vorhandene Tastensperre verhindert weiterhin diese Tastenaktionen. Bei jedem Eintritt
beginnt der Modus mit OFF; es gibt keine persistente Wiederherstellung und in diesem ersten Adapter
keinen Speicher für zwei VFOs (der Kern unterstützt zwei Bänke).

Struktureller Build vom 25.10.2026:
Imagegröße 112672 Bytes, RAM 12448/16384, gelinkter Flash 111784/120832,
Multiboot-Stub 888 bytes mit 83 geprüften Verzweigungen. Dies sind Messwerte dieser
Kombination, keine garantierte Reserve für eine beliebige Modulkombination.
Die Adaptertests verwenden simulierte Funkgeräteaufrufe und prüfen
Tasten, Synchronisierung, Anzeige, Fehler und manuelles Speichern/Wiederherstellen.
**Nicht installiert und nicht auf Hardware validiert.** Außerhalb von Fox Hunt behält die Firmware
die TX-Möglichkeiten des Upstreams; Beacon/VOX OFF
bedeutet keine vollständige TX-Sperre. Nicht als zertifizierte ARDF-Firmware verwenden.

**Ausstehend:** physische Prüfung von Anzeige, Zeitsteuerung und Dämpfung, Optionen
für Persistenz/VFO, Wettbewerbseinstellungen und Empfang. Der eigene Analysator,
RX-Erfassung und Multipreset sind im separaten Image `spectrum` integriert,
nicht in ARDF. Die beschriebenen Funktionen belegen keine vollständige Gleichwertigkeit mit Karina.

### ARDF-Statistiken je Bake implementiert

Das Image `ARDF-Stats-final-20261025` enthält Bootlogo und manuelle Beobachtungen
pro Bake: 113960 Bytes RAW, RAM 12576/16384 und Flash
113072/120832. Es handelt sich weder um automatische Erkennung noch um Positionsschätzung.

In synchronisiertem ARDF speichert jeder verarbeitete Tastendruck auf 8 die Dämpfung
wie bisher und zeichnet eine Beobachtung des Senders der aktuellen Schicht auf.
Der Zyklus wird vor der Zuordnung aktualisiert, damit bei Überschreiten der Grenze
keine vorherige Schicht verwendet wird. Für jede der zehn Baken gibt es einen Zähler,
den ersten/letzten relativen Sitzungszeitpunkt und den letzten Dämpfungsindex.
RSSI, Richtung, Frequenz oder GPS-Koordinaten werden weder gemessen noch gespeichert.
Index 0–5 gehört zur Upstream-Tabelle mit sechs Stufen und gibt keine dB an.

Zähler sättigen bei 65535 ohne Überlauf; ein Flag meldet, wenn versucht wurde,
weitere Beobachtungen zu erfassen. Dann sind die Summen Mindestwerte, keine
exakten Zählungen. Erste/letzte Zeit und Index werden weiterhin aktualisiert.
Die Zeit läuft ab Eintritt/Neukonfiguration von ARDF, nicht
ab der Synchronisierung der Bake. Verwendet wird eine uint32-Uhr in Millisekunden:
Die Sitzung muss kürzer als 2^32 ms (etwa 49,7 Tage) sein. Dies ist weder UTC noch GPS,
und `receivedAt` im JSON ist der Empfangszeitpunkt des Computers.

Erneuter Eintritt in ARDF oder ein Wechsel von Senderanzahl/-dauer startet eine
neue Sitzung und löscht vorherige Beobachtungen. Eine erneute Synchronisierung mit 7
löscht Daten nicht, solange sich Anzahl/Dauer nicht ändern. Beim Beenden wird die Zeit angehalten
und die letzte RAM-Tabelle bleibt erhalten, bis eine neue Sitzung beginnt,
neu konfiguriert wird oder das Funkgerät neu startet/ausgeschaltet wird. Für
diese Statistiken wird nicht in EEPROM/Flash geschrieben; das Speichern von Fox-Hunt-Einstellungen
des Upstreams außerhalb dieser Tabelle verhält sich weiterhin wie bisher.

Unter **Quansheng > Betrieb > Bricohams-Beta-ARDF-Statistiken**
**ARDF-Statistiken abfragen und herunterladen** erstellt einen Snapshot und
fordert einen JSON-Download an. Es gibt weder kontinuierliche Abfrage noch Upload zu Diensten.
Eine beendete Sitzung oder der Status OFF kann abgefragt werden, nicht jedoch
ein Funkgerät, auf dem ARDF seit dem Start noch nie begonnen hat. Die Oberfläche zeigt
Modulfehler, Sättigung und fehlende Position an. Der Download muss
im Browser bestätigt werden, bevor die Sitzung verworfen wird.

Das JSON enthält `connectionSession` des Connectors und den Zähler `session`
der Firmware, der nur für diesen Start gilt. Es sind keine globalen IDs:
Bei Neuverbindungen oder Neustarts müssen die Originaldateien aufbewahrt werden; Sitzungen dürfen nicht
allein anhand der Nummer zusammengeführt werden. `observations` enthält einen Datensatz
pro beobachteter Bake, nicht ein Ereignis pro Tastendruck und keinen GPS-Pfad.
Exportiert wird die zusammengefasste Tabelle; Zwischenbeobachtungen werden nicht rekonstruiert.

Experimentelles privates little-endian-Protokoll: Befehl `0x7B20`, Antwort
`0x7B21`. Anfrage mit genau 4 Bytes: Version 1, Operation 0 (Abfrage),
16-Bit-Sequenz. Antwort mit 140 Bytes plus 4-Byte-Upstream-Header:
passt in dessen Antwortlimit von 144 Bytes.

| Antwortoffset | Bytes | Inhalt |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Status: 0 erfolgreich, 2 ungültige Anfrage, 3 keine Sitzung gestartet |
| 2 | 1 | Flags: aktiv=1, synchronisiert=2, Modulfehler=4, Zähler gesättigt=8 |
| 3 | 1 | Senderanzahl, 0–10 |
| 4 | 2 | Gespiegelte Sequenz; null bei ungültiger Anfragelänge |
| 6 | 2 | Reservados cero |
| 8 | 4 | Nicht-null Sitzungszähler, beim Start zurückgesetzt |
| 12 | 4 | Schichtdauer in ms |
| 16 | 4 | Verstrichene Sitzungszeit in ms |
| 20 | 120 | Zehn Datensätze zu je 12 Bytes, Baken 1–10 |

Jeder Datensatz enthält einen uint16-Zähler, uint8-Verstärkungsindex,
uint8-Gültigkeitswert (0/1), ersten uint32-Zeitpunkt und letzten uint32-Zeitpunkt.
Datensätze ohne Beobachtungen sind null. Der Connector validiert Länge,
Version, Sequenz, reservierte Felder, Bakennummer, Index,
Zeitreihenfolge und Konsistenz, bevor Daten bereitgestellt oder exportiert werden.
Ungültige Anfragen löschen oder ändern die Tabelle nicht. Die Transportverschleierung
ist keine Verschlüsselung/Authentifizierung.

C-Tests mit simuliertem Funkgerät: Schichtgrenzen, erste/letzte Zeit,
gesättigter Zähler, Neustarts, Lesen nach dem Beenden, ungültige Längen
und Uhrüberlauf. JavaScript-Tests prüfen Snapshot und Zurückweisung von
Sequenz, Bake, Index, Zeit, reservierten Feldern und fehlender Sitzung.
Physische USB-Integration und Anzeige stehen noch aus. Es wird
keine Telefonposition einer vergangenen Beobachtung zugeordnet: Eine künftige
GPS-Aufzeichnung muss eigene Zeit-/Genauigkeitsangaben und Einwilligung erfassen.

### Neuer eigenständiger Spektrum-Erfassungskern

`firmware/bricohams/spectrum.c` und `spectrum.h` implementieren eine eigenständige
C99-Zustandsmaschine ohne kopierte Karina-Algorithmen. Sie konfiguriert
1 bis 128 Punkte, Startfrequenz und Schritt in 10-Hz-Einheiten, Einschwingzeit
von 1–1000 ms und Mittelung von 1–16 RSSI-Messungen pro Punkt. Jeder Punkt speichert
den Mittelpegel und den gehaltenen Maximalwert; das Zurücksetzen der Spitzen übernimmt die aktuellen Pegel.
`BRICOHAMS_ENABLE_SPECTRUM=OFF` schließt diese Bibliothek aus.

Der Adapter muss `bh_spectrum_frequency` abfragen, das tatsächliche Band validieren,
den Empfänger abstimmen und nur bei Erfolg `bh_spectrum_tuned` aufrufen.
Messungen vor Ablauf der Einschwingzeit geben `NOT_SETTLED` zurück und werden nicht
einbezogen. Nach Abschluss eines Punkts ist erneut Abstimmung erforderlich, auch bei
nur einem Punkt. Nach Abschluss eines Scans wird `frames` erhöht.
Die Werte sind Roh-RSSI, **keine kalibrierten dBm**; der Adapter muss sicherstellen,
dass ein höherer Wert ein stärkeres Signal bedeutet.

Die Uhr folgt demselben monotonen 32-Bit-Vertrag wie ARDF; Funktionen
dürfen nicht gleichzeitig aufgerufen werden. Der Adapter legt die Taktung fest und erfasst
unterschiedliche RF-Messungen: wiederholte Aufrufe mit demselben Messwert erzeugen
keine unabhängigen Messungen. Der Kern steuert weder AGC/LNA/PGA noch sendet er TX,
berechnet eine FFT oder speichert Presets/Kalibrierung.

Die Tests prüfen Grenzen, Punktwechsel, exakte Frequenzberechnung,
Mittelung, Maximalwerte, Einschwingzeit, Überlauf sowie 128 Punkte mit 16 Messungen
maximalem RSSI und atomare Zurückweisung ungültiger/überlaufender Konfigurationen.
Es ist nicht der Karina-Analysator. Der Adapter des Images `spectrum` verbindet
diesen Kern gemäß dem oben beschriebenen Beta-Umfang mit Empfänger und Anzeige;
die physische Validierung steht noch aus.

Voraussetzungen im PATH: Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain und
Python 3 für den Formatprüfer des Upstreams. Es sind keine externen
Python-Pakete und keine neuen npm-Abhängigkeiten erforderlich.

Unter Windows verwendete und geprüfte Konfiguration:

- ARM GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, von CMake erkannt.

Führe in PowerShell im Stammverzeichnis dieses Repositorys aus:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

Das Zielverzeichnis **muss neu sein**: Ein früherer Build wird weder gelöscht noch überschrieben.
Schlägt ein Build fehl, wird der Fehler angezeigt und kein als erfolgreich
markiertes Artefaktpaket ausgegeben; verwende beim Wiederholen ein neues Zielverzeichnis. Quellen
und Diagnoseergebnisse bleiben im fehlgeschlagenen Zielverzeichnis.

Für Labs ersetzt du `--preset Fusion` durch `--preset Labs` und verwendest ein anderes Zielverzeichnis.
Auch `FieldOps` und `Transfer` werden akzeptiert, wurden in dieser Validierung jedoch nicht
kompiliert.

Jede `--option` akzeptiert genau `ENABLE_XXX=ON` oder `ENABLE_XXX=OFF`.
Argumente `--option` dürfen für unterschiedliche Funktionen wiederholt werden, nicht jedoch
mit demselben Namen. Verfügbar sind die booleschen Optionen der Presets
des **festgelegten lokalen Commits**, nicht die des Online-Formulars v6.3.0.
Unbekannte Schlüssel, beliebige Werte, `DEV`, andere Hardware oder
erfundene Versionen werden nicht akzeptiert.

So listest du sie ohne Kompilierung auf:

```powershell
$p = Get-Content 'C:\Users\USER\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

Der Builder löst die Preset-Vererbung auf und verlangt, dass diese Optionen aktiviert bleiben:

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

Diese Bedingungen erhalten das Slot-Verwaltungsprofil, garantieren jedoch nicht, dass
jede verbleibende Kombination nützlich oder sicher ist. Der Linker muss RAM
und Flash akzeptieren, und die Upstream-Prüfungen müssen bestehen. Das Budget wird nicht reduziert
Budget wird nicht reduziert und Prüfungen werden nicht ausgelassen, um ein Image passend zu machen.

## Quellen, Kompilierung und Reproduzierbarkeit

Das Skript klont das **lokale** Repository in ein separates Verzeichnis und checkt den
festgelegten Commit aus. Es verändert weder den Ordner Fusion61 noch wendet es dessen uncommittete Änderungen an,
lädt kein Karina herunter und ändert nicht die Version, um die Prüfung zu umgehen.

`SOURCE_DATE_EPOCH` wird auf den Commit-Zeitpunkt, `TZ=UTC` und `LC_ALL=C` gesetzt.
Mit der angegebenen Toolchain erzeugten zwei Fusion-Builds in unterschiedlichen Verzeichnissen
denselben SHA-256 für `.bin`. Dies bestätigt die lokale Reproduzierbarkeit
der Firmware, nicht die Byte-Identität von ELF, Maps oder Berichten mit
absoluten Pfaden und auch nicht die Reproduzierbarkeit mit einer anderen Toolchain.

Der Builder:

1. Validiert Argumente, Commit und Optionen, bevor das Zielverzeichnis erstellt wird.
2. Klont die Quellen und konfiguriert CMake für Release.
3. Kompiliert mit dem ausgewählten Preset, der Bricohams-Edition und den aufgelösten Optionen.
4. Behält Format- und Isolationsprüfungen des RAM-Wiederherstellers bei.
5. Prüft Länge, PY32-Vektoren, Version und Editionskennung in der Binärdatei.
6. Gibt Artefakte, wirksame Optionen, Werkzeuge und Hashes aus.

Das Verzeichnis `source` bewahrt den verwendeten Checkout auf. Der Ordner `artifacts`
enthält Firmware, ELF, Map, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`
und `SHA256SUMS`. Alle Dateien außer dem Manifest selbst sind in SHA256SUMS enthalten.
Der Hash erkennt Änderungen gegenüber dem Manifest, **ist aber keine digitale Signatur**.

## Am 25.10.2026 erzeugte Binärdateien

Beide verwenden `ENABLE_VOX=OFF`; die übrigen Optionen entsprechen ihrem Upstream-Preset.

| Profil | Binario | RAW-Bytes | RAM laut Linker | Flash laut Linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

Die RAW-Größe enthält den RAM-Wiederherstellungsbereich und entspricht nicht der
FLASH-Zeile des Berichts. Beide RAW-Dateien liegen unter dem Maximum von 120832 Bytes.
Die Isolationsprüfung meldet 888 Bytes und 83 geprüfte Sprünge.

SHA-256:

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs behält `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` und
`ENABLE_FEAT_F4HWN_OVERLAY_APPS`; Fusion nicht. Die Möglichkeit einer physischen Sicherung
erfordert ein kompatibles Funkgeräteprotokoll und wurde nicht an Hardware getestet.
Es wurden keine neuen `.app` erzeugt: Vorhandene benötigen eine kompatible ABI/API.

## Verwendung im Web und in Slots

Kopiere die bereitgestellten Artefakte nach:

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

Unter **Quansheng > Benutzerdefinierte Firmware > Heruntergeladenen Build prüfen**
wählst du gemeinsam **alle** Dateien eines Artefaktordners aus. Der
Prüfer verlangt jeden Eintrag aus SHA256SUMS, einschließlich Map, ELF und Lizenzen.
Nach der Prüfung bereitet **Diese Firmware verwenden** sie im Slot-Panel vor.

Alternativ wählst du in der lokalen Bibliothek `Documents\Multiboot` aus:
Die beiden `.bin` erscheinen als zusätzliche vorbereitbare Images. Die Bibliothek
prüft die Struktur und zeigt den Hash an, validiert aber nicht automatisch das
zugehörige Manifest; verwende dafür das Build-Formular.

Die Installation behält vollständige Sicherung, Bestätigung und Slot-CRC bei. Verwende
**Slots 1–4, nicht Main**. Es wurden keine Funkgerätedaten geschrieben oder gelöscht.
Fusion und Labs sind hier lokale experimentelle Builds, keine offiziellen
signierten oder im Labor zertifizierten Versionen. Der stabile Upstream-Zweig ändert
nichts am experimentellen Status dieser Ableitung.

## Ausstehende Hardwarevalidierung

Softwarevalidierung abgeschlossen: 149 Tests, Syntaxprüfung und Pages-Build
erfolgreich. Im Browser wurden die 7 Manifestdateien jeder Edition geprüft,
beide Firmware-Images vorbereitet und die Installation ohne Verbindung/Sicherung
gesperrt gelassen. Bei Auswahl von Multiboot wurden nach der Übergabe
73 Images untersucht: 11 strukturell zugelassen, 62 gesperrt. Es gab keine
JavaScript-Fehler bei dieser Prüfung.

Vor einem operativen Einsatz stehen noch Identifizierung des Geräts,
Originalsicherung, Start- und Wiederherstellungstest, Kalibrierung,
Menüs, RX sowie CFG-/Slot-Wechsel aus. Der frühere USB-Fehler gilt nicht als behoben.
Diese Binärdateien werden weder veröffentlicht noch automatisch geflasht.

## Boot-Branding implementiert

Der Builder wendet den Bricohams-Willkommensbildschirm auf alle neuen Editionen an,
mit oder ohne Adapter. Upstream-Lizenzhinweise bleiben erhalten und das
Referenz-Repository wird nicht verändert. Integrationspunkte werden einmalig validiert:
Eine andere Quelle oder ein doppelter Patch stoppt den Build.
Das Manifest führt Hashes in `brandingSources`, getrennt von
`moduleSources`; `sourceChangesIncluded: false` bezieht sich weiterhin auf Änderungen
im lokalen Upstream-Repository, nicht auf das Fehlen dieser eigenen Patches.

Mit `ENABLE_FEAT_F4HWN_LOGO=ON` zeigen der LOGO-Einschaltmodus und Aufrufe von
`UI_DisplayLogo` eine monochrome 128x48-Adaption des ursprünglichen
Bricohams-Logos sowie `Bricohams BETA` in der letzten Zeile. Sie belegt 768 Bytes
Bitmap im internen Flash. Das benutzerdefinierte Logo im externen Flash wird weder gelesen noch überschrieben;
es bleibt erhalten, wird in diesem Modus dieser
abgeleiteten Images aber nicht angezeigt. Wird LOGO beim Kompilieren deaktiviert, wird das Bitmap durch
Entfernen ungenutzten Codes ausgeschlossen; diese Option wird nicht erzwungen.

NONE/SOUND-Modi zeigen weiterhin keinen Willkommensbildschirm; die gespeicherte
Einschaltpräferenz wird nicht geändert. In Textmodi bleiben
persönliche Nachrichten und Spannung erhalten; nur leere Standardnachrichten
werden durch Bricohams/RADIO BETA ersetzt, und die Fußzeile kennzeichnet die Beta-Edition.
Es wird nicht behauptet, dass das Logo in allen Einschaltmodi erscheint.

`scripts/generate-bootlogo.ps1` erzeugt `firmware/bricohams/bootlogo.h`
aus dem Original-PNG mit System.Drawing unter Windows. Der Builder verwendet
den bereits erzeugten Header; PowerShell oder diese Bibliothek sind beim Kompilieren nicht erforderlich.
Das Seitenverhältnis auf weißem Hintergrund bleibt erhalten; ein Luminanzschwellwert von 190
wandelt dunkle und orangefarbene Linien in aktive Pixel des monochromen LCD um.
Der SHA-256 des PNG steht im Header. Dies ist eine hardwarebezogene Adaption,
kein Ersatz für die farbige Ressource im Web/Android.

Beta-Images mit Bootlogo, kompiliert am 25.10.2026:

| Modul | Verzeichnis unter Documents/Multiboot/Bricohams | RAW-Bytes | RAM | Flash |
| --- | --- | ---: | ---: | ---: |
| ARDF | `ARDF-Bootlogo-final-20261025/artifacts` | 113452 | 12448/16384 | 112564/120832 |
| Satelliten | `Satellite-Bootlogo-final-20261025/artifacts` | 113096 | 12352/16384 | 112208/120832 |
| Spektrum/VFO-PRO/CSS | `Spectrum-Bootlogo-final-20261025/artifacts` | 116808 | 13248/16384 | 115920/120832 |

Frühere Messwerte aus anderen Ordnern gehören zu Builds
ohne dieses Bitmap. Das Logo muss noch physisch auf dem LCD
geprüft werden; Kompilierung und Darstellung am Computer validieren weder
Kontrast, Ausrichtung oder Lesbarkeit auf dem Funkgerät. Es wurde nicht geflasht.

## Angeforderte spätere Phase: Bricohams Android

Die native APK `0.8.2-beta` enthält ein Logbuch mit ADIF-Suche und -Import, ADIF/JSON,
JSON-Wiederherstellung, ARDF-Sitzungen mit Historie/Statistiken und gefilterter Segment-Summe,
punktuellem GPS, experimentellem Morse aus Text/WAV
sowie temporärem CAT RX über USB CDC ACM und erkannten CH34x/CP210x/FTDI/Prolific-Adaptern.
Die [Android-Anleitung](ANDROID.md) unterscheidet verfügbare Funktionen von
folgenden Zielen. Enthalten sind SSTV Robot36 aus WAV mit PNG-Export
sowie Offline-SGP4 mit importierten TLE-Katalogen, Pässen und RX-Dopplerverfolgung.
Enthalten ist eine Mikrofonaufnahme von bis zu 60 s im Vordergrund zur anschließenden
Morse-/Robot36-Decodierung. Nicht enthalten sind kontinuierliche Decodierung,
Kanalschreiben oder LoTW-Upload. Die vollständige Gleichwertigkeit mit Karina und
die physische Validierung von Firmware und Telefon stehen noch aus.

### Zielfunktionen

- Quansheng-Steuerung über Android: Status auslesen, Frequenz einstellen,
  Subtöne und Leistung pro Kanal anpassen und auf weitere Optionen zugreifen, die
  Hardware/Firmware tatsächlich bereitstellt. Temporäre VFO-Einstellungen
  von dauerhaften Schreibvorgängen unterscheiden; nicht das gesamte Codeplug neu schreiben, um
  ein Feld zu ändern, wenn das Protokoll eine gezieltere Operation ermöglicht.
- Satellitenverfolgung nach dem Funktionsmodell von Look4sat: Satellitenauswahl,
  TLE, Passvorhersage, Beobachterposition und Dopplerkorrektur
  der Frequenz über CAT während des ausgewählten Passes.
- SSTV-Empfang/-Decodierung einschließlich Robot36; SSTV-Senden als
  Ziel, das mit verfügbarer Audio- und PTT-Verbindung validiert werden muss.
- Morse-Interpretation aus Audio mit Angabe der Unsicherheit.
- Logbuch nach dem Funktionsmodell von HAMRS: Kontakte, Suche,
  Bearbeitung, ADIF-Export sowie Ziel Signatur/Upload zu LoTW.
- Fuchsjagd: Sitzungen, Baken, Zeiten, Beobachtungen, GPS-Route,
  Positionen und Suchstatistiken mit Export sowie Offline-Nutzung
  für Funktionen, die keine Dienste benötigen.
- Bricohams-Kennzeichnung in App, Firmware, Bootlogos, Dokumentation und
  Artefakten. Abschließende Umstellung von Web und App auf das Unternehmensorange nach
  Fertigstellung und Prüfung der Funktionen gemäß Anfrage.

### Vorläufige Annahmen und Grenzen

Da keine Antworten auf Rückfragen vorliegen, ist USB OTG mit Programmierkabel
als anfänglich vorgesehener Transport angenommen. Bluetooth erfordert einen
geprüften Adapter und ein geprüftes Protokoll; Bluetooth am Funkgerät wird nicht vorausgesetzt.
Ein serielles Programmierkabel bietet keinen Audiotransport: SSTV und
Morse benötigen einen separat geprüften Audioeingang/-ausgang.
Es wird nicht angenommen, dass Android USB und diesen Audiopfad auf
jedem Telefon ohne vorherige Prüfung gleichzeitig betreiben kann.

CAT gilt nicht allein deshalb als verfügbar, weil Kanal-Lesen/Schreiben
möglich ist. Zuerst müssen die tatsächlichen Firmware-Fähigkeiten geprüft werden
und falls erforderlich ein eigenes versioniertes Protokoll mit Fähigkeitsabfrage,
Modellvalidierung, Bestätigung, Fehlern und Wiederherstellung bei
Verbindungsabbruch entworfen werden. TX, Bandgrenzen und Sicherungsschutz bleiben
bestehen. Die Verfolgung darf TX nicht automatisch aktivieren und nach
Verbindungsverlust oder Passende keine Änderungen weiter anfordern.

Der direkte Upload zu LoTW bleibt ein Ziel und ist keine abgeschlossene Integration.
Der akzeptierte Signaturmechanismus und die sichere Verwaltung des
sichere Verwaltung des Rufzeichen-Zertifikats unter Android. Die anfängliche Alternative
ist ADIF zum Signieren mit TQSL am Computer; ADIF-Export ist nicht gleichbedeutend mit
einem LoTW-Upload. Zertifikate, Schlüssel und Passwörter dürfen nicht in
Repository, Diagnoseprotokolle oder exportierte Projekte aufgenommen werden.

Der angefragte Begriff „encriptions“ muss noch geklärt werden: Er wird nicht
automatisch als Verschlüsselung des Amateurfunkverkehrs verstanden.
Es wird weder Verschlüsselungsunterstützung noch deren Rechtmäßigkeit behauptet.

GPS liefert die Position des Telefons, nicht die der Bake. Eine geschätzte
Senderposition erfordert genügend Beobachtungen/Laufzeiten und muss
ihre Unsicherheit anzeigen; allein aus RSSI lässt sich keine exakte Position ableiten.
Routen und Positionen sind standardmäßig privat, erfordern ausdrückliche Berechtigungen
und werden nicht automatisch veröffentlicht.

Die genannten Anwendungen sind funktionale Referenzen, keine verfügbaren Quellen
und keine Erlaubnis zum Kopieren von Code, Ressourcen oder Marken. Bevorzuge Quellen mit
kompatibler Lizenz und erhalte Urhebervermerke; andernfalls unabhängig implementieren
auf Grundlage von Dokumentation und zulässigem beobachtbarem Verhalten,
ohne Schutzmaßnahmen zu umgehen. Behaupte keine Gleichwertigkeit ohne Tests.

### Kriterien vor Abschluss der Phase

1. Funktionsmatrix jedes Images abschließen und Start,
   Wiederherstellung, RX, Registerwiederherstellung und unterstützte Funktionen
   auf identifizierter Hardware mit vollständiger Sicherung validieren.
2. Android-Architektur und Telefon/Kabel/Funkgerät/Firmware-Matrix genehmigen;
   CAT-Steuerung, Verbindungsabbrüche und erneutes Auslesen nach Kanaländerungen prüfen.
3. Pässe/Doppler mit bekannten Referenzen vergleichen, SSTV/Morse
   mit bekannten Beispielen und anschließend realem Audio testen sowie ADIF-Datensätze
   und LoTW-Signatur/-Upload getrennt validieren.
4. GPS, verweigerte Berechtigungen, fehlendes Netzwerk, Sitzungen und Feldstatistiken
   testen, ohne Bake-Positionen zu erfinden.
5. Bricohams-Branding und Bootlogos unter Berücksichtigung der Anzeigegrenzen
   anwenden und prüfen; Lizenzen und Pflichtangaben erhalten. Zum Schluss
   die orange Farbpalette mit barrierefreiem Kontrast anwenden, ohne Zustände von
   Gefahr, Erfolg und Warnung zu verwechseln. APK und Artefakte erst mit eindeutig
   angegebener Version/Hash ausliefern, wenn ihr Validierungsstatus ausdrücklich ausgewiesen ist.
