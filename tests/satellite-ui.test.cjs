const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("../radio-core.js");
const R = require("../planning-core.js");
const { ALLOWED_FILES } = require("../server.cjs");

const orbital = {
  name: "ISS", norad: 25544, source: "https://db.satnogs.org/api/tle/?norad_cat_id=25544",
  tle1: "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
  tle2: "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914"
};
const start = Date.parse("2026-10-19T06:00:00Z");
const observer = { latitude: 40.4168, longitude: -3.7038, height: 0.667 };
const firstPass = () => R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 }).passes.find(item => !item.partialStart && !item.partialEnd);

test("passTrack muestrea de AOS a LOS con tiempo creciente", () => {
  const pass = firstPass();
  const track = R.passTrack(orbital, observer, pass, 90);
  assert.equal(track.length, 90);
  assert.equal(track[0].time, pass.aos.time);
  assert.equal(track.at(-1).time, pass.los.time);
  for (let index = 1; index < track.length; index++) assert.ok(track[index].time > track[index - 1].time);
  assert.ok(track[0].elevation >= -1 && track.at(-1).elevation >= -1);
  assert.ok(track.every(point => Number.isFinite(point.azimuth) && Number.isFinite(point.rangeKm)));
  assert.throws(() => R.passTrack(orbital, observer, pass, 1));
});

test("subPoint respeta la inclinacion de la ISS", () => {
  for (let step = 0; step < 24; step++) {
    const point = R.subPoint(orbital, start + step * 600000);
    // Geodetic latitude can exceed the orbital inclination by a few tenths of a degree.
    assert.ok(Math.abs(point.latitude) <= 52.0, `latitud ${point.latitude}`);
    assert.ok(Math.abs(point.longitude) <= 180);
    assert.ok(point.altitudeKm > 300 && point.altitudeKm < 500);
  }
});

test("lookAt coincide con el maximo de predictPasses", () => {
  const pass = firstPass();
  const look = R.lookAt(orbital, observer, pass.maximum.time);
  assert.ok(Math.abs(look.elevation - pass.maximum.elevation) <= 0.5);
  assert.equal(look.time, pass.maximum.time);
});

test("satelites.html conserva la CSP de index.html y solo referencia ficheros servidos", () => {
  const root = path.join(__dirname, "..");
  const page = fs.readFileSync(path.join(root, "satelites.html"), "utf8");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const csp = html => /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html)?.[1];
  assert.ok(csp(index));
  assert.equal(csp(page), csp(index));
  assert.doesNotMatch(page, /<script(?![^>]*\bsrc=)[^>]*>|\sstyle=|<style/i);
  const references = [...page.matchAll(/\s(?:src|href)="([^"#]+)"/g)].map(match => match[1]).filter(value => !/^(?:[a-z]+:)?\/\//i.test(value));
  assert.ok(references.includes("satellite-ui.js") && references.includes("satellites.css"));
  for (const file of [...references, "data/world-land-110m.txt"]) assert.ok(ALLOWED_FILES.includes(file), `${file} no esta en ALLOWED_FILES`);
  assert.ok(page.indexOf("styles.css") < page.indexOf("satellites.css"));
});
