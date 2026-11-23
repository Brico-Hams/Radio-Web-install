"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const sd = require("../station-devices.cjs");

const hex = text => Buffer.from(text.replace(/\s+/g, ""), "hex");

// Fake DLI controller: keeps outlet state and records every request.
function fakeDli(states = { 0: true, 1: false, 2: true }) {
  const requests = [];
  const transport = async request => {
    requests.push(request);
    const outlet = Number(/outlets\/(\d)/.exec(request.path)[1]);
    if (request.method === "PUT") { states[outlet] = request.body === "value=true"; return { status: 204, body: "" }; }
    if (request.method === "POST") return { status: 204, body: "" };
    return { status: 200, body: JSON.stringify(states[outlet]) };
  };
  return { requests, transport, states };
}

// Fake Waveshare relay: answers FC 01 and FC 05 with MBAP frames and records requests.
function fakeModbus() {
  const frames = [];
  let coils = 0;
  const exchange = async frame => {
    frames.push(Buffer.from(frame));
    const tid = frame.subarray(0, 2);
    const pdu = frame.subarray(7);
    let reply;
    if (pdu[0] === 0x05) {
      const coil = pdu.readUInt16BE(1);
      coils = pdu.readUInt16BE(3) === 0xff00 ? coils | (1 << coil) : coils & ~(1 << coil);
      reply = pdu;
    } else if (pdu[0] === 0x01) reply = Buffer.from([0x01, 1, coils]);
    else reply = Buffer.from([pdu[0] | 0x80, 0x01]);
    const out = Buffer.alloc(7 + reply.length);
    tid.copy(out, 0);
    out.writeUInt16BE(reply.length + 1, 4);
    out[6] = 1;
    reply.copy(out, 7);
    return out;
  };
  return { frames, exchange };
}

const outlets = [{ name: "radio", index: 0, role: "radio" }, { name: "amp", index: 1, role: "amp" }, { name: "rotor", index: 2, role: "rotor" }];

test("DLI requests match the REST reference", () => {
  assert.deepEqual(sd.dliRequest("set", 0, true), {
    method: "PUT", path: "/restapi/relay/outlets/0/transient_state/",
    headers: { "X-CSRF": "x", "Content-Type": "application/x-www-form-urlencoded" }, body: "value=true"
  });
  assert.equal(sd.dliRequest("set", 7, false).body, "value=false");
  assert.deepEqual(sd.dliRequest("cycle", 3), { method: "POST", path: "/restapi/relay/outlets/3/cycle/", headers: { "X-CSRF": "x" }, body: "" });
  assert.deepEqual(sd.dliRequest("read", 1), { method: "GET", path: "/restapi/relay/outlets/1/physical_state/", headers: { Accept: "application/json" }, body: "" });
  assert.throws(() => sd.dliRequest("read", 8), { code: "outlet_invalid" });
});

test("digest authorization reproduces the RFC 2617 example", () => {
  const header = sd.digestAuthorization({
    username: "Mufasa", password: "Circle Of Life", method: "GET", uri: "/dir/index.html", cnonce: "0a4f113b",
    challenge: 'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
  });
  assert.match(header, /response="6629fae49393a05397450978507c4ef1"/);
});

test("Modbus TCP frames follow the Waveshare example and the Modbus spec", () => {
  assert.deepEqual(sd.modbusWriteCoil(0, 1, 0, true), hex("00 00 00 00 00 06 01 05 00 00 FF 00"));
  assert.deepEqual(sd.modbusWriteCoil(1, 1, 7, false), hex("00 01 00 00 00 06 01 05 00 07 00 00"));
  assert.deepEqual(sd.modbusReadCoils(1, 1, 0, 8), hex("00 01 00 00 00 06 01 01 00 00 00 08"));
  assert.deepEqual(sd.modbusWriteCoils(1, 1, 0, [true, true]), hex("00 01 00 00 00 08 01 0F 00 00 00 02 01 03"));
  assert.throws(() => sd.modbusWriteCoil(1, 1, 8, true), { code: "outlet_invalid" });
});

test("Modbus exception replies are function code + 0x80", () => {
  const request = { transaction: 1, unit: 1, functionCode: 0x05 };
  assert.throws(() => sd.parseModbusResponse(hex("00 01 00 00 00 03 01 85 02"), request), { code: "modbus_exception" });
  assert.throws(() => sd.parseModbusResponse(hex("00 02 00 00 00 06 01 05 00 00 FF 00"), request), { code: "modbus_mismatch" });
  assert.equal(sd.parseModbusResponse(hex("00 01 00 00 00 06 01 05 00 00 FF 00"), request)[0], 0x05);
});

