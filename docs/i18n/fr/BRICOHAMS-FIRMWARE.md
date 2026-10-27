# Bricohams V3 : compilation modulaire locale

## Identité et portée

**BÊTA, en cours de validation et de test.** Les nouvelles compilations déclarent
`stability: "beta"` ainsi que la portée de validation dans `build-info.json`, couvert
par SHA256SUMS. `hardwareTested: false` est conservé jusqu'à ce que ce binaire
précis ait été testé. La lecture réelle d'une radio avec F4HWN v6.0.0 ne valide pas
ces firmwares Bricohams. Le mode PRO du site web réduit les confirmations, mais ne
modifie ni les modules, ni les licences, ni les protections du firmware.

Édition dérivée de la base ouverte F4HWN pour **UV-K5 V3 / UV-K1 PY32**. Ce n'est
pas Karina, elle ne prend pas en charge l'UV-K5 V1 et n'ajoute pas de bootloader
propre. Elle réutilise le multiboot de l'amont et conserve son identité de
protocole `F4HWN v6.1.0`. L'édition à l'écran devient `Bricohams` au moyen d'une
variable CMake, sans modifier le binaire.

Base figée :

- Dépôt : <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit : `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Version déclarée par les presets : `v6.1.0`.
- Licence/attribution : les fichiers originaux `LICENSE` et `NOTICE` sont fournis.
- Les sources locales de référence se trouvent dans `Documents\Multiboot\Fusion61`.
  Sa modification non confirmée dans `App/settings.c` est conservée et **n'est pas incluse**.

Cette base ouverte est retenue pour poursuivre le développement sur le matériel V3
et ses slots. Les limitations qui empêchent de dériver Karina sont documentées dans
[KARINA.md](KARINA.md). Ses algorithmes, menus et pilotes n'ont pas été portés.

## Compiler à la demande

### Ligne indépendante : plateforme d'applications Bricohams

`firmware/platform` lance une ligne distincte de l'application F4HWN.
Elle contient un validateur/chargeur de paquets en mémoire, un contrat initial
de services et des applications de diagnostic et de blocs, écrits en C et testés
sur ordinateur. Elle comprend désormais un **résident expérimental compilable**
avec démarrage et glue LCD/clavier PY32. Son démarrage dans la radio n'a pas été
vérifié. **Ce n'est pas un remplacement validé et installable de Labs, ni un SDK
complet.** Sa connexion à l'USB, à la Flash, à l'écran LCD, au clavier ou à la RF
physiques n'a pas été testée.

Le format expérimental BHA1 n'est pas FAP1 et ne doit pas être installé avec le
chargeur d'applications existant sur le site web. Les entiers sont en little-endian :

| Offset | Octets | Champ |
| --- | ---: | --- |
| 0 | 4 | Magic ASCII BHA1 |
| 4 | 4 | Taille d'en-tête, 64 |
| 8 | 4 | Version d'API, 2 |
| 12 | 4 | Architecture, 1 = Cortex-M Thumb |
| 16 | 4 | Taille du code, paire, 2..4096 |
| 20 | 4 | Données initialisées, 0..1024 |
| 24 | 4 | BSS, mis à zéro au chargement |
| 28 | 4 | Décalage d'entrée pair dans le code, sans bit Thumb |
| 32 | 4 | Capacités demandées : écran 1, clavier 2, RX 4 |
| 36 | 4 | CRC-32 du code et des données concaténés |
| 40 | 16 | Nom ASCII imprimable, complété par des zéros s'il fait moins de 16 caractères |
| 56 | 4 | Réservé, zéro |
| 60 | 4 | CRC-32 des 60 premiers octets |

Le code et les données suivent, sans octets excédentaires. Le code, les données et le
BSS combinés ne peuvent dépasser 4096 octets : il s'agit d'un budget initial, pas
d'une mesure du firmware résident. Le chargeur valide tout avant de modifier le
buffer de destination, copie le code et les données, puis met le BSS à zéro. Il
n'appelle pas le code, ne résout pas les relocations et ne connaît pas l'adresse finale
d'édition de liens. Le descripteur de sortie doit être indépendant des buffers
d'entrée et de destination ; la mémoire et sa durée de vie relèvent de l'appelant.

Les CRC détectent la corruption, **ils n'authentifient pas l'auteur**. Les capacités
sont un filtre d'admission, pas une sandbox : le code natif sur un MCU sans isolation
peut accéder directement aux périphériques. Il ne faut pas exécuter de code non fiable
ni annoncer une isolation de l'étalonnage grâce à ce filtre. Ce composant ne comporte
ni API TX ni écriture Flash.

Il reste à valider le démarrage, l'écran LCD et le clavier du résident sur PY32, à
compléter les pilotes Flash/USB/RF, à mesurer la pile et les durées réelles, à mettre
en place l'installation transactionnelle physique, la récupération et l'intégration
complète des applications au matériel. Doom n'a pas été implémenté. Ce format est
provisoire et ne démontre pas le fonctionnement physique des applications. La ligne
précédente de profils n'est pas remplacée.

#### Première application : diagnostic de l'écran

`bh_api.h` définit une ABI C expérimentale version 2 avec version, taille, contexte et callbacks
pour effacer, écrire du texte et présenter l'écran, ainsi qu'un buffer d'état privé
de l'application avec sa taille. Elle reçoit les événements START, KEY, TICK
et STOP. Les touches sont des identifiants de la plateforme, pas des codes UART :
EXIT a la valeur 1. L'application renvoie continuer, quitter ou une erreur explicite ;
en cas d'échec d'un callback, elle ne demande plus de services d'écran.

`diagnostics.c` affiche quatre lignes Bricohams et accepte EXIT/STOP sans
écriture sur la RF ou dans le stockage. Son exécution sur ordinateur utilise des
services simulés ; la version/taille, les callbacks absents et les erreurs à chaque
étape sont vérifiés. Cela n'exécute pas d'instructions ARM sur la radio.

```powershell
node scripts\build-platform-app.cjs firmware-builds\diagnostics-nuevo
```

Les outils ARM déjà utilisés par le projet et une destination nouvelle sont
nécessaires. La compilation produit ELF, le code BIN, `diagnostics.bha`, une licence
et un manifeste contenant les SHA-256 des sources et du paquet. La compilation API 2
produit un paquet de 300 octets : 64 pour l'en-tête et 236 pour le code/les constantes.
`app.ld` édite l'application à l'adresse `0x20002000` ; cette adresse est expérimentale,
**elle n'est pas réservée dans le firmware F4HWN et ne doit pas y être utilisée**.
Les globales mutables et les relocations dynamiques ne sont pas prises en charge. Le
futur noyau devra réserver la région, la pile et les buffers sans chevauchement avant
d'autoriser l'exécution du point d'entrée en mode Thumb.

Le test C du chargeur accepte `diagnostics.bha` en argument et vérifie le paquet ARM
réel, ses CRC et sa copie en RAM. Il s'agit d'un test de chargement, pas d'exécution
ARM, d'installation en Flash ou de démarrage du firmware.

#### Deuxième application : Blocks

`blocks.c` implémente un jeu original de pièces de quatre cellules, avec sept formes,
rotation sans wall kicks, collisions, chute, verrouillage, suppression de lignes,
fin de partie et redémarrage. Il n'utilise aucun code, image, son ou donnée de Tetris
ou Doom. Le plateau textuel compte 10 colonnes et 6 lignes pour tester les callbacks
actuels ; il ne s'agit pas d'un portage graphique final pour l'écran LCD.

LEFT/RIGHT déplacent la pièce, ROTATE la fait pivoter, DOWN la fait descendre d'un
pas, DROP la fixe, RESTART relance la partie et EXIT la quitte. Chaque TICK fait
descendre la pièce d'un pas : le noyau devra définir la cadence, indépendamment de la
vitesse de la boucle. La séquence pseudo-aléatoire est déterministe et réinitialisée
au démarrage ou au redémarrage (START/RESTART). Les lignes sont comptabilisées dans
l'état, mais ne sont pas encore présentées comme un score.

Le noyau doit fournir l'état dans une mémoire alignée, mise à zéro avant le premier
événement et réservée à cette application. Le manifeste réserve un budget externe de
256 octets ; il ne s'agit pas du BSS du paquet. Le contrat API 2 inclut ce buffer et
remplace l'API 1 initiale. Le chargeur rejette les paquets API 1 : deux contrats
binaires distincts ne sont pas mélangés silencieusement.

```powershell
node scripts\build-platform-app.cjs firmware-builds\blocks-nuevo blocks
```

L'application est compilée pour Cortex-M0+ sans bibliothèque C ni helpers de
division : 940 octets pour le paquet (64 d'en-tête, 876 de code/constantes).
Les tests sur ordinateur vérifient le déplacement, la rotation, l'effacement de ligne,
la fin de partie, le redémarrage, les erreurs de service et 10000 événements
avec vérification du comportement indéfini. Le chargeur C valide et copie également
le paquet ARM réel. **Ce code ARM n'a pas été exécuté dans la radio. Le résident
expérimental comprend un launcher, mais pas d'installateur de paquets externes.**
#### Launcher portable

`bh_launcher.c` gère une seule application native à la fois, avec un buffer aligné
exclusif de 256 octets. Initialiser une nouvelle instance et la conserver à la même
adresse pendant toute sa durée de vie : le contrat contient un pointeur vers sa
propre mémoire. Ne pas copier les instances ni les réinitialiser pendant une application.

START est envoyé exclusivement depuis `bh_launcher_start` ; le dispatcher
accepte KEY, TICK et STOP. Lors du changement d'application, STOP est envoyé à la
précédente ; quitter ou rencontrer une erreur libère l'application et efface tout son
état. Une erreur STOP empêche de lancer l'application suivante. Les appels réentrants
à start/stop/dispatch pendant un callback sont rejetés. Les ticks doivent parvenir en
série depuis la boucle principale ; cette API n'est pas sûre pour les interruptions.

Le launcher appelle des fonctions C déjà liées pour les tests sur ordinateur.
**Il ne convertit pas l'adresse d'un paquet ARM en fonction et n'exécute pas BHA1
sur le PC.** Il reste à réaliser le pont d'exécution dans le MCU, l'installation en
Flash, les pilotes, le menu LCD et la récupération. Il s'agit d'un cycle de vie
portable testé, pas d'un launcher résident démarrable ni d'une sandbox.

#### Installation persistante à deux banques

`bh_store.c` implémente le stockage portable d'**un paquet et de sa version
précédente** dans deux banques abstraites de 8192 octets. Il ne constitue pas encore
un catalogue de plusieurs applications. Le pilote doit fournir les fonctions de
lecture, d'écriture et d'effacement limitées à ces banques ; aucune adresse de la
Flash de la radio n'a été assignée et la carte mémoire F4HWN n'est pas réutilisée.

Avant l'effacement, le paquet BHA1 API 2 complet est validé et la version précédente
est consultée. Seule la banque inactive est effacée, puis une lecture vérifie que tous
ses octets sont `0xff`, y compris le marqueur de confirmation : un ACK d'effacement
sans effacement réel est rejeté avant toute programmation. L'écriture s'effectue par
fragments qui ne traversent pas les pages de 128 octets, puis chaque fragment est relu.
L'en-tête BHS1 comprend la version, la génération, la longueur et le CRC du paquet ;
il est relu avant l'écriture de `DONE` comme confirmation finale. L'en-tête et le
paquet sont à nouveau validés après confirmation. La banque précédente n'est pas
effacée à la fin.

La lecture sélectionne la génération valide la plus récente et peut récupérer la
précédente si la nouvelle est incomplète ou corrompue. Si aucune n'est valide, mais
qu'une banque confirmée est corrompue, une erreur est signalée et l'installation ne
la remplace pas automatiquement. Une erreur du pilote interrompt l'opération sans
simuler une réussite. Les générations identiques sont ambiguës et rejetées ; lorsque
`uint32_t` est épuisé, une nouvelle installation est bloquée plutôt que de permettre
un dépassement cyclique.

L'appelant doit fournir un scratch indépendant du paquet d'au moins 4160 octets et
sérialiser toutes les opérations. Ce maximum inclut les 64 octets de l'en-tête et les
4096 octets combinés du code et des données : on n'additionne pas les maxima
individuels du code et des données, car le contrat BHA1 limite la RAM totale à 4096.
Le scratch est réduit de 1024 octets par rapport à sa version initiale, sans réduire
l'ensemble des paquets valides. Les tests couvrent un code de 4096 octets ainsi qu'un
code de 3072 octets avec 1024 octets de données, et vérifient le rejet sans E/S quand
le scratch est insuffisant d'un octet. Il n'y a ni heap ni buffer interne de banque
complète. Après une erreur d'écriture/relecture finale, l'installation peut avoir été
confirmée : il faut vérifier à nouveau avant de réessayer et ne pas supposer un retour
arrière.

`bh_store_load` relie la sélection de banque au chargement validé en RAM : il copie
le code et les données, puis efface le BSS, sans sauter au point d'entrée. Le scratch
et la RAM doivent être indépendants, tout comme le descripteur de sortie. Une
destination insuffisante renvoie `BH_STORE_NO_SPACE` ; les erreurs ne modifient ni la
RAM ni le descripteur. L'appelant doit réserver l'adresse réelle d'édition de liens
avant l'exécution ; cette fonction auxiliaire ne valide pas les adresses et ne
convertit pas des octets en fonction.

Les tests avec NOR simulée couvrent 322 interruptions/échecs de lecture, d'écriture et
d'effacement pendant la première installation et une mise à jour, y compris les
écritures partielles, les faux ACK d'écriture/d'effacement, la corruption, le paquet
maximal, les générations identiques, l'alternance et l'épuisement des générations.
Il est vérifié que la banque précédente ne change pas lors de chaque interruption
d'une mise à jour. Le chargement du code/des données/du BSS et la préservation de la
RAM en cas d'erreur sont également testés. Cela ne prouve ni la tolérance aux coupures
de courant ni l'atomicité de la puce réelle. Il reste à créer le pilote SPI/Flash, à
réserver les secteurs, à réaliser l'installateur USB et la connexion avec le launcher
résident.

Tests maintenus de la plateforme (compilateur C11 pour ordinateur requis) :

```powershell
cmake -S firmware\platform -B firmware-builds\platform-tests -DBUILD_TESTING=ON
cmake --build firmware-builds\platform-tests
ctest --test-dir firmware-builds\platform-tests --no-tests=error --output-on-failure
```

Les huit tests C et le test d'intégration JavaScript/C réussissent avec CMake/CTest
sur ordinateur. Le test d'intégration est activé si Node.js est présent.
Le workflow `firmware-modules.yml` intègre également cet ensemble séparé sous Linux,
avec vérification du comportement indéfini ; la modification locale du workflow ne
signifie pas qu'il ait déjà été exécuté sur GitHub.
#### Récepteur expérimental BHT1 et client de transfert

`bh_transfer.c` implémente la machine à états du récepteur, sans pilote série/USB.
`scripts/platform-transfer.cjs` encode les requêtes, valide les réponses et fournit
`uploadPackage(exchange, bytes, session)`, où `exchange` doit transmettre une trame
complète et renvoyer exactement sa réponse. Il n'ouvre pas de ports et ne propose pas
d'installation sur le site web actuel.

Chaque requête possède un en-tête de 24 octets et jusqu'à 128 octets de payload.
Tous les entiers sont des u32 little-endian :

| Offset | Champ |
| --- | --- |
| 0 | Magic BHT1 |
| 4 | Opération : BEGIN 1, DATA 2, COMMIT 3, ABORT 4, STATUS 5 |
| 8 | ID de session non nul, choisi par le client |
| 12 | Offset dans le paquet pour DATA ; zéro pour les autres opérations |
| 16 | Longueur du payload |
| 20 | CRC-32 de l'en-tête et du payload, ce champ étant mis à zéro |

BEGIN contient deux u32 : la longueur totale (66..4160) et le CRC-32 de l'ensemble
du BHA1. DATA envoie des blocs contigus de 1..128 octets. Un bloc dupliqué n'est
accepté que s'il correspond exactement aux octets déjà reçus et ne fait pas avancer
l'offset une deuxième fois ; les lacunes et les chevauchements partiels sont rejetés.
Un BEGIN dupliqué avec la même session/longueur/CRC conserve la progression. Une
autre session ne peut pas interrompre une réception en cours. ABORT annule sans
appeler l'installateur ; STATUS consulte l'état sans prolonger le délai. La réception
expire au bout de 30000 ms après BEGIN ou le dernier DATA valide, avec des différences
non signées en cas de dépassement cyclique. Une session expirée ou annulée nécessite
un nouvel ID.

COMMIT exige que tous les octets soient présents, que le CRC total soit correct et
que BHA1/API/capacités soient validés avant l'appel du callback de l'installateur.
Un COMMIT dupliqué ne rappelle pas celui-ci, qu'il ait réussi ou renvoyé une erreur :
une erreur d'écriture peut signifier que la Flash a déjà été confirmée. Le client ne
réessaie pas automatiquement un COMMIT dont la réponse a été perdue ; il doit
consulter STATUS et le stockage avant de décider d'une nouvelle opération.

La réponse BHR1 fait 32 octets : magic, opération, session, résultat, octets reçus,
état, résultat de l'installateur (i32), CRC des 28 premiers octets. Résultats : OK 0,
BAD_FRAME 1, BAD_SESSION 2, BUSY 3, BAD_OFFSET 4, INCOMPLETE 5, BAD_PACKAGE 6,
INSTALL_ERROR 7, EXPIRED 8, BAD_STATE 9. États : IDLE 0, RECEIVING 1, DONE 2,
FAILED 3, CANCELLED 4, TIMED_OUT 5. Le client rejette un CRC, une session, une
opération, un état ou un ACK d'offset incorrect.

L'appelant doit sérialiser les appels, maintenir l'instance et le staging en vie, et
fournir des buffers indépendants pour l'instance, le staging, la trame et la réponse.
Un staging de 4160 octets est nécessaire. Le callback ne reçoit ce staging que pendant
COMMIT et ne doit ni le modifier ni le conserver. Un appel réentrant renvoie BUSY sans
produire de réponse. Le futur transport physique devra limiter les attentes, signaler
les déconnexions et assurer le contrôle de flux. L'API de transfert reçoit des trames
complètes ; l'assemblage à partir d'un flux arbitrairement fragmenté relève de
`bh_stream.c`, décrit ci-dessous. Les CRC et l'ID de session **n'authentifient pas
l'émetteur**.

`bh_stream.c` consomme un octet par appel, reconnaît le magic BHT1 et la longueur
limitée à 128 octets, puis vérifie le CRC avant de remettre la trame au récepteur.
Aucun préfixe de longueur ni séparateur supplémentaire n'est nécessaire. Il tolère
les trames fragmentées ou concaténées. Il recherche de nouveau le magic après du bruit,
une longueur impossible ou un CRC incorrect ; un magic dans un payload valide n'est
pas interprété comme une deuxième requête. Il renvoie des erreurs de tramage explicites
et seul `BH_STREAM_REPLY` autorise l'envoi de son buffer BHR1. L'appelant doit
signaler ces erreurs ou les enregistrer, et non simuler une réussite.

Une trame partielle expire après 1000 ms sans nouvel octet, en utilisant des
différences non signées pour tolérer le dépassement cyclique. `bh_stream_poll` permet
de vérifier ce délai sans recevoir un autre octet. Le délai dépassé ne supprime que la
trame partielle ; il n'annule pas la session de transfert et ne modifie pas la banque
précédente. Le pilote devra signaler une déconnexion et décider s'il autorise la
reprise de la session existante. Les appels et les buffers doivent être sérialisés ;
le callback de l'installateur ne doit pas rappeler le stream. Aucun heap n'est utilisé :
le buffer d'assemblage occupe 152 octets, en plus de la structure, de la réponse, du
staging et de la mémoire temporaire du validateur.

L'intégration sur ordinateur transmet le flux BHT1 brut de JS au récepteur C par des
pipes, installe dans une NOR simulée et valide le chargement ultérieur en RAM ; elle
couvre deux générations, le paquet maximal et des répétitions sans réinstallation,
en insérant du bruit avant chaque trame. Le préfixe de longueur réservé au premier
harness a été supprimé. Le même test avec les paquets ARM réels de Diagnostics et
Blocks complète 34 échanges JS/C, notamment l'annulation et le rejet d'un CRC total
incorrect sans remplacer la banque active. Le test C vérifie aussi 10000 trames
malformées sans modifier la session ni appeler l'installateur. Le stream teste tous
les points de coupure d'une trame STATUS, les trames concaténées, le payload maximal,
un magic imbriqué, la récupération après corruption, le timeout avec dépassement
cyclique et 100000 octets de bruit. Le récepteur et le stream sont également compilés
pour Cortex-M0+. **Ils ne sont pas liés au résident et n'écrivent pas dans la Flash
physique** : le staging, le scratch, la RAM des applications et la pile devront être
budgétés ensemble avant leur intégration ; on ne peut pas additionner les buffers sans
vérifier la limite de 16 KiB.

Avec les buffers maximaux actuels, le staging et le scratch totalisent 8320 octets :
ils dépassent déjà de 128 octets les 8192 réservés au CORE, avant même les structures,
le framebuffer ou l'état des applications. APP et STACK ont chacun leur région propre
de 4096 octets ; ces régions ne sont pas de la RAM disponible pour ces buffers. La
réduction du scratch élimine le gaspillage, mais **ne résout pas à elle seule
l'intégration**. Le récepteur ne sera pas relié au résident en y ajoutant ces buffers,
et la pile ne sera pas réduite sans mesures pour masquer le dépassement. Il faut un
stockage/une vérification par blocs ou une réutilisation de mémoire avec des durées de
vie et des chevauchements éprouvés, tout en conservant le contrat actuel qui interdit
de chevaucher paquet et scratch pendant l'installation.

#### Premier résident indépendant expérimental PY32

```powershell
node scripts\build-platform-resident.cjs firmware-builds\residente-nuevo firmware\Fusion61
```

Le deuxième argument indique l'arborescence locale de référence qui contient les
headers CMSIS/LL PY32 et `Core/Src/system_py32f071.c`. Son application F4HWN n'est pas
liée : le démarrage, le linker, le shell, le texte, le framebuffer et le glue écran/
clavier de cette image se trouvent dans `firmware/platform`. Les attributions BSD/Apache
des composants tiers sont conservées ; il ne s'agit pas de code récupéré de Karina ni
d'une affirmation d'indépendance vis-à-vis de toute licence. ARM GNU Toolchain est
nécessaire et les destinations existantes ne sont pas écrasées.

Le builder compile d'abord Diagnostics et Blocks comme paquets BHA1 API 2 distincts,
puis les incorpore sans modification à la Flash du résident. Au démarrage d'une
application, `resident_apps.c` valide son paquet, le copie dans la région de 4096 octets
à `0x20002000`, efface le BSS et prépare le point d'entrée Thumb avec des barrières
mémoire. Le code ARM contient cette voie d'exécution : **sa compilation ne prouve pas
que le saut ou les applications fonctionnent sur le MCU**. Seuls ces paquets compilés
avec le résident sont admis ; aucun chargement depuis l'USB ou un stockage externe
n'existe et le stockage à deux banques n'est pas encore connecté.

Carte vérifiée par le linker :

- Flash de l'application à partir de `0x08002800`, 118 KiB ; le bootloader n'est pas inclus.
- RAM du noyau : `0x20000000..0x20001fff`, 8 KiB.
- RAM exécutable pour une application : `0x20002000..0x20002fff`, 4 KiB.
- Pile : `0x20003000..0x20003fff`, 4 KiB ; sans heap.

Le startup propre initialise les données/le BSS et le VTOR. Il désactive et efface les
interruptions externes NVIC héritées et les événements SysTick/PendSV en attente ;
il active ensuite uniquement SysTick de 1 ms comme base de temps. L'ISR ne fait
qu'incrémenter un compteur `volatile` de 32 bits : elle n'appelle pas le launcher et ne
dessine rien. Les mises à jour LCD ne dépendent pas de l'interrogation de COUNTFLAG et
ne perdent pas d'incréments du compteur pendant un dessin. Les horloges fournies par le
bootloader sont conservées ; leur fréquence est lue à l'aide du calcul CMSIS. La Flash
interne et le stockage des canaux ne sont pas programmés. Le glue initial utilise un
LCD ST7565 via GPIO et une matrice de clavier ; il n'initialise pas la RF et n'offre
pas d'API TX. Cela ne garantit pas le blocage physique de TX et un saut depuis un autre
firmware laissant des périphériques actifs n'est pas admis.

Le menu permet de sélectionner Diagnostics/Blocks avec UP/DOWN et d'ouvrir avec
MENU. Dans Blocks : 4/6 gauche/droite, MENU pour tourner, DOWN pour descendre, `*`
pour une chute directe, 0 pour redémarrer et EXIT pour revenir. Trois échantillons
de clavier stables espacés de 10 ms sont requis ; une touche maintenue n'est pas
répétée et une combinaison de touches n'est pas acceptée. Le shell demande un tick
au maximum toutes les 500 ms, sans rafales de rattrapage. Les ticks du jeu utilisent
des différences de temps non signées afin de tolérer le dépassement cyclique du
compteur milliseconde. L'ISR doit être traitée avant la milliseconde suivante ; une
application ne peut pas masquer les interruptions. Cela ne peut être imposé à du code
natif non fiable : les durées réelles doivent être mesurées.

Sont produits : ELF, BIN expérimental, carte mémoire, rapports de pile du compilateur,
paquets BHA1, manifestes avec SHA-256 et licences/avis. Le builder vérifie les limites
du BIN, les vecteurs de pile/Reset/SysTick par rapport aux symboles ELF, la cible de
tous les autres vecteurs, les limites RAM et l'absence de symboles non résolus. Ses
tests rejettent les vecteurs Thumb incorrects, la RAM chevauchante et les symboles
manquants sans nécessiter le compilateur ARM. Les rapports de pile individuels **ne
prouvent pas** le maximum cumulé de la pile. Le shell et le renderer sont testés sur
ordinateur, notamment pour le tick de 499/500 ms, le dépassement cyclique du temps, le
retour au menu, les erreurs et les limites de texte. Le renderer 3x5 est original et
n'inclut ni polices ni ressources d'autres firmwares.

**Ne pas charger ce BIN avec l'installateur web actuel ni comme slot multiboot.**
Il n'implémente pas l'identification/CRC du slot F4HWN, le protocole USB, la
récupération ou l'installation d'applications externes. Le manifeste conserve
`hardwareTested: false` et `installableWithCurrentWeb: false`. Le premier test de
démarrage devra être effectué avec une copie complète vérifiée et une voie de
récupération éprouvée.
### Distribution par images fonctionnelles

#### Recompilation et tests des modules du 26-10-2026

Les trois profils ont été recompilés à partir du commit figé, avec le branding
Bricohams, Beacon et VOX désactivés. Aucun code du binaire Karina n'a été incorporé
et ces compilations n'ont pas été installées lors de cette vérification.

| Profil | BIN (octets) | Flash liée / 120832 | RAM / 16384 |
| --- | ---: | ---: | ---: |
| ARDF | 113960 | 113072 | 12576 |
| Satellites (inclut CAT TX) | 114844 | 113956 | 12384 |
| Spectre/VFO-PRO | 118040 | 117152 | 13440 |

La Flash liée n'inclut pas les 888 octets du stub multiboot, qui sont également
stockés dans le BIN. Le constructeur vérifie les vecteurs, l'identité, les limites
d'image et l'isolation du stub.

Les neuf tests C sur ordinateur ont réussi avec Zig 0.13.0 comme compilateur C :
ARDF et son adaptateur, Doppler, CAT RX, CAT TX, l'adaptateur Satellites, Spectre,
le codec de presets et l'adaptateur Spectre. Les adaptateurs utilisent des primitives
RF/écran simulées ; ces résultats ne certifient ni RF, ni audio, ni démarrage physique,
ni compatibilité fonctionnelle complète avec Karina. Les sept tests JavaScript du
constructeur ont également réussi.

Il s'agit d'une recompilation vérifiée des modules existants, et non d'une nouvelle
implémentation de toutes les fonctions de Karina. En particulier, cela ne prouve pas
le volume dynamique, une autocapture équivalente avec filtre de bruit, des
temporisations internes AM/squelch équivalentes, un générateur AM, des presets
persistants complets de l'état, ni l'équivalence des menus. Les réponses automatiques
ou balises TX ne sont pas implémentées parce qu'elles figurent dans la documentation
Karina. L'identité du protocole reste F4HWN : la renommer sans mettre à jour les
connecteurs et les cartes mémoire romprait l'interopérabilité existante.

Les fonctions sont distribuées en images séparées lorsque Flash/RAM empêche une
image unique. L'objectif est de conserver Main et de distribuer des images compatibles
dans les slots 1-4, non d'inventer le chargement dynamique de code ni de mélanger des
formats de banque. Aucun slot n'est attribué et aucun matériel n'est programmé
automatiquement.

| Image fonctionnelle | État réel |
| --- | --- |
| Bricohams ARDF | Image Beta compilée avec `--module ardf`, cycles et mémoire manuels d'atténuation dans Fox Hunt |
| Bricohams Satellites | Image Beta avec Doppler manuel et CAT RX v1, compilée avec `--module satellite` ; pas de suivi orbital autonome |
| Bricohams Spectre | Image Beta `--module spectrum` : 128 points RX, peak hold, moyenne, multipreset RAM et capture VFO-PRO RX avec saisie de fréquence |
| Autres fonctions documentées de Karina | Requiert reconstruction et tests ; ne sont pas déclarées incluses simplement en renommant une image |

La séparation ne récupère pas le code Karina et ne garantit pas l'équivalence de ses
algorithmes. Chaque image doit posséder son propre manifeste, ses modules réels, ses
limites, ses sources/licences et sa validation structurelle. Le budget doit être
mesuré après édition de liens de chaque combinaison. Main n'est pas remplacé pour
démontrer le sélecteur et les binaires d'autres projets ne seront pas installés
automatiquement.

### Noyau propre pour les satellites

`firmware/bricohams/doppler.c` calcule les corrections de fréquence à partir de la
vitesse radiale en mm/s. Une valeur positive indique que le satellite s'éloigne : RX
diminue et la fréquence nominale de liaison montante augmente. Les fréquences sont
exprimées en unités de 10 Hz et arrondies au pas le plus proche. La formule correspond
au modèle classique non relativiste du planificateur web ; elle ne reproduit pas un
algorithme Karina et n'active pas la transmission. La sortie indique toujours
`receive_only=true`.

`BRICOHAMS_ENABLE_SATELLITE=OFF` exclut la bibliothèque. Les fréquences nominales
et corrigées VHF 136-174/UHF 400-470 sont validées, de même que la vitesse radiale
jusqu'à 12 km/s dans les deux sens. Une entrée invalide conserve la sortie précédente
et renvoie une erreur explicite. Aucun TLE, temps UTC, position, passage SGP4 ou
vitesse radiale n'est généré : ces données doivent provenir d'un prédicteur validé.
Aucun CAT, suivi automatique ou stockage persistant n'est implémenté non plus. Les
tests comparent 241 vitesses à une référence en double précision, ainsi que les
signes, les limites et l'arrondi à une demi-unité au plus (5 Hz).

### Image Satellites : Doppler manuel en réception

Guides de l'utilisateur associés à cette image : [Initiation aux satellites](INICIACION-SATELITE.md)
(concepts, passages, Doppler, utilisation des touches 4/5/6/8/9 et CAT) et
[Antennes satellite](ANTENAS-SATELITE.md) (Yagi bibande et dipôle en V simulés,
avec des pièces STL imprimables).

Le builder accepte `--module satellite` au lieu de `--module ardf` dans la
commande FieldOps ci-dessous, avec Beacon et VOX à OFF. Il refuse de combiner les deux :
ils utilisent des écrans/touches différents du même mode résident. Le nom du binaire
inclut le module afin d'éviter de confondre les images.

L'adaptateur `satellite_foxhunt.inc` récupère RX et TX nominaux du VFO/canal
sélectionné à l'entrée de Fox Hunt et affiche `SAT RX`. Les deux fréquences doivent
être dans les bandes prises en charge. Il ne modifie ni les données VFO ni la fréquence
TX ; le résultat calculé de liaison montante n'est pas appliqué à l'émetteur. Seuls
l'accord RX et son filtre changent, au moyen des primitives existantes. À la sortie,
le flux Fox Hunt restaure les registres du VFO avec `RADIO_SetupRegisters`. Cette
fonction doit être vérifiée sur le matériel.

| Touche | Doppler manuel |
| --- | --- |
| 4 | Réduire la vitesse radiale de 500 m/s (l'approche est négative) |
| 5 | Vitesse nulle : rétablit la fréquence RX nominale |
| 6 | Augmenter la vitesse radiale de 500 m/s (l'éloignement est positif) |
| 8 | Activer le CAT RX temporaire / désactiver et revenir à la fréquence RX nominale ; VFO valide requis |
| 9 | Armer/désarmer le PTT CAT (CAT TX v1) pour envoyer SSTV depuis l'application |
| 2 | Audio Fox Hunt existant : silence, tonalités, audio reçu ; commence avec le réglage upstream enregistré |
| EXIT | Quitter et restaurer la configuration RF du VFO |

Limite manuelle +/-12 km/s, sans dépassement cyclique. La vitesse et la fréquence
corrigée sont affichées. `SAT INVALID VFO` indique une fréquence nominale ou une
correction hors plage : aucune nouvelle écriture RF n'est effectuée et le dernier
accord accepté est conservé ; la touche 5 rétablit zéro si la fréquence nominale est
valide. Pour changer de canal ou de fréquence nominale, il faut quitter puis revenir.
Les nouvelles touches respectent le verrouillage du clavier et n'utilisent pas F comme
inverseur. Il n'y a dans la radio ni TLE, ni sélection automatique de satellite, ni
horloge UTC, ni SGP4, ni prédiction du passage. Il faut saisir manuellement une
vitesse radiale correcte provenant d'un prédicteur externe, ou une fréquence RX
absolue via le nouveau CAT expérimental. Elle n'est pas déduite du RSSI.

La compilation portant l'étiquette SAT RX a mesuré 112320 octets, RAM 12352/16384
et Flash 111432/120832 ; toute modification ultérieure doit être remesurée. Les tests
de l'adaptateur simulent les primitives RF : ils vérifient les signes, les limites,
la fréquence appliquée, l'absence de changement TX/VFO et la récupération après erreur.
Ils ne certifient ni la réception, ni l'audio, ni la restauration physique. Le mode
est en réception, sauf lorsque le PTT CAT est armé avec 9 (voir CAT TX) ; le reste du
firmware conserve le TX upstream. Il ne s'agit pas d'un firmware globalement bloqué
pour TX ni d'un appareil full-duplex.

#### CAT RX Bricohams v1 implémenté

L'image `Satellite-CAT-final-20261025` mesure 113868 octets RAW,
RAM 12384/16384 et Flash 112980/120832. Elle inclut le bootlogo Bricohams et un
point de terminaison expérimental propre ; elle n'est pas compatible avec les
protocoles CAT Kenwood/Yaesu et n'offre pas la prise en charge CAT d'autres éditions
F4HWN.

En mode SAT RX, appuyez sur 8 avec le clavier déverrouillé : `CAT READY RX`.
Une commande valide affiche `SAT CAT RX`. Les touches 4/5/6 désactivent le CAT et
redonnent le contrôle au Doppler manuel ; 8 le désactive et restaure la fréquence RX
nominale initiale. Le verrouillage du clavier annule le CAT et rétablit la fréquence
RX nominale. À la sortie du mode, l'état CAT est supprimé avant la restauration du VFO
par le flux upstream. Pour revenir au mode, il faut le réactiver avec 8.

Chaque SET renouvelle un lease de 3000 ms. À son expiration, la fréquence RX nominale
est appliquée, tout SET en attente est abandonné et `CAT TIMEOUT` s'affiche ; le CAT
reste activé pour une nouvelle commande valide. QUERY, les commandes invalides et les
erreurs ne renouvellent pas le lease. Une correction d'un passage perdu n'est pas
maintenue indéfiniment. Le timeout est vérifié dans la boucle RX, pas dans une
interruption :dépend du fait que le firmware continue à exécuter cette boucle. Ce n'est pas un
watchdog matériel ni une garantie en cas de blocage CPU.

Le endpoint réutilise les trames USB CDC/UART existantes avec obfuscation et
CRC ; **ce n'est ni du chiffrement ni une authentification**. Il n'accepte que des
fréquences absolues en unités de 10 Hz, 136-174 ou 400-470 MHz inclus, et celles-ci
ne sont appliquées qu'en mode SAT RX activé localement. Il ne modifie ni les canaux,
ni les sous-tons, ni la puissance, ni l'EEPROM, ni la Flash, ni le TX. La modulation/
largeur de bande est celle du VFO à l'entrée. Ne pas l'utiliser comme commande de
transmission ni prétendre que l'accord RF a été mesuré : la confirmation indique que
les primitives RX ont été appelées.

Contrat binaire little-endian, commande privée `0x7B00`, réponse `0x7B01`.
La taille Size upstream indique la longueur des données, sans l'en-tête.
Aucune nouvelle commande n'est attribuée à un firmware tiers.

| Offset requête | Octets | Contenu |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 SET_RX, 2 STOP_RX |
| 2 | 2 | Séquence, répétée dans la réponse |
| 4 | 4 | Fréquence RX en unités de 10 Hz ; zéro obligatoire pour QUERY/STOP |

La requête doit faire exactement 8 octets ; aucun champ facultatif n'existe.

| Offset réponse | Octets | Contenu |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | État |
| 2 | 2 | Séquence ; zéro si la longueur ne permet pas de traiter la requête |
| 4 | 4 | Capacités 7 : bit 0 SET_RX, bit 1 QUERY, bit 2 STOP/lease ; sans TX/écriture persistante |
| 8 | 4 | Dernière fréquence appliquée par logiciel, 10 Hz ; zéro si le CAT est désactivé |
| 12 | 4 | Flags : bit 0 activé localement, bit 1 lease distant, bit 2 modification en attente |

États : 0 consultation réussie, 1 en file d'attente, 2 longueur/champs incorrects,
3 version non prise en charge, 4 opération non prise en charge, 5 CAT non activé,
6 fréquence hors bande. Toute erreur conserve l'état précédent. SET/STOP renvoient 1 :
**cela ne signifie pas que la commande est appliquée**. La boucle RX applique la
modification validée, met à jour la fréquence signalée et efface le bit d'attente.
Un SET ultérieur reçu avant l'application remplace le précédent, sans créer une file
illimitée. STOP demande le retour à la fréquence RX nominale et termine le lease, sans
empêcher une nouvelle commande tant que l'activation physique reste active.

Le connecteur web expose `getCatStatus`, `setCatReceive(frequency10Hz)` et
`stopCatReceive`. Il valide séquence/version/capacités, différencie l'état en attente
de l'état appliqué et vérifie le résultat par des consultations limitées. Il ne fait
ni nouvelle tentative SET ni renouvellement automatique. Une erreur invalide la
connexion selon le flux existant et impose de se reconnecter. Ce ne sont pas des
fonctions de programmation persistante et elles n'autorisent pas l'écriture sans
sauvegarde.

#### CAT TX Bricohams v1 (PTT par lease)

Ajouté le 2026-10-26 pour envoyer du SSTV depuis l'application Android. Il s'agit
d'une PTT distante pour une source audio externe branchée à l'entrée microphone de
la radio ; elle ne modifie ni la fréquence, ni la puissance, ni les sous-tons, ni
l'EEPROM, ni la Flash. Le firmware ne génère pas l'audio : l'application lit Robot36
via un câble relié à l'entrée microphone tout en maintenant la PTT.

Sécurité, par ordre :

1. **Confirmation sur la radio.** Seule la touche 9 en SAT RX arme la PTT
   (`CAT TX ARMED`) ; l'hôte ne peut pas l'armer. Le verrouillage du clavier, la sortie
du mode SAT RX ou un nouvel appui sur 9 la désarme.
2. **Lease de 1500 ms.** L'hôte renouvelle la commande KEY ; s'il cesse de le faire,
   la radio relâche seule la PTT. Une commande KEY en file d'attente expire également.
3. **Limite de 120 s par émission.** Une fois cette durée atteinte, la radio relâche
   la PTT, désarme et affiche `CAT TX LIMIT` ; il faut réarmer avec 9.
4. **Bandes et TX lock de la radio.** Avant émission, les mêmes vérifications que
   pour la balise Fox Hunt sont appliquées (`FOXHUNT_TxState`) : TX lock par bande,
   batterie faible ou tension élevée et modulation FM. En cas d'échec, `CAT TX DENIED`
   s'affiche et aucune commande KEY ne fonctionne tant que 9 n'a pas réarmé la PTT.
5. **Toute touche interrompt.** Pendant l'émission, la boucle est modale : la mesure
   RX et les tonalités Geiger de Fox Hunt ne sont pas exécutées, seuls l'UART et le
   clavier fonctionnent. Toute nouvelle touche relâche la PTT et désarme.
6. **Indicatif obligatoire.** L'application ne transmet pas sans indicatif valide et
   l'imprime sur l'image Robot36.

L'émission utilise la fréquence TX du VFO d'entrée (avec son décalage), sans
correction Doppler de la liaison montante. La LED rouge s'allume comme lors d'une
PTT normale et l'écran affiche `CAT TX ON AIR` et la fréquence TX. Pendant l'émission,
les commandes CAT RX sont acceptées, mais appliquées au retour en RX.

Contrat : commande privée `0x7B02`, réponse `0x7B03`, little-endian.

| Offset requête | Octets | Contenu |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 KEY (activer ou renouveler le lease), 2 UNKEY |
| 2 | 2 | Séquence, répétée dans la réponse |
| 4 | 4 | Réservé, zéro obligatoire |

| Offset réponse | Octets | Contenu |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | État |
| 2 | 2 | Séquence ; zéro si la longueur ne permet pas de traiter la requête |
| 4 | 4 | Capacités 8 : PTT avec lease ; sans fréquence, puissance ou écriture persistante |
| 8 | 4 | Flags : bit 0 armée, bit 1 en émission, bit 2 KEY en attente, bit 3 limite atteinte ; bits 8-15 état VFO du refus |
| 12 | 4 | Millisecondes en émission, zéro en l'absence d'émission |

États : 0 réussi (KEY : déjà en émission), 1 en file (KEY en attente ou UNKEY à
appliquer), 2 longueur ou réservé, 3 version, 4 opération, 5 non armée, 7 refusé par
la radio, 8 limite de 120 s. UNKEY est toujours accepté. Les capacités CAT RX restent
à 7 : CAT TX est un point de terminaison distinct.

Vérifié le 2026-10-26 : `cat_tx_test` (protocole, lease, limite, refus) et
`satellite_adapter_test` (armement par touche, émission modale, interruption par
touche, refus, limite, désarmement par verrouillage et sortie) réussissent avec les
primitives RF simulées. L'image F4HWN v6.1.0 Fusion avec `--module satellite` et
`ENABLE_FEAT_F4HWN_FOXHUNT=ON` est compilée sans avertissement : Flash 113212/120832,
RAM 12384/16384. **Aucune validation sur radio ni mesure RF.**

Dans **Quansheng > Opérations**, un panneau CAT RX Beta permet de consulter,
d'accorder pendant un lease et de revenir à la valeur nominale. Son état correspond
à la dernière réponse, pas à une télémétrie continue. Le suivi des passages web est
décrit ci-dessous ; Android dispose d'un client USB expérimental avec suivi orbital
SGP4. Les commandes sont désactivées en l'absence de connexion ou pendant une autre
opération. Pour l'essayer, il faut démarrer la nouvelle image : se connecter au
firmware d'origine ne l'installe pas et n'active pas le CAT.

Les huit suites C incluent protocole, plages, longueurs invalides, séquence réfléchie,
expiration avec rollover, absence de renouvellement par consultation, annulation
locale/verrouillage et flux de l'adaptateur avec RF simulée. Les tests JavaScript
simulent le transport, les réponses en attente, une séquence incorrecte et des erreurs :
ils ne remplacent pas un test CAT USB/radio. Le manifeste comprend `catRx` et les
hashes du code appliqué. Le fonctionnement physique n'a pas été flashé ni certifié.

#### Suivi de passage web implémenté sur CAT RX

Dans **SAT / passages**, mettre à jour les TLE/fréquences, indiquer une position avec
consentement, calculer les passages, puis sélectionner un passage et une fréquence
ponctuelle FM. **Suivre le passage sélectionné par CAT RX** ne démarre que pendant
l'intervalle du passage sélectionné et lorsque le satellite est au-dessus de l'horizon.
Aucun démarrage futur sans surveillance n'est programmé. La prédiction doit dater de
moins de 15 minutes et le TLE doit respecter sa validité maximale de sept jours. La
radio doit utiliser l'image CAT précédente, être en SAT RX et avoir été activée
physiquement avec 8.

`catPassTarget` réutilise satellite.js/SGP4 et les validations TLE existantes. Il
calcule la distance observateur-satellite à t-0.5 et t+0.5 secondes, obtient la vitesse
radiale et applique `fRX = fNominal * (1 - vRadial/c)`. Le résultat est arrondi à
10 Hz et rejeté s'il sort des bandes RX admises. Seules les fréquences ponctuelles
FM/FM étroite sont acceptées, pas les transpondeurs linéaires. L'observateur est fixe
pendant la session : aucun suivi GPS mobile ni orientation d'antenne.

`CatPassTracker` prend une copie indépendante du plan : toute modification ultérieure
ne change pas silencieusement la session en cours. L'interface bloque les opérations
radio/de programmation et les paramètres du plan pendant le suivi. **Arrêter le suivi
CAT** reste en dehors du fieldset verrouillé et demeure disponible. Après chaque SET
confirmé, il attend 750 ms avant le calcul suivant, soit environ une mise à jour par
seconde selon la liaison. Il renouvelle le lease même si la fréquence arrondie ne
change pas. Il ne maintient pas deux SET simultanés et ne garantit pas de fréquence
de mise à jour fixe en temps réel.

Le suivi s'arrête à la fin du passage, si la page est masquée/fermée, si le
consentement ou les données changent, si la connexion est perdue, en cas d'erreur de
propagation ou à la réception d'une confirmation tardive. Il rejette aussi les retours
en arrière de l'horloge et les intervalles de mise à jour supérieurs à 2000 ms. Un
navigateur suspendu n'est pas un contrôleur temps réel : s'il ne peut envoyer STOP,
la restauration dépend du lease de 3 s du firmware. L'heure UTC de l'appareil doit être
correcte ; aucune synchronisation externe automatique n'est prévue.

Lors de l'annulation, le contrôleur attend la fin de tout SET en cours avant d'envoyer
STOP, afin d'éviter qu'un SET tardif ne réactive le suivi. Il ne réessaie pas SET après
l'annulation et ne redémarre pas les sessions automatiquement. Les erreurs de
restauration sont affichées, et non converties en réussite. L'interface indique la
dernière fréquence et la géométrie calculées, pas une mesure RF.

Six tests du noyau JavaScript couvrent le Doppler comparé au calcul SGP4 de portée,
les validations, l'instantané du plan, le renouvellement, l'annulation pendant SET,
la fin du passage, les discontinuités, les réponses tardives et la déconnexion. Test du
navigateur avec transport simulé : deux SET RX, STOP manuel et STOP simulé lorsque la
page est masquée, sans erreurs et avec le bouton d'arrêt utilisable quand les
paramètres sont verrouillés. Ces commandes n'ont pas été exécutées sur la radio réelle.
L'APK Android intègre CAT RX temporaire via CDC et des adaptateurs USB-série reconnus,
avec un suivi SGP4 propre. Le calcul orbital reste hors du MCU ; aucun TLE/SGP4 n'a
été ajouté au MCU.

### Presets de spectre propres, sans écriture EEPROM

`firmware/bricohams/presets.c` définit un conteneur BHSP v1 de 208 octets
contenant jusqu'à 8 presets : nom ASCII de 8 caractères, fréquence initiale, pas,
points, stabilisation et échantillons. Il utilise des entiers little-endian explicites,
un CRC32 IEEE et des octets réservés à zéro ; il ne sérialise pas de structs C et ne
dépend pas de leur alignement. La sélection active fait partie du conteneur.

Le codec vérifie les configurations et rejette la corruption, les versions/valeurs
réservées inconnues et les longueurs invalides. Il décode dans un temporaire avant de
remplacer l'état ; il encode dans un temporaire avant de remplacer la destination. Les
buffers ne doivent pas chevaucher l'état. Le CRC n'est ni une signature ni une
authentification. Aucune adresse EEPROM/Flash n'a été réservée : la conservation
s'effectue via un fichier local et le transfert RAM décrit ci-dessous, pas par
stockage interne. Les tests vérifient l'aller-retour et la corruption de chacun des
208 octets.
#### Transfert de presets vers des fichiers implémenté

L'image `Spectrum-PresetFiles-beta-20261025` comprend l'exportation et
l'importation de la table RAM complète, depuis **Quansheng > Opérations >
Presets de spectre Bricohams Beta**. Le fichier `.bhsp` fait exactement 208 octets,
sans données privées d'étalonnage ni de configuration des canaux. Le transfert
n'écrit ni EEPROM ni Flash et n'autorise pas la programmation persistante.
Le site web ne l'envoie pas à des serveurs. Il faut toujours le télécharger et le
conserver ; il n'est pas enregistré automatiquement sur le téléphone ou la radio.

Avant le transfert : entrer dans SPEC RX, enregistrer au moins un preset avec 8,
mettre en pause avec 4 (`HOLD`), désactiver MULTI s'il était activé et déverrouiller
le clavier. Le transfert depuis une capture RX n'est pas accepté. Pour importer, il
n'est pas nécessaire d'avoir des presets préalables. L'exportation d'une table vide
renvoie une erreur. L'activation dépend de l'état physique de la radio, pas d'un
booléen du site web. Toute touche traitée pendant un transfert efface l'état partiel.
Quitter le mode l'efface également.

L'exportation capture un instantané BHSP complet et le renvoie en deux fragments.
L'importation reçoit les deux fragments dans un buffer temporaire, valide le fichier
complet et ne remplace la table RAM qu'ensuite. Une interruption, un fragment manquant,
un token différent ou un CRC incorrect ne remplace pas la table. Le format général du
codec accepte davantage de configurations que l'adaptateur ; l'importation exige
128 points, une stabilisation de 10/20/40/80 ms, des pas de 125/250/625/1250 en
unités de 10 Hz, une moyenne de 1/2/4/8 et une fenêtre complète dans 136-174 ou
400-470 MHz. Les noms, la sélection, les réservés et les entrées inutilisées doivent
être canoniques.

L'importation ne règle pas la fréquence, ne reprend pas le balayage et ne restaure
pas le gain, la liste noire, le CSS ou l'audio. La touche 9 récupère le preset suivant
selon le comportement existant, et 4 reprend le balayage. Après confirmation de
l'importation, le site web relit la table complète et exige une égalité octet par octet.
Une erreur de relecture apparaît comme une importation non vérifiée : si le COMMIT a
été accepté, il est impossible d'affirmer que la table est restée inchangée.

Protocole privé expérimental little-endian `0x7B10` / réponse `0x7B11`, sur les trames
USB CDC/UART existantes. Il ne s'agit ni de chiffrement ni d'authentification.
Requêtes : version 1 (octet 0), opération (octet 1), token non nul sur 32 bits
(octets 2-5) et, uniquement pour les opérations 2/3, fragment de 104 octets. Les
autres commandes font exactement 6 octets. Réponse : version 1, état et même token,
suivis de 104 octets uniquement pour les exportations réussies. Les erreurs font
6 octets. Aucune struct C n'est sérialisée.

| Opération | Action |
| --- | --- |
| 0 | Créer un instantané et lire les 104 premiers octets |
| 1 | Lire les 104 octets suivants du même instantané et fermer le transfert |
| 2 | Commencer l'importation avec les 104 premiers octets |
| 3 | Recevoir les 104 octets suivants |
| 4 | Valider et appliquer la table RAM complète |
| 5 | Abandonner le transfert partiel sans modifier les presets |

Une nouvelle opération 0/2 remplace le transfert précédent. Les opérations 1/3/4
exigent le token et la phase appropriés. Le transfert expire 5000 ms après son début ;
les fragments ne prolongent pas ce délai. États : 0 réussite, 2 requête invalide,
3 état physique autorisé absent, 4 table vide/invalide à exporter, 5 phase/token/expiration
incorrects, 6 fichier corrompu/non pris en charge, 7 configuration non admise par
l'adaptateur. Aucune nouvelle tentative automatique ni COMMIT après une erreur sur
les fragments.

La compilation enregistre `spectrumPresets` et les hashes des sources dans le
manifeste. Les tests simulent la radio et le transport : lecture, CRC, commit atomique,
récupération du fichier, relecture différente, séquence/token, expiration/rollover,
longueurs invalides et verrouillage en mode capture/multipreset/clavier. Cela conserve
les presets entre les sessions avec des fichiers, sans équivaloir à une persistance
EEPROM. L'USB physique n'a pas été testé.

### Image Spectre, VFO-PRO RX et multipreset

`--module spectrum` remplace `--module ardf` dans la commande FieldOps documentée
ci-dessous, avec un nouveau répertoire de sortie. Fox Hunt résident doit être ON,
Beacon OFF et overlay apps OFF. Chaque adaptateur nécessite sa propre image. Le mode
Fox Hunt affiche `SPEC RX` ; l'analyseur original upstream reste disponible via ses
autres actions.

Le balayage propre couvre 128 points : 64 en dessous du centre, le centre et 63 au-
dessus. Toute la fenêtre doit se situer dans 136-174 ou 400-470 MHz. À l'entrée, le
centre est celui du VFO/canal sélectionné. Les mémoires, RX/TX du canal et l'étalonnage
ne sont pas modifiés. La modulation et la largeur restent celles du VFO d'origine ;
saisir une fréquence RX ne configure pas un nouveau profil de canal. Le gain utilise
les presets existants et permet d'ajuster uniquement les quatre champs RX de R13
documentés depuis la capture. Aucune édition arbitraire de registre n'est disponible.
Le flux de sortie restaure la RF avec `RADIO_SetupRegisters` ; cette restauration
et le fonctionnement RF restent à tester physiquement.

| Touche | Balayage propre |
| --- | --- |
| 0 | Activer/désactiver le défilement circulaire des presets RAM ; deux ou plus requis |
| 4 | Mettre en pause/reprendre le balayage et le changement de fenêtre |
| 5 | Réinitialiser le peak hold aux niveaux actuels |
| 6 | Pas de 1.25, 2.5, 6.25, 12.5 kHz ; réinitialise le graphe |
| 7 | Moyenne de 1, 2, 4, 8 échantillons par point ; réinitialise le graphe |
| * | Stabilisation RX de 20, 40, 80, 10 ms, en boucle ; réinitialise le graphe |
| 8 | Enregistrer dans le preset RAM suivant ; s'il y en a huit, remplacer celui sélectionné |
| 9 | Récupérer le preset RAM suivant en boucle |
| 3 / flèches | Atténuation upstream ; modifier le gain réinitialise les mesures non comparables |
| 1 | Effacer les exclusions de session et réinitialiser les mesures |
| 2 | Aucune action pendant le balayage ; audio coupé |
| PTT | Capturer le point mesuré le plus fort dans VFO-PRO RX ; ne transmet pas |
| EXIT | Quitter, supprimer les presets RAM et restaurer le VFO |

Les valeurs RSSI brutes et les pics sont affichés sur une échelle automatique de
0...maximum des pics du graphe, pas en dBm étalonnés et pas sous la forme d'une FFT.
L'échelle peut changer. Chaque accord applique la fréquence, le filtre RX et le
redémarrage de la réception BK4819, puis attend au moins la durée de stabilisation
SysTick réelle sélectionnée avant d'accepter les échantillons. Il n'attend pas cette
durée en bloquant. Chaque échantillon provient d'une autre itération. Les retards de
la boucle modale affectent également la cadence : aucun taux de balayage, aucune
largeur de bande de résolution et aucune précision instrumentale ne sont garantis.

La stabilisation commence à 20 ms à chaque entrée dans le mode et est enregistrée
individuellement dans les presets RAM/BHSP. Les anciens fichiers à 20 ms restent
acceptés ; les autres valeurs que 10/20/40/80 sont rejetées sans remplacer la table.
La capture VFO-PRO et les modifications de gain conservent leur attente indépendante
de 20 ms. Le mode 10 ms est expérimental : sa disponibilité ne prouve pas que le PLL,
le filtre ou le RSSI soient stables dans toutes les conditions. Il ne reproduit pas le
paramètre Delay ou Turbo interne de Karina et ne réduit pas le temps CSS.

`SPECTRUM ERROR` interrompt les nouveaux accords si la fenêtre déborde de la bande
ou si le noyau renvoie une erreur. Les extrémités ne sont pas tronquées silencieusement :
il faut récupérer un preset valide, réduire le pas ou quitter et changer le centre. Les
nouvelles touches respectent le verrouillage du clavier.

#### Capture VFO-PRO propre : réception seulement

La référence fonctionnelle est la section 4.4, page 22 du manuel Karina V1
d'août 2026 : capture active et vue détaillée. L'implémentation est propre à V3.
PTT n'active pas TX et n'applique ni décalage ni sous-tons de liaison montante.
Elle ne prouve pas l'équivalence complète avec VFO-PRO Karina.

PTT sélectionne le RSSI moyen actuel le plus élevé parmi les points terminés ; en cas
d'égalité, le premier est choisi. Lors du premier graphe, seuls les points déjà terminés
sont pris en compte ; ensuite, les points du passage précédent qui n'ont pas encore
été actualisés sont également considérés. La sélection ne s'appuie ni sur les pics
historiques ni sur l'identification de stations. Sans point terminé, `WAIT SAMPLES`
s'affiche et l'accord ne change pas.

| Touche | Capture RX |
| --- | --- |
| Haut / bas | Accorder un pas de balayage sans quitter les bandes RX |
| 2 | Activer/désactiver l'audio reçu via le flux upstream |
| 3 | Atténuation upstream |
| MENU | Basculer entre l'aide et la vue du gain RX : valeurs R13/R43 et champ sélectionné |
| 6, dans la vue du gain | Sélectionner LNAs, LNA, MIX ou PGA |
| 1 / 7, dans la vue du gain | Diminuer/augmenter d'un indice le champ RX sélectionné, sans dépassement cyclique |
| 4 | Inclure/exclure la fréquence capturée de la liste noire de session |
| 9 | Activer/désactiver la recherche CTCSS/DCS facultative, uniquement si le VFO d'origine est en FM |
| * | Saisie directe RX de huit chiffres ; 43512500 représente 435.12500 MHz |
| 5 | Centrer un nouveau balayage sur la fréquence capturée si toute la fenêtre y tient |
| PTT | Aucune action ; ne transmet pas |
| EXIT | Revenir au centre initial du balayage, réinitialiser les mesures et conserver les presets |

Les accords et les modifications de gain attendent au moins 20 ms avant d'afficher le
RSSI brut ; `SETTLING` est alors affiché. `BAND LIMIT` conserve la dernière fréquence
lorsqu'une tentative de sortie de bande est effectuée. `SPAN OUT OF BAND` conserve
la capture et le centre précédents si la touche 5 ne permet pas de faire tenir la
fenêtre entière. Les registres et indices sont des valeurs brutes, pas un étalonnage
certifié. Seuls les champs RX R13 décrits ci-dessous sont modifiés ; déviation,
microphone, AFC et TX ne sont pas édités. La recherche CTCSS/DCS facultative est
décrite ci-dessous. Il n'y a ni liste de détections ni enregistrement de fréquence
dans les mémoires.

En saisie directe, MENU n'applique que huit chiffres valides ; * efface un chiffre
(annule si la saisie est vide) et EXIT annule sans accorder. La saisie des chiffres
suspend les actions de capture. PTT ne transmet pas non plus. `ENTER 8 DIGITS`,
`FULL: 8 DIGITS` et `RX OUT OF BAND` signalent les rejets ; le dernier accord accepté
reste inchangé.

Un nouvel appui sur EXIT en mode balayage quitte le mode via le flux upstream.
L'accord fin ne modifie pas le centre avant l'appui sur 5 et ne change jamais RX/TX du
canal. Lorsque le clavier est verrouillé, les flèches conservent leur fonction
upstream d'atténuation et ne commandent pas l'accord. L'audio est coupé à l'entrée en
mode capture ; son réglage antérieur au mode est conservé à la sortie. Les écritures
des réglages Fox Hunt sont supprimées dans cette image : le gain et les nouvelles
options sont temporaires. Hors de ce mode, le firmware conserve TX upstream ; il
n'est pas globalement limité à RX.

#### Gain RX manuel et exclusions

La vue des registres permet de sélectionner avec 6 les champs R13 documentés par
`BK4819_InitAGC` upstream : LNAs (bits 9:8, indices 0-3), LNA (7:5, 0-7), MIX
(4:3, 0-3) et PGA (2:0, 0-7). 1 diminue et 7 augmente ; `GAIN LIMIT` rejette le
dépassement sans écriture. Chaque réglage lit R13, ne modifie que le masque sélectionné
et conserve tous les autres bits, y compris les inconnus 15:10. Il ne modifie ni R43,
ni R7E, ni les tables AGC. Fox Hunt fixe déjà AGC à l'entrée ; aucune deuxième
politique AGC n'est activée.

Les indices ne sont ni des dB étalonnés ni des valeurs interchangeables avec Karina.
`RX GAIN SESSION` signale le réglage et une nouvelle attente de stabilisation est
observée. En quittant la vue des registres, MAN remplace ATT ; le nombre après MAN
est le dernier indice de preset, pas une atténuation effective. Le réglage manuel reste
actif au retour au balayage et lors d'un changement de fenêtre, mais n'est pas
enregistré dans les presets. Modifier le preset de gain avec 3 ou les flèches
d'atténuation upstream remplace ces champs et rétablit ATT. En quittant le mode, la
RF est restaurée par le flux upstream, en attente d'un test physique. Aucun gain n'est
enregistré en EEPROM et il n'y a pas d'étalonnage.

La liste noire comporte 16 fréquences exactes en unités de 10 Hz, pas des plages.
En mode capture, 4 bascule la fréquence : `FREQ EXCLUDED` / `FREQ INCLUDED` ;
`BLACKLIST FULL` rejette une nouvelle entrée sans en supprimer une autre. BL indique
le nombre et X marque la capture exclue. En mode balayage, 1 vide la liste, réinitialise
les mesures et affiche `BLACKLIST CLEARED`.

Pendant le balayage, chaque point correspondant est ignoré sans accord ni lecture du
RSSI et son niveau/pic est remis à zéro. Un marqueur est dessiné, pas une mesure. La
capture automatique PTT ignore les points exclus ; `POINTS EXCLUDED` indique si tous
les points terminés sont exclus. Le saut avance également à la fin du graphe ou du
preset, sans attendre de signal ni boucler de façon bloquante. La liste est conservée
entre les presets et les pas pendant la session : si une autre grille ne correspond
pas exactement, aucune fréquence voisine n'est exclue. L'accord manuel peut écouter
une fréquence exclue pour permettre de la réinclure avec 4. Il ne s'agit pas d'une
restriction d'accès RF ni de TX. La liste est supprimée en quittant le mode/à l'arrêt
et n'est jamais écrite en mémoire persistante.

#### Recherche RX CTCSS/DCS facultative

En mode capture FM, 9 active `CSS SEARCH...` ; un nouvel appui sur 9 la désactive.
`CSS NEEDS FM` refuse l'activation dans les autres modulations sans écrire sur la RF.
La recherche réutilise `BK4819_SetScanFrequency`, `BK4819_GetCxCSSScanResult` et
les tables/décodeurs DCS upstream. Ce n'est pas un décodeur DSP propre ni une
certification de détection sur le matériel. La configuration temporaire du détecteur
ne modifie pas la tonalité TX/RX du canal et n'autorise pas la transmission.

R51 est sauvegardé avant activation puis restauré à la désactivation, au retour au
balayage avec EXIT/5 ou à la sortie du mode. La primitive de recherche peut réinitialiser
le chemin RX : les registres de gain R13 et AGC R7E sont donc préservés et réappliqués.
Aucun étalonnage n'est écrit et le résultat n'est pas enregistré. En cas de changement
de fréquence, la recherche est redémarrée sur celle-ci ; en cas de modification du gain,
le candidat et l'indication antérieurs sont supprimés.

Les résultats des 500 premières millisecondes après l'accord/l'activation sont ignorés
et les consultations ont lieu au maximum toutes les 250 ms. Une tonalité nécessite deux
résultats valides consécutifs du même type et indice, espacés de cet intervalle. Un
résultat absent ou invalide interrompt la confirmation. L'indication confirmée expire
après 1500 ms sans nouvelle confirmation ; une tonalité d'une émission précédente
n'est pas conservée indéfiniment.

Le CTCSS est affiché en Hz avec une décimale et une mesure n'est acceptée que si elle
se trouve à 0.5 Hz au plus du nominal de la table upstream ; il s'agit d'un filtre
d'affichage, pas d'une tolérance instrumentale mesurée. Le DCS est validé par le
décodeur Golay upstream, d'abord normalement puis en inversant ses 23 bits ; il est
affiché en octal avec N/I. Cette polarité est une interprétation du codeword observé,
qui reste à comparer à un générateur/une radio réels.

La ligne audio/liste noire est remplacée par la tonalité ou `CSS SEARCH...` pendant
l'activation ; les touches audio et d'exclusion restent fonctionnelles. Le RSSI n'est
pas utilisé pour valider le sous-ton, l'audio n'est pas filtré par tonalité et les
résultats ne sont pas copiés dans les mémoires. Du bruit, des porteuses faibles ou des
registres de détection figés peuvent produire de fausses correspondances : vérifier
avec une source connue avant d'utiliser l'indication pour configurer une autre radio.
Les tests de l'adaptateur simulent les résultats de la puce et du décodeur ; ils
vérifient la temporisation, le mode normal/inversé, le rejet, l'expiration, le rollover
et la restauration de R51/R13/R7E ; ils ne mesurent pas la détection RF réelle.

#### Multipreset de session

Les presets RAM1...RAM8 enregistrent la fenêtre, le pas et la moyenne, pas le gain,
les mesures ou l'étalonnage. P0/0 indique qu'il n'y en a aucun. Ils ne survivent pas à
la sortie/l'arrêt et n'écrivent pas dans l'EEPROM. La nouvelle image permet
l'importation/exportation de la table RAM par USB/UART dans des fichiers BHSP, comme
décrit ci-dessus.

Pour des fenêtres différentes : PTT pour capturer, * pour saisir une autre RX, MENU
pour accepter, 5 pour revenir au balayage centré et 8 pour enregistrer. Répéter pour
les plages souhaitées. Avec deux presets ou plus, 0 lance `MULTI` à partir de celui
sélectionné. À la fin des 128 points, le graphe s'affiche et l'itération suivante
commence le preset suivant ; après le dernier, le premier reprend. Chaque fenêtre
réinitialise ses niveaux/pics : les mesures de différentes bandes ne sont pas mélangées.
Il ne s'agit ni d'une exploration parallèle, ni d'une recherche par seuil, ni d'une liste
de stations.

4 met aussi en pause la transition ; 0 désactive MULTI sans supprimer les presets.
`SAVE 2 PRESETS` indique qu'il en faut deux. Modifier le pas, la moyenne ou le gain
réinitialise le graphe en cours sans le passer ; le preset ne change qu'après
l'enregistrement avec 8. PTT suspend le parcours pendant la capture ; EXIT ou 5
reviennent au balayage. En quittant le mode, les presets et MULTI sont supprimés.

Compilation avec bootlogo et transfert des presets : 118044 octets, RAM 13440/16384,
Flash 117156/120832 ; stub Multiboot de 888 octets et 83 branches d'isolation
vérifiées. La marge de cette combinaison est réduite : aucun module ne peut être
ajouté sans vérifier à nouveau la taille et la RAM. Les huit suites C réussissent,
notamment pour la capture partielle/complète, la saisie RX, les rejets, la lecture sans
écriture de R43, les cycles multipreset, la pause, la moyenne, les exclusions exactes
et les limites. 524288 combinaisons sont vérifiées : les 65536 valeurs possibles de
R13, dans quatre champs et les deux directions, avec contrôle de l'absence de
wraparound et de la préservation exacte des bits étrangers. Les trois suites Spectre
réussissent sans ARDF/Satellites. Ces tests simulent la RF et l'écran ; ils ne valident
pas la radio physique.

#### Sélection depuis le site web

Dans Quansheng, **Firmware personnalisé > Images Bricohams locales**, choisir
ARDF, Satellites ou Spectre et copier la commande PowerShell. Cette fonction n'utilise
pas les cases à cocher du catalogue en ligne, ne compile pas dans le navigateur et
n'installe rien. Elle exige les outils ARM locaux, un Fusion61 avec le commit figé et
une nouvelle destination. Les chemins de la commande doivent être adaptés à la machine.
Ensuite, charger tous les fichiers d'`artifacts`, y compris SHA256SUMS et build-info,
dans le vérificateur existant. La préparation et l'installation d'un slot restent
indépendantes et nécessitent une sauvegarde vérifiée ; Main est conservé.

### Nouveau noyau indépendant ARDF

L'implémentation propre s'appuie sur le comportement documenté et l'inspection de
binaires, sans attendre les sources Karina. Cela **ne prouve pas une équivalence à
100 %** et ne transforme pas la base F4HWN en une réécriture complète depuis zéro.

`firmware/bricohams/ardf.c` et `ardf.h` constituent un noyau C99 écrit de façon
indépendante : les implémentations ARDF ou Karina n'ont pas été copiées. Il met en
œuvre des cycles de 1-10 émetteurs, un mode sans cycle (0), la synchronisation de
l'émetteur/de la phase, l'avertissement de fin de tour et la mémoire d'index de gain
par VFO/émetteur avec masque A/B. Il ne contrôle ni la puce RF, ni TX, ni haut-parleur,
ni écran, ni clavier, ni EEPROM, ni étalonnage.

Contrat :

- `bh_ardf_init` valide avant de modifier l'état. Reconfigurer efface les historiques de gain. Une configuration rejetée conserve l'état.
- L'horloge d'entrée est un `uint32_t` monotone en millisecondes ; un rollover entre les appels est admis, mais pas de retour en arrière ni d'intervalle de 2^32 ms ou plus. L'adaptateur doit convertir la base de ticks de la radio.
- `correction_ppm` entre -50000 et 50000 modifie l'avance de l'horloge ; une valeur positive l'accélère. Ce n'est ni la valeur `ClkCor` d'un autre firmware ni un réglage de l'oscillateur RF. Les fractions sont conservées entre les mises à jour.
- Durée de 1000 à 999990 ms, avertissement de 0 à 30000 ms sans dépasser la durée du tour. Ce sont les limites de cette implémentation, pas une équivalence binaire.
- `max_gain_index` doit provenir d'une table RF validée pour le matériel ; le noyau ne suppose pas qu'un indice représente 5 dB.
- La lecture du gain renvoie `available=false` si aucun historique n'existe ; dans ce cas, l'indice de sortie n'est pas modifié. L'appelant doit vérifier le résultat et non le convertir en réglage RF par défaut.
- Les fonctions renvoient des erreurs explicites ; le futur adaptateur devra les signaler. Ne pas appeler simultanément depuis des interruptions et l'interface utilisateur.
- `BRICOHAMS_ENABLE_ARDF=OFF` exclut toute la bibliothèque à la compilation. Il s'agit d'une sélection de compilation, pas du chargement dynamique d'un module.

Tests natifs (compilateur C, CMake et générateur disponibles dans PATH) :

```powershell
cmake -S .\firmware -B .\firmware-builds\core-tests -G Ninja -DBUILD_TESTING=ON
cmake --build .\firmware-builds\core-tests
ctest --test-dir .\firmware-builds\core-tests --output-on-failure
```

Le workflow `firmware-modules.yml` exécute les tests C et vérifie aussi la
configuration sans ARDF. Il s'agit de tests du noyau, pas d'une validation radio. La
compilation ARM permet de vérifier la compatibilité des instructions et des
dépendances, mais ne remplace pas l'exécution des tests.

**Intégration Beta disponible :** `--module ardf` inclut le noyau et un adaptateur
dans Fox Hunt résident. Le builder valide tous les points d'intégration par rapport à
son checkout figé avant d'écrire les modifications. Il exige Fox Hunt ON, overlay apps
OFF et Beacon OFF ; les sources originales ne sont pas modifiées. L'horloge provient
du véritable SysTick de 10 ms, pas du comptage des itérations de boucle. Seule la
table d'atténuation Fox Hunt existante est utilisée ; les indices sont enregistrés en
RAM et récupérés manuellement, pas à chaque changement automatique d'émetteur. Aucun
nouveau réglage ni étalonnage n'est écrit.

Construction :

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\USER\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\ardf-beta' `
  --preset FieldOps `
  --option ENABLE_FEAT_F4HWN_BEACON=OFF `
  --option ENABLE_VOX=OFF `
  --module ardf
```

