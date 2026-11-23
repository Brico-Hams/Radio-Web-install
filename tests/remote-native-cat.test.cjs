const test = require("node:test");
const assert = require("node:assert/strict");
const cat = require("../remote-native-cat.cjs");

// Fake byte transport: replies are queued per write by a responder; no timers.
function byteTransport(responder) {
  const input = [];
  const writes = [];
  return {
    writes,
    write(buffer) { writes.push(Buffer.from(buffer)); for (const byte of responder(Buffer.from(buffer), writes.length) || []) input.push(byte); },
    read(length) {
      if (input.length < length) return Promise.reject(new cat.NativeCatError("timeout", "timeout"));
      return Promise.resolve(Buffer.from(input.splice(0, length)));
    }
  };
}

function catReply({ request, flags, applied, capabilities = 7, status = 0 }) {
  const reply = Buffer.alloc(16);
  reply[0] = 1;
  reply[1] = status;
  reply.writeUInt16LE(request.readUInt16LE(2), 2);
  reply.writeInt32LE(capabilities, 4);
  reply.writeUInt32LE(applied, 8);
  reply.writeInt32LE(flags, 12);
  return cat.quanshengEncode(0x7b01, reply);
}

test("Quansheng: CRC-16/XMODEM y marco ida y vuelta (CatProtocolTest.kt)", () => {
  assert.equal(cat.crc16(Buffer.from("123456789")), 0x31c3);
  const data = Buffer.from([1, 2, 3, 4, 5]);
  const frame = cat.quanshengEncode(0x7b00, data);
  assert.equal(frame.readUInt16LE(0), 0xcdab);
  assert.equal(frame.readUInt16LE(frame.length - 2), 0xbadc);
  assert.deepEqual(cat.quanshengDecode(frame), { type: 0x7b00, data });
  assert.throws(() => cat.quanshengDecode(Buffer.alloc(12)), /corrupt/);
  assert.throws(() => cat.quanshengEncode(0, Buffer.alloc(509)), /bounds/);
  const bad = Buffer.from(frame);
  bad[8] ^= 1;
  assert.throws(() => cat.quanshengDecode(bad), /CRC/);
});

test("Quansheng: consulta, sintonia dentro de banda y estado no armado", async () => {
  const state = { applied: 14_580_000 };
  const transport = byteTransport(write => {
    const { type, data } = cat.quanshengDecode(write);
    if (type !== 0x7b00) return [];
    if (data[1] === 1) state.applied = data.readUInt32LE(4);
    return catReply({ request: data, flags: 3, applied: state.applied, status: data[1] === 0 ? 0 : 1 });
  });
  const rig = new cat.QuanshengRig(transport);
  assert.equal(await rig.getFreq(), 145_800_000);
  await rig.setFreq(145_825_000);
  assert.equal(await rig.getFreq(), 145_825_000);
  await assert.rejects(rig.setFreq(7_074_000), { code: "range" });
  assert.equal(await rig.getMode(), null);
  assert.equal(await rig.getStrength(), null);
  const idle = new cat.QuanshengRig(byteTransport(write => catReply({ request: cat.quanshengDecode(write).data, flags: 0, applied: 0, status: 5 })));
  await assert.rejects(idle.getFreq(), { code: "not-armed" });
});

test("Quansheng: PTT solo con allowTx y liberacion siempre permitida", async () => {
  const log = [];
  const respond = write => {
    const { data } = cat.quanshengDecode(write);
    log.push(data[1]);
    const reply = Buffer.alloc(16);
    reply[0] = 1;
    reply.writeUInt16LE(data.readUInt16LE(2), 2);
    reply.writeInt32LE(8, 4);
    reply.writeInt32LE(data[1] === 1 ? 3 : 1, 8);
    return cat.quanshengEncode(0x7b03, reply);
  };
  const locked = new cat.QuanshengRig(byteTransport(respond));
  await assert.rejects(locked.setPtt(true), { code: "tx-disabled" });
  assert.deepEqual(log, []);
  await locked.setPtt(false);
  assert.deepEqual(log, [2]);
  const armed = new cat.QuanshengRig(byteTransport(respond), { allowTx: true });
  assert.equal((await armed.setPtt(true)).keyed, true);
});

