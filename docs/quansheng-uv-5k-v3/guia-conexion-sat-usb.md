# Conexión SAT por USB-C: identificación y consulta de estado

Validado el **2026-11-02** en Windows con la unidad que el usuario identifica como Quansheng con Bricohams SAT. La radio respondió **`F4HWN v6.1.0`** y **CAT RX v1**. Esta guía cubre la conexión y las consultas de solo lectura, no la operación de seguimiento por satélite.

## Conexión validada

1. Mantén la radio encendida en su pantalla normal Bricohams SAT, sin entrar en actualización ni reiniciarla.
2. Usa la conexión **USB-C de datos de la propia radio**. El usuario confirmó que ese USB-C pertenece a la misma unidad conectada al cable de programación.
3. En el inventario de puertos de Windows, identifica la interfaz USB Serial Device cuyo descriptor padre es **«PUYA CDC DEMO»**. En este PC se asignó **COM18**, con VID/PID `36B7:FFFF`; el número COM puede ser distinto en otro ordenador y el descriptor no demuestra el modelo de radio. No selecciones por número solamente: corresponde identificar también la conexión física.
   Para esta sesión, el usuario seleccionó explícitamente COM18 como objetivo autorizado; esto no convierte COM18 en número universal ni altera los resultados históricos de COM19.
4. Para esta configuración validada, utiliza esa interfaz CDC, **no el CH340 del jack de programación**, que aquí era COM19. Los ajustes comprobados fueron **38400 baudios, 8 bits, sin paridad, 1 bit de parada (8N1), sin control de flujo, DTR virtual activo y RTS inactivo**.

DTR aquí es una señal virtual de disponibilidad CDC, no PTT. La fuente revisada la usa para habilitar envíos síncronos; las respuestas asíncronas no dependen de ese indicador. Esta política no se debe trasladar a las líneas físicas del cable CH340. Las peticiones comprobadas tenían 16 y 20 bytes, sin preámbulo ni padding añadido.

## Qué respuesta esperar

La comprobación se hizo con un arnés diagnóstico local, **no con una interfaz de usuario de navegador o Android**:

| Consulta de solo lectura | Resultado comprobado | Interpretación |
|---|---|---|
| Identificación `0x0514` → `0x0515` | Respuesta de 48 bytes, versión `F4HWN v6.1.0`; segunda identificación independiente coincidente | Identidad de protocolo/versión; no identifica la placa ni el archivo binario exacto instalado |
| Estado `0x7B00`, operación 0 → `0x7B01` | CAT v1, estado 0, capacidades 7; `active=false`, `remote=false`, `pending=false`, frecuencia aplicada cero | Consulta aceptada; CAT RX estaba inactivo y sin orden pendiente, no es un fallo de conexión |

También se comprobaron dos rechazos del mismo getter, sin sintonizar: versión de consulta 0 → **estado 3** (versión no admitida) y operación 0 con frecuencia 1 → **estado 2** (parámetro inválido de consulta). Una consulta canónica antes y después devolvió estado 0, con capacidades, frecuencia aplicada y flags sin cambios; los rechazos no se trataron como consultas normales satisfactorias.

Las capacidades 7 anuncian sintonía RX, consulta y parada/cesión del control remoto según la fuente. **Solo se ejecutó la consulta**: anunciar esas capacidades no demuestra que funcionen la sintonía, la recepción RF o el Doppler. El estado CAT tampoco verifica por sí solo lo que muestra la pantalla.

Los scripts de [diagnóstico USB](../../tools/radio-functional-tests/identify_usb_cdc.py) y [consulta de estado](../../tools/radio-functional-tests/read_sat_status.py) tienen objetivo fijo COM18 y guardas para **este PC y esta configuración validada**. No son una aplicación general para usuarios ni deben ejecutarse en otro equipo suponiendo que COM18 sea la radio. No se proponen barridos de puertos, baudios ni reintentos sin un cambio demostrado.

## Si no conecta

| Situación | Qué sabemos y cómo interpretarla |
|---|---|
| CH340 COM19: primera consulta con 4 bytes sin cabecera válida; consulta corregida y escucha posterior con 0 bytes | Esa ruta no permitió identificar la radio. La presencia del adaptador y el conector insertado no prueban continuidad TX/RX ni permiten declarar defectuoso el cable. Para esta unidad, la ruta que respondió fue USB-C CDC. |
| USB-C «PUYA CDC DEMO» | La identificación y el estado respondieron con encuadre, opcode, longitud y política CRC válidos. El puerto se cerró al terminar. |
| Otro puerto, descriptor, versión o respuesta incompleta/incompatible | No queda cubierto por esta prueba. Verifica la correspondencia física y contrasta el protocolo antes de otra consulta; no aceptes un eco o una trama parcial como identificación. |
| Error de apertura o puerto ocupado | No fue un resultado observado en estas pruebas. Revisa qué aplicación usa la interfaz; no fuerces su cierre ni pruebes otros puertos por descarte. |
| Respuesta CAT estado 3 o 2 | El enlace puede estar respondiendo correctamente, pero ha rechazado la versión o los parámetros de consulta. Se observaron esos códigos con peticiones diagnósticas controladas; una consulta canónica válida devolvió 0 después. No son instrucciones para cambiar frecuencia ni repetir peticiones inválidas. |

## Evidencia y límites

El [registro técnico](hardware-tests.md#usb-c-cdc-directo-identidad-y-estado-sat) conserva resultados, fallos anteriores y la repetición independiente: **48 bytes, `F4HWN v6.1.0`, lectura de 4,01 ms y cierre confirmado**. La respuesta completa de identidad pasó por RAM; el desafío no se conservó como contenido, publicó ni utilizó.

Fuentes del contrato: [transporte y padding USB](../../transports.js), [encuadre e identificación](../../quansheng-connector.js), [DTR y envío CDC](../../Multiboot/Multiboot/Fusion61/App/usb/usbd_cdc_if.c), [control de líneas CDC](../../Multiboot/Multiboot/Fusion61/Middlewares/CherryUSB/class/cdc/usbd_cdc.c) y [estado CAT RX](../../firmware/bricohams/cat_rx.c).

El [registro del contrato de consulta](hardware-tests.md#contrato-de-consulta-cat-rx-rechazos-acotados-por-com18) detalla las cuatro respuestas reales y sus límites; el [arnés de esos cuatro casos](../../tools/radio-functional-tests/check_cat_query_contract.py) también está restringido a COM18 en este PC y sesión, no es una aplicación general.

**Pendiente:** controles CAT activos, RF, Doppler, pantalla/teclado, transmisión/PTT, escritura y flash. No se establecieron la revisión de placa, el binario exacto en ejecución ni su arranque; tampoco se probaron interfaces de navegador o Android.
