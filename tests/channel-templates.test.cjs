"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");
require("../quansheng-channels.js");
const { buildTemplates, geometryContains } = require("../scripts/fetch-channel-templates.cjs");
const { buildForecast, referenceZones } = require("../scripts/fetch-template-passes.cjs");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const json = name => JSON.parse(read(`data/channel-templates/${name}.json`));
const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
const features = R.TEMPLATE_COUNTRIES.map((country, index) => ({
  properties: { iso_a2: country.code, iso_3166_2: `${country.code}-ONE`, name: "Test", latitude: 0.5, longitude: index * 2 + 0.5 },
  geometry: { type: "Polygon", coordinates: [ring.map(([x, y]) => [x + index * 2, y])] }
}));
const row = { id: 1, mode: "FM", operational: 1, callsign: "EA5TEST", frequency: 145600000, offset: -600000,
  latitude: 0.5, longitude: 0.5, city: "<script>not executable</script>", encode: "88.5" };

test("country assignment uses geometry, islands and holes rather than overlapping country boxes", () => {
  const polygon = { type: "Polygon", coordinates: [ring, [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]] };
  assert(geometryContains([0.1, 0.1], polygon));
  assert(!geometryContains([0.5, 0.5], polygon));
  assert(!geometryContains([1.5, 0.5], polygon));
  assert(geometryContains([0.1, 0.1], { type: "MultiPolygon", coordinates: [polygon.coordinates] }));
});
test("country ingestion preserves offsets as nominal RX-only information and excludes invalid or digital rows", () => {
  const output = buildTemplates([row, { ...row, id: 2, mode: "DMR" }, { ...row, id: 3, operational: 0 },
    { ...row, id: 4, frequency: 900000000 }, { ...row, id: 5, latitude: NaN }, row,
    { ...row, id: 6, frequency: 145600001 }, { ...row, id: 7, offset: -600001 },
    { ...row, id: 8, offset: 290000000 }], features, 0);
  assert.equal(output.length, 7);
  const spain = output.find(file => file.country === "ES");
  assert.equal(spain.channels.length, 1);
  assert.equal(spain.rejected, 5);
  assert.equal(spain.channels[0].rx, "145.60000");
  assert.equal(spain.channels[0].tx, "145.00000");
  assert.equal(spain.channels[0].rxOnly, true);
  assert.equal(spain.channels[0].regionId, "ES-ONE");
  assert.equal(output.find(file => file.country === "US").channels.length, 0);
});
test("template validation rejects enabled TX, wrong country, unknown region, duplicate keys and invalid frequencies", () => {
  const file = buildTemplates([row], features)[0];
  for (const changes of [{ rxOnly: false }, { mode: 1 }, { country: "US" }, { regionId: "ES-UNKNOWN" }, { rx: "900" }, { tx: "435.00000" }]) {
    assert.throws(() => R.validateCountryTemplate({ ...file, channels: [{ ...file.channels[0], ...changes }] }, "ES"));
  }
  assert.throws(() => R.validateCountryTemplate({ ...file, channels: [...file.channels, ...file.channels] }, "ES"));
  assert.throws(() => R.validateCountryTemplate(file, "GB"));
});
test("regional preview, search and optional PMR do not select the whole country implicitly or allow US PMR", () => {
  const file = buildTemplates([row], features)[0];
  assert.equal(R.countryTemplateChannels(file, { region: "ES-ONE", query: "ea5test" }).length, 1);
  assert.equal(R.countryTemplateChannels(file, { query: "not present" }).length, 0);
  const combined = R.countryTemplateChannels(file, { pmr: true });
  assert.equal(combined.length, 17);
  assert(combined.every(channel => channel.rxOnly && channel.mode === 0));
  assert.equal(R.countryTemplateChannels(file).length, 1);
  assert.throws(() => R.countryTemplateChannels(file, { region: "ES-NONE" }));
  const usa = buildTemplates([row], features).find(item => item.country === "US");
  assert.throws(() => R.countryTemplateChannels(usa, { pmr: true }), /PMR446/);
});
test("all shipped countries include source permission, coverage, valid regions and safe RX-only entries", () => {
  for (const country of R.TEMPLATE_COUNTRIES) {
    const file = R.validateCountryTemplate(json(country.code), country.code);
    assert.equal(file.permission, "https://hearham.com/repeaters");
    assert(file.coverage.includes("not a complete"));
    assert(file.channels.length > 0, country.code);
    if (country.code === "US") assert.equal(file.regions.length, 51);
    for (const channel of file.channels) assert(channel.source.startsWith("https://hearham.com/"));
  }
});
const orbital = {
  name: "ISS", norad: 25544, source: "https://db.satnogs.org/api/tle/?norad_cat_id=25544",
  tle1: "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
  tle2: "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914",
  fetchedAt: "2026-10-19T06:00:00Z", stale: false,
  transmitters: [{ id: "iss", name: "FM", mode: "FM", downlink: 145800000, source: "https://db.satnogs.org/" }]
};
const now = Date.parse(orbital.fetchedAt);
const observer = { latitude: 40.4168, longitude: -3.7038, height: 0 };
const satellites = { format: "radio-workspace-satellites", version: 1, fetchedAt: orbital.fetchedAt,
  attribution: "SatNOGS DB", license: "CC BY-SA 4.0", satellites: [orbital] };
