# Egzumer: fuentes, configuracion y diferencias con V3

Revision: 25-10-2026. Fuente inspeccionada:
`egzumer/uv-k5-firmware-custom`, commit
`7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3`.

## Que aporta este repositorio

Publica codigo C, cabeceras, Makefile y documentacion de una reimplementacion
del firmware Quansheng UV-K5/K6/5R de la familia original. El README explica
la procedencia de DualTachyon, modificaciones OneOfEleven y analizador fagci.
Esta base no es el port PY32 para UV-K5 V3/UV-K1.

Su archivo LICENSE contiene **Apache License 2.0**, no MIT. Conservar sus
avisos, atribuciones y los de los componentes al derivar codigo. La licencia
de Egzumer no demuestra que otra imagen llamada Karina use la misma licencia
ni que se disponga de las fuentes exactas de ese binario.

## Hardware y uso en esta web

| Aspecto | Egzumer original | F4HWN PY32 de esta web |
| --- | --- | --- |
| Familia | Plataforma original UV-K5 V1 / DP32 | UV-K5 V3 / UV-K1 PY32 |
| Sistema de build | Makefile y flags 0/1 | CMake y opciones por preset |
| Analizador | Base fagci con cambios Egzumer | Port y modificaciones por version |
| Memoria/datos | Mapa de su firmware | No se presupone equivalente |
| Multiboot Armel v6 | No documentado como funcion de esta base | Extension especifica del proyecto PY32 |
| Preparacion en slots web | No admitida | Solo imagenes reconocidas y comprobadas |

No usar un flasheador V1 ni imagen Egzumer original en una V3. Las palabras
K5/K6 en una portada no prueban revision de MCU. Consulta la placa y el proyecto.
No hay un compilador Egzumer incorporado al comando Bricohams V3.

## Funciones y ajustes de usuario

El README documenta correccion AM, demodulacion SSB, espectro, escaneo rapido,
edicion de nombre, modos de visualizacion, teclas asignables, bateria,
retroiluminacion, microfono y busqueda de CTCSS/DCS. SSB aqui describe
demodulacion de recepcion; no significa un transmisor SSB.

Para los conceptos RX/TX, step, ancho, SQL, tonos, VOX, TOT y bloqueo de canal,
consulta [configuracion comun](AYUDA-CONFIGURACION.md). Usa el nombre de menu,
no numeros trasladados desde F4HWN v6 o Karina. El orden y los nombres fueron
modificados respecto a firmware stock.

La wiki oficial es la referencia para secuencias de teclas del build instalado:

