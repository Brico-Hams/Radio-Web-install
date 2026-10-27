# Revision de requisitos y entrega

Revision del 25-10-2026. El proyecto sigue en Beta. Esta matriz distingue
funciones implementadas de pruebas fisicas y objetivos pendientes.
Una compilacion correcta no demuestra que una radio haya arrancado con ella.
**Entrega incompleta:** quedan requisitos por implementar y validar.

## Revision complementaria del 26-10-2026

La matriz y cifras del 25-10 siguientes son historicas. Para la auditoria
actual, consultar [Validacion integral V3 y Android](VALIDACION-INTEGRAL-V3-ANDROID.md):
283 pruebas web locales correctas, 92 pruebas Android host locales y 93
en la revision publicada aislada `01c58563e6507d17bd2bec612ef669840abfeddb`.
No son resultados intercambiables. La correccion local de CRC sectorial
Android no esta publicada. Las pruebas instrumentadas usan una base aislada
y compilan, pero no se han ejecutado en dispositivo. No hay certificado
fisico de contactos, canales o CAT del slot SAT actual.

La revision publicada incorpora libros General/POTA/SOTA y lista de pases
que no estan en esta base local. Los pendientes AND-02/AND-06 de la matriz
historica deben interpretarse segun la revision que se este evaluando.
El residente independiente y las apps BHA1 son experimentales: sus pruebas
portables no equivalen a soporte fisico USB/Flash ni a arranque validado.

## Peticiones revisadas

