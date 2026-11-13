"use strict";
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");

const REPEATERS = "https://hearham.com/api/repeaters/v1";
const BOUNDARIES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson";
const PERMISSION = "https://hearham.com/repeaters";
const AIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const AIRPORT_FREQUENCIES = "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";
function insideRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [previousX, previousY] = ring[j];
    if ((y > point[1]) !== (previousY > point[1]) &&
      point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}
function geometryContains(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(rings => insideRing(point, rings[0]) && !rings.slice(1).some(ring => insideRing(point, ring)));
}
function prepareRegions(features) {
  const countries = new Set(R.TEMPLATE_COUNTRIES.map(country => country.code));
  return features.filter(feature => countries.has(feature.properties.iso_a2)).map(feature => {
    const p = feature.properties;
    R.assert(["Polygon", "MultiPolygon"].includes(feature.geometry.type) &&
      typeof p.iso_3166_2 === "string" && Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    "Geografia Natural Earth no reconocida.");
    const coordinates = feature.geometry.coordinates.flat(feature.geometry.type === "Polygon" ? 1 : 2);
    return { id: p.iso_3166_2, name: p.name, country: p.iso_a2, latitude: p.latitude, longitude: p.longitude,
      geometry: feature.geometry, bbox: coordinates.reduce((box, [x, y]) =>
        [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)],
      [Infinity, Infinity, -Infinity, -Infinity]) };
  });
}
function buildTemplates(rows, features, now = Date.now()) {
  R.assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 100000 && Array.isArray(features),
    "Respuesta de catalogo no valida.");
  const regions = prepareRegions(features);
  const output = R.TEMPLATE_COUNTRIES.map(country => ({
    format: "bricohams-country-template", version: 1, country: country.code, name: country.name,
    fetchedAt: new Date(now).toISOString(), source: REPEATERS,
    attribution: "HearHam.com; Natural Earth administrative boundaries (public domain).",
    permission: PERMISSION, boundaries: BOUNDARIES,
    coverage: "Available operational FM entries from HearHam; not a complete national register. Region assignment uses approximate coordinates and Natural Earth boundaries.",
    regions: regions.filter(region => region.country === country.code).map(({ geometry, bbox, country: code, ...region }) => region),
    channels: [], rejected: 0
  }));
  const seen = new Set();
  for (const row of rows) {
    if (row.mode !== "FM" || Number(row.operational) !== 1 || !Number.isFinite(row.latitude) ||
      !Number.isFinite(row.longitude) || Math.abs(row.latitude) > 90 || Math.abs(row.longitude) > 180) continue;
    const point = [row.longitude, row.latitude];
    const region = regions.find(entry => point[0] >= entry.bbox[0] && point[0] <= entry.bbox[2] &&
      point[1] >= entry.bbox[1] && point[1] <= entry.bbox[3] && geometryContains(point, entry.geometry));
    if (!region) continue;
    const file = output.find(entry => entry.country === region.country);
    const rx = row.frequency / 1e6, tx = (row.frequency + row.offset) / 1e6;
    if (!Number.isInteger(row.id) || !Number.isInteger(row.frequency) || row.frequency % 10 !== 0 ||
      !Number.isInteger(row.offset) || row.offset % 10 !== 0 ||
      !Number.isFinite(rx) || !Number.isFinite(tx) || (rx < 350) !== (tx < 350) ||
      typeof row.callsign !== "string" || !row.callsign.trim() ||
      ![rx, tx].every(value => value >= 136 && value <= 174 || value >= 400 && value <= 470) ||
      seen.has(row.id)) { file.rejected++; continue; }
    seen.add(row.id);
    file.channels.push({
      key: `hearham:${row.id}`, name: R.asciiName(row.callsign), callsign: row.callsign,
      rx: rx.toFixed(5), tx: tx.toFixed(5), mode: 0, rxOnly: true,
      country: file.country, region: region.name, regionId: region.id, city: String(row.city || "").slice(0, 120),
      zone: `${file.country} ${region.name}`, latitude: row.latitude, longitude: row.longitude,
      tone: String(row.encode || ""), source: `https://hearham.com/repeaters/${row.id}`,
      notes: "RX only; nominal TX and published tone are reference information, not enabled. Verify local activity, restrictions and licence."
    });
  }
  for (const file of output) {
    file.regions.sort((a, b) => a.name.localeCompare(b.name, "en"));
    file.channels.sort((a, b) => a.regionId.localeCompare(b.regionId) || a.name.localeCompare(b.name));
    R.validateCountryTemplate(file, file.country);
    R.assert(file.regions.length > 0, `Sin regiones: ${file.country}`);
  }
  return output;
}
// RFC 4180 reader for the OurAirports CSV files (quoted fields, doubled quotes, embedded newlines).
function parseCSV(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"' && value === "") quoted = true;
    else if (c === ",") { row.push(value); value = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value); value = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else value += c;
  }
  if (value !== "" || row.length) { row.push(value); rows.push(row); }
  R.assert(!quoted && rows.length > 1, "CSV de OurAirports no valido.");
  const header = rows[0].map(name => name.replace(/^\uFEFF/, ""));
  return rows.slice(1).map(cells => Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""])));
}
// Only the published carrier is kept: it must sit on the 25 kHz / 8.33 kHz carrier grid (n * 120 is an integer)
// so a three-decimal 8.33 channel designator such as 118.005 is never silently turned into a carrier.
function airbandFrequency(text) {
  if (!/^\d{3}\.\d{1,5}$/.test(text)) return null;
  const mhz = Number(text);
  if (mhz < 118 || mhz > 136.975) return { reason: "outsideAirband" };
  if (Math.abs(mhz * 120 - Math.round(mhz * 120)) >= 0.00061) return { reason: "offGridOrDesignator" };
  return { rx: mhz.toFixed(5) };
}
function buildAirportTemplates(airportRows, frequencyRows, features, now = Date.now()) {
  R.assert(Array.isArray(airportRows) && Array.isArray(frequencyRows) && airportRows.length > 0 &&
    frequencyRows.length > 0 && Array.isArray(features), "Respuesta de OurAirports no valida.");
  const regions = prepareRegions(features);
  const output = R.TEMPLATE_COUNTRIES.map(country => ({
    format: "bricohams-airport-template", version: 1, country: country.code, name: country.name,
    fetchedAt: new Date(now).toISOString(), source: AIRPORT_FREQUENCIES, airportsSource: AIRPORTS,
    attribution: "OurAirports (public domain); Natural Earth administrative boundaries (public domain).",
    license: "Public Domain", band: "AM RX 118-136.975 MHz",
    coverage: "Published OurAirports airport frequencies inside 118-136.975 MHz that sit on the 25 kHz / 8.33 kHz carrier grid; not a complete or current aeronautical register and not for navigation. Region assignment uses the OurAirports region when it is in the catalogue, otherwise Natural Earth boundaries.",
    airports: {}, frequencies: [],
    rejected: { total: 0, closedAirport: 0, invalidFrequency: 0, outsideAirband: 0, offGridOrDesignator: 0, noRegion: 0, duplicate: 0 }
  }));
  const byCountry = new Map(output.map(file => [file.country, file]));
  const regionIds = new Set(regions.map(region => region.id));
  const airports = new Map();
  for (const row of airportRows) if (row.id && row.ident) airports.set(row.id, row);
  const seen = new Set();
  for (const row of frequencyRows) {
    const airport = airports.get(row.airport_ref);
    const file = byCountry.get(airport?.iso_country);
    if (!file) continue;
    const reject = reason => { file.rejected[reason]++; file.rejected.total++; };
    if (airport.type === "closed") { reject("closedAirport"); continue; }
    const frequency = airbandFrequency(row.frequency_mhz);
    if (!frequency) { reject("invalidFrequency"); continue; }
    if (frequency.reason) { reject(frequency.reason); continue; }
    if (!/^\d+$/.test(row.id) || seen.has(row.id)) { reject("duplicate"); continue; }
    if (!file.airports[airport.ident]) {
      const latitude = Number(airport.latitude_deg), longitude = Number(airport.longitude_deg);
      let regionId = regionIds.has(airport.iso_region) && airport.iso_region.startsWith(`${file.country}-`) ? airport.iso_region : "";
      if (!regionId && Number.isFinite(latitude) && Number.isFinite(longitude) && airport.latitude_deg !== "" && airport.longitude_deg !== "") {
        const point = [longitude, latitude];
        regionId = regions.find(entry => entry.country === file.country && point[0] >= entry.bbox[0] && point[0] <= entry.bbox[2] &&
          point[1] >= entry.bbox[1] && point[1] <= entry.bbox[3] && geometryContains(point, entry.geometry))?.id || "";
      }
      file.airports[airport.ident] = { id: Number(airport.id), name: airport.name, municipality: airport.municipality, regionId,
        latitude: Number(airport.latitude_deg), longitude: Number(airport.longitude_deg) };
    }
    if (!file.airports[airport.ident].regionId) { reject("noRegion"); continue; }
    seen.add(row.id);
    file.frequencies.push({ id: Number(row.id), ident: airport.ident, type: row.type.slice(0, 12), description: row.description.slice(0, 80), rx: frequency.rx });
  }
  for (const file of output) {
    const used = new Set(file.frequencies.map(entry => entry.ident));
    file.airports = Object.fromEntries(Object.entries(file.airports).filter(([ident]) => used.has(ident)).sort(([a], [b]) => a.localeCompare(b, "en")));
    file.frequencies.sort((a, b) => a.ident.localeCompare(b.ident, "en") || a.rx.localeCompare(b.rx) || a.id - b.id);
    R.validateAirportTemplate(file, file.country);
  }
  return output;
}
async function fetchBytes(url, limit) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { "User-Agent": "BricohamsRadioWorkspace (+https://github.com/Brico-Hams/Radio-Web-install)" } });
  R.assert(response.ok, `Proveedor HTTP ${response.status}: ${url}`);
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new Error(`Catalogo demasiado grande: ${url}`); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
async function fetchJSON(url, limit) { return JSON.parse(await fetchBytes(url, limit)); }
async function main() {
  const airportsOnly = process.argv.includes("--airports-only");
  const directory = path.join(__dirname, "..", "data", "channel-templates");
  fs.mkdirSync(directory, { recursive: true });
  // Android bundles this file; the JavaScript table in channel-templates.js stays the single source.
  fs.writeFileSync(path.join(directory, "profiles.json"), JSON.stringify({ format: "bricohams-template-profiles", version: 1, profiles: R.TEMPLATE_PROFILES }, null, 2) + "\n");
  const [boundaries, airports, frequencies, rows] = await Promise.all([fetchJSON(BOUNDARIES, 160 * 1024 * 1024),
    fetchBytes(AIRPORTS, 64 * 1024 * 1024), fetchBytes(AIRPORT_FREQUENCIES, 32 * 1024 * 1024),
    airportsOnly ? null : fetchJSON(REPEATERS, 32 * 1024 * 1024)]);
  if (rows) for (const file of buildTemplates(rows, boundaries.features)) {
    fs.writeFileSync(path.join(directory, `${file.country}.json`), JSON.stringify(file) + "\n");
    console.log(`${file.country}: ${file.channels.length} FM; ${file.regions.length} regions; ${file.rejected} excluded`);
  }
  for (const file of buildAirportTemplates(parseCSV(airports), parseCSV(frequencies), boundaries.features)) {
    fs.writeFileSync(path.join(directory, `${file.country}-airports.json`), JSON.stringify(file) + "\n");
    console.log(`${file.country}: ${file.frequencies.length} AM airport frequencies; ${Object.keys(file.airports).length} airports; ${file.rejected.total} excluded`);
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildTemplates, buildAirportTemplates, parseCSV, airbandFrequency, geometryContains, fetchJSON };
