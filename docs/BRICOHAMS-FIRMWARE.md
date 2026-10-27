# Bricohams V3: compilacion modular local

## Identidad y alcance

**BETA, en validacion y pruebas.** Las nuevas compilaciones declaran
`stability: "beta"` y el alcance de validacion en `build-info.json`, cubierto por
SHA256SUMS. Se conserva `hardwareTested: false` hasta probar ese binario exacto.
La lectura real de una radio con F4HWN v6.0.0 no valida estos firmware Bricohams.
El Modo PRO de la web reduce confirmaciones, no cambia modulos, licencias ni
protecciones del firmware.

Edicion derivada de la base abierta F4HWN para **UV-K5 V3 / UV-K1 PY32**. No es Karina,
no admite UV-K5 V1 y no anade un bootloader propio. Reutiliza el multiboot del
upstream y conserva su identidad de protocolo `F4HWN v6.1.0`. La edicion de
pantalla pasa a `Bricohams` mediante una variable CMake, sin parchear el binario.

Base fijada:

- Repositorio: <https://github.com/armel/uv-k1-k5v3-firmware-custom>.
- Commit: `f556a96e73c3e423a00cf473aeb37f827cac05a5`.
- Version declarada por los presets: `v6.1.0`.
- Licencia/atribucion: se entregan `LICENSE` y `NOTICE` originales.
- Las fuentes locales de referencia estan en `Documents\Multiboot\Fusion61`.
  Su cambio no confirmado en `App/settings.c` se conserva y **no se incluye**.

Se elige esta base abierta para continuar sobre el hardware V3 y sus slots.
Las limitaciones que impiden derivar Karina se documentan en [KARINA.md](KARINA.md).
No se han portado sus algoritmos, menus ni controladores.

## Compilar a demanda

### Linea independiente: plataforma de aplicaciones Bricohams

`firmware/platform` inicia una linea distinta de la aplicacion F4HWN.
Contiene un validador/cargador de paquetes en memoria, un contrato inicial
de servicios y apps de diagnostico y bloques, escritos en C y probados en escritorio.
Ahora incluye un **residente experimental compilable** con arranque y glue
LCD/teclado PY32. No se ha comprobado que arranque en la radio. **No es un
sustituto validado e instalable de Labs ni un SDK completo.**
No se ha probado su conexion con USB, Flash, LCD, teclado o RF fisicos.

El formato experimental BHA1 no es FAP1 y no debe instalarse con el
cargador de apps existente en la web. Los enteros son little-endian:

| Offset | Bytes | Campo |
| --- | ---: | --- |
| 0 | 4 | Magic ASCII BHA1 |
| 4 | 4 | Tamano de cabecera, 64 |
| 8 | 4 | Version API, 2 |
| 12 | 4 | Arquitectura, 1 = Cortex-M Thumb |
| 16 | 4 | Tamano de codigo, par, 2..4096 |
| 20 | 4 | Datos inicializados, 0..1024 |
| 24 | 4 | BSS, cero al cargar |
| 28 | 4 | Offset de entrada par dentro del codigo, sin bit Thumb |
| 32 | 4 | Capacidades solicitadas: pantalla 1, teclado 2, RX 4 |
| 36 | 4 | CRC-32 del codigo y datos concatenados |
| 40 | 16 | Nombre ASCII imprimible, relleno cero si ocupa menos de 16 |
| 56 | 4 | Reservado, cero |
| 60 | 4 | CRC-32 de los primeros 60 bytes |

Siguen codigo y datos, sin bytes sobrantes. Codigo, datos y BSS juntos
no pueden superar 4096 bytes: es un presupuesto inicial, no una medicion
del firmware residente. El cargador valida todo antes de modificar el
buffer destino, copia codigo/datos y pone BSS a cero. No llama al codigo,
no resuelve relocaciones ni conoce la direccion final de enlace. El
descriptor de salida debe ser independiente de los buffers de entrada
y destino; la memoria y su vida util son responsabilidad del llamador.

Los CRC detectan corrupcion, **no autentican al autor**. Las capacidades
son un filtro de admision, no una sandbox: codigo nativo en un MCU sin
aislamiento puede acceder directamente a perifericos. No se debe ejecutar
codigo no confiable ni anunciar aislamiento de calibracion por este filtro.
No hay API TX ni escritura Flash en este componente.

Faltan validar el arranque, LCD y teclado del residente en PY32, completar los
controladores Flash/USB/RF, medir pila y tiempos reales, instalacion transaccional fisica,
recuperacion e integracion completa de las aplicaciones con hardware. No se ha
implementado Doom. Este formato es provisional y no demuestra funcionamiento
fisico de las apps. La linea anterior de perfiles no se reemplaza.

#### Primera app: diagnostico de pantalla

`bh_api.h` define una ABI C experimental version 2 con version, tamano, contexto y callbacks
de limpiar, escribir texto y presentar pantalla, mas un buffer de estado
privado de la app con su tamano. Recibe eventos START, KEY, TICK
y STOP. Las teclas son identificadores de la plataforma, no codigos UART:
EXIT tiene valor 1. La app devuelve continuar, salir o error explicito;
al fallar un callback no solicita mas servicios de pantalla.

`diagnostics.c` presenta cuatro lineas Bricohams y acepta EXIT/STOP sin
escribir en RF o almacenamiento. Su ejecucion de escritorio usa servicios
simulados; se comprueban version/tamano, callbacks ausentes y errores en
cada etapa. Esto no ejecuta instrucciones ARM sobre la radio.

```powershell
node scripts\build-platform-app.cjs firmware-builds\diagnostics-nuevo
```

Requiere las herramientas ARM ya usadas por el proyecto y un destino
nuevo. Produce ELF, codigo BIN, `diagnostics.bha`, licencia y manifiesto
con SHA-256 de fuentes y paquete. La compilacion API 2 mide 300 bytes de
paquete: 64 de cabecera y 236 de codigo/constantes.
`app.ld` enlaza la app a `0x20002000`; esta direccion es experimental,
**no esta reservada en el firmware F4HWN ni debe usarse en el mismo**.
No admite globales mutables o relocaciones dinamicas. El nucleo futuro
debera reservar la region, pila y buffers sin solapamientos antes de
permitir ejecutar el punto de entrada en modo Thumb.

El test C del cargador admite como argumento `diagnostics.bha` y comprueba
el paquete ARM real, sus CRC y la copia en RAM. Es una prueba de carga,
no de ejecucion ARM, instalacion en Flash o arranque de firmware.

#### Segunda app: Blocks

`blocks.c` implementa un juego propio de piezas de cuatro celdas, con siete
formas, rotacion sin wall kicks, colisiones, caida, bloqueo, eliminacion de
lineas, fin de partida y reinicio. No usa codigo, imagenes, sonidos ni datos
de Tetris o Doom. El tablero textual es de 10 columnas y 6 filas para
probar los callbacks actuales; no es un port grafico final para la LCD.

LEFT/RIGHT desplazan, ROTATE gira, DOWN baja un paso, DROP fija la pieza,
RESTART inicia de nuevo y EXIT sale. Cada TICK baja un paso: el nucleo
debera definir la cadencia, sin depender de la velocidad del bucle.
La secuencia pseudoaleatoria es determinista y se reinicia en START/RESTART.
Las lineas se cuentan en el estado pero aun no se presentan como puntuacion.

El estado debe proporcionarlo el nucleo en memoria alineada, a cero antes
del primer evento y exclusiva para esta app. El manifiesto reserva un
presupuesto externo de 256 bytes; no es BSS del paquete. El contrato API 2
incluye este buffer y sustituye la API 1 inicial. El cargador rechaza los
paquetes API 1: no se mezclan silenciosamente contratos binarios distintos.

```powershell
node scripts\build-platform-app.cjs firmware-builds\blocks-nuevo blocks
```

La app compila para Cortex-M0+ sin biblioteca C ni helpers de division:
940 bytes de paquete (64 de cabecera, 876 de codigo/constantes).
Las pruebas de escritorio verifican movimiento, rotacion, borrado de
linea, fin de partida, reinicio, errores de servicio y 10000 eventos
con comprobacion de comportamiento indefinido. El cargador C valida y
copia tambien el paquete ARM real. **No se ha ejecutado ese codigo ARM en
la radio. El residente experimental incluye un launcher, pero no un instalador
de paquetes externos.**

#### Launcher portable

`bh_launcher.c` gestiona una app nativa a la vez con un buffer alineado
exclusivo de 256 bytes. Inicializar una instancia nueva y mantenerla en la
misma direccion durante toda su vida: el contrato contiene un puntero a su
propia memoria. No copiar instancias ni reinicializarlas durante una app.

START se envia exclusivamente desde `bh_launcher_start`; el dispatcher
acepta KEY, TICK y STOP. Al cambiar de app se entrega STOP a la anterior;
salida o error libera la app y limpia todo su estado. Un error STOP impide
iniciar la siguiente app. Las llamadas reentrantes a start/stop/dispatch
durante un callback se rechazan. Los ticks deben llegar de forma serial
desde el bucle principal; no es una API segura para interrupciones.

El launcher invoca funciones C ya enlazadas para pruebas de escritorio.
**No convierte la direccion de un paquete ARM en funcion ni ejecuta BHA1
en el PC.** Aun faltan el puente de ejecucion en MCU, instalacion en Flash,
controladores, menu LCD y recuperacion. Es un ciclo de vida portable
probado, no un launcher residente arrancable o una sandbox.

#### Instalacion persistente con dos bancos

`bh_store.c` implementa almacenamiento portable de **un paquete y su
version anterior** en dos bancos abstractos de 8192 bytes. No constituye
todavia un catalogo de varias apps. El controlador debe proporcionar leer,
escribir y borrar exclusivamente esos bancos; no se ha asignado ninguna
direccion de la Flash de la radio ni se reutiliza el mapa F4HWN.

Antes de borrar se valida el paquete BHA1 API 2 completo y se consulta la
version anterior. Se borra solo el banco inactivo y se verifica por lectura
que todos sus bytes sean `0xff`, incluido el marcador de confirmacion:
un ACK de borrado sin borrado real se rechaza antes de programar.
Se escribe en fragmentos
que no cruzan paginas de 128 bytes y se relee cada fragmento. La cabecera
BHS1 incluye version, generacion, longitud y CRC del paquete; se relee antes
de escribir `DONE` como confirmacion final. Se vuelve a validar cabecera y
paquete despues de confirmar. No se borra el banco anterior al terminar.

La lectura selecciona la generacion valida mas reciente y puede recuperar
la anterior si la nueva esta incompleta o corrupta. Si ninguno es valido
pero hay un banco confirmado corrupto, se informa error y no se instala
encima automaticamente. Un error del controlador aborta sin simular exito.
Generaciones iguales son ambiguas y se rechazan; al agotar `uint32_t` se
bloquea una nueva instalacion en lugar de permitir un wrap.

El llamador debe proporcionar un scratch independiente del paquete de al
menos 4160 bytes y serializar todas las operaciones. Este maximo incluye
64 bytes de cabecera y 4096 de codigo/datos combinados: no se suman los
maximos individuales de codigo y datos, pues el contrato BHA1 limita la
RAM total a 4096. Se reducen 1024 bytes respecto al scratch inicial sin
reducir el conjunto de paquetes validos. Se prueban tanto codigo de 4096
bytes como codigo de 3072 mas datos de 1024, y rechazo sin E/S cuando el
scratch es un byte insuficiente. No hay heap ni buffer
de banco completo interno. Tras un error final de escritura/relectura,
la instalacion puede haber quedado confirmada: se debe consultar de nuevo
antes de reintentar, no asumir rollback.

