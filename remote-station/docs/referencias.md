# Referencias técnicas open source

Consulta documental realizada el 20-11-2026. Estos proyectos sirven como
referencias de arquitectura, interfaces y licencias; **no prueban compatibilidad
de BricoHams**. No se ha copiado código ni se ha enlazado ninguna biblioteca en
este repositorio.

| Proyecto | Licencia consultada | Qué aporta como referencia | Límite |
|---|---|---|---|
| [Elecraft Programmer's References oficiales](https://ftp.elecraft.com/K4/Manuals%20Downloads/K4ProgrammersReferencerev.D12.html) | Documentación del fabricante; condiciones de redistribución no evaluadas | Referencia CAT K4 rev. D12 y referencia conjunta K3S/K3/KX3/KX2 rev. G5 | Consultas implementadas K3S cotejadas en G5; no todas las funciones ni hardware. Los detalles del stream dB/bin K4 se ofrecen bajo solicitud. |
| [Hamlib](https://github.com/Hamlib/Hamlib) | LGPL-2.1-or-later para librerías; algunos programas/ejemplos GPL-2.0-or-later | Backends CAT por modelo, `rigctld`, modelo FTX-1 específico, backend (tr)uSDX y CI-V sobre red Icom | Sus estados varían por backend; no implica que funcione con nuestro hardware. Revisar licencia por componente antes de integrar. |
| [wfview](https://github.com/wf-group/wfview) | GPL-3.0 (README/licencia consultados) | Referencia de control multi-radio y audio/plataformas; perfil FTX-1 declara `HasSpectrum=false` | Proyecto de escritorio; el README declara componentes y procedencias de terceros. No copiar código ni extrapolar perfiles. |
| [flrig](https://github.com/w1hkj/flrig) | GPL-3.0 | Drivers C++ específicos por modelo para Icom, Kenwood, Yaesu y Elecraft | Ficheros de driver no prueban compatibilidad BricoHams; no copiar ni derivar sin revisar obligaciones de licencia. |
| [AetherSDR](https://github.com/aethersdr/AetherSDR) | GPL-3.0 | Cliente SmartSDR para FlexRadio; también documenta Hermes-Lite 2 e Icom en red | Estados y modelos declarados por el proyecto; Flex test target FLEX-8600 4.2.18. Sus puertos CAT sin autenticación no se toman como patrón. |
| [RigPlane](https://github.com/rigplane/rigplane-core) | MIT | Biblioteca/UI web con providers Icom LAN/USB y Yaesu FTX-1 | FT-991A no verificado; IC-905 solo perfil documental; FTX-1 usa panadapter de audio, no scope nativo. |
| [Icom Web Control](https://github.com/mm5agm/Icom_Web_Control) | GPL-3.0 | Control web IC-7300/MkII y lectura de scope CI-V declarada por el proyecto | Su historial de pruebas refiere dos radios; advierte sobre USB SEND/Keying al abrir puerto en builds de prueba. |
| [Yaesu Web Control](https://github.com/mm5agm/Yaesu_Web_Control) | GPL-3.0 | Control web de varios Yaesu; distingue CAT, scope USB experimental FT-710 y accesorios de scope FTDX101 | FTX-1 todavía no tiene perfil propio en la fuente consultada; no reutilizar código. |
| [TeleRig](https://github.com/Dreikor17/TeleRig) | AGPL-3.0-only | Ejemplo de consola web por perfiles, CI-V y scope de modelos Icom | Solo declara cinco perfiles en el README; para Yaesu genera scope AF desde audio. No demuestra scope nativo FTX-1. |
| [qmx-cat](https://github.com/toddfoster/qmx-cat) | MIT | Referencia de uso del CAT y menús QMX | El README advierte de pocas protecciones; permite CAT arbitrario y escrituras. No adoptar como interfaz de seguridad ni inferir QMX+ sin cotejo. |
| [qmx-hl2](https://github.com/rampa069/qmx-hl2) | GPL-2.0-or-later | Bridge comunitario QMX/QMX+ a un endpoint Hermes-Lite 2 mediante openHPSDR Protocol 1 | No es un scope nativo QMX+, incluye transmisión opcional y no está integrado ni validado por BricoHams. |
| [libhl2sdrk](https://github.com/nrolabs/libhl2sdrk) | GPL-2.0-or-later | Codec Kotlin/JVM y cliente Android para Hermes-Lite 2 sobre openHPSDR Protocol 1/UDP | Controla PTT/TX; no es CAT y no está integrado. |
| [(tr)uSDX Linux Driver](https://github.com/miltonics/truSDX-Linux) | MIT, según el repositorio | Emulación de TS-480, streaming CAT y audio | Proyecto Linux y declaración de sus autores; no acredita configuración segura de serie ni soporte BricoHams. |
| [M0LTE.Flex](https://github.com/M0LTE/M0LTE.Flex) | AGPL-3.0-or-later | Cliente SmartSDR TCP/UDP y DAX/VITA-49 para Flex 6000 | No extrapolar a AURORA; incluye ports con procedencia MIT según su `PROVENANCE.md`. No integrar sin revisar licencia. |
| [QK4](https://github.com/mikeg-dal/QK4) | GPL-3.0-or-later | Cliente K4 de red con audio, spectrum, CAT server y TCI | Es específico de K4, no acredita K3S y no está integrado. |
| [TS-890 Pro](https://github.com/w9fyi/ts-890-pro) | No aclarada por el README consultado | Referencia de CAT USB y KNS de red/audio para TS-890S | Sin licencia OSI clara en el README; no reutilizar código. |
| [OpenWebRX](https://github.com/jketterl/openwebrx) | AGPL-3.0; ofrece licencia comercial según README | Referencia de arquitectura receptora web, WebSocket, Web Audio y waterfall | Receptor SDR, no control CAT/transmisión; restricciones de AGPL requieren evaluación para cualquier reutilización. |
| [CHIRP](https://github.com/kk7ds/chirp) | GPL-3.0 | Registro de radios y drivers de programación | Se centra en memorias/programación; no demuestra audio CAT remoto ni capacidades en vivo. |
| [Pion WebRTC](https://github.com/pion/webrtc) | MIT | Implementación Go de WebRTC como candidato a evaluar para audio | No integrada ni probada; no decide señalización, NAT, jitter o rendimiento. |
| [Opus](https://github.com/xiph/opus) | BSD de 3 cláusulas | Códec candidato para audio de baja latencia | No integrado; faltan pruebas de audio, buffer/jitter y licencias de distribución. |
| [(tr)uSDX project documentation](https://dl2man.de/) | El sitio indica CC BY-ND 4.0 para software, esquemas y PCB | Referencia pública de USB CAT, señales y stream serie | No copiar/derivar software, esquemas o PCB; revisar términos antes de cualquier reutilización. No es prueba BricoHams. |
| [QRP Labs QMX+](https://qrp-labs.com/qmxp.html) | El sitio publica manuales; licencia de código no establecida aquí | Referencia de COM virtual, CAT y USB Audio con versiones de firmware | No se reutiliza firmware ni se declara integración o compatibilidad propia. |

## Política de reutilización

1. Preferir especificaciones oficiales y APIs públicas.
2. Separar hechos de manual, observaciones de una implementación y pruebas propias.
3. Antes de enlazar dependencias, fijar versión, licencia, avisos y método de
   actualización.
4. No incorporar contenido copiado de interfaces, páginas o repositorios de
   terceros.
5. Si un protocolo solo se conoce por ingeniería inversa, documentar procedencia,
   licencia/condiciones y riesgo antes de escribir un driver.

La selección final de bibliotecas para hardware, WebRTC y Android sigue pendiente
de pruebas y revisión de licencias.

El análisis comparativo de repositorios, protocolos por fabricante y evidencias
específicas FTX-1 está en
[investigación de control CAT en GitHub](investigacion-cat-github.md).
La evidencia y el alcance del codec Kenwood actual están en
[la ficha CAT Kenwood](hardware/kenwood-ts-590-890-990.md).
La evidencia y el alcance del codec Elecraft K4 están en
[la ficha CAT K4](hardware/elecraft-k4.md).
Las consultas K3S y sus límites están en [la ficha K3S](hardware/elecraft-k3s.md).
Las referencias oficiales por modelo Icom y Yaesu se detallan en las fichas
[CI-V](hardware/icom-civ.md) y [CAT Yaesu](hardware/yaesu-cat.md).
Las primitivas SmartSDR y Hermes-Lite se documentan en
[protocolos de red](hardware/network-radio-protocols.md).
La especificación [ADIF 3.1.4](https://adif.org/314/ADIF_314.htm) sirve de
referencia para la exportación del [logbook local](logbook.md).
