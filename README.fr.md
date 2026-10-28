<img src="bricohams-logo.png" alt="Bricohams" width="240" height="89">

<p><a href="README.md">Español</a> · <a href="README.en.md">English (US)</a> · <a href="README.de.md">Deutsch</a> · <a href="README.it.md">Italiano</a> · <a href="README.fr.md">Français</a></p>

# Bricohams Radio Workspace

Deux espaces de travail avec leurs propres connecteurs WebUSB/Web Serial, des opérations locales et une sauvegarde automatique avant toute écriture.

## Quansheng : catalogue précompilé, visualiseur et journal RF

- Neuf images v6.1.0 sont distribuées avec l’application : Bricohams ARDF, Satellite, Spectrum, Labs et Fusion, ainsi que les versions officielles F4HWN Fusion, FieldOps, Transfer et Labs. Aucune compilation ni sélection de dossier n’est nécessaire. SHA-256, taille et structure sont vérifiés avant la préparation d’un slot ; l’installation exige toujours une sauvegarde.
- Visualiseur LCD affiché en premier, démarrage automatique à la connexion, pause avant toute opération et capture PNG. Un seul lecteur utilise le port à la fois.
- Clavier distant avec appuis courts/longs, sans PTT, sauvegarde complète, activation manuelle et confirmation par touche. F1/F2 peuvent déclencher des fonctions d’émission selon la radio ; l’envoi UART ne confirme pas que la commande a été exécutée.
- Redémarrage natif avec confirmation littérale, sans nouvelle tentative ni changement de slot ; le port est fermé et les autorisations sont révoquées. Vérifier manuellement le démarrage.
- Journal RF v2 en bas de page avec historique et export CSV sécurisé. Il ne contient que les données reçues du firmware ; aucune date UTC ni mesure étalonnée n’est inventée.
- Catalogue de six applications Labs upstream v6.1.0 vérifiées par SHA-256, FAP1 et ABI/API : préparer ou télécharger une application ne l’installe ni ne l’exécute. Comprend SystemInfo, BroadcastFM et quatre jeux/démos ; pas de balises ni d’applications de secours.
- Maintenance native : logo PNG/BIN, sauvegarde/restauration de la calibration et de la Flash externe, avec relecture et protection du secteur de calibration.
- Assistant de restauration usine natif en deux étapes : image Flash stock vérifiée et DFU par modèle, avec sauvegarde complète et confirmations explicites. Les images stock sont téléchargées depuis des liens officiels épinglés et validées par SHA-256. Testé en simulation ; aucune restauration usine n’a été effectuée sur une unité physique.
- Panneau d’outils propres avec accès internes, sans déléguer d’opérations à UV Studio : DFU principal v6/v7, maintenance, applications, slots et RF.
- DFU principal PY32 : BIN v6 ou package v7 FWAT/FWA1, avec sauvegarde et deux confirmations. Ne synchronise pas le Main externe et ne certifie pas le démarrage.
- Ressources externes v7 : CRC et Build ID doivent correspondre au firmware actif ; validation du firmware et écriture de l’en-tête en dernier. Installation séparée après le DFU et création d’une nouvelle sauvegarde. Prise en charge testée en simulation.
- Filtres RF locaux par nom/fréquence/événement et export CSV/JSON, sans inventer l’heure UTC des événements ni des mesures RF étalonnées.
- Les quatre slots Bricohams de l’unité de test ont été écrits le 26-10-2026 ; CRC vérifié et Main/configuration/calibration conservés. Le démarrage et les tests fonctionnels manuels de chaque slot restent à effectuer. Le visualiseur a reçu 24 trames LCD et une trame RF sur COM4 avec DTR actif ; aucun historique RF stocké n’a été reçu.

Catalogue et licences dans `precompiled/` ; régénération par le responsable de maintenance avec `npm run publish:firmware`. Les cinq compilations locales épinglées et l’accès à la publication officielle sont nécessaires, mais pas pour l’utilisateur final. Instructions et limites dans [l’aide Quansheng](docs/i18n/fr/AYUDA-QUANSHENG.md).
## AnyTone bêta : préparation web

La nouvelle [section AnyTone](anytone.html) prépare un **projet portable**, pas un RDT propriétaire ni un CSV certifié pour le CPS d’une version précise. Elle ne programme pas la radio par USB et ne la modifie pas.

