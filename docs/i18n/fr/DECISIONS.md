# Registre des décisions (ADR)

Chaque décision indique le contexte, le choix retenu, les alternatives écartées et les conséquences.

## ADR-001 · JavaScript sans framework ni étape de compilation

- **Contexte :** l'outil gère des protocoles binaires et doit pouvoir être audité par tout radioamateur.
- **Décision :** modules JavaScript natifs, HTML et CSS, sans React, Vue, bundlers ni transpileurs.
- **Alternatives :** React/Vite (davantage de dépendances et de risques de chaîne d'approvisionnement) ou TypeScript (nécessite une compilation).
- **Conséquences :** le code lu est exactement celui exécuté et le navigateur ne charge pas `node_modules`. En contrepartie, l'état de l'interface est géré manuellement.

## ADR-002 · WebUSB et Web Serial pour communiquer avec la radio

- **Contexte :** OpenGD77 MK22/STM32 expose CDC par USB ; DM-32/UV008 et Quansheng utilisent un port série.
- **Décision :** WebUSB pour `1FC9:0094` et Web Serial pour les câbles série, comme le CPS web de référence.
- **Alternatives :** application native (installation et signature par système d'exploitation) ou Electron (grande surface d'attaque).
- **Conséquences :** fonctionne uniquement dans Chrome, Edge et Brave de bureau. Sous Windows, OpenGD77 USB nécessite WinUSB (voir [l'aide](../../../ayuda.html#drivers)).

## ADR-003 · Serveur Node local avec une seule dépendance

- **Contexte :** les téléchargements de firmware et les données des fournisseurs doivent contourner CORS, appliquer des listes d'hôtes autorisés et masquer les identifiants.
- **Décision :** `server.cjs` avec les modules standard de Node 22 (`http`, `fetch`, `crypto`) et `satellite.js` 6.0.1, version figée, comme seule dépendance.
- **Alternatives :** Express/Fastify (davantage de dépendances) ou proxy public (expose données et identifiants).
- **Conséquences :** installation par `npm ci --ignore-scripts` et risque réduit pour la chaîne d'approvisionnement.

## ADR-004 · Boucle locale uniquement, CSP stricte et liste de fichiers autorisés

- **Décision :** écouter sur `127.0.0.1:8787`, valider `Host`, fournir uniquement les fichiers énumérés et envoyer une CSP sans `unsafe-inline`.
- **Motif :** atténuer le DNS rebinding, la lecture de fichiers arbitraires et les XSS.
- **Conséquence :** `localhost` n'est pas servi : les navigations GET/HEAD sont redirigées (307) vers `127.0.0.1` pour conserver une origine IndexedDB unique ; avec un en-tête `Origin`, elles sont rejetées. Publier sur le réseau exigerait une refonte (HTTPS et authentification) et n'est pas pris en charge.

## ADR-005 · Sauvegarde automatique obligatoire avant écriture

- **Décision :** à la connexion, la calibration et le firmware ou codeplug de base sont copiés, enregistrés dans IndexedDB, hachés avec SHA-256 puis relus ; une autorisation d'écriture liée à la connexion n'est délivrée qu'ensuite. Toute erreur maintient l'écriture bloquée (*fail-closed*).
- **Alternative écartée :** sauvegarde facultative, avec risque de perte irréversible de la calibration.
- **Conséquences :** la connexion prend plus de temps (les 2 MiB d'un Quansheng à 38 400 bauds demandent 10 à 20 minutes), mais aucune écriture sans sauvegarde vérifiée.

## ADR-006 · IndexedDB et export `.rwb.json`

- **Décision :** IndexedDB du navigateur pour l'historique, export JSON avec manifeste, contenu en Base64 et empreintes.
- **Alternatives :** enregistrer les sauvegardes sur le serveur (romprait la promesse « aucun envoi ») ou File System Access API (absente de certains navigateurs).
- **Conséquences :** l'application ne chiffre pas les sauvegardes. L'utilisateur doit les exporter et protéger son profil de navigateur.

## ADR-007 · Sources officielles de firmware uniquement, sans miroirs

- **Décision :** catalogue limité aux GitHub Releases du dépôt officiel F4HWN (`armel/uv-k1-k5v3-firmware-custom`), au projet ARDF pour K1/K5 V3 (`reald/uv-k1-k5v3-firmware-custom`) et à opengd77.com, avec redirections restreintes et limites de taille. Quansheng inclut l'historique stable reconnu avec SHA-256 publié. ARDF, F4HWN antérieur à v6 et SA818 sont proposés en téléchargement uniquement ; ils n'étendent pas la prise en charge de l'écriture.
- **Conséquences :** si un fournisseur change de structure, le téléchargement échoue explicitement au lieu de recourir à des sources non vérifiées. SHA-256 détecte la corruption, mais ne prouve pas l'authenticité.

## ADR-008 · Identifiants RepeaterBook uniquement côté serveur

- **Décision :** `data-service.cjs` lit `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` et `RB_APPROVED` dans les variables d'environnement ; le navigateur ne les reçoit jamais. Un délai de temporisation s'applique après HTTP 429 et l'attribution « Data courtesy of RepeaterBook.com » est affichée.
- **Conséquences :** sans jeton approuvé, la fonction apparaît désactivée.

## ADR-009 · Calcul SGP4 local

- **Décision :** les TLE proviennent de SatNOGS/CelesTrak et la propagation se fait dans le navigateur avec `satellite.js`. La position de l'utilisateur ne quitte pas l'ordinateur.
- **Validation :** les tests utilisent un vecteur de test indépendant de Vallado.

## ADR-010 · Tests avec `node:test` et appareils simulés

- **Décision :** utiliser l'exécuteur natif de Node, sans Jest ni Mocha. Radios, réseau et serveur sont simulés ; les tests n'écrivent jamais sur du matériel et n'utilisent pas d'identifiants réels.

## ADR-011 · Licence GPL-3.0-or-later

- **Contexte :** les références d'interopérabilité utilisent Apache-2.0 (F4HWN, egzumer, DualTachyon), MIT (satellite.js) et GPL-2.0 (OpenGD77).
- **Décision :** GPL-3.0-or-later, un copyleft qui garde les améliorations libres et reste compatible avec les dépendances Apache-2.0 et MIT.
- **Note :** aucun code d'OpenGD77 ni des autres références n'est distribué ; l'implémentation est indépendante. Le titulaire peut changer de licence avant de recevoir des contributions tierces.

## ADR-012 · Marque Bricohams avec ses propres ressources

- **Décision :** nom « Bricohams Radio Workspace » et PNG original de Bricohams Studio, sans redessin ni recoloration et avec proportions conservées. L'interface garde sa propre palette sombre. Le 2026-10-21, l'icône SVG d'un « B », non conforme à l'identité de marque, a été remplacée. Provenance et empreinte dans [BRANDING.md](BRANDING.md).
- **Conséquence :** aucun logo OpenGD77, Quansheng ou F4HWN n'est utilisé et l'absence d'affiliation est déclarée.

## ADR-013 · Web statique sur une origine dédiée

- **Contexte :** l'utilisation sans installation est souhaitée, mais IndexedDB et `localStorage` sont isolés par origine et les sauvegardes radio sont sensibles.
- **Décision :** publier un site statique sur GitHub Pages à la racine d'un compte ou d'une organisation dédiés (`https://<org>.github.io/`), pas dans un sous-chemin de `bricohams.github.io` (où se trouve Bricohams Studio). L'application détecte le mode avec `runtime.json` (web si absent), n'utilise que des chemins relatifs et déclare la CSP dans `<meta>`. Les données satellites sont générées quotidiennement par un workflow ; les fonctions nécessitant serveur ou identifiants (RepeaterBook, téléchargement de firmware, API RadioID) sont remplacées par un chargement manuel ou restent locales.
- **Alternatives écartées :** sous-chemin de `bricohams.github.io` (partage origine et stockage avec d'autres projets) ; proxy public (ferait transiter données et identifiants par un tiers) ; réplication de RadioID (volume et licence).
- **Conséquences :** le web propose moins de fonctions que la version locale ; l'auteur doit créer le compte ou l'organisation et configurer Pages. Les paquets installables arriveront prochainement.

## ADR-014 · Publication acceptée sur une origine partagée

- **Contexte :** l'auteur a décidé de publier sur `https://anatolbricoham.github.io/Radio-Web-install/`, sans créer de compte dédié.
- **Décision :** autoriser le déploiement hors de `<org>/<org>.github.io` uniquement si la variable de dépôt `PAGES_SHARED_ORIGIN_ACCEPTED=true` existe. Remplace partiellement ADR-013.
- **Risque accepté :** `anatolbricoham.github.io` partage son origine avec les autres pages de projet de ce compte (par exemple `Ham-Clock`, `antenaSatCommrotor`, `Fox_Hunt_Beacon`). N'importe laquelle, si elle était modifiée, pourrait lire les sauvegardes radio et le profil stockés par le web. Recommandation : exporter les sauvegardes `.rwb.json` et ne pas dépendre du stockage du navigateur.
- **Sortie :** créer un compte ou une organisation dédiés, déplacer le web à sa racine et supprimer la variable.

### Mise à jour de provenance, 26-10-2026

Le dépôt actuel est `Brico-Hams/Radio-Web-install` et l'URL Pages documentée
est `https://brico-hams.github.io/Radio-Web-install/`. Les anciennes adresses
`anatolbricoham` constituent le contexte historique d'ADR-014, pas l'URL
actuelle de déploiement ou de récupération des données. L'exception demeure
une origine partagée : tous les projets de `brico-hams.github.io` partagent
l'origine, pas seulement ce sous-chemin. L'IndexedDB des utilisateurs n'a
pas été migrée automatiquement.
