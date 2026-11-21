# Evidencia de conexión: QRP Labs QMX+

## Estado

Es un candidato añadido por el propietario. BricoHams no enumera el USB-C, no abre
el puerto CAT, no captura audio y no controla PTT/TX.

## Documentación del fabricante consultada

La página de QRP Labs describe el QMX+ como transceptor kit/ensamblado de
160m–6m, con CAT en USB Virtual COM, tarjeta USB de audio de 24-bit/48ksps y USB-C
para audio y CAT. Publica el manual de CAT para firmware 1.04.004 y posteriores.
La propia página advierte que el firmware mínimo del QMX+ es 1.00.019 o superior;
no son requisitos intercambiables.

| Aspecto | Evidencia pública | Límite BricoHams |
|---|---|---|
| Conexión | USB-C transporta CAT y audio; aparece como puerto USB Virtual COM | No se han comprobado VID/PID, nombre COM, canales o topología USB |
| CAT | Manual CAT oficial dependiente de firmware | Codec de consultas allowlist y parser para frecuencia/modo; sin transporte ni lectura física |
| Audio | El fabricante documenta tarjeta de audio USB integrada 24-bit/48ksps | No se ha probado qué endpoint/canales corresponden a RX o TX |
| Scope/IQ | La página enumera salida IQ para software SDR | La salida IQ no se considera por sí sola el scope nativo ni waterfall |
| Variantes | Hay revisiones PCB y manuales distintos; la documentación pide seleccionar el manual para la revisión/firmware | La compatibilidad necesita registrar PCB y firmware exactos |
| PTT/TX | La documentación incluye operación CAT TX | No existe ruta de PTT/TX en BricoHams; el estado permanece bloqueado |

No se ha copiado código del manual. Antes de programar un driver se debe leer la
revisión exacta del manual CAT, verificar cada comando de solo lectura y probarlo
en hardware sin transmitir.

El repositorio comunitario [`qmx-cat`](https://github.com/toddfoster/qmx-cat)
implementa lectura/escritura de menús y permite enviar CAT arbitrario; su propio
README advierte que tiene pocas protecciones. No se reutiliza ni se toma como
diseño de seguridad. Su descripción se refiere a QMX; no se presume equivalencia
de modelo/firmware con QMX+.

El proyecto comunitario [`qmx-hl2`](https://github.com/rampa069/qmx-hl2/tree/26d22c3ba59e236f041a742417ebbc20e6febda0)
declara soporte QMX/QMX+ desde firmware 1.02.004 y convierte el I/Q/audio USB y
CAT en un endpoint de red openHPSDR Protocol 1. El waterfall mostrado por el
cliente SDR procede del flujo I/Q (48 kHz), no de un scope nativo del QMX+.
También incluye transmisión opcional; no forma parte de BricoHams ni de su estado
CAT de solo lectura y no se adopta su ruta TX.

## Consultas CAT documentadas

El manual CAT de QRP Labs para firmware 1.04.004+ describe estas consultas sin
argumentos:

| Consulta | Dato descrito por el fabricante | Implementación BricoHams |
|---|---|---|
| `FA;`, `FB;` | Frecuencia VFO A/B en Hz, 11 dígitos | Encoder y parser de frecuencia; solo protocolo, sin puerto serie |
| `FR;`, `FT;`, `SP;` | VFO RX/TX y split | Encoder en lista permitida; sin parser/lectura física |
| `MD;` | Modo; códigos 1, 2, 3, 5–9 | Encoder y parser de modo documentado |
| `IF;`, `TQ;`, `ID;`, `VN;` | Estado, estado TX, identificación y firmware | Encoder en lista permitida; sin parser/lectura física |
| `SM;`, `SW;`, `PC;` | Valores de medidores | Encoder en lista permitida; sin parser/lectura física |

Las consultas terminan exactamente en `;`; no se envían CR ni LF, porque CR
activa el modo terminal de ese puerto. El manual de operación también describe
opciones para key/PTT por DTR. BricoHams no abre puertos ni cambia DTR/RTS. El
código [`qmx_cat.py`](../../bricoham_remote_station/drivers/qmx_cat.py) solo
serializa consultas permitidas y valida respuestas de frecuencia/modo; la
capacidad CAT continúa `unsupported` hasta integrar y probar un transporte
seguro en el equipo físico.

## Pruebas pendientes

- Identificar PCB, firmware y modalidad de montaje del ejemplar.
- Enumerar USB/COM y audio en Windows, Linux/Raspberry Pi, macOS y FreeBSD.
- Validar lectura CAT, frecuencia/modo y recuperación de desconexión con el radio
  físicamente conectado.
- Determinar si el IQ output es accesible y si tiene documentación suficiente;
  no confundirlo con las muestras del scope de pantalla.
- Confirmar que no se envía PTT ni TX durante detección y pruebas.

## Fuentes

- [QRP Labs QMX+](https://qrp-labs.com/qmxp.html)
- [Manual CAT, firmware 1.04.004 y posteriores](https://qrp-labs.com/images/qmx/manuals/cat_1_04_004.pdf)
- [Manual de operación QMX](https://qrp-labs.com/images/qmx/manuals/operation_1_04_004.pdf)
