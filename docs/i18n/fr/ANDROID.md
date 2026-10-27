# Bricohams Android Beta

## Périmètre de l’APK

L'écran principal propose **Langue du système**, **Español**, **English (US)**,
**Français** et **Deutsch**. Le choix est enregistré localement et s'applique à tous les
écrans, y compris les canaux USB, CAT, satellites et SSTV. Les indicatifs, noms de canaux
et fichiers utilisateur ne sont pas traduits ; la marque reste Bricohams.

Internet est utilisé uniquement sur demande pour les TLE/fréquences HTTPS de CelesTrak et SatNOGS, sans envoyer de données personnelles. L’import hors ligne reste disponible. Cette révision conserve les fonctions 0.8.0 et prépare les APK 0.8.1-beta, versionCode 10. Tests, lint et compilation exigent JDK 17 et SDK 35 ; cette intégration ne les a pas validés localement avec Java 8. La CI doit vérifier la nouvelle APK avant distribution.

Lors de l’envoi ultérieur du tag v0.5.2, Android Beta joindra les deux APK 0.8.1-beta (app debug et tests instrumentés) et SHA256SUMS-android à la release créée par les installateurs. Aucune publication locale.

La [validation intégrale V3/Android](VALIDACION-INTEGRAL-V3-ANDROID.md) distingue
les tests sur l’hôte des essais sur téléphone/radio et inclut la matrice des contacts,
les canaux par slot et CAT. L’audit est en cours, il n’est pas certifié.

Application native Kotlin pour Android 8.0/API 26 ou version ultérieure, sans serveur
ni compte. Il s’agit d’une implémentation indépendante : elle
n’inclut aucun code ni ressource de Look4sat, Robot36 ou HAMRS.
La version `0.8.1-beta` ne remplace pas l’ensemble de leurs fonctionnalités.

| Fonction | État |
| --- | --- |
| Contacts du journal de trafic | Création, recherche, consultation, modification et suppression avec confirmation ; SQLite local |
| Échange de contacts | Exportation/importation ADIF ASCII avec aperçu, JSON UTF-8 et restauration d’une sauvegarde JSON |
| LoTW | Exportation ADIF pour TQSL sur ordinateur ; aucune signature ni télétransmission depuis Android |
| ARDF | Sessions persistantes, balises 1-10, historique, compteurs, intervalles par balise et somme filtrée de segments GPS |
| GPS | Position ponctuelle du téléphone, avec précision et heure de la position, après autorisation préalable |
| Exportation ARDF | JSON avec sessions, observations, contacts et coordonnées lorsqu’elles existent |
| Morse à partir de texte | Points/traits ; espaces entre lettres et `/` entre les mots |
| Morse à partir d’un fichier audio | WAV PCM mono 16 bits expérimental, tonalité/vitesse configurées |
| Microphone | Capture au premier plan jusqu’à 60 s et décodage ultérieur Morse/Robot36 ; sans écoute ni décodage continus |
| USB/CAT RX | CDC ACM et adaptateurs USB-série reconnus à un seul port, identification F4HWN v6+, interrogation, réglage temporaire confirmé et STOP ; expérimental |
| CAT TX (PTT) | Envoi Robot36 avec PTT via lease armée sur la radio (touche 9), indicatif obligatoire, limite de 120 s, rejet en cas de TX lock et de bande interdite ; expérimental |
| Satellites | SGP4 hors ligne, catalogue TLE importé, observateur manuel, prévision sur 24 h et suivi Doppler RX par CAT pendant le passage sélectionné |
| SSTV Robot36 | Décodage WAV ou capture microphone, également avec réglage CAT, et encodeur Robot36 pour l’envoi par PTT CAT ; expérimental |
| Écriture des canaux, sous-tons et puissance | Éditeur de canaux FM F4HWN v6 par USB avec sauvegarde complète et relecture |

L’interface utilise le PNG original Bricohams et un accent orange sur fond sombre.
L’icône conserve la marque originale au lieu d’inventer une variante ; lint
signale sa silhouette non conventionnelle de lanceur. La palette du site web n’a
pas encore été modifiée : sa migration finale reste à faire.

## Installation et données

L’APK de développement est signée avec la clé debug de l’outil Android,
et non avec une identité de distribution Bricohams. Vérifiez le SHA-256 publié
avec elle. Ce n’est ni une version Google Play ni une livraison stable.
Android demandera l’autorisation d’installer depuis l’application qui ouvre l’APK.
Aucun pilote n’est installé et la radio n’est pas modifiée.
Les commandes CAT RX facultatives modifient temporairement la fréquence de réception,
pas la programmation persistante de la radio.

Les données sont enregistrées dans une base SQLite privée à l’application. Il n’y a
ni télémétrie, ni service de localisation en arrière-plan,
ni téléversement de données personnelles. La permission INTERNET sert uniquement
aux téléchargements HTTPS de données satellites demandés. La sauvegarde automatique et le transfert des données
système sont désactivés dans le manifeste/les règles d’extraction.
**Exportez avant de désinstaller :** la désinstallation efface les données locales.
La restauration JSON démarre depuis Accueil et ne supprime jamais les données existantes.

Les exportations utilisent le sélecteur de fichiers Android ; aucun accès général
au stockage n’est nécessaire. Le fournisseur choisi peut être distant : choisir
un service cloud implique de partager le contenu avec ce fournisseur. Le JSON contient
des données personnelles et des emplacements ; vérifiez sa destination et ne le publiez pas.
Aucun certificat LoTW n’est demandé ni stocké.

Avant de migrer SQLite schéma 1, la base intacte est copiée dans `bricohams-v1-backup.db`, en stockage privé. La migration est transactionnelle : les contacts passent dans Général ; en cas d’échec, le schéma 1 reste intact.

## Journal de trafic

Les contacts sont regroupés par activité : Général (toujours présent), POTA et SOTA. Changer de carnet sélectionne le carnet actif. Créez un carnet avec nom ASCII, modèle, référence (POTA `EA-0123`, SOTA `EA4/MD-001` ; vide pour Général) et indicatif de station, obligatoire en POTA/SOTA. La saisie rapide conserve fréquence et mode ; le RST non modifié passe entre 59 et 599 selon phonie/CW-RTTY. UTC vide utilise l’heure actuelle au moment d’Enregistrer. Recherche, import et export ADIF portent sur le carnet choisi ; JSON inclut tous les carnets. POTA propose `INDICATIVO@PARQUE-AAAAMMDD.adi`.

