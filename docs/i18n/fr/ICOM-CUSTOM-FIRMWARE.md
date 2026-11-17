# Firmware personnalisé Icom IC-705 et IC-9700 (transverters)

La page Icom de cette application prépare le firmware personnalisé de Dawid SQ6EMM pour l'Icom IC-705 (E/J, v1.40) et l'IC-9700 (E, v1.50). Il est conçu pour les transverters micro-ondes. Ce n'est pas un produit Icom et il n'est pas affilié à Icom : c'est un projet de la communauté radioamateur sous licence MIT. Bricohams ne l'a testé sur AUCUNE radio.

Le firmware n'est distribué que sous forme de correctifs. Vous fournissez le fichier `.dat` officiel d'Icom, le navigateur applique le correctif sur votre ordinateur et vous obtenez un `.dat` à installer avec la procédure normale de mise à jour par carte SD. Rien n'est envoyé à un serveur et la radio n'est PAS programmée par USB ni par Web Serial.

## Ce que fait le firmware

- Transverters : 8 emplacements (`TRV1` à `TRV8`), avec la fréquence RF réelle à l'écran et en CI-V jusqu'à 122 GHz.
- Par transverter : puissance TX maximale, délai TX (jusqu'à 300 ms, tous modes) et, sur l'IC-9700, inhibition du PTT.
- IC-9700 : transverter actif indépendant pour MAIN et SUB, l'échange MAIN/SUB le conserve, et en mode SAT les réglages TX suivent le transverter SUB.
- Échelle du spectre et de la cascade de 10, 6, 3 ou 1 dB par division, avec le plancher de bruit ancré automatiquement.
- IC-705 : plages TX étendues et TX sur 4 m (70 MHz) dans la base E ; la variante J étend 1.6-54, 68-74.8, 118-174 et 400-470 MHz. Émettez uniquement là où votre licence le permet.
- Applications sur carte SD : MENU, SET, Apps.
- Bootloader A/B propre avec repli sur l'autre bloc de firmware.
- L'écran de démarrage indique que le firmware est de Dawid SQ6EMM ; le texte de version de la radio reste officiel.

## Fichiers pris en charge

Le navigateur calcule le MD5 du fichier choisi et le compare à cette liste (`docs/patches/index.json` du projet). Seuls les fichiers officiels non modifiés sont acceptés.

| Radio | Fichier officiel | MD5 d'entrée | Release | MD5 de sortie |
| --- | --- | --- | --- | --- |
| IC-9700 E 1.50 | `9700E150.dat` | `6f04fd2248ba39254ed01b30b52ce36a` | `20261113v3` | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 E 1.40 | `705E140.dat` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `20261113v1` | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 J 1.40 | `705J140.dat` | `b605171288db4a74e0992a8f2afcb1c3` | `20261113v1` | `d7a7f87b9b16f262b188fe3735b3682b` |

Le fichier de sortie garde le nom de la release, par exemple `9700E150_20261113v3.dat`. La page ne propose le téléchargement que si le MD5 du résultat correspond exactement à celui de la build testée par l'auteur.

## Fonctionnement du conteneur

Le fichier `.dat` d'Icom est un conteneur à plusieurs couches. Le correctif les défait, modifie l'image et les referme :

1. Transformation autokey : le contenu est obscurci avec une clé qui dépend des données elles-mêmes et se décode octet par octet.
2. Compression LZSS : l'image du firmware est compressée ; on la décompresse pour la corriger puis on la recompresse à la fin.
3. Sceau MD5 : le conteneur se termine par le MD5 de son contenu, recalculé après le correctif.
4. Bootstrap initial à l'adresse `0x10000`, où est installé le bootloader A/B propre.

Le correctif est un fichier JSON avec des opérations du type copier N octets depuis l'adresse X de l'image officielle, plus le nouveau code du projet. Comme il ne contient que des instructions et du code propre, il n'inclut aucun octet du firmware Icom : c'est pourquoi il lui faut votre fichier officiel. Avant de proposer le résultat, la page vérifie que le MD5 d'entrée et celui de sortie sont ceux attendus.

## Bootloader A/B

Le firmware conserve deux blocs (A et B). Si le nouveau ne démarre pas ou si vous voulez revenir au précédent, le bootloader permet de choisir l'autre bloc :

- IC-9700 : maintenez POWER enfoncé pendant que vous branchez l'alimentation DC, environ 5 s.
- IC-705 : maintenez POWER enfoncé à la mise sous tension jusqu'à ce que la LED clignote, environ 3 s.

Conservez toujours le fichier officiel : le réinstaller ramène la radio au firmware d'usine.

## Installation par carte SD

1. Téléchargez chez Icom le `.dat` officiel de votre radio et de votre version (voir le tableau) et ne le modifiez pas.
2. Sur la page Icom, choisissez ou glissez ce fichier, attendez la reconnaissance et appuyez sur le bouton de préparation du firmware.
3. Téléchargez le `.dat` obtenu lorsque la page confirme que le MD5 correspond.
4. Copiez le fichier sur la carte SD en suivant la procédure de mise à jour du firmware du manuel Icom de votre radio.
5. Mettez la radio à jour avec cette procédure et attendez la fin sans couper l'alimentation.
6. Vérifiez l'écran de démarrage et passez en revue le menu des transverters.

## Alternative hors navigateur

Le projet inclut un outil en ligne de commande qui fait la même chose sans navigateur : `third_party/icom-custom-firmware/icom_patch.py`. Il s'exécute avec Python 3, par exemple `python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat`, depuis le dossier du projet. Le résultat doit avoir le même MD5 de sortie que le tableau. Le test navigateur du projet se lance avec `npm run test:icom-upstream`.

## Ajouter une nouvelle release

Les releases sont déclarées dans `releases.json` du projet d'origine. Pour en publier une nouvelle, on génère le correctif JSON dans `patches/` et on régénère l'index avec `tools/build_index.py`, qui écrit `docs/patches/index.json`. Ensuite, copiez le correctif et l'index dans `third_party/icom-custom-firmware/docs/patches/` et ajoutez le nouveau correctif à la liste des fichiers autorisés de `server.cjs`. Cette copie intégrée ne se modifie pas à la main : elle se met à jour en important un nouveau commit du projet d'origine.

## Sécurité

- C'est un firmware non officiel : il peut rendre la radio inutilisable et peut annuler la garantie Icom.
- Émettez uniquement sur les fréquences et avec les puissances que votre licence autorise. L'IC-705 étend les plages TX et leur bon usage relève de votre responsabilité.
- Vérifiez le délai TX et la puissance de chaque emplacement de transverter avec une charge fictive avant de connecter un transverter ou une antenne.
- Seuls les fichiers officiels non modifiés sont acceptés et la sortie doit correspondre au MD5 testé.
- Conservez le fichier officiel et la carte SD pour revenir en arrière et ne coupez pas l'alimentation pendant la mise à jour.

## Licence et attribution

Basé sur icom-custom-firmware de Dawid SQ6EMM (licence MIT). Dépôt : [icom-custom-firmware](https://github.com/sq6emm/icom-custom-firmware). Page web du patcheur : [web patcher](https://sq6emm.github.io/icom-custom-firmware/). Fil du forum : [mikrofale.cafe](https://mikrofale.cafe/showthread.php?tid=1296). Le texte de la licence MIT se trouve dans `third_party/icom-custom-firmware/LICENSE` et est publié avec l'application.

## Où cela se trouve dans ce dépôt

- `icom.html` et `icom-ui.js` : la page et sa logique.
- `third_party/icom-custom-firmware/` : copie non modifiée du projet d'origine au commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`.
- `third_party/icom-byof/` : copie non modifiée de la documentation de rétro-ingénierie au commit `a91231f64e8afbe34353994786e8276a3b54f1a9`. Plus de détails dans [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) et [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md).
- `tests/icom.test.cjs` : tests de la page et des fichiers servis.

Bricohams n'a PAS testé ce firmware sur une radio réelle. Les tests automatiques ne vérifient que la page et les fichiers publiés ; la validation du correctif est celle de l'auteur d'origine.
