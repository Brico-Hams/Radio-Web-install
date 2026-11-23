"use strict";
// Native CAT adapters for radios Hamlib does not cover in this repo: Quansheng UV-K5/UV-K1 (BricoHams/F4HWN CAT v1/v2),
// Kenwood TH-D75 and the Yaesu FT-817/818/857/897 five-byte CAT. Ported from the Android Kotlin code that is the source:
//   Quansheng: android/app/src/main/java/org/bricohams/radio/CatProtocol.kt (QuanshengFrames, CatProtocol)
//   Yaesu:     android/app/src/main/java/org/bricohams/radio/RigProtocols.kt (YaesuFiveByte, YaesuFiveByteRig)
//   TH-D75:    android/app/src/main/java/org/bricohams/radio/RigProtocols.kt (Th75Rig)
// The transport is injected: { write(buffer), read(length, timeoutMs) } returning/rejecting promises, so no serial dependency
// is needed here and tests run without real I/O. Anything the Kotlin code does not source stays "pendiente de fuente" (null).
// TX safety: the rigs never key by themselves; ptt(true) throws unless the caller built the rig with allowTx, and every
// failed key-up tries a release before rethrowing.

class NativeCatError extends Error {
  constructor(message, code = "protocol") {
    super(message);
    this.name = "NativeCatError";
    this.code = code;
  }
}

const bytesEqual = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

// ---- Quansheng frames (QuanshengFrames in CatProtocol.kt) ----
const Q_KEY = Object.freeze([0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80]);

function crc16(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= (byte & 255) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc;
}

function quanshengEncode(type, data = Buffer.alloc(0)) {
  if (!Number.isInteger(type) || type < 0 || type > 65535 || data.length > 508) throw new NativeCatError("request out of bounds");
  const size = (data.length + 5) & ~1;
  const out = Buffer.alloc(size + 8);
  out.writeUInt16LE(0xcdab, 0);
  out.writeUInt16LE(size, 2);
  out.writeUInt16LE(type, 4);
  out.writeUInt16LE(data.length, 6);
  Buffer.from(data).copy(out, 8);
  out.writeUInt16LE(crc16(out.subarray(4, 4 + size)), 4 + size);
  for (let index = 0; index < size + 2; index += 1) out[4 + index] ^= Q_KEY[index % 16];
  out.writeUInt16LE(0xbadc, 6 + size);
  return out;
}

// Returns { type, data }. A checksum of 0xFFFF means "not computed" in the stock framing.
function quanshengDecode(frame) {
  if (frame.length < 12) throw new NativeCatError("frame too short");
  const size = frame.readUInt16LE(2);
  if (size < 4 || size > 512 || frame.length !== size + 8 || frame.readUInt16LE(0) !== 0xcdab || frame.readUInt16LE(frame.length - 2) !== 0xbadc) {
    throw new NativeCatError("frame corrupt");
  }
  const body = Buffer.from(frame.subarray(4, frame.length - 2));
  for (let index = 0; index < body.length; index += 1) body[index] ^= Q_KEY[index % 16];
  const length = body.readUInt16LE(2);
  const checksum = body.readUInt16LE(size);
  if (length > size - 4 || (checksum !== 0xffff && checksum !== crc16(body.subarray(0, size)))) throw new NativeCatError("length or CRC mismatch");
  return { type: body.readUInt16LE(0), data: Buffer.from(body.subarray(4, 4 + length)) };
}

// Bands of CatProtocol.inBand, in 10 Hz units.
const quanshengInBand = tenHz => (tenHz >= 13_600_000 && tenHz <= 17_400_000) || (tenHz >= 40_000_000 && tenHz <= 47_000_000);

// CAT RX request (type 0x7B00): version, operation (0 query, 1 tune, 2 stop), sequence, frequency [, uplink for v2].
function quanshengCatPayload({ operation, sequence, frequency10Hz = 0, uplink10Hz = null }) {
  const v2 = uplink10Hz !== null;
  const payload = Buffer.alloc(v2 ? 12 : 8);
  payload[0] = v2 ? 2 : 1;
  payload[1] = operation;
  payload.writeUInt16LE(sequence & 0xffff, 2);
  payload.writeUInt32LE(frequency10Hz >>> 0, 4);
  if (v2) payload.writeUInt32LE(uplink10Hz >>> 0, 8);
  return payload;
}

