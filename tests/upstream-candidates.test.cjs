const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TARGETS, markerFor, brandScoutWelcome, inhibitScoutTx, brandMiliWelcome, resolvePreset, assertMiliRxOnly,
  inspectImage, buildUpstream } = require("../scripts/build-upstream-ardf.cjs");

const scoutWelcome = [
  '#include "scout/version.h"', "", "extern uint8_t gStatusLine[128];", "",
  "void UI_DisplayWelcome(void)", "{", "    memset(gStatusLine, 0, sizeof(gStatusLine));", "    UI_DisplayClear();", "",
  '    UI_PrintStringSmallNormal("AGGER MARTINI", 0, 128, 4);', "}"
].join("\n");
const scoutTx = [
  "    s_pin_active = false;", "    s_unlocked   = ok;", '    show(ok ? "TX UNLOCKED" : "WRONG PIN");', "",
  "    if (radio_tx_start() != RADIO_OK)"
].join("\n");
const miliWelcome = ['#include "bitmaps.h"', "    } else {", "        memset(WelcomeString0, 0, sizeof(WelcomeString0));"].join("\n");

test("Scout: boot screen is Bricohams only, with the marker kept by the linker", () => {
  const result = brandScoutWelcome(scoutWelcome.replace(/\n/g, "\r\n"));
  assert(result.includes('#include "bricohams/bootlogo.h"'));
  assert(result.includes(`"${markerFor("scout-ardf")}"`) && result.includes("__attribute__((used))"));
  assert(!result.includes("retain"), "retain is rejected by GCC 13.3 with -Werror=attributes");
  assert(result.includes("(void)*(const volatile char *)bh_fw_id;"), "marker referenced from linked code");
  const body = result.slice(result.indexOf("void UI_DisplayWelcome"));
  assert(body.indexOf("BH_BOOTLOGO") < body.indexOf("AGGER MARTINI") && body.indexOf("return;") < body.indexOf("AGGER MARTINI"));
  assert.throws(() => brandScoutWelcome(scoutWelcome.replace("UI_DisplayClear", "changed")), /ausente/);
  assert.throws(() => brandScoutWelcome(result), /ya aplicado/);
});

test("Scout: the PIN never unlocks TX and radio_tx_start is unreachable", () => {
  const result = inhibitScoutTx(scoutTx);
  assert(result.includes("s_unlocked   = false;") && !result.includes("TX UNLOCKED") && !result.includes("= ok;"));
  assert(result.includes("RADIO_ERROR != RADIO_OK") && !result.includes("radio_tx_start() !="));
  assert.throws(() => inhibitScoutTx(scoutTx.replace("s_unlocked   = ok;", "s_unlocked = ok;")), /ausente/);
  assert.throws(() => inhibitScoutTx(inhibitScoutTx(scoutTx)), /ausente/);
});

test("MILI: Bricohams logo returns before the upstream text screen", () => {
  const result = brandMiliWelcome(miliWelcome);
  assert(result.indexOf("BH_BOOTLOGO") < result.indexOf("return;") && result.indexOf("return;") < result.indexOf("memset(WelcomeString0"));
  assert(result.includes(markerFor("mili-admin-user")) && !result.includes("retain"));
  assert(result.indexOf("(void)*(const volatile char *)bh_fw_id;") > result.indexOf("} else {"));
  assert.throws(() => brandMiliWelcome(miliWelcome.replace("} else {", "} else if (x) {")), /ausente/);
});

test("MILI: only a preset that inherits ENABLE_PREVENT_TX=true builds", () => {
  const presets = { configurePresets: [
    { name: "base", cacheVariables: { ENABLE_PREVENT_TX: false } },
    { name: "admin", inherits: "base", cacheVariables: { ENABLE_ADMIN_USER_MODE: true, ENABLE_PREVENT_TX: false } },
    { name: "rx", inherits: "admin", cacheVariables: { ENABLE_PREVENT_TX: true } },
    { name: "loop", inherits: "loop" }] };
  assert.equal(resolvePreset(presets, "rx").ENABLE_PREVENT_TX, true);
  assert.equal(assertMiliRxOnly(presets, "rx").ENABLE_ADMIN_USER_MODE, true);
  assert.throws(() => assertMiliRxOnly(presets, "admin"), /RX-only/);
  assert.throws(() => resolvePreset(presets, "loop"), /loop/);
  assert.throws(() => resolvePreset(presets, "missing"), /not found/);
});

