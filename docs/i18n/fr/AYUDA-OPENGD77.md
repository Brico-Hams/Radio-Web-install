# Aide OpenGD77 : configuration et utilisation en toute sécurité

**Date de vérification : 2026-10-25.** Rédaction originale en espagnol, fondée sur les sources officielles indiquées à la fin et sur le code de cette application. Il ne s'agit pas d'une traduction du manuel ni d'une garantie de fonctionnement pour toutes les builds.

Pour choisir une radio, une révision de carte ou une image précise, consulter [Modèles et compatibilité](AYUDA-OPENGD77-MODELOS.md). Ce document explique comment organiser la configuration, utiliser les fonctions documentées et reconnaître les limites de l'éditeur web.

## Suppression locale de canaux (bêta)

Dans un codeplug standard de 128 KiB, **Supprimer du fichier** libère la mémoire sélectionnée et supprime ses références dans les 68 zones standard (80 canaux par zone) et les 64 listes de balayage (32 canaux par liste). La fonction nettoie également les références en tant que priorité 1, priorité 2 et canal TX désigné, en les ramenant à zéro. Elle conserve les noms, indicateurs, autres canaux et leurs numéros ; aucune renumérotation n'est effectuée. Elle ne modifie ni les contacts ni la liste SAT. La cartographie est comparée au [parseur binaire du CPS public](https://grid.radio/opengd77/js/g77.js).

Cette procédure ne prend pas en charge les formats Scanner avec zones étendues. Elle opère sur une copie en mémoire : exporter le binaire modifié sous un autre nom et conserver l'original. En mode normal, une confirmation est demandée ; PRO l'omet pour cette session. Aucune écriture n'est effectuée dans la radio : l'écriture physique OpenGD77 reste bloquée tant que la sauvegarde MCU intégrale requise n'est pas disponible. Une radio Quansheng connectée ne permet pas de valider le matériel OpenGD77.

## Importer des répéteurs REMER (fichier local uniquement)

L'onglet REMER du planificateur propose les fréquences VHF/FM transcrites depuis la référence fournie par l'utilisateur. Sélectionner les mémoires nécessaires et les ajouter au codeplug ouvert ; l'application le relit avec le parseur OpenGD77 pour vérifier que le nom, les fréquences et le mode apparaissent dans la liste. Les mémoires sont préparées uniquement pour la réception. Les CTCSS publiés restent des notes de référence : les tonalités ne sont ni codées ni vérifiées en RF.

La liste ne certifie pas qu'une fréquence, une tonalité, un emplacement ou un répéteur soit toujours en service. Confirmer les informations auprès de REMER et des autorités compétentes avant toute utilisation. Les fréquences HF/SSB de la même référence sont présentées à titre de contexte et ne sont pas importées comme canaux VHF. L'acceptation d'un canal par le parseur prouve uniquement que la structure standard du binaire est lisible ; elle ne prouve pas que le firmware l'affichera après écriture, qu'une réception RF est possible ni que la radio a été programmée. L'écriture physique reste bloquée.

## Importer des canaux CSV de CPS ou CHIRP

Dans **Canaux préparés**, importer `Channels.csv` exporté depuis OpenGD77 CPS ou un CSV avec les en-têtes CHIRP standard (`Name`, `Frequency`, `Duplex`, `Offset`, `Mode`). Le parseur n'accepte que des canaux FM analogiques dans les bandes VHF 136-174 MHz et UHF 400-470 MHz. Pour CHIRP, il résout `+`, `-`, `split` et `off`, et rejette les fréquences, décalages ou modes qu'il ne peut pas valider. Les enregistrements sont convertis en canaux RX uniquement ; les tonalités de la source sont notées, mais non programmées. Vérifier le tableau des canaux préparés, choisir un modèle FM et enregistrer le binaire local pour l'inspecter avant de l'utiliser avec le CPS.

Les lignes numériques/DMR de `Channels.csv` sont explicitement exclues : les contacts, groupes TG, listes RX et références de zones de `Contacts.csv`, `TG_Lists.csv` et `Zones.csv` ne sont pas migrés par cette importation. Ces fichiers sont des tables liées, pas un codeplug binaire autonome. Les CSV propriétaires de Retevis/RT950 et les `.4rdmf` ne sont pas interprétés d'après leur extension ou la présence de colonnes de fréquences : il faut des spécifications vérifiées pour mapper les champs. Toute ligne exclue est signalée avec son numéro et le motif ; elle n'est ni supprimée silencieusement ni mélangée au binaire.

## Vérification web sans installation (25-10-2026)

L'interface comprend une matrice **OpenGD77 CPS : disponibilité réelle sur le web**. Le site est statique et servi en HTTPS, sans installation de Node ni du paquet local. L'accès physique exige WebUSB/Web Serial et les autorisations du navigateur ; un pilote système peut être nécessaire. La compatibilité mobile n'est pas garantie.

| Fonction | Web sans serveur installé |
| --- | --- |
| Ouvrir/enregistrer un codeplug standard, modifier/supprimer des canaux et nettoyer les références | Disponible |
| Importer RadioID user.csv | Disponible ; la requête API directe est bloquée par CORS |
| Groupes BrandMeister | Requête directe par préfixe et importation comme groupes |
| RepeaterBook | Importation du JSON obtenu avec autorisation ; requête authentifiée uniquement avec serveur |
| Liste SAT, TLE publiés, passes SGP4 et mémoires Doppler | Disponible dans le navigateur |
| Sauvegarder le calibrage/codeplug à la connexion | Automatique, persistant et avec hashes ; copie partielle |
| Copier le firmware MCU de l'appareil | Pas d'implémentation intégrale vérifiée par modèle |
| Opérations radio après une sauvegarde partielle | Bloquées, y compris nouvelle lecture/capture |
| Flashage, restauration, voix, base massive d'IDs et éditeur complet des zones/réglages | Non implémentés ici |

Une parité complète avec grid.radio ou le CPS de bureau n'est pas promise. Les en-têtes des fournisseurs ont été vérifiés : BrandMeister accepte l'origine web ; RadioID ne renvoie pas Access-Control-Allow-Origin pour la requête testée. Ces limites ne sont pas masquées par des proxys publics ou des données fictives.

### Sauvegarde préalable obligatoire

La connexion identifie l'appareil et lance automatiquement BackupManager avant d'autoriser toute autre opération radio. L'identification et les lectures nécessaires à la création de la copie en sont les seules exceptions. Le calibrage et le codeplug sont enregistrés dans IndexedDB, puis relus avec SHA-256 avant l'export du manifeste. En l'absence de firmware MCU, le résultat indique **SAUVEGARDE PARTIELLE**, aucune autorisation n'est accordée et les nouvelles lectures, captures, écritures et restaurations sont bloquées, y compris en PRO. Cette copie permet d'ouvrir le codeplug et de le modifier hors ligne sans toucher à la radio.