test("DLI outlet switching reads back the physical state", async () => {
  const fake = fakeDli();
  const device = sd.createPowerDevice({ id: "pdu", kind: "dli", outlets, transport: fake.transport, enabled: true, isTransmitting: () => false });
  const result = await device.set("rotor", false);
  assert.deepEqual(result, { outlet: "rotor", requested: false, physical: false, verified: true });
  assert.deepEqual(fake.requests.map(item => item.method), ["PUT", "GET", "GET", "GET"]);
  assert.deepEqual((await device.status()).outlets, { radio: true, amp: false, rotor: false });
});

test("radio and amplifier outlets need confirmation to switch off or cycle", async () => {
  const fake = fakeDli();
  const device = sd.createPowerDevice({ id: "pdu", kind: "dli", outlets, transport: fake.transport, enabled: true, isTransmitting: () => false });
  await assert.rejects(device.set("radio", false), { code: "confirm_required" });
  await assert.rejects(device.cycle("amp"), { code: "confirm_required" });
  assert.equal(fake.requests.length, 0);
  assert.equal((await device.set("radio", false, { confirm: true })).verified, true);
  await device.cycle("amp", { confirm: true });
  assert.ok(fake.requests.some(item => item.method === "POST" && item.path.endsWith("/1/cycle/")));
});

test("switching is refused while transmitting, when TX state is unknown, or when disabled", async () => {
  const fake = fakeDli();
  let tx = true;
  const device = sd.createPowerDevice({ id: "pdu", kind: "dli", outlets, transport: fake.transport, enabled: true, isTransmitting: () => tx });
  await assert.rejects(device.set("amp", true), { code: "transmitting" });
  await assert.rejects(device.set("radio", false, { confirm: true }), { code: "transmitting" });
  tx = false;
  await device.set("amp", true);
  const unknown = sd.createPowerDevice({ id: "pdu2", kind: "dli", outlets, transport: fake.transport, enabled: true });
  await assert.rejects(unknown.set("radio", true), { code: "transmitting" });
  const disabled = sd.createPowerDevice({ id: "pdu3", kind: "dli", outlets, transport: fake.transport, isTransmitting: () => false });
  await assert.rejects(disabled.set("rotor", true), { code: "control_disabled" });
});

test("Modbus relay switches coils and reads them back (FC 05 + FC 01)", async () => {
  const fake = fakeModbus();
  const device = sd.createPowerDevice({ id: "relay", kind: "modbus", outlets, transport: fake.exchange, enabled: true, isTransmitting: () => false });
  const result = await device.set("rotor", true);
  assert.equal(result.verified, true);
  assert.deepEqual(fake.frames[0], hex("00 01 00 00 00 06 01 05 00 02 FF 00"));
  assert.deepEqual(fake.frames[1], hex("00 02 00 00 00 06 01 01 00 00 00 08"));
  await assert.rejects(device.cycle("rotor"), { code: "cycle_unsupported" });
  const failing = sd.createPowerDevice({ id: "bad", kind: "modbus", outlets, transport: async () => hex("00 01 00 00 00 03 01 85 02"), enabled: true, isTransmitting: () => false });
  await assert.rejects(failing.set("rotor", true), { code: "modbus_exception" });
});

test("rotor command strings per controller", () => {
  assert.deepEqual(sd.rotorFrames("dcu1", "move", 90), ["AP1090;", "AM1;"]);
  assert.deepEqual(sd.rotorFrames("rotorez", "move", 5), ["AP1005;", "AM1;"]);
  assert.deepEqual(sd.rotorFrames("rt21", "move", 270.4), ["AP1270;", "AM1;"]);
  assert.equal(sd.rotorFrames("dcu1", "read"), null);
  assert.deepEqual(sd.rotorFrames("rotorez", "read"), ["AI1;"]);
  assert.deepEqual(sd.rotorFrames("rt21", "read"), ["BI1;"]);
  assert.deepEqual(sd.rotorFrames("rt21", "stop"), [";"]);
  assert.deepEqual(sd.rotorFrames("dcu1", "stop"), [";", "AS1;"]);
  assert.throws(() => sd.rotorFrames("rt21", "move", 451), { code: "heading_invalid" });
});

