"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../planning-core.js");
require("../transports.js");
require("../ftx1-menu.js");
require("../ftx1-core.js");

const pad = (value, length) => String(value).padStart(length, "0");
const field = (overrides = {}) => ({ channel: 1, frequencyHz: 145500000, clarDirection: "+", clarOffsetHz: 0,
  rxClar: false, txClar: false, mode: "4", channelType: "1", toneMode: "1", shift: "2", ...overrides });
const mr = f => `MR${pad(f.channel, 5)}${pad(f.frequencyHz, 9)}${f.clarDirection}${pad(f.clarOffsetHz, 4)}` +
  `${f.rxClar ? 1 : 0}${f.txClar ? 1 : 0}${f.mode}${f.channelType}${f.toneMode}00${f.shift};`;
const item = key => R.FTX1_MENU.find(entry => R.ftx1MenuKey(entry) === key);
const clone = value => JSON.parse(JSON.stringify(value));

class MockFtx1Port extends R.BufferedTransport {
  constructor({ memories = new Map(), menu = new Map(), ignoreWrites = false } = {}) {
    super();
    this.opened = true;
    this.memories = memories;
    this.menu = menu;
    this.ignoreWrites = ignoreWrites;
    this.commands = [];
  }
  async write(bytes) {
    const text = Buffer.from(bytes).toString("latin1");
    for (const command of text.split(";").filter(Boolean).map(part => `${part};`)) {
      this.commands.push(command);
      const answer = this.handle(command);
      if (answer !== null) this.push(new TextEncoder().encode(answer));
    }
  }
  handle(command) {
    let match;
    if (command === "ID;") return "ID0840;";
    if (command === "AI0;") return null;
    if ((match = /^MR(\d{5});$/.exec(command))) {
      const entry = this.memories.get(Number(match[1]));
      return entry ? mr(entry.fields) : "?;";
    }
    if ((match = /^MT(\d{5});$/.exec(command))) {
      const entry = this.memories.get(Number(match[1]));
      return entry ? `MT${match[1]}${entry.name.padEnd(12)};` : "?;";
    }
    if (/^MW\d{5}/.test(command)) {
      const fields = R.parseFtx1Memory(`MR${command.slice(2)}`);
      if (!this.ignoreWrites) {
        const previous = this.memories.get(fields.channel);
        this.memories.set(fields.channel, { fields, name: previous ? previous.name : "" });
      }
      return null;
    }
    if ((match = /^MT(\d{5})([\x20-\x7e]{12});$/.exec(command))) {
      const entry = this.memories.get(Number(match[1]));
      if (!entry) return "?;";
      if (!this.ignoreWrites) entry.name = match[2].trimEnd();
      return null;
    }
    if ((match = /^EX(\d{6});$/.exec(command))) {
      return this.menu.has(match[1]) ? `EX${match[1]}${this.menu.get(match[1])};` : "?;";
    }
    if ((match = /^EX(\d{6})([\x20-\x7e]+);$/.exec(command))) {
      if (!this.menu.has(match[1])) return "?;";
      if (!this.ignoreWrites) this.menu.set(match[1], match[2]);
      return null;
    }
    return "?;";
  }
}
test("answers captured read-only from a real FTX-1 (CAT-2, 4800 bps) parse as documented", () => {
  assert.deepEqual(R.parseFtx1Memory("MR00001029670000+000000410000;"), { channel: 1, frequencyHz: 29670000,
    clarDirection: "+", clarOffsetHz: 0, rxClar: false, txClar: false, mode: "4", channelType: "1", toneMode: "0", shift: "0" });
  const repeater = R.parseFtx1Memory("MR00007145600000+000000412002;");
  assert.equal(repeater.toneMode, "2");
  assert.equal(repeater.shift, "2");
  assert.equal(R.parseFtx1Memory("MR00100145725000+000000410002;").channel, 100);
  assert.equal(R.parseFtx1Memory("MR00015145600000+000000H12002;").mode, "H");
  // Channel 391 of the real radio uses mode "0" ("-" in the manual): it is read and shown, never written.
  const undocumented = R.parseFtx1Memory("MR00391431850000+000000010000;");
  assert.equal(undocumented.mode, "0");
  assert.equal(R.ftx1ModeLabel("0"), "- (sin documentar)");
  assert.throws(() => R.ftx1MemoryWriteCommand(undocumented), /Canal 391: modo sin documentar/);
  assert.match(R.ftx1MemoriesCSV([{ channel: 391, empty: false, memory: undocumented, name: "Hotspot mobi" }]), /DIG/);
  assert.equal(R.readFtx1Backup(R.ftx1Backup("memories", [{ channel: 391, empty: false, memory: undocumented,
    name: "Hotspot mobi" }])).data[0].memory.mode, "0");
  assert.equal(R.parseFtx1Tag("MT00001ED1YBQ      ;", 1), "ED1YBQ");
  assert.equal(R.parseFtx1MenuAnswer(item("040101"), "EX040101EA5KAO-FTX;"), "EA5KAO-FTX");
  assert.equal(R.parseFtx1MenuAnswer(item("010101"), "EX010101+00;"), "+00");
  assert.equal(R.validateFtx1MenuValue(item("060105"), "EA5KAO-7", ""), "EA5KAO-7");
});
const radio = options => {
  const memories = new Map([
    [1, { fields: field(), name: "R1 MADRID" }],
    [3, { fields: field({ channel: 3, frequencyHz: 433500000, mode: "B", shift: "0", toneMode: "0" }), name: "UHF 3" }]
  ]);
  return new MockFtx1Port({ memories, ...options });
};

