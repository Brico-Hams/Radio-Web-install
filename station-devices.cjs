"use strict";
// Station devices: power/relay control (Digital Loggers REST, Waveshare Modbus TCP), serial rotor
// controllers (DCU-1, Rotor-EZ, RT-21, GS-232A/B, SPID Rot2Prog) and the signal path view. Every protocol fact is cited in
// remote-station/docs/STATION-DEVICES-SOURCES.md; anything not listed there is "pendiente de fuente".
// Device contract (kept compatible with the station accessories layer): { id, type, status(), commands, safeState() }.
// TX safety: nothing here ever transmits. Switching is default-off, refused while transmitting, and
// rotor STOP is always allowed.

const crypto = require("crypto");
const http = require("http");
const net = require("net");

const PENDING = "pendiente de fuente";
const CRITICAL_ROLES = Object.freeze(["radio", "amp"]);
const MAX_MOTION_MS = 30_000;

class DeviceError extends Error {
  constructor(code, message, status = 400) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

// ---- Digital Loggers REST (https://www.digital-loggers.com/rest.html) ----

function dliRequest(operation, outlet, value) {
  if (!Number.isInteger(outlet) || outlet < 0 || outlet > 7) throw new DeviceError("outlet_invalid", "DLI outlets are zero-based 0-7.");
  const base = `/restapi/relay/outlets/${outlet}`;
  const csrf = { "X-CSRF": "x" };
  switch (operation) {
    case "set": return { method: "PUT", path: `${base}/transient_state/`, headers: { ...csrf, "Content-Type": "application/x-www-form-urlencoded" }, body: `value=${value ? "true" : "false"}` };
    case "cycle": return { method: "POST", path: `${base}/cycle/`, headers: { ...csrf }, body: "" };
    case "read": return { method: "GET", path: `${base}/physical_state/`, headers: { Accept: "application/json" }, body: "" };
    default: throw new DeviceError("operation_invalid", "Unknown DLI operation.");
  }
}

function md5(text) { return crypto.createHash("md5").update(text).digest("hex"); }

// RFC 2617 digest (qop=auth, MD5). The password only lives in the agent process.
function digestAuthorization({ username, password, method, uri, challenge, nc = "00000001", cnonce }) {
  const field = name => new RegExp(`${name}="([^"]*)"`, "i").exec(challenge)?.[1];
  const realm = field("realm");
  const nonce = field("nonce");
  if (!realm || !nonce) throw new DeviceError("digest_challenge_invalid", "Unsupported digest challenge.");
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
  const opaque = field("opaque");
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", response="${response}"${opaque ? `, opaque="${opaque}"` : ""}`;
}

function httpTransport({ host, port = 80, username, password, timeoutMs = 3000 }) {
  function once(request, authorization) {
    return new Promise((resolve, reject) => {
      const headers = { ...request.headers, ...(authorization ? { Authorization: authorization } : {}) };
      if (request.body) headers["Content-Length"] = Buffer.byteLength(request.body);
      const req = http.request({ host, port, method: request.method, path: request.path, headers, timeout: timeoutMs }, res => {
        const chunks = [];
        res.on("data", chunk => { if (chunks.length < 64) chunks.push(chunk); });
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      });
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
      req.end(request.body || undefined);
    });
  }
  return async request => {
    const first = await once(request);
    if (first.status !== 401 || !/^digest/i.test(first.headers["www-authenticate"] || "")) return first;
    const authorization = digestAuthorization({ username, password, method: request.method, uri: request.path, challenge: first.headers["www-authenticate"], cnonce: crypto.randomBytes(8).toString("hex") });
    return once(request, authorization);
  };
}

// ---- Waveshare Modbus POE ETH Relay (https://www.waveshare.com/wiki/Modbus_POE_ETH_Relay) ----
// FC 01/05/0F PDU layouts: Modbus Application Protocol V1.1b3 (modbus.org).

const MODBUS = Object.freeze({ port: 502, unit: 1, coils: 8, on: 0xff00, off: 0x0000, toggle: 0x5500 });

function mbap(transaction, unit, pdu) {
  const frame = Buffer.alloc(7 + pdu.length);
  frame.writeUInt16BE(transaction & 0xffff, 0);
  frame.writeUInt16BE(0, 2);
  frame.writeUInt16BE(pdu.length + 1, 4);
  frame[6] = unit;
  pdu.copy(frame, 7);
  return frame;
}

function checkCoil(coil) {
  if (!Number.isInteger(coil) || coil < 0 || coil >= MODBUS.coils) throw new DeviceError("outlet_invalid", "Relay coils are 0x0000-0x0007.");
}

function modbusReadCoils(transaction, unit, start, quantity) {
  checkCoil(start);
  if (!Number.isInteger(quantity) || quantity < 1 || start + quantity > MODBUS.coils) throw new DeviceError("outlet_invalid", "Invalid coil count.");
  return mbap(transaction, unit, Buffer.from([0x01, 0, start, 0, quantity]));
}

function modbusWriteCoil(transaction, unit, coil, on) {
  checkCoil(coil);
  const pdu =   Buffer.from([0x05, 0, coil, 0, 0]);
  pdu.writeUInt16BE(on ? MODBUS.on : MODBUS.off, 3);
  return mbap(transaction, unit, pdu);
}

function modbusWriteCoils(transaction, unit, start, states) {
  checkCoil(start);
  if (!states.length || start + states.length > MODBUS.coils) throw new DeviceError("outlet_invalid", "Invalid coil count.");
  let bits = 0;
  states.forEach((state, index) => { if (state) bits |= 1 << index; });
  return mbap(transaction, unit, Buffer.from([0x0f, 0, start, 0, states.length, 1, bits]));
}

// Returns the PDU bytes. An exception reply is function code + 0x80 followed by the exception code.
function parseModbusResponse(frame, { transaction, unit, functionCode }) {
  if (!Buffer.isBuffer(frame) || frame.length < 9) throw new DeviceError("modbus_short", "Short Modbus reply.", 502);
  if (frame.readUInt16BE(0) !== (transaction & 0xffff) || frame.readUInt16BE(2) !== 0 || frame.readUInt16BE(4) !== frame.length - 6 || frame[6] !== unit) {
    throw new DeviceError("modbus_mismatch", "Modbus reply does not match the request.", 502);
  }
  const pdu = frame.subarray(7);
  if (pdu[0] === (functionCode | 0x80)) throw new DeviceError("modbus_exception", `Modbus exception 0x${(pdu[1] ?? 0).toString(16).padStart(2, "0")}.`, 502);
  if (pdu[0] !== functionCode) throw new DeviceError("modbus_mismatch", "Unexpected Modbus function.", 502);
  return pdu;
}

function tcpExchange({ host, port = MODBUS.port, timeoutMs = 3000 }) {
  return frame => new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const chunks = [];
    let size = 0;
    const done = (error, value) => { socket.destroy(); error ? reject(error) : resolve(value); };
    socket.setTimeout(timeoutMs, () => done(new Error("timeout")));
    socket.on("error", done);
    socket.on("connect", () => socket.write(frame));
    socket.on("data", chunk => {
      chunks.push(chunk);
      size += chunk.length;
      const all = Buffer.concat(chunks);
      if (size >= 6 && size >= 6 + all.readUInt16BE(4)) done(null, all);
    });
  });
}

