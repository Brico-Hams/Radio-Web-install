# Actualizaciones de firmware y candidatos (2026-11-24)

Estudio de solo lectura de los repositorios de referencia (`data/third-party/refs/`, ignorados por git) y de sus
repositorios oficiales. No se cambia el pin publicado, no se reconstruye ningun firmware publicado y no se publica
nada. Todo lo que no consta en un fichero o URL citado figura como "pendiente de fuente".

Reglas: solo se construye desde licencias redistribuibles (MIT, BSD, Apache-2.0, GPL con fuente ofrecida; BFPL solo
bajo sus terminos). PolyForm Noncommercial, repos sin licencia y material OEM/descompilado son **FACTS**: ni se
construye ni se redistribuye. Todo candidato es **Beta**, `hardwareBootTested: false` y con TX inhibido hasta
validar RF (`data/third-party/refs/_catalog/METODO_POR_RADIO.md`, `PRUEBAS_Y_LIBERACION.md`).

## 1. UV-K5 / UV-K1 (F4HWN, lo que publicamos)

Fuente: `precompiled/catalog.json` (9 entradas, v6.1.0, distribucion v0.6.0, `hardwareBootTested: true` en UV-K5 V3,
EA5KGV 2026-11-17), `scripts/build-bricohams.cjs` (`UPSTREAM`), `.github/workflows/bricohams-firmware.yml`.
Upstream: `armel/uv-k1-k5v3-firmware-custom`, licencia Apache-2.0 (API de GitHub; NOTICE acredita a DualTachyon y egzumer).

| Concepto | Valor |
|---|---|
| Version publicada | v6.1.0, commit `f556a96e73c3e423a00cf473aeb37f827cac05a5` (tag, 2026-10-07) |
| Upstream disponible | v6.2.0 (2026-10-15, `0ade03c0b1c94514566fadf7ce1c7a1f542a2283`), v6.3.0 (2026-10-22, `ca3a4271386049e7b459b215cef0ad0eea1a30ca`), v7.0.0 (2026-11-18, `f6f34cbc3e10dd688f8348cc7f4300a859064621`); `main` = `73fc66c7ba3ccd9a446afe3585b514c2066f5511`, 313 commits por delante del pin |
| Licencia | Apache-2.0 (upstream) + GPL-3.0-or-later (nuestro parche): "GPL-3.0-or-later AND Apache-2.0" como en el catalogo |
| Reconstruible | Si, ya lo es (workflow `bricohams-firmware.yml`, jobs por variante). No se toca en esta tarea |
| Riesgos | Ver tabla de cambios y de rebase |
| Prueba en radio antes de publicar | Arranque, TX de bajo nivel con carga artificial, persistencia de ajustes y del registro RX/TX, USB/UV Studio, cada modulo (ARDF, satelite, espectro) en UV-K5 V3 y UV-K1 |

### 1.1 Cambios upstream relevantes (notas de version de GitHub)

| Version | Que importa |
|---|---|
| v6.2.0 | Corrige el desbordamiento del temporizador de bloqueo automatico de teclado; corrige que la correccion del S-metro de las bandas 1 y 2 se reiniciara al guardar ajustes (y repara al arrancar valores ya corruptos); corrige direccion de navegacion del overlay; el registro RX/TX pasa de la flash externa `0x1E0000` a `0x018000` **sin migrar entradas antiguas** (cambia el mapa de flash externa; Labs admite 48 apps); arreglos APRS/SSTV |
| v6.3.0 | API de overlay v3 (captura de audio, temporizacion precisa, USB serie, ruta `tx_prepare` silenciosa, preparacion de TX mas segura); 10 apps Labs nuevas; aviso: la RF captada por el cable USB puede reiniciar la conexion USB |
| v7.0.0 | Fusion/Service sustituyen a las 4 ediciones (se retiran los presets Labs, FieldOps y Transfer); el `.bin` pasa a ser un paquete (firmware interno + pack de activos en flash externa atado por CRC e ID de build) que se instala en un segundo paso de UV Studio, y sin activos aparece texto en blanco; overlay API nivel 4; 49 apps; reanudacion de apps tras apagar |

### 1.2 Se puede rebasar nuestro conjunto de parches?