Avant sauvegarde, l’avertissement de doublon compare indicatif, bande ADIF (ou fréquence hors bandes), mode et jour UTC pour POTA/SOTA. Ne pas enregistrer conserve le formulaire ; Enregistrer quand même ajoute le contact. `EA2XYZ` et `EA2XYZ/P` sont distincts. L’import ADIF ignore uniquement les contacts identiques sur tous les champs conservés. ADIF exporte BAND, STATION_CALLSIGN et MY_POTA_REF/MY_SOTA_REF si applicables ; les champs d’activité importés et BAND incohérent sont signalés non conservés. Pas de recherche en ligne ni d’envoi POTA/SOTA ; les carnets ne peuvent être renommés ou supprimés.

1. Ouvrez Journal et saisissez l’indicatif, l’UTC ISO, la fréquence en MHz, le mode,
   les rapports envoyé/reçu et les notes.
2. Enregistrez le contact. La liste affiche les 50 derniers ; l’exportation les inclut tous.
3. Modifier ouvre le contact avec son ID d’origine ; l’enregistrement ne crée pas de doublon.
   La suppression nécessite une confirmation et est irréversible.
4. Exportez en ADIF pour l’échange/TQSL ou en JSON pour conserver tout le texte.

La date est interprétée comme un instant ISO ; ADIF la convertit en UTC. Les fréquences
acceptées par le formulaire, de 0.1 à 1300 MHz, n’autorisent pas à émettre.
Les modes d’une entrée n’affirment pas que la radio les prend en charge.
Les formulaires non enregistrés sont abandonnés lors d’un changement de section.
La rotation conserve les champs de la section actuelle grâce à l’état Android.

ADIF inclut CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD et COMMENT.
L’exportation ASCII refuse les notes comportant des accents, des sauts de ligne ou d’autres
caractères non admis : elle ne les supprime ni ne les remplace silencieusement.
Le JSON conserve l’UTF-8. L’exportation ne certifie pas qu’un contact sera accepté par LoTW ;
la signature, l’envoi, la réponse du service et la confirmation sont des étapes distinctes.

### Rechercher des contacts

Dans Journal, saisissez une partie de l’indicatif, des notes, du mode, de la fréquence ou de l’UTC,
puis appuyez sur Rechercher des contacts. La comparaison ignore la casse ; elle ne supprime
pas les accents et n’interprète ni plages ni expressions régulières. Le nombre total
correspondant et les 50 correspondances les plus récentes s’affichent. Afficher tous les contacts
supprime le filtre. La recherche appliquée survit à la rotation ; appuyer sur Rechercher
recrée le formulaire et abandonne les modifications non enregistrées. L’exportation inclut
toujours tous les contacts, et pas seulement les correspondances.

### Importer un ADIF avec aperçu

Dans Journal, appuyez sur Importer un ADIF (aperçu). Le sélecteur accepte tout fichier,
mais le contenu est validé comme ADIF texte ASCII, jusqu’à 16 MiB et 50000 contacts.
Chaque en-tête ou enregistrement est limité à 512 champs.
ADX/XML, UTF-8 et les autres formats binaires ne sont pas pris en charge. La lecture respecte
la longueur déclarée : un texte comme `<EOR>` dans COMMENT ne termine pas l’enregistrement.
Un en-tête avec EOH ou des enregistrements sans en-tête sont acceptés, ainsi que les étiquettes
insensibles à la casse et les suffixes de type ADIF. Chaque enregistrement doit se terminer par EOR.

Champs requis : CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM ou HHMMSS),
FREQ en MHz, MODE, RST_SENT et RST_RCVD. COMMENT est facultatif. Les mêmes limites
que pour la saisie manuelle des contacts s’appliquent ; les modes comme FT8
ne sont pas convertis silencieusement en d’autres modes. Une heure HHMM est représentée
avec les secondes 00. Le format ne conserve pas les fractions de seconde à l’exportation.
La fréquence n’est pas déduite de BAND et les rapports manquants ne sont pas inventés.

L’aperçu indique le nombre de contacts et les **champs non conservés**,
par exemple BAND, SUBMODE, GRIDSQUARE ou les données de confirmation LoTW. Les
métadonnées d’en-tête ne sont pas intégrées aux contacts. Conservez le fichier original :
cette importation ne remplace pas sans perte n’importe quel ADIF.
Annuler n’enregistre rien. Un fichier mal formé ou un enregistrement invalide annule
l’ensemble avant de proposer l’importation. Les étiquettes dupliquées, les dates impossibles
et les longueurs tronquées sont explicitement signalées comme erreurs.

Après validation, tout est ajouté dans une transaction SQLite. En cas d’échec d’une insertion,
la transaction est annulée. Les enregistrements dont les champs conservés sont identiques
à ceux d’un autre enregistrement existant ou du même fichier sont ignorés : indicatif, instant UTC,
fréquence numérique normalisée, mode, les deux rapports et les notes. Si l’un de ces champs
diffère, un nouveau contact est ajouté ; aucun contact n’est remplacé en fonction de l’indicatif/de l’heure.
De nouveaux ID internes sont générés ; les ID externes ADIF ne sont pas utilisés.
Réimporter le même contenu ne duplique pas les contacts identiques. Les champs non conservés
ne participent pas à la comparaison. Exportez d’abord une copie JSON et vérifiez les compteurs
du résultat.

Gardez l’écran ouvert jusqu’à la validation de l’aperçu. Faire pivoter/fermer l’écran avant
la validation abandonne l’aperçu sans rien enregistrer. Une importation déjà validée
peut se terminer en arrière-plan même si cet écran est fermé ; consultez le journal
avant de la répéter. Aucun service d’importation persistant n’existe.

### Restaurer une sauvegarde JSON

