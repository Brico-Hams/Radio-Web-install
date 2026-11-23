"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Linear amplifier drivers behind station-accessories.cjs: read status, STANDBY, OPERATE and fault parsing.
// Every driver here is "source-implemented, not hardware-tested": the frames come from the reference
// sources named below, there is no capture from a real amplifier in this repository.
//
// Adapted from (protocol tables, frame layouts and fault lists; rewritten and wrapped in this project's
// safety contract; see docs/THIRD-PARTY-REUSE.md):
//   Hamlib amplifiers/elecraft/kpa.c      Copyright (c) 2019 Michael Black W9MDB, LGPL-2.1-or-later
//   Hamlib amplifiers/gemini/gemini.c     Hamlib authors, LGPL-2.1-or-later
//   Hamlib amplifiers/expert/expert.c     Copyright (c) 2023 Michael Black W9MDB, (c) 2026 Mikael Nousiainen OH3BHX, LGPL-2.1-or-later
//   macexpert-spe SPEProtocol.swift       Copyright (c) 2026 Manoj Ramawarrier (VU2CPL), MIT
//   SPE-1.3-2K-FA-Remote-server server.py Copyright (c) OH2GEK, GPL-3.0-only
//   ACOM-Controller MainWindow.xaml.cs    Copyright (c) 2019 Bjorn Ekelund, MIT
//
// Safety contract (shared with station-accessories.cjs): a driver never keys a transmitter, never sends a
// power-off command (^ON0, 0x0A, ACOM Off), and every setOperate(false) is read back; if STANDBY cannot be
// confirmed the driver throws so the caller keeps OPERATE blocked. OPERATE is never confirmed by guessing.
//
// Transport contract (injected, so tests need no port): { write(Buffer), read(timeoutMs) -> Buffer (empty on
// timeout), flush?(), close?() }.

const net = require("node:net");

const READ_TIMEOUT_MS = 1000;
const CONFIRM_READS = 3;

function toBuffer(data) {
  return Buffer.isBuffer(data) ? data : Buffer.from(data, "latin1");
}

// Accumulates chunks until isComplete(buffer) returns something other than null. A silent read is a timeout.
async function readUntil(transport, isComplete, timeoutMs = READ_TIMEOUT_MS, maxReads = 64) {
  let buffer = Buffer.alloc(0);
  for (let index = 0; index < maxReads; index += 1) {
    const chunk = await transport.read(timeoutMs);
    if (!chunk || chunk.length === 0) throw new Error("amplifier timeout");
    buffer = Buffer.concat([buffer, toBuffer(chunk)]);
    const result = isComplete(buffer);
    if (result !== null) return result;
  }
  throw new Error("amplifier timeout");
}

function protocolError(message) {
  return new Error(`amplifier protocol: ${message}`);
}

function number(text) {
  const value = Number.parseFloat(String(text).trim());
  return Number.isFinite(value) ? value : null;
}

// Re-reads until the amplifier reports STANDBY; never sends another toggle.
async function confirmStandby(readOperate) {
  for (let attempt = 0; attempt < CONFIRM_READS; attempt += 1) {
    if ((await readOperate()) === false) return;
  }
  throw new Error("STANDBY not confirmed");
}

// ---------------------------------------------------------------- Elecraft KPA (Hamlib kpa.c / kpa1500.c)

// Hamlib kpa.c kpa_fault_list.
const KPA_FAULTS = Object.freeze({
  0x10: "Watchdog Timer was reset", 0x20: "PA Current is too high", 0x40: "Temperature is too high",
  0x60: "Input power is too high", 0x61: "Gain is too low", 0x70: "Invalid frequency",
  0x80: "50V supply voltage too low or too high", 0x81: "5V supply voltage too low or too high",
  0x82: "10V supply voltage too low or too high", 0x83: "12V supply voltage too low or too high",
  0x84: "-12V supply voltage too low or too high", 0x85: "5V or 400V LPF board supply voltages not detected",
  0x90: "Reflected power is too high", 0x91: "SWR very high", 0x92: "ATU no match",
  0xB0: "Dissipated power too high", 0xC0: "Forward power too high",
  0xE0: "Forward power too high for current setting", 0xF0: "Gain is too high"
});

function parseKpaReply(text, command) {
  const match = new RegExp(`^\\^${command}(-?\\d+(?:\\.\\d+)?);?$`).exec(String(text).trim());
  if (!match) throw protocolError(`unexpected ^${command} reply`);
  return Number(match[1]);
}