Cette protection ne crée pas un lecteur de firmware inexistant. Il n'est pas possible d'affirmer que le firmware original complet est déjà sauvegardé automatiquement. Aucun mode/adresse MCU arbitraire n'est testé pour simuler cette fonction.
Si « original » désigne le firmware commercial d'usine déjà remplacé, seule une copie antérieure à l'installation convient ; la lecture d'OpenGD77 ne récupère pas ces octets.

## 1. Avant de connecter ou d'émettre

1. Identifier le fabricant, le modèle complet, la révision matérielle et le firmware installé. « UV380 », « 10W » et « 10W PLUS » ne sont pas équivalents.
2. Noter la version du CPS, la date/build du firmware, la langue et les modifications matérielles. Conserver également le nom et la provenance du paquet installé.
3. Vérifier votre autorisation, le plan de bandes et les paramètres publiés par le responsable du répéteur ou du réseau. Un champ de fréquence accepté par un logiciel **n'autorise pas à émettre**.
4. Commencer par des canaux en **réception uniquement**, VOX désactivé et balises APRS désactivées. Brancher une antenne adaptée avant toute émission.
5. Enregistrer les copies originales en dehors du navigateur. Ne pas calibrer ni installer un autre firmware pour résoudre une simple erreur de canal.

OpenGD77 est destiné à la radioamateur. Il ne conserve pas nécessairement toutes les fonctions du firmware commercial. Le guide consulté indique que SMS TX/RX et les listes de balayage commerciales ne sont pas pris en charge, et que la confidentialité/le chiffrement ne font pas partie de ses objectifs. Ne pas interpréter cette description comme un avis juridique mondial. [G: Introduction]

### Trois sens différents du terme « pris en charge »

| Preuve | Ce qu'elle démontre | Ce qu'elle ne démontre pas |
| --- | --- | --- |
| Un modèle figure dans le manuel | Il existe de la documentation pour cette famille ou cette fonction | La compatibilité de toute révision commerciale |
| Présence dans `firmware-core.js`, `TARGETS` | Le catalogue reconnaît une destination et certains noms de paquets | L'installation USB, l'authenticité à elle seule ou la compatibilité avec votre carte |
| Présence dans `gd77-connector.js`, `MODELS` | Le connecteur connaît une valeur d'identification du protocole | Des essais physiques pour chaque modèle, le flashage ou l'autorisation d'écriture |
| La radio répond à l'identification | Une structure reconnue a été reçue et une famille correspondante a été trouvée | Une sauvegarde intégrale ou une compatibilité universelle de la mémoire |
| L'éditeur affiche des canaux | Il peut interpréter la zone standard du fichier | La lecture des canaux étendus, de toutes les données utilisateur ou du firmware |

**État réel de ce site web : l'écriture OpenGD77 est BLOQUÉE.** La sauvegarde implémentée enregistre le calibrage et le codeplug standard, mais renvoie `complete: false` : il manque un protocole vérifié pour copier intégralement le firmware interne du MCU. Aucune autorisation d'écriture n'est donc accordée. Télécharger une image officielle **ne remplace pas** une copie de l'appareil. Le fait qu'un CPS externe autorise l'écriture ne supprime pas ce blocage. [L]

## 2. Firmware, codeplug, calibrage et sauvegardes
| Élément | Contenu ou objectif | Précaution |
| --- | --- | --- |
| Firmware | Programme exécuté par la radio | Choisir la famille, la révision et la variante exactes ; ce n'est pas une liste de canaux |
| Codeplug | Configuration : canaux, contacts, groupes, zones et autres réglages | Le format du fabricant et celui d'OpenGD77 ne sont pas interchangeables sans vérification |
| Calibrage | Réglages RF propres à cette unité | Ne pas copier depuis une autre radio ni modifier sans instruments et procédure spécifique |
| EEPROM / Flash | Régions mémoire dont le contenu dépend de l'appareil | « Flash » ne désigne pas nécessairement le firmware MCU ni un clonage intégral |
| MCU ROM / mémoire interne | Image interne que le CPS peut traiter comme une sauvegarde séparée sur certains appareils | Le site web ne dispose pas d'une lecture intégrale vérifiée permettant d'accorder l'autorisation |
| Voix, base d'IDs, données orbitales | Ressources supplémentaires chargées avec le CPS | Ne pas supposer qu'elles sont incluses dans un codeplug de 128 KiB |

Le guide recommande de sauvegarder l'EEPROM, la Flash, le calibrage, la MCU ROM et le codeplug avant la première écriture de configuration. La disponibilité réelle de chaque sauvegarde doit être vérifiée pour le CPS et le modèle utilisés ; cette liste ne certifie pas que toutes les radios exposent des régions identiques. Archiver les originaux, pas seulement le fichier modifié. [G: Backup Before You Do Anything Else]

### Utilisation disponible sur le web

1. Ouvrir l'application sur `localhost` ou en HTTPS et utiliser un navigateur prenant en charge WebUSB ou WebSerial, selon la famille. La compatibilité dépend du navigateur et du système.
2. Sélectionner la bonne famille : `MK22`, `STM32` ou `SERIAL`. Confirmer l'identification physique avant la connexion.
3. Fermer le CPS, MMDVMHost et tout programme utilisant la radio. N'autoriser que l'appareil attendu.
4. La connexion identifie la radio et demande une sauvegarde automatique. Examiner le journal et les erreurs : le résultat attendu est **partiel**, pas une sauvegarde intégrale.
5. Vérifier le téléchargement du fichier `.rwb.json`. L'historique permet de réexporter le manifeste et les binaires individuels. Le navigateur peut refuser le stockage persistant : exporter dans un dossier personnel.
6. Le codeplug de la sauvegarde partielle s'ouvre automatiquement pour être modifié hors ligne. **Lire le codeplug** reste bloqué sans sauvegarde intégrale. Il est également possible d'ouvrir un binaire standard de **131072 octets (128 KiB)** exactement ; les extensions acceptées ne remplacent pas la validation du contenu.
7. Modifier le fichier local et utiliser **Enregistrer le binaire 128 KiB**. Cela ne modifie pas la radio. L'écriture reste bloquée.
8. Déconnecter depuis l'application avant de changer de page ou d'ouvrir le CPS.

