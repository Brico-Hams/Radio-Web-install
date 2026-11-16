# Cobertura, exclusiones y trazabilidad

## Revisión del HTML de Telegram

Se revisaron en modo de solo lectura las **36 páginas HTML** de la exportación. Se buscaron en el cuerpo de las páginas la grafía solicitada y alias/versiones relacionadas. Los mensajes coincidentes y las respuestas directas enlazadas se analizaron en `tmp/quansheng-uv-5k-v3/telegram-matched-context.json`, ignorado por Git; los recuentos por página y de consulta están en `tmp/quansheng-uv-5k-v3/coverage-pages.json` y `tmp/quansheng-uv-5k-v3/scan-summary.json`, también ignorados. Este expediente no incluye nombres de remitentes, alias, identificadores personales ni cuerpos de mensajes.

| Páginas de la exportación | Páginas | Registros con id `messageNN` |
|---|---:|---:|
| `messages.html` | 1 | 1.000 |
| `messages2.html` a `messages35.html` | 34 | 34.000 |
| `messages36.html` | 1 | 739 |
| **Total con id** | **36** | **35.739** |

Comprobación independiente de los elementos HTML: hay **36.798** bloques `.message`; **1.059** bloques de servicio no tienen id numérico. Importante: 6.427 de los bloques con id también llevan la clase HTML `service`; por tanto, 35.739 es el recuento de registros indexados por id, no un recuento estricto de mensajes ordinarios. Por clase HTML se contaron 29.312 bloques `message default` y 7.486 `message service`. Los 1.059 bloques sin id explican la diferencia entre ambos totales generales.

### Fechas externas y fechas de reenvío

La fecha del mensaje en la exportación es el atributo `title` de `div.pull_right.date.details`; la fecha dentro de una cabecera de reenvío corresponde al mensaje original reenviado, no a la fecha en que se publicó el reenvío en este chat. La inspección independiente encontró:

- Mensajes con fecha externa: del **2024-01-06 12:18:32** (`messages.html#message33`) al **2026-11-01 21:40:00 UTC+01:00** (`messages36.html#message44155`).
- Fechas originales de reenvíos: del **2021-04-03** al **2026-11-01 17:01:42 UTC+01:00**. El último valor es una fecha interna de reenvío, no el corte temporal de la exportación.
- Ejemplo de discrepancia: `messages12.html#message12516` se publicó el **2025-04-21 11:16:48**, pero su cabecera de reenvío muestra **2025-04-16 02:28:02**. El resumen del parser había usado esta última como fecha del registro.
- La fecha máxima de reenvío aparece en `messages36.html#message44137`: fecha externa **2026-11-01 18:29:05**, fecha original reenviada **17:01:42**. La última publicación externa es otra, `messages36.html#message44155`, a las **21:40:00**; por tanto, el `latest` de `scan-summary.json` no es el último mensaje de la exportación.

Por ello, la ventana temporal del README y las fechas de las referencias citadas se expresan usando la fecha externa. La exportación no acredita que el firmware más reciente estuviera disponible en esa fecha.

### Recuentos de búsqueda

Recuentos de expresiones sin distinguir mayúsculas/minúsculas (las categorías se solapan; no son totales de mensajes únicos):

| Clase de búsqueda | Coincidencias | Interpretación |
|---|---:|---|
| Grafía literal `UV-5K` / `UV5K` | 6 | La grafía solicitada es poco común y no identifica por sí sola el hardware |
| Grafía `UV-K5` | 561 | Menciones generales de la familia; muchas no son V3 |
| Estilos `K5-V3` / `K5V3` | 49 | Candidatos de alias/versión |
| Forma explícita `UV-K5 V3` | 29 | Candidatos con nombre técnico; siguen siendo texto de usuarios, no mediciones de placa |
| `UV-K5(8)` | 108 | Familia sensible a revisión; no equivale automáticamente a V3 |
| `UV-K1` | 52 | Nombre de hardware/proyecto relacionado, tratado aparte |
| `UV-K6` | 56 | Familia distinta/legacy |
| `Karina` | 139 | Coincidencias de varias versiones; no todas son V3 |
| Cadenas de bootloader `7.00.07` / `7.0.11` | 2 | Coincidencias de texto; no son lecturas verificadas de una radio |

### Referencias relevantes para la identidad

Las fechas de la tabla son las fechas externas del mensaje en la exportación. `#messageID` identifica el elemento de mensaje de la página HTML indicada.

| ID de evidencia | Localizador/fecha | Contexto revisado y límite probatorio |
|---|---|---|
| CHAT-UV5K-01 | `messages12.html#message12516` / 2025-04-21 (reenviado; fecha original 2025-04-16) | Grafía `UV5K` en contexto de CHIRP/frecuencias satelitales; enlaza un `.img` genérico de UV-K5; sin V3 ni hardware |
| CHAT-UV5K-02 | `messages12.html#message12600` / 2025-04-23 | Pregunta sobre firmware con SI4732/almacenamiento ampliado; sin identidad V3 ni respuesta verificada |
| CHAT-UV5K-03 | `messages25.html#message27098` / 2025-12-12; responde a CHAT-UV5K-03-P | Grafía `UV-5K(8)v3` en una pregunta de elección de modelo; sin comprobación de hardware |
| CHAT-UV5K-03-P | `messages25.html#message27097` / 2025-12-12 | Pregunta padre directa; se incluye el enlace de respuesta, sin inspección del equipo |
| CHAT-BRICK-01 | `messages30.html#message32551` / 2026-03-07 | Se informa de un fallo de una UV-5R Plus después de seguir instrucciones UV-5K; no es un caso V3 |
| CHAT-CHIRP-01 | `messages30.html#message32662` / 2026-03-11 | Síntoma de solo lectura en CHIRP informado por un usuario para una UV-5K V3/Karina; sin reparación confirmada |
| CHAT-BRICK-02 | `messages30.html#message32736` / 2026-03-12 | Anécdota separada de recuperación con Karina; no se vincula explícitamente con CHAT-BRICK-01 |
| CHAT-ATTACH-01 | `messages25.html#message26571` / 2025-12-06 | Se enlaza un `.bin` Hawk5 alpha; solo metadatos estáticos |
| CHAT-ATTACH-02 | `messages29.html#message31711` / 2026-02-19 | Se enlaza un ZIP Delta K1/K5V3; solo hash/cabecera, no se abrió |

