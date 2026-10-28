const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { once } = require("node:events");
const rows = require("../ui-translations.js");
const I = require("../ui-i18n.js");
const { ALLOWED_FILES, createServer } = require("../server.cjs");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("locale priority: explicit URL, saved preference, then Spanish (not navigator language)", () => {
  const saved = { getItem: () => "de" };
  assert.equal(I.resolveLocale("?lang=fr", saved), "fr");
  assert.equal(I.resolveLocale("?lang=en-US", saved), "en-US");
  assert.equal(I.resolveLocale("?lang=en", saved), "en-US");
  assert.equal(I.resolveLocale("", saved), "de");
  assert.equal(I.resolveLocale("?lang=xx", saved), "de");
  assert.equal(I.resolveLocale("", { getItem: () => "it" }), "es");
  assert.equal(I.resolveLocale("", { getItem() { throw new Error("blocked"); } }), "es");
  assert.equal(I.resolveLocale("", null), "es");
});

test("catalog has complete, unique locale tuples and preserves technical safety limits", () => {
  assert.equal(new Set(rows.map(row => row[0])).size, rows.length);
  for (const row of rows) {
    assert.equal(row.length, 4, row[0]);
    assert.ok(row.every(value => typeof value === "string" && value.trim()), row[0]);
    const placeholders = value => (value.match(/\{\d+\}/g) || []).sort();
    for (const translation of row.slice(1)) assert.deepEqual(placeholders(translation), placeholders(row[0]), row[0]);
  }
  for (const locale of ["en-US", "fr", "de"]) {
    for (const label of ["Saltar al contenido", "Conectar y respaldar", "Leer codeplug", "Guardar canal (RX)",
      "Instalar y verificar CRC", "Restablecer banco CFG", "Calcular proximos pases",
      "1. Restaurar Flash stock y verificar", "Consultar modelos oficiales"]) {
      assert.notEqual(I.translate(label, locale), label, `${locale}: ${label}`);
    }
    const warning = rows.find(row => row[0].startsWith("Solo firmware con acceso fisico"))[0];
    for (const token of ["38400", "bootloader"]) assert.ok(I.translate(warning, locale).toLowerCase().includes(token));
    const slot = rows.find(row => row[0].startsWith("Instalar y verificar CRC borra"))[0];
    assert.ok(I.translate(slot, locale).includes("118 KiB"));
    assert.ok(I.translate("Escrituras bloqueadas: sin copia verificada.", locale).length > 20);
  }
  assert.equal(I.translate("OpenGD77", "fr"), "OpenGD77");
  assert.equal(I.translate("Bricohams", "de"), "Bricohams");
  assert.equal(I.translate("Unknown protocol error 0x1234", "fr"), "Unknown protocol error 0x1234");
  assert.equal(I.translate("ERROR: Archivo ausente o corrupto.", "en-US"), "ERROR: File missing or corrupt.");
  assert.equal(I.translate("ERROR: Unknown protocol error 0x1234", "de"), "FEHLER: Unknown protocol error 0x1234");
});

test("dynamic catalog messages preserve parameter values and Spanish is lossless", () => {
  assert.equal(I.translate("  Editando EA5KAO.  ", "en-US"), "  Editing EA5KAO.  ");
  assert.equal(I.translate("3 contactos seleccionados (se conservan entre paginas).", "fr"),
    "3 contacts sélectionnés (conservés entre les pages).");
  assert.equal(I.translate("1 de 42 registros recibidos. Sin fechas UTC ni valores RF calibrados.", "de"),
    "1 von 42 Einträgen empfangen. Keine UTC-Zeitangaben oder kalibrierten RF-Werte.");
  assert.equal(I.translate(" \nSin conexion.\n ", "es"), " \nSin conexion.\n ");
  assert.equal(I.translate("Copiar comando Bricohams: finalizado.", "en-US"), "Copy Bricohams command: completed.");
  const connection = "WebUSB. En Windows, comprueba el controlador WinUSB indicado por el CPS. Este navegador expone la API requerida; se solicitaran permisos al conectar.";
  assert.equal(I.translate(connection, "en-US"),
    "WebUSB. On Windows, check the WinUSB driver specified by the CPS. This browser provides the required API; permissions will be requested when connecting.");
});

