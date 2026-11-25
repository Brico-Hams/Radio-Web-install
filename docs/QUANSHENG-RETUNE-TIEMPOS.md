# Quansheng UV-K5: tiempos de un paso de frecuencia (factory, F4HWN, BricoHams)

Estado: análisis de código, solo recomendaciones. No se tocó `scripts/firmware-fast-retune.cjs` ni ningún fichero de
compilación de firmware. No hay acceso a radio: todo lo que depende del hardware queda **pendiente de medir**.

## Fuentes y reglas

- Factory: reimplementación abierta (Apache-2.0, Dual Tachyon) del UV-K5 v2.1.27, en
  `data/third-party/refs/Quansheng-UV-K5/` (ruta abierta por nombre exacto; gitignored, no se versiona). Rutas
  abajo relativas a esa carpeta. No se usó ningún binario OEM ni `Quansheng-UV-K5-Research`.
- F4HWN v6.1.0 (`f556a96e`) y v7.0.0 (`f6f34cbc`), `armel/uv-k1-k5v3-firmware-custom`, rutas bajo `App/`.
  Solo hechos de protocolo/temporización, explicados con palabras propias; no se copia código.
- Nuestra corrección: `scripts/firmware-fast-retune.cjs`, `docs/BRICOHAMS-FIRMWARE.md` («Audio continuo al cambiar
  de frecuencia»).
- IJV: hechos de comportamiento en `docs/IJV-ANALISIS-RETUNE.md`. Ese fichero **no está en esta rama**; existe en
  el commit `ec9a300a`. Aquí solo se citan sus conclusiones de comportamiento. No hay en el repo ningún tiempo
  medido de IJV: **pendiente de fuente**. Las notas de EEPROM lenta de IJV (`docs/community-firmware/`) son
  informes de usuarios, no medidas.
- Ninguna cifra de datasheet del BK4819 está escrita en el repo ni en las fuentes revisadas (el único rastro es el
  comentario «default sql delays from datasheet» en `driver/bk4819.c` L331-332, sin unidad). No se inventa ninguna.

## Unidades de tiempo (medido del código)

| Primitiva | Definición | Coste mínimo |
|---|---|---|
| Escritura SPI BK4819 | `driver/bk4819.c` `BK4819_WriteRegister` L115-129 (4 × `SYSTICK_DelayUs(1)`) + `WriteU8` L131-149 (8 × 3 µs) + `WriteU16` L151-169 (16 × 3 µs) | **76 µs** |
| Lectura SPI BK4819 | `BK4819_ReadRegister` L94-113 + `ReadU16` L70-92 | **59 µs** |
| F4HWN escritura/lectura | `App/driver/bk4819.c` mismas esperas (Write L211-233, U8 L235-256, U16 L258-279) | 76 / 59 µs |
| Escritura EEPROM I2C (factory y F4HWN K5 V1/V2) | `driver/eeprom.c` `EEPROM_WriteBuffer` L39-54: lectura previa + I2C ≈ 0,3 ms + `SYSTEM_DelayMs(10)` (L53; F4HWN `SYSTEM_DelayMs(8)`, `App/driver/eeprom.c` L61) | ≈ 10,3 ms (factory) / ≈ 8,3 ms por bloque de 8 B; no escribe si el bloque es igual |
| Lectura EEPROM 8 B | `driver/i2c.c` + `eeprom.c` | ≈ 0,42 ms |
| Tick del planificador | `driver/systick.c` `SYSTICK_Init`, `scheduler.c` L44-77; F4HWN `SysTick_Config(SystemCoreClock/100)` | 10 ms por diseño (el reloj real: pendiente de medir) |
| Debounce de tecla | F4HWN `App/misc.c` L42-44: 20 ms debounce, 400 ms hasta repetición, 80 ms entre repeticiones | 20 ms hasta el primer paso |

Los retardos reales son ≥ los nominales (sobrecoste de bucle). Todas las cifras son cotas inferiores.

## 1. Factory (Dual Tachyon v2.1.27)

### Camino de la tecla UP/DOWN en modo VFO

