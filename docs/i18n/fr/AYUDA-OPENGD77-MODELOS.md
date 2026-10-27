# OpenGD77 : modèles, variantes et portée de la prise en charge

**Vérification documentaire : 2026-10-25.** Complément à [l'aide de configuration et d'utilisation](AYUDA-OPENGD77.md). La compatibilité documentée par le projet, les cibles du catalogue et les noms reconnus par le connecteur sont distingués. Aucun essai physique n'a été effectué sur tous les équipements.

## 1. Comment interpréter les tableaux

- **Guide :** le modèle ou la variante apparaît dans le guide officiel anglais consulté. Une mention dans un titre, une capture ou un exemple ne constitue pas des instructions complètes d'installation.
- **Paquet :** un fichier a été observé dans un index officiel donné. Cela ne certifie pas toutes les révisions matérielles portant un nom commercial similaire.
- **Catalogue :** cible de `firmware-core.js`, `TARGETS` ; il s'agit d'un sélecteur de paquets, pas d'un outil de chargement du firmware.
- **Identification :** étiquette dans `gd77-connector.js`, `MODELS` ; elle permet d'interpréter un numéro de protocole. Elle ne prouve pas à elle seule une compatibilité opérationnelle complète.
- **Non confirmé :** les sources consultées ne fournissent pas de preuves suffisantes ; cela ne signifie pas nécessairement que la chose est impossible ou inexistante.

**Toutes les familles OpenGD77 restent en lecture seule sur la radio avec cette application web.** Le codeplug standard peut être lu, modifié et enregistré localement, mais **l'écriture est BLOQUÉE**, car la sauvegarde ne comprend pas de copie intégrale vérifiée du firmware MCU. Le CPS externe peut proposer d'autres opérations ; cela ne modifie pas l'autorisation de l'application web. Aucun flashage n'est effectué depuis le catalogue. [L]

## 2. Matrice des modèles et destinations

Dans ce tableau, « ID » désigne l'étiquette que le connecteur peut renvoyer. Les noms sans tiret, avec tiret ou avec espace sont regroupés uniquement pour faciliter la recherche ; cela ne rend pas les variantes différentes équivalentes matériellement.

