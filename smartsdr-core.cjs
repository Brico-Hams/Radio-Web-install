"use strict";
// FlexRadio SmartSDR client for the Node remote shack. Mirrors
// remote-station/bricoham_remote_station/drivers/smartsdr_protocol.py; every syntax, port and
// scale comes from remote-station/docs/FLEX-SMARTSDR-API.md. "pendiente de fuente" items are not implemented.
const net = require("node:net");
const dgram = require("node:dgram");
const { EventEmitter } = require("node:events");

const TCP_PORT = 4992;
const DISCOVERY_PORTS = Object.freeze([4991, 4992]);
const PGXL_TCP_PORT = 9008;
const DISCOVERY_CLASS_ID = 0x534CFFFF;
const MAX_FRAME = 16384;
const MAX_SEQ = 0xFFFFFFFF;
const SEVERITIES = Object.freeze(["info", "warning", "error", "fatal"]);
const SLICE_MODES = Object.freeze(["usb", "lsb", "cw", "am", "digu"]);
const SUBSCRIBE_OBJECTS = Object.freeze(["amplifier", "atu", "meter", "pan", "radio", "slice", "tx", "audio_stream"]);
// Documented 0-100; vox_level, vox_delay and hwalc_enabled values are pendiente de fuente.
const TRANSMIT_PERCENT = Object.freeze(["rfpower", "tunepower", "miclevel"]);
const TRANSMIT_BOOL = Object.freeze(["dax"]);
const ERROR_CODES = Object.freeze({
  0x50000016: "malformed command", 0x5000002C: "wrong parameter count", 0x5000002D: "bad field",
  0x50000033: "out of range", 0x5000000D: "invalid slice or not yours", 0x50000068: "slice locked",
  0x50004001: "not licensed", 0x500000A3: "unknown subscription object", 0x5000003D: "TX not supported",
  0x50000042: "not ready", 0x50000043: "no transmitter"
});
// unit -> [divisor, verified]. SWR, Volts/Amps and degC are not confirmed for radio meters.
const METER_SCALES = Object.freeze({
  dbm: [128, true], dbfs: [128, true], swr: [128, false], volts: [1024, false], amps: [1024, false], degc: [64, false], degf: [64, false]
});

