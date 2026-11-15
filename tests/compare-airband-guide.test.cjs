"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { compareAirbandGuide, ESTADOS, AERODROME_ONLY_GUIDE } = require("../scripts/compare-airband-guide.cjs");

const channel = (service, icaoChannel, mhz, note = null) => ({ service, icaoChannel, mhz, note });
const guide = { source: { title: "Guide", version: "1.0", date: "2026-11-07", page: 1, upstream: "AIRAC 10/26", license_note: "Third-party" }, aerodromes: [
  { icao: "LECO", kind: "civil-atc", channels: [channel("TWR", "118.305", 118.3), channel("GND", "121.700", 121.7), channel("APP", "119.000", null, "xxx.xxx"),
    channel("MIL", "250.000", 250, "UHF")] },
  { icao: "LEZZ", kind: "civil-afis", channels: [channel("AFIS", "118.000", 118)] }] };
const airports = { source: "https://example.test/f.csv", fetchedAt: "2026-01-01T00:00:00.000Z",
  airports: { LECO: {}, LEOO: {} },
  frequencies: [{ id: 1, ident: "LECO", type: "TWR", rx: "118.30000" }, { id: 2, ident: "LECO", type: "ATIS", rx: "127.05000" },
    { id: 3, ident: "LEOO", type: "TWR", rx: "119.10000" }] };

test("every estado is reported with counts, citations and the guide-only aerodrome line", () => {
  const { rows, counts, markdown, guideOnlyAerodromes } = compareAirbandGuide(guide, airports);
  const estado = (icao, service, type) => rows.find(row => row.icao === icao && row.service === service && row.type === type).estado;
  assert.equal(estado("LECO", "TWR", "TWR"), "coincide");
  assert.equal(estado("LECO", "GND", ""), "solo guia");
  assert.equal(estado("LECO", "", "ATIS"), "solo OurAirports");
  assert.equal(estado("LECO", "MIL", ""), "fuera de banda (no se programa)");
  assert.equal(estado("LECO", "APP", ""), "sin publicar en la guia");
  assert.equal(estado("LEOO", "", "TWR"), "solo OurAirports");
  assert.deepEqual(counts, { coincide: 1, "solo guia": 2, "solo OurAirports": 2, "fuera de banda (no se programa)": 1, "sin publicar en la guia": 1 });
  assert.deepEqual(Object.keys(counts), ESTADOS);
  assert.equal(guideOnlyAerodromes, 1);
  assert(markdown.includes(`LEZZ: ${AERODROME_ONLY_GUIDE}`));
  assert(markdown.includes("| ICAO | servicio guia | canal OACI | MHz guia | tipo OurAirports | MHz OurAirports | estado |"));
  assert(markdown.includes("Las discrepancias no se resuelven automaticamente: revisar contra el AIP de ENAIRE."));
  assert(markdown.includes("AIRAC 10/26") && markdown.includes("https://example.test/f.csv") && markdown.includes("2026-01-01T00:00:00.000Z"));
  assert(markdown.includes("| LECO | TWR | 118.305 | 118.30000 | TWR | 118.30000 | coincide |"));
});
