# Pruebas físicas CAT multirradio (APK Bricohams)

Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro
Roca, fundadores y miembros directivos de Bricohams.
Información: <https://bricohams.org> y <https://bricohams.com>.

Checklist para probar con radios reales el CAT de la APK: la pantalla
**CAT Quansheng** (UV-K5 con firmware Bricohams) y la pantalla **Bricohams CAT
multirradio** (FT-817/818, FT-857/897, IC-705, FTX-1 y (tr)uSDX). Rellénala
mientras haces las pruebas. Una radio solo queda **certificada para su uso**
cuando todas sus filas obligatorias (marcadas con ★) están en `OK` y su fila
de la tabla final está firmada.

Los tests automáticos de la APK solo prueban los codificadores y
decodificadores contra los manuales de los fabricantes. Que esos tests pasen
**no es** una prueba en hardware: aquí solo cuenta lo comprobado con la radio.

## 1. Identificación de la entrega probada

| Campo | Valor |
| --- | --- |
| Versión APK (`versionName`) | |
| Commit (`git rev-parse HEAD`) | |
| SHA-256 del APK instalado | |
| Móvil (modelo y versión de Android) | |
| Cable / adaptador USB-OTG | |
| Interfaz de audio (si se usa) | |
| Fecha de inicio | |
| Operador (indicativo) | |

Valores de cada casilla de resultado: `OK`, `FALLO` (describe qué pasó en
Observaciones), `N/A` (la radio no tiene la función) o `NO PROBADO`. Nunca
conviertas un `NO PROBADO` en `OK`.

## 2. Seguridad antes de empezar

- Transmite siempre sobre **carga ficticia** o con la antena adecuada, en una
  frecuencia libre y con tu indicativo. La APK exige un indicativo válido
  antes de cualquier prueba de PTT o envío SSTV.
- Potencia mínima en todas las pruebas de PTT.
- Ten a mano un segundo receptor o SDR para comprobar las transmisiones.

## 3. Pruebas comunes (repetir con cada radio)

| # | Prueba | Cómo se comprueba |
| --- | --- | --- |
| C1 ★ | Detección USB | El puerto aparece en "Elegir dispositivo USB" (FTX-1: puerto 0 = Enhanced COM; IC-705: anota qué puerto responde). |
| C2 ★ | Conectar e identificar | Se muestra el modelo/ID correcto sin error. |
| C3 ★ | Leer frecuencia y modo (VFO A) | Coincide con la pantalla de la radio. |
| C4 ★ | Cambiar frecuencia VFO A | La radio cambia y la APK confirma la relectura. |
| C5 | Cambiar frecuencia VFO B | VFO B cambia; en IC-705/FTX-1 el VFO A no se mueve; en FT-8x7 se nota un salto breve de VFO. |
| C6 ★ | Cambiar modo (USB, LSB, CW, FM, AM) | Cada modo se refleja en la radio. |
| C7 ★ | PTT 3 s (carga ficticia) | La radio pasa a TX y vuelve a RX sola a los 3 s. |
| C8 | Split ON/OFF | El indicador de split de la radio cambia. |
| C9 | Leer memorias | Compara 3 canales (frecuencia, modo y nombre) y un canal vacío (no debe aparecer). |
| C10 | Tocar una memoria | La radio sintoniza esa frecuencia y modo. |
| C11 ★ | Desconectar el cable en mitad de la sesión | La APK avisa; la radio no queda en TX. |
| C12 ★ | Salir de la pantalla con PTT o seguimiento activo | PTT liberado y split desactivado. |
| C13 | Seguimiento de un pase real (Doppler) | RX corregido durante todo el pase; TX (subida) en VFO B con split; audio inteligible en el TCA. Anota satélite y hora. |
| C14 | SSTV TX | Imagen decodificada en el segundo receptor. Anota el modo. |
| C15 | SSTV RX | Imagen recibida y decodificada en la APK. |

## 4. Particularidades por radio

### Quansheng UV-K5 con firmware Bricohams (pantalla CAT Quansheng, regresión)

La pantalla original no cambia; comprueba que sigue funcionando igual.

| # | Prueba | Resultado | Firma | Observaciones |
| --- | --- | --- | --- | --- |
| Q1 ★ | Conectar, consultar y sintonizar (SAT RX) | | | |
| Q2 ★ | Seguimiento Doppler en un pase | | | |
| Q3 | SSTV TX con PTT armado (tecla 9) | | | |

### Yaesu FT-817 / FT-817ND / FT-818ND

