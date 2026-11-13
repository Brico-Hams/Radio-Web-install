# Chat APRS en las radios que soporta RadiCodex

Estado del chat APRS (pantalla **Chat APRS** del menú principal). El chat solo habla **KISS**: usa `Aprs.kt` (`Kiss`, `KissDecoder`, `Ax25Frame`, `AprsText`, `AprsMessenger`) sobre un `KissLink` (`KissLink.kt`). Una radio sin APRS/KISS alcanzable desde la app **no se simula** y no aparece como origen del chat. La misma tabla se muestra en la app (`AprsChatRadios.kt`).

Enlaces disponibles:

- **RT-950 Pro (KISS por BLE)**: `Rt950BleKissLink`, sobre `BleRt950Transport` (`ffe1`). Comportamiento de las tramas igual que antes de extraer el chat de `Rt950Activity`.
- **KISS TCP (TNC externo)**: `TcpKissLink`, socket TCP sin cifrar a un host y puerto escritos por el usuario (Direwolf, un puente TNC). Es la ruta genérica para radios sin KISS nativo; la radio la gestiona ese TNC, no RadiCodex. Tiempo de conexión 5 s, lectura con tiempo de espera de 500 ms, socket cerrado al salir de la pantalla.

## Estado por radio

| radio | ruta APRS/KISS | estado | fuente |
| --- | --- | --- | --- |
| Radtel RT-950 Pro, recepción | KISS por BLE (`ffe1`), con las opciones «KISS TNC over BLE (RX)/(TX)» activadas en la radio | pendiente de prueba en radio | el texto `strings_rt950.xml:57` la da por verificada, pero no hay prueba registrada de esta versión en una radio; `Rt950Ble.kt:23-27`; `ACKNOWLEDGEMENTS.md:34` |
| Radtel RT-950 Pro, transmisión RF | KISS por BLE | **desactivado por defecto (bloqueo del firmware)**; solo con el interruptor «TX experimental» (Avanzado) | `strings_rt950.xml:57` (TX «INFERENCIA no verificada»); lalmonte/radiochat-aprs@9c7b092; erkanz/radtel-RT950PRO@51c84d4; SP3ARK/Radtel-950-Pro-Bluetooth-Programmator@a8bb41a `README.md:235-238`; incidente 2026-11-12 |
| Cualquier radio + TNC KISS externo | KISS por TCP | pendiente de prueba en radio | `KissLink.kt` (`TcpKissLink`); prueba unitaria con `ServerSocket` en `AprsChatTest.kt` (no es prueba en radio) |
| Quansheng UV-K5 / BricoHams Satellite | ninguna en RadiCodex (clonado/CAT) | no soportado | `Diagnostics.kt:12` |
| Quansheng UV-K10 Pro | ninguna; APRS solo como plan de firmware, sin firmware | no soportado | `docs/UV-K10-PRO-VIABILIDAD.md:7,55` |
| Quansheng TK-11 | ninguna (clonado en la web) | no soportado | `docs/TK11-INGENIERIA.md` (sin APRS/KISS) |
| OpenGD77 (GD-77, GD-77S, DM-1801, RD-5R, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017, DM-32, UV008) | solo baliza APRS FM TX en el firmware; sin recepción AX.25 ni TNC | no soportado | `OpenGd77.kt:25-38`; `docs/AYUDA-OPENGD77.md:384-386` |
| AnyTone D878 | ninguna; solo plantilla de canales | no soportado | `ChannelTemplates.kt:39,265`; `docs/AYUDA-ANYTONE.md` |
| Yaesu FT-817/818/857/897 | solo CAT | no soportado | `RigCat.kt:15-18` |
| Yaesu FTX-1 | solo CAT en RadiCodex | no soportado | `RigCat.kt:21`; `Diagnostics.kt:13` |
| Icom IC-705 (CI-V) | solo CAT en RadiCodex | no soportado | `RigCat.kt:19` |
| (tr)uSDX, QRP Labs QMX/QMX+ y QDX/QDX-M | solo CAT (HF) | no soportado | `RigCat.kt:23-26` |

«No soportado» significa que RadiCodex no tiene hoy una ruta APRS/KISS para esa radio, no que el hardware carezca de APRS. Si el hardware ofrece un TNC KISS propio (por ejemplo por Bluetooth o USB), RadiCodex no lo alcanza: **pendiente de fuente**. Con un TNC externo en red se usa la ruta TCP.

## RT-950 Pro: transmisión

