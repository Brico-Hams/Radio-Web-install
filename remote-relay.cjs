"use strict";
// Remote shack relay: self-hostable rendezvous server. Station agents (remote-agent.cjs) only make OUTGOING
// connections to it; remote clients reach a station at /s/<id>/... and the relay pipes the raw bytes of each
// client connection to a fresh "data" socket the agent opens on demand, so HTTP, SSE and WebSocket all work.
// Stations are pre-registered by the admin (add-station); only sha256(secret) is stored.
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const tls = require("node:tls");
const { Transform } = require("node:stream");

const STATION_ID = /^[a-z0-9-]{3,32}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{16,64}$/;
const UPGRADE = "radicodex-tunnel/1";
const MAX_HEAD = 16 * 1024;
const HEAD_TIMEOUT_MS = 30_000;
const DATA_WAIT_MS = 5000;
const MAX_SESSIONS = 32;
const PING_MS = 20_000;
const PONG_TIMEOUT_MS = 10_000;
const AUTH_FAILS = 10;
const AUTH_WINDOW_MS = 60_000;
const HEADER_LINE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(.*)$/;

const defaultDataFile = () => path.join(os.homedir(), ".radicodex", "relay.json");
const sha256 = value => crypto.createHash("sha256").update(value).digest();
const isLoopback = address => /^(127\.|::1$|::ffff:127\.)/.test(String(address || ""));
const cleanAddress = address => String(address || "").replace(/^::ffff:/, "");

// ---- station store -------------------------------------------------------------------------------

function readStations(file) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); }
  catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`Archivo de datos corrupto: ${file}`); }
  return parsed && typeof parsed.stations === "object" && parsed.stations ? parsed.stations : {};
}

function writeStations(file, stations) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify({ version: 1, stations }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
  try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
}

function addStation(file, id) {
  if (!STATION_ID.test(String(id))) throw new Error("Identificador no valido: 3-32 caracteres [a-z0-9-].");
  const stations = readStations(file);
  if (Object.hasOwn(stations, id)) throw new Error(`La estacion ${id} ya existe.`);
  const secret = crypto.randomBytes(32).toString("base64url");
  stations[id] = { hash: sha256(secret).toString("hex"), created: new Date().toISOString() };
  writeStations(file, stations);
  return secret;
}

function removeStation(file, id) {
  const stations = readStations(file);
  if (!Object.hasOwn(stations, id)) throw new Error(`La estacion ${id} no existe.`);
  delete stations[id];
  writeStations(file, stations);
}

const listStations = file => Object.entries(readStations(file)).map(([id, item]) => ({ id, created: item.created || "" }));

// ---- HTTP head helpers ---------------------------------------------------------------------------

function parseHead(text) {
  const lines = text.split("\r\n");
  const match = /^([A-Z]{1,16}) (\/\S*) HTTP\/1\.[01]$/.exec(lines[0]);
  if (!match) return null;
  const headers = [];
  for (const line of lines.slice(1)) {
    const header = HEADER_LINE.exec(line);
    if (!header) return null;
    headers.push({ name: header[1], lower: header[1].toLowerCase(), value: header[2] });
  }
  return { method: match[1], target: match[2], version: lines[0].slice(lines[0].lastIndexOf(" ") + 1), headers };
}

const headerOf = (parsed, lower) => parsed.headers.find(item => item.lower === lower)?.value || "";

function reply(socket, status, reason, body = "", extra = {}) {
  const payload = Buffer.from(body, "utf8");
  const headers = {
    "Content-Type": "text/html; charset=utf-8", "Content-Length": payload.length, Connection: "close",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra
  };
  const lines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
  socket.end(Buffer.concat([Buffer.from(`HTTP/1.1 ${status} ${reason}\r\n${lines.join("\r\n")}\r\n\r\n`), payload]));
}

const page = (title, text) => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;background:#10151c;color:#e6edf3;display:grid;place-items:center;min-height:100vh;margin:0"><main><h1>${title}</h1><p>${text}</p></main></body></html>`;

