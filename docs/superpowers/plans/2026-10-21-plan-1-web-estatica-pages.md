# Plan 1 · Web estática en GitHub Pages — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar Radio Workspace como web estática HTTPS en GitHub Pages: modo web sin servidor, satélites diarios de SatNOGS y estilo Bricohams Studio, sin perder nada de la versión local.

**Architecture:**
- Un solo código fuente. El cliente lee `runtime.json` (relativo): Pages publica `{"mode":"web"}` y `server.cjs` responde `{"mode":"local"}`. Ante cualquier fallo, el cliente asume `web`.
- En modo web, las funciones que hoy llaman a `/api/*` pasan a:
  - `api.github.com` (F4HWN);
  - archivos que carga el usuario (firmware, CSV de RadioID);
  - `data/satellites.json`, generado por Actions con la validación existente de `data-service.cjs` y `planning-core.js`.
- Un script de build copia la lista fija de archivos a `dist/`.

**Tech Stack:** JavaScript sin bundler, en el patrón actual de IIFE sobre `globalThis.RadioWorkspace`, con `module.exports` para Node. Node ≥ 22 y `node:test`. `satellite.js` 6.0.1. GitHub Actions con `actions/upload-pages-artifact` y `actions/deploy-pages`.

**Spec:** `docs/superpowers/specs/2026-10-21-web-publica-e-instalables-design.md`

Plan 2 (personalización local) y plan 3 (instaladores y releases) van en documentos aparte y dependen de este.

## Global Constraints

- Node.js ≥ 22. Sin dependencias nuevas de npm. Sin CDNs: todo se sirve desde el mismo origen.
- CSP en `<meta http-equiv="Content-Security-Policy">` de cada HTML, exactamente: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'`. Sin scripts ni estilos en línea.
- Las cabeceras HTTP de `server.cjs` no cambian, salvo añadir `runtime.json` a la lista permitida.
- La web se publica en la raíz de `https://<org>.github.io/`. Aun así, todas las rutas del cliente son relativas (`runtime.json`, `data/satellites.json`) y nunca empiezan por `/`.
- Sin secretos ni datos personales en el repo, en `dist/` ni en los registros de Actions. RadioID no se replica. RepeaterBook no está disponible en web.
- Satélites:
  - NORAD fijos en `data/satellites.config.json`: 25544 (ISS), 27607 (SO-50), 43017 (AO-91), 43678 (PO-101);
  - atribución «SatNOGS DB / Libre Space Foundation (CC BY-SA 4.0)», con licencia `https://creativecommons.org/licenses/by-sa/4.0/`;
  - aviso cuando `fetchedAt` tenga más de 7 días.
- Se mantienen todas las garantías actuales: escrituras bloqueadas sin copia verificada, SHA-256 y confirmación manual de modelo. Los textos de la interfaz van en español, sin caracteres corruptos (lo comprueba un test existente).
- Workflows: permisos `contents: read`, `pages: write`, `id-token: write`. Cada `uses:` fijado por SHA de commit completo, con la versión en un comentario. Sin secretos.
- Mensajes de commit en inglés, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Después de cada tarea: `npm test`, `npm run check` y `graphify update .`.

## Review Focus

