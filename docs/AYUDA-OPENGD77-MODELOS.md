# OpenGD77: modelos, variantes y alcance del soporte

**Verificación documental: 2026-10-25.** Complemento de [Ayuda de configuración y uso](AYUDA-OPENGD77.md). Se separan compatibilidad documentada por el proyecto, destinos del catálogo y nombres reconocidos por el conector. No se han realizado pruebas físicas de todos los equipos.

## 1. Cómo interpretar las tablas

- **Guía:** el modelo o variante aparece en la guía oficial inglesa consultada. Una mención en título, captura o ejemplo no equivale a unas instrucciones completas de instalación.
- **Paquete:** se ha observado un archivo publicado en un índice oficial concreto. No certifica toda revisión de hardware con un nombre comercial parecido.
- **Catálogo:** destino de `firmware-core.js`, `TARGETS`; es un selector de paquetes, no un cargador de firmware.
- **Identificación:** etiqueta en `gd77-connector.js`, `MODELS`; permite interpretar un número del protocolo. No prueba por sí sola compatibilidad operativa completa.
- **No confirmado:** no hay evidencia suficiente en las fuentes consultadas; no significa necesariamente imposible o inexistente.

**Todas las familias OpenGD77 quedan en solo lectura de la radio en esta web.** Puede leerse/editarse/guardarse localmente el codeplug estándar, pero **escribir está BLOQUEADO** porque el respaldo no incluye una copia íntegra verificada del firmware MCU. El CPS externo puede ofrecer otras operaciones; eso no cambia el permiso web. No se flashea desde el catálogo. [L]

## 2. Matriz de modelos y destinos

En esta tabla, «ID» indica la etiqueta que puede devolver el conector. Los nombres sin guion, con guion o con espacio se muestran juntos solo para facilitar la búsqueda; eso no convierte variantes diferentes en el mismo hardware.

