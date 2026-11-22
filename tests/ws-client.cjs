"use strict";
// Hand-built RFC 6455 client over net, used by the audio tests (no ws dependency).
const crypto = require("node:crypto");
const net = require("node:net");

function frame(opcode, payload = Buffer.alloc(0), { fin = true, mask = true } = {}) {
  const body = Buffer.from(payload);
  const length = body.length;
  const flag = mask ? 0x80 : 0;
  const lenBytes = length < 126 ? Buffer.from([length | flag])
    : length < 65536 ? Buffer.from([126 | flag, length >> 8, length & 0xff])
      : (() => { const b = Buffer.alloc(9); b[0] = 127 | flag; b.writeBigUInt64BE(BigInt(length), 1); return b; })();
  const head = Buffer.concat([Buffer.from([(fin ? 0x80 : 0) | opcode]), lenBytes]);
  if (!mask) return Buffer.concat([head, body]);
  const key = crypto.randomBytes(4);
  const masked = Buffer.from(body);
  for (let i = 0; i < masked.length; i += 1) masked[i] ^= key[i & 3];
  return Buffer.concat([head, key, masked]);
}

// Connects and completes the handshake; resolves with a client exposing received messages and the close code.
function connectWs(port, path = "/api/audio", { headers = {}, socket: existing } = {}) {
  return new Promise((resolve, reject) => {
    const socket = existing || net.connect(port, "127.0.0.1");
    const key = crypto.randomBytes(16).toString("base64");
    const client = { socket, messages: [], pongs: [], closeCode: null, closed: false, status: 0, accept: "", key };
    let buffer = Buffer.alloc(0);
    let handshaken = false;
    const waiters = [];
    const flush = () => {
      for (const waiter of [...waiters]) {
        const index = client.messages.findIndex(waiter.test);
        if (index >= 0) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(client.messages.splice(index, 1)[0]); }
      }
    };
    const parse = () => {
      for (;;) {
        if (buffer.length < 2) return;
        const opcode = buffer[0] & 0x0f;
        let length = buffer[1] & 0x7f;
        let offset = 2;
        if (length === 126) { if (buffer.length < 4) return; length = buffer.readUInt16BE(2); offset = 4; }
        if (buffer.length < offset + length) return;
        const payload = buffer.subarray(offset, offset + length);
        buffer = buffer.subarray(offset + length);
        if (opcode === 1) client.messages.push({ text: payload.toString("utf8") });
        else if (opcode === 2) client.messages.push({ binary: Buffer.from(payload) });
        else if (opcode === 8) { client.closeCode = payload.length >= 2 ? payload.readUInt16BE(0) : 1005; if (!socket.destroyed) socket.write(frame(8, payload.subarray(0, 2))); }
        else if (opcode === 9) socket.write(frame(10, payload));
        else if (opcode === 10) client.pongs.push(Buffer.from(payload));
        flush();
      }
    };
    socket.on("error", () => {});
    socket.on("close", () => { client.closed = true; if (!handshaken) reject(new Error("closed before handshake")); });
    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!handshaken) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const head = buffer.subarray(0, end).toString("latin1");
        buffer = buffer.subarray(end + 4);
        client.status = Number(/^HTTP\/1\.1 (\d+)/.exec(head)?.[1]);
        client.accept = /sec-websocket-accept:\s*(\S+)/i.exec(head)?.[1] || "";
        handshaken = true;
        resolve(client);
      }
      parse();
    });
    client.send = (data, options) => socket.write(frame(Buffer.isBuffer(data) ? 2 : 1, data, options));
    client.sendFrame = (opcode, payload, options) => socket.write(frame(opcode, payload, options));
    client.sendJson = value => client.send(JSON.stringify(value));
    client.next = (test = () => true, timeout = 2000) => new Promise((res, rej) => {
      const waiter = { test, resolve: res };
      waiters.push(waiter);
      flush();
      setTimeout(() => { if (waiters.includes(waiter)) { waiters.splice(waiters.indexOf(waiter), 1); rej(new Error("timeout waiting for ws message")); } }, timeout).unref();
    });
    client.waitClose = (timeout = 3000) => new Promise((res, rej) => {
      if (client.closed) { res(client.closeCode); return; }
      const timer = setTimeout(() => rej(new Error("timeout waiting for ws close")), timeout);
      socket.once("close", () => { clearTimeout(timer); res(client.closeCode); });
    });
    client.close = () => socket.destroy();
    const extra = Object.entries(headers).map(([name, value]) => `${name}: ${value}\r\n`).join("");
    socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${extra}\r\n`);
  });
}

module.exports = { connectWs, frame };
