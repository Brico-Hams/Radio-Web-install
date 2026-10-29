# Bricohams Android Beta

## Alcance de la APK

La pantalla principal permite elegir **Idioma del sistema**, **Español**, **English (US)**,
**Français** o **Deutsch**. La seleccion se guarda localmente y se aplica a todas las
pantallas, incluidos canales USB, CAT, satelites y SSTV. Cambiar el idioma no traduce
indicativos, nombres de canales ni archivos del usuario; la marca sigue siendo Bricohams.

La [validacion integral V3/Android](VALIDACION-INTEGRAL-V3-ANDROID.md) distingue
pruebas host de ensayos en telefono/radio e incluye la matriz de contactos,
canales por slot y CAT. La auditoria esta en curso, no certificada.

Aplicacion nativa Kotlin para Android 8.0/API 26 o posterior, sin servidor
ni cuentas. Al abrir Satelites actualiza automaticamente TLE y frecuencias
por HTTPS si no hay catalogo o tiene al menos 24 h; se puede desactivar en
Ajustes. No envia tu ubicacion a CelesTrak ni SatNOGS. Es una implementacion independiente: no
incluye codigo ni recursos de Look4sat, Robot36 o HAMRS.
La version `0.9.0-beta` no sustituye sus funciones completas.

Esta revision conserva las funciones de 0.8.0 y prepara APK nuevas con
versionCode 13. La compilacion, lint y pruebas Android de esta integracion
requieren JDK 17 y SDK 35; no se han ejecutado con exito en el entorno local
con Java 8. La CI debe verificarlas antes de distribuir la APK.
Al publicar mas adelante la etiqueta v0.5.2, Android Beta adjuntara la APK
debug y la APK instrumentada 0.9.0-beta con SHA256SUMS-android a la Release
creada por el flujo de instaladores. No se publica nada desde el entorno local.

| Funcion | Estado |
| --- | --- |
| Contactos del libro de guardia | Libros por actividad (General, POTA, SOTA) con entrada rapida: indicativo, frecuencia/banda, modo y RST, UTC automatico; buscar, editar y borrar con confirmacion; SQLite local |
| Intercambio de contactos | ADIF ASCII por libro (BAND, STATION_CALLSIGN, MY_POTA_REF/MY_SOTA_REF), importacion con vista previa al libro actual, JSON UTF-8 y restauracion de copia JSON |
| LoTW | Exportar ADIF para TQSL en ordenador; no hay firma ni subida desde Android |
| ARDF | Sesiones persistentes, balizas 1-10, historial, contadores, intervalos por baliza y suma filtrada de segmentos GPS |
| GPS | Posicion puntual del telefono, con precision y hora de la fijacion, previa autorizacion |
| Exportacion ARDF | JSON con sesiones, observaciones, contactos y coordenadas cuando existen |
| Morse de texto | Puntos/rayas; espacios entre letras y `/` entre palabras |
| Morse desde archivo de audio | WAV PCM mono 16 bits experimental, tono/velocidad configurados |
| Microfono | Captura en primer plano hasta 60 s y decodificacion posterior Morse/Robot36; sin escucha ni decodificacion continua |
| USB/CAT RX | CDC ACM y adaptadores USB-serie reconocidos de un puerto, identificacion F4HWN v6+, consulta, sintonia temporal confirmada y STOP; experimental |
| CAT TX (PTT) | Envio Robot36 con PTT por lease armada en la radio (tecla 9), indicativo obligatorio, limite de 120 s, rechazo por TX lock y bandas; experimental |
| Satelites | Pantalla Bricohams al estilo Look4sat: TLE de CelesTrak y frecuencias de SatNOGS con actualizacion automatica opcional (o TLE importado), pases 24 h de los satelites elegidos con cuenta atras, radar polar, mapa mundial offline con huellas y trazas, Doppler RX por CAT, grabacion del pase a WAV y busqueda de imagenes Robot36 en la grabacion |
| SSTV Robot36 | Decodificacion de WAV o captura de microfono, tambien con CAT sintonizando, y codificador Robot36 para enviar por PTT CAT; experimental |
| Escritura de canales, subtonos y potencia | Editor de canales FM F4HWN v6 por USB con respaldo completo y relectura |

La interfaz usa el PNG original Bricohams y acento naranja sobre fondo oscuro.
El icono mantiene la marca original en lugar de inventar una variante; lint
advierte de su silueta no convencional de lanzador. No se ha cambiado aun
la paleta de la web: su migracion final sigue pendiente.

## Instalacion y datos

La APK de desarrollo esta firmada con la clave debug de la herramienta Android,
no con una identidad de distribucion Bricohams. Verifica el SHA-256 publicado
con ella. No es una version de Google Play ni una entrega estable.
Android solicitara autorizar la instalacion desde la aplicacion que abra el APK.
No instala controladores ni modifica la radio.
Las ordenes CAT RX opcionales cambian temporalmente la sintonia de recepcion,
no la programacion persistente de la radio.

Los datos se guardan en una base SQLite privada de la aplicacion. No hay
telemetria, servicio de ubicacion en segundo plano ni subida de datos. El
permiso INTERNET solo se usa para descargar por HTTPS, al pulsarlo, los TLE
de CelesTrak y las frecuencias de SatNOGS; no se envian datos propios. La copia automatica y transferencia de datos del sistema
estan desactivadas en el manifiesto/reglas de extraccion.
**Exporta antes de desinstalar:** desinstalar borra los datos locales.
Al actualizar desde una version sin libros (esquema SQLite 1), la aplicacion
copia primero la base intacta a `bricohams-v1-backup.db` en su carpeta privada
y despues migra en una transaccion: los contactos existentes pasan al libro
General. Si la migracion falla, la base queda en la version 1 sin cambios.
La restauracion JSON se inicia desde Inicio y nunca elimina datos existentes.

Las exportaciones usan el selector de archivos Android; no requieren acceso
general al almacenamiento. El proveedor elegido puede ser remoto: escoger
una nube implica compartir el contenido con ese proveedor. El JSON contiene
datos personales y ubicaciones; revisa su destino y no lo publiques.
No se pide ni almacena un certificado LoTW.

## Libro de guardia

Los contactos se agrupan en libros por actividad, al estilo de un cuaderno
de campo: un libro General (siempre existe) y los que crees con plantilla
General, POTA o SOTA. Es una implementacion propia; no usa codigo ni
recursos de HAMRS y no declara paridad con esa aplicacion.