| Modelo o denominación | Evidencia oficial y restricciones | Destino en `TARGETS` | Etiqueta en `MODELS` | Conclusión práctica |
| --- | --- | --- | --- | --- |
| Radioddity GD-77 / GD77 | Instalación y operación documentadas; paquete `OpenGD77.zip` [G, F1] | `GD-77`, MK22 | `GD-77` | Elegir su paquete, no GD77S |
| Radioddity GD-77S / GD77S | Documentado sin pantalla/teclado; voces esenciales; paquete propio [G, F1] | `GD-77S`, MK22 | `GD-77S` | Zonas con primeros 16 canales accesibles por selector |
| Baofeng DM-1801 / DM1801 | Solo hardware versión 1; revisión de 2022 excluida por la guía [G, F1] | `DM-1801`, MK22 | `DM-1801` | Verificar placa; no basta el frontal |
| Baofeng DM-1801A / DM1801A | Solo hardware versión 1; también excluida revisión nueva de 2022 [G, F1] | `DM-1801A`, MK22 | `DM-1801A` | Imagen distinta de DM1801; la A no es un sufijo prescindible |
| Baofeng RD-5R / RD5R | Instalación documentada; sin hotspot por limitación USB durante TX [G, F1] | `RD-5R`, MK22 | `RD-5R` | No confundir con cualquier DM-5R ni UV-5R |
| TYT MD-9600 / MD9600 | Móvil documentado con revisiones RF y paquetes HW separados [G, F3] | `MD-9600-V1`, `-V2`, `-V4`, `-V5`, STM32 | `MD-9600` | El ID no selecciona automáticamente la revisión |
| Retevis RT-90 / RT90 | Se documenta junto al MD-9600; misma precaución por revisión [G] | Sin clave RT90; destinos MD9600 pertinentes | No hay etiqueta RT90; la tabla ofrece `MD-9600` | Asociación oficial de familia, no garantía de cualquier placa |
| TYT MD-UV380 / UV380 estándar | Instalación/operación documentadas; paquete `OpenMDUV380.zip` [G, F2] | `MD-UV380`, STM32 | `MD-UV380` | No usar por semejanza de nombre en MD-380 |
| Retevis RT-3S / RT3S | Documentado junto al MD-UV380 [G] | Sin clave RT3S; el destino `MD-UV380` lo nombra en su etiqueta | No hay etiqueta RT3S | Asociación oficial; comprobar GPS y hardware de la unidad |
| TYT MD-UV390 / UV390 | Título y pantalla GPS de la guía lo incluyen [G] | No hay destino con ese nombre | No hay etiqueta UV390 | Mención oficial sí; asignación exacta de imagen a cada variante no confirmada aquí |
| MD-UV380 10W **no PLUS** | La guía describe una opción de escala de potencia en la plataforma UV380 no PLUS [G: Radio Options — Mode] | Sin destino dedicado a 10W no PLUS | Sin ID separado | La escala no acredita potencia ni cambia el hardware; verificar notas de la variante |
| MD-UV380 10W **PLUS** | Paquete oficial separado `OpenMDUV380_10W_PLUS.zip` [F2] | `MD-UV380-10W-PLUS`, STM32 | Sin ID PLUS separado | Hardware distinto según la etiqueta local; no tratar como UV380 estándar |
| UV390 anunciado como 10W o PLUS | No hay asignación específica verificada en las fuentes consultadas | No hay destino UV390 PLUS | No hay ID específico | No extrapolar la imagen UV380 PLUS solo por el anuncio |
| Baofeng DM-1701 / DM1701 | Instalación/operación documentadas; paquete `OpenDM1701.zip` [G, F2] | `DM-1701`, STM32 | `DM-1701` | No confundir con RGB |
| Baofeng DM-1701 RGB / DM1701RGB | Etiqueta prevista por el conector; no documentación específica comprobada aquí [L] | No hay destino RGB | `DM-1701 RGB` | Reconocimiento de ID, no paquete ni instalación confirmada |
| Retevis RT-84 / RT84 | Guía de instalación y paquete propio `OpenRT84.zip` [G, F2] | `RT-84`, STM32 | No hay etiqueta RT84 | Compartir capítulo con DM1701 no autoriza intercambiar ZIP |
| TYT MD-2017 / MD2017 | Lámina de controles en la guía y paquete oficial `OpenMD2017.zip` [G, F4] | `MD-2017`, STM32 | `MD-2017` | Evidencia de publicación; no extrapolar el manual UV380 íntegramente |
| MD-380 / MD380 | Etiqueta del conector; no destino ni paquete verificado para él en esta consulta [L] | No hay destino | `MD-380` | **No es MD-UV380**; bandas y compatibilidad de variantes no certificadas aquí |
| DM-32 / DM32 | Etiqueta de identificación prevista [L] | No hay destino | `DM-32`, familia lógica SERIAL | No se certifican firmware, GPS, APRS ni mapa completo por ese nombre |
| UV008 | Etiqueta de identificación prevista [L] | No hay destino | `UV008`, familia lógica SERIAL | No se certifican equivalencias comerciales ni capacidades RF |

Los destinos Quansheng `UV-K1` y `UV-K5-V3` que también existen en `TARGETS` **no son OpenGD77**. Quedan fuera de esta ayuda.

### Alias y nombres adicionales presentes en la guía

