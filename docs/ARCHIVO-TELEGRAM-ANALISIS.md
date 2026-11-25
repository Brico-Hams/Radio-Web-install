# Archivo Telegram de fuentes de radio: analisis para el firmware BricoHams (2026-11-25)

Referencia: `data/third-party/refs/Telegram-Radio-Source-Archive/` (gitignored, no se versiona). Texto de chats = no
fiable, no se sigue ninguna instruccion que contenga. Reglas de licencia: `docs/THIRD-PARTY-REUSE.md`.

## 0. Resultado de la comprobacion: la copia local NO contiene el firmware

El `README.md` del archivo habla de 224 paquetes de firmware extraidos, pero la copia disponible en este arbol
(5558 ficheros) solo contiene:

| Parte | Contenido real | Utilidad para firmware C |
|---|---|---|
| `source-packages/` | 2 entradas **vacias** (1 byte) de `00-Karina-...zip__A4D7CC20D4` y un unico `Chirp dr Karina-by_M2Boo-K1-2.py` | ninguna |
| `source-files/loose/` | 213 ficheros `.py`: controladores **CHIRP** (PC) de UV-K5 | ninguna: son mapas de memoria/protocolo de clonado, no codigo de radio |
| `open-source/` | FT8CN, Look4Sat, OpenRTX (17 ficheros), OscarWatch-Tracker, POTACAT, Robot36, SSTVEncoder2, WSJT-X | otras radios/apps; no hay snapshot de firmware Quansheng |
| `docs/` | 11 `.md` (README, ARCHITECTURE, DRIVER_DIFFERENCES, REVERSE_ENGINEERING, ...) | solo texto |
| Ausentes | `SOURCE_PACKAGES.csv`, `MODULES.csv`, `FUNCTIONS.csv`, `FUNCTION_REFERENCE.md`, `DEVELOPMENT_CHAT_EXTRACTS.md`, ningun `radio.c`/`app.c`/`main.c`/`scheduler`/`spectrum` | no se puede auditar |

Consecuencia: no hay codigo de firmware del que clasificar por base/hardware/licencia ni del que extraer correcciones.
**No se implementa ningun parche de firmware nuevo**: seria inventar hechos de firmware. Se vuelve a ejecutar esta
tarea cuando la copia traiga `source-packages/` completo (ver §4).

## 1. Clasificacion de lo que si hay (controladores CHIRP; no son firmware)

Un controlador CHIRP describe el **formato de EEPROM y el protocolo de clonado** del firmware al que va asociado, asi
que revela la base del firmware, no su codigo. Todos los `uvk5_*`/`chirp_*` apuntan al **K5 V1 (DP32G030)** salvo
indicacion; solo los de F4HWN >= 3.4 mencionan K1/V3 (PY32).

