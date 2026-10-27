# Validacion integral UV-K5 V3, Android y firmware Bricohams

Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro
Roca, fundadores y miembros directivos de Bricohams.
Informacion: <https://bricohams.org> y <https://bricohams.com>.

Revision inicial: 26-10-2026. **Auditoria en curso; no es un certificado de
funcionamiento ni una revision exhaustiva ya completada.** Los avisos y
atribuciones de codigo, fotos y documentos de terceros se conservan.

## Identificacion de la entrega

No basta con que dos APK indiquen `0.8.1-beta`: el commit, SHA-256 del APK,
firma y hashes de fuentes deben identificar exactamente la entrega probada.

| Entrega | Identidad | Evidencia |
| --- | --- | --- |
| Arbol de trabajo inicial | Base `42fa5e014b270b929b58f7fd2fee2a28f482d1c0`, cambios locales | Android host, lint y APK comprobados durante esta revision |
| Main publicado consultado | `01c58563e6507d17bd2bec612ef669840abfeddb` | Revision aislada sin sustituir cambios locales; incluye General/POTA/SOTA y nueva lista de pases |
| APK instalada en el movil | No identificada | Sin movil visible en ADB; no comprobada |
| Firmware del slot SAT actual | El usuario indica slot 3 | Sin puerto de radio detectable; indice, banco, CRC y version pendientes |

Resultados de la revision publicada aislada: **93 pruebas Android host
correctas, cero fallos/errores**, lint sin errores y 13 avisos, APK debug
compilada. SHA-256 de esa reconstruccion:
`b739992a1b4cba67fdd87e97efdf5408e84f549068b51043d854da094ed1152d`.
No es el hash de una APK descargada de la web ni instalada en un movil.
La correccion CRC local no esta incluida en esa reconstruccion de main.

Los 13 avisos lint de ambas revisiones corresponden a dos dependencias de
test con versiones mas recientes, cinco avisos de diccionario ingles sobre
"satelite", un candidato a plural, tres guiones tipograficos, una elipsis
y la forma del icono. No se cambian dependencias ni marca para ocultarlos.

La web publicada no es necesariamente igual al arbol local. Tampoco se
deduce el contenido del APK descargable a partir del texto de una guia.
No se deben atribuir las pruebas de la base local a la revision publicada
ni a un APK sin identificar.

![Cadena funcional de contactos, canales por slot y CAT](atlas/android-cat-validacion.svg)

Este dibujo es una representacion funcional propia, no un esquema electrico.
No contiene conexiones internas, valores de componentes o niveles de tension
inferidos. Los mapas de pines y memoria estan en el
[atlas](ATLAS-UV-K5-V3.md).

## Niveles de evidencia

1. Fuente revisada: demuestra la implementacion prevista, no su ejecucion.
2. Test host/JVM/Robolectric: verifica los escenarios concretos simulados.
3. Android instrumentado: requiere dispositivo/emulador identificado.
4. Radio real: requiere version, slot, banco y configuracion identificados.
5. Medida externa RF/electrica: requiere instrumento, conexion y procedimiento.

Un ACK de escritura no sustituye relectura, persistencia tras reinicio o
medida RF. Un test SQLite de escritorio no certifica la memoria del movil.
El estado final de cada escenario debe indicar nivel y evidencia; no
convertir "no ejecutado" en "correcto".

## Hallazgo corregido: CRC de backup Android

`QuanshengMemory.verifyFlash` solicitaba `0x073E` sobre 2097152 bytes de una
vez. El comando de referencia limita cada consulta a 4096 bytes. El mock
permitia el rango imposible y ocultaba el error. La web ya verificaba por
sectores; Android necesitaba la misma correccion.

La correccion local consulta los 512 sectores con direccion/longitud/estado
comprobados y compara el CRC de cada sector contra los bytes leidos. Solo
devuelve el CRC local total despues de comprobar todos. Un fallo, incluido
el ultimo sector `0x1ff000`, bloquea el backup y no habilita escritura.
No elimina backups existentes, calibra la radio ni escribe sectores.

El mock ahora impone 4096 bytes y comprueba que se solicitan todos los
sectores. Se anade prueba de ultimo sector corrupto y rechazo de rango
incompleto antes de enviar comandos. Las pruebas host de la base local:
92 correctas tras ampliar limites, cancelacion y pantalla de canales, cero
fallos/errores; lint sin errores y 13 avisos. La APK debug
se compila, pero esta correccion no esta publicada ni instalada en un movil.

