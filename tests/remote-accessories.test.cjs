const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccessories, loadCatalog, supportMatrix, TUNE_POWER_MAX_W } = require("../station-accessories.cjs");
const { validateCommand } = require("../remote-agent.cjs");
const radios = require("../data/remote-station-catalog.json");

function fakeCatalog() {
  const catalog = loadCatalog();
  catalog.devices.push({ id: "test-amp", kind: "amplifier", status: "partial", driver: "test", features: {} });
  return catalog;
}

function fakeAmp(overrides = {}) {
  const calls = [];
  return {
    calls,
    async setOperate(on) { calls.push(["operate", on]); if (overrides.failStandby && !on) throw new Error("serial"); },
    async setBand(band) { calls.push(["band", band]); },
    read: overrides.read
  };
}

function build(extra = {}, amp = fakeAmp()) {
  let time = 1000;
  const accessories = createAccessories({
    now: () => time,
    catalog: fakeCatalog(),
    amplifier: amp,
    tuner: extra.tuner,
    config: { amplifier: { device: "test-amp", operateAllowed: extra.operateAllowed ?? true }, tuner: { device: extra.tunerDevice } },
    ...extra.options
  });
  return { accessories, amp, advance: ms => { time += ms; } };
}

test("the catalog marks every device without a driver as pendiente de fuente and lists sources", () => {
  const rows = supportMatrix();
  assert.ok(rows.length >= 15);
  for (const row of rows) {
    assert.ok(row.source.length > 0, row.id);
    if (!row.enabled) assert.ok(["pendiente de fuente", "partial"].includes(row.status), row.id);
  }
  for (const id of ["elecraft-kat500", "elecraft-kpa500", "palstar-amplifiers", "icom-ic705-internal-atu", "atu-100-ext"]) {
    const row = rows.find(item => item.id === id);
    assert.equal(row.status, "pendiente de fuente", id);
    assert.equal(row.enabled, false, id);
  }
  for (const id of ["elecraft-kpa1500", "expert-fa", "acom-amplifiers", "gemini-dx1200-hf1k"]) {
    const row = rows.find(item => item.id === id);
    assert.equal(row.status, "partial", id);
    assert.equal(row.enabled, true, id);
    assert.equal(row.verification, "source-implemented, not hardware-tested", id);
  }
});

test("FTX-1 tuner frames in the accessory catalog come from the radio catalog (AC command)", () => {
  const ftx1 = radios.radios.find(radio => radio.id === "yaesu-ftx-1").cat.tuner;
  assert.deepEqual(ftx1.internal, { on: "AC101", off: "AC100", start: "AC103", stop: "AC100" });
  assert.deepEqual(ftx1.atas, { start: "AC123", stop: "AC120" });
  const internal = loadCatalog().devices.find(device => device.id === "yaesu-ftx1-internal-atu");
  assert.match(internal.tune, /AC103.*AC100/);
  assert.match(loadCatalog().devices.find(device => device.id === "yaesu-ftx1-atas").tune, /AC123.*AC120/);
});

test("without a driver or config the amplifier stays in standby and cannot operate", async () => {
  const accessories = createAccessories({ config: {} });
  const snapshot = accessories.snapshot();
  assert.equal(snapshot.amplifier.state, "standby");
  assert.equal(snapshot.amplifier.supported, false);
  assert.equal(snapshot.amplifier.status, "pendiente de fuente");
  assert.deepEqual(await accessories.operate({}), { ok: false, reason: "unsupported" });
});

test("operate needs explicit config, a known band and no TX, tune or SWR trip", async () => {
  const off = build({ operateAllowed: false });
  await off.accessories.followBand(14_200_000);
  assert.equal((await off.accessories.operate({})).reason, "disabled");

  const { accessories, amp } = build();
  assert.equal((await accessories.operate({})).reason, "band_unknown");
  await accessories.followBand(14_200_000);
  assert.equal((await accessories.operate({ tx: true })).reason, "tx");
  assert.equal((await accessories.operate({ tuning: true })).reason, "tuning");
  assert.equal((await accessories.operate({ swrTripped: true })).reason, "swr");
  assert.equal(amp.calls.some(call => call[0] === "operate" && call[1] === true), false);
  assert.deepEqual(await accessories.operate({}), { ok: true });
  assert.equal(accessories.snapshot().amplifier.state, "operate");
});

test("every safety event returns the amplifier to standby", async () => {
  for (const reason of ["disconnect", "swr", "lease", "emergency", "close"]) {
    const { accessories, amp } = build();
    await accessories.followBand(7_100_000);
    await accessories.operate({});
    await accessories.standby(reason);
    const { amplifier } = accessories.snapshot();
    assert.equal(amplifier.state, "standby", reason);
    assert.equal(amplifier.standbyReason, reason);
    assert.deepEqual(amp.calls.at(-1), ["operate", false]);
  }
});

