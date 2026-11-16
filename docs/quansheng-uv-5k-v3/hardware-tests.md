# Registro de pruebas funcionales de hardware

## Ejecución inicial 2026-11-02 (antes de confirmar COM19)

**Resultado: bloqueada antes de abrir el puerto.** No se envió ninguna trama a una radio. No hay resultados de identidad, versión, estado, pantalla, memoria, CHIRP ni RF; el inventario PnP del host no cuenta como prueba funcional del equipo.

### Estado inicial e inventario observado

Enumeración de Windows (`Win32_SerialPort` y dispositivos PnP presentes), sin abrir interfaces:

| Puerto | Descriptor observado | Interpretación limitada |
|---|---|---|
| COM18 | USB Serial Device; padre «PUYA CDC DEMO» | Interfaz CDC directa candidata; no identifica modelo de radio ni demuestra que sea la unidad UV-5K/UV-K5 solicitada. |
| COM6 | USB Serial Device; «YAESU HRI USB I/F» | Interfaz de otro equipo; no seleccionada. |
| COM21 | «OpenGD77»; padre «OpenDM1701 Transceiver» | Interfaz de otro equipo; no seleccionada. |
| COM5 y COM7 | Dos interfaces de un CP2105 | Adaptador puente; no se estableció su destino. |
| COM19 | «USB-SERIAL CH340» | Adaptador puente; no se estableció su destino. |
| — | «USB Audio Device» | Dispositivo de audio separado; no se vinculó a ninguna interfaz serie. |

El sistema informó estado PnP `OK` para los puertos enumerados. El nombre PUYA es evidencia del descriptor USB, no prueba de que una radio concreta sea UV-K5 V3, use PY32F071 o ejecute un firmware determinado. Las asignaciones COM y los identificadores PnP completos se conservan solo en el registro privado ignorado `tmp/radio-functional-tests/2026-11-02T1050-CET-a91f/inventory.txt`.

No apareció ningún proceso cuyo nombre correspondiera a CHIRP u otra aplicación de radio consultada. No se pudo atribuir la propiedad de los handles COM a procesos concretos sin inspección adicional; no se cerró ni interrumpió ningún proceso. No se abrió ningún puerto para comprobar si estaba ocupado.

### Revisión del protocolo y de la apertura serie

- **Transporte del proyecto:** `transports.js` abre Web Serial a 38400 baudios, 8N1 y sin control de flujo; si el conector marca el transporte como Quansheng, llama a `setSignals({ dataTerminalReady: true })`. No llama explícitamente a RTS. El comportamiento eléctrico al abrir el puerto y el efecto de DTR en el cable conectado no se verificaron.
- **Comando examinado, no enviado:** el código local y `docs/ATLAS-UV-K5-V3.md` documentan `0x0514` (saludo/identificación, carga `u32 timestamp`) y la respuesta `0x0515`. `uart.c` describe el timestamp como identificador de sesión y `SendVersion` devuelve una versión de 16 bytes, indicadores de estado y un desafío. El comando no está documentado como escritura persistente, pero la respuesta incluye campos de desafío que no se deben guardar/publicar. La trama usa el encuadre, CRC y transformación definidos por el protocolo; no se preparó ni transmitió una trama literal.
- **Allowlist de esta ejecución:** vacía. `0x0514` fue solo una opción revisada en fuentes; no se autorizó el envío por la ambigüedad de objetivo y de líneas de control. No se probó ningún otro opcode.
- **Decisión histórica:** se paró antes de abrir un puerto porque no había correspondencia física confirmada. La activación de DTR del transporte de producción impide usarlo en esta fase, pero no prohíbe un transporte dedicado que configure DTR/RTS inactivos antes de abrir. La continuación siguiente sustituye aquel bloqueo.

### Registro de acciones y resultados

