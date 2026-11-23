"use strict";
// TX safety block: OrphanWatch, occupiedSpan and the out-of-band inhibit, pure and through the agent (fake rigctld, fake clock).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { createRemoteAgent } = require("../remote-agent.cjs");
const { OrphanWatch, occupiedSpan, parseTxRanges, createTxInhibit } = require("../remote-txsafety.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 3000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await sleep(20);
  }
  assert.fail("waitFor timed out");
}

test("OrphanWatch: a held or idle transmitter is left alone", () => {
  const watch = new OrphanWatch();
  for (let i = 0; i < 10; i += 1) assert.equal(watch.observe(true, true), false);
  for (let i = 0; i < 10; i += 1) assert.equal(watch.observe(false, false), false);
});

test("OrphanWatch: a transmission the agent did not key (front panel) never fires", () => {
  const watch = new OrphanWatch();
  // Nobody holds the lease and the radio transmits, but agentKeyed is false.
  for (let i = 0; i < 20; i += 1) assert.equal(watch.observe(false, false), false);
});

test("OrphanWatch: one stale tick does not fire, a real orphan fires once on the second tick and never repeats", () => {
  const watch = new OrphanWatch();
  assert.equal(watch.observe(true, false), false);
  assert.equal(watch.observe(false, false), false);
  assert.equal(watch.observe(true, false), false);
  assert.equal(watch.observe(true, false), true);
  for (let i = 0; i < 10; i += 1) assert.equal(watch.observe(true, false), false);
});

test("OrphanWatch: it resets when the condition clears and arms again for the next client", () => {
  const watch = new OrphanWatch();
  assert.equal(watch.observe(true, false), false);
  assert.equal(watch.observe(true, false), true);
  assert.equal(watch.observe(true, true), false);
  assert.equal(watch.observe(true, false), false);
  assert.equal(watch.observe(true, false), true);
});

test("occupiedSpan: sideband, centred and fallback widths", () => {
  assert.deepEqual(occupiedSpan(7_100_000, "USB", 2400), { low: 7_100_000, high: 7_102_400 });
  assert.deepEqual(occupiedSpan(7_100_000, "LSB", 2400), { low: 7_097_600, high: 7_100_000 });
  assert.deepEqual(occupiedSpan(7_100_000, "LSB", 0), { low: 7_097_300, high: 7_100_000 });
  assert.deepEqual(occupiedSpan(7_100_000, "CW", 0), { low: 7_099_900, high: 7_100_100 });
  assert.deepEqual(occupiedSpan(7_100_000, "CW-L", 500), { low: 7_099_750, high: 7_100_250 });
  assert.deepEqual(occupiedSpan(14_000_000, "AM", null), { low: 13_997_000, high: 14_003_000 });
  assert.deepEqual(occupiedSpan(29_000_000, "FM", undefined), { low: 28_994_000, high: 29_006_000 });
  assert.deepEqual(occupiedSpan(7_100_000, "PKTUSB", 3000), { low: 7_100_000, high: 7_103_000 });
  assert.deepEqual(occupiedSpan(7_100_000, "RTTY-U", 0), { low: 7_100_000, high: 7_102_700 });
  assert.deepEqual(occupiedSpan(7_100_000, "DATA-L", 0), { low: 7_097_300, high: 7_100_000 });
  assert.deepEqual(occupiedSpan(1_000, "LSB", 2700), { low: 0, high: 1_000 });
  assert.equal(occupiedSpan(null, "USB", 2400), null);
  assert.equal(occupiedSpan(7_100_000, "", 2400), null);
  assert.equal(occupiedSpan(7_100_000, null, 2400), null);
});

test("inhibit: at a band edge LSB stays inside and USB leaves", () => {
  const inhibit = createTxInhibit({ ranges: [{ startHz: 7_000_000, endHz: 7_200_000 }] });
  assert.equal(inhibit.evaluate(7_200_000, "LSB", 2700).state, "inside");
  assert.equal(inhibit.evaluate(7_200_000, "USB", 2700).state, "outside");
  assert.equal(inhibit.evaluate(7_000_000, "USB", 2700).state, "inside");
  assert.equal(inhibit.evaluate(7_000_000, "LSB", 2700).state, "outside");
  assert.equal(inhibit.evaluate(null, "USB", 2700).state, "unknown");
  assert.equal(inhibit.evaluate(7_100_000, null, 2700).state, "unknown");
});