Sans `--module`, le builder n'applique aucun adaptateur et n'inclut aucun noyau
propre. `--module karina` et les autres noms non implémentés sont explicitement
rejetés. Le manifeste inclut les hashes des fichiers appliqués et les licences propres
GPL-3.0-or-later avec LICENSE/NOTICE Apache-2.0 upstream. `sourceChangesIncluded: false`
signifie que les modifications locales non confirmées du dépôt de référence ne sont
pas incluses ; les modifications du module figurent sous `modules` et `moduleSources`.

Dans Fox Hunt, clavier déverrouillé :

| Touche | Module ARDF |
| --- | --- |
| 4 | Nombre d'émetteurs : OFF, 1...10, OFF. Réinitialise la synchronisation et l'historique |
| 5 | Durée : 15...120 s, pas de 15 s ; valeur initiale 60 s. Réinitialise la synchronisation |
| 6 | Sélectionner le numéro de l'émetteur à synchroniser |
| 7 | Synchroniser le début de l'émetteur sélectionné avec l'événement réel |
| 8 | Enregistrer l'atténuation actuelle et noter une observation manuelle de l'émetteur en cours |
| 9 | Récupérer manuellement l'atténuation enregistrée de l'émetteur en cours, si elle existe |
| EXIT | Quitter Fox Hunt en conservant le comportement upstream |

