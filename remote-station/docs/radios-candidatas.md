# Radios candidatas

La prioridad inicial es Yaesu FTX-1 / SPA-1. El propietario añadió además
(tr)uSDX y QMX+. La lista completa de 44 modelos que RemoteMyShack publica como compatibles,
junto con TRuSDX, QMX+ y Elecraft K3/KX3/KX2, se conserva como catálogo de investigación de 49
candidatas. La API y la consola muestran estas entradas separadas del estado de
capacidades; ninguna constituye soporte BricoHams.

Ninguna de las 49 candidatas tiene un driver BricoHams validado. Para ver las
afirmaciones de conexión por modelo, bandas y disponibilidad de scope, consulta
la [matriz de conexiones candidatas](radio-conexiones-candidatas.md). El catálogo
de API se sirve en `GET /api/v1/radios`.

Las 44 fichas RemoteMyShack son fuentes de terceros. Sus campos de conexión,
bandas, scope, beta y pruebas se conservan como afirmaciones atribuidas, no como
hechos confirmados por manuales de fabricante ni pruebas BricoHams. Scope listado
no demuestra exportación de muestras nativas; “tested” por el tercero no implica
prueba propia. TRuSDX y QMX+ usan documentación pública de sus respectivos
proyectos, pero también siguen en estado candidato.

K3/KX3/KX2 se añaden desde la referencia oficial Elecraft G5:
subconjunto CAT de lectura y transporte serie experimental opt-in.
La [ficha conjunta](hardware/elecraft-k3s.md) documenta las diferencias.
No son modelos atribuidos a RemoteMyShack ni hardware validado.

La secuencia de integración requiere, para cada modelo, documentación pública,
protocolo específico, prueba de desconexión y prueba de no-TX. El soporte
observado en otra marca/modelo no se hereda.