1. Abre Guardia. Arriba se muestra el libro actual; Cambiar de libro elige otro.
2. Para una activacion, al final de la seccion crea un libro: nombre,
   plantilla, referencia (POTA `EA-0123`, SOTA `EA4/MD-001`; vacia en General)
   y tu indicativo de estacion, obligatorio en POTA/SOTA. Queda seleccionado.
3. Entrada rapida: indicativo, frecuencia MHz, modo y RST. Al cambiar de modo,
   un RST sin tocar pasa a 59 (fonia) o 599 (CW/RTTY). Deja UTC vacio y se
   usa la hora actual al pulsar Guardar, en segundos. Tras guardar se vacian
   indicativo y notas y se conservan frecuencia y modo para el siguiente QSO.
4. La lista muestra los 50 ultimos del libro con su banda ADIF; exportar
   incluye todo el libro. Editar abre el contacto con su ID original; guardar
   no crea un duplicado. Eliminar requiere confirmacion y no puede deshacerse.
5. Exporta ADIF de este libro para intercambio/TQSL/POTA/SOTA o JSON completo
   para conservar todo el texto. En POTA el nombre propuesto es
   `INDICATIVO@PARQUE-AAAAMMDD.adi`.

Duplicados: al guardar, si el libro ya tiene el mismo indicativo en la misma
banda ADIF (o la misma frecuencia fuera de bandas) y el mismo modo, se avisa
antes de escribir nada. En POTA/SOTA solo cuenta como duplicado dentro del
mismo dia UTC; en General, en todo el libro. No guardar descarta ese registro
y conserva el formulario; Guardar igualmente lo agrega (por ejemplo, para
repetir un contacto dudoso). El indicativo se compara exacto: `EA2XYZ` y
`EA2XYZ/P` son distintos. La importacion ADIF no usa esta regla, sino la de
campos identicos descrita abajo.

No hay mapas, consulta de indicativos en linea ni subida a POTA/SOTA:
el archivo se sube a mano. No se pueden renombrar
ni borrar libros; sus contactos si.

La fecha se interpreta como instante ISO; ADIF la convierte a UTC. Las
frecuencias admitidas por el formulario, 0.1-1300 MHz, no son autorizacion
para transmitir. Los modos de una entrada no afirman que la radio los soporte.
Los formularios aun sin guardar se descartan al cambiar de seccion.
La rotacion conserva los campos de la seccion actual mediante el estado Android.

ADIF incluye CALL, QSO_DATE, TIME_ON, BAND, FREQ, MODE, RST_SENT, RST_RCVD y
COMMENT; en libros con indicativo de estacion, STATION_CALLSIGN, y en POTA o
SOTA, MY_POTA_REF o MY_SOTA_REF. BAND se deduce de FREQ con la tabla ADIF 3.1.4
y se omite fuera de bandas (por ejemplo 149 MHz).
La exportacion ASCII rechaza notas con acentos, saltos de linea u otros
caracteres no admitidos: no los elimina ni los sustituye silenciosamente.
JSON conserva UTF-8. La exportacion no certifica que LoTW acepte un contacto;
firma, subida, respuesta del servicio y confirmacion son pasos distintos.

### Buscar contactos

Desde Guardia introduce, dentro del libro actual, parte del indicativo, notas, modo, frecuencia o UTC
y pulsa Buscar contactos. La comparacion no distingue mayusculas; no elimina
acentos ni interpreta rangos/expresiones regulares. Se muestran el total
coincidente y las 50 coincidencias mas recientes. Mostrar todos los contactos
quita el filtro. La busqueda aplicada sobrevive a rotacion; pulsar Buscar
vuelve a crear el formulario y descarta cambios de edicion aun no guardados.
Exportar ADIF siempre incluye todo el libro, no solo las coincidencias.

### Importar ADIF con vista previa

Desde Guardia pulsa Importar ADIF a este libro (vista previa); los contactos
se agregan al libro seleccionado. El selector permite cualquier
archivo, pero se valida ADIF de texto ASCII, hasta 16 MiB y 50000 contactos.
Se limita cada cabecera o registro a 512 campos.
No admite ADX/XML, UTF-8 ni otros formatos binarios. La lectura respeta la
longitud declarada: texto como `<EOR>` dentro de COMMENT no acaba el registro.
Se admite cabecera con EOH o registros sin cabecera, etiquetas sin distinguir
mayusculas y sufijos de tipo ADIF. Cada registro debe terminar en EOR.

Campos requeridos: CALL, QSO_DATE (YYYYMMDD), TIME_ON (HHMM o HHMMSS),
FREQ en MHz, MODE, RST_SENT y RST_RCVD. COMMENT es opcional. Se aplican los
mismos limites de contactos que al introducirlos a mano; modos como FT8
no se convierten silenciosamente a otros. Una hora HHMM se representa con
segundos 00. El formato no conserva fracciones de segundo al exportar.
No se deduce frecuencia desde BAND ni se inventan informes ausentes. Un BAND
que coincide con el deducido de FREQ se considera conservado; si contradice
FREQ se avisa como campo no conservado. MY_POTA_REF, MY_SOTA_REF y
STATION_CALLSIGN se avisan como no conservados: elige antes el libro adecuado.

La vista previa muestra el numero de contactos y **campos no conservados**,
por ejemplo BAND, SUBMODE, GRIDSQUARE o datos de confirmacion LoTW. Los
metadatos de cabecera no se incorporan a los contactos. Conserva el archivo
original: esta importacion no es un reemplazo sin perdida de cualquier ADIF.
Cancelar no guarda nada. Un archivo mal formado o registro invalido cancela
todo antes de ofrecer la importacion. Etiquetas duplicadas, fechas imposibles
y longitudes truncadas son errores explicitos.

Al aceptar se agrega todo en una transaccion SQLite. Si falla una insercion,
se revierte el conjunto. Se omiten registros cuyos campos conservados sean
identicos a otro existente o del mismo archivo: libro, indicativo, instante
UTC, frecuencia numerica normalizada, modo, ambos informes y notas. Si alguno
difiere se agrega un nuevo contacto, nunca se sobrescribe por indicativo/hora.
Los IDs internos se generan de nuevo; no se usan IDs externos de ADIF.
Reimportar el mismo contenido no duplica los contactos identicos. Campos
no conservados no forman parte de la comparacion. Exporta antes una copia
JSON y revisa los contadores de resultado.

