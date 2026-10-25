"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { pages, render, optionNames, allOptionNames, resolvePresets, checkOptionCoverage, presetMarkdown } = require("../scripts/build-help.cjs");
const { ALLOWED_FILES, createServer } = require("../server.cjs");
const root = path.join(__dirname, "..");
// Generated docs are stored with LF; a Windows checkout with core.autocrlf turns them into CRLF.
const read = name => fs.readFileSync(path.join(root, name), "utf8").replace(/\r\n/g, "\n");

test("cada opcion del catalogo tiene explicacion y las matrices conservan valores y ausencias", () => {
  const text = read("docs/AYUDA-OPCIONES-F4HWN.md");
  checkOptionCoverage(text);
  assert.equal(optionNames().length, 84);
  const rows = [...text.matchAll(/^\| `(DEV|ENABLE_[A-Z0-9_]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(rows.sort(), allOptionNames());
  assert.throws(() => checkOptionCoverage(""), /Falta explicar/);
  assert.equal(read("docs/F4HWN-PRESETS.md"), presetMarkdown());
  const local = JSON.parse(read("docs/bricohams-options-v6.1.0.json"));
  const { UPSTREAM } = require("../scripts/build-bricohams.cjs");
  assert.equal(local.upstream.commit, UPSTREAM.commit);
  for (const preset of Object.values(local.presets)) {
    assert.equal(preset.options.ENABLE_FEAT_F4HWN_MULTIBOOT, true);
    for (const name of Object.keys(preset.options)) assert.ok(text.includes(`\`${name}\``), name);
  }
});

test("las 18 versiones historicas resuelven herencia sin proyectar opciones nuevas hacia atras", () => {
  const history = JSON.parse(read("docs/f4hwn-history-presets.json"));
  assert.equal(history.versions.length, 18);
  assert.equal(allOptionNames().length, 94);
  for (const version of history.versions) {
    assert.match(version.commit, /^[a-f0-9]{40}$/);
    assert.match(version.sha256, /^[a-f0-9]{64}$/);
    assert.equal(version.status, "verified");
    const resolved = resolvePresets(version.presets);
    assert.ok(resolved.Fusion);
    assert.ok(Object.values(resolved).every(options => Object.values(options).every(value => typeof value === "boolean")));
  }
  const old = resolvePresets(history.versions[0].presets);
  assert.equal(Object.hasOwn(old.Fusion, "ENABLE_FEAT_F4HWN_MULTIBOOT"), false);
  const latest = resolvePresets(history.versions.at(-1).presets);
  const catalog = require("../f4hwn-options.js").F4HWN_OPTIONS;
  for (const [name, preset] of Object.entries(catalog.presets)) {
    for (const [option, enabled] of Object.entries(preset.options)) assert.equal(latest[name][option], enabled, `${name}/${option}`);
  }
  const sample = { configurePresets: [
    { name: "a", hidden: true, cacheVariables: { ENABLE_X: "ON" } },
    { name: "b", hidden: true, cacheVariables: { ENABLE_X: false, ENABLE_Y: "OFF" } },
    { name: "c", inherits: ["a", "b"], cacheVariables: { ENABLE_Z: true } }
  ] };
  assert.deepEqual(resolvePresets(sample), { c: { ENABLE_X: true, ENABLE_Y: false, ENABLE_Z: true } });
  assert.throws(() => resolvePresets({ configurePresets: [{ name: "x", inherits: "x" }] }), /circular/);
});

test("las guias generadas tienen enlaces y anclas locales resolubles, sin scripts", () => {
  for (const [source, file] of Object.entries(pages)) {
    const markdown = read(`docs/${source}`);
    assert.doesNotMatch(markdown, /\]\([^)]*\\/, `Enlace no portable: ${source}`);
    const html = read(file);
    assert.ok(markdown.length > 1000, source);
    assert.match(html, /<html lang="es">/);
    assert.match(html, /Bricohams Radio Workspace<\/title>/);
    assert.doesNotMatch(html, /<script|\son\w+=|javascript:|\sstyle=/i, file);
    assert.ok(ALLOWED_FILES.includes(file), file);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `ID duplicado: ${file}`);
    for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^https?:/.test(link)) continue;
      const [target, anchor] = link.split("#");
      const resolved = target || file;
      assert.ok(ALLOWED_FILES.includes(resolved), `${file}: enlace no servido ${link}`);
      assert.ok(fs.existsSync(path.join(root, resolved)), `${file}: enlace roto ${link}`);
      if (anchor) assert.ok(read(resolved).includes(`id="${anchor}"`), `${file}: ancla rota ${link}`);
    }
  }
});