| Estado inicial | Acción | Respuesta/observación real | Resultado |
|---|---|---|---|
| Dispositivos USB/serie enumerados por Windows | Enumerar puertos, padres e identificadores; no abrir puertos | Descriptores y estados PnP descritos arriba | **Completado (solo inventario del host); identidad no confirmada.** |
| Repositorio local disponible | Consultar grafo existente de forma acotada y revisar fuentes del conector, transporte, tabla de protocolo y pruebas | El grafo contiene `QuanshengConnector`; las pruebas del conector usan un transporte simulado (`QuanshengDevice`) | **Completado (revisión estática, no prueba física).** |
| DTR/RTS y cable sin verificar | Inspeccionar apertura del transporte y posible selección del objetivo | El conector activa DTR; la correspondencia modelo/puerto y la ausencia de keying no están probadas | **Bloqueado; no abrir ni transmitir.** |
| Sin identidad de firmware confirmada | Repetir identificación, validar respuesta/CRC o leer estado/pantalla/memoria | No se intentó; no hay respuesta de radio | **No ejecutado.** |
| Sin desconexión/reconexión física autorizada en el banco | Probar extracción o reconexión | No se manipuló físicamente el equipo | **Pendiente; no simulado.** |

No se ejecutaron comandos de escritura, borrado, reinicio, bootloader/DFU, selección de firmware, configuración, canales, calibración, PTT, CAT-TX ni transmisión. Tampoco se leyó una imagen, bloque de memoria, canal, calibración o credencial. No se modificaron líneas DTR/RTS ni se instaló software/controladores.

### Continuación autorizada: COM19 confirmado por el usuario

**Resultado real a las 11:06:41 CET del 2026-11-02: respuesta incompatible; sesión detenida y puerto cerrado.** El usuario confirmó físicamente el cable de la Quansheng en **COM19**. No se consultó COM18 ni ningún otro puerto en esta continuación. El CH340 acredita el adaptador, no la revisión de placa ni el firmware.

Estado inicial observado: `USB-SERIAL CH340 (COM19)`, PnP `OK`, controlador `wch.cn` versión `3.9.2024.9`. El estado físico de la pantalla, alimentación, firmware y modo operativo no se pudo observar desde el host. No se cerraron aplicaciones.

Se usó Python con **pyserial 3.5 ya instalado**, no el transporte de producción. Se inspeccionó su implementación Windows: abre un handle exclusivo y configura `fDtrControl`/`fRtsControl` como desactivados cuando los estados solicitados son falsos y no hay handshake. Se asignaron `dtr=False`, `rts=False`, `rtscts=False`, `dsrdtr=False` y `xonxoff=False` **antes de `open()`**. Ajustes: **38400 baudios, 8N1**, timeout de escritura 1 s y plazo de respuesta 4 s. Esto demuestra la configuración solicitada al controlador, no una medición eléctrica ni una prueba RF de ausencia de transmisión.

Antes de abrir se guardaron objetivo, ajustes y allowlist exacta en el registro privado. La única trama permitida y enviada fue:

```text
ab cd 08 00 02 69 10 e6 60 25 b4 db 40 00 dc ba
```

Decodifica a `0x0514`, longitud de carga 4 y timestamp de sesión; el CRC-16/CCITT inicial 0 se calcula antes del XOR, como en `quansheng-connector.js`. La revisión de `CMD_0514` en la fuente Fusion muestra estado temporal de sesión y cuenta atrás serie, no escritura persistente. Esa fuente no prueba qué firmware está ejecutando esta unidad.

| Prueba | Acción/expectativa | Observación real | Resultado |
|---|---|---|---|
| Apertura exclusiva | Abrir solo COM19 con DTR/RTS falsos | Apertura completada; estados solicitados continuaron falsos | `actualtested`: apertura del host, no prueba eléctrica |
| Identificación inicial | Una escritura de 16 bytes; esperar cabecera `AB CD`, tamaño 40, respuesta `0x0515`, carga 36, versión y CRC válido o marcador `FFFF` | El controlador aceptó 16 bytes; se recibieron 4 bytes que no empezaban por `AB CD` | `actualtested`: rechazo de respuesta inesperada, **no identificación aprobada** |
| Parada y cierre | Sin reintento, resincronización, otro opcode ni cambio de baud; cerrar en `finally` | Una llamada de escritura; sesión detenida por `ValueError`; `closed: true` | `actualtested`: cierre registrado |
| Protocolo sin hardware | Pruebas sintéticas de trama de consulta, CRC, longitudes, opcodes y delimitadores inválidos; transporte falso comprueba líneas inactivas antes de abrir, una escritura y cierre tras rechazo | Cuatro pruebas unitarias correctas | Software solamente; no pase de hardware |
| Identificación repetida/estado/RX/pantalla/memoria/CHIRP | Solo tras respuesta compatible y soporte demostrado del firmware exacto | No ejecutado tras el rechazo inicial | `pending` |

