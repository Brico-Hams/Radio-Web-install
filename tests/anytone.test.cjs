"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../anytone-core.js");
const channel = (overrides = {}) => ({ name: "EA1TEST", rx: "438.50000", tx: "430.90000",
  mode: "DMR", colorCode: 1, timeslot: 2, talkgroup: 214, source: "Datos de prueba", ...overrides });
test("AnyTone reutiliza PMR y fuerza solo RX sin cambiar la base", () => {
  const base = R.pmrChannels();
  const result = R.mergeAnytoneChannels([], base);
  assert.equal(result.channels.length, 16);
  assert.equal(result.channels[0].rx, "446.00625");
  assert.equal(result.channels.at(-1).rx, "446.19375");
  assert.ok(result.channels.every(c => c.mode === "FM" && c.rxOnly));
  assert.ok(result.channels.every(c => c.bandwidth === "12.5"));
  assert.equal(R.validateAnytoneChannel(channel({ rxOnly: false })).rxOnly, true);
  assert.equal(base[0].mode, 0);
});
test("AnyTone conserva CC/TS/TG y no confunde el modo numerico DMR con AM", () => {
  const result = R.validateAnytoneChannel(channel({ mode: 1 }));
  assert.equal(result.mode, "DMR");
  assert.equal(result.tx, "430.90000");
  assert.equal(result.timeslot, 2);
  assert.equal(result.talkgroup, 214);
  assert.throws(() => R.validateAnytoneChannel(channel({ colorCode: 16 })), /Color Code/);
  assert.throws(() => R.validateAnytoneChannel(channel({ timeslot: 0 })), /Time Slot/);
  assert.throws(() => R.validateAnytoneChannel(channel({ talkgroup: 16777216 })), /TG/);
});
test("AnyTone AM exige capacidad confirmada y nunca permite TX", () => {
  const air = channel({ mode: "AM", rx: "123.450", tx: "145.5" });
  assert.throws(() => R.validateAnytoneChannel(air), /AM aerea/);
  const result = R.validateAnytoneChannel(air, true);
  assert.equal(result.rx, "123.45000"); assert.equal(result.tx, result.rx);
  assert.equal(result.rxOnly, true);
  assert.throws(() => R.validateAnytoneChannel({ ...air, rxOnly: false }, true), /solo recepcion/);
  assert.throws(() => R.validateAnytoneChannel({ ...air, rx: "137" }, true), /Banda/);
  assert.throws(() => R.validateAnytoneChannel({ ...air, rx: "118.005" }, true), /designador/);
  assert.equal(R.validateAnytoneChannel({ ...air, rx: "118.00833" }, true).rx, "118.00833");
});
test("AnyTone limita FM comercial a recepcion y exige confirmar cobertura", () => {
  const commercial = { name: "FMLOCAL", rx: "99.500", tx: "105.500", mode: "FM",
    broadcastOnly: true, rxOnly: true, source: "Catalogo local autorizado" };
  assert.throws(() => R.validateAnytoneChannel(commercial), /capacidad confirmada/);
  const checked = R.validateAnytoneChannel(commercial, false, true);
  assert.equal(checked.rx, "99.50000");
  assert.equal(checked.tx, checked.rx);
  assert.equal(checked.broadcastOnly, true);
  assert.throws(() => R.validateAnytoneChannel({ ...commercial, rxOnly: false }, false, true), /solo recepcion/);
  assert.throws(() => R.validateAnytoneChannel({ ...commercial, rx: "108.1" }, false, true), /Banda/);
  assert.throws(() => R.readAnytoneProject({ format: "bricohams-anytone-project", version: 1,
    profile: "D878", airband: false, fmBroadcast: true, channels: [] }), /capacidades confirmadas/);
});
test("AnyTone filtra localmente aeropuertos y FM comercial con radio y coordendas", () => {
  const place = { latitude: 38, longitude: -1 };
  const airport = R.anytoneNearbyAirportChannels({ results: [
    { name: "TWR-LOCAL", frequencyMHz: "118.00833", latitude: 38, longitude: -1,
      airport: "LEMI", source: "ENAIRE AIP AD 2 LEMI, vigente" },
    { name: "TWR-LEJOS", frequencyMHz: "118.00833", latitude: 40, longitude: -1,
      source: "ENAIRE AIP vigente" },
    { name: "SIN-COORD", frequencyMHz: "118.00833", source: "ENAIRE AIP vigente" }
  ] }, place, 10);
  assert.equal(airport.channels.length, 1);
  assert.equal(airport.channels[0].mode, "AM");
  assert.equal(airport.channels[0].rxOnly, true);
  assert.equal(airport.omitted, 2);
  const fm = R.anytoneNearbyFMChannels({ results: [
    { name: "FM LOCAL", frequencyMHz: "99.5", latitude: 38.02, longitude: -1,
      source: "Listado local con licencia", region: "Murcia" },
    { name: "FM LEJANA", frequencyMHz: "101.2", latitude: 41, longitude: -1, source: "Catalogo" }
  ] }, place, 10);
  assert.equal(fm.channels.length, 1);
  assert.equal(fm.channels[0].broadcastOnly, true);
  assert.equal(fm.channels[0].tx, fm.channels[0].rx);
  assert.equal(fm.omitted, 1);
  assert.throws(() => R.anytoneNearbyFMChannels({ results: [{ name: "X", frequencyMHz: "99.5",
    latitude: 38, longitude: -1, source: "" }] }, place, 10), /procedencia/);
  assert.throws(() => R.anytoneNearbyAirportChannels({ results: [{ name: "X", frequencyMHz: "118.00833",
    latitude: 38, longitude: -1, source: "Manual antiguo" }] }, place, 10), /AIP vigente/);
});
test("AnyTone guardia aeronautica requiere recepcion AM confirmada", () => {
  const channel = R.anytoneAirbandGuardChannel();
  assert.equal(channel.rx, "121.50000");
  assert.equal(channel.tx, channel.rx);
  assert.equal(channel.mode, "AM");
  assert.equal(channel.rxOnly, true);
  assert.throws(() => R.mergeAnytoneChannels([], [channel]), /AM aerea/);
  assert.equal(R.mergeAnytoneChannels([], [channel], true).channels.length, 1);
});
test("AnyTone importaciones atomicas, deduplicadas y limitadas", () => {
  const original = [channel()];
  assert.equal(R.mergeAnytoneChannels(original, [channel()]).duplicates, 1);
  assert.throws(() => R.mergeAnytoneChannels(original, [channel({ name: "VALID" }), channel({ rx: "999" })]), /Banda/);
  assert.equal(original.length, 1);
  assert.throws(() => R.mergeAnytoneChannels([], Array.from({ length: 4001 }, (_, i) => channel({ name: `CH${i}` }))), /4000/);
  assert.throws(() => R.validateAnytoneChannel(channel({ name: undefined })), /nombre/);
  assert.throws(() => R.validateAnytoneChannel(channel({ source: "" })), /procedencia/);
});
test("AnyTone roundtrip valida formato y rechaza AM en perfiles no confirmados", () => {
  const data = { format: "bricohams-anytone-project", version: 1, profile: "D878", airband: false, channels: [channel()] };
  assert.deepEqual(R.readAnytoneProject(JSON.parse(JSON.stringify(data))).channels, [R.validateAnytoneChannel(channel())]);
  assert.throws(() => R.readAnytoneProject({ ...data, version: 2 }), /no reconocido/);
  assert.throws(() => R.readAnytoneProject({ ...data, airband: true }), /AM requiere/);
  assert.match(R.anytoneProjectCSV(data), /"RX_Only"/);
  assert.match(R.anytoneProjectCSV(data), /"Yes"/);
  const csv = R.anytoneProjectCSV({ ...data, channels: [channel({ name: "=test", notes: "=cmd" })] });
  assert.match(csv, /"'=test"/);
  assert.match(csv, /"'=cmd"/);
});
test("AnyTone se incluye en sitio e instaladores sin habilitar protocolos USB inventados", () => {
  const { ALLOWED_FILES } = require("../server.cjs");
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  for (const file of ["anytone.html", "anytone-core.js", "anytone-ui.js", "ayuda-anytone.html"]) {
    assert.ok(ALLOWED_FILES.includes(file));
    assert.ok(read("scripts/build-installers.sh").includes(file));
  }
  assert.match(read("app.js"), /nav\("anytone"/);
  assert.match(read("anytone.html"), /NO son un archivo RDT/);
  assert.match(read("anytone.html"), /ayuda-anytone\.html/);
  assert.match(read("docs/AYUDA-ANYTONE.md"), /enviar coordenadas a un servicio/);
  assert.doesNotMatch(read("anytone-ui.js"), /requestPort|requestDevice/);
});
test("RadioID Espana valida offset, CC y TS/TG publicados sin inventar asignaciones", () => {
  const row = { id: 214001, callsign: "EDTEST", country: "Spain", status: "ACTIVE",
    frequency: "438.50000", offset: "-7.6", color_code: 1, ts_linked: "TS1 TS2", talkgroups: [] };
  const result = R.anytoneRadioIDRepeaters({ rptrs: [row, { ...row, country: "France" }, { ...row, offset: "" }] });
  assert.equal(result.channels.length, 2);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.channels[0].tx, "430.90000");
  assert.ok(result.channels.every(c => c.talkgroup === 0 && c.rxOnly));
  const groups = R.anytoneRadioIDRepeaters({ rptrs: [{ ...row, talkgroups: [{ timeslot: 2, talkgroup: 214 }] }] });
  assert.equal(groups.channels.length, 1);
  assert.equal(groups.channels[0].talkgroup, 214);
  assert.equal(groups.channels[0].timeslot, 2);
  assert.equal(R.anytoneRadioIDRepeaters({ rptrs: [{ ...row, color_code: null }] }).rejected.length, 1);
  assert.equal(R.anytoneRadioIDRepeaters({ rptrs: [{ ...row, talkgroups: [{ timeslot: 3, talkgroup: 214 }] }] }).channels.length, 0);
});
test("URE solo convierte repetidores FM con unidades explicitas y conserva el tono como nota", () => {
  const row = { id: 1, name: "EDTEST", freq: "145.725 MHz", shift: "-600 kHz", mode: "FM", subtono: "77.0 Hz" };
  const data = { success: true, is_baliza: false, key: "repe144", items: [row, { ...row, mode: "DMR" }, { ...row, shift: "" }] };
  const result = R.anytoneURERepeaters(data);
  assert.equal(result.channels.length, 1);
  assert.equal(result.channels[0].tx, "145.12500");
  assert.match(result.channels[0].notes, /77.0 Hz/);
  assert.equal(result.rejected.length, 2);
  assert.throws(() => R.anytoneURERepeaters({ ...data, is_baliza: true }), /no reconocido/);
});
