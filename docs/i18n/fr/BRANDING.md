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
- Barre latérale : image entière de 178 px de large (limitée à l'espace disponible) ; sur mobile, 144 px avec sous-titre à côté. Ne pas masquer la marque sur les petits écrans.
- README : largeur de 240 px avec hauteur proportionnelle. Les favicons et le raccourci de bureau Linux utilisent le même PNG ; aucune variante carrée n'est approuvée.
- Laisser au moins 10 px entre image et sous-titre sur ordinateur, et 14 px sur mobile. Ces mesures relèvent de la mise en page du projet, pas d'une charte officielle supplémentaire.
- Ne pas l'associer aux logos OpenGD77, Quansheng, F4HWN ou grid.radio d'une manière suggérant une affiliation.

Exception propre au firmware demandée le 25-10-2026 : le LCD monochrome
exige une adaptation proportionnelle de l'original à 128 × 48, sans couleur,
sur fond vide, avec `Bricohams BETA` en dessous. Elle est générée à partir
du PNG original, sans dessiner une nouvelle marque. Elle ne remplace pas
le PNG couleur sur le web ou Android. Construction et limites dans le
[guide du firmware](BRICOHAMS-FIRMWARE.md#branding-de-arranque-implementado).

## Palette

**Changement demandé le 25-10-2026 :** la couleur de marque indiquée par
l'utilisateur est **l'orange**. La palette bleu-vert ci-dessous décrit
l'implémentation web actuelle, pas l'identité visuelle cible. Android
utilise déjà `#FF9800` comme accent de thème ; cela ne valide ni le
contraste ni l'utilisabilité de tous les contrôles et appareils.
La migration définitive du web vers l'orange aura lieu après achèvement
et test des fonctions, selon l'ordre demandé. La teinte exacte et les
contrastes devront être validés avant de remplacer les tokens ; ne pas
recolorer le logo original ni communiquer les états uniquement par la couleur.

Interface inspirée de Bricohams Studio : fond sombre, cartes et accent bleu-vert. La palette suivante est celle de Radio Workspace ; elle ne prétend pas correspondre exactement aux couleurs de Studio et ne recolore pas le logo.

| Token | Couleur | Usage | Contraste (AA) |
| --- | --- | --- | --- |
| `--bg` | `#0b1418` | Fond | — |
| `--panel` | `#111d22` | Cartes et panneaux | — |
| `--line` | `#1f3238` | Bordures | décoratif |
| `--text` | `#e6f1f2` | Texte principal | 16,2:1 sur fond ; 14,9:1 sur panneau |
| `--muted` | `#8fa7ab` | Texte secondaire | 7,4:1 sur fond ; 6,8:1 sur panneau |
| `--accent` (`--mint`) | `#2bb3a3` | Accent, focus et états de réussite | 7,2:1 sur fond ; 6,6:1 sur panneau |
| `--blue` | `#89b9ff` | Liens et accent secondaire | 8,5:1 sur panneau |

Texte des boutons principaux : `#042420` sur l'accent (6,3:1).

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
