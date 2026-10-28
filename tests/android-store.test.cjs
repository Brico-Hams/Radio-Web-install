"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateStore, LOCALES, RECIPE } = require("../scripts/check-android-store.cjs");
const root = path.join(__dirname, "..");

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bricohams-store-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of ["android/app/build.gradle.kts", RECIPE]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  fs.cpSync(path.join(root, "fastlane"), path.join(dir, "fastlane"), { recursive: true });
  return dir;
}

test("F-Droid candidate matches Android versions and four localized store descriptions", () => {
  const result = validateStore(root);
  assert.equal(result.locales, 4);
  assert.equal(result.tag, `android-v${result.versionName}`);
  assert.doesNotThrow(() => validateStore(root, { tag: result.tag }));
  assert.throws(() => validateStore(root, { tag: "v0.5.2" }), /Tag does not match/);
  assert.throws(() => validateStore(root, { tag: `${result.tag}-other` }), /Tag does not match/);
});

test("store validation rejects oversized descriptions and missing translations", t => {
  const dir = fixture(t);
  for (const locale of LOCALES) {
    const short = path.join(dir, "fastlane/metadata/android", locale, "short_description.txt");
    const original = fs.readFileSync(short, "utf8");
    fs.writeFileSync(short, "x".repeat(81));
    assert.throws(() => validateStore(dir), /exceeds 80/);
    fs.writeFileSync(short, "");
    assert.throws(() => validateStore(dir), /empty/);
    fs.writeFileSync(short, original);
  }
  fs.unlinkSync(path.join(dir, "fastlane/metadata/android/fr-FR/full_description.txt"));
  assert.throws(() => validateStore(dir), /ENOENT/);
});

test("store validation rejects stale versions and unrelated release tags", t => {
  const dir = fixture(t);
  const file = path.join(dir, RECIPE);
  const original = fs.readFileSync(file, "utf8");
  const code = validateStore(dir).versionCode;
  fs.writeFileSync(file, original.replace(`    versionCode: ${code}`, `    versionCode: ${code + 1}`));
  assert.throws(() => validateStore(dir), /versionCode is stale/);
  fs.writeFileSync(file, original.replace(/^UpdateCheckMode: Tags .+$/m, "UpdateCheckMode: Tags .*"));
  assert.throws(() => validateStore(dir), /Web tags must not trigger/);
  fs.writeFileSync(file, original.replace(/^    commit: .+$/m, "    commit: main"));
  assert.throws(() => validateStore(dir), /full commit SHA/);
});

test("release CI checks store metadata and builds a separate unsigned release APK", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/android.yml"), "utf8");
  assert.ok(workflow.includes('"android-v*"'));
  assert.ok(workflow.includes("node scripts/check-android-store.cjs"));
  assert.ok(workflow.includes(":app:assembleRelease"));
  assert.ok(workflow.includes(":app:lintRelease"));
  assert.ok(workflow.includes("app-release-unsigned.apk"));
  assert.ok(workflow.includes("startsWith(github.ref, 'refs/tags/v')"));
});
