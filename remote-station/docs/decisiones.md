# Decisiones técnicas y estado

Este registro se amplía con cada cambio de arquitectura. Las decisiones marcadas
como objetivo no describen código ya disponible.

## ADR-001 — Contratos JSON tipados y versionados

- **Decisión:** separar el número de API (`v1`) de las versiones de esquema.
- **Motivo:** permitir evolucionar agentes, servidor y clientes de manera
  independiente.
- **Estado:** implementado en la base local.

## ADR-002 — Coordinador local Python sin dependencias runtime

- **Decisión:** Python 3.12 y biblioteca estándar para el coordinador inicial.
- **Motivo:** un primer ejecutable pequeño y comprobable en el entorno disponible,
  sin atar la fase inicial a un framework/servicio externo.
- **Límite:** no es una afirmación de rendimiento/producción ni un diseño final
  del agente de hardware.
- **Estado:** implementado localmente. La suite local pasó en Windows; Linux,
  macOS y FreeBSD aún no validados.

## ADR-003 — Simulación explícita

- **Decisión:** toda respuesta simulada incluye `data_is_simulated: true`,
  `source: deterministic_simulator` y hardware desconectado.
- **Motivo:** impedir que telemetría sintética se interprete como observación RF.
- **Estado:** implementado y probado.

## ADR-004 — Capacidad por modelo con evidencia, no por familia

- **Decisión:** no heredar soporte de una marca ni de otro modelo; registrar
  documento, implementación, test, hardware y fecha por función.
- **Motivo:** evitar inferir soporte a partir de CAT genérico o de una lista
  comercial.
- **Estado:** esquema inicial implementado; FTX-1, (tr)uSDX y QMX+ están
  registrados como perfiles candidatos sin validación de hardware.

## ADR-005 — Sin ruta TX en la primera versión

- **Decisión:** no exponer comandos arbitrarios, CAT de escritura, MOX/PTT ni TX.
- **Motivo:** una ruta remota de transmisión requiere autorización expresa,
  revisión de seguridad y pruebas físicas de watchdog/unkey.
- **Estado:** implementado como API de solo lectura y cubierto por pruebas.

## ADR-006 — Loopback por defecto; HTTPS explícito para acceso remoto

- **Decisión:** HTTP solo en IPv4 loopback; escucha externa con TLS explícito,
  enlace HTTPS validado al agente y secreto dedicado distinto de los usuarios.
- **Motivo:** no exponer el servicio sin TLS, identidad del agente, sesiones,
  revocación y políticas de red.
- **Estado:** implementado y probado con TLS real, hostname/CA y CORS acotado.
  Identidad persistente, mTLS, revocación y sesiones distribuidas están pendientes.

## ADR-007 — Separar agente hardware y UIs web

- **Decisión objetivo:** servicio de agente con adaptadores de hardware; servir
  desde el agente una UI web local de configuración/diagnóstico, y ofrecer una
  consola web/PWA para operación remota. El cliente Android será un proyecto
  separado.
- **Motivo:** el acceso serial/USB/audio pertenece al proceso local privilegiado,
  no a permisos del navegador.
- **Estado:** consola web general y API local de inventario implementadas; el
  agente no tiene drivers, UI de configuración ni cliente Android.

## ADR-008 — Referenciar Hamlib sin copiar backend

- **Decisión:** usar la evidencia pública del backend FTX-1 de Hamlib para
  priorizar investigación; no copiar ni traducir su implementación. Cualquier
  uso de bibliotecas/ejecutables Hamlib requiere revisión de licencia e
  integración antes de distribuir.
- **Motivo:** conservar desarrollo original y respetar las obligaciones de
  licencias de terceros.
- **Estado:** solo investigación; ninguna dependencia Hamlib incluida.

## ADR-009 — UI y agente multiplataforma

- **Decisión objetivo:** frontend web responsive como cliente primario; el agente
  ofrece UI de diagnóstico en navegador local. Kotlin/Android se reserva para un
  cliente/agente Android con USB Host real. El núcleo de drivers multiplataforma
  se seleccionará después de una prueba de concepto de serie/audio en Windows,
  Linux/Raspberry Pi, macOS y FreeBSD.
- **Motivo:** la compatibilidad Android USB/audio y la disponibilidad de APIs de
  dispositivo varían por hardware/SO.
- **Estado:** objetivo no validado. No se afirma todavía soporte FreeBSD ni
  compatibilidad Android. La consola web existe y se probó en Windows; los
  demás sistemas/navegadores siguen sin validación.

## ADR-010 — Fuentes públicas como evidencia, no como permiso para copiar

- **Decisión:** usar documentación oficial y proyectos abiertos para contrastar
  protocolos y licencias; no reutilizar código, arte o protocolos propietarios.
- **Motivo:** mantener el desarrollo original y hacer verificables las afirmaciones.
- **Estado:** investigación y referencias documentadas; integración externa nula.

## ADR-011 — Consola local de solo lectura y mismo origen

