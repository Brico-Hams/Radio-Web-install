"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const core = require("../ftx-core.js");
const remoteAudio = require("../remote-audio.cjs");
const { createFtx, SLOT_MS, SLOT_SAMPLES, SAMPLE_RATE } = require("../remote-ftx.cjs");
const { createRemoteAgent } = require("../remote-agent.cjs");
const ui = require("../remote-ftx-ui.js");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const ldpc = core.loadLdpc();
const SLOT_START = 1_700_000_100_000 - (1_700_000_100_000 % SLOT_MS); // UTC-aligned slot boundary
const NOMINAL_START = 6000; // 0.5 s into the slot: DT = 0

// Deterministic noise (LCG), no Math.random.
function noise(length, sigma, seed) {
  let state = seed >>> 0;
  const uniform = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 - 0.5; };
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = sigma * Math.sqrt(3) * (uniform() + uniform() + uniform() + uniform());
  return out;
}

function synthSlot(message, hz) {
  const out = noise(SLOT_SAMPLES, 0.02, 12345);
  const wave = core.encodeFt8(message, hz, ldpc);
  for (let i = 0; i < wave.length && NOMINAL_START + i < SLOT_SAMPLES; i += 1) out[NOMINAL_START + i] += wave[i];
  return out;
}

const toPcm = samples => {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  return buffer;
};

function fakeAudio(rx = true) {
  const audio = { rx, subscribed: [], unsubscribed: 0 };
  audio.subscribe = entry => { audio.subscribed.push(entry); return () => { audio.unsubscribed += 1; }; };
  return audio;
}

function fakeClock(time) {
  const clock = { time, timers: [] };
  clock.now = () => clock.time;
  clock.setTimer = (fn, ms) => { const timer = { fn, ms, cancelled: false, unref() {} }; clock.timers.push(timer); return timer; };
  clock.clearTimer = timer => { if (timer) timer.cancelled = true; };
  clock.setInterval = () => ({ unref() {} });
  clock.clearInterval = () => {};
  return clock;
}

// Worker that decodes inline with ftx-core when `inline` is set, or holds jobs until reply() otherwise.
function workerFactory({ inline }) {
  const made = [];
  const factory = () => {
    const worker = new EventEmitter();
    worker.posted = [];
    worker.terminated = false;
    worker.unref = () => {};
    worker.terminate = () => { worker.terminated = true; };
    worker.reply = (index, results) => worker.emit("message", { id: worker.posted[index].id, ok: true, results });
    worker.postMessage = message => {
      worker.posted.push(message);
      if (!inline) return;
      let results;
      try { results = core.decodeFt8(message.samples, { ldpc }); }
      catch (error) { worker.emit("message", { id: message.id, ok: false, error: error.code }); return; }
      worker.emit("message", { id: message.id, ok: true, results });
    };
    made.push(worker);
    return worker;
  };
  factory.made = made;
  return factory;
}

function makeFtx({ inline = false, audio = fakeAudio(), start = SLOT_START } = {}) {
  const clock = fakeClock(start);
  const factory = workerFactory({ inline });
  const ftx = createFtx({
    audio, now: clock.now, workerFactory: factory, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    setInterval: clock.setInterval, clearInterval: clock.clearInterval
  });
  return { ftx, clock, factory, audio };
}

// Feeds `seconds` of PCM in 1 s chunks, advancing the fake clock to each chunk's end like a live stream.
function stream(env, pcm, seconds) {
  const chunk = SAMPLE_RATE * 2;
  for (let second = 0; second < seconds; second += 1) {
    env.clock.time += 1000;
    env.ftx.feed(pcm.subarray(second * chunk, (second + 1) * chunk));
  }
}