// ---- Power / relay devices ----

function checkOutlets(outlets, max) {
  if (!Array.isArray(outlets) || !outlets.length) throw new Error("At least one named outlet is required.");
  const names = new Set();
  for (const outlet of outlets) {
    if (!/^[a-z0-9_-]{1,32}$/.test(outlet.name) || names.has(outlet.name)) throw new Error("Outlet names must be unique lowercase labels.");
    if (!Number.isInteger(outlet.index) || outlet.index < 0 || outlet.index > max) throw new Error("Outlet index out of range.");
    names.add(outlet.name);
  }
}

// kind: "dli" (transport = async request -> {status, body}) or "modbus" (transport = async frame -> Buffer).
function createPowerDevice({ id, kind, label = id, outlets, transport, enabled = false, isTransmitting, unit = MODBUS.unit }) {
  if (!["dli", "modbus"].includes(kind)) throw new Error("Unknown power device kind.");
  checkOutlets(outlets, 7);
  let transaction = 0;
  const byName = name => {
    const outlet = outlets.find(item => item.name === name);
    if (!outlet) throw new DeviceError("outlet_unknown", "Unknown outlet.", 404);
    return outlet;
  };
  const nextTransaction = () => (transaction = (transaction + 1) & 0xffff);

  async function dli(operation, outlet, value) {
    const request = dliRequest(operation, outlet, value);
    const reply = await transport(request);
    if (reply.status < 200 || reply.status >= 300) throw new DeviceError("dli_http", `DLI HTTP ${reply.status}.`, 502);
    return reply.body;
  }

  async function readAll() {
    if (kind === "dli") {
      const states = {};
      for (const outlet of outlets) {
        let parsed;
        try { parsed = JSON.parse(await dli("read", outlet.index)); } catch (error) { if (error instanceof DeviceError) throw error; parsed = null; }
        if (typeof parsed !== "boolean") throw new DeviceError("dli_response", "Unexpected DLI state reply.", 502);
        states[outlet.name] = parsed;
      }
      return states;
    }
    const tid = nextTransaction();
    const pdu = parseModbusResponse(await transport(modbusReadCoils(tid, unit, 0, MODBUS.coils)), { transaction: tid, unit, functionCode: 0x01 });
    if (pdu[1] !== 1 || pdu.length < 3) throw new DeviceError("modbus_mismatch", "Unexpected coil reply.", 502);
    return Object.fromEntries(outlets.map(outlet => [outlet.name, Boolean((pdu[2] >> outlet.index) & 1)]));
  }

  function guard(outlet, { off, confirm }) {
    if (!enabled) throw new DeviceError("control_disabled", "Switching is disabled in the agent configuration.", 403);
    const critical = CRITICAL_ROLES.includes(outlet.role);
    if (critical && (typeof isTransmitting !== "function" || isTransmitting() !== false)) {
      throw new DeviceError("transmitting", "The radio/amplifier outlet cannot be switched while transmitting.", 409);
    }
    if (critical && off && confirm !== true) throw new DeviceError("confirm_required", "Confirm powering off or cycling the radio or amplifier outlet.", 409);
  }

  async function set(name, on, { confirm = false } = {}) {
    const outlet = byName(name);
    guard(outlet, { off: !on, confirm });
    if (kind === "dli") await dli("set", outlet.index, on);
    else {
      const tid = nextTransaction();
      parseModbusResponse(await transport(modbusWriteCoil(tid, unit, outlet.index, on)), { transaction: tid, unit, functionCode: 0x05 });
    }
    const physical = (await readAll())[name];
    return { outlet: name, requested: Boolean(on), physical, verified: physical === Boolean(on) };
  }

  async function cycle(name, { confirm = false } = {}) {
    if (kind !== "dli") throw new DeviceError("cycle_unsupported", `Relay cycle on this device is ${PENDING}.`, 501);
    const outlet = byName(name);
    guard(outlet, { off: true, confirm });
    await dli("cycle", outlet.index);
    return { outlet: name, physical: (await readAll())[name] };
  }

  return {
    id,
    type: "power",
    kind,
    label,
    commands: kind === "dli" ? ["set", "cycle", "read"] : ["set", "read"],
    controlEnabled: enabled,
    outlets: outlets.map(({ name, index, role }) => ({ name, index, role: role || "other" })),
    async status() {
      try { return { id, type: "power", online: true, controlEnabled: enabled, outlets: await readAll() }; }
      catch (error) { return { id, type: "power", online: false, controlEnabled: enabled, error: error.code || "transport" }; }
    },
    set,
    cycle,
    // Cutting power is never a safe state, so a disconnect leaves every outlet exactly as it is.
    async safeState() { return { action: "none" }; }
  };
}

