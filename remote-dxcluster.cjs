"use strict";
// DX cluster telnet client for the remote agent: plain TCP, off by default, read-only.
// The only bytes ever written are the login callsign line; the module has no path to PTT, tune, CW or any radio command.
// "DX de" line format and the connect/login/backoff behaviour follow the sourced clients in the repo:
//   third_party/ftx1/rigplane-rigplane-core/src/rigplane/web/dx_cluster.py (+ tests/test_dx_cluster.py) and
//   third_party/ftx1/Eugen68-Yaesu-FTX1-CAT-Control/.../ClusterManager.java.
// Not here (pendiente de fuente): DXCC entity lookup (no prefix table in the repo), TLS/SSH cluster transports.

const fs = require("node:fs");
const net = require("node:net");
const { parseAdif, band, MAX_BYTES } = require("./remote-log.cjs");

const MAX_LINE = 512;
const MAX_SPOTS = 200;
const SPOT_TTL_MS = 1_800_000;
const CONNECT_TIMEOUT_MS = 10_000;
const BACKOFF_CAP_S = 60;
const MIN_HZ = 30_000;
const MAX_HZ = 3_000_000_000;
const SPOT_RE = /^DX de\s+(\S+?):\s+(\d+(?:\.\d*)?)\s+(\S+)(.*)$/i;
const TIME_RE = /(?:^|\s)(\d{4})Z\s*$/;

// Returns { spotter, call, freqHz, comment, time } or null for banners, WWV lines and anything malformed. Frequencies are kHz.
function parseSpot(line) {
  const match = SPOT_RE.exec(String(line).trim());
  if (!match) return null;
  const call = match[3].toUpperCase();
  const freqHz = Math.round(Number(match[2]) * 1000);
  if (!/^[A-Z0-9/]{3,14}$/.test(call) || !Number.isSafeInteger(freqHz) || freqHz < MIN_HZ || freqHz > MAX_HZ) return null;
  let rest = match[4];
  let time = "";
  const stamp = TIME_RE.exec(rest);
  if (stamp) { time = `${stamp[1]}Z`; rest = rest.slice(0, stamp.index); }
  return { spotter: match[1].toUpperCase().slice(0, 16), call, freqHz, comment: rest.trim().slice(0, 80), time };
}

function normalizeDxConfig(stored, configDir) {
  const off = { enabled: false };
  if (!stored || stored.enabled !== true) return off;
  const host = typeof stored.host === "string" ? stored.host.trim() : "";
  const callsign = typeof stored.callsign === "string" ? stored.callsign.trim().toUpperCase() : "";
  const port = Number(stored.port);
  if (!/^[A-Za-z0-9.-]{1,253}$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !/^[A-Z0-9/-]{3,16}$/.test(callsign)) return off;
  const logFile = typeof stored.logFile === "string" && stored.logFile ? stored.logFile : `${configDir}/remote-log.adi`;
  return { enabled: true, host, port, callsign, logFile };
}

// Optional ADIF log at the agent, reloaded when its size or mtime changes; null when absent or unreadable.
function createLogbook(file) {
  let stamp = "";
  let contacts = null;
  return () => {
    if (!file) return null;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > MAX_BYTES) { stamp = ""; return (contacts = null); }
      const key = `${stat.size}:${stat.mtimeMs}`;
      if (key !== stamp) { contacts = parseAdif(fs.readFileSync(file)).contacts; stamp = key; }
    } catch { stamp = ""; contacts = null; }
    return contacts;
  };
}

// "new" = call never worked, or worked but not on this band; "worked" = call already worked on this band. Spots carry no mode.
function markSpot(spot, contacts) {
  if (!contacts) return "unknown";
  const mine = contacts.filter(contact => contact.call === spot.call);
  if (!mine.length) return "new";
  const wanted = band(spot.freqHz / 1e6);
  return mine.some(contact => band(contact.frequencyMHz) === wanted) ? "worked" : "new";
}

