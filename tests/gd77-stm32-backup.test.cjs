const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../gd77-connector.js");
require("../firmware-core.js");

const le = data => new DataView(data.buffer, data.byteOffset, data.byteLength);
const SPI_SIZE = 0x1000000;
const ROM_BASE = 0x08000000;

// OpenGD77 usb_com.c mock: area 1 SPI flash, 2 EEPROM, 5 MCU ROM, 10 security registers (distinct byte patterns).
class Stm32Device extends R.BufferedTransport {
  constructor(family = "STM32") {
    super();
    this.family = family;
    this.requests = [];
    this.area10Reads = 0;
  }
  async open() { this.opened = true; }
  async close() { this.opened = false; }
  async write(data) {
    this.requests.push(data.slice());
    if (data[0] === 0x43) { this.push(Uint8Array.of(0x2d)); return; }
    assert.equal(data[0], 0x52);
    const mode = data[1];
    const address = le(data).getUint32(2, false);
    const length = le(data).getUint16(6, false);
    const answer = new Uint8Array(length + 3);
    answer[0] = mode === 10 && this.failArea10 ? 0 : 0x52;
    le(answer).setUint16(1, length, false);
    if (mode === 9) {
      const info = new Uint8Array(46);
      le(info).setUint32(0, 3, true);
      le(info).setUint32(4, this.family === "MK22" ? 0 : 6, true);
      info.set(new TextEncoder().encode("OpenGD77"), 8);
      info.set(new TextEncoder().encode("mock-build"), 24);
      answer.set(info.subarray(address, address + length), 3);
    } else {
      if (mode === 10) this.area10Reads++;
      for (let i = 0; i < length; i++) {
        let value = (address + i + mode) & 255;
        if (mode === 10 && this.area10Reads > 1 && this.driftArea10) value ^= 0x5a;
        answer[3 + i] = value;
      }
    }
    this.push(answer.subarray(0, 2));
    this.push(answer.subarray(2));
  }
}
class MemoryStore {
  constructor() { this.records = new Map(); }
  async put(record) { this.records.set(record.id, structuredClone(record)); }
  async get(id) { return structuredClone(this.records.get(id)); }
}
async function backup(device, family = "STM32") {
  const connector = new R.GD77Connector(family, device);
  await connector.connect();
  return { connector, ...await new R.BackupManager(new MemoryStore()).create(connector) };
}
const part = (record, name) => record.files.find(file => file.name === name);
function unzip(zip) {
  const view = le(zip);
  const count = view.getUint16(zip.length - 22 + 10, true);
  let offset = view.getUint32(zip.length - 22 + 16, true);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(offset, true), 0x02014b50);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(zip.subarray(offset + 46, offset + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true);
    assert.equal(R.crc32(zip.subarray(start, start + size)), view.getUint32(offset + 16, true), name);
    files[name] = zip.slice(start, start + size);
    offset += 46 + nameLength;
  }
  return files;
}

test("STM32: copia completa lee areas 10, 0x10000, 1 y 5 y verifica con segunda lectura", async () => {
  const device = new Stm32Device();
  const { record, permit } = await backup(device);
  assert.equal(record.status, "complete");
  assert.equal(permit, null, "la copia de solo lectura no concede permiso de escritura");
  assert.match(record.scope, /RESPALDO COMPLETO STM32/);
  const factory = part(record, "calibration-factory").bytes;
  assert.equal(factory.length, 512);
  assert.equal(factory[0], 10);
  assert.equal(part(record, "calibration").bytes.length, 512);
  assert.equal(part(record, "spi-flash").bytes.length, SPI_SIZE);
  assert.equal(part(record, "mcu-rom").bytes.length, 0x100000);
  assert.equal(part(record, "mcu-rom").bytes[1], (ROM_BASE + 1 + 5) & 255);
  assert.equal(part(record, "codeplug").bytes.length, 131072);
  assert.equal(device.area10Reads, 2 * (512 / 32), "area 10 se lee dos veces");
  assert(device.requests.some(request => request[0] === 0x52 && request[1] === 5 && le(request).getUint32(2, false) === ROM_BASE));
  assert(device.requests.every(request => [0x43, 0x52].includes(request[0])), "solo lecturas y ordenes CPS");
  const manifest = JSON.parse(new TextDecoder().decode(part(record, "manifest").bytes));
  assert.equal(manifest.complete, true);
  assert.equal(manifest.verified, true);
  assert.equal(manifest.model, "MD-UV380");
  assert.deepEqual(manifest.aliases, ["MD-UV390 (GPS)"]);
  assert.equal(manifest.firmware, "OpenGD77");
  for (const entry of manifest.parts) assert.equal(entry.sha256, await R.sha256(part(record, entry.name).bytes), entry.name);
  assert.deepEqual(manifest.parts.map(entry => entry.name), ["calibration", "calibration-factory", "codeplug", "spi-flash", "mcu-rom"]);
});

