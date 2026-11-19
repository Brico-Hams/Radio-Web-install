"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { createRemoteAgent } = require("../remote-agent.cjs");
const { RigctldClient, RigctldError, parseCaps } = require("../rigctld-client.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 3000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(20);
  }
  assert.fail("waitFor timed out");
}

const CAPS_LINES = [
  "Caps dump for model:\t1",
  "Model name:\t\tFTX-1",
  "Mfg name:\t\tYaesu",
  "Get level: AF(0..1/0.01) RF(0..1/0.01) SQL(0..1/0.01) RFPOWER(0..1/0.01) PREAMP(10,20) ATT(12) AGC(0..5/1) STRENGTH(-54..60/1)",
  "Set level: AF(0..1/0.01) RF(0..1/0.01) RFPOWER(0..1/0.01) PREAMP(10,20) ATT(12) AGC(0..5/1)",
  "Get functions: FAGC NB COMP VOX TUNER",
  "Set functions: FAGC NB NR TUNER",
  "VFO Ops:\t\tCPY XCHG TUNE"
];

async function fakeRigctld() {
  const rig = {
    freq: 14074000, mode: "USB", passband: 2400, ptt: 0, failFreq: false, log: [], sockets: new Set(),
    levels: { AF: 0.5, RF: 1, RFPOWER: 0.4, PREAMP: 0, ATT: 0, AGC: 2 }, funcs: { NB: 0, NR: 0, TUNER: 0 }, noCaps: false,
    vfoName: "VFOA", delays: {}, errors: {}, connections: 0
  };
  const server = net.createServer(socket => {
    rig.connections += 1;
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
        else if (command === "l") reply = rig.errors[args[0]] ? `RPRT ${rig.errors[args[0]]}\n` : Object.hasOwn(rig.levels, args[0]) ? `${rig.levels[args[0]]}\n` : "RPRT -11\n";
        else if (command === "L") rig.levels[args[0]] = Number(args[1]);
        else if (command === "u") reply = Object.hasOwn(rig.funcs, args[0]) ? `${rig.funcs[args[0]]}\n` : "RPRT -11\n";
        else if (command === "U") rig.funcs[args[0]] = Number(args[1]);
        else if (command === "\\dump_caps") reply = rig.noCaps ? "RPRT -11\n" : `${CAPS_LINES.join("\n")}\nRPRT 0\n`;
        else if (command === "v") reply = `${rig.vfoName}\n`;
        else if (command === "s") reply = `0\n${rig.vfoName}\n`;
        else if (command === "V") rig.vfoName = args[0];
        else if (command === "F") { if (rig.failFreq) reply = "RPRT -1\n"; else rig.freq = Number(args[0]); }
        else if (command === "M") { rig.mode = args[0]; rig.passband = Number(args[1]); }
        else if (command === "T") rig.ptt = Number(args[0]);
        const delay = command === "l" || command === "u" ? rig.delays[args[0]] || 0 : 0;
        if (delay) setTimeout(() => socket.write(reply), delay); else socket.write(reply);
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
      assert.match(response.headers["content-security-policy"], /frame-src 'self' http:\/\/sdr\.example:8073;/);
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

test("parseCaps keeps only supported, whitelisted levels/functions and TUNE", () => {
  const caps = parseCaps([...CAPS_LINES, "Get level: BOGUS(0..1/1) AF(0..1/0.01)"]);
  assert.equal(caps.model, "Yaesu FTX-1");
  assert.deepEqual(Object.keys(caps.level).sort(), ["AF", "AGC", "ATT", "PREAMP", "RF", "RFPOWER"]);
  assert.deepEqual(caps.level.PREAMP, { get: true, set: true, values: [10, 20] });
  assert.deepEqual(caps.level.ATT.values, [12]);
  assert.equal(caps.level.AF.values, undefined);
  assert.deepEqual(caps.func.NB, { get: true, set: true });
  assert.deepEqual(caps.func.NR, { get: false, set: true });
  assert.equal(caps.func.VOX, undefined);
  assert.equal(caps.tune, true);
  assert.equal(parseCaps(["Caps dump for model: 1"]).tune, false);
});

test("agent detects caps once and reports levels/functions, null when the rig cannot read them", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  try {
    await waitFor(async () => (await call("GET", "/api/state")).json.levels.af === 0.5);
    const state = (await call("GET", "/api/state")).json;
    assert.equal(state.caps.detected, true);
    assert.equal(state.caps.tune, true);
    assert.deepEqual(state.caps.level.PREAMP.values, [10, 20]);
    assert.deepEqual(state.levels, { af: 0.5, rf: 1, rfpower: 0.4, preamp: 0, att: 0, agc: 2 });
    assert.deepEqual(state.funcs, { nb: false, nr: null, tuner: false });
    assert.equal(rig.log.filter(line => line === "\\dump_caps").length, 1);
  } finally { await cleanup(); await rig.close(); }
});

test("level and func commands are validated and applied", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  const cmd = body => call("POST", "/api/cmd", { body });
  try {
    for (const body of [
      { cmd: "level", name: "STRENGTH", value: 0.5 }, { cmd: "level", name: "AF; T 1", value: 0.5 },
      { cmd: "level", name: "af", value: 0.5 }, { cmd: "level", value: 0.5 }, { cmd: "level", name: "AF", value: 1.5 },
      { cmd: "level", name: "AF", value: "0.5" }, { cmd: "level", name: "AF", value: null }, { cmd: "level", name: "RF", value: -0.1 },
      { cmd: "level", name: "PREAMP", value: 1.5 }, { cmd: "level", name: "AGC", value: 9 },
      { cmd: "level", name: "AF", value: 0.5, on: true }, { cmd: "func", name: "VOX", on: true },
      { cmd: "func", name: "NB", on: 1 }, { cmd: "func", name: "NB" }, { cmd: "func", name: "NB", value: true },
      { cmd: "tune", value: true }, { cmd: "mode", value: "USB", passband: -1 }, { cmd: "mode", value: "USB", passband: "2400" }
    ]) assert.equal((await cmd(body)).status, 400, JSON.stringify(body));
    assert.equal((await cmd({ cmd: "level", name: "AF", value: 0.25 })).status, 200);
    assert.equal(rig.levels.AF, 0.25);
    assert.equal((await cmd({ cmd: "level", name: "PREAMP", value: 10 })).status, 200);
    assert.equal(rig.levels.PREAMP, 10);
    assert.equal((await cmd({ cmd: "level", name: "PREAMP", value: 15 })).status, 400);
    assert.equal((await cmd({ cmd: "level", name: "ATT", value: 0 })).status, 200);
    assert.equal((await cmd({ cmd: "level", name: "AGC", value: 5 })).status, 200);
    assert.equal(rig.levels.AGC, 5);
    assert.equal((await cmd({ cmd: "func", name: "NB", on: true })).status, 200);
    assert.equal(rig.funcs.NB, 1);
    assert.equal((await cmd({ cmd: "func", name: "TUNER", on: true })).status, 200);
    assert.equal(rig.funcs.TUNER, 1);
    assert.equal((await cmd({ cmd: "mode", value: "CW", passband: 500 })).status, 200);
    assert.deepEqual([rig.mode, rig.passband], ["CW", 500]);
    assert.ok(rig.log.every(line => !line.includes(";")), "nothing injected into rigctld");
    await waitFor(async () => (await call("GET", "/api/state")).json.levels.af === 0.25);
    assert.equal((await call("GET", "/api/state")).json.funcs.nb, true);
  } finally { await cleanup(); await rig.close(); }
});

test("rig without caps reports null controls and answers 501, without polling them", async () => {
  const rig = await fakeRigctld();
  rig.noCaps = true;
  const { call, cleanup } = await startAgent(rig);
  const cmd = body => call("POST", "/api/cmd", { body });
  try {
    await sleep(400);
    const state = (await call("GET", "/api/state")).json;
    assert.equal(state.caps.detected, true);
    assert.deepEqual(state.caps.level, {});
    assert.equal(state.caps.tune, false);
    assert.ok(Object.values(state.levels).every(value => value === null));
    assert.ok(Object.values(state.funcs).every(value => value === null));
    assert.equal((await cmd({ cmd: "level", name: "AF", value: 0.2 })).status, 501);
    assert.equal((await cmd({ cmd: "func", name: "NB", on: true })).status, 501);
    assert.equal((await cmd({ cmd: "tune" })).status, 501);
    assert.ok(!rig.log.some(line => /^[lLuUG] /.test(line) && !line.startsWith("l STRENGTH")));
  } finally { await cleanup(); await rig.close(); }
});

test("a slow level that errors is disabled without dropping the connection; RPRT -9 becomes null and caps get=false", async () => {
  const rig = await fakeRigctld();
  rig.errors.ATT = -9;
  rig.errors.AGC = -9;
  rig.delays.AGC = 120;
  const { call, cleanup } = await startAgent(rig, { slowControlMs: 50 });
  try {
    await waitFor(async () => (await call("GET", "/api/state")).json.levels.af === 0.5);
    await waitFor(async () => (await call("GET", "/api/state")).json.caps.level.AGC.get === false);
    const state = (await call("GET", "/api/state")).json;
    assert.equal(state.levels.att, null);
    assert.equal(state.levels.agc, null);
    assert.equal(state.caps.level.ATT.get, false);
    assert.equal(state.caps.level.AF.get, true);
    await sleep(500);
    assert.equal(rig.log.filter(line => line === "l ATT").length, 1);
    assert.equal(rig.log.filter(line => line === "l AGC").length, 1);
    assert.equal(rig.connections, 1);
  } finally { await cleanup(); await rig.close(); }
});

test("slow but working level is polled at most every 10 s (injected clock)", async () => {
  const rig = await fakeRigctld();
  rig.delays.AGC = 80;
  let offset = 0;
  const { call, cleanup } = await startAgent(rig, { slowControlMs: 30, now: () => Date.now() + offset });
  const count = () => rig.log.filter(line => line === "l AGC").length;
  try {
    await waitFor(() => count() >= 2);
    await sleep(600);
    assert.equal(count(), 2);
    assert.equal((await call("GET", "/api/state")).json.levels.agc, 2);
    offset += 10_001;
    await waitFor(() => count() >= 3);
    await sleep(300);
    assert.equal(count(), 3);
    assert.equal(rig.connections, 1);
  } finally { await cleanup(); await rig.close(); }
});

test("VFO names Main/Sub are exposed and used for vfo and split commands", async () => {
  const rig = await fakeRigctld();
  rig.vfoName = "Main";
  const { call, cleanup } = await startAgent(rig);
  const cmd = body => call("POST", "/api/cmd", { body });
  try {
    await waitFor(async () => (await call("GET", "/api/state")).json.vfo === "Main");
    assert.equal((await cmd({ cmd: "vfo", value: "B" })).status, 200);
    assert.equal(rig.vfoName, "Sub");
    assert.equal((await cmd({ cmd: "split", value: true })).status, 200);
    assert.ok(rig.log.includes("S 1 Main"));
    assert.equal((await cmd({ cmd: "vfo", value: "A" })).status, 200);
    assert.equal(rig.vfoName, "Main");
    assert.equal((await cmd({ cmd: "split", value: true })).status, 200);
    assert.ok(rig.log.includes("S 1 Sub"));
  } finally { await cleanup(); await rig.close(); }
});

test("VFOA/VFOB rigs still get VFOA/VFOB names", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  const cmd = body => call("POST", "/api/cmd", { body });
  try {
    await waitFor(async () => (await call("GET", "/api/state")).json.vfo === "VFOA");
    assert.equal((await cmd({ cmd: "vfo", value: "B" })).status, 200);
    assert.equal(rig.vfoName, "VFOB");
    assert.equal((await cmd({ cmd: "split", value: true })).status, 200);
    assert.ok(rig.log.includes("S 1 VFOA"));
  } finally { await cleanup(); await rig.close(); }
});

