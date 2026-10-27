# Pack Dim0s : inventaire et Karina V3/UV-K1

Révision : 25-10-2026. Dépôt fourni par l’utilisateur :
`Dim0s/quansheng-UV-K5v3-K1-firmware-pack`.
Commit inspecté : `52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c`.

## Différences par rapport à l’inspection précédente

Le pack Karina local initialement examiné était **V1**. Ce dépôt annonce des
firmwares pour **K5 V3, K1 et appareils dotés du bootloader 7.x** et contient
un autre pack Karina avec des binaires distincts K1/V3. Par conséquent :

- Il est inexact d’affirmer que Karina V1 est la seule version existante.
- Il reste correct de rejeter le binaire V1 du pack précédent pour V3.
- Il existe désormais des éléments sur des **binaires Karina PY32**, mais pas sur
leur compatibilité avec le multiboot Armel ni sur la disponibilité de leurs sources.
- Cette référence ne fait pas du pack la source officielle de chaque auteur.

L’en-tête du dépôt recommande de sauvegarder les étalonnages. Les informations
Karina indiquent qu’il n’y a pas de lien vers le dépôt source et décrivent le
firmware comme fermé, avec des republications de builds sur un canal externe.
Cela ne prouve pas une licence particulière : l’avis MIT mentionné par l’utilisateur
reste en attente d’une source et d’un titulaire vérifiables.

## Nature et limites de l’inventaire

L’arborescence Git complète, non tronquée, contient des binaires, des applications,
des documents, des pilotes Python et des archives. Aucun fichier source
`.c`/`.h`, Makefile ni LICENSE/COPYING/NOTICE n’a été trouvé sous ces noms
dans cette arborescence. Le contenu de toutes les archives ZIP/RAR du dépôt n’a
pas été inspecté. Pour Karina, le ZIP du 21-09-2026 a été inspecté, sans exécuter ses fichiers.

Le pack n’est pas copié dans le dépôt web et aucun EXE, APK, pilote ou
étalonnage n’est installé. Ses PDF, fichiers et firmwares ne sont pas redistribués.
Une empreinte SHA-256 calculée localement détecte les changements par rapport à ce
fichier téléchargé, mais ne certifie ni la paternité, ni la licence, ni la sécurité,
ni la correspondance avec les sources.

## Familles présentes

Les fonctions ci-dessous sont des **affirmations du collecteur** dans le README
inspecté, pas des prestations certifiées par Bricohams. Pour chaque build, il faut
consulter l’auteur et le manuel correspondants.

| Dossier/projet | Orientation décrite par le pack | État sur ce site |
| --- | --- | --- |
| BD1AHN | Variante à trois VFO | Référence documentaire ; protocole non validé |
| Calypso | Dossiers des versions 1.5.0 et 1.7.0 | Inventoriée ; aucune fonction n’est déduite |
| Delta | Mot de passe et protection des données selon le collecteur | Propriétés cryptographiques non certifiées |
| E25WOP | Fonctions CW et accessoires selon le collecteur | Ne pas connecter d’accessoires sur la base de la recette d’une autre carte |
| F4HWN | Releases et applications, y compris historiques | Préférer la source officielle Armel déjà intégrée |
| GOGU | Variante F4HWN avec messagerie et autres fonctions | Multiboot indiqué par le collecteur ; aucune validation locale |
| HAWK | Documentation et fichiers propres | Inventoriée ; aucune fonction n’est déduite |
| IJV | Versions avec fonctions gratuites/payantes selon le pack | Ne pas distribuer ni activer les fonctions payantes sans licence |
| IOTCU | Variante avec module Si4732 selon le pack | Nécessite le matériel/firmware correspondant ; ne pas supposer qu’une radio stock en est équipée |
| KA50 / KA52 / KA52M | Spectre ; KA52M avec variantes 2/3 VFO | Plusieurs VFO n’équivalent pas à plusieurs récepteurs RF simultanés |
| Karina | Spectre, capture et presets propres | Nouveaux binaires K1/V3 ; slots Armel non vérifiés |
| Matoz | Fichiers propres | Inventoriée ; aucune fonction n’est déduite |
| N7SIX | Spectre/fonctions CW selon le collecteur | Multiboot indiqué, non certifié |
| NR7Y | Fonctions CW selon le collecteur | Ne pas présumer la compatibilité électrique des accessoires |
| PrepperRadio | Messagerie par modes FSK selon le pack | Ne pas certifier le chiffrement, le réseau ni la compatibilité entre variantes |

Le README mentionne aussi Sonic par un lien externe et précise qu’il ne figure
pas dans le pack à ce moment-là. Une mention ne prouve pas qu’un binaire a été inspecté.
Les dossiers de firmware stock et d’étalonnages d’usine sont des éléments de
référence : **n’utilisez pas les étalonnages d’un autre appareil comme sauvegarde personnelle**.

## Multiboot : affirmation et vérification

Le collecteur énumère F4HWN, GOGU, IOTCU et N7SIX comme compatibles avec le
multiboot Armel, ainsi que Sonic en externe. **Karina n’apparaît pas dans cette liste.**
Avant d’étendre l’inspecteur, il faut vérifier le format, la carte mémoire,
l’identification, les banques CFG, la restauration, le protocole, l’intégrité et le démarrage.

Le site conserve sa liste d’images F4HWN reconnues. Aucune chaîne n’est modifiée
et aucun fichier n’est renommé pour contourner cette vérification. Ces sources ne sont
pas ajoutées automatiquement au catalogue des téléchargements vérifiés des auteurs d’origine.

## Karina 21-09-2026 : éléments du ZIP