| Modèle ou désignation | Preuve officielle et restrictions | Destination dans `TARGETS` | Étiquette dans `MODELS` | Conclusion pratique |
| --- | --- | --- | --- | --- |
| Radioddity GD-77 / GD77 | Installation et fonctionnement documentés ; paquet `OpenGD77.zip` [G, F1] | `GD-77`, MK22 | `GD-77` | Choisir son paquet, pas celui du GD77S |
| Radioddity GD-77S / GD77S | Documenté sans écran ni clavier ; voix essentielles ; paquet dédié [G, F1] | `GD-77S`, MK22 | `GD-77S` | Zones limitées aux 16 premiers canaux accessibles via le sélecteur |
| Baofeng DM-1801 / DM1801 | Matériel version 1 uniquement ; révision 2022 exclue par le guide [G, F1] | `DM-1801`, MK22 | `DM-1801` | Vérifier la carte ; la façade seule ne suffit pas |
| Baofeng DM-1801A / DM1801A | Matériel version 1 uniquement ; la nouvelle révision de 2022 est également exclue [G, F1] | `DM-1801A`, MK22 | `DM-1801A` | Image différente de DM1801 ; le A n'est pas un suffixe facultatif |
| Baofeng RD-5R / RD5R | Installation documentée ; hotspot indisponible en raison de la limitation USB pendant TX [G, F1] | `RD-5R`, MK22 | `RD-5R` | Ne pas confondre avec n'importe quel DM-5R ou UV-5R |
| TYT MD-9600 / MD9600 | Mobile documenté avec révisions RF et paquets distincts par HW [G, F3] | `MD-9600-V1`, `-V2`, `-V4`, `-V5`, STM32 | `MD-9600` | L'ID ne sélectionne pas automatiquement la révision |
| Retevis RT-90 / RT90 | Documenté avec le MD-9600 ; mêmes précautions concernant la révision [G] | Pas de clé RT90 ; destinations MD9600 pertinentes | Pas d'étiquette RT90 ; le tableau propose `MD-9600` | Association officielle de famille, pas garantie pour toutes les cartes |
| TYT MD-UV380 / UV380 standard | Installation et fonctionnement documentés ; paquet `OpenMDUV380.zip` [G, F2] | `MD-UV380`, STM32 | `MD-UV380` | Ne pas le choisir pour un MD-380 par simple ressemblance de nom |
| Retevis RT-3S / RT3S | Documenté avec le MD-UV380 [G] | Pas de clé RT3S ; la destination `MD-UV380` le cite dans son étiquette | Pas d'étiquette RT3S | Association officielle ; vérifier le GPS et le matériel de l'appareil |
| TYT MD-UV390 / UV390 | Inclus dans le titre du guide et dans la section d'écran GPS [G] | Pas de destination portant ce nom | Pas d'étiquette UV390 | Mention officielle, mais affectation exacte de l'image à chaque variante non confirmée ici |
| MD-UV380 10W **sans PLUS** | Le guide décrit une option d'échelle de puissance pour la plateforme UV380 sans PLUS [G: Radio Options — Mode] | Pas de destination dédiée au 10W sans PLUS | Pas d'ID distinct | L'échelle ne certifie pas la puissance et ne change pas le matériel ; vérifier les notes de la variante |
| MD-UV380 10W **PLUS** | Paquet officiel séparé `OpenMDUV380_10W_PLUS.zip` [F2] | `MD-UV380-10W-PLUS`, STM32 | Pas d'ID PLUS séparé | Matériel distinct selon l'étiquette locale ; ne pas le traiter comme un UV380 standard |
| UV390 annoncé comme 10W ou PLUS | Aucune affectation spécifique vérifiée dans les sources consultées | Pas de destination UV390 PLUS | Pas d'ID spécifique | Ne pas extrapoler l'image UV380 PLUS sur la seule foi de l'annonce |
| Baofeng DM-1701 / DM1701 | Installation et fonctionnement documentés ; paquet `OpenDM1701.zip` [G, F2] | `DM-1701`, STM32 | `DM-1701` | Ne pas le confondre avec RGB |
| Baofeng DM-1701 RGB / DM1701RGB | Étiquette prévue par le connecteur ; aucune documentation propre vérifiée ici [L] | Pas de destination RGB | `DM-1701 RGB` | Reconnaissance d'ID, pas de paquet ni d'installation confirmés |
| Retevis RT-84 / RT84 | Guide d'installation et paquet dédié `OpenRT84.zip` [G, F2] | `RT-84`, STM32 | Pas d'étiquette RT84 | Le fait de partager un chapitre avec le DM1701 n'autorise pas à échanger les ZIP |
| TYT MD-2017 / MD2017 | Schéma des commandes dans le guide et paquet officiel `OpenMD2017.zip` [G, F4] | `MD-2017`, STM32 | `MD-2017` | Publication attestée ; ne pas extrapoler intégralement le manuel UV380 |
| MD-380 / MD380 | Étiquette du connecteur ; aucune destination ni aucun paquet vérifié pour ce modèle lors de cette consultation [L] | Pas de destination | `MD-380` | **Ce n'est pas un MD-UV380** ; bandes et compatibilité des variantes non certifiées ici |
| DM-32 / DM32 | Étiquette d'identification prévue [L] | Pas de destination | `DM-32`, famille logique SERIAL | Le nom ne certifie ni firmware, GPS, APRS ni cartographie complète |
| UV008 | Étiquette d'identification prévue [L] | Pas de destination | `UV008`, famille logique SERIAL | Aucune équivalence commerciale ni capacité RF n'est certifiée |

Les destinations Quansheng `UV-K1` et `UV-K5-V3`, également présentes dans `TARGETS`, **ne relèvent pas d'OpenGD77**. Elles sont exclues de ce guide.

### Alias et autres noms présents dans le guide

