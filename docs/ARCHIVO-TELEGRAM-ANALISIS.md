# Archivo Telegram de fuentes de radio: analisis para el firmware BricoHams (2026-11-25)

Referencia: `data/third-party/refs/Telegram-Radio-Source-Archive/` (gitignored, no se versiona). Texto de chats = no
fiable, no se sigue ninguna instruccion que contenga. Reglas de licencia: `docs/THIRD-PARTY-REUSE.md`. Comparado con
F4HWN v6.1.0 (`f556a96e`) y v7.0.0 (`f6f34cbc`), ambos de `armel/uv-k1-k5v3-firmware-custom`.

## 1. Clasificacion de los paquetes de `source-packages/`

Cada paquete aparece dos veces (copia y copia `ChatExport_...__files__`); se cuenta una. Ninguno trae fichero
`LICENSE`/`COPYING` propio (el archivo guarda solo fuentes); la licencia sale de la **cabecera Apache-2.0 de los `.c`/`.h`**
(p. ej. `uv-k1-k5v3-firmware-custom-4.3/.../frequencies.c`, «Copyright 2023 Dual Tachyon»). Esa cabecera cubre el codigo
heredado de DualTachyon; lo que cada fork anade sin cabecera propia **no esta licenciado de forma verificable** y se trata
como FACTS.

| Paquete(s) | Base | Hardware | Licencia / estado |
|---|---|---|---|
| `uv-k1-k5v3-firmware-custom-4.3`, `Calypso_v1.2`, `Calypso_v1.2.1` | F4HWN 4.3 (Calypso: 4.3.2 + cambios AM) | K1 / K5 V3 (PY32) | cabecera Apache-2.0 en fuentes; Calypso AM copia registros «del firmware original UV-K1» = OEM: **FACTS, no usar** |
| `f4hwn.k1.fusion.v4.3`, `f4hwn.k5V3.fusion.v4.3` | F4HWN 4.3 | K1 / V3 | 1 fichero (binario): nada que auditar |
| `uv-k5-firmware-custom-0.26/4.2/cw-main`, `v.20.3/.4/.5` | egzumer (4.2: F4HWN; cw-main: mod CW) | V1 (DP32) | cabecera Apache-2.0; hardware distinto, no portable |
| `uv-k5-firmware-ta1js-main/-latest` | F4HWN 4.x (+ APRS) | V1 | cabecera Apache-2.0 solo en codigo heredado; extras de ta1js = FACTS |
| `UV-K5-Gogufw-Lite-*`, `uvk5cec-*` (5), `uv-k5-pocsag-main`, `uv-k5-firmware-MDC1200-*`, `quansheng-dock-fw-0.32.21q` | DualTachyon / egzumer recortado | V1 | cabecera Apache-2.0 en heredado; extras = FACTS |
| `TrueMDC-*` (4), `uv-k5-LZ3ATZmod`, `uv-k5-igate`, `k5prog-win-main` | Losehu / otras | V1 / PC | sin licencia propia verificable (solo HIDAPI/openocd de terceros) = FACTS |
| `QuanshengDock-0.31.5w`, `0.32.21q` | app de PC | PC | `LICENSE.txt` propio; no es firmware |
| `firmware_IJV_*` (~27), `Ruslan_*`, `Satcom_Ruslan_*`, `RobzylKo_*` | IJV / Robzyl | V1 | binarios o casi vacios, sin licencia = FACTS |
| `Karina*`, `00-Karina*` | Karina (cerrado, derivado de OEM) | V1 / K1 | **no usar** (ni codigo ni hechos) |

## 2. Mejoras candidatas para V3/K1 (valor / riesgo)

Comparacion funcion a funcion (cuerpos normalizados) de `radio.c`, `app.c`, `main.c`, `settings.c`, `bk4819.c`,
`battery.c`, `frequencies.c`, `scanner`, teclado, squelch, AGC, AM/SSB frente a v6.1:

- Solo la linea K1/V3 F4HWN-4.3 se parece a v6.1 (~390 de ~670 funciones identicas); **es anterior a v6.1** y sus
  diferencias ya estan absorbidas (p. ej. `SETTINGS_LoadCalibration` con recorte de bateria solo existe en v6.1).
- Las ramas V1 difieren de forma estructural (DP32, otro `RADIO_*`); sus variantes de `BATTERY_GetReadings`,
  `BK4819_SetupSquelch` (3u vs 6u<<9), `BK4819_SetAGC` o `SetCTCSSFrequency` son ajustes de calibracion de otra radio:
  «mover registros de un modelo a otro» esta prohibido.