// ---- Serial rotor controllers ----
// Sources: Hamlib rotorez.txt/rotorez.c and the Green Heron RT-21 manual, Appendix F.
// GS-232A/B and SPID Rot2Prog follow Hamlib rotators/gs232a/gs232a.c, gs232b.c and rotators/spid/spid.c,
// spid.txt (LGPL-2.1-or-later, Stephane Fillod / Norvald H. Ryeng), see docs/THIRD-PARTY-REUSE.md.
// Frames are latin-1 strings so the binary SPID bytes survive text I/O.

const GS232_BAUDS = [150, 300, 600, 1200, 2400, 4800, 9600]; // Hamlib serial_rate_min/max 150..9600
const GS232B_BAUDS = [1200, 2400, 4800, 9600]; // Hamlib gs232b serial_rate_min/max 1200..9600
const SPID_PULSES = [1, 2, 4]; // spid.txt: 1, 0.5 and 0.25 deg/pulse
const SPID_STOP = `W${"\x00".repeat(10)}\x0f `;
const SPID_STATUS = `W${"\x00".repeat(10)}\x1f `;

// defaultBaud null: the operator must choose a documented baud explicitly.
const ROTOR_PROTOCOLS = Object.freeze({
  dcu1: { label: "Hy-Gain DCU-1 / DCU-1X", bauds: [4800], defaultBaud: 4800, headingRead: false },
  rotorez: { label: "Idiom Press Rotor-EZ / RotorCard", bauds: [4800], defaultBaud: 4800, headingRead: true },
  rt21: { label: "Green Heron RT-21", bauds: [4800, 9600], defaultBaud: 4800, headingRead: true },
  gs232a: { label: "Yaesu GS-232A", bauds: GS232_BAUDS, defaultBaud: null, headingRead: true, elevation: true, replyEnd: "\n" },
  gs232b: { label: "Yaesu GS-232B", bauds: GS232B_BAUDS, defaultBaud: null, headingRead: true, elevation: true, replyEnd: "\n" },
  rot2prog: { label: "SPID Rot2Prog", bauds: [600], defaultBaud: 600, headingRead: true, elevation: true, replyLength: 12 }
});