`bh_store_load` conecta la seleccion del banco con la carga validada en RAM:
copia codigo/datos y limpia BSS, sin saltar al punto de entrada. Scratch y RAM
deben ser independientes, al igual que el descriptor de salida. Un destino
insuficiente devuelve `BH_STORE_NO_SPACE`; los errores no modifican la RAM ni
el descriptor. El llamador debe reservar la direccion real de enlace antes de
ejecutar; este helper no valida direcciones ni convierte bytes en una funcion.

Las pruebas con NOR simulada cubren 322 interrupciones/fallos de lectura,
escritura y borrado durante primera instalacion y actualizacion, incluidas
escrituras parciales, ACK falso de escritura/borrado, corrupcion, paquete
maximo, generaciones iguales, alternancia y agotamiento de generacion.
Se verifica que el banco anterior no cambia en cada interrupcion de una
actualizacion. Tambien se prueba carga de codigo/datos/BSS y preservacion de
RAM ante errores. Esto no prueba tolerancia a cortes
electricos ni atomicidad del chip real. Faltan controlador SPI/Flash,
reserva de sectores, instalador USB y conexion con el launcher residente.

Pruebas mantenidas de la plataforma (compilador C11 de escritorio requerido):

```powershell
cmake -S firmware\platform -B firmware-builds\platform-tests -DBUILD_TESTING=ON
cmake --build firmware-builds\platform-tests
ctest --test-dir firmware-builds\platform-tests --no-tests=error --output-on-failure
```

Los ocho tests C y el test de integracion JavaScript/C pasan mediante
CMake/CTest en escritorio. El test de integracion se habilita si se encuentra Node.js.
El workflow `firmware-modules.yml` incorpora tambien este conjunto separado
en Linux con comprobacion de comportamiento indefinido; el cambio de
workflow local no implica que ya se haya ejecutado en GitHub.

#### Receptor experimental BHT1 y cliente de transferencia

`bh_transfer.c` implementa la maquina de estados del receptor, sin driver de
serie/USB. `scripts/platform-transfer.cjs` codifica las peticiones, valida
respuestas y proporciona `uploadPackage(exchange, bytes, session)`, donde
`exchange` debe entregar una trama completa y devolver exactamente su respuesta.
No abre puertos ni ofrece instalacion en la web actual.

Cada peticion tiene una cabecera de 24 bytes y hasta 128 bytes de payload.
Todos los enteros son u32 little-endian:

| Offset | Campo |
| --- | --- |
| 0 | Magic BHT1 |
| 4 | Operacion: BEGIN 1, DATA 2, COMMIT 3, ABORT 4, STATUS 5 |
| 8 | ID de sesion no nulo, elegido por el cliente |
| 12 | Offset dentro del paquete para DATA; cero en otras operaciones |
| 16 | Longitud del payload |
| 20 | CRC-32 de cabecera y payload, poniendo este campo a cero |

BEGIN contiene dos u32: longitud total (66..4160) y CRC-32 de todo el BHA1.
DATA envia bloques contiguos de 1..128 bytes. Un bloque duplicado se acepta
solo si coincide exactamente con bytes ya recibidos y no avanza dos veces el
offset; se rechazan huecos y solapamientos parciales. BEGIN duplicado de la
misma sesion/longitud/CRC conserva el progreso. Una sesion distinta no puede
interrumpir una recepcion activa. ABORT cancela sin llamar al instalador;
STATUS consulta sin ampliar el plazo. La recepcion caduca a los 30000 ms
desde BEGIN o el ultimo DATA valido, con diferencias sin signo ante wrap.
Una sesion caducada o cancelada requiere un ID nuevo.

COMMIT exige todos los bytes, CRC total correcto y validacion BHA1/API/
capacidades antes de invocar el callback instalador. Un COMMIT duplicado no
vuelve a invocarlo, tanto si tuvo exito como si devolvio error: un error de
escritura puede significar que la Flash ya quedo confirmada. El cliente no
reintenta automaticamente un COMMIT cuya respuesta se pierde; debe consultar
STATUS y el almacenamiento antes de decidir una nueva operacion.

La respuesta BHR1 tiene 32 bytes: magic, operacion, sesion, resultado, bytes
recibidos, estado, resultado del instalador (i32), CRC de los primeros 28.
Resultados: OK 0, BAD_FRAME 1, BAD_SESSION 2, BUSY 3, BAD_OFFSET 4,
INCOMPLETE 5, BAD_PACKAGE 6, INSTALL_ERROR 7, EXPIRED 8, BAD_STATE 9.
Estados: IDLE 0, RECEIVING 1, DONE 2, FAILED 3, CANCELLED 4, TIMED_OUT 5.
El cliente rechaza CRC, sesion, operacion, estado o ACK de offset incorrectos.

El llamador debe serializar llamadas, mantener instancia y staging vivos,
y proporcionar buffers independientes para instancia, staging, trama y
respuesta. Se requiere staging de 4160 bytes. El callback recibe ese staging
solo durante COMMIT y no debe modificarlo ni retenerlo. Una llamada reentrante
devuelve BUSY sin generar respuesta. El transporte fisico futuro debera limitar esperas, comunicar desconexiones
y realizar control de flujo. La API de transferencia recibe tramas completas;
el ensamblado desde un flujo arbitrariamente fragmentado corresponde a
`bh_stream.c`, descrito a continuacion.
Los CRC y el ID de sesion **no autentican al emisor**.

`bh_stream.c` consume un byte por llamada, reconoce magic BHT1 y longitud
limitada a 128 bytes, y comprueba el CRC antes de entregar la trama al
receptor. No requiere prefijo de longitud ni separadores adicionales.
Tolera tramas fragmentadas o concatenadas. Busca de nuevo el magic despues
de ruido, longitud imposible o CRC incorrecto; un magic dentro de un payload
valido no se interpreta como una segunda peticion. Devuelve errores de
framing explicitos y solo `BH_STREAM_REPLY` autoriza enviar su buffer BHR1.
El llamador debe comunicar esos errores o registrarlos, no simular exito.

Una trama parcial caduca tras 1000 ms sin bytes nuevos, usando diferencias
sin signo para tolerar wrap. `bh_stream_poll` permite comprobar ese plazo
sin recibir otro byte. Un timeout descarta solo la trama parcial, no cancela
la sesion de transferencia ni altera el banco anterior. El driver debera
notificar una desconexion y decidir si permite reanudar la sesion existente.
Las llamadas y buffers deben estar serializados; el callback instalador no
debe reentrar al stream. No hay heap: el buffer de ensamblado ocupa 152 bytes,
aparte de estructura, respuesta, staging y memoria temporal del validador.

La integracion de escritorio envia el flujo BHT1 crudo desde JS al receptor C por pipes,
instala en una NOR simulada y valida la carga posterior a RAM; cubre dos
generaciones, paquete maximo y repeticiones sin reinstalar, insertando ruido
antes de cada trama. Se ha eliminado el prefijo de longitud exclusivo del
primer harness. La misma prueba con los paquetes ARM
reales de Diagnostics y Blocks completa 34 intercambios JS/C, incluyendo
cancelacion y rechazo de CRC total incorrecto sin sustituir el banco activo.
El test C comprueba tambien 10000 tramas malformadas sin modificar la sesion
ni llamar al instalador. El stream prueba todos los puntos de corte de una
trama STATUS, tramas concatenadas, maximo payload, magic anidado,
recuperacion tras corrupcion, timeout con wrap y 100000 bytes de ruido.
El receptor y el stream tambien se compilan para
Cortex-M0+. **No esta enlazado al residente ni escribe Flash fisica**:
staging, scratch, RAM de apps y pila deberan presupuestarse juntos antes de
integrarlos; no se pueden sumar buffers sin comprobar el limite de 16 KiB.

Con los buffers maximos actuales, staging y scratch suman 8320 bytes:
ya superan por 128 bytes los 8192 reservados a CORE, incluso antes de
estructuras, framebuffer o estado de apps. APP y STACK tienen regiones
propias de 4096 bytes cada una; no son RAM libre para esos buffers.
La reduccion del scratch elimina desperdicio, pero **no resuelve por si
sola la integracion**. No se conectara el receptor al residente sumando
estos buffers, ni se reducira la pila sin mediciones para ocultar el exceso.
Hace falta almacenamiento/verificacion por bloques o una reutilizacion de
memoria con vidas utiles y solapamientos probados, manteniendo el contrato
actual que impide solapar paquete y scratch durante la instalacion.

#### Primer residente independiente experimental PY32

```powershell
node scripts\build-platform-resident.cjs firmware-builds\residente-nuevo firmware\Fusion61
```

El segundo argumento indica el arbol local de referencia que contiene los
headers CMSIS/LL PY32 y `Core/Src/system_py32f071.c`. No se enlaza su
aplicacion F4HWN: el arranque, linker, shell, texto, framebuffer y glue de
pantalla/teclado de esta imagen estan en `firmware/platform`. Se conservan
las atribuciones BSD/Apache de los componentes de terceros; no es codigo
recuperado de Karina ni una afirmacion de independencia de toda licencia.
Requiere ARM GNU Toolchain y no sobrescribe destinos existentes.

El builder compila primero Diagnostics y Blocks como BHA1 API 2 independientes
y los incorpora, sin modificarlos, a la Flash del residente. Al iniciar una
app, `resident_apps.c` valida su paquete, lo copia a la region de 4096 bytes
en `0x20002000`, limpia BSS y prepara la entrada Thumb con barreras de memoria.
El codigo ARM contiene esa ruta de ejecucion: **compilarla no demuestra que
el salto o las apps funcionen en el MCU**. Solo se admiten estos paquetes
construidos junto al residente; no existe carga desde USB o almacenamiento
externo y el almacenamiento dual-bank aun no esta conectado.

Mapa comprobado por el linker:

- Flash de aplicacion desde `0x08002800`, 118 KiB; no incluye el bootloader.
- RAM del nucleo: `0x20000000..0x20001fff`, 8 KiB.
- RAM ejecutable para una app: `0x20002000..0x20002fff`, 4 KiB.
- Pila: `0x20003000..0x20003fff`, 4 KiB; sin heap.

El startup propio inicializa datos/BSS y VTOR. Desactiva y limpia las
interrupciones externas NVIC heredadas y los pendientes SysTick/PendSV;
despues activa exclusivamente SysTick de 1 ms como base de tiempo.
La ISR solo incrementa un contador `volatile` de 32 bits: no llama al launcher
ni dibuja. Las actualizaciones LCD no dependen del sondeo de COUNTFLAG ni
pierden vueltas del contador durante un dibujo. Conserva los relojes que entrega el
bootloader, usando el calculo CMSIS para leer su frecuencia. No programa la
Flash interna ni el almacenamiento de canales. El glue inicial usa LCD ST7565
por GPIO y matriz de teclado; no inicializa RF ni ofrece API TX. Esto no
constituye una garantia de bloqueo fisico de TX, ni se admite un salto desde
otro firmware que deje perifericos activos.

El menu permite seleccionar Diagnostics/Blocks con UP/DOWN y abrir con MENU.
En Blocks: 4/6 izquierda/derecha, MENU girar, DOWN bajar, `*` caida directa,
0 reiniciar y EXIT volver. Se requieren tres muestras estables de teclado
separadas 10 ms; no se repite una tecla mantenida ni se acepta una combinacion.
La shell solicita un tick como maximo cada 500 ms, sin rafagas de recuperacion.
Los ticks del juego usan diferencias de tiempo sin signo para tolerar el wrap
del contador de milisegundos. La ISR debe atenderse antes del siguiente
milisegundo; no se permite que una app enmascare interrupciones. Esto no
puede imponerse a codigo nativo no confiable: los tiempos reales deben medirse.

