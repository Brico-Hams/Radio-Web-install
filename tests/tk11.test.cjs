const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../tk11-connector.js");

const T = R.TK11;
const le = data => new DataView(data.buffer, data.byteOffset, data.byteLength);

function seededMemory() {
  const memory = new Uint8Array(T.MEMORY_SIZE);
  let state = 12345;
  for (let index = 0; index < memory.length; index++) {
    state = (state * 1103515245 + 12345) >>> 0;
    memory[index] = state >>> 24;
  }
  memory.fill(0xFF, T.OFFSETS.usage, T.OFFSETS.usage + 999);
  return memory;
}

class MockTK11 extends R.BufferedTransport {
  constructor(memory = seededMemory()) {
    super();
    this.memory = memory;
    this.writes = [];
    this.reads = 0;
    this.tamper = false;
  }
  async open(baud, filters, options) {
    assert.equal(baud, 38400);
    assert.equal(options.dtr, true);
    this.opened = true;
  }
  async close() { this.opened = false; }
  async write(data) {
    assert.deepEqual([...data.slice(0, 2)], [0xAB, 0xCD]);
    assert.deepEqual([...data.slice(-2)], [0xDC, 0xBA]);
    const length = data[2] | data[3] << 8;
    const payload = T.unframe(length, data.slice(4));
    const view = le(payload);
    const type = view.getUint16(0, true);
    if (type === T.CMD.connect) {
      assert.equal(view.getUint32(4, true), 5);
      const reply = new Uint8Array(56);
      le(reply).setUint16(0, T.CMD.connected, true);
      reply.set(new TextEncoder().encode("TK11-V1.23\0"), 4);
      this.push(T.frame(reply));
    } else if (type === T.CMD.read) {
      const offset = view.getUint32(4, true) - T.BASE;
      const size = view.getUint16(8, true);
      assert.ok(offset >= 0 && offset + size <= T.MEMORY_SIZE);
      this.reads++;
      const reply = new Uint8Array(12 + size);
      le(reply).setUint16(0, T.CMD.readData, true);
      reply.set(this.memory.subarray(offset, offset + size), 12);
      if (this.tamper && this.reads > 280) reply[12] ^= 1;
      this.push(T.frame(reply));
    } else if (type === T.CMD.write) {
      const offset = view.getUint32(4, true) - T.BASE;
      const size = view.getUint16(8, true);
      assert.equal(payload.length, 16 + size);
      this.writes.push({ offset, size });
      this.memory.set(payload.subarray(16), offset);
      const reply = new Uint8Array(8);
      le(reply).setUint16(0, T.CMD.written, true);
      this.push(T.frame(reply));
    } else assert.fail(`unexpected command ${type}`);
  }
}

function fakeStore() {
  const records = new Map();
  return {
    put: async record => { records.set(record.id, structuredClone(record)); },
    get: async id => structuredClone(records.get(id))
  };
}

async function connected(memory) {
  const radio = new MockTK11(memory);
  const connector = new R.TK11Connector(radio);
  const info = await connector.connect("TK-11");
  return { radio, connector, info };
}

test("framing: XOR obfuscation, CRC16-XMODEM and delimiters match CHIRP", () => {
  assert.equal(T.crc16(new TextEncoder().encode("123456789")), 0x31C3);
  const payload = Uint8Array.of(0xF4, 0x01, 0x04, 0x00, 0x05, 0x00, 0x00, 0x00);
  const framed = T.frame(payload);
  assert.deepEqual([...framed.slice(0, 4)], [0xAB, 0xCD, 8, 0]);
  assert.deepEqual([...framed.slice(-2)], [0xDC, 0xBA]);
  assert.equal(framed[4], 0xF4 ^ 0x16);
  assert.equal(framed[5], 0x01 ^ 0x6C);
  assert.deepEqual([...T.unframe(8, framed.slice(4))], [...payload]);
  const corrupt = framed.slice(4);
  corrupt[2] ^= 1;
  assert.throws(() => T.unframe(8, corrupt), /CRC/);
});

test("identify reports the firmware string", async () => {
  const { info } = await connected();
  assert.equal(info.model, "TK-11");
  assert.equal(info.firmware, "TK11-V1.23");
});

