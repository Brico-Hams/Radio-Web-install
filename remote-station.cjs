"use strict";
// Station supervisor shared by the desktop app (server.cjs /api/remote/*) and the Raspberry Pi headless mode.
// It finds and supervises Hamlib rigctld/rotctld, detects USB radios without opening any port and runs the remote agent.
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const { loadCatalog, findRadio, findRotor, catAllowList, TUNER_KINDS } = require("./remote-catalog.cjs");
const { loadParity } = require("./remote-parity.cjs");
const { RigctldClient, stopSequence } = require("./rigctld-client.cjs");

const RIGCTLD_PORT = 4532;
const ROTCTLD_PORT = 4533;
const DEFAULT_AGENT_PORT = 8788;
const SETUP_PORT = 8073;
const BODY_LIMIT = 4096;
const CONFIG_FILE = "remote-station.json";
const PORT_PATTERN = /^(?:COM\d{1,3}|\/dev\/(?:tty(?:USB|ACM)\d+|serial\/by-id\/[\w.:-]+))$/;
const NET_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?:\d{1,5}$/;
const RELAY_STATION = /^[a-z0-9-]{3,32}$/;
const NON_CAT = Object.freeze([{ vid: "26AA", pid: "0030", label: "YAESU HRI USB I/F" }]);
const WINDOWS_PNP_COMMAND = "Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match '\\(COM\\d+\\)' } | Select-Object Name,PNPDeviceID | ConvertTo-Json -Compress";

const defaultConfigDir = () => path.join(os.homedir(), ".radicodex");
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

function isValidPort(name) { return typeof name === "string" && PORT_PATTERN.test(name); }
function isValidNetAddress(value) {
  if (typeof value !== "string" || !NET_PATTERN.test(value)) return false;
  const port = Number(value.slice(value.lastIndexOf(":") + 1));
  return port >= 1 && port <= 65535;
}

// ---- Hamlib binaries ----
function hamlibDirs(platform, env, fsImpl) {
  const win = platform === "win32";
  const p = win ? path.win32 : path.posix;
  const dirs = (env.PATH || env.Path || "").split(win ? ";" : ":").filter(Boolean);
  if (win) {
    const bases = [env.ProgramFiles, env["ProgramFiles(x86)"], "C:\\Program Files"].filter(Boolean);
    for (const base of new Set(bases)) {
      let entries = [];
      try { entries = fsImpl.readdirSync(base); } catch { /* base folder missing */ }
      for (const entry of entries) if (/^hamlib/i.test(entry)) dirs.push(p.join(base, entry, "bin"));
    }
  } else {
    dirs.push("/usr/bin", "/usr/local/bin");
  }
  return dirs;
}

function findHamlibBinary(name, { platform = process.platform, env = process.env, fsImpl = fs } = {}) {
  if (!/^(?:rigctld|rotctld)$/.test(name)) throw new Error("Binario Hamlib no admitido.");
  const p = platform === "win32" ? path.win32 : path.posix;
  const file = platform === "win32" ? `${name}.exe` : name;
  for (const dir of hamlibDirs(platform, env, fsImpl)) {
    const candidate = p.join(dir, file);
    try { if (fsImpl.statSync(candidate).isFile()) return candidate; } catch { /* keep looking */ }
  }
  return null;
}

// ---- Serial detection (parsers are pure; nothing ever opens a port) ----
function parseWindowsPnp(text) {
  let data;
  try { data = JSON.parse(String(text).replace(/^\uFEFF/, "").trim() || "[]"); } catch { return []; }
  const ports = [];
  for (const item of Array.isArray(data) ? data : [data]) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.Name || "");
    const id = String(item.PNPDeviceID || "");
    const com = /\((COM\d{1,3})\)/.exec(name);
    const usb = /VID_([0-9A-F]{4})&PID_([0-9A-F]{4})/i.exec(id);
    if (!com || !usb) continue;
    const iface = /&MI_(\d{2})/i.exec(id);
    ports.push({ port: com[1], vid: usb[1].toUpperCase(), pid: usb[2].toUpperCase(), name, iface: iface ? Number(iface[1]) : null });
  }
  return ports;
}

// entries: [{ name, target }] as read from /dev/serial/by-id (name) and its symlink target.
function parseByIdLinks(entries) {
  const result = [];
  for (const { name, target } of entries) {
    const tty = /(tty(?:USB|ACM)\d+)$/.exec(String(target));
    if (!tty || !/^[\w.:-]+$/.test(name)) continue;
    const iface = /-if(\d{2})(?:-|$)/.exec(name);
    result.push({ byId: `/dev/serial/by-id/${name}`, tty: tty[1], iface: iface ? Number(iface[1]) : null });
  }
  return result;
}

