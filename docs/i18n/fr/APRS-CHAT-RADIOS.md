# Chat APRS sur les radios prises en charge par RadiCodex

État du chat APRS (écran **Chat APRS** du menu principal). Le chat ne parle que **KISS** : il utilise `Aprs.kt` (`Kiss`, `KissDecoder`, `Ax25Frame`, `AprsText`, `AprsMessenger`) sur un `KissLink` (`KissLink.kt`). Une radio sans APRS/KISS accessible depuis l'application **n'est pas simulée** et n'apparaît pas comme source du chat. Le même tableau est affiché dans l'application (`AprsChatRadios.kt`).

Liaisons disponibles :

- **RT-950 Pro (KISS par BLE)** : `Rt950BleKissLink`, sur `BleRt950Transport` (`ffe1`). Comportement des trames identique à celui d'avant l'extraction du chat de `Rt950Activity`.
- **KISS TCP (TNC externe)** : `TcpKissLink`, socket TCP non chiffré vers un hôte et un port saisis par l'utilisateur (Direwolf, un pont TNC). C'est la voie générique pour les radios sans KISS natif ; la radio est gérée par ce TNC, pas par RadiCodex. Délai de connexion 5 s, lecture avec délai d'attente de 500 ms, socket fermé en quittant l'écran.

## État par radio

| radio | voie APRS/KISS | état | source |
| --- | --- | --- | --- |
| Radtel RT-950 Pro, réception | KISS par BLE (`ffe1`), avec les options « KISS TNC over BLE (RX)/(TX) » activées dans la radio | en attente de test sur radio | le texte `strings_rt950.xml:57` la donne pour vérifiée, mais il n'existe aucun test enregistré de cette version sur une radio ; `Rt950Ble.kt:23-27` ; `ACKNOWLEDGEMENTS.md:34` |
| Radtel RT-950 Pro, émission RF | KISS par BLE | **désactivée par défaut (blocage du firmware)** ; uniquement avec l'interrupteur « TX expérimental » (Avancé) | `strings_rt950.xml:57` (TX « INFÉRENCE non vérifiée ») ; lalmonte/radiochat-aprs@9c7b092 ; erkanz/radtel-RT950PRO@51c84d4 ; SP3ARK/Radtel-950-Pro-Bluetooth-Programmator@a8bb41a `README.md:235-238` ; incident du 2026-11-12 |
| N'importe quelle radio + TNC KISS externe | KISS par TCP | en attente de test sur radio | `KissLink.kt` (`TcpKissLink`) ; test unitaire avec `ServerSocket` dans `AprsChatTest.kt` (ce n'est pas un test sur radio) |
| Quansheng UV-K5 / BricoHams Satellite | aucune dans RadiCodex (clonage/CAT) | non pris en charge | `Diagnostics.kt:12` |
| Quansheng UV-K10 Pro | aucune ; APRS uniquement comme plan de firmware, sans firmware | non pris en charge | `docs/UV-K10-PRO-VIABILIDAD.md:7,55` |
| Quansheng TK-11 | aucune (clonage sur le web) | non pris en charge | `docs/TK11-INGENIERIA.md` (sans APRS/KISS) |
| OpenGD77 (GD-77, GD-77S, DM-1801, RD-5R, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017, DM-32, UV008) | uniquement une balise APRS FM en TX dans le firmware ; sans réception AX.25 ni TNC | non pris en charge | `OpenGd77.kt:25-38` ; `docs/AYUDA-OPENGD77.md:384-386` |
| AnyTone D878 | aucune ; uniquement un modèle de canaux | non pris en charge | `ChannelTemplates.kt:39,265` ; `docs/AYUDA-ANYTONE.md` |
| Yaesu FT-817/818/857/897 | uniquement CAT | non pris en charge | `RigCat.kt:15-18` |
| Yaesu FTX-1 | uniquement CAT dans RadiCodex | non pris en charge | `RigCat.kt:21` ; `Diagnostics.kt:13` |
| Icom IC-705 (CI-V) | uniquement CAT dans RadiCodex | non pris en charge | `RigCat.kt:19` |
| (tr)uSDX, QRP Labs QMX/QMX+ et QDX/QDX-M | uniquement CAT (HF) | non pris en charge | `RigCat.kt:23-26` |

« Non pris en charge » signifie que RadiCodex n'a aujourd'hui aucune voie APRS/KISS pour cette radio, et non que le matériel ne dispose pas d'APRS. Si le matériel propose son propre TNC KISS (par exemple par Bluetooth ou USB), RadiCodex ne l'atteint pas : **source en attente**. Avec un TNC externe en réseau, on utilise la voie TCP.