| Noms | Ce qui est confirmé | Ce qu'il ne faut pas en déduire |
| --- | --- | --- |
| GD-77 ↔ TYT MD-760 | La section d'installation identifie MD-760 comme une désignation du GD-77 | La compatibilité de tout autre TYT similaire |
| DM-1801 version 1 ↔ Baofeng DM-860 | Le guide l'indique expressément | Qu'un DM-1801 de 2022 redevienne compatible parce qu'il est appelé DM-860 |
| RD-5R ↔ Baofeng DM-5R **Tier 2** | Alias explicitement indiqué dans l'installation | Que n'importe quel DM-5R, y compris d'autres conceptions ou versions, soit un RD-5R |
| MD-9600 ↔ Retevis RT-90 | Traitement commun officiel pour l'installation et le fonctionnement | Une image unique pour toutes les révisions des deux marques |
| MD-UV380 ↔ Retevis RT-3S | Traitement commun officiel, également reflété par l'étiquette du catalogue | Une identité avec le MD-380 ou une compatibilité automatique de toutes les versions 10W |
| TYT MD-730 et GD-77S | MD-730 figure dans la liste des commandes d'entrée en mise à jour avec GD77/GD77S/MD760 | Cette seule mention ne confirme pas ici un alias complet GD77S↔MD730 ni une destination distincte |
| DM-1701 et RT-84 | Les deux appareils ont des instructions dans le même chapitre | Un alias d'image : il existe des ZIP différents |
| MD-UV390 et MD-UV380 | Le guide couvre le UV390 et son GPS | Une image interchangeable pour toute révision du UV390 |
| MD-2017 et Retevis RT82 ou autres noms commerciaux | Aucun alias confirmé par les sources examinées | Ne pas utiliser les images MD2017 en se fondant uniquement sur une équivalence de vendeur |
| DM1701RGB, DM32, UV008 et autres équipements | Uniquement les étiquettes locales indiquées | Une famille de transport ne démontre pas l'identité du matériel |

Le tableau évite de transformer la proximité commerciale, l'apparence extérieure ou la présence dans un même index en équivalence technique.

## 3. Familles et protocole d'identification du site web

La classification suivante est **celle mise en œuvre par le connecteur**, et non un inventaire universel des microcontrôleurs de tout équipement vendu sous ce nom :

| `radioType` | Étiquette interprétée | Famille logique et transport choisis par le code |
| --- | --- | --- |
| 0 | GD-77 | MK22 / USB |
| 1 | GD-77S | MK22 / USB |
| 2 | DM-1801 | MK22 / USB |
| 3 | RD-5R | MK22 / USB |
| 4 | DM-1801A | MK22 / USB |
| 5 | MD-9600 | STM32 / USB |
| 6 | MD-UV380 | STM32 / USB |
| 7 | MD-380 | STM32 / USB |
| 8 | DM-1701 | STM32 / USB |
| 9 | MD-2017 | STM32 / USB |
| 10 | DM-1701 RGB | STM32 / USB |
| 11 | DM-32 | SERIAL / WebSerial à 115200 |
| 12 | UV008 | SERIAL / WebSerial à 115200 |

`connect()` demande une structure RadioInfo de 46 octets, accepte les versions de structure **1 à 4**, vérifie la plage du type et exige que la famille sélectionnée corresponde. Il extrait le modèle, le firmware et la build. Si ces données ne sont pas reconnues, il rejette la structure : il ne faut pas deviner une carte mémoire.

Ce tableau ne contient pas d'ID distinct pour RT90, RT3S, RT84, UV390, HW V1/V2/V4/V5 ou 10W PLUS. Cette absence empêche d'utiliser la liste comme détecteur sans ambiguïté de toutes les variantes. Elle ne garantit pas non plus la valeur renvoyée par chaque firmware non testé.

La sauvegarde web utilise des cartes de calibrage différentes pour MK22 et les autres familles, ainsi que des segments pour reconstituer le codeplug standard. La présence de cette voie dans le code ne prouve pas, à elle seule, des essais physiques, sa validité dans les builds futures ni une copie complète sur chaque modèle SERIAL. En cas de réponse inattendue, conserver l'erreur et ne pas forcer la famille. [L]
## 4. MD-9600 / RT-90 : révisions HW1, HW2, HW4 et HW5

Le projet explique que la PLL et la fréquence intermédiaire ont changé pendant la production. La sérigraphie de la carte peut ne pas suffire : certaines unités ont subi une modification matérielle sans changement de cette inscription. Le catalogue ne résout pas cette ambiguïté.