- **Decisión:** implementar la consola web como React/TypeScript; servir su build
  desde el coordinador local y usar proxy de desarrollo Vite a la API de loopback.
- **Motivo:** evitar CORS y no exponer una URL remota ni nuevas rutas de radio;
  mantener separadas la UI y las respuestas autorizadas por rol.
- **Decisión de seguridad:** el token se guarda solo en memoria de pestaña,
  nunca en cookies o almacenamiento persistente. El servidor aplica CSP al build.
- **Estado:** implementado y probado localmente en Windows; navegador/servidor en
  otras plataformas pendientes de CI y validación específica.

## ADR-012 — CAT por lista permitida y protocolo sin transporte

- **Decisión:** implementar consultas QMX+ documentadas como enum y parsers puros
  para frecuencia/modo. No abrir el puerto ni aceptar texto CAT libre; conservar
  la capacidad de hardware como `unsupported`.
- **Motivo:** el manual CAT QMX+ documenta las consultas y formatos básicos, pero
  advierte que DTR puede key/PTT según configuración. FTX-1 carece de manual
  oficial cotejado y (tr)uSDX requiere mantener RTS bajo, DTR alto según su sitio.
- **Estado:** encoder/parser QMX+ probado con respuestas sintéticas; transporte
  serie y pruebas en radios físicas pendientes.

## ADR-013 — Agente de inventario no clasifica ni abre puertos

- **Decisión:** usar `pyserial` para enumerar interfaces con `include_links=False`,
  exponer solo metadatos no únicos por API loopback y dejar la clasificación como
  `unknown`; el coordinador solo reenvía ese GET autenticado.
- **Motivo:** no elegir el primer COM como CAT ni disparar señales/acciones al
  abrir el dispositivo; los metadatos `hwid` pueden filtrar números de serie.
- **Estado:** inventario y proxy implementados; aún no hay prueba con radios ni
  enumeración física validada por sistema operativo.

## ADR-014 — Catálogo de candidatos separado del soporte BricoHams

- **Decisión:** exponer en `GET /api/v1/radios` las 44 fichas de referencia de
  RemoteMyShack y los dos candidatos solicitados por el propietario, preservando
  por separado afirmaciones sobre conexión, bandas, scope, beta y pruebas de
  terceros.
- **Motivo:** hacer visible la cobertura objetivo sin convertir fichas comerciales
  o afirmaciones de terceros en compatibilidad propia, evidencia CAT o pruebas
  físicas.
- **Estado:** endpoint versionado y vista web implementados; los 46 modelos
  continúan como candidatos y el catálogo de capacidades no declara drivers.

## ADR-015 — Codec (tr)uSDX limitado a consultas documentadas

- **Decisión:** permitir solo las consultas `FA;`, `MD;`, `IF;` e `ID;` en un
  codec puro; parsear frecuencia, modo e identificación, pero no el estado `IF`
  hasta que se documente exactamente su formato de respuesta.
- **Motivo:** la documentación pública lista también comandos de escritura,
  streaming y señales RTS/DTR con efecto físico. El software no debe accionar
  CW/PTT ni interpretar un formato incompleto.
- **Estado:** encoder/parser probado con tramas sintéticas; serie y radio física
  no se usan. La capacidad sigue `unsupported`.

## ADR-016 — Codec FTX-1 sin conversión de frecuencia pendiente de manual

- **Decisión:** incluir únicamente consultas predefinidas `FA;`, `FB;`, `MD;` e
  `ID;`, parsear el campo de frecuencia de nueve dígitos como texto y reconocer
  el ID CAT `0840`. No parsear el modo ni convertir el campo a Hz.
- **Motivo:** la lista CAT específica de Hamlib marca estos comandos como
  legibles y su backend describe el campo como frecuencia en Hz, pero el ejemplo
  `FA000014074;` requiere cotejo con el manual CAT oficial antes de asignar
  unidades. No se ha revisado directamente la revisión original del manual.
- **Estado:** codec puro probado con tramas sintéticas, sin transporte ni
  validación física; `cat_read` permanece `unsupported`.

## ADR-017 — GitHub como evidencia de implementación, no compatibilidad

- **Decisión:** usar repositorios públicos para localizar perfiles/comandos y
  descubrir diferencias o riesgos; para cada radio, distinguir código de
  terceros, documentación del fabricante y pruebas BricoHams. No copiar
  implementaciones ni adoptar por defecto sus transportes, señales o rutas TX.
- **Motivo:** la investigación encuentra backends por modelo, forks con
  parámetros distintos, perfiles que omiten scope y herramientas de CAT libre.
  La existencia de código no demuestra que el hardware, firmware o transporte
  de BricoHams sea compatible.
- **Estado:** investigación documentada en
  [investigación CAT en GitHub](investigacion-cat-github.md); los candidatos
  siguen sin validación física BricoHams.

## ADR-018 — Consultas de frecuencia Kenwood sin perfil de soporte

