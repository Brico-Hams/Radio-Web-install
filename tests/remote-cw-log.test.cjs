"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const cw = require("../remote-cw.cjs");
const log = require("../remote-log.cjs");
const controls = require("../remote-controls.js");
const { loadCatalog } = require("../remote-catalog.cjs");
const { RigctldClient } = require("../rigctld-client.cjs");
const { validateCommand } = require("../remote-agent.cjs");

test("the agent accepts only well-formed cw commands and the client only keyer frames", async () => {
  assert.deepEqual(validateCommand({ cmd: "cw", text: "cq", wpm: 18, slot: 2 }, {}), { cmd: "cw", text: "cq", wpm: 18, slot: 2 });
  assert.deepEqual(validateCommand({ cmd: "cw", text: "cq" }, {}), { cmd: "cw", text: "cq", wpm: 20, slot: 5 });
  assert.ok(validateCommand({ cmd: "cw", text: "cq", wpm: 99 }, {}).error);
  assert.ok(validateCommand({ cmd: "cw", text: "" }, {}).error);
  assert.ok(validateCommand({ cmd: "cw", text: "cq", extra: 1 }, {}).error);
  assert.deepEqual(validateCommand({ cmd: "cwstop" }, {}), { cmd: "cwstop" });
  const client = new RigctldClient({});
  for (const bad of ["KM5CQ", "KM6CQ;", "TX1;", "KY09;", "KM5cq;"]) await assert.rejects(client.sendKeyer(bad), /not allowed/);
  await assert.rejects(client.sendMorse("cq;\nT 1"), /not allowed/);
  await assert.rejects(client.sendKeyer("KY00;"), /not connected/);
  await assert.rejects(client.sendMorse("CQ"), /not connected/);
});

const radio = id => loadCatalog().radios.find(item => item.id === id);

test("FTX-1 types CW through KM then KY (frames from the cited FTX-1 CAT excerpts)", () => {
  const plan = cw.planCwSend(radio("yaesu-ftx-1"), "cq test");
  assert.deepEqual(plan.steps, ["KM5CQ TEST;", "KY05;"]);
  assert.deepEqual(plan.stop, ["KY00;"]);
  assert.equal(plan.via, "cat");
  assert.deepEqual(cw.planCwSend(radio("yaesu-ftx-1"), "cq", { slot: 2 }).steps, ["KM2CQ;", "KY02;"]);
});

test("FTX-1 refuses text a CAT parameter cannot carry, over 50 characters and bad slots", () => {
  const ftx1 = radio("yaesu-ftx-1");
  assert.throws(() => cw.planCwSend(ftx1, "CQ;"), { code: "chars" });
  assert.throws(() => cw.planCwSend(ftx1, "A".repeat(51)), { code: "length" });
  assert.throws(() => cw.planCwSend(ftx1, "CQ", { slot: 6 }), { code: "slot" });
  assert.throws(() => cw.planCwSend(ftx1, "  "), { code: "empty" });
});

test("IC-705 uses CI-V command 17 with ASCII data and FF to stop (CI-V guide p.3, p.5, p.18)", () => {
  const plan = cw.planCwSend(radio("icom-ic-705"), "cq");
  assert.deepEqual(plan.steps, ["FE FE A4 E0 17 63 71 FD"]);
  assert.deepEqual(plan.stop, ["FE FE A4 E0 17 FF FD"]);
  assert.throws(() => cw.planCwSend(radio("icom-ic-705"), "A".repeat(31)), { code: "length" });
  assert.throws(() => cw.planCwSend(radio("icom-ic-705"), "CQ;"), { code: "chars" });
});

test("radios without a cited keyer command fall back to Hamlib b, receivers are refused", () => {
  assert.deepEqual(cw.planCwSend(radio("kenwood-ts-590s"), "cq").steps, ["b CQ"]);
  assert.equal(cw.planCwSend(radio("kenwood-ts-590s"), "cq").stop.length, 0);
  assert.throws(() => cw.planCwSend(radio("icom-ic-r8600"), "CQ"), { code: "unsourced" });
  assert.throws(() => cw.planCwSend(null, "CQ"), { code: "unknown-radio" });
});