| Nombres | Qué está confirmado | Qué no debe deducirse |
| --- | --- | --- |
| GD-77 ↔ TYT MD-760 | La sección de instalación identifica MD-760 como denominación del GD-77 | Compatibilidad de cualquier otro TYT parecido |
| DM-1801 versión 1 ↔ Baofeng DM-860 | La guía lo indica expresamente | Que un DM-1801 de 2022 vuelva a ser compatible por llamarse DM-860 |
| RD-5R ↔ Baofeng DM-5R **Tier 2** | Alias expreso en instalación | Que cualquier DM-5R, incluidos otros diseños/versiones, sea RD-5R |
| MD-9600 ↔ Retevis RT-90 | Tratamiento conjunto oficial de instalación y operación | Una única imagen para todas las revisiones de ambas marcas |
| MD-UV380 ↔ Retevis RT-3S | Tratamiento conjunto oficial; también reflejado en etiqueta del catálogo | Identidad con MD-380 o compatibilidad automática de todas las versiones 10W |
| TYT MD-730 y GD-77S | MD-730 aparece en la lista de controles de entrada a actualización junto a GD77/GD77S/MD760 | Esa mención aislada no confirma aquí un alias completo GD77S↔MD730 ni un destino separado |
| DM-1701 y RT-84 | Ambos tienen instrucciones en el mismo capítulo | Alias de imagen: existen ZIP distintos |
| MD-UV390 y MD-UV380 | La guía documenta UV390 en su alcance y GPS | Imagen intercambiable para cualquier revisión UV390 |
| MD-2017 y Retevis RT82 u otros nombres comerciales | No se ha confirmado un alias con las fuentes examinadas | No usar imágenes MD2017 solo por una equivalencia de tienda |
| DM1701RGB, DM32, UV008 y otros equipos | Solo las etiquetas locales indicadas | Una familia de transporte no demuestra hardware idéntico |

La tabla evita convertir proximidad comercial, aspecto externo o pertenencia a un mismo índice en una equivalencia técnica.

## 3. Familias y protocolo de identificación de la web

La siguiente clasificación es **la que implementa el conector**, no un inventario universal de microcontroladores de cualquier equipo vendido con ese nombre:

| `radioType` | Etiqueta interpretada | Familia lógica y transporte elegidos por el código |
| --- | --- | --- |
| 0 | GD-77 | MK22 / USB |
| 1 | GD-77S | MK22 / USB |
| 2 | DM-1801 | MK22 / USB |
| 3 | RD-5R | MK22 / USB |
| 4 | DM-1801A | MK22 / USB |
| 5 | MD-9600 | STM32 / USB |
| 6 | MD-UV380 | STM32 / USB |
| 7 | MD-380 | STM32 / USB |
| 8 | DM-1701 | STM32 / USB |
| 9 | MD-2017 | STM32 / USB |
| 10 | DM-1701 RGB | STM32 / USB |
| 11 | DM-32 | SERIAL / WebSerial a 115200 |
| 12 | UV008 | SERIAL / WebSerial a 115200 |

`connect()` solicita una estructura RadioInfo de 46 bytes, acepta versiones de estructura **1 a 4**, comprueba el rango del tipo y exige que la familia seleccionada coincida. Extrae modelo, firmware y build. Si no reconoce esos datos, rechaza la estructura: no debe adivinarse un mapa de memoria.

No hay IDs distintos en esta tabla para RT90, RT3S, RT84, UV390, HW V1/V2/V4/V5 o 10W PLUS. Esa ausencia impide usar la lista como detector inequívoco de todas las variantes. Tampoco garantiza qué valor devolverá cada firmware no probado.

El respaldo web usa mapas de calibración distintos para MK22 y las demás familias, además de segmentos para reconstruir el codeplug estándar. Que el código ofrezca ese camino no acredita por sí solo ensayos físicos, validez en futuras builds ni copia completa en cada modelo SERIAL. Ante una respuesta inesperada, conserva el error y no fuerces la familia. [L]

## 4. MD-9600 / RT-90: revisiones HW1, HW2, HW4 y HW5

El proyecto explica que hubo cambios de PLL y frecuencia intermedia durante la producción. La serigrafía de placa puede no bastar: existen unidades cuyo hardware cambió sin cambiar esa marca. El catálogo no soluciona esta ambigüedad.

| Destino local | Archivo observado en el índice oficial [F3] | Criterio de selección |
| --- | --- | --- |
| `MD-9600-V1` | `MD9600_firmware_HW_V1.zip` | Revisión RF compatible con HW1, documentada para la unidad |
| `MD-9600-V2` | `MD9600_firmware_HW_V2.zip` | Revisión RF compatible con HW2 |
| `MD-9600-V4` | `MD9600_firmware_HW_V4.zip` | Revisión RF compatible con HW4 |
| `MD-9600-V5` | `MD9600_firmware_HW_V5.zip` | Revisión RF compatible con HW5; la guía dirige placa 4A a firmware V5 |

