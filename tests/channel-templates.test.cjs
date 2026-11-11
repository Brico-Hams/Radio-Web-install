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
test("weekly radio passes join 48 h predictPasses windows inside TLE validity for Murcia", () => {
  const murcia = { latitude: 37.9922, longitude: -1.1307, height: 0 };
  const { epoch } = R.validateTLE(orbital, now);
  const passes = R.weeklyTemplatePasses(satellites, murcia, now);
  assert(passes.length >= 20);
  for (const [index, pass] of passes.entries()) {
    assert(pass.start >= now && pass.end <= epoch + 7 * 86400000);
    assert(pass.maximum >= pass.start && pass.maximum <= pass.end && pass.end - pass.start < 20 * 60000);
    assert(pass.elevation >= 10 && pass.downlink === 145800000 && pass.tentative === false);
    // Window seams are stitched, so only the very first pass may start already visible.
    assert(!pass.partialStart || pass.start === now);
    if (index) assert(pass.start > passes[index - 1].end);
  }
  assert(passes.some(pass => pass.end > now + 48 * 3600000), "later 48 h windows are included");
  const messages = [];
  const context = { importScripts() {}, self: { RadioWorkspace: R, postMessage: value => messages.push(value) } };
  vm.runInNewContext(read("channel-template-worker.js"), context);
  context.self.onmessage({ data: { satellites, observer: murcia, now, weekly: true } });
  assert.equal(messages[0].result.format, "bricohams-weekly-passes");
  assert.deepEqual(messages[0].result.passes, passes);
  assert.throws(() => R.weeklyTemplatePasses(satellites, murcia, now + 10 * 86400000), /TLE/);
});
const airportCountries = R.TEMPLATE_COUNTRIES.map(country => ({ ...country, airports: json(`${country.code}-airports`) }));
test("airport ingestion keeps only published AM carriers on the 25/8.33 kHz grid, with provenance and declared exclusions", () => {
  const { buildAirportTemplates, parseCSV, airbandFrequency } = require("../scripts/fetch-channel-templates.cjs");
  assert.deepEqual(airbandFrequency("118.00833"), { rx: "118.00833" });
  assert.deepEqual(airbandFrequency("136.975"), { rx: "136.97500" });
  assert.deepEqual(airbandFrequency("118.005"), { reason: "offGridOrDesignator" });
  assert.deepEqual(airbandFrequency("117.975"), { reason: "outsideAirband" });
  assert.deepEqual(airbandFrequency("137.000"), { reason: "outsideAirband" });
  assert.equal(airbandFrequency(""), null);
  assert.equal(parseCSV('a,b\r\n"x, ""y""",2\r\n')[0].a, 'x, "y"');
  const airportRows = parseCSV([
    "id,ident,type,name,latitude_deg,longitude_deg,iso_country,iso_region,municipality",
    '1,AAAA,small_airport,"Airport, One",0.5,0.5,ES,ES-ONE,Town',
    "2,BBBB,closed,Closed,0.5,0.5,ES,ES-ONE,Town",
    "3,CCCC,small_airport,Outside,50,50,ES,ES-XX,Nowhere",
    "4,DDDD,small_airport,Other,0.5,2.5,GB,GB-XX,Elsewhere"].join("\n"));
  const frequencyRows = parseCSV(["id,airport_ref,airport_ident,type,description,frequency_mhz",
    "10,1,AAAA,TWR,Tower,118.300", "11,1,AAAA,ATIS,,118.005", "12,1,AAAA,GND,,118.00833", "13,1,AAAA,VOR,,113.500",
    "14,1,AAAA,APP,,", "15,2,BBBB,TWR,,118.300", "16,3,CCCC,TWR,,118.300", "17,4,DDDD,TWR,,121.500", "10,1,AAAA,TWR,dup,118.300"].join("\n"));
  const files = buildAirportTemplates(airportRows, frequencyRows, features, 0);
  const spain = files.find(file => file.country === "ES"), britain = files.find(file => file.country === "GB");
  assert.equal(files.length, 7);
  assert.deepEqual(spain.frequencies.map(entry => [entry.id, entry.rx]), [[10, "118.30000"], [12, "118.00833"]].sort((a, b) => a[1].localeCompare(b[1])));
  assert.equal(spain.airports.AAAA.regionId, "ES-ONE");
  assert.equal(britain.frequencies.length, 1);
  assert.equal(britain.airports.DDDD.regionId, "GB-ONE");
  assert.deepEqual({ ...spain.rejected }, { total: 6, closedAirport: 1, invalidFrequency: 1, outsideAirband: 1, offGridOrDesignator: 1, noRegion: 1, duplicate: 1 });
  assert.equal(spain.license, "Public Domain");
  assert.match(spain.coverage, /not a complete/);
  const channels = R.airportChannels(spain);
  assert.equal(channels[0].mode, "AM");
  assert.equal(channels[0].tx, channels[0].rx);
  assert(channels.every(channel => channel.rxOnly && channel.txLocked && channel.ident === "AAAA" && channel.sourceId && channel.source.includes("ourairports.com")));
  assert.throws(() => R.validateAirportTemplate({ ...spain, frequencies: [{ ...spain.frequencies[0], rx: "118.00500" }] }, "ES"));
  assert.throws(() => R.validateAirportTemplate(spain, "GB"));
});
test("all existing countries ship reproducible airport data bound to catalogue regions", () => {
  for (const country of airportCountries) {
    const file = R.validateAirportTemplate(country.airports, country.code), template = R.validateCountryTemplate(json(country.code), country.code);
    const regions = new Set(template.regions.map(region => region.id));
    assert(file.frequencies.length > 0, country.code);
    assert(file.airports && Object.values(file.airports).every(airport => regions.has(airport.regionId)), country.code);
    assert.equal(file.source, "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv");
    assert.equal(file.airportsSource, "https://davidmegginson.github.io/ourairports-data/airports.csv");
    assert.equal(file.rejected.total, Object.entries(file.rejected).filter(([key]) => key !== "total").reduce((sum, [, count]) => sum + count, 0));
  }
  const server = require("../server.cjs").ALLOWED_FILES;
  for (const country of R.TEMPLATE_COUNTRIES) assert(server.includes(`data/channel-templates/${country.code}-airports.json`));
});
test("regional preview joins repeaters and airports, keeps v1 snapshots unchanged and puts PMR446 last, never for the USA", () => {
  const file = buildTemplates([row], features)[0], airports = {
    format: "bricohams-airport-template", version: 1, country: "ES", fetchedAt: "2026-01-01T00:00:00.000Z",
    source: "s", airportsSource: "a", license: "Public Domain", coverage: "c",
    airports: { LEXX: { id: 1, name: "Test Airfield", municipality: "Town", regionId: "ES-ONE", latitude: 0.5, longitude: 0.5 } },
    frequencies: [{ id: 5, ident: "LEXX", type: "TWR", description: "", rx: "118.30000" }] };
  assert.deepEqual(R.countryTemplateChannels(file, { region: "ES-ONE" }), R.countryTemplateChannels(file, { region: "ES-ONE", airports: null }));
  const combined = R.countryTemplateChannels(file, { region: "ES-ONE", airports, pmr: true });
  assert.deepEqual(combined.slice(0, 2).map(channel => channel.key), ["hearham:1", "ourairports:5"]);
  assert(combined.slice(2).every(channel => channel.key.startsWith("pmr446:")) && combined.length === 18);
  assert.equal(R.countryTemplateChannels(file, { query: "airfield", airports }).length, 1);
  assert.throws(() => R.countryTemplateChannels(file, { airports: { ...airports, country: "GB" } }));
  assert.throws(() => R.countryTemplateChannels(file, { airports: { ...airports, airports: { LEXX: { ...airports.airports.LEXX, regionId: "ES-NONE" } } } }));
  const usa = buildTemplates([row], features).find(item => item.country === "US");
  assert.throws(() => R.countryTemplateChannels(usa, { pmr: true }), /PMR446/);
  assert(!airportCountries.find(country => country.code === "US").airports.frequencies.some(entry => entry.ident.startsWith("PMR")));
});
test("model profiles omit and count channels without a representable mode or safe TX lock; AT-D878 has no AM", () => {
  const fm = { key: "a", name: "FM1", rx: "145.60000", tx: "145.00000", mode: 0, rxOnly: true, source: "s" };
  const am = { key: "b", name: "AM1", rx: "118.30000", tx: "118.30000", mode: "AM", rxOnly: true, source: "s" };
  const unsafe = [{ ...fm, key: "c", rxOnly: false }, { ...am, key: "d", tx: "118.40000" }, { ...fm, key: "e", mode: 1 },
    { ...fm, key: "f", rx: "28.00000", tx: "28.00000" }];
  const all = [fm, am, ...unsafe];
  const d878 = R.prepareTemplateExport("d878", all);
  assert.deepEqual(d878.accepted.map(channel => channel.key), ["a"]);
  assert.equal(d878.omitted, 5);
  assert.deepEqual(d878.reasons, { "modulation:AM": 2, txLock: 1, "modulation:DMR": 1, band: 1 });
  assert.deepEqual(R.prepareTemplateExport("rt950pro", all).accepted.map(channel => channel.key), ["a", "b"]);
  assert.deepEqual(R.prepareTemplateExport("uvk5v3", all).accepted.map(channel => channel.key), ["a", "b"]);
  assert.deepEqual(R.prepareTemplateExport("radicodex", all).accepted.map(channel => channel.key), ["a", "b"]);
  assert.deepEqual(R.prepareTemplateExport("ftx1", all).accepted.map(channel => channel.key), ["a", "b"]);
  assert.throws(() => R.prepareTemplateExport("rt950pro", "x"));
  assert.throws(() => R.templateExportFile("d878", [am]), /representable/);
  assert.throws(() => R.templateExportFile("opengd77", [fm]));
  const project = JSON.parse(R.templateExportFile("d878", all).content);
  assert.equal(project.airband, false);
  assert(project.channels.every(channel => channel.mode === "FM" && channel.rxOnly === true));
  assert.equal(project.channels.length, 1);
  assert.match(R.templateExportFile("ftx1", [fm]).content, /"RX_Only"/);
  assert.match(R.templateExportFile("uvk5v3", [am, fm]).content, /"AM"[\s\S]*"FM"|"FM"[\s\S]*"AM"/);
  assert.match(R.templateExportFile("rt950pro", [fm]).content, /"RX_Only"[\s\S]*"Yes"/);
  assert.match(R.templateExportFile("radicodex", [{ ...fm, name: "=cmd" }]).content, /"'=cmd"/);
  for (const id of Object.keys(R.TEMPLATE_PROFILES)) assert(!/script|cps/i.test(R.TEMPLATE_PROFILES[id].output));
  const shipped = json("profiles");
  assert.equal(shipped.format, "bricohams-template-profiles");
  assert.deepEqual(shipped.profiles, JSON.parse(JSON.stringify(R.TEMPLATE_PROFILES)));
});
test("UV-K5 V3 loads template AM as RX-only extended memories and the import path rejects unsupported profiles", () => {
  const es = airportCountries.find(country => country.code === "ES").airports;
  const am = R.airportChannels(es).slice(0, 2);
  const prepared = R.templateImportChannels("uvk5v3", [...am, { key: "x", name: "DMR", rx: "145.00000", tx: "145.00000", mode: 1, rxOnly: true }]);
  assert.equal(prepared.accepted.length, 2);
  assert.equal(prepared.omitted, 1);
  assert(prepared.accepted.every(channel => channel.mode === 1 && channel.extended === true && channel.rxOnly === true));
  const image = new Uint8Array(0xa180).fill(255);
  image.fill(0, 0, 16);
  R.view(image).setUint32(0, 14550000, true);
  image.fill(0, 0x4000, 0x4010);
  image.set(new TextEncoder().encode("BASE-FM"), 0x4000);
  image.set([2, 25], 0x8000);
  image.fill(0, 0xa160, 0xa170);
  image.set(new TextEncoder().encode("v6.1.0"), 0xa160);
  const decoded = R.readQuanshengChannels(R.appendQuanshengChannels(image, prepared.accepted, 1).image).slice(1);
  assert.equal(decoded.length, 2);
  assert(decoded.every(channel => channel.mode === 1 && channel.rxOnly && channel.rx === channel.tx));
  assert.throws(() => R.appendQuanshengChannels(image, am, 1), /FM analogicos/);
  assert.throws(() => R.templateImportChannels("d878", am));
  const gd77 = R.templateImportChannels("opengd77", [...am, { key: "f", name: "F", rx: "145.60000", tx: "145.60000", mode: 0, rxOnly: true }]);
  assert.equal(gd77.accepted.length, 1);
  assert.equal(gd77.omitted, 2);
});
test("Android bundles the shared template datasets through Gradle and never from a copied directory", () => {
  const gradle = read("android/app/build.gradle.kts");
  assert.match(gradle, /syncChannelTemplates/);
  assert.match(gradle, /data\/channel-templates/);
  assert.match(gradle, /exclude\("\*-passes\.json", "satellites\.json"\)/);
  assert(!fs.existsSync(path.join(root, "android/app/src/main/assets/channel-templates")));
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
