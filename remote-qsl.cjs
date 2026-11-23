"use strict";
// QSO book of the remote agent: QSO entry, ADIF import/export (rules of remote-log.cjs), optional QRZ.com XML lookup
// and LoTW upload through the operator's own local TQSL.
//
// Sources: the QRZ.com XML flow (login with username/password, session key, lookup by callsign, flat element names Key,
// Error, call, fname, name, addr2, state, country, grid) follows third_party/ftx1/Eugen68-Yaesu-FTX1-CAT-Control/.../QrzLookupHelper.java.
// The TQSL command line has no source in the repo (docs/REMOTE-CW-LOG.md): the operator configures the executable and the
// argument array in the agent config; nothing is invented here. This module never handles a certificate or its password.
//
// Credentials live only in the agent config (remote-agent.json, 0600). They never reach the browser, the logs or any
// response. QRZ.com requires them in its own request URL (HTTPS only), so request URLs are never logged or returned.

const childProcess = require("node:child_process");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const adif = require("./remote-log.cjs");

const QRZ_BASE_URL = "https://xmldata.qrz.com/xml/current/";
const QRZ_AGENT = "RadiCodex";
const QRZ_TIMEOUT_MS = 8000;
const QRZ_MAX_BYTES = 256 * 1024;
const QRZ_RATE_PER_MINUTE = 20;
const LOTW_TIMEOUT_MS = 120_000;
const LOTW_TIMEOUT_MAX_MS = 600_000;
const MAX_RECORDS = 50_000;
const LIST_LIMIT = 200;
const IMPORT_LIMIT_BYTES = adif.MAX_BYTES + 1024 * 1024;
const CALL_RE = /^[A-Z0-9/]{3,16}$/;
const GRID_RE = /^[A-R]{2}[0-9]{2}([A-X]{2}([0-9]{2})?)?$/i;
const FILE_PLACEHOLDER = "{file}";

class QslError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fixed = (status, message) => ({ status, body: { error: message } });

// Config sections. Both are off unless the operator fills them in the 0600 agent config file.
function normalizeQrzConfig(value) {
  const text = item => (typeof item === "string" && item.length > 0 && item.length <= 128 && !/[\0\r\n]/.test(item) ? item : "");
  const username = text(value?.username);
  const password = text(value?.password);
  return { enabled: value?.enabled === true && Boolean(username && password), username, password };
}

function normalizeLotwConfig(value) {
  const none = { configured: false, tqslPath: "", args: [], timeoutSeconds: LOTW_TIMEOUT_MS / 1000, timeoutMs: LOTW_TIMEOUT_MS };
  const tqslPath = typeof value?.tqslPath === "string" ? value.tqslPath : "";
  const args = Array.isArray(value?.args) ? value.args : null;
  if (!tqslPath || tqslPath.length > 1024 || /\0/.test(tqslPath) || !path.isAbsolute(tqslPath)) return none;
  if (!args || args.length > 32 || args.some(item => typeof item !== "string" || item.length > 512 || /\0/.test(item))) return none;
  if (!args.some(item => item.includes(FILE_PLACEHOLDER))) return none;
  const seconds = Number(value.timeoutSeconds);
  const timeoutMs = seconds > 0 ? Math.min(LOTW_TIMEOUT_MAX_MS, seconds * 1000) : LOTW_TIMEOUT_MS;
  return { configured: true, tqslPath, args: [...args], timeoutSeconds: timeoutMs / 1000, timeoutMs };
}

// Minimal flat reader, same idea as the sourced helper: element name -> last non-empty text. Entities are never expanded
// beyond the five predefined ones, so DOCTYPE/ENTITY tricks have no effect.
function parseQrzXml(text) {
  if (typeof text !== "string" || text.length > QRZ_MAX_BYTES) throw new QslError(502, "QRZ.com ha devuelto una respuesta no valida.");
  const decode = raw => raw.replace(/&(lt|gt|quot|apos|amp);/g, (_, name) => ({ lt: "<", gt: ">", quot: "\"", apos: "'", amp: "&" })[name]);
  const out = {};
  for (const match of text.matchAll(/<([A-Za-z][A-Za-z0-9_]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g)) {
    const value = decode(match[2]).trim();
    if (value) out[match[1]] = value;
  }
  if (!("Key" in out) && !("Error" in out) && !("call" in out)) throw new QslError(502, "QRZ.com ha devuelto una respuesta no valida.");
  return out;
}

// Default transport: HTTPS only, no redirects, hard deadline and size cap. Resolves { status, body }.
function httpsGet(url, { timeoutMs = QRZ_TIMEOUT_MS, maxBytes = QRZ_MAX_BYTES, lib = https } = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try { target = new URL(url); } catch { reject(new QslError(502, "No se puede contactar con QRZ.com.")); return; }
    if (target.protocol !== "https:") { reject(new QslError(502, "Solo se permite HTTPS.")); return; }
    let done = false;
    let timer;
    const finish = (fn, value) => { if (!done) { done = true; clearTimeout(timer); fn(value); } };
    const request = lib.get(target, { headers: { "User-Agent": QRZ_AGENT } }, response => {
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > maxBytes) { request.destroy(); finish(reject, new QslError(502, "QRZ.com ha devuelto una respuesta no valida.")); return; }
        chunks.push(chunk);
      });
      response.on("end", () => finish(resolve, { status: response.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", () => finish(reject, new QslError(502, "No se puede contactar con QRZ.com.")));
    });
    timer = setTimeout(() => { request.destroy(); finish(reject, Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })); }, timeoutMs);
    request.on("error", () => finish(reject, new QslError(502, "No se puede contactar con QRZ.com.")));
  });
}

