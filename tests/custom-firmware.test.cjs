const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const R = require("../radio-core.js");
require("../f4hwn-options.js");
require("../custom-firmware-ui.js");

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const file = (name, text) => ({ name, bytes: new TextEncoder().encode(text) });

test("el catalogo F4HWN fija el commit y Labs admite apps", () => {
  const catalog = R.F4HWN_OPTIONS;
  assert.match(catalog.upstream.commit, /^[0-9a-f]{40}$/);
  for (const preset of ["Fusion", "FieldOps", "Transfer", "Labs", "Max", "Custom"]) assert.ok(catalog.presets[preset], preset);
  assert.equal(catalog.presets.Labs.options.ENABLE_FEAT_F4HWN_OVERLAY_APPS, true);
});

test("la peticion solo lleva cambios reales sobre la edicion, en formato ON/OFF", () => {
  const catalog = { presets: { Labs: { options: { ENABLE_A: true, ENABLE_B: false } } } };
  assert.equal(R.customFirmwareRequest(catalog, "Labs", {}), "");
  assert.equal(R.customFirmwareRequest(catalog, "Labs", { ENABLE_A: true, ENABLE_B: true }), "ENABLE_B=ON");
  assert.equal(R.customFirmwareRequest(catalog, "Labs", { ENABLE_A: false, ENABLE_X: true }), "ENABLE_A=OFF");
  assert.throws(() => R.customFirmwareRequest(catalog, "Nope", {}), /desconocida/);
});

test("una compilacion solo se acepta si cada archivo coincide con SHA256SUMS", async () => {
  const bin = new Uint8Array(1024).fill(7);
  const info = JSON.stringify({ format: "bricohams-firmware-build", firmware: "f4hwn.labs.bin", preset: "Labs", options: [], upstream: { tag: "v6.3.0" } });
  const sums = `${sha(bin)}  f4hwn.labs.bin\n${sha(new TextEncoder().encode(info))}  build-info.json\n`;
  const ok = await R.verifyCustomBuild([file("SHA256SUMS", sums), { name: "f4hwn.labs.bin", bytes: bin }, file("build-info.json", info)]);
  assert.equal(ok.firmware.name, "f4hwn.labs.bin");
  assert.equal(ok.info.preset, "Labs");
  const tampered = bin.slice(); tampered[0] ^= 1;
  await assert.rejects(R.verifyCustomBuild([file("SHA256SUMS", sums), { name: "f4hwn.labs.bin", bytes: tampered }, file("build-info.json", info)]), /distinto/);
  await assert.rejects(R.verifyCustomBuild([file("SHA256SUMS", sums), { name: "f4hwn.labs.bin", bytes: bin }]), /Falta build-info/);
  const unsigned = `${sha(bin)}  f4hwn.labs.bin
`;
  await assert.rejects(R.verifyCustomBuild([file("SHA256SUMS", unsigned), { name: "f4hwn.labs.bin", bytes: bin }, file("build-info.json", info)]), /no esta en SHA256SUMS/);
  await assert.rejects(R.verifyCustomBuild([{ name: "f4hwn.labs.bin", bytes: bin }]), /Falta SHA256SUMS/);
  await assert.rejects(R.verifyCustomBuild([file("SHA256SUMS", "not a sum line")]), /no valida/);
});
