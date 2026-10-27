# F4HWN: Referenz aller Katalogoptionen

Revision: 25-10-2026. Diese Tabelle umfasst **jeden Schlüssel** des Webkatalogs
v6.3.0, Commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Die Beschreibungen nennen den Zweck der Funktion, garantieren jedoch nicht, dass
eine beliebige Kombination kompiliert oder auf deinem Funkgerät funktioniert.
Ebenfalls enthalten sind die 10 zusätzlichen Schlüssel aus den veröffentlichten
Presets der 18 historischen Versionen, ohne sie als Optionen der aktuellen
Oberfläche darzustellen.

## Optionen richtig lesen

- ON/OFF sind hier Entscheidungen zur **Kompilierung**, nicht unbedingt Schalter
  im Funkgerätemenü.
- Eine kompilierte Funktion kann eine nachträgliche Konfiguration, Ressourcen,
  Hardware, eine App oder externe Werkzeuge erfordern.
- OFF entfernt üblicherweise Code/Oberfläche, löscht aber nicht unbedingt alte Daten.
- Ein fehlender Name bedeutet nicht OFF: Er kann nicht existieren oder in diesem
  Katalog nicht verfügbar sein. Die [Preset-Matrix](F4HWN-PRESETS.md) verwendet N/D.
- Das Webformular verwendet v6.3.0; der lokale Bricohams-Builder ist auf v6.1.0
  festgelegt. Mische Optionen/Defaults nicht, ohne die beiden Tabellen zu vergleichen.
- Das maximale PY32-Imagebudget, das Slots akzeptieren, beträgt 118 KiB
  (120832 bytes). Alles zu aktivieren garantiert nicht, dass es in Flash/RAM passt.
- Upstream weist darauf hin, dass mehrere standardmäßig deaktivierte Optionen,
  die nicht von F4HWN stammen, außer bei ausdrücklicher Dokumentation nicht
  unterstützt werden. Aktiviere sie nicht allein deshalb, weil es ein Kästchen gibt.

## Plattform und Protokolle

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `DEV` | Identität und Behandlung als Entwicklungsversion bei der Kompilierung | Kein Benutzermodul; der Bricohams-Builder verlangt OFF und der stabile Katalog schließt Entwicklungsversionen aus |
| `ENABLE_FEAT_F4HWN` | F4HWN-Funktionsebene, Identität und zugehörige Menüs | Für das Bricohams-Profil erforderlich; OFF nicht verwenden, um Kompatibilität vorzutäuschen |
| `ENABLE_UART` | UART-Kommunikation und zugehöriger Protokollcode | Für kompatible serielle Verwaltung beibehalten; legt nicht von selbst alle Befehle fest |
| `ENABLE_USB` | Native USB-Unterstützung und deren Transport auf PY32 | Erfordert passende Hardware/Kabel; fügt einer V1 kein USB-Dateninterface hinzu |
| `ENABLE_EXTRA_UART_CMD` | Zusätzliche UART-Befehle der Basis | Zusätzliche Steuerungsmöglichkeiten; nur mit bekannten Werkzeugen und kompatibler Version verwenden |
| `ENABLE_UART_RW_BK_REGS` | Lese-/Schreibzugriff auf BK-Register über UART | Fortgeschrittene Diagnose; kann den RF-Betrieb ändern, nicht ohne Bedarf aktivieren |
| `ENABLE_SWD` | Verfügbarkeit von SWD-Debugging je nach Implementierung | Kein Web-Kopiermodus; Auswirkungen auf Pins und Platine prüfen |
| `ENABLE_LTO` | Linker-Optimierung über Compilationseinheiten hinweg | Ändert Ergebnis/Größe; Toolchain-Kompatibilität und Stub-Prüfungen überprüfen |
| `ENABLE_NO_HEAP` | Entfernt die Heap-Reservierung im Linker der Basis | Nur wenn das Programm keine dynamische Speicherzuweisung benötigt; kein allgemeiner Beschleuniger |
| `ENABLE_FEAT_F4HWN_DEBUG` | F4HWN-Diagnoseinstrumentierung | Kann Speicher belegen/Timing ändern; für den normalen Betrieb nicht erforderlich |
| `ENABLE_AGC_SHOW_DATA` | Anzeige der Daten zur automatischen Verstärkungsregelung | Diagnosetool; keine automatische Kalibrierung |
| `ENABLE_BYP_RAW_DEMODULATORS` | RAW-Demodulationspfade der Basis | Erweiterte/nicht von einigen Presets unterstützte Option; Implementierung prüfen, keinen besseren Empfang annehmen |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | Physische Zugriffsbefehle für externen Flash | Für die vollständige Sicherung dieser Website mit kompatiblen Labs erforderlich; nicht mit dem Auslesen der Kalibrierung verwechseln |

