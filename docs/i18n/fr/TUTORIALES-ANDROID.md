# Tutoriels de RadiCodex by BricoHams

Guide pas à pas de l'APK unique RadiCodex by BricoHams (`org.bricohams.radicodex`, application native Kotlin). Chaque tutoriel indique l'objectif, ce qu'il faut, les étapes avec les textes exacts de l'écran, le résultat attendu et les erreurs habituelles. La portée technique complète et les limites figurent dans [RadiCodex by BricoHams](ANDROID.md). Les fonctions marquées comme expérimentales n'ont pas été validées avec une vraie radio : essayez-les d'abord avec une charge fictive ou en réception seule.

## Avant de commencer

### Installation et prérequis

**Objectif :** avoir l'APK installée et fonctionnelle.

**Il vous faut :** un téléphone sous Android 8.0 (API 26) ou plus récent. L'application n'a besoin ni de serveur ni de compte.

1. Téléchargez l'APK et vérifiez son SHA-256 publié (voir [RadiCodex by BricoHams](ANDROID.md)).
2. Ouvrez le fichier depuis le gestionnaire de fichiers ou le navigateur. Android demandera d'autoriser l'installation depuis cette application : acceptez uniquement pour cette étape.
3. L'APK n'est pas distribuée par Google Play. Les APK de débogage utilisent la clé debug ; l'APK de publication `RadiCodex-1.0.0.apk` n'est signée avec la clé de publication que si la release l'inclut (vérifiez son SHA-256).
4. Ouvrez RadiCodex. Vous verrez le bandeau « Données locales. Exportez vos données avant de désinstaller. »

**Résultat attendu :** l'écran principal avec les sections « Votre station radio », « Radio et réception », « Vos données et sauvegardes » et « Fonctions et confidentialité ».

**Erreurs courantes :**

- Android bloque l'installation : il manque l'autorisation d'installer depuis l'application qui ouvre l'APK.
- Désinstaller l'application supprime les données locales (SQLite privée) : utilisez d'abord « Exporter toutes les données en JSON ».

### Permissions et raisons de leur demande

RadiCodex ne collecte ni n'envoie aucune donnée. Voici les permissions du manifeste et leur usage :

| Permission | À quoi elle sert |
| --- | --- |
| Localisation (précise et approximative) | Une position GPS ponctuelle dans l'ARDF et « Utiliser la dernière position GPS » dans Satellites. Aucun suivi en arrière-plan |
| Microphone | Uniquement quand vous appuyez sur « Démarrer la capture audio » ou recevez du SSTV dans CAT multi-radio. L'accorder ne lance pas l'enregistrement |
| Internet et état du réseau | Téléchargement HTTPS des TLE (CelesTrak) et des fréquences (SatNOGS) et liaison Wi-Fi avec le rotor (192.168.4.1) |
| Bluetooth (recherche et connexion) | Rotor AZ/EL en BLE |
| USB hôte | Radios par câble OTG. Android demande l'autorisation pour chaque appareil et ne se connecte jamais seul au branchement |

Le microphone, le GPS, l'USB hôte, le BLE et la boussole ne sont pas obligatoires pour installer l'application : sans eux, seules les fonctions correspondantes sont désactivées.

### Choisir la langue

1. Sur l'écran principal, ouvrez « Langue de RadiCodex ».
2. Choisissez « Langue du système », Español, English (US), Français ou Deutsch.

**Résultat attendu :** la langue est enregistrée sur le téléphone et appliquée à tous les écrans. Les indicatifs, les noms de canaux et les fichiers de l'utilisateur ne sont pas traduits.

## Tutoriels

### 1. Carnet de trafic

**Objectif :** enregistrer des contacts, les rechercher et déplacer les données en sécurité.

**Il vous faut :** seulement le téléphone. Fonctionne hors ligne.

**Ajouter un contact**

1. Ouvrez l'onglet « Carnet ». Pour un carnet POTA ou SOTA, créez-le dans « Carnets de trafic » : renseignez le nom du carnet, « Référence de parc ou sommet (vide pour Général) » (exemples EA-0123 et EA4/MD-001), « Mon indicatif de station » et appuyez sur « Créer un carnet ».
2. Saisissez « Indicatif » (3 à 20 caractères : lettres, chiffres et /).
3. Laissez le champ « UTC ISO » vide pour utiliser l'heure actuelle à l'enregistrement, ou saisissez la date.
4. Renseignez « Fréquence MHz », le mode, « Report envoyé », « Report reçu » et « Notes ».
5. Appuyez sur « Enregistrer le nouveau contact ».

