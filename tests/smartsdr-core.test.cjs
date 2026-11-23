"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const sdr = require("../smartsdr-core.cjs");

const { Cmd, SmartSdrSession } = sdr;
const DISCOVERY = "model=FLEX-6600 serial=1234-5678-6600-0001 version=3.4.1.2 name=Shack_Radio callsign=EA1ABC ip=192.168.1.50 port=4992";
const METER_LIST = "meter 1.src=TX-#1.num=1#1.nam=FWDPWR#1.low=0.0#1.hi=53.0#1.unit=dBm#1.fps=40"
  + "#2.nam=SWR#2.low=1.0#2.hi=999.0#2.unit=SWR#2.fps=40"
  + "#3.nam=ALC#3.low=-150.0#3.hi=20.0#3.unit=dBFS#3.fps=40"
  + "#4.nam=PATEMP#4.low=-40.0#4.hi=150.0#4.unit=degC#4.fps=10";

function vita(payload, { classWord, timestamps } = {}) {
  const padded = Buffer.concat([payload, Buffer.alloc((4 - (payload.length % 4)) % 4)]);
  const header = [0x800];
  let flags = 3 << 28;
  if (classWord !== undefined) { flags |= 1 << 27; header.push(0x00001C2D, classWord); }
  if (timestamps) { flags |= (3 << 22) | (1 << 20); header.push(1, 2, 3); }
  const words = [(flags | (1 + header.length + padded.length / 4)) >>> 0, ...header];
  const head = Buffer.alloc(words.length * 4);
  words.forEach((word, index) => head.writeUInt32BE(word >>> 0, index * 4));
  return Buffer.concat([head, padded]);
}

function meters(...pairs) {
  const buffer = Buffer.alloc(pairs.length * 4);
  pairs.forEach(([id, value], index) => { buffer.writeUInt16BE(id, index * 4); buffer.writeInt16BE(value, index * 4 + 2); });
  return buffer;
}

function fakeRadio(replies = {}) {
  const socket = new EventEmitter();
  socket.sent = [];
  socket.setEncoding = () => {};
  socket.destroyed = false;
  socket.destroy = () => { socket.destroyed = true; };
  socket.write = frame => {
    const [, sequence, command] = /^C(\d+)\|(.*)\n$/.exec(frame);
    socket.sent.push(command);
    const [code, message] = replies[command] || ["0", ""];
    setImmediate(() => socket.emit("data", `R${sequence}|${code}|${message}\n`));
  };
  return socket;
}

function session(options = {}, replies = {}) {
  const socket = fakeRadio(replies);
  const instance = new SmartSdrSession({ socket, ...options });
  instance.meters = sdr.parseMeterList(METER_LIST);
  return { instance, socket };
}

test("discovery string, VITA-49 packet and legacy header", () => {
  const radio = sdr.parseDiscoveryString(DISCOVERY);
  assert.deepEqual([radio.model, radio.name, radio.ip, radio.port], ["FLEX-6600", "Shack Radio", "192.168.1.50", 4992]);
  assert.deepEqual(sdr.parseDiscoveryPacket(vita(Buffer.from(DISCOVERY), { classWord: 0x534CFFFF, timestamps: true })), radio);
  assert.throws(() => sdr.parseDiscoveryPacket(vita(Buffer.from(DISCOVERY), { classWord: 0x12345678 })));
  assert.throws(() => sdr.parseDiscoveryString("model=FLEX-6600 serial=1 ip=999.1.1.1 port=4992"));
  const legacy = Buffer.alloc(12);
  Buffer.from([192, 168, 1, 50]).copy(legacy);
  legacy.writeUInt16BE(4992, 4); legacy.writeUInt16BE(1, 6); legacy.writeUInt32BE(0xFFFFFF00, 8);
  assert.deepEqual([sdr.parseLegacyDiscovery(legacy).ip, sdr.parseLegacyDiscovery(legacy).verified], ["192.168.1.50", false]);
});

