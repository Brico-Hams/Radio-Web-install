"use strict";
// Remote-operation layer shared by the Node remote shack: guests with per-radio permissions, TX band/power limits,
// TX log with CSV export, sourced power commands, public "listen live" gate, signed update check and a multi-radio registry.
// Pure logic with injected clocks/IO so every piece is deterministic in tests. Nothing here keys a transmitter.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// IARU Region 1 band edges, the same table remote-ui.js uses for its band buttons (lo/hi in Hz).
const BAND_PLAN = Object.freeze({
  "160m": [1_810_000, 2_000_000], "80m": [3_500_000, 3_800_000], "60m": [5_250_000, 5_450_000],
  "40m": [7_000_000, 7_200_000], "30m": [10_100_000, 10_150_000], "20m": [14_000_000, 14_350_000],
  "17m": [18_068_000, 18_168_000], "15m": [21_000_000, 21_450_000], "12m": [24_890_000, 24_990_000],
  "10m": [28_000_000, 29_700_000], "6m": [50_000_000, 52_000_000], "2m": [144_000_000, 146_000_000],
  "70cm": [430_000_000, 440_000_000]
});

function bandOf(freq) {
  if (!Number.isFinite(freq)) return "";
  for (const [name, [lo, hi]] of Object.entries(BAND_PLAN)) if (freq >= lo && freq <= hi) return name;
  return "";
}

// Accepts band names from BAND_PLAN or explicit { name, minHz, maxHz } ranges; returns normalized ranges or null.
function normalizeBands(list) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list) || list.length > 32) return null;
  const out = [];
  for (const item of list) {
    if (typeof item === "string" && Object.hasOwn(BAND_PLAN, item)) {
      out.push({ name: item, minHz: BAND_PLAN[item][0], maxHz: BAND_PLAN[item][1] });
    } else if (item && typeof item === "object" && Number.isSafeInteger(item.minHz) && Number.isSafeInteger(item.maxHz) &&
      item.minHz > 0 && item.maxHz >= item.minHz && typeof item.name === "string" && /^[\w .-]{1,16}$/.test(item.name)) {
      out.push({ name: item.name, minHz: item.minHz, maxHz: item.maxHz });
    } else return null;
  }
  return out;
}

const sha256hex = value => crypto.createHash("sha256").update(value).digest("hex");
const safeEqualHex = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));

// ---- guests ----
// permissions[radioId] = { transmit, bands: [{name,minHz,maxHz}] (empty = no band restriction), maxPowerW: number|null }.
const GUEST_ID = /^g[0-9a-f]{12}$/;
const INVITE_MAX_HOURS = 24 * 90;

function createGuestStore({ dir, now = Date.now, randomBytes = crypto.randomBytes } = {}) {
  const file = dir ? path.join(dir, "remote-guests.json") : null;
  let guests = [];
  if (file && fs.existsSync(file)) {
    try { guests = JSON.parse(fs.readFileSync(file, "utf8")).guests || []; } catch { throw new Error(`Invitados corruptos: ${file}`); }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, `${JSON.stringify({ guests }, null, 2)}\n`, { mode: 0o600 });
    try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
  };
  const view = guest => ({
    id: guest.id, label: guest.label, permissions: guest.permissions, createdAt: guest.createdAt,
    expiresAt: guest.expiresAt, revokedAt: guest.revokedAt || null, active: isActive(guest)
  });
  function isActive(guest) { return Boolean(guest) && !guest.revokedAt && now() < guest.expiresAt; }

  // Returns { error } or { guest, token }; the token is only ever shown here, the store keeps its SHA-256.
  function invite({ label, permissions, ttlHours = 24 } = {}) {
    if (typeof label !== "string" || !/^[\w .@-]{1,40}$/.test(label)) return { error: "Nombre de invitado no valido." };
    if (!Number.isFinite(ttlHours) || ttlHours <= 0 || ttlHours > INVITE_MAX_HOURS) return { error: "Caducidad no valida." };
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions) || !Object.keys(permissions).length) {
      return { error: "El invitado necesita al menos una radio." };
    }
    const normalized = {};
    for (const [radioId, perm] of Object.entries(permissions)) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(radioId) || !perm || typeof perm.transmit !== "boolean") return { error: "Permiso de radio no valido." };
      const bands = normalizeBands(perm.bands);
      if (!bands) return { error: "Bandas no validas." };
      const maxPowerW = perm.maxPowerW === undefined || perm.maxPowerW === null ? null : perm.maxPowerW;
      if (maxPowerW !== null && (!Number.isFinite(maxPowerW) || maxPowerW <= 0 || maxPowerW > 10_000)) return { error: "Potencia maxima no valida." };
      normalized[radioId] = { transmit: perm.transmit, bands, maxPowerW };
    }
    const token = `g_${randomBytes(32).toString("base64url")}`;
    const guest = {
      id: `g${randomBytes(6).toString("hex")}`, label, permissions: normalized, tokenHash: sha256hex(token),
      createdAt: now(), expiresAt: now() + ttlHours * 3_600_000, revokedAt: null
    };
    guests.push(guest);
    save();
    return { guest: view(guest), token };
  }

  function authenticate(token) {
    if (typeof token !== "string" || !token.startsWith("g_") || token.length > 128) return null;
    const hash = sha256hex(token);
    let found = null;
    for (const guest of guests) if (safeEqualHex(guest.tokenHash, hash)) found = guest;
    return isActive(found) ? found : null;
  }

  function revoke(id) {
    const guest = typeof id === "string" && GUEST_ID.test(id) ? guests.find(item => item.id === id) : null;
    if (!guest) return false;
    if (!guest.revokedAt) { guest.revokedAt = now(); save(); }
    return true;
  }

  return {
    invite, authenticate, revoke, get: id => guests.find(guest => guest.id === id) || null,
    isActiveId: id => isActive(guests.find(guest => guest.id === id)), list: () => guests.map(view)
  };
}