No se validaron longitud completa, CRC, versión ni capacidades de una respuesta del equipo. No se alcanzó el timeout: la condición de rechazo apareció antes. El registro original no midió la latencia hasta ese rechazo; no se inventa una duración. Hash SHA-256 de los **4 bytes recibidos**: `a82979e631b2c59e10d261af8a2b2c2f75d02da1e7b5a28e0a5aa245fc3eb342`. Se descartó la carga RX sin publicarla; no se guardaron desafíos ni credenciales.

**Estado por alcance:** apertura/consulta rechazada/cierre `actualtested`; mecanismo del protocolo y transporte `sourcereviewed`; funciones atribuidas a Karina `communityreported`; identidad de placa/firmware, funciones físicas, RX/RF/TX, escrituras y arranque de imágenes `pending`. No se cambió `hardwareBootTested`.

**Paso concreto necesario:** observar físicamente y comunicar el modelo/revisión y versión que muestra la radio, su pantalla/modo actual y que el conector de programación está correctamente asentado. Mantener el equipo en operación normal, sin entrar en actualización, sin reiniciarlo ni pulsar PTT para este diagnóstico. Después habrá que contrastar el protocolo de esa versión antes de autorizar otro intento; no hacer barridos de baud ni probar comandos alternativos por conjetura. No hay reproducción del problema CHIRP ni guía funcional definitiva.

Reproducción del intento (abre hardware real; no repetir mientras siga sin resolver la respuesta incompatible):

```powershell
python tools\radio-functional-tests\identify_readonly.py --output tmp\radio-functional-tests\<nuevo-run>
```

Verificación sin radio:

```powershell
python -m unittest discover -s tools\radio-functional-tests -p test_identify_readonly.py -v
```

Evidencia de esta continuación: `tmp/radio-functional-tests/2026-11-02T1105-COM19-b73c/result.json`, `observations.txt` y `offline-tests.txt`. Los registros PnP de la ejecución anterior siguen en `tmp/radio-functional-tests/2026-11-02T1050-CET-a91f/inventory.txt`; `tmp/` está ignorado. No hubo escritura EEPROM/flash, cambio de canal/configuración/calibración, DFU, reset, selección de firmware ni comando TX/PTT. No se instalaron dependencias ni se modificaron transportes de producción.

## Continuación con firmware declarado «Bricohams SAT»

**2026-11-02, 11:14:08 CET: una consulta corregida terminó sin respuesta.** El usuario declaró «bricohams sat», sin versión ni modo físico. Solo se abrió **COM19**, confirmado previamente. Su estado PnP seguía `OK`. No se tocaron otros puertos.

### Contrato comprobado antes de consultar

Se consultó primero el grafo existente de forma acotada y después las fuentes locales:

