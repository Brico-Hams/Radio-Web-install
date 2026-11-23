# Station distante intégrée

Le développement original BricoHam Remote Station est incorporé sous
`remote-station/` dans **Bricohams Radio Workspace / RadiCodex**.
Le code propre, ses tests, ses documents et ses projets mobiles sont conservés intégralement,
sans caches, SDK locaux, secrets ni binaires de compilation.
La licence racine GPL-3.0-or-later et les mentions MIT du composant sont conservées ;
les licences des dépendances et des ressources tierces ne sont pas modifiées.

## Quand utiliser chaque implémentation distante

Le projet contient deux stations distantes indépendantes :

| Nom dans l'interface | Code | À utiliser quand |
| --- | --- | --- |
| **Station distante (hôte/agent Python)** | `remote-station/`, `station.html` | Vous avez besoin d'un hôte HTTPS coordinateur, d'agents Python headless et de clients web/Android/iOS. Le client Android se contente de se connecter. |
| **Remote shack (rigctld, desktop)** | `remote-agent.cjs`, `remote-station.cjs`, `remote-relay.cjs`, `remoto.html` (README : «Remote shack») | Vous voulez piloter une radio via Hamlib `rigctld` depuis l'application de bureau/Raspberry Pi, avec relais propre, audio Opus et le coupleur FTX-1. |

Elles ne partagent ni ports ni configuration (la seconde utilise `~/.radicodex/`). Les
catalogues de radios et l'analyse CAT FTX-1 sont dupliqués volontairement : ils n'ont
pas été unifiés car les formats diffèrent. Les protections TX (TX
désactivé par défaut, protection contre un ROS élevé, limites de temps
d'ATAS/accord, arrêt d'urgence et chiens de garde PTT) sont maintenues dans les deux.

## Intégration et limites

- La navigation web ne renvoie qu'une seule fois vers **Station distante (hôte/agent Python)**.
  Elle prépare une URL HTTPS validée
  et ouvre le client servi par l'hôte ; elle ne collecte ni n'envoie de jetons. L'entrée
  **Remote shack (rigctld, desktop)** n'apparaît que sur le bureau.
- RadiCodex Android inclut un écran HTTPS interne : sans ponts JavaScript
  natifs, accès aux fichiers ni contenu mixte. Il fige l'origine sélectionnée,
  rejette les certificats invalides et ne demande l'autorisation que pour le microphone.
  En passant en arrière-plan, il détruit la page/session, sans reconnexion automatique.
- Le client Android dédié et le projet iPhone/iPad restent dans
  `remote-station/apps/web-console/`, avec la marque, les couleurs, la typographie et les ressources
  officielles BricoHams. iOS nécessite un Mac/Xcode pour compiler et signer.
- L'hôte coordinateur et les agents headless s'exécutent séparément.
  L'[agent Android USB indépendant](../../../remote-station/docs/agente-android-usb.md)
  a son propre APK, une liaison WSS sortante et un CAT FTX-1 en lecture seule, avec
  sélection explicite et diagnostic ES/EN/FR/PT. Son acceptation OTG physique,
  l'audio, le PTT, le CW, les modes numériques et les accessoires restent en attente ; il n'est pas confondu
  avec le client et ces fonctions ne sont pas présentées comme implémentées.
  Le serveur Node local de firmware **n'est pas publié sur Internet** et
  n'est pas transformé en proxy distant. Aucune copie/codeplug ni aucun fournisseur n'est exposé.
- Les connecteurs USB, la mémoire, le firmware et les fonctions natives
  existants ne sont pas modifiés. Les profils CAT de station sont indépendants et opt-in.
- Les identifiants de protocole, les variables `BRICOHAM_*`, les paquets
  Python et les application IDs sont conservés pour éviter de casser la configuration/les clients existants.
  Les alias `bricohams-station-host` et `bricohams-station-agent` sont ajoutés.

## Compiler et exécuter

À la racine, avec Node 22 et Python 3.12 ou supérieur :

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