// Mirrors the validation of CatProtocol.exchange (reply type 0x7B01).
function quanshengParseCat(response, { operation, sequence, v2 = false }) {
  if (!(response.length === 16 || (v2 && response.length === 20)) || response.readUInt16LE(2) !== (sequence & 0xffff)) throw new NativeCatError("unexpected CAT reply");
  if (v2 && response.length === 16) throw new NativeCatError("firmware without CAT RX v2", "unsupported");
  if (response[0] !== (v2 ? 2 : 1)) throw new NativeCatError("invalid CAT reply version");
  const status = response[1];
  const capabilities = response.readInt32LE(4);
  const flags = response.readInt32LE(12);
  const anyScreen = capabilities === 15 || capabilities === 31;
  if (status === 5) throw new NativeCatError("radio not armed for CAT (SAT RX, key 8)", "not-armed");
  if (status !== (operation === 0 ? 0 : 1)) throw new NativeCatError(`CAT rejected (status ${status})`, "rejected");
  if (!((capabilities === 7 && flags >= 0 && flags <= 7) || (capabilities === 15 && flags >= 0 && flags <= 31) || (v2 && capabilities === 31 && flags >= 0 && flags <= 255))) {
    throw new NativeCatError("unexpected CAT capabilities");
  }
  const applied = response.readUInt32LE(8);
  if (flags & 1 ? !quanshengInBand(applied) : !(applied === 0 && (flags & 7) === 0)) throw new NativeCatError("inconsistent CAT state");
  return {
    active: Boolean(flags & 1), remote: Boolean(flags & 2), pending: Boolean(flags & 4), frequency10Hz: applied,
    anyScreen, remoteEnabled: anyScreen && Boolean(flags & 8), holdoff: anyScreen && Boolean(flags & 16),
    uplink10Hz: v2 ? response.readUInt32LE(16) : 0, txArmed: v2 && Boolean(flags & 64), keyed: v2 && Boolean(flags & 128), v2
  };
}

// PTT lease (type 0x7B02 / reply 0x7B03): operation 0 query, 1 key or renew (the radio drops PTT 1.5 s after the last renewal), 2 release.
function quanshengPttPayload({ operation, sequence }) {
  const payload = Buffer.alloc(8);
  payload[0] = 1;
  payload[1] = operation;
  payload.writeUInt16LE(sequence & 0xffff, 2);
  return payload;
}

function quanshengParsePtt(response, { sequence, accepted }) {
  if (response.length !== 16 || response.readUInt16LE(2) !== (sequence & 0xffff) || response[0] !== 1) throw new NativeCatError("unexpected PTT reply");
  const capabilities = response.readInt32LE(4);
  if (capabilities !== 8 && capabilities !== 24) throw new NativeCatError("firmware without CAT TX", "unsupported");
  const flags = response.readInt32LE(8);
  const reserved = capabilities === 24 ? 0xffff00c0 : 0xffff00e0;
  if ((flags & reserved) !== 0) throw new NativeCatError("inconsistent PTT state");
  const status = response[1];
  if (!accepted.includes(status)) throw new NativeCatError(status === 5 ? "TX not armed on the radio (SAT RX, key 9)" : `PTT denied (status ${status})`, "rejected");
  return { armed: Boolean(flags & 1), keyed: Boolean(flags & 2), pending: Boolean(flags & 4), limit: Boolean(flags & 8), deniedState: (flags >> 8) & 255, keyedMs: response.readUInt32LE(12) };
}

// Reads one 0xCDAB frame from the transport (magic scan, then length, then body) and returns it whole.
async function readQuanshengFrame(transport, timeoutMs) {
  let previous = 0;
  for (;;) {
    const byte = (await transport.read(1, timeoutMs))[0];
    if (previous !== 0xab || byte !== 0xcd) { previous = byte; continue; }
    previous = 0;
    const length = Buffer.from(await transport.read(2, timeoutMs));
    const size = length.readUInt16LE(0);
    if (size < 4 || size > 512) continue;
    const tail = Buffer.from(await transport.read(size + 4, timeoutMs));
    return Buffer.concat([Buffer.from([0xab, 0xcd]), length, tail]);
  }
}

class QuanshengRig {
  constructor(transport, { allowTx = false, timeoutMs = 1000 } = {}) {
    this.transport = transport;
    this.allowTx = allowTx;
    this.timeoutMs = timeoutMs;
    this.sequence = 0;
  }

