# Quansheng: F4HWN, versiones y configuracion

Revision: 25-10-2026. Base funcional inspeccionada: Fusion61, commit
`f556a96e73c3e423a00cf473aeb37f827cac05a5`; catalogo modular web v6.3.0,
commit `ca3a4271386049e7b459b215cef0ad0eea1a30ca`.
Esta guia no atribuye automaticamente las funciones v6.1/v6.3 a v4 o v5.

## Beta: prueba USB real y canales

Prueba de solo lectura realizada el 25-10-2026 en COM4 (USB CDC
VID 36B7 / PID FFFF), modelo declarado por el propietario **UV-K5 V3**.
La radio identifica **F4HWN v6.0.0**; no se deduce automaticamente la placa.

- Identificacion, calibracion de 512 bytes y configuracion logica de 41344 bytes:
  correctas. Dos lecturas independientes coinciden byte a byte y por SHA-256.
- Se reconocen 200 canales existentes. Las memorias con frecuencia borrada
  (`0`/`0xFFFFFFFF`) no se muestran aunque conserven atributos residuales,
  siguiendo la comprobacion del firmware.
- Consulta de slots: Main/Fusion, FieldOps, Labs, Doppler y Ardf, todos v6.0.0.
  Esto lee cabeceras; no equivale a verificar CRC de cada imagen.
- El comando de Flash fisica `0x0738` no responde en este firmware. Antes se
  intentaba durante el respaldo automatico y el timeout invalidaba la conexion.
  Ahora v6.0 guarda una copia **parcial** (calibracion/configuracion), mantiene la
  conexion de lectura y explica el bloqueo de escritura, sin intentar ese comando.
- No se han escrito ni borrado canales fisicos, firmware, slots o calibracion.
  No se han hecho pruebas RF ni pruebas de hardware OpenGD77.

### Preparar y enviar memorias FM

1. Seleccionar UV-K5 V3 o UV-K1 segun el equipo. Conectar normalmente o activar
   [Modo PRO](AYUDA-CONFIGURACION.md) antes de conectar.
2. Pulsar **Leer canales del banco activo**. En v6.0 se muestran automaticamente
   desde la copia parcial. Para trabajar sin radio, abrir una configuracion
   logica F4HWN v6 de exactamente 41344 bytes, no un firmware ni Flash completa.
3. Preparar **PMR446 analogicos 1-16 (solo RX)**, repetidores FM o memorias SAT/Doppler
   desde el planificador. Seleccionar una memoria FM existente como plantilla
   y pulsar **Anadir canales al archivo local abierto**.
4. Las nuevas memorias tienen TXLock activo, tonos y DTMF desactivados y Reverse
   desactivado. PMR se prepara estrecho. Solo se importan RX/TX nominales entre
   136-174 o 400-470 MHz; esto no autoriza transmitir. Nombres: primeros 10
   caracteres ASCII. Se omiten duplicados por nombre truncado/frecuencias/modo.
5. **Borrar del archivo** elimina una memoria de la copia local, sin resetear
   bancos CFG ni tocar slots. Guardar el binario editado aparte del original.
6. **Escribir y releer canales (Beta)** solo se habilita con respaldo completo
   de esta sesion, mediante Labs v6.1+ con lectura Flash y CRC. Verifica que la
   radio siga igual que al leerla, escribe bloques de 8 bytes y relee todo.
   Durante la escritura las memorias afectadas se marcan temporalmente vacias;
   se reactivan despues de sus datos/nombres. No es una transaccion resistente
   a apagones. VFO, ajustes, calibracion y bancos distintos estan protegidos.
7. Tras exito, reiniciar manualmente la radio para recargar caches. Si falla,
   conservar respaldo y mensaje exacto; no asumir exito por recibir un ACK.

El envio se ha verificado con transporte simulado, **no en hardware**:
la unidad v6.0 conectada no permite el respaldo completo requerido. No se
actualiza ni flashea esa unidad como efecto secundario. La tabla orbital SAT
nativa y el seguimiento continuo no se implementan; SAT/Doppler son memorias FM.