// Text of `ls -l /dev/serial/by-id`.
function parseByIdListing(text) {
  const entries = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = /\s(usb-[\w.:-]+)\s+->\s+(\S+)\s*$/.exec(line);
    if (match) entries.push({ name: match[1], target: match[2] });
  }
  return parseByIdLinks(entries);
}

function readSysfsIds(tty, fsImpl = fs) {
  const read = file => { try { return fsImpl.readFileSync(file, "utf8").trim(); } catch { return ""; } };
  let dir;
  try { dir = fsImpl.realpathSync(`/sys/class/tty/${tty}/device`); } catch { return null; }
  for (let level = 0; level < 4 && dir && dir !== "/"; level += 1) {
    const vid = read(`${dir}/idVendor`);
    const pid = read(`${dir}/idProduct`);
    if (/^[0-9a-f]{4}$/i.test(vid) && /^[0-9a-f]{4}$/i.test(pid)) return { vid: vid.toUpperCase(), pid: pid.toUpperCase() };
    dir = path.posix.dirname(dir);
  }
  return null;
}

function listLinuxPorts(fsImpl = fs) {
  let links = [];
  try {
    const dir = "/dev/serial/by-id";
    links = parseByIdLinks(fsImpl.readdirSync(dir).map(name => {
      let target = "";
      try { target = fsImpl.readlinkSync(`${dir}/${name}`); } catch { /* dangling */ }
      return { name, target };
    }));
  } catch { /* no USB serial devices */ }
  const known = new Set(links.map(link => link.tty));
  let ttys = [];
  try { ttys = fsImpl.readdirSync("/sys/class/tty").filter(name => /^tty(?:USB|ACM)\d+$/.test(name) && !known.has(name)); } catch { /* no sysfs */ }
  const all = [...links, ...ttys.map(tty => ({ byId: null, tty, iface: null }))];
  const ports = [];
  for (const entry of all) {
    const ids = readSysfsIds(entry.tty, fsImpl);
    if (!ids) continue;
    ports.push({ port: entry.byId || `/dev/${entry.tty}`, ...ids, name: entry.byId ? path.posix.basename(entry.byId) : entry.tty, iface: entry.iface });
  }
  return ports;
}

function annotatePorts(ports, catalog) {
  return ports.map(port => {
    const nonCat = NON_CAT.find(item => item.vid === port.vid && item.pid === port.pid);
    const radios = nonCat ? [] : catalog.radios.filter(radio => radio.serial.usb.some(usb => usb.vid === port.vid && usb.pid === port.pid)).map(radio => radio.id);
    return { ...port, radios, nonCat: nonCat ? nonCat.label : null, preferred: !nonCat && (/enhanced/i.test(port.name) || port.iface === 0) };
  });
}

function runCommand(command, args, { spawn = childProcess.spawn, timeoutMs = 15_000 } = {}) {
  return new Promise((resolve, reject) => {
    let output = "";
    let child;
    try { child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"], windowsHide: true, shell: false }); } catch (error) { reject(error); return; }
    const timer = setTimeout(() => { child.kill(); reject(new Error("La deteccion de puertos tardo demasiado.")); }, timeoutMs);
    child.stdout.on("data", chunk => { if (output.length < 1_000_000) output += chunk; });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("close", () => { clearTimeout(timer); resolve(output); });
  });
}

async function detectPorts({ platform = process.platform, run = runCommand, fsImpl = fs, catalog = loadCatalog() } = {}) {
  let ports = [];
  if (platform === "win32") {
    ports = parseWindowsPnp(await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PNP_COMMAND]));
  } else if (platform === "linux") {
    ports = listLinuxPorts(fsImpl);
  }
  return annotatePorts(ports, catalog);
}

// ---- Configuration ----
function validateRelay(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw fail("Rele no valido.");
  for (const key of Object.keys(value)) if (!["url", "station", "secret"].includes(key)) throw fail(`Campo de rele no admitido: ${key}`);
  let url;
  try { url = new URL(String(value.url)); } catch { throw fail("La URL del rele no es valida."); }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const loopback = host === "localhost" || host === "::1" || /^127\./.test(host);
  if (!(url.protocol === "https:" || (url.protocol === "http:" && loopback)) || url.username || url.password) throw fail("El rele debe usar https.");
  if (typeof value.station !== "string" || !RELAY_STATION.test(value.station)) throw fail("Estacion de rele no valida (3-32 letras minusculas, cifras o guiones).");
  const secret = value.secret === undefined || value.secret === null ? "" : value.secret;
  if (typeof secret !== "string" || secret.length > 256 || /[\s\u0000-\u001f]/.test(secret)) throw fail("Secreto de rele no valido.");
  return { url: url.href.replace(/\/+$/, ""), station: value.station, secret };
}

