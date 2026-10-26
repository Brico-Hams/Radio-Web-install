const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const S = require("satellite.js");
const R = require("../radio-core.js");
require("../codeplug-editor.js");
require("../quansheng-channels.js");
require("../planning-core.js");
const { DataService } = require("../data-service.cjs");
const { createServer } = require("../server.cjs");
test("configuracion RepeaterBook local valida aprobacion y no devuelve ni altera credenciales de entorno", () => {
  const env = {};
  const service = new DataService(fetch, env);
  assert.throws(() => service.configureRepeaterbook({ token: "bad", agent: "a@b.com", approved: true }), /Token/);
  assert.throws(() => service.configureRepeaterbook({ token: "ab".repeat(32), agent: "app a@b.com", approved: true }), /Auth V2.*rbuapp_/);
  assert.throws(() => service.configureRepeaterbook({ token: "rbuapp_test", agent: "a@b.com", approved: true }), /identificar la aplicacion/);
  assert.throws(() => service.configureRepeaterbook({ token: "rbuapp_test", agent: "app a@b.com", approved: false }), /aprobacion/);
  assert.throws(() => service.configureRepeaterbook({ token: "rbuapp_test", agent: "app\r\na@b.com", approved: true }), /User-Agent/);
  const result = service.configureRepeaterbook({ token: "rbuapp_test", agent: "app a@b.com", approved: true });
  assert.equal(result.repeaterbookConfigured, true);
  assert.equal(JSON.stringify(result).includes("rbuapp_test"), false);
  assert.deepEqual(env, {});
});
test("grupos BrandMeister usan origen fijo, prefijo y tipo grupo", async () => {
  const service = new DataService(async url => {
    assert.equal(url, "https://api.brandmeister.network/v2/talkgroup");
    return new Response(JSON.stringify({ 91: "Worldwide", 214: "Spain", 21401: "Madrid" }));
  });
  const result = await service.talkgroups({ prefix: "214" });
  assert.deepEqual(result.entries.map(item => [item.id, item.type]), [[214, 0], [21401, 0]]);
  await assert.rejects(service.talkgroups({ prefix: "" }), /Prefijo/);
  await assert.rejects(service.talkgroups({ prefix: "999" }), /vacia/);
});
test("configuracion HTTP RepeaterBook requiere POST JSON mismo origen y nunca expone token", async () => {
  const server = createServer({}, new DataService(fetch, {}));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const options = { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "rbuapp_example", agent: "test a@b.com", approved: true }) };
    assert.equal((await fetch(`${base}/api/data/repeaterbook-config`, options)).status, 403);
    const response = await fetch(`${base}/api/data/repeaterbook-config`, { ...options,
      headers: { ...options.headers, Origin: base } });
    assert.equal(response.status, 200);
    assert.equal((await response.text()).includes("rbuapp_example"), false);
    assert.equal((await (await fetch(`${base}/api/data/status`)).json()).repeaterbookConfigured, true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
const orbital = {
  name: "ISS", norad: 25544, source: "https://db.satnogs.org/api/tle/?norad_cat_id=25544",
  tle1: "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
  tle2: "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914"
};
const start = Date.parse("2026-10-19T06:00:00Z");
const observer = { latitude: 40.4168, longitude: -3.7038, height: 0.667 };
function catFixture() {
  const pass = R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 }).passes.find(item => !item.partialStart && !item.partialEnd);
  const plan = { orbital, observer, pass, transmitter: { id: "test", mode: "FM", downlink: 145800000, source: orbital.source } };
  let time = pass.maximum.time;
  const commands = [];
  const connector = { connected: true,
    async setCatReceive(frequency10Hz) { commands.push(frequency10Hz); return { appliedFrequency10Hz: frequency10Hz }; },
    async stopCatReceive() { commands.push("stop"); }
  };
  return { plan, connector, commands, clock: () => time, setTime: value => { time = value; } };
}
test("CAT de pase calcula Doppler RX con rango SGP4 y valida limites de tiempo/posicion", () => {
  const { plan } = catFixture();
  const time = plan.pass.maximum.time;
  const target = R.catPassTarget(plan.orbital, plan.transmitter, plan.pass, plan.observer, time);
  const record = S.twoline2satrec(orbital.tle1, orbital.tle2);
  const location = { latitude: observer.latitude * Math.PI / 180, longitude: observer.longitude * Math.PI / 180, height: observer.height };
  const range = at => {
    const date = new Date(at);
    return S.ecfToLookAngles(location, S.eciToEcf(S.propagate(record, date).position, S.gstime(date))).rangeSat;
  };
  const expected = Math.round(145800000 * (1 - (range(time + 500) - range(time - 500)) / 299792.458) / 10);
  assert.equal(target.frequency10Hz, expected);
  assert(target.elevation >= 10 && target.azimuth >= 0 && target.azimuth <= 360);
  for (const at of [plan.pass.aos.time - 1, plan.pass.los.time, NaN]) {
    assert.throws(() => R.catPassTarget(orbital, plan.transmitter, plan.pass, observer, at), /CAT/);
  }
  assert.throws(() => R.catPassTarget(orbital, plan.transmitter, plan.pass, { ...observer, height: 10 }, time), /Posicion/);
  assert.throws(() => R.catPassTarget(orbital, { ...plan.transmitter, mode: "USB" }, plan.pass, observer, time), /puntuales/);
});
test("seguimiento CAT renueva aunque no cambie frecuencia y stop es idempotente", async () => {
  const fixture = catFixture();
  const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  fixture.plan.transmitter.downlink = 435000000;
  const first = await tracker.start();
  assert(first.frequency10Hz < 15000000);
  fixture.setTime(fixture.clock() + 1000);
  await tracker.step();
  assert.equal(fixture.commands.length, 2);
  await tracker.stop();
  await tracker.stop();
  assert.deepEqual(fixture.commands.slice(2), ["stop"]);
  await assert.rejects(tracker.step(), /inactivo/);
  await assert.rejects(tracker.start(), /nueva/);
});
test("CAT detiene renovaciones tras reloj discontinuo, suspension o fin del pase", async () => {
  for (const shift of [-1000, 0, 2001, 3600000]) {
    const fixture = catFixture();
    const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
    await tracker.start();
    fixture.setTime(fixture.clock() + shift);
    await assert.rejects(tracker.step(), /discontinuo/);
    assert.equal(tracker.active, false);
    assert.equal(fixture.commands.length, 1);
    await tracker.stop();
    assert.equal(fixture.commands.at(-1), "stop");
  }
  const fixture = catFixture();
  fixture.setTime(fixture.plan.pass.los.time - 500);
  const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  await tracker.start();
  fixture.setTime(fixture.plan.pass.los.time);
  await assert.rejects(tracker.step(), /Fuera del pase/);
  await tracker.stop();
});
test("cancelar CAT en vuelo espera confirmacion antes de STOP y no envia mas SET", async () => {
  const fixture = catFixture();
  let finish;
  fixture.connector.setCatReceive = async frequency => {
    fixture.commands.push(frequency);
    await new Promise(resolve => { finish = resolve; });
    return {};
  };
  const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  const starting = tracker.start();
  await assert.rejects(tracker.step(), /ocupado/);
  const stopping = tracker.stop();
  assert.equal(tracker.active, false);
  assert.equal(fixture.commands.length, 1);
  finish();
  assert.equal(await starting, null);
  await stopping;
  assert.equal(fixture.commands.at(-1), "stop");
});
test("fallos CAT y desconexion no se convierten en restauracion exitosa", async () => {
  const fixture = catFixture();
  const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  fixture.connector.setCatReceive = async () => { throw new Error("USB perdido"); };
  await assert.rejects(tracker.start(), /USB perdido/);
  assert.equal(tracker.active, false);
  fixture.connector.connected = false;
  await assert.rejects(tracker.stop(), /sin restauracion confirmada/);
  const late = catFixture();
  late.connector.setCatReceive = async () => { late.setTime(late.clock() + 2000); return {}; };
  const delayed = new R.CatPassTracker(late.connector, late.plan, late.clock);
  await assert.rejects(delayed.start(), /demasiado tardia/);
  assert.equal(delayed.active, false);
  await delayed.stop();
});
test("CAT no inicia fuera del pase y no reabre una sesion ya cancelada", async () => {
  const fixture = catFixture();
  fixture.setTime(fixture.plan.pass.aos.time - 1);
  const tracker = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  await assert.rejects(tracker.start(), /Fuera del pase/);
  assert.equal(tracker.active, false);
  assert.equal(fixture.commands.length, 0);
  const cancelled = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  await cancelled.stop();
  await assert.rejects(cancelled.start(), /sesion CAT nueva/);
  fixture.connector.stopCatReceive = async () => { throw new Error("STOP rechazado"); };
  const failed = new R.CatPassTracker(fixture.connector, fixture.plan, fixture.clock);
  await assert.rejects(failed.stop(), error => error instanceof AggregateError && error.errors[0].message === "STOP rechazado");
});
function blankCodeplug() {
  const image = new Uint8Array(0x20000).fill(255);
  for (let bank = 0; bank < 8; bank++) {
    const base = bank === 0 ? 0x3780 : 0xb1b0 + (bank - 1) * (16 + 56 * 128);
    image.fill(0, base, base + 16);
  }
  image[0x3780] = 1;
  image.fill(0, 0x3790, 0x3790 + 56);
  image.set(new TextEncoder().encode("TEMPLATE"), 0x3790);
  image.set(R.encodeFrequency("145.50000"), 0x3790 + 16);
  image.set(R.encodeFrequency("145.50000"), 0x3790 + 20);
  return image;
}
test("contactos privados y grupos con igual ID son distintos y ambos se deduplican por tipo", () => {
  const image = blankCodeplug();
  const contacts = [{ id: 214, callsign: "PRIVATE", type: 1 }, { id: 214, callsign: "TG214", type: 0 }];
  const result = R.appendContacts(image, contacts);
  assert.equal(result.added, 2);
  assert.deepEqual(R.readContacts(result.image).map(item => item.type), [1, 0]);
  assert.equal(R.appendContacts(result.image, contacts).duplicates, 2);
  assert.throws(() => R.appendContacts(image, [{ id: 214, callsign: "BAD", type: 3 }]), /tipo grupo/);
});
function repeater(patch = {}) {
  return { Callsign: "EA4TEST", Frequency: "145.60000", "Input Freq": "145.00000", "FM Analog": "Yes", DMR: "No",
    Country: "Spain", State: "Madrid", "Nearest City": "Madrid", PL: "88.5", "Operational Status": "On-air", ...patch };
}
test("borrado OpenGD77 limpia zonas, listas y prioridades sin renumerar ni tocar el original", () => {
  const image = blankCodeplug();
  image[0x3780] |= 2;
  image.set(image.subarray(0x3790, 0x3790 + 56), 0x3790 + 56);
  image.fill(0, 0x8010, 0x8030);
  image[0x8010] = 1;
  image.fill(0, 0x8030, 0x8030 + 176);
  image.set(new TextEncoder().encode("ZONE"), 0x8030);
  const view = new DataView(image.buffer);
  [1, 2, 1].forEach((value, index) => view.setUint16(0x8040 + index * 2, value, true));
  image.fill(0, 0x1790, 0x17d0 + 88);
  image[0x1790] = 1;
  image.set(new TextEncoder().encode("SCAN"), 0x17d0);
  [1, 2, 1].forEach((value, index) => view.setUint16(0x17e0 + index * 2, value, true));
  view.setUint16(0x17d0 + 80, 1, true);
  view.setUint16(0x17d0 + 82, 2, true);
  view.setUint16(0x17d0 + 84, 1, true);
  const original = image.slice();
  const result = R.deleteChannel(image, 1);
  const out = new DataView(result.buffer);
  assert.deepEqual(image, original);
  assert.deepEqual(R.readChannels(result).map(channel => channel.number), [2]);
  assert.equal(out.getUint16(0x8040, true), 2);
  assert.equal(out.getUint16(0x8042, true), 0);
  assert.equal(out.getUint16(0x17e0, true), 2);
  assert.equal(out.getUint16(0x17e2, true), 0);
  assert.equal(out.getUint16(0x17d0 + 80, true), 0);
  assert.equal(out.getUint16(0x17d0 + 82, true), 2);
  assert.equal(out.getUint16(0x17d0 + 84, true), 0);
  assert.deepEqual(result.subarray(0x3790, 0x3790 + 56), new Uint8Array(56).fill(255));
  assert.deepEqual(result.subarray(0x3790 + 56, 0x3790 + 112), original.subarray(0x3790 + 56, 0x3790 + 112));
  assert.deepEqual(result.subarray(0x17620), original.subarray(0x17620));
  assert.throws(() => R.deleteChannel(result, 1), /vacio/);
  assert.throws(() => R.deleteChannel(image, 1025), /1-1024/);
});
test("borrado OpenGD77 cubre ultimo banco, ultima zona y ultima lista sin modificar las inactivas", () => {
  let image = blankCodeplug();
  const base = 0xb1b0 + 6 * (16 + 56 * 128);
  const offset = base + 16 + 127 * 56;
  image[base + 15] |= 128;
  image.set(image.subarray(0x3790, 0x3790 + 56), offset);
  image.fill(0, 0x8010, 0x8030);
  image[0x8010 + 8] = 8;
  const zone = 0x8030 + 67 * 176;
  image.fill(0, zone, zone + 176);
  image.set(new TextEncoder().encode("LAST"), zone);
  const scan = 0x17d0 + 63 * 88;
  image.fill(0, 0x1790, 0x17d0);
  image[0x1790 + 7] = 128;
  image.fill(0, scan, scan + 88);
  image.set(new TextEncoder().encode("LAST"), scan);
  const view = new DataView(image.buffer);
  view.setUint16(zone + 16 + 79 * 2, 1024, true);
  view.setUint16(scan + 16 + 31 * 2, 1024, true);
  const result = R.deleteChannel(image, 1024);
  assert.equal(new DataView(result.buffer).getUint16(zone + 16 + 79 * 2, true), 0);
  assert.equal(new DataView(result.buffer).getUint16(scan + 16 + 31 * 2, true), 0);
  assert.deepEqual(result.subarray(0x8030, 0x8030 + 176), image.subarray(0x8030, 0x8030 + 176));
  assert.deepEqual(result.subarray(0x17d0, 0x17d0 + 88), image.subarray(0x17d0, 0x17d0 + 88));
});
const channel = { name: "EA4TEST", rx: "145.60000", tx: "145.00000", mode: 0, colorCode: 0, timeslot: 1 };
test("preset Bricohams Murcia produce CSV importable y canales solo RX", () => {
  const preset = R.bricohamsRepeaterChannels();
  assert.equal(preset.length, 3);
  assert.ok(preset.every(channel => channel.rxOnly && channel.mode === 0 && channel.source.includes("ZIP")));
  const parsed = R.parseChannelCSV(R.channelCSV(preset));
  assert.deepEqual(parsed.rejected, []);
  assert.deepEqual(parsed.channels.map(channel => [channel.name, channel.rx, channel.tx]),
    preset.map(channel => [channel.name, channel.rx, channel.rx]));
  assert.ok(parsed.channels.every(channel => channel.rxOnly));
  assert.deepEqual(parsed.channels.map(channel => channel.narrow), [true, false, true]);
  assert.match(R.channelCSV(preset), /77.0 Hz/);
  const imported = R.appendQuanshengChannels(quanshengConfig(), parsed.channels, 1);
  assert.equal(imported.added, 3);
});
test("plantillas regionales separan portadora, designador AM y radiodifusion FM", () => {
  const air = R.murciaAirportTemplate();
  assert.equal(air.results.length, 15);
  assert.ok(air.results.every(row => row.mode === "AM" && row.rxOnly && /AIP ENAIRE.*https:/.test(row.source)));
  assert.equal(air.results.find(row => row.name === "LEMI-TWR").frequencyMHz, "121.325");
  assert.equal(air.results.find(row => row.name === "LEMI-TWR").channelDesignator, "121.330");
  assert.equal(air.results.find(row => row.name === "LEAL-ATIS").frequencyMHz, "120.075");
  const fm = R.murciaBroadcastTemplate();
  assert.equal(fm.results.length, 15);
  assert.ok(fm.results.every(row => row.mode === "WFM" && row.rxOnly && Number(row.frequencyMHz) >= 87.5 && Number(row.frequencyMHz) <= 108));
  assert.equal(fm.results.find(row => row.city === "Murcia").frequencyMHz, "99.9");
  assert.throws(() => R.channelCSV(air.results), /solo canales FM/);
  assert.throws(() => R.channelCSV(fm.results), /solo canales FM/);
  const remer = R.parseChannelCSV(R.channelCSV(R.remerVHFChannels()));
  assert.equal(remer.channels.length, 11);
  assert.ok(remer.channels.every(channel => channel.rxOnly));
});
test("Restore Quansheng copia solo canales, conserva ajustes y exige version identica", () => {
  const current = quanshengConfig();
  const backup = R.appendQuanshengChannels(current, R.pmrChannels(), 1).image;
  backup[0x9000] ^= 1;
  const snapshot = current.slice();
  const restored = R.restoreQuanshengChannels(backup, current);
  assert.equal(R.readQuanshengChannels(restored).length, 17);
  assert.deepEqual(restored.subarray(0x8800), current.subarray(0x8800));
  assert.deepEqual(current, snapshot);
  assert.throws(() => R.restoreQuanshengChannels(new Uint8Array(8), current), /41344|Tamano|bytes/i);
  const other = backup.slice();
  other.set(new TextEncoder().encode("v6.1.0"), 0xa160);
  assert.throws(() => R.restoreQuanshengChannels(other, current), /misma version/);
});
function quanshengConfig() {
  const image = new Uint8Array(R.QUANSHENG_CONFIG_SIZE).fill(255);
  image.fill(0, 0, 16);
  new DataView(image.buffer).setUint32(0, 14550000, true);
  image[12] = 0x1d;
  image[13] = 15;
  image.fill(0, 0x4000, 0x4010);
  image.set(new TextEncoder().encode("TEMPLATE"), 0x4000);
  image[0x8000] = 2;
  image[0x8001] = 0;
  // Real v6.0 images may retain attributes for erased frequency records.
  image[0x8002] = 5;
  image.fill(0, 0xa160, 0xa170);
  image.set(new TextEncoder().encode("v6.0.0"), 0xa160);
  return image;
}
test("Quansheng copia y mueve memorias byte a byte, incluidos DCS y banderas no editables", () => {
  const original = R.appendQuanshengChannels(quanshengConfig(), R.pmrChannels().slice(0, 3), 1).image;
  original[16 + 10] = 0x20; // DCS on TX: not representable in the editor, must survive untouched
  original[16 + 12] |= 0x21; // reverse + busy lock
  const memory = (image, number) => [...image.subarray((number - 1) * 16, number * 16),
    ...image.subarray(0x4000 + (number - 1) * 16, 0x4000 + number * 16), ...image.subarray(0x8000 + (number - 1) * 2, 0x8000 + number * 2)];
  const copied = R.copyQuanshengChannel(original, 2);
  assert.equal(copied.number, 5);
  assert.deepEqual(memory(copied.image, 5), memory(original, 2));
  assert.equal(R.copyQuanshengChannel(original, 2, 900).number, 900);
  assert.throws(() => R.copyQuanshengChannel(original, 2, 3), /ocupada/);
  assert.throws(() => R.copyQuanshengChannel(original, 10), /vacio/);
  const moved = R.moveQuanshengChannel(original, 2, 4);
  assert.deepEqual([3, 4, 2].map(number => memory(original, number)), [2, 3, 4].map(number => memory(moved, number)));
  assert.deepEqual(memory(moved, 1), memory(original, 1));
  const back = R.moveQuanshengChannel(moved, 4, 2);
  assert.deepEqual(back, original);
  assert.deepEqual(moved.subarray(0x8800), original.subarray(0x8800));
  assert.throws(() => R.moveQuanshengChannel(original, 2, 1025), /1-1024/);
  assert.throws(() => R.moveQuanshengChannel(original, 10, 2), /vacio/);
});
test("PMR446 ofrece 16 frecuencias exactas, ordenadas y solo RX", () => {
  const channels = R.pmrChannels();
  assert.equal(channels.length, 16);
  assert.equal(channels[0].rx, "446.00625");
  assert.equal(channels[15].rx, "446.19375");
  assert.equal(new Set(channels.map(channel => channel.key)).size, 16);
  assert.ok(channels.every(channel => channel.rxOnly && channel.rx === channel.tx && channel.mode === 0));
});
test("Quansheng importa PMR sobre plantilla, reutiliza memorias borradas y protege original y ajustes", () => {
  const original = quanshengConfig(); const snapshot = original.slice();
  assert.equal(R.readQuanshengChannels(original).length, 1);
  const result = R.appendQuanshengChannels(original, R.pmrChannels(), 1);
  assert.equal(result.added, 16);
  const channels = R.readQuanshengChannels(result.image);
  assert.equal(channels.length, 17);
  assert.equal(channels[1].number, 2);
  assert.equal(channels[1].rx, "446.00625");
  assert.ok(channels.slice(1).every(channel => channel.rxOnly && channel.mode === 0));
  assert.ok(channels.slice(1).every(channel => channel.scanList === 25 && !channel.scanExcluded));
  assert.equal(result.image[16 + 12] & 1, 0);
  assert.equal(result.image[16 + 12] & 2, 2);
  assert.equal(result.image[16 + 13], 0);
  assert.deepEqual(result.image.subarray(16 + 8, 16 + 11), new Uint8Array(3));
  assert.deepEqual(original, snapshot);
  assert.deepEqual(result.image.subarray(0x8800), original.subarray(0x8800));
  assert.equal(R.appendQuanshengChannels(result.image, R.pmrChannels(), 1).duplicates, 16);
});
test("Quansheng conserva offset de repetidor, fuerza RX-only y limita nombres a diez caracteres", () => {
  const original = quanshengConfig();
  const added = R.appendQuanshengChannels(original, [{ ...channel, name: "REPEATER123456" }], 1);
  const parsed = R.readQuanshengChannels(added.image)[1];
  assert.equal(parsed.name, "REPEATER12");
  assert.equal(parsed.rx, "145.60000");
  assert.equal(parsed.tx, "145.00000");
  assert.equal(parsed.rxOnly, true);
  const deleted = R.deleteQuanshengChannel(added.image, parsed.number);
  assert.equal(R.readQuanshengChannels(deleted).length, 1);
  assert.equal(R.readQuanshengChannels(added.image).length, 2);
  assert.equal(deleted[0x8002] & 7, 7);
  assert.deepEqual(deleted.subarray(0x8800), original.subarray(0x8800));
});
test("Quansheng asigna la banda de F4HWN: 136 MHz es BAND2, 137-174 BAND3 y 400-470 BAND6", () => {
  const added = R.appendQuanshengChannels(quanshengConfig(), [
    { ...channel, name: "B2", rx: "136.50000", tx: "136.50000" },
    { ...channel, name: "B3", rx: "137.00000", tx: "137.00000" },
    { ...channel, name: "B6", rx: "438.77500", tx: "431.17500" }], 1).image;
  assert.deepEqual([1, 2, 3].map(index => added[0x8000 + index * 2] & 7), [1, 2, 5]);
});

