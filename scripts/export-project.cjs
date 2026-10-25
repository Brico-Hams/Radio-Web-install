"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const R = require("../radio-core.js");
require("../f4hwn-options.js");
require("../custom-firmware-ui.js");

const root = path.join(__dirname, "..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const sourceDirectories = new Set([".github", "docs", "firmware", "android", "installers", "scripts", "tests", "data"]);
const privateName = /^(?:\.env(?:\..*)?|node_modules|\.git|\.vscode|\.gradle|\.kotlin|build|local\.properties|dist|firmware-builds|coverage|tmp)$/i;
const privateFile = /(?:\.bin|\.apk|\.aab|\.jks|\.keystore|\.g77|\.rwb\.json|\.provenance\.json|\.log|\.tle|\.pem|\.key|\.p12|\.pfx|\.bundle)$/i;

function safeRelative(name) {
  if (!name || /[\x00-\x1f\x7f]/.test(name) || name.includes("\\") || name.startsWith("/") || name.includes(":") ||
      name.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error(`Ruta no portable o insegura: ${name}`);
  }
  return name;
}

function projectSource(name) {
  safeRelative(name);
  const parts = name.split("/");
  if (parts.some(part => privateName.test(part)) || privateFile.test(name)) return false;
  if (name === "studio.html") return false;
  if (parts[0] === "data") return name === "data/satellites.config.json";
  return parts.length === 1 ? /^(?:LICENSE|\.gitignore)$|\.(?:md|js|cjs|json|html|css|png)$/.test(name) :
    sourceDirectories.has(parts[0]);
}

function regularFile(filename) {
  if (!fs.lstatSync(filename).isFile()) throw new Error(`No es un archivo regular: ${filename}`);
}

function copyFile(source, destination) {
  regularFile(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
}

function gitFiles(directory) {
  return execFileSync("git", ["-C", directory, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\0").filter(Boolean);
}

function copySources(source, destination, filter, extra = []) {
  for (const name of [...new Set([...gitFiles(source), ...extra])].sort()) {
    safeRelative(name);
    if (filter(name)) copyFile(path.join(source, ...name.split("/")), path.join(destination, ...name.split("/")));
  }
}

function checksumFiles(directory) {
  const manifest = path.join(directory, "SHA256SUMS");
  regularFile(manifest);
  const entries = fs.readFileSync(manifest, "utf8").trim().split(/\r?\n/).map(line => {
    const match = /^([a-f0-9]{64}) [ *](.+)$/i.exec(line);
    if (!match) throw new Error(`Linea SHA256SUMS invalida en ${directory}`);
    const name = safeRelative(match[2]);
    if (name.includes("/")) throw new Error(`Se requiere un archivo directo en SHA256SUMS: ${name}`);
    const file = path.join(directory, name);
    regularFile(file);
    if (sha(fs.readFileSync(file)) !== match[1].toLowerCase()) throw new Error(`SHA-256 distinto: ${file}`);
    return name;
  });
  if (!entries.length || new Set(entries).size !== entries.length || entries.includes("SHA256SUMS")) {
    throw new Error(`Manifiesto vacio, recursivo o duplicado: ${manifest}`);
  }
  return entries;
}

async function copyFirmware(directory, destination) {
  const entries = checksumFiles(path.join(directory, "artifacts"));
  const artifacts = path.join(directory, "artifacts");
  const files = ["SHA256SUMS", ...entries].map(name => ({ name, bytes: fs.readFileSync(path.join(artifacts, name)) }));
  const checked = await R.verifyCustomBuild(files);
  const info = checked.info;
  if (!/^bricohams\.[a-z0-9.-]+\.bin$/i.test(info.firmware)) throw new Error(`Firmware ajeno a la exportacion Bricohams: ${info.firmware}`);
  if (!entries.includes("LICENSE") || !entries.includes("NOTICE")) throw new Error(`Faltan licencias upstream: ${directory}`);
  const sources = [...(info.moduleSources || []), ...(info.brandingSources || [])];
  for (const entry of sources) {
    safeRelative(entry.file);
    const file = path.join(directory, "source", ...entry.file.split("/"));
    regularFile(file);
    if (sha(fs.readFileSync(file)) !== entry.sha256) throw new Error(`Fuente modificada: ${file}`);
  }
  const source = path.join(directory, "source");
  const commit = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (commit !== info.upstream?.commit) throw new Error(`Revision fuente distinta del manifiesto: ${directory}`);
  copySources(source, path.join(destination, "source"), name => !name.split("/").some(part => privateName.test(part)),
    sources.map(entry => entry.file));
  for (const name of ["SHA256SUMS", ...entries]) copyFile(path.join(artifacts, name), path.join(destination, "artifacts", name));
  checksumFiles(path.join(destination, "artifacts"));
  for (const entry of sources) {
    if (sha(fs.readFileSync(path.join(destination, "source", ...entry.file.split("/")))) !== entry.sha256) {
      throw new Error(`La fuente cambio durante la copia: ${entry.file}`);
    }
  }
  return { firmware: info.firmware, upstreamCommit: commit, imageBytes: checked.firmware.bytes.length,
    hardwareTested: info.hardwareTested === true, sourceHashesVerified: sources.length };
}

function inventory(directory, prefix = "") {
  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return inventory(directory, name);
      const file = path.join(directory, ...name.split("/"));
      regularFile(file);
      return [{ file: name, bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }];
    });
}

function copyAndroid(directory, projectSnapshot, destination) {
  const entries = checksumFiles(directory);
  if (!entries.includes("build-info.json")) throw new Error("Android: falta build-info.json verificado.");
  const info = JSON.parse(fs.readFileSync(path.join(directory, "build-info.json"), "utf8"));
  if (info.format !== "bricohams-android-build" || info.version !== 1 ||
      info.applicationId !== "org.bricohams.radio" || !/^\d+\.\d+\.\d+-beta$/.test(info.applicationVersion) ||
      info.stability !== "beta" || info.signing !== "debug" ||
      !Number.isInteger(info.hostTests) || info.hostTests <= 0 || info.testFailures !== 0 || info.lintErrors !== 0) {
    throw new Error("Android: manifiesto Beta o validacion de compilacion no admitidos.");
  }
  const required = [
    `bricohams-android-${info.applicationVersion}-debug.apk`,
    `bricohams-android-${info.applicationVersion}-androidTest.apk`,
    "build-info.json", "ANDROID.md", "LICENSE", "NOTICE.txt", "LICENSE-APACHE-2.0.txt",
    "LICENSE-USB-SERIAL-MIT.txt", "LICENSE-SATELLITE-MIT.txt", "LICENSE-RHINO.txt"
  ];
  if (entries.length !== required.length || required.some(name => !entries.includes(name))) {
    throw new Error("Android: faltan APK, guia o licencias, o hay archivos ajenos a la entrega.");
  }
  const actual = inventory(path.join(projectSnapshot, "android")).map(file => `android/${file.file}`).sort();
  if (!Array.isArray(info.sourceHashes) || !info.sourceHashes.length) throw new Error("Android: faltan hashes de fuentes.");
  const declared = info.sourceHashes.map(entry => {
    safeRelative(entry.file);
    if (!entry.file.startsWith("android/") || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error("Android: ruta o hash de fuente no admitido.");
    }
    const source = path.join(projectSnapshot, ...entry.file.split("/"));
    regularFile(source);
    if (sha(fs.readFileSync(source)) !== entry.sha256) throw new Error(`Android: fuente distinta de la APK: ${entry.file}`);
    return entry.file;
  }).sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared)) throw new Error("Android: inventario de fuentes incompleto o duplicado.");
  const gradle = fs.readFileSync(path.join(projectSnapshot, "android", "app", "build.gradle.kts"), "utf8");
  if (!gradle.includes(`versionName = "${info.applicationVersion}"`)) throw new Error("Android: version distinta de las fuentes.");
  if (sha(fs.readFileSync(path.join(directory, "ANDROID.md"))) !==
      sha(fs.readFileSync(path.join(projectSnapshot, "docs", "ANDROID.md")))) {
    throw new Error("Android: guia distinta de la instantanea del proyecto.");
  }
  for (const name of ["SHA256SUMS", ...entries]) copyFile(path.join(directory, name), path.join(destination, name));
  checksumFiles(destination);
  return { applicationVersion: info.applicationVersion, hostTests: info.hostTests,
    hardwareTested: info.hardwareTested === true, instrumentationTestsExecuted: info.instrumentationTestsExecuted === true,
    signing: info.signing, sourceHashesVerified: declared.length, packages: required.filter(name => name.endsWith(".apk")) };
}

