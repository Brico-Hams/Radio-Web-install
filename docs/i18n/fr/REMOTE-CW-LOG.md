# CW distant, clavier/MIDI et journal (`remote-cw.cjs`, `remote-log.cjs`, `remote-controls.js`)

Conception propre ; la liste RemoteMyShack (`data/third-party/RMS-2026-11-22.md`) sert uniquement de référence.

## Envoi CW distant (manipulateur de la radio)

| Radio | Commande | Source |
| --- | --- | --- |
| Yaesu FTX-1 | `KM{slot}{TEXT};` puis `KY0{slot};`, arrêt `KY00;`, jusqu'à 50 caractères | `docs/FTX1-KNOWLEDGE.md` lignes KM/KY |
| Icom IC-705 | CI-V `FE FE A4 E0 17 <ASCII> FD`, jusqu'à 30 caractères, arrêt = données `FF` | Guide CI-V IC-705 p.3, p.5, p.18 |
| Autres radios du catalogue capables d'émettre | Hamlib `rigctl b` / `\send_morse` | Nom Hamlib seulement ; support par modèle non sourcé (partiel) |
| Manipulateur natif Kenwood KY, Elecraft KY, QMX, (tr)uSDX, Flex, Hermes Lite 2 | pendiente de fuente | aucune source dans le dépôt |

Le texte est en majuscules, limité au jeu de caractères sourcé, et la durée est plafonnée (60 s par défaut, 120 s maximum). L'envoi est désactivé par défaut, un seul message à la fois, refusé tant que l'émetteur est bloqué (déclenchement ROS, arrêt d'urgence) et `stop()` est toujours autorisé. N'émettez jamais sans charge adaptée ou antenne. Les mémoires F1-F8 développent `{CALL}`, `{MYCALL}`, `{RST}` et `{NR}`.

## Journal

- Import/export ADIF avec les mêmes règles que l'import Android : ASCII uniquement, 16 Mo / 50000 enregistrements, pas de champ en double, champs obligatoires CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD.
- Contrôle des doublons par indicatif, bande et mode. La progression DXCC, WAS (uniquement DXCC 291), locator et POTA est comptée à partir des champs du journal ; aucune table de préfixes n'est utilisée pour déduire les entités.
- Les spots DX sont marqués `new-call`, `new-slot` ou `worked` par rapport au journal.
- Grayline : position du soleil et terminateur à tracer sur `data/world-land-110m.txt`.

## Clavier et MIDI

Les messages MIDI note et control-change (format MIDI 1.0) sont associés à des actions d'accord, de bande, de mémoire CW et d'arrêt. PTT, porteuse d'accord et amplificateur en service ne peuvent jamais être associés. Échap arrête toujours. Formats FlexControl HID et CTR2-MIDI : pendiente de fuente (les associations sont définies par l'opérateur).

## Agent et console

L’agent accepte `{"cmd":"cw","text":"CQ TEST","wpm":20,"slot":5}` et `{"cmd":"cwstop"}` sur `POST /api/cmd`. `cwEnabled` dans `remote-agent.json` vaut `false` par défaut, `cwMaxSeconds` limite le message. Un message s’arrête sur `cwstop`, sur tout relâchement du PTT ou déclenchement du ROS, quand l’opérateur perd le contrôle, quand la radio se déconnecte et quand l’agent se ferme. La console a un onglet CW (texte, WPM, mémoires F1-F8, Échap pour arrêter). Les mémoires F1-F8 sont stockées par opérateur dans l’agent (`remote-cw-memories.json`, `GET`/`POST /api/cw/memories`, 8 entrées de 50 caractères sourcés maximum), jamais dans le navigateur ; Entrée dans le champ texte envoie. Les invités en écoute seule sont refusés pour `cw` et pour les mémoires, les invités avec TX restent soumis à leurs limites de bande et de puissance, et `cwstop` n’est jamais refusé ni limité en débit. Un message qui atteint son temps maximal reçoit sa trame d’arrêt. Les modèles Icom passent par la base Hamlib car aucun transport CI-V via rigctld n’est sourcé.

## Matrice de prise en charge par radio

