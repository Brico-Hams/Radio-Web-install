#!/usr/bin/env node
"use strict";
// Hardware validation of the web connector's channel template flow against a real Quansheng F4HWN v6 radio.
//   node scripts/hw-channels.cjs COM18 info   --model UV-K1|UV-K5-V3
//   node scripts/hw-channels.cjs COM18 backup --model UV-K1|UV-K5-V3 --out <dir>
//   node scripts/hw-channels.cjs COM18 load   --model UV-K1|UV-K5-V3 --template data/channel-templates/ES.json --backup <dir> [--region ES-M]
// --model is REQUIRED (the radio does not report its model); without it the script prints usage and exits 2.
// All protocol, backup, permit and channel code is the web's own (quansheng-connector.js, backup-store.js,
// quansheng-channels.js, channel-templates.js); nothing is reimplemented here except the glue that
// radio-ui.js importChannels() runs around R.appendQuanshengChannels.
// `serialport` is resolved at runtime (e.g. NODE_PATH pointing at a temporary install); it is not a project dependency.
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../planning-core.js");
require("../channel-templates.js");
require("../quansheng-connector.js");
require("../quansheng-channels.js");
try { require("../quansheng-tools.js"); } catch { /* optional: only adds assetInfoRaw (v7 active slot) */ }

const MODELS = ["UV-K1", "UV-K5-V3"];
const USAGE = "Usage: node scripts/hw-channels.cjs <PORT> info   --model UV-K1|UV-K5-V3\n" +
  "       node scripts/hw-channels.cjs <PORT> backup --model UV-K1|UV-K5-V3 --out <dir>\n" +
  "       node scripts/hw-channels.cjs <PORT> load   --model UV-K1|UV-K5-V3 --template <country.json> --backup <dir> [--region <id>]";
const MANIFEST_FORMAT = "bricohams-hw-channels-backup";
const MAX_BACKUP_AGE_MS = 12 * 3600 * 1000;
const REQUIRED_PARTS = ["calibration", "configuration", "external-flash"];
const PART_FILES = { calibration: "calibration.bin", configuration: "configuration.bin", "external-flash": "external-flash.bin", "base-firmware": "base-firmware.bin" };
let failures = 0;
const pass = message => console.log(`PASS  ${message}`);
const fail = message => { failures++; console.log(`FAIL  ${message}`); };
const step = async (message, operation) => {
  try {
    const result = await operation();
    pass(message);
    return result;
  } catch (error) {
    fail(`${message}: ${error.message}`);
    error.reported = true;
    throw error;
  }
};
const hex = value => (value >>> 0).toString(16).padStart(8, "0");

