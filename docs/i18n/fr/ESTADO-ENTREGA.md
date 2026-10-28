# Revue des exigences et livraison

Révision du 25-10-2026. Le projet reste en Beta. Cette matrice distingue
les fonctions implémentées des essais physiques et objectifs en attente.
Une compilation réussie ne prouve pas qu’une radio a démarré avec celle-ci.
**Livraison incomplète :** des exigences restent à implémenter et à valider.

## Revue complémentaire du 26-10-2026

La matrice et les chiffres du 25-10 ci-dessous sont historiques. Pour l’audit
actuel, consultez [Validation intégrale V3 et Android](VALIDACION-INTEGRAL-V3-ANDROID.md) :
283 tests web locaux réussis, 92 tests Android host locaux et 93 dans la révision
publiée isolée `01c58563e6507d17bd2bec612ef669840abfeddb`.
Ce ne sont pas des résultats interchangeables. La correction locale du CRC sectoriel
Android n’est pas publiée. Les tests instrumentés utilisent une base isolée et
compilent, mais n’ont pas été exécutés sur appareil. Il n’existe pas de certificat
physique portant sur les contacts, les canaux ou le CAT du slot SAT actuel.

La révision publiée comprend les journaux General/POTA/SOTA et la liste des passages,
absents de cette base locale. Les éléments en attente AND-02/AND-06 de la matrice
historique doivent être interprétés selon la révision évaluée.
Le résident indépendant et les applications BHA1 sont expérimentaux : leurs tests
portables ne valent pas une prise en charge physique USB/Flash ni un démarrage validé.

## Demandes examinées