test("V H R S M lines and error codes", () => {
  assert.deepEqual(sdr.parseLine("V1.4.0.0\n"), { kind: "version", version: "1.4.0.0" });
  assert.equal(sdr.parseLine("H1A2B3C4D").handle, 0x1A2B3C4D);
  const reply = sdr.parseLine("R5|50000033|out of range\n");
  assert.deepEqual([reply.sequence, reply.code, reply.ok], [5, 0x50000033, false]);
  assert.equal(sdr.describeError(0x50000033), "out of range");
  const status = sdr.parseLine("S0|slice 0 RF_frequency=14.200000 mode=USB");
  assert.deepEqual([status.handle, status.object, status.ids], [0, "slice", ["0"]]);
  assert.deepEqual(status.fields, { RF_frequency: "14.200000", mode: "USB" });
  assert.equal(sdr.parseLine("M01000007|Careful").severity, "warning");
  assert.equal(sdr.parseLine("M03000001|x").severity, "fatal");
  assert.throws(() => sdr.parseLine("Zjunk"));
});

test("meter list, packet words and normalization", () => {
  const list = sdr.parseMeterList(METER_LIST);
  assert.equal(list.get(1).name, "FWDPWR");
  assert.deepEqual([list.get(2).low, list.get(2).high], [1, 999]);
  const payload = meters([1, 5120], [2, 192], [3, -2560], [9, 1]);
  assert.deepEqual(sdr.decodeMeterPayload(payload)[2], { id: 3, raw: -2560 });
  assert.deepEqual(sdr.scaleMeter(-2560, "dBFS"), { value: -20, verified: true });
  assert.deepEqual(sdr.scaleMeter(192, "SWR"), { value: 1.5, verified: false });
  const { instance } = session();
  const normalized = instance.ingestMeterPacket(vita(payload));
  assert.deepEqual([normalized.po, normalized.swr, normalized.alc], [10, 1.5, 0.1]);
  assert.ok(normalized.unverified.includes("SWR"));
  instance.ingestMeterPacket(vita(meters([1, 20000])));
  assert.equal(instance.rejectedMeters, 1);
});

test("command builders are allowlisted", () => {
  assert.equal(Cmd.sliceTune(0, 14.2), "slice tune 0 14.200000");
  assert.equal(Cmd.sliceSetMode(1, "digu"), "slice set 1 mode=digu");
  assert.equal(Cmd.sliceSetRit(0, true, 150), "slice set 0 rit_on=1 rit_freq=150");
  assert.equal(Cmd.transmitSet({ rfpower: 50, tunepower: 10 }), "transmit set rfpower=50 tunepower=10");
  assert.equal(Cmd.streamRemoteAudioRx("opus"), "stream create type=remote_audio_rx compression=opus");
  assert.throws(() => Cmd.transmitSet({ max_power_level: 100 }));
  assert.throws(() => Cmd.transmitSet({ rfpower: 101 }));
  assert.throws(() => Cmd.sliceSetMode(0, "fm"));
  assert.throws(() => Cmd.subscribe("evil"));
  assert.throws(() => Cmd.amplifierOperate("1;rm", true));
  assert.throws(() => sdr.frameCommand(1, "a\nb"));
  assert.equal(sdr.parsePgxlStatus("state=STANDBY").state, "STANDBY");
  assert.throws(() => sdr.parsePgxlStatus("hello"));
});

test("setup sets the interlock to the TX cap and matches replies by sequence", async () => {
  const { instance, socket } = session({ txCapMs: 12000 }, { "meter list": ["0", METER_LIST] });
  const hello = new Promise(resolve => instance.once("hello", resolve));
  instance.connect();
  socket.emit("data", "V3.4.1.2\nH0000ABCD\nS0|slice 0 mode=USB\n");
  await hello;
  await instance.setup({ udpPort: 4993 });
  assert.deepEqual([instance.version, instance.handle], ["3.4.1.2", 0xABCD]);
  assert.deepEqual(socket.sent.slice(0, 2), ["client gui", "client udpport 4993"]);
  assert.ok(socket.sent.includes("interlock timeout=12000"));
  assert.equal(socket.sent.at(-1), "sub meter all");
  assert.equal(instance.status.get("slice 0").mode, "USB");
});

