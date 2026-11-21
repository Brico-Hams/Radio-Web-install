# Seguridad

## Garantías de esta fase

- Coordinador y agente usan loopback por defecto. Fuera de IPv4 loopback exigen
  TLS con certificado/clave explícitos; el enlace remoto al agente valida CA y
  hostname y usa un token dedicado distinto de los usuarios.
- mTLS opt-in exige además certificado de equipo en todas las conexiones al
  agente, antes de HTTP. No sustituye bearer/roles ni la verificación del nombre
  del agente. Pares incompletos o identidades no confiables fallan explícitamente.
  Configuración y límites de revocación en [despliegue seguro](despliegue-seguro.md).
- Exige `BRICOHAM_ADMIN_TOKEN` para arrancar. Los tokens deben tener al menos
  32 caracteres y los roles configurados no pueden compartir token.
- `BRICOHAM_OPERATOR_TOKEN`, `BRICOHAM_LISTENER_TOKEN` y `BRICOHAM_GUEST_TOKEN`
  son opcionales. Un invitado puede leer el catálogo, pero no el estado de estación.
- La ruta CAT de consultas es de solo lectura. Las escrituras HTTP son
  `POST /api/v1/logbook`, `POST /api/v1/rotor` y `POST /api/v1/radio-settings`, opt-in con configuración local
  y solo para admin/operador; PTT añade otra ruta separada descrita abajo.
  Las demás rutas mutantes reciben 405.
- El logbook valida JSON, campos, tipos, zona horaria y frecuencia; limita el
  cuerpo a 4096 bytes y la lectura a cinco segundos. No admite cuerpos chunked.
  Cuando hay Origin exige mismo origen o allowlist explícita del host HTTPS.
  No usa cookies; CORS no admite comodines y limita métodos y cabeceras.
- La lectura CAT experimental exige activación local explícita, perfil, puerto
  y baud; no transmite. [PTT FTX-1](ptt-ftx1.md) requiere además `--ptt-config`
  y `enabled: true`, y está desactivado por defecto. Puede emitir RF real:
  MAIN VFO simplex LSB/USB, RX previo, límites locales, reserva exclusiva CAT
  y watchdog. No expone el secreto del lease en GET ni reintenta START.
  La desconexión USB, muerte del proceso o mandos locales pueden impedir RX;
  mantiene obligatorias las protecciones RF y parada física independientes.
- Los [ajustes por modelo](control-potencia-acoplador.md) limitan IC-7300
  RF PWR/ATU y FTX-1 PC field/SPA-1, con opt-in separado, RX observado,
  límite local/de cabezal y readback. Distinguen posición CAT y W de consigna.
  FTX-1 añade [frecuencia/modo MAIN/SUB](control-frecuencia-modo.md) con
  opt-ins independientes desactivados por defecto, mismo lock/presupuesto,
  guardas RX/AC y barrera contra eco tardío; no selecciona transmisor.
  No inician sintonía; no limitan potencia RF medida ni constituyen un
  interlock físico. Un timeout de escritura deja resultado incierto: leer antes
  de reintentar, sin reenvío automático.
- Audio RX requiere token de admin/operador/oyente en ambos saltos, dispositivo
  explícito y dependencia opcional. No abre ADC al consultar metadatos ni
  recibe audio del micrófono remoto. Búferes y consumidor acotados; no publica
  audio sin autenticar ni usa credenciales en la URL. Véase [audio RX](audio-rx.md).
- [Audio TX](audio-tx.md) autentica el primer mensaje WebSocket antes de CAT/DAC;
  Origin estricto en el host, roles admin/operador y TLS/mTLS validado al agente.
  Capacidad aleatoria ligada al PTT, DAC silenciado hasta TX confirmado, colas
  acotadas y watchdog de frescura. No graba audio ni envía secretos en URL.
  Los límites de RF y las protecciones físicas siguen siendo obligatorios.
- El rotor usa límites mecánicos explícitos, sesión exclusiva de tres segundos,
  máximo de treinta segundos y parada best effort. Una parada sin confirmación
  bloquea nuevos movimientos. rotctld solo se contacta por loopback, pero no
  autentica procesos locales; no publiques su puerto. Consulta los
  [límites del controlador](control-rotores.md), incluidos caída del proceso,
  pérdida de estado al reiniciar y necesidad de parada/finales de carrera físicos.
- No se registran valores de cabeceras de autorización ni cadenas de consulta.
- Los recursos estáticos de la consola son públicos; el estado, el catálogo y el
  diagnóstico mantienen autorización por rol en la API.
- El inventario sigue sin abrir puertos. El CAT opt-in configura RTS/DTR
  inactivos antes de abrir, pero el driver puede producir pulsos transitorios:
  no se garantiza seguridad física antes de ensayarla con TX inhibido.
- El coordinador reenvía inventario, consultas CAT allowlist y telemetría digital
  al agente local o HTTPS configurado; exige admin/operador y no acepta CAT arbitrario.
- WSJT-X solo se recibe por UDP loopback, sin órdenes salientes. El Id no
  autentica al emisor. Otro proceso local puede suplantarlo. API y consola indican
  `authenticated: false`, `trust: untrusted_local_udp`, `suitable_for_control: false`.
  Estos datos no autorizan órdenes ni se registran automáticamente como QSOs.
- La consola guarda el token solo en memoria de la pestaña, no en
  `localStorage`, cookies o URLs. La política CSP restringe scripts, estilos y
  conexiones al mismo origen.

## Límites

HTTP loopback no cifra el tráfico local. El TLS opt-in protege el enlace remoto,
no un equipo comprometido. Sigue la [guía de despliegue](despliegue-seguro.md)
y usa VPN/cortafuegos; no se promete protección contra cualquier atacante.
Hay un máximo de 32 conexiones y timeout de handshake/lectura de cinco segundos,
pero no protección DDoS ni rate limiting por identidad. Faltan MFA,
revocación por sesión y revisión externa antes de producción pública. No reutilices
tokens entre roles ni los guardes en el repositorio. La mitigación de confianza
WSJT-X no autentica su protocolo UDP ni elimina la suplantación local.

El archivo SQLite y los ADIF exportados contienen contactos del operador:
protege sus permisos y copias de seguridad. El logbook local no cifra SQLite,
no tiene propietarios por contacto y no proporciona deduplicación de altas.
Una respuesta perdida exige comprobar la lista antes de reintentar.

Para generar un secreto temporal en PowerShell:

```powershell
$env:BRICOHAM_ADMIN_TOKEN = py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"
```

El token se pierde al cerrar esa sesión de PowerShell. No lo compartas en logs,
capturas ni URLs.
