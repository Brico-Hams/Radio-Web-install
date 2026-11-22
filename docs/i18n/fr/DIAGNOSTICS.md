# Diagnostico remoto / Remote diagnostics / Diagnostic distant / Ferndiagnose

## ES - Confidentialité et fonctionnement

Le système enregistre des **données techniques minimisées**, pas de télémétrie
cachée. L'envoi distant est désactivé par défaut et exige un consentement ainsi
qu'un récepteur HTTPS configuré par l'administrateur. Aucun service central
BricoHams n'est présupposé.

Le contrat accepte exclusivement la version du logiciel, le composant, la
plateforme générique et jusqu'à 16 événements avec code, zone, gravité, catégorie
de l'erreur et numéro de ligne. Il n'admet ni messages, ni valeurs d'exceptions,
ni chemins, noms d'utilisateur, jetons, indicatifs, QSO, fréquences, audio,
localisation, ports ni identifiants de l'appareil ou de l'installation. Les
champs supplémentaires sont rejetés : on ne tente pas de nettoyer un texte
arbitraire pour l'envoyer ensuite.

**Aucun anonymat absolu n'est promis.** Le récepteur, son fournisseur ou un proxy
peuvent connaître l'IP, l'identifiant d'autorisation, l'heure et les métadonnées
de connexion. L'opérateur du récepteur doit configurer ses propres journaux et sa
politique de rétention.

### Clients

- Console de station web, Android/tablette et iPhone/iPad : Configuration permet
  de consulter, télécharger, importer, envoyer une fois, activer l'envoi
  automatique au premier plan et supprimer les journaux locaux. Le consentement
  automatique n'est pas conservé ; se déconnecter ou redémarrer le désactive.
  L'hôte HTTPS de cette session est utilisé.
- RadiCodex : la carte de diagnostic permet de consulter et d'autoriser l'envoi
  avec une URL HTTPS et un jeton exclusif conservé uniquement en mémoire. Il
  n'envoie qu'au premier plan ; désactiver ou redémarrer empêche de nouveaux
  envois. Une requête déjà lancée a pu arriver.
- Workspace HTML5 : chaque page d'outil propose une vue JSON, le téléchargement,
  la suppression locale et l'envoi manuel via le serveur local autorisé. GitHub
  Pages ne reçoit pas de rapports : télécharger et importer dans le client HTTPS.
- Les anciens rapports USB détaillés sont privés et ne sont pas envoyés par ces
  mécanismes. Les examiner séparément avant de les partager manuellement.

Le journal natif et la validation de l'origine HTTPS résident dans la
bibliothèque Android `station-core`, réutilisable sans dépendances de
l'interface RadiCodex. Chaque application initialise le journal avec son
composant du contrat fermé et sa version publique ; cette identité ne peut pas
changer pendant la même exécution de l'application. RadiCodex conserve
`radicodex` et sa version compilée. L'agent indépendant utilisera
`station-agent`, sans identifiants USB dans les rapports. Le contrat JSON est
généré à partir de la même définition Python et est empaqueté avec la
bibliothèque. Cette extraction n'implémente pas à elle seule l'agent OTG et ne
modifie ni le consentement, ni les limites, ni la rétention, ni la validation
TLS, ni la confirmation HTTPS de réception.

Les clients JS conservent jusqu'à 128 événements et RadiCodex jusqu'à 500
entrées. L'expiration logique est de sept jours, vérifiée à la lecture/écriture ;
un appareil éteint n'exécute pas de purge. Supprimer ici n'efface que les
journaux locaux : cela ne retire pas les rapports déjà reçus et ne garantit pas
la suppression physique des copies de sauvegarde. Les erreurs de stockage et de
livraison sont affichées ; autoriser l'envoi n'équivaut pas à une livraison
confirmée.

### Récepteur et agents Python

Le coordinateur active la réception avec :

```text
bricohams-station-host --diagnostic-report-database <ruta-privada>/reports.sqlite3
```

Ajouter les arguments TLS et de station habituels ; l'exemple ne remplace pas la
configuration HTTPS. Lorsqu'il cohabite avec Workspace local (port 8787),
utiliser un port différent pour le coordinateur, par exemple `--port 8443`.