Le formulaire modifie les canaux existants : nom ASCII jusqu'à 16 caractères, RX, TX, FM/DMR, CC, TS et réception uniquement. Il préserve les champs non modifiés ; ce n'est pas un éditeur complet de toutes les fonctions du CPS. Les outils de planification peuvent également incorporer au fichier local des canaux basés sur un modèle, des contacts et des données satellitaires. Cela ne prouve pas que toutes les fonctions du firmware soient implémentées dans le navigateur. [L]

**Limite importante :** la lecture web concerne la zone standard de 128 KiB et n'inclut pas les canaux étendus **1025 et suivants**. Ne pas décrire le fichier comme un clone complet ni comme une copie de toutes les zones et ressources d'une configuration étendue. Un JSON de sauvegarde ou du CPS, un ZIP de firmware et un binaire de taille identique ne sont pas automatiquement des codeplugs valides.

### Travail avec le CPS externe

Le guide exige **OpenGD77 CPS** pour une radio exécutant déjà OpenGD77 ; pas le CPS commercial de Radioddity, Baofeng, TYT ou Retevis. Il recommande de créer un nouveau codeplug ou d'importer un CSV et de vérifier le résultat. Enregistrer l'original et une version de travail avant toute écriture. Après une écriture autorisée par le CPS, relire et vérifier un canal pour chaque scénario. Cette procédure ne permet pas de débloquer le site web. [G: Codeplug compatibility; CPS software]

## 3. Modèle mental : organisation des données

```text
Identidad propia: indicativo + DMR ID
Contactos digitales: destinos TG o llamadas privadas
Lista TG / RX Group: selección de destinos para un canal
Canal: RX/TX + modo + tonos o CC/TS + destino/lista + restricciones
Zona: selección ordenada de canales
Exploración: canales de la zona o intervalo del VFO
```

Une **base de données d'IDs** sert à afficher les noms des correspondants. Elle ne remplace pas les contacts et n'assigne pas le TG d'émission. Un **contact numérique** peut représenter un groupe ou un appel privé : le type compte autant que le numéro.

Dans le CPS ou les codeplugs commerciaux, on trouve « RX Group », « RX Group List » ou « groupe de réception ». OpenGD77 documente l'utilisation des **TG Lists** pour sélectionner des TG depuis le canal et, selon le filtre, limiter ce qui est reçu. Ne pas supposer qu'une liste importée reproduit exactement les règles de réception du firmware commercial. [G: CPS software — Overview]

### Ordre de programmation recommandé

1. Saisir votre indicatif et votre DMR ID, le cas échéant.
2. Créer des contacts numériques de type groupe pour les TG nécessaires ; séparer les appels privés.
3. Créer des listes TG adaptées au répéteur, à la zone géographique ou à l'usage.
4. Créer des canaux avec les fréquences, le mode et les paramètres du service réel.
5. Assigner une liste TG ou un contact direct, selon le flux choisi.
6. Regrouper les canaux en zones de petite taille et bien ordonnées.
7. Vérifier les exclusions de balayage, la puissance, TOT et le mode réception uniquement.
8. Enregistrer, vérifier et tester d'abord en réception.

Il n'est pas nécessaire de dupliquer un canal par TG lorsque RX/TX, CC et utilisation du répéteur sont identiques et que la liste TG couvre les destinations. Il peut toutefois être utile de séparer les canaux avec un TS différent, des conditions d'utilisation ou des restrictions distinctes.

**Nuance entre versions :** la section générale du CPS recommande au moins une liste TG avec un contact de groupe ; la section `Channel Details` documente également la sélection de **TG Lst ou Contact**, et non les deux simultanément. Ces flux doivent être vérifiés avec le CPS/la build utilisé ; ils ne permettent pas d'affirmer que toutes les versions gèrent les deux de la même façon.

## 4. Champs de canal et signification pratique

| Champ | FM | DMR | Points à vérifier |
| --- | --- | --- | --- |
| Nom | Identification locale | Identification locale | Le nom ne configure pas le répéteur |
| RX | Fréquence d'écoute de la radio | Fréquence d'écoute de la radio | Sur un répéteur, généralement sa sortie |
| TX | Fréquence d'émission de la radio | Fréquence d'émission de la radio | Sur un répéteur, généralement son entrée |
| Mode | FM / FM étroite | DMR | Doit correspondre au service |
| BW | 25 ou 12,5 kHz selon le guide | Ne signifie pas la sélection du TS | Respecter le plan de canaux local |
| RX CSS | CTCSS ou DCS en réception | Ne s'applique pas comme filtre DMR | Une tonalité incorrecte peut couper un audio valide |
| TX CSS | CTCSS ou DCS émis | Ne s'applique pas | Utiliser la tonalité requise par le répéteur |
| Color Code | Sans objet | CC 0–15 | Ce n'est ni un TG ni une tonalité analogique |
| Timeslot | Sans objet | TS1 ou TS2 | Doit correspondre à l'affectation du réseau |
| TG List / Contact | N'est pas une liste de tonalités DTMF | Destination sélectionnable ou directe | Vérifier le type groupe/privé et les éventuels overrides |
| DMR ID | N'identifie pas à lui seul une émission FM | Identité numérique personnelle | Un réglage spécifique par canal peut exister |
| RX Only | Évite l'émission | Évite l'émission | Très utile pendant la préparation |
| TOT | Limite la durée d'émission | Limite la durée d'émission | Vérifier la durée effective et l'avertissement |
| Ch Power | Puissance propre ou Master | Puissance propre ou Master | La valeur affichée n'est pas une mesure RF |
| Zone Skip / All Skip | Exclusion du balayage | Exclusion du balayage | Ce sont des commandes différentes |
| Emplacement du canal | Coordonnées du répéteur | Coordonnées du répéteur | Ne pas confondre avec l'emplacement de l'opérateur |
| APRS | Profil de balise FM | Peut nécessiter une fréquence FM distincte | N'équivaut pas à la réception APRS |

**Simplex :** RX et TX sont identiques. **Répéteur :** programmer explicitement les deux fréquences ; ne pas se fier uniquement au signe d'un décalage. Le pas de syntonisation du VFO n'est pas la largeur de bande FM.\r\n\r\n`Reverse` inverse le fonctionnement RX/TX du répéteur ; `Talkaround` émet sur la fréquence RX pour le fonctionnement direct. Ces fonctions ne sont pas identiques et le guide les décrit comme mutuellement exclusives. Ne les utiliser qu'après avoir vérifié où la radio émettra réellement. `Force DMO` force le fonctionnement DMR direct même lorsque les fréquences diffèrent ; ce n'est pas une option générale pour « améliorer la couverture ». [G: Channel Quick Menu; Channel Details]
## 5. Scénario A : canal FM d'écoute ou répéteur