1. **`runtime.json` ausente, con 404 o no JSON** (archivo abierto como `file://`, despliegue a medias): la app arranca en modo web sin errores en consola. Test en Task 1.
2. **CSV de RadioID enorme o que no es de RadioID** (otro CSV, binario, 0 bytes, >100 MB): se rechaza con un mensaje claro, sin colgar la pestaña. Límite de 100 MiB y de 5 000 filas mostradas. Test en Task 4.
3. **Archivo de firmware equivocado** (otro `.bin`, renombrado o truncado) cargado para una entrada F4HWN: se rechaza por tamaño o SHA-256 antes de prepararlo para slot. Test en Task 3.
4. **`data/satellites.json` corrupto, de otro formato o con un satélite sin TLE válido**: la pestaña SAT muestra el error, sigue siendo usable para otros satélites y no rompe la planificación. Test en Task 5.
5. **Una URL absoluta (`/api/...`, `/runtime.json`)** colada en el código del modo web: rompería cualquier despliegue bajo subruta. Test estático en Task 6.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `runtime-mode.js` (nuevo) | `R.loadRuntime()`: lee `runtime.json` y normaliza el modo |
| `firmware-core.js` (nuevo) | `TARGETS` y `parseF4Release`, compartidos por Node y el navegador (salen de `firmware-service.cjs`) |
| `firmware-catalog.js` | Rama de modo web: catálogo F4HWN vía api.github.com, carga y verificación de archivo local, OpenGD77 manual |
| `radioid-csv.js` (nuevo) | `R.parseRadioIdCSV()` y el perfil local (indicativo e ID DMR) en el navegador |
| `planning-ui.js` | Rama de modo web: contactos por CSV, repetidores deshabilitados, satélites desde JSON |
| `data/satellites.config.json` (nuevo) | Lista de NORAD |
| `scripts/fetch-satellites.cjs` (nuevo) | Genera `satellites.json` con `DataService` y respaldo del JSON publicado |
| `scripts/build-pages.cjs` (nuevo) | Copia la lista fija a `dist/` y escribe `runtime.json` y `.nojekyll` |
| `.github/workflows/pages.yml` (nuevo) | Test, build, satélites y despliegue: push a `main`, diario y manual |
| `app.js`, `styles.css`, `*.html` | Diseño Studio, CSP en `<meta>`, antiframe, insignia de modo |
| `server.cjs` | Sirve `/runtime.json` |
| `tests/web-mode.test.cjs` (nuevo) | Tests de este plan; se añade al script `test` de `package.json` |

---

### Task 1: Detección de modo con `runtime.json`

**Files:**
- Create: `runtime-mode.js`
- Modify: `server.cjs` (lista `allowed` y ruta `/runtime.json`), `index.html`, `opengd77.html`, `quansheng.html`, `ayuda.html` (cargar `runtime-mode.js` justo después de `radio-core.js`; `index.html` y `ayuda.html` no cargan hoy `radio-core.js`, así que se añaden ambos antes de `app.js`), `package.json` (`check` y `test`)
- Test: `tests/web-mode.test.cjs`