const AUDIO_DEVICE = /^[^\u0000-\u001f\u007f"'`]{0,128}$/;

function validateAudio(value) {
  if (value === null || value === undefined) return { input: "", output: "" };
  if (typeof value !== "object" || Array.isArray(value)) throw fail("Audio no valido.");
  for (const key of Object.keys(value)) if (!["input", "output"].includes(key)) throw fail(`Campo de audio no admitido: ${key}`);
  const audio = {};
  for (const key of ["input", "output"]) {
    const device = value[key] === undefined || value[key] === null ? "" : value[key];
    if (typeof device !== "string" || !AUDIO_DEVICE.test(device)) throw fail("Nombre de dispositivo de audio no valido (maximo 128 caracteres, sin comillas ni saltos de linea).");
    audio[key] = device.trim();
  }
  return audio;
}

const CONFIG_KEYS = ["radio", "link", "port", "baud", "netAddress", "rotor", "relay", "listen", "agentPort", "audio", "tunerKind"];

// Returns the normalised configuration or throws an error with status 400. Unknown keys are rejected.
function validateConfig(input, catalog = loadCatalog()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw fail("Configuracion no valida.");
  for (const key of Object.keys(input)) if (!CONFIG_KEYS.includes(key)) throw fail(`Campo no admitido: ${key}`);
  const radio = typeof input.radio === "string" ? findRadio(input.radio, catalog) : null;
  if (!radio) throw fail("Radio desconocida.");
  const link = input.link === undefined ? radio.links[0] : input.link;
  if (link !== "usb" && link !== "lan") throw fail("Enlace no valido (usb o lan).");
  if (link === "usb" && !radio.links.includes("usb")) throw fail("Esta radio no tiene enlace USB.");
  if (link === "lan" && !radio.links.some(item => item === "lan" || item === "wifi")) throw fail("Esta radio no tiene enlace de red.");
  const config = { radio: radio.id, link, listen: "local", agentPort: DEFAULT_AGENT_PORT, rotor: null, relay: null };
  if (link === "usb") {
    if (!isValidPort(input.port)) throw fail("Puerto serie no valido (COMn o /dev/ttyUSBn, /dev/ttyACMn, /dev/serial/by-id/...).");
    config.port = input.port;
    if (input.baud !== undefined) {
      if (!Number.isInteger(input.baud) || input.baud < 300 || input.baud > 4_000_000) throw fail("Velocidad no valida.");
      config.baud = input.baud;
    }
    if (input.netAddress !== undefined) throw fail("netAddress solo se usa con enlace de red.");
  } else {
    if (!isValidNetAddress(input.netAddress)) throw fail("Direccion de red no valida (equipo:puerto).");
    config.netAddress = input.netAddress;
    if (input.port !== undefined || input.baud !== undefined) throw fail("port y baud solo se usan con enlace USB.");
  }
  if (input.rotor !== undefined && input.rotor !== null) {
    const rotor = input.rotor;
    if (typeof rotor !== "object" || Array.isArray(rotor)) throw fail("Rotor no valido.");
    for (const key of Object.keys(rotor)) if (!["id", "port", "baud", "motion", "park", "azimuthOffset", "elevationOffset"].includes(key)) throw fail(`Campo de rotor no admitido: ${key}`);
    if (typeof rotor.id !== "string" || !findRotor(rotor.id, catalog)) throw fail("Rotor desconocido.");
    if (!isValidPort(rotor.port)) throw fail("Puerto del rotor no valido.");
    config.rotor = { id: rotor.id, port: rotor.port };
    if (rotor.motion !== undefined) {
      if (typeof rotor.motion !== "boolean") throw fail("Movimiento del rotor no valido.");
      config.rotor.motion = rotor.motion;
    }
    if (rotor.park !== undefined && rotor.park !== null) {
      const park = rotor.park;
      if (typeof park !== "object" || !Number.isFinite(park.azimuth) || !Number.isFinite(park.elevation)) throw fail("Aparcado del rotor no valido.");
      config.rotor.park = { azimuth: park.azimuth, elevation: park.elevation };
    }
    for (const key of ["azimuthOffset", "elevationOffset"]) {
      if (rotor[key] === undefined) continue;
      if (!Number.isFinite(rotor[key]) || Math.abs(rotor[key]) > 180) throw fail("Calibracion del rotor no valida.");
      config.rotor[key] = rotor[key];
    }
    if (rotor.baud !== undefined) {
      if (!Number.isInteger(rotor.baud) || rotor.baud < 300 || rotor.baud > 115200) throw fail("Velocidad del rotor no valida.");
      config.rotor.baud = rotor.baud;
    }
  }
  config.relay = validateRelay(input.relay);
  config.audio = validateAudio(input.audio);
  if (input.tunerKind !== undefined) {
    if (!TUNER_KINDS.includes(input.tunerKind)) throw fail("Sintonizador no valido (interno o atas).");
    config.tunerKind = input.tunerKind;
  }
  if (input.listen !== undefined) {
    if (input.listen !== "local" && input.listen !== "lan") throw fail("Modo de escucha no valido (local o lan).");
    config.listen = input.listen;
  }
  if (input.agentPort !== undefined) {
    if (!Number.isInteger(input.agentPort) || input.agentPort < 1024 || input.agentPort > 65535 || input.agentPort === RIGCTLD_PORT || input.agentPort === ROTCTLD_PORT) throw fail("Puerto del agente no valido.");
    config.agentPort = input.agentPort;
  }
  return config;
}

function loadStationConfig(dir, catalog = loadCatalog()) {
  const file = path.join(dir, CONFIG_FILE);
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  let stored;
  try { stored = JSON.parse(text); } catch { throw new Error(`Configuracion corrupta: ${file}`); }
  return validateConfig(stored, catalog);
}

function writeStationConfig(dir, config) {
  const file = path.join(dir, CONFIG_FILE);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch { /* not supported on every platform */ }
}

function redactConfig(config) {
  if (!config) return null;
  return { ...config, relay: config.relay ? { url: config.relay.url, station: config.relay.station, hasSecret: Boolean(config.relay.secret) } : null };
}

// ---- Launch plan ----
const isExternalRig = (radio, config) => radio.maker === "Icom" && config.link === "lan";

function rigctldArgs({ model, path: rigPath, baud, setConf, port = RIGCTLD_PORT }) {
  const args = ["-m", String(model), "-r", rigPath];
  if (baud) args.push("-s", String(baud));
  if (setConf) args.push(`--set-conf=${setConf}`);
  args.push("-T", "127.0.0.1", "-t", String(port));
  return args;
}

function rotctldArgs({ model, path: rotorPath, baud, port = ROTCTLD_PORT }) {
  const args = ["-m", String(model), "-r", rotorPath];
  if (baud) args.push("-s", String(baud));
  args.push("-T", "127.0.0.1", "-t", String(port));
  return args;
}

// Elevation limits default to 0/0 (azimuth-only): the catalog has no verified limits, so none are inferred.
function rotorAgentConfig(rotor, catalog = loadCatalog()) {
  const entry = findRotor(rotor.id, catalog);
  return {
    port: ROTCTLD_PORT, label: `${entry.maker} ${entry.model}`, motionEnabled: rotor.motion === true,
    park: rotor.park || null, azimuthOffset: rotor.azimuthOffset || 0, elevationOffset: rotor.elevationOffset || 0
  };
}

// Icom over LAN goes through wfview's rigctld-compatible server, which the agent talks to directly.
function buildPlan(config, { catalog = loadCatalog(), find = findHamlibBinary } = {}) {
  const radio = findRadio(config.radio, catalog);
  if (!radio) throw fail("Radio desconocida.");
  const plan = { rig: null, rotor: null, agent: { rigctldHost: "127.0.0.1", rigctldPort: RIGCTLD_PORT }, openDelayMs: radio.serial.openDelayMs || 0 };
  if (isExternalRig(radio, config)) {
    const index = config.netAddress.lastIndexOf(":");
    plan.agent = { rigctldHost: config.netAddress.slice(0, index), rigctldPort: Number(config.netAddress.slice(index + 1)) };
    plan.openDelayMs = 0;
  } else {
    if (radio.hamlibModel === null) throw fail(`${radio.maker} ${radio.model}: sin modelo Hamlib citado (${radio.nativeProtocol}); CAT del shack pendiente de fuente.`, 409);
    const command = find("rigctld");
    if (!command) throw fail("No se encuentra rigctld. Instala Hamlib 4.x (https://github.com/Hamlib/Hamlib/releases).", 409);
    const usb = config.link === "usb";
    plan.rig = { name: "rigctld", command, args: rigctldArgs({
      model: radio.hamlibModel, path: usb ? config.port : config.netAddress,
      baud: usb ? config.baud || radio.serial.baud : 0, setConf: usb ? radio.serial.setConf : ""
    }) };
  }
  if (config.rotor) {
    const rotor = findRotor(config.rotor.id, catalog);
    const command = find("rotctld");
    if (!command) throw fail("No se encuentra rotctld. Instala Hamlib 4.x.", 409);
    plan.rotor = { name: "rotctld", command, args: rotctldArgs({ model: rotor.hamlibModel, path: config.rotor.port, baud: config.rotor.baud || rotor.serial?.baud }) };
  }
  return plan;
}

// ---- Process supervision ----
function createManaged({ name, command, args, spawn, log, backoff, now = Date.now }) {
  let child = null;
  let stopped = true;
  let timer = null;
  let killTimer = null;
  let failures = 0;
  let startedAt = 0;
  let immediate = false;
  const state = { restarts: 0, lastExit: null };
  const waiters = [];

  function settle() {
    clearTimeout(killTimer);
    while (waiters.length) waiters.shift()();
  }
  function schedule() {
    if (stopped) return;
    failures = now() - startedAt > 10_000 ? 1 : failures + 1;
    const delay = immediate ? 0 : Math.min(backoff.max, backoff.min * 2 ** (failures - 1));
    immediate = false;
    state.restarts += 1;
    log(`${name} termino; reintento en ${delay} ms`);
    timer = setTimeout(launch, delay);
    timer.unref?.();
  }
  function launch() {
    timer = null;
    startedAt = now();
    let current;
    try {
      current = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
    } catch (error) {
      state.lastExit = { error: error.message };
      schedule();
      return;
    }
    child = current;
    let done = false;
    const finish = exit => {
      if (done) return;
      done = true;
      state.lastExit = exit;
      if (child === current) child = null;
      settle();
      schedule();
    };
    for (const stream of [current.stdout, current.stderr]) {
      stream?.on("data", chunk => { const text = String(chunk).trim(); if (text) log(`[${name}] ${text.slice(0, 500)}`); });
    }
    current.once("error", error => finish({ error: error.message }));
    current.once("exit", (code, signal) => finish({ code, signal }));
  }

  return {
    name, command, args,
    start() { stopped = false; failures = 0; if (!child && !timer) launch(); },
    // Hard kill and immediate relaunch (no backoff), used when the process stops answering.
    restart() {
      if (stopped) return;
      immediate = true;
      clearTimeout(timer);
      timer = null;
      if (!child) { launch(); return; }
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = null;
      if (!child) return Promise.resolve();
      return new Promise(resolve => {
        waiters.push(resolve);
        killTimer = setTimeout(() => { try { child?.kill("SIGKILL"); } catch { /* already gone */ } }, 2000);
        killTimer.unref?.();
        try { child.kill(); } catch { settle(); }
      });
    },
    state: () => ({ running: child !== null, pid: child?.pid ?? null, restarts: state.restarts, lastExit: state.lastExit })
  };
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === "IPv4" && !item.internal).map(item => item.address);
}

