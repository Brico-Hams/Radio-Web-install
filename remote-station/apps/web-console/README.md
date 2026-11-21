# Consola web BricoHams

Consola responsive para el coordinador local. El token se
mantiene en memoria, los datos simulados se etiquetan explícitamente y no hay
controles de radio, CAT, PTT o transmisión.

Incluye consulta de perfiles CAT offline y logbook manual SQLite con alta por
rol, listado paginado y exportación ADIF. Estos paneles se consultan por sus
propios botones y no toman valores de la demostración.

## Desarrollo

Desde la raíz del proyecto, inicia el coordinador en una terminal:

```powershell
$env:BRICOHAM_ADMIN_TOKEN = "tu-token-local-de-32-caracteres-o-mas"
py -3.12 -m bricoham_remote_station --logbook-database ".\logbook.sqlite3"
```

En otra terminal, inicia Vite:

```powershell
Set-Location apps/web-console
npm ci
npm run dev
```

Abre `http://127.0.0.1:5173`. Vite reenvía `/api` y `/healthz` al coordinador
`127.0.0.1:8787`; no se habilita CORS.

## Build y pruebas

```powershell
npm run test
npm run lint
npm run build
```

El build queda en `dist/` y lo sirve el coordinador desde el mismo origen en
ejecución local. No lo publiques directamente en una red: el coordinador aún
enlaza solo a loopback y no es un servicio de producción multiusuario.

Desde la raíz, `py -3.12 scripts\build_release.py` construye la consola y un
wheel con sus recursos incluidos. El destino necesita Python y las dependencias
runtime del paquete, no Node.js ni esta carpeta del repositorio.
