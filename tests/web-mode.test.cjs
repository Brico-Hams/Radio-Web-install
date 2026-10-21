const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const R = require("../radio-core.js");
require("../runtime-mode.js");
const { createServer } = require("../server.cjs");

test("runtime: local only when server says so", async () => {
  const ok = body => async () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "local" })), { mode: "local" });
  assert.deepEqual(await R.loadRuntime(ok({ mode: "admin" })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("nope", { status: 404 })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => new Response("<html>", { headers: { "content-type": "text/html" } })), { mode: "web" });
  assert.deepEqual(await R.loadRuntime(async () => { throw new TypeError("Failed to fetch"); }), { mode: "web" });
});

test("server serves runtime.json as local", async () => {
  const server = createServer({}, {});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/runtime.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(await response.json(), { mode: "local" });
    assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  } finally {
    server.close();
  }
});

test("app refuses to run framed and paints the mode badge", () => {
  const app = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /window\.top !== window\.self/);
  assert.match(app, /mode-badge/);
  assert.match(app, /Web · GitHub Pages/);
  assert.match(app, /Local · instalado/);
});