  async request(type, payload, expected, accept) {
    const frame = quanshengEncode(type, payload);
    let failure = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.transport.write(frame);
        // F4HWN USB CDC can hold an exact 64-byte packet until the next byte.
        if (frame.length % 64 === 0) await this.transport.write(Buffer.from([0]));
        for (;;) {
          let decoded;
          try { decoded = quanshengDecode(await readQuanshengFrame(this.transport, this.timeoutMs)); } catch (error) {
            if (error instanceof NativeCatError) continue;
            throw error;
          }
          if (decoded.type === expected && accept(decoded.data)) return decoded.data;
        }
      } catch (error) {
        failure = error;
      }
    }
    throw failure || new NativeCatError("CAT timeout", "timeout");
  }

  async exchange(operation, frequency10Hz = 0, uplink10Hz = null) {
    this.sequence = (this.sequence + 1) & 0xffff;
    const sequence = this.sequence;
    const v2 = uplink10Hz !== null;
    const data = await this.request(0x7b00, quanshengCatPayload({ operation, sequence, frequency10Hz, uplink10Hz }), 0x7b01,
      reply => (reply.length === 16 || (v2 && reply.length === 20)) && reply.readUInt16LE(2) === sequence);
    return quanshengParseCat(data, { operation, sequence, v2 });
  }

  async ptt(operation, accepted) {
    this.sequence = (this.sequence + 1) & 0xffff;
    const sequence = this.sequence;
    const data = await this.request(0x7b02, quanshengPttPayload({ operation, sequence }), 0x7b03, reply => reply.length === 16 && reply.readUInt16LE(2) === sequence);
    return quanshengParsePtt(data, { sequence, accepted });
  }

  async getFreq() {
    const state = await this.exchange(0);
    if (!state.active) throw new NativeCatError("radio not armed for CAT", "not-armed");
    return state.frequency10Hz * 10;
  }

  async setFreq(hz) {
    const tenHz = Math.round(hz / 10);
    if (!quanshengInBand(tenHz)) throw new NativeCatError("frequency outside 136-174 / 400-470 MHz", "range");
    const state = await this.exchange(1, tenHz);
    if (!state.active) throw new NativeCatError("radio not armed for CAT", "not-armed");
    return state;
  }

  // Modes and S-meter are not part of the CAT v1/v2 payloads: pendiente de fuente.
  async getMode() { return null; }
  async getStrength() { return null; }

  async getPtt() { return (await this.ptt(0, [0, 7])).keyed; }

  async setPtt(on) {
    if (!on) return this.ptt(2, [0, 1]);
    if (!this.allowTx) throw new NativeCatError("PTT disabled by configuration", "tx-disabled");
    try { return await this.ptt(1, [0, 1]); } catch (error) {
      await this.ptt(2, [0, 1]).catch(() => {});
      throw error;
    }
  }
}

// ---- Yaesu FT-817/818/857/897 five-byte CAT (YaesuFiveByte in RigProtocols.kt) ----
const FIVE_BYTE_MODES = Object.freeze({ 0x00: "LSB", 0x01: "USB", 0x02: "CW", 0x82: "CW", 0x03: "CWR", 0x83: "CWR", 0x04: "AM", 0x06: "WFM", 0x08: "FM", 0x88: "FM", 0x0a: "PKTUSB", 0x0c: "PKTFM" });
const FIVE_BYTE_MODE_CODES = Object.freeze({ LSB: 0x00, USB: 0x01, CW: 0x02, CWR: 0x03, AM: 0x04, WFM: 0x06, FM: 0x08, PKTUSB: 0x0a, PKTFM: 0x0c });

const fiveByte = (opcode, p1 = 0, p2 = 0, p3 = 0, p4 = 0) => Buffer.from([p1, p2, p3, p4, opcode]);

const YaesuFiveByte = Object.freeze({
  // Opcode 01: 8 BCD digits of the frequency in 10 Hz units.
  frequencyCommand(hz) {
    if (!Number.isInteger(hz) || hz < 0 || hz >= 1_000_000_000) throw new NativeCatError("frequency out of range", "range");
    if (hz % 10 !== 0) throw new NativeCatError("resolution is 10 Hz", "range");
    const digits = String(hz / 10).padStart(8, "0");
    const pair = index => (Number(digits[index]) << 4) | Number(digits[index + 1]);
    return fiveByte(0x01, pair(0), pair(2), pair(4), pair(6));
  },
  readFrequencyMode: () => fiveByte(0x03),
  decodeFrequencyMode(bytes) {
    if (bytes.length !== 5) throw new NativeCatError("invalid reply");
    let units = 0;
    for (let index = 0; index < 4; index += 1) {
      const high = bytes[index] >> 4;
      const low = bytes[index] & 15;
      if (high > 9 || low > 9) throw new NativeCatError("invalid BCD digit");
      units = units * 100 + high * 10 + low;
    }
    return { hz: units * 10, mode: FIVE_BYTE_MODES[bytes[4]] || null };
  },
  modeCommand(mode) {
    if (!(mode in FIVE_BYTE_MODE_CODES)) throw new NativeCatError(`mode ${mode} not available`, "unsupported");
    return fiveByte(0x07, FIVE_BYTE_MODE_CODES[mode]);
  },
  ptt: on => fiveByte(on ? 0x08 : 0x88),
  toggleVfo: () => fiveByte(0x81),
  split: on => fiveByte(on ? 0x02 : 0x82)
});