function headingDigits(degrees) {
  if (!Number.isFinite(degrees) || degrees < 0 || degrees > 450) throw new DeviceError("heading_invalid", "Heading out of range.");
  return String(Math.round(degrees)).padStart(3, "0");
}

// pulses = { az, el } pulses per degree, required by Rot2Prog moves (sensed with a status read).
function rotorFrames(protocol, operation, degrees, elevation = 0, pulses = null) {
  if (!ROTOR_PROTOCOLS[protocol]) throw new DeviceError("protocol_unknown", "Unknown rotor protocol.");
  const spec = ROTOR_PROTOCOLS[protocol];
  switch (operation) {
    case "move": {
      const azimuth = headingDigits(degrees);
      if (!spec.elevation) return [`AP1${azimuth};`, "AM1;"];
      if (!Number.isFinite(elevation)) throw new DeviceError("heading_invalid", "Elevation out of range.");
      if (protocol === "rot2prog") {
        if (elevation < -20 || elevation > 210) throw new DeviceError("heading_invalid", "Elevation out of range."); // Hamlib Rot2Prog min_el/max_el
        if (!pulses || !SPID_PULSES.includes(pulses.az) || !SPID_PULSES.includes(pulses.el)) throw new DeviceError("rotor_resolution_unknown", "Rot2Prog resolution is unknown.", 502);
        const h = Math.round(pulses.az * (360 + degrees));
        const v = Math.round(pulses.el * (360 + elevation));
        if (h < 0 || h > 9999 || v < 0 || v > 9999) throw new DeviceError("heading_invalid", "Position out of range.");
        return [`W${String(h).padStart(4, "0")}${String.fromCharCode(pulses.az)}${String(v).padStart(4, "0")}${String.fromCharCode(pulses.el)}/ `];
      }
      if (elevation < 0 || elevation > 180) throw new DeviceError("heading_invalid", "Elevation out of range."); // Hamlib GS-232 max_el
      return [`W${azimuth} ${String(Math.round(elevation)).padStart(3, "0")}\r`];
    }
    case "read":
      if (!spec.headingRead) return null;
      if (protocol === "rot2prog") return [SPID_STATUS];
      if (spec.elevation) return ["C2\r"];
      return [protocol === "rt21" ? "BI1;" : "AI1;"];
    // A bare ';' stops Rotor-EZ and RT-21; for the DCU-1 Hamlib sends AS1; (its README disagrees: verify on hardware).
    case "stop":
      if (protocol === "rot2prog") return [SPID_STOP];
      if (spec.elevation) return ["S\r"];
      return protocol === "dcu1" ? [";", "AS1;"] : [";"];
    default: throw new DeviceError("operation_invalid", "Unknown rotor operation.");
  }
}