| ID | Peticion | Estado y evidencia | Pendiente para darla por terminada |
| --- | --- | --- | --- |
| USB-01 | Cargar y borrar canales PMR y repetidores Quansheng | Conector, editor y protecciones implementados. Dos lecturas reales coincidentes de configuracion y calibracion; 200 canales en F4HWN v6.0.0 | Respaldo integral y pruebas reales de escritura, borrado y relectura |
| USB-02 | Cargar satelites y memorias Doppler Quansheng | Planificacion SGP4, memorias RX y CAT RX experimental en imagen Satelites | Validacion RF y carga fisica de memorias en la unidad |
| FW-01 | Catalogo de versiones de firmware | Catalogo y guias por familias, revisiones y opciones | Mantener cobertura al incorporar nuevas versiones; reconocimiento no equivale a compatibilidad probada |
| WEB-01 | Publicar y redesplegar la web | Ultimo main publicado: `f7bd6125893385dd517fecd105967f241a65991f` | Publicar los cambios posteriores y comprobar Pages; no hay nueva publicacion en esta revision |
| FW-02 | Documentar Karina exhaustivamente | Expediente V1, paquete V3/UV-K1 Dim0s, inventarios, hashes y funciones observadas | Completar contraste funcional y visual; no se ha recuperado el proyecto fuente |
| FW-03 | Bricohams con todas las funciones Karina | Implementacion independiente sobre base abierta F4HWN V3; no copia ni recompilacion Karina | Paridad funcional completa y pruebas por funcion; no se declara el 100 % |
| FW-04 | Multiboot y compilacion modular a demanda | Constructor con commit fijado, presets, modulos separados y verificacion estructural | Probar arranque, cambios de slot y recuperacion en V3 sin sustituir Main |
| FW-05 | Biblioteca de firmware existente en slots | Seleccion local y clasificacion por formato/modelo, con rechazos de incompatibles | Instalar y probar cada imagen compatible; no convertir automaticamente V1 a V3 |
| FW-06 | ARDF activable y separado si no cabe todo | Imagen ARDF: ciclos, sincronizacion y memoria manual de atenuacion | Pruebas de campo y restantes comportamientos documentados |
| FW-07 | Espectro y funciones VFO-PRO | Imagen Espectro: RSSI, peak hold, promedio, presets RAM, exclusiones, captura RX y busqueda CSS | Verificar RF/CSS y equivalencia de funciones pendientes; no transmite ni calibra |
| FW-08 | Conservar presets de espectro | Exportacion/importacion BHSP con validacion atomica y relectura | Persistencia interna si se requiere; los archivos no son EEPROM |
| FW-09 | Licencia MIT indicada para Karina | Declaracion registrada; no se localizo aviso verificable en el paquete | Identificar titular, componente y texto de licencia antes de redistribuirlo como MIT |
| HELP-01 | Ayuda completa de todas las familias y opciones | Catorce guias HTML, incluidas Android y esta revision; 84 opciones de interfaz, historial de 18 versiones y 94 opciones historicas | Ampliar con cada funcion nueva; no afirmar cobertura de variantes sin evidencia |
| HELP-02 | OpenGD77 y todos sus modelos | Guia de configuracion y matriz por familias/revisiones | Pruebas fisicas por modelo; el catalogo no certifica todas las radios |
| PRO-01 | Modo PRO sin confirmaciones repetitivas | Activacion explicita por sesion y operaciones protegidas | No elimina permisos del navegador ni respaldo, CRC, hashes o proteccion de Main |
| DATA-01 | Configurar RepeaterBook en la version instalada | Formulario de proveedor y servidor local con token en memoria | Prueba con credenciales y autorizacion propias; no se incluyen tokens |
| DATA-02 | Descargar contactos DMR automaticamente | RadioID y seleccion/importacion; CSV en web cuando CORS impide API directa | Verificacion por equipo y capacidad; no todos los servicios permiten acceso directo desde Pages |
| DATA-03 | Descargar salas/grupos DMR | Consulta BrandMeister e importacion de grupos | Un grupo de conversacion no equivale a todas las salas de todas las redes; completar otras integraciones solicitadas |
| GD77-01 | CPS OpenGD77 completo sin instalar nada | Edicion estandar, referencias, datos y planificacion en navegador | Flasheo, voces, base masiva de IDs, zonas/ajustes completos y paridad con CPS externo no implementados |
| GD77-02 | Backup automatico de firmware original y calibracion antes de operar | Calibracion y codeplug automaticos con hashes; resultado PARCIAL | Lectura integra del MCU verificada por modelo; las operaciones fisicas posteriores siguen bloqueadas |
| ANY-01 | CPS AnyTone web | Seccion Beta con proyecto JSON/CSV, importacion, edicion y zonas | USB, RDT nativo y parametros completos por modelo/firmware |
| ANY-02 | Codeplug con repetidores digitales y analogicos de Espana | PMR y normalizadores de RepeaterBook, RadioID y URE | Fuentes actuales autorizadas, cobertura nacional contrastada y codeplug nativo del modelo exacto |
| ANY-03 | Reutilizar bases OpenGD77 y Quansheng | Importaciones de formatos admitidos conservando parametros conocidos | Completar y revisar campos no publicados; no inventar TS/TG |
| ANY-04 | Aeropuertos si AnyTone admite banda aerea | Importacion de frecuencias RF con fuente AIP y confirmacion manual de AM | Modelo exacto, lista vigente y verificacion de AM/espaciado; no hay base aeroportuaria nacional incluida |
| CAT-01 | Cambiar frecuencia durante el pase seleccionado | CAT RX habilitado fisicamente, lease de 3 s y seguimiento web con parada segura; aparte, CAT TX v1 (PTT por lease, tecla 9) solo para enviar SSTV | Validacion USB/RF real; no hay seguimiento autonomo dentro de la radio ni Doppler de subida |
| CAT-02 | Editar frecuencia, subtonos y potencia por canal desde Android | Editor Android Beta de canales FM F4HWN v6: nombre, RX/TX, CTCSS/DCS RX y TX, potencia, estrecho y bloqueo TX; respaldo completo con CRC de la radio y SHA-256 en disco, escritura por bloques en el orden web y relectura; 10 pruebas host con radio simulada | Ejecucion de las pruebas en CI, prueba OTG real con escritura y relectura en una radio, y persistencia tras reinicio |
| AND-01 | Aplicacion Android Bricohams | Proyecto Kotlin 0.8.2-beta; SQLite, ADIF, SSTV, estadisticas ARDF, captura de microfono y CAT RX por CDC ACM y adaptadores reconocidos, con pruebas host | Funciones pendientes, instalacion, permisos y prueba OTG/RF de cada cable en telefono |
| AND-02 | Funciones de satelites tipo Look4sat, con interfaz similar | Pantalla redisenada con marca Bricohams y codigo propio: TLE de CelesTrak y frecuencias de SatNOGS descargados a peticion (o TLE importado), observador manual o ultima posicion GPS, pases 24 h de los satelites elegidos con cuenta atras, radar polar, mapa mundial offline (Natural Earth) con huellas y trazas, busqueda y seleccion de satelites, Doppler CAT RX con parada segura, grabacion del pase a WAV 16 kHz privado y busqueda de imagenes Robot36 en la grabacion; pruebas host con red y microfono simulados | Validacion en telefono (rendimiento de muchos satelites, GPS, AudioRecord), descarga real comprobada en campo, matriz telefono/cable/radio, transpondedores lineales y Doppler de subida; no se declara paridad Look4sat |
| AND-03 | SSTV Robot36 con CAT contra el firmware Bricohams | Decodificador WAV y captura de microfono con VIS/paridad, color 320x240 y PNG; la pantalla CAT graba Robot36 mientras el Doppler o la sintonia CAT siguen activos; pruebas sinteticas | Validacion de AudioRecord, ruta fisica y RF; decodificacion continua en streaming, deriva y ruido |
| AND-04 | Interpretar Morse | Texto, WAV PCM y captura de microfono hasta 60 s con decodificacion posterior y tono/velocidad fijos; pruebas sinteticas | AudioRecord real, decodificacion continua, adaptacion y medidas de error con muestras reales |
| AND-05 | «SSTVEncrip»: codificar y enviar SSTV al estilo SSTV Encoder (interpretacion aceptada por el usuario) | Codificador Robot36 con ida y vuelta por el decodificador; envio desde la pantalla CAT con PTT CAT v1 del firmware (0x7B02): arme en la radio con tecla 9, lease de 1,5 s, corte a 120 s, TX lock, bandas, bateria y modulacion de la radio, aborto con cualquier tecla, indicativo obligatorio impreso en la imagen y confirmacion en la app; pruebas C del nucleo y del adaptador y 4 pruebas host con radio simulada; imagen satelite compilada sin avisos | Prueba en radio y medida RF (nivel de microfono, desviacion, LED, corte por tecla); otros modos SSTV (Martin, Scottie, PD); Doppler de subida |
| AND-06 | Libro de guardia como HAMRS | Libros por actividad con plantillas General/POTA/SOTA (referencia de parque o cumbre e indicativo de estacion), entrada rapida con UTC automatico, RST por modo, frecuencia conservada y aviso de duplicados (indicativo, banda y modo; por dia UTC en POTA/SOTA), ADIF ASCII por libro con BAND y MY_POTA_REF/MY_SOTA_REF, importacion ADIF con vista previa al libro actual, JSON v2 (acepta v1) y migracion SQLite 1->2 con respaldo previo; pruebas host | Validacion en telefono, renombrar/borrar libros, otras plantillas (WWFF, Field Day), referencias del corresponsal (P2P) y subida a POTA/SOTA; no se declara paridad HAMRS |
| AND-07 | Subida a LoTW | Objetivo documentado; ADIF/TQSL no equivale a subida directa | Firma, certificado, custodia de claves y flujo LoTW verificable desde Android |
| AND-08 | Estadisticas de caza del zorro con GPS | Firmware exporta resumen; Android guarda sesiones, historial, fijacion puntual con precision/UTC, intervalos por baliza y suma filtrada de segmentos GPS sin unir huecos, previa autorizacion | GPS real, recorrido continuo, mapas, sincronizacion con firmware y estadisticas de campo ampliadas |
| BRAND-01 | Marca Bricohams y bootlogos | Bienvenida y bitmap monocromo embebido; Android conserva PNG original y acento naranja | Comprobar LCD fisico e interfaz en telefono |
| BRAND-02 | Naranja corporativo al terminar y probar | Paleta documentada; logo corporativo conservado | Migracion final web/Android, contraste y regresiones visuales |
| DOC-01 | Documentacion natural sin personalizacion de IA | Revision editorial de autorias visibles y relatos conversacionales | Mantener estilo tecnico directo; conservar licencias y atribuciones legales |
| REL-01 | Push a main al terminar | Autorizacion de publicacion registrada | Cerrar requisitos o acordar expresamente una entrega parcial; ejecutar push y comprobar CI/Pages |
| REL-02 | Nuevos instalables con todas las caracteristicas | Cadena existente para Windows, Debian/Raspberry Pi, Arch y FreeBSD; la Release v0.5.1 (instaladores, firmware Bricohams v6.1.0 y APK 0.8.1-beta) se genera en CI desde la etiqueta de esta revision; v0.5.0 quedo como etiqueta sin Release por un pin de Studio con CRLF | Probar contenido y arranque de cada instalable; APK firmada solo con clave de depuracion |
| REL-03 | ZIP con proyecto, firmware, instalables y evolutivos | Exportador de desarrollo preparado con verificacion de integridad y exclusiones | Ejecutarlo con todos los artefactos de entrega y comprobar extraccion; no sustituye funciones pendientes |

