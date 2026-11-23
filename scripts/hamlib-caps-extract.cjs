"use strict";
// Extracts the capabilities each catalogue radio's Hamlib backend declares (levels, functions, VFO ops, split, tuner)
// into data/remote-hamlib-caps.json. Only capability names and handler presence are read: no code or calibration tables are copied.
// Usage: node scripts/hamlib-caps-extract.cjs [hamlib-dir]      (default data/third-party/refs/Hamlib, gitignored; open by exact path)
// Hamlib is LGPL-2.1-or-later; see docs/THIRD-PARTY-REUSE.md.
const fs = require("node:fs");
const path = require("node:path");
const { loadCatalog } = require("../remote-catalog.cjs");

const root = path.join(__dirname, "..");
const DEFAULT_DIR = path.join(root, "data", "third-party", "refs", "Hamlib");
const OUT = path.join(root, "data", "remote-hamlib-caps.json");
const BACKEND_DIRS = ["icom", "kenwood", "yaesu", "yaesu/ftx1", "flexradio"];
// Catalog radios without a Hamlib model number that still have a backend of their own in Hamlib (facts only, never wired).
const CANDIDATES = Object.freeze({ "yaesu-ft-817": "FT817", "yaesu-ft-818": "FT818", "yaesu-ft-857": "FT857", "yaesu-ft-897": "FT897D", "xiegu-g90": "G90", "xiegu-x6100": "X6100", "xiegu-x5105": "X5105" });
const LEVEL_KEYS = ["STRENGTH", "RAWSTR", "SWR", "ALC", "RFPOWER_METER", "RFPOWER_METER_WATTS", "COMP_METER", "ID_METER", "VD_METER", "TEMP_METER", "RFPOWER", "COMP", "AF", "RF", "PREAMP", "ATT", "AGC", "NB", "NR"];
const FUNC_KEYS = ["NB", "NR", "TUNER", "COMP", "ANF", "LOCK", "RIT", "XIT"];
const CAL_KEYS = ["str_cal", "swr_cal", "alc_cal", "rfpower_meter_cal", "comp_meter_cal", "vd_meter_cal", "id_meter_cal"];
const HANDLERS = ["set_split_vfo", "get_split_vfo", "set_split_freq", "get_split_freq", "set_vfo", "get_vfo", "vfo_op", "set_level", "get_level", "set_func", "get_func", "set_ptt", "get_ptt"];

// RIG_LEVEL_READONLY_LIST in include/hamlib/rig.h: RIG_LEVEL_SET() drops these from the set masks.
const READONLY = ["SWR", "ALC", "STRENGTH", "RAWSTR", "COMP_METER", "VD_METER", "ID_METER", "TEMP_METER", "RFPOWER_METER", "RFPOWER_METER_WATTS"];

const read = file => fs.readFileSync(file, "utf8");

function readWithIncludes(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return "";
  seen.add(file);
  return read(file).replace(/^[ \t]*#include\s+"([^"]+)"[^\n]*$/gm, (line, name) => {
    const target = path.join(path.dirname(file), name);
    return fs.existsSync(target) ? readWithIncludes(target, seen) : "";
  });
}

function collectMacros(text, into) {
  const joined = text.replace(/\\\r?\n/g, " ");
  for (const match of joined.matchAll(/^[ \t]*#define[ \t]+([A-Za-z_]\w*)(\([^)]*\))?[ \t]+(.*)$/gm)) {
    if (!match[2]) into.set(match[1], match[3].replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "").trim());
  }
}

