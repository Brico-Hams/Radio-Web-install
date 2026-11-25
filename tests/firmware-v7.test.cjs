"use strict";
// Offline fixtures: short verbatim excerpts of armel/uv-k1-k5v3-firmware-custom v7.0.0
// (commit f6f34cbc3e10dd688f8348cc7f4300a859064621), Copyright 2023 Dual Tachyon,
// Copyright 2024-2026 Armel F4HWN and contributors, Apache-2.0 (see the upstream LICENSE and NOTICE).
// Only the lines that the Bricohams patches anchor on are kept. Never fetched at test time.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { patchFastRetuneSource, integrateFastRetune } = require("../scripts/firmware-fast-retune.cjs");
const { patchBackupReadSource } = require("../scripts/firmware-backup-read.cjs");
const { integrateModule } = require("../scripts/bricohams-modules.cjs");
const { TARGETS, UPSTREAM_V7, readArguments, resolvePlan } = require("../scripts/build-bricohams.cjs");

// App/radio.c:792-807 and :1020-1023 of v7.0.0 (RADIO_SetupRegisters, RADIO_SetTxParameters).
const V7_RADIO_C = [
  "#include <string.h>",
  "void RADIO_SetupRegisters(bool switchToForeground)",
  "{",
  "    BK4819_FilterBandwidth_t Bandwidth = gRxVfo->CHANNEL_BANDWIDTH;",
  "",
  "    #ifdef ENABLE_FEAT_F4HWN_NARROWER",
  "        if(Bandwidth == BK4819_FILTER_BW_NARROW && gSetting_set_nfm == 1)",
  "        {",
  "            Bandwidth = BK4819_FILTER_BW_NARROWER;",
  "        }",
  "    #endif",
  "",
  "    AUDIO_AudioPathOff();",
  "",
  "    gEnableSpeaker = false;",
  "",
  "    BK4819_ToggleGpioOut(BK4819_GPIO6_PIN2_GREEN, false);",
  "",
  "    RADIO_SetModulation(gRxVfo->Modulation);",
  "    FUNCTION_Select(FUNCTION_FOREGROUND);",
  "}",
  "",
  "void RADIO_SetTxParameters(void)",
  "{",
  "    BK4819_FilterBandwidth_t Bandwidth = gCurrentVfo->CHANNEL_BANDWIDTH;",
  "    AUDIO_AudioPathOff();",
  "}"
].join("\n");
// App/app/main.c:1033-1037 (VFO step) and App/app/app.c:2866-2870 (reconfigure) of v7.0.0.
const V7_MAIN_C = [
  "                gTxVfo->freq_config_RX.Frequency = frequency;",
  "                BK4819_SetFrequency(frequency);",
  "                BK4819_RX_TurnOn();",
  "                gRequestSaveChannel = 1;",
  "                return;"
].join("\n");
const V7_APP_C = [
  "        gFlagReconfigureVfos        = false;",
  "",
  "        if (gMonitor)",
  "            ACTION_Monitor();   // 1of11",
  "    }"
].join("\n");
const V7_RADIO_H = "void     RADIO_SetupRegisters(bool switchToForeground);\nvoid     RADIO_SetTxParameters(void);";

function v7Tree(t, extra = {}) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "bh-v7-"));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  const files = { "App/radio.c": V7_RADIO_C, "App/radio.h": V7_RADIO_H, "App/app/main.c": V7_MAIN_C,
    "App/app/app.c": V7_APP_C, ...extra };
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.writeFileSync(path.join(work, file), text.replace(/\n/g, "\r\n"));
  }
  return work;
}

