# Xiegu y Lab599: investigación y candidatos, no compatibilidad declarada

La investigación independiente incorporó estos equipos al catálogo como
**candidatos sin transporte/decoder habilitado**. No se fijan direcciones
CI-V desde Hamlib ni se heredan comandos de un modelo Icom/Kenwood.
No hubo prueba física ni medición de popularidad.

| Modelo | Evidencia encontrada | Pendiente para habilitar transporte |
| --- | --- | --- |
| G90/G90S | Manual p52: CI-V estándar; referencia Xiegu v1.0: frecuencia/modo, ID 0090 | Dirección, framing y configuración serie verificados; Hamlib propone direcciones distintas |
| X6100 | Manual p34: DEV USB-C/CH342; tutorial FT8 muestra 19200; referencia ID 6100 | Dirección/framing y respuesta exacta de modo, incluyendo si hay filtro |
| G106/G106C | Referencia v1.0: ID 0106, nota sobre data/filter | Solo nombrado en ID/notas; faltan transporte y datos por firmware |
| X6200 | Manual v01 p36: DEV/CH342; advierte que otras selecciones CI-V pueden no responder | Referencia v1.0 no lo nombra; dirección, baud, comandos/ID sin evidencia suficiente |
| X5105 | Manual 3.0 p58: CI-V con cable COMM | Referencia v1.0 no lo nombra; parámetros/ID/comandos exactos pendientes |
| Lab599 TX-500 | CAT r3, 2026-03, p1: FA consulta/respuesta/setter ASCII | Tablas restantes no se extrajeron de forma fiable: ID/modos/transporte pendientes |

## Referencia Xiegu

[XIEGU RADIO CI-V REFERENCE v1.0](https://xiegu.eu/?sdm_process_download=1&download_id=3576),
documento con marca Xiegu hospedado por el distribuidor xiegu.eu; no se presenta
como descarga de xiegu.com. SHA256:
`51cecff85563298ccd6a961f877adee2d8e903d112e1a20425edd552c6a06e60`.

Tabla 1 (p1): 03 consulta frecuencia activa, 04 modo activo. Tabla 2-1 (p2):
cinco bytes BCD little-endian en Hz. Tabla 2-2 (p2): un byte de modo,
00 LSB, 01 USB, 02 AM, 03 CW, 05 NFM, 07 CWR. No se documenta byte de filtro
en 04 ni se acepta RTTY por analogía; 26 y 1A06 tienen sus layouts separados.
La nota «blank for all XIEGU radios» no valida builds/modelos futuros ausentes.

No define preámbulo, terminador, dirección, 8N1 ni ACK/NAK. El manual G90 remite
al estándar CI-V, pero esa mención no resuelve la dirección ni los detalles
de las respuestas. Se requerirá configuración local explícita, nunca sondeo
ni elección del primer puerto. No se tolerarán bytes extra desconocidos como
un supuesto filtro. 1C no funciona en G90 hasta 1.79b03 según la nota 4:
no puede usarse como autorización de TX ni guardia RF universal.

## Fuentes

- [Descargas del distribuidor](https://xiegu.eu/downloads/).
- [G90](https://xiegu.eu/?sdm_process_download=1&download_id=1033),
  [X6100](https://xiegu.eu/?sdm_process_download=1&download_id=2202),
  [X6200 v01](https://xiegu.eu/?sdm_process_download=1&download_id=9243),
  [X5105 3.0](https://xiegu.eu/?sdm_process_download=1&download_id=1460).
- [Tutorial X6100 FT8](https://xiegu.eu/?sdm_process_download=1&download_id=2209):
  19200 en OmniRig, no dirección CI-V de protocolo.
- [Lab599 CAT r3](https://downloads.lab599.com/DOCS/Lab599-CAT-protocol-r3.pdf),
  SHA256 `9109519def1552a53abb4c52de556baf3f5e12ee8c60d81ad282ea9c99d93e67`.
- Hamlib/comunidad solo son evidencia secundaria. No se implementa FX-4CR:
  aún no hay investigación primaria suficiente.

El catálogo muestra estas limitaciones, no compatibilidad ficticia ni espectro
simulado. Las siguientes implementaciones deberán validar los campos exactos
y conservar exclusividad CAT, límites locales y pruebas de error.
