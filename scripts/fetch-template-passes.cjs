"use strict";
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");
const { buildSatellites } = require("./fetch-satellites.cjs");
const { DataService } = require("../data-service.cjs");

const cities = {
  ES: [["Madrid", 40.4168, -3.7038], ["Barcelona", 41.3874, 2.1686], ["Murcia", 37.9922, -1.1307], ["Sevilla", 37.3891, -5.9845], ["Las Palmas", 28.1235, -15.4363]],
  GB: [["London", 51.5074, -0.1278], ["Edinburgh", 55.9533, -3.1883], ["Cardiff", 51.4816, -3.1791], ["Belfast", 54.5973, -5.9301]],
  DE: [["Berlin", 52.52, 13.405], ["Hamburg", 53.5511, 9.9937], ["Munich", 48.1351, 11.582], ["Cologne", 50.9375, 6.9603]],
  FR: [["Paris", 48.8566, 2.3522], ["Marseille", 43.2965, 5.3698], ["Bordeaux", 44.8378, -0.5792], ["Strasbourg", 48.5734, 7.7521]],
  HU: [["Budapest", 47.4979, 19.0402], ["Debrecen", 47.5316, 21.6273], ["Szeged", 46.253, 20.1414]],
  IT: [["Rome", 41.9028, 12.4964], ["Milan", 45.4642, 9.19], ["Naples", 40.8518, 14.2681], ["Palermo", 38.1157, 13.3615]]
};
function referenceZones(country) {
  if (country.country === "US") return country.regions.map(region => ({
    id: region.id, name: `${region.name} (reference point)`, latitude: region.latitude, longitude: region.longitude, height: 0
  }));
  return cities[country.country].map(([name, latitude, longitude], index) => ({
    id: `${country.country}-${index + 1}`, name, latitude, longitude, height: 0
  }));
}
function buildForecast(satellites, zones, now = Date.now()) {
  R.validateSatellitesFile(satellites);
  const result = [];
  for (const zone of zones) {
    const observer = { latitude: zone.latitude, longitude: zone.longitude, height: zone.height };
    const passes = R.monthlyTemplatePasses(satellites, observer, now);
    result.push({ ...zone, passes });
  }
  return {
    format: "bricohams-monthly-passes", version: 1, month: new Date(now).toISOString().slice(0, 7),
    generatedAt: new Date(now).toISOString(), planningOnly: true, operational: false,
    minimumElevation: 10, sampleSeconds: 60, attribution: satellites.attribution, license: satellites.license,
    warning: "Reference locations only. Remaining UTC month, not past passes. Beyond 7 days from TLE epoch: tentative. Refresh TLE and recalculate at your position before use; no CAT or radio commands.",
    zones: result
  };
}
async function main() {
  const directory = path.join(__dirname, "..", "data", "channel-templates");
  const satellites = await buildSatellites({ dataService: new DataService() });
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "satellites.config.json"), "utf8")).norad;
  R.assert(expected.every(norad => satellites.satellites.some(entry => entry.norad === norad)),
    "Actualizacion incompleta de satelites: no se publica una prevision parcial.");
  fs.writeFileSync(path.join(directory, "satellites.json"), JSON.stringify(satellites) + "\n");
  const now = Date.now();
  for (const country of R.TEMPLATE_COUNTRIES) {
    const template = R.validateCountryTemplate(JSON.parse(fs.readFileSync(path.join(directory, `${country.code}.json`), "utf8")), country.code);
    const forecast = buildForecast(satellites, referenceZones(template), now);
    fs.writeFileSync(path.join(directory, `${country.code}-passes.json`), JSON.stringify(forecast) + "\n");
    console.log(`${country.code}: ${forecast.zones.length} reference zones, ${forecast.zones.reduce((sum, zone) => sum + zone.passes.length, 0)} upcoming passes`);
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildForecast, referenceZones };
