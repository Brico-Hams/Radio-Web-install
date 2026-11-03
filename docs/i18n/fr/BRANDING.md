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

Manuel officiel des couleurs BricoHams v1.1 (03-11-2026), PDF
`BricoHams_Guia_Colores_Web_Pantone_Claro_Oscuro_con_Prompt_IA.pdf`
(non inclus dans le dépôt). Il remplace toutes les palettes précédentes
(`#f7941d`, `#F26B21`, `#a64b00`, `#0b1418`, `#0e1420`, `#111d22`, `#172131`,
`#89b9ff`, `#205da8`, `#0A2540` et `#FF6B00`), qui ne doivent plus être utilisées.

Le sélecteur Apparence propose Système, Clair et Sombre ; il est enregistré dans
`localStorage` et appliqué comme `data-theme` sur `<html>` avant l'affichage.
Android suit le mode du système (`res/values/colors.xml` et
`res/values-night/colors.xml`). Les états conservent toujours un texte explicite.

Les deux thèmes : `--brand-ink` `#23272B` (graphite), `--brand-orange` `#F26B1D`
(CTA et détails) et `--on-accent` `#23272B` (texte sur orange).

| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` | `#111518` | Fond |
| `--surface` | `#F6F7F8` | `#1C2329` | Cartes et panneaux |
| `--border` | `#DCE1E5` | `#38434C` | Bordures |
| `--text` | `#23272B` | `#F6F8FA` | Texte principal |
| `--text-muted` | `#59636B` | `#BAC4CC` | Texte secondaire |
| `--link` | `#AA410B` | `#FFA06A` | Liens et texte d'accent |
| `--focus` | `#F26B1D` | `#FFC18F` | Contour `:focus-visible` de 3 px |

Règles (WCAG 2.2 AA) :

- Bouton principal : fond orange `#F26B1D` avec texte graphite `#23272B` dans les deux thèmes. Jamais de texte blanc sur orange (3,05:1).
- L'orange `#F26B1D` n'est pas utilisé comme petit texte sur blanc ; en thème clair on utilise `#AA410B`.
- Logo : uniquement le PNG original, sans filtre ni inversion ; en thème sombre, sur une plaque blanche discrète aux coins arrondis.
- Typographie : Inter pour l'interface et Montserrat 700-800 pour les grands titres, avec la pile de polices système en secours et sans charger de polices distantes.
- États (succès/avertissement/erreur) : couleurs fonctionnelles avec contraste AA dans les deux thèmes ; elles ne remplacent jamais l'orange des CTA.
- Impression uniquement : Pantone 426 C (graphite) et 165 C (orange ; 158 C en alternative). Ce ne sont pas des couleurs d'écran.
- Firmware à LCD monochrome : logo de démarrage et chaîne « Bricohams », sans couleurs.

| Paire | Clair | Sombre |
| --- | --- | --- |
| Texte / fond | 14,6:1 | 17,0:1 |
| Texte secondaire / fond | 5,9:1 | 10,4:1 |
| Lien / fond | 6,5:1 | 8,5:1 |
| Graphite sur orange (bouton) | 4,9:1 | 4,9:1 |
| Orange / fond (non textuel) | 3,05:1 | 6,03:1 |
| Blanc sur orange (interdit) | 3,05:1 | 3,05:1 |

Les valeurs sont approximatives (calculées avec la formule WCAG) ; les tests
automatiques de chaque plateforme vérifient le minimum de 4,5:1 pour le texte.

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