test("MR answer parses and the MW command round trips from the same fields", () => {
  const answer = mr(field());
  assert.equal(answer, "MR00001145500000+000000411002;");
  assert.equal(answer.length, 30);
  assert.deepEqual(R.parseFtx1Memory(answer), field());
  assert.equal(R.ftx1MemoryWriteCommand(field()), answer.replace(/^MR/, "MW"));
  const full = field({ channel: 99, frequencyHz: 470000000, clarDirection: "-", clarOffsetHz: 9990, rxClar: true,
    txClar: true, mode: "I", channelType: "5", toneMode: "5", shift: "1" });
  assert.deepEqual(R.parseFtx1Memory(mr(full)), full);
  assert.equal(R.ftx1MemoryWriteCommand(full), mr(full).replace(/^MR/, "MW"));
  assert.equal(R.ftx1MemoryWriteCommand({ ...field(), channelType: undefined }), answer.replace(/^MR/, "MW"));
});

test("malformed memories and out of range values are rejected", () => {
  for (const bad of ["MR1;", "", mr(field()).slice(0, -2) + ";", mr(field()).replace("+", "*"),
    mr(field({ channel: 0 })), mr(field({ channel: 1000 })),
    mr(field({ frequencyHz: 29999 })), mr(field({ frequencyHz: 470000001 })), mr(field()).replace(/00(\d);$/, "01$1;")]) {
    assert.throws(() => R.parseFtx1Memory(bad), undefined, bad);
  }
  for (const bad of [field({ mode: "0" }), field({ mode: "G" }), field({ mode: "J" }), field({ channel: 0 }),
    field({ channel: 1000 }), field({ frequencyHz: 29999 }), field({ frequencyHz: 470000001 }),
    field({ frequencyHz: 145500000.5 }), field({ clarOffsetHz: 9991 }), field({ clarOffsetHz: -1 }),
    field({ toneMode: "6" }), field({ shift: "3" }), field({ clarDirection: "x" }), field({ rxClar: 1 })]) {
    assert.throws(() => R.ftx1MemoryWriteCommand(bad), undefined, JSON.stringify(bad));
  }
  assert.equal(R.parseFtx1Memory("?;"), null);
});

test("tag names are 12 printable ASCII characters padded with spaces", () => {
  assert.equal(R.ftx1TagWriteCommand(1, "EA5KAO"), `MT00001${"EA5KAO".padEnd(12)};`);
  assert.equal(R.parseFtx1Tag(`MT00001${"EA5KAO".padEnd(12)};`, 1), "EA5KAO");
  assert.equal(R.parseFtx1Tag("?;", 1), "");
  assert.throws(() => R.parseFtx1Tag(`MT00002${"X".padEnd(12)};`, 1));
  assert.throws(() => R.ftx1TagWriteCommand(1, "A".repeat(13)));
  assert.throws(() => R.ftx1TagWriteCommand(1, "Nandu\u00fa"));
  assert.throws(() => R.ftx1TagWriteCommand(1, "A;B"));
  assert.throws(() => R.ftx1TagWriteCommand(0, "A"));
  assert.throws(() => R.ftx1TagWriteCommand(1000, "A"));
});

test("a session checks the ID, reads memories and treats ?; as an empty slot", async () => {
  const port = radio();
  const cat = new R.Ftx1Cat(port);
  await cat.connect();
  assert.deepEqual(port.commands, ["ID;", "AI0;"]);
  const progress = [];
  const slots = await cat.readMemories(1, 3, (done, total) => progress.push([done, total]));
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots[1], { channel: 2, empty: true, memory: null, name: "" });
  assert.equal(slots[0].name, "R1 MADRID");
  assert.deepEqual(slots[2].memory, field({ channel: 3, frequencyHz: 433500000, mode: "B", shift: "0", toneMode: "0" }));
  const other = new MockFtx1Port();
  other.handle = command => command === "ID;" ? "ID0123;" : "?;";
  await assert.rejects(new R.Ftx1Cat(other).connect(), /FTX-1/);
});

test("editing, diffing and writing sends MW and MT and verifies by reading back", async () => {
  const port = radio();
  const cat = new R.Ftx1Cat(port);
  await cat.connect();
  const slots = await cat.readMemories(1, 3);
  const edit = clone(slots);
  edit[0].memory.frequencyHz = 145600000;
  edit[0].name = "R1 NUEVO";
  assert.deepEqual(R.diffFtx1Memories(slots, edit), [{ channel: 1, changes: [
    { field: "frequencyHz", from: 145500000, to: 145600000 },
    { field: "name", from: "R1 MADRID", to: "R1 NUEVO" }] }]);
  assert.deepEqual(R.diffFtx1Memories(slots, clone(slots)), []);
  port.commands.length = 0;
  const verified = await cat.writeMemories([edit[0]], () => {}, slots);
  assert.deepEqual(port.commands, [
    mr(field({ frequencyHz: 145600000 })).replace(/^MR/, "MW"),
    `MT00001${"R1 NUEVO".padEnd(12)};`, "MR00001;", "MT00001;"]);
  assert.equal(port.memories.get(1).fields.frequencyHz, 145600000);
  assert.equal(port.memories.get(1).name, "R1 NUEVO");
  assert.equal(verified[0].name, "R1 NUEVO");
  port.commands.length = 0;
  const onlyFrequency = clone(verified[0]);
  onlyFrequency.memory.frequencyHz = 145700000;
  await cat.writeMemories([onlyFrequency], () => {}, verified);
  assert.ok(!port.commands.some(command => command.startsWith("MT") && command.length > 8 && command !== "MT00001;"));
});