| Evidencia local | Qué establece; estado `sourcereviewed` |
|---|---|
| `Multiboot/Multiboot/Fusion61/App/driver/uart.c`, `UART_Init`; `docs/ATLAS-UV-K5-V3.md` | USART1 PA9/PA10, jack Kenwood de programación, **38400 8N1**. El cable de dos pines sirve esa ruta según la documentación; la conexión física interna de esta unidad no se midió. |
| `scripts/build-bricohams.cjs`; `precompiled/catalog.json` | Bricohams Satellite local deriva de F4HWN v6.1.0; requiere UART y USB. El catálogo registra distribución v0.5.5, preset FieldOps, Beta. El hash del binario local coincide con el catálogo, no con una lectura del equipo. |
| `scripts/bricohams-modules.cjs`; `App/app/uart.c` | El módulo SAT añade handlers al mismo despachador UART/USB; identificación `0x0514`/`0x0515` y formato de respuesta común. |
| `quansheng-connector.js`, `receiveResponse` | Busca la cabecera `AB CD` descartando bytes previos, antes de leer longitud y validar la trama. |
| `firmware/bricohams/cat_rx.c`, `.h` | Consulta SAT/CAT RX `0x7B00`, operación **0**, versión 1, secuencia u16 y frecuencia cero: carga de 8 bytes. Respuesta `0x7B01`, carga de 16 bytes: versión, estado, secuencia, capacidades 7, frecuencia aplicada y flags. La consulta no modifica el estado ni exige activar SAT; operaciones 1/2 sí cambian estado y quedan excluidas. El hash de `cat_rx.c` coincide con los metadatos de compilación local. |
| `firmware/bricohams/passes.c`, `BH_PASS_Request` | La consulta/lectura de pases comparte `0x7B30`/`0x7B31` con escrituras. Un `host_time` no nulo cambia el reloj RAM incluso al consultar: cualquier futura lectura debe dejarlo en cero. **No se envió ninguna petición de pases.** |

El catálogo y las fuentes **no demuestran** que la radio ejecute ese binario exacto. La identidad de protocolo esperada del build local es `F4HWN v6.1.0`, no necesariamente un texto «Bricohams SAT». Ni el nombre declarado ni un futuro saludo bastan para afirmar identidad MCU/revisión o validar el arranque de la imagen publicada.

### Cambio demostrado y resultado real

El primer harness era demasiado estricto: rechazaba la sesión al recibir cuatro bytes iniciales distintos de la cabecera, mientras que el host del proyecto permite sincronizarse más adelante. Se corrigió **solo** el harness dedicado para buscar `AB CD` con límites de **256 bytes / 4 s**, sin aceptar una trama corrupta ni probar opcodes alternativos. No se cambiaron baud, líneas ni ajustes de radio. Esta diferencia de implementación justifica el nuevo intento; **no demuestra** que los cuatro bytes antiguos fueran ruido de arranque. Su contenido fue descartado y no se reconstruyó.

Se guardó el preflight antes de abrir. Allowlist única, con CRC calculado antes del XOR:

```text
0x0514: ab cd 08 00 02 69 10 e6 a7 14 cd db 9d a2 dc ba
```

| Estado/acción | Medición real | Resultado |
|---|---|---|
| Abrir exclusivamente COM19; 38400 8N1, DTR/RTS falsos antes de abrir, sin handshake | Apertura completada; estados solicitados falsos | `actualtested`, sin medida eléctrica/RF |
| Enviar una sola identificación y buscar respuesta completa `0x0515` de 48 bytes, carga 36, CRC válido o marcador `FFFF` | Una escritura de **16 bytes**; **0 bytes RX**; espera registrada **4083,57 ms** | `actualtested`: timeout; versión, CRC y capacidades **no validados** |
| Detener y cerrar tras timeout | `TimeoutError`, `closed: true`; sin reintento | Cierre registrado |
| Identificación repetida, estado SAT/CAT RX, pases, pantalla y memoria | No se enviaron al faltar una respuesta de identidad compatible | `pending` |
| Sin hardware: sincronización con prefijo y cabecera partida, límite de bytes, tamaño/opcode/CRC inválidos, una escritura y cierre en transporte falso | Cinco pruebas correctas | Software solamente; no prueba de radio |

No apareció ningún byte en el que registrar cabecera/control para diagnóstico. No se hizo escucha ni envío adicional tras el timeout, barrido de baud, cambio de modo/tiempo/frecuencia, PTT, reinicio, escritura ni consulta CAT-TX. Se mantuvo intacto `hardwareBootTested`.

**Próximo dato necesario:** lectura/foto saneada de la versión y pantalla/modo actual, y comprobación visual de que el cable de programación está bien asentado en la radio encendida en operación normal. No reiniciar, no entrar en actualización, no cambiar ajustes ni pulsar PTT para este diagnóstico. Después se podrá contrastar el build/estado antes de otro intento; no atribuir el silencio exclusivamente al cable, baud o firmware. La guía sigue sin validar funciones SAT en hardware.