1. Créer un canal FM et commencer avec `RX Only`.
2. Saisir RX et TX selon les informations du responsable du service ; en simplex, utiliser la même fréquence.
3. Régler la FM large/étroite selon le plan de canaux.
4. Saisir la tonalité **TX** requise. Laisser RX CSS sans tonalité pendant le diagnostic, sauf nécessité connue.
5. Régler le squelch pour éliminer le bruit sans couper les signaux faibles ; il ne remplace pas une tonalité correcte.
6. Ajouter le canal à une zone ; vérifier `Zone Skip` et `All Skip`.
7. Vérifier l'audio en réception. Ensuite seulement, si vous êtes autorisé, activer TX à une puissance prudente et effectuer un bref essai.

CTCSS et DCS contrôlent l'ouverture audio ou l'accès ; **ils ne chiffrent pas la conversation**. Le monitor aide à distinguer l'absence de signal d'une fermeture due au filtre. Le balayage de tonalités du VFO peut détecter CTCSS ou DCS ; selon le guide, le résultat s'applique à RX comme à TX : vérifier les deux avant toute émission.

La tonalité d'ouverture **1750 Hz** et les séquences **DTMF** sont différentes de CTCSS/DCS. Ne pas envoyer de DTMF à des contrôleurs sans connaître leur fonction et sans autorisation. Le son entendu localement ne reproduit pas toujours exactement le DTMF émis : le guide signale des différences matérielles sur MD-UV380 et MD-9600. [G: FM specific functionality]

## 6. Scénario B : répéteur DMR avec plusieurs TG

1. Obtenir RX, TX, CC et la répartition des TG par TS auprès du responsable du répéteur.
2. Saisir un DMR ID valide. Ne pas utiliser l'ID d'une autre personne ni le numéro du TG comme identité personnelle.
3. Créer des contacts de type **Group Call** avec leurs numéros de TG ; créer une liste TG et l'assigner au canal.
4. Configurer RX/TX, CC et TS du canal. Choisir d'abord un TG connu et autorisé sur ce TS.
5. Vérifier la réception avec les filtres prévus ; pour le diagnostic, assouplir les filtres de façon contrôlée, puis rétablir leur configuration normale.
6. Vérifier qu'aucune sélection manuelle de TG/TS d'un essai précédent n'est encore active.
7. Le cas échéant, avant d'émettre, écouter, activer le TG conformément aux règles du réseau et laisser des pauses entre les interventions.

Entendre un TG ne signifie pas qu'il est relié en permanence à ce répéteur. Les TG statiques, dynamiques, réflecteurs et règles d'activation dépendent du **réseau et de l'administrateur**, pas seulement du codeplug.

### Sélection temporaire, contacts et appels privés

Dans la disposition de touches de référence, `#` permet de saisir un TG ; deux pressions sur `#` permettent d'entrer une destination privée. La touche de changement de TS et les contacts avec TS préféré peuvent modifier le TS actif. Les commandes équivalentes varient selon la radio ; consulter le tableau des modèles.

Une sélection manuelle ou un **override** peut l'emporter sur le canal ou la liste. Le guide indique qu'on efface l'override TS en maintenant la touche TS et qu'on quitte un appel privé en sélectionnant un TG ou avec d'autres commandes spécifiques. Vérifier la destination et le TS affichés **avant le PTT**.

Ne pas confondre un « appel privé » DMR avec la confidentialité. Il n'est pas chiffré du seul fait qu'il est privé. La réception ou l'acceptation automatique d'appels privés dépend également des options du firmware. [G: DMR specific functionality; Making and receiving DMR Private Calls]

### Filtres DMR : ils ne sont pas tous identiques

| Commande | Effet | Précaution |
| --- | --- | --- |
| DMR Filter Off | N'applique pas le critère TG/contact des autres modes | Ne supprime pas toutes les exigences du signal |
| TG | Filtre selon le TG sélectionné | Peut masquer d'autres groupes qui sont bien reçus |
| Ct | Filtre, selon le guide, les contacts d'appels privés du codeplug | Ne pas confondre avec une liste TG |
| TGL | Filtre selon les groupes de la liste TG | Vérifier le contenu et l'affectation de la liste |
| TS Filter | Écoute le slot prévu ou permet de rechercher une activité sur les slots | Sa désactivation ne crée pas deux récepteurs simultanés |
| CC Scan, précédemment CC Filter | Recherche un CC valide pour la réception | Ne signifie pas « ignorer tous les CC » ; peut retarder ou manquer le début |

Le guide explique que le circuit DMR nécessite un CC et que le firmware recherche une correspondance lorsque `CC Scan` est activé. Cette fonction n'est pas recommandée en fonctionnement normal lorsque le CC est connu. Il explique aussi que l'écoute des deux TS repose sur un algorithme de sélection et non sur une réception simultanée indépendante. L'inversion visuelle de CC/TS et du mode peut indiquer des réglages de filtre, pas un défaut d'écran. [G: Filters (Channel)]

**Diagnostic ordonné :** fréquence et mode → signal RF → CC → TS → TG/type d'appel → filtres → état de la liaison réseau. Tout changer en même temps empêche de savoir ce qui a résolu le problème.

## 7. Zones, RX groups et balayage

Une **zone** est une collection ordonnée de canaux ; ce n'est ni une bande ni un réseau. Un même canal peut figurer dans plusieurs zones. Une **liste TG** rassemble des destinations numériques ; elle n'indique pas quels canaux balayer.

Le guide n'implémente pas les **Scan Lists commerciales** comme fonction équivalente. Pour reproduire un ensemble de balayage, créer une zone contenant ces canaux et balayer la zone. L'importation du champ « Scan List » d'un fichier commercial ne suffit pas.

### Scénario C : balayer une zone locale

1. Créer une zone avec les canaux que vous souhaitez réellement écouter.
2. Vérifier qu'ils sont utilisables individuellement et ne sont pas exclus par `Zone Skip`.
3. Démarrer le balayage avec la commande de votre modèle. Sur GD-77 et plusieurs modèles avec l'affectation de référence, un appui long sur « haut » est utilisé.
4. Ajuster `Scan dwell` si des signaux faibles ou intermittents sont manqués : une durée plus longue par canal augmente les chances de détection, mais ralentit le balayage.
5. Choisir le comportement : `Hold` reste sur le canal en présence d'un signal ; `Pause` reprend après le délai ; `Stop` s'arrête lorsqu'un signal valide est détecté.
6. Utiliser l'exclusion temporaire d'un canal gênant si elle est disponible. Ne pas la confondre avec la modification persistante de `Zone Skip` ou `All Skip`.
7. Pour `All Channels`, vérifier séparément `All Skip`.