// ---- TX policy for guests (enforced by the agent, not only by the UI) ----
// Commands a listen-only guest may send: retune the receiver and its audio/NB/NR, never TX, ATU carrier or RF power.
const LISTEN_COMMANDS = new Set(["freq", "mode", "step", "vfo", "split", "level", "func"]);

function guestCommandRefusal(perm, command) {
  if (!perm) return "Sin permiso en esta radio.";
  if (command.cmd === "ptt" && command.value === false) return null;
  if (perm.transmit) return null;
  if (!LISTEN_COMMANDS.has(command.cmd)) return "Invitado solo escucha: sin TX.";
  if (command.cmd === "level" && command.name === "RFPOWER") return "Invitado solo escucha: sin potencia.";
  if (command.cmd === "func" && command.name === "TUNER") return "Invitado solo escucha: sin sintonizador.";
  return null;
}

// RFPOWER is a 0..1 fraction of the rig's maximum, so a watt limit needs the operator-declared rig maximum.
function powerCapFraction(perm, rigMaxW) {
  if (!perm || perm.maxPowerW === null) return 1;
  if (!Number.isFinite(rigMaxW) || rigMaxW <= 0) return null;
  return Math.min(1, perm.maxPowerW / rigMaxW);
}

// Returns null when keying is allowed, otherwise the reason. Unknown frequency/power with a limit set means refuse.
function guestTxRefusal(perm, { freq, rfpower, rigMaxW }) {
  if (!perm?.transmit) return "Invitado sin permiso de TX.";
  if (perm.bands.length) {
    if (!Number.isFinite(freq)) return "Frecuencia desconocida: TX no permitido.";
    if (!perm.bands.some(band => freq >= band.minHz && freq <= band.maxHz)) return "Frecuencia fuera de las bandas permitidas al invitado.";
  }
  const cap = powerCapFraction(perm, rigMaxW);
  if (cap === null) return "Limite de potencia sin potencia maxima de la radio: TX no permitido.";
  if (perm.maxPowerW !== null) {
    if (!Number.isFinite(rfpower)) return "Potencia desconocida: TX no permitido.";
    if (rfpower > cap + 1e-9) return `Potencia por encima del limite del invitado (${perm.maxPowerW} W).`;
  }
  return null;
}