## Evidencia de software mas reciente

- 211 pruebas JavaScript correctas en esta revision, incluida la exportacion
  Android con extraccion del ZIP y comprobacion de integridad.
- Ocho suites C correctas en la ultima validacion del firmware; esta revision
  de documentacion y entrega no cambia sus fuentes C.
- Compilacion ARDF con estadisticas: 113960 bytes RAW, RAM 12576/16384,
  Flash 113072/120832; manifiesto y diez hashes de fuentes comprobados.
- Satelites CAT: 113868 bytes RAW. Espectro con BHSP: 118044 bytes RAW.
- Panel ARDF presente y bloqueado sin conexion en navegador.
- Ninguna de estas imagenes se ha flasheado ni validado fisicamente.
- Android 0.7: APK y pruebas instrumentadas compiladas. Sesenta y nueve pruebas
  JVM/Robolectric correctas en CI, incluidas USB/CAT simulado, ADIF, Robot36, SGP4,
  captura/pantalla de microfono y estadisticas/historial ARDF. El 2026-10-26 pasan en local
  las 100 pruebas host, incluidas las del editor de canales (CAT-02), las de envio SSTV por
  PTT CAT (AND-05), las de satelites, mapa, descarga y grabacion de pases (AND-02) y las de libros por actividad (AND-06); falta su primera ejecucion en CI. Cero errores y 32 avisos lint (sobre todo palabras sin tilde, plurales y tipografia de los textos nuevos). Firmas y hashes de las 58 fuentes verificados;
  el manifiesto de cada construccion registra el resultado que le corresponde.
  Las pruebas instrumentadas estan compiladas, no ejecutadas; no hay telefono conectado.

