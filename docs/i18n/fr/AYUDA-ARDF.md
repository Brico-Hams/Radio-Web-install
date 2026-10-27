# ARDF Quansheng : aide à la réception et à la configuration

Révision : 25-10-2026. Preuve principale : `ARDFv05/ARDF.md` et dépôt
reald V3/UV-K1. Il s’agit d’un résumé original de configuration, et non d’une copie du manuel.
Les noms et plages ci-dessous correspondent au document inspecté ;
ils ne sont pas attribués sans vérification à v0.2/v0.4 ou aux branches V1/V2.

## Matériel, versions et limites

| Famille | Source correspondante | Relation avec ce site |
| --- | --- | --- |
| V1 DP32 | reald/uv-k5-firmware-custom | Ne s’installe pas avec le connecteur PY32 |
| V2 | Projet DL9CAT V2 référencé par reald | Hors catalogue/connecteur |
| V3 / UV-K1 PY32 | reald/uv-k1-k5v3-firmware-custom | Releases stables reconnues pour téléchargement |

Le catalogue reconnaît les tags `ARDF-K5v3_K1-vX.Y[.Z]` de la source V3, et non
les fichiers arbitraires contenant « ARDF » dans leur nom. Sur ce site, ils restent **en téléchargement uniquement**, même avec des vecteurs PY32 : aucune validation ARDF par slot
n’est activée. Le dossier ARDFv05 contient des sources et des fichiers hérités ;
il ne transforme pas chaque binaire de son archive en une compilation ARDF actuelle.

L’upstream documente TX désactivée dans ses releases ARDF officielles.
Ne le présumez pas pour une compilation tierce : vérifiez `ENABLE_PREVENT_TX`
et la version. Le firmware de radiogoniométrie ne transforme pas la radio en récepteur
80 mètres ; le document indique une limite inférieure de la puce d’environ
18 MHz, elle ne convient donc pas à l’ARDF sur 3.5 MHz.

## Modes et réglages

| Réglage | Contrôle | Choix et vérification |
| --- | --- | --- |
| ARDF=OFF | Fonctionnement hors de l’écran/mode ARDF | Ne prouve pas que TX soit compilée ou autorisée |
| ARDF=DF Simple | Radiogoniométrie simple à gain manuel | Pour chercher sans cycles ; aucune correction d’horloge de cycle nécessaire |
| ARDF=ARDF | Cycles et affichage des renards | Configurer la synchronisation avec l’événement réel |
| Mode=AM | Démodulation des signaux AM de l’activité | Correspondre au signal réel ; n’active pas TX AM |
| Step | Pas de syntonisation | Le manuel propose 1 kHz ; éviter l’arrondi de la fréquence souhaitée |
| Sql | Squelch | Le manuel propose 0 pour écouter en continu ; régler le volume avec prudence |
| RxMode | Écoute du VFO | MAIN ONLY évite l’alternance et le clignotement de l’historique de gain |
| Gain manuel | Sensibilité/atténuation par indice | Un indice plus bas réduit la sensibilité ; le diminuer à l’approche d’un signal intense |
| NumFox | Nombre d’émetteurs dans un cycle | Document : 1-10 ; 0 désactive la temporisation ; valeur par défaut 5 |
| FoxDur | Durée de chaque tour | Document : valeur par défaut 60 s, plage 1.00-999.99 s ; vérifier les unités d’entrée du build |
| EndSig | Avertissement avant la fin du tour | 0 désactive ; document : 1-30 s. Baisser le volume avant d’utiliser un casque |
| GainRe | Mémoriser le gain par renard/VFO | OFF, VFO A, VFO B ou BOTH selon le document |
| RSS100 | Référence pour estimer la distance | Zéro désactive ; ce n’est pas l’étalonnage RF de toute la radio |
| ClkCor | Correction du temporisateur interne | Uniquement après mesure de la dérive, ne pas copier la valeur d’un autre appareil |
| SetNav | Orientation des touches K1/K5 | Corriger si UP/DOWN semblent inversées |
| ChSave | Enregistrer la configuration de la mémoire | Nécessaire en MR ; VFO et MR ne sont pas identiques |

Les variations de gain par indice sont décrites comme environ 5 dB ;
ce n’est pas un atténuateur certifié. Un signal très proche peut saturer malgré
la réduction de gain. Antenne, polarisation, orientation et environnement comptent.

## Mise en route en réception uniquement

1. Identifier le matériel et le firmware ARDF exacts ; enregistrer la configuration d’origine.
2. Brancher l’antenne et régler le volume bas ; l’augmenter progressivement, surtout
   avec un casque.
