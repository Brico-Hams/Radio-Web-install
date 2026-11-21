# Android, tablet, iPhone e iPad

Los clientes comparten la consola responsive y los controles implementados. Android declara permiso de micrófono y lo solicita al preparar audio, no al entrar. iOS incluye la descripción de uso del micrófono.

El APK debug está compilado; no es firma de producción ni prueba en tablet. Los proyectos iPhone/iPad están preparados, sin IPA verificada. El agente Android USB OTG independiente todavía no está implementado.

1. Usa un certificado confiable para el dispositivo y el origen nativo permitido en el host.
2. Mantén la app en primer plano durante PTT; ocultar o cerrar solicita RX y libera micrófono.
3. Si un diálogo de permiso cancela la preparación, repite el gesto después de concederlo; no se reintenta TX.
4. Verifica ciclo de vida, audio y descarga ADIF antes de aceptación final.

[Referencia técnica (ES)](../../clientes-moviles.md)