Depuis Accueil, appuyez sur Importer une sauvegarde JSON Bricohams et sélectionnez une sauvegarde
version 1 exportée par cette application. Le fichier est limité à 16 MiB
et à 50000 enregistrements par table. L’UTF-8, le format, les champs, les ID,
les contacts, les dates, les coordonnées et les références entre sessions/observations sont validés.
Les fichiers ADIF et les JSON d’autres applications ne sont pas importés.

L’importation est transactionnelle : toute erreur annule toutes ses modifications.
Les nouveaux ID sont ajoutés ; les enregistrements identiques sont conservés sans duplication.
Un ID existant avec un contenu différent annule l’importation sans l’écraser. Les sessions
distinctes ne sont pas fusionnées par nom. La réponse indique le nombre de nouveaux
enregistrements ajoutés. Il ne s’agit pas d’une restauration destructive ni d’un remplacement
complet de la base.

## ARDF et GPS

1. Créez une session ou sélectionnez-en une existante.
2. Indiquez la balise 1-10 et les notes.
3. Si vous le souhaitez, appuyez sur Obtenir la position et acceptez l’avis de confidentialité
   ainsi que l’autorisation Android de localisation précise. Sans autorisation, vous pouvez continuer sans GPS.
4. Lorsque le GPS est activé, attendez une position récente ; une acquisition est demandée pendant
   un maximum de 30 secondes. Aucune position historique du fournisseur n’est utilisée.
5. Enregistrez l’observation. Seule une position acquise depuis 30 secondes au plus est acceptée,
   selon l’horloge monotone ; sa précision et son heure UTC GPS sont enregistrées séparément
   de l’heure d’enregistrement de l’observation.

Enregistrer sans position récente crée explicitement une observation SANS coordonnées et le signale.
Aucune position n’est fabriquée. Quitter l’écran, masquer/fermer l’activité ou terminer la demande
annule les mises à jour. Les positions signalées comme simulées par Android sont écartées.
Chaque position acquise ne sert qu’à une observation au maximum ; demandez-en une autre
pour obtenir une nouvelle mesure.

La coordonnée est celle du téléphone, pas de l’émetteur. Il n’y a ni triangulation,
ni relèvement, ni RSSI, ni suivi continu, ni carte, ni synchronisation avec les statistiques
RAM du firmware, ni classement automatique des balises trouvées.
Les compteurs correspondent à des observations manuelles. Ces fonctions restent à développer.

### Statistiques et historique ARDF

Dans la session sélectionnée, appuyez sur Statistiques et observations de la session.
Le panneau lit la base SQLite persistante et affiche :

- Le nombre d’observations et celles qui comportent des coordonnées.
- L’intervalle entre la première et la dernière observation, et non le temps d’activité ni
  la durée écoulée depuis la création de la session. Zéro ou une observation donne 0 s.
- Pour chaque balise : le nombre, les premiers/derniers instants UTC, le nombre avec coordonnées
  et l’intervalle moyen entre les enregistrements. Avec une seule observation, aucune moyenne n’est disponible.
- Les 100 dernières observations avec notes, UTC et coordonnées/précision/heure de position acquise,
  ou SANS coordonnées. L’exportation JSON les inclut toutes.

La somme des segments GPS utilise la formule de Haversine sur une sphère de rayon 6371008.8 m,
uniquement entre observations consécutives du téléphone. Les deux observations doivent déclarer
une précision <=50 m et une position acquise entre 0 et 30 s avant l’enregistrement.
Les heures d’enregistrement et d’acquisition doivent être croissantes, séparées d’au plus
120 s. Une observation sans GPS, imprécise, ancienne ou future rompt la séquence : elle n’est
pas ignorée pour relier les points de part et d’autre. Les positions répétées ou les horaires
identiques ne produisent pas de segment. Le nombre de segments est indiqué.

**Ce n’est ni le parcours complet**, ni une distance réellement parcourue, ni la distance jusqu’à
une balise, ni une vitesse, ni un score de course. Il n’y a pas de filtre de bruit GPS :
la dérive peut augmenter la somme même en l’absence de mouvement. Les interruptions peuvent
la réduire. Les segments ne sont pas interpolés et le fait d’observer une balise ne signifie
pas qu’elle a été trouvée. Les données importées conservent leur UTC ; les changements d’horloge
et la précision du fournisseur influent sur les résultats. Les statistiques sont recalculées
sans modifier les données ni le format JSON.

## USB CDC et CAT RX expérimental

Depuis Accueil, ouvrez CAT RX USB expérimental et choisissez explicitement un périphérique
par VID, PID, contrôleur et nom. Le téléphone doit prendre en charge l’USB host/OTG.
Sont pris en charge **CDC ACM standard**, avec une interface de contrôle et une interface de données bulk,
ainsi que les adaptateurs reconnus CH34x, CP210x, FTDI ou Prolific à un seul port. Les périphériques
composites ambigus/à plusieurs ports sont refusés ; aucun port n’est choisi au hasard.
L’application demande l’autorisation USB Android avant d’ouvrir le périphérique.
Si le système recrée l’écran à l’octroi de l’autorisation, sélectionnez-le de nouveau.
La connexion n’est pas automatique au branchement d’un câble.

Les pilotes USB-série proviennent de **usb-serial-for-android 3.9.0**,
dont la licence MIT est incluse dans les assets et la livraison. Seule sa table
de périphériques reconnus est utilisée ; aucun VID/PID inconnu n’est forcé vers un pilote.
La dépendance est figée et JitPack est limité à ce module.
Aucun accès root ni pilote externe n’est nécessaire sur le téléphone.
Un câble fonctionnant comme COM sous Windows n’est pas forcément compatible
avec Android. De même, tous les ports USB-C Quansheng ne transmettent pas de données.
L’implémentation ne certifie pas encore le câble physique UV-K5 V3 ; OpenGD77
et AnyTone n’utilisent pas ce protocole CAT.

L’image Bricohams Satelites avec CAT RX v1, basée sur F4HWN v6+, est requise.
Le F4HWN d’origine n’intègre pas ce module au motif qu’il reconnaît sa version.
Aucun firmware n’est installé depuis cet écran :

