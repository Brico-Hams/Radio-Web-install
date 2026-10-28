# Unabhängige Android-Verteilung und F-Droid-Betrieb

[Español](../../FDROID.md) · [English (US)](../en/FDROID.md) · [Français](../fr/FDROID.md) · [Deutsch](FDROID.md)

Anleitung für Betreuer und Nutzer, geprüft am 28. Oktober 2026.
**Lokale Vorbereitung bedeutet weder Veröffentlichung noch Aufnahme in F-Droid.**

## Technologieentscheidung

| Option | Bewertung für Bricohams |
| --- | --- |
| Xamarin / Xamarin.Forms | Verworfen: Microsoft beendete den Support am 1. Mai 2024. Das letzte Xamarin-Android-SDK unterstützt API 34. |
| .NET for Android / .NET MAUI | Aktuelle Alternative für neue C#- oder plattformübergreifende Projekte. Diese App müsste für USB, Audio, GPS, Speicherung und Oberfläche portiert und erneut getestet werden. Die Aufnahme in F-Droid wird dadurch nicht automatisch einfacher. |
| Flutter / React Native | Eine gemeinsame Oberfläche ist möglich, erfordert hier aber Migration und native Radio-/Audio-Brücken. Kein nachgewiesener Vorteil gegenüber dem vorhandenen Code. |
| Natives Kotlin, aktuelle Umsetzung | Empfohlen: direkter Zugriff auf USB Host, Audio und GPS, kleine App, Standardwerkzeuge und vorhandene Tests. Keine Google Play Services, Konten, Werbung oder Telemetrie erforderlich. |

Android bleibt eine eigenständige native Anwendung, kein WebView-Wrapper.
Funkprotokolle werden nicht neu geschrieben. Web und lokale Desktop-Apps
behalten ihre Umsetzung; gemeinsame Marke und Übersetzungen erfordern kein
gemeinsames UI-Framework.

## Vorbereitetes Material und aktueller Stand

- [Rezeptentwurf](../../../fdroid/metadata/org.bricohams.radio.yml) zur Aufnahme
  in **fdroiddata**, keine Debug-APK zum Hochladen in den offiziellen Katalog.
- [Store-Texte](../../../fastlane/metadata/android) auf Spanisch, US-Englisch,
  Französisch und Deutsch mit Marke, Grenzen, Datenschutz und Versionshinweisen.
- [Lokale Prüfung](../../../scripts/check-android-store.cjs) und
  [Tests](../../../tests/android-store.test.cjs) für Versionen, Tags, Sprachen und Längen.
- [Android-CI](../../../.github/workflows/android.yml): Metadatenprüfung,
  Release-Build/Lint und eine **unsignierte Release-APK**, getrennt von
  Debug-APKs. F-Droid baut aus dem Quellcode, nicht aus diesem CI-Artefakt.

Der Entwurf verwendet `0.8.3-beta`, `versionCode 12`. Der vorgeschlagene Tag
`android-v0.8.3-beta` muss mit dieser Vorbereitung noch veröffentlicht werden.
Diese Arbeit hat keinen Aufnahmeantrag gestellt, keine Freigabe erhalten und
kein eigenes F-Droid-Repository eingerichtet. `fdroid build --server` wurde
auf diesem Windows-System nicht ausgeführt. Ein Gradle-Build ersetzt keine
Prüfung durch die F-Droid-Infrastruktur.

## Lokaler Build und Prüfungen

Im Projektstamm in PowerShell mit installiertem JDK 17 und SDK 35:

```powershell
$env:JAVA_HOME=[Environment]::GetEnvironmentVariable('JAVA_HOME','User')
$env:ANDROID_HOME=[Environment]::GetEnvironmentVariable('ANDROID_HOME','User')
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
& "$env:JAVA_HOME\bin\java.exe" -version
npm run check:android-store
node --test tests\android-store.test.cjs
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintRelease :app:assembleRelease
```

Die Variablen müssen auf vorhandene Installationen zeigen. Andernfalls zuerst
JDK 17, Android SDK Platform 35, Platform Tools und Build Tools 34.0.0/35.0.0
einrichten und SDK-Lizenzen akzeptieren. Nach dauerhaften Variablenänderungen
Terminals neu starten. Xamarin nicht installieren oder auswählen. Java 8 in
`PATH` ist für diesen Gradle-Build ungeeignet; der explizite Aufruf prüft das
über `JAVA_HOME` gewählte JDK. Fehlende Node-Abhängigkeiten mit `npm ci` und
der Lockdatei des Projekts installieren.

Ausgabe: [app-release-unsigned.apk](../../../android/app/build/outputs/apk/release/app-release-unsigned.apk).
Die APK ist unsigniert, so nicht installierbar und keine offizielle F-Droid-APK.
Die Build-Konfiguration enthält keine Vertriebsschlüssel oder Passwörter.

