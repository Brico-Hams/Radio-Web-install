# F4HWN : référence de toutes les options du catalogue

Révision : 25-10-2026. Ce tableau couvre **chaque clé** du catalogue web
v6.3.0, commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Les descriptions indiquent l’objectif de la fonction ; elles ne garantissent pas qu’une
combinaison arbitraire compile ou fonctionne sur votre radio.
Les 10 clés supplémentaires trouvées dans les presets publiés des 18 versions
historiques sont également incluses, sans être présentées comme des options de
l’interface actuelle.

## Comment lire les options

- ON/OFF correspondent ici à des décisions de **compilation**, pas nécessairement à des interrupteurs
disponibles dans le menu de la radio.
- Une fonction compilée peut nécessiter une configuration ultérieure, des ressources,
du matériel, une application ou des outils externes.
- OFF retire généralement du code/de l’interface ; cela n’efface pas nécessairement les anciennes données.
- L’absence d’un nom ne signifie pas OFF : il peut ne pas exister ou ne pas être exposé
par ce catalogue. La [matrice des presets](F4HWN-PRESETS.md) utilise N/D.
- Le formulaire web utilise v6.3.0 ; le constructeur local Bricohams utilise v6.1.0
figé. Ne mélangez pas les options/valeurs par défaut sans comparer les deux tableaux.
- Le budget maximal d’image PY32 accepté par les slots est de 118 KiB
(120832 bytes). Tout activer ne garantit pas que cela tiendra dans la Flash/RAM.
- L’upstream avertit que plusieurs options non F4HWN désactivées par défaut ne
sont pas prises en charge, sauf documentation explicite. Il est déconseillé de les activer
uniquement parce qu’une case existe.

## Plateforme et protocoles

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `DEV` | Identité et traitement de compilation de développement | Ce n’est pas un module utilisateur ; le builder Bricohams exige OFF et le catalogue stable exclut le développement |
| `ENABLE_FEAT_F4HWN` | Couche de fonctions F4HWN, identité et menus associés | Requise par le profil Bricohams ; ne pas utiliser OFF pour simuler une compatibilité |
| `ENABLE_UART` | Communication UART et code du protocole associé | À conserver pour la gestion série compatible ; ne définit pas à lui seul toutes les commandes |
| `ENABLE_USB` | Prise en charge USB native et son transport sur PY32 | Nécessite le matériel/le câble adapté ; n’ajoute pas l’USB de données à une V1 |
| `ENABLE_EXTRA_UART_CMD` | Commandes UART supplémentaires de la base | Surface de contrôle supplémentaire ; uniquement pour des outils connus et une version compatible |
| `ENABLE_UART_RW_BK_REGS` | Accès en lecture/écriture aux registres BK par UART | Diagnostic avancé ; peut modifier le fonctionnement RF, ne pas activer sans nécessité |
| `ENABLE_SWD` | Disponibilité du débogage SWD selon l’implémentation | Ce n’est pas un mode de copie web ; vérifier les effets sur les broches et la carte |
| `ENABLE_LTO` | Optimisation de l’édition de liens entre unités de compilation | Modifie le résultat/la taille ; vérifier la compatibilité de la toolchain et les contrôles du stub |
| `ENABLE_NO_HEAP` | Supprime la réservation du heap dans le linker de la base | Uniquement si le programme n’a pas besoin d’allocation dynamique ; ce n’est pas une accélération générale |
| `ENABLE_FEAT_F4HWN_DEBUG` | Instrumentation de diagnostic F4HWN | Peut consommer de la mémoire/modifier les temporisations ; inutile pour une utilisation normale |
| `ENABLE_AGC_SHOW_DATA` | Affichage des données de contrôle automatique du gain | Outil de diagnostic ; pas un étalonnage automatique |
| `ENABLE_BYP_RAW_DEMODULATORS` | Chemins de démodulation RAW de la base | Option avancée/non prise en charge par certains presets ; consulter l’implémentation, ne pas présumer d’une meilleure réception |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | Commandes d’accès physique à la Flash externe | Nécessaire à la sauvegarde complète de ce site dans Labs compatible ; à ne pas confondre avec la lecture de l’étalonnage |