test("Yaesu cinco bytes: vectores de YaesuFiveByteTest.kt", async () => {
  assert.deepEqual([...cat.YaesuFiveByte.frequencyCommand(145_800_000)], [0x14, 0x58, 0, 0, 0x01]);
  assert.deepEqual([...cat.YaesuFiveByte.frequencyCommand(439_700_000)], [0x43, 0x97, 0, 0, 0x01]);
  assert.deepEqual([...cat.YaesuFiveByte.frequencyCommand(7_074_000)], [0, 0x70, 0x74, 0, 0x01]);
  assert.throws(() => cat.YaesuFiveByte.frequencyCommand(7_074_005), /10 Hz/);
  assert.deepEqual(cat.YaesuFiveByte.decodeFrequencyMode(Buffer.from([0x14, 0x58, 0, 0, 0x08])), { hz: 145_800_000, mode: "FM" });
  assert.equal(cat.YaesuFiveByte.decodeFrequencyMode(Buffer.from([0x14, 0x58, 0, 0, 0x55])).mode, null);
  assert.throws(() => cat.YaesuFiveByte.decodeFrequencyMode(Buffer.from([0x1a, 0x58, 0, 0, 0x08])), /BCD/);
  assert.throws(() => cat.YaesuFiveByte.decodeFrequencyMode(Buffer.from([0x14, 0x58, 0, 0x08])), /invalid/);
  assert.deepEqual([...cat.YaesuFiveByte.ptt(true)], [0, 0, 0, 0, 0x08]);
  assert.deepEqual([...cat.YaesuFiveByte.ptt(false)], [0, 0, 0, 0, 0x88]);
  assert.deepEqual([...cat.YaesuFiveByte.toggleVfo()], [0, 0, 0, 0, 0x81]);
  assert.deepEqual([...cat.YaesuFiveByte.split(true)], [0, 0, 0, 0, 0x02]);
  assert.deepEqual([...cat.YaesuFiveByte.modeCommand("USB")], [0x01, 0, 0, 0, 0x07]);
});

test("Yaesu cinco bytes: fija frecuencia, la confirma y bloquea el PTT por defecto", async () => {
  let hz = 7_074_000;
  const transport = byteTransport(write => {
    if (write[4] === 0x01) hz = Number(write.subarray(0, 4).toString("hex")) * 10;
    return write[4] === 0x03 ? Buffer.from(String(hz / 10).padStart(8, "0").match(/../g).map(pair => Number.parseInt(pair, 16)).concat(0x01)) : [];
  });
  const rig = new cat.YaesuFiveByteRig(transport);
  await rig.setFreq(14_074_000);
  assert.equal(await rig.getFreq(), 14_074_000);
  assert.equal(await rig.getMode(), "USB");
  await assert.rejects(rig.setPtt(true), { code: "tx-disabled" });
  assert.ok(!transport.writes.some(write => write[4] === 0x08));
  await rig.setPtt(false);
  assert.deepEqual([...transport.writes.at(-1)], [0, 0, 0, 0, 0x88]);
});

function lineTransport(radio) {
  const queue = [];
  const writes = [];
  return {
    writes,
    write(text) { writes.push(text); const reply = radio(text); if (reply !== undefined) queue.push(reply); },
    readLine() { return queue.length ? Promise.resolve(queue.shift()) : Promise.reject(new cat.NativeCatError("timeout", "timeout")); }
  };
}

