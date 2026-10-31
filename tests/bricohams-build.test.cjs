"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readArguments, resolvePlan, inspectFirmware, inspectMemoryUsage, brandWelcome, brandLogo, UPSTREAM } = require("../scripts/build-bricohams.cjs");
const { modulePlan, replaceOnce } = require("../scripts/bricohams-modules.cjs");
const { inspectResident } = require("../scripts/build-platform-resident.cjs");
const { OP, STATE, encodeRequest, decodeReply, uploadPackage } = require("../scripts/platform-transfer.cjs");
const { crc32 } = require("../radio-core.js");
const { patchBackupReadSource, integrateBackupRead } = require("../scripts/firmware-backup-read.cjs");

function backupSources() {
  const guard = "#if defined(ENABLE_FEAT_F4HWN_EXT_FLASH_RW) || defined(ENABLE_AIRCOPY_FLASH)";
  return {
    "App/app/uart.c": [
      '#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT\n    #include "driver/mb_flash.h"\n    #ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        #include "driver/py25q16.h"\n    #endif\n#endif',
      "#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT",
      "#ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW",
      "        // ---- full external-flash dump / restore (host: UV Studio) ----------",
      "        case 0x0738: // physical read",
      "            if (ts != mb_port_timestamp(Port)) status = MB_ERR_AUTH;",
      "            else if (len == 0u || len > sizeof(Reply.Data)) status = MB_ERR_SIZE;",
      "        case 0x073A: // erase one 4 KiB external-flash sector by physical address",
      "        case 0x073C: // physical write",
      "        case 0x073E: // CRC-32 of a physical external-flash range",
      "            if (ts != mb_port_timestamp(Port)) status = MB_ERR_AUTH;",
      "#endif // ENABLE_FEAT_F4HWN_EXT_FLASH_RW",
      "#endif"
    ].join("\n"),
    "App/driver/py25q16.h": [guard,
      "#define PY25Q16_TOTAL_SIZE 0x00200000u",
      "#define PY25Q16_RAW_CHUNK_SIZE 128u",
      "/* Raw 4 KiB sector erase; Address must already be sector-aligned. */",
      "void PY25Q16_SectorErasePhysical(uint32_t Address);",
      "void PY25Q16_WriteBufferPhysical(uint32_t Address, const void *pBuffer, uint32_t Size);",
      "#endif"
    ].join("\n"),
    "App/driver/mb_flash.h": `${guard}\nuint8_t MB_ExternalFlashCrc32(uint32_t address, uint32_t length, uint32_t *out_crc);\n#endif`,
    "App/driver/mb_flash.c": `${guard}\nuint8_t MB_ExternalFlashCrc32(uint32_t address, uint32_t length, uint32_t *out_crc) { return MB_OK; }\n#endif`
  };
}

// Evaluate only the #ifdef / OR-of-defined guard subset used by these fixtures.
function activeBackupSource(source, defines) {
  const stack = [true];
  const output = [];
  for (const line of source.split("\n")) {
    const directive = /^\s*#(ifdef|if|endif)\b(.*)/.exec(line);
    if (!directive) { if (stack.at(-1)) output.push(line); continue; }
    const [, kind, value] = directive;
    if (kind === "endif") { assert(stack.length > 1); stack.pop(); }
    else {
      const enabled = kind === "ifdef" ? defines.has(value.trim()) :
        [...value.matchAll(/defined\(([^)]+)\)/g)].some(([, name]) => defines.has(name));
      stack.push(stack.at(-1) && enabled);
    }
  }
  assert.equal(stack.length, 1, "Unbalanced backup guards");
  return output.join("\n");
}

