# Ayuda de OpenGD77: configuración y uso seguro

**Fecha de comprobación: 2026-10-25.** Redacción original en español basada en las fuentes oficiales indicadas al final y en el código de esta aplicación. No es una traducción del manual ni una garantía de funcionamiento de todas las compilaciones.

Para elegir una radio, una revisión de placa o una imagen concreta, consulta [Modelos y compatibilidad](AYUDA-OPENGD77-MODELOS.md). Aquí se explica cómo organizar la configuración, usar las funciones documentadas y reconocer los límites del editor web.

## Borrado local de canales (Beta)

En un codeplug estándar de 128 KiB, **Borrar del archivo** libera la memoria
seleccionada y elimina sus referencias en las 68 zonas estándar (80 canales por
zona) y las 64 listas de escaneo (32 canales por lista). Limpia también sus
referencias como prioridad 1, prioridad 2 y canal TX designado, dejándolas en
cero. Conserva nombres, indicadores, otros canales y sus números; no renumera.
No modifica contactos ni la lista SAT. El mapa se contrasta con el
[parser binario del CPS público](https://grid.radio/opengd77/js/g77.js).

Este procedimiento no admite formatos Scanner con zonas extendidas. Opera sobre
una copia en memoria: exporta el binario editado con otro nombre y conserva el
original. En modo normal solicita confirmación; PRO la omite para esta sesión.
No escribe en la radio: la escritura física OpenGD77 sigue bloqueada hasta
disponer del respaldo MCU completo requerido. La radio Quansheng conectada no
permite validar hardware OpenGD77.

## Importar repetidores REMER (solo archivo local)

La pestaña REMER del planificador ofrece las frecuencias VHF/FM transcritas de
la referencia aportada por el usuario. Selecciona las memorias que necesites y
anadelas al codeplug abierto; la aplicacion vuelve a leerlo con el parser
OpenGD77 para comprobar que nombre, frecuencias y modo aparecen en la lista.
Las memorias se preparan solo para recepcion. Los CTCSS publicados quedan como
nota de referencia: no se codifican ni se verifican tonos en RF.

La lista no acredita que una frecuencia, tono, ubicacion o repetidor siga
vigente. Confirma la informacion con REMER y las autoridades competentes antes
de cualquier uso. Las frecuencias HF/SSB de la misma referencia se muestran
como contexto y no se importan como canales VHF. Que el parser acepte un canal
solo acredita que la estructura estandar del binario es legible; no prueba que
el firmware lo muestre tras escribir, que se reciba RF ni que la radio haya
sido programada. La escritura fisica continua bloqueada.

## Importar canales CSV de CPS o CHIRP

En **Canales preparados**, importa `Channels.csv` exportado desde OpenGD77 CPS
o un CSV con cabeceras estándar CHIRP (`Name`, `Frequency`, `Duplex`, `Offset`,
`Mode`). El parser acepta solo canales FM analogicos dentro de VHF 136-174 MHz
y UHF 400-470 MHz. Para CHIRP resuelve `+`, `-`, `split` y `off`, y rechaza
frecuencias, offsets o modos que no pueda validar. Los registros se convierten
en canales solo RX; los tonos de la fuente se anotan, no se programan. Revisa
la tabla de canales preparados, elige una plantilla FM y guarda el binario
local para inspeccionarlo antes de usar el CPS.

Las filas digitales/DMR del `Channels.csv` se excluyen expresamente: los
contactos, grupos TG, listas RX y referencias de zona de `Contacts.csv`,
`TG_Lists.csv` y `Zones.csv` no se migran con esta importacion. Esos archivos
son tablas relacionadas, no un codeplug binario independiente. Los CSV
propietarios de Retevis/RT950 y los `.4rdmf` no se interpretan por su extension
ni por tener columnas de frecuencias: hacen falta especificaciones verificadas
para mapear los campos. Una fila excluida aparece con numero de linea y motivo;
no se descarta en silencio ni se mezcla con el binario.

## Comprobacion web sin instalacion (25-10-2026)

La interfaz incluye una matriz **OpenGD77 CPS: disponibilidad real en web**.
Se sirve como sitio estatico HTTPS, sin instalar Node ni el paquete local.
El acceso fisico requiere WebUSB/Web Serial y permisos del navegador; puede
requerir un controlador del sistema. No se garantiza compatibilidad movil.

| Funcion | Web sin servidor instalado |
| --- | --- |
| Abrir/guardar codeplug estandar, editar/borrar canales y limpiar referencias | Disponible |
| Importar RadioID user.csv | Disponible; la consulta API directa no tiene CORS |
| Grupos BrandMeister | Consulta directa por prefijo e importacion como grupos |
| RepeaterBook | Importar JSON obtenido con autorizacion; consulta autenticada solo con servidor |
| Lista SAT, TLE publicados, pases SGP4 y memorias Doppler | Disponible en navegador |
| Respaldar calibracion/codeplug al conectar | Automatico, persistido y con hashes; copia parcial |
| Copiar firmware MCU de la unidad | No implementado de forma integral verificada por modelo |
| Procesos de radio posteriores al respaldo parcial | Bloqueados, incluyendo nueva lectura/captura |
| Flasheo, restauracion, voces, base masiva de IDs y editor completo de zonas/ajustes | No implementados aqui |

No se promete paridad completa con grid.radio ni con el CPS de escritorio.
Se comprobaron las cabeceras de proveedores: BrandMeister admite el origen web;
RadioID no devuelve Access-Control-Allow-Origin para la consulta probada.
No se ocultan esos limites con proxies publicos ni datos ficticios.

### Respaldo previo obligatorio

Conectar identifica la unidad y ejecuta automaticamente BackupManager antes
de habilitar cualquier otra operacion de radio. La identificacion y las lecturas
necesarias para crear la copia son la unica excepcion. Calibracion y codeplug
se guardan en IndexedDB y se releen con SHA-256 antes de exportar el manifiesto.
Si falta firmware MCU, el resultado declara **RESPALDO PARCIAL**, no se concede
permiso y se bloquean nuevas lecturas, captura, escritura y restauracion, tambien
en PRO. La copia permite abrir el codeplug y editarlo offline sin tocar la radio.

Esta proteccion no crea un lector de firmware inexistente. No es posible afirmar
que ya se respalda automaticamente el firmware original completo. No se prueban
modos/direcciones arbitrarios del MCU para aparentar esa funcion.
Si «original» significa firmware comercial de fabrica ya reemplazado, solo sirve
una copia anterior a la instalacion; leer OpenGD77 no recupera esos bytes.

## 1. Antes de conectar o transmitir

1. Identifica fabricante, modelo completo, revisión de hardware y firmware instalado. «UV380», «10W» y «10W PLUS» no son equivalentes.
2. Anota versión del CPS, fecha/build del firmware, idioma y modificaciones de hardware. Conserva también el nombre y procedencia del paquete instalado.
3. Comprueba tu autorización, el plan de bandas y los parámetros publicados por el responsable del repetidor o red. Un campo de frecuencia aceptado por software **no autoriza a transmitir**.
4. Empieza con canales de **solo recepción**, VOX desactivado y balizas APRS desactivadas. Conecta una antena adecuada antes de cualquier transmisión.
5. Guarda las copias originales fuera del navegador. No calibres ni instales otro firmware para resolver un simple error de canal.

OpenGD77 está orientado a radioafición. No conserva necesariamente todas las funciones del firmware comercial. La guía consultada indica que SMS TX/RX y las listas de exploración comerciales no están soportados, y que privacidad/cifrado no forman parte de su objetivo. No interpretes esta descripción como un dictamen legal mundial. [G: Introduction]

### Tres significados distintos de «soportado»

| Evidencia | Lo que demuestra | Lo que no demuestra |
| --- | --- | --- |
| Un modelo aparece en el manual | Hay documentación de esa familia o función | Que cualquier revisión comercial sea compatible |
| Existe en `firmware-core.js`, `TARGETS` | El catálogo reconoce un destino y ciertos nombres de paquete | Instalación USB, autenticidad por sí sola o compatibilidad con tu placa |
| Existe en `gd77-connector.js`, `MODELS` | El conector conoce un valor de identificación del protocolo | Pruebas físicas con cada modelo, flasheo o permiso de escritura |
| La radio responde a la identificación | Se recibió una estructura reconocida y una familia coincidente | Respaldo integral o compatibilidad universal de memoria |
| El editor muestra canales | Puede interpretar el área estándar del archivo | Que haya leído canales extendidos, todos los datos de usuario o firmware |

**Estado real de esta web: la escritura OpenGD77 está BLOQUEADA.** El respaldo implementado guarda calibración y codeplug estándar, pero devuelve `complete: false`: falta un protocolo verificado para copiar íntegramente el firmware interno del MCU. Por ello no se concede permiso de escritura. Descargar una imagen oficial **no sustituye** una copia de la unidad. Que un CPS externo permita escribir no elimina este bloqueo. [L]

## 2. Firmware, codeplug, calibración y copias

| Elemento | Contenido o finalidad | Precaución |
| --- | --- | --- |
| Firmware | Programa que ejecuta la radio | Elegir familia, revisión y variante exactas; no es una lista de canales |
| Codeplug | Configuración: canales, contactos, grupos, zonas y otros ajustes | El formato del fabricante y el de OpenGD77 no son intercambiables sin comprobarlo |
| Calibración | Ajustes de RF propios de esa unidad | No copiar desde otra radio ni editar sin instrumental y procedimiento específico |
| EEPROM / Flash | Regiones de memoria con contenido dependiente del equipo | «Flash» no significa necesariamente firmware MCU ni clon integral |
| MCU ROM / memoria interna | Imagen interna que el CPS puede tratar como copia separada en ciertos equipos | La web no dispone de lectura íntegra verificada para otorgar permiso |
| Voces, base de IDs, datos orbitales | Recursos adicionales cargados con el CPS | No asumir que están incluidos en un codeplug de 128 KiB |

La guía recomienda copias de EEPROM, Flash, calibración, MCU ROM y codeplug antes de la primera escritura de configuración. La disponibilidad concreta de cada copia debe comprobarse en el CPS y modelo usados; esa enumeración no certifica que todas las radios expongan idénticas regiones. Archiva los originales, no solo el archivo editado. [G: Backup Before You Do Anything Else]

### Uso disponible en la web

1. Abre la aplicación en `localhost` o HTTPS y utiliza un navegador que exponga WebUSB o WebSerial, según la familia. La compatibilidad depende del navegador y sistema.
2. Selecciona la familia correcta: `MK22`, `STM32` o `SERIAL`. Confirma la identificación física antes de conectar.
3. Cierra CPS, MMDVMHost y cualquier programa que esté usando la radio. Autoriza únicamente el dispositivo esperado.
4. La conexión identifica la radio y solicita un respaldo automático. Revisa el registro y los errores: el resultado esperado es **parcial**, no un respaldo integral.
5. Comprueba la descarga del archivo `.rwb.json`. El historial permite exportar nuevamente el manifiesto y los binarios individuales. El almacenamiento persistente puede ser rechazado por el navegador: exporta a una carpeta propia.
6. El codeplug de la copia parcial se abre automáticamente para edición offline. **Leer codeplug** queda bloqueado sin respaldo integral. También puedes abrir un binario estándar de exactamente **131072 bytes (128 KiB)**; las extensiones admitidas no sustituyen la validación del contenido.
7. Edita el archivo local y usa **Guardar binario 128 KiB**. Esto no modifica la radio. La escritura permanece bloqueada.
8. Desconecta desde la aplicación antes de cambiar de página o abrir el CPS.

El formulario edita canales existentes: nombre ASCII de hasta 16 caracteres, RX, TX, FM/DMR, CC, TS y solo recepción. Preserva campos no editados; no es un editor completo de todas las funciones del CPS. Las herramientas de planificación también pueden incorporar canales basados en una plantilla, contactos y datos de satélite al archivo local. Eso no acredita que todas las funciones del firmware estén implementadas en el navegador. [L]

**Límite importante:** la lectura web es del área estándar de 128 KiB y no incluye los canales extendidos **1025 y siguientes**. No describas el archivo como clon completo, ni como copia de todas las zonas y recursos de una configuración extendida. Un JSON de respaldo o del CPS, un ZIP de firmware y un binario de tamaño coincidente no son automáticamente un codeplug válido.

### Trabajo con el CPS externo

La guía exige **OpenGD77 CPS** para una radio que ya ejecuta OpenGD77; no el CPS comercial de Radioddity, Baofeng, TYT o Retevis. Recomienda crear un codeplug nuevo o importar CSV y revisar el resultado. Guarda el original y una versión de trabajo antes de escribir. Después de una escritura admitida por el CPS, vuelve a leer y comprueba un canal por escenario. No se presenta este procedimiento como una forma de desbloquear la web. [G: Codeplug compatibility; CPS software]

## 3. Modelo mental: cómo encajan los datos

```text
Identidad propia: indicativo + DMR ID
Contactos digitales: destinos TG o llamadas privadas
Lista TG / RX Group: selección de destinos para un canal
Canal: RX/TX + modo + tonos o CC/TS + destino/lista + restricciones
Zona: selección ordenada de canales
Exploración: canales de la zona o intervalo del VFO
```

Una **base de datos de IDs** sirve para mostrar nombres de corresponsales. No sustituye a los contactos ni asigna el TG de transmisión. Un **contacto digital** puede representar un grupo o una llamada privada: el tipo importa tanto como el número.

En CPS o codeplugs comerciales encontrarás «RX Group», «RX Group List» o «grupo de recepción». OpenGD77 documenta el uso de **TG Lists** para seleccionar TG desde el canal y, según el filtro, limitar lo recibido. No des por hecho que una lista importada reproduce exactamente las reglas de recepción del firmware comercial. [G: CPS software — Overview]

### Orden recomendado al programar

1. Introduce tu indicativo y DMR ID cuando corresponda.
2. Crea contactos digitales de tipo grupo para los TG necesarios; separa las llamadas privadas.
3. Crea listas TG útiles por repetidor, zona geográfica o uso.
4. Crea canales con las frecuencias, modo y parámetros del servicio real.
5. Asigna una lista TG o un contacto directo, según el flujo elegido.
6. Agrupa los canales en zonas pequeñas y ordenadas.
7. Revisa saltos de exploración, potencia, TOT y solo recepción.
8. Guarda, revisa y prueba primero en recepción.

No es necesario duplicar un canal por cada TG cuando coinciden RX/TX, CC y uso del repetidor y la lista TG cubre los destinos. Sí puede ser conveniente separar canales con distinto TS, condiciones operativas o restricciones.

**Matiz de versiones:** el apartado general del CPS recomienda al menos una lista TG con un contacto de grupo; el apartado `Channel Details` también documenta seleccionar **TG Lst o Contact**, no ambos a la vez. Son flujos que deben comprobarse en el CPS/build usado, no una razón para afirmar que todas las versiones gestionan ambos de idéntica forma.

## 4. Campos de canal y significado práctico

| Campo | FM | DMR | Qué revisar |
| --- | --- | --- | --- |
| Nombre | Identificación local | Identificación local | Un nombre no configura el repetidor |
| RX | Frecuencia que escucha la radio | Frecuencia que escucha la radio | En repetidor, normalmente su salida |
| TX | Frecuencia que emite la radio | Frecuencia que emite la radio | En repetidor, normalmente su entrada |
| Modo | FM / FM estrecha | DMR | Debe coincidir con el servicio |
| BW | 25 o 12,5 kHz en la guía | No equivale a seleccionar TS | Seguir la canalización local |
| RX CSS | CTCSS o DCS de recepción | No aplica como filtro DMR | Un tono incorrecto puede silenciar audio válido |
| TX CSS | CTCSS o DCS transmitido | No aplica | Usar el que requiere el repetidor |
| Color Code | No aplica | CC 0–15 | No es TG ni tono analógico |
| Timeslot | No aplica | TS1 o TS2 | Debe coincidir con la asignación de la red |
| TG List / Contact | No es la lista de tonos DTMF | Destino seleccionable o directo | Verificar tipo grupo/privado y posibles overrides |
| DMR ID | No identifica por sí solo una emisión FM | Identidad digital propia | Puede existir ajuste específico por canal |
| RX Only | Evita TX | Evita TX | Muy útil durante preparación |
| TOT | Límite de transmisión | Límite de transmisión | Revisar duración efectiva y aviso |
| Ch Power | Potencia propia o Master | Potencia propia o Master | La cifra mostrada no es una medida RF |
| Zone Skip / All Skip | Exclusión de exploración | Exclusión de exploración | Son controles distintos |
| Ubicación de canal | Coordenadas del repetidor | Coordenadas del repetidor | No confundir con la ubicación del operador |
| APRS | Perfil de baliza FM | Puede requerir frecuencia FM separada | No equivale a recepción APRS |

**Simplex:** RX y TX coinciden. **Repetidor:** programa ambas frecuencias explícitamente; no confíes solo en el signo de un desplazamiento. El paso de sintonía del VFO no es el ancho de banda de FM.

`Reverse` intercambia la operación RX/TX del repetidor; `Talkaround` transmite en la frecuencia RX para operación directa. No significan lo mismo y la guía los describe como mutuamente excluyentes. Úsalos solo tras revisar dónde transmitirá realmente la radio. `Force DMO` fuerza operación directa DMR aun con frecuencias distintas; no es una opción general para «mejorar cobertura». [G: Channel Quick Menu; Channel Details]

## 5. Escenario A: canal FM de escucha o repetidor

1. Crea un canal FM y comienza con `RX Only`.
2. Introduce RX y TX según el responsable del servicio; para simplex usa la misma frecuencia.
3. Ajusta FM ancha/estrecha conforme a la canalización.
4. Introduce el tono **TX** requerido. Deja RX CSS sin tono durante el diagnóstico, salvo necesidad conocida.
5. Ajusta squelch hasta eliminar ruido sin cerrar señales débiles; no lo uses como sustituto de un tono correcto.
6. Añade el canal a una zona; revisa `Zone Skip` y `All Skip`.
7. Comprueba audio en recepción. Solo después, si estás autorizado, habilita TX con potencia prudente y realiza una prueba breve.

CTCSS y DCS controlan apertura del audio o acceso; **no cifran la conversación**. El monitor ayuda a distinguir falta de señal de un cierre por filtro. El escaneo de tonos del VFO puede encontrar CTCSS o DCS y la guía indica que aplica el resultado tanto a RX como a TX: revisa ambos antes de transmitir.

El tono de apertura de **1750 Hz** y las secuencias **DTMF** son funciones distintas de CTCSS/DCS. No envíes DTMF a controladores sin conocer su función y autorización. El sonido que oyes localmente no siempre reproduce exactamente el DTMF emitido: la guía señala diferencias de hardware en MD-UV380 y MD-9600. [G: FM specific functionality]

## 6. Escenario B: repetidor DMR con varios TG

1. Obtén RX, TX, CC y distribución de TG por TS del responsable del repetidor.
2. Introduce tu DMR ID válido. No uses el ID de otra persona ni el número del TG como identidad propia.
3. Crea contactos de tipo **Group Call** con sus números TG; crea una lista TG y asígnala al canal.
4. Configura RX/TX, CC y TS del canal. Elige inicialmente un TG conocido y permitido en ese TS.
5. Comprueba recepción con los filtros previstos; para diagnóstico, relaja filtros de manera controlada y vuelve a su configuración normal.
6. Revisa que no exista una selección manual de TG/TS de una prueba anterior.
7. Si procede transmitir, escucha antes, activa el TG según las reglas de la red y deja pausas entre intervenciones.

Escuchar un TG no implica que esté enlazado permanentemente a ese repetidor. Los TG estáticos, dinámicos, reflectores o reglas de activación dependen de la **red y del administrador**, no únicamente del codeplug.

### Selección temporal, contactos y llamadas privadas

En la disposición de teclas de referencia, `#` permite introducir un TG y `#` dos veces permite introducir un destino privado. La tecla de cambio de TS y los contactos con TS preferido pueden alterar el TS activo. Los controles equivalentes varían por radio; consulta la tabla de modelos.

Una selección manual u **override** puede prevalecer sobre el canal o la lista. La guía documenta borrar el override de TS manteniendo la tecla de TS, y salir de llamada privada mediante selección de TG u otros controles específicos. Comprueba el destino y TS visibles **antes del PTT**.

No confundas «llamada privada» DMR con confidencialidad. No está cifrada por ser privada. La recepción o aceptación automática de llamadas privadas también depende de las opciones del firmware. [G: DMR specific functionality; Making and receiving DMR Private Calls]

### Filtros DMR: no son todos el mismo

| Control | Qué afecta | Precaución |
| --- | --- | --- |
| DMR Filter Off | No limita por el criterio TG/contacto de los otros modos | No elimina todos los requisitos de la señal |
| TG | Filtra por el TG seleccionado | Puede ocultar otros grupos que sí llegan |
| Ct | Filtra por contactos de llamada privada del codeplug, según la guía | No confundir con lista TG |
| TGL | Filtra por grupos de la lista TG | Revisar contenido y asignación de la lista |
| TS Filter | Escucha el slot previsto o permite buscar actividad entre slots | Desactivarlo no crea dos receptores simultáneos |
| CC Scan, antes CC Filter | Busca un CC válido para recibir | No es «ignorar todos los CC»; puede retrasar o perder el comienzo |

La guía explica que el circuito DMR necesita un CC y que el firmware busca su coincidencia cuando se habilita `CC Scan`. No se recomienda para operación normal con CC conocido. También explica que la escucha de ambos TS usa un algoritmo de selección, no recepción simultánea independiente. La inversión visual de CC/TS y del modo puede indicar ajustes de filtro, no un fallo de pantalla. [G: Filters (Channel)]

**Diagnóstico ordenado:** frecuencia y modo → señal RF → CC → TS → TG/tipo de llamada → filtros → estado del enlace de red. Cambiar todo a la vez impide saber qué resolvió el problema.

## 7. Zonas, RX groups y exploración

Una **zona** es una colección ordenada de canales; no una banda ni una red. El mismo canal puede servir en varias zonas. Una **lista TG** reúne destinos digitales; no indica qué canales explorar.

La guía no implementa las **Scan Lists comerciales** como función equivalente. Para reproducir un conjunto de exploración, crea una zona con esos canales y explora la zona. Importar el campo «Scan List» de un archivo comercial no basta.

### Escenario C: explorar una zona local

1. Crea una zona con los canales que realmente deseas escuchar.
2. Comprueba que sean utilizables individualmente y que no estén excluidos por `Zone Skip`.
3. Inicia la exploración mediante el control de tu modelo. En GD-77 y varios modelos con la asignación de referencia se usa pulsación larga de subir.
4. Ajusta `Scan dwell` si pierdes señales débiles o intermitentes: más tiempo por canal mejora la oportunidad de detectarlas, pero ralentiza el barrido.
5. Elige el comportamiento: `Hold` permanece mientras hay señal; `Pause` reanuda tras el retardo; `Stop` termina al encontrar una señal válida.
6. Usa la exclusión temporal de un canal molesto si está disponible. No la confundas con la edición persistente de `Zone Skip` o `All Skip`.
7. Para `All Channels`, revisa `All Skip` por separado.

La exploración VFO trabaja sobre límites inferior/superior y un paso, no sobre una zona. `Dual Watch` alterna atención entre VFO; **no demuestra doble recepción simultánea**. El barrido de espectro es otra presentación, no un analizador calibrado. [G: Scanning; VFO specific functionality; Channel Details]

En GD-77S organiza zonas de **hasta 16 canales accesibles** por su selector; el hecho de que el formato admita zonas mayores no amplía el mando físico.

`Roaming`, en la guía consultada, ordena la zona por distancia a repetidores cuando hay ubicación del operador y coordenadas de canales. No equivale a verificar que cada repetidor esté operativo ni a seleccionar el más fuerte por RF. No ordena `All Channels` y se desactiva mientras se explora. [G: Roaming]

## 8. Pantallas, controles y conservación de cambios

| Pantalla o modo | Uso | Comprobación |
| --- | --- | --- |
| VFO A/B | Sintonía y pruebas de parámetros | Revisar RX y TX, no solo la frecuencia destacada |
| Canal | Operación desde codeplug y zona | Comprobar zona, canal, TG y TS efectivos |
| Channel Details | Editar datos del canal o VFO | Distinguir aplicar temporalmente de guardar |
| Last Heard | Revisar actividad digital recibida | No representa todos los usuarios de la red |
| Radio Info | Batería, fecha/hora y ubicación según equipo | La hora puede perderse si no hay RTC |
| RSSI | Orientación sobre nivel recibido | No sustituye a un medidor RF calibrado |
| GPS | Estado del receptor instalado | Ausente o `None` no se arregla cargando un codeplug |
| Satélite | Predicciones y operación orbital | Necesita hora, posición y elementos orbitales válidos |

En `Channel Details`, la guía distingue **Green** para confirmar, **SK2 + Green** para guardar de forma persistente y **Red** para cancelar. El bloqueo de configuración puede impedir modificaciones permanentes. Estos nombres describen controles lógicos, no teclas físicamente iguales en todos los equipos.

Los ajustes temporales de potencia del canal, TG y TS pueden no modificar el codeplug. Tras una prueba, cambia de canal o consulta el detalle para comprobar qué quedó almacenado. Mantén una versión conocida del archivo en el ordenador.

Las opciones de pantalla incluyen, según plataforma/build, iluminación, contraste, inversión, colores y modo día/noche. Un GD-77 con inversión de pantalla no se convierte físicamente en la variante de LCD «Black». No extrapoles temas de color a modelos monocromos ni capturas de pantalla al GD-77S sin pantalla. [G: Main screens; Display Options; Channel Details]

## 9. Accesibilidad y sonido

OpenGD77 documenta avisos sonoros, repetición de locuciones y niveles de voz. Los recursos de voz se cargan **por separado con el CPS**; cambiar el idioma del menú no cambia automáticamente la voz instalada.

1. Comprueba que el archivo de voz sea adecuado para el firmware y el idioma.
2. Selecciona `Prompt`: silencio, pitidos, pitidos sin teclas o voz, según disponibilidad.
3. Prueba los niveles `Voice`, `Voice L2` y `Voice L3`: cambian cuándo se anuncia la información y su detalle; no son tres idiomas.
4. Usa el control equivalente a SK1 para repetir el último anuncio; si ya está hablando puede detenerlo.
5. Ajusta volumen de pitidos y avisos de inicio/fin DMR y TOT sin eliminar advertencias necesarias.
6. Haz una prueba completa sin depender de la pantalla antes de usar la configuración en movilidad.

En **GD-77S**, cargar las voces es esencial para una operación práctica, ya que no hay pantalla ni teclado. El botón de modo permite recorrer controles de TG, exploración, TS, CC, filtros, zona y potencia; SK1/SK2 cambian de función según el modo anunciado. No apliques secuencias del GD-77 con pantalla. [G: Sound Options — Prompt; GD-77S operation]

La ganancia de micrófono FM y DMR se ajusta por separado. Más ganancia no equivale a más alcance: puede empeorar la inteligibilidad. VOX puede originar transmisiones no intencionadas; desactívalo durante configuración, pruebas y conexión USB.

## 10. Potencia, batería y calibración

La potencia **Master** se usa en VFO y canales que heredan ese ajuste; un canal puede tener potencia propia. La guía señala que la potencia propia se muestra destacada y que un cambio hecho en operación puede ser temporal. Para hacerlo persistente usa el procedimiento de guardado de detalles del modelo.

No existe una única escala válida para todos los portátiles y móviles. La guía distingue equipos de 5 W, variantes de 10 W y móviles; además, la opción de escala de un UV380 **10W no PLUS** no convierte un portátil normal en otro hardware. La variante **10W PLUS requiere su imagen específica**. [G: Controlling Tx power; Radio Options — Mode; F2]

Buenas prácticas:

- Usa la potencia mínima necesaria y una antena apropiada.
- Comprueba alimentación, batería, conectores y ROE antes de investigar una supuesta falta de potencia.
- No interpretes una cifra de pantalla como garantía de potencia medida.
- No intentes obtener 10 W cambiando una etiqueta, un menú o la calibración de una unidad de 5 W.
- No copies calibración de otra radio, aunque comparta modelo.
- No edites ajustes de referencia, desviación o potencia para corregir un error de CC/TG.
- La calibración requiere instrumental, carga adecuada y el procedimiento específico. Si no dispones de ello, conserva los valores originales.

Una radio puede calentarse mucho con transmisiones prolongadas, especialmente como hotspot. Una potencia tolerable en voz intermitente no garantiza servicio continuo seguro.

## 11. Hotspot DMR por USB

La guía documenta la radio como módem de **voz DMR** para MMDVMHost/Pi-Star y contempla BlueDV con reservas de compatibilidad. No es un acceso a la red desde el navegador, ni un punto de acceso Wi-Fi, ni convierte todas las radios en repetidores dúplex.

### Escenario D: radio compatible como hotspot

1. Confirma que el modelo y build lo admiten. **RD-5R/DM-5R no admite hotspot** por la limitación USB durante TX.
2. Selecciona la opción de hotspot apropiada en la radio; no mantengas simultáneamente una sesión CPS/web.
3. Conecta el cable de programación adecuado al ordenador o equipo MMDVMHost.
4. En Pi-Star, la guía identifica el tipo de módem `OpenGD77 DMR hotspot (USB)`. Si no existe, revisa la versión y documentación del host.
5. Configura frecuencia, CC, ID y red de acuerdo con la normativa y el host. Verifica el modo en la pantalla de la radio.
6. Empieza con potencia baja, ventilación y pruebas cortas. No extrapoles tablas de porcentaje/potencia de un portátil a un móvil.
7. Si el USB se reinicia al transmitir, trata primero la inyección de RF: la guía recomienda antena externa separada, protección de RF en USB y medidas apropiadas en el host. Evita usar la antena sobre el propio portátil en este montaje.

Los valores `RFLevel`/porcentaje del host no son vatios universales. La guía describe incluso tratamiento especial del valor 100 en algunas implementaciones; no lo uses como regla para cualquier build. La gestión de grupos, autenticación y enlaces pertenece también al software y red del host. [G: Hotspot mode]

## 12. APRS: qué puede y qué no puede hacer

La guía documenta **transmisión FM APRS AFSK a 1200 o 300 baudios** y **no recepción/decodificación APRS AX.25**. No prometas mapa de estaciones recibidas, mensajería APRS bidireccional ni un TNC general.

Son mecanismos distintos:

| Mecanismo | Dónde viajan los datos | Dependencias |
| --- | --- | --- |
| FM APRS | Paquete AFSK en una frecuencia FM | Perfil APRS, indicativo, posición y frecuencia apropiada |
| Posición por Talker Alias DMR | Información en el flujo DMR | Soporte del repetidor/red y opciones TA |
| Publicación en una web APRS | Tratamiento posterior por infraestructura | Cobertura de receptores, pasarela y red; no está garantizada por transmitir |

### Escenario E: primera baliza FM APRS

1. Configura el indicativo y un perfil APRS en OpenGD77 CPS. La guía describe hasta **8 perfiles**, no un número universal para toda versión futura.
2. Ajusta SSID, destino/ruta, símbolo, comentario, velocidad y frecuencia conforme a la red local. No copies una ruta terrestre a un satélite.
3. Proporciona posición manual válida o GPS real con fix. No marques GPS como fuente si la radio carece de receptor operativo.
4. Asigna el perfil al canal o VFO correspondiente.
5. Selecciona primero `Manual`; verifica ubicación y frecuencia antes de emitir una baliza de prueba.
6. Comprueba recepción con infraestructura o receptor adecuado, no solo con el pitido local. Algunos modelos no reproducen realimentación de audio.
7. Solo entonces activa `PTT`, `Auto` o `Smart`, si lo necesitas. Revisa intervalo y decaimiento para no ocupar innecesariamente el canal.

En `PTT`, la guía sitúa la baliza al soltar PTT respetando los temporizadores; `Auto` usa intervalos y `Smart` ajusta por movimiento y giro. Una ubicación inválida puede impedir la baliza o mostrar `Location?`. La desactivación temporal y las combinaciones de teclas dependen del modelo.

Un perfil puede fijar una frecuencia TX distinta; si no la fija, se usa la del canal/VFO analógico. En un canal DMR la guía exige una frecuencia APRS explícita para esta función FM. La frecuencia propia del perfil no se aplica igual en modo satélite ni en el modo APRS `PTT`: comprueba esas excepciones antes de operar. [G: FM APRS location transmission; APRS Options]

La opción TA `APRS` o `Both` no activa un receptor AX.25. La guía advierte de problemas de Talker Alias transmitido en repetidores/redes Motorola; mantén TA TX desactivado salvo soporte conocido del sistema. La recepción TA no depende de activar su transmisión. No publiques coordenadas personales automáticamente sin valorar su privacidad.

## 13. GPS, NMEA y registro

GPS es una **capacidad de hardware**, no algo que aparezca al instalar un archivo. La guía documenta versiones con receptor opcional y modificaciones en determinadas familias; no todas las unidades del mismo nombre llevan GPS.

| Estado/opción | Significado en la guía | Consecuencia |
| --- | --- | --- |
| `None` | No se detecta módulo | Revisar variante, instalación y compatibilidad; no asumir avería de menú |
| `Off` | GPS desactivado | En MD-9600/RT-90 hay restricciones de control de alimentación |
| `On` | Receptor habilitado | Necesita adquirir posición; probar al aire libre |
| `NMEA` | Datos GPS enviados por el USB serie | Impide comunicación CPS normal hasta cambiar a `Off` o `On` |
| `Log` | Registro NMEA en Flash | Consume espacio y puede desplazar otros recursos |

La falta de fix en interior no prueba que el módulo esté averiado. Espera al aire libre y consulta la pantalla GPS. La dirección derivada del desplazamiento no equivale a una brújula magnética que funcione estando quieto. Con GPS operativo, la guía documenta actualización del reloj y uso de la posición por otras funciones.

**Advertencia de memoria:** en dispositivos de Flash de 1 MB, como el ejemplo GD-77 de la guía, habilitar el registro GPS utiliza espacio de la base de IDs DMR y puede **eliminar sus datos**; la presencia de voces también afecta al espacio disponible. Desactiva el registro y vuelve a cargar la base si necesitas recuperarla. No atribuyas las capacidades de registro de una Flash a todos los modelos. [G: General Options — GPS; GPS Screen]

Los paquetes MK22 con sufijo `_NMEA` son variantes publicadas; su existencia no prueba que una radio sin modificar incorpore GPS. No confundir una **imagen variante NMEA** con el **modo de salida NMEA por USB** del menú. Verifica las notas de la build y el hardware antes de elegirla. [F1]

## 14. Satélites: preparación y operación

La pantalla de satélites documentada predice pases, presenta azimut/elevación y aplica corrección Doppler a RX/TX. No convierte el equipo en receptor de todos los modos orbitales ni acredita full dúplex.

### Escenario F: preparar un pase

1. Comprueba el estado operativo y las reglas del satélite en fuentes actuales del operador/AMSAT.
2. Actualiza con el CPS los elementos orbitales **Keps/TLE** y los parámetros de los satélites que realmente usarás.
3. Introduce ubicación y fecha/hora correctas; comprueba UTC frente a hora local. Un desfase horario grande desplaza las predicciones.
4. Confirma frecuencias, modo, tonos y si el satélite permite voz, baliza o APRS en ese momento.
5. Revisa la lista de pases y después la vista polar o los datos en vivo.
6. Prueba recepción antes de transmitir. Ajusta antena, orientación y potencia para el pase, sin aplicar reglas genéricas de repetidor terrestre.
7. Si hay APRS por satélite, utiliza sus parámetros específicos. La guía contempla perfiles con el nombre del satélite para personalizar los valores previstos.

La guía indica que subir Keps con el CPS también ajusta fecha/hora. Las radios sin RTC pueden perderla al apagar; no extrapoles retención a todo el catálogo. Su enumeración de RTC en MD-9600/RT-90, UV380/RT-3S y DM-1701 refleja el alcance del texto, no una certificación de todos los modelos posteriores.

Datos orbitales antiguos, hemisferio equivocado o confundir grados decimales con otro formato producen predicciones erróneas aunque el firmware funcione correctamente. Las alarmas, el cambio automático de satélite y los controles de tono especial dependen de la build/plataforma. La edición local de datos de satélite en esta web **no los carga en la radio** mientras la escritura siga bloqueada. [G: Satellite Screen; L]

## 15. USB, modos de conexión y firmware

**Uso normal/CPS y bootloader son modos diferentes.** En modo de actualización puede no funcionar la identificación CPS, y una pantalla vacía no demuestra que el equipo esté estropeado. El cable debe ser el apropiado para ese hardware; no todos los conectores de dos pines implican el mismo cable o protocolo.

La guía distingue instalación MK22 y STM32: para actualización STM32 documenta controlador STM DFUSe; para la comunicación CPS normal hay otro contexto de puerto/controlador. No cambies controladores al azar ni supongas que un controlador DFU resuelve WebUSB o WebSerial en modo normal.

### Si necesitas instalar o actualizar firmware fuera de la web

1. Comprueba el modelo y revisión en [la matriz](AYUDA-OPENGD77-MODELOS.md), además de las instrucciones del paquete concreto.
2. Conserva las copias disponibles y el firmware original correspondiente a la unidad.
3. Utiliza el cargador de firmware de **OpenGD77 CPS** indicado por el proyecto, no el cargador comercial para una imagen OpenGD77.
4. Comprueba el firmware «donante» requerido por esa familia. La guía indica que se selecciona en el cargador para aportar componentes del códec AMBE; no se instala como sustituto siguiendo instrucciones de otro equipo.
5. Confirma modelo, variante, idioma y revisión antes de iniciar. Una selección de donante correcta puede habilitar DMR; sin el procedimiento requerido, la guía describe funcionamiento solo FM.
6. Sigue la secuencia de bootloader **específica del modelo y revisión**, con alimentación estable. No existe aquí una combinación universal.
7. Tras instalar, comprueba identificación, audio, RX/TX y la configuración; crea las copias que permita el CPS.

No se ofrecen instrucciones de recuperación basadas en puentear placas, borrar regiones o escribir calibración de otra unidad. Ante una identificación ambigua, detén la actualización hasta documentar el hardware.

## 16. Diagnóstico por síntomas

| Síntoma | Comprobaciones de menor a mayor impacto | Qué evitar |
| --- | --- | --- |
| Conectar está deshabilitado | HTTPS/localhost, API del navegador, familia y confirmación | Cambiar firmware solo para habilitar un botón |
| Permiso USB/serie pero no identifica | Modo normal, cable adecuado, CPS/host cerrado, familia correcta | Forzar otra familia o asumir mapa de memoria |
| Estructura de identificación desconocida | Registrar modelo/build y mensaje; usar herramientas documentadas para esa versión | Saltarse la validación del conector |
| Copia parcial y escritura bloqueada | Exportar calibración/codeplug y manifiesto; conservar el estado | Tratar un ZIP descargado como copia MCU |
| El archivo no abre | Exactamente 131072 bytes y formato estándar; no JSON ni firmware | Rellenar o truncar un archivo para que encaje |
| Faltan canales 1025+ | Límite explícito del editor web | Guardar el área estándar como si fuera respaldo extendido |
| FM tiene señal pero no audio | RX CSS, squelch, mute, modo/ancho de banda y volumen | Recalibrar RF primero |
| DMR tiene señal pero no audio | CC, TS, TG/contacto, filtros y estado del enlace | Usar CC Scan permanentemente sin necesidad |
| Escucha un TG pero transmite en otro | Override, contacto directo, lista TG y TS activo | Confiar solo en el nombre del canal |
| No abre el repetidor | TX real, tono FM o CC/TS DMR, cobertura y reglas de acceso | Subir potencia sin revisar configuración |
| Error RX Only / TX no disponible | Solo recepción, TX Inhibit, límites de banda y TOT | Eliminar restricciones sin autorización |
| No aparecen nombres DMR | Base de IDs cargada, longitud/espacio, Talker Alias recibido | Confundir base de IDs con lista de TG |
| No explora los canales esperados | Zona activa, Zone Skip, All Skip y modo de exploración | Buscar una Scan List comercial no implementada |
| USB se pierde durante TX | Inyección RF, antena separada y montaje; RD-5R no hotspot | Desactivar protecciones o insistir a máxima potencia |
| CPS deja de comunicar al activar GPS | Salida `NMEA`: volver a `Off` o `On` | Reinstalar firmware antes de revisar el modo USB |
| GPS muestra `None` / no adquiere | Presencia real del módulo, soporte build y prueba exterior | Suponer GPS de fábrica por el nombre comercial |
| APRS muestra `Location?` o no sale | Posición, perfil, indicativo, frecuencia, modo de baliza, TX Inhibit | Activar balizas automáticas para «probar más» |
| Pases de satélite incoherentes | Hora, fecha, UTC, posición, TLE y estado real del satélite | Cambiar frecuencias por intuición |
| GD-77S no habla | Voces cargadas, volumen y modo de control | Aplicar instrucciones de pantalla del GD-77 |
| MD-9600/RT-90 sin RX/TX tras actualización | Imagen HW y revisión real, alimentación y copias | Flashear revisiones al azar siguiendo una regla universal |
| Una opción no aparece | Modelo, variante, idioma y fecha/build | Dar por hecho que todas las capturas son de la versión instalada |

## 17. Glosario

| Término | Significado |
| --- | --- |
| AMBE | Códec de voz digital cuya integración requiere el procedimiento de donante documentado |
| APRS | Sistema de intercambio de información de estación/posición; aquí se distingue FM AFSK de datos DMR |
| Build | Compilación concreta del firmware; registrar fecha y revisión |
| CC | Color Code DMR, valor 0–15 |
| Codeplug | Archivo/estructura de configuración de la radio |
| Contacto | Destino digital con número y tipo de llamada |
| CPS | Programa de ordenador para configurar y mantener la radio |
| CTCSS / DCS / CSS | Sistemas de señalización de tono/código FM; no cifrado |
| DMO | Operación digital directa, sin repetidor |
| DMR ID | Identificador digital de una estación; no es el TG |
| DTMF | Señalización por pares de tonos para control o marcación |
| Keps / TLE | Datos orbitales utilizados para predecir satélites |
| MCU | Microcontrolador que ejecuta el firmware |
| MMDVMHost | Software anfitrión para módems digitales, usado en el escenario hotspot |
| NMEA | Formato de mensajes de navegación; también nombre de una salida o variante según contexto |
| Override | Selección temporal que prevalece sobre un valor guardado |
| PTT / VOX | Transmisión mediante pulsador / activación por voz |
| RTC | Reloj de tiempo real; su presencia y conservación dependen del equipo |
| RX / TX | Recepción / transmisión |
| RX Group / TG List | Agrupación de contactos; comprobar la semántica en firmware/CPS usado |
| SK1 / SK2 | Nombres lógicos de teclas laterales; la posición cambia por modelo |
| TA | Talker Alias, información adicional transmitida en DMR |
| TG | Talkgroup, destino de una llamada de grupo DMR |
| TOT | Temporizador que limita una transmisión |
| TS | Timeslot DMR, 1 o 2 |
| VFO | Modo de sintonía por frecuencia |
| Zona | Colección ordenada de canales |

## 18. Fuentes, versiones y licencias

Consulta realizada el **2026-10-25**, con una descarga de la guía para lecturas locales y consultas acotadas de índices oficiales; no se ha recorrido masivamente el archivo del foro.

- **[G] Guía oficial inglesa:** [Markdown mantenido](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md). Para una referencia reproducible, la última modificación del archivo indicada por la API consultada es [33de63dcb002fcd837419fda25a2e535b940dbcd, 2026-03-08](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md). Los nombres de secciones de las citas identifican la evidencia funcional.
- **[R] Repositorio oficial de la guía:** [LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide). Su README explica la separación del antiguo repositorio por cuestiones de licencia, declara **GPL 2 para estos documentos** y señala que solo se mantiene la versión inglesa; la china está desactualizada.
- **[W] Sitio del proyecto:** [opengd77.com](https://www.opengd77.com/). En la consulta, su portada explica el cierre del foro interactivo y el problema de tráfico de bots.
- **[A] Archivo estático:** [índice del foro archivado](https://www.opengd77.com/archive/index.html). Se presenta como instantánea, con fecha visible de julio de 2025; no es prueba de todas las funciones de una build de 2026. Registro, perfiles u otros enlaces pueden no funcionar.
- **[F1] Índice MK22 observado:** [GD77, 2026-05-04, revisión 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/). Incluye paquetes específicos de GD77, GD77S, DM1801, DM1801A y RD5R, con variantes según destino.
- **[F2] Índice de portátiles STM32 observado:** [MDUV380_DM1701, 2026-05-04, revisión ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/). Incluye `OpenMDUV380_10W_PLUS.zip` separado del estándar, además de DM1701 y RT84.
- **[F3] Índice móvil observado:** [MD9600, 2026-05-04, revisión e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/). Contiene imágenes HW V1/V2/V4/V5.
- **[F4] Índice MD2017 observado:** [2026-05-05, revisión 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/). Confirma un paquete publicado, no la equivalencia con otro modelo.
- **[C] Notas de mantenimiento comprobadas:** [changelog MDUV380_DM1701 de 2026-05-04](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/changelog.txt). Describe adaptación del enlace del códec a herramientas recientes, no una promesa de todas las funciones por modelo.
- **[L] Evidencia local de esta aplicación:** [`firmware-core.js`](../firmware-core.js), `TARGETS`; [`gd77-connector.js`](../gd77-connector.js), `MODELS`, `connect`, `backup`, `readCodeplugRaw`; [`radio-ui.js`](../radio-ui.js), estado de permisos, lectura/edición y exportación. Describe implementación, no una campaña de pruebas físicas.

Las rutas `Latest` consultadas redirigían a esos directorios; pueden cambiar y no equivalen a «estable para cualquier equipo». La guía, los paquetes y el archivo del foro tienen cronologías distintas. Ante discrepancias, prioriza las instrucciones verificadas del paquete y hardware exactos sin extrapolar automáticamente novedades.

**Licencias:** la declaración GPL 2 citada corresponde al repositorio de la guía. No se presupone MIT ni se extiende esa declaración al firmware actual, donantes, códec, voces, CPS, imágenes o todas sus dependencias. Para redistribuir cada componente comprueba su licencia concreta; que una descarga sea pública no elimina condiciones de uso o distribución.
