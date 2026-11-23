"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const tables = require("../data/digital-code-tables.json");
const Digital = require("../remote-digital.js");

const rootDir = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");

// Deterministic gaussian noise (mulberry32 + Box-Muller).
function noiseSource(seed) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return sigma => sigma * Math.sqrt(-2 * Math.log(uniform() || 1e-12)) * Math.cos(2 * Math.PI * uniform());
}

// BPSK31 audio: raised-cosine symbol shaping, "0" = phase reversal, "1" = no change, plus a carrier offset and noise.
function synthBpsk(bits, { sampleRate, carrierHz, offsetHz = 0, sigma = 0.3, lead = 1234, seed = 7 }) {
  const symbolSamples = sampleRate / tables.psk31.symbolRate;
  const signs = [1];
  for (const bit of bits) signs.push(bit === "0" ? -signs[signs.length - 1] : signs[signs.length - 1]);
  const total = lead + Math.ceil((signs.length + 2) * symbolSamples);
  const noise = noiseSource(seed);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    let envelope = 0;
    const t = (i - lead) / symbolSamples;
    if (t >= 0 && t < signs.length - 1) {
      const n = Math.floor(t);
      const u = t - n;
      envelope = signs[n] * (1 + Math.cos(Math.PI * u)) / 2 + signs[n + 1] * (1 - Math.cos(Math.PI * u)) / 2;
    }
    out[i] = envelope * Math.cos(2 * Math.PI * (carrierHz + offsetHz) * (i / sampleRate) + 0.7) + noise(sigma);
  }
  return out;
}

// RTTY audio: continuous-phase FSK. Segments are [markBoolean, durationInBits].
function synthRtty(text, { sampleRate, baud, markHz, shiftHz, stopBits, reversed = false, offsetHz = 0, sigma = 0.3, seed = 11 }) {
  const segments = [[true, 25]];
  for (const key of Digital.encodeIta2(tables, text)) {
    segments.push([false, 1]);
    for (let element = 4; element >= 0; element--) segments.push([key[element] === "1", 1]);
    segments.push([true, stopBits]);
  }
  segments.push([true, 20]);
  const bitSamples = sampleRate / baud;
  const total = Math.ceil(segments.reduce((sum, seg) => sum + seg[1], 0) * bitSamples);
  const noise = noiseSource(seed);
  const out = new Float32Array(total);
  let segment = 0;
  let segmentEnd = segments[0][1] * bitSamples;
  let phase = 0;
  for (let i = 0; i < total; i++) {
    while (i >= segmentEnd && segment < segments.length - 1) { segment += 1; segmentEnd += segments[segment][1] * bitSamples; }
    const markTone = reversed ? markHz + shiftHz : markHz;
    const spaceTone = reversed ? markHz : markHz + shiftHz;
    phase += 2 * Math.PI * ((segments[segment][0] ? markTone : spaceTone) + offsetHz) / sampleRate;
    out[i] = Math.sin(phase) + noise(sigma);
  }
  return out;
}

function feed(decoder, samples, block = 480) {
  let text = "";
  for (let i = 0; i < samples.length; i += block) text += decoder.push(samples.subarray(i, i + block));
  return text;
}

test("Varicode: every table code decodes back through its separator", () => {
  const decoder = Digital.createVaricodeDecoder(tables);
  for (const [key, bits] of Object.entries(tables.varicode)) {
    let code = -1;
    for (const bit of `${bits}00`) { const got = decoder.pushBit(bit === "1" ? 1 : 0); if (got >= 0) code = got; }
    assert.equal(code, Number(key), `code ${key}`);
  }
});

test("Varicode: text round trip and line breaks", () => {
  const decoder = Digital.createVaricodeDecoder(tables);
  let out = "";
  for (const bit of Digital.encodeVaricode(tables, "Hello, World 123\nNext")) out += decoder.push(bit === "1" ? 1 : 0);
  assert.equal(out, "Hello, World 123\nNext");
});

test("Varicode: tables with a broken code are rejected", () => {
  const broken = { ...tables, varicode: { ...tables.varicode, 65: "1001" } };
  assert.throws(() => Digital.createVaricodeDecoder(broken));
});

test("ITA2: round trip with LTRS/FIGS shifts", () => {
  const decoder = Digital.createIta2Decoder(tables);
  const text = "CQ DE TEST 599 K\nRY 73";
  const codes = Digital.encodeIta2(tables, text);
  assert.ok(codes.includes(Object.keys(tables.ita2).find(key => tables.ita2[key].ltrs === "FIGS")));
  assert.equal(codes.map(code => decoder.push(code)).join(""), text);
});

test("BPSK31: decodes known text with noise, frequency offset and timing offset", () => {
  const text = "  CQ CQ DE TEST";
  for (const [offsetHz, seed] of [[3, 1], [-4, 2]]) {
    const bits = "0".repeat(64) + Digital.encodeVaricode(tables, text) + "0".repeat(16);
    const audio = synthBpsk(bits, { sampleRate: 8000, carrierHz: 1000, offsetHz, seed });
    const decoder = Digital.createBpsk31Decoder({ tables, sampleRate: 8000, carrierHz: 1000 });
    const out = feed(decoder, audio);
    assert.ok(out.includes("CQ CQ DE TEST"), `offset ${offsetHz}: got ${JSON.stringify(out)}`);
    assert.equal(decoder.status().locked, true);
  }
});

