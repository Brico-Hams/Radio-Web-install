# Análisis IJV: cambio de frecuencia sin cortar el audio

Estado: análisis de comportamiento (FACTS). No se copia código, desensamblado, bytes ni tablas de IJV.

## Autorización

El propietario del proyecto indica (2026-11-25) que el autor del firmware IJV dio permiso expreso para analizar
los binarios con este fin. Documento escrito pendiente. La licencia de IJV (freeware) prohíbe por defecto
modificar y hacer ingeniería inversa; el alcance aquí es solo encontrar la diferencia de comportamiento.
Nuestra corrección es implementación propia sobre F4HWN. Fila en `docs/THIRD-PARTY-REUSE.md`.

## Método

1. Imagen `firmware.N3.60.bin` (UV-K5 V1, DP32G030 Cortex-M0, BK4819). Está ofuscada con una clave XOR de periodo 128.
   Se recuperó estadísticamente (máxima verosimilitud por posición) comparando con la distribución de bytes de un
   binario F4HWN Cortex-M0 en bruto. No se usó ninguna clave OEM.
2. La imagen lleva un sello de 16 bytes en 0x2000; quitándolo, las direcciones de ejecución coinciden (SP 0x20003ff0,
   reset 0x10b, flash en 0, SRAM en 0x20000000).
3. Desensamblado Thumb con `capstone` (venv fuera de git, en `data/third-party/`). Se identificaron: escritura SPI
   bit-bang del BK4819 (GPIOC: SCN/SCL/SDA), GPIO del amplificador de audio (PC4), escritura de REG_38/39
   (frecuencia), REG_30/37 (encendido RX), REG_47 (modo AF), REG_51.
4. Comparación con F4HWN v6.1.0 (f556a96e) y v7.0.0 (f6f34cbc), mismas rutas.

## Hechos observados (direcciones de ejecución IJV, solo para localizar)

- REG_38/39 solo se escriben en una función única (0x152e) que se llama desde: el barrido (0x16a0), la
  configuración completa (0x3368, en 0x3498), TX (0x3bb0) y un caso suelto (0xae1e).
- Paso de VFO (0x4bc8): fija y limita la frecuencia en la estructura del VFO. Si la banda (0x604) no cambia, **no**
  guarda en EEPROM ni mutea: solo marca una bandera de «actualizar» (RAM 0x2000005c+0x14). Si cambia de banda,
  guarda canal (con silenciado del altavoz solo durante la escritura) y recarga con 0x47d6.
- Guardado de canal (0x4aac): silencia el altavoz (PC4 off) **solo** si se le pasa la bandera; el paso de
  frecuencia no la pasa.
- Configuración completa (0x3368): el estado del altavoz se decide con `(arg3 ^ 1) & estado_actual`
  (RAM 0x20000233); con arg3 = 0 el altavoz **conserva** su estado actual; solo se apaga si el llamante lo pide.
  F4HWN, en cambio, lo apaga siempre.
- El barrido usa una ruta de solo sintonía (filtro por frecuencia, REG_38/39, REG_51, encendido RX) sin tocar PC4.

Limitación: no se localizó con certeza el consumidor de la bandera de «actualizar»; la inferencia de que la
reprogramación ocurre vía la configuración completa con arg3 = 0 es probable pero no verificada instrucción a
instrucción.

## Diferencia de comportamiento

IJV, en un paso de frecuencia dentro de la misma banda: (1) escribe REG_38/39 (y selecciona filtro de banda),
(2) no toca el GPIO del altavoz, (3) no escribe en EEPROM en ese momento. F4HWN v6.1/v7.0: tras
`BK4819_RX_TurnOn()` activa `gRequestSaveChannel` (`App/app/main.c`, `MAIN_Key_UP_DOWN`, líneas 1035-1036); el
guardado ejecuta `RADIO_SetupRegisters` (`App/app/app.c` líneas 660 y 1109/1542), que llama a
`AUDIO_AudioPathOff()` y `gEnableSpeaker = false` (`App/radio.c` `RADIO_SetupRegisters`, líneas 803-805), reprograma
el receptor y termina en `FUNCTION_Select(FUNCTION_FOREGROUND)` (línea 970). El silencio y el rebote vienen de ese
ciclo apagado/encendido, no de escribir la frecuencia.

## Recomendaciones para nuestra implementación

- Mantener: ruta rápida antes de `AUDIO_AudioPathOff()` que solo recalcula el filtro de banda
  (`BK4819_PickRXFilterPathBasedOnFrequency`) y deja intactos los registros AF y el GPIO del altavoz.
- Mantener: no pasar por `FUNCTION_Select(FOREGROUND)` y no repetir `ACTION_Monitor` si ya está en monitor.
- Mantener: TX reinicia el estado rápido; ningún cambio toca PTT, límites de tiempo ni seguridad de TX.
- Diferir: el guardado EEPROM en un paso de frecuencia (IJV no guarda hasta cambiar de banda/salir). Posible mejora
  futura (menos desgaste y menos tiempo bloqueado), no implementada aquí: exige tocar la lógica de guardado de F4HWN
  y no se puede validar sin radio.
- Opcional: evitar `BK4819_RX_TurnOn()` (REG_37/REG_30) en pasos rápidos. En IJV el barrido sí lo llama, así que no
  está probado que sea la causa del corte; no se cambia sin banco de pruebas.

## ¿La corrección actual coincide?

Sí en lo esencial: `scripts/firmware-fast-retune.cjs` ya evita el silenciado del altavoz, la reprogramación AF y el
`FUNCTION_Select` en pasos de solo frecuencia, que es la diferencia observada. Quedan sin igualar el guardado
diferido y la omisión de `RX_TurnOn`, ambos solo recomendados. No se modificó el script ni hay cambios en
`precompiled/`, `catalog.json`, firmas o claves.
