# Karina : dossier technique et limites d’une dérivation Bricohams

Date de l’inspection : 2026-10-25.

## 1. État et portée

**Nouvel élément du 25-10-2026 :** le lien Dim0s fourni ultérieurement contient
un autre package Karina pour **V3 et UV-K1**, avec des vecteurs PY32. Le présent dossier
décrit le package **V1 local**, et non toutes les variantes Karina existantes.
Le [rapport Karina V3 et pack Dim0s](AYUDA-PACK-DIM0S.md) documente le téléchargement,
l’inventaire et les empreintes. La compatibilité avec les slots Armel n’a pas été démontrée
et aucune source ni mention MIT n’a été trouvée dans ce ZIP.

Ce document décrit les éléments observés dans le package local **Karina-2026.08.21 K5V1
(Fw+Cal+Instr+K5prog+Rolling)** et les compare aux références ouvertes citées à titre indicatif.
Il ne s’agit ni du code source récupéré, ni d’une traduction intégrale de ses manuels,
ni d’une certification du firmware. Aucun binaire Karina Bricohams n’a été créé,
le bootloader n’a pas été modifié, aucune radio n’a été flashée et le multiboot V1 n’a pas été testé.
Une **édition Bricohams V3 indépendante basée sur F4HWN** a été créée ; elle est décrite dans
[BRICOHAMS-FIRMWARE.md](BRICOHAMS-FIRMWARE.md) : elle n’incorpore pas de code Karina
et ne prétend pas en être un port.

**Blocage pour dériver Karina :** le package ne contient ni sources C, ni assembleur,
ni linker, ni Makefile, ni licence du firmware. La présence d’un fichier `.bin` ne fournit
pas son projet de compilation et ne permet pas de lui attribuer la licence d’un autre projet.
Les trois fichiers Python sont des pilotes CHIRP, et non le firmware du processeur.

L’attribution d’une licence MIT au firmware reste une déclaration en attente d’identification
du composant, du titulaire et d’un texte ou d’une source vérifiable. Cette mention n’a pas été
trouvée dans le package inspecté et cela ne modifie pas les licences des pilotes ni de F4HWN.
Même si la licence MIT de Karina était confirmée, son projet source resterait nécessaire
pour une recompilation.

