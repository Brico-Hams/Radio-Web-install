"use strict";
// Remote shack agent: runs next to the radio, controls it through Hamlib rigctld and exposes a small
// token-protected HTTP/SSE API plus the browser console (remote.html). Separate from server.cjs on purpose:
// the local workspace server stays 127.0.0.1-only.
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const { RigctldClient, VFO_NAMES, stopSequence } = require("./rigctld-client.cjs");
const { catAllowList, TUNER_KINDS } = require("./remote-catalog.cjs");
const remoteTls = require("./remote-tls.cjs");
const remoteWs = require("./remote-ws.cjs");
const remoteAudio = require("./remote-audio.cjs");

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
const AUDIO_PATH = "/api/audio";
const AUDIO_AUTH_MS = 5000;
const AUDIO_MAX_CLIENTS = 8;
const AUDIO_TX_RATE = 60;
const AUDIO_BACKLOG_BYTES = 64 * 1024;
const AUDIO_FRAME = Object.freeze({ codec: "opus", sampleRate: 48000, channels: 1, frameMs: 20 });
const SWR_TRIP_MS = 1000;
const TUNE_MAX_SECONDS = Object.freeze({ atas: { default: 45, cap: 60 }, internal: { default: 20, cap: 30 } });
const TUNE_MAX_SECONDS_CAP = 60;
const TUNE_POLL_MS = 300;
const TUNE_HI_SWR_MS = 2000;
const TUNE_SWR_MS = 3000;
const HANG_MS = 2000;
const HANG_RETRY_MS = 500;
const TUNE_DONE = "Sintonía terminada";
const NOTICE_MS = 15_000;
const TUNE_FAILED = "La radio no ha iniciado la sintonía (revisa el sintonizador/ATAS en el equipo)";
const STATIC_FILES = Object.freeze({
  "/": ["remote.html", "text/html; charset=utf-8"],
  "/remote.html": ["remote.html", "text/html; charset=utf-8"],
  "/remote-ui.js": ["remote-ui.js", "text/javascript; charset=utf-8"],
  "/remote-audio-core.js": ["remote-audio-core.js", "text/javascript; charset=utf-8"],
  "/remote-audio-worklet.js": ["remote-audio-worklet.js", "text/javascript; charset=utf-8"],
  "/remote.css": ["remote.css", "text/css; charset=utf-8"],
  "/bricohams-logo.png": ["bricohams-logo.png", "image/png"],
  "/ui-i18n.js": ["ui-i18n.js", "text/javascript; charset=utf-8"],
  "/ui-translations.js": ["ui-translations.js", "text/javascript; charset=utf-8"]
});

const defaultConfigDir = () => path.join(os.homedir(), ".radicodex");