## Multiboot, CFG et overlays

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | Gestionnaire d’images externes et banques associées | N’assure pas la prise en charge V1 et ne rend pas compatible n’importe quel `.bin` |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | Changement de banque CFG à l’exécution | Modifie les paramètres/les canaux, ne restaure pas un autre firmware ; exige des données compatibles |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | Espace de travail/exécution RAM utilisés par multiboot et les overlays | Maintenir le contrôle d’isolation ; ne pas désactiver dans le profil Bricohams |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | Chargeur et menu d’applications externes | Nécessite l’overlay RAM et des applications ABI/API/caps compatibles ; expérimental |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | Service Beam disponible pour les applications overlay | Dépend du chargeur d’applications ; n’implique pas l’inclusion d’une application particulière |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | Informations système par overlay/service associé | Dépend des applications ; agit sur le code de diagnostic/l’utilisation de la pile selon la source |

Le CMake inspecté rejette APPS sans MULTIBOOT_OVERLAY et BEAM/INFO overlay
sans APPS. Ce sont des dépendances vérifiées, pas une liste exhaustive de toutes les
interactions possibles. Ne modifiez pas un binaire pour faire croire qu’une autre API existe.

## Réception, audio et spectre

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_FMRADIO` | Réception de radiodiffusion FM utilisant le matériel pris en charge | Ce n’est pas le mode FM d’un canal VHF/UHF |
| `ENABLE_NOAA` | Fonctions de réception météo NOAA | Disponibilité géographique ; ce n’est pas un réseau météo universel |
| `ENABLE_WIDE_RX` | Plages de réception étendues prises en charge par le code | Sensibilité/filtres variables selon la bande ; n’autorise pas l’émission TX légale hors bande |
| `ENABLE_SPECTRUM` | Analyseur de spectre de la base | Ne pas présumer la simultanéité avec d’autres fonctions ni les performances d’un analyseur de laboratoire |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | Améliorations F4HWN de l’analyseur | Interagit avec SPECTRUM et les paramètres persistés selon la build |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | Critères de squelch plus sensibles | Peut provoquer des ouvertures dues au bruit ; régler SQL et tester |
| `ENABLE_FEAT_F4HWN_NARROWER` | Variante de filtre FM plus étroite et menu associé | Adapter à la largeur du système ; ne modifie pas le raster VFO |
| `ENABLE_FEAT_F4HWN_VOL` | Réglage logiciel de l’audio RX | Différent du bouton et du gain RF |
| `ENABLE_FEAT_F4HWN_AUDIO` | Profils/traitement audio RX F4HWN | Choisir ensuite le profil audio ; ne corrige pas une fréquence mal réglée |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | Affichage audio en RX/TX | Ne mesure pas la puissance RF ni la qualité de modulation en laboratoire |
| `ENABLE_AUDIO_BAR` | Barre de niveau audio | Indicateur visuel, ne garantit pas l’absence de distorsion |
| `ENABLE_RSSI_BAR` | Barre d’intensité du signal | Le RSSI ne garantit pas un audio décodable |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | Cycle étendu d’écoute A/B et priorités | Vérifier RxMode et la destination de réponse TX ; pas quatre récepteurs parallèles |

## Balayage, mémoires et journal

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_FASTER_CHANNEL_SCAN` | Améliorations de vitesse du balayage des canaux de la base | Différent du mode rapide supplémentaire F4HWN |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | Modes rapides de balayage F4HWN | Peut manquer des signaux courts ou la reconnaissance des tonalités |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | Indication de progression du balayage | Ne modifie pas à elle seule la liste ou la plage |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | Informations RSSI pendant le balayage | À interpréter avec le bruit/l’atténuation, pas comme une distance |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | Informations sur les sous-tons/codes détectés pendant le balayage | Confirmer la tonalité avant de la programmer pour TX |
| `ENABLE_SCAN_RANGES` | Balayage dans les plages configurées | Configurer correctement les limites et le pas |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | Modifie le délai de recherche des codes/sous-tons de la base | Ce n’est pas le TOT TX ; vérifier la consommation et la sortie du mode |
| `ENABLE_COPY_CHAN_TO_VFO` | Copie des paramètres de mémoire vers le VFO | Copie temporaire ; ne remplace pas l’enregistrement de la mémoire |
| `ENABLE_KEEP_MEM_NAME` | Conservation des noms de mémoire dans les opérations prises en charge | Vérifier la destination lors de l’écrasement de canaux |
| `ENABLE_FEAT_F4HWN_MEM` | Page SysInf sur l’utilisation de la Flash et de la SRAM | Informations mémoire du programme, pas une extension des canaux ou de l’EEPROM |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | Restauration de l’état opérationnel à l’allumage | Peut reprendre le balayage/le spectre ; vérifier avant les essais |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | Action de réinitialisation des paramètres VFO | N’équivaut pas à restaurer l’étalonnage ou toutes les données |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | Journal de l’activité RX/TX dans la Flash externe | Confidentialité, espace de stockage consommé et compatibilité du format |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | Réutilisation circulaire du journal lorsqu’il est plein | Peut remplacer les anciennes entrées ; exporter si vous devez les conserver |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | Accès/présentation de RF Log par les outils K5Viewer | Nécessite une version et un protocole d’outil compatibles |

