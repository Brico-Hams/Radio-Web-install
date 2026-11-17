# Matriz de familias, modelos y versiones

Corte histórico: **2026-11-01**. Las fechas son de publicación exterior, no de creación de un texto reenviado. Las referencias Cxx se resuelven en [evidence.json](evidence.json). Las capacidades citadas son anuncios o informes comunitarios, salvo las referencias locales Rxx. No certifican compatibilidad.

| Familia / rama | Hardware y evolución atribuida | Funciones y límites documentados |
|---|---|---|
| F4HWN | El anuncio v4.3 separa UV-K5 V1/DP32G030 de UV-K1 y UV-K5 V3/PY32F071; describe imágenes distintas por orientación de teclas. Fusion reúne ediciones anteriores y su módulo CHIRP se presenta para pruebas iniciales. C01, C02 | Un avance de hardware enumera BK4829, flash25q16, DAC interno y programación USB; es una previsión comunitaria, no una identificación de todas las placas. C03 |
| F4HWN V1 | v2.8.1 anuncia optimizaciones y 27 bytes disponibles. v4.3 enumera márgenes por edición y prevé terminar el desarrollo V1. C04, C05 | Los márgenes corresponden a compilaciones concretas, no a toda la memoria del equipo. Las ediciones v4.3 citan 223/1251/3799/231/75 bytes disponibles respectivamente para Bandscope/Broadcast/RescueOps/Basic/Game. C05 |
| F4HWN, menciones posteriores | Hay recomendaciones v5.2.0, un informe v5.5.0, un incidente con v5.7/v5.9 y una consulta v5.9.0. C06–C09 | No constituyen una cronología completa de funciones. La guía local v6.1/v6.3 es otra instantánea, no una prueba de evolución obtenida del chat. R02 |
| IJV | v2.7 menciona tonos personalizados, calibración CW/SSB y correcciones FM/selectivas/cambio de banda; v3.12 y v3.32 distinguen memoria original y ampliada. C10–C12 | v3.32 anuncia cambios de AGC AM/DSB, barrido, dual watch, desviación/AFC y tonos. La variante VS contempla EEPROM lenta. Un manual v3.40 distingue N3/200 canales y VX3/999 con modificación física. C12, C13 |
| Fagci / OSFW / Reborn | Una publicación atribuye OSFW a DualTachyon. Hay experimentos Reborn con SI4732 y EEPROM ampliada. C14, C17 | Una calibración de squelch se limita expresamente a Fagci. Otros informes describen bucle de reinicio de EEPROM, soporte experimental y SSB sin funcionar en una combinación concreta. C16, C17 |
| Egzumer / OneOfEleven | El chat describe Egzumer como combinación de OneOfEleven y analizador Fagci; otra publicación atribuye esa base a IJV. C15 | Es atribución de linaje, no equivalencia de formatos, imágenes ni compatibilidad eléctrica. |
| PUNKTRACKER II y cambios relacionados | Una lista describe VFO, barrido, espectro, tonos, listas negras y ahorro de batería. C18 | Anuncia hasta 200 canales/s y ahorro 1:25 con posible pérdida de palabras. No se midieron esas cifras; no queda fijada la compilación exacta. |
| Robby / RO-KO | Descripción de 15 listas, historial, 32 bandas configurables y squelch por picos. RO-KO se presenta para K5 V1 y basado en Robby. C19, C20 | v1.2.8 anuncia corrección de bloqueo con batería baja y ajustes para EEPROM lenta; v1.4.4 modifica SQL de espectro y conserva una limitación de visualización de tonos. C21, C22 |
| Karina | Un manual adjunto describe menús, modulación, memoria y CHIRP. Una petición solicita soporte de EEPROM ampliada. C23, C24 | La petición de 1000 canales no prueba que exista esa función. El manual no fija una matriz de hardware/versiones. No se dispone aquí de una implementación fuente verificada. |
| Multiboot comunitario V1 | Un usuario enlaza un proyecto de bootloader para V1; otros mensajes describen modificaciones de placa y problemas de acceso al menú oculto. C25–C27 | La explicación del bootloader como causa es hipótesis. No trasladar estas afirmaciones al multiboot PY32 del repositorio. |

## Hardware, almacenamiento y RX/TX

- Los informes PY32F030 para UV-K6 y UV-K5 V2 difieren en modelo y versión de bootloader; uno advierte de bloqueo y otro describe restauración de fábrica. No son una regla universal. C28, C29.
- Una EEPROM mayor no añade canales por sí sola: un informe mantiene 200 canales con memoria ampliada y firmware original. Los problemas de tiempos de escritura dependen de chip, sufijo y compilación. C12, C30, C31.
- No confundir tamaños en bits/bytes ni los nombres comerciales “512k”, “1 MB”, 999 y 1000 usados en el chat. No se validaron sus equivalencias. C24, C30–C32.
- IJV v3.32 anuncia TX WFM en 76–108 MHz: se registra como anuncio, no como permiso, calidad RF o recomendación de transmitir. C12. RO-KO anuncia bloqueo TX bajo aproximadamente 6,2 V: no es una protección certificada. C21.
- La presencia de AM/SSB, un rango mostrado o un ajuste de registro no demuestra sensibilidad RX ni capacidad TX. Los cambios de espectro y squelch tampoco son un DSP completo demostrado. C12, C18, C22.

## Familias insuficientemente documentadas aquí

La búsqueda lexical detectó pocas menciones de OpenGD77 y ninguna coincidencia literal ARDF; esto **no demuestra ausencia temática**. No se reconstruyó su catálogo desde el chat. Las guías locales separan ARDF V1/V2/V3 y OpenGD77 por modelos/revisiones y no autorizan imágenes universales. R01, R03.

El nombre solicitado **UV-5K V3** y la grafía **UV-K5 V3** permanecen distintos hasta confirmar la placa; véase el [expediente especializado](../quansheng-uv-5k-v3/README.md).