El índice también contiene variantes japonesas con prefijo `Japanese_`. No se observa un destino V3 en el catálogo local ni en ese índice: no inventar uno por continuidad numérica.

La guía advierte además que algunas unidades muy antiguas marcadas como placa versión 2 pueden necesitar firmware V1. Aunque el texto histórico propone probar otra revisión si no hay RX/TX, esta ayuda **no convierte esa observación en un procedimiento universal de flasheo a ciegas**. Documenta la placa/unidad, consulta las instrucciones de esa revisión y conserva copias.

Un codeplug correcto con una imagen HW equivocada puede dejar RX/TX sin funcionar. Cambiar TG, filtros o tonos no corrige una selección incorrecta de PLL/IF. El número de firmware HW no es la versión del CPS ni la versión de estructura RadioInfo.

## 5. UV380, UV390, RT3S y las variantes 10W

| Caso | Evidencia | Límite de la conclusión |
| --- | --- | --- |
| UV380 estándar / RT3S | Guía conjunta y destino local `MD-UV380` | Comprobar unidad con/sin GPS y la build |
| UV380 10W no PLUS | Opción `Mode` que adapta la escala mostrada según la guía | Seleccionar la escala no aumenta la potencia física |
| UV380 10W PLUS | ZIP oficial y destino local separados | No cargar la imagen estándar por compartir «UV380» |
| UV390 | Mencionado en el alcance y GPS de la guía | No hay un selector local que certifique automáticamente su variante |
| UV390 10W/PLUS comercial | No hay correspondencia concreta verificada aquí | Identificar placa y notas oficiales antes de elegir imagen |

No debe inferirse que las versiones no PLUS y PLUS comparten procedimiento de instalación, pantalla, GPS o calibración. Tampoco que todos los portátiles anunciados como «10W» entreguen esa potencia de forma medida.

## 6. Bandas, potencia y capacidades: lo documentado y lo pendiente

No se publica aquí una tabla comercial de rangos RX/TX o vatios por radio: las fuentes consultadas no verifican uniformemente las variantes regionales y revisiones. Se ofrece solo lo sustentado y se señalan los límites.

| Capacidad | Evidencia utilizable | No extrapolar a… |
| --- | --- | --- |
| FM y DMR | Objetivo funcional y modos de la guía para plataformas soportadas; DMR requiere el procedimiento de códec/donante | Toda etiqueta del conector o una instalación sin donante correcto |
| VHF/UHF | La guía trata límites de ambas bandas y canales FM/DMR | Doble recepción simultánea ni rangos exactos garantizados para todos los modelos |
| Banda de 200/220 MHz | El manual describe límites de software y advierte que falta una sección RX/PA adecuada para 200 MHz y hay espurias importantes | Considerar todos los equipos «tribanda» o recomendar TX allí |
| Potencia de 5 W / 10 W / móvil | Hay escalas y tablas diferenciadas en la guía y un paquete PLUS separado | Una única potencia máxima común ni tolerancia a servicio continuo |
| Pantalla/teclado | GD77S no tiene ninguno; otros controles y tamaños varían | Que una captura o atajo sea universal |
| GPS | La guía contempla receptor opcional en MD9600/RT90 y UV380/RT3S; la pantalla GPS también menciona UV390, DM1701 y RT84 con GPS instalado | Todas las unidades, o GPS garantizado en DM1701RGB/DM32/UV008 |
| RTC | El capítulo de satélites enumera MD9600/RT90, UV380/RT3S y DM1701 en su contexto | Clasificar automáticamente como «sin RTC» cualquier otro modelo posterior |
| APRS FM TX | Documentado por la guía; exige perfil y posición | Recepción APRS, mensajes bidireccionales ni recursos idénticos en toda build |
| NMEA / registro GPS | Opciones documentadas cuando hay hardware y memoria apropiados | Que el sufijo NMEA añada un receptor o no afecte a la base de IDs |
| Hotspot | Documentado para plataformas compatibles; RD5R/DM5R excluido por USB durante TX | RD5R, full dúplex o todas las etiquetas nuevas del conector |
| Satélites | Predicción y corrección Doppler documentadas con hora/posición/Keps | Todos los modos espaciales ni escucha de la propia transmisión en dúplex |
| Accesibilidad por voz | Voces externas y niveles de avisos; esenciales en GD77S | Voces integradas automáticamente en cualquier ZIP/idioma |