// Set expressions over RIG_LEVEL_/RIG_FUNC_/RIG_OP_ names: identifiers, |, &, ~ and parentheses.
function evaluate(expression, macros, depth = 0) {
  const tokens = String(expression).replace(/\/\*.*?\*\//g, "").match(/[A-Za-z_]\w*|\d+|[|&~()]/g) || [];
  let position = 0;
  const universe = value => ({ items: new Set(value.items), complement: value.complement });
  const and = (a, b) => {
    if (!a.complement && !b.complement) return { items: new Set([...a.items].filter(item => b.items.has(item))), complement: false };
    if (!a.complement) return { items: new Set([...a.items].filter(item => !b.items.has(item))), complement: false };
    if (!b.complement) return and(b, a);
    return { items: new Set([...a.items, ...b.items]), complement: true };
  };
  const or = (a, b) => {
    if (!a.complement && !b.complement) return { items: new Set([...a.items, ...b.items]), complement: false };
    if (a.complement && b.complement) return { items: new Set([...a.items].filter(item => b.items.has(item))), complement: true };
    const [full, part] = a.complement ? [a, b] : [b, a];
    return { items: new Set([...full.items].filter(item => !part.items.has(item))), complement: true };
  };
  const primary = () => {
    const token = tokens[position++];
    if (token === "(") { const value = parseOr(); position++; return value; }
    if (token === "~") { const value = universe(primary()); return { items: value.items, complement: !value.complement }; }
    if (token === "RIG_LEVEL_SET" || token === "RIG_PARM_SET") {
      const value = primary();
      return and(value, { items: new Set(READONLY), complement: true });
    }
    if (!token || /^\d+$/.test(token) || /_NONE$/.test(token)) return { items: new Set(), complement: false };
    if (token === "RIG_LEVEL_READONLY_LIST") return { items: new Set(READONLY), complement: false };
    if (/^RIG_(LEVEL|FUNC|OP|PARM)_/.test(token)) return { items: new Set([token.replace(/^RIG_(LEVEL|FUNC|OP|PARM)_/, "")]), complement: false };
    if (macros.has(token) && depth < 12) return evaluate(macros.get(token), macros, depth + 1);
    return { items: new Set(), complement: false, unresolved: token };
  };
  const parseAnd = () => { let value = primary(); while (tokens[position] === "&") { position++; value = and(value, primary()); } return value; };
  const parseOr = () => { let value = parseAnd(); while (tokens[position] === "|") { position++; value = or(value, parseAnd()); } return value; };
  return parseOr();
}

function names(value, universeKeys) {
  return universeKeys.filter(key => (value.complement ? !value.items.has(key) : value.items.has(key)));
}

function fieldsOf(block) {
  const fields = new Map();
  let depth = 0;
  let index = 0;
  while (index < block.length) {
    const ch = block[index];
    if (ch === "{" || ch === "(") depth++;
    else if (ch === "}" || ch === ")") depth--;
    else if (depth === 0 && ch === "." && /[\s,{]/.test(block[index - 1] || " ")) {
      const match = /^\.([A-Za-z_]\w*)\s*=/.exec(block.slice(index));
      if (match) {
        let end = index + match[0].length;
        let inner = 0;
        while (end < block.length && !(inner === 0 && block[end] === ",")) {
          if ("{(".includes(block[end])) inner++;
          else if ("})".includes(block[end])) inner--;
          end++;
        }
        fields.set(match[1], block.slice(index + match[0].length, end).trim());
        index = end;
        continue;
      }
    }
    index++;
  }
  return fields;
}

function lineOf(text, offset) { return text.slice(0, offset).split("\n").length; }

function findBlocks(file) {
  const raw = read(file);
  const expanded = readWithIncludes(file);
  const blocks = [];
  for (const match of raw.matchAll(/^(?:const\s+)?struct\s+rig_caps\s+(\w+)\s*=\s*\{/gm)) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < raw.length && depth > 0) { if (raw[end] === "{") depth++; else if (raw[end] === "}") depth--; end++; }
    // Includes are expanded inside this block only.
    const body = raw.slice(match.index + match[0].length, end - 1);
    const text = body.replace(/^[ \t]*#include\s+"([^"]+)"[^\n]*$/gm, (line, name) => readWithIncludes(path.join(path.dirname(file), name)));
    blocks.push({ name: match[1], line: lineOf(raw, match.index), text, whole: expanded });
  }
  return blocks;
}

function modelNumbers(dir) {
  const header = read(path.join(dir, "include", "hamlib", "riglist.h"));
  const families = new Map();
  for (const match of header.matchAll(/^#define\s+(RIG_[A-Z0-9_]+)\s+(\d+)\s*$/gm)) families.set(match[1], Number(match[2]));
  const models = new Map();
  for (const match of header.matchAll(/^#define\s+(RIG_MODEL_\w+)\s+RIG_MAKE_MODEL\(\s*(\w+)\s*,\s*(\d+)\s*\)/gm)) {
    if (families.has(match[2])) models.set(match[1], families.get(match[2]) * 1000 + Number(match[3]));
  }
  return models;
}

function extract(dir = DEFAULT_DIR) {
  const models = modelNumbers(dir);
  const byNumber = new Map();
  const macros = new Map();
  collectMacros(read(path.join(dir, "include", "hamlib", "rig.h")), macros);
  for (const sub of BACKEND_DIRS) {
    const folder = path.join(dir, "rigs", ...sub.split("/"));
    if (!fs.existsSync(folder)) continue;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.[ch]$/.test(entry.name)) continue;
      collectMacros(read(path.join(folder, entry.name)), macros);
    }
  }
  for (const sub of BACKEND_DIRS) {
    const folder = path.join(dir, "rigs", ...sub.split("/"));
    if (!fs.existsSync(folder)) continue;
    for (const entry of fs.readdirSync(folder).filter(name => name.endsWith(".c")).sort()) {
      const file = path.join(folder, entry);
      for (const block of findBlocks(file)) {
        const fields = fieldsOf(block.text);
        const model = /RIG_MODEL\(\s*(RIG_MODEL_\w+)\s*\)/.exec(block.text)?.[1] || /\.rig_model\s*=\s*(RIG_MODEL_\w+)/.exec(block.text)?.[1];
        if (!model || !models.has(model)) continue;
        byNumber.set(models.get(model), { file, block, fields, modelMacro: model });
      }
    }
  }
  return { models, byNumber, macros };
}

function describe(entry, macros, dir) {
  const { file, block, fields } = entry;
  const local = new Map(macros);
  const unresolved = [];
  const set = (field, keys) => {
    if (!fields.has(field)) return [];
    const value = evaluate(fields.get(field), local);
    if (value.unresolved) unresolved.push(`${field}:${value.unresolved}`);
    return names(value, keys);
  };
  const handler = name => fields.has(name) && !/^(NULL|0)$/.test(fields.get(name));
  const cal = {};
  for (const key of CAL_KEYS) if (handler(key)) cal[key.replace(/_cal$/, "")] = fields.get(key).replace(/\s+/g, " ").slice(0, 60);
  return {
    caps: block.name,
    file: path.relative(dir, file).split(path.sep).join("/"),
    line: block.line,
    modelName: /\.model_name\s*=\s*"([^"]+)"/.exec(block.text)?.[1] || "",
    status: /\.status\s*=\s*RIG_STATUS_(\w+)/.exec(block.text)?.[1] || "",
    level: { get: set("has_get_level", LEVEL_KEYS), set: set("has_set_level", LEVEL_KEYS) },
    func: { get: set("has_get_func", FUNC_KEYS), set: set("has_set_func", FUNC_KEYS) },
    vfoOps: set("vfo_ops", ["TUNE", "XCHG", "CPY", "FROM_VFO", "TO_VFO", "MCL", "UP", "DOWN", "BAND_UP", "BAND_DOWN", "LEFT", "RIGHT", "TOGGLE"]),
    handlers: Object.fromEntries(HANDLERS.map(name => [name, handler(name)])),
    cal,
    ...(unresolved.length ? { unresolved } : {})
  };
}

function build(dir = DEFAULT_DIR) {
  const catalog = loadCatalog();
  const { models, byNumber, macros } = extract(dir);
  const backends = {};
  const radios = {};
  const note = (number, entry) => { if (!backends[number]) backends[number] = describe(entry, macros, dir); };
  for (const radio of catalog.radios) {
    if (Number.isInteger(radio.hamlibModel)) {
      const entry = byNumber.get(radio.hamlibModel);
      if (!entry) throw new Error(`${radio.id}: Hamlib model ${radio.hamlibModel} not found in ${dir}`);
      note(radio.hamlibModel, entry);
      radios[radio.id] = { hamlibModel: radio.hamlibModel, wired: true };
    } else if (CANDIDATES[radio.id]) {
      const number = models.get(`RIG_MODEL_${CANDIDATES[radio.id]}`);
      const entry = byNumber.get(number);
      if (!entry) throw new Error(`${radio.id}: candidate ${CANDIDATES[radio.id]} not found`);
      note(number, entry);
      radios[radio.id] = { hamlibModel: number, wired: false };
    }
  }
  const sorted = Object.fromEntries(Object.entries(backends).sort(([a], [b]) => Number(a) - Number(b)));
  return {
    format: "radicodex-remote-hamlib-caps",
    version: 1,
    reference: "data/third-party/refs/Hamlib (gitignored, open by exact path; riglist.h model numbers, rigs/<backend>/<file>.c caps structs)",
    licence: "Hamlib is LGPL-2.1-or-later; only capability names and handler presence are recorded, no code or calibration tables",
    note: "Statuses are derived from these capabilities only where the agent code path reaches them (remote-hamlib-caps.cjs); the running rigctld dump_caps still decides at start-up.",
    radios,
    backends: sorted
  };
}

if (require.main === module) {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DIR;
  const data = build(dir);
  // String arrays stay on one line to keep the diff reviewable.
  const text = JSON.stringify(data, null, 1)
    .replace(/\[\s*("[^"\]]*"(?:,\s*"[^"\]]*")*)\s*\]/g, (match, items) => `[${items.replace(/,\s+/g, ", ")}]`)
    .replace(/\{\s*"hamlibModel": (\d+),\s*"wired": (true|false)\s*\}/g, '{ "hamlibModel": $1, "wired": $2 }');
  fs.writeFileSync(OUT, `${text}\n`);
  console.log(`${path.relative(root, OUT)}: ${Object.keys(data.radios).length} radios, ${Object.keys(data.backends).length} backends`);
}

module.exports = { build, extract, evaluate };