Se producen ELF, BIN experimental, mapa, informes de pila del compilador,
paquetes BHA1, manifiestos con SHA-256 y licencias/avisos. El builder comprueba
limites del BIN, vectores de pila/Reset/SysTick contra los simbolos ELF,
destino de todos los restantes vectores, limites RAM y ausencia de simbolos
sin resolver. Sus pruebas rechazan vectores Thumb incorrectos, RAM solapada
y simbolos ausentes sin necesitar el compilador ARM.
Los informes de pila individuales **no prueban** el maximo acumulado de pila.
La shell y el renderizador se prueban en escritorio, incluyendo tick de
499/500 ms, wrap de tiempo, vuelta al menu, errores y limites de texto.
El renderer 3x5 es propio y no incluye tipografias o recursos de otros firmware.

**No cargar este BIN con el instalador web actual ni como slot multiboot.**
No implementa identificacion/CRC de slot F4HWN, protocolo USB, recuperacion o
instalacion de apps externas. El manifiesto mantiene `hardwareTested: false`
e `installableWithCurrentWeb: false`. La primera prueba de arranque debera
hacerse con copia completa verificada y una via de recuperacion comprobada.

### Distribucion por imagenes funcionales

#### Recompilacion y pruebas de modulos del 26-10-2026

Se recompilaron los tres perfiles desde el commit fijado, con branding
Bricohams, Beacon y VOX desactivados. No se incorporo codigo del binario
Karina ni se instalaron estas compilaciones durante esta comprobacion.

| Perfil | BIN (bytes) | Flash enlazada / 120832 | RAM / 16384 |
| --- | ---: | ---: | ---: |
| ARDF | 113960 | 113072 | 12576 |
| Satelites (incluye CAT TX) | 114844 | 113956 | 12384 |
| Espectro/VFO-PRO | 118040 | 117152 | 13440 |

La Flash enlazada no incluye los 888 bytes del stub multiboot que tambien
se almacenan en el BIN. El constructor verifica los vectores, la identidad,
los limites de imagen y el aislamiento del stub.

Las nueve pruebas C de escritorio pasaron con Zig 0.13.0 como compilador
C: ARDF y su adaptador, Doppler, CAT RX, CAT TX, adaptador de Satelites,
Espectro, codec de presets y adaptador de Espectro. Los adaptadores usan
primitivas RF/pantalla simuladas; estos resultados no certifican RF, audio,
arranque fisico ni compatibilidad funcional completa con Karina.
Las siete pruebas JavaScript del constructor tambien pasaron.

Esto es una recompilacion comprobada de los modulos existentes, no una
implementacion nueva de todas las funciones de Karina. En particular no
acredita volumen dinamico, autocaptura equivalente con filtro de ruido,
temporizaciones internas equivalentes de AM/squelch, generador AM,
presets persistentes completos de estado ni equivalencia de menus.
No se implementan autorrespuestas o balizas TX por el hecho de aparecer
en la documentacion Karina. La identidad de protocolo sigue siendo F4HWN:
renombrarla sin actualizar conectores y mapas de memoria romperia la
interoperabilidad existente.

Las funciones se distribuyen en imagenes separadas cuando Flash/RAM impiden
una imagen unica. El objetivo es conservar Main y distribuir imagenes compatibles en
slots 1-4, no inventar carga dinamica de codigo ni mezclar formatos de bancos.
No se asignan slots ni se escribe hardware automaticamente.

| Imagen funcional | Estado real |
| --- | --- |
| Bricohams ARDF | Imagen Beta construida con `--module ardf`, ciclos y memoria manual de atenuacion en Fox Hunt |
| Bricohams Satelites | Imagen Beta de Doppler manual y CAT RX v1 construida con `--module satellite`; no seguimiento orbital autonomo |
| Bricohams Espectro | Imagen Beta `--module spectrum`: 128 puntos RX, peak hold, promedio, multipreset RAM y captura VFO-PRO RX con entrada de frecuencia |
| Resto de funciones documentadas Karina | Requieren reconstruccion y pruebas; no se declaran incluidas por renombrar una imagen |

La separacion no recupera codigo Karina ni garantiza que sus algoritmos sean
equivalentes. Cada imagen debe tener manifiesto, modulos reales, limites,
fuentes/licencias y validacion estructural propios. El presupuesto debe medirse
despues de enlazar cada combinacion. Main no se reemplaza para demostrar el
selector y no se instalaran automaticamente binarios de otros proyectos.

### Nucleo propio para satelites

`firmware/bricohams/doppler.c` calcula correcciones de frecuencia con
velocidad radial en mm/s. Positivo significa satelite alejandose: RX disminuye
y el uplink nominal aumenta. Las frecuencias se expresan en unidades de
10 Hz y se redondean al paso mas cercano. La formula coincide con el modelo
clasico no relativista de la planificacion web; no reproduce un algoritmo
Karina ni habilita transmision. La salida siempre declara `receive_only=true`.

`BRICOHAMS_ENABLE_SATELLITE=OFF` excluye la biblioteca. Valida VHF
136-174/UHF 400-470 tanto nominales como corregidas y velocidad radial de
hasta 12 km/s en ambos sentidos. Una entrada invalida conserva la salida
anterior y devuelve error explicito. No genera TLE, tiempo UTC, posicion,
pases SGP4 ni velocidad radial: estos datos deben proceder de un predictor
validado. Tampoco implementa CAT, seguimiento automatico o persistencia.
Los tests contrastan 241 velocidades con una referencia de doble precision,
signos, limites y redondeo de hasta media unidad (5 Hz).

### Imagen Satelites: Doppler manual en recepcion

Guias de usuario ligadas a esta imagen: [Iniciacion al satelite](INICIACION-SATELITE.md)
(conceptos, pases, Doppler, operacion con teclas 4/5/6/8/9 y CAT) y
[Antenas de satelite](ANTENAS-SATELITE.md) (Yagi bibanda y dipolo en V
simulados, con piezas STL imprimibles).

El builder admite `--module satellite` en vez de `--module ardf` en el
comando FieldOps de abajo, con Beacon y VOX OFF. Rechaza combinar ambos:
usan pantallas/teclas diferentes del mismo modo residente. El nombre del
binario incluye el modulo, evitando confundir las imagenes.

El adaptador `satellite_foxhunt.inc` toma RX y TX nominales del VFO/canal
seleccionado al entrar en Fox Hunt y muestra `SAT RX`. En esta imagen la
accion de tecla lateral se llama tambien **SAT RX** (antes «FOX HUNT»):
asignala en MENU a F1Shrt, F1Long, F2Shrt, F2Long o M Long y pulsa esa tecla
para abrir la pantalla; desde ella, la tecla 8 habilita CAT RX y la 9 arma
CAT TX. Requiere ambas
frecuencias dentro de las bandas admitidas. No cambia los datos de VFO
ni la frecuencia TX; el resultado de uplink calculado no se aplica al
transmisor. Cambia exclusivamente la sintonia RX y su filtro mediante las
primitivas existentes. Al salir, el flujo Fox Hunt restaura los registros
del VFO usando `RADIO_SetupRegisters`. Debe verificarse en hardware.

| Tecla | Doppler manual |
| --- | --- |
| 4 | Reducir velocidad radial 500 m/s (aproximacion es negativa) |
| 5 | Velocidad cero: restablece la frecuencia RX nominal |
| 6 | Aumentar velocidad radial 500 m/s (alejamiento es positivo) |
| 8 | Habilitar CAT RX temporal / deshabilitar y volver a RX nominal; requiere VFO valido |
| 9 | Armar / desarmar la PTT CAT (CAT TX v1) para enviar SSTV desde la app |
| 2 | Audio existente Fox Hunt: silencio, pitidos, audio recibido; comienza con ajuste upstream guardado |
| EXIT | Salir y restaurar la configuracion RF del VFO |

Limite manual +/-12 km/s, sin wrap. La velocidad y frecuencia corregida
se muestran en pantalla. `SAT INVALID VFO` significa entrada nominal o
correccion fuera de rango: no se realiza la nueva escritura RF y se mantiene
la ultima sintonia aceptada; tecla 5 restablece cero si el nominal es valido.
Cambiar de canal/frecuencia nominal requiere salir y volver a entrar.
Las teclas nuevas respetan el bloqueo de teclado y no usan F como inversor.
No hay TLE, seleccion automatica de satelite, reloj UTC, SGP4 ni
prediccion del pase dentro de la radio. Se proporciona manualmente una
velocidad radial correcta de un predictor externo, o una frecuencia RX
absoluta por el nuevo CAT experimental. No se deduce de RSSI.

La compilacion con etiqueta SAT RX midio 112320 bytes, RAM 12352/16384 y Flash
111432/120832; cualquier cambio posterior debe volver a medirse.
Los tests del adaptador simulan las primitivas RF: comprueban signos,
limites, frecuencia aplicada, ausencia de cambios TX/VFO y recuperacion
tras error. No certifican recepcion, audio ni restauracion fisica.
El modo es de recepcion salvo la PTT CAT armada con 9 (ver CAT TX); el resto del firmware conserva TX upstream.
No es un firmware globalmente bloqueado para TX ni un equipo full-duplex.

#### CAT RX Bricohams v1 implementado

La imagen `Satellite-CAT-final-20261025` mide 113868 bytes RAW,
RAM 12384/16384 y Flash 112980/120832. Incluye bootlogo Bricohams y un
endpoint experimental propio, no compatibilidad con protocolos CAT de
Kenwood/Yaesu ni soporte CAT de otras ediciones F4HWN.

En SAT RX, pulsa 8 con el teclado desbloqueado: `CAT READY RX`.
Una orden valida muestra `SAT CAT RX`. Las teclas 4/5/6 deshabilitan CAT
y devuelven el control al Doppler manual; 8 lo deshabilita y restaura la
frecuencia RX nominal de entrada. Bloquear el teclado cancela CAT y vuelve
a RX nominal. Salir del modo elimina el estado CAT antes de restaurar el
VFO por el flujo upstream. Volver a entrar exige habilitar de nuevo con 8.

Cada SET renueva un lease de 3000 ms. Al caducar se aplica RX nominal,
se descarta cualquier SET pendiente y se muestra `CAT TIMEOUT`; CAT sigue
habilitado para una nueva orden valida. QUERY, ordenes invalidas y errores
no renuevan el lease. No se mantiene indefinidamente una correccion de un
pase perdido. El timeout se comprueba en el bucle RX, no en una interrupcion:
depende de que el firmware siga ejecutando dicho bucle. No es un watchdog
hardware ni una garantia ante bloqueo de CPU.

El endpoint reutiliza las tramas USB CDC/UART existentes con ofuscacion y
CRC; **no es cifrado ni autenticacion**. Solo admite frecuencias absolutas
en unidades de 10 Hz, 136-174 o 400-470 MHz inclusive, y solo se aplican
en SAT RX habilitado localmente. No modifica canales, subtonos, potencia,
EEPROM, Flash ni TX. La modulacion/ancho de banda son los del VFO de entrada.
No usarlo como control de transmision ni afirmar que la sintonia RF ha sido
medida: la confirmacion indica que se han invocado las primitivas RX.

Contrato binario little-endian, comando privado `0x7B00`, respuesta `0x7B01`.
La cabecera Size upstream expresa la longitud de datos, sin la cabecera.
No se asignan comandos nuevos a firmware ajeno.

| Offset solicitud | Bytes | Contenido |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 SET_RX, 2 STOP_RX |
| 2 | 2 | Secuencia, repetida en la respuesta |
| 4 | 4 | Frecuencia RX en 10 Hz; cero obligatorio para QUERY/STOP |

La solicitud debe tener exactamente 8 bytes; no hay campos opcionales.

