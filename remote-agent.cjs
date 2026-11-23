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
const { SmartSdrRigClient } = require("./smartsdr-core.cjs");
const { catAllowList, TUNER_KINDS } = require("./remote-catalog.cjs");
const radioSettings = require("./radio-settings.cjs");
const remoteTls = require("./remote-tls.cjs");
const remoteWs = require("./remote-ws.cjs");
const remoteAudio = require("./remote-audio.cjs");
const { TuneCheck, swrFromRaw, normalizeMeter, normalizeLevel, parsePowerFrame, tunePowerCheck } = require("./remote-meters.cjs");
const { createAccessories } = require("./station-accessories.cjs");
const stationDevicesLib = require("./station-devices.cjs");
const { createRotor, RotorError } = require("./remote-rotor.cjs");
const remoteOps = require("./remote-ops.cjs");
const { planCwSend, createCwGuard, createMemoryStore, CwError } = require("./remote-cw.cjs");
const remoteQsl = require("./remote-qsl.cjs");

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
  "/remote-digital.js": ["remote-digital.js", "text/javascript; charset=utf-8"],
  "/digital-code-tables.json": ["data/digital-code-tables.json", "application/json; charset=utf-8"],
  "/remote-rotor-ui.js": ["remote-rotor-ui.js", "text/javascript; charset=utf-8"],
  "/remote-tune-ui.js": ["remote-tune-ui.js", "text/javascript; charset=utf-8"],
  "/spectrum-core.js": ["spectrum-core.js", "text/javascript; charset=utf-8"],
  "/remote-audio-worklet.js": ["remote-audio-worklet.js", "text/javascript; charset=utf-8"],
  "/remote.css": ["remote.css", "text/css; charset=utf-8"],
  "/manifest.webmanifest": ["remote.webmanifest", "application/manifest+json; charset=utf-8"],
  "/sw.js": ["remote-sw.js", "text/javascript; charset=utf-8"],
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
    // Radio identity for guests/TX log; rigMaxPowerW is operator-declared (needed to enforce guest watt limits).
    radioId: typeof stored.radioId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(stored.radioId) ? stored.radioId : "main",
    radioLabel: typeof stored.radioLabel === "string" ? stored.radioLabel.slice(0, 40) : "",
    rigMaxPowerW: Number(stored.rigMaxPowerW) > 0 ? Number(stored.rigMaxPowerW) : undefined,
    // Optional, off by default: public read-only audio and idle update check of signed GitHub releases.
    listenLive: stored.listenLive?.enabled === true ? { enabled: true, maxClients: Number(stored.listenLive.maxClients) || 4 } : { enabled: false },
    updateCheck: stored.updateCheck?.enabled === true && typeof stored.updateCheck.asset === "string" ? { enabled: true, asset: stored.updateCheck.asset } : { enabled: false },
    relay: normalizeRelay(stored.relay),
    accessories: normalizeAccessories(stored.accessories),
    // Station devices (power/relay, rotors); credentials stay in this 0600 file and are never sent to clients.
    devices: Array.isArray(stored.devices) ? stored.devices : [],
    // Remote CW through the radio's own keyer: off unless the operator enables it.
    cwEnabled: stored.cwEnabled === true,
    cwMaxSeconds: Number(stored.cwMaxSeconds) > 0 ? Math.min(120, Number(stored.cwMaxSeconds)) : undefined,
    // QRZ.com lookup (off by default, the operator's own credentials) and LoTW upload through the operator's local TQSL.
    // Both stay in this 0600 file and are never sent to clients.
    qrz: remoteQsl.normalizeQrzConfig(stored.qrz),
    lotw: remoteQsl.normalizeLotwConfig(stored.lotw)
  };
  if (!config.token) {
    config.token = crypto.randomBytes(32).toString("base64url");
    writeConfig(dir, config);
  }
  return config;
}