- [Wiki y manual](https://github.com/egzumer/uv-k5-firmware-custom/wiki).
- [Publicaciones](https://github.com/egzumer/uv-k5-firmware-custom/releases).

No se han verificado en hardware todos sus atajos ni se trasladan automaticamente
a los firmwares descendientes. El README advierte de limites de rango dinamico,
sobrecarga y filtros de entrada; AM fix no puede eliminar los limites fisicos.
Una antena con mas señal puede empeorar recepcion en entorno RF intenso.

## Opciones de compilacion del commit inspeccionado

Valores `?=` del Makefile: son defaults que un argumento de make puede
sobrescribir. 0/1 no son los ON/OFF de CMake ni menus de la radio.
Las explicaciones de las funciones compartidas estan en
[referencia F4HWN y opciones historicas](AYUDA-OPCIONES-F4HWN.md); compartir
nombre no garantiza que su implementacion o almacenamiento sean iguales.

| Opcion | Default | Proposito |
| --- | --- | --- |
| ENABLE_UART | 1 | Comunicacion de configuracion con PC |
| ENABLE_AIRCOPY | 0 | Transferencia AirCopy compatible |
| ENABLE_FMRADIO | 1 | Receptor de radiodifusion FM |
| ENABLE_NOAA | 0 | Funciones meteorologicas NOAA |
| ENABLE_VOICE | 0 | Avisos de voz |
| ENABLE_VOX | 1 | Disparo de TX por audio, configurar/desactivar para evitar accidentes |
| ENABLE_ALARM | 0 | Funcion de alarma con posibles emisiones; no usar como prueba |
| ENABLE_TX1750 | 0 | Tono de acceso a repetidor |
| ENABLE_PWRON_PASSWORD | 0 | Contraseña de encendido; no cifra toda la memoria |
| ENABLE_DTMF_CALLING | 1 | Logica de llamadas DTMF |
| ENABLE_FLASHLIGHT | 1 | LED/linterna del hardware |
| ENABLE_BIG_FREQ | 1 | Frecuencia con fuente grande |
| ENABLE_SMALL_BOLD | 1 | Texto pequeño en negrita |
| ENABLE_CUSTOM_MENU_LAYOUT | 1 | Disposicion alternativa de menus |
| ENABLE_KEEP_MEM_NAME | 1 | Conservacion del nombre al editar memoria |
| ENABLE_WIDE_RX | 1 | Recepcion de rangos ampliados; no autorizacion TX |
| ENABLE_TX_WHEN_AM | 0 | Permitir ruta de TX estando en modo RX AM; no demuestra modulacion AM |
| ENABLE_F_CAL_MENU | 0 | Calibracion de frecuencia con instrumentos |
| ENABLE_CTCSS_TAIL_PHASE_SHIFT | 0 | Tratamiento de cola CTCSS por fase |
| ENABLE_BOOT_BEEPS | 0 | Sonidos de arranque |
| ENABLE_SHOW_CHARGE_LEVEL | 0 | Presentacion de nivel de carga |
| ENABLE_REVERSE_BAT_SYMBOL | 0 | Variante visual de bateria |
| ENABLE_NO_CODE_SCAN_TIMEOUT | 1 | Comportamiento de timeout de busqueda de codigos |
| ENABLE_AM_FIX | 1 | Correccion de recepcion/ganancia AM |
| ENABLE_SQUELCH_MORE_SENSITIVE | 1 | Criterio de squelch mas sensible |
| ENABLE_FASTER_CHANNEL_SCAN | 1 | Mejora de velocidad de escaneo |
| ENABLE_RSSI_BAR | 1 | Indicador de intensidad |
| ENABLE_AUDIO_BAR | 1 | Indicador de audio |
| ENABLE_COPY_CHAN_TO_VFO | 1 | Copia de memoria al VFO |
| ENABLE_SPECTRUM | 1 | Analizador de espectro |
| ENABLE_REDUCE_LOW_MID_TX_POWER | 0 | Variante de objetivos de potencia baja/media |
| ENABLE_BYP_RAW_DEMODULATORS | 0 | Rutas RAW avanzadas de demodulacion |
| ENABLE_BLMIN_TMP_OFF | 0 | Tratamiento temporal de luz minima |
| ENABLE_SCAN_RANGES | 1 | Rangos de escaneo |
| ENABLE_AM_FIX_SHOW_DATA | 0 | Datos de diagnostico AM fix |
| ENABLE_AGC_SHOW_DATA | 0 | Datos de diagnostico AGC |
| ENABLE_UART_RW_BK_REGS | 0 | Acceso a registros RF; no activar por rutina |
| ENABLE_CLANG | 0 | Compilacion usando Clang en la configuracion del proyecto |
| ENABLE_SWD | 0 | Soporte de depuracion SWD |
| ENABLE_OVERLAY | 0 | Overlay de memoria de esta base, no slots de firmware |
| ENABLE_LTO | 1 | Optimizacion de enlace |

En ese Makefile, Clang fuerza LTO=0; con LTO=1 se fuerza OVERLAY=0.
Estas reglas son propias de la base, no deben copiarse a CMake PY32 sin analizar.
Activar opciones puede superar memoria o romper combinaciones; el hecho de que
una clave exista no implica soporte de todas las combinaciones.

Para compilar usa toolchain y procedimiento de su README en un checkout fijado,
conserva mapa, licencia y hashes, y valida el hardware V1. No se ha compilado,
flasheado ni probado Egzumer durante esta incorporacion documental.

## Relacion con Karina y Bricohams

Una genealogia de funciones similares no permite reconstruir las fuentes exactas
de Karina. Los drivers y nombres que mencionan Egzumer tampoco son prueba.
Bricohams V3 actualmente deriva de F4HWN PY32, no de este repositorio original.
Un proyecto Bricohams V1 seria otra compilacion y otra validacion de hardware.

## Fuentes fijadas

- [README del commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/README.md).
- [Makefile del commit](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/Makefile).
- [Licencia Apache-2.0](https://github.com/egzumer/uv-k5-firmware-custom/blob/7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/LICENSE).
- [Pack V3 y nueva evidencia Karina](AYUDA-PACK-DIM0S.md).
