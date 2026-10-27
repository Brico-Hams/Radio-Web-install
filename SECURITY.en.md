# Security policy

[Español](SECURITY.md) · [English (US)](SECURITY.en.md) · [Français](SECURITY.fr.md) · [Deutsch](SECURITY.de.md)

## Supported versions

Only the latest `main` branch.

## Reporting

Report privately through [GitHub Security Advisories](https://github.com/Brico-Hams/Radio-Web-install/security/advisories/new). **Do not open a public issue** for vulnerabilities.

Include a description, impact, reproduction steps, and version/commit. Never send tokens, radio backups, or real personal data; use synthetic data.

## Scope

- Server exposure beyond `127.0.0.1`, bypassing `Host` validation or the file allowlist.
- XSS or CSP bypass.
- Radio writes without a verified backup, or bypassing write permission.
- Downloads from disallowed hosts or leakage of `RB_*` credentials to the browser.

Out of scope: unsupported network deployments (see [docs/DEPLOYMENT.md](docs/i18n/en/DEPLOYMENT.md)), third-party firmware failures, and damage caused by external tools.

## Practices

- No telemetry or uploading of radio data.
- Minimal dependencies, pinned version, and `npm ci --ignore-scripts`.
- SHA-256 backups and *fail-closed* writes.
