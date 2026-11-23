# Estación remota integrada

El desarrollo original BricoHam Remote Station se incorpora como
`remote-station/` a **Bricohams Radio Workspace / RadiCodex**.
Se conserva íntegro el código propio, sus tests, documentos y proyectos móviles,
sin caches, SDK locales, secretos ni binarios de compilación.
La licencia raíz GPL-3.0-or-later y los avisos MIT del componente se conservan;
no se cambian las licencias de dependencias ni de recursos de terceros.

## Cuándo usar cada implementación remota

El proyecto contiene dos estaciones remotas independientes:

| Nombre en la interfaz | Código | Usar cuando |
| --- | --- | --- |
| **Estación remota (host/agente Python)** | `remote-station/`, `station.html` | Necesitas host HTTPS coordinador, agentes headless Python y clientes web/Android/iOS. El cliente Android solo se conecta. |
| **Remote shack (rigctld, desktop)** | `remote-agent.cjs`, `remote-station.cjs`, `remote-relay.cjs`, `remoto.html` (README: «Remote shack») | Quieres controlar una radio por Hamlib `rigctld` desde la app de escritorio/Raspberry Pi, con relé propio, audio Opus y sintonizador FTX-1. |

No comparten puertos ni configuración (la segunda usa `~/.radicodex/`). Los
catálogos de radios y el análisis CAT FTX-1 están duplicados a propósito: no se
han unificado porque los formatos difieren. Las protecciones TX (TX
desactivado por defecto, protección de ROE alta, límites de tiempo de
ATAS/sintonía, parada de emergencia y vigilantes de PTT) se mantienen en ambas.

## Integración y límites

- La navegación web enlaza **Estación remota (host/agente Python)** una sola vez.
  Prepara una URL HTTPS validada
  y abre el cliente servido por el host; no recoge ni envía tokens. La entrada
  **Remote shack (rigctld, desktop)** aparece solo en el escritorio.
- RadiCodex Android incluye una pantalla HTTPS interna: sin puentes JavaScript
  nativos, acceso a ficheros ni contenido mixto. Fija el origen seleccionado,
  rechaza certificados inválidos y solicita permiso únicamente para micrófono.
  Al pasar a segundo plano destruye la página/sesión, sin reconexión automática.
- El cliente Android dedicado y el proyecto iPhone/iPad permanecen en
  `remote-station/apps/web-console/`, con marca, colores, tipografía y recursos
  oficiales BricoHams. iOS requiere Mac/Xcode para compilar y firmar.
- El host coordinador y los agentes headless se ejecutan por separado.
  El [agente Android USB independiente](../remote-station/docs/agente-android-usb.md)
  tiene APK propio, enlace WSS saliente y CAT FTX-1 de solo lectura, con
  selección explícita y diagnóstico ES/EN/FR/PT. Su aceptación OTG física,
  audio, PTT, CW, digitales y accesorios siguen pendientes; no se confunde
  con el cliente ni se presentan esas funciones como implementadas.
  El servidor Node local de firmware **no se publica en Internet** ni se
  convierte en proxy remoto. No se exponen copias/codeplugs ni proveedores.
- No se cambian los conectores USB, memoria, firmware ni funciones nativas
  existentes. Los perfiles CAT de estación son independientes y opt-in.
- Se mantienen identificadores de protocolo, variables `BRICOHAM_*`, paquetes
  Python y application IDs para evitar romper configuración/clientes existentes.
  Se añaden aliases `bricohams-station-host` y `bricohams-station-agent`.

## Compilar y ejecutar

En la raíz, Node 22 y Python 3.12 o superior:

```powershell
npm ci
npm --prefix remote-station/apps/web-console ci
npm run build:station-branding
py -3.12 -m venv remote-station\.venv
remote-station\.venv\Scripts\python.exe -m pip install .\remote-station
npm run build:station
```

Los paquetes de host y agente se generan en `remote-station/dist/` (carpeta local, ignorada por git: los artefactos no están versionados).
En POSIX, utiliza `python3` y `remote-station/.venv/bin/python`.
La [guía de despliegue seguro](../remote-station/docs/despliegue-seguro.md)
describe TLS/CA/hostname, mTLS opcional y secretos separados por rol/enlace.
La [ayuda multilingüe](../remote-station/docs/help/README.md) está integrada
en el cliente HTTPS y los clientes dedicados.

La URL de conexión no contiene tokens, rutas ni parámetros. Debe apuntar al
host HTTPS que sirve la consola compilada, no al puerto del agente.
Para RadiCodex WebView se exige una cadena de certificados confiable para
Android; nunca se omite un error TLS. El cliente dedicado Capacitor requiere
los orígenes exactos documentados en el host.

## Validación y seguridad RF