test("writing into an empty slot also writes its tag; emptying a slot is refused", async () => {
  const port = radio();
  const cat = new R.Ftx1Cat(port);
  await cat.connect();
  const slots = await cat.readMemories(1, 3);
  const edit = clone(slots);
  edit[1] = { channel: 2, empty: false, memory: field({ channel: 2, frequencyHz: 145000000 }), name: "NEW" };
  const diff = R.diffFtx1Memories(slots, edit);
  assert.equal(diff.length, 1);
  assert.deepEqual(diff[0].changes[0], { field: "empty", from: true, to: false });
  port.commands.length = 0;
  await cat.writeMemories([edit[1]], () => {}, slots);
  assert.ok(port.commands[0].startsWith("MW00002"));
  assert.equal(port.commands[1], `MT00002${"NEW".padEnd(12)};`);
  port.commands.length = 0;
  await assert.rejects(cat.writeMemories([slots[1]]), /vacio/);
  assert.deepEqual(port.commands, []);
});

test("a radio that answers a different value on read back fails with the channel number", async () => {
  const port = radio({ ignoreWrites: true });
  const cat = new R.Ftx1Cat(port);
  await cat.connect();
  const slots = await cat.readMemories(1, 1);
  const edit = clone(slots);
  edit[0].memory.frequencyHz = 145600000;
  await assert.rejects(cat.writeMemories([edit[0]], () => {}, slots), /canal 1\b/);
});

test("copying a slot and CSV export/import work on copies and never mutate their inputs", async () => {
  const cat = new R.Ftx1Cat(radio());
  await cat.connect();
  const slots = await cat.readMemories(1, 3);
  const before = JSON.stringify(slots);
  const copied = R.ftx1CopySlot(slots, 1, 5);
  assert.equal(JSON.stringify(slots), before);
  const five = copied.find(slot => slot.channel === 5);
  assert.equal(five.memory.channel, 5);
  assert.equal(five.name, "R1 MADRID");
  five.memory.frequencyHz = 1;
  assert.equal(slots[0].memory.frequencyHz, 145500000);
  assert.throws(() => R.ftx1CopySlot(slots, 2, 5), /vacio/);
  assert.throws(() => R.ftx1CopySlot(slots, 1, 1000));
  assert.throws(() => R.ftx1CopySlot(slots, 1, 1));

  const simplex = clone(slots);
  simplex[0].memory.shift = "0";
  simplex[0].memory.toneMode = "0";
  const csv = R.ftx1MemoriesCSV(simplex);
  assert.match(csv, /^"Location","Name","Frequency","Duplex","Offset","Tone","rToneFreq","cToneFreq","DtcsCode","DtcsPolarity","Mode","TStep","Skip","Comment"/);
  assert.equal(csv.trim().split("\r\n").length, 3);
  assert.match(csv, /"145\.500000"/);
  assert.match(csv, /"NFM"/);
  assert.match(csv, /no se leen por CAT/);
  assert.equal(R.parseChannelCSV(csv).format, "CHIRP");
  const frozen = JSON.stringify(simplex);
  const imported = R.ftx1ImportCSV(csv, 10, simplex);
  assert.equal(JSON.stringify(simplex), frozen);
  assert.equal(imported.imported, 2);
  assert.equal(imported.rejected.length, 0);
  const ten = imported.slots.find(slot => slot.channel === 10);
  const eleven = imported.slots.find(slot => slot.channel === 11);
  assert.equal(ten.memory.frequencyHz, 145500000);
  assert.equal(ten.memory.mode, "4");
  assert.equal(eleven.memory.mode, "B");
  assert.equal(eleven.name, "UHF 3");
  assert.deepEqual([ten.memory.toneMode, ten.memory.clarDirection, ten.memory.clarOffsetHz, ten.memory.rxClar,
    ten.memory.txClar, ten.memory.channelType], ["0", "+", 0, false, false, "1"]);
  assert.throws(() => R.ftx1ImportCSV(csv, 999, simplex), /999/);
  assert.throws(() => R.ftx1ImportCSV(csv, 0, simplex));

  const shifted = clone(slots);
  assert.match(R.ftx1MemoriesCSV(shifted), /,"-","0\.000000"/);
  const hostile = clone(slots);
  hostile[0].name = "=cmd";
  assert.match(R.ftx1MemoriesCSV(hostile), /"'=cmd"/);
});

test("CSV import maps the transmit offset sign to the shift", () => {
  const text = ["Location,Name,Frequency,Duplex,Offset,Tone,Mode", "0,RPT,145.600000,-,0.600000,,FM",
    "1,SIMP,145.500000,,0.000000,,FM", "2,UP,430.000000,+,1.600000,,NFM"].join("\r\n") + "\r\n";
  const result = R.ftx1ImportCSV(text, 1, []);
  assert.deepEqual(result.slots.map(slot => [slot.channel, slot.memory.shift, slot.memory.mode]),
    [[1, "2", "4"], [2, "0", "4"], [3, "1", "B"]]);
});

