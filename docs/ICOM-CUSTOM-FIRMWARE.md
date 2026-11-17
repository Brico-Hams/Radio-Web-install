# Firmware personalizado Icom IC-705 e IC-9700 (transversores)

La pagina Icom de esta aplicacion prepara el firmware personalizado de Dawid SQ6EMM para el Icom IC-705 (E/J, v1.40) y el IC-9700 (E, v1.50). Esta pensado para transversores de microondas. No es un producto de Icom ni esta afiliado a Icom: es un proyecto de la comunidad radioaficionada con licencia MIT. Bricohams NO lo ha probado en ninguna radio.

El firmware solo se distribuye como parches. Tu aportas el archivo `.dat` oficial de Icom, el navegador aplica el parche en tu equipo y obtienes un `.dat` que instalas con el procedimiento normal de actualizacion por tarjeta SD. Nada se sube a ningun servidor y la radio NO se programa por USB ni por Web Serial.

## Que hace el firmware

- Transversores: 8 posiciones (`TRV1` a `TRV8`), con frecuencia RF real en pantalla y en CI-V hasta 122 GHz.
- Por transversor: potencia maxima de TX, retardo de TX (hasta 300 ms, todos los modos) y, en el IC-9700, inhibicion de PTT.
- IC-9700: transversor activo independiente para MAIN y SUB, el intercambio MAIN/SUB lo conserva, y en modo SAT los ajustes de TX siguen al transversor SUB.
- Escala del espectro y de la cascada de 10, 6, 3 o 1 dB por division, con el nivel de ruido anclado automaticamente.
- IC-705: rangos de TX ampliados y TX en 4 m (70 MHz) en la base E; la variante J amplia 1.6-54, 68-74.8, 118-174 y 400-470 MHz. Transmite solo donde tu licencia lo permita.
- Aplicaciones en tarjeta SD: MENU, SET, Apps.
- Bootloader A/B propio con retroceso al otro bloque de firmware.
- La pantalla de arranque indica que el firmware es de Dawid SQ6EMM; el texto de version de la radio sigue siendo el oficial.

## Archivos admitidos

El navegador calcula el MD5 del archivo que eliges y lo compara con esta lista (`docs/patches/index.json` del proyecto). Solo se aceptan archivos oficiales sin modificar.

| Radio | Archivo oficial | MD5 de entrada | Release | MD5 de salida |
| --- | --- | --- | --- | --- |
| IC-9700 E 1.50 | `9700E150.dat` | `6f04fd2248ba39254ed01b30b52ce36a` | `20261113v3` | `51e9d2da39790357f220f3bea3fe4879` |
| IC-705 E 1.40 | `705E140.dat` | `2c9c1d7f3fc80ef173e01d841cd1248a` | `20261113v1` | `1a4577ca926089198bcdf63155ac7410` |
| IC-705 J 1.40 | `705J140.dat` | `b605171288db4a74e0992a8f2afcb1c3` | `20261113v1` | `d7a7f87b9b16f262b188fe3735b3682b` |

El archivo de salida conserva el nombre de la release, por ejemplo `9700E150_20261113v3.dat`. La pagina solo ofrece la descarga si el MD5 del resultado coincide exactamente con el de la build probada por el autor.

## Como funciona el contenedor

El archivo `.dat` de Icom es un contenedor con varias capas. El parche las deshace, modifica la imagen y las vuelve a cerrar:

1. Transformacion autokey: el contenido esta ofuscado con una clave que depende de los propios datos y se decodifica byte a byte.
2. Compresion LZSS: la imagen de firmware esta comprimida; se descomprime para parchearla y se vuelve a comprimir al final.
3. Sello MD5: el contenedor termina con el MD5 del contenido, que se recalcula tras el parche.
4. Arranque inicial en la direccion `0x10000`, donde se instala el bootloader A/B propio.

El parche es un archivo JSON con operaciones del tipo copiar N bytes desde la direccion X de la imagen oficial, mas el codigo nuevo del proyecto. Como solo contiene instrucciones y codigo propio, no incluye ningun byte del firmware de Icom: por eso necesita tu archivo oficial. Antes de ofrecer el resultado se comprueba que el MD5 de entrada y el de salida son los esperados.

