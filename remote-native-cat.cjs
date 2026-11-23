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

// nativeProtocol (data/remote-station-catalog.json) -> rig class. Xiegu CI-V stays unsourced (address, framing, baud): no rig.
const NATIVE_RIGS = Object.freeze({ "quansheng-cat": QuanshengRig, "yaesu-five-byte": YaesuFiveByteRig, "kenwood-th-d75": Th75Rig });

function createNativeRig(nativeProtocol, transport, options) {
  const Rig = NATIVE_RIGS[nativeProtocol];
  if (!Rig) throw new NativeCatError(`${nativeProtocol}: pendiente de fuente`, "unsupported");
  return new Rig(transport, options);
}

module.exports = {
  NativeCatError, crc16, quanshengEncode, quanshengDecode, quanshengInBand, quanshengCatPayload, quanshengParseCat,
  quanshengPttPayload, quanshengParsePtt, readQuanshengFrame, QuanshengRig, YaesuFiveByte, YaesuFiveByteRig, Th75, Th75Rig,
  handleRigctldLine, createNativeRig, NATIVE_RIGS, bytesEqual
};
