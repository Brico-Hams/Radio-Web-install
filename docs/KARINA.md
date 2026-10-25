# Karina: expediente tecnico y limites de una derivacion Bricohams

Fecha de inspeccion: 2026-10-25.

## 1. Estado y alcance

**Nueva evidencia del 25-10-2026:** el enlace Dim0s aportado despues contiene
otro paquete Karina para **V3 y UV-K1**, con vectores PY32. Este expediente
describe el paquete **V1 local**, no todas las variantes Karina existentes.
El [informe Karina V3 y pack Dim0s](AYUDA-PACK-DIM0S.md) documenta la descarga,
inventario y hashes. No se ha demostrado compatibilidad con slots Armel ni
se han encontrado fuentes/aviso MIT en ese ZIP.

Este documento describe evidencias del paquete local **Karina-2026.08.21 K5V1
(Fw+Cal+Instr+K5prog+Rolling)** y las compara con las referencias abiertas indicadas
por el usuario. No es codigo fuente recuperado, una traduccion integral de sus
manuales ni una certificacion del firmware. No se ha creado un binario Karina
Bricohams, modificado el bootloader, flasheado una radio ni probado multiboot V1.
Si se ha construido una **edicion Bricohams V3 independiente basada en F4HWN**,
descrita en [BRICOHAMS-FIRMWARE.md](BRICOHAMS-FIRMWARE.md); no incorpora codigo
Karina ni pretende ser su port.

**Bloqueo para derivar Karina:** el paquete no contiene fuentes C, assembler,
linker, Makefile ni una licencia del firmware. Tener un `.bin` no proporciona su
proyecto de compilacion ni permite atribuirle la licencia de otro proyecto.
Los tres archivos Python son controladores CHIRP, no firmware del procesador.

Actualizacion del usuario: indica que «la licencia es MIT». Se registra como
declaracion aportada, pendiente de identificar componente, titular y texto o
fuente verificable. No se ha encontrado ese aviso en el paquete inspeccionado
ni se cambian por ello las licencias de los drivers o F4HWN. Aunque se confirme
MIT para Karina, sigue faltando su proyecto fuente para una recompilacion.

Se pueden documentar funciones observadas y preparar una implementacion propia
sobre una base abierta. No se debe anunciar esa implementacion como Karina
recompilada ni afirmar equivalencia sin verificarla.

## 2. Metodo y fuentes de evidencia

- Inventario recursivo de la carpeta suministrada, sin ejecutar EXE, drivers ni
  binarios.
- SHA-256 y lectura de los primeros vectores de las imagenes.
- Extraccion de texto de cinco PDF, 102 paginas en total, con PDF.js en un
  directorio de herramientas aislado, fuera de las dependencias de la web.
- Consulta de los README, Makefile, linker y licencia de las referencias abiertas.
- Contraste de las imagenes locales con las comprobaciones del conector PY32.

Los PDF produjeron advertencias de fuentes durante la extraccion. Los diagramas,
colores de las versiones estables/de prueba y capturas no se han verificado
visualmente pagina a pagina. Por ello no se infiere estabilidad a partir de un
color perdido ni se considera que el inventario documente exhaustivamente la
implementacion interna. Los resumenes siguientes son propios y no reproducen
los manuales completos.

## 3. Inventario del paquete

24 archivos: 13 `.bin`, 5 PDF, 3 `.py`, 1 `.exe`, 1 `.ini`, 1 `.txt`.

### 3.1. Imagenes y datos

