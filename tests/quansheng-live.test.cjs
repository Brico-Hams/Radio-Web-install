const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");
const vm = require("node:vm");
const R = require("../radio-core.js");
require("../transports.js");
require("../quansheng-connector.js");
require("../quansheng-live.js");
require("../precompiled-catalog.js");
const { createServer, ALLOWED_FILES } = require("../server.cjs");
const frame = (type, payload, marker = []) => Uint8Array.from([
  ...marker, 170, 85, type, payload.length >> 8, payload.length & 255, ...payload, 10
]);
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "precompiled", "catalog.json")));
test("precompiled Labs apps validate provenance, digests, metadata and FAP1 without TX/socorro catalog entries", async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "precompiled", "apps", "catalog.json")));
  const entries = R.validateAppCatalog(manifest);
  assert.equal(entries.length, 6);
  assert.deepEqual(entries.map(entry => entry.id), ["SystemInfo", "BroadcastFM", "Cube3D", "Tetris", "Breakout", "Minesweeper"]);
  for (const entry of entries) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, "..", ...entry.path.split("/"))));
    assert.deepEqual(await R.verifyPrecompiledApp(entry, bytes), bytes);
    bytes[64] ^= 1;
    await assert.rejects(R.verifyPrecompiledApp(entry, bytes), /SHA-256/);
    assert.ok(ALLOWED_FILES.includes(entry.path));
  }
  const mutated = structuredClone(manifest);
  mutated.entries[0].path = "firmware/private.app";
  assert.throws(() => R.validateAppCatalog(mutated), /Entrada/);
  const duplicate = structuredClone(manifest);
  duplicate.entries[1] = duplicate.entries[0];
  assert.throws(() => R.validateAppCatalog(duplicate), /Entrada/);
  const origin = structuredClone(manifest);
  origin.entries[0].source = "https://example.com/app";
  assert.throws(() => R.validateAppCatalog(origin), /Entrada/);
  const entry = entries[0];
  const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, "..", ...entry.path.split("/"))));
  await assert.rejects(R.verifyPrecompiledApp({ ...entry, version: "9.9" }, bytes), /manifiesto/);
});
test("server publishes only allowlisted precompiled apps", async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/precompiled/apps/SystemInfo.app`);
    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, 5344);
    assert.equal((await fetch(`${base}/precompiled/apps/EPIRB406.app`)).status, 404);
    assert.equal((await fetch(`${base}/firmware/Fusion61/archive/apps/v6.1.0/SystemInfo.app`)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test("remote keyboard requires active session, full authority, valid non-PTT key and explicit press type", async () => {
  const permit = {};
  const api = { ...R, assertBackup: (connector, token) => assert.equal(token, permit, "full backup required"),
    verifyBackup: async (connector, token) => assert.equal(token, permit, "persistent backup required") };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "quansheng-live.js"), "utf8"),
    { RadioWorkspace: api, Uint8Array, Promise, setTimeout });
  const frames = [];
  const connector = { connected: true, transport: { write: async frame => frames.push([...frame]) } };
  const session = new api.QuanshengLiveSession(connector, () => {});
  await assert.rejects(session.sendKey(10, false, permit), /inicia el visor/);
  session.done = Promise.resolve();
  await assert.rejects(session.sendKey(10, false, {}), /full backup/);
  for (const code of [-1, 16, 19, 1.5, "10"]) await assert.rejects(session.sendKey(code, false, permit), /PTT/);
  await assert.rejects(session.sendKey(10, 1, permit), /PTT/);
  assert.equal(frames.length, 0);
  await session.sendKey(10, false, permit);
  await session.sendKey(15, true, permit);
  await session.sendKey(18, false, permit);
  assert.deepEqual(frames, [[170, 85, 3, 10], [170, 85, 4, 15], [170, 85, 3, 18]]);
  await session.stop();
  await assert.rejects(session.sendKey(10, false, permit), /Teclado no disponible/);
});
test("remote keyboard prevents overlapping commands and propagates write failure", async () => {
  const api = { ...R, assertBackup: () => {}, verifyBackup: async () => {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "quansheng-live.js"), "utf8"),
    { RadioWorkspace: api, Uint8Array, Promise, setTimeout });
  let reject;
  const connector = { connected: true, transport: { write: () => new Promise((resolve, fail) => { reject = fail; }) } };
  const session = new api.QuanshengLiveSession(connector, () => {});
  session.done = Promise.resolve();
  const first = session.sendKey(0, false, {});
  await assert.rejects(session.sendKey(1, false, {}), /tecla anterior/);
  await Promise.resolve();
  const stopped = session.stop();
  reject(new Error("serial write failed"));
  await assert.rejects(first, /serial write failed/);
  await assert.rejects(stopped, /detener visor/);
});
test("LCD parser accepts split frames, markers, full screen and sparse updates", () => {
  const decoder = new R.QuanshengLiveDecoder();
  const full = frame(1, new Uint8Array(1024).fill(3), [244]);
  assert.deepEqual(decoder.feed(full.slice(0, 4)), []);
  const events = decoder.feed(full.slice(4));
  assert.equal(events[0].type, "screen");
  assert.equal(events[0].flags, 4);
  assert.equal(events[0].screen[1023], 3);
  const update = frame(2, Uint8Array.of(127, 1, 2, 3, 4, 5, 6, 7, 8), [255]);
  const result = decoder.feed(update)[0];
  assert.deepEqual([...result.screen.slice(1016)], [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(result.screen[1015], 3);
  assert.equal(events[0].screen[1023], 3, "snapshots must not share mutable storage");
  assert.throws(() => decoder.feed(frame(2, Uint8Array.of(1))), /incompleto/);
  assert.throws(() => new R.QuanshengLiveDecoder().feed(frame(2, Uint8Array.of(128, 1, 2, 3, 4, 5, 6, 7, 8))), /Indice/);
  assert.throws(() => new R.QuanshengLiveDecoder().feed(Uint8Array.of(170, 85, 1, 255, 255, 10)), /limites/);
});
function rfPayload(sequence = 1) {
  const data = new Uint8Array(1629);
  data[0] = 2; data[1] = 2; data[2] = 1;
  const view = R.view(data);
  view.setUint32(29, 14560000, true);
  view.setUint32(33, sequence, true);
  view.setUint16(37, 15, true);
  view.setUint16(39, 0, true);
  data[42] = 6;
  data[43] = 140;
  data.set(new TextEncoder().encode("=TEST"), 44);
  return data;
}
test("RF Log v2 parses history, deduplicates sequence and exports safe CSV without fabricated UTC", () => {
  const decoder = new R.QuanshengLiveDecoder();
  let event = decoder.feed(frame(5, rfPayload()))[0];
  assert.equal(event.rows.length, 1);
  assert.equal(event.rows[0].frequency10Hz, 14560000);
  assert.equal(event.rows[0].durationSeconds, 15);
  assert.equal(event.rows[0].name, "=TEST");
  assert.equal(event.rows[0].battery, 140);
  event = decoder.feed(frame(5, rfPayload()))[0];
  assert.equal(event.rows.length, 1);
  const csv = R.rfLogCSV(event.rows);
  assert.match(csv, /145\.60000/);
  assert.match(csv, /'=TEST/);
  assert.match(csv, /7\.40/);
  assert.doesNotMatch(csv, /UTC|timestamp/);
  const history = new Uint8Array(1600);
  history.set(rfPayload(2).subarray(29, 54));
  event = decoder.feed(frame(6, history))[0];
  assert.equal(event.rows.length, 2);
  assert.equal(event.rows[0].sequence, 2);
  const invalid = rfPayload();
  invalid[0] = 1;
  assert.throws(() => decoder.feed(frame(5, invalid)), /version/);
  assert.throws(() => decoder.feed(frame(6, Uint8Array.of(1))), /tamano/);
  decoder.feed(frame(5, Uint8Array.of(2, 4, 0, 0)));
  assert.equal(decoder.rows.size, 0);
});
test("RF window never exceeds 512 rows", () => {
  const decoder = new R.QuanshengLiveDecoder();
  for (let i = 0; i < 520; i++) decoder.feed(frame(5, rfPayload(i)));
  assert.equal(decoder.rows.size, 512);
  assert.equal(Math.min(...decoder.rows.keys()), 8);
});
test("live session owns connector until stopped, drains and does not fail on idle", async () => {
  const transport = new R.BufferedTransport();
  const writes = [];
  transport.opened = true;
  transport.write = async bytes => {
    writes.push([...bytes]);
    if (writes.length === 1) transport.push(frame(1, new Uint8Array(1024)));
  };
  const connector = new R.Connector(transport);
  connector.connected = true;
  const received = [];
  const session = new R.QuanshengLiveSession(connector, event => received.push(event));
  const done = session.start();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(connector.busy, true);
  await assert.rejects(connector.run("other", async () => {}), /otra operacion/);
  await session.stop();
  await done;
  assert.equal(connector.busy, false);
  assert.equal(transport.error, null);
  assert.equal(received[0].type, "screen");
  assert.deepEqual(writes[0], [85, 170, 0, 0]);
  assert.deepEqual(writes[1], [85, 170, 5, 131]);
  const count = writes.length;
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(writes.length, count);
});
test("precompiled index ships nine verified images, with source and honest hardware status", async () => {
  const entries = R.validatePrecompiledCatalog(catalog);
  assert.equal(entries.length, 9);
  for (const entry of entries) {
    assert.ok(ALLOWED_FILES.includes(entry.path));
    const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, "..", entry.path)));
    await R.verifyPrecompiledImage(entry, bytes);
    assert.equal(entry.hardwareBootTested, false);
    const corrupt = bytes.slice();
    corrupt[128] ^= 1;
    await assert.rejects(R.verifyPrecompiledImage(entry, corrupt), /corrupta/);
  }
  assert.throws(() => R.validatePrecompiledCatalog({ ...catalog, entries: [...entries, entries[0]] }), /no valido/);
  assert.throws(() => R.validatePrecompiledCatalog({ ...catalog, entries: [{ ...entries[0], path: "../secret.bin" }] }), /no valida/);
});
test("native tools menu stays inside this web without delegating operations to UV Studio", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "radio-ui.js"), "utf8");
  assert.doesNotMatch(ui, /data-studio-tool|https:\/\/armel\.github\.io\/uvstudio\/#/);
  for (const target of ["qs-factory-native", "qs-live-panel", "qs-main-firmware-file", "qs-calibration-file",
    "qs-logo-file", "qs-flash-file", "precompiled-apps-panel", "app-slot", "slot-number", "qs-rf-panel"]) {
    assert.ok(ui.includes(`["${target}",`), target);
  }
  assert.match(ui, /href="#\$\{id\}"/);
});
test("RF filters combine name/frequency and event without modifying the collected history", () => {
  const rows = [
    { sequence: 1, name: "Murcia", frequency10Hz: 14560000, flags: 0 },
    { sequence: 2, name: "TEST", frequency10Hz: 43350000, flags: 1 },
    { sequence: 3, name: "", frequency10Hz: 0, flags: 9 }
  ];
  const original = structuredClone(rows);
  assert.deepEqual(R.filterRFLog(rows, "MURCIA", "rx"), [rows[0]]);
  assert.deepEqual(R.filterRFLog(rows, "433.50", "tx"), [rows[1]]);
  assert.deepEqual(R.filterRFLog(rows, "", "session"), [rows[2]]);
  assert.deepEqual(R.filterRFLog(rows, "test", "rx"), []);
  assert.deepEqual(rows, original);
  assert.throws(() => R.filterRFLog(rows, "", "unknown"), /Filtro/);
  assert.throws(() => R.filterRFLog(rows, "a".repeat(81)), /Filtro/);
});
test("server serves bundled binaries and manifest with correct MIME, never arbitrary firmware files", async () => {
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/precompiled/catalog.json`);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal((await response.json()).entries.length, 9);
    const binary = await fetch(`${base}/${catalog.entries[0].path}`);
    assert.equal(binary.headers.get("content-type"), "application/octet-stream");
    assert.equal(await R.sha256(await binary.arrayBuffer()), catalog.entries[0].sha256);
    assert.equal((await fetch(`${base}/firmware-builds/bricohams-labs-v6.1.0/artifacts/build-info.json`)).status, 404);
    assert.equal((await fetch(`${base}/precompiled/arbitrary.bin`)).status, 404);
  } finally { server.close(); }
});
test("serial USB boundary padding is limited to Quansheng and exact 64-byte frames", async () => {
  const transport = new R.SerialTransport();
  const writes = [];
  transport.opened = true;
  transport.writer = { write: async bytes => writes.push([...bytes]) };
  await transport.write(new Uint8Array(64));
  assert.equal(writes.length, 1);
  new R.QuanshengConnector(transport);
  await transport.write(new Uint8Array(64));
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[2], [0]);
  await transport.write(new Uint8Array(63));
  assert.equal(writes.length, 4);
});
test("Quansheng Web Serial explicitly enables USB DTR and releases stream locks", async () => {
  let releaseRead;
  const signals = [];
  let closed = false;
  const port = {
    open: async () => {},
    setSignals: async value => signals.push(value),
    close: async () => { closed = true; },
    readable: { getReader: () => ({
      read: () => new Promise(resolve => { releaseRead = resolve; }),
      cancel: async () => releaseRead({ done: true }),
      releaseLock() {}
    }) },
    writable: { getWriter: () => ({ write: async () => {}, releaseLock() {} }) }
  };
  const transport = new R.SerialTransport({
    getPorts: async () => [port], addEventListener() {}, removeEventListener() {}
  });
  new R.QuanshengConnector(transport);
  await transport.open(38400);
  assert.deepEqual(signals, [{ dataTerminalReady: true }]);
  await transport.close();
  assert.equal(closed, true);
});
test("bounded retry resends only identical NOR writes, not erase/reset or rejection", async () => {
  const connector = new R.QuanshengConnector(new R.BufferedTransport());
  const data = Uint8Array.of(1, 2, 3);
  let attempts = 0;
  connector.exchange = async (type, payload) => {
    assert.equal(payload, data);
    if (++attempts < 3) throw Object.assign(new Error("timeout"), { code: "READ_TIMEOUT" });
    return Uint8Array.of(1, 0);
  };
  await connector.slotMutation(0x0724, 1, data);
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(connector.slotMutation(0x0722, 1, data), /timeout/);
  assert.equal(attempts, 1);
  attempts = 0;
  connector.exchange = async () => {
    attempts++;
    throw Object.assign(new Error("timeout"), { code: "READ_TIMEOUT" });
  };
  await assert.rejects(connector.slotMutation(0x0734, 1, data), /timeout/);
  assert.equal(attempts, 5);
  attempts = 0;
  connector.exchange = async () => { attempts++; return Uint8Array.of(1, 3); };
  await assert.rejects(connector.slotMutation(0x0724, 1, data), /rechazada/);
  assert.equal(attempts, 1);
});
test("recoverable read deadlines do not revoke transport; normal deadlines remain fatal", async () => {
  const transport = new R.BufferedTransport();
  transport.opened = true;
  await assert.rejects(transport.readExact(1, 10, false), { code: "READ_TIMEOUT" });
  assert.equal(transport.error, null);
  transport.push(Uint8Array.of(42));
  assert.deepEqual(await transport.readExact(1), Uint8Array.of(42));
  await assert.rejects(transport.readExact(1, 10), { code: "READ_TIMEOUT" });
  assert.equal(transport.error.code, "READ_TIMEOUT");
});