test("backup read integration exposes physical reads and CRC without adding raw writes", () => {
  const source = backupSources();
  const patched = Object.fromEntries(Object.entries(source).map(([file, text]) => [file, patchBackupReadSource(file, text)]));
  for (const rw of [false, true]) {
    const defines = new Set(["ENABLE_FEAT_F4HWN_MULTIBOOT", ...(rw ? ["ENABLE_FEAT_F4HWN_EXT_FLASH_RW"] : [])]);
    const uart = activeBackupSource(patched["App/app/uart.c"], defines);
    for (const command of ["0x0738", "0x073E"]) assert.ok(uart.includes(`case ${command}:`));
    for (const command of ["0x073A", "0x073C"]) assert.equal(uart.includes(`case ${command}:`), rw);
    assert.ok(uart.includes('#include "driver/py25q16.h"'));
    assert.equal((uart.match(/ts != mb_port_timestamp\(Port\)/g) || []).length, 2);
    assert.match(uart, /len == 0u \|\| len > sizeof\(Reply.Data\)/);
    const header = activeBackupSource(patched["App/driver/py25q16.h"], defines);
    assert.match(header, /#define PY25Q16_TOTAL_SIZE/);
    assert.equal(header.includes("PY25Q16_SectorErasePhysical"), rw);
    assert.equal(header.includes("PY25Q16_WriteBufferPhysical"), rw);
    for (const file of ["App/driver/mb_flash.h", "App/driver/mb_flash.c"])
      assert.match(activeBackupSource(patched[file], defines), /MB_ExternalFlashCrc32/);
  }
  assert.doesNotMatch(activeBackupSource(patched["App/app/uart.c"], new Set()), /case 0x073/);
  const aircopy = new Set(["ENABLE_AIRCOPY_FLASH"]);
  assert.match(activeBackupSource(patched["App/driver/py25q16.h"], aircopy), /PY25Q16_WriteBufferPhysical/);
});

test("backup patch rejects changed, duplicated or already-patched sources and normalizes CRLF", () => {
  for (const [file, source] of Object.entries(backupSources())) {
    const result = patchBackupReadSource(file, source);
    assert.equal(patchBackupReadSource(file, source.replace(/\n/g, "\r\n")), result);
    assert.throws(() => patchBackupReadSource(file, result), /ya aplicada/);
    assert.throws(() => patchBackupReadSource(file, `${source}\n${source}`), /ambiguo/);
    assert.throws(() => patchBackupReadSource(file, "changed upstream"), /ausente/);
  }
  assert.throws(() => patchBackupReadSource("unknown.c", ""), /no admitida/);
});

test("backup integration records final hashes including prior module edits and stages before writes", t => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { createHash } = require("node:crypto");
  const work = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "bh-backup-read-"));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  const source = backupSources();
  source["App/app/uart.c"] += "\n/* Existing module integration: 0x7B20 */\n";
  for (const [file, text] of Object.entries(source)) {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.writeFileSync(path.join(work, file), text);
  }
  fs.writeFileSync(path.join(work, "App/driver/mb_flash.c"), "unexpected upstream");
  assert.throws(() => integrateBackupRead(work), /ausente/);
  assert.equal(fs.readFileSync(path.join(work, "App/app/uart.c"), "utf8"), source["App/app/uart.c"]);
  fs.writeFileSync(path.join(work, "App/driver/mb_flash.c"), source["App/driver/mb_flash.c"]);
  const info = integrateBackupRead(work);
  assert.equal(info.physicalRead, true);
  assert.equal(info.crc, true);
  assert.equal(info.persistentWritesAdded, false);
  assert.equal(info.sources.length, 4);
  for (const item of info.sources) {
    const bytes = fs.readFileSync(path.join(work, item.file));
    assert.equal(item.sha256, createHash("sha256").update(bytes).digest("hex"));
  }
  assert.match(fs.readFileSync(path.join(work, "App/app/uart.c"), "utf8"), /Existing module integration: 0x7B20/);
});

test("informe de memoria incluye reservas, huecos y solapamiento del restaurador sin contarlo dos veces", () => {
  const report = [
    ".isr_vector 192 134227968", ".text 102368 134228160", ".rodata 10360 134330528",
    ".data 136 536870912", ".noncacheable 352 536871048", ".mb_ramfunc 888 536871552",
    ".mb_workspace 4096 536871552", ".bss 6816 536875648", "._user_heap_stack 1024 536882464",
    ".debug_frame 524 0"
  ].join("\r\n");
  assert.deepEqual(inspectMemoryUsage(report, 113960), {
    ramUsedBytes: 12576, ramCapacityBytes: 16384, ramFreeBytes: 3808,
    imageBytes: 113960, slotCapacityBytes: 120832, slotFreeBytes: 6872
  });
  assert.equal(inspectMemoryUsage(report, 120832).slotFreeBytes, 0);
  assert.equal(inspectMemoryUsage(report.replace("1024 536882464", "4832 536882464"), 1024).ramFreeBytes, 0);
  assert.throws(() => inspectMemoryUsage(report.replace("1024 536882464", "4833 536882464"), 1024), /RAM/);
  assert.throws(() => inspectMemoryUsage(`${report}\n.extra 4 536887296`, 1024), /RAM/);
  assert.throws(() => inspectMemoryUsage(report.replace(".bss", ".missing"), 1024), /Seccion/);
  assert.throws(() => inspectMemoryUsage(`${report}\n.data 0 536870912`, 1024), /duplicada/);
  for (const size of [0, -1, 120833, 1.5, NaN]) assert.throws(() => inspectMemoryUsage(report, size), /slot/);
});

function transferReply(op, session, received, state, status = 0, install = 0) {
  const bytes = Buffer.alloc(32);
  bytes.write("BHR1");
  for (const [offset, value] of [[4, op], [8, session], [12, status],
    [16, received], [20, state]]) bytes.writeUInt32LE(value, offset);
  bytes.writeInt32LE(install, 24);
  bytes.writeUInt32LE(crc32(bytes.subarray(0, 28)), 28);
  return bytes;
}

