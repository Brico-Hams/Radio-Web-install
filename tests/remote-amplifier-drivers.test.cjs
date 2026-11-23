const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const drivers = require("../station-amplifier-drivers.cjs");
const { createAccessories, loadCatalog } = require("../station-accessories.cjs");

// Scripted transport: every write is passed to handler(frame), which returns the bytes the amplifier answers.
function fakeTransport(handler, idle = null) {
  const writes = [];
  let queue = [];
  return {
    writes,
    closed: false,
    async write(data) {
      const frame = Buffer.from(data);
      writes.push(frame);
      const reply = handler(frame, writes.length);
      if (reply !== null && reply !== undefined) queue.push(Buffer.isBuffer(reply) ? reply : Buffer.from(reply, "latin1"));
    },
    async read() { return queue.length ? queue.shift() : idle ? idle() : Buffer.alloc(0); },
    async flush() { queue = []; },
    async close() { this.closed = true; }
  };
}

const text = frame => frame.toString("latin1");

// ---- Elecraft KPA (Hamlib kpa.c: ';' wake-up, ^ON, ^OP, ^OS, ^SW, ^SF, ^PWF, ^FR)
function kpaAmp(state) {
  return fakeTransport(frame => {
    const command = text(frame);
    if (command === ";") return ";";
    if (command === "^ON;") return `^ON${state.power};`;
    if (command === "^OP;") return `^ON${state.operate};`;
    if (command === "^OS1;") { state.operate = 1; return null; }
    if (command === "^OS0;") { if (!state.stuck) state.operate = 0; return null; }
    if (command === "^SW;") return `^SW${state.swr};`;
    if (command === "^SF;") return `^SF${state.fault};`;
    if (command === "^PWF;") return "^PWF450;";
    return null;
  });
}

test("KPA reads operate, SWR, fault and power with Hamlib kpa.c commands", async () => {
  const state = { power: 1, operate: 1, swr: 13, fault: 0 };
  const driver = drivers.createKpaDriver(kpaAmp(state));
  assert.deepEqual(await driver.read(), { operate: true, swr: 1.3, fault: null, powerW: 450, tempC: null });
  state.fault = 64;
  assert.match((await driver.read()).fault, /Temperature|Unknown/);
  state.power = 0;
  assert.equal((await driver.read()).operate, false);
});

test("KPA standby is read back, never powers the amplifier off, and fails when not confirmed", async () => {
  const state = { power: 1, operate: 1, swr: 10, fault: 0 };
  const transport = kpaAmp(state);
  const driver = drivers.createKpaDriver(transport);
  await driver.setOperate(false);
  assert.equal(state.operate, 0);
  state.operate = 1;
  state.stuck = true;
  await assert.rejects(driver.setOperate(false), /not confirmed/);
  assert.ok(!transport.writes.some(frame => text(frame).startsWith("^ON0")));
  assert.ok(!transport.writes.some(frame => text(frame).startsWith("^OS1")));
});

test("KPA band follow sends ^FR in kHz and a timeout is an error", async () => {
  const transport = kpaAmp({ power: 1, operate: 0 });
  const driver = drivers.createKpaDriver(transport);
  await driver.setBand("20m", 14074000);
  assert.ok(transport.writes.some(frame => text(frame) === "^FR14074;"));
  await assert.rejects(drivers.createKpaDriver(fakeTransport(() => null), { readTimeoutMs: 5 }).read(), /timeout/);
});

// ---- Expert / SPE (macexpert-spe SPEProtocol.swift example; SPE server.py request frames)
function expertStatus({ operate = false, swr = "1.1", warning = "N", alarm = "N", power = "  0" } = {}) {
  const data = Buffer.from(`,20K,${operate ? "O" : "S"},R,x,1,00,1a,0r,L,${power}, 0.00, ${swr}, 0.0, 0.0, 33,  0,  0,${warning},${alarm},  `, "latin1");
  assert.equal(data.length, 67);
  const sum = data.reduce((total, value) => total + value, 0) & 0xffff;
  return Buffer.concat([Buffer.from([0xaa, 0xaa, 0xaa, 0x43]), data, Buffer.from([sum & 0xff, sum >> 8, 0x2c, 0x0d, 0x0a])]);
}