CAT, audio, PTT, rotores, potencia y ATU conservan sus interlocks y estados
documentados. PTT requiere opt-in y límites independientes; perder el cliente
activa el watchdog, no garantiza una parada física. Comprueba RX en la radio.
No se declara aceptación USB/RF/móvil ni compatibilidad completa por disponer
de un perfil. CW remoto activo, WSJT-X activo, scope nativo FTX-1 y agente
Android headless OTG siguen pendientes; no se simulan como funciones reales.
## Diagnostico

Todos los componentes disponen de registro tecnico minimizado y opciones de envio
con consentimiento. Consulta [diagnostico y privacidad](DIAGNOSTICS.md) para el
contrato cerrado, receptor HTTPS, roles, retencion y diferencias entre clientes.

### Biblioteca nativa compartida Android

`android/station-core` contiene el registro minimizado y el validador HTTPS antes
acoplados a RadiCodex. Conserva el paquete Kotlin publico para no alterar llamadas
ni pantallas existentes; recibe componente/version explicitamente, valida ambos
contra el contrato y rechaza cambios de identidad durante una misma aplicacion.
Los informes almacenados de otro componente o version no se reenvelopan como propios.
El contrato generado se incorpora como asset de la biblioteca a cada APK consumidor.
El envio sigue desactivado por defecto y las credenciales permanecen solo en memoria.
No es todavia un agente Android OTG ejecutable: USB, servicio y enlace al host
siguen pendientes. El APK RadiCodex conserva su identidad y cliente HTTPS existente.
Las pruebas de biblioteca y de conexion/diagnostico RadiCodex pasan, junto a ambos
lints y build APK. Se verifican los 53 recursos generados, firma debug v2 y contrato
JSON dentro del APK actualizado. La revision de seguridad limitada a esta extraccion
no encuentra vulnerabilidades confirmadas; no certifica el producto completo.

## Fuentes upstream y primera comprobacion USB FTX-1

Se revisaron fuentes publicas GitLab y enlaces a Hamlib mantenido, sin acceder
a Patreon privado/de pago ni ejecutar codigo descargado. Patreon no proporciono
contenido verificable; la busqueda GitLab es acotada, no un inventario completo.
Los [bugs Yaesu](../remote-station/docs/hardware/yaesu-cat.md),
[riesgos Xiegu](../remote-station/docs/hardware/xiegu-candidates.md) y
[restricciones OpenGD77](../remote-station/docs/hardware/opengd77-usb.md)
documentan evidencia, licencias, candidatos y limites sin copiar codigo/tablas.
FTX-1 exige ahora ID0840 antes y despues de ajustes de frecuencia/modo/potencia;
modelo incorrecto o identidad perdida impiden confirmar el ajuste, sin reintento.
Pasan **230 pruebas Python**, Ruff y verificacion de los 53 recursos generados.

La [comprobacion USB real](../remote-station/docs/hardware/ftx1-spa1.md) resolvio
driver ausente con un paquete oficial firmado y verifico 15 consultas por la
interfaz Enhanced a 38400/8N1, sin setters ni TX. IF devuelve P10=3 no documentado
en 2508-C: se rechaza y PTT sigue bloqueado cuando no puede comprobar estado
seguro. No se declara aceptacion RF, audio, reconexion, firmware ni producto completo.
Wheel y ZIPAPP actualizados se verificaron fuera del arbol fuente: rechazan un
ID de otro modelo sin setters y leen ID0840 en la unidad USB real. El bundle
compartido sigue identico en wheel y APK dedicado; los cuatro SHA256 coinciden.
La revision de seguridad acotada a la guarda de identidad FTX-1 no encontro
vulnerabilidades confirmadas; no es una certificacion global.

## Escritorio operativo

El cliente compartido web/Android/iPhone/iPad presenta los controles del agente
antes de catalogos y referencias de protocolos. Los enlaces CAT/PTT/rotor/potencia/
logbook desplazan la pagina; no emiten comandos ni cambian permisos o sesiones.
La tarjeta del coordinador no autoriza TX y la demostracion permanece identificada.
Los componentes conservan sus keys, handlers y mecanismos de cierre.

El [estudio comparativo de UX](RADIO_UX_RESEARCH.md) documenta fuentes publicas,
decisiones originales y limites. No es una copia de productos comerciales,
un ranking de usuarios ni una aceptacion visual/hardware. Los controles principales
tienen un minimo de 44 px; quedan pendientes comprobaciones tactiles y visuales.
Este paso no termina el rediseño de todas las pantallas nativas del Workspace.
El portal organiza radio/agente, host y operacion en tres pasos, sin red ni
almacenamiento de credenciales. En RadiCodex, la configuracion se pliega durante
la conexion sin recrear WebView; desconexion y estado permanecen visibles.
Al desconectar o pasar a segundo plano vuelve la configuracion, sin reconectar.