La ligne de contexte indique le numéro/la durée/la sélection avant la synchronisation,
puis l'émetteur/le compte à rebours. `!` indique les 5 dernières secondes : aucun
nouveau bip n'est introduit. `ARDF ERROR` signale une erreur du noyau ; modifier le
nombre/la durée le réinitialise. F n'inverse pas les nouvelles actions 4-9. Le
verrouillage existant du clavier empêche toujours ces touches. Chaque entrée dans le
mode commence sur OFF ; il n'y a ni restauration persistante ni mémoire pour deux VFO
dans ce premier adaptateur (le noyau prend bien en charge deux banques).

Compilation structurelle du 25-10-2026 : image de 112672 octets, RAM 12448/16384,
Flash liée 111784/120832, stub Multiboot de 888 octets avec 83 branches vérifiées.
Ces mesures sont propres à cette combinaison et ne garantissent pas une réserve pour
tout ensemble de modules. Les tests de l'adaptateur utilisent des appels radio
simulés ; touches, synchronisation, affichage, erreurs et enregistrement/récupération
manuels sont vérifiés. **Aucune installation ni validation sur le matériel.** Hors de
Fox Hunt, le firmware conserve les capacités TX upstream ; Beacon/VOX OFF n'équivaut
pas à bloquer tout TX. Ne pas l'utiliser comme firmware ARDF certifié.

