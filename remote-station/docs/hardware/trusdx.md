# Evidencia de conexión: (tr)uSDX

## Estado

Es un candidato añadido por el propietario. BricoHams enumera interfaces serie
genéricas, pero no identifica el USB del (tr)uSDX ni abre CAT. Tiene un codec
protocolario puro para algunas consultas de lectura; no recibe audio ni controla
PTT/TX.

## Evidencia primaria consultada

La página de proyecto de DL2MAN describe una interfaz (Micro-)USB de CAT y
programación. Su página de detalles documenta un subconjunto del interfaz CAT
Kenwood TS-480 y un protocolo propio de streaming. Esa semejanza no permite
presentar el equipo como un Kenwood ni inferir comandos no descritos.

| Aspecto | Lo que dice la documentación pública | Límite BricoHams |
|---|---|---|
| CAT/serie | Puerto USB serial COM; el proyecto documenta 38400 y 115200 baud según firmware, 8N1 y sin flow control | Codec de consultas/parseo puro; inventario genérico no identifica el radio y no existe transporte |
| Backend Hamlib | El archivo `trusdx.c` identifica `ID020`, describe 38400–115200, 8N1 sin handshake y limita su alcance a frecuencia/modo documentados | Evidencia de implementación secundaria, no prueba BricoHams. El backend también registra un callback PTT que BricoHams no habilita. |
| Configuración en otros repositorios comunitarios | Un driver Linux declara 115200 8N2 y emulación CAT TS-480; Hamlib y documentación del proyecto describen 8N1 | Hay discrepancia. No adoptar 8N2 ni seleccionar configuración por un driver comunitario; cotejar manual/firmware y confirmar con equipo físico antes de abrir un puerto. |
| Señales | Indica DTR HIGH y RTS LOW en RX; describe que RTS HIGH puede accionar CW/PTT | No tocar RTS/DTR. Cualquier futuro adaptador necesita validación eléctrica y de estado al abrir/cerrar |
| Streaming | La página documenta extensión CAT para audio por el mismo serial; declara RX 7825 Hz y TX hasta 11520 Hz para firmware compatible | No se reproduce el stream ni se habilita TX en BricoHams |
| Firmware | La guía indica baudrate 115200 desde 2.00t; streaming requiere al menos 2.00u | Detectar y mostrar firmware antes de evaluar capacidades |
| Cobertura | El proyecto describe por defecto 80/60/40/30/20m y otras configuraciones posibles de filtro | No convertirlo en restricciones regulatorias ni validación de configuración |
| Scope | El manual describe una vista en la pantalla local del radio | No se documenta aquí exportación remota de muestras o waterfall |
| Programación | Firmware se carga mediante interfaz USB/bootloader y herramientas específicas | No confundir actualización de firmware con el puerto CAT operativo |

## Consultas CAT documentadas y codec protocolario

La página de detalles del proyecto enumera consultas `FA;` (frecuencia), `MD;`
(modo), `IF;` (frecuencia/modo) e `ID;` (identificación). La misma fuente
documenta 38400 baud por defecto, 8N1 y sin control de flujo; versiones desde
2.00t también admiten 115200. Esta evidencia procede del sitio del desarrollador,
no de una validación de BricoHams.

BricoHams codifica solamente `FA;`, `MD;`, `IF;` e `ID;` en una lista cerrada.
El codec parsea la frecuencia de 11 dígitos, modos documentados `1..5` y la
identificación `020`. `IF;` queda como consulta sin parser porque la fuente
inspeccionada no especifica suficientemente el formato de respuesta. No se
implementan ajustes `FAnnn...;`, `MDn;`, controles de potencia, `RX;`, `TX...;`
ni las extensiones de streaming `UA0;`, `UA1;`, `UA2;` y `US`.

El proyecto documenta DTR HIGH y RTS LOW en RX, con RTS HIGH capaz de accionar
CW/PTT. BricoHams no abre el puerto ni cambia DTR/RTS. El módulo
[`trusdx_cat.py`](../../bricoham_remote_station/drivers/trusdx_cat.py) no tiene
transporte serie; sus pruebas usan respuestas sintéticas. No afirma que un puerto
enumerado sea CAT ni constituye soporte de radio.

El backend de Hamlib aporta una segunda fuente para los parámetros serie: marca
8N1 sin handshake, con 38400 baud en firmware antiguo y 115200 en firmware más
reciente. También advierte sobre diferencias de modos por versión. Esta
implementación no resuelve la discrepancia con el driver 8N2 por sí sola; el
manual de proyecto y el equipo/firmware concretos siguen siendo decisivos.

## Riesgos y licencias

La documentación pública lista comandos que pueden cambiar el estado RX/TX y
señales físicas que pueden accionar CW/PTT. BricoHams no enviará comandos de
transmisión ni modificará RTS/DTR. No se acepta CAT arbitrario desde el cliente.

El sitio del proyecto indica CC BY-ND 4.0 para software, esquemas y layouts de
PCB. No se reutiliza ni modifica ninguno de esos archivos. La implementación
propia debe basarse en documentación pública y pasar revisión de licencia antes
de cualquier distribución.

## Pruebas que faltan

- Unidad física, revisión de hardware y firmware.
- Enumeración del convertidor USB-UART en Windows, Linux/Raspberry Pi, macOS y
  FreeBSD.
- Comparar las respuestas del codec con una unidad física y firmware identificados.
- Parser de mensajes incompletos/segmentados y multiplexación de stream/audio.
- Audio RX real, latencia y recuperación después de desconexión.
- Confirmar sin instrumentación RF que el agente nunca acciona PTT/CW.

## Fuentes

- [Proyecto (tr)uSDX](https://dl2man.de/)
- [Detalles CAT y streaming](https://dl2man.de/5-trusdx-details/)
- [Manual de operación](https://dl2man.de/4-trusdx-manual/)
- [Instrucciones de firmware](https://dl2man.de/3b-trusdx-firmware/)
- [Backend (tr)uSDX de Hamlib](https://github.com/Hamlib/Hamlib/blob/af198ace7697c84f5d8ce084271208e383012792/rigs/kenwood/trusdx.c) — evidencia secundaria de la implementación, sus límites de firmware y su callback PTT.
- [Investigación CAT en GitHub](../investigacion-cat-github.md).
