"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { parseSpot, normalizeDxConfig, createDxCluster, MAX_LINE, MAX_SPOTS, SPOT_TTL_MS } = require("../remote-dxcluster.cjs");
const { createRemoteAgent } = require("../remote-agent.cjs");
const ui = require("../remote-dxcluster-ui.js");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

// Real-format "DX de" lines, as in third_party/ftx1/rigplane-rigplane-core/tests/test_dx_cluster.py.
const LINES = Object.freeze({
  ft8: "DX de K1ABC:     14074.0  JA1XYZ       FT8 +05dB from PM95   1234Z",
  ssb: "DX de W2XYZ:  7000  VK3ABC  SSB 59  0800Z",
  vhf: "DX de K1ABC:  144200.0  W1ABC  SSB  1800Z",
  ssid: "DX de K1ABC-3:  14074.0  JA1XYZ  FT8  1234Z",
  noTime: "DX de K1ABC:  14074.0  JA1XYZ  FT8 -10dB",
  wwv: "WWV de W0MU <18Z> :   SFI=85, A=8, K=2"
});

function fakeClock() {
  const clock = { time: 1_700_000_000_000, timers: [] };
  clock.now = () => clock.time;
  clock.setTimer = (fn, ms) => { const timer = { fn, ms, cancelled: false, unref() {} }; clock.timers.push(timer); return timer; };
  clock.clearTimer = timer => { if (timer) timer.cancelled = true; };
  clock.live = () => clock.timers.filter(timer => !timer.cancelled);
  clock.fire = ms => { const timer = clock.live().find(item => item.ms === ms); timer.cancelled = true; timer.fn(); };
  return clock;
}

function fakeNet() {
  const sockets = [];
  const connect = options => {
    const socket = new EventEmitter();
    socket.options = options;
    socket.writes = [];
    socket.destroyed = false;
    socket.write = data => { socket.writes.push(data); };
    socket.destroy = () => { if (!socket.destroyed) { socket.destroyed = true; socket.emit("close"); } };
    sockets.push(socket);
    return socket;
  };
  return { connect, sockets, last: () => sockets[sockets.length - 1] };
}

const CONFIG = Object.freeze({ enabled: true, host: "dx.example.net", port: 7300, callsign: "EA5KAO" });

function setup(overrides = {}, logbook) {
  const clock = fakeClock();
  const network = fakeNet();
  const cluster = createDxCluster({ config: { ...CONFIG, ...overrides }, connect: network.connect, now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer, logbook });
  return { clock, network, cluster };
}

test("parseSpot reads standard DX de lines and rejects everything else", () => {
  assert.deepEqual(parseSpot(LINES.ft8), { spotter: "K1ABC", call: "JA1XYZ", freqHz: 14_074_000, comment: "FT8 +05dB from PM95", time: "1234Z" });
  assert.deepEqual(parseSpot(LINES.ssb), { spotter: "W2XYZ", call: "VK3ABC", freqHz: 7_000_000, comment: "SSB 59", time: "0800Z" });
  assert.equal(parseSpot(LINES.vhf).freqHz, 144_200_000);
  assert.equal(parseSpot(LINES.ssid).spotter, "K1ABC-3");
  assert.deepEqual(parseSpot(LINES.noTime), { spotter: "K1ABC", call: "JA1XYZ", freqHz: 14_074_000, comment: "FT8 -10dB", time: "" });
  for (const line of [LINES.wwv, "", "Welcome to the cluster", "DX de K1ABC: abc JA1XYZ", "DX de K1ABC: 1 JA1XYZ 0000Z", "DX de K1ABC: 14074.0 !!"]) assert.equal(parseSpot(line), null, line);
});