test("backup round-trip stores memory and a SHA-256 manifest, and re-read mismatches are rejected", async () => {
  const { radio, connector } = await connected();
  const store = fakeStore();
  const result = await new R.BackupManager(store).create(connector);
  assert.equal(result.record.status, "complete");
  const memory = result.record.files.find(file => file.name === "memory");
  const manifest = JSON.parse(new TextDecoder().decode(result.record.files.find(file => file.name === "manifest").bytes));
  assert.deepEqual([...memory.bytes], [...radio.memory]);
  assert.equal(manifest.sha256, await R.sha256(radio.memory));
  assert.equal(manifest.sha256, memory.sha256);
  assert.equal(manifest.chunks.length, 280);
  assert.equal(manifest.chunks[3].sha256, await R.sha256(radio.memory.subarray(3 * 0x200, 4 * 0x200)));
  assert.ok(result.permit);

  const unstable = await connected();
  unstable.radio.tamper = true;
  await assert.rejects(new R.BackupManager(fakeStore()).create(unstable.connector), /no coinciden/);
});

test("writes are blocked without a verified backup", async () => {
  const { radio, connector } = await connected();
  const before = radio.memory.slice();
  await assert.rejects(connector.writeSettings({ brightness: 100 }, {}), /Escritura bloqueada/);
  await assert.rejects(connector.restore(before, undefined), /Escritura bloqueada/);
  assert.equal(radio.writes.length, 0);
});

test("out-of-bounds and non-confirmed regions are rejected before any frame is sent", async () => {
  assert.throws(() => T.assertWritable(T.MEMORY_SIZE - 4, 8), /fuera del mapa/);
  assert.throws(() => T.assertWritable(-1, 4), /fuera del mapa/);
  assert.throws(() => T.assertWritable(0x10000, 16), /zona de datos confirmada/);
  assert.throws(() => T.assertWritable(0x13000 + 0xF0, 0x20), /zona de datos confirmada/);
  T.assertWritable(0x13000, 0xF8);
  const { radio, connector } = await connected();
  await assert.rejects(connector.writeBlock(0x10000, new Uint8Array(0x200)), /zona de datos confirmada/);
  await assert.rejects(connector.writeBlock(0x24000, new Uint8Array(0x200)), /fuera del mapa/);
  await assert.rejects(connector.readBlock(T.MEMORY_SIZE, 16), /fuera del mapa/);
  assert.equal(radio.writes.length, 0);
});

test("settings write changes only the edited field and never touches bytes outside confirmed regions", async () => {
  const { radio, connector } = await connected();
  const original = radio.memory.slice();
  const { permit } = await new R.BackupManager(fakeStore()).create(connector);
  const report = await connector.writeSettings({ brightness: 120, logo1: "HELLO", cw_pitch: 700 }, permit);
  assert.equal(report.written, 1);
  assert.deepEqual(radio.writes, [{ offset: 0x13000, size: 0x200 }]);
  assert.equal(radio.memory[0x13000 + 41], 120);
  assert.equal(le(radio.memory).getUint16(0x13000 + 50, true), 700);
  assert.equal(T.decodeSettings(radio.memory).logo1, "HELLO");
  for (let index = 0; index < original.length; index++) {
    if (index >= 0x13000 + 41 && index < 0x13000 + 42 || index >= 0x13000 + 50 && index < 0x13000 + 52 ||
        index >= 0x13000 + 216 && index < 0x13000 + 232) continue;
    assert.equal(radio.memory[index], original[index], `byte 0x${index.toString(16)} changed`);
  }
  await assert.rejects(connector.writeSettings({ brightness: 5 }, permit), /fuera de rango/);
  await assert.rejects(connector.writeSettings({ language: 1 }, permit), /no editable/);
});

test("restore writes back only confirmed regions and skips everything else", async () => {
  const { radio, connector } = await connected();
  const store = fakeStore();
  const { record, permit } = await new R.BackupManager(store).create(connector);
  const image = record.files.find(file => file.name === "memory").bytes;
  radio.memory[0x13000 + 41] ^= 0xFF;
  radio.memory[0x10000] ^= 0xFF;
  const damagedCalibrationByte = radio.memory[0x10000];
  await connector.restore(image, permit);
  assert.equal(radio.memory[0x13000 + 41], image[0x13000 + 41]);
  assert.equal(radio.memory[0x10000], damagedCalibrationByte);
  assert.ok(radio.writes.every(write => write.offset % 0x200 === 0));
});