**En attente :** validation physique de l'écran, des durées et de l'atténuation,
options de persistance/VFO, réglages de compétition et réception. L'analyseur propre,
la capture RX et le multipreset sont intégrés dans l'image distincte `spectrum`, pas
ARDF. Les fonctions décrites ne prouvent pas une parité complète avec Karina.

### Statistiques ARDF par balise implémentées

L'image `ARDF-Stats-final-20261025` comprend le bootlogo et des observations
manuelles par balise : 113960 octets RAW, RAM 12576/16384 et Flash 113072/120832.
Il ne s'agit pas de détection automatique ni d'estimation de position.

En ARDF synchronisé, chaque appui traité sur 8 enregistre l'atténuation comme avant
et note une observation pour l'émetteur du tour en cours. Le cycle est actualisé avant
l'attribution afin de ne pas utiliser un tour précédent lors du franchissement de sa
limite. Chacune des dix balises possède un compteur, un premier/dernier instant relatif
de session et le dernier indice d'atténuation. Aucun RSSI, cap, fréquence ou coordonnée
GPS n'est échantillonné ni stocké. L'indice 0-5 appartient à la table upstream à six
étapes ; il n'exprime pas des dB.

Les compteurs saturent à 65535 sans wrap ; un flag avertit si davantage d'observations
ont été tentées. Dans ce cas, les totaux sont un minimum et non un compte exact. La
première/dernière heure et l'indice continuent d'être mis à jour. Le temps correspond
au temps écoulé depuis l'entrée/la reconfiguration ARDF, pas depuis la synchronisation
de la balise. L'horloge utilise un uint32 en millisecondes : la session doit durer moins
de 2^32 ms (environ 49.7 jours). Ce n'est ni UTC ni GPS, et `receivedAt` dans le JSON
est l'heure de réception de l'ordinateur.