Manten abierta la pantalla hasta aceptar la vista previa. Rotar/cerrar antes
de aceptar descarta la vista previa sin guardar. Una importacion ya aceptada
puede terminar en segundo plano aunque se cierre esa pantalla; consulta
el libro antes de repetirla. No hay servicio de importacion persistente.

### Restaurar una copia JSON

Desde Inicio, pulsa Importar copia JSON Bricohams y selecciona una copia
version 2 (con libros) o version 1 (anterior; sus contactos van al libro
General) exportada por esta aplicacion. La exportacion actual es version 2. El archivo admite hasta 16 MiB
y 50000 registros por tabla. Se valida UTF-8, formato, campos, IDs,
contactos, fechas, coordenadas y referencias entre sesiones/observaciones.
No importa ADIF ni JSON de otras aplicaciones.

La importacion es una transaccion: cualquier error revierte todos sus
cambios. Los IDs nuevos se agregan; los registros identicos se conservan
sin duplicar. Un ID existente con contenido distinto cancela la importacion,
sin sobrescribirlo. No se fusionan sesiones distintas por nombre. La
respuesta muestra cuantos registros nuevos se incorporaron. No es una
restauracion destructiva ni una sustitucion completa de la base.

## ARDF y GPS

1. Crea una sesion o selecciona una existente.
2. Indica baliza 1-10 y notas.
3. Opcionalmente, pulsa Obtener posicion y acepta el aviso de privacidad y
   el permiso de ubicacion precisa Android. Sin permiso se puede seguir sin GPS.
4. Con GPS activado, espera una fijacion reciente; se solicita durante un
   maximo de 30 segundos. No se usa una posicion historica del proveedor.
5. Guarda la observacion. Solo acepta la fijacion durante 30 segundos,
   usando reloj monotono; guarda su precision y UTC de GPS por separado
   de la hora de registro de la observacion.

Guardar sin fijacion reciente crea explicitamente una observacion SIN
coordenadas y lo notifica. No fabrica una posicion. Salir de la pantalla,
ocultar/cerrar la actividad o finalizar la solicitud cancela las actualizaciones.
Se descartan posiciones marcadas como simuladas por Android.
Cada fijacion se usa como maximo para una observacion; vuelve a solicitarla
si necesitas otra medida.

La coordenada pertenece al telefono, no al emisor. No hay triangulacion,
rumbo, RSSI, recorrido continuo, mapa, sincronizacion con las estadisticas
RAM del firmware ni clasificacion automatica de balizas encontradas.
Los contadores son observaciones manuales. Estas funciones siguen pendientes.

### Estadisticas e historial ARDF

En la sesion seleccionada pulsa Estadisticas y observaciones de la sesion.
El panel lee la base SQLite persistente y muestra:

- Numero de observaciones y cuantas contienen coordenadas.
- Intervalo entre primera y ultima observacion, no tiempo de actividad ni
  duracion desde crear la sesion. Cero o una observacion producen 0 s.
- Por baliza: cantidad, primera/ultima UTC, cantidad con coordenadas e
  intervalo medio entre registros. Con una sola observacion no hay media.
- Las ultimas 100 observaciones con notas, UTC y coordenadas/precision/hora
  de fijacion, o SIN coordenadas. La exportacion JSON incluye todas.

La suma de segmentos GPS usa Haversine sobre esfera de radio 6371008.8 m,
solo entre observaciones consecutivas del telefono. Ambas deben tener
precision declarada <=50 m y fijacion entre 0 y 30 s anterior al registro.
Las horas de registro y fijacion deben aumentar, con separacion maxima
de 120 s. Una observacion sin GPS, imprecisa, antigua o futura rompe la
cadena: no se salta para unir puntos a ambos lados. Fijaciones repetidas
o tiempos iguales no generan segmentos. Se informa el numero de segmentos.

**No es recorrido completo**, distancia recorrida real, distancia a una
baliza, velocidad ni puntuacion de carrera. No hay filtro de ruido GPS:
la deriva puede aumentar la suma incluso sin movimiento. Los huecos
pueden reducirla. No se interpolan tramos y no se deduce que una baliza
este encontrada por observarla. Los datos importados conservan su UTC;
cambios del reloj y precision del proveedor afectan los resultados.
Las estadisticas se recalculan sin modificar datos ni el formato JSON.

## USB CDC y CAT RX experimental

Desde Inicio, abre CAT RX USB experimental y elige explicitamente un
dispositivo por VID, PID, controlador y nombre. Hace falta USB host/OTG en el
telefono. Se admite **CDC ACM estandar** con una interfaz de control y una de
datos bulk, y adaptadores reconocidos CH34x, CP210x, FTDI o Prolific con
un solo puerto. Los compuestos ambiguos/multipuerto se rechazan;
no se adivina un puerto.
La aplicacion pide permiso USB Android antes de abrir el dispositivo.
Si el sistema recrea la pantalla al conceder permiso, vuelve a elegirlo.
No hay conexion automatica al enchufar un cable.

Los controladores USB-serie provienen de **usb-serial-for-android 3.9.0**,
con licencia MIT incluida en los assets y la entrega. Solo se usa su tabla
de dispositivos reconocidos; no se fuerza un VID/PID desconocido a un
controlador. La dependencia esta fijada y JitPack se restringe a ese modulo.
No necesita root ni instalar un controlador externo en el telefono.
Un cable que funcione como COM en Windows no demuestra que sea compatible
con Android. Tampoco todos los puertos USB-C de Quansheng exponen datos.
La implementacion no certifica aun el cable de la UV-K5 V3 fisica; OpenGD77
y AnyTone no usan este protocolo CAT.

Requiere la imagen Bricohams Satelites con CAT RX v1, basada en F4HWN v6+.
F4HWN original no incorpora este modulo por reconocer su version.
No se instala firmware desde esta pantalla:

1. Arranca SAT RX en la radio y habilita CAT fisicamente con la tecla 8.
2. Selecciona el dispositivo correcto y concede permiso Android.
3. La aplicacion configura CDC a 38400, 8N1, identifica mediante
   `0x0514/0x0515` y consulta `0x7B00/0x7B01`.
4. Consulta el estado o introduce MHz en pasos exactos de 10 Hz:
   136-174 o 400-470 MHz. Una respuesta en cola no significa aplicada;
   se consulta hasta confirmar, con un maximo de diez intentos.
