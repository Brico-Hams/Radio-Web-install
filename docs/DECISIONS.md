# Registro de decisiones (ADR)

Cada decisión indica el contexto, lo decidido, las alternativas descartadas y sus consecuencias.

## ADR-001 · JavaScript sin framework ni paso de compilación

- **Contexto:** la herramienta maneja protocolos binarios y debe poder auditarla cualquier radioaficionado.
- **Decisión:** módulos JavaScript nativos, HTML y CSS, sin React, Vue, empaquetadores ni transpiladores.
- **Alternativas:** React/Vite (más dependencias y cadena de suministro) o TypeScript (requiere compilación).
- **Consecuencias:** se puede leer exactamente lo que se ejecuta y el navegador no carga `node_modules`. A cambio, el estado de la interfaz se gestiona a mano.

## ADR-002 · WebUSB y Web Serial para hablar con la radio

- **Contexto:** OpenGD77 MK22/STM32 expone CDC por USB; DM-32/UV008 y Quansheng usan puerto serie.
- **Decisión:** WebUSB para `1FC9:0094` y Web Serial para los cables serie, igual que el CPS web de referencia.
- **Alternativas:** aplicación nativa (instalación y firma por sistema operativo) o Electron (gran superficie de ataque).
- **Consecuencias:** solo funciona en Chrome, Edge y Brave de escritorio. En Windows, OpenGD77 USB necesita WinUSB (ver [la ayuda](../ayuda.html#drivers)).

## ADR-003 · Servidor Node local con una sola dependencia

- **Contexto:** las descargas de firmware y los datos de proveedores tienen que esquivar CORS, aplicar listas de hosts y ocultar credenciales.
- **Decisión:** `server.cjs` con módulos estándar de Node 22 (`http`, `fetch`, `crypto`) y `satellite.js` 6.0.1, fijado, como única dependencia.
- **Alternativas:** Express/Fastify (más dependencias) o un proxy público (expone datos y credenciales).
- **Consecuencias:** se instala con `npm ci --ignore-scripts` y el riesgo de cadena de suministro es menor.

## ADR-004 · Solo loopback, CSP estricta y lista de archivos permitidos

- **Decisión:** escuchar en `127.0.0.1:8787`, validar `Host`, servir solo los archivos enumerados y enviar una CSP sin `unsafe-inline`.
- **Motivo:** mitigar DNS rebinding, la lectura de archivos arbitrarios y XSS.
- **Consecuencia:** `localhost` no se sirve: las navegaciones GET/HEAD se redirigen (307) a `127.0.0.1` para mantener un único origen de IndexedDB; con cabecera `Origin` se rechaza. Publicar la aplicación en red requeriría un rediseño (HTTPS y autenticación) y no está soportado.

## ADR-005 · Copia automática obligatoria antes de escribir

- **Decisión:** al conectar se copian la calibración y el firmware o codeplug base, se guardan en IndexedDB, se calcula SHA-256, se relee la copia y solo entonces se emite un permiso de escritura ligado a la conexión. Cualquier fallo deja la escritura bloqueada (*fail-closed*).
- **Alternativa descartada:** una copia opcional, con riesgo de perder la calibración de forma irreversible.
- **Consecuencias:** conectar tarda más (los 2 MiB de un Quansheng a 38 400 baudios llevan 10-20 minutos), pero nunca se escribe sin una copia verificada.

## ADR-006 · IndexedDB y exportación `.rwb.json`

- **Decisión:** IndexedDB del navegador para el historial, y exportación a JSON con manifiesto, contenido en Base64 y hashes.
- **Alternativas:** guardar las copias en el servidor (rompería la promesa «sin subidas») o la File System Access API (no está en todos los navegadores).
- **Consecuencias:** la aplicación no cifra las copias. El usuario debe exportarlas y proteger su perfil del navegador.

## ADR-007 · Solo fuentes oficiales de firmware, sin espejos

- **Decisión:** el catálogo se limita a los GitHub Releases del repositorio oficial de F4HWN (`armel/uv-k1-k5v3-firmware-custom`) y a opengd77.com, con redirecciones restringidas y límites de tamaño.
- **Consecuencias:** si un proveedor cambia su estructura, la descarga falla de forma explícita en vez de recurrir a fuentes no verificadas. SHA-256 detecta corrupción, pero no prueba la autenticidad.

## ADR-008 · Credenciales de RepeaterBook solo en el servidor

- **Decisión:** `data-service.cjs` lee `RB_USER_TOKEN`, `RB_APPROVED_USER_AGENT` y `RB_APPROVED` de variables de entorno, y el navegador nunca las recibe. Tras un HTTP 429 se aplica un enfriamiento, y se muestra la atribución «Data courtesy of RepeaterBook.com».
- **Consecuencias:** sin un token aprobado, la función aparece deshabilitada.

## ADR-009 · Cálculo SGP4 local

- **Decisión:** los TLE se obtienen de SatNOGS/CelesTrak y la propagación se hace en el navegador con `satellite.js`. La posición del usuario no sale del equipo.
- **Validación:** los tests usan un vector de prueba independiente de Vallado.

## ADR-010 · Pruebas con `node:test` y dispositivos simulados

- **Decisión:** se usa el ejecutor nativo de Node, sin Jest ni Mocha. Radios, red y servidor se simulan; los tests nunca escriben en hardware ni usan credenciales reales.

## ADR-011 · Licencia GPL-3.0-or-later

- **Contexto:** las referencias de interoperabilidad usan Apache-2.0 (F4HWN, egzumer, DualTachyon), MIT (satellite.js) y GPL-2.0 (OpenGD77).
- **Decisión:** GPL-3.0-or-later, un copyleft que mantiene libres las mejoras y es compatible con las dependencias Apache-2.0 y MIT.
- **Nota:** no se distribuye código de OpenGD77 ni de las demás referencias; la implementación es independiente. El titular puede cambiar la licencia antes de recibir contribuciones de terceros.

## ADR-012 · Marca Bricohams con recursos propios

- **Decisión:** nombre «Bricohams Radio Workspace», logotipo SVG original y la paleta existente. Ver [BRANDING.md](BRANDING.md).
- **Consecuencia:** no se usan logotipos de OpenGD77, Quansheng ni F4HWN, y se declara la no afiliación.
