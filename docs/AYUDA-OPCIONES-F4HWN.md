# F4HWN: referencia de todas las opciones del catalogo

Revision: 25-10-2026. Esta tabla cubre **cada clave** del catalogo de la web
v6.3.0, commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Las descripciones indican el proposito de la funcion, no garantizan que una
combinacion arbitraria compile o funcione en tu radio.
Se incluyen tambien las 10 claves adicionales encontradas en los presets
publicados de las 18 versiones historicas, sin presentarlas como opciones de
la interfaz actual.

## Como leer las opciones

- ON/OFF aqui son decisiones de **compilacion**, no necesariamente interruptores
  disponibles en el menu de la radio.
- Una funcion compilada puede necesitar configuracion posterior, recursos,
  hardware, app o herramientas externas.
- OFF suele retirar codigo/interfaz; no borra necesariamente datos antiguos.
- Un nombre ausente no significa OFF: puede no existir o no estar expuesto
  por ese catalogo. La [matriz de presets](F4HWN-PRESETS.md) usa N/D.
- El formulario web usa v6.3.0; el constructor local Bricohams usa v6.1.0
  fijado. No mezclar opciones/defaults sin comparar las dos tablas.
- El presupuesto maximo de imagen PY32 aceptada por slots es 118 KiB
  (120832 bytes). Activar todo no garantiza que quepa en Flash/RAM.
- El upstream avisa que varias opciones no F4HWN desactivadas por defecto no
  reciben soporte salvo documentacion expresa. No se recomiendan activarlas
  solo porque exista una casilla.

## Plataforma y protocolos

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `DEV` | Identidad y tratamiento de compilacion de desarrollo | No es un modulo de usuario; el builder Bricohams exige OFF y el catalogo estable excluye desarrollo |
| `ENABLE_FEAT_F4HWN` | Capa de funciones F4HWN, identidad y menus asociados | Requerida por el perfil Bricohams; no usar OFF para fingir compatibilidad |
| `ENABLE_UART` | Comunicacion por UART y codigo del protocolo asociado | Debe mantenerse para gestion serie compatible; no fija por si sola todos los comandos |
| `ENABLE_USB` | Soporte USB nativo y su transporte en PY32 | Necesita hardware/cable correcto; no agrega USB de datos a una V1 |
| `ENABLE_EXTRA_UART_CMD` | Comandos UART adicionales de la base | Superficie de control extra; solo para herramientas conocidas y version compatible |
| `ENABLE_UART_RW_BK_REGS` | Acceso de lectura/escritura de registros BK por UART | Diagnostico avanzado; puede cambiar funcionamiento RF, no habilitar sin necesidad |
| `ENABLE_SWD` | Disponibilidad de depuracion SWD segun implementacion | No es modo de copia web; revisar efectos de pines y placa |
| `ENABLE_LTO` | Optimizacion de enlace entre unidades de compilacion | Cambia resultado/tamano; verificar compatibilidad de toolchain y comprobaciones del stub |
| `ENABLE_NO_HEAP` | Elimina reserva de heap en el linker de la base | Solo si el programa no necesita asignacion dinamica; no es un acelerador general |
| `ENABLE_FEAT_F4HWN_DEBUG` | Instrumentacion de diagnostico F4HWN | Puede consumir memoria/cambiar tiempos; no necesaria para uso normal |
| `ENABLE_AGC_SHOW_DATA` | Visualizacion de datos de control automatico de ganancia | Herramienta de diagnostico; no calibracion automatica |
| `ENABLE_BYP_RAW_DEMODULATORS` | Rutas de demodulacion RAW de la base | Opcion avanzada/no soportada por algunos presets; consultar implementacion, no asumir mejor recepcion |
| `ENABLE_FEAT_F4HWN_EXT_FLASH_RW` | Comandos de acceso fisico a Flash externa | Necesaria para el respaldo completo de esta web en Labs compatible; no confundir con lectura de calibracion |