function withDeadline(promise, ms, setTimer, clearTimer) {
  let timer;
  const deadline = new Promise((_, reject) => { timer = setTimer(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), ms); });
  return Promise.race([promise, deadline]).finally(() => clearTimer(timer));
}

// QRZ.com XML lookup. The session key stays inside this closure; callers only get the lookup fields.
function createQrzClient({ username, password, request = httpsGet, timeoutMs = QRZ_TIMEOUT_MS, baseUrl = QRZ_BASE_URL, setTimer = setTimeout, clearTimer = clearTimeout }) {
  if (new URL(baseUrl).protocol !== "https:") throw new Error("QRZ.com solo por HTTPS.");
  let sessionKey = "";
  const enc = encodeURIComponent;

  async function fetchXml(url) {
    let reply;
    try { reply = await withDeadline(Promise.resolve(request(url, { timeoutMs })), timeoutMs, setTimer, clearTimer); }
    catch (error) {
      if (error instanceof QslError) throw error;
      throw error?.code === "ETIMEDOUT" ? new QslError(504, "QRZ.com no ha respondido a tiempo.") : new QslError(502, "No se puede contactar con QRZ.com.");
    }
    if (reply?.status !== 200) throw new QslError(502, "No se puede contactar con QRZ.com.");
    return parseQrzXml(reply.body);
  }

  async function login() {
    const reply = await fetchXml(`${baseUrl}?username=${enc(username)};password=${enc(password)};agent=${QRZ_AGENT}`);
    if (reply.Error || !reply.Key) throw new QslError(502, "QRZ.com ha rechazado las credenciales.");
    sessionKey = reply.Key;
  }

  const query = call => fetchXml(`${baseUrl}?s=${enc(sessionKey)};callsign=${enc(call)}`);

  return {
    async lookup(callsign) {
      const call = String(callsign || "").trim().toUpperCase();
      if (!CALL_RE.test(call)) throw new QslError(400, "Indicativo no valido.");
      if (!sessionKey) await login();
      let reply = await query(call);
      // An expired session returns no Key: log in once more and retry once.
      if (!reply.Key) { await login(); reply = await query(call); }
      if (reply.Error) throw new QslError(/not found/i.test(reply.Error) ? 404 : 502, /not found/i.test(reply.Error) ? "Indicativo no encontrado en QRZ.com." : "QRZ.com ha devuelto un error.");
      return {
        call: reply.call || call, fname: reply.fname || "", name: reply.name || "", qth: reply.addr2 || "",
        state: reply.state || "", country: reply.country || "", grid: reply.grid || ""
      };
    }
  };
}

// Runs the operator's TQSL: argument array, no shell, no stdin (so a prompt can never be fed), output discarded.
function runProcess(command, args, { spawn = childProcess.spawn, timeoutMs = LOTW_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn(command, args, { shell: false, stdio: "ignore", windowsHide: true }); }
    catch { reject(new QslError(502, "No se puede ejecutar TQSL.")); return; }
    let timedOut = false;
    let settled = false;
    const timer = setTimer(() => { timedOut = true; try { child.kill(); } catch { /* already gone */ } }, timeoutMs);
    const finish = (fn, value) => { if (!settled) { settled = true; clearTimer(timer); fn(value); } };
    child.on("error", () => finish(reject, new QslError(502, "No se puede ejecutar TQSL.")));
    child.on("close", (code, signal) => finish(resolve, { code, signal, timedOut }));
  });
}

const normalizeText = (value, max) => {
  const text = String(value ?? "").trim();
  return /^[\x20-\x7e]*$/.test(text) && text.length <= max ? text : null;
};

