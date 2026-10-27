# Validation intégrale UV-K5 V3, Android et firmware Bricohams

Auteurs : Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF et Pedro
Roca, fondateurs et membres de la direction de Bricohams.
Informations : <https://bricohams.org> et <https://bricohams.com>.

Révision initiale : 26-10-2026. **Audit en cours ; il ne s’agit ni d’un certificat de
fonctionnement ni d’une révision exhaustive achevée.** Les avertissements et
attributions de code, photos et documents de tiers sont conservés.

## Identification de la livraison

Le fait que deux APK indiquent `0.8.1-beta` ne suffit pas : le commit, le SHA-256 de l’APK,
la signature et les hachages des sources doivent identifier exactement la livraison testée.

| Livraison | Identité | Éléments probants |
| --- | --- | --- |
| Arbre de travail initial | Base `42fa5e014b270b929b58f7fd2fee2a28f482d1c0`, modifications locales | Android host, lint et APK vérifiés au cours de cette révision |
| Main publié consulté | `01c58563e6507d17bd2bec612ef669840abfeddb` | Révision isolée sans remplacement des modifications locales ; inclut General/POTA/SOTA et la nouvelle liste de passages |
| APK installé sur le mobile | Non identifié | Aucun mobile visible dans ADB ; non vérifié |
| Firmware du slot SAT actuel | L’utilisateur indique le slot 3 | Aucun port radio détectable ; index, banque, CRC et version en attente |

Résultats de la révision isolée du dépôt publié : **93 tests Android host
réussis, zéro échec/erreur**, lint sans erreur et 13 avertissements, APK debug
compilée. SHA-256 de cette reconstruction :
`b739992a1b4cba67fdd87e97efdf5408e84f549068b51043d854da094ed1152d`.
Ce n’est pas le hachage d’une APK téléchargée du site web ni installée sur un mobile.
La correction CRC locale n’est pas incluse dans cette reconstruction de main.

Les 13 avertissements lint des deux révisions correspondent à deux dépendances
de test disposant de versions plus récentes, cinq avertissements du dictionnaire anglais
sur « satelite », un candidat au pluriel, trois traits d’union typographiques, une ellipse
et la forme de l’icône. Aucune dépendance ni marque n’est modifiée pour les masquer.

Le site web publié n’est pas nécessairement identique à l’arbre local. Le contenu de l’APK
téléchargeable ne peut pas non plus être déduit du texte d’un guide.
Les tests de la base locale ne doivent être attribués ni à la révision publiée
ni à une APK non identifiée.

![Chaîne fonctionnelle des contacts, des canaux par slot et de CAT](../../atlas/android-cat-validacion.svg)

Ce dessin est une représentation fonctionnelle propre au projet, et non un schéma électrique.
Il ne contient ni connexions internes, ni valeurs de composants, ni niveaux de tension
inférés. Les cartes des broches et de la mémoire se trouvent dans l’
[atlas](ATLAS-UV-K5-V3.md).

## Niveaux de preuve

1. Source examinée : démontre l’implémentation prévue, pas son exécution.
2. Test host/JVM/Robolectric : vérifie les scénarios simulés précis.
3. Android instrumenté : nécessite un appareil/émulateur identifié.
4. Radio réelle : nécessite une version, un slot, une banque et une configuration identifiés.
5. Mesure RF/électrique externe : nécessite un instrument, une connexion et une procédure.

Un ACK d’écriture ne remplace ni une relecture, ni la persistance après redémarrage, ni
une mesure RF. Un test SQLite sur ordinateur ne certifie pas la mémoire du mobile.
L’état final de chaque scénario doit indiquer le niveau et les éléments probants ; ne pas
transformer « non exécuté » en « correct ».

## Constat corrigé : CRC de sauvegarde Android

