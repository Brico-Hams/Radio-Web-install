"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../ftx-core.js");

const ldpc = F.loadLdpc();
const SLOT = 180000;

// Deterministic noise: LCG uniform sums, no Math.random.
function noise(length, sigma, seed) {
  let state = seed >>> 0;
  const uniform = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296 - 0.5;
  };
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = sigma * Math.sqrt(3) * (uniform() + uniform() + uniform() + uniform());
  return out;
}

// Mixes waveforms into one 15 s slot; offsetSamples is the start of each waveform inside the slot.
function slot(parts) {
  const out = noise(SLOT, 0.02, 12345);
  for (const { wave, offsetSamples } of parts) {
    for (let i = 0; i < wave.length && offsetSamples + i < SLOT; i += 1) out[offsetSamples + i] += wave[i];
  }
  return out;
}

const NOMINAL_START = 6000; // 0.5 s into the slot: DT = 0

test("Crc14 appends a CRC that matches compute and detects every single-bit error", () => {
  const payload = F.pack77("CQ EA1ABC IN80");
  const framed = F.Crc14.appendCrc(payload);
  assert.equal(framed.length, 91);
  assert.deepEqual(Array.from(framed.slice(0, 77)), Array.from(payload));
  let crc = 0;
  for (let i = 77; i < 91; i += 1) crc = (crc << 1) | framed[i];
  assert.equal(crc, F.Crc14.compute(payload));
  assert.equal(F.Crc14.compute(new Uint8Array(77)), 0);
  for (let i = 0; i < 77; i += 1) {
    const flipped = payload.slice();
    flipped[i] ^= 1;
    assert.notEqual(F.Crc14.compute(flipped), crc, `bit ${i}`);
  }
  assert.throws(() => F.Crc14.compute(new Uint8Array(76)), /77 bits/);
});

test("Pack77 and Unpack77 round-trip the supported grammar and reject the rest", () => {
  const messages = [
    "CQ EA1ABC IN80", "CQ G4ABC JO01", "CQ EA1ABC", "DE EA1ABC IN80", "QRZ EA1ABC IN80",
    "EA2XYZ EA1ABC -07", "EA2XYZ EA1ABC R+05", "EA2XYZ EA1ABC RRR", "EA2XYZ EA1ABC 73", "EA2XYZ EA1ABC IN80",
    "EA2XYZ EA1ABC R IN80", "EA1ABC/P EA2XYZ RRR", "EA1ABC/R EA2XYZ R+05",
  ];
  for (const message of messages) {
    const bits = F.pack77(message);
    assert.equal(bits.length, 77);
    assert.equal(F.unpack77(bits), message, message);
  }
  for (const bad of ["cq ea1abc", "CQ", "CQ  EA1ABC", "CQ EA1ABC IN80 EXTRA X", "EA1ABC/P EA2XYZ/R 73", "CQ EA1ABC +99"]) {
    assert.throws(() => F.pack77(bad), { code: "INVALID_MESSAGE" }, bad);
  }
  assert.equal(F.unpack77(new Uint8Array(77)), null);
});

test("Ldpc174 encodes words that satisfy every parity check and breaks when a bit flips", () => {
  const word = F.codeword(F.pack77("CQ EA1ABC IN80"), ldpc);
  assert.equal(word.length, 174);
  assert.equal(ldpc.checksPass(word), true);
  const bad = word.slice();
  bad[10] ^= 1;
  assert.equal(ldpc.checksPass(bad), false);
});

test("Fft matches a direct DFT for a mixed-radix size", () => {
  const n = 60;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    re[i] = Math.sin(i * 0.7) + 0.3 * i;
    im[i] = Math.cos(i * 1.3);
  }
  const wantRe = new Float64Array(n);
  const wantIm = new Float64Array(n);
  for (let k = 0; k < n; k += 1) {
    for (let j = 0; j < n; j += 1) {
      const a = (-2 * Math.PI * j * k) / n;
      wantRe[k] += re[j] * Math.cos(a) - im[j] * Math.sin(a);
      wantIm[k] += re[j] * Math.sin(a) + im[j] * Math.cos(a);
    }
  }
  new F.Fft(n).forward(re, im);
  for (let k = 0; k < n; k += 1) {
    assert.ok(Math.abs(re[k] - wantRe[k]) < 1e-9 && Math.abs(im[k] - wantIm[k]) < 1e-9, `bin ${k}`);
  }
  assert.throws(() => new F.Fft(7), /prime factors/);
});

test("decodeFt8 recovers CQ EA1ABC IN80 at 1500 Hz within 3 Hz and 0.05 s", () => {
  const audio = slot([{ wave: F.encodeFt8("CQ EA1ABC IN80", 1500, ldpc), offsetSamples: NOMINAL_START }]);
  const decoded = F.decodeFt8(audio, { ldpc });
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].text, "CQ EA1ABC IN80");
  assert.ok(Math.abs(decoded[0].frequencyHz - 1500) <= 3, `frequency ${decoded[0].frequencyHz}`);
  assert.ok(Math.abs(decoded[0].dtSeconds) <= 0.05, `dt ${decoded[0].dtSeconds}`);
  assert.ok(Number.isFinite(decoded[0].snrDb));
});

test("decodeFt8 separates two messages at different audio frequencies in one slot", () => {
  const audio = slot([
    { wave: F.encodeFt8("CQ EA1ABC IN80", 1500, ldpc), offsetSamples: NOMINAL_START },
    { wave: F.encodeFt8("EA2XYZ EA1ABC -07", 2100, ldpc), offsetSamples: NOMINAL_START + 3600 },
  ]);
  const decoded = F.decodeFt8(audio, { ldpc });
  const first = decoded.find(d => d.text === "CQ EA1ABC IN80");
  const second = decoded.find(d => d.text === "EA2XYZ EA1ABC -07");
  assert.ok(first && second, JSON.stringify(decoded));
  assert.ok(Math.abs(first.frequencyHz - 1500) <= 3 && Math.abs(first.dtSeconds) <= 0.05);
  assert.ok(Math.abs(second.frequencyHz - 2100) <= 3 && Math.abs(second.dtSeconds - 0.3) <= 0.05);
  assert.equal(decoded.length, 2);
});

test("decodeFt8 rejects a frame whose CRC is wrong even though the LDPC parity holds", () => {
  const framed = F.Crc14.appendCrc(F.pack77("CQ EA1ABC IN80"));
  framed[77] ^= 1;
  const word = ldpc.encode(framed);
  assert.equal(ldpc.checksPass(word), true);
  const wave = F.ft8Waveform(F.ft8Tones(word), 1500);
  const decoded = F.decodeFt8(slot([{ wave, offsetSamples: NOMINAL_START }]), { ldpc });
  assert.deepEqual(decoded, []);
});

test("decodeFt8 validates its input and honours an injected work budget clock", () => {
  assert.throws(() => F.decodeFt8(new Float32Array(1000), { ldpc }), { code: "INVALID_AUDIO" });
  assert.throws(() => F.decodeFt8(new Float32Array(SLOT), { ldpc, minHz: 500, maxHz: 400 }), RangeError);
  assert.throws(() => F.decodeFt8(new Float32Array(SLOT), { ldpc, maxHz: 5990 }), { code: "INVALID_AUDIO" });
  let clock = 0;
  const now = () => {
    clock += 10;
    return clock;
  };
  assert.throws(() => F.decodeFt8(slot([]), { ldpc, maxWorkMs: 5, now }), { code: "BUDGET_EXCEEDED" });
});
