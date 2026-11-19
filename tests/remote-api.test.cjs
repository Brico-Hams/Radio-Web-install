const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { once } = require("node:events");
const { createServer, ALLOWED_FILES, DESKTOP_ONLY_FILES } = require("../server.cjs");
const { createController } = require("../remote-station.cjs");

async function withServer(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remote-api-"));
  const calls = [];
  let running = false;
  const fakeStation = {
    get running() { return running; },
    start: async config => { calls.push(["start", config.radio]); running = true; },
    stop: async () => { calls.push(["stop"]); running = false; },
    status: () => ({ running, starting: false, error: null, rigctld: { mode: "managed", running }, rotctld: null, agent: { running }, links: null })
  };
  const controller = createController({ configDir: dir, station: fakeStation, detect: async () => [{ port: "COM7", vid: "10C4", pid: "EA70", radios: ["yaesu-ftx-1"] }], listDevices: async () => ({ inputs: ["Mic"], outputs: ["Spk"] }) });
  const server = createServer(undefined, undefined, undefined, controller);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.close(); server.closeAllConnections?.(); fs.rmSync(dir, { recursive: true, force: true }); });
  const port = server.address().port;
  const send = (method, url, { body, headers = {}, origin = `http://127.0.0.1:${port}`, host } = {}) => new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const finalHeaders = { ...headers };
    if (origin) finalHeaders.Origin = origin;
    if (host) finalHeaders.Host = host;
    if (payload !== undefined) finalHeaders["Content-Length"] = Buffer.byteLength(payload);
    const request = http.request({ host: "127.0.0.1", port, method, path: url, headers: finalHeaders }, response => {
      let text = "";
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: response.statusCode, json: parsed, text });
      });
    });
    request.on("error", reject);
    request.end(payload);
  });
  return { send, calls, dir, port };
}

const json = { "Content-Type": "application/json" };
const goodConfig = { radio: "yaesu-ftx-1", port: "COM7" };

test("GET /api/remote/status, catalog y ports responden", async t => {
  const { send } = await withServer(t);
  const status = await send("GET", "/api/remote/status", { origin: null });
  assert.equal(status.status, 200);
  assert.equal(status.json.mode, "desktop");
  assert.equal(status.json.running, false);
  const catalog = await send("GET", "/api/remote/catalog", { origin: null });
  assert.ok(catalog.json.radios.some(radio => radio.id === "icom-ic-7300" && radio.hamlibModel === 3073));
  assert.equal((await send("GET", "/api/remote/ports", { origin: null })).json.ports[0].port, "COM7");
  assert.deepEqual((await send("GET", "/api/remote/devices", { origin: null })).json, { inputs: ["Mic"], outputs: ["Spk"] });
  assert.equal((await send("GET", "/api/remote/nada", { origin: null })).status, 404);
});

test("POST exige Origin igual al host, JSON y 4 KB como maximo", async t => {
  const { send } = await withServer(t);
  assert.equal((await send("POST", "/api/remote/config", { body: goodConfig, headers: json, origin: null })).status, 403);
  assert.equal((await send("POST", "/api/remote/config", { body: goodConfig, headers: json, origin: "http://evil.example" })).status, 403);
  assert.equal((await send("POST", "/api/remote/config", { body: goodConfig, headers: { "Content-Type": "text/plain" } })).status, 403);
  const big = await send("POST", "/api/remote/config", { body: { ...goodConfig, relay: { url: "https://r.example.org", station: "abc", secret: "x".repeat(5000) } }, headers: json });
  assert.equal(big.status, 413);
  assert.equal((await send("POST", "/api/remote/config", { body: "{no json", headers: json })).status, 400);
  assert.equal((await send("POST", "/api/remote/config", { body: goodConfig, headers: json, host: "evil.example" })).status, 403);
  const ok = await send("POST", "/api/remote/config", { body: goodConfig, headers: json });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.radio, "yaesu-ftx-1");
});

test("la validacion estricta rechaza campos y valores peligrosos", async t => {
  const { send } = await withServer(t);
  for (const body of [{ radio: "yaesu-ftx-1", port: "COM7", cmd: "calc" }, { radio: "yaesu-ftx-1", port: "COM7 & calc" }, { radio: "x", port: "COM7" }, { radio: "yaesu-ftx-1", port: "/dev/sda" }, []]) {
    const result = await send("POST", "/api/remote/config", { body, headers: json });
    assert.equal(result.status, 400, JSON.stringify(body));
  }
  assert.equal((await send("POST", "/api/remote/config?x=1", { body: goodConfig, headers: json })).status, 400);
  assert.equal((await send("PUT", "/api/remote/config", { body: goodConfig, headers: json })).status, 405);
});

test("start necesita configuracion, arranca y detiene el supervisor inyectado", async t => {
  const { send, calls, dir } = await withServer(t);
  assert.equal((await send("POST", "/api/remote/start", { body: "" })).status, 409);
  await send("POST", "/api/remote/config", { body: { ...goodConfig, relay: { url: "https://relay.example.org", station: "mi-shack", secret: "s3cret" } }, headers: json });
  const file = path.join(dir, "remote-station.json");
  assert.ok(fs.existsSync(file));
  if (process.platform !== "win32") assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal((await send("POST", "/api/remote/start", { body: "hola" })).status, 400);
  const started = await send("POST", "/api/remote/start", { body: "" });
  assert.equal(started.status, 200);
  assert.equal(started.json.running, true);
  assert.equal(started.text.includes("s3cret"), false);
  assert.equal((await send("POST", "/api/remote/config", { body: goodConfig, headers: json })).status, 409);
  const stopped = await send("POST", "/api/remote/stop", { body: "{}" });
  assert.equal(stopped.json.running, false);
  assert.deepEqual(calls.map(call => call[0]), ["start", "stop"]);
});

test("node server.cjs cablea el controlador real (config 200, no 405)", async t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rc-home-"));
  const child = require("node:child_process").spawn(process.execPath, [path.join(__dirname, "..", "server.cjs"), "--port", "0"], {
    env: { ...process.env, HOME: home, USERPROFILE: home }, stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => { child.kill(); fs.rmSync(home, { recursive: true, force: true }); });
  const port = await new Promise((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`sin arranque: ${out}`)), 10000);
    child.stdout.on("data", chunk => {
      out += chunk;
      const match = out.match(/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    child.on("exit", code => reject(new Error(`salio con ${code}: ${out}`)));
  });
  const call = (method, url, body) => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: url, method, headers: body ? { "Content-Type": "application/json", Origin: `http://127.0.0.1:${port}` } : {} }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text || "{}") }));
    });
    req.on("error", reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
  const saved = await call("POST", "/api/remote/config", goodConfig);
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  const status = await call("GET", "/api/remote/status");
  assert.equal(status.json.available, true);
  assert.equal(status.json.config.radio, "yaesu-ftx-1");
  assert.ok(fs.existsSync(path.join(home, ".radicodex")));
});

test("la pagina remoto es solo de escritorio y esta en la lista permitida", () => {
  for (const file of ["remoto.html", "remoto-ui.js", "remoto.css"]) {
    assert.ok(ALLOWED_FILES.includes(file), file);
    assert.ok(DESKTOP_ONLY_FILES.includes(file), file);
    assert.ok(fs.existsSync(path.join(__dirname, "..", file)), file);
  }
  const html = fs.readFileSync(path.join(__dirname, "..", "remoto.html"), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /\sstyle=|\son\w+=/i);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"), /navItem\("remoto\.html"[^)]*DESKTOP_ONLY/);
});