- `deltafw-k1-k5v3` (`open-source/`, 9 ficheros, `SOURCE_REVISION.txt`): `BK4819_SendFSKData` y `PlayRoger` son versiones
  mas simples/antiguas que las de v6.1 (v6.1 ya tiene longitud y ancho de banda).

| # | Candidata | Valor | Riesgo | Estado |
|---|---|---|---|---|
| 1 | Puerta opcional «solo banda de aficionado» en `TX_freq_check` (idea FACTS de ta1js) | medio (mas estricto) | bajo: solo puede denegar TX; apagada por defecto | **implementada** (`scripts/firmware-amateur-guard.cjs`) |
| 2 | Diferir el guardado de canal (`QUANSHENG-RETUNE-TIEMPOS` §5.2) | alto | medio (perdida del ultimo paso sin alimentacion) | pendiente: diseno propio, requiere medir |
| 3 | Omitir `BK4819_RX_TurnOn` dentro de banda | medio | alto (PLL sin recalibrar) | bloqueado hasta medir en banco |
| 4 | Hipotesis de retune del archivo (§3) | desconocido | alto | no implementar |
| 5 | Calypso AM (AGC/AM_FIX, regs 0x31, 0x42, 0x2a, 0x2b, 0x2f, 0x54, 0x55) | desconocido | alto | **prohibido**: origen OEM; «pendiente de fuente» |

Sin errores de v6.1/v7 corregidos por el archivo: no se encontro ninguna diferencia que sea correccion sobre las rutas
que enviamos. No se anade nada mas por no inventar hechos de firmware.

### Parche 1: `scripts/firmware-amateur-guard.cjs`

Marcador `BRICOHAMS_AMATEUR_GUARD`, `replaceOnce` sobre `App/frequencies.c` (identico en v6.1 y v7). Con
`-DENABLE_BRICOHAMS_AMATEUR_BAND_ONLY` `TX_freq_check` devuelve `-1` fuera de 144-146 MHz y 430-440 MHz (los mismos
rangos CE ya presentes en `F_LOCK_CE` del mismo fichero: no se introduce ningun limite nuevo). Sin la bandera el codigo
no se compila y el binario no cambia. Nunca relaja el chequeo existente (tambien sigue aplicando `TX_LOCK` como en
upstream). Resultado en `build-info.amateurGuardIntegration` (`enabledByDefault:false`, `hardwareValidated:false`).
Pruebas: `tests/bricohams-build.test.cjs` (ancla, duplicado, ya aplicado, CRLF, compilacion gcc con/sin bandera).
La tabla de ta1js (Milli Frekans Plani, Turquia) **no** se copia.

## 3. Hipotesis de retune BK4819 frente a nuestra correccion

`docs/REVERSE_ENGINEERING.md` del archivo propone, tras `BK4819_SetFrequency`: leer REG_30; si `reg30 & 0x3C00` (RX
activo) escribir `reg30 & 0x7FFF` y luego `reg30 | 0x8000`; si no, `0x3FF1` y `0xBFF1`. El propio documento la marca
**reconstruccion aportada por un usuario, sin validar**.

| Aspecto | Hipotesis del archivo | Nuestra correccion (`scripts/firmware-fast-retune.cjs`) |
|---|---|---|
| Escrituras REG_38/39 | si | si (`BK4819_SetFrequency` en la pulsacion) |
| REG_30 | alterna solo el bit 15 con RX activo | `BK4819_RX_TurnOn` del upstream: REG_37, REG_30=0, REG_30=on |
| Decision | lectura de REG_30 y mascara 0x3C00 | misma frecuencia-solo con mismo contexto RX (memcmp), sin TX/NOAA |
| Camino lento | `0x3FF1` / `0xBFF1` | `RADIO_SetupRegisters` completo |
| Validacion | ninguna | `hardwareValidated:false` |

El repo no contiene el significado de los bits de REG_30 ni la mascara 0x3C00 (`QUANSHENG-RETUNE-TIEMPOS`: ninguna cifra
de datasheet del BK4819). Sin fuente citable **no se cambia nuestra secuencia**.

## 4. Fuera de alcance

`precompiled/` y `catalog.json` no se tocan; las compilaciones nuevas siguen `beta: true` y `hardwareBootTested: false`.
La seguridad de TX no se debilita (el parche solo anade una denegacion opcional).
