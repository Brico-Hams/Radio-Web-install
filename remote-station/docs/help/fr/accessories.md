# Rotors, coupleurs et puissance

Le rotor rotctld utilise position, cible, limites mécaniques, bail et STOP. Le lien est loopback, sans authentification des processus locaux. Un arrêt incertain bloque le mouvement.

IC-7300 propose RF PWR CAT et insertion/bypass ATU avec limites/permissions locales. FTX-1 PC limite les consignes field/SPA-1. Pas d'accord automatique ni de contrôle générique d'amplificateur/coupleur. La couche d'accessoires supervise coupleur et amplificateur : l'amplificateur démarre en STANDBY et y revient en cas de déconnexion, ROS élevé, défaut ou arrêt d'urgence ; l'accord ne démarre que sur demande explicite à 10 W ou moins, et les appareils sans protocole documenté figurent comme pendiente de fuente.

1. Configurez les limites physiques et un arrêt indépendant du rotor.
2. Lisez la position avant de bouger et gardez STOP disponible.
3. Lisez puissance/état du coupleur avant réglage ; respectez les unités du modèle.
4. Ne confondez pas insertion ATU et TUNE, ni consigne et mesure.

[Référence technique (ES)](../../control-potencia-acoplador.md)
