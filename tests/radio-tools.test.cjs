const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../tools-core.js");

const near = (actual, expected, tolerance) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test("latLonToLocator converts coordinates and validates input", () => {
  assert.equal(R.latLonToLocator(40.4168, -3.7038), "IN80dk");
  assert.equal(R.latLonToLocator(41.7147, -72.7272), "FN31pr");
  assert.equal(R.latLonToLocator(40.4168, -3.7038, 4), "IN80");
  assert.doesNotThrow(() => R.latLonToLocator(90, 180));
  assert.throws(() => R.latLonToLocator(91, 0), /Latitud/);
  const centre = R.maidenheadToLatLon("JN11ck");
  assert.equal(R.latLonToLocator(centre.latitude, centre.longitude), "JN11ck");
});

test("greatCircle gives distance, long path and bearings", () => {
  const result = R.greatCircle({ latitude: 40.4168, longitude: -3.7038 }, { latitude: 40.7128, longitude: -74.006 });
  near(result.distanceKm, 5768, 5);
  near(result.bearing, 294.9, 0.5);
  near(result.longPathKm + result.distanceKm, 40030, 2);
});

test("SWR conversions", () => {
  const result = R.swrFromPower(100, 4);
  near(result.swr, 1.5, 0.001);
  near(result.returnLossDb, 13.98, 0.01);
  near(result.mismatchLossDb, 0.177, 0.001);
  assert.equal(R.swrFromRatio(1).returnLossDb, Infinity);
  assert.throws(() => R.swrFromPower(10, 10));
});

test("power units and coax loss", () => {
  assert.equal(R.power(100, "W").dBm, 50);
  assert.equal(R.power(100, "W").dBW, 20);
  near(R.power(30, "dBm").watts, 1, 1e-9);
  const coax = R.coaxLoss({ cable: "RG-213", frequencyMHz: 100, lengthM: 30, powerW: 100 });
  near(coax.lossDb, 1.98, 0.001);
  near(coax.powerOutW, 63.4, 0.1);
  assert.throws(() => R.coaxLoss({ cable: "RG-213", frequencyMHz: 5, lengthM: 30, powerW: 100 }), /fuera de la tabla/);
  assert.equal(R.coaxLoss({ customDbPer100m: 10, lengthM: 50, powerW: 100 }).lossDb, 5);
});

test("antenna lengths and amateur band lookup", () => {
  const lengths = R.antennaLengths(14.2);
  near(lengths.wavelengthM, 21.112, 0.001);
  near(lengths.halfWaveM, 10.028, 0.001);
  assert.equal(R.bandOf(7.15), "40m");
  assert.equal(R.bandOf(7.25, 1), null);
  assert.equal(R.bandOf(7.25, 2), "40m");
  assert.equal(R.bandOf(145.5), "2m");
  assert.equal(R.bandOf(223, 2), "1.25m");
  assert.equal(R.bandOf(100), null);
});