`QuanshengMemory.verifyFlash` demandait `0x073E` sur 2097152 octets d’un seul coup.
La commande de référence limite chaque requête à 4096 octets. Le mock
acceptait cette plage impossible et masquait l’erreur. Le site web vérifiait déjà par
secteurs ; Android avait besoin de la même correction.

La correction locale interroge les 512 secteurs en vérifiant adresse/longueur/état,
puis compare le CRC de chaque secteur aux octets lus. Le CRC local total n’est renvoyé
qu’après vérification de tous les secteurs. Une défaillance, y compris sur le dernier
secteur `0x1ff000`, bloque la sauvegarde et n’autorise pas l’écriture.
Elle ne supprime pas les sauvegardes existantes, ne calibre pas la radio et n’écrit pas de secteurs.

Le mock impose désormais 4096 octets et vérifie que tous les secteurs sont demandés.
Un test de corruption du dernier secteur et un rejet de plage incomplète avant l’envoi
des commandes ont été ajoutés. Tests host de la base locale :
92 réussis après l’ajout des limites, de l’annulation et de l’écran des canaux, zéro
échec/erreur ; lint sans erreur et 13 avertissements. L’APK debug
est compilée, mais cette correction n’est ni publiée ni installée sur un mobile.

SHA-256 de l’APK locale reconstruite après ces corrections :
`cd9d3bfd3bfe0405be23995dd906aae63614ec9d38de1a1ff8cea1997156ab25`.
Ce hachage remplace la reconstruction locale précédente ; il n’identifie ni l’APK
publiée ni celle installée.

Le manifeste généré par `build-android.ps1` est également corrigé : il ne déclare plus
inexistants CAT PTT, SSTV TX et la programmation des canaux, qui sont implémentés à titre expérimental.
Cela ne transforme pas ces fonctions en fonctions certifiées.
## Annulation et limites de l’éditeur Android

Un autre problème a été détecté lors du suivi du cycle de vie : la fermeture de l’écran
plaçait la fermeture du transport en file d’attente derrière la tâche active.
Par conséquent, une copie ou une longue écriture pouvait continuer à envoyer des blocs
alors que l’interface déclarait déjà la session terminée.

La connexion conserve désormais une génération de session et vérifie qu’elle est toujours
active et au premier plan avant chaque échange. Les tâches en file d’attente vérifient
également leur génération avant de commencer. La fermeture reste exécutée par le worker
pour libérer le transport dans l’ordre, mais elle n’autorise pas de nouvelles commandes
d’une opération annulée. La réponse d’une commande déjà envoyée peut rester en attente,
ou la commande peut avoir été appliquée : aucun rollback n’est promis.
Un timeout ou une annulation impose une reconnexion et une nouvelle sauvegarde.
Les erreurs ferment également le transport et suppriment la référence mémoire, pas
seulement l’autorisation de sauvegarde : appuyer de nouveau sur Sauvegarder ne réutilise
pas une connexion invalide. Un test d’écran injecte une défaillance de transport,
vérifie sa fermeture et confirme que la seconde tentative n’envoie pas d’autres commandes.

Les tests simulent une annulation après avoir masqué le premier canal : le bloc suivant
n’est pas envoyé et aucun enregistrement incomplet n’est réaffiché.
Ils annulent aussi la sauvegarde après son premier bloc Flash et vérifient qu’aucune
requête n’est faite pour le suivant et qu’aucun CRC n’est déclaré vérifié. La lecture
physique Flash exige une identification et valide les plages par soustraction afin d’éviter
tout débordement de `address + length`. Le dernier bloc valide est vérifié.
Les cas CRC rejettent les longueurs de réponse trop courtes ou trop longues, ainsi que
les adresses, longueurs de secteur ou états incorrects avant le secteur suivant.

## Contacts : portée et critères

Les contacts sont des QSO du journal de trafic, et non des contacts DMR de la radio ni
le répertoire téléphonique d’Android. La radio UV-K5 V3 de ce projet n’est pas
un terminal DMR. Il n’y a pas d’intégration à ContactsProvider.

