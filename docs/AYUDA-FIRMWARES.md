# Biblioteca de ayuda de radios y firmware

Revision: 25-10-2026. Ayuda original de Bricohams; no sustituye los manuales
oficiales ni certifica combinaciones que no se han probado en hardware.

## Documentos y orden de lectura

| Guia | Que resuelve |
| --- | --- |
| [Configuracion comun y procedimientos](AYUDA-CONFIGURACION.md) | Frecuencias, FM/DMR, tonos, copias, repetidores, satelites, USB y comprobacion de resultados |
| [Quansheng F4HWN](AYUDA-QUANSHENG.md) | Puesta en marcha de 0 a 100 %, hardware V1/V2/V3, versiones v4/v5/v6, ediciones, menus, slots, CFG, apps y recuperacion |
| [Atlas tecnico UV-K5 V3](ATLAS-UV-K5-V3.md) | Como funciona por dentro: pinout PY32F071, memorias, protocolo serie, bootloader, SWD, compilacion, mods, esquemas y fotos |
| [Todas las opciones de compilacion F4HWN](AYUDA-OPCIONES-F4HWN.md) | Significado de cada opcion del catalogo, dependencias y precauciones |
| [Valores de los presets F4HWN](F4HWN-PRESETS.md) | Matrices ON/OFF de 18 versiones publicadas v4.3.0-v6.3.0, todos sus presets y perfiles locales v6.1.0 |
| [ARDF](AYUDA-ARDF.md) | Ganancia manual, ciclos, sincronizacion, distancia y diferencias de hardware |
| [Egzumer original](AYUDA-EGZUMER.md) | Fuentes V1, licencia Apache-2.0 y cada opcion del Makefile inspeccionado |
| [Pack Dim0s y Karina V3/K1](AYUDA-PACK-DIM0S.md) | Inventario de variantes, nueva evidencia PY32, hashes y limites de multiboot/licencias |
| [OpenGD77: configuracion y uso](AYUDA-OPENGD77.md) | FM/DMR, codeplug, canales, TG, TS, filtros, GPS, APRS y satelites |
| [OpenGD77: radios y revisiones](AYUDA-OPENGD77-MODELOS.md) | Modelos, alias, revisiones, variantes y diferencia entre catalogo e identificacion |
| [Karina](KARINA.md) | Inventario, funciones documentadas, busqueda del codigo fuente (cerrado), especificacion para reimplementarla y fuentes |
| [Baofeng DM-32UV](DM32UV-FIRMWARE.md) | Hardware HR_C7000/FD6818, estado y licencia de OpenGD77, instalacion, como compilar RadioFoundry y protocolo del bootloader |
| [Ejemplos](EJEMPLOS.md) | Firmwares abiertos F4HWN v6.3.0 y moto con su licencia, canales PMR446 de ejemplo y scripts de analisis |
| [Iniciacion al satelite](INICIACION-SATELITE.md) | Guia propia en espanol para empezar con satelites FM y la imagen BH Satelite |
| [Antenas de satelite](ANTENAS-SATELITE.md) | Yagi bibanda y dipolo en V simulados con MoM propio, planos y piezas STL |
| [Binarios de terceros](BINARIOS-TERCEROS.md) | SHA-256 y origen de Karina, firmwares DM-32UV oficiales y parcheados, OpenGD77 DM32 e imagenes de fabrica del K1/K5 V3, sin redistribuirlos |
| [Repositorios de la comunidad](ENLACES-COMUNIDAD.md) | Catalogo verificado de repositorios Quansheng y DM-32UV, enlaces caidos recuperados y busqueda en otras forjas |
| [Bricohams V3](BRICOHAMS-FIRMWARE.md) | Compilacion local reproducible de Fusion y Labs y artefactos entregados |
| [AnyTone](AYUDA-ANYTONE.md) | Preparador local JSON/CSV; no es CPS RDT ni programador USB |
| [Android](ANDROID.md) | Libro de guardia, canales FM, CAT y audio experimentales; permisos y pruebas por revision |
| [Validacion V3 y Android](VALIDACION-INTEGRAL-V3-ANDROID.md) | Evidencias, fallos corregidos, aislamiento de datos, ensayos pendientes y limites de mods |

En las paginas web puedes utilizar la busqueda del navegador (Ctrl+F).
Los documentos Markdown se conservan en el repositorio para consulta sin red.
La ayuda web se incluye tambien en el servidor local, Pages e instaladores.

## Que significa «soportado»

Hay cuatro conceptos diferentes:

1. **Soportado por el proyecto de firmware:** el upstream mantiene una imagen.
2. **Reconocido por el conector:** esta web conoce una estructura de identificacion.
3. **Publicado en el catalogo:** se reconoce un nombre de archivo de una fuente
   autorizada. No equivale a poder instalarlo con esta web.