SHA-256 de la APK local reconstruida tras estas correcciones:
`cd9d3bfd3bfe0405be23995dd906aae63614ec9d38de1a1ff8cea1997156ab25`.
Este hash reemplaza la reconstruccion local anterior, no identifica la APK
publicada ni la instalada.

Tambien se corrige el manifiesto generado por `build-android.ps1`: ya no
declara inexistentes CAT PTT, SSTV TX y programacion de canales que si estan
implementados experimentalmente. Esto no convierte esas funciones en
certificadas.

## Cancelacion y limites del editor Android

Se encontro otro problema durante el seguimiento del ciclo de vida: cerrar
la pantalla encolaba el cierre del transporte detras de la tarea activa.
Por tanto, una copia o escritura larga podia seguir enviando bloques aunque
la interfaz ya declarase la sesion terminada.

La conexion ahora conserva una generacion de sesion y comprueba que sigue
activa y en primer plano antes de cada intercambio. Las tareas encoladas
tambien comprueban su generacion antes de comenzar. El cierre sigue en el
worker para liberar ordenadamente el transporte, pero no habilita nuevos
comandos de una operacion cancelada. La respuesta de una orden ya enviada
puede quedar pendiente o la orden haberse aplicado: no se promete rollback.
Un timeout o cancelacion exige reconexion y respaldo nuevo.
Los errores tambien cierran el transporte y eliminan la referencia de
memoria, no solo el permiso de backup: pulsar Respaldo de nuevo no reutiliza
una conexion invalida. Una prueba de pantalla inyecta un fallo de transporte,
comprueba cierre y verifica que el segundo intento no envia mas comandos.

Las pruebas simulan cancelacion despues de ocultar el primer canal: no se
envia el siguiente bloque ni se vuelve a mostrar un registro incompleto.
Tambien cancelan el backup tras su primer bloque Flash y comprueban que no
se consulta el siguiente ni se declara CRC verificado. La lectura Flash
fisica exige identificacion y valida rangos mediante resta para evitar
desbordamiento de `address + length`. Se comprueba el ultimo bloque valido.
Los casos CRC rechazan longitud de respuesta corta/larga, direccion,
longitud de sector o estado incorrectos antes del siguiente sector.

## Contactos: alcance y criterios

Los contactos son QSO del libro de guardia, no contactos DMR de la radio ni
la agenda telefonica de Android. La radio UV-K5 V3 de este proyecto no es
un terminal DMR. No hay integracion con ContactsProvider.

| Caso | Comprobacion requerida |
| --- | --- |
| Alta | Guardar indicativo, UTC, frecuencia, modo, informes y notas; verificar ID y todos los campos |
| Persistencia | Cerrar completamente, reabrir y reiniciar telefono; no basta con que siga en pantalla |
| Edicion | Mismo ID, un solo registro, campos no editados intactos |
| Borrado | Cancelar confirmacion conserva registro; confirmar borra solo el seleccionado |
| Busqueda | Mayusculas, Unicode, sin coincidencias, mas de 50 registros; exportacion no truncada |
| General/POTA/SOTA | Seleccion y persistencia de libro; campos de estacion/referencia; aislamiento entre libros |
| Duplicados | Aviso dentro del libro, confirmacion explicita; no fusionar QSO de actividades distintas |
| ADIF | Vista previa, cancelacion sin escritura, longitudes, campos no conservados, UTC, deduplicacion |
| JSON | Round-trip UTF-8, IDs, conflictos y rollback; restaurar no borra registros anteriores |
| Errores | Almacenamiento lleno, URI cancelada o no escribible, cierre/rotacion e importacion incompleta |
| Privacidad | Copias privadas; no incorporar indicativos, ubicaciones o bases reales al repositorio |

Las pruebas host existentes cubren SQLite y reapertura, Unicode, CRUD,
importacion atomica y restauracion. Los casos sobre el telefono siguen
pendientes. La exportacion LoTW no certifica firma, subida o aceptacion TQSL.

