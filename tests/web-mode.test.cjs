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