function loadConfig(dir) {
  const file = path.join(dir, "remote-agent.json");
  let stored = {};
  if (fs.existsSync(file)) {
    try { stored = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { throw new Error(`Configuracion corrupta: ${file}`); }
  }
  const config = {
    token: typeof stored.token === "string" && stored.token.length >= 32 ? stored.token : "",
    callsign: typeof stored.callsign === "string" && /^[A-Za-z0-9/]{3,16}$/.test(stored.callsign) ? stored.callsign.toUpperCase() : "",
    rigctldHost: typeof stored.rigctldHost === "string" ? stored.rigctldHost : "127.0.0.1",
    rigctldPort: Number.isInteger(stored.rigctldPort) ? stored.rigctldPort : 4532,
    txLimitSeconds: Number(stored.txLimitSeconds) > 0 ? Number(stored.txLimitSeconds) : 180,
    // Protection thresholds: SWR ratio for radios that report one, raw 0-255 RM6 value for raw-CAT radios (not calibrated).
    swrLimit: Number(stored.swrLimit) > 1 ? Number(stored.swrLimit) : undefined,
    swrRawLimit: Number.isInteger(stored.swrRawLimit) && stored.swrRawLimit >= 1 && stored.swrRawLimit <= 255 ? stored.swrRawLimit : undefined,
    tuneMaxSeconds: Number(stored.tuneMaxSeconds) > 0 ? Math.min(TUNE_MAX_SECONDS_CAP, Number(stored.tuneMaxSeconds)) : undefined,
    tunerKind: TUNER_KINDS.includes(stored.tunerKind) ? stored.tunerKind : undefined,
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

const RELAY_STATION = /^[a-z0-9-]{3,32}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const RELAY_UPGRADE = "radicodex-tunnel/1";
const SCOPES = Object.freeze(["civ", "smartsdr", "sdr", "audio", "none"]);

function tokenMatches(expected, supplied) {
  if (typeof supplied !== "string" || !supplied) return false;
  const digest = value => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(expected), digest(supplied));
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

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

// Raw CAT reply parsers (Yaesu format). Meter values are 0-255; PC carries the set power in watts.
function parseRawMeter(reply, cmd) {
  const match = /^RM(\d)(\d{3})(\d{3});?$/.exec(reply || "");
  if (!match || `RM${match[1]}` !== cmd) return null;
  return Math.min(255, Number(match[2]));
}

function parsePower(reply) {
  const match = /^PC\d(\d{3});?$/.exec(reply || "");
  return match ? Number(match[1]) : null;
}

// RI0 answers "RI P1..P8;" (one digit each): P2 1 = Hi-SWR, P4 0 RX / 1 TX / 2 TX inhibit, P6 1 = antenna tuner tuning.
function parseRadioInfo(reply) {
  const match = /^RI\d(\d)\d(\d)\d(\d)\d\d;?$/.exec(reply || "");
  return match ? { hiSwr: match[1] === "1", tx: Number(match[2]), tuning: match[3] === "1" } : null;
}

const round3 = value => Math.round(value * 1000) / 1000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp01 = value => Math.max(0, Math.min(1, value));

function meterFraction(key, value, raw) {
  if (value === null || value === undefined) return null;
  if (raw) return round3(value / 255);
  if (key === "swr") return round3(clamp01((value - 1) / 4));
  if (key === "alc") return round3(clamp01(value));
  return null;
}

function createRemoteAgent(options = {}) {
  const configDir = options.configDir || defaultConfigDir();
  const config = loadConfig(configDir);
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const txLimitMs = (options.txLimitSeconds ?? config.txLimitSeconds) * 1000;
  const heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? HEARTBEAT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? 250;
  const host = options.host || "127.0.0.1";
  const radioScope = SCOPES.includes(options.radioScope) ? options.radioScope : "none";
  const cat = options.radioCat || null;
  const swrLimit = options.swrLimit ?? config.swrLimit ?? 3;
  const swrRawLimit = options.swrRawLimit ?? config.swrRawLimit ?? cat?.swrRawLimit ?? 100;
  const meterMs = options.meterMs ?? 400;
  const tuneWatchMs = options.tuneWatchMs ?? 3000;
  const tunePollMs = options.tunePollMs ?? 250;
  const tuneStatusMs = options.tuneStatusMs ?? TUNE_POLL_MS;
  const tuneHiSwrMs = options.tuneHiSwrMs ?? TUNE_HI_SWR_MS;
  const tuneSwrMs = options.tuneSwrMs ?? TUNE_SWR_MS;
  const hangMs = options.hangMs ?? HANG_MS;
  const hangRetryMs = options.hangRetryMs ?? HANG_RETRY_MS;
  const hangCooldownMs = options.hangCooldownMs ?? 30_000;
  let lastHangAt = -Infinity;
  const stepMs = options.stopStepMs ?? 1000;
  const meterReadMs = options.meterReadMs ?? 1000;
  const meterPollMs = options.meterPollMs ?? 4000;
  const wantedKind = TUNER_KINDS.includes(options.tunerKind) ? options.tunerKind : config.tunerKind || "internal";
  const tunerKind = cat?.tuner?.[wantedKind] ? wantedKind : cat?.tuner?.internal ? "internal" : "atas";
  const tunerSpec = cat?.tuner?.[tunerKind] || null;
  const tuneLimits = TUNE_MAX_SECONDS[tunerKind];
  const tuneMaxMs = Math.min(tuneLimits.cap, options.tuneMaxSeconds ?? config.tuneMaxSeconds ?? tuneLimits.default) * 1000;
  const useTls = options.tls ?? !isLoopbackHost(host);
  const identity = useTls ? remoteTls.ensure(configDir) : null;

  if (options.relay) {
    const merged = normalizeRelay({ ...config.relay, ...options.relay });
    if (!merged) throw new Error("Rele no valido: usa --relay <url https>, --station <id> y --station-secret <secreto>.");
    config.relay = merged;
    writeConfig(configDir, config);
  }
  const relayConfig = config.relay;
  const audio = options.audioService || remoteAudio.createAudio({ ...options.audio, log });
  const audioSockets = new Set();
  const relayState = { connected: false };
  const relayBackoff = { min: options.relayBackoffMinMs ?? 1000, max: options.relayBackoffMaxMs ?? 30_000 };

  const client = new RigctldClient({
    host: options.rigctldHost || config.rigctldHost,
    port: options.rigctldPort ?? config.rigctldPort,
    socketFactory: options.socketFactory,
    reconnectMs: options.reconnectMs,
    timeoutMs: options.rigTimeoutMs,
    rawAllow: catAllowList(cat),
    rawIdleMs: options.rawIdleMs
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
  let tx = null;
  let swrSince = 0;
  let swrTripped = false;
  let tune = null;
  let tuneWasActive = false;
  let stopping = 0;
  let emergency = false;
  let retryTimer = null;
  let meterBusy = false;
  let meterGen = 0;
  let meterCycle = 0;
  let meterTimer = null;
  let notice = null;
  const meterOff = new Set();
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
      tx: rig.ptt && tx ? { ...tx, fraction: { ...tx.fraction } } : null,
      txAlert: swrTripped ? "swr" : null,
      tune: tune ? { kind: tunerKind, seconds: Math.max(0, Math.floor((now() - tune.startedAt) / 1000)), maxSeconds: Math.round(tuneMaxMs / 1000) } : null,
      notice: notice && now() - notice.at < NOTICE_MS ? { id: notice.id, text: notice.text } : null,
      operator: !active ? null : owner === clientId ? "me" : "other",
      relay: { configured: Boolean(relayConfig), connected: relayState.connected }
    };
  }

  function setNotice(text) {
    notice = { id: (notice?.id || 0) + 1, text, at: now() };
  }

  function setRigPtt(on) {
    // Any PTT edge starts a fresh meter generation so a read left over from the previous transmission cannot block or pollute this one.
    if (on !== rig.ptt) { meterGen += 1; meterBusy = false; }
    if (on && !rig.ptt) {
      txStart = now();
      tx = { po: null, swr: null, alc: null, powerSetW: null, source: cat ? "raw" : "hamlib", fraction: { po: null, swr: null, alc: null } };
      swrSince = 0;
      meterCycle = 0;
      setImmediate(pollTxMeters);
    }
    rig.ptt = on;
    if (!on) { agentTx = false; tx = null; swrSince = 0; audio.txRelease?.(); }
  }

  // Ordered stop (tuner stop, raw txOff, Hamlib T 0); `tuner` says a tune may be active.
  // `guarded` stops (PTT off, tune end) are watched by the hang watchdog; the connect-time one is not.
  async function runStop({ tuner = false, guarded = true } = {}) {
    if (guarded) stopping += 1;
    try { return await stopSequence(client, { cat, tunerKind, tuner, stepMs, log }); }
    finally { if (guarded) stopping -= 1; }
  }

  function endEmergency() {
    emergency = false;
    clearInterval(retryTimer);
    retryTimer = null;
  }

  // Last raw SWR read while still transmitting during the tune; falls back to one bounded read when there is none.
  async function readFinalSwr(run) {
    if (!cat?.meters?.swr || closing) return "";
    const text = value => ` (ROE bruta ${Math.round(value)}/255)`;
    if (Number.isFinite(run?.lastSwr)) return text(run.lastSwr);
    if (!client.connected) return "";
    const cmd = cat.meters.swr;
    let timer;
    try {
      const value = await Promise.race([
        client.sendRaw(cmd, { read: true, timeoutMs: meterReadMs }).then(reply => parseRawMeter(reply, cmd)),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), 800); })
      ]);
      return Number.isFinite(value) ? text(value) : "";
    } catch { return ""; } finally { clearTimeout(timer); }
  }

  async function pttOff(reason) {
    log(`PTT off: ${reason}`);
    const tuning = tune !== null;
    let swrText = "";
    if (tuning) {
      const run = tune;
      tune = null;
      if (tunerKind === "atas") swrText = await readFinalSwr(run);
      log(`Sintonía abortada: ${reason}`);
      if (tunerKind === "atas" && reason.startsWith("tiempo máximo")) {
        setNotice(`Sintonía cortada a los ${Math.round((now() - run.startedAt) / 1000)} s${swrText}: la antena no ha sintonizado`);
      } else {
        setNotice(`Sintonía abortada: ${reason}${swrText}`);
      }
    }
    tune = null;
    setRigPtt(false);
    if (await runStop({ tuner: tuning })) endEmergency();
  }

  // Radios with a raw-CAT tuner override are driven through it, whatever Hamlib reports.
  const withCatCaps = value => cat?.tuner
    ? { ...value, func: { ...value.func, TUNER: { get: true, set: true } }, tune: true }
    : value;

  async function detectCaps() {
    if (capsDone) return;
    capsAttempts += 1;
    try {
      caps = withCatCaps({ ...(await client.dumpCaps()), detected: true });
      capsDone = true;
      log(`capacidades: ${Object.keys(caps.level).length} niveles, ${Object.keys(caps.func).length} funciones, tune=${caps.tune}`);
    } catch (error) {
      // A rig that cannot dump its caps simply gets no extra controls; never retry in a loop.
      if (typeof error.code !== "number" && capsAttempts < 2) return;
      caps = withCatCaps({ ...emptyCaps(), detected: true });
      capsDone = true;
      log(`dump_caps no disponible: ${error.message}`);
    }
  }

  client.on("connect", () => {
    // Whatever happened while the link was down, make sure the rig is not transmitting.
    const tuner = tuneWasActive;
    tuneWasActive = false;
    runStop({ tuner, guarded: false }).then(ok => { if (ok) endEmergency(); });
    unreadable.clear();
    meterOff.clear();
    detectCaps().finally(() => schedulePoll(0));
  });
  client.on("disconnect", () => {
    if (tune) tuneWasActive = true;
    tune = null;
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
      if (name === "TUNER" && cat?.tuner) { await readControl(name, readCatTuner, value => { rig.funcs[key] = value; }); continue; }
      await readControl(name, () => client.getFunc(name), value => { rig.funcs[key] = value; });
    }
  }

  // AC10x: x=1 tuner on, 0 off. Null when the radio refuses or answers something else.
  async function readCatTuner() {
    try {
      const match = /^AC10([01]);?$/.exec(await client.sendRaw(cat.tuner.read, { read: true }) || "");
      return match ? match[1] === "1" : null;
    } catch (error) {
      if (error.code === "rejected") return null;
      throw error;
    }
  }

  function setMeter(key, value) {
    tx[key] = value;
    tx.fraction[key] = meterFraction(key, value, Boolean(cat));
  }

  async function readCatMeters(gen) {
    const live = () => gen === meterGen && rig.ptt && tx;
    for (const key of ["alc", "po", "swr"]) {
      if (!live()) return;
      if (meterOff.has(key)) continue;
      const cmd = cat.meters[key];
      try {
        const run = tune;
        const value = parseRawMeter(await client.sendRaw(cmd, { read: true, timeoutMs: meterReadMs, abandon: true }), cmd);
        if (!live()) return;
        if (key === "swr" && run && tune === run && Number.isFinite(value)) run.lastSwr = value;
        setMeter(key, value);
      } catch (error) {
        if (error.code !== "rejected") throw error;
        meterOff.add(key);
        log(`medidor ${key} no disponible: ${error.message}`);
      }
    }
    if (meterCycle % 5 === 0 && live()) {
      try {
        const watts = parsePower(await client.sendRaw(cat.power, { read: true, timeoutMs: meterReadMs, abandon: true }));
        if (live() && watts !== null) tx.powerSetW = watts;
      } catch (error) { if (error.code !== "rejected") throw error; }
    }
  }

  // Radios without a raw-CAT override: only the meters Hamlib advertises, shown as they come.
  async function readHamlibMeters(gen) {
    for (const [key, name] of [["po", "RFPOWER_METER_WATTS"], ["swr", "SWR"], ["alc", "ALC"]]) {
      if (gen !== meterGen || !rig.ptt || !tx) return;
      if (!caps.level[name]?.get || meterOff.has(key)) continue;
      const value = await client.getLevel(name, { timeoutMs: meterReadMs });
      if (gen !== meterGen || !rig.ptt || !tx) return;
      if (value === null) meterOff.add(key); else setMeter(key, round3(value));
    }
  }

  async function checkSwr() {
    const limit = cat ? swrRawLimit : swrLimit;
    const tuning = tune !== null;
    // An ATAS starts mismatched and the radio reports high SWR while the motor searches.
    if (tuning && tunerKind === "atas") { swrSince = 0; return; }
    const over = tx && tx.swr !== null && (tuning ? tx.swr >= limit : tx.swr > limit);
    if (!over) { swrSince = 0; return; }
    const time = now();
    if (!swrSince) { swrSince = time; return; }
    if (time - swrSince <= (tuning ? tuneSwrMs : SWR_TRIP_MS)) return;
    swrTripped = true;
    setNotice(tuning ? "ROE alta: sintonía cortada" : "ROE alta: transmisión cortada");
    await pttOff("ROE alta");
  }

  // Runs on the same serialized rigctld connection; PTT off keeps queue priority, so it waits for at most one meter read.
  async function pollTxMeters() {
    if (meterBusy || !rig.ptt || !tx || closing || !client.connected) return;
    meterBusy = true;
    const gen = meterGen;
    let timer;
    try {
      // A poll that never settles is abandoned after meterPollMs so it cannot block later ones.
      await Promise.race([
        (async () => {
          if (cat) await readCatMeters(gen); else await readHamlibMeters(gen);
          if (gen !== meterGen) return;
          meterCycle += 1;
          await checkSwr();
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("meter poll timeout"), { code: "timeout" })), meterPollMs); })
      ]);
    } catch (error) {
      if (typeof error.code === "number") log(`rigctld: ${error.message}`);
    } finally {
      clearTimeout(timer);
      if (gen === meterGen) meterBusy = false;
    }
  }

  // After the start command the radio must report TX1/TX2; an ATAS antenna may never key it.
  async function tuneKeyed(run) {
    let expired = false;
    const timer = setTimeout(() => { expired = true; }, tuneWatchMs);
    try {
      while (!expired && !closing && tune === run) {
        try {
          if (/^TX[12];?$/.test(await client.sendRaw(cat.txState, { read: true }) || "")) return true;
        } catch (error) { if (error.code !== "rejected") throw error; }
        if (expired || tune !== run) break;
        // The client is still waiting for this request, so it counts as alive during the start window.
        lastBeat = now();
        await sleep(tunePollMs);
      }
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  // Tune state from RI0 (Hi-SWR, TX state, antenna tuner tuning); falls back to the TX state when RI0 is refused.
  async function readTuneInfo() {
    try {
      const info = cat.status ? parseRadioInfo(await client.sendRaw(cat.status, { read: true })) : null;
      if (info) return info;
    } catch (error) { if (error.code !== "rejected") throw error; }
    const match = /^TX(\d);?$/.exec(await client.sendRaw(cat.txState, { read: true }) || "");
    return match ? { hiSwr: false, tx: Number(match[1]), tuning: Number(match[1]) > 0 } : null;
  }

  async function finishTune(run) {
    if (tune !== run) return;
    tune = null;
    const swrText = tunerKind === "atas" ? await readFinalSwr(run) : "";
    log(TUNE_DONE + swrText);
    setNotice(TUNE_DONE + swrText);
    setRigPtt(false);
    await runStop({ tuner: true });
  }

  // Polls the radio until the tune ends. Limits (time, Hi-SWR, raw SWR, heartbeat) are enforced by watchTx/checkSwr,
  // so a stuck poll can never keep a tune alive.
  async function tuneLoop(run) {
    while (tune === run && !closing) {
      await sleep(tuneStatusMs);
      if (tune !== run || closing) return;
      try {
        const info = await readTuneInfo();
        if (tune !== run) return;
        if (info) {
          if (info.tuning || info.tx > 0) run.seen = true;
          run.hiSwrSince = info.hiSwr ? run.hiSwrSince || now() : 0;
          if (run.seen && !info.tuning && info.tx === 0) { await finishTune(run); return; }
        }
      } catch (error) {
        if (typeof error.code !== "number" && error.code !== "rejected") log(`sintonía: ${error.message}`);
      }
    }
  }

  async function startCatTune(clientId) {
    const run = { owner: clientId, startedAt: now(), hiSwrSince: 0, seen: false };
    tune = run;
    swrTripped = false;
    setRigPtt(true);
    agentTx = true;
    txStart = run.startedAt;
    lastBeat = run.startedAt;
    try {
      await client.sendRaw(tunerSpec.start);
      lastBeat = now();
      if (!(await tuneKeyed(run))) {
        if (tune !== run) return { status: 409, body: { error: "Sintonía cancelada." } };
        log(TUNE_FAILED);
        setNotice(TUNE_FAILED);
        tune = null;
        setRigPtt(false);
        await runStop({ tuner: true });
        return { status: 502, body: { error: TUNE_FAILED } };
      }
    } catch (error) {
      if (tune === run) {
        tune = null;
        setRigPtt(false);
        runStop({ tuner: true });
      }
      throw error;
    }
    if (tune !== run) return { status: 409, body: { error: "Sintonía cancelada." } };
    run.seen = true;
    log(`Sintonía iniciada (${tunerKind})`);
    tuneLoop(run);
    return null;
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
      if (ptt !== rig.ptt && !tune) setRigPtt(ptt);
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
    checkHung();
    if (!agentTx || !rig.ptt) return;
    const time = now();
    if (time - lastBeat > heartbeatTimeoutMs) pttOff("sin latido");
    else if (time - txStart >= txLimitMs) pttOff("limite de TX");
    else if (tune && time - tune.startedAt >= tuneMaxMs) pttOff(`tiempo máximo de sintonía (${Math.round(tuneMaxMs / 1000)} s)`);
    else if (tunerKind !== "atas" && tune?.hiSwrSince && time - tune.hiSwrSince > tuneHiSwrMs) pttOff("Hi-SWR de la radio");
  }

  // A command pending for too long while transmitting means rigctld hung with the radio possibly keyed.
  // With a supervisor (onRigctldHung) it restarts rigctld; otherwise the stop is retried until it gets through.
  function checkHung() {
    if (emergency || closing || !client.connected) return;
    if (!(rig.ptt || agentTx || tune || stopping > 0) || client.oldestPendingMs() <= hangMs) return;
    if (options.onRigctldHung && Date.now() - lastHangAt < hangCooldownMs) return;
    emergency = true;
    log(`rigctld no responde (${hangMs} ms) con TX activo: parada de emergencia`);
    if (options.onRigctldHung) {
      lastHangAt = Date.now();
      Promise.resolve().then(() => options.onRigctldHung()).catch(error => log(`parada de emergencia: ${error.message}`));
      return;
    }
    const retry = () => {
      if (!emergency || closing) { endEmergency(); return; }
      if (client.connected) runStop({ tuner: true }).then(ok => { if (ok) endEmergency(); });
    };
    retry();
    retryTimer = setInterval(retry, hangRetryMs);
    retryTimer.unref?.();
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
          if (command.name === "TUNER" && cat?.tuner) {
            if (!cat.tuner.internal) return { status: 501, body: { error: "La radio no admite esta funcion." } };
            await client.sendRaw(command.on ? cat.tuner.internal.on : cat.tuner.internal.off);
          } else await client.setFunc(command.name, command.on);
          rig.funcs[FUNCS[command.name]] = command.on;
          break;
        case "tune":
          if (!caps.tune) return { status: 501, body: { error: "La radio no admite TUNE." } };
          if (rig.ptt) return { status: 409, body: { error: "Cambio bloqueado durante TX." } };
          if (cat?.tuner) {
            const refused = await startCatTune(clientId);
            if (refused) return refused;
          } else await client.tune();
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
          if (command.value) {
            if (tune) return { status: 409, body: { error: "Sintonía en curso." } };
            await client.setPtt(true);
            swrTripped = false;
            setRigPtt(true);
            agentTx = true;
            txStart = now();
            lastBeat = txStart;
          } else await pttOff("solicitado por el operador");
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
      send(response, 200, { callsign: config.callsign, radioScope, audio: { rx: Boolean(audio.rx), tx: Boolean(audio.tx) } });
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

  const requestHandler = async (request, response) => {
    response.setHeader("Content-Security-Policy", CSP);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    try {
      const url = new URL(request.url, "http://agent.local");
      if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
      else serveStatic(request, response, url);
    } catch (error) {
      if (!response.headersSent) send(response, 500, { error: "Error interno." });
      else response.end();
    }
  };
  const server = useTls ? https.createServer({ key: identity.key, cert: identity.cert }, requestHandler) : http.createServer(requestHandler);
  // Tunnel sockets carry plain HTTP, so a TLS agent needs a separate plain server for them.
  const tunnelServer = useTls ? http.createServer(requestHandler) : server;

  // ---- audio WebSocket (/api/audio): RX Opus packets out, TX Opus packets in from the PTT owner ----
  const wsPingMs = options.wsPingMs ?? 10_000;

  function handleAudioSocket(ws, request) {
    const state = { cid: "", authed: false, rxOn: true, seq: 0, unsubscribe: null, txTimes: [], lastRefusal: 0, lastSeen: now() };
    const fallbackId = `ip:${request.socket.radicodexTunnel ? String(request.headers["x-forwarded-for"] || "").split(",").pop().trim() || request.socket.remoteAddress : request.socket.remoteAddress}`;
    audioSockets.add(ws);
    const authTimer = setTimeout(() => ws.close(4401, "auth"), AUDIO_AUTH_MS);
    authTimer.unref?.();
    const pingTimer = setInterval(() => {
      if (now() - state.lastSeen > wsPingMs * 3) { ws.fail(1001, "timeout"); return; }
      ws.ping();
    }, wsPingMs);
    pingTimer.unref?.();

    const sendJson = value => ws.send(JSON.stringify(value));
    const refuse = reason => {
      const time = now();
      if (time - state.lastRefusal < 1000) return;
      state.lastRefusal = time;
      sendJson({ type: "tx_refused", reason });
    };

    function authenticate(message) {
      let body;
      try { body = JSON.parse(message); } catch { body = null; }
      if (!body || body.type !== "auth" || !tokenMatches(config.token, body.token) || audioSockets.size > AUDIO_MAX_CLIENTS) {
        ws.close(4401, "auth");
        return;
      }
      clearTimeout(authTimer);
      state.authed = true;
      state.cid = typeof body.cid === "string" && /^[\w-]{1,64}$/.test(body.cid) ? body.cid : fallbackId;
      const hello = { type: "hello" };
      if (audio.rx) hello.rx = { ...AUDIO_FRAME };
      if (audio.tx || audio.txReason) {
        hello.tx = { allowed: Boolean(audio.tx), ...AUDIO_FRAME };
        if (!audio.tx) hello.tx.reason = audio.txReason;
      }
      sendJson(hello);
      if (audio.rx) subscribeRx();
    }

    function subscribeRx() {
      if (state.unsubscribe) return;
      state.unsubscribe = audio.subscribe({
        onPacket: packet => {
          if (!ws.open || ws.socket.writableLength > AUDIO_BACKLOG_BYTES) return;
          const frame = Buffer.alloc(5 + packet.length);
          frame[0] = 1;
          frame.writeUInt32BE(state.seq >>> 0, 1);
          state.seq = (state.seq + 1) >>> 0;
          packet.copy(frame, 5);
          ws.send(frame);
        },
        onLevel: rms => { if (ws.open) sendJson({ type: "level", rms }); }
      });
    }

    function unsubscribeRx() {
      state.unsubscribe?.();
      state.unsubscribe = null;
    }

    function handleTx(data) {
      if (data.length < 6) return;
      const time = now();
      while (state.txTimes.length && time - state.txTimes[0] >= 1000) state.txTimes.shift();
      if (state.txTimes.length >= AUDIO_TX_RATE) return;
      state.txTimes.push(time);
      if (!audio.tx) { refuse("TX de audio no disponible."); return; }
      if (owner !== state.cid) { refuse("No tienes el control."); return; }
      if (!rig.ptt || !agentTx) { refuse("PTT apagado."); return; }
      lastBeat = time;
      ownerSeen = time;
      audio.txWrite(data.subarray(5));
    }

    ws.on("message", (data, binary) => {
      state.lastSeen = now();
      if (!state.authed) {
        if (binary) ws.close(4401, "auth");
        else authenticate(data);
        return;
      }
      if (binary) {
        if (data[0] === 2) handleTx(data);
        return;
      }
      let body;
      try { body = JSON.parse(data); } catch { return; }
      if (body?.type === "rx" && typeof body.on === "boolean" && audio.rx) {
        if (body.on) subscribeRx(); else unsubscribeRx();
      }
    });
    ws.on("pong", () => { state.lastSeen = now(); });
    ws.on("close", () => {
      clearTimeout(authTimer);
      clearInterval(pingTimer);
      audioSockets.delete(ws);
      unsubscribeRx();
      if (state.authed && owner === state.cid && (rig.ptt || agentTx)) pttOff("socket de audio cerrado");
    });
  }

  function handleUpgrade(request, socket, head) {
    let pathname = "";
    try { pathname = new URL(request.url, "http://agent.local").pathname; } catch { /* rejected below */ }
    if (pathname !== AUDIO_PATH || closing) {
      socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
      return;
    }
    const ws = remoteWs.acceptUpgrade(request, socket, head, { maxPayload: 4096 });
    if (ws) handleAudioSocket(ws, request);
  }
  server.on("upgrade", handleUpgrade);
  if (tunnelServer !== server) tunnelServer.on("upgrade", handleUpgrade);

  // ---- relay client: outgoing control channel + one data channel per client session ----
  let relayControl = null;
  let relayAttempt = 0;
  let relayRetry = null;

  const relayRequests = new Set();

  function relayRequest(pathname) {
    const base = new URL(relayConfig.url);
    const transport = base.protocol === "https:" ? https : http;
    const request = transport.request({
      host: base.hostname.replace(/^\[|\]$/g, ""),
      port: base.port || (base.protocol === "https:" ? 443 : 80),
      method: "GET",
      path: `${base.pathname.replace(/\/$/, "")}/tunnel/${relayConfig.station}${pathname}`,
      agent: false,
      headers: { Authorization: `Bearer ${relayConfig.secret}`, Connection: "Upgrade", Upgrade: RELAY_UPGRADE }
    });
          relayRequests.add(request);
          request.on("close", () => relayRequests.delete(request));
          return request;
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
      socket.setNoDelay(true);
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
      idle.unref?.();
      const feed = chunk => {
        buffer += chunk.toString("latin1");
        if (buffer.length > 4096) { socket.destroy(); return; }
        let index;
        while ((index = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          clearTimeout(idle);
          idle = setTimeout(() => socket.destroy(), 60_000);
          idle.unref?.();
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
    meterTimer = setInterval(pollTxMeters, meterMs);
    sseTimer = setInterval(() => { for (const entry of sseClients) pushState(entry); }, 250);
    keepAliveTimer = setInterval(() => { for (const entry of sseClients) entry.response.write(": keep-alive\n\n"); }, 15_000);
    for (const timer of [watchdog, meterTimer, sseTimer, keepAliveTimer]) timer.unref?.();
    return server.address();
  }

  async function close() {
    if (closing) return;
    closing = true;
    clearTimeout(pollTimer);
    clearInterval(watchdog);
    clearInterval(meterTimer);
    clearInterval(sseTimer);
    clearInterval(keepAliveTimer);
    endEmergency();
    if (client.connected && (rig.ptt || agentTx || tune)) await pttOff("cierre del agente");
    client.stop();
    for (const ws of audioSockets) { ws.fail(1001, "shutdown"); ws.socket.destroy(); }
    audio.close?.();
    for (const request of relayRequests) request.destroy();
    relayRequests.clear();
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

  // Lets the station supervisor surface an emergency stop in the console.
  function notify(text) {
    log(text);
    setNotice(text);
  }

  return {
    server, client, token: config.token, config, start, close, snapshot, relayLinks, notify,
    tls: useTls, fingerprint: identity ? identity.fingerprint : ""
  };
}

function parseArgs(argv, env = process.env) {
  const args = { listen: env.REMOTE_LISTEN || "127.0.0.1" };
  const flags = {
    "--listen": "listen", "--port": "port", "--rigctld-host": "rigctldHost", "--rigctld-port": "rigctldPort",
    "--config-dir": "configDir", "--relay": "relayUrl", "--station": "relayStation",
    "--station-secret": "relaySecret", "--audio-input": "audioInput", "--audio-output": "audioOutput"
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
    configDir: args.configDir, tls: args.tls, relay: Object.keys(relay).length ? relay : undefined,
    audio: { input: args.audioInput || "", output: args.audioOutput || "" },
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

module.exports = { createRemoteAgent, parseArgs, validateCommand, parseRawMeter, parsePower, parseRadioInfo, MODES };