Lokal bestanden: 130 Android-Tests, vier Metadatentests, Release-Build und
Lint ohne Fehler (199 Warnungen). Infrastrukturprüfung, Gerätetests und
redaktionelle Freigabe sind separate Schritte.

## Quellcode und Tag veröffentlichen: Betreuer

Diese Befehle **veröffentlichen Änderungen**; die Anleitung hat sie nicht
ausgeführt. Repository-Berechtigungen und Prüfung aller vorgemerkten Dateien
sind erforderlich. Zuerst:

```powershell
git status --short
git diff --check
git diff
git fetch origin
git log --oneline HEAD..origin/main
```

Remote-Änderungen integrieren und Prüfungen wiederholen. Kein erzwungener Push.
Nur geprüfte Dateien mit `git add` vormerken, `git diff --cached` prüfen, dann:

```powershell
git commit -m "Prepare independent Android distribution for F-Droid" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
node scripts\check-android-store.cjs --tag android-v0.8.3-beta
git tag --list android-v0.8.3-beta
```

Existiert der Tag, **anhalten**: nicht löschen oder verschieben. Für eine
andere Version zuerst Version, Code, Rezept und Hinweise aktualisieren.
Dann das Beispiel durch `android-v` plus den genauen `versionName` ersetzen.

```powershell
git push origin main
git tag -a android-v0.8.3-beta -m "Bricohams Android 0.8.3-beta"
git push origin android-v0.8.3-beta
git rev-parse "android-v0.8.3-beta^{commit}"
git ls-remote --tags origin "android-v0.8.3-beta*"
```

Auf geprüftem `main` ausführen, nicht auf einem anderen lokalen Branch.
Aufgelösten SHA für fdroiddata festhalten und den Workflow **Android Beta**
in GitHub Actions prüfen. Ein CI-Fehler blockiert die Auslieferung.
Android-Tags bewahren CI-Artefakte auf; der aktuelle Workflow erzeugt dafür
keine GitHub Release und reicht keinen Antrag bei F-Droid ein.

## Erste Aufnahme in den offiziellen Katalog

1. Geprüfte Quellen und Metadaten veröffentlichen. Der Tag muss diese
   Vorbereitung enthalten, keinen älteren Build ohne Metadaten. Tags nie wiederverwenden.
2. Prüfer mit `--tag android-v0.8.3-beta` oder der tatsächlichen Version nach
   Aktualisierung aller Felder und Hinweise ausführen.
3. Einen **Requests For Packaging**-Antrag oder **fdroiddata**-Vorschlag nach
   dem unten verlinkten Verfahren öffnen. Rezept in `metadata` von fdroiddata kopieren.
4. `commit` des ersten Builds auf den **vollständigen SHA** des veröffentlichten
   Tags festlegen. Der Tag im lokalen Entwurf ist eine Vorbereitungsreferenz;
   F-Droid empfiehlt für den ersten Build einen vollständigen SHA, nicht `main`.
5. Unter Linux mit fdroidserver und Build-Umgebung ausführen:
   `fdroid lint org.bricohams.radio`,
   `fdroid checkupdates org.bricohams.radio` und
   `fdroid build --server org.bricohams.radio:12`. Tatsächliche Scanner-/Build-
   Probleme ohne pauschale Ausnahmen beheben.
6. Lizenzen und Herkunft gemäß
   [NOTICE.txt](../../../android/app/src/main/assets/NOTICE.txt) bereitstellen.
   Weiterverteilungsrechte am Logo bestätigen. Einstufung externer Datendienste
   sowie Anforderungen an Projektalter/Nutzer prüfen. Prüfung, Build-Warteschlange
   und Veröffentlichung liegen bei F-Droid.

Das Rezept entfernt nur historische APKs und nicht benötigte Firmware-Verzeichnisse
aus dem isolierten Build-Checkout. Entwicklerdateien und Nutzersicherungen
werden nicht gelöscht. Keine pauschalen `scanignore`-Regeln oder proprietären
SDK-Downloads innerhalb der App werden hinzugefügt.

## Vom Web unabhängige Aktualisierungen

Web-Tags heißen `v...`, Android-Tags `android-v...`:

```yaml
AutoUpdateMode: Version
UpdateCheckMode: Tags ^android-v[0-9]+[.][0-9]+[.][0-9]+(-beta[0-9]*)?$
```

`UpdateCheckData` liest `versionCode` und `versionName` aus der getaggten
Gradle-Datei. Eine Web-Veröffentlichung löst kein Android-Update aus.

Für jede Android-Veröffentlichung:

1. **`versionCode` immer erhöhen**, etwa von 12 auf 13. Nur `versionName`
   zu ändern ermöglicht kein Update.
2. Vier Store-Texte/Änderungslisten und das lokale Rezept aktualisieren.
   Versionsfelder bleiben in [build.gradle.kts](../../../android/app/build.gradle.kts).
