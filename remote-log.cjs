"use strict";
// Operating log for the remote consoles: ADIF import/export (same rules as android/.../radio/AdifImport.kt and Models.kt
// `Adif`), dupes, DXCC/WAS/grid/POTA progress from the log, needed-spot marking and the day/night terminator (grayline).
// The terminator is meant to be drawn over data/world-land-110m.txt (Natural Earth, public domain) by the console.
//
// Not here, because the repo has no source for them (docs/remote-cw-log.md marks them "pendiente de fuente"):
// DX cluster protocol, QRZ.com XML lookup and the TQSL command line.

const MAX_BYTES = 16 * 1024 * 1024;
const MAX_RECORDS = 50_000;
const SUPPORTED = Object.freeze(["CALL", "QSO_DATE", "TIME_ON", "FREQ", "MODE", "RST_SENT", "RST_RCVD", "COMMENT"]);
// Extra tags the progress views read; they are kept on the record, never invented.
const PROGRESS = Object.freeze(["BAND", "DXCC", "COUNTRY", "STATE", "GRIDSQUARE", "POTA_REF", "SIG", "SIG_INFO"]);

// ADIF 3.1.4 band enumeration (MHz, inclusive), as in Models.kt `Adif.bands`.
const BANDS = Object.freeze([
  ["2190m", 0.1357, 0.1378], ["630m", 0.472, 0.479], ["560m", 0.501, 0.504], ["160m", 1.8, 2.0], ["80m", 3.5, 4.0],
  ["60m", 5.06, 5.45], ["40m", 7.0, 7.3], ["30m", 10.1, 10.15], ["20m", 14.0, 14.35], ["17m", 18.068, 18.168],
  ["15m", 21.0, 21.45], ["12m", 24.89, 24.99], ["10m", 28.0, 29.7], ["8m", 40, 45], ["6m", 50, 54], ["5m", 54.000001, 69.9],
  ["4m", 70, 71], ["2m", 144, 148], ["1.25m", 222, 225], ["70cm", 420, 450], ["33cm", 902, 928], ["23cm", 1240, 1300]
]);

function band(freqMHz) {
  const value = Number(freqMHz);
  if (!Number.isFinite(value)) return null;
  return BANDS.find(([, low, high]) => value >= low && value <= high)?.[0] || null;
}

function fail(message) { throw new Error(message); }

// Returns { contacts, ignoredFields }. Throws on anything the Android importer rejects.
function parseAdif(input) {
  const text = Buffer.isBuffer(input) ? input.toString("latin1") : String(input);
  if (text.length > MAX_BYTES) fail("ADIF demasiado grande.");
  if (!/^[\x20-\x7e\t\r\n]*$/.test(text)) fail("ADIF solo admite ASCII.");
  const contacts = [];
  const ignored = new Set();
  let fields = {};
  let headerEnded = false;
  let recordEnded = false;
  let offset = 0;
  const empty = () => Object.keys(fields).length === 0;
  while (offset < text.length) {
    const open = text.indexOf("<", offset);
    if (open < 0) {
      if (!(text.slice(offset).trim() === "" || (!headerEnded && !contacts.length && empty()))) fail("Texto sobrante tras el ultimo registro.");
      break;
    }
    if (!(text.slice(offset, open).trim() === "" || (!headerEnded && !contacts.length && empty()))) fail("Texto suelto entre campos.");
    const close = text.indexOf(">", open + 1);
    if (close < 0 || close - open > 100) fail("Etiqueta truncada.");
    const tag = text.slice(open + 1, close).toUpperCase();
    offset = close + 1;
    if (tag === "EOH") {
      if (headerEnded || contacts.length || recordEnded) fail("Cabecera fuera de sitio.");
      fields = {};
      headerEnded = true;
      continue;
    }
    if (tag === "EOR") {
      if (empty()) fail("Registro vacio.");
      if (contacts.length >= MAX_RECORDS) fail("Demasiados registros.");
      contacts.push(toContact(fields, contacts.length + 1));
      const derived = (fields.BAND || "").trim().toLowerCase() === (band(fields.FREQ) || "").toLowerCase();
      for (const key of Object.keys(fields)) {
        if (!SUPPORTED.includes(key) && !PROGRESS.includes(key)) ignored.add(key);
        else if (key === "BAND" && !derived) ignored.add(key);
      }
      fields = {};
      headerEnded = true;
      recordEnded = true;
      continue;
    }
    const match = /^([A-Z][A-Z0-9_]*):([0-9]{1,8})(?::[A-Z])?$/.exec(tag);
    if (!match) fail(`Etiqueta ADIF no admitida: ${tag}`);
    const [, name, lengthText] = match;
    const length = Number(lengthText);
    if (Object.keys(fields).length >= 512) fail("Demasiados campos en un registro.");
    if (length > text.length - offset) fail(`Campo truncado: ${name}`);
    if (Object.hasOwn(fields, name)) fail(`Campo duplicado: ${name}`);
    fields[name] = text.slice(offset, offset + length);
    offset += length;
    recordEnded = false;
  }
  if (!empty()) fail("Falta <EOR> en el ultimo registro.");
  if (!contacts.length) fail("El ADIF no contiene contactos.");
  return { contacts, ignoredFields: [...ignored].sort() };
}