// Validates one manually entered QSO. Returns { contact } or { error }.
function normalizeContact(body, nowMs) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Cuerpo no valido." };
  const call = String(body.call ?? "").trim().toUpperCase();
  if (!CALL_RE.test(call)) return { error: "Indicativo no valido." };
  const when = body.utc === undefined || body.utc === "" ? new Date(nowMs) : new Date(String(body.utc));
  if (Number.isNaN(when.getTime())) return { error: "Fecha UTC no valida." };
  const freq = String(body.frequencyMHz ?? "").trim();
  if (!/^[0-9]{1,5}(\.[0-9]{1,6})?$/.test(freq) || !(Number(freq) > 0)) return { error: "Frecuencia no valida (MHz)." };
  const mode = String(body.mode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,12}$/.test(mode)) return { error: "Modo no valido." };
  const report = value => String(value ?? "").trim();
  const sent = report(body.sent);
  const received = report(body.received);
  if (!/^[A-Za-z0-9+-]{1,6}$/.test(sent) || !/^[A-Za-z0-9+-]{1,6}$/.test(received)) return { error: "Control RST no valido." };
  const notes = normalizeText(body.notes, 200);
  if (notes === null) return { error: "Las notas solo admiten ASCII (200 caracteres)." };
  const contact = { call, utc: when.toISOString(), frequencyMHz: freq, mode, sent, received, notes };
  for (const key of ["state", "country"]) {
    const value = normalizeText(body[key], 40);
    if (value === null) return { error: "Texto no valido." };
    if (value) contact[key] = value;
  }
  const grid = String(body.gridsquare ?? "").trim();
  if (grid) {
    if (!GRID_RE.test(grid)) return { error: "Locator no valido." };
    contact.gridsquare = grid.toUpperCase();
  }
  return { contact };
}

// ADIF carries whole seconds, so the comparison ignores milliseconds on manually entered times.
const utcSecond = value => String(value).slice(0, 19);
const sameQso = (a, b) => a.call === b.call && utcSecond(a.utc) === utcSecond(b.utc) && Number(a.frequencyMHz) === Number(b.frequencyMHz) && a.mode === b.mode;

// File-backed QSO book. Writes are atomic (temp file + rename) and 0600 like the rest of the agent config.
function createQsoStore({ dir, fsImpl = fs }) {
  const file = path.join(dir, "qso-log.json");
  let contacts = [];
  if (fsImpl.existsSync(file)) {
    try {
      const stored = JSON.parse(fsImpl.readFileSync(file, "utf8"));
      if (Array.isArray(stored?.contacts)) contacts = stored.contacts.filter(item => item && typeof item === "object" && CALL_RE.test(String(item.call)));
    } catch { throw new Error(`Libro de QSO corrupto: ${file}`); }
  }
  let nextId = contacts.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

  function save() {
    fsImpl.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const temp = `${file}.tmp`;
    fsImpl.writeFileSync(temp, `${JSON.stringify({ version: 1, contacts })}\n`, { mode: 0o600 });
    fsImpl.renameSync(temp, file);
  }

  return {
    all: () => contacts,
    add(contact) {
      if (contacts.length >= MAX_RECORDS) throw new QslError(413, "El libro de QSO esta lleno.");
      const dupe = adif.findDupe(contact, contacts);
      const stored = { id: nextId, ...contact };
      nextId += 1;
      contacts.push(stored);
      save();
      return { contact: stored, dupe: dupe ? { id: dupe.id, utc: dupe.utc } : null };
    },
    // Imports parsed ADIF contacts, skipping those already in the book (same call, UTC, frequency and mode).
    import(parsed) {
      let added = 0;
      let skipped = 0;
      for (const item of parsed) {
        if (contacts.some(other => sameQso(other, item))) { skipped += 1; continue; }
        if (contacts.length >= MAX_RECORDS) throw new QslError(413, "El libro de QSO esta lleno.");
        contacts.push({ id: nextId, ...item });
        nextId += 1;
        added += 1;
      }
      if (added) save();
      return { added, skipped };
    },
    markLotwSent(ids, atIso) {
      const wanted = new Set(ids);
      for (const item of contacts) if (wanted.has(item.id)) item.lotwSentAt = atIso;
      save();
    }
  };
}