Le balayage VFO utilise des limites inférieure/supérieure et un pas, pas une zone. `Dual Watch` alterne l'attention entre les VFO ; **cela ne démontre pas une double réception simultanée**. Le balayage spectral est un autre affichage, pas un analyseur étalonné. [G: Scanning; VFO specific functionality; Channel Details]

Sur GD-77S, organiser des zones de **16 canaux accessibles au maximum** à l'aide du sélecteur ; le fait que le format permette des zones plus grandes n'augmente pas la capacité des commandes physiques.

`Roaming`, dans le guide consulté, trie la zone selon la distance des répéteurs lorsque l'emplacement de l'opérateur et les coordonnées des canaux sont disponibles. Cela ne vérifie pas que chaque répéteur fonctionne et ne sélectionne pas le signal RF le plus puissant. Cette fonction ne trie pas `All Channels` et est désactivée pendant le balayage. [G: Roaming]

## 8. Écrans, commandes et conservation des modifications

| Écran ou mode | Utilisation | Vérification |
| --- | --- | --- |
| VFO A/B | Syntonisation et essais des paramètres | Vérifier RX et TX, pas uniquement la fréquence en évidence |
| Canal | Fonctionnement depuis le codeplug et la zone | Vérifier la zone, le canal, le TG et le TS effectivement utilisés |
| Channel Details | Modifier les données du canal ou du VFO | Distinguer une application temporaire de l'enregistrement |
| Last Heard | Examiner l'activité numérique reçue | Ne représente pas tous les utilisateurs du réseau |
| Radio Info | Batterie, date/heure et emplacement selon l'appareil | L'heure peut être perdue sans RTC |
| RSSI | Indication du niveau reçu | Ne remplace pas un mesureur RF étalonné |
| GPS | État du récepteur installé | L'absence ou `None` ne se corrige pas en chargeant un codeplug |
| Satellite | Prévisions et fonctionnement orbital | Nécessite une heure, une position et des éléments orbitaux valides |

Dans `Channel Details`, le guide distingue **Green** pour confirmer, **SK2 + Green** pour enregistrer de manière persistante et **Red** pour annuler. Le verrouillage de configuration peut empêcher les modifications permanentes. Ces noms désignent des commandes logiques, pas des boutons physiquement identiques sur tous les appareils.

Les réglages temporaires de puissance du canal, du TG et du TS peuvent ne pas modifier le codeplug. Après un essai, changer de canal ou consulter les détails pour vérifier ce qui a été enregistré. Conserver une version connue du fichier sur l'ordinateur.

Selon la plateforme/la build, les options d'affichage comprennent le rétroéclairage, le contraste, l'inversion, les couleurs et le mode jour/nuit. L'inversion de l'écran d'un GD-77 ne le transforme pas physiquement en variante LCD « Black ». Ne pas extrapoler les thèmes de couleurs aux modèles monochromes ni les captures d'écran au GD-77S dépourvu d'écran. [G: Main screens; Display Options; Channel Details]

## 9. Accessibilité et audio

OpenGD77 documente les alertes sonores, la répétition des annonces vocales et les niveaux de voix. Les ressources vocales sont chargées **séparément avec le CPS** ; changer la langue du menu ne modifie pas automatiquement la voix installée.

1. Vérifier que le fichier vocal convient au firmware et à la langue.
2. Sélectionner `Prompt` : silence, bips, bips sans touches ou voix, selon la disponibilité.
3. Tester les niveaux `Voice`, `Voice L2` et `Voice L3` : ils modifient le moment où les informations sont annoncées et leur niveau de détail ; ce ne sont pas trois langues.
4. Utiliser la commande équivalente à SK1 pour répéter la dernière annonce ; si la radio parle déjà, cela peut l'arrêter.
5. Ajuster le volume des bips et des alertes de début/fin DMR et TOT sans supprimer les avertissements nécessaires.
6. Effectuer un essai complet sans dépendre de l'écran avant d'utiliser la configuration en déplacement.

Sur **GD-77S**, le chargement des voix est essentiel à une utilisation pratique, car il n'y a ni écran ni clavier. Le bouton de mode permet de parcourir les commandes du TG, du balayage, du TS, du CC, des filtres, de la zone et de la puissance ; SK1/SK2 changent de fonction selon le mode annoncé. Ne pas appliquer les séquences du GD-77 avec écran. [G: Sound Options — Prompt; GD-77S operation]

Le gain du microphone FM et DMR se règle séparément. Un gain plus élevé n'augmente pas la portée : il peut nuire à l'intelligibilité. VOX peut déclencher des émissions involontaires ; le désactiver pendant la configuration, les essais et la connexion USB.
## 10. Puissance, batterie et calibrage

La puissance **Master** est utilisée en VFO et sur les canaux qui héritent de ce réglage ; un canal peut avoir sa propre puissance. Le guide indique que la puissance propre au canal est affichée en évidence et qu'une modification effectuée en cours d'utilisation peut être temporaire. Pour la rendre persistante, suivre la procédure d'enregistrement des détails propre au modèle.

Il n'existe pas d'échelle unique valable pour tous les portatifs et mobiles. Le guide distingue les appareils de 5 W, les variantes de 10 W et les mobiles ; de plus, l'option d'échelle d'un UV380 **10W sans PLUS** ne transforme pas un portatif normal en un matériel différent. La variante **10W PLUS nécessite son image spécifique**. [G: Controlling Tx power; Radio Options — Mode; F2]

Bonnes pratiques :

- Utiliser la puissance minimale nécessaire et une antenne appropriée.
- Vérifier l'alimentation, la batterie, les connecteurs et le ROS avant de rechercher une prétendue perte de puissance.
- Ne pas considérer une valeur affichée comme une garantie de puissance mesurée.
- Ne pas chercher à obtenir 10 W en modifiant l'étiquette, le menu ou le calibrage d'une unité de 5 W.
- Ne pas copier le calibrage d'une autre radio, même si elle porte le même modèle.
- Ne pas modifier les réglages de référence, de déviation ou de puissance pour corriger une erreur CC/TG.
- Le calibrage nécessite des instruments, une charge adaptée et la procédure spécifique. Sans cela, conserver les valeurs d'origine.

Une radio peut beaucoup chauffer lors d'émissions prolongées, en particulier en hotspot. Une puissance tolérable pour de la voix intermittente ne garantit pas un fonctionnement continu sans risque.

## 11. Hotspot DMR par USB

Le guide documente l'utilisation de la radio comme modem de **voix DMR** pour MMDVMHost/Pi-Star et mentionne BlueDV sous réserve de compatibilité. Ce n'est ni un accès au réseau depuis le navigateur, ni un point d'accès Wi-Fi, ni une transformation de toutes les radios en répéteurs duplex.

