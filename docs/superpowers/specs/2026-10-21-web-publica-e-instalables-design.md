# Diseño: web pública en GitHub Pages e instalables locales

Fecha: 2026-10-21. Estado: borrador para aprobación.

## Intención

Hoy Radio Workspace solo funciona instalado: `npm start` y `http://127.0.0.1:8787`. El autor quiere:

1. **Una web pública con HTTPS en GitHub Pages**, con el aspecto y la marca de [Bricohams Studio](https://bricohams.github.io/Bricohams-Studio/), para que cualquiera conecte su radio desde el navegador sin instalar nada.
2. **Satélites actualizados a diario** en esa web, publicados por una tarea automática de GitHub a partir de SatNOGS.
3. **Una versión instalable** para Debian, Ubuntu, Raspberry Pi OS, Red Hat (RHEL y derivados), Arch, FreeBSD y Windows 11. Tendrá todas las funciones de hoy, más la personalización local con el RadioID del usuario y su clave de API de RepeaterBook.

El porqué: publicar la herramienta sin abrir un servidor en Internet. Un servidor público obligaría a añadir autenticación, límites de uso y custodia de secretos (ver `docs/DEPLOYMENT.md`, «Despliegues no soportados»). Una web estática no tiene nada que atacar en el lado del servidor. Las funciones que necesitan un intermediario o secretos se quedan en el equipo del usuario.

## Objetivos

- Web estática en GitHub Pages, servida solo por HTTPS, sin backend, sin secretos y sin datos personales en el repositorio ni en la web publicada.
- En la web funcionan, igual que hoy en local:
  - conexión USB/Serial (OpenGD77 y Quansheng);
  - lectura y copias verificadas con SHA-256 en IndexedDB, exportación e importación `.rwb.json`;
  - lectura, edición y guardado del codeplug estándar y de los canales;
  - lista SAT del codeplug;
  - planificación de pasos de satélite con `satellite.js`.
- Satélites: un JSON estático, regenerado cada día por GitHub Actions desde SatNOGS, con su atribución CC BY-SA 4.0.
- Instalables para los siete sistemas anteriores. Cada uno arranca el servidor local actual (`server.cjs`) y abre la app en el navegador.
- Personalización local: RadioID del usuario y clave de RepeaterBook, guardados solo en el equipo del usuario.
- Interfaz con el estilo de Bricohams Studio, en la web y en la versión local.

## No objetivos

- No hay servidor público, ni proxy, ni función serverless que reenvíe peticiones a RadioID, RepeaterBook, opengd77.com o GitHub Releases.
- La web no ofrece contactos RadioID ni repetidores RepeaterBook descargados automáticamente.
- No se crea un espejo público de RadioID (datos personales) ni de RepeaterBook (sus condiciones lo prohíben).
- No hay app nativa (Electron, Tauri…): la interfaz sigue siendo el navegador del sistema.
- No hay soporte móvil.

## Antiobjetivos (fallaría aunque «funcione»)

- Que la clave de RepeaterBook o cualquier dato de la radio acabe en el repositorio, en la web publicada, en los registros de Actions o en una URL.
- Que la web pública pierda las garantías actuales:
  - escrituras bloqueadas sin copia verificada;
  - comprobación SHA-256;
  - confirmación manual de modelo y firmware.
- Que un fallo de SatNOGS deje la web sin satélites o con datos corruptos.
- Que las copias de la web pública queden al alcance de otras páginas del mismo origen (ver «Origen y almacenamiento»).
- Que el instalador pida permisos de administrador para ejecutar el servidor o deje el servidor escuchando fuera de `127.0.0.1`.

## Restricciones comprobadas

CORS medido el 2026-10-21 con `Origin: https://bricohams.github.io`:

| Fuente | ¿Accesible desde el navegador? |
|---|---|
| `api.github.com` (releases de F4HWN) | Sí (`Access-Control-Allow-Origin: *`) |
| Descarga de assets de GitHub Releases | No |
| `opengd77.com` | No |
| `radioid.net` | No |
| SatNOGS (TLE y transmisores) | No |
| CelesTrak | Sin respuesta en la prueba |
| RepeaterBook | No; además exige token individual aprobado |

Otras restricciones:

- GitHub Pages no permite cabeceras HTTP propias. La CSP va en `<meta http-equiv>`. Por meta no se pueden aplicar `frame-ancestors`, `X-Frame-Options` ni `Permissions-Policy`.
- WebUSB y Web Serial requieren contexto seguro y Chrome, Edge o Brave de escritorio. En FreeBSD solo hay Chromium de ports, y la disponibilidad de WebUSB y Web Serial no está garantizada.
- Node.js ≥ 22. Las versiones de los repositorios de Debian 12, Ubuntu 24.04 y RHEL 9 base son más antiguas.

## Arquitectura

Hay un solo código fuente y dos modos de ejecución. El cliente conoce su modo por un archivo `runtime.json`:

- **GitHub Pages:** `runtime.json` se genera en la construcción con `{"mode":"web"}`.
- **Versión local:** `server.cjs` responde a `/runtime.json` con `{"mode":"local"}` y el estado de la personalización. Nunca devuelve los secretos.
- Si `runtime.json` falta o no es válido, el cliente se comporta como modo `web`, el más restrictivo.

### Funciones según el modo

| Función | Web (Pages) | Local (instalable) |
|---|---|---|
| Conexión, copias, codeplug, canales, lista SAT | Sí | Sí |
| Catálogo F4HWN | Sí: lista desde `api.github.com`; el usuario descarga el `.bin` en GitHub y lo carga; se verifica tamaño y SHA-256 con el `digest` del asset que publica la API | Sí: descarga automática, como hoy |
| Firmware OpenGD77 | Enlace oficial y carga manual del archivo; sin hash del editor, con aviso explícito | Sí, como hoy |
| Satélites | `data/satellites.json` publicado a diario | Proveedores en vivo, como hoy, y además el JSON diario |
| Contactos RadioID | Importar un CSV descargado por el usuario de radioid.net | Descarga automática filtrada por país o región y personalizada con su RadioID |
| Repetidores RepeaterBook | No disponible; se explica y se enlaza a la versión instalable | Sí, con la clave del usuario |

En modo web, los botones de funciones locales no se ocultan: se muestran deshabilitados, con una explicación y un enlace a la descarga.

### Origen y almacenamiento (punto crítico)

Todas las páginas de proyecto de una cuenta comparten origen. `https://bricohams.github.io/Bricohams-Studio/` y `https://bricohams.github.io/<otro-repo>/` son el mismo origen para IndexedDB y `localStorage`. Por tanto, cualquier página publicada en esa cuenta, presente o futura, podría leer las copias de las radios.

**Decisión del autor:** la web se publica en una cuenta u organización de GitHub dedicada, en la raíz de su propio `<org>.github.io`, separada de `bricohams.github.io` (Bricohams Studio). Así obtiene un origen exclusivo y ninguna otra página puede leer sus copias.

Consecuencias:

- El repositorio de la web (o una copia publicada por el workflow) se llama `<org>.github.io` dentro de esa cuenta. Ruta base `/`.
- Los workflows de Pages, de satélites y de releases viven en ese repositorio.
- La CSP, el `Origin` de las pruebas de CORS y los enlaces a Releases usan `https://<org>.github.io`.
- El autor crea la cuenta u organización: el agente no crea cuentas. El nombre `<org>` está pendiente.

### Seguridad de la web estática

- **HTTPS:** activar «Enforce HTTPS» en Pages.
- **CSP en `<meta>`** en cada HTML, equivalente a la actual: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'`. Sin scripts ni estilos en línea; el test actual ya lo comprueba.
- **Clickjacking:** sin `frame-ancestors` disponible, el script principal detecta si se ejecuta dentro de un marco (`window.top !== window.self`). En ese caso deja la página en blanco con un enlace para abrirla aparte. Las acciones que escriben en la radio ya exigen confirmaciones explícitas.
- **Dependencias:** `satellite.min.js` se copia al construir desde `node_modules`. Su integridad se comprueba contra `package-lock.json` (`npm ci`). No se usan CDNs de terceros.
- **Archivos cargados por el usuario:** tamaño máximo y validación de formato antes de procesarlos; se reutilizan los límites actuales.
- **Sin rastreo:** sin analítica ni recursos externos, salvo `api.github.com` para el catálogo F4HWN.

### Tarea diaria de satélites (GitHub Actions)

- Programación diaria (`schedule: cron`) y ejecución manual.
- La lista fija de NORAD es la de los presets actuales: 25544, 27607, 43017 y 43678. Se amplía editando un archivo del repo, no desde la web.
- Reutiliza la validación de `data-service.cjs` y `planning-core.js`: TLE válido, transmisores del satélite pedido, activos, FM y en banda de aficionado.
- Genera `data/satellites.json` con:
  - `fetchedAt`;
  - por satélite: TLE, época y transmisores;
  - fuente y licencia (CC BY-SA 4.0, SatNOGS).
- No hace commit de los datos: los publica en el artefacto de Pages junto con la web. Cualquier despliegue de la web (por push o diario) regenera los datos.
- Si SatNOGS falla o un satélite no pasa la validación, para ese satélite se conserva el último dato bueno, descargado del JSON publicado. Si no hay ninguno válido, el despliegue falla y Pages mantiene la versión anterior. La web muestra la antigüedad de los datos y avisa si tienen más de 7 días.
- Permisos mínimos del workflow: `contents: read`, `pages: write`, `id-token: write`. Acciones fijadas por SHA de commit y sin secretos.

### Versión instalable

#### Contenido

- `server.cjs` y los archivos de la app, el runtime de Node 22 LTS cuando el paquete lo incluye, un lanzador y las reglas de dispositivo.
- El servidor escucha solo en `127.0.0.1:8787`, con las protecciones actuales: validación de `Host` con redirección de `localhost`, CSP y lista fija de archivos.

#### Personalización

- Datos:
  - indicativo e ID DMR de RadioID, para preseleccionar país o región y marcar su propio contacto;
  - clave de RepeaterBook y User-Agent aprobado.
- Se guardan en un archivo de configuración del usuario, no del sistema:
  - Windows: `%APPDATA%\Bricohams\RadioWorkspace\config.json`, con ACL solo para el usuario;
  - Linux y FreeBSD: `$XDG_CONFIG_HOME/bricohams-radio/config.json`, con permisos `0600` y directorio `0700`.
- Las variables de entorno actuales (`RB_USER_TOKEN`…) siguen teniendo prioridad.
- Se editan desde una pantalla «Ajustes» de la versión local, mediante `POST /api/config`, que solo se acepta si cumple todo esto:
  - `Origin` igual a `http://127.0.0.1:<puerto>`;
  - `Content-Type: application/json`;
  - un token anti-CSRF aleatorio por proceso, entregado en `runtime.json`. Otra web no puede leerlo porque no hay CORS.
- Ninguna respuesta incluye la clave; como mucho «configurada (…últimos 4)». Tampoco aparece en los registros.
- Alternativa equivalente por línea de comandos: `bricohams-radio config set …`.

#### Paquetes por sistema

| Sistema | Formato | Node |
|---|---|---|
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS (arm64 y armhf) | `.deb` por arquitectura (amd64, arm64, armhf) | Incluido |
| RHEL 9/10, Rocky, Alma, Fedora | `.rpm` (x86_64, aarch64) | Incluido |
| Arch | `PKGBUILD` (AUR) | Dependencia `nodejs` del sistema |
| FreeBSD 14 | Paquete `pkg` o port | Dependencia `www/node22` (no hay binarios oficiales de Node para FreeBSD) |
| Windows 11 | Instalador `.exe` (x64; en ARM64 funciona emulado) | Incluido |

Comportamiento común:

- Instala en la ubicación estándar del sistema.
- Crea un acceso «Bricohams Radio Workspace» en el menú: un lanzador que arranca el servidor del usuario si no está en marcha y abre `http://127.0.0.1:8787` en el navegador predeterminado.
- Arranque automático al iniciar sesión, opcional y desactivado por defecto: tarea programada en Windows, servicio de usuario systemd en Linux.
- Linux: reglas `udev` para los VID:PID de las radios OpenGD77 (WebUSB) y aviso de añadir el usuario al grupo `dialout` (o `uucp` en Arch) para Web Serial. FreeBSD: reglas `devd` equivalentes, en modo «mejor esfuerzo».
- La desinstalación no borra la configuración ni las copias del navegador, y lo dice.

#### Publicación

- Workflow de release al crear una etiqueta `v*`: construye todos los paquetes en runners de GitHub (FreeBSD en una VM), los adjunta a la Release con `SHA256SUMS` y attestation de procedencia (`actions/attest-build-provenance`).
- La web pública enlaza a la última Release.

### Aspecto y marca (estilo Bricohams Studio)

- Barra lateral con el logo Bricohams y pasos numerados:
  - en OpenGD77: 0 Copias y conexión, 1 Codeplug, 2 Canales, 3 Satélites, 4 Firmware;
  - en Quansheng, el equivalente.
- Barra superior fija con el estado de conexión, el modelo identificado y el botón «Conectar», visible en todas las pantallas.
- Tarjetas oscuras con acento verde azulado, etiqueta «RADIOAFICIÓN · HAZLO TÚ MISMO» y registro de actividad al pie.
- Indicador de modo: «Web · GitHub Pages» o «Local · instalado».
- Se reutilizan `bricohams-logo.svg` y `docs/BRANDING.md`, que hay que actualizar con la paleta de Studio. Se mantienen la accesibilidad actual (enlace «Saltar al contenido», roles `status`/`log`, foco visible) y el tema oscuro.

## Decisiones tomadas por Claude (revisables)

- Detección del modo con `runtime.json`, y modo web por defecto ante cualquier duda.
- Lista fija de 4 satélites en la tarea diaria, ampliable por archivo.
- Los datos de satélites se publican en el artefacto de Pages, sin commits diarios.
- Configuración editable desde la web local con token anti-CSRF, más alternativa por línea de comandos.
- Node incluido en `.deb`, `.rpm` y Windows; dependencia del sistema en Arch y FreeBSD.
- Arranque automático desactivado por defecto.
- FreeBSD con soporte de «mejor esfuerzo» por la falta de garantías de WebUSB y Web Serial en Chromium.
- **RepeaterBook:** cada usuario solicita su propia aprobación. Ajustes pide el token `rbuapp_`, el User-Agent aprobado y la casilla «RepeaterBook aprobó este uso», como exige hoy `data-service.cjs`. El paquete no incluye ningún token ni User-Agent del proyecto.
- **Distribución:**
  - Primera versión sin firma de código. Windows mostrará el aviso de SmartScreen; la integridad se garantiza con `SHA256SUMS` y attestation de procedencia.
  - `.deb`, `.rpm`, `.pkg` de FreeBSD y `PKGBUILD` se adjuntan a la Release como archivos, sin repositorios apt/dnf, sin publicar en AUR y sin port oficial de FreeBSD.
  - Cualquiera de esos canales se puede añadir después como trabajo aparte.
- **Windows:**
  - Instalación por usuario, sin UAC, en `%LOCALAPPDATA%\Programs`.
  - El controlador WinUSB de OpenGD77 no se instala: se documenta y se enlaza, como hoy en Ayuda, porque requiere administrador.
- **Node incluido:**
  - Un workflow mensual comprueba la última versión de Node 22 LTS y, si cambió, abre un issue para publicar una nueva release.
  - La app local no consulta actualizaciones por su cuenta (privacidad). La web pública muestra la última versión publicada.

## Lo que queda al constructor

- Herramientas concretas de empaquetado (`nfpm`, `fpm`, Inno Setup, WiX…) y estructura de directorios del build.
- Separar los scripts de cliente en módulos por modo o mantener condicionales.
- Diseño visual fino dentro de las pautas de estilo anteriores.
- Formato exacto de `data/satellites.json`, siempre que incluya fuente, licencia, época y `fetchedAt`.
- Tests: ampliar los actuales (modo web sin API, CSP en meta, POST de configuración con y sin token y origen, validación del JSON diario).

## Preguntas abiertas

1. **Nombre de la cuenta u organización dedicada (`<org>`).** Lo elige y crea el autor.

**Resuelta por el autor:** «tu RadioID» es el indicativo y el ID DMR del usuario en radioid.net. Sirve para preseleccionar su región y marcar su propio contacto. No es una clave ni un secreto:

- No requiere token anti-CSRF propio. En local se guarda en el mismo `config.json` y se muestra completo.
- *Decisión de Claude:* también está disponible en la web, opcional, guardado solo en el almacenamiento de ese navegador y con un botón para borrarlo. Sirve para preseleccionar la región al importar el CSV de RadioID y marcar el contacto propio.
- Validación: indicativo con formato de aficionado (letras y dígitos, máximo 10) e ID DMR numérico de 7 dígitos.