1. Démarrez SAT RX sur la radio et activez CAT physiquement avec la touche 8.
2. Sélectionnez le bon périphérique et accordez l’autorisation Android.
3. L’application configure CDC à 38400, 8N1, s’identifie avec
   `0x0514/0x0515` et interroge `0x7B00/0x7B01`.
4. Interrogez l’état ou saisissez des MHz par pas exacts de 10 Hz :
   136-174 ou 400-470 MHz. Une réponse mise en file d’attente ne signifie pas que
   le réglage a été appliqué ; une vérification est effectuée jusqu’à confirmation,
   pendant dix tentatives au maximum.
5. Chaque SET est valable pendant un lease de **3000 ms** dans le firmware. Le panneau
   manuel ne renouvelle pas automatiquement le lease. Le suivi des passages décrit
   ci-dessous ne le renouvelle que pendant une session démarrée explicitement.
6. STOP demande la fréquence nominale. Lorsque l’écran est masqué, les SET non envoyés
   sont annulés, un STOP est tenté si un état distant/une opération est en attente,
   puis les interfaces/la connexion sont libérées. Une déconnexion USB invalide la session.
   Pour reprendre, il faut se reconnecter ; un réglage antérieur n’est pas rétabli.

L’état correspond à la dernière réponse du firmware, pas à une mesure RF. QUERY ne
renouvelle pas le lease. En cas de déconnexion du câble, la livraison de STOP n’est pas
garantie : l’erreur est signalée et le lease ne restaure la fréquence nominale que si
la boucle de la radio continue de fonctionner. Vérifiez la fréquence sur la radio.
Le CRC, le XOR et la vérification de séquence détectent les erreurs de protocole,
mais ne constituent ni chiffrement ni authentification. CAT RX n’effectue pas de TX/PTT
(CAT TX est distinct) et ne touche ni au firmware, ni à l’EEPROM, ni à l’étalonnage.
L’édition des canaux est distincte et se fait dans l’éditeur de canaux.

Les opérations USB sont sérialisées hors du thread d’interface ; les octets restants
des paquets bulk sont conservés et les transferts partiels sont vérifiés.
Aucun service d’arrière-plan n’est utilisé. Ces fonctions disposent de tests
avec USB simulé ; les essais OTG et RF avec un téléphone/une radio réels restent à faire.

## Éditeur de canaux Quansheng par USB (Beta)

Correction locale de l’audit : le CRC physique est demandé sur 512 secteurs de
4096 octets, et non au moyen d’une commande de 2 MiB dépassant la limite `0x073E`. Sont
vérifiés l’adresse, la longueur, l’état et le CRC de chaque secteur, y compris le dernier.
Cette correction nécessite de reconstruire et d’installer l’APK ; elle ne modifie pas
à elle seule une version déjà téléchargée. Consultez le
[rapport de validation](VALIDACION-INTEGRAL-V3-ANDROID.md).

Écran « Éditer les canaux Quansheng par USB (Beta) ». C’est le port Android de l’éditeur
web : mêmes commandes F4HWN v6, même sauvegarde et même écriture avec relecture.
Il ne modifie que les canaux FM existants.

1. Choisissez le câble (OTG avec CDC ou adaptateur USB-série reconnu) et connectez-le.
   La radio est identifiée avec `0x0514`. F4HWN v6.0 est en lecture seule.
2. Sauvegarde complète : étalonnage de 512 octets, Flash externe de 2 MiB par blocs de
   128 octets avec `0x0738`, CRC-32 vérifié par la radio avec `0x073E` et firmware Main
   validé par son en-tête `FMB1` et son CRC. L’opération dure 10-20 minutes à 38400 bauds ;
   l’écran reste allumé. La sauvegarde est stockée dans l’espace privé de l’application
   avec `SHA256SUMS`. Labs v6.1+ est requis.
3. Lire les canaux : configuration logique de 41344 octets (`0x051B`).
4. Choisissez un canal et modifiez le nom, RX, TX, la tonalité RX et TX (OFF, CTCSS en Hz comme
   `88.5` ou DCS comme `D023N` / `D023I`), la puissance (USER, LOW1-LOW5, MID, HIGH),
   la bande étroite et le verrouillage TX. Fréquences de 136-174 et 400-470 MHz dans la
   même bande, comme sur le web. Les autres bits du canal sont conservés.
5. Appliquez à la copie locale : la radio n’est pas encore écrite.
6. Écriture : confirmez, vérifiez de nouveau la sauvegarde par SHA-256 et contrôlez que
   la radio est toujours identique à sa lecture. Les canaux concernés sont masqués,
   les blocs de 8 octets sont écrits (`0x051D`), réaffichés, puis la configuration complète
   est relue. Si la relecture diffère, cela est signalé et le résultat n’est pas déclaré valide.
   VFO, paramètres, étalonnage et banques sont protégés.

Déconnecter, quitter l’écran ou rencontrer une erreur ferme la session : reconnectez-vous
et effectuez une nouvelle sauvegarde avant toute écriture. L’opération n’est pas
transactionnelle face à une coupure d’alimentation. Redémarrez la radio après l’écriture.

## Satellites SGP4 et suivi des passages

Depuis Accueil ouvrez Satellites. L’interface redessinée utilise le code et les couleurs Bricohams, sans ressources Look4sat : compte à rebours AOS/LOS et onglets **Passages**, **Carte**, **Satellites**, **Réglages**.

Le moteur **satellite.js 6.0.1** (MIT), distribution UMD de la web, fonctionne avec **Rhino 1.7.15** (MPL 2.0). Licences et liens source inclus. SHA-256 :
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
Un seul contexte Rhino partagé exécute les assets fixes, jamais du code téléchargé, sans accès Java.

