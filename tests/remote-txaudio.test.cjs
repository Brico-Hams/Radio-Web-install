"use strict";
// Remote TX audio block: speech processor, VOX and the single-talker sink. Fake clocks, fake audio blocks and fake
// transports only: no radio, serial port or microphone is touched.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SpeechProc = require("../remote-speech-proc.js");
const Voxlib = require("../remote-vox.js");
const audio = require("../remote-audio.cjs");

const tone = (length, amplitude, hz = 1000, offset = 0) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * (i + offset) / 48000));

// ---- Speech processor ----
test("processor is OFF by default and leaves the samples bit-identical", () => {
  assert.equal(SpeechProc.defaults().enabled, false);
  const proc = SpeechProc.createSpeechProcessor();
  const input = tone(960, 0.9);
  const copy = Float32Array.from(input);
  proc.process(input);
  assert.deepEqual(Array.from(input), Array.from(copy));
  const pcm = Int16Array.from([0, 1000, -32768, 32767]);
  proc.processInt16(pcm);
  assert.deepEqual(Array.from(pcm), [0, 1000, -32768, 32767]);
  assert.equal(proc.gainReductionDb(), 0);
});

test("limiter never exceeds its fixed ceiling below full scale, even with extreme settings", () => {
  assert.ok(SpeechProc.CEILING < 1);
  const proc = SpeechProc.createSpeechProcessor({ enabled: true, makeupDb: 12, thresholdDb: -6, ratio: 1, presenceDb: 9 });
  let peak = 0;
  for (let block = 0; block < 20; block++) {
    const samples = tone(960, 1, 1000 + block * 150, block * 960);
    samples[10] = 5;
    proc.process(samples);
    for (const value of samples) peak = Math.max(peak, Math.abs(value));
  }
  assert.ok(peak <= SpeechProc.CEILING + 1e-9, `peak ${peak}`);
  const pcm = Int16Array.from({ length: 960 }, (_, i) => (i % 2 ? 32767 : -32768));
  proc.processInt16(pcm);
  for (const value of pcm) assert.ok(Math.abs(value) / 32768 <= SpeechProc.CEILING + 1 / 32768);
});

test("compressor reduces gain above the threshold and not below it", () => {
  const settings = { enabled: true, thresholdDb: -30, ratio: 4, presenceDb: 0, hpHz: 80, lpHz: 4000, makeupDb: 1 };
  const loud = SpeechProc.createSpeechProcessor(settings);
  for (let block = 0; block < 10; block++) loud.process(tone(960, 0.5, 1000, block * 960));
  assert.ok(loud.gainReductionDb() > 3, `loud ${loud.gainReductionDb()}`);
  const quiet = SpeechProc.createSpeechProcessor(settings);
  for (let block = 0; block < 10; block++) quiet.process(tone(960, 0.001, 1000, block * 960));
  assert.ok(quiet.gainReductionDb() < 0.1, `quiet ${quiet.gainReductionDb()}`);
  assert.ok(SpeechProc.reductionDb(-10, -20, 4) > SpeechProc.reductionDb(-19, -20, 4));
  assert.equal(SpeechProc.reductionDb(-40, -20, 4), 0);
});

test("settings are bounded, sanitized and the stored preference carries nothing else", () => {
  const wild = SpeechProc.sanitize({ enabled: "yes", thresholdDb: -999, ratio: 99, presenceDb: NaN, hpHz: "x", token: "secret" });
  assert.equal(wild.enabled, false);
  assert.equal(wild.thresholdDb, SpeechProc.RANGES.thresholdDb[0]);
  assert.equal(wild.ratio, SpeechProc.RANGES.ratio[1]);
  assert.equal(wild.presenceDb, SpeechProc.RANGES.presenceDb[2]);
  assert.equal(wild.hpHz, SpeechProc.RANGES.hpHz[2]);
  assert.deepEqual(Object.keys(JSON.parse(SpeechProc.serialize(wild))).sort(), Object.keys(SpeechProc.defaults()).sort());
  assert.deepEqual(SpeechProc.parseStored("not json"), SpeechProc.defaults());
});

// ---- VOX ----
function fakeVox({ down = true, settings } = {}) {
  let time = 0;
  const log = [];
  const pending = [];
  const vox = Voxlib.createVox({
    now: () => time,
    settings,
    ptt: {
      down: () => { log.push("down"); return down === "defer" ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(down); },
      up: () => log.push("up")
    }
  });
  return { vox, log, pending, advance: ms => { time += ms; } };
}
const CLEAN = { guest: false, transmit: true, linkUp: true, controlLost: false, locked: false, hidden: false };
const VOICE = new Float32Array(128).fill(0.3);
const QUIET = new Float32Array(128).fill(0.01);
const flush = () => new Promise(resolve => setImmediate(resolve));

test("VOX defaults come from vox.go and ranges are bounded", () => {
  const { vox } = fakeVox();
  assert.deepEqual(vox.settings(), { threshold: 0.1, holdMs: 500 });
  vox.configure({ threshold: 9, holdMs: 1 });
  assert.deepEqual(vox.settings(), { threshold: Voxlib.RANGES.threshold[1], holdMs: Voxlib.RANGES.holdMs[0] });
});

test("VOX is disarmed until armed, never keys below the threshold, keys on voice through the PTT adapter", async () => {
  const { vox, log, advance } = fakeVox();
  vox.process(VOICE);
  await flush();
  assert.deepEqual(log, []);
  assert.equal(vox.arm(CLEAN), true);
  for (let i = 0; i < 50; i++) { vox.process(QUIET); advance(20); }
  await flush();
  assert.deepEqual(log, []);
  vox.process(VOICE);
  await flush();
  assert.deepEqual(log, ["down"]);
  assert.equal(vox.isKeyed(), true);
  vox.process(VOICE);
  await flush();
  assert.deepEqual(log, ["down"]);
});