Configurer `BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN` avec un identifiant aléatoire
exclusif d'au moins 32 caractères. Le rôle `diagnostic_reporter` peut remettre
des rapports, mais ne contrôle pas la RF et ne consulte pas les rapports.
Administrateur/opérateur peuvent aussi en remettre ; seul l'administrateur
consulte `GET /api/v1/diagnostic-reports`. La réception est désactivée si la base
de données n'est pas configurée.

L'hôte et l'agent génèrent des journaux locaux dans `~/.bricohams/diagnostics`,
configurable avec `--diagnostic-directory`. Pour autoriser l'envoi à un
récepteur :

```text
--diagnostics-opt-in --diagnostics-url https://diagnostic.example.org
```

Le secret est fourni via `BRICOHAM_DIAGNOSTICS_TOKEN`, jamais dans une URL, dans
les arguments du rapport ni dans le code source. Ne pas réutiliser les
identifiants de contrôle de la station ; le démarrage rejette cette réutilisation
dans les agents Python. `--diagnostics-ca <archivo>` permet de faire confiance à
une CA propre sans contourner TLS. Les files en mémoire sont bornées à 128
événements ; en cas de saturation, l'abandon des plus anciens est signalé. Le
worker ne fait pas d'E/S dans le chemin de journalisation RF. Les journaux locaux
survivent au redémarrage ; la file distante n'est pas un outbox durable et se
reconstruit avec de nouveaux événements, pas avec tout l'historique.

Le magasin récepteur est limité à 500 rapports, remet les 50 derniers à
l'administrateur et applique sept jours de rétention logique et une limite de
pages SQLite. Il ne stocke pas l'IP dans le rapport. L'API limite à 4096 octets
par rapport et 60 remises par minute. En cas d'échec HTTPS/confirmation, une
nouvelle tentative a lieu après une attente comprise entre 60 et 600 secondes.
Seul un HTTP 202 avec exactement `{"accepted":true}` confirme la réception.

### Workspace Node local

`npm start` génère un historique minimisé local, séparé des sorties d'origine de
la console, qui peuvent contenir des diagnostics détaillés et restent privées.
L'historique JSONL conserve au maximum 128 rapports et une expiration logique de
sept jours. Il n'est pas exposé par une API de lecture publique.

Configurer dans l'environnement du processus :

```text
BRICOHAM_DIAGNOSTICS_OPT_IN=1
BRICOHAM_DIAGNOSTICS_URL=https://diagnostic.example.org
BRICOHAM_DIAGNOSTICS_TOKEN=<secreto-exclusivo>
BRICOHAM_DIAGNOSTICS_CA=<archivo-CA-opcional>
```

L'autorisation active les journaux techniques de l'hôte et le relais d'un
rapport du navigateur lorsqu'on appuie sur Envoyer. Sans elle, il n'y a aucun
réseau de diagnostic. Le POST local exige une origine exacte, un JSON fermé et
une limite de taille. Le serveur reste en loopback ; ce n'est pas un proxy pour
CAT, PTT ni un firmware distant.

## EN - Guide utilisateur

L'envoi à distance est désactivé par défaut. Examinez le JSON avant de consentir.
Seules les métadonnées publiques du logiciel et les catégories d'erreur fixes sont
autorisées ; les messages, secrets, indicatifs, QSO, fréquences, audio,
localisation et identifiants d'appareil/d'installation sont exclus. HTTPS ne
masque pas votre IP ni les métadonnées de connexion au récepteur.

Utilisez Configuration dans le client de station partagé, Diagnostic dans
RadiCodex, ou le panneau technique de Workspace. Les utilisateurs de Pages
téléchargent et importent le JSON dans le client de station HTTPS. Le
consentement automatique du client ne vaut que pour la session et uniquement au
premier plan. L'effacement des journaux locaux ne rappelle pas les rapports
livrés et n'efface pas physiquement les sauvegardes. Les journaux bornés
expirent logiquement après sept jours, lorsque l'application est active. Les
anciens exports USB détaillés sont privés et ne sont jamais envoyés
automatiquement.

