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
| Consola web responsive/PWA | Navegación desde teléfono, tablet y ordenador; instalación en pantalla de inicio | Implementada: `remote.webmanifest`, `remoto.webmanifest`, `remote-sw.js` (solo estáticos, nunca `/api` ni tokens) y `remote-station/apps/web-console/public/sw.js` |
| Control CAT | Frecuencia, VFO/split, bandas, modos, filtros, RIT/XIT y DSP/ganancias según radio | Implementado vía `rigctld` en `remote-agent.cjs`; ampliaciones por radio solo con fuente (`remote-catalog.cjs`) |
| Scope y waterfall | Scope de la radio, ajuste y selección de señal para sintonizar | Parcial: waterfall local en la consola; sin waterfall en "escucha pública" (pendiente de fuente) |
| Audio | Recepción de baja latencia y audio TX desde micro/headset | Implementado (RX y TX con lease en `remote-agent.cjs`); TX por invitado exige permiso explícito |
| Periféricos de sintonía | FlexControl, CTR2-MIDI y teclado/paddle, según la página pública | Pendiente |
| Accesorios de estación | Amplificadores, tuner, switches, relés, PDU y rotores | Parcial: capa común de seguridad ([accesorios-estacion.md](accesorios-estacion.md)); rotor (`rotor.py`, Android `Rotor*`); controladores de dispositivos externos `pendiente de fuente` |
| Multi-radio | Selección de varios equipos por estación | Parcial: registro de radios, lease/PTT por radio y `GET /api/radios` en `remote-ops.cjs`; un agente aún maneja un `rigctld` |
| Roles/visitas | Invitados con permisos por radio, solo escucha o transmisión y límites | Implementado en el agente Node: token propio por invitado, bandas y potencia máx. aplicadas en el agente, revocación (`remote-ops.cjs`, `/api/guests`); sin UI de invitaciones ni Python/Android |
| Registro y operación | Logbook ADIF, mapas, premios, DX cluster, alertas, historial TX | Parcial: historial TX con CSV (`/api/txlog.csv`); resto pendiente |
| Modos digitales | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR y RADE, según plan/producto | Parcial: WSJT-X limitado (ver `REMOTE_STATION.md`); resto pendiente |
| Seguridad TX | Liberación al perder enlace, timeout y exclusión de operador | Implementada: latido 1 s, límite de tiempo, SWR, un operador, liberación al ocultar/perder foco/segundo plano (web y Android) |
| Encendido/apagado remoto | Encender/apagar la radio | Parcial: apagado FTX-1 `PS0` (`docs/FTX1-KNOWLEDGE.md`) con confirmación en el agente Node; IC-705 `18 00`/`18 01` solo como constructor probado en Python (`icom_civ.py`), sin cablear; resto pendiente de fuente |
| Escucha pública | Audio de solo escucha | Implementada, desactivada por defecto, sin control y con límite de tasa (`listenLive`) |
| Actualización del agente | Aviso de nuevas versiones | Implementada, opt-in: solo releases de GitHub, firma Ed25519 + SHA-256, nunca instala sin consentimiento |
| Red | Agente con conexión saliente, enlace cifrado directo o relay | Implementada (`remote-relay.cjs`, TLS) |
| Aplicaciones | Web móvil y aplicación Apple TV de solo escucha | Web/Android implementados; Apple TV fuera del alcance |

Comparación de radios: los 44 modelos de la lista del tercero (revisada el
22 de noviembre de 2026: 17 Icom, 13 FlexRadio, 4 Kenwood, 7 Yaesu, 2 Elecraft y
Hermes Lite 2) figuran en `data/remote-station-catalog.json` (IC-7850 e IC-7851
comparten una entrada). BricoHams añade además (tr)uSDX, QMX/QMX+ y QCX/QDX.
El encendido remoto solo tiene fuente para el apagado del FTX-1 (`PS0`) y para el
IC-705 (CI-V `18 00`/`18 01`, guía CI-V del IC-705 p. 5 y p. 18; constructores en
`remote-station/bricoham_remote_station/drivers/icom_civ.py`); el resto sigue
"pendiente de fuente".

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