| ID | Demande | État et éléments probants | À faire avant de la considérer terminée |
| --- | --- | --- | --- |
| USB-01 | Charger et effacer des canaux PMR et des relais Quansheng | Connecteur, éditeur et protections implémentés. Deux lectures réelles concordantes de configuration et d’étalonnage ; 200 canaux sur F4HWN v6.0.0 | Sauvegarde intégrale et essais réels d’écriture, d’effacement et de relecture |
| USB-02 | Charger des satellites et des mémoires Doppler Quansheng | Planification SGP4, mémoires RX et CAT RX expérimental dans l’image Satellite | Validation RF et chargement physique des mémoires sur l’appareil |
| FW-01 | Catalogue des versions de firmware | Catalogue et guides par familles, révisions et options | Maintenir la couverture lors de nouvelles versions ; la reconnaissance n’équivaut pas à une compatibilité testée |
| WEB-01 | Publier et redéployer le site | Dernier main publié : `f7bd6125893385dd517fecd105967f241a65991f` | Publier les changements postérieurs et vérifier Pages ; aucune nouvelle publication dans cette révision |
| FW-02 | Documenter Karina de manière exhaustive | Dossier V1, pack V3/UV-K1 Dim0s, inventaires, empreintes et fonctions observées | Achever la comparaison fonctionnelle et visuelle ; le projet source n’a pas été retrouvé |
| FW-03 | Bricohams avec toutes les fonctions Karina | Implémentation indépendante sur la base ouverte F4HWN V3 ; ni copie ni recompilation de Karina | Parité fonctionnelle complète et tests par fonction ; les 100 % ne sont pas revendiqués |
| FW-04 | Multiboot et compilation modulaire à la demande | Constructeur avec commit figé, presets, modules séparés et vérification structurelle | Tester le démarrage, les changements de slot et la récupération sur V3 sans remplacer Main |
| FW-05 | Bibliothèque de firmwares existants dans les slots | Sélection locale et classement par format/modèle, avec rejet des fichiers incompatibles | Installer et tester chaque image compatible ; pas de conversion automatique V1 vers V3 |
| FW-06 | ARDF activable et séparé si l’ensemble ne tient pas | Image ARDF : cycles, synchronisation et mémoire manuelle d’atténuation | Essais sur le terrain et autres comportements documentés |
| FW-07 | Spectre et fonctions VFO-PRO | Image Spectrum : RSSI, peak hold, moyenne, presets RAM, exclusions, capture RX et recherche CSS | Vérifier RF/CSS et l’équivalence des fonctions en attente ; n’émet pas et n’étalonne pas |
| FW-08 | Conserver les presets du spectre | Export/import BHSP avec validation atomique et relecture | Persistance interne si nécessaire ; les fichiers ne sont pas une EEPROM |
| FW-09 | Licence MIT indiquée pour Karina | Déclaration consignée ; aucun avis vérifiable trouvé dans le pack | Identifier le titulaire, le composant et le texte de licence avant toute redistribution sous MIT |
| HELP-01 | Aide complète pour toutes les familles et options | Quatorze guides HTML, Android et cette révision compris ; 84 options d’interface, historique de 18 versions et 94 options historiques | Étendre l’aide à chaque nouvelle fonction ; ne pas revendiquer une couverture sans preuves |
| HELP-02 | OpenGD77 et tous ses modèles | Guide de configuration et matrice par familles/révisions | Essais physiques par modèle ; le catalogue ne certifie pas toutes les radios |
| PRO-01 | Mode PRO sans confirmations répétitives | Activation explicite par session et opérations protégées | Ne supprime ni les autorisations du navigateur, ni la sauvegarde, le CRC, les empreintes ou la protection de Main |
| DATA-01 | Configurer RepeaterBook dans la version installée | Formulaire fournisseur et serveur local avec token en mémoire | Essai avec des identifiants et une autorisation propres ; aucun token n’est inclus |
| DATA-02 | Télécharger automatiquement des contacts DMR | RadioID et sélection/import ; CSV dans le web quand CORS bloque l’API directe | Vérification par équipement et capacité ; tous les services n’autorisent pas l’accès direct depuis Pages |
| DATA-03 | Télécharger des salles/groupes DMR | Requête BrandMeister et import de groupes | Un groupe de conversation ne représente pas toutes les salles de tous les réseaux ; compléter les autres intégrations demandées |
| GD77-01 | CPS OpenGD77 complet sans rien installer | Édition standard, références, données et planification dans le navigateur | Flashage, voix, base massive d’ID, zones/réglages complets et parité avec un CPS externe non implémentés |
| GD77-02 | Sauvegarde automatique du firmware d’origine et de l’étalonnage avant opération | Étalonnage et codeplug automatiques avec empreintes ; résultat PARTIEL | Lecture complète du MCU vérifiée par modèle ; les opérations physiques ultérieures restent bloquées |
| ANY-01 | CPS AnyTone web | Section Beta avec projet JSON/CSV, import, édition et zones | USB, RDT natif et paramètres complets par modèle/firmware |
| ANY-02 | Codeplug avec relais numériques et analogiques d’Espagne | PMR et normalisateurs de RepeaterBook, RadioID et URE | Sources actuelles autorisées, couverture nationale vérifiée et codeplug natif du modèle exact |
| ANY-03 | Réutiliser les bases OpenGD77 et Quansheng | Imports de formats pris en charge en conservant les paramètres connus | Compléter et vérifier les champs non publiés ; ne pas inventer TS/TG |
| ANY-04 | Aéroports si AnyTone prend en charge la bande aéronautique | Import de fréquences RF depuis la source AIP et confirmation manuelle AM | Modèle exact, liste à jour et vérification AM/espacement ; aucune base nationale des aéroports n’est incluse |
| CAT-01 | Changer la fréquence pendant le passage sélectionné | CAT RX activé physiquement, lease de 3 s et suivi web avec arrêt sécurisé ; séparément, CAT TX v1 (PTT par lease, touche 9) réservé à l’envoi SSTV | Validation USB/RF réelle ; pas de suivi autonome dans la radio ni de Doppler montant |
| CAT-02 | Modifier fréquence, sous-tons et puissance par canal depuis Android | Éditeur de canaux Android Beta pour FM F4HWN v6 : nom, RX/TX, CTCSS/DCS RX et TX, puissance, étroit et verrouillage TX ; sauvegarde complète avec CRC de la radio et SHA-256 sur disque, écriture par blocs dans l’ordre web et relecture ; 10 tests host avec radio simulée | Exécuter les tests en CI, essai OTG réel avec écriture/relecture sur une radio et persistance après redémarrage |
| AND-01 | Application Android Bricohams | Projet Kotlin 0.8.3-beta ; SQLite, ADIF, SSTV, statistiques ARDF, capture micro et CAT RX via CDC ACM et adaptateurs reconnus, avec tests host | Fonctions en attente, installation, autorisations et essai OTG/RF de chaque câble sur téléphone |
| AND-02 | Fonctions satellite de type Look4sat, avec une interface similaire | SGP4 Android hors ligne, TLE importés, observateur manuel, passages sur 24 h et Doppler CAT RX avec arrêt sécurisé | Interface de type Look4sat (liste de passages, radar polaire, carte), téléchargements automatiques des TLE et transpondeurs, GPS de l’observateur, matrice téléphone/câble/radio et essais terrain ; aucune parité Look4sat revendiquée |
| AND-03 | SSTV Robot36 avec CAT sur le firmware Bricohams | Décodeur WAV et capture micro avec VIS/parité, couleur 320x240 et PNG ; l’écran CAT enregistre Robot36 pendant que Doppler ou la syntonisation CAT reste actif ; tests synthétiques | Validation AudioRecord, chemin physique et RF ; décodage continu en streaming, dérive et bruit |
| AND-04 | Interpréter le Morse | Texte, WAV PCM et capture micro jusqu’à 60 s avec décodage ultérieur et tonalité/vitesse fixes ; tests synthétiques | AudioRecord réel, décodage continu, adaptation et mesures d’erreur sur des échantillons réels |
| AND-05 | « SSTVEncrip » : encoder et envoyer de la SSTV comme SSTV Encoder (interprétation acceptée par l’utilisateur) | Encodeur Robot36 avec aller-retour par le décodeur ; envoi depuis l’écran CAT avec PTT CAT v1 du firmware (0x7B02) : armement radio par touche 9, lease de 1,5 s, coupure à 120 s, verrouillage TX, bandes, batterie et modulation radio, abandon par toute touche, indicatif obligatoire imprimé dans l’image et confirmation dans l’application ; tests C du noyau et de l’adaptateur et 4 tests host avec radio simulée ; image satellite compilée sans avertissement | Essai sur radio et mesure RF (niveau micro, déviation, LED, coupure par touche) ; autres modes SSTV (Martin, Scottie, PD) ; Doppler montant |
| AND-06 | Journal de trafic de type HAMRS | Contacts SQLite, recherche, édition/suppression, ADIF ASCII avec import/aperçu, JSON et restauration transactionnelle ; tests host | Flux et interface de type HAMRS (journaux par activité, modèles POTA/SOTA, saisie rapide), validation sur téléphone et ADIF étendu ; aucune parité HAMRS revendiquée |
| AND-07 | Téléversement vers LoTW | Objectif documenté ; ADIF/TQSL ne vaut pas téléversement direct | Signature, certificat, conservation des clés et flux LoTW vérifiable depuis Android |
| AND-08 | Statistiques de chasse au renard avec GPS | Le firmware exporte un résumé ; Android conserve les sessions, l’historique, les positions ponctuelles avec précision/UTC, intervalles par balise et somme filtrée de segments GPS sans relier les coupures, après autorisation | GPS réel, parcours continu, cartes, synchronisation avec firmware et statistiques terrain étendues |
| BRAND-01 | Marque Bricohams et bootlogos | Écran d’accueil et bitmap monochrome intégré ; Android conserve le PNG d’origine et l’accent orange | Vérifier le LCD physique et l’interface téléphonique |
| BRAND-02 | Orange corporate une fois terminé et testé | Palette documentée ; logo de l’entreprise conservé | Migration finale web/Android, contraste et régressions visuelles |
| DOC-01 | Documentation naturelle, sans personnalisation par IA | Révision éditoriale des attributions visibles et des récits conversationnels | Maintenir un style technique direct ; conserver licences et attributions légales |
| REL-01 | Push vers main à la fin | Autorisation de publication consignée | Clore les exigences ou convenir expressément d’une livraison partielle ; effectuer le push et vérifier CI/Pages |
| REL-02 | Nouveaux installateurs avec toutes les fonctionnalités | Chaîne existante pour Windows, Debian/Raspberry Pi, Arch et FreeBSD | Construire depuis la révision livrée et vérifier contenu/démarrage ; aucun nouvel installateur pour cette révision |
| REL-03 | ZIP contenant projet, firmware, installateurs et évolutions | Exportateur de développement préparé avec contrôle d’intégrité et exclusions | L’exécuter avec tous les artefacts livrés et vérifier l’extraction ; ne remplace pas les fonctions manquantes |

