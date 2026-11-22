# TK-11 : ingénierie d'interopérabilité et chemin vers un firmware propre

Base de connaissances sur le Quansheng TK-11. Chaque donnée indique sa source ; ce qui n'est pas confirmé est marqué **UNVERIFIED**. Ce projet ne flashe pas de firmware sur le TK-11 et ce document ne change pas cela.

## Portée et règles

- Seules des sources publiques et l'implémentation de ce dépôt sont utilisées. Aucun binaire n'a été décompilé et aucun code de TK-11 Manager n'a été copié.
- Le code de CHIRP-to-TK11-csv est sous GPL-3.0 et est porté avec attribution dans `ACKNOWLEDGEMENTS.md`. Le driver de CHIRP est sous GPL-2.0-or-later.
- Pour TK-11 Manager, seul le comportement publié dans sa présentation est décrit. Sa licence n'est pas connue.
- Rien de ce qui est écrit ici n'a été testé sur une vraie radio, sauf ce que fait déjà `tk11-connector.js`.

## Sources

| Id | Source | Contenu |
|---|---|---|
| [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) | Article d'URZ sur TK-11 Manager | Fonctions et mesures de sécurité de l'outil |
| [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) | CHIRP-to-TK11-csv (GPL-3.0) | Format CSV d'importation du TK-11 |
| [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) | Driver tk11.py de CHIRP | Protocole CPS et carte mémoire |
| [F4](https://github.com/armel/tk11-teardown) | Teardown d'armel (Apache-2.0) | MCU, mémoire et manque de documentation |
| F5 | `tk11-connector.js` et `tk11-ui.js` de ce dépôt | Implémentation indépendante basée sur F3 |
| [F6](https://github.com/spm81/Multi-UVTools) | Multi-UVTools de spm81 (sans LICENSE) | Affirmations sur les décalages du TK-11 ; données uniquement, sans réutiliser de code ; source unique, **UNVERIFIED** ; il se base sur le module TK11 de CHIRP, donc il n'est pas indépendant de F3 pour les décalages partagés |
| [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf) | Datasheet AP8048B de MVSilicon | Broches, SWD, chiffrement du code en Flash SPI, mise à jour par SD/USB |
| [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) | Datasheet AP8048C de MVSilicon | Identique à F7 pour la variante C |
| [F9](https://github.com/rob-w/tk11-firmware-custom) | rob-w/tk11-firmware-custom (fork de F4) | Décrit comme une réimplémentation ouverte du firmware, mais ne contient qu'un README, une LICENSE, un PDF et un JPG ; ni code ni binaires ; dernier push 2025-04-29 |
| [F10](https://github.com/qshosfw/hermes) | README de qshosfw/hermes (GPL-3.0) | Source secondaire qui qualifie le TK-11 de radio avec un Beken BK4819 |
| [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) | Photo du teardown, vue A verso du PCB V2.0 | Observation visuelle de l'auteur de ce document |

## Matériel

| Élément | Donnée | Source |
|---|---|---|
| MCU | AP8048 de MVSilicon, basé sur Arm Cortex-M3 | [F4](https://github.com/armel/tk11-teardown) |
| Flash interne | 2 Mo | [F4](https://github.com/armel/tk11-teardown) |
| SRAM interne | 128 Ko | [F4](https://github.com/armel/tk11-teardown) |
| EEPROM ou Flash SPI externe | Aucune identifiée sur le PCB | [F4](https://github.com/armel/tk11-teardown) |
| Données persistantes | Bootloader, firmware, calibration, réglages et 999 canaux seraient dans la Flash interne ; c'est une déduction de l'auteur du teardown, **UNVERIFIED** | [F4](https://github.com/armel/tk11-teardown) |
| Datasheet | Il n'existe pas de datasheet public complet ; les détails ne sont donnés que sous NDA | [F4](https://github.com/armel/tk11-teardown) |
| SDK et outils | Il n'y a pas de SDK ni de toolchain public pour l'AP8048 selon F4. Recherches sur GitHub (2026-11-09) de `AP8048` et `tk11 firmware` : 0 dépôt ; aucune source de firmware, fichier de mise à jour, protocole de mise à jour ni combinaison de touches du bootloader n'a été trouvé sur github.com, urez.org ni spm81.github.io. Il existe un SDK de MVSilicon pour une puce sœur, leadercxn/bp1048_sdk_v0.1.12 (non examiné ; licence inconnue). F9 n'apporte aucun code | [F4](https://github.com/armel/tk11-teardown), [F9](https://github.com/rob-w/tk11-firmware-custom) |
| Variante du MCU | Il existe des datasheets des AP8048A, B et C dans F4. Celle que porte le TK-11 est **UNVERIFIED** : le marquage de la photo n'est pas lisible | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Port SWD | Les datasheets des B et C (LQFP48 7x7 mm) listent « Serial wire debug (SWD) interface » : GPIO_C[13] = SWCLK, GPIO_C[14] = SWDIO, sur les broches 2 (SWCLK) et 3 (SWDIO) en B et C. Masse DVSS : broche 38 (B), broche 39 (C) ; IOVDD 3,3 V : broche 40 (B). Contradiction : le README de F4 dit que la puce n'a pas d'interface externe de programmation ou de débogage. Savoir si SWD est actif ou verrouillé sur le TK-11 est **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf), [F4](https://github.com/armel/tk11-teardown) |
| Reset | Aucune des deux tables de broches ne liste de broche NRST ; broche POWER_KEY : 17 en B et C | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Interface Flash SPI et chiffrement du code | Broches GPIO_A[13..18] = FSH_HOLD, FSH_SCK, FSH_SI, FSH_WP, FSH_SO, FSH_CS = broches 21 à 26 dans les deux variantes. La liste des caractéristiques inclut « Code encryption mechanism in SPI-flash ». Que la « Flash interne de 2 Mo » soit une Flash SPI dans le boîtier utilisant ces broches est une **déduction** des datasheets, **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Canal de mise à jour selon le datasheet | « Firmware updatable through SD/USB drive » (B et C) ; celui de l'AP8048A parle d'un démarrage depuis la Flash SPI et d'une mise à jour par disque SD ou USB. On ne sait pas si le TK-11 l'utilise : **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Cœur et mémoire selon le datasheet | Cortex-M3 à 96 MHz et 128 Ko de SRAM | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Puce RF | F4 inclut des datasheets du BK4819 et du BK4829 (Beken). Observation de la photo : deux puces QFN avec logo Beken dans des zones blindées, cohérent avec BK4819/BK4829 ; les références exactes sont **UNVERIFIED**. F10 qualifie le TK-11 de radio Beken BK4819 (source secondaire) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg), [F10](https://github.com/qshosfw/hermes) |
| Récepteur FM | F4 inclut le datasheet du RDA5807M ; la photo montre une puce SOP marquée « 5807M » (observation) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Empreinte SOP-8 non montée | Observation de la photo : une empreinte SOP-8 vide à côté du MCU ; sa fonction est **UNVERIFIED** (c'est souvent une Flash SPI ou une EEPROM optionnelle) | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Pads de test | Observation de la photo : on ne voit pas de pads SWD étiquetés à cette résolution | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Liaison du CPS | Série à 38400 bauds avec DTR actif | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Écran et audio | Non identifiés dans ce document : **UNVERIFIED** | F5 |

## Protocole CPS

### Trame

Chaque message comporte un en-tête, une charge utile, un CRC et une terminaison. La charge utile et le CRC sont masqués par un XOR cyclique de 16 octets et le CRC est calculé sur la charge utile en clair ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

```text
AB CD LL LL [carga util][CRC16-XMODEM LE]  DC BA
LL LL = longitud de la carga util (u16 LE)
clave XOR = 16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80
```

La valeur « magic » de 32 bits est générée au hasard par le CPS officiel ; avec une valeur fixe (5) la radio répond de la même façon, mais elle doit être la même pendant toute la session ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

### Table des commandes

| Id | Nom | Charge utile | Source |
|---|---|---|---|
| `0x01F4` | Demande de connexion | Type u16, longueur 4, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01F5` | Réponse de connexion | Chaîne de firmware dans les octets 4 à 19 ; l'analyse vient de F5, **UNVERIFIED** par rapport au CPS officiel | F5 |
| `0x01FB` | Lecture mémoire | Type u16, longueur 12, adresse u32 (`0x080000` plus le décalage), taille u16, 2 octets à zéro, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FC` | Réponse de lecture | 12 octets d'en-tête et les données ; maximum `0x200` par bloc | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FD` | Écriture mémoire | Le même en-tête de 16 octets et les données ; maximum `0x200` par bloc | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FE` | Réponse d'écriture | Trame de 16 octets au total ; le succès est vérifié par le code | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x05DD` | Redémarrage | Seulement type et longueur ; le driver le définit et son usage réel dans le CPS officiel est **UNVERIFIED** | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Autres | Toute commande de mise à jour, de calibration ou de bootloader | Non documentées : **UNVERIFIED** | F5 |

La limite mémoire du driver est `0x23000` (140 Kio) à partir de la base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)). On ne sait pas si `0x080000` est une adresse réelle de la Flash ou une adresse logique du CPS : **UNVERIFIED**.

## Carte mémoire

Les décalages sont relatifs à la base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Décalage | Taille | Contenu | Source |
|---|---|---|---|
| `0x00000` | 999 × 64 o (`0xF9C0`) | Canaux | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x0F9C0` à `0x10FFF` | `0x1640` | Non documenté ; peut contenir de la calibration, **UNVERIFIED** | F5 |
| `0x11000` | 1011 o | Indicateur d'utilisation par canal (`0xFF` signifie vide) ; les 12 derniers ne sont pas identifiés | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x12000` | `0x48` | Radio FM : VFO, identifiant de canal, indicateur de mémoire et 32 fréquences | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x13000` | `0xF8` | Réglages généraux | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x14000` | `0x70` | Réglages généraux 2 : codes d'effacement et de réactivation, nom de l'appareil | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x15000` | `0x10` | Sélection actuelle : 8 valeurs u16 pour A, B, fréquence, canal et NOAA | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x16000` | 32 × `0x80` | Listes de balayage ; elles se terminent exactement à `0x17000` | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x17000` | 4 o | Mot de passe de mise sous tension à 6 chiffres, u32 little endian, selon Multi-UVTools ; **UNVERIFIED**, trou de CHIRP | [F6](https://github.com/spm81/Multi-UVTools) |
| `0x1A000` | 16 × 24 o | Contacts DTMF : nom de 16 o et code de 8 o | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x1A800` | 16 × 24 o | Contacts 5 tons : comme DTMF | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22000` | 16 × 40 o | Adresses de décodage NOAA SAME : 8 o d'adresse et 32 o de texte | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22280` | 128 o | Contrôle des événements NOAA SAME | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x23000` | Fin | Limite mémoire du CPS | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Reste | Trous entre les structures | Non documenté ; toujours conservés | F5 |
| `0x0D6008` | 1024 o | Logo de démarrage 128x64 monochrome selon Multi-UVTools (relatif à la base `0x080000`, comme le reste) ; en dehors de la fenêtre de `0x23000` du CPS ; **UNVERIFIED** | [F6](https://github.com/spm81/Multi-UVTools) |

### Calibration : résolution du chevauchement

Multi-UVTools ([F6](https://github.com/spm81/Multi-UVTools), source unique, **UNVERIFIED**) affirme que la calibration du TK-11 occupe `0x010000`-`0x021000` (68 Ko) et que son nettoyeur d'EEPROM conserve `0x010000`-`0x015010` et `0x020000`-`0x021000`. Son code dit se baser sur le module TK11 de CHIRP, donc il n'est pas indépendant de F3 pour les décalages partagés. La plage `0x11000`-`0x1A980` entre en conflit avec des structures de CHIRP (utilisation, FM, réglages, listes, contacts), donc elle ne peut pas être entièrement de la calibration. Les parties qui tombent dans des trous de CHIRP sont `0x10000`-`0x10FFF` et `0x20000`-`0x20FFF` : candidates, **UNVERIFIED**. `tk11-connector.js` n'écrit jamais aucune de ces zones (la liste `UNVERIFIED_REGIONS` ne sert qu'à les nommer lors de la comparaison de sauvegardes) ni le logo.

Le VFO principal (A-F01 à A-F11 et B-F01 à B-F11 dans les menus de CHIRP) n'a pas de structure propre dans le driver : l'endroit où sont stockées les fréquences de VFO est **UNVERIFIED**. Le seul VFO documenté est celui de la radio FM. Les « zones » n'apparaissent dans aucune source : ce qui s'en rapproche le plus, ce sont les 32 listes de balayage, chacune avec un nom de 16 o, deux priorités u16 et 48 canaux u16 ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)) ; savoir si le TK-11 a des zones comme le DMR est **UNVERIFIED**.

### Enregistrement de canal (64 octets)

Les fréquences sont stockées en unités de 10 Hz et les tons CTCSS en dixièmes de hertz ; les codes DCS sont stockés comme le nombre octal lu en décimal ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Octet | Champ | Notes |
|---|---|---|
| 0 | `rx_freq` | u32 |
| 4 | `freq_diff` | u32, décalage |
| 8 | `tx_non_standard_1` | Non documenté |
| 9 | `tx_non_standard_2` | Non documenté |
| 10 | `rx_qt_type` | 0 aucun, 1 CTCSS, 2 DCS normal, 3 DCS inversé |
| 11 | `tx_qt_type` | Comme le précédent |
| 12 | `freq_dir` | 0 simplex, 1 plus, 2 moins |
| 13 | `band` | Le quartet bas à 1 signifie bande étroite (selon F5) |
| 14 | `step` | Pas |
| 15 | `encrypt` | 0 à 10 |
| 16 | `power` | 0 bas, 1 moyen, 2 haut |
| 17 | `busy` | Blocage par canal occupé |
| 18 | `reverse` | Inversion des fréquences |
| 19 | `dtmf_decode_flag` | Décodage de signalisation |
| 20 | `ptt_id` | 0 à 3 |
| 21 | `mode` | 0 FM, 1 AM, 2 LSB, 3 USB, 4 CW |
| 22 | `scan_list` | `0xFF` aucune |
| 23 | `sq` | 0 à 8 |
| 24 | `name` | 16 octets ASCII |
| 40 | `rx_qt` | u32 |
| 44 | `tx_qt` | u32 |
| 48 | `unknown` | 8 octets non documentés |
| 56 | `tx_qt2` | u32 non documenté |
| 60 | `signal` | 0 DTMF, 1 5 tons |
| 61 | `unknown_2` | 3 octets non documentés |

### Réglages généraux (`0x13000`)

| Octets | Champs | Source |
|---|---|---|
| 0 à 16 | Canal A/B, squelch NOAA, TOT, balayage NOAA, verrouillage du clavier, VOX, microphone, mode de fréquence, affichage, AGC, économie d'énergie, double écoute, rétroéclairage, canal d'appel (u16), bip | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 17 à 27 | Quatre actions des touches latérales, mode de balayage, verrouillage automatique, écran de démarrage, alarme, tonalité de fin d'émission, queue de répéteur, tonalité de queue | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 28 à 40 | Réduction de bruit, transposition, volumes A et B, tonalité des touches, langue, NOAA SAME, barre de signal | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 41 à 55 | Luminosité, code d'effacement, tonalité latérale DTMF, réponse DTMF, recherche de ton, tonalité CW (u16) | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 56 à 127 | Bloc DTMF : séparateur, groupe, temporisations, identifiant de 8 o et codes de montée et de descente | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 128 à 215 | Bloc 5 tons : comme DTMF plus protocole et 15 fréquences utilisateur | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 216 à 247 | Deux lignes de 16 caractères du texte d'accueil | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |

## Format CSV du TK-11

Le CSV qu'importe TK-11 Manager et que génère le convertisseur de nikantgr a un en-tête fixe. Que TK-11 Manager l'importe tel quel est **UNVERIFIED** de ma part : [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) dit seulement qu'il exporte et importe du CSV, et [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) le décrit comme le format du logiciel de Quansheng.

```text
No.,Name,RX Freq[MHZ],TX Freq[MHZ],QT Encode Type,QT Encode1,QT Decode Type,QT Decode,MSW,Band,Powrer,Busy Lock,ScanList,Demode,Freq Reverse,SQ,Encrypt,Signaling Decode,PTTID,Signal
1,PMR01,446.00625,0.15300,Null,Null,Null,Null,2K,12.5K,Low,OFF,1,FM,OFF,3,OFF,OFF,OFF,DTMF
2,,,,,,,,,,,,,,,,,,,
```

### Colonnes

L'en-tête écrit « Powrer » avec cette faute et elle est conservée telle quelle. Les valeurs par défaut sont celles que fixe le convertisseur.

| Colonne | Valeurs observées | Notes | Source |
|---|---|---|---|
| `No.` | 1, 2, 3, … | Séquentiel depuis 1 ; les trous sont des lignes vides | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Name` | Texte | Maximum 12 caractères selon l'auteur (« i think »), **UNVERIFIED** ; la mémoire en admet 16 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `RX Freq[MHZ]` | 446.00625 | MHz avec 5 décimales | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `TX Freq[MHZ]` | 145.07500 | Fréquence absolue ; `0.15300` signifie pas d'émission | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode Type` | Null, Ctcss, NDCS, IDCS | NDCS est le DCS normal et IDCS l'inversé | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode1` | Null, 77.0, 023 | Ton CTCSS ou code DCS | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode Type` | Null, Ctcss, NDCS, IDCS | Comme l'encodage | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode` | Null, 77.0, 023 | Comme l'encodage | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `MSW` | 2K | Signification **UNVERIFIED** ; CHIRP liste 2K à 5K | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Band` | 12.5K, 25K | Largeur de bande : étroite ou large | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Powrer` | Low, Middle, High | Puissance | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Busy Lock` | ON, OFF | Blocage par canal occupé | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `ScanList` | 1 | Le convertisseur écrit toujours 1 ; la numérotation 1 à 32 et la valeur sans liste sont **UNVERIFIED** | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Demode` | FM, AM, LSB, USB, CW | Modulation | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Freq Reverse` | ON, OFF | Inversion des fréquences | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `SQ` | 3 | Squelch de 0 à 8 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Encrypt` | OFF | Chiffrement ; le convertisseur n'écrit que OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signaling Decode` | OFF | Le convertisseur n'écrit que OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `PTTID` | OFF | Autres valeurs **UNVERIFIED** ; on utilise celles de CHIRP | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signal` | DTMF, 5TONE | Type de signalisation | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |

### Conversion depuis CHIRP

Le convertisseur ([F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py)) fait ce qui suit et est porté dans `tk11-connector.js` :

- Renumérote depuis 1 entre la mémoire la plus basse et la plus haute, et laisse des lignes vides dans les trous.
- Calcule la fréquence TX avec le duplex : moins et plus soustraient et ajoutent le décalage, split prend le décalage comme TX, off écrit `0.15300` et le reste copie la RX.
- Convertit Tone en CTCSS d'encodage, TSQL en CTCSS des deux côtés, DTCS et DTCS-R selon la polarité (N normale, R inversée) et Cross selon le mode croisé.
- NFM donne une bande de 12.5K et tout autre mode 25K ; la démodulation n'admet que FM, AM, LSB, USB et CW.
- Publie des variantes avec guillemets, avec virgule décimale et avec le séparateur de la configuration régionale. Ici, les deux premières sont portées et la troisième non.
- Changements de ce dépôt : la puissance est prise de CHIRP (Low et High ; le reste est Middle).

Les fonctions publiques de `R.TK11` sont `channelsToTk11Csv`, `channelsFromCsv` (détecte TK-11 ou CHIRP d'après l'en-tête) et `chirpCsvToTk11Csv`. L'importation ne fait que remplir le tableau de la page ; la radio ne change pas tant qu'on n'appuie pas sur le bouton d'écriture des canaux, qui exige d'abord une sauvegarde vérifiée. Les lignes invalides sont ignorées avec leur motif.

## Ce qu'expose TK-11 Manager

Tout ce qui suit provient de [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) ; l'outil n'a pas été exécuté ni analysé.

| Capacité | Détail publié | Comparaison avec CHIRP |
|---|---|---|
| Exécution | Dans le navigateur, sans Internet ni envoi de données | Même protocole ; CHIRP est une application de bureau |
| Protocole | Basé sur le driver TK11 de CHIRP, selon l'article | Même carte mémoire |
| Canaux | Gestion complète des 999 | Identique |
| Réglages | Généraux, touches et fonctions rapides | Identique |
| Listes de balayage | Oui | Identique ; les zones ne sont pas mentionnées |
| DTMF et 5 tons | Contacts et signaux | Identique |
| Radio FM | Oui | Identique |
| Sauvegardes | Automatique à chaque lecture ; restauration | Non automatique dans CHIRP |
| Sécurité | Vérifie le firmware avant de modifier, n'écrit que les blocs modifiés et vérifie octet par octet | Amélioration de méthode, pas de format |
| Outils avancés | Visionneuse de mémoire | Pas de visionneuse dans CHIRP |
| Données | Exporte et importe du CSV et ouvre des images de CHIRP | Identique pour le CSV |
| Mise à jour du firmware | Non mentionnée | Aucun outil public ne la propose |
| Interface | Talkie-walkie virtuel et sept thèmes plus un personnalisable | Sans équivalent |

Conclusion : l'article ne révèle aucune région de mémoire, aucun réglage ni aucune commande qui ne soit pas dans le driver de CHIRP. Ce que signifie « vérifier le firmware » et comment il le fait est **UNVERIFIED**.

## Chemin vers un firmware fonctionnel

### Étapes

Toutes les étapes sont **UNVERIFIED** tant qu'elles ne sont pas réalisées avec une radio de test. Aucune n'est implémentée dans cette application.

1. **Accès SWD et protection en lecture.** Selon les datasheets des AP8048B et AP8048C ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)), SWCLK est la broche 2 et SWDIO la broche 3 du LQFP48 ; masse sur la broche 38 (B) ou 39 (C) et IOVDD de 3,3 V sur la broche 40 (B). Il n'y a pas de broche NRST. Connecter une sonde (ST-Link, J-Link ou CMSIS-DAP) avec OpenOCD et lire uniquement l'IDCODE et la liste des AP (voir « Procédure matérielle »). Ne jamais exécuter de déverrouillage ni d'effacement total : sur beaucoup de MCU cela détruit la Flash.
2. **Dump complet de la Flash.** Si le débogage est ouvert, lire les 2 Mo avec la sonde, deux fois, et comparer les SHA-256. Conserver le dump comme sauvegarde privée et ne pas le redistribuer. Ensuite, y chercher un enregistrement de canal connu pour savoir si `0x080000` est une adresse réelle.
3. **Identifier le bootloader.** Examiner dans le dump la table des vecteurs, la taille et l'adresse du chargeur, et s'il vérifie une signature ou un CRC.
4. **Capturer le protocole de mise à jour.** Avec l'outil de mise à jour officiel et un analyseur USB (USBPcap avec Wireshark, ou un analyseur matériel), capturer une mise à jour complète d'une radio de test : comment elle entre en mode chargeur, si elle réutilise la trame AB CD, le XOR et le CRC, et le format du fichier (en-tête, chiffrement, signature). Il faut comparer deux versions. Il ne faut renvoyer aucune écriture capturée à une radio.
5. **Toolchain et SDK de l'AP8048.** Un compilateur `arm-none-eabi-gcc` pour Cortex-M3 convient pour le cœur, mais les périphériques (horloge, GPIO, LCD, clavier, audio, RF) ne sont que dans le SDK de MVSilicon ou dans une documentation sous NDA ([F4](https://github.com/armel/tk11-teardown)). S'il n'y a pas de SDK, il faudra déduire les registres à partir de la carte.
6. **Test minimal de clignotement et de LCD.** Charger un petit programme dans la SRAM de 128 Ko avec le débogueur et l'exécuter sans écrire dans la Flash, pour allumer le rétroéclairage ou la lampe torche puis dessiner sur le LCD. Ainsi, rien de permanent n'est touché.
7. **Portage.** Seulement une fois l'étape 6 résolue : écrire les contrôleurs d'écran, de clavier, d'audio et de RF, conserver le bootloader et garder la même carte mémoire et le même protocole CPS pour que CHIRP et TK-11 Manager continuent de fonctionner. Le firmware K5 de F4HWN ne peut pas être porté tel quel : il a un autre MCU (Cortex-M0), une autre carte mémoire et une EEPROM externe ([F4](https://github.com/armel/tk11-teardown)).

### Verdict de faisabilité

Un firmware propre complet n'est pas faisable aujourd'hui. Il y a trois blocages durs : l'AP8048 n'a pas de SDK public ([F4](https://github.com/armel/tk11-teardown)), il n'existe pas de protocole de mise à jour public et on ne sait pas si le débogage SWD est ouvert. Le datasheet du fabricant fait passer le blocage SWD de « inconnu » à « documenté par le fabricant, état sur le TK-11 non vérifié » ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)). Un nouveau blocage apparaît : le chiffrement du code dans la Flash SPI que mentionnent ces datasheets. Ce qui est réaliste est un objectif de démarrage (clignotement et LCD depuis la SRAM) avec une radio sacrifiable, et seulement si l'étape 1 se passe bien. Un firmware complet avec RF, audio et menus serait un projet de plusieurs mois avec rétro-ingénierie matérielle, et même ainsi sans garantie que la puce le permette.

## Procédure matérielle (radio de test)

Tout est **UNVERIFIED** tant que ce n'est pas fait. Uniquement avec une radio de test, jamais avec la radio d'usage quotidien.

1. Identifier la variante (A, B ou C) par le marquage de la puce avec une loupe.
2. Localiser par continuité les broches 2 (SWCLK), 3 (SWDIO), la masse et le 3,3 V depuis le LQFP48 (point de la broche 1) jusqu'à des pads de test ou des vias. Préférer un via plutôt que de souder sur la broche.
3. Préparer une sonde CMSIS-DAP, ST-Link ou J-Link avec la radio alimentée par sa propre batterie, VTref à 3,3 V et une vitesse de 100 kHz.
4. Session OpenOCD en lecture seule, qui ne lit que l'IDCODE du DP et la liste des AP :

```text
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -c "adapter speed 100" -c "swd newdap ap8048 cpu -enable" -c "dap create ap8048.dap -chain-position ap8048.cpu" -c "init" -c "dap info" -c "shutdown"
```

5. Comme il n'y a pas de NRST, se connecter avec la radio en marche (sans « connect under reset »).
6. Seulement si l'AP répond : créer une cible cortex_m, exécuter `mdw 0x00000000 8` pour voir la table des vecteurs et faire `dump_image` de la région de code deux fois, en comparant les SHA-256.
7. Chercher dans le dump un enregistrement de canal connu pour relier le décalage 0 du CPS à une adresse de Flash.
8. Interdit : toute commande d'effacement, de déverrouillage, d'écriture en Flash, d'octets d'option ou d'effacement total. La radio est placée sur une charge fictive et n'émet jamais.
9. Capture USB, seulement si un outil de mise à jour officiel et son fichier apparaissent : USBPcap et Wireshark sur le câble du CPS, comparer deux versions et ne jamais renvoyer d'écritures capturées.
10. Facultatif : analyseur logique sur les broches 21 à 26 (FSH) pendant le démarrage pour voir si les lectures de Flash y passent ; selon le datasheet, les données devraient être chiffrées.

## Ce que l'on peut faire sans radio sacrifiable

- (a) Sauvegardes en lecture seule avec le CPS plus l'outil « Comparer deux sauvegardes » de ce panneau : changer une option de menu sur la radio, faire une nouvelle sauvegarde et les comparer permet de cartographier des champs inconnus et de confirmer ou rejeter les décalages de Multi-UVTools (pour `0x17000` : définir un mot de passe de mise sous tension, faire la sauvegarde et comparer). Cela nécessite un TK-11, mais n'écrit jamais.
- (b) Sonde SWD en lecture seule de l'IDCODE (oblige à ouvrir la radio ; affecte la garantie).
- (c) Recherche documentaire sur les datasheets.

Tout le reste nécessite une radio sacrifiable.

### Risques

| Risque | Effet | Atténuation |
|---|---|---|
| Effacement de la Flash lors du déverrouillage du débogage | Perte du bootloader, de la calibration et des canaux | Ne jamais déverrouiller ; faire un dump avant, avec le débogage ouvert |
| Calibration en dehors de la sauvegarde du CPS | Radio hors spécifications après un échec | Le CPS ne l'expose pas (la carte va jusqu'à `0x23000`) ; le dump complet est nécessaire |
| Écrasement du bootloader | Radio inutilisable sans sonde | Flasher uniquement la région d'application et conserver le dump |
| Captures de mise à jour renvoyées | Une version incompatible bloque la radio | Ne pas renvoyer d'écritures capturées |
| Droits d'auteur et NDA | Problèmes juridiques en publiant des dumps ou des datasheets | Ne pas redistribuer de dumps ni de documents sous NDA ; consulter la loi locale sur la rétro-ingénierie |
| Conformité radioélectrique | Un firmware propre peut émettre hors bande ou sans homologation | Respecter les limites des bandes et la réglementation locale |
| Fausse sécurité des tests | Les tests de ce dépôt ne couvrent que le CPS simulé | Toujours tester sur une radio de test |

## Journal des modifications

### 2026-11-09

Ce qui a été appris :

- Le driver de CHIRP est sous GPL-2.0-or-later, et non GPL-3.0-or-later ; dernier commit du fichier 2026-03-19 ([F3](https://raw.githubusercontent.com/kk7ds/chirp/master/chirp/drivers/tk11.py)).
- Les listes de balayage de CHIRP se terminent exactement à `0x17000` (32 × `0x80` depuis `0x16000`).
- Multi-UVTools n'a pas de LICENSE et ses affirmations sur le TK-11 sont de source unique et non indépendantes de CHIRP ([F6](https://github.com/spm81/Multi-UVTools)).
- rob-w/tk11-firmware-custom ne contient ni code ni binaires ([F9](https://github.com/rob-w/tk11-firmware-custom)).
- armel/tk11-teardown inclut des datasheets des AP8048A/B/C, BK4819, BK4829 et RDA5807M ([F4](https://github.com/armel/tk11-teardown/tree/main/datasheet)).
- Les datasheets des AP8048B et AP8048C listent SWD (broches 2 et 3), le chiffrement du code en Flash SPI et la mise à jour par SD/USB, et ne listent pas NRST ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)).
- Observations de la photo : MCU mVsilicon AP8048 LQFP48, deux QFN Beken, un SOP « 5807M » et une empreinte SOP-8 vide ([F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg)).
- F10 qualifie le TK-11 de radio Beken BK4819 (source secondaire) ([F10](https://github.com/qshosfw/hermes)).
- Recherches sur GitHub de `AP8048` et `tk11 firmware` : 0 dépôt ; aucune source de firmware, fichier ou protocole de mise à jour publics.
- urez.org ne contient que l'article sur TK-11 Manager et ne dit rien du firmware ([F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/)).

Changements dans le code :

- Licence de CHIRP corrigée en GPL-2.0-or-later dans `tk11-connector.js`.
- Nouvelle liste `UNVERIFIED_REGIONS` (jamais inscriptible) et fonctions `describeOffset` et `diffImages` dans `R.TK11`.
- Bouton « Comparer deux sauvegardes » dans le panneau TK-11 : lecture seule, ne touche pas à la radio.
