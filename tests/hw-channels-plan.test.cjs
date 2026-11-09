"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../radio-core.js");
const H = require("../scripts/hw-channels.cjs");

const HEADER = "Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,RxDtcsCode,CrossMode,Mode,TStep,Skip,Power,Comment,URCALL,RPT1CALL,RPT2CALL,DVCODE";
const quote = value => /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
// Rows as build-chirp-spain.py writes them.
function line(number, { name, freq, duplex = "off", offset = "0.000000", tone = "", tx = "88.5", mode, comment }) {
  return [number, name, freq, duplex, offset, tone, tx, tx, "023", "NN", "023", "Tone->Tone", mode, "25.00", "", duplex === "off" ? "Low" : "High", comment, "", "", "", ""]
    .map(value => quote(String(value))).join(",");
}
const csv = rows => [HEADER, ...rows.map((row, index) => line(index + 1, row))].join("\r\n") + "\r\n";
const repeater = (name, freq, extra = {}) => ({ name, freq, duplex: "-", offset: "0.600000", tone: "Tone", tx: "82.5", mode: "FM",
  comment: "URE Córdoba, IM77OX · ea5pg.es · https://www.ea5pg.es/", ...extra });
const airport = (code, kind, freq, municipality) => ({ name: `${code} ${kind}`, freq, mode: "AM",
  comment: `Airport (${municipality}) · ${kind} · ${code}` });
const pmr = n => ({ name: `PMR${String(n).padStart(2, "0")}`, freq: (446.00625 + (n - 1) * 0.0125).toFixed(6), mode: "NFM", comment: `PMR446 canal ${n} · solo RX` });
const cb = (n, mode, freq) => ({ name: `CB${String(n).padStart(2, "0")} ${mode}`, freq, mode, comment: `CB 27 MHz canal ${n} ${mode} · solo RX` });
const regions = { LECU: "ES-MD", LEMD: "ES-MD", LEAL: "ES-VC", LEMG: "ES-AN", LEXJ: "ES-CB" };
const communityOf = code => regions[code] || "";

function configuration() {
  const image = new Uint8Array(0xa180).fill(255);
  image.fill(0, 0, 16);
  R.view(image).setUint32(0, 14550000, true);
  image.fill(0, 0x4000, 0x4010);
  image.set(new TextEncoder().encode("BASE-FM"), 0x4000);
  image.set([2, 25], 0x8000);
  image.fill(0, 0xa160, 0xa170);
  image.set(new TextEncoder().encode("v6.1.0"), 0xa160);
  return image;
}

test("CSV parser handles quoted commas, doubled quotes, CRLF, BOM and rejects ragged rows", () => {
  const rows = H.parseCsv("\uFEFFa,b,c\r\n1,\"x, y\",\"say \"\"hi\"\"\"\r\n\r\n2,,z\r\n");
  assert.deepEqual(rows, [{ a: "1", b: "x, y", c: 'say "hi"' }, { a: "2", b: "", c: "z" }]);
  assert.throws(() => H.parseCsv("a,b\n1\n"), /1 fields/);
  assert.throws(() => H.parseCsv("a,b\n1,\"2\n"), /unterminated/);
  assert.throws(() => H.parseCsv("a,b\n", ["c"]), /no c column/);
});

test("zones come from the callsign (district), the Comment (service) and the airport region (community)", () => {
  const [ed7, edyar, ea1] = H.parseCsv(csv([repeater("ED7YAA", "145.775000"), repeater("EDYAR", "145.675000"), repeater("EA1ABC V", "145.600000")]));
  assert.equal(H.districtZone(ed7), "EA7");
  assert.equal(H.districtZone(edyar), "EA0");
  assert.equal(H.districtZone(ea1), "EA1");
  const [ap, unknown, mismatch] = H.parseCsv(csv([airport("LECU", "GND", "121.800000", "Madrid"), airport("ZZZZ", "TWR", "118.700000", "X"),
    { ...airport("LEMD", "TWR", "118.700000", "Madrid"), name: "LEAL TWR" }]));
  assert.equal(H.communityZone(ap, communityOf), "Madrid");
  assert.throws(() => H.communityZone(unknown, communityOf), /no unambiguous/);
  assert.throws(() => H.communityZone(mismatch, communityOf), /not in Comment/);
  const [p, cbAm, cbFm] = H.parseCsv(csv([pmr(1), cb(1, "AM", "26.965000"), cb(1, "FM", "26.965000")]));
  assert.deepEqual([H.serviceZone(p), H.serviceZone(cbAm), H.serviceZone(cbFm)], ["PMR446", "CB AM", "CB FM"]);
  assert.throws(() => H.serviceZone({ Name: "X", Comment: "otro", Mode: "FM" }), /service is unknown/);
});