## Multiboot, CFG y overlays

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_FEAT_F4HWN_MULTIBOOT` | Gestor de imagenes externas y bancos asociados | No da soporte V1 ni hace compatible cualquier `.bin` |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_HOT_CFG` | Cambio de banco CFG en ejecucion | Cambia ajustes/canales, no restaura otro firmware; exige datos compatibles |
| `ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY` | Workspace/ejecucion RAM usados por multiboot y overlays | Mantener comprobacion de aislamiento; no desactivar en perfil Bricohams |
| `ENABLE_FEAT_F4HWN_OVERLAY_APPS` | Cargador y menu de apps externas | Requiere overlay RAM y apps ABI/API/caps compatibles; experimental |
| `ENABLE_FEAT_F4HWN_OVERLAY_BEAM` | Servicio Beam disponible para apps overlay | Depende del cargador de apps; no implica incluir una app concreta |
| `ENABLE_FEAT_F4HWN_OVERLAY_INFO` | Informacion del sistema mediante overlay/servicio asociado | Depende de apps; afecta codigo de diagnostico/uso de pila segun fuente |

El CMake inspeccionado rechaza APPS sin MULTIBOOT_OVERLAY y BEAM/INFO overlay
sin APPS. Son dependencias verificadas, no una lista exhaustiva de todas las
interacciones posibles. No edites un binario para aparentar que otra API existe.