Evidencia ignorada: `tmp/radio-functional-tests/2026-11-02T1112-SAT-COM19-c92d/result.json`, `source-observations.txt` y `offline-tests.txt`. Los resultados anteriores permanecen históricos y no se sobrescribieron.

## Diagnóstico posterior en escucha RX, COM19

**2026-11-02:** el usuario confirmó que la radio permanece encendida, en la pantalla normal Bricohams SAT, con el conector de programación insertado. La versión sigue sin conocerse. Se conservaron los intentos previos; no se repitió `0x0514`.

### Comprobación de fuente/build antes de escuchar

- El catálogo local identifica `bricohams-satellite` como F4HWN v6.1.0, distribución v0.5.5, preset FieldOps, con módulos `satellite`, `ENABLE_UART=true`, `ENABLE_USB=true` y debug UART deshabilitado. El hash del binario local concuerda con su catálogo; ninguno demuestra qué imagen ejecuta el equipo.
- `Multiboot/Multiboot/Fusion61/App/main.c` ejecuta `UART_Init()` al arrancar y emite una línea `UART_Version` en bruto por UART. La ruta USART1 conecta PA9/PA10; el atlas documenta el jack Kenwood a 38400 8N1.
- `Multiboot/Multiboot/Fusion61/App/app/app.c` atiende UART en el bucle de aplicación y `firmware/bricohams/satellite_foxhunt.inc` mantiene servicio de comandos durante la pantalla SAT. La fuente local no muestra que esa pantalla deshabilite UART.
- `UART_LogSend` depende de un flag estático inicialmente falso: la fuente no predice tráfico de depuración periódico durante reposo. El banner de arranque solo se emite al iniciar; no se atribuyen los cuatro bytes históricos a ese banner porque se descartaron.
- El módulo local añade `0x7B00` consulta CAT RX y `0x7B01` respuesta al mismo despachador. Su carga de consulta operación 0 se revisó como no mutante, pero no se envió porque no se validó la identidad/protocolo de la radio.

**Estado de fuente:** `sourcereviewed`; build local compatible con UART. **Estado de hardware:** no confirma versión ni binario activo.

### Escucha real sin transmitir

Se abrió solo COM19 con pyserial 3.5, 38400 8N1, DTR y RTS inactivos antes de abrir, sin handshake ni control de flujo. Límite: 5 s y 128 bytes. En Windows, pyserial limpia los buffers al abrir; por eso la escucha cubre solo bytes posteriores a la apertura, no tráfico de arranque anterior. No se llamó a escritura ni se capturó carga serial.

| Acción | Observación real | Resultado |
|---|---|---|
| Refrescar PnP del objetivo | CH340 COM19, estado OK; controlador `wch.cn` 3.9.2024.9 | Presencia del adaptador, no continuidad de señales |
| Escucha RX única | 0 bytes en 5097,28 ms; ningún prefijo ni cabecera `AB CD`; 0 llamadas TX | `actualtested`: silencio en escucha; no prueba de que RX/TX funcione |
| Cierre | Puerto cerrado | `actualtested` |

El primer intento histórico recibió cuatro bytes malformados y el segundo cero; el contenido del primero no se conserva. La escucha posterior tampoco permite concluir qué contenían aquellos bytes. No hubo otra consulta activa, cambio de baudios, comando CAT, consulta de estado, reinicio ni cambio de configuración.

### Interpretación y siguiente diagnóstico

El build del repositorio no sugiere que UART esté deshabilitado, pero el firmware reportado y la pantalla no verifican la versión que ejecuta la unidad. La sesión serie del host se abrió con líneas de control inactivas; esto no acredita continuidad eléctrica o asignación RX/TX del cable. La combinación de timeout y escucha silenciosa no distingue por sí sola entre imagen/modo distintos y una ruta física serie sin respuesta.

**Siguiente comprobación que se recomendó entonces:** mantener la radio encendida en operación normal y probar físicamente su puerto USB-C de programación con un cable de datos, sin consulta hasta confirmar que correspondía a esa radio. El usuario confirmó después esa correspondencia y la prueba real de COM18 queda registrada en la sección siguiente. No cambiar firmware, reiniciar, entrar en modo actualización ni usar PTT.