- Que la escritura BLE se confirme **no prueba** que la radio transmita por RF. La transmisión debe confirmarse con un **segundo receptor**.
- Según el README de [lalmonte/radiochat-aprs@9c7b092](https://github.com/lalmonte/radiochat-aprs/tree/9c7b092), algunos firmwares aceptan la escritura KISS sin activar el PTT.
- [erkanz/radtel-RT950PRO@51c84d4](https://github.com/erkanz/radtel-RT950PRO/tree/51c84d4) informa de TX funcionando con un v0.29 parcheado.
- Ambos README se citan tal como los refirió el encargo; RadiCodex no ha comprobado su contenido ni sus licencias (**pendiente de fuente**; no se reutiliza código).
- El chat no escribe en la memoria de la radio. Los canales 961–990 (`0x7800–0x7BFF`) siguen protegidos como indica `docs/RADTEL-RT950-PRO.md`.

## Seguridad de transmisión

- Antes de cada envío la app muestra un aviso de que el mensaje **se transmitirá por RF**, con origen, destinatario, texto y la nota del enlace, y exige confirmar.
- El indicativo propio es obligatorio y se valida con `Ax25Address.isValid` (1–6 caracteres A–Z/0–9, SSID 0–15). La confirmación automática (ack) también se desactiva sin un indicativo válido.
- Sin ack, `AprsMessenger` reenvía hasta 3 veces cada 30 s (`Aprs.kt`).
- Límites ya presentes en el repositorio: texto de 1 a 67 caracteres ASCII sin `{ | ~` (`AprsText`), ruta de hasta 8 repetidores (`Ax25Frame.encode`).
- Límites del enlace RT-950 Pro, según el README de erkanz/radtel-RT950PRO@51c84d4 (no están en el repositorio): máximo 182 bytes AX.25, 6 repetidores y 127 bytes de información. Se aplican en `Rt950BleKissLink` (`Ax25Limits.RT950`). Para un TNC TCP genérico solo rige el límite de 8 repetidores; otros límites: **pendiente de fuente**.
- Transmitir exige licencia de radioaficionado.
- **RT-950 Pro, solo recepción por defecto:** `Rt950BleKissLink.send()` se niega a escribir salvo que esté activo el interruptor «TX experimental (riesgo de bloqueo del firmware)» (Avanzado, desactivado, con aviso). Sin él tampoco hay ack automático ni reenvíos. Los reenvíos se cancelan al instante si el enlace BLE se cierra o falla una escritura. El TNC KISS TCP no se ve afectado.
- Tras cualquier sesión de clonado/copia/escritura (`Rt950Activity`) se pide apagar y encender la radio antes de usar KISS; el aviso también sale en el chat hasta que el usuario confirma «He reiniciado la radio».

## Pendiente de fuente

- Contenido y licencia de los README de lalmonte/radiochat-aprs@9c7b092 y erkanz/radtel-RT950PRO@51c84d4 (citados, no comprobados).
- Transmisión RF del RT-950 Pro con la opción «KISS TNC over BLE (TX)» en cada firmware.
- Ruta KISS/APRS propia de FTX-1, IC-705, UV-K10 Pro, AnyTone D878 y TK-11.
- Límites AX.25 de un TNC externo concreto.

## Pruebas en radio

| Fecha | Radio | Prueba | Resultado |
|---|---|---|---|
| 2026-11-12 07:30 | Radtel RT-950 Pro (firmware sin identificar), S20 FE, enlace KISS por BLE | Mensaje APRS de EA5KAO a EA5KAO, «RadiCodex prueba APRS 1», con 3 intentos a intervalos de 30 s. Segundo receptor: SDR BricoHams, receptor 3, 144,800 MHz, packet. | **No concluyente.** La app escribió la trama por BLE, pero el SDR de control estaba en 436,795 MHz NFM (perfil de satélites de 70 cm) y no en 144,800 MHz packet, así que no podía recibirla. |
| 2026-11-12 07:50 | Radtel RT-950 Pro (firmware sin identificar), con el APRS de la radio en el canal A a 144,800 MHz | El mismo mensaje, «RadiCodex prueba APRS 2», con 3 intentos. | **No concluyente.** La trama se escribió por BLE, pero el SDR de control seguía en 436,795 MHz NFM y no en 144,800 MHz packet; repetir con el receptor en 144,800 packet. |
| 2026-11-12 09:44 | Radtel RT-950 Pro, APRS en el canal A a 144,800 MHz | «RadiCodex prueba APRS 3», 4 intentos entre 09:44:10 y 09:45:40. Segundo receptor: SDR BricoHams, V3, perfil «144,800 MHz · APRS 2 m», NFM con decodificación packet secundaria; panel de paquetes vigilado desde el navegador. | **No recibido.** El panel no mostró ninguna trama en unos 5 minutos, ni de EA5KAO ni de otras estaciones. Así que tampoco está comprobada la cadena de decodificación del SDR (antena del V3 en 2 m y direwolf). Queda pendiente un control independiente: escuchar el audio del SDR durante la transmisión o mirar el LED de TX de la radio. |
| 2026-11-12 10:13 | Radtel RT-950 Pro, nuevo modo KISS (commit 9064001): sin desbloqueo `ff31`, escritura en **FF31** | «RadiCodex prueba APRS 4», 4 intentos. GATT real: MTU 23 (rechaza 247), `ff31` solo escritura con respuesta, `ffe1` lectura, escritura con y sin respuesta, y notificación. | **No recibido** en el SDR (V3, 144,800, packet). |
| 2026-11-12 10:21 | Igual, escritura en **FFE1** | «RadiCodex prueba APRS 5», 4 intentos. | **No recibido.** El SDR no ha decodificado ninguna trama APRS de nadie desde las 09:41: la cadena de recepción del SDR en 2 m sigue sin comprobar. |
| 2026-11-12 10:24 | Radtel RT-950 Pro, sin RadiCodex: baliza lanzada desde el propio menú APRS de la radio, con el canal A a 144,800 MHz | Control de referencia. | **La radio no transmite:** el LED de TX no se enciende y el SDR no recibe nada. Con esta configuración o firmware, la TX APRS de la unidad no funciona ni desde su propio menú. Por eso las pruebas 1–5 no permiten valorar RadiCodex. |
| 2026-11-12 (tarde) | Radtel RT-950 Pro, enviando desde RadiCodex por KISS BLE | Envío de un mensaje APRS desde el chat. | **Incidente: el firmware de la radio se congeló** (informe del usuario). Desde entonces el enlace RT-950 es solo de recepción por defecto. |

**Conclusión (2026-11-12):** la TX APRS del RT-950 Pro de esta unidad queda **no soportada en su estado actual**. El fallo está en la radio (configuración o firmware sin identificar), no en RadiCodex. Antes de volver a probar el chat hay que conseguir que la baliza propia de la radio encienda el LED de TX y aparezca en un segundo receptor, por ejemplo identificando el firmware o probando el parche de erkanz para la v0.29. Desde RadiCodex hay que usar el modo KISS sin desbloqueo (commit 9064001).
