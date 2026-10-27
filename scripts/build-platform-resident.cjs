"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

function inspectResident(bytes, symbols) {
  assert(Buffer.isBuffer(bytes) && bytes.length >= 256 && bytes.length <= 118 * 1024,
    "Imagen fuera de limites.");
  const symbol = name => {
    const line = symbols.split(/\r?\n/).find(item => new RegExp(`^[0-9a-fA-F]+\\s+\\w\\s+${name}$`).test(item));
    assert(line, `Simbolo ausente: ${name}`);
    return Number.parseInt(line.split(/\s+/)[0], 16);
  };
  const thumb = address => address % 2 === 1 &&
    address >= 0x08002801 && address < 0x08002800 + bytes.length;
  assert.equal(bytes.readUInt32LE(0), 0x20004000, "Pila fuera de la region reservada.");
  for (const [index, name] of [[1, "Reset_Handler"], [15, "SysTick_Handler"]]) {
    const address = bytes.readUInt32LE(index * 4);
    assert(thumb(address), `Vector ${name} invalido.`);
    assert.equal(address, symbol(name) | 1, `Vector ${name} no coincide con ELF.`);
  }
  const fault = symbol("Fault_Handler") | 1;
  assert(thumb(fault), "Vector Fault invalido.");
  for (let index = 2; index < 64; index++)
    if (index !== 15) assert.equal(bytes.readUInt32LE(index * 4), fault, `Vector inesperado: ${index}`);
  assert.equal(symbol("_app_start"), 0x20002000);
  assert.equal(symbol("_app_end"), 0x20003000);
  const bssStart = symbol("_bss_start"), bssEnd = symbol("_bss_end");
  const dataStart = symbol("_data_start"), dataEnd = symbol("_data_end");
  assert(dataStart >= 0x20000000 && dataStart <= dataEnd && dataEnd <= bssStart &&
    bssStart <= bssEnd && bssEnd <= 0x20002000, "RAM del nucleo fuera de limites.");
  return { coreRamUsedBytes: bssEnd - 0x20000000, systickVector: bytes.readUInt32LE(60) };
}