**Résultat attendu :** le contact est enregistré sur le téléphone ; l'indicatif et les notes sont effacés, la fréquence et le mode sont conservés. Si le même indicatif, la même bande et le même mode existent déjà, un avertissement propose « Ne pas enregistrer » ou « Enregistrer quand même ». Pour modifier, touchez le contact et utilisez « Enregistrer les modifications du contact », « Annuler la modification » ou « Supprimer ce contact » (avec confirmation).

**Rechercher**

1. Saisissez dans « Rechercher dans ce carnet : indicatif, notes, mode ou fréquence ».
2. Appuyez sur « Rechercher des contacts » ; pour tout revoir, « Afficher tous les contacts ».

Les 50 résultats les plus récents sont affichés ; les exports incluent tout le carnet.

**Importer un ADIF avec aperçu**

1. Appuyez sur « Importer ADIF dans ce carnet (aperçu) » et choisissez le fichier.
2. Vérifiez l'aperçu : il liste les « Champs NON conservés » et ignore les contacts identiques. Rien n'est enregistré avant votre acceptation.
3. Acceptez pour importer en une seule transaction.

Seul l'ADIF ASCII jusqu'à 16 MiB et 50000 contacts est accepté. Faites d'abord une sauvegarde JSON.

**Sauvegarde et restauration JSON**

1. Pour sauvegarder : « Exporter toutes les données en JSON » (écran principal) ou « Exporter le JSON complet (avec accents) » (carnet).
2. Pour restaurer : « Importer une sauvegarde JSON Bricohams », boîte « Importer une sauvegarde locale », « Choisir le JSON ». Rien n'est jamais écrasé : si un identifiant est en conflit, toute l'importation est annulée.

**Exporter pour LoTW**

1. Appuyez sur « Exporter ce carnet en ADIF (ASCII) ».
2. Signez et envoyez le fichier avec TQSL sur un ordinateur : cette APK n'envoie pas vers LoTW.

**Erreurs courantes :**

- Indicatif refusé : il doit contenir lettres, chiffres et /.
- Référence POTA ou SOTA au mauvais format (EA-0123, EA4/MD-001).
- ADIF avec UTF-8 ou caractères de contrôle : refusé ; conservez l'original.

### 2. ARDF et GPS

**Objectif :** noter des observations de balises avec la position du téléphone.

**Il vous faut :** l'autorisation de localisation et un ciel dégagé pour le GPS (facultatif : on peut enregistrer sans coordonnées).

1. Dans l'onglet « ARDF », saisissez « Nom de la nouvelle session » et appuyez sur « Créer une session ARDF » (ou sélectionnez une session).
2. Indiquez « Balise (1-10) » et « Notes d'observation ».
3. Appuyez sur « Obtenir une position GPS une fois (30 s) » et acceptez la boîte « Position pour l'ARDF ». Attendez la position.
4. Appuyez sur « Enregistrer une observation manuelle ».
5. Appuyez sur « Statistiques et observations de la session » pour vérifier et sur « Exporter sessions et contacts en JSON » pour sauvegarder.

**Résultat attendu :** l'observation est enregistrée avec la position du téléphone (pas celle de la balise) s'il y a une position récente ; sinon elle est enregistrée sans coordonnées. Chaque position ne sert qu'à une observation et les positions simulées sont écartées. Les statistiques additionnent des segments GPS de précision 50 m ou mieux, d'âge 30 s ou moins et d'écart 120 s ou moins ; ce n'est pas un parcours complet.

**Erreurs courantes :**

- « Pas de position récente après 30 s » : cherchez un ciel dégagé ou activez le GPS.
- GPS désactivé ou sans autorisation : l'observation est enregistrée sans coordonnées.

### 3. CAT RX USB (F4HWN, expérimental)

**Objectif :** accorder la réception d'une Quansheng avec l'image Bricohams SAT RX v1 (base F4HWN v6+).