- Base initiale : les mêmes 16 canaux PMR446 que pour les autres familles, en réception uniquement.
- Importe les binaires OpenGD77 standard de 128 KiB et les configurations Quansheng F4HWN v6. Préserve les fréquences RX/TX nominales, ainsi que CC/TS et le TG du contact de groupe connu dans OpenGD77. Exclut les modes Quansheng autres que FM, sans confondre AM et DMR.
- Importe les fichiers JSON RepeaterBook autorisés, réutilise le normaliseur existant pour FM/DMR et filtre l’Espagne. Aucun répertoire national vérifié n’est fourni. Les TS/TG non publiés restent à renseigner : ils ne sont jamais déduits de la fréquence.
- Accepte aussi le registre RadioID `rptrs` : Espagne, état ACTIVE, décalage et CC valides. Utilise les TS/TG publiés ; si seuls les TS sont publiés, TG0 reste à renseigner. ACTIVE est un état du registre, pas une preuve de fonctionnement RF.
- Accepte la liste JSON URE `items` des répéteurs (pas des balises) : ne convertit que le mode FM et les fréquences/décalages dont les unités sont explicites. Conserve le sous-ton publié comme note, sans l’activer. URE avertit que la liste peut contenir des données obsolètes ; vérifiez-les auprès du titulaire.
- Modifie et supprime les canaux, organise les étiquettes de zone et exporte des JSON réouvrables et des CSV d’échange. Tous les canaux sont verrouillés en TX.
- Les profils D868/D878/D578 regroupent des données pour leur préparation ; ils ne certifient ni les variantes ni leurs limites. L’AM aérienne n’est activée qu’avec le profil Autre et après confirmation manuelle de la prise en charge AM par la radio exacte.
- Aéroports : JSON `{"results":[{"name":"SERVICIO","frequencyMHz":"123.45000",
  "source":"Referencia AIP vigente"}]}`. Cet exemple illustre le format, pas une affectation aéroportuaire. Il utilise des fréquences RF, et non les désignateurs de canaux 8.33 ; comparez chaque service à [AIP ENAIRE](https://aip.enaire.es/).
- Exportez avant de quitter ; l’enregistrement n’est pas automatique. Ne publiez pas les projets issus de votre unité. Les tonalités, contacts privés/listes RX, ID DMR, limites propres au modèle et réglages propriétaires doivent être vérifiés dans le CPS approprié.

Pour produire un codeplug national natif, il faut disposer du modèle/firmware exact et de sources actuelles autorisées pour les répéteurs et les aéroports. Aucune fréquence n’est inventée et une couverture vide en répéteurs n’est pas présentée comme complète.

## Firmware propre : images ARDF, Satellites et Spectre bêta

Le générateur accepte `--module ardf` pour intégrer un noyau de cycles propre et un adaptateur clavier/écran dans Fox Hunt, application résidente sur F4HWN v6.1.0 Multiboot. La nouvelle image ARDF enregistre jusqu’à 8 observations manuelles (compteur, premier/dernier instant relatif et atténuation par balise) et permet de consulter/exporter le JSON par USB/UART depuis le web, sans GPS ni géolocalisation automatique. La dernière session reste en RAM à la sortie ; elle est effacée au redémarrage ou à la reconfiguration. Une deuxième image, `--module satellite`, applique manuellement le Doppler en RX uniquement, avec vitesse radiale réglable, affichage de la fréquence corrigée et sortie via le flux de restauration RF upstream. Elle n’intègre ni TLE/SGP4 ni suivi orbital autonome. La nouvelle image Satellites comprend un CAT RX expérimental propre, activé par 8 dans SAT RX, avec un lease de 3 secondes et un panneau web de consultation/syntonisation temporaire. Elle ne contrôle pas TX et ne modifie ni canaux, ni tonalités, ni puissance. La radio ne calcule pas les orbites elle-même.

Le navigateur permet désormais le suivi RX du passage sélectionné avec SGP4 et le renouvellement CAT ; l’arrêt est manuel, intervient lorsque la page est masquée et à la fin du passage. L’activation physique est requise ; le transport a été testé en simulation, pas en RF. Aucun passage futur n’est démarré automatiquement et aucun TLE n’est chargé dans le MCU. Le constructeur exige des images distinctes.

Il ne s’agit pas de Karina ni d’une équivalence à 100 %. Les images actuelles mesurent 113960 octets (ARDF avec statistiques) et 113868 octets (Satellites avec CAT) ; elles ont toutes deux été écrites dans des slots et vérifiées par CRC, mais le démarrage manuel reste à tester. Huit suites C natives vérifient les noyaux et les adaptateurs avec une RF simulée. La troisième image, `--module spectrum`, relie le noyau propre au récepteur et à l’écran : 128 points RSSI, peak hold, moyenne, pause et huit presets RAM. Les presets ne sont pas conservés à la sortie ou à l’arrêt et n’écrivent pas dans l’EEPROM.

PTT capture le point mesuré le plus fort dans une vue VFO-PRO RX propre, avec syntonisation par pas, saisie directe RX, audio et réglage du gain RX ; elle ne transmet pas et ne modifie pas la calibration. Elle permet de centrer de nouvelles fenêtres et de parcourir circulairement les presets RAM, avec jusqu’à 16 exclusions exactes par session et une recherche CTCSS/DCS facultative lors d’une capture FM, sans enregistrer les tonalités. L’image précompilée avec bootlogo et transfert des presets mesure 118040 octets. Elle permet de conserver les presets dans des fichiers BHSP locaux puis de les restaurer en RAM, balayage en pause, avec validation atomique et relecture ; elle n’écrit pas dans l’EEPROM. La détection réelle reste à valider. Les nouvelles compilations comprennent un écran d’accueil bêta et un logo monochrome intégré au mode LOGO, sans écraser le logo externe ni modifier les préférences au démarrage.

Voir [la construction, les commandes, les licences et les limites](docs/i18n/fr/BRICOHAMS-FIRMWARE.md#nouveau-noyau-indépendant-ardf).

**Bêta — en validation et en test.** Le **mode PRO**, expressément activé pour cette session, évite les confirmations répétitives à l’appui sur les commandes, mais ne supprime ni les autorisations USB, ni la sauvegarde complète, ni les vérifications du matériel/firmware, hashes, CRC, relecture ou protection de Main. Il n’autorise pas l’écriture à partir de sauvegardes partielles.

**Essai réel UV-K5 V3 (modèle déclaré), F4HWN v6.0.0 :** identification, calibration, configuration de 200 canaux et interrogation de cinq slots réussies sur COM4 ; calibration/configuration concordent lors de deux lectures indépendantes. La commande de Flash physique ne répond pas en v6.0. La sauvegarde automatique de cette version est corrigée afin de conserver l’accès en lecture seule et d’enregistrer une sauvegarde partielle, plutôt que d’invalider la connexion en tentant une commande indisponible. Aucune donnée physique n’a été écrite ni effacée. Détails et procédure dans [l’aide Quansheng](docs/i18n/fr/AYUDA-QUANSHENG.md).

## Documentation

[Index complet de la documentation et des références par langue](ayuda-referencias.fr.html).

### Android Bricohams bêta

L’APK native 0.8.3-beta comprend des contacts locaux modifiables avec recherche et import ADIF avec aperçu, export ADIF/JSON, sessions ARDF avec historique, statistiques, segments GPS filtrés et observations GPS ponctuelles, ainsi que du Morse à partir de texte et de WAV PCM expérimental. Elle intègre un CAT RX temporaire via USB CDC ACM et des adaptateurs CH34x/CP210x/FTDI/Prolific reconnus. Elle calcule hors ligne des passages SGP4 avec des TLE importés et permet le suivi Doppler RX du passage sélectionné. Elle capture le microphone au premier plan pendant 60 s au maximum pour décoder ensuite du Morse ou Robot36 ; il ne s’agit pas d’un décodage continu. Elle inclut l’édition des canaux F4HWN v6 avec sauvegarde complète vérifiée et relecture, sans envoi à LoTW. Elle décode le SSTV Robot36 expérimental depuis un WAV et exporte un PNG. Elle est compilée pour Android 8.0+ ; les tests sur hôte ne remplacent pas les essais sur téléphone. Consulter [les fonctions, autorisations, la compilation et les limites](docs/i18n/fr/ANDROID.md).

VersionCode 12 conserve les carnets 0.8.0 (Général/POTA/SOTA), saisie rapide, confirmation des doublons, sélection des satellites, radar polaire, carte mondiale hors ligne, enregistrement WAV du passage et recherche SSTV. L'actualisation CelesTrak/SatNOGS optionnelle se lance à l'ouverture, toutes les 24 h. La carte apparaît sans permission GPS ni observateur ; les passages exigent votre position enregistrée. Les TLE valides conservés fonctionnent hors ligne et la sélection est préservée. Commandes et validations sont traduites. Tests host, lint et APK 0.8.3 validés en CI avec JDK 17/SDK 35 ; installation et permissions sur téléphone physique restent à tester.

| Document | Contenu |
| --- | --- |
| [État de livraison](docs/i18n/fr/ESTADO-ENTREGA.md) | Revue de toutes les demandes, éléments de preuve, points en attente et conditions de publication et d’exportation |
| [Aide et assistance](ayuda.fr.html) (dans l’application : <http://127.0.0.1:8787/ayuda.html>) | Premiers pas, pilotes USB (assistance non officielle), erreurs fréquentes et FAQ |
| [Bibliothèque complète de firmware](ayuda-firmwares.fr.html) / [index Markdown](docs/i18n/fr/AYUDA-FIRMWARES.md) | Guides par famille, modèle, révision et version : F4HWN, ARDF, Karina, Bricohams et OpenGD77 ; menus, configuration FM/DMR et toutes les options du catalogue avec matrice ON/OFF. Incluse hors ligne dans les installateurs et le serveur local. Régénérer avec `npm run build:help`. |
| [Quansheng de 0 à 100 %](docs/i18n/fr/AYUDA-QUANSHENG.md#mise-en-service-de-0-à-100-) | Parcours complet par étapes : identification, sauvegardes, choix et flashage du firmware, réglages de base, canaux, balayage, multiboot, vérification et récupération |
| [Atlas technique UV-K5 V3 / UV-K1](docs/i18n/fr/ATLAS-UV-K5-V3.md) (web : [aide-atlas-uv-k5-v3.html](ayuda-atlas-uv-k5-v3.fr.html)) | Vue interne du matériel : brochage PY32F071, Flash interne et externe, carte EEPROM, protocole série, bootloader DFU, SWD, compilation, mods, schémas, photos du démontage et dépôts vérifiés |
| [Baofeng DM-32UV](docs/i18n/fr/DM32UV-FIRMWARE.md) (web : [aide-dm32uv.html](ayuda-dm32uv.fr.html)) | Matériel HR_C7000/FD6818, état et licence d’OpenGD77 sur le DM-32, installation et sauvegardes, compilation du firmware ouvert RadioFoundry et protocole du bootloader |
| [Karina](docs/i18n/fr/KARINA.md) / [dépôts de la communauté](docs/i18n/fr/ENLACES-COMUNIDAD.md) | Recherche du code source de Karina (fermé), spécification fonctionnelle pour sa réimplémentation et catalogue vérifié de dépôts Quansheng et DM-32UV |
| [Exemples](docs/i18n/fr/EJEMPLOS.md) / [hashes de tiers](docs/i18n/fr/BINARIOS-TERCEROS.md) | `examples/` : firmwares ouverts (F4HWN v6.3.0, moto) avec leurs licences, canaux PMR446 et scripts d’analyse ; index SHA-256 et origine des binaires tiers, qui ne sont pas redistribués |
| [docs/ARCHITECTURE.md](docs/i18n/fr/ARCHITECTURE.md) | Composants, flux de données, modules et couches de sécurité |
| [docs/DECISIONS.md](docs/i18n/fr/DECISIONS.md) | Décisions d’architecture et raisons du choix de chaque technologie |
| [docs/DEPLOYMENT.md](docs/i18n/fr/DEPLOYMENT.md) | Installation, configuration, mise à jour et déploiements non pris en charge |
| [docs/BRANDING.md](docs/i18n/fr/BRANDING.md) | Marque Bricohams : logo, palette, typographie et ton |
| [AUTHORS.md](AUTHORS.fr.md) | Auteurs |
| [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.fr.md) | Remerciements, sources et licences tierces |
| [SUPPORT.md](SUPPORT.fr.md) / [SECURITY.md](SECURITY.fr.md) | Assistance et signalement privé des vulnérabilités |

## Démarrage

### Fournisseurs dans la version installée

- **Répéteurs > Configurer l’API RepeaterBook** : saisissez un token `rbuapp_`, un User-Agent approuvé avec coordonnées de contact, puis confirmez l’approbation. Il est conservé uniquement en mémoire sur le serveur jusqu’à son redémarrage. Le token n’est ni renvoyé ni enregistré dans le navigateur. Les variables d’environnement existantes restent un autre moyen de configuration persistante. Ne placez jamais de tokens dans des URL.
- **Contacts DMR > Téléchargement automatique DMR** : télécharge et importe dans le codeplug local ouvert un lot RadioID de 1 à 10 pages, plafonné à 1024 contacts. Ajustez le pays/la région pour respecter la capacité ; si une page échoue, aucune importation partielle n’a lieu. Il ne s’agit pas d’une base massive d’indicatifs.
- **Salons/groupes BrandMeister** : consulte la liste publique par préfixe TG (`214` pour l’Espagne). Les éléments sont importés comme appels de groupe, et non comme contacts privés, avec le nom `TG` suivi du numéro. Cela n’active pas les abonnements du hotspot et n’affecte pas les groupes aux canaux. DMR+/TGIF ni les salons d’autres réseaux ne sont intégrés.
- **Quansheng > SAT / passages** : met à jour les TLE, consulte une fréquence FM, calcule le passage et prépare des mémoires Doppler. Sélectionnez un modèle FM dans la configuration lue et cliquez sur **Charger SAT / Doppler préparés dans la configuration Quansheng**. Ce sont des mémoires RX par paliers, pas un chargement orbital natif ni une commande du module Doppler du firmware. Enregistrez le binaire ; toute écriture exige toujours une sauvegarde complète.

« Automatique » signifie que le lot est exécuté au clic ; il n’y a ni téléchargement silencieux au démarrage ni synchronisation périodique. RadioID et l’API RepeaterBook authentifiée nécessitent le serveur installé. BrandMeister permet aussi une consultation directe dans Pages ; RepeaterBook accepte l’import d’un JSON autorisé sans installation.

Node.js 22+ est requis. L’unique dépendance d’exécution est `satellite.js` 6.0.1 (MIT), utilisée pour la propagation orbitale SGP4 ; elle est servie depuis l’ordinateur, pas depuis un CDN. Dans une nouvelle copie du dépôt :

```powershell
npm ci --ignore-scripts
npm start
```

Ouvrez <http://127.0.0.1:8787>. Utilisez toujours la même origine pour conserver l’historique IndexedDB. Chrome ou Edge de bureau sont recommandés. L’ouverture des fichiers HTML permet de consulter les guides, mais le stockage et les API peuvent varier selon le navigateur. Le téléchargement automatique du firmware nécessite ce serveur Node local ; sur un hébergement statique, utilisez le mode web (voir ci-dessous). Le serveur refuse les autres hôtes/origines : sa publication nécessite d’adapter délibérément le déploiement HTTPS et ses contrôles d’accès.
## Mode web (GitHub Pages) et mode local

La même application peut être utilisée de deux façons. Au démarrage, elle lit `runtime.json` : si le fichier est absent ou invalide, elle fonctionne en **mode web** ; le serveur local fournit `{"mode":"local"}`. Le badge supérieur indique « Web · GitHub Pages » ou « Local · installé ».

| Fonction | Web (site statique) | Local (`npm start`) |
| --- | --- | --- |
| Connexion à la radio, sauvegardes partielles, édition hors ligne | Oui ; OpenGD77 bloque les opérations ultérieures sans sauvegarde intégrale du firmware | Identique |
| Firmware F4HWN | Catalogue provenant de `api.github.com` ; téléchargez le fichier depuis la source officielle puis chargez-le : taille et SHA-256 publiés sont vérifiés | Téléchargement vérifié par le serveur |
| Firmware OpenGD77 | ZIP chargé manuellement (nom et format ZIP vérifiés ; l’éditeur ne publie pas de hash, SHA-256 calculé localement uniquement) | Téléchargement par le serveur |
| Contacts RadioID | Chargez `user.csv` depuis radioid.net (100 MiB max., filtre par pays/zone, 5000 affichés max.) | Requête à l’API par le serveur |
| Profil (indicatif + ID DMR) | Facultatif, dans votre navigateur uniquement ; affiche « (vous) » | Sans objet |
| RepeaterBook | Import d’un JSON autorisé ; pas de requête authentifiée | Oui, avec votre token approuvé |
| Groupes BrandMeister | Consultation directe par préfixe et import dans le fichier local | Consultation par le serveur |
| Satellites | `data/satellites.json` généré chaque jour depuis SatNOGS | TLE en direct |

Les données satellite couvrent les NORAD 25544, 27607, 43017 et 43678 (SatNOGS DB / Libre Space Foundation, CC BY-SA 4.0) ; un avertissement est affiché si elles ont plus de 7 jours. Pour publier votre propre copie sur GitHub Pages, voir [docs/DEPLOYMENT.md](docs/i18n/fr/DEPLOYMENT.md).

**Vérification du CPS OpenGD77 :** une matrice des capacités et limites est affichée sur sa page. Aucune parité complète ni sauvegarde automatique intégrale du firmware MCU n’est revendiquée. La connexion lance automatiquement la lecture de la calibration et du codeplug, enregistre la sauvegarde et ses hashes, puis ouvre le codeplug pour travailler hors ligne. Tant que le firmware d’origine manque, les opérations radio ultérieures sont bloquées, y compris les nouvelles lectures et captures, même en mode PRO. Une image officielle téléchargée ne constitue pas une sauvegarde de l’unité et ne permet pas de récupérer le firmware commercial déjà remplacé. Voir [portée du mode web et sauvegarde obligatoire](docs/i18n/fr/AYUDA-OPENGD77.md).

### Installateurs locaux

Téléchargez la [dernière Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest) et son fichier `SHA256SUMS`. Choisissez un installateur dans **Assets**, pas les archives ZIP/tar.gz automatiques de « Source code ». [Guide complet d’installation locale](docs/i18n/fr/DEPLOYMENT.md#installateurs-locaux).
Après l’installation, pour préparer une Quansheng, suivez le [parcours de 0 à 100 %](docs/i18n/fr/AYUDA-QUANSHENG.md#mise-en-service-de-0-à-100-)
et consultez l’[atlas technique UV-K5 V3](docs/i18n/fr/ATLAS-UV-K5-V3.md).

- Windows 11 x64 : extrayez tout le contenu de `*-windows-x64.zip`, ouvrez PowerShell dans ce dossier et exécutez `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1`. Node.js est inclus ; aucun droit administrateur n’est requis. Lancez l’application depuis le menu Démarrer.
- Debian, Ubuntu et Raspberry Pi OS : vérifiez `dpkg --print-architecture`, téléchargez **uniquement** le fichier `.deb` correspondant à votre architecture (amd64, arm64 ou armhf), puis exécutez `sudo apt install ./nombre-del-paquete.deb`. Node.js est inclus ; armhf nécessite un processeur ARMv7 ou ultérieur. Ouvrez l’application depuis le menu ou lancez `bricohams-radio`.
- Arch Linux : installez `base-devel` et `nodejs` avec pacman, extrayez `*-arch.tar.gz`, vérifiez `PKGBUILD` et exécutez `makepkg -si` en tant qu’utilisateur normal. Lancez avec `bricohams-radio`.
- FreeBSD 14 amd64 : extrayez `*-freebsd-amd64.tar.gz`, ouvrez le dossier et exécutez `su -c './install.sh'` (Node 22 est installé avec `pkg` s’il manque). Lancez `bricohams-radio` en tant qu’utilisateur normal.

Tous les installateurs comprennent **Bricohams Quansheng Studio** (UV-K1 / UV-K5 V3 avec F4HWN Fusion 6), depuis le dépôt [Brico-Hams/Bricohams-Studio](https://github.com/Brico-Hams/Bricohams-Studio). Ouvrez-le sur <http://127.0.0.1:8787/studio.html> ou depuis l’espace Quansheng. La copie est téléchargée lors de la création du package, au commit et avec le SHA-256 épinglés dans `studio.lock.json` ; le serveur la vérifie de nouveau avant de la fournir. Elle est servie avec sa propre CSP, qui n’autorise que les scripts identifiés par hash et lui interdit tout accès réseau. Depuis le code source, exécutez une fois `npm run fetch:studio`. En mode web, le lien renvoie vers la [page publique de Studio](https://brico-hams.github.io/Bricohams-Studio/).

Vérifiez le SHA-256 avant l’installation. Les lanceurs ouvrent le navigateur par défaut et n’exécutent le serveur en arrière-plan que sur `127.0.0.1:8787`. Si votre navigateur par défaut n’est pas compatible, ouvrez cette adresse dans Chrome, Edge ou Brave. Fermer l’onglet n’arrête pas le serveur ; aucun démarrage automatique n’a lieu après le redémarrage de l’ordinateur. Utilisez toujours le même navigateur, profil et origine pour conserver vos sauvegardes. Configurez les pilotes USB séparément : [Aide](ayuda.fr.html#drivers). La prise en charge de WebUSB/Web Serial par Chromium n’est pas garantie sous FreeBSD.

## État réel de la prise en charge

| Famille | Lecture réelle | Modifications | Limites |
| --- | --- | --- | --- |
| OpenGD77 MK22 | Identification, calibration 4096 B, codeplug standard 128 KiB | Implémentation de l’écriture CPS incluse, **bloquée par la politique de sauvegarde** | Aucun protocole vérifié ne permet ici d’extraire le firmware MCU complet. Cette sauvegarde n’est pas simulée et ne peut pas être débloquée avec un firmware téléchargé. |
| OpenGD77 STM32 | Identification, calibration 512 B, codeplug standard 128 KiB | Identique : écriture bloquée | Mode CDC OpenGD77 normal, pas DFU. Les structures inconnues sont rejetées. |
| DM-32 / UV008 avec OpenGD77 | Mêmes opérations à 115200 bauds avec Web Serial | Identique : écriture bloquée | Pas de boot ROM, de microcode ni de flashage du firmware stock. |
| Quansheng UV-K1 / UV-K5 V3 PY32F071 avec F4HWN v6+ | Identification, calibration 512 B, interrogation des slots et CRC | Installation/effacement des slots 1-4 et réinitialisation des banques 1-4, **uniquement après vérification d’une sauvegarde complète** | La sauvegarde physique de la Flash nécessite Labs v6.1+ et les commandes 0x0738. Dans les autres éditions, la calibration est conservée et l’écriture est bloquée si la sauvegarde ne peut pas être terminée. |

La parité avec grid.radio et UV Studio n’est pas complète. Le visualiseur, le clavier et le redémarrage Quansheng, la restauration de la calibration/Flash, le DFU stock, le DFU principal et les ressources externes disposent d’implémentations natives indépendantes. Le DFU stock est limité aux hashes/modèles indiqués ; le DFU principal valide un BIN v6 PY32 ou un package v7 FWAT/FWA1 et ne synchronise pas le Main externe. Les ressources v7 s’installent séparément avec une nouvelle sauvegarde et un Build ID concordant ; aucune installation automatique ni prise en charge des ressources dans les slots inactifs n’est prévue. Apps Labs permet de consulter le catalogue, d’exporter, d’installer, de déplacer vers un emplacement vide et d’effacer une application individuellement ou globalement, avec vérification. Les applications ne sont pas exécutées automatiquement ; les comptes et la modification des zones ne sont pas implémentés. La gestion des fichiers `.app` est décrite plus bas. Le changement de firmware dans Multiboot et la sélection de SetCfg s’effectuent sur la radio elle-même ; aucune commande à distance fictive n’est ajoutée. Les licences des binaires tiers restent applicables : un code indépendant ne garantit pas l’absence de risques juridiques.
## Codeplug : contacts, répéteurs et satellites

Les deux pages comprennent un panneau **Codeplug : contacts, répéteurs et SAT**. Aucun fournisseur n’est interrogé à l’ouverture. Les consultations sont des actions explicites, relayées par le serveur local ; aucun codeplug, aucune calibration ni aucun identifiant de la radio n’est envoyé.

### Contacts RadioID / OpenGD77

1. Ouvrez dans l’éditeur un codeplug standard de 128 KiB, ou lisez celui de votre radio.
2. Sélectionnez **Contacts DMR**, saisissez le pays dans la langue du fournisseur (par exemple `Spain`) et, facultativement, l’État/la province (`Madrid`).
3. Recherchez dans l’[API RadioID](https://radioid.net/api/dmr/user/). Une page est chargée par action ; les boutons précédent/suivant parcourent toutes les pages disponibles. Le filtre textuel ne porte que sur la page affichée, pas sur l’ensemble de la base.
4. Sélectionnez des contacts dans les pages voulues et ajoutez-les au fichier local. La sélection est conservée lors du changement de page ; le compteur inclut toutes les pages sélectionnées.
5. Enregistrez le binaire modifié avec **Enregistrer le binaire 128 KiB**. Vous pouvez aussi enregistrer la sélection de contacts en JSON.

Des **contacts numériques privés** sont ajoutés par indicatif/ID (capacité totale : 1024), pas la base massive d’identification des appels ni des talkgroups. Les ID privés existants sont dédupliqués, les index des contacts présents sont respectés et aucun contact n’est écrasé. En cas d’erreur ou de manque d’espace, le lot est annulé sans modifier le fichier d’origine. Les noms sont limités au format ASCII du codeplug. Quansheng ne prend pas en charge les contacts DMR.

### Répéteurs RepeaterBook

Source : [API officielle et politique d’accès](https://www.repeaterbook.com/wiki/doku.php?id=api). **Data courtesy of RepeaterBook.com.**

Depuis mars 2026, l’API n’est plus ouverte : l’utilisation de **cette application** nécessite une approbation et un token individuel associé aux applications distribuées. Un token obtenu pour une autre application n’autorise pas celle-ci. Aucun scraping n’est effectué, aucun enregistrement RepeaterBook n’est inclus dans le dépôt et la base n’est pas téléchargée sans autorisation. Cette intégration est destinée à la programmation personnelle/autorisée, et non à la création d’un annuaire alternatif ou à la redistribution des données.

Si RepeaterBook autorise l’utilisation de cette application, définissez ces variables dans la même session PowerShell que celle où vous démarrez le serveur :

```powershell
$env:RB_APPROVED = "yes"
$env:RB_USER_TOKEN = "<tu token individual rbuapp_ asociado a esta aplicacion>"
$env:RB_APPROVED_USER_AGENT = "<el User-Agent aprobado con nombre/version y correo real de contacto>"
npm start
```

Ne collez pas le token dans une conversation, le navigateur, une URL, un commit ou un fichier public. Le programme ne lit pas `.env` ; si vous choisissez d’enregistrer vous-même des variables, protégez ce fichier. Les tokens partagés `app_` ne sont pas acceptés dans ce déploiement distribué. Une variable d’approbation ne fait qu’exprimer votre configuration : le fournisseur vérifie l’autorisation réelle. En cas de HTTP 429, aucune nouvelle tentative automatique n’est faite et un délai d’attente d’au moins 15 minutes est appliqué.

Dans l’interface, vous pouvez consulter les données par pays/zone et mode (FM ; DMR également dans OpenGD77), ou ouvrir un JSON d’exportation RepeaterBook dont l’utilisation est autorisée (`results`, 8 MiB max.). Pour les États-Unis, le Canada et le Mexique, l’ID RepeaterBook de l’État/de la province est requis. Les filtres de zone, texte et bande s’appliquent aux résultats affichés ; les enregistrements dont le mode n’est pas confirmé, hors plage, non opérationnels ou corrompus sont exclus **avec un décompte et des exemples de motifs**.

- **OpenGD77 :** choisissez un modèle existant du même mode que le lot, puis ajoutez les entrées aux emplacements libres. Aucune valeur binaire arbitraire n’est créée et les canaux ne sont pas réordonnés. Le nom, RX/TX nominal et Color Code, le cas échéant, sont importés ; les autres réglages proviennent du modèle. **Tous les nouveaux canaux sont en RX uniquement et ne reprennent aucune tonalité RX/TX.** DMR conserve le TS/contact/liste RX du modèle : aucun talkgroup ni TS du répéteur n’est inventé. Vérifiez ces paramètres dans le CPS avant d’autoriser TX. Enregistrez le binaire local.
- **Quansheng :** FM uniquement ; lit/ouvre la configuration logique F4HWN v6 de 41344 octets et permet d’ajouter des canaux à partir d’un modèle ou d’effacer les mémoires du fichier local. Comprend les canaux PMR446 analogiques 1-16 en RX uniquement ; les répéteurs/SAT se préparent à partir des fournisseurs. L’envoi bêta exige une sauvegarde complète de la Flash et une relecture ; il ne peut pas être activé en v6.0. Exporte également un CSV CHIRP avec `Duplex=off` (TX désactivée) : c’est un format d’échange, pas un dump ni une installation. Les projets JSON ne sont pas non plus des formats radio natifs.
- Seules les fréquences VHF 136-174 et UHF 400-470 MHz sont préparées. Sélectionnez la bande réelle de votre unité : les radios monobande, les révisions différentes et les restrictions régionales peuvent accepter une plage plus limitée. Aucune compatibilité universelle n’est garantie.

### SAT et prochains passages

1. Sélectionnez **SAT / passages**, saisissez un NORAD et choisissez le fournisseur orbital : [SatNOGS DB](https://db.satnogs.org/) ou [CelesTrak](https://celestrak.org/NORAD/elements/).
2. **Mettre à jour les éléments orbitaux** télécharge le TLE le plus récent disponible. Le checksum, le NORAD, l’époque et la propagation sont vérifiés. Les éléments vieux de plus de sept jours, situés à plus de 24 h dans le futur ou dont la fenêtre de prédiction dépasse sept jours depuis l’époque sont rejetés. Une erreur n’est pas remplacée par une réponse d’un autre fournisseur ni par des éléments anciens.
3. **Consulter les fréquences SatNOGS** propose des fréquences ponctuelles FM/FM étroite actives, confirmées et situées en VHF/UHF. Les modes de données, USB/LSB et transpondeurs linéaires ne sont pas convertis en canaux FM. Le nombre d’éléments exclus est affiché. Les données communautaires peuvent ne pas refléter l’état opérationnel actuel : vérifiez auprès de l’opérateur du satellite.
4. Autorisez l’utilisation locale de la position et saisissez latitude/longitude/altitude, ou cliquez sur **Utiliser ma position**. L’autorisation du navigateur n’est demandée qu’à ce moment. Les coordonnées ne sont pas envoyées aux fournisseurs et ne sont pas enregistrées automatiquement.
5. Calculez les passages des prochaines 24/48 heures au-dessus de l’élévation minimale choisie. SGP4 est exécuté localement à partir de la position de l’observateur, avec des échantillons de 5 s et des croisements affinés à 0,5 s. Le début, le maximum, la fin, l’élévation et les azimuts sont affichés en **UTC**. Les passages déjà commencés ou tronqués par la fenêtre sont signalés. Aucun relief ni aucune réfraction atmosphérique n’est pris en compte ; la précision sur le terrain n’est pas garantie.
6. Vous pouvez exporter un plan JSON (**qui inclut votre position**, consentement obligatoire) et le TLE accompagné d’un JSON indiquant provenance/licence. Vérifiez que le navigateur a enregistré les deux fichiers TLE. Le plan est invalidé si les paramètres changent et doit être recalculé après 15 minutes. Un canal SAT FM préparé est seulement en RX nominal : il ne contrôle pas le Doppler et n’autorise pas de liaison montante.
7. **Canaux Doppler (Quansheng UV-K5 V3 / UV-K1 et OpenGD77) :** choisissez un passage calculé et de 1 à 10 canaux. Le décalage Doppler du passage (vitesse radiale SGP4) est divisé en intervalles de fréquence égaux. Chaque canal est réglé, par pas de 10 Hz, au centre de son intervalle et utilisé pendant la fenêtre UTC où la fréquence reçue se trouve dans cet intervalle ; les fenêtres sont plus courtes près du rapprochement maximal. Chaque canal indique sa fenêtre et son erreur maximale aux extrémités, en tenant compte de l’arrondi de fréquence à 10 Hz et en arrondissant l’erreur vers le haut. Lors d’un passage de l’ISS au-dessus de Madrid, avec 5 canaux, l’erreur reste inférieure à 0,7 kHz à 145,8 MHz et à 2 kHz à 437,8 MHz. RX uniquement : changez de mémoire à l’heure indiquée. La radio ne suit pas le Doppler automatiquement et aucune émission TX montante n’est générée.

SatNOGS DB / Libre Space Foundation : attribution des données [CC BY-SA 4.0](https://wiki.satnogs.org/SatNOGS_DB) ; les TLE peuvent citer des sources orbitales tierces. Les JSON/CSV dérivés conservent l’attribution et le lien vers la licence. La dépendance SGP4 inclut sa licence MIT dans le package installé.

7. **OpenGD77 : liste SAT native dans le codeplug local.** Après ouverture/lecture d’un codeplug de 128 KiB, **Charger le satellite dans la liste SAT du codeplug local** écrit le satellite dans le bloc de données personnalisées **type 3** (offset `0x1EE60`, 25 enregistrements de 100 bytes : nom de 8 caractères, champs TLE empaquetés par nibbles, fréquences LE), au même format que le CPS officiel. Les satellites existants sont conservés (remplacement par nom et tri), tout comme l’en-tête `OpenGD77` et les autres blocs (image de démarrage, mélodie, thème). Si la zone n’a pas d’en-tête et n’est pas effacée (`0xFF`), ou si la chaîne de blocs est incohérente, l’opération est annulée sans modifier le fichier. Seule la liaison descendante (RX1) est enregistrée ; liaison montante, CTCSS et APRS restent à zéro. **Voir les satellites du codeplug** décode la liste. Enregistrez le binaire et appliquez-le avec le CPS officiel : l’écriture directe dans la radio reste bloquée tant qu’une sauvegarde complète du MCU n’est pas disponible.

**Limites d’installation :** F4HWN accepte ici les mémoires FM/SAT par paliers dans la configuration v6, mais pas de table orbitale SAT native. L’envoi des canaux est bêta et nécessite une sauvegarde complète ; seule la lecture a été testée physiquement en v6.0. La liste SAT OpenGD77 est modifiée dans le binaire local, pas dans la radio. L’écriture OpenGD77 reste bloquée jusqu’à la vérification d’une sauvegarde complète du firmware MCU. L’effacement local OpenGD77 supprime les références dans les 68 zones standard et 64 listes de balayage, y compris les priorités et le canal TX désigné ; les autres mémoires ne sont pas renumérotées. Les zones étendues de Scanner ne sont pas prises en charge. Conservez toujours le fichier d’origine. L’UV-K5 V3 ne valide pas le matériel OpenGD77. Les consultations/importations ne confèrent aucune autorisation d’écriture.
## Téléchargements officiels de firmware

Sur chaque page, cliquez sur **Consulter les modèles officiels**, sélectionnez le modèle et la révision exacts, puis consultez le catalogue stable. Dans Quansheng, **Consulter les versions stables** affiche l’historique reconnu des deux projets, classé du plus récent au plus ancien au sein de chaque projet. Aucune connexion Internet n’est effectuée à l’ouverture de la page. La sélection de la famille OpenGD77 ne détermine pas à elle seule le modèle cible : vérifiez l’étiquette de l’appareil, sa puissance et sa révision matérielle.

- **F4HWN UV-K1 / UV-K5 V3 :** [Releases d’Armel](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases), historique stable v4.x/v5.x/v6.x reconnu. Comprend Fusion et, en v6, FieldOps, Labs et Transfer. Les binaires v4 sont filtrés selon le matériel K1/K5 V3. Les variantes SA818 sont explicitement identifiées. Seul F4HWN v6.x sans SA818 peut être préparé pour les slots ; les versions antérieures et SA818 sont **à télécharger uniquement**.
- **ARDF UV-K1 / UV-K5 V3 :** [Releases du projet reald](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases), versions stables portant l’étiquette `ARDF-K5v3_K1-v...` et binaire combiné reconnu (dont v0.5 et v0.5.1). Elles sont **à télécharger uniquement** : aucune compatibilité Multiboot n’est revendiquée et le connecteur ARDF n’est pas activé.
- Les deux projets Quansheng exigent la taille et le SHA-256 publiés par GitHub ; le serveur et le navigateur vérifient les octets. L’historique est paginé (jusqu’à 1000 publications par projet ; au-delà, une erreur explicite est renvoyée). Une erreur d’une source annule la consultation, sans catalogue partiel. Les versions bêta/de développement, les firmwares d’origine à provenance non vérifiée, les binaires compilés localement et les modèles V1/V2 ne sont pas proposés. Les fichiers des dossiers locaux ne sont pas copiés sur le site. La vérification d’un hash n’est ni une signature numérique ni une certification de compatibilité.
- **OpenGD77 :** [serveur officiel](https://www.opengd77.com/downloads/releases/) uniquement, dernier dossier stable `RYYYYMMDD` par famille et fichiers reconnus pour le modèle. MD-9600 distingue V1/V2/V4/V5 et MD-UV380 distingue 10W PLUS. Le ZIP d’origine est conservé : **il n’est pas flashé ni traité comme un codeplug**. L’index officiel ne publie pas de hash : HTTPS, taille et signature de format ZIP sont vérifiés, et un SHA-256 est calculé localement. Aucune vérification cryptographique de l’éditeur n’est revendiquée et chaque fichier ZIP n’est pas décompressé/validé.
- MD-380, DM-32 et UV008 ne sont pas proposés tant qu’aucune source d’actifs confirmée n’est disponible. Aucun lien n’est inventé et aucun miroir n’est utilisé.

Les téléchargements transitent par une API du serveur local, avec destinations fixes, redirections restreintes, limites de taille/durée et deux téléchargements simultanés au maximum. Les catalogues expirent au bout de dix minutes ; une nouvelle consultation durant ce délai utilise le cache. Les erreurs sont affichées sans leur substituer de faux fichiers ou versions. Aucune URL fournie par l’utilisateur n’est acceptée et aucun firmware n’est écrit sur le disque du serveur. La source officielle reçoit la requête de téléchargement de l’ordinateur, mais pas la calibration, les sauvegardes, les codeplugs ni les identifiants de la radio.

Après le téléchargement, vous pouvez enregistrer un manifeste de provenance avec le modèle, la version, l’URL, la taille, les hashes et les limites. Vérifiez que le navigateur a enregistré les deux fichiers. Seul un BIN F4HWN vérifié et correspondant au modèle permet de **Préparer une image pour un slot** ; cela n’installe rien. Changer de modèle efface l’image préparée. L’installation conserve toutes les protections de sauvegarde et de confirmation ; un téléchargement ne remplace jamais la copie du firmware déjà présente dans la radio.

L’éditeur OpenGD77 ouvre les binaires de 131072 octets exactement et modifie les canaux FM/DMR existants (nom ASCII, RX, TX, mode, Color Code, TS et RX uniquement), en préservant les autres champs. Il permet aussi d’ajouter des canaux à partir d’un modèle explicite et des contacts privés via le panneau fournisseurs. Il n’importe pas le JSON du CPS, ne crée pas de canaux avec des réglages arbitraires et ne gère pas les canaux étendus 1025+. La validation BCD ne remplace ni la vérification des bandes du modèle ni l’autorisation d’émettre.

Les lectures OpenGD77 n’envoient pas la commande d’enregistrement des réglages/VFO et ne redémarrent pas l’appareil : elles lisent les valeurs persistées et ne forcent pas l’enregistrement de modifications encore présentes en RAM.
## Applications F4HWN Labs et firmware personnalisé (Quansheng)

- **Compilation locale à la demande de Bricohams V3 :** `npm run build:bricohams -- --source "<Fusion61>" --output "<directorio nuevo>" --preset Fusion --option ENABLE_VOX=OFF` compile une édition indépendante à partir du commit F4HWN v6.1.0 épinglé. Elle prend en charge Fusion/Labs/FieldOps/Transfer et les options booléennes vérifiées ; elle conserve le multiboot et produit le firmware, la carte mémoire, l’ELF, les métadonnées, les licences et SHA256SUMS compatibles avec le vérificateur web. Ce n’est ni Karina ni une version V1, et ce n’est pas non plus le catalogue en ligne v6.3.0. Fusion et Labs ont été compilés ; la reproductibilité locale de Fusion a été vérifiée, sans essai physique ni flashage. Instructions et résultats dans [BRICOHAMS-FIRMWARE.md](docs/i18n/fr/BRICOHAMS-FIRMWARE.md).
- **Bibliothèque Multiboot locale :** dans **Firmware Slots / Multiconfig**, sélectionnez votre dossier Multiboot. Les fichiers `.bin` sont lus dans le navigateur, sans être téléversés sur le serveur. Chaque image indique si elle satisfait aux contrôles des slots ou pourquoi elle est bloquée. Seules les images F4HWN v6.x avec vecteurs PY32 valides peuvent être préparées ; pas Karina V1, stock, versions anciennes ou variantes packed/SA818/bêta/de développement. Le SHA-256 local ne prouve pas l’authenticité. L’installation exige toujours une sauvegarde complète et une confirmation ; Main reste protégé. Voir le [dossier Karina : matériel et faisabilité Bricohams](docs/i18n/fr/KARINA.md).
- **Applications :** dans l’espace Quansheng, **Applications F4HWN Labs** affiche les emplacements d’applications de la Flash externe, permet d’installer un `.app` et de l’effacer. La fonction est disponible uniquement lorsque l’édition Labs est démarrée. Avant toute opération sur la radio, l’en-tête FAP1 et les CRC du code et des assets sont vérifiés. L’application est écrite dans cet ordre : code, assets, puis en-tête. Chaque bloc est relu dans la Flash physique et comparé octet par octet ; en cas d’échec, l’opération est annulée sans valider l’en-tête. La vérification finale du firmware ne contrôle que l’en-tête et la compatibilité, pas le CRC du code ; elle ne remplace pas la relecture. Comme toute autre écriture, l’opération exige une sauvegarde complète. Les fichiers `.app` sont téléchargés depuis [archive/apps de F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/tree/main/archive/apps), dans le dossier correspondant à votre version.
- **Firmware personnalisé :** choisissez une édition (Labs, Fusion...) et activez ou désactivez des options `ENABLE_*`. Le web génère la demande destinée au workflow *Firmware à la carte* du dépôt de compilation. Au chargement de l’artefact téléchargé (`SHA256SUMS`, `build-info.json`, `.bin`), chaque SHA-256 est vérifié et seul le `.bin` indiqué par `build-info.json` est préparé dans **Installer dans un slot**. Le manifeste doit aussi couvrir `build-info.json` ; les noms en double sont rejetés. Ces hashes détectent la corruption, mais ne prouvent ni l’authenticité ni la compatibilité. Le catalogue [f4hwn-options.js](f4hwn-options.js) est régénéré avec `node scripts/f4hwn-options.cjs <bricohams-firmware>/options/<version>.json > f4hwn-options.js`.

## Sauvegardes automatiques et protection de l’équipement

1. Sélectionnez le modèle et autorisez la lecture locale.
2. Connectez la radio : elle est identifiée et la sauvegarde démarre automatiquement.
3. Enregistrez la calibration dans IndexedDB, calculez le SHA-256 et relisez-la pour vérifier sa persistance.
4. Quansheng : lisez **les 2 MiB de Flash externe** et comparez son CRC-32 complet avec celui calculé par la radio (`0x073E`, Labs avec prise en charge du CRC physique). Si le firmware ne fournit pas cette vérification ou si le CRC diffère, l’écriture est bloquée. À 38400 bauds, l’opération peut durer 10 à 20 minutes ou davantage. La barre indique la progression réelle en octets.
5. Extrayez l’image `Main` du slot 0 et vérifiez son en-tête, sa taille et son CRC-32. Comparez la calibration logique à la calibration physique.
6. Persistez le résultat et revérifiez tous les SHA-256. Ce n’est qu’alors qu’une autorisation d’écriture liée à la connexion est délivrée.
7. Demandez le téléchargement automatique d’un `.rwb.json` contenant le manifeste, les fichiers Base64, leurs tailles et leurs hashes. Le navigateur peut bloquer le téléchargement : vérifiez le dossier Téléchargements et relancez-le depuis l’historique.

**Ce que signifie le firmware de base :** `Main` est l’application que le firmware enregistre après l’installation normale. L’image décrite par son en-tête est copiée en entier (jusqu’à 118 KiB). Il ne s’agit pas nécessairement du firmware actuellement sélectionné et elle **n’inclut ni le bootloader d’usine interne** ni les autres octets du MCU. Ce protocole ne permet pas d’affirmer que la puce entière a été sauvegardée. Si Main manque ou si son CRC ne correspond pas, l’écriture n’est pas autorisée.

OpenGD77 conserve la calibration et le codeplug, mais la sauvegarde est marquée **partielle**, car l’extraction complète du firmware interne manque. L’application ne confond pas un codeplug avec un firmware.

En cas d’erreur de transport, de CRC, de quota, de lecture ou de stockage, aucune autorisation d’écriture n’est délivrée. Avant chaque modification, la sauvegarde enregistrée est relue et comparée aux hashes d’origine associés à l’autorisation : sa suppression ou sa corruption révoque également l’autorisation d’écrire. Le retrait du câble, une reconnexion ou le branchement d’une autre radio invalide l’autorisation. Chaque nouvelle connexion exige une nouvelle sauvegarde. Les écritures sont exclusives ; Main ne peut pas être sélectionné comme destination ; les octets de l’image sont écrits avant l’en-tête et le CRC est vérifié après l’installation. L’effacement du firmware et la réinitialisation d’une banque sont deux opérations différentes, qui exigent une confirmation écrite.

Ne débranchez pas la radio et ne fermez pas le navigateur pendant une opération. Ne connectez pas simultanément un outil externe au même port. Les outils d’origine liés **ne bénéficient pas de ces protections**.

## Sécurité des données

- Aucune télémétrie, aucun compte, aucun CDN et aucun envoi des fichiers de la radio vers des serveurs. `satellite.js` est installé localement depuis npm, avec une version épinglée et un fichier lock.
- Les sauvegardes restent dans le profil du navigateur de l’ordinateur ; l’application ne les chiffre pas. Elles peuvent contenir des identifiants, canaux, configurations et autres données privées. Protégez le profil et les fichiers selon les mesures de sécurité de votre système d’exploitation.
- IndexedDB n’est pas un fichier externe garanti à perpétuité. Exportez les sauvegardes : l’effacement des données du navigateur ou l’utilisation d’une autre origine fait perdre l’accès à l’historique. Le navigateur est invité à conserver les données de façon persistante lorsqu’il le permet.
- Une sauvegarde partielle ou échouée conserve dans l’historique les fichiers déjà confirmés. Ne supprimez pas ces sauvegardes.
- Le serveur ne fournit qu’une liste fixe de fichiers de l’application, écoute uniquement sur `127.0.0.1` et envoie CSP, Permissions-Policy, `nosniff` et `no-referrer`. Il ne sert ni configuration de l’éditeur, ni tests, ni chemins arbitraires.
- Les métadonnées de la radio et les fichiers sont affichés comme texte, pas comme HTML. `eval` n’est pas utilisé.
- SHA-256 détecte une corruption accidentelle, mais ne prouve pas l’authenticité du firmware. Utilisez des images provenant d’une source fiable. Aucun logiciel ne peut garantir une sécurité absolue ni une récupération après une panne d’alimentation.

## Tests et validation

```powershell
npm test
npm run check
```

Les tests de `tests/connectors.test.cjs` utilisent des appareils simulés et vérifient la fragmentation des octets, les trames, CRC, calibration, cartes par famille, sauvegarde complète, échec de persistance, autorisations, slots, réinitialisation, protection de Main, vérification après écriture et édition binaire. L’encodeur d’écriture OpenGD77 est testé dans une VM isolée où la barrière n’est remplacée que pour ce test ; le code de production reste verrouillé. Aucun matériel n’est écrit.

`tests/firmware.test.cjs` vérifie les sources et redirections autorisées, catalogues stables par modèle, limites, hashes, formats, cache, expiration, concurrence, vérification indépendante du navigateur et chemins/confidentialité du serveur. Il utilise des réponses réseau simulées et un serveur local éphémère ; il ne dépend pas d’Internet et ne télécharge pas de firmware à chaque exécution.

`tests/planning.test.cjs` vérifie l’importation atomique des canaux/contacts et les limites, le bloc SAT OpenGD77 de type 3 octet par octet par rapport au format CPS (initialisation, préservation des blocs, remplacement, rejet des zones corrompues/non vierges, TLE invalides et plus de 25 satellites), la préservation des octets, les ID BCD, la déduplication, les filtres, le CSV RX uniquement, le rejet des modes satellite incompatibles, checksum/âge des TLE, la propagation SGP4 comparée à un vecteur indépendant de Vallado, fenêtres et franchissements d’élévation, pagination RadioID, identifiants RepeaterBook réservés au serveur, délai après HTTP 429 et isolation des API. Aucun test n’utilise de vrais identifiants, n’écrit sur une radio ou n’interroge RepeaterBook.

`tests/site.test.cjs` vérifie la marque, le favicon et l’absence de scripts/styles en ligne sur toutes les pages ; la réponse du serveur pour l’aide et le logo, avec type MIME et en-têtes corrects ; les ancres et liens locaux de l’aide ; la présence exacte dans le code de chaque message du tableau des erreurs ; les liens relatifs de toute la documentation ; la licence, l’attribution des auteurs et les métadonnées du package ; ainsi que l’absence d’adresses e-mail, de secrets et de caractères corrompus.

L’interface de bureau/mobile, les états désactivés et le stockage IndexedDB sont également vérifiés dans un navigateur. La lecture USB a été testée physiquement sur une unité déclarée UV-K5 V3 avec F4HWN v6.0.0 ; les écritures, la RF et les radios OpenGD77 ne l’ont pas été. Ni la compatibilité sur le terrain ni le fonctionnement sur 100 % des appareils ne sont certifiés. Avant d’effectuer des écritures sur un appareil de valeur, il faut valider avec du matériel de test et disposer d’une procédure de récupération connue.

## Références d’interopérabilité

Implémentation indépendante fondée sur l’inspection des formats de protocole ; le code des références et leurs firmwares ne sont pas redistribués.

- [OpenGD77 CPS](https://grid.radio/opengd77/), protocole `C` / `R` / `W` / `X`, modes et carte du codeplug.
- [UV Studio](https://armel.github.io/uvstudio/).
- [UART du firmware F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/app/uart.c), contrats des messages et réponses.
- [Format et carte Multiboot](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/driver/mb_flash.h).
- [Multiboot et Multiconfig](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig).

Consultation effectuée le 18 octobre 2026. Les firmwares et protocoles peuvent changer ; les formats inconnus entraînent un échec explicite.

## Licence

Copyright (C) 2026 Anatol Emilio Lopez Maitchovcow (EA5KAO), Diego Roca (EA5JEF) et Pedro Roca.
Fondateurs et membres du conseil d’administration de [Bricohams](https://bricohams.org) ([bricohams.com](https://bricohams.com)).

Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier selon les termes de la [GNU General Public License](LICENSE), version 3 ou, à votre choix, toute version ultérieure (GPL-3.0-or-later). Il est distribué **sans aucune garantie**. Les dépendances et sources tierces conservent leurs licences respectives : voir [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.fr.md).

Bricohams n’est affilié ni à OpenGD77, grid.radio, F4HWN, Quansheng, RadioID, RepeaterBook, SatNOGS ni à CelesTrak. Les marques appartiennent à leurs propriétaires.