5. Cada SET dura un lease de **3000 ms** en firmware. No hay renovacion
   automatica en el panel manual. El seguimiento de pases descrito a
   continuacion renueva solo durante una sesion iniciada explicitamente.
6. STOP solicita la frecuencia nominal. Al ocultar la pantalla se cancelan
   SET aun no enviados, se intenta STOP si hay estado remoto/pendiente
   y se liberan interfaces/conexion. La desconexion USB invalida la sesion.
   Volver exige conectar de nuevo; no reanuda una sintonia anterior.

El estado es la ultima respuesta del firmware, no una medida RF. QUERY no
renueva el lease. Si el cable se desconecta no puede garantizarse entrega
de STOP: se informa del error y el lease restaura nominal solo si el bucle
de la radio sigue ejecutandose. Comprueba la frecuencia en la radio.
CRC, XOR y comprobacion de secuencia detectan fallos del protocolo, pero
no son cifrado ni autenticacion. CAT RX no hace TX/PTT (eso es CAT TX, aparte) ni toca firmware,
EEPROM o calibracion. La edicion de canales va aparte, en el editor de canales.

La operacion USB se serializa fuera del hilo de interfaz, conserva los
bytes sobrantes de paquetes bulk y verifica transferencias parciales.
No utiliza servicios en segundo plano. Estas funciones tienen pruebas
con USB simulado; faltan pruebas OTG y RF con telefono/radio reales.

## Editor de canales Quansheng por USB (Beta)

Correccion local de auditoria: el CRC fisico se solicita en 512 sectores de
4096 bytes, no en una orden de 2 MiB que excede el limite `0x073E`. Se
comprueban direccion, longitud, estado y CRC de cada sector, incluido el
ultimo. Esta correccion requiere reconstruir e instalar la APK; no modifica
por si misma una version ya descargada. Ver el
[informe de validacion](VALIDACION-INTEGRAL-V3-ANDROID.md).

Pantalla «Editar canales Quansheng por USB (Beta)». Es el port Android del
editor web: mismos comandos F4HWN v6, mismo respaldo y misma escritura con
relectura. Solo edita canales FM existentes.

1. Elegir el cable (OTG con CDC o adaptador USB-serie reconocido) y conectar.
   La radio se identifica con `0x0514`. F4HWN v6.0 queda en solo lectura.
2. Respaldo completo: calibracion de 512 bytes, Flash externa de 2 MiB en
   bloques de 128 bytes con `0x0738`, CRC-32 comprobado por la radio con
   `0x073E` y firmware Main validado por su cabecera `FMB1` y CRC. Tarda
   10-20 minutos a 38400 baudios; la pantalla se mantiene encendida. Se guarda
   en el almacenamiento privado de la app con `SHA256SUMS`. Exige Labs v6.1+.
3. Leer canales: configuracion logica de 41344 bytes (`0x051B`).
4. Elegir canal y editar nombre, RX, TX, tono RX y TX (OFF, CTCSS en Hz como
   `88.5` o DCS como `D023N` / `D023I`), potencia (USER, LOW1-LOW5, MID, HIGH),
   banda estrecha y bloqueo de TX. Frecuencias 136-174 y 400-470 MHz en la
   misma banda, como la web. Los demas bits del canal se conservan.
5. Aplicar a la copia local: no escribe la radio todavia.
6. Escribir: confirma, vuelve a verificar el respaldo por SHA-256 y comprueba
   que la radio sigue igual que al leerla. Oculta los canales afectados,
   escribe bloques de 8 bytes (`0x051D`), los vuelve a mostrar y relee toda la
   configuracion. Si la relectura no coincide, se informa y no se da por bueno.
   VFO, ajustes, calibracion y bancos estan protegidos.

Desconectar, salir de la pantalla o cualquier error cierra la sesion: hay que
volver a conectar y respaldar antes de escribir. No es una transaccion
resistente a cortes de alimentacion. Reinicia la radio despues de escribir.

## Satelites SGP4 y seguimiento de pases

Desde Inicio abre Satelites SGP4 y pases. La pantalla sigue el flujo de
Look4sat con diseno y codigo propios (no reutiliza su codigo ni recursos) y
los colores y el logo de Bricohams: cabecera con cuenta atras al siguiente
AOS o LOS y cuatro pestanas, **Pases**, **Mapa**, **Satelites** y **Ajustes**.

El motor es **satellite.js 6.0.1** (MIT), la misma distribucion UMD usada en
la web, ejecutada mediante **Rhino 1.7.15** (MPL 2.0). Las licencias, avisos
y enlaces al codigo fuente estan incluidos. El archivo del motor tiene SHA-256
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
Un solo contexto Rhino sirve a todos los satelites; solo se evalua codigo
fijo de assets, nunca contenido descargado, y el motor no tiene acceso Java.

1. **Datos.** En Ajustes, **Actualizar TLE y frecuencias** descarga por HTTPS
   el grupo amateur de CelesTrak (hasta 256 KiB) y los transmisores de
   SatNOGS DB (hasta 16 MiB; CC BY-SA 4.0). Al abrir o volver a la pantalla
   se actualiza automaticamente si falta el catalogo o tiene al menos 24 h.
   Tras un fallo se espera 15 min antes de otro intento automatico; el boton
   permite reintentar inmediatamente, sin descargas duplicadas. Puedes desactivar
   la actualizacion automatica en Ajustes; no hay servicio periodico en segundo plano.
   Los servidores reciben la peticion HTTPS habitual (incluida la IP), nunca
   tu ubicacion guardada ni los canales. Se conservan los transmisores vivos y
   activos de satelites del catalogo cuya bajada cae en 136-174 o 400-470 MHz
   en pasos de 10 Hz. Si SatNOGS falla se guardan los TLE nuevos con las
   frecuencias anteriores y se avisa. **Importar archivo TLE** sigue
   disponible sin red. Ambos se guardan en archivos privados de la app con
   escritura atomica. Se verifican longitud 69, checksum y NORAD; no se
   admiten Alpha-5 ni NORAD repetidos. Los TLE caducan a los siete dias.
2. **Observador.** Latitud y longitud en grados y altura sobre WGS84 en
   **km** (-0.5 a 9). **Usar ultima posicion GPS** pide permiso de ubicacion
   y copia la ultima posicion conocida del GPS o la red, con su antiguedad y
   precision; revisala y pulsa **Guardar y calcular pases**. Elevacion
   minima de 0 a 60 grados.