// Amplifier operate stays off unless the owner sets operateAllowed true in the local config file.
function normalizeAccessories(value) {
  const id = item => (typeof item?.device === "string" && /^[a-z0-9-]{1,48}$/.test(item.device) ? item.device : undefined);
  return {
    amplifier: { device: id(value?.amplifier), operateAllowed: value?.amplifier?.operateAllowed === true },
    // ratedPowerW converts the radio RFPOWER fraction to watts so a tune can be refused above the 10 W cap.
    tuner: { device: id(value?.tuner), ratedPowerW: Number(value?.tuner?.ratedPowerW) > 0 ? Number(value.tuner.ratedPowerW) : undefined }
  };
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
const QSL_ROUTES = Object.freeze(["GET /api/qso", "POST /api/qso", "POST /api/qso/import", "GET /api/qso.adif", "GET /api/qrz/lookup", "POST /api/lotw/upload"]);

function tokenMatches(expected, supplied) {
  if (typeof supplied !== "string" || !supplied) return false;
  const digest = value => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(expected), digest(supplied));
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Extra keys each command may carry besides "cmd"; anything else is rejected.
const COMMAND_KEYS = Object.freeze({ level: ["name", "value"], func: ["name", "on"], tune: [], mode: ["value", "passband"], ptt: ["value", "location"], cw: ["text", "wpm", "slot"], cwstop: [] });

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
    case "cwstop":
      return { cmd };
    case "cw": {
      if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 80) return { error: "Texto CW no valido." };
      const { wpm = 20, slot = 5 } = body;
      if (!Number.isSafeInteger(wpm) || wpm < 5 || wpm > 60) return { error: "Velocidad CW no valida (5-60 WPM)." };
      if (!Number.isSafeInteger(slot) || slot < 1 || slot > 5) return { error: "Memoria de manipulador no valida (1-5)." };
      return { cmd, text: body.text, wpm, slot };
    }
    case "ptt":
      if (typeof value !== "boolean") return { error: "PTT debe ser booleano." };
      if (body.location !== undefined) {
        const loc = body.location;
        if (!loc || typeof loc !== "object" || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon) || Math.abs(loc.lat) > 90 || Math.abs(loc.lon) > 180 ||
          Object.keys(loc).some(key => key !== "lat" && key !== "lon")) return { error: "Ubicacion no valida." };
        return { cmd, value, location: { lat: loc.lat, lon: loc.lon } };
      }
      return { cmd, value };
    case "amp":
      if (value !== "operate" && value !== "standby") return { error: "Amplificador: usa operate o standby." };
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
  // Bridge between the accessories layer and the existing tune flow (AC103/AC123 raw CAT or Hamlib G TUNE).
  // Stopping only acts on a tracked raw-CAT tune; a Hamlib tune is run and ended by the radio itself.
  let bridgeClient = null;
  let lastTuneSwr = null;
  const tunerBridge = {
    async start() {
      lastTuneSwr = null;
      if (cat?.tuner) {
        const refused = await startCatTune(bridgeClient);
        if (refused) throw new Error(refused.body.error);
      } else await client.tune();
    },
    async stop() { if (tune) await pttOff("acoplador: parada"); }
  };
  const accessories = createAccessories({
    now, log, swrLimit, tuneMaxSeconds: tuneMaxMs / 1000, config: config.accessories, amplifier: options.amplifier,
    tuner: options.tuner || tunerBridge
  });
  const useTls = options.tls ?? !isLoopbackHost(host);
  const identity = useTls ? remoteTls.ensure(configDir) : null;
  const radioId = options.radioId ?? config.radioId;
  const rigMaxW = options.rigMaxPowerW ?? config.rigMaxPowerW;
  const guests = options.guestStore || remoteOps.createGuestStore({ dir: configDir, now });
  const cwMemories = options.cwMemories || createMemoryStore({ dir: configDir });
  const txLog = options.txLog || remoteOps.createTxLog({ file: path.join(configDir, "remote-txlog.jsonl"), now });
  const listenGate = remoteOps.createListenGate({ ...(options.listenLive ?? config.listenLive), now });
  const powerOffCmd = cat?.powerOff || null;
  const wantedUpdate = options.updateCheck ?? config.updateCheck;
  let ownerLabel = "";
  let ownerGuestId = null;
  let txLocation = null;
  let updateInfo = null;
  let updateTimer = null;
  if (options.relay) {
    const merged = normalizeRelay({ ...config.relay, ...options.relay });
    if (!merged) throw new Error("Rele no valido: usa --relay <url https>, --station <id> y --station-secret <secreto>.");
    config.relay = merged;
    writeConfig(configDir, config);
  }
  const relayConfig = config.relay;
  const audio = options.audioService || remoteAudio.createAudio({ ...options.audio, log });
  const audioSockets = new Set();
  // Optional rotctld rotor (options.rotor = { port, motionEnabled, park, ... }); no rotor commands are sent at startup.
  const rotor = options.rotor ? createRotor({ config: options.rotor, now: options.now, connect: options.rotorConnect }) : null;
  const relayState = { connected: false };
  const relayBackoff = { min: options.relayBackoffMinMs ?? 1000, max: options.relayBackoffMaxMs ?? 30_000 };

  const client = options.rigClient || (radioScope === "smartsdr" && options.smartsdr
    ? new SmartSdrRigClient({
      host: options.smartsdr.host, port: options.smartsdr.port, udpPort: options.smartsdr.udpPort,
      allowTx: options.smartsdr.allowTx === true, tunePower: options.smartsdr.tunePower, tuneLimit: options.smartsdr.tuneLimit,
      txCapMs: Math.min(txLimitMs, tuneMaxMs), swrLimit, reconnectMs: options.reconnectMs
    })
    : new RigctldClient({
      host: options.rigctldHost || config.rigctldHost,
      port: options.rigctldPort ?? config.rigctldPort,
      socketFactory: options.socketFactory,
      reconnectMs: options.reconnectMs,
      timeoutMs: options.rigTimeoutMs,
      rawAllow: catAllowList(cat),
      rawMatchers: options.radioId === "yaesu-ftx-1" && cat ? [radioSettings.EX_RAW_MATCHER] : [],
      rawIdleMs: options.rawIdleMs
    }));

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
  let tuneResult = null;
  let hamlibRun = null;
  let tuneSeq = 0;
  let powerHead = null;
  const extraMeters = {};
  let tuneWasActive = false;
  // Remote menu settings: only radios with a sourced CAT menu map (FTX-1) get a live service; others get the read-only model.
  const settingsFamily = radioSettings.familyOf(options.radioId || "");
  const settingsService = radioSettings.createSettingsService({
    settings: options.radioId === "yaesu-ftx-1" && cat
      ? radioSettings.familySettings(settingsFamily)
      : radioSettings.familySettings(settingsFamily).map(setting => ({ ...setting, writable: false })),
    send: (command, opts) => client.sendRaw(command, { ...opts, timeoutMs: opts.timeoutMs || 2000, abandon: Boolean(opts.read) }),
    isTransmitting: () => (client.connected ? Boolean(rig.ptt || agentTx || tune || swrTripped) : null),
    now, log
  });
  let stopping = 0;
  let emergency = false;
  let retryTimer = null;
  let meterBusy = false;
  let meterGen = 0;
  let pttEpoch = 0;
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
  const isTransmitting = () => Boolean(rig.ptt || agentTx || tune);
  const stationDevices = options.stationDevices || stationDevicesLib.createStationDevices({
    devices: stationDevicesLib.devicesFromConfig(config.devices, { isTransmitting, serialFactory: options.serialFactory }),
    isTransmitting
  });
  let rotorLockHeld = false;

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
      cw: { enabled: cwGuard.enabled, active: Boolean(cwGuard.active()), maxSeconds: cwMaxSeconds },
      tune: tune ? { kind: tunerKind, seconds: Math.max(0, Math.floor((now() - tune.startedAt) / 1000)), maxSeconds: Math.round(tuneMaxMs / 1000) } : null,
      tuneResult: tuneResult ? { ...tuneResult } : null,
      meters: metersView(),
      notice: notice && now() - notice.at < NOTICE_MS ? { id: notice.id, text: notice.text } : null,
      accessories: accessories.snapshot(),
      operator: !active ? null : owner === clientId ? "me" : "other",
      relay: { configured: Boolean(relayConfig), connected: relayState.connected }
    };
  }

  function setNotice(text) {
    notice = { id: (notice?.id || 0) + 1, text, at: now() };
  }

  // Normalized meters for the consoles (remote-meters.cjs): TX meters while keyed, the S-meter in RX.
  function metersView() {
    const out = {};
    if (rig.ptt && tx) {
      for (const key of ["po", "swr", "alc"]) {
        if (tx[key] === null) continue;
        out[key] = cat ? normalizeMeter(key, tx[key], { head: powerHead }) : normalizeLevel(key, tx[key]);
      }
      for (const [key, value] of Object.entries(extraMeters)) out[key] = normalizeMeter(key, value);
    } else if (Number.isFinite(rig.smeter)) out.smeter = normalizeLevel("smeter", rig.smeter);
    return out;
  }

  // Remote CW (remote-cw.cjs): the radio's own keyer sends the text; the guard is off by default, one message at a time and time capped.
  const cwGuard = createCwGuard({
    enabled: options.cwEnabled ?? config.cwEnabled === true,
    now,
    isBlocked: () => swrTripped || emergency || tune !== null || rig.ptt || closing
  });
  const cwMaxSeconds = options.cwMaxSeconds ?? config.cwMaxSeconds ?? 60;
  let cwTimer = null;

  // QSO book, ADIF, optional QRZ.com lookup and operator-triggered LoTW upload (remote-qsl.cjs). Nothing here keys the radio.
  const qsl = remoteQsl.createQslService({
    dir: configDir, config, now, log, request: options.qslRequest, spawn: options.qslSpawn, tmpdir: options.qslTmpdir
  });

  async function cwHalt() {
    clearTimeout(cwTimer);
    cwTimer = null;
    const steps = cwGuard.stop();
    if (!client.connected) return;
    for (const step of steps) {
      try { await client.sendKeyer(step, { priority: true }); } catch (error) { log(`CW stop: ${error.message}`); }
    }
  }

  async function startCw(command) {
    if (!cwGuard.enabled) return { status: 403, body: { error: "El CW remoto esta desactivado (accion explicita del operador)." } };
    const radio = options.radio;
    let plan;
    try {
      const planOptions = { wpm: command.wpm, slot: command.slot, maxSeconds: cwMaxSeconds };
      plan = planCwSend(radio, command.text, planOptions);
      // The CI-V frame has no transport through rigctld here: Icom models use the Hamlib send_morse baseline.
      if (plan.via === "civ") plan = planCwSend({ ...radio, id: "hamlib-baseline" }, command.text, planOptions);
    } catch (error) {
      if (error.name !== "CwError") throw error;
      return { status: error.code === "unsourced" ? 501 : 400, body: { error: error.message } };
    }
    try { cwGuard.authorize(plan); }
    catch (error) { return { status: error.code === "busy" ? 409 : error.code === "blocked" ? 423 : 403, body: { error: error.message } }; }
    try {
      if (plan.via === "hamlib") await client.sendMorse(plan.text);
      else for (const step of plan.steps) await client.sendKeyer(step);
    } catch (error) {
      await cwHalt();
      return { status: 502, body: { error: `rigctld: ${error.message}` } };
    }
    cwTimer = setTimeout(() => { cwHalt(); }, (plan.seconds + 1) * 1000);
    cwTimer.unref?.();
    return null;
  }

  function setRigPtt(on) {
    // Any PTT edge starts a fresh meter generation so a read left over from the previous transmission cannot block or pollute this one.
    if (on !== rig.ptt) { pttEpoch += 1; meterGen += 1; meterBusy = false; for (const key of Object.keys(extraMeters)) delete extraMeters[key]; }
    if (on && !rig.ptt) {
      txStart = now();
      tx = { po: null, swr: null, alc: null, powerSetW: null, source: cat ? "raw" : "hamlib", fraction: { po: null, swr: null, alc: null } };
      swrSince = 0;
      meterCycle = 0;
      const pct = rig.levels.rfpower;
      txLog.begin({
        operator: ownerActive() ? ownerLabel : "local", radio: radioId, freq: rig.freq,
        powerPct: Number.isFinite(pct) ? pct : null, powerW: Number.isFinite(pct) && rigMaxW ? Math.round(pct * rigMaxW * 10) / 10 : null,
        location: ownerActive() ? txLocation : null
      });
      setImmediate(pollTxMeters);
    }
    rig.ptt = on;
    if (!on) { agentTx = false; tx = null; swrSince = 0; txLocation = null; txLog.end(); audio.txRelease?.(); }
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
  async function readFinalSwrRaw(run, fresh = true) {
    if (!cat?.meters?.swr) return null;
    if (Number.isFinite(run?.lastSwr)) return run.lastSwr;
    if (!fresh || closing || !client.connected) return null;
    const cmd = cat.meters.swr;
    let timer;
    try {
      const value = await Promise.race([
        client.sendRaw(cmd, { read: true, timeoutMs: meterReadMs }).then(reply => parseRawMeter(reply, cmd)),
        new Promise(resolve => { timer = setTimeout(() => resolve(null), 800); })
      ]);
      return Number.isFinite(value) ? value : null;
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // True when the radio reports RX (TX0 / no PTT), false when still keyed, null when it cannot be read.
  async function readTxOff() {
    let timer;
    try {
      const read = cat
        ? client.sendRaw(cat.txState, { read: true, timeoutMs: meterReadMs, abandon: true }).then(reply => {
          const match = /^TX(\d);?$/.exec(reply || "");
          return match ? match[1] === "0" : null;
        })
        : client.getPtt().then(ptt => (ptt === null ? null : !ptt));
      return await Promise.race([read, new Promise(resolve => { timer = setTimeout(() => resolve(null), meterReadMs + 500); })]);
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // Keeps sending the stop sequence until one gets through (a stop that did not take).
  function startStopRetry() {
    if (emergency || closing) return;
    emergency = true;
    const retry = () => {
      if (!emergency || closing) { endEmergency(); return; }
      if (client.connected) runStop({ tuner: true }).then(ok => { if (ok) endEmergency(); });
    };
    retry();
    retryTimer = setInterval(retry, hangRetryMs);
    retryTimer.unref?.();
  }

  const reasonCode = reason => {
    if (reason === "sin latido") return "heartbeat";
    if (reason === "limite de TX") return "tx-limit";
    if (reason.startsWith("tiempo máximo")) return "time-cap";
    if (reason === "ROE alta") return "swr-trip";
    if (reason.startsWith("Hi-SWR")) return "hi-swr";
    if (reason === "cierre del agente") return "closing";
    return "operator";
  };

  // Ends a tune exactly once: final SWR, stop sequence, TX-off readback, then the result is kept in tuneResult.
  // `tune` stays set until the very end so nothing else (poll, watchdog, SWR trip) can re-enter or clear it early.
  // `outcome` null = the radio left tune by itself; time-cap is reported as "timeout", every other cut as "fail".
  function endTune(run, outcome, reason, detail = "") {
    if (run.ending) return run.ending;
    run.ending = (async () => {
      const check = run.check;
      if (outcome) check.cut(outcome, reason);
      else if (!check.finished()) check.cut("fail", "other");
      check.tick(Math.max(0, Math.round((now() - run.startedAt) / 1000)));
      // Any cut stops the transmitter first: only the last SWR already read while keyed is used, never a new read.
      const settled = !outcome;
      // Hamlib radios already report the SWR as a ratio; raw-CAT radios report RM6 0-255 (one shared conversion).
      let swrRaw = null;
      let ratio = null;
      if (run.kind === "hamlib") ratio = Number.isFinite(run.lastSwr) ? run.lastSwr : null;
      else {
        swrRaw = await readFinalSwrRaw(run, settled);
        ratio = Number.isFinite(swrRaw) ? Math.min(99, swrFromRaw(swrRaw)) : null;
      }
      check.finalSwr(ratio);
      check.stopping();
      setRigPtt(false);
      if (await runStop({ tuner: true })) endEmergency();
      let off = await readTxOff();
      for (let attempt = 0; off !== true && attempt < 2 && !closing && client.connected; attempt += 1) {
        await runStop({ tuner: true });
        off = await readTxOff();
      }
      if (off !== true && !closing) startStopRetry();
      check.verified(off === true);
      const result = check.result();
      const swrText = Number.isFinite(swrRaw) ? ` (ROE bruta ${Math.round(swrRaw)}/255)` : ratio !== null ? ` (ROE ${ratio.toFixed(1)}:1)` : "";
      let text;
      if (result.reason === "not-started") text = TUNE_FAILED;
      else if (result.reason === "unconfirmed") text = "La radio no ha confirmado la sintonía (Hamlib no informa del estado del sintonizador)";
      else if (result.reason === "tx-stuck") text = "Sintonía terminada pero la radio sigue en TX: se reintenta la parada";
      else if (result.reason === "swr-high") text = `Sintonía terminada con ROE alta${swrText}`;
      else if (!outcome) text = TUNE_DONE + swrText;
      else if (reason === "time-cap" && run.kind === "atas") text = `Sintonía cortada a los ${result.seconds} s${swrText}: la antena no ha sintonizado`;
      else text = `Sintonía abortada: ${detail || reason}${swrText}`;
      log(outcome || result.outcome !== "success" ? `Sintonía abortada: ${detail || reason || result.reason}` : TUNE_DONE + swrText);
      tuneSeq += 1;
      tuneResult = { id: tuneSeq, ...result, swrRaw: Number.isFinite(swrRaw) ? Math.round(swrRaw) : null, at: now() };
      setNotice(text);
      if (tune === run) tune = null;
      if (hamlibRun === run) hamlibRun = null;
    })();
    return run.ending;
  }

  async function pttOff(reason) {
    log(`PTT off: ${reason}`);
    if (cwGuard.active()) cwHalt();
    const run = tune || hamlibRun;
    if (run) {
      const code = reasonCode(reason);
      // A cut at the time cap is a timeout (not a failure); every other cut is a failure.
      await endTune(run, code === "time-cap" ? "timeout" : "fail", code, reason).catch(error => log(`sintonía: ${error.message}`));
      if (tune === run) tune = null;
      if (hamlibRun === run) hamlibRun = null;
      return;
    }
    setRigPtt(false);
    if (await runStop({ tuner: false })) endEmergency();
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
    cwGuard.stop();
    clearTimeout(cwTimer);
    if (tune) tuneWasActive = true;
    tune = null;
    hamlibRun = null;
    setRigPtt(false);
    accessories.standby("disconnect");
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
        if (key === "swr" && run && tune === run && Number.isFinite(value)) {
          // A zero read is what the radio reports once it is back in RX (the tuner drops to RX before the tune loop notices), so it never replaces a real TX reading.
          if (value > 0 || !Number.isFinite(run.lastSwr)) { run.lastSwr = value; lastTuneSwr = value; }
        }
        setMeter(key, value);
      } catch (error) {
        if (error.code !== "rejected") throw error;
        meterOff.add(key);
        log(`medidor ${key} no disponible: ${error.message}`);
      }
    }
    if (meterCycle % 5 === 0 && live()) {
      try {
        const reply = await client.sendRaw(cat.power, { read: true, timeoutMs: meterReadMs, abandon: true });
        const watts = parsePower(reply);
        if (live() && watts !== null) { tx.powerSetW = watts; powerHead = parsePowerFrame(reply)?.head ?? null; }
      } catch (error) { if (error.code !== "rejected") throw error; }
    }
  }

  // COMP, ID and VDD are read less often and after the SWR check, so a slow or refused read never delays the trip.
  async function readExtraMeters(gen) {
    for (const key of ["comp", "id", "vdd"]) {
      const cmd = cat.meters[key];
      if (!cmd || meterOff.has(key)) continue;
      if (gen !== meterGen || !rig.ptt || !tx) return;
      try {
        const value = parseRawMeter(await client.sendRaw(cmd, { read: true, timeoutMs: meterReadMs, abandon: true }), cmd);
        if (gen === meterGen && rig.ptt && value !== null) extraMeters[key] = value;
      } catch (error) {
        if (error.code === "rejected") meterOff.add(key);
      }
    }
  }

  // Radios without a raw-CAT override: only the meters Hamlib advertises, shown as they come.
  async function readHamlibMeters(gen) {
    for (const [key, name] of [["po", "RFPOWER_METER_WATTS"], ["swr", "SWR"], ["alc", "ALC"]]) {
      if (gen !== meterGen || !rig.ptt || !tx) return;
      if (!caps.level[name]?.get || meterOff.has(key)) continue;
      const value = await client.getLevel(name, { timeoutMs: meterReadMs });
      if (gen !== meterGen || !rig.ptt || !tx) return;
      if (value === null) meterOff.add(key);
      else {
        setMeter(key, round3(value));
        if (key === "swr" && hamlibRun) hamlibRun.lastSwr = value;
      }
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
    accessories.standby("swr");
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
          if (cat && gen === meterGen && meterCycle % 5 === 1) await readExtraMeters(gen);
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
    const live = () => tune === run && !run.ending;
    try {
      while (!expired && !closing && live()) {
        try {
          if (/^TX[12];?$/.test(await client.sendRaw(cat.txState, { read: true }) || "")) return true;
        } catch (error) { if (error.code !== "rejected") throw error; }
        if (expired || !live()) break;
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

  // Polls the radio until the tune ends. Limits (time, Hi-SWR, raw SWR, heartbeat) are enforced by watchTx/checkSwr,
  // so a stuck poll can never keep a tune alive.
  async function tuneLoop(run) {
    while (tune === run && !run.ending && !closing) {
      await sleep(tuneStatusMs);
      if (tune !== run || run.ending || closing) return;
      try {
        const info = await readTuneInfo();
        if (tune !== run || run.ending) return;
        if (info) {
          if (info.tuning || info.tx > 0) run.seen = true;
          run.hiSwrSince = info.hiSwr ? run.hiSwrSince || now() : 0;
          if (run.seen && !info.tuning && info.tx === 0) { await endTune(run, null); return; }
        }
      } catch (error) {
        if (typeof error.code !== "number" && error.code !== "rejected") log(`sintonía: ${error.message}`);
      }
    }
  }

  const newTuneRun = (clientId, kind) => ({
    owner: clientId, startedAt: now(), hiSwrSince: 0, seen: false, kind, lastSwr: null, ending: null,
    check: new TuneCheck({ kind, swrLimit, maxSeconds: Math.round(tuneMaxMs / 1000) })
  });

  // Tune is refused above TUNE_POWER_MAX_W (remote-meters.cjs): the operator lowers the power, it is never changed here.
  async function tunePowerGate() {
    let watts = null;
    try {
      const reply = await client.sendRaw(cat.power, { read: true, timeoutMs: meterReadMs });
      watts = parsePower(reply);
      const frame = parsePowerFrame(reply);
      if (frame) powerHead = frame.head;
    } catch { watts = null; }
    const verdict = tunePowerCheck(watts);
    if (verdict.ok) return null;
    const unknown = verdict.reason === "unknown";
    const error = unknown
      ? "No se puede leer la potencia configurada: no se sintoniza sin conocerla."
      : `Baja la potencia a ${verdict.maxW} W o menos antes de sintonizar (ahora ${verdict.watts} W). La potencia no se cambia sola.`;
    log(error);
    return { status: 409, body: { error, code: unknown ? "tune-power-unknown" : "tune-power-high", powerSetW: verdict.watts, maxW: verdict.maxW } };
  }

  async function startCatTune(clientId) {
    const refused = await tunePowerGate();
    if (refused) return refused;
    const run = newTuneRun(clientId, tunerKind);
    run.check.confirming();
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
        if (run.ending) return { status: 409, body: { error: "Sintonía cancelada." } };
        await endTune(run, "fail", "not-started");
        return { status: 502, body: { error: TUNE_FAILED } };
      }
    } catch (error) {
      if (tune === run) endTune(run, "fail", "error", error.message).catch(() => {});
      throw error;
    }
    if (tune !== run || run.ending) return { status: 409, body: { error: "Sintonía cancelada." } };
    run.seen = true;
    run.check.entered();
    log(`Sintonía iniciada (${tunerKind})`);
    tuneLoop(run);
    return null;
  }

  // Radios without a raw-CAT tuner (Hamlib G TUNE): bounded by the same cap and checked by Hamlib's own PTT readback.
  // The tune is not owned by the agent (no agentTx), so only the cap, the SWR trip and the final TX-off check apply.
  async function startHamlibTune(clientId) {
    await client.tune();
    const run = newTuneRun(clientId, "hamlib");
    run.check.confirming();
    hamlibRun = run;
    hamlibTuneWatch(run);
  }

  async function hamlibTuneWatch(run) {
    let keyed = false;
    while (hamlibRun === run && !run.ending && !closing) {
      await sleep(tuneStatusMs);
      if (hamlibRun !== run || run.ending || closing) return;
      const elapsed = now() - run.startedAt;
      const off = await readTxOff();
      if (off === false && !keyed) { keyed = true; run.check.entered(); }
      if (keyed && off === true) { await endTune(run, null); return; }
      if (elapsed >= tuneMaxMs) { await endTune(run, "timeout", "time-cap"); return; }
      if (!keyed && elapsed >= tuneWatchMs) { await endTune(run, "fail", "unconfirmed"); return; }
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
      const epoch = pttEpoch;
      const genBefore = meterGen;
      const ptt = await client.getPtt();
      // A read that was in flight while PTT changed or a stop ran is stale and must not re-key the state; the next poll sees the settled state.
      if (ptt !== rig.ptt && !tune && epoch === pttEpoch && genBefore === meterGen && stopping === 0) setRigPtt(ptt);
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
    // Rotors stop when the operator that moved them goes idle or disconnects.
    if (rotorLockHeld && !ownerActive()) { rotorLockHeld = false; stationDevices.safeAll().catch(() => {}); }
    checkHung();
    accessories.tick().catch(() => {});
    if (!tune && accessories.snapshot().tuner.tuning) accessories.stopTune("done", lastTuneSwr).catch(() => {});
    // Lease: a CW message does not outlive the operator's control.
    if (cwGuard.active() && !ownerActive()) cwHalt();
    if (!agentTx || !rig.ptt) return;
    const time = now();
    if (time - lastBeat > heartbeatTimeoutMs) { accessories.standby("lease"); pttOff("sin latido"); }
    else if (ownerGuestId && !guests.isActiveId(ownerGuestId)) { accessories.standby("lease"); pttOff("invitado revocado o caducado"); }
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
    accessories.emergencyStop("emergency");
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

  // Returns { role: "owner" | "guest", label, guest } or null. Guest tokens are separate per invitation and revocable.
  function identify(request, url) {
    const header = request.headers.authorization || "";
    const candidates = [header.startsWith("Bearer ") ? header.slice(7) : ""];
    if (url.pathname === "/api/events") candidates.push(url.searchParams.get("token") || "");
    for (const supplied of candidates) {
      if (tokenMatches(config.token, supplied)) return { role: "owner", label: config.callsign || "owner", guest: null };
      const guest = guests.authenticate(supplied);
      if (guest) return { role: "guest", label: guest.label, guest };
    }
    return null;
  }

  const guestPerm = who => who.guest?.permissions[radioId] || null;

  function send(response, status, body, headers = {}) {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    response.writeHead(status, {
      "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
      ...headers
    });
    response.end(payload);
  }

  function readBody(request, limit = BODY_LIMIT) {
    return new Promise((resolve, reject) => {
      const tooBig = () => reject(Object.assign(new Error("Cuerpo demasiado grande."), { status: 413 }));
      if (Number(request.headers["content-length"]) > limit) { request.resume(); tooBig(); return; }
      let size = 0;
      let rejected = false;
      const chunks = [];
      request.on("data", chunk => {
        size += chunk.length;
        if (size > limit) {
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

  async function readJson(request, limit = BODY_LIMIT) {
    if (!/^application\/json\s*(?:;|$)/i.test(request.headers["content-type"] || "")) {
      throw Object.assign(new Error("Se requiere application/json."), { status: 415 });
    }
    try { return JSON.parse(await readBody(request, limit)); }
    catch (error) {
      if (error.status) throw error;
      throw Object.assign(new Error("JSON no valido."), { status: 400 });
    }
  }

  // Returns true when this client may control the rig (and refreshes/claims control).
  function claimControl(clientId, { acquire = true, label = "", guestId = null } = {}) {
    if (ownerActive() && owner !== clientId) return false;
    if (acquire || owner === clientId) {
      owner = clientId;
      ownerSeen = now();
      if (acquire) { ownerLabel = label; ownerGuestId = guestId; }
    }
    return true;
  }

  async function applyCommand(command, clientId, who = null) {
    // Stopping CW is never refused.
    if (command.cmd === "cwstop") {
      await cwHalt();
      return { status: 200, body: { ok: true, state: snapshot(clientId) } };
    }
    if (command.cmd === "amp" && command.value === "standby") {
      await accessories.standby("operator");
      return { status: 200, body: { ok: true, state: snapshot(clientId) } };
    }
    if (who?.guest) {
      const perm = guestPerm(who);
      const keys = (command.cmd === "ptt" && command.value === true) || command.cmd === "tune" || command.cmd === "cw";
      let refusal = remoteOps.guestCommandRefusal(perm, command);
      if (!refusal && keys) refusal = remoteOps.guestTxRefusal(perm, { freq: rig.freq, rfpower: rig.levels.rfpower, rigMaxW });
      if (!refusal && command.cmd === "level" && command.name === "RFPOWER") {
        const cap = remoteOps.powerCapFraction(perm, rigMaxW);
        if (cap === null || command.value > cap + 1e-9) refusal = "Potencia por encima del limite del invitado.";
      }
      if (refusal) return { status: 403, body: { error: refusal } };
    }
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
        case "freq":
          await client.setFreq(command.value);
          rig.freq = command.value;
          await accessories.followBand(command.value, { tx: rig.ptt });
          break;
        case "amp": {
          // Standby is always allowed; operate is refused while transmitting, tuning or after a SWR trip.
          if (command.value === "standby") { await accessories.standby("operator"); break; }
          const result = await accessories.operate({ tx: rig.ptt, tuning: tune !== null, swrTripped });
          if (!result.ok) return { status: 409, body: { error: `Amplificador: ${result.reason}` } };
          break;
        }
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
          if (accessories.snapshot().tuner.supported) {
            // A configured tuner goes through the accessories layer: explicit request, low power, time cap, no amplifier in operate.
            const rated = config.accessories?.tuner?.ratedPowerW;
            const fraction = rig.levels.rfpower;
            bridgeClient = clientId;
            const started = await accessories.startTune({
              tx: rig.ptt,
              powerW: Number.isFinite(rated) && Number.isFinite(fraction) ? rated * fraction : undefined
            });
            if (!started.ok) {
              return { status: started.reason === "driver_error" ? 502 : 409, body: { error: started.error || `Acoplador: ${started.reason}` } };
            }
          } else if (cat?.tuner) {
            const refused = await startCatTune(clientId);
            if (refused) return refused;
          } else {
            if (hamlibRun) return { status: 409, body: { error: "Sintonía en curso." } };
            await startHamlibTune(clientId);
          }
          break;
        case "cw": {
          const refused = await startCw(command);
          if (refused) return refused;
          break;
        }
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
            txLocation = command.location || null;
            if (cwGuard.active()) await cwHalt();
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
    const clientIp = request.socket.radicodexTunnel ? String(request.headers["x-forwarded-for"] || "").split(",").pop().trim() || request.socket.remoteAddress : request.socket.remoteAddress;
    if (request.method === "GET" && url.pathname === "/api/listen/state") {
      // Public read-only view of "listen live": off by default, rate limited, never any control or token.
      const gate = listenGate.admit(`ip:${clientIp}`);
      if (!gate.ok) { send(response, gate.reason === "disabled" ? 404 : 429, { error: gate.reason === "disabled" ? "No encontrado." : "Demasiadas peticiones." }); return; }
      gate.release();
      send(response, 200, { radio: radioId, freq: rig.freq, mode: rig.mode, smeter: rig.smeter, audio: { rx: Boolean(audio.rx) } });
      return;
    }
    const who = identify(request, url);
    if (!who) {
      send(response, 401, { error: "Token no valido." }, { "WWW-Authenticate": "Bearer" });
      return;
    }
    const owner_ = who.role === "owner";
    const clientId = clientIdOf(request, url);
    const route = `${request.method} ${url.pathname}`;
    if (who.guest && !guestPerm(who)) { send(response, 403, { error: "Sin permiso en esta radio." }); return; }
    if (route === "GET /api/radios") {
      send(response, 200, { radios: [{ id: radioId, label: config.radioLabel || radioId, connected: client.connected, busy: ownerActive(), transmitting: rig.ptt, power: remoteOps.powerSupport(radioId) }] });
      return;
    }
    if (route === "GET /api/me") {
      const perm = guestPerm(who);
      send(response, 200, { role: who.role, label: who.label, radio: radioId, transmit: owner_ ? true : perm.transmit, bands: perm?.bands || [], maxPowerW: perm?.maxPowerW ?? null });
      return;
    }
    if (route.startsWith("GET /api/guests") || route.startsWith("POST /api/guests") || route.startsWith("GET /api/txlog") || route === "POST /api/power" || route === "GET /api/update") {
      if (!owner_) { send(response, 403, { error: "Solo el propietario." }); return; }
      if (route === "GET /api/guests") { send(response, 200, { guests: guests.list() }); return; }
      if (route === "GET /api/txlog") { send(response, 200, { entries: txLog.entries() }); return; }
      if (route === "GET /api/txlog.csv") {
        send(response, 200, txLog.toCsv(), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tx-log.csv"' });
        return;
      }
      if (route === "GET /api/update") { send(response, 200, { enabled: wantedUpdate.enabled, info: updateInfo }); return; }
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      if (route === "POST /api/guests") {
        const result = guests.invite({ label: body?.label, ttlHours: body?.ttlHours, permissions: { [radioId]: { transmit: body?.transmit === true, bands: body?.bands, maxPowerW: body?.maxPowerW } } });
        if (result.error) { send(response, 400, { error: result.error }); return; }
        send(response, 201, { guest: result.guest, token: result.token });
        return;
      }
      if (route === "POST /api/guests/revoke") {
        if (!guests.revoke(body?.id)) { send(response, 404, { error: "Invitado desconocido." }); return; }
        if (ownerGuestId === body.id && (rig.ptt || agentTx)) await pttOff("invitado revocado");
        send(response, 200, { ok: true });
        return;
      }
      if (route === "POST /api/power") {
        if (body?.on !== false && body?.on !== true) { send(response, 400, { error: "Estado no valido." }); return; }
        if (body.on || !powerOffCmd) { send(response, 501, { error: "Orden de encendido/apagado pendiente de fuente para esta radio." }); return; }
        if (body.confirm !== true) { send(response, 400, { error: "Confirma el apagado de la radio." }); return; }
        if (rig.ptt || agentTx || tune) { send(response, 409, { error: "Apagado bloqueado durante TX." }); return; }
        if (!client.connected) { send(response, 503, { error: "Radio sin conexion." }); return; }
        if (!claimControl(clientId, { label: who.label })) { send(response, 409, { error: "Otro operador tiene el control." }); return; }
        try { await client.sendRaw(powerOffCmd); }
        catch (error) { send(response, 502, { error: `rigctld: ${error.message}` }); return; }
        send(response, 200, { ok: true });
        return;
      }
      send(response, 404, { error: "No encontrado." });
      return;
    }
    if (QSL_ROUTES.includes(route)) {
      // Credentials and TQSL stay at the agent; only the owner reaches the QSO book, the lookup and the LoTW upload.
      if (!owner_) { send(response, 403, { error: "Solo el propietario." }); return; }
      let result;
      if (route === "GET /api/qso") result = qsl.list();
      else if (route === "GET /api/qso.adif") result = await qsl.exportAdif();
      else if (route === "GET /api/qrz/lookup") result = await qsl.lookup(url.searchParams.get("call"));
      else {
        let body;
        try { body = await readJson(request, route === "POST /api/qso/import" ? remoteQsl.IMPORT_LIMIT_BYTES : BODY_LIMIT); }
        catch (error) { send(response, error.status || 400, { error: error.message }); return; }
        if (route === "POST /api/qso") result = await qsl.add(body);
        else if (route === "POST /api/qso/import") result = await qsl.importAdif(body);
        else result = await qsl.uploadLotw(body);
      }
      send(response, result.status, result.body, result.headers);
      return;
    }
    if (route === "GET /api/state") { send(response, 200, snapshot(clientId)); return; }
    if (route === "GET /api/cw/memories" || route === "POST /api/cw/memories") {
      // Listen-only guests get no CW at all; everyone else has their own F1-F8 set, stored here.
      const refusal = remoteOps.guestCommandRefusal(who.guest ? guestPerm(who) : { transmit: true }, { cmd: "cw" });
      if (refusal) { send(response, 403, { error: refusal }); return; }
      const operator = who.guest ? `guest:${who.guest.id}` : "owner";
      if (route === "GET /api/cw/memories") { send(response, 200, { memories: cwMemories.get(operator) }); return; }
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      try { send(response, 200, { memories: cwMemories.set(operator, body?.memories) }); }
      catch (error) {
        if (!(error instanceof CwError)) throw error;
        send(response, 400, { error: error.message });
      }
      return;
    }
    if (route === "GET /api/config") {
      send(response, 200, { callsign: config.callsign, radioScope, audio: { rx: Boolean(audio.rx), tx: Boolean(audio.tx) } });
      return;
    }
    if (route === "GET /api/rotor" || route === "POST /api/rotor") {
      if (!rotor) { send(response, 503, { error: "rotor_not_configured" }); return; }
      try {
        if (request.method === "GET") {
          send(response, 200, await rotor.snapshot({ readPositionNow: url.searchParams.get("command") === "position", clientId }));
          return;
        }
        const body = await readJson(request);
        send(response, 200, await rotor.operate(body, clientId));
      } catch (error) {
        if (error instanceof RotorError) send(response, error.status, { error: error.code });
        else send(response, error.status || 500, { error: error.message || "Error interno." });
      }
      return;
    }
    if (route === "GET /api/events") {
      response.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      const entry = { response, clientId, last: "" };
      sseClients.add(entry);
      response.on("close", () => { sseClients.delete(entry); rotor?.release(clientId); });
      response.write("retry: 1000\n\n");
      pushState(entry, true);
      return;
    }
    if (route === "GET /api/devices") { send(response, 200, await stationDevices.status()); return; }
    if (route === "POST /api/devices/cmd") {
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      const stop = body?.command === "stop";
      // Stop never needs the operator lock; every other device command does.
      if (stop) claimControl(clientId, { acquire: false });
      else if (body?.command !== "read" && !claimControl(clientId)) { send(response, 409, { error: "Otro operador tiene el control." }); return; }
      try {
        const result = await stationDevices.command(String(body?.id), body);
        if (body?.command === "move") rotorLockHeld = true;
        if (stop) rotorLockHeld = false;
        send(response, 200, { ok: true, result });
      } catch (error) {
        send(response, error.status || 502, { error: error.message, code: error.code });
      }
      return;
    }
    if (route === "POST /api/heartbeat") {
      // Latency probes must not keep an idle operator's control alive; only a held PTT does.
      if (ownerActive() && owner !== clientId) { send(response, 409, { error: "Otro operador tiene el control." }); return; }
      if (owner === clientId && ((rig.ptt && agentTx) || cwGuard.active())) { lastBeat = now(); ownerSeen = now(); }
      send(response, 200, { ok: true });
      return;
    }
    if (route === "POST /api/cmd") {
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      const command = validateCommand(body, rig);
      if (command.error) { send(response, command.status || 400, { error: command.error }); return; }
      // Releasing PTT or stopping CW is never rate limited or refused: it must always be possible to stop transmitting.
      const release = (command.cmd === "ptt" && command.value === false) || (command.cmd === "amp" && command.value === "standby") || command.cmd === "cwstop";
      if (!release) {
        const time = now();
        while (commandTimes.length && time - commandTimes[0] >= 1000) commandTimes.shift();
        if (commandTimes.length >= CMD_RATE_LIMIT) { send(response, 429, { error: "Demasiados comandos." }); return; }
        commandTimes.push(time);
      }
      if (release) claimControl(clientId, { acquire: false });
      else {
        // A guest that will be refused must not take the operator lock.
        const refusal = who.guest ? remoteOps.guestCommandRefusal(guestPerm(who), command) : null;
        if (refusal) { send(response, 403, { error: refusal }); return; }
        if (!claimControl(clientId, { label: who.label, guestId: who.guest?.id || null })) {
          send(response, 409, { error: "Otro operador tiene el control." });
          return;
        }
      }
      const result = await applyCommand(command, clientId, who);
      send(response, result.status, result.body);
      return;
    }
    if (route === "GET /api/settings") {
      send(response, 200, {
        radioId: options.radioId || null, family: settingsFamily, settings: settingsService.list(),
        warning: "Never transmit without a matched load or antenna. Settings are refused while transmitting."
      });
      return;
    }
    if (route === "GET /api/settings/value") {
      if (!(options.radioId === "yaesu-ftx-1" && cat)) { send(response, 501, { ok: false, error: "Live settings reads are not wired for this radio on the Node shack (model is read-only)." }); return; }
      send(response, ...Object.values(await settingsService.read(url.searchParams.get("id") || "")));
      return;
    }
    if (route === "POST /api/settings") {
      let body;
      try { body = await readJson(request); }
      catch (error) { send(response, error.status || 400, { error: error.message }); return; }
      // The bearer-token holder who owns control is the operator; a second client is a viewer.
      const role = claimControl(clientId) ? radioSettings.OPERATOR_ROLE : "viewer";
      const result = await settingsService.write(typeof body?.id === "string" ? body.id : "", body?.value, { role });
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
      const ownerOk = body?.type === "auth" && tokenMatches(config.token, body.token);
      const guest = body?.type === "auth" && !ownerOk ? guests.authenticate(body.token) : null;
      const guestOk = Boolean(guest?.permissions[radioId]);
      // Public listen-live: no token, RX only, gated (off by default, rate limited).
      let listen = null;
      if (body?.type === "auth" && !ownerOk && !guestOk && body.listen === true) {
        const gate = listenGate.admit(fallbackId);
        if (gate.ok) listen = gate;
      }
      if (!body || (!ownerOk && !guestOk && !listen) || audioSockets.size > AUDIO_MAX_CLIENTS) {
        listen?.release();
        ws.close(4401, "auth");
        return;
      }
      if (listen) {
        state.listen = listen;
        state.canTx = false;
      } else state.canTx = ownerOk || Boolean(guest.permissions[radioId].transmit);
      state.guestId = guest?.id || null;
      clearTimeout(authTimer);
      state.authed = true;
      state.cid = listen ? `listen:${fallbackId}` : typeof body.cid === "string" && /^[\w-]{1,64}$/.test(body.cid) ? body.cid : fallbackId;
      const hello = { type: "hello" };
      if (audio.rx) hello.rx = { ...AUDIO_FRAME };
      if (!listen && (audio.tx || audio.txReason)) {
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
      if (!state.canTx) { refuse("Sin permiso de TX."); return; }
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
      // Unkey first: nothing may delay or skip T 0 when the PTT owner's socket goes away.
      try {
        if (state.authed && owner === state.cid && (rig.ptt || agentTx)) pttOff("socket de audio cerrado");
      } finally {
        clearTimeout(authTimer);
        clearInterval(pingTimer);
        audioSockets.delete(ws);
        state.listen?.release();
        unsubscribeRx();
      }
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

  // Idle-only, opt-in: downloads a signed release asset and tells the operator; installing stays a manual step.
  async function runUpdateCheck() {
    const idle = !rig.ptt && !agentTx && !tune && !ownerActive();
    if (!wantedUpdate.enabled || !idle || closing) return null;
    const http = async (url, kind) => {
      const reply = await fetch(url, { headers: { "User-Agent": "BricohamsRemoteShack" }, signal: AbortSignal.timeout(30_000), redirect: "follow" });
      if (!reply.ok) throw new Error(`HTTP ${reply.status}`);
      return kind === "json" ? reply.json() : reply.arrayBuffer();
    };
    try {
      updateInfo = await remoteOps.checkForUpdate({
        currentVersion: options.currentVersion ?? require("./package.json").version, assetName: wantedUpdate.asset,
        fetchJson: options.updateFetchJson || (url => http(url, "json")), fetchBytes: options.updateFetchBytes || (url => http(url, "bytes")),
        saveDir: path.join(configDir, "updates")
      });
      if (updateInfo.status === "downloaded") setNotice(`Actualizacion ${updateInfo.version} descargada y verificada (SHA-256 ${updateInfo.sha256.slice(0, 12)}...). Instalala manualmente.`);
    } catch (error) { log(`actualizacion: ${error.message}`); }
    return updateInfo;
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
    if (wantedUpdate.enabled) {
      updateTimer = setInterval(runUpdateCheck, options.updateEveryMs ?? 6 * 3_600_000);
      updateTimer.unref?.();
    }
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
    clearInterval(updateTimer);
    endEmergency();
    // PTT off first; CW, accessories and station devices are made safe even if it fails.
    try {
      if (client.connected && (rig.ptt || agentTx || tune || hamlibRun)) await pttOff("cierre del agente");
    } finally {
      try { if (cwGuard.active()) await cwHalt(); } catch { /* CW stop is best effort */ }
      clearTimeout(cwTimer);
      try { await accessories.emergencyStop("close"); }
      finally { await stationDevices.safeAll().catch(() => {}); }
    }
    client.stop();
    for (const ws of audioSockets) { ws.fail(1001, "shutdown"); ws.socket.destroy(); }
    audio.close?.();
    await rotor?.close();
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
    server, client, token: config.token, config, start, close, snapshot, relayLinks, notify, guests, txLog, runUpdateCheck,
    tls: useTls, fingerprint: identity ? identity.fingerprint : ""
  };
}

function parseArgs(argv, env = process.env) {
  const args = { listen: env.REMOTE_LISTEN || "127.0.0.1" };
  const flags = {
    "--listen": "listen", "--port": "port", "--rigctld-host": "rigctldHost", "--rigctld-port": "rigctldPort",
    "--config-dir": "configDir", "--relay": "relayUrl", "--station": "relayStation",
    "--station-secret": "relaySecret", "--audio-input": "audioInput", "--audio-output": "audioOutput",
    "--rotor-port": "rotorPort", "--rotor-park": "rotorPark", "--rotor-offset": "rotorOffset",
    "--smartsdr-host": "smartsdrHost", "--smartsdr-port": "smartsdrPort"
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--tls" || argv[i] === "--no-tls") { args.tls = argv[i] === "--tls"; continue; }
    if (argv[i] === "--rotor-motion") { args.rotorMotion = true; continue; }
    if (argv[i] === "--smartsdr-allow-tx") { args.smartsdrAllowTx = true; continue; }
    const name = flags[argv[i]];
    if (!name || i + 1 >= argv.length) throw new Error(`Argumento no valido: ${argv[i]}`);
    args[name] = argv[i += 1];
  }
  for (const key of ["port", "rigctldPort", "rotorPort", "smartsdrPort"]) {
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

function rotorFromArgs(args) {
  if (args.rotorPort === undefined) return undefined;
  const pair = (text, name) => {
    const parts = String(text).split(",").map(Number);
    if (parts.length !== 2 || !parts.every(Number.isFinite)) throw new Error(`${name} requiere "azimut,elevacion".`);
    return parts;
  };
  const rotor = { port: args.rotorPort, label: "Rotor", motionEnabled: args.rotorMotion === true };
  if (args.rotorPark) { const [azimuth, elevation] = pair(args.rotorPark, "--rotor-park"); rotor.park = { azimuth, elevation }; }
  if (args.rotorOffset) [rotor.azimuthOffset, rotor.elevationOffset] = pair(args.rotorOffset, "--rotor-offset");
  return rotor;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const relay = {};
  if (args.relayUrl) relay.url = args.relayUrl;
  if (args.relayStation) relay.station = args.relayStation;
  if (args.relaySecret) relay.secret = args.relaySecret;
  const agent = createRemoteAgent({
    host: args.listen, port: args.port, rigctldHost: args.rigctldHost, rigctldPort: args.rigctldPort,
    rotor: rotorFromArgs(args),
    configDir: args.configDir, tls: args.tls, relay: Object.keys(relay).length ? relay : undefined,
    radioScope: args.smartsdrHost ? "smartsdr" : undefined,
    smartsdr: args.smartsdrHost ? { host: args.smartsdrHost, port: args.smartsdrPort, allowTx: args.smartsdrAllowTx === true } : undefined,
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
