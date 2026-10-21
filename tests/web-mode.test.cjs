const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const R = require("../radio-core.js");
require("../runtime-mode.js");
const { createServer } = require("../server.cjs");

test("runtime: local only when server says so", async () => {
  const ok = body => async () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "local" })), { mode: "local" });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "admin" })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("nope", { status: 404 })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("<html>", { headers: { "content-type": "text/html" } })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => { throw new TypeError("Failed to fetch"); }), { mode: "web" });
});

test("server serves runtime.json as local", async () => {
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/runtime.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(await response.json(), { mode: "local" });
    assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  } finally {
    server.close();
  }
});

test("app refuses to run framed and paints the mode badge", () => {
  const app = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /window\.top !== window\.self/);
  assert.match(app, /mode-badge/);
  assert.match(app, /Web · GitHub Pages/);
  assert.match(app, /Local · instalado/);
});

// Firmware (Task 3)
require("../firmware-catalog.js");
const { createHash } = require("node:crypto");
const f4Repo = "https://github.com/armel/uv-k1-k5v3-firmware-custom";
function f4Image() {
  const data = Buffer.alloc(512);
  data.writeUInt32LE(0x20003000, 0);
  data.writeUInt32LE(0x08002841, 4);
  return data;
}
const fakeRelease = (data = f4Image()) => ({
  tag_name: "v6.2.0", html_url: `${f4Repo}/releases/tag/v6.2.0`, draft: false, prerelease: false,
  assets: [{ name: "f4hwn.labs.v6.2.0.bin", state: "uploaded", size: data.length,
    digest: `sha256:${createHash("sha256").update(data).digest("hex")}`,
    browser_download_url: `${f4Repo}/releases/download/v6.2.0/f4hwn.labs.v6.2.0.bin` }]
});
const gd77ManualEntry = { target: "GD-77", family: "MK22", url: "https://www.opengd77.com/downloads/releases/MK22/",
  expectedSHA256: null, size: null, format: "zip", slotCompatible: false };

test("web firmware: F4HWN file must match published size and digest", async () => {
  const data = new Uint8Array(4096).fill(7);
  const entry = { target: "UV-K1", family: "quansheng", format: "bin", slotCompatible: true, size: 4096, expectedSHA256: await R.sha256(data) };
  const { manifest } = await R.verifyLocalFirmware(entry, data);
  assert.equal(manifest.publisherHashVerified, true);
  assert.equal(manifest.sha256, entry.expectedSHA256);
  await assert.rejects(R.verifyLocalFirmware(entry, data.slice(0, 4095)), /tamano/i);
  const other = new Uint8Array(4096).fill(8);
  await assert.rejects(R.verifyLocalFirmware(entry, other), /SHA-256/);
});
test("web firmware: OpenGD77 manual file is never marked publisher-verified", async () => {
  const { manifest } = await R.verifyLocalFirmware(gd77ManualEntry, new Uint8Array(2048));
  assert.equal(manifest.publisherHashVerified, false);
  assert.equal(manifest.backupSubstitute, false);
  assert.equal(manifest.manifestFormat, "radio-workspace-firmware-download");
});
test("web firmware: files over 4 MiB are rejected", async () => {
  await assert.rejects(R.verifyLocalFirmware(gd77ManualEntry, new Uint8Array(4 * 1024 * 1024 + 1)), /4 MiB/);
});
test("firmware-core is shared: service and browser parse the same release identically", () => {
  assert.deepEqual(R.firmwareCore.parseF4Release(fakeRelease(), "UV-K1"), require("../firmware-service.cjs").parseF4Release(fakeRelease(), "UV-K1"));
  assert.throws(() => R.firmwareCore.parseF4Release({ ...fakeRelease(), prerelease: true }, "UV-K1"), { status: 502 });
});

test("web firmware: OpenGD77 manual file checks name, model and ZIP signature", async () => {
  const zip = new Uint8Array(2048);
  zip.set([0x50, 0x4b, 3, 4]);
  const ok = await R.verifyLocalFirmware(gd77ManualEntry, zip, "OpenGD77.zip");
  assert.equal(ok.manifest.publisherHashVerified, false);
  await assert.rejects(R.verifyLocalFirmware(gd77ManualEntry, zip, "random.zip"), /nombre/);
  await assert.rejects(R.verifyLocalFirmware(gd77ManualEntry, zip, "OpenGD77S.zip"), /nombre/);
  await assert.rejects(R.verifyLocalFirmware(gd77ManualEntry, new Uint8Array(2048), "OpenGD77.zip"), /ZIP/);
  await assert.rejects(R.verifyLocalFirmware(gd77ManualEntry, new Uint8Array(4 * 1024 * 1024 + 1), "OpenGD77.zip"), /4 MiB/);
});
test("web firmware: every firmware-download access is guarded in web mode", () => {
  const lines = require("node:fs").readFileSync(require("node:path").join(__dirname, "../firmware-catalog.js"), "utf8").split("\n");
  const unguarded = lines.filter(line => /\$\("firmware-download"\)/.test(line) && !/if \(!?(web|\$\("firmware-download"\))\)/.test(line) && !line.includes('<button id="firmware-download"'));
  assert.deepEqual(unguarded, []);
});