## Interface, écran et énergie

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_BIG_FREQ` | Affichage agrandi de la fréquence | Réduit l’espace disponible pour d’autres données selon la disposition |
| `ENABLE_SMALL_BOLD` | Petite police en gras | Modifie la lisibilité, pas les paramètres du canal |
| `ENABLE_CUSTOM_MENU_LAYOUT` | Ordre/disposition personnalisés des menus | Les numéros de menu ne sont plus une référence stable entre les builds |
| `ENABLE_BOOT_BEEPS` | Sons au démarrage | Vérifier le volume et les écouteurs |
| `ENABLE_VOICE` | Annonces vocales disponibles dans la base | Ne pas présumer de la langue ni de la couverture complète des menus |
| `ENABLE_SHOW_CHARGE_LEVEL` | Affichage du niveau de charge | Estimation ; ne prouve ni la capacité ni l’état du chargeur |
| `ENABLE_REVERSE_BAT_SYMBOL` | Variante d’orientation/affichage du symbole de batterie | Visuel uniquement |
| `ENABLE_PWRON_PASSWORD` | Contrôle d’accès à l’allumage | Risque de verrouillage ; ne chiffre pas la mémoire et ne remplace pas la sécurité physique |
| `ENABLE_FEAT_F4HWN_CTR` | Contrôle du contraste | Régler SetCtr pour l’écran concerné |
| `ENABLE_FEAT_F4HWN_INV` | Inversion de l’écran | Réglage visuel |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | Compteurs RX/TX visibles | N’est pas une limite d’émission ; celle-ci est configurée par TOT |
| `ENABLE_FEAT_F4HWN_SLEEP` | Deep sleep/extinction sur inactivité selon le firmware | Vérifier SetOff avant les longues sessions |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | Traitement/indication de charge USB-C selon la carte et le firmware | Ne modifie pas l’électronique de charge et ne rend pas sûre une batterie endommagée |
| `ENABLE_FEAT_F4HWN_LOGO` | Logo/interface de démarrage F4HWN | Ne prouve pas la provenance de l’image |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | Logo/présentation en économie d’écran | Peut conditionner le menu SetSav |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | Regroupement des menus par catégories | Les emplacements diffèrent de la liste classique |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | Sélecteur d’actions/raccourcis | Vérifier les affectations courtes/longues pour éviter un TX accidentel |
| `ENABLE_FEAT_F4HWN_QRCODE` | Codes QR d’informations/liens | Ouvrir des liens ne fait pas partie de la sauvegarde et ne certifie pas le fichier |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | Écran/contrôle compatible avec un visualiseur externe | Ce site n’implémente pas toutes les fonctions du visualiseur |
| `ENABLE_FEAT_F4HWN_GAME` | Jeu intégré dans le profil qui le prend en charge | Occupe de la Flash/RAM ; différent des applications de jeux Labs |
| `ENABLE_FLASHLIGHT` | Fonction lampe torche/LED du matériel | Ne modifie pas la radio et ne signale pas un mode bootloader universel |

## TX, transfert et profils régionaux

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_VOX` | Émission déclenchée par la voix/l’audio | Régler la sensibilité ensuite ; OFF dans les deux builds Bricohams livrées |
| `ENABLE_TX1750` | Génération d’une tonalité d’accès 1750 Hz | Uniquement si le système l’exige et avec autorisation |
| `ENABLE_DTMF_CALLING` | Logique d’appels/identification DTMF | N’équivaut pas au DMR ; configurer les ID et les durées avec le correspondant |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | Traitement de fin de tonalité CTCSS par déphasage | Uniquement si le récepteur/relais l’utilise ; ce n’est pas du chiffrement |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | Modifie les objectifs de puissance basse/moyenne de la base | Vérifier avec des instruments ; ne pas l’utiliser comme étalonnage universel |
| `ENABLE_AIRCOPY` | Fonction de transfert AirCopy | Nécessite la compatibilité des deux extrémités ; ne copie pas le MCU complet de ce site |
| `ENABLE_AIRCOPY_UART` | Variante de transfert par UART | Le câble/protocole et le firmware doivent correspondre |
| `ENABLE_AIRCOPY_FLASH` | Fonctions AirCopy liées à la Flash | Opération avancée sur les données ; ne pas présumer une restauration sûre entre révisions |
| `ENABLE_FEAT_F4HWN_PMR` | Profil/contraintes liés au PMR | N’homologue ni l’antenne, ni la puissance, ni l’équipement pour un service libre |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | Profils régionaux de bandes/services des États-Unis | Les exigences légales dépendent du service et du matériel ; non applicables universellement |
| `ENABLE_FEAT_F4HWN_CA` | Profil des limites de bandes canadiennes de la base | À ne pas confondre avec Carrier Aggregation ou un récepteur supplémentaire |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | Profil d’interface/d’utilisation RescueOps | N’autorise pas les fréquences professionnelles et ne transforme pas le matériel en dispositif de sécurité certifié |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | Outil RX de recherche du signal avec atténuation/historique | Différent du firmware ARDF temporisé et d’un localisateur GPS |
| `ENABLE_FEAT_F4HWN_BEACON` | Balise Morse intégrée | Peut émettre automatiquement ; la laisser désactivée jusqu’à une configuration légale et contrôlée |
| `ENABLE_FEAT_F4HWN_BEAM` | Transfert Beam de paramètres de canal/VFO par paquets de la base | Le payload inspecté comprend fréquence, offset, tonalités, mode et nom. Nécessite des extrémités/protocoles compatibles ; ce n’est ni une antenne directive ni APRS |
| `ENABLE_F_CAL_MENU` | Menu d’étalonnage de la référence RF | Nécessite des instruments et une procédure ; ne pas activer pour résoudre un problème USB |

