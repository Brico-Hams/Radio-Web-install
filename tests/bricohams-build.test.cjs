"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readArguments, resolvePlan, inspectFirmware, UPSTREAM } = require("../scripts/build-bricohams.cjs");
const required = {
  DEV: false, VERSION_STRING_2: UPSTREAM.tag, ENABLE_VOX: true,
  ENABLE_FEAT_F4HWN: true, ENABLE_UART: true, ENABLE_USB: true,
  ENABLE_FEAT_F4HWN_MULTIBOOT: true, ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY: true
};
const catalog = { configurePresets: [
  { name: "default", cacheVariables: required },
  { name: "Fusion", inherits: "default", cacheVariables: {} },
  { name: "Labs", inherits: "Fusion", cacheVariables: { ENABLE_FEAT_F4HWN_OVERLAY_APPS: true } }
] };
test("builder local: argumentos explicitos sin opciones desconocidas", () => {
  assert.deepEqual(readArguments(["--source", "src", "--output", "out", "--option", "ENABLE_VOX=OFF"]),
    { source: "src", output: "out", preset: "Fusion", options: ["ENABLE_VOX=OFF"] });
  assert.throws(() => readArguments([]), /Uso:/);
  assert.throws(() => readArguments(["--source"]), /Falta valor/);
  assert.throws(() => readArguments(["--exec", "cmd"]), /desconocido/);
  assert.throws(() => readArguments(["--source", "a", "--source", "b"]), /duplicado/);
  assert.throws(() => readArguments(["--preset", "Fusion", "--preset", "Labs"]), /duplicado/);
});
test("builder local: herencia y cambios modulares conservan multiboot", () => {
  const plan = resolvePlan(catalog, "Labs", ["ENABLE_VOX=OFF"]);
  assert.equal(plan.options.ENABLE_VOX, false);
  assert.equal(plan.options.ENABLE_FEAT_F4HWN_OVERLAY_APPS, true);
  assert.equal(plan.options.ENABLE_FEAT_F4HWN_MULTIBOOT, true);
  assert.deepEqual(plan.delta, ["ENABLE_VOX=OFF"]);
  assert.deepEqual(resolvePlan(catalog, "Fusion", ["ENABLE_VOX=ON"]).delta, []);
});
test("builder local: rechaza opciones ambiguas y desactivar protecciones del perfil", () => {
  for (const changes of [
    ["ENABLE_UNKNOWN=ON"], ["ENABLE_VOX=yes"], ["DEV=ON"],
    ["ENABLE_VOX=OFF", "ENABLE_VOX=ON"], ["ENABLE_UART=OFF"],
    ["ENABLE_FEAT_F4HWN_MULTIBOOT=OFF"], ["ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY=OFF"]
  ]) assert.throws(() => resolvePlan(catalog, "Fusion", changes));
  assert.throws(() => resolvePlan(catalog, "Custom", []), /Edicion/);
  const wrong = structuredClone(catalog);
  wrong.configurePresets[0].cacheVariables.VERSION_STRING_2 = "v5.0.0";
  assert.throws(() => resolvePlan(wrong, "Fusion", []), /Version/);
  assert.throws(() => resolvePlan({ configurePresets: [{ name: "Fusion", inherits: "Fusion" }] }, "Fusion", []), /circular/);
});
test("builder local: valida version, identidad, vectores y limites de la imagen final", () => {
  const bytes = Buffer.alloc(1024);
  bytes.writeUInt32LE(0x20003ff0, 0);
  bytes.writeUInt32LE(0x08002901, 4);
  bytes.write("F4HWN v6.1.0\0Bricohams\0", 64);
  assert.deepEqual(inspectFirmware(bytes), { version: "6.1.0", size: 1024 });
  const v1 = Buffer.from(bytes);
  v1.writeUInt32LE(0x10b, 4);
  assert.throws(() => inspectFirmware(v1), /PY32/);
  const unbranded = Buffer.from(bytes);
  unbranded.fill(0, 77);
  assert.throws(() => inspectFirmware(unbranded), /identidad/);
  const wrong = Buffer.from(bytes);
  wrong.write("F4HWN v6.2.0", 64);
  assert.throws(() => inspectFirmware(wrong), /Version/);
  assert.throws(() => inspectFirmware(Buffer.alloc(0x1d801)), /118 KiB/);
});
