# Bricohams Radio Workspace - Remote Station

[Ayuda ES / EN / FR / PT y manuales offline](docs/help/README.md).
Conexión y asistentes locales de configuración de agente/host traducidos;
no ejecutan comandos ni activan TX.

Plataforma experimental con coordinador, consola web, logbook SQLite opcional
y agente USB/serie independiente. Incluye lectura CAT y accesorios opt-in;
no declara hardware validado ni producto completo.

## Estado real

- **Operativo localmente:** API HTTP v1, autenticación bearer por rol, consola
  web, simulador identificado y enumeración de interfaces serie
  por un agente separado. El catálogo registra 49 radios candidatas con la
  evidencia atribuida claramente diferenciada del soporte BricoHams.
- **CAT serie experimental opt-in:** por defecto el agente no abre puertos ni
  identifica cuál es CAT. Con modelo, puerto y baud explícitos puede ejecutar
  consultas de lectura con decoder; ese endpoint no admite setters ni acredita hardware.
  La [integración CAT y WSJT-X](docs/agente-cat-wsjtx.md) documenta activación,
  límites de señales USB y pruebas pendientes. Los codecs también se inspeccionan con
  [el diagnóstico offline](docs/diagnostico-cat.md), sin transporte
  ni compatibilidad CAT física declarada. En FTX-1 la frecuencia usa Hz de
  nueve dígitos, cotejados con el manual oficial CAT 2508-C; se conserva
  el parser de campo crudo para inspección, pero la lectura API devuelve `frequency_hz`.
  Incluye MAIN/SUB `MD0`/`MD1`, lectura PC de cabezal/potencia, AC y estado TX,
  sin sondeo mutante del SPA-1. El ajuste PC usa otra ruta opt-in limitada.
  Esa ruta también permite [frecuencia/modo MAIN/SUB FTX-1](docs/control-frecuencia-modo.md)
  con permisos locales independientes, RX observado, barrera TX y readback;
  no selecciona VFO activo ni transmisor.
- **Cobertura offline:** 34 perfiles de consultas por modelo, 14 candidatos
  con primitivas de familia e IC-7800 sin implementar. IC-7100 e IC-7200 tienen
  perfiles CI-V cotejados con manuales oficiales. Tener un perfil no
  significa disponer de todas las funciones CAT ni de una radio conectada.
  K3/KX3/KX2 añaden consultas de lectura cotejadas con Elecraft G5;
  FM excluido en KX2 y sin heredar opciones K3S ni control de transmisión.
- **Audio RX experimental:** [captura PCM de entrada explícita](docs/audio-rx.md),
  flujo autenticado agente/host y reproducción AudioWorklet. Dependencia opcional;
  no valida rutas USB ni reproducción móvil, no captura micrófono del cliente ni transmite.
- **Audio TX experimental:** [micrófono remoto y DAC USB explícito](docs/audio-tx.md),
  WebSocket autenticado, TLS/mTLS y capacidad vinculada a PTT; salida silenciada
  hasta confirmar TX, VOX apagado y parada al perder audio fresco.
- **Pendiente:** CW, inicio TX digital/broker WSJT-X, scope/waterfall nativos, aceptación física/móvil,
  agente Android OTG y otros accesorios.
- **Digitales:** receptor UDP local WSJT-X integrado en el agente y consola;
  estado/decodes no autenticados. Replay y Halt Tx mediante opt-in local separado,
  sin ACK ni confirmación de parada RF; no inicia TX ni integra audio digital.
- **Distribución y enlace:** [agente headless y host HTTPS separados](docs/despliegue-seguro.md),
  validación CA/hostname, secreto dedicado, mTLS de equipo opt-in y HTTP remoto prohibido.
- **Clientes móviles:** [proyectos Android/tablet, iPhone e iPad](docs/clientes-moviles.md)
  con consola compartida y host HTTPS configurable; no equivalen a fonía/CW/TX terminados.
- **Rotor experimental opt-in:** [control rotctld local](docs/control-rotores.md),
  posición, objetivo y parada, límites explícitos y sesión deadman; panel común
  web/móvil. Sin aceptación física. Acopladores y regulación de potencia siguen
  pendientes por protocolo/modelo salvo los
  [ajustes por modelo](docs/control-potencia-acoplador.md):
  IC-7300 RF PWR CAT e insertar/bypass ATU; FTX-1 PC de potencia field/SPA-1
  en W de consigna, con cabezal observado y límites. Comprobación RX/readback;
  no son potencia RF medida ni sintonía.
