# Rotor AZ/EL Bricohams: parche de firmware y versión de bajo coste

Este directorio une el rotor de
[Brico-Hams/antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
con la app Android (ver [docs/ROTOR.md](../../docs/ROTOR.md)). El parche vive aquí
porque el firmware del rotor está en otro repositorio.

## Parche `0001-bricohams-android-integration.patch`

Se aplica sobre la rama `main` de antenaSatCommrotor:

```sh
git clone https://github.com/Brico-Hams/antenaSatCommrotor
cd antenaSatCommrotor
git apply --check /ruta/a/RadioConfgWeb/hardware/rotor/firmware-patch/0001-bricohams-android-integration.patch
git apply /ruta/a/RadioConfgWeb/hardware/rotor/firmware-patch/0001-bricohams-android-integration.patch
cd firmware
pio run -e esp32          # montaje de referencia, sin cambios de movimiento
pio run -e esp32_nema17   # NEMA17 + TMC2209 a 1/8 de micropaso (más rápido)
pio test -e native        # si el repositorio tiene el entorno de pruebas nativo
```

Qué cambia:

1. **Hora desde el móvil** (`POST /api/time {"utcMs": ...}`, API 2). El rotor
   ya no necesita GNSS: la app envía la UTC del móvil. Requiere token, rechaza
   fechas fuera de 2024-2100, no acepta saltos de más de 2 s con el rotor en
   movimiento y cede ante un GNSS válido (409). La hora de la app caduca a los
   10 minutos; la app la reenvía cada 60 s. `/api/status` informa `timeSource`
   (`none`/`gnss`/`app`).
2. **Perfil de motor configurable** por `build_flags`: `ROTOR_MICROSTEPS`,
   `ROTOR_TRANSMISSION_RATIO`, `ROTOR_MAX_RATE_STEPS`,
   `ROTOR_ACCELERATION_STEPS`, con `static_assert` de rangos seguros. Los
   valores por defecto son idénticos al original (80000 micropasos/vuelta,
   2,25°/s), y las constantes de homing pasan a ser fracciones exactas de la
   vuelta (con `static_assert` de que coinciden con las originales).
3. `/api/status` publica `microsteps`, `transmissionRatio`, `stepsPerDegree` y
   `maxDegPerSecond`; la app los usa para avisar de pases demasiado rápidos.
4. `apiVersion` 2, firmware `0.3.0-prototype`; prueba nativa ampliada.

Validación hecha: el parche aplica limpio sobre `main`, y las cabeceras compilan
(`-fsyntax-only`) con el perfil por defecto y el NEMA17; un perfil inválido
falla en compilación como se espera. **Pendiente**: compilar `main.cpp` con
PlatformIO/ESP32 y probar en el rotor físico.

## Perfil `esp32_nema17`: más rápido con los motores que ya tienes

Con la misma reducción 25:1 y 1/8 de micropaso son 40000 micropasos por vuelta:

| | Referencia | `esp32_nema17` |
| --- | --- | --- |
| Micropasos | 16 | 8 |
| Micropasos/vuelta | 80000 | 40000 |
| Velocidad máx. | 500 µpasos/s = 2,25°/s | 660 µpasos/s ≈ 5,94°/s |
| Aceleración | 300 µpasos/s² | 450 µpasos/s² |
| Resolución | 0,0045° | 0,009° |

El motor gira a ~25 rpm, zona de par alto para un NEMA17, y la resolución sigue
siendo mucho más fina que el haz de una Yagi portátil. A 5,9°/s el rotor sigue
casi todos los pases de LEO salvo los muy cenitales (el firmware se para a 89°
de todos modos).

**Drivers TMC2209 en modo STEP/DIR** (sin UART): el firmware solo usa STEP, DIR
y ENABLE activo a nivel bajo, compatible con el TMC2209. Con MS1 = MS2 = LOW el
TMC2209 trabaja a 1/8 de micropaso, que es lo que espera este perfil. Ajusta la
corriente con el potenciómetro (Vref) al ~70 % de la corriente nominal del
motor y comprueba la polaridad de cada eje antes del primer homing.

Motores compatibles que ya tienes: 17HS3401 (más ligero, para EL o antenas
pequeñas) y 17HS8401 (más par, mejor para AZ). Usa el de más par en el eje que
cargue más.

## Abaratar la estación usando el ecosistema Bricohams

El presupuesto de referencia del repositorio del rotor (precios sin IVA) incluye
electrónica pensada para una estación autónoma: CM5 + placa IO (≈134 €), dos
LimeSDR Mini 2.0 (≈1071 €), tres TMC5160 (≈48 €), tres AS5600 (≈16 €),
magnetómetro + IMU (≈19 €) y GPS (≈26 €): **unos 1314 €** de electrónica.

Con el ecosistema Bricohams casi todo eso lo hace equipo que ya existe:

| Función | Montaje de referencia | Bricohams | Ahorro |
| --- | --- | --- | --- |
| Receptor / transceptor | 2× LimeSDR Mini 2.0 + CM5 | Quansheng UV-K5 con firmware Bricohams + CAT Doppler de la app | ≈1205 € |
| Hora UTC y ubicación | GPS | Móvil (`/api/time`, `/api/site`) | ≈26 € |
| Norte verdadero y nivel | Magnetómetro + IMU | Brújula, declinación WMM e inclinómetro del móvil | ≈19 € |
| Drivers | TMC5160 (SPI) | TMC2209 STEP/DIR (precio orientativo 3-6 €/ud.) | ≈35-40 € |
| Motores | NEMA17 nuevos | Los NEMA17 que ya tienes | su precio |
| Encoders | AS5600 | Opcionales (`Board::encoders`) | ≈16 € si se omiten |
| Control y seguimiento | CM5 + software | ESP32 del rotor + app Android | incluido arriba |

El rotor queda en **ESP32 + 2 TMC2209 + 2 NEMA17 + finales de carrera + fuente**,
y la parte de radio la pone la UV-K5 que ya usa el ecosistema. Los precios de
TMC2209 son orientativos; consulta tu proveedor. Sin AS5600 se pierde la
detección de pasos perdidos: compénsalo con homing antes de cada sesión y
velocidad/aceleración conservadoras.