| Cas | Vérification requise |
| --- | --- |
| Ajout | Enregistrer l’indicatif, l’UTC, la fréquence, le mode, les rapports et les notes ; vérifier l’ID et tous les champs |
| Persistance | Fermer complètement, rouvrir et redémarrer le téléphone ; sa présence à l’écran ne suffit pas |
| Modification | Même ID, un seul enregistrement, champs non modifiés intacts |
| Suppression | Annuler la confirmation conserve l’enregistrement ; confirmer ne supprime que celui sélectionné |
| Recherche | Majuscules, Unicode, aucun résultat, plus de 50 enregistrements ; exportation non tronquée |
| General/POTA/SOTA | Sélection et persistance du journal ; champs de station/référence ; isolation entre journaux |
| Doublons | Avertissement dans le journal, confirmation explicite ; ne pas fusionner les QSO d’activités différentes |
| ADIF | Aperçu, annulation sans écriture, longueurs, champs non conservés, UTC, déduplication |
| JSON | Aller-retour UTF-8, ID, conflits et rollback ; la restauration ne supprime pas les enregistrements précédents |
| Erreurs | Stockage saturé, URI annulée ou non inscriptible, fermeture/rotation et importation incomplète |
| Confidentialité | Copies privées ; ne pas intégrer d’indicatifs, d’emplacements ou de bases réelles au dépôt |

Les tests host existants couvrent SQLite et la réouverture, Unicode, CRUD,
l’importation atomique et la restauration. Les cas sur téléphone restent en attente.
L’exportation LoTW ne certifie ni la signature, ni l’envoi, ni l’acceptation par TQSL.

Les tests instrumentés de `RadioStoreTest` n’ouvrent ni ne nettoient plus
le `bricohams.db` de l’utilisateur. Chaque cas remappe ce nom vers une base privée
`instrumentation-<UUID>.db` et ne supprime que sa propre base à la fin.
Ils comprennent la réouverture après modification/suppression/restauration JSON, la
restauration répétée sans doublons et l’importation invalide sans persistance d’enregistrements partiels.
L’APK de test et lint ont été compilés correctement. **Ces tests n’ont été
exécutés ni sur un téléphone ni sur un émulateur** ; la compilation ne prouve pas
que leurs assertions ont réussi.

## Canaux et isolation par slot

L’éditeur Android actuel modifie les **canaux FM existants** : il n’équivaut pas au CRUD
complet du site web et ne permet pas de déduire l’ajout/la suppression/la copie entre slots.
Ne pas l’utiliser pour promettre la gestion des contacts DMR.

Avant chaque essai physique :

1. Identifier le matériel V3/PY32 et le firmware exact, pas seulement le nom du profil.
2. Lire l’inventaire multiboot, l’étiquette et le CRC ; noter séparément l’index interne et l’étiquette
   visible. Ne pas écrire en supposant que « slot 3 » correspond à l’index 3.
3. Confirmer la banque active et effectuer une sauvegarde complète vérifiée sur disque.
4. Choisir un canal de test de la banque active sans remplacer les données de l’utilisateur.
5. Tester nom/RX/TX/CTCSS/DCS/puissance/largeur/verrouillage TX, en évitant toute émission physique.
6. Relire tous les octets et comparer les régions protégées et l’étalonnage.
7. Redémarrer, vérifier la persistance ; changer de slot et vérifier que les autres banques
   conservent leurs hachages. Restaurer et vérifier l’original.
8. Une déconnexion, un timeout ou un rejet de bloc doit fermer la session et imposer
   une nouvelle lecture/sauvegarde ; une coupure ne doit pas être présentée comme une transaction atomique.

La commande d’écriture doit masquer les attributs concernés, écrire les enregistrements/
noms et restaurer les attributs avant la relecture. La carte d’étalonnage n’est pas modifiée
et les données d’une autre radio ne sont pas restaurées.

## CAT en SAT RX et Android