Une nouvelle entrée en ARDF ou une modification du nombre/de la durée des émetteurs
ouvre une nouvelle session et efface les observations précédentes. Une resynchronisation
avec 7 n'efface pas les données si le nombre/la durée ne changent pas. À la sortie, le
temps est figé et la dernière table RAM conservée jusqu'au démarrage d'une autre session,
à une reconfiguration ou au redémarrage/à l'arrêt de la radio. Ces statistiques ne sont
pas écrites dans l'EEPROM/Flash ; hors de cette table, les paramètres Fox Hunt upstream
conservent leur comportement de sauvegarde existant.

Dans **Quansheng > Opérations > Statistiques ARDF Bricohams Beta**,
**Consulter et télécharger les statistiques ARDF** récupère un instantané et propose
le téléchargement JSON. Il n'y a ni interrogation continue ni envoi vers des services.
Une session terminée ou l'état OFF peuvent être consultés, mais pas une radio qui n'a
jamais commencé ARDF depuis son démarrage. L'interface identifie les erreurs du module,
la saturation et l'absence de position. Le téléchargement doit être confirmé dans le
navigateur avant d'abandonner la session.

Le JSON comprend `connectionSession` du connecteur et un compteur `session` du
firmware propre à ce démarrage. Ce ne sont pas des identifiants globaux : après une
reconnexion ou un redémarrage, il faut conserver les fichiers originaux et ne pas
fusionner les sessions sur la seule base du numéro. `observations` contient un
enregistrement par balise observée, pas un événement par appui ni un parcours GPS.
La table récapitulative est exportée ; les observations intermédiaires ne sont pas
reconstruites.