// Rotor-EZ replies ";xxx", the RT-21 replies "xxx;" or "xxx.y;" (optionally preceded by SOH).
function parseHeading(reply) {
  const match = /^[\x01;]?(\d{3}(?:\.\d)?);?$/.exec(String(reply).trim());
  if (!match) throw new DeviceError("rotor_response", "Unexpected heading reply.", 502);
  const value = Number(match[1]);
  if (value > 450) throw new DeviceError("rotor_response", "Heading out of range.", 502);
  return value;
}

// Returns { azimuth, elevation, pulses } (pulses only for Rot2Prog).
function parseRotorReply(protocol, reply) {
  const text = String(reply);
  let match = null;
  if (protocol === "gs232a") {
    match = /^\+0(\d{3})\+0(\d{3})$/.exec(text.trim());
    if (match) return { azimuth: Number(match[1]), elevation: Number(match[2]) };
  } else if (protocol === "gs232b") {
    match = /^AZ=(\d{3})(?:\s*EL=(\d{3}))?$/.exec(text.trim()); // some 12PR1A units answer AZ only
    if (match) return { azimuth: Number(match[1]), elevation: Number(match[2] ?? 0) };
  } else if (protocol === "rot2prog") {
    // 12-byte frame: 'W', H1-H4, PH, V1-V4, PV, ' ' (spid.txt); angle = digits - 360.
    if (text.length === 12 && text[0] === "W" && text[11] === " ") {
      const b = [...text].map(char => char.charCodeAt(0));
      const digits = [...b.slice(1, 5), ...b.slice(6, 10)];
      if (digits.every(value => value <= 9) && SPID_PULSES.includes(b[5]) && SPID_PULSES.includes(b[10])) {
        return {
          azimuth: b[1] * 100 + b[2] * 10 + b[3] + b[4] / 10 - 360,
          elevation: b[6] * 100 + b[7] * 10 + b[8] + b[9] / 10 - 360,
          pulses: { az: b[5], el: b[10] }
        };
      }
    }
  } else return { azimuth: parseHeading(text), elevation: 0 };
  throw new DeviceError("rotor_response", "Unexpected position reply.", 502);
}

// serial = { write(text): Promise, read(): Promise<string> (drains stray bytes first when flush is true) }.
function createSerialRotor({ id, label = id, protocol, baud, serial, enabled = false, min = 0, max = 360, elevationMin = 0, elevationMax = 0, maxMotionMs = MAX_MOTION_MS, timers = { set: setTimeout, clear: clearTimeout } }) {
  const spec = ROTOR_PROTOCOLS[protocol];
  if (!spec) throw new Error("Unknown rotor protocol.");
  baud ??= spec.defaultBaud;
  if (baud === null) throw new Error(`Choose a baud explicitly for ${spec.label}.`);
  if (!spec.bauds.includes(baud)) throw new Error(`Baud ${baud} is not documented for ${spec.label}.`);
  let timer = null;
  let stopFailed = false;
  let moving = false;

  async function stop() {
    if (timer) { timers.clear(timer); timer = null; }
    moving = false;
    stopFailed = true;
    for (const frame of rotorFrames(protocol, "stop")) await serial.write(frame);
    stopFailed = false;
    return { stopped: true };
  }

  async function readReply() {
    await serial.flush?.();
    await serial.write(rotorFrames(protocol, "read")[0]);
    return parseRotorReply(protocol, await serial.read());
  }

  return {
    id,
    type: "rotor",
    label,
    protocol,
    baud,
    commands: ["move", "stop", ...(spec.headingRead ? ["read"] : [])],
    controlEnabled: enabled,
    async status() {
      const base = { id, type: "rotor", protocol, baud, controlEnabled: enabled, moving, stopFailed, limits: { min, max } };
      if (!spec.headingRead) return { ...base, heading: null, headingNote: "sin lectura de rumbo" };
      try {
        const reading = await readReply();
        return spec.elevation ? { ...base, heading: reading.azimuth, elevation: reading.elevation } : { ...base, heading: reading.azimuth };
      } catch (error) { return { ...base, heading: null, error: error.code || "transport" }; }
    },
    async move(degrees, elevation = 0) {
      if (!enabled) throw new DeviceError("control_disabled", "Rotor motion is disabled in the agent configuration.", 403);
      if (stopFailed) throw new DeviceError("stop_unconfirmed", "The last stop was not confirmed.", 409);
      if (!Number.isFinite(degrees) || degrees < min || degrees > max) throw new DeviceError("heading_invalid", "Heading outside the configured limits.");
      if (!Number.isFinite(elevation) || elevation < (spec.elevation ? elevationMin : 0) || elevation > (spec.elevation ? elevationMax : 0)) throw new DeviceError("heading_invalid", "Elevation outside the configured limits.");
      const pulses = protocol === "rot2prog" ? (await readReply()).pulses : null;
      for (const frame of rotorFrames(protocol, "move", degrees, elevation, pulses)) await serial.write(frame);
      moving = true;
      if (timer) timers.clear(timer);
      timer = timers.set(() => { stop().catch(() => {}); }, maxMotionMs);
      timer?.unref?.();
      return { accepted: Math.round(degrees), maxMotionSeconds: maxMotionMs / 1000 };
    },
    // Stop is always allowed: no enabled flag, operator lock or confirmation applies.
    stop,
    safeState: stop
  };
}