test("TUNE sends G TUNE, is blocked while another client holds control (409) and during TX", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7100000 }, ...as("client-a") })).status, 200);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "tune" }, ...as("client-b") })).status, 409);
    assert.ok(!rig.log.includes("G TUNE"));
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "tune" }, ...as("client-a") })).status, 200);
    assert.ok(rig.log.includes("G TUNE"));
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, ...as("client-a") });
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "tune" }, ...as("client-a") })).status, 409);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "level", name: "RFPOWER", value: 1 }, ...as("client-a") })).status, 409);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "level", name: "AF", value: 0.1 }, ...as("client-a") })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});

test("console assets: logo and locale scripts are served; the page has no inline script or style", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  try {
    for (const file of ["/bricohams-logo.png", "/ui-i18n.js", "/ui-translations.js"]) {
      assert.equal((await call("GET", file, { token: "" })).status, 200, file);
    }
    const html = fs.readFileSync(path.join(__dirname, "..", "remote.html"), "utf8");
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/i);
    assert.doesNotMatch(html, /<style|\sstyle=|\son[a-z]+=/i);
  } finally { await cleanup(); await rig.close(); }
});

async function fakeOpenwebrx() {
  const seen = [];
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    seen.push({ url: request.url, headers: request.headers });
    response.writeHead(200, {
      "Content-Type": "text/plain",
      "Set-Cookie": "sdr=1; Domain=sdr.example; Path=/",
      "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
      "Cache-Control": "max-age=60"
    });
    response.end(`sdr:${request.url}`);
  });
  server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  server.on("upgrade", (request, socket) => {
    seen.push({ url: request.url, headers: request.headers, upgrade: true });
    sockets.add(socket);
    socket.on("error", () => {});
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
    socket.on("data", chunk => socket.write(`echo:${chunk}`));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    seen, port: server.address().port,
    close: () => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(() => resolve()); })
  };
}