test("STM32: el ZIP contiene los cinco archivos y rechaza copias alteradas o incompletas", async () => {
  const { record } = await backup(new Stm32Device());
  const files = unzip(await R.gd77BackupZip(record.files));
  for (const name of ["calibration-factory.bin", "calibration-local.bin", "spi-flash.bin", "mcu-rom.bin", "manifest.json"]) assert(files[name], name);
  assert.deepEqual(files["calibration-factory.bin"], part(record, "calibration-factory").bytes);
  const tampered = record.files.map(file => ({ ...file, bytes: file.bytes.slice() }));
  tampered.find(file => file.name === "mcu-rom").bytes[0] ^= 1;
  await assert.rejects(R.gd77BackupZip(tampered), /SHA-256/);
  await assert.rejects(R.gd77BackupZip(record.files.filter(file => file.name !== "spi-flash")), /no esta completa/);
});

test("STM32: si falla el area 10 la copia es parcial y no lee Flash SPI ni ROM", async () => {
  const device = new Stm32Device();
  device.failArea10 = true;
  const { record, permit, connector } = await backup(device);
  assert.equal(record.status, "partial");
  assert.equal(permit, null);
  assert.match(record.scope, /area 10/);
  assert(!part(record, "calibration-factory") && !part(record, "spi-flash") && !part(record, "mcu-rom"));
  assert(part(record, "calibration") && part(record, "codeplug"));
  assert.equal(JSON.parse(new TextDecoder().decode(part(record, "manifest").bytes)).complete, false);
  assert(!device.requests.some(request => request[0] === 0x52 && [1, 5].includes(request[1]) && le(request).getUint32(2, false) >= 0x100000));
  assert.equal(connector.connected, true, "el fallo se contiene y la sesion sigue usable");
  await assert.rejects(R.gd77BackupZip(record.files), /no esta completa/);
});

test("STM32: una segunda lectura de calibracion distinta deja la copia en parcial", async () => {
  const device = new Stm32Device();
  device.driftArea10 = true;
  const { record } = await backup(device);
  assert.equal(record.status, "partial");
  const manifest = JSON.parse(new TextDecoder().decode(part(record, "manifest").bytes));
  assert.equal(manifest.verified, false);
  assert(manifest.failures.some(text => /segunda lectura/.test(text)));
});

test("MK22 mantiene la copia parcial anterior sin leer areas STM32", async () => {
  const device = new Stm32Device("MK22");
  const { record, permit } = await backup(device, "MK22");
  assert.equal(record.status, "partial");
  assert.equal(permit, null);
  assert.match(record.scope, /firmware MCU original NO respaldado/);
  assert.deepEqual(record.files.map(file => file.name), ["calibration", "codeplug"]);
  assert.equal(record.files[0].bytes.length, 4096);
  assert(!device.requests.some(request => request[0] === 0x52 && [1, 5, 10].includes(request[1]) && le(request).getUint32(2, false) >= 0x100000));
});

test("MD-UV390 (GPS) es alias de MD-UV380 y su imagen es OpenMDUV380.zip, nunca 10W PLUS", () => {
  assert.equal(R.gd77Aliases["MD-UV390 (GPS)"], "MD-UV380");
  assert(!R.gd77Models.includes("MD-UV390 (GPS)"), "MODELS sigue alineado con el tipo que informa la radio");
  assert.deepEqual(R.gd77Capabilities("MD-UV390 (GPS)"), R.gd77Capabilities("MD-UV380"));
  const target = R.firmwareCore.TARGETS["MD-UV390"];
  assert.equal(target.family, "STM32");
  assert.equal(target.alias, "MD-UV380");
  assert.match("OpenMDUV380.zip", target.pattern);
  assert.doesNotMatch("OpenMDUV380_10W_PLUS.zip", target.pattern);
  assert.match(target.label, /10W\/PLUS/);
});
