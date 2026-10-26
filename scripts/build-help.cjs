"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.join(__dirname, "..");
const catalog = require("../f4hwn-options.js").F4HWN_OPTIONS;
const localCatalog = require("../docs/bricohams-options-v6.1.0.json");
const history = require("../docs/f4hwn-history-presets.json");
const pages = Object.freeze({
  "AYUDA-FIRMWARES.md": "ayuda-firmwares.html",
  "AYUDA-CONFIGURACION.md": "ayuda-configuracion.html",
  "AYUDA-QUANSHENG.md": "ayuda-quansheng.html",
  "AYUDA-OPCIONES-F4HWN.md": "ayuda-opciones-f4hwn.html",
  "F4HWN-PRESETS.md": "ayuda-presets-f4hwn.html",
  "AYUDA-ARDF.md": "ayuda-ardf.html",
  "AYUDA-EGZUMER.md": "ayuda-egzumer.html",
  "AYUDA-PACK-DIM0S.md": "ayuda-pack-dim0s.html",
  "AYUDA-OPENGD77.md": "ayuda-opengd77.html",
  "AYUDA-OPENGD77-MODELOS.md": "ayuda-opengd77-modelos.html",
  "AYUDA-ANYTONE.md": "ayuda-anytone.html",
  "KARINA.md": "ayuda-karina.html",
  "BRICOHAMS-FIRMWARE.md": "ayuda-bricohams.html",
  "ESTADO-ENTREGA.md": "ayuda-entrega.html",
  "ANDROID.md": "ayuda-android.html",
  "ATLAS-UV-K5-V3.md": "ayuda-atlas-uv-k5-v3.html",
  "DM32UV-FIRMWARE.md": "ayuda-dm32uv.html",
  "ENLACES-COMUNIDAD.md": "ayuda-enlaces-comunidad.html"
});
const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const slug = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function optionNames() {
  return [...new Set(Object.values(catalog.presets).flatMap(preset => Object.keys(preset.options)))].sort();
}
function checkOptionCoverage(text) {
  for (const name of allOptionNames()) assert(text.includes(`\`${name}\``), `Falta explicar ${name}`);
}
function resolvePresets(catalog) {
  const visiting = new Set();
  function resolve(name) {
    assert(!visiting.has(name), `Herencia circular de presets: ${name}`);
    const preset = catalog.configurePresets.find(item => item.name === name);
    assert(preset, `Preset no encontrado: ${name}`);
    visiting.add(name);
    const values = {};
    const parents = preset.inherits ? [].concat(preset.inherits) : [];
    for (const parent of parents.reverse()) Object.assign(values, resolve(parent));
    Object.assign(values, preset.cacheVariables);
    visiting.delete(name);
    return values;
  }
  return Object.fromEntries(catalog.configurePresets.filter(preset => !preset.hidden).map(preset => {
    const options = Object.fromEntries(Object.entries(resolve(preset.name)).flatMap(([name, value]) => {
      if (name !== "DEV" && !name.startsWith("ENABLE_")) return [];
      if (typeof value === "boolean") return [[name, value]];
      if (/^(ON|OFF|TRUE|FALSE)$/i.test(String(value))) return [[name, /^(ON|TRUE)$/i.test(String(value))]];
      return [];
    }));
    return [preset.name, options];
  }));
}
function allOptionNames() {
  const historical = history.versions.filter(version => version.status === "verified")
    .flatMap(version => Object.values(resolvePresets(version.presets)).flatMap(options => Object.keys(options)));
  return [...new Set([...optionNames(), ...historical])].sort();
}
function presetMarkdown() {
  const columns = Object.keys(catalog.presets);
  const lines = [
    "# F4HWN: valores de todas las opciones por preset",
    "",
    "Documento generado por `npm run build:help`; no editar las filas a mano.",
    "",
    `Version: **${catalog.upstream.tag}**. Commit: \`${catalog.upstream.commit}\`.`,
    `Fuente: [presets del commit](https://github.com/${catalog.upstream.repository}/blob/${catalog.upstream.commit}/CMakePresets.json).`,
    "",
    "ON = incluido por defecto; OFF = desactivado; N/D = no expuesto en ese preset.",
    "N/D no significa OFF ni permite inferir el default interno de CMake.",
    "Las tablas describen decisiones de compilacion, no el valor actual de los menus de tu radio.",
    "",
    "[Explicacion de cada opcion y dependencias](AYUDA-OPCIONES-F4HWN.md).",
    "",
    `| Opcion | ${columns.join(" | ")} |`,
    `| --- | ${columns.map(() => "---").join(" | ")} |`
  ];
  for (const name of optionNames()) lines.push(`| \`${name}\` | ${columns.map(column =>
    Object.hasOwn(catalog.presets[column].options, name) ? (catalog.presets[column].options[name] ? "ON" : "OFF") : "N/D"
  ).join(" | ")} |`);
  lines.push("", "## Bricohams local v6.1.0", "",
    `Commit local fijado: \`${localCatalog.upstream.commit}\`.`,
    "La tabla siguiente es una instantanea de los presets originales de ese commit,",
    "guardada en bricohams-options-v6.1.0.json, no los valores v6.3.0.",
    "Las dos imagenes entregadas Fusion/Labs cambian ENABLE_VOX a OFF respecto",
    "a estos defaults. Todas sus opciones efectivas constan en build-info.json.",
    "FieldOps y Transfer son perfiles admitidos por el builder pero no compilados",
    "en la validacion inicial. Ver [guia Bricohams](BRICOHAMS-FIRMWARE.md).",
    "",
    `| Opcion | ${Object.keys(localCatalog.presets).join(" | ")} |`,
    `| --- | ${Object.keys(localCatalog.presets).map(() => "---").join(" | ")} |`);
  const localNames = [...new Set(Object.values(localCatalog.presets).flatMap(preset => Object.keys(preset.options)))].sort();
  for (const name of localNames) lines.push(`| \`${name}\` | ${Object.values(localCatalog.presets).map(preset =>
    Object.hasOwn(preset.options, name) ? (preset.options[name] ? "ON" : "OFF") : "N/D").join(" | ")} |`);
  lines.push(
    "", "## Versiones historicas", "",
    `Instantanea consultada el ${history.inspectedAt}: ${history.versions.length} versiones fijadas por commit.`,
    "Se resuelve herencia CMake, con prioridad al primer padre y al hijo.",
    "Los perfiles son los declarados en las fuentes; NO todos tienen una imagen",
    "publicada ni estan expuestos por el formulario web. Por ejemplo Fusion_ y",
    "Service_ son nombres internos de presets v6.3.0, no nuevas releases.",
    "Las fuentes/snapshots conservan su licencia upstream, no se reclasifican MIT.",
    "La disponibilidad de ediciones y restricciones se explican en",
    "[Quansheng y versiones](AYUDA-QUANSHENG.md).", "");
  for (const version of history.versions) {
    lines.push(`## Presets publicados ${version.tag}`, "",
      `Commit: \`${version.commit}\`. [Fuente exacta](https://github.com/${history.repository}/blob/${version.commit}/CMakePresets.json).`, "");
    if (version.status !== "verified") {
      lines.push("No se encontro CMakePresets.json; no se infieren valores.", "");
      continue;
    }
    const resolved = resolvePresets(version.presets);
    const columns = Object.keys(resolved);
    const names = [...new Set(Object.values(resolved).flatMap(options => Object.keys(options)))].sort();
    lines.push(`SHA-256 del archivo de presets: \`${version.sha256}\`.`, "",
      `| Opcion | ${columns.join(" | ")} |`, `| --- | ${columns.map(() => "---").join(" | ")} |`);
    for (const name of names) lines.push(`| \`${name}\` | ${columns.map(column =>
      Object.hasOwn(resolved[column], name) ? (resolved[column][name] ? "ON" : "OFF") : "N/D"
    ).join(" | ")} |`);
    lines.push("");
  }
  return lines.join("\n");
}

