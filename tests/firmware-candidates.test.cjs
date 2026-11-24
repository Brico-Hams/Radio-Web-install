const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadManifest, validateCandidate, buildCandidate } = require("../scripts/build-candidate.cjs");

const root = path.join(__dirname, "..");
const manifest = loadManifest();
const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "firmware-candidates.yml"), "utf8");

test("every candidate is Beta, not boot tested, TX inhibited and pinned to a full commit", () => {
  assert(manifest.candidates.length > 0);
  for (const candidate of manifest.candidates) assert.deepEqual(validateCandidate(candidate), [], candidate.id);
});

test("the candidates workflow is manual only, read only, pinned and never publishes", () => {
  assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:\s*\n/m);
  assert.doesNotMatch(workflow, /^\s+(push|pull_request|schedule|release):/m);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  const active = workflow.replace(/^\s*#.*$/gm, "");
  assert.doesNotMatch(active, /precompiled|catalog\.json|gh release|softprops|contents: write/);
  assert(workflow.includes(manifest.toolchain.sha256));
  for (const candidate of manifest.candidates) {
    assert(workflow.includes(`  ${candidate.id}:`), `job ${candidate.id}`);
    assert(workflow.includes(candidate.commit), `commit ${candidate.id}`);
    assert(workflow.includes("build-candidate.cjs --id " + candidate.id));
    assert(!/\.btf/i.test(candidate.artifacts.join(" ")));
  }
});

test("the TX inhibit patch of each candidate exists and blocks the keying entry point", () => {
  for (const candidate of manifest.candidates) {
    for (const patch of candidate.patches) {
      const text = fs.readFileSync(path.join(root, patch), "utf8");
      assert.match(text, /^\+\s+return;/m);
      assert.match(text, /TX stays inhibited/);
    }
  }
});

test("a build verifies the pinned commit, applies the patch and writes deterministic build-info and SHA-256", () => {
  const candidate = manifest.candidates[0];
  const source = fs.mkdtempSync(path.join(os.tmpdir(), "cand-src-"));
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "cand-out-"));
  fs.mkdirSync(path.join(source, "build"));
  const calls = [];
  const run = (command, args) => {
    calls.push([command, ...args]);
    if (command === "git" && args[0] === "rev-parse") return candidate.commit;
    if (command === "make") {
      fs.writeFileSync(path.join(source, "build", "rt950-custom.bin"), Buffer.from([1, 2, 3]));
      fs.writeFileSync(path.join(source, "build", "rt950-custom.hex"), ":00000001FF\n");
    }
    return "";
  };
  const now = () => new Date("2026-11-24T00:00:00Z");
  const info = buildCandidate({ manifest, id: candidate.id, source, output, run, now });
  assert.deepEqual(calls.map(call => call[0] + " " + call[1]), ["git rev-parse", "git apply", "make all"]);
  assert.equal(info.hardwareBootTested, false);
  assert.equal(info.txInhibited, true);
  assert.equal(info.builtAt, "2026-11-24T00:00:00.000Z");
  const sums = fs.readFileSync(path.join(output, "artifacts", "SHA256SUMS"), "utf8");
  const expected = require("node:crypto").createHash("sha256").update(Buffer.from([1, 2, 3])).digest("hex");
  assert(sums.includes(`${expected}  bricohams-candidate.rt950-pro-hertzz.bin`));
  assert(fs.existsSync(path.join(output, "artifacts", "build-info.json")));
});

test("a build refuses a wrong commit or OEM material in the checkout", () => {
  const candidate = manifest.candidates[0];
  const source = fs.mkdtempSync(path.join(os.tmpdir(), "cand-bad-"));
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "cand-out-"));
  assert.throws(() => buildCandidate({ manifest, id: candidate.id, source, output, run: () => "0".repeat(40) }), /expected/);
  fs.mkdirSync(path.join(source, "binary"));
  assert.throws(() => buildCandidate({ manifest, id: candidate.id, source, output, run: () => candidate.commit }), /Forbidden path/);
});

test("candidate files never touch published firmware or signing material", () => {
  const text = JSON.stringify(manifest);
  assert.doesNotMatch(text, /precompiled|catalog\.json|firmware-signature/);
});