## Multiboot, CFG und Overlays

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | Verwaltung externer Images und zugehöriger Bänke | Bietet keine V1-Unterstützung und macht nicht jede `.bin` kompatibel |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | CFG-Bank während des Betriebs wechseln | Ändert Einstellungen/Kanäle, stellt keine andere Firmware wieder her; kompatible Daten erforderlich |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | Vom Multiboot und den Overlays verwendeter Workspace/RAM-Betrieb | Isolationsprüfung beibehalten; im Bricohams-Profil nicht deaktivieren |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | Loader und Menü für externe Apps | Erfordert Overlay-RAM und kompatible Apps bezüglich ABI/API/caps; experimentell |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | Beam-Dienst für Overlay-Apps verfügbar | Hängt vom App-Loader ab; bedeutet nicht, dass eine bestimmte App enthalten ist |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | Systeminformationen über Overlay/zugehörigen Dienst | Hängt von Apps ab; wirkt sich je nach Quelltext auf Diagnosecode und Stack-Nutzung aus |

Das untersuchte CMake lehnt APPS ohne MULTIBOOT_OVERLAY sowie BEAM/INFO overlay
ohne APPS ab. Dies sind geprüfte Abhängigkeiten, keine vollständige Liste aller
möglichen Wechselwirkungen. Ändere kein Binary, um vorzutäuschen, dass eine
andere API existiert.

## Empfang, Audio und Spektrum

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_FMRADIO` | Empfang von UKW-Rundfunk mit unterstützter Hardware | Nicht der FM-Modus eines VHF/UHF-Kanals |
| `ENABLE_NOAA` | NOAA-Wetterempfangsfunktionen | Geografische Verfügbarkeit; kein universelles Wetterfunknetz |
| `ENABLE_WIDE_RX` | Vom Code unterstützte erweiterte Empfangsbereiche | Empfindlichkeit/Filter variieren je nach Band; erlaubt keine gesetzmäßige TX außerhalb des Bands |
| `ENABLE_SPECTRUM` | Spektrumanalysator der Basis | Keine gleichzeitige Verfügbarkeit mit anderen Funktionen oder Laboranalysator-Leistung annehmen |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | F4HWN-Verbesserungen des Analysators | Wirkt je nach Build auf SPECTRUM und gespeicherte Parameter |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | Empfindlichere Squelch-Kriterien | Kann durch Rauschen verursachtes Öffnen erhöhen; SQL anpassen und testen |
| `ENABLE_FEAT_F4HWN_NARROWER` | Schmalere FM-Filtervariante und zugehöriges Menü | Auf die Kanalbandbreite abstimmen; ändert nicht das VFO-Raster |
| `ENABLE_FEAT_F4HWN_VOL` | RX-Audio per Software einstellen | Unterschied zur Lautstärkeregelung und RF-Verstärkung |
| `ENABLE_FEAT_F4HWN_AUDIO` | F4HWN-RX-Audioprofile/-verarbeitung | Audioprofil anschließend auswählen; korrigiert keine falsch eingestellte Frequenz |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | Audioanzeige bei RX/TX | Misst weder RF-Leistung noch die Modulationsqualität am Prüfplatz |
| `ENABLE_AUDIO_BAR` | Audiopegelanzeige | Visuelle Anzeige; garantiert keine Verzerrungsfreiheit |
| `ENABLE_RSSI_BAR` | Signalstärkeanzeige | RSSI garantiert kein decodierbares Audio |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | Erweiterter A/B-Empfangszyklus und Prioritäten | RxMode und TX-Antwortziel prüfen; keine vier parallelen Empfänger |

## Scan, Speicher und Protokoll

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_FASTER_CHANNEL_SCAN` | Verbesserungen der Scangeschwindigkeit der Basis | Anders als der zusätzliche Schnellmodus von F4HWN |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | F4HWN-Schnellscanmodi | Kann kurze Signale oder Tonerkennung verpassen |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | Fortschrittsanzeige beim Scannen | Ändert nicht von selbst die Liste oder den Bereich |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | RSSI-Informationen während des Scans | Zusammen mit Rauschen/Dämpfung interpretieren, nicht als Entfernung |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | Informationen zu beim Scannen erkannten Untertönen/Codes | Ton vor der Programmierung für TX bestätigen |
| `ENABLE_SCAN_RANGES` | Scannen innerhalb konfigurierter Bereiche | Grenzen und korrekten Schritt konfigurieren |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | Ändert das Timeout der Codes-/Unterton-Suche der Basis | Nicht das TX-TOT; Verbrauch und Verlassen des Modus prüfen |
| `ENABLE_COPY_CHAN_TO_VFO` | Speicherparameter in das VFO kopieren | Temporäre Kopie; ersetzt nicht das Speichern des Kanals |
| `ENABLE_KEEP_MEM_NAME` | Speichernamen bei unterstützten Vorgängen beibehalten | Ziel beim Überschreiben von Kanälen prüfen |
| `ENABLE_FEAT_F4HWN_MEM` | SysInf-Seite zur Flash- und SRAM-Nutzung | Programm-Speicherinformationen, keine Kanalerweiterung oder EEPROM |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | Betriebszustand beim Einschalten wiederherstellen | Kann Scan/Spektrum fortsetzen; vor Tests prüfen |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | Aktion zum Zurücksetzen von VFO-Parametern | Entspricht weder dem Wiederherstellen der Kalibrierung noch aller Daten |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | RX/TX-Aktivitätsprotokoll im externen Flash | Datenschutz, Speicherverbrauch und Formatkompatibilität beachten |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | Ringspeicher-Wiederverwendung des Protokolls bei vollem Speicher | Kann alte Einträge ersetzen; bei Bedarf vorher exportieren |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | Zugriff/Darstellung des RF Log durch K5Viewer-Tools | Kompatible Toolversion und kompatibles Protokoll erforderlich |