test("heading replies: Rotor-EZ ';xxx', RT-21 'xxx;' and 'xxx.y;'", () => {
  assert.equal(sd.parseHeading(";045"), 45);
  assert.equal(sd.parseHeading("045;"), 45);
  assert.equal(sd.parseHeading("\x01123.4;"), 123.4);
  assert.throws(() => sd.parseHeading("abc"), { code: "rotor_response" });
});

function fakeSerial(reply = "") {
  const written = [];
  return { written, write: async text => { written.push(text); }, read: async () => reply };
}

test("rotor: DCU-1 has no heading read, motion is capped, stop is always allowed", async () => {
  const serial = fakeSerial();
  const timers = { handler: null, set: fn => { timers.handler = fn; return 1; }, clear: () => { timers.handler = null; } };
  const rotor = sd.createSerialRotor({ id: "rotor", protocol: "dcu1", serial, enabled: true, timers });
  const status = await rotor.status();
  assert.equal(status.heading, null);
  assert.equal(status.headingNote, "sin lectura de rumbo");
  assert.ok(!rotor.commands.includes("read"));
  await rotor.move(90);
  assert.deepEqual(serial.written, ["AP1090;", "AM1;"]);
  timers.handler();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(serial.written.slice(2), [";", "AS1;"]);
  const locked = sd.createSerialRotor({ id: "r2", protocol: "rt21", baud: 9600, serial: fakeSerial("123.4;") });
  await assert.rejects(locked.move(10), { code: "control_disabled" });
  assert.deepEqual(await locked.stop(), { stopped: true });
  assert.equal((await locked.status()).heading, 123.4);
  assert.throws(() => sd.createSerialRotor({ id: "r3", protocol: "rotorez", baud: 9600, serial }), /not documented/);
});

test("rotor: unconfirmed stop blocks further motion and limits are enforced", async () => {
  let fail = true;
  const serial = { write: async () => { if (fail) throw new Error("io"); }, read: async () => "" };
  const rotor = sd.createSerialRotor({ id: "r", protocol: "rotorez", serial, enabled: true, max: 360 });
  await assert.rejects(rotor.stop());
  fail = false;
  await assert.rejects(rotor.move(10), { code: "stop_unconfirmed" });
  await rotor.stop();
  await assert.rejects(rotor.move(400), { code: "heading_invalid" });
  await rotor.move(350);
});

test("signal path orders the stages and lists unsupported models as pendiente de fuente", () => {
  const path = sd.buildSignalPath([
    { id: "tr", label: "FTX-1", stage: "radio" },
    { id: "pg", model: "power-genius-xl" },
    { id: "ag", model: "antenna-genius" },
    { id: "ant", label: "Dipole", stage: "antenna" }
  ].map(sd.createListedDevice));
  assert.deepEqual(path.stages.map(item => item.stage), ["radio", "amplifier", "tuner", "switch", "antenna"]);
  assert.equal(path.stages[1].devices[0].control, "pendiente de fuente");
  assert.equal(path.stages[1].devices[0].controllable, false);
  assert.deepEqual(path.missing, ["tuner"]);
});

test("manager: unsupported devices have no commands; rotors stop on safeAll; power stays untouched", async () => {
  const serial = fakeSerial();
  const fake = fakeDli();
  const manager = sd.createStationDevices({ devices: [
    sd.createSerialRotor({ id: "rot", protocol: "rotorez", serial, enabled: true }),
    sd.createPowerDevice({ id: "pdu", kind: "dli", outlets, transport: fake.transport, enabled: true, isTransmitting: () => false }),
    sd.createListedDevice({ id: "tgxl", model: "tuner-genius-xl" })
  ] });
  await assert.rejects(manager.command("tgxl", { command: "set" }), { code: "command_unknown" });
  await assert.rejects(manager.command("nope", { command: "stop" }), { code: "device_unknown" });
  await manager.command("rot", { command: "move", heading: 120 });
  await manager.safeAll();
  assert.equal(serial.written.at(-1), ";");
  assert.equal(fake.requests.length, 0);
  const view = await manager.status();
  assert.equal(JSON.stringify(view).includes("password"), false);
});

test("support matrix has a source and a status for every row", () => {
  for (const row of sd.SUPPORT_MATRIX) assert.ok(row.device && row.link && row.source && ["ok", "partial", sd.PENDING].includes(row.status));
});