Les paquets d'hôte et d'agent sont générés dans `remote-station/dist/` (dossier local, ignoré par git : les artefacts ne sont pas versionnés).
Sous POSIX, utilisez `python3` et `remote-station/.venv/bin/python`.
Le [guide de déploiement sécurisé](../../../remote-station/docs/despliegue-seguro.md)
décrit TLS/CA/hostname, le mTLS optionnel et des secrets séparés par rôle/liaison.
L'[aide multilingue](../../../remote-station/docs/help/README.md) est intégrée
au client HTTPS et aux clients dédiés.

L'URL de connexion ne contient ni jetons, ni chemins, ni paramètres. Elle doit pointer vers
l'hôte HTTPS qui sert la console compilée, pas vers le port de l'agent.
Pour RadiCodex WebView, une chaîne de certificats de confiance pour
Android est exigée ; une erreur TLS n'est jamais ignorée. Le client dédié Capacitor exige
les origines exactes documentées sur l'hôte.

## Validation et sécurité RF

CAT, audio, PTT, rotors, puissance et ATU conservent leurs interlocks et états
documentés. Le PTT exige un opt-in et des limites indépendantes ; la perte du client
active le watchdog, ce qui ne garantit pas un arrêt physique. Vérifiez le RX sur la radio.
Aucune acceptation USB/RF/mobile ni compatibilité complète n'est déclarée du seul fait de disposer
d'un profil. Le CW distant actif, le WSJT-X actif, le scope natif FTX-1 et l'agent
Android headless OTG restent en attente ; ils ne sont pas simulés comme des fonctions réelles.
## Accessoires de station

La couche d’[accessoires de station](../../../remote-station/docs/accesorios-estacion.md) supervise
les coupleurs et amplificateurs externes dans l’atelier Node et dans l’agent Python
(`GET/POST /api/v1/accessories`). L’amplificateur démarre en STANDBY et y revient en cas de
déconnexion, ROS élevé, défaut, bail perdu, changement de bande ou arrêt d’urgence.
L’accord ne démarre que sur demande explicite, à 10 W ou moins et pour une durée limitée.
Les appareils sans source de protocole (par exemple PGXL) figurent comme `pendiente de fuente`.

## Diagnostic

Tous les composants disposent d'un journal technique minimisé et d'options d'envoi
avec consentement. Consultez [diagnostic et confidentialité](DIAGNOSTICS.md) pour le
contrat fermé, le récepteur HTTPS, les rôles, la rétention et les différences entre clients.

### Bibliothèque native Android partagée

`android/station-core` contient le journal minimisé et le validateur HTTPS auparavant
couplés à RadiCodex. Elle conserve le paquet Kotlin public pour ne pas altérer les appels
ni les écrans existants ; elle reçoit explicitement le composant/la version, valide les deux
par rapport au contrat et rejette les changements d'identité au sein d'une même application.
Les rapports stockés d'un autre composant ou d'une autre version ne sont pas ré-enveloppés comme les siens.
Le contrat généré est incorporé comme asset de la bibliothèque dans chaque APK consommateur.
L'envoi reste désactivé par défaut et les identifiants restent uniquement en mémoire.
Ce n'est pas encore un agent Android OTG exécutable : USB, service et liaison avec l'hôte
restent en attente. L'APK RadiCodex conserve son identité et son client HTTPS existant.
Les tests de la bibliothèque et de connexion/diagnostic RadiCodex passent, ainsi que les deux
lints et la compilation de l'APK. Les 53 ressources générées, la signature debug v2 et le contrat
JSON dans l'APK mis à jour sont vérifiés. La revue de sécurité limitée à cette extraction
ne trouve aucune vulnérabilité confirmée ; elle ne certifie pas le produit complet.

## Sources upstream et première vérification USB FTX-1

Des sources publiques GitLab et des liens vers Hamlib maintenu ont été examinés, sans accéder
au Patreon privé/payant ni exécuter de code téléchargé. Patreon n'a fourni aucun
contenu vérifiable ; la recherche GitLab est délimitée, pas un inventaire complet.
Les [bugs Yaesu](../../../remote-station/docs/hardware/yaesu-cat.md),
[risques Xiegu](../../../remote-station/docs/hardware/xiegu-candidates.md) et
[restrictions OpenGD77](../../../remote-station/docs/hardware/opengd77-usb.md)
documentent les preuves, licences, candidats et limites sans copier de code/tables.
FTX-1 exige désormais ID0840 avant et après les réglages de fréquence/mode/puissance ;
un modèle incorrect ou une identité perdue empêchent de confirmer le réglage, sans nouvel essai.
**230 tests Python** passent, ainsi que Ruff et la vérification des 53 ressources générées.

