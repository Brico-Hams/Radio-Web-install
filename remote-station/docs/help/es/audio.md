# Audio RX y micrófono remoto

RX utiliza una entrada explícita del agente y AudioWorklet en el cliente. TX utiliza micrófono real, PCM16LE mono 48 kHz y WebSocket autenticado host→agente. No es WebRTC ni audio digital WSJT-X.

Para TX configura el DAC por índice, nombre y canal, selecciona localmente la entrada USB correcta y apaga VOX. El DAC permanece silenciado hasta confirmar PTT. No hay fallback al micrófono local de la radio si se exige la sesión de audio.

1. Pulsa Escuchar RX para iniciar recepción y autoriza únicamente los permisos necesarios.
2. Para fonía, consulta PTT, confirma RX y pulsa Preparar micrófono remoto.
3. Espera el canal preparado, habilita la casilla de sesión y mantén el botón PTT.
4. Soltar solicita RX; Desconectar micrófono libera las pistas. Pérdida de foco/canal, audio atrasado o saturación detienen la sesión.
5. No se certifican niveles, rutas USB ni captura/reproducción móvil hasta la aceptación física.

[Referencia técnica (ES)](../../audio-tx.md)