### Scénario D : radio compatible utilisée comme hotspot

1. Vérifier la compatibilité du modèle et de la build. **RD-5R/DM-5R ne prend pas en charge le hotspot** en raison de la limitation USB pendant TX.
2. Sélectionner l'option hotspot appropriée sur la radio ; ne pas conserver simultanément une session CPS/web.
3. Connecter le câble de programmation approprié à l'ordinateur ou à l'équipement MMDVMHost.
4. Dans Pi-Star, le guide identifie le type de modem `OpenGD77 DMR hotspot (USB)`. S'il n'existe pas, vérifier la version et la documentation de l'hôte.
5. Configurer la fréquence, le CC, l'ID et le réseau conformément à la réglementation et à l'hôte. Vérifier le mode sur l'écran de la radio.
6. Commencer à faible puissance, assurer la ventilation et effectuer de courts essais. Ne pas extrapoler à un mobile les tableaux de pourcentage/puissance d'un portatif.
7. Si l'USB redémarre pendant l'émission, rechercher d'abord une injection RF : le guide recommande une antenne externe déportée, une protection RF sur l'USB et des mesures adaptées sur l'hôte. Dans ce montage, éviter de placer l'antenne sur l'ordinateur portable.

Les valeurs `RFLevel`/pourcentage de l'hôte ne sont pas des watts universels. Le guide décrit même un traitement particulier de la valeur 100 dans certaines implémentations ; ne pas en faire une règle pour toute build. La gestion des groupes, l'authentification et les liaisons relèvent aussi du logiciel et du réseau de l'hôte. [G: Hotspot mode]

## 12. APRS : possibilités et limites

Le guide documente **l'émission APRS FM AFSK à 1200 ou 300 bauds** et **l'absence de réception/décodage APRS AX.25**. Ne pas promettre l'affichage d'une carte des stations reçues, la messagerie APRS bidirectionnelle ni un TNC généraliste.

Il s'agit de mécanismes distincts :

| Mécanisme | Transport des données | Dépendances |
| --- | --- | --- |
| FM APRS | Paquet AFSK sur une fréquence FM | Profil APRS, indicatif, position et fréquence appropriée |
| Position par Talker Alias DMR | Informations dans le flux DMR | Prise en charge par le répéteur/réseau et options TA |
| Publication sur un site APRS | Traitement ultérieur par l'infrastructure | Couverture des récepteurs, passerelle et réseau ; non garantie par la seule émission |

### Scénario E : première balise FM APRS

1. Configurer l'indicatif et un profil APRS dans OpenGD77 CPS. Le guide décrit jusqu'à **8 profils**, pas un nombre universel pour toutes les versions futures.
2. Régler SSID, destination/route, symbole, commentaire, débit et fréquence selon le réseau local. Ne pas reprendre une route terrestre pour un satellite.
3. Fournir une position manuelle valide ou un véritable GPS avec fix. Ne pas sélectionner GPS comme source si la radio ne possède pas de récepteur opérationnel.
4. Assigner le profil au canal ou au VFO concerné.
5. Sélectionner d'abord `Manual` ; vérifier l'emplacement et la fréquence avant d'émettre une balise d'essai.
6. Vérifier la réception avec une infrastructure ou un récepteur adapté, pas uniquement avec le bip local. Certains modèles ne reproduisent pas le retour audio.
7. Activer `PTT`, `Auto` ou `Smart` seulement ensuite, si nécessaire. Vérifier l'intervalle et la décroissance pour ne pas occuper inutilement le canal.

En mode `PTT`, selon le guide, la balise est émise au relâchement du PTT sous réserve des temporisateurs ; `Auto` utilise des intervalles et `Smart` s'adapte au mouvement et au virage. Une position invalide peut empêcher l'émission de la balise ou afficher `Location?`. La désactivation temporaire et les combinaisons de touches dépendent du modèle.

Un profil peut définir une fréquence TX différente ; sinon, celle du canal/VFO analogique est utilisée. Sur un canal DMR, le guide exige une fréquence APRS explicite pour cette fonction FM. La fréquence propre au profil ne s'applique pas de la même façon en mode satellite ni dans le mode APRS `PTT` : vérifier ces exceptions avant utilisation. [G: FM APRS location transmission; APRS Options]

L'option TA `APRS` ou `Both` n'active pas de récepteur AX.25. Le guide avertit de problèmes liés au Talker Alias émis sur les répéteurs/réseaux Motorola ; laisser TA TX désactivé sauf prise en charge connue du système. La réception TA ne dépend pas de l'activation de son émission. Ne pas publier automatiquement des coordonnées personnelles sans en évaluer les implications en matière de vie privée.

## 13. GPS, NMEA et journalisation

Le GPS est une **capacité matérielle**, et non une fonction ajoutée en installant un fichier. Le guide documente des versions à récepteur optionnel et des modifications de certaines familles ; toutes les unités portant le même nom ne sont pas équipées du GPS.

| État/option | Signification dans le guide | Conséquence |
| --- | --- | --- |
| `None` | Aucun module détecté | Vérifier la variante, l'installation et la compatibilité ; ne pas supposer une panne du menu |
| `Off` | GPS désactivé | MD-9600/RT-90 comportent des restrictions de commande de l'alimentation |
| `On` | Récepteur activé | Il doit acquérir une position ; faire un essai à l'extérieur |
| `NMEA` | Données GPS envoyées par l'USB série | Empêche la communication normale avec le CPS jusqu'au retour à `Off` ou `On` |
| `Log` | Journal NMEA dans la Flash | Consomme de l'espace et peut remplacer d'autres ressources |

L'absence de fix à l'intérieur ne prouve pas une panne du module. Attendre d'être dehors et consulter l'écran GPS. La direction déduite du déplacement n'est pas une boussole magnétique utilisable à l'arrêt. Lorsque le GPS fonctionne, le guide documente la mise à jour de l'horloge et l'utilisation de la position par d'autres fonctions.

**Avertissement mémoire :** sur les appareils dotés de 1 MB de Flash, comme l'exemple GD-77 du guide, l'activation du journal GPS utilise l'espace de la base d'IDs DMR et peut **supprimer ses données** ; la présence des voix affecte également l'espace disponible. Désactiver le journal et recharger la base si nécessaire. Ne pas attribuer les capacités de journalisation d'une Flash à tous les modèles. [G: General Options — GPS; GPS Screen]

Les paquets MK22 suffixés par `_NMEA` sont des variantes publiées ; leur existence ne prouve pas qu'une radio non modifiée possède un GPS. Ne pas confondre une **image variante NMEA** avec le **mode de sortie NMEA par USB** du menu. Vérifier les notes de la build et le matériel avant le choix. [F1]