1. **Données :** Réglages télécharge le groupe amateur CelesTrak (256 KiB maximum) et les émetteurs SatNOGS DB (16 MiB, CC BY-SA 4.0), uniquement sur demande HTTPS, jamais en arrière-plan. Les émetteurs vivants et actifs doivent appartenir au catalogue et avoir une descente 136-174 ou 400-470 MHz par pas de 10 Hz. Si SatNOGS échoue, les nouveaux TLE conservent les anciennes fréquences avec avertissement. L’import TLE hors ligne reste possible. Fichiers privés atomiques ; lignes de 69 caractères, checksum et NORAD vérifiés ; Alpha-5 et NORAD en double rejetés. Expiration après sept jours ; époque au-delà de 24 h dans le futur rejetée et fenêtre entière valide exigée.
2. **Observateur :** latitude/longitude en degrés, hauteur WGS84 en **km** (-0.5 à 9). Utiliser la dernière position GPS demande la localisation et copie le dernier point GPS/réseau avec âge et précision. Vérifiez puis Enregistrer et calculer les passages. Élévation minimale 0-60 degrés.
3. **Satellites :** recherche par nom/NORAD, cases et raccourcis Tous, Avec RX, Aucun. Le premier téléchargement sélectionne les satellites avec RX dans les bandes.
4. **Passages :** les prochaines **24 h** se remplissent progressivement. Cartes avec NORAD, nom, élévation maximale, jour et AOS/LOS locaux, azimuts, modes, compte à rebours et progression. Échantillonnage 5 s, croisements affinés à 500 ms ; sous l’horizon, pas adaptatif multiple de 5 s préservant la grille web et bornant l’élévation pour ne manquer aucun croisement (moins de 0.3 degré/s même à 200 km). AOS/LOS utilisent le seuil choisi ; maximum échantillonné, non optimisé en continu.
5. **Détail :** touchez carte ou en-tête : radar polaire (nord en haut, horizon au bord, zénith au centre ; AOS vert, LOS rouge, position orange interpolée entre 60 points SGP4), azimut/élévation/distance/Doppler en direct, UTC et descente SatNOGS ou MHz manuels. Connecter CAT : Doppler, SSTV et enregistrement ouvre CAT avec ce passage.
6. **Carte :** côtes Natural Earth 1:110m hors ligne, domaine public, satellites, couverture au-dessus de 0 degré, observateur et trajectoire sélectionnée sur 45 min avant/après. Touchez pour sélectionner ; actualisation toutes les 5 s si visible.

Position, sélection et dernière descente de chaque satellite sont conservées en privé, hors JSON de terrain. Aucun uplink déduit ; transpondeurs linéaires non pris en charge.

### Doppler RX du passage sélectionné

Sélectionner un passage ouvre CAT avec un instantané du TLE, de l’observateur,
de la liaison descendante et de la fenêtre. Aucune connexion USB ni commande n’est envoyée
par cette seule action. Connectez le périphérique, passez en SAT RX et activez CAT avec 8 sur
la radio. Appuyez sur **Démarrer le Doppler du passage sélectionné** uniquement lorsque
vous êtes dans la fenêtre. Aucun démarrage n’est programmé en arrière-plan.
L’orbite est propagée à l’instant présent et la vitesse radiale est calculée
par différence de distance centrée sur une seconde. La correction reçue est
`f_rx = f_nominal * (1 - velocidad_radial / 299792.458 km/s)`, arrondie à
10 Hz. L’élévation doit être non négative, le TLE valide et la fréquence RX dans la bande.
Seuls des SET RX temporaires sont envoyés, jamais de TX/PTT, de canaux ni d’EEPROM.

Après chaque confirmation, une attente de 750 ms précède la mise à jour suivante,
même si l’arrondi ne change pas la fréquence ; cela renouvelle le lease de 3 s.
Aucune seconde opération USB simultanée n’est mise en file d’attente. Le suivi s’arrête
à la fin du passage, à l’expiration du TLE, à l’horizon, en cas de déconnexion/erreur,
de réponse non appliquée, d’intervalle/de confirmation de 2 s ou plus, d’horloge répétée/à rebours
ou de saut UTC par rapport à l’horloge monotone supérieur à 500 ms. Les commandes
manuelles sont verrouillées pendant le suivi ; la commande d’arrêt reste utilisable.

Arrêter, masquer l’écran ou déconnecter annule les futurs SET, tente un STOP et ferme l’USB.
Un retour ne reprend pas le suivi : il faut se reconnecter et démarrer une nouvelle session.
En cas d’échec de STOP, une notification est affichée, sans affirmer que la fréquence est rétablie.
Le lease n’est utile que tant que la boucle du firmware continue de fonctionner. L’écran
présente les calculs et la dernière confirmation, pas une mesure RF ni une position réelle
vérifiée. La validation de l’ensemble téléphone/câble/firmware/radio sur le terrain reste à faire.

### Enregistrer le passage et rechercher SSTV

Dans CAT, Enregistrer le passage complet (WAV jusqu’à LOS) capture le microphone pendant le Doppler. Reliez le haut-parleur radio au téléphone. Capture 48 kHz, moyenne 3:1 vers **WAV 16 kHz mono** privé, environ 1.9 MB/min. Arrêt à LOS, deux heures, arrêt manuel ou sortie ; en-tête WAV valide même en cas d’erreur. Incompatible avec la réception Robot36 de 60 s simultanée.

Satellites, Réglages, Enregistrements de passages affiche durée et taille. SSTV analyse des fenêtres de 60 s tous les 23 s pour contenir une image complète de 37 s, élimine les doublons séparés de moins de 10 s et sauvegarde les PNG près du WAV. Exporter copie le WAV au choix. Supprimer efface WAV et PNG associés après confirmation, sans annulation possible. Les tests synthétiques ne certifient ni réception RF ni matériel AudioRecord réel.

## Morse WAV expérimental

Le sélecteur accepte des fichiers audio, mais l’analyseur exige un fichier RIFF/WAVE PCM linéaire
mono 16 bits, de 8-48 kHz, durant 0.1-60 secondes et limité à 8 MiB. Il refuse le format float,
la stéréo, le MP3, les données tronquées et les longueurs incohérentes.

Configurez la tonalité réelle entre 300 et 1200 Hz et la vitesse entre 5 et 45 mots par minute.
Le détecteur utilise des fenêtres d’environ 5 ms et l’énergie Goertzel de la tonalité ;
il interprète les durées des marques et des espaces selon la vitesse configurée. Il n’estime
automatiquement ni la vitesse ni la fréquence. Ce n’est ni une reconnaissance vocale ni
une mesure de confiance statistique. La sortie affiche le texte, les points/traits et un avertissement
d’incertitude ; `?` signale les codes non reconnus, pas toutes les erreurs possibles.

