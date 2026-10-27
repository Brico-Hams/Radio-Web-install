# Configuration commune, sauvegardes et diagnostic

Révision : 25-10-2026. Applicable conceptuellement aux radios FM/DMR ; les noms de
menus, plages et boutons dépendent du guide du modèle et de la build.

## Avant la configuration

### Fournisseurs et téléchargement automatique dans la version installée

Dans Répéteurs, ouvrez **Configurer l’API RepeaterBook**, saisissez le token individuel
et le User-Agent approuvés, puis confirmez votre approbation. Ils ne sont conservés
en mémoire du serveur que jusqu’à son redémarrage ; le champ du token est vidé après
l’envoi. Les variables `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` et `RB_APPROVED=yes`
restent disponibles pour configurer le processus depuis l’environnement.

Dans Contacts DMR, **Téléchargement automatique DMR** importe un lot RadioID par
pays/région (1-10 pages, maximum 1024) dans le codeplug local. Les salles sont des
groupes de conversation : l’option BrandMeister utilise un préfixe TG, pas un pays
RadioID. Enregistrez les groupes comme appels de groupe avec un nom TG numérique ;
affectez ensuite le TG au canal dans le CPS. Cela n’abonne pas le hotspot et n’ouvre
pas de salle. Aucune écriture radio n’est effectuée et aucune synchronisation n’a
lieu silencieusement au démarrage.

Pour Quansheng, dans SAT/passages, préparez des canaux FM ou Doppler et cliquez sur
**Charger les SAT / Doppler préparés dans la configuration Quansheng** après avoir
choisi un modèle FM. Il faut avoir lu/ouvert une configuration F4HWN v6. Cela ne
charge pas les TLE dans le module du firmware : cela prépare des mémoires de réception
échelonnées avec changement manuel.

Consignez le modèle, la révision de la carte, la famille MCU, le firmware et la date/build.
Conservez une photo de SysInf/Radio Info, les fichiers originaux et leurs empreintes.
Notez le type de câble, le port, le navigateur et le programme utilisé. Une seule
application doit ouvrir le port : fermez CHIRP, CPS, Studio et les autres onglets.

Ne confondez pas ces objets :

| Objet | Contenu | Ne remplace pas |
| --- | --- | --- |
| Firmware | Programme exécuté par le processeur | Étalonnage individuel |
| Codeplug/configuration | Canaux, contacts, zones et paramètres selon le format | Sauvegarde du firmware ou de toute la radio |
| Étalonnage | Valeurs de réglage propres à l’appareil | Configuration d’un autre appareil du même modèle |
| Flash physique | Image d’une mémoire précise | Mémoires d’autres puces hors du périmètre déclaré |
| Manifeste/SHA256SUMS | Noms, empreintes et métadonnées | Signature numérique du fabricant |
| TLE | Éléments orbitaux et époque | Fréquences actives ni garantie de service du satellite |

Exportez la sauvegarde `.rwb.json` hors du navigateur et conservez l’original sans
le modifier. IndexedDB dépend de l’origine, du navigateur et du profil. En passant de
localhost à 127.0.0.1, Pages ou au mode privé, vous pourriez ne pas retrouver les mêmes
sauvegardes. N’effacez pas les données du navigateur pour résoudre un problème USB
avant de les avoir exportées.

## Beta et mode PRO

L’application et les compilations Bricohams sont en phase **Beta / validation**.
Activez le **mode PRO** avant la connexion si vous souhaitez exécuter les actions
sélectionnées sans saisir de mots de confirmation ni accepter la suppression locale
de canaux. Le choix PRO autorise également la lecture initiale sans cocher une autre
case. Cette option ne concerne que cette page/cette session ; elle n’est pas mémorisée
silencieusement après un rechargement. Elle ne supprime ni le choix du modèle, ni les
autorisations WebUSB/Web Serial du navigateur, ni la sauvegarde complète, le CRC, la
vérification des empreintes, la relecture, le verrouillage pendant les tâches ou la
protection de Main. Elle ne contrôle pas les confirmations du CPS/Studio externe.
Ne naviguez pas et ne déconnectez pas l’appareil pendant une opération, même en mode PRO.
Une copie partielle n’autorise jamais les écritures, quel que soit ce mode.

## Référentiel des canaux analogiques