test("menu items read, validate, write and verify; unknown items are unavailable", async () => {
  const slope = item("010108");
  const treble = item("010101");
  const dtmf = item("010328");
  const lcut = item("010107");
  const rate = item("030105");
  const mic = item("030609");
  const menu = new Map([["010108", "1"], ["010101", "-05"], ["010328", "123A".padEnd(16)], ["030105", "3"]]);
  const port = new MockFtx1Port({ menu });
  const cat = new R.Ftx1Cat(port);
  await cat.connect();
  const read = await cat.readMenu([slope, treble, dtmf, lcut, rate]);
  assert.deepEqual(read.values, { "010108": "1", "010101": "-05", "010328": "123A".padEnd(16), "030105": "3" });
  assert.deepEqual(read.unavailable, ["010107"]);

  assert.equal(R.ftx1MenuReadCommand(slope), "EX010108;");
  assert.equal(R.parseFtx1MenuAnswer(slope, "?;"), null);
  assert.throws(() => R.parseFtx1MenuAnswer(slope, "EX010109;1;"));
  // A real FTX-1 answers DCS CODE with 3 digits although the manual says 2: the length read from the radio wins.
  const dcs = item("010322");
  assert.equal(R.parseFtx1MenuAnswer(dcs, "EX010322000;"), "000");
  assert.equal(R.validateFtx1MenuValue(dcs, "023", "000"), "023");
  assert.throws(() => R.validateFtx1MenuValue(dcs, "23", "000"), /longitud/);
  assert.equal(R.parseFtx1MenuAnswer(slope, "EX01010811;"), "11");
  assert.throws(() => R.validateFtx1MenuValue(slope, "11", "11"), /opciones/);
  assert.throws(() => R.validateFtx1MenuValue(slope, "2"), /opciones/);
  assert.throws(() => R.validateFtx1MenuValue(slope, "11"), /longitud/);
  assert.throws(() => R.validateFtx1MenuValue(treble, "-5"), /longitud/);
  assert.throws(() => R.validateFtx1MenuValue(treble, "050"), /signo/);
  assert.equal(R.validateFtx1MenuValue(treble, "+05"), "+05");
  assert.equal(R.validateFtx1MenuValue(dtmf, "12"), "12".padEnd(16));
  assert.throws(() => R.validateFtx1MenuValue(dtmf, "\u00e9"));
  assert.throws(() => R.validateFtx1MenuValue(dtmf, "A;B"));
  assert.throws(() => R.validateFtx1MenuValue(dtmf, "X".repeat(17)));
  assert.throws(() => R.validateFtx1MenuValue(mic, "1"), /Longitud/);
  assert.equal(R.validateFtx1MenuValue(mic, "05", "00"), "05");
  assert.throws(() => R.validateFtx1MenuValue(mic, "5", "00"), /longitud/);
  assert.throws(() => R.validateFtx1MenuValue(rate, "4"), /solo lectura/);
  assert.equal(R.ftx1MenuWriteCommand(slope, "0"), "EX0101080;");
  assert.throws(() => R.ftx1MenuWriteCommand(rate, "4"), /solo lectura/);

  port.commands.length = 0;
  const written = await cat.writeMenu([{ key: "010108", item: slope, from: "1", to: "0" }]);
  assert.deepEqual(port.commands, ["EX0101080;", "EX010108;"]);
  assert.deepEqual(written, { "010108": "0" });
  assert.equal(menu.get("010108"), "0");
  port.commands.length = 0;
  await assert.rejects(cat.writeMenu([{ item: rate, from: "3", to: "4" }]), /solo lectura/);
  assert.deepEqual(port.commands, []);
  assert.equal(menu.get("030105"), "3");

  const stuck = new MockFtx1Port({ menu: new Map([["010108", "1"]]), ignoreWrites: true });
  const stuckCat = new R.Ftx1Cat(stuck);
  await stuckCat.connect();
  await assert.rejects(stuckCat.writeMenu([{ item: slope, from: "1", to: "0" }]), /LCUT SLOPE/);

  const diff = R.diffFtx1Menu({ "010108": "1", "030105": "3", "010101": "-05" }, { "010108": "0", "030105": "4", "010101": "-05" });
  assert.deepEqual(diff, [{ key: "010108", item: slope, from: "1", to: "0" }]);
});

test("backups round trip and reject anything unknown", async () => {
  const cat = new R.Ftx1Cat(radio());
  await cat.connect();
  const slots = await cat.readMemories(1, 3);
  const backup = R.ftx1Backup("memories", slots);
  assert.equal(backup.format, "bricohams-ftx1-backup");
  assert.equal(backup.version, 1);
  assert.equal(backup.radio, "FTX-1");
  assert.equal(new Date(backup.createdAt).toISOString(), backup.createdAt);
  const restored = R.readFtx1Backup(JSON.parse(JSON.stringify(backup)));
  assert.equal(restored.kind, "memories");
  assert.deepEqual(restored.data, slots);
  const values = { "010108": "1", "010101": "-05", "030105": "3" };
  assert.deepEqual(R.readFtx1Backup(JSON.parse(JSON.stringify(R.ftx1Backup("menu", values)))).data, values);
  assert.throws(() => R.ftx1Backup("other", []));
  assert.throws(() => R.readFtx1Backup({ ...backup, format: "x" }));
  assert.throws(() => R.readFtx1Backup({ ...backup, version: 2 }));
  assert.throws(() => R.readFtx1Backup({ ...backup, kind: "other" }));
  const badMode = clone(backup);
  badMode.data[0].memory.mode = "K";
  assert.throws(() => R.readFtx1Backup(badMode));
  const duplicated = clone(backup);
  duplicated.data[1] = clone(duplicated.data[0]);
  assert.throws(() => R.readFtx1Backup(duplicated), /repetidos/);
  assert.throws(() => R.readFtx1Backup(R.ftx1Backup("menu", { "999999": "1" })), /desconocidos/);
  assert.throws(() => R.readFtx1Backup(R.ftx1Backup("menu", { "010108": "9" })), /opciones/);
  assert.throws(() => R.readFtx1Backup(R.ftx1Backup("menu", { "010101": "5" })));
});