### Frecuencias del manual no son una homologación

En `Radio Options — Band Limits`, la guía distingue:

- Límites de TX por software, con un valor por defecto referido a EE. UU.: **144–148, 222–225 y 420–450 MHz**. **No son el plan de bandas español ni una autorización local.**
- Límites generales de sintonía descritos para las plataformas de ese capítulo: **127–178, 190–282 y 380–564 MHz**, excluyendo expresamente el intervalo intermedio en MD9600/RT90.
- Especificación del circuito AT1846S que cita el propio texto: **134–174, 200–260 y 400–520 MHz**, junto a advertencias de funcionamiento fuera de especificación.

Estos números describen contextos distintos. No deben convertirse en «bandas garantizadas de todos los modelos» ni aplicarse a DM32, UV008, RGB o MD380 por aparecer en un array local. El manual advierte de emisiones espurias en la banda intermedia por falta de etapas apropiadas: **esta ayuda no recomienda usarla para transmitir**. Configura los límites autorizados de tu país y las restricciones reales de tu equipo.

### Límites del codeplug frente a capacidad del equipo

El editor web cubre el binario estándar de **128 KiB** y excluye canales **1025+**. Esto no afirma que todas las radios tengan el mismo máximo total de canales, contactos, IDs o zonas. Los recursos de voz, registro GPS y bases de IDs compiten por memoria en algunas plataformas. La longitud elegida por entrada de la base de IDs también cambia su capacidad. Consulta el CPS/build y la memoria real de tu unidad.

## 7. Controles y bootloader: no hay secuencia universal

La guía usa nombres lógicos como SK1, SK2, Green, Red y Orange. Sus posiciones cambian por radio y, en los móviles, por panel o micrófono.

| Familia/modelo | Diferencia de operación documentada | Precaución |
| --- | --- | --- |
| GD-77 | Dos teclas laterales y botón superior; referencia del manual | No trasladar posiciones a cualquier Baofeng |
| GD-77S | Selector de 16 posiciones y modos anunciados por voz | No hay menús visuales ni teclado numérico |
| DM-1801 / DM-860 | Controles dedicados MR/VFO y A/B | La revisión 2022 no queda validada por tener botones parecidos |
| RD-5R / DM-5R Tier 2 | A/B y Band sustituyen izquierda/derecha; acceso largo a menú rápido | No tiene el mismo botón Orange físico que GD77 |
| MD-UV380 / RT-3S | Mando giratorio y funciones de flechas distintas | Comprobar el contexto: canal/VFO o menú |
| DM-1701 / RT-84 | P1/P2 realizan funciones izquierda/derecha | Paquetes propios y posiciones no intercambiables por intuición |
| MD-9600 / RT-90 | Panel y micrófono con correspondencias específicas | El barrido VFO no se maneja íntegramente desde el panel según la guía |
| MD-2017 | La guía incluye lámina específica de controles | No sustituirla por la lámina del UV380 |
| RGB / DM32 / UV008 / MD380 | No se han verificado instrucciones específicas en esta consulta | No inventar combinaciones |

Para instalar firmware, utiliza las instrucciones de la **variante exacta** del proyecto y el cargador correspondiente en OpenGD77 CPS. La guía diferencia combinaciones laterales en MK22, P1 y botón superior del móvil, y PTT con otra tecla en ciertos portátiles STM32. No se reproduce una receta universal porque ni la identificación ni el nombre comercial bastan para validar todos los casos.

En STM32, el contexto de bootloader DFU y su controlador es distinto del modo CPS/USB de uso normal. Una pantalla en blanco durante actualización puede ser normal. No pruebes combinaciones al azar ni escribas archivos de otra familia para intentar que aparezca un puerto.

