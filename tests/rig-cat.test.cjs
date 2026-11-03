"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
require("../transports.js");

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Simulated radio behind a fake Web Serial port.
class FakeRig {
  constructor({ digits = 9, frequency = 439300000, id = "ID0840;", dropReplies = 0, prefix = "" } = {}) {
    Object.assign(this, { digits, frequency, id, dropReplies, prefix, received: [] });
  }
  handle(command) {
    this.received.push(command);
    if (this.dropReplies > 0) { this.dropReplies--; return null; }
    if (command === "ID;") return this.id;
    if (command === "FA;") return `FA${String(this.frequency).padStart(this.digits, "0")};`;
    const set = new RegExp(`^FA(\\d{${this.digits}});$`).exec(command);
    if (set) { this.frequency = Number(set[1]); return null; }
    return "?;";
  }
}
function fakePort(rig, info = { usbVendorId: 0x10c4, usbProductId: 0xea70 }) {
  const chunks = [];
  let wake = null;
  let closed = false;
  const port = {
    info, signals: [], openArgs: null, openCount: 0, rig,
    getInfo: () => info,
    async open(options) { this.openArgs = options; this.openCount++; closed = false; },
    async setSignals(value) { this.signals.push(value); },
    async close() { closed = true; if (wake) { const w = wake; wake = null; w({ done: true, value: undefined }); } },
    push(text) {
      const value = new TextEncoder().encode(text);
      if (wake) { const w = wake; wake = null; w({ done: false, value }); } else chunks.push(value);
    },
    readable: { getReader: () => ({
      read: () => chunks.length ? Promise.resolve({ done: false, value: chunks.shift() }) :
        closed ? Promise.resolve({ done: true, value: undefined }) : new Promise(resolve => { wake = resolve; }),
      async cancel() { closed = true; if (wake) { const w = wake; wake = null; w({ done: true, value: undefined }); } },
      releaseLock() {}
    }) },
    writable: { getWriter: () => ({
      async write(data) {
        for (const part of Buffer.from(data).toString("latin1").split(";").filter(Boolean)) {
          const answer = port.rig.handle(`${part};`);
          if (answer !== null) setImmediate(() => port.push(answer));
        }
      },
      releaseLock() {}
    }) }
  };
  return port;
}
function fakeApi(ports) {
  const listeners = new Map();
  return {
    ports,
    async getPorts() { return this.ports; },
    async requestPort() { return this.ports[0]; },
    addEventListener(type, listener) { listeners.set(type, [...(listeners.get(type) || []), listener]); },
    removeEventListener(type, listener) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener)); },
    dispatch(type, event) { for (const listener of listeners.get(type) || []) listener(event); }
  };
}
const fast = { timeoutMs: 60, writeTimeoutMs: 200, settleMs: 0, retries: 2 };

test("FTX-1: abre a 38400 con DTR/RTS bajos una sola vez, identifica y usa FA de 9 digitos", async () => {
  const port = fakePort(new FakeRig());
  const api = fakeApi([port]);
  const link = new R.RigCatLink("ftx1", { api, sessionOptions: fast });
  assert.equal(link.baud, 38400);
  await link.connect(port);
  assert.equal(port.openArgs.baudRate, 38400);
  assert.deepEqual(port.signals, [{ dataTerminalReady: false, requestToSend: false }]);
  assert.equal(await link.getFrequency("A"), 439300000);
  assert.equal(await link.setFrequency("A", 145500000), 145500000);
  assert.ok(port.rig.received.includes("FA145500000;"));
  assert.equal(port.signals.length, 1);
  await link.close();
});