Evidencia privada ignorada: `tmp/radio-functional-tests/2026-11-02T1122-COM19-listen-d481/listen.json` y `diagnosis.txt`. El arnés de escucha y pruebas offline están en `tools/radio-functional-tests/`; las pruebas simuladas no cuentan como resultado físico.

## USB-C CDC directo: identidad y estado SAT

**2026-11-02, 11:28-11:30 CET.** El usuario confirmó físicamente que el USB-C está conectado a la misma radio que el cable de COM19; no aportó una lectura del número COM. El inventario PnP vinculó esa confirmación a la interfaz única `USB Serial Device (COM18)`, descriptor «PUYA CDC DEMO», estado `OK`, VID/PID `36B7:FFFF`. Solo se usó COM18 en esta fase; no se reabrió COM19. La interfaz CDC se distingue del UART CH340 del jack.

### Política CDC y transporte

- En `Middlewares/CherryUSB/class/cdc/usbd_cdc.c`, `SET_CONTROL_LINE_STATE` separa los bits virtuales CDC DTR y RTS.
- En `App/usb/usbd_cdc_if.c`, el callback DTR solo cambia `dtr_enable`, un flag volátil usado para permitir envíos CDC síncronos; no lo conecta a PTT, reinicio ni ajustes. No hay callback RTS propio en ese archivo; el débil de CherryUSB no hace nada. Esto es una propiedad del protocolo CDC del firmware revisado, no de las líneas eléctricas del cable CH340.
- El transporte existente de `transports.js` solicita DTR activo para Quansheng USB y no activa RTS. Se usó esa misma política CDC: DTR virtual activo y RTS inactivo, sin handshake. No se conectó ninguna señal a PTT.
- El firmware responde por `SendReply_VCP`/`VCP_SendAsync`; los envíos asíncronos no están condicionados por el flag DTR, aunque el host de producción lo solicita. Para ambas peticiones enviadas la trama tenía 16 o 20 bytes (no múltiplos de 64), por lo que la regla USB de no terminar un paquete exacto de 64 bytes no añade byte; se enviaron **0 bytes de padding**. El código local no prescribe retraso adicional.
- Ajustes: 38400 8N1 y sin control de flujo, derivados del protocolo de la plataforma, aunque CDC no requiere baud físico. Handle exclusivo; cierre en todas las rutas.

### Resultados observados

| Prueba | Tráfico real y validación | Resultado |
|---|---|---|
| Identidad F4HWN | Una consulta `0x0514`, 16 bytes; una respuesta `0x0515`, 48 bytes, carga 36, delimitadores correctos, marcador CRC `FFFF` definido por el protocolo; versión imprimible `F4HWN v6.1.0` | `actualtested`: identidad de protocolo/versión validada en COM18 |
| CAT RX/SAT status | Una consulta `0x7B00`, operación 0, secuencia 1, frecuencia cero; 20 bytes enviados. Respuesta `0x7B01`, 28 bytes, carga 16, marcador CRC `FFFF`, CAT v1, estado 0, secuencia coincidente, capacidades 7 | `actualtested`: handler Bricohams CAT RX v1 presente y consulta aceptada |
| Estado devuelto | `active=false`, `remote=false`, `pending=false`, frecuencia aplicada cero/ausente | Estado CAT RX medido en esa consulta; **no** es medida RSSI, recepción RF ni verificación independiente de la pantalla |
| Apertura/cierre y encuadre | Solo COM18; DTR virtual activo, RTS inactivo; sin padding; ambos puertos cerrados al terminar | `actualtested` |
| Offline | Nueve pruebas unitarias cubren framing/CRC, errores, selección fija COM18, DTR/RTS, padding cero, respuesta CAT y ausencia de sintonía en transporte falso | Software solamente; no es evidencia física |