function kpaFaultText(code) {
  if (code === 0) return null;
  return KPA_FAULTS[code] || `Unknown fault code=0x${code.toString(16).padStart(2, "0")}`;
}

function createKpaDriver(transport, options = {}) {
  const timeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;
  const readSemicolon = () => readUntil(transport, buffer => (buffer.includes(0x3b) ? buffer.toString("latin1") : null), timeoutMs);

  // Hamlib kpa_transaction: wake the amplifier with ';' until it echoes ';', then send the command.
  async function wake() {
    await transport.flush?.();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await transport.write(Buffer.from(";", "latin1"));
      if ((await readSemicolon()).trim() === ";") return;
    }
  }

  async function ask(command) {
    await wake();
    await transport.write(Buffer.from(command, "latin1"));
    return (await readSemicolon()).trim();
  }

  async function send(command) {
    await wake();
    await transport.write(Buffer.from(command, "latin1"));
    await wake();
  }

  // ^ON is the power switch and ^OP the operate flag (kpa_get_powerstat); ^ON0 is never sent.
  async function readOperate() {
    const powered = parseKpaReply(await ask("^ON;"), "ON");
    if (powered === 0) return false;
    const reply = await ask("^OP;");
    return parseKpaReply(reply.replace(/^\^OP/, "^ON"), "ON") === 1;
  }

  return {
    id: "elecraft-kpa",
    async setOperate(on) {
      await send(on ? "^OS1;" : "^OS0;");
      if (!on) await confirmStandby(readOperate);
    },
    async setBand(band, freqHz) {
      if (Number.isFinite(freqHz)) await send(`^FR${String(Math.floor(freqHz / 1000)).padStart(5, "0")};`);
    },
    async read() {
      const operate = await readOperate();
      const swr = parseKpaReply(await ask("^SW;"), "SW") / 10;
      const fault = kpaFaultText(parseKpaReply(await ask("^SF;"), "SF"));
      let powerW = null;
      try { powerW = parseKpaReply(await ask("^PWF;"), "PWF"); } catch { /* the forward power is informative only */ }
      return { operate, swr, fault, powerW, tempC: null };
    },
    async close() { await transport.close?.(); }
  };
}

// ---------------------------------------------------------------- Expert / SPE (Hamlib expert.c, macexpert SPEProtocol.swift)

const EXPERT_CMD_OPERATE = 0x0d;
const EXPERT_CMD_STATUS = 0x90;
const EXPERT_STATUS_LENGTH = 67;
// Hamlib expert_warning_messages / expert_alarm_messages, with the 'A' codes from macexpert warningMap/alarmMap.
const EXPERT_WARNINGS = Object.freeze({
  M: "Amplifier alarm", A: "No selected antenna", S: "Antenna SWR high", B: "No valid band", P: "Power limit exceeded",
  O: "Overheating", Y: "ATU not available", W: "Tuning with no input power", K: "ATU bypassed",
  R: "Power switch held by remote", T: "Combiner overheating", C: "Combiner fault"
});
const EXPERT_ALARMS = Object.freeze({
  S: "SWR exceeding limits", A: "Amplifier protection", D: "Input overdriving", H: "Excess overheating", C: "Combiner fault"
});
const EXPERT_BANDS = Object.freeze(["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m"]);

// Host frame: 55 55 55 CNT DATA... CHK (CHK = sum of DATA mod 256).
function buildExpertFrame(bytes) {
  const checksum = bytes.reduce((sum, value) => (sum + value) % 256, 0);
  return Buffer.from([0x55, 0x55, 0x55, bytes.length, ...bytes, checksum]);
}

