#!/usr/bin/env node
"use strict";
// Hardware validation of the web connector's channel template flow against a real Quansheng F4HWN v6 radio.
//   node scripts/hw-channels.cjs COM18 info   --model UV-K1|UV-K5-V3
//   node scripts/hw-channels.cjs COM18 backup --model UV-K1|UV-K5-V3 --out <dir>
//   node scripts/hw-channels.cjs COM18 load   --model UV-K1|UV-K5-V3 --template data/channel-templates/ES.json --backup <dir> [--region ES-M]
//   node scripts/hw-channels.cjs COM18 load-plan --model UV-K5-V3 --plan docs/plan-uvk5v3-es.json --bank 1 --backup <dir>
//   node scripts/hw-channels.cjs plan-check --plan docs/plan-uvk5v3-es.json   (offline: zones and scan lists per bank)
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
  "       node scripts/hw-channels.cjs <PORT> load   --model UV-K1|UV-K5-V3 --template <country.json> --backup <dir> [--region <id>]\n" +
  "       node scripts/hw-channels.cjs <PORT> load-plan --model UV-K5-V3 --plan <plan.json> --bank <1-4> --backup <dir> [--airports <airports.csv>]\n" +
  "       node scripts/hw-channels.cjs plan-check --plan <plan.json> [--bank <1-4>] [--airports <airports.csv>]   (offline, no radio)";
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

const BASE_PARTS = ["calibration", "external-flash", "base-firmware"];

// True when `manifest` is a complete record whose calibration, external-flash and base-firmware parts match their
// SHA-256, from this session and from the same radio; only configuration.bin may then be missing.
// readPart(file) returns the bytes of a file in the backup directory, or null when absent.
async function reusableBackupState({ manifest, readPart, model, firmware, calibrationSha256, now = Date.now() }) {
  const no = reason => ({ reusable: false, reason });
  if (!manifest || manifest.format !== MANIFEST_FORMAT || manifest.version !== 1) return no("manifest not made by hw-channels backup");
  if (manifest.status !== "complete") return no(`status ${manifest.status}`);
  if (manifest.model !== model) return no(`model ${manifest.model}`);
  if (manifest.device?.firmware !== firmware) return no(`firmware ${manifest.device?.firmware}`);
  const age = now - Date.parse(manifest.createdAt);
  if (!Number.isFinite(age) || age < -60000 || age > MAX_BACKUP_AGE_MS) return no("older than 12 h");
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  for (const part of BASE_PARTS) {
    const entry = files.find(item => item.name === part);
    if (!entry || entry.file !== PART_FILES[part]) return no(`missing ${part}`);
    const bytes = readPart(entry.file);
    if (!bytes || bytes.length !== entry.size || await R.sha256(bytes) !== entry.sha256) return no(`${part} hash mismatch`);
    if (part === "calibration" && entry.sha256 !== calibrationSha256) return no("calibration differs from the live radio");
  }
  return { reusable: true, hasConfiguration: files.some(item => item.name === "configuration") };
}

// Adds configuration.bin to a manifest's files (replacing any previous entry); the status stays as is.
function withConfiguration(manifest, bytes, sha256) {
  const files = manifest.files.filter(item => item.name !== "configuration");
  files.push({ name: "configuration", file: PART_FILES.configuration, size: bytes.length, sha256, metadata: null });
  return { ...manifest, files };
}

// Two identical reads of the configuration image (on the V3 it lives inside the external Flash, not as its own part).
async function readConfigurationTwice(connector) {
  const first = new Uint8Array(await connector.readConfiguration());
  const second = new Uint8Array(await connector.readConfiguration());
  R.assert(R.equal(first, second), "Two configuration reads differ: the radio changed while reading.");
  R.assert(first.length === R.QUANSHENG_CONFIG_SIZE, "Configuration has the wrong size.");
  R.readQuanshengChannels(first);
  return first;
}

// The "original" configuration a write starts from: two identical live reads that must equal the backup's configuration.bin.
async function originalConfiguration(connector, backupBytes) {
  const original = await readConfigurationTwice(connector);
  R.assert(R.equal(original, backupBytes), "configuration changed between backup and load; aborting before any write");
  return original.slice();
}