La trama completa de identidad, incluido el desafío, se recibió en RAM; el desafío no se conservó como contenido, publicó ni utilizó. Solo se conservaron la versión saneada, longitudes, política CRC y hashes de trama. No se envió CAT de sintonía/parada, lectura de pases, hora, configuración, canales, calibración, firmware, TX/PTT ni ningún otro opcode. El usuario reporta imagen/pantalla Bricohams SAT y la respuesta demuestra que el protocolo activo declara `F4HWN v6.1.0` y responde al handler CAT RX v1 de SAT. No demuestra qué archivo exacto del catálogo fue flasheado, revisión de placa, `hardwareBootTested`, comportamiento RF, pantalla/teclas, seguimiento Doppler ni TX.

Evidencia privada ignorada:

- `tmp/radio-functional-tests/2026-11-02T1122-USB-COM18-bc25/result.json`
- `tmp/radio-functional-tests/2026-11-02T1122-SAT-status-COM18-e516/result.json`
- Los registros de COM19 anteriores permanecen sin cambios; no se reescribieron ni reinterpretaron los cuatro bytes del primer intento.

**Alcance de guía tras estas pruebas:** identificación CDC/F4HWN v6.1.0 y respuesta del getter de estado/capacidades SAT/CAT RX v1 `actualtested`; implementación/contrato `sourcereviewed`; afirmaciones comunitarias de Karina `communityreported`; RF, pantalla/teclas, medición Doppler, escritura, TX/PTT, flash, calibración y arranque de artefactos `pending`.

### Nota de verificación histórica y repetición independiente

El registro del coordinador `tmp/radio-functional-tests/2026-11-02-USB-COM18-independent-01/result.json`, fechado a las **11:34:10 CET del 2026-11-02**, se revisó sin abrir puertos: registra una consulta `0x0514` de 16 bytes, respuesta `0x0515` de **48 bytes**, carga 36, marcador CRC `FFFF`, versión **`F4HWN v6.1.0`**, **4,01 ms** de lectura y `closed: true`. Confirma una segunda identificación coincidente, no estabilidad prolongada ni una segunda consulta SAT. Conserva metadatos saneados y hash, no el desafío como contenido.

Las afirmaciones anteriores de versión desconocida, ausencia de identificación aprobada y consultas SAT pendientes describen sus respectivas fases históricas por COM19; los resultados USB-C posteriores las sustituyen solo para identificación y getter de estado. No se alteran aquellos fallos ni los estados pendientes de otras funciones. La atribución física procede de la confirmación del usuario sobre el USB-C de la misma unidad y del mapeo único PnP del inventario, no de que el usuario leyera «COM18».

La [guía práctica de conexión SAT por USB-C](guia-conexion-sat-usb.md) resume exclusivamente este alcance. Su redacción y esta revisión del registro independiente no realizaron nuevas operaciones de E/S física.

## Contrato de consulta CAT RX: rechazos acotados por COM18

**2026-11-02, 12:23:34 CET.** Continuación autorizada únicamente por el USB-C COM18 seleccionado expresamente por el usuario. La identidad previa es `F4HWN v6.1.0`; esta sesión no repitió el saludo ni estableció el binario exacto instalado. Se comprobó primero una línea base CAT inactiva y se realizaron **cuatro peticiones en una única apertura**, sin reintentos ni acceso a COM19.

### Prueba de seguridad del contrato antes de enviar

- `firmware/bricohams/cat_rx.c`, `bh_cat_request`: copia la secuencia antes de comprobar la versión; versión distinta de 1 devuelve estado **3**. Con versión 1 y operación **0**, frecuencia distinta de cero devuelve **2**. La única rama que modifica `state` exige `request[1] != 0`; ninguna de las cuatro peticiones puede entrar en ella. La respuesta mantiene versión 1, capacidades 7 y los campos de estado también en los rechazos.
- `firmware/bricohams/cat_rx.h`: petición de 8 bytes y respuesta de 16 bytes.
- `scripts/bricohams-modules.cjs`, inyección de `case 0x7B00` en `app/uart.c`: pasa la carga y su longitud directamente a `bh_cat_request`; construye `0x7B01`, tamaño `BH_CAT_REPLY_SIZE`, llama a `SendReply` y termina con `break`. No añade sintonía, escritura ni acciones TX. Es evidencia de integración local, no prueba de coincidencia completa con el binario activo.
- `Multiboot/Multiboot/Fusion61/App/app/uart.c`: la ruta VCP valida encuadre y CRC de petición antes del despacho. `SendReply_VCP` usa el marcador de respuesta `FFFF`. No se enviaron tramas externas malformadas, comandos desconocidos ni operaciones CAT 1/2.

