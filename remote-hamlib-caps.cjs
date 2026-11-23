"use strict";
// Per-radio statuses derived from the capabilities the radio's Hamlib backend declares (data/remote-hamlib-caps.json,
// extracted by scripts/hamlib-caps-extract.cjs). A status is only raised where the backend declares the capability AND
// the agent reaches it: rigctld-client.cjs / remote-agent.cjs read STRENGTH, RFPOWER_METER_WATTS, SWR and ALC, drive
// PREAMP, ATT, AGC, NB and NR, split through `s`/`S` and tune through `G TUNE`. Nothing here is a calibration.
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "remote-hamlib-caps.json");
// Features whose status comes from the backend; the rest of a row keeps its family baseline.
const DERIVED_FEATURES = Object.freeze(["vfoSplit", "smeter", "txMeters", "tune", "settings"]);
// What the agent reads or writes through rigctld; anything else a backend declares is not reached yet.
const REACHED = Object.freeze({
  txMeters: ["RFPOWER_METER_WATTS", "SWR", "ALC"],
  settingLevels: ["PREAMP", "ATT", "AGC"],
  settingFuncs: ["NB", "NR"],
  unreachedMeters: ["COMP_METER", "ID_METER", "VD_METER", "TEMP_METER", "RFPOWER_METER"]
});
// Fixed texts (translated in ui-translations.js) shown for a feature the backend does not fully prove.
const REASONS = Object.freeze({
  vfoSplit: "El backend Hamlib del modelo no declara lectura y escritura de split: pendiente de fuente.",
  smeter: "El backend Hamlib del modelo no declara el nivel STRENGTH: pendiente de fuente.",
  txMeters: "El backend Hamlib del modelo no declara los tres medidores PO, ROE y ALC: pendiente de fuente.",
  tune: "El backend Hamlib del modelo no declara la operacion TUNE: pendiente de fuente.",
  settings: "El backend Hamlib del modelo no declara todos los ajustes PREAMP, ATT, AGC, NB y NR: pendiente de fuente."
});
const BETA_REASONS = Object.freeze({
  vfoSplit: "Backend Hamlib con split completo, pero beta o sin prueba fisica.",
  txMeters: "Backend Hamlib con PO, ROE y ALC, pero beta o sin prueba fisica.",
  tune: "Backend Hamlib con TUNE, pero beta o sin prueba fisica; siempre explicito, con limite de tiempo y corte por ROE.",
  settings: "Backend Hamlib con todos los ajustes, pero beta o sin prueba fisica."
});
const UNPROVEN_BACKEND = Object.freeze(["ALPHA", "BETA", "UNTESTED"]);

let cached = null;
function loadCaps(file = FILE) {
  if (file === FILE && cached) return cached;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || data.format !== "radicodex-remote-hamlib-caps" || data.version !== 1) throw new Error("Capacidades Hamlib no reconocidas.");
  if (file === FILE) cached = data;
  return data;
}

function backendFor(data, id) {
  const entry = data.radios[id];
  return entry && entry.wired ? { entry, backend: data.backends[String(entry.hamlibModel)] } : null;
}

const declares = (list, names) => names.every(name => list.includes(name));

// Returns { features, reasons, meters, tune, backend } for a wired radio, or null when the radio has no Hamlib backend entry.
// `radio` is the catalogue entry: a beta catalogue status or a non-stable Hamlib status never raises a feature above partial.
function deriveRadio(data, radio) {
  const found = backendFor(data, radio.id);
  if (!found) return null;
  const { backend } = found;
  const unproven = radio.status === "beta" || UNPROVEN_BACKEND.includes(backend.status);
  const get = backend.level.get;
  const proven = {
    vfoSplit: backend.handlers.set_split_vfo && backend.handlers.get_split_vfo,
    smeter: get.includes("STRENGTH"),
    txMeters: declares(get, REACHED.txMeters),
    tune: backend.vfoOps.includes("TUNE") && backend.handlers.vfo_op,
    settings: declares(get, REACHED.settingLevels) && declares(backend.level.set, REACHED.settingLevels)
      && declares(backend.func.get, REACHED.settingFuncs) && declares(backend.func.set, REACHED.settingFuncs)
  };
  const features = {};
  const reasons = {};
  for (const feature of DERIVED_FEATURES) {
    // The S-meter has always been shown as ok: it is only lowered when STRENGTH is absent.
    const capped = feature !== "smeter" && unproven;
    features[feature] = proven[feature] && !capped ? "ok" : "partial";
    if (features[feature] === "partial") reasons[feature] = proven[feature] ? BETA_REASONS[feature] : REASONS[feature];
  }
  const level = name => (get.includes(name) ? (unproven ? "partial" : "ok") : "pendiente de fuente");
  const meters = {
    smeter: get.includes("STRENGTH") ? "ok" : "pendiente de fuente",
    po: level("RFPOWER_METER_WATTS"),
    swr: level("SWR"),
    alc: level("ALC"),
    comp: "pendiente de fuente",
    id: "pendiente de fuente",
    vdd: "pendiente de fuente",
    temp: "pendiente de fuente"
  };
  return {
    features,
    reasons,
    meters,
    tune: proven.tune ? (unproven ? "partial" : "ok") : "pendiente de fuente",
    // Declared by the backend but not read by the Hamlib path yet: not upgraded.
    unreached: REACHED.unreachedMeters.filter(name => get.includes(name)),
    backend: { hamlibModel: found.entry.hamlibModel, file: backend.file, line: backend.line }
  };
}

module.exports = { FILE, DERIVED_FEATURES, REACHED, REASONS, BETA_REASONS, loadCaps, backendFor, deriveRadio };
