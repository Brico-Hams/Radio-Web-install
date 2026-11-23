"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  model, normalizeMeter, normalizeProfileMeter, parseCivMeterFrame, parseMeterFrame, parsePowerFrame, swrFromRaw, tunePowerCheck, TUNE_POWER_MAX_W, TuneCheck
} = require("../remote-meters.cjs");

test("normalizeMeter scales FTX-1 RM frames with the cited community scales", () => {
  assert.equal(normalizeMeter("vdd", 203).value.toFixed(1), "13.8");
  assert.equal(normalizeMeter("id", 255).value, 3);
  assert.equal(normalizeMeter("comp", 255).value, 30);
  assert.equal(normalizeMeter("swr", 255).fraction, 1);
  assert.equal(normalizeMeter("swr", 255).value, null);
  assert.equal(normalizeMeter("alc", 300).fraction, 1);
  assert.equal(normalizeMeter("po", NaN).value, null);
  assert.equal(normalizeMeter("temp", 10).value, null);
});

test("FTX-1 bench frames (PC2100, RX) normalize with one shared conversion", () => {
  const frames = ["SM0000", "RM1000000", "RM2000000", "RM3000000", "RM4000000", "RM5000000", "RM6000000", "RM7000000", "RM8201000"];
  const byKey = Object.fromEntries(frames.map(frame => {
    const parsed = parseMeterFrame(`${frame};`);
    return [parsed.key + (frame.startsWith("SM") ? ":sm" : ""), normalizeMeter(parsed.key, parsed.raw, { head: 2 })];
  }));
  assert.equal(byKey.vdd.value, 13.66);
  assert.equal(byKey.vdd.unit, "V");
  assert.equal(byKey["smeter:sm"].value, 0);
  assert.equal(byKey.smeter.text, "S0");
  assert.equal(byKey.swr.value, 1);
  assert.equal(byKey.alc.value, 0);
  assert.equal(byKey.po.pending, true);
  assert.equal(byKey.po.unit, "raw");
  assert.equal(normalizeMeter("s", 128).text, "S9");
  assert.equal(normalizeMeter("s", 233).text, "S9+40 dB");
  assert.equal(normalizeMeter("swr", 100).value, Math.round(swrFromRaw(100) * 100) / 100);
  assert.equal(normalizeMeter("alc", 252).value, 200);
  assert.equal(normalizeMeter("alc", 126).value, 100);
  assert.equal(normalizeMeter("po", 255, { head: 1 }).value, 15);
  assert.equal(normalizeMeter("po", 255, { head: 1 }).unit, "W");
});

test("parsers reject foreign frames and tune power is refused above the limit", () => {
  assert.deepEqual(parseMeterFrame("RM8201000;"), { key: "vdd", raw: 201, side: null });
  assert.deepEqual(parseMeterFrame("SM0128;"), { key: "smeter", raw: 128, side: 0 });
  assert.equal(parseMeterFrame("RM9000000;"), null);
  assert.deepEqual(parsePowerFrame("PC2100;"), { head: 2, watts: 100 });
  assert.equal(parsePowerFrame("PC3010;"), null);
  assert.equal(TUNE_POWER_MAX_W, 10);
  assert.equal(tunePowerCheck(10).ok, true);
  assert.deepEqual([tunePowerCheck(100).ok, tunePowerCheck(100).reason], [false, "high"]);
  assert.equal(tunePowerCheck(NaN).reason, "unknown");
});

test("every meter cites a source and the matrix covers Profile.kt radios", () => {
  for (const meter of Object.values(model.meters)) assert.ok(model.sources[meter.source]);
  const kt = fs.readFileSync(path.join(__dirname, "..", "android/app/src/main/java/org/bricohams/radio/Profile.kt"), "utf8");
  const listed = new Set(model.matrix.flatMap(row => row.radios));
  for (const id of ["FT817", "FT818", "FT857", "FT897", "IC705", "TRUSDX", "QMX", "QDX", "THD75", "UVK5", "OPENGD77", "RT950", "RTS10", "D878", "KISS_TNC"]) {
    assert.ok(kt.includes(id), `Profile.kt no longer has ${id}`);
    assert.ok(listed.has(`android:${id}`), `matrix lacks ${id}`);
  }
  for (const row of model.matrix) for (const status of Object.values(row.meters)) {
    assert.match(status, /^(ok|partial|none|pendiente de fuente)$/);
  }
});

