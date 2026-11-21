# Historial de cambios

## No publicado — Consola web local

- Ayuda original ES/EN/FR/PT: diez temas, índices y manuales completos
  generados desde una fuente común; descarga offline y comprobación reproducible.
  Conexión, navegación y asistentes locales de configuración de agente/host
  traducidos. Preparan comandos correctamente entrecomillados, no los ejecutan
  ni incluyen secretos; TLS/CA obligatorios en el enlace remoto.
- Perfiles CAT de lectura K3/KX3/KX2 cotejados con Elecraft G5:
  frecuencia, modo y ancho; FM rechazado en KX2, sin ID/OM/DT ni setters
  heredados. Total 49 candidatas, 34 perfiles por modelo; sin hardware validado.

- Micrófono remoto experimental compartido web/Android/tablet/iPhone/iPad:
  AudioWorklet PCM16LE 48 kHz, WebSocket autenticado y relay TLS/mTLS acotado.
  DAC USB por nombre/índice/canal explícitos; silencio hasta confirmar PTT,
  capacidad secreta de sesión, comprobación VOX y watchdog ante pérdida de audio.
  Permisos nativos de micrófono preparados; rutas USB/RF y móviles sin validar.

- PTT FTX-1 experimental con opt-in local separado desactivado por defecto:
  RX explícito, MAIN VFO simplex LSB/USB, límites administrativos de
  frecuencia/PC/duración, reserva CAT exclusiva y lease de 2 s con watchdog.
  START no se reintenta; cancelación de START tardío y bloqueo/reintento RX
  tras parada incierta. API autenticada agente/host y panel mantenido común.
  Puede emitir RF si se activa; audio TX opcional separado, sin CW ni validación física.

- Distribución independiente del agente en ZIPAPP; plantilla systemd sin root.
- HTTPS remoto opt-in en agente/host, verificación CA/hostname y token de enlace
  separado de los usuarios; límite de conexiones y handshake fuera del hilo accept.
- mTLS de equipo opt-in para el enlace host/agente: CA de clientes explícita,
  certificado/clave del coordinador, rechazo antes de HTTP y bearer/roles intactos.
  Sin fallback ni revocación CRL/OCSP automática; pruebas reales de identidades TLS.
- CORS por origen explícito para clientes nativos; tokens en memoria y API sin
  cookies ni redirecciones. Telemetría WSJT-X marcada no autenticada/no apta para control.
- Proyectos Capacitor Android móvil/tablet e iOS universal; sin declarar audio,
  CW, TX ni compatibilidad USB OTG completados.
- Rotor rotctld experimental: API agente/host y panel compartido web/móvil,
  límites explícitos, movimiento opt-in, lease/deadman y STOP por pérdida de foco.
  Cancelación de MOVE tardío y bloqueo tras parada no confirmada; pruebas TCP/HTTP/TLS.
  Sin validación física; ajustes IC-7300 descritos por separado.
- Ajustes IC-7300 opt-in: RF PWR 0..255 CAT con límite local e insertar/bypass ATU;
  comprobaciones RX/PTT Start, ACK y readback, sin sintonía RF ni PTT.
  API agente/host y panel compartido; no declara vatios calibrados ni otros modelos.
- Manual CAT oficial FTX-1 2508-C cotejado: frecuencia Hz, corrección de consulta
  MAIN/SUB MD0/MD1 y telemetría PC/AC/TX. `frequency_hz` sustituye al campo crudo
  experimental anterior; no se habilitan setters ni sondeos mutantes del SPA-1.
- Perfiles CI-V IC-7100/IC-7200 según manuales oficiales: 31 perfiles de modelo,
  14 de familia e IC-7800 sin implementar por evidencia primaria insuficiente.
- Potencia PC FTX-1/SPA-1 opt-in según manual 2508-C: cabezal observado, W de
  consigna limitados, RX/AC, barrera contra eco tardío y readback sin ACK inventado.
  API agente/host y panel común distinguen W de posición CAT; sin PTT/sintonía RF.
- Audio RX experimental: entrada PCM real explícita, extra sounddevice opcional,
  BHR1 autenticado agente/host y AudioWorklet con búfer acotado. El ZIPAPP base
  excluye dependencias nativas; no se declara hardware/ruta USB ni móvil validado.
- Frecuencia/modo FTX-1 MAIN/SUB opt-in por separado: FA/FB y MD0/MD1,
  guardas RX/AC, barrera contra eco tardío y readback con presupuesto compartido.
  API agente/host y panel web/móvil con lectura previa; no selecciona VFO
  activo/transmisor ni habilita PTT, CW o TX. Contratos y guía actualizados.

