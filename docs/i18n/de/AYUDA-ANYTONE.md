# AnyTone und lokale Kanäle – Hilfe

Diese Seite beschreibt den AnyTone-Beta-Webvorbereiter. Er ersetzt nicht das offizielle CPS und programmiert das Funkgerät nicht über USB. JSON- und CSV-Projekte sind eigene Austauschformate: Es sind keine RDT-Dateien und sie dürfen nicht als native Codeplugs direkt im CPS geladen werden. Erstelle mit dem CPS des Herstellers eine Originalkopie, bevor du etwas schreibst.

## Funktionen und Modi

Wähle ein Modellprofil und bestätige separat die Fähigkeiten, die du im Handbuch der genauen Variante geprüft hast. Familienprofile bescheinigen keine Merkmale aller Revisionen. Flugfunk-AM und kommerzielles FM 87.5-108 MHz werden nur für das Profil "Otro" nach manueller Bestätigung freigeschaltet. Prüfe, ob der Empfänger das Band und den Modus unterstützt; eine akzeptierte Frequenz belegt nicht, dass die Hardware sie empfangen kann.

Alle Kanäle sind nur für den Empfang. AM benötigt RF-Frequenzen in MHz, nicht die Flugfunk-Kanalbezeichnung 8.33 kHz; der Vorbereiter prüft das darstellbare Raster. Es werden keine Sendungen angelegt und weder Antennen-, Filter-, Firmware- noch CPS-Kompatibilität bescheinigt.

## Flughäfen und Flugfunkband

Der Benutzer stellt lokal ein JSON mit `results` (1-4000 Zeilen) bereit. Jeder Datensatz enthält `name`, `frequencyMHz` und `source` mit einem Verweis auf ein aktuelles AIP. Zum Filtern nach Nähe können `latitude` und `longitude` enthalten sein; wenn du einen Standort auswählst, bittet der Browser um Erlaubnis und verwendet ihn lokal im Arbeitsspeicher, ohne Koordinaten an einen Dienst zu senden. Datensätze ohne Koordinaten oder außerhalb des gewählten Radius werden ausgelassen. Ohne Standort wird die gesamte Liste verarbeitet.

Rufe die RF-Frequenzen und aktuellen Dienste im [AIP ENAIRE](https://aip.enaire.es/) ab. Es gibt keine landesweite Frequenzdatenbank, Daten werden nicht automatisch heruntergeladen und 8.33-kHz-Kanalbezeichnungen werden nicht umgerechnet. Die App bietet 121.500 MHz als manuelle Option, nur RX; prüfe Verfahren und Aktualität in offiziellen Quellen. Verwende die Notfrequenz nicht für Routinekommunikation.

## Lokale kommerzielle FM-Sender

Prüfe vor dem Import von Sendern im genauen Handbuch, ob das Gerät kommerzielles FM 87.5-108 MHz empfängt. Erstelle eine lokale Datei mit `results` und den Feldern `name`, `frequencyMHz` (oder `frequency`), `latitude`, `longitude` und `source`. Der Filter verwendet die Entfernung in km zum freigegebenen Standort und den gewählten Radius (1-500 km). Es gibt keinen vorinstallierten landesweiten Katalog und kein Scraping; nutze eine autorisierte, aktuelle und für deine Region geeignete Quelle. Die Anwendung bescheinigt weder die Lizenz noch die Richtigkeit der bereitgestellten Daten.

Die resultierenden Kanäle werden in der Austausch-CSV als `FM_Broadcast_RX` markiert, mit identischem nominalem RX und TX sowie gesperrtem TX im Editor. Diese Markierung schaltet keine Übertragung frei und macht die CSV nicht zum AnyTone-Format. Für kommerzielle Kanäle muss die Fähigkeit im JSON-Projekt bestätigt werden; sie lassen sich nicht mit einem Profil eines Funkgeräts öffnen, für das diese Bestätigung fehlt.

## Repeater und REMER

Es lassen sich autorisierte lokale Daten von RadioID, URE und RepeaterBook gemäß dem vom Editor erwarteten Format importieren. Analoge Töne bleiben als Hinweis zur Prüfung erhalten; sie werden nicht aus der Frequenz abgeleitet oder programmiert. Prüfe im CPS Aktualität, Ablage, CC, TS, TG, Kontakte, Empfangslisten und Modellgrenzen.

Der REMER-Tab ist in den kompatiblen Planern von Quansheng und OpenGD77 verfügbar. Seine VHF-Tabelle ist eine Abschrift der vom Benutzer bereitgestellten Referenz ohne überprüfbares Datum; gleiche jeden Eintrag mit REMER ab. CTCSS werden als Hinweis angezeigt und nicht als Einstellungen importiert. HF/SSB-Frequenzen sind vom Import in FM-Speicher ausgeschlossen. Wenn ein Parser einen Kanal erneut einliest, bestätigt das nur die Dateistruktur: Es belegt weder Aktualität noch RF-Empfang noch Sichtbarkeit in der Firmware nach einem Schreibvorgang.

## Speichern und prüfen

Im Editor kannst du Kanäle im lokalen Projekt hinzufügen, ändern und löschen. Exportiere JSON, um die Arbeit zu erhalten, und CSV nur als Referenz oder für den manuellen Austausch. Beim Import von OpenGD77- oder Quansheng-Binärdateien werden nur erkannte Felder übernommen; herstellerspezifische Parameter, Töne, Zonen und Kontakte musst du im CPS des Zielgeräts möglicherweise neu aufbauen. Die abschließende Prüfung, Umwandlung in das native Format und das Schreiben erfolgen im offiziellen CPS, nachdem du das Ergebnis geprüft und eine unveränderte Kopie gespeichert hast.