test("pinned upstream facts: full commits, Apache-2.0, slot-sized sparse checkout without binaries", () => {
  for (const target of Object.values(TARGETS)) {
    assert.match(target.commit, /^[0-9a-f]{40}$/);
    assert.equal(target.licence, "Apache-2.0");
    assert(target.sparsePaths.every(item => !/\.(exe|pdf|bin|hex)$/i.test(item) || item.startsWith("!")));
  }
  assert(TARGETS["scout-ardf"].commit.startsWith("52c12b6b7fd8"));
  assert(TARGETS["mili-admin-user"].commit.startsWith("dc8c1767b1e1"));
});

function image(id, { marker = true, vectors = true, extra = "", size = 2048 } = {}) {
  const bytes = Buffer.alloc(size);
  if (vectors) { bytes.writeUInt32LE(0x20004000, 0); bytes.writeUInt32LE(0x08002c01, 4); }
  Buffer.from(`${marker ? markerFor(id) : "none"}\0${extra}`, "latin1").copy(bytes, 64);
  return bytes;
}

test("image checks reject missing marker, bad vectors, oversize and upstream boot identity", () => {
  assert.equal(inspectImage(image("scout-ardf"), "scout-ardf").marker, "BHFW1:scout-ardf:1.3");
  assert.throws(() => inspectImage(image("scout-ardf", { marker: false }), "scout-ardf"), /marker/);
  assert.throws(() => inspectImage(image("scout-ardf", { vectors: false }), "scout-ardf"), /vectors/);
  assert.throws(() => inspectImage(image("scout-ardf", { size: 0x1d801 }), "scout-ardf"), /slot/);
  assert.throws(() => inspectImage(image("scout-ardf", { extra: "AGGER MARTINI" }), "scout-ardf"), /boot identity/);
  assert.doesNotThrow(() => inspectImage(image("mili-admin-user", { extra: "F4HWN" }), "mili-admin-user"));
});

function fakeSource(id) {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), "bh-up-"));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true }); fs.writeFileSync(path.join(source, file), text); };
  for (const file of TARGETS[id].licenceFiles) write(file, `licence ${file}`);
  if (id === "scout-ardf") {
    write("core/Src/ui/welcome.c", scoutWelcome);
    write("core/Src/scout/tx.c", scoutTx);
  } else {
    write("firmware-v3/App/ui/welcome.c", miliWelcome);
    write("firmware-v3/CMakePresets.json", JSON.stringify({ configurePresets: [
      { name: "AdminUser-SAM-RXOnly", cacheVariables: { ENABLE_PREVENT_TX: true, ENABLE_ADMIN_USER_MODE: true } }] }));
  }
  return source;
}