4. **Probado en una radio:** requiere evidencia fisica del modelo y build exactos.
   Las pruebas automaticas de esta web no son esa certificacion.

Una fila en una tabla no autoriza a usar firmware de otra revision. «Descarga»
no significa «flasheo»; «archivo verificado» no significa «firmado digitalmente».

## Cobertura de versiones

| Familia | Cobertura concreta de esta biblioteca | Limite |
| --- | --- | --- |
| F4HWN Quansheng PY32 | 18 versiones publicadas reconocidas; 84 opciones de interfaz y 94 claves distintas en el historial de presets por commit | No se atribuyen las funciones v6 a las versiones antiguas |
| ARDF Quansheng | Publicaciones reconocidas del repositorio V3/UV-K1; guia de ARDF local v0.5 y advertencias de evolucion | No se habilita su escritura en slots sin compatibilidad verificada |
| Bricohams sobre F4HWN | Fusion, Labs, ARDF, Satellite y Spectrum v6.1.0, opciones y hashes documentados | Lecturas previas y CRC de slots no certifican arranque ni todas las funciones |
| Plataforma independiente Bricohams | Residente experimental, Diagnostics y Blocks en BHA1, almacenamiento y transferencia portables | Sin arranque fisico validado ni integracion USB/Flash; BHA1 no es FAP1 y no se instala con el cargador web existente |
| Karina | Paquete V1 local y paquete V3/K1 de 21-09-2026 inspeccionado desde Dim0s | Existen binarios PY32; no fuentes ni compatibilidad multiboot Armel demostradas |
| OpenGD77 | Familias y modelos documentados; versiones identificadas por fecha/build y variantes de distribucion | No existe una tabla universal de menus aplicable a todos los builds historicos |
| Stock Quansheng, UVMOD, OneOfEleven | Identificacion y referencias para evitar confusiones | No son protocolos ni compiladores incorporados a esta web |

«Todas las versiones» se documenta como una matriz de familias, diferencias y
fuentes por version, no como una promesa de que cada menu exista desde el primer
firmware. Para un build concreto, anota modelo, revision, fecha, nombre del
archivo, commit si existe y hash. Contrasta su manual y notas de publicacion.
Lo no confirmado se marca como tal en vez de inventar valores, atajos o mapas.

## Regla de seguridad y de uso legal

- Identifica el hardware real, no solo la carcasa.
- Conserva calibracion original y codeplug antes de migrar.
- No ejecutes borrados, restauraciones o reset por un error de puerto sin
  conocer primero la causa.
- En OpenGD77 esta web mantiene bloqueada la escritura porque no obtiene una
  copia completa verificada del firmware MCU.
- En Quansheng las mutaciones requieren respaldo completo; Main esta protegido.
- Los datos importados para escucha empiezan en RX-only.
- No actives TX automatico ni fuera de las frecuencias autorizadas. Un perfil
  PMR/GMRS/FRS/MURS de firmware no homologa una radio.

## Licencias: componentes distintos

La indicacion del usuario «la licencia es MIT» queda registrada como declaracion
pendiente de asociar al componente, titular y texto de licencia originales.
No se cambia por ello la licencia de terceros ni la del repositorio existente:

- La web declara GPL-3.0-or-later en su manifiesto y archivo LICENSE.
- Las fuentes F4HWN inspeccionadas incluyen Apache-2.0 y NOTICE.
- Los controladores CHIRP del paquete Karina contienen avisos GPL.
- La licencia exacta del firmware Karina no aparece en el paquete inspeccionado.
  La declaracion MIT del usuario no aporta sus fuentes ni demuestra a que
  archivos/versiones se aplica. Se incorporara el aviso correspondiente cuando
  exista una referencia verificable.
- OpenGD77 y sus componentes se rigen por sus propios avisos; no presumir MIT.

No se redistribuyen manuales completos, firmware Karina, calibraciones ajenas
ni software de terceros por el hecho de citarlos.

## Actualizar esta biblioteca

Las tablas de valores se generan desde los catalogos fijados, no desde memoria:

```powershell
npm run build:help
```

Al cambiar un catalogo hay que revisar el significado de opciones nuevas,
versiones y dependencias, regenerar las paginas y ejecutar las pruebas de ayuda.
No se consulta la radio ni se cambia su configuracion al abrir una guia.

La instantanea historica esta en `f4hwn-history-presets.json`: guarda commit,
SHA-256 y contenido de CMakePresets.json para cada version. Su actualizacion es
explicita con `node scripts/fetch-help-presets.cjs` desde la raiz del repositorio;
realiza consultas publicas a GitHub, no accede a radios ni sube archivos locales.
El generador de ayuda normal funciona sin red y no descarga fuentes.