## Recepcion, audio y espectro

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_FMRADIO` | Recepcion de radiodifusion FM usando el hardware soportado | No es el modo FM de un canal VHF/UHF |
| `ENABLE_NOAA` | Funciones de recepcion meteorologica NOAA | Disponibilidad geografica; no red meteorologica universal |
| `ENABLE_WIDE_RX` | Rangos de recepcion ampliados soportados por el codigo | Sensibilidad/filtros varian por banda; no habilita TX legal fuera de banda |
| `ENABLE_SPECTRUM` | Analizador de espectro de la base | No asumir simultaneidad con otras funciones ni prestaciones de analizador de laboratorio |
| `ENABLE_FEAT_F4HWN_SPECTRUM` | Mejoras F4HWN del analizador | Interactua con SPECTRUM y parametros persistidos segun build |
| `ENABLE_SQUELCH_MORE_SENSITIVE` | Criterios de squelch mas sensibles | Puede aumentar aperturas por ruido; ajustar SQL y probar |
| `ENABLE_FEAT_F4HWN_NARROWER` | Variante de filtro FM mas estrecha y menu asociado | Coincidir con el ancho del sistema; no cambia raster VFO |
| `ENABLE_FEAT_F4HWN_VOL` | Ajuste por software de audio RX | Distinto de la perilla y de ganancia RF |
| `ENABLE_FEAT_F4HWN_AUDIO` | Perfiles/procesamiento de audio RX F4HWN | Elegir despues el perfil de audio; no corrige frecuencia mal sintonizada |
| `ENABLE_FEAT_F4HWN_AUDIO_SCOPE` | Visualizacion de audio en RX/TX | No mide potencia RF ni calidad de modulacion de banco |
| `ENABLE_AUDIO_BAR` | Barra de nivel de audio | Indicador visual, no garantiza ausencia de distorsion |
| `ENABLE_RSSI_BAR` | Barra de intensidad de señal | RSSI no garantiza audio decodificable |
| `ENABLE_FEAT_F4HWN_FULL_WATCH` | Ciclo ampliado de escucha A/B y prioridades | Revisar RxMode y destino de respuesta TX; no cuatro receptores paralelos |

## Escaneo, memorias y registro

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_FASTER_CHANNEL_SCAN` | Mejoras de velocidad del escaneo de canales de la base | Diferente del modo rapido adicional F4HWN |
| `ENABLE_FEAT_F4HWN_SCAN_FASTER` | Modos rapidos de escaneo F4HWN | Puede perder señales cortas o reconocimiento de tonos |
| `ENABLE_FEAT_F4HWN_SCAN_PROGRESS` | Indicacion de progreso de escaneo | No altera por si sola la lista o rango |
| `ENABLE_FEAT_F4HWN_SCAN_RSSI` | Informacion RSSI durante escaneo | Interpretar junto a ruido/atenuacion, no como distancia |
| `ENABLE_FEAT_F4HWN_SCAN_SUBAUDIBLE` | Informacion de subtonos/codigos detectados durante escaneo | Confirmar tono antes de programarlo para TX |
| `ENABLE_SCAN_RANGES` | Escaneo dentro de rangos configurados | Configurar limites y paso correctos |
| `ENABLE_NO_CODE_SCAN_TIMEOUT` | Modifica el timeout de busqueda de codigos/subtonos de la base | No es el TOT TX; revisar consumo y salida del modo |
| `ENABLE_COPY_CHAN_TO_VFO` | Copiar parametros de memoria al VFO | Copia temporal; no sustituye guardar la memoria |
| `ENABLE_KEEP_MEM_NAME` | Conservacion de nombres de memoria en operaciones admitidas | Revisar destino al sobrescribir canales |
| `ENABLE_FEAT_F4HWN_MEM` | Pagina SysInf de uso de Flash y SRAM | Es informacion de memoria del programa, no expansion de canales ni EEPROM |
| `ENABLE_FEAT_F4HWN_RESUME_STATE` | Recuperar estado operativo al encender | Puede reanudar escaneo/espectro; revisar antes de pruebas |
| `ENABLE_FEAT_F4HWN_RESET_VFO` | Accion de reinicio de parametros VFO | No equivale a restaurar calibracion ni todos los datos |
| `ENABLE_FEAT_F4HWN_RXTX_LOG` | Registro de actividad RX/TX en Flash externa | Privacidad, consumo de almacenamiento y compatibilidad del formato |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_WRAP` | Reutilizacion circular del registro al llenarse | Puede sustituir entradas antiguas; exportar si necesitas conservarlas |
| `ENABLE_FEAT_F4HWN_RXTX_LOG_K5VIEWER` | Acceso/presentacion de RF Log por herramientas K5Viewer | Requiere version y protocolo de herramienta compatibles |

## Interfaz, pantalla y energia

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_BIG_FREQ` | Presentacion grande de frecuencia | Reduce espacio disponible para otros datos segun layout |
| `ENABLE_SMALL_BOLD` | Fuente pequeña en negrita | Cambia legibilidad, no parametros de canal |
| `ENABLE_CUSTOM_MENU_LAYOUT` | Orden/disposicion personalizada de menus | Los numeros de menu dejan de ser referencia estable entre builds |
| `ENABLE_BOOT_BEEPS` | Sonidos de encendido | Revisar volumen y auriculares |
| `ENABLE_VOICE` | Avisos de voz disponibles en la base | No asumir idioma ni cobertura total de menus |
| `ENABLE_SHOW_CHARGE_LEVEL` | Presentacion de nivel de carga | Estimacion; no prueba de capacidad ni estado de cargador |
| `ENABLE_REVERSE_BAT_SYMBOL` | Variante de orientacion/presentacion del simbolo de bateria | Solo visual |
| `ENABLE_PWRON_PASSWORD` | Control de acceso al encender | Riesgo de quedar bloqueado; no cifra memoria ni sustituye seguridad fisica |
| `ENABLE_FEAT_F4HWN_CTR` | Control de contraste | Ajustar SetCtr para pantalla concreta |
| `ENABLE_FEAT_F4HWN_INV` | Inversion de pantalla | Ajuste visual |
| `ENABLE_FEAT_F4HWN_RX_TX_TIMER` | Contadores visibles RX/TX | No limite de transmision; el limite lo configura TOT |
| `ENABLE_FEAT_F4HWN_SLEEP` | Deep sleep/apagado por inactividad segun firmware | Revisar SetOff antes de sesiones prolongadas |
| `ENABLE_FEAT_F4HWN_CHARGING_C` | Tratamiento/indicacion de carga USB-C segun placa y firmware | No cambia electronica de carga ni hace segura una bateria dañada |
| `ENABLE_FEAT_F4HWN_LOGO` | Logo/interfaz de inicio F4HWN | No demuestra procedencia de imagen |
| `ENABLE_FEAT_F4HWN_LOGO_SAV` | Logo/presentacion en ahorro de pantalla | Puede condicionar menu SetSav |
| `ENABLE_FEAT_F4HWN_MENU_CAT` | Agrupacion de menus por categorias | Ubicaciones cambian respecto a lista clasica |
| `ENABLE_FEAT_F4HWN_ACTION_PICKER` | Selector de acciones/atajos | Revisar asignaciones cortas/largas para evitar TX accidental |
| `ENABLE_FEAT_F4HWN_QRCODE` | Codigos QR de informacion/enlaces | Abrir enlaces no es parte del respaldo ni certifica archivo |
| `ENABLE_FEAT_F4HWN_K5VIEWER` | Pantalla/control compatible con visor externo | Esta web no implementa todas las funciones del visor |
| `ENABLE_FEAT_F4HWN_GAME` | Juego incorporado en el perfil que lo admita | Ocupa Flash/RAM; distinto de apps de juegos Labs |
| `ENABLE_FLASHLIGHT` | Funcion de linterna/LED del hardware | No modifica radio ni es señal de modo bootloader universal |

