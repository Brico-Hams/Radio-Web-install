"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const R = require("../radio-core.js");
require("../transports.js");
require("../quansheng-connector.js");
require("../custom-firmware-ui.js");
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
  ["bricohams-ardf", "ardf", "BH ARDF", "5e2aec16b7a8d6c6d1880fdcb82e66fada4e29c5a5fdafe3397e585e629ef661"],
  ["bricohams-satellite", "satellite", "BH Satellite", "957679f323684a7e2a68b05455f34b88c226b4647fdbfe14dd48035feb39245b"],
  ["bricohams-spectrum", "spectrum", "BH Spectrum", "3164be3c7cd49725897bc680d7f379a9f861ce4addb9c2b9ca460cc37bfb7ee4"],
  ["bricohams-labs", "labs", "BH Labs", "938a7cd80b489c9c1746b710c7ae4533526674b13e5f97083f6bea850721140a"],
  ["bricohams-fusion", "fusion", "BH Fusion", "e053c1d3671a33bb2361d91ec5555404763bd69e4f0d2548549e6b2a68d86356"],
  ["f4hwn-fusion", "f4hwn-fusion", "BH F4 Fusion", "1009c0f54b29b8d4ea0d81b2fffcfabe09056bccd336dabcba4c102b3a810503"],
  ["f4hwn-fieldops", "f4hwn-fieldops", "BH F4 FieldOps", "cbf556ed40c6bdbb684ef6cf651960f87ca77014c32422b0e5bdb11553413d7f"],
  ["f4hwn-labs", "f4hwn-labs", "BH F4 Labs", "f851dde8532aaba66c9110279b5891f332a25823a0e63e0f6c308ffe44d1a794"],
  ["f4hwn-transfer", "f4hwn-transfer", "BH F4 Transfer", "1584bfd010fa171c1ddc5b48fa31ed07409d585c23147f9a644d426661b8fea2"]
];
async function publish() {
  const entries = [];
  const files = [];
  for (const [id, folder, edition, expected] of builds) {
    const directory = path.join(root, "firmware-builds", "backup-read-20261031", folder, "artifacts");
    const artifacts = await Promise.all((await fs.readdir(directory)).map(async name =>
      ({ name, bytes: new Uint8Array(await fs.readFile(path.join(directory, name))) })));
    const checked = await R.verifyCustomBuild(artifacts);
    R.assert(checked.firmware.sha256 === expected, `Imagen distinta de la fijada: ${id}.`);
    R.assert(checked.info.backupReadIntegration?.physicalRead === true &&
      checked.info.backupReadIntegration?.crc === true &&
      checked.info.backupReadIntegration?.persistentWritesAdded === false,
      `Integracion de respaldo de solo lectura ausente: ${id}.`);
    R.inspectQuanshengSlotImage(checked.firmware.bytes);
    const name = `${id}.bin`;
    files.push([name, checked.firmware.bytes]);
    entries.push({
      id, name, edition, publisher: "Bricohams", version: "v6.1.0",
      distributionVersion: "v0.5.5",
      size: checked.firmware.bytes.length, sha256: expected, path: `precompiled/${name}`,
      targets: ["UV-K1", "UV-K5-V3"], stability: "beta", hardwareBootTested: false,
      license: "GPL-3.0-or-later AND Apache-2.0",
      source: "https://github.com/Brico-Hams/Radio-Web-install",
      upstream: checked.info.upstream, build: checked.info
    });
  }
  const notices = path.join(root, "firmware-builds", "backup-read-20261031", "ardf", "artifacts");
  files.push(["LICENSE.txt", await fs.readFile(path.join(root, "LICENSE"))],
    ["APACHE-2.0.txt", await fs.readFile(path.join(notices, "LICENSE"))],
    ["NOTICE.txt", await fs.readFile(path.join(notices, "NOTICE"))],
    ["BRICOHAMS-NOTICE.txt", await fs.readFile(path.join(notices, "MODULE-NOTICE.txt"))]);
  const output = path.join(root, "precompiled");
  await fs.mkdir(output, { recursive: true });
  for (const [name, bytes] of files) await fs.writeFile(path.join(output, name), bytes);
  await fs.writeFile(path.join(output, "catalog.json"), JSON.stringify({
    format: "bricohams-precompiled-catalog", version: 1, license: "GPL-3.0-or-later",
    licensePath: "precompiled/LICENSE.txt", entries
  }, null, 2) + "\n");
  console.log(`Catalogo publicado: ${entries.length} imagenes con SHA-256 verificado.`);
  return entries;
}
if (require.main === module) (process.argv.includes("--apps-only") ? publishApps() : publish()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { publish, publishApps };
