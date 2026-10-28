"use strict";
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../channel-templates.js");

const REPEATERS = "https://hearham.com/api/repeaters/v1";
const BOUNDARIES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson";
const PERMISSION = "https://hearham.com/repeaters";
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
async function fetchJSON(url, limit) {
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
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function main() {
  const [rows, boundaries] = await Promise.all([fetchJSON(REPEATERS, 32 * 1024 * 1024), fetchJSON(BOUNDARIES, 160 * 1024 * 1024)]);
  const files = buildTemplates(rows, boundaries.features);
  const directory = path.join(__dirname, "..", "data", "channel-templates");
  fs.mkdirSync(directory, { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(directory, `${file.country}.json`), JSON.stringify(file) + "\n");
    console.log(`${file.country}: ${file.channels.length} FM; ${file.regions.length} regions; ${file.rejected} excluded`);
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildTemplates, geometryContains, fetchJSON };
