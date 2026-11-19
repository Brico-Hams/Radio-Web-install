"use strict";
// Self-signed TLS identity for the remote shack agent. No dependencies: the X.509 v3 certificate is built
// with a tiny DER encoder and signed with node:crypto (ECDSA P-256 / SHA-256).
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const COMMON_NAME = "RadiCodex Remote Shack";
const DAY_MS = 86_400_000;
const RENEW_BEFORE_MS = 30 * DAY_MS;
const FILE_NAME = "remote-agent-tls.pem";

function derLength(length) {
  if (length < 0x80) return Buffer.from([length]);
  const bytes = [];
  for (let value = length; value > 0; value = Math.floor(value / 256)) bytes.unshift(value & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

const tlv = (tag, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([tag]), derLength(body.length), body]);
};
const seq = (...parts) => tlv(0x30, ...parts);
const set = (...parts) => tlv(0x31, ...parts);
const octets = buffer => tlv(0x04, buffer);
const integer = buffer => tlv(0x02, buffer);
const explicit = (n, ...parts) => tlv(0xa0 | n, ...parts);

function oid(text) {
  const parts = text.split(".").map(Number);
  const bytes = [];
  for (const part of [parts[0] * 40 + parts[1], ...parts.slice(2)]) {
    const chunk = [part & 0x7f];
    for (let value = Math.floor(part / 128); value > 0; value = Math.floor(value / 128)) chunk.unshift((value & 0x7f) | 0x80);
    bytes.push(...chunk);
  }
  return tlv(0x06, Buffer.from(bytes));
}

function derTime(date) {
  const p = value => String(value).padStart(2, "0");
  const year = date.getUTCFullYear();
  const rest = `${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
  return year < 2050 ? tlv(0x17, Buffer.from(`${p(year % 100)}${rest}`)) : tlv(0x18, Buffer.from(`${year}${rest}`));
}

const OID_ECDSA_SHA256 = "1.2.840.10045.4.3.2";
const algorithm = () => seq(oid(OID_ECDSA_SHA256));
const name = () => seq(set(seq(oid("2.5.4.3"), tlv(0x0c, Buffer.from(COMMON_NAME)))));
const extension = (id, value, critical = false) =>
  seq(oid(id), ...(critical ? [tlv(0x01, Buffer.from([0xff]))] : []), octets(value));

function localIPv4() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(item => item && (item.family === "IPv4" || item.family === 4) && !item.internal).map(item => item.address);
}

function sanList(extraIps = localIPv4()) {
  return [...new Set(["127.0.0.1", ...extraIps])];
}

function buildCertificate(privateKey, publicKey, now, ips) {
  const serial = crypto.randomBytes(16);
  serial[0] = (serial[0] & 0x7f) | 0x40;
  const names = [
    tlv(0x82, Buffer.from("localhost")),
    ...ips.map(ip => tlv(0x87, Buffer.from(ip.split(".").map(Number))))
  ];
  const extensions = seq(
    extension("2.5.29.17", seq(...names)),
    extension("2.5.29.19", seq(), true),
    extension("2.5.29.15", tlv(0x03, Buffer.from([0x07, 0x80])), true),
    extension("2.5.29.37", seq(oid("1.3.6.1.5.5.7.3.1")))
  );
  const tbs = seq(
    explicit(0, integer(Buffer.from([2]))),
    integer(serial),
    algorithm(),
    name(),
    seq(derTime(new Date(now - DAY_MS)), derTime(new Date(now + 3650 * DAY_MS))),
    name(),
    publicKey.export({ type: "spki", format: "der" }),
    explicit(3, extensions)
  );
  const signature = crypto.sign("sha256", tbs, { key: privateKey, dsaEncoding: "der" });
  return seq(tbs, algorithm(), tlv(0x03, Buffer.from([0]), signature));
}

const pemBlock = (label, der) =>
  `-----BEGIN ${label}-----\n${der.toString("base64").replace(/(.{64})/g, "$1\n").replace(/\n$/, "")}\n-----END ${label}-----\n`;

function generate({ now = Date.now(), ips = localIPv4() } = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const cert = buildCertificate(privateKey, publicKey, now, sanList(ips));
  const key = privateKey.export({ type: "pkcs8", format: "pem" });
  return { key, cert: pemBlock("CERTIFICATE", cert), pem: `${key}${pemBlock("CERTIFICATE", cert)}` };
}

function fingerprint(pem) {
  return new crypto.X509Certificate(pem).fingerprint256;
}

function parse(pem) {
  const key = /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/.exec(pem)?.[0];
  const cert = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(pem)?.[0];
  return key && cert ? { key: `${key}\n`, cert: `${cert}\n` } : null;
}

function usable(pem, now, ips) {
  try {
    const parts = parse(pem);
    if (!parts) return null;
    const x509 = new crypto.X509Certificate(parts.cert);
    if (!x509.checkPrivateKey(crypto.createPrivateKey(parts.key))) return null;
    if (Date.parse(x509.validTo) - now < RENEW_BEFORE_MS || Date.parse(x509.validFrom) > now) return null;
    const san = x509.subjectAltName || "";
    if (!sanList(ips).every(ip => san.includes(`IP Address:${ip}`))) return null;
    return parts;
  } catch {
    return null;
  }
}

// Reuses the stored identity while it is valid, covers the machine's current IPv4s and has > 30 days left.
function ensure(dir, { now = Date.now(), ips = localIPv4() } = {}) {
  const file = path.join(dir, FILE_NAME);
  let parts = null;
  try { parts = usable(fs.readFileSync(file, "utf8"), now, ips); } catch { /* missing */ }
  let regenerated = false;
  if (!parts) {
    const fresh = generate({ now, ips });
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, fresh.pem, { mode: 0o600 });
    try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
    parts = { key: fresh.key, cert: fresh.cert };
    regenerated = true;
  }
  return { ...parts, file, regenerated, fingerprint: fingerprint(parts.cert) };
}

module.exports = { generate, ensure, fingerprint, localIPv4, COMMON_NAME, FILE_NAME };
