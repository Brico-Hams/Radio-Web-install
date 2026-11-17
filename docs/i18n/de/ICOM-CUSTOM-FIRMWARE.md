# Icom IC-705 und IC-9700 Custom-Firmware (Transverter)

Die Icom-Seite dieser Anwendung bereitet die Custom-Firmware von Dawid SQ6EMM für das Icom IC-705 (E/J, v1.40) und das IC-9700 (E, v1.50) vor. Sie ist für Mikrowellen-Transverter gedacht. Sie ist kein Icom-Produkt und nicht mit Icom verbunden: Es ist ein Projekt der Amateurfunk-Community unter MIT-Lizenz. Bricohams hat sie auf KEINEM Funkgerät getestet.

Die Firmware wird nur als Patch verteilt. Du lieferst die offizielle Icom-Datei `.dat`, der Browser wendet den Patch auf deinem Rechner an und du erhältst eine `.dat`, die du mit dem normalen SD-Karten-Updateverfahren installierst. Nichts wird auf einen Server hochgeladen, und das Funkgerät wird NICHT über USB oder Web Serial programmiert.

## Was die Firmware kann

- Transverter: 8 Plätze (`TRV1` bis `TRV8`), mit der echten HF-Frequenz im Display und über CI-V bis 122 GHz.
- Pro Transverter: maximale Sendeleistung, Sendeverzögerung (bis 300 ms, alle Betriebsarten) und, beim IC-9700, PTT-Sperre.
- IC-9700: unabhängiger aktiver Transverter für MAIN und SUB, der MAIN/SUB-Tausch behält ihn bei, und im SAT-Modus folgen die Sendeeinstellungen dem SUB-Transverter.
- Skala für Spektrum und Wasserfall mit 10, 6, 3 oder 1 dB pro Teilung, mit automatisch verankertem Rauschpegel.
- IC-705: erweiterte Sendebereiche und Senden auf 4 m (70 MHz) in der E-Basis; die J-Variante erweitert 1.6-54, 68-74.8, 118-174 und 400-470 MHz. Sende nur dort, wo deine Lizenz es erlaubt.
- Apps von der SD-Karte: MENU, SET, Apps.
- Eigener A/B-Bootloader mit Rückfall auf den anderen Firmware-Block.
- Der Startbildschirm nennt Dawid SQ6EMM als Autor der Firmware; der Versionstext des Funkgeräts bleibt offiziell.

## Unterstützte Dateien

Der Browser berechnet den MD5 der gewählten Datei und vergleicht ihn mit dieser Liste (`docs/patches/index.json` des Projekts). Es werden nur unveränderte offizielle Dateien akzeptiert.

| Funkgerät | Offizielle Datei | Eingabe-MD5 | Release | Ausgabe-MD5 |
| --- | --- | --- | --- | --- |
| IC-9700 E 1.50 | `9700E150.dat` | `6f04fd2248ba39254ed01b30b52ce36a` | `20261113v3` | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 E 1.40 | `705E140.dat` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `20261113v1` | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 J 1.40 | `705J140.dat` | `b605171288db4a74e0992a8f2afcb1c3` | `20261113v1` | `d7a7f87b9b16f262b188fe3735b3682b` |

Die Ausgabedatei behält den Namen des Releases, zum Beispiel `9700E150_20261113v3.dat`. Die Seite bietet den Download nur an, wenn der MD5 des Ergebnisses genau dem des vom Autor getesteten Builds entspricht.

## Wie der Container funktioniert

Die Icom-Datei `.dat` ist ein Container mit mehreren Schichten. Der Patch macht sie rückgängig, ändert das Image und schließt sie wieder:

1. Autokey-Transformation: Der Inhalt ist mit einem von den Daten selbst abhängigen Schlüssel verschleiert und wird Byte für Byte dekodiert.
2. LZSS-Kompression: Das Firmware-Image ist komprimiert; es wird zum Patchen entpackt und am Ende wieder komprimiert.
3. MD5-Siegel: Der Container endet mit dem MD5 seines Inhalts, der nach dem Patch neu berechnet wird.
4. Erster Bootstrap an Adresse `0x10000`, wo der eigene A/B-Bootloader installiert wird.

Der Patch ist eine JSON-Datei mit Operationen der Art N Bytes von Adresse X des offiziellen Images kopieren, plus dem neuen Code des Projekts. Da er nur Anweisungen und eigenen Code enthält, steckt kein Byte der Icom-Firmware darin: Deshalb braucht er deine offizielle Datei. Bevor das Ergebnis angeboten wird, prüft die Seite, dass Eingabe-MD5 und Ausgabe-MD5 den erwarteten entsprechen.

