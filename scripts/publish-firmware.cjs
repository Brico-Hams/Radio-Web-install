"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const R = require("../radio-core.js");
require("../transports.js");
require("../quansheng-connector.js");
require("../custom-firmware-ui.js");
const { parseF4Release } = require("../firmware-service.cjs");
const root = path.join(__dirname, "..");
const appBuilds = [
  ["SystemInfo", "aec8dce24c5b216844f09730141556bca2bc072cdf0313097b64cf38fe1fc38a"],
  ["BroadcastFM", "634344cae2abad79f8a923cfe610a68327f4c9fa17f6300a339770f627320943"],
  ["Cube3D", "2360a1dc25580c361af00f6b1f03dabf5f097a1f8401f48323e2ba4f0f899889"],
  ["Tetris", "d0392f7559fa5f4909901b80b7bd6f35592f1ffef0592d392d54f6a87a91b9f0"],
  ["Breakout", "3f28a7d6535c38386dbcaa3e7aece5db0d43790dce23dc8831cb73211d7ec299"],
  ["Minesweeper", "4858c5e48a6fb7a16f9382fda4527fc52f33d62a87c305dde38368c609f2d1c1"]
];
async function publishApps() {
  const entries = [];
  const files = [];
  for (const [id, sha256] of appBuilds) {
    const bytes = new Uint8Array(await fs.readFile(path.join(root, "firmware", "Fusion61", "archive", "apps", "v6.1.0", `${id}.app`)));
    R.assert(await R.sha256(bytes) === sha256, `App distinta de la fijada: ${id}.`);
    const { header } = R.parseQuanshengApp(bytes);
    files.push([`${id}.app`, bytes]);
    entries.push({ id, path: `precompiled/apps/${id}.app`, size: bytes.length, sha256,
      name: header.name, version: header.appVersion, abi: header.abi, apiMin: header.apiMin,
      firmwareRelease: "v6.1.0", hardwareBootTested: false, license: "Apache-2.0",
      source: `https://github.com/armel/uv-k1-k5v3-firmware-custom/blob/f556a96e73c3e423a00cf473aeb37f827cac05a5/archive/apps/v6.1.0/${id}.app` });
  }
  const output = path.join(root, "precompiled", "apps");
  await fs.mkdir(output, { recursive: true });
  for (const [name, bytes] of files) await fs.writeFile(path.join(output, name), bytes);
  await fs.writeFile(path.join(output, "catalog.json"), JSON.stringify({
    format: "bricohams-precompiled-apps", version: 1, entries
  }, null, 2) + "\n");
  console.log(`Catalogo apps publicado: ${entries.length} apps con SHA-256 y FAP1 verificados.`);
}
const builds = [
  ["bricohams-ardf", "ardf", "BH ARDF", "edb1ef30107791643d6cc016025e621acb5f27199f73aa45ccbef5224deb5403"],
  ["bricohams-satellite", "satellite", "BH Satellite", "cb4aaf604d6a05a0cc1ddf6287453fdf79a914123d4d930bad89dbb1c9f5cf57"],
  ["bricohams-spectrum", "spectrum", "BH Spectrum", "61480d5203bbed25d19d71bedd97fef31375495389c8ea60988b0490cbe2edf8"],
  ["bricohams-labs", "labs", "BH Labs", "bd7fbe4bcb0c5e4def304d5ab95d25c9d4362bc791661b90479ecb2c84df4717"],
  ["bricohams-fusion", "fusion", "BH Fusion", "d75d6fecd5722f6eb49760abafdf4efbbc272608a0be01d702b8d5297adacac5"]
];
async function publish({ official = false } = {}) {
  const entries = [];
  const files = [];
  for (const [id, folder, edition, expected] of builds) {
    const directory = path.join(root, "firmware-builds", "bricohams-20261027", folder, "artifacts");
    const artifacts = await Promise.all((await fs.readdir(directory)).map(async name =>
      ({ name, bytes: new Uint8Array(await fs.readFile(path.join(directory, name))) })));
    const checked = await R.verifyCustomBuild(artifacts);
    R.assert(checked.firmware.sha256 === expected, `Imagen distinta de la fijada: ${id}.`);
    R.inspectQuanshengSlotImage(checked.firmware.bytes);
    const name = `${id}.bin`;
    files.push([name, checked.firmware.bytes]);
    entries.push({
      id, name, edition, publisher: "Bricohams", version: "v6.1.0",
      distributionVersion: "v0.5.2",
      size: checked.firmware.bytes.length, sha256: expected, path: `precompiled/${name}`,
      targets: ["UV-K1", "UV-K5-V3"], stability: "beta", hardwareBootTested: false,
      license: "GPL-3.0-or-later AND Apache-2.0",
      source: "https://github.com/Brico-Hams/Radio-Web-install",
      upstream: checked.info.upstream, build: checked.info
    });
  }
  if (official) {
    const response = await fetch("https://api.github.com/repos/armel/uv-k1-k5v3-firmware-custom/releases/tags/v6.1.0",
      { signal: AbortSignal.timeout(60000), headers: { "User-Agent": "Bricohams-Radio-Workspace" } });
    R.assert(response.ok, `GitHub: HTTP ${response.status}.`);
    for (const entry of parseF4Release(await response.json(), "UV-K5-V3").filter(item => item.slotCompatible)) {
      const response = await fetch(entry.url, { signal: AbortSignal.timeout(60000) });
      R.assert(response.ok, `Descarga oficial: HTTP ${response.status}.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      R.assert(bytes.length === entry.size && await R.sha256(bytes) === entry.expectedSHA256,
        `SHA-256 o tamano oficial incorrecto: ${entry.name}.`);
      R.inspectQuanshengSlotImage(bytes, entry.name);
      const id = `f4hwn-${entry.edition}`;
      const name = `${id}.bin`;
      files.push([name, bytes]);
      entries.push({ id, name, edition: `F4HWN ${entry.edition}`, publisher: entry.publisher, version: entry.version,
        size: entry.size, sha256: entry.expectedSHA256, path: `precompiled/${name}`,
        targets: ["UV-K1", "UV-K5-V3"], stability: "upstream-stable", hardwareBootTested: false,
        license: "Apache-2.0", source: entry.source, originalURL: entry.url,
        upstream: { repository: "https://github.com/armel/uv-k1-k5v3-firmware-custom", tag: entry.version } });
    }
  }
  const output = path.join(root, "precompiled");
  await fs.mkdir(output, { recursive: true });
  for (const [name, bytes] of files) await fs.writeFile(path.join(output, name), bytes);
  await fs.copyFile(path.join(root, "LICENSE"), path.join(output, "LICENSE.txt"));
  const notices = path.join(root, "firmware-builds", "bricohams-20261027", "ardf", "artifacts");
  await fs.copyFile(path.join(notices, "LICENSE"), path.join(output, "APACHE-2.0.txt"));
  await fs.copyFile(path.join(notices, "NOTICE"), path.join(output, "NOTICE.txt"));
  await fs.copyFile(path.join(notices, "MODULE-NOTICE.txt"), path.join(output, "BRICOHAMS-NOTICE.txt"));
  await fs.writeFile(path.join(output, "catalog.json"), JSON.stringify({
    format: "bricohams-precompiled-catalog", version: 1, license: "GPL-3.0-or-later",
    licensePath: "precompiled/LICENSE.txt", entries
  }, null, 2) + "\n");
  console.log(`Catalogo publicado: ${entries.length} imagenes con SHA-256 verificado.`);
  return entries;
}
if (require.main === module) (process.argv.includes("--apps-only") ? publishApps() :
  publish({ official: process.argv.includes("--official") }).then(publishApps)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { publish, publishApps };
