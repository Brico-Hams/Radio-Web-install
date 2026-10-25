# Bricohams Android Beta

## Alcance de la APK

Aplicacion nativa Kotlin para Android 8.0/API 26 o posterior, sin servidor,
cuentas ni conexion a Internet. Es una implementacion independiente: no
incluye codigo ni recursos de Look4sat, Robot36 o HAMRS.
La version `0.7.0-beta` no sustituye sus funciones completas.

| Funcion | Estado |
| --- | --- |
| Contactos del libro de guardia | Crear, buscar, consultar, editar y borrar con confirmacion; SQLite local |
| Intercambio de contactos | ADIF ASCII exportacion/importacion con vista previa, JSON UTF-8 y restauracion de copia JSON |
| LoTW | Exportar ADIF para TQSL en ordenador; no hay firma ni subida desde Android |
| ARDF | Sesiones persistentes, balizas 1-10, historial, contadores, intervalos por baliza y suma filtrada de segmentos GPS |
| GPS | Posicion puntual del telefono, con precision y hora de la fijacion, previa autorizacion |
| Exportacion ARDF | JSON con sesiones, observaciones, contactos y coordenadas cuando existen |
| Morse de texto | Puntos/rayas; espacios entre letras y `/` entre palabras |
| Morse desde archivo de audio | WAV PCM mono 16 bits experimental, tono/velocidad configurados |
| Microfono | Captura en primer plano hasta 60 s y decodificacion posterior Morse/Robot36; sin escucha ni decodificacion continua |
| USB/CAT RX | CDC ACM y adaptadores USB-serie reconocidos de un puerto, identificacion F4HWN v6+, consulta, sintonia temporal confirmada y STOP; experimental |
| Satelites | SGP4 offline, catalogo TLE importado, observador manual, prediccion 24 h y seguimiento Doppler RX por CAT durante el pase seleccionado |
| SSTV Robot36 | Decodificacion experimental de WAV o captura completa con cabecera VIS 8, imagen 320x240 y exportacion PNG; sin TX |
| Escritura de canales, subtonos y potencia | No implementada en Android; no se habilita una escritura sin respaldo |

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
telemetria, permiso INTERNET, servicio de ubicacion en segundo plano ni
subida de datos. La copia automatica y transferencia de datos del sistema
estan desactivadas en el manifiesto/reglas de extraccion.
**Exporta antes de desinstalar:** desinstalar borra los datos locales.
La restauracion JSON se inicia desde Inicio y nunca elimina datos existentes.

Las exportaciones usan el selector de archivos Android; no requieren acceso
general al almacenamiento. El proveedor elegido puede ser remoto: escoger
una nube implica compartir el contenido con ese proveedor. El JSON contiene
datos personales y ubicaciones; revisa su destino y no lo publiques.
No se pide ni almacena un certificado LoTW.

## Libro de guardia

1. Abre Guardia e introduce indicativo, UTC ISO, frecuencia MHz, modo,
   informes enviado/recibido y notas.
2. Guarda el contacto. La lista muestra los 50 ultimos; exportar incluye todos.
3. Editar abre el contacto con su ID original; guardar no crea un duplicado.
   Eliminar requiere confirmacion y no puede deshacerse.
4. Exporta ADIF para intercambio/TQSL o JSON para conservar todo el texto.

La fecha se interpreta como instante ISO; ADIF la convierte a UTC. Las
frecuencias admitidas por el formulario, 0.1-1300 MHz, no son autorizacion
para transmitir. Los modos de una entrada no afirman que la radio los soporte.
Los formularios aun sin guardar se descartan al cambiar de seccion.
La rotacion conserva los campos de la seccion actual mediante el estado Android.

ADIF incluye CALL, QSO_DATE, TIME_ON, FREQ, MODE, RST_SENT, RST_RCVD y COMMENT.
La exportacion ASCII rechaza notas con acentos, saltos de linea u otros
caracteres no admitidos: no los elimina ni los sustituye silenciosamente.
JSON conserva UTF-8. La exportacion no certifica que LoTW acepte un contacto;
firma, subida, respuesta del servicio y confirmacion son pasos distintos.

### Buscar contactos

Desde Guardia introduce parte del indicativo, notas, modo, frecuencia o UTC
y pulsa Buscar contactos. La comparacion no distingue mayusculas; no elimina
acentos ni interpreta rangos/expresiones regulares. Se muestran el total
coincidente y las 50 coincidencias mas recientes. Mostrar todos los contactos
quita el filtro. La busqueda aplicada sobrevive a rotacion; pulsar Buscar
vuelve a crear el formulario y descarta cambios de edicion aun no guardados.
Exportar siempre incluye todos los contactos, no solo las coincidencias.

### Importar ADIF con vista previa

Desde Guardia pulsa Importar ADIF (vista previa). El selector permite cualquier
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
No se deduce frecuencia desde BAND ni se inventan informes ausentes.

La vista previa muestra el numero de contactos y **campos no conservados**,
por ejemplo BAND, SUBMODE, GRIDSQUARE o datos de confirmacion LoTW. Los
metadatos de cabecera no se incorporan a los contactos. Conserva el archivo
original: esta importacion no es un reemplazo sin perdida de cualquier ADIF.
Cancelar no guarda nada. Un archivo mal formado o registro invalido cancela
todo antes de ofrecer la importacion. Etiquetas duplicadas, fechas imposibles
y longitudes truncadas son errores explicitos.

