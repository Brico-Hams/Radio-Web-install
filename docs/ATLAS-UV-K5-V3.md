# Atlas tecnico del Quansheng UV-K5 V3 y UV-K1

Revision: 26-10-2026. Base de conocimiento de hardware, comunicacion, flasheo y
desarrollo para el UV-K5 V3 y su gemelo UV-K1. Los pines, memorias y protocolos
salen del codigo fuente abierto que funciona hoy en estas radios
([F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom), Apache-2.0) y
del [teardown de armel](https://github.com/armel/k1-teardown), no de suposiciones.
Para configurar la radio paso a paso usa la [puesta en marcha de 0 a 100 %](AYUDA-QUANSHENG.md#puesta-en-marcha-de-0-a-100).

| Bloque | Componente |
| --- | --- |
| MCU | Puya PY32F071 (PY32F071C1BT6), Cortex-M0+ a 72 MHz, 128 KB flash, 16 KB SRAM |
| Transceptor | Beken BK4829 |
| Radio FM | Beken BK1080 |
| Memoria de datos | Flash SPI PUYA PY25Q16HB, 2 MB |
| Pantalla | ST7565, 128x64 monocromo |
| Audio | Amplificador LM4898/LN4898 |
| USB-C | Carga y programacion (puerto serie virtual CDC) |

## Versiones y como identificarlas

El firmware de una version no sirve en otra: el microcontrolador es distinto y
la imagen no arranca o deja la radio sin pantalla.

| Version | MCU | Memoria de datos | USB-C | Firmware abierto de referencia |
| --- | --- | --- | --- | --- |
| V1 (UV-K5, K5(8), K6, 5R Plus) | DP32G030, 48 MHz, 64 KB | EEPROM I2C de 8 KB (ampliable) | Solo carga | [armel/uv-k5-firmware-custom](https://github.com/armel/uv-k5-firmware-custom) |
| V2 | PY32F030 / PY32G030 | EEPROM I2C | Solo carga | [muzkr/uv-k5-firmware-custom](https://github.com/muzkr/uv-k5-firmware-custom) |
| **V3 y UV-K1** | **PY32F071**, 72 MHz, 128 KB | **Flash SPI PY25Q16 de 2 MB** | **Carga y programacion** | [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) |

- **Pegatina bajo la bateria:** «V2» o «V3». Sin marca suele ser V1, pero el
  manual ARDF avisa de etiquetas V3 en hardware V2: no es prueba unica.
- **USB-C que aparece como puerto serie** al conectarlo al PC: V3/K1.
- **Version del bootloader** (encender con PTT pulsado): UV-K5 V3 anuncia
  `7.00.07`; UV-K1 `7.02.02` o `7.03.0x`. En los grupos aparecen UV-K5(8) V3
  con `7.0.11`: si ves otra cifra, compruebala antes de flashear.
- K1 y K5 V3 comparten placa (serigrafia `K1-V5.0`) y firmware. En la flash de
  fabrica solo cambia la segunda linea del mensaje de arranque (`0x007030`).
- Un `.bin` de V3 empieza por su tabla de vectores: palabra 0 = pila en SRAM
  (`0x2000xxxx`), palabra 1 = reset en `0x0800xxxx` con el bit 0 a 1. Un binario
  de V1 tiene el reset cerca de `0x000000xx`.

## Arquitectura

El PY32F071 lo controla todo: programa los registros del BK4829 en cada cambio
de frecuencia, modo, filtro o potencia, lee el S-meter y gestiona audio,
pantalla, teclado y memoria.

![Diagrama de bloques del UV-K5 V3: MCU, transceptor, memoria, pantalla, teclado, audio, USB y bateria](atlas/bloques-v3.svg)

## Pinout del PY32F071

Asignacion que usa F4HWN para V3/K1 (`App/board.c`, `App/driver/*.c`). El numero
fisico de patilla esta en el [datasheet del PY32F071](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf).

| Pin | Funcion | Configuracion | Driver |
| --- | --- | --- | --- |
| PA0 | Flash SPI2 SCK | AF8 SPI2 | `py25q16.c` |
| PA1, PA2 | Flash SPI2 MISO/MOSI | AF9 SPI2, prescaler /2, DMA1 | `py25q16.c` |
| PA3 | Flash SPI CS | Salida | `py25q16.c` |
| PA4 | DAC de voz / captura de audio RX | Analogico, TIM6 + DMA | `voice.c` |
| PA5 | LCD SPI1 SCK | AF0 SPI1, prescaler /64 | `st7565.c` |
| PA6 | LCD A0 (dato/comando) | Salida | `st7565.c` |
| PA7 | LCD SPI1 MOSI | AF0 SPI1 | `st7565.c` |
| PA8 | Habilitacion del amplificador de audio | Salida | `gpio.h` |
| PA9, PA10 | USART1 TX/RX (jack Kenwood) | AF1, 38400 baudios | `uart.c` |
| PA11, PA12 | USB FS D-/D+ (CDC) | USB | `vcp.c` |
| PA13, PA14 | SWDIO / SWCLK | SWD si se compila `ENABLE_SWD` | `board.c` |
| PB0 | Tension de bateria | ADC1 canal 8, 12 bits | `board.c` |
| PB1 | Analogico reservado | Modo analogico | `board.c` |
| PB2 | LCD CS | Salida | `st7565.c` |
| PB3-PB6 | Teclado, columnas | Salidas | `keyboard.c` |
| PB8 | BK4829 SCK | Salida, bit-bang | `bk4829.c` |
| PB9 | BK4829 SDIO bidireccional | Salida/entrada, bit-bang | `bk4829.c` |
| PB10 | PTT | Entrada pull-up, activo a nivel bajo | `gpio.h` |
| PB12-PB15 | Teclado, filas | Entradas pull-up | `keyboard.c` |
| PC13 | Linterna | Salida | `board.c` |
| PF5, PF6 | BK1080 SCL/SDA | I2C bit-bang | `i2c.c` |
| PF8 | Retroiluminacion LCD | PWM por TIM7 + DMA | `backlight.c` |
| PF9 | BK4829 CS | Salida | `bk4829.c` |

### Matriz del teclado

El firmware pone a nivel bajo una columna y lee las cuatro filas. La «columna
0» es sin columna activa y lee los laterales. PTT va aparte en PB10.

| Fila | Col 0 | PB6 | PB5 | PB4 | PB3 |
| --- | --- | --- | --- | --- | --- |
| PB15 | SIDE1 | MENU | UP | DOWN | EXIT |
| PB14 | SIDE2 | 1 | 2 | 3 | * |
| PB13 | - | 4 | 5 | 6 | 0 |
| PB12 | - | 7 | 8 | 9 | F |

## Buses y perifericos

| Periferico | Bus | Notas |
| --- | --- | --- |
| BK4829 | 3 hilos bit-bang: CS PF9, SCK PB8, SDIO PB9 | Registro de 8 bits + valor de 16 bits. El driver usa la misma API que el BK4819 del V1 (`bk4819.h`) |
| Flash PY25Q16 | SPI2 + DMA1, CS PA3 | Sectores de 4 KB; se presenta como «EEPROM» mediante una tabla de traduccion |
| LCD ST7565 | SPI1, A0 PA6, CS PB2 | 8 paginas de 128 columnas, bit menos significativo arriba |
| BK1080 | I2C bit-bang PF5/PF6 | Solo con `ENABLE_FMRADIO` |
| Jack Kenwood | USART1 PA9/PA10 | 38400 8N1 |
| USB-C | USB FS PA11/PA12, CDC | Mismo protocolo que el jack |
| Voz y audio | DAC PA4, enable PA8 | Las apps de Labs usan PA4 como ADC para APRS/AFSK |

## Memoria interna

![Mapa de la flash interna: bootloader de 10 KB, aplicacion desde 0x08002800 hasta 118 KB](atlas/flash-interna-v3.svg)

- Bootloader `0x08000000-0x080027FF` (10 KB), nunca se sobrescribe por DFU.
- Aplicacion desde `0x08002800`, maximo `0x1D800` bytes (`Core/py32f071xb.ld`).
- Paginas de borrado de 256 bytes; SRAM de 16 KB.

## Flash externa de 2 MB

![Mapa de la flash externa con firmware de fabrica y con F4HWN multiboot](atlas/flash-externa-v3.svg)

| Rango | Contenido (F4HWN multiboot) |
| --- | --- |
| `0x000000-0x00BFFF` | Banco de configuracion 0: canales, nombres, VFO, ajustes |
| `0x010000-0x010FFF` | **Calibracion** (512 bytes utiles), propia de cada radio |
| `0x011000-0x011FFF` | Logo de arranque: cabecera de 8 bytes + mapa de bits de 1024 bytes (firma de fabrica `0x9ABC5A5A`) |
| `0x018000-0x01FFFF` | Registro RX/TX, 8 sectores |
| `0x020000 + n*0x20000` | Slots 0-4 de 128 KB: cabecera `FMB1` de 64 bytes (tamano, CRC-32, nombre, version) e imagen en +0x1000. Slot 0 = copia protegida del principal |
| `0x0C0000-0x0FFFFF` | Bancos de configuracion 1-4 (64 KB) |
| `0x100000` / `0x101000` | Estado multiboot redundante `FMP3` |
| `0x102000-` | Apps superpuestas `FAP1`, ranuras de 8 KB |
| `0x1DE000-0x1FFFFF` | Reserva de interoperabilidad con Sonic |

El firmware de fabrica guarda la voz en `0x100000-0x196FFF`, la misma zona que
usa F4HWN. Para volver a fabrica usa la restauracion guiada de
[UV Studio](https://armel.github.io/uvstudio/), que reconstruye esa zona sin
tocar la calibracion.

## Mapa EEPROM logico

`eeprom_compat.c` traduce direcciones de EEPROM de 16 bits a la flash SPI para
reutilizar el codigo V1 y los drivers CHIRP. Fuera de la tabla se lee `0xFF`.

| Direccion logica | Flash fisica | Contenido |
| --- | --- | --- |
| `0x0000-0x3FFF` | `0x000000` | Frecuencias de 1024 memorias x 16 bytes |
| `0x4000-0x7FFF` | `0x004000` | Nombres de 1024 memorias x 16 bytes |
| `0x8000-0x886D` | `0x008000` | Atributos y nombres de lista |
| `0x9000-0x90E8` | `0x009000` | 14 VFO y Fox Hunt/Beacon |
| `0xA000-0xA177` | `0x00A000` | Ajustes, FM, listas, AES, espectro, F4HWN, version |
| `0xB000-0xB1FF` | `0x010000` | Calibracion |
| `0xC000-0xCFFF` | `0x011000` | Logo de arranque |

Este es el mapa de F4HWN. Fabrica, Karina, IJV o Matoz usan otro: un driver
CHIRP solo sirve para el firmware para el que se escribio.

## Calibracion

- Cada radio trae su calibracion en `0x010000`. No es intercambiable: las
  «calibraciones de Karina» o de otra unidad se calcularon para otro equipo.
- Haz copia antes de flashear con UV Studio («dump calib») o con la lectura de
  esta web; [K5Tool-bin](https://github.com/Gulihg/K5Tool-bin) extrae los valores
  de un volcado. Ejemplos de 512 bytes en [k1-teardown/openocd](https://github.com/armel/k1-teardown/tree/main/openocd).
- Los comandos de F4HWN rechazan escribir ese sector.

## Protocolo serie de programacion

Igual por el jack Kenwood que por USB-C: 38400 baudios 8N1, heredado del V1.

![Trama: AB CD, longitud, tipo, tamano, datos, CRC16 y DC BA; bloque ofuscado con XOR](atlas/trama-serie.svg)

Clave de ofuscacion XOR (indice i mod 16): `16 6C 14 E6 2E 91 0D 40 21 35 D5 40 13 03 E9 80`.
CRC-16 XMODEM: polinomio `0x1021`, valor inicial 0, sobre tipo, tamano y datos
antes de ofuscar. Al responder, la radio rellena el CRC con `clave[n] ^ 0xFF`. Un lector robusto
exige cabecera, pie y longitud coherentes y solo registra los CRC que no cuadran.

| Peticion | Respuesta | Uso | Datos |
| --- | --- | --- | --- |
| `0x0514` | `0x0515` | Saludo e identificacion | u32 timestamp |
| `0x051B` | `0x051C` | Leer EEPROM | u16 offset, u8 size, u8 pad, u32 timestamp |
| `0x051D` | `0x051E` | Escribir EEPROM | u16 offset, u8 size, bool allowPassword, u32 timestamp, datos |
| `0x0527` | `0x0528` | RSSI | - |
| `0x0529` | - | Tension y corriente de bateria | - |
| `0x052F` | - | Variante de saludo | u32 timestamp |
| `0x05DD` | - | Reinicio | - |
| `0x0601` / `0x0602` | - | Registros BK4829 (solo `ENABLE_UART_RW_BK_REGS`) | registro, valor |

Extensiones F4HWN Fusion: `0x0720-0x0729` slots y bancos, `0x0730-0x0737` apps
superpuestas, `0x0738` lectura de flash fisica, `0x073A`/`0x073C` borrado y
programacion de sector (rechazan la calibracion), `0x073E` CRC-32 de un rango.
El slot 0 no se puede borrar ni sobrescribir. K5Viewer inyecta teclas con
`AA 55 03|04 <tecla>`; PTT esta bloqueado.

## Bootloader y flasheo

Con la radio apagada, mantener PTT y encender: LED encendido, pantalla apagada.
El bootloader de fabrica escucha por USB-C y jack con las mismas tramas.

![Secuencia DFU: aviso 0x0518, saludo 0x0530, paginas 0x0519 y confirmaciones 0x051A](atlas/secuencia-dfu.svg)

Bricohams Studio y UV Studio solo aceptan el bootloader `7.00.07` para UV-K5 V3
y `7.02.02`/`7.03.0x` para UV-K1, y validan los vectores del `.bin` antes de
abrir el puerto. Una imagen V1 «se graba» pero no arranca.

| Herramienta | Uso |
| --- | --- |
| [UV Studio](https://armel.github.io/uvstudio/) | Flasheo, multiboot, volcado de calibracion, restauracion de fabrica |
| [Bricohams Studio](https://brico-hams.github.io/Bricohams-Studio/) | Canales, ajustes, slots y firmware principal |
| [Multi-UVTools](https://spm81.github.io/Multi-UVTools/) | Flasheador web multimodelo |
| [Moto](https://github.com/muzkr/moto) | Bootloader UF2 alternativo: disco USB «MOTO» y arrastrar `.uf2`. Arriesgado, sin comandos serie |

Los `*.packed.bin` son para el actualizador oficial; los `.bin` planos, para
las herramientas abiertas.

## SWD y recuperacion

Si el bootloader esta danado, solo queda SWD (PA13 SWDIO, PA14 SWCLK) con un
ST-Link. El PY32 se trata como STM32F0 con otro ID de TAP:

```text
openocd -f interface/stlink.cfg -c "set CPUTAPID 0x0bc11477" -f target/stm32f0x.cfg -c "adapter speed 1000" -c "init; reset halt; dump_image K1_PY32F071.bin 0x08000000 0x00020000; shutdown"
```

No grabes una imagen completa de flash externa con un programador: borrarias la
calibracion. Las imagenes «Factory_Reconstructed» de k1-teardown son para la
restauracion guiada de UV Studio.

## Compilar firmware

Base recomendada: [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom),
que ya resuelve arranque PY32, HAL de Puya, flash SPI, BK4829, USB y protocolo.

```text
git clone --depth 1 https://github.com/armel/uv-k1-k5v3-firmware-custom
cd uv-k1-k5v3-firmware-custom
./compile-firmware.sh Fusion
./compile-firmware.sh Fusion -DENABLE_VOX=OFF
./compile-firmware.sh All
```

El contenedor usa ARM GNU Toolchain 13.3.rel1, CMake y Ninja. Presets: Custom,
Fusion, FieldOps, Transfer, Labs y Max. Salida en `build/<Preset>`.

| Ruta | Contenido |
| --- | --- |
| `App/driver/` | `bk4829.c`, `py25q16.c`, `st7565.c`, `keyboard.c`, `uart.c`, `vcp.c`, `eeprom_compat.c`, `mb_flash.c` |
| `App/app/` | `spectrum.c`, `scanner.c`, `menu.c`, `uart.c`, `fm.c`, `aircopy.c`, `foxhunt.c` |
| `Core/py32f071xb.ld` | Enlazado en `0x08002800`, 118 KB |
| `CMakePresets.json` | Banderas `ENABLE_*` por edicion |

La compilacion Bricohams reproducible esta en [Bricohams V3](BRICOHAMS-FIRMWARE.md)
y cada opcion en [opciones F4HWN](AYUDA-OPCIONES-F4HWN.md). Antes de flashear un
build propio comprueba los vectores y que no supere `0x1D800` bytes.

## Modificaciones de hardware

La [matriz de validacion integral](VALIDACION-INTEGRAL-V3-ANDROID.md) amplia
los criterios de compatibilidad, pruebas, limites y evidencia pendiente.
No hay certificacion general de mods V1 sobre V3. El
[diagrama Android/CAT/memorias](atlas/android-cat-validacion.svg) es funcional,
no un esquema electrico medido ni una guia de soldadura.

| Modificacion | V3/K1 | Notas |
| --- | --- | --- |
| Ampliar EEPROM (M24M02, 24C512) | No aplicable directamente | El V3 usa Flash SPI de 2 MB, no EEPROM I2C intercambiable. Referencia V1: [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki) |
| Receptor HF SI4732 (placas v5/v6.8) | No verificado en V3 | Las referencias aqui catalogadas son V1 (CEC HF, Reborn, losehu, Robzyl 512K); no demuestran soporte PY32 |
| Antena SMA (17 cm, 38 cm) | Accesorio condicional | Comprobar conector, esfuerzos mecanicos, banda y ROE; longitud o mejora RX no certifican TX |
| Mod de satelite (bobinas, LNA) | Sin confirmar | No se dispone de esquema ni medidas de una adaptacion a esta revision V3 |
| Filtro paso bajo TX | Revisar | [Nannk/quansheng-lpf-mod](https://codeberg.org/Nannk/quansheng-lpf-mod); verifica la placa medida |
| Mod de 27 MHz | Referencia V1, no validado V3 | [Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Hardware_Mods_27Mhz); requiere red RF y medidas propias, no extrapolar valores |
| Cable de programacion | USB-C directo | Tambien vale el cable Kenwood USB-serie (USART1) |
| Coprocesador o ESP32 | Disenados para V1 | [ESPRI](https://github.com/kamilsss655/ESPRI), [UVK5-Coprocessor](https://github.com/wabulutian/UVK5-Coprocessor), [UVE5](https://github.com/losehu/UVE5) |

Los firmwares que suben la salida por encima de 5 W pueden quemar el paso final.
Transmitir fuera de las bandas de tu licencia es ilegal aunque el firmware lo permita.

## Esquemas e imagenes

No se ha identificado en las fuentes de esta revision un esquema electrico
completo y verificado del V3/K1. Esto no demuestra que no exista otro.
Las referencias disponibles son:

- [Teardown K1 de armel](https://github.com/armel/k1-teardown) (Apache-2.0): fotos de alta resolucion, volcados, firmware anotado y datasheets.
- [Fotos de la placa UV-K1](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/UV%E2%80%90K1-PCB) en la wiki.
- [Esquema V1 por ingenieria inversa en KiCad](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/tree/main/hardware/KiCad/UVK5_reversing_06-02-2024): CPU, RX, TX, audio, cargador y BK1080. Hojas [RX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_RX), [TX](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki/Schematic_TX) y [BOM interactivo](https://htmlpreview.github.io/?https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/ibom.html). Sin licencia declarada: solo se enlaza.
- Datasheets: [BK4829](https://github.com/armel/k1-teardown/blob/main/datasheet/BK4829-BEKEN.pdf), [PY32F071](https://github.com/armel/k1-teardown/blob/main/datasheet/PY32F071_Datasheet_Rev0.7_EN.pdf), [PY25Q16HB](https://github.com/armel/k1-teardown/blob/main/datasheet/PY25Q16HB_Datasheet_V1.2.pdf), [BK1080](https://github.com/armel/k1-teardown/blob/main/datasheet/BK1080-BEKEN.pdf), [registros BK4819](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/blob/main/hardware/BK4819V3Registers_List_20201218.pdf).

Fotos del teardown del UV-K1 (misma placa que el K5 V3). Autor: F4HWN (armel),
[armel/k1-teardown](https://github.com/armel/k1-teardown), licencia Apache-2.0;
reducidas a 1600 px.

![Despiece completo: bateria, antena, mando, carcasa con altavoz, placa y chasis de aluminio](atlas/k1-view-a.jpg)

![Placa, cara de la pantalla: LCD, LED, SMA, potenciometro y conector del teclado; serigrafia K1-V5.0 ZG13](atlas/k1-view-b-recto.jpg)

![Placa, cara de RF y MCU: bobinas de filtros, jacks Kenwood, USB-C y MCU QFP48](atlas/k1-view-b-verso.jpg)

![Detalle de la flash SPI PUYA PY25Q16HB de 2 MB](atlas/k1-view-c-recto.jpg)

![Detalle del MCU PUYA PY32F071 en LQFP48 junto al USB-C y la bobina 4R7](atlas/k1-view-c-verso.jpg)

![Frontal desmontado: marco, teclado de goma y placa de contactos de la matriz 4x4](atlas/k1-view-d-front.jpg)

![Orden de montaje: marco frontal, chasis interior y placa principal](atlas/k1-view-e-front-back.jpg)

## Firmwares y repositorios para V3/K1

Verificados con la API de GitHub el 26-10-2026; «V3/K1» = el arbol contiene codigo PY32.

| Repositorio | Licencia | Ultimo push | Que es |
| --- | --- | --- | --- |
| [armel/uv-k1-k5v3-firmware-custom](https://github.com/armel/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-25 | F4HWN Fusion PY32, base de referencia |
| [Robby69400/Sonic](https://github.com/Robby69400/Sonic) | Apache-2.0 | 2026-10-25 | Sucesor de Robzyl, fork de F4HWN con multiboot |
| [Gogu-Qs/GOGUFW-UV-K1-Messenger](https://github.com/Gogu-Qs/GOGUFW-UV-K1-Messenger) | Apache-2.0 | 2026-10-24 | Mensajeria, ACK, alcance |
| [N7SIX/UV-K1Series_ApeX-Edition_v7.6.0](https://github.com/N7SIX/UV-K1Series_ApeX-Edition_v7.6.0) | Apache-2.0 | 2026-10-11 | Edicion ApeX |
| [reald/uv-k1-k5v3-firmware-custom](https://github.com/reald/uv-k1-k5v3-firmware-custom) | Apache-2.0 | 2026-10-19 | ARDF, ver [guia ARDF](AYUDA-ARDF.md) |
| [fagci/k1-fw](https://github.com/fagci/k1-fw) | Sin licencia | 2026-07-19 | Firmware de fagci para K1/K5 V3 |
| [muzkr/moto](https://github.com/muzkr/moto) | Apache-2.0 | 2025-12-31 | Bootloader UF2 |
| [armel/k1-teardown](https://github.com/armel/k1-teardown) | Apache-2.0 | 2026-09-28 | Fotos, volcados y datasheets |
| [EthanYan6/uv-k1-k5v3-firmware-custom-3ch](https://github.com/EthanYan6/uv-k1-k5v3-firmware-custom-3ch) | Apache-2.0 | 2026-08-10 | Escucha de 3 canales |
| [qbs524/uv-k1-k5v3-firmware-custom-main-chn](https://github.com/qbs524/uv-k1-k5v3-firmware-custom-main-chn) | Apache-2.0 | 2025-12-24 | F4HWN en chino |
| [qrp73/K5TOOL](https://github.com/qrp73/K5TOOL) | GPL-3.0 | 2025-12-18 | EEPROM y flasheo por linea de comandos |
| [knoinok/quansheng_toolkit](https://github.com/knoinok/quansheng_toolkit) | - | 2026-05-08 | Toolkit de escritorio K1/K5 V3 |
| [Dim0s/quansheng-UV-K5v3-K1-firmware-pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack) | - | 2026-10-25 | Recopilacion de binarios V3/K1, ver [pack Dim0s](AYUDA-PACK-DIM0S.md) |

Enlaces caidos y donde siguen:

- `Robby69400/Robzyl*`: borrados; copias en [K5Quan/Robzyl_K1_](https://github.com/K5Quan/Robzyl_K1_), [K5Quan/Robzyl_512K](https://github.com/K5Quan/Robzyl_512K) y [simoncottingham/Robzyl_K5](https://github.com/simoncottingham/Robzyl_K5); el autor sigue con Sonic.
- `joaquimorg/uv-k5` y `new_ui`: renombrados a [UV-KX](https://github.com/joaquimorg/UV-KX), [UV-KX-firmware](https://github.com/joaquimorg/UV-KX-firmware) y [uv-kx-tools](https://github.com/joaquimorg/uv-kx-tools) (V1).
- `armel/uvtools2`: ahora [Robby69400/uvtools2](https://github.com/Robby69400/uvtools2); la web sigue en <https://armel.github.io/uvtools2/>.
- `bg6ud/uv-k1-k5v3-firmware-custom`: borrado; ver forks de F4HWN V3.

En GitFlic, GitVerse, GitLab y Gitee no se encontro nada de Quansheng; la
comunidad rusa publica binarios en 4PDA y Telegram.

## Karina y codigo cerrado

Karina es de codigo cerrado (ver [Karina](KARINA.md)). Segun los grupos rusos
es la continuacion de [fagci-mod v1.2.1](https://github.com/fagci/uv-k5-firmware-fagci-mod)
(Apache-2.0, que permite derivados cerrados). Para replicar sus funciones de
forma limpia: describirlas desde el manual y el changelog, partir de F4HWN V3 y
del codigo de espectro de fagci-mod y [PUNKTRACKER 2.5](https://github.com/Alexuresp/PUNKTRACKER_2.5)
(Apache-2.0, V1). `fagci/s0v4`, `hawk5` y `k1-fw` no tienen licencia: se pueden
leer, no copiar. No decompilar el binario de Karina para reconstruir su fuente.

## Fuentes

- Codigo: [F4HWN V3](https://github.com/armel/uv-k1-k5v3-firmware-custom) (`App/board.c`, `App/driver/*`, `App/app/uart.c`, `mb_flash.h`, `eeprom_compat.c`), [moto](https://github.com/muzkr/moto), Bricohams Studio (`bkFlashMain`).
- Hardware: [k1-teardown](https://github.com/armel/k1-teardown), [Quansheng UV-K5 Wiki](https://github.com/ludwich66/Quansheng_UV-K5_Wiki/wiki).
- Comunidad: busquedas dirigidas en grupos de Telegram en espanol y ruso, sin autores ni datos personales; [pack Dim0s](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack).
- Referencias V1: [amnemonic](https://github.com/amnemonic/Quansheng_UV-K5_Firmware), [losehu](https://github.com/losehu/uv-k5-bootloader-custom/wiki), [wiki de egzumer](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
