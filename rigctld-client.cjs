"use strict";
// Minimal Hamlib rigctld client (text protocol over TCP). One command in flight at a time, per-command
// timeout, automatic reconnect. The socket factory is injectable so tests can talk to a fake rigctld.
const net = require("node:net");
const { EventEmitter } = require("node:events");

class RigctldError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "RigctldError";
    this.code = code;
  }
}

// Number of reply lines for each "get" command when the rig answers successfully (errors are a single RPRT line).
const GET_LINES = Object.freeze({ f: 1, m: 2, t: 1, l: 1, u: 1, v: 1, s: 2 });
// Levels/functions the console may touch; anything else is never sent to rigctld.
const LEVEL_NAMES = Object.freeze(["AF", "RF", "RFPOWER", "PREAMP", "ATT", "AGC"]);
const FUNC_NAMES = Object.freeze(["NB", "NR", "TUNER"]);
const VFO_NAMES = Object.freeze(["VFOA", "VFOB", "Main", "Sub", "MEM"]);
// Read-only transmit meters, polled while the PTT is on.
const METER_NAMES = Object.freeze(["RFPOWER_METER_WATTS", "SWR", "ALC"]);
// Raw CAT strings: upper-case letters/digits only, and only when the radio entry allows that exact string.
const RAW_FORMAT = /^[A-Z0-9]{1,8}$/;
const KEYER_FORMAT = /^(KM[1-5][A-Z0-9 /?,.=+\-():@]{1,50}|KY0[0-5]);$/;
const MORSE_FORMAT = /^[A-Z0-9 /?,.=+\-():@]{1,80}$/;
// Safety net only: a set normally completes on rigctld's immediate NUL.
const RAW_IDLE_MS = 1000;
// `\dump_caps` has no fixed length: it ends with a RPRT line, or (older builds) simply goes quiet.
const BLOCK_IDLE_MS = 250;

function splitTokens(text) {
  return text.trim().split(/\s+(?![^(]*\))/).filter(Boolean);
}

// Parses the output of `\dump_caps` into the capabilities the console cares about.
function parseCaps(lines) {
  const caps = { model: "", level: {}, func: {}, tune: false };
  let maker = "";
  const entry = (group, names, name) => {
    if (!names.includes(name)) return null;
    return (group[name] ||= { get: false, set: false });
  };
  for (const raw of lines) {
    const line = String(raw).trim();
    const field = /^([A-Za-z ]+?):\s*(.*)$/.exec(line);
    if (!field) continue;
    const key = field[1].toLowerCase();
    const rest = field[2];
    if (key === "model name") caps.model = rest.replace(/[^\x20-\x7e]/g, "").slice(0, 40);
    else if (key === "mfg name") maker = rest.replace(/[^\x20-\x7e]/g, "").slice(0, 24);
    else if (key === "vfo ops" || key === "vfo op") caps.tune = splitTokens(rest).includes("TUNE");
    else if (key === "get level" || key === "set level") {
      const mode = key.startsWith("get") ? "get" : "set";
      for (const token of splitTokens(rest)) {
        const parsed = /^([A-Z0-9_]+)(?:\((.*)\))?$/.exec(token);
        const item = parsed && entry(caps.level, [...LEVEL_NAMES, ...METER_NAMES], parsed[1]);
        if (!item) continue;
        item[mode] = true;
        if (parsed[2] && !parsed[2].includes("..")) {
          const values = parsed[2].split(/[,\s]+/).map(part => Number.parseInt(part, 10)).filter(value => Number.isInteger(value) && value > 0);
          if (values.length) item.values = [...new Set([...(item.values || []), ...values])];
        }
      }
    } else if (key === "get functions" || key === "set functions") {
      const mode = key.startsWith("get") ? "get" : "set";
      for (const token of splitTokens(rest)) {
        const item = entry(caps.func, FUNC_NAMES, token);
        if (item) item[mode] = true;
      }
    }
  }
  caps.model = [maker, caps.model].filter(Boolean).join(" ");
  return caps;
}

class RigctldClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || "127.0.0.1";
    this.port = options.port || 4532;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.reconnectMs = options.reconnectMs ?? 3000;
    this.rawAllow = new Set(options.rawAllow || []);
    // Exact-shape matchers for sourced commands longer than RAW_FORMAT (FTX-1 EX menu, see radio-settings.cjs).
    this.rawMatchers = (options.rawMatchers || []).filter(matcher => matcher instanceof RegExp);
    this.rawIdleMs = options.rawIdleMs ?? RAW_IDLE_MS;
    this.socketFactory = options.socketFactory || ((port, host) => net.connect({ port, host }));
    this.connected = false;
    this.socket = null;
    this.running = false;
    this.queue = [];
    this.current = null;
    this.buffer = "";
    this.lines = [];
    this.ghosts = [];
    this.reconnectTimer = null;
  }

  // Commands queued behind the one in flight.
  get pending() { return this.queue.length; }

  start() {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop() {
    this.running = false;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    this.dropConnection(new RigctldError("client stopped", "stopped"), false);
    if (socket) socket.destroy();
  }

  connect() {
    if (!this.running || this.socket) return;
    let socket;
    try {
      socket = this.socketFactory(this.port, this.host);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.setEncoding?.("utf8");
    socket.setNoDelay?.(true);
    socket.on("connect", () => {
      if (this.socket !== socket) return;
      this.connected = true;
      this.buffer = "";
      this.lines = [];
      this.emit("connect");
      this.pump();
    });
    socket.on("data", chunk => {
      if (this.socket !== socket) return;
      this.buffer += chunk;
      this.consume();
    });
    socket.on("error", () => {});
    socket.on("close", () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.dropConnection(new RigctldError("rigctld disconnected", "disconnected"), true);
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    if (!this.running || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectMs);
    this.reconnectTimer.unref?.();
  }

  dropConnection(error, emit) {
    const wasConnected = this.connected;
    this.connected = false;
    const pending = [this.current, ...this.queue].filter(Boolean);
    this.current = null;
    this.queue = [];
    this.buffer = "";
    this.lines = [];
    for (const item of pending) {
      clearTimeout(item.timer);
      clearTimeout(item.idle);
      item.reject(error);
    }
    if (emit && wasConnected) this.emit("disconnect");
  }

  // Queue one rigctld command. `priority` jumps ahead of waiting commands (used for PTT off);
  // `block` collects a variable-length reply (`\dump_caps`).
  send(line, { priority = false, block = false, raw = false, read = false, idleMs = 0, timeoutMs = 0, abandon = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new RigctldError("rigctld not connected", "disconnected"));
        return;
      }
      const item = { line, block, raw, read, idleMs, timeoutMs, abandon, cmd: raw ? line.split(" ")[1].replace(";", "") : "", queuedAt: Date.now(), expected: GET_LINES[line.split(" ")[0]] || 0, resolve, reject, timer: null, idle: null };
      if (priority) this.queue.unshift(item); else this.queue.push(item);
      this.pump();
    });
  }

  // Age in ms of the oldest command still waiting for an answer (in flight or queued); 0 when idle.
  oldestPendingMs() {
    const items = [this.current, ...this.queue].filter(Boolean);
    return items.length ? Date.now() - Math.min(...items.map(item => item.queuedAt)) : 0;
  }

  // Queues several commands while the pump is paused, so none is dispatched before the whole batch is in place.
  holdPump(fn) {
    this.pumpHeld = (this.pumpHeld || 0) + 1;
    try { return fn(); } finally { this.pumpHeld -= 1; this.pump(); }
  }

  pump() {
    if (this.pumpHeld || this.current || !this.connected || !this.queue.length || !this.socket) return;
    const item = this.queue.shift();
    this.current = item;
    this.lines = [];
    this.ghosts = this.ghosts.filter(ghost => ghost.cmd !== item.cmd && Date.now() - ghost.at < GHOST_TTL_MS);
    item.timer = setTimeout(() => {
      if (this.current !== item) return;
      if (item.abandon && item.raw && item.read) {
        // The late reply is recognised by its command prefix and discarded; the connection stays up.
        this.ghosts.push({ cmd: item.cmd, at: Date.now() });
        this.buffer = "";
        this.finish(item, new RigctldError(`rigctld timeout on "${item.line}"`, "timeout"));
        return;
      }
      // A late answer would desynchronise the stream: drop the connection and reconnect.
      const socket = this.socket;
      this.socket = null;
      this.dropConnection(new RigctldError(`rigctld timeout on "${item.line}"`, "timeout"), true);
      socket?.destroy();
      this.scheduleReconnect();
    }, item.timeoutMs || this.timeoutMs);
    this.socket.write(`${item.line}\n`);
    // A raw set the radio does not answer must not drop the connection: it just goes quiet.
    if (item.raw && !item.read) this.armRawIdle(item);
  }

  armRawIdle(item) {
    clearTimeout(item.idle);
    item.idle = setTimeout(() => {
      if (this.current === item) this.finishRaw(item, this.buffer);
    }, item.idleMs || this.rawIdleMs);
  }

  // Raw replies end with NUL (e.g. "PC2010;\0"); a rejected command answers "?;".
  consumeRaw(item) {
    this.discardGhostReplies();
    if (!this.buffer) return;
    // Hamlib 4.7.2 may prefix a report with NUL bytes; in raw mode NUL is also the terminator, so only tolerate it before RPRT.
    const report = /^[\0 \t]*RPRT[ \t]+(-?\d+)[ \t]*\r?\n/.exec(this.buffer);
    if (report) {
      this.buffer = this.buffer.slice(report[0].length);
      const code = Number(report[1]);
      this.finish(item, code === 0 ? null : new RigctldError(`rigctld error RPRT ${code}`, code), code === 0 ? null : undefined);
      return;
    }
    const end = this.buffer.indexOf("\0");
    if (end >= 0) {
      const text = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      this.finishRaw(item, text);
      return;
    }
    // No terminator seen: whatever arrived counts as the reply once the line goes quiet.
    this.armRawIdle(item);
  }

  // Drops complete replies that belong to abandoned (timed-out) reads.
  discardGhostReplies() {
    let end;
    while (this.ghosts.length && (end = this.buffer.indexOf("\0")) >= 0) {
      const index = this.ghosts.findIndex(ghost => this.buffer.startsWith(ghost.cmd));
      if (index < 0) return;
      this.ghosts.splice(index, 1);
      this.buffer = this.buffer.slice(end + 1);
    }
  }

  finishRaw(item, text) {
    this.buffer = "";
    const reply = String(text).replace(/[\0\r\n]/g, "").trim();
    if (reply.startsWith("?")) this.finish(item, new RigctldError("radio rejected the raw command", "rejected"));
    else this.finish(item, null, reply || null);
  }

  consume() {
    if (!this.current) { this.discardGhostReplies(); this.buffer = ""; return; }
    if (this.current.raw) { this.consumeRaw(this.current); return; }
    let index;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      // Hamlib 4.7.2 can emit stray NUL bytes (e.g. "\0RPRT 0"); they are never part of a reply line.
      const line = this.buffer.slice(0, index).replace(/\0/g, "").replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!this.current) continue;
      this.lines.push(line);
      this.settle();
    }
  }

  settle() {
    const item = this.current;
    const first = this.lines[0];
    // Hamlib 4.7.2 can answer " RPRT 0" with a leading space: surrounding whitespace is not an error.
    const report = /^\s*RPRT\s+(-?\d+)\s*$/.exec(first);
    let done = false;
    let error = null;
    let result = null;
    if (report) {
      done = true;
      const code = Number(report[1]);
      if (code === 0) result = [];
      else error = new RigctldError(`rigctld error RPRT ${code}`, code);
    } else if (item.block) {
      const last = /^\s*RPRT\s+(-?\d+)\s*$/.exec(this.lines[this.lines.length - 1]);
      if (last) {
        done = true;
        if (Number(last[1]) === 0) result = this.lines.slice(0, -1);
        else error = new RigctldError(`rigctld error RPRT ${last[1]}`, Number(last[1]));
      } else {
        clearTimeout(item.idle);
        item.idle = setTimeout(() => {
          if (this.current !== item) return;
          this.finish(item, null, this.lines.slice());
        }, BLOCK_IDLE_MS);
        return;
      }
    } else if (item.expected && this.lines.length >= item.expected) {
      done = true;
      result = this.lines.slice();
    } else if (!item.expected) {
      done = true;
      error = new RigctldError(`unexpected reply "${first}"`, "protocol");
    }
    if (!done) return;
    this.finish(item, error, result);
  }

  finish(item, error, result) {
    clearTimeout(item.timer);
    clearTimeout(item.idle);
    this.current = null;
    this.lines = [];
    if (error) item.reject(error); else item.resolve(result);
    this.pump();
  }

  async getFreq() {
    const [reply] = await this.send("f");
    const hz = Number(reply);
    if (!Number.isFinite(hz)) throw new RigctldError(`bad frequency "${reply}"`, "protocol");
    return Math.round(hz);
  }

  setFreq(hz) { return this.send(`F ${hz}`); }

  async getMode() {
    const [mode, passband] = await this.send("m");
    return { mode: mode.trim(), passband: Number.parseInt(passband, 10) || 0 };
  }

  setMode(mode, passband = 0) { return this.send(`M ${mode} ${passband}`); }

  async getPtt() {
    const [reply] = await this.send("t");
    return Number(reply) > 0;
  }

  setPtt(on, options) { return this.send(`T ${on ? 1 : 0}`, options); }

  // Signal strength in dB relative to S9; null when the rig does not support it.
  async getStrength() {
    try {
      const [reply] = await this.send("l STRENGTH");
      const value = Number(reply);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      if (error instanceof RigctldError && typeof error.code === "number") return null;
      throw error;
    }
  }

  async getVfo() {
    const [reply] = await this.send("v");
    return reply.trim();
  }

  setVfo(vfo) {
    if (!VFO_NAMES.includes(vfo)) throw new RigctldError(`vfo "${vfo}" not allowed`, "invalid");
    return this.send(`V ${vfo}`);
  }

  async getSplit() {
    const [split, txVfo] = await this.send("s");
    return { split: Number(split) > 0, txVfo: txVfo.trim() };
  }

  setSplit(on, txVfo = "VFOB") {
    if (!VFO_NAMES.includes(txVfo)) throw new RigctldError(`vfo "${txVfo}" not allowed`, "invalid"); return this.send(`S ${on ? 1 : 0} ${txVfo}`); }

  // Level value, or null when the rig does not support/answer it (RPRT error).
  async getLevel(name, { timeoutMs = 0 } = {}) {
    if (!LEVEL_NAMES.includes(name) && !METER_NAMES.includes(name)) throw new RigctldError(`level "${name}" not allowed`, "invalid");
    try {
      const [reply] = await this.send(`l ${name}`, { timeoutMs });
      const value = Number(reply);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      if (error instanceof RigctldError && typeof error.code === "number") return null;
      throw error;
    }
  }

  setLevel(name, value) {
    if (!LEVEL_NAMES.includes(name)) throw new RigctldError(`level "${name}" not allowed`, "invalid");
    if (typeof value !== "number" || !Number.isFinite(value)) throw new RigctldError("level value must be a number", "invalid");
    return this.send(`L ${name} ${value}`);
  }

  async getFunc(name) {
    if (!FUNC_NAMES.includes(name)) throw new RigctldError(`function "${name}" not allowed`, "invalid");
    try {
      const [reply] = await this.send(`u ${name}`);
      const value = Number(reply);
      return Number.isFinite(value) ? value > 0 : null;
    } catch (error) {
      if (error instanceof RigctldError && typeof error.code === "number") return null;
      throw error;
    }
  }

  setFunc(name, on) {
    if (!FUNC_NAMES.includes(name)) throw new RigctldError(`function "${name}" not allowed`, "invalid");
    return this.send(`U ${name} ${on ? 1 : 0}`);
  }

  tune() { return this.send("G TUNE"); }

  // Raw CAT through rigctld's `W` command. `read` commands wait for the reply; others resolve with null
  // on rigctld's single NUL (or after a long safety silence). Rejects with code "rejected" on a "?;" reply.
  // `abandon`: a timed-out read is dropped without reconnecting; its late reply is discarded by command prefix.
  sendRaw(cmd, { priority = false, read = false, idleMs = 0, timeoutMs = 0, abandon = false } = {}) {
    const matched = typeof cmd === "string" && cmd.length <= 24 && this.rawMatchers.some(matcher => matcher.test(cmd));
    if (!matched && (typeof cmd !== "string" || !RAW_FORMAT.test(cmd) || !this.rawAllow.has(cmd))) {
      return Promise.reject(new RigctldError("raw command not allowed", "invalid"));
    }
    // Sets use expected reply length 0 ("; 0"): rigctld answers a single NUL at once. The "; ;" terminator form
    // makes it wait ~1.8 s for a reply the radio never sends, blocking every following command.
    return this.send(read ? `W ${cmd}; ;` : `W ${cmd}; 0`, { priority, raw: true, read, idleMs, timeoutMs, abandon });
  }

  // CW keyer commands built by remote-cw.cjs: FTX-1 `KM<slot><text>;` / `KY0<slot>;` / `KY00;` as raw CAT (docs/FTX1-KNOWLEDGE.md).
  sendKeyer(cmd, { priority = false } = {}) {
    if (typeof cmd !== "string" || !KEYER_FORMAT.test(cmd)) return Promise.reject(new RigctldError("keyer command not allowed", "invalid"));
    return this.send(`W ${cmd} 0`, { priority, raw: true });
  }

  // Hamlib send_morse (`b`), the generic baseline for radios without a sourced native keyer command.
  sendMorse(text) {
    if (typeof text !== "string" || !MORSE_FORMAT.test(text)) return Promise.reject(new RigctldError("morse text not allowed", "invalid"));
    return this.send(`b ${text}`);
  }

  async dumpCaps() {
    return parseCaps(await this.send("\\dump_caps", { block: true }));
  }
}