// ---- Signal path (radio -> amplifier -> tuner -> switch -> antenna) ----

const STAGES = Object.freeze(["radio", "amplifier", "tuner", "switch", "antenna"]);

// No public protocol was found for these: listed, never controlled.
const PENDING_DEVICES = Object.freeze([
  { model: "antenna-genius", label: "4O3A Antenna Genius", stage: "switch" },
  { model: "tuner-genius-xl", label: "4O3A Tuner Genius XL", stage: "tuner" },
  { model: "power-genius-xl", label: "4O3A Power Genius XL", stage: "amplifier" },
  { model: "iboot-pdu", label: "Dataprobe iBoot-PDU", stage: "power" },
  { model: "alpha-87a", label: "Alpha 87A", stage: "amplifier" },
  { model: "om2000a-plus", label: "OM Power OM2000A+", stage: "amplifier" }
]);

function buildSignalPath(devices = []) {
  const stages = STAGES.map(stage => ({ stage, devices: [] }));
  for (const device of devices) {
    const target = stages.find(item => item.stage === device.stage);
    if (!target) continue;
    const pending = PENDING_DEVICES.some(item => item.model === device.model);
    target.devices.push({ id: device.id, label: device.label || device.id, model: device.model || null, control: pending ? PENDING : "configured", controllable: !pending });
  }
  return { stages, missing: stages.filter(item => !item.devices.length).map(item => item.stage) };
}

// A device that only appears in the signal path (radio, antenna, or a model without a public protocol).
function createListedDevice({ id, label, model, stage }) {
  const known = PENDING_DEVICES.find(item => item.model === model);
  if (!known && !STAGES.includes(stage)) throw new Error("A signal path stage is required.");
  return {
    id,
    type: known ? "unsupported" : "listed",
    label: label || known?.label || id,
    model: model || null,
    stage: known && STAGES.includes(known.stage) ? known.stage : stage,
    commands: [],
    async status() { return { id, type: known ? "unsupported" : "listed", control: known ? PENDING : "none", controllable: false }; },
    async safeState() { return { action: "none" }; }
  };
}

// Builds devices from the agent configuration. Credentials stay in this process and never reach status().
// Serial rotors need an injected serialFactory(config): the agent has no serial dependency of its own.
function devicesFromConfig(entries, { isTransmitting, serialFactory } = {}) {
  const devices = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry !== "object" || !/^[a-z0-9_-]{1,32}$/.test(String(entry.id))) continue;
    if (entry.kind === "dli") {
      devices.push(createPowerDevice({ ...entry, transport: httpTransport({ host: entry.host, port: entry.port, username: entry.username, password: entry.password }), isTransmitting }));
    } else if (entry.kind === "modbus") {
      devices.push(createPowerDevice({ ...entry, transport: tcpExchange({ host: entry.host, port: entry.port }), isTransmitting }));
    } else if (entry.kind === "rotor" && serialFactory) {
      devices.push(createSerialRotor({ ...entry, serial: serialFactory(entry) }));
    } else if (entry.kind === "listed") devices.push(createListedDevice(entry));
  }
  return devices;
}

