# Plan y criterios de aceptación para la validación

**Estado a 2026-11-02:** tras el inventario inicial, el usuario confirmó físicamente COM19. Se abrió solo ese puerto con un transporte dedicado, DTR/RTS falsos desde antes de abrir, 38400 8N1 y sin handshake. Se envió una consulta `0x0514` (16 bytes), se recibieron 4 bytes sin cabecera válida y se cerró sin reintento. No se validaron identidad, versión ni capacidades. No hay pruebas de identidad/RF aprobadas; una prueba unitaria/estática correcta tampoco es validación de hardware. Véase el [registro de pruebas](hardware-tests.md).

**Actualización 11:14 CET:** el usuario declaró Bricohams SAT, sin versión ni modo. Las fuentes confirman los mismos 38400 8N1 por USART1/jack Kenwood y que el host busca `AB CD` después de bytes previos. Se corrigió esa diferencia del harness y se hizo un único intento nuevo: 16 bytes enviados, 0 recibidos, timeout tras 4083,57 ms y cierre confirmado. No hubo otras consultas. Las capacidades SAT documentadas quedan `sourcereviewed`, no `actualtested`; no se cambió `hardwareBootTested`.

**Actualización 11:22 CET:** el usuario confirmó radio encendida, pantalla SAT normal y conector insertado. Se verificó que el build SAT local tiene UART habilitado y que la ruta de comandos se atiende también desde SAT; esto no acredita la imagen en ejecución. Escucha RX autorizada de 5 s en COM19: 0 bytes, sin TX, puerto cerrado. No se repitió saludo ni se enviaron comandos SAT.

**Actualización 11:30 CET:** el usuario confirmó que USB-C COM18 es la misma radio. Por CDC, DTR virtual activa el flag de envío del firmware y no está cableada por el código revisado a PTT/reset; RTS no tiene efecto. Se activó DTR virtual, RTS quedó inactivo. La identidad respondió `F4HWN v6.1.0`; una sola consulta de estado `0x7B00` devolvió CAT RX v1/capacidades 7/inactivo. Estos getters están `actualtested`; no se midieron RF, pantalla ni Doppler y no se verificó un artefacto exacto o revisión de placa.

## 1. Confirmar primero la identidad del modelo

**Pregunta:** ¿el equipo llamado «UV-5K V3» tiene la placa UV-K5 V3 PY32F071?

- **Resultado de esta sesión:** el puerto físico quedó confirmado por el usuario como COM19/CH340; la identidad de placa y firmware sigue sin resolver. No usar la interfaz «PUYA CDC DEMO» de otro puerto como evidencia de esta radio.
- **Consulta de identidad:** enviada una vez; respuesta incompatible, cierre confirmado. El transporte de producción activa DTR y no se utilizó. La alternativa dedicada solicita ambas líneas inactivas; ello no equivale a una medición eléctrica/RF.
- **Antes de otro intento:** el usuario ya confirmó radio encendida, pantalla SAT normal y conector insertado; falta la versión mostrada y la identidad de la ruta física más allá de COM19/CH340. Contrastar el protocolo de la versión observada sin cambiar baud, firmware ni modo por conjetura.
- **Alcance SAT revisado:** `0x7B00` operación 0 consulta capacidades/estado sin cambiar frecuencia ni modo. No se ejecutó por el timeout de identidad. Las lecturas de pases `0x7B30` requieren además `host_time=0` para no cambiar el reloj RAM; no enviar las operaciones de carga/borrado ni consultar CAT-TX.
- **Alcance aprobado y medido:** identidad `F4HWN v6.1.0` en COM18 y getter CAT RX v1/estado/capacidades; ninguna modificación de modo, VFO o estado CAT. La consulta devuelve CAT inactivo. La ruta COM19 del jack quedó sin respuesta en los ensayos previos; la diferencia no prueba por sí sola defecto de cable o firmware.
- Reunir evidencia verificable e independiente de modelo/revisión e información de solo lectura del bootloader/modelo; una etiqueta V3 no basta.
- Confirmar la familia MCU y el almacenamiento externo con documentación primaria o inspección de placa autorizada por separado.
- Comparar con V1 (DP32G030/EEPROM I2C), V2 (PY32F030/PY32G030/EEPROM I2C), V3 (PY32F071/flash SPI de 2 MiB) y UV-K1.
- **Aceptar:** dos indicadores independientes coinciden con una placa compatible V3 y el firmware previsto declara soporte para esa placa.
- **Rechazar/detener:** solo hay un apodo comercial, carcasa, nombre de archivo, mensaje de chat o pegatina ambigua.

