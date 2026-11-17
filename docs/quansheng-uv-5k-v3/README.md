# Expediente técnico del Quansheng UV-5K V3

**La identidad sigue siendo provisional.** La grafía solicitada es **UV-5K V3**. Las referencias técnicas y el código fuente de este repositorio denominan a la plataforma **UV-K5 V3** (también relacionada con UV-K1). En la exportación hay seis mensajes con la grafía UV-5K/UV5K, pero no demuestran que sea otro modelo Quansheng ni acreditan la placa de un equipo concreto. Este expediente considera UV-5K V3 una posible transposición de UV-K5 V3, no una equivalencia verificada. Las conclusiones de hardware solo se aplican si se confirma por separado la plataforma PY32F071/V3.

La grafía de la exportación es una abreviatura comunitaria, no un criterio suficiente para seleccionar firmware. No extrapoles estos resultados a UV-K5 V1, UV-K5 V2, UV-K5(8) sin confirmar la placa V3, UV-K6, UV-K1, UV-5R Plus ni a radios con MCU o flash modificados. Consulta [hardware y versiones](hardware-and-versions.md).

Este es un inventario técnico, no una garantía de compatibilidad. Distingue entre informes de usuarios, documentación del repositorio, comportamiento observado en el código, metadatos estáticos de binarios, inferencias y pruebas no realizadas. El período de mensajes propios de la exportación va del **2024-01-06** al **2026-11-01**; las cabeceras de mensajes reenviados incluyen fechas originales del **2021-04-03** al **2026-11-01 17:01:42 UTC+01:00**. El último mensaje exportado tiene fecha externa **2026-11-01 21:40:00 UTC+01:00**. No es una comprobación de la versión de firmware más reciente.

## Contenido

- [Guía de conexión SAT por USB-C](guia-conexion-sat-usb.md): pasos prácticos y resultados de identificación y estado de solo lectura validados en esta unidad.
- [Hardware y versiones](hardware-and-versions.md): ambigüedad del nombre, identificación y aplicabilidad del firmware.
- [Mecanismos de funciones](feature-mechanisms.md): comportamiento visible, evidencia de implementación, límites y recetas independientes de reimplementación/aceptación.
- [Problemas y soluciones](problems-and-solutions.md): informes fechados, enfoques probados, calidad de evidencia, resultados y casos sin resolver.
- [Notas de ingeniería inversa](reverse-engineering-notes.md): inventario estático acotado; sin ejecución, extracción de archivos, acceso al equipo ni descifrado.
- [Pruebas de hardware](hardware-tests.md): fallos históricos por el jack COM19 y pruebas reales por USB-C COM18; identidad F4HWN v6.1.0 y CAT RX v1 status consultados sin mutaciones.
- [Plan de validación](validation-roadmap.md): criterios pendientes y límites explícitos; el inventario del host no equivale a una prueba de radio.
- [Índice de evidencias](evidence.json): identificadores neutros y localizadores, sin texto del chat ni identificadores personales.
- [Cobertura](coverage.md): páginas HTML revisadas, recuentos con definición, alcance de adjuntos, exclusiones y privacidad.

## Hallazgos principales

1. El expediente técnico del repositorio identifica UV-K5 V3 como una plataforma con PY32F071, 2 MiB de flash SPI y un ecosistema de firmware específico para V3. Esto describe la clase UV-K5 V3; no demuestra que una radio llamada «UV-5K V3» tenga esa placa.
2. Hay seis mensajes con la grafía literal UV-5K/UV5K. Uno plantea una selección de modelo V3; otro informa un síntoma de solo lectura en CHIRP con Karina; los demás son menciones genéricas o de otro modelo. Ninguno documenta una medición verificada de placa o MCU.
3. En el código de referencia Fusion se observan ranuras de firmware en flash externa, bancos de configuración separados, traducción de direcciones EEPROM y muestreo de espectro basado en RSSI. Las funciones atribuidas a Karina por la comunidad se mantienen separadas porque no se encontró su fuente V3 en el material inspeccionado.
4. El bloqueo reportado de una UV-5R Plus tras seguir instrucciones para UV-5K advierte de una posible incompatibilidad entre modelos; no demuestra una reparación de UV-5K V3. Otro comentario dice que Karina ayudó en un caso parecido, pero no prueba que resolviera ese informe.
5. Tras el inventario inicial del 2026-11-02, el usuario confirmó físicamente el cable de la Quansheng en COM19 (CH340), no COM18. Un transporte dedicado con DTR/RTS inactivos envió una única consulta documentada `0x0514` de 16 bytes: recibió 4 bytes sin cabecera válida y cerró el puerto sin reintento. No se identificaron firmware, MCU ni revisión; el descriptor CH340 no los demuestra.
6. El usuario declaró después «Bricohams SAT», sin versión. Las fuentes y metadatos locales indican 38400 8N1 y protocolo F4HWN v6.1.0, pero no identifican el binario de la radio. Tras corregir en el harness la búsqueda acotada de cabecera que ya implementa el host del proyecto, una nueva consulta de 16 bytes recibió **0 bytes** durante **4083,57 ms**; se cerró sin reintento ni consultas SAT adicionales.
7. En el diagnóstico anterior a la confirmación de USB-C, una escucha RX de 5 s en COM19 no recibió bytes. Esto no establece la versión activa ni prueba continuidad de las líneas del cable; las pruebas posteriores por USB-C se registran a continuación.
8. El usuario confirmó que el USB-C pertenece a la misma radio; el inventario PnP lo vinculó a la interfaz única «PUYA CDC DEMO», COM18 en este PC. La consulta real devolvió `F4HWN v6.1.0`; el getter de estado `0x7B00` respondió CAT RX v1, estado correcto, capacidades 7 e inactivo. Solo se validaron identificación y estado/capacidades; no RF, Doppler, pantalla/teclas, escritura, transmisión ni arranque de una imagen concreta. Véase [registro y límites](hardware-tests.md).

La ejecución inicial no abrió puertos; las continuaciones en COM19 fallaron y la posterior conexión USB-C sí validó identidad de protocolo y estado CAT RX, con una segunda identificación independiente coincidente. No hay medidas RF/de transmisión ni validación de placa, y no se escribieron ajustes, canales, calibración ni firmware. Los registros privados están en `tmp/radio-functional-tests/` (ignorado por Git); no contienen datos de canales ni calibración. El contexto local del chat y los metadatos estáticos anteriores permanecen en `tmp/quansheng-uv-5k-v3/`.

## Grafía sustituida

La etiqueta inicial de la tarea «UV-eK V3» quedó sustituida por la corrección del usuario a «UV-5K V3» antes de crear archivos del expediente. No se generó ningún expediente UV-eK.