test("Quansheng actualiza canales locales conservando bloqueo RX y datos no editados", () => {
  const original = quanshengConfig();
  const snapshot = original.slice();
  const updated = R.updateQuanshengChannel(original, {
    number: 1, name: "LORCA-R4", rx: "146.70000", tx: "146.10000"
  });
  const [channel] = R.readQuanshengChannels(updated);
  assert.equal(channel.name, "LORCA-R4");
  assert.equal(channel.rx, "146.70000");
  assert.equal(channel.tx, "146.10000");
  assert.equal(channel.rxOnly, true);
  assert.deepEqual(updated.subarray(0x8800), original.subarray(0x8800));
  assert.deepEqual(original, snapshot);
  assert.throws(() => R.updateQuanshengChannel(original, { number: 1, name: "INVALID-NAME", rx: "146.7", tx: "146.1" }), /10 caracteres/);
  assert.throws(() => R.updateQuanshengChannel(original, { number: 1, name: "OK", rx: "146.7", tx: "446.1" }), /misma banda/);
  assert.throws(() => R.updateQuanshengChannel(original, { number: 2, name: "OK", rx: "146.7", tx: "146.1" }), /existentes/);
});
test("Quansheng edita bandas limite y listas sin alterar otros atributos ni ajustes", () => {
  const original = quanshengConfig();
  original[0x8000] |= 0x98;
  original[0x8001] = 4;
  for (const [rx, band] of [["136.50000", 1], ["137.00000", 2], ["174.00000", 3], ["400.00000", 5], ["470.00000", 6]]) {
    const edited = R.updateQuanshengChannel(original, { number: 1, name: "EDGE", rx, tx: rx, scanList: 7 });
    assert.equal(edited[0x8000] & 7, band);
    assert.equal(edited[0x8000] & 0x18, 0x18);
    assert.equal(edited[0x8000] & 128, 0);
    assert.equal(R.readQuanshengChannels(edited)[0].scanList, 7);
    assert.deepEqual(edited.subarray(0x8800), original.subarray(0x8800));
  }
  const assigned = R.assignQuanshengScanList(original, [1], 25);
  assert.equal(R.readQuanshengChannels(assigned)[0].scanList, 25);
  assert.equal(original[0x8001], 4);
  assert.throws(() => R.assignQuanshengScanList(original, [2], 1), /no existe/);
  assert.throws(() => R.assignQuanshengScanList(original, [1], 26), /Lista Quansheng/);
  assert.throws(() => R.assignQuanshengScanList(original, [], 1), /Selecciona canales/);
});
test("Quansheng agrupa por zona o geografia en listas libres y rechaza datos incompletos", () => {
  const image = quanshengConfig();
  image[0x8001] = 1;
  const input = [{ ...channel, region: "Murcia" }, { ...channel, name: "EA4OTRO", region: "Madrid" },
    { ...channel, name: "EA4MAS", region: "Murcia" }];
  const grouped = R.groupQuanshengChannels(image, input, "region");
  assert.deepEqual(grouped.groups, [{ name: "Murcia", list: 2 }, { name: "Madrid", list: 3 }]);
  assert.deepEqual(grouped.channels.map(entry => entry.scanList), [2, 3, 2]);
  const added = R.appendQuanshengChannels(image, grouped.channels, 1);
  assert.deepEqual(R.readQuanshengChannels(added.image).slice(1).map(entry => entry.scanList), [2, 3, 2]);
  assert.ok(input.every(entry => entry.scanList === undefined));
  assert.throws(() => R.groupQuanshengChannels(image, [channel], "city"), /no contiene city/);
  const many = Array.from({ length: 24 }, (_, index) => ({ ...channel, region: String(index) }));
  assert.throws(() => R.groupQuanshengChannels(image, many, "region"), /No quedan listas/);
});
test("Quansheng no omite un duplicado TX habilitado y respeta ancho FM del CSV", () => {
  const original = quanshengConfig();
  const existing = R.readQuanshengChannels(original)[0];
  const result = R.appendQuanshengChannels(original, [{ ...existing, rxOnly: true, narrow: false }], 1);
  assert.equal(result.added, 1);
  assert.equal(R.readQuanshengChannels(result.image)[1].rxOnly, true);
  assert.equal(R.readQuanshengChannels(result.image)[1].narrow, false);
  assert.throws(() => R.appendQuanshengChannels(original, [{ ...channel, tx: "446.00000" }], 1), /misma banda/);
});
test("plan de pases guardado valida posicion, TLE y frecuencia para recalcular sin confiar en horarios", () => {
  const prediction = R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 });
  const plan = { format: "radio-workspace-satellite-plan", version: 1, orbital, prediction,
    transmitter: { id: "fm", name: "ISS FM", downlink: 145800000, mode: "FM" } };
  const loaded = R.validateSatellitePlan(JSON.parse(JSON.stringify(plan)), start);
  assert.deepEqual(loaded.observer, observer);
  assert.equal(loaded.hours, 24);
  assert.equal(loaded.transmitter.downlink, 145800000);
  assert.equal(R.predictPasses(loaded.orbital, loaded.observer,
    { start, hours: loaded.hours, minimum: loaded.minimum }).passes.length, prediction.passes.length);
  assert.equal(R.validateSatellitePlan({ ...plan, transmitter: null }, start).transmitter, null);
  assert.throws(() => R.validateSatellitePlan({ ...plan, version: 2 }, start), /Formato/);
  assert.throws(() => R.validateSatellitePlan({ ...plan, prediction: { ...prediction, observer: { ...observer, latitude: 91 } } }, start), /Posicion/);
  assert.throws(() => R.validateSatellitePlan({ ...plan, transmitter: { ...plan.transmitter, mode: "USB" } }, start), /puntuales/);
  assert.throws(() => R.validateSatellitePlan(plan, start + 10 * 86400000), /TLE/);
});
test("Quansheng rechaza formato incorrecto, DMR, frecuencias no soportadas y plantilla ausente", () => {
  const original = quanshengConfig();
  assert.throws(() => R.readQuanshengChannels(new Uint8Array(512)), /Tamano/);
  assert.throws(() => R.readQuanshengChannels(new Uint8Array(R.QUANSHENG_CONFIG_SIZE)), /version F4HWN/);
  assert.throws(() => R.appendQuanshengChannels(original, [channel], 2), /plantilla/);
  assert.throws(() => R.appendQuanshengChannels(original, [{ ...channel, mode: 1 }], 1), /FM analogicos/);
  assert.throws(() => R.appendQuanshengChannels(original, [{ ...channel, rx: "27.00000" }], 1), /limita/);
  assert.throws(() => R.deleteQuanshengChannel(original, 0), /1-1024/);
  assert.throws(() => R.deleteQuanshengChannel(original, 1024), /vacio/);
});
test("REMER Murcia carga solo 2 m FM compatible y excluye sus frecuencias HF SSB", () => {
  const remer = R.remerVHFChannels();
  assert.equal(remer.length, 11);
  assert.ok(remer.every(entry => entry.mode === 0 && entry.rxOnly && entry.source.includes("usuario")));
  assert.deepEqual(remer.slice(0, 2).map(entry => [entry.name, entry.rx, entry.tx, entry.tone, entry.city]), [
    ["LORC-R4-14", "146.70000", "146.10000", "88.5", "Lorca"],
    ["CARR-R2-22", "146.65000", "146.05000", "156.7", "Carrascoy"]
  ]);
  assert.ok(remer.every(entry => Number(entry.rx) >= 136 && Number(entry.rx) <= 174));
  const hf = R.remerHFChannels();
  assert.equal(hf.length, 9);
  assert.ok(hf.every(entry => entry.mode === "SSB" && (Number(entry.frequency) < 30)));
  const quansheng = R.appendQuanshengChannels(quanshengConfig(), remer, 1);
  const visible = R.readQuanshengChannels(quansheng.image);
  assert.equal(visible.length, 12);
  assert.ok(remer.every(entry => visible.some(channel => channel.name === entry.name.slice(0, 10) &&
    channel.rx === entry.rx && channel.tx === entry.tx && channel.rxOnly)));
  assert.throws(() => R.appendQuanshengChannels(quanshengConfig(), hf.map(entry => ({
    name: `HF${entry.channel}`, rx: entry.frequency, tx: entry.frequency, mode: 0
  })), 1), /analogicos|limita/);
});
test("OpenGD77 puede leer los repetidores REMER VHF anadidos al codeplug sin escribir la radio", () => {
  const original = blankCodeplug();
  const entries = R.remerVHFChannels();
  const result = R.appendChannels(original, entries, 1);
  const visible = R.readChannels(result.image).slice(1);
  assert.equal(visible.length, entries.length);
  assert.ok(visible.every(channel => channel.mode === 0 && channel.rxOnly));
  assert.deepEqual(visible.map(channel => [channel.name, channel.rx, channel.tx]),
    entries.map(channel => [channel.name, channel.rx, channel.tx]));
  for (let index = 0; index < entries.length; index++) {
    const offset = 0x3790 + (index + 1) * 56;
    assert.ok(result.image.subarray(offset + 32, offset + 36).every(byte => byte === 255));
  }
});
test("append channels clones explicit template, sets free bitmap, preserves all original records and forces RX-only", () => {
  const original = blankCodeplug();
  const snapshot = original.slice();
  const result = R.appendChannels(original, [channel], 1);
  assert.deepEqual(original, snapshot);
  assert.equal(result.added, 1);
  const channels = R.readChannels(result.image);
  assert.equal(channels.length, 2);
  assert.equal(channels[1].number, 2);
  assert.equal(channels[1].rxOnly, true);
  assert.equal(channels[1].tx, "145.00000");
  assert.ok(result.image.subarray(0x3790 + 56 + 32, 0x3790 + 56 + 36).every(byte => byte === 255));
  for (let index = 0; index < original.length; index++) {
    if (index === 0x3780 || (index >= 0x3790 + 56 && index < 0x3790 + 112)) continue;
    assert.equal(result.image[index], original[index], `unrelated offset ${index}`);
  }
  assert.equal(R.appendChannels(result.image, [channel], 1).duplicates, 1);
});
test("append channels fails atomically for invalid template, mixed modes, bad names and full codeplug", () => {
  const original = blankCodeplug();
  for (const [rows, template] of [[[channel], 2], [[{ ...channel, mode: 1 }], 1],
    [[{ ...channel, name: "Bad\u0000" }], 1], [[], 1], [[{ ...channel, rx: "145.000001" }], 1]]) {
    const snapshot = original.slice();
    assert.throws(() => R.appendChannels(original, rows, template));
    assert.deepEqual(original, snapshot);
  }
  const full = blankCodeplug();
  for (let bank = 0; bank < 8; bank++) {
    const base = bank === 0 ? 0x3780 : 0xb1b0 + (bank - 1) * (16 + 56 * 128);
    full.fill(255, base, base + 16);
  }
  assert.throws(() => R.appendChannels(full, [channel], 1), /espacio/);
});
test("DMR channel import preserves template parameters and imports CC without activating TX", () => {
  const image = blankCodeplug();
  image[0x3790 + 24] = 1;
  image[0x3790 + 49] = 64;
  image[0x3790 + 46] = 5;
  const result = R.appendChannels(image, [{ ...channel, mode: 1, timeslot: undefined, colorCode: 7 }], 1);
  const entry = R.readChannels(result.image)[1];
  assert.equal(entry.timeslot, 2);
  assert.equal(entry.colorCode, 7);
  assert.equal(entry.contact, 5);
  assert.equal(entry.rxOnly, true);
});
test("repeaters sharing frequencies are not discarded when callsign, CC or TS differs", () => {
  const image = blankCodeplug();
  image[0x3790 + 24] = 1;
  const rows = [{ ...channel, mode: 1 }, { ...channel, mode: 1, colorCode: 2 },
    { ...channel, mode: 1, timeslot: 2 }, { ...channel, mode: 1, name: "OTHER" }];
  const result = R.appendChannels(image, rows, 1);
  assert.equal(result.added, 4); assert.equal(result.duplicates, 0);
  assert.equal(R.appendChannels(result.image, rows, 1).duplicates, 4);
});
test("contact imports encode known big-endian BCD and private-call flags, preserve indices and deduplicate", () => {
  const image = blankCodeplug();
  const snapshot = image.slice();
  const result = R.appendContacts(image, [{ id: 2140001, callsign: "EA4TEST" }, { id: 2140001, callsign: "EA4TEST" }]);
  assert.equal(result.added, 1); assert.equal(result.duplicates, 1);
  assert.deepEqual(image, snapshot);
  assert.deepEqual(Array.from(result.image.subarray(0x17630, 0x17638)), [0x02, 0x14, 0x00, 0x01, 1, 0, 0, 1]);
  assert.deepEqual(R.readContacts(result.image), [{ number: 1, id: 2140001, name: "EA4TEST", type: 1 }]);
  const second = R.appendContacts(result.image, [{ id: 2140002, callsign: "EA4NEXT" }]);
  assert.equal(R.readContacts(second.image)[1].number, 2);
  for (let index = 0; index < image.length; index++) {
    if (index >= 0x17620 && index < 0x17638) continue;
    assert.equal(result.image[index], image[index]);
  }
});
test("contact errors and capacity never mutate source codeplug or overwrite existing contacts", () => {
  for (const contact of [{ id: 0, callsign: "X" }, { id: 0x1000000, callsign: "X" }, { id: 1, callsign: "A".repeat(17) }]) {
    const image = blankCodeplug(); const snapshot = image.slice();
    assert.throws(() => R.appendContacts(image, [contact]));
    assert.deepEqual(image, snapshot);
  }
  const image = blankCodeplug();
  const contacts = Array.from({ length: 1024 }, (_, index) => ({ id: index + 1, callsign: `C${index}` }));
  const full = R.appendContacts(image, contacts).image;
  assert.equal(R.readContacts(full).length, 1024);
  assert.throws(() => R.appendContacts(full, [{ id: 5000, callsign: "NEW" }]), /espacio/);
});
test("RepeaterBook normalization reports unsupported, invalid and duplicate entries instead of silently accepting", () => {
  const result = R.normalizeRepeaters({ results: [repeater(), repeater(), repeater({ Frequency: "1296.0" }),
    repeater({ "Input Freq": "" }), repeater({ "Operational Status": "Off-air" }), repeater({ "FM Analog": "No" })] }, "FM");
  assert.equal(result.entries.length, 1); assert.equal(result.rejected.length, 5);
  assert.equal(result.entries[0].rxOnly, true);
  assert.equal(result.entries[0].tone, "88.5");
  assert.throws(() => R.normalizeRepeaters([], "FM"));
  assert.equal(R.normalizeRepeaters({ results: [repeater({ DMR: "Yes", "DMR Color Code": "15" })] }, "DMR").entries[0].colorCode, 15);
  assert.equal(R.normalizeRepeaters({ results: [repeater({ DMR: "Yes" })] }, "DMR").rejected.length, 1);
});
test("geographic/text/band filters normalize accents and CHIRP CSV is FM RX-only and formula-safe", () => {
  const entries = R.normalizeRepeaters({ results: [repeater({ State: "Málaga" }), repeater({ Callsign: "UHF", Frequency: "438.5", "Input Freq": "430.9" })] }, "FM").entries;
  assert.equal(R.filterRecords(entries, { country: "Spain", region: "malaga", band: "vhf" }).length, 1);
  assert.equal(R.filterRecords(entries, { query: "uhf", band: "uhf" }).length, 1);
  const csv = R.channelCSV(entries);
  assert.match(csv, /"off","0.000000"/);
  assert.match(csv, /RX ONLY/);
  assert.equal(csv.split("\r\n").length, 4);
  assert.equal(R.csvCell('=CMD("x")'), '"\'=CMD(""x"")"');
  assert.throws(() => R.channelCSV([{ ...entries[0], mode: 1 }]), /DMR/);
});
test("OpenGD77 CPS Channels.csv imports analog FM only and reports digital and invalid-band exclusions", () => {
  const csv = "\uFEFFChannel Number,Channel Name,Channel Type,Rx Frequency,Tx Frequency,Bandwidth (kHz),Colour Code,Timeslot,Contact,TG List,RX Tone,TX Tone\r\n" +
    '1,"EA5, TEST",Analogue,\t145.60000,\t145.00000,12.5,,,,,88.5,88.5\r\n' +
    "2,DMR-TEST,Digital,438.50000,430.90000,12.5,1,2,None,TODOS-TG,,\r\n" +
    "3,OUTSIDE,Analogue,50.53000,50.53000,,,,,,,\r\n" +
    '4,"EA5, TEST",Analogue,145.60000,145.00000,,,,,,,\r\n';
  const result = R.parseChannelCSV(csv);
  assert.equal(result.format, "OpenGD77 CPS");
  assert.equal(result.channels.length, 1);
  assert.equal(result.channels[0].name, "EA5, TEST");
  assert.equal(result.channels[0].rx, "145.60000");
  assert.equal(result.channels[0].tx, "145.00000");
  assert.equal(result.channels[0].mode, 0);
  assert.equal(result.channels[0].rxOnly, true);
  assert.match(result.channels[0].notes, /RX=88\.5/);
  assert.equal(result.rejected.length, 3);
  assert.match(result.rejected[0].reason, /DMR omitido/);
  assert.match(result.rejected[1].reason, /VHF 136-174/);
  assert.match(result.rejected[2].reason, /duplicado/);
  const appended = R.appendChannels(blankCodeplug(), result.channels, 1);
  const stored = R.readChannels(appended.image).find(channel => channel.name === "EA5, TEST");
  assert.ok(stored);
  assert.equal(stored.rx, "145.60000");
  assert.equal(stored.tx, "145.00000");
  assert.equal(stored.mode, 0);
  assert.equal(stored.rxOnly, true);
  assert.throws(() => R.parseChannelCSV("Channel Mode,Channel Name,RX Frequency(MHz),TX Frequency(MHz)\n0,X,145.6,145.0"),
    /no reconocido/);
});
test("CSV acepta ceros decimales finales sin redondear frecuencias u offsets", () => {
  const result = R.parseChannelCSV("Name,Frequency,Duplex,Offset,Mode\nVALID,145.600000,-,0.600000,FM\nPMR,446.006250,off,0,NFM\nBAD-RX,145.600001,off,0,FM\nBAD-OFFSET,145.600000,-,0.600001,FM");
  assert.deepEqual(result.channels.map(channel => [channel.rx, channel.tx]), [
    ["145.60000", "145.00000"], ["446.00625", "446.00625"]
  ]);
  assert.equal(result.rejected.length, 2);
  assert.match(result.rejected[0].reason, /frecuencia MHz invalida/);
  assert.match(result.rejected[1].reason, /Offset CHIRP invalido/);
});
test("CHIRP CSV resolves duplex safely, excludes unsupported modes and handles quoted commas", () => {
  const csv = 'Location,Name,Frequency,Duplex,Offset,Tone,Mode,Comment\r\n' +
    '1,"TOWER, NORTH",145.60000,-,0.600,88.5,FM,"source, local"\r\n' +
    "2,UPLINK,433.50000,+,1.600,,NFM,\r\n" +
    "3,SPLIT,145.60000,split,145.00000,,FM,\r\n" +
    "4,SIMPLEX,446.00625,off,0.00000,,FM,\r\n" +
    "5,DIGITAL,438.50000,off,0.00000,,DV,\r\n" +
    "6,BAD-OFFSET,145.60000,-,bad,,FM,\r\n";
  const result = R.parseChannelCSV(csv);
  assert.equal(result.format, "CHIRP");
  assert.deepEqual(result.channels.map(channel => [channel.name, channel.rx, channel.tx]), [
    ["TOWER, NORTH", "145.60000", "145.00000"],
    ["UPLINK", "433.50000", "435.10000"],
    ["SPLIT", "145.60000", "145.00000"],
    ["SIMPLEX", "446.00625", "446.00625"]
  ]);
  assert.ok(result.channels.every(channel => channel.mode === 0 && channel.rxOnly));
  assert.equal(result.rejected.length, 2);
  assert.match(result.rejected[0].reason, /solo FM\/NFM/);
  assert.match(result.rejected[1].reason, /Offset CHIRP/);
  assert.throws(() => R.parseChannelCSV('Name,Frequency,Duplex,Offset,Mode\n"unterminated,145.6,off,0,FM'), /comillas sin cerrar/);
});
test("TLE checksums, satellite identity and age are validated without stale fallback", () => {
  assert.ok(R.validateTLE(orbital, start).record);
  assert.throws(() => R.validateTLE({ ...orbital, tle1: orbital.tle1.slice(0, -1) + "0" }, start), /Checksum/);
  assert.throws(() => R.validateTLE({ ...orbital, norad: 1 }, start), /NORAD/);
  assert.throws(() => R.validateTLE(orbital, start + 8 * 86400000), /caducado/);
  assert.throws(() => R.validateTLE(orbital, start - 3 * 86400000), /futura/);
});
test("SGP4 dependency matches independent Vallado verification vector at epoch", () => {
  const record = S.twoline2satrec(
    "1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753",
    "2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667");
  const state = S.sgp4(record, 0);
  for (const [axis, expected] of Object.entries({ x: 7022.46529266, y: -1400.08296755, z: 0.03995155 })) {
    assert.ok(Math.abs(state.position[axis] - expected) < 0.001, axis);
  }
});
test("passes meet actual elevation threshold, UTC window and crossing accuracy for specified observer", () => {
  const result = R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 });
  assert.ok(result.passes.length >= 2);
  const record = S.twoline2satrec(orbital.tle1, orbital.tle2);
  const location = { latitude: observer.latitude * Math.PI / 180, longitude: observer.longitude * Math.PI / 180, height: observer.height };
  for (const pass of result.passes) {
    assert.ok(pass.aos.time < pass.maximum.time && pass.maximum.time < pass.los.time);
    assert.ok(pass.maximum.elevation >= 10 && pass.maximum.elevation <= 90);
    assert.ok(pass.aos.time >= start && pass.los.time <= start + 86400000);
    for (const crossing of [pass.aos, pass.los]) {
      if (pass.partialStart || pass.partialEnd) continue;
      const date = new Date(crossing.time);
      const state = S.propagate(record, date);
      const look = S.ecfToLookAngles(location, S.eciToEcf(state.position, S.gstime(date)));
      assert.ok(Math.abs(look.elevation * 180 / Math.PI - 10) < 0.1);
    }
  }
  assert.equal(result.observer.longitude, observer.longitude);
  assert.equal(result.sampleSeconds, 5);
});
test("pass validation rejects missing/out-of-range position, excessive window, invalid elevation and stale end", () => {
  for (const position of [{ ...observer, latitude: 91 }, { ...observer, longitude: NaN }, { ...observer, height: 10 }]) {
    assert.throws(() => R.predictPasses(orbital, position, { start }));
  }
  for (const options of [{ hours: 49 }, { hours: 0 }, { minimum: 61 }, { minimum: NaN }]) {
    assert.throws(() => R.predictPasses(orbital, observer, { start, ...options }));
  }
  assert.throws(() => R.predictPasses(orbital, observer, { start: start + 6 * 86400000, hours: 48 }), /validez/);
});
test("SAT channels only support narrow/punctual FM and start RX-only without fabricated uplink", () => {
  const tx = { id: "test", mode: "FM", downlink: 145800000, uplink: 144490000, source: "https://db.satnogs.org" };
  const entry = R.satelliteChannel(orbital, tx);
  assert.equal(entry.rx, "145.80000"); assert.equal(entry.tx, entry.rx); assert.equal(entry.rxOnly, true);
  for (const patch of [{ mode: "AFSK" }, { mode: "USB" }, { downlinkHigh: 145900000 }, { downlink: 2400000000 }, { downlink: null }]) {
    assert.throws(() => R.satelliteChannel(orbital, { ...tx, ...patch }));
  }
});
test("Doppler channels split a pass into RX-only windows that follow the range rate", () => {
  const tx = { id: "test", mode: "FM", downlink: 437800000, source: "https://db.satnogs.org" };
  const pass = R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 }).passes.find(item => !item.partialStart && !item.partialEnd);
  const channels = R.dopplerChannels(orbital, tx, pass, observer, 5);
  const prepared = R.appendQuanshengChannels(quanshengConfig(), channels, 1);
  const memories = R.readQuanshengChannels(prepared.image).slice(1);
  assert.equal(memories.length, 5);
  assert.deepEqual(memories.map(memory => memory.rx), channels.map(channel => channel.rx));
  assert.ok(memories.every(memory => memory.rxOnly && memory.rx === memory.tx));
  assert.equal(channels.length, 5);
  const shifts = channels.map(channel => Math.round(Number(channel.rx) * 1e6) - tx.downlink);
  // Approaching at AOS (received above nominal), receding at LOS; ISS at 437.8 MHz stays within about +/-10 kHz.
  assert.ok(shifts[0] > 3000 && shifts[4] < -3000, shifts.join());
  for (let index = 1; index < shifts.length; index++) assert.ok(shifts[index] < shifts[index - 1], "monotonic");
  assert.ok(shifts.every(shift => Math.abs(shift) < 11000));
  // Cross-check every window against a finer (0.1 s) range difference computed directly with satellite.js:
  // the memory stays within its declared error, which is half of an equal frequency step.
  const record = S.twoline2satrec(orbital.tle1, orbital.tle2);
  const range = time => S.ecfToLookAngles({ latitude: observer.latitude * Math.PI / 180, longitude: observer.longitude * Math.PI / 180, height: observer.height },
    S.eciToEcf(S.propagate(record, new Date(time)).position, S.gstime(new Date(time)))).rangeSat;
  const received = time => tx.downlink * (1 - (range(time + 50) - range(time - 50)) / 0.1 / 299792.458);
  const step = received(pass.aos.time) - received(pass.los.time);
  assert.equal(channels[0].from, pass.aos.time); assert.equal(channels[4].to, pass.los.time);
  for (let index = 0; index < channels.length; index++) {
    const channel = channels[index];
    if (index) assert.equal(channel.from, channels[index - 1].to);
    assert.ok(Math.abs(channel.errorHz - step / 10) < 30, `${channel.errorHz} vs ${step / 10}`);
    const tunedHz = Number(channel.rx) * 1e6;
    const endpointErrors = [channel.from, channel.to].map(time =>
      Math.abs(tx.downlink * (1 - (range(time + 500) - range(time - 500)) / 299792.458) - tunedHz));
    assert.equal(channel.errorHz, Math.ceil(Math.max(...endpointErrors)));
    for (let time = channel.from; time <= channel.to; time += 2000) {
      assert.ok(Math.abs(received(time) - Number(channel.rx) * 1e6) <= channel.errorHz + 30);
    }
  }
  for (const channel of channels) {
    assert.equal(channel.rxOnly, true); assert.equal(channel.tx, channel.rx);
    assert.ok(channel.name.length <= 10 && channel.errorHz > 0);
  }
  assert.equal(new Set(channels.map(channel => channel.key)).size, 5);
  assert.match(R.channelCSV(channels), /Doppler \d{2}:\d{2}:\d{2}-\d{2}:\d{2}:\d{2} UTC/);
  for (const segments of [0, 11, 2.5]) assert.throws(() => R.dopplerChannels(orbital, tx, pass, observer, segments));
  assert.throws(() => R.dopplerChannels(orbital, { ...tx, mode: "USB" }, pass, observer));
});
test("RadioID query uses fixed HTTPS origin, escaped country/region and explicit pagination with minimized records", async () => {
  let requested;
  const service = new DataService(async url => {
    requested = url;
    return new Response(JSON.stringify({ count: 201, pages: 2, page: 2, results: [{ radio_id: 2140001, callsign: "EA4TEST", country: "Spain",
      state: "Madrid", city: "Madrid", fname: "Test", has_valid_email: true, lastheard: "private metadata not needed" }] }));
  });
  const result = await service.contacts({ country: "Spain", region: "Madrid", page: "2" });
  assert.equal(new URL(requested).searchParams.get("state"), "Madrid");
  assert.equal(new URL(requested).origin, "https://radioid.net");
  assert.equal(result.entries.length, 1); assert.equal(result.page, 2);
  assert.equal(result.entries[0].lastheard, undefined); assert.equal(result.entries[0].has_valid_email, undefined);
  for (const params of [{ country: "", page: "1" }, { country: "Spain", page: "0" }, { country: "Spain", page: "1e2" }, { country: "\nsecret" }]) {
    await assert.rejects(service.contacts(params));
  }
});
test("malformed/pagination-mismatched RadioID results fail explicitly", async () => {
  for (const data of [{ results: [] }, { count: 1, pages: 1, page: 2, results: [] },
    { count: 1, pages: 1, page: 1, results: [{ id: 99999999, callsign: "BAD" }] }]) {
    await assert.rejects(new DataService(async () => new Response(JSON.stringify(data))).contacts({ country: "Spain" }));
  }
});
const env = { RB_APPROVED: "yes", RB_USER_TOKEN: "rbuapp_unit_test_only", RB_APPROVED_USER_AGENT: "RadioWorkspace/0.2 (test@example.invalid)" };
test("RepeaterBook requires app approval and individual token before any outbound request", async () => {
  let calls = 0;
  for (const config of [{}, { ...env, RB_APPROVED: "no" }, { ...env, RB_USER_TOKEN: "app_not_for_distributed_clients" }]) {
    const service = new DataService(async () => { calls++; }, config);
    await assert.rejects(service.repeaters({ country: "Spain" }), /aprobacion/);
    assert.equal(service.status().repeaterbookConfigured, false);
  }
  assert.equal(calls, 0);
});
test("RepeaterBook headers remain server-only, region endpoints are scoped and 429 stops retries", async () => {
  const requests = [];
  let now = 1000;
  const service = new DataService(async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ results: [repeater()] }));
  }, env, () => now);
  const result = await service.repeaters({ country: "Spain", region: "Madrid", mode: "FM" });
  assert.match(requests[0].url, /exportROW\.php/);
  assert.equal(requests[0].options.headers["X-RB-App-Token"], env.RB_USER_TOKEN);
  assert.equal(requests[0].url.includes(env.RB_USER_TOKEN), false);
  assert.equal(JSON.stringify(result).includes(env.RB_USER_TOKEN), false);
  await service.repeaters({ country: "United States", stateId: "51", mode: "DMR" });
  assert.match(requests[1].url, /export\.php/);
  await assert.rejects(service.repeaters({ country: "United States" }), /ID estatal/);
  let calls = 0;
  const limited = new DataService(async () => { calls++; return new Response(null, { status: 429 }); }, env, () => now);
  await assert.rejects(limited.repeaters({ country: "Spain" }), /HTTP 429/);
  await assert.rejects(limited.repeaters({ country: "Spain" }), /15 minutos/);
  assert.equal(calls, 1);
  now += 900001;
  await assert.rejects(limited.repeaters({ country: "Spain" }), /HTTP 429/);
  assert.equal(calls, 2);
});
test("provider fetches enforce byte limits, no redirects, HTTPS, bounded concurrency and sanitized network errors", async () => {
  const url = "https://radioid.net/api/dmr/user/";
  for (const response of [new Response("abcd"), new Response("a", { headers: { "content-length": "100" } })]) {
    await assert.rejects(new DataService(async () => response).get(url, 3), /grande/);
  }
  await assert.rejects(new DataService(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1" } })).get(url), /HTTP 302/);
  await assert.rejects(new DataService().get("http://radioid.net/api"), /autorizado/);
  await assert.rejects(new DataService().get("https://evil.test/api"), /autorizado/);
  const service = new DataService(async () => { throw new Error(`credential=${env.RB_USER_TOKEN}`); }, env);
  await assert.rejects(service.get(url), error => !error.message.includes(env.RB_USER_TOKEN) && /red/.test(error.message));
  assert.equal(service.active, 0);
  service.active = 4;
  await assert.rejects(service.get(url), error => error.status === 429);
});
test("satellite API keeps requested NORAD and separates orbital data from transmitter failures", async () => {
  const urls = [];
  const service = new DataService(async url => {
    urls.push(url);
    return new Response(JSON.stringify([{ norad_cat_id: 25544, tle0: "0 ISS", tle1: orbital.tle1, tle2: orbital.tle2 }]));
  });
  assert.equal((await service.satellite({ norad: "25544", provider: "satnogs" })).name, "ISS");
  assert.equal(new URL(urls[0]).searchParams.get("norad_cat_id"), "25544");
  await assert.rejects(service.satellite({ norad: "1", provider: "satnogs" }), /TLE/);
  await assert.rejects(service.satellite({ norad: "25544", provider: "untrusted" }), /Proveedor/);
  const direct = new DataService(async () => new Response(`ISS\n${orbital.tle1}\n${orbital.tle2}\n`));
  assert.equal((await direct.satellite({ norad: "25544", provider: "celestrak" })).norad, 25544);
});
test("transmitters filter other satellites, inactive, unconfirmed and frequency violations", async () => {
  const item = { norad_cat_id: 25544, uuid: "test", alive: true, status: "active", description: "FM voice", mode: "FM", downlink_low: 145800000 };
  const service = new DataService(async () => new Response(JSON.stringify([item, { ...item, norad_cat_id: 1 },
    { ...item, alive: false }, { ...item, unconfirmed: true }, { ...item, frequency_violation: true }, { ...item, status: "inactive" }])));
  const result = await service.transmitters({ norad: "25544" });
  assert.equal(result.entries.length, 1); assert.equal(result.entries[0].downlink, 145800000);
});
test("provider API does not accept arbitrary URLs, secrets, duplicate params or location; dependency serves only fixed bundle", async t => {
  const service = new DataService(async () => new Response(JSON.stringify({ count: 0, page: 1, pages: 0, results: [] })), {});
  const server = createServer(undefined, service);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ["/api/data/contacts?country=Spain&country=France", "/api/data/satellite?url=https://evil.test",
    "/api/data/contacts?country=Spain&latitude=40", "/api/data/status?token=secret", "/api/data/unknown"]) {
    assert.equal((await fetch(base + path)).status, 400);
  }
  const status = await (await fetch(`${base}/api/data/status`)).json();
  assert.equal(status.repeaterbookConfigured, false);
  assert.equal((await fetch(`${base}/api/data/repeaters?country=Spain`)).status, 503);
  assert.equal((await fetch(`${base}/api/data/contacts?country=Spain`)).status, 200);
  const script = await fetch(`${base}/satellite.min.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.match(script.headers.get("permissions-policy"), /geolocation=\(self\)/);
  for (const path of ["/data-service.cjs", "/node_modules/satellite.js/package.json", "/.env", "/package-lock.json"]) {
    assert.equal((await fetch(base + path)).status, 404);
  }
});

function referenceRecord(name, line1, line2, rx) {
  // Independent transcription of the OpenGD77 CPS buildSatelliteRecords layout.
  const LUT = "0123456789. +-*";
  const pack = text => { const out = []; for (let i = 0; i < text.length; i += 2) out.push(LUT.indexOf(text[i]) << 4 | LUT.indexOf(text[i + 1])); return out; };
  const record = new Uint8Array(100);
  for (let j = 0; j < name.length; j++) record[j] = name.charCodeAt(j);
  record.set(pack(line1.substring(18, 20) + line1.substring(20, 32) + line1.substring(33, 43)), 8);
  record.set(pack(line2.substring(8, 16) + line2.substring(17, 25) + line2.substring(26, 33) + line2.substring(34, 42) +
    line2.substring(43, 51) + line2.substring(52, 63) + line2.substring(63, 68) + " "), 20);
  const hz = Math.round(rx * 1e6);
  record.set([hz & 255, hz >>> 8 & 255, hz >>> 16 & 255, hz >>> 24 & 255], 48);
  return record;
}
const satellite = { name: "ISS", tle1: orbital.tle1, tle2: orbital.tle2, rx: 145.8 };
test("OpenGD77 SAT list initialises erased custom data with byte-exact type-3 block and RX-only records", () => {
  const original = blankCodeplug();
  const snapshot = original.slice();
  assert.deepEqual(R.readSatellites(original), []);
  const result = R.writeSatellites(original, [satellite]);
  assert.deepEqual(original, snapshot);
  assert.equal(result.added, 1); assert.equal(result.total, 1);
  const base = 0x1ee60;
  assert.equal(new TextDecoder().decode(result.image.subarray(base, base + 8)), "OpenGD77");
  assert.deepEqual([...result.image.subarray(base + 8, base + 20)], [0, 0, 0, 0, 3, 0, 0, 0, 2520 & 255, 2520 >> 8, 0, 0]);
  assert.deepEqual(result.image.subarray(base + 20, base + 120), referenceRecord("ISS", orbital.tle1, orbital.tle2, 145.8));
  assert.ok(result.image.subarray(base + 20 + 2520, base + 0x11a0).every(byte => byte === 255));
  assert.deepEqual(result.image.subarray(0, base), original.subarray(0, base));
  const [decoded] = R.readSatellites(result.image);
  assert.equal(decoded.name, "ISS"); assert.equal(decoded.rx1, 145.8); assert.equal(decoded.tx1, 0); assert.equal(decoded.txCtcss, 0);
  assert.equal(decoded.tleFields.line1, "26291.78980200 .00007771");
  assert.equal(decoded.tleFields.line2, " 51.6325 48.43390006764280.4294 79.593215.4892944259091 ");
});
test("OpenGD77 SAT list preserves other custom blocks and existing satellites, sorts and replaces by name", () => {
  const image = blankCodeplug();
  const base = 0x1ee60;
  image.set(new TextEncoder().encode("OpenGD77"), base); image.fill(0, base + 8, base + 12);
  image.set([1, 0, 0, 0, 16, 0, 0, 0], base + 12); image.fill(0xaa, base + 20, base + 36);
  const first = R.writeSatellites(image, [{ ...satellite, name: "ZZ-SAT" }]);
  assert.deepEqual(first.image.subarray(base + 12, base + 36), image.subarray(base + 12, base + 36));
  const second = R.writeSatellites(first.image, [satellite, { ...satellite, name: "ZZ-SAT", rx: 436.795 }]);
  assert.equal(second.added, 1); assert.equal(second.replaced, 1);
  assert.deepEqual(R.readSatellites(second.image).map(sat => [sat.name, sat.rx1]), [["ISS", 145.8], ["ZZ-SAT", 436.795]]);
  assert.deepEqual(second.image.subarray(base + 12, base + 36), image.subarray(base + 12, base + 36));
});
test("OpenGD77 SAT list rejects corrupt/unknown regions, invalid TLE, out-of-band frequency and >25 satellites atomically", () => {
  const unknown = blankCodeplug(); unknown[0x1ee60 + 100] = 1;
  assert.throws(() => R.writeSatellites(unknown, [satellite]), /no vacia/);
  const corrupt = blankCodeplug();
  corrupt.set(new TextEncoder().encode("OpenGD77"), 0x1ee60); corrupt.fill(0, 0x1ee68, 0x1ee6c);
  corrupt.set([1, 0, 0, 0, 0xff, 0xff, 0, 0], 0x1ee6c);
  assert.throws(() => R.writeSatellites(corrupt, [satellite]), /corrupta/);
  const image = blankCodeplug();
  const snapshot = image.slice();
  assert.throws(() => R.writeSatellites(image, [{ ...satellite, tle1: orbital.tle1.slice(0, -1) + "0" }]), /TLE/);
  assert.throws(() => R.writeSatellites(image, [{ ...satellite, rx: 2400 }]), /VHF/);
  assert.throws(() => R.writeSatellites(image, Array.from({ length: 26 }, (_, i) => ({ ...satellite, name: `S${i}` }))), /25/);
  let full = R.writeSatellites(image, Array.from({ length: 25 }, (_, i) => ({ ...satellite, name: `S${i}` }))).image;
  assert.throws(() => R.writeSatellites(full, [{ ...satellite, name: "EXTRA" }]), /25/);
  assert.deepEqual(image, snapshot);
});
