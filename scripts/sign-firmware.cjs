#!/usr/bin/env node
// Signs and verifies BricoHams firmware images (.bin). Only node:* modules, no dependencies.
//
//   node scripts/sign-firmware.cjs keygen --private <path-outside-the-repo>
//   node scripts/sign-firmware.cjs sign --dir precompiled [--dir other-release-folder ...]
//        (--key-file <pem> | env BRICOHAMS_FW_SIGNING_KEY holding the PEM)
//   node scripts/sign-firmware.cjs verify --dir precompiled [--dir ...] --public-key <64 hex>
//
// For every *.bin in a folder it writes <file>.sig (base64 Ed25519 over the raw file bytes), SHA256SUMS
// ("<hex>  <name>", sorted by name, LF) and SHA256SUMS.sig (base64 Ed25519 over the SHA256SUMS bytes).
// The web installer (firmware-signature.js) embeds the public key and checks the same files before flashing.
// This key is separate from the OTA key (scripts/ota-manifest.cjs). The private key is never written inside the repo.
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const KEY_ENV = "BRICOHAMS_FW_SIGNING_KEY";

function insideRepo(file) {
  const relative = path.relative(root, path.resolve(file));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseArgs(argv) {
  const args = { dir: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[++index];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    if (flag === "--dir") args.dir.push(value);
    else args[flag.slice(2)] = value;
  }
  return args;
}

function publicHex(privateKey) {
  return crypto.createPublicKey(privateKey).export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
}

function publicKeyFromHex(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex || "")) throw new Error("The public key must be 64 hex digits");
  return crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(hex, "hex")]), format: "der", type: "spki" });
}

function loadPrivateKey(args, env = process.env) {
  let pem = args["key-file"] ? fs.readFileSync(args["key-file"], "utf8") : env[KEY_ENV];
  if (!pem) throw new Error(`Provide the private key with --key-file <pem> or the ${KEY_ENV} environment variable`);
  const key = crypto.createPrivateKey(pem.replace(/\\n/g, "\n"));
  if (key.asymmetricKeyType !== "ed25519") throw new Error("The key must be Ed25519");
  return key;
}

function keygen(target) {
  if (!target) throw new Error("keygen needs --private <path> (outside the repository)");
  if (insideRepo(target)) throw new Error("Refusing to write the private key inside the repository");
  if (fs.existsSync(target)) throw new Error("Refusing to overwrite an existing key file");
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(target, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600, flag: "wx" });
  return publicHex(privateKey);
}

function firmwareFiles(dir) {
  const names = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".bin") && fs.statSync(path.join(dir, name)).isFile()).sort();
  if (names.length === 0) throw new Error(`No .bin firmware in ${dir}`);
  return names;
}

function signDirectory(dir, privateKey) {
  const names = firmwareFiles(dir);
  const lines = [];
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(dir, name));
    lines.push(`${crypto.createHash("sha256").update(bytes).digest("hex")}  ${name}`);
    fs.writeFileSync(path.join(dir, `${name}.sig`), crypto.sign(null, bytes, privateKey).toString("base64") + "\n");
  }
  const sums = Buffer.from(lines.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(dir, "SHA256SUMS"), sums);
  fs.writeFileSync(path.join(dir, "SHA256SUMS.sig"), crypto.sign(null, sums, privateKey).toString("base64") + "\n");
  return names;
}

function parseSums(text) {
  const sums = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const match = /^([0-9a-f]{64}) {2}([^/\\\s][^/\\]*)$/.exec(line);
    if (!match) throw new Error(`Malformed SHA256SUMS line: ${line}`);
    sums.set(match[2], match[1]);
  }
  return sums;
}

// Returns a list of problems; empty means every firmware in the folder verifies.
function verifyDirectory(dir, publicKey) {
  const problems = [];
  const check = (data, signatureFile, label) => {
    try {
      const signature = Buffer.from(fs.readFileSync(path.join(dir, signatureFile), "utf8").trim(), "base64");
      if (!crypto.verify(null, data, publicKey, signature)) problems.push(`${label}: invalid signature`);
    } catch (error) {
      problems.push(`${label}: ${error.code === "ENOENT" ? "signature missing" : error.message}`);
    }
  };
  let sums;
  try {
    const sumsBytes = fs.readFileSync(path.join(dir, "SHA256SUMS"));
    check(sumsBytes, "SHA256SUMS.sig", "SHA256SUMS");
    sums = parseSums(sumsBytes.toString("utf8"));
  } catch (error) {
    return [`SHA256SUMS: ${error.message}`];
  }
  const names = firmwareFiles(dir);
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(dir, name));
    if (sums.get(name) !== crypto.createHash("sha256").update(bytes).digest("hex")) problems.push(`${name}: SHA-256 does not match SHA256SUMS`);
    check(bytes, `${name}.sig`, name);
  }
  for (const name of sums.keys()) if (!names.includes(name)) problems.push(`${name}: listed in SHA256SUMS but missing`);
  return problems;
}

function main(argv) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "keygen") {
    const hex = keygen(args.private);
    console.log(`Private key written to ${args.private} (keep it offline and backed up; never commit it).`);
    console.log(`Public key (paste into FirmwareSignature.PUBLIC_KEY_HEX in firmware-signature.js): ${hex}`);
  } else if (command === "sign") {
    if (args.dir.length === 0) throw new Error("sign needs at least one --dir <folder>");
    const key = loadPrivateKey(args);
    for (const dir of args.dir) console.log(`${dir}: signed ${signDirectory(dir, key).length} firmware(s), SHA256SUMS and SHA256SUMS.sig written`);
    console.log(`Signer public key: ${publicHex(key)}`);
  } else if (command === "verify") {
    if (args.dir.length === 0 || !args["public-key"]) throw new Error("verify needs --dir <folder> and --public-key <hex>");
    const publicKey = publicKeyFromHex(args["public-key"]);
    for (const dir of args.dir) {
      const problems = verifyDirectory(dir, publicKey);
      if (problems.length) { problems.forEach((problem) => console.error(`${dir}: ${problem}`)); process.exitCode = 1; }
      else console.log(`${dir}: signatures OK`);
    }
  } else {
    throw new Error("Usage: sign-firmware.cjs keygen|sign|verify (see the header of this file)");
  }
}

module.exports = { keygen, signDirectory, verifyDirectory, parseSums, publicHex, publicKeyFromHex, loadPrivateKey, insideRepo };

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