test("la referencia OpenGD77 incluye las familias de identificacion y revisiones de descarga", () => {
  const text = read("ayuda-opengd77-modelos.html").replace(/[^a-z0-9]/gi, "").toUpperCase();
  for (const model of ["GD77", "GD77S", "DM1801", "DM1801A", "RD5R", "MD9600",
    "RT90", "MDUV380", "RT3S", "MDUV390", "DM1701", "RT84", "MD2017",
    "DM1701RGB", "DM32", "UV008", "MD380", "10WPLUS"]) {
    assert.ok(text.includes(model), `modelo/revision sin documentar: ${model}`);
  }
  assert.match(read("ayuda-opengd77.html"), /128 KiB/);
  assert.match(read("ayuda-opengd77.html"), /MCU/);
});

test("las nuevas referencias distinguen Egzumer V1, Karina PY32 y compatibilidad multiboot no demostrada", () => {
  const egzumer = read("docs/AYUDA-EGZUMER.md");
  const pack = read("docs/AYUDA-PACK-DIM0S.md");
  const karina = read("docs/KARINA.md");
  assert.match(egzumer, /7607f0a4bd6203d1f06b70556fc1ce0d7399d6b3/);
  assert.match(egzumer, /Apache License 2\.0/);
  assert.match(egzumer, /no MIT/);
  assert.equal([...egzumer.matchAll(/^\| ENABLE_[A-Z0-9_]+ \| [01] \|/gm)].length, 41);
  assert.match(pack, /52b41c182dd82c1fbdc027dc2da7bbcb02c7d79c/);
  for (const value of ["0x08010AF5", "0x08010B39",
    "81328890f55739d917fe9531feb76179b28db2a80672e1383dfb76917a13ee82",
    "40467077e32273392da6ff735ff69c0e40779c9236477e4ead287add645db4d4"]) {
    assert.ok(pack.includes(value), value);
  }
  assert.match(pack, /No se modifica una/);
  assert.match(karina, /AYUDA-PACK-DIM0S\.md/);
  assert.match(karina, /V3 y UV-K1/);
  assert.doesNotMatch(read("firmware-core.js"), /Dim0s|egzumer/);
});