function expertAmp(state) {
  const toggles = [];
  const transport = fakeTransport(frame => {
    if (frame.equals(Buffer.from([0x55, 0x55, 0x55, 0x01, 0x90, 0x90]))) return expertStatus(state);
    if (frame.equals(Buffer.from([0x55, 0x55, 0x55, 0x01, 0x0d, 0x0d]))) {
      toggles.push(true);
      if (!state.stuck) state.operate = !state.operate;
      return Buffer.from([0xaa, 0xaa, 0xaa, 0x01, 0x0d, 0x0d]);
    }
    return null;
  });
  return { transport, toggles };
}

test("Expert frames match the SPE server requests and the status parses", () => {
  assert.deepEqual([...drivers.buildExpertFrame([0x90])], [0x55, 0x55, 0x55, 0x01, 0x90, 0x90]);
  assert.deepEqual([...drivers.buildExpertFrame([0x0d])], [0x55, 0x55, 0x55, 0x01, 0x0d, 0x0d]);
  const status = drivers.parseExpertStatus(expertStatus({ operate: true, swr: "1.5", alarm: "S" }));
  assert.equal(status.operate, true);
  assert.equal(status.swr, 1.5);
  assert.equal(status.tempC, 33);
  assert.ok(status.fault);
  assert.equal(drivers.parseExpertStatus(expertStatus().subarray(0, 30)), null);
  const bad = expertStatus();
  bad[10] ^= 0xff;
  assert.throws(() => drivers.parseExpertStatus(bad), /checksum/);
});

test("Expert OPERATE toggles once only after a status read and standby is confirmed", async () => {
  const state = { operate: false };
  const { transport, toggles } = expertAmp(state);
  const driver = drivers.createExpertDriver(transport);
  await driver.setOperate(false);
  assert.equal(toggles.length, 0);
  await driver.setOperate(true);
  assert.equal(state.operate, true);
  assert.equal(toggles.length, 1);
  await driver.setOperate(true);
  assert.equal(toggles.length, 1);
  await driver.setOperate(false);
  assert.equal(state.operate, false);
  assert.equal(toggles.length, 2);
  state.operate = true;
  state.stuck = true;
  await assert.rejects(driver.setOperate(false), /not confirmed/);
  assert.equal(toggles.length, 3);
});

// ---- ACOM (ACOM-Controller MainWindow.xaml.cs)
function acomFrame({ nibble = 6, error = 0xff, swr100 = 120, power = 500, temp = 282 + 40, band = 5 } = {}) {
  const frame = Buffer.alloc(72);
  frame[0] = 0x55;
  frame[1] = 0x2f;
  frame[3] = nibble << 4;
  frame.writeUInt16LE(temp, 16);
  frame.writeUInt16LE(25, 20);
  frame.writeUInt16LE(power, 22);
  frame.writeUInt16LE(3, 24);
  frame.writeUInt16LE(swr100, 26);
  frame[66] = error;
  frame[69] = band;
  frame[71] = (256 - (frame.subarray(0, 71).reduce((sum, value) => sum + value, 0) & 0xff)) & 0xff;
  return frame;
}

function acomAmp(state) {
  return fakeTransport(frame => {
    if (frame.equals(Buffer.from([0x55, 0x81, 0x08, 0x02, 0x00, 0x06, 0x00, 0x1a]))) state.nibble = 6;
    if (frame.equals(Buffer.from([0x55, 0x81, 0x08, 0x02, 0x00, 0x05, 0x00, 0x1b])) && !state.stuck) state.nibble = 5;
    return null;
  }, () => acomFrame(state));
}

test("ACOM telemetry parses temperature, power, SWR, band and error code", () => {
  const status = drivers.parseAcomTelemetry(acomFrame({ error: 0x24 }), "700S");
  assert.equal(status.operate, true);
  assert.equal(status.tempC, 40);
  assert.equal(status.powerW, 500);
  assert.equal(status.swr, 1.2);
  assert.equal(status.band, "20m");
  assert.match(status.fault, /Excessive PAM current/);
  assert.equal(drivers.parseAcomTelemetry(acomFrame(), "700S").fault, null);
  assert.equal(drivers.parseAcomTelemetry(acomFrame({ nibble: 5 }), "700S").operate, false);
  assert.equal(drivers.parseAcomTelemetry(acomFrame({ nibble: 10 }), "700S").tempC, null);
  assert.equal(drivers.parseAcomTelemetry(acomFrame({ nibble: 5 }), "500S").tempC, null);
  const corrupt = acomFrame();
  corrupt[30] ^= 1;
  assert.equal(drivers.parseAcomTelemetry(corrupt, "700S"), null);
  assert.throws(() => drivers.parseAcomTelemetry(acomFrame(), "1000"), /unknown ACOM model/);
});

