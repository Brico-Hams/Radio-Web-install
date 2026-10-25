"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { projectSource, safeRelative, checksumFiles, copyAndroid, exportProject } = require("../scripts/export-project.cjs");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

function write(directory, name, text) {
  const file = path.join(directory, ...name.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function sums(directory, names) {
  write(directory, "SHA256SUMS", names.map(name => `${sha(fs.readFileSync(path.join(directory, name)))}  ${name}`).join("\n") + "\n");
}

function repository(directory) {
  execFileSync("git", ["init", "--quiet", directory]);
  execFileSync("git", ["-C", directory, "add", "README.md"]);
  execFileSync("git", ["-C", directory, "-c", "user.name=Bricohams tests", "-c", "user.email=tests@example.invalid",
    "commit", "--quiet", "-m", "Export fixture\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"]);
  return execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function androidFixture(project, directory) {
  const sources = {
    "android/app/build.gradle.kts": 'android { defaultConfig { versionName = "0.7.0-beta" } }\n',
    "android/app/src/main/AndroidManifest.xml": "<manifest/>\n",
    "android/app/src/main/java/org/bricohams/radio/ArdfStatistics.kt": "package org.bricohams.radio\n"
  };
  for (const [name, text] of Object.entries(sources)) write(project, name, text);
  write(project, "docs/ANDROID.md", "Android Beta fixture\n");
  const names = ["bricohams-android-0.7.0-beta-debug.apk", "bricohams-android-0.7.0-beta-androidTest.apk",
    "LICENSE", "NOTICE.txt", "LICENSE-APACHE-2.0.txt", "LICENSE-USB-SERIAL-MIT.txt",
    "LICENSE-SATELLITE-MIT.txt", "LICENSE-RHINO.txt"];
  for (const name of names) write(directory, name, `fixture ${name}`);
  write(directory, "ANDROID.md", "Android Beta fixture\n");
  const info = { format: "bricohams-android-build", version: 1, applicationId: "org.bricohams.radio",
    applicationVersion: "0.7.0-beta", stability: "beta", signing: "debug",
    hostTests: 69, testFailures: 0, lintErrors: 0, hardwareTested: false, instrumentationTestsExecuted: false,
    sourceHashes: Object.entries(sources).map(([file, text]) => ({ file, sha256: sha(text) })) };
  write(directory, "build-info.json", JSON.stringify(info));
  const entries = [...names, "ANDROID.md", "build-info.json"];
  sums(directory, entries);
  return { info, entries };
}

test("Android exige APK, licencias, pruebas y correspondencia exacta de las fuentes", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-export-android-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const project = path.join(directory, "project");
  const delivery = path.join(directory, "delivery");
  const { info, entries } = androidFixture(project, delivery);
  const copied = copyAndroid(delivery, project, path.join(directory, "valid"));
  assert.equal(copied.hostTests, 69);
  assert.equal(copied.sourceHashesVerified, 3);
  assert.equal(copied.hardwareTested, false);
  assert.equal(checksumFiles(path.join(directory, "valid")).length, entries.length);
  function invalid(changed, expected) {
    write(delivery, "build-info.json", JSON.stringify(changed));
    sums(delivery, entries);
    assert.throws(() => copyAndroid(delivery, project, path.join(directory, "invalid")), expected);
    assert.equal(fs.existsSync(path.join(directory, "invalid")), false);
  }
  invalid({ ...info, testFailures: 1 }, /validacion/);
  invalid({ ...info, hostTests: 0 }, /validacion/);
  invalid({ ...info, lintErrors: 1 }, /validacion/);
  invalid({ ...info, signing: "release" }, /validacion/);
  invalid({ ...info, sourceHashes: info.sourceHashes.slice(1) }, /inventario/);
  invalid({ ...info, sourceHashes: [...info.sourceHashes, info.sourceHashes[0]] }, /inventario/);
  invalid({ ...info, sourceHashes: [{ file: "../secret", sha256: "0".repeat(64) }] }, /Ruta/);
  invalid({ ...info, sourceHashes: [{ ...info.sourceHashes[0], sha256: "0".repeat(64) }] }, /fuente distinta/);
  write(delivery, "build-info.json", JSON.stringify(info));
  write(delivery, "ANDROID.md", "outdated guide");
  sums(delivery, entries);
  assert.throws(() => copyAndroid(delivery, project, path.join(directory, "invalid")), /guia distinta/);
  write(delivery, "ANDROID.md", "Android Beta fixture\n");
  sums(delivery, entries.filter(name => name !== "LICENSE-RHINO.txt"));
  assert.throws(() => copyAndroid(delivery, project, path.join(directory, "invalid")), /licencias/);
  sums(delivery, entries);
  write(delivery, "bricohams-android-0.7.0-beta-debug.apk", "tampered");
  assert.throws(() => copyAndroid(delivery, project, path.join(directory, "invalid")), /SHA-256 distinto/);
});

test("la exportacion excluye configuracion privada, respaldos, caches y datos descargados", () => {
  for (const name of ["README.md", "LICENSE", "scripts/export-project.cjs", "firmware/bricohams/ardf.c",
    "docs/ESTADO-ENTREGA.md", "anytone.html", "android/app/src/main/AndroidManifest.xml",
    "android/gradle/wrapper/gradle-wrapper.jar", "data/satellites.config.json"]) assert.equal(projectSource(name), true, name);
  for (const name of [".env", ".env.local", ".git/config", ".vscode/settings.json",
    "node_modules/dependency/index.js", "firmware-builds/test/file.c", "dist/app.js", "radio.g77",
    "backup.rwb.json", "radio.bin", "certificate.p12", "docs/private.key", "data/users.json",
    "data/satellites.json", "studio.html", "tests/tmp/file.json", "android/.gradle/cache",
    "android/local.properties", "android/app/build/app.apk", "android/release.jks"]) assert.equal(projectSource(name), false, name);
  for (const name of ["../secret", "/absolute", "C:/secret", "docs\\secret", "docs/../secret", "docs//file", "docs/file\nname", ""]) {
    assert.throws(() => safeRelative(name), /Ruta/);
  }
});

test("los manifiestos de exportacion rechazan rutas, duplicados y cambios de contenido", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-export-sums-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  write(directory, "file.zip", "installer");
  sums(directory, ["file.zip"]);
  assert.deepEqual(checksumFiles(directory), ["file.zip"]);
  write(directory, "file.zip", "changed");
  assert.throws(() => checksumFiles(directory), /SHA-256 distinto/);
  for (const name of ["../file.zip", "folder/file.zip"]) {
    write(directory, "SHA256SUMS", `${"0".repeat(64)}  ${name}\n`);
    assert.throws(() => checksumFiles(directory), /Ruta|archivo directo/);
  }
  sums(directory, ["file.zip", "file.zip"]);
  assert.throws(() => checksumFiles(directory), /duplicado/);
});

test("el ZIP Beta conserva fuentes, historial y artefactos verificables y no sobreescribe", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-export-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const project = path.join(directory, "project");
  write(project, "README.md", "Project fixture\n");
  const revision = repository(project);
  write(project, "LICENSE", "Project license fixture\n");
  write(project, ".env", "PRIVATE_TOKEN=must-not-export\n");
  write(project, "radio.bin", "private radio backup");
  write(project, "docs/ESTADO-ENTREGA.md", "Incomplete Beta\n");
  const firmware = path.join(directory, "firmware");
  const build = path.join(firmware, "ARDF-Beta");
  const source = path.join(build, "source");
  write(source, "README.md", "Upstream fixture\n");
  const upstreamCommit = repository(source);
  write(source, "App/ardf.c", "/* independent fixture */\n");
  const artifacts = path.join(build, "artifacts");
  const filename = "bricohams.fieldops.ardf.v6.1.0.bin";
  write(artifacts, filename, Buffer.alloc(1024, 7));
  write(artifacts, "LICENSE", "Upstream license fixture\n");
  write(artifacts, "NOTICE", "Upstream notice fixture\n");
  write(artifacts, "build-info.json", JSON.stringify({ format: "bricohams-firmware-build",
    firmware: filename, preset: "FieldOps", options: [], upstream: { commit: upstreamCommit, tag: "v6.1.0" }, hardwareTested: false,
    moduleSources: [{ file: "App/ardf.c", sha256: sha(fs.readFileSync(path.join(source, "App", "ardf.c"))) }] }));
  sums(artifacts, [filename, "LICENSE", "NOTICE", "build-info.json"]);
  fs.mkdirSync(path.join(firmware, "failed-build"));
  const installers = path.join(directory, "installers");
  const suffixes = ["windows-x64.zip", "amd64.deb", "arm64.deb", "armhf.deb",
    "arch.tar.gz", "arch-source.tar.gz", "freebsd-amd64.tar.gz"];
  const packages = suffixes.map(suffix => `bricohams-radio-workspace-v0.0.0-beta-${suffix}`);
  for (const name of packages) write(installers, name, `fixture ${name}`);
  sums(installers, packages);
  const android = path.join(directory, "android-delivery");
  androidFixture(project, android);
  const output = path.join(directory, "export.zip");
  const options = { project, firmware, installers, android, output };
  await assert.rejects(exportProject(options), /--beta/);
  await assert.rejects(exportProject({ ...options, beta: true, output: path.join(directory, "output.tar") }), /\.zip/);
  const result = await exportProject({ ...options, beta: true });
  assert.equal(result.builds, 1);
  assert.equal(result.packages, 7);
  assert.equal(result.revision, revision);
  assert.equal(result.dirty, true);
  assert.equal(result.android.sourceHashesVerified, 3);
  assert.deepEqual(result.excludedBuilds, ["failed-build"]);
  assert.equal(result.sha256, sha(fs.readFileSync(output)));
  const extract = path.join(directory, "extracted");
  fs.mkdirSync(extract);
  if (process.platform === "win32") execFileSync(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), ["-xf", output, "-C", extract]);
  else execFileSync("unzip", ["-q", output, "-d", extract]);
  const exported = path.join(extract, "Bricohams");
  const info = JSON.parse(fs.readFileSync(path.join(exported, "export-info.json"), "utf8"));
  assert.equal(info.status, "incomplete-beta");
  assert.equal(info.android.applicationVersion, "0.7.0-beta");
  assert.equal(info.android.hardwareTested, false);
  assert(info.files.some(file => file.file === "android/bricohams-android-0.7.0-beta-debug.apk"));
  for (const file of info.files) {
    const bytes = fs.readFileSync(path.join(exported, ...file.file.split("/")));
    assert.equal(bytes.length, file.bytes);
    assert.equal(sha(bytes), file.sha256, file.file);
    assert.doesNotMatch(file.file, /\.env|radio\.bin|\/\.git\//);
  }
  assert(info.files.some(file => file.file === "history.bundle"));
  assert(info.files.some(file => file.file.endsWith("source/App/ardf.c")));
  assert(info.files.some(file => file.file.endsWith(`artifacts/${filename}`)));
  execFileSync("git", ["-C", project, "bundle", "verify", path.join(exported, "history.bundle")], { stdio: "pipe" });
  await assert.rejects(exportProject({ ...options, beta: true }), /ya existe/);
  fs.unlinkSync(output);
  write(source, "App/ardf.c", "tampered");
  await assert.rejects(exportProject({ ...options, beta: true }), /Fuente modificada/);
  assert.equal(fs.existsSync(output), false);
  write(source, "App/ardf.c", "/* independent fixture */\n");
  write(path.join(firmware, "Legacy"), "build-info.json", "{}");
  await assert.rejects(exportProject({ ...options, beta: true }), /artefactos historicos/);
  assert.equal(fs.existsSync(output), false);
});
