# Sicherheitsrichtlinie

[Español](SECURITY.md) · [English (US)](SECURITY.en.md) · [Français](SECURITY.fr.md) · [Deutsch](SECURITY.de.md)

## Unterstützte Versionen

Nur der neueste Stand des Branches `main`.

## Meldung

Schwachstellen vertraulich über [GitHub Security Advisories](https://github.com/Brico-Hams/Radio-Web-install/security/advisories/new) melden. Für Schwachstellen **kein öffentliches Issue öffnen**.

Beschreibung, Auswirkungen, Reproduktionsschritte und Version/Commit angeben. Niemals Tokens, Funkgerätesicherungen oder echte personenbezogene Daten senden; synthetische Daten verwenden.

## Geltungsbereich

- Erreichbarkeit des Servers außerhalb von `127.0.0.1`, Umgehung der `Host`-Prüfung oder der Dateifreigabeliste.
- XSS oder Umgehung der CSP.
- Schreiben auf das Funkgerät ohne verifizierte Sicherung oder Umgehung der Schreibberechtigung.
- Downloads von nicht erlaubten Hosts oder Weitergabe von `RB_*`-Zugangsdaten an den Browser.

Nicht abgedeckt: nicht unterstützte Netzwerkbereitstellungen (siehe [docs/DEPLOYMENT.md](docs/i18n/de/DEPLOYMENT.md)), Fehler fremder Firmware und Schäden durch externe Werkzeuge.

## Vorgehensweisen

- Keine Telemetrie und kein Hochladen von Funkgerätedaten.
- Minimale Abhängigkeiten, festgelegte Version und `npm ci --ignore-scripts`.
- SHA-256-Sicherungen und bei Fehlern gesperrte Schreibvorgänge (*fail-closed*).