## 14. Satellites : préparation et utilisation

L'écran satellite documenté prédit les passages, affiche l'azimut/l'élévation et applique une correction Doppler à RX/TX. Il ne transforme pas l'appareil en récepteur de tous les modes orbitaux et ne certifie pas le full duplex.

### Scénario F : préparer un passage

1. Vérifier l'état opérationnel et les règles du satellite auprès de sources récentes de l'opérateur/AMSAT.
2. Mettre à jour avec le CPS les éléments orbitaux **Keps/TLE** et les paramètres des satellites effectivement utilisés.
3. Saisir une position et une date/heure correctes ; vérifier UTC par rapport à l'heure locale. Un décalage horaire important déplace les prévisions.
4. Confirmer les fréquences, le mode, les tonalités et si le satellite autorise la voix, la balise ou APRS à ce moment-là.
5. Vérifier la liste des passages, puis la vue polaire ou les données en direct.
6. Tester la réception avant d'émettre. Régler l'antenne, son orientation et la puissance pour le passage, sans appliquer les règles génériques d'un répéteur terrestre.
7. En cas d'APRS par satellite, utiliser les paramètres spécifiques. Le guide prévoit des profils nommés d'après le satellite pour personnaliser les valeurs concernées.

Le guide indique que l'envoi de Keps avec le CPS règle également la date/heure. Les radios sans RTC peuvent la perdre à l'arrêt ; ne pas extrapoler sa conservation à tout le catalogue. La liste des RTC pour MD-9600/RT-90, UV380/RT-3S et DM-1701 reflète la portée du texte, pas une certification de tous les modèles ultérieurs.

Des données orbitales anciennes, un hémisphère incorrect ou une confusion entre degrés décimaux et un autre format entraînent des prévisions erronées même si le firmware fonctionne correctement. Les alarmes, le changement automatique de satellite et les commandes de tonalité spéciale dépendent de la build/plateforme. La modification locale des données satellites dans ce site web **ne les charge pas dans la radio** tant que l'écriture reste bloquée. [G: Satellite Screen; L]
## 15. USB, modes de connexion et firmware

**Le fonctionnement normal/CPS et le bootloader sont deux modes différents.** En mode mise à jour, l'identification CPS peut ne pas fonctionner ; un écran vide ne prouve pas que l'appareil est endommagé. Le câble doit convenir à ce matériel ; les connecteurs à deux broches n'impliquent pas tous le même câble ou le même protocole.

Le guide distingue l'installation MK22 et STM32 : pour la mise à jour STM32, il documente le pilote STM DFUSe ; la communication CPS normale utilise un autre contexte de port/pilote. Ne pas changer les pilotes au hasard ni supposer qu'un pilote DFU résout WebUSB ou WebSerial en mode normal.

### Si vous devez installer ou mettre à jour le firmware en dehors du site web

1. Vérifier le modèle et la révision dans [la matrice](AYUDA-OPENGD77-MODELOS.md), ainsi que les instructions du paquet concerné.
2. Conserver les sauvegardes disponibles et le firmware d'origine correspondant à l'appareil.
3. Utiliser le chargeur de firmware **OpenGD77 CPS** recommandé par le projet, et non le chargeur commercial pour une image OpenGD77.
4. Vérifier le firmware « donneur » requis pour cette famille. Selon le guide, il est sélectionné dans le chargeur pour fournir des composants du codec AMBE ; il ne s'installe pas en remplacement en suivant les instructions d'un autre appareil.
5. Confirmer le modèle, la variante, la langue et la révision avant de commencer. Un donneur correctement sélectionné peut activer le DMR ; sans la procédure requise, le guide décrit un fonctionnement FM uniquement.
6. Suivre la séquence de bootloader **spécifique au modèle et à la révision**, avec une alimentation stable. Il n'existe pas ici de combinaison universelle.
7. Après l'installation, vérifier l'identification, l'audio, RX/TX et la configuration ; créer les sauvegardes que permet le CPS.

Aucune procédure de récupération fondée sur le pontage des cartes, l'effacement de régions ou l'écriture du calibrage d'une autre unité n'est fournie. En cas d'identification ambiguë, interrompre la mise à jour jusqu'à ce que le matériel soit documenté.

## 16. Diagnostic par symptômes

| Symptôme | Vérifications, de la moins à la plus risquée | À éviter |
| --- | --- | --- |
| Connexion désactivée | HTTPS/localhost, API du navigateur, famille et confirmation | Changer le firmware uniquement pour activer un bouton |
| Autorisation USB/série, mais aucune identification | Mode normal, câble adapté, CPS/hôte fermé, famille correcte | Forcer une autre famille ou supposer une carte mémoire |
| Structure d'identification inconnue | Noter le modèle/la build et le message ; utiliser les outils documentés pour cette version | Contourner la validation du connecteur |
| Sauvegarde partielle et écriture bloquée | Exporter le calibrage/codeplug et le manifeste ; conserver l'état | Traiter un ZIP téléchargé comme une sauvegarde MCU |
| Fichier impossible à ouvrir | Taille exacte de 131072 octets et format standard ; ni JSON ni firmware | Compléter ou tronquer le fichier pour l'ajuster |
| Canaux 1025+ manquants | Limite explicite de l'éditeur web | Enregistrer la zone standard comme une sauvegarde étendue |
| Signal FM présent, mais pas de son | RX CSS, squelch, mute, mode/largeur de bande et volume | Recalibrer d'abord la RF |
| Signal DMR présent, mais pas de son | CC, TS, TG/contact, filtres et état de la liaison | Utiliser CC Scan en permanence sans nécessité |
| Réception d'un TG, émission sur un autre | Override, contact direct, liste TG et TS actif | Se fier uniquement au nom du canal |
| Le répéteur ne s'ouvre pas | TX réel, tonalité FM ou CC/TS DMR, couverture et règles d'accès | Augmenter la puissance sans vérifier la configuration |
| Erreur RX Only / TX indisponible | Réception uniquement, TX Inhibit, limites de bande et TOT | Supprimer les restrictions sans autorisation |
| Aucun nom DMR affiché | Base d'IDs chargée, longueur/espace, Talker Alias reçu | Confondre la base d'IDs avec la liste TG |
| Les canaux attendus ne sont pas balayés | Zone active, Zone Skip, All Skip et mode de balayage | Chercher une Scan List commerciale non implémentée |
| USB se déconnecte pendant TX | Injection RF, antenne déportée et montage ; RD-5R sans hotspot | Désactiver les protections ou insister à puissance maximale |
| Le CPS ne communique plus après activation du GPS | Sortie `NMEA` : revenir à `Off` ou `On` | Réinstaller le firmware avant de vérifier le mode USB |
| GPS affiche `None` / n'acquiert pas de position | Présence réelle du module, prise en charge par la build et essai dehors | Supposer que le nom commercial implique un GPS d'usine |
| APRS affiche `Location?` ou ne part pas | Position, profil, indicatif, fréquence, mode de balise, TX Inhibit | Activer les balises automatiques pour « tester davantage » |
| Passages satellite incohérents | Heure, date, UTC, position, TLE et état réel du satellite | Changer les fréquences par intuition |
| GD-77S ne parle pas | Voix chargées, volume et mode de commande | Appliquer les instructions d'écran du GD-77 |
| MD-9600/RT-90 sans RX/TX après la mise à jour | Image HW et révision réelle, alimentation et sauvegardes | Flasher des révisions au hasard selon une règle universelle |
| Une option est absente | Modèle, variante, langue et date/build | Supposer que toutes les captures correspondent à la version installée |