test("airports, PMR and CB map to AM / narrow, RX only; repeaters keep TX, offset and CTCSS", () => {
  const rows = H.parseCsv(csv([airport("LECU", "GND", "121.800000", "Madrid"), pmr(1), cb(1, "AM", "26.965000"), cb(1, "FM", "26.965000"),
    repeater("ED7YAA", "145.775000"), repeater("EA1UHF", "439.425000", { offset: "7.600000" })]));
  const [air, nfm, am, fm, rep, uhf] = rows.map(H.channelFromRow);
  assert.deepEqual([air.mode, air.rxOnly, air.tx], [1, true, "121.80000"]);
  assert.deepEqual([nfm.mode, nfm.narrow, nfm.rxOnly, nfm.rx], [0, true, true, "446.00625"]);
  assert.deepEqual([am.mode, am.rxOnly], [1, true]);
  assert.deepEqual([fm.mode, fm.narrow, fm.rxOnly], [0, false, true]);
  assert.deepEqual([rep.rxOnly, rep.tx, rep.ctcss], [false, "145.17500", 82.5]);
  assert.equal(uhf.tx, "431.82500");
  assert.throws(() => H.channelFromRow({ ...rows[4], Frequency: "151.000000", Offset: "0" }), /amateur bands/);
  assert.throws(() => H.channelFromRow({ ...rows[0], Duplex: "-", Offset: "0.6" }), /AM channels must be RX only/);
});

test("a plan writes memories 1..N with a scan list per zone and reads back clean", () => {
  const files = {
    "air.csv": csv([airport("LECU", "GND", "121.800000", "Madrid"), airport("LEAL", "TWR", "118.700000", "Alicante"), airport("LEMD", "APP", "119.100000", "Madrid")]),
    "rep.csv": csv([repeater("EDYAR", "145.675000"), repeater("ED7YAA", "145.775000")]),
    "pmr.csv": csv([pmr(1), pmr(2), cb(1, "AM", "26.965000")])
  };
  const plan = H.buildBankPlan([
    { csv: "rep.csv", zoneBy: "district" },
    { csv: "air.csv", zoneBy: "community" },
    { csv: "pmr.csv", filter: { zone: "PMR446" }, zoneBy: "service" }
  ], { readText: name => files[name], communityOf });
  assert.deepEqual(plan.zones, [{ zone: "EA0", list: 1, count: 1 }, { zone: "EA7", list: 2, count: 1 }, { zone: "Madrid", list: 3, count: 2 },
    { zone: "C. Valenciana", list: 4, count: 1 }, { zone: "PMR446", list: 5, count: 2 }]);
  assert.equal(plan.channels.length, 7);
  const original = configuration();
  const planned = H.planBankImage(original, plan.channels);
  assert.deepEqual(H.verifyBank(planned.image, plan.channels).problems, []);
  const decoded = R.readQuanshengChannels(planned.image);
  assert.deepEqual(decoded.map(channel => channel.number), [1, 2, 3, 4, 5, 6, 7]);
  const lecu = decoded.find(channel => channel.name === "LECU GND");
  assert.deepEqual([lecu.mode, lecu.rxOnly, lecu.scanList, lecu.narrow], [1, true, 3, false]);
  const ed7 = decoded.find(channel => channel.name === "ED7YAA");
  assert.deepEqual([ed7.mode, ed7.rxOnly, ed7.tx, ed7.scanList], [0, false, "145.17500", 2]);
  assert.deepEqual([planned.image[16 + 9], planned.image[16 + 10]], [R.QUANSHENG_CTCSS.indexOf(82.5), 0x10]);
  assert(decoded.find(channel => channel.name === "PMR01").narrow);
  // A corrupted read-back is reported against its zone.
  const damaged = planned.image.slice();
  damaged[0x8000 + 2 * 2 + 1] = 9;
  const check = H.verifyBank(damaged, plan.channels);
  assert.equal(check.zones.find(zone => zone.zone === "EA7").ok, true);
  assert.equal(check.zones.find(zone => zone.zone === "Madrid").ok, false);
});

test("the bank is replaced: old memories beyond the plan are cleared", () => {
  const original = configuration();
  const channels = H.buildBankPlan([{ csv: "p.csv", zoneBy: "service" }], { readText: () => csv([pmr(1), pmr(2)]), communityOf }).channels;
  const first = H.planBankImage(original, channels).image;
  const bigger = H.buildBankPlan([{ csv: "p.csv", zoneBy: "service" }], { readText: () => csv([pmr(1), pmr(2), pmr(3), pmr(4)]), communityOf }).channels;
  const filled = H.planBankImage(first, bigger).image;
  assert.equal(R.readQuanshengChannels(filled).length, 4);
  assert.deepEqual(R.readQuanshengChannels(H.planBankImage(filled, channels).image).map(channel => channel.name), ["PMR01", "PMR02"]);
});