## Oberfläche, Display und Energie

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_BIG_FREQ` | Große Frequenzdarstellung | Verringert je nach Layout den Platz für andere Daten |
| `ENABLE_SMALL_BOLD` | Kleine Fettschrift | Ändert die Lesbarkeit, keine Kanalparameter |
| `ENABLE_CUSTOM_MENU_LAYOUT` | Benutzerdefinierte Reihenfolge/Anordnung der Menüs | Menünummern sind zwischen Builds keine stabile Referenz mehr |
| `ENABLE_BOOT_BEEPS` | Einschalt-Töne | Lautstärke und Kopfhörer prüfen |
| `ENABLE_VOICE` | Sprachhinweise der Basis | Keine bestimmte Sprache oder vollständige Menüabdeckung annehmen |
| `ENABLE_SHOW_CHARGE_LEVEL` | Akkuladestand anzeigen | Schätzung; kein Nachweis für Kapazität oder Ladegerätezustand |
| `ENABLE_REVERSE_BAT_SYMBOL` | Alternative Ausrichtung/Darstellung des Batteriesymbols | Nur Anzeige |
| `ENABLE_PWRON_PASSWORD` | Zugriffskontrolle beim Einschalten | Risiko, sich auszusperren; verschlüsselt den Speicher nicht und ersetzt keine physische Sicherheit |
| `ENABLE_FEAT_F4HWN_CTR` | Kontraststeuerung | SetCtr auf das konkrete Display einstellen |
| `ENABLE_FEAT_F4HWN_INV` | Display invertieren | Anzeigeeinstellung |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | Sichtbare RX/TX-Zähler | Keine Sendebegrenzung; die Begrenzung wird über TOT konfiguriert |
| `ENABLE_FEAT_F4HWN_SLEEP` | Deep Sleep/Abschaltung bei Inaktivität je nach Firmware | SetOff vor längeren Sitzungen prüfen |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | Behandlung/Anzeige des USB-C-Ladens je nach Platine und Firmware | Ändert die Ladeelektronik nicht und macht einen beschädigten Akku nicht sicher |
| `ENABLE_FEAT_F4HWN_LOGO` | F4HWN-Startlogo/-Oberfläche | Belegt nicht die Herkunft eines Images |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | Logo/Darstellung im Bildschirmschoner | Kann das SetSav-Menü beeinflussen |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | Menüs nach Kategorien gruppieren | Positionen ändern sich gegenüber der klassischen Liste |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | Auswahl von Aktionen/Shortcuts | Kurze/lange Zuordnungen prüfen, um versehentliches TX zu vermeiden |
| `ENABLE_FEAT_F4HWN_QRCODE` | QR-Codes für Informationen/Links | Links zu öffnen gehört nicht zur Sicherung und zertifiziert keine Datei |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | Mit externem Viewer kompatibler Bildschirm/Steuerung | Diese Website implementiert nicht alle Viewer-Funktionen |
| `ENABLE_FEAT_F4HWN_GAME` | Eingebautes Spiel in einem unterstützenden Profil | Belegt Flash/RAM; nicht mit Labs-Spiel-Apps verwechseln |
| `ENABLE_FLASHLIGHT` | Taschenlampen-/LED-Funktion der Hardware | Ändert das Funkgerät nicht und ist kein universelles Bootloader-Modussignal |

## TX, Übertragung und Regionalprofile

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_VOX` | Sprach-/audiogesteuerte Übertragung | Empfindlichkeit anschließend konfigurieren; in beiden ausgelieferten Bricohams-Builds OFF |
| `ENABLE_TX1750` | 1750-Hz-Zugriffston erzeugen | Nur wenn das System ihn erfordert und du die Berechtigung hast |
| `ENABLE_DTMF_CALLING` | DTMF-Ruf-/Identifikationslogik | Nicht mit DMR gleichzusetzen; IDs und Zeiten mit dem Gegenüber konfigurieren |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | CTCSS-Tonende phasenbezogen behandeln | Nur wenn Empfänger/Repeater es verwenden; keine Verschlüsselung |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | Ändert die niedrigen/mittleren Leistungsziele der Basis | Mit Instrumenten prüfen; nicht als universelle Kalibrierung verwenden |
| `ENABLE_AIRCOPY` | AirCopy-Übertragungsfunktion | Kompatibilität beider Endgeräte erforderlich; kopiert nicht den vollständigen MCU dieser Website |
| `ENABLE_AIRCOPY_UART` | Übertragungsvariante über UART | Kabel/Protokoll und Firmware müssen übereinstimmen |
| `ENABLE_AIRCOPY_FLASH` | AirCopy-Funktionen für Flash | Erweiterte Datenoperation; keine sichere Wiederherstellung zwischen Revisionen annehmen |
| `ENABLE_FEAT_F4HWN_PMR` | PMR-bezogenes Profil/Einschränkungen | Zertifiziert weder Antenne noch Leistung noch Funkgerät für einen lizenzfreien Dienst |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | Regionale Profile für US-Bänder/-Dienste | Gesetzliche Anforderungen hängen von Dienst und Gerät ab; nicht universell anwendbar |
| `ENABLE_FEAT_F4HWN_CA` | Profil für kanadische Bandgrenzen der Basis | Nicht mit Carrier Aggregation oder zusätzlichem Empfänger verwechseln |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | RescueOps-Oberflächen-/Betriebsprofil | Autorisiert keine professionellen Frequenzen und macht das Gerät nicht zu einer zertifizierten Sicherheitsvorrichtung |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | RX-Signalsuche mit Dämpfung/Verlauf | Nicht identisch mit zeitgesteuerter ARDF-Firmware oder GPS-Ortungsgerät |
| `ENABLE_FEAT_F4HWN_BEACON` | Eingebaute Morse-Bake | Kann automatisch senden; bis zu einer gesetzeskonformen, kontrollierten Konfiguration deaktiviert lassen |
| `ENABLE_FEAT_F4HWN_BEAM` | Beam-Übertragung von Kanal-/VFO-Parametern über Pakete der Basis | Das untersuchte Payload enthält Frequenz, Offset, Töne, Modus und Namen. Kompatible Endgeräte/Protokolle erforderlich; keine Richtantenne oder APRS |
| `ENABLE_F_CAL_MENU` | Menü zur Kalibrierung der RF-Referenz | Instrumente und Verfahren erforderlich; nicht aktivieren, um USB-Probleme zu lösen |