function createStation(options = {}) {
  const catalog = options.catalog || loadCatalog();
  const spawn = options.spawn || childProcess.spawn;
  const find = options.findBinary || (name => findHamlibBinary(name));
  const createAgent = options.createAgent || (agentOptions => require("./remote-agent.cjs").createRemoteAgent(agentOptions));
  const sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const log = options.log || (() => {});
  const configDir = options.configDir || defaultConfigDir();
  const backoff = { min: options.backoffMinMs ?? 1000, max: options.backoffMaxMs ?? 30_000 };
  let rig = null;
  let rotor = null;
  let agent = null;
  let running = false;
  let starting = false;
  let active = null;
  let external = null;
  let failure = null;
  let emergency = null;
  const makeClient = options.createRigctldClient || (clientOptions => new RigctldClient(clientOptions));
  const emergencyMs = options.emergencyTimeoutMs ?? 30_000;
  const restartCooldownMs = options.restartCooldownMs ?? 30_000;
  let lastRestartAt = -Infinity;
  const wait = ms => new Promise(resolve => { setTimeout(resolve, ms).unref?.(); });

  // The agent reports rigctld hung while transmitting: kill it, relaunch it and, as soon as it accepts
  // connections, send tuner stop + txOff + T 0 before anything else can touch the radio.
  function emergencyStop({ cat, tunerKind, target }) {
    if (emergency) return emergency;
    if (Date.now() - lastRestartAt < restartCooldownMs) return Promise.resolve();
    lastRestartAt = Date.now();
    emergency = (async () => {
      log("rigctld no responde con TX activo: se reinicia para parar la transmision");
      rig?.restart();
      const deadline = Date.now() + emergencyMs;
      let stopped = false;
      while (!stopped && Date.now() < deadline && rig) {
        const client = makeClient({ host: target.rigctldHost, port: target.rigctldPort, reconnectMs: 100, timeoutMs: 1500, rawAllow: catAllowList(cat), socketFactory: options.socketFactory });
        const connected = new Promise(resolve => client.once("connect", () => resolve(true)));
        client.start();
        try {
          if (await Promise.race([connected, wait(Math.max(0, deadline - Date.now())).then(() => false)])) {
            stopped = await stopSequence(client, { cat, tunerKind, tuner: true, log });
          }
        } finally { client.stop(); }
        if (!stopped) await wait(200);
      }
      const message = stopped ? "Parada de emergencia: rigctld no respondía" : "Parada de emergencia fallida: rigctld no responde tras reiniciarlo";
      if (agent?.notify) agent.notify(message); else log(message);
    })().finally(() => { emergency = null; });
    return emergency;
  }

  async function start(config) {
    if (running || starting) throw fail("La estacion ya esta en marcha.", 409);
    starting = true;
    failure = null;
    try {
      const plan = buildPlan(config, { catalog, find });
      external = plan.rig ? null : plan.agent;
      if (plan.rig) rig = createManaged({ ...plan.rig, spawn, log, backoff });
      if (plan.rotor) rotor = createManaged({ ...plan.rotor, spawn, log, backoff });
      rig?.start();
      rotor?.start();
      if (plan.openDelayMs) await sleep(plan.openDelayMs);
      const lan = config.listen === "lan";
      const radioEntry = findRadio(config.radio, catalog);
      agent = createAgent({
        configDir, host: lan ? "0.0.0.0" : "127.0.0.1", port: config.agentPort, tls: lan,
        rigctldHost: plan.agent.rigctldHost, rigctldPort: plan.agent.rigctldPort,
        rotor: plan.rotor ? rotorAgentConfig(config.rotor, catalog) : undefined,
        radioScope: radioEntry?.scope, radioCat: radioEntry?.cat, tunerKind: config.tunerKind,
        socketFactory: options.socketFactory,
        onRigctldHung: plan.rig ? () => emergencyStop({ cat: radioEntry?.cat || null, tunerKind: config.tunerKind || "internal", target: plan.agent }) : undefined,
        relay: config.relay || undefined, audio: config.audio, log
      });
      await agent.start();
      active = config;
      running = true;
    } catch (error) {
      failure = error.message;
      await teardown();
      throw error;
    } finally {
      starting = false;
    }
  }

  async function teardown() {
    const current = agent;
    agent = null;
    await current?.close().catch(() => {});
    await rotor?.stop();
    await rig?.stop();
    rig = null;
    rotor = null;
    external = null;
    active = null;
    running = false;
  }

  async function stop() {
    await teardown();
  }

  function links() {
    if (!agent || !active) return null;
    const port = active.agentPort;
    const hosts = active.listen === "lan" ? lanAddresses() : ["127.0.0.1"];
    const fragment = `#token=${agent.token}${agent.tls ? `&fp=${agent.fingerprint}` : ""}`;
    return {
      console: hosts.map(host => `${agent.tls ? "https" : "http"}://${host}:${port}/${fragment}`),
      android: hosts.map(host => `radicodex-remote://pair?host=${host}&port=${port}${fragment}`),
      relay: agent.relayLinks()
    };
  }

  function status() {
    const snapshot = agent ? agent.snapshot() : null;
    const rigState = rig ? rig.state() : null;
    return {
      running, starting, error: failure,
      rigctld: rig ? { mode: "managed", ...rigState } : external ? { mode: "external", running: Boolean(snapshot?.connected), host: external.rigctldHost, port: external.rigctldPort } : { mode: "none", running: false },
      rotctld: rotor ? rotor.state() : null,
      agent: agent ? { running: true, port: active.agentPort, listen: active.listen, rigConnected: Boolean(snapshot.connected), relay: snapshot.relay } : { running: false },
      links: links()
    };
  }

  return { start, stop, status, get running() { return running; } };
}

