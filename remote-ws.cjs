"use strict";
// Minimal RFC 6455 server side: handshake, text/binary frames, fragmentation, ping/pong and close codes.
// Clients must mask every frame; messages larger than maxPayload close the socket with 1009.
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_PAYLOAD = 4096;

const acceptKey = key => crypto.createHash("sha1").update(key + GUID).digest("base64");

function encodeFrame(opcode, payload = Buffer.alloc(0)) {
  const length = payload.length;
  let header;
  if (length < 126) header = Buffer.from([0x80 | opcode, length]);
  else if (length < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(length, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(length), 2); }
  return Buffer.concat([header, payload]);
}

class WebSocketConnection extends EventEmitter {
  constructor(socket, { maxPayload = MAX_PAYLOAD } = {}) {
    super();
    this.socket = socket;
    this.maxPayload = maxPayload;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.fragmentSize = 0;
    this.fragmentBinary = false;
    this.closed = false;
    this.closeSent = false;
    socket.on("data", chunk => this.feed(chunk));
    // http server sockets are half-open: without this a peer FIN never produces "close".
    socket.on("end", () => { if (!socket.destroyed) socket.end(); });
    socket.on("close", () => this.finish(1006));
    socket.on("error", () => {});
    socket.resume();
  }

  get open() { return !this.closed && !this.closeSent; }

  write(frame) {
    if (this.closed || this.socket.destroyed || !this.socket.writable) return false;
    this.socket.write(frame);
    return true;
  }

  send(data) {
    if (!this.open) return false;
    const binary = Buffer.isBuffer(data) || data instanceof Uint8Array;
    return this.write(encodeFrame(binary ? 2 : 1, binary ? Buffer.from(data) : Buffer.from(String(data), "utf8")));
  }

  ping(data = Buffer.alloc(0)) { return this.open && this.write(encodeFrame(9, data)); }

  close(code = 1000, reason = "") {
    if (this.closed) return;
    if (!this.closeSent) {
      this.closeSent = true;
      const body = Buffer.alloc(2 + Buffer.byteLength(reason));
      body.writeUInt16BE(code, 0);
      body.write(reason, 2);
      this.write(encodeFrame(8, body.subarray(0, 125)));
    }
    this.closeCode = this.closeCode ?? code;
    // Give the peer a moment to echo the close frame, then drop the connection.
    const timer = setTimeout(() => this.socket.destroy(), 1000);
    timer.unref?.();
    this.socket.end();
  }

  fail(code, reason) {
    this.dead = true;
    this.close(code, reason);
  }

  finish(code) {
    if (this.closed) return;
    this.closed = true;
    this.emit("close", this.closeCode ?? code);
  }

  feed(chunk) {
    if (this.closed || this.dead) return;
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    while (!this.closed && !this.dead && this.parseFrame());
  }

  parseFrame() {
    const buffer = this.buffer;
    if (buffer.length < 2) return false;
    const fin = Boolean(buffer[0] & 0x80);
    const opcode = buffer[0] & 0x0f;
    const masked = Boolean(buffer[1] & 0x80);
    let length = buffer[1] & 0x7f;
    let offset = 2;
    if (buffer[0] & 0x70) { this.fail(1002, "reserved bits"); return false; }
    if (!masked) { this.fail(1002, "unmasked frame"); return false; }
    if (length === 126) {
      if (buffer.length < 4) return false;
      length = buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (buffer.length < 10) return false;
      const big = buffer.readBigUInt64BE(2);
      length = big > BigInt(Number.MAX_SAFE_INTEGER) ? Infinity : Number(big);
      offset = 10;
    }
    const control = opcode >= 8;
    if (control && (!fin || length > 125)) { this.fail(1002, "bad control frame"); return false; }
    if (length > this.maxPayload) { this.fail(1009, "message too big"); return false; }
    if (buffer.length < offset + 4 + length) return false;
    const mask = buffer.subarray(offset, offset + 4);
    const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
    for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i & 3];
    this.buffer = buffer.subarray(offset + 4 + length);
    this.handleFrame(fin, opcode, payload);
    return true;
  }

  handleFrame(fin, opcode, payload) {
    switch (opcode) {
      case 0:
      case 1:
      case 2: {
        if (opcode === 0 && !this.fragments.length) { this.fail(1002, "unexpected continuation"); return; }
        if (opcode !== 0 && this.fragments.length) { this.fail(1002, "expected continuation"); return; }
        if (opcode !== 0) this.fragmentBinary = opcode === 2;
        this.fragmentSize += payload.length;
        if (this.fragmentSize > this.maxPayload) { this.fail(1009, "message too big"); return; }
        this.fragments.push(payload);
        if (!fin) return;
        const data = Buffer.concat(this.fragments);
        const binary = this.fragmentBinary;
        this.fragments = [];
        this.fragmentSize = 0;
        if (binary) { this.emit("message", data, true); return; }
        const text = data.toString("utf8");
        if (!Buffer.from(text, "utf8").equals(data)) { this.fail(1007, "invalid utf8"); return; }
        this.emit("message", text, false);
        return;
      }
      case 8: {
        let code = 1005;
        if (payload.length === 1) { this.fail(1002, "bad close"); return; }
        if (payload.length >= 2) code = payload.readUInt16BE(0);
        this.closeCode = code;
        if (!this.closeSent) {
          this.closeSent = true;
          this.write(encodeFrame(8, payload.length >= 2 ? payload.subarray(0, 2) : Buffer.alloc(0)));
        }
        this.socket.end();
        return;
      }
      case 9:
        this.write(encodeFrame(10, payload));
        return;
      case 10:
        this.emit("pong", payload);
        return;
      default:
        this.fail(1002, "unknown opcode");
    }
  }
}

// Completes the handshake for an `upgrade` event. Returns the connection, or null after answering with an HTTP error.
function acceptUpgrade(request, socket, head, options = {}) {
  const key = request.headers["sec-websocket-key"];
  const valid = request.method === "GET"
    && /(^|,)\s*websocket\s*(,|$)/i.test(String(request.headers.upgrade || ""))
    && /(^|,)\s*upgrade\s*(,|$)/i.test(String(request.headers.connection || ""))
    && request.headers["sec-websocket-version"] === "13"
    && typeof key === "string" && Buffer.from(key, "base64").length === 16;
  if (!valid) {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nSec-WebSocket-Version: 13\r\nContent-Length: 0\r\n\r\n");
    return null;
  }
  socket.setNoDelay?.(true);
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`);
  // Bytes that arrived with the upgrade are replayed through the socket so listeners attached later still see them.
  if (head?.length) socket.unshift(head);
  return new WebSocketConnection(socket, options);
}

module.exports = { acceptUpgrade, acceptKey, encodeFrame, WebSocketConnection, MAX_PAYLOAD };