| Offset respuesta | Bytes | Contenido |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Estado |
| 2 | 2 | Secuencia; cero si la longitud no permite procesar la solicitud |
| 4 | 4 | Capacidades 7: bit 0 SET_RX, bit 1 QUERY, bit 2 STOP/lease; sin TX/escritura persistente |
| 8 | 4 | Ultima frecuencia aplicada por software, 10 Hz; cero si CAT deshabilitado |
| 12 | 4 | Flags: bit 0 habilitado localmente, bit 1 lease remoto, bit 2 cambio pendiente |

Estados: 0 consulta correcta, 1 en cola, 2 longitud/campos incorrectos,
3 version no soportada, 4 operacion no soportada, 5 CAT no habilitado,
6 frecuencia fuera de banda. Todo error conserva el estado anterior.
SET/STOP devuelven 1: **no significa aplicado**. El bucle RX aplica el
cambio validado, actualiza frecuencia reportada y limpia el bit pendiente.
Un SET posterior antes de aplicar sustituye al anterior, no crea una cola
sin limite. STOP solicita RX nominal y termina el lease, sin deshabilitar
la posibilidad de otra orden mientras siga habilitado fisicamente.

El conector web expone `getCatStatus`, `setCatReceive(frequency10Hz)` y
`stopCatReceive`. Valida secuencia/version/capacidades, diferencia estado
pendiente de aplicado y comprueba el resultado mediante consultas acotadas.
No hace reintentos SET ni renovaciones automaticas. Un fallo invalida la
conexion segun el flujo existente y exige reconectar. No son funciones de
programacion persistente y no conceden permiso para escribir sin respaldo.

#### CAT TX Bricohams v1 (PTT por lease)

Anadido el 2026-10-26 para enviar SSTV desde la app Android. Es una PTT remota
para una fuente de audio externa conectada a la entrada de microfono de la
radio; no cambia frecuencia, potencia, subtonos, EEPROM ni Flash. El firmware
no genera el audio: la app reproduce Robot36 por un cable a la entrada de
microfono mientras mantiene la PTT.

Seguridad, por orden:

1. **Confirmacion en la radio.** Solo la tecla 9 en SAT RX arma la PTT
   (`CAT TX ARMED`); el host no puede armarla. Bloquear el teclado, salir de
   SAT RX o pulsar 9 de nuevo la desarma.
2. **Lease de 1500 ms.** El host renueva la orden KEY; si deja de hacerlo, la
   radio suelta la PTT sola. Una orden KEY en cola caduca igual.
3. **Limite de 120 s por emision.** Al llegar, la radio suelta la PTT, se desarma
   y muestra `CAT TX LIMIT`; hay que volver a armar con 9.
4. **Bandas y TX lock de la radio.** Antes de emitir se aplican las mismas
   comprobaciones que la baliza Fox Hunt (`FOXHUNT_TxState`): TX lock por banda,
   bateria baja o tension alta y modulacion FM. Si falla, `CAT TX DENIED` y
   ninguna orden KEY vuelve a funcionar hasta rearmar con 9.
5. **Cualquier tecla aborta.** Durante la emision el bucle es modal: no corre la
   medida RX ni los pitidos Geiger de Fox Hunt, solo UART y teclado. Cualquier
   tecla nueva suelta la PTT y desarma.
6. **Indicativo obligatorio.** La app no transmite sin un indicativo valido y lo
   imprime en la imagen Robot36.

Emite en la frecuencia TX del VFO de entrada (con su desplazamiento), sin
correccion Doppler de subida. El LED rojo se enciende como en la PTT normal y
la pantalla muestra `CAT TX ON AIR` y la frecuencia TX. Mientras se emite, las
ordenes CAT RX se aceptan pero se aplican al volver a RX.

Contrato: comando privado `0x7B02`, respuesta `0x7B03`, little-endian.

| Offset solicitud | Bytes | Contenido |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | 0 QUERY, 1 KEY (activar o renovar el lease), 2 UNKEY |
| 2 | 2 | Secuencia, repetida en la respuesta |
| 4 | 4 | Reservado, cero obligatorio |

| Offset respuesta | Bytes | Contenido |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Estado |
| 2 | 2 | Secuencia; cero si la longitud no permite procesar la solicitud |
| 4 | 4 | Capacidades 8: PTT con lease; sin frecuencia, potencia ni escritura persistente |
| 8 | 4 | Flags: bit 0 armada, bit 1 emitiendo, bit 2 KEY pendiente, bit 3 limite alcanzado; bits 8-15 estado VFO del rechazo |
| 12 | 4 | Milisegundos emitiendo, cero si no emite |

Estados: 0 correcto (KEY: ya emitiendo), 1 en cola (KEY pendiente o UNKEY
pendiente de aplicar), 2 longitud o reservado, 3 version, 4 operacion,
5 no armada, 7 rechazada por la radio, 8 limite de 120 s. UNKEY se acepta
siempre. Las capacidades de CAT RX siguen siendo 7: CAT TX es un endpoint aparte.

Comprobado el 2026-10-26: `cat_tx_test` (protocolo, lease, limite, rechazo) y
`satellite_adapter_test` (arme por tecla, emision modal, aborto por tecla,
rechazo, limite, desarme por bloqueo y salida) pasan con las primitivas RF
simuladas. La imagen F4HWN v6.1.0 Fusion con `--module satellite` y
`ENABLE_FEAT_F4HWN_FOXHUNT=ON` compila sin avisos: Flash 113212/120832,
RAM 12384/16384. **Sin validacion en radio ni medida RF.**

En **Quansheng > Operaciones** hay un panel CAT RX Beta para consultar,
sintonizar durante un lease y volver a nominal. Su estado es la ultima
respuesta, no telemetria continua. El seguimiento de pases web se describe
abajo; Android tiene un cliente USB experimental con seguimiento orbital SGP4. Los controles se deshabilitan sin
conexion o durante otra operacion. Probarlo requiere arrancar la nueva
imagen: conectarse al firmware original no la instala ni activa CAT.

Las ocho suites C incluyen protocolo, rangos, longitudes invalidas,
secuencia reflejada, caducidad con rollover, ausencia de renovacion por
consulta, cancelacion local/bloqueo y flujo del adaptador con RF simulado.
Las pruebas JavaScript simulan el transporte, respuestas pendientes,
secuencia incorrecta y errores: no sustituyen una prueba CAT USB/radio.
El manifiesto incluye `catRx` y hashes del codigo aplicado. No se ha
flasheado ni certificado el funcionamiento fisico.

#### Seguimiento de pase web implementado sobre CAT RX

En **SAT / pases**, actualizar TLE/frecuencias, indicar posicion consentida,
calcular pases y seleccionar un pase y una frecuencia puntual FM.
**Seguir pase seleccionado por CAT RX** solo inicia durante el intervalo
del pase seleccionado y con el satelite sobre el horizonte. No se programa
un inicio desatendido futuro. La prediccion debe haberse calculado hace
menos de 15 minutos, y el TLE debe cumplir su validez maxima de siete dias.
La radio requiere la imagen CAT anterior, SAT RX y habilitacion fisica con 8.

`catPassTarget` reutiliza satellite.js/SGP4 y las validaciones de TLE
existentes. Calcula distancia observador-satelite a t-0.5 y t+0.5 segundos,
obtiene velocidad radial y aplica `fRX = fNominal * (1 - vRadial/c)`.
Redondea a 10 Hz y rechaza el resultado fuera de las bandas RX admitidas.
Solo admite frecuencias puntuales FM/FM estrecha, no transpondedores lineales.
El observador es fijo durante la sesion: no sigue GPS movil ni orienta antenas.

`CatPassTracker` toma una copia independiente del plan: un cambio posterior
no altera silenciosamente la sesion activa. La UI bloquea las operaciones
de radio/programacion y los parametros de plan mientras sigue el pase.
**Detener seguimiento CAT** queda fuera del fieldset bloqueado y permanece
operativo. Tras cada SET confirmado espera 750 ms antes de calcular el
siguiente, aproximadamente una actualizacion por segundo segun el enlace.
Renueva aunque la frecuencia redondeada no cambie para mantener el lease.
No mantiene dos SET simultaneos ni promete una tasa fija de tiempo real.

Se detiene al terminar el pase, al ocultar/cerrar la pagina, retirar el
consentimiento/cambiar datos, perder conexion, detectar un error de
propagacion o recibir una confirmacion tardia. Tambien rechaza retrocesos
de reloj e intervalos de actualizacion mayores de 2000 ms. Un navegador
suspendido no es un controlador de tiempo real: si no puede enviar STOP,
la restauracion depende del lease de 3 s del firmware. La hora UTC del
equipo debe ser correcta; no hay sincronizacion externa automatica.

Al cancelar, el controlador espera cualquier SET en curso antes de enviar
STOP; evita que un SET tardio vuelva a activar el seguimiento. No reintenta
SET despues de cancelar y no reinicia sesiones automaticamente. Los
errores de restauracion se muestran, no se convierten en exito. La UI
indica ultima frecuencia y geometria calculadas, no una medicion RF.

Seis pruebas de nucleo JavaScript cubren Doppler contrastado contra
calculo de rango SGP4, validaciones, instantanea del plan, renovacion,
cancelacion durante SET, fin de pase, discontinuidades, respuestas tardias
y desconexion. Prueba de navegador con transporte simulado: dos SET RX,
STOP manual y STOP al simular pagina oculta, sin errores y con el boton
de parada utilizable mientras los parametros estan bloqueados.
No se han ejecutado esas ordenes en la radio real. La APK Android incorpora
CAT RX temporal por CDC y adaptadores USB-serie reconocidos con seguimiento SGP4 propio. El calculo orbital permanece fuera del MCU;
no se han anadido TLE/SGP4 al MCU.

### Presets propios de espectro, sin escribir EEPROM

`firmware/bricohams/presets.c` define un contenedor BHSP v1 de 208 bytes
con hasta 8 presets: nombre ASCII de 8 caracteres, frecuencia inicial,
paso, puntos, asentamiento y muestras. Usa enteros little-endian explicitos,
CRC32 IEEE y bytes reservados cero; no serializa structs C ni depende de
su alineacion. La seleccion activa forma parte del contenedor.

El codec comprueba configuraciones y rechaza corrupcion, version/reservados
desconocidos y longitudes invalidas. Decodifica en temporal antes de sustituir
el estado; codifica en temporal antes de sustituir el destino. Los buffers
no deben solaparse con el estado. CRC no es firma ni autenticacion.
No se ha reservado una direccion en EEPROM/Flash: se conserva mediante
archivo local y transferencia RAM descrita abajo, no guardado interno.
Los tests verifican ida/vuelta y corrupcion de cada uno de los 208 bytes.

#### Transferencia de presets a archivos implementada

La imagen `Spectrum-PresetFiles-beta-20261025` incluye exportacion e
importacion de la tabla RAM completa, desde **Quansheng > Operaciones >
Presets de Espectro Bricohams Beta**. El archivo `.bhsp` tiene exactamente
208 bytes, sin datos privados de calibracion o configuracion de canales.
La transferencia no escribe EEPROM ni Flash y no concede permisos de
programacion persistente.
La web no lo sube a servidores. Sigue siendo necesario descargarlo y
conservarlo; no se guarda automaticamente en el telefono o en la radio.

Antes de transferir: entrar en SPEC RX, guardar al menos un preset con 8,
pausar con 4 (`HOLD`), desactivar MULTI si estaba activo y desbloquear el
teclado. No se acepta transferencia desde captura RX. Para importar no
es necesario tener presets previos. Exportar una tabla vacia da error.
La habilitacion depende del estado fisico de la radio, no de un booleano
de la web. Pulsar cualquier tecla procesada durante una transferencia
descarta el estado parcial. Salir del modo tambien lo descarta.

