# Configuracion comun, copias y diagnostico

Revision: 25-10-2026. Aplicable conceptualmente a FM/DMR; los nombres de menu,
rangos y botones dependen de la guia del modelo y del build.

## Antes de configurar

### Proveedores y descarga automatica en la version instalada

En Repetidores abre **Configurar API RepeaterBook**, introduce el token individual
y User-Agent aprobados y confirma tu aprobacion. Solo se conserva en memoria del
servidor hasta reiniciarlo; el campo del token se vacia tras enviarlo.
Las variables `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` y `RB_APPROVED=yes`
siguen disponibles para configurar el proceso desde el entorno.

En Contactos DMR, **Descarga automatica DMR** importa un lote RadioID por
pais/region (1-10 paginas, maximo 1024) al codeplug local. Las salas son grupos
de conversacion: la opcion BrandMeister usa un prefijo TG, no un pais RadioID.
Guarda los grupos con tipo de llamada de grupo y nombre TG numerico; asigna
despues el TG al canal en el CPS. No suscribe el hotspot ni abre una sala.
No escribe la radio y no sincroniza silenciosamente al arrancar.

Para Quansheng, en SAT/pases prepara canales FM o Doppler y pulsa **Cargar SAT /
Doppler preparados en configuracion Quansheng** tras elegir plantilla FM.
Requiere haber leido/abierto configuracion F4HWN v6. No carga TLE en el modulo
del firmware: prepara memorias escalonadas de recepcion con cambio manual.

Registra modelo, revision de placa, familia MCU, firmware y fecha/build.
Guarda una foto de SysInf/Radio Info, archivos originales y sus hashes.
Anota el tipo de cable, puerto, navegador y programa usado. Solo una aplicacion
debe tener abierto el puerto: cerrar CHIRP, CPS, Studio y otras pestanas.

No confundas estos objetos:

| Objeto | Contenido | No sustituye a |
| --- | --- | --- |
| Firmware | Programa que ejecuta el procesador | Calibracion individual |
| Codeplug/configuracion | Canales, contactos, zonas y ajustes segun formato | Copia del firmware ni de toda la radio |
| Calibracion | Valores de ajuste propios de la unidad | Configuracion de otro equipo del mismo modelo |
| Flash fisica | Imagen de una memoria concreta | Memorias de otros chips no incluidas en el alcance declarado |
| Manifiesto/SHA256SUMS | Nombres, huellas y metadatos | Firma digital del fabricante |
| TLE | Elementos orbitales y epoca | Frecuencias activas ni garantia de servicio del satelite |

Exporta el respaldo `.rwb.json` fuera del navegador y conserva el original sin
editar. IndexedDB depende de origen, navegador y perfil. Cambiar entre localhost,
127.0.0.1, Pages o modo privado puede hacer que no veas las mismas copias.
No borres datos del navegador para arreglar USB antes de exportarlas.

## Beta y Modo PRO

La aplicacion y las compilaciones Bricohams estan en fase **Beta / validacion**.
Activa **Modo PRO** antes de conectar si quieres ejecutar las acciones que pulses
sin escribir palabras de confirmacion ni aceptar el borrado local de canales.
La seleccion PRO autoriza tambien la lectura inicial sin marcar otra casilla.
Es una opcion de esta pagina/sesion; no se recuerda silenciosamente al recargar.
No elimina la seleccion de modelo, permisos WebUSB/Web Serial del navegador,
respaldo completo, CRC, comprobacion de hashes, relectura, bloqueo durante tareas
ni proteccion de Main. No controla las confirmaciones del CPS/Studio externo.
Durante una operacion no se debe navegar ni desconectar, tampoco en PRO.
Una copia parcial nunca habilita escrituras, sea cual sea este modo.

## Diccionario de canal analogico