En l’absence de sources ouvertes, la reconstruction repose sur une implémentation indépendante
fondée sur des comportements documentés. La disponibilité des sources Karina n’est plus
une condition préalable à l’écriture de nouvelles fonctions. Il demeure impossible de promettre
une recompilation de Karina ou une équivalence à 100 % sans implémentation ni tests.
Le premier noyau ARDF propre, son contrat et les points d’intégration restants sont décrits dans
[Bricohams](BRICOHAMS-FIRMWARE.md#nuevo-nucleo-independiente-ardf). Trois images indépendantes
pour les slots V3 sont maintenant construites : ARDF avec cycles, Satellites avec Doppler RX manuel
et Spectre avec 128 points, moyenne, peak hold et huit presets de session RAM, ainsi qu’une capture
VFO-PRO RX propre. La capture permet la syntonisation par pas, la saisie numérique RX, l’audio et
les réglages des champs RX documentés de R13, tout en préservant les autres bits. Elle permet de
centrer des fenêtres et de parcourir les presets RAM de manière circulaire, avec une liste noire
temporaire de 16 fréquences exactes et une recherche CTCSS/DCS FM facultative via le détecteur
upstream, encore à valider en RF. Elle ne modifie pas la calibration, n’enregistre pas les tonalités
et ne transmet pas. Satellites n’implémente ni TLE/SGP4 ni suivi autonome. Lors de l’inspection
initiale, aucune image n’avait été flashée. Le 26-10-2026, les CRC des slots Bricohams dans la Flash
externe ont ensuite été vérifiés, comme indiqué dans le [guide Quansheng](AYUDA-QUANSHENG.md).
Cela ne valide ni le démarrage de SAT/ARDF/Spectre, ni une équivalence à Karina, ni la RF.
La séparation par fonction ne signifie pas que tous les modules Karina ont été recréés.
Les presets du spectre peuvent désormais être exportés/importés par USB/UART dans des fichiers BHSP,
avec validation et relecture ; ils ne sont pas persistants en EEPROM. L’image Satellites dispose
d’un CAT RX expérimental et d’un suivi orbital depuis le web, pas dans le MCU. ARDF peut exporter
un résumé d’observations manuelles, sans GPS. Il reste des fonctions et comportements à reconstruire
et à vérifier.

Il est possible de documenter les fonctions observées et de préparer une implémentation propre
sur une base ouverte. Cette implémentation ne doit pas être présentée comme une recompilation
de Karina ni comme équivalente sans vérification.

**Recherche de sources (26-10-2026).** Aucun code source public de Karina n’a été trouvé
parmi les sources consultées ; cela ne prouve pas qu’il n’existe pas. Le pack Dim0s indique
qu’il s’agit d’un firmware fermé sans dépôt, et les groupes Telegram en espagnol et en russe
consultés ne contenaient pas de sources. Les recherches effectuées sur GitHub, Codeberg, GitLab,
Gitee, GitFlic et GitVerse n’en ont pas non plus trouvé. Selon le groupe russe,
Karina poursuit [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, qui autorise les dérivés fermés) et partage du code de spectre avec
[PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5) (Apache-2.0, V1).
Ces deux projets sont les bases ouvertes pour réimplémenter ses fonctions ; `fagci/s0v4`,
`hawk5` et `k1-fw` n’ont pas de licence et leur code n’est pas repris. Le binaire Karina
n’est pas désassemblé. Matériel et protocoles du V3 : [atlas technique](ATLAS-UV-K5-V3.md).

## 2. Méthode et sources des éléments

- Inventaire récursif du dossier fourni, sans exécuter d’EXE, de pilotes ni de binaires.
- SHA-256 et lecture des premiers vecteurs des images.
- Extraction du texte de cinq PDF, 102 pages au total, avec PDF.js dans un répertoire d’outils isolé,
  hors des dépendances du web.
- Consultation des README, Makefile, linker et licence des références ouvertes.
- Comparaison des images locales avec les contrôles du connecteur PY32.

L’extraction des PDF a produit des avertissements de polices. Les schémas, les couleurs des versions
stables/de test et les captures d’écran n’ont pas été vérifiés visuellement page par page.
On ne déduit donc pas la stabilité d’une couleur perdue et l’inventaire n’est pas considéré comme
une documentation exhaustive de l’implémentation interne. Les résumés ci-dessous sont originaux
et ne reproduisent pas les manuels complets.

## 3. Inventaire du package

24 fichiers : 13 `.bin`, 5 PDF, 3 `.py`, 1 `.exe`, 1 `.ini`, 1 `.txt`.

### 3.1. Images et données

| Fichier | Octets | Classification prudente |
| --- | --- | --- |
| `v1_210826_2.bin` | 61412 | Image Karina V1 du package portant le nom le plus récent |
| `v1_210826_2.packed.bin` | 61430 | Conteneur de mise à jour, pas une image RAW interchangeable |
| `30.07fw_2.bin` | 61280 | Image antérieure ; son nom ne certifie pas sa stabilité |
| `30.07fw_2.packed.bin` | 61298 | Variante empaquetée de l’image précédente |
| `16.10fw_7.bin` | 61040 | Image historique ; l’année n’est pas démontrée par son nom |
| `Config-29.01.26.bin` | 7424 | Configuration ; pas un firmware |
| `28.11.25calib_mic.bin` | 512 | Données étiquetées comme calibration du microphone |
| `29.01.26calib_sql.bin` | 512 | Données étiquetées comme calibration SQL |
| `30.07calib_mic.bin` | 512 | Données étiquetées comme calibration du microphone |
| `30.07calib_sql.bin` | 512 | Données étiquetées comme calibration SQL |
| `Rolling back (BACKUP)/k5_v4.00.07_publish.bin` | 58726 | Image de récupération du package ; origine non vérifiée |
| `Rolling back (BACKUP)/Reborn-RUS.bin` | 61006 | Autre firmware ; ne pas supposer qu’il s’agit de Karina |
| `Rolling back (BACKUP)/my_calibration-FIRST-Power.bin` | 512 | Calibration probablement spécifique à une autre unité |

Les étiquettes `calib` ne prouvent pas qu’un fichier est la sauvegarde originale
de la radio de l’utilisateur. **Ne pas appliquer de calibrations provenant d’autres unités
ni les inclure dans un dépôt public.** L’EXE K5prog n’a pas non plus été exécuté ni certifié.

### 3.2. Empreintes vérifiées

| Fichier | SHA-256 |
| --- | --- |
| `v1_210826_2.bin` | `c7612a86325d10d768efc9fc7330bede203226879aae0a7d6f026418d55166f9` |
| `v1_210826_2.packed.bin` | `7690da5a740fb24c9a36e711f0410c27b7e99e9ab450d0ef0cdc161b21c11c52` |
| `30.07fw_2.bin` | `9e97e28325468a70aebe19a288cd44878e16ad705f05485c92d2bf9dc50f05b7` |
| `30.07fw_2.packed.bin` | `e53b74b9e755175b72acec8e470e90db0c7c08ac53f1023e10e7e3faeee2d08f` |
| `16.10fw_7.bin` | `af51612d4d20b2637c6da2c72d62493f537621685c1ab604165f0e05fc1fe1ee` |

Ce sont des empreintes calculées localement, pas des hashes comparés à une publication signée
de l’auteur.

### 3.3. Manuels

| `00-UV-K5V1-КРАТКО установка и настройка.pdf` | 2 | Introduction : installation et configuration |
| `01-UV-K5V1-ПОДРОБНО-Прошивка, Восстановление, CHIRP.pdf` | 17 | Référence : installation, récupération et CHIRP |
| Document local | Pages | Utilisation dans ce dossier |
| --- | ---: | --- |
| `02-UV-K5V1_Инструкция Karina_21.08.26.pdf` | 29 | Référence fonctionnelle principale d’août 2026 |
| `03-UV-K5V1_История версий Karina.pdf` | 16 | Historique des changements, ne remplace pas le code source |
| `UV-K5(8)_FW_Karina_mod_15.06.2025-R8.pdf` | 38 | Manuel antérieur, pas automatiquement équivalent à celui de 2026 |

## 4. Matériel et mémoire : ne pas confondre V1 et V3

La page de couverture du manuel principal identifie les UV-K5, UV-K5+, UV-K5(8) et UV-K6 **V1**.
La radio décrite auparavant par l’utilisateur était une **UV-K5 V3**.

| Famille | Base pertinente | Conséquence |
| --- | --- | --- |
| UV-K5 V1 | Écosystème DP32G030 / référence OneOfEleven | Image et carte mémoire différentes ; pas de prise en charge des slots V3 par ce site |
| UV-K5 V3 / UV-K1 | F4HWN PY32F071 dans `Multiboot/Fusion61` | Connecteur existant pour les slots 1-4 et Main protégé |

Dans `v1_210826_2.bin`, on lit `SP=0x20003FF0` et `Reset=0x0000010B`.
Les images RAW `16.10fw_7.bin` et `30.07fw_2.bin` présentent les mêmes vecteurs.
Le connecteur V3 attend un reset Thumb dans l’application à partir de
`0x08002800`. Karina V1 **ne passe pas** ce contrôle.

Le linker de OneOfEleven consulté déclare 60 KiB de FLASH et 16 KiB de RAM.
Les 61412 octets de l’image Karina ne laissent que 28 octets par rapport à 60 KiB ;
il s’agit d’une comparaison de tailles avec cette référence, pas d’une carte interne de Karina.
Cela ne démontre pas qu’il reste de la place pour un autre firmware ou un gestionnaire de démarrage.
Les 18 octets supplémentaires des `.packed.bin` ne constituent pas de l’espace libre utilisable.

La couverture du manuel Karina précise que Si4732 n’est pas pris en charge et que les mémoires
étendues M24M01/M24M02 ne sont pas exploitées comme mémoire étendue. Le package ne fournit
aucun élément attestant l’existence de slots de firmware compatibles avec le Multiboot F4HWN V3.

## 5. Documentation fonctionnelle de Karina

Les fonctions de cette section proviennent du texte du manuel, pas de tests sur le matériel
ni d’une inspection du code d’implémentation.

### 5.1. Écran et état (manuel principal, pages 3-4)

- Affichage VFO/canaux et dernier récepteur actif.
- Indicateurs d’économie, de verrouillage du clavier et de mode de fonction.
- Double écoute, informations CTCSS/DCS et appartenance aux listes de balayage.
- Batterie, indicateur de signal, noms et fréquence.
- Indication des modes AM/FM/SSB ; l’étiquette SSB ne prouve pas l’équivalence
  avec un équipement SSB dédié.

### 5.2. Menus et persistance (pages 5-9)

- SQL, pas d’accord, puissance, décalage, tonalités et largeur de bande.
- Verrouillage sur canal occupé, sauvegarde mémoire et style des noms.
- Économie d’énergie, VOX, double écoute et comportement du balayage.
- Réglages audio RX/TX et fonctions de filtrage spécifiques.
- Menus masqués et paramètres avancés : les documenter à partir des sources avant
  de les exposer dans une compilation Bricohams.

Le manuel distingue les paramètres par VFO, bande et mémoire, et explique que certains
changements de canal ne sont persistants qu’après une sauvegarde explicite. Un port ne doit
pas confondre les réglages temporaires avec les données persistées.

### 5.3. Clavier, écoute et balayage (pages 10-16)

- Actions courtes, longues et combinaisons avec la touche de fonction.
- Bascule VFO/MR, copie des réglages et saisie de fréquence.
- Balayage et fonctions attribuables aux touches latérales.
- Le manuel signale des problèmes possibles lorsqu’on attribue `NONE` à FN1/FN2 à l’aide
  d’outils externes ; la compatibilité du pilote doit être vérifiée.

Le manuel décrit également des fonctions d’émission automatique et d’aléatorisation.
Leur présence dans la documentation n’en fait pas des exigences du nouveau firmware.
Aucune automatisation ni séquence susceptible de brouiller des services n’est fournie ici.
Une première dérivation doit respecter les limites légales et laisser l’émission automatique désactivée.

### 5.4. Analyseur de spectre (pages 17-24)

- Écran du spectre et visualisation de l’activité.
- Syntonisation, sélection de la fréquence active et lien avec les mémoires.
- Plages de saisie libre et presets.
- Multipreset et paramètres de balayage.
- Vue détaillée appelée VFO-PRO.
- Paramètres de gain et registres du récepteur, notamment LNA/PGA.
- Le manuel indique que certains paramètres peuvent être écrits dans la calibration à la sortie
  du spectre : ne pas les traiter comme de simples réglages visuels sans conséquence.

Les algorithmes, filtres, durées, limites et affectations de registres du code Karina n’ont pas été
vérifiés dans les sources. Il est incorrect d’implémenter des décalages supposés à partir de captures
ou de textes.

### 5.5. Diagnostic et évolution (pages 25-29 et historique séparé)

Le manuel couvre les problèmes d’utilisation et de configuration ; l’historique répertorie des
changements de réception, de squelch, d’économie, de balayage, de sous-tons et de spectre.
L’entrée du 21-08-2026 mentionne une correction du blocage de réception associée à un mode
appelé Roger 5 et fait référence à `29.01.26calib_sql.bin`. Cela ne certifie pas que ce fichier
convienne à une autre unité.

L’historique couvre les versions 2023-2026. Son codage par couleurs stable/test ne peut pas être
conservé de manière fiable lors de l’extraction du texte. Il n’est pas affirmé que tous les binaires
du dossier soient stables.

## 6. CHIRP : ce qui existe et ce que cela ne prouve pas

| Fichier Python | Observation |
| --- | --- |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py` | Modèle déclaré UV-K5/1, basé sur Egzumer/F4HWN/Karina |
| `Chirp dr Karina-by_M2Boo-K1-2.py` | Modèle déclaré UV-K5V3/K1, bien que présent dans le package V1 |
| `chirp_uvk5_fagci_osfw.py` | Pilote UV-K5/Fagci, ne démontre pas la compatibilité avec l’image Karina la plus récente |

Les en-têtes des pilotes indiquent GPL v2 ou ultérieure. Cette licence s’applique à ces fichiers,
elle ne confirme pas la licence du firmware fermé joint. Les pilotes déclarent 38400 bauds et une
mémoire de données de `0x2000` octets. Les deux dérivés F4HWN/Karina déclarent l’écriture des
données jusqu’à `0x1D00` et la calibration à partir de `0x1E00`. Ce sont des déclarations des
pilotes, pas la preuve qu’ils conviennent à toutes les révisions.

Ces scripts Python n’ont pas été importés ni exécutés. Un module CHIRP exécute du code sur le PC ;
il faut le vérifier et le choisir en fonction du modèle, du firmware et de leurs versions exactes.
La présence d’un pilote V3 ne transforme pas le binaire V1 en firmware V3.

## 7. Compilation modulaire, patches et multiboot

| Concept | Fonction | Ce que cela ne démontre pas |
| --- | --- | --- |
| UVMOD | Combine les patches binaires sélectionnés sur une image prise en charge | Sources de Karina, compilation C ou multiboot |
| Options Make/CMake | Incluent/excluent du code et produisent une image | Plusieurs firmwares résidents simultanément |
| Overlays RAM | Partagent la mémoire d’exécution entre sections | Slots de firmware complets sélectionnables au démarrage |
| Multiboot F4HWN V3 | Stocke des images dans la Flash externe et les gère via son protocole | Compatibilité avec V1 ou une image arbitraire |

OneOfEleven fournit des sources sous Apache-2.0 et des options `ENABLE_*` dans son Makefile.
Elles comprennent la réception, le spectre/panadapter, l’interface, le balayage et des fonctions
de communication. Il existe des dépendances : par exemple, le Makefile ajuste des options UART
et la coexistence de LTO/overlay. Il ne suffit pas de tout activer. Une base OneOfEleven serait
une dérivation de OneOfEleven/DualTachyon, pas de Karina.

## 8. Bibliothèque Multiboot locale intégrée au web

Dans Quansheng, sélectionner **Bibliothèque locale** puis choisir le dossier
`Documents/Multiboot`. Le navigateur ne lit que les fichiers `.bin` sélectionnés : aucune API
ne lit des chemins arbitraires de l’ordinateur et les fichiers ne sont pas téléversés sur GitHub.

L’inspection locale a trouvé 9 fichiers conformes aux contrôles actuels :

| Édition | Versions | Origine locale |
| --- | --- | --- |
| Fusion | 6.0.0 et 6.1.0 | `Fusion61/archive` |
| FieldOps | 6.0.0 et 6.1.0 | `Fusion61/archive` |
| Labs | 6.0.0 et 6.1.0 | `Fusion61/archive` |
| Transfer | 6.0.0 et 6.1.0 | `Fusion61/archive` |
| Fusion compilée localement | Chaîne 6.1.0 | `Fusion61/build/Fusion/f4hwn.fusion.bin` |

Lors du test dans le navigateur, la sélection du dossier Multiboot complet a examiné 71 images :
9 acceptées et 62 bloquées. Le test séparé de `Fusion61/archive` en a examiné 44 : 8 acceptées
et 36 bloquées. Ces résultats correspondent au contenu local inspecté et changeront si des fichiers
sont ajoutés.

Chaque entrée indique son état ou le motif du blocage. Longueur, vecteurs PY32, identification
F4HWN v6.x et noms des variantes exclues sont vérifiés. Le SHA-256 est calculé localement.
Une chaîne de version et des vecteurs corrects **ne certifient ni l’authenticité, ni la
correspondance avec les sources, ni la compatibilité physique**. La compilation locale n’est pas
présentée comme signée par Armel.

ARDFv05 contient des sources, mais aucune image ARDF finalisée n’a été trouvée dans les répertoires
de firmware inspectés ; `archive` contient d’anciennes images Fusion et stock. Aucune prétendue
image ARDF déduite du nom d’un dossier n’est proposée. Les publications ARDF du catalogue restent
téléchargeables uniquement.

Préparer une image n’écrit rien. L’installation exige toujours une connexion compatible,
une sauvegarde complète vérifiée, un slot 1-4, une confirmation et un CRC final. Main reste protégé.
Karina V1 reste également bloquée sous un faux nom F4HWN, car ses vecteurs ne respectent pas
le format PY32.

## 9. Contrat nécessaire à une version Bricohams reproductible

Voici les travaux en attente, et non des fonctions déjà présentes dans Karina :

1. Obtenir les sources exactes de Karina, sa licence, ses dépendances et ses outils, ou approuver
   une autre base ouverte et consigner les différences.
2. Choisir séparément le matériel. V1 et V3 nécessitent des projets/profils et des binaires
   différents. Pour les slots existants de l’utilisateur, la base applicable est PY32, et non
   le binaire V1 du package.
3. Reproduire la compilation sans modification avant de la changer ; consigner le commit,
   la chaîne d’outils, les options, la carte mémoire et les hashes. Ne pas inventer de SHA upstream.
4. Créer des profils minimaux avec dépendances et budget FLASH/RAM. Rejeter les options inconnues
   et les combinaisons trop volumineuses.
5. Préserver l’identité/la licence upstream et ajouter la marque Bricohams sans modifier
   artificiellement une chaîne pour contourner la validation des slots.
6. Fournir `.bin`, carte mémoire, rapport de taille, `build-info.json` et `SHA256SUMS`, couvrant
   le firmware et les métadonnées. Ne pas confondre hash et signature.
7. Pour V3, tester le démarrage, le changement de CFG, la calibration propre, la sauvegarde,
   la récupération et les slots avec F4HWN. Pour V1, démontrer d’abord la prise en charge physique
   du stockage et une stratégie de récupération du bootloader.
8. Ne publier qu’après des essais sur banc ; documenter les limites RF et ne pas activer
   automatiquement des émissions hors des bandes autorisées.

Le web possède déjà un formulaire d’options pour le workflow
`Brico-Hams/bricohams-firmware` ; ce n’est pas un compilateur Karina. Ce workflow n’a pas été
exécuté pour cette tâche. Un constructeur local indépendant pour F4HWN v6.1.0 a été ajouté et
les éditions Bricohams Fusion et Labs générées. Le reste de cette section demeure une exigence
pour dériver Karina, pas l’affirmation que ses fonctions ont été réimplémentées dans ces binaires.

## 10. Récupération et limites opérationnelles

Le `readme.txt` de rollback décrit des opérations qui effacent des données. Elles ne sont pas
automatisées et il n’est pas recommandé de les appliquer en cas d’échec USB. Toute migration
nécessite les sauvegardes originales de l’unité, l’identification du matériel et une procédure
de récupération éprouvée.

Le web conserve les protections contre l’écriture. Les fichiers d’origine du package et le dossier
Multiboot n’ont pas été touchés. Les PDF, EXE, calibrations et firmware Karina ne sont pas redistribués.

## 11. Sources externes consultées

- [UVMOD : outil](https://whosmatt.github.io/uvmod/index.html).
- [UVMOD : README](https://github.com/whosmatt/uvmod).
- [OneOfEleven : projet](https://github.com/OneOfEleven/uv-k5-firmware-custom).
- [OneOfEleven : Makefile](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/Makefile).
- [OneOfEleven : linker](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/firmware.ld).
- [OneOfEleven : licence Apache-2.0](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/LICENSE).
- [F4HWN V3/UV-K1](https://github.com/armel/uv-k1-k5v3-firmware-custom).

Les références externes ont été consultées sur leur branche publiée pendant l’inspection ;
aucun commit n’a été fixé pour une nouvelle dérivation. Aucune fonction ni licence de ces projets
n’est attribuée au binaire Karina sans preuve.

## 12. Recherche dans la communauté (26-10-2026)

Recherches ciblées dans les groupes Telegram « QuanSheng UV-K5 en espanol » et
« Quansheng uv-k5, uv-k5 (8), kr5plus », sur GitHub, Codeberg, GitLab, Gitee, GitVerse
et GitFlic (session ouverte), ainsi que dans le pack Dim0s. Sans noms d’auteurs ni données personnelles.

### Code source

| Élément observé | Source |
| --- | --- |
| «ссылки на репозиторий нет, прошивка закрытая» (pas de dépôt, firmware fermé) ; builds sur `t.me/quansheng_V3_K1` | `Karina/информация.txt` du [pack Dim0s](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) |
| «Karina n’a pas de github, elle publie les versions sur son forum russe» | Groupe en espagnol |
| Karina est «la suite directe de fagci b5» et Punktracker partage son code de spectre | Groupe russe |
| Sujet «Karina mod Fagci based» (créé le 22-02-2024) et canal du développeur «k5fw» | Groupe russe |
| Aucune source Karina ni aucun projet Quansheng n’ont été trouvés dans les recherches sur GitFlic et GitVerse | Recherches du 26-10-2026 ; cela ne prouve pas leur inexistence |

Conclusion : **aucune source publique de Karina n’a été trouvée lors de cette révision**.
La base ouverte de référence identifiée est
[fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod) (Apache-2.0, qui
permet les dérivés fermés) et [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1, avec AFC Doppler). `fagci/s0v4`, `hawk5` et `k1-fw` n’ont pas de licence :
on peut les lire, pas les copier. Désassembler le binaire Karina pour en reconstruire les sources
constituerait une œuvre dérivée ; le droit européen n’autorise le désassemblage que pour
l’interopérabilité.

### Versions V3/K1 du pack Dim0s

`21.09.2026` (actuelle) et anciennes versions `23.03.2026`, `11.04.2026`, `10.05.2026`, `22.05.2026`,
`14.06.2026`, `28.06.2026`, `27.07.26`, `29.07.26`, `01.08.26`, `06.08.26`, `11.08.26`,
`15.08.26` (tests), `21.08.2026` et `testfsk7`. Les `.packed` sont réservés au flasheur
officiel ; les autres conviennent aux flasheurs ouverts.

### Spécification fonctionnelle pour une réimplémentation propre

Résumé original de `информация.txt` et du journal des modifications du pack, sans reprendre de code :

| Fonction | Comportement décrit |
| --- | --- |
| Spectre multibande | Plusieurs bandes simultanément (aviation, marine, LPD, PMR, personnalisées). « Delay » (2400 par défaut, 1100 recommandé) et « Turbo » ; plus rapide lorsque le squelch dépasse davantage le bruit |
| Accélérations | Permanentes depuis le 21.09.26 (auparavant liées à Roger 5) ; AM avec xtal 3 dans Roger 5 |
| Volume dynamique | Appui long sur 9 (affiche « D ») |
| Balises et réponse automatique | F + appui long sur 1/2/3 ; balise avec FN2 long, durée selon TxTime |
| Générateur de tonalité AM | Inclus |
| Capture longue portée | SQL=3, SAVE=1:3, Roger=3 et appui long sur 1 (consommation supérieure) |
| Trois presets d’état | Calibration, canaux et réglages ; sélection avec 0/1/2 au démarrage |
| Réception | Capture automatique avec filtre antiparasite, mesures CTCSS/DCS plus longues, fermeture lente du squelch en AM, LNA réglable |
| Flashage | Sur le firmware d’usine ; après flashage, PTT+EXIT au démarrage pour effacer, charger la calibration d’origine puis celle de Karina |
| CHIRP | Seulement l’onglet des canaux : modifier « Paramètres » casse la balise et peut bloquer la radio |
| Problèmes connus | Première mémoire sans nom dans le spectre, fréquences erronées en mode EXP multibande, flèches inversées dans le menu K1 |

Parcours recommandé : partir de F4HWN V3 (Apache-2.0), porter le spectre depuis fagci-mod et
PUNKTRACKER, implémenter ces fonctions comme code propre et le publier en open source. Le matériel
et les protocoles du V3 figurent dans l’[atlas technique](ATLAS-UV-K5-V3.md), et le catalogue des
référentiels dans les [liens de la communauté](ENLACES-COMUNIDAD.md).
