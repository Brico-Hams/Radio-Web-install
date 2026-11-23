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
    raw: { AC: "AC100;", PC: "PC2010;", TX: "TX0;", RI0: "RI00000000;", RM3: "RM3000000;", RM4: "RM4000000;", RM5: "RM5000000;", RM6: "RM6000000;", RM7: "RM7000000;", RM8: "RM8201000;" }
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
        if (rig.hang) continue;
        const [command, ...args] = line.split(" ");
        const raw = /^W ([A-Z0-9]+); (;|0)$/.exec(line);
        if (raw) {
          const cmd = raw[1];
          // Expected reply length 0: rigctld answers one NUL at once. "; ;" on a set blocks until its timeout.
          if (raw[2] === "0") { rig.onSet?.(cmd); socket.write("\0"); continue; }
          const reply = typeof rig.raw[cmd] === "function" ? rig.raw[cmd]() : rig.raw[cmd];
          if (reply === null || reply === undefined) { if (rig.setBlockMs !== Infinity) setTimeout(() => socket.write("\0"), rig.setBlockMs ?? 1800); continue; }
          const write = () => socket.write(`${reply}\0`);
          if (rig.rawDelay) setTimeout(write, rig.rawDelay); else write();
          continue;
        }
        let reply = "RPRT 0\n";
        if (command === "f") reply = `${rig.freq}\n`;
        if (command === "f" && rig.freqDelay) { setTimeout(() => socket.write(reply), rig.freqDelay); continue; }
        else if (command === "m") reply = rig.modeReply ? rig.modeReply() : "USB\n2400\n";
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

