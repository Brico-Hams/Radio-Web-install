# TK-11: ingeniería de interoperabilidad y camino hacia un firmware propio

Base de conocimiento sobre el Quansheng TK-11. Cada dato lleva su fuente; lo que no está confirmado se marca como **UNVERIFIED**. Este proyecto no flashea firmware en el TK-11 y este documento no lo cambia.

## Alcance y reglas

- Solo se usan fuentes públicas y la implementación de este repositorio. No se ha decompilado ningún binario ni se ha copiado código de TK-11 Manager.
- El código de CHIRP-to-TK11-csv es GPL-3.0 y está portado con atribución en `ACKNOWLEDGEMENTS.md`. El driver de CHIRP es GPL-2.0-or-later.
- De TK-11 Manager solo se describe el comportamiento que publica su presentación. No se conoce su licencia.
- Nada de lo escrito aquí se ha probado sobre una radio real salvo lo que ya hace `tk11-connector.js`.

## Fuentes

| Id | Fuente | Contenido |
|---|---|---|
| [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) | Artículo de URZ sobre TK-11 Manager | Funciones y medidas de seguridad de la herramienta |
| [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) | CHIRP-to-TK11-csv (GPL-3.0) | Formato CSV de importación del TK-11 |
| [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) | Driver tk11.py de CHIRP | Protocolo CPS y mapa de memoria |
| [F4](https://github.com/armel/tk11-teardown) | Teardown de armel (Apache-2.0) | MCU, memoria y falta de documentación |
| F5 | `tk11-connector.js` y `tk11-ui.js` de este repositorio | Implementación independiente sobre F3 |
| [F6](https://github.com/spm81/Multi-UVTools) | Multi-UVTools de spm81 (sin LICENSE) | Afirmaciones sobre desplazamientos del TK-11; solo datos, sin reutilizar código; fuente única, **UNVERIFIED**; se basa en el módulo TK11 de CHIRP, así que no es independiente de F3 en los desplazamientos compartidos |
| [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf) | Datasheet AP8048B de MVSilicon | Pines, SWD, cifrado de código en Flash SPI, actualización por SD/USB |
| [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) | Datasheet AP8048C de MVSilicon | Igual que F7 para la variante C |
| [F9](https://github.com/rob-w/tk11-firmware-custom) | rob-w/tk11-firmware-custom (fork de F4) | Descrito como reimplementación abierta del firmware, pero solo contiene README, LICENSE, PDF y JPG; sin código ni binarios; último push 2025-04-29 |
| [F10](https://github.com/qshosfw/hermes) | README de qshosfw/hermes (GPL-3.0) | Fuente secundaria que llama al TK-11 una radio con Beken BK4819 |
| [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) | Foto del teardown, vista A verso de la PCB V2.0 | Observación visual del autor de este documento |

## Hardware

| Elemento | Dato | Fuente |
|---|---|---|
| MCU | AP8048 de MVSilicon, basado en Arm Cortex-M3 | [F4](https://github.com/armel/tk11-teardown) |
| Flash interna | 2 MB | [F4](https://github.com/armel/tk11-teardown) |
| SRAM interna | 128 KB | [F4](https://github.com/armel/tk11-teardown) |
| EEPROM o Flash SPI externa | Ninguna identificada en la PCB | [F4](https://github.com/armel/tk11-teardown) |
| Datos persistentes | Bootloader, firmware, calibración, ajustes y 999 canales estarían en la Flash interna; es una deducción del autor del teardown, **UNVERIFIED** | [F4](https://github.com/armel/tk11-teardown) |
| Datasheet | No hay datasheet público completo; los detalles solo se dan bajo NDA | [F4](https://github.com/armel/tk11-teardown) |
| SDK y herramientas | No hay SDK ni toolchain público para el AP8048 según F4. Búsquedas en GitHub (2026-11-09) de `AP8048` y `tk11 firmware`: 0 repositorios; no se encontró fuente de firmware, fichero de actualización, protocolo de actualización ni combinación de teclas del bootloader en github.com, urez.org ni spm81.github.io. Existe un SDK de MVSilicon para un chip hermano, leadercxn/bp1048_sdk_v0.1.12 (no revisado; licencia desconocida). F9 no aporta código | [F4](https://github.com/armel/tk11-teardown), [F9](https://github.com/rob-w/tk11-firmware-custom) |
| Variante del MCU | Hay datasheets de AP8048A, B y C en F4. Cuál lleva el TK-11 es **UNVERIFIED**: el marcado de la foto no es legible | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Puerto SWD | Los datasheets de B y C (LQFP48 7x7 mm) listan "Serial wire debug (SWD) interface": GPIO_C[13] = SWCLK, GPIO_C[14] = SWDIO, en los pines 2 (SWCLK) y 3 (SWDIO) en B y C. Masa DVSS: pin 38 (B), pin 39 (C); IOVDD 3,3 V: pin 40 (B). Contradicción: el README de F4 dice que el chip no tiene interfaz externa de programación o depuración. Si SWD está activo o bloqueado en el TK-11 es **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf), [F4](https://github.com/armel/tk11-teardown) |
| Reset | Ninguna de las dos tablas de pines lista un pin NRST; pin POWER_KEY: 17 en B y C | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Interfaz de Flash SPI y cifrado de código | Pines GPIO_A[13..18] = FSH_HOLD, FSH_SCK, FSH_SI, FSH_WP, FSH_SO, FSH_CS = pines 21 a 26 en ambas variantes. La lista de características incluye "Code encryption mechanism in SPI-flash". Que la "Flash interna de 2 MB" sea una Flash SPI en el encapsulado que use esos pines es una **deducción** de los datasheets, **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Canal de actualización según el datasheet | "Firmware updatable through SD/USB drive" (B y C); el de AP8048A habla de arranque desde Flash SPI y actualización por disco SD o USB. No se sabe si el TK-11 lo usa: **UNVERIFIED** | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Núcleo y memoria según el datasheet | Cortex-M3 a 96 MHz y 128 KB de SRAM | [F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf) |
| Chip de RF | F4 incluye datasheets de BK4819 y BK4829 (Beken). Observación de la foto: dos chips QFN con logotipo Beken en zonas apantalladas, coherente con BK4819/BK4829; las referencias exactas son **UNVERIFIED**. F10 llama al TK-11 una radio Beken BK4819 (fuente secundaria) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg), [F10](https://github.com/qshosfw/hermes) |
| Receptor FM | F4 incluye el datasheet del RDA5807M; la foto muestra un chip SOP marcado "5807M" (observación) | [F4](https://github.com/armel/tk11-teardown/tree/main/datasheet), [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Huella SOP-8 sin montar | Observación de la foto: una huella SOP-8 vacía junto al MCU; su función es **UNVERIFIED** (suele ser una Flash SPI o EEPROM opcional) | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Pads de prueba | Observación de la foto: no se ven pads SWD etiquetados a esa resolución | [F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg) |
| Enlace del CPS | Serie a 38400 baudios con DTR activo | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Pantalla y audio | No identificados en este documento: **UNVERIFIED** | F5 |

## Protocolo CPS

### Trama

Cada mensaje lleva cabecera, carga útil, CRC y cierre. La carga útil y el CRC se enmascaran con XOR cíclico de 16 bytes y el CRC se calcula sobre la carga útil en claro ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

```text
AB CD LL LL [carga util][CRC16-XMODEM LE]  DC BA
LL LL = longitud de la carga util (u16 LE)
clave XOR = 16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80
```

El valor "magic" de 32 bits lo genera al azar el CPS oficial; con un valor fijo (5) la radio responde igual, pero debe ser el mismo en toda la sesión ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

### Tabla de comandos

| Id | Nombre | Carga útil | Fuente |
|---|---|---|---|
| `0x01F4` | Petición de conexión | Tipo u16, longitud 4, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01F5` | Respuesta de conexión | Cadena de firmware en los bytes 4 a 19; el análisis es de F5, **UNVERIFIED** frente al CPS oficial | F5 |
| `0x01FB` | Lectura de memoria | Tipo u16, longitud 12, dirección u32 (`0x080000` más el desplazamiento), tamaño u16, 2 bytes a cero, magic u32 | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FC` | Respuesta de lectura | 12 bytes de cabecera y los datos; máximo `0x200` por bloque | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FD` | Escritura de memoria | La misma cabecera de 16 bytes y los datos; máximo `0x200` por bloque | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x01FE` | Respuesta de escritura | Trama de 16 bytes en total; el éxito se comprueba por el código | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x05DD` | Reinicio | Solo tipo y longitud; el driver lo define y su uso real en el CPS oficial es **UNVERIFIED** | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Otros | Cualquier comando de actualización, calibración o bootloader | Sin documentar: **UNVERIFIED** | F5 |

El límite de memoria del driver es `0x23000` (140 KiB) a partir de la base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)). No se sabe si `0x080000` es una dirección real de la Flash o una dirección lógica del CPS: **UNVERIFIED**.

## Mapa de memoria

Los desplazamientos son relativos a la base `0x080000` ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Desplazamiento | Tamaño | Contenido | Fuente |
|---|---|---|---|
| `0x00000` | 999 × 64 B (`0xF9C0`) | Canales | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x0F9C0` a `0x10FFF` | `0x1640` | Sin documentar; puede contener calibración, **UNVERIFIED** | F5 |
| `0x11000` | 1011 B | Indicador de uso por canal (`0xFF` es vacío); los 12 últimos no están identificados | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x12000` | `0x48` | Radio FM: VFO, id de canal, indicador de memoria y 32 frecuencias | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x13000` | `0xF8` | Ajustes generales | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x14000` | `0x70` | Ajustes generales 2: códigos de borrado y reactivación, nombre del equipo | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x15000` | `0x10` | Selección actual: 8 valores u16 de A, B, frecuencia, canal y NOAA | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x16000` | 32 × `0x80` | Listas de escaneo; terminan exactamente en `0x17000` | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x17000` | 4 B | Contraseña de encendido de 6 dígitos, u32 little endian, según Multi-UVTools; **UNVERIFIED**, hueco de CHIRP | [F6](https://github.com/spm81/Multi-UVTools) |
| `0x1A000` | 16 × 24 B | Contactos DTMF: nombre de 16 B y código de 8 B | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x1A800` | 16 × 24 B | Contactos de 5 tonos: igual que DTMF | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22000` | 16 × 40 B | Direcciones de decodificación NOAA SAME: 8 B de dirección y 32 B de texto | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x22280` | 128 B | Control de eventos NOAA SAME | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| `0x23000` | Final | Límite de memoria del CPS | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| Resto | Huecos entre estructuras | Sin documentar; se conservan siempre | F5 |
| `0x0D6008` | 1024 B | Logotipo de arranque 128x64 monocromo según Multi-UVTools (relativo a la base `0x080000`, como el resto); fuera de la ventana de `0x23000` del CPS; **UNVERIFIED** | [F6](https://github.com/spm81/Multi-UVTools) |

### Calibracion: resolucion del solape

Multi-UVTools ([F6](https://github.com/spm81/Multi-UVTools), fuente única, **UNVERIFIED**) afirma que la calibración del TK-11 ocupa `0x010000`-`0x021000` (68 KB) y que su limpiador de EEPROM conserva `0x010000`-`0x015010` y `0x020000`-`0x021000`. Su código dice basarse en el módulo TK11 de CHIRP, así que no es independiente de F3 en los desplazamientos compartidos. El rango `0x11000`-`0x1A980` choca con estructuras de CHIRP (uso, FM, ajustes, listas, contactos), por lo que no puede ser todo calibración. Las partes que caen en huecos de CHIRP son `0x10000`-`0x10FFF` y `0x20000`-`0x20FFF`: candidatas, **UNVERIFIED**. `tk11-connector.js` no escribe nunca ninguna de estas zonas (la lista `UNVERIFIED_REGIONS` solo sirve para nombrarlas al comparar copias) ni el logotipo.

El VFO principal (A-F01 a A-F11 y B-F01 a B-F11 en los menús de CHIRP) no tiene estructura propia en el driver: dónde se guardan las frecuencias de VFO es **UNVERIFIED**. El único VFO documentado es el de la radio FM. Las "zonas" no aparecen en ninguna fuente: lo más parecido son las 32 listas de escaneo, cada una con nombre de 16 B, dos prioridades u16 y 48 canales u16 ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)); si el TK-11 tiene zonas como el DMR es **UNVERIFIED**.

### Registro de canal (64 bytes)

Las frecuencias se guardan en unidades de 10 Hz y los tonos CTCSS en décimas de hercio; los códigos DCS se guardan como el número octal leído en decimal ([F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py)).

| Byte | Campo | Notas |
|---|---|---|
| 0 | `rx_freq` | u32 |
| 4 | `freq_diff` | u32, desplazamiento |
| 8 | `tx_non_standard_1` | Sin documentar |
| 9 | `tx_non_standard_2` | Sin documentar |
| 10 | `rx_qt_type` | 0 ninguno, 1 CTCSS, 2 DCS normal, 3 DCS invertido |
| 11 | `tx_qt_type` | Igual que el anterior |
| 12 | `freq_dir` | 0 simplex, 1 más, 2 menos |
| 13 | `band` | El nibble bajo a 1 es banda estrecha (según F5) |
| 14 | `step` | Paso |
| 15 | `encrypt` | 0 a 10 |
| 16 | `power` | 0 bajo, 1 medio, 2 alto |
| 17 | `busy` | Bloqueo por canal ocupado |
| 18 | `reverse` | Inversión de frecuencias |
| 19 | `dtmf_decode_flag` | Decodificación de señalización |
| 20 | `ptt_id` | 0 a 3 |
| 21 | `mode` | 0 FM, 1 AM, 2 LSB, 3 USB, 4 CW |
| 22 | `scan_list` | `0xFF` ninguna |
| 23 | `sq` | 0 a 8 |
| 24 | `name` | 16 bytes ASCII |
| 40 | `rx_qt` | u32 |
| 44 | `tx_qt` | u32 |
| 48 | `unknown` | 8 bytes sin documentar |
| 56 | `tx_qt2` | u32 sin documentar |
| 60 | `signal` | 0 DTMF, 1 5 tonos |
| 61 | `unknown_2` | 3 bytes sin documentar |

### Ajustes generales (`0x13000`)

| Bytes | Campos | Fuente |
|---|---|---|
| 0 a 16 | Canal A/B, squelch NOAA, TOT, escaneo NOAA, bloqueo de teclado, VOX, micrófono, modo de frecuencia, visualización, AGC, ahorro, doble escucha, retroiluminación, canal de llamada (u16), pitido | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 17 a 27 | Cuatro acciones de teclas laterales, modo de escaneo, bloqueo automático, pantalla de arranque, alarma, tono de fin de TX, cola de repetidor, tono de cola | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 28 a 40 | Reducción de ruido, transposición, volúmenes A y B, tono de teclas, idioma, NOAA SAME, barra de señal | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 41 a 55 | Brillo, código de borrado, tono lateral DTMF, respuesta DTMF, búsqueda de tono, tono CW (u16) | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 56 a 127 | Bloque DTMF: separador, grupo, tiempos, identificador de 8 B y códigos de subida y bajada | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 128 a 215 | Bloque de 5 tonos: igual que DTMF más protocolo y 15 frecuencias de usuario | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |
| 216 a 247 | Dos líneas de 16 caracteres del texto de bienvenida | [F3](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/tk11.py) |

## Formato CSV del TK-11

El CSV que importa TK-11 Manager y que genera el conversor de nikantgr tiene una cabecera fija. Que TK-11 Manager lo importa tal cual es **UNVERIFIED** por mi parte: [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/) solo dice que exporta e importa CSV, y [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) lo describe como el formato del software de Quansheng.

```text
No.,Name,RX Freq[MHZ],TX Freq[MHZ],QT Encode Type,QT Encode1,QT Decode Type,QT Decode,MSW,Band,Powrer,Busy Lock,ScanList,Demode,Freq Reverse,SQ,Encrypt,Signaling Decode,PTTID,Signal
1,PMR01,446.00625,0.15300,Null,Null,Null,Null,2K,12.5K,Low,OFF,1,FM,OFF,3,OFF,OFF,OFF,DTMF
2,,,,,,,,,,,,,,,,,,,
```

### Columnas

La cabecera escribe "Powrer" con esa errata y se conserva tal cual. Los valores por defecto son los que fija el conversor.

| Columna | Valores observados | Notas | Fuente |
|---|---|---|---|
| `No.` | 1, 2, 3, … | Correlativo desde 1; los huecos son filas vacías | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Name` | Texto | Máximo 12 caracteres según el autor ("i think"), **UNVERIFIED**; la memoria admite 16 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `RX Freq[MHZ]` | 446.00625 | MHz con 5 decimales | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `TX Freq[MHZ]` | 145.07500 | Frecuencia absoluta; `0.15300` significa sin TX | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode Type` | Null, Ctcss, NDCS, IDCS | NDCS es DCS normal e IDCS invertido | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Encode1` | Null, 77.0, 023 | Tono CTCSS o código DCS | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode Type` | Null, Ctcss, NDCS, IDCS | Igual que la codificación | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `QT Decode` | Null, 77.0, 023 | Igual que la codificación | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `MSW` | 2K | Significado **UNVERIFIED**; CHIRP lista 2K a 5K | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Band` | 12.5K, 25K | Ancho de banda: estrecho o ancho | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Powrer` | Low, Middle, High | Potencia | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Busy Lock` | ON, OFF | Bloqueo por canal ocupado | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `ScanList` | 1 | El conversor siempre escribe 1; la numeración 1 a 32 y el valor sin lista son **UNVERIFIED** | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Demode` | FM, AM, LSB, USB, CW | Modulación | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Freq Reverse` | ON, OFF | Inversión de frecuencias | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `SQ` | 3 | Squelch de 0 a 8 | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Encrypt` | OFF | Cifrado; el conversor solo escribe OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signaling Decode` | OFF | El conversor solo escribe OFF | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `PTTID` | OFF | Otros valores **UNVERIFIED**; se usan los de CHIRP | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |
| `Signal` | DTMF, 5TONE | Tipo de señalización | [F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py) |

### Conversión desde CHIRP

El conversor ([F2](https://github.com/nikantgr/CHIRP-to-TK11-csv/blob/main/convert_chirp_to_tk11.py)) hace lo siguiente y está portado a `tk11-connector.js`:

- Numera de nuevo desde 1 entre la memoria más baja y la más alta, y deja filas vacías en los huecos.
- Calcula la frecuencia TX con el duplex: menos y más restan y suman el desplazamiento, split toma el desplazamiento como TX, off escribe `0.15300` y el resto copia la RX.
- Convierte Tone en CTCSS de codificación, TSQL en CTCSS de ambos lados, DTCS y DTCS-R según la polaridad (N normal, R invertida) y Cross según el modo cruzado.
- NFM da banda de 12.5K y cualquier otro modo 25K; la demodulación solo admite FM, AM, LSB, USB y CW.
- Publica variantes con comillas, con coma decimal y con el separador de la configuración regional. Aquí se portan las dos primeras y la tercera no.
- Cambios de este repositorio: la potencia se toma de CHIRP (Low y High; el resto es Middle).

Las funciones públicas de `R.TK11` son `channelsToTk11Csv`, `channelsFromCsv` (detecta TK-11 o CHIRP por la cabecera) y `chirpCsvToTk11Csv`. La importación solo rellena la tabla de la página; la radio no cambia hasta pulsar el botón de escribir canales, que exige antes una copia verificada. Las filas inválidas se omiten con su motivo.

## Qué expone TK-11 Manager

Todo lo siguiente procede de [F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/); no se ha ejecutado ni analizado la herramienta.

| Capacidad | Detalle publicado | Comparación con CHIRP |
|---|---|---|
| Ejecución | En el navegador, sin Internet ni envío de datos | Mismo protocolo; CHIRP es de escritorio |
| Protocolo | Basado en el driver TK11 de CHIRP, según el artículo | Mismo mapa de memoria |
| Canales | Gestión completa de los 999 | Igual |
| Ajustes | Generales, teclas y funciones rápidas | Igual |
| Listas de escaneo | Sí | Igual; no se mencionan zonas |
| DTMF y 5 tonos | Contactos y señales | Igual |
| Radio FM | Sí | Igual |
| Copias | Automática en cada lectura; restauración | No es automática en CHIRP |
| Seguridad | Verifica el firmware antes de modificar, escribe solo bloques cambiados y verifica byte a byte | Mejora de método, no de formato |
| Herramientas avanzadas | Visor de memoria | Sin visor en CHIRP |
| Datos | Exporta e importa CSV y abre imágenes de CHIRP | Igual en CSV |
| Actualización de firmware | No se menciona | Ninguna herramienta pública la ofrece |
| Interfaz | Walkie virtual y siete temas más uno personalizable | Sin equivalente |

Conclusión: el artículo no revela ninguna región de memoria, ajuste ni comando que no esté en el driver de CHIRP. Qué significa "verificar el firmware" y cómo lo hace es **UNVERIFIED**.

## Camino hacia firmware funcional

### Pasos

Todos los pasos son **UNVERIFIED** hasta que se hagan con una radio de pruebas. Ninguno se implementa en esta aplicación.

1. **Acceso SWD y protección de lectura.** Según los datasheets de AP8048B y AP8048C ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)), SWCLK es el pin 2 y SWDIO el pin 3 del LQFP48; masa en el pin 38 (B) o 39 (C) y IOVDD de 3,3 V en el pin 40 (B). No hay pin NRST. Conectar una sonda (ST-Link, J-Link o CMSIS-DAP) con OpenOCD y leer solo el IDCODE y la lista de AP (ver "Procedimiento de hardware"). No ejecutar nunca un desbloqueo o borrado total: en muchos MCU eso destruye la Flash.
2. **Volcado completo de la Flash.** Si la depuración está abierta, leer los 2 MB con la sonda, dos veces, y comparar los SHA-256. Guardar el volcado como copia privada y no redistribuirlo. Después buscar en él un registro de canal conocido para saber si `0x080000` es una dirección real.
3. **Identificar el bootloader.** Ver en el volcado la tabla de vectores, el tamaño y la dirección del cargador, y si comprueba firma o CRC.
4. **Capturar el protocolo de actualización.** Con el actualizador oficial y un analizador USB (USBPcap con Wireshark, o un analizador de hardware), capturar una actualización completa de una radio de pruebas: cómo entra en modo cargador, si reutiliza la trama AB CD, XOR y CRC, y el formato del fichero (cabecera, cifrado, firma). Hay que comparar dos versiones. No se debe reenviar ninguna escritura capturada a una radio.
5. **Toolchain y SDK del AP8048.** Un compilador `arm-none-eabi-gcc` para Cortex-M3 sirve para el núcleo, pero los periféricos (reloj, GPIO, LCD, teclado, audio, RF) solo están en el SDK de MVSilicon o en documentación bajo NDA ([F4](https://github.com/armel/tk11-teardown)). Si no hay SDK, los registros habrá que deducirlos de la placa.
6. **Prueba mínima de parpadeo y LCD.** Cargar un programa pequeño en la SRAM de 128 KB con el depurador y ejecutarlo sin escribir en la Flash, para encender el retroiluminado o la linterna y después dibujar en el LCD. Así no se toca nada permanente.
7. **Portado.** Solo con el paso 6 resuelto: escribir los controladores de pantalla, teclado, audio y RF, conservar el bootloader y mantener el mismo mapa de memoria y protocolo CPS para que CHIRP y TK-11 Manager sigan funcionando. El firmware K5 de F4HWN no se puede portar tal cual: tiene otro MCU (Cortex-M0), otro mapa de memoria y EEPROM externa ([F4](https://github.com/armel/tk11-teardown)).

### Veredicto de viabilidad

Un firmware propio completo no es viable hoy. Hay tres bloqueos duros: el AP8048 no tiene SDK público ([F4](https://github.com/armel/tk11-teardown)), no existe un protocolo de actualización público y no se sabe si la depuración SWD está abierta. El datasheet del fabricante baja el bloqueo de SWD de "desconocido" a "documentado por el fabricante, estado en el TK-11 sin verificar" ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)). Aparece un bloqueo nuevo: el cifrado de código en la Flash SPI que mencionan esos datasheets. Lo realista es una meta de arranque (parpadeo y LCD desde la SRAM) con una radio sacrificable, y solo si el paso 1 sale bien. Un firmware completo con RF, audio y menús sería un proyecto de meses con ingeniería inversa de hardware, y aun así sin garantía de que el chip lo permita.

## Procedimiento de hardware (radio de pruebas)

Todo es **UNVERIFIED** hasta que se haga. Solo con una radio de pruebas, nunca con la radio de uso diario.

1. Identificar la variante (A, B o C) por el marcado del chip con una lupa.
2. Localizar por continuidad los pines 2 (SWCLK), 3 (SWDIO), masa y 3,3 V desde el LQFP48 (punto del pin 1) hasta pads de prueba o vías. Preferir una vía antes que soldar al pin.
3. Preparar una sonda CMSIS-DAP, ST-Link o J-Link con la radio alimentada por su propia batería, VTref a 3,3 V y velocidad de 100 kHz.
4. Sesión de OpenOCD de solo lectura, que lee solo el IDCODE del DP y la lista de AP:

```text
openocd -f interface/cmsis-dap.cfg -c "transport select swd" -c "adapter speed 100" -c "swd newdap ap8048 cpu -enable" -c "dap create ap8048.dap -chain-position ap8048.cpu" -c "init" -c "dap info" -c "shutdown"
```

5. Como no hay NRST, conectar con la radio en marcha (sin "connect under reset").
6. Solo si el AP responde: crear un destino cortex_m, ejecutar `mdw 0x00000000 8` para ver la tabla de vectores y hacer `dump_image` de la región de código dos veces, comparando los SHA-256.
7. Buscar en el volcado un registro de canal conocido para relacionar el desplazamiento 0 del CPS con una dirección de Flash.
8. Prohibido: cualquier comando de borrado, desbloqueo, escritura en Flash, bytes de opción o borrado total. La radio va sobre una carga ficticia y nunca transmite.
9. Captura USB, solo si aparecen un actualizador oficial y su fichero: USBPcap y Wireshark sobre el cable del CPS, comparar dos versiones y no reenviar nunca escrituras capturadas.
10. Opcional: analizador lógico en los pines 21 a 26 (FSH) durante el arranque para ver si las lecturas de Flash pasan por ellos; según el datasheet se espera que los datos estén cifrados.

## Que se puede hacer sin radio sacrificable

- (a) Copias de seguridad de solo lectura con el CPS más la herramienta "Comparar dos copias" de este panel: cambiar una opción de menú en la radio, hacer una copia nueva y compararlas sirve para mapear campos desconocidos y para confirmar o rechazar los desplazamientos de Multi-UVTools (para `0x17000`: poner una contraseña de encendido, hacer la copia y comparar). Requiere un TK-11, pero nunca escribe.
- (b) Sonda SWD de solo lectura del IDCODE (obliga a abrir la radio; afecta a la garantía).
- (c) Investigación de escritorio sobre los datasheets.

Todo lo demás necesita una radio sacrificable.

### Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Borrado de la Flash al desbloquear la depuración | Se pierden bootloader, calibración y canales | No desbloquear nunca; volcar antes con la depuración abierta |
| Calibración fuera de la copia del CPS | Radio fuera de especificaciones tras un fallo | El CPS no la expone (el mapa llega a `0x23000`); hace falta el volcado completo |
| Pisar el bootloader | Radio inservible sin sonda | Flashear solo la región de aplicación y conservar el volcado |
| Capturas de actualización reenviadas | Una versión incompatible bloquea la radio | No reenviar escrituras capturadas |
| Derechos de autor y NDA | Problemas legales al publicar volcados o datasheets | No redistribuir volcados ni documentos bajo NDA; consultar la ley local sobre ingeniería inversa |
| Cumplimiento radioeléctrico | Un firmware propio puede emitir fuera de banda o sin homologación | Respetar los límites de las bandas y la normativa local |
| Falsa seguridad de las pruebas | Los tests de este repositorio solo cubren el CPS simulado | Probar siempre en una radio de pruebas |

## Registro de cambios

### 2026-11-09

Lo aprendido:

- El driver de CHIRP es GPL-2.0-or-later, no GPL-3.0-or-later; último commit del fichero 2026-03-19 ([F3](https://raw.githubusercontent.com/kk7ds/chirp/master/chirp/drivers/tk11.py)).
- Las listas de escaneo de CHIRP terminan exactamente en `0x17000` (32 × `0x80` desde `0x16000`).
- Multi-UVTools no tiene LICENSE y sus afirmaciones sobre el TK-11 son de fuente única y no independientes de CHIRP ([F6](https://github.com/spm81/Multi-UVTools)).
- rob-w/tk11-firmware-custom no contiene código ni binarios ([F9](https://github.com/rob-w/tk11-firmware-custom)).
- armel/tk11-teardown incluye datasheets de AP8048A/B/C, BK4819, BK4829 y RDA5807M ([F4](https://github.com/armel/tk11-teardown/tree/main/datasheet)).
- Los datasheets de AP8048B y AP8048C listan SWD (pines 2 y 3), cifrado de código en Flash SPI y actualización por SD/USB, y no listan NRST ([F7](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048B-MVSILICON.pdf), [F8](https://github.com/armel/tk11-teardown/blob/main/datasheet/AP8048C-MVSILICON.pdf)).
- Observaciones de la foto: MCU mVsilicon AP8048 LQFP48, dos QFN Beken, un SOP "5807M" y una huella SOP-8 vacía ([F11](https://github.com/armel/tk11-teardown/blob/main/teardown/TK11_VIEW_A_VERSO_PCB_V2.0.jpg)).
- F10 llama al TK-11 una radio Beken BK4819 (fuente secundaria) ([F10](https://github.com/qshosfw/hermes)).
- Búsquedas en GitHub de `AP8048` y `tk11 firmware`: 0 repositorios; sin fuente de firmware, fichero o protocolo de actualización públicos.
- urez.org solo tiene el artículo de TK-11 Manager y no dice nada del firmware ([F1](https://urez.org/tk-11-manager-la-herramienta-definitiva-para-programar-tu-quansheng-tk-11-desde-el-pc/)).

Cambios en el código:

- Licencia de CHIRP corregida a GPL-2.0-or-later en `tk11-connector.js`.
- Nueva lista `UNVERIFIED_REGIONS` (nunca escribible) y funciones `describeOffset` y `diffImages` en `R.TK11`.
- Botón "Comparar dos copias" en el panel TK-11: solo lectura, no toca la radio.
