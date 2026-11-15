"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");
const { coverageReport } = require("../scripts/fetch-channel-templates.cjs");
const { renderChannels, buildRepeaterTemplates, PENDING } = require("../scripts/build-repeater-templates.cjs");

const channel = (n, extra = {}) => ({ key: `hearham:${n}`, name: `R${n}`, rx: "145.60000", tx: "145.00000", mode: 0, rxOnly: true,
  source: "HearHam", country: "ES", regionId: "ES-ONE", region: "One", city: "", ...extra });
const fixture = (count, code = "ES") => ({ format: "bricohams-country-template", version: 1, country: code, name: "Espana",
  fetchedAt: "2026-01-01T00:00:00.000Z", source: "HearHam fixture", rejected: {},
  regions: [{ id: `${code}-ONE`, name: "One", latitude: 40, longitude: -3 }],
  channels: Array.from({ length: count }, (_, n) => channel(n, { country: code, regionId: `${code}-ONE` })) });

test("COUNTRIES: unique codes, legacy entries unchanged, PMR446 false for every American country", () => {
  const countries = R.TEMPLATE_COUNTRIES;
  assert.equal(new Set(countries.map(country => country.code)).size, countries.length);
  assert.deepEqual(countries.slice(0, 7).map(({ code, pmr }) => [code, pmr]),
    [["ES", true], ["GB", true], ["US", false], ["DE", true], ["FR", true], ["HU", true], ["IT", true]]);
  const american = countries.filter(country => R.templateGroup(country.code) === "america");
  for (const code of ["US", "CA", "MX", "BR", "AR", "CU"]) assert(american.some(country => country.code === code), code);
  assert(american.every(country => country.pmr === false));
  assert(!countries.some(country => country.code === "RU"));
});

test("a country without usable repeaters is pendiente de fuente and gets no file", () => {
  const full = { ...fixture(2), regions: fixture(2).regions };
  const empty = { ...fixture(0, "FR"), name: "Francia" };
  const { writable, coverage } = coverageReport([full, empty], Date.parse("2026-01-02T00:00:00Z"));
  assert.deepEqual(writable.map(file => file.country), ["ES"]);
  assert.equal(coverage.countries.find(item => item.code === "ES").status, "ok");
  const pending = coverage.countries.find(item => item.code === "FR");
  assert.equal(pending.status, PENDING);
  assert.ok(pending.reason);

  const built = buildRepeaterTemplates({ templates: { ES: full, FR: empty }, coverage });
  assert(!built.files.some(file => file.country === "FR"));
  assert.equal(built.index.countries.find(item => item.code === "FR").status, PENDING);
  assert.match(built.readme, /FR Francia/);
});

test("renderChannels skips out-of-band channels and modes the radio lacks", () => {
  const am = channel(2, { mode: "AM", rx: "118.30000", tx: "118.30000" });
  const outOfBand = channel(3, { rx: "50.80000", tx: "50.80000" });
  const fm = channel(1);
  const d878 = renderChannels("d878", [fm, am, outOfBand]);
  assert.deepEqual([d878.channels, d878.dropped, d878.extension], [1, 2, "json"]);
  const k5 = renderChannels("radicodex", [fm, outOfBand]);
  assert.deepEqual([k5.channels, k5.dropped], [1, 1]);
  assert.equal(renderChannels("d878", [outOfBand]), null);
});

test("capacity limits are respected and the overflow is counted", () => {
  const channels = fixture(1000).channels;
  const rt950 = renderChannels("rt950pro", channels);
  assert.equal(rt950.channels, 896);
  assert.equal(rt950.dropped, 104);
  const d878 = renderChannels("d878", fixture(4005).channels);
  assert.equal(d878.channels, 4000);
  assert.equal(d878.dropped, 5);
});

test("build produces per-radio files via the app exporters, RX-only and with correct index entries", () => {
  const template = fixture(3);
  const { files, index } = buildRepeaterTemplates({ templates: { ES: template }, now: Date.parse("2026-02-01T00:00:00Z") });
  assert.equal(index.generatedAt, "2026-02-01T00:00:00.000Z");
  assert.deepEqual(index.radios.map(radio => radio.id), Object.keys(R.TEMPLATE_PROFILES));
  assert.deepEqual(index.countries.find(item => item.code === "ES"), { code: "ES", name: R.TEMPLATE_COUNTRIES[0].name, status: "ok" });
  assert.equal(index.countries.find(item => item.code === "GB").status, PENDING);
  assert(files.every(file => file.country === "ES"));
  assert.equal(files.length, index.radios.length);
  for (const id of ["radicodex", "d878"]) {
    const file = files.find(item => item.radio === id);
    const direct = R.templateExportFile(id, R.countryTemplateChannels(template));
    assert.equal(file.content, direct.content, id);
    assert.equal(file.path, `${id}/ES.${direct.extension}`);
    const entry = index.files.find(item => item.radio === id && item.country === "ES");
    assert.deepEqual([entry.channels, entry.dropped], [3, 0]);
    assert.equal(entry.sha256, createHash("sha256").update(file.content).digest("hex"));
    assert.equal(entry.path, file.path);
    assert(!("content" in entry));
  }
  assert.match(files.find(item => item.radio === "radicodex").content, /RX_Only/);
});
