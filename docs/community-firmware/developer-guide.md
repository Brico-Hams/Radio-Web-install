# Guía para desarrollar firmware independiente

Este es un documento de investigación, no una receta de programación. Las recomendaciones siguientes son **propuestas de diseño**, no capacidades demostradas. Para la plataforma solicitada, consultar el [expediente UV-5K V3](../quansheng-uv-5k-v3/README.md) sin asumir su equivalencia con UV-K5 V3.

## Identidad y arquitectura

Registrar modelo comercial, placa, MCU/revisión, chip RF, memoria y bootloader por separado de familia, versión, commit, opciones y hash del firmware. El anuncio F4HWN distingue V1/DP32G030 de K1-V3/PY32F071 y teclas diferentes por modelo (C01). Los informes PY32F030 requieren otra clasificación (C28, C29).

| Superficie | Conocimiento utilizable | Investigación pendiente |
|---|---|---|
| Compilación y espacio | F4HWN anuncia márgenes mínimos por edición V1 y mejoras del script de compilación. C04, C05 | Fijar toolchain, commit, opciones, mapa del enlazador y presupuesto de pila/RAM. El chat no proporciona un entorno completo reproducible. |
| Almacenamiento | IJV separa memoria original y ampliada, con variante lenta; otros informes conservan 200 canales pese a ampliar el chip. C11–C13, C30, C31 | Especificar mapa, unidades, geometría, tiempos de escritura y formatos por chip. No confundir flash externa con EEPROM ni copiar tiempos anecdóticos. |
| Configuración/calibración | Los mensajes distinguen ambas copias; CHIRP y utilidades dependen de la versión. C01, C39 | Separar formatos y propiedad por equipo, migraciones y validación. No usar calibraciones de otra radio. |
| Arranque/multiboot | El proyecto V1 y un problema de menú tienen evidencia comunitaria limitada. C25–C27 | Verificar bootloader, mapa, teclas y recuperación por hardware. CRC de almacenamiento, arranque y funcionamiento RF son pruebas diferentes. |
| UART/USB/CAT | Dock, K5Prog, UVTools2 y CHIRP aparecen en contextos distintos. C01, C37–C39 | El chat revisado no define un protocolo CAT ni mapa completo de comandos. No inventar opcodes, framing o ABI. Para el conector local, usar documentación versionada del repositorio. R02 |
| RF, squelch y espectro | Hay cambios anunciados de AGC, SQL, AFC, subtonos y listas de barrido. C12, C18–C22 | Medir sensibilidad, saturación, latencia y persistencia por build. Una pantalla no demuestra DSP, calidad RX ni capacidad TX. |

La vista previa de chips K1/V3 (C03) debe contrastarse con esquema y datasheets primarios de la revisión exacta antes de diseñar drivers. No se inspeccionaron árboles vendorizados ni código del export para completar lagunas.

## Procedencia y licencias

Mantener implementación propia y referencias separadas. Registrar titular, licencia y avisos originales por componente; un enlace, un archivo compartido o la licencia del sitio web no autorizan copiar firmware/manuales/controladores ajenos. El repositorio distingue licencias por componente (R04); no se comprobó aquí la licencia exacta de cada binario.

Parafrasear hechos observables y especificaciones verificadas; no copiar implementaciones, calibraciones ni recursos del chat. Etiquetar peticiones (C24, C40), hipótesis (C27, C36) y anuncios frente a pruebas. La confianza de evidencia mide la atribución, no certifica el hardware.

## Plan de validación propuesto

1. Identificar placa/MCU/bootloader e inmovilizar referencias primarias y licencias.
2. Especificar formatos, límites, rangos RX/TX, calibración y migración sin escrituras implícitas.
3. Fijar compilación reproducible y presupuestos de memoria por destino.
4. Crear pruebas de host para framing, límites, corrupción, fallos de identidad y estados interrumpidos.
5. Simular actualización y restauración con dispositivos ficticios; no reintentar borrados o reinicios automáticamente ante timeout.
6. Solo con autorización futura independiente, validar físicamente la revisión exacta, distinguiendo lectura, integridad, arranque, RX y TX. **Este trabajo no realizó ninguna de esas pruebas físicas.**

Casos de regresión sugeridos: último canal del barrido (C34), DCS por rama/versión (C02, C12), teclas por modelo (C01, C07), memoria lenta/persistencia (C12, C21, C31), y selección de imagen V1/V3 (C08, C20).

## Referencias locales

Las guías de [firmware](../../ayuda-firmwares.html), [Quansheng](../../ayuda-quansheng.html), [atlas V3](../../ayuda-atlas-uv-k5-v3.html), [ARDF](../../ayuda-ardf.html) y [OpenGD77](../../ayuda-opengd77-modelos.html) mantienen sus propios límites. `firmware-catalog.js` y `precompiled/chirp/manifest.json` describen verificación/catálogo del sitio, no compatibilidad física universal. R01–R04.
