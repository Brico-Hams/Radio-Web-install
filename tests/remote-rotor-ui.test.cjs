"use strict";
// Console side of the remote rotor: pass-track hand-off from the planner and AZ/EL target selection.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("../radio-core.js");
const R = require("../planning-core.js");
const { parsePassTrack, trackTarget, fitAzimuth } = require("../remote-rotor-ui.js");

const orbital = {
  name: "ISS", norad: 25544, source: "https://db.satnogs.org/api/tle/?norad_cat_id=25544",
  tle1: "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
  tle2: "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914"
};
const observer = { latitude: 40.4168, longitude: -3.7038, height: 0.667 };
const limits = { azimuth_min: 0, azimuth_max: 360, elevation_min: 0, elevation_max: 90 };
const file = samples => JSON.stringify({ format: "radicodex-pass-track", version: 1, name: "T", samples });

test("the planner export is accepted by the console parser and keeps UTC time order", () => {
  const start = Date.parse("2026-10-19T06:00:00Z");
  const pass = R.predictPasses(orbital, observer, { start, hours: 24, minimum: 10 }).passes.find(item => !item.partialStart && !item.partialEnd);
  const exported = R.passTrackFile(orbital, observer, pass, "ISS");
  const track = parsePassTrack(JSON.stringify(exported));
  assert.equal(track.samples.length, 120);
  assert.equal(track.samples[0].t, pass.aos.time);
  assert.ok(track.samples.every(sample => sample.az >= 0 && sample.az < 360));
});

test("parsePassTrack rejects wrong formats, unordered or non-finite samples and passes over 30 minutes", () => {
  assert.throws(() => parsePassTrack("{"));
  assert.throws(() => parsePassTrack(JSON.stringify({ format: "other", version: 1, samples: [] })));
  assert.throws(() => parsePassTrack(file([{ t: 1, az: 0, el: 0 }])));
  assert.throws(() => parsePassTrack(file([{ t: 2, az: 0, el: 0 }, { t: 1, az: 0, el: 0 }])));
  assert.throws(() => parsePassTrack(file([{ t: 1, az: 0, el: 0 }, { t: 2, az: "x", el: 0 }])));
  assert.throws(() => parsePassTrack(file([{ t: 0, az: 0, el: 0 }, { t: 31 * 60_000, az: 0, el: 0 }])));
});

test("trackTarget interpolates by clock time, crossing north by the short way, and waits outside the pass", () => {
  const track = parsePassTrack(file([{ t: 0, az: 350, el: 0 }, { t: 1000, az: 10, el: 40 }, { t: 2000, az: 20, el: 0 }]));
  assert.equal(trackTarget(track, -1, limits).phase, "before");
  assert.equal(trackTarget(track, 2001, limits).phase, "after");
  const mid = trackTarget(track, 500, limits, 0);
  assert.equal(mid.phase, "active");
  assert.equal(mid.azimuth, 0);
  assert.equal(mid.elevation, 20);
});

test("trackTarget holds below the horizon, clamps elevation and reports azimuths the rotor cannot reach", () => {
  const track = parsePassTrack(file([{ t: 0, az: 90, el: -5 }, { t: 1000, az: 90, el: 60 }, { t: 2000, az: 90, el: 0 }]));
  assert.equal(trackTarget(track, 10, limits).phase, "below");
  assert.equal(trackTarget(track, 1000, { ...limits, elevation_max: 0 }).elevation, 0);
  assert.equal(trackTarget(track, 1000, { ...limits, azimuth_min: 100, azimuth_max: 200 }).phase, "limits");
});

test("fitAzimuth uses the overlap range closest to the current heading", () => {
  const overlap = { azimuth_min: 0, azimuth_max: 450 };
  assert.equal(fitAzimuth(10, overlap, 400), 370);
  assert.equal(fitAzimuth(10, overlap, 20), 10);
  assert.equal(fitAzimuth(200, { azimuth_min: 0, azimuth_max: 180 }, 0), null);
});

test("the console serves the rotor panel from relative URLs only", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "remote-rotor-ui.js"), "utf8");
  assert.doesNotMatch(ui, /(?:fetch|api)\(\s*[`"']\//);
  const html = fs.readFileSync(path.join(__dirname, "..", "remote.html"), "utf8");
  assert.match(html, /<script src="remote-rotor-ui\.js" defer>/);
  assert.match(html, /id="rotor-stop"/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "remote-agent.cjs"), "utf8"), /"\/remote-rotor-ui\.js"/);
});
