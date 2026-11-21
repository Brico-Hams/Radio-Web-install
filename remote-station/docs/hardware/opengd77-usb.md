# OpenGD77: identificación USB headless, no CAT RF

El agente incorpora una integración **experimental de RadioInfo**, reutilizando
el contrato binario de [gd77-connector.js](../../../gd77-connector.js) del destino.
Es firmware OpenGD77, no el firmware comercial original ni una marca de radio.
No hay validación física ni garantía de que todas las builds implementen R9.

## Funciones y límites

| Función | Agente remoto |
| --- | --- |
| Modelo, revisión de estructura, versión y fecha de firmware | Lectura RadioInfo experimental |
| Frecuencia, modo, selección de canal, PTT remoto | Unsupported: USB CPS no ofrece órdenes RF documentadas |
| Pantalla, codeplug, firmware, reloj y keps | No implementados por este endpoint |
| Programación/pantalla local del portal existente | Se conserva; no equivale a CAT RF remoto |
| Hotspot MMDVM | No se usa como sustituto de CAT/fonía/PTT |

Los perfiles son `OpenGD77 ` seguido del nombre exacto: GD-77, GD-77S,
DM-1801, RD-5R, DM-1801A, MD-9600, MD-UV380, MD-380, DM-1701, MD-2017,
DM-1701 RGB, DM-32 o UV008. MD-UV390 (GPS) informa la plataforma MD-UV380:
selecciona esa plataforma, sin declarar un modelo detectado diferente.

## Conexión explícita

```powershell
py -3.12 -m bricoham_station_agent --enable-experimental-cat `
  --serial-model "OpenGD77 GD-77" --serial-port COM7 --serial-baud 115200
```

Modelo/puerto son ejemplos, no detección automática. USB CDC MK22/STM32 y la
familia SERIAL tienen interfaces distintas; el baud debe revisarse localmente
(el conector del destino usa 115200 para SERIAL). El agente conserva 8N1,
sin flujo, RTS/DTR inactivos antes de abrir y advertencia sobre posibles pulsos
del driver USB. Usa el driver y firmware correctos; desactiva hotspot localmente.
No se envía `C` para entrar/salir de CPS ni se cambia el estado de la radio.

`GET /api/v1/cat` muestra solo `INFO`, sin abrir puerto. Admin/operador puede
solicitar `GET /api/v1/cat?command=INFO`, directamente o por el host HTTPS.
El panel CAT compartido web/Android/iOS muestra `device_information`;
declara `experimental`, `hardware_validation_complete: false`,
`radio_control_available: false` y `tx_control_enabled: false`.

La solicitud es `52 09 00 00 00 00 00 2E`. La respuesta debe tener cabecera
`52 00 2E` y exactamente 46 bytes de carga. Es framing por longitud, no por
`;` o `FD`. Versión/tipo son uint32 little-endian, seguidos de dos campos
ASCII de 16 bytes para firmware/build. Se validan versiones 1..4, índice de
modelo conocido y coincidencia exacta con la selección local. No se infiere
un mapa de memoria. Los últimos seis bytes no se interpretan ni publican:
no hay `rawInfo`/`reply_hex` en la API, ni se envía RadioInfo como diagnóstico.

Una negativa `-`, tamaño incorrecto, modelo/revisión desconocida o timeout
cierra el puerto y genera un error explícito. No hay reintento, fallback de
memoria, sondeo de puertos, escritura de codeplug ni descarga de firmware.

## Evidencia y compatibilidad de versiones

- El contrato de R9 procede de la implementación existente del destino,
  no de una extrapolación de CI-V/Yaesu. El [codec original del agente](../../bricoham_remote_station/drivers/opengd77_usb.py)
  está limitado a esa lectura.
- [Guía mantenida del proyecto](https://github.com/LibreDMR/OpenGD77_UserGuide)
  y [ayuda existente por modelos](../../../docs/AYUDA-OPENGD77-MODELOS.md).
- [Fuente pública archivada usb_com.c, b843c1f](https://github.com/open-ham/OpenGD77/blob/b843c1f050ebcfdb7aea7fad9182af13bc5ef3e6/firmware/source/usb/usb_com.c):
  acepta R/W/C en modo USB CPS, pero esa revisión **no tiene R9** y limita las
  lecturas a 32 bytes. Por tanto, no es prueba de RadioInfo ni compatibilidad de
  una build moderna: en ella se espera rechazo, nunca se fabrican datos.
- Las publicaciones actuales de firmware en opengd77.com no sustituyen la
  validación del protocolo de cada build. No se incorpora firmware/códec
  comercial ni código fuente de terceros a los paquetes del agente.

## Referencia pública GitLab y licencia

[OpenGD77 Screen Mirror](https://gitlab.com/chopsuei3/opengd77-screen-mirror)
documenta lecturas de información y framebuffer. Su
[licencia](https://gitlab.com/chopsuei3/opengd77-screen-mirror/-/raw/main/LICENSE)
añade una restricción no comercial: no se incorpora su código ni binarios a
este producto de software libre. El README es evidencia secundaria, no prueba
de R9 en firmware original. La fuente archivada citada arriba sigue sin R9;
no se promociona esta integración a soporte validado.

No se encontraron issues públicas del proyecto que confirmen un bug corregido.
Sus advertencias sobre hotspot y uso simultáneo del puerto no son aceptación
física de nuestro agente: timeout/puerto ocupado siguen siendo fallos explícitos.
Los tamaños de paquete/fragmentos grandes de framebuffer no se extrapolan a
RadioInfo: nuestra respuesta R9 tiene 49 bytes, no un bloque de 512 bytes.
Se conserva el framing por longitud y el rechazo `-`, sin entrar en CPS ni
activar lecturas de pantalla, escritura o RF.

Pruebas de software cubren fragmentación, bytes `FD`/`;` dentro del payload,
cabeceras/tamaños, revisión/modelo, negativas, timeout y ausencia de comandos
C/W/PTT. No son pruebas físicas de radio, audio, USB OTG ni RF.