function createDxCluster({ config, connect, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, log = () => {}, logbook } = {}) {
  const wanted = config?.enabled === true ? config : { enabled: false };
  const open = connect || (({ host, port }) => net.connect({ host, port }));
  const readLog = logbook || createLogbook(wanted.logFile);
  const spots = [];
  let socket = null;
  let connected = false;
  let stopped = true;
  let attempt = 0;
  let retryTimer = null;
  let connectTimer = null;
  let pending = "";
  let skipping = false;
  let lastError = "";
  let nextId = 1;

  function ingest(line) {
    const parsed = parseSpot(line);
    if (!parsed) return;
    spots.push({ id: nextId++, at: now(), ...parsed });
    if (spots.length > MAX_SPOTS) spots.splice(0, spots.length - MAX_SPOTS);
  }

  function feed(chunk) {
    // Telnet option bytes (IAC sequences) and control characters are dropped; nothing is answered.
    pending += (Buffer.isBuffer(chunk) ? chunk.toString("latin1") : String(chunk)).replace(/\xff[\xfb-\xfe][\s\S]|\xff[\s\S]/g, "").replace(/\r/g, "");
    for (;;) {
      const end = pending.indexOf("\n");
      if (end < 0) break;
      const line = pending.slice(0, end);
      pending = pending.slice(end + 1);
      if (skipping) skipping = false;
      else if (line.length <= MAX_LINE) ingest(line.replace(/[\x00-\x1f\x7f]/g, " "));
    }
    // Bounded buffer: an overlong unterminated line is discarded up to its newline.
    if (pending.length > MAX_LINE) { pending = ""; skipping = true; }
  }

  function schedule() {
    if (stopped || retryTimer) return;
    const delay = Math.min(2 ** attempt, BACKOFF_CAP_S) * 1000;
    attempt += 1;
    retryTimer = setTimer(() => { retryTimer = null; connectNow(); }, delay);
    retryTimer.unref?.();
  }

  function connectNow() {
    if (stopped) return;
    const current = open({ host: wanted.host, port: wanted.port });
    socket = current;
    pending = "";
    skipping = false;
    connectTimer = setTimer(() => { lastError = "timeout"; current.destroy(); }, CONNECT_TIMEOUT_MS);
    connectTimer.unref?.();
    current.on("connect", () => {
      clearTimer(connectTimer);
      connected = true;
      attempt = 0;
      lastError = "";
      current.write(`${wanted.callsign}\r\n`);
    });
    current.on("data", feed);
    current.on("error", error => { lastError = String(error?.code || "error").slice(0, 32); });
    current.on("close", () => {
      clearTimer(connectTimer);
      if (socket !== current) return;
      socket = null;
      connected = false;
      log(`dxcluster: disconnected (${lastError || "closed"})`);
      schedule();
    });
  }

  function start() {
    if (!wanted.enabled || !stopped) return;
    stopped = false;
    attempt = 0;
    connectNow();
  }

  function stop() {
    stopped = true;
    clearTimer(retryTimer);
    clearTimer(connectTimer);
    retryTimer = null;
    const current = socket;
    socket = null;
    connected = false;
    current?.destroy();
  }

  // Spots newest first, expired ones dropped; host, port and login are never included.
  function snapshot() {
    const cutoff = now() - SPOT_TTL_MS;
    while (spots.length && spots[0].at < cutoff) spots.shift();
    const contacts = wanted.enabled ? readLog() : null;
    const list = spots.map(spot => {
      const status = markSpot(spot, contacts);
      return { id: spot.id, spotter: spot.spotter, call: spot.call, freqHz: spot.freqHz, band: band(spot.freqHz / 1e6), comment: spot.comment, time: spot.time, at: spot.at, status, needed: status === "new" };
    }).reverse();
    return { enabled: wanted.enabled, connected, logbook: contacts !== null, spots: list };
  }

  return { start, stop, snapshot, feed, parseSpot };
}

module.exports = { parseSpot, normalizeDxConfig, createDxCluster, createLogbook, markSpot, MAX_LINE, MAX_SPOTS, SPOT_TTL_MS };