function loadSerialPort() {
  try {
    const module = require("serialport");
    return { Ctor: module.SerialPort || module, modern: Boolean(module.SerialPort) };
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    console.error("The 'serialport' package was not found. Install it in a temporary folder and point NODE_PATH at its node_modules, e.g.\n" +
      "  npm install --prefix %TEMP%\\hwtest serialport\n" +
      "  set NODE_PATH=%TEMP%\\hwtest\\node_modules && node scripts/hw-channels.cjs COM18 info --model UV-K5-V3");
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

function showProgress(connector) {
  connector.onProgress = ({ value, message }) => process.stdout.write(`\r      ${message} ${Math.round(value * 100)}%      `);
}
const endProgress = () => process.stdout.write("\n");

async function connect(portName, model) {
  const connector = new R.QuanshengConnector(makeTransport(loadSerialPort(), portName));
  const info = await step(`connect ${portName} @38400 8N1 DTR on (${model})`, () => connector.connect(model));
  console.log(`      ${JSON.stringify(info)}`);
  return { connector, info };
}

// Runs the web's own backup (BackupManager -> connector.backup) into an in-memory store.
async function runWebBackup(connector) {
  const records = new Map();
  const store = { put: async record => { records.set(record.id, structuredClone(record)); }, get: async id => structuredClone(records.get(id)) };
  showProgress(connector);
  try { return await new R.BackupManager(store).create(connector); }
  finally { endProgress(); }
}

async function commandInfo(connector, info) {
  console.log(`      firmware: ${info.firmware}`);
  const config = await step("read configuration (0x051b)", () => connector.readConfiguration());
  console.log(`      configuration version: ${R.text(config.subarray(0xa160, 0xa170))}`);
  const channels = R.readQuanshengChannels(config);
  pass(`channels in use: ${channels.length} of 1024 (FM ${channels.filter(channel => channel.mode === 0).length})`);
  try {
    const slots = await connector.listSlots();
    console.log(`      slots (0x0720): ${slots.map(item => `${item.slot}:${item.status === 1 ? "empty" : item.name || "used"}`).join(" ")}`);
  } catch (error) { console.log(`      slots: not reported (${error.message})`); }
  if (/F4HWN.*v7\./i.test(info.firmware) && typeof connector.assetInfoRaw === "function") {
    try {
      const assets = await connector.assetInfoRaw();
      console.log(`      active SLOT: ${assets.slot}; v7 assets loaded: ${assets.loaded}; build ${assets.buildId}`);
    } catch (error) { console.log(`      active SLOT: not reported (${error.message})`); }
  } else {
    console.log("      active SLOT / CFG: not reported by the connector for this firmware (read the SLOT and CFG labels in SysInf on the radio).");
  }
  console.log("      active CFG bank: the connector reads the active bank only and has no field naming it; check CFG in SysInf.");
}

async function commandBackup(connector, outDir) {
  const manifestPath = path.join(outDir, "manifest.json");
  if (fs.existsSync(manifestPath)) { fail(`Refusing to overwrite an existing backup: ${manifestPath}`); return; }
  const result = await step("full verified backup: calibration + configuration + external Flash 0x0738 (10-20 min, do not disconnect)",
    () => runWebBackup(connector));
  const { record } = result;
  fs.mkdirSync(outDir, { recursive: true });
  const files = [];
  for (const file of record.files) {
    const name = PART_FILES[file.name];
    if (!name) continue;
    fs.writeFileSync(path.join(outDir, name), file.bytes);
    files.push({ name: file.name, file: name, size: file.bytes.length, sha256: file.sha256, metadata: file.metadata ?? null });
    console.log(`      ${file.name}: ${file.bytes.length} bytes sha256 ${file.sha256}`);
  }
  const manifest = {
    format: MANIFEST_FORMAT, version: 1, createdAt: record.createdAt, status: record.status, scope: record.scope,
    model: connector.model, device: record.device, files
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  // Read back from disk: the files on disk, not memory, are what load will trust.
  for (const entry of files) {
    const disk = new Uint8Array(fs.readFileSync(path.join(outDir, entry.file)));
    if (disk.length !== entry.size || await R.sha256(disk) !== entry.sha256) fail(`${entry.file}: on-disk copy differs from the verified backup`);
  }
  const missing = REQUIRED_PARTS.filter(part => !files.some(entry => entry.name === part));
  if (record.status !== "complete" || !result.permit || missing.length) {
    fail(`backup incomplete (status ${record.status}${missing.length ? `, missing ${missing.join(", ")}` : ""}): ${record.scope}. load will refuse it.`);
    return;
  }
  if (!failures) pass(`backup complete and saved to ${path.resolve(outDir)}`);
}

// Validates a backup directory made by the `backup` command; returns the parsed parts.
async function readBackupDir(dir, model) {
  const manifestPath = path.join(dir, "manifest.json");
  R.assert(fs.existsSync(manifestPath), `No manifest.json in ${dir}.`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  R.assert(manifest.format === MANIFEST_FORMAT && manifest.version === 1, "Manifest not made by hw-channels backup.");
  R.assert(manifest.status === "complete", `Backup is not complete (status ${manifest.status}).`);
  R.assert(manifest.model === model, `Backup was made for ${manifest.model}, not ${model}.`);
  const age = Date.now() - Date.parse(manifest.createdAt);
  R.assert(Number.isFinite(age) && age >= -60000 && age <= MAX_BACKUP_AGE_MS, "Backup is not from this session (older than 12 h or dated in the future).");
  const parts = {};
  for (const part of REQUIRED_PARTS) {
    const entry = manifest.files.find(item => item.name === part);
    R.assert(entry && entry.file === PART_FILES[part], `Backup part missing: ${part}.`);
    const bytes = new Uint8Array(fs.readFileSync(path.join(dir, entry.file)));
    R.assert(bytes.length === entry.size && await R.sha256(bytes) === entry.sha256, `Backup part corrupt (SHA-256 mismatch): ${part}.`);
    parts[part] = { bytes, entry };
  }
  const flash = parts["external-flash"];
  R.assert(flash.bytes.length === 0x200000 && R.crc32(flash.bytes) === flash.entry.metadata?.verifiedCRC32,
    "External Flash backup is not 2 MiB or its radio-verified CRC-32 does not match.");
  R.validateCalibration(parts.calibration.bytes);
  R.assert(R.equal(parts.calibration.bytes, flash.bytes.subarray(0x10000, 0x10200)), "Backup calibration does not match the Flash image.");
  R.assert(parts.configuration.bytes.length === R.QUANSHENG_CONFIG_SIZE, "Backup configuration has the wrong size.");
  R.readQuanshengChannels(parts.configuration.bytes);
  return { manifest, parts };
}

// Same selection the web "country template" panel makes (countryTemplateChannels), without PMR/satellites.
function selectTemplateChannels(templatePath, region) {
  const file = JSON.parse(fs.readFileSync(path.resolve(templatePath), "utf8"));
  R.validateCountryTemplate(file, file.country);
  const channels = R.countryTemplateChannels(file, { region: region || "" });
  R.assert(channels.length > 0, "The template selection is empty.");
  R.assert(channels.length <= 1024, `${channels.length} channels selected: more than 1024. Pass --region <id> to narrow it, as the web requires.`);
  return { file, channels };
}

// Mirrors planning.addTemplateChannels + radio-ui importChannels: first FM channel is the record template, no grouping, scan list 25.
function planTemplateImport(image, channels) {
  const template = R.readQuanshengChannels(image).filter(channel => channel.mode === 0)[0];
  R.assert(template, "The active bank has no FM channel to use as record template (the web requires one too).");
  const grouped = R.groupQuanshengChannels(image, channels, "none", 25);
  const result = R.appendQuanshengChannels(image, grouped.channels, template.number, {});
  const decoded = R.readQuanshengChannels(result.image);
  for (const entry of channels) {
    const storedName = entry.name.slice(0, 10);
    R.assert(decoded.some(channel => channel.name === storedName && channel.rx === entry.rx && channel.tx === entry.tx &&
      channel.mode === entry.mode && channel.rxOnly), `The parser cannot read channel ${entry.name} back; nothing is written.`);
  }
  return { ...result, templateNumber: template.number };
}

async function commandLoad(connector, info, args) {
  const { model, templatePath, backupDir, region } = args;
  const { file, channels } = await step(`select template channels (${path.basename(templatePath)}${region ? `, region ${region}` : ""})`,
    async () => selectTemplateChannels(templatePath, region));
  console.log(`      ${file.country}: ${channels.length} channels selected (RX only by template design)`);
  const { manifest, parts } = await step(`validate backup directory ${backupDir} (manifest, SHA-256, Flash CRC, 12 h session window)`,
    () => readBackupDir(backupDir, model));
  await step("radio identity matches the backup (model, firmware, calibration SHA-256, configuration)", async () => {
    R.assert(manifest.device?.model === info.model && manifest.device?.firmware === info.firmware,
      `Backup is from ${manifest.device?.model} ${manifest.device?.firmware}; the radio is ${info.model} ${info.firmware}.`);
    const calibration = await connector.readCalibration();
    R.assert(await R.sha256(calibration) === parts.calibration.entry.sha256, "Calibration differs from the backup: this is another radio or it changed.");
    const configuration = await connector.readConfiguration();
    R.assert(R.equal(configuration, parts.configuration.bytes), "The active configuration changed since the backup. Make a new backup.");
  });
  // The web only grants write permits from a backup made in the live session; the saved directory is checked above, then
  // the same BackupManager runs again here to mint the permit that connector.writeConfiguration requires.
  const { record, permit } = await step("session write permit: fresh full verified backup through BackupManager (10-20 min)", async () => {
    const result = await runWebBackup(connector);
    R.assert(result.permit && result.record.status === "complete", "Backup incomplete: writes stay locked.");
    return result;
  });
  const original = record.files.find(item => item.name === "configuration").bytes.slice();
  const liveCalibration = record.files.find(item => item.name === "calibration");
  if (liveCalibration.sha256 !== parts.calibration.entry.sha256) { fail("calibration changed during the session; aborting before any write"); return; }
  if (!R.equal(original, parts.configuration.bytes)) { fail("configuration changed between backup and load; aborting before any write"); return; }

  const before = R.readQuanshengChannels(original);
  const plan = await step("plan import exactly like the web (appendQuanshengChannels, scan list 25, RX-only, tones off)", async () => planTemplateImport(original, channels));
  console.log(`      record template: channel ${plan.templateNumber}; ${plan.added} to add, ${plan.duplicates} already present`);
  if (plan.added === 0) { pass("nothing to write: every template channel is already in the active bank"); }
  else {
    showProgress(connector);
    let writes;
    try { writes = await step("write channels with connector.writeConfiguration (hide, records, names, attributes, full read-back)", () => connector.writeConfiguration(plan.image, original, permit)); }
    finally { endProgress(); }
    console.log(`      ${writes} 8-byte writes`);
  }

  const after = await step("re-read configuration for per-channel verification", () => connector.readConfiguration());
  const decoded = R.readQuanshengChannels(after);
  const view = R.view(after);
  const beforeNumbers = new Set(before.map(channel => channel.number));
  const addedNumbers = new Set(decoded.filter(channel => !beforeNumbers.has(channel.number)).map(channel => channel.number));
  let channelFailures = 0;
  for (const entry of channels) {
    const rx = Number(entry.rx).toFixed(5), tx = Number(entry.tx).toFixed(5), name = entry.name.slice(0, 10);
    const matches = decoded.filter(channel => channel.name === name && channel.rx === rx && channel.tx === tx && channel.mode === 0 && channel.rxOnly);
    const found = matches.find(channel => addedNumbers.has(channel.number)) || matches[0];
    const label = `${name} rx ${rx} tx ${tx}`;
    if (!found) { channelFailures++; fail(`${label}: not found after write`); continue; }
    const record = (found.number - 1) * 16;
    const clean = after[record + 8] === 0 && after[record + 9] === 0 && after[record + 10] === 0 && after[record + 13] === 0;
    const direction = after[record + 11] & 15;
    const offset = view.getUint32(record + 4, true);
    const expectedDirection = Number(tx) > Number(rx) ? 1 : Number(tx) < Number(rx) ? 2 : 0;
    if (!clean) { channelFailures++; fail(`${label}: tone bytes not off at channel ${found.number}`); }
    else if (found.scanList !== 25 && addedNumbers.has(found.number)) { channelFailures++; fail(`${label}: scan list ${found.scanList} instead of 25`); }
    else if (addedNumbers.has(found.number) && (direction !== expectedDirection || offset !== Math.abs(Math.round(Number(tx) * 100000) - Math.round(Number(rx) * 100000)))) {
      channelFailures++; fail(`${label}: offset/direction mismatch at channel ${found.number}`);
    } else pass(`channel ${found.number} ${label}${addedNumbers.has(found.number) ? "" : " (already present)"}`);
  }
  if (addedNumbers.size !== plan.added) { channelFailures++; fail(`new memories ${addedNumbers.size} differ from planned ${plan.added}`); }
  if (!R.equal(after.subarray(0x8800), original.subarray(0x8800))) { channelFailures++; fail("settings/VFO area (0x8800+) changed"); }
  const calibrationAfter = await step("calibration unchanged after write", () => connector.readCalibration());
  if (await R.sha256(calibrationAfter) !== parts.calibration.entry.sha256) fail("calibration differs from the backup after writing");
  console.log(`      summary: ${channels.length - channelFailures}/${channels.length} template channels verified; ${plan.added} written, ${plan.duplicates} skipped as duplicates; ${channelFailures} failures`);
  console.log("      Reinicia la radio manualmente para recargar sus caches (the web does not reboot the radio automatically).");
}

async function main() {
  const args = process.argv.slice(2);
  const flag = name => {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    const [, value] = args.splice(index, 2);
    return value;
  };
  const model = flag("--model");
  const out = flag("--out");
  const templatePath = flag("--template");
  const backupDir = flag("--backup");
  const region = flag("--region");
  const [portName, command] = args;
  if (!MODELS.includes(model)) console.error("Error: --model is required (UV-K1 or UV-K5-V3); the radio does not report its model.");
  const missing = command === "backup" && !out ? "--out" : command === "load" && (!templatePath || !backupDir) ? "--template and --backup" : "";
  if (missing) console.error(`Error: ${command} requires ${missing}.`);
  if (!portName || !["info", "backup", "load"].includes(command) || !MODELS.includes(model) || missing) {
    console.error(USAGE);
    process.exit(2);
  }
  if (command === "load") {
    // Everything checkable offline is checked before the port is opened.
    try { selectTemplateChannels(templatePath, region); await readBackupDir(backupDir, model); }
    catch (error) { fail(`Refusing to load, nothing written: ${error.message}`); console.log("RESULT: FAIL"); process.exit(1); }
  }
  let connector;
  try {
    const connection = await connect(portName, model);
    connector = connection.connector;
    if (command === "info") await commandInfo(connector, connection.info);
    else if (command === "backup") await commandBackup(connector, path.resolve(out));
    else await commandLoad(connector, connection.info, { model, templatePath, backupDir: path.resolve(backupDir), region });
  } catch (error) {
    endProgress();
    if (!error.reported) fail(error.message);
  } finally {
    try { if (connector) await connector.disconnect(); } catch { /* port already closed */ }
    console.log(failures ? `RESULT: FAIL (${failures})` : "RESULT: PASS");
    process.exitCode = failures ? 1 : 0;
  }
}

main().catch(error => { console.error(error); process.exit(1); });
