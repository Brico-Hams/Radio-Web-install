# Revision de requisitos y entrega

Revision del 25-10-2026. El proyecto sigue en Beta. Esta matriz distingue
funciones implementadas de pruebas fisicas y objetivos pendientes.
Una compilacion correcta no demuestra que una radio haya arrancado con ella.
**Entrega incompleta:** quedan requisitos por implementar y validar.

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
| CAT-01 | Cambiar frecuencia durante el pase seleccionado | CAT RX habilitado fisicamente, lease de 3 s y seguimiento web con parada segura | Validacion USB/RF real; no es control TX ni seguimiento autonomo dentro de la radio |
| CAT-02 | Editar frecuencia, subtonos y potencia por canal desde Android | Editor de canales web existente; CAT actual solo controla sintonia RX temporal | Protocolo acotado y validado, aplicacion Android y pruebas de persistencia |
| AND-01 | Aplicacion Android Bricohams | Proyecto Kotlin 0.7.1-beta; SQLite, ADIF, SSTV, estadisticas ARDF, captura de microfono y CAT RX por CDC ACM y adaptadores reconocidos, con pruebas host | Funciones pendientes, instalacion, permisos y prueba OTG/RF de cada cable en telefono |
| AND-02 | Funciones de satelites tipo Look4sat | SGP4 offline Android, TLE importados, observador manual, pases 24 h y Doppler CAT RX con parada segura | Descargas automaticas, GPS/mapas, matriz telefono/cable/radio y funcionamiento de campo; no se declara paridad Look4sat |
| AND-03 | SSTV Robot36 | Decodificador WAV y captura de microfono acotada experimental con VIS/paridad, color 320x240 y PNG; pruebas sinteticas de niveles, color y exportacion | Validacion de AudioRecord/ruta fisica y RF, deriva/ruido, decodificacion continua y transmision si procede |
| AND-04 | Interpretar Morse | Texto, WAV PCM y captura de microfono hasta 60 s con decodificacion posterior y tono/velocidad fijos; pruebas sinteticas | AudioRecord real, decodificacion continua, adaptacion y medidas de error con muestras reales |
| AND-05 | «encriptions» | Termino sin aclarar | Definir la funcion; no se ha supuesto cifrado ni una capacidad inexistente |
| AND-06 | Libro de guardia tipo HAMRS | Contactos SQLite, busqueda, edicion/borrado, ADIF ASCII con importacion/vista previa, JSON y restauracion transaccional; pruebas host | Validacion en telefono y compatibilidad ampliada de campos/modos ADIF; no se declara paridad HAMRS |
| AND-07 | Subida a LoTW | Objetivo documentado; ADIF/TQSL no equivale a subida directa | Firma, certificado, custodia de claves y flujo LoTW verificable desde Android |
| AND-08 | Estadisticas de caza del zorro con GPS | Firmware exporta resumen; Android guarda sesiones, historial, fijacion puntual con precision/UTC, intervalos por baliza y suma filtrada de segmentos GPS sin unir huecos, previa autorizacion | GPS real, recorrido continuo, mapas, sincronizacion con firmware y estadisticas de campo ampliadas |
| BRAND-01 | Marca Bricohams y bootlogos | Bienvenida y bitmap monocromo embebido; Android conserva PNG original y acento naranja | Comprobar LCD fisico e interfaz en telefono |
| BRAND-02 | Naranja corporativo al terminar y probar | Paleta documentada; logo corporativo conservado | Migracion final web/Android, contraste y regresiones visuales |
| DOC-01 | Documentacion natural sin personalizacion de IA | Revision editorial de autorias visibles y relatos conversacionales | Mantener estilo tecnico directo; conservar licencias y atribuciones legales |
| REL-01 | Push a main al terminar | Autorizacion de publicacion registrada | Cerrar requisitos o acordar expresamente una entrega parcial; ejecutar push y comprobar CI/Pages |
| REL-02 | Nuevos instalables con todas las caracteristicas | Cadena existente para Windows, Debian/Raspberry Pi, Arch y FreeBSD | Construir desde la revision de entrega y probar contenido/arranque; no hay nuevos instalables de esta revision |
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
  JVM/Robolectric correctas, incluidas USB/CAT simulado, ADIF, Robot36, SGP4,
  captura/pantalla de microfono y estadisticas/historial ARDF. Cero errores
  y doce avisos lint. Firmas y hashes de las 58 fuentes verificados;
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