test("duration uses PARIS timing and is capped", () => {
  assert.equal(cw.cwUnits("PARIS"), 43);
  assert.equal(cw.cwUnits("PARIS PARIS"), 93);
  assert.equal(cw.planCwSend(radio("yaesu-ftx-1"), "CQ", { wpm: 20 }).seconds, 1.6);
  assert.throws(() => cw.planCwSend(radio("yaesu-ftx-1"), "CQ CQ CQ CQ CQ CQ CQ", { wpm: 5, maxSeconds: 10 }), { code: "too-long" });
  assert.throws(() => cw.planCwSend(radio("yaesu-ftx-1"), "CQ", { wpm: 100 }), { code: "wpm" });
});

test("F1-F8 memories expand placeholders", () => {
  assert.equal(cw.expandMemory("{CALL} DE {MYCALL} {RST} {RST}", { CALL: "ea4xx", MYCALL: "ea1yy", RST: "599" }), "EA4XX DE EA1YY 599 599");
});

test("CW guard: off by default, one message at a time, blocked on SWR trip, stop always allowed", () => {
  let time = 1000;
  let blocked = false;
  const plan = cw.planCwSend(radio("yaesu-ftx-1"), "CQ");
  assert.throws(() => cw.createCwGuard({ now: () => time }).authorize(plan), { code: "disabled" });
  const guard = cw.createCwGuard({ enabled: true, now: () => time, isBlocked: () => blocked });
  guard.authorize(plan);
  assert.throws(() => guard.authorize(plan), { code: "busy" });
  time += 2599;
  assert.equal(guard.expired(), false);
  time += 1;
  assert.equal(guard.expired(), true);
  assert.equal(guard.active(), null);
  blocked = true;
  assert.throws(() => guard.authorize(plan), { code: "blocked" });
  blocked = false;
  guard.authorize(plan);
  assert.deepEqual(guard.stop(), ["KY00;"]);
  assert.equal(guard.active(), null);
  assert.deepEqual(guard.stop(), []);
});

const SAMPLE = "<ADIF_VER:5>3.1.4<EOH>\n<CALL:5>EA4XX<QSO_DATE:8>20261122<TIME_ON:4>2100<FREQ:6>14.074<MODE:3>FT8<RST_SENT:3>-05<RST_RCVD:3>-10<GRIDSQUARE:4>IN80<DXCC:3>281<EOR>\n";

test("ADIF parse keeps progress fields and round-trips through export", () => {
  const { contacts, ignoredFields } = log.parseAdif(SAMPLE);
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].utc, "2026-11-22T21:00:00.000Z");
  assert.equal(contacts[0].dxcc, "281");
  assert.deepEqual(ignoredFields, []);
  const out = log.exportAdif(contacts, { stationCall: "EA1YY", myGrid: "IN80" });
  assert.match(out, /<BAND:3>20m<FREQ:6>14\.074/);
  assert.match(out, /<TIME_ON:6>210000/);
  const again = log.parseAdif(out);
  assert.equal(again.contacts[0].call, "EA4XX");
  assert.deepEqual(again.ignoredFields, ["MY_GRIDSQUARE", "STATION_CALLSIGN"]);
});

test("ADIF parse rejects what the Android importer rejects", () => {
  assert.throws(() => log.parseAdif("<CALL:5>EA4XX"), /EOR/);
  assert.throws(() => log.parseAdif("<CALL:5>EA4XX<CALL:5>EA4XX<EOR>"), /duplicado/);
  assert.throws(() => log.parseAdif("<CALL:9>EA4<EOR>"), /truncado/);
  assert.throws(() => log.parseAdif("<ADIF_VER:5>3.1.4<EOH>"), /no contiene/);
  assert.throws(() => log.parseAdif(SAMPLE.replace("20261122", "20261322")), /fecha/);
  assert.throws(() => log.parseAdif("<CALL:3>\u00e9a4<EOR>"), /ASCII/);
});