async function finishBackupConfiguration(connector, outDir, manifest) {
  const bytes = await step("read configuration twice (must be byte-identical)", () => readConfigurationTwice(connector));
  const sha256 = await R.sha256(bytes);
  fs.writeFileSync(path.join(outDir, PART_FILES.configuration), bytes);
  const updated = withConfiguration(manifest, bytes, sha256);
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(updated, null, 2));
  console.log(`      configuration: ${bytes.length} bytes sha256 ${sha256}`);
  const disk = new Uint8Array(fs.readFileSync(path.join(outDir, PART_FILES.configuration)));
  if (disk.length !== bytes.length || await R.sha256(disk) !== sha256) fail("configuration.bin: on-disk copy differs from the verified read");
  const missing = REQUIRED_PARTS.filter(part => !updated.files.some(entry => entry.name === part));
  if (missing.length) { fail(`backup incomplete (missing ${missing.join(", ")}): load will refuse it.`); return; }
  if (!failures) pass(`backup complete and saved to ${path.resolve(outDir)}`);
}

async function commandBackup(connector, info, outDir) {
  const manifestPath = path.join(outDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    let state;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const liveCalibration = await connector.readCalibration();
      state = await reusableBackupState({
        manifest, model: info.model, firmware: info.firmware, calibrationSha256: await R.sha256(liveCalibration),
        readPart: file => { const full = path.join(outDir, file); return fs.existsSync(full) ? new Uint8Array(fs.readFileSync(full)) : null; }
      });
      if (state.reusable) {
        if (state.hasConfiguration) { fail(`Refusing to overwrite an existing backup: ${manifestPath}`); return; }
        pass(`existing complete backup in ${outDir} matches the radio; only configuration.bin is missing`);
        await finishBackupConfiguration(connector, outDir, manifest);
        return;
      }
    } catch (error) {
      fail(`cannot reuse existing backup: ${error.message}`);
      return;
    }
    fail(`Refusing to overwrite an existing backup (${state.reason}): ${manifestPath}`);
    return;
  }
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
  if (record.status !== "complete" || !result.permit) {
    fail(`backup incomplete (status ${record.status}): ${record.scope}. load will refuse it.`);
    return;
  }
  if (failures) return;
  await finishBackupConfiguration(connector, outDir, manifest);
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
  const liveCalibration = record.files.find(item => item.name === "calibration");
  if (liveCalibration.sha256 !== parts.calibration.entry.sha256) { fail("calibration changed during the session; aborting before any write"); return; }
  const original = await step("original configuration: two identical reads, equal to configuration.bin", () => originalConfiguration(connector, parts.configuration.bytes));

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

// ---- load-plan: CHIRP CSV files -> the active bank, one scan list per zone --------------------------------------------

const MAX_BANK_CHANNELS = 200;
const MAX_ZONES = 24;
const ZONE_BY = ["district", "community", "service"];
const FILTER_KEYS = ["name", "mode", "zone", "comment"];
const CHIRP_COLUMNS = ["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "Mode", "Comment"];
const CHIRP_MODES = { FM: { mode: 0, narrow: false }, NFM: { mode: 0, narrow: true }, AM: { mode: 1, narrow: false }, NAM: { mode: 1, narrow: true } };
// Spanish 2 m / 70 cm allocations, in 10 Hz units (the radio's resolution). The generator only emits TX inside them.
const HAM_TX_UNITS = [[14400000, 14600000], [43000000, 44000000]];
const AUTHORITATIVE_AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
// iso_region (OurAirports) -> community name; the same table scripts/build-chirp-spain.py uses.
const REGIONS_ES = { AN: "Andalucía", AR: "Aragón", AS: "Asturias", CB: "Cantabria", CE: "Ceuta", CL: "Castilla y León",
  CM: "Castilla-La Mancha", CN: "Canarias", CT: "Cataluña", EX: "Extremadura", GA: "Galicia", IB: "Baleares", MC: "Murcia",
  MD: "Madrid", ML: "Melilla", NC: "Navarra", PV: "País Vasco", RI: "La Rioja", VC: "C. Valenciana" };

// RFC 4180 parser (quoted fields, doubled quotes, CRLF, BOM). Returns one object per data row.
function parseCsv(text, required = []) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; rows.push(row); row = [];
    } else field += c;
  }
  R.assert(!quoted, "CSV: unterminated quoted field.");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const lines = rows.filter(cells => cells.some(value => value !== ""));
  R.assert(lines.length > 0, "CSV is empty.");
  const header = lines.shift();
  for (const column of required) R.assert(header.includes(column), `CSV has no ${column} column.`);
  return lines.map((cells, index) => {
    R.assert(cells.length === header.length, `CSV data row ${index + 1} has ${cells.length} fields, the header has ${header.length}.`);
    return Object.fromEntries(header.map((name, column) => [name, cells[column]]));
  });
}

