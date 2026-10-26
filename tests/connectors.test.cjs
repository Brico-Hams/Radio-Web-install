const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");
require("../quansheng-tools.js");
require("../quansheng-channels.js");
require("../planning-core.js");
require("../gd77-connector.js");
require("../codeplug-editor.js");

const le = data => new DataView(data.buffer, data.byteOffset, data.byteLength);
const key = [0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80];
function response(type, data, badCRC = false) {
  const body = new Uint8Array(4 + data.length + 2);
  le(body).setUint16(0, type, true);
  le(body).setUint16(2, data.length, true);
  body.set(data, 4);
  le(body).setUint16(body.length - 2, badCRC ? 0x1234 : 0xffff, true);
  const packet = new Uint8Array(body.length + 6);
  packet.set([0xab, 0xcd, (body.length - 2) & 255, (body.length - 2) >> 8]);
  packet.set(body.map((byte, i) => byte ^ key[i % 16]), 4);
  packet.set([0xdc, 0xba], packet.length - 2);
  return packet;
}
function baseFlash() {
  const flash = new Uint8Array(0x200000).fill(255);
  const image = new Uint8Array(1024).fill(0);
  le(image).setUint32(0, 0x20003000, true);
  le(image).setUint32(4, 0x08002841, true);
  image.set(new TextEncoder().encode("F4HWN v6.2.0\0"), 64);
  const header = flash.subarray(0x20000, 0x20040);
  header.fill(0);
  le(header).setUint32(0, 0x31424d46, true);
  le(header).setUint16(4, 1, true);
  le(header).setUint16(6, 1, true);
  le(header).setUint32(8, image.length, true);
  le(header).setUint32(12, R.crc32(image), true);
  header.set(new TextEncoder().encode("Main"), 16);
  header.set(new TextEncoder().encode("v6.2.0"), 32);
  flash.set(image, 0x21000);
  for (let i = 0; i < 512; i++) flash[0x10000 + i] = i & 255;
  return flash;
}
function spectrumBlob() {
  const bytes = new Uint8Array(208);
  bytes.set(new TextEncoder().encode("BHSP"));
  bytes[4] = 1; bytes[5] = 1;
  bytes.set(new TextEncoder().encode("RAM1"), 12);
  le(bytes).setUint32(20, 14500000, true);
  le(bytes).setUint32(24, 125, true);
  le(bytes).setUint16(28, 128, true);
  le(bytes).setUint16(30, 20, true);
  bytes[32] = 1;
  le(bytes).setUint32(204, R.crc32(bytes.subarray(0, 204)), true);
  return bytes;
}
class QuanshengDevice extends R.BufferedTransport {
  constructor() { super(); this.flash = baseFlash(); this.commands = []; this.configuration = new Uint8Array(0xa180).fill(255); }
  async open(baud) { assert.equal(baud, 38400); this.opened = true; }
  async close() { this.opened = false; }
  async write(frame) {
    const { type, data } = R.decodeQuanshengPacket(frame);
    this.commands.push({ type, data: data.slice() });
    let result;
    if (type === 0x0514) {
      result = new Uint8Array(36);
      result.set(new TextEncoder().encode(this.version || "F4HWN v6.2.0"));
    } else if (type === 0x7b20) {
      assert.equal(data.length, 4);
      assert.equal(data[0], 1);
      assert.equal(data[1], 0);
      result = new Uint8Array(140);
      result[0] = 1; result[2] = 3; result[3] = 5;
      result.set(data.subarray(2), 4);
      le(result).setUint32(8, 7, true);
      le(result).setUint32(12, 60000, true);
      le(result).setUint32(16, 15000, true);
      le(result).setUint16(32, 2, true);
      result[34] = 3; result[35] = 1;
      le(result).setUint32(36, 1000, true);
      le(result).setUint32(40, 12000, true);
      if (this.statsWrongSequence) result[4] ^= 1;
      if (this.statsNoSession) result[1] = 3;
      if (this.statsBadFlags) result[2] = 16;
      if (this.statsBadGain) result[34] = 6;
      if (this.statsBadTime) le(result).setUint32(40, 16000, true);
      if (this.statsBadFox) result[3] = 1;
      if (this.statsBadEmpty) result[20] = 1;
      if (this.statsBadReserved) result[6] = 1;
      if (this.statsError) result[2] = 15;
    } else if (type === 0x7b10) {
      const operation = data[1];
      assert.equal(data.length, operation === 2 || operation === 3 ? 110 : 6);
      result = new Uint8Array(operation < 2 ? 110 : 6);
      result[0] = 1;
      result.set(data.subarray(2, 6), 2);
      const token = le(data).getUint32(2, true);
      assert.notEqual(token, 0);
      this.presets ||= spectrumBlob();
      if (operation === 0) {
        this.presetToken = token;
        this.presetSnapshot = this.presets.slice();
        result.set(this.presetSnapshot.subarray(0, 104), 6);
      } else if (operation === 1) {
        assert.equal(token, this.presetToken);
        result.set(this.presetSnapshot.subarray(104), 6);
      } else if (operation === 2) {
        this.presetToken = token;
        this.presetUpload = new Uint8Array(208);
        this.presetUpload.set(data.subarray(6));
      } else if (operation === 3) {
        assert.equal(token, this.presetToken);
        this.presetUpload.set(data.subarray(6), 104);
      } else if (operation === 4) {
        assert.equal(token, this.presetToken);
        if (!this.ignorePresetCommit) this.presets = this.presetUpload.slice();
      }
      if (this.presetWrongToken) result[2] ^= 1;
      if (this.presetRejected) result[1] = 3;
      if (this.presetCorruptRead && operation === 1) result[10] ^= 1;
    } else if (type === 0x7b00) {
      assert.equal(data.length, 8);
      assert.equal(data[0], 1);
      const operation = data[1];
      result = new Uint8Array(16);
      result[0] = 1;
      result.set(data.subarray(2, 4), 2);
      le(result).setUint32(4, 7, true);
      if (this.catPending && operation === 0 && !this.catStuck) {
        this.catApplied = this.catTarget;
        this.catPending = false;
      }
      if (operation !== 0) {
        result[1] = this.catActive ? 1 : 5;
        if (this.catActive) {
          this.catTarget = operation === 1 ? le(data).getUint32(4, true) : 43500000;
          this.catRemote = operation === 1;
          this.catPending = true;
        }
      }
      le(result).setUint32(8, this.catActive ? this.catApplied || 43500000 : 0, true);
      le(result).setUint32(12, (this.catActive ? 1 : 0) | (this.catRemote ? 2 : 0) | (this.catPending ? 4 : 0), true);
      if (this.catWrongSequence) result[2] ^= 1;
      if (this.catBadVersion) result[0] = 2;
      if (this.catBadFlags) le(result).setUint32(12, 8, true);
      if (this.catBadFrequency) le(result).setUint32(8, 1, true);
      if (this.catBadCapabilities) le(result).setUint32(4, 15, true);
      if (this.catRejected) result[1] = 6;
    } else if (type === 0x051b) {
      const offset = le(data).getUint16(0, true);
      const length = data[2];
      result = new Uint8Array(length + 4);
      le(result).setUint16(0, offset, true);
      result[2] = this.badConfiguration && offset < 0xb000 ? length - 1 : length;
      const physical = offset >= 0xc000 ? 0x11000 + offset - 0xc000 : 0x10000 + offset - 0xb000;
      result.set(offset < 0xb000 ? this.configuration.subarray(offset, offset + length) :
        this.flash.subarray(physical, physical + length), 4);
    } else if (type === 0x051d) {
      const offset = le(data).getUint16(0, true);
      assert.equal(data[2], 8);
      assert.equal(data.length, 16);
      if (offset < 0xb000) {
        assert.equal(data[3], 0);
        assert.ok(offset + 8 <= 0x8800);
        if (!this.ignoreConfigurationWrites) this.configuration.set(data.subarray(8), offset);
      } else {
        assert.equal(data[3], 1);
        assert.ok(offset >= 0xb000 && offset + 8 <= 0xb200 || offset >= 0xc000 && offset + 8 <= 0xc408);
        const physical = offset >= 0xc000 ? 0x11000 + offset - 0xc000 : 0x10000 + offset - 0xb000;
        if (!this.ignoreProtectedWrites) this.flash.set(data.subarray(8), physical);
      }
      result = data.slice(0, 2);
    } else if (type === 0x0738) {
      const address = le(data).getUint32(0, true);
      const length = le(data).getUint16(4, true);
      result = new Uint8Array(length + 7);
      le(result).setUint32(0, address, true);
      le(result).setUint16(4, length, true);
      result[6] = this.rejectFlash ? 8 : 0;
      result.set(this.flash.subarray(address, address + length), 7);
    } else if (type === 0x0720) {
      result = new Uint8Array(66);
      result[0] = data[0];
      const address = 0x20000 + data[0] * 0x20000;
      result.set(this.flash.subarray(address, address + 64), 2);
      result[1] = le(result).getUint32(2, true) === 0x31424d46 ? 0 : 1;
    } else if (type === 0x073e) {
      result = new Uint8Array(13);
      const address = le(data).getUint32(0, true);
      const length = le(data).getUint32(4, true);
      assert.ok(length > 0 && length <= 4096, "Firmware CRC command accepts at most one 4 KiB sector");
      le(result).setUint32(0, address, true);
      le(result).setUint32(4, length, true);
      le(result).setUint32(8, R.crc32(this.flash.subarray(address, address + length)) ^
        (this.badFlashCRC || this.badFlashCRCAddress === address ? 1 : 0), true);
    } else if (type === 0x073a) {
      const address = le(data).getUint32(0, true);
      assert.notEqual(address, 0x10000);
      assert.equal(address % 4096, 0);
      assert.equal(le(data).getUint32(4, true), this.timestamp);
      this.flash.fill(255, address, address + 4096);
      result = new Uint8Array(5);
      le(result).setUint32(0, address, true);
    } else if (type === 0x073c) {
      const address = le(data).getUint32(0, true);
      const size = le(data).getUint16(4, true);
      assert.ok(address >= 0x11000 || address + size <= 0x10000);
      assert.equal(le(data).getUint32(6, true), this.timestamp);
      if (!this.ignoreFlashWrite) this.flash.set(data.subarray(10), address);
      result = new Uint8Array(7);
      le(result).setUint32(0, address, true);
      le(result).setUint16(4, size, true);
    } else if (type === 0x0722) {
      this.flash.fill(255, 0x20000 + data[0] * 0x20000, 0x40000 + data[0] * 0x20000);
      result = Uint8Array.of(data[0], 0);
    } else if (type === 0x0724) {
      const address = 0x20000 + data[0] * 0x20000 + le(data).getUint32(2, true);
      assert.equal(data.length, 12 + le(data).getUint16(6, true));
      this.flash.set(data.subarray(12), address);
      result = Uint8Array.of(data[0], 0);
    } else if (type === 0x0726) {
      const address = 0x20000 + data[0] * 0x20000;
      const header = this.flash.subarray(address, address + 64);
      const size = le(header).getUint32(8, true);
      const crc = R.crc32(this.flash.subarray(address + 0x1000, address + 0x1000 + size));
      result = new Uint8Array(6);
      le(result).setUint32(0, this.badValidation ? crc ^ 1 : crc, true);
      result[4] = data[0];
      result[5] = crc === le(header).getUint32(12, true) ? 0 : 5;
    } else if (type === 0x0728) {
      this.flash.fill(255, 0xb0000 + data[0] * 0x10000, 0xc0000 + data[0] * 0x10000);
      result = Uint8Array.of(data[0], 0);
    } else if (type === 0x0730 || type === 0x0736) {
      if (this.noApps) return;
      const slot = data[0], base = 0x102000 + slot * 0x2000, header = this.flash.subarray(base, base + 64);
      let status = slot >= (this.appSlots || 16) ? 1 : le(header).getUint32(0, true) !== 0x31504146 ? 2 : 0;
      result = type === 0x0730 ? new Uint8Array(66) : new Uint8Array(2);
      result[0] = slot; result[1] = status;
      if (type === 0x0730) result.set(header, 2);
    } else if (type === 0x0732) {
      const authorized = le(data).getUint32(2, true) === this.timestamp;
      if (authorized) this.flash.fill(255, 0x102000 + data[0] * 0x2000, 0x104000 + data[0] * 0x2000);
      result = Uint8Array.of(data[0], authorized ? 0 : 8);
    } else if (type === 0x0734) {
      assert.equal(le(data).getUint32(8, true), this.timestamp);
      this.flash.set(data.subarray(12), 0x102000 + data[0] * 0x2000 + le(data).getUint32(2, true));
      if (this.corruptAppWrite) this.flash[0x102000 + data[0] * 0x2000 + le(data).getUint32(2, true)] ^= 1;
      result = Uint8Array.of(data[0], 0);
    } else throw new Error(`Unexpected command ${type.toString(16)}`);
    if (type === 0x0514) this.timestamp = le(data).getUint32(0, true);
    const answer = response(type + 1, result);
    this.push(answer.subarray(0, 5));
    this.push(answer.subarray(5));
  }
}
test("CAT RX Bricohams consulta capacidades, confirma aplicacion y restaura sin escribir memoria", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  assert.equal((await connector.getCatStatus()).active, false);
  device.catActive = true;
  connector.catSequence = 0xffff;
  const state = await connector.setCatReceive(14580000);
  assert.equal(state.appliedFrequency10Hz, 14580000);
  assert.equal(state.remote, true);
  assert.equal(state.pending, false);
  assert.equal(state.leaseMilliseconds, 3000);
  const stopped = await connector.stopCatReceive();
  assert.equal(stopped.appliedFrequency10Hz, 43500000);
  assert.equal(stopped.remote, false);
  assert(device.commands.every(command => [0x0514, 0x7b00].includes(command.type)));
  assert(device.commands.some(command => command.type === 0x7b00 && le(command.data).getUint16(2, true) === 0));
  await connector.disconnect();
});
test("CAT RX rechaza frecuencias invalidas antes de enviar y no acepta estado pendiente como exito", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const count = device.commands.length;
  for (const value of [0, 13599999, 17400001, 39999999, 47000001, 14580000.1, NaN, "14580000"]) {
    assert.throws(() => connector.setCatReceive(value), /fuera de banda/);
  }
  assert.equal(device.commands.length, count);
  await assert.rejects(connector.setCatReceive(14580000), /Entra primero/);
  assert(!device.commands.some(command => command.type === 0x7b00 && command.data[1] !== 0));
  await connector.disconnect();
  await connector.connect("UV-K5-V3");
  device.catActive = true;
  device.catStuck = true;
  await assert.rejects(connector.setCatReceive(14580000), /sigue pendiente/);
  assert.equal(connector.connected, false);
  await connector.disconnect();
});
test("CAT STOP es idempotente si el operador ya salio de SAT RX", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const state = await connector.stopCatReceive();
  assert.equal(state.active, false);
  assert.equal(state.remote, false);
  assert.equal(connector.connected, true);
  assert.ok(device.commands.filter(command => command.type === 0x7b00).every(command => command.data[1] === 0));
  await connector.disconnect();
});
test("CAT RX rechaza respuestas corruptas, capacidades desconocidas y errores del firmware", async () => {
  for (const property of ["catWrongSequence", "catBadVersion", "catBadFlags", "catBadFrequency", "catBadCapabilities", "catRejected"]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    device.catActive = true;
    device[property] = true;
    await assert.rejects(connector.getCatStatus(), /CAT/);
    assert.equal(connector.connected, false);
    await connector.disconnect();
  }
});
test("presets BHSP exportan snapshot y se importan con relectura sin escribir memoria persistente", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const blob = await connector.readSpectrumPresets();
  assert.deepEqual(blob, spectrumBlob());
  assert.equal(R.inspectSpectrumPresets(blob).entries[0].name, "RAM1");
  blob[12] = 70;
  le(blob).setUint32(204, R.crc32(blob.subarray(0, 204)), true);
  const result = await connector.writeSpectrumPresets(blob);
  assert.equal(result.entries[0].name, "FAM1");
  assert.deepEqual(device.presets, blob);
  assert(device.commands.every(command => [0x0514, 0x7b10].includes(command.type)));
  assert.deepEqual(device.commands.filter(command => command.type === 0x7b10).map(command => command.data[1]), [0, 1, 2, 3, 4, 0, 1]);
  await connector.disconnect();
});
test("presets BHSP rechazan CRC, nombres, reservas y configuraciones fuera del adaptador antes de enviar", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const count = device.commands.length;
  const mutations = [
    bytes => { bytes[4] = 2; }, bytes => { bytes[5] = 0; }, bytes => { bytes[6] = 1; },
    bytes => { bytes[7] = 1; }, bytes => { bytes[12] = 0; },
    bytes => { bytes[14] = 0; bytes[15] = 70; }, bytes => { bytes[33] = 1; },
    bytes => { bytes[36] = 1; }, bytes => { le(bytes).setUint32(20, 11800000, true); },
    bytes => { le(bytes).setUint32(20, 17399999, true); },
    bytes => { le(bytes).setUint32(24, 126, true); }, bytes => { bytes[28] = 127; },
    bytes => { bytes[30] = 21; }, bytes => { bytes[32] = 3; }
  ];
  for (const mutate of mutations) {
    const bytes = spectrumBlob();
    mutate(bytes);
    le(bytes).setUint32(204, R.crc32(bytes.subarray(0, 204)), true);
    assert.throws(() => connector.writeSpectrumPresets(bytes), /BHSP|Preset/);
  }
  const corrupt = spectrumBlob(); corrupt[50] ^= 1;
  assert.throws(() => connector.writeSpectrumPresets(corrupt), /CRC/);
  assert.throws(() => connector.writeSpectrumPresets(new Uint8Array(209)));
  assert.equal(device.commands.length, count);
  await connector.disconnect();
});
test("presets BHSP no presentan rechazos, otra transferencia o relectura diferente como exito", async () => {
  for (const property of ["presetWrongToken", "presetRejected", "presetCorruptRead", "ignorePresetCommit"]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    device[property] = true;
    const blob = spectrumBlob(); blob[12] = 70;
    le(blob).setUint32(204, R.crc32(blob.subarray(0, 204)), true);
    if (property === "ignorePresetCommit") await assert.rejects(connector.writeSpectrumPresets(blob), /no coinciden/);
    else await assert.rejects(connector.readSpectrumPresets(), /presets|Presets|BHSP/);
    assert.equal(connector.connected, false);
    await connector.disconnect();
  }
});
test("estadisticas ARDF exportan observaciones relativas, no detecciones ni ubicacion", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const result = await connector.readArdfStatistics();
  assert.equal(result.format, "bricohams-ardf-statistics");
  assert.equal(result.connectionSession, connector.session);
  assert.equal(result.session, 7);
  assert.equal(result.active, true);
  assert.equal(result.synchronized, true);
  assert.equal(result.elapsedMilliseconds, 15000);
  assert.deepEqual(result.observations, [{ fox: 2, count: 2, gainIndex: 3, firstMilliseconds: 1000, lastMilliseconds: 12000 }]);
  assert(Number.isFinite(Date.parse(result.receivedAt)));
  assert.match(result.warning, /not beacon detections or locations/);
  assert(device.commands.every(command => [0x0514, 0x7b20].includes(command.type)));
  device.statsError = true;
  const errorState = await connector.readArdfStatistics();
  assert.equal(errorState.firmwareError, true);
  assert.equal(errorState.countsSaturated, true);
  await connector.disconnect();
});
test("estadisticas ARDF rechazan ausencia de sesion y registros incoherentes", async () => {
  for (const property of ["statsWrongSequence", "statsNoSession", "statsBadFlags", "statsBadGain",
    "statsBadTime", "statsBadFox", "statsBadEmpty", "statsBadReserved"]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    device[property] = true;
    await assert.rejects(connector.readArdfStatistics(), /ARDF/);
    assert.equal(connector.connected, false);
    await connector.disconnect();
  }
});
class MemoryStore {
  constructor() { this.records = new Map(); this.puts = 0; }
  async put(record) {
    this.puts++;
    if (this.failAt === this.puts) throw new Error("Quota exceeded");
    this.records.set(record.id, structuredClone(record));
  }
  async get(id) {
    const record = structuredClone(this.records.get(id));
    if (this.corrupt && record?.files[0]) record.files[0].bytes[0] ^= 1;
    return record;
  }
}
test("logo nativo convierte exactamente ST7565 sin invertir filas, columnas ni transparencia", () => {
  const pixels = new Uint8Array(128 * 64 * 4).fill(255);
  pixels.set([0, 0, 0, 255], 0);
  pixels.set([0, 0, 0, 255], (8 * 128 + 127) * 4);
  pixels.set([0, 0, 0, 0], (63 * 128 + 127) * 4);
  const logo = R.packQuanshengLogo(pixels);
  assert.equal(logo.length, 1032);
  assert.equal(new TextDecoder().decode(logo.subarray(0, 8)), "F4HWNLGO");
  assert.equal(logo[8], 1);
  assert.equal(logo[8 + 128 + 127], 1);
  assert.equal(logo[1031], 0, "transparent pixels are white");
  const result = R.unpackQuanshengLogo(logo);
  assert.deepEqual([...result.slice(0, 4)], [0, 0, 0, 255]);
  assert.deepEqual([...result.slice(4, 8)], [255, 255, 255, 255]);
  assert.throws(() => R.unpackQuanshengLogo(new Uint8Array(1032)), /logo/);
  assert.throws(() => R.packQuanshengLogo(new Uint8Array(3)), /Tamano/);
});
test("reinicio nativo exige respaldo/confirmacion, no reintenta y no afirma arranque", async () => {
  for (const failure of [false, true]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    await assert.rejects(connector.requestReboot({}, "REINICIAR RADIO"), /respaldo/);
    const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
    let requests = 0;
    const original = device.write.bind(device);
    device.write = async frame => {
      const command = R.decodeQuanshengPacket(frame);
      if (command.type !== 0x05dd) return original(frame);
      requests++;
      assert.equal(command.data.length, 0);
      if (failure) throw new Error("USB disconnected during write");
    };
    await assert.rejects(connector.requestReboot(permit, ""), /Confirma/);
    assert.equal(requests, 0);
    if (failure) await assert.rejects(connector.requestReboot(permit, "REINICIAR RADIO"), /USB disconnected/);
    else assert.deepEqual(await connector.requestReboot(permit, "REINICIAR RADIO"),
      { requested: true, acknowledged: false, manualBootPending: true });
    assert.equal(requests, 1);
    assert.equal(connector.connected, false);
    assert.equal(R.hasBackup(connector, permit), false);
    await connector.disconnect();
  }
});
test("logo nativo escribe solo 1032 bytes con cabecera al final y verifica datos vecinos", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const original = device.flash.slice();
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const logo = R.packQuanshengLogo(new Uint8Array(128 * 64 * 4).fill(255));
  logo[20] = 85;
  await connector.writeBootLogo(logo, permit);
  assert.deepEqual(await connector.readBootLogo(), logo);
  const writes = device.commands.filter(item => item.type === 0x051d);
  assert.equal(writes.length, 129);
  assert.equal(le(writes.at(-1).data).getUint16(0, true), 0xc000);
  const expected = original.slice();
  expected.set(logo, 0x11000);
  assert.deepEqual(device.flash, expected);
  assert.ok(R.hasBackup(connector, permit));
  await connector.disconnect();
});
test("calibracion nativa exige confirmacion e invalida permiso despues de relectura", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const original = device.flash.slice();
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const calibration = original.slice(0x10000, 0x10200);
  calibration[200] ^= 1;
  await assert.rejects(connector.restoreCalibration(calibration, permit, ""), /Confirma/);
  assert.equal(device.commands.filter(item => item.type === 0x051d).length, 0);
  await connector.restoreCalibration(calibration, permit, "RESTAURAR CALIBRACION DE ESTA RADIO");
  assert.deepEqual(await connector.readCalibration(), calibration);
  const expected = original.slice();
  expected.set(calibration, 0x10000);
  assert.deepEqual(device.flash, expected);
  assert.equal(R.hasBackup(connector, permit), false);
  await connector.disconnect();
});
test("herramientas protegidas rechazan permisos falsos, archivos invalidos y copias corruptas antes de escribir", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const logo = R.packQuanshengLogo(new Uint8Array(128 * 64 * 4).fill(255));
  await assert.rejects(connector.writeBootLogo(logo, {}), /respaldo/);
  await assert.rejects(connector.restoreCalibration(new Uint8Array(512), {}, ""), /respaldo/);
  await assert.rejects(connector.restoreExternalFlash(device.flash, {}, ""), /respaldo/);
  const store = new MemoryStore();
  const { permit } = await new R.BackupManager(store).create(connector);
  await assert.rejects(connector.restoreCalibration(new Uint8Array(512), permit,
    "RESTAURAR CALIBRACION DE ESTA RADIO"), /Calibracion/);
  await assert.rejects(connector.writeBootLogo(new Uint8Array(1032), permit), /logo/);
  store.corrupt = true;
  await assert.rejects(connector.writeBootLogo(logo, permit), /corrupta/);
  assert.equal(device.commands.filter(item => [0x051d, 0x073a, 0x073c].includes(item.type)).length, 0);
  await connector.disconnect();
});
test("restore Flash nativo conserva sector completo de calibracion y escribe estados al final", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const before = device.flash.slice();
  const target = before.slice();
  target[0x5010] = 45;
  target.fill(19, 0x10000, 0x11000);
  target[0x100040] = 7;
  target[0x101040] = 9;
  await assert.rejects(connector.restoreExternalFlash(target, permit, ""), /Confirma/);
  assert.equal(device.commands.filter(item => item.type === 0x073a).length, 0);
  await connector.restoreExternalFlash(target, permit, "RESTAURAR FLASH DE ESTA RADIO");
  const expected = target.slice();
  expected.set(before.subarray(0x10000, 0x11000), 0x10000);
  assert.deepEqual(device.flash, expected);
  const erased = device.commands.filter(item => item.type === 0x073a).map(item => le(item.data).getUint32(0, true));
  assert.deepEqual(erased, [0x5000, 0x100000, 0x101000]);
  assert.equal(R.hasBackup(connector, permit), false);
  assert.equal(device.commands.some(item => item.type === 0x05dd), false);
  await connector.disconnect();
});
test("restore Flash detecta escritura perdida y no continua con sectores posteriores", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const target = device.flash.slice();
  target[0x5000] = 42;
  target[0x6000] = 43;
  device.ignoreFlashWrite = true;
  await assert.rejects(connector.restoreExternalFlash(target, permit, "RESTAURAR FLASH DE ESTA RADIO"), /sector.*distinta/);
  const erased = device.commands.filter(item => item.type === 0x073a).map(item => le(item.data).getUint32(0, true));
  assert.deepEqual(erased, [0x5000]);
  assert.equal(connector.connected, false);
  await connector.disconnect();
});
test("logo y calibracion detectan escritura ignorada, no devuelven exito", async () => {
  for (const type of ["logo", "calibration"]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
    device.ignoreProtectedWrites = true;
    if (type === "logo") {
      const logo = R.packQuanshengLogo(new Uint8Array(128 * 64 * 4).fill(255));
      await assert.rejects(connector.writeBootLogo(logo, permit), /relectura/);
    } else {
      const calibration = device.flash.slice(0x10000, 0x10200);
      calibration[0] ^= 1;
      await assert.rejects(connector.restoreCalibration(calibration, permit,
        "RESTAURAR CALIBRACION DE ESTA RADIO"), /relectura/);
    }
    assert.equal(connector.connected, false);
    await connector.disconnect();
  }
});
test("Flash fisica rechaza rangos protegidos, tramas entre paginas y legacy sin enviar comandos", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const count = device.commands.length;
  await assert.rejects(connector.eraseFlashSectorRaw(0x10000), /protegido/);
  await assert.rejects(connector.eraseFlashSectorRaw(1), /invalido/);
  await assert.rejects(connector.writeFlashChunkRaw(0xffc0, new Uint8Array(128)), /protegido/);
  await assert.rejects(connector.writeFlashChunkRaw(0x10000, new Uint8Array(128)), /protegido/);
  await assert.rejects(connector.writeFlashChunkRaw(0x11ff0, new Uint8Array(128)), /invalido/);
  connector.info.legacyReadOnly = true;
  assert.throws(() => connector.readExternalFlash(), /no disponible/);
  assert.equal(device.commands.length, count);
  await connector.disconnect();
});
class GD77Device extends R.BufferedTransport {
  constructor(family) {
    super();
    this.family = family;
    this.requests = [];
  }
  async open() { this.opened = true; }
  async close() { this.opened = false; }
  async write(data) {
    this.requests.push(data.slice());
    if (data[0] === 0x43) { this.push(Uint8Array.of(this.rejectCommand ? 0 : 0x2d)); return; }
    assert.equal(data[0], 0x52);
    const address = le(data).getUint32(2, false);
    const length = le(data).getUint16(6, false);
    const answer = new Uint8Array(length + 3);
    answer[0] = this.badHeader ? 0 : 0x52;
    le(answer).setUint16(1, length, false);
    if (data[1] === 9) {
      const info = new Uint8Array(46);
      le(info).setUint32(0, this.structVersion || 3, true);
      le(info).setUint32(4, this.type ?? (this.family === "MK22" ? 0 : this.family === "STM32" ? 6 : 11), true);
      info.set(new TextEncoder().encode("mock-build"), 8);
      answer.set(info.subarray(address, address + length), 3);
    } else {
      for (let i = 0; i < length; i++) answer[3 + i] = (address + i + data[1]) & 255;
    }
    this.push(answer.subarray(0, 2));
    this.push(answer.subarray(2));
  }
}