async function exportProject({ project = root, firmware, installers, android, output, beta }) {
  if (!beta) throw new Error("La matriz de entrega sigue incompleta. Indica --beta para exportar una instantanea de desarrollo.");
  if (!firmware || !installers || !output) throw new Error("Se requieren --firmware, --installers y --output.");
  if (!output.toLowerCase().endsWith(".zip")) throw new Error("El destino debe terminar en .zip.");
  if (fs.existsSync(output)) throw new Error(`El destino ya existe: ${output}`);
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-export-"));
  try {
    const content = path.join(stage, "Bricohams");
    fs.mkdirSync(content);
    const revision = execFileSync("git", ["-C", project, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["-C", project, "status", "--porcelain"], { encoding: "utf8" }).length > 0;
    copySources(project, path.join(content, "project"), projectSource);
    const androidBuild = android ? copyAndroid(android, path.join(content, "project"), path.join(content, "android")) : null;
    execFileSync("git", ["-C", project, "bundle", "create", path.join(content, "history.bundle"), "HEAD"], { stdio: "pipe" });
    const builds = [];
    const excludedBuilds = [];
    for (const entry of fs.readdirSync(firmware, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) throw new Error(`Entrada inesperada en la raiz de compilaciones: ${entry.name}`);
      if (!fs.existsSync(path.join(firmware, entry.name, "artifacts", "build-info.json"))) {
        if (fs.existsSync(path.join(firmware, entry.name, "build-info.json"))) {
          throw new Error(`Solo hay artefactos historicos en ${entry.name}. Usa el directorio de compilacion original con artifacts y source; no se omite este firmware.`);
        }
        excludedBuilds.push(entry.name);
        continue;
      }
      builds.push({ build: entry.name, ...await copyFirmware(path.join(firmware, entry.name),
        path.join(content, "firmware", entry.name)) });
    }
    if (!builds.length) throw new Error("No hay compilaciones Bricohams verificables.");
    const packages = checksumFiles(installers);
    if (!packages.some(name => name.endsWith("-windows-x64.zip")) ||
        !packages.some(name => name.endsWith("-amd64.deb")) ||
        !packages.some(name => name.endsWith("-arm64.deb")) ||
        !packages.some(name => name.endsWith("-armhf.deb")) ||
        !packages.some(name => name.endsWith("-arch.tar.gz")) ||
        !packages.some(name => name.endsWith("-arch-source.tar.gz")) ||
        !packages.some(name => name.endsWith("-freebsd-amd64.tar.gz"))) {
      throw new Error("Faltan instalables de alguna plataforma en SHA256SUMS.");
    }
    for (const name of packages) {
      if (!/^bricohams-radio-workspace-[a-z0-9._-]+\.(?:zip|deb|tar\.gz)$/i.test(name)) {
        throw new Error(`Archivo no reconocido como instalable: ${name}`);
      }
    }
    for (const name of ["SHA256SUMS", ...packages]) copyFile(path.join(installers, name), path.join(content, "installers", name));
    checksumFiles(path.join(content, "installers"));
    const manifest = { format: "bricohams-project-export", version: 1, status: "incomplete-beta",
      createdAt: new Date().toISOString(), revision, dirty, builds, excludedBuilds, packages, android: androidBuild,
      warning: "Development snapshot, not a completed release or hardware validation. Installer provenance must be checked separately.",
      files: inventory(content) };
    const json = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
    fs.writeFileSync(path.join(content, "export-info.json"), json);
    fs.writeFileSync(path.join(content, "SHA256SUMS"), [...manifest.files.map(file => `${file.sha256}  ${file.file}`),
      `${sha(json)}  export-info.json`].join("\n") + "\n");
    const archive = path.join(stage, "export.zip");
    if (process.platform === "win32") {
      execFileSync("tar", ["-a", "-cf", archive, "-C", stage, "Bricohams"], { stdio: "pipe" });
    } else {
      execFileSync("zip", ["-q", "-r", archive, "Bricohams"], { cwd: stage, stdio: "pipe" });
    }
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.copyFileSync(archive, output, fs.constants.COPYFILE_EXCL);
    return { output, revision, dirty, builds: builds.length, excludedBuilds,
      packages: packages.length, android: androidBuild, bytes: fs.statSync(output).size, sha256: sha(fs.readFileSync(output)) };
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const options = {};
  try {
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index++) {
      const argument = args[index];
      if (argument === "--beta") options.beta = true;
      else if (["--firmware", "--installers", "--android", "--output"].includes(argument) && args[index + 1] && !args[index + 1].startsWith("--")) {
        options[argument.slice(2)] = path.resolve(args[++index]);
      } else throw new Error(`Argumento no reconocido o sin valor: ${argument}`);
    }
    exportProject(options).then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => { console.error(error.message); process.exitCode = 1; });
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

module.exports = { projectSource, safeRelative, checksumFiles, copyAndroid, exportProject };