| Réglage | Signification | Choix et vérification |
| --- | --- | --- |
| RX | Fréquence écoutée par la radio | Utilisez la sortie publiée du relais ou la fréquence simplex |
| TX | Fréquence d’émission | Pour un relais, utilisez son entrée ; n’inversez pas RX/TX par intuition |
| Offset et direction | Écart TX par rapport à RX | Vérifiez la fréquence TX obtenue, pas seulement le signe |
| Mode | FM, AM ou autre mode pris en charge | Doit correspondre au signal ; la réception AM n’autorise pas l’émission AM |
| Step | Pas du VFO | Ce n’est pas la largeur du canal ; choisissez le raster approprié |
| W/N / largeur | Déviation/filtre du canal FM | À adapter au système ; narrow ne crée pas de mode numérique |
| SQL | Seuil d’ouverture audio | Commencez bas et augmentez seulement jusqu’à fermer le bruit sans perdre les signaux |
| CTCSS TX | Tonalité subaudible transmise | Seulement si le relais l’exige |
| DCS TX | Code numérique subaudible | N’équivaut pas au Color Code DMR ; respecter la polarité le cas échéant |
| CTCSS/DCS RX | Condition supplémentaire d’ouverture audio | Supprimer le filtre pour le diagnostic ; ne chiffre pas les communications |
| Puissance | Niveau de sortie RF | Minimum suffisant et autorisé ; les valeurs dépendent de l’étalonnage |
| RX-only / TXLock | Empêche l’émission sur ce canal | À conserver pour l’écoute et les importations non vérifiées |
| Busy lock | Bloque l’émission lorsqu’une occupation est détectée | Ne dispense pas d’écouter avant d’émettre |
| TOT | Durée maximale d’émission continue | Aide en cas de PTT bloquée ; ce n’est pas la période de balayage |
| VOX | Active l’émission à partir de l’audio | Désactiver lors des essais USB, avec écouteurs et en environnement bruyant |
| Compander | Traitement de la dynamique | À utiliser uniquement si l’autre extrémité est compatible |
| Reverse | Inverse temporairement l’entrée et la sortie | Vérifier à nouveau RX/TX en quittant ; ne pas modifier accidentellement le canal enregistré |

### Exemple de procédure avec un relais

1. Reprenez RX, TX, mode, largeur et tonalité de la publication du responsable.
2. Créez ou dupliquez un modèle compatible ; conservez RX-only pendant la vérification.
3. Écoutez sans filtre RX pour vérifier l’activité et la fréquence.
4. Vérifiez que la tonalité TX est bien celle requise, et non une supposition du fournisseur.
5. Vérifiez la légalité, la puissance et l’appartenance aux listes/zones.
6. Enregistrez en mémoire. Sélectionnez de nouveau le canal pour vérifier la persistance.
7. Sur ce site, exportez le résultat ; ne présumez pas que la modification d’un fichier
l’a écrite dans la radio.

Aucune fréquence d’émission universelle n’est fournie : elle dépend de l’emplacement,
de la licence, de la bande, du service et du relais concerné.

## Référentiel DMR

| Réglage | Signification | Erreur fréquente |
| --- | --- | --- |
| Radio ID | Identifiant propre à l’abonné | Le confondre avec un TG ou utiliser celui d’une autre personne |
| Contact TX | Destination d’appel et type groupe/privé | Utiliser un contact privé alors qu’un groupe est nécessaire |
| TG | Talkgroup, identifiant du groupe | Croire qu’il programme à lui seul le réseau du relais |
| TS 1/2 | Time Slot du canal | Le confondre avec le numéro de canal ou le Color Code |
| CC 0-15 | Color Code d’accès DMR | Le traiter comme un mot de passe ou une tonalité CTCSS |
| RX Group | Ensemble de groupes de réception | Le confondre avec une zone de canaux |
| Zone | Liste organisée de canaux | S’attendre à ce qu’elle modifie automatiquement TS/CC |
| Filtre DMR | Conditions d’acceptation audio | Un filtre ouvert n’autorise pas l’émission sur n’importe quel TG |
| Hotspot | Interface personnelle RF/réseau | Ce n’est pas par défaut un relais classique à deux slots |
| Base d’ID | Relation entre ID, indicatif et nom | Ne crée pas de contacts TX et n’autorise pas l’accès à un réseau |

Pour configurer le DMR dans OpenGD77, suivez le [guide correspondant](AYUDA-OPENGD77.md).
Quansheng F4HWN/Karina/ARDF ne sont pas documentés ici comme radios DMR.

## Balayage et double écoute

Le balayage consiste à parcourir les canaux séquentiellement ; il ne signifie pas
qu’on écoute toute la plage simultanément. Une vitesse accrue peut faire manquer des
porteuses brèves, des tonalités ou des en-têtes numériques. La reprise temporisée,
la reprise sur porteuse ou l’arrêt sont des comportements différents.

Les canaux prioritaires et la double écoute ajoutent des passages au cycle ; ils peuvent
modifier la durée d’écoute utile. Vérifiez quel canal est utilisé pour le TX : principal,
dernier reçu ou défini par le mode de réponse.
Pour diagnostiquer la réception, utilisez un seul VFO et désactivez le balayage.

## Réglages système