Protocole privé expérimental little-endian : commande `0x7B20`, réponse `0x7B21`.
Requête de 4 octets exactement : version 1, opération 0 (consultation), séquence de
16 bits. Réponse de 140 octets, plus l'en-tête upstream de 4 octets : elle respecte
sa limite de réponse de 144 octets.

| Offset réponse | Octets | Contenu |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | État : 0 réussite, 2 requête invalide, 3 aucune session démarrée |
| 2 | 1 | Flags : actif=1, synchronisé=2, erreur du module=4, compteur saturé=8 |
| 3 | 1 | Nombre d'émetteurs, 0-10 |
| 4 | 2 | Séquence réfléchie ; zéro si la longueur de la requête est invalide |
| 6 | 2 | Réservés, zéro |
| 8 | 4 | Compteur de session non nul, réinitialisé au démarrage |
| 12 | 4 | Durée du tour en ms |
| 16 | 4 | Temps écoulé de la session en ms |
| 20 | 120 | Dix enregistrements de 12 octets, balises 1-10 |

Chaque enregistrement contient un compteur uint16, un indice de gain uint8,
valide uint8 (0/1), le premier instant uint32 et le dernier instant uint32.
Les enregistrements sans observation sont à zéro. Le connecteur valide la longueur,
la version, la séquence, les champs réservés, le numéro de balise, l'indice, l'ordre
des temps et la cohérence avant de transmettre les données ou de les exporter. Les
requêtes invalides n'effacent ni ne modifient la table. L'obfuscation du transport
n'est ni chiffrement ni authentification.