## Elegir hardware antes de firmware

| Radio/revision | Relacion con esta web | Regla |
| --- | --- | --- |
| UV-K1 / UV-K1(8) PY32 | Destino UV-K1 del catalogo/conector | Verificar placa e identificacion; no imagen V1 |
| UV-K5 V3 PY32 | Destino UV-K5-V3 | Compartir familia no permite ignorar revision real |
| UV-K5(8), UV-K6, UV-K5+ V1 | Karina V1/OneOfEleven u otros proyectos V1 | Fuera del conector de slots PY32 |
| UV-K5 V2 | Hardware diferente | Ni V1 ni V3 por parecido exterior |
| UV-K5(99) y etiquetas comerciales | El nombre puede abarcar revisiones diferentes | Identificar MCU/revision con fuente del proyecto |
| TK-11 y Baofeng de aspecto parecido | No son destinos del conector | No usar estas imagenes |

El manual ARDF advierte incluso de etiquetas V3 en hardware V2. La pegatina
ayuda pero no es prueba unica. USB-C no garantiza que cualquier firmware hable
el mismo protocolo ni que el puerto sirva para programacion en todas las revisiones.

## Matriz de versiones y formatos

| Rama | Catalogo | Ediciones/variantes | Escritura desde esta web |
| --- | --- | --- | --- |
| F4HWN v4.x | Estables reconocidas con archivo especifico `k1` o `k5v3` | Fusion, posibles SA818 segun publicacion | Solo descarga |
| F4HWN v5.x | Estables reconocidas y hash publicado | Fusion, posibles SA818 | Solo descarga |
| F4HWN v6.x | Estables reconocidas y hash publicado | Fusion, FieldOps, Transfer, Labs segun publicacion | Solo imagenes no SA818, inspeccionadas y con respaldo completo |
| Desarrollo/beta/rolling | Excluidas del catalogo estable | No se equiparan a release | Biblioteca bloquea nombres conocidos de esas variantes |
| ARDF V3/UV-K1 | Fuente reald separada | Versiones ARDF-K5v3_K1 | Solo descarga; ver [ARDF](AYUDA-ARDF.md) |
| Stock | No se selecciona como F4HWN | Imagen del fabricante | No se instala en slots mediante este inspector |
| Karina V1 | Documentacion del paquete | RAW y packed V1 | Bloqueado por incompatibilidad PY32 |
| Karina V3/K1 de Dim0s | ZIP inspeccionado separado, con vectores PY32 | RAW y packed por hardware | No se habilita: multiboot Armel y fuentes no verificados |
| Bricohams V3 | Constructor local v6.1.0 | Fusion y Labs generadas | Preparacion en slots, mismas barreras, experimental |

Los nombres historicos Bandscope, Broadcast, Basic, RescueOps o Game que aparecen
en documentos antiguos no son equivalentes uno-a-uno a los presets v6.
No conviertas sus ajustes por posicion de menu. Para el inventario exacto de
opciones y defaults usa [opciones](AYUDA-OPCIONES-F4HWN.md) y
[presets por commit](F4HWN-PRESETS.md).

El selector consulta publicaciones autorizadas, descarta prereleases/drafts,
comprueba nombre, version, tamano y digest SHA-256 publicado por GitHub.
No muestra un catalogo parcial como si estuviera completo ante errores.
La version instalada debe leerse en SysInf, no deducirse del ultimo archivo
descargado. Una actualizacion puede cambiar persistencia y compatibilidad CFG.

### Inventario de publicaciones reconocido el 25-10-2026

Consulta en vivo realizada para UV-K5-V3: 41 imagenes reconocidas, no un listado
de todos los archivos de los repositorios. Para UV-K1 las v4 deben ser las
imagenes especificas de K1. Cada enlace contiene las notas de esa version;
esta tabla no inventa diferencias funcionales no comprobadas entre parches.

