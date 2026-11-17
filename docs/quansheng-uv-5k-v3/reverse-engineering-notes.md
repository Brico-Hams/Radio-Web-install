# Notas acotadas de ingeniería inversa estática

## Método y límites

Se hizo una inspección estática y de solo lectura de nombres pertinentes, tamaños, hashes SHA-256, primeros 32 bytes y, cuando esos bytes parecen una tabla de vectores, sus dos primeras palabras little-endian. No se ejecutaron, desensamblaron, descifraron, descomprimieron ni escribieron archivos en una radio. No se leyó información privada de calibración. Los hashes identifican únicamente las copias locales de la exportación; no autentican autor, versión ni licencia.

Se consultó primero el grafo existente. No se encontró el ejecutable Graphify en `PATH`; no se intentó instalarlo ni reconstruir el grafo. Una consulta acotada del grafo encontró el nodo `QuanshengConnector` en `quansheng-connector.js`; después se leyeron directamente las referencias de implementación ya presentes en el repositorio. No se descargaron fuentes del proveedor ni enlaces arbitrarios para esta tarea.

## Metadatos de imágenes/firmware y archivo local

| ID de evidencia / archivo local | Tamaño | SHA-256 | Observación estática | Límite de interpretación |
|---|---:|---|---|---|
| BIN-01 `f4hwn.k5v3.fusion.v4.3.bin` | 81.400 bytes | `4ed45f79911fd963749f74b55cd69258abe958df4424d96773144f835a92bcd0` | SP `0x20004000`; reset `0x08002D35`; los vectores encajan en la ventana de aplicación V3 usada por el repositorio | El nombre y la forma de los vectores no autentican fuente/versión ni prueban compatibilidad con una radio/ranura concretas |
| BIN-02 `K5_V3_PY32F071_firmware.bin` | 71.712 bytes | `f4e5264a6f9a5436a6c75f7b217c60ba002cec04928f247392b9968c5c9458cb` | SP `0x20002FA0`; reset `0x080028D5`; ubicación vectorial plausible para aplicación PY32 V3 | El nombre no prueba editor, opciones de compilación ni comportamiento en ejecución |
| BIN-03 `k5_V3.00.10_encrypted_18to1300MHz.bin` | 61.150 bytes | `a102723dc86ffda0d076ffea14b0d4b17e01c1420a68e1519cc92312adaac8d4` | Las palabras iniciales no coinciden con las comprobaciones de pila/reset V3 del repositorio | El nombre indica cifrado; no se descifró ni se analizó más. Arquitectura y objetivo no establecidos |
| BIN-04 `Hawk5-alfa-by-fagci-20251206_0905.bin` | 61.206 bytes | `6f47e41fb24b118227443ad880330486e61aa63b9081d269e10f2863e2a01574` | Los bytes de cabecera no siguen el patrón de vectores de aplicación V3 comprobado | No se afirma arquitectura/objetivo/funciones; no se descifró ni desensambló |
| IMG-01 `Quansheng_UV-K5_20241128.img` | 8.429 bytes | `19a878db7d65aba753345a53d52ed5fcb3fcf3e77aac20cda8b1a63ae920a8a7` | Enlazado desde un mensaje genérico UV5K/CHIRP; las primeras palabras no coinciden con la ventana de vectores de aplicación V3 | El tamaño/contexto sugieren una imagen CHIRP/codeplug, pero no se validó el formato ni el contenido |
| ARC-01 `deltafw-k1-k5v3-main.zip` | 25.197.765 bytes | `e9966fc716b238be3377b642f6babfb85f677a9e941d7149ccaa9441e743e7e8` | Solo firma de cabecera local de ZIP | No se abrió ni extrajo; no se infiere contenido, código, objetivo ni licencia |

Los metadatos estáticos sin procesar se guardan en los archivos ignorados `tmp/quansheng-uv-5k-v3/local-firmware-inventory.json` y `message-linked-files-static.json`. Se excluyeron deliberadamente los adjuntos separados `K5V3_calibration*.dat`: son calibraciones potencialmente específicas de cada unidad y no se leyeron ni calcularon sus hashes.

## Observaciones del código fuente del repositorio

- **Mapa de hardware:** `docs/ATLAS-UV-K5-V3.md` asigna familias MCU y almacenamiento V1/V2/V3/K1 y describe bootloader V3, trama serie y capa EEPROM lógica. Es una referencia fechada del repositorio, no una medición de esta tarea.
- **Gestor de slots:** `Multiboot/Multiboot/Fusion61/App/driver/mb_flash.h` define límites y cabecera de slots; `mb_flash.c` valida el CRC de la imagen antes de restaurar; `App/ui/multiboot.c` busca y selecciona slots.
- **Almacenamiento lógico de canales:** `Multiboot/Multiboot/Fusion61/App/driver/eeprom_compat.c` traduce direcciones EEPROM lógicas y devuelve el valor de borrado para huecos sin mapa.
- **Espectro:** `Multiboot/Multiboot/Fusion61/App/app/spectrum.c` incluye `APP_RunSpectrum`, `SetF`, `GetRssi` y estado de picos/renderizado. `GetRssi` espera a que pase el transitorio y vuelve a leer RSSI tras descartar la muestra inicial. Los nombres de API `BK4819_*` no contradicen por sí solos la identificación BK4829 del atlas como transceptor físico V3.
- **Protocolo host:** `quansheng-connector.js` contiene `QuanshengConnector`, tramado/CRC, límites de vectores de imagen, lectura de flash completa y CRC, copias de seguridad y formatos de slots/aplicaciones/presets. Es código host, no firmware de radio.
- **Proyecto Bricohams separado:** `firmware/bricohams/spectrum.c`, `presets.c`, `doppler.c` y `ardf.c` implementan lógica independiente de datos/estado. `docs/BRICOHAMS-FIRMWARE.md` clasifica las imágenes relacionadas como Beta y sin prueba de arranque en hardware.

Estas observaciones de código no se atribuyen a Karina. En el material inspeccionado del paquete no se documentó fuente pública de Karina V3; no se intentó traducir inversamente ningún binario.

## Lo que estas observaciones no demuestran

- Si el nombre comercial exacto «UV-5K V3» corresponde a una placa V3.
- Si alguno de estos archivos de imagen locales es auténtico, actual, compatible, seguro o redistribuible legalmente.
- Si un vector con aspecto válido implica periféricos, mapa de flash, ABI de aplicación o formato de calibración correctos.
- Cómo implementa Karina las funciones que se le atribuyen o si corrigió un fallo concreto.
- Sensibilidad RF real, tiempo de barrido, precisión de frecuencia, comportamiento de transmisión ni arranque correcto del hardware.
- El contenido de archivos locales comprimidos, firmware packed, PDF, fotos, audio/video, ejecutables, instaladores, scripts o calibraciones no enumerados expresamente.