Las pruebas instrumentadas de `RadioStoreTest` ya no abren ni limpian
`bricohams.db` del usuario. Cada caso remapea ese nombre a una base privada
`instrumentation-<UUID>.db` y solo elimina su propia base al finalizar.
Incluyen reapertura tras editar/borrar/restaurar JSON, restauracion repetida
sin duplicados e importacion invalida sin persistir registros parciales.
El APK de pruebas y lint se han compilado correctamente. **No se han
ejecutado esas pruebas en un telefono ni emulador**; compilar no demuestra
que sus aserciones hayan pasado.

## Canales y aislamiento por slot

El editor Android actual edita **canales FM existentes**: no equivale al CRUD
completo de la web ni permite inferir altas/bajas/copia entre slots.
No usarlo para prometer gestion de contactos DMR.

Antes de cada ensayo fisico:

1. Identificar hardware V3/PY32 y firmware exacto, no solo nombre del perfil.
2. Leer inventario multiboot, etiqueta y CRC; anotar indice interno y etiqueta
   visible por separado. No escribir suponiendo que "slot 3" es indice 3.
3. Confirmar banco activo y hacer backup completo verificado en disco.
4. Elegir un canal de prueba del banco activo sin sustituir datos del usuario.
5. Probar nombre/RX/TX/CTCSS/DCS/potencia/ancho/TX lock, con TX fisico evitado.
6. Releer todos los bytes y comparar regiones protegidas y calibracion.
7. Reiniciar, verificar persistencia; cambiar de slot y comprobar que los
   otros bancos conservan sus hashes. Restaurar y comprobar el original.
8. Desconexion, timeout y rechazo de bloque deben cerrar sesion y exigir
   relectura/backup; un corte no se presenta como transaccion atomica.

La orden de escritura debe ocultar atributos afectados, escribir registros/
nombres y restaurar atributos antes de la relectura. No se modifica el mapa
de calibracion ni se restauran datos de otra radio.

## CAT en SAT RX y Android

CAT RX es temporal y distinto de escribir canales. F4HWN v6.1 por si solo
no garantiza la presencia del modulo CAT Bricohams. Hace falta QUERY valido
y capacidades esperadas, con la app SAT RX abierta y CAT habilitado mediante
tecla 8. El ensayo inicial no requiere PTT.

| Caso | Resultado esperado y evidencia |
| --- | --- |
| Identificar | Version correcta y foto/pantalla del slot activo, sin deducirla del nombre |
| QUERY | Sesion activa, capacidades y frecuencia coherentes |
| SET RX VHF/UHF | ACK pendiente seguido de QUERY aplicado; comparar pantalla y frecuencia externa |
| Fuera de banda | Rechazo explicito, sin cambio de sintonia |
| Ruido/CRC/secuencia | Rechazo o timeout acotado; no ejecutar una orden posterior involuntaria |
| STOP | Remoto desactivado y restauracion confirmada; comprobar tambien salida de pantalla |
| OTG desconectado | Sesion cerrada, mensaje explicito y ausencia de sintonia tardia |
| Rotacion/background | Sin worker duplicado ni SET posterior al abandono |
| Pase SGP4/Doppler | Observador/TLE/hora identificados; comparar prediccion y updates RX |
| Separacion persistente | Canales y calibracion iguales antes/despues de CAT |
| PTT lease | Ensayo separado con autorizacion y carga/instrumentacion adecuadas, no antena al aire por defecto |

Para PTT deben comprobarse armado local tecla 9, denegacion por bloqueo/
banda/estado, liberacion por STOP/desconexion, expiracion de lease y limite
de 120 s. No se prueba TX automaticamente ni se certifica potencia, armonicos
o frecuencia sin instrumentos. El movil no tiene altavoz/microfono de la
radio por el mero hecho de conectar CAT.

## Modificaciones de hardware: compatibilidad y limites

La compatibilidad de un mod V1 no se traslada al V3 por compartir carcasa.
El MCU, memoria y RF son distintos. La referencia K1 teardown consultada
confirma PY32F071, 128 KB Flash, 16 KB SRAM y memoria SPI 2 MB; no demuestra
una modificacion concreta en todas las revisiones de placa V3.

