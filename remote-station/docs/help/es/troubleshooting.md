# Diagnóstico y solución de problemas

401: token ausente/inválido; 403: rol u origen no permitido; 409: recurso ocupado o sesión no confirmada; 503/502: agente, configuración o enlace no disponible. Revisa el código específico mostrado y los logs sin compartir secretos.

CAT busy durante PTT es deliberado. Si RX no se confirma, usa la parada física. Un DAC renombrado, audio no fresco, samplerate no soportado o permiso denegado bloquean audio; no se selecciona otro dispositivo silenciosamente.

1. Consulta /healthz del host/agente y verifica certificados, hostname y reloj.
2. Comprueba cable USB, driver, puerto explícito, baud y ausencia de otro programa propietario del CAT.
3. Revisa tokens/roles/orígenes sin poner secretos en URL, capturas o tickets.
4. Para audio revisa PortAudio/sounddevice, nombre/canal del DAC, VOX apagado y permiso de micrófono.
5. Distingue demostración de telemetría real y conserva el error original; no declares éxito tras una parada incierta.

[Referencia técnica (ES)](../../diagnostico.md)