Fichier : `Karina/21.09.2026.zip`, 2296162 bytes.
SHA-256 du téléchargement :

```text
619368c7d08cd2dfdda13aeec4ae5d8fadd70eb78d60bbe908832d53385e2999
```

L’[index des binaires tiers](BINARIOS-TERCEROS.md) contient un téléchargement du
même nom, mais de 2161962 octets et avec un autre SHA-256. L’équivalence du
contenu des deux ZIP n’a pas été démontrée. Cet inventaire et les hachages
extraits ci-dessous concernent exclusivement le téléchargement de 2296162
octets indiqué plus haut, et non tout fichier nommé `21.09.2026.zip`.

Inventaire interne : dossiers K1 et K5V3, deux RAW, deux packed, deux copies de
`calib11.bin`, deux pilotes CHIRP et trois PDF. Il ne contient pas de projet C,
de Makefile, de linker ni d’avis LICENSE nommé ainsi. Certains noms russes des entrées
posent des problèmes d’encodage lors de la lecture du ZIP ; ils n’ont pas été
réinterprétés comme noms de source et aucun contenu n’a été exécuté.

| Image RAW | Bytes | SP | Reset |
| --- | ---: | --- | --- |
| `k1_210926_3.bin` | 76288 | `0x20004000` | `0x08010AF5` |
| `v3_210926_3.bin` | 76352 | `0x20004000` | `0x08010B39` |

Ces vecteurs apportent des éléments montrant que les deux images sont de la famille
PY32, différente de `Reset=0x0000010B` dans le pack V1. Un vecteur dans la plage
et la taille admissibles **ne prouve pas** la compatibilité avec le chargeur multiboot.
Les variantes packed sont des conteneurs distincts ; ne supprimez pas 18 bytes à l’aveugle.

| Fichier | SHA-256 local |
| --- | --- |
| `k1_210926_3.bin` | `81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82` |
| `v3_210926_3.bin` | `40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4` |
| `k1_210926_3.packed.bin` | `de1d74fd1a3901776c977fb58342264a69ad687c61c58a4063b63e91cd1123bc` |
| `v3_210926_3.packed.bin` | `5ec8598ca8cc5c0df0030137d5fd774bade8569d27b8021fcde147248f088d34` |

`calib11.bin` n’a pas été restauré et cela n’est pas recommandé. Les deux copies
font 512 bytes et ont la même empreinte, ce qui ne les transforme pas en étalonnage
d’origine des deux radios de l’utilisateur.

## Configurations Karina V3 décrites par le collecteur

| Fonction | Signification décrite | Précaution/version |
| --- | --- | --- |
| Spectre Delay | Compromis entre durée de mesure et vitesse | Des valeurs plus faibles peuvent réduire la sensibilité ; ne pas copier une valeur « optimale » universelle |
| Turbo | Accélère le balayage | Peut omettre des signaux utiles selon la note elle-même |
| Roger 5 | Paramètre réutilisé après des changements expérimentaux de RX | Sa signification évolue : le 21-09-2026, des accélérations permanentes sont annoncées ; ne pas le traiter comme une simple tonalité Roger |
| Volume dynamique | Traitement audio/fin de transmission | Réglage perceptif, pas un étalonnage RF |
| Capture proche/lointaine | Détection automatique de fréquence | Agit sur la consommation/la latence ; ne garantit ni la localisation d’un signal ni la consignation de tous les signaux |
| Trois presets | États de configuration selon les notes depuis juillet 2026 | Contiennent leurs propres données ; ce ne sont pas des slots de firmware Armel |
| Beacon/réponse automatique | Fonctions susceptibles d’émettre automatiquement | Non activées à la configuration initiale ni pour tester la radio |
| SQL étendu | Les notes de juillet décrivent une plage de 0-15 | Ne pas appliquer aux versions précédentes sans vérification |
| Paramètres/touches CHIRP | Les notes signalent des incompatibilités et des blocages avec NONE | Ne pas écrire avec un pilote générique ni copier les valeurs d’un autre firmware |

L’entrée du 21-09-2026 décrit des changements de fermeture du squelch AM,
d’accélération, de capture et de mesure CTCSS/DCS. Celle du 21-08-2026 décrit
une correction d’un blocage RX lié à Roger 5. Il s’agit de notes du pack, pas de
résultats d’essais. Le fichier du 15-08-2026 est identifié comme fichier de test.

Le texte du pack comporte des effacements, des chargements d’étalonnage et même
des indications demandant d’ignorer les erreurs de vérification. **Elles ne sont pas
transformées en instructions de ce site.** En cas d’erreur de vérification, arrêtez-vous,
conservez les sauvegardes et vérifiez l’outil/le matériel/la version ; ne déclarez pas
l’opération réussie sur la seule foi d’une note tierce.

## Éléments nécessaires pour un véritable portage ou une intégration

1. Sources exactes et licence de l’auteur pour Karina K1/V3.
2. Compilation reproductible et carte mémoire.
3. Spécification/protocole et compatibilité réelle de CFG/étalonnage.
4. Vérification du mécanisme multiboot ou démonstration d’une implémentation compatible.
5. Essais physiques de lecture, sauvegarde, démarrage, restauration et récupération.

Karina n’a pas été portée, compilée ni flashée à partir de ce lien.
Ces nouveaux éléments précisent la couverture matérielle sans supprimer ces exigences.

## Sources figées

- [Arborescence complète du pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c).
- [Dossier Karina](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Notes Karina et historique des modifications](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Egzumer : autre source d’origine](AYUDA-EGZUMER.md).
- [Dossier du pack Karina V1](KARINA.md).