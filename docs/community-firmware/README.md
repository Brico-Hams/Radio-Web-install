# Conocimiento comunitario sobre firmware

Síntesis técnica anonimizada de una exportación local de Telegram, usando Radio-Web-install como referencia de nombres y límites. Las publicaciones exteriores abarcan **2024-01-06–2026-11-01**; las fechas antiguas dentro de reenvíos no amplían ese periodo. No es un catálogo de versiones actuales ni una certificación de compatibilidad.

**Alcance real:** se indexaron las 36 páginas completas; se revisaron mensajes y documentos seleccionados con su contexto, pero no se leyó semánticamente cada mensaje ni todo el contenido extraído de los manuales. Por tanto, este expediente **no cumple todavía una extracción exhaustiva de TODO el conocimiento**. [Cobertura](coverage.md) detalla lo realizado y lo pendiente.

## Contenido

- [Matriz de firmware](firmware-matrix.md): familias, hardware y evolución documentada.
- [Guía de desarrollo](developer-guide.md): restricciones, hipótesis y desarrollo independiente.
- [Problemas y límites](bugs-and-limitations.md): informes, contradicciones y arreglos anunciados.
- [Oportunidades priorizadas](roadmap.md): propuestas respaldadas por evidencias.
- [Registro de evidencias](evidence.json): afirmaciones, aplicabilidad, fechas y anclas locales, sin cuerpos de mensajes.
- [Referencias técnicas](links.md): enlaces publicados, sin comprobación remota.
- [Expediente especializado UV-5K V3](../quansheng-uv-5k-v3/README.md): revisión independiente en español. **UV-5K V3 es el nombre solicitado; UV-K5 V3 es la grafía de las fuentes. Su equivalencia no está demostrada.** Este expediente general conserva la grafía original al atribuir afirmaciones.

Las guías locales de [firmware](../../ayuda-firmwares.html), [Quansheng](../../ayuda-quansheng.html), [presets F4HWN](../../ayuda-presets-f4hwn.html), [ARDF](../../ayuda-ardf.html) y [modelos OpenGD77](../../ayuda-opengd77-modelos.html) describen una instantánea del repositorio, no una nueva verificación de fuentes externas. El registro distingue estas referencias mediante los identificadores R01–R04.

## Reglas de evidencia y privacidad

Los identificadores C01–C42 remiten a afirmaciones parafraseadas; la confianza expresa fidelidad de la atribución, **no probabilidad de funcionamiento en otra radio**. Un anuncio compartido no es una publicación primaria verificada; una petición no demuestra implementación; un supuesto diagnóstico no demuestra causalidad. Las versiones y modelos no se generalizan.

No se publican participantes, teléfonos, nombres privados, rutas personales, texto bruto, medios ni código de terceros. Los nombres de familias y proyectos se conservan únicamente como terminología técnica. Los enlaces públicos seleccionados corresponden a proyectos, no a participantes privados.

No se ejecutaron adjuntos, scripts, HTML/JavaScript ni binarios; no se abrieron puertos ni equipos, ni se hicieron pruebas de radio. No se consultaron servicios externos ni se instalaron dependencias.

## Extracción reproducible local

El analizador usa exclusivamente la biblioteca estándar de Python. Guarda fechas exteriores y de reenvío por separado, entidades, texto multilínea, anclas, respuestas y referencias inertes a adjuntos/enlaces. La clase `service` se contabiliza independientemente del formato numérico del identificador.

```powershell
python tools\community-firmware\test_extract_telegram.py
python tools\community-firmware\extract_telegram.py "<directorio-local-de-exportacion>" --work-dir tmp\community-firmware
```

`tmp/community-firmware/` está ignorado por Git y contiene índices privados, inventario y extracciones intermedias. Su `README.txt` explica que el original permanece local. No publicar ni ejecutar ese contenido.