**Il vous faut :** un câble USB OTG de données (CDC ACM ou adaptateur monoport CH34x, CP210x, FTDI ou Prolific). Le CAT passe uniquement par USB, pas par Bluetooth.

1. Sur la radio, activez SAT RX et appuyez sur la touche 8 (`CAT READY RX`).
2. Dans l'application, ouvrez « Ouvrir CAT RX USB expérimental » (écran « Radio USB / CAT ») et appuyez sur « Choisir le périphérique USB ».
3. Acceptez l'autorisation USB d'Android.
4. Appuyez sur « Interroger CAT RX » pour confirmer l'état.
5. Saisissez « Fréquence RX MHz (jusqu'à 5 décimales) » (pas de 10 Hz, VHF 136-174 ou UHF 400-470) et appuyez sur « Accorder RX (renouvelé jusqu'à STOP) ».
6. Pour terminer, « STOP : revenir à la RX nominale » puis « Déconnecter l'USB ».

**Résultat attendu :** l'application renouvelle l'accord toutes les 1,2 s ; si elle cesse de le faire, la radio revient à la RX nominale après 3 s. Les touches 4, 5 et 6 de la radio reviennent au mode manuel.

**Doppler d'un passage :** depuis Satellites, choisissez un passage, connectez le CAT et appuyez sur « Démarrer le Doppler du passage sélectionné » (seulement dans la fenêtre du passage) ; « Arrêter le suivi et déconnecter l'USB » y met fin.

**Erreurs courantes :**

- Aucun appareil : vérifiez l'adaptateur OTG, le câble et le firmware ; aucun appareil quelconque n'est jamais utilisé.
- Autorisation USB refusée ou expirée : choisissez de nouveau l'appareil.
- USB déconnecté : choisissez de nouveau l'appareil avant d'utiliser le CAT.

### 4. Éditeur de canaux Quansheng (Bêta)

**Objectif :** modifier le nom, les fréquences, les sous-tons et la puissance de canaux FM existants sur F4HWN v6.

**Il vous faut :** un câble USB OTG, un firmware Labs v6.1 ou plus récent (F4HWN v6.0 est en lecture seule) et 10 à 20 minutes pour la sauvegarde.

1. Ouvrez « Modifier les canaux Quansheng par USB (Bêta) » (« Canaux Quansheng ») et appuyez sur « 1. Choisir le périphérique USB et connecter ».
2. Appuyez sur « 2. Sauvegarde complète (Flash 2 Mio, 10-20 min) ». La sauvegarde est enregistrée et vérifiée dans le stockage privé de l'application avec SHA256SUMS ; copiez-la hors du téléphone.
3. Appuyez sur « 3. Lire les canaux de la radio ».
4. Appuyez sur « 4. Choisir un canal » et modifiez Nom (1-10 ASCII), RX (MHz), TX (MHz), tonalité RX et tonalité TX (OFF, CTCSS en Hz comme 88.5, ou DCS comme D023N / D023I), Puissance (USER, LOW1-LOW5, MID, HIGH), Bande étroite (12,5 kHz) et « Verrouiller la TX sur ce canal ».
5. Appuyez sur « 5. Appliquer les modifications à la copie locale ».
6. Appuyez sur « 6. Écrire dans la radio et relire » et confirmez la boîte « Écrire les canaux dans la radio ».
7. Redémarrez la radio à la fin.

**Résultat attendu :** « Écriture vérifiée par relecture ». L'écriture ne résiste pas à une coupure d'alimentation : ne débranchez pas et n'éteignez pas la radio.

**Erreurs courantes :**

- « Écriture bloquée » : la sauvegarde complète vérifiée de cette session manque.
- Toute erreur, déconnexion ou sortie de l'écran invalide la session : reconnectez et refaites la sauvegarde.
- RX et TX doivent être dans la même bande (136-174 ou 400-470 MHz).
- Vérifiez que fréquences, tonalités et puissance sont légales pour vous.

### 5. OpenGD77 par USB

**Objectif :** voir l'écran d'une radio OpenGD77 et mettre son horloge à l'heure UTC.

**Il vous faut :** une radio OpenGD77 et un câble OTG de données.

