"use strict";
// Remote CW through the radio's own keyer. Pure planner + TX guard: nothing here opens a port or keys a radio.
// Every command below is cited; a radio without a cited command has no entry and is reported as unsourced.
//
// Sources:
//  - FTX-1: docs/FTX1-KNOWLEDGE.md rows KM and KY (FTX-1_CAT_OM_ENG_2508-C, KM printed p.17, KY printed p.18):
//    `KM P1 P2;` writes keyer memory 1-5 (up to 50 chars), `KY P1 P2;` P1 0 = CW TEXT memory, P2 1-5 plays, 0 stops.
//    There is no free-text KY, so typed CW is KM on one slot and then KY (same sequence as
//    third_party/ftx1/rigplane-rigplane-core/tests/test_ftx1_send_cw_text_wire.py: "KM5CQ;" then "KY05;", stop "KY00;").
//  - IC-705: data/third-party/IC-705_ENG_CI-V_6.txt (local, not committed). Frame FE FE A4 E0 Cn Sc Data FD (PDF p.3, A4 =
//    transceiver, E0 = controller), command 17 "Send CW messages" (command table, PDF p.5), up to 30 characters, character
//    codes and "FF stops sending CW messages" on PDF p.18 (printed p.17). Only the IC-705 guide is in the repo: the other
//    Icom models are not claimed.
//  - Hamlib baseline: rigctl `b <text>` / `\send_morse`, named in
//    third_party/ftx1/rigplane-rigplane-core/tests/test_cw_text_rigctld_entry_points.py. Whether a given model implements it
//    is not sourced, so it is "partial" and the agent must refuse when rigctld answers an error.
//  - Kenwood KY, Elecraft KY: no manual excerpt in the repo -> pendiente de fuente.

const FTX1_SLOT = 5;
const FTX1_MAX = 50;
const ICOM_MAX = 30;
const ICOM_ADDRESS = Object.freeze({ "icom-ic-705": 0xA4 });
const CONTROLLER = 0xE0;
const MAX_SECONDS_DEFAULT = 60;
const MAX_SECONDS_CAP = 120;

