# Antennes filaires HF/VHF : concepteur et analyseur

Page **Antennes** de l’application. Elle complète les [antennes pour satellites](ANTENAS-SATELITE.md) et utilise le même solveur de méthode des moments (`hardware/antenas/mom.py`), porté en JavaScript dans `antenna-core.js`. Tout est calculé dans le navigateur et fonctionne hors ligne.

## Limites et sécurité

- C’est de la **simulation uniquement** : conducteurs parfaits, fil fin et aucune perte ohmique.
- Il n’y a pas de sol avec pertes : la hauteur au-dessus du sol est modélisée en espace libre ou avec un plan de sol parfait (image) en z = 0.
- Vérifiez toujours l’antenne avec un analyseur avant d’émettre.
- N’émettez jamais sans antenne ou charge adaptée.
- Les valeurs des trappes, du balun et du coaxial sont saisies par l’utilisateur ; il n’y a pas de base de données de câbles.

## Fonctions

| Fonction | Ce qu’elle fait | Origine des nombres |
| --- | --- | --- |
| Géométrie | Vue 2D/3D, tableaux modifiables des fils et des charges | Données de l’utilisateur |
| Balayage et réglage | ROS, R, X, abaque de Smith et réglage Nelder-Mead pour un ROS minimal | Modèle des moments |
| Rayonnement | Coupes en azimut et en élévation, diagramme 3D, gain en dBi et courants | Modèle des moments |
| Adaptation | Balun 1:1, 1:2, 1:4, 1:6, 1:9, réseau en L et coaxial | Formules de ligne et de circuit |

## Modèles et trappes

Des modèles sont fournis pour un dipôle demi-onde, un V inversé et un dipôle multibande à trappes (2 à 5 bandes et jusqu’à 8 trappes LC parallèles). Fixez C pour calculer L, ou L pour calculer C, avec la résonance `f = 1/(2π√(LC))`. Chaque section part de c/(4f) sans facteur de raccourcissement inventé : utilisez le conseiller et le réglage automatique.

## Format CSV des mesures

Le fichier de l’analyseur peut contenir des colonnes fréquence et ROS, ou fréquence, R et X. L’en-tête, les unités Hz, kHz ou MHz, le séparateur (virgule, point-virgule ou tabulation) et la virgule décimale sont détectés. Exemple : `frecuencia;swr`.

## Bandes par radio

La liste des bandes est limitée à celles sur lesquelles la radio peut émettre selon les données du dépôt : Icom IC-705 et IC-9700 (plans de bandes de `FREQUENCY_RANGES.md`), OpenGD77 (limites par défaut, ni plan de bandes ni autorisation), Quansheng et AnyTone. Si une radio n’a pas de données TX dans le dépôt, « pendiente de fuente » est affiché.