function toContact(fields, number) {
  const need = name => {
    const value = fields[name];
    if (value === undefined || !value.trim()) fail(`Registro ${number}: falta ${name}.`);
    return value.trim();
  };
  const date = need("QSO_DATE");
  const time = need("TIME_ON");
  if (!/^[0-9]{8}$/.test(date) || !/^[0-9]{4}([0-9]{2})?$/.test(time)) fail(`Registro ${number}: fecha u hora no validas.`);
  const padded = time.padEnd(6, "0");
  const utc = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), +padded.slice(0, 2), +padded.slice(2, 4), +padded.slice(4, 6)));
  const iso = utc.toISOString();
  if (iso.slice(0, 10).replace(/-/g, "") !== date || +padded.slice(0, 2) > 23 || +padded.slice(2, 4) > 59 || +padded.slice(4, 6) > 59) fail(`Registro ${number}: fecha u hora no validas.`);
  const contact = {
    call: need("CALL").toUpperCase(), utc: iso, frequencyMHz: need("FREQ"), mode: need("MODE").toUpperCase(),
    sent: need("RST_SENT"), received: need("RST_RCVD"), notes: fields.COMMENT || ""
  };
  for (const key of PROGRESS) if (fields[key] !== undefined && key !== "BAND") contact[key.toLowerCase()] = fields[key].trim();
  return contact;
}

const field = (name, value) => {
  if (!/^[\x20-\x7e]*$/.test(value)) fail("El ADIF exportado solo admite ASCII.");
  return `<${name}:${value.length}>${value}`;
};

// stationCall / myGrid are optional station metadata, exported as STATION_CALLSIGN / MY_GRIDSQUARE.
function exportAdif(contacts, { stationCall = "", myGrid = "" } = {}) {
  let out = "RadiCodex by BricoHams\n<ADIF_VER:5>3.1.4<PROGRAMID:9>RadiCodex<EOH>\n";
  for (const contact of contacts) {
    const when = new Date(contact.utc);
    if (Number.isNaN(when.getTime())) fail("Fecha UTC no valida.");
    const iso = when.toISOString();
    out += field("CALL", contact.call) + field("QSO_DATE", iso.slice(0, 10).replace(/-/g, "")) + field("TIME_ON", iso.slice(11, 19).replace(/:/g, ""));
    const b = band(contact.frequencyMHz);
    if (b) out += field("BAND", b);
    out += field("FREQ", contact.frequencyMHz) + field("MODE", contact.mode) + field("RST_SENT", contact.sent) + field("RST_RCVD", contact.received);
    if (contact.notes) out += field("COMMENT", contact.notes);
    if (contact.dxcc) out += field("DXCC", contact.dxcc);
    if (contact.country) out += field("COUNTRY", contact.country);
    if (contact.state) out += field("STATE", contact.state);
    if (contact.gridsquare) out += field("GRIDSQUARE", contact.gridsquare);
    if (contact.pota_ref) out += field("POTA_REF", contact.pota_ref);
    if (stationCall) out += field("STATION_CALLSIGN", stationCall);
    if (myGrid) out += field("MY_GRIDSQUARE", myGrid);
    out += "<EOR>\n";
  }
  return out;
}

const slot = contact => `${contact.call}|${band(contact.frequencyMHz) || contact.frequencyMHz}|${contact.mode}`;

