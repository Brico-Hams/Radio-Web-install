#!/usr/bin/env node
"use strict";
// Hardware validation of the web connector's Multiboot slot code against a real radio.
//   node scripts/hw-multiboot.cjs COM18 list
//   node scripts/hw-multiboot.cjs COM18 roundtrip <slot 1-4> <image.bin> [--name NAME] [--model UV-K5-V3] [--backup]
// `serialport` is resolved at runtime (e.g. NODE_PATH pointing at a temporary install); it is not a project dependency.
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");

const STATUS = ["valid", "empty", "unknown format", "incomplete", "bad size", "CRC invalid", "SPI error",
  "invalid slot", "not authorized", "RAM error", "protected"];
let failures = 0;
let targetSlot = 0;
const pass = message => console.log(`PASS  ${message}`);
const fail = message => { failures++; console.log(`FAIL  ${message}`); };
const step = async (message, operation) => {
  try {
    const result = await operation();
    pass(message);
    return result;
  } catch (error) {
    fail(`${message}: ${error.message}`);
    throw error;
  }
};

function loadSerialPort() {
  try {
    const module = require("serialport");
    return { Ctor: module.SerialPort || module, modern: Boolean(module.SerialPort) };
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    console.error("The 'serialport' package was not found. Install it in a temporary folder and point NODE_PATH at its node_modules, e.g.\n" +
      "  npm install --prefix %TEMP%\\hwtest serialport\n" +
      "  set NODE_PATH=%TEMP%\\hwtest\\node_modules && node scripts/hw-multiboot.cjs COM18 list");
    process.exit(2);
  }
}

function makeTransport({ Ctor: SerialPort, modern }, portName) {
  class NodeSerialTransport extends R.BufferedTransport {
    async open(baudRate) {
      R.assert(!this.port, "El puerto ya esta abierto.");
      const options = { baudRate, dataBits: 8, stopBits: 1, parity: "none", rtscts: false, autoOpen: false };
      this.port = modern ? new SerialPort({ path: portName, ...options }) : new SerialPort(portName, options);
      await new Promise((resolve, reject) => this.port.open(error => error ? reject(error) : resolve()));
      await new Promise((resolve, reject) => this.port.set({ dtr: true }, error => error ? reject(error) : resolve()));
      this.port.on("data", data => this.push(new Uint8Array(data)));
      this.port.on("error", error => this.fail(error));
      this.port.on("close", () => { if (this.opened) this.fail(new Error("Puerto cerrado por el sistema.")); });
      this.opened = true;
      this.error = null;
    }
    async write(data) {
      R.assert(this.opened && !this.error, "Puerto serie no disponible.");
      const bytes = Buffer.from(R.bytes(data));
      await new Promise((resolve, reject) => this.port.write(bytes, error => error ? reject(error) : resolve()));
      await new Promise((resolve, reject) => this.port.drain(error => error ? reject(error) : resolve()));
      // The F4HWN USB CDC can hold an exact 64-byte packet until the next byte.
      if (this.quanshengUSBPadding && data.length % 64 === 0) {
        await new Promise((resolve, reject) => this.port.write(Buffer.from([0]), error => error ? reject(error) : resolve()));
      }
    }
    async close() {
      this.opened = false;
      this.error = new Error("Puerto cerrado.");
      this.notify();
      const port = this.port;
      this.port = null;
      this.buffer = new Uint8Array();
      if (port && port.isOpen) await new Promise(resolve => port.close(() => resolve()));
    }
  }
  return new NodeSerialTransport();
}