test("ACOM sends the documented frames and confirms standby from telemetry", async () => {
  const state = { nibble: 5 };
  const transport = acomAmp(state);
  const driver = drivers.createAcomDriver(transport, { model: "700S" });
  await driver.setOperate(true);
  assert.equal(state.nibble, 6);
  await driver.setOperate(false);
  assert.equal(state.nibble, 5);
  assert.ok(transport.writes.some(frame => frame.equals(Buffer.from([0x55, 0x81, 0x08, 0x02, 0x00, 0x05, 0x00, 0x1b]))));
  state.nibble = 6;
  state.stuck = true;
  await assert.rejects(driver.setOperate(false), /not confirmed/);
  await driver.close();
  assert.ok(transport.closed);
  assert.deepEqual([...transport.writes.at(-1)], [0x55, 0x91, 0x04, 0x16]);
});

// ---- Gemini (Hamlib gemini.c: S status, R / R0 / R1 operate)
function geminiAmp(state) {
  return fakeTransport(frame => {
    const command = text(frame);
    if (command === "S\n") return `BAND=14.2M,ANTENNA=1,POWER=300W450,VSWR=${state.swr},CURRENT=12.5,TEMPERATURE=41,STATE=ON,PTT=RX,TRIP=${state.trip}\n`;
    if (command === "R\n") return `${state.operate}\n`;
    if (command === "R1\n") state.operate = 1;
    if (command === "R0\n" && !state.stuck) state.operate = 0;
    return null;
  });
}

test("Gemini status, operate readback and TRIP fault", async () => {
  const state = { swr: "1.4", trip: "NONE", operate: 1 };
  const driver = drivers.createGeminiDriver(geminiAmp(state));
  const reading = await driver.read();
  assert.equal(reading.operate, true);
  assert.equal(reading.swr, 1.4);
  assert.equal(reading.powerW, 450);
  assert.equal(reading.fault, null);
  state.trip = "SWR";
  assert.equal((await driver.read()).fault, "TRIP SWR");
  await driver.setOperate(false);
  assert.equal(state.operate, 0);
  state.operate = 1;
  state.stuck = true;
  await assert.rejects(driver.setOperate(false), /not confirmed/);
  assert.throws(() => drivers.parseGeminiStatus("garbage"), /no status items/);
});

// ---- Safety layer with the real drivers
function catalogWith(deviceId) {
  return loadCatalog().devices.find(device => device.id === deviceId);
}

function withDriver(driver, deviceId, extra = {}) {
  let time = 1000;
  const accessories = createAccessories({
    now: () => time, amplifier: driver,
    config: { amplifier: { device: deviceId, operateAllowed: true } }, ...extra
  });
  return { accessories, advance: ms => { time += ms; } };
}

test("operate needs an explicit action and config; default is STANDBY", async () => {
  const state = { nibble: 5 };
  const { accessories } = withDriver(drivers.createAcomDriver(acomAmp(state)), "acom-amplifiers");
  assert.equal(accessories.snapshot().amplifier.state, "standby");
  assert.equal(state.nibble, 5);
  const denied = createAccessories({ amplifier: drivers.createAcomDriver(acomAmp(state)), config: { amplifier: { device: "acom-amplifiers", operateAllowed: false } } });
  assert.equal((await denied.operate({})).ok, false);
  assert.equal(state.nibble, 5);
  assert.equal((await accessories.operate({})).reason, "band_unknown");
  await accessories.followBand(14074000, {});
  assert.equal((await accessories.operate({})).ok, true);
});