Tests C avec radio simulée : limites des tours, premier/dernier instant, compteur
saturé, réinitialisations, lecture après sortie, longueurs invalides et rollover de
l'horloge. Les tests JavaScript vérifient l'instantané et les rejets de séquence,
balise, indice, temps, champs réservés et absence de session. L'intégration USB et
l'affichage physique restent à réaliser. Aucune position du téléphone n'est attribuée
à une observation passée : le futur enregistrement GPS devra recueillir ses propres
horodatages/précision et consentement.

### Nouveau noyau indépendant d'acquisition du spectre

`firmware/bricohams/spectrum.c` et `spectrum.h` implémentent une machine à états C99
originale, sans copier d'algorithmes de Karina. Elle configure de 1 à 128 points,
la fréquence initiale et le pas en unités de 10 Hz, une stabilisation de 1-1000 ms et
une moyenne de 1-16 échantillons RSSI par point. Chaque point conserve le niveau moyen
et le maximum retenu ; la réinitialisation des maxima reprend les niveaux actuels.
`BRICOHAMS_ENABLE_SPECTRUM=OFF` exclut cette bibliothèque.

L'adaptateur doit demander `bh_spectrum_frequency`, valider la bande réelle, accorder
le récepteur et, en cas de réussite seulement, appeler `bh_spectrum_tuned`. Les
échantillons obtenus avant la stabilisation renvoient `NOT_SETTLED` et ne sont pas
intégrés. À la fin d'un point, un nouvel accord est toujours requis, même s'il n'y a
qu'un seul point. À la fin d'un balayage, `frames` est incrémenté. Les valeurs sont
le RSSI brut, **pas des dBm étalonnés** ; l'adaptateur doit garantir qu'une valeur
plus élevée représente un signal plus fort.

L'horloge a le même contrat monotone 32 bits que pour ARDF ; les fonctions ne sont
pas appelées simultanément. L'adaptateur détermine la cadence et prend des mesures RF
distinctes : des appels répétés avec la même lecture ne créent pas des échantillons
indépendants. Le noyau ne contrôle pas AGC/LNA/PGA, n'émet pas TX, ne calcule pas de
FFT et n'enregistre ni presets ni étalonnage.

Les tests couvrent les limites, le changement de point, le calcul exact de fréquence,
la moyenne, les maxima, la stabilisation, le rollover, 128 points avec 16 échantillons
RSSI maximaux et le rejet atomique d'une configuration invalide/de dépassements. Ce
n'est pas l'analyseur Karina. L'adaptateur de l'image `spectrum` relie ce noyau au
récepteur et à l'écran avec la portée Beta décrite ci-dessus ; la validation physique
reste à faire.

Prérequis dans PATH : Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain et
Python 3 pour le vérificateur de formats upstream. Aucun paquet Python externe ni
nouvelle dépendance npm n'est requis.

Configuration utilisée et testée sous Windows :

- Arm GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, détecté par CMake.

Depuis la racine de ce dépôt, dans PowerShell :

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

La destination **doit être nouvelle** : une compilation précédente n'est ni supprimée
ni écrasée. En cas d'échec de compilation, l'erreur est affichée et aucun ensemble
d'artefacts n'est fourni comme valide ; utiliser une nouvelle destination pour
recommencer. Les sources et résultats de diagnostic restent dans la destination en
échec.

Pour Labs, remplacer `--preset Fusion` par `--preset Labs` et utiliser une autre
destination. `FieldOps` et `Transfer` sont aussi acceptés, mais ces deux profils n'ont
pas été compilés lors de cette validation.

Chaque `--option` accepte uniquement `ENABLE_XXX=ON` ou `ENABLE_XXX=OFF`. Plusieurs
arguments `--option` peuvent être répétés pour différentes fonctions, mais pas pour
le même nom. Les options disponibles sont les booléens des presets du **commit local
figé**, pas celles du formulaire en ligne v6.3.0. Les clés inconnues, valeurs
arbitraires, `DEV`, autre matériel ou versions inventées ne sont pas acceptés.

Pour les afficher sans compiler :

```powershell
$p = Get-Content 'C:\Users\USER\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

Le constructeur résout l'héritage des presets et exige que les options suivantes
restent activées :

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

Ces conditions conservent le profil de gestion des slots ; elles ne garantissent pas
que toute autre combinaison soit utile ou sûre. Le linker doit accepter la RAM et la
Flash, et les vérifications upstream doivent réussir. Le budget n'est pas réduit et
les vérifications ne sont pas omises pour faire tenir une image.
## Sources, compilation et reproductibilité

Le script clone le dépôt **local** dans un dossier distinct et extrait le commit figé.
Il ne modifie pas le dossier Fusion61, n'applique pas son diff non validé, ne télécharge
pas Karina et ne change pas la version pour contourner l'inspecteur.

`SOURCE_DATE_EPOCH` est fixé à l'heure du commit, ainsi que `TZ=UTC` et `LC_ALL=C`.
Avec la toolchain indiquée, deux compilations Fusion dans des chemins différents ont
produit le même SHA-256 du `.bin`. Cela vérifie la reproductibilité locale du firmware,
pas l'identité octet par octet des ELF, cartes ou rapports contenant des chemins
absolus, ni la reproductibilité avec une autre toolchain.

Le constructeur :

1. Valide les arguments, le commit et les options avant de créer la destination.
2. Clone les sources et configure CMake en Release.
3. Compile avec le preset choisi, l'édition Bricohams et les options résolues.
4. Conserve les vérifications de format et d'isolation du restaurateur RAM.
5. Vérifie la longueur, les vecteurs PY32, la version et la marque d'édition dans le binaire.
6. Produit les artefacts, les options effectives, les outils et les hashes.

Le répertoire `source` conserve le checkout utilisé. Le dossier `artifacts` contient
le firmware, ELF, la carte mémoire, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`
et `SHA256SUMS`. Tous les fichiers, sauf le manifeste lui-même, sont inclus dans
SHA256SUMS. Le hash détecte les altérations par rapport au manifeste, **ce n'est pas
une signature numérique**.

