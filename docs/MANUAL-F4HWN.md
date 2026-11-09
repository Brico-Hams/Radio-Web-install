# Manual F4HWN (FH4): guía de menús Bricohams

Manual de referencia del firmware F4HWN (FH4) para Quansheng UV-K5 y UV-K6:
bloqueo, retroiluminación y los 68 menús del equipo. Edición Bricohams del
8-11-2026. [Manual completo en PDF](manuals/Manual_F4HWN_FH4_Bricohams_v2.pdf)
(13 páginas; incluye el anexo imprimible de referencia rápida de 3 páginas,
páginas 11-13).

## Primero: activa ALL

Pulsa MENU y selecciona `ALL` antes de usar esta guía. Sin ALL no aparecerán
todos los menús.

1. Pulsa la tecla MENU del equipo.
2. En la pantalla de selección, busca la opción ALL.
3. Confirma ALL y luego entra al menú general para ver todas las opciones.

Si no seleccionas ALL, solo aparecerá una parte de los menús disponibles, la
numeración visible puede parecer incompleta respecto a esta guía y la cantidad
total de opciones puede variar según la versión y la compilación del firmware.
Tras seleccionar ALL, usa la guía por el nombre del menú y no solo por su número.

## Alcance y numeración

F4HWN (FH4) es un firmware personalizado desarrollado por Armel, F4HWN, para
equipos de la familia Quansheng UV-K5 y variantes compatibles, incluido el
UV-K6. Incorpora mejoras de interfaz, recepción, teclas configurables, escaneo
y gestión de la energía. La disponibilidad de funciones depende tanto del
equipo como de las opciones de compilación.

Las 68 entradas siguen el orden editorial del manual, no la numeración universal
de todas las versiones F4HWN. La lista real puede cambiar entre compilaciones.
Localiza siempre los ajustes por su nombre corto (nemónico) si el número no
coincide, y comprueba `SysInf` para saber qué compilación tienes instalada.
Algunas opciones citadas son condicionales o pueden presentar rótulos distintos.

Nota Bricohams: las imágenes de este instalador web son F4HWN v6.1.0 para
UV-K5 V3 / UV-K1 (ediciones Bricohams en slots). Los menús se localizan por su
nemónico y las opciones dependen de la compilación.

Discrepancia de numeración señalada por el propio manual: la sección 2.3 del PDF
numera BLTime, BLMin y BLMax como 38, 39 y 40, mientras que la tabla los numera
36, 37 y 38. Esta guía sigue la tabla.

## Menús críticos paso a paso

### KeyLck (30): bloqueo automático

1. Pulsa MENU en la pantalla principal.
2. Localiza `KeyLck` con las teclas de navegación.
3. Pulsa MENU para editar y selecciona OFF o un tiempo entre 00:15 y 10:00, en
   pasos de 15 segundos.
4. Confirma con MENU y sal con EXIT.
5. Espera el tiempo configurado sin pulsar teclas y verifica el bloqueo. Para
   desbloquear, usa la combinación prevista por tu edición; en muchas variantes
   es una pulsación prolongada de F/#.

Consejo: 00:30-01:00 para transporte; OFF para manejo continuo. El alcance de
este bloqueo depende de `SetLck`.

### SetLck (63): alcance del bloqueo

1. Abre MENU y busca `SetLck`.
2. Pulsa MENU para cambiar el ajuste.
3. Selecciona KEYS para bloquear solo las teclas, dejando el PTT operativo, o
   KEYS+PTT para bloquear también el pulsador de transmisión.
4. Confirma, sal y prueba el funcionamiento de forma segura, sin transmitir
   fuera de las frecuencias autorizadas.

Consejo: KEYS+PTT evita emisiones accidentales en transporte; KEYS permite
utilizar el PTT sin desbloquear.

### BLTime, BLMin, BLMax y BLTxRx: luz fija

1. Busca `BLTime` (36 en la tabla) y selecciona ON para mantener la
   retroiluminación permanentemente encendida. Otras opciones: OFF o de
   5 segundos a 5 minutos, de 5 en 5 s.