test("more than 200 channels or more than 24 zones are refused", () => {
  const simplex = { duplex: "", offset: "0.000000" };
  const many = n => csv(Array.from({ length: n }, (_, index) => repeater(`EA1R${index}`, (144 + index * 0.005).toFixed(6), simplex)));
  assert.equal(H.buildBankPlan([{ csv: "r", zoneBy: "district" }], { readText: () => many(200), communityOf }).channels.length, 200);
  assert.throws(() => H.buildBankPlan([{ csv: "r", zoneBy: "district" }], { readText: () => many(201), communityOf }), /more than 200/);
  const districts = csv(Array.from({ length: 10 }, (_, digit) => repeater(`EA${digit}ZZZ`, (144 + digit * 0.1).toFixed(6), simplex)));
  const codes = Object.keys(regionMap(19));
  const airports = csv(codes.map((code, index) => airport(code, "TWR", (118 + index * 0.1).toFixed(6), "X")));
  const of = code => regionMap(19)[code];
  const plan = filter => H.buildBankPlan([{ csv: "d", zoneBy: "district" }, { csv: "a", zoneBy: "community", filter }],
    { readText: name => name === "d" ? districts : airports, communityOf: of });
  assert.equal(plan({ zone: ["Madrid", "Navarra", "Galicia", "Aragón", "Murcia", "Canarias", "Cataluña", "Asturias", "Cantabria", "Ceuta", "Melilla", "La Rioja", "Baleares", "Extremadura"] }).zones.length, 24);
  assert.throws(() => plan(undefined), /More than 24 zones/);
});

test("an existing complete backup is reused only when every part matches the live radio; configuration.bin completes it", async () => {
  const bytesOf = (name, fill) => new Uint8Array(16).fill(fill);
  const disk = { "calibration.bin": bytesOf("c", 1), "external-flash.bin": bytesOf("f", 2), "base-firmware.bin": bytesOf("b", 3) };
  const entry = (name, file) => ({ name, file, size: 16, sha256: null, metadata: null });
  const files = [entry("calibration", "calibration.bin"), entry("external-flash", "external-flash.bin"), entry("base-firmware", "base-firmware.bin")];
  for (const item of files) item.sha256 = await R.sha256(disk[item.file]);
  const manifest = { format: "bricohams-hw-channels-backup", version: 1, createdAt: new Date().toISOString(), status: "complete",
    model: "UV-K5-V3", device: { firmware: "F4HWN v6.1.0" }, files };
  const base = { manifest, readPart: file => disk[file] ?? null, model: "UV-K5-V3", firmware: "F4HWN v6.1.0", calibrationSha256: files[0].sha256 };

  const ok = await H.reusableBackupState(base);
  assert.equal(ok.reusable, true);
  assert.equal(ok.hasConfiguration, false);
  assert.equal((await H.reusableBackupState({ ...base, calibrationSha256: "00" })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, firmware: "F4HWN v7.0.0" })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, model: "UV-K1" })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, manifest: { ...manifest, status: "partial" } })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, now: Date.now() + 13 * 3600 * 1000 })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, readPart: file => file === "external-flash.bin" ? bytesOf("x", 9) : disk[file] })).reusable, false);
  assert.equal((await H.reusableBackupState({ ...base, manifest: { ...manifest, files: files.slice(0, 2) } })).reusable, false);

  const config = new Uint8Array(R.QUANSHENG_CONFIG_SIZE);
  const completed = H.withConfiguration(manifest, config, "abc");
  assert.equal(completed.status, "complete");
  assert.equal(completed.files.length, 4);
  assert.deepEqual(completed.files.find(item => item.name === "configuration"), { name: "configuration", file: "configuration.bin", size: config.length, sha256: "abc", metadata: null });
  assert.equal(H.withConfiguration(completed, config, "def").files.filter(item => item.name === "configuration").length, 1);
  assert.equal(manifest.files.length, 3);
});

test("original configuration needs two identical reads that equal configuration.bin", async () => {
  const backup = configuration();
  const other = configuration();
  other[0x100] = 1;
  const connectorOf = (...reads) => ({ readConfiguration: async () => reads.shift() });

  const ok = await H.originalConfiguration(connectorOf(backup.slice(), backup.slice()), backup);
  assert.ok(R.equal(ok, backup));
  await assert.rejects(H.originalConfiguration(connectorOf(backup.slice(), other), backup), /Two configuration reads differ/);
  await assert.rejects(H.originalConfiguration(connectorOf(other.slice(), other.slice()), backup), /configuration changed between backup and load/);
});

function regionMap(count) {
  const keys = ["AN", "AR", "AS", "CB", "CE", "CL", "CM", "CN", "CT", "EX", "GA", "IB", "MC", "MD", "ML", "NC", "PV", "RI", "VC"].slice(0, count);
  return Object.fromEntries(keys.map((key, index) => [`LE${String.fromCharCode(65 + index)}${String.fromCharCode(65 + index)}`, `ES-${key}`]));
}