// ---- TX log ----
const CSV_COLUMNS = Object.freeze(["start", "end", "duration_s", "operator", "radio", "band", "freq_hz", "power_pct", "power_w", "location"]);
// Cells starting with = + - @ are neutralised so a spreadsheet never evaluates an operator-chosen label.
const csvCell = value => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function createTxLog({ file = null, now = Date.now, maxEntries = 5000 } = {}) {
  let entries = [];
  if (file && fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line) continue;
      try { entries.push(JSON.parse(line)); } catch { /* skip a torn last line */ }
    }
    entries = entries.slice(-maxEntries);
  }
  let open = null;

  // location is only kept when the client shared it explicitly: { lat, lon } rounded to ~1 km.
  function begin({ operator, radio, freq, powerPct = null, powerW = null, location = null }) {
    if (open) end();
    const loc = location && Number.isFinite(location.lat) && Number.isFinite(location.lon) &&
      Math.abs(location.lat) <= 90 && Math.abs(location.lon) <= 180
      ? { lat: Math.round(location.lat * 100) / 100, lon: Math.round(location.lon * 100) / 100 } : null;
    open = { startMs: now(), operator: String(operator || "local"), radio: String(radio || ""), freq: Number.isFinite(freq) ? freq : null, powerPct, powerW, location: loc };
  }

  function end() {
    if (!open) return null;
    const endMs = now();
    const entry = {
      start: new Date(open.startMs).toISOString(), end: new Date(endMs).toISOString(),
      durationS: Math.max(0, Math.round((endMs - open.startMs) / 1000)),
      operator: open.operator, radio: open.radio, band: bandOf(open.freq), freq: open.freq,
      powerPct: open.powerPct, powerW: open.powerW, location: open.location
    };
    open = null;
    entries.push(entry);
    if (entries.length > maxEntries) entries = entries.slice(-maxEntries);
    if (file) {
      try { fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 }); fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 }); } catch { /* the log must never block un-keying */ }
    }
    return entry;
  }

  function toCsv() {
    const rows = entries.map(entry => [
      entry.start, entry.end, entry.durationS, entry.operator, entry.radio, entry.band, entry.freq,
      entry.powerPct === null ? "" : Math.round(entry.powerPct * 100), entry.powerW,
      entry.location ? `${entry.location.lat},${entry.location.lon}` : ""
    ].map(csvCell).join(","));
    return `${[CSV_COLUMNS.join(","), ...rows].join("\r\n")}\r\n`;
  }

  return { begin, end, entries: () => entries.slice(), toCsv, isOpen: () => open !== null };
}

// ---- power on/off: only commands with a source in this repo ----
// off: raw Yaesu CAT "PS0" for the FTX-1 (docs/FTX1-KNOWLEDGE.md, PS row, [rigplane-rigplane-core:rigs/ftx1.toml]).
// No power-ON command is sourced for any radio (a powered-off CAT port cannot be written to), so on is always "pendiente de fuente".
// Icom 18 01 (CI-V) and Kenwood/Yaesu PS on other models: pendiente de fuente until a page of the CI-V guide / manual is cited here.
const POWER_COMMANDS = Object.freeze({
  "yaesu-ftx-1": Object.freeze({ off: "PS0", on: null, source: "docs/FTX1-KNOWLEDGE.md PS row" })
});

function powerSupport(radioId) {
  const entry = Object.hasOwn(POWER_COMMANDS, radioId) ? POWER_COMMANDS[radioId] : null;
  return { off: Boolean(entry?.off), on: Boolean(entry?.on), source: entry?.source || "pendiente de fuente" };
}

// ---- public "listen live" gate: read-only, off by default, rate limited ----
function createListenGate({ enabled = false, maxClients = 4, perIpPerMinute = 6, now = Date.now } = {}) {
  const attempts = new Map();
  let clients = 0;
  const perIp = new Map();
  function admit(ip) {
    if (!enabled) return { ok: false, reason: "disabled" };
    const time = now();
    const recent = (attempts.get(ip) || []).filter(at => time - at < 60_000);
    if (recent.length >= perIpPerMinute) { attempts.set(ip, recent); return { ok: false, reason: "rate" }; }
    if (clients >= maxClients || (perIp.get(ip) || 0) >= 2) return { ok: false, reason: "busy" };
    recent.push(time);
    attempts.set(ip, recent);
    if (attempts.size > 1024) for (const [key, list] of attempts) if (!list.some(at => time - at < 60_000)) attempts.delete(key);
    clients += 1;
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    let released = false;
    return { ok: true, release() {
      if (released) return;
      released = true;
      clients -= 1;
      const left = (perIp.get(ip) || 1) - 1;
      if (left > 0) perIp.set(ip, left); else perIp.delete(ip);
    } };
  }
  return { admit, enabled, clients: () => clients };
}