El arnés acotado `tools/radio-functional-tests/check_cat_query_contract.py` reutiliza el generador de tramas y la validación estructural existentes. El lector normal `decode_cat_status` sigue rechazando estados distintos de cero; solo el comprobador de contrato acepta **el estado exacto asignado a cada caso**, y no marca los rechazos como aprobados hasta comprobar el estado final. No hay opciones de puerto, opcode, operación o baudios.

### Sesión y resultados reales

Puerto exclusivo COM18; **38400 8N1**, sin control de flujo, DTR virtual activo y RTS inactivo configurados antes de abrir. Por petición: **1,5 s de plazo de respuesta, máximo 128 bytes RX, un intento**. Cada trama enviada midió 20 bytes, sin preámbulo ni padding añadido. Una respuesta inesperada habría detenido las restantes peticiones y cerrado el puerto.

| Estado/acción | Petición `0x7B00`, siempre operación 0 | Respuesta real y aserción | Resultado |
|---|---|---|---|
| Línea base | Versión 1, secuencia 1, frecuencia 0; esperar estado 0 | `0x7B01`, estado 0, CAT v1, capacidades 7, secuencia 1; inactivo, sin control remoto ni pendiente, frecuencia aplicada cero | `actualtested`: consulta canónica |
| Versión de consulta no admitida | Versión 0, secuencia 2, frecuencia 0; esperar estado 3 | Estado **3**, secuencia 2; mismos campos de estado que la línea base | `actualtested`: rechazo documentado, confirmado tras consulta final |
| Parámetro inválido de consulta | Versión 1, secuencia 3, frecuencia **1**; esperar estado 2 | Estado **2**, secuencia 3; mismos campos de estado que la línea base; no es una orden de sintonía | `actualtested`: rechazo documentado, confirmado tras consulta final |
| Consulta final | Versión 1, secuencia 4, frecuencia 0; esperar estado 0 | Estado 0, secuencia 4; capacidades, frecuencia aplicada y flags iguales a la línea base y respuestas intermedias | `actualtested`: estado CAT expuesto sin cambios |
| Cierre | Terminar la única sesión | `closed: true`; cuatro llamadas de envío, **80 bytes enviados / 112 recibidos** | `actualtested` |

Las cuatro respuestas midieron **28 bytes**, con opcode `0x7B01`, carga de 16 bytes, versión CAT 1, secuencia coincidente, capacidades 7, flags 0 y marcador CRC `FFFF` válidos. No se descartaron bytes previos a la cabecera. Los tiempos de cada acción del host —incluyen registro, envío y lectura; no son latencias RF— fueron **4,09 / 3,51 / 8,05 / 3,82 ms**. El resultado conjunto fue `validated_query_contract`.

**Verificación offline previa:** 17 pruebas correctas (8 nuevas y 9 existentes), con transporte falso: allowlist exacta y CRC, estados esperados por caso, rechazo de eco, opcode/longitud/CRC/secuencia/flags/capacidades incorrectos, conservación del rechazo estricto del lector normal, cierre tras timeout/128 bytes/escritura corta/error de apertura, parada ante estado inesperado o alterado y bloqueo sin identidad previa. No son pruebas físicas adicionales.

Evidencia privada ignorada: `tmp/radio-functional-tests/2026-11-02T122333-CAT-contract-COM18-87c04e/hardware/result.json` y `offline-tests.txt` en el directorio padre. El registro contiene allowlist exacta previa, hashes de fuentes, métricas y respuestas CAT saneadas; no se solicitaron desafíos, canales ni calibración.

**Límite:** se verificó el contrato de consulta y sus dos rechazos con CAT inactivo, no controles CAT activos, sintonía/parada, RF, Doppler, teclado/pantalla, tiempo/pases, flash, configuración, reset ni TX/PTT. La igualdad observada solo cubre los campos CAT expuestos, no toda la memoria interna. No cambia `hardwareBootTested` ni valida el arranque de un artefacto.
