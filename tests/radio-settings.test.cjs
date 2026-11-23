"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const settings = require("../radio-settings.cjs");

const byId = id => settings.ftx1Settings().find(setting => setting.id === id);

function fakeRadio(initial = {}) {
  const registers = { "010101": "+05", "010104": "0100", ...initial };
  const sent = [];
  const radio = {
    registers, sent, failWrite: false, ignoreWrite: false,
    async send(command, { read }) {
      sent.push(command);
      const match = /^EX(\d{6})(.*)$/.exec(command);
      assert.ok(match && settings.EX_RAW_MATCHER.test(command), `command ${command} must match the EX matcher`);
      if (read) return `EX${match[1]}${registers[match[1]]};\0`;
      if (radio.failWrite) throw new Error("rejected");
      if (!radio.ignoreWrite) registers[match[1]] = match[2];
      return null;
    }
  };
  return radio;
}

function service(radio, extra = {}) {
  let clock = 10_000;
  const instance = settings.createSettingsService({
    settings: settings.ftx1Settings(), send: radio.send, isTransmitting: () => false, now: () => clock, minIntervalMs: 1000, ...extra
  });
  return { instance, advance: ms => { clock += ms; } };
}

test("FTX-1 model carries sourced ranges and hard exclusions", () => {
  const treble = byId("ex-010101");
  assert.equal(treble.writable, true);
  assert.deepEqual([treble.min, treble.max, treble.digits], [-20, 10, 3]);
  const agc = byId("ex-010104");
  assert.deepEqual([agc.min, agc.max, agc.step], [20, 4000, 20]);
  assert.equal(byId("ex-030501").writable, false);
  assert.equal(byId("ex-030501").exclusion, "tx-region");
  assert.equal(byId("ex-040107").exclusion, "auto-off");
  assert.equal(byId("ex-030112").writable, false);
  assert.equal(byId("ex-010115").writable, false);
  for (const setting of settings.ftx1Settings().filter(entry => /^CAT|STOP BIT|BAUD/.test(entry.label))) assert.equal(setting.writable, false, setting.label);
  for (const setting of settings.ftx1Settings().filter(entry => /^MAX POWER/.test(entry.label))) assert.equal(setting.writable, false, setting.label);
  for (const setting of settings.ftx1Settings()) {
    if (!setting.writable) assert.ok(setting.readOnlyReason, `${setting.id} needs a reason`);
    else assert.ok(setting.options || (Number.isFinite(setting.min) && Number.isFinite(setting.max)), `${setting.id} needs a sourced range`);
  }
});

test("encodeValue validates range, step and digits", () => {
  const treble = byId("ex-010101");
  assert.equal(settings.encodeValue(treble, -5), "-05");
  assert.equal(settings.encodeValue(treble, "+10"), "+10");
  assert.throws(() => settings.encodeValue(treble, 11), RangeError);
  assert.throws(() => settings.encodeValue(treble, "abc"), RangeError);
  const agc = byId("ex-010104");
  assert.equal(settings.encodeValue(agc, 200), "0200");
  assert.throws(() => settings.encodeValue(agc, 30), RangeError);
});

test("write: backup, write, read back and audit", async () => {
  const radio = fakeRadio();
  const { instance } = service(radio);
  const result = await instance.write("ex-010101", -5, { role: "operator" });
  assert.equal(result.status, 200);
  assert.equal(result.body.backup, "+05");
  assert.equal(radio.registers["010101"], "-05");
  assert.deepEqual(radio.sent, ["EX010101", "EX010101-05", "EX010101"]);
  assert.deepEqual(instance.audit().map(entry => entry.event), ["backup", "written"]);
});

test("write is refused for non-operators, read-only items, bad values and while transmitting", async () => {
  const radio = fakeRadio();
  const { instance } = service(radio);
  assert.equal((await instance.write("ex-010101", 1, { role: "viewer" })).status, 403);
  assert.equal((await instance.write("ex-030501", 5, { role: "operator" })).status, 403);
  assert.equal((await instance.write("ex-010101", 99, { role: "operator" })).status, 400);
  assert.equal((await instance.write("nope", 1, { role: "operator" })).status, 404);
  const tx = service(radio, { isTransmitting: () => true });
  assert.equal((await tx.instance.write("ex-010101", 1, { role: "operator" })).status, 409);
  const unknown = service(radio, { isTransmitting: () => null });
  assert.equal((await unknown.instance.write("ex-010101", 1, { role: "operator" })).status, 409);
  assert.deepEqual(radio.sent, []);
});