## A/B-Bootloader

Die Firmware hält zwei Blöcke (A und B). Startet die neue nicht oder willst du zur vorherigen zurück, lässt dich der Bootloader den anderen Block wählen:

- IC-9700: POWER gedrückt halten, während die DC-Versorgung angeschlossen wird, etwa 5 s.
- IC-705: POWER beim Einschalten gedrückt halten, bis die LED blinkt, etwa 3 s.

Bewahre immer die offizielle Datei auf: Ihre Neuinstallation bringt das Funkgerät zur Werksfirmware zurück.

## Installation per SD-Karte

1. Lade die offizielle `.dat` für dein Funkgerät und deine Version von Icom herunter (siehe Tabelle) und verändere sie nicht.
2. Wähle auf der Icom-Seite diese Datei aus oder ziehe sie hinein, warte auf die Erkennung und drücke die Schaltfläche zum Vorbereiten der Firmware.
3. Lade die entstandene `.dat` herunter, sobald die Seite bestätigt, dass der MD5 übereinstimmt.
4. Kopiere die Datei gemäß dem Firmware-Updateverfahren im Icom-Handbuch deines Funkgeräts auf die SD-Karte.
5. Aktualisiere das Funkgerät mit diesem Verfahren und warte, bis es fertig ist, ohne die Stromversorgung zu trennen.
6. Prüfe den Startbildschirm und kontrolliere das Transverter-Menü.

## Alternative ohne Browser

Das Projekt enthält ein Kommandozeilenwerkzeug, das dasselbe ohne Browser tut: `third_party/icom-custom-firmware/icom_patch.py`. Es läuft mit Python 3, zum Beispiel `python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat`, im Projektordner. Das Ergebnis muss denselben Ausgabe-MD5 wie die Tabelle haben. Der Browser-Test des Projekts wird mit `npm run test:icom-upstream` gestartet.

## Neues Release hinzufügen

Releases werden in `releases.json` des Originalprojekts deklariert. Um ein neues zu veröffentlichen, wird der JSON-Patch in `patches/` erzeugt und der Index mit `tools/build_index.py` neu erstellt, der `docs/patches/index.json` schreibt. Danach kopierst du Patch und Index nach `third_party/icom-custom-firmware/docs/patches/` und trägst den neuen Patch in die Liste der erlaubten Dateien von `server.cjs` ein. Diese mitgelieferte Kopie wird nicht von Hand bearbeitet: Sie wird aktualisiert, indem ein neuer Commit des Originalprojekts übernommen wird.

## Sicherheit

- Es ist inoffizielle Firmware: Sie kann das Funkgerät unbrauchbar machen und die Icom-Garantie erlöschen lassen.
- Sende nur auf Frequenzen und mit Leistungen, die deine Lizenz erlaubt. Das IC-705 erweitert die Sendebereiche, und der richtige Umgang damit liegt in deiner Verantwortung.
- Prüfe Sendeverzögerung und Leistung jedes Transverter-Platzes mit einer Kunstlast, bevor du einen Transverter oder eine Antenne anschließt.
- Es werden nur unveränderte offizielle Dateien akzeptiert, und die Ausgabe muss dem getesteten MD5 entsprechen.
- Bewahre die offizielle Datei und die SD-Karte zum Zurückgehen auf und trenne während des Updates nicht die Stromversorgung.

## Lizenz und Namensnennung

Basiert auf icom-custom-firmware von Dawid SQ6EMM (MIT-Lizenz). Repository: [icom-custom-firmware](https://github.com/sq6emm/icom-custom-firmware). Webseite des Patchers: [web patcher](https://sq6emm.github.io/icom-custom-firmware/). Forenthread: [mikrofale.cafe](https://mikrofale.cafe/showthread.php?tid=1296). Der Text der MIT-Lizenz steht in `third_party/icom-custom-firmware/LICENSE` und wird zusammen mit der Anwendung veröffentlicht.

## Wo es in diesem Repository liegt

- `icom.html` und `icom-ui.js`: die Seite und ihre Logik.
- `third_party/icom-custom-firmware/`: unveränderte Kopie des Originalprojekts beim Commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`.
- `third_party/icom-byof/`: unveränderte Kopie der Reverse-Engineering-Dokumentation beim Commit `a91231f64e8afbe34353994786e8276a3b54f1a9`. Mehr Details in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) und [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md).
- `tests/icom.test.cjs`: Tests der Seite und der ausgelieferten Dateien.

Bricohams hat diese Firmware NICHT auf einem echten Funkgerät getestet. Die automatischen Tests prüfen nur die Seite und die veröffentlichten Dateien; die Validierung des Patches stammt vom ursprünglichen Autor.
