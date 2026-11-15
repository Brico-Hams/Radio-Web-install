"use strict";
// Offline build (no network): data/channel-templates/<CC>.json -> templates/repeaters/<radio-id>/<CC>.<ext>.
// Every file comes from templateExportFile, the same export path the apps use, so nothing here defines a file format.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");

const ROOT = path.join(__dirname, "..");
const PENDING = "pendiente de fuente";

// Exports the channels for one radio. Channels the radio cannot receive, modes it lacks and channels that do not fit are
// dropped and counted; TX stays locked because the channels are RX-only reference data (checked again by prepareTemplateExport).
function renderChannels(profileId, channels) {
  R.assert(Object.hasOwn(R.TEMPLATE_PROFILES, profileId), "Modelo de plantilla desconocido.");
  const profile = R.TEMPLATE_PROFILES[profileId];
  let input = channels;
  // templateExportFile refuses a project over the radio limit, so the overflow is cut here (catalog order) and counted.
  if (profile.layout.channelLimit) input = R.prepareTemplateExport(profileId, channels).accepted.slice(0, profile.layout.channelLimit);
  if (!R.prepareTemplateExport(profileId, input).accepted.length) return null;
  const result = R.templateExportFile(profileId, input);
  return { content: result.content, extension: result.extension, channels: result.accepted.length, dropped: channels.length - result.accepted.length };
}

function renderCountry(profileId, template) {
  R.validateCountryTemplate(template, template.country);
  return renderChannels(profileId, R.countryTemplateChannels(template));
}

// coverage.json decides the status; without it (older checkouts) a country is "ok" when its template file exists.
function countryStatus(country, template, coverage) {
  const entry = coverage?.countries?.find(item => item.code === country.code);
  if (entry && entry.status !== "ok") return { status: PENDING, reason: entry.reason || "Sin fuente." };
  if (!template) return { status: PENDING, reason: "Sin plantilla en data/channel-templates." };
  return { status: "ok" };
}

function sha256(content) { return createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex"); }

// templates: { <CC>: parsed country template }. Returns the files to write (path relative to templates/repeaters) and the index.
function buildRepeaterTemplates({ templates, coverage = null, now = Date.now() }) {
  const radios = Object.entries(R.TEMPLATE_PROFILES).map(([id, profile]) => ({ id, name: profile.label, ext: profile.extension }));
  const countries = R.TEMPLATE_COUNTRIES.map(country => {
    const found = countryStatus(country, templates[country.code], coverage);
    return { code: country.code, name: country.name, ...found };
  });
  const files = [], sources = new Set();
  for (const country of countries.filter(item => item.status === "ok")) {
    const template = templates[country.code];
    for (const key of ["source", "permission", "boundaries"]) if (template[key]) sources.add(template[key]);
    for (const radio of radios) {
      const rendered = renderCountry(radio.id, template);
      if (!rendered) continue;
      files.push({ radio: radio.id, country: country.code, path: `${radio.id}/${country.code}.${radio.ext}`, content: rendered.content,
        channels: rendered.channels, dropped: rendered.dropped, sha256: sha256(rendered.content) });
    }
  }
  const index = { generatedAt: new Date(now).toISOString(), sources: [...sources].sort(), radios, countries,
    files: files.map(({ content, ...entry }) => entry) };
  return { files, index, readme: readme(index) };
}

function readme(index) {
  const pending = index.countries.filter(country => country.status !== "ok");
  const ok = index.countries.length - pending.length;
  return `# Plantillas de repetidores por radio y pais

Archivos generados por \`npm run templates:build\` (sin red) a partir de \`data/channel-templates/<CC>.json\`. No editar a mano.

- Radios: ${index.radios.map(radio => `${radio.name} (\`${radio.id}\`, .${radio.ext})`).join("; ")}.
- Paises con datos: ${ok} de ${index.countries.length}. Archivos: ${index.files.length}. Generado: ${index.generatedAt}.
- Ruta: \`templates/repeaters/<radio>/<CC>.<ext>\`. \`index.json\` lista cada archivo con canales, descartados y SHA-256 (\`path\` es relativo a esta carpeta).

## Formato

Cada archivo usa el mismo exportador que la aplicacion (\`templateExportFile\`): CSV de referencia (RadiCodex, RT-950 Pro, FTX-1), CSV compatible con CHIRP (UV-K5 V3) o proyecto AnyTone (AT-D878). Se descartan, y se cuentan en \`dropped\`, los canales fuera de las bandas del modelo, con una modulacion que no soporta o que no caben en sus zonas, bancos o memorias.

## Solo RX

Los repetidores son canales de solo recepcion: el TX queda bloqueado y la entrada nominal y el tono publicado se conservan solo como referencia. Ningun archivo programa la radio por si mismo; verifica la actividad local, las restricciones y tu licencia antes de usarlos.

## Fuentes y permisos

${index.sources.map(source => `- ${source}`).join("\n")}

- Repetidores: [HearHam](https://hearham.com/repeaters), usados con el permiso publicado en esa pagina. Cobertura parcial; no es un registro nacional completo.
- Regiones: [Natural Earth](https://www.naturalearthdata.com/) (limites administrativos, dominio publico).
- Sin datos no se inventa nada: un pais sin repetidores utilizables no genera archivos.

## Paises pendientes de fuente

${pending.length ? pending.map(country => `- ${country.code} ${country.name}: ${country.reason}`).join("\n") : "Ninguno."}

Rusia y Turquia no estan incluidas: no hay una division fiable de su parte europea con estas fuentes.

## Regenerar

\`\`\`
npm run fetch:channel-templates
npm run templates:build
\`\`\`
`;
}

function main() {
  const directory = path.join(ROOT, "data", "channel-templates");
  const read = name => { const file = path.join(directory, name); return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null; };
  const templates = Object.fromEntries(R.TEMPLATE_COUNTRIES.map(country => [country.code, read(`${country.code}.json`)]).filter(([, file]) => file));
  const { files, index, readme: text } = buildRepeaterTemplates({ templates, coverage: read("coverage.json") });
  const output = path.join(ROOT, "templates", "repeaters");
  fs.rmSync(output, { recursive: true, force: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(output, file.path)), { recursive: true });
    fs.writeFileSync(path.join(output, file.path), file.content);
  }
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "index.json"), JSON.stringify(index, null, 2) + "\n");
  fs.writeFileSync(path.join(output, "README.md"), text);
  console.log(`${files.length} files for ${index.countries.filter(country => country.status === "ok").length} countries`);
}
if (require.main === module) main();
module.exports = { renderChannels, renderCountry, countryStatus, buildRepeaterTemplates, sha256, PENDING };
