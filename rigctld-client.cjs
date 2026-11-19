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
const GET_LINES = Object.freeze({ f: 1, m: 2, t: 1, l: 1, v: 1, s: 2 });

class RigctldClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || "127.0.0.1";
    this.port = options.port || 4532;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.reconnectMs = options.reconnectMs ?? 3000;
    this.socketFactory = options.socketFactory || ((port, host) => net.connect({ port, host }));
    this.connected = false;
    this.socket = null;
    this.running = false;
    this.queue = [];
    this.current = null;
    this.buffer = "";
    this.lines = [];
    this.reconnectTimer = null;
  }

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
      item.reject(error);
    }
    if (emit && wasConnected) this.emit("disconnect");
  }

  // Queue one rigctld command. `priority` jumps ahead of waiting commands (used for PTT off).
  send(line, { priority = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new RigctldError("rigctld not connected", "disconnected"));
        return;
      }
      const item = { line, expected: GET_LINES[line.split(" ")[0]] || 0, resolve, reject, timer: null };
      if (priority) this.queue.unshift(item); else this.queue.push(item);
      this.pump();
    });
  }

  pump() {
    if (this.current || !this.connected || !this.queue.length || !this.socket) return;
    const item = this.queue.shift();
    this.current = item;
    this.lines = [];
    item.timer = setTimeout(() => {
      // A late answer would desynchronise the stream: drop the connection and reconnect.
      if (this.current !== item) return;
      const socket = this.socket;
      this.socket = null;
      this.dropConnection(new RigctldError(`rigctld timeout on "${item.line}"`, "timeout"), true);
      socket?.destroy();
      this.scheduleReconnect();
    }, this.timeoutMs);
    this.socket.write(`${item.line}\n`);
  }

  consume() {
    let index;
    while ((index = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      if (!this.current) continue;
      this.lines.push(line);
      this.settle();
    }
  }

  settle() {
    const item = this.current;
    const first = this.lines[0];
    const report = /^RPRT (-?\d+)$/.exec(first);
    let done = false;
    let error = null;
    let result = null;
    if (report) {
      done = true;
      const code = Number(report[1]);
      if (code === 0) result = [];
      else error = new RigctldError(`rigctld error RPRT ${code}`, code);
    } else if (item.expected && this.lines.length >= item.expected) {
      done = true;
      result = this.lines.slice();
    } else if (!item.expected) {
      done = true;
      error = new RigctldError(`unexpected reply "${first}"`, "protocol");
    }
    if (!done) return;
    clearTimeout(item.timer);
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

  setVfo(vfo) { return this.send(`V ${vfo}`); }

  async getSplit() {
    const [split, txVfo] = await this.send("s");
    return { split: Number(split) > 0, txVfo: txVfo.trim() };
  }

  setSplit(on, txVfo = "VFOB") { return this.send(`S ${on ? 1 : 0} ${txVfo}`); }
}

module.exports = { RigctldClient, RigctldError };