test("el generador escapa HTML y codigo, renderiza tablas y rechaza enlaces ejecutables", () => {
  const output = render("# Prueba\n\n## Opciones\n\n<script>x</script>\n\n| A | B |\n| --- | --- |\n| `ENABLE_A` | **ON** |\n\n1. Uno\n   continuacion\n2. Dos\n\n```text\n<img onerror=x>\n```", "AYUDA-FIRMWARES.md");
  assert.match(output.body, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(output.body, /<th scope="col">A<\/th>/);
  assert.match(output.body, /<code>ENABLE_A<\/code>/);
  assert.match(output.body, /<li>Uno continuacion<\/li>/);
  assert.match(output.body, /&lt;img onerror=x&gt;/);
  assert.throws(() => render("[x](javascript:alert)", "AYUDA-FIRMWARES.md"), /Esquema/);
  assert.throws(() => render("```\nsin cerrar", "AYUDA-FIRMWARES.md"), /sin cerrar/);
  assert.throws(() => render("[x](inexistente.md)", "AYUDA-FIRMWARES.md"), /roto/);
});

test("las imagenes Bricohams documentan captura RX, multipreset RAM y sus limites Beta", () => {
  for (const name of ["docs/BRICOHAMS-FIRMWARE.md", "ayuda-bricohams.html"]) {
    const text = read(name);
    for (const value of ["--module spectrum", "VFO-PRO", "118044", "13440/16384",
      "WAIT SAMPLES", "ENTER 8 DIGITS", "SPAN OUT OF BAND", "SAVE 2 PRESETS",
      "BLACKLIST FULL", "GAIN LIMIT", "524288", "CSS SEARCH...", "CSS NEEDS FM"]) {
      assert.ok(text.includes(value), `${name}: ${value}`);
    }
    assert.match(text, /no transmite|no transmitir/);
    assert.match(text, /no escriben EEPROM/);
    assert.match(text, /sin ARDF\/Satelites/);
    assert.doesNotMatch(text, /pendientes adaptador y construccion de imagen dedicada/);
  }
});
test("CAT RX documenta protocolo experimental, seguimiento web y limites de hardware", () => {
  for (const name of ["docs/BRICOHAMS-FIRMWARE.md", "ayuda-bricohams.html"]) {
    const text = read(name);
    for (const value of ["CAT RX Bricohams v1", "0x7B00", "0x7B01", "113868",
      "12384/16384", "3000 ms", "CAT TIMEOUT", "CAT READY RX", "no significa aplicado",
      "no es cifrado ni autenticacion", "Seguimiento de pase web implementado",
      "CatPassTracker", "2000 ms", "750 ms", "cliente USB experimental con seguimiento orbital SGP4"]) {
      assert(text.includes(value), `${name}: ${value}`);
    }
  }
});
test("los presets BHSP distinguen archivos locales de persistencia EEPROM", () => {
  for (const name of ["docs/BRICOHAMS-FIRMWARE.md", "ayuda-bricohams.html"]) {
    const text = read(name);
    for (const value of ["Transferencia de presets a archivos implementada", "0x7B10", "0x7B11",
      "208 bytes", "5000 ms", "CRC incorrecto no sustituye la tabla",
      "no equivale a persistencia EEPROM", "no escribe EEPROM", "118044"]) {
      assert(text.includes(value), `${name}: ${value}`);
    }
  }
});
test("estadisticas ARDF explican observaciones manuales, limites y ausencia de GPS", () => {
  for (const name of ["docs/BRICOHAMS-FIRMWARE.md", "ayuda-bricohams.html"]) {
    const text = read(name);
    for (const value of ["Estadisticas ARDF por baliza implementadas", "113960", "12576/16384",
      "0x7B20", "0x7B21", "65535", "connectionSession", "No es deteccion automatica",
      "no un evento por pulsacion ni un recorrido GPS", "no es cifrado/autenticacion"]) {
      assert(text.includes(value), `${name}: ${value}`);
    }
  }
});
test("Android documenta las funciones reales, permisos y limites de la APK", () => {
  for (const name of ["docs/ANDROID.md", "ayuda-android.html"]) {
    const value = read(name);
    for (const marker of ["0.7.1-beta", "SQLite", "WAV PCM", "LoTW", "no ejecutadas",
      "GPS", "No se fusionan sesiones", "rollback", "Sesenta y nueve pruebas host", "60 segundos",
      "Estadisticas e historial ARDF", "Haversine", "No es recorrido completo", "222.39016",
      "Captura de microfono Morse y Robot36", "RECORD_AUDIO", "Conceder permiso no graba",
      "2880000", "No se reanuda", "no valida recepcion RF real",
      "Importar ADIF con vista previa", "campos no conservados", "Buscar contactos", "no duplica",
      "SSTV Robot36 desde WAV", "320x240", "VIS", "paridad par", "No admite 44.1 kHz", "15 en los de color",
      "Satelites SGP4 y seguimiento de pases", "Rhino 1.7.15", "satellite.js 6.0.1", "500 ms", "no reanuda",
      "CDC ACM", "usb-serial-for-android 3.9.0", "3000 ms", "0x7B00", "no son cifrado ni autenticacion"]) {
      assert(value.includes(marker), `${name}: ${marker}`);
    }
  }
  assert(read("scripts/build-installers.sh").includes("ayuda-android.html"));
});

test("la revision de entrega mantiene cada peticion y distingue objetivos de capacidades", () => {
  const markdown = read("docs/ESTADO-ENTREGA.md");
  const ids = [...markdown.matchAll(/^\| ([A-Z0-9]+-\d+) \|/gm)].map(match => match[1]);
  const expected = ["USB-01", "USB-02", "FW-01", "WEB-01", "FW-02", "FW-03", "FW-04", "FW-05",
    "FW-06", "FW-07", "FW-08", "FW-09", "HELP-01", "HELP-02", "PRO-01", "DATA-01", "DATA-02",
    "DATA-03", "GD77-01", "GD77-02", "ANY-01", "ANY-02", "ANY-03", "ANY-04", "CAT-01", "CAT-02",
    "AND-01", "AND-02", "AND-03", "AND-04", "AND-05", "AND-06", "AND-07", "AND-08",
    "BRAND-01", "BRAND-02", "DOC-01", "REL-01", "REL-02", "REL-03"];
  assert.deepEqual(ids, expected);
  const html = read("ayuda-entrega.html");
  for (const id of expected) assert(html.includes(id), id);
  assert.match(html, /incompleta/);
  assert.match(read("ayuda.html"), /href="ayuda-entrega.html"/);
  assert.doesNotMatch(read("AUTHORS.md"), /Copilot|ChatGPT|inteligencia artificial/i);
  for (const name of ["docs/KARINA.md", "ayuda-karina.html"]) {
    assert(read(name).includes("archivos BHSP"), name);
    assert(!read(name).includes("no tienen persistencia ni transferencia USB"), name);
  }
});

test("ayuda, instaladores y paginas estaticas incluyen todas las guias sin exponer fuentes arbitrarias", async () => {
  const help = read("ayuda.html");
  const installer = read("scripts/build-installers.sh");
  for (const file of Object.values(pages)) {
    assert.ok(help.includes(`href="${file}"`), `entrada ausente: ${file}`);
    assert.ok(installer.includes(file), `instalador omite ${file}`);
  }
  assert.ok(installer.includes("help-docs.css"));
  assert.ok(installer.includes('node "$root/scripts/build-help.cjs"'));
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const file of [...Object.values(pages), "help-docs.css"]) {
      const response = await fetch(`${base}/${file}`);
      assert.equal(response.status, 200, file);
      assert.equal(await response.text(), fs.readFileSync(path.join(root, file), "utf8"));
      assert.match(response.headers.get("content-type"), file.endsWith(".css") ? /text\/css/ : /text\/html/);
    }
    assert.equal((await fetch(`${base}/docs/AYUDA-FIRMWARES.md`)).status, 404);
  } finally { server.close(); }
});
