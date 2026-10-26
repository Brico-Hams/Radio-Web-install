# Bricohams Android Beta

## Alcance de la primera APK

Aplicacion nativa Kotlin para Android 8.0/API 26 o posterior, sin servidor,
cuentas ni conexion a Internet. Es una implementacion independiente: no
incluye codigo ni recursos de Look4sat, Robot36 o HAMRS.
La version `0.1.0-beta` no sustituye sus funciones completas.

| Funcion | Estado |
| --- | --- |
| Contactos del libro de guardia | Crear, consultar, editar y borrar con confirmacion; SQLite local |
| Intercambio de contactos | ADIF ASCII, JSON UTF-8 y restauracion de copia JSON |
| LoTW | Exportar ADIF para TQSL en ordenador; no hay firma ni subida desde Android |
| ARDF | Sesiones persistentes, balizas 1-10, observaciones individuales y contadores por baliza |
| GPS | Posicion puntual del telefono, con precision y hora de la fijacion, previa autorizacion |
| Exportacion ARDF | JSON con sesiones, observaciones, contactos y coordenadas cuando existen |
| Morse de texto | Puntos/rayas; espacios entre letras y `/` entre palabras |
| Morse desde archivo de audio | WAV PCM mono 16 bits experimental, tono/velocidad configurados; no escucha en directo |
| USB/CAT y satelites | Todavia no implementados en esta APK; las funciones web existentes son independientes |
| SSTV Robot36 | No implementado |
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
captura microfono, audio USB ni se transmite.

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
Las librerias JUnit, Robolectric y AndroidX Test solo forman parte de pruebas.
Sus licencias no sustituyen las de Android, Gradle o el proyecto.

Salidas:

- `android/app/build/outputs/apk/debug/app-debug.apk`.
- `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
- Informes en `android/app/build/reports/`.

Para entregar un conjunto verificado en Windows, con los mismos requisitos:

```powershell
.\scripts\build-android.ps1 -OutputDirectory 'C:\ruta\entregas\Android-0.1.0-beta'
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

Doce pruebas host correctas: cinco de modelos/ADIF, tres de audio y cuatro
Robolectric. Comprueban SQLite tras cerrar/reabrir, actualizacion/eliminacion,
exportacion JSON, coordenadas nulas/validas, arranque de pantallas,
guardado y recreacion de actividad, orden UTC con fracciones y restauracion
JSON idempotente con rollback ante conflictos/datos invalidos. El audio sintetico se contrasta a
8/16/44.1/48 kHz y 5/15/30/45 ppm, incluyendo silencio y tono incorrecto.
No son medidas de error con grabaciones reales.

Compilan la APK y la APK instrumentada. Lint termina sin errores;
conserva avisos de versiones mas nuevas de dependencias de prueba y forma
del icono original. No se suprimen ni se consideran fallos funcionales.

No hay telefono Android conectado ni emulador ejecutado en esta validacion.
Las pruebas instrumentadas estan compiladas, **no ejecutadas**.
Siguen pendientes instalacion, usabilidad y permisos en telefono, GPS real,
rutas de audio reales y todas las funciones marcadas como no implementadas.