## 17. Glossaire

| Terme | Signification |
| --- | --- |
| AMBE | Codec vocal numérique dont l'intégration nécessite la procédure documentée avec firmware donneur |
| APRS | Système d'échange d'informations de station/position ; ici, distinction entre FM AFSK et données DMR |
| Build | Compilation précise du firmware ; noter la date et la révision |
| CC | Color Code DMR, valeur 0–15 |
| Codeplug | Fichier/structure de configuration de la radio |
| Contact | Destination numérique avec numéro et type d'appel |
| CPS | Logiciel informatique de configuration et de maintenance de la radio |
| CTCSS / DCS / CSS | Systèmes de signalisation par tonalité/code FM ; pas du chiffrement |
| DMO | Fonctionnement numérique direct, sans répéteur |
| DMR ID | Identifiant numérique d'une station ; ce n'est pas le TG |
| DTMF | Signalisation par paires de tonalités pour contrôle ou numérotation |
| Keps / TLE | Données orbitales utilisées pour prévoir les passages satellites |
| MCU | Microcontrôleur exécutant le firmware |
| MMDVMHost | Logiciel hôte de modems numériques, utilisé dans le scénario hotspot |
| NMEA | Format de messages de navigation ; nom également utilisé pour une sortie ou une variante selon le contexte |
| Override | Sélection temporaire qui prévaut sur une valeur enregistrée |
| PTT / VOX | Émission par bouton-poussoir / activation vocale |
| RTC | Horloge temps réel ; présence et conservation dépendant de l'appareil |
| RX / TX | Réception / émission |
| RX Group / TG List | Regroupement de contacts ; vérifier la sémantique du firmware/CPS utilisé |
| SK1 / SK2 | Noms logiques de boutons latéraux ; leur emplacement varie selon le modèle |
| TA | Talker Alias, information supplémentaire émise en DMR |
| TG | Talkgroup, destination d'un appel de groupe DMR |
| TOT | Temporisateur limitant une émission |
| TS | Timeslot DMR, 1 ou 2 |
| VFO | Mode de syntonisation par fréquence |
| Zone | Collection ordonnée de canaux |

## 18. Sources, versions et licences

Consultation effectuée le **2026-10-25**, avec téléchargement du guide pour lecture locale et consultations ciblées des index officiels ; l'archive du forum n'a pas été parcourue massivement.

- **[G] Guide officiel anglais :** [Markdown maintenu](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md). Pour une référence reproductible, l'API consultée indique que la dernière modification du fichier est [33de63dcb002fcd837419fda25a2e535b940dbcd, 2026-03-08](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md). Les noms de sections cités identifient les preuves fonctionnelles.
- **[R] Dépôt officiel du guide :** [LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide). Son README explique la séparation de l'ancien dépôt pour des raisons de licence, déclare **GPL 2 pour ces documents** et indique que seule la version anglaise est maintenue ; la version chinoise est obsolète.
- **[W] Site du projet :** [opengd77.com](https://www.opengd77.com/). Lors de la consultation, sa page d'accueil expliquait la fermeture du forum interactif et le problème de trafic de bots.
- **[A] Archive statique :** [index des archives du forum](https://www.opengd77.com/archive/index.html). Présentée comme un instantané portant une date visible de juillet 2025 ; ce n'est pas une preuve de toutes les fonctions d'une build 2026. L'inscription, les profils et d'autres liens peuvent ne pas fonctionner.
- **[F1] Index MK22 observé :** [GD77, 2026-05-04, révision 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/). Comprend des paquets spécifiques à GD77, GD77S, DM1801, DM1801A et RD5R, avec des variantes selon la destination.
- **[F2] Index des portatifs STM32 observé :** [MDUV380_DM1701, 2026-05-04, révision ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/). Comprend un `OpenMDUV380_10W_PLUS.zip` distinct du paquet standard, ainsi que DM1701 et RT84.
- **[F3] Index mobile observé :** [MD9600, 2026-05-04, révision e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/). Contient des images HW V1/V2/V4/V5.
- **[F4] Index MD2017 observé :** [2026-05-05, révision 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/). Confirme la publication d'un paquet, pas son équivalence avec un autre modèle.
- **[C] Notes de maintenance vérifiées :** [changelog MDUV380_DM1701 du 2026-05-04](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/changelog.txt). Décrit l'adaptation du lien du codec à des outils récents, pas la promesse que toutes les fonctions sont disponibles sur chaque modèle.
- **[L] Preuves locales de cette application :** [`firmware-core.js`](../../../firmware-core.js), `TARGETS` ; [`gd77-connector.js`](../../../gd77-connector.js), `MODELS`, `connect`, `backup`, `readCodeplugRaw` ; [`radio-ui.js`](../../../radio-ui.js), état des autorisations, lecture/modification et exportation. Décrit l'implémentation, pas une campagne d'essais physiques.

Les chemins `Latest` consultés redirigeaient vers ces répertoires ; ils peuvent changer et ne signifient pas « stable pour tout appareil ». Le guide, les paquets et l'archive du forum ont des chronologies différentes. En cas de divergence, privilégier les instructions vérifiées du paquet et du matériel exacts, sans extrapoler automatiquement les nouveautés.

**Licences :** la déclaration GPL 2 citée concerne le dépôt du guide. Il ne faut pas présumer d'une licence MIT ni étendre cette déclaration au firmware actuel, aux donneurs, au codec, aux voix, au CPS, aux images ou à toutes leurs dépendances. Avant de redistribuer un composant, vérifier sa licence propre ; la disponibilité publique d'un téléchargement n'annule pas les conditions d'utilisation ou de distribution.