test("transferencia BHT1 valida CRC, sesion, limites y codigo de error con signo", () => {
  const frame = encodeRequest(OP.DATA, 0x12345678, 128, Buffer.from([1, 2, 3]));
  assert.equal(frame.length, 27);
  assert.equal(frame.toString("ascii", 0, 4), "BHT1");
  const clean = Buffer.from(frame); clean.writeUInt32LE(0, 20);
  assert.equal(frame.readUInt32LE(20), crc32(clean));
  assert.throws(() => encodeRequest(OP.DATA, -1));
  assert.throws(() => encodeRequest(OP.DATA, 1, 0, Buffer.alloc(129)));
  const valid = transferReply(OP.COMMIT, 7, 320, STATE.FAILED, 7, -17);
  assert.deepEqual(decodeReply(valid, OP.COMMIT, 7),
    { status: 7, received: 320, state: STATE.FAILED, installResult: -17 });
  assert.throws(() => decodeReply(valid, OP.DATA, 7));
  assert.throws(() => decodeReply(valid, OP.COMMIT, 8));
  const corrupt = Buffer.from(valid); corrupt[16] ^= 1;
  assert.throws(() => decodeReply(corrupt, OP.COMMIT, 7), /CRC/);
  assert.throws(() => decodeReply(valid.subarray(1), OP.COMMIT, 7));
});

test("cliente de apps reanuda bloques y no repite un commit incierto", async () => {
  const bytes = Buffer.alloc(320);
  const calls = [];
  const exchange = async frame => {
    const op = frame.readUInt32LE(4), session = frame.readUInt32LE(8);
    calls.push([op, frame.readUInt32LE(12)]);
    if (op === OP.BEGIN) return transferReply(op, session, 128, STATE.RECEIVING);
    if (op === OP.DATA)
      return transferReply(op, session, frame.readUInt32LE(12) + frame.readUInt32LE(16), STATE.RECEIVING);
    return transferReply(op, session, bytes.length, STATE.DONE);
  };
  assert.equal((await uploadPackage(exchange, bytes, 7)).state, STATE.DONE);
  assert.deepEqual(calls, [[OP.BEGIN, 0], [OP.DATA, 128], [OP.DATA, 256], [OP.COMMIT, 0]]);
  let commits = 0;
  await assert.rejects(uploadPackage(async frame => {
    const op = frame.readUInt32LE(4);
    if (op === OP.COMMIT) { ++commits; throw new Error("Lost commit ACK"); }
    return transferReply(op, 8, op === OP.BEGIN ? 320 : 0, STATE.RECEIVING);
  }, bytes, 8), /Lost commit ACK/);
  assert.equal(commits, 1);
  await assert.rejects(uploadPackage(async () => transferReply(OP.BEGIN, 9, 320, STATE.FAILED, 7, -4),
    bytes, 9), error => error.reply.installResult === -4);
  await assert.rejects(uploadPackage(async () => transferReply(OP.BEGIN, 10, 321, STATE.RECEIVING),
    bytes, 10), /Offset/);
  let doneCalls = 0;
  await uploadPackage(async () => {
    ++doneCalls;
    return transferReply(OP.BEGIN, 11, 320, STATE.DONE);
  }, bytes, 11);
  assert.equal(doneCalls, 1);
  await assert.rejects(uploadPackage(exchange, bytes, 0), /cero/);
});

test("residente independiente valida vectores ELF, SysTick y separacion RAM", () => {
  const bytes = Buffer.alloc(512);
  bytes.writeUInt32LE(0x20004000, 0);
  for (let i = 1; i < 64; i++) bytes.writeUInt32LE(0x08002921, i * 4);
  bytes.writeUInt32LE(0x08002901, 4);
  bytes.writeUInt32LE(0x08002941, 60);
  const symbols = [
    "08002900 T Reset_Handler", "08002920 T Fault_Handler", "08002940 T SysTick_Handler",
    "20002000 B _app_start", "20003000 B _app_end",
    "20000000 D _data_start", "20000004 D _data_end",
    "20000008 B _bss_start", "20000550 B _bss_end"
  ].join("\n");
  assert.deepEqual(inspectResident(bytes, symbols),
    { coreRamUsedBytes: 1360, systickVector: 0x08002941 });
  for (const [offset, value] of [[0, 0x20003000], [4, 0x08002900],
    [4, 0x08002941], [60, 0x08002921], [60, 0x20002001], [64, 0x08002901]]) {
    const corrupt = Buffer.from(bytes);
    corrupt.writeUInt32LE(value, offset);
    assert.throws(() => inspectResident(corrupt, symbols));
  }
  assert.throws(() => inspectResident(Buffer.alloc(255), symbols));
  assert.throws(() => inspectResident(Buffer.alloc(118 * 1024 + 1), symbols));
  for (const [before, after] of [
    ["20002000 B _app_start", "20001000 B _app_start"],
    ["20003000 B _app_end", "20004000 B _app_end"],
    ["20000550 B _bss_end", "20002004 B _bss_end"],
    ["20000004 D _data_end", "2000000c D _data_end"],
    ["08002940 T SysTick_Handler", ""]
  ]) assert.throws(() => inspectResident(bytes, symbols.replace(before, after)));
});
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

