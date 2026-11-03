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
| `--bg` | `#FFFFFF` | `#111518` | Fond |
| `--surface` | `#F6F7F8` | `#1C2329` | Cartes et panneaux |
| `--text` | `#23272B` | `#F6F8FA` | Texte principal |
| `--text-muted` | `#59636B` | `#BAC4CC` | Texte secondaire |
| `--border` | `#DCE1E5` | `#38434C` | Bordures |
| `--link` | `#AA410B` | `#FFA06A` | Liens |
| `--focus` | `#F26B1D` | `#FFC18F` | Anneau de focus |
| `--brand-orange` | `#F26B1D` | `#F26B1D` | Orange Bricohams |
| `--on-accent` | `#23272B` | `#23272B` | Texte sur orange |

Source de référence : le manuel officiel des couleurs `BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`, non inclus dans le dépôt. Le graphite de la marque est `--brand-ink`. Le thème s'applique avec `data-theme` sur l'élément racine et `localStorage`.

Boutons principaux : texte `--on-accent` sur `--brand-orange: #F26B1D` dans les deux thèmes, jamais blanc sur orange. L'orange n'est pas utilisé comme petit texte sur fond clair. Focus visible avec `outline: 3px solid var(--focus)`. Contrôles principaux de 44 px, tableaux à défilement interne, navigation mobile horizontale et animations uniquement sans réduction des mouvements.

Contraste WCAG 2.1 calculé (minimum 4,5:1 pour le texte et 3:1 pour l'anneau de focus) :

| Paire | Clair | Sombre |
| --- | --- | --- |
| `--text` / `--bg` | 15,0 | 17,2 |
| `--text` / `--surface` | 14,0 | 14,9 |
| `--text-muted` / `--bg` | 6,1 | 10,3 |
| `--text-muted` / `--surface` | 5,7 | 9,0 |
| `--link` / `--bg` | 6,0 | 9,2 |
| `--link` / `--surface` | 5,6 | 7,9 |
| `--on-accent` / `--brand-orange` | 4,9 | 4,9 |
| `--focus` / `--bg` | 3,05 | 11,6 |

Logo : uniquement le PNG original, sans filtre ni inversion ; en mode sombre il se place sur une plaque blanche discrète (`--plate`). Les états d'erreur et d'avertissement conservent un texte explicite et respectent AA dans les deux thèmes.

## Structure

- Barre supérieure fixe : état de connexion (copie de `#radio-status`), badge de mode (`#mode-badge`) et bouton « ⌁ Connecter », qui actionne celui de la section et se désactive avec lui.
- Barre latérale : logo, navigation et, sur les pages radio, étapes numérotées (0 Sauvegardes et connexion … 4 Firmware) menant à chaque section.
- Libellé au-dessus du titre : `RADIOAFICIÓN · HAZLO TÚ MISMO`.

## Typographie

`Inter` pour l'interface et `Montserrat` 700–800 pour les grands titres, avec repli sur les polices système (`system-ui`, Segoe UI, Roboto…). Aucune police web externe n'est chargée, pour respecter la CSP et fonctionner hors ligne.

## Ton

- Espagnol clair, technique et honnête : expliquer les limites avant les promesses.
- Avertissements de sécurité directs : ce qui peut échouer et la conduite à tenir.
- Ne revendiquer aucune compatibilité ou opération non vérifiée.
- L'attribution des sources de données reste toujours visible.
