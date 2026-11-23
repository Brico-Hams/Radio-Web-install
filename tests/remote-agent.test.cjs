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
const { loadCatalog } = require("../remote-catalog.cjs");
const { createMemoryStore } = require("../remote-cw.cjs");
const { RigctldClient, RigctldError, parseCaps } = require("../rigctld-client.cjs");
const { connectWs } = require("./ws-client.cjs");

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
  const { call, cleanup } = await startAgent(rig, { radioScope: "audio" });
  try {
    for (const file of ["/remote.html", "/remote-ui.js", "/remote-audio-core.js", "/spectrum-core.js", "/remote-audio-worklet.js", "/remote.css"]) {
      const response = await call("GET", file, { token: "" });
      assert.equal(response.status, 200, file);
      assert.equal(response.headers["x-content-type-options"], "nosniff");
      assert.equal(response.headers["referrer-policy"], "no-referrer");
      assert.match(response.headers["content-security-policy"], /frame-src 'none';/);
    }
    for (const file of ["/server.cjs", "/remote-agent.cjs", "/package.json", "/../server.cjs", "/%2e%2e/server.cjs", "/styles.css"]) {
      assert.equal((await call("GET", file, { token: "" })).status, 404, file);
    }
    const config = (await call("GET", "/api/config")).json;
    assert.equal(config.radioScope, "audio");
    assert.equal(config.openwebrxUrl, undefined);
    assert.equal(config.sdrProxy, undefined);
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
    // levels are polled one by one: wait for the last one so the snapshot is complete
    await waitFor(async () => { const s = (await call("GET", "/api/state")).json; return s.levels.agc === 2 && s.levels.rfpower === 0.4 && s.funcs.nb === false && s.funcs.tuner === false; });
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

test("Hamlib G TUNE is bounded: a tune the radio never confirms is reported, TX stays off", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { tuneWatchMs: 300, tuneStatusMs: 80 });
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "tune" }, ...as("client-a") })).status, 200);
    await waitFor(async () => (await call("GET", "/api/state", as("client-a"))).json.tuneResult, 4000);
    const { tuneResult } = (await call("GET", "/api/state", as("client-a"))).json;
    assert.deepEqual([tuneResult.kind, tuneResult.outcome, tuneResult.reason, tuneResult.txOff], ["hamlib", "fail", "unconfirmed", true]);
    assert.ok(rig.log.includes("T 0"));
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

test("QSO book routes are owner-only, QRZ/TQSL are explicit and credentials never reach a response", async () => {
  const rig = await fakeRigctld();
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-qsl-agent-"));
  const token = "t".repeat(40);
  const tqsl = path.resolve("fake-tqsl.exe");
  fs.writeFileSync(path.join(configDir, "remote-agent.json"), JSON.stringify({
    token, qrz: { enabled: true, username: "ea4xyz", password: "hunter2-secret" },
    lotw: { tqslPath: tqsl, args: ["-q", "{file}"], timeoutSeconds: 10 }
  }));
  const urls = [];
  const spawned = [];
  const qslRequest = async url => {
    urls.push(url);
    return { status: 200, body: url.includes("username=") ? "<QRZDatabase><Session><Key>KEY-ABC</Key></Session></QRZDatabase>"
      : "<QRZDatabase><Callsign><call>F4ABC</call><country>France</country></Callsign><Session><Key>KEY-ABC</Key></Session></QRZDatabase>" };
  };
  const qslSpawn = (command, args, options) => {
    const child = new (require("node:events"))();
    child.kill = () => {};
    spawned.push({ command, args, options });
    setImmediate(() => child.emit("close", 0, null));
    return child;
  };
  const { agent, call, cleanup } = await startAgent(rig, { configDir, qslRequest, qslSpawn });
  try {
    assert.equal((await call("GET", "/api/qso", { token: "" })).status, 401);
    const guest = agent.guests.invite({ label: "g", ttlHours: 1, permissions: { main: { transmit: false, bands: [], maxPowerW: null } } });
    for (const [method, url] of [["GET", "/api/qso"], ["GET", "/api/qso.adif"], ["GET", "/api/qrz/lookup?call=F4ABC"], ["POST", "/api/lotw/upload"]]) {
      assert.equal((await call(method, url, { token: guest.token, ...(method === "POST" ? { body: { confirm: true } } : {}) })).status, 403, url);
    }
    assert.equal(urls.length, 0);
    assert.equal(spawned.length, 0);

    const added = await call("POST", "/api/qso", { body: { call: "f4abc", frequencyMHz: "14.074", mode: "FT8", sent: "-10", received: "-12" } });
    assert.equal(added.status, 201);
    const listed = await call("GET", "/api/qso");
    assert.equal(listed.json.total, 1);
    assert.deepEqual(listed.json.qrz, { enabled: true });
    assert.deepEqual(listed.json.lotw, { configured: true });
    const looked = await call("GET", "/api/qrz/lookup?call=f4abc");
    assert.equal(looked.json.country, "France");
    const adif = await call("GET", "/api/qso.adif");
    assert.equal(adif.status, 200);
    assert.match(adif.text, /<CALL:5>F4ABC/);
    assert.match(adif.headers["content-disposition"], /radicodex\.adi/);
    const imported = await call("POST", "/api/qso/import", { body: { adif: adif.text } });
    assert.deepEqual([imported.json.added, imported.json.skipped], [0, 1]);

    assert.equal((await call("POST", "/api/lotw/upload", { body: {} })).status, 400);
    assert.equal(spawned.length, 0);
    const uploaded = await call("POST", "/api/lotw/upload", { body: { confirm: true } });
    assert.equal(uploaded.json.uploaded, 1);
    assert.equal(spawned.length, 1);
    assert.equal(spawned[0].command, tqsl);
    assert.equal(spawned[0].options.shell, false);

    for (const text of [listed.text, looked.text, adif.text, added.text, uploaded.text, JSON.stringify(agent.snapshot("x"))]) {
      assert.ok(!text.includes("hunter2-secret") && !text.includes("KEY-ABC"));
    }
  } finally {
    await cleanup();
    await rig.close();
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});

test("without a relay the state says so", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig);
  try {
    assert.deepEqual((await call("GET", "/api/state")).json.relay, { configured: false, connected: false });
  } finally { await cleanup(); await rig.close(); }
});