## Autres paramètres, non booléens

### Options historiques ou non exposées par le formulaire actuel

Leur existence est confirmée dans les presets par commit ; cela n’implique pas une prise en charge actuelle.
Pour les anciennes fonctions non vérifiées sur matériel, l’objectif du code est conservé
sans donner de séquences opérationnelles spéculatives.

| Option | Explication | Précaution/configuration ultérieure |
| --- | --- | --- |
| `ENABLE_ALARM` | Fonction d’alarme de la base historique | Peut générer de l’audio ou du TX selon l’implémentation ; ne pas activer pour tester un port ni l’utiliser comme système de secours |
| `ENABLE_AM_FIX` | Corrections de gain/réception AM de branches historiques | Ne transforme pas le TX en AM et n’améliore pas toutes les conditions RF |
| `ENABLE_AM_FIX_SHOW_DATA` | Diagnostic visible de la correction AM | Nécessite la fonction correspondante ; pas un étalonnage automatique |
| `ENABLE_BLMIN_TMP_OFF` | Gestion temporaire du rétroéclairage minimal dans les branches qui l’incluent | Vérifier la logique des touches/de l’économie de cette version ; n’agit pas sur la sensibilité |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | Service TriVFO du système overlay dans les presets qui le déclarent | Non exposé par le catalogue web ; ne pas présumer trois récepteurs physiques ni la compatibilité avec des applications d’une autre release |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | Action de réinitialisation de canal des branches antérieures | N’équivaut pas forcément à RESET_VFO ; vérifier la portée avant de perdre des réglages |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | Code de capture d’écran des anciennes versions | Peut utiliser un protocole/outil différent du K5Viewer actuel |
| `ENABLE_NAVIG_LEFT_RIGHT` | Sélection de disposition de navigation dans les presets historiques | Ne pas le copier vers les versions avec SetNav sans vérifier la migration |
| `ENABLE_REGA` | Signalisation historique de test/alarme du réseau de secours REGA via des tonalités ZVEI | Peut activer automatiquement le TX. Ne pas tester sur des fréquences d’urgence ni l’affecter habituellement à des touches ; exige l’autorisation et la procédure du service |
| `ENABLE_TX_WHEN_AM` | Autorise un chemin TX lorsque le mode de réception AM est sélectionné dans la base historique | Ne garantit ni une modulation AM en sortie ni une autorisation légale ; ne pas activer pour tenter d’émettre sur l’aéronautique ou d’autres services |