test("IC-705 CI-V 15 xx meters use the guide anchors (printed p.4)", () => {
  const read = (sub, hi, lo) => {
    const frame = parseCivMeterFrame(Buffer.from([0xfe, 0xfe, 0xe0, 0xa4, 0x15, sub, hi, lo, 0xfd]));
    return normalizeProfileMeter("ic705", frame.key, frame.raw);
  };
  assert.equal(read(0x02, 0x01, 0x20).text, "S9");
  assert.equal(read(0x02, 0x02, 0x41).text, "S9+60 dB");
  assert.equal(read(0x11, 0x01, 0x43).value, 50);
  assert.equal(read(0x11, 0x02, 0x13).value, 100);
  assert.equal(read(0x12, 0x00, 0x48).value, 1.5);
  assert.equal(read(0x12, 0x00, 0x80).value, 2);
  assert.equal(read(0x12, 0x01, 0x20).value, 3);
  assert.equal(read(0x12, 0x02, 0x00).text, ">3:1");
  assert.equal(read(0x13, 0x01, 0x20).value, 100);
  assert.equal(read(0x14, 0x01, 0x30).value, 15);
  assert.equal(read(0x14, 0x02, 0x10).value, 25.5);
  assert.equal(read(0x15, 0x00, 0x75).value, 5);
  assert.equal(read(0x15, 0x02, 0x41).value, 16);
  assert.equal(read(0x16, 0x01, 0x21).value, 2);
  assert.equal(read(0x16, 0x02, 0x41).value, 4);
  assert.equal(parseCivMeterFrame(Buffer.from([0xfe, 0xfe, 0xe0, 0x94, 0x15, 0x02, 0x01, 0x20, 0xfd])), null);
  assert.equal(parseCivMeterFrame(Buffer.from([0xfe, 0xfe, 0xe0, 0xa4, 0x15, 0x02, 0x0a, 0x20, 0xfd])), null);
  assert.equal(parseCivMeterFrame(Buffer.from([0xfe, 0xfe, 0xe0, 0xa4, 0x15, 0x03, 0x01, 0x20, 0xfd])), null);
  assert.equal(normalizeProfileMeter("ic705", "temp", 10).pending, true);
});

test("tune check succeeds only after readback, SWR read and TX-off verified", () => {
  const check = new TuneCheck({ swrLimit: 3 });
  assert.equal(check.entered(), false);
  assert.ok(check.confirming() && check.entered() && check.tick(4) && check.finished());
  assert.ok(check.finalSwr(1.5) && check.stopping());
  assert.equal(check.result().outcome, null);
  assert.ok(check.verified(true));
  assert.deepEqual(check.result(), { state: "done", outcome: "success", reason: null, kind: "internal", seconds: 4, swr: 1.5, txOff: true });
});

test("tune check reports high SWR, timeout, not-started and stuck TX; first cut wins", () => {
  const high = new TuneCheck({ swrLimit: 3 });
  high.confirming(); high.entered(); high.finished(); high.finalSwr(3.5); high.stopping(); high.verified(true);
  assert.deepEqual([high.result().outcome, high.result().reason], ["fail", "swr-high"]);

  const slow = new TuneCheck();
  slow.confirming(); slow.entered();
  assert.ok(slow.cut("timeout", "time-cap"));
  assert.equal(slow.cut("fail", "operator"), false);
  slow.stopping(); slow.verified(true);
  assert.deepEqual([slow.result().outcome, slow.result().reason], ["timeout", "time-cap"]);

  const open = new TuneCheck({ swrLimit: 3 });
  open.confirming(); open.entered(); open.finished(); open.finalSwr(Infinity); open.stopping(); open.verified(true);
  assert.deepEqual([open.result().outcome, open.result().reason], ["fail", "swr-high"]);

  const none = new TuneCheck();
  none.confirming();
  assert.ok(none.notStarted());
  none.stopping(); none.verified(true);
  assert.equal(none.result().reason, "not-started");

  const stuck = new TuneCheck();
  stuck.confirming(); stuck.entered(); stuck.finished(); stuck.stopping(); stuck.verified(false);
  assert.deepEqual([stuck.result().outcome, stuck.result().reason, stuck.result().txOff], ["fail", "tx-stuck", false]);
});
