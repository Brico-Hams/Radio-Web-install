# Installation et architecture

L'hôte coordinateur sert la console HTML5/JavaScript et autorise les accès. L'agent sans interface graphique fonctionne près de la radio sous Windows, Linux, macOS ou Raspberry Pi avec Python compatible. Son ZIPAPP ne nécessite pas Node.js à l'exécution.

Installez Python 3.12 ou ultérieur et l'agent/hôte distribués. L'audio nécessite sounddevice et, selon le système, PortAudio. L'APK est debug ; iOS nécessite macOS/Xcode. Aucune validation physique ou multiplateforme n'est revendiquée.

1. Reliez la radio par USB ou l'interface série documentée à la machine de l'agent.
2. Configurez des jetons distincts par rôle et un secret séparé pour le lien hôte→agent distant.
3. Démarrez l'agent explicitement configuré, puis l'hôte et la console.
4. Maintenez agent, système et dépendances à jour.

[Référence technique (ES)](../../instalacion.md)