| Archivo | Bytes | Clasificacion prudente |
| --- | ---: | --- |
| `v1_210826_2.bin` | 61412 | Imagen Karina V1 del paquete mas reciente por nombre |
| `v1_210826_2.packed.bin` | 61430 | Contenedor de actualizacion, no imagen RAW intercambiable |
| `30.07fw_2.bin` | 61280 | Imagen anterior; el nombre no certifica estabilidad |
| `30.07fw_2.packed.bin` | 61298 | Variante empaquetada de la anterior |
| `16.10fw_7.bin` | 61040 | Imagen historica; ano no demostrado por el nombre |
| `Config-29.01.26.bin` | 7424 | Configuracion; no firmware |
| `28.11.25calib_mic.bin` | 512 | Datos etiquetados como calibracion de microfono |
| `29.01.26calib_sql.bin` | 512 | Datos etiquetados como calibracion SQL |
| `30.07calib_mic.bin` | 512 | Datos etiquetados como calibracion de microfono |
| `30.07calib_sql.bin` | 512 | Datos etiquetados como calibracion SQL |
| `Rolling back (BACKUP)/k5_v4.00.07_publish.bin` | 58726 | Imagen de recuperacion del paquete; origen sin verificar |
| `Rolling back (BACKUP)/Reborn-RUS.bin` | 61006 | Otro firmware; no asumir que sea Karina |
| `Rolling back (BACKUP)/my_calibration-FIRST-Power.bin` | 512 | Posible calibracion especifica de otra unidad |

Las etiquetas `calib` no prueban que un archivo sea el respaldo original de la
radio del usuario. **No aplicar calibraciones ajenas ni incluirlas en un
repositorio publico.** El EXE K5prog tampoco se ha ejecutado ni certificado.

### 3.2. Huellas verificadas

| Archivo | SHA-256 |
| --- | --- |
| `v1_210826_2.bin` | `c7612a86325d10d768efc9fc7330bede203226879aae0a7d6f026418d55166f9` |
| `v1_210826_2.packed.bin` | `7690da5a740fb24c9a36e711f0410c27b7e99e9ab450d0ef0cdc161b21c11c52` |
| `30.07fw_2.bin` | `9e97e28325468a70aebe19a288cd44878e16ad705f05485c92d2bf9dc50f05b7` |
| `30.07fw_2.packed.bin` | `e53b74b9e755175b72acec8e470e90db0c7c08ac53f1023e10e7e3faeee2d08f` |
| `16.10fw_7.bin` | `af51612d4d20b2637c6da2c72d62493f537621685c1ab604165f0e05fc1fe1ee` |

Son huellas calculadas localmente, no hashes contrastados con una publicacion
firmada del autor.

### 3.3. Manuales

| Documento local | Paginas | Uso en este expediente |
| --- | ---: | --- |
| `00-UV-K5V1-КРАТКО установка и настройка.pdf` | 2 | Introduccion de instalacion y configuracion |
| `01-UV-K5V1-ПОДРОБНО-Прошивка, Восстановление, CHIRP.pdf` | 17 | Referencia de instalacion, recuperacion y CHIRP |
| `02-UV-K5V1_Инструкция Karina_21.08.26.pdf` | 29 | Referencia funcional principal de agosto de 2026 |
| `03-UV-K5V1_История версий Karina.pdf` | 16 | Historial de cambios, no sustituto del codigo fuente |
| `UV-K5(8)_FW_Karina_mod_15.06.2025-R8.pdf` | 38 | Manual anterior, no equivalente automaticamente al de 2026 |

## 4. Hardware y memoria: no confundir V1 y V3

La portada del manual principal identifica UV-K5, UV-K5+, UV-K5(8) y UV-K6 **V1**.
La radio descrita antes por el usuario era **UV-K5 V3**.

| Familia | Base relevante | Consecuencia |
| --- | --- | --- |
| UV-K5 V1 | Ecosistema DP32G030 / referencia OneOfEleven | Imagen y mapa distintos; sin soporte de slots V3 en esta web |
| UV-K5 V3 / UV-K1 | F4HWN PY32F071 en `Multiboot/Fusion61` | Conector existente de slots 1-4 y Main protegido |

En `v1_210826_2.bin` se leen `SP=0x20003FF0` y `Reset=0x0000010B`.
Los RAW `16.10fw_7.bin` y `30.07fw_2.bin` presentan esos mismos vectores.
El conector V3 espera un reset Thumb dentro de la aplicacion a partir de
`0x08002800`. Karina V1 **no pasa** esa comprobacion.

