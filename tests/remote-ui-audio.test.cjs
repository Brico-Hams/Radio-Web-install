const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../remote-audio-core.js");
const { createJitterBuffer } = require("../remote-audio-worklet.js");
const { deviceNames } = require("../remoto-ui.js");

test("buildFrame/parseFrame hacen ida y vuelta con secuencia big-endian", () => {
  const frame = core.buildFrame(core.TYPE_TX, 0x01020304, new Uint8Array([9, 8, 7]));
  assert.deepEqual([...frame], [2, 1, 2, 3, 4, 9, 8, 7]);
  const parsed = core.parseFrame(frame);
  assert.equal(parsed.type, 2);
  assert.equal(parsed.seq, 0x01020304);
  assert.deepEqual([...parsed.packet], [9, 8, 7]);
  assert.equal(core.parseFrame(core.buildFrame(1, 0xffffffff, [1])).seq, 0xffffffff);
});

test("parseFrame rechaza tipos desconocidos, vacios y mensajes de mas de 4 KB", () => {
  assert.equal(core.parseFrame(new Uint8Array([1, 0, 0, 0, 1])), null);
  assert.equal(core.parseFrame(new Uint8Array([7, 0, 0, 0, 1, 5])), null);
  assert.equal(core.parseFrame(new Uint8Array(4097).fill(1)), null);
  assert.notEqual(core.parseFrame(new Uint8Array([1, 0, 0, 0, 1, 5]).buffer), null);
});

test("passbandHz: 6 kHz en AM/FM y 4 kHz en el resto", () => {
  for (const mode of ["AM", "FM", "WFM", "PKTFM"]) assert.equal(core.passbandHz(mode), 6000);
  for (const mode of ["USB", "LSB", "CW", "CWR", "PKTUSB", "RTTY", "", null]) assert.equal(core.passbandHz(mode), 4000);
});

test("rmsToPercent acota dBFS a 0-100", () => {
  assert.equal(core.rmsToPercent(-60), 0);
  assert.equal(core.rmsToPercent(-30), 50);
  assert.equal(core.rmsToPercent(0), 100);
  assert.equal(core.rmsToPercent(12), 100);
  assert.equal(core.rmsToPercent(-Infinity), 0);
});

const ramp = (start, length) => Float32Array.from({ length }, (_, index) => start + index);

test("jitter: silencio hasta llenar el objetivo de 80 ms y luego audio en orden", () => {
  const jitter = createJitterBuffer({ sampleRate: 48000, targetMs: 80, maxMs: 300 });
  const out = new Float32Array(128);
  jitter.push(ramp(1, 960));
  assert.equal(jitter.pull(out), false);
  assert.ok(out.every(value => value === 0));
  for (let index = 0; index < 3; index++) jitter.push(ramp(1, 960));
  assert.equal(jitter.depthMs(), 80);
  assert.equal(jitter.pull(out), true);
  assert.equal(out[0], 1);
  assert.equal(out[127], 128);
});

test("jitter: underrun rellena con silencio y vuelve a cebar", () => {
  const jitter = createJitterBuffer({ sampleRate: 48000, targetMs: 20, maxMs: 300 });
  jitter.push(ramp(1, 960));
  const out = new Float32Array(1000);
  assert.equal(jitter.pull(out), true);
  assert.equal(out[959], 960);
  assert.equal(out[960], 0);
  jitter.push(ramp(1, 100));
  assert.equal(jitter.pull(new Float32Array(100)), false);
});

test("jitter: al desbordar 300 ms descarta lo mas antiguo", () => {
  const jitter = createJitterBuffer({ sampleRate: 48000, targetMs: 80, maxMs: 300 });
  for (let index = 0; index < 20; index++) jitter.push(ramp(index * 960, 960));
  assert.equal(jitter.depthMs(), 300);
  assert.equal(jitter.droppedSamples(), 5 * 960);
  const out = new Float32Array(4);
  jitter.pull(out);
  assert.equal(out[0], 5 * 960);
});

test("deviceNames acepta cadenas y objetos, quita duplicados y conserva el guardado", () => {
  assert.deepEqual(deviceNames(["USB Audio Device", { name: "Mic" }, "USB Audio Device", 5, null], ""), ["USB Audio Device", "Mic"]);
  assert.deepEqual(deviceNames(undefined, "Guardado"), ["Guardado"]);
  assert.deepEqual(deviceNames([], ""), []);
});