- **Dispositivos de estación experimentales:** [relés/alimentación DLI y Waveshare
  Modbus, rotores serie DCU-1/Rotor-EZ/RT-21 y vista de ruta de señal](docs/dispositivos-estacion.md),
  con [fuentes citadas](docs/STATION-DEVICES-SOURCES.md). Conmutación desactivada por
  defecto y rechazada durante TX; sin TX propio. Modelos sin protocolo público
  figuran como «pendiente de fuente» y sin control.
- **PTT FTX-1 experimental:** [sesión exclusiva y watchdog](docs/ptt-ftx1.md),
  opt-in local separado y desactivado por defecto. Solo MAIN VFO simplex
  LSB/USB, RX explícito previo y límites de frecuencia/consigna/tiempo.
  Puede emitir RF real al activarse; micrófono remoto opcional separado, sin CW.
  La parada por software no sustituye un interlock físico. El simulador
  mantiene TX bloqueado.
- **Pruebas físicas:** pendientes; no se afirma haber probado una FTX-1/SPA-1.
- **Operación local persistente:** [logbook SQLite y exportación ADIF](docs/logbook.md)
  mediante CLI y consola web, sin adquisición automática desde radios.
  Activa la API y el formulario con `--logbook-database ".\logbook.sqlite3"`.
  La consola también muestra consultas CAT por modelo, sin enviarlas.

El estado `unsupported` del catálogo se refiere a esta aplicación y no afirma que
la función sea imposible en el transceptor. Hamlib publica un backend dedicado
para FTX-1, pero BricoHams aún no lo integra. El comando de control `SS` del scope
no es evidencia de un flujo de muestras de espectro. El espectro y waterfall
nativos no se sustituyen por datos sintéticos ni por un SDR.

## Requisitos

- Windows, Linux o macOS para ejecución objetivo; FreeBSD, Raspberry Pi/ARM y
  plataformas adicionales requieren validación específica antes de declarar
  compatibilidad.
- Python 3.12 o posterior.
- `pyserial` 3.5 se instala como dependencia del agente con `py -3.12 -m pip install .`.
- Para compilar la consola web: Node.js 22 y npm.
- El coordinador usa biblioteca estándar; el agente requiere `pyserial`.

## Arranque local (PowerShell)

Instala el agente y sus dependencias una vez:

```powershell
py -3.12 -m pip install .
```

Para compilar la consola web por primera vez (requiere Node.js 22):

```powershell
Set-Location apps\web-console
npm ci
npm run build
Set-Location ..\..
```

Inicia el coordinador:

```powershell
$env:BRICOHAM_ADMIN_TOKEN = py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"
py -3.12 -m bricoham_remote_station
```

El coordinador usa `127.0.0.1:8790` por defecto. Otra interfaz requiere TLS
explícito según la guía de despliegue. El token vive solo en la sesión actual.

En otra terminal, configura el mismo token e inicia el agente local:

```powershell
$env:BRICOHAM_ADMIN_TOKEN = "<el mismo token admin>"
py -3.12 -m bricoham_station_agent
```

El agente usa por defecto `127.0.0.1:8791`, enumera interfaces serie sin abrirlas
y no cambia RTS/DTR. La consola muestra las interfaces como no clasificadas; un
puerto enumerado no se considera un puerto CAT.

Con el build presente, abre `http://127.0.0.1:8790/`; el coordinador sirve la
consola estática en el mismo origen. Para desarrollo con recarga en caliente,
consulta [la guía de la consola web](apps/web-console/README.md).

En otra terminal, consulta el servicio:

```powershell
Invoke-RestMethod http://127.0.0.1:8790/healthz
Invoke-RestMethod http://127.0.0.1:8790/api/v1/status `
  -Headers @{ Authorization = "Bearer $env:BRICOHAM_ADMIN_TOKEN" }
Invoke-RestMethod http://127.0.0.1:8790/api/v1/capabilities `
  -Headers @{ Authorization = "Bearer $env:BRICOHAM_ADMIN_TOKEN" }