test("/sdr/ proxies OpenWebRX only with the token or the rs_session cookie", async () => {
  const rig = await fakeRigctld();
  const sdr = await fakeOpenwebrx();
  const { call, cleanup } = await startAgent(rig, { openwebrxUrl: `http://127.0.0.1:${sdr.port}/` });
  try {
    assert.equal((await call("GET", "/api/config")).json.sdrProxy, true);
    assert.equal((await call("GET", "/sdr/", { token: "" })).status, 401);
    assert.equal((await call("GET", "/sdr/", { token: "", headers: { Cookie: "rs_session=forged" } })).status, 401);

    const first = await call("GET", "/sdr/static/app.js?x=1", { headers: { Cookie: "sdr=keep" } });
    assert.equal(first.status, 200);
    assert.equal(first.text, "sdr:/static/app.js?x=1");
    const upstream = sdr.seen.at(-1);
    assert.equal(upstream.headers.host, `127.0.0.1:${sdr.port}`);
    assert.equal(upstream.headers.authorization, undefined);
    assert.equal(upstream.headers.cookie, "sdr=keep");
    assert.equal(first.headers["cache-control"], "max-age=60");
    assert.match(first.headers["content-security-policy"], /default-src 'self'; frame-ancestors 'self'$/);
    const cookies = [].concat(first.headers["set-cookie"]);
    assert.ok(cookies.includes("sdr=1; Path=/"));
    const session = cookies.find(item => item.startsWith("rs_session="));
    assert.match(session, /HttpOnly/);
    assert.match(session, /SameSite=Strict/);
    assert.doesNotMatch(session, /Secure/);

    const viaCookie = await call("GET", "/sdr/img.png", { token: "", headers: { Cookie: session.split(";")[0] } });
    assert.equal(viaCookie.status, 200);
    assert.equal(sdr.seen.at(-1).headers.cookie, undefined);
  } finally { await cleanup(); await sdr.close(); await rig.close(); }
});

