# Problemas, enfoques y resultados

La cronología conserva la incertidumbre. Una pregunta, sugerencia de solución provisional, anécdota parecida o comprobación estática correcta no se convierte en una reparación confirmada. Las referencias del chat no reproducen mensajes ni identificadores personales; resuelve los IDs en [evidence.json](evidence.json).

## 2025-04: nombre UV5K ambiguo y pregunta sobre SI4732/almacenamiento ampliado

- **Síntomas/pregunta:** un mensaje con fecha externa 2025-04-21 (reenviado; fecha original 2025-04-16) menciona «UV5K» y programación de frecuencias satelitales mediante CHIRP; otro pregunta qué firmware conviene para un `uv5k` con SI4732 y 2 MB de almacenamiento ampliado (CHAT-UV5K-01, -02).
- **Condiciones:** estos mensajes no especifican V3, identificador de placa ni imagen de firmware verificada.
- **Hipótesis en competencia:** grafía informal de UV-K5; V1 modificada; otro nombre de modelo/paquete. La mención de SI4732 podría referirse a una modificación concreta, pero no demuestra que la placa V3 incluya ese receptor.
- **Diagnósticos en la exportación:** no consta ninguno que identifique la placa o verifique una respuesta.
- **Enfoque rechazado:** considerar `UV5K`, la referencia a SI4732 o la capacidad de 2 MB como prueba de compatibilidad UV-K5 V3.
- **Parche/configuración/solución provisional aplicada:** ninguno establecido por esos dos mensajes.
- **Resultado:** nombre y hardware sin resolver. El atlas del repositorio también considera no verificado el soporte de SI4732 en V3.

## 2025-12: pregunta sobre el nombre UV-5K(8)V3

- **Síntoma:** un usuario pregunta si `UV-5K(8)v3` es una opción adecuada en respuesta a una pregunta general sobre elección de radio (CHAT-UV5K-03; mensaje padre CHAT-UV5K-03-P).
- **Condiciones:** no se inspeccionó ninguna unidad ni bootloader.
- **Hipótesis en competencia:** transposición del nombre UV-K5(8) V3 o cadena usada por una tienda/comunidad.
- **Diagnósticos probados:** la exportación conserva la pregunta y el enlace de respuesta, no un procedimiento de identificación ni una recomendación probada.
- **Enfoque/resultado:** la evidencia no registra una recomendación ni resolución. Tratar la grafía como posible alias, no como objetivo de imagen.

## 2025-12: adjunto de firmware en una conversación V3

- **Síntoma/contexto:** en una conversación relacionada con V3 se enlaza un binario identificado como compilación alpha de Hawk5/Fagci (CHAT-ATTACH-01).
- **Enfoque:** registrar solo nombre, tamaño, SHA-256 y primeros 32 bytes. No se ejecutó, descifró ni desensambló; no se infirieron funciones.
- **Resultado:** la cabecera no establece mapa de vectores ni arquitectura de aplicación. No se considera imagen UV-5K V3 verificada; no flashear basándose en esta evidencia.

## 2026-03-07: bloqueo de UV-5R Plus tras usar material UV-5K

- **Síntoma informado:** un usuario describe una UV-5R Plus que deja de arrancar normalmente después de seguir material identificado para UV-5K; el informe solo indica que quedó visible un indicador de modo de actualización (CHAT-BRICK-01).
- **Modelo/condiciones:** es un informe sobre UV-5R Plus, no una unidad V3 confirmada. La referencia de hardware del repositorio sitúa 5R Plus V1 en la familia V1; no se inspeccionaron MCU, imagen ni radio.
- **Hipótesis en competencia:** firmware/herramienta inadecuados para el hardware; actualización interrumpida/incompleta; otro problema de bootloader o conexión. El mensaje no permite aislar la causa.
- **Diagnósticos probados:** el informe no documenta ninguno; no aporta imagen exacta, registro de herramienta, checksum ni versión de bootloader.
- **Enfoque rechazado:** tratar todas las etiquetas «Quansheng UV-5K/5R Plus» como un mismo objetivo o suponer que una imagen de recuperación V3 sirve.
- **Respuesta sugerida:** otro mensaje, independiente, dice que Karina ayudó en una situación parecida y menciona que faltaba la calibración original (CHAT-BRICK-02). No responde expresamente al informe anterior ni identifica esa UV-5R Plus.
- **Parche/solución provisional y resultado:** no hay evidencia de reparación confirmada de la radio de CHAT-BRICK-01. La anécdota separada no es una solución verificada para ese equipo.
- **Sin resolver:** revisión de hardware, imagen fallida, estado del bootloader, recuperación exacta y procedencia de la calibración.

## 2026-03-11: CHIRP presenta los datos de Karina como solo lectura