| Destination locale | Fichier observé dans l'index officiel [F3] | Critère de sélection |
| --- | --- | --- |
| `MD-9600-V1` | `MD9600_firmware_HW_V1.zip` | Révision RF compatible avec HW1, documentée pour l'unité |
| `MD-9600-V2` | `MD9600_firmware_HW_V2.zip` | Révision RF compatible avec HW2 |
| `MD-9600-V4` | `MD9600_firmware_HW_V4.zip` | Révision RF compatible avec HW4 |
| `MD-9600-V5` | `MD9600_firmware_HW_V5.zip` | Révision RF compatible avec HW5 ; le guide oriente la carte 4A vers le firmware V5 |

L'index comprend également des variantes japonaises préfixées par `Japanese_`. Aucune destination V3 n'est observée dans le catalogue local ni dans cet index : ne pas en inventer une par continuité numérique.

Le guide avertit également que certaines unités très anciennes portant la mention carte version 2 peuvent nécessiter le firmware V1. Bien que le texte historique suggère d'essayer une autre révision en cas d'absence de RX/TX, ce guide **n'en fait pas une procédure universelle de flashage à l'aveugle**. Documenter la carte et l'unité, consulter les instructions de cette révision et conserver les sauvegardes.

Un codeplug correct associé à une image HW incorrecte peut empêcher le fonctionnement de RX/TX. Changer les TG, filtres ou tonalités ne corrige pas un mauvais choix de PLL/IF. Le numéro de firmware HW n'est ni la version de CPS ni la version de la structure RadioInfo.

## 5. UV380, UV390, RT3S et variantes 10W

| Cas | Preuve | Limite de la conclusion |
| --- | --- | --- |
| UV380 standard / RT3S | Guide commun et destination locale `MD-UV380` | Vérifier si l'appareil est équipé du GPS et vérifier sa build |
| UV380 10W sans PLUS | Option `Mode` qui adapte l'échelle affichée selon le guide | Le choix de l'échelle n'augmente pas la puissance physique |
| UV380 10W PLUS | ZIP officiel et destination locale séparés | Ne pas charger l'image standard au seul motif qu'elle partage « UV380 » |
| UV390 | Mentionné dans le périmètre et la section GPS du guide | Aucun sélecteur local ne certifie automatiquement sa variante |
| UV390 10W/PLUS commercial | Aucune correspondance précise vérifiée ici | Identifier la carte et les notes officielles avant de choisir l'image |

Il ne faut pas déduire que les versions sans PLUS et PLUS partagent la procédure d'installation, l'écran, le GPS ou le calibrage. Il ne faut pas non plus supposer que tous les portatifs annoncés « 10W » délivrent cette puissance mesurée.

## 6. Bandes, puissance et capacités : éléments documentés et questions en suspens

Aucun tableau commercial des plages RX/TX ou des watts par radio n'est publié ici : les sources consultées ne vérifient pas uniformément les variantes régionales et les révisions. Seuls les éléments étayés sont présentés, avec leurs limites.

| Capacité | Preuve exploitable | Ne pas extrapoler à… |
| --- | --- | --- |
| FM et DMR | Fonctions visées et modes du guide pour les plateformes prises en charge ; le DMR nécessite la procédure liée au codec/donneur | Toute étiquette du connecteur ou installation sans donneur correct |
| VHF/UHF | Le guide traite les limites des deux bandes et les canaux FM/DMR | La double réception simultanée ni les plages exactes garanties pour tous les modèles |
| Bande 200/220 MHz | Le manuel décrit les limites logicielles et avertit de l'absence d'une section RX/PA adaptée à 200 MHz et de fortes émissions parasites | Considérer tous les appareils comme « tribande » ou recommander d'y émettre |
| Puissance 5 W / 10 W / mobile | Le guide distingue les échelles et tableaux, et un paquet PLUS séparé existe | Une puissance maximale unique commune ni la tolérance à un fonctionnement continu |
| Écran/clavier | GD77S n'a ni l'un ni l'autre ; les autres commandes et dimensions varient | L'universalité d'une capture ou d'un raccourci |
| GPS | Le guide prévoit un récepteur facultatif sur MD9600/RT90 et UV380/RT3S ; l'écran GPS cite aussi UV390, DM1701 et RT84 équipés du GPS | La présence du GPS sur toutes les unités, ou une garantie pour DM1701RGB/DM32/UV008 |
| RTC | Le chapitre consacré aux satellites énumère MD9600/RT90, UV380/RT3S et DM1701 dans son contexte | Classer automatiquement tout autre modèle plus récent comme « sans RTC » |
| TX APRS FM | Fonction documentée par le guide ; profil et position requis | Réception APRS, messages bidirectionnels ou ressources identiques dans toutes les builds |
| NMEA / journal GPS | Options documentées lorsque le matériel et la mémoire appropriés sont présents | Que le suffixe NMEA ajoute un récepteur ou n'affecte pas la base d'IDs |
| Hotspot | Documenté pour les plateformes compatibles ; RD5R/DM5R exclu en raison de l'USB pendant TX | RD5R, le full duplex ou toutes les nouvelles étiquettes du connecteur |
| Satellites | Prédiction et correction Doppler documentées avec heure/position/Keps | Tous les modes spatiaux ni l'écoute de sa propre transmission en duplex |
| Accessibilité vocale | Voix externes et niveaux d'avertissement ; essentielles sur GD77S | Des voix automatiquement intégrées à tout ZIP ou toute langue |

