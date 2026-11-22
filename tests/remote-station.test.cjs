const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const { stationURL } = require("../station-ui.js");
const station = require("../remote-station.cjs");
const { loadCatalog } = require("../remote-catalog.cjs");

const catalog = loadCatalog();

// Part 1: Python remote station portal page (station.html / station-ui.js).

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

// Part 2: rigctld remote shack supervisor (remote-station.cjs).
const WINDOWS_PNP = JSON.stringify([
  { Name: "Silicon Labs Dual CP210x USB to UART Bridge: Enhanced COM Port (COM7)", PNPDeviceID: "USB\\VID_10C4&PID_EA70&MI_00\\8&2A1B3C4D&0&0000" },
  { Name: "Silicon Labs Dual CP210x USB to UART Bridge: Standard COM Port (COM8)", PNPDeviceID: "USB\\VID_10C4&PID_EA70&MI_01\\8&2A1B3C4D&0&0001" },
  { Name: "USB Serial Device (COM12)", PNPDeviceID: "USB\\VID_26AA&PID_0030\\5&1234ABCD&0&1" },
  { Name: "Communications Port (COM1)", PNPDeviceID: "ACPI\\PNP0501\\0" }
]);

const BY_ID_LISTING = `total 0
lrwxrwxrwx 1 root root 13 Jan  5 10:00 usb-Silicon_Labs_CP2105_Dual_USB_to_UART_Bridge_Controller_0123-if00-port0 -> ../../ttyUSB0
lrwxrwxrwx 1 root root 13 Jan  5 10:00 usb-Silicon_Labs_CP2105_Dual_USB_to_UART_Bridge_Controller_0123-if01-port0 -> ../../ttyUSB1
lrwxrwxrwx 1 root root 13 Jan  5 10:00 usb-QRP_Labs_QMX_0001-if00 -> ../../ttyACM0
lrwxrwxrwx 1 root root 13 Jan  5 10:00 usb-weird;name-if00 -> ../../ttyUSB9`;

test("valida nombres de puerto y direcciones de red", () => {
  for (const ok of ["COM3", "COM127", "/dev/ttyUSB0", "/dev/ttyACM12", "/dev/serial/by-id/usb-QRP_Labs_QMX_0001-if00"]) assert.ok(station.isValidPort(ok), ok);
  for (const bad of ["COM1234", "COM", "com3", "/dev/ttyS0", "/dev/ttyUSB0; rm -rf /", "../dev/ttyUSB0", "/dev/serial/by-id/../../sda", "-r", "", null, 3]) assert.ok(!station.isValidPort(bad), String(bad));
  assert.ok(station.isValidNetAddress("192.168.1.20:4533"));
  assert.ok(!station.isValidNetAddress("host:0") && !station.isValidNetAddress("host") && !station.isValidNetAddress("a b:1"));
});

test("interpreta la salida PnP de Windows con COM y VID/PID", () => {
  const ports = station.parseWindowsPnp(WINDOWS_PNP);
  assert.deepEqual(ports.map(port => [port.port, port.vid, port.pid, port.iface]), [["COM7", "10C4", "EA70", 0], ["COM8", "10C4", "EA70", 1], ["COM12", "26AA", "0030", null]]);
  assert.deepEqual(station.parseWindowsPnp(""), []);
  assert.deepEqual(station.parseWindowsPnp("no es json"), []);
  assert.equal(station.parseWindowsPnp(JSON.stringify({ Name: "USB Serial (COM4)", PNPDeviceID: "USB\\VID_0483&PID_A34C\\1" }))[0].port, "COM4");
});

test("interpreta /dev/serial/by-id y descarta nombres peligrosos", () => {
  const links = station.parseByIdListing(BY_ID_LISTING);
  assert.deepEqual(links.map(link => [link.tty, link.iface]), [["ttyUSB0", 0], ["ttyUSB1", 1], ["ttyACM0", 0]]);
  assert.ok(links[0].byId.startsWith("/dev/serial/by-id/usb-Silicon_Labs_CP2105"));
  assert.ok(links.every(link => station.isValidPort(link.byId)));
});