test("satellite module stores passes in a banked sector and gates 0x7B30 on the session timestamp", t => {
  const fs = require("node:fs");
  const path = require("node:path");
  const { integrateModule } = require("../scripts/bricohams-modules.cjs");
  const header = fs.readFileSync(path.join(__dirname, "..", "firmware", "bricohams", "passes.h"), "utf8");
  const define = name => Number(new RegExp(`#define ${name} (0x[0-9A-F]+|[0-9]+)U`).exec(header)[1]);
  const base = define("BH_PASS_FLASH_ADDR");
  const end = base + define("BH_PASS_ENTRIES_OFFSET") + define("BH_PASS_MAX") * define("BH_PASS_ENTRY_BYTES");
  // Past the live config (0x00A178), inside one sector, below PY25Q16_BANK_SHARED_FROM/calibration.
  assert.equal(base % 0x1000, 0);
  assert(base >= 0x00b000 && end <= base + 0x1000 && base + 0x1000 <= 0x010000);
  assert(define("BH_PASS_REQUEST_HEADER") + define("BH_PASS_FRAME_MAX") * define("BH_PASS_ENTRY_BYTES") <= 252);
  // Upstream MAX_REPLY_SIZE (144) bounds header + reply data in SendReply.
  assert(4 + define("BH_PASS_REPLY_HEADER") + define("BH_PASS_FRAME_MAX") * define("BH_PASS_ENTRY_BYTES") <= 144);
  const work = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "bh-sat-module-"));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  const sources = {
    "CMakeLists.txt": "add_library(App INTERFACE)\n",
    "scheduler.c": "#ifdef ENABLE_FEAT_F4HWN_OVERLAY_APPS\n#endif\n",
    "scheduler.h": "#ifdef ENABLE_FEAT_F4HWN_OVERLAY_APPS\n#endif\n",
    "ui/menu.c": 'X(ACTION_OPT_FOXHUNT,        "FOX HUNT")\n',
    "app/uart.c": '#include "app/uart.h"\nstatic uint32_t mb_port_timestamp(uint32_t Port);\n        case 0x0514:\n',
    "app/foxhunt.c": ['#include "app/foxhunt.h"', "    FOXHUNT_DrawFreqBR(gRxVfo->pRX->Frequency);",
      '    GUI_DisplaySmallestInverse("FOX HUNT", 2, 0, true, true, 34);',
      "    const int8_t dir = gWasFKeyPressed ? -1 : 1;\n\n    switch (kbd.current)",
      "void APP_RunFoxHunt(void)\n{\n    FOXHUNT_Begin();", "        FOXHUNT_HandleKeys();",
      "    FOXHUNT_End();\n}\n\nvoid APP_RunBeacon"].join("\n")
  };
  for (const [file, text] of Object.entries(sources)) {
    fs.mkdirSync(path.dirname(path.join(work, "App", file)), { recursive: true });
    fs.writeFileSync(path.join(work, "App", file), text.replace(/\n/g, "\r\n"));
  }
  const recorded = integrateModule(work, "satellite").map(item => item.file);
  for (const file of ["App/bricohams/passes.c", "App/bricohams/passes.h", "App/app/uart.c"]) assert(recorded.includes(file));
  assert.match(fs.readFileSync(path.join(work, "App/CMakeLists.txt"), "utf8"), /bricohams\/passes\.c/);
  const uart = fs.readFileSync(path.join(work, "App/app/uart.c"), "utf8");
  assert.match(uart, /#include "bricohams\/passes.h"/);
  assert(uart.indexOf("case 0x7B30:") < uart.indexOf("case 0x7B00:") && uart.indexOf("case 0x7B00:") < uart.indexOf("case 0x0514:"));
  assert.match(uart, /\) == mb_port_timestamp\(Port\);/);
  assert.match(uart, /Reply.Header.ID = 0x7B31;/);
  const passes = fs.readFileSync(path.join(work, "App/bricohams/passes.c"), "utf8");
  assert.doesNotMatch(passes, /Physical|0x010000|0x10000/);
  assert.match(fs.readFileSync(path.join(work, "App/bricohams/satellite_foxhunt.inc"), "utf8"), /key == KEY_0/);
});
