"use strict";
// Remote shack agent: runs next to the radio, controls it through Hamlib rigctld and exposes a small
// token-protected HTTP/SSE API plus the browser console (remote.html). Separate from server.cjs on purpose:
// the local workspace server stays 127.0.0.1-only.
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const tlsLib = require("node:tls");
const { RigctldClient, VFO_NAMES } = require("./rigctld-client.cjs");
const remoteTls = require("./remote-tls.cjs");

const SDR_PREFIX = "/sdr/";
const SESSION_COOKIE = "rs_session";
const SESSION_MS = 12 * 3600 * 1000;
const HOP_BY_HOP = Object.freeze(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const isLoopbackHost = value => value === "localhost" || value === "::1" || /^127\./.test(value);

const MODES = Object.freeze(["USB", "LSB", "CW", "CWR", "AM", "FM", "WFM", "RTTY", "PKTUSB", "PKTLSB", "PKTFM"]);
// Level kinds: unit = 0..1 float, steps = 0 (off) or one of the rig's own values, enum = Hamlib AGC enum.
const LEVELS = Object.freeze({
  AF: { key: "af", kind: "unit" }, RF: { key: "rf", kind: "unit" }, RFPOWER: { key: "rfpower", kind: "unit" },
  PREAMP: { key: "preamp", kind: "steps" }, ATT: { key: "att", kind: "steps" }, AGC: { key: "agc", kind: "enum" }
});
const FUNCS = Object.freeze({ NB: "nb", NR: "nr", TUNER: "tuner" });
const AGC_MAX = 6;
const PASSBAND_MAX = 50_000;
const FREQ_MIN = 30_000;
const FREQ_MAX = 3_000_000_000;
const STEP_MAX = 1_000_000;
const BODY_LIMIT = 4096;
const CMD_RATE_LIMIT = 20;
const HEARTBEAT_TIMEOUT_MS = 1000;
const SLOW_POLL_MS = 10000;
const CONTROL_IDLE_MS = 30_000;
const STATIC_FILES = Object.freeze({
  "/": ["remote.html", "text/html; charset=utf-8"],
  "/remote.html": ["remote.html", "text/html; charset=utf-8"],
  "/remote-ui.js": ["remote-ui.js", "text/javascript; charset=utf-8"],
  "/remote.css": ["remote.css", "text/css; charset=utf-8"],
  "/bricohams-logo.png": ["bricohams-logo.png", "image/png"],
  "/ui-i18n.js": ["ui-i18n.js", "text/javascript; charset=utf-8"],
  "/ui-translations.js": ["ui-translations.js", "text/javascript; charset=utf-8"]
});

const defaultConfigDir = () => path.join(os.homedir(), ".radicodex");

function normalizeOpenwebrx(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function loadConfig(dir) {
  const file = path.join(dir, "remote-agent.json");
  let stored = {};
  if (fs.existsSync(file)) {
    try { stored = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { throw new Error(`Configuracion corrupta: ${file}`); }
  }
  const config = {
    token: typeof stored.token === "string" && stored.token.length >= 32 ? stored.token : "",
    openwebrxUrl: typeof stored.openwebrxUrl === "string" ? stored.openwebrxUrl : "",
    openwebrxSpanHz: Number.isInteger(stored.openwebrxSpanHz) && stored.openwebrxSpanHz > 0 ? stored.openwebrxSpanHz : 0,
    callsign: typeof stored.callsign === "string" && /^[A-Za-z0-9/]{3,16}$/.test(stored.callsign) ? stored.callsign.toUpperCase() : "",
    rigctldHost: typeof stored.rigctldHost === "string" ? stored.rigctldHost : "127.0.0.1",
    rigctldPort: Number.isInteger(stored.rigctldPort) ? stored.rigctldPort : 4532,
    txLimitSeconds: Number(stored.txLimitSeconds) > 0 ? Number(stored.txLimitSeconds) : 180,
    relay: normalizeRelay(stored.relay)
  };
  if (!config.token) {
    config.token = crypto.randomBytes(32).toString("base64url");
    writeConfig(dir, config);
  }
  return config;
}

function writeConfig(dir, config) {
  const file = path.join(dir, "remote-agent.json");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
}

// Returns { url, station, secret } or null. https is required unless the relay is on loopback (tests, local setups).
function normalizeRelay(value) {
  if (!value || typeof value !== "object") return null;
  let url;
  try { url = new URL(String(value.url)); } catch { return null; }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const allowed = url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(hostname));
  if (!allowed || !RELAY_STATION.test(String(value.station)) || typeof value.secret !== "string" || !value.secret) return null;
  return { url: url.href.replace(/\/+$/, ""), station: String(value.station), secret: value.secret };
}

// Only a remote client's tunnel may set the prefix; the relay overwrites any client-supplied X-Forwarded-* header.
const PREFIX_PATTERN = /^(?:\/[A-Za-z0-9._~-]+)+$/;
const RELAY_STATION = /^[a-z0-9-]{3,32}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const RELAY_UPGRADE = "radicodex-tunnel/1";

function tokenMatches(expected, supplied) {
  if (typeof supplied !== "string" || !supplied) return false;
  const digest = value => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(expected), digest(supplied));
}

function csp(openwebrxUrl) {
  // With a configured OpenWebRX only the proxy and its origin may be framed; without one the manual URL field needs http(s).
  const frame = openwebrxUrl ? `'self' ${new URL(openwebrxUrl).origin}` : "http: https:";
  return `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src ${frame}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
}

// Extra keys each command may carry besides "cmd"; anything else is rejected.
const COMMAND_KEYS = Object.freeze({ level: ["name", "value"], func: ["name", "on"], tune: [], mode: ["value", "passband"] });

function validateCommand(body, state) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Cuerpo no valido." };
  const allowed = Object.hasOwn(COMMAND_KEYS, body.cmd) ? COMMAND_KEYS[body.cmd] : ["value"];
  if (Object.keys(body).some(key => key !== "cmd" && !allowed.includes(key))) return { error: "Cuerpo no valido." };
  const { cmd, value } = body;
  switch (cmd) {
    case "freq":
      if (!Number.isSafeInteger(value) || value < FREQ_MIN || value > FREQ_MAX) return { error: "Frecuencia fuera de rango (30 kHz-3 GHz)." };
      return { cmd, value };
    case "mode": {
      if (typeof value !== "string" || !MODES.includes(value)) return { error: "Modo no permitido." };
      const { passband = 0 } = body;
      if (!Number.isSafeInteger(passband) || passband < 0 || passband > PASSBAND_MAX) return { error: "Ancho de filtro no valido." };
      return { cmd, value, passband };
    }
    case "level": {
      const spec = typeof body.name === "string" && Object.hasOwn(LEVELS, body.name) ? LEVELS[body.name] : null;
      if (!spec) return { error: "Nivel no permitido." };
      if (typeof value !== "number" || !Number.isFinite(value)) return { error: "Valor de nivel no valido." };
      if (spec.kind === "unit" && (value < 0 || value > 1)) return { error: "El nivel debe estar entre 0 y 1." };
      if (spec.kind === "steps" && (!Number.isSafeInteger(value) || value < 0 || value > 1000)) return { error: "Valor de nivel no valido." };
      if (spec.kind === "enum" && (!Number.isSafeInteger(value) || value < 0 || value > AGC_MAX)) return { error: "Valor de AGC no valido." };
      return { cmd, name: body.name, value: spec.kind === "unit" ? Math.round(value * 1000) / 1000 : value };
    }
    case "func":
      if (typeof body.name !== "string" || !Object.hasOwn(FUNCS, body.name)) return { error: "Funcion no permitida." };
      if (typeof body.on !== "boolean") return { error: "El estado debe ser booleano." };
      return { cmd, name: body.name, on: body.on };
    case "tune":
      return { cmd };
    case "ptt":
      if (typeof value !== "boolean") return { error: "PTT debe ser booleano." };
      return { cmd, value };
    case "vfo": {
      const vfo = { A: "VFOA", B: "VFOB", VFOA: "VFOA", VFOB: "VFOB" }[value];
      return vfo ? { cmd, value: vfo } : { error: "VFO no valido." };
    }
    case "split":
      if (typeof value !== "boolean") return { error: "Split debe ser booleano." };
      return { cmd, value };
    case "step": {
      if (!Number.isSafeInteger(value) || value === 0 || Math.abs(value) > STEP_MAX) return { error: "Paso no valido." };
      if (!Number.isSafeInteger(state.freq)) return { error: "Frecuencia desconocida.", status: 503 };
      const next = state.freq + value;
      if (next < FREQ_MIN || next > FREQ_MAX) return { error: "Frecuencia fuera de rango (30 kHz-3 GHz)." };
      return { cmd: "freq", value: next };
    }
    default:
      return { error: "Comando desconocido." };
  }
}

function emptyReadings(table) {
  return Object.fromEntries(Object.values(table).map(item => [typeof item === "string" ? item : item.key, null]));
}

function emptyCaps() {
  return { detected: false, model: "", level: {}, func: {}, tune: false };
}

function createRemoteAgent(options = {}) {
  const configDir = options.configDir || defaultConfigDir();
  const config = loadConfig(configDir);
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const openwebrxUrl = normalizeOpenwebrx(options.openwebrxUrl || config.openwebrxUrl);
  const txLimitMs = (options.txLimitSeconds ?? config.txLimitSeconds) * 1000;
  const heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? HEARTBEAT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? 250;
  const host = options.host || "127.0.0.1";
  const policy = csp(openwebrxUrl);
  const useTls = options.tls ?? !isLoopbackHost(host);
  const identity = useTls ? remoteTls.ensure(configDir) : null;
  const sdrTarget = openwebrxUrl ? new URL(openwebrxUrl) : null;
  const sdrSessions = new Map();

  if (options.relay) {
    const merged = normalizeRelay({ ...config.relay, ...options.relay });
    if (!merged) throw new Error("Rele no valido: usa --relay <url https>, --station <id> y --station-secret <secreto>.");
    config.relay = merged;
    writeConfig(configDir, config);
  }
  const relayConfig = config.relay;
  const relayState = { connected: false };
  const relayBackoff = { min: options.relayBackoffMinMs ?? 1000, max: options.relayBackoffMaxMs ?? 30_000 };

  const client = new RigctldClient({
    host: options.rigctldHost || config.rigctldHost,
    port: options.rigctldPort ?? config.rigctldPort,
    socketFactory: options.socketFactory,
    reconnectMs: options.reconnectMs,
    timeoutMs: options.rigTimeoutMs
  });

  const rig = {
    freq: null, mode: null, passband: null, ptt: false, vfo: null, split: false, smeter: null,
    levels: emptyReadings(LEVELS), funcs: emptyReadings(FUNCS)
  };
  let caps = emptyCaps();
  let capsDone = false;
  let capsAttempts = 0;
  const unreadable = new Set();
  const controlStats = {};
  const slowMs = options.slowControlMs ?? 1500;
  let agentTx = false;
  let txStart = 0;
  let lastBeat = 0;
  let owner = null;
  let ownerSeen = 0;
  let pollTimer = null;
  let watchdog = null;
  let sseTimer = null;
  let keepAliveTimer = null;
  let pollCount = 0;
  let polling = false;
  let closing = false;
  const sseClients = new Set();
  const commandTimes = [];

  const ownerActive = () => owner !== null && now() - ownerSeen < CONTROL_IDLE_MS;

  function snapshot(clientId) {
    const active = ownerActive();
    return {
      connected: client.connected,
      freq: rig.freq,
      mode: rig.mode,
      passband: rig.passband,
      ptt: rig.ptt,
      vfo: rig.vfo,
      split: rig.split,
      smeter: rig.smeter,
      levels: { ...rig.levels },
      funcs: { ...rig.funcs },
      caps: capsView(),
      txSeconds: rig.ptt ? Math.max(0, Math.floor((now() - txStart) / 1000)) : 0,
      operator: !active ? null : owner === clientId ? "me" : "other",
      relay: { configured: Boolean(relayConfig), connected: relayState.connected }
    };
  }

  function setRigPtt(on) {
    if (on && !rig.ptt) txStart = now();
    rig.ptt = on;
    if (!on) agentTx = false;
  }

  async function pttOff(reason) {
    log(`PTT off: ${reason}`);
    setRigPtt(false);
    try { await client.setPtt(false, { priority: true }); }
    catch (error) { log(`T 0 failed: ${error.message}`); }
  }

  async function detectCaps() {
    if (capsDone) return;
    capsAttempts += 1;
    try {
      caps = { ...(await client.dumpCaps()), detected: true };
      capsDone = true;
      log(`capacidades: ${Object.keys(caps.level).length} niveles, ${Object.keys(caps.func).length} funciones, tune=${caps.tune}`);
    } catch (error) {
      // A rig that cannot dump its caps simply gets no extra controls; never retry in a loop.
      if (typeof error.code !== "number" && capsAttempts < 2) return;
      caps = { ...emptyCaps(), detected: true };
      capsDone = true;
      log(`dump_caps no disponible: ${error.message}`);
    }
  }

  client.on("connect", () => {
    // Whatever happened while the link was down, make sure the rig is not transmitting.
    client.setPtt(false, { priority: true }).catch(error => log(`T 0 failed: ${error.message}`));
    unreadable.clear();
    detectCaps().finally(() => schedulePoll(0));
  });
  client.on("disconnect", () => {
    setRigPtt(false);
    Object.assign(rig, {
      freq: null, mode: null, passband: null, vfo: null, split: false, smeter: null,
      levels: emptyReadings(LEVELS), funcs: emptyReadings(FUNCS)
    });
  });

  // Reads every supported level/function once; a read the rig refuses is reported as null and never retried.
  // Skipped while transmitting or when a client command is waiting, so it never delays PTT or user actions.
  const controlsBusy = () => rig.ptt || agentTx || client.pending > 0 || closing || !client.connected;

  // Reads one control. An RPRT error (null) disables it for the session; a slow reply twice in a row
  // throttles it to SLOW_POLL_MS (and disables it when it also failed).
  async function readControl(id, read, store) {
    const stat = (controlStats[id] ||= { slow: 0, last: -Infinity });
    if (stat.slow >= 2 && now() - stat.last < SLOW_POLL_MS) return;
    const started = now();
    const value = await read();
    const elapsed = now() - started;
    stat.last = started;
    stat.slow = elapsed > slowMs ? stat.slow + 1 : 0;
    store(value);
    if (value === null) unreadable.add(id);
  }

  async function pollControls() {
    for (const [name, spec] of Object.entries(LEVELS)) {
      if (controlsBusy()) return;
      if (!caps.level[name]?.get || unreadable.has(name)) continue;
      await readControl(name, () => client.getLevel(name), value => {
        rig.levels[spec.key] = value === null ? null : spec.kind === "unit" ? Math.round(value * 1000) / 1000 : Math.round(value);
      });
    }
    for (const [name, key] of Object.entries(FUNCS)) {
      if (controlsBusy()) return;
      if (!caps.func[name]?.get || unreadable.has(name)) continue;
      await readControl(name, () => client.getFunc(name), value => { rig.funcs[key] = value; });
    }
  }

  // Capabilities as shown to the console: controls found unreadable are reported as not gettable.
  function capsView() {
    if (!unreadable.size) return caps;
    const view = { ...caps, level: { ...caps.level }, func: { ...caps.func } };
    for (const name of unreadable) {
      if (view.level[name]) view.level[name] = { ...view.level[name], get: false };
      if (view.func[name]) view.func[name] = { ...view.func[name], get: false };
    }
    return view;
  }

  const rigVfoName = letter => {
    const named = rig.vfo === "Main" || rig.vfo === "Sub";
    return named ? (letter === "A" ? "Main" : "Sub") : (letter === "A" ? "VFOA" : "VFOB");
  };
  const isFirstVfo = () => !rig.vfo || rig.vfo === "VFOA" || rig.vfo === "Main";

  async function pollOnce() {
    if (polling || !client.connected || closing) return;
    polling = true;
    pollCount += 1;
    try {
      rig.freq = await client.getFreq();
      const mode = await client.getMode();
      rig.mode = mode.mode;
      rig.passband = mode.passband;
      const ptt = await client.getPtt();
      if (ptt !== rig.ptt) setRigPtt(ptt);
      rig.smeter = rig.ptt ? null : await client.getStrength();
      if (pollCount % 4 === 1) {
        try {
          const vfo = await client.getVfo();
          if (VFO_NAMES.includes(vfo)) rig.vfo = vfo;
        } catch (error) { if (typeof error.code !== "number") throw error; }
        try {
          const split = await client.getSplit();
          rig.split = split.split;
        } catch (error) { if (typeof error.code !== "number") throw error; }
      }
      if (pollCount % 4 === 2 && !controlsBusy()) await pollControls();
    } catch (error) {
      if (typeof error.code === "number") log(`rigctld: ${error.message}`);
    } finally {
      polling = false;
    }
  }

  function schedulePoll(delay = pollMs) {
    clearTimeout(pollTimer);
    if (closing) return;
    pollTimer = setTimeout(async () => {
      await pollOnce();
      schedulePoll();
    }, delay);
    pollTimer.unref?.();
  }

  function watchTx() {
    if (!agentTx || !rig.ptt) return;
    const time = now();
    if (time - lastBeat > heartbeatTimeoutMs) pttOff("sin latido");
    else if (time - txStart >= txLimitMs) pttOff("limite de TX");
  }

  function clientIdOf(request, url) {
    const supplied = request.headers["x-client-id"] || url.searchParams.get("cid") || "";
    const forwarded = request.socket.radicodexTunnel ? String(request.headers["x-forwarded-for"] || "").split(",").pop().trim() : "";
    return /^[\w-]{1,64}$/.test(supplied) ? supplied : `ip:${forwarded || request.socket.remoteAddress}`;
  }

  function authorized(request, url) {
    const header = request.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (tokenMatches(config.token, bearer)) return true;
    return url.pathname === "/api/events" && tokenMatches(config.token, url.searchParams.get("token"));
  }

  function send(response, status, body, headers = {}) {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    response.writeHead(status, {
      "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
      ...headers
    });
    response.end(payload);
  }

  function readBody(request) {
    return new Promise((resolve, reject) => {
      const tooBig = () => reject(Object.assign(new Error("Cuerpo demasiado grande."), { status: 413 }));
      if (Number(request.headers["content-length"]) > BODY_LIMIT) { request.resume(); tooBig(); return; }
      let size = 0;
      let rejected = false;
      const chunks = [];
      request.on("data", chunk => {
        size += chunk.length;
        if (size > BODY_LIMIT) {
          // Keep draining so the 413 reaches the client instead of a reset connection.
          if (!rejected) { rejected = true; tooBig(); }
          return;
        }
        chunks.push(chunk);
      });
      request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      request.on("error", reject);
    });
  }

  async function readJson(request) {
    if (!/^application\/json\s*(?:;|$)/i.test(request.headers["content-type"] || "")) {
      throw Object.assign(new Error("Se requiere application/json."), { status: 415 });
    }
    try { return JSON.parse(await readBody(request)); }
    catch (error) {
      if (error.status) throw error;
      throw Object.assign(new Error("JSON no valido."), { status: 400 });
    }
  }

  // Returns true when this client may control the rig (and refreshes/claims control).
  function claimControl(clientId, { acquire = true } = {}) {
    if (ownerActive() && owner !== clientId) return false;
    if (acquire || owner === clientId) { owner = clientId; ownerSeen = now(); }
    return true;
  }

  async function applyCommand(command, clientId) {
    if (command.cmd === "ptt" && command.value === true && !client.connected) {
      return { status: 503, body: { error: "Radio sin conexion." } };
    }
    const quietDuringTx = command.cmd === "level" && command.name === "AF";
    if (command.cmd !== "ptt" && !quietDuringTx && rig.ptt && agentTx) {
      return { status: 409, body: { error: "Cambio bloqueado durante TX." } };
    }
    if (!client.connected) return { status: 503, body: { error: "Radio sin conexion." } };
    try {
      switch (command.cmd) {
        case "freq": await client.setFreq(command.value); rig.freq = command.value; break;
        case "mode":
          await client.setMode(command.value, command.passband);
          rig.mode = command.value;
          rig.passband = command.passband;
          break;
        case "level": {
          const cap = caps.level[command.name];
          if (!cap?.set) return { status: 501, body: { error: "La radio no admite este nivel." } };
          if (LEVELS[command.name].kind === "steps" && command.value !== 0 && !cap.values?.includes(command.value)) {
            return { status: 400, body: { error: "Valor no admitido por la radio." } };
          }
          await client.setLevel(command.name, command.value);
          rig.levels[LEVELS[command.name].key] = command.value;
          break;
        }
        case "func":
          if (!caps.func[command.name]?.set) return { status: 501, body: { error: "La radio no admite esta funcion." } };
          await client.setFunc(command.name, command.on);
          rig.funcs[FUNCS[command.name]] = command.on;
          break;
        case "tune":
          if (!caps.tune) return { status: 501, body: { error: "La radio no admite TUNE." } };
          if (rig.ptt) return { status: 409, body: { error: "Cambio bloqueado durante TX." } };
          await client.tune();
          break;
        case "vfo": {
          const name = rigVfoName(command.value === "VFOA" ? "A" : "B");
          await client.setVfo(name);
          rig.vfo = name;
          break;
        }
        case "split":
          await client.setSplit(command.value, rigVfoName(isFirstVfo() ? "B" : "A"));
          rig.split = command.value;
          break;
        case "ptt":
          await client.setPtt(command.value, { priority: !command.value });
          setRigPtt(command.value);
          if (command.value) { agentTx = true; txStart = now(); lastBeat = txStart; }
          break;
        default: break;
      }
    } catch (error) {
      return { status: 502, body: { error: `rigctld: ${error.message}` } };
    }
    schedulePoll(50);
    return { status: 200, body: { ok: true, state: snapshot(clientId) } };
  }

  async function handleApi(request, response, url) {
    if (!authorized(request, url)) {
      send(response, 401, { error: "Token no valido." }, { "WWW-Authenticate": "Bearer" });
      return;
    }
    const clientId = clientIdOf(request, url);
    const route = `${request.method} ${url.pathname}`;
    if (route === "GET /api/state") { send(response, 200, snapshot(clientId)); return; }
    if (route === "GET /api/config") {
      send(response, 200, { openwebrxUrl, openwebrxSpanHz: config.openwebrxSpanHz, callsign: config.callsign, sdrProxy: Boolean(sdrTarget) });
      return;
    }
    if (route === "GET /api/events") {
      response.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      const entry = { response, clientId, last: "" };
      sseClients.add(entry);
      response.on("close", () => sseClients.delete(entry));
      response.write("retry: 1000\n\n");
      pushState(entry, true);
      return;
    }
    if (route === "POST /api/heartbeat") {
      // Latency probes must not keep an idle operator's control alive; only a held PTT does.
      if (ownerActive() && owner !== clientId) { send(response, 409, { error: "Otro operador tiene el control." }); return; }
      if (owner === clientId && rig.ptt && agentTx) { lastBeat = now(); ownerSeen = now(); }
      send(response, 200, { ok: true });
      return;
    }
    if (route === "POST /api/cmd") {
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      const command = validateCommand(body, rig);
      if (command.error) { send(response, command.status || 400, { error: command.error }); return; }
      // Releasing PTT is never rate limited or refused: it must always be possible to stop transmitting.
      const release = command.cmd === "ptt" && command.value === false;
      if (!release) {
        const time = now();
        while (commandTimes.length && time - commandTimes[0] >= 1000) commandTimes.shift();
        if (commandTimes.length >= CMD_RATE_LIMIT) { send(response, 429, { error: "Demasiados comandos." }); return; }
        commandTimes.push(time);
      }
      if (release) claimControl(clientId, { acquire: false });
      else if (!claimControl(clientId)) {
        send(response, 409, { error: "Otro operador tiene el control." });
        return;
      }
      const result = await applyCommand(command, clientId);
      send(response, result.status, result.body);
      return;
    }
    send(response, 404, { error: "No encontrado." });
  }

  function serveStatic(request, response, url) {
    const entry = Object.hasOwn(STATIC_FILES, url.pathname) ? STATIC_FILES[url.pathname] : null;
    if (!entry || (request.method !== "GET" && request.method !== "HEAD")) { send(response, 404, "No encontrado."); return; }
    fs.readFile(path.join(__dirname, entry[0]), (error, data) => {
      if (error) { send(response, 404, "No encontrado."); return; }
      response.writeHead(200, { "Content-Type": entry[1], "Content-Length": data.length });
      response.end(request.method === "HEAD" ? undefined : data);
    });
  }

  const upgradedSockets = new Set();

  const prefixOf = request => {
    if (!request.socket.radicodexTunnel) return "";
    const value = String(request.headers["x-forwarded-prefix"] || "").replace(/\/+$/, "");
    return PREFIX_PATTERN.test(value) ? value : "";
  };
  const secureRequest = request => useTls
    || (request.socket.radicodexTunnel && String(request.headers["x-forwarded-proto"] || "").toLowerCase() === "https");

  function sessionCookieOf(request) {
    for (const part of String(request.headers.cookie || "").split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key === SESSION_COOKIE) return rest.join("=");
    }
    return "";
  }

  // Returns { ok, cookie }: cookie is set only when a fresh session was issued for a token/Bearer request.
  function sdrAuth(request, url) {
    const time = now();
    for (const [id, expires] of sdrSessions) if (expires <= time) sdrSessions.delete(id);
    const id = sessionCookieOf(request);
    if (id && sdrSessions.has(id)) return { ok: true, cookie: "" };
    const header = request.headers.authorization || "";
    const supplied = header.startsWith("Bearer ") ? header.slice(7) : url.searchParams.get("token");
    if (!tokenMatches(config.token, supplied)) return { ok: false, cookie: "" };
    const fresh = crypto.randomBytes(32).toString("base64url");
    sdrSessions.set(fresh, time + SESSION_MS);
    const attrs = [`Path=${prefixOf(request)}/sdr/`, "HttpOnly", "SameSite=Strict", `Max-Age=${SESSION_MS / 1000}`];
    if (secureRequest(request)) attrs.push("Secure");
    return { ok: true, cookie: `${SESSION_COOKIE}=${fresh}; ${attrs.join("; ")}` };
  }

  function upstreamPath(url) {
    const search = new URL(url.href);
    search.searchParams.delete("token");
    return `${sdrTarget.pathname.replace(/\/?$/, "/")}${url.pathname.slice(SDR_PREFIX.length)}${search.search}`;
  }

  function upstreamHeaders(request, { keepUpgrade = false } = {}) {
    const listed = String(request.headers.connection || "").toLowerCase().split(",").map(item => item.trim());
    const headers = {};
    for (const [key, value] of Object.entries(request.headers)) {
      const lower = key.toLowerCase();
      if (lower === "authorization" || lower === "cookie") continue;
      if (!keepUpgrade && (HOP_BY_HOP.includes(lower) || listed.includes(lower))) continue;
      headers[key] = value;
    }
    const cookies = String(request.headers.cookie || "").split(";").map(item => item.trim())
      .filter(item => item && !item.startsWith(`${SESSION_COOKIE}=`));
    if (cookies.length) headers.cookie = cookies.join("; ");
    headers.host = sdrTarget.host;
    return headers;
  }

  function rewriteLocation(value, prefix) {
    if (value.startsWith(sdrTarget.origin)) return `${prefix}/sdr${value.slice(sdrTarget.origin.length)}`;
    return value.startsWith("/") && !value.startsWith("//") ? `${prefix}/sdr${value}` : value;
  }

  function proxyResponseHeaders(upstream, cookie, prefix) {
    const listed = String(upstream.headers.connection || "").toLowerCase().split(",").map(item => item.trim());
    const headers = {};
    for (const [key, value] of Object.entries(upstream.headers)) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.includes(lower) || listed.includes(lower)) continue;
      if (lower === "set-cookie") headers[key] = value.map(item => item.replace(/;\s*Domain=[^;]*/gi, ""));
      else if (lower === "location") headers[key] = rewriteLocation(value, prefix);
      else headers[key] = value;
    }
    const lowerKeys = Object.fromEntries(Object.keys(headers).map(key => [key.toLowerCase(), key]));
    const policyKey = lowerKeys["content-security-policy"];
    if (policyKey) {
      const directives = String(headers[policyKey]).split(";").map(item => item.trim())
        .filter(item => item && !/^frame-ancestors\b/i.test(item));
      headers[policyKey] = [...directives, "frame-ancestors 'self'"].join("; ");
    } else {
      headers["Content-Security-Policy"] = "frame-ancestors 'self'";
    }
    if (lowerKeys["x-frame-options"]) headers[lowerKeys["x-frame-options"]] = "SAMEORIGIN";
    if (cookie) {
      const key = lowerKeys["set-cookie"];
      const existing = key ? headers[key] : [];
      delete headers[key];
      headers["Set-Cookie"] = [...existing, cookie];
    }
    return headers;
  }

  function proxySdr(request, response, url) {
    if (url.pathname === "/sdr") {
      response.writeHead(308, { Location: `${prefixOf(request)}${SDR_PREFIX}${url.search}` });
      response.end();
      return;
    }
    const auth = sdrAuth(request, url);
    if (!auth.ok) { send(response, 401, { error: "Token no valido." }, { "WWW-Authenticate": "Bearer" }); return; }
    // The proxied page keeps its own headers and caching; only the agent's console policy is dropped.
    for (const header of ["Content-Security-Policy", "Cache-Control", "X-Content-Type-Options"]) response.removeHeader(header);
    const transport = sdrTarget.protocol === "https:" ? https : http;
    const upstream = transport.request({
      host: sdrTarget.hostname.replace(/^\[|\]$/g, ""),
      port: sdrTarget.port || (sdrTarget.protocol === "https:" ? 443 : 80),
      method: request.method,
      path: upstreamPath(url),
      headers: upstreamHeaders(request)
    }, reply => {
      response.writeHead(reply.statusCode, reply.statusMessage, proxyResponseHeaders(reply, auth.cookie, prefixOf(request)));
      reply.pipe(response);
    });
    upstream.on("error", () => {
      if (!response.headersSent) send(response, 502, { error: "OpenWebRX no disponible." });
      else response.destroy();
    });
    response.on("close", () => upstream.destroy());
    request.pipe(upstream);
  }

  function proxySdrUpgrade(request, socket, head) {
    const reject = status => { socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); };
    let url;
    try { url = new URL(request.url, "http://agent.local"); } catch { reject("400 Bad Request"); return; }
    if (!sdrTarget || !url.pathname.startsWith(SDR_PREFIX)) { socket.destroy(); return; }
    if (!sdrAuth(request, url).ok) { reject("401 Unauthorized"); return; }
    const secure = sdrTarget.protocol === "https:";
    const port = Number(sdrTarget.port) || (secure ? 443 : 80);
    const hostname = sdrTarget.hostname.replace(/^\[|\]$/g, "");
    const upstream = secure
      ? tlsLib.connect({ host: hostname, port, servername: net.isIP(hostname) ? undefined : hostname })
      : net.connect({ host: hostname, port });
    upgradedSockets.add(socket);
    upgradedSockets.add(upstream);
    const drop = () => { socket.destroy(); upstream.destroy(); upgradedSockets.delete(socket); upgradedSockets.delete(upstream); };
    socket.on("error", drop);
    upstream.on("error", drop);
    socket.on("close", drop);
    upstream.on("close", drop);
    upstream.once(secure ? "secureConnect" : "connect", () => {
      const headers = upstreamHeaders(request, { keepUpgrade: true });
      const lines = [`${request.method} ${upstreamPath(url)} HTTP/1.1`];
      for (const [key, value] of Object.entries(headers)) for (const item of [].concat(value)) lines.push(`${key}: ${item}`);
      upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
      if (head?.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
  }

  const requestHandler = async (request, response) => {
    response.setHeader("Content-Security-Policy", policy);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    try {
      const url = new URL(request.url, "http://agent.local");
      if (sdrTarget && (url.pathname === "/sdr" || url.pathname.startsWith(SDR_PREFIX))) proxySdr(request, response, url);
      else if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
      else serveStatic(request, response, url);
    } catch (error) {
      if (!response.headersSent) send(response, 500, { error: "Error interno." });
      else response.end();
    }
  };
  const server = useTls ? https.createServer({ key: identity.key, cert: identity.cert }, requestHandler) : http.createServer(requestHandler);
  server.on("upgrade", proxySdrUpgrade);
  // Tunnel sockets carry plain HTTP, so a TLS agent needs a separate plain server for them.
  const tunnelServer = useTls ? http.createServer(requestHandler) : server;
  if (tunnelServer !== server) tunnelServer.on("upgrade", proxySdrUpgrade);

  // ---- relay client: outgoing control channel + one data channel per client session ----
  let relayControl = null;
  let relayAttempt = 0;
  let relayRetry = null;

  function relayRequest(pathname) {
    const base = new URL(relayConfig.url);
    const transport = base.protocol === "https:" ? https : http;
    return transport.request({
      host: base.hostname.replace(/^\[|\]$/g, ""),
      port: base.port || (base.protocol === "https:" ? 443 : 80),
      method: "GET",
      path: `${base.pathname.replace(/\/$/, "")}/tunnel/${relayConfig.station}${pathname}`,
      agent: false,
      headers: { Authorization: `Bearer ${relayConfig.secret}`, Connection: "Upgrade", Upgrade: RELAY_UPGRADE }
    });
  }

  function openDataChannel(sessionId) {
    if (closing || !SESSION_ID.test(sessionId)) return;
    const request = relayRequest(`/data/${sessionId}`);
    request.setTimeout(10_000, () => request.destroy());
    request.on("error", () => {});
    request.on("response", reply => { reply.resume(); });
    request.on("upgrade", (reply, socket, head) => {
      request.setTimeout(0);
      socket.setTimeout(0);
      socket.on("error", () => {});
      socket.radicodexTunnel = true;
      upgradedSockets.add(socket);
      socket.on("close", () => upgradedSockets.delete(socket));
      if (head?.length) socket.unshift(head);
      tunnelServer.emit("connection", socket);
    });
    request.end();
  }

  function scheduleRelayRetry() {
    if (closing || relayRetry) return;
    const delay = Math.min(relayBackoff.max, relayBackoff.min * 2 ** relayAttempt);
    relayAttempt += 1;
    relayRetry = setTimeout(() => { relayRetry = null; connectRelay(); }, delay * (0.8 + Math.random() * 0.4));
    relayRetry.unref?.();
  }

  function connectRelay() {
    if (closing || !relayConfig) return;
    const request = relayRequest("");
    let up = false;
    request.setTimeout(15_000, () => request.destroy());
    request.on("error", error => { log(`rele: ${error.message}`); if (!up) scheduleRelayRetry(); });
    request.on("response", reply => {
      reply.resume();
      log(reply.statusCode === 401 ? "rele: secreto o estacion no validos" : `rele: respuesta ${reply.statusCode}`);
    });
    request.on("close", () => { if (!up) scheduleRelayRetry(); });
    request.on("upgrade", (reply, socket, head) => {
      up = true;
      request.setTimeout(0);
      socket.setTimeout(0);
      socket.setKeepAlive(true, 30_000);
      relayControl?.destroy();
      relayControl = socket;
      relayState.connected = true;
      relayAttempt = 0;
      log("rele conectado");
      let buffer = "";
      // The relay pings every 20 s; a silent link means a dead relay or NAT mapping.
      let idle = setTimeout(() => socket.destroy(), 60_000);
      const feed = chunk => {
        buffer += chunk.toString("latin1");
        if (buffer.length > 4096) { socket.destroy(); return; }
        let index;
        while ((index = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          clearTimeout(idle);
          idle = setTimeout(() => socket.destroy(), 60_000);
          if (line === "PING") socket.write("PONG\n");
          else if (line.startsWith("OPEN ")) openDataChannel(line.slice(5).trim());
        }
      };
      socket.on("data", feed);
      socket.on("error", () => {});
      socket.once("close", () => {
        clearTimeout(idle);
        if (relayControl === socket) {
          relayControl = null;
          relayState.connected = false;
          log("rele desconectado");
          scheduleRelayRetry();
        }
      });
      if (head?.length) feed(head);
    });
    request.end();
  }

  function relayLinks() {
    if (!relayConfig) return null;
    const base = new URL(relayConfig.url);
    return {
      url: relayConfig.url,
      station: relayConfig.station,
      console: `${base.protocol}//${base.host}/s/${relayConfig.station}/#token=${config.token}`,
      android: `radicodex-remote://pair?relay=${encodeURIComponent(relayConfig.url)}&station=${relayConfig.station}#token=${config.token}`
    };
  }

  function pushState(entry, force = false) {
    const text = JSON.stringify(snapshot(entry.clientId));
    if (!force && text === entry.last) return;
    entry.last = text;
    entry.response.write(`data: ${text}\n\n`);
  }

  async function start() {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 8788, host, resolve);
    });
    client.start();
    connectRelay();
    watchdog = setInterval(watchTx, 100);
    sseTimer = setInterval(() => { for (const entry of sseClients) pushState(entry); }, 250);
    keepAliveTimer = setInterval(() => { for (const entry of sseClients) entry.response.write(": keep-alive\n\n"); }, 15_000);
    for (const timer of [watchdog, sseTimer, keepAliveTimer]) timer.unref?.();
    return server.address();
  }

  async function close() {
    if (closing) return;
    closing = true;
    clearTimeout(pollTimer);
    clearInterval(watchdog);
    clearInterval(sseTimer);
    clearInterval(keepAliveTimer);
    if (client.connected && (rig.ptt || agentTx)) await pttOff("cierre del agente");
    client.stop();
    for (const entry of sseClients) entry.response.end();
    sseClients.clear();
    for (const socket of upgradedSockets) socket.destroy();
    clearTimeout(relayRetry);
    relayControl?.destroy();
    relayState.connected = false;
    await new Promise(resolve => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
    if (tunnelServer !== server) {
      await new Promise(resolve => {
        tunnelServer.close(() => resolve());
        tunnelServer.closeAllConnections();
      });
    }
  }

  return {
    server, client, token: config.token, config, openwebrxUrl, start, close, snapshot, relayLinks,
    tls: useTls, fingerprint: identity ? identity.fingerprint : ""
  };
}