const STOP_IDLE_MS = 100;
const GHOST_TTL_MS = 10_000;

function withinMs(promise, ms) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new RigctldError(`no answer within ${ms} ms`, "timeout")), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

// Stops any transmission, in this order: tuner stop (only when a tune may be active, or the tuner is an ATAS whose
// stop is harmless), raw txOff, then Hamlib `T 0`. Every step has queue priority and none waits more than `stepMs`
// for the previous one. Resolves true when all steps were acknowledged.
async function stopSequence(client, { cat = null, tunerKind = "internal", tuner = false, stepMs = 1000, log = () => {} } = {}) {
  const steps = [];
  const tunerStop = cat?.tuner?.[tunerKind]?.stop;
  if (tunerStop && (tuner || tunerKind === "atas")) steps.push([tunerStop, () => client.sendRaw(tunerStop, { priority: true, idleMs: STOP_IDLE_MS })]);
  if (cat?.txOff) steps.push([cat.txOff, () => client.sendRaw(cat.txOff, { priority: true, idleMs: STOP_IDLE_MS })]);
  steps.push(["T 0", () => client.setPtt(false, { priority: true })]);
  // Every step is queued at once (last first, so the head of the queue keeps the order): no queued meter or tune
  // poll can slip in between two stop commands. Each step still gets its own stepMs once its turn comes.
  const started = [];
  const queueAll = () => {
    for (const [name, run] of [...steps].reverse()) {
      const pending = run();
      pending.catch(() => {});
      started.unshift([name, pending]);
    }
  };
  if (typeof client.holdPump === "function") client.holdPump(queueAll); else queueAll();
  let ok = true;
  for (const [name, pending] of started) {
    try { await withinMs(pending, stepMs); } catch (error) { ok = false; log(`stop ${name} failed: ${error.message}`); }
  }
  return ok;
}

module.exports = { RigctldClient, RigctldError, parseCaps, stopSequence, LEVEL_NAMES, FUNC_NAMES, VFO_NAMES, METER_NAMES };
