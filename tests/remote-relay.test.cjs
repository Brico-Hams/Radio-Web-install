"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { createRelay, addStation, removeStation, listStations } = require("../remote-relay.cjs");
const { createRemoteAgent } = require("../remote-agent.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 4000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(20);
  }
  assert.fail("waitFor timed out");
}

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-relay-"));

// Minimal rigctld: answers the polled commands; everything else is "not available" (RPRT -11).
async function fakeRigctld() {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = "";
    socket.on("data", chunk => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const command = buffer.slice(0, index).split(" ")[0];
        buffer = buffer.slice(index + 1);
        const replies = { f: "14074000\n", m: "USB\n2400\n", t: "0\n", v: "VFOA\n", s: "0\nVFOA\n", T: "RPRT 0\n" };
        socket.write(replies[command] ?? "RPRT -11\n");
      }
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { port: server.address().port, close: () => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(() => resolve()); }) };
}

async function fakeOpenwebrx() {
  const sockets = new Set();
  const server = http.createServer((request, response) => { response.writeHead(200, { "Content-Type": "text/plain" }); response.end(`sdr:${request.url}`); });
  server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  server.on("upgrade", (request, socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
    socket.on("data", chunk => socket.write(`echo:${chunk}`));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { port: server.address().port, close: () => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(() => resolve()); }) };
}

// Opens a control channel as an agent would; resolves with the socket or the plain HTTP status.
const openControl = (port, id, secret) => new Promise((resolve, reject) => {
  const request = http.request({
    host: "127.0.0.1", port, path: `/tunnel/${id}`, agent: false,
    headers: { Authorization: `Bearer ${secret}`, Connection: "Upgrade", Upgrade: "radicodex-tunnel/1" }
  });
  request.on("upgrade", (response, socket) => { socket.on("error", () => {}); resolve({ socket }); });
  request.on("response", response => { response.resume(); resolve({ status: response.statusCode }); });
  request.on("error", reject);
  request.end();
});

const rawRequest = (port, text) => new Promise((resolve, reject) => {
  const socket = net.connect(port, "127.0.0.1");
  let received = "";
  socket.on("error", () => {});
  socket.on("data", chunk => { received += chunk; });
  socket.on("close", () => resolve(received));
  socket.write(text);
});

const get = (port, url, headers = {}) => new Promise((resolve, reject) => {
  const request = http.get({ host: "127.0.0.1", port, path: url, headers, agent: false }, response => {
    const chunks = [];
    response.on("data", chunk => chunks.push(chunk));
    response.on("end", () => {
      const text = Buffer.concat(chunks).toString();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      resolve({ status: response.statusCode, headers: response.headers, text, json });
    });
  });
  request.on("error", reject);
});

