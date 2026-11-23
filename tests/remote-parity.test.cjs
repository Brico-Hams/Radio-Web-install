const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCatalog, validateCatalog } = require("../remote-catalog.cjs");
const { FEATURES, loadParity, validateParity, featureStates, isEnabled, resolveRows } = require("../remote-parity.cjs");

const catalog = loadCatalog();
const parity = loadParity();
const profileSource = fs.readFileSync(path.join(__dirname, "..", "android", "app", "src", "main", "java", "org", "bricohams", "radio", "Profile.kt"), "utf8");
const enumBody = profileSource.slice(profileSource.indexOf("enum class ProfileRadio("));
const androidProfiles = [...enumBody.matchAll(/^ {4}([A-Z][A-Z0-9_]*)\((?:RigModel\.[A-Z0-9]+|null),/gm)].map(match => match[1]);
const check = (data = parity, cat = catalog) => validateParity(data, { catalog: cat, androidProfiles });

test("la matriz cubre cada radio del catalogo y cada perfil Android sin problemas", () => {
  assert.ok(androidProfiles.length >= 16, androidProfiles.join(","));
  assert.deepEqual(check(), []);
  const rows = resolveRows(parity);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  for (const row of rows) assert.equal(row.features.length, FEATURES.length, row.id);
});

test("el catalogo incluye Xiegu, Quansheng, TH-D75 y FT-8x7", () => {
  for (const id of ["xiegu-g90", "xiegu-x6100", "xiegu-x6200", "xiegu-x5105", "xiegu-g106", "quansheng-uv-k5", "kenwood-th-d75", "yaesu-ft-817", "yaesu-ft-818", "yaesu-ft-857", "yaesu-ft-897"]) {
    assert.ok(catalog.radios.some(radio => radio.id === id), id);
  }
  // Only numbers already cited in the repository: X6200 = 3091 (third_party audit); the rest stay null.
  assert.equal(catalog.radios.find(radio => radio.id === "xiegu-x6200").hamlibModel, 3091);
  for (const radio of catalog.radios.filter(item => item.hamlibModel === null)) assert.ok(radio.nativeProtocol, radio.id);
});

test("falla si falta una radio del catalogo o un perfil Android", () => {
  const missingRadio = structuredClone(parity);
  missingRadio.rows = missingRadio.rows.filter(row => row.id !== "xiegu-g90");
  assert.ok(check(missingRadio).some(problem => /xiegu-g90.*sin fila/.test(problem)));
  const missingProfile = structuredClone(parity);
  missingProfile.rows = missingProfile.rows.filter(row => row.androidProfile !== "THD75");
  assert.ok(check(missingProfile).some(problem => /THD75/.test(problem)));
});

test("falla si una funcion ok no tiene fuente o la fuente no existe", () => {
  const noSource = structuredClone(parity);
  delete noSource.families["hamlib-tx"].sources.smeter;
  assert.ok(check(noSource).some(problem => /smeter: ok sin fuente/.test(problem)));
  const badSource = structuredClone(parity);
  badSource.families["hamlib-tx"].sources.smeter = ["no-existe.cjs"];
  assert.ok(check(badSource).some(problem => /no-existe\.cjs no existe/.test(problem)));
});

test("falla si un adaptador declara una funcion que la matriz no marca", () => {
  const claims = structuredClone(parity);
  claims.rows.push({ id: "icom-ic-7300", family: "hamlib-tx", features: ["ok", "ok", "pendiente", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"] });
  const rows = claims.rows.filter(row => row.id !== "icom-ic-7300" || row.features);
  claims.rows = rows;
  assert.ok(check(claims).some(problem => /icom-ic-7300\.ptt: el adaptador hamlib/.test(problem)));
});

test("na solo vale para radios sin TX y pendiente exige motivo", () => {
  const na = structuredClone(parity);
  na.rows.find(row => row.id === "icom-ic-7300").features = ["ok", "partial", "na", "ok", "partial", "partial", "ok", "ok", "ok", "ok", "partial", "partial"];
  assert.ok(check(na).some(problem => /icom-ic-7300\.ptt: na solo/.test(problem)));
  const noReason = structuredClone(parity);
  delete noReason.families["xiegu-civ"].reasons.smeter;
  assert.ok(check(noReason).some(problem => /xiegu-g90\.smeter: falta el motivo/.test(problem)));
});

test("un adaptador sin modelo Hamlib no puede usar la familia hamlib", () => {
  const bad = structuredClone(parity);
  bad.rows.find(row => row.id === "xiegu-g90").family = "hamlib-tx";
  assert.ok(check(bad).some(problem => /xiegu-g90: el adaptador hamlib no coincide/.test(problem)));
});

test("sin TX no hay PTT, medidores TX ni tune y el resto sigue activo", () => {
  const states = featureStates(parity, "icom-ic-r8600");
  for (const feature of ["ptt", "txMeters", "tune", "audioTx"]) assert.equal(states[feature].status, "na", feature);
  assert.ok(isEnabled(states.freqMode) && isEnabled(states.smeter));
});

test("las funciones deshabilitadas llevan el motivo para la interfaz", () => {
  const states = featureStates(parity, "xiegu-g90");
  assert.equal(isEnabled(states.ptt), false);
  assert.match(states.ptt.reason, /pendiente de fuente/);
  assert.ok(isEnabled(states.audioRx) && isEnabled(states.rotor));
  assert.equal(featureStates(parity, "no-existe"), null);
});

test("las tablas de docs/REMOTE_STATION.md y sus traducciones salen de la matriz", () => {
  const { TEXT, renderBlock } = require("../scripts/remote-parity-docs.cjs");
  for (const lang of Object.keys(TEXT)) {
    const content = fs.readFileSync(path.join(__dirname, "..", TEXT[lang].file), "utf8").replace(/\r\n/g, "\n");
    assert.ok(content.includes(renderBlock(lang)), `${TEXT[lang].file}: ejecuta node scripts/remote-parity-docs.cjs`);
  }
});

test("el catalogo rechaza hamlibModel null sin nativeProtocol", () => {
  const bad = structuredClone(catalog);
  bad.radios.find(radio => radio.id === "xiegu-g90").nativeProtocol = undefined;
  assert.throws(() => validateCatalog(bad), /nativeProtocol/);
});