## Bootloader A/B

El firmware guarda dos bloques (A y B). Si el nuevo no arranca o quieres volver al anterior, el bootloader permite elegir el otro bloque:

- IC-9700: manten pulsado POWER mientras conectas la alimentacion de DC, unos 5 s.
- IC-705: manten pulsado POWER al encender hasta que el LED parpadee, unos 3 s.

Conserva siempre el archivo oficial: reinstalarlo devuelve la radio al firmware de fabrica.

## Instalacion por tarjeta SD

1. Descarga desde Icom el `.dat` oficial de tu radio y version (consulta la tabla) y no lo modifiques.
2. En la pagina Icom elige o arrastra ese archivo, espera el reconocimiento y pulsa el boton de preparar el firmware.
3. Descarga el `.dat` resultante cuando la pagina confirme que el MD5 coincide.
4. Copia el archivo a la tarjeta SD siguiendo el procedimiento de actualizacion de firmware del manual de Icom para tu radio.
5. Actualiza la radio con ese procedimiento y espera a que termine sin cortar la alimentacion.
6. Comprueba la pantalla de arranque y revisa el menu de transversores.

## Alternativa sin conexion

El proyecto incluye una herramienta de linea de comandos que hace lo mismo sin navegador: `third_party/icom-custom-firmware/icom_patch.py`. Se ejecuta con Python 3, por ejemplo `python3 icom_patch.py patches/9700E150_20261113v3.json 9700E150.dat 9700E150_20261113v3.dat`, desde la carpeta del proyecto. El resultado debe tener el mismo MD5 de salida de la tabla. La prueba del navegador del proyecto se lanza con `npm run test:icom-upstream`.

## Anadir una release nueva

Las releases se declaran en `releases.json` del proyecto original. Para publicar una nueva se genera el parche JSON en `patches/` y se regenera el indice con `tools/build_index.py`, que escribe `docs/patches/index.json`. Despues hay que copiar el parche y el indice a `third_party/icom-custom-firmware/docs/patches/` y anadir el parche nuevo a la lista de archivos permitidos de `server.cjs`. Esta copia vendida no se modifica a mano: se actualiza trayendo un commit nuevo del proyecto original.

## Seguridad

- Es firmware no oficial: puede dejar la radio inservible y puede anular la garantia de Icom.
- Transmite solo en frecuencias y con potencias que tu licencia permita. El IC-705 amplia los rangos de TX y es tu responsabilidad usarlos bien.
- Comprueba el retardo de TX y la potencia de cada posicion de transversor con una carga ficticia antes de conectar un transversor o una antena.
- Solo se aceptan archivos oficiales sin modificar y la salida debe coincidir con el MD5 probado.
- Conserva el archivo oficial y la tarjeta SD para volver atras, y no cortes la alimentacion durante la actualizacion.

## Licencia y atribucion

Basado en icom-custom-firmware de Dawid SQ6EMM (licencia MIT). Repositorio: [icom-custom-firmware](https://github.com/sq6emm/icom-custom-firmware). Pagina web del parcheador: [web patcher](https://sq6emm.github.io/icom-custom-firmware/). Hilo del foro: [mikrofale.cafe](https://mikrofale.cafe/showthread.php?tid=1296). El texto de la licencia MIT esta en `third_party/icom-custom-firmware/LICENSE` y se publica junto con la aplicacion.

## Donde esta en este repositorio

- `icom.html` y `icom-ui.js`: la pagina y su logica.
- `third_party/icom-custom-firmware/`: copia sin cambios del proyecto original en el commit `3d30e461d7bcbd39b782c1823764f305639ee9a8`.
- `third_party/icom-byof/`: copia sin cambios de la documentacion de ingenieria inversa en el commit `a91231f64e8afbe34353994786e8276a3b54f1a9`. Mas detalle en [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) y [ICOM-PATCH-ANALYSIS.md](ICOM-PATCH-ANALYSIS.md).
- `tests/icom.test.cjs`: pruebas de la pagina y de los archivos servidos.

Bricohams NO ha probado este firmware en una radio real. Las pruebas automaticas solo comprueban la pagina y los archivos publicados; la validacion del parche es la del autor original.