La [vérification USB réelle](../../../remote-station/docs/hardware/ftx1-spa1.md) a résolu
un pilote absent avec un paquet officiel signé et vérifié 15 requêtes via
l'interface Enhanced à 38400/8N1, sans setters ni TX. IF renvoie P10=3, non documenté
dans 2508-C : il est rejeté et le PTT reste bloqué lorsqu'il ne peut pas vérifier un
état sûr. Aucune acceptation RF, audio, reconnexion, firmware ni produit complet n'est déclarée.
Le wheel et le ZIPAPP mis à jour ont été vérifiés hors de l'arborescence source : ils rejettent un
ID d'un autre modèle sans setters et lisent ID0840 sur l'unité USB réelle. Le bundle
partagé reste identique dans le wheel et l'APK dédié ; les quatre SHA256 coïncident.
La revue de sécurité délimitée à la garde d'identité FTX-1 n'a trouvé aucune
vulnérabilité confirmée ; ce n'est pas une certification globale.

## Bureau opérationnel

Le client partagé web/Android/iPhone/iPad présente les contrôles de l'agent
avant les catalogues et les références de protocoles. Les liens CAT/PTT/rotor/puissance/
logbook font défiler la page ; ils n'émettent pas de commandes et ne modifient ni les permissions ni les sessions.
La carte du coordinateur n'autorise pas le TX et la démonstration reste identifiée.
Les composants conservent leurs keys, handlers et mécanismes de fermeture.

L'[étude comparative d'UX](../../RADIO_UX_RESEARCH.md) documente les sources publiques,
les décisions originales et les limites. Ce n'est ni une copie de produits commerciaux,
ni un classement d'utilisateurs, ni une acceptation visuelle/matérielle. Les contrôles principaux
ont un minimum de 44 px ; les vérifications tactiles et visuelles restent en attente.
Cette étape ne termine pas la refonte de tous les écrans natifs du Workspace.
Le portail organise radio/agent, hôte et opération en trois étapes, sans réseau ni
stockage d'identifiants. Dans RadiCodex, la configuration se replie pendant
la connexion sans recréer la WebView ; la déconnexion et l'état restent visibles.
Lors de la déconnexion ou du passage en arrière-plan, la configuration revient, sans reconnexion.

## Vérification de cette intégration

- Cible Node : **483 tests réussis**, y compris installateurs, traductions,
  contrats de diagnostic, origine locale et livraison HTTPS réelle.
- Hôte/agent Python : **212 tests réussis** et Ruff sans erreurs.
- Client partagé : **61 tests réussis**, lint et compilation TypeScript/Vite.
- RadiCodex : six tests ciblés de connexion/diagnostic, compilation de l'APK et lint.
- Client Android dédié : APK compilé et lint ; projets Android/iOS
  synchronisés avec le même client compilé.
- Les deux APK sont **debug**, avec signature APK v2 vérifiée : pas de signature de production.
- Wheel installé hors de l'arborescence source : module de diagnostic, CLI et console
  empaquetée vérifiés. ZIPAPP headless exécuté avec `--help`.
- Revue de sécurité limitée au diagnostic : aucune vulnérabilité
  confirmée. Ce n'est pas une certification du reste du produit.
- Validation visuelle avec le navigateur intégré bloquée par un timeout CDP.
  Le comportement du panneau Workspace est vérifié par des tests DOM,
  sans leur attribuer de vérification visuelle.

