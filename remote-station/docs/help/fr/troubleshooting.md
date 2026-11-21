# Diagnostic et dépannage

401 : jeton absent/invalide ; 403 : rôle/origine interdit ; 409 : ressource occupée ou session incertaine ; 503/502 : agent/configuration/lien indisponible. Consultez le code et les journaux sans partager de secrets.

CAT busy pendant PTT est volontaire. Si RX reste incertain, utilisez l'arrêt physique. DAC renommé, audio ancien, fréquence d'échantillonnage non supportée ou permission refusée bloquent l'audio sans choix silencieux d'un autre appareil.

1. Vérifiez /healthz, certificats, nom d'hôte et horloge.
2. Vérifiez câble/pilote USB, port explicite, baud et absence d'autre propriétaire CAT.
3. Vérifiez jetons/rôles/origines sans secrets dans URL, captures ou tickets.
4. Vérifiez PortAudio/sounddevice, nom/canal DAC, VOX désactivé et permission microphone.
5. Distinguez démonstration et télémétrie réelle ; préservez l'erreur initiale et ne déclarez pas un STOP incertain réussi.

[Référence technique (ES)](../../diagnostico.md)
