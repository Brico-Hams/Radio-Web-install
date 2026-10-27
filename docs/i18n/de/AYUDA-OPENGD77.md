# OpenGD77-Hilfe: Konfiguration und sichere Verwendung

**Prüfdatum: 2026-10-25.** Der spanische Originaltext beruht auf den am Ende genannten offiziellen Quellen und dem Code dieser Anwendung. Es handelt sich weder um eine Übersetzung des Handbuchs noch um eine Funktionsgarantie für alle Builds.

Wenn du ein Funkgerät, eine Platinenrevision oder ein bestimmtes Image auswählen möchtest, lies [Modelle und Kompatibilität](AYUDA-OPENGD77-MODELOS.md). Hier wird erklärt, wie du die Konfiguration organisierst, dokumentierte Funktionen verwendest und die Grenzen des Webeditors erkennst.

## Kanäle lokal löschen (Beta)

In einem Standard-Codeplug mit 128 KiB gibt **Aus Datei löschen** den ausgewählten Speicher frei und entfernt seine Verweise aus den 68 Standardzonen (80 Kanäle pro Zone) und den 64 Scanlisten (32 Kanäle pro Liste). Auch Verweise als Priorität 1, Priorität 2 und festgelegter TX-Kanal werden bereinigt und auf null gesetzt. Namen, Markierungen, andere Kanäle und deren Nummern bleiben erhalten; es wird nicht neu nummeriert. Kontakte und die SAT-Liste werden nicht geändert. Die Zuordnung wurde mit dem [Binärparser der öffentlichen CPS](https://grid.radio/opengd77/js/g77.js) abgeglichen.

Dieses Verfahren unterstützt keine Scanner-Formate mit erweiterten Zonen. Es arbeitet mit einer Speicherkopie: Exportiere die bearbeitete Binärdatei unter einem anderen Namen und bewahre das Original auf. Im normalen Modus wird eine Bestätigung angefordert; PRO überspringt sie für diese Sitzung. Es wird nichts ins Funkgerät geschrieben: Das Schreiben auf ein OpenGD77-Gerät bleibt gesperrt, bis das erforderliche vollständige MCU-Backup verfügbar ist. Ein angeschlossenes Quansheng-Funkgerät ermöglicht keine Validierung der OpenGD77-Hardware.

## REMER-Repeater importieren (nur lokale Datei)

Die REMER-Registerkarte des Planers enthält die VHF/FM-Frequenzen, die aus der vom Benutzer bereitgestellten Referenz übernommen wurden. Wähle die benötigten Speicherplätze aus und füge sie dem geöffneten Codeplug hinzu; die Anwendung liest ihn mit dem OpenGD77-Parser erneut ein, um zu prüfen, ob Name, Frequenzen und Modus in der Liste erscheinen. Die Speicherplätze werden nur für den Empfang vorbereitet. Veröffentlichte CTCSS-Werte dienen als Referenzhinweis: Töne werden weder programmiert noch über Funk verifiziert.

Die Liste belegt nicht, dass eine Frequenz, ein Ton, ein Standort oder ein Repeater noch aktuell ist. Prüfe die Angaben vor jeder Verwendung bei REMER und den zuständigen Behörden. HF/SSB-Frequenzen derselben Referenz werden als Kontext angezeigt und nicht als VHF-Kanäle importiert. Wenn der Parser einen Kanal akzeptiert, belegt das nur, dass die Standardstruktur der Binärdatei lesbar ist; es beweist nicht, dass die Firmware ihn nach dem Schreiben anzeigt, HF empfangen wird oder das Funkgerät programmiert wurde. Das Schreiben auf das Gerät bleibt gesperrt.

## CSV-Kanäle aus CPS oder CHIRP importieren

Importiere unter **Vorbereitete Kanäle** `Channels.csv`, exportiert aus OpenGD77 CPS, oder eine CSV-Datei mit den Standard-CHIRP-Spaltenüberschriften (`Name`, `Frequency`, `Duplex`, `Offset`, `Mode`). Der Parser akzeptiert nur analoge FM-Kanäle innerhalb von VHF 136-174 MHz und UHF 400-470 MHz. Für CHIRP verarbeitet er `+`, `-`, `split` und `off` und weist Frequenzen, Offsets oder Modi zurück, die er nicht validieren kann. Die Datensätze werden in reine RX-Kanäle umgewandelt; Töne aus der Quelle werden vermerkt, aber nicht programmiert. Prüfe die Tabelle der vorbereiteten Kanäle, wähle eine FM-Vorlage und speichere die lokale Binärdatei, um sie vor der Verwendung der CPS zu prüfen.

Digitale/DMR-Zeilen aus `Channels.csv` werden ausdrücklich ausgeschlossen: Kontakte, TG-Gruppen, RX-Listen und Zonenverweise aus `Contacts.csv`, `TG_Lists.csv` und `Zones.csv` werden bei diesem Import nicht übernommen. Diese Dateien sind verknüpfte Tabellen, kein eigenständiger binärer Codeplug. Proprietäre Retevis/RT950-CSV-Dateien und `.4rdmf`-Dateien werden weder anhand ihrer Endung noch anhand von Frequenzspalten interpretiert: Für die Zuordnung der Felder sind verifizierte Spezifikationen erforderlich. Eine ausgeschlossene Zeile wird mit Zeilennummer und Grund angezeigt; sie wird weder stillschweigend verworfen noch mit der Binärdatei vermischt.

## Webprüfung ohne Installation (25-10-2026)

Die Oberfläche enthält eine Matrix **OpenGD77 CPS: tatsächliche Verfügbarkeit im Web**. Sie wird als statische HTTPS-Website bereitgestellt, ohne Node oder das lokale Paket zu installieren. Für den physischen Zugriff sind WebUSB/Web Serial und Browserberechtigungen erforderlich; möglicherweise wird ein Systemtreiber benötigt. Mobilkompatibilität wird nicht garantiert.

| Funktion | Web ohne installierten Server |
| --- | --- |
| Standard-Codeplug öffnen/speichern, Kanäle bearbeiten/löschen und Verweise bereinigen | Verfügbar |
| RadioID user.csv importieren | Verfügbar; die direkte API-Abfrage unterstützt kein CORS |
| BrandMeister-Gruppen | Direkte Abfrage nach Präfix und Import als Gruppen |
| RepeaterBook | Autorisiert bezogenes JSON importieren; authentifizierte Abfrage nur mit Server |
| SAT-Liste, veröffentlichte TLE, SGP4-Pässe und Doppler-Speicher | Im Browser verfügbar |
| Kalibrierung/Codeplug beim Verbinden sichern | Automatisch, dauerhaft gespeichert und mit Hashes; Teilkopie |
| MCU-Firmware des Geräts kopieren | Nicht vollständig, modellverifiziert implementiert |
| Funkvorgänge nach einem Teil-Backup | Gesperrt, einschließlich erneutem Lesen/Aufnehmen |
| Flashen, Wiederherstellung, Sprachdateien, umfangreiche ID-Datenbank und vollständiger Zonen-/Einstellungseditor | Hier nicht implementiert |

Eine vollständige Funktionsgleichheit mit grid.radio oder der Desktop-CPS wird nicht zugesagt. Die Provider-Header wurden geprüft: BrandMeister lässt den Web-Origin zu; RadioID liefert für die getestete Abfrage kein Access-Control-Allow-Origin. Diese Grenzen werden weder durch öffentliche Proxys noch durch erfundene Daten verschleiert.

### Erforderliches vorheriges Backup

Verbinden identifiziert das Gerät und führt automatisch BackupManager aus, bevor andere Funkvorgänge freigeschaltet werden. Die Identifizierung und die zum Erstellen der Sicherung erforderlichen Lesevorgänge sind die einzige Ausnahme. Kalibrierung und Codeplug werden in IndexedDB gespeichert und vor dem Export des Manifests erneut mit SHA-256 gelesen. Fehlt die MCU-Firmware, meldet das Ergebnis **TEIL-BACKUP**; es wird keine Berechtigung erteilt, und neue Lesevorgänge, Aufnahme, Schreiben und Wiederherstellung werden gesperrt, auch in PRO. Mit der Kopie lässt sich der Codeplug öffnen und offline bearbeiten, ohne das Funkgerät anzutasten.

Dieser Schutz schafft keinen nicht vorhandenen Firmware-Leser. Es lässt sich nicht behaupten, dass die vollständige Originalfirmware bereits automatisch gesichert wird. Es werden keine willkürlichen MCU-Modi/-Adressen ausprobiert, um diese Funktion vorzutäuschen. Wenn «Original» die bereits ersetzte kommerzielle Werksfirmware meint, hilft nur eine vor der Installation erstellte Kopie; das Auslesen von OpenGD77 stellt diese Bytes nicht wieder her.

## 1. Vor dem Verbinden oder Senden

1. Ermittle Hersteller, vollständiges Modell, Hardware-Revision und installierte Firmware. «UV380», «10W» und «10W PLUS» sind nicht gleichwertig.
2. Notiere CPS-Version, Firmwaredatum/Build, Sprache und Hardwareänderungen. Bewahre auch den Namen und die Herkunft des installierten Pakets auf.
3. Prüfe deine Berechtigung, den Bandplan und die vom Repeater- oder Netzverantwortlichen veröffentlichten Parameter. Ein von der Software akzeptiertes Frequenzfeld **berechtigt nicht zum Senden**.
4. Beginne mit **reinen Empfangskanälen**, deaktiviertem VOX und deaktivierten APRS-Baken. Schließe vor jeder Übertragung eine geeignete Antenne an.
5. Speichere die Originalkopien außerhalb des Browsers. Kalibriere nicht und installiere keine andere Firmware, um einen einfachen Kanalfehler zu beheben.

OpenGD77 ist auf Amateurfunk ausgerichtet. Es behält nicht unbedingt alle Funktionen der kommerziellen Firmware bei. Laut dem eingesehenen Leitfaden werden SMS TX/RX und kommerzielle Scanlisten nicht unterstützt; Datenschutz/Verschlüsselung gehören nicht zum Ziel. Verstehe diese Beschreibung nicht als weltweites Rechtsgutachten. [G: Introduction]

### Drei unterschiedliche Bedeutungen von «unterstützt»

| Beleg | Was er nachweist | Was er nicht nachweist |
| --- | --- | --- |
| Ein Modell erscheint im Handbuch | Für diese Familie oder Funktion gibt es Dokumentation | Dass jede kommerzielle Revision kompatibel ist |
| Vorhanden in `firmware-core.js`, `TARGETS` | Der Katalog kennt ein Ziel und bestimmte Paketnamen | USB-Installation, Echtheit an sich oder Kompatibilität mit deiner Platine |
| Vorhanden in `gd77-connector.js`, `MODELS` | Der Connector kennt einen Identifizierungswert des Protokolls | Physische Tests mit jedem Modell, Flashen oder Schreibberechtigung |
| Das Funkgerät antwortet auf die Identifizierung | Eine erkannte Struktur und eine passende Familie wurden empfangen | Vollständiges Backup oder universelle Speicherkonformität |
| Der Editor zeigt Kanäle an | Der Standardbereich der Datei kann interpretiert werden | Dass er erweiterte Kanäle, alle Benutzerdaten oder Firmware gelesen hat |

**Tatsächlicher Status dieser Webanwendung: OpenGD77-Schreibzugriff ist GESPERRT.** Das implementierte Backup speichert Kalibrierung und Standard-Codeplug, gibt aber `complete: false` zurück: Es fehlt ein verifiziertes Protokoll zum vollständigen Kopieren der internen MCU-Firmware. Daher wird keine Schreibberechtigung erteilt. Ein offizielles Image herunterzuladen **ersetzt** kein Backup des Geräts. Dass eine externe CPS das Schreiben erlaubt, hebt diese Sperre nicht auf. [L]

## 2. Firmware, Codeplug, Kalibrierung und Sicherungen

| Element | Inhalt oder Zweck | Vorsicht |
| --- | --- | --- |
| Firmware | Programm, das das Funkgerät ausführt | Exakte Familie, Revision und Variante auswählen; keine Kanalliste |
| Codeplug | Konfiguration: Kanäle, Kontakte, Gruppen, Zonen und weitere Einstellungen | Herstellerformat und OpenGD77-Format sind ohne Prüfung nicht austauschbar |
| Kalibrierung | HF-Einstellungen dieses Geräts | Nicht von einem anderen Funkgerät kopieren oder ohne geeignete Instrumente und Verfahren bearbeiten |
| EEPROM / Flash | Gerätespezifische Speicherbereiche | «Flash» bedeutet nicht notwendigerweise MCU-Firmware oder vollständigen Klon |
| MCU ROM / interner Speicher | Internes Image, das die CPS bei bestimmten Geräten als separates Backup behandeln kann | Das Web verfügt über kein verifiziertes vollständiges Lesen, das eine Berechtigung erteilen könnte |
| Sprachdateien, ID-Datenbank, Bahndaten | Zusätzliche mit der CPS geladene Ressourcen | Nicht annehmen, dass sie in einem 128-KiB-Codeplug enthalten sind |

Der Leitfaden empfiehlt vor dem ersten Schreiben der Konfiguration Sicherungen von EEPROM, Flash, Kalibrierung, MCU ROM und Codeplug. Die konkrete Verfügbarkeit jeder Sicherung muss mit der verwendeten CPS und dem Modell geprüft werden; die Aufzählung zertifiziert nicht, dass alle Funkgeräte dieselben Bereiche offenlegen. Archiviere die Originale, nicht nur die bearbeitete Datei. [G: Backup Before You Do Anything Else]

### Im Web verfügbare Nutzung

1. Öffne die Anwendung unter `localhost` oder HTTPS und verwende je nach Familie einen Browser mit WebUSB oder WebSerial. Die Kompatibilität hängt von Browser und Betriebssystem ab.
2. Wähle die passende Familie: `MK22`, `STM32` oder `SERIAL`. Bestätige vor dem Verbinden die physische Identifizierung.
3. Schließe CPS, MMDVMHost und jedes andere Programm, das das Funkgerät verwendet. Erteile nur dem erwarteten Gerät Zugriff.
4. Die Verbindung identifiziert das Funkgerät und fordert ein automatisches Backup an. Prüfe Protokoll und Fehler: Das erwartete Ergebnis ist **teilweise**, kein vollständiges Backup.
5. Prüfe den Download der Datei `.rwb.json`. Im Verlauf lassen sich Manifest und einzelne Binärdateien erneut exportieren. Der Browser kann dauerhafte Speicherung ablehnen: Exportiere in einen eigenen Ordner.
6. Der Codeplug des Teil-Backups wird automatisch zur Offline-Bearbeitung geöffnet. **Codeplug lesen** bleibt ohne vollständiges Backup gesperrt. Du kannst auch eine Standard-Binärdatei mit genau **131072 Byte (128 KiB)** öffnen; unterstützte Dateiendungen ersetzen nicht die Prüfung des Inhalts.
7. Bearbeite die lokale Datei und wähle **128-KiB-Binärdatei speichern**. Das verändert das Funkgerät nicht. Schreiben bleibt gesperrt.
8. Trenne das Funkgerät in der Anwendung, bevor du die Seite wechselst oder die CPS öffnest.

Das Formular bearbeitet vorhandene Kanäle: ASCII-Name mit bis zu 16 Zeichen, RX, TX, FM/DMR, CC, TS und nur Empfang. Nicht bearbeitete Felder bleiben erhalten; dies ist kein vollständiger Editor für alle CPS-Funktionen. Planungstools können außerdem vorlagenbasierte Kanäle, Kontakte und Satellitendaten in die lokale Datei übernehmen. Das belegt nicht, dass alle Firmwarefunktionen im Browser implementiert sind. [L]

**Wichtige Grenze:** Das Web liest den Standardbereich von 128 KiB und umfasst keine erweiterten Kanäle **ab 1025**. Bezeichne die Datei nicht als vollständigen Klon oder als Kopie aller Zonen und Ressourcen einer erweiterten Konfiguration. Ein Backup- oder CPS-JSON, ein Firmware-ZIP und eine Binärdatei passender Größe sind nicht automatisch ein gültiger Codeplug.

### Arbeit mit der externen CPS

Der Leitfaden verlangt **OpenGD77 CPS** für ein Funkgerät, auf dem bereits OpenGD77 läuft, nicht die kommerzielle CPS von Radioddity, Baofeng, TYT oder Retevis. Er empfiehlt, einen neuen Codeplug zu erstellen oder CSV zu importieren und das Ergebnis zu prüfen. Bewahre vor dem Schreiben das Original und eine Arbeitsversion auf. Nach einem von der CPS zugelassenen Schreibvorgang lies erneut aus und prüfe pro Szenario einen Kanal. Dieses Verfahren wird nicht als Möglichkeit dargestellt, die Webanwendung freizuschalten. [G: Codeplug compatibility; CPS software]

## 3. Denkmodell: Wie die Daten zusammenhängen

```text
Identidad propia: indicativo + DMR ID
Contactos digitales: destinos TG o llamadas privadas
Lista TG / RX Group: selección de destinos para un canal
Canal: RX/TX + modo + tonos o CC/TS + destino/lista + restricciones
Zona: selección ordenada de canales
Exploración: canales de la zona o intervalo del VFO
```

Eine **ID-Datenbank** zeigt Namen von Gesprächspartnern an. Sie ersetzt weder Kontakte noch weist sie den TX-TG zu. Ein **digitaler Kontakt** kann eine Gruppe oder einen privaten Anruf darstellen: Der Typ ist ebenso wichtig wie die Nummer.

In kommerziellen CPS-Programmen oder Codeplugs findest du «RX Group», «RX Group List» oder «Empfangsgruppe». OpenGD77 dokumentiert **TG Lists**, um TG vom Kanal aus auszuwählen und je nach Filter den Empfang einzuschränken. Gehe nicht davon aus, dass eine importierte Liste genau die Empfangsregeln der kommerziellen Firmware abbildet. [G: CPS software — Overview]

### Empfohlene Reihenfolge beim Programmieren

1. Trage bei Bedarf dein Rufzeichen und deine DMR ID ein.
2. Erstelle digitale Kontakte vom Typ Gruppe für die benötigten TG; halte private Anrufe getrennt.
3. Erstelle nützliche TG-Listen pro Repeater, geografischer Zone oder Einsatzzweck.
4. Erstelle Kanäle mit Frequenzen, Modus und Parametern des tatsächlichen Dienstes.
5. Weise je nach gewähltem Ablauf eine TG-Liste oder einen direkten Kontakt zu.
6. Gruppiere die Kanäle in kleine, geordnete Zonen.
7. Prüfe Scan-Ausschlüsse, Leistung, TOT und Nur-Empfang.
8. Speichere, überprüfe und teste zuerst im Empfang.

Du musst nicht für jeden TG einen eigenen Kanal duplizieren, wenn RX/TX, CC und Repeaterbetrieb übereinstimmen und die TG-Liste die Ziele abdeckt. Separate Kanäle können jedoch bei unterschiedlichem TS, Betriebsbedingungen oder Einschränkungen sinnvoll sein.

**Versionshinweis:** Der allgemeine CPS-Abschnitt empfiehlt mindestens eine TG-Liste mit einem Gruppenkontakt; der Abschnitt `Channel Details` dokumentiert außerdem die Auswahl von **TG Lst oder Contact**, nicht beides gleichzeitig. Diese Abläufe müssen mit der verwendeten CPS/Build geprüft werden; sie rechtfertigen nicht die Behauptung, alle Versionen verwalteten beides gleich.

## 4. Kanalfelder und ihre praktische Bedeutung

| Feld | FM | DMR | Was prüfen |
| --- | --- | --- | --- |
| Name | Lokale Bezeichnung | Lokale Bezeichnung | Ein Name konfiguriert den Repeater nicht |
| RX | Empfangsfrequenz des Funkgeräts | Empfangsfrequenz des Funkgeräts | Bei Repeatern normalerweise dessen Ausgang |
| TX | Sendefrequenz des Funkgeräts | Sendefrequenz des Funkgeräts | Bei Repeatern normalerweise dessen Eingang |
| Modus | FM / Schmalband-FM | DMR | Muss zum Dienst passen |
| BW | Laut Leitfaden 25 oder 12,5 kHz | Entspricht nicht der Auswahl von TS | Örtliche Kanalplanung beachten |
| RX CSS | CTCSS oder DCS für den Empfang | Kein DMR-Filter | Ein falscher Ton kann gültiges Audio stummschalten |
| TX CSS | Gesendetes CTCSS oder DCS | Nicht zutreffend | Den vom Repeater benötigten Wert verwenden |
| Color Code | Nicht zutreffend | CC 0–15 | Weder TG noch analoger Ton |
| Timeslot | Nicht zutreffend | TS1 oder TS2 | Muss zur Netzzuordnung passen |
| TG List / Contact | Keine DTMF-Tonliste | Auswählbares oder direktes Ziel | Gruppen-/Privattyp und mögliche Overrides prüfen |
| DMR ID | Identifiziert allein keine FM-Übertragung | Eigene digitale Identität | Möglicherweise eigene Einstellung pro Kanal |
| RX Only | Verhindert TX | Verhindert TX | Bei der Vorbereitung sehr nützlich |
| TOT | Sendezeitbegrenzung | Sendezeitbegrenzung | Tatsächliche Dauer und Warnung prüfen |
| Ch Power | Geräteeigene Leistung oder Master | Geräteeigene Leistung oder Master | Der angezeigte Wert ist keine HF-Messung |
| Zone Skip / All Skip | Scan-Ausschluss | Scan-Ausschluss | Verschiedene Bedienelemente |
| Kanalstandort | Koordinaten des Repeaters | Koordinaten des Repeaters | Nicht mit dem Standort des Bedieners verwechseln |
| APRS | FM-Bakenprofil | Kann eine separate FM-Frequenz benötigen | Entspricht nicht dem APRS-Empfang |

**Simplex:** RX und TX stimmen überein. **Repeater:** Beide Frequenzen ausdrücklich eingeben; nicht nur auf das Vorzeichen eines Offsets vertrauen. Der VFO-Abstimmschritt ist nicht die FM-Bandbreite.

`Reverse` vertauscht den RX/TX-Betrieb des Repeaters; `Talkaround` sendet für den Direktbetrieb auf der RX-Frequenz. Die Funktionen sind nicht gleichbedeutend und laut Leitfaden gegenseitig ausgeschlossen. Verwende sie erst, nachdem du geprüft hast, auf welcher Frequenz das Funkgerät tatsächlich sendet. `Force DMO` erzwingt direkten DMR-Betrieb, auch bei unterschiedlichen Frequenzen; dies ist keine allgemeine Option zur «Verbesserung der Reichweite». [G: Channel Quick Menu; Channel Details]
## 5. Szenario A: FM-Kanal zum Zuhören oder für einen Repeater

1. Erstelle einen FM-Kanal und beginne mit `RX Only`.
2. Gib RX und TX gemäß den Angaben des Dienstverantwortlichen ein; für Simplex dieselbe Frequenz verwenden.
3. Stelle entsprechend der Kanalplanung Wide-/Narrow-FM ein.
4. Gib den erforderlichen **TX**-Ton ein. Lass RX CSS während der Fehlersuche ohne Ton, sofern kein bestimmter Bedarf bekannt ist.
5. Stelle Squelch so ein, dass Rauschen unterdrückt wird, schwache Signale aber nicht abgeschnitten werden; er ersetzt keinen korrekten Ton.
6. Füge den Kanal einer Zone hinzu; prüfe `Zone Skip` und `All Skip`.
7. Prüfe den Empfangston. Erst danach, falls du dazu berechtigt bist, TX mit vorsichtiger Leistung freischalten und kurz testen.

CTCSS und DCS steuern die Audioöffnung oder den Zugang; **sie verschlüsseln das Gespräch nicht**. Mit Monitor lässt sich fehlendes Signal von einer Stummschaltung durch Filter unterscheiden. Der VFO-Tonsuchlauf kann CTCSS oder DCS finden. Laut Leitfaden wird das Ergebnis sowohl auf RX als auch TX angewendet: Prüfe beides, bevor du sendest.

Der **1750-Hz**-Öffnungston und **DTMF**-Sequenzen sind andere Funktionen als CTCSS/DCS. Sende kein DTMF an Steuerungen, wenn du deren Funktion und die erforderliche Berechtigung nicht kennst. Der lokal hörbare Ton gibt das gesendete DTMF nicht immer genau wieder: Der Leitfaden weist auf Hardwareunterschiede bei MD-UV380 und MD-9600 hin. [G: FM specific functionality]

## 6. Szenario B: DMR-Repeater mit mehreren TG

1. Lass dir RX, TX, CC und die TG-Verteilung pro TS vom Repeaterverantwortlichen geben.
2. Gib deine gültige DMR ID ein. Verwende weder die ID einer anderen Person noch die TG-Nummer als eigene Identität.
3. Erstelle Kontakte vom Typ **Group Call** mit den TG-Nummern; erstelle eine TG-Liste und weise sie dem Kanal zu.
4. Konfiguriere RX/TX, CC und TS des Kanals. Wähle zunächst einen bekannten, auf diesem TS zugelassenen TG.
5. Prüfe den Empfang mit den vorgesehenen Filtern; lockere Filter zur Diagnose kontrolliert und stelle die normale Konfiguration wieder her.
6. Prüfe, ob noch eine manuelle TG/TS-Auswahl aus einem früheren Test aktiv ist.
7. Wenn Senden angebracht ist, höre erst zu, aktiviere den TG entsprechend den Netzregeln und lasse Pausen zwischen den Durchgängen.

Einen TG zu hören bedeutet nicht, dass er dauerhaft mit dem Repeater verbunden ist. Statische oder dynamische TG, Reflektoren und Aktivierungsregeln hängen vom **Netz und dessen Administrator** ab, nicht nur vom Codeplug.

### Vorübergehende Auswahl, Kontakte und private Anrufe

Bei der Referenztastenbelegung lässt sich mit `#` ein TG eingeben; zweimaliges Drücken von `#` ermöglicht die Eingabe eines privaten Ziels. Die TS-Wechseltaste und Kontakte mit bevorzugtem TS können den aktiven TS ändern. Entsprechende Bedienelemente unterscheiden sich je nach Funkgerät; siehe Modelltabelle.

Eine manuelle Auswahl oder ein **override** kann Vorrang vor Kanal oder Liste haben. Der Leitfaden dokumentiert, dass sich ein TS-Override durch Gedrückthalten der TS-Taste löschen lässt und man einen privaten Anruf durch Auswahl eines TG oder mit anderen modellabhängigen Bedienelementen beendet. Prüfe das sichtbare Ziel und den TS **vor dem PTT**.

Verwechsle einen DMR-«Privatanruf» nicht mit Vertraulichkeit. Er ist nicht allein deshalb verschlüsselt, weil er privat ist. Empfang und automatische Annahme privater Anrufe hängen ebenfalls von den Firmwareoptionen ab. [G: DMR specific functionality; Making and receiving DMR Private Calls]

### DMR-Filter: Sie sind nicht alle gleich

| Bedienelement | Wirkung | Vorsicht |
| --- | --- | --- |
| DMR Filter Off | Begrenzt nicht nach dem TG-/Kontaktkriterium der anderen Modi | Hebt nicht alle Signalanforderungen auf |
| TG | Filtert nach ausgewähltem TG | Andere empfangbare Gruppen können ausgeblendet werden |
| Ct | Filtert laut Leitfaden nach privaten Anrufkontakten im Codeplug | Nicht mit TG-Liste verwechseln |
| TGL | Filtert nach Gruppen in der TG-Liste | Inhalt und Zuordnung der Liste prüfen |
| TS Filter | Hört den vorgesehenen Slot oder sucht Aktivität zwischen Slots | Ausschalten erzeugt keine zwei gleichzeitigen Empfänger |
| CC Scan, zuvor CC Filter | Sucht einen gültigen CC für den Empfang | Bedeutet nicht «alle CC ignorieren»; kann den Empfangsbeginn verzögern oder verpassen |

Der Leitfaden erklärt, dass die DMR-Schaltung einen CC benötigt und die Firmware bei aktiviertem `CC Scan` nach einer Übereinstimmung sucht. Für den normalen Betrieb mit bekanntem CC wird dies nicht empfohlen. Außerdem verwendet das Abhören beider TS einen Auswahlalgorithmus und keinen unabhängigen gleichzeitigen Empfang. Eine visuelle Umkehrung von CC/TS und Modus kann auf Filtereinstellungen statt auf einen Displayfehler hindeuten. [G: Filters (Channel)]

**Geordnete Fehlersuche:** Frequenz und Modus → HF-Signal → CC → TS → TG/Anruftyp → Filter → Status der Netzverbindung. Wenn du alles gleichzeitig änderst, kannst du nicht erkennen, wodurch das Problem behoben wurde.

## 7. Zonen, RX groups und Scan

Eine **Zone** ist eine geordnete Kanalsammlung, kein Band und kein Netz. Derselbe Kanal kann in mehreren Zonen verwendet werden. Eine **TG-Liste** enthält digitale Ziele; sie legt nicht fest, welche Kanäle gescannt werden.

Der Leitfaden implementiert **kommerzielle Scanlisten** nicht als gleichwertige Funktion. Wenn du eine Scan-Gruppe nachbilden möchtest, erstelle eine Zone mit diesen Kanälen und scanne die Zone. Das Importieren des Feldes «Scan List» aus einer kommerziellen Datei reicht nicht aus.

### Szenario C: Eine lokale Zone scannen

1. Erstelle eine Zone mit den Kanälen, die du tatsächlich hören möchtest.
2. Prüfe, ob sie einzeln nutzbar und nicht über `Zone Skip` ausgeschlossen sind.
3. Starte den Scan mit dem Bedienelement deines Modells. Beim GD-77 und mehreren Modellen mit entsprechender Referenzbelegung wird langes Drücken von Aufwärts verwendet.
4. Passe `Scan dwell` an, wenn du schwache oder sporadische Signale verpasst: Mehr Zeit pro Kanal verbessert die Erkennungschance, verlangsamt aber den Scan.
5. Wähle das Verhalten: `Hold` bleibt bei vorhandenem Signal stehen; `Pause` setzt nach der Verzögerung fort; `Stop` beendet den Scan bei einem gültigen Signal.
6. Nutze bei Bedarf den vorübergehenden Ausschluss eines störenden Kanals. Verwechsle ihn nicht mit der dauerhaften Bearbeitung von `Zone Skip` oder `All Skip`.
7. Prüfe für `All Channels` separat `All Skip`.

Der VFO-Scan verwendet untere/obere Grenzen und eine Schrittweite, keine Zone. `Dual Watch` wechselt die Aufmerksamkeit zwischen VFOs; **das belegt keinen gleichzeitigen Doppelempfang**. Der Spektrum-Scan ist eine andere Darstellung, kein kalibrierter Analysator. [G: Scanning; VFO specific functionality; Channel Details]

Organisiere beim GD-77S Zonen mit **bis zu 16 über den Wahlschalter erreichbaren Kanälen**; dass das Format größere Zonen zulässt, erweitert nicht die physischen Bedienelemente.

`Roaming` ordnet laut eingesehenem Leitfaden die Zone nach Entfernung zu Repeatern, wenn Standort des Bedieners und Kanal-Koordinaten verfügbar sind. Es bestätigt weder, dass jeder Repeater in Betrieb ist, noch wählt es den HF-stärksten aus. Es ordnet `All Channels` nicht und wird während des Scans deaktiviert. [G: Roaming]

## 8. Bildschirme, Bedienelemente und Speichern von Änderungen

| Bildschirm oder Modus | Verwendung | Prüfung |
| --- | --- | --- |
| VFO A/B | Abstimmung und Parametertests | RX und TX prüfen, nicht nur die hervorgehobene Frequenz |
| Kanal | Betrieb mit Codeplug und Zone | Tatsächlich aktive Zone, Kanal, TG und TS prüfen |
| Channel Details | Kanal- oder VFO-Daten bearbeiten | Vorübergehendes Anwenden vom Speichern unterscheiden |
| Last Heard | Empfangene digitale Aktivität prüfen | Zeigt nicht alle Netzteilnehmer |
| Radio Info | Akku, Datum/Uhrzeit und je nach Gerät Standort | Ohne RTC kann die Uhrzeit verloren gehen |
| RSSI | Orientierung zum Empfangspegel | Ersetzt kein kalibriertes HF-Messgerät |
| GPS | Status des installierten Empfängers | Fehlt es oder steht `None`, behebt Laden eines Codeplugs das nicht |
| Satellite | Vorhersagen und Satellitenbetrieb | Benötigt gültige Zeit, Position und Bahnelemente |

Bei `Channel Details` unterscheidet der Leitfaden **Green** zum Bestätigen, **SK2 + Green** zum dauerhaften Speichern und **Red** zum Abbrechen. Die Konfigurationssperre kann dauerhafte Änderungen verhindern. Diese Bezeichnungen stehen für logische Bedienelemente, nicht für physisch gleiche Tasten bei allen Geräten.

Vorübergehende Einstellungen für Kanalleistung, TG und TS ändern den Codeplug möglicherweise nicht. Wechsle nach einem Test den Kanal oder rufe die Details auf, um zu prüfen, was gespeichert wurde. Bewahre eine bekannte Dateiversion auf dem Computer auf.

Je nach Plattform/Build gibt es Displayoptionen für Beleuchtung, Kontrast, Invertierung, Farben und Tag-/Nachtmodus. Ein GD-77 mit invertiertem Display wird dadurch nicht physisch zur «Black»-LCD-Variante. Übertrage Farbthemen nicht auf monochrome Modelle oder Screenshots auf den GD-77S ohne Display. [G: Main screens; Display Options; Channel Details]

## 9. Barrierefreiheit und Ton

OpenGD77 dokumentiert akustische Hinweise, Wiederholung von Sprachausgaben und Sprachlautstärke. Sprachdateien werden **separat mit der CPS geladen**; die Änderung der Menüsprache ändert nicht automatisch die installierte Stimme.

1. Prüfe, ob die Sprachdatei für Firmware und Sprache geeignet ist.
2. Wähle `Prompt`: Stummschaltung, Pieptöne, Pieptöne ohne Tastentöne oder Sprache, sofern verfügbar.
3. Teste die Stufen `Voice`, `Voice L2` und `Voice L3`: Sie verändern Zeitpunkt und Detailtiefe der Ansage, nicht die Sprache.
4. Verwende das SK1 entsprechende Bedienelement, um die letzte Ansage zu wiederholen; während einer Ansage kann es sie stoppen.
5. Stelle die Lautstärke der Pieptöne und DMR-/TOT-Beginn-/Endhinweise ein, ohne erforderliche Warnungen zu entfernen.
6. Teste die Konfiguration vollständig ohne Display, bevor du sie unterwegs verwendest.

Beim **GD-77S** ist das Laden von Sprachdateien für den praktischen Betrieb unerlässlich, da es weder Display noch Tastatur gibt. Mit der Modustaste lassen sich TG, Scan, TS, CC, Filter, Zone und Leistung durchgehen; SK1/SK2 ändern je nach angesagtem Modus ihre Funktion. Verwende keine Abläufe des GD-77 mit Display. [G: Sound Options — Prompt; GD-77S operation]

Die Mikrofonverstärkung für FM und DMR wird getrennt eingestellt. Mehr Verstärkung bedeutet nicht mehr Reichweite; sie kann die Verständlichkeit verschlechtern. VOX kann unbeabsichtigtes Senden auslösen; deaktiviere es bei Konfiguration, Tests und USB-Verbindung.

## 10. Leistung, Akku und Kalibrierung

Die Leistung **Master** gilt für VFO und Kanäle, die diese Einstellung übernehmen; ein Kanal kann eine eigene Leistung haben. Laut Leitfaden wird die eigene Leistung hervorgehoben angezeigt; eine Änderung im Betrieb kann vorübergehend sein. Verwende zum dauerhaften Speichern das für das Modell beschriebene Verfahren in den Details.

Es gibt keine einheitliche Skala für alle Hand- und Mobilgeräte. Der Leitfaden unterscheidet 5-W-Geräte, 10-W-Varianten und Mobilgeräte; außerdem macht die Skalierungsoption eines UV380 **10W ohne PLUS** aus einem normalen Handfunkgerät keine andere Hardware. Die Variante **10W PLUS benötigt ihr eigenes Image**. [G: Controlling Tx power; Radio Options — Mode; F2]

Bewährte Vorgehensweisen:

- Verwende nur die erforderliche Mindestleistung und eine geeignete Antenne.
- Prüfe Stromversorgung, Akku, Anschlüsse und SWR, bevor du einen vermeintlichen Leistungsabfall untersuchst.
- Verstehe eine Displayangabe nicht als Garantie für gemessene Leistung.
- Versuche nicht, durch Ändern einer Bezeichnung, eines Menüs oder der Kalibrierung aus einem 5-W-Gerät 10 W zu machen.
- Kopiere keine Kalibrierung eines anderen Funkgeräts, selbst bei gleichem Modell.
- Bearbeite keine Referenz-, Abweichungs- oder Leistungseinstellungen, um einen CC-/TG-Fehler zu beheben.
- Kalibrierung erfordert Instrumente, passende Last und ein spezifisches Verfahren. Wenn du das nicht hast, bewahre die Originalwerte auf.

Ein Funkgerät kann sich bei längeren Übertragungen stark erhitzen, besonders als Hotspot. Eine bei unterbrochenem Sprechfunk verträgliche Leistung garantiert keinen sicheren Dauerbetrieb.
## 11. DMR-Hotspot über USB

Der Leitfaden dokumentiert das Funkgerät als Modem für **DMR-Sprache** mit MMDVMHost/Pi-Star und erwähnt BlueDV mit Kompatibilitätshinweisen. Es ist weder ein Netzzugang über den Browser noch ein WLAN-Hotspot und macht nicht jedes Funkgerät zu einem Duplex-Repeater.

### Szenario D: Kompatibles Funkgerät als Hotspot

1. Bestätige, dass Modell und Build dies unterstützen. **RD-5R/DM-5R unterstützt wegen der USB-Beschränkung beim Senden keinen Hotspot.**
2. Wähle die passende Hotspot-Option am Funkgerät; betreibe nicht gleichzeitig eine CPS-/Web-Sitzung.
3. Verbinde das geeignete Programmierkabel mit dem Computer oder MMDVMHost-Gerät.
4. In Pi-Star nennt der Leitfaden den Modemtyp `OpenGD77 DMR hotspot (USB)`. Falls er fehlt, prüfe Version und Dokumentation des Hosts.
5. Konfiguriere Frequenz, CC, ID und Netz nach Vorschriften und Host. Prüfe den Modus auf dem Display des Funkgeräts.
6. Beginne mit geringer Leistung, ausreichender Belüftung und kurzen Tests. Übertrage Prozent-/Leistungstabellen eines Handfunkgeräts nicht auf ein Mobilgerät.
7. Wenn USB beim Senden zurückgesetzt wird, untersuche zuerst HF-Einstrahlung: Der Leitfaden empfiehlt eine separate externe Antenne, HF-Schutz am USB und geeignete Maßnahmen am Host. Verwende bei dieser Anordnung nicht die Antenne direkt am Handfunkgerät.

Die Werte `RFLevel`/Prozentangaben des Hosts entsprechen keiner universellen Wattzahl. Der Leitfaden beschreibt bei manchen Implementierungen sogar eine Sonderbehandlung des Werts 100; verwende dies nicht als Regel für jeden Build. Gruppenverwaltung, Authentifizierung und Verbindungen gehören ebenfalls zur Software und zum Netz des Hosts. [G: Hotspot mode]

## 12. APRS: Möglichkeiten und Grenzen

Der Leitfaden dokumentiert **FM-APRS-Senden mit AFSK bei 1200 oder 300 Baud** und **keinen APRS-AX.25-Empfang bzw. keine Decodierung**. Versprich weder eine Karte empfangener Stationen noch bidirektionale APRS-Nachrichten oder einen universellen TNC.

Es handelt sich um unterschiedliche Mechanismen:

| Mechanismus | Übertragungsweg der Daten | Abhängigkeiten |
| --- | --- | --- |
| FM APRS | AFSK-Paket auf einer FM-Frequenz | APRS-Profil, Rufzeichen, Position und passende Frequenz |
| Position über Talker Alias DMR | Informationen im DMR-Datenstrom | Unterstützung durch Repeater/Netz und TA-Optionen |
| Veröffentlichung auf einer APRS-Website | Nachgelagerte Verarbeitung durch Infrastruktur | Empfangsabdeckung, Gateway und Netz; durch das Senden nicht garantiert |

### Szenario E: Erste FM-APRS-Bake

1. Konfiguriere Rufzeichen und APRS-Profil in OpenGD77 CPS. Der Leitfaden beschreibt bis zu **8 Profile**, nicht eine universelle Anzahl für alle künftigen Versionen.
2. Stelle SSID, Ziel/Route, Symbol, Kommentar, Geschwindigkeit und Frequenz entsprechend dem lokalen Netz ein. Übertrage keine terrestrische Route auf einen Satelliten.
3. Gib eine gültige manuelle Position oder GPS mit tatsächlichem Fix an. Wähle GPS nicht als Quelle, wenn das Funkgerät keinen funktionierenden Empfänger hat.
4. Weise das Profil dem entsprechenden Kanal oder VFO zu.
5. Wähle zuerst `Manual`; prüfe Standort und Frequenz, bevor du eine Testbake sendest.
6. Prüfe den Empfang mit Infrastruktur oder einem geeigneten Empfänger, nicht nur anhand des lokalen Pieptons. Manche Modelle geben keine Audio-Rückmeldung aus.
7. Aktiviere erst dann bei Bedarf `PTT`, `Auto` oder `Smart`. Prüfe Intervall und Decay, damit der Kanal nicht unnötig belegt wird.

Bei `PTT` wird die Bake laut Leitfaden nach dem Loslassen von PTT unter Berücksichtigung der Timer gesendet; `Auto` verwendet Intervalle und `Smart` passt sie an Bewegung und Drehung an. Eine ungültige Position kann die Bake verhindern oder `Location?` anzeigen. Vorübergehende Deaktivierung und Tastenkombinationen sind modellabhängig.

Ein Profil kann eine andere TX-Frequenz festlegen; andernfalls wird die Frequenz des analogen Kanals/VFO verwendet. Für diese FM-Funktion verlangt der Leitfaden in einem DMR-Kanal eine ausdrücklich angegebene APRS-Frequenz. Die Profilfrequenz gilt im Satellitenmodus und im APRS-Modus `PTT` nicht gleichermaßen: Prüfe diese Ausnahmen vor dem Betrieb. [G: FM APRS location transmission; APRS Options]

Die TA-Option `APRS` oder `Both` aktiviert keinen AX.25-Empfänger. Der Leitfaden warnt vor Problemen mit gesendetem Talker Alias in Motorola-Repeatern/-Netzen; lasse TA TX deaktiviert, sofern das System dies nicht nachweislich unterstützt. Der TA-Empfang hängt nicht davon ab, dass dessen Übertragung eingeschaltet ist. Veröffentliche persönliche Koordinaten nicht automatisch, ohne deren Datenschutz zu berücksichtigen.

## 13. GPS, NMEA und Protokollierung

GPS ist eine **Hardwarefunktion**, die nicht durch die Installation einer Datei entsteht. Der Leitfaden dokumentiert Versionen mit optionalem Empfänger und Änderungen bei bestimmten Familien; nicht jedes Gerät gleichen Namens hat GPS.

| Status/Option | Bedeutung laut Leitfaden | Folge |
| --- | --- | --- |
| `None` | Kein Modul erkannt | Variante, Installation und Kompatibilität prüfen; nicht von einem Menüfehler ausgehen |
| `Off` | GPS deaktiviert | Bei MD-9600/RT-90 gibt es Einschränkungen bei der Stromversorgungssteuerung |
| `On` | Empfänger aktiviert | Muss Position ermitteln; im Freien testen |
| `NMEA` | GPS-Daten werden über USB-Seriell gesendet | Normale CPS-Kommunikation ist bis zum Wechsel zu `Off` oder `On` nicht möglich |
| `Log` | NMEA-Protokoll im Flash | Belegt Speicher und kann andere Ressourcen verdrängen |

Ein fehlender Fix in Innenräumen beweist keinen defekten Empfänger. Geh ins Freie und prüfe den GPS-Bildschirm. Die aus der Bewegung abgeleitete Richtung ist kein Magnetkompass, der im Stillstand funktioniert. Bei aktivem GPS dokumentiert der Leitfaden die Aktualisierung der Uhr und die Verwendung der Position durch andere Funktionen.

**Speicherwarnung:** Bei Geräten mit 1 MB Flash, etwa dem GD-77-Beispiel aus dem Leitfaden, belegt aktivierte GPS-Protokollierung Speicher der DMR-ID-Datenbank und kann **deren Daten löschen**; Sprachdateien beeinflussen den verfügbaren Platz ebenfalls. Deaktiviere die Protokollierung und lade die Datenbank erneut, falls du sie wiederherstellen musst. Übertrage die Protokollierungsfunktionen eines Flash-Geräts nicht auf alle Modelle. [G: General Options — GPS; GPS Screen]

MK22-Pakete mit dem Zusatz `_NMEA` sind veröffentlichte Varianten; ihre Existenz beweist nicht, dass ein unverändertes Funkgerät GPS enthält. Verwechsle ein **NMEA-Variantenimage** nicht mit dem **NMEA-Ausgabemodus über USB** im Menü. Prüfe Build-Hinweise und Hardware vor der Auswahl. [F1]

## 14. Satelliten: Vorbereitung und Betrieb

Der dokumentierte Satellitenbildschirm sagt Überflüge voraus, zeigt Azimut/Elevation an und wendet Doppler-Korrektur auf RX/TX an. Er macht das Gerät weder zum Empfänger aller Satellitenmodi noch belegt er Vollduplex.

### Szenario F: Einen Überflug vorbereiten

1. Prüfe den Betriebsstatus und die Regeln des Satelliten anhand aktueller Quellen des Betreibers/AMSAT.
2. Aktualisiere mit der CPS die Bahnelemente **Keps/TLE** und Parameter der Satelliten, die du tatsächlich verwenden wirst.
3. Gib korrekten Standort sowie Datum/Uhrzeit ein; prüfe UTC im Vergleich zur Ortszeit. Eine große Zeitabweichung verschiebt Vorhersagen.
4. Bestätige Frequenzen, Modus, Töne und ob der Satellit zu diesem Zeitpunkt Sprache, Bake oder APRS zulässt.
5. Prüfe die Passliste und danach die Polardarstellung oder Live-Daten.
6. Teste den Empfang vor dem Senden. Passe Antenne, Ausrichtung und Leistung an den Überflug an, ohne allgemeine Regeln terrestrischer Repeater zu übertragen.
7. Wenn es Satelliten-APRS gibt, verwende dessen spezifische Parameter. Der Leitfaden unterstützt Profile mit Satellitennamen zur Anpassung der vorgesehenen Werte.

Laut Leitfaden stellt das Hochladen von Keps mit der CPS auch Datum/Uhrzeit ein. Funkgeräte ohne RTC können sie beim Ausschalten verlieren; leite die Speicherung nicht auf den gesamten Katalog ab. Die Erwähnung von RTC bei MD-9600/RT-90, UV380/RT-3S und DM-1701 entspricht dem Umfang des Textes und ist keine Zertifizierung aller späteren Modelle.

Veraltete Bahndaten, eine falsche Hemisphäre oder die Verwechslung von Dezimalgraden mit einem anderen Format führen auch bei korrekt funktionierender Firmware zu falschen Vorhersagen. Alarme, automatischer Satellitenwechsel und besondere Tonsteuerungen hängen von Build/Plattform ab. Die lokale Bearbeitung von Satellitendaten in dieser Webanwendung **lädt sie nicht ins Funkgerät**, solange der Schreibzugriff gesperrt bleibt. [G: Satellite Screen; L]
## 15. USB, Verbindungsmodi und Firmware

**Normalbetrieb/CPS und Bootloader sind unterschiedliche Modi.** Im Aktualisierungsmodus funktioniert die CPS-Identifizierung möglicherweise nicht; ein leerer Bildschirm beweist nicht, dass das Gerät defekt ist. Das Kabel muss zur jeweiligen Hardware passen; nicht alle zweipoligen Anschlüsse verwenden dasselbe Kabel oder Protokoll.

Der Leitfaden unterscheidet die Installation für MK22 und STM32: Für STM32-Aktualisierungen dokumentiert er den STM-DFUSe-Treiber; für normale CPS-Kommunikation gibt es einen anderen Port-/Treiberkontext. Ändere Treiber nicht willkürlich und gehe nicht davon aus, dass ein DFU-Treiber WebUSB oder WebSerial im Normalbetrieb ermöglicht.

### Wenn du Firmware außerhalb der Webanwendung installieren oder aktualisieren musst

1. Prüfe Modell und Revision in [der Matrix](AYUDA-OPENGD77-MODELOS.md) sowie die Anweisungen für das konkrete Paket.
2. Bewahre verfügbare Sicherungen und die für das Gerät passende Originalfirmware auf.
3. Verwende den vom Projekt genannten Firmware-Updater in **OpenGD77 CPS**, nicht den kommerziellen Updater für ein OpenGD77-Image.
4. Prüfe die für diese Familie erforderliche «Donor»-Firmware. Laut Leitfaden wird sie im Updater ausgewählt, um Komponenten des AMBE-Codecs beizusteuern; sie wird nicht als Ersatz gemäß den Anweisungen für ein anderes Gerät installiert.
5. Bestätige Modell, Variante, Sprache und Revision vor dem Start. Eine richtige Donor-Auswahl kann DMR ermöglichen; ohne das erforderliche Verfahren beschreibt der Leitfaden nur FM-Betrieb.
6. Befolge die **modell- und revisionsspezifische** Bootloader-Sequenz und stelle eine stabile Stromversorgung sicher. Es gibt hier keine universelle Tastenkombination.
7. Prüfe nach der Installation Identifizierung, Audio, RX/TX und Konfiguration; erstelle die Sicherungen, die CPS ermöglicht.

Es werden keine Wiederherstellungsanweisungen angeboten, die auf dem Überbrücken von Platinen, Löschen von Bereichen oder Schreiben der Kalibrierung eines anderen Geräts beruhen. Bei unklarer Identifizierung die Aktualisierung stoppen, bis die Hardware dokumentiert ist.

## 16. Fehlerdiagnose nach Symptomen

| Symptom | Prüfungen von geringerer zu größerer Auswirkung | Was du vermeiden solltest |
| --- | --- | --- |
| Verbinden ist deaktiviert | HTTPS/localhost, Browser-API, Familie und Bestätigung | Firmware nur ändern, um eine Schaltfläche freizuschalten |
| USB-/Serienberechtigung vorhanden, aber keine Identifizierung | Normalmodus, passendes Kabel, CPS/Host geschlossen, richtige Familie | Andere Familie erzwingen oder Speicherkarte annehmen |
| Unbekannte Identifizierungsstruktur | Modell/Build und Meldung aufzeichnen; dokumentierte Werkzeuge für diese Version verwenden | Connector-Validierung umgehen |
| Teil-Backup und Schreibzugriff gesperrt | Kalibrierung/Codeplug und Manifest exportieren; Status aufbewahren | Heruntergeladenes ZIP als MCU-Backup behandeln |
| Datei lässt sich nicht öffnen | Exakt 131072 Byte und Standardformat; kein JSON und keine Firmware | Datei auffüllen oder kürzen, damit sie passt |
| Kanäle ab 1025 fehlen | Ausdrückliche Grenze des Webeditors | Standardbereich als erweitertes Backup speichern |
| FM-Signal vorhanden, aber kein Audio | RX CSS, Squelch, Stummschaltung, Modus/Bandbreite und Lautstärke | Zuerst HF-Kalibrierung ändern |
| DMR-Signal vorhanden, aber kein Audio | CC, TS, TG/Kontakt, Filter und Verbindungsstatus | CC Scan dauerhaft ohne Bedarf verwenden |
| TG wird gehört, aber ein anderer gesendet | Override, direkter Kontakt, TG-Liste und aktiver TS | Nur auf den Kanalnamen vertrauen |
| Repeater lässt sich nicht öffnen | Tatsächliches TX, FM-Ton oder DMR-CC/TS, Abdeckung und Zugangsregeln | Leistung erhöhen, ohne Konfiguration zu prüfen |
| RX Only-Fehler / TX nicht verfügbar | Nur-Empfang, TX Inhibit, Bandgrenzen und TOT | Einschränkungen ohne Berechtigung entfernen |
| DMR-Namen fehlen | ID-Datenbank geladen, Länge/Speicher, empfangener Talker Alias | ID-Datenbank mit TG-Liste verwechseln |
| Erwartete Kanäle werden nicht gescannt | Aktive Zone, Zone Skip, All Skip und Scanmodus | Nach nicht implementierter kommerzieller Scan List suchen |
| USB fällt beim Senden aus | HF-Einstrahlung, separate Antenne und Aufbau; RD-5R kein Hotspot | Schutz deaktivieren oder mit maximaler Leistung weitermachen |
| CPS kommuniziert nach GPS-Aktivierung nicht mehr | `NMEA`-Ausgabe: zurück zu `Off` oder `On` | Firmware neu installieren, bevor der USB-Modus geprüft wurde |
| GPS zeigt `None` / erhält keinen Fix | Tatsächliches Vorhandensein des Moduls, Build-Unterstützung und Test im Freien | GPS ab Werk wegen des Handelsnamens annehmen |
| APRS zeigt `Location?` oder sendet nicht | Position, Profil, Rufzeichen, Frequenz, Beacon-Modus, TX Inhibit | Automatische Baken zum «gründlicheren Testen» aktivieren |
| Satellitenüberflüge unplausibel | Zeit, Datum, UTC, Position, TLE und tatsächlicher Satellitenstatus | Frequenzen nach Gefühl ändern |
| GD-77S spricht nicht | Sprachdateien geladen, Lautstärke und Steuerungsmodus | Display-Anweisungen für GD-77 anwenden |
| MD-9600/RT-90 ohne RX/TX nach Aktualisierung | HW-Image und tatsächliche Revision, Stromversorgung und Sicherungen | Revisionen nach einer vermeintlich universellen Regel zufällig flashen |
| Eine Option fehlt | Modell, Variante, Sprache und Datum/Build | Annehmen, dass jeder Screenshot zur installierten Version gehört |

## 17. Glossar

| Begriff | Bedeutung |
| --- | --- |
| AMBE | Digitaler Sprachcodec; seine Integration erfordert das dokumentierte Donor-Verfahren |
| APRS | System zum Austausch von Stations-/Positionsinformationen; hier wird FM AFSK von DMR-Daten unterschieden |
| Build | Konkreter Firmware-Build; Datum und Revision notieren |
| CC | DMR Color Code, Wert 0–15 |
| Codeplug | Konfigurationsdatei/-struktur des Funkgeräts |
| Kontakt | Digitales Ziel mit Nummer und Anruftyp |
| CPS | Computerprogramm zum Konfigurieren und Warten des Funkgeräts |
| CTCSS / DCS / CSS | FM-Ton-/Code-Signalisierungssysteme; keine Verschlüsselung |
| DMO | Direkter Digitalbetrieb ohne Repeater |
| DMR ID | Digitale Kennung einer Station; nicht der TG |
| DTMF | Signalisierung mit Tonpaaren zur Steuerung oder Wahl |
| Keps / TLE | Bahndaten zur Vorhersage von Satellitenüberflügen |
| MCU | Mikrocontroller, der die Firmware ausführt |
| MMDVMHost | Hostsoftware für digitale Modems, verwendet im Hotspot-Szenario |
| NMEA | Format für Navigationsmeldungen; je nach Zusammenhang auch Name einer Ausgabe oder Variante |
| Override | Vorübergehende Auswahl, die einen gespeicherten Wert überschreibt |
| PTT / VOX | Senden per Sprechtaste / sprachgesteuerte Aktivierung |
| RTC | Echtzeituhr; Vorhandensein und Erhalt hängen vom Gerät ab |
| RX / TX | Empfang / Senden |
| RX Group / TG List | Kontaktgruppe; Bedeutung in der verwendeten Firmware/CPS prüfen |
| SK1 / SK2 | Logische Namen von Seitentasten; Position je nach Modell unterschiedlich |
| TA | Talker Alias, zusätzliche in DMR gesendete Informationen |
| TG | Talkgroup, Ziel eines DMR-Gruppenanrufs |
| TOT | Timer zur Begrenzung einer Übertragung |
| TS | DMR-Timeslot, 1 oder 2 |
| VFO | Frequenzabstimmungsmodus |
| Zone | Geordnete Kanalsammlung |

## 18. Quellen, Versionen und Lizenzen

Abfrage am **2026-10-25**, mit Download des Leitfadens zur lokalen Einsicht und gezielten Abfragen offizieller Indizes; das Forumsarchiv wurde nicht massenhaft durchsucht.

- **[G] Offizieller englischer Leitfaden:** [Gepflegtes Markdown](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md). Als reproduzierbare Referenz nennt die abgefragte API als letzte Änderung der Datei [33de63dcb002fcd837419fda25a2e535b940dbcd, 2026-03-08](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md). Die Namen der zitierten Abschnitte verweisen auf Funktionsbelege.
- **[R] Offizielles Repository des Leitfadens:** [LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide). Die README erläutert die Trennung vom früheren Repository aus Lizenzgründen, erklärt **GPL 2 für diese Dokumente** und weist darauf hin, dass nur die englische Version gepflegt wird; die chinesische ist veraltet.
- **[W] Projektwebsite:** [opengd77.com](https://www.opengd77.com/). Laut Startseite wurde bei der Abfrage die Schließung des interaktiven Forums und das Bot-Traffic-Problem erklärt.
- **[A] Statisches Archiv:** [Archivindex des Forums](https://www.opengd77.com/archive/index.html). Als Snapshot mit sichtbarem Datum Juli 2025 präsentiert; kein Beleg für alle Funktionen eines Builds von 2026. Registrierung, Profile oder andere Links funktionieren möglicherweise nicht.
- **[F1] Eingesehener MK22-Index:** [GD77, 2026-05-04, Revision 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/). Enthält spezifische Pakete für GD77, GD77S, DM1801, DM1801A und RD5R mit Zielvarianten.
- **[F2] Eingesehener STM32-Handfunkgeräte-Index:** [MDUV380_DM1701, 2026-05-04, Revision ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/). Enthält `OpenMDUV380_10W_PLUS.zip` getrennt vom Standard sowie DM1701 und RT84.
- **[F3] Eingesehener Mobilgeräte-Index:** [MD9600, 2026-05-04, Revision e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/). Enthält HW-V1/V2/V4/V5-Images.
- **[F4] Eingesehener MD2017-Index:** [2026-05-05, Revision 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/). Belegt ein veröffentlichtes Paket, nicht die Gleichwertigkeit mit einem anderen Modell.
- **[C] Geprüfte Wartungshinweise:** [MDUV380_DM1701-Changelog vom 2026-05-04](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/changelog.txt). Beschreibt die Anpassung der Codec-Verbindung an aktuelle Tools, keine Zusage aller Funktionen für jedes Modell.
- **[L] Lokale Belege dieser Anwendung:** [`firmware-core.js`](../../../firmware-core.js), `TARGETS`; [`gd77-connector.js`](../../../gd77-connector.js), `MODELS`, `connect`, `backup`, `readCodeplugRaw`; [`radio-ui.js`](../../../radio-ui.js), Status der Berechtigungen, Lesen/Bearbeiten und Export. Beschreibt die Implementierung, keine physische Testkampagne.

Die abgefragten `Latest`-Pfade leiteten zu diesen Verzeichnissen weiter; sie können sich ändern und bedeuten nicht «stabil für jedes Gerät». Leitfaden, Pakete und Forumsarchiv haben unterschiedliche Zeitabläufe. Bei Abweichungen sind die verifizierten Anweisungen für genau das Paket und die Hardware maßgeblich; neue Erkenntnisse nicht automatisch übertragen.

**Lizenzen:** Die zitierte GPL-2-Angabe gilt für das Repository des Leitfadens. Sie wird weder als MIT-Lizenz verstanden noch auf aktuelle Firmware, Donor-Firmware, Codec, Sprachdateien, CPS, Images oder sämtliche Abhängigkeiten ausgedehnt. Prüfe für jede Komponente die konkrete Lizenz, bevor du sie weiterverbreitest; ein öffentlicher Download hebt Nutzungs- oder Verbreitungsbedingungen nicht auf.