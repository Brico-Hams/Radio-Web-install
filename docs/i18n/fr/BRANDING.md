# Guide de marque · Bricohams

## Nom

- Produit : **Bricohams Radio Workspace**.
- Forme courte : **Bricohams** (barre supérieure et pied de page).
- Barre latérale : logo Bricohams original avec le sous-titre `RADIO WORKSPACE`, sans répéter le nom déjà présent dans l'image.

## Logo

[bricohams-logo.png](../../../bricohams-logo.png) est le **PNG original de 1200 × 446** utilisé par [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/). Il provient de [assets/logo-bricohams.png, commit 767edd6](https://github.com/Brico-Hams/Bricohams-Studio/blob/767edd66028d10f859346190d0c8044bd8e5a2b2/assets/logo-bricohams.png). Son SHA-256 est `0e1bec16953129cfc9c946d24e56347ddfb38878137ba43c7e84729acf811c87`, identique au PNG intégré à la page Studio, vérifié le 2026-10-21.

Il remplace l'ancienne icône SVG représentant un « B » avec des ondes, qui n'était pas le logo Bricohams. Ne pas le redessiner ni inventer de variante de la marque.

Règles d'utilisation :

- Ne pas le déformer, le recadrer, le recolorer ni lui ajouter d'ombres. Conserver son fond original et le rapport 1200:446, avec `height: auto`.
- Barre latérale : image entière de 166 px de large (limitée à l'espace disponible) ; sur mobile, 128 px avec sous-titre à côté. Ne pas masquer la marque sur les petits écrans.
- README : largeur de 240 px avec hauteur proportionnelle. Les favicons et le raccourci de bureau Linux utilisent le même PNG ; aucune variante carrée n'est approuvée.
- Laisser au moins 10 px entre image et sous-titre sur ordinateur, et 14 px sur mobile. Ces mesures relèvent de la mise en page du projet, pas d'une charte officielle supplémentaire.
- Ne pas l'associer aux logos OpenGD77, Quansheng, F4HWN ou grid.radio d'une manière suggérant une affiliation.

Exception propre au firmware demandée le 25-10-2026 : le LCD monochrome
exige une adaptation proportionnelle de l'original à 128 × 48, sans couleur,
sur fond vide, avec `Bricohams BETA` en dessous. Elle est générée à partir
du PNG original, sans dessiner une nouvelle marque. Elle ne remplace pas
le PNG couleur sur le web ou Android. Construction et limites dans le
[guide du firmware](BRICOHAMS-FIRMWARE.md#branding-de-démarrage-implémenté).

## Palette

Refonte du 28-10-2026 : orange Bricohams, surfaces neutres et cartes
clairement structurées. Le site et les installateurs partagent le même design.
Apparence propose Système, Clair et Sombre ; le choix est enregistré localement,
sans compte, et suit les changements du système en mode Système. L'aide utilise
le même choix. Android adapte ses contrôles natifs au système.
Le logo original reste inchangé. Les états conservent toujours un texte explicite.

| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--bg` | `#f3f5f9` | `#0e1420` | Fond |
| `--panel` | `#ffffff` | `#172131` | Cartes et panneaux |
| `--line` | `#dce2eb` | `#334157` | Bordures décoratives |
| `--text` | `#19263b` | `#edf2fb` | Texte principal |
| `--muted` | `#526179` | `#afbdd1` | Texte secondaire |
| `--mint` | `#a64b00` | `#ffb456` | Texte d'accent |
| `--blue` | `#205da8` | `#9dc5ff` | Liens et focus |

Boutons principaux : texte `#241407` sur `--accent: #f7941d`. Les tests vérifient
un contraste minimal de 4,5:1 pour les textes dans les deux palettes. Contrôles
principaux de 44 px, focus visible, tableaux à défilement interne, navigation
mobile horizontale et animations uniquement sans réduction des mouvements.

## Structure

- Barre supérieure fixe : état de connexion (copie de `#radio-status`), badge de mode (`#mode-badge`) et bouton « ⌁ Connecter », qui actionne celui de la section et se désactive avec lui.
- Barre latérale : logo, navigation et, sur les pages radio, étapes numérotées (0 Sauvegardes et connexion … 4 Firmware) menant à chaque section.
- Libellé au-dessus du titre : `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typographie

Police système (`system-ui`, Segoe UI, Roboto…), sans polices web externes, pour respecter la CSP et ne pas charger de ressources tierces.

## Ton

- Espagnol clair, technique et honnête : expliquer les limites avant les promesses.
- Avertissements de sécurité directs : ce qui peut échouer et la conduite à tenir.
- Ne revendiquer aucune compatibilité ou opération non vérifiée.
- L'attribution des sources de données reste toujours visible.