## RT-950 Pro : émission

- Le fait que l'écriture BLE soit confirmée **ne prouve pas** que la radio émette en RF. L'émission doit être confirmée avec un **second récepteur**.
- Selon le README de [lalmonte/radiochat-aprs@9c7b092](https://github.com/lalmonte/radiochat-aprs/tree/9c7b092), certains firmwares acceptent l'écriture KISS sans activer le PTT.
- [erkanz/radtel-RT950PRO@51c84d4](https://github.com/erkanz/radtel-RT950PRO/tree/51c84d4) signale une TX fonctionnelle avec une v0.29 patchée.
- Les deux README sont cités tels que la commande les a mentionnés ; RadiCodex n'a vérifié ni leur contenu ni leurs licences (**source en attente** ; aucun code n'est réutilisé).
- Le chat n'écrit pas dans la mémoire de la radio. Les canaux 961–990 (`0x7800–0x7BFF`) restent protégés comme l'indique `docs/RADTEL-RT950-PRO.md`.

## Sécurité de l'émission

- Avant chaque envoi, l'application affiche un avertissement indiquant que le message **sera émis en RF**, avec l'origine, le destinataire, le texte et la note de la liaison, et exige une confirmation.
- L'indicatif propre est obligatoire et validé avec `Ax25Address.isValid` (1–6 caractères A–Z/0–9, SSID 0–15). L'accusé de réception automatique (ack) est également désactivé sans indicatif valide.
- Sans ack, `AprsMessenger` renvoie jusqu'à 3 fois toutes les 30 s (`Aprs.kt`).
- Limites déjà présentes dans le dépôt : texte de 1 à 67 caractères ASCII sans `{ | ~` (`AprsText`), chemin de jusqu'à 8 répéteurs (`Ax25Frame.encode`).
- Limites de la liaison RT-950 Pro, selon le README de erkanz/radtel-RT950PRO@51c84d4 (elles ne sont pas dans le dépôt) : maximum 182 octets AX.25, 6 répéteurs et 127 octets d'information. Elles sont appliquées dans `Rt950BleKissLink` (`Ax25Limits.RT950`). Pour un TNC TCP générique, seule la limite de 8 répéteurs s'applique ; autres limites : **source en attente**.
- Émettre exige une licence de radioamateur.
- **RT-950 Pro, réception seule par défaut :** `Rt950BleKissLink.send()` refuse d'écrire sauf si l'interrupteur « TX expérimental (risque de blocage du firmware) » (Avancé, désactivé, avec avertissement) est actif. Sans lui, il n'y a ni ack automatique ni renvois. Les renvois sont annulés immédiatement si la liaison BLE se ferme ou si une écriture échoue. Le TNC KISS TCP n'est pas concerné.
- Après toute session de clonage/copie/écriture (`Rt950Activity`), il est demandé d'éteindre et de rallumer la radio avant d'utiliser KISS ; l'avertissement apparaît aussi dans le chat jusqu'à ce que l'utilisateur confirme « J'ai redémarré la radio ».

## Source en attente

- Contenu et licence des README de lalmonte/radiochat-aprs@9c7b092 et erkanz/radtel-RT950PRO@51c84d4 (cités, non vérifiés).
- Émission RF du RT-950 Pro avec l'option « KISS TNC over BLE (TX) » sur chaque firmware.
- Voie KISS/APRS propre du FTX-1, de l'IC-705, de l'UV-K10 Pro, de l'AnyTone D878 et du TK-11.
- Limites AX.25 d'un TNC externe concret.

## Tests sur radio

| Date | Radio | Test | Résultat |
|---|---|---|---|
| 2026-11-12 07:30 | Radtel RT-950 Pro (firmware non identifié), S20 FE, liaison KISS par BLE | Message APRS de EA5KAO à EA5KAO, « RadiCodex prueba APRS 1 », avec 3 tentatives à intervalles de 30 s. Second récepteur : SDR BricoHams, récepteur 3, 144,800 MHz, packet. | **Non concluant.** L'application a écrit la trame par BLE, mais le SDR de contrôle était sur 436,795 MHz NFM (profil satellites 70 cm) et non sur 144,800 MHz packet, il ne pouvait donc pas la recevoir. |
| 2026-11-12 07:50 | Radtel RT-950 Pro (firmware non identifié), avec l'APRS de la radio sur le canal A à 144,800 MHz | Le même message, « RadiCodex prueba APRS 2 », avec 3 tentatives. | **Non concluant.** La trame a été écrite par BLE, mais le SDR de contrôle était toujours sur 436,795 MHz NFM et non sur 144,800 MHz packet ; répéter avec le récepteur sur 144,800 packet. |
| 2026-11-12 09:44 | Radtel RT-950 Pro, APRS sur le canal A à 144,800 MHz | « RadiCodex prueba APRS 3 », 4 tentatives entre 09:44:10 et 09:45:40. Second récepteur : SDR BricoHams, V3, profil « 144,800 MHz · APRS 2 m », NFM avec décodage packet secondaire ; panneau de paquets surveillé depuis le navigateur. | **Non reçu.** Le panneau n'a montré aucune trame en environ 5 minutes, ni de EA5KAO ni d'autres stations. La chaîne de décodage du SDR (antenne du V3 en 2 m et direwolf) n'est donc pas vérifiée non plus. Il reste à faire un contrôle indépendant : écouter l'audio du SDR pendant l'émission ou regarder la LED de TX de la radio. |
| 2026-11-12 10:13 | Radtel RT-950 Pro, nouveau mode KISS (commit 9064001) : sans déverrouillage `ff31`, écriture sur **FF31** | « RadiCodex prueba APRS 4 », 4 tentatives. GATT réel : MTU 23 (refuse 247), `ff31` écriture avec réponse uniquement, `ffe1` lecture, écriture avec et sans réponse, et notification. | **Non reçu** sur le SDR (V3, 144,800, packet). |
| 2026-11-12 10:21 | Idem, écriture sur **FFE1** | « RadiCodex prueba APRS 5 », 4 tentatives. | **Non reçu.** Le SDR n'a décodé aucune trame APRS de personne depuis 09:41 : la chaîne de réception du SDR en 2 m reste non vérifiée. |
| 2026-11-12 10:24 | Radtel RT-950 Pro, sans RadiCodex : balise lancée depuis le menu APRS propre de la radio, avec le canal A à 144,800 MHz | Contrôle de référence. | **La radio n'émet pas :** la LED de TX ne s'allume pas et le SDR ne reçoit rien. Avec cette configuration ou ce firmware, la TX APRS de l'unité ne fonctionne pas, même depuis son propre menu. C'est pourquoi les tests 1–5 ne permettent pas d'évaluer RadiCodex. |
| 2026-11-12 (après-midi) | Radtel RT-950 Pro, envoi depuis RadiCodex par KISS BLE | Envoi d'un message APRS depuis le chat. | **Incident : le firmware de la radio s'est figé** (rapport de l'utilisateur). Depuis, la liaison RT-950 est en réception seule par défaut. |

**Conclusion (2026-11-12) :** la TX APRS du RT-950 Pro de cette unité reste **non prise en charge dans son état actuel**. Le défaut est dans la radio (configuration ou firmware non identifié), pas dans RadiCodex. Avant de retester le chat, il faut obtenir que la balise propre de la radio allume la LED de TX et apparaisse sur un second récepteur, par exemple en identifiant le firmware ou en essayant le patch d'erkanz pour la v0.29. Depuis RadiCodex, il faut utiliser le mode KISS sans déverrouillage (commit 9064001).

## Diagnostic final RT-950 Pro (2026-11-14)

Réalisé selon le manuel officiel du fabricant ([radtel-950PRO_2.pdf](https://cdn.shopify.com/s/files/1/0564/8855/8800/files/radtel-950PRO_2.pdf?v=1756451146), tableau des menus : APRS Set → 1. APRS ON/OFF ; 5. Advanced → 5. TNC Type OFF/KISS ; User Key → PF2 → Beacon TX) :

| Vérification | Résultat |
|---|---|
| APRS ON, TNC Type = KISS, Beacon Setup avec indicatif et position fixe, PF2 = Beacon TX | Configuré dans la radio |
| PTT A sur 145,500 MHz (voix) | **Émet** (LED rouge) |
| PF2 (Beacon TX) avec le canal A sur 144,800 MHz | **N'émet pas** (pas de LED rouge) ; le SDR (V3, 144,800 MHz, packet) ne reçoit rien |

**Conclusion :** la radio émet sur le canal A, mais n'émet pas d'APRS, pas même sa propre balise. C'est un défaut de cette unité ou de son firmware (version non identifiée), pas de RadiCodex. Dans RadiCodex, la TX vers le RT-950 reste désactivée par défaut, avec la liaison KISS en réception seule. Pour réessayer, il faut identifier le firmware et consulter Radtel ou essayer un firmware qui documente la TX APRS, comme le patch d'erkanz pour la v0.29.
