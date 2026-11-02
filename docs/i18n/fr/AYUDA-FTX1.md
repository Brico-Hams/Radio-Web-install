# Guide Yaesu FTX-1 : mémoires et configuration

L'éditeur web FTX-1 Bêta lit, modifie, copie et écrit les mémoires et les
réglages du menu du Yaesu FTX-1 depuis le navigateur, via le port CAT USB et Web
Serial. Il n'utilise que les commandes documentées dans le manuel officiel Yaesu
« CAT Operation Reference Manual » du FTX-1. Il ne remplace pas ADMS ni le
logiciel Yaesu et n'envoie aucune donnée à un serveur.

## Prérequis et connexion

- Chrome ou Edge sur `localhost` ou en HTTPS (Web Serial).
- Firmware MAIN 1.08 ou ultérieur : le manuel indique que le CAT ne fonctionne
  pas avec les versions antérieures.
- Câble USB-C vers la radio. Windows affiche deux ports « Silicon Labs Dual
  CP210x » ; choisissez l'`Enhanced COM Port` (CAT-1).
- Fermez tout autre programme CAT (WSJT-X, logiciels de log, cat-ftx1) avant de
  vous connecter.
- Vitesse : celle du menu `CAT-1 RATE` de la radio. Par défaut 38400 bps.

À la connexion, la page envoie `ID;` et exige la réponse `ID0840;` du FTX-1.
Elle envoie ensuite `AI0;` pour désactiver l'information automatique pendant le
travail.

## Mémoires

« Lire les mémoires » interroge les canaux choisis (1-99) avec `MR` et le nom
avec `MT`. Un canal vide répond `?;` et s'affiche comme libre. Vous pouvez
modifier :

| Champ | Commande | Valeurs |
|---|---|---|
| Fréquence | `MW` | 0.030000-470.000000 MHz |
| Mode | `MW` | LSB, USB, CW-U, CW-L, FM, FM-N, AM, AM-N, RTTY, DATA, PSK, C4FM |
| Tonalité | `MW` | OFF, CTCSS ENC/DEC, CTCSS ENC, DCS, PR FREQ, REV TONE |
| Décalage | `MW` | Simplex, + ou - |
| Nom | `MT` | Jusqu'à 12 caractères ASCII |

Le clarifier est conservé tel qu'il a été lu. La fréquence de la sous-tonalité,
le code DCS et la valeur du décalage ne font pas partie de `MR`/`MW` : ce sont
des réglages FM globaux du menu (`TONE FREQ`, `DCS CODE`, `RPT SHIFT(144MHz)`,
`RPT SHIFT(430MHz)`) modifiables dans la section de configuration. Aucune
commande documentée ne permet d'effacer un canal : un canal occupé ne peut pas
être vidé depuis la page web.

« Copier le canal » duplique un canal à une autre position de l'éditeur.
« Exporter CSV » crée un CSV aux colonnes CHIRP ; « Importer CSV » accepte des
CSV CHIRP ou OpenGD77 avec des canaux FM et les place à partir du canal de
départ indiqué. Les tonalités d'origine sont perdues à l'import : vérifiez-les
avant d'écrire.

## Configuration de la radio (menu)

Le tableau est généré à partir du tableau 3 (MENU Chart) du manuel avec
`scripts/build-ftx1-menu.py`. Chaque réglage est lu avec `EX` et écrit avec la
même commande, en respectant le nombre de chiffres et les valeurs documentées.
Les éléments marqués « - » dans le manuel ne sont pas proposés. Restent en
lecture seule les réglages qui peuvent couper la liaison CAT (vitesses,
temporisations et bits d'arrêt CAT, port TUN/LIN), le réglage de référence
`REF FREQ ADJ`, la destination APRS fixe et l'état Bluetooth.

## Sauvegarde, simulation et écriture

L'écriture reste bloquée tant que trois étapes ne sont pas faites dans la même
session :

1. Lire depuis la radio.
2. Télécharger la sauvegarde JSON de cette lecture (`bricohams-ftx1-backup`).
3. Appuyer sur « Simuler l'écriture » et vérifier le tableau des différences.

Seuls les canaux ou réglages modifiés sont envoyés. Chacun est relu et comparé à
ce qui a été envoyé ; si la radio répond `?;` ou une valeur différente,
l'écriture s'arrête et indique le canal ou le réglage. Pour annuler, chargez la
sauvegarde JSON avec « Restaurer la sauvegarde JSON », simulez et écrivez de
nouveau.

## Limites

- Uniquement les canaux mémoire 1-99. PMS, 5 MHz, canal d'urgence et mémoires
  split (`MZ`) ne sont pas modifiés.
- Le README de cat-ftx1 signale que certaines réponses réelles du FTX-1
  diffèrent du manuel. Essayez d'abord sur un canal libre et gardez toujours la
  sauvegarde.
- Le manuel Yaesu n'est pas distribué avec ce projet.