2. Entra en `BLMin` (37): ajusta el brillo mínimo o de reposo, normalmente 0-9;
   empieza por 0-2 para ahorrar energía.
3. Entra en `BLMax` (38): ajusta el brillo de activación, normalmente 1-10;
   3-5 es un punto de partida práctico.
4. Comprueba `BLTxRx` (39): OFF, TX, RX o TX/RX; elige qué eventos activan la
   iluminación.
5. Confirma cada valor y observa la pantalla en reposo, recepción y
   transmisión permitida. Si se apaga inesperadamente, revisa los valores de
   brillo mínimo y los atajos de apagado temporal.

Autonomía: mantener encendida la retroiluminación, en especial con BLMin/BLMax
altos, puede reducir notablemente la duración de la batería. BLTime=ON con
brillo elevado descarga antes la batería; para el uso diario prueba
BLTime=10-20 s y un brillo bajo. ON resulta útil en sobremesa, con
alimentación adecuada o cuando prevalece la visibilidad.

## Referencia de los 68 menús

Organización funcional del manual. La numeración puede no coincidir con
compilaciones diferentes; prioriza siempre el nemónico.

### 01-13: parámetros básicos de radio, audio y transmisión

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 01 | `Step` | Salto de sintonía. | 0,01; 0,05; 0,1; 0,25; 0,5; 1; 1,25; 2,5; 5; 6,25; 8,33; 9; 10; 12,5; 15; 20; 25; 30; 50; 100; 125; 200; 250 y 500 kHz, según compilación. |
| 02 | `Power` | Potencia de transmisión del canal. La potencia real depende de frecuencia, batería y calibración. | USER, LOW1-LOW5, MID y HIGH. Aproximaciones: inferior a 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W y 5 W; USER adopta `SetPwr`. |
| 03 | `RxDCS` | Filtra la recepción mediante códigos DCS digitales. Debe coincidir con la señal recibida. | OFF y códigos normal (N) o invertido (I) de la tabla estándar disponible, como D023N/D023I y hasta D754. |
| 04 | `TxDCS` | Envía un código DCS durante la transmisión. No proporciona privacidad ni cifrado. | OFF y códigos DCS de la tabla estándar en polaridad N o I. |
| 05 | `RxCTCS` | Abre el audio solo cuando detecta el subtono analógico CTCSS seleccionado. | OFF o tonos normalizados de 67,0 a 254,1 Hz, incluidos 88,5, 100,0 y 123,0 Hz. |
| 06 | `TxCTCS` | Añade al audio transmitido el subtono CTCSS elegido; úsalo cuando un repetidor exija un tono de acceso. | OFF o tonos estándar de 67,0 a 254,1 Hz. |
| 07 | `TxODir` | Dirección del desplazamiento de transmisión. | OFF (sin desplazamiento), + (transmite por encima de RX) o − (por debajo). |
| 08 | `TxOffs` | Magnitud del desplazamiento TX/RX en MHz; ajustable por pasos del equipo. Ejemplo: 0,600 MHz en un repetidor que lo requiera. | Nominalmente entre 0 y 999,99999 MHz según límites de banda. |
| 09 | `W/N` | Ancho de canal. Adáptalo al canal y a las reglas aplicables. | WIDE (aprox. 25 kHz) o NARROW (12,5 kHz; puede usar el ajuste más estrecho de `SetNFM`). |
| 10 | `BusyCL` | Bloqueo por canal ocupado. | OFF permite pulsar PTT con actividad detectada; ON impide transmitir cuando el canal se considera ocupado. |
| 11 | `Compnd` | Compansor de audio: comprime audio en emisión y/o expande en recepción; conviene que ambos extremos sean compatibles. | OFF, TX, RX o TX/RX. |
| 12 | `Mode` | Modo de demodulación. Las modalidades y la capacidad de transmisión dependen del hardware y la versión. | FM, AM y, cuando la compilación lo incluye, USB. |
| 13 | `TXLock` | Bloqueo de transmisión específico del canal. | OFF habilita TX sujeto al resto de restricciones; ON convierte el canal en uso solo recepción. |