| Version | Ediciones reconocidas | Tratamiento |
| --- | --- | --- |
| [v6.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.3.0) | Fusion, FieldOps, Labs, Transfer | Preparables tras comprobaciones y respaldo |
| [v6.2.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.2.0) | Fusion, FieldOps, Labs, Transfer | Igual; revisar cambios de datos/API |
| [v6.1.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.1.0) | Fusion, FieldOps, Labs, Transfer | Base local Bricohams, no misma identidad de edicion |
| [v6.0.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v6.0.0) | Fusion, FieldOps, Labs, Transfer | No asumir lector fisico Labs v6.1+ |
| [v5.9.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.9.0) | Fusion y SA818 | Solo descarga |
| [v5.8.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.8.0) | Fusion y SA818 | Solo descarga |
| [v5.7.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.7.0) | Fusion y SA818 | Solo descarga |
| [v5.6.1](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.6.1) | Fusion y SA818 | Solo descarga |
| [v5.6.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.6.0) | Fusion y SA818 | Solo descarga |
| [v5.5.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.5.0) | Fusion y SA818 | Solo descarga |
| [v5.4.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.4.0) | Fusion y SA818 | Solo descarga |
| [v5.3.1](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.3.1) | Fusion | Solo descarga |
| [v5.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.3.0) | Fusion | Solo descarga |
| [v5.2.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.2.0) | Fusion | Solo descarga |
| [v5.1.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v5.1.0) | Fusion | Solo descarga |
| [v4.3.2](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v4.3.2) | Fusion por hardware | Solo descarga |
| [v4.3.1](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v4.3.1) | Fusion por hardware | Solo descarga |
| [v4.3.0](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases/tag/v4.3.0) | Fusion por hardware | Solo descarga |
| [ARDF v0.5.1](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases/tag/ARDF-K5v3_K1-v0.5.1) | ARDF | Solo descarga |
| [ARDF v0.5](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases/tag/ARDF-K5v3_K1-v0.5) | ARDF | Solo descarga |
| [ARDF v0.4](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases/tag/ARDF-K5v3_K1-v0.4) | ARDF | Solo descarga |
| [ARDF v0.2](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases/tag/ARDF-K5v3_K1-v0.2) | ARDF | Solo descarga |

## Que edicion elegir

| Edicion | Enfoque del perfil v6 | Precaucion |
| --- | --- | --- |
| Fusion | Uso general, espectro, escaneo, multiboot/CFG segun preset | No contiene por ello el lector fisico completo de Labs |
| FieldOps | Funciones de campo, Fox Hunt/Beacon y RescueOps segun preset | Revisar funciones TX; no es homologacion de emergencias |
| Transfer | Enfasis de transferencia/AirCopy segun preset | Requiere extremo/protocolo compatible, no sustituye copia completa |
| Labs | Apps overlay, diagnostico y lectura/escritura externa cuando habilitada | Experimental; ABI/API y comandos cambian |
| Max | Perfil disponible en catalogo de opciones v6.3.0 | No asumir que existe binario de release ni que cabe con cualquier cambio |
| Custom | Perfil reducido configurable | No tiene garantizado multiboot; el builder local aqui no lo acepta |
| Bricohams | Identidad de edicion propia sobre perfiles v6.1.0 fijados | No es Karina ni firmware oficial firmado |

Los valores exactos ON/OFF son mas fiables que el nombre comercial del perfil.
Por ejemplo, Labs requiere las opciones concretas de Flash fisica para el
respaldo que exige esta web.

## Diccionario de menus de radio

Los siguientes nombres proceden de `MenuList` del codigo v6.1 inspeccionado.
Un menu condicionado puede no existir en tu compilacion. Se usa el nombre,
no un numero fijo que cambia al incluir/excluir funciones.
«Guardar canal» significa persistir la memoria; no todas las modificaciones
temporales en MR se guardan automaticamente.

### Canal, recepcion y tonos

