"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const R = require("../radio-core.js");

function build(output, app = "diagnostics") {
  assert(["diagnostics", "blocks"].includes(app), "App admitida: diagnostics o blocks.");
  assert(output, "Uso: node scripts\\build-platform-app.cjs <directorio nuevo>");
  output = path.resolve(output);
  assert(!fs.existsSync(output), "El destino ya existe; no se sobrescribe.");
  const root = path.join(__dirname, "..");
  const source = path.join(root, "firmware", "platform");
  const compiler = execFileSync("arm-none-eabi-gcc", ["--version"], { encoding: "utf8" }).split(/\r?\n/)[0];
  fs.mkdirSync(output, { recursive: true });
  const entryName = `bh_${app}_event`;
  const elf = path.join(output, `${app}.elf`);
  execFileSync("arm-none-eabi-gcc", ["-mcpu=cortex-m0plus", "-mthumb", "-std=c11", "-Os",
    "-ffreestanding", "-fno-builtin", "-fno-unwind-tables", "-fno-asynchronous-unwind-tables",
    "-ffunction-sections", "-fdata-sections", "-Wall", "-Wextra", "-Wconversion", "-Werror",
    "-nostdlib", "-Wl,--gc-sections", "-Wl,--build-id=none",
    `-Wl,-T,${path.join(source, "app.ld")}`, `-Wl,-e,${entryName}`,
    path.join(source, `${app}.c`), "-o", elf], { stdio: "inherit" });
  const binary = path.join(output, `${app}-code.bin`);
  execFileSync("arm-none-eabi-objcopy", ["-O", "binary", elf, binary]);
  const code = fs.readFileSync(binary);
  assert(code.length >= 2 && code.length <= 4096 && code.length % 2 === 0);
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", elf], { encoding: "utf8" });
  const entry = symbols.split(/\r?\n/).find(line => new RegExp(`\\s[Tt]\\s${entryName}$`).test(line));
  assert(entry, "Punto de entrada ausente.");
  const address = Number.parseInt(entry.split(/\s+/)[0], 16);
  const entryOffset = address - 0x20002000;
  assert(entryOffset >= 0 && entryOffset % 2 === 0 && entryOffset + 2 <= code.length);
  const header = Buffer.alloc(64);
  header.write("BHA1");
  for (const [offset, value] of [[4, 64], [8, 2], [12, 1], [16, code.length],
    [28, entryOffset], [32, 3], [36, R.crc32(code)]]) header.writeUInt32LE(value, offset);
  const name = app === "blocks" ? "Blocks" : "Diagnostics";
  header.write(name, 40);
  header.writeUInt32LE(R.crc32(header.subarray(0, 60)), 60);
  const bytes = Buffer.concat([header, code]);
  fs.writeFileSync(path.join(output, `${app}.bha`), bytes, { flag: "wx" });
  fs.writeFileSync(path.join(output, "build-info.json"), JSON.stringify({
    format: "bricohams-platform-app-build", version: 1, packageFormat: "BHA1",
    app: name, apiVersion: 2, compiler, linkAddress: "0x20002000",
    appStateBudgetBytes: app === "blocks" ? 256 : 0,
    entryOffset, codeBytes: code.length, packageBytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    nativeApplication: true, hardwareTested: false, runnableFirmwareProvided: false,
    warning: "Experimental fixed-address app. Not FAP1; do not install with the existing radio tools.",
    sources: ["bh_api.h", `${app}.c`, ...(app === "blocks" ? ["blocks.h"] : []), "app.ld"].map(file => ({
      file, sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(source, file))).digest("hex")
    }))
  }, null, 2) + "\n");
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(output, "LICENSE"));
  console.log(`BHA1 ${name}: ${bytes.length} bytes; linked for 0x20002000. No resident firmware or hardware validation.`);
}

if (require.main === module) {
  try { build(process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build };
