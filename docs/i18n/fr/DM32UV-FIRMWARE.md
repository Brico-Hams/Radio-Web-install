# Baofeng DM-32UV : firmware ouvert, OpenGD77 et méthode de compilation

Révision : 26-10-2026. Résultat de la recherche du code source et de la méthode de compilation du firmware du DM-32UV sur GitHub, Codeberg, GitLab, GitFlic, le site OpenGD77 et dans les groupes Telegram OpenGD77 EA, Baofeng DM-32UV EA, Baofeng DM-32UV RU et OpenGD77 Rus.
Aucun élément de ce guide n'a été testé sur une radio de Bricohams : chaque information indique sa source.

## Résumé

| Question | Réponse |
| --- | --- |
| Existe-t-il le code source du portage d'OpenGD77 vers le DM-32 (OpenDM32) ? | **Non.** Il n'est distribué qu'en binaire. Les groupes et le site OpenGD77 le confirment |
| Peut-on installer OpenGD77 sur le DM-32 ? | **Oui**, en version expérimentale : CPS officiel (type « DM32/UV008 ») ou [grid.radio](https://grid.radio/opengd77/). Les groupes indiquent qu'il n'existe pas de version stable |
| Existe-t-il un firmware ouvert que l'on peut compiler ? | **Oui : [RadioFoundry](https://github.com/RadioFoundry/RadioFoundry)** (MIT). FM et voix DMR dans les deux sens, CTCSS/DCS, APRS, GPS et hotspot testés en émission |
| Quelle est la licence actuelle d'OpenGD77 ? | De type BSD avec interdiction d'utilisation commerciale (pas GPL) depuis 2019. Seul l'ancien miroir [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) est sous GPL-2.0 |
| Codec AMBE ? | Propriétaire (DVSI). Aucun projet ouvert ne le distribue : il est extrait du firmware d'usine de l'utilisateur lui-même |

## Matériel

| Bloc | Composant |
| --- | --- |
| SoC | Hongruan HR_C7000 (Dahua DH4570) : cœur C-SKY CK803S à 168 MHz, SRAM de 288 KB, modem DMR/FM intégré, sans flash interne |
| Émetteur-récepteur RF | FD6818 (pas de fiche technique publique ; registres compatibles dans l'esprit avec BK4819/AT1846S) |
| Flash programme | Classe GD25Q80 / 25Q16 de 1 MB, exécution sur place en `0x03000000` |
| Flash données | GD25Q128 ou Puya PY25Q128HA, 16 MB : codeplug, calibrage, contacts |
| Écran | Couleur 240x320, contrôleur de la classe ST7789 sur bus i8080 de 8 bits |
| Autres | ALPU-MP (authentification par I2C), RDA5807M (FM commerciale), GPS ATGM336H, RTC avec pile |
| Programmation | Jack K1 à 2 broches avec câble USB-série à 115200 bauds. L'USB-C est sur la batterie et sert uniquement à la charge |

Plan de la flash programme :

| Plage | Contenu |
| --- | --- |
| `0x03000000-0x0300BFFF` | Bootloader Baofeng (mode de mise à jour PTT+SK1). Ne jamais y toucher |
| `0x0300C000-0x030E7FFF` | Application (880 KB dans RadioFoundry) |
| `0x030E8000-0x030FFFFF` | Emplacement du codec (RadioFoundry) |

Dans la flash de données, le codeplug d'usine et le **calibrage** se trouvent sous `0x700000` (la page de 4 KB dont le dernier octet vaut 2). Ne jamais écrire dans cette zone.

Détails complets, en grande partie mesurés sur une radio : [hardware-dm32.md de RadioFoundry](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/spec/hardware-dm32.md), avec horloge et PLL, périphériques, interruptions, brochage, registres du FD6818, chemins audio, format du calibrage et protocoles. Les fiches techniques du HR_C7000 (documents 1 et 2), une photo annotée de la carte et le schéma du chargeur sont disponibles sur [yo3hjv/Baofeng-DM32](https://github.com/yo3hjv/Baofeng-DM32) (sans licence : lien fourni uniquement).

## Familles de firmware d'usine

| Firmware | Famille | Remarque |
| --- | --- | --- |
| `DM32.01.*` | ROW, la plus courante | Base d'OpenDM32 et RadioFoundry (`DM32.01.01.049`) |
| `DM32.NRF.*` / Fanti | Taïwan, même branche que `01.*` | |
| `DM32.00.*` / `UV32.*` | HR-Vocoder | RadioFoundry accepte son codec (`DM32.00.01.046HRVocoder`) |

Le croisement des familles laisse la radio en soft-brick : récupération en mode mise à jour (PTT+SK1).
Fichier `BFUV32-V2` : en-tête de 256 octets (`BFUV32-V2` ... `END`), suivi de l'image brute liée en `0x0300C000`. Elle n'est ni chiffrée ni signée.

## Étape 0 : sauvegarde

Avant tout firmware, sauvegarder les **deux** mémoires flash. Elles contiennent le calibrage RX/TX et la clé ALPU, propres à chaque radio :

- `OpenUV008_Flasher_v1` d'andynvkz ([infotex58, sujet 1155](http://infotex58.ru/forum/index.php?topic=1155.0)) : radio éteinte, choisir Read, puis l'allumer lorsqu'on le demande. Répéter pour la flash programme et celle des données.
- Autre possibilité : les scripts Python de [rogerclarkmelbourne/DM32](https://github.com/rogerclarkmelbourne/DM32/tree/main/python).
- grid.radio propose aussi Backup/Restore des deux puces depuis le navigateur.
- Si un câble ne fonctionne pas, essayer une autre puce USB-série (CH340, FTDI ou CP2102). Selon RadioFoundry, la ROM du HR_C7000 ne répond qu'avec FTDI.

## Installer OpenGD77 (expérimental)

1. Effectuer l'étape 0 et conserver les fichiers dans un endroit sûr.
2. Installer la CPS OpenGD77 `E2026.05.26.01` ou une version ultérieure ([téléchargements expérimentaux](https://www.opengd77.com/downloads/PC_CPS/Experimental/)).
3. Dans Radio Type, choisir **DM32/UV008** et ouvrir Extras > Firmware loader.
4. Radio éteinte : maintenir **PTT + SK1** et l'allumer. La LED verte indique le mode mise à jour. Brancher le câble.
5. Choisir le firmware (référence : `OpenGD77_DM32_20260704.bin`) et attendre la fin.
6. Écrire le codeplug par défaut.
7. Pour revenir au firmware d'usine, recommencer avec le firmware Baofeng depuis sa CPS en mode mise à jour.

Autre possibilité sans rien installer : [grid.radio](https://grid.radio/opengd77/) avec Chrome ou Edge (Web Serial, sans Zadig). Source de la procédure : [guide de xreflector.es (PDF)](https://radio.xreflector.es/wp-content/uploads/2026/07/Install-OpenGD77-on-Baofeng-DM-32_EN.pdf).

État selon les groupes (août-octobre 2026) : aucune version stable, audio DMR faible et plusieurs dysfonctionnements. Ne couvre que la famille `01.*`. Auteurs : andynvkz (portage UV008), Koshak et RA4FHE (DM-32), Roger VK3KYY (CPS).

## Compiler le firmware : RadioFoundry

[RadioFoundry](https://github.com/RadioFoundry/RadioFoundry) est un nouveau firmware DMR ouvert (MIT, créé le 24-10-2026), doté d'un cœur commun et d'une couche par radio. Il ne dérive pas du code d'OpenGD77. Aucune release n'est encore publiée : il faut le compiler.

```text
git clone https://github.com/RadioFoundry/RadioFoundry
cd RadioFoundry
git submodule update --init
tools/build-csky-toolchain.sh            # GCC csky-elf en ~/toolchains/csky-elf (unos 45 min)
make BOARD=dm32                          # build/dm32/rfoundry_dm32.bin
tools/hrc7000_codec.py --stock DM32.01.01.049.bin   # tu firmware de fabrica: anade el codec en local
tools/serial_loader.py --model dm32 build/dm32/rfoundry_dm32_codec.bin --wrap build/dm32/rfoundry_dm32_codec_BFUV32.bin
```

| Étape | Détail |
| --- | --- |
| Toolchain | `tools/build-csky-toolchain.sh` ou l'image Docker `tools/docker/csky-toolchain/run.sh make BOARD=dm32` |
| Codec | `tools/hrc7000_codec.py` vérifie le firmware d'usine par SHA-256 et copie le codec sur votre machine. Il n'est jamais téléversé dans le dépôt ni partagé. Sans codec, seul le mode FM fonctionne |
| Flashage | `tools/serial_loader.py` utilise le protocole du bootloader Baofeng (YMODEM à 115200). `--wrap` crée le fichier `BFUV32-V2` pour l'outil de mise à jour officiel. `--stock ARCHIVO` restaure le firmware d'usine |
| Migration du codeplug | D'abord `tools/dm32_migrate.py all --image ... --dry-run`. Utilise `dmrconf` de qdmr 0.15 |
| Sécurité | RadioFoundry ne touche ni au bootloader ni à la flash des données sous `0x700000` |
| État | Selon sa propre documentation, les outils de flashage et de migration n'ont pas été testés sur une radio. Commencer par `--dry-run`, antenne connectée et sans émettre tant que le fonctionnement n'a pas été vérifié |

Liste de contrôle de démarrage : [dm32-bringup.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/testing/dm32-bringup.md).

## Protocole du bootloader Baofeng

Entrer dans le mode en maintenant PTT + SK1 à l'allumage (LED verte). Câble à 115200 8N1.

| Étape | Hôte | Radio |
| --- | --- | --- |
| 1 | `52` | `06` |
| 2 | `4D 00 00 00 01` | `4D 01 09` |
| 3 | `06` | `BFUV32-V2` |
| 4 | `45 00 00 00 00` | `06` |
| 5 | `31` | `43` |
| 6 | `01` | `43` |
| 7 | `00 FF` + bloc de 128 octets (nom, NUL, taille en ASCII) + CRC-16/XMODEM. Efface l'application (jusqu'à 15 s) | `06 43` |
| 8 | Pour chaque KB : `02`, numéro n, `FF-n`, 1024 octets, CRC | `06` |
| 9 | `04` | redémarrage |

Le bootloader est séparé et survit à un échec d'écriture : si l'image ne démarre pas, retirer la batterie et repasser en mode mise à jour.

## Autres ressources trouvées

| Ressource | Apport |
| --- | --- |
| [M7OCM/DM-32UV](https://github.com/M7OCM/DM-32UV) | Archive des CPS et firmwares officiels ; branche Mods avec firmwares d'usine corrigés (sans contrôle ALPU, bandes étendues, correction NMEA du GPS) et son script de modification |
| [Chicago-Offline/dm32-info](https://github.com/Chicago-Offline/dm32-info) | Spécifications, versions de firmware avec SHA-256 et cartographie communautaire |
| [gzalo/dm32-uv](https://github.com/gzalo/dm32-uv) (MIT) | Rétro-ingénierie du bootloader et de la ROM |
| [infamy/DM32-Protocol-Spec](https://github.com/infamy/DM32-Protocol-Spec) | Protocole de programmation de la CPS |
| [chaffed/CHiRP-DM32UV-Support](https://github.com/chaffed/CHiRP-DM32UV-Support), [fivelidz/dm32uv-linux](https://github.com/fivelidz/dm32uv-linux), [insideTheFlux/dm32uv-tools](https://github.com/insideTheFlux/dm32uv-tools) | Programmation du codeplug depuis CHIRP, Linux et les outils de cartographie |
| Drivers FD6818 ouverts | [bf-k61-firmware-aura](https://github.com/sophiel-meow/bf-k61-firmware-aura) (GPL-3.0, Rust) |
| [jasiek/baocoder](https://github.com/jasiek/baocoder) | Codec AMBE extrait du DM-32 : propriétaire, **ne pas utiliser** |
| [dongrat/HR_C70X0SDKlib](https://github.com/dongrat/HR_C70X0SDKlib) | Annoncé comme SDK du HR_C7000, mais vide le 26-10-2026 |
| GitFlic, GitLab, Codeberg | Rien sur le DM-32 ni le HR_C7000 |

## Licences et limites

- RadioFoundry est sous MIT ; l'OpenGD77 actuel interdit l'usage commercial ; OpenDM32 ne publie pas ses sources. Aucun code sous licences incompatibles n'est mélangé et aucun firmware tiers n'est redistribué.
- Le codec AMBE n'est utilisé qu'après extraction du firmware d'usine de la radio de l'utilisateur.
- Le calibrage et la clé ALPU sont propres à chaque radio : ne pas les copier d'une autre unité.
- Émettre uniquement sur les bandes autorisées, même si un firmware modifié le permet.

Bricohams conserve également un dossier technique et une ébauche de portage C-SKY dans le dépôt privé `dm32uv-opengd77-port`. La voie recommandée aujourd'hui est de compiler RadioFoundry.