async function startRelay(extra = {}) {
  const dir = tempDir();
  const dataFile = path.join(dir, "relay.json");
  const relay = createRelay({ dataFile, port: 0, listen: "127.0.0.1", ...extra });
  const address = await relay.start();
  return {
    relay, dataFile, port: address.port,
    cleanup: async () => { await relay.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  };
}

async function startStation(relayPort, secret, extra = {}) {
  const rig = await fakeRigctld();
  const configDir = tempDir();
  const agent = createRemoteAgent({
    configDir, port: 0, rigctldPort: rig.port, reconnectMs: 50, pollMs: 40, relayBackoffMinMs: 50, relayBackoffMaxMs: 200,
    relay: { url: `http://127.0.0.1:${relayPort}`, station: "ea5kao", secret }, ...extra
  });
  await agent.start();
  return {
    agent, configDir,
    cleanup: async () => { await agent.close(); await rig.close(); fs.rmSync(configDir, { recursive: true, force: true }); }
  };
}

test("add-station stores only sha256(secret); list and remove work", () => {
  const dir = tempDir();
  const file = path.join(dir, "relay.json");
  try {
    const secret = addStation(file, "ea5kao");
    assert.match(secret, /^[A-Za-z0-9_-]{43}$/);
    const stored = fs.readFileSync(file, "utf8");
    assert.ok(!stored.includes(secret));
    assert.ok(stored.includes(crypto.createHash("sha256").update(secret).digest("hex")));
    if (process.platform !== "win32") assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.throws(() => addStation(file, "ea5kao"), /ya existe/);
    for (const bad of ["ab", "EA5KAO", "a".repeat(33), "ea_5"]) assert.throws(() => addStation(file, bad), /no valido/);
    assert.deepEqual(listStations(file).map(item => item.id), ["ea5kao"]);
    removeStation(file, "ea5kao");
    assert.deepEqual(listStations(file), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("tunnel rejects a bad secret (401), hides unknown stations, and rate-limits to 429", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay();
  try {
    addStation(dataFile, "ea5kao");
    assert.equal((await openControl(port, "ea5kao", "wrong")).status, 401);
    assert.equal((await openControl(port, "nobody", "wrong")).status, 401);
    for (let i = 0; i < 8; i += 1) assert.equal((await openControl(port, "ea5kao", "wrong")).status, 401);
    assert.equal((await openControl(port, "ea5kao", "wrong")).status, 429);
    assert.equal(relay.connected("ea5kao"), false);
  } finally { await cleanup(); }
});

test("healthz, unknown station 404, offline station 503, trailing-slash redirect and head limit", async () => {
  const { dataFile, port, cleanup } = await startRelay();
  try {
    addStation(dataFile, "ea5kao");
    assert.equal((await get(port, "/healthz")).text, "ok");
    assert.equal((await get(port, "/s/nobody/api/state")).status, 404);
    const offline = await get(port, "/s/ea5kao/api/state");
    assert.equal(offline.status, 503);
    assert.match(offline.text, /Estaci\u00f3n desconectada/);
    const redirect = await get(port, "/s/ea5kao?x=1");
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.location, "/s/ea5kao/?x=1");
    assert.match(await rawRequest(port, `GET /s/ea5kao/ HTTP/1.1\r\nHost: x\r\nX-Big: ${"a".repeat(17000)}\r\n\r\n`), /^HTTP\/1\.1 431/);
    assert.match(await rawRequest(port, "BREW /coffee\r\n\r\n"), /^HTTP\/1\.1 400/);
  } finally { await cleanup(); }
});

test("end to end: agent reaches the relay, console API works through /s/<id>/, auth stays with the agent", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay();
  const secret = addStation(dataFile, "ea5kao");
  const sdr = await fakeOpenwebrx();
  const station = await startStation(port, secret, { openwebrxUrl: `http://127.0.0.1:${sdr.port}/` });
  const { agent } = station;
  try {
    await waitFor(() => relay.connected("ea5kao") && agent.snapshot("x").relay.connected && agent.snapshot("x").freq === 14074000);
    const stored = JSON.parse(fs.readFileSync(path.join(station.configDir, "remote-agent.json"), "utf8"));
    assert.deepEqual(stored.relay, { url: `http://127.0.0.1:${port}`, station: "ea5kao", secret });
    if (process.platform !== "win32") assert.equal(fs.statSync(path.join(station.configDir, "remote-agent.json")).mode & 0o777, 0o600);
    const state = await get(port, "/s/ea5kao/api/state", { Authorization: `Bearer ${agent.token}` });
    assert.equal(state.status, 200);
    assert.equal(state.json.freq, 14074000);
    assert.deepEqual(state.json.relay, { configured: true, connected: true });

    const anonymous = await get(port, "/s/ea5kao/api/state");
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.json.error, "Token no valido.");
    assert.equal(anonymous.headers["www-authenticate"], "Bearer");

    const html = await get(port, "/s/ea5kao/");
    assert.equal(html.status, 200);
    assert.doesNotMatch(html.text, /(?:src|href)="\//);

    // A client cannot forge the forwarded prefix: the relay overwrites it.
    const forged = await get(port, "/s/ea5kao/sdr/?token=" + agent.token, { "X-Forwarded-Prefix": "/evil" });
    assert.equal(forged.status, 200);
    const cookie = [].concat(forged.headers["set-cookie"]).find(item => item.startsWith("rs_session="));
    assert.match(cookie, /Path=\/s\/ea5kao\/sdr\//);
    assert.equal(forged.text, "sdr:/");

    // SSE through the relay.
    const event = await new Promise((resolve, reject) => {
      const request = http.get({ host: "127.0.0.1", port, path: `/s/ea5kao/api/events?token=${agent.token}&cid=t1`, agent: false }, response => {
        assert.equal(response.statusCode, 200);
        let text = "";
        response.on("data", chunk => {
          text += chunk;
          if (/data: \{.*"freq":14074000/.test(text)) { request.destroy(); resolve(text); }
        });
      });
      request.on("error", error => { if (error.code !== "ECONNRESET") reject(error); });
    });
    assert.match(event, /"relay":\{"configured":true,"connected":true\}/);

    // WebSocket upgrade through the relay to the /sdr/ proxy.
    const echoed = await new Promise((resolve, reject) => {
      const socket = net.connect(port, "127.0.0.1");
      let text = "";
      socket.on("error", reject);
      socket.on("data", chunk => {
        text += chunk;
        if (text.startsWith("HTTP/1.1 101") && !socket.sent) { socket.sent = true; socket.write("ping"); }
        if (text.includes("echo:ping")) { socket.destroy(); resolve(text); }
      });
      socket.write(`GET /s/ea5kao/sdr/ws/?token=${agent.token} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: abc\r\nSec-WebSocket-Version: 13\r\n\r\n`);
    });
    assert.match(echoed, /^HTTP\/1\.1 101/);
  } finally { await station.cleanup(); await sdr.close(); await cleanup(); }
});

test("keep-alive browser connection: every request is rewritten, none leaks the /s/<id> prefix", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay();
  const secret = addStation(dataFile, "ea5kao");
  const station = await startStation(port, secret);
  const { agent } = station;
  const keepAlive = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const fetchKA = (url, headers = {}) => new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: url, headers, agent: keepAlive }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, type: response.headers["content-type"], text: Buffer.concat(chunks).toString() }));
    }).on("error", reject);
  });
  try {
    await waitFor(() => relay.connected("ea5kao") && agent.snapshot("x").relay.connected);
    const html = await fetchKA("/s/ea5kao/remote.html");
    assert.equal(html.status, 200);
    assert.match(html.type, /text\/html/);
    const js = await fetchKA("/s/ea5kao/remote-ui.js");
    assert.equal(js.status, 200);
    assert.match(js.type, /text\/javascript/);
    const state = await fetchKA("/s/ea5kao/api/state", { Authorization: `Bearer ${agent.token}` });
    assert.equal(state.status, 200);
    assert.match(state.type, /application\/json/);
    assert.ok(JSON.parse(state.text));
  } finally { keepAlive.destroy(); await station.cleanup(); await cleanup(); }
});

