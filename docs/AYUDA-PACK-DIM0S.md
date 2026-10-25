# Pack Dim0s: inventario y Karina V3/UV-K1

Revision: 25-10-2026. Repositorio aportado por el usuario:
`Dim0s/quansheng-UV-K5v3-K1-firmware-pack`.
Commit inspeccionado: `52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c`.

## Que cambia respecto a la inspeccion anterior

El paquete Karina local revisado inicialmente era **V1**. Este repositorio
anuncia firmwares para **K5 V3, K1 y equipos con bootloader 7.x** y contiene
otro paquete Karina con binarios separados K1/V3. Por tanto:

- No es correcto afirmar que solo existe Karina V1.
- Si sigue siendo correcto rechazar el binario V1 del paquete anterior para V3.
- Existe nueva evidencia de **binarios Karina PY32**, pero no de que sean
  compatibles con multiboot Armel ni de que sus fuentes esten disponibles.
- Esta referencia no convierte el pack en fuente oficial de cada autor.

La cabecera del repositorio recomienda guardar calibraciones. Su informacion
Karina declara que no hay enlace al repositorio fuente y lo describe como
firmware cerrado, con reposts de builds en un canal externo.
Eso no demuestra por si solo una licencia concreta: el aviso MIT indicado por
el usuario sigue pendiente de fuente/titular verificables.

## Naturaleza y limites del inventario

El arbol Git completo, no truncado, contiene binarios, apps, documentos,
controladores Python y archivos comprimidos. No se encontraron archivos fuente
`.c`/`.h`, Makefile ni LICENSE/COPYING/NOTICE por nombre en ese arbol.
No se afirma haber inspeccionado por dentro todos los ZIP/RAR del repositorio.
Para Karina si se inspecciono el ZIP de 21-09-2026, sin ejecutar sus archivos.

No se copia el pack al repositorio web ni se instalan EXE, APK, drivers o
calibraciones. No se redistribuyen sus PDF, archivos ni firmware.
Una huella SHA-256 calculada localmente detecta cambios respecto a esa descarga,
pero no acredita autoria, licencia, seguridad ni correspondencia con fuentes.

## Familias presentes

Las funciones siguientes son **afirmaciones del recopilador** del README
inspeccionado, no prestaciones certificadas por Bricohams. Para cada build hay
que acudir al autor y manual concreto.

| Carpeta/proyecto | Orientacion descrita por el pack | Estado en esta web |
| --- | --- | --- |
| BD1AHN | Variante con tres VFO | Referencia documental; sin protocolo validado |
| Calypso | Carpetas de versiones 1.5.0 y 1.7.0 | Inventariada; no se infieren funciones |
| Delta | Contraseña y proteccion de datos segun recopilador | No se certifican sus propiedades criptograficas |
| E25WOP | Funciones CW y accesorios segun recopilador | No conectar accesorios por receta de otra placa |
| F4HWN | Releases y apps, incluidas versiones historicas | Preferir fuente oficial Armel ya integrada |
| GOGU | Variante F4HWN con mensajeria y otras funciones | Multiboot afirmado por recopilador; sin validacion local |
| HAWK | Documentacion y archivos propios | Inventariada; no se infieren funciones |
| IJV | Versiones con funciones gratuitas/de pago segun pack | No distribuir ni habilitar funciones de pago sin licencia |
| IOTCU | Variante con modulo Si4732 segun pack | Requiere hardware/firmware concretos; no inferir que una radio stock lo tiene |
| KA50 / KA52 / KA52M | Espectro; KA52M con variantes de 2/3 VFO | Varios VFO no equivalen a receptores RF simultaneos |
| Karina | Espectro, captura y presets propios | Nuevos binarios K1/V3; no slots Armel verificados |
| Matoz | Archivos propios | Inventariada; no se infieren funciones |
| N7SIX | Espectro/funciones CW segun recopilador | Multiboot afirmado, no certificado |
| NR7Y | Funciones CW segun recopilador | No asumir compatibilidad electrica de accesorios |
| PrepperRadio | Mensajeria por modos FSK segun pack | No certificar cifrado, red ni compatibilidad entre variantes |

El README tambien menciona Sonic mediante un enlace externo y aclara que no
esta en el pack en ese momento. Mencion no equivale a binario inspeccionado.
Las carpetas de firmware stock y calibraciones de fabrica son material de
referencia: **no usar calibraciones de otra unidad como respaldo propio**.

## Multiboot: afirmacion frente a comprobacion

El recopilador enumera F4HWN, GOGU, IOTCU y N7SIX como compatibles con el
multiboot Armel, ademas de Sonic externo. **No incluye Karina en esa lista.**
Se necesita comprobar formato, mapa, identificacion, bancos CFG, restauracion,
protocolo, integridad y arranque en hardware antes de ampliar el inspector.

La web conserva su lista de imagenes F4HWN reconocibles. No se modifica una
cadena ni se renombra un archivo para eludirla. No se añaden automaticamente
estas fuentes al catalogo de descargas verificadas de autores originales.

