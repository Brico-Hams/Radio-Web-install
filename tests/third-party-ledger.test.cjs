"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ALLOWED = ["MIT", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "LGPL-2.1-or-later", "LGPL-3.0-or-later",
  "GPL-2.0-or-later", "GPL-3.0-only", "GPL-3.0-or-later"];
const ledger = fs.readFileSync(path.join(__dirname, "..", "docs", "THIRD-PARTY-REUSE.md"), "utf8");

function adaptedRows(text) {
  const section = text.split(/^## Adapted files\s*$/m)[1];
  assert.ok(section, "adapted files section");
  const lines = section.split(/^## /m)[0].split("\n").filter(line => line.trim().startsWith("|"));
  assert.ok(lines.length >= 2, "adapted files table header");
  const header = lines[0].split("|").slice(1, -1).map(cell => cell.trim());
  const licence = header.indexOf("Licence");
  assert.ok(licence >= 0, "Licence column");
  return lines.slice(2).map(line => line.split("|").slice(1, -1).map(cell => cell.trim())).map(cells => ({ cells, licence: cells[licence] }));
}

test("the ledger exists with its policy sections", () => {
  for (const heading of ["## Policy", "## Collection repositories", "## Adapted files", "## Engineering method for new radios"]) {
    assert.ok(ledger.includes(heading), heading);
  }
  assert.ok(/GPL-3\.0-or-later/.test(ledger));
});

test("every adapted file names an allowed licence", () => {
  for (const row of adaptedRows(ledger)) {
    assert.ok(ALLOWED.includes(row.licence), `licence not allowed: ${row.licence}`);
    assert.ok(row.cells.every(Boolean), `incomplete row: ${row.cells.join("|")}`);
  }
});

test("the adapted files check rejects disallowed or missing licences", () => {
  const fake = licence => `## Adapted files\n\n| Repo | Upstream file | Local file | Licence | Changes |\n|---|---|---|---|---|\n| r | a.c | b.js | ${licence} | x |\n`;
  assert.equal(adaptedRows(fake("MIT"))[0].licence, "MIT");
  assert.ok(!ALLOWED.includes(adaptedRows(fake("PolyForm-Noncommercial-1.0.0"))[0].licence));
  assert.ok(!ALLOWED.includes(adaptedRows(fake("GPL-2.0-only"))[0].licence));
});

test("collection rows are classed REUSE only with an allowed licence", () => {
  const section = ledger.split(/^## Collection repositories\s*$/m)[1].split(/^## /m)[0];
  const rows = section.split("\n").filter(line => line.startsWith("|")).slice(2).map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
  assert.ok(rows.length >= 15);
  for (const [repo, licence, klass] of rows) {
    assert.ok(["REUSE", "FACTS"].includes(klass), `${repo}: class`);
    if (klass === "REUSE") assert.ok(/MIT|BSD|Apache-2\.0|LGPL|GPL-3\.0/.test(licence), `${repo}: ${licence}`);
    if (/PolyForm|Baofeng|AGPL|No licence|To verify/.test(licence)) assert.equal(klass, "FACTS", repo);
  }
});
