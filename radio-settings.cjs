"use strict";
// Shared remote radio settings model and safe-write engine.
// Data comes only from cited sources: ftx1-menu.js (FTX-1 CAT manual, Table 3 EX menu), ftx1-core.js
// (EX read/write/verify), docs/FTX1-KNOWLEDGE.md (errata, exclusions) and data/radio-settings-catalog.json.
// Anything without a sourced command or range is exposed read-only as "pendiente de fuente".
const fs = require("node:fs");
const path = require("node:path");

const OPERATOR_ROLE = "operator";
const PENDING = "pendiente de fuente";
// Matches the exact EX read/write command shape (no ";"): EXppqqrr[value]. Used by RigctldClient.rawMatchers.
const EX_RAW_MATCHER = /^EX\d{6}(?:[+-]?\d{1,5})?$/;
const EX_ANSWER = /^EX(\d{2})(\d{2})(\d{2})([\x20-\x7e]*);$/;
const AUDIT_LIMIT = 500;

let cachedRules = null;
function loadRules() {
  if (!cachedRules) cachedRules = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "radio-settings-catalog.json"), "utf8"));
  return cachedRules;
}

function loadFtx1Menu() {
  globalThis.RadioWorkspace = globalThis.RadioWorkspace || {};
  return require("./ftx1-menu.js").FTX1_MENU;
}

function classifyExclusion(name, rules = loadRules(), key = "") {
  const forced = rules.excludedKeys && rules.excludedKeys[key];
  if (forced) return rules.exclusions.find(rule => rule.id === forced) || null;
  for (const rule of rules.exclusions) if (new RegExp(rule.match).test(name)) return rule;
  return null;
}

// Range comes from the manual text only: explicit options, "P4 = a - b", or the signed "-N ... +M" form.
function parseRange(item) {
  if (item.options) return { options: item.options.map(([value, label]) => ({ value, label })) };
  const desc = String(item.desc || "");
  const step = /(\d+)\s*\w+\/step/.exec(desc);
  const unit = /\b(msec|min|sec|Hz|kHz|dB|%)\b/.exec(desc);
  const common = { ...(step ? { step: Number(step[1]) } : {}), ...(unit ? { unit: unit[1] } : {}) };
  if (item.kind === "signed") {
    const match = /^-(\d+) - -00 \(or \+00\) - \+(\d+)/.exec(desc);
    return match ? { min: -Number(match[1]), max: Number(match[2]), ...common } : null;
  }
  if (item.kind === "number") {
    const match = /P4\s*=\s*(\d+)\s*-\s*(\d+)/.exec(desc) || /^(\d+)\s*-\s*(\d+)(?:\s+\w+)?$/.exec(desc.trim());
    return match ? { min: Number(match[1]), max: Number(match[2]), ...common } : null;
  }
  return null;
}

function isPendingName(name, rules) {
  return rules.pendingNames.some(entry => name === entry || name.startsWith(`${entry} `));
}

function ftx1Settings(rules = loadRules()) {
  return loadFtx1Menu().map(item => {
    const key = `EX${item.p1}${item.p2}${item.p3}`;
    const base = {
      id: `ex-${item.p1}${item.p2}${item.p3}`, label: item.name, group: item.group, type: item.options ? "enum" : item.kind,
      digits: item.digits, read: `${key};`, write: `${key}<value>;`, source: "ftx1-menu.js; docs/FTX1-KNOWLEDGE.md", risk: "low",
      writable: false, readOnlyReason: null
    };
    const range = parseRange(item);
    if (range) Object.assign(base, range);
    const excluded = classifyExclusion(item.name, rules, key);
    if (excluded) return { ...base, risk: excluded.scope, exclusion: excluded.id, readOnlyReason: excluded.reason };
    if (item.readOnly) return { ...base, readOnlyReason: "Read-only in the FTX-1 menu map." };
    if (item.kind === "text") return { ...base, readOnlyReason: "Text items are not written remotely." };
    if (isPendingName(item.name, rules) || rules.pendingKeys.includes(key)) return { ...base, pending: true, readOnlyReason: rules.pendingReason };
    if (!range) return { ...base, pending: true, readOnlyReason: `${PENDING}: no sourced range in the manual text.` };
    return { ...base, writable: true };
  });
}