test("CRC16 y CRC32 usan vectores publicados independientes", () => {
  const data = new TextEncoder().encode("123456789");
  assert.equal(R.crc16(data), 0x31c3);
  assert.equal(R.crc32(data), 0xcbf43926);
});
test("SHA-256 vector conocido", async () => {
  assert.equal(await R.sha256(new TextEncoder().encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("Paquete UART coincide con captura calculada manualmente", () => {
  const packet = R.quanshengPacket(0x0514, Uint8Array.of(1, 2, 3, 4));
  assert.deepEqual(Array.from(packet.subarray(0, 12)), [0xab, 0xcd, 8, 0, 2, 0x69, 0x10, 0xe6, 0x2f, 0x93, 0x0e, 0x44]);
  assert.deepEqual(R.decodeQuanshengPacket(packet), { type: 0x0514, data: Uint8Array.of(1, 2, 3, 4) });
});
test("Decodificar respuesta UART impar y marcador CRC firmware", () => {
  assert.deepEqual(R.decodeQuanshengPacket(response(0x0739, Uint8Array.of(1, 2, 3))).data, Uint8Array.of(1, 2, 3));
});
test("Rechazar CRC UART corrupto, footer y longitud truncada", () => {
  assert.throws(() => R.decodeQuanshengPacket(response(1, Uint8Array.of(1), true)), /CRC/);
  const bad = response(1, Uint8Array.of(1)); bad[bad.length - 1] = 0;
  assert.throws(() => R.decodeQuanshengPacket(bad), /corrupta/);
  assert.throws(() => R.decodeQuanshengPacket(bad.subarray(0, 4)), /corta/);
});
test("Buffer conserva paquetes fragmentados y bytes sobrantes", async () => {
  const transport = new R.BufferedTransport(); transport.opened = true;
  const read = transport.readExact(3);
  transport.push(Uint8Array.of(1));
  transport.push(Uint8Array.of(2, 3, 4));
  assert.deepEqual(await read, Uint8Array.of(1, 2, 3));
  assert.deepEqual(await transport.readExact(1), Uint8Array.of(4));
});
test("Timeout invalida transporte; no hay lectura tardia reutilizable", async () => {
  const transport = new R.BufferedTransport(); transport.opened = true;
  await assert.rejects(transport.readExact(2, 5), /Tiempo agotado/);
  assert(transport.error);
  await assert.rejects(transport.readExact(1), /Tiempo agotado/);
});
test("Desconexion rechaza inmediatamente lectura pendiente", async () => {
  const transport = new R.BufferedTransport(); transport.opened = true;
  const pending = transport.readExact(1);
  transport.fail(new Error("Cable retirado"));
  await assert.rejects(pending, /Cable retirado/);
});
test("No se permiten dos lectores simultaneos", async () => {
  const transport = new R.BufferedTransport(); transport.opened = true;
  const pending = transport.readExact(1);
  await assert.rejects(transport.readExact(1), /simultaneas/);
  transport.push(Uint8Array.of(7)); await pending;
});
test("Identificacion Quansheng y calibracion exacta 512 bytes", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  const info = await connector.connect("UV-K1");
  assert.equal(info.firmware, "F4HWN v6.2.0");
  assert.equal(info.hardwareConfirmed, false);
  assert.deepEqual(await connector.readCalibration(), device.flash.slice(0x10000, 0x10200));
  assert.equal(device.commands.filter(item => item.type === 0x051b).length, 32);
});
test("Biblioteca local de slots valida bytes PY32 y rechaza firmware V1 y variantes no admitidas", () => {
  const image = baseFlash().slice(0x21000, 0x21400);
  assert.deepEqual(R.inspectQuanshengSlotImage(image, "f4hwn.fusion.v6.2.0.bin"), { version: "6.2.0", size: 1024 });
  for (const name of ["firmware.packed.bin", "firmware.sa818.bin", "firmware.beta.bin", "firmware.development.bin", "firmware.rolling.bin", "firmware.app"]) {
    assert.throws(() => R.inspectQuanshengSlotImage(image, name), /Variante/);
  }
  const v1 = image.slice();
  le(v1).setUint32(4, 0x0000010b, true);
  assert.throws(() => R.inspectQuanshengSlotImage(v1, "v1_210826_2.bin"), /V1 en V3/);
  const old = image.slice();
  old.fill(0, 64, 100);
  old.set(new TextEncoder().encode("F4HWN v5.2.0"), 64);
  assert.throws(() => R.inspectQuanshengSlotImage(old), /v6.x/);
  assert.throws(() => R.inspectQuanshengSlotImage(new Uint8Array(512)), /Vectores/);
  assert.throws(() => R.inspectQuanshengSlotImage(new Uint8Array(0x1d801)), /limite/);
});
test("CRC Flash remoto discrepante al final aborta respaldo sin habilitar escrituras", async () => {
  const device = new QuanshengDevice(); device.badFlashCRCAddress = 0x1ff000;
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const store = new MemoryStore();
  await assert.rejects(new R.BackupManager(store).create(connector), /CRC de la Flash/);
  assert.deepEqual([...store.records.values()][0].files.map(file => file.name), ["calibration"]);
  await assert.rejects(connector.eraseSlot(1, {}), /bloqueada/);
});
test("CRC Flash completo verifica exactamente 512 sectores de 4 KiB y no admite rangos mayores", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  assert.equal(await connector.verifyFlashRaw(device.flash), R.crc32(device.flash));
  const commands = device.commands.filter(command => command.type === 0x073e);
  assert.equal(commands.length, 512);
  for (const [index, command] of commands.entries()) {
    assert.equal(le(command.data).getUint32(0, true), index * 4096);
    assert.equal(le(command.data).getUint32(4, true), 4096);
    assert.equal(le(command.data).getUint32(8, true), connector.timestamp);
  }
  await assert.rejects(connector.flashRangeCRCRaw(0, 4097), /Rango CRC/);
  assert.equal(device.commands.filter(command => command.type === 0x073e).length, 512);
});
test("Rechazar Quansheng anterior a v6 sin modificar dispositivo", async () => {
  const device = new QuanshengDevice(); device.version = "F4HWN v5.0.0";
  const connector = new R.QuanshengConnector(device);
  await assert.rejects(connector.connect("UV-K1"), /no compatible/);
  assert.equal(connector.connected, false);
  assert.deepEqual(device.commands.map(item => item.type), [0x0514]);
});
test("Consulta de todos los slots incluye Main protegido", async () => {
  const connector = new R.QuanshengConnector(new QuanshengDevice());
  await connector.connect("UV-K5-V3");
  const slots = await connector.listSlots();
  assert.equal(slots.length, 5);
  assert.equal(slots[0].name, "Main");
  assert.equal(slots[1].status, 1);
});
test("Validacion CRC independiente del slot Main", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  assert.equal(await connector.validateSlot(0), le(device.flash).getUint32(0x2000c, true));
});
test("Extraer Main verifica magic, version, compromiso, limites y CRC", () => {
  const flash = baseFlash();
  assert.equal(R.quanshengBaseFromFlash(flash).image.length, 1024);
  for (const index of [0x20000, 0x20004, 0x20006, 0x21001]) {
    const bad = flash.slice(); bad[index] ^= 1;
    assert.throws(() => R.quanshengBaseFromFlash(bad));
  }
  const bad = flash.slice(); le(bad).setUint32(0x20008, 0x1d801, true);
  assert.throws(() => R.quanshengBaseFromFlash(bad), /Tamano/);
});
test("Backup completo Quansheng persiste antes de conceder permiso", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const store = new MemoryStore();
  const { record, permit } = await new R.BackupManager(store).create(connector);
  assert.equal(record.status, "complete");
  assert.deepEqual(record.files.map(file => file.name), ["calibration", "external-flash", "base-firmware"]);
  assert.equal(record.files[1].bytes.length, 0x200000);
  assert.equal(device.commands.filter(item => item.type === 0x0738).length, 16384);
  assert(store.puts >= 5);
  R.assertBackup(connector, permit);
  const json = JSON.parse(await R.exportBackup(await store.get(record.id)));
  assert.equal(Buffer.from(json.files[1].data, "base64").length, 0x200000);
  assert.match(json.scope, /Bootloader interno no accesible/);
});
test("No se emite permiso si Main esta corrupto; conserva calibracion y Flash", async () => {
  const device = new QuanshengDevice(); device.flash[0x21010] ^= 1;
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const store = new MemoryStore();
  await assert.rejects(new R.BackupManager(store).create(connector), /CRC/);
  const record = [...store.records.values()][0];
  assert.equal(record.status, "failed");
  assert.equal(record.files.length, 2);
  await assert.rejects(connector.eraseSlot(1, {}), /bloqueada/);
});
test("Acceso Flash no soportado conserva copia parcial y no autoriza escritura", async () => {
  const device = new QuanshengDevice(); device.rejectFlash = true;
  const connector = new R.QuanshengConnector(device); await connector.connect("UV-K1");
  const store = new MemoryStore();
  await assert.rejects(new R.BackupManager(store).create(connector), /Labs/);
  assert.equal([...store.records.values()][0].files[0].name, "calibration");
});
test("v6.0 guarda calibracion y configuracion, sigue conectado y no intenta Flash no soportada", async () => {
  const device = new QuanshengDevice(); device.version = "F4HWN v6.0.0";
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { record, permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  assert.equal(permit, null);
  assert.equal(record.status, "partial");
  assert.deepEqual(record.files.map(file => file.name), ["calibration", "configuration"]);
  assert.deepEqual(record.files[1].bytes, device.configuration);
  assert.equal(connector.connected, true);
  assert.match(record.scope, /Solo lectura.*v6.0/);
  assert.equal(device.commands.some(command => [0x051d, 0x0738].includes(command.type)), false);
  await assert.rejects(connector.writeConfiguration(device.configuration, device.configuration, permit), /bloqueada/);
  assert.equal((await connector.listSlots()).length, 5);
});
test("lectura configuracion valida offset, tamano y timestamp del protocolo", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  assert.deepEqual(await connector.readConfiguration(), device.configuration);
  const requests = device.commands.filter(command => command.type === 0x051b);
  assert.equal(requests.length, 323);
  assert.equal(le(requests[0].data).getUint32(4, true), connector.timestamp);
  assert.equal(le(requests.at(-1).data).getUint16(0, true), 0xa100);
  device.badConfiguration = true;
  await assert.rejects(connector.readConfiguration(), /Respuesta de configuracion incorrecta/);
});
test("escribir canales requiere respaldo completo, preserva VFO/calibracion y verifica relectura", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const original = await connector.readConfiguration();
  const edited = original.slice(); edited[0x4000] = 65; edited[0x8000] = 7;
  await assert.rejects(connector.writeConfiguration(edited, original, {}), /bloqueada/);
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const flashBefore = device.flash.slice();
  assert.equal(await connector.writeConfiguration(edited, original, permit), 2);
  assert.deepEqual(device.configuration, edited);
  assert.deepEqual(device.flash, flashBefore);
  assert.deepEqual(original, new Uint8Array(0xa180).fill(255));
});
test("escritura rechaza archivo desfasado o cambios de ajustes sin emitir 051d", async () => {
  for (const scenario of ["stale", "settings"]) {
    const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K1");
    const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
    const original = device.configuration.slice(); const edited = original.slice();
    if (scenario === "stale") device.configuration[0] = 1;
    else edited[0x9000] = 1;
    await assert.rejects(connector.writeConfiguration(edited, original, permit), /ha cambiado|ajustes estan protegidos/);
    assert.equal(device.commands.some(command => command.type === 0x051d), false);
  }
});
test("ACK sin persistencia de canales falla en relectura y revoca la sesion", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const original = device.configuration.slice(); const edited = original.slice(); edited[0x4000] = 65;
  device.ignoreConfigurationWrites = true;
  await assert.rejects(connector.writeConfiguration(edited, original, permit), /relectura Quansheng no coincide/);
  assert.equal(connector.connected, false);
  assert.equal(R.hasBackup(connector, permit), false);
});
test("memorias existentes se desactivan antes de editar y se reactivan al final", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  device.configuration[0x8000] = 2;
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const original = device.configuration.slice(); const edited = original.slice(); edited[0x4000] = 65;
  await connector.writeConfiguration(edited, original, permit);
  const writes = device.commands.filter(command => command.type === 0x051d);
  assert.deepEqual(writes.map(command => le(command.data).getUint16(0, true)), [0x8000, 0x4000, 0x8000]);
  assert.equal(writes[0].data[8] & 7, 7);
  assert.equal(writes.at(-1).data[8], 2);
  assert.deepEqual(device.configuration, edited);
});
test("el editor Beta no extrapola el mapa de canales a una version mayor", async () => {
  const device = new QuanshengDevice(); device.version = "F4HWN v7.0.0";
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  await assert.rejects(connector.readConfiguration(), /solo admite F4HWN v6/);
  assert.equal(device.commands.some(command => command.type === 0x051b), false);
});
test("Quota y corrupcion del almacenamiento bloquean permiso", async () => {
  for (const option of ["quota", "corrupt"]) {
    const connector = new R.QuanshengConnector(new QuanshengDevice());
    await connector.connect("UV-K1");
    const store = new MemoryStore();
    if (option === "quota") store.failAt = 2;
    else store.corrupt = true;
    await assert.rejects(new R.BackupManager(store).create(connector), /Quota|guardo/);
    await assert.rejects(connector.resetBank(1, {}), /bloqueada/);
  }
});
test("Escrituras bloqueadas sin respaldo, incluso desde API", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  for (const operation of [
    () => connector.eraseSlot(1), () => connector.resetBank(1),
    () => connector.writeSlot(1, new Uint8Array(1024), "X")
  ]) await assert.rejects(operation(), /bloqueada/);
  assert(device.commands.every(item => item.type === 0x0514));
});
test("Instalar slot escribe imagen antes de cabecera y verifica CRC", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const image = device.flash.slice(0x21000, 0x21400);
  device.commands = [];
  await connector.writeSlot(1, image, "Fusion", permit);
  assert.deepEqual(device.flash.slice(0x41000, 0x41400), image);
  const writes = device.commands.filter(item => item.type === 0x0724);
  assert.equal(le(writes[0].data).getUint32(2, true), 0x1000);
  assert.equal(le(writes.at(-1).data).getUint32(2, true), 0);
  assert.equal(device.commands.at(-1).type, 0x0726);
});
test("Main, imagenes invalidas, versiones v5 y nombres invalidos no se borran", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const image = device.flash.slice(0x21000, 0x21400);
  const bad = image.slice(); bad.fill(0, 64, 90);
  device.commands = [];
  await assert.rejects(connector.eraseSlot(0, permit), /Main/);
  await assert.rejects(connector.resetBank(5, permit), /Main/);
  await assert.rejects(connector.writeSlot(1, image, "<invalid name too long>", permit), /Nombre/);
  await assert.rejects(connector.writeSlot(1, bad, "Test", permit), /estables/);
  await assert.rejects(connector.writeSlot(1, new Uint8Array(256), "Test", permit), /Vectores/);
  assert.equal(device.commands.length, 0);
});
test("permiso legacy explicito solo instala las imagenes y slots autorizados una vez", async () => {
  const device = new QuanshengDevice(); device.version = "F4HWN v6.0.0";
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const store = new MemoryStore(), manager = new R.BackupManager(store);
  const image = device.flash.slice(0x21000, 0x21400);
  const selection = [{ slot: 2, image, name: "BH Labs" }];
  await assert.rejects(manager.authorizeSlotReplacement(connector, selection, ""), /aceptar expresamente/);
  await assert.rejects(manager.authorizeSlotReplacement(connector, [{ slot: 0, image, name: "Main" }],
    "REEMPLAZAR SLOTS SIN RESPALDO DE FIRMWARE"), /Main protegido/);
  const { record, permit } = await manager.authorizeSlotReplacement(connector, selection,
    "REEMPLAZAR SLOTS SIN RESPALDO DE FIRMWARE");
  assert.equal(record.status, "partial");
  assert.equal(R.hasBackup(connector, permit), false);
  await assert.rejects(connector.eraseSlot(2, permit), /bloqueada/);
  await assert.rejects(connector.resetBank(2, permit), /bloqueada/);
  await assert.rejects(connector.deleteApp(0, permit), /bloqueada/);
  await assert.rejects(connector.writeConfiguration(device.configuration, device.configuration, permit), /bloqueada/);
  await assert.rejects(connector.writeSlot(1, image, "BH Labs", permit), /autorizacion explicita/);
  const wrong = image.slice(); wrong[200] ^= 1;
  await assert.rejects(connector.writeSlot(2, wrong, "BH Labs", permit), /autorizacion explicita/);
  await assert.rejects(connector.writeSlot(2, image, "Other", permit), /autorizacion explicita/);
  assert.equal(device.commands.some(command => [0x0722, 0x0724].includes(command.type)), false);
  const before = device.flash.slice();
  await connector.writeSlot(2, image, "BH Labs", permit);
  assert.equal(await connector.validateSlot(2), R.crc32(image));
  assert.deepEqual(device.flash.slice(0, 0x60000), before.slice(0, 0x60000));
  assert.deepEqual(device.flash.slice(0x80000), before.slice(0x80000));
  await assert.rejects(connector.writeSlot(2, image, "BH Labs", permit), /autorizacion explicita/);
  await connector.disconnect();
  await assert.rejects(R.verifySlotReplacement(connector, permit, 2, image, "BH Labs"), /bloqueada/);
});
test("corrupcion de copia parcial revoca permiso limitado antes de borrar", async () => {
  const device = new QuanshengDevice(); device.version = "F4HWN v6.0.0";
  const connector = new R.QuanshengConnector(device); await connector.connect("UV-K5-V3");
  const store = new MemoryStore();
  const image = device.flash.slice(0x21000, 0x21400);
  const { permit } = await new R.BackupManager(store).authorizeSlotReplacement(connector,
    [{ slot: 1, image, name: "BH ARDF" }], "REEMPLAZAR SLOTS SIN RESPALDO DE FIRMWARE");
  store.corrupt = true;
  await assert.rejects(connector.writeSlot(1, image, "BH ARDF", permit), /corrupta/);
  assert.equal(device.commands.some(command => command.type === 0x0722), false);
  await assert.rejects(R.verifySlotReplacement(connector, permit, 1, image, "BH ARDF"), /bloqueada/);
  await connector.disconnect();
});
test("Borrado firmware y reset de banco son comandos diferentes y preservan Main/calibracion", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const before = device.flash.slice();
  await connector.eraseSlot(2, permit);
  await connector.resetBank(2, permit);
  assert.deepEqual(device.commands.slice(-2).map(item => item.type), [0x0722, 0x0728]);
  assert.deepEqual(device.flash.slice(0x20000, 0x40000), before.slice(0x20000, 0x40000));
  assert.deepEqual(device.flash.slice(0x10000, 0x11000), before.slice(0x10000, 0x11000));
});
test("simulacion multiboot completa: cuatro slots, CFG independientes, CRUD, listas y CAT sin hardware", async () => {
  const device = new QuanshengDevice();
  device.version = "F4HWN v6.1.0";
  const banks = [0, 1, 2, 3, 4].map(bank => {
    const address = bank === 0 ? 0 : 0xb0000 + bank * 0x10000;
    const image = device.flash.subarray(address, address + R.QUANSHENG_CONFIG_SIZE);
    image.fill(255);
    image.fill(0, 0, 16);
    le(image).setUint32(0, 14550000, true);
    image[12] = 0x1d;
    image[13] = 15;
    image.fill(0, 0x4000, 0x4010);
    image.set(new TextEncoder().encode(`CFG${bank}`), 0x4000);
    image[0x8000] = 2;
    image[0x8001] = 0;
    image.fill(0, 0xa160, 0xa170);
    image.set(new TextEncoder().encode("v6.1.0"), 0xa160);
    return image;
  });
  const protectedMain = device.flash.slice(0x20000, 0x40000);
  const protectedCalibration = device.flash.slice(0x10000, 0x10200);
  const mainBank = banks[0].slice();
  const editions = ["Labs", "ARDF", "Satellite", "Spectrum"];
  const completed = new Map();
  for (const [index, edition] of editions.entries()) {
    const slot = index + 1;
    // Manual boot/SetCfg is a fixture action, not an invented UART command.
    const bank = [0, 4, 2, 1, 3][slot];
    device.configuration = banks[bank];
    const otherBanks = banks.map(image => image.slice());
    const connector = new R.QuanshengConnector(device);
    try {
      await connector.connect("UV-K5-V3");
      const original = await connector.readConfiguration();
      await assert.rejects(connector.writeSlot(slot, protectedMain.slice(0x1000, 0x1400), edition, null), /bloqueada/);
      const store = new MemoryStore();
      const { record, permit } = await new R.BackupManager(store).create(connector);
      assert.equal(record.status, "complete");
      assert.deepEqual(record.files.find(file => file.name === "external-flash").bytes, device.flash);
      const firmware = protectedMain.slice(0x1000, 0x1400);
      firmware.set(new TextEncoder().encode(`Bricohams ${edition}`), 128);
      device.commands = [];
      await connector.writeSlot(slot, firmware, edition, permit);
      assert.equal(await connector.validateSlot(slot), R.crc32(firmware));
      assert.deepEqual(device.flash.slice(0x21000 + slot * 0x20000, 0x21400 + slot * 0x20000), firmware);
      const slotWrites = device.commands.filter(command => command.type === 0x0724);
      assert.equal(le(slotWrites.at(-1).data).getUint32(2, true), 0);
      for (const [previousSlot, previous] of completed) {
        assert.equal(await connector.validateSlot(previousSlot), previous.crc);
      }
      assert.deepEqual(await connector.readConfiguration(), original);
      const csv = R.parseChannelCSV("Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment\n0,SIM-RPT,145.600000,-,0.600000,,88.5,88.5,023,NN,FM,12.50,,Simulated repeater\n");
      assert.deepEqual(csv.rejected, []);
      const repeaters = csv.channels;
      const groups = R.groupQuanshengChannels(original, [
        ...R.pmrChannels().map(channel => ({ ...channel, region: "PMR" })),
        ...R.remerVHFChannels().map(channel => ({ ...channel, region: "REMER" })),
        ...repeaters.map(channel => ({ ...channel, region: "SIMULATION" }))
      ], "region");
      const imported = R.appendQuanshengChannels(original, groups.channels, 1);
      assert.equal(imported.added, 28);
      await connector.writeConfiguration(imported.image, original, permit);
      let readback = await connector.readConfiguration();
      assert.deepEqual(readback, imported.image);
      assert.equal(R.readQuanshengChannels(readback).length, 29);
      const selected = R.readQuanshengChannels(readback).find(channel => channel.name === "SIM-RPT");
      assert.ok(selected);
      const edited = R.updateQuanshengChannel(readback, {
        ...selected, name: `S${slot}-EDIT`, rx: "145.62500", tx: "145.02500", scanList: slot
      });
      await connector.writeConfiguration(edited, readback, permit);
      readback = await connector.readConfiguration();
      assert.equal(R.readQuanshengChannels(readback).find(channel => channel.number === selected.number).rx, "145.62500");
      const assigned = R.assignQuanshengScanList(readback, [selected.number], 24);
      await connector.writeConfiguration(assigned, readback, permit);
      readback = await connector.readConfiguration();
      assert.equal(R.readQuanshengChannels(readback).find(channel => channel.number === selected.number).scanList, 24);
      const removed = R.deleteQuanshengChannel(readback, selected.number);
      await connector.writeConfiguration(removed, readback, permit);
      readback = await connector.readConfiguration();
      assert.equal(R.readQuanshengChannels(readback).length, 28);
      assert.equal(R.readQuanshengChannels(readback).some(channel => channel.number === selected.number), false);
      const restored = R.appendQuanshengChannels(readback, [{
        ...repeaters[0], name: `S${slot}-RPT`, scanList: 24
      }], 1);
      assert.equal(restored.added, 1);
      await connector.writeConfiguration(restored.image, readback, permit);
      readback = await connector.readConfiguration();
      const channels = R.readQuanshengChannels(readback);
      assert.equal(channels.length, 29);
      assert.ok(channels.slice(1).every(channel => channel.rxOnly && channel.scanList > 0));
      assert.equal(channels.filter(channel => channel.name.startsWith("PMR")).length, 16);
      assert.deepEqual(readback.subarray(0x8800), original.subarray(0x8800));
      assert.throws(() => R.appendQuanshengChannels(readback, [{
        name: "AIR-SIM", rx: "121.50000", tx: "121.50000", mode: 1, rxOnly: true
      }], 1), /FM analogicos/);
      if (edition === "Satellite") {
        const flashBeforeCAT = device.flash.slice();
        device.catActive = true;
        assert.equal((await connector.setCatReceive(14580000)).appliedFrequency10Hz, 14580000);
        await connector.stopCatReceive();
        device.catActive = false;
        await connector.stopCatReceive();
        assert.deepEqual(device.flash, flashBeforeCAT);
      }
      for (let other = 0; other < banks.length; other++) {
        if (other !== bank) assert.deepEqual(banks[other], otherBanks[other]);
      }
      assert.deepEqual(device.flash.slice(0x20000, 0x40000), protectedMain);
      assert.deepEqual(device.flash.slice(0x10000, 0x10200), protectedCalibration);
      assert.deepEqual(banks[0], mainBank);
      assert.equal(device.commands.some(command => command.type === 0x0728), false);
      completed.set(slot, { bank, image: readback.slice(), crc: R.crc32(firmware) });
      R.assertBackup(connector, permit);
      await connector.disconnect();
      assert.equal(R.hasBackup(connector, permit), false);
    } finally {
      if (connector.connected) await connector.disconnect();
    }
  }
  assert.equal(completed.size, 4);
  for (const result of completed.values()) assert.deepEqual(banks[result.bank], result.image);
});
test("Permiso no reutilizable en otra radio, tras revocacion o tras desconectar", async () => {
  const first = new R.QuanshengConnector(new QuanshengDevice()); await first.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(first);
  const second = new R.QuanshengConnector(new QuanshengDevice()); await second.connect("UV-K1");
  await assert.rejects(second.eraseSlot(1, permit), /bloqueada/);
  await first.disconnect();
  await assert.rejects(first.eraseSlot(1, permit), /bloqueada/);
});
test("Error de CRC despues de escribir invalida sesion", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  device.badValidation = true;
  await assert.rejects(connector.writeSlot(1, device.flash.slice(0x21000, 0x21400), "Fusion", permit), /CRC/);
  assert.equal(connector.connected, false);
  await assert.rejects(connector.eraseSlot(1, permit), /bloqueada/);
});
for (const family of ["MK22", "STM32", "SERIAL"]) {
  test(`${family}: identificar familia, leer segmentos y calibracion sin escribir`, async () => {
    const device = new GD77Device(family); const connector = new R.GD77Connector(family, device);
    const info = await connector.connect();
    assert.equal(info.family, family);
    const infoRequests = device.requests.filter(request => request[0] === 0x52 && request[1] === 9);
    assert.equal(infoRequests.length, 1);
    assert.equal(le(infoRequests[0]).getUint16(6, false), 46);
    const store = new MemoryStore();
    const { record, permit } = await new R.BackupManager(store).create(connector);
    assert.equal(permit, null);
    assert.equal(record.status, "partial");
    assert.match(record.scope, /firmware MCU original NO respaldado/);
    assert.equal(record.files.some(file => file.name === "base-firmware"), false);
    assert.equal(record.files[0].bytes.length, family === "MK22" ? 4096 : 512);
    assert.equal(record.files[1].bytes.length, 131072);
    for (const part of R.gd77Segments(family)) {
      assert.equal(record.files[1].bytes[part.start], (part.address + part.mode) & 255);
      assert.equal(record.files[1].bytes[part.end - 1], (part.address + part.end - part.start - 1 + part.mode) & 255);
    }
    assert(device.requests.every(request => [0x43, 0x52].includes(request[0])));
    const before = device.requests.length;
    await assert.rejects(connector.readCodeplug(permit), /bloqueada/);
    await assert.rejects(connector.readScreen(permit), /bloqueada/);
    assert.equal(device.requests.length, before, "No se emiten operaciones adicionales sin firmware respaldado.");
    assert(!device.requests.some(request => request[0] === 0x43 && request[1] === 6), "Leer no debe guardar ajustes/VFO ni reiniciar la radio.");
    await assert.rejects(connector.writeCodeplug(record.files[1].bytes, permit), /bloqueada/);
  });
}
test("Familia GD77 incorrecta o estructura desconocida no se asume", async () => {
  for (const mode of ["family", "struct"]) {
    const device = new GD77Device("MK22");
    if (mode === "family") device.type = 11;
    else device.structVersion = 99;
    await assert.rejects(new R.GD77Connector("MK22", device).connect(), /incorrecta|desconocida/);
  }
});
test("GD77 rechaza comando no reconocido y cabecera de lectura corrupta", async () => {
  for (const field of ["rejectCommand", "badHeader"]) {
    const device = new GD77Device("MK22"); device[field] = true;
    await assert.rejects(new R.GD77Connector("MK22", device).connect(), /confirmado|incorrecta/);
  }
});
test("Conector rechaza operaciones solapadas", async () => {
  const device = new GD77Device("MK22"); const connector = new R.GD77Connector("MK22", device);
  await connector.connect();
  let finish;
  const pending = connector.run("Larga", () => new Promise(resolve => { finish = resolve; }));
  await assert.rejects(connector.run("Otra", async () => {}), /otra operacion/);
  await assert.rejects(connector.disconnect(), /No desconectes/);
  finish(); await pending;
});
test("Editor: BCD exacto y rechazo de frecuencias invalidas", () => {
  assert.deepEqual(Array.from(R.encodeFrequency("145.50000")), [0, 0, 0x55, 0x14]);
  assert.equal(R.decodeFrequency(Uint8Array.of(0, 0x25, 0x83, 0x43)), "438.32500");
  for (const input of ["0", "-1", "1000", "145.123456", "1e2", "145,5", "NaN"]) assert.throws(() => R.encodeFrequency(input));
  assert.throws(() => R.decodeFrequency(Uint8Array.of(0xff, 0, 0, 0)), /BCD/);
});
function channelImage() {
  const image = new Uint8Array(131072).fill(0);
  image[0x3780] = 1;
  const offset = 0x3790;
  image.set(new TextEncoder().encode("Simplex"), offset);
  image.set(R.encodeFrequency("145.5"), offset + 16);
  image.set(R.encodeFrequency("145.5"), offset + 20);
  image[offset + 49] = 0x12;
  image[offset + 51] = 0x21;
  return image;
}
test("Editor: cambiar canal preserva bytes ajenos y original inmutable", () => {
  const original = channelImage();
  const channel = R.readChannels(original)[0];
  assert.equal(channel.name, "Simplex");
  const edited = R.updateChannel(original, { ...channel, name: "Local", rx: "438.325", tx: "430.725", mode: 1, colorCode: 7, timeslot: 2, rxOnly: true });
  const parsed = R.readChannels(edited)[0];
  assert.equal(parsed.tx, "430.72500");
  assert.equal(parsed.colorCode, 7);
  assert.equal(parsed.timeslot, 2);
  assert.equal(parsed.rxOnly, true);
  const permitted = new Set([...Array(25).keys()].map(i => 0x3790 + i).concat([0x3790 + 44, 0x3790 + 49, 0x3790 + 51]));
  for (let i = 0; i < original.length; i++) if (!permitted.has(i)) assert.equal(edited[i], original[i]);
  assert.equal(edited[0x3790 + 49] & ~64, original[0x3790 + 49]);
  assert.equal(R.readChannels(original)[0].name, "Simplex");
});
test("Editor: no crea canales ni admite datos incorrectos", () => {
  const image = channelImage(); const channel = R.readChannels(image)[0];
  for (const patch of [{ number: 2 }, { number: 0 }, { name: "<script>too long text" }, { mode: 3 }, { colorCode: 16 }, { timeslot: 3 }]) assert.throws(() => R.updateChannel(image, { ...channel, ...patch }));
  assert.throws(() => R.readChannels(new Uint8Array(3)), /Tamano/);
});
test("Exportacion de copia corrupta no devuelve archivo con exito aparente", async () => {
  const file = { name: "calibration", bytes: Uint8Array.of(1), sha256: await R.sha256(Uint8Array.of(2)) };
  await assert.rejects(R.exportBackup({ files: [file] }), /corrupta/);
});
test("Calibracion vacia/borrada no se acepta como respaldo", () => {
  assert.throws(() => R.validateCalibration(new Uint8Array(512)), /vacia/);
  assert.throws(() => R.validateCalibration(new Uint8Array(512).fill(255)), /vacia/);
  assert.throws(() => R.validateCalibration(new Uint8Array(511).fill(1)), /vacia/);
});
test("Revocacion explicita invalida un permiso sin desconectar", async () => {
  const connector = new R.QuanshengConnector(new QuanshengDevice());
  await connector.connect("UV-K1");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  R.revokeBackup(connector);
  await assert.rejects(connector.resetBank(1, permit), /bloqueada/);
});
test("SerialTransport reutiliza el unico puerto autorizado, abre 8N1, lee fragmentos y libera locks", async () => {
  let incoming;
  const sent = [];
  let opened;
  let closed = false;
  const port = {
    readable: new ReadableStream({ start(controller) { incoming = controller; } }),
    writable: new WritableStream({ write(data) { sent.push(data.slice()); } }),
    getInfo() { return { usbVendorId: 0x36b7, usbProductId: 0xffff }; },
    async open(options) { opened = options; },
    async close() { closed = true; }
  };
  let prompted = false;
  const api = { async getPorts() { return [port]; }, async requestPort() { prompted = true; return port; },
    addEventListener() {}, removeEventListener() {} };
  const transport = new R.SerialTransport(api);
  await transport.open(38400, [{ usbVendorId: 0x36b7, usbProductId: 0xffff }]);
  assert.equal(prompted, false);
  assert.deepEqual(opened, { baudRate: 38400, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });
  const reading = transport.readExact(4);
  incoming.enqueue(Uint8Array.of(1, 2));
  incoming.enqueue(Uint8Array.of(3, 4));
  assert.deepEqual(await reading, Uint8Array.of(1, 2, 3, 4));
  await transport.write(Uint8Array.of(7, 8));
  assert.deepEqual(sent[0], Uint8Array.of(7, 8));
  await transport.close();
  assert.equal(closed, true);
  assert.equal(port.readable.locked, false);
  assert.equal(port.writable.locked, false);
});
test("SerialTransport detecta fin de stream y no oculta fallo", async () => {
  let incoming;
  const port = {
    readable: new ReadableStream({ start(controller) { incoming = controller; } }),
    writable: new WritableStream(), async open() {}, async close() {}
  };
  const transport = new R.SerialTransport({ async requestPort() { return port; }, addEventListener() {}, removeEventListener() {} });
  await transport.open(115200);
  const pending = transport.readExact(1);
  incoming.close();
  await assert.rejects(pending, /cerro/);
  await transport.close();
});
function usbMock(cdc = true) {
  const calls = [];
  let rejectRead;
  const device = {
    opened: false,
    configuration: { interfaces: cdc ? [
      { interfaceNumber: 0, alternates: [{ interfaceClass: 2, endpoints: [] }] },
      { interfaceNumber: 1, alternates: [{ interfaceClass: 10, alternateSetting: 0, endpoints: [
        { type: "bulk", direction: "in", endpointNumber: 2 },
        { type: "bulk", direction: "out", endpointNumber: 3 }
      ] }] }
    ] : [] },
    async open() { this.opened = true; },
    async claimInterface(number) { calls.push(["claim", number]); },
    async releaseInterface(number) { calls.push(["release", number]); },
    async selectAlternateInterface(number, alternate) { calls.push(["alt", number, alternate]); },
    async controlTransferOut(setup, bytes) { calls.push(["control", setup, bytes]); return { status: "ok" }; },
    transferIn() { return new Promise((resolve, reject) => { this.receive = resolve; rejectRead = reject; }); },
    async transferOut(endpoint, data) { calls.push(["out", endpoint]); return { status: "ok", bytesWritten: this.shortWrite ? 0 : data.length }; },
    async close() { this.opened = false; if (rejectRead) rejectRead(new Error("Closed")); }
  };
  return {
    device, calls,
    api: { async requestDevice(options) { calls.push(["request", options]); return device; }, addEventListener() {}, removeEventListener() {} }
  };
}
test("USBTransport descubre CDC, configura 115200, usa endpoints y libera interfaces", async () => {
  const { device, calls, api } = usbMock();
  const transport = new R.USBTransport(api);
  await transport.open();
  assert.deepEqual(calls[0][1].filters, [{ vendorId: 0x1fc9, productId: 0x0094 }]);
  const controls = calls.filter(call => call[0] === "control");
  assert.equal(controls.length, 2);
  assert.equal(le(controls[0][2]).getUint32(0, true), 115200);
  assert.equal(controls[0][2][6], 8);
  await transport.write(Uint8Array.of(1));
  assert.deepEqual(calls.find(call => call[0] === "out"), ["out", 3]);
  const pending = transport.readExact(2);
  device.receive({ status: "ok", data: new DataView(Uint8Array.of(5, 6).buffer) });
  assert.deepEqual(await pending, Uint8Array.of(5, 6));
  await transport.close();
  assert.equal(device.opened, false);
  assert.deepEqual(calls.filter(call => call[0] === "release").map(call => call[1]), [1, 0]);
});
test("USBTransport rechaza DFU sin interfaz CDC, no asume endpoints", async () => {
  const { api, device } = usbMock(false);
  await assert.rejects(new R.USBTransport(api).open(), /CDC/);
  assert.equal(device.opened, false);
});
test("USBTransport rechaza transferencias incompletas", async () => {
  const { api, device } = usbMock();
  const transport = new R.USBTransport(api);
  await transport.open(); device.shortWrite = true;
  await assert.rejects(transport.write(Uint8Array.of(1)), /incompleta/);
  await transport.close();
});
test("API USB y Serial ausentes fallan con error explicito", async () => {
  await assert.rejects(new R.SerialTransport(null).open(38400), /Web Serial/);
  await assert.rejects(new R.USBTransport(null).open(), /WebUSB/);
});
test("Corrupcion o borrado del respaldo posterior revoca permiso antes de modificar", async () => {
  for (const mode of ["corrupt", "removed"]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K1");
    const store = new MemoryStore();
    const { permit, record } = await new R.BackupManager(store).create(connector);
    if (mode === "corrupt") store.corrupt = true;
    else store.records.delete(record.id);
    device.commands = [];
    await assert.rejects(connector.eraseSlot(1, permit), /bloqueada/);
    assert.equal(R.hasBackup(connector, permit), false);
    assert.equal(device.commands.length, 0);
  }
});
test("Captura OpenGD77 no emite comandos sin respaldo completo del firmware", async () => {
  for (const family of ["MK22", "STM32", "SERIAL"]) {
    const device = new GD77Device(family);
    const connector = new R.GD77Connector(family, device);
    await connector.connect();
    const before = device.requests.length;
    await assert.rejects(connector.readScreen(), /bloqueada/);
    assert.equal(device.requests.length, before);
  }
});
class GD77WritingDevice extends GD77Device {
  constructor(family) {
    super(family);
    this.memory = new Uint8Array(0x100000).fill(0xa5);
    this.eeprom = new Uint8Array(0x100000).fill(0xa5);
  }
  async write(data) {
    if (data[0] === 0x57 || data[0] === 0x58) {
      this.requests.push(data.slice());
      const v = le(data);
      if (data[1] === 1) {
        this.sector = ((data[2] << 16) | (data[3] << 8) | data[4]) * 4096;
        this.staging = this.memory.slice(this.sector, this.sector + 4096);
      } else if (data[1] === 2) {
        assert(this.staging);
        this.staging.set(data.subarray(8), v.getUint32(2, false) - this.sector);
      } else if (data[1] === 3) {
        this.memory.set(this.staging, this.sector);
        this.staging = null;
      } else if (data[1] === 4) {
        (this.family === "MK22" ? this.eeprom : this.memory).set(data.subarray(8), v.getUint32(2, false));
      } else throw new Error("Unknown subcommand");
      this.push(Uint8Array.of(this.rejectWrite ? 0 : data[0], data[1]));
      return;
    }
    if (data[0] === 0x52 && data[1] !== 9) {
      this.requests.push(data.slice());
      const address = le(data).getUint32(2, false);
      const length = le(data).getUint16(6, false);
      const answer = new Uint8Array(length + 3);
      answer[0] = 0x52;
      le(answer).setUint16(1, length, false);
      const memory = this.family === "MK22" && data[1] === 2 ? this.eeprom : this.memory;
      answer.set(memory.subarray(address, address + length), 3);
      this.push(answer);
      return;
    }
    return super.write(data);
  }
}
function isolatedWriter() {
  // Only this isolated VM bypasses the gate to exercise dormant write encoding.
  // Production still cannot mint an OpenGD77 firmware-backup permit.
  const vm = require("node:vm");
  const fs = require("node:fs");
  const sandbox = {
    RadioWorkspace: { ...R, assertBackup() {}, async verifyBackup() {} },
    Uint8Array, DataView
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../gd77-connector.js"), "utf8"), sandbox);
  return sandbox.RadioWorkspace.GD77Connector;
}
for (const family of ["MK22", "STM32", "SERIAL"]) {
  test(`${family}: codificacion de escritura aislada W/X, sectores, EEPROM y readback`, async () => {
    const Writer = isolatedWriter();
    const device = new GD77WritingDevice(family);
    const connector = new Writer(family, device);
    await connector.connect();
    const image = channelImage();
    await connector.writeCodeplug(image, {});
    const char = family === "MK22" ? 0x57 : 0x58;
    assert(device.requests.some(request => request[0] === char && request[1] === 1));
    assert(device.requests.some(request => request[0] === char && request[1] === 2));
    assert(device.requests.some(request => request[0] === char && request[1] === 3));
    assert(device.requests.some(request => request[0] === char && request[1] === 4));
    for (const part of R.gd77Segments(family)) {
      const memory = family === "MK22" && part.mode === 2 ? device.eeprom : device.memory;
      assert.deepEqual(memory.slice(part.address, part.address + part.end - part.start), image.slice(part.start, part.end));
    }
    assert.equal((family === "MK22" ? device.eeprom : device.memory)[0x70], 0xa5);
    assert.equal(device.memory[family === "MK22" ? 0x8ee60 : 0xaee60], 0xa5);
  });
}
test("Escritor aislado aborta ante ACK negativo sin exito aparente", async () => {
  const Writer = isolatedWriter();
  const device = new GD77WritingDevice("MK22");
  const connector = new Writer("MK22", device);
  await connector.connect();
  device.rejectWrite = true;
  await assert.rejects(connector.writeCodeplug(channelImage(), {}), /rechazo/);
  assert.equal(connector.connected, false);
});
function overlayApp({ name = "FoxHunt", code = new Uint8Array(300).map((_, i) => i & 255), assets = new Uint8Array(0), flags = 1 } = {}) {
  const header = new Uint8Array(64);
  const v = le(header);
  v.setUint32(0, 0x31504146, true); v.setUint16(4, 1, true); header[6] = 1; header[7] = 3;
  v.setUint32(8, code.length, true); v.setUint32(12, R.crc32(code), true); v.setUint16(18, flags, true);
  header.set(new TextEncoder().encode(name), 20); header.set(new TextEncoder().encode("1.1"), 36);
  v.setUint32(52, 0x20000280, true); v.setUint16(60, assets.length, true);
  v.setUint16(62, R.crc32(assets) & 0xffff, true);
  const file = new Uint8Array(64 + code.length + assets.length);
  file.set(header); file.set(code, 64); file.set(assets, 64 + code.length);
  return file;
}
function assetFixture() {
  const pack = new Uint8Array(337).fill(19);
  le(pack).setUint32(0, 0x31415746, true);
  le(pack).setUint16(4, 1, true);
  le(pack).setUint16(6, 32, true);
  le(pack).setUint32(8, pack.length - 32, true);
  le(pack).setUint32(12, R.crc32(pack.subarray(32)), true);
  return pack;
}
test("v7 package parser validates nested lengths, vectors, version and both CRCs", () => {
  const image = baseFlash().slice(0x21000, 0x21400);
  image[71] = 55;
  const pack = assetFixture();
  const file = new Uint8Array(image.length + pack.length + 16);
  file.set(image); file.set(pack, image.length);
  const tail = file.length - 16;
  le(file).setUint32(tail, 0x54415746, true);
  le(file).setUint32(tail + 4, image.length, true);
  le(file).setUint32(tail + 8, pack.length, true);
  le(file).setUint32(tail + 12, R.crc32(file.subarray(0, tail)), true);
  const parsed = R.inspectQuanshengFirmwarePackage(file);
  assert.equal(parsed.version, "7.2.0");
  assert.deepEqual(parsed.image, image);
  assert.deepEqual(parsed.pack, pack);
  assert.equal(parsed.assets.buildId, "13".repeat(16));
  const corrupt = file.slice(); corrupt[300] ^= 1;
  assert.throws(() => R.inspectQuanshengFirmwarePackage(corrupt), /CRC FWAT/);
  assert.throws(() => R.inspectQuanshengFirmwarePackage(image), /paquete v7/);
  const badPack = pack.slice(); badPack[100] ^= 1;
  assert.throws(() => R.inspectQuanshengAssetPack(badPack), /CRC/);
  assert.throws(() => R.inspectQuanshengAssetPack(new Uint8Array(0x4001)), /limites/);
  assert.equal(R.inspectQuanshengFirmwarePackage(baseFlash().slice(0x21000, 0x21400)).version, "6.2.0");
});
test("v7 assets enforce identity, consent, header-last ordering and explicit programming/validation failures", async () => {
  for (const scenario of ["wrong-build", "success", "rejected", "not-loaded", "timeout"]) {
    const wrongBuild = scenario === "wrong-build";
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
    connector.info.firmware = "F4HWN v7.0.0";
    const pack = assetFixture();
    const operations = [];
    const original = device.write.bind(device);
    const saved = new Uint8Array(pack.length).fill(255);
    let validated = false;
    let writesAttempted = 0;
    const exchange = connector.exchange.bind(connector);
    connector.exchange = async (type, ...args) => {
      if (type === 0x0754 && scenario === "timeout") {
        writesAttempted++;
        throw Object.assign(new Error("asset timeout"), { code: "READ_TIMEOUT" });
      }
      return exchange(type, ...args);
    };
    device.write = async frame => {
      const { type, data } = R.decodeQuanshengPacket(frame);
      if (type < 0x0750 || type > 0x0756) return original(frame);
      operations.push({ type, data: data.slice() });
      let result;
      if (type === 0x0750) {
        result = new Uint8Array(52);
        result[0] = 2; result[2] = 2; result[3] = validated && scenario !== "not-loaded" ? 1 : 0;
        result.fill(wrongBuild ? 20 : 19, 36, 52);
      } else {
        assert.equal(data[0], 2);
        result = Uint8Array.of(2, 0);
        if (type === 0x0754) {
          if (scenario === "rejected") {
            result[1] = 8;
            device.push(response(type + 1, result));
            return;
          }
          assert.equal(le(data).getUint32(8, true), connector.timestamp);
          saved.set(data.subarray(12), le(data).getUint32(2, true));
        }
        if (type === 0x0756) { assert.deepEqual(saved, pack); validated = true; }
      }
      device.push(response(type + 1, result));
    };
    await assert.rejects(connector.installFirmwareAssets(pack, {}, "RECURSOS UV-K5-V3"), /respaldo/);
    await assert.rejects(connector.installFirmwareAssets(pack, permit, ""), /Confirma/);
    if (wrongBuild) {
      await assert.rejects(connector.installFirmwareAssets(pack, permit, "RECURSOS UV-K5-V3"), /Build ID/);
      assert(operations.every(item => item.type === 0x0750));
    } else if (scenario === "success") {
      const result = await connector.installFirmwareAssets(pack, permit, "RECURSOS UV-K5-V3");
      assert.equal(result.firmwareValidated, true);
      assert.equal(result.physicalBootTested, false);
      const writes = operations.filter(item => item.type === 0x0754);
      assert.equal(le(writes[0].data).getUint32(2, true), 32);
      assert.equal(le(writes.at(-1).data).getUint32(2, true), 0);
      assert.equal(R.hasBackup(connector, permit), false);
    } else {
      await assert.rejects(connector.installFirmwareAssets(pack, permit, "RECURSOS UV-K5-V3"),
        scenario === "rejected" ? /rechazada/ : scenario === "not-loaded" ? /cargados/ : /timeout/);
      assert.equal(R.hasBackup(connector, permit), false);
      if (scenario === "timeout") assert.equal(writesAttempted, 5);
      if (scenario === "rejected") {
        assert.equal(operations.filter(item => item.type === 0x0754).length, 1);
        assert(!operations.some(item => item.type === 0x0756));
      }
    }
    await connector.disconnect();
  }
});
test("Apps Labs: el archivo .app se valida antes de tocar la radio", () => {
  const app = R.parseQuanshengApp(overlayApp({ assets: Uint8Array.of(9, 9, 9) }));
  assert.equal(app.header.name, "FoxHunt"); assert.equal(app.header.apiMin, 3); assert.equal(app.assets.length, 3);
  const corrupt = overlayApp(); corrupt[100] ^= 1;
  assert.throws(() => R.parseQuanshengApp(corrupt), /CRC/);
  const corruptAssets = overlayApp({ assets: Uint8Array.of(1, 2, 3) }); corruptAssets[corruptAssets.length - 1] ^= 1;
  assert.throws(() => R.parseQuanshengApp(corruptAssets), /CRC de los assets/);
  assert.throws(() => R.parseQuanshengApp(overlayApp({ flags: 0 })), /completa/);
  assert.throws(() => R.parseQuanshengApp(overlayApp({ code: new Uint8Array(4097) })), /4 KiB/);
  assert.throws(() => R.parseQuanshengApp(overlayApp().subarray(0, 200)), /tamano/i);
  assert.throws(() => R.parseQuanshengApp(baseFlash().subarray(0x21000, 0x21400)), /FAP1/);
});
test("Apps Labs: instalar escribe codigo y assets antes que la cabecera y verifica", async () => {
  const device = new QuanshengDevice(); const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  await assert.rejects(connector.installApp(2, overlayApp()), /bloqueada/);
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  device.commands = [];
  const file = overlayApp({ assets: new Uint8Array(200).fill(7) });
  const result = await connector.installApp(2, file, permit);
  assert.equal(result.status, 0);
  const base = 0x102000 + 2 * 0x2000;
  assert.deepEqual(device.flash.slice(base, base + 64), file.slice(0, 64));
  assert.deepEqual(device.flash.slice(base + 0x1000, base + 0x1000 + 300), file.slice(64, 364));
  assert.deepEqual(device.flash.slice(base + 0x100, base + 0x100 + 200), file.slice(364));
  const writes = device.commands.filter(item => item.type === 0x0734);
  assert.equal(le(writes[0].data).getUint32(2, true), 0x1000);
  assert.equal(le(writes.at(-1).data).getUint32(2, true), 0);
  assert(writes.every(item => le(item.data).getUint16(6, true) <= 128));
  assert.equal(device.commands.at(-1).type, 0x0736);
  const apps = await connector.listApps();
  assert.equal(apps.length, 16);
  assert.equal(apps[2].name, "FoxHunt"); assert.equal(apps[2].status, 0); assert.equal(apps[0].status, 2);
  await connector.deleteApp(2, permit);
  assert.equal((await connector.listApps())[2].status, 2);
});
test("Apps Labs: firmware sin apps se identifica sin escribir", async () => {
  const device = new QuanshengDevice(); device.noApps = true;
  const connector = new R.QuanshengConnector(device); await connector.connect("UV-K1");
  await assert.rejects(connector.listApps(), /Labs/);
  assert(device.commands.every(item => [0x0514, 0x0730].includes(item.type)));
});
test("Apps Labs: exportar y mover conserva codigo/assets y borra origen solo tras verificar destino", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  const file = overlayApp({ assets: new Uint8Array(401).fill(19) });
  await connector.installApp(2, file, permit);
  assert.deepEqual(await connector.readApp(2), file);
  await assert.rejects(connector.moveApp(2, 4, permit, ""), /Confirma/);
  const before = device.flash.slice();
  device.commands = [];
  await connector.moveApp(2, 4, permit, "MOVER APP 3 A 5");
  assert.deepEqual(await connector.readApp(4), file);
  const apps = await connector.listApps();
  assert.equal(apps[2].status, 2);
  assert.equal(apps[4].status, 0);
  const erases = device.commands.filter(command => command.type === 0x0732);
  assert.deepEqual(erases.map(command => command.data[0]), [4, 2]);
  const sourceErase = device.commands.findIndex(command => command.type === 0x0732 && command.data[0] === 2);
  assert(device.commands.slice(0, sourceErase).some(command => command.type === 0x0736 && command.data[0] === 4));
  assert.deepEqual(device.flash.slice(0, 0x102000), before.slice(0, 0x102000));
  await connector.disconnect();
});
test("Apps Labs: mover rechaza destino ocupado sin borrados y fallo de copia conserva origen", async () => {
  for (const occupied of [true, false]) {
    const device = new QuanshengDevice();
    const connector = new R.QuanshengConnector(device);
    await connector.connect("UV-K5-V3");
    const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
    await connector.installApp(1, overlayApp(), permit);
    if (occupied) await connector.installApp(3, overlayApp({ name: "Second" }), permit);
    const origin = device.flash.slice(0x104000, 0x106000);
    device.commands = [];
    device.corruptAppWrite = !occupied;
    await assert.rejects(connector.moveApp(1, 3, permit, "MOVER APP 2 A 4"), occupied ? /vacio/ : /difiere/);
    assert.deepEqual(device.flash.slice(0x104000, 0x106000), origin);
    assert(!device.commands.some(command => command.type === 0x0732 && command.data[0] === 1));
    if (occupied) assert(!device.commands.some(command => command.type === 0x0732));
    await connector.disconnect();
  }
});
test("Apps Labs: borrado global exige confirmacion, limita huecos y verifica que todos quedan vacios", async () => {
  const device = new QuanshengDevice();
  device.appSlots = 48;
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  await connector.installApp(0, overlayApp(), permit);
  await connector.installApp(47, overlayApp(), permit);
  const protectedBytes = device.flash.slice(0, 0x102000);
  device.commands = [];
  await assert.rejects(connector.deleteAllApps({}, "BORRAR TODAS LAS APPS"), /respaldo/);
  await assert.rejects(connector.deleteAllApps(permit, ""), /Confirma/);
  assert(!device.commands.some(command => command.type === 0x0732));
  assert.deepEqual(await connector.deleteAllApps(permit, "BORRAR TODAS LAS APPS"), { deleted: 2 });
  assert.deepEqual(device.commands.filter(command => command.type === 0x0732).map(command => command.data[0]), [0, 47]);
  assert((await connector.listApps()).every(app => app.status === 2));
  assert.deepEqual(device.flash.slice(0, 0x102000), protectedBytes);
  await connector.disconnect();
});
test("Apps Labs: exportacion rechaza codigo corrupto sin mutar Flash", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  await connector.installApp(0, overlayApp(), permit);
  device.flash[0x103010] ^= 1;
  device.commands = [];
  await assert.rejects(connector.readApp(0), /CRC/);
  assert(device.commands.every(command => [0x0730, 0x0738].includes(command.type)));
  await connector.disconnect();
});
test("Apps Labs: ACK de borrado sin borrar no se presenta como exito global", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  await connector.installApp(0, overlayApp(), permit);
  const write = device.write.bind(device);
  device.write = async frame => {
    const command = R.decodeQuanshengPacket(frame);
    if (command.type === 0x0732) device.push(response(0x0733, Uint8Array.of(command.data[0], 0)));
    else await write(frame);
  };
  await assert.rejects(connector.deleteAllApps(permit, "BORRAR TODAS LAS APPS"), /Quedan apps/);
  assert.equal((await connector.listApps())[0].status, 0);
  await connector.disconnect();
});
test("Apps Labs: un ACK positivo no oculta una escritura corrupta ni confirma la cabecera", async () => {
  const device = new QuanshengDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const { permit } = await new R.BackupManager(new MemoryStore()).create(connector);
  device.commands = [];
  device.corruptAppWrite = true;
  await assert.rejects(connector.installApp(1, overlayApp(), permit), /difiere del archivo/);
  assert.equal(connector.connected, false);
  assert(!device.commands.some(item => item.type === 0x0734 && le(item.data).getUint32(2, true) === 0));
  assert(!device.commands.some(item => item.type === 0x0736));
});
