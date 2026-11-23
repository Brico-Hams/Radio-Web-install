"use strict";
// Re-derives the Hamlib-backed rows of data/remote-feature-parity.json and data/remote-meter-model.json from
// data/remote-hamlib-caps.json (see remote-hamlib-caps.cjs). Usage: node scripts/remote-caps-apply.cjs   (rewrites both files)
// Run scripts/remote-parity-docs.cjs afterwards to refresh the tables in docs/REMOTE_STATION.md.
const fs = require("node:fs");
const path = require("node:path");
const { loadCatalog } = require("../remote-catalog.cjs");
const { FEATURES } = require("../remote-parity.cjs");
const { FILE: CAPS_FILE, DERIVED_FEATURES, loadCaps, deriveRadio } = require("../remote-hamlib-caps.cjs");

const root = path.join(__dirname, "..");
const PARITY = path.join(root, "data", "remote-feature-parity.json");
const METERS = path.join(root, "data", "remote-meter-model.json");
const CAPS_SOURCE = "data/remote-hamlib-caps.json";
const HAMLIB_FAMILIES = new Set(["hamlib-tx", "hamlib-beta", "hamlib-rx"]);
const FLEX = /^flex-|^aurora-/;
const normalize = text => String(text).toUpperCase().replace(/[^A-Z0-9+]/g, "");

function parityRows(parity, caps, catalog) {
  const radios = new Map(catalog.radios.map(radio => [radio.id, radio]));
  return parity.rows.map(row => {
    const family = parity.families[row.family];
    const radio = radios.get(row.id);
    if (!HAMLIB_FAMILIES.has(row.family) || !radio) return row;
    const derived = deriveRadio(caps, radio);
    if (!derived) return row;
    const features = [...family.features];
    const sources = {};
    const reasons = {};
    for (const feature of DERIVED_FEATURES) {
      const index = FEATURES.indexOf(feature);
      // Receive-only radios keep their `na` TX features.
      if (features[index] === "na") continue;
      features[index] = derived.features[feature];
      sources[feature] = [...new Set([...(family.sources[feature] || []), CAPS_SOURCE])];
      if (derived.reasons[feature]) reasons[feature] = derived.reasons[feature];
    }
    const { id, family: familyName, androidProfile } = row;
    return { id, family: familyName, ...(androidProfile ? { androidProfile } : {}), features, sources, ...(Object.keys(reasons).length ? { reasons } : {}) };
  });
}

function writeParity(rows) {
  const text = fs.readFileSync(PARITY, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const start = text.indexOf('"rows": [');
  const end = text.lastIndexOf("]");
  const body = rows.map(row => `    ${JSON.stringify(row).replace(/^\{"id":"([^"]+)","family":"([^"]+)"/, '{"id": "$1", "family": "$2"')}`).join(`,${eol}`);
  fs.writeFileSync(PARITY, `${text.slice(0, start)}"rows": [${eol}${body}${eol}  ${text.slice(end)}`);
}

const declared = (derived, name, key) => `${name} ${derived.meters[key] === "pendiente de fuente" ? "no" : "yes"}`;

function meterRow(radio, derived, previous) {
  const flex = FLEX.test(radio.id);
  const meters = { ...previous.meters, ...derived.meters };
  const declares = [declared(derived, "STRENGTH", "smeter"), declared(derived, "RFPOWER_METER_WATTS", "po"), declared(derived, "SWR", "swr"), declared(derived, "ALC", "alc")].join(", ");
  const backend = { ...derived.backend, declares, ...(derived.unreached.length ? { unreached: derived.unreached } : {}) };
  const row = { ...previous, meters, tune: derived.tune, source: "hamlib-caps", backend };
  if (previous.source && previous.source !== "hamlib-caps" && previous.source !== "hamlib") row.notes = [previous.notes, `previous source: ${previous.source}`].filter(Boolean).join("; ");
  if (flex) {
    // Hamlib model 23005 only declares PREAMP; the native SmartSDR client (smartsdr-core.cjs) reports FWDPWR, SWR and ALC with the SWR scale flagged unverified.
    Object.assign(row.meters, { po: "partial", swr: "partial", alc: "partial", smeter: "pendiente de fuente" });
    row.tune = "partial";
    row.link = "SmartSDR TCP native (smartsdr-core.cjs); Hamlib 23005 declares only PREAMP";
    row.notes = "Native path: FWDPWR/SWR/ALC meters with the SWR scale unverified; getStrength returns null (no S-meter)";
  }
  return row;
}

function writeMeters(caps, catalog) {
  const model = JSON.parse(fs.readFileSync(METERS, "utf8"));
  const byName = new Map(catalog.radios.filter(radio => caps.radios[radio.id]?.wired).map(radio => [normalize(radio.model), radio]));
  model.matrix = model.matrix.map(row => {
    if (!/^Hamlib/.test(row.link)) return row;
    const radio = byName.get(normalize(row.radios[0]));
    if (!radio) throw new Error(`no catalogue radio for matrix row ${row.radios[0]}`);
    return meterRow(radio, deriveRadio(caps, radio), row);
  });
  model.sources["hamlib-caps"] = "data/remote-hamlib-caps.json (facts extracted from the Hamlib backend caps; each row names the caps file and line)";
  const { matrix, ...rest } = model;
  const text = JSON.stringify(rest, null, 2).replace(/\n\}$/, `,\n  "matrix": [\n${matrix.map(row => `    ${JSON.stringify(row)}`).join(",\n")}\n  ]\n}`);
  return `${text}\n`;
}
if (require.main === module) {
  const caps = loadCaps();
  const catalog = loadCatalog();
  const parity = JSON.parse(fs.readFileSync(PARITY, "utf8"));
  writeParity(parityRows(parity, caps, catalog));
  fs.writeFileSync(METERS, writeMeters(caps, catalog));
  console.log("remote-feature-parity.json and remote-meter-model.json updated from", path.relative(root, CAPS_FILE));
}

module.exports = { parityRows, meterRow };
