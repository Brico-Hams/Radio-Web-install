const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCatalog, validateCatalog, findRadio } = require("../remote-catalog.cjs");

const catalog = loadCatalog();
const all = [...catalog.radios, ...catalog.rotors, ...catalog.amplifiers];

test("todos los modelos Hamlib son enteros (o null con protocolo nativo) y los ids son unicos", () => {
  for (const item of all) {
    if (item.hamlibModel === null) assert.ok(item.nativeProtocol, item.id);
    else assert.ok(Number.isInteger(item.hamlibModel), item.id);
  }
  assert.equal(new Set(all.map(item => item.id)).size, all.length);
});

test("las radios traen todos los campos obligatorios", () => {
  assert.ok(catalog.radios.length >= 40);
  for (const radio of catalog.radios) {
    for (const key of ["id", "maker", "model", "hamlibModel", "links", "bands", "listen", "transmit", "scope", "remotePowerOn", "status", "serial", "notes_es"]) {
      assert.notEqual(radio[key], undefined, `${radio.id}.${key}`);
    }
    assert.ok(radio.serial.baud >= 0 && Array.isArray(radio.serial.usb), radio.id);
  }
});

test("los numeros Hamlib verificados no cambian", () => {
  const expected = {
    "icom-ic-7300": 3073, "yaesu-ftx-1": 1051, "qrplabs-qmx": 2057, "dl2man-trusdx": 2055,
    "elecraft-k4": 2047, "icom-ic-9700": 3081, "icom-ic-r8600": 3079, "hl2-hermes-lite-2": 2040
  };
  for (const [id, model] of Object.entries(expected)) assert.equal(findRadio(id).hamlibModel, model, id);
  assert.equal(findRadio("icom-ic-r8600").transmit, false);
  for (const radio of catalog.radios.filter(item => item.maker === "FlexRadio")) assert.equal(radio.hamlibModel, 23005, radio.id);
  assert.deepEqual(catalog.rotors.map(item => item.hamlibModel).sort((a, b) => a - b), [403, 405, 406]);
  assert.deepEqual(catalog.amplifiers.map(item => item.hamlibModel).sort((a, b) => a - b), [201, 301, 401]);
});

test("el FTX-1 queda como probado con su CAT en el CP2105 y excluye la interfaz HRI", () => {
  const ftx1 = findRadio("yaesu-ftx-1");
  assert.equal(ftx1.status, "tested");
  assert.equal(ftx1.serial.baud, 38400);
  assert.deepEqual(ftx1.serial.usb, [{ vid: "10C4", pid: "EA70" }]);
  assert.ok(!all.some(item => item.serial?.usb?.some?.(usb => usb.vid === "26AA")));
  assert.equal(findRadio("dl2man-trusdx").serial.openDelayMs, 1500);
});

test("el espectro propio de cada radio, los USB verificados y el encendido remoto", () => {
  const scopes = { "icom-ic-7300": "civ", "flex-flex-6600": "smartsdr", "yaesu-ftx-1": "audio", "qrplabs-qmx": "audio", "dl2man-trusdx": "audio", "hl2-hermes-lite-2": "sdr" };
  for (const [id, scope] of Object.entries(scopes)) assert.equal(findRadio(id).scope, scope, id);
  assert.ok(!/openwebrx/i.test(findRadio("hl2-hermes-lite-2").notes_es));
  const withUsb = catalog.radios.filter(radio => radio.serial.usb.length).map(radio => radio.id).sort();
  assert.deepEqual(withUsb, ["qrplabs-qmx", "quansheng-uv-k5", "yaesu-ftx-1"]);
  assert.deepEqual(findRadio("qrplabs-qmx").serial.usb, [{ vid: "0483", pid: "A34C" }]);
  for (const radio of catalog.radios) assert.equal(radio.remotePowerOn, "unknown", radio.id);
});

test("el validador rechaza modelos no enteros e ids duplicados", () => {
  const bad = structuredClone(catalog);
  bad.radios[0].hamlibModel = "3073";
  assert.throws(() => validateCatalog(bad), /hamlibModel/);
  const dup = structuredClone(catalog);
  dup.radios[1].id = dup.radios[0].id;
  assert.throws(() => validateCatalog(dup), /duplicado/);
});
