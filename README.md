<img src="bricohams-logo.png" alt="Bricohams" width="240" height="89">

# Bricohams Radio Workspace

Dos espacios con conectores propios WebUSB/Web Serial, operaciones locales y respaldo automatico antes de habilitar escrituras.

## Documentacion

| Documento | Contenido |
| --- | --- |
| [Ayuda y soporte](ayuda.html) (en la app: <http://127.0.0.1:8787/ayuda.html>) | Primeros pasos, controladores USB (soporte no oficial), errores frecuentes y preguntas frecuentes |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Componentes, flujo de datos, modulos y capas de seguridad |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisiones de arquitectura y por que se eligio cada tecnologia |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Instalacion, configuracion, actualizacion y despliegues no soportados |
| [docs/BRANDING.md](docs/BRANDING.md) | Marca Bricohams: logotipo, paleta, tipografia y tono |
| [AUTHORS.md](AUTHORS.md) | Autores |
| [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) | Reconocimientos, fuentes y licencias de terceros |
| [SUPPORT.md](SUPPORT.md) / [SECURITY.md](SECURITY.md) | Soporte y reporte privado de vulnerabilidades |

## Arranque

Requiere Node.js 22+. La unica dependencia runtime es `satellite.js` 6.0.1 (MIT), para propagacion orbital SGP4; se sirve desde el equipo, no desde un CDN. En una copia nueva del repositorio:

```powershell
npm ci --ignore-scripts
npm start
```

Abre <http://127.0.0.1:8787>. Usa siempre el mismo origen para conservar el historial IndexedDB. Chrome o Edge de escritorio recomendados. Abrir los HTML como archivos permite consultar las guias, pero el almacenamiento y las APIs pueden variar por navegador. La descarga automatica de firmware necesita este servidor Node local; en un alojamiento estatico se usa el modo web (ver abajo). El servidor rechaza otros Host/origenes: publicarlo exige adaptar deliberadamente el despliegue HTTPS y sus controles de acceso.

## Modo web (GitHub Pages) y modo local

La misma aplicacion se puede usar de dos formas. Al arrancar lee `runtime.json`: si falta o no es valido, funciona en **modo web**; el servidor local lo sirve con `{"mode":"local"}`. La insignia superior muestra «Web · GitHub Pages» o «Local · instalado».

| Funcion | Web (sitio estatico) | Local (`npm start`) |
| --- | --- | --- |
| Conexion a la radio, copias, edicion de codeplug | Si | Si |
| Firmware F4HWN | Catalogo desde `api.github.com`; descargas el archivo en la fuente oficial y lo cargas: se verifica tamano y SHA-256 publicado | Descarga verificada por el servidor |
| Firmware OpenGD77 | ZIP cargado a mano (nombre y formato ZIP comprobados; el editor no publica hash, SHA-256 solo local) | Descarga por el servidor |
| Contactos RadioID | Cargas `user.csv` de radioid.net (max. 100 MiB, filtro por pais/zona, max. 5000 mostrados) | Consulta a la API a traves del servidor |
| Perfil (indicativo + ID DMR) | Opcional, solo en tu navegador; marca «(tú)» | No aplica |
| RepeaterBook | No disponible (solo version instalada) | Si, con tu token aprobado |
| Satelites | `data/satellites.json` generado a diario desde SatNOGS | TLE en directo |

Los datos de satelites cubren NORAD 25544, 27607, 43017 y 43678 (SatNOGS DB / Libre Space Foundation, CC BY-SA 4.0); se avisa si tienen mas de 7 dias. Para publicar tu propia copia en GitHub Pages, ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Instaladores locales

Descarga la [ultima Release](https://github.com/anatolbricoham/Radio-Web-install/releases/latest) y su archivo `SHA256SUMS`. Elige un instalador de **Assets**, no los ZIP/tar.gz automaticos de «Source code». [Guia completa de instalacion local](docs/DEPLOYMENT.md#instaladores-locales).

- Windows 11 x64: extrae todo `*-windows-x64.zip`, abre PowerShell en esa carpeta y ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1`. Node.js incluido, sin administrador; inicia la app desde el menu Inicio.
- Debian, Ubuntu y Raspberry Pi OS: consulta `dpkg --print-architecture`, descarga **solo** el `.deb` de tu arquitectura (amd64, arm64 o armhf) y ejecuta `sudo apt install ./nombre-del-paquete.deb`. Node.js incluido; armhf requiere CPU ARMv7 o posterior. Abre la app desde el menu o ejecuta `bricohams-radio`.
- Arch Linux: instala `base-devel` y `nodejs` con pacman, extrae `*-arch.tar.gz`, revisa `PKGBUILD` y ejecuta `makepkg -si` como usuario normal. Inicia con `bricohams-radio`.
- FreeBSD 14 amd64: extrae `*-freebsd-amd64.tar.gz`, entra en la carpeta y ejecuta `su -c './install.sh'` (instala Node 22 con `pkg` si falta). Inicia con `bricohams-radio` como usuario normal.

Comprueba el SHA-256 antes de instalar. Los lanzadores abren el navegador predeterminado y mantienen el servidor en segundo plano solo en `127.0.0.1:8787`. Si tu navegador predeterminado no es compatible, abre esa direccion en Chrome, Edge o Brave. Cerrar la pestana no detiene el servidor; no hay arranque automatico tras reiniciar el equipo. Usa siempre el mismo navegador, perfil y origen para conservar tus copias. Los controladores USB se configuran aparte: [Ayuda](ayuda.html#drivers). En FreeBSD el soporte WebUSB/Web Serial de Chromium no esta garantizado.

## Estado real del soporte

| Familia | Lectura real | Modificaciones | Limites |
| --- | --- | --- | --- |
| OpenGD77 MK22 | Identificacion, calibracion 4096 B, codeplug estandar 128 KiB | Implementacion de escritura CPS incluida, **bloqueada por politica de respaldo** | No existe aqui un protocolo verificado para extraer el firmware MCU completo. No se simula esa copia ni se desbloquea con un firmware descargado. |
| OpenGD77 STM32 | Identificacion, calibracion 512 B, codeplug estandar 128 KiB | Igual: escritura bloqueada | Modo normal CDC OpenGD77, no DFU. Estructuras desconocidas se rechazan. |
| DM-32 / UV008 con OpenGD77 | Las mismas operaciones a 115200 baudios con Web Serial | Igual: escritura bloqueada | No boot ROM, microcodigo ni flasheo del firmware stock. |
| Quansheng UV-K1 / UV-K5 V3 PY32F071 con F4HWN v6+ | Identificacion, calibracion 512 B, consulta de slots y CRC | Instalar/borrar slots 1-4 y restablecer bancos 1-4, **solo tras copia completa verificada** | El respaldo Flash fisico requiere Labs v6.1+ con comandos 0x0738. En otras ediciones se conserva la calibracion y se bloquean escrituras si no puede completarse. |

No hay paridad completa con grid.radio ni UV Studio. No se implementan aqui flasheo DFU, restauracion de calibracion, aplicaciones Labs, visor Quansheng, cuentas ni edicion de zonas. Cambiar firmware en Multiboot o seleccionar SetCfg se hace en la propia radio; no hay un comando remoto inventado.

## Codeplug: contactos, repetidores y satelites

Ambas paginas incluyen un panel **Codeplug: contactos, repetidores y SAT**. No se consulta ningun proveedor al abrirlas. Las consultas son acciones explicitas y pasan por el servidor local; no se envian codeplugs, calibracion ni identificadores de la radio.

### Contactos RadioID / OpenGD77

1. Abre un codeplug estandar de 128 KiB en el editor o lee el de tu radio.
2. Selecciona **Contactos DMR**, introduce el pais en el idioma del proveedor (p. ej. `Spain`) y, opcionalmente, el estado/provincia (`Madrid`).
3. Busca en la [API de RadioID](https://radioid.net/api/dmr/user/). Se carga una pagina por accion; los botones anterior/siguiente recorren todas las paginas disponibles. El filtro de texto actua solo en la pagina visible, no en toda la base.
4. Selecciona contactos de las paginas necesarias y anadelos al archivo local. La seleccion se conserva al cambiar de pagina; el contador incluye todas las paginas seleccionadas.
5. Guarda el binario modificado usando **Guardar binario 128 KiB**. Opcionalmente guarda la seleccion de contactos en JSON.

Se anaden **contactos digitales privados** por indicativo/ID (capacidad total: 1024), no la base masiva de identificacion de llamadas, ni talkgroups. Se deduplican los ID privados existentes, se respetan los indices de contactos ya presentes y no se sobrescribe ninguno. Errores o falta de espacio abortan el lote sin modificar el archivo original. Los nombres se limitan al formato ASCII del codeplug. Quansheng no admite contactos DMR.

### Repetidores RepeaterBook

Fuente: [API oficial y politica de acceso](https://www.repeaterbook.com/wiki/doku.php?id=api). **Data courtesy of RepeaterBook.com.**

Desde marzo de 2026 no es una API abierta: requiere aprobacion de **esta aplicacion** y token individual asociado para aplicaciones distribuidas. Tener un token de otra aplicacion no autoriza esta. No se hace scraping, no se incluyen registros RepeaterBook en el repositorio ni se descarga la base sin permiso. Esta integracion es para programacion personal/autorizada, no para crear un directorio alternativo ni redistribuir datos.

Si RepeaterBook aprueba tu uso de esta aplicacion, configura estas variables en el mismo PowerShell donde arrancas el servidor:

```powershell
$env:RB_APPROVED = "yes"
$env:RB_USER_TOKEN = "<tu token individual rbuapp_ asociado a esta aplicacion>"
$env:RB_APPROVED_USER_AGENT = "<el User-Agent aprobado con nombre/version y correo real de contacto>"
npm start
```

No pegues el token en el chat, el navegador, una URL, un commit o un archivo publico. El programa no lee `.env`; si eliges guardar variables por tu cuenta, protege ese archivo. No acepta tokens compartidos `app_` en este despliegue distribuido. Una variable de aprobacion solo expresa tu configuracion: el proveedor valida la autorizacion real. Ante HTTP 429 no se reintenta automaticamente y se impone un enfriamiento minimo de 15 minutos.

En la interfaz puedes consultar por pais/zona y modo (FM; tambien DMR en OpenGD77), o abrir un JSON de exportacion RepeaterBook que tengas autorizacion para usar (`results`, hasta 8 MiB). EE.UU., Canada y Mexico requieren el ID de estado/provincia RepeaterBook. El filtro de zona, texto y banda se aplica a los resultados visibles; los registros sin confirmacion del modo, fuera de rango, no operativos o corruptos se excluyen **con recuento y ejemplos del motivo**.

- **OpenGD77:** elige una plantilla existente del mismo modo del lote y anade a posiciones libres. No se crean valores binarios arbitrarios ni se reordenan canales. Se importan nombre, RX/TX nominal y Color Code cuando corresponda; los otros ajustes vienen de la plantilla. **Todos los canales nuevos quedan solo RX y sin tonos RX/TX heredados.** DMR conserva TS/contacto/lista RX de la plantilla: no se inventa un talkgroup ni un TS del repetidor. Revisa esos parametros en el CPS antes de habilitar TX. Guarda el binario local.
- **Quansheng:** solo FM; exporta CSV CHIRP con `Duplex=off` (TX desactivada). El TX nominal y tono del proveedor se conservan como comentario para revision. El CSV es un archivo de intercambio, **no** un volcado ni una instalacion. Importalo en una herramienta cuyo controlador admita exactamente tu modelo y firmware; el nombre Quansheng no garantiza compatibilidad con cualquier controlador UV-K5. Los proyectos JSON son datos locales, no formatos nativos de las radios.
- Solo se preparan frecuencias VHF 136-174 y UHF 400-470 MHz. Selecciona la banda real de tu unidad: radios monobanda, revisiones distintas y restricciones regionales pueden admitir menos. No se promete compatibilidad universal.

### SAT y proximos pases

1. Selecciona **SAT / pases**, introduce un NORAD y el proveedor orbital: [SatNOGS DB](https://db.satnogs.org/) o [CelesTrak](https://celestrak.org/NORAD/elements/).
2. **Actualizar elementos orbitales** descarga el TLE mas reciente disponible. Se verifica checksum, NORAD, epoca y propagacion. Se rechazan elementos con mas de siete dias, con mas de 24 h en el futuro o cuya ventana de prediccion supere siete dias desde la epoca. No se sustituye un error por otro proveedor o elementos antiguos.
3. **Consultar frecuencias SatNOGS** ofrece frecuencias puntuales FM/FM estrecha activas, confirmadas y dentro de VHF/UHF. Los modos de datos, USB/LSB y transpondedores lineales no se convierten a canales FM. Los recuentos de excluidos son visibles. Los datos son comunitarios y pueden no reflejar el estado operativo actual: comprueba al operador del satelite.
4. Autoriza el uso local de posicion y escribe latitud/longitud/altitud o pulsa **Usar mi ubicacion**. Solo entonces se pide permiso al navegador. No se envian coordenadas a los proveedores ni se guardan automaticamente.
5. Calcula los pases de las proximas 24/48 horas por encima de la elevacion minima elegida. Se usa SGP4 local con posicion del observador, muestras de 5 s y cruces refinados a 0,5 s. Se muestran inicio, maximo, fin, elevacion y azimuts en **UTC**. Se indican los pases ya en curso o truncados por la ventana. Sin relieve, refraccion atmosferica ni garantia de precision de campo.
6. Puedes exportar un plan JSON (**incluye tu posicion**, consentimiento obligatorio) y el TLE junto a un JSON de procedencia/licencia. Comprueba que el navegador haya guardado ambos archivos del TLE. El plan se invalida al cambiar los parametros y requiere recalcular despues de 15 minutos. Un canal SAT FM preparado es solo RX nominal: no controla Doppler ni habilita un enlace ascendente.
7. **Canales Doppler (Quansheng UV-K5 V3 / UV-K1 y OpenGD77):** elige un pase calculado y entre 1 y 10 canales. La desviacion Doppler del pase (velocidad radial SGP4) se divide en saltos de frecuencia iguales. Cada canal se sintoniza, en pasos de 10 Hz, al centro de su salto y se usa durante la ventana UTC en que la frecuencia recibida cae en ese salto; las ventanas son mas cortas cerca del maximo acercamiento. Cada canal indica su ventana y su error maximo, que es la mitad de un salto. En un pase de la ISS sobre Madrid, con 5 canales, el error queda por debajo de 0,7 kHz a 145,8 MHz y de 2 kHz a 437,8 MHz. Son solo RX: cambia de memoria a la hora indicada. La radio no sigue el Doppler sola y no se generan subidas TX.

SatNOGS DB / Libre Space Foundation: atribucion de datos [CC BY-SA 4.0](https://wiki.satnogs.org/SatNOGS_DB); sus TLE pueden indicar fuentes orbitales de terceros. Los JSON/CSV derivados conservan atribucion y enlace de licencia. La dependencia SGP4 incluye su licencia MIT en el paquete instalado.

7. **OpenGD77: lista SAT nativa en el codeplug local.** Tras abrir/leer un codeplug de 128 KiB, **Cargar satelite en lista SAT del codeplug local** escribe el satelite en el bloque de datos personalizados **tipo 3** (offset `0x1EE60`, 25 registros de 100 bytes: nombre de 8 caracteres, campos TLE empaquetados por nibbles, frecuencias LE), con el mismo formato que el CPS oficial. Se conservan los satelites existentes (se reemplazan por nombre y se ordenan), la cabecera `OpenGD77` y los demas bloques (imagen de arranque, melodia, tema). Si la zona no tiene cabecera y no esta borrada (`0xFF`), o la cadena de bloques es incoherente, la operacion se cancela sin modificar el archivo. Solo se guarda la bajada (RX1); subida, CTCSS y APRS quedan a cero. **Ver satelites del codeplug** decodifica la lista. Guarda el binario y aplicalo con el CPS oficial: la escritura directa a la radio sigue bloqueada hasta tener respaldo MCU completo.

**Limites de instalacion:** no se ha implementado un formato/protocolo nativo SAT para F4HWN ni la escritura de sus canales de configuracion; se exporta TLE/plan y CSV CHIRP solo RX. La lista SAT OpenGD77 se modifica en el binario local, no en la radio. La escritura OpenGD77 permanece bloqueada hasta verificar una copia completa del firmware MCU, como exige la politica de proteccion. Las nuevas consultas/importaciones no generan permisos de escritura. No hay validacion con radios fisicas.

## Descargas oficiales de firmware

En cada pagina, pulsa **Consultar modelos oficiales**, selecciona el modelo y revision exactos y consulta el catalogo estable. En Quansheng, **Consultar versiones estables** muestra el historial reconocido de los dos proyectos, ordenado de mas reciente a mas antiguo dentro de cada proyecto. No se consulta Internet al abrir la pagina. La seleccion de familia OpenGD77 no identifica por si sola el modelo de destino: verifica la etiqueta del equipo, potencia y revision de hardware.

- **F4HWN UV-K1 / UV-K5 V3:** [Releases de Armel](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases), historial estable v4.x/v5.x/v6.x reconocido. Incluye Fusion y, en v6, FieldOps, Labs y Transfer. Los binarios v4 se filtran por hardware K1/K5 V3. Las variantes SA818 se identifican expresamente. Solo F4HWN v6.x sin SA818 puede prepararse para slots; las versiones anteriores y SA818 son **solo descarga**.
- **ARDF UV-K1 / UV-K5 V3:** [Releases del proyecto reald](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases), versiones estables con etiqueta `ARDF-K5v3_K1-v...` y binario conjunto reconocido (incluidas v0.5 y v0.5.1). Son **solo descarga**: no se afirma compatibilidad Multiboot ni se habilita el conector para ARDF.
- Ambos proyectos Quansheng exigen tamano y SHA-256 publicados por GitHub; el servidor y el navegador verifican los bytes. Se pagina el historial (hasta 1000 publicaciones por proyecto; superar el limite produce un error explicito). Un error en cualquiera de las fuentes cancela la consulta, sin mostrar un catalogo parcial. No se ofrecen betas, desarrollo, firmware original de procedencia no verificada, binarios locales compilados ni modelos V1/V2. No se copian los archivos de las carpetas locales al sitio. Verificar un hash no equivale a firma digital ni certificacion de compatibilidad.
- **OpenGD77:** solo [servidor oficial](https://www.opengd77.com/downloads/releases/), ultima carpeta estable `RYYYYMMDD` por familia y archivos reconocidos para el modelo. MD-9600 distingue V1/V2/V4/V5 y MD-UV380 distingue 10W PLUS. Se conserva el ZIP original: **no se flashea ni se trata como codeplug**. El indice oficial no publica un hash: se comprueban HTTPS, tamano y firma de formato ZIP, y se calcula SHA-256 local. No se afirma verificacion criptografica del editor ni se descomprime/valida cada archivo del ZIP.
- MD-380, DM-32 y UV008 no se ofrecen mientras no haya una fuente de activos confirmada. No se inventan enlaces ni se recurre a mirrors.

Las descargas pasan por una API del servidor local con destinos fijos, redirecciones restringidas, limites de bytes/tiempo y dos descargas simultaneas como maximo. Los catalogos caducan a los diez minutos; repetir la consulta dentro de ese plazo usa la cache. Las respuestas de error se muestran sin sustituirlas por archivos o versiones ficticias. No se aceptan URLs del usuario ni se escriben los firmware en el disco del servidor. La fuente oficial recibe la peticion de descarga del equipo, pero no recibe calibracion, backups, codeplugs ni identificadores de la radio.

Tras descargar puedes guardar un manifiesto de procedencia con modelo, version, URL, tamano, hashes y limitaciones. Comprueba que el navegador haya guardado ambos archivos. Solo un BIN F4HWN verificado y con modelo coincidente permite **Preparar imagen para slot**; esto no instala nada. Cambiar el modelo limpia la imagen preparada. La instalacion mantiene todas las barreras de respaldo y confirmacion; una descarga nunca reemplaza la copia del firmware que ya contiene la radio.

El editor OpenGD77 abre binarios de exactamente 131072 bytes y modifica canales existentes FM/DMR (nombre ASCII, RX, TX, modo, Color Code, TS y solo RX), preservando otros campos. Tambien permite anadir canales por plantilla explicita y contactos privados mediante el panel de proveedores. No importa el JSON del CPS, no crea canales con ajustes arbitrarios y no maneja canales extendidos 1025+. La validacion BCD no sustituye la comprobacion de bandas del modelo ni la autorizacion para transmitir.

Las lecturas OpenGD77 no envian el comando de guardar ajustes/VFO ni reinician el equipo: leen los valores ya persistidos, no fuerzan a guardar modificaciones aun presentes en RAM.

## Copias automaticas y proteccion del equipo

1. Seleccionar modelo y autorizar lectura local.
2. Conectar: se identifica la radio y comienza automaticamente el respaldo.
3. Guardar calibracion en IndexedDB, calcular SHA-256 y releer para comprobar persistencia.
4. Quansheng: leer **los 2 MiB de Flash externa** y comparar su CRC-32 completo con el calculado por la radio (`0x073E`, Labs con soporte CRC fisico). Si el firmware no ofrece esa verificacion o no coincide, se bloquea la escritura. A 38400 baudios puede tardar 10-20 minutos o mas. La barra muestra el avance real por bytes.
5. Extraer la imagen `Main` desde slot 0 y verificar cabecera, tamano y CRC-32. Comparar la calibracion logica con la fisica.
6. Persistir el resultado y verificar otra vez todos los SHA-256. Solo entonces se entrega un permiso de escritura ligado a la conexion.
7. Solicitar una descarga automatica `.rwb.json` con manifiesto, archivos Base64, tamanos y hashes. El navegador puede bloquearla: comprobar Descargas y repetir desde el historial.

**Que significa firmware base:** `Main` es la aplicacion que el firmware guarda tras la instalacion normal. Se copia toda la imagen descrita por su cabecera (hasta 118 KiB). No es necesariamente el firmware actualmente seleccionado y **no incluye el bootloader interno de fabrica** ni otros bytes del MCU. Este protocolo no permite afirmar una copia completa de todo el chip. Si Main falta o su CRC no coincide, no se habilita escritura.

OpenGD77 conserva calibracion y codeplug, pero marca el respaldo **parcial** porque falta la extraccion completa del firmware interno. La aplicacion no confunde un codeplug con un firmware.

Ante errores de transporte, CRC, cuota, lectura o almacenamiento, no hay permiso de escritura. Antes de cada modificacion se relee el respaldo guardado y se compara con los hashes originales del permiso: eliminarlo o corromperlo tambien revoca la escritura. Un cable retirado, una reconexion u otra radio invalidan el permiso. Cada nueva conexion exige nueva copia. Las escrituras son exclusivas, Main no es seleccionable como destino, los bytes de imagen van antes que la cabecera y se verifica el CRC tras instalar. Borrar firmware y restablecer banco son acciones distintas con confirmacion escrita.

No desconectes ni cierres el navegador durante una operacion. No conectes simultaneamente una herramienta externa al mismo puerto. Las herramientas originales enlazadas **no heredan estas barreras**.

## Seguridad de los datos

- Sin telemetria, cuentas, CDN ni envio de archivos de la radio a servidores. `satellite.js` se instala localmente desde npm con version fijada y lockfile.
- Las copias quedan en el perfil del navegador del equipo; no estan cifradas por esta aplicacion. Pueden contener identificadores, canales, configuraciones y otros datos privados. Protege el perfil y los archivos con las medidas de tu sistema operativo.
- IndexedDB no es un archivo externo garantizado para siempre. Exporta las copias; borrar datos del navegador o usar otro origen pierde el acceso al historial. Se solicita almacenamiento persistente cuando el navegador lo permite.
- Una copia parcial/fallida conserva los archivos ya confirmados en el historial. No borres esas copias.
- El servidor sirve solo una lista fija de archivos de la aplicacion, escucha solo en `127.0.0.1` y envia CSP, Permissions-Policy, `nosniff` y `no-referrer`. No sirve configuracion del editor, tests ni rutas arbitrarias.
- Los metadatos de radio y archivos se muestran como texto, no como HTML. No se usa `eval`.
- SHA-256 detecta corrupcion accidental, no demuestra autenticidad de firmware. Usa imagenes de una fuente de confianza. Ningun software puede garantizar seguridad absoluta o recuperacion ante fallos electricos.

## Tests y validacion

```powershell
npm test
npm run check
```

Las pruebas de `tests/connectors.test.cjs` emplean dispositivos simulados: fragmentacion de bytes, tramas, CRC, calibracion, mapas por familia, backup completo, persistencia fallida, permisos, slots, reset, proteccion de Main, verificacion posterior y edicion binaria. El codificador de escritura OpenGD77 se ejercita con una VM aislada que sustituye la barrera solo dentro del test; el codigo de produccion no se desbloquea. No se escribe en hardware.

`tests/firmware.test.cjs` comprueba fuentes y redirecciones permitidas, catalogos estables por modelo, limites, hashes, formatos, cache, caducidad, concurrencia, verificacion independiente del navegador y rutas/privacidad del servidor. Emplea respuestas de red simuladas y un servidor efimero local; no depende de Internet ni descarga firmware en cada ejecucion.

`tests/planning.test.cjs` verifica importacion atomica de canales/contactos y limites, bloque SAT OpenGD77 tipo 3 byte a byte frente al formato del CPS (inicializacion, preservacion de bloques, reemplazo, rechazo de zonas corruptas/no vacias, TLE invalidos y mas de 25 satelites), preservacion de bytes, IDs BCD, deduplicacion, filtros, CSV solo RX, rechazo de modos satelitales incompatibles, checksum/edad TLE, propagacion SGP4 contra un vector independiente de Vallado, ventanas/cruces de elevacion, paginacion RadioID, credenciales server-only RepeaterBook, enfriamiento por HTTP 429 y aislamiento de las API. Ningun test usa credenciales reales, escribe radios ni consulta RepeaterBook.

`tests/site.test.cjs` verifica la marca, el favicon y la ausencia de scripts/estilos en linea en todas las paginas; que el servidor sirve la ayuda y el logotipo con su tipo y cabeceras; las anclas y enlaces locales de la ayuda; que cada mensaje de la tabla de errores existe literalmente en el codigo; los enlaces relativos de toda la documentacion; la licencia, la autoria y los metadatos del paquete; y la ausencia de correos, secretos y caracteres corruptos.

Tambien se comprueban en navegador la interfaz de escritorio/movil, los estados deshabilitados y el almacenamiento IndexedDB. **No hay radio fisica disponible en esta sesion.** No se certifica compatibilidad de campo ni funcionamiento del 100% de los equipos. Antes de usar escrituras en un equipo valioso se necesita validar con hardware de prueba y un procedimiento de recuperacion conocido.

## Referencias de interoperabilidad

Implementacion independiente a partir de los formatos de protocolo inspeccionados; no se distribuyen el codigo de las referencias ni sus firmware.

- [OpenGD77 CPS](https://grid.radio/opengd77/), protocolo `C` / `R` / `W` / `X`, modos y mapa del codeplug.
- [UV Studio](https://armel.github.io/uvstudio/).
- [UART del firmware F4HWN](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/app/uart.c), contratos de mensajes y respuestas.
- [Formato y mapa Multiboot](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/driver/mb_flash.h).
- [Multiboot y Multiconfig](https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig).

Consulta realizada el 18 de octubre de 2026. Firmware y protocolos pueden cambiar; se falla de forma explicita ante formatos desconocidos.

## Licencia

Copyright (C) 2026 Anatol-Emilio Lopez-Maitchovcow (Bricohams).

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los terminos de la [GNU General Public License](LICENSE) version 3 o (a tu eleccion) cualquier version posterior (GPL-3.0-or-later). Se distribuye **sin ninguna garantia**. Las dependencias y fuentes de terceros mantienen sus propias licencias: ver [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

Bricohams no esta afiliado a OpenGD77, grid.radio, F4HWN, Quansheng, RadioID, RepeaterBook, SatNOGS ni CelesTrak. Las marcas pertenecen a sus propietarios.
