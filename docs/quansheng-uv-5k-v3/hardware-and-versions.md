# Identidad de hardware y límites entre versiones

## Decisión sobre la identidad

El nombre solicitado es **Quansheng UV-5K V3**. Las referencias técnicas, nombres upstream y fuentes V3 del repositorio usan **UV-K5 V3**. La exportación contiene seis menciones literales a `UV-5K`/`UV5K`, incluida una pregunta escrita `UV-5K(8)v3`, pero ninguna aporta número de serie, marca de PCB, foto del MCU, volcado del bootloader ni identificador de modelo verificado (CHAT-UV5K-01..03, CHAT-BRICK-01/02, CHAT-CHIRP-01). Por tanto:

- **Interpretación de trabajo:** probablemente una transposición/alias de UV-K5 V3, pendiente de evidencia del hardware.
- **No establecido:** si «UV-5K V3» es otro modelo comercial, una etiqueta de vendedor, un error del usuario o el nombre de un paquete de firmware.
- **Límite de alcance:** los detalles de firmware V3 que siguen solo aplican después de confirmar un bootloader/placa V3 con PY32F071. El nombre del producto, nombre de archivo, parecido exterior o pegatina V3 no bastan.

El atlas del repositorio advierte que algunas radios etiquetadas V3 pueden tener hardware V2. Hace falta confirmación independiente. No uses este expediente como guía segura para seleccionar una imagen en una radio no identificada.

## Cómo distinguir familias

| Familia según la documentación | Evidencia de MCU/aplicación | Almacenamiento de datos | Consecuencia para firmware |
|---|---|---|---|
| Familia UV-K5 V1, incluidas variantes K5(8), K6 y 5R Plus V1 citadas | Familia DP32G030; mapa de vectores/imagen V1 distinto | EEPROM I2C; algunas modificaciones V1 la amplían | Firmware V1 y mapas de memoria/protocolo no son intercambiables con V3 |
| UV-K5 V2 | Variantes PY32F030/PY32G030 en el atlas del repositorio | EEPROM I2C | Objetivo separado; una etiqueta o apariencia no prueba que sea V3 |
| UV-K5 V3 | PY32F071; las referencias del repositorio indican bootloader V3 `7.00.07` | Flash SPI de clase PY25Q16, 2 MiB | Imagen PY32 V3 y herramientas específicas del bootloader |
| UV-K1 / UV-K1(8) | Relación de placa/firmware de la familia V3 descrita por el atlas, pero identidad y valores de bootloader propios | Mismo esquema de almacenamiento de la familia | Compartir código fuente no hace intercambiables los nombres K1 y K5 |
| UV-K5(8) V3 | Grafía comunitaria en la exportación y referencias del repositorio | Hay que verificar la revisión de hardware | El sufijo `(8)` no demuestra que sea V3 |
| UV-5R Plus | El atlas incluido sitúa el modelo V1 en la familia V1; un usuario informa de un problema al usar firmware de otro modelo | Referencia de familia V1; no se inspeccionó la unidad del informe | Tratar el informe como advertencia contra copiar instrucciones K5, no como evidencia V3 |
| Unidad modificada, reetiquetada o incierta | Desconocida hasta identificarla | Puede diferir de la unidad de fábrica | Detenerse en la identificación; no deducir compatibilidad de la carcasa, nombre o archivo de firmware |

Son correspondencias de referencia, no mediciones realizadas en esta tarea. Consulta el [atlas V3](../ATLAS-UV-K5-V3.md), que documenta placa, bootloader, mapa de almacenamiento y protocolo citados.

## Nombres y evidencia

