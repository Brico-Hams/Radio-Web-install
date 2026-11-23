"use strict";
// Loader and validator for data/remote-station-catalog.json (radios, rotors and amplifiers Hamlib can drive at the station).
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "remote-station-catalog.json");
const LINKS = Object.freeze(["usb", "lan", "wifi"]);
const SCOPES = Object.freeze(["civ", "smartsdr", "sdr", "audio", "none"]);
const STATUSES = Object.freeze(["tested", "expected", "beta"]);
const ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const HEX4 = /^[0-9A-F]{4}$/;
const SET_CONF = /^[a-z_]+=[A-Za-z0-9]+(,[a-z_]+=[A-Za-z0-9]+)*$/;
const CAT_COMMAND = /^[A-Z]{2}[0-9]{0,3}$/;

const isText = value => typeof value === "string" && value.trim() !== "";
const isModel = value => Number.isInteger(value) && value > 0;

function validateRadio(radio, where) {
  const fail = message => { throw new Error(`${where}: ${message}`); };
  if (!radio || typeof radio !== "object") fail("entrada no valida");
  if (typeof radio.id !== "string" || !ID.test(radio.id)) fail("id no valido");
  for (const key of ["maker", "model", "notes_es"]) if (!isText(radio[key])) fail(`${key} obligatorio`);
  if (!isModel(radio.hamlibModel)) fail("hamlibModel debe ser un entero");
  if (!Array.isArray(radio.links) || !radio.links.length || radio.links.some(link => !LINKS.includes(link))) fail("links no validos");
  if (!Array.isArray(radio.bands) || !radio.bands.length || radio.bands.some(band => !isText(band))) fail("bands no validas");
  for (const key of ["listen", "transmit"]) if (typeof radio[key] !== "boolean") fail(`${key} debe ser booleano`);
  if (![true, false, "unknown"].includes(radio.remotePowerOn)) fail("remotePowerOn debe ser true, false o \"unknown\"");
  // scope = the physical radio's own spectrum: civ (CI-V 0x27), smartsdr (panadapter API), sdr (computed from IQ), audio (passband from RX audio), none.
  if (!SCOPES.includes(radio.scope)) fail("scope no valido");
  if (!STATUSES.includes(radio.status)) fail("status no valido");
  const serial = radio.serial;
  if (!serial || typeof serial !== "object") fail("serial obligatorio");
  if (!Number.isInteger(serial.baud) || serial.baud < 0 || serial.baud > 4_000_000) fail("serial.baud no valido");
  if (!Array.isArray(serial.usb)) fail("serial.usb debe ser una lista");
  for (const entry of serial.usb) {
    if (!entry || !HEX4.test(entry.vid) || !HEX4.test(entry.pid)) fail("serial.usb necesita vid y pid de 4 cifras hex en mayusculas");
  }
  if (serial.openDelayMs !== undefined && (!Number.isInteger(serial.openDelayMs) || serial.openDelayMs < 0 || serial.openDelayMs > 10_000)) fail("serial.openDelayMs no valido");
  if (serial.setConf !== undefined && (typeof serial.setConf !== "string" || !SET_CONF.test(serial.setConf))) fail("serial.setConf no valido");
  if (radio.cat !== undefined) validateCat(radio.cat, fail);
  return radio;
}

