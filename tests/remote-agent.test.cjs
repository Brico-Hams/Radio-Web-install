"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { createRemoteAgent } = require("../remote-agent.cjs");
const { RigctldClient, RigctldError } = require("../rigctld-client.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 3000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(20);
  }
  assert.fail("waitFor timed out");
}

async function fakeRigctld() {
  const rig = { freq: 14074000, mode: "USB", passband: 2400, ptt: 0, failFreq: false, log: [], sockets: new Set() };
  const server = net.createServer(socket => {
    rig.sockets.add(socket);
    socket.on("close", () => rig.sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = "";
    socket.on("data", chunk => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        rig.log.push(line);
        const [command, ...args] = line.split(" ");
        let reply = "RPRT 0\n";
        if (command === "f") reply = `${rig.freq}\n`;
        else if (command === "m") reply = `${rig.mode}\n${rig.passband}\n`;
        else if (command === "t") reply = `${rig.ptt}\n`;
        else if (command === "l") reply = "RPRT -11\n";
        else if (command === "v") reply = "VFOA\n";
        else if (command === "s") reply = "0\nVFOA\n";
        else if (command === "F") { if (rig.failFreq) reply = "RPRT -1\n"; else rig.freq = Number(args[0]); }
        else if (command === "M") { rig.mode = args[0]; }
        else if (command === "T") rig.ptt = Number(args[0]);
        socket.write(reply);
      }
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  rig.port = server.address().port;
  rig.dropAll = () => { for (const socket of rig.sockets) socket.destroy(); };
  rig.close = () => new Promise(resolve => { rig.dropAll(); server.close(() => resolve()); });
  return rig;
}

async function startAgent(rig, extra = {}) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-agent-"));
  const agent = createRemoteAgent({
    configDir, port: 0, rigctldPort: rig.port, reconnectMs: 50, pollMs: 40, ...extra
  });
  const address = await agent.start();
  const call = (method, url, { token = agent.token, body, headers = {}, raw } = {}) => new Promise((resolve, reject) => {
    const payload = raw ?? (body === undefined ? undefined : JSON.stringify(body));
    const request = http.request({
      host: "127.0.0.1", port: address.port, method, path: url,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload !== undefined ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, response => {
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
    request.end(payload);
  });
  await waitFor(async () => (await call("GET", "/api/state")).json.freq === rig.freq);
  return { agent, call, configDir, cleanup: async () => { await agent.close(); fs.rmSync(configDir, { recursive: true, force: true }); } };
}

test("rigctld client parses replies and RPRT errors", async () => {
  const rig = await fakeRigctld();
  const client = new RigctldClient({ port: rig.port, reconnectMs: 50 });
  const connected = new Promise(resolve => client.once("connect", resolve));
  client.start();
  await connected;
  try {
    assert.equal(await client.getFreq(), 14074000);
    assert.deepEqual(await client.getMode(), { mode: "USB", passband: 2400 });
    assert.equal(await client.getPtt(), false);
    assert.equal(await client.getStrength(), null);
    await client.setPtt(true);
    assert.equal(await client.getPtt(), true);
    rig.failFreq = true;
    await assert.rejects(client.setFreq(7100000), error => error instanceof RigctldError && error.code === -1);
  } finally {
    client.stop();
    await rig.close();
  }
});

test("agent creates a private token file and requires it on /api", async () => {
  const rig = await fakeRigctld();
  const { agent, call, configDir, cleanup } = await startAgent(rig);
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(configDir, "remote-agent.json"), "utf8"));
    assert.equal(saved.token, agent.token);
    assert.equal(Buffer.from(saved.token, "base64url").length, 32);
    assert.equal(saved.txLimitSeconds, 180);
    assert.equal((await call("GET", "/api/state", { token: "" })).status, 401);
    assert.equal((await call("GET", "/api/state", { token: "wrong" })).status, 401);
    assert.equal((await call("GET", `/api/state?token=${agent.token}`, { token: "" })).status, 401);
    const state = (await call("GET", "/api/state")).json;
    assert.deepEqual([state.connected, state.freq, state.mode, state.passband, state.ptt, state.smeter],
      [true, 14074000, "USB", 2400, false, null]);
  } finally { await cleanup(); await rig.close(); }
});

test("agent rejects invalid commands and applies valid ones", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  const cmd = body => call("POST", "/api/cmd", { body });
  try {
    for (const body of [
      { cmd: "freq", value: 100 }, { cmd: "freq", value: 14074000.5 }, { cmd: "freq", value: "7100000" },
      { cmd: "freq", value: 4_000_000_000 }, { cmd: "mode", value: "SSB" }, { cmd: "ptt", value: "yes" },
      { cmd: "step", value: 2_000_000 }, { cmd: "nope", value: 1 }, { cmd: "freq", value: 7100000, extra: 1 }
    ]) assert.equal((await cmd(body)).status, 400, JSON.stringify(body));
    assert.equal((await call("POST", "/api/cmd", { raw: "{", headers: {} })).status, 400);
    assert.equal((await call("POST", "/api/cmd", { raw: "{}", headers: { "Content-Type": "text/plain" } })).status, 415);
    assert.equal((await call("POST", "/api/cmd", { raw: JSON.stringify({ cmd: "mode", value: "x".repeat(5000) }) })).status, 413);
    assert.equal((await cmd({ cmd: "freq", value: 7100000 })).status, 200);
    assert.equal(rig.freq, 7100000);
    assert.equal((await cmd({ cmd: "step", value: -1000 })).status, 200);
    assert.equal(rig.freq, 7099000);
    assert.equal((await cmd({ cmd: "mode", value: "LSB" })).status, 200);
    assert.equal(rig.mode, "LSB");
    rig.failFreq = true;
    assert.equal((await cmd({ cmd: "freq", value: 7050000 })).status, 502);
  } finally { await cleanup(); await rig.close(); }
});

test("PTT drops after 1 s without heartbeat and stays up with heartbeats", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true } })).status, 200);
    assert.equal(rig.ptt, 1);
    for (let i = 0; i < 6; i += 1) {
      await sleep(250);
      assert.equal((await call("POST", "/api/heartbeat", { body: {} })).status, 200);
    }
    assert.equal(rig.ptt, 1);
    const start = Date.now();
    await waitFor(() => rig.ptt === 0, 2500);
    assert.ok(Date.now() - start >= 800, "must not drop earlier than ~1 s");
    assert.equal((await call("GET", "/api/state")).json.ptt, false);
  } finally { await cleanup(); await rig.close(); }
});