// Amplifier status: AA AA AA 43 <67 CSV bytes> CHKlo CHKhi ',' CR LF (16-bit sum of the 67 bytes, expert_read_status).
// Returns null while the frame is incomplete.
function parseExpertStatus(buffer) {
  let start = -1;
  for (let index = 0; index + 3 < buffer.length; index += 1) {
    if (buffer[index] === 0xaa && buffer[index + 1] === 0xaa && buffer[index + 2] === 0xaa) { start = index; break; }
  }
  if (start < 0) return null;
  const length = buffer[start + 3];
  if (length !== EXPERT_STATUS_LENGTH) throw protocolError(`status length ${length}`);
  const end = start + 4 + length + 5;
  if (buffer.length < end) return null;
  const data = buffer.subarray(start + 4, start + 4 + length);
  const checksum = data.reduce((sum, value) => sum + value, 0) & 0xffff;
  if ((checksum & 0xff) !== buffer[start + 4 + length] || (checksum >> 8) !== buffer[start + 5 + length]) throw protocolError("status checksum");
  const fields = data.toString("latin1").split(",").map(field => field.trim());
  if (fields.length < 20) throw protocolError("status fields");
  const state = fields[2];
  if (state !== "S" && state !== "O") throw protocolError(`state '${state}'`);
  const warning = fields[18];
  const alarm = fields[19];
  const band = EXPERT_BANDS[Number.parseInt(fields[6], 10)] || null;
  return {
    id: fields[1], operate: state === "O", tx: fields[3] === "T", input: fields[5], band, level: fields[9],
    powerW: number(fields[10]), swrAtu: number(fields[11]), swr: number(fields[12]), voltageV: number(fields[13]),
    currentA: number(fields[14]), tempC: number(fields[15]),
    warning: warning && warning !== "N" ? EXPERT_WARNINGS[warning] || `Unknown warning: ${warning}` : null,
    fault: alarm && alarm !== "N" ? EXPERT_ALARMS[alarm] || `Unknown alarm: ${alarm}` : null
  };
}

function createExpertDriver(transport, options = {}) {
  const timeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;

  async function status() {
    await transport.flush?.();
    await transport.write(buildExpertFrame([EXPERT_CMD_STATUS]));
    return readUntil(transport, parseExpertStatus, timeoutMs);
  }

  // Acknowledge: AA AA AA 01 X X (expert_transaction without a response buffer).
  async function command(code) {
    await transport.flush?.();
    await transport.write(buildExpertFrame([code]));
    await readUntil(transport, buffer => {
      const start = buffer.indexOf(Buffer.from([0xaa, 0xaa, 0xaa]));
      if (start < 0 || buffer.length < start + 6) return null;
      if (buffer[start + 3] !== 1 || buffer[start + 4] !== buffer[start + 5]) throw protocolError("ack");
      return true;
    }, timeoutMs);
  }

  return {
    id: "expert-spe",
    // 0x0D toggles OPERATE, so it is only sent when the status shows the opposite state, and at most once per call.
    async setOperate(on) {
      if ((await status()).operate === on) return;
      await command(EXPERT_CMD_OPERATE);
      if (on) {
        if ((await status()).operate !== true) throw new Error("OPERATE not confirmed");
        return;
      }
      await confirmStandby(async () => (await status()).operate);
    },
    read: status,
    async close() { await transport.close?.(); }
  };
}

// ---------------------------------------------------------------- ACOM (ACOM-Controller MainWindow.xaml.cs)

const ACOM_ENABLE_TELEMETRY = Buffer.from([0x55, 0x92, 0x04, 0x15]);
const ACOM_DISABLE_TELEMETRY = Buffer.from([0x55, 0x91, 0x04, 0x16]);
const ACOM_OPERATE = Buffer.from([0x55, 0x81, 0x08, 0x02, 0x00, 0x06, 0x00, 0x1a]);
const ACOM_STANDBY = Buffer.from([0x55, 0x81, 0x08, 0x02, 0x00, 0x05, 0x00, 0x1b]);
const ACOM_FRAME_LENGTH = 72;
const ACOM_STATES = Object.freeze({
  1: "RESET", 2: "INIT", 3: "DEBUG", 4: "SERVICE", 5: "STANDBY", 6: "RECEIVE", 7: "TRANSMIT", 9: "SYSTEM", 10: "OFF"
});
const ACOM_BANDS = Object.freeze(["?m", "160m", "80m", "40/60m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m"]);
// Per model: temperature offset and whether the amplifier itself shows a temperature (Configuration()).
const ACOM_MODELS = Object.freeze({
  "500S": { tempOffset: 282, showsTemp: false }, "600S": { tempOffset: 273, showsTemp: true },
  "700S": { tempOffset: 282, showsTemp: true }, "1200S": { tempOffset: 281, showsTemp: true },
  "2020S": { tempOffset: 282, showsTemp: false }
});

function acomErrorText(code) {
  if (code === 0xff) return null;
  const text = {
    0x00: "Hot switching", 0x08: "Hot switching", 0x03: "Drive power at wrong time", 0x04: "Reflected power warning",
    0x05: "Reflected power warning", 0x06: "Drive power too high", 0x07: "Drive power too high",
    0x0c: "RF power at wrong time", 0x0e: "Stop transmission first", 0x0f: "Remove drive power",
    0x24: "Excessive PAM current", 0x25: "Excessive PAM current", 0x39: "Excessive PAM current",
    0x44: "Excessive PAM current", 0x45: "Excessive PAM current", 0x59: "Excessive PAM current", 0x70: "CAT error"
  }[code] || "ERROR - See display";
  return `${text} (0x${code.toString(16).padStart(2, "0")})`;
}

