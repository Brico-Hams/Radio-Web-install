const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const { createServer } = require("../server.cjs");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const pages = ["index.html", "opengd77.html", "quansheng.html", "ayuda.html"];
const docs = ["README.md", "AUTHORS.md", "ACKNOWLEDGEMENTS.md", "SUPPORT.md", "SECURITY.md",
  "docs/ARCHITECTURE.md", "docs/DECISIONS.md", "docs/DEPLOYMENT.md", "docs/BRANDING.md"];
const helpSections = ["inicio", "funcionamiento", "opengd77", "quansheng", "codeplug", "firmware",
  "copias", "drivers", "errores", "faq", "soporte", "creditos"];

async function withServer(run) {
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test("el servidor sirve la ayuda y el logotipo con tipo y cabeceras seguras", async () => {
  await withServer(async base => {
    for (const [name, type] of [["ayuda.html", "text/html"], ["bricohams-logo.svg", "image/svg+xml"]]) {
      const response = await fetch(`${base}/${name}`);
      assert.equal(response.status, 200, name);
      assert.equal(response.headers.get("content-type"), `${type}; charset=utf-8`);
      assert.match(response.headers.get("content-security-policy"), /script-src 'self'; style-src 'self'/);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(await response.text(), read(name));
    }
    for (const hidden of ["LICENSE", "docs/DECISIONS.md", "README.md", "package.json", "tests/site.test.cjs"]) {
      assert.equal((await fetch(`${base}/${hidden}`)).status, 404, hidden);
    }
  });
});

test("todas las paginas llevan marca, favicon y ningun script ni estilo en linea", () => {
  for (const name of pages) {
    const html = read(name);
    assert.match(html, /<title>[^<]*Bricohams Radio Workspace<\/title>/, name);
    assert.match(html, /<link rel="icon" href="bricohams-logo.svg" type="image\/svg\+xml">/, name);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, name);
    assert.doesNotMatch(html, /\sstyle=|<style|\son[a-z]+=/i, name);
    assert.match(html, /<script src="app.js"( defer)?><\/script>/, name);
  }
});

test("la ayuda contiene todas las secciones y el indice apunta a anclas existentes", () => {
  const html = read("ayuda.html");
  assert.match(html, /<body data-page="ayuda">/);
  assert.match(html, /<template id="help-content">/);
  assert.match(html, /id="help-filter"/);
  for (const id of helpSections) assert.match(html, new RegExp(`<section[^>]+id="${id}"[^>]+data-help`), id);
  const ids = new Set(["main", ...[...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1])]);
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
  assert.ok(anchors.length >= helpSections.length);
  for (const anchor of anchors) assert.ok(ids.has(anchor), `ancla rota #${anchor}`);
  for (const [, href] of html.matchAll(/href="([^"#:]+)(?:#[^"]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(root, href)), `enlace local roto ${href}`);
  }
  for (const [tag] of html.matchAll(/<a [^>]*href="https?:[^"]+"[^>]*>/g)) {
    assert.match(tag, /target="_blank"/, tag);
    assert.match(tag, /rel="noopener noreferrer"/, tag);
  }
});

test("la ayuda cubre controladores y errores reales del codigo", () => {
  const html = read("ayuda.html");
  assert.match(html, /1FC9/i);
  assert.match(html, /0094/);
  assert.match(html, /WinUSB/);
  assert.match(html, /Zadig/);
  assert.match(html, /ATTRS\{idVendor\}=="1fc9"/);
  assert.match(html, /CH340/);
  const sources = ["server.cjs", "radio-ui.js", "transports.js", "gd77-connector.js", "quansheng-connector.js",
    "backup-store.js", "planning-ui.js", "planning-core.js", "data-service.cjs", "firmware-service.cjs", "radio-core.js"].map(read).join("\n");
  const table = html.slice(html.indexOf('id="errores"'), html.indexOf('id="faq"'));
  const messages = [...table.matchAll(/<samp>([^<]+)<\/samp>/g)].map(match => match[1].replace(/&gt;/g, ">").trim());
  assert.ok(messages.length >= 15, "tabla de errores");
  for (const message of messages) assert.ok(sources.includes(message), `mensaje no existe en el codigo: ${message}`);
});

test("licencia, autoria y metadatos del paquete son coherentes", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.license, "GPL-3.0-or-later");
  assert.equal(pkg.name, "bricohams-radio-workspace");
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.match(pkg.author, /Bricohams/);
  assert.equal(pkg.repository.url, "git+https://github.com/anatolbricoham/Radio-Web-install.git");
  assert.deepEqual(Object.keys(pkg.dependencies), ["satellite.js"]);
  const license = read("LICENSE");
  assert.match(license, /GNU GENERAL PUBLIC LICENSE\s+Version 3, 29 June 2007/);
  assert.ok(license.length > 30000);
  assert.match(read("README.md"), /GPL-3.0-or-later/);
  assert.match(read("AUTHORS.md"), /Anatol-Emilio Lopez-Maitchovcow/);
});

test("la documentacion existe, enlaza archivos reales y reconoce las fuentes", () => {
  for (const name of docs) {
    const text = read(name);
    assert.ok(text.length > 400, name);
    for (const [, target] of text.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)(?:#[^)]*)?\)/g)) {
      assert.ok(fs.existsSync(path.join(root, path.dirname(name), target)), `${name}: enlace roto ${target}`);
    }
  }
  const credits = read("ACKNOWLEDGEMENTS.md");
  for (const source of ["grid.radio", "OpenGD77", "armel/uv-k1-k5v3-firmware-custom", "satellite.js", "MIT",
    "Apache-2.0", "GPL-2.0", "RadioID", "Data courtesy of RepeaterBook.com", "SatNOGS", "CC BY-SA 4.0", "CelesTrak", "Vallado"]) {
    assert.ok(credits.includes(source), source);
  }
  const decisions = read("docs/DECISIONS.md");
  assert.ok((decisions.match(/^## ADR-\d{3}/gm) || []).length >= 10);
  for (const variable of ["RB_USER_TOKEN", "RB_APPROVED_USER_AGENT", "RB_APPROVED"]) {
    assert.match(read("docs/DEPLOYMENT.md"), new RegExp(variable));
    assert.match(read("data-service.cjs"), new RegExp(variable));
  }
});

test("el logotipo es SVG autonomo sin scripts ni recursos externos", () => {
  const svg = read("bricohams-logo.svg");
  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /<title[^>]*>Bricohams<\/title>/);
  assert.doesNotMatch(svg, /<script|href="http|xlink:href="http|on[a-z]+=/i);
});

test("los textos en espanol no contienen caracteres corruptos por codificacion", () => {
  for (const name of [...pages, ...docs]) {
    const text = read(name).replace(/https?:\/\/[^\s"')<>]+/g, "");
    assert.doesNotMatch(text, /\p{L}\?\p{L}|\uFFFD|Ã[\u0080-\u00BF]/u, name);
  }
});

test("no se publican correos ni secretos en paginas y documentacion", () => {
  const files = [...pages, ...docs, "app.js", "styles.css", "package.json"];
  for (const name of files) {
    const text = read(name);
    assert.doesNotMatch(text, /[A-Za-z0-9._%+-]+@(?!example\.invalid)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, name);
    assert.doesNotMatch(text, /rbuapp_[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_/, name);
  }
});

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'";
test("every page carries the exact meta CSP before any script", () => {
  for (const page of pages) {
    const html = read(page);
    const meta = html.indexOf(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`);
    assert.ok(meta > 0 && meta < html.indexOf("<script"), page);
  }
});
