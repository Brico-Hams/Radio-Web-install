# Despliegue

Hay dos despliegues soportados: **local** (servidor Node en el mismo equipo al que se conecta la radio) y **web pública en GitHub Pages** (sitio estático, ver [Web pública en GitHub Pages](#web-pública-en-github-pages)).

## Requisitos

La entrada pública oficial es <https://brico-hams.github.io/Radio-Web-install/>. Comparte esta URL, no copias antiguas ni vistas previas locales. `index.html` declara esa URL como canónica; las páginas de herramientas y ayuda son secciones del mismo sitio, no versiones alternativas.

- Node.js 22 o superior **solo para ejecutar desde el código fuente, Arch y FreeBSD**. Los paquetes `.deb` y el ZIP de Windows incluyen Node.
- Git solo para clonar y actualizar una instalación desde código fuente.
- Chrome, Edge o Brave de escritorio, por WebUSB/Web Serial. Firefox y Safari no son compatibles.
- Los controladores USB que pida la radio: ver [Ayuda › Controladores](../ayuda.html#drivers).

## Instalación desde el código fuente

```powershell
git clone https://github.com/Brico-Hams/Radio-Web-install.git
cd Radio-Web-install
npm ci --ignore-scripts
npm start
```

Abre <http://127.0.0.1:8787>. Si abres `localhost`, el servidor te redirige a `127.0.0.1`: valida el encabezado `Host` y solo sirve ese origen. Usa siempre el mismo origen para conservar el historial de IndexedDB.

Para incluir Bricohams Quansheng Studio en la copia local, ejecuta `npm run fetch:studio`. Descarga `studio.html` desde `Brico-Hams/Bricohams-Studio`, en el commit fijado en `studio.lock.json`, y comprueba su tamaño y su SHA-256. El archivo no se versiona porque lleva firmware incrustado.

**Actualizar Studio (autor):** cuando el commit nuevo ya esté en GitHub, ejecuta `node scripts/fetch-studio.cjs --update <commit-completo>`. El comando reescribe `studio.lock.json` con el tamaño, el SHA-256 y los hashes CSP de sus scripts. Revisa el diff y haz commit del lock.

`--ignore-scripts` evita que se ejecuten scripts de instalación de terceros. La versión de `satellite.js` está fijada en `package-lock.json`.

## Verificación

```powershell
npm test
npm run check
```

Ambos comandos deben terminar sin fallos. Después, abre la página de ayuda y comprueba que se muestra el logotipo de Bricohams.

## Instaladores locales

Descarga el archivo de tu sistema y `SHA256SUMS` desde los **Assets** de la [última Release](https://github.com/Brico-Hams/Radio-Web-install/releases/latest). Ya hay paquetes publicados desde `v0.3.0`. Los enlaces automáticos «Source code (zip)» y «Source code (tar.gz)» no son instaladores.

| Sistema | Archivo | Instalación |
| --- | --- | --- |
| Debian 12/13, Ubuntu 22.04/24.04, Raspberry Pi OS arm64/armhf | `.deb` para amd64, arm64 o armhf | `sudo apt install ./nombre-del-paquete.deb` (elige solo tu arquitectura) |
| Arch Linux | `*-arch.tar.gz` | Extrae el archivo y ejecuta `makepkg -si` (requiere `base-devel` y `nodejs`). |
| FreeBSD 14 amd64 | `*-freebsd-amd64.tar.gz` | Extrae el archivo y ejecuta `su -c './install.sh'` (instala `node22` mediante `pkg` si hace falta). |
| Windows 11 x64 | `*-windows-x64.zip` | Extrae el ZIP y ejecuta `powershell -ExecutionPolicy Bypass -File .\Install.ps1`; añade un acceso al menú Inicio. |

Los `.deb` y el ZIP de Windows incluyen Node.js 22. Arch usa el paquete `nodejs` de su distribución. FreeBSD requiere `pkg` y el paquete `node22`. Raspberry Pi OS de 32 bits necesita un procesador ARMv7 o posterior. El instalador no configura arranque automático ni eleva permisos para iniciar la aplicación.

Tras instalar, inicia **Bricohams Radio Workspace** desde el menú de aplicaciones/Inicio o ejecuta `bricohams-radio` en Arch y FreeBSD. El servidor queda ligado a `127.0.0.1:8787`; no lo expongas a la red. En FreeBSD, Chromium puede no ofrecer WebUSB/Web Serial, por lo que el acceso a radios es de mejor esfuerzo.

### Verificar la descarga

Comprueba el hash antes de ejecutar el instalador. En PowerShell:

```powershell
Get-FileHash .\bricohams-radio-workspace-v0.3.0-windows-x64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

Compara el hash completo con la línea del mismo nombre en `SHA256SUMS` (no importa mayúsculas/minúsculas). En Linux:

```sh
sha256sum bricohams-radio-workspace-v0.3.0-amd64.deb
cat SHA256SUMS
```

En FreeBSD usa `sha256 nombre-del-archivo`. Sustituye el nombre/version por el archivo realmente descargado. No instales si el hash difiere. Las sumas comprueban integridad, no una firma de editor: los paquetes no tienen firma de código.

### Windows 11 x64

1. Descarga `*-windows-x64.zip` y **extrae todo su contenido**; no ejecutes el script dentro del ZIP.
2. Abre PowerShell en la carpeta que contiene `Install.ps1`, `Start.ps1`, `app` y `runtime`.
3. Ejecuta, como usuario normal:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
   ```

4. Se instala en `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` y crea **Bricohams Radio Workspace** en el menú Inicio. No necesita UAC ni instalar Node aparte.
5. Abre ese acceso. Si el navegador predeterminado no es Chrome, Edge o Brave, abre manualmente <http://127.0.0.1:8787> en uno de ellos.

`ExecutionPolicy Bypass` afecta únicamente al proceso que ejecuta el comando; no cambies permanentemente la política de PowerShell. Una política corporativa puede impedir scripts incluso con esta opción: consulta al administrador. El instalador actual es un ZIP con scripts, no un `.exe`/MSI firmado, y no instala controladores WinUSB.

### Debian, Ubuntu y Raspberry Pi OS

Consulta la arquitectura del **sistema operativo** (no solo la del procesador):

```sh
dpkg --print-architecture
```

Descarga únicamente el `.deb` cuyo sufijo coincida: `amd64`, `arm64` o `armhf`. Raspberry Pi OS de 64 bits usa `arm64`; el de 32 bits usa `armhf` y necesita ARMv7 o posterior. No se soportan Raspberry Pi 1 ni Zero/Zero W originales con ARMv6.

Desde la carpeta de descargas, para un equipo amd64 y la versión inicial:

```sh
sudo apt install ./bricohams-radio-workspace-v0.3.0-amd64.deb
bricohams-radio
```

Cambia el nombre por tu archivo. Node queda incluido en `/opt/bricohams-radio-workspace`; el lanzador también aparece en el menú de aplicaciones. No ejecutes `bricohams-radio` con `sudo`: las copias y permisos del navegador deben pertenecer a tu usuario.

### Arch Linux

```sh
sudo pacman -S --needed base-devel nodejs
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-arch.tar.gz -C bricohams-installer
cd bricohams-installer
less PKGBUILD
makepkg -si
bricohams-radio
```

Ejecuta `makepkg` como usuario normal. El archivo `*-arch.tar.gz` contiene la receta; `*-arch-source.tar.gz` contiene la aplicación que esa receta descarga de la misma Release y verifica por SHA-256. No es un paquete binario listo para `pacman -U`, ni un paquete publicado en AUR. Requiere Internet durante la construcción y Node.js 22 o superior.

### FreeBSD 14 amd64

```sh
mkdir bricohams-installer
tar -xzf bricohams-radio-workspace-v0.3.0-freebsd-amd64.tar.gz -C bricohams-installer
cd bricohams-installer
su -c './install.sh'
bricohams-radio
```

La instalación necesita root y repositorios `pkg` disponibles para instalar `node22` si falta. El programa se instala en `/usr/local/libexec/bricohams-radio-workspace`, con lanzador `/usr/local/bin/bricohams-radio`. Vuelve a tu usuario normal para arrancarlo. No es un paquete nativo `.pkg` ni un port oficial. El servidor local y la edición de archivos no garantizan conexión a la radio: depende de que Chromium ofrezca las APIs y permisos USB/serie necesarios.

### Primer arranque, permisos y parada

- Abre siempre <http://127.0.0.1:8787> en el mismo navegador y perfil: las copias pertenecen a ese origen, no a la carpeta de instalación. La insignia debe mostrar **Local · instalado**.
- Los lanzadores arrancan el servidor en segundo plano; cerrar la pestaña no lo detiene. No se configura inicio automático al iniciar sesión. Desde código fuente, `npm start` queda en la terminal y se detiene con `Ctrl+C`.
- Los controladores y permisos USB no los configura el instalador. Consulta [Ayuda › Controladores](../ayuda.html#drivers): WinUSB cuando corresponda en Windows, reglas udev y grupo `dialout`/`uucp` según la distribución en Linux. Reinicia sesión después de cambiar grupos y no ejecutes el navegador como root.
- Si el puerto está ocupado, identifica el proceso antes de detenerlo. En Windows: `Get-NetTCPConnection -LocalPort 8787 -State Listen | Select-Object OwningProcess`, después `Get-Process -Id <PID>` y, solo si corresponde al servidor Bricohams, `Stop-Process -Id <PID>`. En Linux usa `ss -lptn 'sport = :8787'`; en FreeBSD, `sockstat -4 -l`. Confirma el comando y usuario del PID y detén solo ese proceso con `kill <PID>`.
- Los registros de Linux/FreeBSD están en `${XDG_STATE_HOME:-$HOME/.local/state}/bricohams-radio/server.log`. En Windows, si no arranca, ejecuta desde PowerShell `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\runtime\node.exe" "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\app\server.cjs"` para ver el error.
- No hace falta conexión a Internet para servir la interfaz y editar archivos locales. Las consultas a proveedores y las descargas de firmware sí la requieren.

## Configuración

| Variable | Uso |
| --- | --- |
| `RB_USER_TOKEN` | Token de aplicación aprobado por RepeaterBook (`rbuapp_…`). |
| `RB_APPROVED_USER_AGENT` | User-Agent registrado en la aprobación. |
| `RB_APPROVED` | Debe valer `yes` para activar la función. |

Solo el servidor lee estas variables. No las guardes en el repositorio. El puerto `8787` y la interfaz `127.0.0.1` están fijados en `server.cjs` por seguridad.

Ejemplo en PowerShell para código fuente, válido solo para la sesión actual:

```powershell
$env:RB_USER_TOKEN = "<token aprobado>"
$env:RB_APPROVED_USER_AGENT = "<user-agent aprobado>"
$env:RB_APPROVED = "yes"
npm start
```

Si usas el ZIP instalado, configura esas variables en PowerShell y ejecuta `& "$env:LOCALAPPDATA\Programs\Bricohams Radio Workspace\Start.ps1"` desde esa misma sesión. Detén antes cualquier servidor ya iniciado: un proceso existente conserva su entorno anterior. No hay todavía una pantalla de ajustes que guarde estas claves; no las pegues en el navegador ni en archivos públicos.

## Actualización

**Instaladores:** exporta primero las copias `.rwb.json`, detén el servidor y descarga/verifica la nueva Release. En Windows vuelve a ejecutar el instalador extraído; en Debian/Ubuntu/Raspberry Pi usa `sudo apt install ./nuevo-paquete.deb`; en Arch reconstruye la nueva receta con `makepkg -si`; en FreeBSD ejecuta el nuevo `install.sh`. Inicia de nuevo el lanzador y recarga el navegador. Las releases ya publicadas no cambian cuando se actualiza `main`; las correcciones requieren otra versión.

**Código fuente:**

```powershell
git pull
npm ci --ignore-scripts
npm test
npm start
```

Exporta tus copias antes de actualizar el navegador o de borrar los datos del sitio.

## Documentación multilingüe

La ayuda se publica en español (original), inglés de EE. UU., alemán, italiano y francés. Las fuentes traducidas están en `docs/i18n/<idioma>/` (mismo nombre que el original) y `README.<idioma>.md`; `npm run build:help` genera `ayuda-*.html` y `ayuda-*.<idioma>.html` con selector de idioma. `docs/i18n/<idioma>/F4HWN-PRESETS.md` se genera automáticamente.

Al cambiar un documento en español, actualiza las cuatro traducciones y comprueba que conservan títulos, bloques de código, código en línea, filas de tabla, imágenes y enlaces:

```powershell
node scripts/i18n.cjs --fix --strict
npm run build:help
```

`--fix` ajusta las rutas relativas de enlaces e imágenes a la carpeta de cada traducción y las dirige a la traducción hermana. También corrige las anclas para los títulos traducidos de Markdown; la ayuda HTML conserva sus anclas estables en todos los idiomas. La comprobación incluye arquitectura, marca, decisiones y despliegue. El índice de referencias se genera desde los títulos traducidos de todas las guías y enlaza cada versión por idioma, incluido inglés de EE. UU. El centro completo de ayuda y preguntas frecuentes está disponible en español, inglés de EE. UU., francés y alemán; sus traducciones se generan desde el HTML español y los recursos de traducción versionados. La comprobación estricta también verifica su cobertura completa y que el HTML generado esté actualizado. Las guías y el índice en italiano siguen disponibles; su enlace al centro de ayuda usa el original español. Los comandos y mensajes de diagnóstico exactos se conservan para facilitar la resolución de errores. Las fuentes externas conservan el idioma publicado por sus autores. Si el texto traducido y el original discrepan, prevalece el español.

## Arranque automático (opcional, desde código fuente)

Los instaladores ya arrancan en segundo plano al abrir el lanzador, pero no al iniciar sesión. Estos ejemplos son para una copia del repositorio con Node instalado; adapta las rutas y no los combines con otro servidor en el mismo puerto.

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

IndexedDB (copias de la radio) y `localStorage` (perfil) se aíslan por origen,
no por ruta. La recomendación inicial era una cuenta dedicada en
`https://<org>.github.io/`. El sitio actual
`https://brico-hams.github.io/Radio-Web-install/` usa la excepción de origen
compartido: comparte almacenamiento con otros proyectos de
`brico-hams.github.io`, incluido Bricohams Studio. No se debe presentar la
subruta como aislamiento. Exporta las copias fuera del navegador; cambiar
de origen no migra automáticamente los datos del perfil. Todas las rutas
del cliente siguen siendo relativas.

### Pasos (los hace el autor)

1. Crear la cuenta u organización `<org>`.
2. Crear el repositorio `<org>.github.io` y subir este código (el push requiere confirmación explícita del autor).
3. En *Settings › Pages*, elegir «GitHub Actions» como origen y activar «Enforce HTTPS».
4. Crear la variable de Actions `PAGES_ORIGIN` con `https://<org>.github.io` (sin barra final). El workflow la usa para recuperar el `data/satellites.json` anterior.
   El workflow solo se ejecuta en el repositorio `<org>/<org>.github.io` (guarda `if: github.repository == ...`): en cualquier otro repositorio se omite, para no publicar bajo un origen compartido que expondría las copias y el perfil (IndexedDB) a otras páginas.
   Excepción consciente: si el autor acepta compartir origen, crea la variable `PAGES_SHARED_ORIGIN_ACCEPTED` con el valor `true` en el repositorio. Las variables no se copian a los forks, así que un fork sigue protegido. El sitio oficial actual usa esta excepción en `https://brico-hams.github.io/Radio-Web-install/` (ver ADR-014).
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

Los instaladores disponibles se publican en [GitHub Releases](https://github.com/Brico-Hams/Radio-Web-install/releases). Para generar una nueva publicación, crea y sube una etiqueta `v*`; GitHub Actions valida el proyecto, descarga runtimes de Node.js 22 verificando sus checksums y adjunta los instaladores junto con `SHA256SUMS`. Las releases incluyen `.deb` amd64/arm64/armhf, `PKGBUILD` para Arch, instalador tarball para FreeBSD y ZIP de Windows 11 x64. El primer release debe publicarse subiendo una etiqueta; este repositorio no crea ni sube etiquetas automáticamente.

## Exportar el proyecto

La [revision de requisitos](ESTADO-ENTREGA.md) enumera lo implementado y los
pendientes. Mientras siga incompleta, la exportacion requiere `--beta`:
genera una instantanea de desarrollo, no una entrega final certificada.
No construye instaladores, no publica y no programa ninguna radio.

Con Node.js 22+, Git y las herramientas de archivo del sistema:

```powershell
npm run export:project -- --beta `
  --firmware 'C:\ruta\Multiboot\Bricohams' `
  --installers 'C:\ruta\instalables-verificados' `
  --android 'C:\ruta\Android-0.8.3-beta' `
  --output 'C:\ruta\entregas\Bricohams-desarrollo.zip'
```

El destino debe ser un ZIP nuevo. En Windows se usa `tar.exe` (bsdtar);
Linux/FreeBSD necesitan `zip`. La herramienta utiliza un directorio temporal
propio y lo limpia al terminar, incluso ante errores.

Si no hay instaladores de escritorio reconstruidos, sustituye `--installers`
por `--without-installers`. Es una omision explicita solo para instantaneas
Beta: el manifiesto registra `desktopInstallersIncluded: false` y no hay
carpeta `installers`. No se reutilizan paquetes antiguos como si fueran nuevos.
La APK indicada con `--android` si se incluye y verifica independientemente.

Contenido:

- `android`, cuando se indica `--android`: APK Beta debug, APK de pruebas,
  guia, licencias, manifiesto de compilacion y SHA256SUMS de una entrega
  creada por `scripts/build-android.ps1`. Comprueba todos sus hashes,
  pruebas host sin fallos, lint sin errores y correspondencia exacta de
  cada fuente Android con `project`, sin omitir ni duplicar archivos.
  Tambien compara version y guia. Si la APK pertenece a fuentes anteriores,
  aborta: reconstruye antes de exportar. Conserva los indicadores de pruebas
  instrumentadas y hardware, no los convierte en pruebas ejecutadas.
  La verificacion criptografica de firma APK corresponde al constructor;
  el exportador verifica integridad/procedencia declarada, no ejecuta el APK.
  Sin `--android`, el manifiesto registra `android: null` y no se incluye
  ninguna APK; no se presenta como una entrega con instalable Android.

- `project`: fuentes actuales, incluidas las nuevas no ignoradas por Git,
  documentacion y herramientas. No incluye dependencias instaladas:
  ejecutar `npm ci --ignore-scripts` tras extraer. Studio se recupera con
  `npm run fetch:studio` usando el lock; los instaladores si lo incluyen.
- `history.bundle`: historial de HEAD, recuperable con
  `git clone history.bundle historial`. Los cambios aun sin commit estan
  en `project`, no en el bundle. El manifiesto indica revision y estado dirty.
- `firmware`: todas las subcarpetas de la raiz indicada que tengan
  `artifacts/build-info.json`, sus artefactos verificados y las fuentes
  de su clon aislado. Comprueba SHA256SUMS, revision upstream y hashes de
  fuentes declarados. Una fuente modificada o manifiesto invalido aborta.
  Los destinos sin artefactos se enumeran como excluidos, no como compilaciones.
  Si una carpeta historica solo contiene los artefactos directamente
  (por ejemplo Fusion/Labs), aborta en vez de omitir ese firmware: localiza
  su construccion original con `source` y `artifacts` en `firmware-builds`.
  Reune las construcciones completas en una raiz de entrega antes de exportar.
- `installers`: los paquetes enumerados en SHA256SUMS de la carpeta indicada.
  Debe contener Windows x64, Debian amd64/arm64/armhf, receta y fuentes Arch
  y FreeBSD amd64. Verifica integridad, no ejecucion ni procedencia de la
  revision: construirlos y probarlos primero. No mezclar versiones antiguas
  para aparentar una entrega nueva.
- `export-info.json` y `SHA256SUMS`: inventario, tamanos, hashes, revisiones,
  compilaciones incluidas/excluidas y advertencia de estado incompleto.

No copia `.git`, `.env`, claves/certificados, cachés, `node_modules`, `dist`,
backups de radio ni datos descargados desde el arbol del proyecto. De `data`
solo incluye `satellites.config.json`. No copia la biblioteca Multiboot ajena,
calibraciones de radios ni la configuracion del navegador.
Las carpetas de firmware e instaladores deben ser salidas de construccion,
no carpetas de datos personales. Revisa tambien el historial Git antes de
compartirlo: excluir un secreto actual no lo elimina de commits antiguos.
Las exclusiones no sustituyen esa revision ni autorizan redistribuir
componentes sin sus licencias.

Extrae en una carpeta nueva y verifica dentro de `Bricohams`:

```sh
sha256sum --check SHA256SUMS
```

En PowerShell, compara cada linea con `Get-FileHash -Algorithm SHA256`, o
usa `export-info.json` para recorrer las rutas y contrastar tamano y SHA-256.
Comprueba tambien el hash del ZIP que muestra el exportador. Ninguno de estos
hashes es una firma digital. El ensayo de extraccion/arranque y la cobertura
funcional siguen siendo condiciones independientes de entrega.

## Despliegues no soportados

- **Otro alojamiento estático** distinto de GitHub Pages: no está probado. Para Pages, ver la sección anterior.
- **Red local o Internet:** requeriría HTTPS, autenticación, cambiar la validación de `Host` y revisar CSRF. No está soportado: las credenciales y los datos de la radio quedarían expuestos.
- **Contenedores:** WebUSB/Web Serial se ejecutan en el navegador del anfitrión. Un contenedor solo aportaría el servidor y complica el acceso a `127.0.0.1`.

## Desinstalación

Primero exporta tus copias y detén solo el proceso del servidor identificado como se explica arriba.

- **Windows:** elimina la carpeta `%LOCALAPPDATA%\Programs\Bricohams Radio Workspace` y su acceso del menú Inicio (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Bricohams Radio Workspace.lnk`). El instalador ZIP no registra un desinstalador en «Aplicaciones instaladas».
- **Debian/Ubuntu/Raspberry Pi OS:** `sudo apt remove bricohams-radio-workspace`.
- **Arch:** `sudo pacman -R bricohams-radio-workspace`.
- **FreeBSD:** el instalador no registra un paquete de aplicación en `pkg`. Elimina únicamente `/usr/local/libexec/bricohams-radio-workspace` y `/usr/local/bin/bricohams-radio` como root. No desinstales Node si otras aplicaciones lo usan.
- **Código fuente:** elimina tu copia del repositorio y, si lo configuraste, su tarea programada o servicio de usuario.

Desinstalar no elimina las copias del navegador. Si también quieres borrarlas, **exporta antes los archivos** y después elimina los datos del sitio `http://127.0.0.1:8787` en el navegador. Los registros de usuario de Linux/FreeBSD se pueden borrar aparte, tras revisarlos.
