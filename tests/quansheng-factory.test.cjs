const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const R = require("../radio-core.js");
require("../transports.js");
require("../quansheng-connector.js");
require("../backup-store.js");
require("../quansheng-tools.js");
require("../quansheng-factory.js");
const root = path.join(__dirname, "..");
const le = R.view;
const key = [0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80];
function reply(type, data) {
  const result = new Uint8Array(data.length + 12);
  const body = new Uint8Array(data.length + 6);
  le(body).setUint16(0, type, true);
  le(body).setUint16(2, data.length, true);
  body.set(data, 4);
  le(body).setUint16(body.length - 2, 65535, true);
  result.set([171, 205, (data.length + 4) & 255, (data.length + 4) >> 8]);
  result.set(body.map((byte, index) => byte ^ key[index % 16]), 4);
  result.set([220, 186], result.length - 2);
  return result;
}
// Isolated context substitutes only fixture digests and authority so tests never
// ship stock binaries or grant a production permit for synthetic firmware.
function fixture() {
  const permit = {};
  const state = { verifiedBackups: 0, erased: 0, revoked: false, invalidHash: false };
  const api = {
    ...R,
    QuanshengConnector: class extends R.QuanshengConnector {},
    sha256: async bytes => state.invalidHash ? "0".repeat(64) : bytes.length === 0x200000 ?
      R.QUANSHENG_FACTORY_TARGETS["UV-K5-V3"].flashSHA256 : R.QUANSHENG_FACTORY_TARGETS["UV-K5-V3"].firmwareSHA256,
    assertBackup: (connector, value) => assert.equal(value, permit, "full backup required"),
    verifyBackup: async (connector, value) => { assert.equal(value, permit); state.verifiedBackups++; },
    revokeBackup: () => { state.revoked = true; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "quansheng-factory.js"), "utf8"),
    { RadioWorkspace: api, Uint8Array, TextEncoder, Date, Object, WeakMap, Promise });
  const transport = new R.BufferedTransport();
  transport.opened = true;
  const connector = new api.QuanshengConnector(transport);
  connector.connected = true;
  connector.model = "UV-K5-V3";
  connector.restoreFlashImageRaw = async () => { state.erased++; };
  const flash = new Uint8Array(0x200000);
  const firmware = new Uint8Array(71712).fill(55);
  return { api, state, connector, permit, flash, firmware };
}
class Bootloader extends R.BufferedTransport {
  constructor() {
    super();
    this.commands = [];
    this.pages = [];
    this.version = "7.00.07";
  }
  async open(baud) {
    assert.equal(baud, 38400);
    this.opened = true;
    const info = new Uint8Array(32);
    info.fill(17, 0, 16);
    info.set(new TextEncoder().encode(this.version), 16);
    for (let i = 0; i < 3; i++) {
      const notification = info.slice();
      if (this.inconsistent && i === 1) notification[0]++;
      this.push(reply(0x0518, notification));
    }
  }
  async close() { this.opened = false; }
  async write(frame) {
    const request = R.decodeQuanshengPacket(frame);
    this.commands.push(request);
    if (request.type === 0x0530) {
      assert.equal(new TextDecoder().decode(request.data), "7.00");
      return;
    }
    assert.equal(request.type, 0x0519);
    assert.equal(request.data.length, 268);
    const page = le(request.data).getUint16(4, true);
    const count = le(request.data).getUint16(6, true);
    this.pages.push(page);
    const response = new Uint8Array(8);
    le(response).setUint32(0, le(request.data).getUint32(0, true), true);
    le(response).setUint16(4, this.wrongPage ? page + 1 : page, true);
    le(response).setUint16(6, this.rejected ? 3 : 0, true);
    this.push(reply(0x051a, response));
    assert.equal(count, Math.ceil(71712 / 256));
  }
}
test("production stock verification rejects untrusted bytes, wrong model and wrong sizes", async () => {
  const files = [new Uint8Array(0x200000), new Uint8Array(71712)];
  await assert.rejects(R.verifyQuanshengFactoryFiles("UV-K5-V3", ...files), /SHA-256/);
  await assert.rejects(R.verifyQuanshengFactoryFiles("UV-K5", ...files), /Modelo/);
  await assert.rejects(R.verifyQuanshengFactoryFiles("UV-K1", ...files), /Tamano/);
  assert.equal(R.QUANSHENG_FACTORY_TARGETS["UV-K5-V3"].bootloader.test("7.00.07"), true);
  assert.equal(R.QUANSHENG_FACTORY_TARGETS["UV-K5-V3"].bootloader.test("7.02.02"), false);
  assert.equal(R.QUANSHENG_FACTORY_TARGETS["UV-K1"].bootloader.test("7.00.07"), false);
  assert.equal(R.QUANSHENG_FACTORY_TARGETS["UV-K1"].bootloader.test("7.03.01"), true);
});
test("factory phase 1 verifies both files, full backup and explicit model-specific consent before erasing", async () => {
  const f = fixture();
  await assert.rejects(f.connector.prepareFactoryRestore(f.flash, f.firmware, {}, "FABRICA UV-K5-V3"), /full backup/);
  await assert.rejects(f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, ""), /Confirma/);
  assert.equal(f.state.erased, 0);
  f.state.invalidHash = true;
  await assert.rejects(f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3"), /SHA-256/);
  assert.equal(f.state.erased, 0);
  f.state.invalidHash = false;
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  assert.ok(Object.isFrozen(stage));
  assert.equal(f.state.erased, 1);
  assert.equal(f.state.verifiedBackups, 1);
  assert.equal(f.state.revoked, true);
});
test("native DFU checks bootloader and confirms every page, zero-pads final page, disallows replay", async () => {
  const f = fixture();
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  f.firmware.fill(0);
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  const result = await dfu.flashFactory(stage, "DFU UV-K5-V3");
  assert.equal(result.pages, 281);
  assert.equal(result.readBackAvailable, false);
  assert.equal(result.manualBootPending, true);
  assert.equal(transport.commands.filter(item => item.type === 0x0530).length, 3);
  assert.deepEqual(transport.pages, Array.from({ length: 281 }, (_, index) => index));
  const last = transport.commands.at(-1).data;
  assert.equal(last[12], 55, "snapshot immune to caller mutation");
  assert.equal(last[12 + 31], 55);
  assert.equal(last[12 + 32], 0);
  await assert.rejects(dfu.flashFactory(stage, "DFU UV-K5-V3"), /Falta/);
  await dfu.disconnect();
});
test("DFU rejects missing authority, mismatched model and missing acknowledgement before page writes", async () => {
  const f = fixture();
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  await assert.rejects(dfu.flashFactory({}, "DFU UV-K5-V3"), /Falta/);
  await assert.rejects(dfu.flashFactory(stage, ""), /Confirma/);
  dfu.model = "UV-K1";
  await assert.rejects(dfu.flashFactory(stage, "DFU UV-K1"), /Falta/);
  assert.equal(transport.commands.length, 0);
  await dfu.disconnect();
});
test("DFU never programs an unrecognized bootloader or continues after a rejected/mismatched page", async () => {
  for (const failure of ["bootloader", "wrongPage", "rejected"]) {
    const f = fixture();
    const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
    const transport = new Bootloader();
    if (failure === "bootloader") transport.version = "2.01.00";
    else transport[failure] = true;
    const dfu = new f.api.QuanshengFactoryDFU(transport);
    await dfu.openFactory("UV-K5-V3");
    await assert.rejects(dfu.flashFactory(stage, "DFU UV-K5-V3"), /Bootloader|pagina/);
    assert.equal(transport.pages.length, failure === "bootloader" ? 0 : 1);
    assert.equal(dfu.connected, false);
    await dfu.disconnect();
  }
});
test("DFU retries only bounded timeouts on identical page data", async () => {
  const f = fixture();
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  const receive = dfu.receiveResponse.bind(dfu);
  let attempts = 0;
  dfu.receiveResponse = async (expected, ...args) => {
    if (expected === 0x051a && attempts++ < 2) {
      transport.clear();
      throw Object.assign(new Error("timeout"), { code: "READ_TIMEOUT" });
    }
    return receive(expected, ...args);
  };
  await dfu.flashFactory(stage, "DFU UV-K5-V3");
  assert.deepEqual(transport.pages.slice(0, 4), [0, 0, 0, 1]);
  assert.deepEqual(transport.commands[3].data, transport.commands[4].data);
  assert.deepEqual(transport.commands[4].data, transport.commands[5].data);
  await dfu.disconnect();
});
test("DFU stops after four attempts on one page, without marking the stage completed", async () => {
  const f = fixture();
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  const receive = dfu.receiveResponse.bind(dfu);
  dfu.receiveResponse = async (expected, ...args) => {
    if (expected === 0x051a) {
      transport.clear();
      throw Object.assign(new Error("timeout"), { code: "READ_TIMEOUT" });
    }
    return receive(expected, ...args);
  };
  await assert.rejects(dfu.flashFactory(stage, "DFU UV-K5-V3"), /timeout/);
  assert.deepEqual(transport.pages, [0, 0, 0, 0]);
  assert.equal(dfu.connected, false);
  await dfu.disconnect();
  const retryTransport = new Bootloader();
  const retry = new f.api.QuanshengFactoryDFU(retryTransport);
  await retry.openFactory("UV-K5-V3");
  const result = await retry.flashFactory(stage, "DFU UV-K5-V3");
  assert.equal(result.pages, 281, "same uncompleted capability allows recovery on a fresh connection");
  await retry.disconnect();
});
test("DFU requires consistent device identity during the complete handshake", async () => {
  const f = fixture();
  const stage = await f.connector.prepareFactoryRestore(f.flash, f.firmware, f.permit, "FABRICA UV-K5-V3");
  const transport = new Bootloader();
  transport.inconsistent = true;
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  await assert.rejects(dfu.flashFactory(stage, "DFU UV-K5-V3"), /inconsistente/);
  assert.equal(transport.pages.length, 0);
  await dfu.disconnect();
});
test("main firmware DFU requires full backup, strict v6 PY32 vectors and separate explicit confirmation", async () => {
  const f = fixture();
  const bytes = new Uint8Array(71712);
  le(bytes).setUint32(0, 0x20003000, true);
  le(bytes).setUint32(4, 0x08002841, true);
  bytes.set(new TextEncoder().encode("F4HWN v6.1.0\0"), 64);
  await assert.rejects(f.connector.prepareMainFirmwareDFU(bytes, {}, "FIRMWARE PRINCIPAL UV-K5-V3"), /full backup/);
  await assert.rejects(f.connector.prepareMainFirmwareDFU(bytes, f.permit, ""), /Confirma/);
  const invalid = bytes.slice(); invalid[0] = 1;
  await assert.rejects(f.connector.prepareMainFirmwareDFU(invalid, f.permit, "FIRMWARE PRINCIPAL UV-K5-V3"), /Vectores/);
  const v7 = bytes.slice(); v7[71] = 55;
  await assert.rejects(f.connector.prepareMainFirmwareDFU(v7, f.permit, "FIRMWARE PRINCIPAL UV-K5-V3"), /v6/);
  assert.equal(f.state.erased, 0);
  const result = await f.connector.prepareMainFirmwareDFU(bytes, f.permit, "FIRMWARE PRINCIPAL UV-K5-V3");
  assert.equal(result.size, 71712);
  assert.equal(f.state.erased, 0, "preparing DFU must not touch external Flash");
  bytes.fill(0);
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  await assert.rejects(dfu.flashFactory(result.stage, "DFU UV-K5-V3"), /Confirma/);
  const report = await dfu.flashFactory(result.stage, "DFU PRINCIPAL UV-K5-V3");
  assert.equal(report.pages, 281);
  assert.equal(report.manualBootPending, true);
  assert.equal(report.readBackAvailable, false);
  const first = transport.commands.find(command => command.type === 0x0519);
  assert.equal(le(first.data.subarray(12)).getUint32(0, true), 0x20003000, "immutable prepared firmware snapshot");
  await dfu.disconnect();
});
test("v7 DFU stages only the internal image and retains asset identity for the separate installation", async () => {
  const f = fixture();
  const image = new Uint8Array(71712);
  le(image).setUint32(0, 0x20003000, true);
  le(image).setUint32(4, 0x08002841, true);
  image.set(new TextEncoder().encode("F4HWN v7.0.0\0"), 64);
  const pack = new Uint8Array(160).fill(23);
  le(pack).setUint32(0, 0x31415746, true);
  le(pack).setUint16(4, 1, true); le(pack).setUint16(6, 32, true);
  le(pack).setUint32(8, 128, true);
  le(pack).setUint32(12, R.crc32(pack.subarray(32)), true);
  const file = new Uint8Array(image.length + pack.length + 16);
  file.set(image); file.set(pack, image.length);
  const tail = file.length - 16;
  le(file).setUint32(tail, 0x54415746, true);
  le(file).setUint32(tail + 4, image.length, true);
  le(file).setUint32(tail + 8, pack.length, true);
  le(file).setUint32(tail + 12, R.crc32(file.subarray(0, tail)), true);
  const receipt = await f.connector.prepareMainFirmwareDFU(file, f.permit, "FIRMWARE PRINCIPAL UV-K5-V3");
  assert.equal(receipt.size, image.length);
  assert.equal(receipt.assets.buildId, "17".repeat(16));
  file.fill(0);
  const transport = new Bootloader();
  const dfu = new f.api.QuanshengFactoryDFU(transport);
  await dfu.openFactory("UV-K5-V3");
  const result = await dfu.flashFactory(receipt.stage, "DFU PRINCIPAL UV-K5-V3");
  assert.equal(result.pages, Math.ceil(image.length / 256));
  assert.equal(f.state.erased, 0);
  const written = transport.commands.filter(command => command.type === 0x0519);
  assert.deepEqual(written[0].data.subarray(12), image.subarray(0, 256));
  assert.equal(written.at(-1).data[44], 0, "no appended asset bytes after end of image");
  await dfu.disconnect();
});
