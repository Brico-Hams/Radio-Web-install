# Manuel F4HWN (FH4) : guide des menus Bricohams

Manuel de référence du firmware F4HWN (FH4) pour Quansheng UV-K5 et UV-K6 :
verrouillage, rétroéclairage et les 68 menus de l’appareil. Édition Bricohams
du 8-11-2026. [Manuel complet en PDF](../../manuals/Manual_F4HWN_FH4_Bricohams_v2.pdf)
(13 pages ; il inclut l’annexe imprimable de référence rapide de 3 pages,
pages 11-13). Le PDF est en espagnol.

## D’abord : activez ALL

Appuyez sur MENU et sélectionnez `ALL` avant d’utiliser ce guide. Sans ALL, tous
les menus n’apparaîtront pas.

1. Appuyez sur la touche MENU de l’appareil.
2. Sur l’écran de sélection, cherchez l’option ALL.
3. Confirmez ALL, puis entrez dans le menu général pour voir toutes les options.

Si vous ne sélectionnez pas ALL, seule une partie des menus disponibles
apparaîtra, la numérotation visible peut sembler incomplète par rapport à ce
guide et le nombre total d’options peut varier selon la version et la
compilation du firmware. Après avoir sélectionné ALL, utilisez le guide par nom
de menu et pas seulement par numéro.

## Portée et numérotation

F4HWN (FH4) est un firmware personnalisé développé par Armel, F4HWN, pour la
famille Quansheng UV-K5 et ses variantes compatibles, y compris l’UV-K6. Il
apporte des améliorations de l’interface, de la réception, des touches
configurables, du balayage et de la gestion de l’énergie. La disponibilité des
fonctions dépend à la fois de l’appareil et des options de compilation.

Les 68 entrées suivent l’ordre éditorial du manuel, pas la numérotation
universelle de toutes les versions F4HWN. La liste réelle peut changer selon
les compilations. Repérez toujours les réglages par leur nom court (mnémonique)
si le numéro ne correspond pas, et vérifiez `SysInf` pour savoir quelle
compilation est installée. Certaines options citées sont conditionnelles ou
peuvent afficher des libellés différents.

Note Bricohams : les images de cet installateur web sont F4HWN v6.1.0 pour
UV-K5 V3 / UV-K1 (éditions Bricohams dans des slots). Les menus se repèrent par
leur mnémonique et les options dépendent de la compilation.

Écart de numérotation signalé par le manuel lui-même : la section 2.3 du PDF
numérote BLTime, BLMin et BLMax 38, 39 et 40, alors que le tableau les numérote
36, 37 et 38. Ce guide suit le tableau.

## Menus critiques pas à pas

### KeyLck (30) : verrouillage automatique

1. Appuyez sur MENU sur l’écran principal.
2. Repérez `KeyLck` avec les touches de navigation.
3. Appuyez sur MENU pour modifier et sélectionnez OFF ou une durée entre 00:15
   et 10:00, par pas de 15 secondes.
4. Confirmez avec MENU et quittez avec EXIT.
5. Attendez la durée configurée sans appuyer sur aucune touche et vérifiez le
   verrouillage. Pour déverrouiller, utilisez la combinaison prévue par votre
   édition ; sur de nombreuses variantes, c’est un appui long sur F/#.

Conseil : 00:30-01:00 pour le transport ; OFF pour une utilisation continue. La
portée de ce verrouillage dépend de `SetLck`.

### SetLck (63) : portée du verrouillage

1. Ouvrez MENU et cherchez `SetLck`.
2. Appuyez sur MENU pour modifier le réglage.
3. Sélectionnez KEYS pour verrouiller seulement les touches en laissant le PTT
   opérationnel, ou KEYS+PTT pour verrouiller aussi le bouton d’émission.
4. Confirmez, quittez et testez le fonctionnement en toute sécurité, sans
   émettre en dehors des fréquences autorisées.

Conseil : KEYS+PTT évite les émissions accidentelles pendant le transport ;
KEYS permet d’utiliser le PTT sans déverrouiller.

### BLTime, BLMin, BLMax et BLTxRx : lumière fixe

1. Cherchez `BLTime` (36 dans le tableau) et sélectionnez ON pour garder le
   rétroéclairage allumé en permanence. Autres options : OFF ou de 5 secondes à
   5 minutes, par pas de 5 s.
