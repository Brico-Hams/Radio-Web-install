"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const { once } = require("node:events");
const { execFileSync } = require("node:child_process");
const { createDiagnostics } = require("../diagnostics-node.cjs");

const report = () => ({
  schema_version: 1, component: "workspace-web", platform: "web", version: "0.8.0",
  events: [{ code: "operation_failed", source: "usb", severity: "error", error_type: "io", line: 9 }]
});

test("closed diagnostic schema rejects private fields, malformed values and oversized event lists", async () => {
  const { isDiagnosticReport } = await import("../diagnostics-core.mjs");
  assert.ok(isDiagnosticReport(report()));
  for (const change of [
    value => { value.token = "secret"; },
    value => { value.events[0].message = "callsign EA5XYZ"; },
    value => { value.events[0].source = "COM9"; },
    value => { value.events[0].line = true; },
    value => { value.events = Array(17).fill(value.events[0]); },
    value => { value.schema_version = true; }
  ]) {
    const value = report(); change(value);
    assert.equal(isDiagnosticReport(value), false);
  }
});

test("cache is bounded, expires individually and clear does not recreate a pending cache or erase other keys", async () => {
  const { DiagnosticBuffer } = await import("../diagnostics-core.mjs");
  const values = new Map([["radio.backup", "private"]]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const buffer = new DiagnosticBuffer({ component: "workspace-web", platform: "web", version: "0.8.0", storage });
  for (let index = 0; index < 150; index++) buffer.record("operation_failed", "usb", "error", "io");
  await Promise.resolve();
  assert.equal(JSON.parse(values.get(buffer.key)).entries.length, 128);
  assert.equal(buffer.report().events.length, 16);
  buffer.record("runtime_log", "ui", "warning");
  buffer.clear();
  await Promise.resolve();
  assert.equal(values.has(buffer.key), false);
  assert.equal(values.get("radio.backup"), "private");
  assert.equal(buffer.report(), null);
  const old = { created: Date.now() - 8 * 86400000, event: report().events[0] };
  values.set(buffer.key, JSON.stringify({ version: "0.8.0", entries: [old] }));
  const fresh = new DiagnosticBuffer({ component: "workspace-web", platform: "web", version: "0.8.0", storage });
  assert.equal(fresh.report().events.length, 1);
});

test("node logger has no network by default and persists no exception messages or paths", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bricohams-diagnostic-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const runtime = await createDiagnostics({ directory });
  runtime.record("operation_failed", "usb", "error", new Error("TOKEN C:\\Users\\private EA5XYZ"));
  await assert.rejects(runtime.send(report()), /disabled/);
  await runtime.close();
  const text = await fs.readFile(path.join(directory, "workspace-host.jsonl"), "utf8");
  for (const secret of ["TOKEN", "private", "EA5XYZ", "C:\\"]) assert.equal(text.includes(secret), false);
  assert.equal(runtime.status().remote_enabled, false);
});

test("local relay preserves origin and payload guards without exposing RF APIs", async t => {
  const { createServer } = require("../server.cjs");
  const { isDiagnosticReport } = await import("../diagnostics-core.mjs");
  const received = [];
  const runtime = {
    status: () => ({ remote_enabled: true }),
    async accept(value) {
      if (!isDiagnosticReport(value)) throw new TypeError("Invalid diagnostic");
      received.push(value);
    }
  };
  const server = createServer(undefined, undefined, undefined, runtime);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (value, origin = base) => fetch(base + "/api/diagnostic-report", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(value)
  });
  assert.equal((await send(report(), "https://foreign.example")).status, 403);
  assert.equal((await send({ ...report(), token: "secret" })).status, 400);
  const good = await send(report());
  assert.equal(good.status, 202);
  assert.deepEqual(await good.json(), { accepted: true });
  assert.equal(received.length, 1);
  assert.equal((await fetch(base + "/api/v1/ptt", { method: "POST" })).status, 405);
  for (const file of ["diagnostics-core.mjs", "diagnostic-contract.mjs", "diagnostics-ui.mjs"]) {
    const response = await fetch(base + "/" + file);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /javascript/);
    assert.match(response.headers.get("content-security-policy"), /connect-src 'self'/);
  }
});

test("HTTPS relay verifies certificates and requires exact bounded acknowledgements", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bricohams-diagnostic-tls-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const openssl = process.platform === "win32" ? "C:\\Program Files\\Git\\usr\\bin\\openssl.exe" : "openssl";
  const cert = path.join(directory, "cert.pem"), key = path.join(directory, "key.pem");
  execFileSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", key, "-out", cert],
  { stdio: "pipe" });
  let acknowledgement = '{"accepted":true}', status = 202, bodies = [];
  const server = https.createServer({ cert: await fs.readFile(cert), key: await fs.readFile(key) }, async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    bodies.push(JSON.parse(text));
    assert.equal(req.url, "/api/v1/diagnostic-reports");
    assert.equal(req.headers.authorization, "Bearer " + "d".repeat(32));
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(acknowledgement);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const url = `https://127.0.0.1:${server.address().port}`;
  const runtime = await createDiagnostics({ directory: path.join(directory, "trusted"), optIn: true, url, token: "d".repeat(32), ca: cert });
  t.after(() => runtime.close());
  await runtime.accept(report());
  assert.deepEqual(bodies[0], report());
  for (const bad of ['{"accepted":true,"tracking_id":"bad"}', "{", " ".repeat(257)]) {
    acknowledgement = bad;
    await assert.rejects(runtime.accept(report()));
  }
  acknowledgement = '{"accepted":true}'; status = 200;
  await assert.rejects(runtime.accept(report()));
  const untrusted = await createDiagnostics({ directory: path.join(directory, "untrusted"), optIn: true, url, token: "d".repeat(32) });
  t.after(() => untrusted.close());
  const count = bodies.length;
  await assert.rejects(untrusted.accept(report()));
  assert.equal(bodies.length, count);
});