## 8. Escenarios de selección segura

### «Tengo un DM-1801, ¿sirve el paquete DM1801?»

1. Identifica si es hardware versión 1 o la revisión nueva de 2022.
2. Si es la revisión excluida por la guía, no utilices el paquete OpenDM1801 basándote solo en el nombre.
3. Si es DM1801A, no lo sustituyas por DM1801: el catálogo y la publicación tienen destinos distintos.
4. Si no puedes determinar la revisión, conserva la configuración actual y detén la instalación.

### «Mi RT3S aparece como familia MD-UV380»

La asociación está documentada por el proyecto y por la etiqueta del catálogo. Comprueba de todos modos hardware, presencia de GPS y notas de la imagen. El nombre del grupo no prueba recepción de dos canales a la vez ni convierte la radio en 10W PLUS.

### «El conector reconoce DM32, ¿ya se puede programar?»

La etiqueta está prevista como tipo 11 y transporte SERIAL. No hay destino de firmware DM32 en `TARGETS`. No se ha confirmado aquí un paquete oficial ni todas las funciones. La web no concede permiso de escritura, aunque una identificación y lectura lleguen a completarse. Estado de OpenGD77 en el DM-32, instalación, copias y cómo compilar un firmware abierto: [guía DM-32UV](DM32UV-FIRMWARE.md).

### «Hay un ZIP oficial para MD2017: ¿por qué no figura al principio del manual?»

La guía evoluciona por secciones y su cabecera no enumera necesariamente toda publicación posterior. La lámina de controles y el índice oficial son evidencias adicionales concretas. No se deduce que cada detalle de otro modelo sea aplicable a MD2017 sin revisión.

### «Quiero restaurar mi MD9600 con una copia de otra unidad»

No uses calibración ajena. Distingue codeplug, recursos, calibración y firmware; identifica la revisión RF y conserva las copias de tu unidad. Una imagen descargada no reemplaza el respaldo MCU exigido por la política de la web.

## 9. Diagnóstico de compatibilidad

| Indicio | Interpretación prudente | Acción |
| --- | --- | --- |
| Existe en catálogo pero no en `MODELS` por su alias | El destino de descarga y la identificación no tienen por qué usar el mismo nombre | Revisar la familia documentada; no exigir igualdad literal de todos los alias |
| Existe en `MODELS` pero no en catálogo | Hay una etiqueta de protocolo, no un firmware descargable seleccionado | No elegir un modelo parecido como sustituto |
| El equipo responde como MD9600 | Se conoce la familia, no necesariamente HW1/2/4/5 | Determinar revisión antes de instalar |
| Es UV380 y el vendedor dice «Plus» | Puede ser un hardware con imagen distinta | Verificar placa y denominación completa |
| Es UV390 y aparece en la guía | Hay mención oficial, no selector local específico | Buscar las notas exactas de esa variante, no asumir ZIP UV380 |
| Es MD380 sin «UV» | Nombre de modelo diferente | No cargar `OpenMDUV380.zip` por coincidencia parcial |
| La familia seleccionada es rechazada | La identificación no coincide con el transporte esperado o formato admitido | Conservar error y no desactivar la comprobación |
| Respaldo termina como incompleto | Falta copia MCU completa en el flujo web | Exportar lo leído; mantener escritura bloqueada |
| Falta una función presente en capturas | Diferencia de build, plataforma, recursos o hardware | Comparar versión y notas, no solo marca/modelo |

### Lista de comprobación antes de afirmar soporte

- [ ] Modelo completo y fabricante registrados.
- [ ] Revisión real de placa confirmada cuando sea necesaria.
- [ ] Firmware, build y CPS anotados.
- [ ] Alias sustentado por fuente, no solo por una tienda.
- [ ] Imagen elegida por modelo/variante, no por parecido.
- [ ] GPS, RTC, potencia, pantalla y bandas no asumidos sin evidencia.
- [ ] Modo normal USB diferenciado de bootloader.
- [ ] Copias originales exportadas y alcance de cada una comprendido.
- [ ] Limitación de 128 KiB y canales extendidos aceptada.
- [ ] Escritura web mantenida **BLOQUEADA**.