// EA district: first digit of the callsign (the Name, which keeps the callsign first), as build-chirp-spain.py district().
function districtZone(row) {
  const digit = /\d/.exec(row.Name.split(" ")[0]);
  return `EA${digit ? digit[0] : "0"}`;
}
// PMR446 and CB rows carry their service in Comment: "PMR446 canal N · solo RX", "CB 27 MHz canal N AM|FM · solo RX".
function serviceZone(row) {
  if (/^PMR446 canal \d+ /.test(row.Comment)) return "PMR446";
  const cb = /^CB 27 MHz canal \d+ (AM|FM) /.exec(row.Comment);
  R.assert(cb, `${row.Name}: Comment does not say PMR446 or CB, so its service is unknown.`);
  R.assert(cb[1] === row.Mode, `${row.Name}: Comment says CB ${cb[1]} but Mode is ${row.Mode}.`);
  return `CB ${cb[1]}`;
}
// The airport CSV does not carry the community. Name starts with the airport code (also in Comment); the community is the
// OurAirports iso_region of that code, resolved through communityOf(code).
function communityZone(row, communityOf) {
  const code = row.Name.split(" ")[0];
  R.assert(row.Comment.split(" · ").includes(code), `${row.Name}: airport code ${code} is not in Comment.`);
  const region = communityOf(code);
  R.assert(region, `${row.Name}: airport ${code} has no unambiguous OurAirports region.`);
  const community = REGIONS_ES[region.replace(/^ES-/, "")];
  R.assert(community, `${row.Name}: unknown region ${region}.`);
  return community;
}
function zoneOf(row, zoneBy, communityOf) {
  if (zoneBy === "district") return districtZone(row);
  if (zoneBy === "service") return serviceZone(row);
  return communityZone(row, communityOf);
}

// The airport code the generator derives for each Spanish airport (icao, gps, local, ident without dashes) -> iso_region.
function airportRegions(text) {
  const regions = new Map();
  for (const airport of parseCsv(text, ["ident", "iso_country", "iso_region"])) {
    if (airport.iso_country !== "ES") continue;
    const code = airport.icao_code || airport.gps_code || airport.local_code || airport.ident.replace(/-/g, "");
    regions.set(code, regions.has(code) && regions.get(code) !== airport.iso_region ? "" : airport.iso_region);
  }
  return code => regions.get(code) || "";
}

function matchesFilter(row, zone, filter) {
  if (!filter) return true;
  for (const key of Object.keys(filter)) R.assert(FILTER_KEYS.includes(key), `Unknown filter key "${key}" (use ${FILTER_KEYS.join(", ")}).`);
  const any = value => Array.isArray(value) ? value : [value];
  if (filter.name !== undefined && !new RegExp(filter.name).test(row.Name)) return false;
  if (filter.comment !== undefined && !new RegExp(filter.comment).test(row.Comment)) return false;
  if (filter.mode !== undefined && !any(filter.mode).includes(row.Mode)) return false;
  if (filter.zone !== undefined && !any(filter.zone).includes(zone)) return false;
  return true;
}

// Same fields the web importer hands to plannedMemory, plus the extended flag for AM, wide RX range, TX and CTCSS.
function channelFromRow(row) {
  const kind = CHIRP_MODES[row.Mode];
  R.assert(kind, `${row.Name}: Mode ${row.Mode} is not FM, NFM, AM or NAM.`);
  const frequency = Number(row.Frequency);
  R.assert(Number.isFinite(frequency) && frequency > 0, `${row.Name}: bad Frequency ${row.Frequency}.`);
  const rxUnits = Math.round(frequency * 100000);
  const rxOnly = row.Duplex === "off";
  let txUnits = rxUnits;
  if (!rxOnly) {
    const offset = Math.round(Number(row.Offset || 0) * 100000);
    R.assert(Number.isFinite(offset), `${row.Name}: bad Offset ${row.Offset}.`);
    R.assert(["+", "-", ""].includes(row.Duplex), `${row.Name}: Duplex "${row.Duplex}" is not supported (only off, +, - or simplex).`);
    txUnits = row.Duplex === "+" ? rxUnits + offset : row.Duplex === "-" ? rxUnits - offset : rxUnits;
    R.assert(kind.mode === 0, `${row.Name}: AM channels must be RX only.`);
    for (const units of [rxUnits, txUnits]) {
      R.assert(HAM_TX_UNITS.some(([low, high]) => units >= low && units <= high), `${row.Name}: transmit frequency outside the 2 m / 70 cm amateur bands.`);
    }
  }
  const channel = { name: row.Name, rx: (rxUnits / 100000).toFixed(5), tx: (txUnits / 100000).toFixed(5), mode: kind.mode,
    narrow: kind.narrow, rxOnly, extended: true };
  if (row.Tone === "Tone" || row.Tone === "TSQL") {
    channel.ctcss = Number(row.Tone === "Tone" ? row.rToneFreq : row.cToneFreq);
    R.assert(R.QUANSHENG_CTCSS.includes(channel.ctcss), `${row.Name}: CTCSS ${channel.ctcss} Hz is not in the radio's table.`);
    if (row.Tone === "TSQL") channel.ctcssRx = true;
  } else R.assert(row.Tone === "", `${row.Name}: Tone "${row.Tone}" is not supported (only none, Tone, TSQL).`);
  return channel;
}

