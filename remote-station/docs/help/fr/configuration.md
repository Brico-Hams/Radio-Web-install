# Configuration de l'agent, de l'hôte et USB/CAT

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

[Référence technique (ES)](../../despliegue-seguro.md)
