# Evidencia de conexión: Yaesu FTX-1 / SPA-1

## Estado

BricoHams dispone de consultas CAT serie experimentales opt-in: modelo, puerto y
baud se seleccionan explícitamente. Ajustes PC de potencia y frecuencia/modo
MAIN/SUB tienen opt-ins separados.
[PTT experimental](../ptt-ftx1.md) tiene configuración local independiente y
desactivada por defecto. El agente Python también dispone de una ruta separada
de [audio TX experimental](../audio-tx.md), sujeta a opt-ins y guardas PTT;
no hay llave CW activa ni aceptación física de audio o RF.
Se ha cotejado el manual oficial CAT 2508-C y realizado una comprobación USB/CAT
de solo lectura con una unidad Windows. No constituye aceptación completa,
prueba de TX, audio, ajustes, reconexión ni compatibilidad de todos los firmwares.

## Lo que sí se ha encontrado

| Dato | Evidencia | Interpretación para BricoHams |
|---|---|---|
| Manual primario cotejado | Yaesu CAT 2508-C, 29 páginas; SHA256 `fbbd8eb6b12d1fec9474f3771f4b872ba4fd195dbe4b080cc2a1aae2b4ebc56c` | FA/FB son Hz de nueve dígitos; MD requiere MAIN/SUB. No acredita hardware ni firmware instalado. |
| Existe backend Hamlib específico | Hamlib `rigs/yaesu/ftx1`, modelo 1051; la nota de versión 4.7 menciona FTX-1 | No es una inferencia desde soporte Yaesu genérico. Hamlib no está integrado en esta aplicación. |
| Cobertura que declara el backend | README Hamlib: 90/90 comandos CAT; referencia `FTX-1_CAT_OM_ENG_2508-C.pdf`; firmware que declara probado: actualización de noviembre de 2025 | Es una declaración del proyecto Hamlib; no es una prueba de hardware ejecutada por BricoHams. |
| Serie | README Hamlib: 38400 baud, 8N1; documenta soporte de velocidades entre 4800 y 115200 | Una unidad respondió a 38400/8N1 por CP2105 Enhanced; no se extrapola a otros puertos, velocidades, firmware ni sistemas. |
| Identificación CAT | README Hamlib: el comando de ID devuelve `0840` en todas las configuraciones | No usar ese valor por sí solo para distinguir unidad, configuración Field/SPA-1 o firmware. |
| Scope CAT | `ftx1_ext.c` describe `SS` para leer/ajustar parámetros como velocidad, peak hold, marker, color, nivel, span y modo | Control de parámetros no equivale a exportar muestras FFT. No se ha identificado un flujo de amplitudes ni de waterfall en las fuentes inspeccionadas. |
| Perfil en wfview | `rigs/FTX-1.rig` declara `HasSpectrum=false` | Evidencia de configuración en una aplicación de terceros, no especificación del fabricante; refuerza no declarar scope nativo. |
| Driver en fork de flrig | `PhotoNomad0/flrig_newer` contiene `FTX1.cxx`; configura RTS/CTS y CAT PTT en su perfil | No es flrig upstream ni BricoHams. No adoptar sus señales ni su habilitación de PTT. |
| SPA-1 | Manual CAT `PC` identifica field/SPA-1 y su consigna de potencia | Lectura PC comprobada en una unidad; ajustes y potencia RF no validados, sin sondeo mutante ni enlace independiente. |

El endpoint CAT de lectura construye exclusivamente `FA;`, `FB;`, `MD0;`, `MD1;`, `ID;`, `PC;`,
`AC;`, `TX;`, `FT;`, `ST;` e `IF;`. En TX se consulta estado; nunca se añade el parámetro
de transmisión. Todos tienen decoder y se pueden enviar por el transporte opt-in.
La capacidad de lectura es `experimental`, nunca `verified`.

Se añaden `VX;`, `KS;`, `KP;`, `KR;` y `BI;` a la allowlist de lectura.
Las cuatro consultas CW usan el manual 2508-C, paginas PDF 8 y 19:
`KS` devuelve 4..60 WPM, `KP` devuelve 300..1050 Hz en pasos de 10 Hz,
`KR` informa el keyer interno y `BI` informa break-in, ambos booleanos.
No habilitan keyer/break-in, no transmiten y no escriben memorias.