### Les fréquences du manuel ne constituent pas une homologation

Dans `Radio Options — Band Limits`, le guide distingue :

- Les limites TX logicielles, avec une valeur par défaut indiquée pour les États-Unis : **144–148, 222–225 et 420–450 MHz**. **Ce ne sont ni le plan de bandes espagnol ni une autorisation locale.**
- Les limites générales de syntonisation décrites pour les plateformes de ce chapitre : **127–178, 190–282 et 380–564 MHz**, avec exclusion explicite de la plage intermédiaire sur MD9600/RT90.
- Les spécifications du circuit AT1846S citées dans le texte lui-même : **134–174, 200–260 et 400–520 MHz**, accompagnées d'avertissements sur le fonctionnement hors spécifications.

Ces chiffres décrivent des contextes différents. Il ne faut pas les transformer en « bandes garanties pour tous les modèles » ni les appliquer à DM32, UV008, RGB ou MD380 parce qu'ils apparaissent dans un tableau local. Le manuel avertit de la présence d'émissions parasites dans la bande intermédiaire en raison de l'absence d'étages appropriés : **ce guide ne recommande pas d'y émettre**. Configurer les limites autorisées dans votre pays et les restrictions réelles de votre appareil.

### Limites du codeplug et capacités de l'appareil

L'éditeur web prend en charge le binaire standard de **128 KiB** et exclut les canaux **1025+**. Cela n'affirme pas que toutes les radios ont le même nombre maximal de canaux, contacts, IDs ou zones. Sur certaines plateformes, les ressources vocales, le journal GPS et les bases d'IDs se partagent la mémoire. La longueur choisie pour chaque entrée de la base d'IDs modifie également sa capacité. Consulter le CPS/la build et la mémoire réelle de l'unité.

## 7. Commandes et bootloader : aucune séquence universelle

Le guide utilise des noms logiques tels que SK1, SK2, Green, Red et Orange. Leur emplacement varie selon la radio et, pour les mobiles, selon le panneau ou le microphone.

| Famille/modèle | Particularité de fonctionnement documentée | Précaution |
| --- | --- | --- |
| GD-77 | Deux boutons latéraux et un bouton supérieur ; référence du manuel | Ne pas transposer les positions à n'importe quel Baofeng |
| GD-77S | Sélecteur à 16 positions et modes annoncés vocalement | Pas de menus visuels ni de clavier numérique |
| DM-1801 / DM-860 | Commandes dédiées MR/VFO et A/B | La révision 2022 n'est pas validée par la seule ressemblance des boutons |
| RD-5R / DM-5R Tier 2 | A/B et Band remplacent gauche/droite ; accès long au menu rapide | Ne possède pas le même bouton physique Orange que GD77 |
| MD-UV380 / RT-3S | Molette et fonctions des flèches différentes | Vérifier le contexte : canal/VFO ou menu |
| DM-1701 / RT-84 | P1/P2 assurent les fonctions gauche/droite | Paquets propres et positions non interchangeables par intuition |
| MD-9600 / RT-90 | Correspondances spécifiques pour le panneau et le microphone | Selon le guide, le balayage VFO ne se commande pas entièrement depuis le panneau |
| MD-2017 | Le guide comprend un schéma dédié des commandes | Ne pas le remplacer par le schéma du UV380 |
| RGB / DM32 / UV008 / MD380 | Aucune instruction spécifique vérifiée lors de cette consultation | Ne pas inventer de combinaisons |

