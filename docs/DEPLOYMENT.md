# Despliegue

El único despliegue soportado es **local**, en el mismo equipo al que se conecta la radio.

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

Abre <http://127.0.0.1:8787>. **No uses `localhost`**: el servidor valida el encabezado `Host` y lo rechaza. Usa siempre el mismo origen para conservar el historial de IndexedDB.

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

## Despliegues no soportados

- **GitHub Pages u otro alojamiento estático:** las páginas y guías se verán, pero no habrá catálogo de firmware ni proveedores de codeplug, porque necesitan `server.cjs`.
- **Red local o Internet:** requeriría HTTPS, autenticación, cambiar la validación de `Host` y revisar CSRF. No está soportado: las credenciales y los datos de la radio quedarían expuestos.
- **Contenedores:** WebUSB/Web Serial se ejecutan en el navegador del anfitrión. Un contenedor solo aportaría el servidor y complica el acceso a `127.0.0.1`.

## Desinstalación

Detén el servidor y borra la carpeta del repositorio. Si además quieres eliminar el historial, **exporta antes las copias** y después borra los datos del sitio `http://127.0.0.1:8787` en el navegador.