test("raw CAT: NUL-terminated replies, sets use '; 0' and return at once, ?; is an error", async () => {
  const rig = await fakeRigctld();
  rig.raw.AC = "?;";
  const client = await connectedClient(rig, ["PC", "AC", "AC101"]);
  try {
    assert.equal(await client.sendRaw("PC", { read: true }), "PC2010;");
    const started = Date.now();
    assert.equal(await client.sendRaw("AC101"), null);
    assert.ok(Date.now() - started < 200, "a set does not wait");
    assert.equal(rig.connections, 1);
    assert.equal(await client.sendRaw("PC", { read: true }), "PC2010;");
    await assert.rejects(client.sendRaw("AC", { read: true }), error => error instanceof RigctldError && error.code === "rejected");
    assert.equal(await client.getFreq(), 28500000);
    assert.equal(rig.connections, 1);
    assert.deepEqual(rig.log.filter(line => line.startsWith("W")), ["W PC; ;", "W AC101; 0", "W PC; ;", "W AC; ;"]);
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
  assert.deepEqual(cat.tuner.internal, { on: "AC101", off: "AC100", start: "AC103", stop: "AC100" });
  assert.deepEqual(cat.tuner.atas, { start: "AC123", stop: "AC120" });
  assert.equal(cat.status, "RI0");
  assert.equal(cat.txOff, "TX0");
  assert.deepEqual(cat.meters, { alc: "RM4", po: "RM5", swr: "RM6", comp: "RM3", id: "RM7", vdd: "RM8" });
  const data = JSON.parse(JSON.stringify(loadCatalog()));
  data.radios.find(radio => radio.id === "yaesu-ftx-1").cat.tuner.internal.on = "AC101;T1";
  assert.throws(() => validateCatalog(data), /cat\.tuner\.internal\.on/);
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
  rig.raw.AC = () => (rig.log.filter(line => line === "W AC101; 0").length > rig.log.filter(line => line === "W AC100; 0").length ? "AC101;" : "AC100;");
  const { cmd, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60 });
  try {
    assert.equal((await cmd({ cmd: "func", name: "TUNER", on: true })).status, 200);
    assert.ok(rig.log.includes("W AC101; 0"));
    assert.ok(!rig.log.includes("U TUNER 1"));
    await waitFor(async () => (await state()).funcs.tuner === true);
    assert.equal((await cmd({ cmd: "func", name: "TUNER", on: false })).status, 200);
    assert.ok(rig.log.includes("W AC100; 0"));
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
    assert.ok(rig.log.includes("W AC103; 0"));
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
    const started = Date.now();
    await cmd({ cmd: "ptt", value: true });
    stopBeat = keepAlive(call);
    await waitFor(() => rig.ptt === 0, 3000);
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 900 && elapsed < 2200, `tripped after ${elapsed} ms`);
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

test("the stop sequence queues every step at once so no poll can slip between them", async () => {
  const { stopSequence } = require("../rigctld-client.cjs");
  const issued = [];
  const resolvers = [];
  const track = name => { issued.push(name); return new Promise(resolve => resolvers.push(resolve)); };
  const client = { sendRaw: (cmd, options) => { assert.equal(options.priority, true); return track(cmd); }, setPtt: (on, options) => { assert.equal(options.priority, true); return track("T 0"); } };
  const done = stopSequence(client, { cat: ftx1(), tunerKind: "atas", tuner: true, stepMs: 1000 });
  assert.deepEqual(issued.sort(), [ftx1().tuner.atas.stop, ftx1().txOff, "T 0"].sort());
  for (const resolve of resolvers) resolve(null);
  assert.equal(await done, true);
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

test("connect sequence sends every set as '; 0' and finishes in under 500 ms even if '; ;' sets would block", async () => {
  const rig = await fakeRigctld();
  const client = await connectedClient(rig, ["AC120", "TX0", "AC100"]);
  try {
    const { stopSequence } = require("../rigctld-client.cjs");
    const started = Date.now();
    assert.equal(await stopSequence(client, { cat: ftx1(), tunerKind: "atas", tuner: true }), true);
    assert.ok(Date.now() - started < 500, `stop took ${Date.now() - started} ms`);
    assert.deepEqual(rig.log, ["W AC120; 0", "W TX0; 0", "T 0"]);
    const next = Date.now();
    assert.equal(await client.getFreq(), 28500000);
    assert.ok(Date.now() - next < 200);
  } finally { client.stop(); await rig.close(); }
});

test("agent connect stop sequence uses '; 0' and the first frequency arrives quickly", async () => {
  const rig = await fakeRigctld();
  const started = Date.now();
  const { agent, cleanup } = await startAgent(rig, { radioCat: ftx1(), tunerKind: "atas" });
  try {
    assert.ok(Date.now() - started < 500, `connect took ${Date.now() - started} ms`);
    assert.ok(rig.log.includes("W AC120; 0") && rig.log.includes("W TX0; 0"));
    assert.ok(!rig.log.some(line => /^W (AC120|TX0|AC100); ;$/.test(line)));
    assert.ok(agent);
  } finally { await cleanup(); await rig.close(); }
});

test("hang watchdog does not fire while idle even if a poll takes 2.6 s", async () => {
  const rig = await fakeRigctld();
  let hung = 0;
  const { cleanup } = await startAgent(rig, { hangMs: 2000, onRigctldHung: () => { hung += 1; } });
  try {
    rig.freqDelay = 2600;
    await sleep(3400);
    assert.equal(hung, 0);
    assert.equal(rig.connections, 1);
  } finally { await cleanup(); await rig.close(); }
});

test("hang watchdog fires during TX but at most once per cooldown", async () => {
  const rig = await fakeRigctld();
  let hung = 0;
  const { cmd, cleanup } = await startAgent(rig, { hangMs: 300, hangCooldownMs: 60_000, onRigctldHung: () => { hung += 1; } });
  try {
    await cmd({ cmd: "ptt", value: true });
    rig.freqDelay = 5000;
    await waitFor(() => hung === 1, 3000);
    await sleep(800);
    assert.equal(hung, 1);
  } finally { await cleanup(); await rig.close(); }
});

function atasRig() {
  return fakeRigctld().then(rig => {
    rig.tuning = true;
    // The radio leaves TX/tune once any stop frame arrives, like the real one.
    rig.onSet = cmd => {
      if (["AC123", "AC103"].includes(cmd)) rig.tuning = true;
      if (["AC120", "AC100", "TX0"].includes(cmd)) rig.tuning = false;
    };
    Object.assign(rig.raw, {
      AC123: null, AC120: null, TX0: null,
      TX: () => (rig.tuning ? "TX2;" : "TX0;"),
      RI0: () => (rig.tuning ? "RI00000100;" : "RI00000000;")
    });
    return rig;
  });
}

const atasOptions = extra => ({ radioCat: ftx1(), tunerKind: "atas", rawIdleMs: 60, tuneStatusMs: 100, txLimitSeconds: 60, ...extra });
const afterTune = rig => rig.log.slice(rig.log.lastIndexOf("W AC123; 0") + 1);
const stopOrder = rig => {
  const tail = afterTune(rig);
  return [tail.indexOf("W AC120; 0"), tail.indexOf("W TX0; 0"), tail.indexOf("T 0")];
};
const inOrder = order => order[0] >= 0 && order[0] < order[1] && order[1] < order[2];

test("rigctld replies tolerate surrounding whitespace: ' RPRT 0' is success, any other report or reply still fails", async () => {
  const server = net.createServer(socket => {
    socket.on("error", () => {});
    socket.on("data", chunk => {
      const line = chunk.toString().trim();
      if (line === "T 0") socket.write(" RPRT 0\n");
      else if (line === "T 1") socket.write(" RPRT -9 \n");
      else if (line === "L RFPOWER 0.5") socket.write("\0RPRT 0\n");
      else if (line === "L RFPOWER 0.6") socket.write("\0RPRT -9\n");
      else if (line === "L RFPOWER 0.7") { socket.write("\0RP"); setTimeout(() => socket.write("RT 0\n"), 30); }
      else if (line === "L RFPOWER 0.8") socket.write("\0garbage\n");
      else socket.write("garbage\n");
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const client = new RigctldClient({ port: server.address().port, reconnectMs: 50 });
  const connected = new Promise(resolve => client.once("connect", resolve));
  client.start();
  try {
    await connected;
    await client.setPtt(false);
    await assert.rejects(client.setPtt(true), error => error instanceof RigctldError && error.code === -9);
    await assert.rejects(client.setFreq(7100000), error => error instanceof RigctldError && error.code === "protocol");
    // Stray NUL bytes (Hamlib 4.7.2): "\0RPRT 0" is success, also when the NUL and the report arrive in separate chunks.
    await client.setLevel("RFPOWER", 0.5);
    await client.setLevel("RFPOWER", 0.7);
    await assert.rejects(client.setLevel("RFPOWER", 0.6), error => error instanceof RigctldError && error.code === -9);
    await assert.rejects(client.setLevel("RFPOWER", 0.8), error => error instanceof RigctldError && error.code === "protocol");
  } finally { client.stop(); server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});

test("FTX-1 ATAS tune with TX ranges: the temporary CW-L is never evaluated, the tune is not interrupted, a tune out of band is refused", async () => {
  const rig = await atasRig();
  rig.tuning = false;
  rig.freq = 28_500_000;
  Object.assign(rig.raw, { AC: "AC100;", PC: () => (rig.tuning ? "PC2005;" : "PC2010;") });
  rig.modeReply = () => (rig.tuning ? "CWR\n500\n" : "USB\n2400\n");
  const txRanges = [{ startHz: 28_500_000, endHz: 28_502_400 }];
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ txRanges, meterMs: 50, tuneMaxSeconds: 20 }));
  let stopBeat = () => {};
  try {
    await waitFor(async () => (await state()).txInhibit?.state === "inside");
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => (await state()).mode === "CWR");
    await sleep(800);
    assert.ok((await state()).tune);
    assert.ok(!afterTune(rig).includes("T 0"));
    rig.tuning = false;
    await waitFor(async () => (await state()).tuneResult);
    await waitFor(async () => (await state()).mode === "USB");
    rig.freq = 28_600_000;
    await waitFor(async () => (await state()).txInhibit.state === "outside");
    const before = rig.log.filter(line => line === "W AC123; 0").length;
    const refused = await cmd({ cmd: "tune" });
    assert.equal(refused.status, 409);
    assert.equal(refused.json.code, "tx-out-of-band");
    assert.equal(rig.log.filter(line => line === "W AC123; 0").length, before);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("FTX-1 ATAS tune: temporary CW-L/5 W and AC100 are not operator changes, RI0/TX follow the tune, raw SWR 255 is bounded by the cap", async () => {
  const rig = await atasRig();
  Object.assign(rig.raw, {
    AC: "AC100;",
    PC: () => (rig.tuning ? "PC2005;" : "PC2010;"),
    RI0: () => (!rig.tuning ? "RI00000000;" : rig.found ? "RI00010100;" : "RI01010100;"),
    RM6: () => (!rig.tuning ? "RM6000000;" : rig.found ? "RM6007000;" : "RM6255000;")
  });
  rig.found = false;
  rig.modeReply = () => (rig.tuning ? "CWR\n500\n" : "USB\n2400\n");
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tuneHiSwrMs: 200, tuneMaxSeconds: 20, meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => (await state()).mode === "CWR");
    // Hi-SWR flag and raw SWR 255 for well over the trip times: the tune keeps running until the radio finishes it.
    await sleep(1200);
    assert.ok((await state()).tune);
    assert.ok(!afterTune(rig).includes("T 0"));
    // Match found: HI-SWR cleared and raw SWR low while still tuning; the radio ends the tune only after the agent sampled it.
    rig.found = true;
    await waitFor(async () => (await state()).tx?.swr === 7);
    assert.ok((await state()).tune);
    assert.ok(!afterTune(rig).includes("T 0"));
    rig.tuning = false;
    await waitFor(async () => (await state()).tuneResult);
    const done = await state();
    assert.deepEqual([done.tuneResult.outcome, done.tuneResult.txOff], ["success", true]);
    await waitFor(async () => (await state()).mode === "USB");
    // The agent never writes mode or power back, and never reads AC to follow the tune.
    assert.ok(!rig.log.some(line => /^M /.test(line) || /^W (PC|MD)\d/.test(line) || /^L RFPOWER/.test(line)), JSON.stringify(rig.log));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a tune that never ends keeps raw SWR 255 bounded by the time cap on a real-FTX-1 style tune", async () => {
  const rig = await atasRig();
  Object.assign(rig.raw, { AC: "AC100;", PC: "PC2005;", RI0: "RI01010100;", RM6: "RM6255000;" });
  rig.modeReply = () => "CWR\n500\n";
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tuneHiSwrMs: 200, tuneMaxSeconds: 2, meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await sleep(1000);
    assert.ok((await state()).tune);
    await waitFor(() => afterTune(rig).includes("T 0"), 5000);
    assert.ok(inOrder(stopOrder(rig)));
    assert.ok(!rig.log.some(line => /^M /.test(line) || /^W (PC|MD)\d/.test(line)));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("ATAS tune sends AC123 and completes by itself with AC120", async () => {
  const rig = await atasRig();
  const logs = [];
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ log: message => logs.push(message) }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    assert.ok(rig.log.includes("W AC123; 0"));
    assert.ok(!rig.log.includes("W AC103; 0"));
    assert.ok((await state()).tune);
    rig.tuning = false;
    await waitFor(() => rig.log.includes("W AC120; 0"));
    await waitFor(async () => !(await state()).tune);
    assert.ok(logs.some(line => line.includes("Sintonía terminada")));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a meter read stuck during the tune never blocks the TX meters of the next PTT", async () => {
  const rig = await atasRig();
  // One RM4 read issued late in the tune gets no answer at all (not even a NUL).
  let silent = false, swallowed = false;
  Object.assign(rig.raw, {
    RM4: () => { if (silent && !swallowed) { swallowed = true; return null; } return "RM4100000;"; },
    RM5: "RM5128000;", RM6: "RM6020000;"
  });
  rig.setBlockMs = Infinity;
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await sleep(400);
    silent = true;
    await waitFor(() => swallowed, 2000);
    rig.tuning = false;
    await waitFor(async () => !(await state()).tune, 5000);
    await cmd({ cmd: "ptt", value: true });
    await waitFor(async () => { const { tx } = await state(); return typeof tx?.po === "number" && typeof tx.swr === "number" && typeof tx.alc === "number"; }, 1500);
    assert.equal(rig.connections, 1);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("the tune notice reports the last raw SWR read while transmitting, not the one after RX", async () => {
  const rig = await atasRig();
  rig.raw.RM6 = () => (rig.tuning ? "RM6070000;" : "RM6000000;");
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => typeof (await state()).tx?.swr === "number", 3000);
    await sleep(150);
    rig.tuning = false;
    await waitFor(async () => (await state()).notice?.text.includes("Sintonía terminada"));
    assert.match((await state()).notice.text, /ROE bruta 70\/255/);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a tune that never ends is cut at tuneMaxSeconds: AC120, TX0, then T 0", async () => {
  const rig = await atasRig();
  const logs = [];
  const { cmd, call, cleanup } = await startAgent(rig, atasOptions({ tuneMaxSeconds: 1, log: message => logs.push(message) }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(() => afterTune(rig).includes("T 0"), 5000);
    assert.ok(inOrder(stopOrder(rig)), JSON.stringify(rig.log));
    const beforeTune = rig.log.slice(0, rig.log.lastIndexOf("W AC123; 0"));
    const connectStop = [beforeTune.indexOf("W AC120; 0"), beforeTune.indexOf("W TX0; 0"), beforeTune.indexOf("T 0")];
    assert.ok(inOrder(connectStop), JSON.stringify(rig.log));
    await waitFor(() => logs.some(line => /abortada/.test(line)), 5000);
    assert.ok(logs.some(line => /abortada/.test(line)));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("tune time cap is per tuner kind: ATAS 45 s default / 60 s max, internal 20 s / 30 s", async () => {
  const cases = [
    [{ tunerKind: "atas" }, 45], [{ tunerKind: "atas", tuneMaxSeconds: 999 }, 60],
    [{ tunerKind: "internal" }, 20], [{ tunerKind: "internal", tuneMaxSeconds: 999 }, 30]
  ];
  for (const [extra, expected] of cases) {
    const rig = await atasRig();
    if (extra.tunerKind === "internal") Object.assign(rig.raw, { AC103: null, AC100: null });
    const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions(extra));
    let stopBeat = () => {};
    try {
      stopBeat = keepAlive(call);
      assert.equal((await cmd({ cmd: "tune" })).status, 200);
      assert.equal((await state()).tune.maxSeconds, expected, JSON.stringify(extra));
    } finally { stopBeat(); await cleanup(); await rig.close(); }
  }
});

test("ATAS ignores the Hi-SWR flag and is cut at tuneMaxSeconds with the raw SWR in the notice", async () => {
  const rig = await atasRig();
  rig.raw.RI0 = "RI01000100;";
  rig.raw.RM6 = "RM6255000;";
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tuneHiSwrMs: 200, tuneMaxSeconds: 2 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await sleep(1000);
    assert.ok((await state()).tune);
    assert.ok(!afterTune(rig).includes("T 0"));
    await waitFor(() => afterTune(rig).includes("T 0"), 5000);
    assert.ok(inOrder(stopOrder(rig)));
    // endTune publishes the notice only after the stop sequence and TX-off readback finish.
    await waitFor(async () => /ROE bruta 255\/255\): la antena no ha sintonizado/.test(JSON.stringify(await state())), 5000);
    assert.match(JSON.stringify(await state()), /ROE bruta 255\/255\): la antena no ha sintonizado/);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("an internal tuner tune still aborts on a sustained Hi-SWR flag", async () => {
  const rig = await atasRig();
  Object.assign(rig.raw, { AC103: null, AC100: null });
  rig.raw.RI0 = "RI01000100;";
  const { cmd, call, cleanup } = await startAgent(rig, atasOptions({ tunerKind: "internal", tuneHiSwrMs: 300 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(() => rig.log.slice(rig.log.lastIndexOf("W AC103; 0") + 1).includes("T 0"), 4000);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("losing the heartbeat during a tune aborts it", async () => {
  const rig = await atasRig();
  const { cmd, call, cleanup } = await startAgent(rig, atasOptions());
  try {
    await call("POST", "/api/heartbeat", {});
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(() => afterTune(rig).includes("T 0"), 4000);
    assert.ok(inOrder(stopOrder(rig)));
  } finally { await cleanup(); await rig.close(); }
});

test("pttOff sends tuner stop, txOff and T 0 in that order", async () => {
  const rig = await atasRig();
  const { cmd, call, cleanup } = await startAgent(rig, atasOptions());
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
    assert.ok(inOrder(stopOrder(rig)), JSON.stringify(rig.log));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("tune is refused above 10 W (PC2100 with the SPA-1) and the power is never lowered", async () => {
  const rig = await atasRig();
  rig.raw.PC = "PC2100;";
  const { cmd, state, cleanup } = await startAgent(rig, atasOptions());
  try {
    const result = await cmd({ cmd: "tune" });
    assert.equal(result.status, 409);
    assert.deepEqual([result.json.code, result.json.powerSetW, result.json.maxW], ["tune-power-high", 100, 10]);
    assert.ok(!rig.log.includes("W AC123; 0"));
    assert.ok(!rig.log.some(line => /^W PC\d/.test(line)));
    assert.equal((await state()).tune, null);
    rig.raw.PC = "PC2010;";
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});

test("tune is refused when the configured power cannot be read", async () => {
  const rig = await atasRig();
  rig.raw.PC = "?;";
  const { cmd, cleanup } = await startAgent(rig, atasOptions());
  try {
    const result = await cmd({ cmd: "tune" });
    assert.equal(result.status, 409);
    assert.equal(result.json.code, "tune-power-unknown");
    assert.ok(!rig.log.includes("W AC123; 0"));
  } finally { await cleanup(); await rig.close(); }
});

test("a finished tune keeps its result: final SWR read, stop sequence, then TX0 read back", async () => {
  const rig = await atasRig();
  rig.raw.RM6 = () => (rig.tuning ? "RM6070000;" : "RM6000000;");
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await sleep(500);
    rig.tuning = false;
    await waitFor(async () => (await state()).tuneResult);
    const after = await state();
    assert.equal(after.tune, null);
    assert.deepEqual([after.tuneResult.kind, after.tuneResult.outcome, after.tuneResult.txOff, after.tuneResult.swrRaw], ["atas", "success", true, 70]);
    assert.ok(after.tuneResult.swr > 1.5 && after.tuneResult.swr < 1.7);
    const tail = afterTune(rig);
    assert.ok(tail.indexOf("W TX; ;", tail.indexOf("T 0")) > tail.indexOf("T 0"), JSON.stringify(rig.log));
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a tune cut at the time cap is a timeout with the final SWR and TX off verified", async () => {
  const rig = await atasRig();
  rig.raw.RM6 = "RM6255000;";
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tuneMaxSeconds: 1, meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => (await state()).tuneResult, 5000);
    const { tuneResult } = await state();
    assert.deepEqual([tuneResult.outcome, tuneResult.reason, tuneResult.txOff, tuneResult.swr], ["timeout", "time-cap", true, 99]);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("a tune whose radio stays keyed after the stop is reported as not off", async () => {
  const rig = await atasRig();
  rig.onSet = () => {};
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tuneMaxSeconds: 1 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => (await state()).tuneResult, 8000);
    const { tuneResult } = await state();
    assert.equal(tuneResult.txOff, false);
    assert.notEqual(tuneResult.outcome, "success");
  } finally { stopBeat(); rig.tuning = false; await cleanup(); await rig.close(); }
});

test("an SWR trip during an internal tune keeps its alert and reason", async () => {
  const rig = await atasRig();
  Object.assign(rig.raw, { AC103: null, AC100: null, RM6: "RM6200000;" });
  const { cmd, call, state, cleanup } = await startAgent(rig, atasOptions({ tunerKind: "internal", tuneSwrMs: 300, meterMs: 50 }));
  let stopBeat = () => {};
  try {
    stopBeat = keepAlive(call);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    await waitFor(async () => (await state()).tuneResult, 6000);
    const after = await state();
    assert.equal(after.txAlert, "swr");
    assert.deepEqual([after.tuneResult.outcome, after.tuneResult.reason, after.tuneResult.txOff], ["fail", "swr-trip", true]);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("normalized meters follow the FTX-1 bench frames during TX (PC2100 head 2: PO pending)", async () => {
  const rig = await fakeRigctld();
  Object.assign(rig.raw, { RM5: "RM5128000;", RM6: "RM6020000;", RM4: "RM4126000;", PC: "PC2100;" });
  const { cmd, state, cleanup } = await startAgent(rig, { radioCat: ftx1(), rawIdleMs: 60, meterMs: 100 });
  try {
    await cmd({ cmd: "ptt", value: true });
    await waitFor(async () => { const { meters } = await state(); return meters.vdd && meters.alc; });
    const { meters } = await state();
    assert.equal(meters.vdd.value, 13.66);
    assert.equal(meters.alc.value, 100);
    assert.equal(meters.po.pending, true);
    assert.equal(meters.swr.unit, "");
    await cmd({ cmd: "ptt", value: false });
  } finally { await cleanup(); await rig.close(); }
});

test("supervisor kills and restarts a hung rigctld, then sends the stop sequence", async () => {
  const { EventEmitter } = require("node:events");
  const { createStation, validateConfig } = require("../remote-station.cjs");
  const rig = await atasRig();
  const spawns = [];
  const spawn = () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.pid = 2000 + spawns.length;
    child.kill = signal => { rig.hang = false; setImmediate(() => child.emit("exit", null, signal || "SIGTERM")); };
    spawns.push(child);
    return child;
  };
  const notices = [];
  const agent = {
    options: null, start: async () => {}, close: async () => {}, token: "t", tls: false,
    snapshot: () => ({ connected: true, relay: { configured: false, connected: false } }), relayLinks: () => null,
    notify: text => notices.push(text)
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-hang-"));
  const catalog = loadCatalog();
  const sup = createStation({
    spawn, findBinary: name => `/usr/bin/${name}`, sleep: async () => {}, configDir: dir, catalog, backoffMinMs: 5, backoffMaxMs: 20,
    createAgent: options => { agent.options = options; return agent; },
    createRigctldClient: clientOptions => new RigctldClient({ ...clientOptions, host: "127.0.0.1", port: rig.port, reconnectMs: 50, rawIdleMs: 60 })
  });
  try {
    await sup.start(validateConfig({ radio: "yaesu-ftx-1", port: "COM7", tunerKind: "atas" }, catalog));
    assert.equal(spawns.length, 1);
    const mark = rig.log.length;
    rig.hang = true;
    agent.options.onRigctldHung();
    await waitFor(() => notices.length > 0, 8000);
    assert.equal(spawns.length, 2);
    assert.equal(notices[0], "Parada de emergencia: rigctld no respondía");
    const tail = rig.log.slice(mark);
    assert.ok(tail.indexOf("W AC120; 0") >= 0 && tail.indexOf("W AC120; 0") < tail.indexOf("W TX0; 0") && tail.indexOf("W TX0; 0") < tail.indexOf("T 0"));
  } finally { await sup.stop(); fs.rmSync(dir, { recursive: true, force: true }); await rig.close(); }
});