Incrément CAT ultérieur : FTX-1 intègre des lectures KS/KP/KR/BI confrontées au
manuel primaire, sans keying ni écriture de mémoires. 23 tests Python ciblés
et dix tests client sur la connexion, la navigation et les profils régénérés passent ;
Ruff, lint/build et la vérification des 53 ressources générées sont corrects.
Le wheel et le ZIPAPP exécutent les décodeurs empaquetés ; bundle partagé identique
dans le wheel, l'APK et les assets Android/iOS, vérifié par SHA256.

Les paquets se trouvent dans `remote-station/dist/` : sous-répertoires `agent/`
et `host/`, plus les deux APK debug. `SHA256SUMS` permet de vérifier l'intégrité.
L'acceptation physique USB/RF, les tests sur appareils mobiles, la compilation/signature
iOS et les fonctions expressément en attente ne sont pas couvertes par ces résultats.

## Extension Yaesu, OpenGD77 et nouveaux candidats

- Les sept Yaesu du catalogue ont des requêtes CW documentées en lecture seule.
  FT-710, FT-991A, FTDX10, FTDX101D/MP et FTDX3000 intègrent des réglages opt-in de
  fréquence, mode et consigne de puissance par modèle. ID correct, RX, coupleur
  non occupé, limite locale, déduplication et relecture sont vérifiés sans activer le TX.
  FTDX101MP admet jusqu'à 200 W de consigne ; les six autres n'héritent pas de cette limite.
  FT-991A et FTDX3000 n'inventent pas MD1 : mode secondaire null et contrôle désactivé.
  [Manuels, pages et restrictions](../../../remote-station/docs/hardware/yaesu-cat.md).
- 13 profils expérimentaux d'
  [identification OpenGD77 USB CPS](../../../remote-station/docs/hardware/opengd77-usb.md)
  sont intégrés à l'agent headless et à la console partagée. INFO uniquement, sans entrer dans/sortir de
  CPS, écrire en mémoire, transmettre ni déduire de CAT RF. Les firmwares/modèles
  inconnus sont rejetés ; les anciennes builds sans R9 ne sont pas présentées comme compatibles.
  La programmation/l'écran local d'origine du Workspace est conservé.
- [Xiegu et Lab599 étudiés](../../../remote-station/docs/hardware/xiegu-candidates.md)
  sont ajoutés comme candidats sans transport : les adresses, le framing et les détails
  de réponse en attente ne sont pas devinés à partir d'Icom, Kenwood ou Hamlib.
  Le catalogue contient 68 candidats, pas 68 radios certifiées.
- Vérification finale : **223 tests Python**, **66 du client** et **44 Node
  ciblés** réussis ; Ruff, lint et build corrects. Un abandon transitoire
  WinError 10053 d'un test de rotor a été répété isolément et la suite complète
  suivante a réussi, sans modifier le contrôleur ni les limites HTTP.
- Le ZIPAPP et le wheel mis à jour ont été exécutés hors de l'arborescence source ; les deux APK
  debug vérifient la signature v2. SHA256SUMS coïncide avec les quatre paquets. Le bundle
  actuel coïncide octet par octet entre le wheel, l'APK dédié et les assets Android/iOS.
  RadiCodex conserve son APK : il charge l'interface actuelle depuis l'hôte HTTPS,
  sans incorporer de nouveau moteur CAT dans la WebView.
- La publication reste bloquée : HTTPS ne dispose pas d'identifiants et SSH rejette
  l'authentification publickey. La clé officielle de github.com a été vérifiée dans un fichier
  isolé, sans modifier les profils SSH ni désactiver la vérification de l'hôte.

Ces incréments ne terminent ni le CW actif, ni le WSJT-X actif/broker CAT, ni l'agent Android
USB OTG indépendant, ni la signature iOS/production, ni l'acceptation physique multiplateforme.

## Langues des contrôles opérationnels

Fréquence/mode et puissance/coupleur utilisent le sélecteur ES/EN/FR/PT du client
partagé, y compris les erreurs et avertissements de sécurité. Changer de langue conserve
les lectures, les valeurs modifiées, les limites et les permissions ; cela ne remonte pas les contrôles ni n'émet
de requêtes CAT. Les références techniques liées conservent leur langue d'origine.