## Binaires générés le 25-10-2026

Les deux utilisent `ENABLE_VOX=OFF` ; les autres options sont celles de leur preset
upstream.

| Profil | Binaire | Octets RAW | RAM selon linker | Flash selon linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

La taille RAW inclut la section de restauration RAM et n'est pas identique à la ligne
FLASH du rapport. Les deux fichiers RAW font moins de 120832 octets. La vérification
d'isolation indique 888 octets et 83 sauts examinés.

SHA-256 :

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs conserve `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` et
`ENABLE_FEAT_F4HWN_OVERLAY_APPS` ; Fusion non. La capacité de sauvegarde physique
nécessite le protocole compatible de la radio et n'a pas été testée sur matériel.
Aucun nouveau fichier `.app` n'a été généré : les fichiers existants nécessitent une
ABI/API compatible.

## Utilisation sur le site web et slots

Les artefacts fournis sont copiés dans :

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

Dans **Quansheng > Firmware personnalisé > Vérifier la compilation téléchargée**,
sélectionner ensemble **tous** les fichiers d'un dossier d'artefacts. Le vérificateur
exige chaque entrée de SHA256SUMS, y compris les cartes, ELF et licences. Après
vérification, **Utiliser ce firmware** le prépare dans le panneau des slots.

Autre possibilité : sélectionner `Documents\Multiboot` dans la bibliothèque locale ;
les deux fichiers `.bin` apparaissent comme images supplémentaires à préparer. La
bibliothèque vérifie la structure et affiche le hash, mais ne vérifie pas
automatiquement le manifeste voisin ; pour cela, utiliser le formulaire de compilation.

L'installation conserve la sauvegarde complète, la confirmation et le CRC du slot.
**Utiliser les slots 1-4, pas Main.** Aucune donnée de la radio n'a été écrite ni
effacée. Fusion et Labs ici sont des builds expérimentaux locaux, pas des versions
officielles signées ni certifiées en banc. La chaîne stable upstream ne modifie pas
le statut expérimental de cette dérivation.
## Validation matérielle en attente

Validation logicielle achevée : 149 tests, vérification de syntaxe et build Pages réussis.
Dans le navigateur, les 7 fichiers du manifeste de chaque édition ont été vérifiés,
les deux firmwares préparés et l'installation est restée bloquée en l'absence de
connexion/sauvegarde. Après sélection de Multiboot, 73 images ont été examinées :
11 admises structurellement et 62 bloquées. Aucun erreur JavaScript n'a été observée
lors de cette vérification.

Avant de le considérer apte à l'utilisation opérationnelle, l'identification de l'unité,
la sauvegarde originale, le test de démarrage et de récupération, l'étalonnage, les
menus, la RX et le changement de CFG/slots restent à valider. L'erreur USB précédente
n'est pas déclarée résolue. Ces binaires ne sont ni publiés ni flashés automatiquement.

## Branding de démarrage implémenté

Le constructeur applique l'accueil Bricohams à toutes les nouvelles éditions, avec
ou sans adaptateur. Il conserve les avis de licence upstream et ne modifie pas le dépôt
de référence. Les points d'intégration sont validés une seule fois : une source
différente ou un patch en double interrompt la compilation. Le manifeste enregistre
les hashes dans `brandingSources`, séparés de `moduleSources` ;
`sourceChangesIncluded: false` désigne toujours les modifications locales du dépôt
upstream, et non l'absence de ces patches propres.

Avec `ENABLE_FEAT_F4HWN_LOGO=ON`, le mode de démarrage LOGO et les appels à
`UI_DisplayLogo` affichent une adaptation monochrome 128x48 du logo original
Bricohams, avec `Bricohams BETA` sur la dernière ligne. Elle occupe 768 octets de
bitmap dans la Flash interne. Le logo personnalisé de la Flash externe n'est ni lu ni
écrasé : il est conservé, mais n'est pas affiché dans ce mode pour ces images dérivées.
Désactiver LOGO à la compilation exclut le bitmap par suppression du code inutilisé ;
cette option n'est pas imposée.

Les modes NONE/SOUND ne présentent toujours pas d'accueil ; la préférence de démarrage
enregistrée n'est pas modifiée. Dans les modes texte, les messages personnels et la
tension sont conservés ; seuls les messages vides par défaut sont remplacés par
Bricohams/RADIO BETA, et le pied de page identifie l'édition Beta. Il n'est pas affirmé
que le logo apparaisse dans tous les modes de démarrage.

`scripts/generate-bootlogo.ps1` génère `firmware/bricohams/bootlogo.h` à partir du PNG
original avec System.Drawing sous Windows. Le builder utilise l'en-tête déjà généré,
sans nécessiter PowerShell ou cette bibliothèque pour compiler. Les proportions sur
fond blanc sont conservées ; le seuil de luminance 190 transforme les traits foncés et
orange en pixels actifs de l'écran LCD monochrome. Le SHA-256 du PNG figure dans
l'en-tête. Il s'agit d'une adaptation propre au matériel, pas d'un remplacement de la
ressource couleur du web/Android.

Images Beta avec bootlogo compilées le 25-10-2026 :

| Module | Répertoire sous Documents/Multiboot/Bricohams | Octets RAW | RAM | Flash |
| --- | --- | ---: | ---: | ---: |
| ARDF | `ARDF-Bootlogo-final-20261025/artifacts` | 113452 | 12448/16384 | 112564/120832 |
| Satellites | `Satellite-Bootlogo-final-20261025/artifacts` | 113096 | 12352/16384 | 112208/120832 |
| Spectre/VFO-PRO/CSS | `Spectrum-Bootlogo-final-20261025/artifacts` | 116808 | 13248/16384 | 115920/120832 |

Les mesures antérieures d'autres dossiers correspondent aux compilations précédentes,
sans ce bitmap. Le logo doit encore être vérifié physiquement sur l'écran LCD ; compiler
et afficher le bitmap sur un ordinateur ne valide ni le contraste, ni l'orientation, ni
la lisibilité dans la radio. Aucun firmware n'a été flashé.
## Phase ultérieure demandée : Bricohams Android

L'APK native `0.8.2-beta` comprend un carnet de trafic avec recherche et importation ADIF,
ADIF/JSON, restauration JSON, sessions ARDF avec historique/statistiques et somme des
segments filtrés, GPS ponctuel, Morse à partir de texte/WAV expérimental et CAT RX
temporaire via USB CDC ACM et adaptateurs reconnus CH34x/CP210x/FTDI/Prolific.
Le [guide Android](ANDROID.md) distingue les fonctions disponibles des objectifs
suivants. Il comprend le SSTV Robot36 à partir de WAV avec exportation PNG et SGP4 hors
ligne avec catalogues TLE importés, passages et suivi Doppler RX. Il intègre une
capture de microphone en premier plan de 60 s au maximum pour un décodage ultérieur
Morse/Robot36. Il ne comprend ni décodage continu, ni écriture de canaux, ni envoi
LoTW. L'équivalence complète avec Karina et la validation physique du firmware et du
téléphone restent en attente.

### Fonctions visées

- Contrôle du Quansheng depuis Android : lire l'état, régler fréquence, sous-tons et puissance par canal et accéder aux autres options réellement exposées par le matériel/firmware. Distinguer les réglages temporaires VFO de l'écriture persistante ; ne pas réécrire tout le codeplug pour modifier un champ si le protocole permet une opération plus ciblée.
- Suivi de satellites selon le fonctionnement de Look4sat : sélection du satellite, TLE, prédiction des passages, position de l'observateur et correction Doppler de la fréquence par CAT pendant le passage sélectionné.
- Réception/décodage SSTV, notamment Robot36 ; transmission SSTV comme objectif à valider avec le chemin audio et la PTT disponibles.
- Interprétation du Morse à partir de l'audio, avec indication d'incertitude.
- Carnet de trafic s'inspirant fonctionnellement de HAMRS : contacts, consultation, édition, export ADIF et objectif de signature/envoi vers LoTW.
- Chasse au renard : sessions, balises, durées, observations, parcours GPS, positions et statistiques de recherche, avec exportation et fonctionnement sur le terrain hors ligne pour les fonctions qui ne nécessitent pas de services.
- Marque Bricohams dans l'application, le firmware, les bootlogos, la documentation et les artefacts. Migration finale du site web et de l'application vers l'orange de la marque, après réalisation et test des fonctions, conformément à la demande.

### Hypothèses provisoires et limites

En l'absence de réponse aux demandes de clarification, l'USB OTG avec câble de
programmation est le transport initial prévu. Bluetooth nécessiterait un adaptateur et
un protocole vérifiés ; la présence de Bluetooth dans la radio n'est pas présumée. Un
câble série de programmation n'implique pas le transport audio : SSTV et Morse
nécessitent une entrée/sortie audio distincte et vérifiée. Il n'est pas présumé
qu'Android puisse maintenir l'USB et cette liaison audio simultanément sur tous les
téléphones sans test.

Le CAT n'est pas considéré comme disponible simplement parce que la lecture/l'écriture
des canaux existe. Il faut d'abord vérifier les capacités réelles du firmware et, au
besoin, concevoir un protocole propre versionné, avec consultation des capacités,
validation par modèle, accusé de réception, erreurs et récupération après déconnexion.
TX, les limites de bande et les protections de sauvegarde restent en vigueur. Le suivi
ne doit pas activer automatiquement TX ni continuer à commander des changements après
la perte de connexion.

L'envoi direct vers LoTW reste un objectif, pas une intégration achevée. Il faut
vérifier le mécanisme de signature accepté et la gestion sécurisée du certificat
d'indicatif dans Android. L'alternative initiale est ADIF pour signature avec TQSL sur
ordinateur ; exporter ADIF n'équivaut pas à l'envoyer sur LoTW. Ne pas inclure de
certificats, clés ou mots de passe dans le dépôt, les journaux de diagnostic ou les
projets exportés.

Le terme demandé « encriptions » reste à clarifier : il n'est pas interprété
automatiquement comme un chiffrement des communications radioamateur. Aucun support
du chiffrement ni sa légalité ne sont annoncés.

Le GPS fournit la position du téléphone, pas celle de la balise. Une estimation de la
position d'un émetteur exige suffisamment d'observations/délais et doit afficher son
incertitude ; un RSSI seul ne permet pas d'affirmer une localisation exacte. Les
parcours et positions sont privés par défaut, soumis à des autorisations explicites et
sans publication automatique.

Les applications citées sont des références fonctionnelles, pas des sources disponibles
ni une autorisation à copier du code, des ressources ou des marques. Privilégier les
sources dont la licence est compatible et préserver les attributions ; à défaut,
implémenter indépendamment à partir de la documentation et du comportement observable
autorisé, sans contourner les protections. Ne pas affirmer la parité sans tests.

### Critères avant de déclarer la phase terminée

1. Finaliser la matrice des fonctions de chaque image et valider sur du matériel identifié et sauvegardé intégralement le démarrage, la récupération, la RX, la restauration des registres et les opérations prises en charge.
2. Approuver l'architecture Android et la matrice téléphone/câble/radio/firmware ; vérifier le contrôle CAT, les déconnexions et la relecture après les changements de canal.
3. Comparer les passages/Doppler à des références connues, tester SSTV/Morse avec des échantillons connus puis de l'audio réel, et valider séparément les enregistrements ADIF et la signature/l'envoi LoTW.
4. Tester le GPS, les autorisations refusées, l'absence de réseau, les sessions et les statistiques de terrain sans inventer la position des balises.
5. Appliquer et vérifier le branding Bricohams et les bootlogos selon les limites de l'écran, en conservant licences et avis obligatoires. Appliquer finalement la palette orange avec un contraste accessible, sans confondre les états de danger, réussite et avertissement. Livrer l'APK et les artefacts identifiés par version/hash uniquement lorsque leur état de validation est explicite.