const describe = item => {
  const state = STATUS[item.status] || `status ${item.status}`;
  const detail = item.status === 1 ? "" : ` name="${item.name}" fw="${item.firmware}" size=${item.size} crc=${(item.crc >>> 0).toString(16).padStart(8, "0")}`;
  return `slot ${item.slot}: ${state}${detail}`;
};

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const index = args.indexOf(name);
    if (index < 0) return fallback;
    const [, value] = args.splice(index, 2);
    return value;
  };
  const model = flag("--model", "UV-K1");
  const name = flag("--name", "HWTEST");
  const withBackup = args.includes("--backup");
  const positional = args.filter(arg => arg !== "--backup");
  const [portName, command, slotArg, imagePath] = positional;
  if (!portName || !["list", "roundtrip"].includes(command)) {
    console.error("Usage: node scripts/hw-multiboot.cjs <PORT> list\n       node scripts/hw-multiboot.cjs <PORT> roundtrip <slot 1-4> <image.bin> [--name NAME] [--model UV-K1|UV-K5-V3] [--backup]");
    process.exit(2);
  }
  let slot;
  let image;
  if (command === "roundtrip") {
    slot = Number(slotArg);
    if (!Number.isInteger(slot) || slot === 0) {
      fail(`Refusing slot ${slotArg}: Main (slot 0) is protected and never touched. Use 1-4.`);
      process.exit(1);
    }
    if (slot < 1 || slot > 4) { fail(`Refusing slot ${slotArg}: only slots 1-4 are writable.`); process.exit(1); }
    if (!imagePath || !fs.existsSync(imagePath)) { fail(`Image not found: ${imagePath}`); process.exit(1); }
    image = new Uint8Array(fs.readFileSync(path.resolve(imagePath)));
    targetSlot = slot;
  }

  const connector = new R.QuanshengConnector(makeTransport(loadSerialPort(), portName));
  let permit = null;
  let created = false;
  try {
    const info = await step(`connect ${portName} @38400 8N1 DTR on (${model})`, () => connector.connect(model));
    console.log(`      ${JSON.stringify(info)}`);
    const before = await step("list slots", () => connector.listSlots());
    before.forEach(item => console.log(`      ${describe(item)}`));
    if (command === "list") return;

    const target = before.find(item => item.slot === slot);
    if (!target) throw new Error(`Slot ${slot} not reported by the radio.`);
    if (target.status !== 1) {
      fail(`Refusing slot ${slot}: not empty (${STATUS[target.status] || target.status}). Roundtrip only uses empty slots.`);
      return;
    }
    pass(`slot ${slot} is empty; Main is never touched`);

    permit = await step(withBackup ? "full verified backup (slow)" : "issue unchecked write permit (PRO)", async () => {
      if (!withBackup) return R.issueUncheckedPermit(connector, "ESCRIBIR SIN COPIA");
      const records = new Map();
      const store = { put: async record => { records.set(record.id, structuredClone(record)); }, get: async id => structuredClone(records.get(id)) };
      return (await new R.BackupManager(store).create(connector)).permit;
    });
    connector.onProgress = ({ value, message }) => process.stdout.write(`\r      ${message} ${Math.round(value * 100)}%      `);
    created = true;
    await step(`write slot ${slot} as "${name}" (${image.length} bytes, CRC checked by connector)`, () => connector.writeSlot(slot, image, name, permit));
    process.stdout.write("\n");
    const crc = await step(`verify CRC of slot ${slot} through the connector`, () => connector.validateSlot(slot));
    const expected = R.crc32(image);
    if (crc === expected) pass(`CRC ${crc.toString(16).padStart(8, "0")} matches the image`);
    else fail(`CRC mismatch: radio ${crc.toString(16)} vs image ${expected.toString(16)}`);
    const after = await step("list slots to confirm", () => connector.listSlots());
    const written = after.find(item => item.slot === slot);
    console.log(`      ${describe(written)}`);
    if (written.status === 0 && written.name === name && written.size === image.length) pass("listing shows the new slot as valid with the expected name and size");
    else fail("listing does not match the written image");
    for (const item of after) {
      const original = before.find(candidate => candidate.slot === item.slot);
      if (item.slot !== slot && JSON.stringify(item) !== JSON.stringify(original)) fail(`slot ${item.slot} changed unexpectedly`);
    }
  } catch (error) {
    process.stdout.write("\n");
    if (!(error instanceof Error && failures)) fail(error.message);
  } finally {
    if (created && permit) {
      // Always try to leave the radio as it started, reconnecting if the failed operation dropped the link.
      try {
        if (!connector.connected || connector.transport.error) {
          await connector.transport.close().catch(() => {});
          connector.transport = makeTransport(loadSerialPort(), portName);
          connector.transport.quanshengUSBPadding = true;
          await connector.connect(model);
          permit = R.issueUncheckedPermit(connector, "ESCRIBIR SIN COPIA");
        }
          await step(`erase slot ${targetSlot} to restore the initial state`, () => connector.eraseSlot(targetSlot, permit));
        const final = await step("list slots after erase", () => connector.listSlots());
        final.forEach(item => console.log(`      ${describe(item)}`));
        if (final.find(item => item.slot === targetSlot).status === 1) pass("radio ends as it started (slot empty)");
        else fail("slot is not empty after erase");
      } catch (error) {
        fail(`cleanup failed, check slot ${targetSlot} manually: ${error.message}`);
      }
    }
    try { await connector.disconnect(); } catch { /* port already closed */ }
    console.log(failures ? `RESULT: FAIL (${failures})` : "RESULT: PASS");
    process.exitCode = failures ? 1 : 0;
  }
}

main().catch(error => { console.error(error); process.exit(1); });