2. Entrez dans `BLMin` (37) : réglez la luminosité minimale ou de veille,
   normalement 0-9 ; commencez par 0-2 pour économiser l’énergie.
3. Entrez dans `BLMax` (38) : réglez la luminosité d’activation, normalement
   1-10 ; 3-5 est un point de départ pratique.
4. Vérifiez `BLTxRx` (39) : OFF, TX, RX ou TX/RX ; choisissez quels événements
   activent l’éclairage.
5. Confirmez chaque valeur et observez l’écran en veille, en réception et en
   émission autorisée. S’il s’éteint de manière inattendue, vérifiez les valeurs
   de luminosité minimale et les raccourcis d’extinction temporaire.

Autonomie : garder le rétroéclairage allumé, surtout avec BLMin/BLMax élevés,
peut réduire sensiblement la durée de la batterie. BLTime=ON avec une
luminosité élevée décharge plus vite la batterie ; pour l’usage quotidien,
essayez BLTime=10-20 s et une luminosité faible. ON est utile sur table, avec
une alimentation adéquate ou quand la visibilité prime.

## Référence des 68 menus

Organisation fonctionnelle du manuel. La numérotation peut ne pas correspondre
à d’autres compilations ; privilégiez toujours le mnémonique.

### 01-13 : paramètres de base de la radio, de l’audio et de l’émission

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 01 | `Step` | Pas de syntonisation. | 0,01 ; 0,05 ; 0,1 ; 0,25 ; 0,5 ; 1 ; 1,25 ; 2,5 ; 5 ; 6,25 ; 8,33 ; 9 ; 10 ; 12,5 ; 15 ; 20 ; 25 ; 30 ; 50 ; 100 ; 125 ; 200 ; 250 et 500 kHz, selon la compilation. |
| 02 | `Power` | Puissance d’émission du canal. La puissance réelle dépend de la fréquence, de la batterie et de l’étalonnage. | USER, LOW1-LOW5, MID et HIGH. Valeurs approximatives : moins de 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W et 5 W ; USER adopte `SetPwr`. |
| 03 | `RxDCS` | Filtre la réception au moyen de codes DCS numériques. Il doit correspondre au signal reçu. | OFF et codes normal (N) ou inversé (I) de la table standard disponible, comme D023N/D023I jusqu’à D754. |
| 04 | `TxDCS` | Envoie un code DCS pendant l’émission. Il n’offre ni confidentialité ni chiffrement. | OFF et codes DCS de la table standard en polarité N ou I. |
| 05 | `RxCTCS` | Ouvre l’audio uniquement lorsqu’il détecte la sous-tonalité analogique CTCSS sélectionnée. | OFF ou tonalités normalisées de 67,0 à 254,1 Hz, dont 88,5, 100,0 et 123,0 Hz. |
| 06 | `TxCTCS` | Ajoute à l’audio émis la sous-tonalité CTCSS choisie ; à utiliser quand un relais exige une tonalité d’accès. | OFF ou tonalités standard de 67,0 à 254,1 Hz. |
| 07 | `TxODir` | Sens du décalage d’émission. | OFF (sans décalage), + (émet au-dessus de RX) ou − (en dessous). |
| 08 | `TxOffs` | Valeur du décalage TX/RX en MHz ; réglable par pas de l’appareil. Exemple : 0,600 MHz sur un relais qui l’exige. | Nominalement entre 0 et 999,99999 MHz selon les limites de bande. |
| 09 | `W/N` | Largeur de canal. Adaptez-la au canal et aux règles applicables. | WIDE (env. 25 kHz) ou NARROW (12,5 kHz ; peut utiliser le réglage plus étroit de `SetNFM`). |
| 10 | `BusyCL` | Blocage sur canal occupé. | OFF permet d’appuyer sur le PTT malgré une activité détectée ; ON empêche d’émettre quand le canal est considéré comme occupé. |
| 11 | `Compnd` | Compandeur audio : compresse l’audio à l’émission et/ou l’expanse à la réception ; il vaut mieux que les deux extrémités soient compatibles. | OFF, TX, RX ou TX/RX. |
| 12 | `Mode` | Mode de démodulation. Les modes et la capacité d’émission dépendent du matériel et de la version. | FM, AM et, si la compilation l’inclut, USB. |
| 13 | `TXLock` | Verrouillage d’émission propre au canal. | OFF autorise l’émission sous réserve des autres restrictions ; ON fait du canal un canal en réception seule. |