| # | Paso | Fichero:función:línea | Escrituras/retardos | Tiempo |
|---|---|---|---|---|
| 1 | Debounce (contador == 2) | `app/app.c` `APP_CheckKeys` L791-863 (L835-844) | 20 ms de latencia hasta actuar | 20 ms (antes del corte) |
| 2 | `MAIN_Key_UP_DOWN`: pitido opcional, `APP_SetFrequencyByStep`, `gRequestSaveChannel = 1` | `app/main.c` `MAIN_Key_UP_DOWN` L359-422 (L384, L392-394); `app/app.c` `APP_SetFrequencyByStep` L379-391 | Solo aritmética. **No toca el BK4819** | ~0 |
| 3 | Pitido | `app/app.c` `APP_ProcessKey` L1536-1539; `audio.c` `AUDIO_PlayBeep` L81-83 | Con squelch abierto (`FUNCTION_RECEIVE`) sale sin pitido. Con squelch cerrado bloquea decenas de ms (L101-145) | 0 (squelch abierto) |
| 4 | Guardado inmediato (tecla no mantenida) | `APP_ProcessKey` L1577-1590 → `settings.c` `SETTINGS_SaveChannel` L185-239 | 2 × `EEPROM_WriteBuffer` (L212, L228) + `SETTINGS_UpdateChannel` L241-269 (lectura 8 B) | ≈ 21 ms bloqueantes. El altavoz sigue abierto y el BK4819 sigue en la frecuencia vieja |
| 5 | `RADIO_ConfigureChannel` | `radio.c` L132-366; `RADIO_ConfigureSquelchAndOutputPower` L368-415 | Lecturas EEPROM: 2 × 8 B + 6 × 1 B + 1 × 3 B | ≈ 2,0 ms |
| 6 | Corte de audio | `radio.c` `RADIO_SetupRegisters(true)` L478-619: `GPIO_ClearBit(AUDIO_PATH)` L485, `gEnableSpeaker = false` L486 | — | **empieza el silencio** |
| 7 | Reprogramación BK4819 | mismo, L486-619 | ≈ 38 escrituras + 4-5 lecturas: REG_33 (GPIO) ×7, filtro, PA, REG_3F ×2, REG_7D, `BK4819_SetFrequency` (REG_38/39), `SetupSquelch` L327-337 (5) + `SetAF` + `BK4819_RX_TurnOn` L346-375 (REG_37, REG_30=0, REG_30=on), REG_48, CTCSS, DisableScramble/Vox/DTMF. Cada IRQ pendiente (L500-507): +1 escritura + `SYSTEM_DelayMs(1)` | ≈ 2,9-3,3 ms (≈ 3,2 ms) |
| 8 | `FUNCTION_Init` limpia `g_SquelchLost` | `functions.c` L40-70 (L61); `FUNCTION_Select(FOREGROUND)` L72-189 no reabre audio | — | — |
| 9 | Espera del siguiente tick | `main.c` L140-150 (`gNextTimeslice` se limpia tras la rebanada: los ticks ocurridos durante los ≈ 25 ms bloqueantes se descartan) | hasta el siguiente 10 ms | 0-10 ms (media 5) |
| 10 | Redetección del squelch | `app/app.c` `APP_CheckRadioInterrupts` L503-582 (L563-570) llamado al inicio de `APP_TimeSlice10ms` L865+ (L881-883) → `APP_Update` L643+ → `APP_HandleFunction` L281-301 → `APP_CheckForIncoming` L66-103 → `APP_HandleIncoming` L105-148 | Necesita una nueva interrupción SQUELCH_LOST del BK4819 | **HW: pendiente de medir** |
| 11 | `APP_StartListening` | `app/app.c` L303-377: AUDIO_PATH L312, `gEnableSpeaker = true`, REG_48 L354, `SetAF(OPEN)` L363, `FUNCTION_Select(RECEIVE)` L366 | ≈ 3 escrituras | ≈ 0,25 ms |

Mantener la tecla (`bKeyHeld`): el guardado y el re-sintonizado se difieren hasta soltar (L1337-1347, L1577-1590).

### Interrupción de audio estimada (factory)

| Componente | Origen | Valor |
|---|---|---|
| `RADIO_SetupRegisters` (corte → fin) | medido del código | ≈ 3,2 ms |
| Espera de tick | medido del código (por diseño del tick) | 0-10 ms |
| `APP_StartListening` | medido del código | ≈ 0,25 ms |
| Retardo de apertura de squelch BK4819 (REG_4E), bloqueo de PLL/VCO, asentamiento de AGC | hardware | **pendiente de medir** |
| **Total de código** | | **≈ 3,5-13,5 ms + hardware (pendiente de medir)** |

Además: los ≈ 21 ms de EEPROM (+ 2 ms de lecturas) no cortan el audio, pero retrasan el re-sintonizado ≈ 23 ms,
durante los cuales se sigue oyendo la frecuencia vieja.

