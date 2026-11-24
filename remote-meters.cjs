"use strict";
// Normalized meter model and the pure tune-check state machine shared by the remote agent and its UIs.
// Scales and sources live in data/remote-meter-model.json; nothing here is calibrated beyond what is cited there.

const model = require("./data/remote-meter-model.json");

const clamp01 = value => Math.max(0, Math.min(1, value));
const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

// Names callers already use (ftx1-core.js METER_NAMES, RM P1 order, rigctld levels) -> model keys.
const ALIASES = Object.freeze({
  s: "smeter", sm: "smeter", smain: "smeter", smetermain: "smeter", s_main: "smeter", strength: "smeter",
  ssub: "smeter-sub", smetersub: "smeter-sub", s_sub: "smeter-sub",
  idd: "id", drain: "id", power: "po", roe: "swr", compression: "comp"
});
const RM_KEYS = Object.freeze({ 1: "smeter", 2: "smeter-sub", 3: "comp", 4: "alc", 5: "po", 6: "swr", 7: "id", 8: "vdd" });

function resolveKey(key) {
  const text = String(key ?? "").toLowerCase();
  const alias = ALIASES[text] || text;
  return Object.hasOwn(model.meters, alias) ? alias : null;
}

function lerp(points, x, origin = [0, 0]) {
  if (x <= origin[0]) return origin[1];
  let [x0, y0] = origin;
  for (const [x1, y1] of points) {
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    [x0, y0] = [x1, y1];
  }
  return y0;
}

// Single SWR conversion for the raw FTX-1 RM6 value (bg7nzl-ftx1ctl ftx1cat.py swr_from_meter): Infinity at 255.
function swrFromRaw(raw) {
  const { c, b } = model.meters.swr;
  if (raw >= 255) return Infinity;
  if (raw <= 0) return 1;
  return 1 + c * (Math.exp(b * raw) - 1);
}

function smeterText(raw) {
  const def = model.meters.smeter;
  if (raw < def.s9raw) {
    const step = [...def.steps].reverse().find(([from]) => raw >= from);
    return { value: step ? step[1] : 0, over: 0 };
  }
  return { value: 9, over: round(lerp(def.over, raw, [def.s9raw, 0]), 1) };
}

// Raw 0-255 CAT value (RM P1 nnn / SM P1 nnn) -> { key, raw, value, unit, fraction, text, pending }.
// `head` is the PC P1 digit (1 field head, 2 SPA-1); PO is only scaled for the field head. Unknown meters or
// non-finite input give nulls; a meter whose scale has no source stays raw and is flagged pending.
function normalizeMeter(key, raw, { head = null } = {}) {
  const name = resolveKey(key);
  const def = name ? model.meters[name] : null;
  const empty = { key: name || String(key), raw: null, value: null, unit: def?.unit || null, fraction: null, text: "--", pending: Boolean(def?.pending) };
  if (!def || !Number.isFinite(raw) || raw < 0) return empty;
  const clamped = Math.min(255, Math.round(raw));
  const out = { key: name, raw: clamped, value: clamped, unit: "raw", fraction: clamp01(clamped / 255), text: `${clamped}/255`, pending: false };
  if (def.pending) return { ...out, text: `${out.text} (pendiente de fuente)`, pending: true };
  switch (name) {
    case "smeter": case "smeter-sub": {
      const { value, over } = smeterText(clamped);
      return { ...out, value, unit: "S", over, text: over > 0 ? `S9+${over} dB` : `S${value}` };
    }
    case "swr": {
      const ratio = swrFromRaw(clamped);
      return { ...out, value: Number.isFinite(ratio) ? round(ratio) : null, unit: "", text: Number.isFinite(ratio) ? `${round(ratio)}:1` : "∞:1" };
    }
    case "alc": {
      const value = Math.min(def.cap, (clamped * def.scale) / def.max);
      return { ...out, value: round(value, 1), unit: "%", text: `${Math.round(value)} %` };
    }
    case "po":
      if (head !== 1) return { ...out, text: `${out.text} (pendiente de fuente)`, pending: true };
      return { ...out, value: round(lerp(def.points, clamped)), unit: "W", text: `${round(lerp(def.points, clamped), 1)} W` };
    case "vdd": {
      const value = (clamped * def.scale) / def.raw203;
      return { ...out, value: round(value), unit: "V", text: `${round(value, 1)} V` };
    }
    default: {
      const value = (clamped * def.scale) / def.max;
      return { ...out, value: round(value), unit: def.unit, text: `${round(value, 1)} ${def.unit}` };
    }
  }
}