class YaesuFiveByteRig {
  constructor(transport, { allowTx = false, timeoutMs = 500, ackMs = 50 } = {}) {
    this.transport = transport;
    this.allowTx = allowTx;
    this.timeoutMs = timeoutMs;
    this.ackMs = ackMs;
  }

  async send(command) {
    await this.transport.write(command);
    // Some radios acknowledge with one status byte; keep it out of the next reply.
    await Promise.resolve(this.transport.read(1, this.ackMs)).catch(() => {});
  }

  async read() {
    let failure = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.transport.write(YaesuFiveByte.readFrequencyMode());
        return YaesuFiveByte.decodeFrequencyMode(Buffer.from(await this.transport.read(5, this.timeoutMs)));
      } catch (error) { failure = error; }
    }
    throw failure || new NativeCatError("CAT timeout", "timeout");
  }

  async getFreq() { return (await this.read()).hz; }
  async getMode() { return (await this.read()).mode; }

  async setFreq(hz) {
    const rounded = Math.round(hz / 10) * 10;
    await this.send(YaesuFiveByte.frequencyCommand(rounded));
    if ((await this.read()).hz !== rounded) throw new NativeCatError("frequency not confirmed", "unconfirmed");
  }

  setMode(mode) { return this.send(YaesuFiveByte.modeCommand(mode)); }
  setSplit(on) { return this.send(YaesuFiveByte.split(on)); }
  // The five-byte protocol cannot tell the active VFO; toggling twice returns to the starting VFO.
  toggleVfo() { return this.send(YaesuFiveByte.toggleVfo()); }
  async getStrength() { return null; }

  async setPtt(on) {
    if (!on) return this.send(YaesuFiveByte.ptt(false));
    if (!this.allowTx) throw new NativeCatError("PTT disabled by configuration", "tx-disabled");
    try { return await this.send(YaesuFiveByte.ptt(true)); } catch (error) {
      await this.send(YaesuFiveByte.ptt(false)).catch(() => {});
      throw error;
    }
  }
  async getPtt() { return null; }
}

// ---- Kenwood TH-D75 (Th75Rig in RigProtocols.kt): CR-terminated ASCII, "?" and "N" are rejections ----
// Digit <-> mode; the DR (7) mode reads as DV. Band 0 = VFO A (144/220/430 MHz, FM/NFM/DV), band 1 = VFO B (0.1-524 MHz).
const TH75_MODES = Object.freeze({ 0: "FM", 1: "DV", 2: "AM", 3: "LSB", 4: "USB", 5: "CW", 6: "FMN", 7: "DV", 8: "WFM", 9: "CWR" });
const TH75_MODE_CODES = Object.freeze({ FM: 0, DV: 1, AM: 2, LSB: 3, USB: 4, CW: 5, FMN: 6, WFM: 8, CWR: 9 });
const TH75_BAND_A = Object.freeze([[136_000_000, 174_000_000], [216_000_000, 260_000_000], [410_000_000, 470_000_000]]);
const TH75_BAND_A_MODES = Object.freeze(["FM", "FMN", "DV"]);

const Th75 = Object.freeze({
  ID_REPLY: "ID TH-D75",
  frequencyQuery: band => `FQ ${band}\r`,
  frequencyCommand: (band, hz) => `FQ ${band},${String(hz).padStart(10, "0")}\r`,
  modeQuery: band => `MD ${band}\r`,
  modeCommand: (band, code) => `MD ${band},${code}\r`,
  vfoModeQuery: band => `VM ${band}\r`,
  vfoModeCommand: (band, mode) => `VM ${band},${mode}\r`,
  // Numbers after the command word: "FQ 1,0131725000" -> [1, 131725000].
  fields(reply) {
    const text = String(reply).trim();
    const values = text.slice(text.indexOf(" ") + 1).split(",").map(part => Number(part.trim()));
    if (text.indexOf(" ") < 0 || values.some(value => !Number.isFinite(value) || value < 0)) throw new NativeCatError("invalid reply");
    return values;
  }
});

class Th75Rig {
  // transport: { write(text), readLine(timeoutMs) } where a line ends in CR and the terminator is already stripped.
  constructor(transport, { allowTx = false, timeoutMs = 1000 } = {}) {
    this.transport = transport;
    this.allowTx = allowTx;
    this.timeoutMs = timeoutMs;
  }