test("the cluster is off by default and only valid plain-TCP settings enable it", () => {
  assert.deepEqual(normalizeDxConfig(undefined, "/cfg"), { enabled: false });
  assert.deepEqual(normalizeDxConfig({ host: "dx.example.net", port: 7300, callsign: "EA5KAO" }, "/cfg"), { enabled: false });
  for (const bad of [{ port: 0 }, { port: 70000 }, { host: "bad host" }, { callsign: "A" }, { callsign: "EA5\r\nKAO" }]) {
    assert.deepEqual(normalizeDxConfig({ ...CONFIG, ...bad }, "/cfg"), { enabled: false });
  }
  assert.deepEqual(normalizeDxConfig({ ...CONFIG, callsign: "ea5kao-2" }, "/cfg"), { enabled: true, host: "dx.example.net", port: 7300, callsign: "EA5KAO-2", logFile: "/cfg/remote-log.adi" });
  const { network, cluster } = setup({ enabled: false });
  cluster.start();
  assert.equal(network.sockets.length, 0);
  assert.deepEqual(cluster.snapshot(), { enabled: false, connected: false, logbook: false, spots: [] });
});

test("connects to the configured node, writes only the login line and collects spots newest first", () => {
  const { network, cluster } = setup();
  cluster.start();
  assert.deepEqual(network.last().options, { host: "dx.example.net", port: 7300 });
  network.last().emit("connect");
  assert.equal(cluster.snapshot().connected, true);
  // Lines split across chunks, telnet option bytes and a banner before the spots.
  network.last().emit("data", Buffer.from([0xff, 0xfb, 0x01]));
  network.last().emit("data", Buffer.from(`Welcome\r\n${LINES.ft8.slice(0, 20)}`));
  network.last().emit("data", Buffer.from(`${LINES.ft8.slice(20)}\r\n${LINES.wwv}\r\n${LINES.ssb}\r\n`));
  const { spots } = cluster.snapshot();
  assert.deepEqual(spots.map(spot => spot.call), ["VK3ABC", "JA1XYZ"]);
  assert.equal(spots[1].band, "20m");
  assert.deepEqual(network.last().writes, ["EA5KAO\r\n"]);
  assert.doesNotMatch(JSON.stringify(cluster.snapshot()), /dx\.example\.net|7300|EA5KAO/);
});

test("buffers are bounded: spot ring, overlong lines and expiry", () => {
  const { clock, network, cluster } = setup();
  cluster.start();
  network.last().emit("connect");
  for (let index = 0; index < MAX_SPOTS + 25; index += 1) network.last().emit("data", `DX de K1ABC: 14074.0 JA${index}X FT8 1234Z\n`);
  assert.equal(cluster.snapshot().spots.length, MAX_SPOTS);
  network.last().emit("data", "x".repeat(MAX_LINE * 4));
  network.last().emit("data", `tail\n${LINES.ssb}\n`);
  assert.equal(cluster.snapshot().spots[0].call, "VK3ABC");
  network.last().emit("data", `DX de K1ABC: 14074.0 ${"Z".repeat(MAX_LINE)} 1234Z\n`);
  assert.equal(cluster.snapshot().spots[0].call, "VK3ABC");
  clock.time += SPOT_TTL_MS + 1;
  assert.equal(cluster.snapshot().spots.length, 0);
});

test("reconnects with 1, 2, 4 ... 60 s backoff, resets after a connect and stops for good on stop()", () => {
  const { clock, network, cluster } = setup();
  cluster.start();
  const delays = [];
  for (let index = 0; index < 8; index += 1) {
    network.last().emit("error", Object.assign(new Error("refused"), { code: "ECONNREFUSED" }));
    network.last().destroy();
    const retry = clock.live().find(timer => timer.ms >= 1000 && timer.ms !== 10_000) || clock.live().find(timer => timer.ms === 10_000);
    delays.push(retry.ms);
    retry.cancelled = true;
    retry.fn();
  }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  network.last().emit("connect");
  network.last().destroy();
  assert.equal(clock.live().at(-1).ms, 1000);
  const count = network.sockets.length;
  cluster.stop();
  assert.equal(clock.live().length, 0);
  assert.equal(network.sockets.length, count);
});