test("VOX hold time releases PTT and stays armed", async () => {
  const { vox, log, advance } = fakeVox();
  vox.arm(CLEAN);
  vox.process(VOICE);
  await flush();
  advance(499);
  vox.process(QUIET);
  assert.deepEqual(log, ["down"]);
  advance(2);
  vox.process(QUIET);
  assert.deepEqual(log, ["down", "up"]);
  assert.equal(vox.isArmed(), true);
  assert.equal(vox.isKeyed(), false);
  vox.process(VOICE);
  await flush();
  assert.deepEqual(log, ["down", "up", "down"]);
});

test("every disable condition unkeys and leaves VOX disarmed", async () => {
  const conditions = {
    hidden: vox => vox.disarm("hidden"),
    control: vox => vox.check({ ...CLEAN, controlLost: true }),
    link: vox => vox.check({ ...CLEAN, linkUp: false }),
    locked: vox => vox.check({ ...CLEAN, locked: true }),
    button: vox => assert.equal(vox.buttonPressed(), true),
    refusal: vox => vox.agentCut(),
    operator: vox => vox.disarm("operator")
  };
  for (const [name, apply] of Object.entries(conditions)) {
    const { vox, log, advance } = fakeVox();
    vox.arm(CLEAN);
    vox.process(VOICE);
    await flush();
    apply(vox);
    assert.deepEqual(log, ["down", "up"], name);
    assert.equal(vox.isArmed(), false, name);
    advance(1000);
    vox.process(VOICE);
    await flush();
    assert.deepEqual(log, ["down", "up"], `${name}: stays disarmed`);
  }
});

test("a refused PTT request disarms VOX; a request in flight is released when it resolves after a disarm", async () => {
  const refused = fakeVox({ down: false });
  refused.vox.arm(CLEAN);
  refused.vox.process(VOICE);
  await flush();
  assert.equal(refused.vox.isArmed(), false);
  assert.equal(refused.vox.lastReason(), "refused");
  assert.deepEqual(refused.log, ["down"]);

  const late = fakeVox({ down: "defer" });
  late.vox.arm(CLEAN);
  late.vox.process(VOICE);
  late.vox.process(VOICE);
  assert.deepEqual(late.log, ["down"]);
  late.vox.check({ ...CLEAN, hidden: true });
  late.pending[0](true);
  await flush();
  assert.deepEqual(late.log, ["down", "up"]);
  assert.equal(late.vox.isKeyed(), false);
});

test("no VOX for listen-only guests, without TX permission, without link or while another operator has control", () => {
  for (const ctx of [{ guest: true }, { transmit: false }, { linkUp: false }, { controlLost: true }, { locked: true }, { hidden: true }]) {
    const { vox } = fakeVox();
    assert.equal(vox.arm({ ...CLEAN, ...ctx }), false, JSON.stringify(ctx));
    assert.equal(vox.isArmed(), false);
  }
  assert.equal(fakeVox().vox.arm(null), false);
});

test("UI wires VOX through the PTT path, never persists it and never starts a tune", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "remote-ui.js"), "utf8");
  assert.match(source, /down: \(\) => pttDown\(true\)/);
  assert.doesNotMatch(source, /(?:localStorage|sessionStorage)[^\n]*vox/i);
  assert.doesNotMatch(source, /write\([^\n]*vox/i);
  const vox = fs.readFileSync(path.join(__dirname, "..", "remote-vox.js"), "utf8");
  assert.doesNotMatch(vox, /localStorage|sessionStorage|cmd: "tune"/);
  const { vox: fresh } = fakeVox();
  assert.equal(fresh.isArmed(), false);
});

// ---- Single talker in the sink ----
function fakeSink() {
  let time = 0;
  const sinks = [];
  const service = audio.createAudio({
    input: "Mic", output: "Spk", platform: "linux", now: () => time, txStopMs: 1000,
    createCapture: () => ({ start() {}, stop() {} }),
    createSink: () => {
      const sink = { writes: [], ended: null, write: packet => sink.writes.push([...packet]), end: opts => { sink.ended = opts || {}; } };
      sinks.push(sink);
      return sink;
    }
  });
  return { service, sinks, advance: ms => { time += ms; } };
}

test("sink: a second talker is dropped until the first has been silent for 200 ms", () => {
  const { service, sinks, advance } = fakeSink();
  assert.equal(service.txWrite(Buffer.from([1]), "a"), true);
  advance(100);
  assert.equal(service.txWrite(Buffer.from([2]), "b"), false);
  advance(50);
  assert.equal(service.txWrite(Buffer.from([3]), "b"), false);
  assert.equal(service.txWrite(Buffer.from([1]), "a") !== false, true);
  advance(100);
  assert.equal(service.txWrite(Buffer.from([2]), "b"), false);
  assert.deepEqual(sinks[0].writes, [[1], [1]]);
  advance(100);
  service.txWrite(Buffer.from([4]), "b");
  assert.deepEqual(sinks[0].ended, { kill: true });
  assert.deepEqual(sinks[1].writes, [[4]]);
  service.close();
});

test("sink: the tail of a released talker is discarded when the next transmission begins", () => {
  const { service, sinks, advance } = fakeSink();
  service.txWrite(Buffer.from([1]), "a");
  service.txRelease();
  advance(50);
  service.txBegin();
  assert.deepEqual(sinks[0].ended, { kill: true });
  service.txWrite(Buffer.from([2]), "b");
  assert.equal(sinks.length, 2);
  assert.deepEqual(sinks[0].writes, [[1]]);
  assert.deepEqual(sinks[1].writes, [[2]]);
  service.close();
});