test("Quansheng channel templates, dragging and read-only workflow are localized", () => {
  for (const locale of ["en-US", "fr", "de"]) {
    for (const label of ["Conectar y leer canales (solo lectura)", "Plantillas de canales",
      "Preparar plantilla para arrastrar", "Seleccionar todos los canales para cargar",
      "Arrastra al walkie para insertar", "Seleccionar canal 12", "16 canales para cargar.",
      "Descargar canales del walkie (copia original)", "2 canales movidos en el archivo local. La radio no se modifica."]) {
      assert.notEqual(I.translate(label, locale), label, `${locale}: ${label}`);
    }
    assert.ok(I.translate("Seleccionar canal 12", locale).includes("12"));
    assert.ok(I.translate("16 canales para cargar.", locale).startsWith("16"));
  }
});

test("all authored static native tool controls have translations or explicit technical names", () => {
  const catalog = new Set(rows.map(row => row[0]));
  const technical = new Set(["AnyTone Beta", "MHz", "RX", "TX", "CAT RX Bricohams Beta", "Slot", "Bytes", "CRC",
    "App", "RX MHz", "TX MHz", "FM", "DMR", "AM", "Color Code", "Time Slot", "RF MHz", "REMER", "RX / TX MHz",
    "ID", "ISS / 25544", "SO-50 / 27607", "AO-91 / 43017", "PO-101 / 43678", "SatNOGS DB (TLE)",
    "CelesTrak (TLE)", "CC/TS/TG"]);
  for (const file of ["app.js", "radio-ui.js", "planning-ui.js", "channel-template-ui.js", "firmware-catalog.js", "custom-firmware-ui.js",
    "quansheng-tools.js", "quansheng-factory.js", "precompiled-catalog.js", "anytone.html"]) {
    for (const [, raw] of read(file).matchAll(/<(?:h[1-3]|button|label|summary|option|th)\b[^>]*>([^<>]+)</g)) {
      const label = raw.replace(/\s+/g, " ").trim();
      if (!label || label.includes("${") || /^(?:\d+(?:\.\d+)?(?: kHz)?|\d \/ CFG \d)$/.test(label)) continue;
      assert.ok(catalog.has(label) || technical.has(label), `${file}: ${label}`);
    }
  }
  for (const file of ["radio-ui.js", "planning-ui.js", "firmware-catalog.js", "custom-firmware-ui.js",
    "quansheng-tools.js", "quansheng-factory.js"]) {
    for (const match of read(file).matchAll(/(?:action|perform)\("([^"\n]+)"|attach\("[^"\n]+", "([^"\n]+)"/g)) {
      assert.ok(catalog.has(match[1] || match[2]), `${file}: operation ${match[1] || match[2]}`);
    }
  }
});