## Verificacion de esta integracion

- Destino Node: **483 pruebas correctas**, incluidos instaladores, traducciones,
  contratos de diagnostico, origen local y entrega HTTPS real.
- Host/agente Python: **212 pruebas correctas** y Ruff sin errores.
- Cliente compartido: **61 pruebas correctas**, lint y build TypeScript/Vite.
- RadiCodex: seis pruebas enfocadas de conexion/diagnostico, build APK y lint.
- Cliente Android dedicado: APK compilado y lint; proyectos Android/iOS
  sincronizados con el mismo cliente compilado.
- Ambos APK son **debug**, con firma APK v2 verificada: no firma de produccion.
- Wheel instalado fuera del arbol fuente: modulo de diagnostico, CLI y consola
  empaquetada verificados. ZIPAPP headless ejecutado con `--help`.
- Revision de seguridad limitada al diagnostico: sin vulnerabilidades
  confirmadas. No es una certificacion del resto del producto.
- Validacion visual con navegador integrado bloqueada por timeout CDP.
  El comportamiento del panel Workspace se comprueba mediante pruebas DOM,
  sin atribuirles una comprobacion visual.

Incremento CAT posterior: FTX-1 incorpora lecturas KS/KP/KR/BI cotejadas con
el manual primario, sin keying ni escritura de memorias. Pasan 23 pruebas Python
enfocadas y diez de cliente sobre conexion, navegacion y perfiles regenerados;
Ruff, lint/build y verificacion de los 53 recursos generados correctos.
Wheel y ZIPAPP ejecutan los decoders empaquetados; bundle compartido identico
en wheel, APK y assets Android/iOS, comprobado por SHA256.

Los paquetes se encuentran en `remote-station/dist/`: subdirectorios `agent/`
y `host/`, mas los dos APK debug. `SHA256SUMS` permite comprobar integridad.
La aceptacion fisica USB/RF, pruebas en dispositivos moviles, compilacion/firma
iOS y funciones expresamente pendientes no quedan cubiertas por estos resultados.

## Ampliacion Yaesu, OpenGD77 y nuevos candidatos

- Los siete Yaesu del catalogo tienen consultas CW documentadas de solo lectura.
  FT-710, FT-991A, FTDX10, FTDX101D/MP y FTDX3000 incorporan ajustes opt-in de
  frecuencia, modo y consigna de potencia por modelo. ID correcto, RX, acoplador
  no ocupado, limite local, deduplicacion y readback se verifican sin habilitar TX.
  FTDX101MP admite hasta 200 W de consigna; los otros seis no heredan ese limite.
  FT-991A y FTDX3000 no inventan MD1: modo secundario null y control deshabilitado.
  [Manuales, paginas y restricciones](../remote-station/docs/hardware/yaesu-cat.md).
- Se integran 13 perfiles experimentales de
  [identificacion OpenGD77 USB CPS](../remote-station/docs/hardware/opengd77-usb.md)
  en el agente headless y la consola compartida. Solo INFO, sin entrar/salir de
  CPS, escribir memoria, transmitir ni inferir CAT RF. Se rechazan firmware/modelo
  desconocidos; las builds antiguas sin R9 no se presentan como compatibles.
  La programacion/pantalla local original del Workspace se conserva.
- [Xiegu y Lab599 investigados](../remote-station/docs/hardware/xiegu-candidates.md)
  se agregan como candidatos sin transporte: las direcciones, framing y detalles
  de respuesta pendientes no se adivinan desde Icom, Kenwood o Hamlib.
  El catalogo contiene 68 candidatos, no 68 radios certificadas.
- [FlexRadio SmartSDR](../remote-station/docs/FLEX-SMARTSDR-API.md): cliente
  `smartsdr_protocol.py` / `smartsdr-core.cjs` (descubrimiento, sesion TCP 4992,
  medidores VITA-49, TX guardado y desactivado por defecto). Panadapter y
  cascada VITA-49: pendiente de fuente.
- Verificacion final: **223 pruebas Python**, **66 del cliente** y **44 Node
  enfocadas** correctas; Ruff, lint y build correctos. Un aborto transitorio
  WinError 10053 de una prueba rotor se repitio aisladamente y la suite completa
  posterior paso, sin cambiar el controlador ni los limites HTTP.
- ZIPAPP y wheel actualizados se ejecutaron fuera del arbol fuente; los dos APK
  debug verifican firma v2. SHA256SUMS coincide con los cuatro paquetes. El bundle
  actual coincide byte a byte entre wheel, APK dedicado y assets Android/iOS.
  RadiCodex conserva su APK: carga la interfaz actual desde el host HTTPS,
  no incorpora un motor CAT nuevo en la WebView.