test("the generated menu catalog is consistent", () => {
  assert.ok(Object.isFrozen(R.FTX1_MENU));
  assert.ok(R.FTX1_MENU.length > 100);
  const keys = R.FTX1_MENU.map(entry => R.ftx1MenuKey(entry));
  assert.equal(new Set(keys).size, keys.length);
  for (const entry of R.FTX1_MENU) {
    for (const part of ["p1", "p2", "p3"]) assert.match(entry[part], /^\d{2}$/);
    assert.ok(["number", "signed", "text"].includes(entry.kind));
    assert.equal(typeof entry.readOnly, "boolean");
    assert.ok(entry.digits === null || Number.isInteger(entry.digits));
  }
  assert.equal(R.FTX1_MENU.find(entry => entry.name === "CAT-1 RATE").readOnly, true);
});

test("FTX-1 is included in the site and installers without unsafe rendering", () => {
  const { ALLOWED_FILES } = require("../server.cjs");
  const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  for (const file of ["ftx1.html", "ftx1-menu.js", "ftx1-core.js", "ftx1-ui.js", "ayuda-ftx1.html"]) {
    assert.ok(ALLOWED_FILES.includes(file), file);
    assert.ok(read("scripts/build-installers.sh").includes(file), file);
  }
  assert.match(read("app.js"), /nav\("ftx1"/);
  assert.match(read("ftx1.html"), /ayuda-ftx1\.html/);
  assert.match(read("ftx1.html"), /data-page="ftx1"/);
  assert.doesNotMatch(read("ftx1-ui.js"), /innerHTML/);
});

test("remote control commands and answers are byte exact", () => {
  assert.equal(R.ftx1SmeterReadCommand(1), "SM1;");
  assert.equal(R.parseFtx1Smeter("SM0128;", 0), 128);
  assert.throws(() => R.parseFtx1Smeter("SM1128;", 0), /otro lado/);
  assert.throws(() => R.parseFtx1Smeter("SM0256;", 0), /0-255/);
  assert.equal(R.ftx1MeterReadCommand(6), "RM6;");
  assert.equal(R.parseFtx1Meter("RM6010000;", 6), 10);
  assert.throws(() => R.ftx1MeterReadCommand(9), /1-8/);
  assert.throws(() => R.parseFtx1Meter("RM5010000;", 6), /otro medidor/);
  assert.equal(R.ftx1LevelReadCommand("AG", 0), "AG0;");
  assert.equal(R.ftx1LevelWriteCommand("RG", 1, 7), "RG1007;");
  assert.equal(R.ftx1LevelWriteCommand("SQ", 0, 255), "SQ0255;");
  assert.equal(R.parseFtx1Level("SQ", "SQ1099;", 1), 99);
  assert.throws(() => R.ftx1LevelWriteCommand("AG", 0, 256), /0-255/);
  assert.throws(() => R.ftx1LevelWriteCommand("AG", 2, 1), /Lado/);
  assert.throws(() => R.ftx1LevelWriteCommand("XX", 0, 1), /no valido/);
  assert.equal(R.ftx1WidthReadCommand(0), "SH0;");
  assert.equal(R.ftx1WidthWriteCommand(1, 5), "SH1005;");
  assert.equal(R.parseFtx1Width("SH0023;", 0), 23);
  assert.throws(() => R.ftx1WidthWriteCommand(0, 24), /Tabla 5/);
  assert.equal(R.ftx1IfShiftReadCommand(0), "IS0;");
  assert.equal(R.ftx1IfShiftWriteCommand(0, 200), "IS00+0200;");
  assert.equal(R.ftx1IfShiftWriteCommand(1, -1200), "IS10-1200;");
  assert.equal(R.ftx1IfShiftWriteCommand(0, 0), "IS00+0000;");
  assert.equal(R.parseFtx1IfShift("IS00-0040;", 0), -40);
  assert.equal(R.parseFtx1IfShift("IS00-0000;", 0), 0);
  assert.throws(() => R.ftx1IfShiftWriteCommand(0, 30), /20 Hz/);
  assert.throws(() => R.ftx1IfShiftWriteCommand(0, 1220), /-1200/);
  assert.equal(R.ftx1AgcReadCommand(0), "GT0;");
  assert.equal(R.ftx1AgcWriteCommand(1, 4), "GT14;");
  assert.equal(R.parseFtx1Agc("GT06;", 0), 6);
  assert.throws(() => R.ftx1AgcWriteCommand(0, 5), /0-4/);
  assert.throws(() => R.parseFtx1Agc("GT07;", 0), /GT no valida/);
  assert.equal(R.ftx1PreampReadCommand(2), "PA2;");
  assert.equal(R.ftx1PreampWriteCommand(0, 2), "PA02;");
  assert.equal(R.ftx1PreampWriteCommand(1, 1), "PA11;");
  assert.equal(R.parseFtx1Preamp("PA01;", 0), 1);
  assert.throws(() => R.ftx1PreampWriteCommand(1, 2), /VHF\/UHF/);
  assert.throws(() => R.ftx1PreampWriteCommand(3, 0), /Banda/);
  assert.equal(R.ftx1AttReadCommand(), "RA0;");
  assert.equal(R.ftx1AttWriteCommand(true), "RA01;");
  assert.equal(R.ftx1AttWriteCommand(false), "RA00;");
  assert.equal(R.parseFtx1Att("RA01;"), true);
  assert.equal(R.ftx1PowerReadCommand(), "PC;");
  assert.equal(R.ftx1PowerWriteCommand(1, 10), "PC1010;");
  assert.equal(R.ftx1PowerWriteCommand(2, 100), "PC2100;");
  assert.deepEqual(R.parseFtx1Power("PC1005;"), { head: 1, watts: 5, min: 5, max: 10 });
  assert.throws(() => R.ftx1PowerWriteCommand(1, 11), /5-10 W/);
  assert.throws(() => R.ftx1PowerWriteCommand(2, 4), /5-100 W/);
  assert.throws(() => R.parseFtx1Power("PC1050;"), /5-10 W/);
});

class RemotePort extends R.BufferedTransport {
  constructor(state, { ignore = [] } = {}) {
    super();
    this.opened = true;
    this.state = state;
    this.ignore = ignore;
    this.commands = [];
  }
  async write(bytes) {
    const command = Buffer.from(bytes).toString("latin1");
    this.commands.push(command);
    const answer = this.handle(command);
    if (answer !== null) this.push(new TextEncoder().encode(answer));
  }
  handle(command) {
    const code = command.slice(0, 2);
    const body = command.slice(2, -1);
    const set = (key, value) => { if (!this.ignore.includes(code)) this.state[key] = value; };
    if (code === "SM") return `SM${body}${this.state.sm};`;
    if (code === "RM") return `RM${body}${this.state.rm}000;`;
    if (code === "PC") {
      if (body === "") return `PC${this.state.pcHead}${this.state.pc};`;
      set("pc", body.slice(1));
      return null;
    }
    if (code === "RA") {
      if (body === "0") return `RA0${this.state.ra};`;
      set("ra", body.slice(1));
      return null;
    }
    if (code === "PA") {
      if (body.length === 1) return `PA${body}${this.state[`pa${body}`]};`;
      set(`pa${body[0]}`, body[1]);
      return null;
    }
    const key = code.toLowerCase() + body[0];
    if (code === "KS" || code === "LK" || code === "ST" || code === "FA" || code === "FB") {
      if (body === "") return `${code}${this.state[code.toLowerCase()]};`;
      set(code.toLowerCase(), body);
      return null;
    }
    if (code === "BP" || code === "CF") {
      const head = body.slice(0, code === "BP" ? 2 : 3);
      if (body.length === head.length) return `${code}${head}${this.state[code.toLowerCase() + head]};`;
      set(code.toLowerCase() + head, body.slice(head.length));
      return null;
    }
    if (body.length === 1) return `${code}${body}${this.state[key]};`;
    set(key, body.slice(1));
    return null;
  }
}
const remoteState = () => ({ sm: "042", rm: "010", ag0: "128", rg0: "255", sq0: "000", sh0: "005", is0: "0+0200", gt0: "5",
  pa0: "1", pa1: "0", pa2: "1", ra: "0", pc: "005", pcHead: 1, nl0: "003", rl0: "07", bc0: "0", na0: "1", bp00: "000", bp01: "150",
  cf000: "00000", cf001: "-0250", ks: "020", lk: "0", st: "0", md0: "2", fa: "014074000", fb: "007074000" });

test("readControls and readMeters read every documented command and setControl verifies by reading back", async () => {
  const port = new RemotePort(remoteState());
  const cat = new R.Ftx1Cat(port);
  const controls = await cat.readControls(0);
  assert.deepEqual(controls, { smeter: 42, af: 128, rf: 255, sql: 0, width: 5, ifShift: 200, agc: 5,
    preamp: { 0: 1, 1: 0, 2: 1 }, att: false, power: { head: 1, watts: 5, min: 5, max: 10 }, nb: 3, dnr: 7, anotch: false,
    notchOn: false, notchHz: 1500, narrow: true, clar: false, clarHz: -250, keySpeed: 20, lock: false });
  assert.deepEqual(port.commands, ["PA0;", "PA1;", "PA2;", "SM0;", "AG0;", "RG0;", "SQ0;", "SH0;", "IS0;", "GT0;", "RA0;", "PC;",
    "NL0;", "RL0;", "BC0;", "BP00;", "BP01;", "NA0;", "CF000;", "CF001;", "KS;", "LK;"]);
  const unavailable = new R.Ftx1Cat(new RemotePort(remoteState()));
  const original = unavailable.command.bind(unavailable);
  unavailable.command = (text, ...rest) => /^(NL|RL|BC|NA|CF|KS|LK)/.test(text) ? Promise.resolve("?;") : original(text, ...rest);
  const partial = await unavailable.readControls(0);
  assert.deepEqual([partial.nb, partial.dnr, partial.anotch, partial.narrow, partial.clar, partial.clarHz, partial.keySpeed, partial.lock],
    [null, null, null, null, null, null, null, null]);
  assert.equal(partial.af, 128);
  port.commands.length = 0;
  assert.equal((await cat.readMeters()).vdd, 10);
  assert.deepEqual(port.commands, ["RM1;", "RM2;", "RM3;", "RM4;", "RM5;", "RM6;", "RM7;", "RM8;"]);
  port.commands.length = 0;
  await cat.setControl("af", 0, 77);
  assert.deepEqual(port.commands, ["AG0077;", "AG0;"]);
  await cat.setControl("ifShift", 0, -20);
  await cat.setControl("width", 0, 12);
  await cat.setControl("preamp", 0, { band: 1, value: 1 });
  await cat.setControl("att", 0, true);
  assert.equal(await cat.setControl("agc", 0, 4), 4);
  assert.equal(await cat.setControl("power", 0, 10), 10);
  assert.equal(port.state.is0, "0-0020");
  assert.ok(port.commands.includes("PC1010;"));
});

test("setControl rejects out of range values before sending and fails when the read back differs", async () => {
  const port = new RemotePort(remoteState());
  const cat = new R.Ftx1Cat(port);
  await assert.rejects(cat.setControl("power", 0, 11), /5-10 W para FTX-1/);
  await assert.rejects(cat.setControl("sql", 0, 300), /0-255/);
  await assert.rejects(cat.setControl("width", 0, 24), /Tabla 5/);
  await assert.rejects(cat.setControl("nope", 0, 1), /no reconocido/);
  assert.ok(!port.commands.some(command => /^(SQ0300|SH0024|PC1011)/.test(command)));
  const stuck = new RemotePort(remoteState(), { ignore: ["AG", "RA"] });
  const stuckCat = new R.Ftx1Cat(stuck);
  await assert.rejects(stuckCat.setControl("af", 0, 10), /Verificacion fallida en AG/);
  await assert.rejects(stuckCat.setControl("att", 0, true), /Verificacion fallida en RA/);
});

test("receive extras (NL RL BC BP NA CF KS LK ST MD) are byte exact", () => {
  assert.equal(R.ftx1NbWriteCommand(0, 10), "NL0010;");
  assert.equal(R.ftx1NbReadCommand(1), "NL1;");
  assert.equal(R.parseFtx1Nb("NL1003;", 1), 3);
  assert.equal(R.ftx1DnrWriteCommand(1, 7), "RL107;");
  assert.equal(R.parseFtx1Dnr("RL010;", 0), 10);
  assert.equal(R.ftx1SideFlagWriteCommand("BC", 0, true), "BC01;");
  assert.equal(R.ftx1SideFlagWriteCommand("NA", 1, false), "NA10;");
  assert.equal(R.parseFtx1SideFlag("NA", "NA11;", 1), true);
  assert.equal(R.ftx1NotchOnWriteCommand(0, true), "BP00001;");
  assert.equal(R.ftx1NotchOnReadCommand(1), "BP10;");
  assert.equal(R.ftx1NotchHzWriteCommand(0, 1500), "BP01150;");
  assert.equal(R.ftx1NotchHzWriteCommand(1, 3200), "BP11320;");
  assert.equal(R.ftx1NotchHzReadCommand(0), "BP01;");
  assert.equal(R.parseFtx1NotchHz("BP01150;", 0), 1500);
  assert.equal(R.parseFtx1NotchOn("BP00001;", 0), true);
  assert.equal(R.ftx1ClarWriteCommand(0, true), "CF00010000;");
  assert.equal(R.ftx1ClarReadCommand(1), "CF100;");
  assert.deepEqual(R.parseFtx1Clar("CF00010000;", 0), { rx: true, tx: false });
  assert.equal(R.ftx1ClarHzWriteCommand(0, 250), "CF001+0250;");
  assert.equal(R.ftx1ClarHzWriteCommand(1, -9999), "CF101-9999;");
  assert.equal(R.ftx1ClarHzReadCommand(0), "CF001;");
  assert.equal(R.parseFtx1ClarHz("CF001-0000;", 0), 0);
  assert.equal(R.ftx1KeySpeedWriteCommand(4), "KS004;");
  assert.equal(R.ftx1KeySpeedWriteCommand(60), "KS060;");
  assert.equal(R.parseFtx1KeySpeed("KS020;"), 20);
  assert.equal(R.ftx1LockWriteCommand(true), "LK1;");
  assert.equal(R.parseFtx1Lock("LK0;"), false);
  assert.equal(R.ftx1SplitWriteCommand(true), "ST1;");
  assert.equal(R.ftx1SplitReadCommand(), "ST;");
  assert.equal(R.ftx1ModeWriteCommand("C"), "MD0C;");
  assert.equal(R.ftx1ModeReadCommand(), "MD0;");
  assert.equal(R.parseFtx1Mode("MD04;"), "4");
  assert.throws(() => R.parseFtx1Nb("NL0003;", 1), /otro lado/);
});

test("the unavailable BP answer (non numeric, e.g. in FM) parses as null", () => {
  assert.equal(R.parseFtx1NotchHz("BP01F35;", 0), null);
  assert.equal(R.parseFtx1NotchOn("BP00F00;", 0), null);
  assert.throws(() => R.parseFtx1NotchHz("BP00150;", 0), /otro lado o ajuste/);
  assert.throws(() => R.parseFtx1NotchHz("BP01321;", 0), /10-3200/);
  assert.throws(() => R.parseFtx1NotchOn("BP00002;", 0), /BP no valida/);
});

test("receive extras are verified by reading back and rejected out of range before sending", async () => {
  const port = new RemotePort(remoteState());
  const cat = new R.Ftx1Cat(port);
  await cat.setControl("nb", 0, 5);
  await cat.setControl("dnr", 1, 10);
  await cat.setControl("anotch", 0, true);
  await cat.setControl("narrow", 0, false);
  await cat.setControl("notchOn", 0, true);
  await cat.setControl("notchHz", 0, 1000);
  await cat.setControl("clar", 0, true);
  await cat.setControl("clarHz", 0, -1234);
  await cat.setControl("keySpeed", 0, 30);
  await cat.setControl("lock", 0, true);
  for (const written of ["NL0005;", "RL110;", "BC01;", "NA00;", "BP00001;", "BP01100;", "CF00010000;", "CF001-1234;", "KS030;", "LK1;"]) {
    assert.ok(port.commands.includes(written), written);
  }
  assert.equal(port.state.cf001, "-1234");
  assert.equal(await cat.setMode("C"), "C");
  assert.equal(await cat.setSplit(true), true);
  assert.deepEqual(await cat.readVfo(), { a: 14074000, b: 7074000, mode: "C", split: true });
  port.commands.length = 0;
  await assert.rejects(cat.setControl("nb", 0, 11), /0-10/);
  await assert.rejects(cat.setControl("dnr", 0, -1), /0-10/);
  await assert.rejects(cat.setControl("notchHz", 0, 5), /10-3200/);
  await assert.rejects(cat.setControl("notchHz", 0, 1005), /10 Hz/);
  await assert.rejects(cat.setControl("clarHz", 0, 10000), /9999/);
  await assert.rejects(cat.setControl("keySpeed", 0, 3), /4-60/);
  await assert.rejects(cat.setControl("keySpeed", 0, 61), /4-60/);
  await assert.rejects(cat.setControl("lock", 0, 1), /ON\/OFF/);
  await assert.rejects(cat.setControl("narrow", 2, true), /Lado/);
  await assert.rejects(cat.setMode("0"), /Modo no valido/);
  await assert.rejects(cat.setFrequency("A", 29999), /30000/);
  await assert.rejects(cat.setFrequency("A", 470000001), /470000000/);
  assert.deepEqual(port.commands, []);
  const stuck = new RemotePort(remoteState(), { ignore: ["NL", "KS", "CF", "BP", "MD", "ST"] });
  const stuckCat = new R.Ftx1Cat(stuck);
  await assert.rejects(stuckCat.setControl("nb", 0, 9), /Verificacion fallida en NL/);
  await assert.rejects(stuckCat.setControl("keySpeed", 0, 40), /Verificacion fallida en KS/);
  await assert.rejects(stuckCat.setControl("clar", 0, true), /Verificacion fallida en CF/);
  await assert.rejects(stuckCat.setControl("notchHz", 0, 1000), /Verificacion fallida en BP/);
  await assert.rejects(stuckCat.setMode("C"), /Verificacion fallida en MD/);
  await assert.rejects(stuckCat.setSplit(true), /Verificacion fallida en ST/);
});

test("readSwrSample only reads TX;, FA; and RM6; and returns the meter only while the radio reports TX", async () => {
  const AntennaCore = require("../antenna-core.js");
  class SwrPort extends R.BufferedTransport {
    constructor(tx, meter) { super(); this.opened = true; this.tx = tx; this.meter = meter; this.commands = []; }
    async write(bytes) {
      const command = Buffer.from(bytes).toString("latin1");
      this.commands.push(command);
      const answers = { "TX;": `TX${this.tx};`, "FA;": "FA007100000;", "RM6;": `RM6${String(this.meter).padStart(3, "0")}000;` };
      this.push(new TextEncoder().encode(answers[command] || "?;"));
    }
  }
  // Real bench answers (read only, RX): TX0; and RM6000000;
  assert.equal(R.ftx1TxReadCommand(), "TX;");
  assert.equal(R.parseFtx1TxState("TX0;"), false);
  assert.equal(R.parseFtx1TxState("TX1;"), true);
  assert.equal(R.parseFtx1TxState("TX2;"), true);
  assert.throws(() => R.parseFtx1TxState("TX3;"), /TX/);
  const rx = new SwrPort(0, 0);
  assert.deepEqual(await new R.Ftx1Cat(rx).readSwrSample(), { tx: false, freqHz: null, meter: null });
  assert.deepEqual(rx.commands, ["TX;"]);
  const tx = new SwrPort(2, 96);
  const sample = await new R.Ftx1Cat(tx).readSwrSample();
  assert.deepEqual(sample, { tx: true, freqHz: 7100000, meter: 96 });
  assert.deepEqual(tx.commands, ["TX;", "FA;", "RM6;"]);
  assert.equal(AntennaCore.swrFromMeter("ftx1", 0), 1);
  assert.equal(AntennaCore.swrFromMeter("ftx1", sample.meter), 1 + 0.333 * (Math.exp(0.0151 * 96) - 1));
});