  async request(command, prefix) {
    await this.transport.write(command);
    const reply = String(await this.transport.readLine(this.timeoutMs)).trim();
    if (reply === "?" || reply === "N") throw new NativeCatError(`radio rejected ${prefix}`, "rejected");
    if (!reply.startsWith(prefix)) throw new NativeCatError("invalid reply");
    return reply;
  }

  async activeBand() {
    const values = Th75.fields(await this.request("BC\r", "BC"));
    if (values.length !== 1 || values[0] > 1) throw new NativeCatError("invalid reply");
    return values[0];
  }

  async bandField(command, prefix, band) {
    const values = Th75.fields(await this.request(command, prefix));
    if (values.length !== 2 || values[0] !== band) throw new NativeCatError("invalid reply");
    return values[1];
  }

  async getFreq(band) {
    const target = band ?? await this.activeBand();
    return this.bandField(Th75.frequencyQuery(target), "FQ", target);
  }

  async getMode(band) {
    const active = band ?? await this.activeBand();
    return TH75_MODES[await this.bandField(Th75.modeQuery(active), "MD", active)] || null;
  }

  async setFreq(hz, band) {
    const target = band ?? await this.activeBand();
    if (target === 0 && !TH75_BAND_A.some(([low, high]) => hz >= low && hz <= high)) throw new NativeCatError("frequency outside the VFO A bands", "range");
    // A frequency can only be set in VFO mode (VM digit 0).
    if (await this.bandField(Th75.vfoModeQuery(target), "VM", target) !== 0) await this.transport.write(Th75.vfoModeCommand(target, 0));
    await this.transport.write(Th75.frequencyCommand(target, hz));
    if (await this.bandField(Th75.frequencyQuery(target), "FQ", target) !== hz) throw new NativeCatError("frequency not confirmed", "unconfirmed");
  }

  async setMode(mode, band) {
    const target = band ?? await this.activeBand();
    if (!(mode in TH75_MODE_CODES)) throw new NativeCatError(`mode ${mode} not available`, "unsupported");
    if (target === 0 && !TH75_BAND_A_MODES.includes(mode)) throw new NativeCatError(`mode ${mode} not available on VFO A`, "unsupported");
    await this.transport.write(Th75.modeCommand(target, TH75_MODE_CODES[mode]));
    if (await this.getMode(target) !== mode) throw new NativeCatError("mode not confirmed", "unconfirmed");
  }

  // TX / RX act on the active band; no split on this radio and no S-meter command in the source: pendiente de fuente.
  async setPtt(on) {
    if (!on) return this.request("RX\r", "RX");
    if (!this.allowTx) throw new NativeCatError("PTT disabled by configuration", "tx-disabled");
    try { return await this.request("TX\r", "TX"); } catch (error) {
      await Promise.resolve(this.transport.write("RX\r")).catch(() => {});
      throw error;
    }
  }
  async getPtt() { return null; }
  async getStrength() { return null; }
}

// ---- rigctld text-protocol facade so the agent can drive a native rig like a rigctld ----
// Supports the subset the agent uses: f, F, m, M, t, T, l STRENGTH. Replies follow rigctld ("RPRT n" on error, -11 not available).
const RPRT_UNAVAILABLE = -11;
const RPRT_INVALID = -1;
const RPRT_IO = -5;

async function handleRigctldLine(rig, line) {
  const [command, ...args] = String(line).trim().split(/\s+/);
  try {
    switch (command) {
      case "f": return `${await rig.getFreq()}\n`;
      case "F": await rig.setFreq(Number(args[0])); return "RPRT 0\n";
      case "m": {
        const mode = await rig.getMode();
        return mode ? `${mode}\n0\n` : `RPRT ${RPRT_UNAVAILABLE}\n`;
      }
      case "M": if (!rig.setMode) return `RPRT ${RPRT_UNAVAILABLE}\n`; await rig.setMode(args[0]); return "RPRT 0\n";
      case "t": {
        const keyed = await rig.getPtt();
        return keyed === null ? `RPRT ${RPRT_UNAVAILABLE}\n` : `${keyed ? 1 : 0}\n`;
      }
      case "T": await rig.setPtt(args[0] === "1"); return "RPRT 0\n";
      case "l": {
        const value = args[0] === "STRENGTH" ? await rig.getStrength() : null;
        return value === null ? `RPRT ${RPRT_UNAVAILABLE}\n` : `${value}\n`;
      }
      default: return `RPRT ${RPRT_UNAVAILABLE}\n`;
    }
  } catch (error) {
    return `RPRT ${error instanceof NativeCatError && ["range", "unsupported", "tx-disabled", "rejected"].includes(error.code) ? RPRT_INVALID : RPRT_IO}\n`;
  }
}