test("a failed standby is reported and blocks a new operate until confirmed", async () => {
  const { accessories, amp } = build({}, fakeAmp({ failStandby: true }));
  await accessories.followBand(14_200_000);
  await accessories.operate({});
  const result = await accessories.standby("disconnect");
  assert.equal(result.confirmed, false);
  assert.equal(accessories.snapshot().amplifier.pendingStandby, true);
  assert.equal((await accessories.operate({})).reason, "standby_pending");
  amp.setOperate = async () => {};
  assert.equal((await accessories.standby("operator")).confirmed, true);
  assert.equal((await accessories.operate({})).ok, true);
});

test("band follow is refused while transmitting and a band change drops operate", async () => {
  const { accessories, amp } = build();
  await accessories.followBand(14_200_000);
  await accessories.operate({});
  assert.deepEqual(await accessories.followBand(7_100_000, { tx: true }), { ok: false, reason: "tx" });
  assert.equal(accessories.snapshot().amplifier.band, "20m");
  assert.equal(accessories.snapshot().amplifier.state, "operate");
  assert.equal((await accessories.followBand(7_100_000, { tx: false })).band, "40m");
  assert.equal(accessories.snapshot().amplifier.state, "standby");
  assert.equal(accessories.snapshot().amplifier.standbyReason, "band_change");
  assert.deepEqual(amp.calls.slice(-2), [["operate", false], ["band", "40m"]]);
});

test("readout above the SWR limit, a fault or an unexpected operate state forces standby", async () => {
  for (const [reading, reason] of [[{ swr: 3.5 }, "swr"], [{ swr: 1.2, fault: "OVERTEMP" }, "fault"], [{ operate: true }, "mismatch"]]) {
    const { accessories } = build({}, fakeAmp({ read: async () => ({ powerW: 100, tempC: 40, ...reading }) }));
    await accessories.followBand(14_200_000);
    if (reason !== "mismatch") await accessories.operate({});
    await accessories.poll();
    assert.equal(accessories.snapshot().amplifier.standbyReason, reason);
    assert.notEqual(accessories.snapshot().amplifier.state, "operate");
  }
  const { accessories } = build({}, fakeAmp({ read: async () => { throw new Error("timeout"); } }));
  await accessories.followBand(14_200_000);
  await accessories.operate({});
  await accessories.poll();
  assert.equal(accessories.snapshot().amplifier.state, "fault");
});

test("tune is explicit, low power, time capped and never with the amplifier in operate", async () => {
  const bridgeCalls = [];
  const tuner = { start: async () => bridgeCalls.push("start"), stop: async () => bridgeCalls.push("stop") };
  const { accessories, advance } = build({ tuner, tunerDevice: "yaesu-ftx1-internal-atu", options: { tuneMaxSeconds: 20 } });
  assert.equal((await accessories.startTune({ tx: true, powerW: 5 })).reason, "tx");
  assert.equal((await accessories.startTune({})).reason, "power_unknown");
  assert.equal((await accessories.startTune({ powerW: TUNE_POWER_MAX_W + 1 })).reason, "power_too_high");
  await accessories.followBand(14_200_000);
  await accessories.operate({});
  assert.equal((await accessories.startTune({ powerW: 5 })).reason, "amp_operate");
  await accessories.standby("operator");
  assert.deepEqual(bridgeCalls, []);
  assert.deepEqual(await accessories.startTune({ powerW: 5 }), { ok: true });
  assert.equal((await accessories.startTune({ powerW: 5 })).reason, "busy");
  assert.equal((await accessories.operate({})).reason, "tuning");
  advance(19_000);
  await accessories.tick();
  assert.equal(accessories.snapshot().tuner.tuning, true);
  advance(1_000);
  await accessories.tick();
  assert.equal(accessories.snapshot().tuner.tuning, false);
  assert.equal(accessories.snapshot().tuner.last.reason, "time_cap");
  assert.deepEqual(bridgeCalls, ["start", "stop"]);
});

test("emergency stop sends amplifier standby and the tuner stop", async () => {
  const bridgeCalls = [];
  const tuner = { start: async () => bridgeCalls.push("start"), stop: async () => bridgeCalls.push("stop") };
  const { accessories, amp } = build({ tuner, tunerDevice: "yaesu-ftx1-internal-atu" });
  await accessories.followBand(14_200_000);
  await accessories.operate({});
  await accessories.standby("operator");
  await accessories.startTune({ powerW: 5 });
  assert.equal((await accessories.emergencyStop("emergency")).ok, true);
  assert.deepEqual(bridgeCalls, ["start", "stop"]);
  assert.deepEqual(amp.calls.at(-1), ["operate", false]);
  assert.equal(accessories.snapshot().tuner.tuning, false);
});

test("the agent accepts only operate or standby as amplifier commands", () => {
  assert.deepEqual(validateCommand({ cmd: "amp", value: "standby" }, {}), { cmd: "amp", value: "standby" });
  assert.deepEqual(validateCommand({ cmd: "amp", value: "operate" }, {}), { cmd: "amp", value: "operate" });
  assert.ok(validateCommand({ cmd: "amp", value: "on" }, {}).error);
  assert.ok(validateCommand({ cmd: "amp", value: true }, {}).error);
});
