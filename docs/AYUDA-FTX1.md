# Guia Yaesu FTX-1: memorias y configuracion

El editor web FTX-1 Beta lee, edita, copia y escribe las memorias y los ajustes
del menu del Yaesu FTX-1 desde el navegador, por el puerto CAT USB y Web Serial.
Solo usa los comandos documentados en el manual oficial de Yaesu "CAT Operation
Reference Manual" del FTX-1. No sustituye a ADMS ni al software de Yaesu, y no
envia datos a ningun servidor.

## Requisitos y conexion

- Chrome o Edge en `localhost` o HTTPS (Web Serial).
- Firmware MAIN 1.08 o posterior: el manual indica que CAT no funciona con
  versiones anteriores.
- Cable USB-C a la radio. Windows muestra dos puertos "Silicon Labs Dual CP210x";
  sirve el `Enhanced COM Port` (CAT-1) o el `Standard COM Port` (CAT-2).
- Cierra cualquier otro programa CAT (WSJT-X, loggers, cat-ftx1) antes de conectar.
- Velocidad: la de `CAT-1 RATE` o `CAT-2 RATE` segun el puerto (de fabrica 38400 y
  4800 bps). Una FTX-1 real respondio por CAT-2 a 4800 bps.

Al conectar, la pagina envia `ID;` y exige la respuesta `ID0840;` del FTX-1.
Despues envia `AI0;` para desactivar la informacion automatica mientras trabaja.

## Memorias

"Leer memorias" consulta los canales elegidos (1-999) con `MR` y el nombre con
`MT`. Un canal vacio responde `?;` y se muestra como libre. Puedes editar:

| Campo | Comando | Valores |
|---|---|---|
| Frecuencia | `MW` | 0.030000-470.000000 MHz |
| Modo | `MW` | LSB, USB, CW-U, CW-L, FM, FM-N, AM, AM-N, RTTY, DATA, PSK, C4FM |
| Tono | `MW` | OFF, CTCSS ENC/DEC, CTCSS ENC, DCS, PR FREQ, REV TONE |
| Desplazamiento | `MW` | Simplex, + o - |
| Nombre | `MT` | Hasta 12 caracteres ASCII |

El clarificador se conserva tal como se leyo. La frecuencia del subtono, el
codigo DCS y el ancho del desplazamiento no forman parte de `MR`/`MW`: son
ajustes FM globales del menu (`TONE FREQ`, `DCS CODE`, `RPT SHIFT(144MHz)`,
`RPT SHIFT(430MHz)`) que puedes cambiar en la seccion de configuracion. No hay
comando documentado para borrar un canal: un canal ocupado no se puede dejar
vacio desde la web.

"Copiar canal" duplica un canal en otra posicion del editor. "Exportar CSV" crea
un CSV con columnas CHIRP; "Importar CSV" acepta CSV CHIRP u OpenGD77 con canales
FM y los coloca desde el canal inicial que indiques. Al importar se pierden los
tonos de origen: revisalos antes de escribir.

## Configuracion del equipo (menu)

La tabla se genera a partir de la tabla 3 (MENU Chart) del manual con
`scripts/build-ftx1-menu.py`. Cada ajuste se lee con `EX` y se escribe con el
mismo comando, respetando el numero de digitos y los valores documentados. Los
elementos marcados "-" en el manual no se ofrecen. Quedan en solo lectura los
ajustes que pueden cortar la conexion CAT (velocidades, temporizadores y bits de
parada CAT, puerto TUN/LIN), el ajuste de referencia `REF FREQ ADJ`, el destino
APRS fijo y el estado Bluetooth.

## Copia, simulacion y escritura

La escritura queda bloqueada hasta cumplir tres pasos en la misma sesion:

1. Leer desde la radio.
2. Descargar la copia JSON de esa lectura (`bricohams-ftx1-backup`).
3. Pulsar "Simular escritura" y revisar la tabla de diferencias.

Al escribir solo se envian los canales o ajustes cambiados. Cada uno se vuelve a
leer y se compara con lo enviado; si la radio responde `?;` o un valor distinto,
la escritura se detiene e indica el canal o ajuste. Para deshacer, carga la copia
JSON con "Restaurar copia JSON", simula y escribe de nuevo.

## Limites

- Solo canales de memoria 1-999. PMS, 5 MHz, canal de emergencia y memorias
  split (`MZ`) no se editan.
- El README de cat-ftx1 advierte que algunas respuestas reales del FTX-1 difieren
  del manual. Prueba primero con un canal libre y conserva siempre la copia.
- Los modos marcados "-" en el manual (por ejemplo el codigo `0`, que usa algun
  canal real) se leen y se muestran, pero no se escriben: elige otro modo antes.
- El manual de Yaesu no se distribuye con este proyecto.