## Éléments probants logiciels les plus récents

- 211 tests JavaScript réussis dans cette révision, y compris l’export Android
avec extraction de l’archive ZIP et vérification de l’intégrité.
- Huit suites C réussies lors de la dernière validation du firmware ; cette révision
de documentation et de livraison ne modifie pas les sources C.
- Compilation ARDF avec statistiques : 113960 bytes RAW, RAM 12576/16384,
Flash 113072/120832 ; manifeste et dix empreintes sources vérifiés.
- Satellite CAT : 113868 bytes RAW. Spectrum avec BHSP : 118044 bytes RAW.
- Panneau ARDF présent et bloqué dans le navigateur hors connexion.
- Aucune de ces images n’a été flashée ni validée physiquement.
- Android 0.7 : APK et tests instrumentés compilés. Soixante-neuf tests JVM/Robolectric
réussis en CI, notamment USB/CAT simulé, ADIF, Robot36, SGP4,
capture/écran du microphone et statistiques/historique ARDF. Au 2026-10-26, 84 tests host
réussissent en local, dont ceux de l’éditeur de canaux (CAT-02) et ceux d’envoi SSTV par
PTT CAT (AND-05) ; leur première exécution en CI reste à faire. Zéro erreur et treize avertissements lint. Signatures et empreintes des 58 sources vérifiées ;
le manifeste de chaque build consigne le résultat qui lui correspond.
Les tests instrumentés sont compilés, pas exécutés ; aucun téléphone n’est connecté.

