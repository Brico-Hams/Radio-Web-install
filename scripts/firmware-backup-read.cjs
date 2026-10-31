"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { replaceOnce } = require("./bricohams-modules.cjs");

const GUARD = "#if defined(ENABLE_FEAT_F4HWN_EXT_FLASH_RW) || defined(ENABLE_AIRCOPY_FLASH)";
const READ_GUARD = `${GUARD} || defined(ENABLE_FEAT_F4HWN_MULTIBOOT)`;
const FILES = ["App/app/uart.c", "App/driver/py25q16.h", "App/driver/mb_flash.h", "App/driver/mb_flash.c"];

function patchBackupReadSource(file, source) {
  assert(!source.includes("BRICOHAMS_FLASH_BACKUP_READ"), `Integracion de respaldo ya aplicada: ${file}`);
  let text = source.replace(/\r\n/g, "\n");
  const change = (before, after) => { text = replaceOnce(text, before, after, file); };
  if (file === "App/app/uart.c") {
    change('#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT\n    #include "driver/mb_flash.h"\n    #ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        #include "driver/py25q16.h"\n    #endif\n#endif',
      '#ifdef ENABLE_FEAT_F4HWN_MULTIBOOT\n    #include "driver/mb_flash.h"\n    #include "driver/py25q16.h"\n#endif');
    change("#ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        // ---- full external-flash dump / restore (host: UV Studio) ----------",
      "        // Read and CRC support is available to every multiboot backup host.");
    change("        case 0x073A: // erase one 4 KiB external-flash sector by physical address",
      "#ifdef ENABLE_FEAT_F4HWN_EXT_FLASH_RW\n        case 0x073A: // erase one 4 KiB external-flash sector by physical address");
    change("        case 0x073E: // CRC-32 of a physical external-flash range",
      "#endif // raw erase/program retain the original build-time permission\n\n        case 0x073E: // CRC-32 of a physical external-flash range");
    change("#endif // ENABLE_FEAT_F4HWN_EXT_FLASH_RW", "// End of raw backup commands.");
  } else if (file === "App/driver/py25q16.h") {
    change(GUARD, READ_GUARD);
    change("/* Raw 4 KiB sector erase; Address must already be sector-aligned. */",
      `#endif\n\n${GUARD}\n/* Raw 4 KiB sector erase; Address must already be sector-aligned. */`);
  } else if (file === "App/driver/mb_flash.h" || file === "App/driver/mb_flash.c") {
    change(GUARD, READ_GUARD);
  } else {
    throw new Error(`Fuente de respaldo no admitida: ${file}`);
  }
  return `/* BRICOHAMS_FLASH_BACKUP_READ: physical read/CRC without new raw write permissions. */\n${text}`;
}

function integrateBackupRead(work) {
  // Validate every pinned-source anchor before changing any file.
  const staged = FILES.map(file => ({ file,
    text: patchBackupReadSource(file, fs.readFileSync(path.join(work, file), "utf8")) }));
  for (const { file, text } of staged) fs.writeFileSync(path.join(work, file), text);
  return { version: 1, physicalRead: true, crc: true, persistentWritesAdded: false,
    sources: staged.map(({ file, text }) => ({ file, sha256: createHash("sha256").update(text).digest("hex") })) };
}

module.exports = { patchBackupReadSource, integrateBackupRead };
