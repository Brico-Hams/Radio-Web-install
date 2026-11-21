# Instalación local

La instalación disponible es desde Python 3.12 o posterior. El paquete usa
las dependencias `pyserial`, `wsproto` y `h11`; el audio requiere además el
extra opcional. Para compilar o
desarrollar la consola web se requiere Node.js 22. No hay instalador ni servicio
del sistema automáticamente. Existe una plantilla systemd optativa en la
[guía de agente headless y host HTTPS](despliegue-seguro.md).

La instalación directa desde fuentes incluye APIs y CLI; usa el build web del
repositorio al ejecutarse desde él. El constructor de distribución descrito
abajo incluye también la consola dentro del wheel.

## Distribución integrada

En el equipo de desarrollo, con Python y Node.js 22:

```powershell
npm ci --prefix apps\web-console
py -3.12 scripts\build_release.py
```

En el equipo de destino, instala el wheel generado (no requiere Node.js):

```powershell
py -3.12 -m pip install ".\bricoham_remote_station-0.1.0-py3-none-any.whl"
$env:BRICOHAM_ADMIN_TOKEN = py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"
bricoham-coordinator --logbook-database ".\logbook.sqlite3"
```

La consola incluida se sirve en `http://127.0.0.1:8787/` sin depender del
directorio actual. El constructor solo incorpora módulos Python, metadatos de
distribución y recursos compilados de la consola, no bases de contactos ni tokens.
No convierte el software en un servicio del sistema ni habilita CAT o acceso remoto.

## Windows

1. Instala Python 3.12.
2. Abre PowerShell en la carpeta del proyecto.
3. Instala el proyecto y sus dependencias runtime:

   ```powershell
   py -3.12 -m pip install .
   ```

4. Genera un token y arranca el coordinador:

   ```powershell
   $env:BRICOHAM_ADMIN_TOKEN = py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"
   py -3.12 -m bricoham_remote_station
   ```

5. En otra terminal, configura el mismo token e inicia el agente local:

   ```powershell
   $env:BRICOHAM_ADMIN_TOKEN = "<el mismo token admin>"
   py -3.12 -m bricoham_station_agent
   ```

6. Comprueba `http://127.0.0.1:8787/healthz`.
7. Para generar la consola estática, en otra terminal ejecuta:

   ```powershell
   Set-Location apps\web-console
   npm ci
   npm run build
   ```

   Luego abre `http://127.0.0.1:8787/`. Para desarrollo con Vite consulta
   [apps/web-console/README.md](../apps/web-console/README.md).

## Linux, Raspberry Pi, macOS y FreeBSD

El paquete usa las dependencias indicadas arriba; estos sistemas no se han
validado en este entorno. No se declaran
instaladores, servicio systemd/launchd, paquetes ARM ni compatibilidad FreeBSD
hasta ejecutar sus pruebas.

Instala el proyecto con `python3 -m pip install .`, configura
`BRICOHAM_ADMIN_TOKEN` en el entorno de la sesión y ejecuta:

```sh
python3 -m bricoham_remote_station
```

En otra terminal, con el mismo token, inicia `python3 -m bricoham_station_agent`.
Ambos servicios usan `127.0.0.1` por defecto. Para instalar solo el agente `.pyz`,
configurar HTTPS entre máquinas y preparar systemd consulta
[el despliegue seguro](despliegue-seguro.md). CAT sigue siendo experimental opt-in.
Los [clientes móviles](clientes-moviles.md) requieren sus propias herramientas de build.

## Actualización, respaldo y desinstalación

Para configurar el puerto CAT experimental y WSJT-X en el agente, consulta
[agente CAT y digitales](agente-cat-wsjtx.md). Son opciones desactivadas por
defecto, no detección automática. WSJT-X se instala por separado en la estación.

El coordinador no persiste sesiones ni radios. El
[logbook opcional](logbook.md) sí guarda SQLite en la ruta elegida con
`--database` en CLI o `--logbook-database` en el coordinador; conserva una copia
del archivo con las escrituras detenidas y
exporta ADIF para intercambio. No borres ese archivo al actualizar.

Conserva el token fuera del repositorio. Para desinstalar el paquete ejecuta
`py -3.12 -m pip uninstall bricoham-remote-station` después de cerrar sus procesos.
No se instalan servicios ni controladores USB. Eliminar la copia del repositorio
no desinstala por sí solo un paquete instalado con pip.

Los scripts instalables son `bricoham-coordinator`, `bricoham-station-agent`,
`bricoham-cat` y `bricoham-logbook`. Consulta
[el diagnóstico offline](diagnostico-cat.md): generar bytes de una consulta no
equivale a conectarse a una radio.