El linker consultado de OneOfEleven declara 60 KiB de FLASH y 16 KiB de RAM.
Los 61412 bytes de la imagen Karina dejan solo 28 bytes frente a 60 KiB;
es una comparacion de tamanos con esa referencia, no un mapa interno de Karina.
No demuestra espacio para otro firmware ni para un gestor de arranque.
Los 18 bytes adicionales de los `.packed.bin` no son espacio libre utilizable.

La portada del manual Karina advierte que no soporta Si4732 y que las memorias
ampliadas M24M01/M24M02 no se aprovechan como memoria ampliada. No hay evidencia
en el paquete de slots de firmware compatibles con el Multiboot F4HWN V3.

## 5. Documentacion funcional de Karina

Las funciones de esta seccion proceden del texto del manual, no de pruebas con
hardware ni de inspeccion del codigo de implementacion.

### 5.1. Pantalla y estado (manual principal, paginas 3-4)

- Presentacion de VFO/canales y ultimo receptor activo.
- Indicadores de ahorro, bloqueo de teclado y modo de funcion.
- Doble escucha, informacion CTCSS/DCS y pertenencia a listas de escaneo.
- Bateria, medidor de senal, nombres y frecuencia.
- Indicacion de modos AM/FM/SSB; la etiqueta SSB no demuestra un receptor con
  prestaciones equivalentes a un equipo SSB dedicado.

### 5.2. Menus y persistencia (paginas 5-9)

- SQL, paso de sintonia, potencia, desplazamiento, tonos y ancho de banda.
- Bloqueo de canal ocupado, guardado de memoria y estilo de nombres.
- Ahorro de energia, VOX, doble escucha y comportamiento de escaneo.
- Ajustes de audio RX/TX y funciones especificas de filtrado.
- Menus ocultos y parametros avanzados: deben documentarse contra fuentes antes
  de exponerlos en una compilacion Bricohams.

El manual distingue parametros por VFO, banda y memoria, y explica que algunos
cambios de canal solo persisten tras guardado explicito. Un port no debe
confundir ajustes temporales con datos persistidos.

### 5.3. Teclado, escucha y escaneo (paginas 10-16)

- Acciones cortas, largas y combinaciones con la tecla de funcion.
- Cambio VFO/MR, copia de ajustes y entrada de frecuencia.
- Escaneo y funciones asignables a teclas laterales.
- El manual advierte de posibles problemas al asignar `NONE` a FN1/FN2 mediante
  herramientas externas; la compatibilidad del driver debe verificarse.

El manual tambien describe funciones de TX automatico y aleatorizacion. Su
presencia en la documentacion no las convierte en requisitos del nuevo firmware.
No se automatizan ni se proporcionan aqui secuencias para interferir servicios.
Una derivacion inicial debe mantener limitaciones legales y TX automatico apagado.

### 5.4. Analizador de espectro (paginas 17-24)

- Pantalla de espectro y visualizacion de actividad.
- Sintonia, seleccion de frecuencia activa y relacion con las memorias.
- Rangos de entrada libre y presets.
- Multipreset y parametros de exploracion.
- Vista detallada denominada VFO-PRO.
- Parametros de ganancia y registros del receptor, incluyendo LNA/PGA.
- El manual indica que determinados parametros pueden escribirse en calibracion
  al salir del espectro: no tratarlos como controles visuales inocuos.

No se han verificado algoritmos, filtros, tiempos, limites ni asignaciones de
registros en fuentes Karina. No es correcto implementar supuestos offsets a
partir de capturas o textos.

### 5.5. Diagnostico y evolucion (paginas 25-29 e historial separado)

El manual incluye problemas de uso y configuracion; el historial relaciona
cambios de recepcion, squelch, ahorro, escaneo, subtonos y espectro.
La entrada de 21-08-2026 menciona una correccion de bloqueo de recepcion asociada
a un modo descrito como Roger 5 y referencia `29.01.26calib_sql.bin`.
Esto no certifica que ese archivo sea adecuado para otra unidad.

El historial alcanza versiones de 2023-2026. Su codificacion por colores
estable/prueba no se conserva de forma fiable en la extraccion de texto.
No se declara que todos los binarios de la carpeta sean estables.