3. **Satelites.** Lista con busqueda por nombre o NORAD, casillas y atajos
   **Todos**, **Con RX** (los que tienen bajada en banda de la radio) y
   **Ninguno**. Tras la primera descarga se eligen los que tienen bajada RX
   (hasta 20 del catalogo si no hay frecuencias). La seleccion guardada,
   incluida **Ninguno**, se conserva al actualizar o reabrir.
4. **Pases.** Se calculan las proximas **24 h** de los satelites elegidos y
   la lista se va llenando satelite a satelite. Cada tarjeta muestra NORAD,
   nombre, elevacion maxima, dia y horas de AOS y LOS en la zona del
   telefono, azimut de entrada y salida, modos de SatNOGS, cuenta atras y una
   barra de progreso durante el pase. El muestreo es de 5 s, con cruces
   refinados a 500 ms; muy por debajo del horizonte el paso crece, acotado
   para que la elevacion no pueda cruzar el umbral dentro de un salto (bajo el
   horizonte la elevacion cambia menos de 0.3 grados/s incluso a 200 km), y
   en multiplos de 5 s para conservar la rejilla de la web. AOS y LOS se
   refieren al umbral de elevacion elegido.
5. **Detalle del pase.** Al tocar una tarjeta o la cabecera: radar polar
   (norte arriba, horizonte en el borde, cenit en el centro; verde AOS, rojo
   LOS, naranja la posicion actual interpolada entre 60 muestras SGP4),
   azimut, elevacion, distancia y Doppler aproximado en vivo, instantes UTC y
   lista de bajadas de SatNOGS para elegir, o una frecuencia escrita a mano.
   **Conectar CAT: Doppler, SSTV y grabacion** abre CAT con ese pase y bajada.
6. **Mapa.** Mapa mundial offline (costas de Natural Earth 1:110m, dominio
   publico), visible desde el primer arranque sin permiso GPS ni observador.
   Los satelites aparecen tras obtener TLE validos; sin red se usa el catalogo
   guardado mientras sus TLE sigan vigentes. Sin observador no se dibuja un
   punto de ubicacion ficticio ni se calculan pases. Los errores TLE se muestran.
   Muestra los satelites elegidos, su huella de cobertura (donde estan
   sobre 0 grados), tu posicion y la traza de 45 min antes y despues del
   satelite seleccionado. Toca un satelite para seleccionarlo. Se actualiza
   cada 5 s mientras esta visible.

La posicion, la eleccion de satelites y la ultima bajada elegida por
satelite se guardan en preferencias privadas; exportaciones JSON de campo
no las incluyen. No se deduce un uplink ni se soportan transpondedores
lineales: el CAT de la radio solo corrige la bajada.

### Doppler RX del pase seleccionado

**Abrir CAT RX y Doppler de este pase**, bajo el radar, abre CAT con una instantanea de TLE, observador,
downlink y ventana. No conecta USB ni envia ordenes por si solo.
Conecta el dispositivo, entra en SAT RX y habilita CAT con 8 en la radio.
Pulsa **Iniciar Doppler del pase seleccionado** solo cuando estes dentro
de la ventana. No hay inicio programado en segundo plano.

Se propaga la orbita en el instante actual y se calcula velocidad radial
como diferencia de rango centrada en un segundo. La correccion recibida es
`f_rx = f_nominal * (1 - velocidad_radial / 299792.458 km/s)`, redondeada a
10 Hz. Se exige elevacion no negativa, TLE valido y frecuencia RX en banda.
Se envian exclusivamente SET RX temporales, nunca TX/PTT, canales o EEPROM.

Tras cada confirmacion se espera 750 ms para la siguiente actualizacion,
aunque el redondeo no cambie la frecuencia; esto renueva el lease de 3 s.
No se encola una segunda operacion USB simultanea. Se detiene por fin de
pase, TLE caducado, horizonte, desconexion/error, respuesta sin aplicar,
intervalo/confirmacion de 2 s o mas, reloj repetido/hacia atras o salto
UTC respecto al monotono de mas de 500 ms. Los controles manuales quedan
bloqueados mientras se sigue el pase; la parada permanece utilizable.

Detener, ocultar la pantalla o desconectar cancela futuros SET, intenta
STOP y cierra USB. Volver no reanuda: hace falta reconectar e iniciar una
sesion nueva. Si falla STOP se notifica, sin afirmar restauracion. El lease
solo ayuda mientras el firmware siga ejecutando su bucle. La pantalla
muestra calculos y la ultima confirmacion, no una medida RF ni posicion real
verificada. Falta validar el conjunto telefono/cable/firmware/radio en campo.

### Grabar el pase y buscar SSTV

En la pantalla CAT de un pase, **Grabar pase completo (WAV hasta LOS)** graba
el microfono (conecta el altavoz de la radio) mientras sigue el Doppler. El
audio se captura a 48 kHz y se guarda diezmado 3:1 (media de tres muestras)
a **WAV 16 kHz mono** en el almacenamiento privado de la app, unos 1.9 MB por
minuto. Para en LOS, a las dos horas, con **Detener grabacion del pase** o al
salir de la pantalla; la cabecera WAV queda valida aunque haya un error.
No es compatible con la recepcion Robot36 de 60 s a la vez.

En Satelites, Ajustes, **Grabaciones de pases** lista cada WAV con duracion y
tamano. **SSTV** recorre la grabacion en ventanas de 60 s cada 23 s (asi
cualquier imagen Robot36 de 37 s cae entera en alguna), decodifica cada una,
descarta duplicados a menos de 10 s y guarda las imagenes PNG junto al WAV.
**Exportar** copia el WAV donde elijas y **Borrar** elimina el WAV y sus PNG
tras confirmar. No hay otros modos SSTV ni medida de calidad de la senal.

### Rotor AZ/EL Bricohams