function familyOf(radioId, rules = loadRules()) {
  for (const rule of rules.rules) if (new RegExp(rule.match).test(radioId)) return rule.family;
  return "none";
}

function parseOpts(text) {
  return text.split("|").map(part => {
    const at = part.indexOf("=");
    return { value: part.slice(0, at), label: part.slice(at + 1) };
  });
}

// IC-705 1A 05 table (CI-V Reference Guide printed pp.5-8). Values travel as BCD digit strings: 2 digits for one byte, 4 for two.
function civSettings(def, rules) {
  return def.civSettings.map(entry => {
    const base = {
      id: `ic705-1a05-${entry.sub}`, label: entry.label, group: entry.group, civ: true, read: `1A05${entry.sub}`, write: `1A05${entry.sub}<value>`,
      source: `IC-705 CI-V Reference Guide rev. 6, printed p.${entry.page}`, risk: "low", writable: false, readOnlyReason: null
    };
    if (entry.kind === "composite") return { ...base, type: "composite", pending: true, readOnlyReason: `${PENDING}: ${entry.pending}.` };
    const typed = entry.kind === "enum" || entry.kind === "bool"
      ? { type: "enum", digits: 2, options: entry.kind === "bool" ? parseOpts("00=OFF|01=ON") : parseOpts(entry.opts) }
      : { type: "number", digits: entry.kind === "level" ? 4 : 2, min: entry.min, max: entry.max };
    const merged = { ...base, ...typed };
    const excluded = entry.exclusion && rules.exclusions.find(rule => rule.id === entry.exclusion);
    if (excluded) return { ...merged, risk: excluded.scope, exclusion: excluded.id, readOnlyReason: excluded.reason };
    return { ...merged, writable: true };
  });
}

function familySettings(family, rules = loadRules()) {
  if (family === "ftx1-menu") return ftx1Settings(rules);
  const def = rules.families[family];
  if (def.civSettings) return civSettings(def, rules);
  return (def.settings || []).map(entry => ({
    risk: "low", source: def.source, writable: false, readOnlyReason: entry.readOnlyReason || `${PENDING}: write command or range not in the repo sources.`,
    pending: !entry.readOnlyReason, ...entry
  }));
}

function allRadios(catalogRadios, rules = loadRules()) {
  return [
    ...catalogRadios.map(radio => ({ id: radio.id, maker: radio.maker, model: radio.model, link: (radio.links || []).join("/") })),
    ...rules.extraRadios.map(radio => ({ id: radio.id, maker: radio.maker, model: radio.model, editor: radio.editor, family: radio.family }))
  ];
}

function describeRadio(radio, rules = loadRules()) {
  const family = radio.family || familyOf(radio.id, rules);
  const def = rules.families[family];
  const settings = familySettings(family, rules);
  const writable = settings.filter(setting => setting.writable).length;
  const excluded = settings.filter(setting => setting.exclusion).length;
  const pending = settings.filter(setting => setting.pending).length;
  let status = "pendiente de fuente";
  if (def.mode === "codeplug-local") status = "codeplug local only";
  else if (writable > 0) status = pending || excluded ? "partial" : "ok";
  else if (settings.length > 0) status = "partial";
  return {
    id: radio.id, maker: radio.maker, model: radio.model, family, mode: def.mode, link: radio.link ? `${radio.link}; ${def.link}` : def.link,
    readable: def.mode === "none" || def.mode === "codeplug-local" ? 0 : settings.length, writable, count: settings.length,
    excluded, pending, editor: radio.editor || null, live: def.live || [], source: def.source, status
  };
}

function supportMatrix(catalogRadios, rules = loadRules()) {
  return allRadios(catalogRadios, rules).map(radio => describeRadio(radio, rules));
}

function loadCatalogRadios() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", "remote-station-catalog.json"), "utf8")).radios;
}

