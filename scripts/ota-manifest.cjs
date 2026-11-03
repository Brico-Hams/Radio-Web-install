#!/usr/bin/env node
// Builds and signs the RadiCodex OTA manifest (radicodex-update.json). Only node:* modules, no dependencies.
//
//   node scripts/ota-manifest.cjs keygen --private <path-outside-the-repo>
//   node scripts/ota-manifest.cjs build --apk <release.apk> [--out radicodex-update.json]
//        [--version-code N --version-name X --min-sdk N --url https://...] [--notes es=file.md --notes en=file.md ...]
//        (--key-file <pem> | env RADICODEX_OTA_PRIVATE_KEY holding the PEM)
//   node scripts/ota-manifest.cjs verify --manifest <file> --public-key <64 hex>
//
// The signature covers the canonical form of the manifest without the "signature" field: keys sorted by UTF-16 code unit,
// no whitespace, integers only, every char outside printable ASCII written as a lowercase \uXXXX escape. The Android app
// (OtaManifestParser.canonical) implements exactly the same rules. The private key is never written inside the repository.
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const PACKAGE = "org.bricohams.radicodex";
const MAX_APK_BYTES = 150 * 1024 * 1024;
const LANGUAGES = ["es", "en", "fr", "de"];

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Only integers are allowed in the manifest");
    return String(value);
  }
  if (typeof value === "string") {
    let out = '"';
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      const char = value[index];
      if (char === '"') out += '\\"';
      else if (char === "\\") out += "\\\\";
      else if (code < 0x20 || code > 0x7e) out += "\\u" + code.toString(16).padStart(4, "0");
      else out += char;
    }
    return out + '"';
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => canonical(key) + ":" + canonical(value[key])).join(",") + "}";
}

function parseArgs(argv) {
  const args = { notes: [] };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[++index];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    if (flag === "--notes") args.notes.push(value);
    else args[flag.slice(2)] = value;
  }
  return args;
}

function insideRepo(file) {
  const relative = path.relative(root, path.resolve(file));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function loadPrivateKey(args) {
  let pem = args["key-file"] ? fs.readFileSync(args["key-file"], "utf8") : process.env.RADICODEX_OTA_PRIVATE_KEY;
  if (!pem) throw new Error("Provide the private key with --key-file <pem> or the RADICODEX_OTA_PRIVATE_KEY environment variable");
  pem = pem.replace(/\\n/g, "\n");
  const key = crypto.createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("The key must be Ed25519");
  return key;
}

function publicHex(privateKey) {
  return crypto.createPublicKey(privateKey).export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
}

function gradleValue(pattern, label) {
  const gradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle.kts"), "utf8");
  const match = gradle.match(pattern);
  if (!match) throw new Error(`Cannot read ${label} from build.gradle.kts; pass it explicitly`);
  return match[1];
}

function keygen(args) {
  const target = args.private;
  if (!target) throw new Error("keygen needs --private <path> (outside the repository)");
  if (insideRepo(target)) throw new Error("Refusing to write the private key inside the repository");
  if (fs.existsSync(target)) throw new Error("Refusing to overwrite an existing key file");
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(target, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  console.log(`Private key written to ${target} (keep it offline and backed up).`);
  console.log(`Public key (paste into OtaConfig.PUBLIC_KEY_HEX): ${publicHex(privateKey)}`);
}

function readNotes(args, versionCode) {
  const notes = {};
  for (const entry of args.notes) {
    const split = entry.indexOf("=");
    if (split < 1) throw new Error(`--notes expects lang=file, got ${entry}`);
    notes[entry.slice(0, split)] = fs.readFileSync(entry.slice(split + 1), "utf8").trim();
  }
  if (Object.keys(notes).length === 0) {
    for (const language of LANGUAGES) {
      const file = path.join(root, "android", "app", "src", "main", "assets", `changelog-${versionCode}.${language}.md`);
      if (fs.existsSync(file)) notes[language] = fs.readFileSync(file, "utf8").trim();
    }
  }
  if (Object.keys(notes).length === 0) throw new Error("No release notes: pass --notes lang=file or add the changelog-<code>.<lang>.md assets");
  return notes;
}

function build(args) {
  if (!args.apk) throw new Error("build needs --apk <release.apk>");
  const privateKey = loadPrivateKey(args);
  const apk = fs.readFileSync(args.apk);
  if (apk.length === 0 || apk.length > MAX_APK_BYTES) throw new Error(`APK size ${apk.length} is outside 1..${MAX_APK_BYTES}`);
  const versionCode = Number(args["version-code"] ?? gradleValue(/^\s*versionCode = (\d+)$/m, "versionCode"));
  const versionName = args["version-name"] ?? gradleValue(/^\s*versionName = "([^"]+)"$/m, "versionName");
  const minSdk = Number(args["min-sdk"] ?? gradleValue(/^\s*minSdk = (\d+)$/m, "minSdk"));
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0) throw new Error("Invalid versionCode");
  if (!Number.isSafeInteger(minSdk) || minSdk < 1 || minSdk > 99) throw new Error("Invalid minSdk");
  const url = args.url ?? `https://github.com/Brico-Hams/Radio-Web-install/releases/download/android-v${versionName}/${path.basename(args.apk)}`;
  if (!url.startsWith("https://")) throw new Error("The APK url must be https");
  const manifest = {
    schema: 1,
    package: PACKAGE,
    versionCode,
    versionName,
    minSdk,
    apk: { url, sha256: crypto.createHash("sha256").update(apk).digest("hex"), size: apk.length },
    notes: readNotes(args, versionCode),
  };
  const signature = crypto.sign(null, Buffer.from(canonical(manifest), "utf8"), privateKey).toString("base64");
  const signed = { ...manifest, signature };
  const out = args.out ?? "radicodex-update.json";
  fs.writeFileSync(out, JSON.stringify(signed, null, 2) + "\n");
  console.log(`Wrote ${out}: ${versionName} (${versionCode}), ${apk.length} bytes, sha256 ${manifest.apk.sha256}`);
  console.log(`Public key of the signer: ${publicHex(privateKey)}`);
}

function verify(args) {
  if (!args.manifest || !args["public-key"]) throw new Error("verify needs --manifest and --public-key");
  const signed = JSON.parse(fs.readFileSync(args.manifest, "utf8"));
  const { signature, ...manifest } = signed;
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(args["public-key"], "hex")]);
  const publicKey = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  const ok = crypto.verify(null, Buffer.from(canonical(manifest), "utf8"), publicKey, Buffer.from(signature ?? "", "base64"));
  console.log(ok ? "Signature OK" : "Signature INVALID");
  if (!ok) process.exitCode = 1;
}

module.exports = { canonical };

if (require.main === module) {
  try {
    const [command, ...rest] = process.argv.slice(2);
    const args = parseArgs(rest);
    if (command === "keygen") keygen(args);
    else if (command === "build") build(args);
    else if (command === "verify") verify(args);
    else throw new Error("Usage: ota-manifest.cjs keygen|build|verify (see the header of this file)");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
