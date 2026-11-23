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
## Accesorios de estación

La capa de [accesorios de estación](../remote-station/docs/accesorios-estacion.md) supervisa
acopladores y amplificadores externos en el taller Node y en el agente Python
(`GET/POST /api/v1/accessories`). El amplificador arranca en STANDBY y vuelve a STANDBY al
desconectar, con ROE alta, fallo, pérdida de lease, cambio de banda o parada de emergencia.
La sintonía solo se inicia por orden explícita, con 10 W o menos y tiempo limitado.
Los dispositivos sin fuente de protocolo (por ejemplo PGXL) figuran como `pendiente de fuente`.

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

Los [dispositivos de estacion](../remote-station/docs/dispositivos-estacion.md)
(relés Digital Loggers y Waveshare Modbus, rotores DCU-1/Rotor-EZ/RT-21) se
manejan con confirmación, sin conmutar radio/PA al transmitir y con parada
siempre permitida. Rutas de señal y equipos sin protocolo público: "pendiente de fuente".

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

## Ajustes remotos de menu

El modelo compartido (`radio-settings.cjs`, `data/radio-settings-catalog.json`) lista por radio
cada ajuste con id, tipo, rango, comando de lectura/escritura y fuente. El agente Node expone
`GET /api/settings`, `GET /api/settings/value?id=` y `POST /api/settings`; solo el FTX-1 tiene
mapa de menu EX con fuente (`ftx1-menu.js`). Cada escritura exige rol operador, lee el valor
actual como copia, valida el rango, escribe, relee y compara, y restaura la copia si no coincide.
Se rechaza durante TX, con una sola escritura a la vez, limite de frecuencia y registro de auditoria.
Nunca se escriben calibracion, reset, region/limites TX, velocidad/parada/timeout CAT ni puertos USB.
Lo que no tiene fuente figura como "pendiente de fuente" y solo lectura; las radios solo con codeplug
remiten al editor de escritorio. No transmitas sin carga o antena adaptada.

En el agente Python (`remote-station/bricoham_station_agent/menu_settings.py`) el FTX-1 expone el mismo
modelo con `POST /api/v1/radio-settings` (`menu_list`, `menu_read`, `menu_write`); la escritura exige
`menu_write_enabled: true` en `--radio-settings-config` (apagado por defecto) y el panel React lo muestra.
Los items "MAX POWER", REGION/LIMITES TX, CALIBRACION, reset, CAT, USB/TUN-LIN, AUTO POWER OFF y
TX timer son solo lectura; una respuesta `?;` significa "no disponible", no un valor. Las respuestas
reales del banco (`EX0104133;`, `EX030503100;`, `EX050109;` -> `?;`) son fixtures de prueba.
IC-705: la app Android (pantalla Radio, CI-V por USB, boton "Ajustes de la radio (CI-V)") lee y edita los ajustes
`1A 05 <sub>` de la guia CI-V de la IC-705 rev. 6 (paginas impresas 2 y 5-8; la guia es local y nunca se versiona)
con la misma escritura segura (`RigSettings.kt`, tabla comprobada contra `data/radio-settings-catalog.json`).
Temporizador de TX, bloqueo de PTT, PTT del acoplador, salidas SEND/manipulador, potencia maxima de TX, pitido de
borde de banda, apagado automatico, elementos del enlace CI-V/USB y REF adjust son solo lectura; los elementos
compuestos 0001 y 0046 son pendiente de fuente. Los agentes Node y Python listan el modelo de la IC-705 solo en
lectura porque alli no hay ruta CI-V cruda con fuente. Las consolas web de Android reutilizan la pestana Ajustes
del agente Node.
## Operación remota ampliada

El agente Node (`remote-agent.cjs` + `remote-ops.cjs`) añade invitados con token propio
y permisos por radio (bandas y potencia máxima aplicadas en el agente), historial TX con
exportación CSV, apagado remoto solo donde hay fuente (FTX-1 `PS0`, con confirmación),
escucha pública opcional (desactivada por defecto), aviso de actualizaciones firmadas
(nunca instala sin consentimiento) y PWA instalable. No transmita sin carga o antena adaptada.

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

<!-- remote-parity:start -->
## Paridad de funciones remotas por radio

La matriz `data/remote-feature-parity.json` lista cada radio del catalogo remoto y cada perfil Android contra las funciones base. Una funcion marcada ✔ o ◐ cita archivos fuente existentes; ✖ es «pendiente de fuente» y las consolas la muestran deshabilitada con su motivo. Nunca se transmite sin accion explicita del operador, con limite de tiempo, parada de emergencia y corte por ROE alta; no transmitas sin carga adaptada o antena.

✔ disponible · ◐ parcial · ✖ pendiente de fuente · – no aplica