test("inhibit: no ranges means not configured and never refuses; malformed ranges throw instead of disabling it", () => {
  for (const ranges of [undefined, null, []]) {
    const inhibit = createTxInhibit({ ranges });
    assert.equal(inhibit.configured, false);
    assert.equal(inhibit.evaluate(null, null, null).state, "not-configured");
    assert.equal(inhibit.snapshot().state, "not-configured");
  }
  for (const bad of ["7000000", [{ startHz: 7_200_000, endHz: 7_000_000 }], [{ startHz: 7e6 }], [{ startHz: 1.5, endHz: 9 }], [null]]) {
    assert.throws(() => parseTxRanges(bad), /txRanges/);
  }
});

test("inhibit: only a crossing is logged and the tuning flag skips the evaluation", () => {
  const logs = [];
  const inhibit = createTxInhibit({ ranges: [{ startHz: 7_000_000, endHz: 7_200_000 }], log: message => logs.push(message) });
  for (let i = 0; i < 5; i += 1) inhibit.observe(7_100_000, "USB", 2400);
  assert.equal(logs.length, 0);
  for (let i = 0; i < 5; i += 1) inhibit.observe(7_200_000, "USB", 2400);
  assert.equal(logs.length, 1);
  for (let i = 0; i < 5; i += 1) inhibit.observe(null, null, null);
  assert.equal(inhibit.snapshot().state, "unknown");
  assert.equal(logs.length, 1);
  inhibit.observe(7_200_000, "CWR", 500, { tuning: true });
  inhibit.observe(7_100_000, "USB", 2400);
  inhibit.observe(7_100_000, "USB", 2400);
  assert.equal(logs.length, 2);
});

const CAPS_LINES = [
  "Model name:\t\tFTX-1",
  "Mfg name:\t\tYaesu",
  "Get level: AF(0..1/0.01) RFPOWER(0..1/0.01)",
  "Set level: AF(0..1/0.01) RFPOWER(0..1/0.01)",
  "VFO Ops:\t\tTUNE"
];

async function fakeRigctld() {
  const rig = { freq: 7_100_000, mode: "USB", passband: 2400, ptt: 0, modeFails: false, log: [], sockets: new Set() };
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
        else if (command === "m") reply = rig.modeFails ? "RPRT -11\n" : `${rig.mode}\n${rig.passband}\n`;
        else if (command === "t") reply = `${rig.ptt}\n`;
        else if (command === "T") rig.ptt = Number(args[0]);
        else if (command === "l" || command === "u") reply = "RPRT -11\n";
        else if (command === "\\dump_caps") reply = `${CAPS_LINES.join("\n")}\nRPRT 0\n`;
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
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-txsafety-"));
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
  rig.mark = rig.log.length;
  const state = async () => (await call("GET", "/api/state")).json;
  const cmd = body => call("POST", "/api/cmd", body);
  const beat = () => call("POST", "/api/heartbeat", {});
  return { agent, call, cmd, state, beat, cleanup: async () => { await agent.close(); fs.rmSync(configDir, { recursive: true, force: true }); } };
}

const keepAlive = call => {
  const timer = setInterval(() => { call("POST", "/api/heartbeat", {}).catch(() => {}); }, 250);
  return () => clearInterval(timer);
};
// The agent sends T 0 on connect; tests count what is sent after startup.
const count = (rig, line) => rig.log.slice(rig.mark ?? 0).filter(entry => entry === line).length;
const RANGES = [{ startHz: 7_000_000, endHz: 7_200_000 }];