Ajustes de la radio: menú CAT RATE igual al baudio de la APK (por defecto 4800);
el protocolo usa 8 bits, sin paridad y 2 bits de parada. Cable CAT con
adaptador USB-serie (CH340, CP210x, FTDI o PL2303). El protocolo de 5 bytes no
tiene orden para leer memorias, así que C9 y C10 son `N/A`. Es una radio
semidúplex: en satélite se corrige el RX y la subida se reprograma en el VFO B
como mucho cada 5 s.

| Prueba | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C11 | C12 | C13 | C14 | C15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FT-817/817ND | | | | | | | | | | | | | |
| FT-818ND | | | | | | | | | | | | | |

Firmware/versión: ______  Firma: ______  Observaciones: ______

### Yaesu FT-857 / FT-857D y FT-897 / FT-897D

Mismo protocolo y ajustes que el FT-817 (menú CAT RATE, 2 bits de parada);
C9 y C10 son `N/A`.

| Prueba | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C11 | C12 | C13 | C14 | C15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FT-857/857D | | | | | | | | | | | | | |
| FT-897/897D | | | | | | | | | | | | | |

Firmware/versión: ______  Firma: ______  Observaciones: ______

### Icom IC-705

Ajustes: dirección CI-V A4h (o la que indiques en la APK); prueba con
"CI-V USB Echo Back" en ON y en OFF y con "CI-V Transceive" en ON (al girar el
dial, la APK debe ignorar esas tramas). Por USB la radio crea dos puertos
serie; anota cuál responde al CAT.

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | | | | | | |

| # | Prueba específica | Resultado |
| --- | --- | --- |
| I1 ★ | Echo Back ON y OFF: ambas funcionan | |
| I2 | Transceive ON: girar el dial no rompe la sesión | |
| I3 | Nombre de memoria leído completo (16 caracteres) | |

Firmware: ______  Puerto que responde: ______  Firma: ______

### Yaesu FTX-1

Ajustes: firmware MAIN 1.08 o posterior (sin ella el CAT no funciona); menú
CAT-1 RATE igual al baudio de la APK (por defecto 38400); puerto USB
**Enhanced COM (CAT-1)**. VFO A = lado MAIN y VFO B = lado SUB.

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | | | | | | |

| # | Prueba específica | Resultado |
| --- | --- | --- |
| X1 ★ | ID leído = 0840 | |
| X2 | Etiqueta (tag) de memoria leída | |
| X3 | Split ON con TX en SUB durante un pase | |

Firmware MAIN: ______  Firma: ______

### (tr)uSDX

Ajustes: firmware 2.00t o posterior a 115200 baudios; las anteriores, a 38400 (la APK prueba la otra velocidad si no hay respuesta).
Solo HF de 80 a 10 m: C13 es `N/A`. Un solo VFO y sin memorias: C5, C8, C9 y
C10 son `N/A`. El audio SSTV va por el mismo cable USB (streaming CAT de
DL2MAN): no hace falta cable de audio.

| C1 | C2 | C3 | C4 | C6 | C7 | C11 | C12 | C14 | C15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

| # | Prueba específica | Resultado |
| --- | --- | --- |
| T1 ★ | Al conectar no entra en TX (RTS bajo, DTR alto) | |
| T2 ★ | ID leído = 020 | |
| T3 | SSTV TX por streaming CAT decodificado en otro receptor | |
| T4 | SSTV RX por streaming CAT decodificado en la APK | |
| T5 ★ | Tras enviar SSTV la radio vuelve a RX y se desactiva el streaming | |

Firmware: ______  Firma: ______

## 5. Verificación previa desde el PC (protocolo, no APK)

El 01-11-2026 se enviaron desde un PC con Windows (pyserial) las mismas cadenas
que generan los codificadores de la APK. Esto valida el **protocolo** con la
radio real, no la APK en el móvil: las filas C1-C15 siguen pendientes.

| Radio | Puerto | Comprobado | Resultado |
| --- | --- | --- | --- |
| FTX-1 | CP2105 Enhanced COM (CAT-1), 38400, 1 y 2 bits de parada | `ID` = 0840; `FA`/`FB` leer y escribir; `MD0` leer y escribir; `ST` 1/0; `TX` leer; `MR`/`MT` canales 1-5 (frecuencia, modo FM y etiqueta) | OK, estado original restaurado |
| (tr)uSDX | CH340, **38400** (esta unidad tiene firmware anterior a 2.00t; a 115200 solo devuelve basura) | `ID` = 020; `FA` leer y escribir; `MD` leer y escribir. Al abrir el puerto envía una trama `IF` espontánea que la APK descarta | OK, estado original restaurado |