## 2. F4HWN v6.1.0 / v7.0.0 sin nuestra corrección

`app.c`, `bk4819.c`, `eeprom.c`, `systick.c`, `functions.c` y `audio.c` son idénticos en v6.1.0 y v7.0.0. Diferencias
relevantes de v7.0.0: `RADIO_SetModulation` añade una lectura y una escritura de REG_28 (compuerta RX, con
`ENABLE_FEAT_F4HWN_AUDIO`); `settings.c` refactoriza `SETTINGS_SaveChannel` pero sigue escribiendo 0x10 bytes con
`PY25Q16_WriteBuffer`.

| # | Paso | Fichero:función:línea (v6.1.0) | Escrituras/retardos | Tiempo |
|---|---|---|---|---|
| 1 | Debounce | `App/app/app.c` L1819 (`key_debounce_10ms` = 2 ticks, `App/misc.c` L44) | 20 ms de latencia | 20 ms (antes) |
| 2 | **Reprogramación inmediata sin silenciar** | `App/app/main.c` `MAIN_Key_UP_DOWN` L973-1072 (L1026-1038): `APP_SetFrequencyByStep`, `BK4819_SetFrequency` (2 escrituras) + `BK4819_RX_TurnOn` (3 escrituras: REG_37, REG_30=0, REG_30=on, con calibración de VCO si `ENABLE_VCO_CALIB`) L1034-1035, `gRequestSaveChannel = 1` | 5 escrituras | ≈ 0,38 ms de SPI. El audio sigue activo salvo la ventana REG_30=0 (HW: pendiente de medir) |
| 3 | Pitido | `App/audio.c` L64-65: con `FUNCTION_RECEIVE` sale sin pitido | — | 0 |
| 4 | Guardado al **soltar** la tecla (no durante una repetición) | `App/app/app.c` `ProcessKey` L2809-2823 → `App/settings.c` `SETTINGS_SaveChannel` L1236-1321 → `PY25Q16_WriteBuffer` | K1/K5 V3: flash SPI PY25Q16 (`App/driver/py25q16.c` L340-426). Si hay que pasar bits 0→1: `SectorErase` + `WaitWIP` (el comentario del código dice «~300ms», L396); si no, `PageProgram` + `WaitWIP`. `WaitWIP` sondea el registro de estado con `SYSTICK_DelayUs(10)` (L489-501) | Tiempo real: **pendiente de medir** (el código solo cita ~300 ms para el borrado; no hay otra cifra). Bloquea el bucle principal |
| 5 | `RADIO_ConfigureChannel` + `RADIO_SelectVfos` | `App/app/app.c` L2854 región | Lecturas de flash | pendiente de medir |
| 6 | Corte de audio | `App/radio.c` `RADIO_SetupRegisters(true)` v6.1 L792-971: `AUDIO_AudioPathOff` L803, `gEnableSpeaker = false` | — | empieza el silencio |
| 7 | Reprogramación completa | mismo L803-970: filtro, PA, bucle de IRQ (L832-840, `SYSTEM_DelayMs(1)` por IRQ), REG_3F, REG_7D, `SetFrequency`, `RADIO_SetModulation` L858, `SetupSquelch` L860 (`SetAF(MUTE)` + `RX_TurnOn` L810-812), `PickRXFilterPath` L865, RX_ENABLE, `SetRxAudioGain`, CTCSS, Scramble, Vox, `SetCompander`, `EnableDTMF`, `RADIO_SetupAGC`, REG_3F | Estimación ≈ 45-55 escrituras (no se contó cada llamada interna de `RADIO_SetupAGC`/`SetCompander`) | ≈ 3,4-4,2 ms (v7.0.0: +0,14 ms) |
| 8 | `FUNCTION_Init` | `App/functions.c` L54-89 | limpia `g_SquelchLost` | — |
| 9 | Tick + redetección de squelch + `APP_StartListening` | `App/app/app.c` `APP_TimeSlice10ms` L1866+, `CheckRadioInterrupts` L1894, bandera de squelch L1247-1255 | igual que factory | 0-10 ms + HW |

Interrupción estimada F4HWN sin corrección: **≈ 3,6-14,5 ms + HW (pendiente de medir)** por cada soltar de tecla
(al ser el guardado al soltar, un paso suelto y el final de una repetición cortan; durante la repetición, el
`RX_TurnOn` de cada paso aplica solo la ventana de REG_30).

## 3. Con nuestra corrección (`scripts/firmware-fast-retune.cjs`)

