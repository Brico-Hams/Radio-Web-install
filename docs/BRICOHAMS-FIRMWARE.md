# Bricohams V3: compilacion modular local

## Identidad y alcance

**BETA, en validacion y pruebas.** Las nuevas compilaciones declaran
`stability: "beta"` y el alcance de validacion en `build-info.json`, cubierto por
SHA256SUMS. Se conserva `hardwareTested: false` hasta probar ese binario exacto.
La lectura real de una radio con F4HWN v6.0.0 no valida estos firmware Bricohams.
El Modo PRO de la web reduce confirmaciones, no cambia modulos, licencias ni
protecciones del firmware.

Edicion independiente de F4HWN para **UV-K5 V3 / UV-K1 PY32**. No es Karina,
no admite UV-K5 V1 y no anade un bootloader propio. Reutiliza el multiboot del
upstream y conserva su identidad de protocolo `F4HWN v6.1.0`. La edicion de
pantalla pasa a `Bricohams` mediante una variable CMake, sin parchear el binario.

Base fijada:

- Repositorio: <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Version declarada por los presets: `v6.1.0`.
- Licencia/atribucion: se entregan `LICENSE` y `NOTICE` originales.
- Las fuentes locales de referencia estan en `Documents\Multiboot\Fusion61`.
  Su cambio no confirmado en `App/settings.c` se conserva y **no se incluye**.

Se elige esta base abierta para continuar sobre el hardware V3 y sus slots.
Las limitaciones que impiden derivar Karina se documentan en [KARINA.md](KARINA.md).
No se han portado sus algoritmos, menus ni controladores.

## Compilar a demanda

Requisitos en PATH: Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain y
Python 3 para el comprobador de formatos del upstream. No requiere paquetes
Python externos ni instalar dependencias nuevas de npm.

Configuracion usada y probada en Windows:

- Arm GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, detectado por CMake.

Desde la raiz de este repositorio, en PowerShell:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

El destino **debe ser nuevo**: no se borra ni sobrescribe una compilacion previa.
Si falla una compilacion, se muestra el error y no se entrega un conjunto de
artefactos marcado como correcto; usa un nuevo destino al repetirla. Las fuentes
y resultados de diagnostico quedan en el destino fallido.

Para Labs, sustituye `--preset Fusion` por `--preset Labs` y usa otro destino.
Tambien se aceptan `FieldOps` y `Transfer`, aunque no se han compilado esos dos
perfiles en esta validacion.

Cada `--option` admite exactamente `ENABLE_XXX=ON` o `ENABLE_XXX=OFF`.
Se pueden repetir argumentos `--option` para funciones diferentes, pero no
repetir el mismo nombre. Las opciones disponibles son las booleanas de los
presets del **commit local fijado**, no las del formulario online v6.3.0.
No se aceptan claves desconocidas, valores arbitrarios, `DEV`, otro hardware ni
versiones inventadas.

Para enumerarlas sin compilar:

```powershell
$p = Get-Content 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

El constructor resuelve la herencia de presets y exige mantener activados:

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

Estas condiciones conservan el perfil de gestion de slots; no garantizan que
cualquier combinacion restante sea util o segura. El linker debe aceptar RAM
y Flash, y las comprobaciones del upstream deben pasar. No se reduce el
presupuesto ni se omiten comprobaciones para hacer caber una imagen.

## Fuentes, compilacion y reproducibilidad

El script clona el repositorio **local** en una carpeta separada y extrae el
commit fijado. No modifica la carpeta Fusion61, no aplica su diff sin commit,
no descarga Karina ni cambia la version para burlar el inspector.

Se fijan `SOURCE_DATE_EPOCH` al tiempo del commit, `TZ=UTC` y `LC_ALL=C`.
Con la toolchain indicada, dos compilaciones Fusion en rutas diferentes
produjeron el mismo SHA-256 del `.bin`. Esto verifica reproducibilidad local
del firmware, no identidad byte a byte de ELF, mapas o informes que contienen
rutas absolutas, ni reproducibilidad con otra toolchain.

El constructor:

1. Valida argumentos, commit y opciones antes de crear el destino.
2. Clona las fuentes y configura CMake en Release.
3. Compila con el preset elegido, edicion Bricohams y opciones resueltas.
4. Conserva las comprobaciones de formatos y aislamiento del restaurador RAM.
5. Comprueba longitud, vectores PY32, version y marca de edicion en el binario.
6. Emite artefactos, opciones efectivas, herramientas y hashes.

El directorio `source` conserva el checkout usado. La carpeta `artifacts`
contiene firmware, ELF, mapa, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`
y `SHA256SUMS`. Todos salvo el propio manifiesto estan incluidos en SHA256SUMS.
El hash detecta alteraciones respecto al manifiesto, **no es una firma digital**.

## Binarios generados el 25-10-2026

Ambos tienen `ENABLE_VOX=OFF`; las demas opciones son las de su preset upstream.

| Perfil | Binario | Bytes RAW | RAM segun linker | Flash segun linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

El tamano del RAW incluye la seccion de restauracion RAM y no es identico a la
linea FLASH del informe. Ambos RAW estan por debajo del maximo de 120832 bytes.
La comprobacion de aislamiento informa 888 bytes y 83 saltos revisados.

SHA-256:

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs conserva `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` y
`ENABLE_FEAT_F4HWN_OVERLAY_APPS`; Fusion no. La capacidad de respaldo fisico
requiere el protocolo compatible de la radio y no se ha probado con hardware.
No se han generado nuevas `.app`: las existentes necesitan ABI/API compatibles.

## Uso en la web y slots

Los artefactos entregados se copian en:

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

En **Quansheng > Firmware a medida > Comprobar la compilacion descargada**,
selecciona juntos **todos** los archivos de una carpeta de artefactos. El
verificador exige cada entrada de SHA256SUMS, incluidos mapa, ELF y licencias.
Tras comprobarlos, **Usar este firmware** lo prepara en el panel de slots.

Alternativamente, selecciona `Documents\Multiboot` en la biblioteca local:
los dos `.bin` aparecen como imagenes adicionales preparables. La biblioteca
comprueba estructura y muestra hash, pero no verifica automaticamente el
manifiesto contiguo; para ello usa el formulario de compilacion.

Instalar mantiene respaldo completo, confirmacion y CRC del slot. Usar
**slots 1-4, no Main**. No se han escrito ni borrado datos de la radio.
Fusion y Labs aqui son builds experimentales locales, no versiones oficiales
firmadas ni certificadas en banco. La cadena estable del upstream no cambia
ese estado experimental de la derivacion.

## Validacion pendiente en hardware

Validacion software completada: 149 pruebas, comprobacion de sintaxis y build
Pages correctos. En navegador se verificaron los 7 archivos del manifiesto de
cada edicion, se prepararon ambos firmwares y la instalacion permanecio bloqueada
sin conexion/respaldo. Al seleccionar Multiboot tras la entrega se examinaron
73 imagenes: 11 admitidas estructuralmente y 62 bloqueadas. No hubo errores
JavaScript en esa comprobacion.

Antes de considerarlo apto para uso operativo siguen pendientes identificacion
de la unidad, respaldo original, prueba de arranque y recuperacion, calibracion,
menus, RX y cambio de CFG/slots. No se afirma resuelto el error USB anterior.
No se publican ni flashean automaticamente estos binarios.
