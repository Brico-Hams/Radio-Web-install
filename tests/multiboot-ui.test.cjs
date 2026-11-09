const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../radio-core.js");
require("../transports.js");
require("../backup-store.js");
require("../quansheng-connector.js");
require("../radio-ui.js");
const rows = require("../ui-translations.js");
const I = require("../ui-i18n.js");
const ui = fs.readFileSync(path.join(__dirname, "..", "radio-ui.js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "precompiled", "catalog.json"), "utf8"));
const MAGIC = 0x31424d46;

test("slot rows: Main is read-only and filled slots expose verify and empty actions", () => {
  const main = R.slotRowModel({ slot: 0, status: 10, magic: 0, size: 0 });
  assert.equal(main.state, "protected");
  assert.deepEqual([main.canInstall, main.canVerify, main.canErase], [false, false, false]);
  const empty = R.slotRowModel({ slot: 1, status: 1, magic: 0, size: 0, name: "", firmware: "" });
  assert.equal(empty.state, "empty");
  assert.deepEqual([empty.name, empty.version, empty.sizeKiB], ["\u2014", "\u2014", "\u2014"]);
  assert.deepEqual([empty.canInstall, empty.canVerify, empty.canErase], [true, false, false]);
  const filled = R.slotRowModel({ slot: 2, status: 0, magic: MAGIC, size: 61440, name: "Fusion", firmware: "v6.1.0" });
  assert.equal(filled.state, "valid");
  assert.deepEqual([filled.name, filled.version, filled.sizeKiB], ["Fusion", "v6.1.0", "60.0"]);
  assert.deepEqual([filled.canInstall, filled.canVerify, filled.canErase], [true, true, true]);
  const bad = R.slotRowModel({ slot: 3, status: 5, magic: MAGIC, size: 2048, name: "X", firmware: "v6" });
  assert.equal(bad.state, "crc");
  assert.equal(bad.canVerify && bad.canErase, true);
});

test("catalog select offers only stable-layout v6.x images that fit a slot for the model", () => {
  const entries = [
    { id: "a", version: "v6.1.0", size: 0x1d800, targets: ["UV-K1", "UV-K5-V3"] },
    { id: "b", version: "v6.1.0", size: 0x1d801, targets: ["UV-K1"] },
    { id: "c", version: "v5.4.0", size: 1000, targets: ["UV-K1"] },
    { id: "d", version: "v6.0.1", size: 1000, targets: ["UV-K5-V3"] }
  ];
  assert.deepEqual(R.slotCatalogEntries(entries, "UV-K1").map(entry => entry.id), ["a"]);
  assert.deepEqual(R.slotCatalogEntries(entries, "UV-K5-V3").map(entry => entry.id), ["a", "d"]);
  const real = R.slotCatalogEntries(catalog.entries, "UV-K1");
  assert.ok(real.length > 0 && real.every(entry => /^v6\./.test(entry.version) && entry.size <= 118 * 1024));
});

test("panel keeps the UV Studio layout, safety prompts and accessible status regions", () => {
  for (const token of ['id="slots-heading"', 'id="slots-refresh"', 'id="slots-body"', 'id="slot-catalog"',
    'id="slot-file"', 'for="slot-file"', 'id="slots-progress"', 'id="slots-status" role="status"',
    'id="slots-boot-help"', '<details class="slots-advanced">', 'id="slot-library-folder"']) {
    assert.ok(ui.includes(token), token);
  }
  assert.equal(ui.includes('id="slot-install"'), false);
  assert.ok(ui.includes("root.confirm(detail)") && /consent\(`Se reemplazara el firmware de la ranura/.test(ui));
  assert.ok(/consent\(`Se borrara el firmware de la ranura/.test(ui));
  assert.ok(ui.includes("canInstall: !main"), "Main never gets an install action");
});

test("new slot strings are translated in en, fr and de", () => {
  for (const locale of ["en-US", "fr", "de"]) {
    for (const label of ["Ranuras de firmware", "Actualizar ranuras", "Instalar aqui", "Verificar CRC", "Vaciar",
      "Vacia", "Error CRC", "o cargar un archivo local", "Elegir archivo", "Archivo de firmware (.bin)"]) {
      assert.notEqual(I.translate(label, locale), label, `${locale}: ${label}`);
    }
    assert.ok(I.translate("Ranura 2 instalada y verificada (CRC 1a2b3c4d).", locale).includes("1a2b3c4d"));
    assert.ok(I.translate("Se instalara Fusion en la ranura 3, actualmente vacia. Main y calibracion no se modifican. No apagues ni desconectes la radio.", locale)
      .includes("Fusion"));
  }
  assert.ok(rows.some(row => row[0].startsWith("Para arrancar esta ranura") && row[1].includes("MENU")));
});
