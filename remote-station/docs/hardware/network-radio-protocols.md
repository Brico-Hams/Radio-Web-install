# Protocolos de red: SmartSDR y Hermes-Lite 2

Estas implementaciones son primitives puras para una futura CLI de diagnóstico:
codifican una consulta SmartSDR `info`, validan su respuesta correlacionada y
preparan/decodifican únicamente el paquete de descubrimiento Metis. No abren
sockets, no descubren equipos por sí solas, no cambian ajustes ni arrancan
streams. No son drivers de radio completos ni validación de hardware.

## SmartSDR TCP/IP

`smartsdr_protocol.py` implementa:

- `build_query(SmartSdrReadCommand.INFO, sequence) -> bytes`: crea
  `C<sequence>|info\n`. La documentación oficial de FlexRadio muestra `info`
  como consulta de parámetros de radio.
- `parse_response(frame, expected_sequence) -> SmartSdrResponse`: requiere una
  respuesta `R<sequence>|<hex_response>|<message>` con terminador de línea,
  limita la secuencia y el código a 32 bits, verifica la secuencia esperada y
  conserva el texto de respuesta sin interpretarlo. El código de éxito es cero.

La allowlist solo expone `info`; no acepta comandos CAT, texto arbitrario,
consultas adicionales, setters, `xmit` ni PTT. La documentación oficial sitúa
la API TCP en el puerto 4992. El transporte y el manejo de las respuestas de
estado asíncronas quedan fuera del codec.

### Candidatos FlexRadio

El catálogo local contiene estos 13 candidatos de red: AURORA-510/510M/520/520M,
FLEX-6400/6400M/6600/6600M/6700/8400/8400M/8600/8600M. La especificación
SmartSDR consultada acredita la sintaxis común de la API; no acredita que cada
modelo de esa lista implemente esa API, ni una versión de firmware concreta.
AetherSDR enumera varios FLEX-6000/8000 y nombres `AU-510/520`, pero su
documentación identifica FLEX-8600 con firmware 4.2.18 como objetivo activo de
pruebas y no resuelve la equivalencia exacta entre `AU-*` y las etiquetas
`AURORA-*` del catálogo local. Por tanto, todos los candidatos permanecen sin
compatibilidad individual verificada en BricoHams.

Esta integración no añade ni certifica transporte de red para otros candidatos
del catálogo: Icom IC-705/7100/7200/7300/7300MK2/7410/7600/7610/7700/7760/
7800/7850/7851/905/9100/9700/R8600; Kenwood TS-590S/590SG/890S/990S; Yaesu
FT-710/991A/FTDX10/FTDX101D/FTDX101MP/FTDX3000/FTX-1; Elecraft K3S/K4;
(tr)uSDX; y QMX+. Los codecs previos del proyecto, si existen, conservan su
alcance y evidencia separados.

## Hermes-Lite 2 / openHPSDR Protocol 1

`hermes_lite_protocol.py` ofrece:

- `build_discovery_request() -> bytes`: devuelve el paquete fijo de 63 bytes
  `EF FE 02` seguido de 60 ceros. El destino UDP documentado es el puerto 1024;
  el caller elige la interfaz/dirección y realiza el envío.
- `parse_discovery_reply(packet) -> HermesLiteDiscoveryReply`: requiere
  exactamente 60 bytes, cabecera `EF FE`, estado `02` (idle) o `03` (streaming)
  y board ID `06`. Expone MAC, estado, byte de gateware sin convertir y board
  ID. No negocia una sesión ni empieza/para streaming.

La referencia pública de AetherSDR cita la guía openHPSDR Protocol 1 y el
wiki/gateware Hermes-Lite 2, y documenta board ID `0x06` y la estructura de
descubrimiento. El ID identifica la familia Hermes-Lite; por sí solo no
distingue inequívocamente un Hermes-Lite 2. La única candidata Hermes-Lite en el
catálogo es Hermes Lite 2; su identificación exacta y compatibilidad en
BricoHams aún requieren comprobar hardware y firmware.

## Evidencia, límites y validación

- FlexRadio, documentación SmartSDR API: [TCP/IP API](https://github.com/flexradio/smartsdr-api-docs/wiki/SmartSDR-TCPIP-API)
  y [comando `info`](https://github.com/flexradio/smartsdr-api-docs/wiki/TCPIP-info).
- AetherSDR, documentación de HL2 y script de descubrimiento (referencia
  pública secundaria fijada a `ae99396124081e304c6d7bcea9a7605f5a921f32`):
  [guía HL2](https://github.com/aethersdr/AetherSDR/blob/ae99396124081e304c6d7bcea9a7605f5a921f32/docs/user/docs/hermes-lite-2.md)
  y [discover.py](https://github.com/aethersdr/AetherSDR/blob/ae99396124081e304c6d7bcea9a7605f5a921f32/tools/hl2/discover.py).
- Los codecs y pruebas son originales y sintéticos; no incorporan código de
  terceros. No se conectó ni probó ningún equipo físico.