## Weitere Parameter, keine booleschen Optionen

### Historische Optionen oder nicht im aktuellen Formular verfügbar

Ihre Existenz ist durch Presets nach Commit belegt und bedeutet keine aktuelle
Unterstützung. Bei alten, nicht auf Hardware geprüften Funktionen bleibt der
Zweck des Codes erhalten, ohne spekulative Bedienungsfolgen anzugeben.

| Option | Erklärung | Vorsicht/nachträgliche Konfiguration |
| --- | --- | --- |
| `ENABLE_ALARM` | Alarmfunktion der historischen Basis | Kann je nach Implementierung Audio oder TX erzeugen; nicht zum Testen eines Ports oder als Notsystem aktivieren |
| `ENABLE_AM_FIX` | AM-Verstärkungs-/Empfangskorrekturen historischer Zweige | Wandelt TX nicht in AM um und verbessert nicht alle RF-Bedingungen |
| `ENABLE_AM_FIX_SHOW_DATA` | Sichtbare Diagnose der AM-Korrektur | Entsprechende Funktion erforderlich; keine automatische Kalibrierung |
| `ENABLE_BLMIN_TMP_OFF` | Temporäre Behandlung minimaler Hintergrundbeleuchtung in Zweigen, die dies enthalten | Tasten-/Energiesparlogik dieser Version prüfen; beeinflusst die Empfindlichkeit nicht |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | TriVFO-Systemdienst des Overlays in Presets, die ihn deklarieren | Im Webkatalog nicht verfügbar; weder drei physische Empfänger noch Kompatibilität mit Apps anderer Releases annehmen |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | Kanal-Zurücksetzen in früheren Zweigen | Keine garantierte Entsprechung zu RESET_VFO; Umfang prüfen, bevor Einstellungen verloren gehen |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | Bildschirmaufnahme-Code früherer Versionen | Kann ein anderes Protokoll/Tool als der aktuelle K5Viewer verwenden |
| `ENABLE_NAVIG_LEFT_RIGHT` | Auswahl des Navigationslayouts in historischen Presets | Nicht ohne Prüfung der Migration in Versionen mit SetNav übernehmen |
| `ENABLE_REGA` | Historische Test-/Alarmsignalisierung für das REGA-Notfallnetz mittels ZVEI-Tönen | Kann automatisch TX auslösen. Nicht auf Notfallfrequenzen testen oder routinemäßig Tasten zuweisen; Genehmigung und Betriebsverfahren des Dienstes erforderlich |
| `ENABLE_TX_WHEN_AM` | Ermöglicht einen TX-Pfad, während im historischen Basiscode der AM-Empfangsmodus gewählt ist | Garantiert weder AM-Ausgangsmodulation noch gesetzliche Berechtigung; nicht für TX im Flugfunk oder anderen Diensten aktivieren |