Des enregistrements faibles, le bruit, l’évanouissement, le décalage de tonalité, une synchronisation
irrégulière ou une configuration erronée peuvent produire un texte faux, même si `?` n’apparaît pas.
Comparez le résultat avec l’audio. Gardez l’écran ouvert pendant le calcul : une modification
de la configuration ou la fermeture de l’activité peut supprimer le résultat en cours.
L’importateur WAV ne capture pas le microphone et aucune transmission n’a lieu.

## SSTV Robot36 depuis un WAV

Depuis Accueil, ouvrez SSTV Robot36 depuis un WAV et appuyez sur Décoder un WAV Robot36.
Sélectionnez un RIFF/WAVE PCM linéaire mono 16 bits, limité à 8 MiB, durant 37-60 secondes
et avec une fréquence d’échantillonnage de **8/16/24/32/40/48 kHz**. Le 44.1 kHz,
le MP3, le format float et la stéréo ne sont pas pris en charge. La sélection d’images à transmettre
n’est pas disponible. L’audio doit contenir l’en-tête complet : amorces à 1900 Hz, rupture
à 1200 Hz, VIS **8** avec parité paire, arrêt et les 240 lignes Robot36.
Le mode n’est pas deviné à partir d’une image partielle et les autres VIS ne sont pas acceptés.