| Nombre observado | Evidencia | Qué demuestra |
|---|---|---|
| `UV5K` en contexto de CHIRP/frecuencias satelitales | `messages12.html#message12516`, fecha externa 2025-04-21; cabecera reenviada fechada originalmente 2025-04-16 (CHAT-UV5K-01) | Grafía informal; no identifica V3 ni hardware |
| `uv5k` con SI4732 y almacenamiento ampliado de 2 MB | `messages12.html#message12600`, 2025-04-23 (CHAT-UV5K-02) | Pregunta sobre firmware; no demuestra V3 de fábrica, modificación V3 con SI4732 ni una respuesta |
| `UV-5K(8)v3` como pregunta de selección de modelo | `messages25.html#message27098`, 2025-12-12, respuesta a `#message27097` (CHAT-UV5K-03) | La grafía se usó en el grupo; no identifica una placa ni confirma una recomendación |
| `UV-5K V3` con Karina/CHIRP | `messages30.html#message32662`, 2026-03-11 (CHAT-CHIRP-01) | Síntoma de software informado por un usuario para una radio con ese nombre; no acredita MCU ni reparación |
| `UV-K5 V3` en documentación y fuentes del proyecto | [Atlas V3](../ATLAS-UV-K5-V3.md), [árbol fuente de Fusion](../../Multiboot/Multiboot/Fusion61/) | Nomenclatura técnica asentada en este repositorio para la plataforma PY32F071 |

Las menciones UV-5K del chat no se deben usar para renombrar artefactos ni trasladar a V3 una modificación V1. La pregunta sobre SI4732 no demuestra que el hardware V3 integre ese receptor; el atlas califica como no verificada esa modificación para V3.

## Versiones y evidencia de imágenes

Las etiquetas de versión de las referencias inspeccionadas no son equivalentes:

- **Bootloader:** el atlas del repositorio asocia `7.00.07` con UV-K5 V3 y `7.02.02`/`7.03.0x` con UV-K1. También recoge un informe comunitario de `7.0.11` para UV-K5(8) V3; falta confirmar su alcance exacto.
- **Instantánea de fuente F4HWN:** el árbol Fusion inspeccionado describe ediciones UV-K1/UV-K5 V3 y la documentación Bricohams identifica su propia identidad de protocolo derivada como F4HWN v6.1.0. Esta instantánea no garantiza compatibilidad de todos los binarios llamados «F4HWN».
- **Nombre de imagen local:** el adjunto `f4hwn.k5v3.fusion.v4.3.bin` tiene palabras vectoriales compatibles con la ventana de direcciones de aplicación V3. Solo es evidencia estática de nombre/cabecera; no está autenticado, ejecutado ni probado.
- **Paquete Karina V3:** el inventario del repositorio menciona un paquete fechado `21.09.2026`, con imágenes RAW/packed separadas para K1/V3. La fecha es una etiqueta del paquete/compilación, no una versión semántica ni prueba de compatibilidad con slots. No se establecieron fuente Karina V3, licencia, mapa de enlace ni conformidad con Multiboot.
- **Paquete Karina V1:** la investigación V1 separada de 2026 no es evidencia V3. No se deben aplicar silenciosamente a V3 los vectores ni supuestos de almacenamiento de esas imágenes.
- **Corte de la exportación:** los mensajes propios exportados llegan hasta 2026-11-01 21:40 UTC+01:00; las cabeceras internas de reenvíos incluyen fechas originales anteriores, desde 2021. No se investigaron versiones posteriores ni disponibilidad actual.

El candidato de imagen `PY32F071` del conjunto local tiene un vector de reinicio en la ventana de flash interna de aplicación V3. Una cabecera con forma de vector aporta una pista de compatibilidad, pero no autentica la imagen ni demuestra sus opciones de compilación, modelo de radio, compatibilidad con flash externa o funcionamiento seguro. Consulta el [inventario estático](reverse-engineering-notes.md).

## Comprobaciones necesarias para una radio concreta

En esta tarea no había ninguna radio para inspeccionarla. Para resolver el nombre solicitado sin escribir en el equipo:

1. Obtén el modelo/revisión exactos mediante una etiqueta o documentación fiable; trata una pegatina V3 como provisional porque se informan reetiquetados.
2. Confirma por separado MCU y versión de bootloader mediante evidencia fiable y de solo lectura. No deduzcas el MCU solo del nombre de archivo o de un mensaje del chat.
3. Compara las marcas de placa y flash externa con la referencia V3 antes de elegir firmware o controlador CHIRP.
4. Si el hardware observado no corresponde al perfil PY32F071/V3, detente y delimita de nuevo el expediente; no reutilices supuestos de V1, V2, UV-K1, K5(8), K6 o 5R Plus.
