"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

function modulePlan(modules, options) {
  assert(Array.isArray(modules) && modules.every(name => ["ardf", "satellite", "spectrum"].includes(name)), "Modulo no implementado; disponibles: ardf, satellite, spectrum.");
  assert.equal(new Set(modules).size, modules.length, "Modulo duplicado.");
  assert(modules.length <= 1, "Los adaptadores necesitan imagenes separadas.");
  if (modules.length) {
    assert(options.ENABLE_FEAT_F4HWN_FOXHUNT, "El modulo requiere ENABLE_FEAT_F4HWN_FOXHUNT=ON.");
    assert(!options.ENABLE_FEAT_F4HWN_OVERLAY_APPS, "El modulo requiere Fox Hunt residente, no overlay.");
    assert(!options.ENABLE_FEAT_F4HWN_BEACON, "El modulo requiere ENABLE_FEAT_F4HWN_BEACON=OFF.");
  }
  return [...modules].sort();
}

function replaceOnce(text, before, after, file) {
  assert.equal(text.split(before).length, 2, `Punto de integracion ausente o ambiguo: ${file}: ${before.slice(0, 60)}`);
  return text.replace(before, after);
}

function integrateModule(work, module) {
  assert(["ardf", "satellite", "spectrum"].includes(module), "Modulo sin integracion.");
  const ardf = module === "ardf";
  const spectrum = module === "spectrum";
  const prefix = ardf ? "ARDF" : spectrum ? "SPEC" : "SAT";
  const define = `BRICOHAMS_ENABLE_${module.toUpperCase()}`;
  const core = ardf ? "ardf" : spectrum ? "spectrum" : "doppler";
  const sources = [`${core}.c`, `${core}.h`, `${module}_foxhunt.inc`];
  if (module === "satellite") sources.push("cat_rx.c", "cat_rx.h");
  if (spectrum) sources.push("presets.c", "presets.h");
  const root = path.join(__dirname, "..");
  const staged = new Map();
  const change = (name, before, after) => {
    const file = path.join(work, "App", name);
    const content = staged.get(file) ?? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    staged.set(file, replaceOnce(content, before, after, name));
  };
  change("CMakeLists.txt", "add_library(App INTERFACE)", `add_library(App INTERFACE)\ntarget_compile_definitions(App INTERFACE ${define})\ntarget_sources(App INTERFACE bricohams/${core}.c${spectrum ? " bricohams/presets.c" : module === "satellite" ? " bricohams/cat_rx.c" : ""})`);
  for (const name of ["scheduler.c", "scheduler.h"])
    change(name, "#ifdef ENABLE_FEAT_F4HWN_OVERLAY_APPS", `#if defined(ENABLE_FEAT_F4HWN_OVERLAY_APPS) || defined(${define})`);
  change("app/foxhunt.c", '#include "app/foxhunt.h"', `#include "app/foxhunt.h"\n\n#ifdef ${define}\nstatic void BH_${prefix}_Draw(void);\nstatic bool BH_${prefix}_Key(KEY_Code_t key);\n#endif`);
  change("app/foxhunt.c", "    FOXHUNT_DrawFreqBR(gRxVfo->pRX->Frequency);", `    FOXHUNT_DrawFreqBR(gRxVfo->pRX->Frequency);\n#ifdef ${define}\n    BH_${prefix}_Draw();\n#endif`);
  if (!ardf) change("app/foxhunt.c",
    '    GUI_DisplaySmallestInverse("FOX HUNT", 2, 0, true, true, 34);',
    `    GUI_DisplaySmallestInverse("${spectrum ? "SPEC RX" : "SAT RX"}", 2, 0, true, true, 34);`);
  change("app/foxhunt.c", "    const int8_t dir = gWasFKeyPressed ? -1 : 1;\n\n    switch (kbd.current)",
    `    const int8_t dir = gWasFKeyPressed ? -1 : 1;\n#ifdef ${define}\n    if (BH_${prefix}_Key(kbd.current)) {\n        gWasFKeyPressed = false;\n        return;\n    }\n#endif\n\n    switch (kbd.current)`);
  change("app/foxhunt.c", "void APP_RunFoxHunt(void)\n{\n    FOXHUNT_Begin();",
    `#ifdef ${define}\n#include "bricohams/${module}_foxhunt.inc"\n#endif\n\nvoid APP_RunFoxHunt(void)\n{\n    FOXHUNT_Begin();\n#ifdef ${define}\n    BH_${prefix}_Start();\n#endif`);
  change("app/foxhunt.c", "        FOXHUNT_HandleKeys();", `        #ifdef ${define}\n        BH_${prefix}_Update();\n        #endif\n        FOXHUNT_HandleKeys();`);
  if (module === "satellite") {
    change("app/uart.c", '#include "app/uart.h"', '#include "app/uart.h"\n#include "bricohams/cat_rx.h"\n#include "scheduler.h"');
    change("app/uart.c", "        case 0x0514:",
      `        case 0x7B00: /* Bricohams CAT RX v1, private experimental command. */
        {
            struct __attribute__((packed)) {
                Header_t Header;
                uint8_t Data[BH_CAT_REPLY_SIZE];
            } Reply;
            Reply.Header.ID = 0x7B01;
            Reply.Header.Size = BH_CAT_REPLY_SIZE;
            bh_cat_request(&bh_cat_receiver, pUART_Command->Data,
                pUART_Command->Header.Size, SCHEDULER_GetTick10ms() * 10U, Reply.Data);
            SendReply(Port, &Reply, sizeof(Reply));
            break;
        }
        case 0x0514:`);
    change("app/foxhunt.c", "    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon",
      "    BH_SAT_Stop();\n    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon");
  }
  if (ardf) {
    change("app/uart.c", '#include "app/uart.h"', '#include "app/uart.h"\n#include "bricohams/ardf.h"');
    change("app/uart.c", "        case 0x0514:",
      `        case 0x7B20: /* Bricohams ARDF observation statistics, read only. */
        {
            struct __attribute__((packed)) {
                Header_t Header;
                uint8_t Data[BH_ARDF_STATS_BYTES];
            } Reply;
            Reply.Header.ID = 0x7B21;
            Reply.Header.Size = BH_ARDF_STATS_BYTES;
            BH_ARDF_StatsRequest(pUART_Command->Data, pUART_Command->Header.Size, Reply.Data);
            SendReply(Port, &Reply, sizeof(Reply));
            break;
        }

        case 0x0514:`);
    change("app/foxhunt.c", "    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon",
      "    BH_ARDF_Stop();\n    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon");
  }
  if (spectrum) {
    change("app/uart.c", '#include "app/uart.h"', '#include "app/uart.h"\n#include "bricohams/presets.h"');
    change("app/uart.c", "        case 0x0514:",
      `        case 0x7B10: /* Bricohams session presets v1. */
        {
            struct __attribute__((packed)) {
                Header_t Header;
                uint8_t Data[BH_PRESET_REPLY_MAX];
            } Reply;
            Reply.Header.ID = 0x7B11;
            Reply.Header.Size = BH_SPEC_PresetRequest(pUART_Command->Data,
                pUART_Command->Header.Size, Reply.Data);
            SendReply(Port, &Reply, (uint16_t)(sizeof(Header_t) + Reply.Header.Size));
            break;
        }

        case 0x0514:`);
    change("app/foxhunt.c", "static void FOXHUNT_SaveConfig(void);", "");
    change("app/foxhunt.c", [
      "static void FOXHUNT_SaveConfig(void)", "{",
      "    uint8_t cfg[FOXHUNT_CFG_LEN];", "    FOXHUNT_ConfigPack(cfg);", "",
      "    if (memcmp(cfg, foxCfgSaved, sizeof(cfg)) == 0)", "        return;", "",
      "    PY25Q16_WriteBuffer(FOXHUNT_CFG_ADDR, cfg, sizeof(cfg), false);",
      "    memcpy(foxCfgSaved, cfg, sizeof(cfg));", "}"
    ].join("\n"), "");
    change("app/foxhunt.c", "    FOXHUNT_SaveConfig();\n\n    // Backlight", "    // Spectrum settings are session-only; do not persist hunt audio/gain.\n\n    // Backlight");
    change("app/foxhunt.c", "static void FOXHUNT_End(void)\n{\n    FOXHUNT_SaveConfig();", "static void FOXHUNT_End(void)\n{");
    change("app/foxhunt.c", "    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon", "    BH_SPEC_Stop();\n    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon");
  }
  const destination = path.join(work, "App", "bricohams");
  assert(!fs.existsSync(destination), "Destino del modulo ya existente.");
  const bytes = sources.map(name => [name, fs.readFileSync(path.join(root, "firmware", "bricohams", name))]);
  fs.mkdirSync(destination);
  for (const [name, data] of bytes) fs.writeFileSync(path.join(destination, name), data);
  for (const [file, content] of staged) fs.writeFileSync(file, content);
  return [...bytes.map(([name, data]) => ({ file: `App/bricohams/${name}`, sha256: createHash("sha256").update(data).digest("hex") })),
    ...[...staged].map(([file, content]) => ({ file: path.relative(work, file).replace(/\\/g, "/"), sha256: createHash("sha256").update(content).digest("hex") }))];
}

module.exports = { modulePlan, replaceOnce, integrateModule };
