# Hoja de ruta por evidencias

Sin fechas prometidas: las pruebas de software permiten avanzar sin hardware.
Las pruebas físicas determinan la aceptación final, no bloquean el desarrollo.
Completar una fase no declara terminadas las posteriores.

| Fase | Entregable | Condición para avanzar |
|---|---|---|
| 0 — Evidencia | Registro API de 44 modelos de referencia más TRuSDX y QMX+; matriz de fuentes y estado candidato | Completada como inventario de investigación; revisión de manual/protocolo de cada modelo continúa antes de implementar |
| 1 — Base ejecutable | API local, autenticación, simulador, contratos y CI local | Pruebas automáticas verdes; completado localmente |
| 2 — Consola web | Consola responsive React/TypeScript, autenticación bearer en memoria, catálogo/diagnóstico de solo lectura, build estático mismo origen | Pruebas de componentes y API, traversal estático bloqueado, build; completada localmente |
| 3 — Agente de estación | Agente headless ZIPAPP, inventario, CAT opt-in y recepción WSJT-X; host separado con HTTPS validado | Software verificable sin hardware; aceptación por SO/RPi y USB Host pendiente |
| 4 — CAT de solo lectura | 31 perfiles de modelo y 14 de familia; CLI offline, transporte serie opt-in, proxy API y panel web | Software experimental probado sin radio. IC-7100/7200 y Hz/MD0/MD1 FTX-1 cotejados con manuales oficiales; IC-7800 sin evidencia suficiente; Flex/Hermes sin transporte |
| 5 — Espectro/audio RX | Captura RX PCM opt-in, streaming autenticado y AudioWorklet; `SS` FTX-1 solo acredita parámetros, K4 dB/bin sin protocolo detallado público | Audio RX experimental por software, rutas/hardware/móvil sin validar; scope/waterfall nativos `unsupported` |
| 6 — Plataformas y Android | APK Android experimental compilado/lintado, proyectos iPhone/iPad y host HTTPS configurable | Firma debug verificada, no publicación/aceptación nativa; Xcode necesario para iOS. Agente OTG pendiente |
| 7 — Accesorios y operación | Logbook/ADIF, WSJT-X UDP pasivo, rotor rotctld, IC-7300 RF PWR/ATU y FTX-1 PC field/SPA-1 con API/panel común | Software/TLS probados sin radio. Otros acopladores/amplificadores, sintonía RF, TX digital y motor WSJT-X pendientes |
| 8 — TX remoto | PTT FTX-1 opt-in, MAIN VFO simplex SSB, lease CAT y límites locales; micrófono PCM WebSocket autenticado con DAC explícito silenciado hasta PTT, capacidad y watchdog de audio | Fonía experimental por software, sin CW. Interlocks físicos, rutas USB, aceptación RF/regulatoria y clientes nativos pendientes |

Requisitos de operación confirmados para web y todos los clientes móviles:
control remoto de rotores (posición/parada y límites mecánicos), acopladores de
antena (estado/sintonía según protocolo), y potencia del transceptor o amplificador
cuando exista control documentado. La regulación debe distinguir vatios de
escalas CAT normalizadas y respetar los límites del equipo/SPA-1, banda y antena.
La sintonía que genere RF queda sujeta a los mismos interlocks que TX.
El [controlador de rotor](control-rotores.md) ya dispone de backend experimental
y panel compartido. Los [ajustes IC-7300](control-potencia-acoplador.md) permiten
posición RF PWR limitada e insertar/bypass ATU, con RX observado y readback.
FTX-1 añade consigna PC field/SPA-1 con cabezal observado y límites en W, sin
pretender que mida potencia RF. Otros acopladores, sintonía RF, vatios calibrados
y amplificadores independientes siguen pendientes:
no se presentan controles funcionales sin backend.
FTX-1 dispone además de [frecuencia/modo MAIN/SUB](control-frecuencia-modo.md),
con opt-ins locales, RX/AC, barrera TX y readback, sin selección de VFO activo.
También se requieren digitales WSJT-X, SSB/fonía y llave CW virtual comunes.
Las pruebas físicas se reservan para aceptación final y no detienen el desarrollo.

El catálogo público de RemoteMyShack contiene 44 radios; TRuSDX y QMX+ son
objetivos adicionales del propietario. La paridad completa es una meta de largo
plazo, no una promesa ni una compatibilidad implementada.

El endpoint `GET /api/v1/radios` y la sección correspondiente de la consola
exponen estas 46 candidatas por fabricante. El endpoint de capacidades continúa
separado: enumera lo que BricoHams ha implementado o investigado, no convierte la
lista de candidatos en soporte CAT.

## Priorización de una alternativa diferenciada

La prioridad no será copiar funciones o apariencia: será entregar un soporte
auditable por modelo, protocolos públicos, instalaciones reproducibles,
diagnóstico local, fallos seguros y transparencia de capacidades. Las funciones
de logbook, mapas, cluster y modos digitales se consideran independientes del
control CAT y no desbloquean TX.