3. Choisir DF Simple pour vérifier la réception sans horloge.
4. Sélectionner la modulation, le pas et la fréquence du signal autorisé de l’événement.
5. Utiliser MAIN ONLY ; vérifier que vous êtes en VFO si vous saisissez une fréquence.
6. Régler le gain et l’orientation sans confondre le bruit maximal avec le signal utile.
7. Pour une compétition chronométrée, configurer NumFox/FoxDur et synchroniser le cycle
   réel en suivant l’écran/le guide de la version installée.
8. Enregistrer si nécessaire ; vérifier après rechargement du VFO/de la mémoire.

Aucune séquence universelle de synchronisation n’est recommandée : les touches et les modes
peuvent varier d’une version à l’autre. N’émettez pas de signal de test sans autorisation.

## Rappel sur le gain

GainRe conserve les valeurs par renard au début de son tour. Une configuration
utile est VFO A pour la fréquence des renards avec mémorisation du gain, VFO B
pour une balise continue sans cette fonction. Si NumFox=0 ou si GainRe n’inclut pas le VFO actif,
ne vous attendez pas à un tableau d’historique par renard. Le document avertit que le
tableau affiché peut avoir des limites différentes du NumFox maximal : ne déduisez pas
10 historiques du seul fait que 10 tours sont affichés.

## Distance : une estimation, pas de la navigation

La prédiction repose sur un modèle de propagation approximatif et une référence
RSS100 de l’ensemble émetteur-antenne-récepteur. Le terrain, la puissance, la hauteur et les
obstacles modifient le résultat ; ne vous fiez pas au nombre comme à une distance réelle.
Le manuel décrit la prise d’une référence à 100 m de l’émetteur de l’événement, avec un signal
stable et une orientation connue. Zéro désactive la fonction. Cela ne remplace ni la cartographie,
ni la sécurité personnelle, ni les consignes de l’organisateur.

## Correction de l’horloge

Le manuel décrit la dérive du résonateur interne. Pour le cas précis où l’on mesure
le nombre de secondes réelles écoulées lorsque l’appareil indique une heure :

```text
correccion = 6000 - (segundos_reales * 100 / 60)
```

Le document donne une plage de -500 à 500 pour ClkCor. Cette formule s’applique uniquement à la
procédure de cette version, pas à tout menu d’horloge d’une autre radio.
Ce n’est pas une correction de l’oscillateur RF et elle ne nécessite pas de modifier l’étalonnage RF.
Après modification, refaire une mesure et vérifier la synchronisation.

## Différences historiques vérifiables

- Le document indique qu’avant v0.4, SetNav se trouvait dans un menu caché ;
  ne présumez pas du même emplacement dans toutes les versions.
- Pour connaître les différences entre v0.2, v0.4, v0.5 et v0.5.1, consultez chaque release ;
  une étiquette plus récente ne prouve pas à elle seule la compatibilité des données.
- Utilisez le module CHIRP fourni avec la release. Le pilote UV-K5 standard ne
  représente pas nécessairement ses réglages ARDF.
- N’extrapolez pas V1/V2 au flashage V3. Le manuel avertit que k5prog/k5prog_win
  V1 ne sont pas les outils adaptés à V3.

## Diagnostic

| Problème | Vérification non destructive |
| --- | --- |
| Seuls trois chiffres apparaissent | Il peut s’agir d’une mémoire, et non du VFO |
| La fréquence saisie change | Vérifier Step/la grille et les limites de bande |
| L’historique de gain clignote | Désactiver la double écoute |
| Le tableau des renards n’apparaît pas | Vérifier NumFox et GainRe pour le VFO actif |
| CHIRP affiche d’autres réglages | Enregistrer la mémoire et vérifier le module/la version |
| Les flèches sont inversées | SetNav, ne pas changer de firmware à cause d’une apparence similaire |
| Erreur Header short read | Fermer les programmes, vérifier câble/port de données, mode et firmware ; ne pas effacer la mémoire |
| Distance incohérente | Référence RSS100, antenne, puissance et terrain ; ne pas réétalonner RF à l’aveugle |

## Sources

- [Projet ARDF V3 et UV-K1](https://github.com/reald/uv-k1-k5v3-firmware-custom).
- [Manuel ARDF du projet](https://github.com/reald/uv-k1-k5v3-firmware-custom/blob/main/ARDF.md).
- [Releases ARDF V3](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases).
- [Projet ARDF V1](https://github.com/reald/uv-k5-firmware-custom).
- [Configuration commune](AYUDA-CONFIGURACION.md).

La branche distante peut évoluer. Pour reproduire la configuration, notez la
version exacte du manuel, du firmware et du pilote avec votre copie.