test("monthly planning reaches UTC month end and marks long-range passes without weakening operational limits", () => {
  const prediction = R.predictMonthlyPasses(orbital, observer, now);
  assert.equal(prediction.operational, false);
  assert.equal(prediction.planningOnly, true);
  assert.equal(prediction.sampleSeconds, 60);
  assert.equal(Date.parse(prediction.start) + prediction.hours * 3600000, Date.parse("2026-11-01T00:00:00Z"));
  assert(prediction.passes.length > 0);
  const passes = R.monthlyTemplatePasses(satellites, observer, now);
  assert(passes.some(pass => pass.tentative));
  assert(passes.some(pass => !pass.tentative));
  for (const pass of passes) {
    assert(pass.start >= now && pass.end <= Date.parse("2026-11-01T00:00:00Z"));
    assert(pass.maximum >= pass.start && pass.maximum <= pass.end);
    assert(pass.elevation >= 10);
  }
  assert.throws(() => R.predictPasses(orbital, observer, { start: now, hours: 49 }), /Ventana/);
  assert.throws(() => R.predictPasses(orbital, observer, { start: now + 6 * 86400000, hours: 48 }), /TLE|siete/);
  assert.throws(() => R.predictMonthlyPasses(orbital, observer, now + 10 * 86400000), /TLE/);
  assert.throws(() => R.validateSatellitePlan({ ...prediction, format: "bricohams-monthly-passes" }, now), /Formato/);
});
test("country forecast attaches explicit positions and the USA has a reference location for every state", () => {
  const usa = json("US"), zones = referenceZones(usa);
  assert.equal(zones.length, 51);
  const forecast = buildForecast(satellites, [{ ...observer, id: "MAD", name: "Madrid" }], now);
  assert.equal(forecast.month, "2026-10");
  assert.equal(forecast.operational, false);
  assert.equal(forecast.zones[0].latitude, observer.latitude);
  assert(forecast.zones[0].passes.length > 0);
  for (const country of R.TEMPLATE_COUNTRIES) {
    const file = json(`${country.code}-passes`);
    assert.equal(file.format, "bricohams-monthly-passes");
    assert.equal(file.planningOnly, true);
    assert.equal(file.operational, false);
    assert.equal(file.zones.length, referenceZones(json(country.code)).length);
    assert(file.zones.every(zone => zone.passes.every(pass => Number.isFinite(pass.start) && pass.end >= pass.start)));
  }
});
test("country channels, PMR and SAT use the existing atomic RX-only importer and skip repeated additions", () => {
  const file = buildTemplates([row], features)[0];
  const originalNow = Date.now;
  let channels;
  try {
    Date.now = () => now;
    channels = R.countryTemplateChannels(file, { pmr: true, satellites });
  } finally { Date.now = originalNow; }
  assert.equal(channels.length, 18);
  const image = new Uint8Array(0xa180).fill(255);
  image.fill(0, 0, 16);
  R.view(image).setUint32(0, 14550000, true);
  image.fill(0, 0x4000, 0x4010);
  image.set(new TextEncoder().encode("BASE-FM"), 0x4000);
  image.set([2, 25], 0x8000);
  image.fill(0, 0xa160, 0xa170);
  image.set(new TextEncoder().encode("v6.1.0"), 0xa160);
  const before = image.slice(), result = R.appendQuanshengChannels(image, channels, 1);
  assert.deepEqual(image, before);
  assert.equal(result.added, 18);
  const decoded = R.readQuanshengChannels(result.image);
  assert.equal(decoded.length, 19);
  assert(decoded.slice(1).every(channel => channel.rxOnly && channel.mode === 0));
  const duplicate = R.appendQuanshengChannels(result.image, channels, 1);
  assert.equal(duplicate.added, 0);
  assert.equal(duplicate.duplicates, 18);
  assert.deepEqual(duplicate.image, result.image);
});
test("monthly browser worker uses the same forecast engine and rejects stale TLE explicitly", () => {
  const messages = [];
  const context = { importScripts() {}, self: { RadioWorkspace: R, postMessage: value => messages.push(value) } };
  vm.runInNewContext(read("channel-template-worker.js"), context);
  context.self.onmessage({ data: { satellites, observer, now } });
  assert.equal(messages[0].result.operational, false);
  assert.deepEqual(messages[0].result.passes, R.monthlyTemplatePasses(satellites, observer, now));
  context.self.onmessage({ data: { satellites, observer, now: now + 10 * 86400000 } });
  assert.match(messages[1].error, /TLE/);
});
test("schedule publishes only validated permitted data and explicitly deploys Pages after bot commits", () => {
  assert(read(".gitignore").includes("!data/channel-templates/*-passes.json"),
    "Public reference forecasts must not be excluded with private pass exports.");
  const workflow = read(".github/workflows/channel-templates.yml");
  assert.match(workflow, /cron: "35 4 \* \* \*"/);
  assert.match(workflow, /node scripts\/fetch-channel-templates.cjs/);
  assert.match(workflow, /node scripts\/fetch-template-passes.cjs/);
  assert(workflow.indexOf("node --test") < workflow.indexOf("git push"));
  assert.match(workflow, /gh workflow run pages.yml --ref main/);
  assert.doesNotMatch(read("scripts/fetch-channel-templates.cjs"), /repeaterbook/i);
});