En el detalle de un pase, **Rotor AZ/EL: preparar y seguir este pase** abre el
control del rotor de [antenaSatCommrotor](https://github.com/Brico-Hams/antenaSatCommrotor)
por su Wi-Fi (`192.168.4.1`, unico destino HTTP sin TLS permitido) o por BLE
cifrado con PIN. El movil le envia hora UTC, ubicacion, TLE y calibracion de
norte/nivel con su brujula; la app avisa de cruces del tope de cable, pases
demasiado rapidos o cenitales, lleva la antena al AOS y arma el seguimiento
automatico mientras CAT corrige el Doppler. Guia completa en [ROTOR.md](ROTOR.md);
parche de firmware y version de bajo coste en
[hardware/rotor](../hardware/rotor/README.md). Sin prueba con rotor fisico.

## Morse WAV experimental

El selector admite audio, pero el parser exige RIFF/WAVE PCM lineal mono
de 16 bits, 8-48 kHz, 0.1-60 segundos y maximo 8 MiB. Rechaza float,
estereo, MP3, datos truncados y longitudes incoherentes.

Configura el tono real entre 300 y 1200 Hz y la velocidad entre 5 y 45
palabras por minuto. El detector usa ventanas de aproximadamente 5 ms y
energia Goertzel del tono; interpreta tiempos de marca y espacios con la
velocidad configurada. No estima automaticamente velocidad ni frecuencia.
No es reconocimiento de voz ni una medida de confianza estadistica.
La salida muestra texto, puntos/rayas y advertencia de incertidumbre;
`?` identifica codigos no reconocidos, no todos los posibles errores.

Grabaciones debiles, ruido, desvanecimiento, desplazamiento del tono,
temporizacion irregular o errores de configuracion pueden producir texto
equivocado aunque no aparezca `?`. Contrasta el resultado con el audio.
Manten la pantalla abierta durante el calculo: un cambio de configuracion
o cierre de la actividad puede descartar el resultado en curso. No se
captura microfono desde el importador WAV ni se transmite.

## SSTV Robot36 desde WAV

Desde Inicio abre SSTV Robot36 desde WAV y pulsa Decodificar WAV Robot36.
Selecciona RIFF/WAVE PCM lineal mono de 16 bits, hasta 8 MiB, 37-60 segundos
y frecuencia de muestreo **8/16/24/32/40/48 kHz**. No admite 44.1 kHz,
MP3, float ni estereo. No selecciona imagenes para transmitir.
El audio debe contener la cabecera completa: lideres 1900 Hz, ruptura
1200 Hz, VIS **8** con paridad par, parada y las 240 lineas Robot36.
No adivina el modo a partir de una imagen parcial ni acepta otros VIS.

La implementacion propia usa una transformada Hilbert FIR para estimar la
frecuencia instantanea y alinea el primer porch. La temporizacion es
150 ms por linea: sincronismo 9 ms, porch 3 ms, luminancia 88 ms,
separador 4.5 ms, porch 1.5 ms y crominancia 44 ms. La luminancia tiene
320 muestras por linea; la crominancia, 160 muestras, comparte Cr/Cb entre
pares de lineas. Se transforma YCbCr de rango completo a RGB y se limita
el resultado a 0-255. Referencia tecnica consultada:
[Robot36 de Ahmet Inan, revision fija](https://github.com/xdsopl/robot36/tree/5860ded4716170b562c3e915c7eebb879742dcd4),
publicado como CC0. No se incluyen codigo C ni imagenes de ese proyecto.
No es una recompilacion ni una copia de la aplicacion Android Robot36.

Los muestreos admitidos se reducen a 8 kHz promediando bloques. No es un
frontal de audio profesional ni una supresion completa de alias/ruido.
No hay compensacion de deriva del reloj, inclinacion, Doppler, ruido,
audio recortado ni recuperacion de lineas. Se comprueban sincronismo y
separador de color de cada linea. Si faltan datos o se pierde sincronismo,
la operacion falla y no ofrece una imagen completa ni un PNG anterior.
Detectar cabecera/lineas no demuestra que todos los pixeles sean correctos.

Tras decodificar se muestra una imagen de **320x240**. Guardar imagen PNG
abre el selector Android. El proveedor elegido puede estar en una nube:
elige el destino teniendo en cuenta el contenido privado de la imagen.
No se guarda automaticamente en galeria. La imagen permanece en RAM;
rotar o cerrar descarta la vista previa. Exporta antes. Si falla la
escritura del PNG, descarta el archivo parcial.

El importador WAV no usa microfono, audio USB, PTT ni transmite; no cambia
la frecuencia de la radio desde esta pantalla. La captura opcional se abre
por separado como se indica a continuacion. El comportamiento con
grabaciones RF y rutas de audio fisicas sigue pendiente de validacion.
Las pruebas sinteticas no sustituyen esas comprobaciones.

## SSTV Robot36 por CAT: recepcion sintonizada y envio con PTT

En la pantalla CAT, debajo de la conexion USB, hay tres acciones SSTV.

**Recibir.** Inicia el Doppler del pase o sintoniza a mano, conecta el altavoz
de la radio a la entrada de audio del movil y pulsa *Grabar Robot36 (CAT sigue
sintonizando)*. La grabacion usa la misma captura de 60 s que la pantalla de
microfono y no detiene el seguimiento CAT, que corre en otro hilo. Pulsa
*Detener grabacion y decodificar* al acabar la imagen.

**Enviar.** Requiere la imagen Bricohams Satelites con CAT TX v1 (comando
`0x7B02`, ver `BRICOHAMS-FIRMWARE.md`). Pasos:

1. Escribe el indicativo. **Es obligatorio**: sin uno valido no se abre el
   selector, y se imprime en la franja inferior de la imagen.
2. Conecta la salida de audio del movil a la entrada de microfono de la radio.
   El USB-C de la radio queda para CAT; el movil necesita jack de 3,5 mm o un
   hub OTG con audio.
3. En la radio, en SAT RX, pulsa la tecla 9: `CAT TX ARMED`.
4. Pulsa *Enviar Robot36 por PTT CAT*, elige la imagen (se escala a 320x240) y
   confirma el dialogo con la frecuencia, el indicativo y la duracion (~37 s).

La app consulta la PTT y no emite si la radio no esta armada, alcanzo el
limite o rechaza TX. Activa la PTT, espera la confirmacion de la radio y solo
entonces reproduce el audio, renovando el lease cada 400 ms. Si una renovacion
falla (tecla pulsada en la radio, limite, bloqueo) o la pantalla pasa a segundo
plano, corta el audio, suelta la PTT y lo confirma con una relectura. Si la
relectura falla, la radio suelta la PTT sola a los 1,5 s. El audio se limita a
110 s, por debajo del corte de 120 s de la radio.

Emite en la frecuencia TX del VFO de la radio, sin correccion Doppler de
subida, y no se permite durante el seguimiento de un pase. Necesitas licencia
y una frecuencia autorizada para SSTV. **Sin validacion en radio ni RF.**

## Captura de microfono Morse y Robot36

Desde Inicio pulsa Recibir Morse / Robot36 con microfono. Selecciona el modo;
para Morse introduce el tono entre 300 y 1200 Hz y la velocidad entre 5 y
45 ppm. Robot36 ignora esos dos campos. El permiso `RECORD_AUDIO` solo se
solicita al pulsar Iniciar captura de audio. **Conceder permiso no graba**:
debes pulsar iniciar de nuevo. Denegarlo no impide importar WAV ni usar
las demas funciones. No se inicia ninguna captura al abrir la aplicacion.

La entrada es AudioRecord/MIC del sistema, PCM mono 16 bits a 48 kHz.
Android selecciona el dispositivo de entrada; no hay selector de rutas,
control del volumen de la radio ni garantia de compatibilidad con un
adaptador de audio USB. El cable CAT no implica transporte de audio.
Si el hardware no admite ese formato, falla la apertura o desaparece la
entrada, se muestra un error y se libera el recurso; no se inventa audio.
Prueba primero una senal conocida y comprueba nivel, saturacion y ruta.

Inicia antes de la cabecera Robot36. Se requieren al menos 37 s y una
imagen completa con los mismos limites de sincronismo del importador WAV.
Pulsa Detener y decodificar al terminar la senal. La captura termina
automaticamente al alcanzar **60 segundos**, por limite de muestras y
temporizador; no se rellena con silencio. El audio se conserva solo en
memoria durante la operacion. No se escribe un WAV ni se envia por red.
La imagen Robot36 puede guardarse como PNG mediante el selector Android;
el audio Morse muestra texto, puntos/rayas y advertencia experimental.

Cancelar y descartar audio, salir, bloquear el telefono, abrir otra
actividad o rotar detiene la captura al perder el primer plano, libera
el microfono y descarta el resultado pendiente. **No se reanuda** al volver.
La vista previa de imagen no sobrevive a rotacion. No existe servicio,
grabacion en segundo plano, PTT, TX ni decodificacion continua en streaming:
primero se captura, despues se decodifica. Un resultado sintetico correcto
no valida recepcion RF real ni la ruta de microfono de un telefono.

## Compilacion

Requisitos: JDK 17, Android SDK 35, Build Tools 35.0.0 y acceso a los
repositorios oficiales de dependencias durante la primera construccion.
No se incluyen SDK, JDK, certificados ni claves debug en el repositorio.

```powershell
$env:JAVA_HOME = 'C:\ruta\jdk-17'
$env:ANDROID_HOME = 'C:\ruta\android-sdk'
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest
```

El wrapper usa Gradle 8.9 con SHA-256 oficial fijado. AGP 8.7.3 y Kotlin
2.0.21 estan fijados. La aplicacion utiliza vistas Android y SQLite de
plataforma, sin Compose, Room ni backend: reduce dependencias de ejecucion
y permite comprobar primero el almacenamiento y permisos reales.
Las bibliotecas de ejecucion son usb-serial-for-android 3.9.0 y sus
anotaciones AndroidX, Rhino 1.7.15 y satellite.js 6.0.1 embebido como asset.
JUnit, Robolectric y AndroidX Test
solo forman parte de pruebas.
Sus licencias no sustituyen las de Android, Gradle o el proyecto.

Salidas:

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Informes en `android/app/build/reports/`.

Para entregar un conjunto verificado en Windows, con los mismos requisitos:

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.9.0-beta'
```

El destino debe ser nuevo. El script ejecuta pruebas/lint, verifica las firmas
APK e incluye aplicacion, APK instrumentada, guia, licencias, `build-info.json`
y `SHA256SUMS`. El manifiesto identifica revision, estado dirty, fuentes por
hash, capacidades y funciones no disponibles. Siempre declara firma debug y
prueba fisica pendiente; no convierte una construccion en version estable.

Con un telefono/emulador de pruebas conectado y autorizado por ADB:

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Usa un dispositivo de pruebas. Cada prueba instrumentada de persistencia
remapea `bricohams.db` a una base privada `instrumentation-<UUID>.db`;
no abre ni limpia el libro de guardia real y solo elimina su propia base.
La APK de prueba no es la aplicacion de uso habitual.

## Validacion realizada y pendiente

La validacion historica inicial comprendia 84 pruebas host; el resumen de
cien pruebas siguiente corresponde a la base upstream 0.8.0, no certifica
que esta integracion y sus nuevas pruebas se hayan ejecutado con Java 8.

Cien pruebas host: siete de modelos/ADIF, cuatro de importacion
ADIF, tres de audio, doce de almacenamiento/interfaz, ocho de protocolo CAT, dos de pantalla CAT,
cinco del codec de canales, cinco de memoria/respaldo/escritura Quansheng y ocho
de USB CDC/serie simulado, cuatro de nucleo Robot36 (incluida ida y vuelta del codificador), dos de pantalla SSTV,
cuatro de envio SSTV por PTT CAT con radio simulada,
cuatro de SGP4/TLE y motor compartido, cuatro de seguimiento, dos de pantalla de satelites, tres de lista y radar de pases,
dos de descarga y catalogo, dos de mapa, dos de grabacion de pases,
cinco de captura PCM, seis de pantalla de microfono y seis de estadisticas ARDF.
Comprueban SQLite tras cerrar/reabrir, actualizacion/eliminacion,
exportacion JSON, coordenadas nulas/validas, arranque de pantallas,
guardado y recreacion de actividad, orden UTC con fracciones y restauracion
JSON idempotente con rollback ante conflictos/datos invalidos. El audio sintetico se contrasta a
8/16/44.1/48 kHz y 5/15/30/45 ppm, incluyendo silencio y tono incorrecto.
No son medidas de error con grabaciones reales.
ARDF contrasta 222.39016 m al cruzar la linea de fecha en el ecuador
(tolerancia 0.01 m), orden UTC, medias separadas por baliza, sesiones
aisladas tras cerrar/reabrir SQLite y visualizacion del historial.
Se prueban huecos, precision, fijaciones antiguas/futuras/repetidas,
registros simultaneos e IDs duplicados. No son medidas GPS de campo.
La captura comprueba exactamente 2880000 muestras para el limite de 60 s,
parada manual sin relleno, cancelacion antes de abrir y durante lectura
bloqueante, errores explicitos y liberacion. La pantalla verifica permiso
sin autoinicio, decodificacion de Morse conocido y Robot36 320x240 desde
entrada simulada, recuperacion tras fallo, temporizador y cancelacion al
salir sin reanudacion. No son pruebas de AudioRecord en hardware real.

CAT contrasta CRC con vector conocido, tramas de todas las longitudes,
CRC `FFFF` de respuestas upstream, identificacion, ruido/timeout, secuencia
y wrap, bandas, cancelacion de SET y diferencia entre en cola/aplicado.
CDC verifica permisos, seleccion no ambigua, configuracion, escrituras
parciales, lectura de un paquete en varias llamadas, fallos y cierre.
Los adaptadores serie comprueban seleccion de controladores por VID/PID,
rechazo de multipuerto/desconocidos, parametros 38400 8N1, lectura en partes,
propagacion de errores sin repetir SET y cierre si falla la configuracion.
La prueba integrada recorre pantalla, identificacion, SET RX y STOP antes
del cierre al ocultar la actividad, usando un dispositivo simulado.
Canales: lectura de tonos, potencia y flags; edicion que solo cambia los
bytes del canal; las 50 CTCSS y 104 DCS ida y vuelta; rechazos sin tocar la
copia. Una radio F4HWN simulada comprueba respaldo completo (CRC de la radio,
Main, calibracion), SHA-256 en disco, orden de escritura web, relectura y
bloqueos por ajustes, radio modificada, v6.0, CRC y bloque rechazado.
La auditoria posterior agrega comprobaciones de los 512 sectores CRC,
metadatos de respuesta incorrectos, lectura fisica sin identificar o con
rangos que desbordan un entero, y cancelacion de respaldo/escritura.
La sesion del editor queda vinculada al primer plano y a su generacion:
salir, desconectar o invalidarla impide el siguiente intercambio USB y
descarta tareas antiguas que aun no hayan empezado. Una orden ya enviada
puede haberse aplicado; la cancelacion no hace rollback ni convierte una
escritura en atomica. Conservar el respaldo y repetir identificacion,
lectura y verificacion antes de escribir de nuevo. Las pruebas de pantalla
comprueban errores sin USB y borrado de las copias de edicion al salir,
sin reanudacion automatica. Tras un error se cierra el transporte y se
requiere una conexion nueva, no solo volver a pulsar Respaldo.
Los resultados actuales, separados de main
publicado y de pruebas fisicas, estan en la
[matriz de validacion](VALIDACION-INTEGRAL-V3-ANDROID.md).
ADIF comprueba ida/vuelta, etiquetas dentro de comentarios, cabecera opcional,
horas en minutos, campos no conservados, registros truncados/invalidos y ASCII.
SQLite verifica duplicados y rollback con un fallo real de insercion inyectado,
migracion desde una base version 1 con respaldo previo, migracion fallida que
deja la version 1 intacta, contactos separados por libro, claves foraneas y
copias JSON version 1 y 2. Los libros comprueban referencias POTA/SOTA, BAND
y los campos de activacion en ADIF; la entrada rapida comprueba UTC
automatico, RST por modo, frecuencia conservada, libro tras rotacion y el
aviso de duplicado con No guardar y Guardar igualmente. La regla de duplicados
se contrasta por indicativo, banda, modo, dia UTC y libro.
La interfaz prueba busqueda tras rotacion y vista previa con cancelar/aceptar.
SSTV contrasta geometria 320x240, inicio temporal, niveles de gris a
8/16/48 kHz y barras RGB/CMY a 8 kHz: error maximo de 12 niveles por canal
en los puntos interiores de gris y 15 en los de color comprobados.
Se rechazan VIS distinto, paridad incorrecta, silencio, perdida de lineas
y muestreos/duraciones no admitidos. La interfaz exporta un PNG que se
vuelve a abrir y verificar como 320x240, y no ofrece exportacion tras un fallo.
No se han medido tasas de error ni calidad en grabaciones reales.
SGP4 contrasta un TLE de prueba fijo contra la web: epoca, azimut/elevacion
(tolerancia 0.00001 grados), rango (1 m), AOS/LOS (500 ms), maximo y
Doppler en pasos de 10 Hz. Se verifican checksum, antiguedad, bandas,
ventana, renovacion sin cambio de frecuencia, cancelacion, reloj discontinuo,
respuesta tardia/pendiente y errores USB. La prueba combinada aplica
el Doppler calculado a una radio CAT simulada y restaura nominal con STOP.
El radar contrasta la proyeccion polar (norte, este, cenit y bajo horizonte),
la interpolacion de azimut al cruzar el norte, la trayectoria muestreada
contra SGP4 (0.5 grados entre muestras) y las cuentas atras de las tarjetas.
El motor compartido contrasta dos observadores en un mismo contexto Rhino,
la posicion subsatelite (altitud y latitud de la ISS) y que los pases sigan
coincidiendo con la web tras el paso adaptativo. La descarga comprueba el
recorte de nombres de CelesTrak, el filtrado de SatNOGS (vivo, activo, en
banda, NORAD del catalogo), JSON roto, solo HTTPS y la ida y vuelta de los
archivos privados. El mapa contrasta proyeccion, huella de la ISS (20.4
grados de arco a 420 km), corte en el antimeridiano y el contorno incluido.
La grabacion usa una fuente PCM simulada: para en LOS, diezma 3:1, deja una
cabecera WAV valida y encuentra una imagen Robot36 insertada a los 50 s de
una grabacion de 125 s; tambien se comprueban las ventanas y un WAV ajeno.
La interfaz descarga un catalogo simulado, calcula pases, abre el detalle
con radar y bajadas de SatNOGS, transmite el plan a CAT, rechaza una bajada
fuera de banda, muestra el mapa, filtra y deselecciona satelites, valida el
observador y borra una grabacion y sus PNG tras confirmar. CAT rechaza un
pase vencido sin SET y cerrando USB. No se ha descargado de los servidores
reales en las pruebas ni se ha probado la grabacion con AudioRecord real.

Compilan la APK y la APK instrumentada. Lint termina sin errores;
conserva avisos de versiones mas nuevas de dependencias de prueba, forma
del icono original, tipografia, plurales y palabras escritas sin tilde. No se suprimen ni se consideran fallos funcionales.

No hay telefono Android conectado ni emulador ejecutado en esta validacion.
Las pruebas instrumentadas estan compiladas, **no ejecutadas**.
Siguen pendientes instalacion, usabilidad y permisos en telefono, GPS real,
rutas de audio reales y todas las funciones marcadas como no implementadas.