**Interfaces:**
- Produces:
  - `R.loadRuntime(fetchImpl = fetch): Promise<{ mode: "web" | "local" }>`. Nunca lanza excepciones. Solo `"local"` si la respuesta es 200, de tipo `application/json` y con `mode === "local"`. En cualquier otro caso devuelve `"web"`.
  - `R.runtime`: una promesa memorizada de la primera llamada, que usan todos los módulos.
  - El servidor responde `GET /runtime.json` con `{"mode":"local"}`, `application/json; charset=utf-8` y las cabeceras actuales. El plan 2 añadirá campos.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test("runtime: local only when server says so", async () => {
  const ok = body => async () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "local" })), { mode: "local" });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "admin" })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("nope", { status: 404 })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("<html>", { headers: { "content-type": "text/html" } })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => { throw new TypeError("Failed to fetch"); }), { mode: "web" });
});
test("server serves runtime.json as local", async () => { /* withServer como en site.test.cjs */
  const response = await fetch(`${base}/runtime.json`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: "local" });
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/web-mode.test.cjs`. Expected: FAIL (`R.loadRuntime is not a function`, 404 en `/runtime.json`).

- [ ] **Step 3: Implementar** `runtime-mode.js` con el patrón IIFE de `planning-core.js`. Usa `fetch("runtime.json", { cache: "no-store", credentials: "omit" })`. Añade la ruta en `server.cjs` antes del servido de archivos estáticos.

- [ ] **Step 4: Ejecutar `npm test` y `npm run check`.** Expected: todo PASS.

- [ ] **Step 5: Commit**: `feat: detect web or local runtime from runtime.json`.

---

### Task 2: CSP en `<meta>`, antiframe e insignia de modo

**Files:**
- Modify: los 4 HTML (meta CSP en `<head>`, antes de cualquier `<script>`), `app.js` (antiframe e insignia), `styles.css`
- Test: `tests/web-mode.test.cjs`, `tests/site.test.cjs`

**Interfaces:**
- Consumes: `R.runtime` (Task 1).
- Produces: un elemento `#mode-badge` en la barra superior, con el texto exacto `Web · GitHub Pages` o `Local · instalado`, y `document.body.dataset.mode = "web" | "local"`, que usan las Tasks 3–5 para el CSS.

- [ ] **Step 1: Escribir los tests que fallan**

```js
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'";
test("every page carries the exact meta CSP before any script", () => {
  for (const page of pages) {
    const html = read(page);
    const meta = html.indexOf(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
    assert.ok(meta > 0 && meta < html.indexOf("<script"), page);
  }
});
test("app refuses to run framed", () => {
  assert.match(read("app.js"), /window\.top !== window\.self/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan.**

- [ ] **Step 3: Implementar.**
  - Antiframe: al principio de `app.js`, si `window.top !== window.self`, sustituye `#app` por un aviso con un enlace `target="_blank"` a `location.href` y detiene la inicialización.
  - Insignia: se pinta tras `await R.runtime`. En `index.html` y `ayuda.html`, `R` solo tiene `runtime-mode.js` y `radio-core.js`.

- [ ] **Step 4: Ejecutar `npm test`.** Expected: PASS, incluido el test existente «todas las paginas llevan marca, favicon y ningun script ni estilo en linea».

- [ ] **Step 5: Verificar en el navegador** con `npm start` y `http://127.0.0.1:8787/`: insignia `Local · instalado` y consola sin errores de CSP.

- [ ] **Step 6: Commit**: `feat: meta CSP, frame guard and runtime mode badge`.

---

### Task 3: Firmware en modo web

**Files:**
- Create: `firmware-core.js` (mueve `TARGETS`, `REPO` y `parseF4Release` desde `firmware-service.cjs`, que pasa a importarlos con `require("./firmware-core.js")`)
- Modify: `firmware-service.cjs`, `firmware-catalog.js`, `opengd77.html` y `quansheng.html` (cargar `firmware-core.js` antes de `firmware-catalog.js`), `server.cjs` (`allowed`), `package.json` (`check`)
- Test: `tests/web-mode.test.cjs`. Los tests existentes de `tests/firmware.test.cjs` deben seguir verdes sin tocarlos.

**Interfaces:**
- Produces:
  - `R.firmwareCore = { TARGETS, REPO, parseF4Release(release, target) }`. Lanza `Error` con `.status = 502` en los mismos casos que hoy. `firmware-service.cjs` convierte esos errores en `FirmwareError` donde hoy se esperaba ese tipo.
  - `R.verifyLocalFirmware(entry, data: Uint8Array): Promise<{ data, manifest }>`. Exige:
    - `data.length === entry.size` cuando `entry.size` existe;
    - si `entry.expectedSHA256` existe, que coincida con `await R.sha256(data)`.
    - Devuelve un `manifest` con la misma forma que `verifyFirmwarePayload` (`manifestFormat: "radio-workspace-firmware-download"`, `manifestVersion: 1`, `publisherHashVerified: Boolean(entry.expectedSHA256)`, `backupSubstitute: false`, `sha256`). Así los botones existentes («Guardar manifiesto», «Preparar imagen para slot») funcionan sin cambios.
  - Modo web en `mountFirmwareCatalog`:
    - Los modelos salen de `R.firmwareCore.TARGETS`, sin red.
    - F4HWN: `fetch("https://api.github.com/repos/" + REPO + "/releases/latest")` y `parseF4Release`.
    - OpenGD77: entrada manual `{ target, family, url: "https://www.opengd77.com/downloads/releases/<group>/", expectedSHA256: null, size: null, format: "zip", slotCompatible: false }`, con el nombre del archivo validado contra `TARGETS[target].pattern`.
    - El botón «Descargar y verificar» se sustituye por el enlace «Descargar en la fuente oficial ↗» más `<input type="file" id="firmware-file">` con la etiqueta «Cargar el archivo descargado». Archivo de 4 MiB como máximo (`MAX_FILE` actual).

- [ ] **Step 1: Escribir los tests que fallan**

```js
test("web firmware: F4HWN file must match published size and digest", async () => {
  const data = new Uint8Array(4096).fill(7);
  const entry = { ...f4Entry, size: 4096, expectedSHA256: await R.sha256(data) };
  const { manifest } = await R.verifyLocalFirmware(entry, data);
  assert.equal(manifest.publisherHashVerified, true);
  await assert.rejects(R.verifyLocalFirmware(entry, data.slice(0, 4095)), /tamano/i);
  const other = new Uint8Array(4096).fill(8);
  await assert.rejects(R.verifyLocalFirmware(entry, other), /SHA-256/);
});
test("web firmware: OpenGD77 manual file is never marked publisher-verified", async () => {
  const { manifest } = await R.verifyLocalFirmware(gd77ManualEntry, new Uint8Array(2048));
  assert.equal(manifest.publisherHashVerified, false);
});
test("firmware-core is shared: service and browser parse the same release identically", () => {
  assert.deepEqual(R.firmwareCore.parseF4Release(fakeRelease, "UV-K1"), require("../firmware-service.cjs").parseF4Release(fakeRelease, "UV-K1"));
});
```

`f4Entry`, `gd77ManualEntry` y `fakeRelease` se construyen como en `tests/firmware.test.cjs`, con `fakeF4()`.

- [ ] **Step 2: Ejecutar y ver que fallan.**

- [ ] **Step 3: Implementar.** La rama de modo se decide una sola vez con `const { mode } = await R.runtime`. En modo local, el comportamiento no cambia.

- [ ] **Step 4: Ejecutar `npm test`.** Expected: PASS en los nuevos y en todos los de `firmware.test.cjs`.

- [ ] **Step 5: Commit**: `feat: web-mode firmware catalog with local file verification`.

---

### Task 4: Contactos por CSV de RadioID, perfil local y repetidores en modo web

**Files:**
- Create: `radioid-csv.js`
- Modify: `planning-ui.js`, `opengd77.html` (cargar `radioid-csv.js` antes de `planning-ui.js`), `server.cjs` (`allowed`), `package.json` (`check`)
- Test: `tests/web-mode.test.cjs`

**Interfaces:**
- Produces:
  - `R.parseRadioIdCSV(text: string, { country: string, region?: string }): { entries, total, truncated }`.
    - Cabecera exacta esperada (CSV oficial `user.csv` de radioid.net): `RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY`.
    - Filtra por país (obligatorio) y región, comparando con la función `norm` de `planning-core.js`, que pasa a exportarse como `R.norm`.
    - Cada entrada tiene la misma forma que `DataService.contacts()`: `{ id, callsign, name, country, region, city, source: "https://radioid.net", kind: "private" }`, con las mismas validaciones de `id` (1..0xFFFFFF) y `callsign` (1..32).
    - Máximo 5 000 entradas devueltas (`truncated: true` si hay más). Rechaza textos de más de 100 MiB.
  - `R.profile`:
    - `get(): { callsign, dmrId } | null`;
    - `set({ callsign, dmrId })`, que valida `callsign` con `/^[A-Z0-9]{3,10}$/` tras pasar a mayúsculas y `dmrId` con `/^\d{7}$/`;
    - `clear()`.
    - Almacenamiento: `localStorage` con la clave `radio-workspace-profile`, siempre dentro de try/catch; si `localStorage` no está disponible, `get()` devuelve `null`.
  - En modo web, `planning-ui.js`:
    - Pestaña Contactos: sustituye «Buscar contactos RadioID» por el enlace «Descargar user.csv en radioid.net ↗» (`https://radioid.net/static/user.csv`) y un input de archivo «Cargar user.csv». El resto (selección, añadir al codeplug, exportar JSON) no cambia.
    - El contacto cuyo `id === profile.dmrId` se marca con «(tú)».
    - Si hay perfil y el campo País está vacío, se rellena con el país de ese contacto.
    - Repetidores: los botones de RepeaterBook quedan deshabilitados, con el texto «RepeaterBook solo está disponible en la versión instalada (requiere tu clave aprobada).» y un enlace a `https://github.com/<repo>/releases/latest`, con el repositorio tomado de `BRAND.repository` en `app.js`.
    - Formulario de perfil (indicativo, ID DMR, Guardar, Borrar) en la pestaña Contactos, con mensajes en un `role="status"`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
const header = "RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY\n";
test("RadioID CSV: filters by country/region and keeps provider shape", () => {
  const csv = header + "2141234,EA4ABC,Ana,Lopez,Madrid,Madrid,Spain\n3101234,K1ABC,Bob,Smith,Boston,Massachusetts,United States\n";
  const { entries } = R.parseRadioIdCSV(csv, { country: "Spain" });
  assert.deepEqual(entries, [{ id: 2141234, callsign: "EA4ABC", name: "Ana Lopez", country: "Spain", region: "Madrid", city: "Madrid", source: "https://radioid.net", kind: "private" }]);
  assert.equal(R.parseRadioIdCSV(csv, { country: "spain", region: "madrid" }).entries.length, 1);
});
test("RadioID CSV: rejects foreign CSV, oversize text, and caps rows", () => {
  assert.throws(() => R.parseRadioIdCSV("a,b,c\n1,2,3\n", { country: "Spain" }), /RadioID/);
  assert.throws(() => R.parseRadioIdCSV("", { country: "Spain" }), /RadioID/);
  const many = header + Array.from({ length: 5001 }, (_, i) => `${2140000 + i},EA${i},A,B,C,D,Spain`).join("\n");
  const result = R.parseRadioIdCSV(many, { country: "Spain" });
  assert.equal(result.entries.length, 5000); assert.equal(result.truncated, true); assert.equal(result.total, 5001);
});
test("profile validates callsign and 7-digit DMR id", () => {
  assert.throws(() => R.profile.set({ callsign: "ea4", dmrId: "2141234" }), /indicativo/i);
  assert.throws(() => R.profile.set({ callsign: "EA4ABC", dmrId: "214123" }), /ID DMR/);
});
```

El test de límite de 100 MiB usa un `String` simulado con `length` falso, sin reservar 100 MiB.

- [ ] **Step 2: Ejecutar y ver que fallan.**

- [ ] **Step 3: Implementar.** El parser recorre las líneas una a una y trata los campos entre comillas con comas dentro. No usa `eval` ni regex catastróficas. El archivo se lee con `file.text()` tras comprobar `file.size <= 100 * 1024 * 1024`.

- [ ] **Step 4: Ejecutar `npm test`.** Expected: PASS.

- [ ] **Step 5: Verificar en el navegador**, en modo web: servir `dist/` con `npx --yes http-server@14.1.1 dist -p 8790 -a 127.0.0.1`, o con el server de Task 6. Cargar un CSV de prueba de 3 filas generado a mano, sin datos reales. Se ve la marca «(tú)», y RepeaterBook aparece deshabilitado con su texto.

- [ ] **Step 6: Commit**: `feat: web-mode RadioID CSV import, local profile and RepeaterBook notice`.

---

### Task 5: Satélites diarios (generador y cliente)

**Files:**
- Create: `data/satellites.config.json`, `scripts/fetch-satellites.cjs`
- Modify: `planning-ui.js`, `planning-core.js` (exportar `R.validateSatellitesFile`)
- Test: `tests/web-mode.test.cjs`

**Interfaces:**
- `data/satellites.config.json`: `{ "norad": [25544, 27607, 43017, 43678] }`.
- `node scripts/fetch-satellites.cjs --out dist/data/satellites.json [--previous <url>]`:
  - Por cada NORAD llama a `new DataService().satellite({ norad, provider: "satnogs" })` y `.transmitters({ norad })`, y valida con `R.validateTLE`.
  - Si falla, toma ese satélite de `--previous` (fetch a la URL publicada) si existe y pasa `R.validateSatellitesFile`.
  - Si al final no hay ningún satélite válido, sale con código 1.
  - Exporta `buildSatellites({ dataService, previous, now }): Promise<SatellitesFile>` para los tests.
- `SatellitesFile`:
  ```
  { format: "radio-workspace-satellites", version: 1, fetchedAt: ISO,
    attribution: "SatNOGS DB / Libre Space Foundation (CC BY-SA 4.0)",
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
    satellites: [{ norad, name, tle1, tle2, source, fetchedAt, stale: boolean, transmitters: [...] }] }
  ```
  `stale` vale `true` si el satélite viene de `--previous`. `transmitters` usa la forma de `DataService.transmitters().entries`.
- `R.validateSatellitesFile(json): SatellitesFile` comprueba formato y versión, cada TLE con su NORAD (como `DataService.satellite`) y lanza en cualquier otro caso. `R.satelliteAgeWarning(file, now): string | null` devuelve un aviso si `now - fetchedAt > 7 días`.
- En modo web, `planning-ui.js`: `request("satellite" | "transmitters")` se resuelve desde `fetch("data/satellites.json")`, validado una vez y memorizado. Un NORAD que no esté en el archivo da el error «Satélite no incluido en la lista diaria. Usa la versión instalada para otros NORAD.». El selector de proveedor orbital queda fijo en SatNOGS. El texto de `R.satelliteAgeWarning` se antepone en `#plan-tle-info`, y la época y la fuente se muestran como hoy. Un satélite con `stale: true` añade «(dato del último despliegue correcto)».

- [ ] **Step 1: Escribir los tests que fallan**

```js
test("satellites: builds file, falls back per satellite to previous, fails when nothing valid", async () => {
  const now = Date.parse("2026-10-21T05:00:00Z");
  const ds = fakeDataService({ ok: [25544], fail: [27607, 43017, 43678] });
  const previous = await buildSatellites({ dataService: fakeDataService({ ok: [25544, 27607, 43017, 43678] }), now });
  const file = await buildSatellites({ dataService: ds, previous, now });
  assert.equal(file.satellites.length, 4);
  assert.equal(file.satellites.find(s => s.norad === 27607).stale, true);
  await assert.rejects(buildSatellites({ dataService: fakeDataService({ fail: [25544, 27607, 43017, 43678] }), previous: null, now }), /satelite/i);
});
test("satellites file validation and age warning", () => {
  assert.throws(() => R.validateSatellitesFile({ format: "x" }), /formato/i);
  const bad = structuredClone(validFile); bad.satellites[0].tle1 = bad.satellites[0].tle1.replace("25544", "99999");
  assert.throws(() => R.validateSatellitesFile(bad), /NORAD/);
  assert.equal(R.satelliteAgeWarning(validFile, Date.parse(validFile.fetchedAt) + 6 * 864e5), null);
  assert.match(R.satelliteAgeWarning(validFile, Date.parse(validFile.fetchedAt) + 8 * 864e5), /7 dias|7 días/);
});
```

`fakeDataService` reutiliza los TLE de prueba de `tests/planning.test.cjs`.

- [ ] **Step 2: Ejecutar y ver que fallan.**

- [ ] **Step 3: Implementar.** El script solo escribe a disco desde `main()` cuando se ejecuta directamente (`require.main === module`).

- [ ] **Step 4: Ejecutar `npm test`.** Después, prueba real: `node scripts/fetch-satellites.cjs --out tmp/satellites.json`. Expected: 4 satélites con `stale: false`, salvo que SatNOGS falle. `tmp/` va en `.gitignore`.

- [ ] **Step 5: Commit**: `feat: daily SatNOGS satellites file and web-mode satellite source`.

---

### Task 6: Build de Pages y workflow

**Files:**
- Create: `scripts/build-pages.cjs`, `.github/workflows/pages.yml`
- Modify: `.gitignore` (`dist/`, `tmp/`), `package.json` (script `"build:pages": "node scripts/build-pages.cjs"`)
- Test: `tests/web-mode.test.cjs`

**Interfaces:**
- `node scripts/build-pages.cjs`:
  - Vacía `dist/` y copia exactamente los archivos de la lista permitida de `server.cjs`. Para ello `server.cjs` exporta `ALLOWED_FILES` como array congelado, con el que construye su `Set` `allowed`; los tests usan ese array como `allowed`. `satellite.min.js` se toma de `node_modules/satellite.js/dist/`.
  - Escribe `dist/runtime.json` con `{"mode":"web"}` y `dist/.nojekyll`.
  - No copia nada más: ni tests, ni docs, ni `package.json`.
  - Exporta `build(outDir)`.
- `pages.yml`:
  - Disparadores: `push` a `main`, `schedule: - cron: "17 5 * * *"` y `workflow_dispatch`.
  - Un job `build`: `actions/checkout`, `actions/setup-node` (22), `npm ci --ignore-scripts`, `npm test`, `npm run build:pages`, `node scripts/fetch-satellites.cjs --out dist/data/satellites.json --previous "${{ vars.PAGES_ORIGIN }}/data/satellites.json"`, `actions/upload-pages-artifact` (`path: dist`).
  - Job `deploy` con `environment: github-pages` y `actions/deploy-pages`.
  - Permisos a nivel de workflow: `contents: read`, `pages: write`, `id-token: write`. `concurrency: { group: pages, cancel-in-progress: false }`.
  - Todas las acciones fijadas por SHA completo; el implementador consulta el SHA de la última versión estable de cada una con `gh api repos/<owner>/<action>/releases/latest` y lo anota con `# vX.Y.Z`.
  - `PAGES_ORIGIN` es una variable de repositorio (no secreta), por ejemplo `https://<org>.github.io`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test("pages build copies only the allow-list plus runtime.json and .nojekyll", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "pages-"));
  build(out);
  const files = fs.readdirSync(out).sort();
  assert.deepEqual(files, [...allowed, ".nojekyll", "runtime.json"].sort());
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, "runtime.json"), "utf8")), { mode: "web" });
});
test("client code never fetches absolute paths", () => {
  for (const name of allowed.filter(n => n.endsWith(".js") && n !== "satellite.min.js")) {
    assert.doesNotMatch(read(name), /fetch\(\s*[`"']\//, name);
  }
});
test("pages workflow pins actions by SHA and keeps minimal permissions", () => {
  const wf = read(".github/workflows/pages.yml");
  for (const use of wf.matchAll(/uses:\s*(\S+)/g)) assert.match(use[1], /@[0-9a-f]{40}$/, use[1]);
  assert.match(wf, /contents: read/); assert.match(wf, /pages: write/); assert.match(wf, /id-token: write/);
  assert.doesNotMatch(wf, /secrets\./);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan.** El segundo fallará por los `fetch("/api/...")` actuales. Convierte esas rutas en relativas (`api/...`): en local funcionan igual porque las páginas están en la raíz.

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Ejecutar `npm test`.** Luego `npm run build:pages` y servir `dist/` en local en modo web. Comprobar en el navegador: insignia «Web · GitHub Pages», OpenGD77 y Quansheng cargan, la consola no muestra errores de CSP y el catálogo F4HWN lista versiones desde api.github.com.

- [ ] **Step 5: Commit**: `feat: GitHub Pages build and deploy workflow`.

---

### Task 7: Estilo Bricohams Studio

**Files:**
- Modify: `app.js` (estructura de sidebar, topbar y pasos), `styles.css`, `docs/BRANDING.md`
- Test: `tests/site.test.cjs`

**Interfaces:**
- Consumes: `#radio-status` y `#radio-connect` de `app.js` y `radio-ui.js`; `#mode-badge` (Task 2).
- Produces, en las páginas de radio:
  - una barra superior fija con `#topbar-status`, que refleja el texto de `#radio-status` mediante `MutationObserver`, y `#topbar-connect` (botón «⌁ Conectar»), que hace `click()` sobre `#radio-connect` y queda deshabilitado mientras este lo esté;
  - en la sidebar, pasos numerados que son anclas a las secciones existentes:
    - OpenGD77: `0 Copias y conexión` → `.connection`, `1 Codeplug` → `#radio-operations`, `2 Canales y contactos` → panel de planificación, `3 Satélites` → pestaña SAT, `4 Firmware` → `.firmware-panel`;
    - Quansheng: lo mismo sin «Contactos».
  - La etiqueta `RADIOAFICIÓN · HAZLO TÚ MISMO` sobre el título.
- Paleta: fondo `#0b1418`, tarjetas `#111d22`, borde `#1f3238`, acento `#2bb3a3`, texto `#e6f1f2` y secundario `#8fa7ab`. Contraste AA comprobado con el validador del skill `dataviz` o calculado. Variables en `:root`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
test("radio pages expose topbar connect proxy and numbered steps", () => {
  const app = read("app.js");
  for (const id of ["topbar-status", "topbar-connect", "mode-badge"]) assert.match(app, new RegExp(`id="${id}"`));
  assert.match(app, /RADIOAFICIÓN · HAZLO TÚ MISMO|RADIOAFICION · HAZLO TU MISMO/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan.**

- [ ] **Step 3: Implementar.** Se conservan «Saltar al contenido», los `role="status"` y `role="log"`, y el foco visible. No se elimina ningún id existente que usen `radio-ui.js` o `planning-ui.js`.

- [ ] **Step 4: Ejecutar `npm test`.** Después, verificación visual en el navegador a 1280 px y 375 px: sin scroll horizontal; el botón de la barra superior conecta igual que el de la sección; la navegación por teclado llega a todo.

- [ ] **Step 5: Commit**: `feat: Bricohams Studio look and feel with topbar connect`.

---

### Task 8: Documentación y ayuda

**Files:**
- Modify: `README.md`, `docs/DEPLOYMENT.md` (sección «Web pública en GitHub Pages», que sustituye la viñeta de «no soportado»), `docs/ARCHITECTURE.md` (modos y `runtime.json`), `docs/DECISIONS.md` (nuevo ADR «Web estática en origen dedicado»), `ayuda.html` (diferencias web/local; cómo cargar firmware y `user.csv`)
- Test: los tests existentes de `site.test.cjs`, que comprueban que la documentación existe, enlaza archivos reales y que el índice de la ayuda apunta a anclas existentes.

- [ ] **Step 1: Escribir los cambios.** En `DEPLOYMENT.md`, los pasos que debe hacer el autor:
  1. Crear la cuenta u organización `<org>`.
  2. Crear el repo `<org>.github.io` y subir este código.
  3. En Settings › Pages, elegir «GitHub Actions» y activar «Enforce HTTPS».
  4. Crear la variable `PAGES_ORIGIN`.
  5. Ejecutar el workflow manualmente la primera vez.

- [ ] **Step 2: Ejecutar `npm test`.** Expected: PASS.

- [ ] **Step 3: Commit**: `docs: document public web mode and Pages deployment`.

---

## Fuera de este plan

- **Plan 2:** Ajustes locales (`config.json`, `POST /api/config` con token anti-CSRF y `Origin`, CLI `bricohams-radio config set`), perfil RadioID en el servidor y clave de RepeaterBook.
- **Plan 3:** paquetes `.deb`, `.rpm`, PKGBUILD, FreeBSD y Windows; lanzador; reglas udev/devd; workflow de releases con `SHA256SUMS` y attestation; workflow mensual de Node.
- **Acciones del autor:** crear `<org>`, crear el repo, configurar Pages y hacer el primer push. El push requiere su confirmación explícita.