- Transporte CAT serie experimental opt-in en el agente: modelo/puerto/baud
  explícitos, consultas con decoder, límites, eco y reconexión bajo demanda.
- Integración WSJT-X pasiva por UDP local, esquemas 2/3, estado y últimas
  decodificaciones; sin comandos salientes, audio ni inserción automática de QSOs.
- Proxy autenticado y panel CAT/WSJT-X independientes de la demostración.

- Consulta web de perfiles CAT con estados por modelo/familia/no implementado.
- Logbook web opt-in: alta manual admin/operador, lectura paginada y descarga
  ADIF para oyentes; SQLite persistente compartido con la CLI, sin datos simulados.
- Constructor de wheel integrado con la consola estática; ejecución instalada
  fuera del repositorio sin Node.js en runtime.

- Consola React/TypeScript responsive con autenticación bearer en memoria y
  llamadas de solo lectura al coordinador local.
- El coordinador sirve el build estático mismo-origen con CSP; sin build, la API
  sigue disponible.
- Pruebas UI, servicio estático, permisos por rol y build incorporados a CI.
- Simulación, falta de hardware, scope/waterfall no disponibles y bloqueo TX
  visibles en la interfaz.
- Servicio de inventario local de puertos serie con API loopback, permisos y
  metadatos sensibles omitidos; no abre puertos ni determina CAT.
- Parser/allowlist de protocolo QMX+ para consultas de frecuencia/modo, sin
  transporte serie ni declaración de soporte CAT.
- Codec CAT de (tr)uSDX para consultas FA/MD/IF/ID y parsers puros de frecuencia,
  modo e identificación; sin transporte serie ni apertura de puerto.
- Codec CAT FTX-1 de consultas FA/FB/MD/ID y parsers puros de campo de frecuencia
  e identificación; no convierte unidades ni abre transporte.
- Registro API de las 44 radios del listado de referencia más (tr)uSDX y QMX+;
  la consola separa sus afirmaciones de terceros del soporte BricoHams no validado.
- Investigación comparativa de CAT en GitHub: Hamlib, wfview, flrig y proyectos
  específicos; ampliada a AetherSDR, RigPlane, Icom/Yaesu Web Control y Android
  Hermes-Lite 2. Documentados estados por modelo, límites de scope, riesgos de
  exposición CAT y discrepancias serie, sin elevar compatibilidad ni reutilizar
  código.
- Codec CAT Kenwood de solo lectura para frecuencia VFO A/B (`FA;`, `FB;`) con
  parser de 11 dígitos; sin modo, transporte ni declaración de soporte CAT.
- Codec CAT K4 de solo lectura para frecuencia y modo de VFO A/B (`FA`, `FB`,
  `MD`, `MD$`); el transporte, scope y waterfall siguen sin implementarse ni
  declararse soportados.
- Codec K3S propio cotejado con la referencia G5: frecuencia, modo, ancho de
  filtro, submodo DATA, ID legacy y módulos; sin transporte ni selección de VFO.
- Consultas de modo Kenwood específicas (`MD`, `SF0/SF1`, `OM0/OM1`) con códigos
  ASCII en bruto y perfiles separados.
- CLI offline `bricoham-cat` y catálogo autenticado `GET /api/v1/protocols`;
  scripts instalables de coordinador y agente. No envían comandos a una radio.
- Logbook SQLite local con validación, normalización UTC y exportación ADIF.
  CLI y posterior integración web; sin adquisición automática de telemetría.
- Codecs CI-V de frecuencia/modo para 14 Icom y CAT de frecuencia/modo/ID
  para seis Yaesu adicionales, integrados en diagnóstico y catálogo; sin
  transporte ni validación física. IC-7100/7200/7800 permanecen sin perfil.
- Primitivas offline SmartSDR y descubrimiento Hermes-Lite con estado de
  sintaxis de familia, separado de perfiles y soporte por modelo.

## 0.1.0 — Base local

- API de lectura local con autenticación por roles.
- Contratos versionados, catálogo de capacidades y simulador determinista.
- Bloqueo explícito de CAT, PTT/TX, audio y datos de espectro/waterfall no verificados.
- CI declarada para Python 3.12 en Windows, Linux y macOS.
- Documentación de investigación pública, candidatos de radio, decisiones y límites.

Sin soporte de hardware validado por BricoHams ni cliente Android.
