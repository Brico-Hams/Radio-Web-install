"use strict";
// Loader and validator for data/remote-feature-parity.json: one row per radio x every baseline remote feature.
// A feature marked ok or partial must cite existing source files; adapters may only claim what the matrix marks ok/partial.
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "remote-feature-parity.json");
const FEATURES = Object.freeze(["freqMode", "vfoSplit", "ptt", "smeter", "txMeters", "tune", "audioRx", "audioTx", "waterfall", "rotor", "accessories", "settings"]);
const STATUSES = Object.freeze(["ok", "partial", "pendiente", "na"]);
const TX_FEATURES = Object.freeze(["ptt", "txMeters", "tune", "audioTx", "accessories"]);
const BASE_FEATURES = Object.freeze(["freqMode", "vfoSplit", "smeter", "audioRx", "waterfall", "rotor", "settings"]);

// What each adapter implements for a radio; the matrix must not mark any of these pendiente or na.
// hamlib = Node remote shack through rigctld (rigctld-client.cjs, remote-agent.cjs); audio/waterfall/rotor do not depend on CAT.
const ADAPTER_CLAIMS = Object.freeze({
  hamlib: radio => [...BASE_FEATURES, ...(radio && radio.transmit === false ? [] : TX_FEATURES)],
  // No CAT adapter in the shack: only the radio-independent paths (sound card audio, audio waterfall, rotor).
  none: () => ["audioRx", "waterfall", "rotor"],
  // Android-only profiles with no CAT link: Profile.kt ANY_RADIO tools (the AZ/EL rotor).
  "android-local": () => ["rotor"]
});

const isText = value => typeof value === "string" && value.trim() !== "";

// A row inherits the feature statuses of its family unless it lists its own; consumers always see the resolved row.
const resolveRows = data => (Array.isArray(data.rows) ? data.rows : []).map(row => ({ ...row, features: row.features || (data.families[row.family] || {}).features }));

function sourcesFor(data, row, feature) {
  const family = data.families[row.family];
  const own = row.sources && row.sources[feature];
  const list = own !== undefined ? own : family && family.sources && family.sources[feature];
  return Array.isArray(list) ? list : [];
}

function statusOf(row, feature) {
  const index = FEATURES.indexOf(feature);
  return index < 0 ? undefined : row.features[index];
}

// Returns the list of problems (empty when consistent). Android profile names are checked when given.
function validateParity(data, { catalog, androidProfiles = [], root = __dirname } = {}) {
  const problems = [];
  const add = message => problems.push(message);
  if (!data || data.format !== "radicodex-remote-feature-parity" || data.version !== 1) return ["formato no reconocido"];
  if (JSON.stringify(data.featureOrder) !== JSON.stringify(FEATURES)) add("featureOrder no coincide con FEATURES");
  const rows = resolveRows(data);
  const ids = new Set();
  const radios = new Map((catalog && catalog.radios || []).map(radio => [radio.id, radio]));
  for (const row of rows) {
    const where = String(row && row.id);
    if (!row || !isText(row.id) || ids.has(row.id)) { add(`${where}: id ausente o duplicado`); continue; }
    ids.add(row.id);
    const family = data.families && data.families[row.family];
    if (!family) { add(`${where}: familia desconocida ${row.family}`); continue; }
    if (!Array.isArray(row.features) || row.features.length !== FEATURES.length || row.features.some(value => !STATUSES.includes(value))) { add(`${where}: features no validas`); continue; }
    const radio = radios.get(row.id);
    for (const feature of FEATURES) {
      const status = statusOf(row, feature);
      if (status === "ok" || status === "partial") {
        const list = sourcesFor(data, row, feature);
        if (!list.length) add(`${where}.${feature}: ${status} sin fuente`);
        for (const source of list) if (!fs.existsSync(path.join(root, source))) add(`${where}.${feature}: la fuente ${source} no existe`);
      }
      if (status === "na" && TX_FEATURES.includes(feature) && !(radio && radio.transmit === false)) add(`${where}.${feature}: na solo para radios sin TX`);
      if ((status === "pendiente" || status === "partial") && !isText(row.reasons && row.reasons[feature]) && !isText(family.reasons && family.reasons[feature])) add(`${where}.${feature}: falta el motivo`);
    }
    const claims = ADAPTER_CLAIMS[family.adapter];
    if (!claims) { add(`${where}: adaptador desconocido ${family.adapter}`); continue; }
    for (const feature of claims(radio)) {
      if (!["ok", "partial"].includes(statusOf(row, feature))) add(`${where}.${feature}: el adaptador ${family.adapter} lo declara y la matriz no`);
    }
    if (radio) {
      const hamlib = Number.isInteger(radio.hamlibModel);
      if (hamlib !== (family.adapter === "hamlib")) add(`${where}: el adaptador ${family.adapter} no coincide con hamlibModel`);
    }
  }
  for (const id of radios.keys()) if (!ids.has(id)) add(`${id}: radio del catalogo sin fila en la matriz`);
  for (const name of androidProfiles) if (!rows.some(row => row.androidProfile === name)) add(`perfil Android ${name} sin fila en la matriz`);
  return problems;
}

let cached = null;
function loadParity(file = FILE) {
  if (file === FILE && cached) return cached;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || data.format !== "radicodex-remote-feature-parity" || data.version !== 1) throw new Error("Matriz de paridad remota no reconocida.");
  if (file === FILE) cached = data;
  return data;
}

// Per-feature view for UIs: status plus the reason that explains a greyed-out control.
function featureStates(data, id) {
  const row = resolveRows(data).find(item => item.id === id);
  if (!row) return null;
  const family = data.families[row.family] || {};
  return Object.fromEntries(FEATURES.map(feature => [feature, {
    status: statusOf(row, feature),
    reason: (row.reasons && row.reasons[feature]) || (family.reasons && family.reasons[feature]) || "",
    sources: sourcesFor(data, row, feature)
  }]));
}

const isEnabled = state => Boolean(state) && (state.status === "ok" || state.status === "partial");

module.exports = { FEATURES, STATUSES, TX_FEATURES, ADAPTER_CLAIMS, FILE, loadParity, validateParity, featureStates, isEnabled, statusOf, sourcesFor, resolveRows };
