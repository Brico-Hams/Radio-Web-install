# Enlace agente–coordinador y evolución del protocolo

## Enlace operativo de lectura y rotor

El host consulta inventario, CAT allowlist y telemetría WSJT-X del agente.
También reenvía operaciones tipadas de rotor opt-in: objetivo, renovación y STOP,
con límites y deadman aplicados localmente en el agente. Consulta
[control de rotores](control-rotores.md) para sus límites y parada best effort.
El endpoint separado [radio-settings](control-potencia-acoplador.md) permite
ajustes IC-7300 opt-in; mantiene el canal CAT de consultas sin comandos arbitrarios.
Por defecto usa HTTP loopback; el enlace remoto opt-in usa HTTPS con verificación
CA/hostname y un token dedicado distinto de los usuarios del host. El agente no
recibe identidad individual del usuario ni órdenes de TX. Un fallo TLS no permite
fallback HTTP; la UI no sustituye errores por simulación.

El contrato operativo está especificado en
[api.station-agent.openapi.yaml](api.station-agent.openapi.yaml); el contrato
del coordinador, incluido su proxy, está en [api.openapi.yaml](api.openapi.yaml).
La [guía HTTPS](despliegue-seguro.md) explica secretos, certificados y límites.
La lease del rotor no implementa un canal distribuido push ni revocación de
identidad; no habilita TX/PTT.

## Requisitos pendientes para el canal de control futuro

- Mensajes JSON tipados/versionados; estación y agente con identificadores
  revocables.
- Canal iniciado desde la estación hacia el coordinador; no publicar puertos CAT
  ni aceptar comandos arbitrarios.
- Autenticación de agente independiente del token de usuario y TLS antes de
  cualquier enlace remoto.
- Capacidades anunciadas por modelo/firmware, cada una con estado y evidencia.
- Telemetría de lectura separada de solicitudes de control; cada solicitud con
  función tipada, estación, usuario/rol, expiración e identificador de auditoría.
- Rechazo explícito de operaciones no soportadas, caducadas o de sesión ajena.
- Heartbeat y lease local; ante pérdida del coordinador, cancelar cualquier
  operación futura y mantener RX-only.
- Separar canal de medios/audio de control. WebRTC/Opus son candidatos, no
  decisiones de implementación.
- TX/PTT no forma parte del primer contrato y seguirá bloqueado.

Antes de versionar un protocolo real se necesita definir y probar autenticación,
revocación, replay, reconexión, concurrencia, backpressure, límites de tamaño,
registro de auditoría y compatibilidad entre versiones.