test("a connect attempt that never completes is dropped after 10 s", () => {
  const { clock, network, cluster } = setup();
  cluster.start();
  clock.fire(10_000);
  assert.equal(network.last().destroyed, true);
  assert.ok(clock.live().some(timer => timer.ms === 1000));
});

test("spots are marked new or worked from the optional ADIF log at the agent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-dx-"));
  try {
    const file = path.join(dir, "log.adi");
    const { network, cluster } = setup({ logFile: file });
    cluster.start();
    network.last().emit("connect");
    network.last().emit("data", `${LINES.ft8}\n${LINES.ssb}\n`);
    assert.deepEqual(cluster.snapshot().spots.map(spot => spot.status), ["unknown", "unknown"]);
    // The log is read through createDxCluster's default loader once the file exists.
    const logged = createDxCluster({ config: { ...CONFIG, logFile: file }, connect: network.connect });
    fs.writeFileSync(file, "Test\n<EOH>\n<CALL:6>JA1XYZ<QSO_DATE:8>20260101<TIME_ON:4>1200<FREQ:6>14.074<MODE:3>FT8<RST_SENT:3>599<RST_RCVD:3>599<EOR>\n");
    logged.start();
    network.last().emit("connect");
    network.last().emit("data", `${LINES.ft8}\n${LINES.ssb}\nDX de K1ABC: 21074.0 JA1XYZ FT8 1234Z\n`);
    const view = logged.snapshot();
    assert.equal(view.logbook, true);
    assert.deepEqual(view.spots.map(spot => [spot.call, spot.status, spot.needed]), [["JA1XYZ", "new", true], ["VK3ABC", "new", true], ["JA1XYZ", "worked", false]]);
    logged.stop();
    cluster.stop();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the module has no path to keying: it only ever writes the login line", () => {
  const source = read("remote-dxcluster.cjs");
  assert.equal([...source.matchAll(/\.write\(/g)].length, 1);
  assert.doesNotMatch(source.replace(/\/\/.*$/gm, ""), /ptt|setPtt|tune|\bcw\b|rigctld/i);
  assert.doesNotMatch(read("remote-dxcluster-ui.js").replace(/\/\/.*$/gm, ""), /ptt|\btune\b.*cmd|cmd:\s*"(?!freq)/i);
});

test("agent serves /api/dxcluster read-only behind the token, disabled by default", async () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-dxagent-"));
  const network = fakeNet();
  const agent = createRemoteAgent({ configDir, port: 0, rigctldPort: 1, reconnectMs: 5000, pollMs: 5000, dxCluster: CONFIG, dxConnect: network.connect });
  const { port } = await agent.start();
  const get = token => new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: "/api/dxcluster", headers: token ? { Authorization: `Bearer ${token}` } : {} }, response => {
      let text = "";
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, text }));
    }).on("error", reject);
  });
  try {
    assert.notEqual((await get("")).status, 200);
    network.last().emit("connect");
    network.last().emit("data", `${LINES.ft8}\n`);
    const ok = await get(agent.token);
    assert.equal(ok.status, 200);
    const body = JSON.parse(ok.text);
    assert.equal(body.enabled, true);
    assert.equal(body.connected, true);
    assert.equal(body.spots[0].call, "JA1XYZ");
    assert.doesNotMatch(ok.text, /dx\.example\.net|EA5KAO/);
    assert.deepEqual(network.last().writes, ["EA5KAO\r\n"]);
  } finally {
    await agent.close();
    assert.equal(network.last().destroyed, true);
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});