PTT sobre carga ficticia (01-11-2026, con permiso del operador):

| Radio | Comprobado | Resultado |
| --- | --- | --- |
| FTX-1 | `TX1;` → `TX;` responde `TX1`; `TX0;` → `TX0` | OK |
| (tr)uSDX | `TX0;` / `RX;` aceptados; su trama `IF` no indica TX. El operador vio la radio entrar en TX y volver a RX | OK (confirmación visual) |
| (tr)uSDX streaming | 3 s de tono a 1000 Hz con `UA2;TX0;US…;RX;UA0;` a 38400: el envío tardó 9 s (~3840 muestras/s frente a las 11520 necesarias). La radio vuelve a RX y responde después | A 38400 **no sirve** para SSTV; la APK solo usa el streaming a 115200 y si no, el audio del móvil por el jack de micro |

La APK prueba sola 38400 si el (tr)uSDX no responde a 115200, y al revés.

### (tr)uSDX actualizado a la beta R2.00x (01-11-2026)

Firmware personal de DL2MAN cargado por USB con avrdude (`-c arduino -p m328p
-b 115200`, Optiboot 7.0, firma 1E 95 0F, escritura verificada, fusibles sin
tocar). La actualización devuelve los ajustes a fábrica: hay que volver a poner
8.2 PA Bias max, 8.3 Ref Frequency, 8.6 Rshunt y 8.7 LPF Config (Classic).
Antes de cada actualización conviene guardar la EEPROM (`-U eeprom:r:copia.hex:i`).

| Prueba | Resultado |
| --- | --- |
| CAT a 115200: `ID` = 020, `FA` 7,074 MHz, `MD` 2 | OK |
| Streaming RX (`UA2;`): unos 8.200 bytes/s, por encima de las 7.825 muestras/s | OK |
| Streaming TX (carga ficticia): 3 s de tono enviados en 3,0 s, TX visto en la radio, vuelve a RX | OK. El CAT tarda ~1 s en responder tras el streaming; la APK espera ese segundo |

## 6. Bluetooth y modos digitales (pendiente en el móvil)

| # | Prueba | Resultado |
| --- | --- | --- |
| B1 | IC-705: emparejar como dispositivo de datos (SET > Bluetooth Set > Pairing Reception) y conectar por Bluetooth en la APK | |
| B2 | IC-705 por Bluetooth: C3, C4, C6 y C9 | |
| B3 | Otra radio con adaptador serie Bluetooth (SPP) en su puerto CAT, mismo baudio: C2-C4 | |
| B4 | FTX-1: la APK explica que la BU-6 es solo para auriculares | |
| D1 | Digitales: elegir FT8 y banda, Sintonizar → frecuencia y modo DATA/USB en la radio | |
| D2 | Reloj UTC y cuenta atrás del ciclo coinciden con una app FT8 (FT8CN) | |
| D3 | "Liberar puerto" y abrir FT8CN/JS8Call con la misma radio: decodifica y transmite | |

## 7. Certificación de uso

Rellena una fila por radio cuando todas sus filas ★ estén en `OK`. Sin firma,
la radio sigue **sin certificar**.

| Radio | Firmware | APK (SHA-256) | Fecha | Operador | Resultado (APTO / NO APTO) |
| --- | --- | --- | --- | --- | --- |
| Quansheng UV-K5 Bricohams | | | | | |
| FT-817 / FT-817ND | | | | | |
| FT-818ND | | | | | |
| FT-857 / FT-857D | | | | | |
| FT-897 / FT-897D | | | | | |
| IC-705 | | | | | |
| FTX-1 | | | | | |
| (tr)uSDX | | | | | |

## 8. Documentación de los fabricantes usada

El código se ha escrito solo a partir de estos documentos, sin código de
otros autores:

- Yaesu, manuales de operación del FT-817ND, FT-818ND, FT-857D y FT-897D,
  capítulo "CAT Operation" (tabla de opcodes de 5 bytes).
- Icom, *IC-705 CI-V Reference Guide* (inglés, revisión 6).
- Yaesu, *FTX-1 Series CAT Operation Reference Manual* (ENG 2508-C).
- DL2MAN, "5 (tr)uSDX Details", apartado "(tr)uSDX supported CAT commands"
  (<https://dl2man.de/5-trusdx-details/>), subconjunto del CAT del Kenwood TS-480.