test("console URLs are relative so the page works under a /s/<id>/ prefix", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "remote-ui.js"), "utf8");
  assert.doesNotMatch(ui, /(?:fetch|api|EventSource)\(\s*[`"']\//);
  assert.doesNotMatch(ui, /new URL\(\s*["']\//);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "remote.html"), "utf8"), /id="relay"/);
});

// ---- audio WebSocket ----
function fakeAudio({ rx = true, tx = true } = {}) {
  const subs = new Set();
  const service = {
    rx, tx, txReason: tx ? "" : "sin salida", writes: [], released: 0, subs,
    subscribe(entry) { subs.add(entry); return () => subs.delete(entry); },
    txWrite(packet) { service.writes.push(Buffer.from(packet)); return true; },
    txRelease() { service.released += 1; },
    close() {},
    packet(bytes) { for (const entry of [...subs]) entry.onPacket(Buffer.from(bytes)); },
    level(rms) { for (const entry of [...subs]) entry.onLevel(rms); }
  };
  return service;
}

const txFrame = (seq, bytes) => {
  const head = Buffer.alloc(5);
  head[0] = 2;
  head.writeUInt32BE(seq, 1);
  return Buffer.concat([head, Buffer.from(bytes)]);
};

async function audioClient(agent, cid, { token = agent.token } = {}) {
  const client = await connectWs(agent.server.address().port);
  client.sendJson({ type: "auth", token, cid });
  return client;
}

test("audio WebSocket without a valid token closes with 4401 and gets no hello", async () => {
  const rig = await fakeRigctld();
  const { agent, cleanup } = await startAgent(rig, { audioService: fakeAudio() });
  try {
    const bad = await audioClient(agent, "client-a", { token: "x".repeat(43) });
    assert.equal(await bad.waitClose(), 4401);
    assert.equal(bad.messages.length, 0);
    const first = await connectWs(agent.server.address().port);
    first.sendJson({ type: "rx", on: true });
    assert.equal(await first.waitClose(), 4401);
    const wrongPath = await connectWs(agent.server.address().port, "/api/other").catch(() => ({ status: 404 }));
    assert.equal(wrongPath.status, 404);
  } finally { await cleanup(); await rig.close(); }
});

test("audio hello, /api/config flag, RX broadcast with type+sequence, levels and rx pause", async () => {
  const rig = await fakeRigctld();
  const audio = fakeAudio();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: audio });
  try {
    assert.deepEqual((await call("GET", "/api/config")).json.audio, { rx: true, tx: true });
    const client = await audioClient(agent, "client-a");
    const hello = JSON.parse((await client.next(m => m.text)).text);
    assert.equal(hello.type, "hello");
    assert.deepEqual(hello.rx, { codec: "opus", sampleRate: 48000, channels: 1, frameMs: 20 });
    assert.deepEqual(hello.tx, { allowed: true, codec: "opus", sampleRate: 48000, channels: 1, frameMs: 20 });
    audio.packet([0xf8, 1]);
    audio.packet([0xf8, 2]);
    const a = (await client.next(m => m.binary)).binary;
    const b = (await client.next(m => m.binary)).binary;
    assert.equal(a[0], 1);
    assert.equal(a.readUInt32BE(1), 0);
    assert.equal(b.readUInt32BE(1), 1);
    assert.deepEqual([...b.subarray(5)], [0xf8, 2]);
    audio.level(-31.5);
    assert.deepEqual(JSON.parse((await client.next(m => m.text)).text), { type: "level", rms: -31.5 });
    client.sendJson({ type: "rx", on: false });
    await waitFor(() => audio.subs.size === 0);
    client.sendJson({ type: "rx", on: true });
    await waitFor(() => audio.subs.size === 1);
    client.close();
    await waitFor(() => audio.subs.size === 0);
  } finally { await cleanup(); await rig.close(); }
});

test("audio hello for an unconfigured service has no rx/tx; a TX-unsupported system reports the reason", async () => {
  const rig = await fakeRigctld();
  const blank = fakeAudio({ rx: false, tx: false });
  blank.txReason = "";
  const none = await startAgent(rig, { audioService: blank });
  try {
    assert.deepEqual((await none.call("GET", "/api/config")).json.audio, { rx: false, tx: false });
    const empty = await audioClient(none.agent, "client-a");
    const bare = JSON.parse((await empty.next(m => m.text)).text);
    assert.deepEqual(bare, { type: "hello" });
    empty.close();
  } finally { await none.cleanup(); }
  const limited = await startAgent(rig, { audioService: fakeAudio({ rx: true, tx: false }) });
  try {
    const client = await audioClient(limited.agent, "client-a");
    const hello = JSON.parse((await client.next(m => m.text)).text);
    assert.equal(hello.tx.allowed, false);
    assert.equal(hello.tx.reason, "sin salida");
    client.close();
  } finally { await limited.cleanup(); await rig.close(); }
});

test("TX frames are dropped unless the client owns control AND the PTT is on", async () => {
  const rig = await fakeRigctld();
  const audio = fakeAudio();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: audio });
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    const owner = await audioClient(agent, "client-a");
    const other = await audioClient(agent, "client-b");
    await owner.next(m => m.text);
    await other.next(m => m.text);
    await call("POST", "/api/cmd", { body: { cmd: "freq", value: 7100000 }, ...as("client-a") });
    owner.send(txFrame(1, [1, 2, 3]));
    const refusal = JSON.parse((await owner.next(m => m.text)).text);
    assert.equal(refusal.type, "tx_refused");
    assert.match(refusal.reason, /PTT/);
    assert.equal(audio.writes.length, 0);

    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, ...as("client-a") });
    other.send(txFrame(1, [9, 9]));
    assert.match(JSON.parse((await other.next(m => m.text)).text).reason, /control/);
    owner.send(txFrame(2, [4, 5, 6]));
    await waitFor(() => audio.writes.length === 1);
    assert.deepEqual([...audio.writes[0]], [4, 5, 6]);
    assert.equal(audio.writes.length, 1);

    // Refusals are rate limited to one per second.
    other.send(txFrame(3, [1]));
    other.send(txFrame(4, [1]));
    await sleep(100);
    assert.equal(other.messages.filter(m => m.text).length, 0);

    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: false }, ...as("client-a") });
    assert.ok(audio.released >= 1);
    owner.send(txFrame(5, [7]));
    await sleep(100);
    assert.equal(audio.writes.length, 1);
    owner.close();
    other.close();
  } finally { await cleanup(); await rig.close(); }
});

test("TX frames keep the PTT alive like heartbeats", async () => {
  const rig = await fakeRigctld();
  const audio = fakeAudio();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: audio });
  try {
    const client = await audioClient(agent, "client-a");
    await client.next(m => m.text);
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, headers: { "X-Client-Id": "client-a" } });
    const timer = setInterval(() => client.send(txFrame(1, [1, 2])), 100);
    try { await sleep(1500); } finally { clearInterval(timer); }
    assert.equal(rig.ptt, 1);
    client.close();
  } finally { await cleanup(); await rig.close(); }
});

test("closing the PTT owner's audio socket sends T 0 immediately", async () => {
  const rig = await fakeRigctld();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: fakeAudio(), heartbeatTimeoutMs: 60_000 });
  try {
    const client = await audioClient(agent, "client-a");
    await client.next(m => m.text);
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, headers: { "X-Client-Id": "client-a" } });
    assert.equal(rig.ptt, 1);
    rig.log.length = 0;
    client.close();
    await waitFor(() => rig.log.includes("T 0"));
    assert.equal(rig.ptt, 0);
    assert.equal((await call("GET", "/api/state")).json.ptt, false);
  } finally { await cleanup(); await rig.close(); }
});

test("a clean WebSocket close frame from the PTT owner also unkeys at once", async () => {
  const rig = await fakeRigctld();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: fakeAudio(), heartbeatTimeoutMs: 60_000 });
  try {
    const client = await audioClient(agent, "client-a");
    await client.next(m => m.text);
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, headers: { "X-Client-Id": "client-a" } });
    assert.equal(rig.ptt, 1);
    rig.log.length = 0;
    client.sendFrame(8, Buffer.from([0x03, 0xe8]));
    await waitFor(() => rig.log.includes("T 0"));
    assert.equal(rig.ptt, 0);
    client.close();
  } finally { await cleanup(); await rig.close(); }
});

test("a non-owner audio socket closing does not touch the PTT", async () => {
  const rig = await fakeRigctld();
  const { agent, call, cleanup } = await startAgent(rig, { audioService: fakeAudio(), heartbeatTimeoutMs: 60_000 });
  try {
    const other = await audioClient(agent, "client-b");
    await other.next(m => m.text);
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true }, headers: { "X-Client-Id": "client-a" } });
    other.close();
    await sleep(200);
    assert.equal(rig.ptt, 1);
  } finally { await cleanup(); await rig.close(); }
});

const cwRadio = id => ({ radioId: id, radio: loadCatalog().radios.find(item => item.id === id) });
const keyerLines = rig => rig.log.filter(line => /^(W (KM|KY)|b )/.test(line));

test("remote CW is refused until the operator enables it and nothing reaches the radio", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, cwRadio("yaesu-ftx-1"));
  try {
    assert.equal((await call("GET", "/api/state")).json.cw.enabled, false);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ" } })).status, 403);
    assert.deepEqual(keyerLines(rig), []);
  } finally { await cleanup(); await rig.close(); }
});

test("remote CW sends through the FTX-1 keyer (KM5 then KY05) and cwstop sends KY00 without needing control", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { ...cwRadio("yaesu-ftx-1"), cwEnabled: true, heartbeatTimeoutMs: 60_000 });
  const as = id => ({ headers: { "X-Client-Id": id } });
  try {
    const sent = await call("POST", "/api/cmd", { body: { cmd: "cw", text: "cq test", wpm: 20 }, ...as("client-a") });
    assert.equal(sent.status, 200);
    assert.equal(sent.json.state.cw.active, true);
    assert.deepEqual(keyerLines(rig), ["W KM5CQ TEST; 0", "W KY05; 0"]);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "73" }, ...as("client-a") })).status, 409);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "73" }, ...as("client-b") })).status, 409);
    const stopped = await call("POST", "/api/cmd", { body: { cmd: "cwstop" }, ...as("client-b") });
    assert.equal(stopped.status, 200);
    assert.equal(stopped.json.state.cw.active, false);
    assert.equal(keyerLines(rig).at(-1), "W KY00; 0");
  } finally { await cleanup(); await rig.close(); }
});

test("remote CW refuses texts the radio cannot key, messages over the time cap and a busy PTT", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { ...cwRadio("yaesu-ftx-1"), cwEnabled: true, cwMaxSeconds: 3, heartbeatTimeoutMs: 60_000 });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ;" } })).status, 400);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ CQ CQ CQ CQ CQ CQ CQ", wpm: 5 } })).status, 400);
    assert.deepEqual(keyerLines(rig), []);
    await call("POST", "/api/cmd", { body: { cmd: "ptt", value: true } });
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ" } })).status, 409);
  } finally { await cleanup(); await rig.close(); }
});

test("PTT off pre-empts a running CW message", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { ...cwRadio("yaesu-ftx-1"), cwEnabled: true, heartbeatTimeoutMs: 60_000 });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ" } })).status, 200);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "ptt", value: false } })).status, 200);
    await waitFor(() => keyerLines(rig).at(-1) === "W KY00; 0");
    assert.equal((await call("GET", "/api/state")).json.cw.active, false);
  } finally { await cleanup(); await rig.close(); }
});

test("a message stops when the operator loses control (injected clock)", async () => {
  const rig = await fakeRigctld();
  let time = 1_000_000;
  const { call, cleanup } = await startAgent(rig, { ...cwRadio("yaesu-ftx-1"), cwEnabled: true, cwMaxSeconds: 120, now: () => time });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ CQ CQ CQ CQ", wpm: 5 } })).status, 200);
    time += 30_001;
    await waitFor(() => keyerLines(rig).at(-1) === "W KY00; 0");
  } finally { await cleanup(); await rig.close(); }
});

test("radios without a native keyer command use Hamlib send_morse and refuse unsourced ones", async () => {
  const rig = await fakeRigctld();
  const { call, cleanup } = await startAgent(rig, { ...cwRadio("kenwood-ts-590s"), cwEnabled: true });
  try {
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cw", text: "cq" } })).status, 200);
    assert.deepEqual(keyerLines(rig), ["b CQ"]);
    assert.equal((await call("POST", "/api/cmd", { body: { cmd: "cwstop" } })).status, 200);
    assert.deepEqual(keyerLines(rig), ["b CQ"]);
  } finally { await cleanup(); await rig.close(); }
  const receiver = await fakeRigctld();
  const second = await startAgent(receiver, { ...cwRadio("icom-ic-r8600"), cwEnabled: true });
  try {
    assert.equal((await second.call("POST", "/api/cmd", { body: { cmd: "cw", text: "CQ" } })).status, 501);
  } finally { await second.cleanup(); await receiver.close(); }
});

test("listen-only guests get no CW and no memories; transmit guests keep their own F1-F8", async () => {
  const rig = await fakeRigctld();
  const { agent, call, cleanup } = await startAgent(rig, { ...cwRadio("yaesu-ftx-1"), cwEnabled: true });
  const permission = transmit => ({ "yaesu-ftx-1": { transmit, bands: [], maxPowerW: null } });
  const listener = agent.guests.invite({ label: "LISTEN", permissions: permission(false) });
  const talker = agent.guests.invite({ label: "TALK", permissions: permission(true) });
  const memories = tag => ["CQ DE {MYCALL}", ...Array.from({ length: 7 }, (_, i) => `${tag}${i}`)];
  try {
    assert.equal((await call("POST", "/api/cmd", { token: listener.token, body: { cmd: "cw", text: "CQ" } })).status, 403);
    assert.equal((await call("GET", "/api/cw/memories", { token: listener.token })).status, 403);
    assert.equal((await call("POST", "/api/cw/memories", { token: listener.token, body: { memories: memories("L") } })).status, 403);
    assert.deepEqual(keyerLines(rig), []);

    assert.equal((await call("GET", "/api/cw/memories")).json.memories[0], "CQ CQ DE {MYCALL} {MYCALL} K");
    assert.equal((await call("POST", "/api/cw/memories", { body: { memories: memories("O") } })).status, 200);
    assert.equal((await call("POST", "/api/cw/memories", { token: talker.token, body: { memories: memories("T") } })).status, 200);
    assert.equal((await call("GET", "/api/cw/memories")).json.memories[1], "O0");
    assert.equal((await call("GET", "/api/cw/memories", { token: talker.token })).json.memories[1], "T0");

    for (const bad of [memories("O").slice(1), ["X;", ...memories("O").slice(1)], ["A".repeat(51), ...memories("O").slice(1)], "nope"]) {
      assert.equal((await call("POST", "/api/cw/memories", { body: { memories: bad } })).status, 400, JSON.stringify(bad));
    }
    assert.equal((await call("POST", "/api/cw/memories", { body: { memories: memories("O") }, headers: { "Content-Type": "text/plain" }, raw: "x" })).status, 415);

    assert.equal((await call("POST", "/api/cmd", { token: talker.token, body: { cmd: "cw", text: "CQ" } })).status, 200);
    assert.deepEqual(keyerLines(rig), ["W KM5CQ; 0", "W KY05; 0"]);
  } finally { await cleanup(); await rig.close(); }
});

test("CW memories persist per operator on disk, hold no credentials and reject bad data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-cw-"));
  try {
    const store = createMemoryStore({ dir });
    const memories = ["CQ", "73", "{CALL} {RST}", "A", "B", "C", "D", "E"];
    store.set("owner", memories);
    store.set("guest:g0123456789ab", [...memories].reverse());
    const again = createMemoryStore({ dir });
    assert.deepEqual(again.get("owner"), memories);
    assert.deepEqual(again.get("guest:g0123456789ab"), [...memories].reverse());
    assert.equal(again.get("guest:gffffffffffff")[0], "CQ CQ DE {MYCALL} {MYCALL} K");
    assert.throws(() => again.get("../evil"), { code: "operator" });
    assert.throws(() => again.set("owner", ["x"]), { code: "memory" });
    assert.doesNotMatch(fs.readFileSync(path.join(dir, "remote-cw-memories.json"), "utf8"), /token|password|secret/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