### 14-23 : mémoires, canaux et listes de balayage

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 14 | `ScAdd1` | Inclut le canal actuel dans la liste de balayage 1 ; il peut aussi appartenir à d’autres listes. | OFF / ON. |
| 15 | `ScAdd2` | Inclut le canal actuel dans la liste de balayage 2. | OFF / ON. |
| 16 | `ScAdd3` | Inclut le canal actuel dans la liste de balayage 3. | OFF / ON. |
| 17 | `SList1` | Paramètres de priorité/canaux de la liste 1 dans les variantes qui exposent cette entrée. La signification exacte peut varier. | Canaux mémoire programmés (0-199) et sélection sans priorité selon l’édition. |
| 18 | `SList2` | Paramètres de priorité/canaux de la liste 2 ; vérifiez le libellé à l’écran. | Positions mémoire 0-199 et désactivation de la priorité selon l’édition. |
| 19 | `SList3` | Paramètres de priorité/canaux de la liste 3. | Positions mémoire 0-199 et désactivation de la priorité selon l’édition. |
| 20 | `SList` | Liste utilisée au démarrage du balayage. | LIST [0] (canaux sans liste), LIST [1], LIST [2], LIST [3], LISTS [1,2,3] ou ALL (tous les canaux). |
| 21 | `ChSave` | Enregistre la fréquence et les réglages du VFO dans une mémoire libre ou choisie. Vérifiez avant de confirmer, car cela peut écraser des données. | Mémoire 0-199. |
| 22 | `ChDele` | Supprime le canal mémoire sélectionné. Cela affecte les données stockées : faites une copie avec CHIRP avant toute suppression en masse. | Mémoire 0-199. |
| 23 | `ChName` | Modifie le nom affiché d’un canal mémoire. | Mémoire 0-199 ; jusqu’à 10 caractères dans les versions documentées : lettres, chiffres, espaces et quelques symboles. |

### 24-32 : touches, verrouillage et économie d’énergie

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 24 | `ScnRev` | Comportement lors de la détection d’un signal pendant le balayage. | STOP (s’arrêter), CARRIER (reprendre à la fin du signal, avec une attente réglable de 0,25 à 20 s) ou TIMEOUT (reprendre après 5-120 s même si le signal continue). |
| 25 | `F1Shrt` | Fonction de l’appui court sur le bouton latéral F1. | Selon la compilation : NONE, MONITOR, SCAN, POWER, FLASHLIGHT, VOX, FM RADIO, VFO A/B, VFO/MEM, LOCK KEYPAD, 1750 Hz, BACKLIGHT et autres. |
| 26 | `F1Long` | Fonction de l’appui long sur le bouton latéral F1 ; peut être réservé au verrouillage ou au monitor. | Mêmes familles d’actions assignables que `F1Shrt`. |
| 27 | `F2Shrt` | Fonction de l’appui court sur le bouton latéral F2. | Une action de la liste disponible, par exemple SCAN, POWER, MONITOR, MUTE ou changement de RX MODE. |
| 28 | `F2Long` | Fonction de l’appui long sur F2. | Options d’assignation équivalentes, soumises aux fonctions activées dans la compilation. |
| 29 | `M Long` | Action de l’appui long sur MENU. | Peut être assignée à la lampe, au balayage, au changement VFO/mémoire, au verrouillage, à l’éclairage et à d’autres fonctions prévues par l’édition. |
| 30 | `KeyLck` | Minuterie de verrouillage automatique du clavier. La portée du verrouillage se définit dans `SetLck` (63). | OFF ou de 00:15 à 10:00 min par intervalles de 15 s. |
| 31 | `TxTOut` | Durée maximale d’émission continue (TOT). À l’échéance, il interrompt TX ; `SetTOT` contrôle la manière d’avertir. | Intervalles de 5 s, typiquement de 30 s à 15 min selon le firmware. |
| 32 | `BatSav` | Économie d’énergie du récepteur. Des valeurs plus élevées favorisent l’autonomie mais peuvent dégrader la détection des signaux brefs. | OFF ou rapports veille/activité 1:1, 1:2, 1:3, 1:4 et 1:5. |