| Ajuste | Significado | Como elegir y comprobar |
| --- | --- | --- |
| RX | Frecuencia que escucha la radio | Usar la salida publicada del repetidor o la frecuencia simplex |
| TX | Frecuencia en la que emite | En repetidor usar su entrada; no invertir RX/TX por intuicion |
| Offset y direccion | Diferencia TX respecto a RX | Comprobar la frecuencia TX resultante, no solo el signo |
| Modo | FM, AM u otro soportado | Debe coincidir con la señal; recepcion AM no autoriza TX AM |
| Step | Paso del VFO | No es el ancho de canal; seleccionar raster adecuado |
| W/N / ancho | Desviacion/filtro del canal FM | Coincidir con el sistema; narrow no crea un modo digital |
| SQL | Umbral de apertura de audio | Empezar bajo y subir solo hasta cerrar ruido sin perder señales |
| CTCSS TX | Tono subaudible que se transmite | Solo si lo exige el repetidor |
| DCS TX | Codigo digital subaudible | No equivale a Color Code DMR; respetar polaridad si procede |
| CTCSS/DCS RX | Condicion adicional para abrir el audio | Dejar sin filtro al diagnosticar; no cifra comunicaciones |
| Potencia | Nivel RF de salida | Minimo suficiente y permitido; valores dependen de calibracion |
| RX-only / TXLock | Impide transmitir en ese canal | Mantener activado para escucha e importaciones no verificadas |
| Busy lock | Bloqueo de TX al detectar ocupacion | No elimina necesidad de escuchar antes de emitir |
| TOT | Tiempo maximo de TX continuo | Ayuda ante PTT atascado; no es el periodo de escaneo |
| VOX | Activa TX por audio | Desactivar en pruebas USB, auriculares y entornos ruidosos |
| Compander | Procesamiento de dinamica | Usar solo si el otro extremo es compatible |
| Reverse | Intercambia temporalmente entrada/salida | Revisar de nuevo RX/TX al salir; no cambiar el canal guardado sin querer |

### Ejemplo de trabajo con un repetidor

1. Copiar RX, TX, modo, ancho y tono de la publicacion del responsable.
2. Crear o duplicar una plantilla compatible; conservar RX-only mientras revisas.
3. Escuchar sin filtro RX para comprobar actividad y frecuencia.
4. Verificar que el tono TX es el requerido y no una suposicion del proveedor.
5. Revisar legalidad, potencia y pertenencia a listas/zonas.
6. Guardar en memoria. Volver a seleccionar el canal para comprobar persistencia.
7. En esta web exportar el resultado; no asumir que editar un archivo lo haya
   escrito en la radio.

No se proporcionan frecuencias de emision universales: dependen de ubicacion,
licencia, banda, servicio y repetidor concreto.

## Diccionario DMR

| Ajuste | Significado | Error frecuente |
| --- | --- | --- |
| Radio ID | Identificador propio del abonado | Confundirlo con un TG o usar el de otra persona |
| Contacto TX | Destino de llamada y tipo grupo/privada | Usar un contacto privado cuando se requiere grupo |
| TG | Talkgroup, identificador de grupo | Pensar que programa por si solo la red del repetidor |
| TS 1/2 | Time Slot del canal | Confundirlo con numero de canal o Color Code |
| CC 0-15 | Color Code del acceso DMR | Tratarlo como contraseña o como tono CTCSS |
| RX Group | Conjunto de grupos de recepcion | Confundirlo con zona de canales |
| Zona | Lista organizada de canales | Esperar que cambie automaticamente sus TS/CC |
| Filtro DMR | Condiciones para aceptar audio | Un filtro abierto no autoriza transmitir en cualquier TG |
| Hotspot | Interfaz personal RF/red | No es un repetidor convencional de dos slots por defecto |
| Base de IDs | Relacion ID, indicativo y nombre | No crea contactos TX ni habilita acceso a una red |

Para configurar DMR en OpenGD77 sigue la [guia propia](AYUDA-OPENGD77.md).
Quansheng F4HWN/Karina/ARDF aqui no se documentan como radios DMR.

## Escaneo y doble escucha

Escanear consiste en visitar canales secuencialmente; no significa escuchar
simultaneamente todo el rango. Mayor velocidad puede perder portadoras cortas,
tonos o cabeceras digitales. Reanudar por tiempo, por portadora o detenerse son
comportamientos diferentes.

Los canales prioritarios y la doble escucha añaden visitas al ciclo; pueden
alterar el tiempo de escucha util. Comprueba cual es el canal de TX: principal,
ultimo recibido o el configurado por el modo de respuesta.
Al diagnosticar recepcion, usa un solo VFO y desactiva escaneo.

## Ajustes de sistema

| Grupo | Que cambia | Precaucion |
| --- | --- | --- |
| Retroiluminacion/contraste/inversion | Legibilidad y consumo | No modifica sensibilidad RF |
| Beeps/voz/avisos | Señales de interfaz | Bajar volumen antes de usar auriculares |
| Ahorro/sleep/APO | Ciclo de recepcion o apagado | Puede retrasar deteccion de señales y cortar sesiones |
| Capacidad de bateria | Estimacion/gestor segun firmware | No cambia fisicamente la capacidad ni calibra tension |
| Bloqueo teclado/PTT | Acciones permitidas | Comprobar si bloquea tambien TX y como desbloquear en ese build |
| Fecha/hora/UTC | Registro, posicion y orbitas | Zona horaria no sustituye a reloj correcto |
| Posicion/GPS | Calculos o servicios que la usan | Preservar privacidad y no asumir GPS si el modelo no lo lleva |
| Atajos/teclas | Acciones cortas/largas | Registrar cambios; no copiar combinaciones de otro modelo |
| Reset | Restaura grupos de valores | Puede borrar canales/ajustes; no usar como primer diagnostico |
| Calibracion | Frecuencia, niveles y otros parametros de banco | No tocar sin instrumentos y procedimiento del proyecto |

