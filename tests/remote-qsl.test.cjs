"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const qsl = require("../remote-qsl.cjs");

const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const QSO = { call: "ea4xyz", frequencyMHz: "14.074", mode: "ft8", sent: "-10", received: "-12", notes: "test" };
const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-qsl-"));

// Manual timers: nothing fires unless the test calls fire().
function fakeTimers() {
  const pending = new Map();
  let id = 0;
  return {
    setTimer: fn => { id += 1; pending.set(id, fn); return id; },
    clearTimer: handle => { pending.delete(handle); },
    fire: () => { for (const [handle, fn] of [...pending]) { pending.delete(handle); fn(); } },
    size: () => pending.size
  };
}

function fakeSpawn(behaviour) {
  const calls = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter();
    child.killed = false;
    child.kill = () => { child.killed = true; };
    const call = { command, args, options, child, fileText: null };
    calls.push(call);
    const file = args.find(item => item.endsWith(".adi"));
    if (file && fs.existsSync(file)) call.fileText = fs.readFileSync(file, "utf8");
    call.file = file;
    if (behaviour) behaviour(child, call);
    return child;
  };
  spawn.calls = calls;
  return spawn;
}

const LOTW = { tqslPath: path.resolve("fake-tqsl.exe"), args: ["-q", "-u", "{file}"], timeoutSeconds: 30 };
const qrzXml = body => `<?xml version="1.0"?><QRZDatabase version="1.34"><Session>${body}</Session></QRZDatabase>`;

