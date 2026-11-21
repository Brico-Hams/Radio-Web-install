# Audio RX et microphone distant

RX utilise une entrée explicite de l'agent et AudioWorklet. TX utilise un vrai microphone, PCM16LE mono 48 kHz et WebSocket authentifié hôte→agent. Ce n'est ni WebRTC ni l'audio numérique WSJT-X.

Configurez indice, nom exact et canal du DAC, l'entrée USB locale de la radio et désactivez VOX. Le DAC reste muet jusqu'au PTT confirmé. Aucun repli vers le microphone local si une session audio est requise.

1. Démarrez Écouter RX et accordez seulement les permissions nécessaires.
2. Pour la phonie, consultez PTT, confirmez RX et préparez le microphone distant.
3. Attendez le canal prêt, activez la case de session et maintenez PTT.
4. Relâcher demande RX ; déconnecter le microphone libère les pistes. Perte de focus/canal, audio ancien ou saturation arrêtent la session.
5. Niveaux, routage USB et audio mobile nécessitent une validation physique.

[Référence technique (ES)](../../audio-tx.md)
