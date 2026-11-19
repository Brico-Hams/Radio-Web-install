"use strict";
// Transmit-side tests against a fake rigctld: raw CAT (NUL-terminated replies), FTX-1 tuner/meters, SWR protection.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { createRemoteAgent, parseRawMeter, parsePower } = require("../remote-agent.cjs");
const { RigctldClient, RigctldError } = require("../rigctld-client.cjs");
const { findRadio, validateCatalog, loadCatalog } = require("../remote-catalog.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 3000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(20);
  }
  assert.fail("waitFor timed out");
}

const BASE_CAPS = [
  "Model name:\t\tFTX-1",
  "Mfg name:\t\tYaesu",
  "Get level: AF(0..1/0.01) RFPOWER(0..1/0.01)",
  "Set level: AF(0..1/0.01) RFPOWER(0..1/0.01)",
  "Get functions: TUNER",
  "Set functions: TUNER",
  "VFO Ops:\t\tTUNE"
];

// `raw` maps a CAT command to its reply (without the NUL), null for "no answer"; `rawDelay` delays replies.
async function fakeRigctld(capsLines = BASE_CAPS) {
  const rig = {
    freq: 28500000, ptt: 0, log: [], sockets: new Set(), connections: 0, rawDelay: 0, levels: {},
    raw: { AC: "AC100;", PC: "PC2010;", TX: "TX0;", RM4: "RM4000000;", RM5: "RM5000000;", RM6: "RM6000000;" }
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
        const raw = /^W ([A-Z0-9]+); ;$/.exec(line);
        if (raw) {
          const cmd = raw[1];
          const reply = typeof rig.raw[cmd] === "function" ? rig.raw[cmd]() : rig.raw[cmd];
          if (reply === null || reply === undefined) continue;
          const write = () => socket.write(`${reply}\0`);
          if (rig.rawDelay) setTimeout(write, rig.rawDelay); else write();
          continue;
        }
        let reply = "RPRT 0\n";
        if (command === "f") reply = `${rig.freq}\n`;
        else if (command === "m") reply = "USB\n2400\n";
        else if (command === "t") reply = `${rig.ptt}\n`;
        else if (command === "l") reply = Object.hasOwn(rig.levels, args[0]) ? `${rig.levels[args[0]]}\n` : "RPRT -11\n";
        else if (command === "u") reply = "0\n";
        else if (command === "T") rig.ptt = Number(args[0]);
        else if (command === "\\dump_caps") reply = `${capsLines.join("\n")}\nRPRT 0\n`;
        else if (command === "v") reply = "VFOA\n";
        else if (command === "s") reply = "0\nVFOA\n";
        socket.write(reply);
      }
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  rig.port = server.address().port;
  rig.close = () => new Promise(resolve => { for (const socket of rig.sockets) socket.destroy(); server.close(() => resolve()); });
  return rig;
}

async function startAgent(rig, extra = {}) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-tx-"));
  const agent = createRemoteAgent({ configDir, port: 0, rigctldPort: rig.port, reconnectMs: 50, pollMs: 40, ...extra });
  const address = await agent.start();
  const call = (method, url, body) => new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request({
      host: "127.0.0.1", port: address.port, method, path: url,
      headers: { Authorization: `Bearer ${agent.token}`, "X-Client-Id": "tester", ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) }
    }, response => {
      let text = "";
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, json: JSON.parse(text) }));
    });
    request.on("error", reject);
    request.end(payload);
  });
  await waitFor(async () => (await call("GET", "/api/state")).json.freq === rig.freq);
  const state = async () => (await call("GET", "/api/state")).json;
  const cmd = body => call("POST", "/api/cmd", body);
  return { agent, call, cmd, state, cleanup: async () => { await agent.close(); fs.rmSync(configDir, { recursive: true, force: true }); } };
}

const ftx1 = () => findRadio("yaesu-ftx-1").cat;

function keepAlive(call) {
  const timer = setInterval(() => { call("POST", "/api/heartbeat", {}).catch(() => {}); }, 250);
  return () => clearInterval(timer);
}

async function connectedClient(rig, rawAllow, extra = {}) {
  const client = new RigctldClient({ port: rig.port, reconnectMs: 50, rawAllow, ...extra });
  const connected = new Promise(resolve => client.once("connect", resolve));
  client.start();
  await connected;
  return client;
}