// Values rigctld already scales (Hamlib levels): SWR ratio, PO watts, ALC 0-1, STRENGTH dB relative to S9.
function normalizeLevel(key, value) {
  const name = resolveKey(key);
  const empty = { key: name || String(key), raw: null, value: null, unit: null, fraction: null, text: "--", pending: false };
  if (!name || !Number.isFinite(value)) return empty;
  switch (name) {
    case "swr": return { ...empty, value: round(value), unit: "", fraction: clamp01((value - 1) / 4), text: `${round(value, 1)}:1` };
    case "po": return { ...empty, value: round(value, 1), unit: "W", text: `${Math.round(value)} W` };
    case "alc": return { ...empty, value: round(value * 100, 1), unit: "%", fraction: clamp01(value), text: `${Math.round(value * 100)} %` };
    case "smeter": case "smeter-sub": return { ...empty, value: round(value, 1), unit: "dB", text: `${value > 0 ? "+" : ""}${Math.round(value)} dB (S9)` };
    default: return empty;
  }
}

// Raw 0-255 value of a profile with its own cited scale (IC-705 CI-V 15 xx) -> same shape as normalizeMeter.
// Between the cited anchor points the value is a linear interpolation, not a calibration.
function normalizeProfileMeter(profile, key, raw) {
  const name = resolveKey(key);
  const def = name ? model.profiles?.[profile]?.meters?.[name] : null;
  if (!def) return { key: name || String(key), raw: null, value: null, unit: null, fraction: null, text: "--", pending: true };
  if (!Number.isFinite(raw) || raw < 0) return { key: name, raw: null, value: null, unit: def.unit, fraction: null, text: "--", pending: false };
  const clamped = Math.min(255, Math.round(raw));
  const out = { key: name, raw: clamped, value: null, unit: def.unit, fraction: clamp01(clamped / 255), text: "--", pending: false };
  if (name === "smeter" || name === "smeter-sub") {
    if (clamped <= def.s9raw) {
      const units = round((clamped * 9) / def.s9raw, 1);
      return { ...out, value: units, text: `S${Math.round(units)}`, over: 0 };
    }
    const [overRaw, overDb] = def.overPoint;
    const over = round(Math.min(overDb, ((clamped - def.s9raw) * overDb) / (overRaw - def.s9raw)), 1);
    return { ...out, value: 9, text: `S9+${over} dB`, over };
  }
  const last = def.points[def.points.length - 1];
  const value = round(lerp(def.points.slice(1), clamped, def.points[0]), 2);
  if (name === "swr" && clamped > last[0]) return { ...out, value: last[1], text: `>${last[1]}:1`, beyond: true };
  if (name === "alc") return { ...out, value: Math.min(last[1], value), text: `${Math.round(Math.min(last[1], value))} %` };
  const shown = name === "swr" ? `${value}:1` : `${round(value, 1)} ${def.unit}`;
  return { ...out, value, text: shown };
}

// One CI-V reply FE FE E0 <radio> 15 <sub> <BCD hi> <BCD lo> FD (IC-705 guide printed p.4, command 15) -> { key, raw }.
const CIV_METER_SUBS = Object.freeze({ 0x02: "smeter", 0x11: "po", 0x12: "swr", 0x13: "alc", 0x14: "comp", 0x15: "vdd", 0x16: "id" });
function parseCivMeterFrame(frame, radioAddress = 0xA4) {
  const bytes = Buffer.from(frame || []);
  if (bytes.length !== 9 || bytes[0] !== 0xfe || bytes[1] !== 0xfe || bytes[2] !== 0xe0 || bytes[3] !== radioAddress || bytes[4] !== 0x15 || bytes[8] !== 0xfd) return null;
  const key = CIV_METER_SUBS[bytes[5]];
  const digits = [bytes[6] >> 4, bytes[6] & 15, bytes[7] >> 4, bytes[7] & 15];
  if (!key || digits.some(digit => digit > 9)) return null;
  const raw = digits.reduce((sum, digit) => sum * 10 + digit, 0);
  return raw > 255 ? null : { key, raw };
}

// One CAT reply -> { key, raw, side } for RM P1 nnn 000 and SM P1 nnn; null for anything else.
function parseMeterFrame(reply) {
  const rm = /^RM([1-8])(\d{3})(\d{3});?$/.exec(reply || "");
  if (rm) return { key: RM_KEYS[rm[1]], raw: Math.min(255, Number(rm[2])), side: null };
  const sm = /^SM([01])(\d{3});?$/.exec(reply || "");
  if (sm) return { key: sm[1] === "0" ? "smeter" : "smeter-sub", raw: Math.min(255, Number(sm[2])), side: Number(sm[1]) };
  return null;
}

