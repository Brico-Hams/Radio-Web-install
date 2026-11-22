# Diagnóstico

## Informes técnicos minimizados

Host, agentes y clientes incorporan un registro técnico separado de los logs
detallados privados. El envío remoto requiere consentimiento y receptor HTTPS;
no se configura automáticamente un servicio público. Consulta la
[guía multilingüe de diagnóstico y privacidad](../../docs/DIAGNOSTICS.md).

La entrega solo se confirma con HTTP 202 y `{"accepted":true}`. El rol
`diagnostic_reporter` entrega informes sin adquirir control CAT/PTT. Borrar el
historial local no elimina informes ya recibidos. Un cierre brusco puede impedir
que la cola asíncrona guarde el último evento; no se promete capturar todos los
fallos ni anonimato absoluto de IP/metadatos de conexión.

| Síntoma | Causa probable | Acción |
|---|---|---|
| El proceso finaliza indicando que falta `BRICOHAM_ADMIN_TOKEN` | El token es obligatorio para iniciar | Genera un token temporal siguiendo `docs/seguridad.md` |
| El arranque rechaza el token | Menos de 32 caracteres, caracteres no ASCII, espacios externos o token duplicado entre roles | Genera un secreto nuevo y asigna uno distinto por rol |
| `401 unauthorized` | Falta el bearer token o no coincide | Envía `Authorization: Bearer <token>`; no lo pongas en una URL |
| `403 forbidden` | El rol no permite esa ruta | Invitados solo leen capacidades; diagnóstico requiere admin/operador |
| `/api/v1/devices` responde `503 station_agent_unavailable` | El agente local no está iniciado en `127.0.0.1:8791` | Inícialo con `py -3.12 -m bricoham_station_agent`; la UI seguirá funcionando sin el agente |
| `405 method_not_allowed` | Se intentó un método no permitido | Radio/inventario solo lectura; únicamente logbook opt-in admite POST |
| `/healthz` responde pero no hay estación real | El proceso solo expone simulación | El estado declara `data_is_simulated: true` y `hardware_connected: false` |
| El catálogo indica `unsupported` para CAT/scope/audio/PTT | No existe implementación BricoHams de hardware | Consulta la ficha del modelo; no conectes RF ni habilites señales |
| El puerto no arranca | Puerto ocupado, IPv4 inválida o TLS ausente | Cambia `--port`; fuera de loopback configura certificado/clave explícitos |
| `502 station_agent_tls_failed` | CA no confiable, certificado caducado o nombre incorrecto | Corrige certificado/DNS/CA del agente; no desactives la verificación |
| La app nativa no conecta | Host no HTTPS, certificado no confiable u origen no permitido | Revisa la guía HTTPS y la allowlist de orígenes nativos; no uses comodines |

El agente enumera interfaces serie, pero no abre puertos ni identifica cuáles son
CAT. Esa lista no constituye una prueba de radio conectada.