test("raw CAT: NUL-terminated replies, silent sets keep the connection, ?; is an error", async () => {
  const rig = await fakeRigctld();
  rig.raw.AC101 = null;
  rig.raw.AC = "?;";
  const client = await connectedClient(rig, ["PC", "AC", "AC101"], { rawIdleMs: 120 });
  try {
    assert.equal(await client.sendRaw("PC", { read: true }), "PC2010;");
    const started = Date.now();
    assert.equal(await client.sendRaw("AC101"), null);
    assert.ok(Date.now() - started >= 100, "waits for the idle timeout");
    assert.equal(rig.connections, 1);
    assert.equal(await client.sendRaw("PC", { read: true }), "PC2010;");
    await assert.rejects(client.sendRaw("AC", { read: true }), error => error instanceof RigctldError && error.code === "rejected");
    assert.equal(await client.getFreq(), 28500000);
    assert.equal(rig.connections, 1);
    assert.deepEqual(rig.log.filter(line => line.startsWith("W")), ["W PC; ;", "W AC101; ;", "W PC; ;", "W AC; ;"]);
  } finally { client.stop(); await rig.close(); }
});

test("raw allow-list rejects anything else and never reaches rigctld", async () => {
  const rig = await fakeRigctld();
  const client = await connectedClient(rig, ["PC"]);
  try {
    for (const cmd of ["MD0", "pc", "PC;\nT 1", "PC; ;", "", "PC2100", 5, null]) {
      await assert.rejects(client.sendRaw(cmd), error => error instanceof RigctldError && error.code === "invalid", String(cmd));
    }
    assert.equal(rig.log.length, 0);
  } finally { client.stop(); await rig.close(); }
});

test("catalog: FTX-1 carries a validated cat override and bad ones are refused", () => {
  const cat = ftx1();
  assert.equal(cat.tuner.on, "AC101");
  assert.equal(cat.tuner.off, "AC100");
  assert.equal(cat.tuner.start, "AC103");
  assert.deepEqual(cat.meters, { alc: "RM4", po: "RM5", swr: "RM6" });
  const data = JSON.parse(JSON.stringify(loadCatalog()));
  data.radios.find(radio => radio.id === "yaesu-ftx-1").cat.tuner.on = "AC101;T1";
  assert.throws(() => validateCatalog(data), /cat\.tuner\.on/);
});

test("raw meter and power parsing", () => {
  assert.equal(parseRawMeter("RM4255000;", "RM4"), 255);
  assert.equal(parseRawMeter("RM5128000;", "RM5"), 128);
  assert.equal(parseRawMeter("RM6040000;", "RM5"), null);
  assert.equal(parseRawMeter("?;", "RM6"), null);
  assert.equal(parsePower("PC2010;"), 10);
  assert.equal(parsePower("PC2100;"), 100);
  assert.equal(parsePower("XX"), null);
});

test("FTX-1: tuner on/off use AC101/AC100 and the state is read back with AC", async () => {
  const rig = await fakeRigctld();
  rig.raw.AC101 = null;
  rig.raw.AC100 = null;
  rig.raw.AC = () => (rig.log.filter(line => line === "W AC101; ;").length > rig.log.filter(line => line === "W AC100; ;").length ? "AC101;" : "AC100;");
  const { cmd, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60 });
  try {
    assert.equal((await cmd({ cmd: "func", name: "TUNER", on: true })).status, 200);
    assert.ok(rig.log.includes("W AC101; ;"));
    assert.ok(!rig.log.includes("U TUNER 1"));
    await waitFor(async () => (await state()).funcs.tuner === true);
    assert.equal((await cmd({ cmd: "func", name: "TUNER", on: false })).status, 200);
    assert.ok(rig.log.includes("W AC100; ;"));
    await waitFor(async () => (await state()).funcs.tuner === false);
  } finally { await cleanup(); await rig.close(); }
});

test("FTX-1 tune: AC103 then watch TX; no TX1/TX2 within the window is reported", async () => {
  const rig = await fakeRigctld();
  rig.raw.AC103 = null;
  const { cmd, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, tuneWatchMs: 700, tunePollMs: 100 });
  try {
    const result = await cmd({ cmd: "tune" });
    assert.equal(result.status, 502);
    assert.equal(result.json.error, "La radio no ha iniciado la sintonía (revisa el sintonizador/ATAS en el equipo)");
    assert.ok(rig.log.includes("W AC103; ;"));
    assert.ok(rig.log.includes("W TX; ;"));
    assert.equal((await state()).notice.text, result.json.error);
    rig.raw.TX = "TX1;";
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});

