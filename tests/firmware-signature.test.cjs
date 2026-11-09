"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sign = require("../scripts/sign-firmware.cjs");
const { canonical } = require("../scripts/ota-manifest.cjs");
const FirmwareSignature = require("../firmware-signature.js");
const ota = require("../ota.js");
const root = path.join(__dirname, "..");

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-fw-sign-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const keyFile = path.join(dir, "fw-signing.pem");
  const publicKeyHex = sign.keygen(keyFile);
  const release = path.join(dir, "release");
  fs.mkdirSync(release);
  fs.writeFileSync(path.join(release, "alpha.bin"), crypto.randomBytes(4096));
  fs.writeFileSync(path.join(release, "beta.bin"), crypto.randomBytes(2048));
  const privateKey = sign.loadPrivateKey({ "key-file": keyFile });
  return { dir, release, publicKeyHex, privateKey, keyFile };
}

test("keygen refuses to write inside the repository or over an existing file", (t) => {
  assert.throws(() => sign.keygen(path.join(root, "fw-key.pem")), /inside the repository/);
  const { keyFile } = workspace(t);
  assert.throws(() => sign.keygen(keyFile), /overwrite/);
  assert.ok(!fs.existsSync(path.join(root, "fw-key.pem")));
});

test("sign writes SHA256SUMS and detached signatures that verify; tampering is reported", (t) => {
  const { release, publicKeyHex, privateKey } = workspace(t);
  assert.deepEqual(sign.signDirectory(release, privateKey), ["alpha.bin", "beta.bin"]);
  for (const name of ["alpha.bin.sig", "beta.bin.sig", "SHA256SUMS", "SHA256SUMS.sig"]) assert.ok(fs.existsSync(path.join(release, name)), name);
  const publicKey = sign.publicKeyFromHex(publicKeyHex);
  assert.deepEqual(sign.verifyDirectory(release, publicKey), []);

  const original = fs.readFileSync(path.join(release, "alpha.bin"));
  fs.writeFileSync(path.join(release, "alpha.bin"), Buffer.concat([original, Buffer.from([1])]));
  assert.ok(sign.verifyDirectory(release, publicKey).some((problem) => /alpha\.bin: SHA-256/.test(problem)));
  fs.writeFileSync(path.join(release, "alpha.bin"), original);
  assert.deepEqual(sign.verifyDirectory(release, publicKey), []);

  fs.writeFileSync(path.join(release, "SHA256SUMS"), fs.readFileSync(path.join(release, "SHA256SUMS"), "utf8").replace(/^./, (c) => (c === "0" ? "1" : "0")));
  assert.ok(sign.verifyDirectory(release, publicKey).some((problem) => /SHA256SUMS: invalid signature/.test(problem)));
});

test("a signature from another key is rejected", (t) => {
  const { release, privateKey } = workspace(t);
  sign.signDirectory(release, privateKey);
  const other = crypto.generateKeyPairSync("ed25519").privateKey;
  assert.ok(sign.verifyDirectory(release, crypto.createPublicKey(other)).length > 0);
});

test("the private key can come from the environment and must be Ed25519", (t) => {
  const { keyFile } = workspace(t);
  const pem = fs.readFileSync(keyFile, "utf8");
  assert.equal(sign.loadPrivateKey({}, { BRICOHAMS_FW_SIGNING_KEY: pem }).asymmetricKeyType, "ed25519");
  assert.throws(() => sign.loadPrivateKey({}, {}), /BRICOHAMS_FW_SIGNING_KEY/);
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
  assert.throws(() => sign.loadPrivateKey({}, { BRICOHAMS_FW_SIGNING_KEY: rsa }), /Ed25519/);
});

test("web installer accepts a good signed firmware and refuses tampered or unsigned ones", async (t) => {
  const { release, publicKeyHex, privateKey } = workspace(t);
  sign.signDirectory(release, privateKey);
  const read = (name) => fs.readFileSync(path.join(release, name), "utf8");
  const bytes = new Uint8Array(fs.readFileSync(path.join(release, "alpha.bin")));
  const files = { sumsText: read("SHA256SUMS"), sumsSig: read("SHA256SUMS.sig"), fileSig: read("alpha.bin.sig") };
  const options = { publicKeyHex };

  const good = await FirmwareSignature.verifyFirmware("alpha.bin", bytes, files, options);
  assert.deepEqual(good, { status: "verified", label: "Firma verificada" });

  const tampered = bytes.slice();
  tampered[0] ^= 0xff;
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", tampered, files, options), /rechazado/);
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", bytes, { ...files, fileSig: read("beta.bin.sig") }, options), /Firma del firmware no valida/);
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", bytes, { ...files, sumsSig: read("beta.bin.sig") }, options), /SHA256SUMS no valida/);
  const forgedSums = files.sumsText.replace(/^[0-9a-f]{64}/, crypto.createHash("sha256").update(tampered).digest("hex"));
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", tampered, { ...files, sumsText: forgedSums }, options), /SHA256SUMS no valida/);
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", bytes, { ...files, fileSig: "" }, options), /Faltan las firmas/);
  await assert.rejects(FirmwareSignature.verifyFirmware("gamma.bin", bytes, files, options), /no figura/);
  const otherKey = sign.publicHex(crypto.generateKeyPairSync("ed25519").privateKey);
  await assert.rejects(FirmwareSignature.verifyFirmware("alpha.bin", bytes, files, { publicKeyHex: otherKey }), /no valida/);

  const unconfigured = await FirmwareSignature.verifyFirmware("alpha.bin", bytes, null, { publicKeyHex: "" });
  assert.equal(unconfigured.status, "unconfigured");
});

