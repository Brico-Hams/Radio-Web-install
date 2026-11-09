const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");

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

// F4HWN v6.2 radio with external Flash reads; `drops` maps an address to how many 0x0738 replies to swallow.
class FlashDevice extends R.BufferedTransport {
  constructor(drops = new Map()) {
    super();
    this.drops = drops;
    this.reads = [];
    this.hellos = 0;
    this.flash = Uint8Array.from({ length: 0x200000 }, (_, i) => (i * 7 + (i >> 8)) & 255);
    this.configuration = new Uint8Array(0xa180).fill(255);
    this.calibration = new Uint8Array(0x1000).fill(0x5a);
  }
  async open() { this.opened = true; }
  async close() { this.opened = false; }
  async write(frame) {
    const { type, data } = R.decodeQuanshengPacket(frame);
    let result;
    if (type === 0x0514) {
      this.hellos++;
      result = new Uint8Array(36);
      result.set(new TextEncoder().encode("F4HWN v6.2.0"));
    } else if (type === 0x051b) {
      const offset = le(data).getUint16(0, true);
      const length = data[2] || le(data).getUint16(2, true);
      result = new Uint8Array(length + 4);
      le(result).setUint16(0, offset, true);
      result[2] = length;
      const source = offset < 0xb000 ? this.configuration : this.calibration;
      const base = offset < 0xb000 ? offset : offset - 0xb000;
      result.set(source.subarray(base, base + length), 4);
    } else if (type === 0x0738) {
      const address = le(data).getUint32(0, true);
      const length = le(data).getUint16(4, true);
      this.reads.push(address);
      const remaining = this.drops.get(address) || 0;
      if (remaining > 0 && (!this.dropLength || length === this.dropLength)) { this.drops.set(address, remaining - 1); return; }
      result = new Uint8Array(length + 7);
      le(result).setUint32(0, address, true);
      le(result).setUint16(4, length, true);
      result.set(this.flash.subarray(address, address + length), 7);
    } else if (type === 0x073e) {
      const address = le(data).getUint32(0, true);
      const length = le(data).getUint32(4, true);
      result = new Uint8Array(13);
      le(result).setUint32(0, address, true);
      le(result).setUint32(4, length, true);
      le(result).setUint32(8, R.crc32(this.flash.subarray(address, address + length)), true);
    } else return;
    const answer = response(type + 1, result);
    this.push(answer.subarray(0, 5));
    this.push(answer.subarray(5));
  }
}
const quick = connector => {
  connector.flashChunkTimeoutMs = 25;
  connector.flashRetryDelayMs = 1;
  return connector;
};
const countAt = (device, address) => device.reads.filter(item => item === address).length;
const memoryStore = () => {
  const records = new Map();
  return { records, async put(record) { records.set(record.id, structuredClone(record)); }, async get(id) { return structuredClone(records.get(id)); } };
};

test("una respuesta 0x0738 perdida a mitad de Flash se recupera con un reintento y la lectura es exacta", async () => {
  const device = new FlashDevice(new Map([[0x41f00, 1]]));
  const connector = quick(new R.QuanshengConnector(device));
  await connector.connect("UV-K5-V3");
  const hellos = device.hellos;
  const progress = [];
  const flash = await connector.readFlashRaw(value => progress.push(value));
  assert.ok(R.equal(flash, device.flash));
  assert.equal(countAt(device, 0x41f00), 2);
  assert.ok(device.hellos > hellos, "el reintento repite el hello con la sesion actual");
  assert.equal(connector.connected, true);
  assert.ok(!device.error);
  assert.ok(progress.every((value, index) => index === 0 || value >= progress[index - 1]) && progress.at(-1) === 1);
  await connector.disconnect();
});

test("una direccion que siempre falla da error tras 3 reintentos, mantiene la conexion, no concede permiso y se reanuda", async () => {
  const device = new FlashDevice(new Map([[0x41f00, Infinity]]));
  const connector = quick(new R.QuanshengConnector(device));
  await connector.connect("UV-K5-V3");
  const store = memoryStore();
  let permit = null;
  await assert.rejects(new R.BackupManager(store).create(connector).then(result => { permit = result.permit; }), error => {
    assert.equal(error.code, "FLASH_READ_INTERRUPTED");
    assert.match(error.message, /Lectura de Flash interrumpida en 0x41f00 tras 3 reintentos \(USB inestable\)\. Reintenta la copia; la radio sigue conectada\./);
    assert.doesNotMatch(error.message, /carecer de lectura fisica/);
    return true;
  });
  assert.equal(permit, null);
  assert.equal(countAt(device, 0x41f00), 12, "4 intentos con bloques de 128, 64 y 32 bytes");
  assert.equal(connector.connected, true);
  assert.ok(!device.error);
  assert.equal([...store.records.values()][0].status, "failed");
  assert.equal(R.hasBackup(connector, Object.freeze({})), false);

  device.drops.clear();
  const flash = await connector.readFlashRaw();
  assert.ok(R.equal(flash, device.flash));
  assert.equal(countAt(device, 0x1000), 1, "los bloques buenos no se vuelven a leer");
  await connector.disconnect();
});

test("si solo se pierden respuestas de 128 bytes, la lectura baja a bloques de 64 y es exacta", async () => {
  const device = new FlashDevice(new Map([[0x41f00, Infinity]]));
  device.dropLength = 128;
  const connector = quick(new R.QuanshengConnector(device));
  await connector.connect("UV-K5-V3");
  const messages = [];
  connector.onProgress = ({ message }) => { if (message) messages.push(message); };
  const flash = await connector.readFlashRaw();
  assert.ok(R.equal(flash, device.flash));
  assert.equal(countAt(device, 0x41f00), 5, "4 intentos de 128 bytes y 1 de 64");
  assert.ok(messages.some(message => /bloques de 64 bytes/.test(message)));
  assert.equal(connector.connected, true);
  await connector.disconnect();
});