function destination(target, source) {
  if (/^https?:\/\//i.test(target) || target.startsWith("#")) return target;
  assert(!/^[a-z][a-z0-9+.-]*:/i.test(target), `Esquema no permitido en ${source}: ${target}`);
  const [file, anchor] = target.split("#");
  const resolved = path.resolve(root, "docs", path.dirname(source), file);
  assert(fs.existsSync(resolved), `Enlace local roto en ${source}: ${target}`);
  const relative = path.relative(path.join(root, "docs"), resolved).replace(/\\/g, "/");
  // App pages next to the generated guides (ayuda.html, quansheng.html) stay local links.
  if (path.dirname(resolved) === root && resolved.endsWith(".html")) return `${path.basename(resolved)}${anchor ? `#${anchor}` : ""}`;
  return pages[relative]
    ? `${pages[relative]}${anchor ? `#${anchor}` : ""}`
    : `https://github.com/Brico-Hams/Radio-Web-install/blob/main/${path.relative(root, resolved).replace(/\\/g, "/")}${anchor ? `#${anchor}` : ""}`;
}
// Images are local files under docs/ only, so pages keep working offline and under img-src 'self'.
function image(target, source) {
  assert(/\.(jpg|png|svg)$/i.test(target) && !/^[a-z][a-z0-9+.-]*:/i.test(target), `Imagen no permitida en ${source}: ${target}`);
  const docs = path.join(root, "docs");
  const resolved = path.resolve(docs, path.dirname(source), target);
  assert(resolved.startsWith(docs + path.sep) && fs.existsSync(resolved), `Imagen rota en ${source}: ${target}`);
  return path.relative(root, resolved).replace(/\\/g, "/");
}
function inline(text, source) {
  const tokens = [];
  const protect = html => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };
  let value = text.replace(/`([^`]+)`/g, (_, code) => protect(`<code>${escape(code)}</code>`));
  value = value.replace(/<(https?:\/\/[^>\s]+)>/gi, (_, target) =>
    protect(`<a href="${escape(target)}" target="_blank" rel="noopener noreferrer">${escape(target)}</a>`));
  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, target) => {
    const href = destination(target, source);
    const external = /^https?:/i.test(href);
    return protect(`<a href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escape(label)}</a>`);
  });
  value = escape(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return value.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}
function render(markdown, source) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  const headings = [];
  const used = new Map();
  let paragraph = [];
  let list = "";
  const endParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(" "), source)}</p>`);
    paragraph = [];
  };
  const endList = () => { if (list) out.push(`</${list}>`); list = ""; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { endParagraph(); endList(); continue; }
    if (/^```/.test(line)) {
      endParagraph(); endList();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      assert(i < lines.length, `Bloque de codigo sin cerrar: ${source}`);
      out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
      continue;
    }
    const picture = /^!\[([^\]]+)\]\(([^)\s]+)\)$/.exec(line);
    if (picture) {
      endParagraph(); endList();
      const src = escape(image(picture[2], source));
      out.push(`<figure><a href="${src}"><img src="${src}" alt="${escape(picture[1])}" loading="lazy"></a><figcaption>${escape(picture[1])}</figcaption></figure>`);
      continue;
    }
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading) {
      endParagraph(); endList();
      const base = slug(heading[2]);
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      const id = `${base}${count ? `-${count}` : ""}`;
      out.push(`<h${heading[1].length} id="${id}">${inline(heading[2], source)}</h${heading[1].length}>`);
      if (heading[1].length === 2) headings.push({ id, text: heading[2] });
      continue;
    }
    if (line.startsWith("|") && /^\|[\s:|-]+\|$/.test(lines[i + 1] || "")) {
      endParagraph(); endList();
      const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
      out.push('<div class="table-scroll"><table><thead><tr>' +
        cells(line).map(cell => `<th scope="col">${inline(cell, source)}</th>`).join("") + "</tr></thead><tbody>");
      i++;
      while (i + 1 < lines.length && lines[i + 1].startsWith("|")) {
        out.push("<tr>" + cells(lines[++i]).map(cell => `<td>${inline(cell, source)}</td>`).join("") + "</tr>");
      }
      out.push("</tbody></table></div>");
      continue;
    }
    const item = /^\s*(?:([-*])|\d+\.) (.+)$/.exec(line);
    if (item) {
      endParagraph();
      const next = item[1] ? "ul" : "ol";
      if (list !== next) { endList(); list = next; out.push(`<${list}>`); }
      let content = item[2];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) &&
        !/^\s*(?:[-*]|\d+\.) /.test(lines[i + 1])) content += ` ${lines[++i].trim()}`;
      out.push(`<li>${inline(content, source)}</li>`);
      continue;
    }
    endList();
    paragraph.push(line);
  }
  endParagraph(); endList();
  return { body: out.join("\n"), headings };
}
function build() {
  checkOptionCoverage(fs.readFileSync(path.join(root, "docs", "AYUDA-OPCIONES-F4HWN.md"), "utf8"));
  fs.writeFileSync(path.join(root, "docs", "F4HWN-PRESETS.md"), presetMarkdown());
  for (const [source, file] of Object.entries(pages)) {
    const markdown = fs.readFileSync(path.join(root, "docs", source), "utf8");
    const title = markdown.match(/^# (.+)$/m)?.[1];
    assert(title, `Falta titulo: ${source}`);
    const { body, headings } = render(markdown, source);
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="${escape(title)}: ayuda de Bricohams por modelo y version.">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${escape(title)} | Bricohams Radio Workspace</title>
  <link rel="icon" href="bricohams-logo.png" type="image/png">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="help-docs.css">
</head>
<body>
  <a class="skip" href="#main">Saltar al contenido</a>
  <main id="main" class="firmware-help">
    <header><a href="index.html"><img src="bricohams-logo.png" alt="Bricohams" width="240" height="89"></a>
      <nav aria-label="Ayuda"><a href="ayuda.html">Ayuda de la aplicacion</a> · <a href="ayuda-firmwares.html">Biblioteca de firmware</a> · <a href="ayuda-atlas-uv-k5-v3.html">Atlas UV-K5 V3</a> · <a href="quansheng.html">Quansheng</a> · <a href="opengd77.html">OpenGD77</a></nav>
    </header>
    <nav class="panel" aria-label="Contenido de esta guia"><h2>En esta guia</h2><ul>${headings.map(item => `<li><a href="#${item.id}">${escape(item.text)}</a></li>`).join("")}</ul></nav>
    <article class="panel">${body}</article>
    <footer><p>Documento generado desde el Markdown versionado. Consulta las fuentes y limites de cada guia. <a href="ayuda-firmwares.html">Volver al indice</a>.</p></footer>
  </main>
</body>
</html>
`;
    fs.writeFileSync(path.join(root, file), html);
  }
  console.log(`${Object.keys(pages).length} guias HTML; ${optionNames().length} opciones de interfaz, ${allOptionNames().length} en el historial de ${history.versions.length} versiones.`);
}
if (require.main === module) build();
// Every image referenced by a guide, as a root-relative path: what the server, Pages and installers must ship.
function helpImages() {
  return [...new Set(Object.keys(pages).flatMap(source =>
    [...fs.readFileSync(path.join(root, "docs", source), "utf8").matchAll(/^!\[[^\]]+\]\(([^)\s]+)\)$/gm)]
      .map(match => image(match[1], source))))].sort();
}
module.exports = { build, render, pages, helpImages, optionNames, allOptionNames, resolvePresets, checkOptionCoverage, presetMarkdown };