## 10. Fuentes y alcance temporal

Todas las fuentes siguientes se consultaron el **2026-10-25**. Los enlaces identifican evidencia, no una autorización para descargar firmware de cualquier equipo en cualquier otro.

| Clave | Fuente verificada | Aporta |
| --- | --- | --- |
| G | [Guía oficial inglesa](https://raw.githubusercontent.com/LibreDMR/OpenGD77_UserGuide/master/OpenGD77_User_Guide.md); [referencia fija 33de63dcb002fcd837419fda25a2e535b940dbcd](https://github.com/LibreDMR/OpenGD77_UserGuide/blob/33de63dcb002fcd837419fda25a2e535b940dbcd/OpenGD77_User_Guide.md) | Modelos de instalación, advertencia DM1801 de 2022, alias expresos, controles y funciones por plataforma |
| R | [Repositorio LibreDMR/OpenGD77_UserGuide](https://github.com/LibreDMR/OpenGD77_UserGuide) | Procedencia de la guía y declaración GPL 2 para sus documentos; solo inglés mantenido |
| W | [Portada OpenGD77](https://www.opengd77.com/) | Estado del foro y acceso al archivo estático |
| A | [Archivo del foro](https://www.opengd77.com/archive/index.html) | Contexto histórico; la instantánea visible es de julio de 2025, no una matriz actualizada de 2026 |
| F1 | [GD77, 2026-05-04 / 946183e9002d277dfaba616a1eea15bfe959c692](https://www.opengd77.com/downloads/GD77/Firmware/20260504_946183e9002d277dfaba616a1eea15bfe959c692/) | Paquetes MK22 por modelo y variantes NMEA/Japanese donde existen |
| F2 | [MDUV380_DM1701, 2026-05-04 / ebd7100bb4c930e6ff0c24202474b5b72e7d6beb](https://www.opengd77.com/downloads/MDUV380_DM1701/Firmware/20260504_ebd7100bb4c930e6ff0c24202474b5b72e7d6beb/) | ZIP propios de UV380, UV380 10W PLUS, DM1701 y RT84 |
| F3 | [MD9600, 2026-05-04 / e779365405cbe4a73803a402626294764784b11f](https://www.opengd77.com/downloads/MD9600/Firmware/20260504_e779365405cbe4a73803a402626294764784b11f/) | ZIP HW V1/V2/V4/V5 y variantes japonesas |
| F4 | [MD2017, 2026-05-05 / 6b43740c89378240c0cabad0ca827e5b0963124e](https://www.opengd77.com/downloads/MD2017/Firmware/20260505_6b43740c89378240c0cabad0ca827e5b0963124e/) | Publicación de imagen MD2017 y variante japonesa |
| L | [`firmware-core.js`](../firmware-core.js), [`gd77-connector.js`](../gd77-connector.js), [`radio-ui.js`](../radio-ui.js) | Catálogo, etiquetas del protocolo y alcance real de lectura/edición/bloqueo web |

Las rutas `Latest` de esas familias apuntaban a los índices fechados citados; no se afirma que sean todas las builds disponibles ni que «Latest» signifique estable para cada unidad. Los nombres `Japanese`, `JA` o `NMEA` describen variantes de distribución, no nuevos modelos ni una equivalencia de capacidades.

La licencia GPL 2 declarada por el README de la guía **no demuestra una licencia MIT del firmware** ni licencia única de CPS, voces, donantes y códec. Revisa las condiciones de cada componente antes de redistribuir.

**Bloqueos y lagunas conservados expresamente:** falta de copia MCU íntegra en la web; revisión comercial ambigua en ciertos equipos; falta de correspondencia verificada para UV390 por variante; ausencia de soporte completo demostrado para DM1701RGB, DM32, UV008 y MD380 solo por sus etiquetas. Ninguna de estas lagunas se rellena atribuyendo a todos los modelos las funciones del manual general.
