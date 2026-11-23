# Compatibilidad y limitaciones

Las filas de codecs describen su evidencia y la falta de validación física.
Existe ahora un [transporte serie experimental opt-in](agente-cat-wsjtx.md)
para los perfiles con decoder; no convierte sus estados en soporte verificado.
Las afirmaciones «sin transporte» de las fichas de codecs se refieren a esas
bibliotecas puras, no a la nueva integración opcional del agente.

| Equipo/función | Estado en esta versión | Evidencia y limitaciones |
|---|---|---|
| Yaesu FTX-1 CAT lectura | `experimental` | Manual oficial 2508-C cotejado: FA/FB Hz, MD0/MD1, ID, PC, AC y TX de lectura. Transporte serie opt-in; no valida hardware. |
| Yaesu FTX-1 CAT escritura | Frecuencia/modo y potencia PC `experimental` | [MAIN/SUB](control-frecuencia-modo.md) y [consigna W limitada](control-potencia-acoplador.md), opt-ins administrativos separados, RX/barrera TX y readback. Sin selección automática de transmisor ni sondeo mutante del SPA-1. |
| FTX-1 audio RX | Captura host `experimental` | [Entrada explícita y streaming autenticado](audio-rx.md); USB Audio/rutas y reproducción móvil sin validar. |
| FTX-1 espectro/waterfall nativos | `unsupported` en BricoHams | Hamlib documenta parámetros CAT `SS` para el scope; no demuestra exportación de muestras ni waterfall. No se simulan ni sustituyen por un SDR. |
| FTX-1 remoto PTT/TX | `experimental`, desactivado por defecto | [PTT exclusivo y watchdog](ptt-ftx1.md), MAIN simplex LSB/USB, límites y RX observado. [Audio TX](audio-tx.md) opcional, DAC explícito, VOX apagado y silencio hasta TX confirmado. Sin aceptación RF/USB; no CW. |
| Yaesu SPA-1 | Lectura/consigna PC `experimental` | Ajuste limitado por CAT del FTX-1 según manual 2508-C; no es potencia RF medida ni enlace independiente. Hardware sin validar. |
| (tr)uSDX CAT | Lectura `experimental` | Consultas FA/MD/IF/ID por transporte serie opt-in; no valida hardware ni activa RTS/DTR. |
| (tr)uSDX audio RX/TX | Captura host RX `experimental`; TX no implementado | RX necesita entrada/ruta externa explícita; streaming serie nativo del firmware no integrado ni validado. |
| (tr)uSDX PTT/TX | `unsupported` | La documentación avisa que RTS puede accionar CW/PTT; no se controla ninguna señal. |
| QMX+ CAT | Lectura `experimental` | Consultas allowlist de frecuencia/modo, transporte serie opt-in; sin validación física. |
| QMX+ audio RX | Captura host `experimental` | USB Audio documentado; entrada explícita, rutas/dispositivos no probados. |
| QMX+ scope/waterfall nativos | `unsupported` en BricoHams | IQ output no demuestra exportación de las muestras del scope/waterfall. |
| Elecraft K4 CAT | Lectura `experimental` | Consultas FA/FB/MD/MD$, transporte serie opt-in; sin prueba física ni Ethernet. |
| Elecraft K3S CAT | Lectura `experimental` | FA/FB, MD/MD$, BW/BW$, DT, ID y OM según G5; transporte serie opt-in, sin prueba física. |
| Elecraft K3, KX3 y KX2 CAT | Lectura `experimental` | FA/FB, MD/MD$ y BW/BW$ cotejados con G5. FM excluido en KX2. En KX dual-watch las respuestas `$` no acreditan receptor/filtro independiente; sin hardware ni setters. |
| Elecraft K4 scope/waterfall | `unsupported` en BricoHams | El fabricante documenta datos dB/bin Ethernet, pero el protocolo detallado no está publicado en la referencia consultada ni implementado aquí. |
| Simulador determinista | Incluido | Solo datos de demostración; no representa telemetría recibida de una radio. |
| Kenwood TS-590S/SG, TS-890S, TS-990S | Lectura `experimental` | Frecuencia y modo por consultas específicas, transporte serie opt-in; evidencia secundaria, sin hardware ni modos normalizados. |
| Icom CI-V: 16 modelos | Perfil de consultas; hardware no validado | Consultas 03/04 según la [ficha CI-V](hardware/icom-civ.md), incluidos IC-7100 e IC-7200 con manuales oficiales. Transporte serie opt-in; IC-7800 sin perfil. IC-7300MK2 no implica transporte de red. |
| Yaesu FT-710, FT-991A, FTDX10, FTDX101D/MP, FTDX3000 | Codec offline, hardware `unsupported` | Frecuencia, modo e identificación con [perfiles propios](hardware/yaesu-cat.md); ancho de frecuencia y consultas secundarias dependen del modelo. |
| SmartSDR y descubrimiento Hermes-Lite | Sintaxis/descubrimiento offline | Primitivas de familia; no prueban la compatibilidad de cada modelo Flex ni identifican inequívocamente HL2. |
| AURORA-510 / 510M / 520 / 520M (4 filas) | TCP 4992 SmartSDR; `partial`, sin hardware | Descubrimiento, sesión, slices, RIT/XIT, medidores FWDPWR/REFPWR/SWR/ALC/PATEMP/LEVEL, tune/ATU guardados (TX desactivado por defecto), amplificador/PGXL en STANDBY y ajustes rfpower/tunepower/miclevel: `ok` con tramas sintéticas. `xmit` (PTT, guardado, apagado por defecto) y FFT del panadapter hacia el scope: fuente POTACAT. Teselas de cascada VITA-49, keepalive/ping, vox_*, filtros RX, CAT Kenwood: pendiente de fuente. Fuente: [FLEX-SMARTSDR-API.md](FLEX-SMARTSDR-API.md). |
| FLEX-6400 / 6400M / 6600 / 6600M / 6700 (5 filas) | TCP 4992 SmartSDR; `partial`, sin hardware | Igual que AURORA; volts/amperios sin escala verificada. Fuente: [FLEX-SMARTSDR-API.md](FLEX-SMARTSDR-API.md). |
| FLEX-8400 / 8400M / 8600 / 8600M (4 filas) | TCP 4992 SmartSDR; `partial`, sin hardware | Igual que AURORA; el catálogo local no acredita el firmware de cada modelo. Fuente: [FLEX-SMARTSDR-API.md](FLEX-SMARTSDR-API.md). |
| Logbook local | Implementado | CLI y consola web SQLite, alta por rol y exportación ADIF; sin importación ni sincronización. |
| WSJT-X en el agente | Integración UDP pasiva | Esquemas 2/3, estado/decodes; programa externo, sin audio ni órdenes de TX. Software probado con datagramas sintéticos, no WSJT-X ejecutado ni RF. |
| 44 modelos de la lista RemoteMyShack | `candidate` | Indexados en el catálogo; codecs y primitivos offline separados del soporte físico y las afirmaciones de terceros. |
| (tr)uSDX y QMX+ | Sin aceptación física | Candidatos añadidos por el propietario con documentación de proyecto; el transporte software no acredita conexión física. |
| Ayuda y configuración | ES/EN/FR/PT | Manuales offline, conexión y asistentes locales de agente/host. No ejecutan comandos; paneles avanzados conservan su idioma original. |

`unsupported` describe la implementación de este software, no una conclusión sobre
lo que el equipo físico puede hacer. Para las funciones CAT, la referencia externa
es [el backend FTX-1 de Hamlib](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1).
El detalle de la evidencia y lo que aún no sabemos está en
[FTX-1 / SPA-1](hardware/ftx1-spa1.md). No se han conectado radios en este entorno.
Las fichas de [(tr)uSDX](hardware/trusdx.md) y [QMX+](hardware/qmx-plus.md)
documentan sus referencias públicas y riesgos, sin afirmar soporte propio.