test("Android translations preserve resource IDs and redesigned satellite format contracts", () => {
  const resources = folder => {
    const entries = [...read(`android/app/src/main/res/${folder}/strings.xml`)
      .matchAll(/<string name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g)];
    const values = new Map(entries.map(match => [match[1], match[2]]));
    assert.equal(values.size, entries.length, `${folder}: duplicate resource IDs`);
    return values;
  };
  const defaults = resources("values");
  const formats = value => [...value.matchAll(/%(\d+)\$[-+0 #,(]*\d*(?:\.\d+)?([a-zA-Z])/g)]
    .map(match => `${match[1]}:${match[2]}`).sort();
  for (const folder of ["values-en-rUS", "values-fr", "values-de"]) {
    const translated = resources(folder);
    for (const [key, value] of defaults) {
      assert.ok(translated.has(key), `${folder}: missing ${key}`);
      assert.deepEqual(formats(translated.get(key)), formats(value), `${folder}: ${key}`);
    }
    assert.deepEqual(formats(translated.get("satellite_results")), ["1:d", "2:d", "3:d", "4:s"]);
    assert.match(translated.get("err_backup_format"), /1.*2/);
  }
  const satellite = read("android/app/src/main/java/org/bricohams/radio/SatelliteActivity.kt");
  assert.match(satellite, /errorText\(error\)/);
  assert.match(satellite, /satellite_save_observer/);
  assert.doesNotMatch(satellite, /satellite_predict|satellite_line1/);
});

test("Android 0.8.3 packaging and tag release artifacts match versionCode 12", () => {
  const gradle = read("android/app/build.gradle.kts");
  assert.match(gradle, /versionCode = 12\b/);
  assert.match(gradle, /versionName = "0\.8\.3-beta"/);
  const workflow = read(".github/workflows/android.yml");
  const script = read("scripts/build-android.ps1");
  assert.match(workflow, /tags: \["v\*", "android-v\*"\]/);
  assert.match(workflow, /java-version: "17"/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /gh release upload "\$TAG"/);
  for (const name of ["bricohams-android-0.8.3-beta-debug.apk", "bricohams-android-0.8.3-beta-androidTest.apk"]) {
    assert.ok(workflow.includes(`upload/${name}`));
    assert.ok(script.includes(name));
  }
  assert.match(script, /applicationVersion = '0\.8\.3-beta'/);
  assert.match(script, /applicationVersionCode = 12\b/);
  assert.doesNotMatch(workflow + script, /0\.8\.0-beta|0\.7\.1-beta/);
  for (const suffix of ["", ".en", ".fr", ".de", ".it"]) {
    const readme = read(`README${suffix}.md`);
    assert.match(readme, /0\.8\.3-beta/);
    assert.doesNotMatch(readme, /0\.8\.1-beta|[Vv]ersionCode 10/);
    const directory = suffix ? `docs/i18n/${suffix.slice(1)}` : "docs";
    assert.match(read(`${directory}/BRICOHAMS-FIRMWARE.md`), /`0\.8\.3-beta`/);
    assert.match(read(`${directory}/ESTADO-ENTREGA.md`), /AND-01[^\n]+0\.8\.3-beta/);
  }
});

test("Pages links retain relative paths, other query parameters and fragments", () => {
  const base = "https://example.invalid/Radio-Web-install/quansheng.html?lang=de";
  assert.equal(I.localizedURL("index.html#main", base, "fr"), "index.html?lang=fr#main");
  assert.equal(I.localizedURL("../opengd77.html?x=1#connection", base, "en-US"),
    "../opengd77.html?x=1&lang=en-US#connection");
  assert.equal(I.localizedURL("anytone.html?lang=de", base, "es"), "anytone.html?lang=es");
  assert.equal(I.localizedURL("ayuda-quansheng.html#puesta-en-marcha-de-0-a-100", base, "fr"),
    "ayuda-quansheng.fr.html#puesta-en-marcha-de-0-a-100");
  assert.equal(I.localizedURL("ayuda-android.de.html?x=1#mapa", base, "en-US"), "ayuda-android.en.html?x=1#mapa");
  assert.equal(I.localizedURL("ayuda-referencias.fr.html", base, "es"), "ayuda-referencias.html");
  assert.equal(I.localizedURL("../ayuda-despliegue.html", base, "de"), "../ayuda-despliegue.de.html");
  assert.equal(I.localizedURL("ayuda.html#drivers", base, "fr"), "ayuda.fr.html#drivers");
  for (const href of ["#planning-panel", "?q=a", "https://grid.radio/opengd77/", "studio.html",
    "precompiled/catalog.json", "https://elsewhere.invalid/index.html"]) {
    assert.equal(I.localizedURL(href, base, "fr"), href);
  }
});

// The repository uses node:test without a DOM dependency. This fixture exercises
// the DOM adapter; real-browser checks additionally cover actual MutationObserver delivery.
class Node {
  constructor(tag, data = "") {
    this.nodeType = tag === "#text" ? 3 : 1;
    this.tagName = tag.toUpperCase();
    this.data = data;
    this.childNodes = [];
    this.attrs = {};
    this.events = {};
  }
  append(...nodes) {
    for (let node of nodes) {
      if (typeof node === "string") node = new Node("#text", node);
      node.parentElement = this;
      this.childNodes.push(node);
    }
  }
  get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map(n => n.textContent).join(""); }
  set textContent(value) { this.childNodes = []; this.append(value); }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
  get id() { return this.attrs.id; }
  set id(value) { this.attrs.id = value; }
  get value() { return this._value ?? this.attrs.value ?? (this.tagName === "OPTION" ? this.textContent : ""); }
  set value(value) { this._value = value; }
  addEventListener(name, fn) { this.events[name] = fn; }
  closest(selector) {
    const matches = term => {
      term = term.trim();
      if (term.startsWith("#")) return this.id === term.slice(1);
      if (term === "[translate='no']") return this.getAttribute("translate") === "no";
      if (term === "[translate='yes']") return this.getAttribute("translate") === "yes";
      if (term === "tbody[id]") return this.tagName === "TBODY" && this.hasAttribute("id");
      return this.tagName === term.toUpperCase();
    };
    return selector.split(",").some(matches) ? this : this.parentElement?.closest(selector) || null;
  }
}
function fixture(search = "") {
  const document = new Node("html");
  document.documentElement = document;
  document.body = new Node("body");
  document.baseURI = `https://example.invalid/project/index.html${search}`;
  document.append(document.body);
  document.createElement = tag => new Node(tag);
  document.querySelector = () => null;
  document.getElementById = id => {
    function find(node) { return node.id === id ? node : node.childNodes.map(find).find(Boolean); }
    return find(document);
  };
  const storage = new Map();
  const dialogs = [];
  let observer;
  const context = {
    URL, URLSearchParams, BricohamsUITranslations: rows,
    location: { search, href: document.baseURI },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    history: { state: { unchanged: true }, replaceState(state, title, url) { context.location.href = String(url); } },
    MutationObserver: class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() {} },
    prompt: (...args) => { dialogs.push(args); return "REINICIAR RADIO"; }
  };
  vm.createContext(context);
  vm.runInContext(read("ui-i18n.js"), context);
  return { document, context, storage, dialogs, get observer() { return observer; } };
}
test("DOM switching restores Spanish, retains input state, values and node identity", () => {
  const f = fixture("?lang=en-US");
  const heading = new Node("h1"); heading.textContent = "Tus radios.";
  const button = new Node("button"); button.textContent = "Conectar y respaldar"; button.disabled = true;
  const option = new Node("option"); option.textContent = "Pendiente de verificar";
  const input = new Node("input"); input.value = "EA5KAO"; input.checked = true; input.setAttribute("placeholder", "Nombre");
  const raw = new Node("textarea"); raw.textContent = "Nombre";
  const table = new Node("tbody"); table.id = "user-data";
  const cell = new Node("td"); cell.textContent = "Nombre"; table.append(cell);
  const state = new Node("td"); state.textContent = "Si"; state.setAttribute("translate", "yes"); table.append(state);
  f.document.body.append(heading, button, option, input, raw, table);
  const mounted = f.context.BricohamsUI.mount(f.document);
  assert.equal(f.document.documentElement.lang, "en-US");
  assert.equal(heading.textContent, "Your radios.");
  assert.equal(button.textContent, "Connect and back up");
  assert.equal(option.textContent, "Verification pending");
  assert.equal(option.value, "Pendiente de verificar");
  assert.equal(input.getAttribute("placeholder"), "Name");
  assert.equal(input.value, "EA5KAO");
  assert.equal(input.checked, true);
  assert.equal(button.disabled, true);
  assert.equal(raw.textContent, "Nombre");
  assert.equal(cell.textContent, "Nombre");
  assert.equal(state.textContent, "Yes");
  const select = f.document.getElementById("ui-language");
  select.value = "fr"; select.events.change();
  assert.equal(heading.textContent, "Vos radios.");
  assert.equal(f.context.BricohamsUI.resolveLocale("", f.context.localStorage), "fr");
  assert.match(f.context.location.href, /lang=fr/);
  mounted.setLocale("de");
  assert.equal(button.textContent, "Verbinden und sichern");
  assert.equal(state.textContent, "Ja");
  mounted.setLocale("es");
  assert.equal(heading.textContent, "Tus radios.");
  assert.equal(button.textContent, "Conectar y respaldar");
  assert.equal(input.getAttribute("placeholder"), "Nombre");
  assert.ok(f.document.body.childNodes.includes(button));
});

test("new DOM content and character changes are localized; native confirmation tokens stay literal", () => {
  const f = fixture("?lang=de");
  f.context.BricohamsUI.mount(f.document);
  const status = new Node("p"); status.textContent = "Sin conexion.";
  f.document.body.append(status);
  f.observer.callback([{ type: "childList", addedNodes: [status] }]);
  assert.equal(status.textContent, "Nicht verbunden.");
  status.childNodes[0].data = "Perfil borrado.";
  f.observer.callback([{ type: "characterData", target: status.childNodes[0] }]);
  assert.equal(status.textContent, "Profil gelöscht.");
  assert.equal(f.context.prompt("Conectar", "REINICIAR RADIO"), "REINICIAR RADIO");
  assert.deepEqual(f.dialogs[0], ["Verbinden", "REINICIAR RADIO"]);
  f.context.prompt("Se modificara el codeplug de la radio.\nEl respaldo ya esta guardado. Esta accion modifica la radio. Escribe ESCRIBIR para confirmar.");
  assert.equal(f.dialogs[1][0], "Codeplug des Geräts wird geändert.\nSicherung bereits gespeichert. Diese Aktion verändert das Gerät. Zur Bestätigung ESCRIBIR eingeben.");
});

test("DOM selection still works with denied storage and history", () => {
  const f = fixture();
  f.context.localStorage.setItem = () => { throw new Error("denied"); };
  f.context.history.replaceState = () => { throw new Error("denied"); };
  const mounted = f.context.BricohamsUI.mount(f.document);
  mounted.setLocale("fr");
  assert.equal(f.document.documentElement.lang, "fr");
  assert.equal(f.document.getElementById("ui-language").value, "fr");
});

test("all four app entry points load same-origin locale assets before app.js under existing CSP", () => {
  for (const name of ["index.html", "opengd77.html", "quansheng.html", "anytone.html"]) {
    const html = read(name);
    assert.match(html, /<html lang="es">/);
    for (const file of ["ui-translations.js", "ui-i18n.js"]) {
      assert.ok(ALLOWED_FILES.includes(file));
      assert.ok(html.indexOf(`src="${file}"`) < html.indexOf('src="app.js"'));
      assert.ok(read("scripts/build-installers.sh").includes(file));
    }
    assert.match(html, /script-src 'self'/);
    assert.doesNotMatch(html, /\sonchange=|<script(?![^>]*src=)/);
  }
  assert.match(read("styles.css"), /--accent:#f7941d/);
  assert.doesNotMatch(read("styles.css"), /\.brand-logo\{[^}]*filter:/);
});

test("server serves locale assets with CSP and correct MIME; Pages copies them through the allowlist", async () => {
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    for (const file of ["ui-i18n.js", "ui-translations.js"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/${file}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/javascript; charset=utf-8");
      assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
      assert.equal(await response.text(), read(file));
    }
    assert.match(read("scripts/build-pages.cjs"), /for \(const name of ALLOWED_FILES\)/);
  } finally { server.close(); }
});