function pad(value, length) { return String(Math.abs(value)).padStart(length, "0"); }

// Turns an operator-supplied value into the exact wire string, or throws RangeError with a reason.
function encodeValue(setting, input) {
  let text = typeof input === "number" ? null : String(input);
  if (setting.type === "enum") {
    text = text ?? String(input);
    if (!setting.options.some(option => option.value === text)) throw new RangeError("Value outside the sourced options.");
    return text;
  }
  const signed = setting.type === "signed";
  const number = typeof input === "number" ? input : Number(text);
  if (!Number.isInteger(number) || (typeof input === "string" && !/^[+-]?\d+$/.test(text))) throw new RangeError("Integer value required.");
  if (number < setting.min || number > setting.max) throw new RangeError(`Value outside the sourced range ${setting.min}..${setting.max}.`);
  if (setting.step && (number - setting.min) % setting.step !== 0) throw new RangeError(`Value must follow the ${setting.step} step.`);
  if (signed) return `${number < 0 ? "-" : "+"}${pad(number, setting.digits - 1)}`;
  return pad(number, setting.digits);
}

// Returns the value string, or null when the radio answers "?;" (item not available, documented for EX050109).
function parseReply(setting, reply) {
  const text = String(reply).replace(/[\0\r\n]/g, "").trim();
  if (text === "?;" || text === "?") return null;
  const match = EX_ANSWER.exec(text);
  const key = setting.read.slice(2, 8);
  if (!match || `${match[1]}${match[2]}${match[3]}` !== key) throw new Error("Unexpected EX reply.");
  return match[4];
}

const EX_CODEC = {
  readCommand: setting => setting.read.replace(/;$/, ""),
  writeCommand: (setting, value) => setting.write.replace("<value>", value).replace(/;$/, ""),
  parse: parseReply,
  checkAck: null
};

// CI-V codec (IC-705 CI-V Reference Guide printed p.2): FE FE <to> <from> <cmd> <sub> [data] FD, OK = FB, NG = FA.
// Commands and replies travel as hex strings; a reply may hold our echo, broadcasts and the radio frame.
function civCodec({ address = 0xA4, controller = 0xE0 } = {}) {
  const hex = value => value.toString(16).toUpperCase().padStart(2, "0");
  const frame = body => `FEFE${hex(address)}${hex(controller)}${body}FD`;
  const framesFrom = reply => {
    const bytes = String(reply || "").replace(/[^0-9A-Fa-f]/g, "").toUpperCase().match(/../g) || [];
    const frames = [];
    let current = null;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === "FE" && bytes[i + 1] === "FE") { current = []; i++; continue; }
      if (bytes[i] === "FD") { if (current && current.length >= 3) frames.push(current); current = null; continue; }
      if (current) current.push(bytes[i]);
    }
    return frames.filter(item => item[0] === hex(controller) && item[1] === hex(address));
  };
  return {
    readCommand: setting => frame(setting.read),
    writeCommand: (setting, value) => frame(`${setting.read}${value}`),
    parse(setting, reply) {
      const frames = framesFrom(reply);
      if (frames.some(item => item[2] === "FA")) throw new Error("Radio answered NG (FA).");
      const answer = frames.find(item => item.slice(2, 2 + setting.read.length / 2).join("") === setting.read);
      if (!answer) throw new Error("Unexpected CI-V reply.");
      const value = answer.slice(2 + setting.read.length / 2).join("");
      if (value.length !== setting.digits || !/^\d+$/.test(value)) throw new Error("Unexpected CI-V reply.");
      return value;
    },
    checkAck(reply) {
      const frames = framesFrom(reply);
      if (frames.some(item => item[2] === "FA")) throw new Error("Radio answered NG (FA).");
      if (!frames.some(item => item[2] === "FB")) throw new Error("No OK (FB) from the radio.");
    }
  };
}