Pour installer le firmware, suivre les instructions du projet pour la **variante exacte** et utiliser le chargeur correspondant dans OpenGD77 CPS. Le guide différencie les combinaisons latérales sur MK22, P1 et bouton supérieur sur les mobiles, et PTT avec un autre bouton sur certains portatifs STM32. Aucune recette universelle n'est reproduite : l'identification et le nom commercial ne suffisent pas à valider tous les cas.

Sur STM32, le contexte du bootloader DFU et son pilote diffèrent du mode CPS/USB utilisé normalement. Un écran vide pendant une mise à jour peut être normal. Ne pas essayer des combinaisons au hasard ni écrire des fichiers d'une autre famille dans le seul but de faire apparaître un port.
## 8. Scénarios de sélection sûre

### « J'ai un DM-1801, le paquet DM1801 convient-il ? »

1. Vérifier s'il s'agit du matériel version 1 ou de la nouvelle révision de 2022.
2. Si le guide exclut cette révision, ne pas utiliser le paquet OpenDM1801 sur la seule foi du nom.
3. S'il s'agit d'un DM1801A, ne pas le remplacer par DM1801 : le catalogue et la publication ont des destinations distinctes.
4. S'il est impossible de déterminer la révision, conserver la configuration actuelle et interrompre l'installation.

### « Mon RT3S apparaît dans la famille MD-UV380 »

L'association est documentée par le projet et par l'étiquette du catalogue. Vérifier tout de même le matériel, la présence du GPS et les notes de l'image. Le nom de la famille ne prouve pas une réception simultanée de deux canaux ni ne transforme la radio en 10W PLUS.

### « Le connecteur reconnaît DM32, peut-on déjà le programmer ? »

L'étiquette est prévue comme type 11 avec transport SERIAL. Il n'y a pas de destination de firmware DM32 dans `TARGETS`. Aucun paquet officiel ni l'ensemble des fonctions n'ont été confirmés ici. Le site web n'accorde pas l'autorisation d'écriture, même si l'identification et la lecture aboutissent. État d'OpenGD77 sur le DM-32, installation, sauvegardes et compilation d'un firmware ouvert : [guide DM-32UV](DM32UV-FIRMWARE.md).

### « Il existe un ZIP officiel pour MD2017 : pourquoi n'est-il pas au début du manuel ? »

Le guide évolue par sections et son en-tête ne répertorie pas forcément toutes les publications ultérieures. Le schéma des commandes et l'index officiel constituent des preuves supplémentaires précises. On ne peut pas en déduire que chaque détail d'un autre modèle s'applique au MD2017 sans vérification.

### « Je veux restaurer mon MD9600 avec une sauvegarde provenant d'un autre appareil »

Ne pas utiliser le calibrage d'une autre unité. Distinguer codeplug, ressources, calibrage et firmware ; identifier la révision RF et conserver les sauvegardes de l'appareil concerné. Une image téléchargée ne remplace pas la sauvegarde MCU requise par la politique du site web.

## 9. Diagnostic de compatibilité

| Indice | Interprétation prudente | Action |
| --- | --- | --- |
| Présent dans le catalogue, mais pas dans `MODELS` sous cet alias | La destination de téléchargement et l'identification n'utilisent pas nécessairement le même nom | Vérifier la famille documentée ; ne pas exiger une égalité littérale entre tous les alias |
| Présent dans `MODELS`, mais absent du catalogue | Il s'agit d'une étiquette de protocole, pas d'un firmware téléchargeable sélectionné | Ne pas choisir un modèle similaire en remplacement |
| L'appareil répond comme MD9600 | La famille est connue, mais pas nécessairement HW1/2/4/5 | Déterminer la révision avant l'installation |
| C'est un UV380 et le vendeur indique « Plus » | Il peut s'agir d'un matériel nécessitant une image différente | Vérifier la carte et la désignation complète |
| UV390 mentionné dans le guide | Mention officielle, mais sans sélecteur local dédié | Chercher les notes exactes de la variante ; ne pas supposer qu'il s'agit du ZIP UV380 |
| MD380 sans « UV » | Nom de modèle différent | Ne pas charger `OpenMDUV380.zip` en raison d'une correspondance partielle |
| Famille sélectionnée rejetée | L'identification ne correspond pas au transport attendu ou au format accepté | Conserver l'erreur et ne pas désactiver la vérification |
| Sauvegarde signalée comme incomplète | La copie MCU complète manque dans le flux web | Exporter les données lues ; laisser l'écriture bloquée |
| Une fonction présente dans des captures manque | Différence de build, plateforme, ressources ou matériel | Comparer la version et les notes, pas seulement la marque/le modèle |