## Karina 21-09-2026: evidencia del ZIP

Archivo: `Karina/21.09.2026.zip`, 2296162 bytes.
SHA-256 de la descarga:

```text
619368c7d08cd2dfdda13aeec4ae5d8fadd70eb78d60bbe908832d53385e2999
```

Inventario interior: carpetas K1 y K5V3, dos RAW, dos packed, dos copias de
`calib11.bin`, dos drivers CHIRP y tres PDF. No contiene proyecto C, Makefile,
linker ni aviso LICENSE por nombre. Los nombres rusos de algunas entradas
presentan problemas de codificacion al listar el ZIP; no se han reinterpretado
como nombres de fuente ni se ha ejecutado contenido.

| Imagen RAW | Bytes | SP | Reset |
| --- | ---: | --- | --- |
| `k1_210926_3.bin` | 76288 | `0x20004000` | `0x08010AF5` |
| `v3_210926_3.bin` | 76352 | `0x20004000` | `0x08010B39` |

Estos vectores aportan evidencia de la familia PY32 en las dos imagenes,
distinta de `Reset=0x0000010B` del paquete V1. Un vector dentro de rango y
tamano admisible **no demuestra** compatibilidad con el cargador multiboot.
Las variantes packed son contenedores distintos; no recortar 18 bytes a ciegas.

| Archivo | SHA-256 local |
| --- | --- |
| `k1_210926_3.bin` | `81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82` |
| `v3_210926_3.bin` | `40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4` |
| `k1_210926_3.packed.bin` | `de1d74fd1a3901776c977fb58342264a69ad687c61c58a4063b63e91cd1123bc` |
| `v3_210926_3.packed.bin` | `5ec8598ca8cc5c0df0030137d5fd774bade8569d27b8021fcde147248f088d34` |

No se ha restaurado `calib11.bin` ni se recomienda hacerlo. Las dos copias
tienen 512 bytes y la misma huella, lo que tampoco las convierte en calibracion
original de las dos radios del usuario.

## Configuraciones Karina V3 descritas por el recopilador

| Funcion | Significado descrito | Precaucion/version |
| --- | --- | --- |
| Espectro Delay | Compromiso de tiempo de medida frente a velocidad | Valores menores pueden perder sensibilidad; no copiar un numero «optimo» universal |
| Turbo | Acelera barrido | Puede omitir señales utiles segun la propia nota |
| Roger 5 | Parametro reutilizado por cambios experimentales de RX | El significado cambia: en 21-09-2026 se anuncian aceleraciones permanentes; no tratarlo solo como tono Roger |
| Volumen dinamico | Tratamiento del audio/colas | Ajuste perceptivo, no calibracion RF |
| Captura cercana/lejana | Deteccion automatica de frecuencia | Afecta consumo/latencia; no garantiza localizar una señal ni registrar todas |
| Tres presets | Estados de configuracion desde julio de 2026 segun notas | Incluyen datos propios; no son slots de firmware Armel |
| Beacon/auto-respuesta | Funciones que pueden emitir automaticamente | No se habilitan como configuracion inicial ni para probar la radio |
| SQL ampliado | Notas de julio describen rango 0-15 | No aplicarlo a versiones anteriores sin verificar |
| CHIRP ajustes/teclas | Notas advierten incompatibilidades y bloqueos con NONE | No escribir con driver generico ni copiar valores de otro firmware |

La entrada de 21-09-2026 describe cambios de cierre de squelch AM, aceleracion,
captura y medidas CTCSS/DCS. La de 21-08-2026 describe una correccion de bloqueo
RX relacionada con Roger 5. Son notas del pack, no resultados de ensayo.
El archivo 15-08-2026 esta identificado como de prueba.

El texto del pack incluye borrados, cargas de calibracion e incluso indicaciones
de ignorar errores de verificacion. **No se convierten en instrucciones de esta
web.** Ante un error de verificacion, detenerse, conservar respaldos y comprobar
herramienta/hardware/version; no declarar exito por una nota de terceros.

## Que falta para un port o integracion real

1. Fuentes y licencia exactas del autor para Karina K1/V3.
2. Compilacion reproducible y mapa de memoria.
3. Especificacion/protocolo y compatibilidad real de CFG/calibracion.
4. Verificacion del mecanismo multiboot o implementacion compatible demostrada.
5. Pruebas fisicas de lectura, respaldo, arranque, restauracion y recuperacion.

No se ha portado, compilado ni flasheado Karina a partir de este enlace.
La nueva evidencia corrige la cobertura de hardware, no elimina esos requisitos.

## Fuentes fijadas

- [Arbol completo del pack](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c).
- [Carpeta Karina](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Notas de Karina y archivo de cambios](https://github.com/Dim0s/quansheng-UV-K5v3-K1-firmware-pack/tree/52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/Karina).
- [Egzumer: fuente original distinta](AYUDA-EGZUMER.md).
- [Expediente del paquete Karina V1](KARINA.md).
