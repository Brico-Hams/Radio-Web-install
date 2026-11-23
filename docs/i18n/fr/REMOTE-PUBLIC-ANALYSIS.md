# Analyse des fonctions publiques de RemoteMyShack

Traduction de `remote-station/docs/analisis-publico.md` (source de référence en espagnol).

## Portée et limites

Revue le 20 novembre 2026 à partir des pages publiques liées ci-dessous et des
images fournies dans le contexte. Cette analyse recense des affirmations
commerciales et des catégories fonctionnelles ; elle n'inspecte pas le code du
service, ne contourne aucun contrôle et ne valide pas son fonctionnement de
manière indépendante. Aucun code, marque, texte, ressource graphique ni
protocole privé ne sera copié. L'interface de BricoHams a sa propre identité et
son propre design.

La liste du fabricant n'est pas une spécification de compatibilité pour
BricoHams. La bêta Yaesu indiquée sur la page du FTX-1 y est déclarée comme
fondée sur la documentation, sans test du fabricant de ce produit.

## Catégories annoncées publiquement

| Catégorie | Description annoncée | État BricoHams |
|---|---|---|
| Console web responsive/PWA | Navigation depuis téléphone, tablette et ordinateur ; installation sur l'écran d'accueil | Implémentée : `remote.webmanifest`, `remoto.webmanifest`, `remote-sw.js` (fichiers statiques uniquement, jamais `/api` ni jetons) et `remote-station/apps/web-console/public/sw.js` |
| Contrôle CAT | Fréquence, VFO/split, bandes, modes, filtres, RIT/XIT et DSP/gains selon la radio | Implémenté via `rigctld` dans `remote-agent.cjs` ; extensions par radio uniquement avec source (`remote-catalog.cjs`) |
| Scope et waterfall | Scope de la radio, réglage et sélection du signal pour l'accord | Partielle : waterfall local dans la console ; pas de waterfall dans l'« écoute publique » (pendiente de fuente) |
| Audio | Réception à faible latence et audio TX depuis micro/casque | Implémenté (RX et TX avec lease dans `remote-agent.cjs`) ; le TX d'un invité exige une autorisation explicite |
| Périphériques d'accord | FlexControl, CTR2-MIDI et clavier/manipulateur, selon la page publique | En attente |
| Accessoires de station | Amplificateurs, tuner, commutateurs, relais, PDU et rotors | Partielle : rotor (`rotor.py`, Android `Rotor*`) ; le reste en attente |
| Multi-radio | Sélection de plusieurs équipements par station | Partielle : registre des radios, lease/PTT par radio et `GET /api/radios` dans `remote-ops.cjs` ; un agent pilote encore un seul `rigctld` |
| Rôles/invités | Invités avec permissions par radio, écoute seule ou émission, et limites | Implémenté dans l'agent Node : jeton propre par invité, bandes et puissance max. appliquées dans l'agent, révocation (`remote-ops.cjs`, `/api/guests`) ; pas d'UI d'invitation ni Python/Android |
| Journal et exploitation | Carnet ADIF, cartes, diplômes, cluster DX, alertes, historique TX | Partielle : historique TX avec CSV (`/api/txlog.csv`) ; le reste en attente |
| Modes numériques | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR et RADE, selon l'offre/le produit | Partielle : WSJT-X limité (voir `REMOTE_STATION.md`) ; le reste en attente |
| Sécurité TX | Libération à la perte de lien, délai maximal et exclusion d'opérateur | Implémentée : battement 1 s, limite de durée, ROS, un seul opérateur, libération au masquage/perte de focus/arrière-plan (web et Android) |
| Allumage/extinction à distance | Allumer/éteindre la radio | Partielle : extinction FTX-1 `PS0` (`docs/FTX1-KNOWLEDGE.md`) avec confirmation dans l'agent Node ; IC-705 `18 00`/`18 01` seulement comme constructeur testé en Python (`icom_civ.py`), non câblé ; le reste pendiente de fuente |
| Écoute publique | Audio en écoute seule | Implémentée, désactivée par défaut, sans contrôle et avec limitation de débit (`listenLive`) |
| Mise à jour de l'agent | Avis de nouvelles versions | Implémentée, opt-in : uniquement les releases GitHub, signature Ed25519 + SHA-256, jamais d'installation sans consentement |
| Réseau | Agent à connexion sortante, lien chiffré direct ou relais | Implémentée (`remote-relay.cjs`, TLS) |
| Applications | Web mobile et application Apple TV en écoute seule | Web/Android implémentés ; Apple TV hors périmètre |

Comparaison des radios : les 44 modèles de la liste du tiers (revue le
22 novembre 2026 : 17 Icom, 13 FlexRadio, 4 Kenwood, 7 Yaesu, 2 Elecraft et
Hermes Lite 2) figurent dans `data/remote-station-catalog.json` (IC-7850 et
IC-7851 partagent une entrée). BricoHams ajoute en outre (tr)uSDX, QMX/QMX+ et
QCX/QDX. L'allumage/extinction à distance n'a de source que pour l'extinction
du FTX-1 (`PS0`) et pour l'IC-705 (CI-V `18 00`/`18 01`, guide CI-V de l'IC-705
p. 5 et p. 18 ; constructeurs dans
`remote-station/bricoham_remote_station/drivers/icom_civ.py`) ; le reste reste
« pendiente de fuente ».

Les capacités, niveaux d'offre, prix et compatibilités décrits appartiennent au
produit analysé. Ils ne sont pas répliqués comme spécification ni présentés
comme des fonctions de BricoHams.

La liste du tiers comprend 44 modèles Icom, FlexRadio, Kenwood, Yaesu, Elecraft
et Hermes Lite. Le propriétaire a ajouté TRuSDX et QMX+ comme candidats de
BricoHams ; la prise en charge de ces deux modèles n'est pas attribuée au tiers.
Les 46 candidats figurent dans la [matrice de connexions](../../../remote-station/docs/radio-conexiones-candidatas.md).

## Critères pour une alternative propre

1. Prioriser l'observabilité, le contrôle RX et une documentation reproductible.
2. Séparer le contrôle CAT, les flux audio, la station et la console par des
   contrats versionnés.
3. Implémenter chaque famille/modèle uniquement avec des références publiques et
   des tests.
4. Maintenir le PTT/TX inactif jusqu'à autorisation expresse et tests de
   sécurité sur matériel.
5. Prioriser un web responsive/PWA pour l'opérateur ; héberger dans l'agent une
   UI locale de configuration, sans permettre au navigateur de contourner les
   limites de l'agent.
6. Utiliser un client Android natif distinct si l'USB Host/OTG devient une voie
   d'agent ; cette voie n'est pas présumée pour tous les téléphones.

## Sources primaires

- [RemoteMyShack : fonctions, sécurité et radios](https://www.remotemyshack.com/#pricing)
- [RemoteMyShack : fiche publique Yaesu FTX-1](https://www.remotemyshack.com/radios/yaesu-ftx-1)
- [Hamlib : backend FTX-1](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1)
- [Hamlib : notes de version 4.7](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Hamlib : documentation de `rigctld`](https://github.com/Hamlib/Hamlib/blob/master/doc/man1/rigctld.1)
- [DL2MAN : (tr)uSDX, CAT et streaming](https://dl2man.de/5-trusdx-details/)
- [QRP Labs : QMX+ et manuel CAT](https://qrp-labs.com/qmxp.html)

La fiche technique FTX-1/SPA-1 indique quelles preuves proviennent de Hamlib et
quelle vérification primaire/matérielle reste en attente.
