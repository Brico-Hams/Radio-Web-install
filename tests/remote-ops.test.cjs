"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ops = require("../remote-ops.cjs");
const { validateCommand } = require("../remote-agent.cjs");
const { catAllowList, loadCatalog } = require("../remote-catalog.cjs");

const clock = (start = 1_700_000_000_000) => { const c = { t: start, now: () => c.t }; return c; };
const perms = (extra = {}) => ({ main: { transmit: true, bands: ["40m"], maxPowerW: null, ...extra } });

test("invitaciones: token propio por invitado, solo se guarda su hash y se puede revocar", () => {
  const c = clock();
  const store = ops.createGuestStore({ now: c.now });
  const a = store.invite({ label: "EA4XYZ", permissions: perms() });
  const b = store.invite({ label: "EA4ABC", permissions: perms({ transmit: false }) });
  assert.notEqual(a.token, b.token);
  assert.equal(store.authenticate(a.token).label, "EA4XYZ");
  assert.equal(store.authenticate(`${a.token}x`), null);
  assert.equal(JSON.stringify(store.list()).includes(a.token), false);
  assert.equal(store.revoke(a.guest.id), true);
  assert.equal(store.authenticate(a.token), null);
  assert.equal(store.authenticate(b.token).label, "EA4ABC");
  c.t += 25 * 3_600_000;
  assert.equal(store.authenticate(b.token), null);
});

