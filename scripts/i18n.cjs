"use strict";
// Checks translations against the Spanish original and fixes their relative links.
// Usage: node scripts/i18n.cjs [--fix] [--strict] [--lang en,de] [--files ayuda.html,AYUDA-QUANSHENG.md,README.md]
const fs = require("node:fs");
const path = require("node:path");
const { pages, TRANSLATIONS, relink, checkParity, checkOptionCoverage, translatedPath,
  HELP_LANGS, helpCenterFile, renderHelpCenter } = require("./build-help.cjs");
const root = path.join(__dirname, "..");
// F4HWN-PRESETS.md is generated per language by build-help.cjs, so it is never translated by hand.
const DOCUMENTS = Object.freeze([
  ...Object.keys(pages).filter(name => name !== "F4HWN-PRESETS.md").map(name => `docs/${name}`),
  "README.md"
]);

function option(name) {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1].split(",").map(value => value.trim()).filter(Boolean) : null;
}
// Markdown fences may be indented up to three spaces, including within lists.
function normalizeFences(text) {
  return text.replace(/^ {1,3}(```)/gm, "$1");
}
function run() {
  const fix = process.argv.includes("--fix");
  const strict = process.argv.includes("--strict");
  const langs = option("--lang") || TRANSLATIONS;
  const files = option("--files");
  const documents = files ? DOCUMENTS.filter(name => files.includes(path.basename(name))) : DOCUMENTS;
  const help = !files || files.includes("ayuda.html");
  if (files && documents.length + Number(help) !== files.length) throw new Error(`Documento desconocido en --files: ${files.join(", ")}`);
  let failures = 0;
  let missing = 0;
  if (help) {
    const original = fs.readFileSync(path.join(root, "ayuda.html"), "utf8").replace(/\r\n/g, "\n");
    for (const lang of langs.filter(code => HELP_LANGS.includes(code))) {
      const target = helpCenterFile(lang);
      try {
        const generated = renderHelpCenter(original, lang);
        const file = path.join(root, target);
        if (fix) fs.writeFileSync(file, generated);
        if (!fs.existsSync(file)) { missing++; console.log(`FALTA  ${lang} ${target}`); continue; }
        if (fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== generated) throw new Error("HTML desactualizado; ejecuta npm run build:help");
        console.log(`OK     ${lang} ${target}`);
      } catch (error) {
        failures++;
        console.log(`ERROR  ${lang} ${target}\n  - ${error.message}`);
      }
    }
  }
  for (const document of documents) {
    const file = path.join(root, document);
    let text = fs.readFileSync(file, "utf8");
    if (fix) {
      const fixed = relink(text, file, file, "es");
      if (fixed !== text) fs.writeFileSync(file, fixed);
      text = fixed;
    }
    const problems = checkParity(normalizeFences(text), file, normalizeFences(text), file, "es");
    if (problems.length) {
      failures++;
      console.log(`ERROR  es ${document}\n  - ${problems.join("\n  - ")}`);
    } else console.log(`OK     es ${document}`);
  }
  for (const lang of langs) {
    if (!TRANSLATIONS.includes(lang)) throw new Error(`Idioma no soportado: ${lang}`);
    for (const document of documents) {
      const esFile = path.join(root, document);
      const trFile = path.join(root, translatedPath(document, lang));
      if (!fs.existsSync(trFile)) {
        missing++;
        console.log(`FALTA  ${lang} ${document}`);
        continue;
      }
      let text = fs.readFileSync(trFile, "utf8");
      if (fix) {
        const fixed = relink(text, esFile, trFile, lang);
        if (fixed !== text) fs.writeFileSync(trFile, fixed);
        text = fixed;
      }
      const problems = checkParity(normalizeFences(fs.readFileSync(esFile, "utf8")), esFile, normalizeFences(text), trFile, lang);
      if (path.basename(document) === "AYUDA-OPCIONES-F4HWN.md") {
        try { checkOptionCoverage(text); } catch (error) { problems.push(error.message); }
      }
      if (problems.length) {
        failures++;
        console.log(`ERROR  ${lang} ${document}\n  - ${problems.join("\n  - ")}`);
      } else console.log(`OK     ${lang} ${document}`);
    }
  }
  console.log(`${failures} con errores, ${missing} pendientes.`);
  if (failures || (strict && missing)) process.exitCode = 1;
}
if (require.main === module) run();
module.exports = { DOCUMENTS };