CAT RX est temporaire et distinct de l’écriture des canaux. F4HWN v6.1 à lui seul
e garantit pas la présence du module CAT Bricohams. Un QUERY valide et les capacités attendues
sont nécessaires, avec l’application SAT RX ouverte et CAT activé par la
touche 8. L’essai initial ne nécessite pas de PTT.

| Cas | Résultat attendu et éléments probants |
| --- | --- |
| Identification | Version correcte et photo/écran du slot actif, sans la déduire du nom |
| QUERY | Session active, capacités et fréquence cohérentes |
| SET RX VHF/UHF | ACK en attente suivi d’un QUERY appliqué ; comparer l’écran et la fréquence externe |
| Hors bande | Rejet explicite, sans changement de syntonisation |
| Bruit/CRC/séquence | Rejet ou timeout limité ; ne pas exécuter involontairement une commande ultérieure |
| STOP | Désactivation à distance et restauration confirmée ; vérifier également la sortie de l’écran |
| OTG déconnecté | Session fermée, message explicite et absence de syntonisation tardive |
| Rotation/background | Aucun worker dupliqué ni SET après abandon |
| Passage SGP4/Doppler | Observateur/TLE/heure identifiés ; comparer la prédiction et les mises à jour RX |
| Séparation persistante | Canaux et étalonnage identiques avant/après CAT |
| PTT lease | Essai séparé avec autorisation et charge/instrumentation appropriées, pas d’antenne à l’air par défaut |

Pour le PTT, vérifier l’armement local par la touche 9, le refus dû au verrouillage/
à la bande/à l’état, la libération par STOP/déconnexion, l’expiration du lease et la limite
de 120 s. L’émission TX n’est pas testée automatiquement et la puissance, les harmoniques
ou la fréquence ne sont pas certifiées sans instruments. Le mobile n’a pas le haut-parleur/
le microphone de la radio du seul fait de connecter CAT.
## Modifications matérielles : compatibilité et limites

La compatibilité d’une modification V1 ne s’applique pas au V3 au seul motif qu’ils partagent
le même boîtier. Le MCU, la mémoire et la RF sont différents. La référence K1 teardown consultée
confirme PY32F071, 128 KB Flash, 16 KB SRAM et mémoire SPI 2 MB ; elle ne démontre pas
qu’une modification précise s’applique à toutes les révisions de carte V3.

| Famille | Classification pour cet audit | Éléments manquants avant recommandation |
| --- | --- | --- |
| Antenne externe/adaptateur | Accessoire, pas une modification de carte | Connecteur exact, contrainte mécanique, ROS et bande ; un gain en RX ne garantit pas une émission TX sûre |
| USB-C/OTG/données | Interface existante | Câble de données, hôte/autorisation, alimentation et énumération réelles |
| Câble série USB Kenwood | Dépend de l’adaptateur et du brochage | Niveaux et câble approprié ; ne pas connecter directement le RS-232 |
| EEPROM V1 étendue | Non directement applicable | Le V3 utilise une Flash SPI, ne pas insérer une EEPROM par analogie |
| SI4732/SSB/HF de V1 | Non vérifié pour V3 | Carte, alimentation, bus, espace, firmware PY32 et essais RX |
| LNA/filtres satellite | Non vérifié | Schéma de cette révision, impédances, sélectivité, saturation, isolation du TX |
| Filtre passe-bas TX | Non vérifié | Fréquence, puissance, pertes, ROS et mesure des harmoniques sur charge |
| Modification des bobines/27 MHz | Non extrapolable depuis V1 | Schéma, valeurs mesurées, stabilité et conformité ; ne pas publier de valeurs inventées |
| Extension Flash SPI | Non prise en charge par les cartes actuelles | JEDEC, tension, brochage, commandes, secteurs, bootloader et chaque lecteur/écrivain |
| ESP32/coprocesseur | Projet d’adaptation, pas plug-and-play | Bus et arbitrage, niveaux, alimentation et pilote V3 dédié |
| SWD/débogage | Sous réserve de la carte et du firmware | Pads confirmés, niveaux, sauvegarde et récupération sans effacer l’étalonnage |
| Audio/discriminateur | Non vérifié | Schéma analogique, isolation, charge et essai sans injecter de tension dans l’ADC/DAC |
| Batterie/charge/puissance | Hors de la validation actuelle | Ne pas modifier les cellules/protections ni augmenter la puissance avec des instructions non vérifiées |