// plan = { banks: { "1": [{ csv, filter?, zoneBy }] } }. io = { readText(csvPath), communityOf(code) }.
function buildBankPlan(entries, io) {
  R.assert(Array.isArray(entries) && entries.length > 0, "The bank has no entries in the plan.");
  const channels = [], zones = new Map(), identities = new Set();
  for (const [index, entry] of entries.entries()) {
    const label = `entry ${index + 1} (${entry && entry.csv})`;
    R.assert(entry && typeof entry.csv === "string" && ZONE_BY.includes(entry.zoneBy), `${label}: needs csv and zoneBy ${ZONE_BY.join("|")}.`);
    let used = 0;
    for (const row of parseCsv(io.readText(entry.csv), CHIRP_COLUMNS)) {
      const zone = zoneOf(row, entry.zoneBy, io.communityOf);
      if (!matchesFilter(row, zone, entry.filter)) continue;
      if (!zones.has(zone)) {
        R.assert(zones.size < MAX_ZONES, `More than ${MAX_ZONES} zones (scan lists 1-${MAX_ZONES}): refusing, nothing written. Zone ${zone} would be number ${zones.size + 1}.`);
        zones.set(zone, { zone, list: zones.size + 1, count: 0 });
      }
      const channel = { ...channelFromRow(row), zone, scanList: zones.get(zone).list };
      const identity = `${channel.name.slice(0, 10)}:${channel.rx}:${channel.tx}:${channel.mode}`;
      R.assert(!identities.has(identity), `${label}: ${channel.name} ${channel.rx} appears twice in the bank.`);
      identities.add(identity);
      zones.get(zone).count++;
      channels.push(channel);
      used++;
    }
    R.assert(used > 0, `${label}: no channel matched.`);
    R.assert(channels.length <= MAX_BANK_CHANNELS, `${channels.length} channels after ${label}: more than ${MAX_BANK_CHANNELS} per bank. Refusing, nothing written.`);
  }
  return { channels, zones: [...zones.values()] };
}

function readPlanFile(planPath, model, bank) {
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  R.assert(plan && plan.banks && typeof plan.banks === "object", "The plan needs a banks object.");
  R.assert(!plan.model || !model || plan.model === model, `The plan is for ${plan.model}, not ${model}.`);
  const entry = plan.banks[String(bank)];
  R.assert(entry, `The plan has no bank ${bank}.`);
  const entries = Array.isArray(entry) ? entry : entry.entries;
  return { entries, label: Array.isArray(entry) ? "" : entry.label || "" };
}

