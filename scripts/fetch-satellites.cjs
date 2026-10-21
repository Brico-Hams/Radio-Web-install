"use strict";
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
const { DataService } = require("../data-service.cjs");

const ATTRIBUTION = "SatNOGS DB / Libre Space Foundation (CC BY-SA 4.0)";
const LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";

async function buildSatellites({ dataService, previous, now = Date.now(), norads }) {
  const list = norads || JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "satellites.config.json"), "utf8")).norad;
  let old = null;
  try { old = previous ? R.validateSatellitesFile(previous) : null; }
  catch (error) { console.warn(`Archivo previo descartado: ${error.message}`); }
  const fetchedAt = new Date(now).toISOString();
  const satellites = [];
  for (const norad of list) {
    try {
      const sat = await dataService.satellite({ norad, provider: "satnogs" });
      R.validateTLE(sat, now);
      const tx = await dataService.transmitters({ norad });
      satellites.push({ norad, name: sat.name, tle1: sat.tle1, tle2: sat.tle2, source: sat.source, fetchedAt, stale: false, transmitters: tx.entries });
    } catch (error) {
      const kept = old && old.satellites.find(item => item.norad === norad);
      console.warn(`NORAD ${norad}: ${error.message}${kept ? " (se conserva el dato previo)" : ""}`);
      if (kept) satellites.push({ ...kept, stale: true });
    }
  }
  if (!satellites.length) throw new Error("Ningun satelite valido: ni SatNOGS ni el archivo previo.");
  return { format: "radio-workspace-satellites", version: 1, fetchedAt, attribution: ATTRIBUTION, license: LICENSE, satellites };
}

async function main(argv) {
  const arg = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const out = arg("--out");
  if (!out) throw new Error("Uso: node scripts/fetch-satellites.cjs --out <archivo> [--previous <url>]");
  let previous = null;
  if (arg("--previous")) {
    try {
      const response = await fetch(arg("--previous"), { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      previous = await response.json();
    } catch (error) { console.warn(`Sin archivo previo: ${error.message}`); }
  }
  const file = await buildSatellites({ dataService: new DataService(), previous });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(file, null, 2) + "\n");
  console.log(`${file.satellites.length} satelites (${file.satellites.filter(s => s.stale).length} obsoletos) -> ${out}`);
}

if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exit(1); });
module.exports = { buildSatellites };
