"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");

const UPSTREAM = Object.freeze({
  repository: "https://github.com/armel/uv-k1-k5v3-firmware-custom",
  commit: "f556a96e73c3e423a00cf473aeb37f827cac05a5",
  tag: "v6.1.0"
});
const REQUIRED = ["ENABLE_FEAT_F4HWN", "ENABLE_UART", "ENABLE_USB",
  "ENABLE_FEAT_F4HWN_MULTIBOOT", "ENABLE_FEAT_F4HWN_MULTIBOOT_OVERLAY"];

function readArguments(args) {
  const result = { preset: "Fusion", options: [] };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert(["--source", "--output", "--preset", "--option"].includes(key), `Argumento desconocido: ${key}`);
    const value = args[++i];
    assert(value && !value.startsWith("--"), `Falta valor para ${key}`);
    if (key === "--option") result.options.push(value);
    else {
      const name = key.slice(2);
      assert(!seen.has(name), `Argumento duplicado: ${key}`);
      seen.add(name);
      result[name] = value;
    }
  }
  assert(result.source && result.output, "Uso: node scripts/build-bricohams.cjs --source <Fusion61> --output <directorio nuevo> [--preset Fusion|Labs|FieldOps|Transfer] [--option ENABLE_XXX=OFF]");
  return result;
}

function resolvePlan(catalog, preset, changes) {
  assert(["Fusion", "Labs", "FieldOps", "Transfer"].includes(preset), "Edicion no admitida para Bricohams Multiboot.");
  const visiting = new Set();
  function inherit(name) {
    assert(!visiting.has(name), `Herencia circular: ${name}`);
    const entry = catalog.configurePresets.find(item => item.name === name);
    assert(entry, `Preset ausente: ${name}`);
    visiting.add(name);
    const parents = entry.inherits ? [].concat(entry.inherits) : [];
    const values = {};
    for (const parent of parents.reverse()) Object.assign(values, inherit(parent));
    Object.assign(values, entry.cacheVariables);
    visiting.delete(name);
    return values;
  }
  const defaults = inherit(preset);
  assert.equal(defaults.VERSION_STRING_2, UPSTREAM.tag, "Version de fuentes distinta de la fijada.");
  const options = Object.fromEntries(Object.entries(defaults).filter(([, value]) => typeof value === "boolean"));
  const requested = new Set();
  for (const change of changes) {
    const match = /^(ENABLE_[A-Z0-9_]+)=(ON|OFF)$/.exec(change);
    assert(match && Object.hasOwn(options, match[1]), `Opcion desconocida o valor no valido: ${change}`);
    assert(!requested.has(match[1]), `Opcion duplicada: ${match[1]}`);
    requested.add(match[1]);
    options[match[1]] = match[2] === "ON";
  }
  assert(!options.DEV, "No se admiten builds de desarrollo.");
  for (const name of REQUIRED) assert(options[name], `${name} debe estar ON para este perfil Multiboot.`);
  const delta = Object.keys(options).filter(name => options[name] !== defaults[name])
    .sort().map(name => `${name}=${options[name] ? "ON" : "OFF"}`);
  return { options, delta };
}

function inspectFirmware(bytes) {
  require("../radio-core.js");
  const R = require("../quansheng-connector.js");
  const result = R.inspectQuanshengSlotImage(new Uint8Array(bytes));
  assert.equal(`v${result.version}`, UPSTREAM.tag, "Version del binario distinta de la fijada.");
  assert(bytes.includes(Buffer.from("Bricohams")), "El binario no contiene la identidad de la edicion Bricohams.");
  return result;
}