test("BPSK31: decodes at 48 kHz and ignores silence", () => {
  const bits = "0".repeat(64) + Digital.encodeVaricode(tables, " test 73") + "0".repeat(16);
  const audio = synthBpsk(bits, { sampleRate: 48000, carrierHz: 1500, offsetHz: 2, seed: 5, lead: 5000 });
  const decoder = Digital.createBpsk31Decoder({ tables, sampleRate: 48000, carrierHz: 1500 });
  assert.ok(feed(decoder, audio, 960).includes("test 73"));
  const quiet = Digital.createBpsk31Decoder({ tables, sampleRate: 8000, carrierHz: 1000 });
  assert.equal(feed(quiet, new Float32Array(16000)), "");
});

test("BPSK31: carrier outside the audio band is rejected", () => {
  assert.throws(() => Digital.createBpsk31Decoder({ tables, sampleRate: 8000, carrierHz: 4000 }));
  assert.throws(() => Digital.createBpsk31Decoder({ tables, sampleRate: 8000, carrierHz: "" }));
});

test("RTTY: decodes known text for each stop-bit setting and polarity, with noise and offset", () => {
  const text = "CQ DE TEST 599 K";
  const base = { sampleRate: 8000, baud: 45.45, markHz: 1500, shiftHz: 170 };
  for (const [stopBits, reversed, offsetHz] of [[1, false, 8], [1.5, false, -8], [2, true, 5], [1.5, true, 0]]) {
    const audio = synthRtty(text, { ...base, stopBits, reversed, offsetHz });
    const decoder = Digital.createRttyDecoder({
      tables, sampleRate: 8000, settings: { ...base, stopBits, polarity: reversed ? "reversed" : "normal" }
    });
    const out = feed(decoder, audio);
    assert.equal(out, text, `stop ${stopBits} reversed ${reversed} offset ${offsetHz}: ${JSON.stringify(out)}`);
  }
});

test("RTTY: wrong polarity does not produce the text", () => {
  const base = { sampleRate: 8000, baud: 45.45, markHz: 1500, shiftHz: 170, stopBits: 1.5 };
  const audio = synthRtty("CQ DE TEST", base);
  const decoder = Digital.createRttyDecoder({ tables, sampleRate: 8000, settings: { ...base, polarity: "reversed" } });
  assert.notEqual(feed(decoder, audio), "CQ DE TEST");
});

test("RTTY: settings validation and the labelled preset", () => {
  const ok = Digital.validateRttySettings({ baud: 45.45, shiftHz: 170, markHz: 1500, stopBits: 1.5, polarity: "normal" }, 48000);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.spaceHz, 1670);
  for (const bad of [{}, { baud: 0 }, { baud: 45.45, shiftHz: 170, markHz: "", stopBits: 1.5 }, { baud: 45.45, shiftHz: 170, markHz: 23990, stopBits: 1.5 },
    { baud: 45.45, shiftHz: 170, markHz: 1500, stopBits: 3 }, { baud: 45.45, shiftHz: 170, markHz: 1500, stopBits: 1, polarity: "x" }]) {
    assert.equal(Digital.validateRttySettings(bad, 48000).ok, false, JSON.stringify(bad));
  }
  assert.match(Digital.RTTY_USUAL_PRESET.label, /pendiente de cita/);
  assert.equal("markHz" in Digital.RTTY_USUAL_PRESET, false);
});

test("session: configures one decoder, buffers text, and refuses incomplete settings", () => {
  const session = Digital.createDigitalSession({ tables, sampleRate: 8000, maxChars: 10 });
  assert.equal(session.configure({ mode: "bpsk31", carrierHz: "" }).ok, false);
  assert.equal(session.mode(), "off");
  assert.equal(session.configure({ mode: "rtty", rtty: { baud: 45.45 } }).ok, false);
  const base = { baud: 45.45, markHz: 1500, shiftHz: 170, stopBits: 1.5, polarity: "normal" };
  assert.equal(session.configure({ mode: "rtty", rtty: base }).ok, true);
  const audio = synthRtty("CQ DE TEST 599 K", { sampleRate: 8000, ...base });
  for (let i = 0; i < audio.length; i += 480) session.push(audio.subarray(i, i + 480));
  assert.equal(session.text(), "TEST 599 K".slice(-10));
  session.clear();
  assert.equal(session.text(), "");
  assert.equal(session.configure({ mode: "off" }).ok, true);
  assert.equal(session.push(audio.subarray(0, 480)), "");
});

test("registration: the module, tables and tests are listed where the repo lists files", () => {
  const html = read("remote.html");
  assert.match(html, /remote-digital\.js/);
  assert.match(html, /id="panel-digital"/);
  assert.match(html, /id="tab-digital"/);
  assert.match(read("remote-agent.cjs"), /remote-digital\.js/);
  assert.match(read("remote-agent.cjs"), /digital-code-tables\.json/);
  const pkg = read("package.json");
  assert.match(pkg, /tests\/remote-digital\.test\.cjs/);
  assert.match(pkg, /node --check remote-digital\.js/);
  assert.match(read("scripts/build-installers.sh"), /remote-digital\.js/);
  assert.match(read("scripts/build-installers.sh"), /digital-code-tables\.json/);
  assert.match(read("scripts/export-project.cjs"), /digital-code-tables/);
  assert.match(read(".github/workflows/remote-station.yml"), /digital-code-tables\.json/);
  assert.match(read(".github/workflows/remote-station.yml"), /remote-digital\.test\.cjs/);
  assert.match(read("ui-translations.js"), /RTTY y PSK31 \(solo recepcion\)\|RTTY and PSK31 \(receive only\)\|/);
});