El mismo manual distingue `KM` (contenido de memorias 1..5, hasta 50 caracteres)
y `KY` (reproducir/detener memorias de texto o mensaje). **KY no es una llave
instantanea key-down/key-up ni acepta texto arbitrario como otros modelos.**
La tabla secundaria Hamlib consultada atribuye lectura/respuesta a KY, mientras
el manual primario no las documenta. BricoHams no añade una consulta KY ni
reutiliza un protocolo CW de otra radio. La llave remota activa sigue pendiente
de un backend de keying con cancelacion y enclavamientos verificados.

El manual oficial, páginas PDF 5 y 17, resuelve la escala: `FA014250000;`
corresponde a 14.250000 MHz y documenta 30000..470000000 Hz. La API y CLI
devuelven ahora `frequency_hz`, sustituyendo el anterior campo experimental
`frequency_field_unscaled`. Se conserva `parse_frequency_field` para inspección
cruda. El antiguo ejemplo comunitario `FA000014074;` no corresponde a 14.074 MHz
y se rechaza como frecuencia fuera de rango; no se multiplica silenciosamente.

El manual PDF 20 documenta `MD0` MAIN y `MD1` SUB; el antiguo `MD;` incompleto
se sustituye por esas consultas. Se rechazan códigos reservados.
PDF 22 documenta `PC`: field 5..10 W y SPA-1 5..100 W. El parser se limita a ese
formato/rango: no extrapola niveles fraccionarios de otro firmware ni representa
una medida de potencia RF. PDF 7 documenta los campos AC de controlador/accesorio
y estado; no se envía la orden de sintonía. PDF 26 permite consultar RX/CAT TX/radio TX.
El espectro nativo sigue sin lector: `SS` documenta parámetros, no muestras FFT.
El endpoint separado de [ajustes de potencia](../control-potencia-acoplador.md)
permite PC por intención explícita, con cabezal observado, límites locales,
RX/AC, barrera frente a eco y readback. No convierte estas garantías software
en enclavamientos físicos ni acredita potencia RF.
La misma ruta permite [frecuencia y modo MAIN/SUB](../control-frecuencia-modo.md)
con flags locales independientes, comprobaciones RX/AC y readback. FA/FB
identifican MAIN/SUB (PDF 17), no seleccionan VFO activo ni transmisor.

## Comprobación USB/CAT real, limitada a lectura