| Menu | Explicacion y comprobacion |
| --- | --- |
| Step | Paso del VFO; no ancho del filtro. Elegir el raster del servicio escuchado |
| Power | Nivel RF por canal/VFO. Los valores nominales no garantizan potencia medida |
| RxDCS / RxCTCS | Filtro subaudible de recepcion. Desactivar al diagnosticar silencio |
| TxDCS / TxCTCS | Codigo/tono transmitido. Solo el exigido por el sistema |
| TxODir | Direccion del desplazamiento TX: OFF, + o - en la base inspeccionada |
| TxOffs | Magnitud de desplazamiento. Revisar frecuencia TX resultante |
| W/N | Canal FM ancho/estrecho; SetNFM puede elegir variante estrecha |
| BusyCL | Impide TX cuando el criterio de canal ocupado lo detecta |
| Compnd | Compander de audio; exige compatibilidad del interlocutor |
| Mode | Demodulacion RX disponible en ese build; no cambia hardware ni permisos TX |
| TXLock | Bloqueo de emision del canal; mantener en canales de escucha |
| Sql | Umbral de squelch; cero puede dejar ruido abierto continuamente |
| RxMode | Determina escucha y respuesta TX; comprobar el VFO que emitira |
| ChList | Consulta/seleccion de memorias segun contexto de interfaz |
| ChSave | Guardar en memoria; comprobar destino antes de reemplazar |
| ChDele | Borrar memoria; no equivale a borrar solo el nombre |
| ChName | Nombre de canal; no modifica frecuencia |

### Escaneo, prioridades y teclas

| Menu | Explicacion y comprobacion |
| --- | --- |
| ScList | Lista de escaneo activa; revisar que no este vacia |
| ScPri | Uso de canales prioritarios en el ciclo |
| PriCh1 / PriCh2 | Memorias prioritarias; no son VFO A/B |
| ScnRev | Reanudacion: portadora, tiempo o parada segun build |
| F1Shrt / F1Long | Funcion de pulsacion corta/larga del lateral 1 |
| F2Shrt / F2Long | Funcion de pulsacion corta/larga del lateral 2 |
| M Long | Accion asignada a pulsacion larga de MENU |
| KeyLck | Bloqueo automatico y demora; diferente de SetLck |
| 1 Call | Canal de llamada rapida; verificar que la memoria elegida sea correcta |
| SetScn | Modo/velocidad de escaneo cuando se compila; mas rapido no asegura mejor deteccion |
| SetKey | Ajustes de teclas de RescueOps; solo si el perfil lo incluye |

En v6.1 se describen 24 listas con nombre mas combinaciones ALL y MIX. ALL
omite las memorias excluidas y MIX combina listas seleccionadas. No proyectar
esa capacidad sobre v4/v5. Las prioridades de Full Watch provienen de las
prioridades de lista; duplicados/entradas invalidas no crean receptores nuevos.

### Audio, DTMF y emision

| Menu | Explicacion y comprobacion |
| --- | --- |
| TxTOut | Limite continuo de TX; distinto de elegir el aviso SetTOT |
| Mic | Ganancia de microfono; exceso causa distorsion, no mas potencia util |
| MicBar | Indicador de nivel; no sustituye medida de desviacion |
| Beep | Avisos de teclado/interfaz; ajustar volumen antes de auriculares |
| Voice | Indicaciones de voz solo si estan compiladas |
| Roger | Aviso de fin de TX; usar solo donde este permitido y sea apropiado |
| STE / RP STE | Tratamiento de cola de squelch local/repetidor, dependiente del otro extremo |
| ANI ID | Identificador DTMF cuando la llamada DTMF esta compilada |
| UPCode / DWCode | Secuencias configuradas de identificacion/control DTMF; no enviar a sistemas sin permiso |
| PTT ID | Momento/uso de identificacion al accionar PTT |
| D ST | Audio local asociado a DTMF segun implementacion; no es Time Slot DMR |
| D Resp / D Hold | Respuesta y retencion de llamadas DTMF cuando habilitadas |
| D Prel | Parametro de preambulo/temporizacion DTMF; conservar default salvo requisito del sistema |
| D Decd / D List | Decodificacion/lista DTMF de la funcion de llamadas |
| D Live | Visualizacion de DTMF recibido; no convierte la señal en privada |
| VOX | Disparo por audio; desactivar para diagnostico y para evitar TX accidental |
| SetPwr | Nivel de usuario usado por Power=USER |
| SetPTT | PTT clasico o enclavado OnePush; el segundo puede seguir emitiendo al soltar |
| SetTOT | Tipo de aviso de timeout, no su duracion |
| SetEOT | Aviso de fin de emision; revisar sonido/visual segun uso |
| SetRxA | Perfil de audio RX cuando AUDIO esta habilitado |
| SetVol | Ajuste de audio RX por firmware, distinto del mando fisico |
| SetNFM | Variante de filtro estrecho 12.5/6.25 kHz documentada por upstream; no paso VFO |

