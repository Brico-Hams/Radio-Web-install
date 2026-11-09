# Quansheng UV-K10 Pro: viabilidad del firmware Bricohams (2026-11-08)

**Veredicto: no se generan imágenes.** El hardware interno del UV-K10 Pro no está publicado y lo que sí se conoce es incompatible con la base actual (F4HWN v6.1.0 para UV-K5 V3 / UV-K1). Producir binarios ahora sería adivinar pinout y mapa de memoria, con riesgo de brickear la radio o pisar su calibración.

## Qué es la radio («UV-10 Pro»)

El modelo que se vende como «UV-10 Pro con APRS y Si4732» es el **Quansheng UV-K10 Pro**, anunciado por Quansheng en octubre de 2026 y a la venta desde principios de noviembre de 2026. Tiene tres versiones, que coinciden con los tres sabores pedidos:

| Versión | Contenido |
|---|---|
| Basic | Funciones estándar, sin GPS/APRS ni Si4732 |
| GPS | Basic + GPS y APRS |
| Full | Basic + GPS/APRS + receptor Si4732 (0,153–18/30 MHz, conector de antena superior propio) |

Datos confirmados (ficha del fabricante resumida por Ham Imports y guía del distribuidor SHJ):

- TX 136–174 / 350–490 MHz, 10 W (alto/medio/bajo); RX 30–580 MHz en FM, AM, SSB y CW.
- **Pantalla LCD RGB a color de 1,44"** con imagen de arranque personalizable.
- **999 canales** con nombre.
- Programación por **Bluetooth** (app), por PC vía **USB-C** y desde el teclado.
- Batería 7,4 V 2500 mAh, 19 teclas frontales + 3 laterales + PTT, tecla APRS lateral.
- Las imágenes publicadas son de prototipo; los detalles pueden cambiar.

## Qué no se sabe (no publicado en ninguna fuente)

- MCU y su número de parte (no consta que sea el PY32F071 del UV-K1/K5 V3).
- Chip de RF (BK4819, BK4829 u otro).
- Tamaño y mapa de la flash interna, flash externa o EEPROM; dónde está la calibración.
- Controlador y resolución de la pantalla.
- Bootloader, protocolo de actualización y herramienta oficial; cadenas de versión del firmware de serie.
- Módulo GPS (modelo, UART, baudios) y cableado del Si4732 (bus I2C, pines, reset, conmutación de audio).
- Driver de CHIRP. No hay ningún firmware abierto para el UV-K10 en GitHub a fecha de hoy.

## Por qué la base actual no sirve tal cual

| Base Bricohams (F4HWN v6.1.0) | UV-K10 Pro |
|---|---|
| MCU PY32F071, imagen cargada en 0x00F000 con multiboot | MCU desconocido |
| Flash externa PY25Q16 para logo, ajustes y canales | Memoria desconocida |
| LCD monocromo 128×64 (framebuffer de 1 bit, `gFrameBuffer`) | LCD RGB de 1,44" (controlador y resolución desconocidos) |
| 200 canales en el mapa de memoria del K5 | 999 canales |
| 5 W, sin Bluetooth, GPS ni Si4732 | 10 W, Bluetooth, GPS y Si4732 opcionales |
| CHIRP F4HWN reconoce `F4HWN v6.x` | Protocolo de programación desconocido |

La pantalla a color basta para descartar la compatibilidad binaria: toda la interfaz de F4HWN dibuja sobre un framebuffer monocromo de 128×64. El salto a 999 canales indica, además, otro mapa de memoria.

## Qué haría falta para un port real

1. **Una unidad física** (mejor dos, una para abrir) de cada versión, o como mínimo la Full.
2. **Desmontaje y fotos de la placa:** MCU, chip de RF, flash/EEPROM, controlador de LCD, módulo GPS, Si4732 y módulo Bluetooth, con sus números de parte.
3. **Volcado completo** de flash y EEPROM por SWD o por el bootloader, con copia de la calibración antes de cualquier escritura. Si el MCU tiene protección de lectura, documentarlo y no forzarla.
4. **Ingeniería inversa del protocolo de actualización** desde la herramienta oficial de Quansheng (captura USB), para que el instalador web pueda flashear con seguridad.
5. **Capa de plataforma nueva** en `firmware/platform/`: arranque, GPIO, SPI/I2C/UART, driver del LCD a color, teclado de 22 teclas, control del PA de 10 W y del Bluetooth.
6. **Portar los módulos Bricohams** (`firmware/bricohams/`: CAT RX/TX 0x7B00/0x7B02, espectro 0x7B10, ARDF 0x7B20, pases 0x7B30, presets) sobre esa capa. Los módulos son casi todos lógica pura y son lo reutilizable.
7. **Sabores como presets de compilación:** `basic` (lo anterior), `gps` (+ beacon y decodificación APRS AX.25 1200 Bd con la posición del GPS) y `full` (+ Si4732 AM/FM/SW/SSB). Detectar en el arranque qué módulos están montados para que una imagen de un sabor superior no falle en una radio inferior.
8. **CHIRP:** driver nuevo para el mapa de 999 canales o, si se mantiene un modo compatible, conservar el saludo `F4HWN v6.x`.
9. **Validación en banco:** carga ficticia (nunca TX sin antena ni carga), medición de potencia y espurias, y prueba con las herramientas web y la app RadiCodex.

Sin los puntos 1 a 4 no se puede empezar a programar sin adivinar.

## Fuentes

- Ham Imports, ficha del Quansheng UV-K10 Pro: https://hamimports.com/radio/quansheng-uv-k10-pro/
- SHJ Communications, guía del UV-K10 Pro: https://tiengu.com/en/quansheng-uv-k10-pro-programming-charging-version-guide/
- Simon the Wizard, anuncio de las tres versiones: https://simonthewizard.com/2026/10/30/new-radio-quansheng-uvk-10-pro-walkie-talkie/
- Comunidad UV-K1 / UV-K10: https://uv-k1.com/
- Anuncio de Quansheng en X (no accesible sin cuenta): https://x.com/QuanshengRadios/status/2115745928871321861
- Página oficial de Quansheng (se carga vacía, sin especificaciones): https://qsfj.com/products/11145
- Base F4HWN para UV-K1 / UV-K5 V3: https://github.com/armel/uv-k1-k5v3-firmware-custom
