"use strict";
// Offline comparison of the Spanish airband guide extract (primary source) with the OurAirports extract (secondary).
// Reports disagreements only; it never changes or "fixes" a frequency.
const fs = require("node:fs");
const path = require("node:path");

const ESTADOS = ["coincide", "solo guia", "solo OurAirports", "fuera de banda (no se programa)", "sin publicar en la guia"];
const AERODROME_ONLY_GUIDE = "aerodromo solo en la guia: sin coordenadas en ES-airports.json, no se programa";
const khz = value => Math.round(Number(value) * 1000);
const cell = value => String(value ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const mhzText = value => value === null || value === undefined ? "" : Number(value).toFixed(5);

function compareAirbandGuide(guide, airports) {
  const guideByIcao = new Map(guide.aerodromes.map(aerodrome => [aerodrome.icao, aerodrome]));
  const oursByIdent = new Map();
  for (const entry of airports.frequencies) {
    oursByIdent.has(entry.ident) ? oursByIdent.get(entry.ident).push(entry) : oursByIdent.set(entry.ident, [entry]);
  }
  const rows = [], notes = [], counts = Object.fromEntries(ESTADOS.map(estado => [estado, 0]));
  let guideOnlyAerodromes = 0;
  for (const icao of [...new Set([...guideByIcao.keys(), ...oursByIdent.keys()])].sort()) {
    const aerodrome = guideByIcao.get(icao), ours = oursByIdent.get(icao) || [];
    const matched = new Set();
    const add = (estado, service, icaoChannel, guideMhz, type, oursMhz) => {
      counts[estado]++;
      rows.push({ icao, service, icaoChannel, guideMhz, type, oursMhz, estado });
    };
    if (aerodrome) {
      if (!Object.hasOwn(airports.airports, icao)) { guideOnlyAerodromes++; notes.push(`${icao}: ${AERODROME_ONLY_GUIDE}`); }
      for (const channel of aerodrome.channels) {
        if (channel.mhz === null) { add("sin publicar en la guia", channel.service, channel.icaoChannel, null, "", null); continue; }
        if (channel.note !== null) { add("fuera de banda (no se programa)", channel.service, channel.icaoChannel, channel.mhz, "", null); continue; }
        const found = ours.find(entry => khz(entry.rx) === khz(channel.mhz));
        if (found) matched.add(found);
        found ? add("coincide", channel.service, channel.icaoChannel, channel.mhz, found.type, found.rx)
          : add("solo guia", channel.service, channel.icaoChannel, channel.mhz, "", null);
      }
    }
    for (const entry of ours) if (!matched.has(entry)) add("solo OurAirports", "", "", null, entry.type, entry.rx);
  }
  const lines = [
    "# Comparacion de frecuencias de aerodromos: guia 101ATM vs OurAirports (Espana)", "",
    `- Fuente primaria: ${guide.source.title} v${guide.source.version} (${guide.source.date}), pagina ${guide.source.page}; origen citado: ${guide.source.upstream}. ${guide.source.license_note}.`,
    `- Fuente secundaria: OurAirports (${airports.source}), obtenido el ${airports.fetchedAt}.`,
    "- Las discrepancias no se resuelven automaticamente: revisar contra el AIP de ENAIRE.", "",
    "## Resumen", "", "| estado | filas |", "| --- | --- |",
    ...ESTADOS.map(estado => `| ${estado} | ${counts[estado]} |`),
    `| ${AERODROME_ONLY_GUIDE} | ${guideOnlyAerodromes} |`, "",
    "## Detalle", "", "| ICAO | servicio guia | canal OACI | MHz guia | tipo OurAirports | MHz OurAirports | estado |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(row => `| ${[row.icao, row.service, row.icaoChannel, mhzText(row.guideMhz), row.type, mhzText(row.oursMhz), row.estado].map(cell).join(" | ")} |`)];
  if (notes.length) lines.push("", "## Aerodromos solo en la guia", "", ...notes.map(note => `- ${cell(note)}`));
  return { markdown: `${lines.join("\n")}\n`, rows, counts, guideOnlyAerodromes };
}

if (require.main === module) {
  const directory = path.join(__dirname, "..", "data", "channel-templates");
  const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
  const { markdown, counts, guideOnlyAerodromes } = compareAirbandGuide(read("ES-airband-guide.json"), read("ES-airports.json"));
  const target = path.join(__dirname, "..", "docs", "airband-es-comparison.md");
  fs.writeFileSync(target, markdown);
  console.log(`${path.relative(process.cwd(), target)}: ${JSON.stringify(counts)}; aerodromos solo en la guia: ${guideOnlyAerodromes}`);
}

module.exports = { compareAirbandGuide, ESTADOS, AERODROME_ONLY_GUIDE };