## TX, transferencia y perfiles regionales

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_VOX` | Transmision activada por voz/audio | Configurar sensibilidad despues; OFF en las dos builds Bricohams entregadas |
| `ENABLE_TX1750` | Generacion de tono de acceso 1750 Hz | Solo cuando el sistema lo requiera y con permiso |
| `ENABLE_DTMF_CALLING` | Logica de llamadas/identificacion DTMF | No equivale a DMR; configurar IDs y tiempos con el interlocutor |
| `ENABLE_CTCSS_TAIL_PHASE_SHIFT` | Tratamiento de fin de tono CTCSS por fase | Solo si el receptor/repetidor lo usa; no cifrado |
| `ENABLE_REDUCE_LOW_MID_TX_POWER` | Cambia objetivos de potencia baja/media de la base | Verificar con instrumentos; no usar como calibracion universal |
| `ENABLE_AIRCOPY` | Funcion de transferencia AirCopy | Requiere compatibilidad de ambos extremos; no copia MCU completa de esta web |
| `ENABLE_AIRCOPY_UART` | Variante de transferencia por UART | Cable/protocolo y firmware deben coincidir |
| `ENABLE_AIRCOPY_FLASH` | Funciones AirCopy relacionadas con Flash | Operacion avanzada con datos; no asumir restauracion segura entre revisiones |
| `ENABLE_FEAT_F4HWN_PMR` | Perfil/restricciones relacionadas con PMR | No homologa antena, potencia ni equipo para servicio exento |
| `ENABLE_FEAT_F4HWN_GMRS_FRS_MURS` | Perfiles regionales de bandas/servicios de EE.UU. | Requisitos legales dependen del servicio y equipo; no aplicables universalmente |
| `ENABLE_FEAT_F4HWN_CA` | Perfil de limites de bandas canadienses de la base | No confundir con Carrier Aggregation ni receptor adicional |
| `ENABLE_FEAT_F4HWN_RESCUE_OPS` | Perfil de interfaz/operacion RescueOps | No autoriza frecuencias profesionales ni convierte el equipo en dispositivo de seguridad certificado |
| `ENABLE_FEAT_F4HWN_FOXHUNT` | Herramienta RX de busqueda de señal con atenuacion/historial | No igual al firmware ARDF temporizado ni a un localizador GPS |
| `ENABLE_FEAT_F4HWN_BEACON` | Baliza Morse incorporada | Puede emitir automaticamente; mantener desactivada hasta configuracion legal y controlada |
| `ENABLE_FEAT_F4HWN_BEAM` | Transferencia Beam de parametros de canal/VFO mediante paquetes de la base | El payload inspeccionado incluye frecuencia, offset, tonos, modo y nombre. Requiere extremos/protocolo compatibles; no es antena directiva ni APRS |
| `ENABLE_F_CAL_MENU` | Menu de calibracion de referencia RF | Requiere instrumental y procedimiento; no activar para resolver USB |

## Otros parametros, no casillas booleanas

### Opciones historicas o no expuestas por el formulario actual

Su existencia se comprueba en los presets por commit, no implica soporte actual.
Para funciones antiguas no verificadas en hardware se conserva el proposito
del codigo sin dar secuencias operativas especulativas.

| Opcion | Explicacion | Precaucion/configuracion posterior |
| --- | --- | --- |
| `ENABLE_ALARM` | Funcion de alarma de la base historica | Puede generar audio o TX segun implementacion; no habilitar para probar un puerto ni usar como sistema de socorro |
| `ENABLE_AM_FIX` | Correcciones de ganancia/recepcion AM de ramas historicas | No transforma TX en AM ni mejora todas las condiciones RF |
| `ENABLE_AM_FIX_SHOW_DATA` | Diagnostico visible de la correccion AM | Requiere la funcion correspondiente; no calibracion automatica |
| `ENABLE_BLMIN_TMP_OFF` | Tratamiento temporal de retroiluminacion minima en ramas que lo incluyen | Revisar logica de teclas/ahorro de esa version; no afecta sensibilidad |
| `ENABLE_FEAT_F4HWN_OVERLAY_TRIVFO` | Servicio TriVFO del sistema overlay en presets que lo declaran | No expuesto por catalogo web; no asumir tres receptores fisicos ni compatibilidad de apps de otra release |
| `ENABLE_FEAT_F4HWN_RESET_CHANNEL` | Accion de reinicio de canal de ramas anteriores | No equivalente garantizado a RESET_VFO; revisar alcance antes de perder ajustes |
| `ENABLE_FEAT_F4HWN_SCREENSHOT` | Codigo de captura de pantalla de versiones anteriores | Puede usar un protocolo/herramienta diferente de K5Viewer actual |
| `ENABLE_NAVIG_LEFT_RIGHT` | Seleccion de disposicion de navegacion en presets historicos | No copiarla a versiones con SetNav sin revisar migracion |
| `ENABLE_REGA` | Señalizacion historica de prueba/alarma para la red de emergencia REGA mediante tonos ZVEI | Puede activar TX automaticamente. No probar en frecuencias de emergencia ni asignar a teclas por rutina; requiere autorizacion y procedimiento del servicio |
| `ENABLE_TX_WHEN_AM` | Permite una ruta de TX mientras esta seleccionado modo de recepcion AM en la base historica | No garantiza modulacion AM de salida ni autorizacion legal; no habilitar para intentar TX aeronautico u otros servicios |

### Parametros de identidad y herramientas

| Parametro CMake | Que significa | Como se trata aqui |
| --- | --- | --- |
| `CMAKE_BUILD_TYPE` | Nivel de configuracion de compilacion | Builder local Release |
| `TARGET` | Nombre del ejecutable/artefacto | Builder local bricohams; no destino de hardware automaticamente |
| `EDITION_STRING` | Identidad mostrada de edicion | Bricohams en builder local, conservando identidad de protocolo upstream |
| `VERSION_STRING_1/2` | Versiones de componentes mostradas | No cambiarlas para eludir validacion |
| `AUTHOR_STRING`, `AUTHOR_STRING_1/2` | Atribucion e identidad del upstream | Conservar avisos y compatibilidad; no declarar autoria ajena |
| `SQL_TONE` | Parametro de la base usado en configuraciones especificas | No expuesto por --option; no cambiar por receta SA818 en una radio normal |
| `SOURCE_DATE_EPOCH` | Tiempo reproducible de compilacion | Se fija al commit en builder local, no ajusta reloj de la radio |

No se permiten estos valores arbitrarios en el constructor local por medio de
`--option`. La lista booleanas/defaults y el significado de «ausente» se
encuentran en [la matriz generada](F4HWN-PRESETS.md).

## Verificacion de una combinacion

1. Elegir version y preset como unidad, no copiar flags de otro commit.
2. Modificar solo lo necesario y registrar la peticion.
3. Compilar y atender errores de dependencias, RAM, Flash y aislamiento RAM.
4. Comprobar binario, metadatos, mapa y SHA256SUMS.
5. Preparar slot sin escribir; verificar que el inspector lo acepta.
6. Prueba fisica controlada con respaldo original y recuperacion conocida.

Una compilacion correcta no prueba RF, ausencia de bugs ni compatibilidad de
datos con todos los firmwares del historial.

## Fuentes

- [Presets del catalogo v6.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [CMake de funciones v6.1 inspeccionado](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/CMakeLists.txt).
- [Informacion de memoria en SysInf](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [Payload Beam inspeccionado](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/app/beam.c).
- [Modulo historico REGA, referencia de proposito](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/e21d47260915174f358f1033564844148d5c6590/App/app/rega.c).
- [README y manuales del upstream](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- Catalogo versionado `f4hwn-options.js` y constructor `scripts/build-bricohams.cjs`
  de este repositorio.