## 2. Compatibilidad y procedencia de la imagen (solo sin conexión)

- Verificar origen y hash publicado frente al autor/versión seleccionados antes de considerar su uso.
- Analizar tabla de vectores y límites de imagen con un validador independiente que no escriba; comprobar que el reset cae dentro de la región de aplicación prevista y que el puntero de pila está alineado/dentro del rango.
- Analizar el formato/contenedor por separado; no eliminar bytes `.packed` por conjetura.
- Validar cabecera del slot, marcador de versión de firmware, CRC, indicadores de ABI/capacidad y restricciones del modelo.
- **Aceptar:** procedencia, formato, vectores, tamaño y protocolo/mapa concuerdan. **Un vector o CRC por sí solos no bastan.**
- Usar datos sintéticos para cabeceras malformadas y casos negativos; no ejecutar ni flashear binarios de la exportación local.

## 3. Protocolo host y copias de seguridad (transporte simulado)

`quansheng-connector.js` tiene pruebas pertinentes en `tests/`. En una prueba de software aislada, verificar:

- tramado de paquetes, longitud, XOR, manejo de CRC, timeouts, secuencia y errores de respuestas malformadas;
- la lista permitida de modelos rechaza modelos desconocidos en vez de asignarles V3 silenciosamente;
- los límites de calibración y configuración siguen separados;
- la lectura completa de flash queda marcada incompleta si no hay capacidad de lectura física/CRC;
- las escrituras en slots exigen una copia de seguridad completa/verificada, conservan Main/calibración protegidos y verifican CRC/lectura posterior de la imagen.

Usar solo transportes sinteticos. En este expediente no se abrieron puertos USB/serie.

## 4. Comportamiento del firmware (a nivel de fuente y RF solo de recepción)

- **Espectro:** pruebas deterministas de orden sintonía/espera/muestreo, varias muestras por paso, promedios, retención/borrado de picos, listas de exclusión y límites de rango. Si después se autoriza trabajo de hardware por separado, usar una fuente apantallada solo de recepción y un generador calibrado para medir sensibilidad, error de frecuencia, permanencia y pulsos cortos no detectados.
- **Multiboot:** inyectar fallos de cabecera/versión/tamaño/CRC, escritura interrumpida de marcadores de estado, slot 0 protegido y selección de estado segura ante pérdida de alimentación. Probar restauración física o corte de alimentación exige autorización explícita separada y una unidad de ensayo recuperable.
- **Compatibilidad EEPROM:** probar límites, huecos, desplazamientos de banco y protección de calibración con mapas sintéticos; no importar calibración de otra radio.
- **Karina:** obtener primero compilación/versión exactas, documentación/fuente del autor y licencia si están disponibles. Reproducir cada función informada con especificacion controlada independiente; sin fuente, no afirmar mecanismo interno ni equivalencia.
- **Funciones de transmisión:** este plan no incluye pruebas de beacon, respuesta automática, transmisor ARDF ni CAT-TX. Mantener las pruebas en recepción o simulación.

## 5. Reproducir el problema de CHIRP

Para el síntoma de solo lectura informado (CHAT-CHIRP-01), registrar compilación exacta, versión de CHIRP, cadena de modelo del controlador, tipo de operación y error saneado. Comparar importación/exportación de archivo con transporte simulado y solo con la zona de canales documentada. Probar por separado escritura/lectura posterior de canal y nombre, sin tocar ajustes globales, calibración, beacon ni mapas de teclas.

**Aceptar una solución solo si:** el par exacto de modelo/versión admitido escribe los campos previstos del canal y una lectura nueva coincide, mientras los bytes de configuración/calibración no relacionados permanecen intactos. La exportación no aporta una reproducción ni solución de ese tipo.

## 6. Disciplina de evidencia y versiones

- Registrar identificadores de dispositivo/compilación, versiones de herramientas, fixture, valores medidos y fallos, sin publicar calibraciones personales ni contenido de chat privado.
- Tratar las notas comunitarias como pistas, no resultados. Vincular cada parche al síntoma, condiciones, prueba de regresión y versión.
- Mantener separada la evidencia de V1, V2, V3, K1, Karina, F4HWN y Bricohams.
- Mantener `hardwareBootTested: false` hasta arrancar y medir la imagen exacta en el objetivo identificado.