// Safe write protocol: operator only, refuse while transmitting, one write at a time, rate limited,
// backup read -> validate -> write -> read back -> restore on mismatch, everything audited.
function createSettingsService(options) {
  const settings = options.settings;
  const byId = new Map(settings.map(setting => [setting.id, setting]));
  const codec = options.codec || EX_CODEC;
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const minIntervalMs = options.minIntervalMs ?? 1000;
  const audit = [];
  let busy = false;
  let lastWriteAt = -Infinity;

  const record = (event, detail) => {
    const entry = { at: now(), event, ...detail };
    audit.push(entry);
    if (audit.length > AUDIT_LIMIT) audit.shift();
    log(`settings ${JSON.stringify(entry)}`);
  };
  const fail = (status, error, extra = {}) => ({ status, body: { ok: false, error, ...extra } });
  const readValue = async setting => codec.parse(setting, await options.send(codec.readCommand(setting), { read: true, timeoutMs: options.timeoutMs }));
  const writeValue = async (setting, value) => {
    const reply = await options.send(codec.writeCommand(setting, value), { read: false, ack: Boolean(codec.checkAck), timeoutMs: options.timeoutMs });
    if (codec.checkAck) codec.checkAck(reply);
  };

  return {
    audit: () => audit.slice(),
    list: () => settings.map(setting => ({ ...setting })),
    async read(id) {
      const setting = byId.get(id);
      if (!setting) return fail(404, "Unknown setting.");
      try {
        const value = await readValue(setting);
        return { status: 200, body: { ok: true, id, value, available: value !== null } };
      }
      catch (error) { return fail(502, `Read failed: ${error.message}`); }
    },
    async write(id, input, { role } = {}) {
      if (role !== OPERATOR_ROLE) { record("denied", { id, reason: "role" }); return fail(403, "Operator role required."); }
      const setting = byId.get(id);
      if (!setting) return fail(404, "Unknown setting.");
      // Defence in depth: a hard-excluded item is refused even if a catalog bug marked it writable.
      if (!setting.writable || setting.exclusion || (!setting.civ && classifyExclusion(setting.label || "", loadRules(), setting.read ? setting.read.slice(0, 8) : ""))) { record("refused", { id, reason: "read-only" }); return fail(403, setting.readOnlyReason || "Read-only setting.", { id }); }
      if (busy) return fail(409, "Another settings write is in progress.");
      const time = now();
      if (time - lastWriteAt < minIntervalMs) return fail(429, "Settings writes are rate limited.");
      let value;
      try { value = encodeValue(setting, input); }
      catch (error) { record("rejected", { id, reason: error.message }); return fail(400, error.message); }
      const transmitting = options.isTransmitting ? options.isTransmitting() : null;
      if (transmitting !== false) { record("refused", { id, reason: "transmitting-or-unknown" }); return fail(409, "Settings are refused while transmitting or when TX state is unknown."); }
      busy = true;
      lastWriteAt = time;
      let backup = null;
      let written = false;
      try {
        backup = await readValue(setting);
        if (backup === null) throw new Error("Current value not available (radio answered ?;): write refused, no backup possible.");
        record("backup", { id, backup, target: value });
        if (options.isTransmitting() !== false) throw new Error("TX started during the settings transaction.");
        written = true;
        await writeValue(setting, value);
        const observed = await readValue(setting);
        if (observed !== value) throw Object.assign(new Error(`Read-back mismatch (${observed}).`), { mismatch: true });
        record("written", { id, backup, value });
        return { status: 200, body: { ok: true, id, backup, value } };
      } catch (error) {
        let restored = false;
        if (written && backup !== null) {
          try { await writeValue(setting, backup); restored = (await readValue(setting)) === backup; } catch { restored = false; }
        }
        record("failed", { id, backup, target: value, error: error.message, restored });
        return fail(502, error.message, { id, backup, restored });
      } finally {
        busy = false;
      }
    }
  };
}

module.exports = {
  OPERATOR_ROLE, PENDING, EX_RAW_MATCHER, loadRules, ftx1Settings, familySettings, familyOf, parseRange, classifyExclusion,
  supportMatrix, describeRadio, loadCatalogRadios, encodeValue, parseReply, civCodec, EX_CODEC, createSettingsService
};