- **Síntoma informado:** un mensaje describe una radio llamada `UV-5K V3`, supuestamente con una versión coincidente de Karina, en la que un intento de editar canal/nombre parece de solo lectura (CHAT-CHIRP-01).
- **Condiciones:** no se establecen de forma independiente la compilación exacta de Karina, versión de CHIRP, controlador, formato descargado, estado de conexión ni texto de error.
- **Hipótesis en competencia:** controlador CHIRP incorrecto/genérico; vista previa o exportación de solo lectura en vez de radio conectada; capacidad de escritura específica del firmware; discrepancia de formato/permisos; conexión fallida.
- **Diagnósticos probados:** el mensaje informa el síntoma, no una comparación terminada ni un registro de pruebas. No se encontró respuesta explícita que lo resuelva.
- **Enfoque rechazado:** afirmar que un escritor de canales, otro firmware o cambiar parámetros lo arregla sin una pareja de controlador/compilación coincidente y evidencia de lectura posterior.
- **Parche/configuración/solución provisional:** el chat no confirma ninguno. Las recomendaciones generales del repositorio distinguen controladores CHIRP V1 y V3, pero eso no demuestra una reparación para Karina V3.
- **Resultado:** sin resolver. El mensaje acredita solo un informe de usuario, no un defecto del firmware ni una escritura correcta.

## Cronología del paquete Karina V3 (notas secundarias, no ensayos independientes)

El inventario local del repositorio sobre el paquete `21.09.2026` para V3/K1 parafrasea su changelog. No es un historial completo ni demuestra que se probara cada cambio:

| Nota fechada del paquete | Síntoma/condición descrita | Enfoque/cambio informado | Evidencia del resultado y límites |
|---|---|---|---|
| Notas 2026-08-21 | Bloqueo/cierre de RX asociado a un ajuste Roger-5 en una versión experimental | La entrada describe una corrección; no están disponibles el diff ni el procedimiento exacto | Solo informe del paquete/changelog; sin reproducción independiente |
| Notas 2026-09-21 | La aceleración del barrido se había vinculado a un ajuste; también cambiaron el cierre del squelch AM y la medición CTCSS/DCS | Las notas describen la aceleración como permanente e informan cambios de recepción/medición | Afirmación de notas de versión, no resultado de banco RF; comprobar a qué versión aplica |
| Varias notas del paquete | Cambios no relacionados con canales en CHIRP pueden romper el beacon o dejar la radio bloqueada; se desaconsejan algunos ajustes `NONE` | Usar solo la pareja controlador/compilación documentada para ese paquete; detenerse si los datos aparecen como solo lectura o falla la verificación | Aplicabilidad incierta entre versiones V1/V3/K1; no acredita solución para CHAT-CHIRP-01 |

Para resolver un fallo reproducido, el proceso adecuado es obtener un changelog/diff versionado, mantener constantes hardware y compilación, definir una regresión solo de recepción y comparar antes/después. No se debe inferir que un paquete posterior resuelve el caso concreto de un usuario.

## 2026-10: sin prueba de fuente/compatibilidad para Karina V3

- **Problema:** las notas de funciones del paquete no proporcionan árbol fuente, receta de compilación, mapa de enlace, licencia explícita ni evidencia de que Karina cumpla el formato de slots de F4HWN.
- **Enfoque:** inspeccionar el inventario registrado y los datos estáticos de vectores/cabeceras; mantener separados los artefactos V1 y V3; no traducir inversamente, modificar ni redistribuir el binario.
- **Enfoques rechazados:** inferir fuente/licencia a partir de un proyecto vecino; inferir compatibilidad de slots a partir de un vector PY32 plausible; inferir una reparación de un firmware con nombre parecido o de una anécdota comunitaria no vinculada.
- **Resultado:** es posible elaborar un inventario prudente de funciones, pero siguen sin resolverse el mecanismo a nivel de fuente, las reparaciones reproducibles y la equivalencia completa.

## Recuperación y gestion de datos: aspectos comunes

- Conservar la calibración propia de la radio antes de cualquier mantenimiento futuro autorizado; es específica de cada unidad. En esta tarea no se leyó ni se publicó ningún adjunto `.dat` de calibración.
- Un nombre de archivo, checksum, forma de vector o lectura correcta de canales no prueba compatibilidad segura de escritura.
- El código del conector V3 del repositorio bloquea la escritura cuando falta la capacidad necesaria de lectura/CRC de flash o una copia de seguridad completa y verificada. Es una protección observada en el código host, no una reparación de los informes comunitarios.
- En esta investigación no se aplicó parche ni cambio de configuración/firmware, ni se hizo escritura en radio, conexión USB/serie, medición RF ni transmisión.