// ---- Xiegu CI-V (G90/G90S, X6100, X5105) ----
// Adapted from Hamlib rigs/icom/xiegu.c, icom.c, icom_defs.h and tests/testg90swr.c (LGPL-2.1-or-later, see docs/THIRD-PARTY-REUSE.md):
// SPDX-FileCopyrightText: Hamlib contributors (Xiegu backend: Michael Black W9MDB, Hamlib Team)
// SPDX-License-Identifier: LGPL-2.1-or-later
// Per-model address, rates and limits are copied from the xiegu.c capability structs (x6100_priv_caps, g90_priv_caps, x108g_priv_caps).
// The G106 has no Hamlib model, so it has no address here: pendiente de fuente.
const CIV = Object.freeze({ PREAMBLE: 0xfe, EOM: 0xfd, CONTROLLER: 0xe0, ACK: 0xfb, NAK: 0xfa, BROADCAST: 0x00 });
const CIV_CMD = Object.freeze({ RD_FREQ: 0x03, RD_MODE: 0x04, SET_FREQ: 0x05, SET_MODE: 0x06, SET_VFO: 0x07, SPLIT: 0x0f, SQSM: 0x15, PTT: 0x1c });
const CIV_SUB = Object.freeze({ S_METER: 0x02, SWR: 0x12, PTT: 0x00, TUNER: 0x01, VFO_A: 0x00, VFO_B: 0x01, SPLIT_OFF: 0x00, SPLIT_ON: 0x01 });
const CIV_TUNER_START = 0x02; // icom_defs.h S_ANT_TUN: 0 = off, 1 = on, 2 = start tuning
// icom_defs.h S_LSB..S_RTTYR; S_FM and S_FMN share 0x05, so FMN reads back as FM.
const CIV_MODES = Object.freeze({ 0x00: "LSB", 0x01: "USB", 0x02: "AM", 0x03: "CW", 0x04: "RTTY", 0x05: "FM", 0x07: "CWR", 0x08: "RTTYR" });
const CIV_MODE_CODES = Object.freeze({ LSB: 0x00, USB: 0x01, AM: 0x02, CW: 0x03, RTTY: 0x04, FM: 0x05, CWR: 0x07, RTTYR: 0x08 });
// xiegu.c X108G_STR_CAL (measurement by WA0TOP) and X6100_STR_CAL: raw 0-255 -> dB relative to S9.
const STR_CAL_X108G = Object.freeze([[0, -54], [5, -29], [15, -27], [43, -22], [68, -17], [92, -12], [120, -6], [141, 2], [162, 13], [182, 25], [202, 38], [222, 47], [241, 57], [255, 63]]);
const STR_CAL_X6100 = Object.freeze([[0, -54], [120, 0], [241, 60]]);
// icom.c icom_default_swr_cal: raw 0-255 -> SWR ratio.
const SWR_CAL = Object.freeze([[0, 1.0], [48, 1.5], [80, 2.0], [120, 3.0], [240, 6.0]]);

const XIEGU_MODELS = Object.freeze({
  "xiegu-g90": Object.freeze({ hamlibModel: 3088, address: 0x88, baudMin: 19200, baudMax: 19200, strCal: STR_CAL_X108G, tuner: true, split: true, maxRitHz: 500, ids: [0x0070, 0x0090] }),
  "xiegu-x6100": Object.freeze({ hamlibModel: 3087, address: 0xa4, baudMin: 300, baudMax: 19200, strCal: STR_CAL_X6100, tuner: false, split: false, maxRitHz: 9999, ids: [0x6100, 0x00a4] }),
  "xiegu-x5105": Object.freeze({ hamlibModel: 3089, address: 0x70, baudMin: 300, baudMax: 19200, strCal: STR_CAL_X108G, tuner: false, split: true, maxRitHz: 9999, ids: [] })
});