Efecto en el código (solo lectura, no modificado):

- `main.c`: tras `BK4819_RX_TurnOn()` fija `gBhRetuneFrequency = frequency`.
- `RADIO_SetupRegisters`: si se pasa a primer plano, no es TX, la frecuencia coincide con la reprogramada, no es
  NOAA y el contexto RX (modulación, ancho de banda, código, compander, 6 umbrales de squelch, puntero de VFO) no ha
  cambiado, ejecuta solo `BK4819_PickRXFilterPathBasedOnFrequency` (2 escrituras REG_33 ≈ 0,15 ms) y retorna.
  Se salta `AUDIO_AudioPathOff`, `SetAF(MUTE)`, la reinicialización de squelch, AGC y `FUNCTION_Select`.
- `app.c`: evita reentrar en `ACTION_Monitor()`.

| Paso | Sigue ejecutándose | Tiempo |
|---|---|---|
| `BK4819_SetFrequency` (REG_38/39) | sí, en la pulsación | 0,15 ms |
| `BK4819_RX_TurnOn` (REG_37, REG_30=0, REG_30=on) | **sí** | 0,23 ms SPI; ventana con RX/DAC de AF deshabilitado + recalibración VCO: **pendiente de medir** |
| `BK4819_PickRXFilterPathBasedOnFrequency` | sí | 0,15 ms |
| `SETTINGS_SaveChannel` (flash PY25Q16) | sí, al soltar | pendiente de medir; no corta audio pero bloquea el bucle principal |
| `RADIO_ConfigureChannel`/`SelectVfos` | sí, al soltar | pendiente de medir |
| Espera al tick del planificador | **no es necesaria para el audio**: no se silencia ni se re-detecta squelch | 0 |
| Lógica de squelch | no se reejecuta (se conserva `g_SquelchLost`) | 0 |

Interrupción: SPI ≈ 0,5-0,6 ms («medido del código»: 5 + 2 escrituras) + ventana REG_30 / PLL / AGC
(**pendiente de medir**). Nota: `hardwareValidated:false` en la información de compilación; `BRICOHAMS-FIRMWARE.md` indica
una prueba del autor (EA5KGV) el 17-11-2026, sin medidas.

## 4. ¿Se puede llegar a ≈ 3 ms?

- **Factory: no** con este código (≥ 3,5 ms hasta 13,5 ms solo de código, más hardware).
- **F4HWN sin corrección: no** (≥ 3,6-14,5 ms más hardware).
- **BricoHams (con corrección)**: el código ya está en ≈ 0,6 ms de SPI. Que el hueco sea ≈ 3 ms depende de
  lo que el repo no documenta: bloqueo de PLL/VCO tras REG_30 y asentamiento de AGC. Sin datasheet en el repo ni
  medida no se puede afirmar ni negar: **pendiente de medir**. Con las partes de código eliminadas, el objetivo
  de ≈ 3 ms es plausible solo para pasos de solo frecuencia, dentro de la misma banda y con el contexto RX sin cambios.

### Pasos a quitar, diferir o acortar (en orden de ahorro de audio)

| Paso | Acción | Ahorra (medido del código) | Riesgo |
|---|---|---|---|
| `RADIO_SetupRegisters` completo + `AudioPathOff` + `SetAF(MUTE)` | Quitar en paso de solo frecuencia (ya hecho por la corrección) | ≈ 3,2-4,2 ms | Contexto obsoleto si cambian modulación, ancho, tonos o squelch: la memcmp ya lo guarda; mantener ese control |
| Espera del siguiente tick + redetección de squelch | Quitar al no silenciar (ya hecho) | 0-10 ms (media 5) | Falsa apertura/cierre del squelch si el estado queda obsoleto tras el salto. No tocar REG_4E; reevaluar el squelch por RSSI en el tick normal |
| Guardado EEPROM/flash en cada paso | **Diferir** a cambio de banda, fin de repetición o timeout silencioso (estilo IJV: sin guardado dentro de la misma banda) | Factory ≈ 21 ms; F4HWN: pendiente de medir (hasta ~300 ms si borra sector, por el comentario del código) del retardo de re-sintonizado y de bucle principal | Pérdida del último paso si se corta la alimentación antes del guardado; desgaste menor al guardar menos. Guardar siempre en cambio de banda, menú, apagado y PTT |
| `BK4819_RX_TurnOn` (REG_37/REG_30=0/REG_30) | **Omitir en pasos de la misma banda** o sustituir por solo REG_38/39 | 0,23 ms de SPI y la ventana de REG_30 (HW: pendiente de medir) | Sin recalibración de VCO el PLL podría no engancharse en un salto grande: el repo no documenta si es necesaria por paso. El barrido upstream sí escribe REG_30=0 y lo restaura en cada paso (`App/app/spectrum.c` `SetFScan`; `App/app/chFrScanner.c`), así que solo con banco de pruebas |
| Lecturas de `ConfigureChannel` y refresco de pantalla | Diferir al soltar/timeout | ≈ 2 ms (factory) | Solo estético; sin riesgo de RF |
| Escrituras de GPIO de banda (REG_33) | Mantener solo el filtro si cambia de banda | 0,15 ms | Banda errónea si se cruza el límite VHF/UHF sin recalcular |

