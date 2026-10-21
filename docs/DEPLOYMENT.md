# Despliegue

Hay dos despliegues soportados: **local** (servidor Node en el mismo equipo al que se conecta la radio) y **web pública en GitHub Pages** (sitio estático, ver [Web pública en GitHub Pages](#web-pública-en-github-pages)).

## Requisitos

- Node.js 22 o superior.
- Git (opcional, para clonar y actualizar).
- Chrome, Edge o Brave de escritorio, por WebUSB/Web Serial. Firefox y Safari no son compatibles.
- Los controladores USB que pida la radio: ver [Ayuda › Controladores](../ayuda.html#drivers).

## Instalación (Windows, macOS y Linux)

```powershell
git clone https://github.com/anatolbricoham/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Abre <http://127.0.0.1:8787>. Si abres `localhost`, el servidor te redirige a `127.0.0.1`: valida el encabezado `Host` y solo sirve ese origen. Usa siempre el mismo origen para conservar el historial de IndexedDB.

`--ignore-scripts` evita que se ejecuten scripts de instalación de terceros. La versión de `satellite.js` está fijada en `package-lock.json`.

## Verificación

```powershell
npm test
npm run check
```

Ambos comandos deben terminar sin fallos. Después, abre la página de ayuda y comprueba que se muestra el logotipo de Bricohams.

## Configuración

| Variable | Uso |
| --- | --- |
| `RB_USER_TOKEN` | Token de aplicación aprobado por RepeaterBook (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | User-Agent registrado en la aprobación. |
| `RB_APPROVED` | Debe valer `yes` para activar la función. |

Solo el servidor lee estas variables. No las guardes en el repositorio. El puerto `8787` y la interfaz `127.0.0.1` están fijados en `server.cjs` por seguridad.

Ejemplo en PowerShell, válido solo para la sesión actual:

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

## Actualización

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Exporta tus copias antes de actualizar el navegador o de borrar los datos del sitio.

## Ejecución en segundo plano (opcional)

En Windows, como tarea programada al iniciar sesión:

```powershell
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server.cjs" -WorkingDirectory "C:\ruta\Radio-Web-install"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "Bricohams Radio Workspace" -Action $action -Trigger $trigger
```

En Linux, como servicio de usuario de systemd (`~/.config/systemd/user/bricohams-radio.service`):

```ini
[Unit]
Description=Bricohams Radio Workspace

[Service]
WorkingDirectory=%h/Radio-Web-install
ExecStart=/usr/bin/node server.cjs
Restart=on-failure

[Install]
WantedBy=default.target
```

Actívalo con `systemctl --user enable --now bricohams-radio`.

## Web pública en GitHub Pages

El sitio estático se genera con `npm run build:pages` (carpeta `dist/`) y lo publica `.github/workflows/pages.yml`. No incluye `server.cjs`: `runtime.json` es `{"mode":"web"}` y la aplicación funciona en modo web (ver [Arquitectura](ARCHITECTURE.md#modos-de-ejecución)).

### Por qué un origen propio

IndexedDB (copias de la radio) y `localStorage` (perfil) se aíslan por origen. Si el sitio viviera en una subruta de `bricohams.github.io`, compartiría origen con Bricohams Studio y con cualquier otro proyecto de esa cuenta: una página ajena podría leer las copias. Por eso se publica en la **raíz** de una cuenta u organización dedicada, `https://<org>.github.io/`, separada de `bricohams.github.io`. Aun así, todas las rutas del cliente son relativas.

### Pasos (los hace el autor)

1. Crear la cuenta u organización `<org>`.
2. Crear el repositorio `<org>.github.io` y subir este código (el push requiere confirmación explícita del autor).
3. En *Settings › Pages*, elegir «GitHub Actions» como origen y activar «Enforce HTTPS».
4. Crear la variable de Actions `PAGES_ORIGIN` con `https://<org>.github.io` (sin barra final). El workflow la usa para recuperar el `data/satellites.json` anterior.
   El workflow solo se ejecuta en el repositorio `<org>/<org>.github.io` (guarda `if: github.repository == ...`): en cualquier otro repositorio se omite, para no publicar bajo un origen compartido que expondría las copias y el perfil (IndexedDB) a otras páginas.
   Excepción consciente: si el autor acepta compartir origen, crea la variable `PAGES_SHARED_ORIGIN_ACCEPTED` con el valor `true` en el repositorio. Las variables no se copian a los forks, así que un fork sigue protegido. El sitio oficial actual usa esta excepción en `https://anatolbricoham.github.io/Radio-Web-install/` (ver ADR-014).
   El primer push puede ejecutarse antes de definir `PAGES_ORIGIN`: es inofensivo, se omite la recuperación de datos anteriores y se emite un aviso.
5. Ejecutar el workflow manualmente la primera vez (*Actions › Pages › Run workflow*).

### Qué hace el workflow

- Se ejecuta en cada push a `main`, a diario a las 05:17 UTC y a mano.
- Instala con `npm ci --ignore-scripts`, ejecuta `npm test`, construye `dist/` y genera `dist/data/satellites.json` con `scripts/fetch-satellites.cjs`.
- Permisos mínimos (`contents: read`, `pages: write`, `id-token: write`), sin secretos, y cada acción fijada por SHA de commit.

### Satélites

`scripts/fetch-satellites.cjs` consulta SatNOGS para los NORAD de `data/satellites.config.json` (25544, 27607, 43017 y 43678). Si un satélite falla o su TLE no es válido, conserva sus últimos datos buenos del archivo anterior; la web avisa cuando `fetchedAt` supera los 7 días. Atribución: SatNOGS DB / Libre Space Foundation, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Seguridad del sitio estático

Cada HTML lleva una CSP en `<meta>` (sin scripts ni estilos en línea; `connect-src` solo `'self'` y `https://api.github.com`) y la aplicación se niega a ejecutarse dentro de un marco, porque GitHub Pages no permite cabeceras propias. No hay cuentas, subidas ni telemetría. RadioID no se replica y RepeaterBook no está disponible en la web.

Los paquetes instalables (.deb, .rpm, Windows…) y los ajustes locales llegarán próximamente.

## Despliegues no soportados

- **Otro alojamiento estático** distinto de GitHub Pages: no está probado. Para Pages, ver la sección anterior.
- **Red local o Internet:** requeriría HTTPS, autenticación, cambiar la validación de `Host` y revisar CSRF. No está soportado: las credenciales y los datos de la radio quedarían expuestos.
- **Contenedores:** WebUSB/Web Serial se ejecutan en el navegador del anfitrión. Un contenedor solo aportaría el servidor y complica el acceso a `127.0.0.1`.

## Desinstalación

Detén el servidor y borra la carpeta del repositorio. Si además quieres eliminar el historial, **exporta antes las copias** y después borra los datos del sitio `http://127.0.0.1:8787` en el navegador.