require("../planning-core.js");
require("../radioid-csv.js");
const header = "RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY\n";
test("RadioID CSV: filters by country/region and keeps provider shape", () => {
  const csv = header + "2141234,EA4ABC,Ana,Lopez,Madrid,Madrid,Spain\n3101234,K1ABC,Bob,Smith,Boston,Massachusetts,United States\n";
  const { entries } = R.parseRadioIdCSV(csv, { country: "Spain" });
  assert.deepEqual(entries, [{ id: 2141234, callsign: "EA4ABC", name: "Ana Lopez", country: "Spain", region: "Madrid", city: "Madrid", source: "https://radioid.net", kind: "private" }]);
  assert.equal(R.parseRadioIdCSV(csv, { country: "spain", region: "madrid" }).entries.length, 1);
  assert.equal(R.parseRadioIdCSV(csv, { country: "spain", region: "Sevilla" }).entries.length, 0);
});
test("RadioID CSV: handles quoted commas and skips invalid ids", () => {
  const csv = header + '2141234,EA4ABC,"Ana, Maria",Lopez,Madrid,Madrid,Spain\n99999999,EA4BAD,X,Y,C,D,Spain\n0,EA4ZERO,X,Y,C,D,Spain\n';
  const { entries, total } = R.parseRadioIdCSV(csv, { country: "Spain" });
  assert.equal(total, 1);
  assert.equal(entries[0].name, "Ana, Maria Lopez");
});
test("RadioID CSV: rejects foreign CSV, oversize text, and caps rows", () => {
  assert.throws(() => R.parseRadioIdCSV("a,b,c\n1,2,3\n", { country: "Spain" }), /RadioID/);
  assert.throws(() => R.parseRadioIdCSV("", { country: "Spain" }), /RadioID/);
  assert.throws(() => R.parseRadioIdCSV({ length: 100 * 1024 * 1024 + 1 }, { country: "Spain" }), /100 MiB/);
  const many = header + Array.from({ length: 5001 }, (_, i) => `${2140000 + i},EA${i},A,B,C,D,Spain`).join("\n");
  const result = R.parseRadioIdCSV(many, { country: "Spain" });
  assert.equal(result.entries.length, 5000); assert.equal(result.truncated, true); assert.equal(result.total, 5001);
});
test("profile validates callsign and 7-digit DMR id, and tolerates missing storage", () => {
  assert.throws(() => R.profile.set({ callsign: "e4", dmrId: "2141234" }), /indicativo/i);
  assert.throws(() => R.profile.set({ callsign: "EA4ABC", dmrId: "214123" }), /ID DMR/);
  assert.equal(R.profile.get(), null);
  const store = {};
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
  try {
    assert.deepEqual(R.profile.set({ callsign: "ea4abc", dmrId: "2141234" }), { callsign: "EA4ABC", dmrId: "2141234" });
    assert.deepEqual(R.profile.get(), { callsign: "EA4ABC", dmrId: "2141234" });
    R.profile.clear();
    assert.equal(R.profile.get(), null);
  } finally { delete globalThis.localStorage; }
});

// Satellites (Task 5)
require("../planning-core.js");
const { buildSatellites } = require("../scripts/fetch-satellites.cjs");
const issTle = [
  "1 25544U 98067A   26291.78980200  .00007771  00000-0  14938-3 0  9994",
  "2 25544  51.6325  48.4339 0006764 280.4294  79.5932 15.48929442590914"
];
// Same orbit with another NORAD and a recomputed checksum: valid for the validator, not a real satellite.
function tleFor(norad) {
  return issTle.map(line => {
    const body = line.slice(0, 2) + String(norad).padStart(5, "0") + line.slice(7, 68);
    let sum = 0;
    for (const char of body) sum += /\d/.test(char) ? Number(char) : char === "-" ? 1 : 0;
    return body + (sum % 10);
  });
}
function fakeDataService({ ok = [], fail = [] }) {
  return {
    async satellite({ norad }) {
      if (!ok.includes(norad)) throw new Error("offline");
      const [tle1, tle2] = tleFor(norad);
      return { norad, name: `SAT-${norad}`, tle1, tle2, source: `https://db.satnogs.org/api/tle/?norad_cat_id=${norad}` };
    },
    async transmitters({ norad }) {
      if (!ok.includes(norad)) throw new Error("offline");
      return { norad, entries: [{ id: `tx-${norad}`, name: "FM", mode: "FM", downlink: 145800000 }] };
    }
  };
}
const satNow = Date.parse("2026-10-21T05:00:00Z");
test("satellites: builds file, falls back per satellite to previous, fails when nothing valid", async () => {
  const all = [25544, 27607, 43017, 43678];
  const previous = await buildSatellites({ dataService: fakeDataService({ ok: all }), now: satNow });
  const file = await buildSatellites({ dataService: fakeDataService({ ok: [25544] }), previous, now: satNow });
  assert.equal(file.satellites.length, 4);
  assert.equal(file.satellites.find(s => s.norad === 25544).stale, false);
  assert.equal(file.satellites.find(s => s.norad === 27607).stale, true);
  assert.equal(R.validateSatellitesFile(file).satellites.length, 4);
  await assert.rejects(buildSatellites({ dataService: fakeDataService({}), previous: null, now: satNow }), /satelite/i);
  const corrupt = { ...previous, format: "other" };
  await assert.rejects(buildSatellites({ dataService: fakeDataService({}), previous: corrupt, now: satNow }), /satelite/i);
});
test("satellites file validation and age warning", async () => {
  const validFile = await buildSatellites({ dataService: fakeDataService({ ok: [25544] }), now: satNow });
  assert.throws(() => R.validateSatellitesFile({ format: "x" }), /formato/i);
  assert.throws(() => R.validateSatellitesFile({ ...validFile, version: 2 }), /formato/i);
  const bad = structuredClone(validFile); bad.satellites[0].tle1 = bad.satellites[0].tle1.replace("25544", "99999");
  assert.throws(() => R.validateSatellitesFile(bad), /NORAD/);
  assert.equal(R.satelliteAgeWarning(validFile, Date.parse(validFile.fetchedAt) + 6 * 864e5), null);
  assert.match(R.satelliteAgeWarning(validFile, Date.parse(validFile.fetchedAt) + 8 * 864e5), /7 dias|7 días/);
});