Exportar captura una instantanea BHSP completa y la devuelve en dos
fragmentos. Importar recibe ambos fragmentos en un buffer temporal, valida
el archivo completo y solo entonces reemplaza la tabla RAM. Una interrupcion,
fragmento ausente, token distinto o CRC incorrecto no sustituye la tabla.
El formato general del codec admite mas configuraciones que el adaptador;
la importacion exige 128 puntos, asentamiento 10/20/40/80 ms, pasos 125/250/625/1250 en unidades
de 10 Hz, promedio 1/2/4/8 y ventana completa dentro de 136-174 o 400-470 MHz.
Nombres, seleccion, reservados y registros no usados deben ser canonicos.

Importar no sintoniza, no reanuda el barrido y no restaura ganancia,
blacklist, CSS ni audio. La tecla 9 recupera el siguiente preset segun el
comportamiento existente, y 4 reanuda. La web relee la tabla completa despues
de confirmar la importacion y exige igualdad byte a byte. Un error de
relectura se muestra como importacion no verificada: si el COMMIT ya se
acepto, no se puede afirmar que la tabla siga siendo la anterior.

Protocolo privado experimental little-endian `0x7B10` / respuesta `0x7B11`,
sobre las tramas USB CDC/UART existentes. No es cifrado ni autenticacion.
Solicitudes: version 1 (byte 0), operacion (byte 1), token no nulo de
32 bits (bytes 2-5), y solo para operaciones 2/3, 104 bytes de fragmento.
Los demas comandos tienen exactamente 6 bytes. Respuesta: version 1,
estado y el mismo token, seguidos de 104 bytes solo para exportaciones
correctas. Los errores tienen 6 bytes. No se serializan structs C.

| Operacion | Accion |
| --- | --- |
| 0 | Crear instantanea y leer primeros 104 bytes |
| 1 | Leer segundos 104 bytes de la misma instantanea y cerrar transferencia |
| 2 | Iniciar importacion con primeros 104 bytes |
| 3 | Recibir segundos 104 bytes |
| 4 | Validar y aplicar tabla RAM completa |
| 5 | Descartar transferencia parcial, sin modificar presets |

Una nueva operacion 0/2 sustituye la transferencia anterior. Las operaciones
1/3/4 requieren token y fase correctos. La transferencia caduca a los
5000 ms desde su inicio; cada fragmento no prolonga esa ventana.
Estados: 0 correcto, 2 solicitud invalida, 3 falta estado fisico permitido,
4 tabla vacia/invalida para exportar, 5 fase/token/caducidad incorrectos,
6 archivo corrupto/no soportado, 7 configuracion no admitida por el adaptador.
No hay reintentos automaticos ni COMMIT tras un error en los fragmentos.

La construccion registra `spectrumPresets` y los hashes de fuentes en el
manifiesto. Las pruebas simulan radio y transporte: incluyen lectura,
CRC, commit atomico, recuperacion del archivo, relectura distinta,
secuencia/token, caducidad/rollover, longitudes invalidas y bloqueo por
captura/multipreset/teclado. Esto conserva presets entre sesiones mediante
archivos, no equivale a persistencia EEPROM. No se ha probado USB fisico.

### Imagen Espectro, VFO-PRO RX y multipreset

`--module spectrum` sustituye `--module ardf` en el comando FieldOps
documentado abajo, con un directorio de salida nuevo. Requiere Fox Hunt
residente ON, Beacon OFF y overlay apps OFF. Cada adaptador necesita su
propia imagen. El modo Fox Hunt muestra `SPEC RX`; el analizador original
del upstream sigue disponible por sus otras acciones.

El barrido propio cubre 128 puntos: 64 por debajo del centro, el centro
y 63 por encima. Toda la ventana debe caber en 136-174 o 400-470 MHz.
Al entrar toma el centro del VFO/canal seleccionado. No cambia memorias,
RX/TX del canal ni calibracion. La modulacion y el ancho siguen siendo los
del VFO original; introducir una RX no configura un nuevo perfil de canal.
La ganancia usa los presets existentes y permite ajustar solo los cuatro
campos RX documentados de R13 desde captura. No hay edicion arbitraria
de registros. El flujo de salida restaura RF con `RADIO_SetupRegisters`;
esta restauracion y el funcionamiento RF quedan pendientes de prueba fisica.

| Tecla | Barrido propio |
| --- | --- |
| 0 | Activar/desactivar recorrido circular de presets RAM; requiere dos o mas |
| 4 | Pausar/reanudar barrido y cambio de ventana |
| 5 | Reiniciar peak hold a los niveles actuales |
| 6 | Paso 1.25, 2.5, 6.25, 12.5 kHz; reinicia el cuadro |
| 7 | Promedio 1, 2, 4, 8 muestras por punto; reinicia el cuadro |
| * | Asentamiento RX 20, 40, 80, 10 ms, circular; reinicia el cuadro |
| 8 | Guardar en el siguiente preset RAM; si hay ocho, reemplazar el seleccionado |
| 9 | Recuperar el siguiente preset RAM de forma circular |
| 3 / flechas | Atenuacion upstream; cambiar ganancia reinicia medidas no comparables |
| 1 | Borrar exclusiones de sesion y reiniciar medidas |
| 2 | Sin accion durante el barrido; audio silenciado |
| PTT | Capturar el punto medido mas fuerte en VFO-PRO RX; no transmitir |
| EXIT | Salir, descartar presets RAM y restaurar el VFO |

Se muestran RSSI bruto y picos con escala automatica 0...maximo de los
picos del cuadro, no dBm calibrados ni una FFT. La escala puede cambiar.
Cada sintonia aplica frecuencia, filtro RX y reinicio de recepcion BK4819,
y espera al menos el asentamiento seleccionado del SysTick real antes de aceptar muestras. No
bloquea esperando ese tiempo. Cada muestra procede de otra iteracion.
Los retardos del bucle modal tambien afectan la cadencia: no se garantiza
una tasa de barrido, ancho de banda de resolucion o precision instrumental.

El asentamiento comienza en 20 ms en cada entrada al modo y se guarda
individualmente en los presets RAM/BHSP. Los archivos previos de 20 ms
siguen admitidos; otros valores distintos de 10/20/40/80 se rechazan sin
sustituir la tabla. La captura VFO-PRO y los cambios de ganancia conservan
su espera independiente de 20 ms. El modo de 10 ms es experimental:
su disponibilidad no demuestra que el PLL, filtro o RSSI hayan alcanzado
estabilidad en todas las condiciones. No es una reproduccion del
parametro Delay o Turbo interno de Karina ni reduce el tiempo de CSS.

`SPECTRUM ERROR` detiene nuevas sintonias si la ventana no cabe en banda
o el nucleo devuelve error. No se recortan silenciosamente los extremos:
se debe recuperar un preset valido, reducir el paso o salir y cambiar centro.
Las teclas nuevas respetan el bloqueo de teclado.

#### Captura VFO-PRO propia: solo recepcion

La referencia funcional es el apartado 4.4, pagina 22 del manual Karina V1
de agosto de 2026: captura activa y vista detallada. La implementacion es
propia para V3. PTT no habilita TX ni aplica offset/subtonos de subida.
No acredita equivalencia completa con VFO-PRO Karina.

PTT elige el mayor RSSI medio actual entre puntos completados; en empate,
el primero. En el primer cuadro solo considera los puntos ya completados;
despues considera tambien los de la pasada anterior aun no actualizados.
No elige por maximos historicos ni identifica emisoras. Sin puntos completos,
`WAIT SAMPLES` informa y no se cambia sintonia.

| Tecla | Captura RX |
| --- | --- |
| Arriba / abajo | Sintonizar un paso del barrido, sin salir de las bandas RX |
| 2 | Activar/desactivar audio recibido mediante la ruta upstream |
| 3 | Atenuacion upstream |
| MENU | Alternar ayuda y vista de ganancia RX: lecturas R13/R43 y campo seleccionado |
| 6, en vista de ganancia | Seleccionar LNAs, LNA, MIX o PGA |
| 1 / 7, en vista de ganancia | Reducir/aumentar un indice del campo RX seleccionado, sin wrap |
| 4 | Incluir/excluir la frecuencia capturada en la blacklist de sesion |
| 9 | Activar/desactivar busqueda CTCSS/DCS opcional, solo si el VFO original es FM |
| * | Entrada directa RX de ocho digitos; 43512500 representa 435.12500 MHz |
| 5 | Centrar un nuevo barrido en la frecuencia capturada si cabe toda la ventana |
| PTT | Sin accion; no transmite |
| EXIT | Volver al centro original del barrido, reiniciando medidas y conservando presets |

Las sintonias y cambios de ganancia esperan al menos 20 ms antes de mostrar
RSSI bruto; mientras se muestra `SETTLING`. `BAND LIMIT` conserva la ultima
frecuencia al intentar salir de banda. `SPAN OUT OF BAND` conserva captura
y centro anterior si 5 no puede encajar toda la ventana.
Los registros e indices son valores en bruto, no calibracion certificada.
Solo se modifican campos RX R13 descritos abajo; no se editan desviacion,
microfono, AFC ni TX. La busqueda CTCSS/DCS opcional se describe abajo.
No hay lista de hallazgos o guardado de frecuencia en memorias.

En entrada directa, MENU aplica solo ocho digitos validos; * borra un digito
(cancela si esta vacia) y EXIT cancela sin sintonizar. Los numeros dejan de
ejecutar acciones de captura mientras se introducen digitos. PTT tampoco
transmite. `ENTER 8 DIGITS`, `FULL: 8 DIGITS` y `RX OUT OF BAND` notifican
rechazos; la ultima sintonia aceptada permanece intacta.

EXIT de nuevo, ya en barrido, sale del modo por el flujo upstream. La sintonia
fina no cambia el centro hasta pulsar 5 y nunca modifica RX/TX del canal.
Con teclado bloqueado, las flechas mantienen la atenuacion upstream y no
son sintonia. El audio empieza silenciado en captura; su ajuste previo a
entrar en el modo se conserva al salir. Se suprimen las escrituras de ajustes
Fox Hunt en esta imagen: ganancia y opciones nuevas son de sesion.
Fuera de este modo, el firmware conserva TX upstream; no es globalmente RX-only.

#### Ganancia manual RX y exclusiones

La vista de registros permite seleccionar con 6 los campos R13 documentados
por `BK4819_InitAGC` del upstream: LNAs (bits 9:8, indices 0-3), LNA
(7:5, 0-7), MIX (4:3, 0-3) y PGA (2:0, 0-7). 1 disminuye y 7 aumenta;
`GAIN LIMIT` rechaza el desbordamiento sin escribir. Cada ajuste lee R13,
cambia exclusivamente la mascara seleccionada y conserva todos los demas
bits, incluidos los desconocidos 15:10. No cambia R43, R7E ni tablas de AGC.
Fox Hunt ya fija AGC al entrar; no se habilita una segunda politica AGC.

Los indices no son dB calibrados ni valores intercambiables con Karina.
`RX GAIN SESSION` notifica el ajuste y se espera de nuevo al asentamiento.
Al salir de la vista de registros se muestra MAN en lugar de ATT; el numero
que sigue a MAN es el ultimo indice de preset, no una atenuacion efectiva.
El ajuste manual sigue activo al volver al barrido y cambiar ventana, pero
no se guarda en presets. Cambiar el preset de ganancia con 3 o las flechas
de atenuacion upstream sustituye esos campos y vuelve a ATT.
Salir del modo restaura RF por el flujo upstream, pendiente de prueba fisica.
No hay guardado de ganancia en EEPROM ni calibracion.

La blacklist tiene 16 frecuencias exactas en unidades de 10 Hz, no rangos.
4 en captura alterna la frecuencia: `FREQ EXCLUDED` / `FREQ INCLUDED`;
`BLACKLIST FULL` rechaza una nueva sin expulsar otra. BL indica el numero
y X marca la captura excluida. En barrido, 1 vacia la lista, reinicia medidas
y muestra `BLACKLIST CLEARED`.