function build(args) {
  const source = path.resolve(args.source);
  const output = path.resolve(args.output);
  assert(!fs.existsSync(output), `El destino ya existe; usa un directorio nuevo: ${output}`);
  const capture = (command, argv, cwd = source, env = process.env) =>
    execFileSync(command, argv, { cwd, env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
  assert.equal(capture("git", ["rev-parse", `${UPSTREAM.commit}^{commit}`]), UPSTREAM.commit);
  const catalog = JSON.parse(capture("git", ["show", `${UPSTREAM.commit}:CMakePresets.json`]));
  const plan = resolvePlan(catalog, args.preset, args.options);
  const dirty = capture("git", ["status", "--porcelain"]);
  if (dirty) console.warn("AVISO: hay cambios locales en las fuentes; NO se incluyen. Se compila exclusivamente el commit fijado.");
  const epoch = capture("git", ["show", "-s", "--format=%ct", UPSTREAM.commit]);
  assert(/^\d+$/.test(epoch), "Fecha del commit no valida.");
  const env = { ...process.env, SOURCE_DATE_EPOCH: epoch, TZ: "UTC", LC_ALL: "C" };
  const compiler = capture("arm-none-eabi-gcc", ["--version"], source, env);
  const cmake = capture("cmake", ["--version"], source, env);
  const ninja = capture("ninja", ["--version"], source, env);
  fs.mkdirSync(output, { recursive: true });
  const work = path.join(output, "source");
  const binary = path.join(output, "build");
  const artifacts = path.join(output, "artifacts");
  const run = (command, argv, cwd = output) => {
    execFileSync(command, argv, { cwd, env, stdio: "inherit" });
  };
  run("git", ["clone", "--local", "--no-hardlinks", "--no-checkout", source, work]);
  run("git", ["-C", work, "checkout", "--detach", UPSTREAM.commit]);
  run("cmake", ["--preset", args.preset, "-S", work, "-B", binary,
    "-DTARGET=bricohams", "-DEDITION_STRING=Bricohams", "-DDEV=OFF",
    ...Object.entries(plan.options).map(([name, value]) => `-D${name}=${value ? "ON" : "OFF"}`)], work);
  run("cmake", ["--build", binary, "--parallel", "2"], work);
  const bytes = fs.readFileSync(path.join(binary, "bricohams.bin"));
  const inspected = inspectFirmware(bytes);
  const sizeReport = capture("arm-none-eabi-size", ["-A", path.join(binary, "bricohams.elf")], work, env);
  const firmware = `bricohams.${args.preset.toLowerCase()}.${UPSTREAM.tag}.bin`;
  const info = {
    format: "bricohams-firmware-build", version: 1, firmware, preset: args.preset,
    edition: "Bricohams", hardware: ["UV-K5 V3", "UV-K1"], upstream: UPSTREAM,
    options: plan.delta, effectiveOptions: plan.options,
    sourceDateEpoch: Number(epoch), toolchain: { compiler, cmake, ninja },
    imageBytes: inspected.size, sourceChangesIncluded: false,
    hardwareTested: false, derivedFromKarina: false,
    stability: "beta", validation: "Structural checks only; physical validation pending"
  };
  fs.mkdirSync(artifacts);
  fs.writeFileSync(path.join(artifacts, firmware), bytes);
  fs.copyFileSync(path.join(binary, "bricohams.elf"), path.join(artifacts, "bricohams.elf"));
  fs.copyFileSync(path.join(binary, "bricohams.map"), path.join(artifacts, "bricohams.map"));
  for (const name of ["LICENSE", "NOTICE"]) fs.copyFileSync(path.join(work, name), path.join(artifacts, name));
  fs.writeFileSync(path.join(artifacts, "size.txt"), `${sizeReport}\n`);
  fs.writeFileSync(path.join(artifacts, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
  const names = fs.readdirSync(artifacts).sort();
  const sums = names.map(name => `${createHash("sha256").update(fs.readFileSync(path.join(artifacts, name))).digest("hex")}  ${name}`).join("\n");
  fs.writeFileSync(path.join(artifacts, "SHA256SUMS"), `${sums}\n`);
  console.log(`Artefactos verificados estructuralmente: ${artifacts}\n${firmware}: ${inspected.size} bytes. Sin prueba fisica ni escritura en radio.`);
  return { artifacts, info };
}

if (require.main === module) {
  try { build(readArguments(process.argv.slice(2))); }
  catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { UPSTREAM, readArguments, resolvePlan, inspectFirmware, build };
