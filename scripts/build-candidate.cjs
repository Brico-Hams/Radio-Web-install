#!/usr/bin/env node
// Builds one firmware candidate from firmware/candidates/candidates.json.
// Candidates are never published: they are Beta, not boot tested and keep TX inhibited.
// Usage: node scripts/build-candidate.cjs --id rt950-pro-hertzz --source <checkout at the pinned commit> --output <dir>
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "firmware", "candidates", "candidates.json");

function loadManifest(file = manifestPath) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateCandidate(candidate) {
  const problems = [];
  if (!/^[0-9a-f]{40}$/.test(candidate.commit || "")) problems.push("commit must be a full 40-hex SHA");
  if (candidate.stability !== "beta") problems.push("stability must be beta");
  if (candidate.hardwareBootTested !== false) problems.push("hardwareBootTested must be false");
  if (candidate.txInhibited !== true) problems.push("txInhibited must be true");
  if (!(candidate.patches || []).length) problems.push("a TX inhibit patch is required");
  for (const artifact of candidate.artifacts || []) {
    if (!/\.(bin|hex)$/i.test(artifact)) problems.push(`artifact ${artifact} must be a .bin or .hex`);
  }
  for (const forbidden of ["binary", "assembly"]) {
    if ((candidate.sparsePaths || []).some(item => item === forbidden || item.startsWith(`${forbidden}/`))) {
      problems.push(`${forbidden} must not be checked out`);
    }
  }
  return problems;
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function defaultRun(command, args, options) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.error}`);
  return result.stdout.trim();
}

// `run` and `now` are injectable so tests never spawn a toolchain.
function buildCandidate({ manifest, id, source, output, run = defaultRun, now = () => new Date() }) {
  const candidate = manifest.candidates.find(item => item.id === id);
  if (!candidate) throw new Error(`Unknown candidate: ${id}`);
  const problems = validateCandidate(candidate);
  if (problems.length) throw new Error(`Invalid candidate ${id}: ${problems.join("; ")}`);
  const head = run("git", ["rev-parse", "HEAD"], { cwd: source });
  if (head !== candidate.commit) throw new Error(`Source is at ${head}, expected ${candidate.commit}`);
  for (const forbidden of candidate.forbiddenPaths) {
    if (fs.existsSync(path.join(source, forbidden))) throw new Error(`Forbidden path present in source: ${forbidden}`);
  }
  for (const patch of candidate.patches) {
    run("git", ["apply", "--ignore-whitespace", path.join(root, patch)], { cwd: source });
  }
  run(candidate.buildCommand[0], candidate.buildCommand.slice(1), { cwd: source });

  const artifacts = path.join(output, "artifacts");
  fs.mkdirSync(artifacts, { recursive: true });
  const files = candidate.artifacts.map(artifact => {
    const bytes = fs.readFileSync(path.join(source, artifact));
    const name = `bricohams-candidate.${candidate.id}.${path.extname(artifact).slice(1)}`;
    fs.writeFileSync(path.join(artifacts, name), bytes);
    return { name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const info = {
    format: "bricohams-candidate-build",
    version: 1,
    id: candidate.id,
    radio: candidate.radio,
    upstream: candidate.upstream,
    upstreamCommit: candidate.commit,
    licence: candidate.licence,
    toolchain: manifest.toolchain.name,
    patches: candidate.patches,
    stability: candidate.stability,
    hardwareBootTested: candidate.hardwareBootTested,
    txInhibited: candidate.txInhibited,
    builtAt: now().toISOString(),
    files
  };
  fs.writeFileSync(path.join(artifacts, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`);
  fs.writeFileSync(path.join(artifacts, "SHA256SUMS"), files.map(file => `${file.sha256}  ${file.name}`).join("\n") + "\n");
  return info;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].replace(/^--/, "")] = argv[index + 1];
  return args;
}

if (require.main === module) {
  const { id, source, output } = parseArgs(process.argv.slice(2));
  if (!id || !source || !output) {
    console.error("Usage: node scripts/build-candidate.cjs --id <candidate> --source <checkout> --output <dir>");
    process.exit(2);
  }
  console.log(JSON.stringify(buildCandidate({ manifest: loadManifest(), id, source: path.resolve(source), output: path.resolve(output) }), null, 2));
}

module.exports = { loadManifest, validateCandidate, buildCandidate };