3. Tests, Lint und Prüfer ausführen. Bei USB-/Audio-/TX-Änderungen echte Hardware testen.
4. Unveränderlichen Tag `android-v` plus den exakten `versionName`
   veröffentlichen. Die CI lehnt unpassende Tags ab.
5. **Nach der ersten Aufnahme** erkennt F-Droid Tags und kann Build-Einträge
   erzeugen, kompilieren, signieren und indexieren. Das ist weder sofortig
   noch eine Aufnahmegarantie. SDK-/Abhängigkeits-/Rezeptänderungen können
   manuelle Pflege erfordern.

Bricohams erhält keinen Hintergrund-APK-Downloader oder eigenen Updater.
Der F-Droid-Client prüft und benachrichtigt. Unbeaufsichtigte Installation
hängt von Android, Nutzereinstellungen und Installer-Integration/Berechtigungen
ab; eine normale App kann stille Updates nicht garantieren.

## Signaturen und Daten

Für die erste Aufnahme soll F-Droid seinen Kanal bauen und signieren.
Kein privater Bricohams-Schlüssel muss weitergegeben werden. Ein Upstream-Kanal
mit derselben Signatur würde separat geprüfte reproduzierbare Builds erfordern;
Bit-für-Bit-Reproduzierbarkeit wird hier nicht behauptet.

Aktuelle Debug-APKs und eine zukünftige F-Droid-APK haben verschiedene
Signaturen. **Android kann nicht direkt zwischen diesen Kanälen aktualisieren.**
Kontakte und andere exportierbare Daten vorher exportieren; nicht exportierbare
Einstellungen notieren. Deinstallation löscht lokale App-Daten.
Benötigte Aufnahmen/Exportdateien aufbewahren und die Wiederherstellung vor
dem Entfernen einer wichtigen Installation prüfen. Spätere F-Droid-Versionen
müssen den Schlüssel dieses Kanals behalten.

Die Kennung bleibt `org.bricohams.radio`: keine zweite App, gleichzeitige
Kanalinstallation oder Datenbankänderung wird eingeführt.

## Nutzerinstallation und Abschlussprüfung

Erst nach Veröffentlichung die Repositorys im F-Droid-Client aktualisieren und
**Bricohams**, Kennung `org.bricohams.radio`, suchen. Quellcode-Link und Version
prüfen. Diese Anleitung kündigt keinen bereits verfügbaren Eintrag an.
Keine unbekannten Repositorys hinzufügen oder unsignierte APK installieren.
Bei Signaturkonflikt zuerst exportieren; nicht als ersten Versuch deinstallieren.

Nach Installation/Update Sprache, Design, Logbücher und Wiederherstellung einer
Testsicherung prüfen. Offline-Karte und optional Satellitendaten-Download
prüfen. USB zuerst lesend mit passender Hardware testen. Nicht senden oder
Funkkanäle schreiben, nur um eine Store-Installation zu überprüfen.

## Fehlerbehebung und Abschlussliste

| Problem | Maßnahme |
| --- | --- |
| Gradle verwendet Java 8 oder findet das SDK nicht | `JAVA_HOME`, `ANDROID_HOME`, Installation/Lizenzen prüfen, in neuem Terminal wiederholen. |
| Prüfer lehnt Version, Sprache oder Tag ab | Gradle, Rezept und Hinweise in allen vier Sprachen aktualisieren; Prüfung nicht umgehen. |
| Tag vorhanden, aber kein F-Droid-Update | Erste Aufnahme, Tagfilter, höheren `versionCode`, CI und F-Droid-Build-/Indexstatus prüfen. Tag nicht verschieben, keine Frist versprechen. |
| Scanner blockiert Abhängigkeit oder Ressource | Quelle/Lizenz nachweisen oder tatsächlichen Fehler beheben, keine pauschalen Ausnahmen. |
| Android lehnt Signatur ab | Vor Kanalwechsel Daten exportieren und prüfen; `versionCode` ersetzt keine Signatur. |

Abschluss: Quellen/Tag veröffentlicht, erstes Rezept auf SHA festgelegt, CI
bestanden, F-Droid-Prüfung/Review akzeptiert, Eintrag indexiert, Signatur
beibehalten und Update von einer älteren Version geprüft. Offene Schritte
getrennt festhalten; eine lokale APK erfüllt diese Liste nicht.

## Offizielle Quellen

- [Xamarin-Supportende, Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/xamarin)
- [.NET MAUI, Microsoft](https://learn.microsoft.com/dotnet/maui/what-is-maui)
- [F-Droid-Aufnahmerichtlinie](https://f-droid.org/docs/Inclusion_Policy/)
- [Metadaten und Updates](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Lokalisierte Texte und Grafiken](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots/)
- [Requests For Packaging](https://gitlab.com/fdroid/rfp/-/issues)
- [Offizielle fdroiddata-Rezepte](https://gitlab.com/fdroid/fdroiddata)