test("invitaciones: se persisten con permisos y sin el token en claro", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guests-"));
  try {
    const first = ops.createGuestStore({ dir });
    const { token } = first.invite({ label: "guest", permissions: perms() });
    assert.equal(fs.readFileSync(path.join(dir, "remote-guests.json"), "utf8").includes(token), false);
    assert.ok(ops.createGuestStore({ dir }).authenticate(token));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("invitaciones: entradas no validas se rechazan", () => {
  const store = ops.createGuestStore();
  for (const input of [
    { label: "", permissions: perms() }, { label: "ok", permissions: {} }, { label: "ok", permissions: perms({ bands: ["99m"] }) },
    { label: "ok", permissions: perms({ maxPowerW: -1 }) }, { label: "ok", permissions: perms(), ttlHours: 0 }
  ]) assert.ok(store.invite(input).error, JSON.stringify(input));
});

test("invitado solo escucha: sin PTT/TUNE/RFPOWER pero puede sintonizar y soltar PTT", () => {
  const perm = { transmit: false, bands: [], maxPowerW: null };
  assert.equal(ops.guestCommandRefusal(perm, { cmd: "freq", value: 7_100_000 }), null);
  assert.equal(ops.guestCommandRefusal(perm, { cmd: "ptt", value: false }), null);
  for (const command of [{ cmd: "ptt", value: true }, { cmd: "tune" }, { cmd: "level", name: "RFPOWER", value: 0.1 }, { cmd: "func", name: "TUNER", on: true }]) {
    assert.ok(ops.guestCommandRefusal(perm, command), JSON.stringify(command));
  }
  assert.ok(ops.guestCommandRefusal(null, { cmd: "freq", value: 1 }));
});

test("TX de invitado limitado a bandas y potencia, y rechazado si falta un dato", () => {
  const perm = { transmit: true, bands: [{ name: "40m", minHz: 7_000_000, maxHz: 7_200_000 }], maxPowerW: 50 };
  assert.equal(ops.guestTxRefusal(perm, { freq: 7_100_000, rfpower: 0.5, rigMaxW: 100 }), null);
  assert.match(ops.guestTxRefusal(perm, { freq: 14_200_000, rfpower: 0.1, rigMaxW: 100 }), /bandas/);
  assert.match(ops.guestTxRefusal(perm, { freq: 7_100_000, rfpower: 0.51, rigMaxW: 100 }), /limite/);
  assert.match(ops.guestTxRefusal(perm, { freq: 7_100_000, rfpower: 0.1 }), /potencia maxima/);
  assert.match(ops.guestTxRefusal(perm, { freq: 7_100_000, rfpower: null, rigMaxW: 100 }), /desconocida/);
  assert.match(ops.guestTxRefusal(perm, { freq: null, rfpower: 0.1, rigMaxW: 100 }), /desconocida/);
  assert.ok(ops.guestTxRefusal({ ...perm, transmit: false }, { freq: 7_100_000, rfpower: 0.1, rigMaxW: 100 }));
});

test("registro de TX: duracion, banda, ubicacion redondeada y CSV a prueba de formulas", () => {
  const c = clock(Date.UTC(2026, 0, 1, 12));
  const log = ops.createTxLog({ now: c.now });
  log.begin({ operator: "=cmd()", radio: "main", freq: 7_100_000, powerPct: 0.5, powerW: 50, location: { lat: 40.41678, lon: -3.70379 } });
  c.t += 12_400;
  const entry = log.end();
  assert.equal(entry.durationS, 12);
  assert.equal(entry.band, "40m");
  assert.deepEqual(entry.location, { lat: 40.42, lon: -3.7 });
  const lines = log.toCsv().trim().split("\r\n");
  assert.equal(lines[0], ops.CSV_COLUMNS.join(","));
  assert.equal(lines[1], "2026-01-01T12:00:00.000Z,2026-01-01T12:00:12.400Z,12,'=cmd(),main,40m,7100000,50,50,\"40.42,-3.7\"");
  assert.equal(log.end(), null);
});

test("registro de TX: sin ubicacion si el cliente no la comparte y persistencia JSONL", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "txlog-"));
  const file = path.join(dir, "tx.jsonl");
  try {
    const c = clock();
    const log = ops.createTxLog({ file, now: c.now });
    log.begin({ operator: "a", radio: "main", freq: 14_200_000 });
    c.t += 1000;
    log.end();
    const again = ops.createTxLog({ file });
    assert.equal(again.entries().length, 1);
    assert.equal(again.entries()[0].location, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("apagado remoto: solo FTX-1 (PS0) esta documentado; el encendido es pendiente de fuente", () => {
  assert.deepEqual(ops.powerSupport("yaesu-ftx-1"), { off: true, on: false, source: "docs/FTX1-KNOWLEDGE.md PS row" });
  for (const radio of loadCatalog().radios.filter(item => item.id !== "yaesu-ftx-1")) {
    assert.deepEqual(ops.powerSupport(radio.id), { off: false, on: false, source: "pendiente de fuente" }, radio.id);
  }
  const ftx1 = loadCatalog().radios.find(item => item.id === "yaesu-ftx-1");
  assert.equal(ftx1.cat.powerOff, ops.POWER_COMMANDS["yaesu-ftx-1"].off);
  assert.ok(catAllowList(ftx1.cat).includes("PS0"));
});

test("escucha en directo: apagada por defecto, con limite por IP/minuto y de clientes", () => {
  assert.equal(ops.createListenGate().admit("ip:1").ok, false);
  const c = clock();
  const gate = ops.createListenGate({ enabled: true, maxClients: 3, perIpPerMinute: 3, now: c.now });
  const first = gate.admit("ip:1");
  const second = gate.admit("ip:1");
  assert.equal(gate.admit("ip:1").reason, "busy");
  first.release(); first.release();
  assert.equal(gate.clients(), 1);
  assert.equal(gate.admit("ip:1").ok, true);
  assert.equal(gate.admit("ip:1").reason, "rate");
  c.t += 61_000;
  second.release();
  assert.equal(gate.admit("ip:1").ok, true);
});

test("varias radios: concesion y TX exclusivos por radio, independientes entre si", () => {
  const c = clock();
  const hub = ops.createRadioRegistry({ now: c.now, leaseMs: 30_000 });
  hub.add("a"); hub.add("b");
  assert.throws(() => hub.add("a"));
  assert.equal(hub.claim("a", "u1"), true);
  assert.equal(hub.claim("a", "u2"), false);
  assert.equal(hub.claim("b", "u2"), true);
  assert.equal(hub.beginTx("a", "u2"), false);
  assert.equal(hub.beginTx("a", "u1"), true);
  assert.equal(hub.beginTx("a", "u1"), false);
  assert.equal(hub.beginTx("b", "u2"), true);
  hub.release("a", "u1");
  assert.equal(hub.list().find(r => r.id === "a").transmitting, false);
  assert.equal(hub.list().find(r => r.id === "b").transmitting, true);
  c.t += 31_000;
  assert.equal(hub.claim("b", "u3"), true);
});

test("comando ptt acepta ubicacion opcional validada", () => {
  assert.deepEqual(validateCommand({ cmd: "ptt", value: true, location: { lat: 40, lon: -3 } }, {}), { cmd: "ptt", value: true, location: { lat: 40, lon: -3 } });
  assert.ok(validateCommand({ cmd: "ptt", value: true, location: { lat: 99, lon: 0 } }, {}).error);
  assert.deepEqual(validateCommand({ cmd: "ptt", value: false }, {}), { cmd: "ptt", value: false });
});

function signedRelease(tag, bytes, { tamper = false } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const sums = `${crypto.createHash("sha256").update(bytes).digest("hex")}  agent.tgz\n`;
  const b64 = data => Buffer.from(crypto.sign(null, Buffer.from(data), privateKey)).toString("base64");
  const files = {
    "agent.tgz": tamper ? Buffer.from("other") : bytes, "agent.tgz.sig": Buffer.from(b64(bytes)),
    SHA256SUMS: Buffer.from(sums), "SHA256SUMS.sig": Buffer.from(b64(sums))
  };
  const base = "https://github.com/Brico-Hams/Radio-Web-install/releases/download";
  return {
    publicKeyHex: publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex"),
    fetchJson: async () => ({ tag_name: tag, draft: false, prerelease: false, assets: Object.keys(files).map(name => ({ name, browser_download_url: `${base}/${tag}/${name}` })) }),
    fetchBytes: async url => files[url.split("/").pop()]
  };
}

test("actualizacion: descarga solo versiones nuevas con firma y SHA-256 validos, sin instalar", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
  try {
    const release = signedRelease("v1.2.0", Buffer.from("payload"));
    const common = { assetName: "agent.tgz", saveDir: dir, ...release };
    assert.equal((await ops.checkForUpdate({ ...common, currentVersion: "1.2.0" })).status, "current");
    const done = await ops.checkForUpdate({ ...common, currentVersion: "1.1.9" });
    assert.equal(done.status, "downloaded");
    assert.equal(fs.readFileSync(done.file, "utf8"), "payload");
    assert.equal(done.sha256, crypto.createHash("sha256").update("payload").digest("hex"));
    assert.equal((await ops.checkForUpdate({ ...common, currentVersion: "1.1.9", assetName: undefined })).status, "unconfigured");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("actualizacion: contenido manipulado o host ajeno se rechaza", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
  try {
    const bad = signedRelease("v2.0.0", Buffer.from("payload"), { tamper: true });
    await assert.rejects(ops.checkForUpdate({ assetName: "agent.tgz", saveDir: dir, currentVersion: "1.0.0", ...bad }), /rechazado/);
    assert.deepEqual(fs.readdirSync(dir), []);
    const good = signedRelease("v2.0.0", Buffer.from("payload"));
    const foreign = { ...good, fetchJson: async () => { const r = await good.fetchJson(); r.assets[0].browser_download_url = "https://evil.example/agent.tgz"; return r; } };
    assert.equal((await ops.checkForUpdate({ assetName: "agent.tgz", saveDir: dir, currentVersion: "1.0.0", ...foreign })).status, "unsigned");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