function build(output, vendor) {
  assert(output, "Uso: node scripts\\build-platform-resident.cjs <destino nuevo> [fuentes PY32]");
  const root = path.resolve(__dirname, "..");
  const source = path.join(root, "firmware", "platform");
  vendor = path.resolve(vendor || path.join(root, "firmware", "Fusion61"));
  output = path.resolve(output);
  assert(!fs.existsSync(output), "El destino ya existe; no se sobrescribe.");
  const system = path.join(vendor, "Core", "Src", "system_py32f071.c");
  const includes = [
    path.join(vendor, "Drivers", "CMSIS", "Device", "PY32F071", "Include"),
    path.join(vendor, "Drivers", "CMSIS", "Include"),
    path.join(vendor, "Drivers", "PY32F071_HAL_Driver", "Inc")
  ];
  assert(fs.existsSync(system), "Faltan las fuentes CMSIS PY32F071.");
  const apacheLicense = path.join(vendor, "LICENSE");
  assert(fs.existsSync(apacheLicense) &&
    fs.readFileSync(apacheLicense, "utf8").includes("Apache License"), "Falta la licencia Apache-2.0 de CMSIS.");
  for (const directory of includes) assert(fs.existsSync(directory), `Falta ${directory}`);
  const compiler = execFileSync("arm-none-eabi-gcc", ["--version"], { encoding: "utf8" }).split(/\r?\n/)[0];
  fs.mkdirSync(output, { recursive: true });
  const embedded = [];
  const packages = [];
  for (const app of ["diagnostics", "blocks"]) {
    const directory = path.join(output, app);
    require("./build-platform-app.cjs").build(directory, app);
    const bytes = fs.readFileSync(path.join(directory, `${app}.bha`));
    embedded.push(`const uint8_t bh_embedded_${app}[] = {${Array.from(bytes).join(",")}};`,
      `const size_t bh_embedded_${app}_size = sizeof(bh_embedded_${app});`);
    packages.push({ app, bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  }
  const bundle = path.join(output, "embedded-apps.c");
  fs.writeFileSync(bundle, `#include <stddef.h>\n#include <stdint.h>\n${embedded.join("\n")}\n`);
  const files = ["startup.S", "resident.c", "memory.c", "bh_shell.c", "bh_launcher.c",
    "bh_text.c", "bh_package.c", "resident_apps.c"];
  const elf = path.join(output, "bricohams-platform.elf");
  execFileSync("arm-none-eabi-gcc", ["-mcpu=cortex-m0plus", "-mthumb", "-std=c11", "-Os",
    "-ffreestanding", "-fno-builtin", "-fno-unwind-tables", "-fno-asynchronous-unwind-tables",
    "-ffunction-sections", "-fdata-sections", "-fstack-usage",
    "-Wall", "-Wextra", "-Wconversion", "-Werror", "-DPY32F071x8",
    "-I", source, ...includes.flatMap(directory => ["-isystem", directory]),
    "-nostdlib", "-Wl,--gc-sections", "-Wl,--build-id=none",
    `-Wl,-T,${path.join(source, "resident.ld")}`,
    `-Wl,-Map,${path.join(output, "bricohams-platform.map")}`,
    ...files.map(file => path.join(source, file)), bundle, system, "-lgcc", "-o", elf], { stdio: "inherit" });
  const unresolved = execFileSync("arm-none-eabi-nm", ["--undefined-only", elf], { encoding: "utf8" }).trim();
  assert.equal(unresolved, "", "Hay simbolos sin resolver.");
  const binary = path.join(output, "bricohams-platform-experimental.bin");
  execFileSync("arm-none-eabi-objcopy", ["-O", "binary", elf, binary]);
  const bytes = fs.readFileSync(binary);
  const symbols = execFileSync("arm-none-eabi-nm", ["--defined-only", elf], { encoding: "utf8" });
  const inspected = inspectResident(bytes, symbols);
  const size = execFileSync("arm-none-eabi-size", [elf], { encoding: "utf8" }).trim();
  const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");
  fs.writeFileSync(path.join(output, "build-info.json"), JSON.stringify({
    format: "bricohams-independent-resident-build", version: 1, compiler,
    stability: "experimental", hardwareTested: false, installableWithCurrentWeb: false,
    bootloaderProvided: false, requiresVendorBootloader: true,
    flashAddress: "0x08002800", appRamAddress: "0x20002000",
    coreRamBytes: 8192, appRamBytes: 4096, stackBytes: 4096,
    ...inspected, timebase: "SysTick 1ms interrupt; external NVIC IRQs disabled",
    binaryBytes: bytes.length, sha256: sha256(bytes), size,
    applications: packages, embeddedPackagesExecutedFromRam: true,
    externalPackageInstallationSupported: false, usbInstallerProvided: false, rfServicesProvided: false,
    warning: "Experimental resident. Not a validated slot image. Do not install with current web tools.",
    sources: [...files, "resident.ld", "bh_api.h", "bh_package.h", "bh_shell.h", "bh_launcher.h", "bh_text.h"]
      .map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(source, file))) })),
    vendorSystem: { file: "Core/Src/system_py32f071.c", sha256: sha256(fs.readFileSync(system)),
      attribution: "Puya Semiconductor / STMicroelectronics, BSD-3-Clause; see source headers." }
  }, null, 2) + "\n");
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(output, "LICENSE"));
  fs.copyFileSync(system, path.join(output, "system_py32f071.c"));
  fs.copyFileSync(apacheLicense, path.join(output, "CMSIS-LICENSE.txt"));
  fs.copyFileSync(path.join(source, "THIRD-PARTY-NOTICES.txt"), path.join(output, "THIRD-PARTY-NOTICES.txt"));
  console.log(`${size}\nExperimental resident: ${bytes.length} bytes. Not hardware validated; do not flash.`);
}

if (require.main === module) {
  try { build(process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build, inspectResident };