// ---- Controller: configuration file + supervisor + detection ----
function createController(options = {}) {
  const configDir = options.configDir || defaultConfigDir();
  const catalog = options.catalog || loadCatalog();
  const log = options.log || (() => {});
  const station = options.station || createStation({ configDir, catalog, log });
  const detect = options.detect || (() => detectPorts({ catalog }));
  const listDevices = options.listDevices || (() => require("./remote-audio.cjs").listAudioDevices());
  const mode = options.mode || "desktop";

  const readConfig = () => loadStationConfig(configDir, catalog);
  return {
    mode, configDir,
    hasConfig() { try { return readConfig() !== null; } catch { return false; } },
    catalog: () => ({ radios: catalog.radios, rotors: catalog.rotors, amplifiers: catalog.amplifiers, hamlibVersion: catalog.hamlibVersion, parity: loadParity() }),
    ports: () => detect(),
    devices: () => listDevices(),
    status() {
      let config = null;
      let configError = null;
      try { config = readConfig(); } catch (error) { configError = error.message; }
      return { available: true, mode: this.mode, config: redactConfig(config), configError, ...station.status() };
    },
    saveConfig(body) {
      if (station.running) throw fail("Deten la estacion antes de cambiar la configuracion.", 409);
      const config = validateConfig(body, catalog);
      if (config.relay && !config.relay.secret) {
        let previous = null;
        try { previous = readConfig(); } catch { /* corrupt file is replaced */ }
        if (!previous?.relay?.secret || previous.relay.url !== config.relay.url || previous.relay.station !== config.relay.station) {
          throw fail("Indica el secreto del rele.");
        }
        config.relay.secret = previous.relay.secret;
      }
      writeStationConfig(configDir, config);
      return redactConfig(config);
    },
    async start() {
      const config = readConfig();
      if (!config) throw fail("Guarda primero la configuracion.", 409);
      await station.start(config);
      return this.status();
    },
    async stop() {
      await station.stop();
      return this.status();
    }
  };
}