const describeError = code => ERROR_CODES[code] || `unknown error 0x${(code >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;

class SmartSdrError extends Error {
  constructor(message, response) { super(message); this.name = "SmartSdrError"; this.response = response || null; }
}

// --- VITA-49 container and discovery ---

function parseVitaPacket(packet) {
  if (!Buffer.isBuffer(packet) || packet.length < 4 || packet.length % 4) throw new SmartSdrError("invalid VITA-49 packet");
  const word0 = packet.readUInt32BE(0);
  const type = word0 >>> 28;
  const hasClass = Boolean((word0 >>> 27) & 1);
  const hasTrailer = Boolean((word0 >>> 26) & 1);
  const tsi = (word0 >>> 22) & 3;
  const tsf = (word0 >>> 20) & 3;
  const size = word0 & 0xFFFF;
  if (size < 1 || size * 4 > packet.length) throw new SmartSdrError("VITA-49 size mismatch");
  let offset = 4;
  let streamId = null;
  if ([1, 3, 4, 5].includes(type)) { streamId = packet.readUInt32BE(offset); offset += 4; }
  let classId = null;
  if (hasClass) {
    if (offset + 8 > size * 4) throw new SmartSdrError("truncated VITA-49 header");
    classId = packet.readUInt32BE(offset + 4);
    offset += 8;
  }
  if (tsi) offset += 4;
  if (tsf) offset += 8;
  const end = size * 4 - (hasTrailer ? 4 : 0);
  if (offset > end) throw new SmartSdrError("truncated VITA-49 header");
  return { type, streamId, classId, payload: packet.subarray(offset, end) };
}

function parseDiscoveryString(text) {
  const fields = {};
  for (const token of String(text).split(/\s+/)) {
    const index = token.indexOf("=");
    if (index > 0) fields[token.slice(0, index)] = token.slice(index + 1);
  }
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(fields.ip || "");
  if (!fields.model || !fields.serial || !ip || ip.slice(1).some(part => Number(part) > 255)) throw new SmartSdrError("discovery without valid model, serial or ip");
  const port = fields.port === undefined ? TCP_PORT : Number(fields.port);
  if (!/^\d+$/.test(String(fields.port ?? TCP_PORT)) || port < 1 || port > 65535) throw new SmartSdrError("invalid discovery port");
  return {
    model: fields.model, serial: fields.serial, version: fields.version || "", name: (fields.name || "").replace(/_/g, " "),
    callsign: fields.callsign || "", ip: fields.ip, port
  };
}

function parseDiscoveryPacket(packet) {
  const vita = parseVitaPacket(packet);
  if (vita.classId !== DISCOVERY_CLASS_ID) throw new SmartSdrError("not a discovery class 0x534CFFFF packet");
  return parseDiscoveryString(vita.payload.toString("latin1").replace(/\0+$/, ""));
}

// Firmware <= 1.1.3: byte order and the length prefix of the strings are pendiente de fuente (header only, big endian, unverified).
function parseLegacyDiscovery(payload) {
  if (!Buffer.isBuffer(payload) || payload.length < 12) throw new SmartSdrError("legacy discovery too short");
  return {
    ip: [0, 1, 2, 3].map(index => payload[index]).join("."), port: payload.readUInt16BE(4), radios: payload.readUInt16BE(6),
    mask: payload.readUInt32BE(8), strings: "pendiente de fuente", verified: false
  };
}

// Listens on UDP 4991 and 4992 (the wiki is inconsistent) and reports each radio once per change.
function createDiscovery({ ports = DISCOVERY_PORTS, onRadio, onError } = {}) {
  const sockets = [];
  for (const port of ports) {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    socket.on("message", message => {
      try { onRadio?.(parseDiscoveryPacket(message)); } catch (error) { onError?.(error); }
    });
    socket.on("error", error => onError?.(error));
    socket.bind(port);
    sockets.push(socket);
  }
  return { close() { for (const socket of sockets) { try { socket.close(); } catch { /* already closed */ } } } };
}

// --- Lines: V / H / R / S / M ---

function parseStatus(message, handle = 0) {
  const tokens = String(message).trim().split(/\s+/);
  if (!tokens[0]) throw new SmartSdrError("empty status");
  const ids = [];
  const fields = {};
  for (const token of tokens.slice(1)) {
    const index = token.indexOf("=");
    if (index > 0) fields[token.slice(0, index)] = token.slice(index + 1);
    else if (!Object.keys(fields).length) ids.push(token);
  }
  return { handle, message, object: tokens[0], ids, fields };
}

function parseLine(line) {
  const text = String(line).replace(/[\r\n]+$/, "");
  if (!text || text.length > MAX_FRAME) throw new SmartSdrError("empty or oversized line");
  const kind = text[0];
  const rest = text.slice(1);
  if (kind === "V") return { kind: "version", version: rest };
  if (kind === "H") return { kind: "handle", handle: parseInt(rest, 16) };
  if (kind === "R") {
    const parts = rest.split("|");
    if (!/^\d+$/.test(parts[0]) || !/^[0-9a-fA-F]{1,8}$/.test(parts[1] || "")) throw new SmartSdrError("malformed reply");
    const code = parseInt(parts[1], 16);
    return { kind: "reply", sequence: Number(parts[0]), code, ok: code === 0, message: parts.slice(2).join("|") };
  }
  if (kind === "S") {
    const index = rest.indexOf("|");
    if (index < 0) throw new SmartSdrError("malformed status");
    return { kind: "status", ...parseStatus(rest.slice(index + 1), parseInt(rest.slice(0, index), 16)) };
  }
  if (kind === "M") {
    const index = rest.indexOf("|");
    if (index < 0) throw new SmartSdrError("malformed message");
    const number = parseInt(rest.slice(0, index), 16);
    return { kind: "message", number, severity: SEVERITIES[(number >>> 24) & 3], text: rest.slice(index + 1) };
  }
  throw new SmartSdrError("unknown line type");
}

// --- Meters ---

function parseMeterList(message) {
  const body = String(message).startsWith("meter ") ? String(message).slice(6) : String(message);
  const raw = new Map();
  for (const entry of body.split("#")) {
    const match = /^(\d+)\.(\w+)=(.*)$/.exec(entry.trim());
    if (!match) continue;
    const id = Number(match[1]);
    if (!raw.has(id)) raw.set(id, {});
    raw.get(id)[match[2]] = match[3];
  }
  const number = text => (text !== undefined && text !== "" && Number.isFinite(Number(text)) ? Number(text) : null);
  const meters = new Map();
  for (const [id, fields] of raw) {
    meters.set(id, { id, source: fields.src || "", name: fields.nam || "", low: number(fields.low), high: number(fields.hi), unit: fields.unit || "", fps: number(fields.fps) });
  }
  return meters;
}

// Each 32-bit word: meter ID in the upper 16 bits, int16 value in the lower 16.
function decodeMeterPayload(payload) {
  if (payload.length % 4) throw new SmartSdrError("meter payload is not a multiple of 4 bytes");
  const out = [];
  for (let offset = 0; offset < payload.length; offset += 4) out.push({ id: payload.readUInt16BE(offset), raw: payload.readInt16BE(offset + 2) });
  return out;
}

function scaleMeter(raw, unit) {
  const scale = METER_SCALES[String(unit).toLowerCase()];
  return scale ? { value: raw / scale[0], verified: scale[1] } : null;
}

const round3 = value => Math.round(value * 1000) / 1000;

// readings: Map name -> { value, verified }. Same model as remote-agent.cjs (po in W, swr, alc, fraction).
function normalizeMeters(readings) {
  const out = { po: null, ref: null, swr: null, alc: null, alcDbfs: null, paTempC: null, level: null, supplyVolts: null, fraction: { swr: null, alc: null }, unverified: [] };
  const get = name => {
    const item = readings.get(name);
    if (!item) return null;
    if (!item.verified && !out.unverified.includes(name)) out.unverified.push(name);
    return item.value;
  };
  const fwd = get("FWDPWR");
  if (fwd !== null) out.po = round3(10 ** (fwd / 10) / 1000);
  const ref = get("REFPWR");
  if (ref !== null) out.ref = round3(10 ** (ref / 10) / 1000);
  out.swr = get("SWR");
  const dbfs = get("ALC");
  if (dbfs !== null) { out.alcDbfs = dbfs; out.alc = round3(Math.min(1, 10 ** (dbfs / 20))); }
  out.paTempC = get("PATEMP");
  out.level = get("LEVEL");
  out.supplyVolts = get("+13.8A");
  if (out.swr !== null) out.fraction.swr = round3(Math.min(1, Math.max(0, (out.swr - 1) / 4)));
  out.fraction.alc = out.alc;
  return out;
}

// --- Command builders (pure; the session decides what may be sent) ---

function int(value, low, high, name) {
  if (!Number.isInteger(value) || value < low || value > high) throw new SmartSdrError(`${name} must be an integer between ${low} and ${high}`);
  return value;
}
function mhz(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new SmartSdrError("frequency must be finite positive MHz");
  return value.toFixed(6);
}
function hexId(value, name) {
  if (typeof value !== "string" || !/^(0[xX])?[0-9A-Fa-f]{1,8}$/.test(value)) throw new SmartSdrError(`invalid ${name}`);
  return value;
}
function mode(value) {
  if (!SLICE_MODES.includes(value)) throw new SmartSdrError("mode without source (SmartSDR-Supported-Modes not read)");
  return value;
}
const slice = value => int(value, 0, 0xFFFF, "slice");

function frameCommand(sequence, command) {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > MAX_SEQ) throw new SmartSdrError("invalid sequence");
  if (!command || /[^\x20-\x7E]/.test(command)) throw new SmartSdrError("non printable or multiline command");
  return `C${sequence}|${command}\n`;
}

const Cmd = Object.freeze({
  clientGui(clientId) {
    if (clientId === undefined || clientId === null) return "client gui";
    if (!/^[0-9A-Fa-f-]{1,40}$/.test(String(clientId))) throw new SmartSdrError("invalid client_id");
    return `client gui ${clientId}`;
  },
  clientUdpport: port => `client udpport ${int(port, 1, 65535, "udpport")}`,
  sliceList: () => "slice list",
  sliceCreate: (freq, modeName) => `slice create freq=${mhz(freq)}${modeName === undefined ? "" : ` mode=${mode(modeName)}`}`,
  sliceTune: (number, freq) => `slice tune ${slice(number)} ${mhz(freq)}`,
  sliceSetMode: (number, modeName) => `slice set ${slice(number)} mode=${mode(modeName)}`,
  sliceSetRit: (number, on, hz) => `slice set ${slice(number)} rit_on=${on ? 1 : 0} rit_freq=${int(hz, -1e6, 1e6, "rit_freq")}`,
  sliceSetXit: (number, on, hz) => `slice set ${slice(number)} xit_on=${on ? 1 : 0} xit_freq=${int(hz, -1e6, 1e6, "xit_freq")}`,
  sliceRemove: number => `slice remove ${slice(number)}`,
  meterList: () => "meter list",
  subscribe(object, target = "all") {
    if (!SUBSCRIBE_OBJECTS.includes(object)) throw new SmartSdrError("undocumented subscription object");
    if (target !== "all" && !(Number.isInteger(target) && target >= 0)) throw new SmartSdrError("invalid subscription target");
    return `sub ${object} ${target}`;
  },
  unsubscribe(object, target = "all") { return Cmd.subscribe(object, target).replace("sub ", "unsub "); },
  transmitTune: on => `transmit tune ${on ? "on" : "off"}`,
  transmitSet(params) {
    const parts = Object.entries(params || {}).map(([key, value]) => {
      if (TRANSMIT_PERCENT.includes(key)) return `${key}=${int(value, 0, 100, key)}`;
      if (TRANSMIT_BOOL.includes(key)) return `${key}=${int(value, 0, 1, key)}`;
      throw new SmartSdrError(`${key} not allowed (max_power_level/region excluded; vox_*: pendiente de fuente)`);
    });
    if (!parts.length) throw new SmartSdrError("transmit set without parameters");
    return `transmit set ${parts.join(" ")}`;
  },
  atuStart: () => "atu start",
  atuBypass: () => "atu bypass",
  atuDump: () => "atu dump",
  interlockTimeout: ms => `interlock timeout=${int(ms, 1, 3_600_000, "timeout")}`,
  amplifierOperate: (handle, operate) => `amplifier set ${hexId(handle, "handle")} operate=${operate ? 1 : 0}`,
  panCreate: freq => `display pan c freq=${mhz(freq)}`,
  panSet(id, params) {
    const allowed = {
      center: mhz, bandwidth: mhz, xpixels: v => int(v, 1, 65535, "xpixels"), ypixels: v => int(v, 1, 65535, "ypixels"),
      fps: v => int(v, 1, 1000, "fps"), min_dbm: v => Number(v).toFixed(1), max_dbm: v => Number(v).toFixed(1)
    };
    const entries = Object.entries(params || {});
    if (!entries.length || entries.some(([key]) => !allowed[key])) throw new SmartSdrError("undocumented pan parameters");
    return `display pan s ${hexId(id, "pan")} ${entries.map(([key, value]) => `${key}=${allowed[key](value)}`).join(" ")}`;
  },
  panRemove: id => `display pan r ${hexId(id, "pan")}`,
  streamRemoteAudioRx(compression = "opus") {
    if (!["none", "opus"].includes(compression)) throw new SmartSdrError("compression must be none or opus");
    return `stream create type=remote_audio_rx compression=${compression}`;
  },
  streamRemove: id => `stream remove ${hexId(id, "stream")}`
});

// Power Genius XL (TCP 9008): only the `state=` style status reply; the field list is pendiente de fuente.
function parsePgxlStatus(text) {
  const fields = {};
  for (const token of String(text).trim().split(/\s+/)) {
    const index = token.indexOf("=");
    if (index > 0) fields[token.slice(0, index)] = token.slice(index + 1);
  }
  if (!fields.state) throw new SmartSdrError("PGXL reply without state=");
  return fields;
}

// --- Session ---

// One SmartSDR TCP session. TX needs allowTx (default off) and is time capped. No keepalive is sent:
// the ping syntax is pendiente de fuente, so a radio expecting one drops the client after 15 s.
class SmartSdrSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host;
    this.port = options.port || TCP_PORT;
    this.allowTx = options.allowTx === true;
    this.allowAmplifierOperate = options.allowAmplifierOperate === true;
    this.txCapMs = options.txCapMs ?? 30_000;
    this.tuneLimit = options.tuneLimit ?? 20;
    this.swrLimit = options.swrLimit ?? 3;
    this.swrTripMs = options.swrTripMs ?? 1000;
    this.now = options.now || Date.now;
    this.commandTimeoutMs = options.commandTimeoutMs ?? 5000;
    this.socket = options.socket || null;
    this.version = "";
    this.handle = 0;
    this.meters = new Map();
    this.status = new Map();
    this.readings = new Map();
    this.rejectedMeters = 0;
    this.txDeadline = null;
    this.swrTripped = false;
    this.txOffUnverified = false;
    this.seq = 1;
    this.pending = new Map();
    this.amplifiers = new Set();
    this.swrSince = 0;
    this.buffer = "";
    this.timer = null;
    this.bound = false;
    this.connectError = null;
    if (this.socket) this.#bind(this.socket);
  }

  // Listeners are attached once, also for an injected socket, so replies are matched without connect().
  #bind(socket) {
    if (this.bound) return;
    this.bound = true;
    socket.setEncoding("latin1");
    socket.on("data", chunk => this.#onData(chunk));
    socket.on("error", error => { this.connectError?.(error); this.#failPending(error); this.#fail(error); });
    socket.on("close", () => { this.#failPending(new SmartSdrError("connection closed")); this.emit("close"); });
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = this.socket || net.connect({ host: this.host, port: this.port });
      let timer = null;
      const done = fn => value => { clearTimeout(timer); this.connectError = null; fn(value); };
      this.connectError = done(reject);
      this.once("hello", done(resolve));
      this.#bind(this.socket);
      timer = setTimeout(() => this.connectError?.(new SmartSdrError("radio sent no V/H lines")), this.commandTimeoutMs);
      timer.unref?.();
    });
  }

  #fail(error) { if (this.listenerCount("error")) this.emit("error", error); }

  #onData(chunk) {
    this.buffer += chunk;
    if (this.buffer.length > MAX_FRAME * 4) { this.buffer = ""; this.#fail(new SmartSdrError("line too long")); return; }
    let index;
    while ((index = this.buffer.search(/[\r\n]/)) >= 0) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      try { this.#handleLine(parseLine(line)); } catch (error) { this.emit("parseError", error); }
    }
  }

  #handleLine(item) {
    if (item.kind === "version") this.version = item.version;
    else if (item.kind === "handle") this.handle = item.handle;
    if ((item.kind === "version" || item.kind === "handle") && this.version && this.handle) this.emit("hello");
    if (item.kind === "reply") {
      const waiter = this.pending.get(item.sequence);
      if (waiter) { this.pending.delete(item.sequence); clearTimeout(waiter.timer); waiter.resolve(item); }
    } else if (item.kind === "status") {
      const key = `${item.object} ${item.ids.join(" ")}`.trim();
      this.status.set(key, { ...(this.status.get(key) || {}), ...item.fields });
      this.emit("status", item);
    } else if (item.kind === "message") this.emit("message", item);
  }

  #failPending(error) {
    for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
    this.pending.clear();
  }

  // Resolves with the matching R reply; rejects on a non-zero code unless check is false.
  command(text, { timeoutMs = this.commandTimeoutMs, check = true } = {}) {
    const sequence = this.seq;
    this.seq = (this.seq + 1) % (MAX_SEQ + 1);
    const frame = frameCommand(sequence, text);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(sequence); reject(new SmartSdrError(`${text}: no reply`)); }, timeoutMs);
      this.pending.set(sequence, {
        timer, reject,
        resolve: reply => (check && !reply.ok ? reject(new SmartSdrError(`${text}: ${describeError(reply.code)}`, reply)) : resolve(reply))
      });
      this.socket.write(frame, "latin1");
    });
  }

  async setup({ clientId, udpPort } = {}) {
    await this.command(Cmd.clientGui(clientId));
    if (udpPort !== undefined) await this.command(Cmd.clientUdpport(udpPort));
    await this.command(Cmd.interlockTimeout(Math.round(this.txCapMs)));
    this.meters = parseMeterList((await this.command(Cmd.meterList())).message);
    await this.command(Cmd.subscribe("meter"));
  }

  // TX: every method below is an explicit operator action.
  #requireTx(tunePower) {
    if (!this.allowTx) throw new SmartSdrError("TX disabled by configuration");
    if (this.swrTripped) throw new SmartSdrError("high SWR: reset the alert before transmitting");
    int(tunePower, 0, 100, "tunepower");
    if (tunePower > this.tuneLimit) throw new SmartSdrError("tunepower exceeds the station tune limit");
  }

  #armCap() {
    this.txDeadline = this.now() + this.txCapMs;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), this.txCapMs + 5);
    this.timer.unref?.();
  }

  async tuneStart(tunePower) {
    this.#requireTx(tunePower);
    await this.command(Cmd.transmitSet({ tunepower: tunePower }));
    await this.command(Cmd.transmitTune(true));
    this.#armCap();
  }

  async atuStart(tunePower) {
    this.#requireTx(tunePower);
    await this.command(Cmd.transmitSet({ tunepower: tunePower }));
    await this.command(Cmd.atuStart());
    this.#armCap();
  }

  // A reply with code 0 to `transmit tune off` counts as verified TX off.
  async unkey(attempts = 3) {
    for (let index = 0; index < attempts; index += 1) {
      try {
        const reply = await this.command(Cmd.transmitTune(false), { timeoutMs: 2000, check: false });
        if (reply.ok) { this.txDeadline = null; this.txOffUnverified = false; clearTimeout(this.timer); return true; }
      } catch { /* retry */ }
    }
    this.txOffUnverified = true;
    this.emit("txOffUnverified");
    return false;
  }

  async tick() {
    if (this.txDeadline !== null && this.now() >= this.txDeadline) await this.unkey();
  }

  resetSwrTrip() { this.swrTripped = false; this.swrSince = 0; }

  async amplifierOperate(handle, operate) {
    if (operate) {
      if (!this.allowAmplifierOperate) throw new SmartSdrError("amplifier OPERATE disabled (STANDBY by default)");
      if (this.swrTripped) throw new SmartSdrError("high SWR: amplifier blocked");
    }
    await this.command(Cmd.amplifierOperate(handle, operate));
    if (operate) this.amplifiers.add(handle); else this.amplifiers.delete(handle);
  }

  async emergencyStop() {
    let ok = await this.unkey();
    for (const handle of [...this.amplifiers].sort()) {
      try { await this.command(Cmd.amplifierOperate(handle, false), { timeoutMs: 2000, check: false }); this.amplifiers.delete(handle); } catch { ok = false; }
    }
    return ok;
  }

  async close() {
    try { await this.emergencyStop(); } finally { clearTimeout(this.timer); this.socket?.destroy(); }
  }

  ingestMeterPacket(packet) {
    for (const { id, raw } of decodeMeterPayload(parseVitaPacket(packet).payload)) {
      const meter = this.meters.get(id);
      if (!meter) continue;
      const scaled = scaleMeter(raw, meter.unit);
      if (!scaled) continue;
      if (meter.low !== null && meter.high !== null) {
        const margin = (meter.high - meter.low) * 0.1;
        if (scaled.value < meter.low - margin || scaled.value > meter.high + margin) { this.rejectedMeters += 1; continue; }
      }
      this.readings.set(meter.name, scaled);
    }
    const normalized = normalizeMeters(this.readings);
    this.#checkSwr(normalized.swr);
    return normalized;
  }

  #checkSwr(swr) {
    if (swr === null || swr <= this.swrLimit || this.txDeadline === null) { this.swrSince = 0; return; }
    const time = this.now();
    if (!this.swrSince) this.swrSince = time;
    else if (time - this.swrSince >= this.swrTripMs) {
      this.swrTripped = true;
      this.emit("swrTripped");
      this.emergencyStop().catch(() => {});
    }
  }

  // UDP socket for VITA-49 streams; pass its port to setup({ udpPort }).
  openUdp(port, onNormalized) {
    const socket = dgram.createSocket("udp4");
    socket.on("message", packet => { try { onNormalized(this.ingestMeterPacket(packet)); } catch (error) { this.emit("parseError", error); } });
    socket.bind(port);
    return socket;
  }
}

// --- rigctld-client compatible adapter for remote-agent.cjs ---

const MODE_TO_HAMLIB = Object.freeze({ usb: "USB", lsb: "LSB", cw: "CW", am: "AM", digu: "PKTUSB" });
const HAMLIB_TO_MODE = Object.freeze(Object.fromEntries(Object.entries(MODE_TO_HAMLIB).map(([key, value]) => [value, key])));

// Exposes one SmartSDR session through the RigctldClient surface used by the agent. PTT (`xmit`) is
// pendiente de fuente, so keying is only possible through the guarded tune flow (tune()).
class SmartSdrRigClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.tunePower = options.tunePower ?? 10;
    this.reconnectMs = options.reconnectMs ?? 3000;
    this.sessionFactory = options.sessionFactory || (opts => new SmartSdrSession(opts));
    this.session = null;
    this.connected = false;
    this.running = false;
    this.reconnectTimer = null;
    this.levels = new Map();
    this.rawAllow = new Set();
  }

  get pending() { return this.session ? this.session.pending.size : 0; }

  oldestPendingMs() { return 0; }

  start() {
    if (this.running) return;
    this.running = true;
    this.#connect();
  }

  stop() {
    this.running = false;
    clearTimeout(this.reconnectTimer);
    const session = this.session;
    this.session = null;
    const wasConnected = this.connected;
    this.connected = false;
    if (session) session.close().catch(() => {});
    if (wasConnected) this.emit("disconnect");
  }

  #retry() {
    if (!this.running) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.#connect(), this.reconnectMs);
    this.reconnectTimer.unref?.();
  }

  async #connect() {
    if (!this.running || this.session) return;
    const session = this.sessionFactory({ ...this.options });
    this.session = session;
    const lost = () => {
      if (this.session !== session) return;
      this.session = null;
      const was = this.connected;
      this.connected = false;
      if (was) this.emit("disconnect");
      this.#retry();
    };
    session.on("close", lost);
    session.on("error", () => {});
    try {
      await session.connect();
      await session.setup({ udpPort: this.options.udpPort });
      if (this.session !== session) return;
      this.connected = true;
      this.emit("connect");
    } catch {
      session.socket?.destroy();
      lost();
    }
  }

  #sliceKey() {
    for (const key of this.session?.status.keys() || []) if (/^slice \d+$/.test(key)) return key;
    throw new SmartSdrError("no slice: create one in SmartSDR");
  }

  #slice() { return this.session.status.get(this.#sliceKey()); }
  #sliceNumber() { return Number(this.#sliceKey().split(" ")[1]); }

  async getFreq() {
    const mhzValue = Number(this.#slice().RF_frequency);
    if (!Number.isFinite(mhzValue)) throw new SmartSdrError("slice without RF_frequency");
    return Math.round(mhzValue * 1e6);
  }

  async setFreq(hz) { await this.session.command(Cmd.sliceTune(this.#sliceNumber(), hz / 1e6)); }

  async getMode() {
    const name = String(this.#slice().mode || "").toLowerCase();
    return { mode: MODE_TO_HAMLIB[name] || name.toUpperCase(), passband: 0 };
  }

  async setMode(name) {
    if (!HAMLIB_TO_MODE[name]) throw new SmartSdrError("mode without source (SmartSDR-Supported-Modes not read)");
    await this.session.command(Cmd.sliceSetMode(this.#sliceNumber(), HAMLIB_TO_MODE[name]));
  }

  async getPtt() { return Boolean(this.session && this.session.txDeadline !== null); }

  async setPtt(on) {
    if (on) throw new SmartSdrError("PTT (xmit) pendiente de fuente: use TUNE");
    if (this.session && !(await this.session.unkey())) throw new SmartSdrError("TX off not verified");
  }

  async tune() { await this.session.tuneStart(this.tunePower); }
  async getStrength() { return null; }
  async getVfo() { return "VFOA"; }
  async setVfo() { throw new SmartSdrError("VFO pendiente de fuente"); }
  async getSplit() { return { split: false, txVfo: "VFOB" }; }
  async setSplit() { throw new SmartSdrError("split pendiente de fuente"); }

  async getLevel(name) { return name === "RFPOWER" && this.levels.has(name) ? this.levels.get(name) : null; }

  // RFPOWER is 0..1 in the agent and 0-100 in `transmit set rfpower=`.
  async setLevel(name, value) {
    if (name !== "RFPOWER") throw new SmartSdrError(`level ${name} pendiente de fuente`);
    await this.session.command(Cmd.transmitSet({ rfpower: Math.round(value * 100) }));
    this.levels.set(name, value);
  }

  async getFunc() { return null; }
  async setFunc() { throw new SmartSdrError("function pendiente de fuente"); }
  sendRaw() { return Promise.reject(new SmartSdrError("raw CAT is not available on SmartSDR")); }

  async dumpCaps() {
    return { model: "FlexRadio SmartSDR", level: { RFPOWER: { get: true, set: true } }, func: {}, tune: true };
  }
}

module.exports = {
  SmartSdrRigClient,
  TCP_PORT, DISCOVERY_PORTS, PGXL_TCP_PORT, DISCOVERY_CLASS_ID, ERROR_CODES, METER_SCALES, SLICE_MODES,
  SmartSdrError, SmartSdrSession, Cmd, describeError, frameCommand, parseVitaPacket, parseDiscoveryString, parseDiscoveryPacket,
  parseLegacyDiscovery, createDiscovery, parseStatus, parseLine, parseMeterList, decodeMeterPayload, scaleMeter, normalizeMeters, parsePgxlStatus
};