test("agent without ranges: the inhibit reports not configured and key-up is unchanged even at an edge", async () => {
  const rig = await fakeRigctld();
  rig.freq = 7_200_000;
  const { cmd, state, cleanup } = await startAgent(rig);
  try {
    const status = (await state()).txInhibit;
    assert.deepEqual([status.configured, status.state, status.span], [false, "not-configured", null]);
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    assert.equal(rig.ptt, 1);
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});

test("agent with ranges refuses a key-up whose emission leaves them and allows the one that stays inside", async () => {
  const rig = await fakeRigctld();
  rig.freq = 7_200_000;
  const logs = [];
  const { cmd, state, cleanup } = await startAgent(rig, { txRanges: RANGES, log: message => logs.push(message) });
  try {
    const refused = await cmd({ cmd: "ptt", value: true });
    assert.equal(refused.status, 409);
    assert.equal(refused.json.code, "tx-out-of-band");
    assert.ok(!rig.log.includes("T 1"));
    await waitFor(async () => (await state()).txInhibit.state === "outside");
    assert.equal((await cmd({ cmd: "mode", value: "LSB", passband: 2700 })).status, 200);
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    assert.equal(rig.ptt, 1);
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
  } finally { await cleanup(); await rig.close(); }
});

test("agent with ranges and an unknown mode fails closed on key-up, and PTT off still works", async () => {
  const rig = await fakeRigctld();
  rig.modeFails = true;
  const { cmd, state, cleanup } = await startAgent(rig, { txRanges: RANGES });
  try {
    const refused = await cmd({ cmd: "ptt", value: true });
    assert.equal(refused.status, 409);
    assert.equal(refused.json.code, "tx-range-unknown");
    assert.equal((await state()).txInhibit.state, "unknown");
    assert.ok(!rig.log.includes("T 1"));
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
    assert.ok(rig.log.includes("T 0"));
  } finally { await cleanup(); await rig.close(); }
});

test("crossing while keyed unkeys once and logs once; PTT off pre-empts the inhibit", async () => {
  const rig = await fakeRigctld();
  rig.freq = 7_200_000;
  rig.mode = "LSB";
  const logs = [];
  const { cmd, call, state, cleanup } = await startAgent(rig, { txRanges: RANGES, log: message => logs.push(message) });
  const stopBeat = keepAlive(call);
  try {
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    await sleep(300);
    assert.equal(rig.ptt, 1);
    rig.mode = "USB";
    await waitFor(() => rig.ptt === 0);
    await sleep(500);
    assert.equal(count(rig, "T 0"), 1);
    assert.equal(logs.filter(message => message.startsWith("Fuera de banda")).length, 1);
    assert.equal(logs.filter(message => message.startsWith("PTT off: fuera de banda")).length, 1);
    assert.equal((await state()).ptt, false);
    // Operator PTT off is always accepted, in or out of band.
    rig.mode = "LSB";
    await waitFor(async () => (await state()).txInhibit.state === "inside");
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
    assert.equal(rig.ptt, 0);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("an unknown reading while keyed (failed poll) does not unkey", async () => {
  const rig = await fakeRigctld();
  const { cmd, call, state, cleanup } = await startAgent(rig, { txRanges: RANGES });
  const stopBeat = keepAlive(call);
  try {
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    rig.modeFails = true;
    await sleep(500);
    assert.equal(rig.ptt, 1);
    assert.equal((await state()).ptt, true);
    assert.equal(count(rig, "T 0"), 0);
  } finally { stopBeat(); await cleanup(); await rig.close(); }
});

test("orphaned TX: the agent unkeys once when the lease is gone even if the heartbeat timeout is wide", async () => {
  const rig = await fakeRigctld();
  const clock = { t: Date.now() };
  const { cmd, state, cleanup } = await startAgent(rig, { now: () => clock.t, heartbeatTimeoutMs: 3_600_000, txLimitSeconds: 3600 });
  try {
    assert.equal((await cmd({ cmd: "ptt", value: true })).status, 200);
    await sleep(350);
    assert.equal(rig.ptt, 1);
    clock.t += 31_000;
    await waitFor(() => rig.ptt === 0);
    await sleep(500);
    assert.equal(count(rig, "T 0"), 1);
    assert.equal((await state()).ptt, false);
  } finally { await cleanup(); await rig.close(); }
});

test("a transmission the agent did not key (front panel) is never taken away, whatever the clock says", async () => {
  const rig = await fakeRigctld();
  const clock = { t: Date.now() };
  const { state, cleanup } = await startAgent(rig, { now: () => clock.t });
  try {
    rig.ptt = 1;
    await waitFor(async () => (await state()).ptt === true);
    clock.t += 120_000;
    await sleep(700);
    assert.equal(rig.ptt, 1);
    assert.equal(count(rig, "T 0"), 0);
  } finally { await cleanup(); await rig.close(); }
});

test("Hamlib G TUNE is covered by the heartbeat: silence ends it, heartbeats keep it", async () => {
  const rig = await fakeRigctld();
  const clock = { t: Date.now() };
  const { cmd, state, beat, cleanup } = await startAgent(rig, { now: () => clock.t, tuneWatchMs: 600_000, tuneStatusMs: 50, tuneMaxSeconds: 3600 });
  try {
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    for (let i = 0; i < 4; i += 1) {
      clock.t += 600;
      assert.equal((await beat()).status, 200);
      await sleep(250);
    }
    assert.equal((await state()).tuneResult, null);
    assert.equal(count(rig, "T 0"), 0);
    clock.t += 1500;
    await waitFor(async () => (await state()).tuneResult);
    const { tuneResult } = await state();
    assert.deepEqual([tuneResult.kind, tuneResult.outcome, tuneResult.reason], ["hamlib", "fail", "heartbeat"]);
    assert.ok(rig.log.includes("T 0"));
  } finally { await cleanup(); await rig.close(); }
});

test("Hamlib G TUNE reports state.tune (kind hamlib) while it runs and null after it ends", async () => {
  const rig = await fakeRigctld();
  const clock = { t: Date.now() };
  const { cmd, state, beat, cleanup } = await startAgent(rig, { now: () => clock.t, tuneWatchMs: 600_000, tuneStatusMs: 50, tuneMaxSeconds: 30 });
  try {
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    clock.t += 3000;
    await beat();
    const active = (await state()).tune;
    assert.equal(active.kind, "hamlib");
    assert.equal(active.maxSeconds, 30);
    assert.ok(active.seconds >= 3);
    assert.equal((await cmd({ cmd: "ptt", value: false })).status, 200);
    assert.equal((await state()).tune, null);
  } finally { await cleanup(); await rig.close(); }
});

test("UI rule: while state.tune is reported the client keeps beating past the 2 s tuneBusy window and the tune survives", async () => {
  const rig = await fakeRigctld();
  const clock = { t: Date.now() };
  const { cmd, state, beat, cleanup } = await startAgent(rig, { now: () => clock.t, tuneWatchMs: 600_000, tuneStatusMs: 50, tuneMaxSeconds: 3600 });
  try {
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    // Mirrors remote-ui.js updatePttUi: beat while state.tune is set and this client is the operator.
    for (let i = 0; i < 12; i += 1) {
      clock.t += 500;
      const current = await state();
      assert.ok(current.tune, `state.tune missing at ${clock.t}`);
      if (current.tune && current.operator === "me") assert.equal((await beat()).status, 200);
      await sleep(80);
    }
    assert.equal((await state()).tuneResult, null);
    assert.equal(count(rig, "T 0"), 0);
  } finally { await cleanup(); await rig.close(); }
});

test("tune start is checked once with the operator mode; an out-of-band tune is refused with a code", async () => {
  const rig = await fakeRigctld();
  rig.freq = 7_200_000;
  const { cmd, state, cleanup } = await startAgent(rig, { txRanges: RANGES });
  try {
    await waitFor(async () => (await state()).txInhibit.state === "outside");
    const refused = await cmd({ cmd: "tune" });
    assert.equal(refused.status, 409);
    assert.equal(refused.json.code, "tx-out-of-band");
    assert.ok(!rig.log.includes("G TUNE"));
    assert.equal((await cmd({ cmd: "mode", value: "LSB", passband: 2700 })).status, 200);
    assert.equal((await cmd({ cmd: "tune" })).status, 200);
    assert.ok(rig.log.includes("G TUNE"));
  } finally { await cleanup(); await rig.close(); }
});