Los numeros son evidencia fechada, no un contador que sustituya las pruebas
de cada revision. Las compilaciones anteriores siguen siendo evolutivos;
un nombre de carpeta que contenga `final` no las convierte en versiones estables.

## Condiciones de entrega

1. Revisar cada ID y cerrar su pendiente con evidencia, o registrar un cambio
   de alcance aprobado. No sustituir un requisito por un boton o un mock.
2. Probar software, documentacion, arranque local y capacidades reales.
   Para hardware: respaldo integral, identificacion y pruebas autorizadas.
3. Aplicar y comprobar la paleta naranja al finalizar las funciones.
4. Construir instalables desde la misma revision y verificar contenido,
   licencias, integridad y arranque. No reutilizar paquetes anteriores como nuevos.
5. Publicar en main, comprobar CI y Pages y registrar la revision publicada.
6. Exportar fuentes, historial, artefactos de firmware con sus fuentes y
   licencias, instalables y evolutivos verificables. Incluir inventario y hashes.
7. Extraer el ZIP en otro directorio, verificar sus hashes y ensayar el arranque.
   Comprobar que no contiene credenciales, copias de radios ni calibraciones.

## Alcance de la exportacion

El exportador genera una **instantanea de desarrollo Beta**, no certifica que
la matriz este terminada. Exige aceptarlo mediante `--beta`. No publica,
compila ni flashea. Su uso se describe en [Despliegue](DEPLOYMENT.md#exportar-el-proyecto).
La entrega definitiva sigue condicionada a los puntos anteriores.

Los evolutivos son compilaciones Bricohams verificables y el historial Git de
HEAD junto con el estado actual de las fuentes. No se incluye por defecto
todo `Documents/Multiboot`: contiene paquetes de terceros, configuraciones
y calibraciones que no deben confundirse con una distribucion del proyecto.
Los directorios de compilacion fallida se notifican, no se presentan como firmware.
La opcion `--android` incorpora una entrega APK Beta solo si todos los hashes
de sus fuentes coinciden exactamente con la instantanea exportada; incluye
guia, licencias y evidencia de compilacion. No incorpora evolutivos APK
historicos sin sus fuentes correspondientes ni inventa validacion fisica.