test("a synthesized UTC-aligned slot is buffered, decoded in the worker and listed with UTC, SNR, DT, Hz and message", () => {
  const env = makeFtx({ inline: true });
  assert.equal(env.ftx.enable(true), true);
  stream(env, toPcm(synthSlot("CQ EA1ABC IN80", 1500)), 15);
  env.clock.time = SLOT_START + SLOT_MS;
  env.ftx.tick();
  const view = env.ftx.snapshot();
  assert.equal(view.decodes.length, 1);
  const [row] = view.decodes;
  assert.equal(row.message, "CQ EA1ABC IN80");
  assert.equal(row.utc, new Date(SLOT_START).toISOString());
  assert.ok(Math.abs(row.hz - 1500) <= 3, `hz ${row.hz}`);
  assert.ok(Math.abs(row.dt) <= 0.1, `dt ${row.dt}`);
  assert.ok(Number.isFinite(row.snr));
  assert.equal(view.stats.slots, 1);
  assert.equal(view.modes.ft4, false);
});

test("off by default: PCM is ignored, nothing subscribes, and enabling needs RX audio", () => {
  const env = makeFtx();
  env.ftx.feed(Buffer.alloc(48000));
  assert.equal(env.audio.subscribed.length, 0);
  assert.equal(env.ftx.snapshot().enabled, false);
  const none = makeFtx({ audio: fakeAudio(false) });
  assert.equal(none.ftx.enable(true), false);
  assert.equal(none.audio.subscribed.length, 0);
  assert.equal(none.ftx.snapshot().available, false);
  env.ftx.enable(true);
  assert.equal(typeof env.audio.subscribed[0].onPcm, "function");
  env.ftx.enable(false);
  assert.equal(env.audio.unsubscribed, 1);
  assert.deepEqual(env.ftx.snapshot().decodes, []);
});

test("a slot that is not fully received is skipped, not decoded", () => {
  const env = makeFtx({ start: SLOT_START + 5000 });
  env.ftx.enable(true);
  stream(env, Buffer.alloc(SAMPLE_RATE * 2 * 10), 10);
  env.clock.time = SLOT_START + SLOT_MS;
  env.ftx.tick();
  assert.equal(env.factory.made.length, 0);
  assert.equal(env.ftx.snapshot().stats.skipped, 1);
});

test("bounded queue: while the worker is busy one slot waits and older ones are dropped", () => {
  const env = makeFtx();
  env.ftx.enable(true);
  const silence = Buffer.alloc(SAMPLE_RATE * 2 * 45);
  stream(env, silence, 45);
  env.clock.time = SLOT_START + 4 * SLOT_MS;
  env.ftx.tick();
  const [worker] = env.factory.made;
  assert.equal(env.factory.made.length, 1);
  assert.equal(worker.posted.length, 1);
  assert.equal(worker.posted[0].samples.length, SLOT_SAMPLES);
  let view = env.ftx.snapshot();
  assert.equal(view.stats.queued, 1);
  assert.equal(view.stats.dropped, 1);
  assert.equal(view.stats.busy, true);
  worker.reply(0, [{ text: "CQ TEST", frequencyHz: 1000, dtSeconds: 0.2, snrDb: -10 }]);
  assert.equal(worker.posted.length, 2);
  worker.reply(1, []);
  view = env.ftx.snapshot();
  assert.equal(view.stats.busy, false);
  assert.equal(view.stats.queued, 0);
  assert.equal(view.decodes[0].message, "CQ TEST");
});

test("a decode that overruns its watchdog is abandoned and the worker is replaced", () => {
  const env = makeFtx();
  env.ftx.enable(true);
  stream(env, Buffer.alloc(SAMPLE_RATE * 2 * 16), 16);
  env.clock.time = SLOT_START + SLOT_MS;
  env.ftx.tick();
  const [first] = env.factory.made;
  assert.equal(env.ftx.snapshot().stats.busy, true);
  const timer = env.clock.timers.filter(item => !item.cancelled).pop();
  timer.fn();
  assert.equal(first.terminated, true);
  const view = env.ftx.snapshot();
  assert.equal(view.stats.busy, false);
  assert.equal(view.stats.dropped, 1);
  first.reply(0, [{ text: "LATE", frequencyHz: 1000, dtSeconds: 0, snrDb: 0 }]);
  assert.deepEqual(env.ftx.snapshot().decodes, []);
});