// ---- HTTP API shared by server.cjs (desktop) and the headless setup server ----
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw fail("Peticion demasiado grande.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Returns true when the request belonged to /api/remote/ (and was answered).
async function handleRemoteApi(controller, request, response, url, { protocol = "http", authorize } = {}) {
  if (!url.pathname.startsWith("/api/remote/")) return false;
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  };
  const routes = {
    "GET /api/remote/status": () => controller.status(),
    "GET /api/remote/catalog": () => controller.catalog(),
    "GET /api/remote/ports": async () => ({ ports: await controller.ports() }),
    "GET /api/remote/devices": async () => controller.devices(),
    "POST /api/remote/config": body => controller.saveConfig(body),
    "POST /api/remote/start": () => controller.start(),
    "POST /api/remote/stop": () => controller.stop()
  };
  const route = routes[`${request.method} ${url.pathname}`];
  if (!route) {
    const known = Object.keys(routes).some(key => key.endsWith(` ${url.pathname}`));
    send(known ? 405 : 404, { error: known ? "Metodo no permitido." : "Ruta no encontrada." });
    return true;
  }
  if (url.search) { send(400, { error: "Parametros no permitidos." }); return true; }
  try {
    if (authorize) {
      const denied = authorize(request);
      if (denied) { send(denied.status, { error: denied.message, pinRequired: denied.status === 401 }); return true; }
    }
    let body;
    if (request.method === "POST") {
      if (!request.headers.host || request.headers.origin !== `${protocol}://${request.headers.host}`) throw fail("Origen no permitido.", 403);
      const text = await readBody(request);
      if (url.pathname === "/api/remote/config") {
        if (request.headers["content-type"] !== "application/json") throw fail("Tipo no permitido.", 403);
        try { body = JSON.parse(text); } catch { throw fail("Configuracion JSON no valida."); }
      } else if (text.trim() !== "" && text.trim() !== "{}") {
        throw fail("Esta peticion no admite cuerpo.");
      }
    }
    send(200, await route(body));
  } catch (error) {
    send(error.status || 500, { error: error.status ? error.message : "Error interno de la estacion." });
    if (!error.status) console.error(`Estacion remota: ${error.message}`);
  }
  return true;
}