### 14-23: memorias, canales y listas de escaneo

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 14 | `ScAdd1` | Incluye el canal actual en la lista de escaneo 1; puede pertenecer también a otras listas. | OFF / ON. |
| 15 | `ScAdd2` | Incluye el canal actual en la lista de escaneo 2. | OFF / ON. |
| 16 | `ScAdd3` | Incluye el canal actual en la lista de escaneo 3. | OFF / ON. |
| 17 | `SList1` | Parámetros de prioridad/canales de la lista 1 en las variantes que exponen esta entrada. El significado exacto puede variar. | Canales programados de memoria (0-199) y selección sin prioridad según edición. |
| 18 | `SList2` | Parámetros de prioridad/canales de la lista 2; verifica el rótulo de pantalla. | Posiciones de memoria 0-199 y desactivación de prioridad según edición. |
| 19 | `SList3` | Parámetros de prioridad/canales de la lista 3. | Posiciones de memoria 0-199 y desactivación de prioridad según edición. |
| 20 | `SList` | Lista utilizada al iniciar el escaneo. | LIST [0] (canales sin lista), LIST [1], LIST [2], LIST [3], LISTS [1,2,3] o ALL (todos los canales). |
| 21 | `ChSave` | Guarda la frecuencia y los ajustes del VFO en una memoria libre o seleccionada. Revisa antes de confirmar, pues puede sobrescribir datos. | Memoria 0-199. |
| 22 | `ChDele` | Elimina el canal de memoria seleccionado. Afecta a los datos almacenados: guarda copia con CHIRP antes de borrar en masa. | Memoria 0-199. |
| 23 | `ChName` | Edita el nombre mostrado de un canal de memoria. | Memoria 0-199; hasta 10 caracteres en las versiones documentadas: letras, números, espacios y algunos símbolos. |

### 24-32: teclas, bloqueo y ahorro

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 24 | `ScnRev` | Comportamiento al detectar señal durante el escaneo. | STOP (detenerse), CARRIER (reanudar al cesar la señal, con espera seleccionable de 0,25 a 20 s) o TIMEOUT (reanudar tras 5-120 s aunque siga la señal). |
| 25 | `F1Shrt` | Función de pulsación corta del botón lateral F1. | Según compilación: NONE, MONITOR, SCAN, POWER, FLASHLIGHT, VOX, FM RADIO, VFO A/B, VFO/MEM, LOCK KEYPAD, 1750 Hz, BACKLIGHT y otras. |
| 26 | `F1Long` | Función de pulsación larga del botón lateral F1; puede reservarse para bloqueo o monitor. | Mismas familias de acciones asignables que `F1Shrt`. |
| 27 | `F2Shrt` | Función de pulsación corta del botón lateral F2. | Una acción de la lista disponible, por ejemplo SCAN, POWER, MONITOR, MUTE o cambio de RX MODE. |
| 28 | `F2Long` | Función de pulsación larga de F2. | Opciones de asignación equivalentes, sujetas a las funciones activadas en la compilación. |
| 29 | `M Long` | Acción de pulsación larga de MENU. | Puede asignarse a linterna, escaneo, cambio VFO/memoria, bloqueo, luz y otras funciones previstas por la edición. |
| 30 | `KeyLck` | Temporizador de bloqueo automático del teclado. El alcance del bloqueo se define en `SetLck` (63). | OFF o desde 00:15 hasta 10:00 min en intervalos de 15 s. |
| 31 | `TxTOut` | Tiempo máximo de transmisión continua (TOT). Al agotarse interrumpe TX; `SetTOT` controla cómo avisa. | Intervalos de 5 s, típicamente desde 30 s hasta 15 min según firmware. |
| 32 | `BatSav` | Ahorro energético del receptor. Valores mayores favorecen la autonomía, pero pueden empeorar la detección de señales breves. | OFF o relaciones de reposo/actividad 1:1, 1:2, 1:3, 1:4 y 1:5. |