Vérification : **72 tests du client**, lint et TypeScript/Vite corrects ;
six nouveaux cas vérifient les changements de langue avec SUB sans mode et la limite
200 W du FTDX101MP, sans altérer les restrictions. Wheel réinstallé hors de l'arborescence
source et APK dédié recompilé avec lint et signature debug v2 vérifiés.
Le bundle coïncide par SHA256 dans le wheel, l'APK et les assets Android/iOS ; SHA256SUMS
est mis à jour pour les deux paquets concernés. ZIPAPP et l'APK RadiCodex ne changent pas.
Aucune compilation iOS, acceptation physique ni signature de production n'est attribuée.

## Commandes WSJT-X limitées

L'agent et l'hôte intègrent un POST authentifié pour Replay et Halt Tx,
exclusivement avec `--enable-wsjtx-safe-commands` local. La console partagée
web/Android/iPhone/iPad propose les deux actions en ES/EN/FR/PT. Il n'y a ni démarrage TX,
ni Reply, Free Text ou Configure ; le broker CAT et l'opération numérique complète
restent en attente. Consultez [activation et limites UDP](../../../remote-station/docs/agente-cat-wsjtx.md).

La première origine loopback Heartbeat/Status est figée jusqu'au redémarrage de
l'agent. Une origine différente, une instance expirée/fermée, des champs non
admis et des IDs répétés sont rejetés ; Replay est limité à une requête par seconde.
Cela n'authentifie pas le processus WSJT-X. La livraison déclare toujours
`sent_unconfirmed` et ne confirme pas un arrêt RF ; l'UI exige une nouvelle requête
après une erreur, sans nouvel essai. Maintenez les protections physiques et vérifiez le RX.

Vérification : **228 tests Python** et **74 du client** réussis,
y compris un POST via deux liaisons TLS validées, CORS et le rejet d'une réponse
prétendant confirmer un arrêt RF. Ruff, lint, TypeScript/Vite et 53 ressources
générées corrects. Un timeout de diagnostic Workspace lors de l'exécution
concurrente a été répété isolément puis dans la suite complète avec deux
workers ; les deux ont réussi sans modifier ce test ni ses limites.

Wheel et ZIPAPP exécutés hors de l'arborescence source ; APK dédié avec build,
lint et signature debug v2 corrects. Bundle identique dans les assets wheel/APK/Android/iOS
et SHA256SUMS mis à jour. Revue de sécurité limitée à cet incrément
et à ses helpers d'authentification/TLS : aucune vulnérabilité confirmée.
Elle ne certifie ni tout le produit, ni WSJT-X en exécution réelle, ni le matériel.

## Langues sans interrompre les contrôles actifs

PTT, rotor, audio RX et le panneau CAT/WSJT-X partagent ES/EN/FR/PT, y compris les
avertissements de sécurité et les erreurs locales de trame. Les callbacks d'arrêt et
de renouvellement conservent leur identité lors du changement de langue ; le lease n'est pas redémarré,
START/MOVE/STOP n'est pas envoyé et le graphe audio n'est pas recréé pour ce changement.
Les réponses techniques de l'agent et les erreurs externes conservent leur format/langue.

**89 tests du client**, lint et TypeScript/Vite corrects. Les nouveaux cas
vérifient PTT/rotor actifs avec renouvellement et arrêt ultérieur, l'absence de
nouvelles commandes lors du changement de langue, la conservation d'AudioContext/nœud/requête,
des erreurs de trame traduisibles sans rouvrir l'audio et la sélection CAT conservée.
Le microphone TX préparé conserve aussi son instance et sa session lors du changement de
langue ; perdre le focus le ferme toujours et demande le RX.
La vérification initiale a détecté une traduction visuelle différée dans le helper ; la traduction
et le rendu ont été séparés et le callback rendu stable avant de valider la suite complète.
Wheel réinstallé hors de l'arborescence source et APK dédié recompilé avec lint
et signature debug v2 vérifiés. Le même bundle apparaît dans wheel/APK/Android/iOS
et SHA256SUMS coïncide avec les quatre paquets. ZIPAPP et l'APK RadiCodex ne changent pas.
Aucune acceptation physique/mobile ni compilation/signature iOS n'est attribuée.