test("TH-D75: consultas, sintonia en VFO y rechazos", async () => {
  const bands = { 0: { hz: 145_000_000, md: 0, vm: 0 }, 1: { hz: 131_725_000, md: 0, vm: 1 } };
  const transport = lineTransport(text => {
    const [word, rest] = [text.slice(0, 2), text.slice(3).replace("\r", "")];
    const [band, value] = rest.split(",");
    if (word === "BC") return "BC 1";
    if (word === "FQ") { if (value !== undefined) { bands[band].hz = Number(value); return undefined; } return `FQ ${band},${String(bands[band].hz).padStart(10, "0")}`; }
    if (word === "MD") { if (value !== undefined) { bands[band].md = Number(value); return undefined; } return `MD ${band},${bands[band].md}`; }
    if (word === "VM") { if (value !== undefined) { bands[band].vm = Number(value); return undefined; } return `VM ${band},${bands[band].vm}`; }
    return word === "TX" || word === "RX" ? word : "?";
  });
  const rig = new cat.Th75Rig(transport);
  assert.equal(await rig.getFreq(), 131_725_000);
  assert.equal(await rig.getMode(), "FM");
  await rig.setFreq(118_100_000);
  assert.ok(transport.writes.includes("VM 1,0\r"));
  assert.ok(transport.writes.includes("FQ 1,0118100000\r"));
  await rig.setMode("AM");
  assert.equal(await rig.getMode(), "AM");
  await assert.rejects(rig.setFreq(7_074_000, 0), { code: "range" });
  await assert.rejects(rig.setMode("USB", 0), { code: "unsupported" });
  await assert.rejects(rig.setPtt(true), { code: "tx-disabled" });
  assert.ok(!transport.writes.includes("TX\r"));
  const rejected = new cat.Th75Rig(lineTransport(() => "N"));
  await assert.rejects(rejected.getFreq(1), { code: "rejected" });
});

test("TH-D75: una subida que falla intenta RX antes de propagar", async () => {
  const transport = lineTransport(text => (text === "TX\r" ? "?" : "RX"));
  const rig = new cat.Th75Rig(transport, { allowTx: true });
  await assert.rejects(rig.setPtt(true), { code: "rejected" });
  assert.deepEqual(transport.writes, ["TX\r", "RX\r"]);
});

test("fachada rigctld: f, F, m, T y comandos sin fuente", async () => {
  const rig = { getFreq: async () => 145_800_000, setFreq: async () => {}, getMode: async () => null, getStrength: async () => null, getPtt: async () => null, setPtt: async on => { if (on) throw new cat.NativeCatError("off", "tx-disabled"); } };
  assert.equal(await cat.handleRigctldLine(rig, "f"), "145800000\n");
  assert.equal(await cat.handleRigctldLine(rig, "F 145825000"), "RPRT 0\n");
  assert.equal(await cat.handleRigctldLine(rig, "m"), "RPRT -11\n");
  assert.equal(await cat.handleRigctldLine(rig, "l STRENGTH"), "RPRT -11\n");
  assert.equal(await cat.handleRigctldLine(rig, "T 1"), "RPRT -1\n");
  assert.equal(await cat.handleRigctldLine(rig, "T 0"), "RPRT 0\n");
});

test("los protocolos nativos del catalogo tienen adaptador salvo Xiegu (pendiente de fuente)", () => {
  const { loadCatalog } = require("../remote-catalog.cjs");
  for (const radio of loadCatalog().radios.filter(item => item.hamlibModel === null)) {
    if (radio.nativeProtocol === "xiegu-civ") assert.throws(() => cat.createNativeRig(radio.nativeProtocol, {}), /pendiente de fuente/);
    else assert.ok(cat.createNativeRig(radio.nativeProtocol, {}), radio.id);
  }
});

// Xiegu CI-V: frames from Hamlib tests/testg90swr.c (query fe fe 88 e0 15 12 fd, replies fe fe e0 88 15 12 hi lo fd) and rigs/icom/xiegu.c.
const civReply = (from, ...body) => [0xfe, 0xfe, 0xe0, from, ...body, 0xfd];

