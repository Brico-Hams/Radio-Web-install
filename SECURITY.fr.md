# Politique de sécurité

[Español](SECURITY.md) · [English (US)](SECURITY.en.md) · [Français](SECURITY.fr.md) · [Deutsch](SECURITY.de.md)

## Versions prises en charge

Uniquement la version la plus récente de la branche `main`.

## Signalement

Signalez les vulnérabilités en privé via [GitHub Security Advisories](https://github.com/Brico-Hams/Radio-Web-install/security/advisories/new). **N'ouvrez pas de ticket public** pour les vulnérabilités.

Incluez description, impact, étapes de reproduction et version/commit. N'envoyez jamais de jetons, sauvegardes radio ou données personnelles réelles ; utilisez des données synthétiques.

## Périmètre

- Exposition du serveur au-delà de `127.0.0.1`, contournement de la validation de `Host` ou de la liste des fichiers autorisés.
- XSS ou contournement de la CSP.
- Écritures radio sans sauvegarde vérifiée ou contournement de l'autorisation d'écriture.
- Téléchargements depuis des hôtes non autorisés ou fuite d'identifiants `RB_*` vers le navigateur.

Hors périmètre : déploiements réseau non pris en charge (voir [docs/DEPLOYMENT.md](docs/i18n/fr/DEPLOYMENT.md)), défaillances de firmwares tiers et dommages dus à des outils externes.

## Pratiques

- Aucune télémétrie ni transmission des données de la radio.
- Dépendances minimales, version fixée et `npm ci --ignore-scripts`.
- Sauvegardes SHA-256 et écritures bloquées par défaut en cas d'échec (*fail-closed*).