L’implémentation maison utilise une transformée de Hilbert FIR pour estimer la fréquence instantanée
et aligner le premier porch. La durée est de 150 ms par ligne : synchronisation 9 ms, porch 3 ms,
luminance 88 ms, séparateur 4.5 ms, porch 1.5 ms et chrominance 44 ms. La luminance comporte
320 échantillons par ligne ; la chrominance, 160 échantillons, partage Cr/Cb entre paires de lignes.
La conversion YCbCr pleine gamme vers RGB limite les valeurs à 0-255. Référence technique consultée :
[Robot36 d’Ahmet Inan, révision fixe](https://github.com/xdsopl/robot36/tree/5860ded4716170b562c3e915c7eebb879742dcd4),
publiée sous licence CC0. Aucun code C ni aucune image de ce projet n’est inclus.
Il ne s’agit ni d’une recompilation ni d’une copie de l’application Android Robot36.

Les fréquences d’échantillonnage prises en charge sont réduites à 8 kHz par moyennage de blocs.
Ce n’est ni une entrée audio professionnelle ni une suppression complète de l’aliasing/du bruit.
Il n’y a pas de compensation de dérive d’horloge, d’inclinaison, de Doppler, de bruit,
d’audio tronqué ni de récupération de lignes. La synchronisation et le séparateur de couleur
de chaque ligne sont vérifiés. Si des données manquent ou si la synchronisation est perdue,
l’opération échoue et ne fournit ni image complète ni ancien PNG.
Détecter l’en-tête/les lignes ne prouve pas que tous les pixels sont corrects.

Après le décodage, une image de **320x240** est affichée. Enregistrer l’image PNG ouvre
le sélecteur Android. Le fournisseur choisi peut être un service cloud : choisissez la destination
en tenant compte du contenu privé de l’image. L’image n’est pas enregistrée automatiquement
dans la galerie. Elle reste en RAM ; la rotation ou la fermeture supprime l’aperçu. Exportez-la
au préalable. En cas d’échec de l’écriture PNG, le fichier partiel est supprimé.

L’importateur WAV n’utilise ni microphone, ni audio USB, ni PTT et n’émet pas ; il ne modifie
pas la fréquence de la radio depuis cet écran. La capture facultative s’ouvre séparément comme
indiqué ci-dessous. Le comportement avec des enregistrements RF et des chemins audio physiques
reste à valider. Les tests synthétiques ne remplacent pas ces vérifications.

## SSTV Robot36 par CAT : réception réglée et envoi avec PTT

Dans l’écran CAT, sous la connexion USB, trois actions SSTV sont disponibles.

**Recevoir.** Démarrez le Doppler du passage ou réglez manuellement la fréquence, branchez
le haut-parleur de la radio à l’entrée audio du téléphone, puis appuyez sur *Enregistrer Robot36
(CAT continue le réglage)*. L’enregistrement utilise la même capture de 60 s que l’écran
microphone et n’interrompt pas le suivi CAT, qui fonctionne dans un autre thread. Appuyez sur
*Arrêter l’enregistrement et décoder* lorsque l’image est terminée.

**Envoyer.** L’image Bricohams Satelites avec CAT TX v1 est requise (commande
`0x7B02`, voir `BRICOHAMS-FIRMWARE.md`). Étapes :

1. Saisissez l’indicatif. **Il est obligatoire** : sans indicatif valide, le sélecteur ne s’ouvre pas,
   et celui-ci est imprimé dans la bande inférieure de l’image.
2. Branchez la sortie audio du téléphone à l’entrée microphone de la radio.
   Le port USB-C de la radio est réservé à CAT ; le téléphone doit disposer d’une prise jack 3,5 mm
   ou d’un hub OTG avec audio.
3. Sur la radio en SAT RX, appuyez sur la touche 9 : `CAT TX ARMED`.
4. Appuyez sur *Envoyer Robot36 par PTT CAT*, choisissez l’image (mise à l’échelle en 320x240),
   puis confirmez la boîte de dialogue avec la fréquence, l’indicatif et la durée (~37 s).

L’application interroge la PTT et n’émet pas si la radio n’est pas armée, si la limite est atteinte
ou si l’émission est refusée par la radio. Elle active la PTT, attend la confirmation de la radio et ne
qu’après cela reproduit l’audio, en renouvelant le lease toutes les 400 ms. Si un renouvellement
échoue (touche pressée sur la radio, limite atteinte, verrouillage) ou si l’écran passe en arrière-plan,
l’audio est coupé, la PTT est relâchée et l’opération est vérifiée par une nouvelle lecture.
Si cette relecture échoue, la radio relâche automatiquement la PTT après 1,5 s.
L’audio est limité à 110 s, en deçà de la coupure de la radio à 120 s.

L’émission utilise la fréquence TX du VFO de la radio, sans correction Doppler montante,
et n’est pas autorisée pendant le suivi d’un passage. Une licence et une fréquence autorisée
pour la SSTV sont nécessaires. **Aucune validation sur radio ni en RF.**

## Capture microphone Morse et Robot36

Depuis Accueil, appuyez sur Recevoir Morse / Robot36 avec le microphone. Sélectionnez le mode ;
pour Morse, saisissez la tonalité entre 300 et 1200 Hz et la vitesse entre 5 et 45 ppm.
Robot36 ignore ces deux champs. La permission `RECORD_AUDIO` n’est demandée qu’après avoir
appuyé sur Démarrer la capture audio. **Accorder l’autorisation ne démarre pas l’enregistrement** :
vous devez appuyer de nouveau sur Démarrer. Un refus n’empêche ni l’importation WAV ni l’utilisation
des autres fonctions. Aucune capture ne démarre à l’ouverture de l’application.

L’entrée est AudioRecord/MIC du système, PCM mono 16 bits à 48 kHz.
Android sélectionne le périphérique d’entrée ; il n’y a pas de sélection de chemin audio,
de contrôle du volume de la radio ni de garantie de compatibilité avec un adaptateur audio USB.
Le câble CAT ne transporte pas nécessairement l’audio. Si le matériel ne prend pas en charge
ce format, si l’ouverture échoue ou si l’entrée disparaît, une erreur s’affiche et la ressource
est libérée ; aucun audio n’est inventé. Testez d’abord avec un signal connu et vérifiez le niveau,
la saturation et le chemin audio.

Démarrez avant l’en-tête Robot36. Au moins 37 s et une image complète respectant les mêmes
limites de synchronisation que l’importateur WAV sont nécessaires. Appuyez sur Arrêter et décoder
lorsque le signal est terminé. La capture s’arrête automatiquement à **60 secondes**, selon
la limite d’échantillons et le minuteur ; aucun silence n’est ajouté. L’audio n’est conservé
en mémoire que pendant l’opération. Aucun fichier WAV n’est écrit et aucune donnée n’est envoyée
sur le réseau. L’image Robot36 peut être enregistrée en PNG à l’aide du sélecteur Android ;
le décodage Morse affiche le texte, les points/traits et un avertissement expérimental.

Annuler et supprimer l’audio, quitter, verrouiller le téléphone, ouvrir une autre activité ou faire
pivoter l’écran arrête la capture dès que l’application perd le premier plan, libère le microphone
et supprime le résultat en attente. **La capture ne reprend pas** au retour. L’aperçu d’image
ne survit pas à la rotation. Il n’existe ni service, ni enregistrement en arrière-plan, ni PTT,
ni TX, ni décodage continu en flux : la capture précède le décodage. Un résultat synthétique correct
ne valide ni la réception RF réelle ni le chemin du microphone d’un téléphone.

## Compilation

Prérequis : JDK 17, Android SDK 35, Build Tools 35.0.0 et accès aux dépôts officiels
de dépendances lors de la première compilation. Aucun SDK, JDK, certificat ou clé debug
n’est inclus dans le dépôt.

```powershell
$env:JAVA_HOME = 'C:\ruta\jdk-17'
$env:ANDROID_HOME = 'C:\ruta\android-sdk'
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

Le wrapper utilise Gradle 8.9 avec SHA-256 officiel figé. AGP 8.7.3 et Kotlin
2.0.21 sont figés. L’application utilise les vues Android et SQLite de la
plateforme, sans Compose, Room ni backend : cela réduit les dépendances d’exécution
et permet de vérifier en priorité le stockage et les permissions réels.
Les bibliothèques d’exécution sont usb-serial-for-android 3.9.0 et ses
annotations AndroidX, Rhino 1.7.15 et satellite.js 6.0.1 intégré comme asset.
JUnit, Robolectric et AndroidX Test
sont réservés aux tests.
Leurs licences ne remplacent pas celles d’Android, Gradle ou du projet.

Sorties :

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Rapports dans `android/app/build/reports/`.

Pour fournir un ensemble vérifié sous Windows, avec les mêmes prérequis :

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.8.1-beta'
```

La destination doit être nouvelle. Le script exécute les tests/lint, vérifie les signatures
APK et inclut l’application, l’APK instrumentée, le guide, les licences, `build-info.json`
et `SHA256SUMS`. Le manifeste indique la révision, l’état dirty, les sources par
hachage, les capacités et les fonctions indisponibles. Il précise toujours qu’il s’agit
d’une signature debug et que les essais physiques restent à faire ; une compilation ne devient
pas pour autant une version stable.

Avec un téléphone/émulateur de test connecté et autorisé par ADB :

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Utilisez un appareil de test. Chaque test instrumenté de persistance redirige
`bricohams.db` vers une base privée `instrumentation-<UUID>.db` ;
il n’ouvre ni n’efface le journal de trafic réel et ne supprime que sa propre base.
L’APK de test n’est pas l’application à utiliser au quotidien.

## Validation effectuée et à faire

La validation historique initiale comprenait 84 tests sur l’hôte : cinq sur les modèles/ADIF,
quatre sur l’importation ADIF, trois sur l’audio, huit sur le stockage/l’interface, huit sur le protocole CAT,
deux sur l’écran CAT, cinq sur le codec de canaux, cinq sur la mémoire/la sauvegarde/l’écriture Quansheng
et huit sur l’USB CDC/série simulé, quatre sur le cœur Robot36 (dont l’aller-retour de l’encodeur),
deux sur l’écran SSTV, quatre sur l’envoi SSTV par PTT CAT avec radio simulée,
trois sur SGP4/TLE, quatre sur le suivi, deux sur l’écran des satellites,
cinq sur la capture PCM, six sur l’écran microphone et six sur les statistiques ARDF.
Ils vérifient SQLite après fermeture/réouverture, mise à jour/suppression,
exportation JSON, coordonnées nulles/valides, démarrage des écrans,
enregistrement et recréation de l’activité, ordre UTC avec fractions et restauration
JSON idempotente avec rollback en cas de conflit/de données invalides. L’audio synthétique est comparé à
8/16/44.1/48 kHz et 5/15/30/45 ppm, y compris le silence et une tonalité incorrecte.
Il ne s’agit pas de mesures d’erreur sur des enregistrements réels.
ARDF vérifie 222.39016 m lors du franchissement de la ligne de changement de date à l’équateur
(tolérance de 0.01 m), l’ordre UTC, les moyennes par balise, l’isolation des sessions après
fermeture/réouverture de SQLite et l’affichage de l’historique.
Les interruptions, la précision, les positions acquises anciennes/futures/répétées,
les enregistrements simultanés et les ID dupliqués sont testés. Il ne s’agit pas de mesures GPS sur le terrain.
La capture vérifie exactement 2880000 échantillons pour la limite de 60 s,
l’arrêt manuel sans ajout de silence, l’annulation avant l’ouverture et pendant une lecture
bloquante, les erreurs explicites et la libération. L’écran vérifie l’autorisation sans démarrage
automatique, le décodage de Morse connu et Robot36 320x240 à partir d’une entrée simulée,
la reprise après échec, le minuteur et l’annulation à la sortie sans reprise.
Il ne s’agit pas de tests d’AudioRecord sur du matériel réel.

CAT vérifie le CRC avec un vecteur connu, les trames de toutes les longueurs,
le CRC `FFFF` des réponses upstream, l’identification, le bruit/délai d’attente, la séquence
et son dépassement, les bandes, l’annulation de SET et la distinction entre mise en file d’attente/application.
CDC vérifie les permissions, la sélection non ambiguë, la configuration, les écritures partielles,
la lecture d’un paquet en plusieurs appels, les erreurs et la fermeture.
Les adaptateurs série vérifient la sélection des contrôleurs par VID/PID,
le rejet des périphériques inconnus/à plusieurs ports, les paramètres 38400 8N1, la lecture fragmentée,
la propagation des erreurs sans répéter SET et la fermeture en cas d’échec de configuration.
Le test intégré parcourt l’écran, l’identification, SET RX et STOP avant
la fermeture au masquage de l’activité, à l’aide d’un appareil simulé.
Canaux : lecture des tonalités, de la puissance et des flags ; modification ne changeant que
les octets du canal ; aller-retour des 50 CTCSS et 104 DCS ; refus sans toucher à la copie.
Une radio F4HWN simulée vérifie la sauvegarde complète (CRC de la radio,
Main, étalonnage), le SHA-256 sur disque, l’ordre d’écriture web, la relecture et
les blocages en cas de paramètres, de radio modifiée, de v6.0, de CRC ou de bloc refusé.
L’audit ultérieur ajoute des contrôles des 512 secteurs CRC,
des métadonnées de réponse incorrectes, de la lecture physique sans identification ou avec
des plages dépassant un entier, ainsi que l’annulation de la sauvegarde/de l’écriture.
La session de l’éditeur est liée au premier plan et à sa génération : quitter,
déconnecter ou invalider la session empêche l’échange USB suivant et
abandonne les anciennes tâches qui n’ont pas encore commencé. Une commande déjà envoyée
peut avoir été appliquée ; l’annulation n’effectue pas de rollback et ne rend pas une écriture atomique.
Conservez la sauvegarde et répétez l’identification,
la lecture et la vérification avant toute nouvelle écriture. Les tests de l’écran
vérifient les erreurs sans USB et la suppression des copies de modification en quittant,
sans reprise automatique. Après une erreur, le transport est fermé et
une nouvelle connexion est nécessaire ; appuyer de nouveau sur Sauvegarder ne suffit pas.
Les résultats actuels, distincts de main
publié et des tests physiques, figurent dans la
[matrice de validation](VALIDACION-INTEGRAL-V3-ANDROID.md).
ADIF vérifie l’aller-retour, les étiquettes dans les commentaires, l’en-tête facultatif,
les heures à la minute, les champs non conservés, les enregistrements tronqués/invalides et l’ASCII.
SQLite vérifie les doublons et le rollback avec une véritable erreur d’insertion injectée.
L’interface teste la recherche après rotation et l’aperçu avec annulation/validation.
SSTV vérifie la géométrie 320x240, le début temporel, les niveaux de gris à
8/16/48 kHz et les barres RGB/CMY à 8 kHz : erreur maximale de 12 niveaux par canal
aux points intérieurs en gris et de 15 pour les points couleur testés.
Les VIS différents, parités incorrectes, silences, pertes de lignes
et fréquences/durées d’échantillonnage non prises en charge sont refusés. L’interface exporte un PNG,
qui est rouvert et vérifié en 320x240 ; aucune exportation n’est proposée après un échec.
Aucun taux d’erreur ni aucune qualité n’ont été mesurés sur des enregistrements réels.
SGP4 compare un TLE de test fixe avec le web : époque, azimut/élévation
(tolérance 0.00001 degré), distance (1 m), AOS/LOS (500 ms), maximum et
Doppler par pas de 10 Hz. La somme de contrôle, l’ancienneté, les bandes,
la fenêtre, le renouvellement sans changement de fréquence, l’annulation, les discontinuités
d’horloge, les réponses tardives/en attente et les erreurs USB sont vérifiés.
Le test combiné applique le Doppler calculé à une radio CAT simulée et rétablit la fréquence nominale avec STOP.
L’interface importe un catalogue, calcule les passages hors ligne, transmet
l’instantané sélectionné et refuse un passage expiré sans SET, en fermant l’USB.

L’APK et l’APK instrumentée compilent. Lint se termine sans erreur ;
il conserve les avertissements concernant les versions plus récentes des dépendances de test,
la forme de l’icône originale et la typographie. Ils ne sont ni supprimés ni considérés comme des défauts fonctionnels.

Aucun téléphone Android ni émulateur n’était connecté pendant cette validation.
Les tests instrumentés sont compilés, **mais n’ont pas été exécutés**.
L’installation, l’ergonomie et les autorisations sur téléphone, le GPS réel,
les chemins audio réels et toutes les fonctions signalées comme non implémentées restent à valider.