// PC P1 nnn -> { head, watts } (P1 1 field head, 2 SPA-1); null when the reply is not a PC answer.
function parsePowerFrame(reply) {
  const match = /^PC([12])(\d{3});?$/.exec(reply || "");
  return match ? { head: Number(match[1]), watts: Number(match[2]) } : null;
}

const TUNE_POWER_MAX_W = model.tune.maxPowerW;

// Tune is refused above TUNE_POWER_MAX_W; the operator lowers the power, it is never lowered automatically.
function tunePowerCheck(watts) {
  if (!Number.isFinite(watts)) return { ok: false, reason: "unknown", maxW: TUNE_POWER_MAX_W, watts: null };
  return watts > TUNE_POWER_MAX_W ? { ok: false, reason: "high", maxW: TUNE_POWER_MAX_W, watts } : { ok: true, reason: null, maxW: TUNE_POWER_MAX_W, watts };
}

const STATES = ["requested", "confirming", "tuning", "reading", "stopping", "verifying", "done"];
const OUTCOMES = ["success", "fail", "timeout", "unverified"];

// requested -> confirming -> tuning -> reading -> stopping -> verifying -> done. Methods return false and never throw
// when called out of order; the first cut/outcome wins so a later reset cannot erase a lost alert.
class TuneCheck {
  constructor({ kind = "internal", swrLimit = 3, maxSeconds = 30 } = {}) {
    this.kind = kind;
    this.swrLimit = swrLimit;
    this.maxSeconds = maxSeconds;
    this.state = "requested";
    this.outcome = null;
    this.reason = null;
    this.swr = null;
    this.txOff = null;
    this.seconds = 0;
    this.evidenced = null;
  }

  // Whether the radio showed it ran a tune (tuner busy bit seen). Never set = not judged (success as before);
  // false turns a would-be success into "unverified".
  evidence(seen) { this.evidenced = Boolean(seen); }

  confirming() { return this.#move("requested", "confirming"); }

  // Readback proved the radio entered tune.
  entered() { return this.#move("confirming", "tuning"); }

  // The radio never entered tune within the cap.
  notStarted() { return this.cut("fail", "not-started"); }

  tick(seconds) {
    if (this.state === "done") return false;
    this.seconds = seconds;
    return true;
  }

  // Abort or end for a reason (time cap, SWR trip, heartbeat, operator...). First outcome wins.
  cut(outcome, reason) {
    if (this.state === "done" || this.state === "stopping" || this.state === "verifying") return false;
    if (this.outcome || !OUTCOMES.includes(outcome) || outcome === "unverified") return false;
    this.outcome = outcome;
    this.reason = reason || "other";
    this.state = "reading";
    return true;
  }

  // Natural end of the tune (radio left tune by itself).
  finished() {
    if (this.state !== "tuning") return false;
    this.state = "reading";
    return true;
  }

  finalSwr(value) {
    if (this.state !== "reading" && this.state !== "stopping") return false;
    this.swr = typeof value === "number" && !Number.isNaN(value) ? value : null;
    return true;
  }

  stopping() { return this.#move("reading", "stopping"); }

  // Final step: TX-off confirmed by readback (true) or not (false).
  verified(txOff) {
    if (this.state !== "stopping" && this.state !== "verifying") return false;
    this.txOff = Boolean(txOff);
    if (!this.outcome) {
      const high = this.swr !== null && this.swr >= this.swrLimit;
      const unverified = !high && this.evidenced === false;
      this.outcome = high ? "fail" : unverified ? "unverified" : "success";
      this.reason = high ? "swr-high" : unverified ? "no-tune-evidence" : null;
    }
    if (!this.txOff && (this.outcome === "success" || this.outcome === "unverified")) { this.outcome = "fail"; this.reason = "tx-stuck"; }
    this.state = "done";
    return true;
  }

  result() {
    return { state: this.state, outcome: this.outcome, reason: this.reason, kind: this.kind, seconds: this.seconds, swr: this.swr, txOff: this.txOff };
  }

  #move(from, to) {
    if (this.state !== from) return false;
    this.state = to;
    return true;
  }
}

module.exports = {
  model, normalizeMeter, normalizeLevel, normalizeProfileMeter, parseCivMeterFrame, parseMeterFrame, parsePowerFrame, swrFromRaw, resolveKey,
  tunePowerCheck, TUNE_POWER_MAX_W, TuneCheck, STATES, OUTCOMES
};