## 6. CHIRP: lo que hay y lo que no prueba

| Archivo Python | Observacion |
| --- | --- |
| `f4hwn.chirp.driver.v2.8.1+Karina-5.py` | Modelo declarado UV-K5/1, basado en Egzumer/F4HWN/Karina |
| `Chirp dr Karina-by_M2Boo-K1-2.py` | Modelo declarado UV-K5V3/K1, pese a estar dentro del paquete V1 |
| `chirp_uvk5_fagci_osfw.py` | Driver UV-K5/Fagci, no demuestra compatibilidad con la imagen Karina mas reciente |

Los encabezados de los drivers indican GPL v2 o posterior. Esa licencia se
refiere a esos archivos, no acredita la licencia del firmware cerrado adjunto.
Los drivers declaran 38400 baudios y memoria de datos de `0x2000` bytes.
Los dos derivados F4HWN/Karina declaran escritura de datos hasta `0x1D00` y
calibracion desde `0x1E00`. Son declaraciones de los drivers, no una prueba de
que los tres sirvan para todas las revisiones.

No se importaron ni ejecutaron estos Python. Un modulo CHIRP ejecuta codigo en
el PC; debe revisarse y elegirse para modelo, firmware y version concretos.
La presencia de un driver V3 no transforma el binario V1 en firmware V3.

## 7. Compilacion modular, parches y multiboot

| Concepto | Que hace | Que no demuestra |
| --- | --- | --- |
| UVMOD | Combina parches binarios seleccionados sobre una imagen soportada | Fuentes de Karina, compilacion C o multiboot |
| Opciones Make/CMake | Incluyen/excluyen codigo y producen una imagen | Varios firmwares residentes simultaneamente |
| Overlays RAM | Comparten memoria de ejecucion entre secciones | Slots de firmware completos seleccionables al encender |
| Multiboot F4HWN V3 | Guarda imagenes en Flash externa y las gestiona mediante su protocolo | Compatibilidad con V1 o con una imagen arbitraria |

OneOfEleven dispone de fuentes Apache-2.0 y opciones `ENABLE_*` en Makefile.
Entre ellas hay recepcion, espectro/panadapter, interfaz, escaneo y funciones
de comunicaciones. Las dependencias existen: el Makefile ajusta, por ejemplo,
opciones de UART y la coexistencia de LTO/overlay. No basta con marcar todas.
Una base OneOfEleven seria una derivacion de OneOfEleven/DualTachyon, no Karina.

## 8. Biblioteca local Multiboot integrada en la web

En Quansheng, seleccionar **Biblioteca local** y elegir la carpeta
`Documents/Multiboot`. El navegador lee unicamente los `.bin` seleccionados:
no se configura una API que lea rutas arbitrarias del equipo ni se suben
los archivos a GitHub.

La inspeccion local encontro 9 archivos que cumplen las comprobaciones actuales:

| Edicion | Versiones | Origen local |
| --- | --- | --- |
| Fusion | 6.0.0 y 6.1.0 | `Fusion61/archive` |
| FieldOps | 6.0.0 y 6.1.0 | `Fusion61/archive` |
| Labs | 6.0.0 y 6.1.0 | `Fusion61/archive` |
| Transfer | 6.0.0 y 6.1.0 | `Fusion61/archive` |
| Fusion compilada localmente | Cadena 6.1.0 | `Fusion61/build/Fusion/f4hwn.fusion.bin` |

En la prueba del navegador seleccionando la carpeta Multiboot completa se
examinaron 71 imagenes: 9 admitidas y 62 bloqueadas. La prueba separada de
`Fusion61/archive` examino 44: 8 admitidas y 36 bloqueadas. Estos resultados
corresponden al contenido local inspeccionado y cambiaran al anadir archivos.

Cada entrada indica su estado o motivo de bloqueo. Se comprueban longitud,
vectores PY32, identificacion F4HWN v6.x y nombres de variantes excluidas.
Se calcula SHA-256 local. Una cadena de version y unos vectores correctos
**no certifican autenticidad, correspondencia con las fuentes ni compatibilidad
fisica**. La compilacion local no se presenta como firmada por Armel.

