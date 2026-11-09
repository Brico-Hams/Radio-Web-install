# Revisión de karina-v3-k1 e integración en BricoHams (UV-5K V3)

## Revisión upstream registrada

| Campo | Valor |
|---|---|
| Repositorio | https://github.com/autumn1rain/karina-v3-k1 |
| Revisión (HEAD) | `0f5dbcba599b3598e6d415352ef9fd234d2d2a79` (último push 2026-11-04) |
| Licencia | Apache-2.0 |
| Releases | `v2026.11.02` (karina-v3/k1 `.bin` y `.packed.bin`, `calibration.bin`; «fix button lock fn1 fn2 by keyboard lock F») y `v2026.10.30` |
| Base declarada | fagci uv-k5 mod v1.2.1 |
| Contenido | Solo README (5 idiomas), manual PDF, LICENSE y sitio de documentación. **No hay código fuente de firmware.** |

## Método y licencias

Upstream no publica fuentes, así que no se copia ni se descompila ningún binario.
Las funciones portadas son una reimplementación independiente (clean-room) a partir del
comportamiento descrito en el manual público, sobre la base F4HWN ya fijada en BricoHams.
El código nuevo es GPL-3.0-or-later (BricoHams); los avisos Apache-2.0 de la base se conservan.
Se acredita a autumn1rain/karina-v3-k1 (Apache-2.0) como origen de las ideas funcionales.
Los firmwares siguen marcados `derivedFromKarina:false`.

## Inventario

| Función Karina | Estado en BricoHams | Motivo |
|---|---|---|
| Listas de scan, scan CTCSS/DCS | Existe | F4HWN `SCAN_SUBAUDIBLE`, listas de scan |
| Roger, scrambler, AFC, AM fix, LNA, rx_filt, STE | Existe | Presentes en la base |
| Bloqueo de teclado y FN1/FN2 laterales (fix v2026.11.02) | Existe | `set_lck` / `SET_LCK_ACTIONS` |
| Espectro con presets, blacklist, captura RX | Existe | Módulo spectrum |
| **Presets de banda integrados** | **Portado** (spectrum, tecla 2) | 11 ventanas RX dentro de 136–174 / 400–470 MHz |
| **Loot (lista de capturas)** | **Portado** (spectrum, teclas 1/7 en captura) | 32 entradas, sin edad; solo RX |
| Auto-beacons F+1/2/3, tabla DCS→dBm, PTT-Holder, randomizer | Incompatible | TX: choca con los límites RF; ARDF/Satellite/Spectrum desactivan el beacon |
| Tx3k, DEV, 03t, c0db, registros SCR, F_Corr/PWR | Incompatible | Escriben calibración o registros RF |
| Presets 0/1/2 de configuración, Sql2, mapa FN1/FN2 | Incompatible | Cambian el layout de memoria/configuración previa |
| Presets CB, 10 m, 7 m, 6 m, Air, Sat 240, Riv 300, LoRa, GSM, 23 cm | Incompatible | Fuera de la guarda RX del módulo |
| Pasos 25/100 kHz en espectro | Incompatible | El módulo admite 1,25/2,5/6,25/12,5 kHz y 128 bins |
| Turbo, ECO, Mult, squelch híbrido, volumen dinámico, modem, tono AM | No portado | Sin margen de flash/RAM (spectrum: 1364 B libres) o algoritmo no documentado |
| Builds Karina K1/V1, bootloader propio | Fuera de alcance | Distinto hardware/bootloader |

Las ventanas de banda usan 128 bins a 12,5 kHz (6,25 kHz en PMR), no los 80–160 pasos a
25 kHz de Karina.

## Pruebas

Software (ejecutadas): `bands_loot_test`, `spectrum_adapter_test` (ciclo de 11 bandas, límites RF,
loot con dedupe, scroll y blacklist), `presets_test`, `spectrum_test` con `-Wall -Wextra -Wconversion -Werror`;
`node --test tests/bricohams-build.test.cjs` (15/15); compilación ARM GCC 13.3.1 de la variante spectrum.

Build spectrum: imagen 119 468 B (slot 120 832 B, libres 1 364 B), RAM 13 600 B (libres 2 784 B).
Calibración, límites RF y vectores sin cambios; sin escrituras persistentes nuevas.

Pendiente en hardware (UV-5K V3): arranque, LCD/teclas, comportamiento de bandas y loot reales.
Las variantes fusion, labs, ardf y satellite no incluyen estas fuentes y no se han recompilado.

## Compilacion reproducible Spectrum (2026-11-04)

Dos compilaciones independientes con `--preset FieldOps --module spectrum --option ENABLE_FEAT_F4HWN_BEACON=OFF` (ARM GCC 13.3.1, base F4HWN v6.1.0 `f556a96`, fuentes Fusion61 locales no publicadas) dieron `bricohams.fieldops.spectrum.v6.1.0.bin` identico:
120 284 B (slot 120 832 B, 548 B libres), SHA-256 `CF5E8C52B9599D4CF68D1F003991D758A92B2FFD6BB4E30DFC090333261A8145`. Tambien coinciden el `.elf` y `build-info.json`.
11/11 pruebas host del firmware correctas. **El binario no esta en el catalogo firmado**: no hay prueba fisica en UV-5K V3 ni firma CI. Publicado el 2026-11-05 solo como pre-release sin firma (`fw-spectrum-presets-v6.1.0`).

Pasos pendientes en radio real (sin flashear a ciegas): 1) copia completa de la radio con el flujo F4HWN de Web Install y verificacion de su CRC; 2) cargar la imagen solo con bootloader/Multiboot que admita el slot y con cable de recuperacion; 3) comprobar arranque, LCD/teclas, tecla 2 (11 bandas, solo RX) y teclas 1/7 en captura (Loot); 4) restaurar la copia y confirmar identificacion F4HWN y respaldo automatico con una trama UART ruidosa.