test("console helpers: tune target, needed alerts and status texts", () => {
  assert.equal(ui.tuneTarget({ freqHz: 14_074_000 }), 14_074_000);
  for (const freqHz of [1.5, 100, 4_000_000_000, "14074000", NaN]) assert.equal(ui.tuneTarget({ freqHz }), null);
  assert.equal(ui.formatKHz(14_074_000), "14074.0");
  const spots = [{ id: 3, needed: true }, { id: 2, needed: false }, { id: 1, needed: true }];
  assert.deepEqual(ui.newNeeded(spots, null), []);
  assert.deepEqual(ui.newNeeded(spots, 1).map(spot => spot.id), [3]);
  assert.deepEqual(ui.newNeeded(spots, 3), []);
  assert.match(ui.statusText({ enabled: false }), /desactivado/);
  assert.match(ui.statusText({ enabled: true, connected: false }), /sin conexion/);
});

function fakeDoc(ids) {
  const nodes = Object.fromEntries(ids.map(id => [id, { id, textContent: "", children: [], checked: false, replaceChildren(...items) { this.children = items; } }]));
  return {
    nodes,
    getElementById: id => nodes[id],
    createElement: tag => ({ tag, dataset: {}, children: [], listeners: {}, disabled: false, textContent: "", append(...items) { this.children.push(...items); }, addEventListener(type, fn) { this.listeners[type] = fn; } })
  };
}

test("clicking a spot sends only the freq command; the needed-spot alert is opt-in", async () => {
  const doc = fakeDoc(["dx-list", "dx-status", "dx-alert"]);
  const tuned = [];
  const notices = [];
  const feed = [
    { enabled: true, connected: true, logbook: true, spots: [{ id: 1, call: "OLD", freqHz: 7_000_000, status: "worked", needed: false }] },
    { enabled: true, connected: true, logbook: true, spots: [{ id: 2, call: "JA1XYZ", freqHz: 14_074_000, band: "20m", status: "new", needed: true, time: "1234Z", comment: "FT8" }, { id: 1, call: "OLD", freqHz: 7_000_000, status: "worked", needed: false }] }
  ];
  const calls = [];
  const api = async route => { calls.push(route); return feed[Math.min(calls.length - 1, 1)]; };
  const mounted = ui.mount({ doc, api, notify: message => notices.push(message), tune: hz => tuned.push(hz) });
  try {
    await new Promise(resolve => setImmediate(resolve));
    doc.nodes["dx-alert"].checked = true;
    await mounted.poll();
    assert.deepEqual(calls, ["api/dxcluster", "api/dxcluster"]);
    assert.deepEqual(notices, ["Spot necesario en el cluster DX."]);
    const button = doc.nodes["dx-list"].children[0].children[0];
    assert.equal(button.dataset.status, "new");
    button.listeners.click();
    assert.deepEqual(tuned, [14_074_000]);
  } finally { clearInterval(mounted.state.timer); }
});

test("console wiring: tab, script, static route, freq-only tuning and registration lists", () => {
  const html = read("remote.html");
  assert.match(html, /<script src="remote-dxcluster-ui\.js" defer>/);
  assert.match(html, /id="panel-dx"/);
  assert.match(read("remote-ui.js"), /RemoteDxUI\.mount\([^)]*tune: hz => run\(\{ cmd: "freq", value: hz \}\)/);
  assert.match(read("remote-ui.js"), /"cw", "dx", "log"/);
  assert.match(read("remote-agent.cjs"), /"\/remote-dxcluster-ui\.js"/);
  assert.doesNotMatch(read("remote-dxcluster-ui.js"), /(?:fetch|api)\(\s*[`"']\//);
  for (const name of ["package.json", ".github/workflows/remote-station.yml"]) assert.match(read(name), /tests\/remote-dxcluster\.test\.cjs/, name);
  assert.match(read("package.json"), /node --check remote-dxcluster\.cjs && node --check remote-dxcluster-ui\.js/);
  assert.match(read("scripts/build-installers.sh"), /remote-dxcluster\.cjs/);
  assert.match(read("scripts/build-installers.sh"), /remote-dxcluster-ui\.js/);
});