1. Ouvrez « OpenGD77 par USB : écran et horloge » et appuyez sur « Choisir le périphérique USB » ; acceptez l'autorisation.
2. L'application affiche le modèle, le firmware et « Fonctions USB » avec « Pris en charge » ou « Non pris en charge ».
3. Appuyez sur « Capturer l'écran » pour voir l'écran de la radio.
4. Appuyez sur « Synchroniser l'horloge UTC » et rouvrez le menu Satellite de la radio pour recalculer les passages.
5. Utilisez « Vérifier la liaison » pour tester la connexion et « Déconnecter l'USB » à la fin.

**Résultat attendu :** « Écran capturé. », « Horloge envoyée » ou « Liaison correcte. ». OpenGD77 n'a pas de CAT d'accord par USB : pas de fréquence, de mode, de canal, de PTT ni de Doppler depuis le téléphone, et la Flash n'est jamais écrite.

**Erreurs courantes :**

- « Aucune radio USB CDC connectée » : utilisez un câble OTG de données.
- Identification inconnue : l'application ne suppose aucun modèle.

### 6. CAT multi-radio

**Objectif :** contrôler fréquence, mode, mémoires, satellites et modes numériques d'une radio par USB.

**Il vous faut :** un câble USB OTG ou l'interface de la radio. Modèles de la liste « Modèle de radio » : Yaesu FT-817/FT-817ND, FT-818ND, FT-857/FT-857D, FT-897/FT-897D (4800 bauds), Icom IC-705 (115200, adresse CI-V A4 par défaut), Yaesu FTX-1 (38400, firmware MAIN 1.08 ou plus récent, port Enhanced COM CAT-1) et (tr)uSDX (115200 avec firmware 2.00t ou plus récent ; 38400 en repli). Les essais physiques sont en attente : ces radios ne sont pas certifiées.

**Connecter et accorder**