// ---- Headless mode (Raspberry Pi "Super Station") ----
const SETUP_FILES = Object.freeze({
  "/": ["remoto.html", "text/html; charset=utf-8"],
  "/remoto.html": ["remoto.html", "text/html; charset=utf-8"],
  "/remoto-ui.js": ["remoto-ui.js", "text/javascript; charset=utf-8"],
  "/remoto.css": ["remoto.css", "text/css; charset=utf-8"],
  "/bricohams-logo.png": ["bricohams-logo.png", "image/png"],
  "/ui-i18n.js": ["ui-i18n.js", "text/javascript; charset=utf-8"],
  "/ui-translations.js": ["ui-translations.js", "text/javascript; charset=utf-8"]
});
const SETUP_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const generatePin = () => String(crypto.randomInt(0, 100_000_000)).padStart(8, "0");

function pinAuthorizer(pin, now = Date.now) {
  const digest = value => crypto.createHash("sha256").update(value).digest();
  let failures = 0;
  let lockedUntil = 0;
  return request => {
    if (now() < lockedUntil) return { status: 429, message: "Demasiados intentos. Espera un minuto." };
    const supplied = request.headers["x-setup-pin"];
    if (typeof supplied === "string" && supplied && crypto.timingSafeEqual(digest(pin), digest(supplied))) { failures = 0; return null; }
    if (typeof supplied === "string" && supplied) {
      failures += 1;
      if (failures >= 5) { failures = 0; lockedUntil = now() + 60_000; }
    }
    return { status: 401, message: "PIN de configuracion necesario." };
  };
}