test("the agent never prints or exposes the station secret in its links", async () => {
  const { dataFile, port, cleanup } = await startRelay();
  const secret = addStation(dataFile, "ea5kao");
  const station = await startStation(port, secret);
  try {
    const links = station.agent.relayLinks();
    assert.equal(links.console, `http://127.0.0.1:${port}/s/ea5kao/#token=${station.agent.token}`);
    assert.equal(links.android, `radicodex-remote://pair?relay=${encodeURIComponent(`http://127.0.0.1:${port}`)}&station=ea5kao#token=${station.agent.token}`);
    assert.ok(!JSON.stringify(links).includes(secret));
    assert.ok(!JSON.stringify(station.agent.snapshot("x")).includes(secret));
  } finally { await station.cleanup(); await cleanup(); }
});

test("agent reconnects with backoff after the relay appears late", async () => {
  const dir = tempDir();
  const dataFile = path.join(dir, "relay.json");
  const secret = addStation(dataFile, "ea5kao");
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const station = await startStation(port, secret);
  let relay;
  try {
    await sleep(150);
    assert.equal(station.agent.snapshot("x").relay.connected, false);
    relay = createRelay({ dataFile, port, listen: "127.0.0.1" });
    await relay.start();
    await waitFor(() => station.agent.snapshot("x").relay.connected, 6000);
  } finally { await station.cleanup(); if (relay) await relay.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a new valid control channel replaces the old one", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay();
  const secret = addStation(dataFile, "ea5kao");
  try {
    const first = (await openControl(port, "ea5kao", secret)).socket;
    await waitFor(() => relay.connected("ea5kao"));
    const closed = new Promise(resolve => first.once("close", resolve));
    const second = (await openControl(port, "ea5kao", secret)).socket;
    await closed;
    assert.equal(relay.connected("ea5kao"), true);
    second.destroy();
    await waitFor(() => !relay.connected("ea5kao"));
  } finally { await cleanup(); }
});

test("relay pings the control channel and drops it when PONG does not arrive", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay({ pingIntervalMs: 40, pongTimeoutMs: 60 });
  const secret = addStation(dataFile, "ea5kao");
  try {
    const { socket } = await openControl(port, "ea5kao", secret);
    let text = "";
    socket.on("data", chunk => { text += chunk; });
    await waitFor(() => text.includes("PING\n"));
    const closed = new Promise(resolve => socket.once("close", resolve));
    await closed;
    assert.equal(relay.connected("ea5kao"), false);

    const answering = (await openControl(port, "ea5kao", secret)).socket;
    answering.on("data", chunk => { if (String(chunk).includes("PING")) answering.write("PONG\n"); });
    await sleep(400);
    assert.equal(relay.connected("ea5kao"), true);
    answering.destroy();
  } finally { await cleanup(); }
});

test("station sessions are capped and a silent agent yields 504", async () => {
  const { relay, dataFile, port, cleanup } = await startRelay({ maxSessions: 2, dataWaitMs: 300 });
  const secret = addStation(dataFile, "ea5kao");
  try {
    const { socket } = await openControl(port, "ea5kao", secret);
    socket.on("data", () => {});
    await waitFor(() => relay.connected("ea5kao"));
    const first = get(port, "/s/ea5kao/a");
    const second = get(port, "/s/ea5kao/b");
    await waitFor(() => relay.sessions("ea5kao") === 2);
    assert.equal((await get(port, "/s/ea5kao/c")).status, 503);
    assert.equal((await first).status, 504);
    assert.equal((await second).status, 504);
    await waitFor(() => relay.sessions("ea5kao") === 0);
  } finally { await cleanup(); }
});
