# Aide Bricohams Radio Workspace - Remote Station

Guide du logiciel disponible. Expérimental ne signifie pas validé sur matériel. La radio est reliée physiquement à l'agent ; le client se connecte à l'hôte.


<a id="installation"></a>

## Installation et architecture

L'hôte coordinateur sert la console HTML5/JavaScript et autorise les accès. L'agent sans interface graphique fonctionne près de la radio sous Windows, Linux, macOS ou Raspberry Pi avec Python compatible. Son ZIPAPP ne nécessite pas Node.js à l'exécution.

Installez Python 3.12 ou ultérieur et l'agent/hôte distribués. L'audio nécessite sounddevice et, selon le système, PortAudio. L'APK est debug ; iOS nécessite macOS/Xcode. Aucune validation physique ou multiplateforme n'est revendiquée.

1. Reliez la radio par USB ou l'interface série documentée à la machine de l'agent.
2. Configurez des jetons distincts par rôle et un secret séparé pour le lien hôte→agent distant.
3. Démarrez l'agent explicitement configuré, puis l'hôte et la console.
4. Maintenez agent, système et dépendances à jour.

<a id="connection"></a>

## Connexion et authentification

La console web utilise son propre hôte. Android/iOS demandent l'URL HTTPS de l'hôte, sans identifiants, chemin ou paramètres. Le jeton reste seulement en mémoire : aucun fichier, cookie ou stockage local.

Admin et opérateur accèdent aux commandes autorisées ; l'auditeur reçoit RX et les données permises, pas le PTT. L'invité est restreint. Une session connectée ne prouve pas qu'une radio physique est connectée.

1. Saisissez l'hôte HTTPS si demandé et le jeton de votre rôle.
2. Cliquez sur Connecter et vérifiez les avis d'autorisation et de disponibilité de l'agent.
3. Configurez CA/nom d'hôte fiables et origines autorisées ; n'ignorez jamais un certificat.
4. Déconnectez avant de changer d'hôte ou d'identifiants.

<a id="configuration"></a>

## Configuration de l'agent, de l'hôte et USB/CAT

L'écran Configuration prépare des commandes locales ; il ne les exécute pas, n'installe pas de pilotes et n'ouvre pas de ports. Modèle, port et baud sont explicites. L'inventaire n'identifie pas automatiquement le port CAT.

Sans activation CAT, l'agent énumère seulement les appareils. L'assistant n'active pas PTT, ATU, VOX, RTS ou DTR. Un pilote USB peut produire des impulsions à l'ouverture : validez l'installation et gardez un arrêt local.

L'hôte exige certificat/clé TLS, URL HTTPS de l'agent et CA de confiance. Certificat/clé client mTLS constituent une paire facultative ; les origines autorisées sont explicites. Configurez BRICOHAM_ADMIN_TOKEN et BRICOHAM_STATION_AGENT_TOKEN distincts dans l'environnement local, jamais dans des URL ou commandes partagées. Configurez le même secret de liaison dans l'agent selon le guide de déploiement.

1. Choisissez le système de l'agent et un profil série, pas une syntaxe réseau de famille.
2. Identifiez le port par interface/fabricant et documentation ; ne prenez pas automatiquement le premier COM ou ttyUSB.
3. Saisissez baud et bits d'arrêt correspondant à la radio.
4. Copiez la commande sur la machine de l'agent. L'accès distant exige en plus certificat/clé TLS et configuration de l'hôte.
5. Installez le wheel de l'hôte ; préparez et copiez sa commande sur le coordinateur. Vérifiez certificats, nom d'hôte et secrets avant connexion.
6. Pour les clients mobiles, autorisez seulement leurs origines exactes, par exemple https://localhost et capacitor://localhost, séparées par virgules.
7. Limites et activations puissance/PTT/audio nécessitent les fichiers administratifs locaux documentés.

<a id="cat"></a>

## Radios, fonctions et compatibilité

Le catalogue distingue candidats, profils de requêtes, syntaxe de famille et validation matérielle. Un profil CAT ne garantit pas toutes les fonctions, le firmware, l'USB ou un amplificateur. Aucune radio n'est testée ici.

FTX-1 : FA/FB MAIN/SUB, MD0/MD1 et consigne PC expérimentaux avec activation/readback. MAIN/SUB ne sélectionne pas automatiquement l'émetteur. Aucune interface SPA-1 indépendante n'est inventée. Spectre/waterfall natifs restent unsupported, sans remplacement SDR ou simulation cachée.

1. Consultez Protocoles et radios candidates pour le profil exact et ses requêtes.
2. Lisez l'état avant de modifier fréquence, mode ou puissance.
3. En cas d'erreur, TX/ATU ou réponse incertaine, demandez RX et relisez ; ne répétez pas TX.
4. Consultez la matrice technique et la documentation du modèle/firmware.

<a id="audio"></a>

## Audio RX et microphone distant

RX utilise une entrée explicite de l'agent et AudioWorklet. TX utilise un vrai microphone, PCM16LE mono 48 kHz et WebSocket authentifié hôte→agent. Ce n'est ni WebRTC ni l'audio numérique WSJT-X.