// ---- multi-radio registry: per-radio lease and TX exclusivity ----
function createRadioRegistry({ now = Date.now, leaseMs = 30_000 } = {}) {
  const radios = new Map();
  return {
    add(id, info = {}) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || radios.has(id)) throw new Error(`Radio no valida o duplicada: ${id}`);
      radios.set(id, { id, label: info.label || id, maker: info.maker || "", model: info.model || "", owner: null, seen: 0, txBy: null });
    },
    list: () => [...radios.values()].map(r => ({ id: r.id, label: r.label, maker: r.maker, model: r.model, busy: r.owner !== null && now() - r.seen < leaseMs, transmitting: r.txBy !== null })),
    has: id => radios.has(id),
    // Control lease per radio: one operator at a time, independent between radios.
    claim(id, client) {
      const r = radios.get(id);
      if (!r) return false;
      if (r.owner !== null && r.owner !== client && now() - r.seen < leaseMs) return false;
      r.owner = client;
      r.seen = now();
      return true;
    },
    // Only the lease holder may key, and only one transmission per radio; other radios are unaffected.
    beginTx(id, client) {
      const r = radios.get(id);
      if (!r || r.owner !== client || now() - r.seen >= leaseMs || r.txBy !== null) return false;
      r.txBy = client;
      return true;
    },
    endTx(id) { const r = radios.get(id); if (r) r.txBy = null; },
    // Safe state when a client disconnects: drop its lease and any keyed state.
    release(id, client) {
      const r = radios.get(id);
      if (r && r.owner === client) { r.owner = null; r.txBy = null; }
    }
  };
}

// ---- signed update check (GitHub releases only; never installs) ----
const UPDATE_REPO = "Brico-Hams/Radio-Web-install";
const UPDATE_HOSTS = Object.freeze(["api.github.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
const semver = text => { const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(text)); return m ? m.slice(1).map(Number) : null; };
function isNewer(candidate, current) {
  const a = semver(candidate), b = semver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
const allowedUrl = value => {
  try { const url = new URL(value); return url.protocol === "https:" && UPDATE_HOSTS.includes(url.hostname); } catch { return false; }
};

// fetchJson/fetchBytes are injected (global fetch in production). Verifies SHA256SUMS + Ed25519 signatures with firmware-signature.js.
async function checkForUpdate({ currentVersion, assetName, fetchJson, fetchBytes, subtle = crypto.webcrypto.subtle, publicKeyHex, saveDir }) {
  if (typeof assetName !== "string" || !/^[\w.-]{1,80}$/.test(assetName)) return { status: "unconfigured" };
  const release = await fetchJson(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`);
  if (!release || release.draft || release.prerelease || !isNewer(release.tag_name, currentVersion)) return { status: "current" };
  const assets = new Map((release.assets || []).map(asset => [asset.name, asset.browser_download_url]));
  const wanted = [assetName, `${assetName}.sig`, "SHA256SUMS", "SHA256SUMS.sig"];
  if (!wanted.every(name => allowedUrl(assets.get(name)))) return { status: "unsigned", version: release.tag_name };
  const [bytes, fileSig, sums, sumsSig] = await Promise.all(wanted.map(name => fetchBytes(assets.get(name))));
  const FirmwareSignature = require("./firmware-signature.js");
  const options = { subtle, publicKeyHex: publicKeyHex ?? FirmwareSignature.PUBLIC_KEY_HEX };
  if (!options.publicKeyHex) return { status: "unsigned", version: release.tag_name };
  const verdict = await FirmwareSignature.verifyFirmware(assetName, new Uint8Array(bytes), {
    sumsText: Buffer.from(sums).toString("utf8"), sumsSig: Buffer.from(sumsSig).toString("utf8"), fileSig: Buffer.from(fileSig).toString("utf8")
  }, options);
  if (verdict.status !== "verified") return { status: "unsigned", version: release.tag_name };
  fs.mkdirSync(saveDir, { recursive: true, mode: 0o700 });
  const target = path.join(saveDir, `${release.tag_name}-${assetName}`);
  fs.writeFileSync(target, Buffer.from(bytes), { mode: 0o600 });
  return { status: "downloaded", version: release.tag_name, file: target, sha256: sha256hex(Buffer.from(bytes)) };
}

module.exports = {
  BAND_PLAN, bandOf, normalizeBands, createGuestStore, guestCommandRefusal, guestTxRefusal, powerCapFraction,
  createTxLog, CSV_COLUMNS, POWER_COMMANDS, powerSupport, createListenGate, createRadioRegistry,
  checkForUpdate, isNewer, UPDATE_HOSTS
};
