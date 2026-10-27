"use strict";
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { crc32 } = require("../../radio-core.js");
const { OP, STATE, encodeRequest, decodeReply } = require("../../scripts/platform-transfer.cjs");

assert(process.argv[2], "C bridge executable required");
function fixture(size, name) {
  const bytes = Buffer.alloc(size, 0);
  bytes.write("BHA1");
  for (const [offset, value] of [[4, 64], [8, 2], [12, 1], [16, size - 64], [32, 3]])
    bytes.writeUInt32LE(value, offset);
  bytes.write(name, 40);
  bytes.fill(0x5a, 64);
  bytes.writeUInt32LE(crc32(bytes.subarray(64)), 36);
  bytes.writeUInt32LE(crc32(bytes.subarray(0, 60)), 60);
  return bytes;
}
const requests = [], checks = [];
function add(op, session, offset = 0, payload = Buffer.alloc(0), status = 0) {
  const frame = encodeRequest(op, session, offset, payload);
  requests.push(Buffer.from([0x00, 0xff, 0x42, 0x48]), frame);
  checks.push({ op, session, status });
}
const packages = process.argv[3] || process.argv[4]
  ? [fs.readFileSync(process.argv[3]), fs.readFileSync(process.argv[4])]
  : [fixture(320, "First"), fixture(4160, "Maximum")];
for (const [index, bytes] of packages.entries()) {
  const session = index + 1;
  const begin = Buffer.alloc(8);
  begin.writeUInt32LE(bytes.length); begin.writeUInt32LE(crc32(bytes), 4);
  add(OP.BEGIN, session, 0, begin);
  add(OP.COMMIT, session, 0, Buffer.alloc(0), 5);
  for (let offset = 0; offset < bytes.length; offset += 128) {
    const data = bytes.subarray(offset, offset + 128);
    add(OP.DATA, session, offset, data);
    if (offset === 0) add(OP.DATA, session, offset, data);
  }
  add(OP.COMMIT, session);
  add(OP.COMMIT, session);
  add(OP.STATUS, session);
}
const cancelled = Buffer.alloc(8);
cancelled.writeUInt32LE(packages[0].length);
cancelled.writeUInt32LE(crc32(packages[0]), 4);
add(OP.BEGIN, 3, 0, cancelled);
add(OP.DATA, 3, 0, packages[0].subarray(0, 128));
add(OP.ABORT, 3);
add(OP.STATUS, 3);
add(OP.COMMIT, 3, 0, Buffer.alloc(0), 9);
cancelled.writeUInt32LE((crc32(packages[0]) ^ 1) >>> 0, 4);
add(OP.BEGIN, 4, 0, cancelled);
for (let offset = 0; offset < packages[0].length; offset += 128)
  add(OP.DATA, 4, offset, packages[0].subarray(offset, offset + 128));
add(OP.COMMIT, 4, 0, Buffer.alloc(0), 6);
add(OP.ABORT, 4);
const result = spawnSync(process.argv[2], ["2"], { input: Buffer.concat(requests), timeout: 15000 });
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr?.toString());
assert.equal(result.stdout.length, checks.length * 32);
for (const [i, expected] of checks.entries()) {
  const reply = decodeReply(result.stdout.subarray(i * 32, (i + 1) * 32), expected.op, expected.session);
  assert.equal(reply.status, expected.status);
  if (expected.op === OP.COMMIT && expected.status === 0) {
    assert.equal(reply.state, STATE.DONE);
    assert.equal(reply.received, packages[expected.session - 1].length);
  }
}
assert.match(result.stderr.toString(), /Verified 2 installs, generation 2, bank 1/);
console.log(`${checks.length} raw BHT1 stream exchanges verified through noise, dual-bank NOR install and RAM load`);
