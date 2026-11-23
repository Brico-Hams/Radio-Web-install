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

La liste des bandes est limitée à celles sur lesquelles la radio peut émettre selon les données du dépôt : Icom IC-705 et IC-9700 (plans de bandes de `FREQUENCY_RANGES.md`), Yaesu FTX-1 (14 bandes de `third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml`), TH-D75 (plages de la bande A), OpenGD77 (limites par défaut, ni plan de bandes ni autorisation), Quansheng et AnyTone. truSDX et QMX n’ont que la plage d’accord CAT (pas des limites TX). Si une radio n’a pas de données TX dans le dépôt (p. ex. TK11), « pendiente de fuente » est affiché.

## Mesurer le ROS depuis la radio

L’application ne met jamais la radio en émission : c’est vous qui émettez, et l’instrument n’est lu que lorsque la radio indique TX. Les points (fréquence, ROS) sont superposés à la courbe du modèle comme un CSV importé. Sur ordinateur, la station distante est utilisée (`GET /api/remote/swr`) ou, pour le FTX-1, Web Serial direct (lecture seule de `TX;`, `FA;` et `RM6;`) ; sur Android, l’écran antennes (WebView sans réseau, CSP stricte) lit la radio du profil par CAT. N’émettez jamais sans charge adaptée ou antenne.

| Radio | Instrument de ROS via CAT | Source |
| --- | --- | --- |
| Icom IC-705 | ok | CI-V `15 12` (guide de référence CI-V de l’IC-705 p. 5) et TX `1C 00` (p. 15) ; `rigs/ic705.toml` |
| Icom IC-7300 | partiel (échelle jusqu’à ROS 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300.toml`) |
| Icom IC-7300MK2 | partiel (échelle jusqu’à ROS 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7300mk2.toml`) |
| Icom IC-7610 | partiel (échelle jusqu’à ROS 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic7610.toml`) |
| Icom IC-9700 | partiel (échelle jusqu’à ROS 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic9700.toml`) |
| Icom IC-905 | partiel (échelle jusqu’à ROS 3,0) | CI-V `15 12` / `1C 00` (`rigs/ic905.toml`) |
| Icom IC-7100 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7200 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7410 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7600 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7700 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7760 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7800 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-7850 / IC-7851 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-9100 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Icom IC-R8600 | pendiente de fuente | récepteur seul, il n’émet pas |
| Yaesu FTX-1 | partiel (échelle approchée) | `RM6;` dans `docs/FTX1-KNOWLEDGE.md` |
| Yaesu FT-710 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FT-991A | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FTDX10 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FTDX101D | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FTDX101MP | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FTDX3000 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FT-817 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FT-818 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FT-857 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Yaesu FT-897 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Kenwood TS-590S | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Kenwood TS-590SG | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Kenwood TS-890S | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Kenwood TS-990S | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Kenwood TH-D75 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Elecraft K3S | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Elecraft K4 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-6400 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-6400M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-6600 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-6600M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-6700 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-8400 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-8400M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-8600 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio FLEX-8600M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio AURORA-510 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio AURORA-510M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio AURORA-520 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| FlexRadio AURORA-520M | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| QRP Labs QMX / QMX+ | pendiente de fuente | `SW;` sans échelle documentée |
| QRP Labs QCX | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| QRP Labs QDX | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| (tr)uSDX | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Hermes Lite 2 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Quansheng UV-K5 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| OpenGD77 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Radtel RT-950 Pro | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| Radtel RT-S10 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| AnyTone D878 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |
| TK11 | pendiente de fuente | aucune commande de lecture du ROS dans le dépôt |

Les Icom marqués partiel n’ont que les points documentés ROS 1,0 à 3,0 (raw 0 à 120) ; une valeur raw supérieure est ignorée. Le niveau `SWR` de Hamlib lu par la station distante n’est affiché pour une radio que si Hamlib le renvoie ; le dépôt ne documente pas quels backends le font, donc les radios ci-dessus restent « pendiente de fuente ».