Configurez indice, nom exact et canal du DAC, l'entrée USB locale de la radio et désactivez VOX. Le DAC reste muet jusqu'au PTT confirmé. Aucun repli vers le microphone local si une session audio est requise.

1. Démarrez Écouter RX et accordez seulement les permissions nécessaires.
2. Pour la phonie, consultez PTT, confirmez RX et préparez le microphone distant.
3. Attendez le canal prêt, activez la case de session et maintenez PTT.
4. Relâcher demande RX ; déconnecter le microphone libère les pistes. Perte de focus/canal, audio ancien ou saturation arrêtent la session.
5. Niveaux, routage USB et audio mobile nécessitent une validation physique.

<a id="safety"></a>

## PTT, limites et sécurité RF

Le PTT FTX-1 expérimental est désactivé par défaut et peut émettre réellement. Il exige MAIN VFO simplex LSB/USB, sans split/clarificateur TX et limites locales de fréquence, consigne PC et durée. CAT donne une consigne, pas une puissance RF mesurée.

Le bail CAT exclusif dure deux secondes, renouvelées pendant l'appui, avec plafond absolu. STOP incertain bloque START et réessaie RX. Le logiciel ne garantit pas l'arrêt après perte USB/processus, VOX/PTT local ni l'absence de toute attaque.

1. Utilisez ARRÊTER TX / confirmer RX avant le premier START.
2. Respectez autorisations, bandes et protections RF locales.
3. Gardez un arrêt physique indépendant d'USB et un opérateur de station accessible.
4. N'exposez pas CAT, rotctld ou UDP WSJT-X ; utilisez TLS, pare-feu et secrets séparés.
5. CW virtuel et TX numérique actif ne sont pas implémentés ; aucun bouton fictif ne les remplace.

<a id="accessories"></a>

## Rotors, coupleurs et puissance

Le rotor rotctld utilise position, cible, limites mécaniques, bail et STOP. Le lien est loopback, sans authentification des processus locaux. Un arrêt incertain bloque le mouvement.

IC-7300 propose RF PWR CAT et insertion/bypass ATU avec limites/permissions locales. FTX-1 PC limite les consignes field/SPA-1. Pas d'accord automatique ni de contrôle générique d'amplificateur/coupleur.

1. Configurez les limites physiques et un arrêt indépendant du rotor.
2. Lisez la position avant de bouger et gardez STOP disponible.
3. Lisez puissance/état du coupleur avant réglage ; respectez les unités du modèle.
4. Ne confondez pas insertion ATU et TUNE, ni consigne et mesure.

<a id="logs-digital"></a>

## Journal et modes numériques WSJT-X

Le journal local utilise SQLite, création de QSO selon rôle et export ADIF. Ni synchronisation ni import automatique. Vérifiez indicatif, heure, fréquence et mode.

L'agent reçoit état/décodages UDP passifs d'une instance WSJT-X identifiée. UDP local n'est pas authentifié et n'autorise pas de commande. WSJT-X est installé séparément ; moteur TX et audio numérique non intégrés.

1. Configurez port UDP et ID exacts de WSJT-X dans l'agent.
2. N'exposez pas UDP à Internet et n'utilisez pas un décodage comme autorisation TX.
3. Enregistrez explicitement le QSO et exportez ADIF.
4. Validez les téléchargements de fichiers sur chaque client mobile.

<a id="mobile"></a>

## Android, tablette, iPhone et iPad

Les clients partagent la console responsive et les commandes disponibles. Android demande le microphone lors de la préparation audio, pas à l'entrée. iOS possède sa description d'usage.

L'APK debug est compilé, sans signature de production ni essai tablette. Projets iPhone/iPad préparés, sans IPA validée. L'agent Android USB OTG indépendant n'est pas encore implémenté.

1. Utilisez un certificat reconnu par l'appareil et autorisez l'origine native sur l'hôte.
2. Gardez l'app au premier plan pendant PTT ; masquer/fermer demande RX et libère le microphone.
3. Si un dialogue annule la préparation, répétez le geste après autorisation ; TX n'est pas répété.
4. Validez cycle de vie, audio et export ADIF avant réception finale.

<a id="troubleshooting"></a>

## Diagnostic et dépannage

401 : jeton absent/invalide ; 403 : rôle/origine interdit ; 409 : ressource occupée ou session incertaine ; 503/502 : agent/configuration/lien indisponible. Consultez le code et les journaux sans partager de secrets.

CAT busy pendant PTT est volontaire. Si RX reste incertain, utilisez l'arrêt physique. DAC renommé, audio ancien, fréquence d'échantillonnage non supportée ou permission refusée bloquent l'audio sans choix silencieux d'un autre appareil.

1. Vérifiez /healthz, certificats, nom d'hôte et horloge.
2. Vérifiez câble/pilote USB, port explicite, baud et absence d'autre propriétaire CAT.
3. Vérifiez jetons/rôles/origines sans secrets dans URL, captures ou tickets.
4. Vérifiez PortAudio/sounddevice, nom/canal DAC, VOX désactivé et permission microphone.
5. Distinguez démonstration et télémétrie réelle ; préservez l'erreur initiale et ne déclarez pas un STOP incertain réussi.