test("/sdr/ accepts ?token= (stripped upstream) and pipes websocket upgrades", async () => {
  const rig = await fakeRigctld();
  const sdr = await fakeOpenwebrx();
  const { agent, call, cleanup } = await startAgent(rig, { openwebrxUrl: `http://127.0.0.1:${sdr.port}/` });
  const port = agent.server.address().port;
  const upgrade = headers => new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    let text = "";
    socket.on("error", reject);
    socket.on("data", chunk => {
      text += chunk;
      if (text.startsWith("HTTP/1.1 101") && !text.includes("echo:") && !socket.sent) { socket.sent = true; socket.write("ping"); }
      if (!text.startsWith("HTTP/1.1 101") && text.includes("\r\n\r\n")) { socket.destroy(); resolve(text); }
      if (text.includes("echo:ping")) { socket.destroy(); resolve(text); }
    });
    socket.write(`GET /sdr/ws/?token=${headers.token}&a=1 HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: abc\r\nSec-WebSocket-Version: 13\r\n${headers.cookie ? `Cookie: ${headers.cookie}\r\n` : ""}\r\n`);
  });
  try {
    const page = await call("GET", `/sdr/?token=${agent.token}`, { token: "" });
    assert.equal(page.status, 200);
    assert.equal(sdr.seen.at(-1).url, "/");
    const cookie = [].concat(page.headers["set-cookie"]).find(item => item.startsWith("rs_session=")).split(";")[0];

    assert.match(await upgrade({ token: "bad" }), /^HTTP\/1\.1 401/);
    const echoed = await upgrade({ token: "", cookie });
    assert.match(echoed, /^HTTP\/1\.1 101/);
    assert.match(echoed, /echo:ping/);
    const ws = sdr.seen.find(item => item.upgrade);
    assert.equal(ws.url, "/ws/?a=1");
    assert.equal(ws.headers.host, `127.0.0.1:${sdr.port}`);
  } finally { await cleanup(); await sdr.close(); await rig.close(); }
});

