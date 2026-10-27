"use strict";
const assert = require("node:assert/strict");
const { crc32 } = require("../radio-core.js");

const OP = Object.freeze({ BEGIN: 1, DATA: 2, COMMIT: 3, ABORT: 4, STATUS: 5 });
const STATE = Object.freeze({ IDLE: 0, RECEIVING: 1, DONE: 2, FAILED: 3, CANCELLED: 4, TIMED_OUT: 5 });

function u32(value, name) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffffffff, `${name}: uint32 requerido`);
}

function encodeRequest(operation, session, offset = 0, payload = Buffer.alloc(0)) {
  u32(operation, "operation"); u32(session, "session"); u32(offset, "offset");
  assert(Buffer.isBuffer(payload) && payload.length <= 128, "Payload de hasta 128 bytes requerido");
  const bytes = Buffer.alloc(24 + payload.length);
  bytes.write("BHT1");
  bytes.writeUInt32LE(operation, 4); bytes.writeUInt32LE(session, 8);
  bytes.writeUInt32LE(offset, 12); bytes.writeUInt32LE(payload.length, 16);
  payload.copy(bytes, 24);
  bytes.writeUInt32LE(crc32(bytes), 20);
  return bytes;
}

function decodeReply(bytes, operation, session) {
  assert(Buffer.isBuffer(bytes) && bytes.length === 32, "Respuesta BHR1 de 32 bytes requerida");
  assert(bytes.subarray(0, 4).equals(Buffer.from("BHR1")), "Magic BHR1 invalido");
  assert.equal(bytes.readUInt32LE(28), crc32(bytes.subarray(0, 28)), "CRC de respuesta invalido");
  assert.equal(bytes.readUInt32LE(4), operation, "Operacion de respuesta no coincide");
  assert.equal(bytes.readUInt32LE(8), session, "Sesion de respuesta no coincide");
  const reply = {
    status: bytes.readUInt32LE(12), received: bytes.readUInt32LE(16),
    state: bytes.readUInt32LE(20), installResult: bytes.readInt32LE(24)
  };
  assert(reply.status <= 9 && reply.state <= STATE.TIMED_OUT, "Estado de respuesta desconocido");
  return reply;
}

async function uploadPackage(exchange, bytes, session) {
  assert.equal(typeof exchange, "function", "Se requiere transporte request/reply");
  u32(session, "session"); assert(session !== 0, "La sesion no puede ser cero");
  assert(Buffer.isBuffer(bytes) && bytes.length >= 66 && bytes.length <= 4160,
    "Paquete BHA1 fuera de limites");
  const request = async (operation, offset = 0, payload = Buffer.alloc(0)) => {
    const reply = decodeReply(await exchange(encodeRequest(operation, session, offset, payload)),
      operation, session);
    if (reply.status !== 0) {
      const error = new Error(`BHT1 error ${reply.status}; state=${reply.state}; install=${reply.installResult}`);
      error.reply = reply;
      throw error;
    }
    return reply;
  };
  const begin = Buffer.alloc(8);
  begin.writeUInt32LE(bytes.length); begin.writeUInt32LE(crc32(bytes), 4);
  let reply = await request(OP.BEGIN, 0, begin);
  assert(reply.received <= bytes.length, "Offset remoto fuera del paquete");
  if (reply.state === STATE.DONE) {
    assert.equal(reply.received, bytes.length, "Instalacion confirmada con longitud incorrecta");
    return reply;
  }
  assert.equal(reply.state, STATE.RECEIVING, "Receptor no disponible para datos");
  for (let offset = reply.received; offset < bytes.length;) {
    const payload = bytes.subarray(offset, Math.min(offset + 128, bytes.length));
    reply = await request(OP.DATA, offset, payload);
    offset += payload.length;
    assert.equal(reply.received, offset, "ACK de offset incorrecto");
    assert.equal(reply.state, STATE.RECEIVING, "Estado inesperado durante la transferencia");
  }
  reply = await request(OP.COMMIT);
  assert.equal(reply.state, STATE.DONE, "El receptor no confirma la instalacion");
  assert.equal(reply.received, bytes.length, "Longitud confirmada incorrecta");
  return reply;
}

module.exports = { OP, STATE, encodeRequest, decodeReply, uploadPackage };