// Builds the plan for one bank from the real files (CSV paths are relative to the repository root).
async function bankPlanFromFile(planPath, model, bank, airportsPath) {
  const { entries, label } = readPlanFile(path.resolve(planPath), model, bank);
  let communityOf = () => "";
  if (entries.some(entry => entry.zoneBy === "community")) {
    const file = path.resolve(airportsPath || path.join(__dirname, "..", "tmp", "airports.csv"));
    if (!fs.existsSync(file)) {
      console.log(`      downloading OurAirports airports.csv (the zone source for airports) to ${file}`);
      const response = await fetch(AUTHORITATIVE_AIRPORTS_URL);
      R.assert(response.ok, `airports.csv download failed: HTTP ${response.status}.`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }
    communityOf = airportRegions(fs.readFileSync(file, "utf8"));
  }
  const readText = csv => fs.readFileSync(path.resolve(__dirname, "..", csv), "utf8");
  return { label, ...buildBankPlan(entries, { readText, communityOf }) };
}

function printZones(plan) {
  console.log(`      ${plan.channels.length} channels in ${plan.zones.length} zones${plan.label ? ` (${plan.label})` : ""}`);
  for (const { zone, list, count } of plan.zones) console.log(`      scan list ${String(list).padStart(2)}  ${zone.padEnd(18)} ${count}`);
}

// The planned bank image: every existing memory cleared, channel i written to memory i+1 with plannedMemory.
function planBankImage(image, channels) {
  const template = R.readQuanshengChannels(image).find(channel => channel.mode === 0);
  R.assert(template, "The active bank has no FM channel to use as record template (the web requires one too).");
  let result = image;
  for (const channel of R.readQuanshengChannels(image)) result = R.deleteQuanshengChannel(result, channel.number);
  result = result.slice();
  channels.forEach((channel, index) => {
    const memory = R.plannedQuanshengMemory(image, channel, template.number, channel.scanList);
    result.set(memory.record, index * 16);
    result.set(memory.name, 0x4000 + index * 16);
    result.set(memory.attributes, 0x8000 + index * 2);
  });
  return { image: result, templateNumber: template.number };
}

// Compares memories 1..N of an image with the plan. Returns { problems, zones: [{ zone, list, count, ok }] }.
function verifyBank(image, channels) {
  const decoded = R.readQuanshengChannels(image);
  const problems = [];
  const failedZones = new Set();
  if (decoded.length !== channels.length) problems.push(`bank has ${decoded.length} memories, the plan has ${channels.length}`);
  channels.forEach((channel, index) => {
    const number = index + 1;
    const found = decoded.find(item => item.number === number);
    const bad = [];
    if (!found) bad.push("memory is empty");
    else {
      if (found.name.trimEnd() !== channel.name.slice(0, 10).trimEnd()) bad.push(`name ${found.name}`);
      if (found.rx !== channel.rx) bad.push(`rx ${found.rx}`);
      if (found.tx !== channel.tx) bad.push(`tx ${found.tx}`);
      if (found.mode !== channel.mode) bad.push(`mode ${found.mode}`);
      if (found.narrow !== channel.narrow) bad.push(`narrow ${found.narrow}`);
      if (found.scanList !== channel.scanList) bad.push(`scan list ${found.scanList}`);
      if (found.rxOnly !== channel.rxOnly) bad.push(`rx-only ${found.rxOnly}`);
      const code = channel.ctcss === undefined ? 0 : R.QUANSHENG_CTCSS.indexOf(channel.ctcss);
      const flags = channel.ctcss === undefined ? 0 : channel.ctcssRx ? 0x11 : 0x10;
      if (image[index * 16 + 9] !== code || image[index * 16 + 10] !== flags || image[index * 16 + 8] !== (channel.ctcssRx ? code : 0)) bad.push("CTCSS bytes");
    }
    if (bad.length) { problems.push(`memory ${number} ${channel.name}: ${bad.join(", ")}`); failedZones.add(channel.zone); }
  });
  const zones = [];
  for (const channel of channels) {
    let zone = zones.find(item => item.zone === channel.zone);
    if (!zone) zones.push(zone = { zone: channel.zone, list: channel.scanList, count: 0, ok: !failedZones.has(channel.zone) });
    zone.count++;
  }
  return { problems, zones };
}

function printVerification(result) {
  for (const { zone, list, count, ok } of result.zones) console.log(`${ok ? "PASS" : "FAIL"}  zone ${zone.padEnd(18)} scan list ${String(list).padStart(2)}  ${count} channels`);
  for (const problem of result.problems) fail(problem);
}

async function commandLoadPlan(connector, info, args) {
  const { model, backupDir, bank, plan } = args;
  console.log(`      bank ${bank}${plan.label ? ` (${plan.label})` : ""} must be the ACTIVE bank on the radio: its channel list is REPLACED`);
  printZones(plan);
  const { channels } = plan;
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
  const { record, permit } = await step("session write permit: fresh full verified backup through BackupManager (10-20 min)", async () => {
    const result = await runWebBackup(connector);
    R.assert(result.permit && result.record.status === "complete", "Backup incomplete: writes stay locked.");
    return result;
  });
  const liveCalibration = record.files.find(item => item.name === "calibration");
  if (liveCalibration.sha256 !== parts.calibration.entry.sha256) { fail("calibration changed during the session; aborting before any write"); return; }
  const original = await step("original configuration: two identical reads, equal to configuration.bin", () => originalConfiguration(connector, parts.configuration.bytes));

  const before = R.readQuanshengChannels(original);
  const planned = await step(`plan bank replacement (plannedMemory per channel, memories 1-${channels.length}, ${before.length} existing cleared)`, async () => {
    const result = planBankImage(original, channels);
    const offline = verifyBank(result.image, channels);
    R.assert(offline.problems.length === 0, `the planned image does not read back: ${offline.problems[0]}`);
    return result;
  });
  console.log(`      record template: channel ${planned.templateNumber}`);
  showProgress(connector);
  let writes;
  try { writes = await step("write bank with connector.writeConfiguration (hide, records, names, attributes, full read-back)", () => connector.writeConfiguration(planned.image, original, permit)); }
  finally { endProgress(); }
  console.log(`      ${writes} 8-byte writes`);

  const after = await step("re-read configuration for per-channel verification", () => connector.readConfiguration());
  const result = verifyBank(after, channels);
  printVerification(result);
  if (!R.equal(after.subarray(0x8800), original.subarray(0x8800))) fail("settings/VFO area (0x8800+) changed");
  const calibrationAfter = await step("calibration unchanged after write", () => connector.readCalibration());
  if (await R.sha256(calibrationAfter) !== parts.calibration.entry.sha256) fail("calibration differs from the backup after writing");
  const badMemories = result.problems.filter(item => item.startsWith("memory ")).length;
  console.log(`      summary: ${channels.length - badMemories}/${channels.length} channels verified; ${result.zones.length} zones; ${result.problems.length} problems`);
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
  const planPath = flag("--plan");
  const bankText = flag("--bank");
  const airportsPath = flag("--airports");
  if (args[0] === "plan-check") {
    // Offline: prints the zones and scan lists a plan produces from the real CSV files; no port, no radio.
    try {
      const banks = bankText ? [Number(bankText)] : [1, 2, 3, 4];
      R.assert(planPath && banks.every(bank => [1, 2, 3, 4].includes(bank)), "plan-check needs --plan and, optionally, --bank 1-4.");
      for (const bank of banks) { console.log(`bank ${bank}`); printZones(await bankPlanFromFile(planPath, model, bank, airportsPath)); }
    } catch (error) { console.error(`Refusing: ${error.message}`); process.exit(1); }
    return;
  }
  const [portName, command] = args;
  if (!MODELS.includes(model)) console.error("Error: --model is required (UV-K1 or UV-K5-V3); the radio does not report its model.");
  const missing = command === "backup" && !out ? "--out" : command === "load" && (!templatePath || !backupDir) ? "--template and --backup"
    : command === "load-plan" && (!planPath || !backupDir || !/^[1-4]$/.test(bankText || "")) ? "--plan, --bank <1-4> and --backup" : "";
  if (missing) console.error(`Error: ${command} requires ${missing}.`);
  if (!portName || !["info", "backup", "load", "load-plan"].includes(command) || !MODELS.includes(model) || missing) {
    console.error(USAGE);
    process.exit(2);
  }
  let bankPlan;
  if (command === "load") {
    // Everything checkable offline is checked before the port is opened.
    try { selectTemplateChannels(templatePath, region); await readBackupDir(backupDir, model); }
    catch (error) { fail(`Refusing to load, nothing written: ${error.message}`); console.log("RESULT: FAIL"); process.exit(1); }
  }
  if (command === "load-plan") {
    try { bankPlan = await bankPlanFromFile(planPath, model, Number(bankText), airportsPath); await readBackupDir(backupDir, model); }
    catch (error) { fail(`Refusing to load the plan, nothing written: ${error.message}`); console.log("RESULT: FAIL"); process.exit(1); }
  }
  let connector;
  try {
    const connection = await connect(portName, model);
    connector = connection.connector;
    if (command === "info") await commandInfo(connector, connection.info);
    else if (command === "backup") await commandBackup(connector, connection.info, path.resolve(out));
    else if (command === "load-plan") await commandLoadPlan(connector, connection.info, { model, backupDir: path.resolve(backupDir), bank: Number(bankText), plan: bankPlan });
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

if (require.main === module) main().catch(error => { console.error(error); process.exit(1); });
module.exports = { parseCsv, districtZone, serviceZone, communityZone, airportRegions, channelFromRow, buildBankPlan, planBankImage,
  verifyBank, MAX_BANK_CHANNELS, MAX_ZONES, reusableBackupState, withConfiguration, originalConfiguration };