- La publicacion sigue bloqueada: HTTPS no dispone de credenciales y SSH rechaza
  autenticacion publickey. Se verifico la clave oficial de github.com en un archivo
  aislado, sin modificar perfiles SSH ni desactivar comprobacion de host.

Estos incrementos no finalizan CW activo, WSJT-X activo/broker CAT, agente Android
USB OTG independiente, firma iOS/produccion ni aceptacion fisica multiplataforma.

## Idiomas de los controles operativos

Frecuencia/modo y potencia/acoplador utilizan el selector ES/EN/FR/PT del cliente
compartido, incluidos errores y avisos de seguridad. Cambiar idioma conserva
lecturas, valores editados, limites y permisos; no remonta controles ni emite
peticiones CAT. Las referencias tecnicas enlazadas mantienen su idioma original.

Verificacion: **72 pruebas del cliente**, lint y TypeScript/Vite correctos;
seis casos nuevos comprueban cambios de idioma con SUB sin modo y el limite
200 W de FTDX101MP, sin alterar restricciones. Wheel reinstalado fuera del arbol
fuente y APK dedicado recompilado con lint y firma debug v2 verificados.
El bundle coincide por SHA256 en wheel, APK y assets Android/iOS; SHA256SUMS
se actualiza para los dos paquetes afectados. ZIPAPP y APK RadiCodex no cambian.
No se atribuye compilacion iOS, aceptacion fisica ni firma de produccion.

## Ordenes WSJT-X limitadas

El agente y el host incorporan POST autenticado para Replay y Halt Tx,
exclusivamente con `--enable-wsjtx-safe-commands` local. La consola compartida
web/Android/iPhone/iPad ofrece ambas acciones en ES/EN/FR/PT. No hay inicio TX,
Reply, Free Text ni Configure; el broker CAT y la operacion digital completa
siguen pendientes. Consulta [activacion y limites UDP](../remote-station/docs/agente-cat-wsjtx.md).

El primer origen loopback Heartbeat/Status queda fijado hasta reiniciar el
agente. Se rechazan origen distinto, instancia caducada/cerrada, campos no
admitidos y IDs repetidos; Replay tiene limite de una solicitud por segundo.
Esto no autentica el proceso WSJT-X. La entrega siempre declara
`sent_unconfirmed` y no confirma parada RF; la UI requiere nueva consulta
tras error, sin reintentos. Mantener protecciones fisicas y comprobar RX.

Verificacion: **228 pruebas Python** y **74 del cliente** correctas,
incluido POST por dos enlaces TLS validados, CORS y rechazo de una respuesta
que pretenda confirmar parada RF. Ruff, lint, TypeScript/Vite y 53 recursos
generados correctos. Un timeout de diagnostico Workspace en la ejecucion
concurrente se repitio aisladamente y despues en la suite completa con dos
workers; ambas pasaron sin cambiar ese test ni sus limites.

Wheel y ZIPAPP ejecutados fuera del arbol fuente; APK dedicado con build,
lint y firma debug v2 correctos. Bundle identico en wheel/APK/assets Android/iOS
y SHA256SUMS actualizado. Revision de seguridad limitada a este incremento
y sus helpers de autenticacion/TLS: sin vulnerabilidades confirmadas.
No certifica todo el producto, WSJT-X en ejecucion real ni hardware.

## Idiomas sin interrumpir controles activos

PTT, rotor, audio RX y el panel CAT/WSJT-X comparten ES/EN/FR/PT, incluidos
avisos de seguridad y errores locales de trama. Los callbacks de parada y
renovacion mantienen su identidad al cambiar idioma; no se reinicia la lease,
se envia START/MOVE/STOP ni se recrea la grafica de audio por ese cambio.
Las respuestas tecnicas del agente y errores externos conservan su formato/idioma.

**89 pruebas del cliente**, lint y TypeScript/Vite correctos. Los nuevos casos
comprueban PTT/rotor activos con renovacion y parada posterior, ausencia de
comandos nuevos al cambiar idioma, conservacion de AudioContext/nodo/peticion,
errores de trama traducibles sin reabrir audio y seleccion CAT conservada.
El microfono TX preparado tambien conserva instancia y sesion al cambiar
idioma; perder foco sigue cerrandolo y solicitando RX.
La comprobacion inicial detecto traduccion visual diferida en el helper; se
separaron traduccion de render y callback estable antes de validar la suite completa.
Wheel reinstalado fuera del arbol fuente y APK dedicado recompilado con lint
y firma debug v2 comprobados. El mismo bundle aparece en wheel/APK/Android/iOS
y SHA256SUMS coincide con los cuatro paquetes. ZIPAPP y APK RadiCodex no cambian.
No se atribuye aceptacion fisica/movil ni compilacion/firma iOS.
