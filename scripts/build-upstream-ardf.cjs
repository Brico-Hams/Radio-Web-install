#!/usr/bin/env node
// Builds the Bricohams candidates of two Apache-2.0 upstream firmwares from their pinned commits:
//   scout-ardf       DeDuben7/quansheng-uvk5-ardf   (Scout ARDF v1.3, UV-K5 V3 / UV-K1 platform)
//   mili-admin-user  jewelux/quansheng-k5-v3-admin-user (Admin/User "MILI", RX-only preset)
// Source transforms only (never binary patching): Bricohams boot screen, a build-time marker the
// web installer recognises, and TX inhibit. Output is Beta, never boot tested, never published.
// Usage: node scripts/build-upstream-ardf.cjs --id scout-ardf --source <checkout at the pinned commit> --output <dir>
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { replaceOnce } = require("./bricohams-modules.cjs");

const root = path.join(__dirname, "..");
const SLOT_MAX = 0x1d800;

const TARGETS = Object.freeze({
  "scout-ardf": Object.freeze({
    repo: "DeDuben7/quansheng-uvk5-ardf",
    commit: "52c12b6b7fd86007a906d3fc997822a88b1fcafe",
    release: "v1.3",
    version: "1.3",
    licence: "Apache-2.0",
    hardware: ["UV-K5 V3", "UV-K1"],
    sparsePaths: ["/core/", "/platform/uv-k5-v3-py32f071/", "!/platform/uv-k5-v3-py32f071/tools/",
      "/LICENSE", "/NOTICE", "/README.md", "/CHANGELOG.md"],
    licenceFiles: ["LICENSE", "NOTICE"],
    bootlogoDir: path.join("core", "Inc", "bricohams"),
    welcomeFile: path.join("core", "Src", "ui", "welcome.c"),
    forbiddenText: ["AGGER MARTINI"]
  }),
  "mili-admin-user": Object.freeze({
    repo: "jewelux/quansheng-k5-v3-admin-user",
    commit: "dc8c1767b1e1228015bdea7608f3e52b12258899",
    release: "v0.4.3-rxonly-experimental",
    version: "0.4.3",
    licence: "Apache-2.0",
    hardware: ["UV-K5 V3", "UV-K1"],
    preset: "AdminUser-SAM-RXOnly",
    presetOutput: "quansheng.AU_SAM_RX_K5v3_K1.bin",
    sparsePaths: ["/firmware-v3/", "!/firmware-v3/tools/", "!/firmware-v3/images/", "!/firmware-v3/Dockerfile*",
      "!/firmware-v3/App/external/CMSIS_5/**/*.pdf", "/LICENSE", "/README.md", "/CHANGELOG.md"],
    licenceFiles: ["LICENSE", path.join("firmware-v3", "LICENSE")],
    bootlogoDir: path.join("firmware-v3", "App", "bricohams"),
    welcomeFile: path.join("firmware-v3", "App", "ui", "welcome.c"),
    forbiddenText: []
  })
});

const FORBIDDEN_EXTENSIONS = /\.(exe|pdf|bin|hex|elf|uf2|zip|btf)$/i;

function markerFor(id) {
  return `BHFW1:${id}:${TARGETS[id].version}`;
}

// "used" keeps the symbol in the object; the volatile read in BRANDED_BLOCK references it from code
// that is always linked, so --gc-sections keeps it. The "retain" attribute is not supported by the
// pinned GCC 13.3 for this target (-Werror=attributes), so it is not used.
function markerDefinition(id) {
  return `const char bh_fw_id[] __attribute__((used)) = "${markerFor(id)}";`;
}

const BRANDED_BLOCK = indent => [
  "(void)*(const volatile char *)bh_fw_id;",
  "memcpy(gFrameBuffer, BH_BOOTLOGO, sizeof(BH_BOOTLOGO));",
  'UI_PrintStringSmallNormal("Bricohams", 0, 127, 6);',
  "ST7565_BlitFullScreen();",
  "return;"
].map(line => `${indent}${line}`).join("\n");

// Scout: the procedural upstream welcome (third-party group identity) is bypassed; its code stays
// in the file so the Apache-2.0 header and history are untouched, and the compiler drops it.
function brandScoutWelcome(text) {
  const file = "core/Src/ui/welcome.c";
  let result = text.replace(/\r\n/g, "\n");
  if (result.includes("bh_fw_id")) throw new Error(`Punto de integracion ya aplicado: ${file}`);
  result = replaceOnce(result, '#include "scout/version.h"',
    `#include "scout/version.h"\n#include "bricohams/bootlogo.h"\n\n// Bricohams build marker (read by the web installer).\n${markerDefinition("scout-ardf")}`, file);
  return replaceOnce(result,
    "void UI_DisplayWelcome(void)\n{\n    memset(gStatusLine, 0, sizeof(gStatusLine));\n    UI_DisplayClear();\n",
    `void UI_DisplayWelcome(void)\n{\n    memset(gStatusLine, 0, sizeof(gStatusLine));\n    UI_DisplayClear();\n\n${BRANDED_BLOCK("    ")}\n`, file);
}

