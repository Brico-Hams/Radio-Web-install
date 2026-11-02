# Anleitung Yaesu FTX-1: Speicher und Einstellungen

Der Web-Editor FTX-1 Beta liest, bearbeitet, kopiert und schreibt die Speicher
und die Menüeinstellungen des Yaesu FTX-1 im Browser, über den USB-CAT-Port und
Web Serial. Er verwendet nur die Befehle aus dem offiziellen Yaesu-Handbuch
„CAT Operation Reference Manual“ des FTX-1. Er ersetzt weder ADMS noch die
Yaesu-Software und sendet keine Daten an Server.

## Voraussetzungen und Verbindung

- Chrome oder Edge auf `localhost` oder über HTTPS (Web Serial).
- MAIN-Firmware 1.08 oder neuer: Laut Handbuch funktioniert CAT mit älteren
  Versionen nicht.
- USB-C-Kabel zum Funkgerät. Windows zeigt zwei Ports „Silicon Labs Dual
  CP210x“; sowohl der `Enhanced COM Port` (CAT-1) als auch der `Standard COM Port`
  (CAT-2) funktionieren.
- Schließe vor dem Verbinden alle anderen CAT-Programme (WSJT-X, Logbücher,
  cat-ftx1).
- Geschwindigkeit: `CAT-1 RATE` oder `CAT-2 RATE` je nach Port (Werkseinstellung
  38400 und 4800 bps). Ein echtes FTX-1 antwortete über CAT-2 mit 4800 bps.

Beim Verbinden sendet die Seite `ID;` und verlangt die FTX-1-Antwort `ID0840;`.
Danach sendet sie `AI0;`, um die automatische Information während der Arbeit
abzuschalten.

## Speicher

„Speicher lesen“ fragt die gewählten Kanäle (1-999) mit `MR` und den Namen mit
`MT` ab. Ein leerer Kanal antwortet `?;` und wird als frei angezeigt. Bearbeitbar
sind:

| Feld | Befehl | Werte |
|---|---|---|
| Frequenz | `MW` | 0.030000-470.000000 MHz |
| Betriebsart | `MW` | LSB, USB, CW-U, CW-L, FM, FM-N, AM, AM-N, RTTY, DATA, PSK, C4FM |
| Ton | `MW` | OFF, CTCSS ENC/DEC, CTCSS ENC, DCS, PR FREQ, REV TONE |
| Ablage | `MW` | Simplex, + oder - |
| Name | `MT` | Bis zu 12 ASCII-Zeichen |

Der Clarifier bleibt wie gelesen erhalten. Subtonfrequenz, DCS-Code und
Ablagebreite sind nicht Teil von `MR`/`MW`: Es sind globale FM-Menüeinstellungen
(`TONE FREQ`, `DCS CODE`, `RPT SHIFT(144MHz)`, `RPT SHIFT(430MHz)`), die du im
Abschnitt Einstellungen ändern kannst. Es gibt keinen dokumentierten Befehl zum
Löschen eines Kanals: Ein belegter Kanal kann auf der Webseite nicht geleert
werden.

„Kanal kopieren“ dupliziert einen Kanal an eine andere Position im Editor. „CSV
exportieren“ erzeugt eine CSV-Datei mit CHIRP-Spalten; „CSV importieren“
akzeptiert CHIRP- oder OpenGD77-CSV mit FM-Kanälen und legt sie ab dem gewählten
Startkanal ab. Die Töne der Quelle gehen beim Import verloren: Prüfe sie vor dem
Schreiben.

## Geräteeinstellungen (Menü)

Die Tabelle wird mit `scripts/build-ftx1-menu.py` aus Tabelle 3 (MENU Chart) des
Handbuchs erzeugt. Jede Einstellung wird mit `EX` gelesen und mit demselben
Befehl geschrieben, unter Einhaltung der Stellenzahl und der dokumentierten
Werte. Im Handbuch mit „-“ markierte Punkte werden nicht angeboten. Nur lesbar
bleiben Einstellungen, die die CAT-Verbindung trennen können (CAT-Raten, -Timer
und -Stoppbits, TUN/LIN-Port), der Referenzabgleich `REF FREQ ADJ`, das feste
APRS-Ziel und der Bluetooth-Status.

## Sicherung, Simulation und Schreiben

Das Schreiben bleibt gesperrt, bis in derselben Sitzung drei Schritte erledigt
sind:

1. Vom Funkgerät lesen.
2. Die JSON-Sicherung dieses Lesevorgangs herunterladen (`bricohams-ftx1-backup`).
3. „Schreiben simulieren“ drücken und die Differenztabelle prüfen.

Es werden nur geänderte Kanäle oder Einstellungen gesendet. Jeder Wert wird
zurückgelesen und mit dem Gesendeten verglichen; antwortet das Gerät `?;` oder
mit einem anderen Wert, stoppt das Schreiben und nennt Kanal oder Einstellung.
Zum Rückgängigmachen lade die JSON-Sicherung mit „JSON-Sicherung
wiederherstellen“, simuliere und schreibe erneut.

## Grenzen

- Nur Speicherkanäle 1-999. PMS, 5 MHz, Notrufkanal und Split-Speicher (`MZ`)
  werden nicht bearbeitet.
- Die README von cat-ftx1 weist darauf hin, dass manche echten FTX-1-Antworten
  vom Handbuch abweichen. Teste zuerst mit einem freien Kanal und behalte immer
  die Sicherung.
- Im Handbuch mit „-“ markierte Betriebsarten (etwa der Code `0`, den manche
  echten Kanäle verwenden) werden gelesen und angezeigt, aber nie geschrieben:
  Wähle vorher eine andere Betriebsart.
- Das Yaesu-Handbuch wird mit diesem Projekt nicht verteilt.