### 33-41: pantalla, retroiluminación y contraste

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 33 | `BatTxt` | Información de batería en la interfaz. | NONE (sin texto), VOLTAGE (tensión en V) o PERCENT (porcentaje estimado). |
| 34 | `ChDisp` | Presentación del canal. Requiere nombre guardado para mostrarlo. | FREQ (frecuencia), CHANNEL NUMBER (número), NAME (nombre) o NAME+FREQ. |
| 35 | `POnMsg` | Pantalla/aviso de encendido; rótulos concretos según edición. | ALL/FULL (información completa), SOUND, MESSAGE, VOLTAGE o NONE. |
| 36 | `BLTime` | Duración de la luz de fondo. ON aumenta el consumo; `BLMin` y `BLMax` modulan el brillo. | OFF, 5 s a 5 min en pasos de 5 s, u ON (siempre encendida). |
| 37 | `BLMin` | Brillo mínimo o de reposo. 0 reduce al mínimo o apaga la luz en reposo; un valor mayor consume más. | Niveles 0-9 (ciertos controladores muestran 0-10). |
| 38 | `BLMax` | Brillo máximo con la pantalla activada. Usa el mínimo legible; el contraste puede ajustarse aparte mediante `SetCtr`. | Niveles 1-10. |
| 39 | `BLTxRx` | Activación de la iluminación durante la comunicación; controla los eventos de encendido de luz al transmitir o recibir. | OFF, TX, RX o TX/RX. |
| 40 | `SetCtr` | Contraste del LCD. Ajústalo para equilibrar legibilidad y sombreado, especialmente si se usa inversión visual. | Valores 1-15. |
| 41 | `SetInv` | Invierte la apariencia de la pantalla. No cambia el consumo de retroiluminación de manera equivalente a `BLTime`. | OFF (normal) u ON (invertida). |

### 42-52: alertas, tonos y señalización DTMF

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 42 | `Beep` | Pitido de confirmación de pulsaciones. | OFF / ON. |
| 43 | `Roger` | Aviso al soltar PTT. Respeta las prácticas del canal. | OFF, ROGER (pitido) o MDC (señalización de tipo datos en compilaciones que la ofrecen). |
| 44 | `STE` | Supresión de cola de ruido al finalizar una transmisión; requiere compatibilidad para resultar eficaz. | OFF / ON. |
| 45 | `RP STE` | Supresión de cola a través de repetidor. | OFF o retardos 100-1000 ms (pasos de 100 ms), según versión. |
| 46 | `1 Call` | Canal de llamada rápida asignado al acceso mediante atajo/tecla compatible. | Memoria 0-199. |
| 47 | `UPCode` | Cadena DTMF que puede emitirse al pulsar PTT. | Hasta 16 caracteres, con dígitos 0-9 y símbolos DTMF permitidos. |
| 48 | `DWCode` | Cadena DTMF que puede emitirse al soltar PTT. | Hasta 16 caracteres del alfabeto DTMF permitido. |
| 49 | `PTT ID` | Momento de emisión de la identificación DTMF. | OFF, UP CODE, DOWN CODE, UP+DOWN CODE o APOLLO QUINDAR (según edición). |
| 50 | `D ST` | Reproducción local de tonos DTMF durante el marcado. | OFF / ON. |
| 51 | `D Prel` | Tiempo previo de señalización DTMF; permite estabilizar el enlace antes de enviar tonos. | Valores 3-99 unidades de 10 ms (30-990 ms). |
| 52 | `D Live` | Descodificador DTMF en tiempo real en pantalla. Requiere recepción de tonos suficientemente limpia. | OFF / ON. |

