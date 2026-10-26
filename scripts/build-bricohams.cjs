"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { modulePlan, integrateModule, replaceOnce } = require("./bricohams-modules.cjs");

const UPSTREAM = Object.freeze({
  repository: "https://github.com/armel/uv-k1-k5v3-firmware-custom",
  commit: "f556a96e73c3e423a00cf473aeb37f827cac05a5",
  tag: "v6.1.0"
});
const REQUIRED = ["ENABLE_FEAT_F4HWN", "ENABLE_UART", "ENABLE_USB",
  "ENABLE_FEAT_F4HWN_MULTIBOOT", "ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY"];

function readArguments(args) {
  const result = { preset: "Fusion", options: [] };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert(["--source", "--output", "--preset", "--option", "--module"].includes(key), `Argumento desconocido: ${key}`);
    const value = args[++i];
    assert(value && !value.startsWith("--"), `Falta valor para ${key}`);
    if (key === "--module") (result.modules ??= []).push(value);
    else if (key === "--option") result.options.push(value);
    else {
      const name = key.slice(2);
      assert(!seen.has(name), `Argumento duplicado: ${key}`);
      seen.add(name);
      result[name] = value;
    }
  }
  assert(result.source && result.output, "Uso: node scripts/build-bricohams.cjs --source <Fusion61> --output <directorio nuevo> [--preset Fusion|Labs|FieldOps|Transfer] [--option ENABLE_XXX=OFF] [--module ardf|satellite|spectrum]");
  return result;
}

function resolvePlan(catalog, preset, changes) {
  assert(["Fusion", "Labs", "FieldOps", "Transfer"].includes(preset), "Edicion no admitida para Bricohams Multiboot.");
  const visiting = new Set();
  function inherit(name) {
    assert(!visiting.has(name), `Herencia circular: ${name}`);
    const entry = catalog.configurePresets.find(item => item.name === name);
    assert(entry, `Preset ausente: ${name}`);
    visiting.add(name);
    const parents = entry.inherits ? [].concat(entry.inherits) : [];
    const values = {};
    for (const parent of parents.reverse()) Object.assign(values, inherit(parent));
    Object.assign(values, entry.cacheVariables);
    visiting.delete(name);
    return values;
  }
  const defaults = inherit(preset);
  assert.equal(defaults.VERSION_STRING_2, UPSTREAM.tag, "Version de fuentes distinta de la fijada.");
  const options = Object.fromEntries(Object.entries(defaults).filter(([, value]) => typeof value === "boolean"));
  const requested = new Set();
  for (const change of changes) {
    const match = /^(ENABLE_[A-Z0-9_]+)=(ON|OFF)$/.exec(change);
    assert(match && Object.hasOwn(options, match[1]), `Opcion desconocida o valor no valido: ${change}`);
    assert(!requested.has(match[1]), `Opcion duplicada: ${match[1]}`);
    requested.add(match[1]);
    options[match[1]] = match[2] === "ON";
  }
  assert(!options.DEV, "No se admiten builds de desarrollo.");
  for (const name of REQUIRED) assert(options[name], `${name} debe estar ON para este perfil Multiboot.`);
  const delta = Object.keys(options).filter(name => options[name] !== defaults[name])
    .sort().map(name => `${name}=${options[name] ? "ON" : "OFF"}`);
  return { options, delta };
}

function inspectFirmware(bytes) {
  require("../radio-core.js");
  const R = require("../quansheng-connector.js");
  const result = R.inspectQuanshengSlotImage(new Uint8Array(bytes));
  assert.equal(`v${result.version}`, UPSTREAM.tag, "Version del binario distinta de la fijada.");
  assert(bytes.includes(Buffer.from("Bricohams")), "El binario no contiene la identidad de la edicion Bricohams.");
  return result;
}

function brandWelcome(text) {
  const file = "App/ui/welcome.c";
  let result = text.replace(/\r\n/g, "\n");
  result = replaceOnce(result,
    '                strcpy(WelcomeString0, "WELCOME");\n                strcpy(WelcomeString1, WelcomeString2);',
    '                strcpy(WelcomeString0, "Bricohams");\n                strcpy(WelcomeString1, WelcomeString2);', file);
  result = replaceOnce(result,
    '                strcpy(WelcomeString0, "WELCOME");',
    '                strcpy(WelcomeString0, "Bricohams");', file);
  result = replaceOnce(result, 'strcpy(WelcomeString1, "BIENVENUE");',
    'strcpy(WelcomeString1, "RADIO BETA");', file);
  return replaceOnce(result, 'sprintf(WelcomeString3, "%s Edition", Edition);',
    'sprintf(WelcomeString3, "%s BETA", Edition);', file);
}