```

Rutas de la API:

| Ruta | Acceso |
|---|---|
| `GET /healthz` | Público; solo liveness |
| `GET /api/v1/status` | Admin, operador y oyente |
| `GET /api/v1/capabilities` | Roles configurados |
| `GET /api/v1/radios` | Roles configurados; catálogo de 46 candidatas, no soporte verificado |
| `GET /api/v1/protocols` | Roles configurados; consultas y decoders offline por candidato, sin envío CAT |
| `GET /api/v1/logbook` | Admin, operador y oyente; requiere SQLite configurado; páginas de 50 contactos |
| `POST /api/v1/logbook` | Solo admin/operador; alta manual validada en SQLite, no control de radio |
| `GET /api/v1/logbook/adif` | Admin, operador y oyente; descarga ADIF de hasta 5000 contactos |
| `GET /api/v1/devices` | Admin/operador; proxy al agente loopback, 503 si está detenido |
| `GET /api/v1/cat` | Admin/operador; catálogo del agente o lectura experimental con `?command=` |
| `GET /api/v1/digital` | Admin/operador; estado/decodes WSJT-X recibidos por el agente |
| `POST /api/v1/digital` | Admin/operador; Replay/Halt Tx con opt-in local; entrega no confirmada |
| `GET /api/v1/rotor` | Admin/operador; metadatos o posición con `?command=position`, configuración opt-in |
| `POST /api/v1/rotor` | Admin/operador; objetivo, renovación o parada; límites y deadman en el agente |
| `GET /api/v1/radio-settings` | Admin/operador; configuración IC-7300 opt-in sin abrir puerto |
| `POST /api/v1/radio-settings` | Admin/operador; lectura/ajuste RF PWR o insertar/bypass ATU, sin iniciar sintonía ni PTT |
| `GET /api/v1/diagnostics` | Admin y operador |

Define tokens opcionales `BRICOHAM_OPERATOR_TOKEN`,
`BRICOHAM_LISTENER_TOKEN` y `BRICOHAM_GUEST_TOKEN` antes de iniciar. Los roles
configurados requieren secretos distintos de al menos 32 caracteres. El invitado
solo puede leer el catálogo.

Herramientas locales adicionales:

```powershell
py -3.12 -m bricoham_remote_station.cat_diagnostics list
py -3.12 -m bricoham_remote_station.cat_diagnostics query --model K3S --command FA
py -3.12 -m bricoham_remote_station.logbook --help
```

La instalación también proporciona `bricoham-coordinator`,
`bricoham-station-agent`, `bricoham-cat` y `bricoham-logbook`.

Para generar un wheel que **incluya la consola web**:

```powershell
npm ci --prefix apps\web-console
py -3.12 scripts\build_release.py
```

El wheel queda en `dist`; instalado en otro directorio sirve también la consola
sin Node.js en ejecución. Un wheel creado directamente con `pip wheel .` no
incluye el build web del repositorio. Detalles en [instalación](docs/instalacion.md).

## Pruebas y calidad

```powershell
py -3.12 -m pip install .
py -3.12 -m unittest discover -s tests -v
py -3.12 -m pip install -r requirements-dev.txt
py -3.12 -m ruff check .
py -3.12 -m ruff format --check .
py -3.12 -m pip_audit -r requirements-dev.txt
py -3.12 -m pip_audit .
npm ci --prefix apps/web-console
npm audit --audit-level=high --prefix apps/web-console
npm run test --prefix apps/web-console
npm run lint --prefix apps/web-console
npm run build --prefix apps/web-console
```

La CI ejecuta formato, lint, compilación, pruebas y auditoría de dependencias en
Windows, Linux y macOS. Los contratos están en
[docs/api.openapi.yaml](docs/api.openapi.yaml) y
[docs/api.station-agent.openapi.yaml](docs/api.station-agent.openapi.yaml).

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Consola web](apps/web-console/README.md)
- [Análisis de funciones públicas y fuentes](docs/analisis-publico.md)
- [Investigación de control CAT en GitHub](docs/investigacion-cat-github.md)
- [Decisiones técnicas](docs/decisiones.md)
- [Mapas y diagramas](docs/mapas.md)
- [Radios candidatas](docs/radios-candidatas.md)
- [Conexiones candidatas por modelo](docs/radio-conexiones-candidatas.md)
- [Registro de radios de la API](bricoham_remote_station/radio_candidates.py)
- [Evidencia FTX-1 / SPA-1](docs/hardware/ftx1-spa1.md)
- [Evidencia (tr)uSDX](docs/hardware/trusdx.md)
- [Evidencia QMX+](docs/hardware/qmx-plus.md)
- [Servicio station-agent](bricoham_station_agent/)
- [Hoja de ruta](docs/roadmap.md)
- [Guía de usuario](docs/guia-usuario.md)
- [Guía de desarrollo](docs/guia-desarrollo.md)
- [Instalación](docs/instalacion.md)
- [Diseño del protocolo agente](docs/protocolo-agente.md)
- [Diagnóstico](docs/diagnostico.md)
- [Objetivos de plataforma](docs/plataformas.md)
- [Referencias open source](docs/referencias.md)
- [Seguridad](docs/seguridad.md)
- [Compatibilidad](docs/compatibilidad.md)
- [Pruebas](docs/pruebas.md)
- [Contribuir](CONTRIBUTING.md)
- [Historial de cambios](CHANGELOG.md)
- [Proceso de seguridad](SECURITY.md)

No se ha creado ni publicado una rama remota o Pull Request. Esta copia es local
hasta que se facilite el repositorio oficial y se autorice su publicación.