### 33-41 : écran, rétroéclairage et contraste

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 33 | `BatTxt` | Information de batterie dans l’interface. | NONE (sans texte), VOLTAGE (tension en V) ou PERCENT (pourcentage estimé). |
| 34 | `ChDisp` | Présentation du canal. Un nom enregistré est nécessaire pour l’afficher. | FREQ (fréquence), CHANNEL NUMBER (numéro), NAME (nom) ou NAME+FREQ. |
| 35 | `POnMsg` | Écran/message de démarrage ; libellés exacts selon l’édition. | ALL/FULL (information complète), SOUND, MESSAGE, VOLTAGE ou NONE. |
| 36 | `BLTime` | Durée du rétroéclairage. ON augmente la consommation ; `BLMin` et `BLMax` modulent la luminosité. | OFF, 5 s à 5 min par pas de 5 s, ou ON (toujours allumé). |
| 37 | `BLMin` | Luminosité minimale ou de veille. 0 la réduit au minimum ou éteint la lumière en veille ; une valeur plus élevée consomme plus. | Niveaux 0-9 (certains contrôleurs affichent 0-10). |
| 38 | `BLMax` | Luminosité maximale écran actif. Utilisez le minimum lisible ; le contraste se règle à part avec `SetCtr`. | Niveaux 1-10. |
| 39 | `BLTxRx` | Activation de l’éclairage pendant la communication ; contrôle les événements d’allumage à l’émission ou à la réception. | OFF, TX, RX ou TX/RX. |
| 40 | `SetCtr` | Contraste du LCD. Réglez-le pour équilibrer lisibilité et ombrage, surtout si l’inversion visuelle est utilisée. | Valeurs 1-15. |
| 41 | `SetInv` | Inverse l’apparence de l’écran. Il ne modifie pas la consommation du rétroéclairage comme le fait `BLTime`. | OFF (normal) ou ON (inversé). |

### 42-52 : alertes, tonalités et signalisation DTMF

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 42 | `Beep` | Bip de confirmation des appuis. | OFF / ON. |
| 43 | `Roger` | Avertissement au relâchement du PTT. Respectez les usages du canal. | OFF, ROGER (bip) ou MDC (signalisation de type données dans les compilations qui l’offrent). |
| 44 | `STE` | Suppression de la queue de bruit en fin d’émission ; nécessite une compatibilité pour être efficace. | OFF / ON. |
| 45 | `RP STE` | Suppression de la queue de bruit via un relais. | OFF ou délais de 100-1000 ms (pas de 100 ms), selon la version. |
| 46 | `1 Call` | Canal d’appel rapide assigné à l’accès par raccourci/touche compatible. | Mémoire 0-199. |
| 47 | `UPCode` | Chaîne DTMF pouvant être émise à l’appui sur le PTT. | Jusqu’à 16 caractères, avec les chiffres 0-9 et les symboles DTMF autorisés. |
| 48 | `DWCode` | Chaîne DTMF pouvant être émise au relâchement du PTT. | Jusqu’à 16 caractères de l’alphabet DTMF autorisé. |
| 49 | `PTT ID` | Moment d’émission de l’identification DTMF. | OFF, UP CODE, DOWN CODE, UP+DOWN CODE ou APOLLO QUINDAR (selon l’édition). |
| 50 | `D ST` | Lecture locale des tonalités DTMF pendant la composition. | OFF / ON. |
| 51 | `D Prel` | Temps préalable de signalisation DTMF ; permet de stabiliser la liaison avant d’envoyer les tonalités. | Valeurs 3-99 unités de 10 ms (30-990 ms). |
| 52 | `D Live` | Décodeur DTMF en temps réel à l’écran. Nécessite une réception des tonalités suffisamment propre. | OFF / ON. |