// ---- Support matrix (device model, link, status, source) ----

const SUPPORT_MATRIX = Object.freeze([
  { device: "Digital Loggers Web Power Switch (REST)", link: "HTTP + digest", status: "ok", source: "digital-loggers.com/rest.html" },
  { device: "Waveshare Modbus POE ETH Relay", link: "Modbus TCP 502", status: "ok", source: "waveshare.com/wiki/Modbus_POE_ETH_Relay + Modbus spec V1.1b3" },
  { device: "Hy-Gain DCU-1 / DCU-1X", link: "serial 4800 8N1", status: "partial", source: "Hamlib rotorez.txt/.c; RT-21 manual App. F (no heading read, stop unconfirmed)" },
  { device: "Idiom Press Rotor-EZ / RotorCard", link: "serial 4800 8N1", status: "ok", source: "Hamlib rotorez.txt/.c" },
  { device: "Green Heron RT-21", link: "serial 4800/9600 8N1", status: "ok", source: "RT-21 manual App. F; Hamlib rotorez.c" },
  { device: "Yaesu GS-232A", link: "serial 150-9600 8N1 (baud explicit)", status: "partial", source: "Hamlib gs232a.c; no hardware validation" },
  { device: "Yaesu GS-232B", link: "serial 1200-9600 8N1 (baud explicit)", status: "partial", source: "Hamlib gs232b.c; no hardware validation" },
  { device: "SPID Rot2Prog", link: "serial 600 8N1", status: "partial", source: "Hamlib spid.c, spid.txt; no hardware validation" },
  { device: "Hy-Gain DCU2 / DCU3 / YRC-1", link: "serial 9600", status: PENDING, source: "catalog only (Hamlib 406); command set not read" },
  ...PENDING_DEVICES.map(item => ({ device: item.label, link: "network", status: PENDING, source: "STATION-DEVICES-SOURCES.md" }))
]);

// ---- Manager: owns the configured devices and the agent-facing API ----

function createStationDevices({ devices = [], isTransmitting = () => false } = {}) {
  const list = new Map();
  for (const device of devices) {
    if (list.has(device.id)) throw new Error("Duplicate station device id.");
    list.set(device.id, device);
  }
  const get = id => {
    const device = list.get(id);
    if (!device) throw new DeviceError("device_unknown", "Unknown station device.", 404);
    return device;
  };
  return {
    isTransmitting,
    list: () => [...list.values()],
    async status() {
      const entries = [];
      for (const device of list.values()) entries.push({ ...(await device.status()), commands: device.commands });
      return { devices: entries, path: buildSignalPath([...list.values()].map(device => ({ id: device.id, label: device.label, stage: device.stage, model: device.model }))) };
    },
    async command(id, body) {
      const device = get(id);
      const name = body?.command;
      if (!device.commands.includes(name)) throw new DeviceError("command_unknown", "Command not supported by this device.", 400);
      if (device.type === "power") {
        if (name === "read") return device.status();
        if (name === "set") return device.set(String(body.outlet), body.on === true, { confirm: body.confirm === true });
        return device.cycle(String(body.outlet), { confirm: body.confirm === true });
      }
      if (name === "stop") return device.stop();
      if (name === "read") return device.status();
      return device.move(Number(body.heading), body.elevation === undefined ? 0 : Number(body.elevation));
    },
    // Called on operator loss and shutdown: only rotors are stopped; power outlets stay as they are.
    async safeAll() {
      const results = [];
      for (const device of list.values()) results.push({ id: device.id, ...(await device.safeState().catch(error => ({ error: error.code || "failed" }))) });
      return results;
    },
    matrix: () => SUPPORT_MATRIX
  };
}

module.exports = {
  PENDING, CRITICAL_ROLES, DeviceError, MODBUS, ROTOR_PROTOCOLS, SUPPORT_MATRIX, PENDING_DEVICES, STAGES,
  dliRequest, digestAuthorization, httpTransport, tcpExchange,
  modbusReadCoils, modbusWriteCoil, modbusWriteCoils, parseModbusResponse,
  createPowerDevice, rotorFrames, parseHeading, parseRotorReply, createSerialRotor, buildSignalPath, createListedDevice, devicesFromConfig, createStationDevices
};