test("mismatch restores the backup and reports", async () => {
  const radio = fakeRadio();
  const original = radio.send;
  let writes = 0;
  radio.send = async (command, opts) => {
    if (!opts.read && /^EX010101[+-]\d\d$/.test(command) && writes++ === 0) { radio.sent.push(command); return null; }
    return original(command, opts);
  };
  const { instance } = service(radio);
  const result = await instance.write("ex-010101", -5, { role: "operator" });
  assert.equal(result.status, 502);
  assert.equal(result.body.restored, true);
  assert.equal(result.body.backup, "+05");
  assert.equal(radio.registers["010101"], "+05");
  assert.equal(instance.audit().at(-1).event, "failed");
});

test("rate limit and single writer", async () => {
  const radio = fakeRadio();
  const { instance, advance } = service(radio);
  assert.equal((await instance.write("ex-010101", 1, { role: "operator" })).status, 200);
  assert.equal((await instance.write("ex-010101", 2, { role: "operator" })).status, 429);
  advance(1500);
  const first = instance.write("ex-010101", 3, { role: "operator" });
  const second = instance.write("ex-010104", 200, { role: "operator" });
  assert.equal((await second).status, 409);
  assert.equal((await first).status, 200);
});

test("real FTX-1 bench replies parse; ?; means not available", () => {
  const read = key => ({ read: `${key};` });
  assert.equal(settings.parseReply(read("EX010413"), "EX0104133;"), "3");
  assert.equal(settings.parseReply(read("EX020203"), "EX02020305;"), "05");
  assert.equal(settings.parseReply(read("EX040107"), "EX04010700;"), "00");
  assert.equal(settings.parseReply(read("EX030503"), "EX030503100;"), "100");
  assert.equal(settings.parseReply(read("EX010322"), "EX010322000;"), "000");
  assert.equal(settings.parseReply(read("EX050109"), "?;"), null);
  assert.throws(() => settings.parseReply(read("EX010413"), "EX0202033;"), /Unexpected/);
});

test("an item answering ?; is reported unavailable and never written", async () => {
  const radio = fakeRadio();
  const inner = radio.send;
  radio.send = async (command, opts) => (opts.read && command === "EX010101" ? "?;" : inner(command, opts));
  const { instance } = service(radio);
  const read = await instance.read("ex-010101");
  assert.equal(read.body.available, false);
  assert.equal(read.body.value, null);
  const write = await instance.write("ex-010101", 1, { role: "operator" });
  assert.equal(write.status, 502);
  assert.equal(radio.registers["010101"], "+05");
});