| Familia | Clasificacion para esta auditoria | Evidencia que falta antes de recomendar |
| --- | --- | --- |
| Antena externa/adaptador | Accesorio, no cambio de placa | Conector exacto, carga mecanica, ROE y banda; ganancia RX no garantiza TX seguro |
| USB-C/OTG/datos | Interfaz existente | Cable de datos, host/permiso, alimentacion y enumeracion reales |
| Cable Kenwood USB-serie | Condicional al adaptador y pinout | Niveles y cable adecuado; no conectar RS-232 directamente |
| EEPROM V1 ampliada | No aplicable directamente | V3 usa Flash SPI, no insertar EEPROM por analogia |
| SI4732/SSB/HF de V1 | No verificado para V3 | Placa, alimentacion, bus, espacio, firmware PY32 y pruebas RX |
| LNA/filtros satelite | No verificado | Esquema de esa revision, impedancias, selectividad, saturacion, aislamiento de TX |
| Filtro paso bajo TX | No verificado | Frecuencia, potencia, perdidas, ROE y medida de armonicos sobre carga |
| Cambio bobinas/27 MHz | No extrapolable de V1 | Esquema, valores medidos, estabilidad y conformidad; no publicar valores inventados |
| Ampliar Flash SPI | No soportado por los mapas actuales | JEDEC, tension, patillaje, comandos, sectores, bootloader y todo lector/escritor |
| ESP32/coprocesador | Proyecto de adaptacion, no plug-and-play | Buses y arbitraje, niveles, alimentacion y driver propio V3 |
| SWD/depuracion | Condicional a placa y firmware | Pads confirmados, niveles, backup y recuperacion sin borrar calibracion |
| Audio/discriminador | No verificado | Esquema analogico, aislamiento, carga y prueba sin inyectar tension a ADC/DAC |
| Bateria/carga/potencia | Fuera de validacion actual | No cambiar celdas/protecciones ni elevar potencia con instrucciones no verificadas |

No se ha abierto ni modificado la radio durante esta auditoria. No existe
evidencia para certificar todas las modificaciones posibles. Los esquemas
de conexion interna completos requieren fotos de ambas caras de la placa
exacta, trazado de continuidad sin alimentacion y valores/encapsulados
identificados por personal cualificado; no se derivan de un diagrama de
bloques. Las protecciones de bateria, RF y calibracion no se omiten.

## Documentacion y generacion del firmware

Fuentes principales:

- [Atlas hardware y mapas V3](ATLAS-UV-K5-V3.md).
- [Builds, formatos BHA1/BHT1 y residente independiente](BRICOHAMS-FIRMWARE.md).
- [Android: almacenamiento, CAT, canales, permisos y limitaciones](ANDROID.md).
- [Configuracion y seguridad de bancos](AYUDA-CONFIGURACION.md).
- [Guia Quansheng](AYUDA-QUANSHENG.md).
- [Estado de entrega](ESTADO-ENTREGA.md).

La revision integral debe cruzar todos los documentos y HTML generados con
codigo y manifiestos, no corregir solo la pagina principal. Los historicos
de entregas conservan sus resultados antiguos y no se reescriben para
atribuirles validaciones nuevas.

Registrar por cada build: commit/dirty, toolchain y flags, licencias, mapa/
tamano Flash-RAM-pila, hashes de fuentes/BIN/APK, formato y direccion de
carga, matriz de pruebas, errores conocidos y via de recuperacion.
Los problemas ya encontrados incluyen CRC fuera del limite del firmware,
mock demasiado permisivo, manifiesto Android desactualizado, diferencias
entre main publicado/local, timebase del residente y falta de driver fisico
para transferencia de apps. La guia del residente documenta las correcciones
y no confunde compilacion reproducible con ejecucion validada.

### Regresion de esta revision

Tras integrar la guia en ayuda, servidor local y lista de instaladores:
283 pruebas web correctas, cero fallos, y `npm run check` correcto.
Esta evidencia pertenece al arbol local modificado, no a main publicado.
La compilacion de instrumentacion Android y `lintDebug` tambien finalizan
correctamente; no se ha instalado ninguna APK ni enviado ordenes a la radio.

En la comprobacion de dispositivos solo aparece COM3 Intel AMT SOL y la
lista ADB esta vacia. COM3 no se usa como sustituto del puerto Quansheng.
Se necesita enumeracion de la radio y autorizacion ADB del telefono antes
de ejecutar los ensayos fisicos descritos.

### Contraste documental realizado