La radio n’a été ni ouverte ni modifiée pendant cet audit. Il n’existe aucune
preuve permettant de certifier toutes les modifications possibles. Les schémas de
connexion interne complets nécessitent des photos des deux faces de la carte exacte,
un traçage de continuité hors tension ainsi que l’identification des valeurs et boîtiers
par une personne qualifiée ; ils ne se déduisent pas d’un schéma fonctionnel.
Les protections de batterie, RF et d’étalonnage ne sont pas omises.

## Documentation et génération du firmware

Sources principales :

- [Atlas matériel et cartes V3](ATLAS-UV-K5-V3.md).
- [Builds, formats BHA1/BHT1 et résident autonome](BRICOHAMS-FIRMWARE.md).
- [Android : stockage, CAT, canaux, autorisations et limites](ANDROID.md).
- [Configuration et sécurité des banques](AYUDA-CONFIGURACION.md).
- [Guide Quansheng](AYUDA-QUANSHENG.md).
- [État de la livraison](ESTADO-ENTREGA.md).

La révision intégrale doit confronter tous les documents et HTML générés au code et aux manifestes,
et pas corriger uniquement la page principale. Les historiques de livraison
conservent leurs anciens résultats et ne sont pas réécrits pour leur attribuer
de nouvelles validations.

Consigner pour chaque build : commit/dirty, toolchain et flags, licences, carte/
taille Flash-RAM-pile, hachages des sources/BIN/APK, format et adresse de chargement,
matrice de tests, erreurs connues et procédure de récupération.
Les problèmes déjà constatés comprennent un CRC hors de la limite du firmware,
un mock trop permissif, un manifeste Android obsolète, des différences entre main
publié/local, la base de temps du résident et l’absence de pilote physique pour le
transfert des applications. Le guide du résident documente les corrections et ne
confond pas une compilation reproductible avec une exécution validée.

### Régression de cette révision

Après intégration du guide dans l’aide, le serveur local et la liste des installateurs :
283 tests web réussis, zéro échec, et `npm run check` réussi.
Ces éléments probants concernent l’arbre local modifié, et non le main publié.
La compilation de l’instrumentation Android et `lintDebug` se terminent également
correctement ; aucune APK n’a été installée et aucune commande n’a été envoyée à la radio.

Lors de la vérification des appareils, seul COM3 Intel AMT SOL apparaît et la
liste ADB est vide. COM3 n’est pas utilisé à la place du port Quansheng.
L’énumération de la radio et l’autorisation ADB du téléphone sont nécessaires avant
d’exécuter les essais physiques décrits.

### Contraste documentaire réalisé

