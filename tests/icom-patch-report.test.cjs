"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { analyzeAll, generate, loadPatches, MERGE_GAP, LARGEST } = require("../scripts/icom-patch-report.cjs");

const root = path.join(__dirname, "..");
const lengthOf = op => Object.hasOwn(op, "copy_from") ? op.len : op.hex.length / 2;
const recount = ops => ({
  ops: ops.length,
  hexOps: ops.filter(op => !Object.hasOwn(op, "copy_from")).length,
  copyOps: ops.filter(op => Object.hasOwn(op, "copy_from")).length,
  hexBytes: ops.filter(op => !Object.hasOwn(op, "copy_from")).reduce((sum, op) => sum + lengthOf(op), 0),
  copyBytes: ops.filter(op => Object.hasOwn(op, "copy_from")).reduce((sum, op) => sum + op.len, 0)
});

test("the report covers every vendored patch except index.json", () => {
  const files = loadPatches();
  assert.deepEqual(files.map(file => path.basename(file.relative)).sort(),
    ["705E140_20261113v1.json", "705J140_20261113v1.json", "9700E150_20261113v3.json", "9700E150_trv16c.json"]);
});

test("op counts and byte totals equal a direct recount of the patch JSON", () => {
  const { reports } = analyzeAll();
  const files = loadPatches();
  assert.equal(reports.length, files.length);
  files.forEach(({ patch }, index) => {
    const report = reports[index];
    const sections = [[report.main, patch.ops], ...(patch.bootstrap ? [[report.bootstrap, patch.bootstrap.ops]] : [])];
    for (const [section, ops] of sections) {
      const expected = recount(ops);
      for (const key of Object.keys(expected)) assert.equal(section[key], expected[key], `${patch.name}: ${key}`);
      assert.equal(section.regions.reduce((sum, region) => sum + region.hexBytes, 0), expected.hexBytes, `${patch.name}: region hex bytes`);
      assert.equal(section.regions.reduce((sum, region) => sum + region.copyBytes, 0), expected.copyBytes, `${patch.name}: region copy bytes`);
      assert.equal(section.regions.reduce((sum, region) => sum + region.ops, 0), expected.ops, `${patch.name}: region ops`);
    }
    assert.equal(report.bootstrap === null, !patch.bootstrap);
  });
});

test("regions are sorted, never overlap and stay at least 32 bytes apart", () => {
  for (const report of analyzeAll().reports) {
    for (const section of [report.main, report.bootstrap].filter(Boolean)) {
      section.regions.forEach((region, index) => {
        assert.ok(region.end > region.start, report.name);
        assert.equal(region.size, region.end - region.start);
        if (index) assert.ok(region.start - section.regions[index - 1].end >= MERGE_GAP, `${report.name}: regions too close`);
      });
      assert.ok(section.largest.length <= LARGEST);
      const sizes = section.largest.map(region => region.size);
      assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
      assert.equal(section.blocks.reduce((sum, block) => sum + block.bytes, 0), section.covered);
    }
  }
});

test("the committed analysis documents are up to date in all five languages", () => {
  for (const [relative, text] of Object.entries(generate())) {
    assert.ok(fs.existsSync(path.join(root, relative)), `missing ${relative}; run npm run report:icom`);
    const committed = fs.readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n");
    assert.equal(committed, text, `${relative} is stale; run npm run report:icom`);
  }
  const spanish = fs.readFileSync(path.join(root, "docs/ICOM-PATCH-ANALYSIS.md"), "utf8");
  assert.match(spanish.split(/\r?\n/)[0], /scripts\/icom-patch-report\.cjs/);
});