// HTTPS (self-signed, fingerprint stored beside the agent identity) on the LAN, protected by a one-time PIN.
// Closes itself once the station has started successfully.
function createSetupServer({ controller, pin, tlsIdentity, log = () => {}, closeDelayMs = 1000 }) {
  const authorize = pinAuthorizer(pin);
  let server;
  let closing = false;
  const setupController = Object.create(controller, {
    start: { value: async () => {
      const result = await controller.start();
      if (!closing) { closing = true; setTimeout(() => close(), closeDelayMs).unref?.(); }
      return result;
    } }
  });
  const handler = async (request, response) => {
    response.setHeader("Content-Security-Policy", SETUP_CSP);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    let url;
    try { url = new URL(request.url, "https://setup.invalid"); } catch { response.writeHead(400); response.end(); return; }
    if (await handleRemoteApi(setupController, request, response, url, { protocol: tlsIdentity ? "https" : "http", authorize })) return;
    const entry = SETUP_FILES[url.pathname];
    if (!["GET", "HEAD"].includes(request.method) || !entry) { response.writeHead(entry ? 405 : 404); response.end(); return; }
    try {
      const body = fs.readFileSync(path.join(__dirname, entry[0]));
      response.writeHead(200, { "Content-Type": entry[1], "Content-Length": body.length });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch { response.writeHead(500); response.end(); }
  };
  server = tlsIdentity ? https.createServer({ key: tlsIdentity.key, cert: tlsIdentity.cert }, handler) : http.createServer(handler);
  function close() {
    log("Configuracion guardada: el servidor de configuracion se cierra.");
    return new Promise(resolve => { server.close(() => resolve()); server.closeAllConnections?.(); });
  }
  return { server, close };
}

function parseHeadlessArgs(argv) {
  const args = { headless: false, configDir: undefined, setupPort: SETUP_PORT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--headless") args.headless = true;
    else if (argv[i] === "--config-dir" && i + 1 < argv.length) args.configDir = argv[i += 1];
    else if (argv[i] === "--setup-port" && i + 1 < argv.length) {
      const port = Number(argv[i += 1]);
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Puerto de configuracion no valido.");
      args.setupPort = port;
    } else throw new Error(`Argumento no valido: ${argv[i]}`);
  }
  return args;
}

function printLinks(status) {
  for (const url of status.links?.console || []) console.log(`Consola: ${url}`);
  for (const url of status.links?.android || []) console.log(`Android: ${url}`);
  if (status.links?.relay) {
    console.log(`Consola por rele: ${status.links.relay.console}`);
    console.log(`Android por rele: ${status.links.relay.android}`);
  }
}

async function runHeadless(argv = process.argv.slice(2)) {
  const args = parseHeadlessArgs(argv);
  if (!args.headless) throw new Error("Uso: node remote-station.cjs --headless [--config-dir <dir>] [--setup-port <puerto>]");
  const configDir = args.configDir || defaultConfigDir();
  const log = message => console.log(`[station] ${message}`);
  const controller = createController({ configDir, log, mode: "station" });
  let setup = null;
  const shutdown = async () => {
    await setup?.close().catch(() => {});
    await controller.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  if (controller.hasConfig()) {
    printLinks(await controller.start());
    return controller;
  }
  const pin = generatePin();
  const tlsIdentity = require("./remote-tls.cjs").ensure(configDir);
  setup = createSetupServer({ controller: Object.assign(Object.create(controller), { mode: "setup" }), pin, tlsIdentity, log });
  await new Promise((resolve, reject) => { setup.server.once("error", reject); setup.server.listen(args.setupPort, "0.0.0.0", resolve); });
  const port = setup.server.address().port;
  const banner = `PIN de configuracion RadiCodex: ${pin}`;
  console.log(banner);
  for (const ip of lanAddresses()) console.log(`Configura la estacion en https://${ip}:${port}/ (huella TLS SHA-256: ${tlsIdentity.fingerprint})`);
  console.log("El PIN solo sirve una vez: se descarta al guardar y arrancar la estacion.");
  return controller;
}

if (require.main === module) {
  runHeadless().catch(error => { console.error(error.message); process.exit(1); });
}

module.exports = {
  isValidPort, isValidNetAddress, findHamlibBinary, parseWindowsPnp, parseByIdLinks, parseByIdListing, readSysfsIds, listLinuxPorts,
  annotatePorts, detectPorts, validateConfig, loadStationConfig, writeStationConfig, redactConfig, rigctldArgs, rotctldArgs, buildPlan,
  createManaged, createStation, createController, handleRemoteApi, createSetupServer, pinAuthorizer, generatePin, parseHeadlessArgs,
  runHeadless, WINDOWS_PNP_COMMAND, SETUP_PORT, DEFAULT_AGENT_PORT, CONFIG_FILE
};
