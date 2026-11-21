# Android, tablet, iPhone e iPad

Clientes partilham consola responsive e controlos disponíveis. Android pede microfone ao preparar áudio, não ao entrar. iOS inclui descrição de utilização.

APK debug compilado, sem assinatura de produção ou teste em tablet. Projetos iPhone/iPad preparados, sem IPA validada. Agente Android USB OTG independente ainda não implementado.

1. Use certificado confiável para o dispositivo e origem nativa permitida no host.
2. Mantenha app em primeiro plano durante PTT ; ocultar/fechar pede RX e liberta microfone.
3. Se um diálogo cancelar preparação, repita gesto após conceder permissão ; TX não se repete.
4. Valide ciclo de vida, áudio e download ADIF antes de aceitação final.

[Referência técnica (ES)](../../clientes-moviles.md)