test("channel layout matches CHIRP's tk11 memory struct", () => {
  const channel = {
    rxHz: 146520000, offsetHz: 600000, direction: "-", rxTone: { type: "CTCSS", value: 88.5 }, txTone: { type: "DCS", value: 23 },
    narrow: true, power: "High", mode: "FM", name: "CALL", squelch: 4, scanList: 2, pttId: "Start+End", signal: "5TONE"
  };
  const record = T.encodeChannel(channel);
  const view = le(record);
  assert.equal(view.getUint32(0, true), 14652000);
  assert.equal(view.getUint32(4, true), 60000);
  assert.equal(record[10], 1);
  assert.equal(record[11], 2);
  assert.equal(record[12], 2);
  assert.equal(record[13] & 15, 1);
  assert.equal(record[16], 2);
  assert.equal(record[20], 3);
  assert.equal(record[21], 0);
  assert.equal(record[22], 2);
  assert.equal(record[23], 4);
  assert.equal(String.fromCharCode(...record.slice(24, 28)), "CALL");
  assert.equal(view.getUint32(40, true), 885);
  assert.equal(view.getUint32(44, true), 19);
  assert.equal(record[60], 1);
  const decoded = T.decodeChannel(record, T.usageFlag(channel.rxHz));
  assert.deepEqual(decoded.rxTone, { type: "CTCSS", value: 88.5 });
  assert.deepEqual(decoded.txTone, { type: "DCS", value: 23 });
  assert.equal(decoded.name, "CALL");
  assert.equal(decoded.rxHz, 146520000);
  assert.equal(decoded.signal, "5TONE");
  assert.equal(T.usageFlag(146520000), 5);
  assert.equal(T.usageFlag(0), 0xFF);
  assert.equal(T.decodeChannel(new Uint8Array(64), 0xFF), null);
  assert.deepEqual([...T.encodeChannel(null)], new Array(64).fill(0));
  assert.throws(() => T.encodeChannel({ ...channel, rxHz: 2e9 }), /fuera de rango/);
  assert.throws(() => T.encodeChannel({ ...channel, name: "\u00e9" }), /Nombre/);
});

test("channel write encodes 999 slots with usage flags through the verified path", async () => {
  const { radio, connector } = await connected();
  const { permit } = await new R.BackupManager(fakeStore()).create(connector);
  const channels = new Array(999).fill(null);
  channels[0] = { rxHz: 446006250, offsetHz: 0, direction: "", mode: "FM", power: "Mid", name: "PMR1" };
  channels[998] = { rxHz: 145500000, offsetHz: 0, direction: "", mode: "FM", power: "Low", name: "LAST" };
  await connector.writeChannels(channels, permit);
  const read = await connector.readChannels();
  assert.equal(read.length, 999);
  assert.equal(read[0].name, "PMR1");
  assert.equal(read[998].rxHz, 145500000);
  assert.equal(read[1], null);
  assert.equal(radio.memory[0x11000], 8);
  assert.equal(radio.memory[0x11000 + 1], 0xFF);
  assert.ok(radio.writes.every(write => write.offset < 0x11400));
});

test("channels export to CSV and the hex viewer formats offsets", () => {
  const csv = T.channelsToCsv([{ name: 'A"B', rxHz: 145500000, offsetHz: 0, direction: "", mode: "FM", power: "Low", narrow: false }]);
  assert.match(csv, /^Location,Name,Frequency/);
  assert.match(csv, /1,"A""B",145\.50000/);
  assert.match(T.hexDump(Uint8Array.of(0x41, 0x42, 0), 0), /^000000 {2}41 42 00 +AB\.$/);
  const imported = T.channelsFromTemplate([{ rx: 145.5, name: "R0" }, { rx: 446.00625, name: "PMR 1" }]);
  assert.deepEqual(imported.map(channel => channel.rxHz), [145500000, 446006250]);
  assert.throws(() => T.channelsFromTemplate(new Array(1000).fill({ rx: 145.5, name: "X" })), /999/);
});