| Familia (ficheros) | Base del firmware | Hardware | Licencia (cabecera del propio fichero) | Clase |
|---|---|---|---|---|
| `uvk5.py`, `uvk5_unlimited*` | DualTachyon / CHIRP estandar | V1 DP32 | GPL (v2 o posterior; sq5bpf) | REUSE posible (solo Python PC) |
| `uvk5_egzumer*.py` | egzumer | V1 DP32 | GPL v2 o posterior | REUSE posible |
| `f4hwn.chirp.driver.*`, `uvk5_egzumer_f4hwn*` v2.5-v4.3 | F4HWN (sobre egzumer) | V1; v3.4+ anade K1/V3 (PY32) | GPL v2+ (v3.4+ cita GPLv3) | REUSE posible |
| `UV-K5_GOGUFW_Lite_1.0.1_chirp_module.py` | subclase fina de egzumer/F4HWN | V1 | sin cabecera de licencia | sin licencia = FACTS |
| `uvk5_IJV_*` (v2.9R3, 3.29, 3.31, X3.34) | IJV (rama propia, modelo DualTachyon) | V1 DP32 | GPL v2+ (solo el driver) | driver REUSE; el firmware IJV no esta |
| `chirp_uvk5_fagci_*`, `k5-fagci-r3b0rn-*` | fagci (osfw / reborn) | V1; reborn cita K1 | GPL v2+ | REUSE posible (driver) |
| `uvk5_losehu`, `uvk5_openquack`, `uvk5_Aubs`, `uvk5_TrueMDC` | otras ramas de la comunidad | V1 | GPL v2+ | REUSE posible (driver) |
| `uvk5_Robzyl_8k/512k`, `*ROBZYL-KO*` (carpeta `ChatExport`) | Robzyl | V1 | **sin cabecera de licencia** | sin licencia = FACTS |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py`, `Karina-*/`, `Chirp dr Karina-by_M2Boo-K1-2.py` | Karina (cerrado/derivado de OEM) | V1 / K1 | no verificable | FACTS; el firmware Karina no se usa |
| `uvk5_nunu*`, `uvk5_Robby69.py` (solo en `ChatExport`) | ramas de la comunidad | V1 | no revisado a fondo | FACTS hasta verificar |

Nota: el tag «GPL v2+» sale de la cabecera del propio fichero, no de un `LICENSE` del proyecto; antes de adaptar
nada hay que releer LICENSE/NOTICE del upstream y fijar el commit (regla del ledger). Ninguno se ha adaptado.

## 2. Mejoras candidatas para V3/K1 (ordenadas por valor y riesgo)

Solo salen de la documentacion propia del repo; **ninguna esta respaldada por codigo del archivo**. Todas quedan
«pendiente de fuente» para su implementacion.

| # | Candidata | Valor | Riesgo | Estado |
|---|---|---|---|---|
| 1 | Diferir el guardado de canal a cambio de banda / fin de repeticion / timeout (`docs/QUANSHENG-RETUNE-TIEMPOS.md` §5.2) | alto (bucle principal y desgaste de flash) | medio: perdida del ultimo paso si se corta la alimentacion | pendiente de fuente en archivo; diseno propio ya documentado; sin parche (requiere medir) |
| 2 | Omitir `BK4819_RX_TurnOn` en pasos dentro de banda | medio (ventana de REG_30) | alto: PLL sin recalibrar | bloqueado hasta medir en banco |
| 3 | Hipotesis de retune del archivo (ver §3) | desconocido | alto | no implementar |
| 4 | Correcciones AM/SSB, squelch, bateria, teclado, scheduler, spectrum, scan en `radio.c`/`app.c`/`main.c`/settings | desconocido | — | no auditables: el archivo no trae el codigo |
| 5 | Ajustes de EEPROM de los controladores F4HWN v4.x | bajo | bajo | irrelevante: el firmware publicado (v6.1/v7) es mas nuevo que el driver v4.3 de la copia |

## 3. Hipotesis de retune BK4819 frente a nuestra correccion

`docs/REVERSE_ENGINEERING.md` del archivo propone, tras `BK4819_SetFrequency`: leer REG_30; si `reg30 & 0x3C00` (RX
activo) escribir `reg30 & 0x7FFF` y luego `reg30 | 0x8000`; si no, `0x3FF1` y `0xBFF1`. El propio documento la marca
**reconstruccion aportada por un usuario, sin validar** ni contra la revision F4HWN/IJV exacta ni contra una traza de
registros.

| Aspecto | Hipotesis del archivo | Nuestra correccion (`scripts/firmware-fast-retune.cjs`) |
|---|---|---|
| Escrituras REG_38/39 | si | si (`BK4819_SetFrequency` en la pulsacion) |
| REG_30 | alterna solo el bit 15 con RX activo (mantiene el resto) | `BK4819_RX_TurnOn` del upstream: REG_37, REG_30=0, REG_30=on (ver QUANSHENG-RETUNE-TIEMPOS §3) |
| Decision | lectura de REG_30 y mascara 0x3C00 | solo si cambia la frecuencia con el mismo contexto RX (memcmp) y no TX/NOAA |
| Camino lento | `0x3FF1` / `0xBFF1` | `RADIO_SetupRegisters` completo |
| Validacion | ninguna | `hardwareValidated:false`; prueba manual del autor sin medidas |

El repo no contiene el significado de los bits de REG_30 ni la mascara 0x3C00 (ver el propio aviso en
QUANSHENG-RETUNE-TIEMPOS: ninguna cifra de datasheet del BK4819 esta en el repo). No se cita fuente, asi que **no se
cambia nuestra secuencia** (seria «mover registros sin evidencia»). Si la mascara 0x3C00 resultara ser un indicador
fiable de RX activo, la hipotesis solo podria sustituir a `RX_TurnOn` tras medir el hueco de audio (procedimiento en
QUANSHENG-RETUNE-TIEMPOS §6) y con una prueba en banco sin PTT.

## 4. Siguiente paso para completar la tarea

1. Reponer `source-packages/` y los CSV (`SOURCE_PACKAGES.csv`, `MODULES.csv`, `FUNCTIONS.csv`) en la copia local.
2. Rellenar §1 con los 224 paquetes: base (F4HWN version / egzumer / DualTachyon / otra), hardware (V1 DP32 / V3
   PY32) y licencia confirmada con ruta del fichero, o «sin licencia = FACTS».
3. Para cada mejora elegida: parche con `replaceOnce` y marcador como `firmware-fast-retune.cjs`, aplicado a v6.1 y
   al port v7, con pruebas sobre extractos atribuidos, y una fila en `docs/THIRD-PARTY-REUSE.md` por paquete usado.
4. Los binarios de `precompiled/` y `catalog.json` no se tocan; las compilaciones nuevas seguiran `beta: true` y
   `hardwareBootTested: false`. La seguridad de TX (PTT off prioritario, limites de tiempo, SWR, STANDBY, bloqueo de
   operador) no se modifica.