Durante el barrido se omite cada punto coincidente sin sintonizar ni leer
RSSI y se ponen a cero su nivel/pico. Se dibuja una marca, no una medida.
La captura automatica PTT ignora los puntos excluidos; `POINTS EXCLUDED`
informa si todos los puntos completados lo estan. El salto avanza tambien
al terminar cuadro o preset, sin esperar senal ni girar en un bucle bloqueante.
La lista se conserva entre presets y pasos durante esa sesion: si otra
rejilla no coincide exactamente, no se excluye una frecuencia vecina.
La sintonia manual puede escuchar una frecuencia excluida para poder
volver a incluirla con 4. No es una restriccion de acceso RF ni de TX.
La lista se descarta al salir/apagar y nunca se escribe en memoria persistente.

#### Busqueda CTCSS/DCS RX opcional

En captura FM, 9 activa `CSS SEARCH...`; 9 de nuevo la desactiva.
`CSS NEEDS FM` rechaza la activacion en otras modulaciones sin escribir RF.
La busqueda reutiliza `BK4819_SetScanFrequency`, `BK4819_GetCxCSSScanResult`
y las tablas/decodificadores DCS del upstream. No es un decodificador DSP
propio ni certificacion de deteccion en hardware. La configuracion temporal
del detector no modifica el tono TX/RX del canal ni habilita transmision.

Se guarda R51 antes de activar y se restaura al desactivar, volver al
barrido con EXIT/5 o salir del modo. La primitiva de busqueda puede reiniciar
la ruta RX: por eso se preservan y reaplican los registros de ganancia R13
y AGC R7E. No se escribe calibracion ni se guarda el resultado.
Al cambiar frecuencia se reinicia la busqueda sobre esa frecuencia; al
cambiar ganancia se descartan candidato e indicacion anteriores.

Se ignoran resultados durante los primeros 500 ms tras sintonizar/activar
y se consultan como maximo cada 250 ms. Un tono requiere dos resultados
consecutivos validos de mismo tipo e indice, separados por ese intervalo.
Un resultado ausente o invalido interrumpe la confirmacion. La indicacion
confirmada caduca tras 1500 ms sin nuevas confirmaciones; no se conserva
indefinidamente un tono de una emision anterior.

CTCSS se muestra en Hz con un decimal y solo se acepta una medida a no
mas de 0.5 Hz del nominal de la tabla upstream; esto es un filtro de
presentacion, no tolerancia instrumental medida. DCS se valida con el
decodificador Golay upstream, primero normal y despues invirtiendo sus
23 bits; se muestra en octal con N/I. Esa polaridad es una interpretacion
del codeword observado, pendiente de contrastar con generador/radio real.

La linea de audio/blacklist se sustituye por el tono o `CSS SEARCH...`
mientras esta activada; las teclas de audio y exclusiones siguen funcionando.
No se usa RSSI para afirmar validez del subtono, no filtra el audio por
tono y no copia resultados a memorias. Ruido, portadoras debiles o registros
de deteccion congelados pueden producir falsas coincidencias: comprobar
con una fuente conocida antes de utilizar la indicacion para configurar
otra radio. Los tests del adaptador simulan los resultados del chip y del
decodificador, verifican temporizacion, normal/invertido, rechazo, caducidad,
rollover y restauracion de R51/R13/R7E; no miden deteccion RF real.

#### Multipreset de sesion

Los presets RAM1...RAM8 guardan ventana, paso y promedio, no ganancia, medidas
ni calibracion. P0/0 indica que no hay ninguno. No sobreviven a salir/apagar,
no escriben EEPROM. La imagen nueva permite importacion/exportacion de la
tabla RAM por USB/UART a archivos BHSP, como se describe arriba.

Para ventanas distintas: PTT captura, * introduce otra RX, MENU acepta,
5 vuelve al barrido centrado y 8 guarda. Repetir para los rangos necesarios.
Con dos o mas presets, 0 inicia `MULTI` desde el seleccionado. Al completar
128 puntos se muestra el cuadro y la siguiente iteracion inicia otro preset;
tras el ultimo vuelve al primero. Cada ventana reinicia sus niveles/picos:
no se mezclan medidas de bandas diferentes. No es exploracion paralela,
busqueda por umbral ni lista de emisoras.

4 pausa tambien la transicion; 0 desactiva sin borrar presets.
`SAVE 2 PRESETS` informa si no hay dos. Cambiar paso, promedio o ganancia
reinicia el cuadro actual sin saltarlo; no altera el preset hasta guardar
con 8. PTT suspende el recorrido durante captura; EXIT o 5 vuelven a barrido.
Al salir se descartan presets y MULTI.

Compilacion con bootlogo y transferencia de presets: 118044 bytes, RAM
13440/16384, Flash 117156/120832; stub Multiboot 888 bytes y 83 ramas de
aislamiento comprobadas. El margen de esta combinacion es reducido:
no se pueden anadir modulos sin volver a comprobar tamano y RAM.
Las ocho suites C pasan, incluidos captura parcial/completa, entrada RX,
rechazos, lectura sin escritura de R43, ciclos multipreset, pausa,
promedio, exclusiones exactas y limites. Se verifican 524288 combinaciones:
los 65536 valores posibles de R13, en cuatro campos y ambas direcciones,
incluyendo ausencia de wrap y preservacion exacta de los bits ajenos.
Las tres suites de espectro pasan sin ARDF/Satelites.
Estos tests simulan RF y pantalla; no validan la radio fisica.

#### Seleccion desde la web

En Quansheng, **Firmware a medida > Imagenes Bricohams locales**, se elige
ARDF, Satelites o Espectro y se copia el comando PowerShell. No usa las
casillas del catalogo online, no compila en el navegador ni instala nada.
Requiere las herramientas ARM locales, un Fusion61 con el commit fijado
y un destino nuevo. Las rutas del comando deben adaptarse al equipo.
Despues se cargan todos los archivos de `artifacts`, incluidos SHA256SUMS
y build-info, en el verificador existente. Preparar e instalar un slot
sigue siendo independiente y exige respaldo verificado; Main se conserva.

### Nuevo nucleo independiente ARDF

La implementacion propia parte de comportamiento documentado e inspeccion de binarios,
sin esperar fuentes Karina. Esto **no acredita equivalencia 100 %** ni
convierte la base F4HWN en una reescritura completa desde cero.

`firmware/bricohams/ardf.c` y `ardf.h` son un nucleo C99 escrito
independientemente: no se han copiado las implementaciones ARDF o Karina.
Implementa ciclos de 1-10 emisores, modo sin ciclos (0), sincronizacion de
emisor/fase, aviso de fin de turno y memoria de indice de ganancia por
VFO/emisor con mascara A/B. No controla el chip RF, TX, altavoz, pantalla,
teclado, EEPROM ni calibracion.

Contrato:

- `bh_ardf_init` valida antes de cambiar estado. Reconfigurar borra los
  historiales de ganancia. Una configuracion rechazada conserva el estado.
- El reloj de entrada es monotono `uint32_t` en milisegundos; se permite
  un rollover entre llamadas, no saltos hacia atras ni intervalos de
  2^32 ms o mas. El adaptador debe convertir la base de ticks de la radio.
- `correction_ppm` entre -50000 y 50000 modifica el avance del reloj;
  positivo lo acelera. No es el valor `ClkCor` de otro firmware ni un
  ajuste del oscilador RF. Se conservan fracciones entre actualizaciones.
- Duracion de 1000 a 999990 ms, aviso de 0 a 30000 ms sin superar el
  turno. Son limites de esta implementacion, no equivalencia binaria.
- `max_gain_index` debe proceder de una tabla RF validada para el
  hardware; el nucleo no supone que un indice represente 5 dB.
- La lectura de ganancia devuelve `available=false` si no existe historial;
  en ese caso no cambia el indice de salida. El llamador debe comprobar
  el resultado, no convertirlo en un ajuste RF por defecto.
- Las funciones devuelven errores explicitos; el adaptador futuro debe
  notificarlos. No llamar concurrentemente desde interrupciones y UI.
- `BRICOHAMS_ENABLE_ARDF=OFF` excluye la biblioteca completa al compilar.
  Es seleccion de compilacion, no descarga dinamica de un modulo.

Pruebas nativas (compilador C, CMake y generador disponibles en PATH):

```powershell
cmake -S .\firmware -B .\firmware-builds\core-tests -G Ninja -DBUILD_TESTING=ON
cmake --build .\firmware-builds\core-tests
ctest --test-dir .\firmware-builds\core-tests --output-on-failure
```

El workflow `firmware-modules.yml` ejecuta las pruebas C y comprueba tambien
la configuracion sin ARDF. Son pruebas del nucleo, no validacion de radio.
La compilacion ARM permite comprobar compatibilidad de instrucciones y
dependencias, pero no sustituye ejecutar los tests.

**Integracion Beta disponible:** `--module ardf` incluye el nucleo y un
adaptador en Fox Hunt residente. El builder valida todos los puntos de
integracion contra su checkout fijado antes de escribir los cambios. Exige
Fox Hunt ON, overlay apps OFF y Beacon OFF; no modifica las fuentes originales.
El reloj procede del SysTick real de 10 ms, no de contar iteraciones del bucle.
Usa exclusivamente la tabla de atenuacion existente de Fox Hunt; los indices
se guardan en RAM y se recuperan manualmente, no al cambiar automaticamente
de emisor. No escribe configuracion nueva ni calibracion.

Construccion:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\USER\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\ardf-beta' `
  --preset FieldOps `
  --option ENABLE_FEAT_F4HWN_BEACON=OFF `
  --option ENABLE_VOX=OFF `
  --module ardf
```

Sin `--module`, el builder no aplica adaptadores ni incluye nucleos propios.
`--module karina` y otros nombres no implementados se rechazan explicitamente.
El manifiesto incluye los hashes de los archivos aplicados y las licencias
propias GPL-3.0-or-later junto a LICENSE/NOTICE Apache-2.0 del upstream.
`sourceChangesIncluded: false` significa que no se incorporan cambios locales
no confirmados del repositorio de referencia; los cambios del modulo si
aparecen bajo `modules` y `moduleSources`.

En Fox Hunt, con el teclado desbloqueado:

| Tecla | Modulo ARDF |
| --- | --- |
| 4 | Numero de emisores: OFF, 1...10, OFF. Reinicia sincronizacion e historial |
| 5 | Duracion: 15...120 s, pasos de 15 s; inicial 60 s. Reinicia sincronizacion |
| 6 | Seleccionar el numero del emisor que se sincronizara |
| 7 | Sincronizar el comienzo del emisor seleccionado con el evento real |
| 8 | Guardar la atenuacion actual y registrar una observacion manual del emisor en curso |
| 9 | Recuperar manualmente la atenuacion guardada del emisor actual, si existe |
| EXIT | Salir de Fox Hunt, conservando el comportamiento upstream |

La linea de contexto muestra numero/duracion/seleccion antes de sincronizar,
y emisor/cuenta atras despues. `!` indica los ultimos 5 segundos: no se
introduce un pitido nuevo. `ARDF ERROR` notifica un error del nucleo; cambiar
numero/duracion lo reinicializa. F no invierte las acciones nuevas 4-9.
El bloqueo de teclado existente sigue impidiendo esas teclas. Cada entrada
al modo comienza en OFF; no hay restauracion persistente ni memoria de dos
VFO en este primer adaptador (el nucleo si permite dos bancos).

