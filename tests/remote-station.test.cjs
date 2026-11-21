const assert = require("node:assert/strict");
const { test } = require("node:test");
const { stationURL } = require("../station-ui.js");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("station entry validates HTTPS without exposing tokens or accepting paths", () => {
  assert.equal(stationURL("https://station.example.org:8787/"), "https://station.example.org:8787/");
  for (const value of ["http://127.0.0.1:8787", "https://user:token@station", "https://station/api",
    "https://station?token=secret", "https://station#secret", " https://station", "//station"]) {
    assert.throws(() => stationURL(value));
  }
});

test("station entry makes no network/storage calls and invalidates a stale prepared link", () => {
  const nodes = Object.fromEntries(["connect", "host", "status", "open"].map(name => [name, {
    hidden: true, textContent: "", listeners: {},
    addEventListener(event, listener) { this.listeners[event] = listener; },
    removeAttribute(name) { delete this[name]; }
  }]));
  const context = {
    URL,
    document: { getElementById(id) { return nodes[id.replace("station-", "")]; } },
    fetch() { assert.fail("No fetch from the portal"); },
    localStorage: { setItem() { assert.fail("No station data persisted"); } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../station-ui.js"), "utf8"), context);
  context.RadioWorkspace.mountStationUI();
  nodes.host.value = "https://station.example.org:8787";
  nodes.connect.listeners.submit({ preventDefault() {} });
  assert.equal(nodes.open.href, "https://station.example.org:8787/");
  assert.equal(nodes.open.hidden, false);
  nodes.host.listeners.input();
  assert.equal(nodes.open.hidden, true);
  assert.equal(nodes.open.href, undefined);
  nodes.host.value = "https://user:secret@station.example.org";
  nodes.connect.listeners.submit({ preventDefault() {} });
  assert.equal(nodes.open.hidden, true);
  assert.equal(nodes.open.href, undefined);
  assert.match(nodes.status.textContent, /sin credenciales/);
});

test("station pages are served without exposing firmware APIs or opening cross-origin microphone access", async t => {
  const { createServer } = require("../server.cjs");
  const { once } = require("node:events");
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of ["station.html", "station-ui.js"]) {
    const response = await fetch(`${base}/${file}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("permissions-policy"), /microphone=\(\)/);
    assert.equal((await fetch(`${base}/${file}`, { method: "POST" })).status, 405);
  }
});