function brandLogo(text) {
  let result = replaceOnce(text, '#include "ui/welcome.h"',
    '#include "ui/welcome.h"\n#include "bricohams/bootlogo.h"', "App/ui/welcome.c");
  result = replaceOnce(result,
    "    PY25Q16_ReadBuffer(LOGO_BITMAP_ADDR, gStatusLine, sizeof(gStatusLine));\n    PY25Q16_ReadBuffer(LOGO_BITMAP_ADDR + sizeof(gStatusLine), gFrameBuffer, sizeof(gFrameBuffer));",
    '    UI_StatusClear();\n    UI_DisplayClear();\n    memcpy(gFrameBuffer, BH_BOOTLOGO, sizeof(BH_BOOTLOGO));\n    UI_PrintStringSmallNormal("Bricohams BETA", 0, 127, 6);', "App/ui/welcome.c");
  return replaceOnce(result,
    "    // Skip 8-byte header, then read 128x64 bitmap (1024 B):\n    // page 0 -> gStatusLine, pages 1..7 -> gFrameBuffer.",
    "    // Embedded branding leaves the external-flash custom logo untouched.", "App/ui/welcome.c");
}

function build(args) {
  const source = path.resolve(args.source);
  const output = path.resolve(args.output);
  assert(!fs.existsSync(output), `El destino ya existe; usa un directorio nuevo: ${output}`);
  const capture = (command, argv, cwd = source, env = process.env) =>
    execFileSync(command, argv, { cwd, env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
  assert.equal(capture("git", ["rev-parse", `${UPSTREAM.commit}^{commit}`]), UPSTREAM.commit);
  const catalog = JSON.parse(capture("git", ["show", `${UPSTREAM.commit}:CMakePresets.json`]));
  const plan = resolvePlan(catalog, args.preset, args.options);
  const modules = modulePlan(args.modules ?? [], plan.options);
  const dirty = capture("git", ["status", "--porcelain"]);
  if (dirty) console.warn("AVISO: hay cambios locales en las fuentes; NO se incluyen. Se compila exclusivamente el commit fijado.");
  const epoch = capture("git", ["show", "-s", "--format=%ct", UPSTREAM.commit]);
  assert(/^\d+$/.test(epoch), "Fecha del commit no valida.");
  const env = { ...process.env, SOURCE_DATE_EPOCH: epoch, TZ: "UTC", LC_ALL: "C" };
  const compiler = capture("arm-none-eabi-gcc", ["--version"], source, env);
  const cmake = capture("cmake", ["--version"], source, env);
  const ninja = capture("ninja", ["--version"], source, env);
  fs.mkdirSync(output, { recursive: true });
  const work = path.join(output, "source");
  const binary = path.join(output, "build");
  const artifacts = path.join(output, "artifacts");
  const run = (command, argv, cwd = output) => {
    execFileSync(command, argv, { cwd, env, stdio: "inherit" });
  };
  run("git", ["clone", "--local", "--no-hardlinks", "--no-checkout", source, work]);
  run("git", ["-C", work, "checkout", "--detach", UPSTREAM.commit]);
  const moduleSources = modules.length ? integrateModule(work, modules[0]) : [];
  const welcomeFile = path.join(work, "App", "ui", "welcome.c");
  const welcome = brandLogo(brandWelcome(fs.readFileSync(welcomeFile, "utf8")));
  fs.writeFileSync(welcomeFile, welcome);
  const bootlogoFile = path.join(work, "App", "bricohams", "bootlogo.h");
  const bootlogo = fs.readFileSync(path.join(__dirname, "..", "firmware", "bricohams", "bootlogo.h"));
  fs.mkdirSync(path.dirname(bootlogoFile), { recursive: true });
  fs.writeFileSync(bootlogoFile, bootlogo);
  const brandingSources = [{ file: "App/ui/welcome.c",
    sha256: createHash("sha256").update(welcome).digest("hex") },
  { file: "App/bricohams/bootlogo.h", sha256: createHash("sha256").update(bootlogo).digest("hex") }];
  run("cmake", ["--preset", args.preset, "-S", work, "-B", binary,
    "-DTARGET=bricohams", "-DEDITION_STRING=Bricohams", "-DDEV=OFF",
    ...Object.entries(plan.options).map(([name, value]) => `-D${name}=${value ? "ON" : "OFF"}`)], work);
  run("cmake", ["--build", binary, "--parallel", "2"], work);
  const bytes = fs.readFileSync(path.join(binary, "bricohams.bin"));
  const inspected = inspectFirmware(bytes);
  const sizeReport = capture("arm-none-eabi-size", ["-A", path.join(binary, "bricohams.elf")], work, env);
  const firmware = `bricohams.${args.preset.toLowerCase()}${modules.length ? `.${modules.join(".")}` : ""}.${UPSTREAM.tag}.bin`;
  const info = {
    format: "bricohams-firmware-build", version: 1, firmware, preset: args.preset,
    edition: "Bricohams", hardware: ["UV-K5 V3", "UV-K1"], upstream: UPSTREAM,
    options: plan.delta, effectiveOptions: plan.options,
    sourceDateEpoch: Number(epoch), toolchain: { compiler, cmake, ninja },
    imageBytes: inspected.size, sourceChangesIncluded: false,
    hardwareTested: false, derivedFromKarina: false,
    modules, moduleSources, brandingSources, integrationTestedOnHardware: false,
    ...(modules.includes("satellite") ? { catRx: { version: 1, command: 0x7b00,
      reply: 0x7b01, leaseMilliseconds: 3000, physicalEnableKey: "8",
      persistentWrites: false, transmitControl: false, hardwareValidated: false },
      catTx: { version: 1, command: 0x7b02, reply: 0x7b03, leaseMilliseconds: 1500,
      maxTransmitMilliseconds: 120000, physicalArmKey: "9", anyKeyAborts: true,
      radioTxGates: true, persistentWrites: false, hardwareValidated: false } } : {}),
    ...(modules.includes("spectrum") ? { spectrumPresets: { version: 1, command: 0x7b10,
      reply: 0x7b11, blobBytes: 208, chunkBytes: 104, pausedScanRequired: true,
      persistentWrites: false, hardwareValidated: false } } : {}),
    ...(modules.includes("ardf") ? { ardfStatistics: { version: 1, command: 0x7b20,
      reply: 0x7b21, snapshotBytes: 140, manualObservationKey: "8",
      persistentWrites: false, hardwareValidated: false } } : {}),
    stability: "beta", validation: "Structural checks only; physical validation pending"
  };
  fs.mkdirSync(artifacts);
  fs.writeFileSync(path.join(artifacts, firmware), bytes);
  fs.copyFileSync(path.join(binary, "bricohams.elf"), path.join(artifacts, "bricohams.elf"));
  fs.copyFileSync(path.join(binary, "bricohams.map"), path.join(artifacts, "bricohams.map"));
  for (const name of ["LICENSE", "NOTICE"]) fs.copyFileSync(path.join(work, name), path.join(artifacts, name));
  fs.copyFileSync(path.join(__dirname, "..", "LICENSE"), path.join(artifacts, "BRICOHAMS-LICENSE"));
  fs.writeFileSync(path.join(artifacts, "MODULE-NOTICE.txt"),
    "Bricohams integration code and independent modules: GPL-3.0-or-later (BRICOHAMS-LICENSE).\nUpstream components retain their Apache-2.0 LICENSE and NOTICE.\nThe source checkout alongside artifacts contains the applied integration and brandingSources.\nBricohams boot artwork: monochrome adaptation of the project bricohams-logo.png; source SHA256 in bootlogo.h.\nOriginal artwork: Bricohams Studio assets/logo-bricohams.png, commit 767edd66028d10f859346190d0c8044bd8e5a2b2.\nArtwork attribution does not grant trademark rights or relicense third-party artwork.\nNot Karina; no hardware validation. Keep all notices on redistribution.\n");
  fs.writeFileSync(path.join(artifacts, "size.txt"), `${sizeReport}\n`);
  fs.writeFileSync(path.join(artifacts, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
  const names = fs.readdirSync(artifacts).sort();
  const sums = names.map(name => `${createHash("sha256").update(fs.readFileSync(path.join(artifacts, name))).digest("hex")}  ${name}`).join("\n");
  fs.writeFileSync(path.join(artifacts, "SHA256SUMS"), `${sums}\n`);
  console.log(`Artefactos verificados estructuralmente: ${artifacts}\n${firmware}: ${inspected.size} bytes. Sin prueba fisica ni escritura en radio.`);
  return { artifacts, info };
}

if (require.main === module) {
  try { build(readArguments(process.argv.slice(2))); }
  catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { UPSTREAM, readArguments, resolvePlan, inspectFirmware, brandWelcome, brandLogo, build };
