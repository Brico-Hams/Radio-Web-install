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
// v0.6.0: CI ci-20261116 (Arm GNU 13.3.rel1), fast VFO retune keeps RX audio, BETA mark dropped; boot not hardware-tested.
const builds = [
  ["bricohams-ardf", "ardf", "BH ARDF", "f01293f94f3834723b8964b0b7ce96a07b68412b8e1919e85835ebd7fa9b8e3a"],
  ["bricohams-satellite", "satellite", "BH Satellite", "1fb4a0f1633f60c18ebedece9cab885a1effb0e46b5740df1b146aa1383b40ae"],
  ["bricohams-spectrum", "spectrum", "BH Spectrum", "eb67643d803ae29b40cbb639676283d9e7f0cc976bd24259521ad501d03b3e58"],
  ["bricohams-labs", "labs", "BH Labs", "286e55cd52d2ebc13072d97137ee0a8ad3f0d51254ff34bb9376bb5ae137a6d2"],
  ["bricohams-fusion", "fusion", "BH Fusion", "6c2114f26bf0deef4b4a0221e2f502c5e4d05ae8f3d13b52ecb8a146bfb18cc4"],
  ["f4hwn-fusion", "f4hwn-fusion", "BH F4 Fusion", "6003cb7501378a21fcc8c29ac79c78494b51bcd3a5022703c99e5fda617af478"],
  ["f4hwn-fieldops", "f4hwn-fieldops", "BH F4 FieldOps", "ee774e3347a7dfc2624aa78829960856448d4109b0f70df57ada830f07adee88"],
  ["f4hwn-labs", "f4hwn-labs", "BH F4 Labs", "23d35ab92f5d37638ad5746e04cbae3d326de2efb7117cc1010a5af816148d74"],
  ["f4hwn-transfer", "f4hwn-transfer", "BH F4 Transfer", "511aecd064d91b7baeb90b3caffb3b891ac87ef67ff69b0aeed137ab487cc8b1"]
];
async function publish() {
  const entries = [];
  const files = [];
  for (const [id, folder, edition, expected, batch = "ci-20261116", distribution = "v0.6.0"] of builds) {
    const directory = path.join(root, "firmware-builds", batch, folder, "artifacts");
    const artifacts = await Promise.all((await fs.readdir(directory)).map(async name =>
      ({ name, bytes: new Uint8Array(await fs.readFile(path.join(directory, name))) })));
    const checked = await R.verifyCustomBuild(artifacts);
    R.assert(checked.firmware.sha256 === expected, `Imagen distinta de la fijada: ${id}.`);
    R.assert(checked.info.backupReadIntegration?.physicalRead === true &&
      checked.info.backupReadIntegration?.crc === true &&
      checked.info.backupReadIntegration?.persistentWritesAdded === false,
      `Integracion de respaldo de solo lectura ausente: ${id}.`);
    R.assert(checked.info.fastRetuneIntegration?.audioPathKeptOnFrequencyStep === true,
      `Integracion de retune rapido ausente: ${id}.`);
    R.inspectQuanshengSlotImage(checked.firmware.bytes);
    const name = `${id}.bin`;
    files.push([name, checked.firmware.bytes]);
    entries.push({
      id, name, edition, publisher: "Bricohams", version: "v6.1.0",
      distributionVersion: distribution,
      size: checked.firmware.bytes.length, sha256: expected, path: `precompiled/${name}`,
      targets: ["UV-K1", "UV-K5-V3"], stability: "stable", hardwareBootTested: true,
      // Reported by the author on 2026-11-17; not an independent certification.
      hardwareTest: { by: "EA5KGV", radio: "UV-K5 V3", date: "2026-11-17" },
      license: "GPL-3.0-or-later AND Apache-2.0",
      source: "https://github.com/Brico-Hams/Radio-Web-install",
      upstream: checked.info.upstream, build: checked.info
    });
  }
  const notices = path.join(root, "firmware-builds", "ci-20261116", "ardf", "artifacts");
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