// Scout ships a hard-coded unlock PIN for TX. Bricohams candidates never key: the PIN no longer
// unlocks and radio_tx_start() is unreachable.
function inhibitScoutTx(text) {
  const file = "core/Src/scout/tx.c";
  const result = replaceOnce(text.replace(/\r\n/g, "\n"),
    '    s_unlocked   = ok;\n    show(ok ? "TX UNLOCKED" : "WRONG PIN");',
    '    (void)ok;\n    s_unlocked   = false;   // Bricohams candidate: TX stays inhibited\n    show("TX INHIBITED");', file);
  return replaceOnce(result, "    if (radio_tx_start() != RADIO_OK)",
    "    if (RADIO_ERROR != RADIO_OK)   // Bricohams candidate: radio_tx_start() is never called", file);
}

function brandMiliWelcome(text) {
  const file = "firmware-v3/App/ui/welcome.c";
  if (text.includes("bh_fw_id")) throw new Error(`Punto de integracion ya aplicado: ${file}`);
  const result = replaceOnce(text.replace(/\r\n/g, "\n"), '#include "bitmaps.h"',
    `#include "bitmaps.h"\n#include "bricohams/bootlogo.h"\n\n// Bricohams build marker (read by the web installer).\n${markerDefinition("mili-admin-user")}`, file);
  return replaceOnce(result, "    } else {\n        memset(WelcomeString0, 0, sizeof(WelcomeString0));",
    `    } else {\n${BRANDED_BLOCK("        ")}\n        memset(WelcomeString0, 0, sizeof(WelcomeString0));`, file);
}

function resolvePreset(presets, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Preset inheritance loop at ${name}`);
  seen.add(name);
  const preset = presets.configurePresets.find(item => item.name === name);
  if (!preset) throw new Error(`Preset ${name} not found`);
  const parents = [].concat(preset.inherits || []);
  const merged = {};
  for (const parent of parents) Object.assign(merged, resolvePreset(presets, parent, seen));
  return Object.assign(merged, preset.cacheVariables || {});
}

// MILI declares RX-only through ENABLE_PREVENT_TX; refuse to build if the effective preset does not.
function assertMiliRxOnly(presets, name) {
  const options = resolvePreset(presets, name);
  if (options.ENABLE_PREVENT_TX !== true) throw new Error(`Preset ${name} no es RX-only (ENABLE_PREVENT_TX)`);
  if (options.ENABLE_ADMIN_USER_MODE !== true) throw new Error(`Preset ${name} no activa ENABLE_ADMIN_USER_MODE`);
  return options;
}

function inspectImage(bytes, id) {
  if (bytes.length < 256 || bytes.length > SLOT_MAX) throw new Error(`Image size ${bytes.length} outside the 118 KiB slot`);
  const stack = bytes.readUInt32LE(0), reset = bytes.readUInt32LE(4);
  if (stack < 0x20000000 || stack > 0x20004000 || (stack & 3) !== 0 || (reset & 1) !== 1 ||
      reset < 0x08002801 || reset >= 0x08002800 + bytes.length) throw new Error("Invalid PY32 vectors");
  const text = bytes.toString("latin1");
  if (!text.includes(`${markerFor(id)}\0`)) throw new Error("Bricohams build marker missing from the image");
  for (const forbidden of TARGETS[id].forbiddenText)
    if (text.includes(forbidden)) throw new Error(`Upstream boot identity still present: ${forbidden}`);
  return { size: bytes.length, marker: markerFor(id) };
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function defaultRun(command, args, options) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.error}`);
  return (result.stdout || "").trim();
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(file);
    else yield file;
  }
}

const ATTRIBUTION = target => `Bricohams candidate build of ${target.repo} (${target.release}), commit ${target.commit}.
Upstream licence: ${target.licence}. The upstream LICENSE and NOTICE files are kept next to this file.
Changes made at build time (source transforms, see scripts/build-upstream-ardf.cjs): Bricohams boot screen,
build marker string, TX inhibit. Bricohams integration code is GPL-3.0-or-later (BRICOHAMS-LICENSE).
Beta: not boot tested on a radio. Not Karina. Keep all notices on redistribution.
`;