test("bands, dupes, progress and spot marking come from the log", () => {
  assert.equal(log.band("14.074"), "20m");
  assert.equal(log.band("13"), null);
  const base = { call: "EA4XX", frequencyMHz: "14.074", mode: "FT8", sent: "-05", received: "-10", notes: "" };
  const a = { ...base, utc: "2026-11-22T21:00:00.000Z", dxcc: "281", gridsquare: "IN80", pota_ref: "EA-0001" };
  const b = { ...base, call: "K1ABC", frequencyMHz: "7.074", utc: "2026-11-22T22:00:00.000Z", dxcc: "291", state: "ma", gridsquare: "FN42AB" };
  assert.equal(log.findDupe({ ...a, frequencyMHz: "14.080" }, [a]), a);
  assert.equal(log.findDupe({ ...a, mode: "CW" }, [a]), null);
  const p = log.progress([a, b]);
  assert.equal(p.dxcc, 2);
  assert.equal(p.grids, 2);
  assert.equal(p.pota, 1);
  assert.equal(p.was.worked, 1);
  assert.equal(log.progress([{ ...b, state: "XX" }]).was.worked, 0);
  assert.equal(log.markSpot({ call: "ea4xx", freqMHz: 14.08, mode: "ft8" }, [a, b]), "worked");
  assert.equal(log.markSpot({ call: "EA4XX", freqMHz: 7.04, mode: "CW" }, [a, b]), "new-slot");
  assert.equal(log.markSpot({ call: "DL1ZZ", freqMHz: 7.04, mode: "CW" }, [a, b]), "new-call");
});

test("terminator points have sun elevation near zero and the subsolar point is overhead", () => {
  const date = new Date("2026-05-01T12:00:00Z");
  const { declination, gha } = log.sunPosition(date);
  assert.ok(declination > 14 && declination < 16.5);
  assert.ok(log.sunElevation(declination, -gha, date) > 89.9);
  for (const [lon, lat] of log.terminator(date, 10)) {
    if (Math.abs(lat) < 85) assert.ok(Math.abs(log.sunElevation(lat, lon, date)) < 0.01);
  }
  const equinox = log.sunPosition(new Date("2026-03-20T12:00:00Z"));
  assert.ok(Math.abs(equinox.declination) < 0.5);
});

test("MIDI parsing, relative knobs and bindings", () => {
  assert.deepEqual(controls.parseMidi([0xB1, 21, 65]), { type: "cc", channel: 1, data1: 21, data2: 65 });
  assert.equal(controls.parseMidi([0x90, 36, 0]).type, "noteoff");
  assert.equal(controls.parseMidi([0xF8, 0, 0]), null);
  assert.equal(controls.relativeDelta(1, "twos"), 1);
  assert.equal(controls.relativeDelta(127, "twos"), -1);
  assert.equal(controls.relativeDelta(0x41, "signbit"), -1);
  const map = controls.createMidiMapper([
    { type: "cc", data1: 21, action: "tune-step", relative: "twos" },
    { type: "noteon", channel: 0, data1: 36, action: "cw-memory", memory: 3 }
  ]);
  assert.deepEqual(map([0xB0, 21, 127]), { action: "tune-step", steps: -1 });
  assert.deepEqual(map([0x90, 36, 100]), { action: "cw-memory", memory: 3 });
  assert.equal(map([0x91, 36, 100]), null);
  assert.equal(map([0xB0, 22, 1]), null);
});

test("peripherals can never bind a transmit action", () => {
  for (const action of controls.FORBIDDEN) {
    assert.throws(() => controls.createMidiMapper([{ type: "noteon", data1: 1, action }]), /periferico/);
  }
  assert.throws(() => controls.createMidiMapper([{ type: "cc", data1: 1, action: "tune-step" }]), /relative/);
});

test("keyboard shortcuts: Escape stops, F1-F8 are CW memories, modifiers are ignored", () => {
  assert.deepEqual(controls.keyAction({ key: "Escape" }), { action: "estop" });
  assert.equal(controls.keyAction({ key: "F3" }).memory, 3);
  assert.equal(controls.keyAction({ key: "F9" }), null);
  assert.equal(controls.keyAction({ key: "F1", ctrlKey: true }), null);
  assert.equal(controls.keyAction({ key: "ArrowUp", shiftKey: true }).steps, 10);
});