Union de `data/remote-station-catalog.json`, des pilotes Python et des profils Android (`Profile.kt`). `ok` = commande sourcée et câblée ; `partial` = sourcée uniquement comme base Hamlib `b` / `send_morse` (prise en charge par modèle non vérifiée ; l'agent refuse si rigctld répond par une erreur) ; `pendiente de fuente` = aucune source dans le dépôt, désactivé. Le décodage/l'émission numérique (décodeurs FT8/FT4/WSPR/CW/RTTY/PSK31/SSTV sur l'audio distant) n'est pas encore porté dans la couche partagée : `pendiente de fuente` pour toutes les radios.

| Radio | Lien | Envoi CW | Mémoires du manipulateur | Décodage/émission numérique |
| --- | --- | --- | --- | --- |
| Yaesu FTX-1 | CAT brut (`KM`/`KY`) | ok | ok | pendiente de fuente |
| Icom IC-705 | plan CI-V (guide p.3, p.5, p.18), envoyé via Hamlib | partial | partial | pendiente de fuente |
| Icom IC-7100, IC-7200, IC-7300, IC-7300MK2, IC-7410 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7600, IC-7610, IC-7700, IC-7760, IC-7800 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-7850 / IC-7851, IC-905, IC-9100, IC-9700 | Hamlib `b` | partial | partial | pendiente de fuente |
| Icom IC-R8600 | récepteur seul | sans objet | sans objet | pendiente de fuente |
| FlexRadio FLEX-6400, 6400M, 6600, 6600M, 6700 | SmartSDR CAT via Hamlib `b` ; manipulateur natif pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio FLEX-8400, 8400M, 8600, 8600M | SmartSDR CAT via Hamlib `b` ; manipulateur natif pendiente de fuente | partial | partial | pendiente de fuente |
| FlexRadio AURORA-510, 510M, 520, 520M | SmartSDR CAT via Hamlib `b` ; manipulateur natif pendiente de fuente | partial | partial | pendiente de fuente |
| Kenwood TS-590S, TS-590SG, TS-890S, TS-990S | Hamlib `b` ; `KY` natif pendiente de fuente | partial | partial | pendiente de fuente |
| Yaesu FT-710, FT-991A, FTDX10, FTDX101D, FTDX101MP, FTDX3000 | Hamlib `b` ; `KY` natif pendiente de fuente (seul le FTX-1 est sourcé) | partial | partial | pendiente de fuente |
| Elecraft K3S, K4 | Hamlib `b` ; `KY` natif pendiente de fuente | partial | partial | pendiente de fuente |
| QRP Labs QMX / QMX+, QCX / QDX | Hamlib `b` ; manipulateur natif pendiente de fuente | partial | partial | pendiente de fuente |
| DL2MAN (tr)uSDX | Hamlib `b` ; manipulateur natif pendiente de fuente | partial | partial | pendiente de fuente |
| Hermes Lite 2 | CAT piHPSDR via Hamlib `b` | partial | partial | pendiente de fuente |
| Yaesu FT-817, FT-818, FT-857, FT-897 (Android seulement) | CAT à cinq octets, aucune commande de manipulateur sourcée | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Kenwood TH-D75 (Android seulement) | CAT en lecture seule | pendiente de fuente | pendiente de fuente | pendiente de fuente |
| Quansheng UV-K5, OpenGD77, Radtel RT-950 Pro / RT-S10, AnyTone D878, TNC KISS (Android seulement) | pas de chemin station distante, pas de manipulateur CW | sans objet | sans objet | pendiente de fuente |

Xiegu n'est ni dans le catalogue, ni dans les pilotes Python, ni dans les profils Android : il n'y a donc pas de ligne.

## Carnet QSO, QRZ.com et LoTW (agent Node, propriétaire uniquement)

L’onglet « Libro QSO » de la console réutilise `remote-log.cjs` (import/export ADIF, doublons, progression DXCC/WAS/locators/POTA) via `remote-qsl.cjs`, qui conserve le carnet dans `qso-log.json` à côté de `remote-agent.json` (0600).

- La consultation QRZ.com est désactivée par défaut. Activez-la dans `remote-agent.json` : `"qrz": {"enabled": true, "username": "...", "password": "..."}`. Flux XML d’après `third_party/ftx1/Eugen68-Yaesu-FTX1-CAT-Control/.../QrzLookupHelper.java`. HTTPS uniquement, délai de 8 s, 20 consultations par minute. Identifiants et clé de session restent sur l’agent : jamais dans le stockage du navigateur, les réponses ou les journaux.
- L’envoi LoTW lance votre TQSL local : `"lotw": {"tqslPath": "C:\\chemin\\tqsl.exe", "args": ["...", "{file}"], "timeoutSeconds": 120}`. La ligne de commande de TQSL est pendiente de fuente dans ce dépôt : vous fournissez vous-même le tableau d’arguments ; `{file}` est remplacé par un ADIF temporaire des QSO en attente. Pas de shell, pas de stdin, aucun mot de passe de certificat n’est manipulé (TQSL s’en charge) et rien n’est envoyé sans clic et confirmation. Le code de sortie 0 marque les QSO comme envoyés.

## Pendiente de fuente (désactivé)

Arguments de la ligne de commande TQSL (configurés par l’opérateur, voir ci-dessus), format des lignes telnet du DX cluster, décodeurs FT8/FT4/WSPR/CW/RTTY/PSK31, SSTV sur la console web, table des préfixes DXCC, FlexControl HID.
