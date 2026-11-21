# Análisis de funciones públicas de RemoteMyShack

## Alcance y límites

Revisado el 20 de noviembre de 2026 a partir de las páginas públicas enlazadas
abajo y de las imágenes aportadas en el contexto. Este análisis recoge
afirmaciones comerciales y categorías funcionales; no inspecciona el código del
servicio, no elude controles y no valida de forma independiente su funcionamiento.
No se copiarán código, marcas, textos, recursos gráficos ni protocolos privados.
La interfaz de BricoHams tendrá identidad y diseño propios.

La lista del fabricante no es una especificación de compatibilidad para BricoHams.
La beta de Yaesu indicada en la página del FTX-1 se declara allí como basada en
documentación, sin prueba del fabricante de ese producto.

## Categorías anunciadas públicamente

| Categoría | Descripción anunciada | Estado BricoHams |
|---|---|---|
| Consola web responsive/PWA | Navegación desde teléfono, tablet y ordenador; instalación en pantalla de inicio | No implementada |
| Control CAT | Frecuencia, VFO/split, bandas, modos, filtros, RIT/XIT y DSP/ganancias según radio | No implementado |
| Scope y waterfall | Scope de la radio, ajuste y selección de señal para sintonizar | Sin extracción de muestras verificada |
| Audio | Recepción de baja latencia y audio TX desde micro/headset | No implementado; TX bloqueado |
| Periféricos de sintonía | FlexControl, CTR2-MIDI y teclado/paddle, según la página pública | No implementado |
| Accesorios de estación | Amplificadores, tuner, switches, relés, PDU y rotores | No implementado |
| Multi-radio | Selección de varios equipos por estación | No implementado |
| Roles/visitas | Invitados con permisos por radio, solo escucha o transmisión y límites | Solo autenticación/roles de lectura local; no hay sesiones remotas |
| Registro y operación | Logbook ADIF, mapas, premios, DX cluster, alertas, historial TX | No implementado |
| Modos digitales | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR y RADE, según plan/producto | No implementado |
| Seguridad TX | Liberación al perder enlace, timeout y exclusión de operador | No hay TX; por tanto no se declara un sistema TX seguro |
| Red | Agente con conexión saliente, enlace cifrado directo o relay | Solo servidor de loopback; no hay conexión remota |
| Aplicaciones | Web móvil y aplicación Apple TV de solo escucha | Web/Android no implementados; Apple TV fuera del alcance inicial |

Las capacidades, niveles de plan, precio y compatibilidad descritos pertenecen al
producto analizado. No se replican como especificación ni se presentan como
funciones de BricoHams.

La lista del tercero incluye 44 modelos Icom, FlexRadio, Kenwood, Yaesu, Elecraft
y Hermes Lite. El propietario añadió TRuSDX y QMX+ como candidatos de BricoHams;
no se atribuye soporte de estos dos al tercero. Los 46 candidatos figuran en la
[matriz de conexiones](radio-conexiones-candidatas.md).

## Criterios para una alternativa propia

1. Priorizar observabilidad, control RX y documentación reproducible.
2. Separar control CAT, medios de audio, estación y consola mediante contratos
   versionados.
3. Implementar cada familia/modelo solo con referencias públicas y pruebas.
4. Mantener el PTT/TX inactivo hasta autorización expresa y pruebas de seguridad
   con hardware.
5. Priorizar web responsive/PWA para el operador; alojar en el agente una UI local
   de configuración, sin permitir que el navegador eluda los límites del agente.
6. Usar un cliente Android nativo aparte si USB Host/OTG llega a ser una ruta de
   agente; esa ruta no se presupone para todos los teléfonos.

## Fuentes primarias

- [RemoteMyShack: funciones, seguridad y radios](https://www.remotemyshack.com/#pricing)
- [RemoteMyShack: ficha pública Yaesu FTX-1](https://www.remotemyshack.com/radios/yaesu-ftx-1)
- [Hamlib: backend FTX-1](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1)
- [Hamlib: notas de versión 4.7](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Hamlib: documentación de `rigctld`](https://github.com/Hamlib/Hamlib/blob/master/doc/man1/rigctld.1)
- [DL2MAN: (tr)uSDX, CAT y streaming](https://dl2man.de/5-trusdx-details/)
- [QRP Labs: QMX+ y manual CAT](https://qrp-labs.com/qmxp.html)

La ficha técnica FTX-1/SPA-1 registra qué evidencia procede de Hamlib y qué
comprobación primaria/hardware sigue pendiente.