test("Xiegu: direccion, baudios y modelo Hamlib del catalogo salen de xiegu.c", () => {
  const { loadCatalog } = require("../remote-catalog.cjs");
  const radios = new Map(loadCatalog().radios.map(radio => [radio.id, radio]));
  for (const [id, model] of Object.entries(cat.XIEGU_MODELS)) {
    const radio = radios.get(id);
    assert.equal(radio.civAddress, `0x${model.address.toString(16).toUpperCase()}`, id);
    assert.match(radio.hamlibNote, new RegExp(`= ${model.hamlibModel} `), id);
    if (model.baudMin === model.baudMax) assert.equal(radio.serial.baud, model.baudMax, id);
    else assert.equal(radio.serial.baud, 0, id);
  }
  assert.equal(radios.get("xiegu-g106").civAddress, undefined);
  assert.throws(() => cat.createNativeRig("xiegu-civ", {}, { radio: "xiegu-g106" }), /pendiente de fuente/);
});

test("Xiegu G90: frecuencia 7.074 MHz en BCD de 5 bytes, orden 1 Hz primero", async () => {
  assert.deepEqual([...cat.civEncodeFreq(7_074_000)], [0x00, 0x40, 0x07, 0x07, 0x00]);
  assert.equal(cat.civDecodeFreq(Buffer.from([0x00, 0x40, 0x07, 0x07, 0x00])), 7_074_000);
  assert.throws(() => cat.civDecodeFreq(Buffer.from([0x0a, 0, 0, 0, 0])), /BCD/);
  const transport = byteTransport(frame => (frame[4] === 0x03 ? civReply(0x88, 0x03, 0x00, 0x40, 0x07, 0x07, 0x00) : frame[4] === 0x04 ? civReply(0x88, 0x04, 0x01, 0x01) : civReply(0x88, 0xfb)));
  const rig = cat.createNativeRig("xiegu-civ", transport, { radio: "xiegu-g90" });
  assert.equal(await rig.getFreq(), 7_074_000);
  assert.deepEqual([...transport.writes[0]], [0xfe, 0xfe, 0x88, 0xe0, 0x03, 0xfd]);
  assert.equal(await rig.getMode(), "USB");
});

test("Xiegu: el eco USB de la propia trama y las difusiones se saltan", async () => {
  const transport = byteTransport(frame => [...frame, 0xfe, 0xfe, 0x00, 0x88, 0x00, 0x00, 0x40, 0x07, 0x07, 0x00, 0xfd, ...civReply(0xa4, 0x03, 0x00, 0x00, 0x04, 0x14, 0x00)]);
  assert.equal(await new cat.XieguCivRig(transport, { radio: "xiegu-x6100" }).getFreq(), 14_040_000);
  assert.deepEqual([...transport.writes[0]], [0xfe, 0xfe, 0xa4, 0xe0, 0x03, 0xfd]);
});

test("Xiegu: setFreq confirma releyendo y setMode rechaza modos sin codigo", async () => {
  let freq = [0, 0, 0, 0, 0];
  const transport = byteTransport(frame => {
    if (frame[4] === 0x05) { freq = [...frame.subarray(5, 10)]; return civReply(0x88, 0xfb); }
    return civReply(0x88, 0x03, ...freq);
  });
  const rig = new cat.XieguCivRig(transport, { radio: "xiegu-g90" });
  await rig.setFreq(14_074_000);
  assert.deepEqual([...transport.writes[0]], [0xfe, 0xfe, 0x88, 0xe0, 0x05, 0x00, 0x40, 0x07, 0x14, 0x00, 0xfd]);
  await assert.rejects(rig.setMode("WFM"), { code: "unsupported" });
  await assert.rejects(new cat.XieguCivRig(byteTransport(() => civReply(0x88, 0xfa)), { radio: "xiegu-g90" }).setVfo("A"), { code: "rejected" });
});

