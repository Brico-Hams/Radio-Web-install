"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readArguments, resolvePlan, inspectFirmware, brandWelcome, brandLogo, UPSTREAM } = require("../scripts/build-bricohams.cjs");
const { modulePlan, replaceOnce } = require("../scripts/bricohams-modules.cjs");
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
test("branding de bienvenida conserva mensajes, logo y modos del usuario; falla si cambia upstream", () => {
  const source = [
    "/* Apache-2.0 */",
    "PY25Q16_ReadBuffer(SETTINGS_BOOT_MESSAGE_LINE1_ADDR, WelcomeString0, 16);",
    "UI_LoadLogo();",
    '                strcpy(WelcomeString0, "WELCOME");',
    "                strcpy(WelcomeString1, WelcomeString2);",
    '                strcpy(WelcomeString0, "WELCOME");',
    'strcpy(WelcomeString1, "BIENVENUE");',
    'sprintf(WelcomeString3, "%s Edition", Edition);'
  ].join("\n");
  const branded = brandWelcome(source.replace(/\n/g, "\r\n"));
  assert.equal(branded.match(/strcpy\(WelcomeString0, "Bricohams"\)/g).length, 2);
  assert(branded.includes('"RADIO BETA"'));
  assert(branded.includes('"%s BETA", Edition'));
  for (const line of source.split("\n").slice(0, 3)) assert(branded.includes(line));
  assert.throws(() => brandWelcome(source.replace("BIENVENUE", "changed")), /ausente/);
  assert.throws(() => brandWelcome(`${source}\n${source}`), /ambiguo/);
  assert.throws(() => brandWelcome(branded), /ausente/);
});
test("bootlogo embebido usa 768 bytes originales sin leer ni escribir el logo externo", () => {
  const fs = require("node:fs");
  const { createHash } = require("node:crypto");
  const path = require("node:path");
  const header = fs.readFileSync(path.join(__dirname, "..", "firmware", "bricohams", "bootlogo.h"), "utf8");
  assert.equal(header.match(/0x[0-9A-F]{2}/g).length, 768);
  const hash = createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", "bricohams-logo.png"))).digest("hex");
  assert(header.includes(hash));
  const source = [
    '#include "ui/welcome.h"',
    "    // Skip 8-byte header, then read 128x64 bitmap (1024 B):",
    "    // page 0 -> gStatusLine, pages 1..7 -> gFrameBuffer.",
    "    PY25Q16_ReadBuffer(LOGO_BITMAP_ADDR, gStatusLine, sizeof(gStatusLine));",
    "    PY25Q16_ReadBuffer(LOGO_BITMAP_ADDR + sizeof(gStatusLine), gFrameBuffer, sizeof(gFrameBuffer));"
  ].join("\n");
  const result = brandLogo(source);
  assert(result.includes("memcpy(gFrameBuffer, BH_BOOTLOGO, sizeof(BH_BOOTLOGO));"));
  assert(result.includes('UI_PrintStringSmallNormal("Bricohams BETA", 0, 127, 6);'));
  assert(!result.includes("PY25Q16_"));
  assert.throws(() => brandLogo(source.replace("LOGO_BITMAP_ADDR,", "changed,")), /ausente/);
  assert.throws(() => brandLogo(`${source}\n${source}`), /ambiguo/);
});
test("builder local: argumentos explicitos sin opciones desconocidas", () => {
  assert.deepEqual(readArguments(["--source", "src", "--output", "out", "--option", "ENABLE_VOX=OFF"]),
    { source: "src", output: "out", preset: "Fusion", options: ["ENABLE_VOX=OFF"] });
  assert.throws(() => readArguments([]), /Uso:/);
  assert.throws(() => readArguments(["--source"]), /Falta valor/);
  assert.throws(() => readArguments(["--exec", "cmd"]), /desconocido/);
  assert.throws(() => readArguments(["--source", "a", "--source", "b"]), /duplicado/);
  assert.throws(() => readArguments(["--preset", "Fusion", "--preset", "Labs"]), /duplicado/);
});
test("builder ARDF exige integracion residente y rechaza modulos inexistentes", () => {
  const options = { ENABLE_FEAT_F4HWN_FOXHUNT: true, ENABLE_FEAT_F4HWN_OVERLAY_APPS: false, ENABLE_FEAT_F4HWN_BEACON: false };
  assert.deepEqual(modulePlan(["ardf"], options), ["ardf"]);
  assert.deepEqual(modulePlan(["satellite"], options), ["satellite"]);
  assert.deepEqual(modulePlan(["spectrum"], options), ["spectrum"]);
  assert.throws(() => modulePlan(["ardf", "satellite"], options), /separadas/);
  assert.throws(() => modulePlan(["spectrum", "satellite"], options), /separadas/);
  assert.deepEqual(modulePlan([], {}), []);
  assert.throws(() => modulePlan(["karina"], options), /no implementado/);
  assert.throws(() => modulePlan(["ardf", "ardf"], options), /duplicado/);
  assert.throws(() => modulePlan(["ardf"], { ...options, ENABLE_FEAT_F4HWN_FOXHUNT: false }), /FOXHUNT/);
  assert.throws(() => modulePlan(["ardf"], { ...options, ENABLE_FEAT_F4HWN_OVERLAY_APPS: true }), /overlay/);
  assert.throws(() => modulePlan(["ardf"], { ...options, ENABLE_FEAT_F4HWN_BEACON: true }), /BEACON/);
  assert.deepEqual(readArguments(["--source", "s", "--output", "o", "--module", "ardf"]).modules, ["ardf"]);
  assert.equal(replaceOnce("abc def", "abc", "new", "test"), "new def");
  assert.throws(() => replaceOnce("abc abc", "abc", "x", "test"), /ambiguo/);
  assert.throws(() => replaceOnce("abc", "unknown", "x", "test"), /ausente/);
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