test("v7.0.0: the unpatched path mutes, the patched path retunes before AUDIO_AudioPathOff", () => {
  // Root cause (v7.0.0): main.c step -> gRequestSaveChannel -> app.c reconfigure -> RADIO_SetupRegisters
  // -> AUDIO_AudioPathOff() + gEnableSpeaker=false -> FUNCTION_Select(FUNCTION_FOREGROUND).
  assert.ok(V7_RADIO_C.indexOf("AUDIO_AudioPathOff();") < V7_RADIO_C.indexOf("FUNCTION_Select(FUNCTION_FOREGROUND);"));
  const radio = patchFastRetuneSource("App/radio.c", V7_RADIO_C);
  const fast = radio.indexOf("BK4819_PickRXFilterPathBasedOnFrequency(bhRetune);");
  assert.ok(fast > 0 && fast < radio.indexOf("    AUDIO_AudioPathOff();\n\n    gEnableSpeaker = false;"));
  assert.match(radio, /bhLastRxSetupValid\n\s+&& gCurrentFunction != FUNCTION_TRANSMIT/);
  assert.match(radio, /void RADIO_SetTxParameters\(void\)\n\{\n    gBhRetuneFrequency = 0;/);
  // Modulation, bandwidth, squelch, tone and compander changes must fall back to the full setup.
  for (const field of ["modulation", "bandwidth", "codeType", "code", "compander"]) assert.ok(radio.includes(`setup->${field} =`));
  assert.ok(radio.includes("setup->squelch[5]"));
  assert.match(radio, /IS_NOAA_CHANNEL\(gRxVfo->CHANNEL_SAVE\)/);
  assert.match(patchFastRetuneSource("App/app/main.c", V7_MAIN_C),
    /BK4819_RX_TurnOn\(\);\n {16}gBhRetuneFrequency = frequency; \/\/ BRICOHAMS_FAST_RETUNE\n {16}gRequestSaveChannel = 1;/);
  assert.match(patchFastRetuneSource("App/app/app.c", V7_APP_C), /gMonitor && gCurrentFunction != FUNCTION_MONITOR/);
  assert.match(patchFastRetuneSource("App/radio.h", V7_RADIO_H), /extern uint32_t gBhRetuneFrequency;/);
  for (const [file, text] of [["App/radio.c", V7_RADIO_C], ["App/app/main.c", V7_MAIN_C]]) {
    assert.throws(() => patchFastRetuneSource(file, patchFastRetuneSource(file, text)), /ya aplicada/);
    assert.throws(() => patchFastRetuneSource(file, "changed"), /ausente/);
  }
});

test("v7.0.0: fast retune integration stages and records hashes", t => {
  const work = v7Tree(t);
  const info = integrateFastRetune(work);
  assert.equal(info.audioPathKeptOnFrequencyStep, true);
  assert.equal(info.hardwareValidated, false);
  for (const item of info.sources) {
    const bytes = fs.readFileSync(path.join(work, item.file));
    assert.equal(item.sha256, createHash("sha256").update(bytes).digest("hex"));
    assert.match(bytes.toString("utf8"), /^\/\* BRICOHAMS_FAST_RETUNE:/);
  }
});

test("v7.0.0 pins: commit, presets Fusion/Service, FW_ASSETS required, modules only on v6.1 anchors when absent", () => {
  assert.equal(UPSTREAM_V7.commit, "f6f34cbc3e10dd688f8348cc7f4300a859064621");
  assert.deepEqual(TARGETS.v7.presets, ["Fusion", "Service"]);
  const base = { ENABLE_FEAT_F4HWN: true, ENABLE_UART: true, ENABLE_USB: true, ENABLE_FEAT_F4HWN_MULTIBOOT: true,
    ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY: true, DEV: false, VERSION_STRING_2: "v7.0.0" };
  const catalog = { configurePresets: [
    { name: "default", cacheVariables: { ...base, ENABLE_FEAT_F4HWN_FW_ASSETS: false, ENABLE_FEAT_F4HWN_FOXHUNT: false } },
    { name: "Fusion", inherits: "default", cacheVariables: { ENABLE_FEAT_F4HWN_FW_ASSETS: true } },
    { name: "Service", inherits: "Fusion", cacheVariables: { ENABLE_FEAT_F4HWN_EXT_FLASH_RW: true } }
  ] };
  assert.equal(resolvePlan(catalog, "Service", ["ENABLE_FEAT_F4HWN_FOXHUNT=ON"], "v7").options.ENABLE_FEAT_F4HWN_FOXHUNT, true);
  assert.throws(() => resolvePlan(catalog, "Labs", [], "v7"), /Edicion/);
  assert.throws(() => resolvePlan(catalog, "Fusion", ["ENABLE_FEAT_F4HWN_FW_ASSETS=OFF"], "v7"), /FW_ASSETS/);
  assert.throws(() => resolvePlan(catalog, "Fusion", [], "v6"), /Version/);
  assert.equal(readArguments(["--source", "s", "--output", "o", "--target", "v7", "--preset", "Service"]).target, "v7");
  assert.throws(() => readArguments(["--source", "s", "--output", "o", "--target", "v8"]), /Objetivo/);
});

test("v7.0.0: backup read patch applies and keeps raw erase/write under the original permission", t => {
  const uart = [
    '#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT\n    #include "driver/mb_flash.h"\n    #ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        #include "driver/py25q16.h"\n    #endif\n#endif',
    "#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT",
    "#ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW",
    "        // ---- full external-flash dump / restore (host: UV Studio) ----------",
    "        case 0x0738: // read raw external flash by physical address (full-chip dump)",
    "            if (ts != mb_port_timestamp(Port)) status = MB_ERR_AUTH;",
    "            else if (len == 0u || len > sizeof(Reply.Data)) status = MB_ERR_SIZE;",
    "        case 0x073A: // erase one 4 KiB external-flash sector by physical address",
    "        case 0x073C: // program bytes into external flash by physical address (sector pre-erased)",
    "        case 0x073E: // CRC-32 of a physical external-flash range",
    "            if (ts != mb_port_timestamp(Port)) status = MB_ERR_AUTH;",
    "#endif // ENABLE_FEAT_F4HWN_EXT_FLASH_RW",
    "#endif"
  ].join("\n");
  const patched = patchBackupReadSource("App/app/uart.c", uart);
  assert.match(patched, /case 0x0738:/);
  assert.match(patched, /#ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        case 0x073A:/);
  assert.match(patched, /#endif[^\n]*\n\n        case 0x073E:/);
  assert.throws(() => patchBackupReadSource("App/app/uart.c", patched), /ya aplicada/);
});
test("v7.0.0: module integration uses the K5VIEWER-aware scheduler guard", t => {
  const header = fs.readFileSync(path.join(__dirname, "..", "firmware", "bricohams", "passes.h"), "utf8");
  assert.ok(header.length > 0);
  const work = v7Tree(t, {
    "App/main.c": '#include "app/app.h"\n    #ifdef ENABLE_FEAT_F4HWN_RESUME_STATE\n    #endif\n    while (true) { APP_Update(); }\n',
    "App/CMakeLists.txt": "add_library(App INTERFACE)\n",
    "App/scheduler.c": "#if defined(ENABLE_FEAT_F4HWN_OVERLAY_APPS) || defined(ENABLE_FEAT_F4HWN_K5VIEWER)\n#endif\n",
    "App/scheduler.h": "#if defined(ENABLE_FEAT_F4HWN_OVERLAY_APPS) || defined(ENABLE_FEAT_F4HWN_K5VIEWER)\n#endif\n",
    "App/ui/menu.c": 'X(ACTION_OPT_FOXHUNT,        "FOX HUNT")\n',
    "App/app/app.c": "void APP_TimeSlice10ms(void)\n{\n    gNextTimeslice = false;\n",
    "App/app/uart.c": '#include "app/uart.h"\nstatic uint32_t mb_port_timestamp(uint32_t Port);\n        case 0x0514:\n',
    "App/app/foxhunt.c": ['#include "app/foxhunt.h"', "    FOXHUNT_DrawFreqBR(gRxVfo->pRX->Frequency);",
      '    GUI_DisplaySmallestInverse("FOX HUNT", 2, 0, true, true, 34);',
      "    const int8_t dir = gWasFKeyPressed ? -1 : 1;\n\n    switch (kbd.current)",
      "void APP_RunFoxHunt(void)\n{\n    FOXHUNT_Begin();", "        FOXHUNT_HandleKeys();",
      "    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon"].join("\n")
  });
  // main.c/CMakeLists.txt live under App/ in the real tree; the v6 test fixture uses the same layout.
  assert.throws(() => integrateModule(work, "satellite", "v6"), /ausente/);
  integrateModule(work, "satellite", "v7");
  const scheduler = fs.readFileSync(path.join(work, "App/scheduler.c"), "utf8");
  assert.match(scheduler, /K5VIEWER\) \|\| defined\(BRICOHAMS_ENABLE_SAT\)|K5VIEWER\) \|\| defined\(\w+\)/);
  assert.throws(() => integrateModule(work, "satellite", "v9"), /Objetivo/);
});