ARDFv05 contiene fuentes, pero no se encontro una imagen ARDF terminada en sus
directorios de firmware inspeccionados; `archive` contiene imagenes Fusion
anteriores y stock. No se ofrece un supuesto ARDF deducido del nombre de carpeta.
Las publicaciones ARDF del catalogo siguen siendo solo descarga.

Preparar una imagen no escribe nada. Instalar sigue requiriendo una conexion
compatible, respaldo completo verificado, slot 1-4, confirmacion y CRC final.
Main continua protegido. Karina V1 queda bloqueada tambien con un nombre falso
F4HWN, porque sus vectores no cumplen el formato PY32.

## 9. Contrato necesario para una version Bricohams reproducible

Este es el trabajo pendiente, no funcionalidades que ya tenga Karina:

1. Obtener las fuentes exactas de Karina, licencia, dependencias y herramientas,
   o aprobar una base abierta alternativa y registrar sus diferencias.
2. Elegir hardware por separado. V1 y V3 requieren proyectos/perfiles y binarios
   diferentes. Para los slots existentes del usuario la base aplicable es PY32,
   no el binario V1 del paquete.
3. Reproducir la compilacion sin cambios antes de modificarla; registrar commit,
   toolchain, opciones, mapa y hashes. No inventar un SHA del upstream.
4. Crear perfiles minimos con dependencias y presupuesto de FLASH/RAM.
   Rechazar opciones desconocidas y combinaciones que no quepan.
5. Mantener identidad/licencia del upstream y anadir marca Bricohams sin alterar
   artificialmente una cadena para superar la validacion de slots.
6. Entregar `.bin`, mapa, informe de tamano, `build-info.json` y `SHA256SUMS`
   cubriendo tanto firmware como metadatos. No confundir hash con firma.
7. Para V3, probar arranque, cambio de CFG, calibracion propia, respaldo,
   recuperacion y slots contra F4HWN. Para V1, demostrar primero el soporte
   fisico de almacenamiento y una estrategia de recuperacion del bootloader.
8. Publicar solo tras pruebas de banco; documentar limites RF y no habilitar
   automaticamente emisiones fuera de bandas permitidas.

La web ya tiene un formulario de opciones para el workflow
`anatolbricoham/bricohams-firmware`; no es un compilador Karina. En esta tarea
no se ha ejecutado ese workflow. Se ha anadido un constructor local independiente
para F4HWN v6.1.0 y generado las ediciones Bricohams Fusion y Labs. El resto de
esta seccion sigue siendo requisito para derivar Karina, no una afirmacion de
que las funciones Karina se hayan reimplementado en esos binarios.

## 10. Recuperacion y limites operativos

El `readme.txt` de rollback describe operaciones que borran datos. No se
automatizan ni se recomienda aplicarlas por un fallo USB. Antes de cualquier
migracion se necesitan respaldos originales de la unidad, identificacion del
hardware y un procedimiento de recuperacion probado.

La web mantiene las barreras de escritura. No se han tocado los archivos
originales del paquete ni la carpeta Multiboot. No se redistribuyen PDF,
EXE, calibraciones ni firmware Karina.

## 11. Fuentes externas consultadas

- [UVMOD: herramienta](https://whosmatt.github.io/uvmod/index.html).
- [UVMOD: README](https://github.com/whosmatt/uvmod).
- [OneOfEleven: proyecto](https://github.com/OneOfEleven/uv-k5-firmware-custom).
- [OneOfEleven: Makefile](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/Makefile).
- [OneOfEleven: linker](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/firmware.ld).
- [OneOfEleven: licencia Apache-2.0](https://github.com/OneOfEleven/uv-k5-firmware-custom/blob/main/LICENSE).
- [F4HWN V3/UV-K1](https://github.com/armel/uv-k1-k5v3-firmware-custom).

Las referencias externas se consultaron en su rama publicada durante la
inspeccion; no se ha fijado un commit para una nueva derivacion. No se atribuyen
sus funciones o licencias al binario Karina sin evidencia.