## Repetidores, RadioID y satelites en esta web

- Modo web: RadioID mediante `user.csv`; modo local: consulta por servidor.
  Los contactos privados importados no crean zonas ni asignan TG a canales.
- RepeaterBook requiere version local y token aprobado. Una fuente externa puede
  estar incompleta o desactualizada. Comprueba estado operativo con el responsable.
- OpenGD77 usa aqui un codeplug estandar de 128 KiB. Los canales importados
  se basan en una plantilla compatible y nacen RX-only; la zona se revisa con CPS.
- Quansheng permite leer configuracion F4HWN v6, anadir canales FM sobre plantilla
  y borrar memorias del archivo local. El envio Beta exige respaldo Flash completo
  y relectura; v6.0 permanece en solo lectura. Tambien exporta proyectos/CSV.
  No hay tabla orbital SAT nativa Quansheng.
- OpenGD77 distingue tabla SAT nativa y canales de escucha. Consulta limites
  y capacidades reales del editor antes de asumir que un archivo extendido sirve.
- Doppler no es un offset de repetidor. Depende del instante, orbita y posicion;
  los canales escalonados son aproximaciones, no seguimiento continuo.
- Actualiza TLE, hora y posicion; verifica epoca y frecuencia activa. Una pasada
  prevista no garantiza transpondedor activo ni recepcion.
- Para recepcion, desactiva tonos heredados salvo requisito conocido. No actives
  uplink/TX automatico por importar un satelite.

## Conexion USB sin confundir modos

| Familia de operacion | Modo esperado | Que no hacer |
| --- | --- | --- |
| Quansheng: lectura y slots | Firmware F4HWN compatible arrancado normalmente, protocolo serie | No entrar al bootloader solo para consultar canales |
| Quansheng: flasheo externo | Modo y herramienta especificos del hardware | No usar herramienta V1 en V3 ni confundir packed/RAW |
| OpenGD77: lectura CPS web | Firmware OpenGD77 normal y transporte de la familia | No elegir DFU ni boot ROM |
| OpenGD77: instalar firmware | Herramienta oficial y secuencia del modelo | No usar la web como si fuera flasheador MCU |

Chrome/Edge de escritorio, HTTPS o 127.0.0.1 y permiso de dispositivo son
necesarios para las APIs de navegador. Un cable de carga puede alimentar sin
transportar datos. USB-C directo y cable serial lateral son rutas distintas.
No cambies el driver de un dispositivo ajeno ni sustituyas todos los CDC por
WinUSB: verifica identificadores e interfaz antes de actuar.

### Tiempo agotado / «0 de 1 bytes»

1. Guardar el mensaje exacto y la ultima operacion correcta.
2. Cerrar otros programas y pestanas con el puerto.
3. Desconectar de forma segura y arrancar la radio en modo normal.
4. Verificar hardware, firmware y puerto correctos; probar un cable de datos.
5. Reintentar una lectura, sin escribir ni borrar.
6. Si identifica pero falla al leer, registrar firmware exacto y comando/etapa.
   Identificar no demuestra que soporte todos los comandos.
7. Si el error persiste, detenerse y conservar los registros. No aumentar
   arbitrariamente baudios ni quitar la proteccion de respaldo.

## Lista de verificacion posterior

- El archivo exportado tiene el formato/tamano esperados y una copia original.
- Los cambios sobreviven a cerrar y reabrir el archivo.
- RX/TX, tonos, modo, TS/CC y RX-only son correctos donde corresponda.
- La zona/lista/banco es el que se pretendia, no solo el numero de memoria.
- No se ha confundido «preparado» con «instalado».
- Una comprobacion CRC cubre los datos que declara, no toda la seguridad del
  firmware ni calibracion de otros chips.

Fuentes: conectores, editor y planificador de esta web; manuales enlazados en
las guias [F4HWN](AYUDA-QUANSHENG.md) y [OpenGD77](AYUDA-OPENGD77.md).