Al aceptar se agrega todo en una transaccion SQLite. Si falla una insercion,
se revierte el conjunto. Se omiten registros cuyos campos conservados sean
identicos a otro existente o del mismo archivo: indicativo, instante UTC,
frecuencia numerica normalizada, modo, ambos informes y notas. Si alguno
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
version 1 exportada por esta aplicacion. El archivo admite hasta 16 MiB
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
no son cifrado ni autenticacion. No hay TX/PTT, escritura de canales,
subtonos, potencia, firmware, EEPROM ni calibracion.

La operacion USB se serializa fuera del hilo de interfaz, conserva los
bytes sobrantes de paquetes bulk y verifica transferencias parciales.
No utiliza servicios en segundo plano. Estas funciones tienen pruebas
con USB simulado; faltan pruebas OTG y RF con telefono/radio reales.

## Satelites SGP4 y seguimiento de pases

Desde Inicio abre Satelites SGP4 y pases. El motor es **satellite.js 6.0.1**
(MIT), la misma distribucion UMD usada en la web, ejecutada mediante
**Rhino 1.7.15** (MPL 2.0). Las licencias, avisos y enlaces al codigo fuente
de ambas dependencias estan incluidos. El archivo del motor tiene SHA-256
`91fdd46e9523c6b232d24ff69fd5e9cade8471d20624a154df7d9c91dc212639`.
No se evalua JavaScript del catalogo: solo se carga codigo fijo de assets,
sin acceso Java desde el motor, ni navegador/WebView ni conexion a Internet.

1. Importa un catalogo ASCII TLE de dos o tres lineas por satelite, hasta
   256 KiB y 256 satelites. Se admiten nombres con prefijo `0 ` y pares sin
   nombre. Se verifican longitud 69, checksum y NORAD numerico coincidente.
   No se admiten Alpha-5 ni NORAD repetidos en un catalogo. Tambien puedes
   pegar manualmente las lineas y nombre.
2. Introduce latitud/longitud en grados y altura sobre WGS84 en **km**,
   entre -0.5 y 9 km. La posicion es manual: no usa el GPS ARDF, mapas ni
   una posicion historica oculta. Comprueba por separado coordenadas y unidades.
3. Introduce el downlink nominal **FM puntual** en MHz, en pasos de 10 Hz
   dentro de 136-174 o 400-470 MHz. Confirma por una fuente actual que es el
   modo y frecuencia correctos; el TLE no contiene la configuracion de radio.
   No se deduce un uplink ni se soportan transpondedores lineales en este flujo.
4. Elige elevacion minima de 0 a 60 grados y calcula las proximas **24 h**.
   Los TLE se rechazan si tienen mas de siete dias o epoca mas de 24 h futura;
   toda la ventana debe quedar dentro de esa validez. Actualiza el archivo
   por tu cuenta: no hay descarga de TLE ni base de frecuencias automatica.
5. Cada resultado muestra AOS, maximo, LOS, observador, downlink y si el
   pase esta cortado al inicio/final de la ventana. Los instantes son UTC.
   Se muestrea cada 5 s, refinando cruces a intervalos de 500 ms; el maximo
   es muestreado, no una optimizacion continua. AOS/LOS se refieren al umbral
   de elevacion elegido, no necesariamente al horizonte geometrico.

Solo los parametros de una prediccion correcta se guardan en preferencias
privadas. Incluyen la ubicacion manual; exportaciones JSON de campo no los
incluyen. Cambiar un campo invalida la lista visible. Rotar conserva campos,
pero descarta los pases calculados: vuelve a calcularlos.

### Doppler RX del pase seleccionado

Seleccionar un pase abre CAT con una instantanea de TLE, observador,
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
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.7.0-beta'
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

No ejecutes esas pruebas contra datos operativos. La prueba instrumentada
crea y elimina solo sus propios contactos/sesion mediante IDs aleatorios.
La APK de prueba no es la aplicacion de uso habitual.

## Validacion realizada y pendiente

Sesenta y nueve pruebas host: cinco de modelos/ADIF, cuatro de importacion
ADIF, tres de audio, ocho de almacenamiento/interfaz, ocho de protocolo CAT, dos de pantalla CAT y ocho
de USB CDC/serie simulado, tres de nucleo Robot36 y dos de pantalla SSTV,
tres de SGP4/TLE, cuatro de seguimiento, dos de pantalla de satelites,
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
ADIF comprueba ida/vuelta, etiquetas dentro de comentarios, cabecera opcional,
horas en minutos, campos no conservados, registros truncados/invalidos y ASCII.
SQLite verifica duplicados y rollback con un fallo real de insercion inyectado.
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
La interfaz importa un catalogo, calcula pases offline, transmite la
instantanea seleccionada y rechaza un pase vencido sin SET y cerrando USB.

Compilan la APK y la APK instrumentada. Lint termina sin errores;
conserva avisos de versiones mas nuevas de dependencias de prueba, forma
del icono original y tipografia. No se suprimen ni se consideran fallos funcionales.

No hay telefono Android conectado ni emulador ejecutado en esta validacion.
Las pruebas instrumentadas estan compiladas, **no ejecutadas**.
Siguen pendientes instalacion, usabilidad y permisos en telefono, GPS real,
rutas de audio reales y todas las funciones marcadas como no implementadas.
