# Baofeng DM-32UV: firmware abierto, OpenGD77 y como construirlo

Revision: 26-10-2026. Resultado de buscar el codigo fuente y la forma de construir firmware
para el DM-32UV en GitHub, Codeberg, GitLab, GitFlic, la web de OpenGD77 y los grupos de
Telegram OpenGD77 EA, Baofeng DM-32UV EA, Baofeng DM-32UV RU y OpenGD77 Rus.
Nada de esta guia se ha probado en una radio de Bricohams: cada dato indica su fuente.

## Resumen

| Pregunta | Respuesta |
| --- | --- |
| ¿Hay codigo fuente del port de OpenGD77 al DM-32 (OpenDM32)? | **No.** Solo se distribuye en binario. Lo confirman los grupos y la web de OpenGD77 |
| ¿Se puede instalar OpenGD77 en el DM-32? | Si, en version experimental: CPS oficial (tipo «DM32/UV008») o [grid.radio](https://grid.radio/opengd77/). Los grupos dicen que no hay version estable |
| ¿Hay un firmware abierto que se pueda compilar? | **Si: [RadioFoundry](https://github.com/RadioFoundry/RadioFoundry)** (MIT). FM y DMR de voz en ambos sentidos, CTCSS/DCS, APRS, GPS y hotspot probados en el aire |
| ¿Licencia actual de OpenGD77? | Estilo BSD con prohibicion de uso comercial (no GPL) desde 2019. Solo el mirror antiguo [open-ham/OpenGD77](https://github.com/open-ham/OpenGD77) es GPL-2.0 |
| ¿Codec AMBE? | Propietario (DVSI). Ningun proyecto abierto lo distribuye: se extrae del firmware de fabrica del propio usuario |

## Hardware

| Bloque | Componente |
| --- | --- |
| SoC | Hongruan HR_C7000 (Dahua DH4570): nucleo C-SKY CK803S a 168 MHz, 288 KB de SRAM, modem DMR/FM integrado, sin flash interna |
| Transceptor RF | FD6818 (sin datasheet publico; registros compatibles en espiritu con BK4819/AT1846S) |
| Flash de programa | GD25Q80 / 25Q16 clase 1 MB, ejecucion en sitio en `0x03000000` |
| Flash de datos | GD25Q128 o Puya PY25Q128HA, 16 MB: codeplug, calibracion, contactos |
| Pantalla | 240x320 color, controlador clase ST7789 en bus i8080 de 8 bits |
| Otros | ALPU-MP (autenticacion por I2C), RDA5807M (FM comercial), GPS ATGM336H, RTC con pila |
| Programacion | Jack de 2 pines K1 con cable USB-serie a 115200 baudios. El USB-C esta en la bateria y solo carga |

Mapa de la flash de programa:

| Rango | Contenido |
| --- | --- |
| `0x03000000-0x0300BFFF` | Bootloader de Baofeng (modo actualizacion PTT+SK1). No se toca nunca |
| `0x0300C000-0x030E7FFF` | Aplicacion (880 KB en RadioFoundry) |
| `0x030E8000-0x030FFFFF` | Ranura del codec (RadioFoundry) |

En la flash de datos, por debajo de `0x700000` estan el codeplug de fabrica y la
**calibracion** (la pagina de 4 KB cuyo ultimo byte vale 2). No se escribe nunca.

Detalle completo, gran parte medido en una radio: [hardware-dm32.md de RadioFoundry](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/spec/hardware-dm32.md),
con reloj y PLL, perifericos, interrupciones, pinout, registros del FD6818, rutas de audio,
formato de calibracion y protocolos. Datasheets del HR_C7000 (documentos 1 y 2), foto anotada
de la placa y esquema del cargador en [yo3hjv/Baofeng-DM32](https://github.com/yo3hjv/Baofeng-DM32)
(sin licencia: solo se enlaza).

## Familias de firmware de fabrica

| Firmware | Familia | Nota |
| --- | --- | --- |
| `DM32.01.*` | ROW, la mas comun | Base de OpenDM32 y RadioFoundry (`DM32.01.01.049`) |
| `DM32.NRF.*` / Fanti | Taiwan, misma rama que `01.*` | |
| `DM32.00.*` / `UV32.*` | HR-Vocoder | RadioFoundry acepta su codec (`DM32.00.01.046HRVocoder`) |

Cruzar familias deja la radio en soft-brick: recuperar en modo actualizacion (PTT+SK1).
Archivo `BFUV32-V2`: cabecera de 256 bytes (`BFUV32-V2` ... `END`) y despues la imagen cruda
enlazada en `0x0300C000`. No va cifrado ni firmado.

## Paso 0: copia de seguridad

Antes de cualquier firmware, copia las **dos** flashes. Contienen la calibracion RX/TX y la
clave ALPU, unicas de cada radio:

- `OpenUV008_Flasher_v1` de andynvkz ([infotex58, tema 1155](http://infotex58.ru/forum/index.php?topic=1155.0)): radio apagada, Read, encender cuando lo pida. Repetir para la flash de programa y la de datos.
- Alternativa: los scripts Python de [rogerclarkmelbourne/DM32](https://github.com/rogerclarkmelbourne/DM32/tree/main/python).
- grid.radio tambien ofrece Backup/Restore de los dos chips desde el navegador.
- Si un cable falla, probar otro chip USB-serie (CH340, FTDI o CP2102). La ROM del HR_C7000 solo responde con FTDI segun RadioFoundry.

## Instalar OpenGD77 (experimental)

1. Hacer el paso 0 y guardar los archivos en lugar seguro.
2. Instalar la CPS de OpenGD77 `E2026.05.26.01` o posterior ([descargas experimentales](https://www.opengd77.com/downloads/PC_CPS/Experimental/)).
3. En Radio Type elegir **DM32/UV008** y abrir Extras > Firmware loader.
4. Radio apagada: mantener **PTT + SK1** y encender. El LED verde indica modo actualizacion. Conectar el cable.
5. Elegir el firmware (referencia: `OpenGD77_DM32_20260704.bin`) y esperar al final.
6. Escribir el codeplug por defecto.
7. Para volver a fabrica, repetir con el firmware de Baofeng desde su CPS en modo actualizacion.

Alternativa sin instalar nada: [grid.radio](https://grid.radio/opengd77/) con Chrome o Edge
(Web Serial, sin Zadig). Fuente del procedimiento: [guia de xreflector.es (PDF)](https://radio.xreflector.es/wp-content/uploads/2026/07/Install-OpenGD77-on-Baofeng-DM-32_EN.pdf).

Estado segun los grupos (agosto-octubre de 2026): ninguna version estable, audio DMR bajo y
fallos varios. Solo cubre la familia `01.*`. Autores: andynvkz (port UV008), Koshak y RA4FHE
(DM-32), Roger VK3KYY (CPS).

## Construir firmware: RadioFoundry

[RadioFoundry](https://github.com/RadioFoundry/RadioFoundry) es un firmware DMR nuevo y abierto
(MIT, creado el 24-10-2026), con un nucleo comun y una capa por radio. No deriva del codigo de
OpenGD77. Aun no publica releases: hay que compilarlo.

```text
git clone https://github.com/RadioFoundry/RadioFoundry
cd RadioFoundry
git submodule update --init
tools/build-csky-toolchain.sh            # GCC csky-elf en ~/toolchains/csky-elf (unos 45 min)
make BOARD=dm32                          # build/dm32/rfoundry_dm32.bin
tools/hrc7000_codec.py --stock DM32.01.01.049.bin   # tu firmware de fabrica: anade el codec en local
tools/serial_loader.py --model dm32 build/dm32/rfoundry_dm32_codec.bin --wrap build/dm32/rfoundry_dm32_codec_BFUV32.bin
```

| Paso | Detalle |
| --- | --- |
| Toolchain | `tools/build-csky-toolchain.sh` o la imagen Docker `tools/docker/csky-toolchain/run.sh make BOARD=dm32` |
| Codec | `tools/hrc7000_codec.py` comprueba el firmware de fabrica por SHA-256 y copia el codec en tu maquina. Nunca se sube al repositorio ni se comparte. Sin codec funciona solo FM |
| Flasheo | `tools/serial_loader.py` habla el protocolo del bootloader de Baofeng (YMODEM a 115200). `--wrap` crea el archivo `BFUV32-V2` para el actualizador oficial. `--stock ARCHIVO` vuelve a fabrica |
| Migrar el codeplug | `tools/dm32_migrate.py all --image ... --dry-run` primero. Usa `dmrconf` de qdmr 0.15 |
| Seguridad | RadioFoundry no toca el bootloader ni la flash de datos por debajo de `0x700000` |
| Estado | Las herramientas de flasheo y migracion estan sin probar en una radio segun su propia documentacion. Empezar con `--dry-run`, antena conectada y sin transmitir hasta verificar |

Lista de comprobacion de arranque: [dm32-bringup.md](https://github.com/RadioFoundry/RadioFoundry/blob/main/docs/testing/dm32-bringup.md).

## Protocolo del bootloader de Baofeng

Entrar con PTT + SK1 al encender (LED verde). Cable a 115200 8N1.

| Paso | Host | Radio |
| --- | --- | --- |
| 1 | `52` | `06` |
| 2 | `4D 00 00 00 01` | `4D 01 09` |
| 3 | `06` | `BFUV32-V2` |
| 4 | `45 00 00 00 00` | `06` |
| 5 | `31` | `43` |
| 6 | `01` | `43` |
| 7 | `00 FF` + bloque de 128 bytes (nombre, NUL, tamano en ASCII) + CRC-16/XMODEM. Borra la aplicacion (hasta 15 s) | `06 43` |
| 8 | Por cada KB: `02`, numero n, `FF-n`, 1024 bytes, CRC | `06` |
| 9 | `04` | reinicio |

El bootloader vive aparte y sobrevive a una escritura fallida: si la imagen no arranca,
quitar la bateria y volver a entrar en modo actualizacion.

## Otros recursos encontrados

| Recurso | Que aporta |
| --- | --- |
| [M7OCM/DM-32UV](https://github.com/M7OCM/DM-32UV) | Archivo de CPS y firmware oficiales; rama Mods con firmwares de fabrica parcheados (sin comprobacion ALPU, bandas ampliadas, correccion NMEA del GPS) y su script de parcheo |
| [Chicago-Offline/dm32-info](https://github.com/Chicago-Offline/dm32-info) | Especificaciones, versiones de firmware con SHA-256 y mapa de la comunidad |
| [gzalo/dm32-uv](https://github.com/gzalo/dm32-uv) (MIT) | Ingenieria inversa del bootloader y de la ROM |
| [infamy/DM32-Protocol-Spec](https://github.com/infamy/DM32-Protocol-Spec) | Protocolo de programacion de la CPS |
| [chaffed/CHiRP-DM32UV-Support](https://github.com/chaffed/CHiRP-DM32UV-Support), [fivelidz/dm32uv-linux](https://github.com/fivelidz/dm32uv-linux), [insideTheFlux/dm32uv-tools](https://github.com/insideTheFlux/dm32uv-tools) | Programacion del codeplug desde CHIRP, Linux y herramientas de mapeo |
| Drivers FD6818 abiertos | [bf-k61-firmware-aura](https://github.com/sophiel-meow/bf-k61-firmware-aura) (GPL-3.0, Rust) |
| [jasiek/baocoder](https://github.com/jasiek/baocoder) | Codec AMBE extraido del DM-32: propietario, **no usar** |
| [dongrat/HR_C70X0SDKlib](https://github.com/dongrat/HR_C70X0SDKlib) | Anunciado como SDK del HR_C7000, pero vacio el 26-10-2026 |
| GitFlic, GitLab, Codeberg | Nada sobre el DM-32 ni el HR_C7000 |

## Licencias y limites

- RadioFoundry es MIT; OpenGD77 actual prohibe el uso comercial; OpenDM32 no publica fuentes.
  No se mezcla codigo de licencias incompatibles ni se redistribuyen firmwares de terceros.
- El codec AMBE solo se usa extraido del firmware de fabrica de la propia radio.
- La calibracion y la clave ALPU son de cada radio: no copiarlas de otra unidad.
- Transmitir solo en bandas autorizadas, aunque un firmware modificado lo permita.

Bricohams mantiene ademas un dossier tecnico y un esqueleto de port para C-SKY en el
repositorio privado `dm32uv-opengd77-port`. La ruta recomendada hoy es compilar RadioFoundry.