test("QMX y truSDX usan FA de 11 digitos y truSDX arranca a 38400 configurable", async () => {
  assert.equal(R.rigFrequencyCommand(R.RIG_PROFILES.qmx, "A", 14074000), "FA00014074000;");
  assert.equal(R.rigFrequencyCommand(R.RIG_PROFILES.trusdx, "B", 7074000), "FB00007074000;");
  assert.equal(R.rigFrequencyCommand(R.RIG_PROFILES.ftx1, "A", 439300000), "FA439300000;");
  assert.equal(R.parseRigFrequency(R.RIG_PROFILES.ftx1, "FA439300000;"), 439300000);
  assert.throws(() => R.parseRigFrequency(R.RIG_PROFILES.ftx1, "FA00439300000;"), /invalida/);
  assert.throws(() => R.parseRigFrequency(R.RIG_PROFILES.qmx, "FA439300000;"), /invalida/);
  assert.throws(() => R.rigFrequencyCommand(R.RIG_PROFILES.ftx1, "A", 10 ** 9), /fuera de rango/);
  assert.equal(R.RIG_PROFILES.trusdx.defaultBaud, 38400);
  for (const id of ["qmx", "trusdx"]) {
    const port = fakePort(new FakeRig({ digits: 11, frequency: 14074000 }), { usbVendorId: 0x1a86, usbProductId: 0x7523 });
    const link = new R.RigCatLink(id, { api: fakeApi([port]), baud: id === "trusdx" ? 115200 : undefined, sessionOptions: fast });
    await link.connect(port);
    assert.equal(port.openArgs.baudRate, id === "trusdx" ? 115200 : 38400);
    assert.equal(await link.setFrequency("A", 7074000), 7074000);
    assert.ok(port.rig.received.includes("FA00007074000;"));
    await link.close();
  }
});

test("las lecturas se reintentan tras respuestas perdidas y se descartan bytes basura", async () => {
  const port = fakePort(new FakeRig());
  const link = new R.RigCatLink("ftx1", { api: fakeApi([port]), sessionOptions: fast });
  await link.connect(port);
  port.rig.dropReplies = 2;
  port.push("\u00ff\u00fe garbage;");
  assert.equal(await link.getFrequency("A"), 439300000);
  assert.equal(port.rig.received.filter(command => command === "FA;").length, 3);
  await link.close();
});

test("un ?; es rechazo inmediato sin reintentos y la cola serializa las ordenes", async () => {
  const port = fakePort(new FakeRig());
  const link = new R.RigCatLink("ftx1", { api: fakeApi([port]), sessionOptions: fast });
  await link.connect(port);
  const session = link.session;
  const before = port.rig.received.length;
  await assert.rejects(session.command("ZZ;", { answer: true, prefix: "ZZ" }), error => error.code === "RIG_REJECTED");
  assert.equal(port.rig.received.length - before, 1);
  port.rig.received.length = 0;
  const results = await Promise.all([session.setFrequency("A", 145500000), session.getFrequency("A"), session.getFrequency("A")]);
  assert.deepEqual(results, [145500000, 145500000, 145500000]);
  assert.equal(port.rig.received[0], "FA145500000;");
  assert.equal(port.rig.received[1], "FA;");
  await link.close();
});

test("un comando sin ';' o sin respuesta falla con error claro y sin colgarse", async () => {
  const port = fakePort(new FakeRig());
  const link = new R.RigCatLink("ftx1", { api: fakeApi([port]), sessionOptions: { ...fast, retries: 1 } });
  await link.connect(port);
  await assert.rejects(link.session.command("FA", { answer: true }), /termina|terminar|valido/);
  port.rig.dropReplies = 10;
  await assert.rejects(link.getFrequency("A"), error => error.code === "RIG_TIMEOUT");
  await link.close();
});

test("el enlace se reconecta solo cuando el puerto desaparece y vuelve", async () => {
  const port = fakePort(new FakeRig());
  const api = fakeApi([port]);
  const states = [];
  const link = new R.RigCatLink("ftx1", { api, reconnectDelayMs: 5, sessionOptions: fast, onState: event => states.push(event.state) });
  await link.connect(port);
  api.dispatch("disconnect", { target: port });
  await wait(1);
  assert.equal(link.state === "lost" || link.state === "reconnecting", true);
  await assert.rejects(link.getFrequency("A"), error => error.code === "RIG_OFFLINE" || error.code === undefined);
  api.dispatch("connect", { target: port });
  for (let i = 0; i < 100 && link.state !== "open"; i++) await wait(5);
  assert.equal(link.state, "open");
  assert.ok(states.includes("lost") && states.filter(state => state === "open").length === 2);
  assert.equal(await link.getFrequency("A"), 439300000);
  assert.equal(port.openCount, 2);
  await link.close();
  assert.equal(link.state, "closed");
});

test("una radio equivocada se rechaza al conectar y libera el puerto", async () => {
  const port = fakePort(new FakeRig({ id: "ID0123;" }));
  const link = new R.RigCatLink("ftx1", { api: fakeApi([port]), sessionOptions: fast });
  await assert.rejects(link.connect(port), /No es un/);
  assert.equal(link.state, "closed");
});
