# Egzumer: Quellen, Konfiguration und Unterschiede zu V3

Revision: 25-10-2026. Untersuchte Quelle:
`egzumer/uv-k5-firmware-custom`, Commit
`7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3`.

## Was dieses Repository bietet

Es veröffentlicht C-Code, Header, Makefile und Dokumentation einer Neuimplementierung der Quansheng-UV-K5/K6/5R-Firmware für die ursprüngliche Familie. Die README erläutert die Herkunft von DualTachyon, Änderungen von OneOfEleven und dem Analysator fagci. Diese Basis ist nicht der PY32-Port für UV-K5 V3/UV-K1.

Die Datei LICENSE enthält die **Apache License 2.0**, nicht MIT. Bewahre beim Ableiten von Code die Hinweise und Zuschreibungen auch für die Komponenten auf. Egzumers Lizenz belegt nicht, dass ein anderes Karina genanntes Image dieselbe Lizenz hat oder dass die exakten Quellen dieser Binärdatei verfügbar sind.

## Hardware und Verwendung auf dieser Website

| Aspekt | Original Egzumer | F4HWN PY32 auf dieser Website |
| --- | --- | --- |
| Familie | Ursprüngliche Plattform UV-K5 V1 / DP32 | UV-K5 V3 / UV-K1 PY32 |
| Build-System | Makefile und 0/1-Flags | CMake und Optionen pro Preset |
| Analysator | fagci-Basis mit Egzumer-Änderungen | Port und Änderungen je Version |
| Speicher/Daten | Speicherplan seiner Firmware | Keine Gleichwertigkeit wird vorausgesetzt |
| Armel v6 Multiboot | In dieser Basis nicht als Funktion dokumentiert | Projektspezifische Erweiterung für PY32 |
| Vorbereitung in Web-Slots | Nicht unterstützt | Nur erkannte und geprüfte Images |

Verwende keinen V1-Flasher und kein originales Egzumer-Image auf einer V3. Die Bezeichnungen K5/K6 auf einem Titelbild belegen nicht die MCU-Revision. Prüfe Platine und Projekt. Der Bricohams-V3-Befehl enthält keinen Egzumer-Compiler.

## Funktionen und Benutzereinstellungen

Die README dokumentiert AM-Korrektur, SSB-Demodulation, Spektrum, schnelles Scannen, Namensbearbeitung, Anzeigemodi, zuweisbare Tasten, Akku, Hintergrundbeleuchtung, Mikrofon und CTCSS/DCS-Suche. SSB bezeichnet hier Empfangsdemodulation; es bedeutet keinen SSB-Sender.

Zu RX/TX, Step, Bandbreite, SQL, Tönen, VOX, TOT und Kanalsperre siehe [gemeinsame Konfiguration](AYUDA-CONFIGURACION.md). Verwende den Menünamen, nicht Zahlen, die von F4HWN v6 oder Karina übertragen wurden. Reihenfolge und Namen wurden gegenüber der Stock-Firmware geändert.

Das offizielle Wiki ist die Referenz für Tastenkombinationen des installierten Builds:

- [Wiki und Handbuch](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
- [Releases](https://github.com/egzumer/uv-k5-firmware-custom/releases).

Nicht alle Tastenkombinationen wurden auf Hardware geprüft und sie werden nicht automatisch auf abgeleitete Firmware übertragen. Die README weist auf Grenzen des Dynamikbereichs, Übersteuerung und Eingangsfilter hin; AM fix kann physikalische Grenzen nicht beseitigen. Eine Antenne mit stärkerem Signal kann den Empfang in einer intensiven RF-Umgebung verschlechtern.

## Build-Optionen des untersuchten Commits

`?=`-Werte des Makefile: Ein Make-Argument kann Standardwerte überschreiben. 0/1 sind weder die ON/OFF-Werte von CMake noch die Menüs des Funkgeräts. Erläuterungen zu gemeinsamen Funktionen findest du in der [F4HWN-Referenz und den historischen Optionen](AYUDA-OPCIONES-F4HWN.md); ein gleicher Name garantiert keine identische Implementierung oder Speicherung.

| Option | Standard | Zweck |
| --- | --- | --- |
| ENABLE_UART | 1 | Konfigurationskommunikation mit PC |
| ENABLE_AIRCOPY | 0 | Kompatible AirCopy-Übertragung |
| ENABLE_FMRADIO | 1 | FM-Rundfunkempfänger |
| ENABLE_NOAA | 0 | NOAA-Wetterfunktionen |
| ENABLE_VOICE | 0 | Sprachansagen |
| ENABLE_VOX | 1 | Audioausgelöstes TX; konfigurieren/deaktivieren, um Unfälle zu vermeiden |
| ENABLE_ALARM | 0 | Alarmfunktion mit möglichen Aussendungen; nicht als Test verwenden |
| ENABLE_TX1750 | 0 | Ton für Repeaterzugang |
| ENABLE_PWRON_PASSWORD | 0 | Einschaltpasswort; verschlüsselt nicht den gesamten Speicher |
| ENABLE_DTMF_CALLING | 1 | DTMF-Ruflogik |
| ENABLE_FLASHLIGHT | 1 | LED/Taschenlampe der Hardware |
| ENABLE_BIG_FREQ | 1 | Frequenz mit großer Schrift |
| ENABLE_SMALL_BOLD | 1 | Kleiner Fettdruck |
| ENABLE_CUSTOM_MENU_LAYOUT | 1 | Alternative Menüanordnung |
| ENABLE_KEEP_MEM_NAME | 1 | Namen beim Bearbeiten eines Speichers beibehalten |
| ENABLE_WIDE_RX | 1 | Empfang erweiterter Bereiche; keine TX-Freigabe |
| ENABLE_TX_WHEN_AM | 0 | TX-Pfad im AM-RX-Modus erlauben; belegt keine AM-Modulation |
| ENABLE_F_CAL_MENU | 0 | Frequenzkalibrierung mit Instrumenten |
| ENABLE_CTCSS_TAIL_PHASE_SHIFT | 0 | Phasenbehandlung des CTCSS-Endtons |
| ENABLE_BOOT_BEEPS | 0 | Starttöne |
| ENABLE_SHOW_CHARGE_LEVEL | 0 | Ladezustand anzeigen |
| ENABLE_REVERSE_BAT_SYMBOL | 0 | Alternative Akkuanzeige |
| ENABLE_NO_CODE_SCAN_TIMEOUT | 1 | Timeout-Verhalten der Codesuche |
| ENABLE_AM_FIX | 1 | AM-Empfangs-/Verstärkungskorrektur |
| ENABLE_SQUELCH_MORE_SENSITIVE | 1 | Empfindlicheres Squelch-Kriterium |
| ENABLE_FASTER_CHANNEL_SCAN | 1 | Schnellere Kanalsuche |
| ENABLE_RSSI_BAR | 1 | Empfangsstärkeanzeige |
| ENABLE_AUDIO_BAR | 1 | Audioanzeige |
| ENABLE_COPY_CHAN_TO_VFO | 1 | Speicher in VFO kopieren |
| ENABLE_SPECTRUM | 1 | Spektrumanalysator |
| ENABLE_REDUCE_LOW_MID_TX_POWER | 0 | Variante für niedrige/mittlere Leistungsziele |
| ENABLE_BYP_RAW_DEMODULATORS | 0 | Erweiterte RAW-Demodulationspfade |
| ENABLE_BLMIN_TMP_OFF | 0 | Zeitweilige Behandlung der Mindestbeleuchtung |
| ENABLE_SCAN_RANGES | 1 | Scanbereiche |
| ENABLE_AM_FIX_SHOW_DATA | 0 | AM-fix-Diagnosedaten |
| ENABLE_AGC_SHOW_DATA | 0 | AGC-Diagnosedaten |
| ENABLE_UART_RW_BK_REGS | 0 | Zugriff auf RF-Register; nicht routinemäßig aktivieren |
| ENABLE_CLANG | 0 | Kompilierung mit Clang in der Projektkonfiguration |
| ENABLE_SWD | 0 | SWD-Debugging-Unterstützung |
| ENABLE_OVERLAY | 0 | Overlay-Speicher dieser Basis, keine Firmware-Slots |
| ENABLE_LTO | 1 | Linker-Optimierung |

In diesem Makefile erzwingt Clang LTO=0; bei LTO=1 wird OVERLAY=0 erzwungen. Diese Regeln gelten für diese Basis und dürfen nicht ohne Analyse auf CMake PY32 übertragen werden. Aktivierte Optionen können Speichergrenzen überschreiten oder Kombinationen brechen; eine vorhandene Option bedeutet nicht, dass alle Kombinationen unterstützt werden.

Zum Kompilieren verwende Toolchain und Verfahren aus der README in einem festgelegten Checkout, bewahre Map, Lizenz und Hashes auf und validiere die V1-Hardware. Egzumer wurde für diese Dokumentation weder kompiliert noch geflasht oder getestet.

## Beziehung zu Karina und Bricohams

Eine Abstammung ähnlicher Funktionen erlaubt nicht, die exakten Quellen von Karina zu rekonstruieren. Auch Treiber und Namen, die Egzumer erwähnen, sind kein Beleg. Bricohams V3 leitet sich derzeit von F4HWN PY32 ab, nicht von diesem ursprünglichen Repository. Ein Bricohams-V1-Projekt wäre ein anderer Build mit eigener Hardwarevalidierung.

## Festgelegte Quellen

- [README des Commits](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/README.md).
- [Makefile des Commits](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/Makefile).
- [Apache-2.0-Lizenz](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/LICENSE).
- [V3-Pack und neue Karina-Evidenz](AYUDA-PACK-DIM0S.md).