// Earlier contact with the same call, band (or exact frequency outside bands) and mode (Models.kt `duplicateOf`, general log).
function findDupe(contact, existing) {
  const key = slot(contact);
  return existing.find(other => other !== contact && slot(other) === key) || null;
}

const US_STATES = Object.freeze(["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]);
const US_DXCC = "291";

// Progress counted only from fields the log itself carries: DXCC from DXCC (entity code), WAS from STATE of US contacts
// (DXCC 291), grids from the first four characters of GRIDSQUARE, POTA from POTA_REF. A log without those fields shows 0.
function progress(contacts) {
  const dxcc = new Set();
  const was = new Set();
  const grids = new Set();
  const pota = new Set();
  for (const contact of contacts) {
    if (contact.dxcc) dxcc.add(contact.dxcc.replace(/^0+/, ""));
    if (contact.dxcc === US_DXCC && US_STATES.includes((contact.state || "").toUpperCase())) was.add(contact.state.toUpperCase());
    if (/^[A-R]{2}[0-9]{2}/i.test(contact.gridsquare || "")) grids.add(contact.gridsquare.slice(0, 4).toUpperCase());
    for (const ref of String(contact.pota_ref || "").split(",")) if (ref.trim()) pota.add(ref.trim().toUpperCase());
  }
  return { dxcc: dxcc.size, was: { worked: was.size, total: US_STATES.length, missing: US_STATES.filter(s => !was.has(s)) }, grids: grids.size, pota: pota.size };
}

// Marks a spot { call, freqMHz, mode } against the log: "new-call" (never worked), "new-slot" (call worked, not on this
// band+mode) or "worked". The entity is not derived: there is no prefix table in the repo (pendiente de fuente).
function markSpot(spot, contacts) {
  const call = String(spot.call).toUpperCase();
  const mine = contacts.filter(contact => contact.call === call);
  if (!mine.length) return "new-call";
  const wanted = `${band(spot.freqMHz) || spot.freqMHz}|${String(spot.mode || "").toUpperCase()}`;
  const seen = mine.some(contact => `${band(contact.frequencyMHz) || contact.frequencyMHz}|${contact.mode}` === wanted);
  return seen ? "worked" : "new-slot";
}

const RAD = Math.PI / 180;

// Sun position: declination and Greenwich hour angle (degrees), low-precision almanac formulas (about 0.01 degrees),
// enough for a map terminator.
function sunPosition(date) {
  const days = date.getTime() / 86_400_000 - 10_957.5; // days since J2000.0
  const meanLong = (280.460 + 0.9856474 * days) % 360;
  const anomaly = ((357.528 + 0.9856003 * days) % 360) * RAD;
  const lambda = (meanLong + 1.915 * Math.sin(anomaly) + 0.020 * Math.sin(2 * anomaly)) * RAD;
  const obliquity = (23.439 - 0.0000004 * days) * RAD;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (280.46061837 + 360.98564736629 * days) % 360;
  const ghaDeg = (((gmst - rightAscension / RAD) % 360) + 360) % 360;
  return { declination: declination / RAD, gha: ghaDeg };
}

// Sun elevation in degrees at lat/lon (east positive).
function sunElevation(lat, lon, date) {
  const { declination, gha } = sunPosition(date);
  const hour = (gha + lon) * RAD;
  const sin = Math.sin(lat * RAD) * Math.sin(declination * RAD) + Math.cos(lat * RAD) * Math.cos(declination * RAD) * Math.cos(hour);
  return Math.asin(Math.max(-1, Math.min(1, sin))) / RAD;
}

// Terminator (sun elevation 0) as [lon, lat] points every `step` degrees of longitude, from -180 to 180.
function terminator(date, step = 2) {
  const { declination, gha } = sunPosition(date);
  const dec = declination * RAD;
  const points = [];
  for (let lon = -180; lon <= 180; lon += step) {
    const hour = (gha + lon) * RAD;
    const lat = Math.atan(-Math.cos(hour) / Math.tan(dec || 1e-9)) / RAD;
    points.push([lon, lat]);
  }
  return points;
}

module.exports = { parseAdif, exportAdif, band, findDupe, progress, markSpot, sunPosition, sunElevation, terminator, US_STATES, MAX_BYTES, SUPPORTED };