Comprobacion de **anclas** (no es una compilacion) ejecutando `scripts/build-bricohams.cjs`, `bricohams-modules.cjs`,
`firmware-backup-read.cjs` y `firmware-fast-retune.cjs` contra cada referencia:

| Referencia | Presets que usamos | Lectura de backup / retune rapido / bienvenida | Modulos ardf / satelite / espectro |
|---|---|---|---|
| v6.2.0 y v6.3.0 | Fusion, FieldOps, Labs, Transfer presentes | Anclas OK | Anclas OK |
| v7.0.0 y `main` | Solo `default`, `Custom`, `Fusion`, `Service` (FieldOps/Labs/Transfer retirados) | Anclas OK | Anclas OK con guarda `K5VIEWER` en `scheduler.c` (corregido en `bricohams-modules.cjs`); base Service + FOXHUNT; compilacion sin verificar |

Conclusiones:

- **v6.2.0 / v6.3.0: rebasables a nivel de parche**, con revision pendiente: compilar de verdad, comprobar las opciones
  efectivas de cada preset, revisar las constantes de `inspectMemoryUsage` y el supuesto de flash externa
  (`slotCapacityBytes 0x1d800`) frente al nuevo mapa, compatibilidad ABI de los `.app` y prueba en radio. v6.2.0 trae
  correcciones de S-metro y teclado que merecen la subida; el cambio de mapa del registro exige aviso a usuarios.
- **v7.0.0: portado (Beta, sin compilar)**: fast retune, backup, edicion y modulos con anclas; instalador y workflow `bricohams-v7` listos. Labs/FieldOps/Transfer se quedan en v6.1. Detalle y plan de prueba en `docs/BRICOHAMS-FIRMWARE.md` (seccion v7.0.0).
- No cambia `UPSTREAM` (v6.1.0), el workflow publicado ni el catalogo.

## 2. Radtel RT-950 Pro (AT32F403A)

