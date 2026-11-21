# Diagnóstico e resolução de problemas

401 : token ausente/inválido ; 403 : função/origem proibida ; 409 : recurso ocupado/sessão incerta ; 503/502 : agente/configuração/enlace indisponível. Veja código e logs sem partilhar segredos.

CAT busy durante PTT é deliberado. Se RX for incerto, use paragem física. DAC renomeado, áudio antigo, sample rate não suportado ou permissão negada bloqueiam áudio em vez de escolher outro dispositivo silenciosamente.

1. Verifique /healthz, certificados, hostname e relógio.
2. Verifique cabo/driver USB, porta explícita, baud e ausência de outra aplicação a usar CAT.
3. Reveja tokens/funções/origens sem segredos em URLs, capturas ou tickets.
4. Verifique PortAudio/sounddevice, nome/canal DAC, VOX desligado e permissão microfone.
5. Distinga demonstração e telemetria real ; preserve erro inicial e nunca anuncie sucesso após STOP incerto.

[Referência técnica (ES)](../../diagnostico.md)
