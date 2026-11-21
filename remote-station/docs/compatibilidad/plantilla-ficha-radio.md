# Ficha de soporte: <fabricante> <modelo>

> Estado inicial: `unsupported`. Completar evidencia antes de implementar o
> anunciar compatibilidad. No copiar protocolos privados ni código de terceros.

## Identificación

- Fabricante/modelo:
- Firmware revisado:
- Accesorios:
- Fuentes oficiales y revisión:
- Fuentes de implementación abiertas consultadas/licencias:

## Conexión física y enumeración

- Tipo de enlace documentado:
- VID/PID e interfaces observadas:
- Cómo seleccionar el puerto correcto sin asumir el primero:
- Serie (baud, bits, paridad, stop bits, flow control):
- Audio USB (interfaces/canales/rutas):
- RTS/DTR y riesgos:

## Capacidades por evidencia

| Función | Estado | Documento/comando/API | Prueba automatizada | Prueba física/fecha | Límites |
|---|---|---|---|---|---|
| Lectura CAT | `unsupported` | | | | |
| Escritura CAT | `unsupported` | | | | |
| Scope nativo (muestras) | `unsupported` | | | | |
| Waterfall nativo | `unsupported` | | | | |
| Audio RX | `unsupported` | | | | |
| PTT/TX | `unsupported` | Fase TX bloqueada | | | |

## Pruebas y recuperación

- Enumeración/reconexión USB:
- Fallo de cable/energía:
- Fallo de red:
- Aseguramiento de no-TX:
- Sistemas/versiones probados:
- Hardware/firmware realmente usado:

## Decisión

Indicar capacidades que pasan a `implemented_untested`, `experimental` o
`verified`, con responsable y fecha. No marcar `verified` sin prueba reproducible
en hardware real y revisión de seguridad.
