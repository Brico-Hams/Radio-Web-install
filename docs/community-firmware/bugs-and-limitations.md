# Problemas, limitaciones y contradicciones

Las referencias Cxx remiten a [evidence.json](evidence.json), que conserva las fechas exteriores corregidas. “Corregido” significa **anunciado**, no reproducido ni comprobado en laboratorio.

| Caso | Evidencia y alcance | Estado y límites |
|---|---|---|
| PY32F030 | Un informe UV-K6 advierte de bloqueo con bootloader 1.01.01; otro describe restauración de fábrica para UV-K5 V2 con otras versiones. C28, C29 | Modelos distintos y posible evolución temporal. No convertirlos en una receta universal ni afirmar bloqueo irreversible. |
| Imagen V1 en contexto V3 | Un usuario dice haber pasado desde F4HWN 5.7 a la imagen del hilo RO-KO en K5 V3, obteniendo un equipo inoperativo; dice recuperarlo con F4HWN 5.9. Una respuesta limita RO-KO a V1. C08, C20 | **No dice que F4HWN 5.7 causase el fallo.** El contexto apunta a selección de imagen incompatible; la causa y recuperación no están verificadas. |
| DCS en port PY32 F4HWN | Avance de desarrollo del 27-11-2025 declara pendiente un fallo de subtonos DCS en K1/V3. C02 | No hay cierre demostrado para esa compilación. Arreglos DCS en otras ramas no lo resuelven automáticamente. |
| Menú F4HWN | Usuario con Fusion v5.5.0 informa que no funcionan menú y menú oculto. C07 | Falta revisión de placa, configuración y reproducción. Sin solución confirmada. |
| Recepción IJV 3.6 | Usuario informa siseo cuando transmite cerca otra radio en una frecuencia no memorizada. C33 | Sin condiciones controladas ni causa; sobrecarga es solo una hipótesis, no diagnóstico. |
| EEPROM M24M02 | Informes IJV/Reborn mencionan incompatibilidad, reinicio de borrado alrededor del 27 % y discrepancias de tiempos según sufijo. Una nota posterior ofrece IJV VS3.32 con 12 ms para memoria lenta. C12, C17, C31 | Posible corrección posterior o piezas diferentes. No prescribir tiempos desde el chat. |
| SI4732 / Reborn | Se informa FM funcional y SSB no funcional en una combinación fechada; el soporte ampliado se describe experimental. C17 | Sin inventario completo ni resolución. No extrapolar a todas las placas SI4732. |
| Barrido incompleto | Una lista anuncia correcciones del último canal fantasma/omitido y frecuencia aleatoria en 200 canales. C34 | Versión exacta desconocida; son casos de regresión, no fallos activos demostrados. |
| SQL y calibración | Consejo de calibración muy sensible se limita expresamente a Fagci. C16 | No transferible a otra radio o familia. No se copiaron ni aplicaron calibraciones. |
| Manual frente a versión | Documento presentado como manual F4HWN v2.8 contiene referencia CHIRP v2.6. C35 | Deriva de documentación; no aplicar todo el manual a v2.8.1. |
| Menú oculto / multiboot | Usuario describe interferencia con secuencias de arranque y supone una causa en el bootloader. C27 | Hipótesis sin reproducción ni arreglo confirmado. |
| Batería / RO-KO | v1.2.8 anuncia arreglo de bloqueo por debajo de 7 V y cambios EEPROM; v1.4.4 reconoce visualización persistente imperfecta del tono. C21, C22 | Notas de cambios, no mediciones físicas. No prometen protección para otras versiones. |
| Cambio de firmware / datos residuales | Un informe atribuye un bloqueo al pasar de stock a Karina a celdas que un reinicio no limpia. C36 | Explicación del usuario, sin prueba causal. No reproducir su propuesta de borrado completo como procedimiento seguro. |
| Host K5Prog | Una publicación califica v1.27 como problemática y recomienda v1.26. C37 | Informe histórico, sin caso mínimo ni verificación del programa. No indica el estado actual. |
| Cable y control remoto | Descripción de Quansheng Dock advierte que el cable puede desconectar audio local y que una carga inadecuada puede perturbar datos serie. C38 | No se validó cableado ni compatibilidad. No se reproduce el montaje como instrucción. |

## Conciliación

Las familias, chips y compilaciones se mantienen separadas. Un arreglo anunciado en una rama no cierra un informe de otra; una versión posterior que aparentemente arranca no identifica la causa anterior. Los tiempos de EEPROM y las cifras 200/999/1000 pueden describir formatos o capacidades diferentes. La clasificación de contradicciones está explícita en cada registro, sin inventar una resolución.