| Document ou groupe | Contraste et correction de cette révision | Limite |
| --- | --- | --- |
| Architecture | Suppression de l’affirmation selon laquelle il n’existe pas d’écriture des canaux Quansheng ; distinction entre lectures antérieures et essais en attente | Ne certifie pas les protocoles d’autres équipements |
| État de la livraison | La matrice historique est conservée et l’identification de la base locale par rapport au main publié est ajoutée | Les anciens résultats ne sont pas réécrits |
| Android | CRC sectoriel, annulation, fermeture après erreur et base d’instrumentation isolée | Le manuel local ne décrit pas automatiquement l’APK publiée la plus récente |
| Atlas V3 | Matrice des modifications sans extrapolation depuis V1, sources et absence de schéma complet vérifié dans les éléments consultés | Aucune mesure électrique ni continuité de cette unité |
| Bibliothèque de firmware | Liens AnyTone/Android/audit et distinction entre dérivés F4HWN et plateforme BHA1 | Répertorier ne signifie ni installer ni valider |
| Guide Quansheng | Sections du viseur, catalogue, slots et DFU révisées ; portée et CRC des essais précédents conservés | Démarrage SAT et écriture des canaux toujours en attente |
| Configuration, OpenGD77 et AnyTone | Contrôle des sauvegardes, de la modification locale et des limites d’écriture par famille | Une Quansheng ne valide pas le matériel DMR et ne convertit pas JSON/CSV en RDT |
| Exemples et ARDF | Provenance, licences et distinction entre ARDF officiel et module Bricohams | Aucun binaire tiers ni aucune modification RF ne sont certifiés |
| Bricohams | Identité de la gamme dérivée corrigée ; résident autonome et formats documentés séparément | USB/Flash physiques et budget RAM de l’intégration manquants |
| Karina, Dim0s et index tiers | État historique de l’enregistrement corrigé ; ZIP homonymes de 2296162 et 2161962 octets distingués par des hachages différents | Aucune source Karina vérifiée ni équivalence entre les deux ZIP |
| Déploiement, ADR et marque | Recommandation d’une origine dédiée séparée de Pages réellement partagé ; URL historiques conservées avec précision ; thème Android orange comparé aux ressources | Aucune migration automatique des données ni validation visuelle sur appareil |
| Communauté et licences | Les recherches négatives sont décrites avec leur portée, et non comme preuve d’inexistence ; l’absence d’autorisation de redistribution vérifiée n’est pas présentée comme un avis universel | Toutes les licences à distance n’ont pas été réauditées |
| HTML et empaquetage | Guides régénérés et vérifiés à l’aide de tests de liens, serveur, Pages/exportateur et installateurs | Aucune nouvelle version n’a été publiée |

Ce tableau consigne le périmètre examiné ; il ne déclare pas que toute la documentation
ni tous les dépôts externes ont été révisés ligne par ligne.
Les autres sections et sources doivent être confrontées avant la clôture exhaustive demandée.
L’absence d’incidents observés n’est pas transformée en certification du fonctionnement
de tous les composants.

Dans la plateforme portable, la mémoire scratch du stockage a été réduite de 5184
à 4160 octets conformément à la limite combinée BHA1, soit une économie de 1024 octets
sans réduire les paquets valides. Neuf tests CTest réussissent, y compris le transfert
JS/C et le chargement du maximum avec 3072 octets de code plus 1024 de données.
Il ne s’agit pas encore d’une mesure de la RAM/pile du résident avec USB/Flash intégrés.

### Nouvelle validation locale du 27-10-2026

Dans l'arbre de travail actuel, `npm test` se termine avec 285 tests
réussis et zéro échec ; `npm run check` se termine également avec succès.
Les tests Android n'ont pas pu être relancés : Gradle a trouvé Java 8,
alors qu'Android Gradle Plugin 8.7.3 exige Java 11 ou ultérieur, et aucun
autre JDK installé n'a été trouvé. Les suites CTest n'ont pas non plus pu
être reconstruites : CMake n'a trouvé ni NMake ni compilateur C disponible.
Ces blocages relèvent de l'environnement de validation et ne sont pas
des résultats de tests du code. Aucun test instrumenté, USB, radio
ou RF n'a été exécuté.

## Clôture et certifications en attente

Aucun certificat n’est délivré tant que l’APK installée, le téléphone/Android,
le firmware et le slot/la banque ne sont pas identifiés, que les cas physiques sans perte
ne sont pas exécutés, que les éléments probants ne sont pas conservés en privé et que
les défaillances/réparations ne sont pas consignées avec un nouvel essai.
Un audit logiciel satisfaisant ne certifie ni l’homologation RF, ni la sécurité électrique,
ni toutes les modifications de tiers.