// Per-radio raw CAT overrides (Yaesu CAT syntax, without the trailing ";"), sent through rigctld's raw command.
function validateCat(cat, fail) {
  if (!cat || typeof cat !== "object" || Array.isArray(cat)) fail("cat no valido");
  if (cat.protocol !== "yaesu") fail("cat.protocol debe ser \"yaesu\"");
  const command = (value, name) => { if (typeof value !== "string" || !CAT_COMMAND.test(value)) fail(`cat.${name} no valido`); };
  if (cat.tuner !== undefined) {
    if (!cat.tuner || typeof cat.tuner !== "object") fail("cat.tuner no valido");
    command(cat.tuner.read, "tuner.read");
    if (cat.tuner.atas !== undefined) {
      if (!cat.tuner.atas || typeof cat.tuner.atas !== "object") fail("cat.tuner.atas no valido");
      for (const key of ["start", "stop"]) command(cat.tuner.atas[key], `tuner.atas.${key}`);
    }
    if (cat.tuner.internal !== undefined) {
      if (!cat.tuner.internal || typeof cat.tuner.internal !== "object") fail("cat.tuner.internal no valido");
      for (const key of ["on", "off", "start", "stop"]) command(cat.tuner.internal[key], `tuner.internal.${key}`);
    }
    if (!cat.tuner.atas && !cat.tuner.internal) fail("cat.tuner necesita atas o internal");
  }
  if (cat.status !== undefined) command(cat.status, "status");
  if (cat.txOff !== undefined) command(cat.txOff, "txOff");
  // Sourced power-off CAT string (e.g. FTX-1 PS0, docs/FTX1-KNOWLEDGE.md); sent only by the owner-confirmed /api/power route.
  if (cat.powerOff !== undefined) command(cat.powerOff, "powerOff");
  command(cat.txState, "txState");
  if (!cat.meters || typeof cat.meters !== "object") fail("cat.meters obligatorio");
  for (const key of ["alc", "po", "swr"]) command(cat.meters[key], `meters.${key}`);
  command(cat.power, "power");
  if (!Number.isInteger(cat.swrRawLimit) || cat.swrRawLimit < 1 || cat.swrRawLimit > 255) fail("cat.swrRawLimit debe estar entre 1 y 255");
}

// Every raw string the agent may send for a radio; nothing else ever reaches the radio.
function catAllowList(cat) {
  if (!cat) return [];
  const tuner = cat.tuner ? [cat.tuner.read, ...Object.values(cat.tuner.atas || {}), ...Object.values(cat.tuner.internal || {})] : [];
  const list = [cat.txState, cat.power, cat.status, cat.txOff, cat.powerOff, ...Object.values(cat.meters || {}), ...tuner].filter(Boolean);
  return [...new Set(list)];
}

const TUNER_KINDS = Object.freeze(["atas", "internal"]);

function validateAccessory(item, where) {
  const fail = message => { throw new Error(`${where}: ${message}`); };
  if (!item || typeof item.id !== "string" || !ID.test(item.id)) fail("id no valido");
  for (const key of ["maker", "model", "notes_es"]) if (!isText(item[key])) fail(`${key} obligatorio`);
  if (!isModel(item.hamlibModel)) fail("hamlibModel debe ser un entero");
  if (item.serial !== undefined && (!item.serial || !Number.isInteger(item.serial.baud) || item.serial.baud <= 0)) fail("serial.baud no valido");
  return item;
}

function validateCatalog(data) {
  if (!data || data.format !== "radicodex-remote-station-catalog" || data.version !== 1) throw new Error("Catalogo de estacion remota no reconocido.");
  const ids = new Set();
  const check = (list, name, validate) => {
    if (!Array.isArray(list)) throw new Error(`${name} debe ser una lista.`);
    list.forEach((item, index) => {
      validate(item, `${name}[${index}]`);
      if (ids.has(item.id)) throw new Error(`${name}[${index}]: id duplicado ${item.id}`);
      ids.add(item.id);
    });
  };
  check(data.radios, "radios", validateRadio);
  check(data.rotors, "rotors", validateAccessory);
  check(data.amplifiers, "amplifiers", validateAccessory);
  return data;
}

let cached = null;
function loadCatalog(file = FILE) {
  if (file === FILE && cached) return cached;
  const catalog = validateCatalog(JSON.parse(fs.readFileSync(file, "utf8")));
  if (file === FILE) cached = catalog;
  return catalog;
}

const findRadio = (id, catalog = loadCatalog()) => catalog.radios.find(radio => radio.id === id) || null;
const findRotor = (id, catalog = loadCatalog()) => catalog.rotors.find(rotor => rotor.id === id) || null;

module.exports = { loadCatalog, validateCatalog, findRadio, findRotor, catAllowList, TUNER_KINDS, FILE };