function makeService(extra = {}) {
  const dir = tempDir();
  const logs = [];
  const service = qsl.createQslService({ dir, now: () => NOW, log: line => logs.push(line), ...extra });
  return { dir, logs, service, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("QRZ and LoTW config are off unless fully configured", () => {
  assert.equal(qsl.normalizeQrzConfig(undefined).enabled, false);
  assert.equal(qsl.normalizeQrzConfig({ enabled: true, username: "ea4xyz" }).enabled, false);
  assert.equal(qsl.normalizeQrzConfig({ username: "a", password: "b" }).enabled, false);
  assert.equal(qsl.normalizeQrzConfig({ enabled: true, username: "a", password: "b" }).enabled, true);
  assert.equal(qsl.normalizeLotwConfig(undefined).configured, false);
  assert.equal(qsl.normalizeLotwConfig({ tqslPath: "tqsl", args: ["{file}"] }).configured, false);
  assert.equal(qsl.normalizeLotwConfig({ tqslPath: LOTW.tqslPath, args: ["-q"] }).configured, false);
  assert.equal(qsl.normalizeLotwConfig({ tqslPath: LOTW.tqslPath, args: [1, "{file}"] }).configured, false);
  const ok = qsl.normalizeLotwConfig(LOTW);
  assert.equal(ok.configured, true);
  assert.equal(ok.timeoutMs, 30_000);
  assert.equal(qsl.normalizeLotwConfig({ ...LOTW, timeoutSeconds: 99999 }).timeoutMs, 600_000);
});

test("manual QSO entry validates input and flags duplicates", async () => {
  const { service, dir, cleanup } = makeService();
  try {
    const first = await service.add(QSO);
    assert.equal(first.status, 201);
    assert.equal(first.body.contact.call, "EA4XYZ");
    assert.equal(first.body.dupe, null);
    const again = await service.add({ ...QSO, utc: "2026-11-23T12:05:00Z" });
    assert.equal(again.status, 201);
    assert.equal(again.body.dupe.id, first.body.contact.id);
    for (const bad of [{ ...QSO, call: "no" }, { ...QSO, frequencyMHz: "abc" }, { ...QSO, mode: "" }, { ...QSO, utc: "nope" },
      { ...QSO, notes: "ñ" }, { ...QSO, gridsquare: "ZZ99" }, null, []]) {
      assert.equal((await service.add(bad)).status, 400, JSON.stringify(bad));
    }
    const listed = service.list().body;
    assert.equal(listed.total, 2);
    assert.equal(listed.pendingLotw, 2);
    assert.deepEqual(listed.qrz, { enabled: false });
    assert.deepEqual(listed.lotw, { configured: false });
    const stored = JSON.parse(fs.readFileSync(path.join(dir, "qso-log.json"), "utf8"));
    assert.equal(stored.contacts.length, 2);
    if (process.platform !== "win32") assert.equal(fs.statSync(path.join(dir, "qso-log.json")).mode & 0o777, 0o600);
    const reopened = qsl.createQsoStore({ dir });
    assert.equal(reopened.all().length, 2);
  } finally { cleanup(); }
});

test("ADIF export round-trips through import and skips existing contacts", async () => {
  const a = makeService();
  const b = makeService();
  try {
    await a.service.add(QSO);
    await a.service.add({ ...QSO, call: "F4ABC", utc: "2026-11-23T13:00:00Z", frequencyMHz: "7.074" });
    const exported = a.service.exportAdif();
    const out = await exported;
    assert.equal(out.status, 200);
    assert.match(out.headers["Content-Disposition"], /radicodex\.adi/);
    assert.match(out.body, /<EOH>/);
    const first = await b.service.importAdif({ adif: out.body });
    assert.equal(first.status, 200);
    assert.deepEqual([first.body.added, first.body.skipped], [2, 0]);
    const second = await b.service.importAdif({ adif: out.body });
    assert.deepEqual([second.body.added, second.body.skipped], [0, 2]);
    assert.equal(b.service.list().body.total, 2);
    assert.equal((await b.service.importAdif({ adif: "<CALL:3>EA4<EOR>" })).status, 400);
    assert.equal((await b.service.importAdif({})).status, 400);
    assert.equal((await b.service.importAdif({ adif: "caf\u00e9<EOH>" })).status, 400);
  } finally { a.cleanup(); b.cleanup(); }
});

test("QRZ lookup is disabled by default and never calls the network", async () => {
  let calls = 0;
  const { service, cleanup } = makeService({ request: async () => { calls += 1; return { status: 200, body: "" }; } });
  try {
    assert.equal((await service.lookup("EA4XYZ")).status, 403);
    assert.equal(calls, 0);
  } finally { cleanup(); }
});

test("QRZ lookup logs in, reuses the session key and never leaks credentials", async () => {
  const urls = [];
  const request = async url => {
    urls.push(url);
    if (url.includes("username=")) return { status: 200, body: qrzXml("<Key>SESSIONKEY123</Key>") };
    return { status: 200, body: `<?xml version="1.0"?><QRZDatabase><Callsign><call>EA4XYZ</call><fname>Ana</fname><name>Perez</name><addr2>Madrid</addr2><country>Spain</country><grid>IN80</grid></Callsign><Session><Key>SESSIONKEY123</Key></Session></QRZDatabase>` };
  };
  const config = { qrz: qsl.normalizeQrzConfig({ enabled: true, username: "ea4xyz", password: "s3cret&pass" }) };
  const { service, logs, cleanup } = makeService({ config, request });
  try {
    assert.deepEqual(service.list().body.qrz, { enabled: true });
    const result = await service.lookup("ea4xyz");
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { call: "EA4XYZ", fname: "Ana", name: "Perez", qth: "Madrid", state: "", country: "Spain", grid: "IN80" });
    assert.equal(urls.length, 2);
    assert.ok(urls.every(url => url.startsWith("https://")));
    assert.match(urls[0], /password=s3cret%26pass;agent=RadiCodex/);
    assert.match(urls[1], /\?s=SESSIONKEY123;callsign=EA4XYZ/);
    await service.lookup("EA4XYZ");
    assert.equal(urls.length, 3);
    const everything = JSON.stringify(result) + JSON.stringify(service.list()) + logs.join("\n");
    assert.ok(!everything.includes("s3cret"));
    assert.ok(!everything.includes("SESSIONKEY123"));
  } finally { cleanup(); }
});

test("QRZ lookup renews an expired session once and maps QRZ errors", async () => {
  const replies = [
    qrzXml("<Key>K1</Key>"), qrzXml("<Error>Session Timeout</Error>"), qrzXml("<Key>K2</Key>"),
    qrzXml("<Error>Not found: EA4XYZ</Error><Key>K2</Key>")
  ];
  const request = async () => ({ status: 200, body: replies.shift() });
  const config = { qrz: qsl.normalizeQrzConfig({ enabled: true, username: "u", password: "p" }) };
  const { service, cleanup } = makeService({ config, request });
  try {
    const result = await service.lookup("EA4XYZ");
    assert.equal(result.status, 404);
    assert.equal(replies.length, 0);
    assert.equal((await service.lookup("bad call!")).status, 400);
  } finally { cleanup(); }
  const badLogin = makeService({ config, request: async () => ({ status: 200, body: qrzXml("<Error>Username/password incorrect</Error>") }) });
  try {
    const rejected = await badLogin.service.lookup("EA4XYZ");
    assert.equal(rejected.status, 502);
    assert.ok(!JSON.stringify(rejected).includes("Username/password"));
  } finally { badLogin.cleanup(); }
});

test("QRZ lookup times out, maps transport failures and rate limits", async () => {
  const timers = fakeTimers();
  const config = { qrz: qsl.normalizeQrzConfig({ enabled: true, username: "u", password: "p" }) };
  const hang = makeService({ config, request: () => new Promise(() => {}), setTimer: timers.setTimer, clearTimer: timers.clearTimer });
  try {
    const pending = hang.service.lookup("EA4XYZ");
    await new Promise(resolve => setImmediate(resolve));
    timers.fire();
    assert.equal((await pending).status, 504);
    assert.equal(timers.size(), 0);
  } finally { hang.cleanup(); }
  const down = makeService({ config, request: async () => { throw new Error("ECONNRESET https://x/?password=p"); } });
  try {
    const result = await down.service.lookup("EA4XYZ");
    assert.equal(result.status, 502);
    assert.ok(!JSON.stringify(result).includes("password"));
  } finally { down.cleanup(); }
  const http500 = makeService({ config, request: async () => ({ status: 500, body: "" }) });
  try { assert.equal((await http500.service.lookup("EA4XYZ")).status, 502); } finally { http500.cleanup(); }
  const limited = makeService({ config, request: async () => ({ status: 500, body: "" }) });
  try {
    for (let i = 0; i < 20; i += 1) await limited.service.lookup("EA4XYZ");
    assert.equal((await limited.service.lookup("EA4XYZ")).status, 429);
  } finally { limited.cleanup(); }
});

test("QRZ client and default transport refuse anything but HTTPS", async () => {
  assert.throws(() => qsl.createQrzClient({ username: "u", password: "p", baseUrl: "http://xmldata.qrz.com/xml/" }), /HTTPS/);
  await assert.rejects(() => qsl.httpsGet("http://xmldata.qrz.com/xml/"), error => error.status === 502);
  await assert.rejects(() => qsl.httpsGet("not a url"), error => error.status === 502);
  assert.throws(() => qsl.parseQrzXml("<html>nope</html>"), error => error.status === 502);
  assert.equal(qsl.parseQrzXml("<a><Error>x &amp; y</Error></a>").Error, "x & y");
});

test("LoTW upload is disabled without TQSL config and needs an explicit confirmation", async () => {
  const off = makeService();
  try {
    await off.service.add(QSO);
    assert.equal((await off.service.uploadLotw({ confirm: true })).status, 403);
  } finally { off.cleanup(); }
  const spawn = fakeSpawn((child) => setImmediate(() => child.emit("close", 0, null)));
  const on = makeService({ config: { lotw: qsl.normalizeLotwConfig(LOTW) }, spawn });
  try {
    await on.service.add(QSO);
    assert.equal((await on.service.uploadLotw({})).status, 400);
    assert.equal((await on.service.uploadLotw({ confirm: "yes" })).status, 400);
    assert.equal(spawn.calls.length, 0);
  } finally { on.cleanup(); }
});

test("LoTW upload runs TQSL with an argument array and no shell, then marks QSOs as sent", async () => {
  const spawn = fakeSpawn(child => setImmediate(() => child.emit("close", 0, null)));
  const root = tempDir();
  const { service, logs, cleanup } = makeService({ config: { lotw: qsl.normalizeLotwConfig(LOTW) }, spawn, tmpdir: () => root });
  try {
    await service.add(QSO);
    assert.equal(service.list().body.pendingLotw, 1);
    const result = await service.uploadLotw({ confirm: true });
    assert.deepEqual(result, { status: 200, body: { ok: true, uploaded: 1 } });
    const [call] = spawn.calls;
    assert.equal(call.command, LOTW.tqslPath);
    assert.ok(Array.isArray(call.args));
    assert.deepEqual(call.args.slice(0, 2), ["-q", "-u"]);
    assert.ok(call.args[2].endsWith("upload.adi"));
    assert.equal(call.options.shell, false);
    assert.equal(call.options.stdio, "ignore");
    assert.match(call.fileText, /<CALL:6>EA4XYZ/);
    assert.equal(fs.existsSync(call.file), false);
    assert.deepEqual(fs.readdirSync(root), []);
    assert.equal(service.list().body.pendingLotw, 0);
    assert.equal(service.list().body.contacts[0].lotwSentAt, new Date(NOW).toISOString());
    assert.ok(!logs.join("\n").includes(LOTW.tqslPath));
    assert.equal((await service.uploadLotw({ confirm: true })).status, 409);
    assert.equal(spawn.calls.length, 1);
  } finally { cleanup(); fs.rmSync(root, { recursive: true, force: true }); }
});

test("LoTW upload reports TQSL failures without marking QSOs and kills a hung TQSL", async () => {
  const config = { lotw: qsl.normalizeLotwConfig(LOTW) };
  const failing = makeService({ config, spawn: fakeSpawn(child => setImmediate(() => child.emit("close", 3, null))) });
  try {
    await failing.service.add(QSO);
    const result = await failing.service.uploadLotw({ confirm: true });
    assert.equal(result.status, 502);
    assert.equal(result.body.code, 3);
    assert.equal(failing.service.list().body.pendingLotw, 1);
  } finally { failing.cleanup(); }

  const missing = makeService({ config, spawn: fakeSpawn(child => setImmediate(() => child.emit("error", new Error("ENOENT C:\\secret\\path")))) });
  try {
    await missing.service.add(QSO);
    const result = await missing.service.uploadLotw({ confirm: true });
    assert.equal(result.status, 502);
    assert.ok(!JSON.stringify(result).includes("secret"));
  } finally { missing.cleanup(); }

  const timers = fakeTimers();
  const hung = fakeSpawn(child => { child.kill = () => { child.killed = true; setImmediate(() => child.emit("close", null, "SIGTERM")); }; });
  const slow = makeService({ config, spawn: hung, setTimer: timers.setTimer, clearTimer: timers.clearTimer });
  try {
    await slow.service.add(QSO);
    const pending = slow.service.uploadLotw({ confirm: true });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await slow.service.uploadLotw({ confirm: true })).status, 409);
    timers.fire();
    const result = await pending;
    assert.equal(result.status, 504);
    assert.equal(hung.calls[0].child.killed, true);
    assert.equal(slow.service.list().body.pendingLotw, 1);
  } finally { slow.cleanup(); }
});

test("runProcess never uses a shell and settles once", async () => {
  const spawn = fakeSpawn(child => setImmediate(() => { child.emit("close", 0, null); child.emit("error", new Error("late")); }));
  const result = await qsl.runProcess("tqsl", ["a b", "; rm -rf /"], { spawn });
  assert.deepEqual(result, { code: 0, signal: null, timedOut: false });
  assert.deepEqual(spawn.calls[0].args, ["a b", "; rm -rf /"]);
  assert.equal(spawn.calls[0].options.shell, false);
  await assert.rejects(() => qsl.runProcess("tqsl", [], { spawn: () => { throw new Error("EACCES"); } }), error => error.status === 502);
});