function calInterpolate(table, raw) {
  if (raw <= table[0][0]) return table[0][1];
  for (let index = 1; index < table.length; index += 1) {
    const [x1, y1] = table[index];
    if (raw <= x1) {
      const [x0, y0] = table[index - 1];
      return y0 + (y1 - y0) * (raw - x0) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

// Low-nibble-first BCD: five bytes, 10 digits, 1 Hz digit first (icom.c to_bcd / from_bcd).
function civEncodeFreq(hz) {
  if (!Number.isInteger(hz) || hz < 0 || hz > 9_999_999_999) throw new NativeCatError("frequency out of bounds", "range");
  const out = Buffer.alloc(5);
  let rest = hz;
  for (let index = 0; index < 5; index += 1) {
    out[index] = (Math.floor(rest / 10) % 10) << 4 | rest % 10;
    rest = Math.floor(rest / 100);
  }
  return out;
}

function civDecodeFreq(bytes) {
  if (bytes.length !== 5) throw new NativeCatError("invalid reply");
  let hz = 0;
  for (let index = 4; index >= 0; index -= 1) {
    const high = bytes[index] >> 4;
    const low = bytes[index] & 15;
    if (high > 9 || low > 9) throw new NativeCatError("invalid BCD digit");
    hz = hz * 100 + high * 10 + low;
  }
  return hz;
}

const civFrame = (to, command, data = []) => Buffer.from([CIV.PREAMBLE, CIV.PREAMBLE, to, CIV.CONTROLLER, ...command, ...data, CIV.EOM]);

// Big-endian BCD pair after the sub-command: 0000-0255. Anything with a non-decimal nibble is rejected (testg90swr.c: 02 2c).
function civMeterRaw(payload) {
  if (payload.length !== 2 || payload[0] > 0x09 || (payload[1] >> 4) > 9 || (payload[1] & 15) > 9) throw new NativeCatError("invalid meter reply");
  return (payload[0] >> 4) * 1000 + (payload[0] & 15) * 100 + (payload[1] >> 4) * 10 + (payload[1] & 15);
}

class XieguCivRig {
  // transport: { write(buffer), read(length, timeoutMs) } as for the Yaesu rig; model: a key of XIEGU_MODELS.
  constructor(transport, { radio, allowTx = false, timeoutMs = 1000, address } = {}) {
    const model = XIEGU_MODELS[radio];
    if (!model) throw new NativeCatError(`${radio || "xiegu-civ"}: pendiente de fuente`, "unsupported");
    this.transport = transport;
    this.model = model;
    this.address = address === undefined ? model.address : address;
    this.allowTx = allowTx;
    this.timeoutMs = timeoutMs;
  }

  async readFrame() {
    const bytes = [];
    for (let guard = 0; guard < 64; guard += 1) {
      const byte = (await this.transport.read(1, this.timeoutMs))[0];
      bytes.push(byte);
      if (byte === CIV.EOM) return Buffer.from(bytes);
    }
    throw new NativeCatError("frame too long");
  }

  // Sends a frame and returns { command, data } of the radio's answer; the USB echo of our own frame and transceive broadcasts are skipped.
  async transact(command, data = []) {
    await this.transport.write(civFrame(this.address, command, data));
    for (let skipped = 0; skipped < 8; skipped += 1) {
      const frame = await this.readFrame();
      if (frame.length < 6 || frame[0] !== CIV.PREAMBLE || frame[1] !== CIV.PREAMBLE) throw new NativeCatError("frame corrupt");
      if (frame[3] === CIV.CONTROLLER && frame[2] === this.address) continue;
      if (frame[2] === CIV.BROADCAST) continue;
      if (frame[2] !== CIV.CONTROLLER || frame[3] !== this.address) throw new NativeCatError("unexpected sender");
      return { command: frame[4], data: frame.subarray(5, frame.length - 1) };
    }
    throw new NativeCatError("CAT timeout", "timeout");
  }

  async query(command, expected) {
    const reply = await this.transact(command);
    if (reply.command === CIV.NAK) throw new NativeCatError("radio rejected the command", "rejected");
    if (reply.command !== expected[0] || (expected.length > 1 && reply.data[0] !== expected[1])) throw new NativeCatError("invalid reply");
    return reply.data;
  }

  async ack(command, data) {
    const reply = await this.transact(command, data);
    // Xiegu answers some writes with the command echo instead of FB (x108g_set_ptt, g90_set_level).
    if (reply.command === CIV.ACK || reply.command === command[0]) return;
    throw new NativeCatError("radio rejected the command", "rejected");
  }

  async getFreq() { return civDecodeFreq(await this.query([CIV_CMD.RD_FREQ], [CIV_CMD.RD_FREQ])); }

  async getMode() {
    const data = await this.query([CIV_CMD.RD_MODE], [CIV_CMD.RD_MODE]);
    if (data.length < 1) throw new NativeCatError("invalid reply");
    return CIV_MODES[data[0]] || null;
  }

  async setFreq(hz) {
    await this.ack([CIV_CMD.SET_FREQ], civEncodeFreq(Math.round(hz)));
    if ((await this.getFreq()) !== Math.round(hz)) throw new NativeCatError("frequency not confirmed", "unconfirmed");
  }

  async setMode(mode) {
    if (!(mode in CIV_MODE_CODES)) throw new NativeCatError(`mode ${mode} not available`, "unsupported");
    await this.ack([CIV_CMD.SET_MODE], [CIV_MODE_CODES[mode]]);
    if ((await this.getMode()) !== mode) throw new NativeCatError("mode not confirmed", "unconfirmed");
  }

  async setVfo(vfo) {
    if (vfo !== "A" && vfo !== "B") throw new NativeCatError(`VFO ${vfo} not available`, "unsupported");
    return this.ack([CIV_CMD.SET_VFO], [vfo === "A" ? CIV_SUB.VFO_A : CIV_SUB.VFO_B]);
  }

  // xiegu.c: the X6100 rejected 0F 01, so split is only offered where the Hamlib backend wires it.
  async setSplit(on) {
    if (!this.model.split) throw new NativeCatError("split not available on this model", "unsupported");
    return this.ack([CIV_CMD.SPLIT], [on ? CIV_SUB.SPLIT_ON : CIV_SUB.SPLIT_OFF]);
  }

  // Raw 0-255 S-meter (15 02) and its dB-over-S9 value from the Hamlib calibration of the model.
  async getStrengthRaw() { return civMeterRaw((await this.query([CIV_CMD.SQSM, CIV_SUB.S_METER], [CIV_CMD.SQSM, CIV_SUB.S_METER])).subarray(1)); }
  async getStrength() { return calInterpolate(this.model.strCal, await this.getStrengthRaw()); }

  async getSwr() {
    return calInterpolate(SWR_CAL, civMeterRaw((await this.query([CIV_CMD.SQSM, CIV_SUB.SWR], [CIV_CMD.SQSM, CIV_SUB.SWR])).subarray(1)));
  }

  // PTT off is never gated and always sent; PTT on needs allowTx and tries a release when the key-up fails.
  async setPtt(on) {
    if (!on) return this.ack([CIV_CMD.PTT, CIV_SUB.PTT], [0]);
    if (!this.allowTx) throw new NativeCatError("PTT disabled by configuration", "tx-disabled");
    try { return await this.ack([CIV_CMD.PTT, CIV_SUB.PTT], [1]); } catch (error) {
      await this.ack([CIV_CMD.PTT, CIV_SUB.PTT], [0]).catch(() => {});
      throw error;
    }
  }
  async getPtt() { return (await this.query([CIV_CMD.PTT, CIV_SUB.PTT], [CIV_CMD.PTT, CIV_SUB.PTT]))[1] === 1; }

  // Built-in ATU (xiegu.c G90_FUNCS RIG_FUNC_TUNER, 1C 01): G90 only. Starting a tune keys the radio, so it needs allowTx;
  // the time cap and SWR trip live in the agent, and stopping (data 00) is never gated.
  async setTuner(on) {
    if (!this.model.tuner) throw new NativeCatError("tuner not available on this model", "unsupported");
    if (!on) return this.ack([CIV_CMD.PTT, CIV_SUB.TUNER], [0]);
    if (!this.allowTx) throw new NativeCatError("tune disabled by configuration", "tx-disabled");
    try { return await this.ack([CIV_CMD.PTT, CIV_SUB.TUNER], [CIV_TUNER_START]); } catch (error) {
      await this.ack([CIV_CMD.PTT, CIV_SUB.TUNER], [0]).catch(() => {});
      throw error;
    }
  }
}

// nativeProtocol (data/remote-station-catalog.json) -> rig class. Xiegu CI-V needs options.radio (a sourced model); the G106 has no sourced address.
const NATIVE_RIGS = Object.freeze({ "quansheng-cat": QuanshengRig, "yaesu-five-byte": YaesuFiveByteRig, "kenwood-th-d75": Th75Rig, "xiegu-civ": XieguCivRig });

function createNativeRig(nativeProtocol, transport, options) {
  const Rig = NATIVE_RIGS[nativeProtocol];
  if (!Rig) throw new NativeCatError(`${nativeProtocol}: pendiente de fuente`, "unsupported");
  return new Rig(transport, options);
}

module.exports = {
  NativeCatError, crc16, quanshengEncode, quanshengDecode, quanshengInBand, quanshengCatPayload, quanshengParseCat,
  quanshengPttPayload, quanshengParsePtt, readQuanshengFrame, QuanshengRig, YaesuFiveByte, YaesuFiveByteRig, Th75, Th75Rig,
  XieguCivRig, XIEGU_MODELS, civEncodeFreq, civDecodeFreq, handleRigctldLine, createNativeRig, NATIVE_RIGS, bytesEqual
};