test("PTT drops at the hard TX time limit even with heartbeats", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { txLimitSeconds: 0.5 });
  try {
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true } });
    const timer = setInterval(() => call("POST", "/api/heartbeat", { body: {} }).catch(() => {}), 150);
    try { await waitFor(() => rig.ptt === 0, 2000); } finally { clearInterval(timer); }
  } finally { await cleanup(); await rig.close(); }
});

test("agent reports offline and sends T 0 first when rigctld drops and returns", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { reconnectMs: 100 });
  try {
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true } });
    assert.equal(rig.ptt, 1);
    rig.log.length = 0;
    rig.dropAll();
    await waitFor(async () => (await call("GET", "/api/state")).json.ptt === false);
    await waitFor(() => rig.log.includes("T 0"));
    assert.equal(rig.ptt, 0);
    await waitFor(async () => (await call("GET", "/api/state")).json.connected === true);
  } finally { await cleanup(); await rig.close(); }
});

test("agent shutdown sends T 0", async () => {
  const rig = await fakeRigctld();
  const { agent, call, configDir } = await startAgent(rig);
  try {
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true } });
    assert.equal(rig.ptt, 1);
    await agent.close();
    assert.equal(rig.ptt, 0);
  } finally { fs.rmSync(configDir, { recursive: true, force: true }); await rig.close(); }
});

test("static files are limited to the console allow-list and carry security headers", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { openwebrxUrl: "http://sdr.example:8073/#freq=1" });
  try {
    for (const file of ["/remote.html", "/remote-ui.js", "/remote.css"]) {
      const response = await call("GET", file, { token: "" });
      assert.equal(response.status, 200, file);
      assert.equal(response.headers["x-content-type-options"], "nosniff");
      assert.equal(response.headers["referrer-policy"], "no-referrer");
      assert.match(response.headers["content-security-policy"], /frame-src http:\/\/sdr\.example:8073;/);
    }
    for (const file of ["/server.cjs", "/remote-agent.cjs", "/package.json", "/../server.cjs", "/%2e%2e/server.cjs", "/styles.css"]) {
      assert.equal((await call("GET", file, { token: "" })).status, 404, file);
    }
    assert.equal((await call("GET", "/api/config")).json.openwebrxUrl, "http://sdr.example:8073/#freq=1");
  } finally { await cleanup(); await rig.close(); }
});

test("a second client cannot take PTT while the first owns control", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7100000 }, ...as("client-a") })).status, 200);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, ...as("client-b") })).status, 409);
    assert.equal(rig.ptt, 0);
    assert.equal((await call("GET", "/api/state", as("client-b"))).status, 200);
    assert.equal((await call("GET", "/api/state", as("client-b"))).json.operator, "other");
    assert.equal((await call("GET", "/api/state", as("client-a"))).json.operator, "me");
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, ...as("client-a") })).status, 200);
    assert.equal(rig.ptt, 1);
  } finally { await cleanup(); await rig.close(); }
});

test("control expires after 30 s of inactivity (injected clock)", async () => {
  const rig = await fakeRigctld();
  let time = 1_000_000;
  const { call, cleanup } = await startAgent(rig, { now: () => time });
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7100000 }, ...as("client-a") });
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7110000 }, ...as("client-b") })).status, 409);
    time += 30_001;
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7110000 }, ...as("client-b") })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});
