# Agente CAT experimental y WSJT-X

Las pruebas físicas se realizarán durante la aceptación del producto; no frenan
el desarrollo del transporte. Las pruebas actuales verifican software, tramas,
errores, sockets UDP/HTTP y UI, no una radio conectada ni RF.

## CAT serie de lectura

Por defecto el agente solo enumera interfaces: no abre puertos. Para preparar
una estación, configura explícitamente modelo, puerto y parámetros del manual:

```powershell
py -3.12 -m bricoham_station_agent --enable-experimental-cat `
  --serial-model K4 --serial-port COM7 --serial-baud 38400 --serial-stopbits 1
```

Es un ejemplo, no una recomendación universal de puerto o velocidad. Los perfiles
serie implementados son los 31 modelos del catálogo offline; no incluye Flex,
Hermes-Lite ni IC-7800, pendiente de evidencia primaria suficiente. CI-V utiliza la dirección predeterminada
del perfil: aún no se puede sustituir por una dirección personalizada.

El puerto se abre únicamente cuando un admin/operador solicita una consulta con
decoder implementado. No se detecta el modelo por sondeo, no se elige el primer
COM y no se envían setters, PTT o comandos arbitrarios.

- Serie 8N1 u 8N2, sin flujo hardware/software; baud explícito.
- RTS y DTR se configuran inactivos antes de abrir. **El driver USB puede
  generar pulsos transitorios pese a ello.** Antes de usar el transporte con
  hardware debe desactivarse cualquier asignación USB SEND/CW/PTT del equipo y
  validarse la apertura/cierre con transmisión inhibida físicamente.
- Una transacción a la vez; puerto persistente, escritura acotada, plazo de
  respuesta, framing por terminador, eco limitado y máximo 256 bytes.
- Se descartan bytes pendientes antes de consultar; desactiva mensajes CAT
  espontáneos/AI en la configuración local de la radio si interfieren. El agente
  no cambia esos ajustes por ti.
- Un fallo cierra la conexión. La siguiente consulta explícita puede reabrirla;
  no se reenvían consultas ni se recorren puertos automáticamente.
- FTX-1 devuelve frecuencia en Hz conforme al manual oficial 2508-C, modos
  MAIN/SUB (`MD0`/`MD1`) y telemetría PC/AC/TX. Los códigos de modo permanecen
  explícitos; esta ruta no envía setters ni descubre el SPA-1 cambiando potencia.

Rutas autenticadas, tanto en el agente como en el proxy del coordinador:

- `GET /api/v1/cat`: configuración de consultas, sin abrir el puerto.
- `GET /api/v1/cat?command=FA`: ejecuta una consulta allowlist. El identificador
  no incluye terminador; para CI-V es `03` o `04`.
- Los siete Yaesu del catálogo permiten consultar `KS` (WPM), `KP` (Hz), `KR` (keyer) y `BI`
  (break-in). Son lecturas, no llave CW ni reproduccion de memorias;
  los comandos de transmision `KY` y escritura `KM` no se admiten.

La respuesta declara `status: experimental`, `data_is_simulated: false` y
`hardware_validation_complete: false`. Una respuesta válida solo demuestra esa
transacción, no todo el modelo ni que la conexión sea segura para transmitir.
Los errores `cat_timeout`, `cat_io_failed`, `cat_invalid_response`, `cat_busy`
y demás se muestran explícitamente, sin sustituirlos por datos de demostración.
Los [ajustes por modelo](control-potencia-acoplador.md) son otro endpoint opt-in:
IC-7300 RF PWR/ATU, FTX-1 PC de potencia limitada según cabezal observado y
FT-710, FT-991A, FTDX10, FTDX101D/MP y FTDX3000 con frecuencia/modo/potencia
según [manual específico](hardware/yaesu-cat.md).
No habilitan PTT, sintonía RF ni CAT arbitrario.

Además hay 13 perfiles `OpenGD77 <modelo>` de
[identificación USB CPS](hardware/opengd77-usb.md), fuera de los 31 perfiles CAT
anteriores: solo `INFO`, no control RF ni programación remota. La misma ruta
autenticada muestra modelo/firmware sin bytes desconocidos ni `reply_hex`.
Las builds antiguas sin R9 devuelven error explícito; no hay fallback simulado.
Los [Xiegu y Lab599 investigados](hardware/xiegu-candidates.md) aparecen como
candidatos sin transporte habilitado, no en el selector de agentes.

## Modos digitales: integración WSJT-X

Se adopta WSJT-X como motor externo de digitales en el equipo de estación.
El agente integra su telemetría por UDP; no incorpora su código ni binarios,
no reimplementa FT8/FT4 y no lo arranca automáticamente.

```powershell
py -3.12 -m bricoham_station_agent --wsjtx-udp-port 2237 --wsjtx-id "WSJT-X"
```

En WSJT-X, configura el servidor UDP como `127.0.0.1`, puerto `2237` y el Id
exacto de la instancia (puede cambiar con sus configuraciones). No hacen falta
comandos UDP entrantes para esta recepción pasiva; mantenlos deshabilitados.
El puerto no debe estar ocupado por otra aplicación. Se puede combinar esta
configuración con las opciones CAT, pero **WSJT-X y BricoHams no deben abrir el
mismo puerto CAT simultáneamente**. Si WSJT-X posee el puerto, deja desactivado
el CAT directo del agente; compartirlo mediante un broker queda pendiente.

`GET /api/v1/digital` muestra:

- Heartbeat, estado y decodificaciones de la instancia seleccionada.
- Esquemas 2 y 3: WSJT-X comienza con el 2 antes de negociar; este receptor no
  envía respuestas ni órdenes de negociación.
- Frecuencia dial, modo, indicativos y estados RX/TX **reportados por WSJT-X**.
  No equivalen a telemetría CAT verificada. Un TX externo no lo habilita BricoHams.
- Últimas 100 decodificaciones, con SNR, tiempo, confianza y marca `off_air`
  (reproducción WAV); si un campo antiguo no existe se muestra desconocido.
- Tras 60 segundos sin actividad, cierre o fallo del receptor, `connected` pasa
  a falso. Los datos retenidos son históricos, no estado actual.
- Contadores de paquetes inválidos o no implementados; datagramas mayores de
  8192 bytes y otros esquemas se rechazan.

No implementa órdenes Reply/FreeText/Configure/HaltTx, audio, lanzamiento de
WSJT-X, decodificación propia, importación automática de QSOs ni WSPR Decode.
Los decodes nunca se insertan como contactos en el logbook. El UDP loopback no
autentica al proceso emisor; el Id filtra instancias, no es una credencial.
La API marca `authenticated: false`, `trust: untrusted_local_udp` y
`suitable_for_control: false`, y la consola advierte del riesgo. Esto evita
presentarlos como datos confiables, pero no impide la suplantación local.
No deben usarse para autorizar control, enclavamientos RF o altas automáticas.

## Consola y evidencia

El panel **CAT experimental y WSJT-X** consulta estas rutas bajo demanda, sin
sondeos automáticos. Admin y operador pueden acceder; oyente e invitado no.
La demostración del panel principal sigue separada y etiquetada.

Referencias públicas consultadas, implementación original:

- [Formatos UDP oficiales WSJT-X](https://github.com/WSJTX/wsjtx/blob/master/Network/NetworkMessage.hpp).
- [Inicio con esquema 2 y heartbeat del cliente oficial](https://github.com/WSJTX/wsjtx/blob/master/Network/MessageClient.cpp).
- [Documentación de usuario WSJT-X](https://wsjt.sourceforge.io/wsjtx.html).

No se declara haber ejecutado WSJT-X ni probado dispositivos físicos aquí:
se han usado datagramas sintéticos en sockets loopback reales y un puerto serie
inyectado por pruebas, junto con agentes/coordinador HTTP reales.
