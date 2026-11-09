const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");
require("../quansheng-tools.js");

const le = data => new DataView(data.buffer, data.byteOffset, data.byteLength);
const key = [0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80];
function response(type, data) {
  const body = new Uint8Array(4 + data.length + 2);
  le(body).setUint16(0, type, true);
  le(body).setUint16(2, data.length, true);
  body.set(data, 4);
  le(body).setUint16(body.length - 2, 0xffff, true);
  const packet = new Uint8Array(body.length + 6);
  packet.set([0xab, 0xcd, (body.length - 2) & 255, (body.length - 2) >> 8]);
  packet.set(body.map((byte, i) => byte ^ key[i % 16]), 4);
  packet.set([0xdc, 0xba], packet.length - 2);
  return packet;
}

// F4HWN v6.2 radio whose firmware never answers 0x0738 (external Flash physical read).
class NoFlashReadDevice extends R.BufferedTransport {
  constructor() {
    super();
    this.commands = [];
    this.configuration = new Uint8Array(0xa180).fill(255);
    this.calibration = new Uint8Array(0x1000).fill(0x5a);
  }
  async open() { this.opened = true; }
  async close() { this.opened = false; }
  async write(frame) {
    const { type, data } = R.decodeQuanshengPacket(frame);
    this.commands.push(type);
    let result;
    if (type === 0x0514) {
      result = new Uint8Array(36);
      result.set(new TextEncoder().encode("F4HWN v6.2.0"));
    } else if (type === 0x051b) {
      const offset = le(data).getUint16(0, true);
      const length = data[2];
      result = new Uint8Array(length + 4);
      le(result).setUint16(0, offset, true);
      result[2] = length;
      const source = offset < 0xb000 ? this.configuration : this.calibration;
      const base = offset < 0xb000 ? offset : offset - 0xb000;
      result.set(source.subarray(base, base + length), 4);
    } else return;
    const answer = response(type + 1, result);
    this.push(answer.subarray(0, 5));
    this.push(answer.subarray(5));
  }
}
const count = (device, type) => device.commands.filter(command => command === type).length;

test("0x0738 sin respuesta: una sola sonda, cacheada como no admitida y sin desconectar", async () => {
  const device = new NoFlashReadDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const started = Date.now();
  assert.equal(await connector.probeFlashRead(), "unsupported");
  assert(Date.now() - started < 3500, "the probe uses a short timeout, not the 4 s transport timeout");
  assert.equal(count(device, 0x0738), 1);
  assert.equal(connector.flashReadSupport, "unsupported");
  assert.equal(connector.connected, true);
  assert.ok(!device.error);

  await assert.rejects(connector.readFlashBlockRaw(0, 128), error => {
    assert.equal(error.code, "FLASH_READ_UNSUPPORTED");
    assert.match(error.message, /no admite la copia de Flash externa/);
    assert.match(error.message, /EEPROM y calibracion sigue disponible/);
    assert.doesNotMatch(error.message, /\.\./);
    return true;
  });
  await assert.rejects(connector.readExternalFlash(), { code: "FLASH_READ_UNSUPPORTED" });
  assert.equal(count(device, 0x0738), 1, "no later chunk sends another 0x0738");
  assert.equal(connector.connected, true);
  await connector.disconnect();
});

test("backup sin 0x0738 guarda calibracion y configuracion, no concede permiso completo y no bloquea el DFU interno", async () => {
  const device = new NoFlashReadDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  const records = new Map();
  const store = { async put(record) { records.set(record.id, structuredClone(record)); }, async get(id) { return structuredClone(records.get(id)); } };
  const result = await new R.BackupManager(store).create(connector);
  assert.equal(result.record.status, "partial");
  assert.deepEqual(result.record.files.map(file => file.name).sort(), ["calibration", "configuration"]);
  assert.equal(result.permit, null);
  assert(result.partialPermit);
  assert.equal(count(device, 0x0738), 1);
  assert.equal(R.hasPartialBackup(connector, result.partialPermit), true);
  assert.equal(R.hasBackup(connector, result.partialPermit), false);
  assert.throws(() => R.assertBackup(connector, result.partialPermit));
  await R.verifyPartialBackup(connector, result.partialPermit);
  assert.equal(connector.connected, true);
  await connector.disconnect();
});

test("el error de Connector.run no duplica el punto final", async () => {
  const device = new NoFlashReadDevice();
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K5-V3");
  await assert.rejects(connector.run("Prueba", async () => { throw new Error("Tiempo agotado: recibidos 0/1 bytes."); }),
    error => !/\.\./.test(error.message));
  await connector.disconnect();
});