test("verifyPrecompiled fetches the signature files next to the image and refuses when they are missing", async (t) => {
  const { release, publicKeyHex, privateKey } = workspace(t);
  sign.signDirectory(release, privateKey);
  const entry = { name: "alpha.bin", path: "precompiled/alpha.bin" };
  const bytes = new Uint8Array(fs.readFileSync(path.join(release, "alpha.bin")));
  const serve = (missing) => async (url) => {
    const name = url.replace("precompiled/", "");
    if (name === missing) throw new Error("HTTP 404");
    return fs.readFileSync(path.join(release, name), "utf8");
  };
  const ok = await FirmwareSignature.verifyPrecompiled(entry, bytes, { publicKeyHex, fetchText: serve() });
  assert.equal(ok.label, "Firma verificada");
  await assert.rejects(FirmwareSignature.verifyPrecompiled(entry, bytes, { publicKeyHex, fetchText: serve("alpha.bin.sig") }), /404/);
  const bad = bytes.slice();
  bad[10] ^= 1;
  await assert.rejects(FirmwareSignature.verifyPrecompiled(entry, bad, { publicKeyHex, fetchText: serve() }), /rechazado/);
});

test("the installer wires the verification before preparing or saving a precompiled image", () => {
  const catalog = fs.readFileSync(path.join(root, "precompiled-catalog.js"), "utf8");
  assert.ok(catalog.indexOf("await verifyPrecompiledSignature(entry, bytes)") < catalog.indexOf("useImage(bytes, entry.edition)"));
  assert.match(fs.readFileSync(path.join(root, "quansheng.html"), "utf8"), /firmware-signature\.js[\s\S]*precompiled-catalog\.js/);
  const { ALLOWED_FILES } = require("../server.cjs");
  for (const file of ["firmware-signature.js", "ota.html", "ota.css", "ota.js"]) assert.ok(ALLOWED_FILES.includes(file), file);
  assert.equal(FirmwareSignature.PUBLIC_KEY_HEX === "" || /^[0-9a-f]{64}$/.test(FirmwareSignature.PUBLIC_KEY_HEX), true);
});

test("OTA page canonical form matches the manifest tool and its signature check accepts good, rejects tampered", async () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyHex = sign.publicHex(privateKey);
  const manifest = { schema: 1, package: "org.bricohams.radicodex", versionCode: 17, versionName: "1.0.2", minSdk: 26,
    apk: { url: "https://example.org/a.apk", sha256: "a".repeat(64), size: 10 }, notes: { es: "Versión ñ", en: "x" } };
  assert.equal(ota.canonical(manifest), canonical(manifest));
  const signed = { ...manifest, signature: crypto.sign(null, Buffer.from(canonical(manifest)), privateKey).toString("base64") };
  assert.equal(await ota.verifyManifest(signed, publicKeyHex), "valid");
  assert.equal(await ota.verifyManifest({ ...signed, versionCode: 18 }, publicKeyHex), "invalid");
  assert.equal(await ota.verifyManifest({ ...signed, apk: { ...signed.apk, sha256: "b".repeat(64) } }, publicKeyHex), "invalid");
  assert.equal(ota.isDownloadUrl("http://example.org/a.apk"), false);
  assert.equal(ota.isDownloadUrl("https://example.org/a.apk"), true);
});

test("OTA page is CSP-friendly and the app keeps the GitHub Release asset as fallback", () => {
  const html = fs.readFileSync(path.join(root, "ota.html"), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>|\sstyle=|<style|\son[a-z]+=/i);
  const kotlin = fs.readFileSync(path.join(root, "android/app/src/main/java/org/bricohams/radio/Ota.kt"), "utf8");
  assert.match(kotlin, /MANIFEST_URL = "https:\/\/brico-hams\.github\.io\/Radio-Web-install\/radicodex-update\.json"/);
  assert.match(kotlin, /FALLBACK_MANIFEST_URL = "https:\/\/github\.com\/Brico-Hams\/Radio-Web-install\/releases\/download\/radicodex-ota\/radicodex-update\.json"/);
  const key = kotlin.match(/PUBLIC_KEY_HEX = "([0-9a-f]{64})"/)?.[1];
  assert.equal(ota.PUBLIC_KEY_HEX, key, "ota.js must embed the same OTA public key as the app");
});

test("fdroid flavor has no updater permission or components; github keeps OTA", () => {
  const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle.kts"), "utf8");
  assert.match(gradle, /create\("fdroid"\)[\s\S]*?OTA_ENABLED", "false"/);
  assert.match(gradle, /create\("github"\)[\s\S]*?OTA_ENABLED", "true"/);
  assert.match(gradle, /vcsInfo\.include = false/);
  assert.match(gradle, /includeInApk = false/);
  const overlay = fs.readFileSync(path.join(root, "android/app/src/fdroid/AndroidManifest.xml"), "utf8");
  assert.match(overlay, /REQUEST_INSTALL_PACKAGES"[^>]*tools:node="remove"/);
  assert.match(overlay, /\.OtaActivity"[^>]*tools:node="remove"/);
  assert.match(overlay, /\.OtaInstallReceiver"[^>]*tools:node="remove"/);
  assert.match(fs.readFileSync(path.join(root, "android/app/src/main/AndroidManifest.xml"), "utf8"), /REQUEST_INSTALL_PACKAGES/);
});
