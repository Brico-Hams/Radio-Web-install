# Bibliothèque d’aide sur les radios et les firmwares

Révision : 25-10-2026. Aide originale de Bricohams ; elle ne remplace pas les manuels
officiels et ne certifie pas les combinaisons qui n’ont pas été testées sur le matériel.

## Documents et ordre de lecture

| Guide | Ce qu’il explique |
| --- | --- |
| [Configuration commune et procédures](AYUDA-CONFIGURACION.md) | Fréquences, FM/DMR, tonalités, sauvegardes, relais, satellites, USB et vérification des résultats |
| [Quansheng F4HWN](AYUDA-QUANSHENG.md) | Mise en service de 0 à 100 %, matériel V1/V2/V3, versions v4/v5/v6, éditions, menus, slots, CFG, applications et récupération |
| [Atlas technique UV-K5 V3](ATLAS-UV-K5-V3.md) | Fonctionnement interne : brochage PY32F071, mémoires, protocole série, bootloader, SWD, compilation, mods, schémas et photos |
| [Toutes les options de compilation F4HWN](AYUDA-OPCIONES-F4HWN.md) | Signification de chaque option du catalogue, dépendances et précautions |
| [Valeurs des presets F4HWN](F4HWN-PRESETS.md) | Matrices ON/OFF de 18 versions publiées v4.3.0-v6.3.0, tous leurs presets et profils locaux v6.1.0 |
| [ARDF](AYUDA-ARDF.md) | Gain manuel, cycles, synchronisation, distance et différences matérielles |
| [Egzumer original](AYUDA-EGZUMER.md) | Sources V1, licence Apache-2.0 et chaque option du Makefile inspecté |
| [Pack Dim0s et Karina V3/K1](AYUDA-PACK-DIM0S.md) | Inventaire des variantes, nouvelles preuves PY32, empreintes et limites du multiboot/des licences |
| [OpenGD77 : configuration et utilisation](AYUDA-OPENGD77.md) | FM/DMR, codeplug, canaux, TG, TS, filtres, GPS, APRS et satellites |
| [OpenGD77 : radios et révisions](AYUDA-OPENGD77-MODELOS.md) | Modèles, alias, révisions, variantes et distinction entre catalogue et identification |
| [Karina](KARINA.md) | Inventaire, fonctions documentées, recherche du code source (fermé), spécification pour la réimplémenter et sources |
| [Baofeng DM-32UV](DM32UV-FIRMWARE.md) | Matériel HR_C7000/FD6818, état et licence d’OpenGD77, installation, compilation de RadioFoundry et protocole du bootloader |
| [Exemples](EJEMPLOS.md) | Firmwares ouverts F4HWN v6.3.0 et moto avec leur licence, canaux PMR446 d’exemple et scripts d’analyse |
| [Premiers pas avec les satellites](INICIACION-SATELITE.md) | Guide original en espagnol pour débuter avec les satellites FM et l’image BH Satélite |
| [Antennes satellites](ANTENAS-SATELITE.md) | Yagi bibande et dipôle en V simulés avec une MoM propriétaire, plans et pièces STL |
| [Binaires tiers](BINARIOS-TERCEROS.md) | SHA-256 et origine de Karina, firmwares DM-32UV officiels et modifiés, OpenGD77 DM32 et images d’usine du K1/K5 V3, sans redistribution |
| [Dépôts de la communauté](ENLACES-COMUNIDAD.md) | Catalogue vérifié de dépôts Quansheng et DM-32UV, liens morts récupérés et recherche sur d’autres forges |
| [Bricohams V3](BRICOHAMS-FIRMWARE.md) | Compilation locale reproductible de Fusion et Labs et artefacts livrés |
| [AnyTone](AYUDA-ANYTONE.md) | Préparateur local JSON/CSV ; ce n’est ni le CPS RDT ni un programmateur USB |
| [Android](ANDROID.md) | Journal de trafic, canaux FM, CAT et audio expérimentaux ; autorisations et tests par révision |
| [Validation V3 et Android](VALIDACION-INTEGRAL-V3-ANDROID.md) | Éléments probants, défaillances corrigées, isolation des données, essais en attente et limites des mods |

Dans les pages web, utilisez la recherche du navigateur (Ctrl+F).
Les documents Markdown sont conservés dans le dépôt pour une consultation hors ligne.
L’aide web est également incluse dans le serveur local, Pages et les installateurs.

## Que signifie « pris en charge »

Il existe quatre notions différentes :

1. **Pris en charge par le projet de firmware :** l’upstream maintient une image.
2. **Reconnu par le connecteur :** ce site connaît une structure d’identification.
3. **Publié dans le catalogue :** un nom de fichier provenant d’une source autorisée est
reconnu. Cela ne signifie pas qu’il peut être installé avec ce site.
4. **Testé sur une radio :** nécessite des preuves physiques pour le modèle et la build exacts.
Les tests automatisés de ce site ne constituent pas une telle certification.