### Liste de vérification avant d'affirmer la prise en charge

- [ ] Modèle complet et fabricant consignés.
- [ ] Révision réelle de la carte confirmée si nécessaire.
- [ ] Firmware, build et CPS notés.
- [ ] Alias étayé par une source, et pas seulement par une boutique.
- [ ] Image choisie selon le modèle/la variante, pas selon la ressemblance.
- [ ] GPS, RTC, puissance, écran et bandes non supposés sans preuve.
- [ ] Mode USB normal distingué du bootloader.
- [ ] Sauvegardes originales exportées et portée de chacune comprise.
- [ ] Limite de 128 KiB et exclusion des canaux étendus acceptées.
- [ ] Écriture web maintenue **BLOQUÉE**.

## 10. Sources et portée temporelle

Toutes les sources ci-dessous ont été consultées le **2026-10-25**. Les liens indiquent des preuves ; ils n'autorisent pas le téléchargement d'un firmware pour n'importe quel appareil.

| Clé | Source vérifiée | Apport |
| --- | --- | --- |
| G | [Guide officiel anglais](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md) ; [référence fixe 33de63dcb002fcd837419fda25a2e535b940dbcd](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md) | Modèles d'installation, avertissement sur le DM1801 de 2022, alias explicites, commandes et fonctions par plateforme |
| R | [Dépôt LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide) | Provenance du guide et déclaration GPL 2 pour ses documents ; seule la version anglaise est maintenue |
| W | [Page d'accueil OpenGD77](https://www.opengd77.com/) | État du forum et accès aux archives statiques |
| A | [Archives du forum](https://www.opengd77.com/archive/index.html) | Contexte historique ; l'instantané visible date de juillet 2025 et n'est pas une matrice actualisée pour 2026 |
| F1 | [GD77, 2026-05-04 / 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/) | Paquets MK22 par modèle et variantes NMEA/Japanese lorsqu'elles existent |
| F2 | [MDUV380_DM1701, 2026-05-04 / ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/) | ZIP dédiés UV380, UV380 10W PLUS, DM1701 et RT84 |
| F3 | [MD9600, 2026-05-04 / e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/) | ZIP HW V1/V2/V4/V5 et variantes japonaises |
| F4 | [MD2017, 2026-05-05 / 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/) | Publication de l'image MD2017 et variante japonaise |
| L | [`firmware-core.js`](../../../firmware-core.js), [`gd77-connector.js`](../../../gd77-connector.js), [`radio-ui.js`](../../../radio-ui.js) | Catalogue, étiquettes du protocole et portée réelle de la lecture, de la modification et du verrouillage web |

Les chemins `Latest` de ces familles redirigeaient vers les index datés cités ; cela n'affirme pas qu'il s'agit de toutes les builds disponibles ni que « Latest » signifie stable pour chaque appareil. Les noms `Japanese`, `JA` ou `NMEA` désignent des variantes de distribution, pas de nouveaux modèles ni une équivalence de capacités.

La licence GPL 2 déclarée dans le README du guide **ne prouve pas une licence MIT du firmware** ni une licence unique pour CPS, voix, donneurs et codec. Vérifier les conditions propres à chaque composant avant toute redistribution.

**Blocages et lacunes explicitement conservés :** absence de sauvegarde MCU intégrale sur le site web ; révision commerciale ambiguë pour certains appareils ; absence de correspondance vérifiée pour chaque variante UV390 ; absence de prise en charge complète démontrée pour DM1701RGB, DM32, UV008 et MD380 sur la seule foi de leurs étiquettes. Aucune lacune n'est comblée en attribuant à tous les modèles les fonctions du manuel général.