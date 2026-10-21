const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");
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
class QuanshengDevice extends R.BufferedTransport {
  constructor() { super(); this.flash = baseFlash(); this.commands = []; }
  async open(baud) { assert.equal(baud, 38400); this.opened = true; }
  async close() { this.opened = false; }
  async write(frame) {
    const { type, data } = R.decodeQuanshengPacket(frame);
    this.commands.push({ type, data: data.slice() });
    let result;
    if (type === 0x0514) {
      result = new Uint8Array(36);
      result.set(new TextEncoder().encode(this.version || "F4HWN v6.2.0"));
    } else if (type === 0x051b) {
      const offset = le(data).getUint16(0, true);
      result = new Uint8Array(20);
      le(result).setUint16(0, offset, true);
      result[2] = 16;
      result.set(this.flash.subarray(0x10000 + offset - 0xb000, 0x10000 + offset - 0xb000 + 16), 4);
    } else if (type === 0x0738) {
      const address = le(data).getUint32(0, true);
      result = new Uint8Array(135);
      le(result).setUint32(0, address, true);
      le(result).setUint16(4, 128, true);
      result[6] = this.rejectFlash ? 8 : 0;
      result.set(this.flash.subarray(address, address + 128), 7);
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
      le(result).setUint32(0, address, true);
      le(result).setUint32(4, length, true);
      le(result).setUint32(8, R.crc32(this.flash.subarray(address, address + length)) ^ (this.badFlashCRC ? 1 : 0), true);
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
    } else throw new Error(`Unexpected command ${type.toString(16)}`);
    const answer = response(type + 1, result);
    this.push(answer.subarray(0, 5));
    this.push(answer.subarray(5));
  }
}
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
test("CRC Flash remoto discrepante aborta respaldo sin habilitar escrituras", async () => {
  const device = new QuanshengDevice(); device.badFlashCRC = true;
  const connector = new R.QuanshengConnector(device);
  await connector.connect("UV-K1");
  const store = new MemoryStore();
  await assert.rejects(new R.BackupManager(store).create(connector), /CRC de la Flash/);
  assert.deepEqual([...store.records.values()][0].files.map(file => file.name), ["calibration"]);
  await assert.rejects(connector.eraseSlot(1, {}), /bloqueada/);
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
    assert.equal(record.files[0].bytes.length, family === "MK22" ? 4096 : 512);
    assert.equal(record.files[1].bytes.length, 131072);
    for (const part of R.gd77Segments(family)) {
      assert.equal(record.files[1].bytes[part.start], (part.address + part.mode) & 255);
      assert.equal(record.files[1].bytes[part.end - 1], (part.address + part.end - part.start - 1 + part.mode) & 255);
    }
    assert(device.requests.every(request => [0x43, 0x52].includes(request[0])));
    await connector.readCodeplug();
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
  await assert.rejects(connector.readCodeplug(), /otra operacion/);
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
test("SerialTransport abre 8N1, lee fragmentos, escribe y libera locks", async () => {
  let incoming;
  const sent = [];
  let opened;
  let closed = false;
  const port = {
    readable: new ReadableStream({ start(controller) { incoming = controller; } }),
    writable: new WritableStream({ write(data) { sent.push(data.slice()); } }),
    async open(options) { opened = options; },
    async close() { closed = true; }
  };
  const api = { async requestPort() { return port; }, addEventListener() {}, removeEventListener() {} };
  const transport = new R.SerialTransport(api);
  await transport.open(38400);
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
test("Captura OpenGD77 usa modo de lectura de pantalla sin escribir", async () => {
  for (const family of ["MK22", "STM32", "SERIAL"]) {
    const device = new GD77Device(family);
    const connector = new R.GD77Connector(family, device);
    await connector.connect();
    const screen = await connector.readScreen();
    assert.equal(screen.length, family === "MK22" ? 1024 : 2560);
    assert(device.requests.filter(item => item[0] === 0x52).some(item => item[1] === 6));
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
  vm.runInNewContext(fs.readFileSync(require.resolve("..\\gd77-connector.js"), "utf8"), sandbox);
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