Windows enumeró CP2105 `VID_10C4&PID_EA70`: Enhanced `MI_00` y Standard
`MI_01`, ambos inicialmente con error 28 (driver ausente), no un fallo CAT.
Se instaló Silicon Labs 11.5.0.417 desde el
[catálogo oficial de Microsoft](https://www.catalog.update.microsoft.com/Search.aspx?q=CP210x),
con firma de catálogo válida de Microsoft Windows Hardware Compatibility Publisher.
El SHA256 del CAB utilizado es
`7ea8a03769a05c7bb78718c360b5079be354ed6437623408d51b9c1e8f5a122a`.
No se distribuye el driver en el agente.

Se seleccionó exclusivamente Enhanced, no el primer COM. El número COM varía
por instalación; el VID/PID tampoco identifica por sí solo un modelo Yaesu.
`ID;` confirmó `0840`. A 38400/8N1 respondieron y se decodificaron
ID, FA, FB, MD0, MD1, PC, TX, AC, FT, ST, KS, KP, KR, BI y VX.
PC identificó el cabezal SPA-1 asociado, sin cambiar potencia. RTS/DTR y flujo
permanecieron desactivados en software; no se midieron pulsos eléctricos.
No se enviaron setters, PTT, CW, comandos de sintonía ni señales de transmisión.
Las frecuencias, configuración privada y reply completo no se incluyen aquí
ni se envían por diagnóstico remoto.

**IF sigue sin validación para esta unidad:** el payload tiene los 27 bytes
esperados, pero P10 devuelve `3`. El manual primario 2508-C, página PDF 18,
solo documenta 0=símplex, 1=desplazamiento positivo y 2=negativo. No hay evidencia
para interpretar `3` como símplex ni una versión de firmware/errata identificada.
ST0 observado no resuelve esa discrepancia. El parser estricto rechaza IF y
las guardas PTT no se relajan: no se fabrica una confirmación de estado seguro.
La lectura de los otros comandos no acredita TX ni compatibilidad completa.

## Datos aún no verificados

- Aplicabilidad del manual 2508-C al firmware instalado y sus erratas posteriores.
- Reproducibilidad de las interfaces observadas con otras combinaciones
  FTX-1/SPA-1, firmware, drivers y sistemas; no escoger el primer puerto disponible.
- Paridad/control de flujo a nivel del dispositivo, comportamiento RTS/DTR,
  reconexión USB y suspensión/reanudación por sistema operativo.
- Rutas/canales de audio USB RX/TX en cada modo y compatibilidad por host.
- Protocolo de muestras nativas de scope y waterfall.
- Diferencias de firmware, Field/head, fuente de alimentación y amplificador.
- Pruebas independientes con unidades físicas Windows, Linux/Raspberry Pi,
  macOS y FreeBSD.

La documentación pública de Hamlib es útil, pero la referencia a un manual en un
README no reemplaza la lectura y verificación de ese manual. No se inferirá
compatibilidad de un comando por analogía con otro modelo Yaesu.

## Decisiones de seguridad

- PTT solo mediante ruta y configuración separadas, con guardas y watchdog;
  no se habilita desde consultas CAT ni ajustes PC/FA/FB/MD.
- No se activa RTS/DTR ni se sondea el equipo para descubrir potencia/cabezal.
- El README de Hamlib describe un procedimiento de detección Field que intenta
  cambiar temporalmente el ajuste de potencia a 8 W y restaurarlo. BricoHams no
  ejecutará ese sondeo sin análisis, consentimiento y pruebas específicas.
- La presencia del CAT `TX` en un backend de terceros no habilita TX en BricoHams.
- El transporte actual solo acepta consultas del perfil con decoder; nunca
  acepta cadenas CAT arbitrarias. La ruta separada de ajustes admite PC y
  FA/FB/MD0/MD1 con opt-ins, límites y readback; no permite PTT ni sintonía.

## Fuentes técnicas

- [Manual CAT oficial Yaesu FTX-1 2508-C](https://www.yaesu.com/Files/4CB893D7-1018-01AF-FA97E9E9AD48B50C/FTX-1_CAT_OM_ENG_2508-C.pdf) — fuente primaria cotejada; no se redistribuye el documento.
- [Hamlib FTX-1 backend README](https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1_readme.txt)
- [Hamlib FTX-1 CAT command list](https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1-cat-commands.txt)
- [Hamlib FTX-1 frequency backend](https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1_freq.c) — evidencia secundaria; incluye un ejemplo cuyo escalado se debe cotejar con el manual.
- [Perfil FTX-1 de wfview](https://github.com/wf-group/wfview/blob/d6d6829bdfee38431ea11e7a340b0ab80d5a1d39/rigs/FTX-1.rig) — configura `HasSpectrum=false`; no es especificación del fabricante.
- [Driver FTX-1 del fork flrig_newer](https://github.com/PhotoNomad0/flrig_newer/blob/83ff519bc389f017bb616aa705e2b89f08ab967b/src/rigs/yaesu/FTX1.cxx) — evidencia secundaria con RTS/CTS y CAT PTT habilitados; no reutilizar esa configuración.
- [Investigación comparativa CAT en GitHub](../investigacion-cat-github.md).
- [Hamlib FTX-1 scope settings (`ftx1_ext.c`)](https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1_ext.c)
- [Hamlib FTX-1 transmit backend (`ftx1_tx.c`)](https://github.com/Hamlib/Hamlib/blob/master/rigs/yaesu/ftx1/ftx1_tx.c) — referencia para documentar límites; no se adopta su ruta TX.
- [Hamlib Release Notes 4.7](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Ficha pública FTX-1 de RemoteMyShack](https://www.remotemyshack.com/radios/yaesu-ftx-1) — afirmación de tercero, beta y sin prueba de fabricante según esa página.
