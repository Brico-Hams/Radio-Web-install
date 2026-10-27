# Antennes pour satellites : conceptions Bricohams et pièces imprimables

Auteurs : Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF et Pedro
Roca, fondateurs et membres du conseil d’administration de Bricohams.
Informations : <https://bricohams.org> et <https://bricohams.com>.

Section consacrée aux antennes du guide [Premiers pas avec les satellites](INICIACION-SATELITE.md).
Les conceptions et pièces sont **propres à Bricohams** : dimensions calculées
avec un solveur de méthode des moments développé pour ce projet et pièces
modélisées par code. Elles ne reproduisent pas les projets d’antennes de PY4ZBZ
ni de PY5LO inclus dans le guide de PT2VM, dont l’autorisation a été accordée à cet auteur.

> **État : conception simulée, non construite ni mesurée.** Les chiffres
> proviennent d’une simulation en espace libre. Aucune antenne n’a encore été
> fabriquée ni mesurée avec un analyseur. Coupez les tiges 3-5 mm plus longues et
> ajustez-les avec un analyseur d’antennes (NanoVNA ou similaire) avant d’émettre.

## Quelle antenne choisir

| Antenne | Utilisation | Gain simulé | Difficulté |
| --- | --- | --- | --- |
| [Yagi bibande à main](#yagi-bibande-à-main) | Satellites FM avec montée et descente sur des bandes distinctes (SO-50, répéteur ISS, PO-101) | 8,4 dBi VHF / 11,4 dBi UHF | Moyenne |
| [Dipôle en V horizontal 2 m](#dipôle-en-v-horizontal-2-m) | Écoute fixe sans suivi : SSTV et APRS de l’ISS, descentes VHF | 1,8 dBi au zénith | Faible |
| Antenne d’origine de la radio | Premières écoutes de l’ISS lors de passages hauts | Très inférieur aux précédentes | Aucune |

Avec l’antenne d’origine, il est possible d’entendre l’ISS lors de passages hauts,
mais pour exploiter les satellites FM de faible puissance, une antenne directionnelle
orientée à la main est couramment utilisée. Un long fouet ou un contrepoids apportent
une légère amélioration, mais ne remplacent pas une antenne directive.

## Yagi bibande à main

![Plan coté de la Yagi bibande](../../atlas/sat-antena-yagi.svg)

Deux Yagis partagent un boom non conducteur : 3 éléments pour 2 m dans le plan
horizontal et 5 éléments pour 70 cm dans le plan vertical, tournés de 90 degrés.
Dans les plans orthogonaux et centrés, la simulation ne montre pas de couplage
notable entre les bandes : chaque Yagi fonctionne de la même façon avec ou sans
l’autre. Un mauvais alignement réel des éléments introduit toutefois un certain couplage.

### Dimensions

Cotes en mm, mesurées depuis le réflecteur VHF (x = 0). Les longueurs sont
mesurées d’une pointe à l’autre ; pour les éléments alimentés, elles comprennent
l’espace central de 16 mm du bloc imprimé, chaque moitié mesurant donc
(longueur − 16) / 2.

| Bande | Élément | Longueur (mm) | Position x (mm) | Chaque moitié (mm) |
| --- | --- | ---: | ---: | ---: |
| VHF | Réflecteur | 1011 | 0 | — |
| VHF | Alimenté | 969 | 532 | 476,5 |
| VHF | Directeur | 904 | 950 | — |
| UHF | Réflecteur | 337 | 75 | — |
| UHF | Alimenté | 320 | 231 | 152 |
| UHF | Directeur 1 | 304 | 365 | — |
| UHF | Directeur 2 | 301 | 572 | — |
| UHF | Directeur 3 | 294 | 751 | — |

Boom en tube PVC de 20 mm, comme un conduit électrique rigide, d’environ 1030 mm.
Les pièces VHF et UHF sont séparées d’au moins 35 mm le long du boom ; le script
de conception vérifie ce point.

### Performances simulées

| MHz | Z (Ω) | ROS 50 Ω | Gain (dBi) | Avant/arrière (dB) |
| --- | --- | ---: | ---: | ---: |
| 145,8 | 38,0 + j2,6 | 1,32 | 8,43 | 15,0 |
| 145,9 | 37,9 + j3,3 | 1,33 | 8,44 | 15,0 |
| 146,0 | 37,9 + j4,1 | 1,34 | 8,45 | 14,9 |
| 435,0 | 39,1 − j0,7 | 1,28 | 11,32 | 15,2 |
| 436,5 | 38,6 − j0,3 | 1,30 | 11,37 | 15,6 |
| 438,0 | 37,1 + j0,0 | 1,35 | 11,42 | 16,2 |

La conception privilégie le gain et le rapport avant/arrière avec une ROS inférieure
à 1,4 sur tout le segment satellite, en alimentant directement l’élément actif
avec un coaxial de 50 Ω et sans réseau d’adaptation. Une ROS de 1,3-1,35 réfléchit
environ 2 % de la puissance ; c’est acceptable pour une radio portable.

### Matériaux

- Tube PVC de 20 mm, 1030 mm.
- Tige d’aluminium de 4 mm, environ 5,5 m au total. Une tige en laiton convient aussi ;
le ruban à mesurer nécessite un autre bloc.
- Pièces imprimées : 6 pinces d’élément, 2 blocs d’élément alimenté et
1 poignée ; voir [pièces STL](#pièces-imprimables-stl).
- Vis M3 x 8 pour fixer les tiges et les pièces et M3 x 10 avec cosse à œillet
pour les éléments alimentés.
- Deux longueurs de coaxial fin de 50 Ω, par exemple RG-316 ou RG-58, chacune
avec un choke de mode commun : quelques perles de ferrite près du bloc ou 4-5
tours de coaxial d’environ 3 cm de diamètre. Vérifiez le choke avec l’analyseur.
- Un duplexeur VHF/UHF pour réunir les deux éléments alimentés en une seule
ligne de descente si vous utilisez une seule radio, comme l’UV-K5. Avec deux
radios, chaque coaxial va vers sa radio.

### Montage

1. Coupez les tiges 3-5 mm plus longues que les valeurs du tableau et limez les
extrémités. Protégez-les avec de la gaine thermorétractable ou des capuchons.
Quand on fait pivoter une antenne à main, il est facile d’approcher une extrémité du visage.
2. Marquez les positions x sur le boom avec du ruban. Les pinces VHF maintiennent
la tige horizontalement et celles UHF la tournent de 90 degrés sur le boom.
3. Centrez la tige dans chaque pince et serrez-la avec la vis M3 supérieure.
Fixez la pince au boom avec la vis M3 inférieure.
4. Dans les blocs d’éléments alimentés, insérez chaque moitié jusqu’au fond du trou.
La vis supérieure la fixe et sert de borne : tresse d’un côté et âme de l’autre,
avec une cosse à œillet. Étanchéifiez les connexions contre l’humidité.
5. Faites passer les coaxiaux le long du boom vers le réflecteur, attachés au
niveau de la goupille du bloc, avec le choke près de l’alimentation.
6. Montez la poignée entre l’élément alimenté UHF (231) et le directeur 1 UHF (365),
vers x ≈ 300. Déplacez-la jusqu’à l’équilibre de l’antenne.

### Réglage avec un analyseur

- Mesurez la ROS de chaque bande séparément, l’autre coaxial étant chargé avec
50 Ω ou connecté au duplexeur.
- Si le minimum se trouve sous le segment, raccourcissez l’élément alimenté de
la même longueur des deux côtés, par pas de 1-2 mm. S’il est au-dessus,
l’élément alimenté est trop court : remplacez-le.
- Ne cherchez pas une ROS de 1,0 : l’élément alimenté direct est conçu pour
avoisiner 38 Ω. L’important est que le minimum soit centré sur 145,9 et 436,5 MHz.
- Éloignez-vous des tables métalliques et des personnes lors de la mesure. Pointez
l’antenne vers le ciel.

## Dipôle en V horizontal 2 m

![Plan coté du dipôle en V](../../atlas/sat-antena-dipolo-v.svg)

Antenne fixe sans suivi pour écouter l’ISS, par exemple la SSTV sur 145,800 MHz et
l’APRS sur 145,825 MHz, ainsi que les descentes VHF. Les bras en V à 100 degrés
comblent partiellement les nuls du dipôle droit et rapprochent l’impédance de 50 Ω.

| Paramètre | Valeur |
| --- | --- |
| Angle entre les bras | 100 degrés |
| Bras depuis le centre | 505 mm |
| Tige de chaque bras | 497 mm : commence à 8 mm de l’axe, dans le cube imprimé |
| Z simulée 145,8 / 145,9 / 146,0 MHz | 48,7 + j2,0 / 48,9 + j2,6 / 49,0 + j3,3 Ω |
| ROS 50 Ω | 1,05-1,07 |
| Gain au zénith | 1,82 dBi |
| Ondulation en azimut à 30 degrés d’élévation | 5,5 dB |

Montez-le horizontalement sur un mât PVC de 20 mm, avec le cube imprimé et un
choke de mode commun sur le coaxial, à environ 0,5-1 m au-dessus du toit ou du
sol. La hauteur au-dessus du sol modifie le diagramme réel : la simulation est
en espace libre. Pour émettre lors de passages bas, la Yagi est préférable.

## Pièces imprimables STL

![Vue des pièces imprimables](../../atlas/sat-piezas-stl.svg)

| Pièce | Fichier | Quantité | Fonction |
| --- | --- | ---: | --- |
| Pince d’élément | [pinza-elemento.stl](../../../hardware/antenas/stl/pinza-elemento.stl) | 6 | Maintient un élément passif de 4 mm sur le boom de 20 mm |
| Bloc de l’élément alimenté | [bloque-excitado.stl](../../../hardware/antenas/stl/bloque-excitado.stl) | 2 | Deux moitiés isolées avec espace de 16 mm, bornes M3 et canal coaxial |
| Poignée | [empunadura.stl](../../../hardware/antenas/stl/empunadura.stl) | 1 | Poignée de 32 mm, creuse et rainurée, fixée au boom |
| Cube du dipôle en V | [cubo-dipolo-v.stl](../../../hardware/antenas/stl/cubo-dipolo-v.stl) | 1 | Bras à 100 degrés, bornes M3 et embase pour mât de 20 mm |

Recommandations d’impression :

- Matériau : PETG ou ASA. Le PLA se déforme au soleil.
- Parois et remplissage : 4 parois et 40 % de remplissage.
- Hauteur de couche : 0,2 mm.
- Orientation : anneau du boom horizontal et posé sur la face plane de la saillie.
Le cube est imprimé avec l’embase vers le bas.

Jeux des trous :

- Boom : 20,4 mm.
- Tige : 4,3 mm.
- Taraudage direct M3 : 2,8 mm.

Si votre imprimante referme les trous, modifiez les constantes `BOOM`, `ROD` et
`M3_TAP` de `generar_stl.py`, puis régénérez les pièces.

Le script vérifie que chaque STL est un solide fermé et monobloc.
Les données de volume et de dimensions sont dans
[piezas.json](../../../hardware/antenas/piezas.json).

## Méthode de calcul et vérification

Fichiers dans [hardware/antenas](../../../hardware/antenas/README.fr.md) :

| Script | Fonction |
| --- | --- |
| `mom.py` | Solveur propriétaire de fils fins par méthode des moments (Harrington) : courants aux nœuds, charges par segment, noyau réduit et terme statique intégré analytiquement |
| `disenar.py` | Optimise les dimensions avec Nelder-Mead pour un gain maximal avec ROS ≤ 1,3-1,35 et rapport avant/arrière ≥ 15 dB, vérifie la combinaison bibande et l’espacement des pièces, puis écrit `resultados.json` |
| `generar_stl.py` | Modélise les pièces avec manifold3d et écrit les STL et `piezas.json` |
| `vistas.py` | Dessine les plans cotés et les vues des pièces dans `docs/atlas` |

Validation du solveur par rapport au dipôle de référence λ/2 :

- Avec un rayon de 10⁻⁵ λ, il donne Z ≈ 78 + j43 Ω, contre la valeur classique
de 73 + j42,5 Ω. L’écart provient de l’alimentation delta-gap.
- Avec un rayon de 10⁻³ λ, le dipôle de 0,475 λ résonne à 71 − j3,5 Ω.
- La directivité est de 2,15 dBi. Le gain calculé à partir de la puissance
d’entrée correspond à l’intégrale du diagramme ; la puissance est donc conservée.

L’erreur attendue sur la fréquence de résonance est de quelques pour cent. C’est
pourquoi les éléments sont coupés longs puis ajustés.

Limites du modèle :

- Espace libre, sans sol ni corps de l’opérateur.
- Conducteurs parfaits.
- Le modèle ne prend en compte ni le plastique des pinces, qui abaisse légèrement
la résonance, ni le boom, le coaxial ou le duplexeur.
- Ce n’est ni une mesure ni une certification de performance.

Pour régénérer depuis le dossier `hardware/antenas` :

```text
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python disenar.py
.venv\Scripts\python generar_stl.py
.venv\Scripts\python vistas.py
```

## Sécurité et légalité

- L’émission exige une autorisation radioamateur. Pas l’écoute.
- Avec 5 W et une Yagi de 11 dBi, ne pointez pas vers des personnes proches et
gardez les éléments éloignés du visage pendant l’émission.
- N’utilisez pas ces antennes sur des bandes ou satellites non autorisés, par exemple
les satellites militaires UHF.