test("lee idVendor/idProduct de sysfs sin abrir puertos y marca la interfaz HRI como no CAT", () => {
  const files = { "/sys/devices/usb1/1-1/idVendor": "10c4\n", "/sys/devices/usb1/1-1/idProduct": "ea70\n" };
  const fsImpl = {
    realpathSync: file => {
      if (file === "/sys/class/tty/ttyUSB0/device") return "/sys/devices/usb1/1-1/1-1:1.0/ttyUSB0";
      throw new Error("ENOENT");
    },
    readFileSync: file => { if (file in files) return files[file]; throw new Error("ENOENT"); },
    readdirSync: dir => (dir === "/dev/serial/by-id" ? ["usb-CP2105-if00-port0"] : dir === "/sys/class/tty" ? ["ttyUSB0", "tty0"] : []),
    readlinkSync: () => "../../ttyUSB0"
  };
  assert.deepEqual(station.readSysfsIds("ttyUSB0", fsImpl), { vid: "10C4", pid: "EA70" });
  const ports = station.annotatePorts(station.listLinuxPorts(fsImpl), catalog);
  assert.equal(ports.length, 1);
  assert.ok(ports[0].radios.includes("yaesu-ftx-1"));
  const hri = station.annotatePorts([{ port: "COM9", vid: "26AA", pid: "0030", name: "x", iface: null }], catalog)[0];
  assert.ok(hri.nonCat);
  assert.deepEqual(hri.radios, []);
  assert.equal(station.annotatePorts(station.parseWindowsPnp(WINDOWS_PNP), catalog)[0].preferred, true);
});

test("localiza rigctld en PATH, en Hamlib de Windows y en /usr/bin", () => {
  const exists = set => ({
    statSync: file => { if (set.includes(file)) return { isFile: () => true }; throw new Error("ENOENT"); },
    readdirSync: () => ["hamlib-w64-4.7.2", "Other"]
  });
  assert.equal(station.findHamlibBinary("rigctld", { platform: "linux", env: { PATH: "/opt/x:/usr/local/bin" }, fsImpl: exists(["/usr/local/bin/rigctld"]) }), "/usr/local/bin/rigctld");
  assert.equal(station.findHamlibBinary("rigctld", { platform: "linux", env: { PATH: "" }, fsImpl: exists(["/usr/bin/rigctld"]) }), "/usr/bin/rigctld");
  const win = station.findHamlibBinary("rotctld", { platform: "win32", env: { PATH: "C:\\Windows", ProgramFiles: "C:\\Program Files" }, fsImpl: exists(["C:\\Program Files\\hamlib-w64-4.7.2\\bin\\rotctld.exe"]) });
  assert.equal(win, "C:\\Program Files\\hamlib-w64-4.7.2\\bin\\rotctld.exe");
  assert.equal(station.findHamlibBinary("rigctld", { platform: "linux", env: { PATH: "" }, fsImpl: exists([]) }), null);
  assert.throws(() => station.findHamlibBinary("bash"));
});