### 53-60 : système, réception et réglages fins

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 53 | `VOX` | Émission activée par la voix. Testez avec le bruit ambiant ; un seuil inadapté provoque des déclenchements indésirables. | OFF ou niveaux de sensibilité 1-10. |
| 54 | `SysInf` | Informations système, normalement en lecture seule : version du firmware et données comme la tension de la batterie. Les informations exactes dépendent de la compilation. | Consultation / lecture seule. |
| 55 | `RxMode` | Gestion de la double écoute : contrôle quel VFO est écouté et lequel émet. | MAIN ONLY, DUAL RX RESPOND, CROSS BAND ou MAIN TX DUAL RX. |
| 56 | `Sql` | Niveau du squelch. 0 laisse l’audio ouvert ; des niveaux élevés exigent un signal plus fort pour ouvrir le squelch. | 0-9. |
| 57 | `SetPwr` | Définit la puissance utilisée par Power=USER (valeurs nominales). | Moins de 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W ou 5 W. |
| 58 | `SetPTT` | Comportement du PTT. Vérifiez l’état TX en utilisant ONEPUSH. | CLASSIC (maintenir appuyé pour émettre) ou ONEPUSH (basculement par appuis). |
| 59 | `SetTOT` | Forme de l’avertissement de limite de temps TX. Ne remplace pas le réglage `TxTOut`. | OFF, SOUND (son), VISUAL (écran) ou ALL (les deux). |
| 60 | `SetEOT` | Avertissement de fin d’émission. Différent de `Roger`, qui ajoute une signalisation à l’audio émis. | OFF, SOUND, VISUAL ou ALL. |

### 61-68 : interface avancée et options de compilation

| N° | Menu | Fonction | Options |
| --- | --- | --- | --- |
| 61 | `SetMet` | Style du S-mètre (indicateur d’intensité du signal). | TINY ou CLASSIC. |
| 62 | `SetGUI` | Style/taille de la police principale du VFO. Modifie la présentation, pas la sensibilité de la radio. | TINY ou CLASSIC. |
| 63 | `SetLck` | Portée du verrouillage du clavier. Fonctionne avec la minuterie `KeyLck`. | KEYS (touches seulement) ou KEYS+PTT (touches et bouton d’émission). |
| 64 | `SetTmr` | Affichage des minuteries de réception/émission. | OFF / ON. |
| 65 | `SetOff` | Extinction automatique de l’appareil. | OFF ou délai réglable de 1 min à 2 h, normalement par pas de 1 min. |
| 66 | `SetNFM` | Largeur de bande quand `W/N` est sur étroit. NARROWER n’est présent que dans les compilations qui l’incluent. | NARROW (~12,5 kHz) ou NARROWER (~6,25 kHz). |
| 67 | `SetVol` | Réglage du gain/volume interne ; n’équivaut pas à la commande physique de volume. | Niveaux 0-63 dans les compilations avec ENABLE_FEAT_F4HWN_VOL. |
| 68 | `SetKey` | Remappage d’une touche spéciale dans les variantes RescueOps. N’est pas disponible dans toutes les compilations. | MENU, UP, DOWN, EXIT ou STAR. |

## Recommandations d’utilisation

- Enregistrez avec CHIRP une copie des mémoires et de la configuration avant de
  flasher, restaurer ou supprimer des canaux : [module CHIRP F4HWN](AYUDA-QUANSHENG.md).
- Les tonalités CTCSS/DCS sélectionnent des signaux : elles n’offrent ni
  confidentialité, ni chiffrement, ni garantie de canal libre.
- Respectez toujours les limites de bande, de puissance et de licence
  applicables. La capacité technique d’émettre hors d’une bande ne vaut pas
  autorisation.
- Si une entrée change de numéro ou manque, vérifiez `SysInf` et consultez la
  compilation installée avant d’interpréter le réglage.

## Sources

- Dépôt d’origine : <https://github.com/armel/uv-k1-k5v3-firmware-custom>
- Définition de la liste et des options :
  <https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/ui/menu.c>
- Référence documentaire des menus :
  <https://deepwiki.com/armel/uv-k1-k5v3-firmware-custom/8.1-menu-item-reference>
- Pilote CHIRP avec valeurs configurables :
  <https://github.com/armel/uv-k5-chirp-driver>

Note éditoriale : guide technique indépendant préparé avec l’identité graphique
fournie de Bricohams. Il n’est pas présenté comme une documentation officielle
du développeur. Les plages et fonctions peuvent varier selon la compilation.

[Quansheng et versions](AYUDA-QUANSHENG.md) · [Options de compilation F4HWN](AYUDA-OPCIONES-F4HWN.md) · [Firmware Bricohams](BRICOHAMS-FIRMWARE.md)
