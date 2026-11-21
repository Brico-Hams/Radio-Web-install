# Journal et modes numériques WSJT-X

Le journal local utilise SQLite, création de QSO selon rôle et export ADIF. Ni synchronisation ni import automatique. Vérifiez indicatif, heure, fréquence et mode.

L'agent reçoit état/décodages UDP passifs d'une instance WSJT-X identifiée. UDP local n'est pas authentifié et n'autorise pas de commande. WSJT-X est installé séparément ; moteur TX et audio numérique non intégrés.

1. Configurez port UDP et ID exacts de WSJT-X dans l'agent.
2. N'exposez pas UDP à Internet et n'utilisez pas un décodage comme autorisation TX.
3. Enregistrez explicitement le QSO et exportez ADIF.
4. Validez les téléchargements de fichiers sur chaque client mobile.

[Référence technique (ES)](../../logbook.md)