### Paramètres d’identité et outils

| Paramètre CMake | Signification | Traitement ici |
| --- | --- | --- |
| `CMAKE_BUILD_TYPE` | Niveau de configuration de compilation | Release du builder local |
| `TARGET` | Nom de l’exécutable/artefact | bricohams du builder local ; ne désigne pas automatiquement le matériel cible |
| `EDITION_STRING` | Identité de l’édition affichée | Bricohams dans le builder local, en conservant l’identité du protocole upstream |
| `VERSION_STRING_1/2` | Versions des composants affichées | Ne pas les modifier pour contourner la validation |
| `AUTHOR_STRING`, `AUTHOR_STRING_1/2` | Attribution et identité de l’upstream | Conserver les avis et la compatibilité ; ne pas revendiquer la paternité d’autrui |
| `SQL_TONE` | Paramètre de la base utilisé dans des configurations spécifiques | Non exposé par --option ; ne pas le modifier selon une recette SA818 sur une radio normale |
| `SOURCE_DATE_EPOCH` | Horodatage de compilation reproductible | Fixé au commit dans le builder local ; ne règle pas l’horloge de la radio |

Ces valeurs arbitraires ne sont pas autorisées dans le constructeur local via
`--option`. La liste des booléens/valeurs par défaut et la signification de « absent »
figurent dans [la matrice générée](F4HWN-PRESETS.md).

## Vérification d’une combinaison

1. Choisir la version et le preset comme un tout, sans copier des flags d’un autre commit.
2. Ne modifier que le nécessaire et enregistrer la demande.
3. Compiler et traiter les erreurs de dépendances, de RAM, de Flash et d’isolation RAM.
4. Vérifier le binaire, les métadonnées, la carte mémoire et SHA256SUMS.
5. Préparer le slot sans écriture ; vérifier que l’inspecteur l’accepte.
6. Effectuer un essai physique contrôlé avec une sauvegarde originale et une procédure de récupération connue.

Une compilation réussie ne prouve ni les performances RF, ni l’absence de bugs, ni la compatibilité des données avec tous les firmwares de l’historique.

## Sources

- [Presets du catalogue v6.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [CMake des fonctions v6.1 inspecté](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/CMakeLists.txt).
- [Informations mémoire dans SysInf](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [Payload Beam inspecté](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/app/beam.c).
- [Module historique REGA, référence sur l’objectif](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/App/app/rega.c).
- [README et manuels de l’upstream](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- Catalogue versionné `f4hwn-options.js` et constructeur `scripts/build-bricohams.cjs`
de ce dépôt.