- **Decisión:** añadir un codec ASCII puro que solo permite `FA;` y `FB;` y
  parsea respuestas de 11 dígitos. No implementar `MD;` común ni comandos de
  escritura.
- **Motivo:** Hamlib usa el mismo helper de frecuencia en TS-590S/SG, TS-890S y
  TS-990S, pero sus consultas de modo difieren (incluidos `SF0/SF1` y `OM0/OM1`).
  La evidencia revisada es secundaria y no sustituye los manuales del fabricante.
- **Estado:** codec probado con tramas sintéticas; sin transporte, prueba física
  ni declaración de compatibilidad CAT.

## ADR-019 — Perfil Elecraft solo para K4

- **Decisión:** añadir un codec de lectura allowlist para K4 (`FA`, `FB`, `MD`,
  `MD$`) usando las formas de respuesta descritas en el manual oficial rev. D12.
  No extenderlo al K3S aunque el K4 admita un superset de comandos legacy.
- **Motivo:** la documentación oficial K4 distingue las respuestas de frecuencia
  en Hz, los modos principales/subreceptor y los comandos de streaming Ethernet.
  El K3S requiere revisión específica de su Programmer's Reference.
- **Estado:** parsers probados con tramas sintéticas; sin transporte ni prueba
  física. Scope/waterfall queda `unsupported`: el manual describe dB/bin, pero
  indica que los detalles del protocolo están disponibles bajo solicitud.

## ADR-020 — K3S con evidencia propia y detección no ambigua

- **Decisión:** implementar consultas K3S cotejadas con la referencia oficial
  G5, compartiendo solo el framing/parser numérico. ID017 no identifica un
  modelo; OM se valida por posiciones y expone la presencia de la placa RF R.
- **Motivo:** el manual diferencia módulos de K3S/K3 y KX3/KX2, limita DT al
  modo DATA del VFO A y documenta efectos de los meta-modos sobre MD.
- **Estado:** consultas puras probadas sintéticamente; transporte y control
  físico siguen `unsupported`. No se cambian meta-modos ni señales.

## ADR-021 — Integración offline antes del transporte físico

- **Decisión:** unir consultas y decoders mediante CLI y catálogo API de lectura,
  manteniendo `unsupported` físico y señalando sintaxis de familia sin validación
  por modelo. No ejecutar comandos recibidos por API ni abrir sockets de radio.
- **Motivo:** los codecs aislados necesitan una herramienta reproducible para
  diagnosticar tramas sin introducir sondeos ni cambios en hardware no probado.
  Los modos Kenwood se conservan en bruto donde falta cotejo primario.
- **Estado:** CLI y endpoint autenticado probados; no son control remoto completo.

## ADR-022 — Logbook persistente separado del canal de control

- **Decisión:** avanzar la fase de operación con una CLI SQLite local y exportación
  ADIF, solicitando datos explícitos del contacto y fechas con zona horaria.
- **Motivo:** no registrar datos del simulador como QSOs reales ni introducir
  endpoints mutantes o transmisión al desarrollar una función independiente.
- **Estado:** persistencia/exportación local probadas; faltan UI, importación,
  sincronización e integración con telemetría física.

## ADR-023 — Operación web persistente sin control de radio

- **Decisión:** exponer listado/alta/exportación del logbook únicamente al
  configurar explícitamente un archivo SQLite. Admin y operador pueden guardar;
  oyentes leen/exportan e invitados no acceden. Compartir validación y ADIF con CLI.
- **Motivo:** avanzar funciones utilizables sin registrar telemetría simulada
  ni confundir una escritura local de contactos con permiso de CAT/PTT.
- **Estado:** formulario manual, paginación, límites y errores probados. La
  consola muestra también las consultas CAT, pero no las envía. Amplía ADR-011
  y ADR-022: el logbook ya tiene interfaz web.

## ADR-024 — Distribución de consola integrada

- **Decisión:** construir la consola en una carpeta temporal de distribución y
  añadir sus recursos al wheel, sin copiar bases SQLite ni secretos.
- **Motivo:** una instalación no debe depender del árbol del repositorio ni
  necesitar Node.js para servir recursos ya compilados.
- **Estado:** constructor de release y selección de recursos empaquetados
  implementados; el control físico y la publicación remota siguen separados.

## Decisiones legales/producto pendientes

La integración digital elegida es WSJT-X mediante su protocolo UDP documentado.
El agente recibe estado y decodificaciones, no incorpora código ni binarios de
WSJT-X ni envía órdenes. CAT serie se desarrolla como opción experimental
explícita; las pruebas físicas son una aceptación posterior, no un requisito
para implementar y probar el software. El detalle está en
[agente CAT y WSJT-X](agente-cat-wsjtx.md).

- Confirmar licencia preferida por los mantenedores antes de publicar la copia
  local.
- Revisar cada dependencia y licencia en el contexto de la distribución final.
- El soporte no se considera “estable” sin prueba repetible y evidencia pública.