// `run` and `now` are injectable so tests never spawn a toolchain.
function buildUpstream({ id, source, output, run = defaultRun, now = () => new Date() }) {
  const target = TARGETS[id];
  if (!target) throw new Error(`Unknown candidate: ${id}`);
  const head = run("git", ["rev-parse", "HEAD"], { cwd: source });
  if (head !== target.commit) throw new Error(`Source is at ${head}, expected ${target.commit}`);
  for (const file of walk(source))
    if (FORBIDDEN_EXTENSIONS.test(file)) throw new Error(`Forbidden binary in source: ${path.relative(source, file)}`);
  for (const name of target.licenceFiles)
    if (!fs.existsSync(path.join(source, name))) throw new Error(`Missing upstream licence file: ${name}`);

  const edit = (file, transform) => {
    const full = path.join(source, file);
    fs.writeFileSync(full, transform(fs.readFileSync(full, "utf8")));
  };
  const bootlogo = fs.readFileSync(path.join(root, "firmware", "bricohams", "bootlogo.h"));
  fs.mkdirSync(path.join(source, target.bootlogoDir), { recursive: true });
  fs.writeFileSync(path.join(source, target.bootlogoDir, "bootlogo.h"), bootlogo);

  let buildDirectory, produced, options = null;
  if (id === "scout-ardf") {
    edit(target.welcomeFile, brandScoutWelcome);
    edit(path.join("core", "Src", "scout", "tx.c"), inhibitScoutTx);
    buildDirectory = path.join(source, "platform", "uv-k5-v3-py32f071");
    run("make", ["-j2", `SCOUT_GIT_HASH=${target.commit.slice(0, 7)}`], { cwd: buildDirectory });
    produced = path.join(buildDirectory, "firmware_uvk5_v3.bin");
  } else {
    const firmware = path.join(source, "firmware-v3");
    options = assertMiliRxOnly(JSON.parse(fs.readFileSync(path.join(firmware, "CMakePresets.json"), "utf8")), target.preset);
    edit(target.welcomeFile, brandMiliWelcome);
    const binary = path.join(firmware, "build", target.preset);
    run("cmake", ["--preset", target.preset, "-S", firmware, "-DEDITION_STRING=Bricohams"], { cwd: firmware });
    run("cmake", ["--build", binary, "--parallel", "2"], { cwd: firmware });
    produced = path.join(binary, target.presetOutput);
  }
  const image = fs.readFileSync(produced);
  const inspected = inspectImage(image, id);
  const toolchain = run("arm-none-eabi-gcc", ["--version"], { cwd: source }).split("\n")[0];

  const artifacts = path.join(output, "artifacts");
  fs.mkdirSync(artifacts, { recursive: true });
  const name = `bricohams.${id}.v${target.version}.bin`;
  fs.writeFileSync(path.join(artifacts, name), image);
  for (const file of target.licenceFiles)
    fs.copyFileSync(path.join(source, file), path.join(artifacts, file.split(path.sep).join("-")));
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(artifacts, "BRICOHAMS-LICENSE"));
  fs.writeFileSync(path.join(artifacts, "ATTRIBUTION.txt"), ATTRIBUTION(target));
  const info = {
    format: "bricohams-candidate-build", version: 1, id,
    firmware: name, edition: "Bricohams", hardware: target.hardware,
    upstream: { repo: target.repo, commit: target.commit, release: target.release, licence: target.licence },
    licenceFiles: target.licenceFiles.map(file => file.split(path.sep).join("-")),
    marker: inspected.marker, imageBytes: inspected.size, slotCapacityBytes: SLOT_MAX,
    ...(options ? { preset: target.preset, preventTx: true, adminUserMode: true } : {}),
    txPolicy: id === "scout-ardf" ? "inhibited: PIN never unlocks, radio_tx_start() unreachable" : "RX-only upstream preset (ENABLE_PREVENT_TX)",
    txInhibited: true, multiboot: { slotImage: true, returnToSelector: "unverified" },
    toolchain, stability: "beta", beta: true, hardwareBootTested: false,
    builtAt: now().toISOString(), binaryPatching: false
  };
  fs.writeFileSync(path.join(artifacts, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
  const sums = fs.readdirSync(artifacts).sort().filter(file => file !== "SHA256SUMS")
    .map(file => `${sha256(fs.readFileSync(path.join(artifacts, file)))}  ${file}`).join("\n");
  fs.writeFileSync(path.join(artifacts, "SHA256SUMS"), `${sums}\n`);
  return info;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].replace(/^--/, "")] = argv[index + 1];
  return args;
}

if (require.main === module) {
  const { id, source, output } = parseArgs(process.argv.slice(2));
  if (!id || !source || !output) {
    console.error("Usage: node scripts/build-upstream-ardf.cjs --id <scout-ardf|mili-admin-user> --source <checkout> --output <dir>");
    process.exit(2);
  }
  try { console.log(JSON.stringify(buildUpstream({ id, source: path.resolve(source), output: path.resolve(output) }), null, 2)); }
  catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}

module.exports = { TARGETS, markerFor, brandScoutWelcome, inhibitScoutTx, brandMiliWelcome, resolvePreset,
  assertMiliRxOnly, inspectImage, buildUpstream };