test("capture tap: the PCM output is only requested for PCM subscribers and restarts a running capture once", () => {
  assert.ok(!remoteAudio.captureArgs("hw:1", "linux").join(" ").includes("pipe:3"));
  const args = remoteAudio.captureArgs("hw:1", "linux", { pcm: true }).join(" ");
  assert.match(args, /-ar 12000 -f s16le pipe:3$/);
  const events = [];
  let params;
  const capture = { running: true, pcm: false, start: () => events.push("start"), stop: () => { events.push("stop"); capture.running = false; } };
  const service = remoteAudio.createAudio({ input: "hw:1", output: "", platform: "linux", createCapture: given => { params = given; return capture; } });
  service.subscribe({ onPacket() {} });
  capture.running = true;
  const pcm = [];
  service.subscribe({ onPcm: chunk => pcm.push(chunk) });
  assert.deepEqual(events, ["start", "stop", "start"]);
  assert.equal(params.wantsPcm(), true);
  params.onPcm(Buffer.from([1, 2]));
  assert.equal(pcm.length, 1);
});

async function withAgent(audio, run) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-ftxagent-"));
  const agent = createRemoteAgent({ configDir, port: 0, rigctldPort: 1, reconnectMs: 5000, pollMs: 5000, audioService: audio });
  const { port } = await agent.start();
  const call = (method, route, token, body) => new Promise((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const request = http.request({
      host: "127.0.0.1", port, path: route, method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) }
    }, response => {
      let text = "";
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: text ? JSON.parse(text) : null }));
    });
    request.on("error", reject);
    request.end(payload);
  });
  try { await run({ agent, call }); }
  finally { await agent.close(); fs.rmSync(configDir, { recursive: true, force: true }); }
}

test("GET and POST /api/ftx need the token, the owner switches decoding and it is off by default", async () => {
  const audio = fakeAudio(true);
  audio.tx = false;
  audio.close = () => {};
  await withAgent(audio, async ({ agent, call }) => {
    assert.equal((await call("GET", "/api/ftx", "")).status, 401);
    assert.equal((await call("POST", "/api/ftx", "", { enabled: true })).status, 401);
    const off = await call("GET", "/api/ftx", agent.token);
    assert.equal(off.status, 200);
    assert.equal(off.body.enabled, false);
    assert.deepEqual(off.body.decodes, []);
    assert.equal(audio.subscribed.length, 0);
    assert.equal((await call("POST", "/api/ftx", agent.token, { enabled: "yes" })).status, 400);
    const on = await call("POST", "/api/ftx", agent.token, { enabled: true });
    assert.equal(on.status, 200);
    assert.equal(on.body.enabled, true);
    assert.equal(audio.subscribed.length, 1);
    assert.equal((await call("POST", "/api/ftx", agent.token, { enabled: false })).body.enabled, false);
    assert.equal(audio.unsubscribed, 1);
  });
});

test("enabling FT8 is refused when the agent has no RX audio", async () => {
  const audio = fakeAudio(false);
  audio.tx = false;
  audio.close = () => {};
  await withAgent(audio, async ({ agent, call }) => {
    const refused = await call("POST", "/api/ftx", agent.token, { enabled: true });
    assert.equal(refused.status, 503);
    assert.equal((await call("GET", "/api/ftx", agent.token)).body.available, false);
  });
});

test("the decoder and its list have no path to PTT, no reply button and no auto-sequence", () => {
  for (const name of ["remote-ftx.cjs", "remote-ftx-ui.js"]) {
    const code = read(name).replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /ptt|setPtt|\bcmd\b|api\/cmd|rigctld|encodeFt8|ft8Waveform|txWrite|reply|answer|respond/i, name);
  }
  const html = read("remote.html");
  const section = html.slice(html.lastIndexOf("<button", html.indexOf('id="ftx-toggle"')), html.indexOf('id="panel-dx"'));
  assert.equal((section.match(/<button/g) || []).length, 1);
});

