# Arquitectura actual

## Alcance

El coordinador sirve consola React/TypeScript, logbook y APIs; el agente Python
independiente enumera USB/serie y ofrece CAT de lectura experimental y recepción
pasiva WSJT-X, rotor rotctld y captura RX PCM opt-in con dependencia opcional.
Los codecs y perfiles se detallan en el diagnóstico CAT. El codec
FTX-1 decodifica frecuencia en Hz conforme al manual oficial CAT 2508-C,
modos MAIN/SUB y telemetría PC/AC/TX; la ruta separada de ajustes permite PC y
[frecuencia/modo MAIN/SUB](control-frecuencia-modo.md) con opt-ins independientes.
Ambos servicios usan loopback por defecto; otra IPv4 requiere TLS explícito.
El agente puede exigir certificado de cliente mTLS al host, además del bearer;
el host conserva la verificación CA/hostname y no entrega su clave a la consola.
El agente headless puede distribuirse sin coordinador ni UI. Los ajustes
[IC-7300/FTX-1](control-potencia-acoplador.md) son un opt-in separado del CAT de lectura.

```text
Navegador / cliente Capacitor Android, iPhone o iPad
    ├── GET / y recursos estáticos (sin token) ──> servidor estático
    └── GET/POST /api/v1/*, bearer token ────────> API REST v1
                                                       ├── Autenticación por rol
                                                       ├── Catálogo de capacidades
                                                       ├── Catálogo de radios candidatas
                                                       ├── Simulador determinista
                                                       ├── Logbook SQLite opcional
                                                       └── Proxy CAT/digital/rotor/ajustes/audio
                                                           └── Agent API local o HTTPS validado
                                                               ├── Inventario (sin abrir puertos)
                                                               ├── CAT serie opt-in (solo consultas)
                                                               ├── WSJT-X UDP local no autenticado
                                                               ├── Rotor rotctld loopback opt-in
                                                               ├── Ajustes IC-7300/FTX-1 (lock CAT)
                                                               └── ADC RX opcional, un consumidor
```

En desarrollo, Vite sirve la consola en loopback y reenvía `/api` al coordinador;
en ejecución local normal, los archivos de `apps/web-console/dist` comparten el
origen de la API. El servidor estático solo sirve archivos dentro de ese
directorio y rechaza el recorrido de rutas. Si no existe un build, la API sigue
operativa y la raíz responde `web_console_not_built`.
`GET /api/v1/devices` reenvía inventario al agente. El enlace local conserva el
token; el enlace remoto exige HTTPS con validación CA/hostname y un secreto
dedicado distinto de los usuarios. Si falla no hay fallback HTTP ni simulación.
Las rutas CAT/digital tienen el mismo proxy allowlist y permisos.
La lectura de metadatos nunca selecciona ni abre un puerto.
`GET /api/v1/radios` publica el registro versionado de candidatos y atribuye cada
dato a su fuente; no modifica ni eleva el estado de capacidades BricoHams.

## Contratos

- La API usa JSON y `api_version: "v1"`.
- Los esquemas de estado y capacidades tienen su propia versión.
- El catálogo describe capacidades de software, no certifica el hardware.
- Los datos de demo declaran `data_is_simulated: true` y
  `hardware_connected: false`.
- La interfaz valida la forma de las respuestas antes de mostrarlas. El token
  solo vive en memoria de la pestaña; no se guarda en `localStorage`, cookies ni
  almacenamiento persistente.
- El servidor estático no requiere token; los datos de estación y diagnóstico
  mantienen sus permisos bearer por rol. Logbook, rotor y radio-settings permiten POST
  opt-in para admin/operador.
  [PTT FTX-1](ptt-ftx1.md) añade una ruta separada, desactivada por defecto,
  con sesión exclusiva CAT, lease, watchdog y guardas MAIN/simplex/SSB.
- La web usa mismo origen con CSP. Los clientes nativos eligen un host HTTPS
  y requieren CORS por origen explícito, sin comodines ni cookies. Los tokens
  no se reenvían tras redirecciones.
- El agente requiere rol admin/operador para inventario; omite números de serie
  y mantiene `classification: "unknown"` para cada interfaz.
- Los codecs están separados del transporte: solo se envían consultas de la
  allowlist con decoder cuando el agente tiene modelo/puerto/baud explícitos.
- La telemetría WSJT-X declara no estar autenticada ni ser apta para control.
  No se usa para autorizar órdenes ni registrar contactos automáticamente.

## Decisiones para evolución

- Python mantiene ligero el coordinador; `pyserial` enumera puertos.
  `wsproto`/`h11` implementan WebSocket sin parser propio; están incluidos en
  la distribución headless. PortAudio/sounddevice siguen siendo opcionales.
- La API CAT de consultas no acepta setters. El canal de ajustes por modelo tiene
  allowlist, límites locales, RX observado y readback; no emite órdenes de TX.
  El canal PTT FTX-1 tiene lease y watchdog; CW, identidad
  revocable persistente e interlocks RF adicionales siguen pendientes.
- El rotor usa límites explícitos, lease exclusiva, watchdog y STOP; la parada
  es best effort, no sustituye protección mecánica. Véase [control de rotores](control-rotores.md).
- Audio RX transmite PCM BHR1 autenticado sin grabación completa en el host;
  AudioWorklet reproduce con búfer acotado. La entrada es explícita, el extra
  nativo queda fuera del ZIPAPP base y la ruta USB/móvil sigue sin validar.
  Véase [audio RX](audio-rx.md).
- [Audio TX](audio-tx.md) lleva PCM real cliente→host→agente por WebSocket
  autenticado/TLS. DAC explícito silenciado hasta CAT TX, capacidad de sesión
  vinculada a PTT y watchdog de frescura; un solo bucle relay evita acceso SSL
  simultáneo. No certifica rutas USB/RF ni clientes nativos.
- SQLite, HTTPS, ZIPAPP y proyectos nativos existen; CW remoto,
  otros acopladores, potencia RF medida/amplificadores independientes e identidad distribuida
  persistente siguen pendientes.
- No se declara compatibilidad FTX-1/SPA-1 hasta revisar documentación y probar el
  hardware físico.

La arquitectura objetivo, los límites de confianza y la navegación web se
representan en [los mapas de arquitectura](mapas.md), que distinguen módulos
implementados y planificados.
Para la configuración vigente consulta [despliegue seguro](despliegue-seguro.md)
y [clientes móviles](clientes-moviles.md); los mapas conceptuales no certifican
que cada módulo objetivo esté terminado.