Ces chiffres sont des preuves datées, pas un compteur remplaçant les tests de chaque
révision. Les compilations précédentes restent des évolutions ; le nom d’un dossier
contenant `final` n’en fait pas une version stable.

## Conditions de livraison

1. Examiner chaque ID et clôturer son point en attente avec des éléments probants, ou consigner une modification de périmètre approuvée. Ne pas remplacer une exigence par un bouton ou un mock.
2. Tester le logiciel, la documentation, le démarrage local et les capacités réelles.
Pour le matériel : sauvegarde intégrale, identification et tests autorisés.
3. Appliquer et vérifier la palette orange après l’achèvement des fonctions.
4. Construire les installateurs depuis la même révision et vérifier contenu,
licences, intégrité et démarrage. Ne pas réutiliser d’anciens packages comme nouveaux.
5. Publier sur main, vérifier CI et Pages et consigner la révision publiée.
6. Exporter les sources, l’historique, les artefacts de firmware avec leurs sources et
licences, les installateurs et les évolutions vérifiables. Inclure inventaire et empreintes.
7. Extraire le ZIP dans un autre dossier, vérifier ses empreintes et tester le démarrage.
Vérifier qu’il ne contient ni identifiants, ni sauvegardes de radios, ni étalonnages.

## Portée de l’exportation

L’exportateur génère un **instantané de développement Beta**, il ne certifie pas que
la matrice est terminée. Il faut l’accepter via `--beta`. Il ne publie pas,
ne compile pas et ne flashe pas. Son utilisation est décrite dans [Déploiement](DEPLOYMENT.md#exporter-le-projet).
La livraison définitive reste conditionnée aux points précédents.

Les évolutions sont des compilations Bricohams vérifiables et l’historique Git de
HEAD avec l’état actuel des sources. Par défaut, l’intégralité de
`Documents/Multiboot` n’est pas incluse : elle contient des packages tiers, des configurations
et des étalonnages qui ne doivent pas être confondus avec une distribution du projet.
Les répertoires de compilation échouée sont signalés, pas présentés comme des firmwares.
L’option `--android` inclut une livraison APK Beta uniquement si toutes les empreintes
de ses sources correspondent exactement à l’instantané exporté ; elle comprend
guide, licences et preuves de compilation. Elle n’inclut pas les anciennes évolutions APK
sans leurs sources correspondantes et n’invente pas de validation physique.