test("validateConfig acepta una configuracion correcta y rechaza el resto", () => {
  const ok = station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", baud: 38400, listen: "lan", relay: { url: "https://relay.example.org", station: "mi-shack", secret: "abc" } }, catalog);
  assert.equal(ok.link, "usb");
  assert.equal(ok.relay.secret, "abc");
  const bad = [
    {}, { radio: "no-existe", port: "COM7" }, { radio: "yaesu-ftx-1" }, { radio: "yaesu-ftx-1", port: "COM7; calc" },
    { radio: "yaesu-ftx-1", port: "COM7", extra: 1 }, { radio: "yaesu-ftx-1", port: "COM7", baud: "38400" },
    { radio: "yaesu-ftx-1", port: "COM7", listen: "wan" }, { radio: "yaesu-ftx-1", port: "COM7", relay: { url: "http://relay.example.org", station: "mi-shack" } },
    { radio: "yaesu-ftx-1", port: "COM7", relay: { url: "https://relay.example.org", station: "A" } },
    { radio: "yaesu-ftx-1", port: "COM7", rotor: { id: "hygain-dcu-1", port: "/etc/passwd" } },
    { radio: "yaesu-ftx-1", port: "COM7", agentPort: 4532 }, { radio: "yaesu-ftx-1", link: "lan", netAddress: "h:1" }
  ];
  for (const input of bad) assert.throws(() => station.validateConfig(input, catalog), /./, JSON.stringify(input));
  assert.equal(station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", tunerKind: "atas" }, catalog).tunerKind, "atas");
  assert.equal(station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", tunerKind: "internal" }, catalog).tunerKind, "internal");
  for (const tunerKind of ["manual", "", 1, null]) assert.throws(() => station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", tunerKind }, catalog), /Sintonizador/);
  assert.throws(() => station.validateConfig(JSON.parse('{"radio":"yaesu-ftx-1","port":"COM7","__proto__":{"x":1}}'), catalog));
});

test("buildPlan arma rigctld -m/-r/-s/-t 4532 y rotctld -t 4533 con arrays de argumentos", () => {
  const find = name => `/usr/bin/${name}`;
  const config = station.validateConfig({ radio: "yaesu-ftx-1", port: "/dev/ttyUSB0", rotor: { id: "hygain-dcu-1", port: "/dev/ttyUSB1" } }, catalog);
  const plan = station.buildPlan(config, { catalog, find });
  assert.equal(plan.rig.command, "/usr/bin/rigctld");
  assert.deepEqual(plan.rig.args.slice(0, 6), ["-m", "1051", "-r", "/dev/ttyUSB0", "-s", "38400"]);
  assert.deepEqual(plan.rig.args.slice(-2), ["-t", "4532"]);
  assert.deepEqual(plan.rotor.args.slice(0, 2), ["-m", "403"]);
  assert.deepEqual(plan.rotor.args.slice(-2), ["-t", "4533"]);
  const qmx = station.buildPlan(station.validateConfig({ radio: "qrplabs-qmx", port: "COM5" }, catalog), { catalog, find });
  assert.ok(qmx.rig.args.includes("--set-conf=dtr_state=OFF,rts_state=OFF"));
  assert.equal(station.buildPlan(station.validateConfig({ radio: "dl2man-trusdx", port: "COM5" }, catalog), { catalog, find }).openDelayMs, 1500);
  assert.throws(() => station.buildPlan(config, { catalog, find: () => null }), /rigctld/);
});

test("Icom por LAN usa wfview directamente sin lanzar rigctld", () => {
  const config = station.validateConfig({ radio: "icom-ic-9700", link: "lan", netAddress: "192.168.1.50:4533" }, catalog);
  const plan = station.buildPlan(config, { catalog, find: () => { throw new Error("no debe buscar rigctld"); } });
  assert.equal(plan.rig, null);
  assert.deepEqual(plan.agent, { rigctldHost: "192.168.1.50", rigctldPort: 4533 });
});

function fakeSpawn() {
  const calls = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.pid = 1000 + calls.length;
    child.killed = [];
    child.kill = signal => { child.killed.push(signal); setImmediate(() => child.emit("exit", null, signal || "SIGTERM")); };
    calls.push({ command, args, options, child });
    return child;
  };
  return { spawn, calls };
}

function fakeAgent() {
  const agents = [];
  const createAgent = options => {
    const agent = {
      options, closed: false, token: "tok", tls: Boolean(options.tls), fingerprint: "ab:cd",
      start: async () => {}, close: async () => { agent.closed = true; },
      snapshot: () => ({ connected: true, relay: { configured: false, connected: false } }), relayLinks: () => null
    };
    agents.push(agent);
    return agent;
  };
  return { createAgent, agents };
}

const makeStation = (extra = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "station-"));
  const { spawn, calls } = fakeSpawn();
  const sup = station.createStation({ spawn, findBinary: name => `/usr/bin/${name}`, sleep: async () => {}, configDir: dir, catalog, backoffMinMs: 5, backoffMaxMs: 20, ...extra });
  return { sup, calls, dir };
};