Compilacion estructural del 25-10-2026:
112672 bytes de imagen, RAM 12448/16384, Flash enlazada 111784/120832,
stub Multiboot 888 bytes con 83 ramas comprobadas. Son medidas de esta
combinacion, no una reserva garantizada para cualquier conjunto de modulos.
Los tests del adaptador usan llamadas de radio simuladas; se comprueban
teclas, sincronizacion, display, errores y guardado/recuperacion manual.
**No se ha instalado ni validado en hardware.** Fuera de Fox Hunt, el
firmware conserva las posibilidades TX del upstream; Beacon/VOX OFF no
equivale a bloquear toda TX. No usarlo como firmware ARDF certificado.

**Pendiente:** validacion fisica de pantalla, tiempos y atenuacion, opciones
de persistencia/VFO, ajustes de competicion y recepcion. El analizador propio,
captura RX y multipreset se integran en la imagen separada `spectrum`,
no en ARDF. Las funciones descritas no acreditan paridad completa con Karina.

### Estadisticas ARDF por baliza implementadas

La imagen `ARDF-Stats-final-20261025` incluye bootlogo y observaciones
manuales por baliza: 113960 bytes RAW, RAM 12576/16384 y Flash
113072/120832. No es deteccion automatica ni estimacion de posicion.

En ARDF sincronizado, cada pulsacion procesada de 8 guarda la atenuacion
como antes y registra una observacion en el emisor del turno actual.
Se actualiza el ciclo antes de atribuirla, para no usar un turno anterior
al cruzar su limite. Cada una de las diez balizas dispone de contador,
primer/ultimo instante relativo de sesion e ultimo indice de atenuacion.
No se muestrean ni almacenan RSSI, rumbo, frecuencia o coordenadas GPS.
El indice 0-5 pertenece a la tabla de seis pasos upstream; no expresa dB.

Los contadores saturan en 65535 sin wrap; un flag avisa si se han intentado
registrar mas observaciones. En ese caso los totales son un minimo, no una
cuenta exacta. Primera/ultima hora e indice siguen actualizandose.
El tiempo es el transcurrido desde entrada/reconfiguracion de ARDF, no
desde sincronizacion de la baliza. Se usa reloj uint32 en milisegundos:
la sesion debe durar menos de 2^32 ms (unos 49.7 dias). No es UTC ni GPS,
y `receivedAt` en el JSON es la hora de recepcion del ordenador.

Entrar de nuevo en ARDF o cambiar numero/duracion de emisores inicia una
sesion nueva y borra las observaciones anteriores. Resincronizar con 7 no
borra los datos si numero/duracion no cambian. Al salir se congela el
tiempo y se conserva la ultima tabla RAM hasta iniciar otra sesion,
reconfigurar o reiniciar/apagar la radio. No se escribe EEPROM/Flash para
estas estadisticas; el comportamiento de guardado de ajustes Fox Hunt
upstream fuera de esta tabla sigue siendo el existente.

En **Quansheng > Operaciones > Estadisticas ARDF Bricohams Beta**,
**Consultar y descargar estadisticas ARDF** obtiene una instantanea y
solicita descargar JSON. No hay sondeo continuo ni subida a servicios.
Se permite consultar una sesion terminada o el estado OFF, pero no una
radio que nunca haya iniciado ARDF desde el arranque. La UI identifica
errores del modulo, saturacion y ausencia de posicion. La descarga debe
confirmarse en el navegador antes de descartar la sesion.

El JSON incluye `connectionSession` del conector y un contador `session`
del firmware, local a ese arranque. No son identificadores globales:
reconexiones o reinicios requieren conservar los archivos originales y no
fusionar sesiones solo por el numero. `observations` contiene un registro
por baliza observada, no un evento por pulsacion ni un recorrido GPS.
Exporta la tabla resumida; no reconstruye las observaciones intermedias.

Protocolo experimental privado little-endian: comando `0x7B20`, respuesta
`0x7B21`. Solicitud de exactamente 4 bytes: version 1, operacion 0 (consulta),
secuencia de 16 bits. Respuesta de 140 bytes, mas cabecera upstream de
4 bytes: cabe en su limite de respuesta de 144 bytes.

| Offset respuesta | Bytes | Contenido |
| --- | ---: | --- |
| 0 | 1 | Version 1 |
| 1 | 1 | Estado: 0 correcto, 2 solicitud invalida, 3 ninguna sesion iniciada |
| 2 | 1 | Flags: activo=1, sincronizado=2, error modulo=4, contador saturado=8 |
| 3 | 1 | Numero de emisores, 0-10 |
| 4 | 2 | Secuencia reflejada; cero para solicitud de longitud invalida |
| 6 | 2 | Reservados cero |
| 8 | 4 | Contador de sesion no nulo, reiniciado al arrancar |
| 12 | 4 | Duracion del turno en ms |
| 16 | 4 | Tiempo transcurrido de sesion en ms |
| 20 | 120 | Diez registros de 12 bytes, balizas 1-10 |

Cada registro contiene contador uint16, indice de ganancia uint8,
valido uint8 (0/1), primer instante uint32 y ultimo instante uint32.
Registros sin observaciones son cero. El conector valida longitud,
version, secuencia, campos reservados, numero de baliza, indice,
orden de tiempos y consistencia antes de entregar datos o exportar.
Las solicitudes invalidas no borran ni cambian la tabla. La ofuscacion
del transporte no es cifrado/autenticacion.

Pruebas C con radio simulada: limites de turno, primer/ultimo tiempo,
contador saturado, reinicios, lectura tras salir, longitudes invalidas
y rollover del reloj. Pruebas JavaScript verifican instantanea y rechazos de
secuencia, baliza, indice, tiempo, campos reservados y falta de sesion.
La integracion USB y visualizacion fisicas siguen pendientes. No se
atribuye una posicion del telefono a una observacion pasada: el futuro
registro GPS debe recoger sus propios tiempos/precision y consentimiento.

### Nuevo nucleo independiente de adquisicion de espectro

`firmware/bricohams/spectrum.c` y `spectrum.h` implementan una maquina de
estados C99 original, sin copiar algoritmos de Karina. Configura entre
1 y 128 puntos, frecuencia inicial y paso en unidades de 10 Hz, asentamiento
de 1-1000 ms y promedio de 1-16 muestras RSSI por punto. Cada punto conserva
nivel medio y maximo retenido; el reinicio de maximos toma los niveles actuales.
`BRICOHAMS_ENABLE_SPECTRUM=OFF` excluye esta biblioteca.

El adaptador debe pedir `bh_spectrum_frequency`, validar la banda real,
sintonizar el receptor y, solo si tuvo exito, llamar `bh_spectrum_tuned`.
Las muestras anteriores al asentamiento devuelven `NOT_SETTLED` y no se
incorporan. Al completar un punto vuelve a exigirse sintonia, incluso con
un solo punto. Al completar un barrido se incrementa `frames`.
Los valores son RSSI crudo **no dBm calibrados**; el adaptador debe garantizar
que un valor mayor represente mas senal.

El reloj tiene el mismo contrato monotono de 32 bits que ARDF; las funciones
no se llaman concurrentemente. El adaptador determina la cadencia y toma
lecturas RF distintas: llamar muchas veces con la misma lectura no crea
muestras independientes. El nucleo no controla AGC/LNA/PGA, no emite TX,
no calcula una FFT y no guarda presets ni calibracion.

Los tests ejecutan limites, cambio de punto, calculo exacto de frecuencia,
promedio, maximos, asentamiento, rollover, 128 puntos con 16 muestras de
RSSI maximo y rechazo atomico de configuracion invalida/desbordamientos.
No es el analizador Karina. El adaptador de la imagen `spectrum` conecta
este nucleo a receptor y pantalla con el alcance Beta descrito arriba;
queda pendiente validacion fisica.

Requisitos en PATH: Node.js 22+, Git, CMake 3.22+, Ninja, ARM GNU Toolchain y
Python 3 para el comprobador de formatos del upstream. No requiere paquetes
Python externos ni instalar dependencias nuevas de npm.

Configuracion usada y probada en Windows:

- Arm GNU Toolchain 13.3.Rel1, GCC 13.3.1.
- CMake 3.31.8.
- Ninja 1.13.1.
- Python 3.13, detectado por CMake.

Desde la raiz de este repositorio, en PowerShell:

```powershell
npm run build:bricohams -- `
  --source 'C:\Users\anatol.lopez\Documents\Multiboot\Fusion61' `
  --output '.\firmware-builds\mi-fusion' `
  --preset Fusion `
  --option ENABLE_VOX=OFF
```

El destino **debe ser nuevo**: no se borra ni sobrescribe una compilacion previa.
Si falla una compilacion, se muestra el error y no se entrega un conjunto de
artefactos marcado como correcto; usa un nuevo destino al repetirla. Las fuentes
y resultados de diagnostico quedan en el destino fallido.

Para Labs, sustituye `--preset Fusion` por `--preset Labs` y usa otro destino.
Tambien se aceptan `FieldOps` y `Transfer`, aunque no se han compilado esos dos
perfiles en esta validacion.

Cada `--option` admite exactamente `ENABLE_XXX=ON` o `ENABLE_XXX=OFF`.
Se pueden repetir argumentos `--option` para funciones diferentes, pero no
repetir el mismo nombre. Las opciones disponibles son las booleanas de los
presets del **commit local fijado**, no las del formulario online v6.3.0.
No se aceptan claves desconocidas, valores arbitrarios, `DEV`, otro hardware ni
versiones inventadas.

Para enumerarlas sin compilar:

```powershell
$p = Get-Content 'C:\Users\USER\Documents\Multiboot\Fusion61\CMakePresets.json' -Raw | ConvertFrom-Json
$p.configurePresets | ForEach-Object { $_.cacheVariables } | Format-List
```

El constructor resuelve la herencia de presets y exige mantener activados:

- `ENABLE_FEAT_F4HWN`
- `ENABLE_UART`
- `ENABLE_USB`
- `ENABLE_FEAT_F4HWN_MULTIBOOT`
- `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY`

Estas condiciones conservan el perfil de gestion de slots; no garantizan que
cualquier combinacion restante sea util o segura. El linker debe aceptar RAM
y Flash, y las comprobaciones del upstream deben pasar. No se reduce el
presupuesto ni se omiten comprobaciones para hacer caber una imagen.

## Fuentes, compilacion y reproducibilidad

El script clona el repositorio **local** en una carpeta separada y extrae el
commit fijado. No modifica la carpeta Fusion61, no aplica su diff sin commit,
no descarga Karina ni cambia la version para burlar el inspector.

Se fijan `SOURCE_DATE_EPOCH` al tiempo del commit, `TZ=UTC` y `LC_ALL=C`.
Con la toolchain indicada, dos compilaciones Fusion en rutas diferentes
produjeron el mismo SHA-256 del `.bin`. Esto verifica reproducibilidad local
del firmware, no identidad byte a byte de ELF, mapas o informes que contienen
rutas absolutas, ni reproducibilidad con otra toolchain.

El constructor:

1. Valida argumentos, commit y opciones antes de crear el destino.
2. Clona las fuentes y configura CMake en Release.
3. Compila con el preset elegido, edicion Bricohams y opciones resueltas.
4. Conserva las comprobaciones de formatos y aislamiento del restaurador RAM.
5. Comprueba longitud, vectores PY32, version y marca de edicion en el binario.
6. Emite artefactos, opciones efectivas, herramientas y hashes.

El directorio `source` conserva el checkout usado. La carpeta `artifacts`
contiene firmware, ELF, mapa, `size.txt`, `build-info.json`, `LICENSE`, `NOTICE`
y `SHA256SUMS`. Todos salvo el propio manifiesto estan incluidos en SHA256SUMS.
El hash detecta alteraciones respecto al manifiesto, **no es una firma digital**.

## Binarios generados el 25-10-2026

Ambos tienen `ENABLE_VOX=OFF`; las demas opciones son las de su preset upstream.