Le déploiement utilise exactement les options/variables d'environnement
ci-dessus. Configurez votre propre récepteur HTTPS, un identifiant de diagnostic
dédié, une CA si nécessaire, la rétention et la journalisation du proxy. Le rôle
reporter ne peut pas contrôler le matériel radio. Aucun collecteur public
BricoHams, anonymat absolu, livraison confirmée sans accusé de réception ni
validation matérielle physique n'est présupposé.

## FR - Guide utilisateur

L'envoi distant est désactivé par défaut. Examinez le JSON avant de consentir.
Seules les métadonnées publiques du logiciel et catégories d'erreur fixes sont
autorisées : ni messages, secrets, indicatifs, QSO, fréquences, audio, localisation
ou identifiants d'appareil/installation. HTTPS ne masque pas votre IP ou les
métadonnées de connexion au récepteur.

Utilisez Configuration du client de station, Diagnostic de RadiCodex ou le panneau
technique Workspace. Sur Pages, téléchargez puis importez le JSON dans le client
HTTPS. Le consentement automatique des clients ne vaut que pour la session et le
premier plan. L'effacement local ne retire pas les rapports reçus et n'efface pas
physiquement les sauvegardes. La rétention logique de sept jours est appliquée
lorsque l'application est active. Les anciens exports USB détaillés restent privés.

Le déploiement utilise exactement les options et variables ci-dessus. Configurez
votre propre récepteur HTTPS, secret de diagnostic exclusif, CA si nécessaire,
rétention et journaux du proxy. Le rôle reporter ne contrôle pas la radio. Aucun
collecteur public BricoHams, anonymat absolu ou validation matérielle n'est présumé.

## DE - Aide utilisateur

L'envoi à distance est désactivé par défaut. Vérifier le JSON avant de consentir.
Sont autorisées uniquement les métadonnées publiques du logiciel et les catégories
d'erreur fixes : ni messages, secrets, indicatifs, QSO, fréquences, données audio,
localisations ni identifiants d'appareil et d'installation. HTTPS ne masque pas
l'IP ni les métadonnées de connexion au destinataire.

Utiliser les paramètres du client de station, le diagnostic RadiCodex ou le
panneau technique Workspace. Sur Pages, télécharger le JSON et l'importer dans le
client HTTPS. Le consentement automatique du client ne vaut que pour la session au
premier plan. La suppression locale ne rappelle pas les rapports envoyés et ne
supprime pas physiquement les sauvegardes. Les journaux bornés expirent
logiquement après sept jours lorsque l'application est active. Les anciens
exports USB détaillés restent privés et ne sont jamais envoyés automatiquement.

Le déploiement utilise les options et variables d'environnement indiquées
ci-dessus. Configurer son propre destinataire HTTPS, un secret de diagnostic
exclusif, le cas échéant une CA, la rétention et les journaux du proxy. Le
reporter ne doit pas contrôler le matériel radio. Aucun destinataire public
BricoHams, anonymat absolu ni validation matérielle n'est présupposé.

## PT - Guide de l'utilisateur

L'envoi distant est désactivé par défaut. Vérifiez le JSON avant d'autoriser.
Seuls sont permis les métadonnées publiques du logiciel et les catégories d'erreur
fixes : ni messages, secrets, indicatifs, QSO, fréquences, audio, localisation ou
identifiants d'appareil/installation. HTTPS ne masque pas l'IP ni les
métadonnées de connexion au récepteur.

Utilisez Configuration du client de station, Diagnostic de RadiCodex ou le panneau
technique Workspace. Sur Pages, téléchargez et importez le JSON dans le client
HTTPS. Le consentement automatique du client n'est valable que pendant la session
au premier plan. Supprimer les journaux locaux ne retire pas les rapports envoyés
et n'efface pas physiquement les sauvegardes. Les journaux bornés expirent
logiquement après sept jours lorsque l'application est active. Les anciens
exports USB détaillés restent privés.

Utilisez les options et variables ci-dessus pour configurer votre propre
récepteur HTTPS, un secret exclusif, une CA optionnelle, la rétention et les
journaux du proxy. Le rôle reporter ne contrôle pas la radio. Aucun récepteur
public BricoHams, anonymat absolu ni validation physique du matériel n'est
présupposé.
