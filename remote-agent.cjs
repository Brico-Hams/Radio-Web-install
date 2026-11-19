"use strict";
// Remote shack agent: runs next to the radio, controls it through Hamlib rigctld and exposes a small
// token-protected HTTP/SSE API plus the browser console (remote.html). Separate from server.cjs on purpose:
// the local workspace server stays 127.0.0.1-only.
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { RigctldClient } = require("./rigctld-client.cjs");

const MODES = Object.freeze(["USB", "LSB", "CW", "CWR", "AM", "FM", "WFM", "RTTY", "PKTUSB", "PKTLSB", "PKTFM"]);
const FREQ_MIN = 30_000;
const FREQ_MAX = 3_000_000_000;
const STEP_MAX = 1_000_000;
const BODY_LIMIT = 4096;
const CMD_RATE_LIMIT = 20;
const HEARTBEAT_TIMEOUT_MS = 1000;
const CONTROL_IDLE_MS = 30_000;
const STATIC_FILES = Object.freeze({
  "/": ["remote.html", "text/html; charset=utf-8"],
  "/remote.html": ["remote.html", "text/html; charset=utf-8"],
  "/remote-ui.js": ["remote-ui.js", "text/javascript; charset=utf-8"],
  "/remote.css": ["remote.css", "text/css; charset=utf-8"]
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
    rigctldHost: typeof stored.rigctldHost === "string" ? stored.rigctldHost : "127.0.0.1",
    rigctldPort: Number.isInteger(stored.rigctldPort) ? stored.rigctldPort : 4532,
    txLimitSeconds: Number(stored.txLimitSeconds) > 0 ? Number(stored.txLimitSeconds) : 180
  };
  if (!config.token) {
    config.token = crypto.randomBytes(32).toString("base64url");
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
  }
  return config;
}

function tokenMatches(expected, supplied) {
  if (typeof supplied !== "string" || !supplied) return false;
  const digest = value => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(digest(expected), digest(supplied));
}

function csp(openwebrxUrl) {
  // With a configured OpenWebRX only its origin may be framed; without one the manual URL field needs http(s).
  const frame = openwebrxUrl ? new URL(openwebrxUrl).origin : "http: https:";
  return `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src ${frame}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
}

function validateCommand(body, state) {
  const keys = Object.keys(body || {});
  if (!body || typeof body !== "object" || Array.isArray(body) || keys.some(key => key !== "cmd" && key !== "value")) {
    return { error: "Cuerpo no valido." };
  }
  const { cmd, value } = body;
  switch (cmd) {
    case "freq":
      if (!Number.isSafeInteger(value) || value < FREQ_MIN || value > FREQ_MAX) return { error: "Frecuencia fuera de rango (30 kHz-3 GHz)." };
      return { cmd, value };
    case "mode":
      if (typeof value !== "string" || !MODES.includes(value)) return { error: "Modo no permitido." };
      return { cmd, value };
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

  const client = new RigctldClient({
    host: options.rigctldHost || config.rigctldHost,
    port: options.rigctldPort ?? config.rigctldPort,
    socketFactory: options.socketFactory,
    reconnectMs: options.reconnectMs,
    timeoutMs: options.rigTimeoutMs
  });

  const rig = { freq: null, mode: null, passband: null, ptt: false, vfo: null, split: false, smeter: null };
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
      txSeconds: rig.ptt ? Math.max(0, Math.floor((now() - txStart) / 1000)) : 0,
      operator: !active ? null : owner === clientId ? "me" : "other"
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

  client.on("connect", () => {
    // Whatever happened while the link was down, make sure the rig is not transmitting.
    client.setPtt(false, { priority: true }).catch(error => log(`T 0 failed: ${error.message}`));
    schedulePoll(0);
  });
  client.on("disconnect", () => {
    setRigPtt(false);
    Object.assign(rig, { freq: null, mode: null, passband: null, vfo: null, split: false, smeter: null });
  });

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
        try { rig.vfo = await client.getVfo(); } catch (error) { if (typeof error.code !== "number") throw error; }
        try { rig.split = (await client.getSplit()).split; } catch (error) { if (typeof error.code !== "number") throw error; }
      }
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
    return /^[\w-]{1,64}$/.test(supplied) ? supplied : `ip:${request.socket.remoteAddress}`;
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
    if (command.cmd !== "ptt" && rig.ptt && agentTx) {
      return { status: 409, body: { error: "Cambio bloqueado durante TX." } };
    }
    if (!client.connected) return { status: 503, body: { error: "Radio sin conexion." } };
    try {
      switch (command.cmd) {
        case "freq": await client.setFreq(command.value); rig.freq = command.value; break;
        case "mode": await client.setMode(command.value); rig.mode = command.value; rig.passband = 0; break;
        case "vfo": await client.setVfo(command.value); rig.vfo = command.value; break;
        case "split":
          await client.setSplit(command.value, (rig.vfo || "VFOA") === "VFOA" ? "VFOB" : "VFOA");
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
    if (route === "GET /api/config") { send(response, 200, { openwebrxUrl }); return; }
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
      if (!claimControl(clientId, { acquire: false })) { send(response, 409, { error: "Otro operador tiene el control." }); return; }
      if (owner === clientId && rig.ptt && agentTx) lastBeat = now();
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

  const server = http.createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", policy);
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
  });

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
    await new Promise(resolve => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }

  return { server, client, token: config.token, config, openwebrxUrl, start, close, snapshot };
}

function parseArgs(argv, env = process.env) {
  const args = { listen: env.REMOTE_LISTEN || "127.0.0.1" };
  const flags = {
    "--listen": "listen", "--port": "port", "--rigctld-host": "rigctldHost", "--rigctld-port": "rigctldPort",
    "--openwebrx": "openwebrxUrl", "--config-dir": "configDir"
  };
  for (let i = 0; i < argv.length; i += 1) {
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
  const agent = createRemoteAgent({
    host: args.listen, port: args.port, rigctldHost: args.rigctldHost, rigctldPort: args.rigctldPort,
    openwebrxUrl: args.openwebrxUrl, configDir: args.configDir, log: message => console.log(`[remote] ${message}`)
  });
  const address = await agent.start();
  const hosts = args.listen === "0.0.0.0" || args.listen === "::" ? lanAddresses()
    : args.listen === "127.0.0.1" ? ["127.0.0.1"] : [args.listen];
  console.log(`Remote shack escuchando en ${args.listen}:${address.port}`);
  for (const ip of hosts) console.log(`Consola: http://${ip}:${address.port}/#token=${agent.token}`);
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