// Telemetry frame: 72 bytes starting 55 2F whose byte sum is 0 mod 256. Returns the newest valid frame or null.
function parseAcomTelemetry(buffer, model = "700S") {
  const spec = ACOM_MODELS[model];
  if (!spec) throw new Error(`unknown ACOM model ${model}`);
  let found = null;
  for (let index = 0; index + ACOM_FRAME_LENGTH <= buffer.length; index += 1) {
    if (buffer[index] !== 0x55 || buffer[index + 1] !== 0x2f) continue;
    const frame = buffer.subarray(index, index + ACOM_FRAME_LENGTH);
    if (frame.reduce((sum, value) => (sum + value) & 0xff, 0) !== 0) continue;
    found = frame;
    index += ACOM_FRAME_LENGTH - 1;
  }
  if (!found) return null;
  const word = offset => found[offset] + found[offset + 1] * 256;
  const status = found[3] >> 4;
  const off = status === 10;
  const swr = word(26) / 100;
  return {
    state: ACOM_STATES[status] || "UNKNOWN",
    operate: status === 6 || status === 7,
    tx: status === 7,
    tempC: off || !spec.showsTemp ? null : word(16) - spec.tempOffset,
    driveW: off ? null : word(20) / 10,
    powerW: off ? null : word(22),
    reflectedW: off ? null : word(24),
    swr: off || swr === 0 ? null : swr,
    band: off ? null : ACOM_BANDS[found[69] & 0x0f] || "?m",
    // Every error or warning code counts as a fault: the safe answer is STANDBY.
    fault: off ? null : acomErrorText(found[66])
  };
}

function createAcomDriver(transport, options = {}) {
  const timeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;
  const model = options.model || "700S";
  parseAcomTelemetry(Buffer.alloc(0), model);
  let enable = true;

  async function telemetry() {
    if (enable) { await transport.write(ACOM_ENABLE_TELEMETRY); enable = false; }
    try {
      return await readUntil(transport, buffer => parseAcomTelemetry(buffer, model), timeoutMs);
    } catch (error) {
      enable = true;
      throw error;
    }
  }

  return {
    id: "acom",
    async setOperate(on) {
      await transport.flush?.();
      await transport.write(on ? ACOM_OPERATE : ACOM_STANDBY);
      if (!on) await confirmStandby(async () => (await telemetry()).operate);
    },
    read: telemetry,
    async close() {
      try { await transport.write(ACOM_DISABLE_TELEMETRY); } finally { await transport.close?.(); }
    }
  };
}

// ---------------------------------------------------------------- Gemini DX1200 / HF-1K (Hamlib gemini.c)

// Hamlib gemini_parse_status_response: comma separated KEY=value items in one line.
function parseGeminiStatus(line) {
  const status = {};
  let matched = 0;
  for (const item of String(line).split(/[,\r\n]/).map(part => part.trim()).filter(Boolean)) {
    const equals = item.indexOf("=");
    if (equals < 0) continue;
    const key = item.slice(0, equals).toUpperCase();
    const value = item.slice(equals + 1).trim();
    let hit = true;
    let found;
    if (key === "BAND" && (found = /^([\d.]+)\s*([KkMm])/.exec(value))) status.bandHz = Number(found[1]) * (found[2].toUpperCase() === "K" ? 1e3 : 1e6);
    else if (key === "ANTENNA") status.antenna = value.slice(0, 1);
    else if (key === "POWER" && (found = /^(\d+)W(\d+)/.exec(value))) { status.powerCurrentW = Number(found[1]); status.powerPeakW = Number(found[2]); }
    else if (key === "VSWR") status.swr = number(value);
    else if (key === "CURRENT") status.currentA = number(value);
    else if (key === "TEMPERATURE") status.tempC = number(value);
    else if (key === "STATE") status.state = value;
    else if (key === "PTT") status.tx = value.toUpperCase() === "TX";
    else if (key === "TRIP") status.trip = value;
    else hit = false;
    if (hit) matched += 1;
  }
  if (matched === 0) throw protocolError("no status items");
  return status;
}