for (const id of Object.keys(TARGETS)) {
  test(`${id}: candidate build is Beta, unverified on hardware, with licences, hashes and no binary patching`, () => {
    const source = fakeSource(id), output = fs.mkdtempSync(path.join(os.tmpdir(), "bh-out-"));
    const calls = [];
    const run = (command, args, options) => {
      calls.push([command, ...args].join(" "));
      if (command === "git") return TARGETS[id].commit;
      if (command === "arm-none-eabi-gcc") return "arm-none-eabi-gcc (fake) 13.3.1";
      const produced = id === "scout-ardf"
        ? path.join(source, "platform", "uv-k5-v3-py32f071", "firmware_uvk5_v3.bin")
        : path.join(source, "firmware-v3", "build", TARGETS[id].preset, TARGETS[id].presetOutput);
      fs.mkdirSync(path.dirname(produced), { recursive: true });
      fs.writeFileSync(produced, image(id));
      return "";
    };
    const info = buildUpstream({ id, source, output, run, now: () => new Date("2026-11-23T00:00:00Z") });
    assert.equal(info.beta, true);
    assert.equal(info.hardwareBootTested, false);
    assert.equal(info.stability, "beta");
    assert.equal(info.txInhibited, true);
    assert.equal(info.binaryPatching, false);
    assert.equal(info.upstream.commit, TARGETS[id].commit);
    assert.equal(info.multiboot.returnToSelector, "unverified");
    assert(!/beta/i.test(info.firmware), "installer rejects beta in file names");
    const artifacts = path.join(output, "artifacts");
    for (const name of info.licenceFiles) assert(fs.existsSync(path.join(artifacts, name)), name);
    assert(fs.readFileSync(path.join(artifacts, "ATTRIBUTION.txt"), "utf8").includes(TARGETS[id].repo));
    const sums = fs.readFileSync(path.join(artifacts, "SHA256SUMS"), "utf8");
    assert(sums.includes(info.firmware) && !sums.includes("SHA256SUMS"));
    assert(fs.existsSync(path.join(source, TARGETS[id].bootlogoDir, "bootlogo.h")));
    if (id === "mili-admin-user") assert(calls.some(call => call.includes("-DEDITION_STRING=Bricohams")));
    else assert(calls.some(call => call.startsWith("make") && call.includes("SCOUT_GIT_HASH=52c12b6")));
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(output, { recursive: true, force: true });
  });
}

test("build refuses a wrong commit, vendored binaries and a non RX-only MILI preset", () => {
  const source = fakeSource("scout-ardf"), output = fs.mkdtempSync(path.join(os.tmpdir(), "bh-out-"));
  assert.throws(() => buildUpstream({ id: "scout-ardf", source, output, run: () => "0".repeat(40) }), /expected/);
  fs.writeFileSync(path.join(source, "flasher.exe"), "x");
  assert.throws(() => buildUpstream({ id: "scout-ardf", source, output, run: () => TARGETS["scout-ardf"].commit }), /Forbidden binary/);
  const mili = fakeSource("mili-admin-user");
  fs.writeFileSync(path.join(mili, "firmware-v3", "CMakePresets.json"), JSON.stringify({ configurePresets: [
    { name: "AdminUser-SAM-RXOnly", cacheVariables: { ENABLE_PREVENT_TX: false, ENABLE_ADMIN_USER_MODE: true } }] }));
  assert.throws(() => buildUpstream({ id: "mili-admin-user", source: mili, output, run: () => TARGETS["mili-admin-user"].commit }), /RX-only/);
  assert.throws(() => buildUpstream({ id: "nope", source, output }), /Unknown/);
  for (const dir of [source, mili, output]) fs.rmSync(dir, { recursive: true, force: true });
});

// Real pinned sources are gitignored reference copies; the transforms must still match them.
const refs = path.join(__dirname, "..", "data", "third-party", "refs");
test("transforms apply to the pinned upstream files when the reference copies are present",
  { skip: !fs.existsSync(path.join(refs, "scout", "core")) || !fs.existsSync(path.join(refs, "mili", "firmware-v3")) }, () => {
    const read = file => fs.readFileSync(path.join(refs, file), "utf8");
    assert.doesNotThrow(() => brandScoutWelcome(read("scout/core/Src/ui/welcome.c")));
    assert.doesNotThrow(() => inhibitScoutTx(read("scout/core/Src/scout/tx.c")));
    assert.doesNotThrow(() => brandMiliWelcome(read("mili/firmware-v3/App/ui/welcome.c")));
    assert.equal(assertMiliRxOnly(JSON.parse(read("mili/firmware-v3/CMakePresets.json")), "AdminUser-SAM-RXOnly").ENABLE_PREVENT_TX, true);
  });
