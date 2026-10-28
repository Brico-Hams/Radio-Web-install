"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const LOCALES = ["en-US", "es-ES", "fr-FR", "de-DE"];
const RECIPE = "fdroid/metadata/org.bricohams.radio.yml";

function validateStore(root, { tag } = {}) {
  const read = file => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const gradle = read("android/app/build.gradle.kts");
  const versionName = gradle.match(/^\s*versionName = "([^"]+)"$/m)?.[1];
  const versionCode = Number(gradle.match(/^\s*versionCode = (\d+)$/m)?.[1]);
  assert.ok(versionName && Number.isSafeInteger(versionCode) && versionCode > 0, "Invalid Android version");
  assert.match(gradle, /applicationId = "org\.bricohams\.radio"/);
  const recipe = read(RECIPE);
  const expectedTag = `android-v${versionName}`;
  const tagPattern = recipe.match(/^UpdateCheckMode: Tags (.+)$/m)?.[1];
  assert.ok(tagPattern, "Missing F-Droid tag filter");
  const filter = new RegExp(tagPattern);
  assert.ok(filter.test(expectedTag), "Android version is not supported by the store tag policy");
  assert.ok(!filter.test("v0.5.2"), "Web tags must not trigger Android updates");
  assert.match(recipe, /^AutoUpdateMode: Version$/m);
  assert.ok(recipe.includes('UpdateCheckData: \'android/app/build.gradle.kts|versionCode\\s*=\\s*(\\d+)|.|versionName\\s*=\\s*"([^"]+)"\''),
    "UpdateCheckData must read both versions from the tagged Android Gradle file");
  assert.match(recipe, /^License: GPL-3\.0-or-later$/m);
  assert.match(recipe, /^    subdir: android$/m);
  assert.match(recipe, /^    gradle:\n      - yes$/m);
  assert.equal(recipe.match(/^  - versionName: (.+)$/m)?.[1], versionName, "Recipe versionName is stale");
  assert.equal(Number(recipe.match(/^    versionCode: (\d+)$/m)?.[1]), versionCode, "Recipe versionCode is stale");
  assert.equal(recipe.match(/^CurrentVersion: (.+)$/m)?.[1], versionName, "CurrentVersion is stale");
  assert.equal(Number(recipe.match(/^CurrentVersionCode: (\d+)$/m)?.[1]), versionCode, "CurrentVersionCode is stale");
  const commit = recipe.match(/^    commit: (.+)$/m)?.[1];
  assert.ok(commit === expectedTag || /^[a-f0-9]{40}$/.test(commit || ""), "Recipe needs the Android tag or a full commit SHA");
  if (tag !== undefined) assert.equal(tag, expectedTag, "Tag does not match the Android version");
  for (const locale of LOCALES) {
    const base = `fastlane/metadata/android/${locale}`;
    for (const [file, limit] of [["title.txt", 50], ["short_description.txt", 80],
      ["full_description.txt", 4000], [`changelogs/${versionCode}.txt`, 500]]) {
      const text = read(`${base}/${file}`).trim();
      assert.ok(text.length > 0 && [...text].length <= limit, `${locale}/${file}: empty or exceeds ${limit} characters`);
      if (file !== "full_description.txt") assert.ok(!text.includes("\n"), `${locale}/${file}: expected one line`);
    }
    assert.equal(read(`${base}/title.txt`).trim(), "Bricohams", `${locale}: preserve the Bricohams brand`);
  }
  return { versionName, versionCode, tag: expectedTag, locales: LOCALES.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === "--tag"), "Usage: node scripts/check-android-store.cjs [--tag android-vVERSION]");
  const result = validateStore(path.join(__dirname, ".."), { tag: args[1] });
  console.log(`Android store metadata OK: ${result.versionName} (${result.versionCode}), ${result.locales} locales; release tag ${result.tag}.`);
  console.log("Local validation only; this does not verify publication or F-Droid acceptance.");
}

module.exports = { validateStore, LOCALES, RECIPE };