class AuthLimiter {
  constructor(now) { this.now = now; this.hits = new Map(); }
  prune(ip) {
    const list = (this.hits.get(ip) || []).filter(time => this.now() - time < AUTH_WINDOW_MS);
    if (list.length) this.hits.set(ip, list); else this.hits.delete(ip);
    return list;
  }
  blocked(ip) { return this.prune(ip).length >= AUTH_FAILS; }
  fail(ip) {
    const list = this.prune(ip);
    list.push(this.now());
    this.hits.set(ip, list);
    if (this.hits.size > 10_000) for (const key of [...this.hits.keys()]) this.prune(key);
  }
}

// ---- relay ---------------------------------------------------------------------------------------

function createRelay(options = {}) {
  const dataFile = options.dataFile || defaultDataFile();
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const behindProxy = Boolean(options.behindProxy);
  const secure = Boolean(options.tls);
  const pingMs = options.pingIntervalMs ?? PING_MS;
  const pongMs = options.pongTimeoutMs ?? PONG_TIMEOUT_MS;
  const dataWaitMs = options.dataWaitMs ?? DATA_WAIT_MS;
  const headTimeoutMs = options.headTimeoutMs ?? HEAD_TIMEOUT_MS;
  const maxSessions = options.maxSessions ?? MAX_SESSIONS;
  const limiter = new AuthLimiter(now);
  const controls = new Map();
  const sessionCounts = new Map();
  const pending = new Map();
  const sockets = new Set();
  const dummyHash = sha256("no-such-station");

  let cache = { mtime: -1, stations: {} };
  function stationHash(id) {
    let mtime = 0;
    try { mtime = fs.statSync(dataFile).mtimeMs; } catch { mtime = -2; }
    if (mtime !== cache.mtime) {
      try { cache = { mtime, stations: readStations(dataFile) }; } catch { cache = { mtime, stations: {} }; }
    }
    const entry = Object.hasOwn(cache.stations, id) ? cache.stations[id] : null;
    return entry && /^[0-9a-f]{64}$/.test(entry.hash) ? Buffer.from(entry.hash, "hex") : null;
  }
  const stationExists = id => stationHash(id) !== null;

  function clientInfo(socket, parsed) {
    const trusted = behindProxy && isLoopback(socket.remoteAddress);
    let ip = cleanAddress(socket.remoteAddress);
    let proto = secure ? "https" : "http";
    if (trusted) {
      const forwarded = headerOf(parsed, "x-forwarded-for").split(",").map(item => item.trim()).filter(Boolean);
      if (forwarded.length) ip = cleanAddress(forwarded[forwarded.length - 1]);
      const given = headerOf(parsed, "x-forwarded-proto").split(",")[0].trim().toLowerCase();
      if (given === "https" || given === "http") proto = given;
    }
    return { ip: ip || "unknown", proto };
  }

  function bearerOk(id, parsed) {
    const header = headerOf(parsed, "authorization");
    const supplied = /^Bearer (\S+)$/.exec(header)?.[1] || "";
    const stored = stationHash(id);
    // Unknown stations are compared against a dummy hash so they look exactly like a wrong secret.
    const equal = crypto.timingSafeEqual(sha256(supplied), stored || dummyHash);
    return Boolean(stored) && equal && supplied !== "";
  }

  function readHead(socket, done) {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => { cleanup(); reply(socket, 408, "Request Timeout", page("Tiempo agotado", "No se recibio la peticion completa.")); }, headTimeoutMs);
    timer.unref?.();
    const cleanup = () => { clearTimeout(timer); socket.off("data", onData); };
    function onData(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      const end = buffer.indexOf("\r\n\r\n");
      if (end >= 0 && end + 4 <= MAX_HEAD) {
        cleanup();
        socket.pause();
        done(buffer.subarray(0, end).toString("latin1"), buffer.subarray(end + 4));
      } else if (buffer.length > MAX_HEAD || end >= 0) {
        cleanup();
        reply(socket, 431, "Request Header Fields Too Large", page("Peticion demasiado grande", "La cabecera supera 16 KB."));
      }
    }
    socket.on("data", onData);
    socket.once("close", () => clearTimeout(timer));
  }

  // ---- control channel ----
  function acceptControl(socket, id) {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: ${UPGRADE}\r\n\r\n`);
    socket.setKeepAlive(true, 30_000);
    const previous = controls.get(id);
    const entry = { socket, buffer: "", pongTimer: null };
    let pingTimer = null;
    // Unregister first so connected() is already false when the peer sees the close.
    const drop = () => {
      clearInterval(pingTimer);
      clearTimeout(entry.pongTimer);
      if (controls.get(id) === entry) { controls.delete(id); log(`estacion ${id} desconectada`); }
      socket.destroy();
    };
    controls.set(id, entry);
    if (previous) previous.drop();
    entry.drop = drop;
    log(`estacion ${id} conectada`);
    pingTimer = setInterval(() => {
      if (socket.destroyed) return;
      socket.write("PING\n");
      if (!entry.pongTimer) { entry.pongTimer = setTimeout(drop, pongMs); entry.pongTimer.unref?.(); }
    }, pingMs);
    pingTimer.unref?.();
    socket.on("error", drop);
    socket.on("data", chunk => {
      entry.buffer += chunk.toString("latin1");
      if (entry.buffer.length > 1024) { drop(); return; }
      let index;
      while ((index = entry.buffer.indexOf("\n")) >= 0) {
        const line = entry.buffer.slice(0, index).trim();
        entry.buffer = entry.buffer.slice(index + 1);
        if (line === "PONG") { clearTimeout(entry.pongTimer); entry.pongTimer = null; }
      }
    });
    socket.once("close", drop);
    socket.resume();
  }

  // Returns a function that yields only the bytes belonging to the request body (Content-Length or chunked).
  function bodyForwarder(parsed) {
    if (/(^|,)\s*chunked\s*$/i.test(headerOf(parsed, "transfer-encoding"))) {
      let state = "size", remaining = 0, line = "", done = false;
      return buf => {
        if (done) return Buffer.alloc(0);
        let i = 0;
        while (i < buf.length && !done) {
          if (state === "data") {
            const take = Math.min(remaining, buf.length - i);
            i += take; remaining -= take;
            if (remaining === 0) state = "crlf";
          } else if (state === "crlf") {
            line += String.fromCharCode(buf[i]); i += 1;
            if (line.length === 2) { line = ""; state = "size"; }
          } else {
            const ch = buf[i]; i += 1;
            line += String.fromCharCode(ch);
            if (ch !== 10) continue;
            const text = line.trim(); line = "";
            if (state === "size") {
              remaining = parseInt(text.split(";")[0], 16) || 0;
              state = remaining > 0 ? "data" : "trailer";
            } else if (text === "") done = true;
          }
        }
        return buf.subarray(0, i);
      };
    }
    let left = Math.max(0, parseInt(headerOf(parsed, "content-length"), 10) || 0);
    return buf => {
      const take = buf.subarray(0, left);
      left -= take.length;
      return take;
    };
  }

  function pipeSockets(client, data, forward) {
    const settle = (from, other) => {
      from.once("close", () => {
        other.end();
        setTimeout(() => other.destroy(), 2000).unref();
      });
    };
    // Small realtime frames (WebSocket audio) must not wait for Nagle + delayed ACK on either leg.
    for (const socket of [client, data]) { socket.setNoDelay(true); socket.on("error", () => { client.destroy(); data.destroy(); }); }
    settle(client, data);
    settle(data, client);
    if (forward) {
      client.pipe(new Transform({ transform(chunk, enc, cb) { cb(null, forward(chunk)); } })).pipe(data);
    } else client.pipe(data);
    data.pipe(client);
    client.resume();
  }

  function handleTunnel(socket, parsed, id, sessionId, extra) {
    const { ip } = clientInfo(socket, parsed);
    if (limiter.blocked(ip)) { reply(socket, 429, "Too Many Requests", "Demasiados intentos.", { "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" }); return; }
    if (!bearerOk(id, parsed)) {
      limiter.fail(ip);
      reply(socket, 401, "Unauthorized", "Secreto no valido.", { "WWW-Authenticate": "Bearer", "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const upgrade = headerOf(parsed, "upgrade").toLowerCase() === UPGRADE
      && /(^|,)\s*upgrade\s*(,|$)/i.test(headerOf(parsed, "connection"));
    if (parsed.method !== "GET" || !upgrade) { reply(socket, 426, "Upgrade Required", "Se requiere Upgrade.", { Upgrade: UPGRADE, "Content-Type": "text/plain; charset=utf-8" }); return; }
    if (!sessionId) { acceptControl(socket, id); return; }
    const session = SESSION_ID.test(sessionId) ? pending.get(sessionId) : null;
    if (!session || session.id !== id) { reply(socket, 404, "Not Found", "Sesion desconocida.", { "Content-Type": "text/plain; charset=utf-8" }); return; }
    clearTimeout(session.timer);
    pending.delete(sessionId);
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: ${UPGRADE}\r\n\r\n`);
    socket.write(session.payload);
    pipeSockets(session.client, socket, session.forward);
  }

  // ---- client traffic ----
  function buildPayload(parsed, id, info, rest, extra) {
    const lines = [`${parsed.method} ${rest} ${parsed.version}`];
    const upgrade = headerOf(parsed, "upgrade") !== "";
    for (const header of parsed.headers) {
      if (header.lower.startsWith("x-forwarded-")) continue;
      // Plain HTTP: one request per session so every request head gets rewritten.
      if (!upgrade && ["connection", "keep-alive", "proxy-connection"].includes(header.lower)) continue;
      lines.push(`${header.name}: ${header.value}`);
    }
    let forward = null;
    if (!upgrade) { lines.push("Connection: close"); forward = bodyForwarder(parsed); extra = forward(extra); }
    lines.push(`X-Forwarded-For: ${info.ip}`, `X-Forwarded-Proto: ${info.proto}`, `X-Forwarded-Prefix: /s/${id}`);
    return { payload: Buffer.concat([Buffer.from(`${lines.join("\r\n")}\r\n\r\n`, "latin1"), extra]), forward };
  }

  function handleClient(socket, parsed, id, rest, extra) {
    const control = controls.get(id);
    if (!control) { reply(socket, 503, "Service Unavailable", page("Estaci\u00f3n desconectada", "La estaci\u00f3n no est\u00e1 conectada al rel\u00e9 en este momento."), { "Retry-After": "10" }); return; }
    const count = sessionCounts.get(id) || 0;
    if (count >= maxSessions) { reply(socket, 503, "Service Unavailable", page("Estaci\u00f3n ocupada", "Demasiadas sesiones abiertas."), { "Retry-After": "5" }); return; }
    sessionCounts.set(id, count + 1);
    const sessionId = crypto.randomBytes(18).toString("base64url");
    const built = buildPayload(parsed, id, clientInfo(socket, parsed), rest, extra);
    const session = { id, client: socket, payload: built.payload, forward: built.forward, timer: null };
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(session.timer);
      pending.delete(sessionId);
      const left = (sessionCounts.get(id) || 1) - 1;
      if (left > 0) sessionCounts.set(id, left); else sessionCounts.delete(id);
    };
    session.timer = setTimeout(() => {
      release();
      reply(socket, 504, "Gateway Timeout", page("Estaci\u00f3n sin respuesta", "La estaci\u00f3n no abri\u00f3 el canal a tiempo."));
    }, dataWaitMs);
    session.timer.unref?.();
    pending.set(sessionId, session);
    socket.once("close", release);
    control.socket.write(`OPEN ${sessionId}\n`);
  }

  function route(socket, headText, extra) {
    const parsed = parseHead(headText);
    if (!parsed) { reply(socket, 400, "Bad Request", page("Peticion no valida", "No se pudo interpretar la peticion.")); return; }
    const queryAt = parsed.target.indexOf("?");
    const pathname = queryAt < 0 ? parsed.target : parsed.target.slice(0, queryAt);
    if (pathname === "/healthz") { reply(socket, 200, "OK", "ok", { "Content-Type": "text/plain; charset=utf-8" }); return; }
    let match = /^\/tunnel\/([a-z0-9-]{3,32})(?:\/data\/([A-Za-z0-9_-]{1,64}))?$/.exec(pathname);
    if (match) { handleTunnel(socket, parsed, match[1], match[2] || "", extra); return; }
    match = /^\/s\/([^/]+)(\/.*)?$/.exec(pathname);
    if (match && STATION_ID.test(match[1]) && stationExists(match[1])) {
      const id = match[1];
      const query = queryAt < 0 ? "" : parsed.target.slice(queryAt);
      // Relative console URLs only resolve under a trailing slash.
      if (match[2] === undefined) { reply(socket, 308, "Permanent Redirect", "", { Location: `/s/${id}/${query}` }); return; }
      handleClient(socket, parsed, id, `${match[2]}${query}`, extra);
      return;
    }
    reply(socket, 404, "Not Found", page("No encontrado", "Estaci\u00f3n desconocida."));
  }

  function onConnection(socket) {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    readHead(socket, (head, extra) => route(socket, head, extra));
  }

  const server = options.tls
    ? tls.createServer({ cert: options.tls.cert, key: options.tls.key }, onConnection)
    : net.createServer(onConnection);
  server.on("tlsClientError", () => {});

  async function start() {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port ?? 8443, options.listen || (behindProxy ? "127.0.0.1" : "0.0.0.0"), resolve);
    });
    return server.address();
  }

  async function close() {
    for (const entry of controls.values()) entry.drop();
    controls.clear();
    for (const socket of sockets) socket.destroy();
    for (const session of pending.values()) clearTimeout(session.timer);
    pending.clear();
    await new Promise(resolve => server.close(() => resolve()));
  }

  return { server, start, close, connected: id => controls.has(id), sessions: id => sessionCounts.get(id) || 0 };
}