function parseArgs(argv, env = process.env) {
  const args = { listen: env.REMOTE_LISTEN || "127.0.0.1" };
  const flags = {
    "--listen": "listen", "--port": "port", "--rigctld-host": "rigctldHost", "--rigctld-port": "rigctldPort",
    "--openwebrx": "openwebrxUrl", "--config-dir": "configDir", "--relay": "relayUrl", "--station": "relayStation",
    "--station-secret": "relaySecret"
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--tls" || argv[i] === "--no-tls") { args.tls = argv[i] === "--tls"; continue; }
    const name = flags[argv[i]];
    if (!name || i + 1 >= argv.length) throw new Error(`Argumento no valido: ${argv[i]}`);
    args[name] = argv[i += 1];
  }
  for (const key of ["port", "rigctldPort"]) {
    if (args[key] === undefined) continue;
    const value = Number(args[key]);
    if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error(`Puerto no valido: ${args[key]}`);
    args[key] = value;
  }
  return args;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(item => item && item.family === "IPv4" && !item.internal).map(item => item.address);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const relay = {};
  if (args.relayUrl) relay.url = args.relayUrl;
  if (args.relayStation) relay.station = args.relayStation;
  if (args.relaySecret) relay.secret = args.relaySecret;
  const agent = createRemoteAgent({
    host: args.listen, port: args.port, rigctldHost: args.rigctldHost, rigctldPort: args.rigctldPort,
    openwebrxUrl: args.openwebrxUrl, configDir: args.configDir, tls: args.tls, relay: Object.keys(relay).length ? relay : undefined,
    log: message => console.log(`[remote] ${message}`)
  });
  const address = await agent.start();
  const hosts = args.listen === "0.0.0.0" || args.listen === "::" ? lanAddresses()
    : args.listen === "127.0.0.1" ? ["127.0.0.1"] : [args.listen];
  console.log(`Remote shack escuchando en ${args.listen}:${address.port}`);
  if (args.tls === false) console.warn("AVISO: --no-tls usa HTTP sin cifrar; el token y el control viajan en claro.");
  const fragment = `#token=${agent.token}${agent.tls ? `&fp=${agent.fingerprint}` : ""}`;
  for (const ip of hosts) {
    console.log(`Consola: ${agent.tls ? "https" : "http"}://${ip}:${address.port}/${fragment}`);
    console.log(`Android: radicodex-remote://pair?host=${ip}&port=${address.port}${fragment}`);
  }
  if (agent.tls) console.log(`Huella TLS (SHA-256): ${agent.fingerprint}`);
  const links = agent.relayLinks();
  if (links) {
    console.log(`Rele: ${links.url} (estacion ${links.station}, secreto guardado en ${path.join(args.configDir || defaultConfigDir(), "remote-agent.json")})`);
    console.log(`Consola por rele: ${links.console}`);
    console.log(`Android por rele: ${links.android}`);
  }
  if (args.listen === "127.0.0.1") console.log("Solo acceso local. Usa --listen 0.0.0.0 para LAN/Tailscale.");
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await agent.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}

module.exports = { createRemoteAgent, parseArgs, validateCommand, MODES };