test("el supervisor lanza hamlib sin shell, arranca el agente y lo detiene limpiamente", async () => {
  const { createAgent, agents } = fakeAgent();
  const { sup, calls, dir } = makeStation({ createAgent });
  await sup.start(station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", rotor: { id: "hygain-dcu-1", port: "COM8" } }, catalog));
  assert.deepEqual(calls.map(call => call.command), ["/usr/bin/rigctld", "/usr/bin/rotctld"]);
  for (const call of calls) { assert.ok(Array.isArray(call.args)); assert.equal(call.options.shell, false); }
  assert.equal(agents[0].options.rigctldPort, 4532);
  assert.equal(agents[0].options.host, "127.0.0.1");
  const status = sup.status();
  assert.equal(status.running, true);
  assert.equal(status.rigctld.running, true);
  await assert.rejects(() => sup.start({}), /ya esta en marcha/);
  await sup.stop();
  assert.equal(agents[0].closed, true);
  assert.ok(calls.every(call => call.child.killed.length >= 1));
  assert.equal(sup.status().running, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("si rigctld termina se reinicia con espera y al detener no vuelve", async () => {
  const { createAgent } = fakeAgent();
  const { sup, calls, dir } = makeStation({ createAgent });
  await sup.start(station.validateConfig({ radio: "icom-ic-7300", port: "/dev/ttyUSB0" }, catalog));
  calls[0].child.emit("exit", 1, null);
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(calls.length, 2);
  await sup.stop();
  const total = calls.length;
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(calls.length, total);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("si el agente falla al arrancar se limpian los procesos y se informa el error", async () => {
  const createAgent = () => ({ start: async () => { throw new Error("puerto ocupado"); }, close: async () => {} });
  const { sup, calls, dir } = makeStation({ createAgent });
  await assert.rejects(() => sup.start(station.validateConfig({ radio: "icom-ic-7300", port: "COM3" }, catalog)), /puerto ocupado/);
  assert.equal(sup.status().running, false);
  assert.equal(sup.status().error, "puerto ocupado");
  assert.ok(calls[0].child.killed.length >= 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("la configuracion se guarda con permisos 0600 y sin exponer el secreto", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "station-"));
  const config = station.validateConfig({ radio: "yaesu-ftx-1", port: "COM7", relay: { url: "https://relay.example.org", station: "mi-shack", secret: "s3cret" } }, catalog);
  station.writeStationConfig(dir, config);
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(dir, "remote-station.json")).mode & 0o777, 0o600);
  assert.equal(station.loadStationConfig(dir, catalog).relay.secret, "s3cret");
  const redacted = station.redactConfig(config);
  assert.equal(JSON.stringify(redacted).includes("s3cret"), false);
  assert.equal(redacted.relay.hasSecret, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("el PIN de configuracion se bloquea tras cinco fallos y los argumentos headless se validan", () => {
  let now = 0;
  const authorize = station.pinAuthorizer("12345678", () => now);
  assert.equal(authorize({ headers: { "x-setup-pin": "12345678" } }), null);
  for (let i = 0; i < 5; i += 1) assert.equal(authorize({ headers: { "x-setup-pin": "00000000" } }).status, 401);
  assert.equal(authorize({ headers: { "x-setup-pin": "12345678" } }).status, 429);
  now = 61_000;
  assert.equal(authorize({ headers: { "x-setup-pin": "12345678" } }), null);
  assert.match(station.generatePin(), /^\d{8}$/);
  assert.equal(station.parseHeadlessArgs(["--headless"]).setupPort, 8073);
  assert.throws(() => station.parseHeadlessArgs(["--headless", "--evil"]));
});