test("Xiegu G90: SWR 15 12 con las respuestas de testg90swr.c", async () => {
  const cases = [[[0x00, 0x00], 1.0], [[0x01, 0x84], 4.6], [[0x02, 0x2c], null], [[0x01, 0xa0], null], [[0x0a, 0x00], null]];
  let index = 0;
  const transport = byteTransport(() => civReply(0x88, 0x15, 0x12, ...cases[index++][0]));
  const rig = new cat.XieguCivRig(transport, { radio: "xiegu-g90" });
  for (const [, expected] of cases) {
    if (expected === null) await assert.rejects(rig.getSwr(), /meter/);
    else assert.ok(Math.abs(await rig.getSwr() - expected) < 0.001);
  }
  assert.ok(transport.writes.every(frame => bytesEqualTo(frame, [0xfe, 0xfe, 0x88, 0xe0, 0x15, 0x12, 0xfd])));
});

function bytesEqualTo(buffer, expected) { return cat.bytesEqual([...buffer], expected); }

test("Xiegu: S-metro 15 02 con la calibracion X108G y la del X6100", async () => {
  const g90 = new cat.XieguCivRig(byteTransport(() => civReply(0x88, 0x15, 0x02, 0x01, 0x20)), { radio: "xiegu-g90" });
  assert.equal(await g90.getStrengthRaw(), 120);
  assert.equal(await g90.getStrength(), -6);
  const x6100 = new cat.XieguCivRig(byteTransport(() => civReply(0xa4, 0x15, 0x02, 0x01, 0x20)), { radio: "xiegu-x6100" });
  assert.equal(await x6100.getStrength(), 0);
});

test("Xiegu: PTT no se sube sin allowTx, acepta FB o el eco 1C y la bajada siempre se envia", async () => {
  const transport = byteTransport(frame => (frame[5] === 0x00 && frame[6] === 0x01 ? civReply(0x88, 0x1c, 0x00, 0x01) : civReply(0x88, 0xfb)));
  const locked = new cat.XieguCivRig(transport, { radio: "xiegu-g90" });
  await assert.rejects(locked.setPtt(true), { code: "tx-disabled" });
  assert.equal(transport.writes.length, 0);
  await locked.setPtt(false);
  assert.deepEqual([...transport.writes[0]], [0xfe, 0xfe, 0x88, 0xe0, 0x1c, 0x00, 0x00, 0xfd]);
  const keyed = new cat.XieguCivRig(transport, { radio: "xiegu-g90", allowTx: true });
  await keyed.setPtt(true);
  assert.deepEqual([...transport.writes[1]], [0xfe, 0xfe, 0x88, 0xe0, 0x1c, 0x00, 0x01, 0xfd]);
});

test("Xiegu: una subida rechazada intenta la bajada y el tune solo existe en G90 con allowTx", async () => {
  const transport = byteTransport(() => civReply(0x88, 0xfa));
  const rig = new cat.XieguCivRig(transport, { radio: "xiegu-g90", allowTx: true });
  await assert.rejects(rig.setPtt(true), { code: "rejected" });
  assert.deepEqual(transport.writes.map(frame => frame[6]), [1, 0]);
  const tuneTransport = byteTransport(() => civReply(0x88, 0xfb));
  const tuner = new cat.XieguCivRig(tuneTransport, { radio: "xiegu-g90" });
  await assert.rejects(tuner.setTuner(true), { code: "tx-disabled" });
  await tuner.setTuner(false);
  assert.deepEqual([...tuneTransport.writes[0]], [0xfe, 0xfe, 0x88, 0xe0, 0x1c, 0x01, 0x00, 0xfd]);
  await new cat.XieguCivRig(tuneTransport, { radio: "xiegu-g90", allowTx: true }).setTuner(true);
  assert.equal(tuneTransport.writes[1][6], 0x02);
  await assert.rejects(new cat.XieguCivRig(tuneTransport, { radio: "xiegu-x6100", allowTx: true }).setTuner(true), { code: "unsupported" });
  await assert.rejects(new cat.XieguCivRig(tuneTransport, { radio: "xiegu-x6100" }).setSplit(true), { code: "unsupported" });
});