| Concepto | Valor |
|---|---|
| Publicado | Nada (no hay firmware RT-950 en `precompiled/`) |
| Referencias | `Radtel-RT950-Hertzz` (GPL-3.0, `LICENSE`; upstream `Hertzz58/Radtel-RT950-Pro-Firmware`); `Radtel-RT950-Ferrite` (PolyForm Noncommercial 1.0.0, `LICENSE.md`); `Radtel-RT950-APRS-KISS`, `Radtel-Web-Flasher-nicsure` (sin licencia) |
| Upstream disponible | Hertzz: el pin del catalogo `6c4d419b71eba8e227d9c0de322a51bbb1b755fc` (2026-11-21, fusion del PR #7) **coincide con HEAD**; sin tags. Ferrite pin `b4d4979bff8fbfb75d9d5b4a669f6f8d6fe43959`; los demas, sin licencia |
| Construible | **Hertzz: si (candidato Beta, TX inhibido)**. Ferrite: no (PolyForm NC). APRS-KISS y Web-Flasher: no (sin licencia, solo FACTS) |
| Receta | Job `rt950-pro-hertzz` de `.github/workflows/firmware-candidates.yml`; local: `node scripts/build-candidate.cjs --id rt950-pro-hertzz --source <checkout al commit> --output <dir>` (receta en `firmware/candidates/candidates.json`) |
| Riesgos | El README upstream declara el proyecto muy WIP: LCD, LEDs, teclado, encoder y flash SPI confirmados; TX, BK4829 RF, SI4732 y GPS solo parcialmente probados. El arbol upstream contiene binarios OEM (`binary/`, `.BTF`, `bootloader`) y desensamblado (`assembly/`): la receta usa sparse-checkout sin `binary/`, `assembly/` ni `tools/` y el script aborta si aparecen. El objetivo `btf` del Makefile cifra con claves OEM: **no se construye ni se distribuye `.BTF`**, solo `.bin/.hex`. El bootloader OEM solo comprueba el vector en `0x08003000` (README upstream), pero la via de instalacion es **pendiente de fuente** |
| TX | Inhibido por parche (`firmware/candidates/rt950-hertzz-tx-inhibit.patch`): `radio_ptt_on()` de `src/app/radio.c` es el unico punto de entrada de TX (lo llaman aprs, crossband, vox y radio) y vuelve sin emitir; el parche se verifica con `git apply --check` contra el commit fijado. No se toca el firmware que lleva calibracion ni pines de otro modelo |
| Prueba en radio antes de publicar | Arranque y rollback via bootloader OEM, lectura de calibracion intacta, RX en cada banda, luego (fuera de esta tarea) validacion RF con carga artificial, TOT, SWR y PTT-off antes de quitar el inhibidor; requiere decidir y documentar el metodo de instalacion |

Toolchain fijada: ARM GNU 13.3.rel1 (SHA-256 `95c011cee430e64dd6087c75c800f04b9c49832cc1000127a92a97f9c8d83af4`, la
misma que `bricohams-firmware.yml`). El README de Hertzz pide GCC 12 o superior y el Makefile compila con
`-Wall -Wextra -Wshadow -Werror`. **La compilacion no se ha ejecutado en esta maquina** (no hay `arm-none-eabi-gcc`): la
primera ejecucion del workflow es la verificacion de que 13.3 acepta `-Werror`.

## 3. Quansheng UV-K5 V1 / Baofeng UV-K6

| Referencia | Licencia (fichero) | Construible | Motivo |
|---|---|---|---|
| `Quansheng-UV-K5` | Apache-2.0 en cabeceras (Copyright 2023 Dual Tachyon) | No | Es una reimplementacion/preservacion del firmware OEM v2.1.27 sin personalizacion, para UV-K5 V1 (DP32G030), no el hardware que publicamos (PY32F071); el pin del catalogo esta truncado. Una base F4HWN para V1 (`armel/uv-k5-firmware-custom`) no esta en las referencias: pendiente de fuente |
| `Quansheng-UV-K5-Research` | Sin licencia en la raiz; contiene colecciones de firmware OEM | No | Solo FACTS |
| `Baofeng-UV-K6` | BFPL-1.0 (`LICENSE`): derivados solo para uso personal no comercial, mantener acuerdo y copyright, prohibido vender/transferir/licenciar | No | No se puede redistribuir bajo este proyecto GPL; `platform.json` dice Apache-2.0 pero contradice README/LICENSE (se aplica la mas restrictiva); la compilacion necesita PlatformIO y paquetes externos que no estan en las referencias (pin pendiente de fuente) |

Prueba en radio: no aplica (sin candidato). Si algun dia se permitiera, haria falta arranque, TX con carga y recuperacion.

## 4. Radios DMR: OpenGD77, OpenRTX, md380tools, RadioFoundry

| Referencia | Licencia (fichero) | Upstream | Construible | Motivo / receta |
|---|---|---|---|---|
| `OpenGD77-preserved` (GD-77, GD-77S, DM-1801, RD-5R) | `LICENCE`: texto GPL-2.0; no confirmado "or-later" | Repo "preservado", los autores dejaron de publicar en GitHub: pendiente de fuente | **No** | El README indica que el firmware incluye codigo binario del firmware oficial Radioddity (secciones del codec de OEM v3.1.1, que BUILD.md dice que no se pueden incluir por licencia) y la compilacion exige NXP MCUXpresso con SDK bajo EULA. Solo FACTS |
| `OpenRTX` | `REUSE.toml`: GPL-3.0-or-later con partes Miosix GPL-2.0-or-later, BSD, MIT, Apache, ST Liberty y WTFPL (API de GitHub: licencia nula) | Pin del catalogo (truncado `ada9ba9…`) resuelto a `ada9ba9682df7686259c8ff6e3eee971728fa218` (2026-11-21); ultima etiqueta v0.4.5 `34052ea7119339641ce64429cc3cf2626302a12a` | **Diferido, sin receta** | Legalmente posible por fichero, pero no se puede fijar una receta reproducible: el snapshot local no trae `meson.build`, wraps ni Dockerfile; el Dockerfile upstream compila el compilador (gcc 9.2.0, ~30 min), usa `radio_tool` por tag (v0.3.0) y **clona `open-ham/OpenGD77` sin fijar**; los destinos (CS7000, DM-1701, GDx, MD-3x0/UV3x0, MD-9600, Module17, RT-4D, ttwrplus…) no son hardware que publiquemos. Revisar cuando haya Dockerfile fijado por digest y destino prioritario |
| `md380tools` | Licencia no verificada en las referencias; pin truncado (`1efea42c…`) | pendiente de fuente | **No** | Parchea el firmware OEM de TYT (requiere imagenes de serie): solo FACTS |
| `RadioFoundry` | MIT (`LICENSE`, Copyright 2026 The RadioFoundry Authors; `REUSE.toml`, `LICENSES/`) | `radiofoundry/radiofoundry`; el pin truncado `57ded099…` se resuelve a `57ded099a2cedf128b22b5cd8bff91b96d15722c` (2026-11-23), 15 commits por detras de `main` (2026-11-24); sin tags | **Diferido, sin receta** | Legalmente si (MIT). Placas: db25d, dm1701, dm1801pro, dm32 (Baofeng DM-32UV), md380, md9600, mduv380, rt10, uv380_family. stm32f4 usa ARM GCC 13.3.rel1 (SHA-256 identico al nuestro, `platform/stm32f4/platform.toml`), pero ninguna placa stm32f4 es hardware que publiquemos. dm32 (hrc7000) necesita `csky-elf-gcc` 14.2.0 solo via imagen `ghcr.io/radiofoundry/rfoundry-csky-gcc14:20261011b` (referencia por etiqueta, no por digest) o compilar el toolchain (~45 min), mas submodulos (FreeRTOS, TinyUSB, HAL de ST) sin fijar en el snapshot. Ademas falta un inhibidor de TX verificado (existe `tx_inhibit` como ajuste de usuario y `board_can_tx()`, pero no se ha validado un parche que lo fuerce). La imagen base es solo FM; el codec AMBE+2 sale del firmware de serie del usuario y **nunca** debe incluirse en artefactos |
| `RadioFoundry-SoapyLR20xx` | MIT con avisos BSD de Semtech | — | No | Snapshot incompleto (enlaces simbolicos ausentes) y hardware (SDR LR20xx) fuera del proyecto; requiere ESP-IDF |

Pruebas en radio si algun dia se activa un candidato DMR: arranque y recuperacion por el cargador, calibracion de fabrica
intacta (la flash del dm32 la protege el cargador serie, segun `RadioFoundry`), RX FM/DMR, y TX solo tras validacion RF.
La receta del DM-32UV queda **pendiente de fuente** (digest de la imagen csky y SHA de los submodulos).

## 5. Candidatos y como reproducirlos

| Candidato | Job | Estado | TX | Artefactos |
|---|---|---|---|---|
| `rt950-pro-hertzz` | `rt950-pro-hertzz` en `firmware-candidates.yml` (solo `workflow_dispatch`) | Beta, `hardwareBootTested: false` | Inhibido por parche | `bricohams-candidate.rt950-pro-hertzz.{bin,hex}`, `build-info.json`, `SHA256SUMS` |

| `scout-ardf` | `scout-ardf` en `firmware-candidates.yml` | Beta, `hardwareBootTested: false` | Inhibido por transformacion de fuente | `bricohams.scout-ardf.v1.3.bin`, `LICENSE`, `NOTICE`, `ATTRIBUTION.txt`, `build-info.json`, `SHA256SUMS` |
| `mili-admin-user` | `mili-admin-user` en `firmware-candidates.yml` | Beta, `hardwareBootTested: false` | Solo RX (preset `AdminUser-SAM-RXOnly`, `ENABLE_PREVENT_TX` verificado) | `bricohams.mili-admin-user.v0.4.3.bin`, licencias, `ATTRIBUTION.txt`, `build-info.json`, `SHA256SUMS` |

### 5.2 reald ARDF v0.6 (2026-11-26)

El catalogo ya identifica `ARDF-K5v3_K1-v0.6` (assets `UV_K5v3_K1_ARDF.bin`, `chirp_module_ARDF.py`) como `reald / ARDF`:
solo descarga verificada, nunca imagen de slot (test en `tests/firmware.test.cjs`). No se anade candidato compilado en
`firmware-candidates.yml`: el binario oficial sirve para comparar en banco, y reconstruirlo exigiria transformaciones de
bienvenida/TX sobre una base F4HWN 5.2.0 sin toolchain ARM para validarlas. Del v0.6 se porto a nuestro modulo `ardf` el modelo de
correccion de reloj K1/K2 (ver `docs/BRICOHAMS-FIRMWARE.md`, Apache-2.0 en `docs/THIRD-PARTY-REUSE.md`); K2 con temperatura queda
pendiente de fuente en v6.1/v7. El snapshot `data/firmware-catalog-fallback.json` (2026-11-09) es anterior a v0.6 y se regenera con red.

### 5.1 Scout ARDF v1.3 y Admin/User "MILI" (2026-11-26)

Se construyen con `scripts/build-upstream-ardf.cjs` desde commits fijados (Scout `52c12b6b7fd8`, release v1.3;
MILI `dc8c1767b1e1`, release v0.4.3-rxonly-experimental), ambos Apache-2.0 con su `LICENSE` (Scout ademas `NOTICE`).

| Aspecto | Scout ARDF | MILI Admin/User |
|---|---|---|
| Base | Nucleo propio (`core/` + `platform/uv-k5-v3-py32f071`), no F4HWN; el NOTICE acredita a Dual Tachyon, egzumer/reald, armel y Arm CMSIS | Firmware propio con `firmware-v3/App` y presets CMake |
| Hardware | UV-K5 V3 y UV-K1 (PY32F071) | UV-K5 V3 y UV-K1 |
| Compilacion | `make` con `arm-none-eabi-gcc` (`-Werror`) | CMake + Ninja, preset `AdminUser-SAM-RXOnly` |
| TX | El upstream permite TX tras un PIN fijo; el candidato lo anula (`s_unlocked = false`) | Solo RX segun el preset; el constructor lo comprueba y rechaza cualquier otro preset |
| Multiboot | Misma geometria de slot (FLASH 0x08002800, 118K); el retorno al selector F4HWN **no esta verificado** | Imagen para slot igual; retorno al selector **no verificado** |

Decision: **no se fusionan** con nuestro modulo `ardf` (F4HWN): no comparten codigo ni arbol de fuentes, asi que portar piezas
(barra S cruda, tiempos de lectura, menu de retroiluminacion) seria reescribir sobre otra base; nuestro foxhunt ya tiene S-meter
suavizado y retroiluminacion propia. Cada uno es un candidato independiente en slot multiboot. La imagen lleva el marcador
`BHFW1:<id>:<version>` que el instalador web reconoce (`inspectSlotImage`), con respaldo verificado y confirmacion como cualquier slot.
Pantalla de arranque: solo logo/edicion Bricohams (transformacion de `welcome.c`, sin parche binario); la atribucion Apache-2.0 se
cumple conservando LICENSE/NOTICE y `ATTRIBUTION.txt`, no con el logo. Estado: BETA hasta una prueba real de arranque por el mantenedor.
La compilacion real solo corre en CI (aqui no hay toolchain ARM): los puntos de integracion se validan contra los fuentes fijados con tests.

El workflow tiene `permissions: contents: read`, acciones fijadas por SHA, toolchain con SHA-256, commit upstream fijado,
no adjunta nada a releases y no toca `precompiled/` ni `catalog.json` (lo comprueba `tests/firmware-candidates.test.cjs`).
El firmware de satelite half-duplex sigue sin publicar.

## 5.3 Archivo Telegram de fuentes (2026-11-25)

Revisados los 224 paquetes de firmware: la linea F4HWN K1/V3 del archivo (4.3, Calypso) es anterior a v6.1 y las ramas
V1 no son portables, asi que no hay correcciones de `radio.c`/`app.c`/`main.c` que aplicar. Se anade
`scripts/firmware-amateur-guard.cjs` (anclas OK en v6.1 y v7, `App/frequencies.c` es identico), una puerta de TX opcional
y apagada por defecto. Ranking, Calypso AM (origen OEM, prohibido) y la hipotesis de retune BK4819 (sin validar, no
implementada) en `docs/ARCHIVO-TELEGRAM-ANALISIS.md`. Sin cambios en `precompiled/` ni `catalog.json`.

## 6. Fuentes consultadas

- `data/third-party/refs/_catalog/*.md` y las referencias locales citadas arriba (licencias leidas en `LICENSE`,
  `LICENCE`, `LICENSE.md`, `REUSE.toml` de cada una).
- Upstream (solo lectura, API de GitHub): `armel/uv-k1-k5v3-firmware-custom`, `Hertzz58/Radtel-RT950-Pro-Firmware`,
  `OpenRTX/OpenRTX`, `radiofoundry/radiofoundry`.