const FTX1_CHARS = /^[A-Z0-9 /?,.=+\-():@]+$/;
// IC-705 CI-V guide p.18: 0-9, A-Z, a-z and / ? . - , : ' ( ) = + " @ space; "^" joins characters without spacing.
const ICOM_CHARS = /^[A-Za-z0-9/?.\-,:'()=+"@ ^]+$/;
const HAMLIB_CHARS = /^[A-Z0-9 /?,.=+\-():@]+$/;

// ITU-R M.1677 element patterns, used only to estimate how long a message keys the transmitter.
const MORSE = Object.freeze({
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...",
  8: "---..", 9: "----.", "/": "-..-.", "?": "..--..", ".": ".-.-.-", ",": "--..--", "=": "-...-", "+": ".-.-.", "-": "-....-",
  "(": "-.--.", ")": "-.--.-", ":": "---...", "@": ".--.-.", "'": ".----.", '"': ".-..-."
});

class CwError extends Error {
  constructor(message, code) { super(message); this.name = "CwError"; this.code = code; }
}

// Dot units of a text at the PARIS standard (50 units per word); "^" is dropped (no inter-character gap, still keyed).
function cwUnits(text) {
  let units = 0;
  const words = String(text).toUpperCase().replace(/\^/g, "").split(/ +/).filter(Boolean);
  words.forEach((word, index) => {
    if (index) units += 7;
    [...word].forEach((char, i) => {
      const pattern = MORSE[char] || "";
      if (i) units += 3;
      [...pattern].forEach((el, j) => { if (j) units += 1; units += el === "-" ? 3 : 1; });
    });
  });
  return units;
}

const cwSeconds = (text, wpm) => (cwUnits(text) * 1.2) / wpm;

const hex = bytes => bytes.map(b => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

function civFrame(address, command, data) {
  return [0xFE, 0xFE, address, CONTROLLER, command, ...data, 0xFD];
}

const NATIVE = Object.freeze({
  "yaesu-ftx-1": "ftx1",
  "icom-ic-705": "icom705"
});

// Catalog radios that have a transmitter and go through rigctld (Hamlib baseline). Receivers and non-CW devices have none.
function hamlibCapable(radio) {
  return Boolean(radio && radio.transmit && radio.hamlibModel && radio.scope !== undefined);
}

function cleanText(text, family, limit) {
  if (typeof text !== "string" || !text.trim()) throw new CwError("Texto CW vacio.", "empty");
  const value = family === "icom705" ? text.trim() : text.trim().toUpperCase();
  const pattern = family === "icom705" ? ICOM_CHARS : family === "ftx1" ? FTX1_CHARS : HAMLIB_CHARS;
  if (!pattern.test(value)) throw new CwError("El texto contiene caracteres no admitidos por la radio.", "chars");
  if (limit && value.length > limit) throw new CwError(`Texto demasiado largo (maximo ${limit}).`, "length");
  return value;
}

// Returns { via, steps, stop, family, seconds } or throws CwError("unsourced" | validation).
// `radio` is the catalog entry (data/remote-station-catalog.json).
function planCwSend(radio, text, { wpm = 20, maxSeconds = MAX_SECONDS_DEFAULT, slot = FTX1_SLOT } = {}) {
  if (!radio) throw new CwError("Radio desconocida.", "unknown-radio");
  if (!Number.isInteger(wpm) || wpm < 5 || wpm > 60) throw new CwError("Velocidad CW no valida (5-60 WPM).", "wpm");
  const cap = Math.min(MAX_SECONDS_CAP, maxSeconds);
  const family = NATIVE[radio.id];
  let plan;
  if (family === "ftx1") {
    if (!Number.isInteger(slot) || slot < 1 || slot > 5) throw new CwError("Memoria de manipulador no valida (1-5).", "slot");
    const value = cleanText(text, family, FTX1_MAX);
    plan = { via: "cat", family, text: value, steps: [`KM${slot}${value};`, `KY0${slot};`], stop: ["KY00;"] };
  } else if (family === "icom705") {
    const value = cleanText(text, family, ICOM_MAX);
    const data = [...value].map(char => char.charCodeAt(0));
    const address = ICOM_ADDRESS[radio.id];
    plan = { via: "civ", family, text: value, steps: [hex(civFrame(address, 0x17, data))], stop: [hex(civFrame(address, 0x17, [0xFF]))] };
  } else if (hamlibCapable(radio)) {
    const value = cleanText(text, "hamlib", 0);
    plan = { via: "hamlib", family: "hamlib", text: value, steps: [`b ${value}`], stop: [] };
  } else {
    throw new CwError("Radio sin comando de CW con fuente (pendiente de fuente).", "unsourced");
  }
  plan.seconds = Math.round(cwSeconds(plan.text, wpm) * 10) / 10;
  if (plan.seconds > cap) throw new CwError(`El mensaje dura ${plan.seconds} s; el maximo es ${cap} s.`, "too-long");
  return plan;
}

// F1-F8 memories: placeholders {CALL} (their call), {MYCALL}, {RST}, {NR}; values must already be valid CW characters.
function expandMemory(template, values = {}) {
  if (typeof template !== "string") throw new CwError("Memoria no valida.", "memory");
  return template.replace(/\{(CALL|MYCALL|RST|NR)\}/g, (_, key) => String(values[key] ?? "").toUpperCase());
}

const DEFAULT_MEMORIES = Object.freeze(["CQ CQ DE {MYCALL} {MYCALL} K", "{CALL} DE {MYCALL} K", "{CALL} {RST} {RST} {NR}", "{CALL} TU 73 EE", "QRZ? DE {MYCALL}", "AGN?", "{MYCALL}", "73 TU"]);
const MEMORY_COUNT = 8;
const MEMORY_CHARS = /^[A-Za-z0-9 /?,.=+\-():@'"^{}]*$/;
const OPERATOR_ID = /^(owner|guest:[\w-]{1,64})$/;

// F1-F8 templates, stored per operator in the agent (never in the browser). Holds text only: no tokens or credentials.
function validateMemories(memories) {
  if (!Array.isArray(memories) || memories.length !== MEMORY_COUNT) throw new CwError("Se requieren 8 memorias CW.", "memory");
  return memories.map(item => {
    if (typeof item !== "string" || item.length > FTX1_MAX || !MEMORY_CHARS.test(item)) throw new CwError("Memoria CW no valida.", "memory");
    return item;
  });
}

function createMemoryStore({ dir = null } = {}) {
  const fs = require("node:fs");
  const path = require("node:path");
  const file = dir ? path.join(dir, "remote-cw-memories.json") : null;
  let data = {};
  if (file && fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, "utf8")) || {}; } catch { throw new Error(`Memorias CW corruptas: ${file}`); }
  }
  const key = operator => {
    if (!OPERATOR_ID.test(operator)) throw new CwError("Operador no valido.", "operator");
    return operator;
  };
  return {
    get(operator) {
      const stored = Object.hasOwn(data, key(operator)) ? data[operator] : null;
      try { return validateMemories(stored); } catch { return [...DEFAULT_MEMORIES]; }
    },
    set(operator, memories) {
      const clean = validateMemories(memories);
      data[key(operator)] = clean;
      if (file) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
      }
      return clean;
    }
  };
}

// One CW send at a time, off by default, time capped, never while the SWR trip or an emergency stop is active.
// `stop()` is always allowed. The caller sends plan.stop and releases PTT when the guard reports `expired`.
function createCwGuard({ enabled = false, now = Date.now, isBlocked = () => false } = {}) {
  let active = null;
  // A message that ran into its time cap still owes the radio a stop frame.
  let lapsed = null;
  const state = () => {
    if (active && now() >= active.until) { lapsed = active; active = null; }
    return active;
  };
  return {
    get enabled() { return enabled; },
    authorize(plan) {
      if (!enabled) throw new CwError("El CW remoto esta desactivado (accion explicita del operador).", "disabled");
      if (isBlocked()) throw new CwError("TX bloqueada (ROE alta o parada de emergencia).", "blocked");
      if (state()) throw new CwError("Ya hay un mensaje en curso.", "busy");
      // Margin of 1 s covers the radio's own start/stop latency.
      active = { until: now() + (plan.seconds + 1) * 1000, plan };
      lapsed = null;
      return active;
    },
    active: () => state(),
    expired: () => active !== null && now() >= active.until,
    stop() {
      state();
      const stopSteps = active ? active.plan.stop : lapsed ? lapsed.plan.stop : [];
      active = null;
      lapsed = null;
      return stopSteps;
    }
  };
}

module.exports = { planCwSend, expandMemory, createCwGuard, createMemoryStore, validateMemories, DEFAULT_MEMORIES, cwUnits, cwSeconds, civFrame, CwError, NATIVE, ICOM_MAX, FTX1_MAX, MAX_SECONDS_DEFAULT };