| Documento o grupo | Contraste y correccion de esta revision | Limite |
| --- | --- | --- |
| Arquitectura | Eliminada la afirmacion de que no existe escritura de canales Quansheng; distingue lecturas previas de ensayos pendientes | No certifica protocolos de otros equipos |
| Estado de entrega | Se conserva matriz historica y se agrega identificacion de la base local frente a main publicado | No se reescriben resultados antiguos |
| Android | CRC sectorial, cancelacion, cierre tras error y base aislada de instrumentacion | Manual local no describe automaticamente la APK publicada mas reciente |
| Atlas V3 | Matriz de mods sin extrapolacion V1, fuentes y ausencia de esquema completo verificado en el material consultado | Sin medidas electricas ni continuidad de esta unidad |
| Biblioteca de firmware | Enlaces AnyTone/Android/auditoria y separacion entre derivados F4HWN y plataforma BHA1 | Catalogar no equivale a instalar ni validar |
| Guia Quansheng | Revisadas secciones de visor, catalogo, slots y DFU; conservan alcance y CRC de pruebas anteriores | Arranque SAT y escritura de canales siguen pendientes |
| Configuracion, OpenGD77 y AnyTone | Contraste de copias, edicion local y limites de escritura por familia | Una Quansheng no valida hardware DMR ni convierte JSON/CSV a RDT |
| Ejemplos y ARDF | Procedencia, licencias y distincion entre ARDF oficial y modulo Bricohams | No se certifican binarios ajenos o modificaciones RF |
| Bricohams | Corregida identidad de la linea derivada; residente independiente y formatos documentados por separado | Faltan USB/Flash fisicos y presupuesto RAM de integracion |
| Karina, Dim0s e indice de terceros | Corregido estado historico de grabacion; distinguidos ZIP homonimos de 2296162 y 2161962 bytes con hashes diferentes | Sin fuente Karina verificada ni equivalencia entre ambos ZIP |
| Despliegue, ADR y marca | Separada recomendacion de origen dedicado de Pages real compartido; conservadas URLs historicas con aclaracion; tema Android naranja contrastado con recursos | Sin migracion automatica de datos ni validacion visual en dispositivo |
| Comunidad y licencias | Busquedas negativas descritas con alcance, no como prueba de inexistencia; ausencia de permiso de redistribucion verificado no se presenta como dictamen universal | No se han vuelto a auditar todas las licencias remotas |
| HTML y empaquetado | Guias regeneradas y comprobadas con tests de enlaces, servidor, Pages/exportador e instaladores | No se ha publicado una nueva version |

Esta tabla registra el alcance recorrido, no declara revision linea por
linea de toda la documentacion ni de todos los repositorios externos.
Las restantes secciones y fuentes deben contrastarse antes del cierre
exhaustivo solicitado. No se convierte la ausencia de incidencias observadas
en certificacion de que todos los componentes funcionan.

En la plataforma portable se redujo el scratch del almacenamiento de 5184
a 4160 bytes conforme al limite combinado BHA1, ahorrando 1024 bytes sin
reducir paquetes validos. Nueve pruebas CTest pasan, incluida transferencia
JS/C y carga del maximo con 3072 bytes de codigo mas 1024 de datos. No es
todavia una medicion de RAM/pila del residente con USB/Flash integrados.

### Revalidacion local del 27-10-2026

En el arbol de trabajo actual, `npm test` finaliza con 285 pruebas correctas
y cero fallos; `npm run check` tambien termina correctamente. No se pudieron
repetir las pruebas Android: Gradle encontro Java 8, mientras que Android
Gradle Plugin 8.7.3 requiere Java 11 o posterior, y no se encontro otro JDK
instalado. Tampoco se pudieron reconstruir las suites CTest: CMake no encontro
NMake ni un compilador C disponible. Estos bloqueos corresponden al entorno
de validacion y no son resultados de pruebas de codigo. No se ejecutaron
pruebas instrumentadas, USB, radio ni RF.

## Cierre y certificacion pendientes

No se emite certificado hasta identificar APK instalado, telefono/Android,
firmware y slot/banco, ejecutar casos fisicos sin perdidas, conservar
evidencias privadas y registrar los fallos/reparaciones con reensayo.
Una auditoria de software satisfactoria no certifica homologacion RF,
seguridad electrica ni todos los mods de terceros.