// The agent-facing service. Every method returns { status, body } (export adds headers); none throws for operator errors.
function createQslService({
  dir, config = {}, now = Date.now, log = () => {}, request = httpsGet, spawn = childProcess.spawn,
  fsImpl = fs, tmpdir = os.tmpdir, setTimer = setTimeout, clearTimer = clearTimeout
}) {
  const store = createQsoStore({ dir, fsImpl });
  const qrz = config.qrz?.enabled ? createQrzClient({ username: config.qrz.username, password: config.qrz.password, request, setTimer, clearTimer }) : null;
  const lotw = config.lotw?.configured ? config.lotw : null;
  const lookups = [];
  let uploading = false;

  const wrap = async work => {
    try { return await work(); }
    catch (error) {
      if (error instanceof QslError) return fixed(error.status, error.message);
      return fixed(500, "Error interno.");
    }
  };

  const view = () => {
    const ordered = [...store.all()].sort((a, b) => (a.utc < b.utc ? 1 : a.utc > b.utc ? -1 : b.id - a.id));
    return {
      contacts: ordered.slice(0, LIST_LIMIT), total: ordered.length, progress: adif.progress(ordered),
      pendingLotw: ordered.filter(item => !item.lotwSentAt).length,
      qrz: { enabled: Boolean(qrz) }, lotw: { configured: Boolean(lotw) }
    };
  };

  return {
    list: () => ({ status: 200, body: view() }),
    add: body => wrap(() => {
      const checked = normalizeContact(body, now());
      if (checked.error) return fixed(400, checked.error);
      const result = store.add(checked.contact);
      return { status: 201, body: result };
    }),
    importAdif: body => wrap(() => {
      if (typeof body?.adif !== "string" || !body.adif) return fixed(400, "Falta el texto ADIF.");
      let parsed;
      try { parsed = adif.parseAdif(body.adif); }
      catch (error) { return fixed(400, error.message); }
      return { status: 200, body: { ...store.import(parsed.contacts), ignoredFields: parsed.ignoredFields } };
    }),
    exportAdif: () => wrap(() => {
      const text = adif.exportAdif(store.all(), { stationCall: config.callsign || "" });
      return { status: 200, body: text, headers: { "Content-Type": "text/plain; charset=us-ascii", "Content-Disposition": 'attachment; filename="radicodex.adi"' } };
    }),
    lookup: callsign => wrap(async () => {
      if (!qrz) return fixed(403, "La consulta QRZ.com esta desactivada (accion explicita del operador).");
      const time = now();
      while (lookups.length && time - lookups[0] >= 60_000) lookups.shift();
      if (lookups.length >= QRZ_RATE_PER_MINUTE) return fixed(429, "Demasiadas consultas.");
      lookups.push(time);
      const result = await qrz.lookup(callsign);
      log("[qsl] consulta QRZ.com completada");
      return { status: 200, body: result };
    }),
    // Needs { confirm: true } from an explicit click; uploads only the QSOs not sent before. Exit code 0 is taken as sent.
    uploadLotw: body => wrap(async () => {
      if (!lotw) return fixed(403, "La subida a LoTW esta desactivada: configura TQSL y sus argumentos en el agente (pendiente de fuente).");
      if (body?.confirm !== true) return fixed(400, "Confirma la subida a LoTW.");
      if (uploading) return fixed(409, "Ya hay una subida a LoTW en curso.");
      const pending = store.all().filter(item => !item.lotwSentAt);
      if (!pending.length) return fixed(409, "No hay contactos pendientes de subir.");
      uploading = true;
      let folder = "";
      try {
        folder = fsImpl.mkdtempSync(path.join(tmpdir(), "radicodex-lotw-"));
        const target = path.join(folder, "upload.adi");
        fsImpl.writeFileSync(target, adif.exportAdif(pending, { stationCall: config.callsign || "" }), { mode: 0o600 });
        const args = lotw.args.map(item => item.split(FILE_PLACEHOLDER).join(target));
        const result = await runProcess(lotw.tqslPath, args, { spawn, timeoutMs: lotw.timeoutMs, setTimer, clearTimer });
        if (result.timedOut) return fixed(504, "TQSL no ha terminado a tiempo.");
        if (result.code !== 0) return { status: 502, body: { error: "TQSL ha terminado con error.", code: result.code } };
        store.markLotwSent(pending.map(item => item.id), new Date(now()).toISOString());
        log(`[qsl] TQSL termino correctamente (${pending.length} QSO)`);
        return { status: 200, body: { ok: true, uploaded: pending.length } };
      } finally {
        uploading = false;
        if (folder) try { fsImpl.rmSync(folder, { recursive: true, force: true }); } catch { /* temp folder cleanup is best effort */ }
      }
    })
  };
}

module.exports = {
  createQslService, createQsoStore, createQrzClient, normalizeQrzConfig, normalizeLotwConfig, normalizeContact, parseQrzXml, runProcess, httpsGet,
  QslError, IMPORT_LIMIT_BYTES, QRZ_BASE_URL
};