test("FTX-1 TX meters: raw values, fractions and the configured power", async () => {
  const rig = await fakeRigctld();
  Object.assign(rig.raw, { RM4: "RM4255000;", RM5: "RM5128000;", RM6: "RM6020000;", PC: "PC2100;" });
  const { cmd, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, meterMs: 100 });
  try {
    assert.equal((await state()).tx, null);
    await cmd({ cmd: "ptt", value: true });
    await waitFor(async () => (await state()).tx?.powerSetW === 100);
    const { tx } = await state();
    assert.deepEqual([tx.source, tx.alc, tx.po, tx.swr], ["raw", 255, 128, 20]);
    assert.deepEqual(tx.fraction, { po: 0.502, swr: 0.078, alc: 1 });
    await cmd({ cmd: "ptt", value: false });
    assert.equal((await state()).tx, null);
  } finally { await cleanup(); await rig.close(); }
});

test("FTX-1 high raw SWR for over 1 s cuts the PTT and tells the console", async () => {
  const rig = await fakeRigctld();
  rig.raw.RM6 = "RM6200000;";
  const logs = [];
  const { cmd, call, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, log: message => logs.push(message), txLimitSeconds: 60 });
  let stopBeat = () => {};
  try {
    await cmd({ cmd: "ptt", value: true });
    stopBeat = keepAlive(call);
    const started = Date.now();
    await waitFor(() => rig.ptt === 0, 3000);
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 1000 && elapsed < 1800, `tripped after ${elapsed} ms`);
    assert.ok(logs.includes("PTT off: ROE alta"));
    await waitFor(async () => (await state()).ptt === false);
    const after = await state();
    assert.equal(after.txAlert, "swr");
    assert.match(after.notice.text, /ROE alta/);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a brief SWR spike below 1 s does not trip the protection", async () => {
  const rig = await fakeRigctld();
  let spike = true;
  rig.raw.RM6 = () => (spike ? "RM6200000;" : "RM6010000;");
  const { cmd, call, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, meterMs: 100, txLimitSeconds: 60 });
  let stopBeat = () => {};
  try {
    await cmd({ cmd: "ptt", value: true });
    stopBeat = keepAlive(call);
    await sleep(500);
    spike = false;
    await sleep(1200);
    assert.equal(rig.ptt, 1);
    assert.equal((await state()).txAlert, null);
    await cmd({ cmd: "ptt", value: false });
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("PTT off is not delayed by meter polling", async () => {
  const rig = await fakeRigctld();
  rig.rawDelay = 120;
  const { cmd, call, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, meterMs: 20, txLimitSeconds: 60 });
  try {
    await cmd({ cmd: "ptt", value: true });
    await waitFor(() => rig.log.filter(line => line === "W RM4; ;").length >= 2);
    const started = Date.now();
    const released = await cmd({ cmd: "ptt", value: false });
    const elapsed = Date.now() - started;
    assert.equal(released.status, 200);
    assert.equal(rig.ptt, 0);
    assert.ok(elapsed < 350, `PTT off took ${elapsed} ms`);
    assert.equal((await call("GET", "/api/state")).json.ptt, false);
  } finally { await cleanup(); await rig.close(); }
});

test("radios without a cat override expose Hamlib meters as they come, and SWR protection uses swrLimit", async () => {
  const rig = await fakeRigctld([...BASE_CAPS, "Get level: RFPOWER_METER_WATTS(0..100/1) SWR(0..10/0.1) ALC(0..1/0.01)"]);
  Object.assign(rig.levels, { RFPOWER_METER_WATTS: 12, SWR: 5, ALC: 0.4 });
  const { cmd, call, state, cleanup } = await startAgent(rig, { meterMs: 100, txLimitSeconds: 60 });
  let stopBeat = () => {};
  try {
    await cmd({ cmd: "ptt", value: true });
    stopBeat = keepAlive(call);
    await waitFor(async () => (await state()).tx?.swr === 5);
    const { tx } = await state();
    assert.deepEqual([tx.source, tx.po, tx.alc, tx.powerSetW], ["hamlib", 12, 0.4, null]);
    assert.ok(!rig.log.some(line => line.startsWith("W ")));
    await waitFor(() => rig.ptt === 0, 3000);
    assert.equal((await state()).txAlert, "swr");
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});