Seguridad de TX: ninguna recomendación toca PTT, límites de tiempo de TX/tune, SWR, heartbeat ni bloqueo de operador.
PTT apagado sigue teniendo prioridad; TX reinicia el estado rápido.

## 5. Recomendación

1. Mantener la ruta rápida actual (ya iguala lo observado en IJV según `docs/IJV-ANALISIS-RETUNE.md`).
2. Siguiente mejora: diferir el guardado a «cambio de banda o timeout silencioso», sin tocar el guardado al
   apagar. Es la mayor ganancia de latencia del bucle y de desgaste, pero **no corta audio**.
3. Evaluar la omisión de `RX_TurnOn` solo tras medir que el hueco restante lo causa REG_30=0 (procedimiento abajo).
4. No afirmar «≈ 3 ms» en documentación de producto hasta tener medidas del apartado 6.

## 6. Procedimiento de medida en radio real

Objetivo: duración del hueco de audio al pasar 1 kHz con squelch abierto. Solo en el banco del operador; este
repositorio no contiene herramientas que accedan a la radio.

1. Equipo: UV-K5 sobre carga ficticia o antena de banco, sin PTT. Generador de señal CW/FM en la frecuencia (nivel que
   abra el squelch con holgura), mismo nivel en todas las pruebas. Grabador de audio externo (≥ 48 kHz, 24 bit)
   conectado a la salida de altavoz con carga de 8 Ω o a la salida de auriculares; sin procesado en la entrada.
2. Preparar: VFO, paso 1 kHz, tono de banda estrecha continuo (p. ej. un tono de 1 kHz en la modulación) para ver el
   hueco como ausencia del tono; squelch abierto con nivel de apertura bajo; pitido de teclas desactivado.
3. Procedimiento: pulsar y soltar UP 20 veces separando ≥ 2 s; repetir con DOWN; repetir con la tecla mantenida 3 s
   (repetición cada 80 ms). Un segundo canal del grabador, si existe, captura el pulso de una línea de teclado o un
   marcador manual; si no, usar la grabación sola.
4. Medir: en el editor de audio, tiempo desde que la envolvente del tono cae por debajo de −20 dB respecto al nivel
   estable hasta que vuelve a −3 dB. Registrar mínimo, mediana y máximo por prueba, y la distancia entre la
   pulsación y el hueco (la pulsación puede preceder al hueco por el debounce de 20 ms y el guardado).
5. Comparar, con el mismo generador, antena, nivel y volumen:
   - Factory (Quansheng v2.1.27 original).
   - IJV (VS3.32 / N3.60: aplicar solo si el operador lo tiene instalado de forma legítima; cualquier dato de
     IJV de este repo es solo comportamental; no hay medidas: **pendiente de fuente**).
   - F4HWN v6.1.0 y v7.0.0 sin la corrección.
   - BricoHams con la corrección (`hardwareValidated:false` hasta tener estas medidas).
6. Variantes que aíslan causas: (a) squelch cerrado vs abierto (pitido y redetección); (b) paso dentro de la banda vs
   cruce de banda (VHF/UHF); (c) guardado: comparar el hueco al pulsar con el del soltar; (d) con y sin
   `ENABLE_VCO_CALIB` si se dispone de dos compilaciones.
7. Reportar en una tabla (firmware, repeticiones, hueco mín/mediana/máx en ms, versión, fecha, modo y nivel).
   Sustituir en las tablas de arriba cada «pendiente de medir» por el valor medido, con fecha y equipo.
8. Criterio de aceptación para «≈ 3 ms»: mediana ≤ 3 ms y máximo ≤ 5 ms en BricoHams con la banda sin cambio y
   sin falsas aperturas del squelch en 100 pasos.