### Pantalla, energia y opciones avanzadas

| Menu | Explicacion y comprobacion |
| --- | --- |
| BatSav | Ahorro de recepcion; puede retrasar deteccion de actividad |
| BatTxt | Presentacion de bateria |
| ChDisp | Nombre/frecuencia/numero segun modo de visualizacion |
| POnMsg | Mensaje de encendido; no prueba autenticidad del firmware |
| BLTime | Tiempo de retroiluminacion |
| BLMin / BLMax | Brillo minimo/maximo; deben resultar legibles |
| BLTxRx | Activacion de luz durante TX/RX |
| SysInf | Version/build, bateria y paginas de diagnostico segun opciones |
| SetCtr | Contraste de pantalla, no ganancia RF |
| SetInv | Inversion de colores/pixeles |
| SetLck | Alcance del bloqueo: teclas o tambien PTT segun build |
| SetMet | Estilo del S-meter; cifras no equivalen a instrumento calibrado de banco |
| SetGUI | Estilo/tamano de informacion VFO |
| SetTmr | Visualizacion de tiempos RX/TX |
| SetOff | Temporizador de deep sleep; puede interrumpir una sesion |
| SetSav | Presentacion/logo de ahorro cuando compilado |
| SetCfg | Aplicar otro banco de configuracion sin cambiar firmware |
| SetNWR | Funcion NOAA si compilada y aplicable a la region |
| F Lock | Perfil de bandas; no homologacion ni permiso para ampliar TX |
| 350 En | Acceso de recepcion a un rango adicional segun build; no implica emision autorizada |
| FrCali | Ajuste de referencia de frecuencia si se compila; requiere instrumental |
| BatCal | Calibracion de lectura de tension; no cargar valores de otra unidad |
| BatTyp | Perfil de capacidad de bateria; no reparacion ni calibracion RF |
| SetNav | Disposicion de navegacion UV-K1 frente a UV-K5 V3 |
| Reset | Restauracion de ajustes; alcance dependiente del build, con riesgo de perdida |

Menus `Scramb`, `Tx 200`, `Tx 350`, `Tx 500`, `ScraEn` o `NOAA-S` pueden
aparecer en ramas sin la capa F4HWN. Se citan para identificacion historica,
no como opciones habilitadas en los perfiles publicados ni instrucciones para
desbloquear emisiones. Un scrambler no debe tratarse como cifrado seguro.

## RxMode y Full Watch

En v6.1 Full Watch visita VFO A, B y prioridades validas. No son cuatro
receptores independientes. FULL RX/RESPOND puede responder en el ultimo canal
recibido; MAIN TX/FULL RX mantiene TX en el principal. Antes de usar PTT verifica
la indicacion de destino. Para diagnostico elige MAIN ONLY.
Los modos DUAL/CROSS de pantalla no deben confundirse con configuracion de
repetidor ni asumirse como repeticion automatica entre bandas.

## Slots y bancos CFG: operaciones distintas