1. Ouvrez « CAT multi-radio (FT-817, FT-857, IC-705, FTX-1, (tr)uSDX) » (« Bricohams CAT multi-radio »).
2. Sous « Radio », choisissez « Modèle de radio », vérifiez « Vitesse (bauds) » (sur l'IC-705 aussi « Adresse CI-V (hex) »), appuyez sur « Choisir un périphérique USB » puis « Connecter ».
3. Sous « Fréquence et mode », saisissez « Fréquence (MHz) » et appuyez sur « Régler VFO A » ou « Régler VFO B ».
4. Choisissez « Mode » (LSB, USB, CW, CW_R, AM, FM, FM_N, WFM, RTTY, RTTY_R, DATA_L, DATA_U, DATA_FM, DV) et appuyez sur « Régler le mode » ; « Lire » actualise la lecture.
5. « Test PTT 3 s » ouvre la boîte « Test PTT » : elle exige un indicatif, émet 3 s et nécessite une antenne adaptée ou une charge fictive.

**Mémoires**

1. Sous « Mémoires », indiquez « Du canal » et « Au canal » (maximum 100 par lecture ; limites IC-705 0..99, FTX-1 1..999, autres 1..99) et appuyez sur « Lire les mémoires ».
2. Seuls l'IC-705 et le FTX-1 permettent de lire les mémoires. Les FT-817/857/897 et la (tr)uSDX ne le permettent pas.
3. Toucher une ligne propose « Accorder » (appliqué au VFO A) et, sur le FTX-1 uniquement, « Modifier ».
4. Écriture des mémoires (FTX-1 uniquement) : « Nouveau canal » ou « Modifier » ouvre « Canal mémoire » avec Canal, Fréquence RX (MHz), Mode, « Nom (12 caractères max.) » et « Fréquence TX en split (MHz, vide = simplex) ». Appuyez sur « Enregistrer » ; si le canal contient déjà des données, il faut confirmer le remplacement.

**Résultat attendu :** « Canal N enregistré et vérifié. » après relecture.

**Satellite et enregistrement en mémoire**

1. Depuis un passage dans Satellites, appuyez sur « Ouvrir dans CAT multi-radio », ou saisissez « Descendante (MHz) », « Montante (MHz, facultatif) » et « Pas Doppler (Hz) » (1 à 5000, 100 par défaut).
2. Appuyez sur « Démarrer le suivi » ; « Arrêter le suivi » y met fin. Avec une montante, le split est utilisé ; la famille FT-817 reprogramme la montante sur le VFO B au plus toutes les 5 s.
3. FTX-1 uniquement : « Enregistrer le transpondeur en mémoire » ouvre l'éditeur avec la descendante, la montante et le nom du satellite (12 caractères maximum) dans le premier canal libre.

**Carte « Modes numériques »**

1. Choisissez « Mode numérique », « Bande et fréquence » et « Période ».
2. Appuyez sur « Accorder » : cela règle le VFO A sur la fréquence de dial et le mode données (DATA_U sur FT-817/818/857/897 et FTX-1 ; USB sur IC-705 et (tr)uSDX ; sur l'IC-705, activez DATA ON sur la radio).
3. La ligne d'horloge UTC indique le prochain créneau pair ou impair. Si « L’heure automatique est désactivée : le FT8 exige une horloge à ±1 s. » apparaît, activez l'heure automatique d'Android.
4. Pour utiliser un modem externe (FT8CN, JS8Call ou une autre appli), appuyez sur « Libérer le port pour une appli numérique » et choisissez la même radio dans cette appli.

Fréquences de dial standard proposées par l'application (MHz ; seules celles comprises dans la plage de la radio sont affichées ; ce sont des fréquences d'usage communautaire : vérifiez-les localement) :

| Mode | Périodes (s) | Fréquences de dial |
| --- | --- | --- |
| FT8 | 15 | 1.840, 3.573, 5.357, 7.074, 10.136, 14.074, 18.100, 21.074, 24.915, 28.074, 50.313, 144.174 |
| FT4 | 7.5 | 3.575, 7.0475, 10.140, 14.080, 18.104, 21.140, 24.919, 28.180, 50.318, 144.170 |
| JS8 | 15, 30, 10, 6 | 1.842, 3.578, 7.078, 10.130, 14.078, 18.104, 21.078, 24.922, 28.078, 50.318, 144.178 |
| WSPR | 120 | 0.136, 0.4742, 1.8366, 3.5686, 5.2872, 7.0386, 10.1387, 14.0956, 18.1046, 21.0946, 24.9246, 28.1246, 50.293, 144.489 |
| Q65 | 15, 30, 60, 120, 300 | 50.275, 144.116 |
| JT65 | 60 | 1.838, 3.570, 7.076, 10.138, 14.076, 18.102, 21.076, 24.917, 28.076, 50.310 |
| JT9 | 60 | 1.839, 3.572, 7.078, 10.140, 14.078, 18.104, 21.078, 24.919, 28.078 |
| FST4 | 60, 120, 300, 900, 1800 | 0.136, 0.4742 |
| FST4W | 120, 300, 900, 1800 | 0.136, 0.4742 |

Les modes numériques et les mémoires sont indiqués comme en attente de validation sur un vrai téléphone.

**Erreurs courantes :**

- « Cet équipement ne permet pas de lire les mémoires » : cette radio ne prend pas en charge la lecture.
- Fréquence hors de la plage de la radio : le message indique la plage prise en charge.
- La connexion se ferme quand vous quittez l'écran ou débranchez l'USB : reconnectez.
- IC-705 : il expose deux ports série ; choisissez le bon (« port N »).

### 7. Satellites

**Objectif :** calculer des passages hors ligne (SGP4), les suivre sur la carte et le radar et recevoir avec Doppler.

**Il vous faut :** la position de l'observateur et, pour mettre à jour le catalogue, une connexion Internet. Ensuite, cela fonctionne hors ligne tant que les TLE ont 7 jours au plus.

1. Ouvrez « Ouvrir satellites SGP4 et passages » (« Bricohams Satellites »). Si le catalogue manque ou a 24 h ou plus, il se met à jour seul (HTTPS avec CelesTrak et SatNOGS ; votre position n'est pas envoyée). Pour le faire à la main, utilisez « Actualiser TLE et fréquences » ou « Importer un fichier TLE » dans l'onglet « Réglages », où l'on peut aussi désactiver la mise à jour automatique.
2. Dans « Réglages », indiquez latitude, longitude, hauteur (km, ellipsoïde WGS84) et élévation minimale (0-60), ou appuyez sur « Utiliser la dernière position GPS », puis « Enregistrer et calculer les passages ».
3. Dans « Satellites », choisissez avec « Rechercher par nom ou NORAD », « Tous », « Avec RX » ou « Aucun ».
4. Dans « Passages », vous verrez les 24 prochaines heures avec le compte à rebours d'AOS et de LOS. Ouvrez un passage pour voir le radar polaire (vert AOS, rouge LOS, orange position actuelle) et la liste des descendantes (« Descendante pour CAT RX », « Autre fréquence (MHz) »).
5. Dans « Carte », les satellites, l'empreinte et une trace de ±45 min apparaissent, actualisés toutes les 5 s ; touchez un satellite pour le sélectionner.
6. Pour recevoir : « Connecter CAT : Doppler, SSTV et enregistrement » (Quansheng, voir tutoriel 3) ou « Ouvrir dans CAT multi-radio » (tutoriel 6).
7. Pour enregistrer un passage : sur le CAT connecté, appuyez sur « Enregistrer le passage complet (WAV jusqu’à LOS) » puis « Arrêter l’enregistrement du passage » ; le WAV est en 16 kHz mono et s'arrête à LOS, après 2 h ou quand vous quittez l'écran.
8. Pour chercher du SSTV : dans « Réglages », ouvrez « Enregistrements de passages » et appuyez sur « SSTV » (il explore des fenêtres de 60 s toutes les 23 s à la recherche d'images Robot36) ; il y a aussi « Exporter » et « Supprimer » avec confirmation.

**Résultat attendu :** des passages avec AOS, maximum et LOS. Le Doppler par CAT ne corrige que la réception (Quansheng) ; il n'y a pas de correction de la montante sur la Quansheng.

**Erreurs courantes :**

- Aucun passage : l'observateur n'a pas été enregistré dans « Réglages ».
- TLE expirés (plus de 7 jours) : mettez le catalogue à jour.
- Après un échec de téléchargement, la mise à jour automatique attend 15 minutes.

Pour les bandes et une initiation à la réception, voir [Initiation à la réception des satellites](INICIACION-SATELITE.md).

### 8. Rotor AZ/EL

**Objectif :** pointer un rotor sur le passage sélectionné.

**Il vous faut :** le rotor Bricohams en Wi-Fi (192.168.4.1) ou en « Bluetooth sécurisé » (PIN à 6 chiffres, BLE), le jeton de 24 à 128 caractères ASCII configuré par USB sur le rotor, et l'arrêt d'urgence physique à portée de main. Aucun essai avec un rotor physique.

1. Dans le détail d'un passage, appuyez sur « Rotor AZ/EL : préparer et suivre ce passage ».
2. Choisissez Wi-Fi ou Bluetooth, saisissez le jeton ou le PIN et appuyez sur « Connecter ».
3. Appuyez sur « Prise d'origine (chercher les fins de course) ».
4. Appuyez sur « Calibrer nord et niveau avec le téléphone » : téléphone à plat sur le boom, le haut vers les éléments, utilisez « Utiliser le cap de la boussole » ou saisissez l'azimut vrai de l'antenne (0-359,9°), cochez la confirmation que le mât est de niveau et appuyez sur « Calibrer ».
5. Appuyez sur « Envoyer l'heure et la position du téléphone » (le firmware 0.3.0-prototype le prend en charge ; le firmware API 1 utilise l'heure GNSS).
6. Appuyez sur « Préparer le passage : charger le TLE et viser l'AOS » et lisez l'avertissement sur la coupure du câble.
7. Appuyez sur « Suivre automatiquement dès l'AOS » ; « Annuler le suivi automatique » l'arrête.

**Résultat attendu :** le rotor vise l'AOS et suit le passage avec l'écran maintenu allumé.

**Erreurs courantes :**

- 409 : un autre client contrôle le rotor.
- Liaison BLE perdue en mouvement : le rotor passe en défaut ; utilisez « Effacer le défaut (nouvelle prise d'origine) ».
- Le rotor s'arrête à la butée de câble, au-dessus de 89° ou si le satellite va plus vite que le moteur.
- « ARRÊTER les moteurs » interrompt le mouvement à tout moment. Les détails figurent dans le guide du rotor du dépôt (docs/ROTOR.md, en espagnol uniquement).

### 9. Réception audio en direct

**Objectif :** capturer l'audio avec le microphone et le décoder ensuite en Morse ou en SSTV.

**Il vous faut :** l'autorisation du microphone et l'audio de la radio diffusé près du microphone.

1. Ouvrez « Recevoir Morse / Robot36 avec le microphone » (« Réception audio »).
2. Choisissez Morse ou SSTV. Pour le Morse, réglez la tonalité (300 à 1200 Hz) et la vitesse (5 à 45 WPM).
3. Appuyez sur « Démarrer la capture audio ». Si Android demande l'autorisation, accordez-la et appuyez de nouveau : l'autorisation ne lance pas l'enregistrement.
4. Appuyez sur « Arrêter et décoder » (ou « Annuler et supprimer l'audio »).

**Résultat attendu :** l'audio (PCM mono 48 kHz, jusqu'à 60 s en Morse ou 200 s en SSTV) reste uniquement en mémoire et n'est ni enregistré ni émis. Quitter l'écran annule la capture. Le décodage est expérimental.

**Erreurs courantes :**

- Le SSTV exige l'en-tête VIS complet : commencez avant l'émission.
- Pas d'autorisation du microphone : vous pouvez toujours utiliser les importateurs WAV.

### 10. Morse

**Objectif :** transformer un texte Morse ou un fichier WAV en texte.

1. Dans l'onglet « Morse », saisissez points et traits (espace entre les lettres, `/` entre les mots, `?` pour un code inconnu) et appuyez sur « Interpréter le texte Morse ».
2. Pour un fichier (expérimental) : réglez « Tonalité (300-1200 Hz) » et « Vitesse (5-45 mots/minute) » avec des nombres entiers et appuyez sur « Importer et décoder un WAV Morse ».

**Résultat attendu :** le texte décodé. Le WAV doit être en PCM mono 16 bits, 8 à 48 kHz, de 0,1 à 60 s et jusqu'à 8 MiB. Ce n'est pas un décodeur adaptatif : vérifiez le résultat.

**Erreurs courantes :**

- Tonalité ou vitesse hors plage ou non entières.
- WAV stéréo ou d'un autre format.

### 11. SSTV Robot36 (WAV, microphone et émission)

**Objectif :** décoder des images SSTV et, facultativement, en émettre une avec le PTT CAT (expérimental).

**Décoder un WAV**

1. Appuyez sur « Ouvrir SSTV Robot36 depuis WAV » (« SSTV depuis un audio ») puis « Décoder un WAV SSTV ».
2. Choisissez un WAV PCM mono 16 bits, 8000-48000 Hz, jusqu'à 200 s et 24 MiB, avec un en-tête VIS complet (modes Robot36/72, Martin M1/M2, Scottie S1/S2, PD90/120/180).
3. Appuyez sur « Enregistrer l'image PNG » avant de quitter ou de faire pivoter l'écran : l'image ne vit qu'en mémoire.

**Recevoir avec le microphone :** utilisez le tutoriel 9 avec SSTV, ou sur l'écran CAT RX « Enregistrer SSTV (CAT continue l'accord) » puis « Arrêter l'enregistrement et décoder ».

**Émettre avec le CAT TX et le PTT (expérimental, sans validation RF)**

1. Il vous faut une licence, une fréquence autorisée pour le SSTV et un câble audio du téléphone vers l'entrée microphone de la radio.
2. Sur la radio, en SAT RX, armez le PTT avec la touche 9 (`CAT TX ARMED`).
3. Sur l'écran CAT, saisissez « Indicatif (obligatoire) » : il est imprimé sur l'image.
4. Choisissez le mode dans « Mode SSTV (uniquement ceux qui tiennent dans la limite d'émission de 110 s) » (TX : Robot36/72, Martin M2, Scottie S2, PD90).
5. Appuyez sur « Envoyer SSTV par PTT CAT » et confirmez « Transmettre » dans la boîte « Transmettre SSTV ».
6. Pour arrêter : « Annuler / arrêter TX (relâche PTT) » ou n'importe quelle touche de la radio.

**Résultat attendu :** image envoyée, PTT relâché et confirmé par la radio ; l'application ne mesure pas la RF. CAT multi-radio propose aussi « Envoyer une image », « Arrêter TX », « Recevoir SSTV » et « Arrêter la réception ».

**Erreurs courantes :**

- Refus à cause du verrouillage TX, de la bande, de la batterie ou de la modulation de la radio.
- Sans armement par la touche 9 ou sans indicatif, rien n'est émis.
- Rien n'est émis pendant le suivi d'un passage.

### 12. Modes numériques intégrés

**Objectif :** recevoir et générer `FT8`, `FT4` et `FT2` avec le décodeur RadiCodex, sans autre application.

1. Appuyez sur « Modes numériques FT8 / FT4 / FT2 » sur l'écran principal, ou sur « Décodeur et TX intégrés » dans la carte des modes numériques du CAT.
2. Choisissez le mode : `FT8` (créneau de 15 s), `FT4` (7,5 s) ou `FT2` (3,75 s, candidat). Vous verrez l'horloge UTC et le créneau.
3. Pour recevoir, appuyez sur « Écouter » (micro ou entrée audio USB d'Android) ou « Décoder un WAV ». La réception `FT4` et `FT2` n'est pas encore disponible.
4. Pour émettre, saisissez votre indicatif et un message qui le contient, puis appuyez sur « Enregistrer le WAV » ou « Émettre au prochain créneau ». L'application n'actionne pas le PTT : utilisez le PTT de l'opérateur ou le VOX. « Arrêter TX » coupe aussitôt.

**Résultat attendu :** la liste affiche UTC, SNR, DT, Hz et message ; l'émission est jouée une fois, 0,5 s après le début du créneau.

**Erreurs courantes :**

- Message non valide, sans indicatif, ou ton hors de 100-5000 Hz.
- Sans autorisation du micro, l'écoute est impossible.
- `FT2` est un candidat historique, validé uniquement face à un récepteur externe.

## Problèmes fréquents

- Aucun appareil USB n'apparaît : utilisez un câble OTG de données (pas seulement de charge) et vérifiez que la radio est dans le bon mode CAT.
- Android n'accorde pas l'autorisation USB : choisissez de nouveau l'appareil ; l'autorisation expire ou est propre à chaque appareil.
- L'application revient à la RX nominale : l'accord n'a pas été renouvelé à temps (3 s sans renouvellement).
- Aucun passage n'apparaît : enregistrez l'observateur et mettez à jour les TLE.
- J'ai perdu mes données après une réinstallation : désinstaller supprime la base locale ; exportez le JSON avant.
- L'italien n'apparaît pas dans l'application : elle ne propose que Español, English (US), Français et Deutsch ; le guide existe en italien.
- Aide de configuration générale : [Aide de configuration](AYUDA-CONFIGURACION.md). OpenGD77 : [Aide OpenGD77](AYUDA-OPENGD77.md).

## Sécurité à l'émission

- N'émettez qu'avec une licence, sur une fréquence qui vous est autorisée, avec une charge fictive ou une antenne adaptée et la puissance minimale pendant les essais.
- Un indicatif est obligatoire pour le SSTV par CAT et pour le test PTT ; il doit contenir lettres, chiffres et /.
- Limites du PTT : la radio coupe à 120 s et l'application limite l'audio à 110 s ; le « Test PTT 3 s » dure 3 s ; l'application renouvelle le PTT toutes les 400 ms et la radio le relâche après 1,5 s si l'application tombe en panne.
- N'importe quelle touche de la radio interrompt l'émission ; rien n'est émis pendant le suivi d'un passage.
- N'émettez pas vers des satellites inactifs ni dans des segments qui ne sont pas les vôtres ; le respect de la réglementation est votre responsabilité.
- Les fonctions d'émission sont expérimentales et n'ont pas de validation RF.

## Vidéo de démonstration

Vidéo avec tous les tutoriels : [bricohams-android-demo.mp4](../../media/bricohams-android-demo.mp4).

Chapitres, dans l'ordre des tutoriels :

1. Avant de commencer : installation, permissions et langue.
2. Carnet de trafic.
3. ARDF et GPS.
4. CAT RX USB.
5. Éditeur de canaux Quansheng.
6. OpenGD77.
7. CAT multi-radio et modes numériques.
8. Satellites.
9. Rotor AZ/EL.
10. Réception audio en direct.
11. Morse.
12. SSTV Robot36.
13. Problèmes fréquents et sécurité à l'émission.