test("console helper: status texts and mounted list rendering", async () => {
  assert.match(ui.statusText({ available: false }), /no disponible/);
  assert.equal(ui.statusText({ available: true, enabled: false }), "FT8 apagado.");
  assert.match(ui.statusText({ available: true, enabled: true, stats: { slots: 0 } }), /esperando/);
  assert.equal(ui.statusText({ available: true, enabled: true, stats: { slots: 2 } }), "FT8 activo: escuchando.");
  assert.equal(ui.clock("2026-11-23T14:00:15.000Z"), "14:00:15");
  const ids = ["ftx-toggle", "ftx-status", "ftx-list", "ftx-slots", "ftx-dropped"];
  const nodes = Object.fromEntries(ids.map(id => [id, { textContent: "", attrs: {}, listeners: {}, children: [], setAttribute(name, value) { this.attrs[name] = value; }, addEventListener(type, fn) { this.listeners[type] = fn; }, replaceChildren(...items) { this.children = items; } }]));
  const doc = {
    getElementById: id => nodes[id],
    createElement: tag => ({ tag, textContent: "", children: [], append(...items) { this.children.push(...items); } })
  };
  const calls = [];
  const info = { enabled: true, available: true, stats: { slots: 1, dropped: 1, skipped: 1 }, decodes: [{ utc: "2026-11-23T14:00:15.000Z", snr: -7, dt: 0.2, hz: 1500, message: "CQ EA1ABC IN80" }] };
  const api = async (route, options) => { calls.push([route, options && options.body]); return { ...info, enabled: options ? JSON.parse(options.body).enabled : false }; };
  const mounted = ui.mount({ doc, api, notify() {} });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(nodes["ftx-toggle"].textContent, "Activar FT8");
    await mounted.flip();
    assert.deepEqual(calls[1], ["api/ftx", JSON.stringify({ enabled: true })]);
    assert.equal(nodes["ftx-toggle"].attrs["aria-pressed"], "true");
    assert.equal(nodes["ftx-slots"].textContent, "1");
    assert.equal(nodes["ftx-dropped"].textContent, "2");
    assert.deepEqual(nodes["ftx-list"].children[0].children.map(cell => cell.textContent), ["14:00:15", "-7", "0.2", "1500", "CQ EA1ABC IN80"]);
  } finally { clearInterval(mounted.state.timer); }
});

test("registration: static route, service worker, page, translations and build lists", () => {
  assert.match(read("remote-agent.cjs"), /"\/remote-ftx-ui\.js"/);
  assert.match(read("remote-agent.cjs"), /GET \/api\/ftx/);
  assert.match(read("remote-sw.js"), /remote-ftx-ui\.js/);
  assert.match(read("remote.html"), /<script src="remote-ftx-ui\.js" defer>/);
  assert.match(read("remote-ui.js"), /RemoteFtxUI\.mount/);
  assert.match(read("package.json"), /tests\/remote-ftx\.test\.cjs/);
  assert.match(read("package.json"), /node --check remote-ftx\.cjs && node --check remote-ftx-ui\.js/);
  assert.match(read(".github/workflows/remote-station.yml"), /tests\/remote-ftx\.test\.cjs/);
  const installers = read("scripts/build-installers.sh");
  for (const name of ["remote-ftx.cjs", "remote-ftx-ui.js", "ftx-core.js", "ftx-ldpc174.json"]) assert.match(installers, new RegExp(name.replace(".", "\\.")));
  const rows = require("../ui-translations.js");
  for (const key of ["FT8 (solo recepcion)", "Activar FT8", "Detener FT8", "FT8 apagado.", "FT4: todavia no disponible.", "Sin decodificaciones FT8 todavia.", "Mensaje"]) {
    const row = rows.find(item => item[0] === key);
    assert.ok(row && row.length === 4, key);
  }
});
