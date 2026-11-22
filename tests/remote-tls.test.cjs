"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const tls = require("../remote-tls.cjs");

test("generated certificate is a valid self-signed X.509 for the shack", async () => {
  const { pem, key, cert } = tls.generate({ ips: ["192.168.1.50"] });
  const x509 = new crypto.X509Certificate(pem);
  assert.match(x509.subject, /CN=RadiCodex Remote Shack/);
  assert.match(x509.subjectAltName, /DNS:localhost/);
  assert.match(x509.subjectAltName, /IP Address:127\.0\.0\.1/);
  assert.match(x509.subjectAltName, /IP Address:192\.168\.1\.50/);
  assert.equal(x509.ca, false);
  assert.equal(x509.checkPrivateKey(crypto.createPrivateKey(key)), true);
  assert.equal(x509.verify(x509.publicKey), true);
  assert.equal(tls.fingerprint(pem), x509.fingerprint256);
  assert.match(tls.fingerprint(pem), /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  assert.ok(Date.parse(x509.validTo) - Date.now() > 3000 * 86_400_000);

  const server = https.createServer({ key, cert }, (request, response) => response.end("ok"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const body = await new Promise((resolve, reject) => {
      https.get({ host: "127.0.0.1", port: server.address().port, ca: pem, servername: "localhost" }, response => {
        let text = "";
        response.on("data", chunk => { text += chunk; });
        response.on("end", () => resolve(text));
      }).on("error", reject);
    });
    assert.equal(body, "ok");
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test("ensure reuses a valid stored identity and regenerates stale ones", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "radicodex-tls-"));
  try {
    const first = tls.ensure(dir, { ips: ["10.0.0.2"] });
    assert.equal(first.regenerated, true);
    if (process.platform !== "win32") assert.equal(fs.statSync(first.file).mode & 0o777, 0o600);
    const second = tls.ensure(dir, { ips: ["10.0.0.2"] });
    assert.equal(second.regenerated, false);
    assert.equal(second.fingerprint, first.fingerprint);
    // A new LAN address, an expiring certificate or garbage all force a new identity.
    assert.equal(tls.ensure(dir, { ips: ["10.0.0.3"] }).regenerated, true);
    assert.equal(tls.ensure(dir, { ips: ["10.0.0.3"], now: Date.now() + 3640 * 86_400_000 }).regenerated, true);
    fs.writeFileSync(first.file, "garbage");
    assert.equal(tls.ensure(dir, { ips: ["10.0.0.3"] }).regenerated, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
