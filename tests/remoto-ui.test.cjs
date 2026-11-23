const test = require("node:test");
const assert = require("node:assert/strict");
const { radioDefaults, parityView, show, createApi, saveConfig, startStation, stopStation } = require("../remoto-ui.js");

test("start/stop/config usan POST y start guarda la config antes", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body });
    return { ok: true, json: async () => ({}) };
  };
  const api = createApi(() => "");
  await saveConfig(api, { radio: "x" });
  await startStation(api, { radio: "x" });
  await stopStation(api);
  await api("status");
  assert.deepEqual(calls.map(call => `${call.method} ${call.url}`), [
    "POST api/remote/config", "POST api/remote/config", "POST api/remote/start", "POST api/remote/stop", "GET api/remote/status"
  ]);
  assert.equal(calls[2].body, "{}");
  assert.equal(calls[3].body, "{}");
});

test("start no arranca si guardar la config falla", async () => {
  const calls = [];
  global.fetch = async url => {
    calls.push(url);
    return { ok: false, status: 400, json: async () => ({ error: "Config invalida" }) };
  };
  await assert.rejects(startStation(createApi(() => ""), {}), /Config invalida/);
  assert.deepEqual(calls, ["api/remote/config"]);
});
const catalog = require("../data/remote-station-catalog.json");

test("radioDefaults toma baud y enlaces de la entrada del catalogo", () => {
  const ftx1 = catalog.radios.find(radio => radio.id === "yaesu-ftx-1");
  const defaults = radioDefaults(ftx1);
  assert.equal(defaults.baud, 38400);
  assert.equal(defaults.link, "usb");
  assert.deepEqual(defaults.links.map(option => option.value), ["usb"]);

  const lan = radioDefaults({ links: ["lan", "wifi"], serial: { baud: 9600 } });
  assert.deepEqual(lan.links.map(option => option.value), ["lan"]);
  assert.equal(lan.link, "lan");
  assert.equal(lan.baud, null);
  assert.deepEqual(radioDefaults(null), { links: [], link: "usb", baud: null });
});

test("parityView lista todas las funciones y deshabilita con motivo las que la radio no puede", () => {
  const parity = require("../data/remote-feature-parity.json");
  const g90 = parityView(parity, "xiegu-g90");
  assert.equal(g90.length, parity.featureOrder.length);
  const ptt = g90.find(item => item.feature === "ptt");
  assert.equal(ptt.enabled, false);
  assert.match(ptt.reason, /pendiente de fuente/);
  assert.equal(g90.find(item => item.feature === "audioRx").enabled, true);
  assert.deepEqual(parityView(parity, "no-existe"), []);
});

test("show nunca imprime null ni undefined", () => {
  assert.equal(show(null), "—");
  assert.equal(show(undefined), "—");
  assert.equal(show(0), "0");
});