| Perfil | Binario | Bytes RAW | RAM segun linker | Flash segun linker |
| --- | --- | ---: | ---: | ---: |
| Fusion | `bricohams.fusion.v6.1.0.bin` | 106808 | 12160 / 16384 | 105920 / 120832 |
| Labs | `bricohams.labs.v6.1.0.bin` | 114124 | 12544 / 16384 | 113236 / 120832 |

El tamano del RAW incluye la seccion de restauracion RAM y no es identico a la
linea FLASH del informe. Ambos RAW estan por debajo del maximo de 120832 bytes.
La comprobacion de aislamiento informa 888 bytes y 83 saltos revisados.

SHA-256:

```text
65d877114264d8337cdd6e9a5a52dcb85689ac03e02ed0a98b2063bfcc281f23  bricohams.fusion.v6.1.0.bin
7a4cbb4fc6cd8363c776e2982c10b15e92ef779ec1867f49826556514a47bed4  bricohams.labs.v6.1.0.bin
```

Labs conserva `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` y
`ENABLE_FEAT_F4HWN_OVERLAY_APPS`; Fusion no. La capacidad de respaldo fisico
requiere el protocolo compatible de la radio y no se ha probado con hardware.
No se han generado nuevas `.app`: las existentes necesitan ABI/API compatibles.

## Uso en la web y slots

Los artefactos entregados se copian en:

```text
Documents\Multiboot\Bricohams\Fusion
Documents\Multiboot\Bricohams\Labs
```

En **Quansheng > Firmware a medida > Comprobar la compilacion descargada**,
selecciona juntos **todos** los archivos de una carpeta de artefactos. El
verificador exige cada entrada de SHA256SUMS, incluidos mapa, ELF y licencias.
Tras comprobarlos, **Usar este firmware** lo prepara en el panel de slots.

Alternativamente, selecciona `Documents\Multiboot` en la biblioteca local:
los dos `.bin` aparecen como imagenes adicionales preparables. La biblioteca
comprueba estructura y muestra hash, pero no verifica automaticamente el
manifiesto contiguo; para ello usa el formulario de compilacion.

Instalar mantiene respaldo completo, confirmacion y CRC del slot. Usar
**slots 1-4, no Main**. No se han escrito ni borrado datos de la radio.
Fusion y Labs aqui son builds experimentales locales, no versiones oficiales
firmadas ni certificadas en banco. La cadena estable del upstream no cambia
ese estado experimental de la derivacion.

## Validacion pendiente en hardware

Validacion software completada: 149 pruebas, comprobacion de sintaxis y build
Pages correctos. En navegador se verificaron los 7 archivos del manifiesto de
cada edicion, se prepararon ambos firmwares y la instalacion permanecio bloqueada
sin conexion/respaldo. Al seleccionar Multiboot tras la entrega se examinaron
73 imagenes: 11 admitidas estructuralmente y 62 bloqueadas. No hubo errores
JavaScript en esa comprobacion.

Antes de considerarlo apto para uso operativo siguen pendientes identificacion
de la unidad, respaldo original, prueba de arranque y recuperacion, calibracion,
menus, RX y cambio de CFG/slots. No se afirma resuelto el error USB anterior.
No se publican ni flashean automaticamente estos binarios.

## Branding de arranque implementado

El constructor aplica la bienvenida Bricohams a todas las nuevas ediciones,
con o sin adaptador. Conserva los avisos de licencia upstream y no altera
el repositorio de referencia. Los puntos de integracion se validan una sola
vez: una fuente distinta o un parche duplicado detiene la construccion.
El manifiesto registra hashes en `brandingSources`, separados de
`moduleSources`; `sourceChangesIncluded: false` sigue refiriendose a cambios
locales del repositorio upstream, no a la ausencia de estos parches propios.

Con `ENABLE_FEAT_F4HWN_LOGO=ON`, el modo de encendido LOGO y las llamadas
a `UI_DisplayLogo` muestran una adaptacion monocroma de 128x48 del logo
original Bricohams, mas `Bricohams BETA` en la ultima fila. Ocupa 768 bytes
de bitmap en Flash interna. No se lee ni se sobrescribe el logo personalizado
de Flash externa: queda conservado, pero no se muestra en ese modo en estas
imagenes derivadas. Desactivar LOGO al compilar excluye el bitmap por
eliminacion de codigo no utilizado; no se fuerza esa opcion.

Los modos NONE/SOUND siguen sin mostrar bienvenida; no se cambia la
preferencia de encendido almacenada. En los modos de texto se conservan
mensajes personales y voltaje; solo los mensajes vacios predeterminados
se sustituyen por Bricohams/RADIO BETA, y el pie identifica la edicion Beta.
No se afirma que el logotipo aparezca en todos los modos de encendido.

`scripts/generate-bootlogo.ps1` genera `firmware/bricohams/bootlogo.h`
desde el PNG original con System.Drawing en Windows. El builder consume
la cabecera ya generada, sin exigir PowerShell ni esa biblioteca al compilar.
Se conserva la proporcion sobre fondo blanco; el umbral de luminancia 190
convierte los trazos oscuros y naranjas en pixeles activos del LCD monocromo.
El SHA-256 del PNG queda en la cabecera. Esta es una adaptacion especifica
de hardware, no una sustitucion del recurso a color de web/Android.

Imagenes Beta con bootlogo compiladas el 25-10-2026:

| Modulo | Directorio bajo Documents/Multiboot/Bricohams | Bytes RAW | RAM | Flash |
| --- | --- | ---: | ---: | ---: |
| ARDF | `ARDF-Bootlogo-final-20261025/artifacts` | 113452 | 12448/16384 | 112564/120832 |
| Satelites | `Satellite-Bootlogo-final-20261025/artifacts` | 113096 | 12352/16384 | 112208/120832 |
| Espectro/VFO-PRO/CSS | `Spectrum-Bootlogo-final-20261025/artifacts` | 116808 | 13248/16384 | 115920/120832 |

Las mediciones anteriores de otras carpetas corresponden a compilaciones
previas, sin este bitmap. El logo sigue pendiente de comprobar fisicamente
en el LCD; compilar y renderizar el bitmap en un ordenador no valida el
contraste, orientacion o legibilidad en la radio. No se han flasheado.

## Fase posterior solicitada: Bricohams Android

La APK nativa `0.8.1-beta` incorpora libro de guardia con busqueda e importacion ADIF, ADIF/JSON,
restauracion JSON, sesiones ARDF con historial/estadisticas y suma filtrada de segmentos,
GPS puntual, Morse de texto/WAV experimental
y CAT RX temporal por USB CDC ACM y adaptadores reconocidos CH34x/CP210x/FTDI/Prolific.
La [guia Android](ANDROID.md) distingue las funciones disponibles de los
objetivos siguientes. Incluye SSTV Robot36 desde WAV con exportacion PNG
y SGP4 offline con catalogos TLE importados, pases y seguimiento Doppler RX.
Incorpora captura de microfono de hasta 60 s en primer plano para posterior
decodificacion Morse/Robot36. No incluye decodificacion continua, escritura
de canales o subida LoTW. La equivalencia completa con Karina y
la validacion fisica de firmware y telefono siguen pendientes.

### Funciones objetivo

- Control del Quansheng desde Android: leer estado, ajustar frecuencia,
  subtonos y potencia por canal y acceder a las demas opciones que el
  hardware/firmware exponga realmente. Diferenciar ajustes temporales VFO
  de escritura persistente; no reescribir todo el codeplug para cambiar
  un campo si el protocolo permite una operacion mas acotada.
- Seguimiento de satelites al estilo funcional de Look4sat: seleccion de
  satelite, TLE, prediccion de pases, posicion del observador y correccion
  Doppler de frecuencia por CAT durante el pase seleccionado.
- Recepcion/decodificacion SSTV, incluido Robot36; transmision SSTV como
  objetivo por validar con la ruta de audio y PTT disponibles.
- Interpretacion de Morse desde audio, con indicacion de incertidumbre.
- Libro de guardia inspirado funcionalmente en HAMRS: contactos, consulta,
  edicion, exportacion ADIF y objetivo de firma/subida a LoTW.
- Caza del zorro: sesiones, balizas, tiempos, observaciones, recorrido GPS,
  posiciones y estadisticas de busqueda, con exportacion y funcionamiento
  de campo sin conexion para las funciones que no requieran servicios.
- Marca Bricohams en aplicacion, firmware, bootlogos, documentacion y
  artefactos. Migracion final de web y app al naranja corporativo, despues
  de completar y probar las funciones, conforme a la solicitud.

### Supuestos provisionales y limites

Al no disponer de respuesta a las aclaraciones, USB OTG con cable de
programacion es el transporte inicial previsto. Bluetooth requeriria un
adaptador y protocolo verificados; no se presupone Bluetooth en la radio.
Un cable serie de programacion no implica transporte de audio: SSTV y
Morse necesitan una entrada/salida de audio independiente comprobada.
No se presupone que Android pueda mantener USB y esa ruta de audio en
cualquier telefono sin probarlo.

CAT no se considera disponible por el hecho de existir lectura/escritura
de canales. Primero hay que verificar las capacidades reales del firmware
y, si hace falta, disenar un protocolo propio versionado con consulta de
capacidades, validacion por modelo, acuse de recibo, errores y recuperacion
de desconexion. TX, limites de banda y protecciones de respaldo siguen
vigentes. El seguimiento no debe habilitar TX automaticamente ni seguir
ordenando cambios tras perder conexion o detener el pase.

La subida directa a LoTW sigue siendo un objetivo, no una integracion
resuelta. Deben comprobarse el mecanismo de firma aceptado y la gestion
segura del certificado de indicativo en Android. La alternativa inicial
es ADIF para firma con TQSL en ordenador; exportar ADIF no equivale a
subirlo a LoTW. No incluir certificados, claves ni contrasenas en el
repositorio, registros de diagnostico o proyectos exportados.

El termino solicitado "encriptions" queda pendiente de aclaracion: no se
interpreta automaticamente como cifrado de comunicaciones de radioaficionado.
No se anuncia soporte de cifrado ni su legalidad.

GPS proporciona la posicion del telefono, no la de la baliza. Una ubicacion
estimada de emisor requiere observaciones/demoras suficientes y debe mostrar
su incertidumbre; RSSI aislado no permite afirmar una localizacion exacta.
Los recorridos y posiciones son privados por defecto, con permisos explicitos
y sin publicacion automatica.

Las aplicaciones citadas son referencias funcionales, no fuentes disponibles
ni autorizacion para copiar codigo, recursos o marcas. Priorizar fuentes con
licencia compatible y preservar atribuciones; cuando no existan, implementar
de forma independiente a partir de documentacion y comportamiento observable
permitido, sin eludir protecciones. No afirmar paridad sin pruebas.

### Criterios antes de declarar la fase terminada

1. Cerrar la matriz de funciones de cada imagen y validar arranque,
   recuperacion, RX, restauracion de registros y operaciones soportadas
   sobre hardware identificado y con respaldo completo.
2. Aprobar arquitectura Android y matriz telefono/cable/radio/firmware;
   comprobar control CAT, desconexiones y relectura tras cambios de canal.
3. Contrastar pases/Doppler con referencias conocidas, probar SSTV/Morse
   con muestras conocidas y despues con audio real, y validar los registros
   ADIF y la firma/subida LoTW por separado.
4. Probar GPS, permisos denegados, falta de red, sesiones y estadisticas
   de campo sin inventar posicion de balizas.
5. Aplicar y verificar branding Bricohams y bootlogos segun los limites
   de pantalla, conservando licencias y avisos obligatorios. Aplicar al final
   la paleta naranja con contraste accesible, sin confundir estados de
   peligro, exito y advertencia. Entregar APK y artefactos identificados por
   version/hash solo cuando su estado de validacion sea explicito.