// ---- CLI -----------------------------------------------------------------------------------------

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, positional: [], data: defaultDataFile(), port: 8443, listen: "", behindProxy: false };
  const flags = { "--data": "data", "--port": "port", "--listen": "listen", "--cert": "cert", "--key": "key" };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--behind-proxy") { args.behindProxy = true; continue; }
    if (!rest[i].startsWith("--")) { args.positional.push(rest[i]); continue; }
    const name = flags[rest[i]];
    if (!name || i + 1 >= rest.length) throw new Error(`Argumento no valido: ${rest[i]}`);
    args[name] = rest[i += 1];
  }
  args.port = Number(args.port);
  if (!Number.isInteger(args.port) || args.port < 0 || args.port > 65535) throw new Error("Puerto no valido.");
  return args;
}

const USAGE = `Uso:
  node remote-relay.cjs add-station <id> [--data <archivo>]
  node remote-relay.cjs remove-station <id> [--data <archivo>]
  node remote-relay.cjs list-stations [--data <archivo>]
  node remote-relay.cjs serve [--port 8443] [--listen 0.0.0.0] (--cert <pem> --key <pem> | --behind-proxy) [--data <archivo>]`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "add-station": {
      if (!args.positional[0]) throw new Error(USAGE);
      const secret = addStation(args.data, args.positional[0]);
      console.log(`Estacion ${args.positional[0]} registrada. Secreto (se muestra solo ahora):\n${secret}`);
      return;
    }
    case "remove-station":
      if (!args.positional[0]) throw new Error(USAGE);
      removeStation(args.data, args.positional[0]);
      console.log(`Estacion ${args.positional[0]} eliminada.`);
      return;
    case "list-stations": {
      const stations = listStations(args.data);
      if (!stations.length) console.log("Sin estaciones registradas.");
      for (const station of stations) console.log(`${station.id}\t${station.created}`);
      return;
    }
    case "serve": {
      const useCert = Boolean(args.cert || args.key);
      if (useCert === args.behindProxy) throw new Error("Usa --cert y --key (TLS) o --behind-proxy (HTTP detras de Caddy/nginx), no ambos ni ninguno.");
      if (useCert && !(args.cert && args.key)) throw new Error("--cert y --key van juntos.");
      if (args.behindProxy && args.listen && !isLoopback(args.listen) && args.listen !== "localhost") throw new Error("Con --behind-proxy el relé solo escucha en 127.0.0.1.");
      const relay = createRelay({
        dataFile: args.data, port: args.port, listen: args.listen || undefined, behindProxy: args.behindProxy,
        tls: useCert ? { cert: fs.readFileSync(args.cert), key: fs.readFileSync(args.key) } : null,
        log: message => console.log(`[relay] ${message}`)
      });
      const address = await relay.start();
      console.log(`Relé escuchando en ${address.address}:${address.port} (${useCert ? "TLS" : "HTTP detras de proxy"})`);
      const stop = async () => { await relay.close().catch(() => {}); process.exit(0); };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
      return;
    }
    default:
      throw new Error(USAGE);
  }
}

if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}

module.exports = { createRelay, addStation, removeStation, listStations, readStations, parseArgs, STATION_ID, UPGRADE };
