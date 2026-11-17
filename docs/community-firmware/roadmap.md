# Oportunidades priorizadas

Son propuestas para investigación/desarrollo independiente, no funciones ya implementadas ni compromisos. Referencias en [evidence.json](evidence.json).

| Prioridad | Oportunidad | Motivo y evidencia | Criterio propuesto de aceptación |
|---|---|---|---|
| P0 | Matriz estricta de placa/MCU/bootloader/imagen | Separación V1/K1/V3 y casos PY32F030; selección incompatible reportada. C01, C08, C20, C28, C29 | Rechazo explícito de identidad desconocida; modelo, revisión, versión y hash fijados por fuente primaria. |
| P0 | Límites de copia y recuperación | Calibración/configuración distintas y supuesto efecto de datos residuales. C36, C39 | Pruebas independientes de cada formato y de interrupción, sin presentar una recuperación anecdótica como garantía. |
| P1 | Terminar revisión semántica exhaustiva | Todas las páginas están indexadas, no todos los mensajes leídos. [Cobertura](coverage.md) | Lotes cronológicos revisados íntegramente, contexto y exclusiones auditables; ampliar vocabulario multilingüe y revisar falsos negativos. |
| P1 | Matriz de funciones por versión | Notas históricas y desajuste de manual/módulo. C04, C05, C10–C13, C35 | Cada función fija compilación y destino; lo desconocido no se rellena desde versiones posteriores. |
| P1 | EEPROM por pieza exacta | Tiempos, sufijos, reinicio incompleto y variantes ampliadas. C12, C17, C30, C31 | Especificación primaria y pruebas por parte/configuración; unidades y 999/1000 canales conciliados. |
| P1 | Regresiones RX/espectro/menús | Canales omitidos, DCS, SQL y menús. C02, C07, C18, C22, C34 | Casos mínimos por versión, con fallos no resueltos explícitos. |
| P1 | Adaptadores de datos/programación por versión | Módulos CHIRP iniciales y diferencias de herramientas. C01, C13, C37–C39 | Identidad y formato comprobados antes de permitir cualquier migración; simulación sin hardware. |
| P2 | Multiboot con especificación propia | Alcance V1 e hipótesis sobre teclas/bootloader. C25–C27 | Mapa y rutas de arranque por plataforma; ninguna generalización a PY32 sin pruebas. |
| P2 | Peticiones de historial, memoria y tonos | Solicitud de EEPROM Karina y tonos durante barrido. C24, C40 | Mantener estado petición frente a implementación; medir impacto y límites por hardware. |

No convertir afirmaciones de velocidad (C18, C32) en objetivos garantizados sin un benchmark reproducible. No cambiar políticas TX por una petición comunitaria.