Los 29 candidatos con forma explícita K5 V3 se identificaron y se registraron sus punteros de respuesta explícitos. No se consideran 29 pruebas independientes de producto. Sus localizadores/fechas figuran en `evidence.json` como `CHAT-K5V3-*`. Los candidatos con otras formas K5V3 y las coincidencias generales UV-K5 permanecen en el contexto analizado pero ignorado. Solo se usaron para afirmaciones las referencias citadas; no se resumió semánticamente el resto de la conversación.

## Adjuntos y otros medios

La exportación contiene 9.575 archivos en total, incluidas fotos, video, audio, archivos comprimidos, PDF, instaladores, scripts, imágenes de firmware y datos de calibración. Entre los adjuntos enlazados en mensajes candidatos de alias UV5K/V3 o en conversaciones de código V3 figuran:

- `Quansheng_UV-K5_20241128.img` (mención genérica de UV5K/CHIRP): solo tamaño/hash/cabecera; probablemente una imagen CHIRP/codeplug, no se ha demostrado que sea firmware.
- `Hawk5-alfa-by-fagci-20251206_0905.bin`: solo nombre/tamaño/hash/primeros 32 bytes; arquitectura y aplicabilidad desconocidas.
- `deltafw-k1-k5v3-main.zip`: solo firma/tamaño/hash; no se abrió ni extrajo.
- Tres candidatos `.bin` con nombres V3/K5 guardados en [notas de ingeniería inversa](reverse-engineering-notes.md), con hashes y comprobaciones de vectores iniciales.

En esta revisión no se inspeccionó el contenido de fotos, audio, video, PDF ni otros medios. No se abrió ni descomprimió ningún archivo comprimido, ni se ejecutó instalador, script, EXE, APK o controlador. La inspección estática se limitó a los cuatro `.bin`, un `.img` y la firma/hash del ZIP enumerados. En particular, no se leyeron, calcularon hashes, copiaron ni publicaron los adjuntos `.dat` de calibración por unidad. Los nombres o la mera existencia de otros medios no son evidencia del comportamiento del firmware.

## Cobertura del repositorio y del grafo

Se consultó el grafo existente (35.531 nodos; 45.707.192 bytes) sin volcarlo. El ejecutable/módulo Graphify no estaba disponible, por lo que no se instaló ni reconstruyó. La consulta acotada de nodos y enlaces encontró `QuanshengConnector` (`quansheng-connector.js`, `L139`) y sus enlaces estructurales directos; las referencias de implementación se comprobaron después leyendo solo los archivos de código ya presentes citados en este expediente: el atlas V3, el conector, los componentes de ranuras/almacenamiento/espectro Fusion y los módulos independientes de Bricohams.

No se consultaron enlaces externos. Las notas del repositorio identifican sus referencias upstream y fechas; siguen siendo fuentes fechadas, no una comprobación de disponibilidad actual.

## Privacidad e interpretación

- Los localizadores solo identifican página e id/fecha; no se conservan nombres de usuario, alias de chat, teléfonos, enlaces de perfil ni texto literal del chat.
- El contexto analizado permanece solo en `tmp/quansheng-uv-5k-v3/`, ignorado por Git.
- Las afirmaciones del chat son informes o preguntas, no experimentos verificados. Una respuesta ausente no se convierte en un resultado positivo.
- No se confunden UV-K5 V1/V2/V3, UV-K5(8), UV-K6, UV-K1 y UV-5R Plus.
- Los hashes y palabras vectoriales identifican copias locales. No demuestran autenticidad, seguridad, licencia ni posibilidad de flasheo.

## Revisión editorial y comprobaciones independientes

Se comprobaron los 38 localizadores de mensajes incluidos en el índice (29 candidatos K5 V3 y nueve registros individuales; todos resuelven a un bloque HTML). Las fechas externas de 37 coinciden con `evidence.json`; la restante, CHAT-UV5K-01, se corrigió de 2025-04-16 a 2025-04-21 y se conserva la fecha original del mensaje reenviado como dato aparte. Se cotejaron directamente con las definiciones/usos los símbolos y límites de ranuras, bancos, traducción EEPROM, espectro, overlays, Doppler, ARDF y protocolo del host citados; se mantuvieron separadas las implementaciones del MCU y del conector de PC, y las atribuciones comunitarias de Karina.

El resumen original del parser confundía algunas fechas internas de reenvío con las fechas externas de publicación; se deja constancia arriba y no se modificó ningún parser ajeno. Además, el HTML distingue 35.739 bloques con id numérico de 36.798 bloques `.message` totales, pero 6.427 bloques con id también tienen clase `service`; no es exacto llamar «ordinarios» a todos los registros indexados. Esta revisión confirma trazabilidad documental y estática, no funcionamiento en una radio: no hubo conexión, escritura, medición RF ni transmisión. Siguen sin resolverse la identidad exacta de UV-5K V3, la compatibilidad de Karina con multiboot, la causa/reparación de los informes y la validación de hardware.