test("command errors reject with the described code", async () => {
  const { instance } = session({}, { "slice remove 3": ["5000000D", ""] });
  await assert.rejects(() => instance.command(Cmd.sliceRemove(3)), /invalid slice or not yours/);
});

test("TX is off by default, limited and time capped", async () => {
  let { instance, socket } = session();
  await assert.rejects(() => instance.tuneStart(10), /TX disabled/);
  assert.deepEqual(socket.sent, []);
  let now = 1000;
  ({ instance, socket } = session({ allowTx: true, tuneLimit: 20, txCapMs: 30000, now: () => now }));
  await assert.rejects(() => instance.tuneStart(21), /tune limit/);
  await assert.rejects(() => instance.amplifierOperate("1A", true), /STANDBY/);
  assert.deepEqual(socket.sent, []);
  await instance.tuneStart(10);
  assert.deepEqual(socket.sent, ["transmit set tunepower=10", "transmit tune on"]);
  now += 31000;
  await instance.tick();
  assert.equal(socket.sent.at(-1), "transmit tune off");
  assert.equal(instance.txDeadline, null);
});

test("unverified TX off is reported", async () => {
  const { instance } = session({ allowTx: true }, { "transmit tune off": ["50000042", ""] });
  await instance.tuneStart(5);
  assert.equal(await instance.unkey(), false);
  assert.equal(instance.txOffUnverified, true);
  await instance.close();
});

test("high SWR trips, unkeys and blocks new TX", async () => {
  let now = 1000;
  const { instance, socket } = session({ allowTx: true, swrLimit: 3, swrTripMs: 1000, now: () => now });
  await instance.tuneStart(10);
  const high = vita(meters([2, 512]));
  instance.ingestMeterPacket(high);
  assert.equal(instance.swrTripped, false);
  now += 1000;
  instance.ingestMeterPacket(high);
  assert.equal(instance.swrTripped, true);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(socket.sent.at(-1), "transmit tune off");
  await assert.rejects(() => instance.tuneStart(10), /high SWR/);
  await instance.close();
});

test("close unkeys and puts amplifiers in standby", async () => {
  const { instance, socket } = session({ allowTx: true, allowAmplifierOperate: true });
  await instance.amplifierOperate("1A", true);
  await instance.close();
  assert.deepEqual(socket.sent.slice(-2), ["transmit tune off", "amplifier set 1A operate=0"]);
  assert.equal(socket.destroyed, true);
});

test("rig client exposes the session to the agent: no xmit PTT, guarded tune, rfpower level", async () => {
  const socket = fakeRadio({ "meter list": ["0", METER_LIST] });
  const client = new sdr.SmartSdrRigClient({ sessionFactory: options => new SmartSdrSession({ ...options, socket }), reconnectMs: 60000 });
  const connected = new Promise(resolve => client.once("connect", resolve));
  client.start();
  socket.emit("data", "V3.4.1.2\nH0000ABCD\nS0|slice 0 RF_frequency=14.200000 mode=USB\n");
  await connected;
  assert.equal(await client.getFreq(), 14200000);
  assert.deepEqual(await client.getMode(), { mode: "USB", passband: 0 });
  await client.setFreq(7074000);
  await client.setMode("PKTUSB");
  await client.setLevel("RFPOWER", 0.5);
  assert.deepEqual(socket.sent.slice(-3), ["slice tune 0 7.074000", "slice set 0 mode=digu", "transmit set rfpower=50"]);
  await assert.rejects(() => client.setPtt(true), /pendiente de fuente/);
  await assert.rejects(() => client.tune(), /TX disabled/);
  await assert.rejects(() => client.sendRaw("FA;"), /not available/);
  assert.equal((await client.dumpCaps()).tune, true);
  client.stop();
});