| Groupe | Effet | Précaution |
| --- | --- | --- |
| Rétroéclairage/contraste/inversion | Lisibilité et consommation | Ne modifie pas la sensibilité RF |
| Bips/voix/alertes | Signaux d’interface | Baissez le volume avant d’utiliser des écouteurs |
| Économie/sleep/APO | Cycle de réception ou extinction | Peut retarder la détection des signaux et interrompre les sessions |
| Capacité de batterie | Estimation/gestion selon le firmware | Ne modifie pas la capacité physique et n’étalonne pas la tension |
| Verrouillage clavier/PTT | Actions autorisées | Vérifier s’il bloque aussi TX et comment déverrouiller cette build |
| Date/heure/UTC | Journal, position et orbites | Le fuseau horaire ne remplace pas une horloge correcte |
| Position/GPS | Calculs ou services qui les utilisent | Préserver la confidentialité et ne pas supposer la présence d’un GPS sur le modèle |
| Raccourcis/touches | Actions courtes/longues | Consigner les modifications ; ne pas copier les combinaisons d’un autre modèle |
| Reset | Restaure des groupes de valeurs | Peut effacer des canaux/réglages ; ne pas l’utiliser comme premier diagnostic |
| Étalonnage | Fréquence, niveaux et autres paramètres de laboratoire | Ne pas toucher sans instruments et procédure du projet |

## Relais, RadioID et satellites sur ce site

- Mode web : RadioID via `user.csv` ; mode local : consultation par serveur.
Les contacts privés importés ne créent pas de zones et n’affectent pas de TG aux canaux.
- RepeaterBook nécessite la version locale et un token approuvé. Une source externe peut
être incomplète ou obsolète. Vérifiez l’état opérationnel auprès du responsable.
- OpenGD77 utilise ici un codeplug standard de 128 KiB. Les canaux importés
reposent sur un modèle compatible et sont créés en RX-only ; la zone est vérifiée dans le CPS.
- Quansheng permet de lire la configuration F4HWN v6, d’ajouter des canaux FM à partir d’un modèle
et d’effacer les mémoires du fichier local. L’envoi Beta exige une sauvegarde Flash complète
et une relecture ; v6.0 reste en lecture seule. L’export de projets/CSV est aussi disponible.
Il n’existe pas de table orbitale SAT native Quansheng.
- OpenGD77 distingue la table SAT native et les canaux d’écoute. Consultez les limites
et les capacités réelles de l’éditeur avant de supposer qu’un fichier étendu convient.
- Le Doppler n’est pas un offset de relais. Il dépend de l’instant, de l’orbite et de la position ;
les canaux échelonnés sont des approximations, pas un suivi continu.
- Mettez à jour les TLE, l’heure et la position ; vérifiez l’époque et la fréquence active. Un passage
prévu ne garantit ni l’activité du transpondeur ni la réception.
- Pour l’écoute, désactivez les tonalités héritées, sauf besoin connu. N’activez pas
l’uplink/TX automatique en important un satellite.

## Connexion USB sans confondre les modes

| Famille d’opérations | Mode attendu | À ne pas faire |
| --- | --- | --- |
| Quansheng : lecture et slots | Firmware F4HWN compatible démarré normalement, protocole série | Ne pas entrer dans le bootloader uniquement pour consulter les canaux |
| Quansheng : flashage externe | Mode et outil propres au matériel | Ne pas utiliser l’outil V1 sur V3 ni confondre packed/RAW |
| OpenGD77 : lecture CPS web | Firmware OpenGD77 normal et transport de la famille | Ne pas choisir DFU ni boot ROM |
| OpenGD77 : installation du firmware | Outil officiel et séquence correspondant au modèle | Ne pas utiliser le site comme flasheur MCU |

Chrome/Edge de bureau, HTTPS ou 127.0.0.1 et autorisation du périphérique sont
nécessaires pour les API du navigateur. Un câble de charge peut alimenter l’appareil
sans transporter de données. USB-C direct et câble série latéral sont deux voies distinctes.
Ne modifiez pas le pilote d’un périphérique tiers et ne remplacez pas tous les CDC par
WinUSB : vérifiez les identifiants et l’interface avant d’agir.

### Délai dépassé / « 0 de 1 bytes »

1. Conservez le message exact et la dernière opération réussie.
2. Fermez les autres programmes et onglets qui utilisent le port.
3. Déconnectez en toute sécurité et démarrez la radio en mode normal.
4. Vérifiez le matériel, le firmware et le port utilisés ; essayez un câble de données.
5. Réessayez une lecture, sans écrire ni effacer.
6. Si l’appareil est identifié mais que la lecture échoue, consignez le firmware exact et la commande/l’étape.
L’identification ne prouve pas la prise en charge de toutes les commandes.
7. Si l’erreur persiste, arrêtez et conservez les journaux. N’augmentez pas
arbitrairement le débit et ne retirez pas la protection de sauvegarde.

## Liste de vérification après l’opération

- Le fichier exporté a le format/la taille attendus et une copie originale existe.
- Les modifications subsistent après fermeture et réouverture du fichier.
- RX/TX, tonalités, mode, TS/CC et RX-only sont corrects le cas échéant.
- La zone/liste/banque est celle souhaitée, pas seulement le numéro de mémoire.
- Il n’y a pas confusion entre « préparé » et « installé ».
- Un contrôle CRC couvre les données qu’il déclare, pas toute la sécurité du
firmware ni l’étalonnage d’autres puces.

Sources : connecteurs, éditeur et planificateur de ce site ; manuels référencés dans
les guides [F4HWN](AYUDA-QUANSHENG.md) et [OpenGD77](AYUDA-OPENGD77.md).