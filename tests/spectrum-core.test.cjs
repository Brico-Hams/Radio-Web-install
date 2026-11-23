"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../spectrum-core.js");

// Frames follow the "27 00" layout documented in third_party/ftx1/rigplane-rigplane-core/docs/api/scope.md.
const civ = (...data) => Uint8Array.from([0xfe, 0xfe, 0xe0, 0x94, 0x27, 0x00, 0x00, ...data, 0xfd]);
const FREQ_14074000 = [0x00, 0x40, 0x07, 0x14, 0x00];
const HALF_25000 = [0x00, 0x50, 0x02, 0x00, 0x00];

test("fft finds the bin of a pure tone and rejects non power-of-two sizes", () => {
  const n = 256;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i += 1) re[i] = Math.cos((2 * Math.PI * 16 * i) / n);
  S.fft(re, im);
  assert.ok(Math.abs(Math.hypot(re[16], im[16]) - n / 2) < 1e-6);
  assert.ok(Math.hypot(re[40], im[40]) < 1e-6);
  assert.throws(() => S.fft(new Float64Array(100), new Float64Array(100)), RangeError);
});

test("audio analyzer peaks at the tone frequency and emits rows only every hop", () => {
  const rate = 8000;
  const analyzer = S.createAudioAnalyzer({ sampleRate: rate, size: 256, hop: 128 });
  const tone = new Float32Array(1024).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 1000 * i) / rate));
  let last = null;
  let rows = 0;
  for (let i = 0; i < tone.length; i += 128) {
    const row = analyzer.push(tone.subarray(i, i + 128));
    if (row) { last = row; rows += 1; }
  }
  assert.equal(rows, 7);
  const peak = last.indexOf(Math.max(...last));
  assert.equal(Math.round(peak * analyzer.binHz), 1000);
  assert.ok(last.every(v => v >= S.FLOOR_DB));
  assert.throws(() => S.createAudioAnalyzer({ size: 100 }), RangeError);
});

test("level quantiser, resampling and tick helpers stay bounded", () => {
  assert.equal(S.levelToByte(-100, -100, -20), 0);
  assert.equal(S.levelToByte(-20, -100, -20), 255);
  assert.equal(S.levelToByte(0, -100, -20), 255);
  assert.equal(S.levelToByte(NaN, -100, -20), 0);
  assert.equal(S.levelToByte(-60, -20, -100), 0);
  const row = Float32Array.from([-90, -90, -30, -90, -90, -90, -90, -90]);
  const out = S.resampleRow(row, 500, 4000, 4);
  assert.equal(out.length, 4);
  assert.equal(out[1], -30);
  assert.deepEqual(S.ticks(0, 4000), [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000]);
  for (const name of S.COLOR_MAPS) assert.equal(S.colorLut(name).length, 768);
});

test("click to tune uses the sideband convention and refuses other modes", () => {
  assert.equal(S.tuneFromAudioClick({ mode: "USB", dialHz: 14200000, clickHz: 2000, targetHz: 1500 }), 14200500);
  assert.equal(S.tuneFromAudioClick({ mode: "LSB", dialHz: 7100000, clickHz: 2000, targetHz: 1500 }), 7099500);
  assert.equal(S.tuneFromAudioClick({ mode: "PKTUSB", dialHz: 14074000, clickHz: 1500, targetHz: 1500 }), 14074000);
  for (const mode of ["AM", "FM", "CW", "RTTY", "", undefined]) {
    assert.equal(S.tuneFromAudioClick({ mode, dialHz: 14200000, clickHz: 2000, targetHz: 1500 }), null);
  }
  assert.equal(S.tuneFromAudioClick({ mode: "USB", dialHz: NaN, clickHz: 1, targetHz: 1 }), null);
  assert.equal(S.tuneFromScopeClick({ startHz: 1000, endHz: 3000, fraction: 0.5 }), 2000);
  assert.equal(S.tuneFromScopeClick({ startHz: 3000, endHz: 1000, fraction: 0.5 }), null);
});

test("BCD frequency uses five little-endian BCD bytes", () => {
  assert.equal(S.bcdFrequency(FREQ_14074000), 14074000);
  assert.throws(() => S.bcdFrequency([0x0a, 0, 0, 0, 0]), RangeError);
});

test("scope assembler rebuilds a three-sequence centre-mode frame", () => {
  const assembler = S.createScopeAssembler();
  const first = S.parseScopeCivFrame(civ(0x01, 0x03, 0x00, ...FREQ_14074000, ...HALF_25000, 0x00, 1, 2, 3), { radioAddress: 0x94 });
  assert.equal(first.receiver, 0);
  assert.equal(assembler.feed(first.payload), null);
  assert.equal(assembler.feed(S.parseScopeCivFrame(civ(0x02, 0x03, 4, 5), {}).payload), null);
  const frame = assembler.feed(S.parseScopeCivFrame(civ(0x03, 0x03, 160, 6), {}).payload);
  assert.equal(frame.startHz, 14049000);
  assert.equal(frame.endHz, 14099000);
  assert.equal(frame.outOfRange, false);
  assert.deepEqual([...frame.pixels], [1, 2, 3, 4, 5, 160, 6]);
  assert.deepEqual([...S.scopePixelsToLevels(frame.pixels)].slice(5, 6), [255]);
});

test("scope assembler handles single packets, out-of-range and sequence errors", () => {
  const assembler = S.createScopeAssembler();
  const single = assembler.feed(S.parseScopeCivFrame(civ(0x01, 0x01, 0x01, ...FREQ_14074000, ...HALF_25000, 0x00, 9, 8), {}).payload);
  assert.equal(single.mode, 1);
  assert.equal(single.startHz, 14074000);
  assert.deepEqual([...single.pixels], [9, 8]);
  const oor = assembler.feed(S.parseScopeCivFrame(civ(0x01, 0x01, 0x00, ...FREQ_14074000, ...HALF_25000, 0x01), {}).payload);
  assert.equal(oor.outOfRange, true);
  assert.equal(oor.pixels.length, 0);
  assert.equal(assembler.feed(S.parseScopeCivFrame(civ(0x02, 0x02, 1), {}).payload), null);
  assembler.feed(S.parseScopeCivFrame(civ(0x01, 0x03, 0x00, ...FREQ_14074000, ...HALF_25000, 0x00, 1), {}).payload);
  assert.equal(assembler.feed(S.parseScopeCivFrame(civ(0x03, 0x03, 1), {}).payload), null);
});

test("parseScopeCivFrame ignores other CI-V traffic", () => {
  assert.equal(S.parseScopeCivFrame([0xfe, 0xfe, 0xe0, 0x94, 0x03, 0xfd]), null);
  assert.equal(S.parseScopeCivFrame(civ(0x01, 0x01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), { radioAddress: 0xa4 }), null);
  assert.equal(S.parseScopeCivFrame(Uint8Array.from([0xfe, 0xfe, 0xe0, 0x94, 0x27, 0x00, 0x00, 1, 1])), null);
});