test("agent over TLS answers /api/state when the client trusts the generated certificate", async () => {
  const rig = await fakeRigctld();
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-agent-tls-"));
  const agent = createRemoteAgent({ configDir, port: 0, rigctldPort: rig.port, reconnectMs: 50, pollMs: 40, tls: true });
  const { port } = await agent.start();
  try {
    assert.equal(agent.tls, true);
    const pem = fs.readFileSync(path.join(configDir, "remote-agent-tls.pem"), "utf8");
    assert.equal(agent.fingerprint, new (require("node:crypto").X509Certificate)(pem).fingerprint256);
    const get = headers => new Promise((resolve, reject) => {
      https.get({ host: "127.0.0.1", port, path: "/api/state", ca: pem, servername: "localhost", headers }, response => {
        let text = "";
        response.on("data", chunk => { text += chunk; });
        response.on("end", () => resolve({ status: response.statusCode, text }));
      }).on("error", reject);
    });
    const ok = await get({ Authorization: `Bearer ${agent.token}` });
    assert.equal(ok.status, 200);
    assert.ok("freq" in JSON.parse(ok.text));
    assert.equal((await get({})).status, 401);
  } finally {
    await agent.close();
    fs.rmSync(configDir, { recursive: true, force: true });
    await rig.close();
  }
});

test("without a relay the state says so, and a direct client cannot set the cookie prefix", async () => {
  const rig = await fakeRigctld();
  const sdr = await fakeOpenwebrx();
  const { agent, call, cleanup } = await startAgent(rig, { openwebrxUrl: `http://127.0.0.1:${sdr.port}/` });
  try {
    assert.deepEqual((await call("GET", "/api/state")).json.relay, { configured: false, connected: false });
    const page = await call("GET", `/sdr/?token=${agent.token}`, { token: "", headers: { "X-Forwarded-Prefix": "/s/evil" } });
    assert.match([].concat(page.headers["set-cookie"]).find(item => item.startsWith("rs_session=")), /Path=\/sdr\//);
    assert.equal((await call("GET", "/sdr", { headers: { "X-Forwarded-Prefix": "/s/evil" } })).headers.location, "/sdr/");
  } finally { await cleanup(); await sdr.close(); await rig.close(); }
});

test("console URLs are relative so the page works under a /s/<id>/ prefix", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "remote-ui.js"), "utf8");
  assert.doesNotMatch(ui, /(?:fetch|api|EventSource)\(\s*[`"']\//);
  assert.doesNotMatch(ui, /new URL\(\s*["']\//);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "remote.html"), "utf8"), /id="relay"/);
});