| Radio | Enlace | Frec./modo | VFO/split | PTT | S-metro | Medidores TX | Tune | Audio RX | Audio TX | Cascada | Rotor | Sint./amp. | Ajustes |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Icom IC-705 | usb/lan/wifi | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7100 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7200 | usb | ✔ | ◐ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7300 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7300MK2 | usb | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7410 | usb | ✔ | ◐ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7600 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7610 | usb/lan | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7700 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7760 | usb/lan | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Icom IC-7800 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-7850 / IC-7851 | usb/lan | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-905 | usb/lan/wifi | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-9100 | usb | ✔ | ✔ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-9700 | usb/lan | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Icom IC-R8600 | usb/lan | ✔ | ◐ | – | ✔ | – | – | ✔ | – | ✔ | ✔ | – | ✔ |
| FlexRadio FLEX-6400 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6400M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6600 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6600M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-6700 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8400 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8400M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8600 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio FLEX-8600M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-510 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-510M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-520 | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| FlexRadio AURORA-520M | lan/wifi | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-590S | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Kenwood TS-590SG | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Kenwood TS-890S | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Kenwood TS-990S | usb | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Kenwood TH-D75 | usb | ◐ | ✖ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-710 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FT-991A | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FTDX10 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FTDX101D | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FTDX101MP | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FTDX3000 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| Yaesu FTX-1 | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Yaesu FT-817 / FT-817ND | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-818ND | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-857 / FT-857D | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Yaesu FT-897 / FT-897D | usb | ◐ | ◐ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Elecraft K3S | usb | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Elecraft K4 | usb/lan/wifi | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| QRP Labs QMX / QMX+ | usb | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| QRP Labs QCX / QDX | usb | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ | ✔ |
| DL2MAN (tr)uSDX | usb | ✔ | ◐ | ✔ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Hermes Lite 2 Hermes Lite 2 | lan | ◐ | ◐ | ◐ | ✔ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Xiegu G90 / G90S | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu X6100 | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu X6200 | usb | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ |
| Xiegu X5105 | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Xiegu G106 / G106C | usb | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| Quansheng UV-K5 / UV-K1 (BricoHams Satellite, F4HWN) | usb | ◐ | ✖ | ◐ | ✖ | ✖ | ✖ | ✔ | ✖ | ✔ | ✔ | ✖ | ✖ |
| `android-opengd77` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-rt950` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-rts10` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-d878` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| `android-kiss-tnc` | Android | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
<!-- remote-parity:end -->

## Medidores normalizados y comprobacion de sintonia

`remote-meters.cjs` + `data/remote-meter-model.json` son el modelo unico de medidores
(S, PO, ROE, ALC, COMP, ID, VDD) para el shack Node, la consola React (`meterModel.ts`),
Android (`MeterModel.kt`) y Python (`ftx1_cat.py`). Escalas FTX-1 citadas del manual CAT 2508-C
(RM/SM) y bg7nzl-ftx1ctl; son estimaciones sin calibrar. PO solo se escala con cabeza de campo
(`PC1`); con SPA-1 (`PC2`) queda "pendiente de fuente". La temperatura no tiene fuente.

La sintonia (AC interno 20 s, ATAS 45 s) usa una maquina de estados: peticion del operador,
confirmacion por lectura, espera con tope, ROE final y TX0 verificado por lectura. Resultado
(exito/fallo/tiempo) visible en la consola. Se rechaza si la potencia configurada supera 10 W
(`TUNE_POWER_MAX_W`): el operador debe bajarla; nunca se baja automaticamente. El G TUNE de
Hamlib tambien tiene tope. Nunca transmitas sin una carga adaptada o una antena conectada.
No se ejecutaron pruebas de esta ampliacion en este entorno.

## Cascada remota de la senal recibida

`spectrum-core.js` (UI del Node remote shack, y por tanto la WebView Android) y `spectrum.ts` (consola web React, y por tanto el cliente de estacion remota de Android) calculan una FFT del audio RX que ya llega por el canal autenticado `/api/audio` o `/api/v1/audio`; no se abre un segundo oyente de audio ni hay nuevo trafico de red. Se dibujan a 25 filas/s como maximo en un canvas fijo de 640 px, con escala dB, paleta, pausa y rango ajustable. La escala nativa de la radio solo se usa donde hay fuente: `drivers/icom_scope.py` y `SpectrumCore.createScopeAssembler` implementan la trama `27 00` segun `third_party/ftx1/rigplane-rigplane-core/docs/api/scope.md` (MIT, que cita las guias CI-V de IC-705/7300/7610/9700), y `SerialCat.scope_stream` (agente Python) lo lee en vivo solo en IC-705, IC-7300, IC-7300MK2, IC-7610, IC-905 e IC-9700 (los seis con `27 00`/`27 10`/`27 11` en los perfiles rigplane; guía CI-V IC-705 pp. 27-28; solo el receptor principal): activa el scope con `27 10 01` y la salida con `27 11 01`, reensambla `27 00` a 10 tramas/s y 30 s como maximo y siempre la apaga con `27 11 00` (comandos de `commands/scope.py`, `scope_data_output`; solo recepcion, nunca PTT) y la ofrece en `GET /api/v1/cat/scope?seconds=&fps=` (NDJSON, autenticado). El agente Node habla con rigctld, que no entrega tramas no solicitadas: ahi sigue "pendiente de fuente" y se usa la cascada de audio. Pulsar la cascada sintoniza solo en USB/LSB/PKTUSB/PKTLSB mediante el camino existente de frecuencia (RF = dial ± tono); no hay ningun camino TX nuevo. No transmitas sin antena o carga adaptada.

| Radio | Enlace · fuente | Escala nativa por CAT | Cascada de audio | Pulsar para sintonizar |
| --- | --- | --- | --- | --- |
| Icom IC-705 | usb/lan/wifi · catalog + `icom_civ.py` + `Profile.kt` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7100 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7200 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7300 | usb · catalog + `icom_civ.py` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7300MK2 | usb · catalog + `icom_civ.py` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7410 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7600 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7610 | usb/lan · catalog + `icom_civ.py` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7700 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7760 | usb/lan · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7800 | usb · catalog | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7850 | usb/lan · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-7851 | usb/lan · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-905 | usb/lan/wifi · catalog + `icom_civ.py` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-9100 | usb · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| Icom IC-9700 | usb/lan · catalog + `icom_civ.py` | ok (agente Python); Node pendiente de fuente | ok (con audio) | BLU |
| Icom IC-R8600 | usb/lan · catalog + `icom_civ.py` | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-6400 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-6400M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-6600 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-6600M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-6700 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-8400 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-8400M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-8600 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio FLEX-8600M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio AURORA-510 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio AURORA-510M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio AURORA-520 | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| FlexRadio AURORA-520M | lan/wifi · catalog | pendiente de fuente | ok (con audio) | BLU |
| Kenwood TS-590S | usb · catalog + `kenwood_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Kenwood TS-590SG | usb · catalog + `kenwood_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Kenwood TS-890S | usb · catalog + `kenwood_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Kenwood TS-990S | usb · catalog + `kenwood_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FT-710 | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FT-991A | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FTDX10 | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FTDX101D | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FTDX101MP | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FTDX3000 | usb · catalog + `yaesu_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Yaesu FTX-1 | usb · catalog + `ftx1_cat.py` + `Profile.kt` | pendiente de fuente (`SS` son ajustes, no muestras) | ok (con audio) | BLU |
| Elecraft K3 | driver `elecraft_k3s_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Elecraft KX3 | driver `elecraft_k3s_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Elecraft KX2 | driver `elecraft_k3s_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Elecraft K3S | usb · catalog + `elecraft_k3s_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| Elecraft K4 | usb/lan/wifi · catalog + `elecraft_k4_cat.py` | pendiente de fuente (dB/bin por Ethernet sin protocolo publicado) | ok (con audio) | BLU |
| QRP Labs QMX | usb · catalog + `qmx_cat.py` + `Profile.kt` | pendiente de fuente | ok (con audio) | BLU |
| QRP Labs QMX+ | usb · catalog + `qmx_cat.py` | pendiente de fuente | ok (con audio) | BLU |
| QRP Labs QCX | usb · catalog | pendiente de fuente | ok (con audio) | BLU |
| QRP Labs QDX | usb · catalog + `Profile.kt` | pendiente de fuente | ok (con audio) | BLU |
| (tr)uSDX | usb · catalog + `trusdx_cat.py` + `Profile.kt` | pendiente de fuente | ok (con audio) | BLU |
| Hermes Lite 2 | lan · catalog + `hermes_lite_protocol.py` | pendiente de fuente (IQ, no audio) | ok (con audio) | BLU |
| OpenGD77 GD-77 | usb · `opengd77_usb.py` + `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 GD-77S | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 DM-1801 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 RD-5R | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 DM-1801A | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 MD-9600 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 MD-UV380 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 MD-380 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 DM-1701 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 MD-2017 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 DM-32 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| OpenGD77 UV008 | usb · `opengd77_usb.py` | pendiente de fuente | sin ruta de audio | no |
| Yaesu FT-817 | usb · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Yaesu FT-818 | usb · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Yaesu FT-857 | usb · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Yaesu FT-897 | usb · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Kenwood TH-D75 | usb · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Quansheng UV-K5 (BricoHams Satellite) | usb · `Profile.kt` | pendiente de fuente (`firmware/bricohams/spectrum.c` no exporta muestras por UART) | sin ruta de audio | no |
| Radtel RT-950 Pro | ble · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| Radtel RT-S10 | ble · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| AnyTone D878 | sin conexion · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |
| KISS TNC | red · `Profile.kt` | pendiente de fuente | sin ruta de audio | no |