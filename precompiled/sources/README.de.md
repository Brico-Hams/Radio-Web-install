# Lokale Firmwarequellen

[Español](README.md) · [English (US)](README.en.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Diese Pakete enthalten die Quellen, Lizenzen und Hinweise ihrer Ursprungsprojekte. Es handelt sich weder um Werksfirmware noch um Speichersicherungen eines Funkgeräts.

| Datei | Herkunft | Commit |
| --- | --- | --- |
| `f4hwn-fusion-v6.1.0-source.zip` | https://github.com/armel/uv-k1-k5v3-firmware-custom | `f556a96e73c3e423a00cf473aeb37f827cac05a5` |
| `ardf-v05-source.zip` | https://github.com/reald/uv-k1-k5v3-firmware-custom | `e2bb5b011f39b8c2777a21206086dd556b0e9e2d` |

Die ZIP-Dateien sind Exporte der angegebenen Commits ohne Git-Metadaten oder Buildverzeichnisse. Um den lokalen Fusion-Stand zu reproduzieren, dessen ZIP entpacken und `fusion-local-settings.patch` vom Wurzelverzeichnis aus anwenden:

```sh
git apply fusion-local-settings.patch
```

Der Patch erhält die lokalen ARDF-Einstellungen für Navigation, Schrittweite und AM-Modus; er wird bei der Installation eines Images nicht automatisch angewendet. Bricohams-Module und Buildwerkzeuge liegen in `firmware/bricohams` und `scripts` im Hauptrepository. Der Katalog verteilbarer Images steht mit Hashes und Herkunft je Image in `precompiled/catalog.json`.

Mit `SHA256SUMS` lassen sich Pakete und Patch überprüfen. Originallizenzen und Namensnennungen bleiben gültig. Lokale Klonverzeichnisse sind von Git ausgeschlossen, um Verweise auf verschachtelte Repositories zu vermeiden, die beim Klonen dieses Projekts nicht wiederhergestellt würden.
