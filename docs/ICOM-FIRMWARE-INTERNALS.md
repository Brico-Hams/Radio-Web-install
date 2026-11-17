# Interior del firmware Icom modificado (IC-705 / IC-9700)

Base de conocimiento tecnica sobre el firmware modificado de Dawid SQ6EMM: que se modifica, donde y como. Sintetiza dos repositorios MIT vendorizados sin cambios: `third_party/icom-custom-firmware/` (commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`) y `third_party/icom-byof/` (commit `a91231f64e8afbe34353994786e8276a3b54f1a9`). Cada dato cita su fichero fuente. El detalle por direccion de cada parche esta en [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md) y la guia de uso en [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 1. Alcance y fuentes

| Fuente | Contenido |
|---|---|
| `third_party/icom-byof/IC705_DAT_FORMAT.md` | Formato del contenedor `.dat` |
| `third_party/icom-byof/IC705_FLASH_LAYOUT.md` | Mapa de flash del IC-705 |
| `third_party/icom-byof/IC9700_FLASH_LAYOUT.md` | Mapa de flash y slots A/B del IC-9700 |
| `third_party/icom-byof/FREQUENCY_RANGES.md` | Planes de banda por region |
| `third_party/icom-byof/UNDOCUMENTED_CIV.md` | Comandos CI-V no documentados |
| `third_party/icom-custom-firmware/releases.json` | Lista de versiones y funciones |
| `third_party/icom-custom-firmware/docs/patches/` | Parches JSON que consume el parcheador |

No se distribuye ningun byte de Icom: los parches solo contienen bytes propios del proyecto y referencias para copiar bytes del firmware oficial que aporta el usuario.

## 2. El contenedor `.dat`

### 2.1 Cabecera y parametros por radio

Segun `third_party/icom-byof/IC705_DAT_FORMAT.md`, el fichero empieza con la firma `44 00 77 55`. En el IC-705 la cabecera ocupa 0x64 bytes (campos f38, f44, f4c, f54 y f5c), incluye cuatro resumenes MD5 y termina con un pie de 2 bytes (`40 75`). Los parametros de la transformacion dependen del modelo, segun `third_party/icom-byof/README.md`:

| Radio | KEY | START |
|---|---|---|
| IC-705 | `0x19` | `0x64` |
| IC-9700 | `0x2b` | `0x38` |
| IC-905 | `0x7f` | `0x88` |

El IC-905 esta firmado con RSA-2048 y SHA-256, por lo que no se puede reempaquetar; solo se documenta.

### 2.2 Transformacion autokey

Segun `third_party/icom-byof/icom_rza1_decode.py`, el cifrado es un autokey byte a byte: `plain = stored ^ ((prev_plain + abs_offset - KEY) & 255)`. El contador arranca en `0x4b` en cada dominio y el relleno en claro es `FF`. La clave se recupera sin conocerla:

- `deriveKey` busca una racha monotona de 16 bytes con paso -1 entre los offsets `0x20` y `0x8000` y obtiene `KEY = (run[0] + s) & 255`.
- `findStart` barre s desde `0x10` hasta `0xFFF` con ventanas de `0x1000` o `0x10000`, invierte el autokey hacia atras anclado en `FF` y busca los vectores ARM `18f09fe5 18f09fe5`.

La version JavaScript esta en `third_party/icom-custom-firmware/docs/js/codec.js`.

### 2.3 Compresion LZSS

Segun `third_party/icom-byof/IC705_DAT_FORMAT.md` y `third_party/icom-byof/ic_rza1_repack.py` se usa LZSS de Okumura:

| Parametro | Valor |
|---|---|
| Ventana (anillo) | 4096 bytes |
| Cursor inicial | `0xFEE` |
| Flags | LSB primero, 1 = literal, 0 = coincidencia de 2 bytes |
| Indice | `lo` mas los 4 bits altos de `hi` desplazados 4 posiciones (`(hi & 0xF0) << 4`) |
| Longitud | `(hi & 15) + 3`, es decir 3 a 18 |
| Fin del flujo | longitud de salida explicita, sin marca final |

La descompresion admite solapamiento (la copia puede leer bytes recien escritos). El compresor usa cadenas hash de clave de 3 bytes (la mas reciente primero), `max_chain=256`, gana la primera coincidencia mas larga y se aplica emparejamiento perezoso de un paso. Ese conjunto de reglas hace que el port JS sea identico bit a bit al de Python. La salida es aproximadamente un 2% menor que la de Icom. Aun asi el slot del IC-9700 puede crecer hasta unos 1,3 MiB por el codigo anadido y la realineacion del paquete de graficos.

### 2.4 Sello MD5

`findMd5Region` calcula el MD5 de forma incremental en pasos de `0x1000` hasta que el resumen acumulado coincide con los 16 bytes siguientes. Segun `third_party/icom-byof/README.md` la region sellada es de `0x9c0000` bytes en el IC-705 y `0x800000` en el IC-9700. Tras reempaquetar hay que recalcular el sello.

### 2.5 Bootstrap e imagen principal

Segun `third_party/icom-byof/IC705_DAT_FORMAT.md`:

| Elemento | Detalle |
|---|---|
| Bootstrap | DAT `0x64` a `0x10064`, mapeado a flash `0x18000000`, 0x10000 bytes |
| Cargador | bootstrap `+0x4000`, longitud `0x9bc`, copiado a RAM `0x20004000`; entrada `0x20004840`; rutina LZSS en `0x200044dc` |
| Cabecera principal | DAT `0x10064`: `csz` y `osz` (dos LE32 en el IC-9700) |
| Flujo principal | empieza en `0x1006c`, se descomprime a RAM `0x20005000`, entrada `0x20005060`, ARMv7-A |
| Aux1 | se descomprime a RAM `0x20000008` (Thumb) |
| Aux2 | se descomprime a flash `0x08000000` (Cortex-M) |

En el IC-9700 un paquete de graficos va encadenado en slot + `csz` + 8 y se mueve con el flujo principal; `repack` lo realinea a 4 bytes y rellena con `FF`. Los parches usan dos MD5 por radio: el del fichero completo (`md5`) y el de la imagen principal descomprimida (`main_md5`), ademas de un MD5 propio del bootstrap.

`repack(..., new_bootstrap)` (en `third_party/icom-byof/ic_rza1_repack.py`) exige exactamente `0x10000` bytes, la etiqueta en `0x4f00` a `0x4f10` igual a la original y vectores ARM al inicio. Si no, el actualizador de Icom toma su ruta heredada y reescribe el slot A.

### 2.6 Ciclo decodificar, parchear, reempaquetar

1. Decodificar: deshacer el autokey, localizar el flujo principal y descomprimirlo.
2. Parchear: aplicar las operaciones del JSON sobre la imagen principal (y opcionalmente el bootstrap).
3. Reempaquetar: comprimir con el LZSS descrito arriba, volver a cifrar y recalcular los MD5.

El resultado debe ser identico byte a byte al que se probo en una radio: el parcheador solo ofrece la descarga si el MD5 de salida coincide con `output.md5`; en caso contrario no escribe nada (segun `third_party/icom-custom-firmware/docs/js/patch.js`). Por eso el compresor debe reproducir exactamente el algoritmo, y por eso solo se acepta firmware oficial sin modificar como entrada.

## 3. Plataforma y mapa de memoria

La CPU es un Renesas RZ/A1H (R7S721001, IC101) con la flash mapeada por XIP en `0x18000000` (segun `third_party/icom-byof/IC705_FLASH_LAYOUT.md`).

### 3.1 IC-705

Flash ISSI IS25LP128 de 16 MiB, RDID `9D 60 18`, sectores de 4 KiB. Los primeros `0x600000` bytes de la flash coinciden con el cuerpo decodificado; el DSP, la WLAN y los recursos estan mas alla. El tamano de la imagen principal original es `0x376000` (`output_size`); los parches generan `0x386000`.

### 3.2 IC-9700

Flash S25FL127S de 16 MiB, RDID `01 20 18`, sectores de 64 KiB, IC181 (segun `third_party/icom-byof/IC9700_FLASH_LAYOUT.md`):

| Region | Offset | Notas |
|---|---|---|
| Bootstrap | `0x0` | 0x10000 bytes |
| Slot A | `0x10000` | 0x7f0000 bytes |
| Slot B | `0x800000` | 0x7f0000 bytes |
| Marcador | `0xff0000` | 16 bytes `SX3913 V0.10-000` significa arrancar el slot B |

Dentro de cada slot aparecen offsets +`0x3e0000`, +`0x3e4000`, +`0x3f0000` a `0x793000` y +`0x7e0000` / +`0x7ec000`. Valores originales de E1.50: `csz` `0x2145F4`, `osz` `0x405334`, `csz2` `0x80C2C`, `osz2` `0x2675BC`. El cargador original no tiene fallback automatico: el actualizador de la SD escribe el slot inactivo y despues fija el marcador.

### 3.3 Zonas que nunca se deben sobrescribir

Las dos EEPROM GT24C1024 (IC191 e IC192) guardan ajustes y calibracion. No son firmware y **nunca** deben sobrescribirse. Tampoco debe tocarse la etiqueta del bootstrap en `0x4f00` a `0x4f10`. Los comandos CI-V de servicio (seccion 6) pueden borrar o desalinear esos datos.

## 4. Mecanismo de parcheo

Segun `third_party/icom-custom-firmware/docs/patches/`, cada parche es un JSON con `name`, `description`, `load_address`, `image_size`, `input`, `output`, `ops` y opcionalmente `bootstrap`. Las operaciones `hex` escriben bytes propios y las operaciones `copy_from` copian `len` bytes del firmware oficial a otra posicion (reubicacion). Las direcciones son absolutas: la imagen principal se carga en `0x20005000` y las operaciones del bootstrap son desplazamientos desde su inicio.

Patron observado (cifras exactas en [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md)): un parche de vector o literal cerca de `0x20005024`, muchos saltos BL o B pequenos de 3 o 4 bytes que desvian rutinas existentes, y codigo propio anexado al final de la imagen (en el IC-9700 la imagen crece de `0x2040A334` a `0x2040FE10`). En el bootstrap el cargador parcheado se extiende mas alla del original (que termina en `+0x49bc`) hasta la etiqueta preservada.

## 5. Funciones del firmware personalizado

Las funciones estan listadas en `third_party/icom-custom-firmware/releases.json`. Las fuentes no publican el codigo fuente del firmware propio, solo los bytes del parche; cuando no se indica el como, no se inventa.

| Funcion | Que hace |
|---|---|
| TRV1 a TRV8 | Ocho transversores con frecuencias RF e IF, memorizados tras apagar |
| Pantalla RF | Muestra la frecuencia real hasta 122 GHz |
| CI-V extendido | Frecuencia de 6 bytes por encima de 1,4 GHz en el IC-9700 |
| IC-9700 MAIN, SUB, DUAL, SAT | Los ajustes de transmision siguen al receptor que transmite |
| Escala del scope | dB/div 10, 6, 3 y 1 con suelo de ruido automatico |
| Limite de potencia | Maximo por transversor: 100, 50, 25, 10 o 5 %; nunca sube la potencia del radio |
| Retardo TX | Hasta 300 ms por transversor |
| Inhibicion PTT | Por transversor |
| Rangos TX del IC-705 | Ampliados segun `third_party/icom-byof/FREQUENCY_RANGES.md` (seccion 7) |
| Aplicaciones SD | Incluidas en las versiones que lo indican en `releases.json` |
| Bootloader A/B | Selector de slot (seccion 5.1) |

### 5.1 Bootloader A/B

Segun `third_party/icom-custom-firmware/docs/index.html` y su `README.md`, el firmware mantiene dos slots (A y B) como ya alterna el actualizador de Icom. El bootloader personalizado detecta un slot danado estructuralmente y vuelve al otro automaticamente. Combinaciones para cambiar de slot:

| Radio | Combinacion |
|---|---|
| IC-9700 | Mantener POWER al conectar la alimentacion DC, unos 5 s |
| IC-705 | Mantener POWER al encender hasta que parpadee el LED, unos 3 s |

El bootloader existe en una sola copia y lo escribe el actualizador de la SD una vez, al empezar la actualizacion. **Si se pierde la alimentacion en ese momento puede ser necesario recuperar con un programador de flash** (por ejemplo CH341A). Usa una fuente fiable.

## 6. Comandos CI-V no documentados

Segun `third_party/icom-byof/UNDOCUMENTED_CIV.md`. Direcciones por defecto: IC-705 `0xA4`, IC-9700 `0xA2`, IC-905 `0xAC`; controlador `0xE0`. Las lecturas son seguras; las escrituras y acciones pueden borrar ajustes o desalinear la radio.

| Comando | Efecto | Proteccion |
|---|---|---|
| `1A D0` | Reset de fabrica, borra todos los ajustes | Sin contrasena |
| `1A E1` | Segunda variante de reset | Un byte de datos debe ser 0 |
| `1A E0` | Entra en el modo de alineacion de fabrica | Contrasena del modelo |
| `1A D2` | Autotest DV | Contrasena del modelo |
| `1A D7` | Ajuste de un subsistema secundario | Contrasena del modelo |
| `1A D5` | Lee el codigo de region | Lectura |
| `1A D6` | Lee una medida de calibracion | Lectura |
| `1A D8` | Lee un byte de estado, solo IC-705 | Lectura |
| `1A D9` y `1A DA` | Lee calibracion de microondas, solo IC-905 | Lectura |
| `1A E4` | Lee un valor de servicio menor | Lectura |
| `1A D1` y `1A D3` | Flag de modo test y diagnostico, IC-705 | Permiso interno |
| `1A E2`, `1A E3`, `1A E5` | Submodo de servicio, objetivo y escritura de datos | Escritura |
| `1A E7` | Opcion de audio o DSP, IC-705 e IC-905 | Escritura |

Contrasenas de alineacion (`E0`): `SX-4075 Adjust` (IC-705), `SX-3913 Adjust` (IC-9700), `SX-4209 Adjust` (IC-905). Subcomandos presentes por radio: IC-705 D0 a D3, D5 a D8 y E0 a E7; IC-9700 D0, D2, D5 a D7 y E0 a E7; IC-905 D0, D2, D5 a D7, D9, DA, E0 a E7 y E9.

Otros: IC-705 `0x24` y `0x28`; IC-9700 `0x28 00` (recuerdo de banda), `0x1C 02`, `0x1C 03` y `0x0D`; IC-905 usa frecuencia BCD de 6 bytes desde 1,389 GHz.

## 7. Tablas de frecuencia

Segun `third_party/icom-byof/FREQUENCY_RANGES.md`. El destino de fabrica (matriz de diodos, copiado a la configuracion) elige un plan de banda que limita la transmision. Que bandas puedes usar depende de tu licencia y normativa.

### 7.1 IC-705 (5 planes, RX 0,030 a 470 MHz)

| Plan | 160 m | 80 m | 40 m | 6 m | 4 m | 2 m | 70 cm |
|---|---|---|---|---|---|---|---|
| 0 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | no | 144-146 | 430-440 |
| 1 | 1,800-2,000 | 3,500-4,000 | 7,000-7,300 | 50,0-54,0 | no | 144-148 | 430-450 |
| 2 | 1,810-2,000 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,000-70,500 | 144-146 | 430-440 |
| 3 | 1,810-1,850 | 3,500-3,800 | 7,000-7,200 | 50,0-52,0 | 70,150-70,250 | 144-146 | 430-440 |
| 4 | 1,800-1,825 | 3,500-3,540 | 7,000-7,100 | 50,0-54,0 | no | 144-147 | 430-440 |

El IC-705 contiene un juego completo de calibracion de fabrica para 70 MHz: la banda de 4 m esta bloqueada por region, no ausente del hardware (planes 2 y 3).

### 7.2 IC-9700 (9 planes, estrictamente tribanda)

| Plan | 2 m | 70 cm | 23 cm |
|---|---|---|---|
| 0 | 144-146 | 430-440 | 1260-1300 |
| 1 y 7 | 144-148 | 430-450 | 1240-1300 |
| 2 y 4 | 144-146 | 430-440 | 1240-1300 |
| 3 | 144-146 | 430-434 y 435-438 | 1240-1245 y 1270-1298 |
| 5 | 144-146 | 430-432 | 1260-1265 |
| 6 | 144-146 | 430-440 | 1260-1300 |
| 8 | 144-147 | 430-440 | 1260-1270 |

No hay bandas ocultas en el IC-9700: las variantes solo cambian los limites de banda. Mecanismo: codigo de region, tabla de mapa de planes, indice de plan y tabla de limites por plan que habilita la transmision.

## 8. Herramientas de ingenieria inversa

| Herramienta | Funcion |
|---|---|
| `icom_rza1_decode.py` | Decodificador de la familia RZ/A1 |
| `ic_rza1_repack.py` | Reempaquetador del contenedor |
| `ic705_decode.py` | Decodificacion completa del IC-705 con salida ELF |
| `ic705.py` | Descomponer, reconstruir y verificar (usa numpy) |
| `ic705_codec.py` | Diagnostico LZSS independiente con muchas opciones |
| `extract_streams.py` | Analizador del contenedor |
| `ghidra_scripts/ExportRecovered.java` | Exporta C descompilado tras importar el ELF en Ghidra |
| `test_ic705_codec.py`, `test_ic705_decode_real.py`, `test_repack.py` | Pruebas |

Las lineas de comando exactas estan en `third_party/icom-byof/README.md`. En `third_party/icom-custom-firmware/` el parcheador `icom_patch.py` reproduce una version sin red: se le da el `.dat` oficial y el JSON de `docs/patches/` y comprueba el MD5 de salida.

Para anadir una version: dar de alta la entrada en `releases.json`, generar el parche y ejecutar `tools/build_index.py`, que escribe `docs/patches/index.json` y copia los parches activos. Existe tambien un parche experimental en `third_party/icom-byof/patches/9700E150_trv16c.json`.

## 9. Como lo usa Bricohams

La pagina `icom.html` aloja el parcheador web, servido por la web y por el servidor de escritorio (`server.cjs`). El navegador lee tu `.dat` oficial, aplica el parche y ofrece el resultado solo si el MD5 coincide. Reglas de seguridad: usa solo firmware oficial propio, comprueba retardo TX y potencia con carga fantasma antes de conectar un transversor, alimentacion fiable durante la actualizacion y asumir que el uso es bajo tu riesgo y puede anular la garantia. Ver [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).

## 10. Licencia y atribucion

Ambos repositorios son MIT, de Dawid SQ6EMM. Repositorios: `https://github.com/sq6emm/icom-custom-firmware` y `https://github.com/sq6emm/ic705-ic9700-ic905-bring-your-own-firmware`; foro: `https://mikrofale.cafe/showthread.php?tid=1296`. Se vendorizan sin cambios bajo `third_party/` y se citan en los ficheros ACKNOWLEDGEMENTS.

## 11. Propuestas de mejora

Ideas basadas en la documentacion; son propuestas y no estan implementadas:

- Comprobar en el navegador el MD5 de `main_md5` antes de aplicar el parche, para dar un error mas claro.
- Detectar el slot activo del IC-9700 leyendo el marcador `0xff0000` de un volcado de flash.
- Anadir al informe de parches una comparacion automatica de regiones contra el mapa de flash cuando el documento lo permita.
- Documentar el rango de calibracion de 4 m del IC-705 como referencia, sin habilitar transmision.