### 53-60: sistema, recepción y ajustes finos

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 53 | `VOX` | Transmisión activada por voz. Prueba con el ruido ambiente; un umbral inadecuado ocasiona activaciones indeseadas. | OFF o niveles 1-10 de sensibilidad. |
| 54 | `SysInf` | Información de sistema, normalmente solo lectura: versión del firmware y datos como la tensión de batería. La información exacta depende de la compilación. | Consulta / solo lectura. |
| 55 | `RxMode` | Gestión de doble escucha: controla qué VFO se escucha y cuál transmite. | MAIN ONLY, DUAL RX RESPOND, CROSS BAND o MAIN TX DUAL RX. |
| 56 | `Sql` | Nivel de silenciador. 0 deja abierto el audio; niveles altos requieren señal más fuerte para abrir el squelch. | 0-9. |
| 57 | `SetPwr` | Define la potencia que usará Power=USER (valores nominales). | Inferior a 20 mW, 125 mW, 250 mW, 500 mW, 1 W, 2 W o 5 W. |
| 58 | `SetPTT` | Comportamiento del PTT. Verifica el estado TX al utilizar ONEPUSH. | CLASSIC (mantener pulsado para transmitir) o ONEPUSH (conmutación por pulsaciones). |
| 59 | `SetTOT` | Forma del aviso de tiempo límite de TX. No sustituye el ajuste `TxTOut`. | OFF, SOUND (sonido), VISUAL (pantalla) o ALL (ambos). |
| 60 | `SetEOT` | Aviso de final de transmisión. Distinto de `Roger`, que añade señalización al audio transmitido. | OFF, SOUND, VISUAL o ALL. |

### 61-68: interfaz avanzada y opciones de compilación

| N.º | Menú | Función | Opciones |
| --- | --- | --- | --- |
| 61 | `SetMet` | Estilo del medidor de intensidad de señal (S-meter). | TINY o CLASSIC. |
| 62 | `SetGUI` | Estilo/tamaño de la tipografía principal del VFO. Cambia la presentación, no la sensibilidad de radio. | TINY o CLASSIC. |
| 63 | `SetLck` | Alcance del bloqueo de teclado. Trabaja con el temporizador `KeyLck`. | KEYS (solo teclas) o KEYS+PTT (teclas y pulsador de transmisión). |
| 64 | `SetTmr` | Visualización de temporizadores de recepción/transmisión. | OFF / ON. |
| 65 | `SetOff` | Apagado automático del equipo. | OFF o plazo seleccionable desde 1 min hasta 2 h, normalmente por pasos de 1 min. |
| 66 | `SetNFM` | Ancho de banda cuando `W/N` está en estrecho. NARROWER solo está presente en compilaciones que lo incluyen. | NARROW (~12,5 kHz) o NARROWER (~6,25 kHz). |
| 67 | `SetVol` | Ajuste de ganancia/volumen interno; no equivale al control físico de volumen. | Niveles 0-63 en compilaciones con ENABLE_FEAT_F4HWN_VOL. |
| 68 | `SetKey` | Remapeo de tecla especial en variantes RescueOps. No está disponible en todas las compilaciones. | MENU, UP, DOWN, EXIT o STAR. |

## Recomendaciones de operación

- Guarda con CHIRP una copia de las memorias y de la configuración antes de
  flashear, restaurar o borrar canales: [módulo CHIRP F4HWN](AYUDA-QUANSHENG.md).
- Los tonos CTCSS/DCS seleccionan señales: no proporcionan privacidad, cifrado
  ni una garantía de canal libre.
- Respeta siempre las limitaciones de banda, potencia y licencia aplicables. La
  capacidad técnica de transmitir fuera de una banda no equivale a autorización.
- Si una entrada cambia de número o falta, comprueba `SysInf` y consulta la
  compilación instalada antes de interpretar el ajuste.

## Fuentes

- Repositorio original: <https://github.com/armel/uv-k1-k5v3-firmware-custom>
- Definición de lista y opciones:
  <https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/main/App/ui/menu.c>
- Referencia documental de menús:
  <https://deepwiki.com/armel/uv-k1-k5v3-firmware-custom/8.1-menu-item-reference>
- Controlador CHIRP con valores configurables:
  <https://github.com/armel/uv-k5-chirp-driver>

Nota editorial: guía técnica independiente preparada con la identidad gráfica
facilitada de Bricohams. No se presenta como documentación oficial del
desarrollador. Los rangos y funciones pueden variar por compilación.

[Quansheng y versiones](AYUDA-QUANSHENG.md) · [Opciones de compilación F4HWN](AYUDA-OPCIONES-F4HWN.md) · [Firmware Bricohams](BRICOHAMS-FIRMWARE.md)