Une ligne dans un tableau n’autorise pas l’utilisation du firmware d’une autre révision. « Téléchargement »
ne signifie pas « flashage » ; « fichier vérifié » ne signifie pas « signé numériquement ».

## Couverture des versions

| Famille | Couverture précise de cette bibliothèque | Limite |
| --- | --- | --- |
| F4HWN Quansheng PY32 | 18 versions publiées reconnues ; 84 options d’interface et 94 clés distinctes dans l’historique des presets par commit | Les fonctions v6 ne sont pas attribuées aux anciennes versions |
| ARDF Quansheng | Publications reconnues du dépôt V3/UV-K1 ; guide ARDF local v0.5 et avertissements sur l’évolution | Écriture dans les slots désactivée sans compatibilité vérifiée |
| Bricohams sur F4HWN | Fusion, Labs, ARDF, Satellite et Spectrum v6.1.0, options et empreintes documentées | Les lectures préalables et CRC des slots ne certifient ni le démarrage ni toutes les fonctions |
| Plateforme indépendante Bricohams | Résident expérimental, Diagnostics et Blocks dans BHA1, stockage et transfert portables | Aucun démarrage matériel validé ni intégration USB/Flash ; BHA1 n’est pas FAP1 et ne s’installe pas avec le chargeur web existant |
| Karina | Pack V1 local et pack V3/K1 du 21-09-2026 inspecté depuis Dim0s | Des binaires PY32 existent ; les sources et la compatibilité avec le multiboot Armel ne sont pas démontrées |
| OpenGD77 | Familles et modèles documentés ; versions identifiées par date/build et variantes de distribution | Pas de tableau universel des menus applicable à toutes les builds historiques |
| Stock Quansheng, UVMOD, OneOfEleven | Identification et références pour éviter les confusions | Ne sont ni des protocoles ni des compilateurs intégrés à ce site |

« Toutes les versions » est documenté comme une matrice de familles, de différences et
de sources par version, et non comme la promesse que chaque menu existe depuis le premier
firmware. Pour une build précise, notez le modèle, la révision, la date, le nom du
fichier, le commit s’il existe et l’empreinte. Comparez avec son manuel et ses notes de
publication. Les éléments non confirmés sont signalés comme tels, plutôt que d’inventer
des valeurs, raccourcis ou cartographies.

## Règles de sécurité et d’utilisation légale

- Identifiez le matériel réel, pas seulement le boîtier.
- Conservez l’étalonnage d’origine et le codeplug avant la migration.
- N’effectuez pas d’effacement, de restauration ou de reset à cause d’une erreur de port
sans en avoir d’abord déterminé la cause.
- Pour OpenGD77, ce site maintient l’écriture bloquée, car il ne récupère pas une
copie complète vérifiée du firmware MCU.
- Pour Quansheng, toute modification exige une sauvegarde complète ; Main est protégé.
- Les données importées pour l’écoute sont initialisées en RX-only.
- N’activez pas le TX automatique ni l’émission hors des fréquences autorisées. Un profil
PMR/GMRS/FRS/MURS du firmware n’homologue pas une radio.

## Licences : composants distincts

La déclaration de l’utilisateur « la licence est MIT » est enregistrée comme une déclaration
en attente d’association au composant, au titulaire et au texte de licence d’origine.
Elle ne modifie donc pas la licence des tiers ni celle du dépôt existant :

- Le site déclare GPL-3.0-or-later dans son manifeste et son fichier LICENSE.
- Les sources F4HWN inspectées comprennent Apache-2.0 et NOTICE.
- Les pilotes CHIRP du pack Karina contiennent des avis GPL.
- La licence exacte du firmware Karina ne figure pas dans le pack inspecté.
La déclaration MIT de l’utilisateur ne fournit pas ses sources et ne prouve pas à quels
fichiers/versions elle s’applique. L’avis correspondant sera ajouté lorsqu’une référence vérifiable
sera disponible.
- OpenGD77 et ses composants sont régis par leurs propres avis ; ne présumez pas qu’ils sont MIT.

Les manuels complets, le firmware Karina, les étalonnages d’autrui et les logiciels tiers
ne sont pas redistribués du seul fait qu’ils sont cités.

## Mettre à jour cette bibliothèque

Les tableaux de valeurs sont générés depuis les catalogues figés, pas de mémoire :

```powershell
npm run build:help
```

Lorsqu’un catalogue change, il faut vérifier la signification des nouvelles options,
versions et dépendances, régénérer les pages et exécuter les tests d’aide.
La radio n’est pas interrogée et sa configuration n’est pas modifiée à l’ouverture d’un guide.

L’instantané historique se trouve dans `f4hwn-history-presets.json` : il conserve commit,
SHA-256 et contenu de CMakePresets.json pour chaque version. Sa mise à jour est
explicite via `node scripts/fetch-help-presets.cjs` depuis la racine du dépôt ;
elle effectue des requêtes publiques vers GitHub, sans accéder aux radios ni envoyer de fichiers locaux.
Le générateur d’aide habituel fonctionne hors ligne et ne télécharge pas les sources.