### Identitäts- und Werkzeugparameter

| CMake-Parameter | Bedeutung | Behandlung hier |
| --- | --- | --- |
| `CMAKE_BUILD_TYPE` | Konfigurationsebene der Kompilierung | Lokaler Builder: Release |
| `TARGET` | Name der ausführbaren Datei/des Artefakts | Lokaler Builder: bricohams; nicht automatisch ein Hardwareziel |
| `EDITION_STRING` | Angezeigte Identität der Edition | Bricohams im lokalen Builder, Upstream-Protokollidentität bleibt erhalten |
| `VERSION_STRING_1/2` | Angezeigte Versionen der Komponenten | Nicht zur Umgehung der Validierung ändern |
| `AUTHOR_STRING`, `AUTHOR_STRING_1/2` | Upstream-Zuordnung und -Identität | Hinweise und Kompatibilität beibehalten; keine fremde Urheberschaft beanspruchen |
| `SQL_TONE` | Von der Basis in bestimmten Konfigurationen verwendeter Parameter | Nicht über --option verfügbar; keine SA818-Rezeptur auf einem normalen Funkgerät ändern |
| `SOURCE_DATE_EPOCH` | Reproduzierbarer Build-Zeitpunkt | Wird im lokalen Builder auf den Commit gesetzt; stellt nicht die Funkgeräte-Uhr ein |

Diese beliebigen Werte sind im lokalen Builder nicht über `--option` zulässig.
Die boolesche Liste/Defaults und die Bedeutung von „nicht vorhanden“ stehen in
[der generierten Matrix](F4HWN-PRESETS.md).

## Eine Kombination überprüfen

1. Version und Preset als Einheit auswählen, keine Flags aus einem anderen Commit kopieren.
2. Nur das Erforderliche ändern und den Antrag dokumentieren.
3. Kompilieren und Fehler zu Abhängigkeiten, RAM, Flash und RAM-Isolation beheben.
4. Binary, Metadaten, Map und SHA256SUMS prüfen.
5. Slot vorbereiten, ohne zu schreiben; prüfen, ob der Inspector ihn akzeptiert.
6. Kontrollierter physischer Test mit Original-Sicherung und bekanntem Wiederherstellungsverfahren.

Eine erfolgreiche Kompilierung beweist weder RF-Funktion noch Fehlerfreiheit oder
Datenkompatibilität mit allen Firmwareversionen aus der Historie.

## Quellen

- [Presets des Katalogs v6.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [Untersuchtes CMake der v6.1-Funktionen](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/CMakeLists.txt).
- [Speicherinformationen in SysInf](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [Untersuchtes Beam-Payload](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/app/beam.c).
- [Historisches REGA-Modul, Referenz zum Zweck](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/App/app/rega.c).
- [README und Handbücher des Upstream-Projekts](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- Versionierter Katalog `f4hwn-options.js` und Builder `scripts/build-bricohams.cjs`
  dieses Repositorys.
