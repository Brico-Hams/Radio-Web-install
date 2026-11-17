# Au coeur du firmware Icom modifié (IC-705 / IC-9700)

Base de connaissances technique sur le firmware modifié de Dawid SQ6EMM : ce qui est modifié, où et comment. Elle synthétise deux dépôts MIT intégrés sans modification : `third_party/icom-custom-firmware/` (commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`) et `third_party/icom-byof/` (commit `a91231f64e8afbe34353994786e8276a3b54f1a9`). Chaque fait cite son fichier source. Le détail par adresse de chaque patch est dans [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md) et le guide d'utilisation dans [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 1. Portée et sources

| Source | Contenu |
|---|---|
| `third_party/icom-byof/IC705_DAT_FORMAT.md` | Format du conteneur `.dat` |
| `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | Carte de la flash de l'IC-705 |
| `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | Carte de la flash et slots A/B de l'IC-9700 |
| `third_party/icom-byof/FREQUENCY_RANGES.md` | Plans de bande par région |
| `third_party/icom-byof/UNDOCUMENTED_CIV.md` | Commandes CI-V non documentées |
| `third_party/icom-custom-firmware/releases.json` | Liste des versions et fonctions |
| `third_party/icom-custom-firmware/docs/patches/` | Patchs JSON utilisés par le patcheur |

Aucun octet d'Icom n'est distribué : les patchs ne contiennent que des octets propres au projet et des références pour copier des octets du firmware officiel fourni par l'utilisateur.

## 2. Le conteneur `.dat`

### 2.1 En-tête et paramètres par radio

Selon `third_party/icom-byof/IC705_DAT_FORMAT.md`, le fichier commence par la signature `44 00 77 55`. Sur l'IC-705 l'en-tête fait 0x64 octets (champs f38, f44, f4c, f54 et f5c), contient quatre condensats MD5 et se termine par un pied de 2 octets (`40 75`). Les paramètres de la transformation dépendent du modèle, selon `third_party/icom-byof/README.md` :

| Radio | KEY | START |
|---|---|---|
| IC-705 | `0x19` | `0x64` |
| IC-9700 | `0x2b` | `0x38` |
| IC-905 | `0x7f` | `0x88` |

L'IC-905 est signé en RSA-2048 et SHA-256, il ne peut donc pas être reconditionné ; il est seulement documenté.

### 2.2 Transformation autokey

Selon `third_party/icom-byof/icom_rza1_decode.py`, le chiffrement est un autokey octet par octet : `plain = stored ^ ((prev_plain + abs_offset - KEY) & 255)`. Le compteur démarre à `0x4b` dans chaque domaine et le remplissage en clair est `FF`. La clé se retrouve sans la connaître :

- `deriveKey` cherche une suite monotone de 16 octets de pas -1 entre les offsets `0x20` et `0x8000` et obtient `KEY = (run[0] + s) & 255`.
- `findStart` balaie s de `0x10` à `0xFFF` avec des fenêtres de `0x1000` ou `0x10000`, inverse l'autokey en arrière ancré sur `FF` et cherche les vecteurs ARM `18f09fe5 18f09fe5`.

La version JavaScript se trouve dans `third_party/icom-custom-firmware/docs/js/codec.js`.

### 2.3 Compression LZSS

Selon `third_party/icom-byof/IC705_DAT_FORMAT.md` et `third_party/icom-byof/ic_rza1_repack.py`, on utilise le LZSS d'Okumura :

| Paramètre | Valeur |
|---|---|
| Fenêtre (anneau) | 4096 octets |
| Curseur initial | `0xFEE` |
| Drapeaux | LSB en premier, 1 = littéral, 0 = correspondance de 2 octets |
| Index | `lo` plus les 4 bits de poids fort de `hi` décalés de 4 positions (`(hi & 0xF0) << 4`) |
| Longueur | `(hi & 15) + 3`, soit de 3 à 18 |
| Fin du flux | longueur de sortie explicite, pas de marque de fin |

La décompression gère le chevauchement (une copie peut lire des octets tout juste écrits). Le compresseur utilise des chaînes de hachage à clé de 3 octets (la plus récente d'abord), `max_chain=256`, la première plus longue correspondance l'emporte et un appariement paresseux d'un pas est appliqué. Cet ensemble de règles rend le port JS identique bit à bit à celui en Python. La sortie est environ 2 % plus petite que celle d'Icom. Malgré cela, le slot de l'IC-9700 peut grandir jusqu'à environ 1,3 MiB à cause du code ajouté et du réalignement du paquet graphique.

### 2.4 Sceau MD5

`findMd5Region` calcule le MD5 de façon incrémentale par pas de `0x1000` jusqu'à ce que le condensat cumulé soit égal aux 16 octets suivants. Selon `third_party/icom-byof/README.md`, la région scellée fait `0x9c0000` octets sur l'IC-705 et `0x800000` sur l'IC-9700. Après reconditionnement, le sceau doit être recalculé.

### 2.5 Bootstrap et image principale

Selon `third_party/icom-byof/IC705_DAT_FORMAT.md` :

| Élément | Détail |
|---|---|
| Bootstrap | DAT de `0x64` à `0x10064`, mappé sur la flash `0x18000000`, 0x10000 octets |
| Chargeur | bootstrap `+0x4000`, longueur `0x9bc`, copié en RAM `0x20004000` ; entrée `0x20004840` ; routine LZSS en `0x200044dc` |
| En-tête principal | DAT `0x10064` : `csz` et `osz` (deux LE32 sur l'IC-9700) |
| Flux principal | commence à `0x1006c`, se décompresse en RAM `0x20005000`, entrée `0x20005060`, ARMv7-A |
| Aux1 | se décompresse en RAM `0x20000008` (Thumb) |
| Aux2 | se décompresse en flash `0x08000000` (Cortex-M) |

Sur l'IC-9700 un paquet graphique est chaîné à slot + `csz` + 8 et se déplace avec le flux principal ; `repack` le réaligne sur 4 octets et remplit avec `FF`. Les patchs utilisent deux MD5 par radio : celui du fichier complet (`md5`) et celui de l'image principale décompressée (`main_md5`), plus un MD5 propre au bootstrap.

`repack(..., new_bootstrap)` (dans `third_party/icom-byof/ic_rza1_repack.py`) exige exactement `0x10000` octets, l'étiquette de `0x4f00` à `0x4f10` identique à l'originale et des vecteurs ARM au début. Sinon, l'outil de mise à jour d'Icom prend son chemin hérité et réécrit le slot A.

### 2.6 Cycle : décoder, patcher, reconditionner

1. Décoder : défaire l'autokey, localiser le flux principal et le décompresser.
2. Patcher : appliquer les opérations du JSON à l'image principale (et éventuellement au bootstrap).
3. Reconditionner : compresser avec le LZSS décrit ci-dessus, rechiffrer et recalculer les MD5.

Le résultat doit être identique octet pour octet à celui testé sur une radio : le patcheur ne propose le téléchargement que si le MD5 de sortie est égal à `output.md5` ; sinon il n'écrit rien (selon `third_party/icom-custom-firmware/docs/js/patch.js`). C'est pourquoi le compresseur doit reproduire exactement l'algorithme, et pourquoi seul un firmware officiel non modifié est accepté en entrée.

## 3. Plateforme et carte mémoire

Le processeur est un Renesas RZ/A1H (R7S721001, IC101) avec la flash mappée en XIP à `0x18000000` (selon `third_party/icom-byof/IC705_FLASH_LAYOUT.md`).

### 3.1 IC-705

Flash ISSI IS25LP128 de 16 MiB, RDID `9D 60 18`, secteurs de 4 KiB. Les premiers `0x600000` octets de la flash correspondent au corps décodé ; le DSP, le WLAN et les ressources se trouvent au-delà. La taille de l'image principale d'origine est `0x376000` (`output_size`) ; les patchs produisent `0x386000`.

### 3.2 IC-9700

Flash S25FL127S de 16 MiB, RDID `01 20 18`, secteurs de 64 KiB, IC181 (selon `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`) :

| Région | Offset | Notes |
|---|---|---|
| Bootstrap | `0x0` | 0x10000 octets |
| Slot A | `0x10000` | 0x7f0000 octets |
| Slot B | `0x800000` | 0x7f0000 octets |
| Marqueur | `0xff0000` | 16 octets `SX3913 V0.10-000` signifie démarrer le slot B |

Dans chaque slot apparaissent les offsets +`0x3e0000`, +`0x3e4000`, +`0x3f0000` à `0x793000` et +`0x7e0000` / +`0x7ec000`. Valeurs d'origine de E1.50 : `csz` `0x2145F4`, `osz` `0x405334`, `csz2` `0x80C2C`, `osz2` `0x2675BC`. Le chargeur d'origine n'a pas de repli automatique : l'outil de mise à jour SD écrit le slot inactif puis fixe le marqueur.

### 3.3 Zones à ne jamais écraser

Les deux EEPROM GT24C1024 (IC191 et IC192) contiennent les réglages et la calibration. Ce ne sont pas du firmware et elles ne doivent **jamais** être écrasées. L'étiquette du bootstrap de `0x4f00` à `0x4f10` ne doit pas non plus être touchée. Les commandes CI-V de service (section 6) peuvent effacer ou dérégler ces données.

## 4. Mécanisme de patch

Selon `third_party/icom-custom-firmware/docs/patches/`, chaque patch est un JSON avec `name`, `description`, `load_address`, `image_size`, `input`, `output`, `ops` et éventuellement `bootstrap`. Les opérations `hex` écrivent des octets propres au projet et les opérations `copy_from` copient `len` octets du firmware officiel vers une autre position (relocalisation). Les adresses sont absolues : l'image principale est chargée à `0x20005000` et les opérations du bootstrap sont des décalages depuis son début.

Schéma observé (chiffres exacts dans [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md)) : un patch de vecteur ou de littéral près de `0x20005024`, de nombreux petits sauts BL ou B de 3 ou 4 octets qui détournent des routines existantes, et du code propre ajouté à la fin de l'image (sur l'IC-9700 l'image passe de `0x2040A334` à `0x2040FE10`). Dans le bootstrap, le chargeur patché s'étend au-delà de l'original (qui se termine à `+0x49bc`) jusqu'à l'étiquette préservée.

## 5. Fonctions du firmware personnalisé

Les fonctions sont listées dans `third_party/icom-custom-firmware/releases.json`. Les sources ne publient pas le code source du firmware personnalisé, seulement les octets du patch ; quand le comment n'est pas indiqué, on ne l'invente pas.

| Fonction | Ce qu'elle fait |
|---|---|
| TRV1 à TRV8 | Huit transverters avec fréquences RF et FI, conservés après extinction |
| Affichage RF | Affiche la fréquence réelle jusqu'à 122 GHz |
| CI-V étendu | Fréquence de 6 octets au-dessus de 1,4 GHz sur l'IC-9700 |
| IC-9700 MAIN, SUB, DUAL, SAT | Les réglages d'émission suivent le récepteur qui émet |
| Échelle du scope | dB/div 10, 6, 3 et 1 avec plancher de bruit automatique |
| Limite de puissance | Maximum par transverter : 100, 50, 25, 10 ou 5 % ; n'augmente jamais la puissance de la radio |
| Délai TX | Jusqu'à 300 ms par transverter |
| Inhibition PTT | Par transverter |
| Plages TX de l'IC-705 | Étendues selon `third_party/icom-byof/FREQUENCY_RANGES.md` (section 7) |
| Applications SD | Incluses dans les versions qui l'indiquent dans `releases.json` |
| Bootloader A/B | Sélecteur de slot (section 5.1) |

### 5.1 Bootloader A/B

Selon `third_party/icom-custom-firmware/docs/index.html` et son `README.md`, le firmware garde deux slots (A et B), comme l'outil de mise à jour d'Icom les alterne déjà. Le bootloader personnalisé détecte un slot structurellement endommagé et bascule automatiquement sur l'autre. Combinaisons pour changer de slot :

| Radio | Combinaison |
|---|---|
| IC-9700 | Maintenir POWER en branchant l'alimentation DC, environ 5 s |
| IC-705 | Maintenir POWER à l'allumage jusqu'au clignotement de la LED, environ 3 s |

Le bootloader n'existe qu'en un seul exemplaire et l'outil de mise à jour SD l'écrit une fois, au début de la mise à jour. **Si l'alimentation est coupée à ce moment, un programmateur de flash peut être nécessaire pour récupérer** (par exemple CH341A). Utilise une alimentation fiable.

## 6. Commandes CI-V non documentées

Selon `third_party/icom-byof/UNDOCUMENTED_CIV.md`. Adresses par défaut : IC-705 `0xA4`, IC-9700 `0xA2`, IC-905 `0xAC` ; contrôleur `0xE0`. Les lectures sont sûres ; les écritures et actions peuvent effacer les réglages ou dérégler la radio.

| Commande | Effet | Protection |
|---|---|---|
| `1A D0` | Réinitialisation d'usine, efface tous les réglages | Sans mot de passe |
| `1A E1` | Seconde variante de réinitialisation | Un octet de données doit valoir 0 |
| `1A E0` | Entre dans le mode d'alignement d'usine | Mot de passe du modèle |
| `1A D2` | Autotest DV | Mot de passe du modèle |
| `1A D7` | Réglage d'un sous-système secondaire | Mot de passe du modèle |
| `1A D5` | Lit le code de région | Lecture |
| `1A D6` | Lit une mesure de calibration | Lecture |
| `1A D8` | Lit un octet d'état, IC-705 seulement | Lecture |
| `1A D9` et `1A DA` | Lit la calibration micro-ondes, IC-905 seulement | Lecture |
| `1A E4` | Lit une valeur de service mineure | Lecture |
| `1A D1` et `1A D3` | Drapeau de mode test et diagnostic, IC-705 | Permission interne |
| `1A E2`, `1A E3`, `1A E5` | Sous-mode de service, cible et écriture de données | Écriture |
| `1A E7` | Option audio ou DSP, IC-705 et IC-905 | Écriture |

Mots de passe d'alignement (`E0`) : `SX-4075 Adjust` (IC-705), `SX-3913 Adjust` (IC-9700), `SX-4209 Adjust` (IC-905). Sous-commandes présentes par radio : IC-705 D0 à D3, D5 à D8 et E0 à E7 ; IC-9700 D0, D2, D5 à D7 et E0 à E7 ; IC-905 D0, D2, D5 à D7, D9, DA, E0 à E7 et E9.

Autres : IC-705 `0x24` et `0x28` ; IC-9700 `0x28 00` (rappel de bande), `0x1C 02`, `0x1C 03` et `0x0D` ; l'IC-905 utilise une fréquence BCD de 6 octets à partir de 1,389 GHz.

## 7. Tables de fréquences

Selon `third_party/icom-byof/FREQUENCY_RANGES.md`. La destination d'usine (matrice de diodes, copiée dans la configuration) choisit un plan de bande qui limite l'émission. Les bandes que tu peux utiliser dépendent de ta licence et de la réglementation.

### 7.1 IC-705 (5 plans, RX de 0,030 à 470 MHz)

| Plan | 160 m | 80 m | 40 m | 6 m | 4 m | 2 m | 70 cm |
|---|---|---|---|---|---|---|---|
| 0 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | non | 144-146 | 430-440 |
| 1 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | non | 144-148 | 430-450 |
| 2 | 1,810-2,000 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,000-70,500 | 144-146 | 430-440 |
| 3 | 1,810-1,850 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,150-70,250 | 144-146 | 430-440 |
| 4 | 1,800-1,825 | 3,500-3,540 | 7,000-7,100 | 50,0-54,0 | non | 144-147 | 430-440 |

L'IC-705 contient un jeu complet de calibration d'usine pour 70 MHz : la bande 4 m est verrouillée par région, pas absente du matériel (plans 2 et 3).

### 7.2 IC-9700 (9 plans, strictement tri-bande)

| Plan | 2 m | 70 cm | 23 cm |
|---|---|---|---|
| 0 | 144-146 | 430-440 | 1260-1300 |
| 1 et 7 | 144-148 | 430-450 | 1240-1300 |
| 2 et 4 | 144-146 | 430-440 | 1240-1300 |
| 3 | 144-146 | 430-434 et 435-438 | 1240-1245 et 1270-1298 |
| 5 | 144-146 | 430-432 | 1260-1265 |
| 6 | 144-146 | 430-440 | 1260-1300 |
| 8 | 144-147 | 430-440 | 1260-1270 |

Il n'y a pas de bandes cachées sur l'IC-9700 : les variantes ne changent que les limites de bande. Mécanisme : code de région, table de correspondance des plans, indice de plan et table de limites par plan qui autorise l'émission.

## 8. Outils de rétro-ingénierie

| Outil | Fonction |
|---|---|
| `icom_rza1_decode.py` | Décodeur de la famille RZ/A1 |
| `ic_rza1_repack.py` | Reconditionneur du conteneur |
| `ic705_decode.py` | Décodage complet de l'IC-705 avec sortie ELF |
| `ic705.py` | Décomposer, reconstruire et vérifier (utilise numpy) |
| `ic705_codec.py` | Diagnostic LZSS indépendant avec de nombreuses options |
| `extract_streams.py` | Analyseur du conteneur |
| `ghidra_scripts/ExportRecovered.java` | Exporte le C décompilé après import de l'ELF dans Ghidra |
| `test_ic705_codec.py`, `test_ic705_decode_real.py`, `test_repack.py` | Tests |

Les lignes de commande exactes sont dans `third_party/icom-byof/README.md`. Dans `third_party/icom-custom-firmware/`, le patcheur `icom_patch.py` reproduit une version hors ligne : on lui donne le `.dat` officiel et le JSON de `docs/patches/` et il vérifie le MD5 de sortie.

Pour ajouter une version : créer l'entrée dans `releases.json`, générer le patch et exécuter `tools/build_index.py`, qui écrit `docs/patches/index.json` et copie les patchs actifs. Il existe aussi un patch expérimental dans `third_party/icom-byof/patches/9700E150_trv16c.json`.

## 9. Comment Bricohams l'utilise

La page `icom.html` héberge le patcheur web, servi par le web et par le serveur de bureau (`server.cjs`). Le navigateur lit ton `.dat` officiel, applique le patch et ne propose le résultat que si le MD5 correspond. Règles de sécurité : utiliser uniquement son propre firmware officiel, vérifier le délai TX et la puissance sur une charge fictive avant de brancher un transverter, utiliser une alimentation fiable pendant la mise à jour et accepter que l'usage est à ses propres risques et peut annuler la garantie. Voir [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 10. Licence et attribution

Les deux dépôts sont MIT, de Dawid SQ6EMM. Dépôts : `https://github.com/sq6emm/icom-custom-firmware` et `https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware` ; forum : `https://mikrofale.cafe/showthread.php?tid=1296`. Ils sont intégrés sans modification sous `third_party/` et cités dans les fichiers ACKNOWLEDGEMENTS.

## 11. Propositions d'amélioration

Idées fondées sur la documentation ; ce sont des propositions et rien n'est implémenté :

- Vérifier `main_md5` dans le navigateur avant d'appliquer le patch, pour donner une erreur plus claire.
- Détecter le slot actif de l'IC-9700 en lisant le marqueur `0xff0000` d'un dump de flash.
- Ajouter au rapport des patchs une comparaison automatique des régions avec la carte de la flash quand le document le permet.
- Documenter la plage de calibration 4 m de l'IC-705 comme référence, sans activer l'émission.