test("fault, SWR, emergency stop and lease loss send STANDBY through a real driver", async () => {
  for (const trigger of ["fault", "swr", "emergency", "lease"]) {
    const state = { nibble: 5, error: 0xff, swr100: 120 };
    const { accessories } = withDriver(drivers.createAcomDriver(acomAmp(state)), "acom-amplifiers");
    await accessories.followBand(14074000, {});
    assert.equal((await accessories.operate({})).ok, true, trigger);
    if (trigger === "fault") { state.error = 0x24; await accessories.poll(); }
    if (trigger === "swr") { state.swr100 = 450; await accessories.poll(); }
    if (trigger === "emergency") await accessories.emergencyStop("test");
    if (trigger === "lease") await accessories.standby("lease_lost");
    assert.equal(state.nibble, 5, trigger);
    assert.equal(accessories.snapshot().amplifier.state, trigger === "fault" ? "fault" : "standby", trigger);
  }
});

test("a poll that finds the amplifier left OPERATE on its own follows it to standby", async () => {
  const state = { nibble: 5 };
  const { accessories } = withDriver(drivers.createAcomDriver(acomAmp(state)), "acom-amplifiers");
  await accessories.operate({});
  state.nibble = 5;
  await accessories.poll();
  assert.equal(accessories.snapshot().amplifier.state, "standby");
});

test("polls never overlap and respect pollIntervalMs", async () => {
  let reads = 0;
  let release;
  const slow = { async setOperate() {}, read() { reads += 1; return new Promise(resolve => { release = () => resolve({ operate: false }); }); } };
  const { accessories, advance } = withDriver(slow, "acom-amplifiers", { pollIntervalMs: 1000 });
  const first = accessories.poll();
  await accessories.poll();
  assert.equal(reads, 1);
  release();
  await first;
  await accessories.poll();
  assert.equal(reads, 1);
  advance(1000);
  const next = accessories.poll();
  release();
  await next;
  assert.equal(reads, 2);
});

test("drivers without setBand do not break band follow", async () => {
  const { accessories } = withDriver(drivers.createAcomDriver(acomAmp({ nibble: 5 })), "acom-amplifiers");
  assert.equal((await accessories.followBand(14074000, {})).ok, true);
});

test("every enabled amplifier catalog entry maps to a registered driver and is marked untested", () => {
  for (const id of ["elecraft-kpa1500", "expert-fa", "acom-amplifiers", "gemini-dx1200-hf1k"]) {
    const device = catalogWith(id);
    assert.ok(drivers.DRIVER_FACTORIES[device.driver], id);
    assert.equal(device.verification, "source-implemented, not hardware-tested");
    assert.match(device.source, /data\/third-party\/refs/);
  }
  assert.equal(catalogWith("elecraft-kpa500").driver, null);
  assert.throws(() => drivers.createAmplifierDriver("nope", fakeTransport(() => null)), /no amplifier driver/);
});

// ---- TCP transport with a fake net module (no sockets)
function fakeNet() {
  const sockets = [];
  return {
    sockets,
    connect(options) {
      const socket = new EventEmitter();
      socket.options = options;
      socket.written = [];
      socket.destroyed = false;
      socket.write = (data, callback) => { socket.written.push(Buffer.from(data)); callback?.(); };
      socket.destroy = () => { socket.destroyed = true; socket.emit("close"); };
      sockets.push(socket);
      setImmediate(() => socket.emit("connect"));
      return socket;
    }
  };
}

test("the TCP transport connects lazily, round-trips bytes and times out silently", async () => {
  const net = fakeNet();
  const transport = drivers.createTcpTransport({ host: "192.168.1.50", port: 4001 }, net);
  assert.equal(net.sockets.length, 0);
  await transport.write(Buffer.from("S\n"));
  assert.equal(net.sockets.length, 1);
  assert.deepEqual(net.sockets[0].options, { host: "192.168.1.50", port: 4001 });
  assert.equal(text(net.sockets[0].written[0]), "S\n");
  const reading = transport.read(1000);
  net.sockets[0].emit("data", Buffer.from("0\n"));
  assert.equal(text(await reading), "0\n");
  assert.equal((await transport.read(5)).length, 0);
  await transport.close();
  assert.ok(net.sockets[0].destroyed);
  assert.throws(() => drivers.createTcpTransport({ host: "bad host", port: 1 }, net), /host/);
  assert.throws(() => drivers.createTcpTransport({ host: "h", port: 0 }, net), /port/);
});