function createGeminiDriver(transport, options = {}) {
  const timeoutMs = options.readTimeoutMs ?? READ_TIMEOUT_MS;
  const readLine = () => readUntil(transport, buffer => (buffer.includes(0x0a) ? buffer.toString("latin1") : null), timeoutMs);

  async function ask(command) {
    await transport.flush?.();
    await transport.write(Buffer.from(`${command}\n`, "latin1"));
    return readLine();
  }

  // "R\n" answers 0 (STANDBY) or 1 (OPERATE), see gemini_get_powerstat / gemini_set_powerstat.
  async function readOperate() {
    const match = /^\s*(\d+)/.exec(await ask("R"));
    if (!match || (match[1] !== "0" && match[1] !== "1")) throw protocolError("R reply");
    return match[1] === "1";
  }

  return {
    id: "gemini",
    async setOperate(on) {
      await transport.flush?.();
      await transport.write(Buffer.from(on ? "R1\n" : "R0\n", "latin1"));
      if (!on) await confirmStandby(readOperate);
    },
    async read() {
      const status = parseGeminiStatus(await ask("S"));
      const operate = await readOperate();
      // The value of TRIP when nothing tripped is not documented: only empty or NONE count as clear.
      const trip = status.trip && !/^none$/i.test(status.trip) ? `TRIP ${status.trip}` : null;
      return {
        operate, tx: status.tx ?? null, swr: status.swr ?? null, powerW: status.powerPeakW ?? null,
        tempC: status.tempC ?? null, currentA: status.currentA ?? null, fault: trip
      };
    },
    async close() { await transport.close?.(); }
  };
}

// ---------------------------------------------------------------- registry and TCP transport

const DRIVER_FACTORIES = Object.freeze({
  "elecraft-kpa": createKpaDriver, "expert-spe": createExpertDriver, "acom": createAcomDriver, "gemini": createGeminiDriver
});

function createAmplifierDriver(driverId, transport, options = {}) {
  const factory = DRIVER_FACTORIES[driverId];
  if (!factory) throw new Error(`no amplifier driver '${driverId}'`);
  return factory(transport, options);
}

// Lazy TCP link (serial-to-network servers and the Gemini network port). Nothing connects until the first use.
function createTcpTransport({ host, port, connectTimeoutMs = 3000 }, netModule = net) {
  if (typeof host !== "string" || !/^[\w.:-]{1,253}$/.test(host)) throw new Error("amplifier host invalid");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("amplifier port invalid");
  let socket = null;
  let connecting = null;
  let pending = Buffer.alloc(0);
  let waiter = null;

  function wake() {
    const resolve = waiter;
    waiter = null;
    resolve?.();
  }

  function reset() {
    socket = null;
    connecting = null;
    wake();
  }

  function connect() {
    if (socket && !socket.destroyed) return Promise.resolve();
    connecting ||= new Promise((resolve, reject) => {
      const created = netModule.connect({ host, port });
      const timer = setTimeout(() => { created.destroy(); reject(new Error("amplifier connect timeout")); }, connectTimeoutMs);
      timer.unref?.();
      created.once("connect", () => { clearTimeout(timer); socket = created; resolve(); });
      created.on("data", chunk => { pending = Buffer.concat([pending, chunk]); wake(); });
      created.on("error", error => { clearTimeout(timer); reset(); reject(error); });
      created.on("close", reset);
    }).finally(() => { connecting = null; });
    return connecting;
  }

  return {
    async write(data) {
      await connect();
      await new Promise((resolve, reject) => socket.write(toBuffer(data), error => (error ? reject(error) : resolve())));
    },
    async read(timeoutMs) {
      if (pending.length === 0) {
        await connect();
        await new Promise(resolve => {
          const timer = setTimeout(wake, timeoutMs);
          timer.unref?.();
          waiter = () => { clearTimeout(timer); resolve(); };
        });
      }
      const chunk = pending;
      pending = Buffer.alloc(0);
      return chunk;
    },
    async flush() { pending = Buffer.alloc(0); },
    async close() { socket?.destroy(); reset(); }
  };
}

module.exports = {
  createAmplifierDriver, createTcpTransport, createKpaDriver, createExpertDriver, createAcomDriver, createGeminiDriver,
  buildExpertFrame, parseExpertStatus, parseAcomTelemetry, parseGeminiStatus, parseKpaReply, kpaFaultText, acomErrorText,
  ACOM_MODELS, DRIVER_FACTORIES, EXPERT_CMD_OPERATE, EXPERT_CMD_STATUS
};