test("no REGION/LIMITES TX, calibration, reset, link, port, power-off, TX timer or MAX POWER item is writable", () => {
  const all = settings.ftx1Settings();
  assert.equal(all.length, 403);
  const fs = require("node:fs");
  const path = require("node:path");
  const doc = fs.readFileSync(path.join(__dirname, "..", "docs", "FTX1-KNOWLEDGE.md"), "utf8");
  const flagged = new Set([...doc.matchAll(/`EX(\d{6})`[^;`]*?\*\*(?:REGION\/LIMITES TX|CALIBRACION)\*\*/g)].map(match => `ex-${match[1]}`));
  assert.ok(flagged.has("ex-030503"), "knowledge doc flags EX030503");
  for (const id of flagged) assert.equal(all.find(entry => entry.id === id).writable, false, `${id} flagged in the knowledge doc`);
  for (const id of ["ex-030503", "ex-030504", "ex-040107", "ex-030112"]) {
    const entry = all.find(item => item.id === id);
    assert.equal(entry.writable, false, id);
    assert.ok(entry.exclusion, `${id} must carry an exclusion class`);
  }
  const forbidden = /MAX POWER|REGION|BAND LIMIT|TX BAND|CALIB|RESET|FACTORY|FIRMWARE|BOOT|^CAT|BAUD|\bRATE\b|STOP BIT|TIME OUT TIMER|PORT SELECT|TUN\/LIN|\bUSB\b|AUTO POWER OFF|TX INHIBIT|EMERGENCY FREQ|RPTT SELECT/;
  for (const entry of all) if (forbidden.test(entry.label)) assert.equal(entry.writable, false, `${entry.id} ${entry.label}`);
  const direct = ["EX030503", "EX030504", "EX040107"];
  for (const key of direct) assert.equal(all.find(entry => entry.read === `${key};`).writable, false, key);
});

test("service refuses a hard-excluded item even if the catalog marks it writable", async () => {
  const radio = fakeRadio({ "030503": "100" });
  const bad = { ...byId("ex-030503"), writable: true };
  const { instance } = service(radio, { settings: [bad] });
  assert.equal((await instance.write("ex-030503", 10, { role: "operator" })).status, 403);
  assert.deepEqual(radio.sent, []);
});

test("remote console exposes the Settings tab in the four languages", () => {
  const fs = require("node:fs");
  const read = name => fs.readFileSync(require("node:path").join(__dirname, "..", name), "utf8");
  assert.match(read("remote.html"), /id="tab-settings"[\s\S]*id="panel-settings"/);
  assert.match(read("remote-ui.js"), /TABS\s*=\s*Object\.freeze\(\[[^\]]*"settings"/);
  assert.match(read("ui-translations.js"), /Ajustes de la radio\|[^|]+\|[^|]+\|[^|\n]+/);
});

const ic705 = () => settings.familySettings("ic705-civ");
const civById = id => ic705().find(setting => setting.id === id);

// Fake IC-705: registers keyed by the 1A05 sub-command digits, frames as in the CI-V guide printed p.2 and p.5.
function fakeIc705(initial = {}) {
  const registers = { "0029": "0128", "0030": "01", "0043": "02", ...initial };
  const sent = [];
  const radio = {
    registers, sent, nak: false,
    async send(command, { read }) {
      sent.push(command);
      const match = /^FEFEA4E01A05(\d{4})(\d*)FD$/.exec(command);
      assert.ok(match, `unexpected CI-V frame ${command}`);
      if (read) return `${command}FEFEE0A41A05${match[1]}${registers[match[1]]}FD`;
      if (radio.nak) return "FEFEE0A4FAFD";
      registers[match[1]] = match[2];
      return "FEFEE0A4FBFD";
    }
  };
  return radio;
}

function civService(radio, extra = {}) {
  let clock = 10_000;
  const instance = settings.createSettingsService({
    settings: ic705(), codec: settings.civCodec(), send: radio.send, isTransmitting: () => false, now: () => clock, minIntervalMs: 1000, ...extra
  });
  return { instance, advance: ms => { clock += ms; } };
}

test("IC-705 model: ranges from the guide, exclusions read-only with a reason", () => {
  const beep = civById("ic705-1a05-0029");
  assert.deepEqual([beep.writable, beep.min, beep.max, beep.digits], [true, 0, 255, 4]);
  assert.match(beep.source, /printed p\.5/);
  for (const sub of ["0033", "0036", "0037"]) assert.equal(civById(`ic705-1a05-${sub}`).exclusion, "tx-region");
  for (const sub of ["0043", "0044", "0048"]) assert.equal(civById(`ic705-1a05-${sub}`).exclusion, "tx-safety");
  assert.equal(civById("ic705-1a05-0034").exclusion, "auto-off");
  assert.equal(civById("ic705-1a05-0089").exclusion, "calibration-reset");
  for (const sub of ["0071", "0072", "0073", "0109", "0110"]) assert.equal(civById(`ic705-1a05-${sub}`).exclusion, "link-serial");
  assert.equal(civById("ic705-1a05-0001").pending, true);
  for (const setting of ic705()) {
    if (setting.writable) assert.ok(setting.options || Number.isFinite(setting.max), setting.id);
    else assert.ok(setting.readOnlyReason, setting.id);
  }
});

test("civCodec frames follow the guide and reject NG", () => {
  const codec = settings.civCodec();
  const beep = civById("ic705-1a05-0029");
  assert.equal(codec.readCommand(beep), "FEFEA4E01A050029FD");
  assert.equal(codec.writeCommand(beep, "0128"), "FEFEA4E01A0500290128FD");
  assert.equal(codec.parse(beep, "FEFEE0A41A05002901" + "28FD"), "0128");
  assert.throws(() => codec.parse(beep, "FEFEE0A4FAFD"), /NG/);
  assert.doesNotThrow(() => codec.checkAck("FEFEE0A4FBFD"));
  assert.throws(() => codec.checkAck("FEFEE0A4FAFD"), /NG/);
  assert.throws(() => codec.checkAck(""), /OK/);
});

test("IC-705 write: backup, write, read back, audit", async () => {
  const radio = fakeIc705();
  const { instance } = civService(radio);
  const result = await instance.write("ic705-1a05-0029", 200, { role: "operator" });
  assert.equal(result.status, 200);
  assert.equal(result.body.backup, "0128");
  assert.equal(radio.registers["0029"], "0200");
  assert.deepEqual(radio.sent, ["FEFEA4E01A050029FD", "FEFEA4E01A0500290200FD", "FEFEA4E01A050029FD"]);
  assert.deepEqual(instance.audit().map(entry => entry.event), ["backup", "written"]);
});

test("IC-705 write refusals: role, excluded, pending, range, TX, rate", async () => {
  const radio = fakeIc705();
  const { instance, advance } = civService(radio);
  assert.equal((await instance.write("ic705-1a05-0029", 1, { role: "viewer" })).status, 403);
  for (const id of ["ic705-1a05-0043", "ic705-1a05-0037", "ic705-1a05-0071", "ic705-1a05-0089", "ic705-1a05-0001"]) assert.equal((await instance.write(id, 1, { role: "operator" })).status, 403, id);
  assert.equal((await instance.write("ic705-1a05-0029", 256, { role: "operator" })).status, 400);
  assert.equal((await instance.write("ic705-1a05-0030", "07", { role: "operator" })).status, 400);
  assert.equal((await civService(radio, { isTransmitting: () => true }).instance.write("ic705-1a05-0029", 1, { role: "operator" })).status, 409);
  assert.equal((await civService(radio, { isTransmitting: () => null }).instance.write("ic705-1a05-0029", 1, { role: "operator" })).status, 409);
  assert.deepEqual(radio.sent, []);
  assert.equal((await instance.write("ic705-1a05-0029", 1, { role: "operator" })).status, 200);
  assert.equal((await instance.write("ic705-1a05-0029", 2, { role: "operator" })).status, 429);
  advance(1500);
  assert.equal((await instance.write("ic705-1a05-0029", 2, { role: "operator" })).status, 200);
});

test("IC-705 NG from the radio restores the backup", async () => {
  const radio = fakeIc705();
  radio.nak = true;
  const { instance } = civService(radio);
  const result = await instance.write("ic705-1a05-0029", 200, { role: "operator" });
  assert.equal(result.status, 502);
  assert.equal(result.body.backup, "0128");
  assert.equal(radio.registers["0029"], "0128");
  assert.equal(instance.audit().at(-1).event, "failed");
});

test("Android IC-705 table matches the shared catalog", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const kotlin = fs.readFileSync(path.join(__dirname, "..", "android", "app", "src", "main", "java", "org", "bricohams", "radio", "RigSettings.kt"), "utf8");
  const rows = [...kotlin.matchAll(/^\s+(byte|level|bool|enum|composite)\((\d+), "(\d{4})", "((?:[^"\\]|\\.)*)"(?:, ([^\n]*?))?\),?$/gm)];
  const def = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "radio-settings-catalog.json"), "utf8")).families["ic705-civ"].civSettings;
  assert.equal(rows.length, def.length);
  for (const [index, row] of rows.entries()) {
    const entry = def[index];
    assert.equal(row[3], entry.sub);
    assert.equal(row[1], entry.kind);
    assert.equal(Number(row[2]), entry.page, entry.sub);
    const exclusion = /"([a-z-]+)"\s*$/.exec(row[5] || "");
    assert.equal(exclusion ? exclusion[1] : undefined, entry.exclusion, entry.sub);
  }
});

test("support matrix has one row per catalog, Android and codeplug radio", () => {
  const catalog = settings.loadCatalogRadios();
  const rows = settings.supportMatrix(catalog);
  for (const radio of catalog) assert.ok(rows.some(row => row.id === radio.id), radio.id);
  for (const id of ["android-ft817", "quansheng-uvk5", "opengd77", "anytone-d878", "tk11", "android-rts10"]) assert.ok(rows.some(row => row.id === id), id);
  const ftx1 = rows.find(row => row.id === "yaesu-ftx-1");
  assert.equal(ftx1.status, "partial");
  assert.ok(ftx1.writable > 0 && ftx1.excluded > 0);
  assert.equal(rows.find(row => row.id === "quansheng-uvk5").status, "codeplug local only");
  assert.ok(rows.find(row => row.id === "quansheng-uvk5").editor);
  for (const row of rows.filter(entry => entry.mode === "none")) assert.equal(row.writable, 0);
  for (const row of rows) assert.ok(row.source);
  const ic705Row = rows.find(row => row.id === "icom-ic-705");
  assert.ok(ic705Row, "IC-705 catalog row");
  assert.equal(ic705Row.family, "ic705-civ");
  assert.deepEqual(ic705Row.live, ["android"]);
  assert.ok(ic705Row.writable > 0 && ic705Row.excluded > 0);
  assert.ok(rows.some(row => row.id === "android-kiss-tnc"));
});
