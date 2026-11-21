# Áudio RX e microfone remoto

RX utiliza entrada explícita do agente e AudioWorklet. TX utiliza microfone real, PCM16LE mono 48 kHz e WebSocket autenticado host→agente. Não é WebRTC nem áudio digital WSJT-X.

Para TX escolha índice, nome exato e canal DAC, configure localmente entrada USB do rádio e desligue VOX. O DAC permanece silenciado até confirmar PTT. Não há fallback para o microfone local se a sessão áudio for exigida.

1. Prima Ouvir RX e autorize só as permissões necessárias.
2. Para fonia, consulte PTT, confirme RX e prepare o microfone remoto.
3. Espere canal pronto, ative a caixa de sessão e mantenha PTT.
4. Soltar pede RX ; desligar microfone liberta pistas. Perda de foco/canal, áudio antigo ou congestão terminam a sessão.
5. Níveis, rotas USB e áudio móvel exigem aceitação física.

[Referência técnica (ES)](../../audio-tx.md)