| Elemento | Contenido | Cambiarlo implica |
| --- | --- | --- |
| Main | Copia base gestionada por firmware, no bootloader | Protegido por la web |
| Slot 1-4 | Imagen de firmware adicional en Flash externa | Restaurar una imagen al procesador desde la radio |
| CFG M/1-4 | Canales, VFO, ajustes y listas independientes | Cargar otra configuracion compatible |
| App Labs | Codigo/recursos con ABI/API especifica | Ejecutar una funcion en overlay RAM, no cambiar firmware completo |

En el upstream v6.1 inspeccionado se abre el selector con MENU al encender.
Confirmar restauracion en la propia radio; no apagar durante ella.
SetCfg cambia banco sin restaurar firmware. La web no inventa un comando remoto
para ninguna de estas acciones.

Para preparar desde biblioteca, elegir carpeta, seleccionar entrada admitida,
revisar nombre/hash y pulsar Preparar. No escribe. Instalar requiere conexion
compatible, respaldo Flash completo y confirmacion. Se verifica CRC del slot.
Vectores y cadena F4HWN correctos no prueban que el codigo sea autentico.

## Labs y aplicaciones

La base inspeccionada documenta 16 huecos y apps de radio, APRS, SSTV,
diagnostico y demos. El conjunto cambia entre releases; no todas las apps
estan disponibles ni son compatibles con todos los builds.

El conector comprueba FAP1, limites de codigo/recursos y CRC de recursos, y
relee bloques escritos. La aceptacion de cabecera no demuestra que una app
pueda ejecutarse: ABI, API y capacidades pueden rechazarla al cargar/ejecutar.
Usa firmware y apps de la misma publicacion. Instalar una app de origen
desconocido equivale a dar codigo nativo acceso a la radio.

APRS TX requiere configuracion legal de indicativo/SSID, posicion y ruta.
No transmite esta web por cargar un `.app`; no se configuran balizas automaticas
como parte de un respaldo. Las funciones de emergencia/EPIRB se citan como
inventario upstream: no probar emisiones en frecuencias de socorro.

## Problemas habituales

| Sintoma | Revision |
| --- | --- |
| Arranca pero no aparece SetCfg | Comprobar opciones multiboot del build, no solo version |
| Slot visible con datos pero CRC incorrecto | No restaurar; conservar archivo y respaldo |
| USB identifica pero lectura Flash falla | Puede faltar comando fisico Labs; cerrar otros programas y registrar build |
| Teclas parecen invertidas | Revisar SetNav/modelo; no flashear otra familia para corregirlo |
| Cambio de ajustes desaparece | Guardar memoria o comprobar banco CFG y persistencia |
| No se oye un repetidor | RX, modo, SQL y filtro RX; no empezar aumentando potencia TX |
| Una app no se ejecuta | Verificar ABI/API/caps y release, no repetir escrituras a ciegas |
| SA818 o packed bloqueado | Es intencionado; no renombrar para eludir la restriccion |

## Fuentes y mantenimiento

- [Proyecto PY32 y README](https://github.com/armel/uv-k1-k5v3-firmware-custom).
- [Publicaciones por version](https://github.com/armel/uv-k1-k5v3-firmware-custom/releases).
- [Presets v6.3.0 fijados](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/ca3a4271386049e7b459b215cef0ad0eea1a30ca/CMakePresets.json).
- [Menu v6.1 inspeccionado](https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/App/ui/menu.c).
- [UVTOOLS2 del proyecto](https://armel.github.io/uvtools2/).
- [Driver CHIRP dedicado](https://github.com/armel/uv-k5-chirp-driver).
- [Bricohams, hashes y compilacion](BRICOHAMS-FIRMWARE.md).
- [Karina V1 y limites de licencia/fuentes](KARINA.md).

Para un firmware stock, UVMOD o OneOfEleven consultar su proyecto y hardware
exactos: no hay equivalencia de menus/EEPROM garantizada con esta guia.
Para los enlaces añadidos por el usuario, ver [Egzumer V1](AYUDA-EGZUMER.md) y
[pack Dim0s con Karina V3/K1](AYUDA-PACK-DIM0S.md).
