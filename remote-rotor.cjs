"use strict";
// Remote shack rotor control over Hamlib rotctld (extended response protocol: +p get_pos, +P set_pos, +S stop).
// Same semantics as remote-station/bricoham_station_agent/rotor.py: one lease holder at a time, 3 s deadman,
// 30 s motion cap, stop on close, no motion unless motionEnabled. Source for the commands: docs/control-rotores.md
// (Hamlib rotctld manual, https://hamlib.sourceforge.net/html/rotctld.1.html).
const net = require("node:net");
const crypto = require("node:crypto");

const LEASE_MS = 3000;
const MAX_MOTION_MS = 30_000;
const IO_TIMEOUT_MS = 700;
const REQUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;

const isNumber = value => typeof value === "number" && Number.isFinite(value);

function normalizeRotorConfig(input = {}) {
  const config = {
    host: input.host || "127.0.0.1",
    port: input.port,
    label: typeof input.label === "string" && input.label.trim() ? input.label.trim().slice(0, 80) : "Rotor",
    azimuthMin: input.azimuthMin ?? 0,
    azimuthMax: input.azimuthMax ?? 360,
    elevationMin: input.elevationMin ?? 0,
    elevationMax: input.elevationMax ?? 0,
    motionEnabled: input.motionEnabled === true,
    park: input.park ?? null,
    azimuthOffset: input.azimuthOffset ?? 0,
    elevationOffset: input.elevationOffset ?? 0
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error("Puerto rotctld no valido.");
  for (const key of ["azimuthMin", "azimuthMax", "elevationMin", "elevationMax", "azimuthOffset", "elevationOffset"]) {
    if (!isNumber(config[key])) throw new Error(`Rotor: ${key} no valido.`);
  }
  if (!(config.azimuthMin >= -180 && config.azimuthMin < config.azimuthMax && config.azimuthMax <= 450)) throw new Error("Rotor: limites de azimut no validos.");
  if (!(config.elevationMin >= -90 && config.elevationMin <= config.elevationMax && config.elevationMax <= 180)) throw new Error("Rotor: limites de elevacion no validos.");
  for (const key of ["azimuthOffset", "elevationOffset"]) if (Math.abs(config[key]) > 180) throw new Error("Rotor: offset fuera de +/-180.");
  if (config.park) {
    if (!isNumber(config.park.azimuth) || !isNumber(config.park.elevation)) throw new Error("Rotor: posicion de aparcado no valida.");
    if (!inLimits(config, config.park.azimuth, config.park.elevation)) throw new Error("Rotor: aparcado fuera de limites.");
  }
  return config;
}

function inLimits(config, azimuth, elevation) {
  return azimuth >= config.azimuthMin && azimuth <= config.azimuthMax && elevation >= config.elevationMin && elevation <= config.elevationMax;
}

class RotorError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

// Parses the lines of a "+p" reply: ["Azimuth: x", "Elevation: y"].
function parsePosition(lines) {
  if (lines.length !== 2 || !lines[0].startsWith("Azimuth: ") || !lines[1].startsWith("Elevation: ")) return null;
  const azimuth = Number(lines[0].slice(9));
  const elevation = Number(lines[1].slice(11));
  return Number.isFinite(azimuth) && Number.isFinite(elevation) ? { azimuth, elevation } : null;
}

function createRotor(options = {}) {
  const config = normalizeRotorConfig(options.config);
  const now = options.now || Date.now;
  const connect = options.connect || ((port, host) => net.createConnection({ port, host }));
  const watchdogMs = options.watchdogMs ?? 100;
  let lease = null; // { id, owner, until, motionUntil }
  let stopFailed = false;
  let closed = false;
  let chain = Promise.resolve();
  const blocked = [];

  const remember = id => { blocked.push(id); if (blocked.length > 256) blocked.shift(); };
  const serial = task => {
    const run = chain.then(task, task);
    chain = run.catch(() => {});
    return run;
  };

  function exchange(command, expected) {
    return new Promise((resolve, reject) => {
      const socket = connect(config.port, config.host);
      const lines = [];
      let buffer = "";
      let done = false;
      const finish = (error, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        socket.destroy();
        if (error) reject(error); else resolve(value);
      };
      const timer = setTimeout(() => finish(new RotorError("rotor_transport_failed")), options.ioTimeoutMs ?? IO_TIMEOUT_MS);
      socket.on("error", () => finish(new RotorError("rotor_transport_failed")));
      socket.on("connect", () => socket.write(`${command}\n`));
      socket.on("data", chunk => {
        buffer += chunk.toString("latin1");
        if (buffer.length > 512) { finish(new RotorError("rotor_invalid_response")); return; }
        let index;
        while ((index = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, index).replace(/\0/g, "").replace(/\r$/, "");
          buffer = buffer.slice(index + 1);
          lines.push(line);
          if (lines.length > 5) { finish(new RotorError("rotor_invalid_response")); return; }
          if (line.trim().startsWith("RPRT ")) {
            if (lines[0].split(":")[0] !== expected) finish(new RotorError("rotor_invalid_response"));
            else if (line.trim() !== "RPRT 0") finish(new RotorError("rotor_backend_error"));
            else finish(null, lines.slice(1, -1));
            return;
          }
        }
      });
      socket.on("close", () => finish(new RotorError("rotor_invalid_response")));
    });
  }

  async function readPosition() {
    const raw = parsePosition(await exchange("+p", "get_pos"));
    if (!raw) throw new RotorError("rotor_invalid_position");
    const position = { azimuth_deg: raw.azimuth + config.azimuthOffset, elevation_deg: raw.elevation + config.elevationOffset };
    if (!inLimits(config, position.azimuth_deg, position.elevation_deg)) throw new RotorError("rotor_invalid_position");
    return position;
  }

  async function stopNow() {
    lease = null;
    stopFailed = true;
    const extra = await exchange("+S", "stop");
    if (extra.length) throw new RotorError("rotor_invalid_response");
    stopFailed = false;
  }

  async function expire() {
    if (lease && now() >= Math.min(lease.until, lease.motionUntil)) await stopNow();
  }

  function view(clientId) {
    return {
      api_version: "v1",
      source: "hamlib_rotctld",
      status: "experimental",
      data_is_simulated: false,
      hardware_validation_complete: false,
      label: config.label,
      motion_enabled: config.motionEnabled,
      limits: { azimuth_min: config.azimuthMin, azimuth_max: config.azimuthMax, elevation_min: config.elevationMin, elevation_max: config.elevationMax },
      lease_active: lease !== null,
      lease_owned: lease !== null && lease.owner === clientId,
      stop_failed: stopFailed,
      lease_seconds: LEASE_MS / 1000,
      max_motion_seconds: MAX_MOTION_MS / 1000,
      park: config.park ? { azimuth_deg: config.park.azimuth, elevation_deg: config.park.elevation } : null,
      calibration_offset: { azimuth_deg: config.azimuthOffset, elevation_deg: config.elevationOffset },
      // Speed and limit/overlap switches are not in the cited rotctld ERP commands: pendiente de fuente.
      capabilities: {
        read_position: true, goto: config.motionEnabled, stop: true, park: config.motionEnabled && Boolean(config.park),
        tracking: config.motionEnabled, speed: null, limit_switches: null
      }
    };
  }

  const guard = () => { if (closed) throw new RotorError("rotor_closed"); };

  function snapshot({ readPositionNow = false, clientId = "" } = {}) {
    return serial(async () => {
      guard();
      await expire();
      const result = view(clientId);
      if (readPositionNow) { result.position = await readPosition(); result.observed_at = now() / 1000; }
      return result;
    });
  }

  function validate(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RotorError("rotor_invalid_operation", 400);
    const fields = { move: ["operation", "request_id", "azimuth_deg", "elevation_deg"], park: ["operation", "request_id"], renew: ["operation", "lease_id"], stop: ["operation"] };
    const required = fields[body.operation];
    if (!required) throw new RotorError("rotor_invalid_operation", 400);
    const optional = body.operation === "move" || body.operation === "park" ? ["lease_id"] : body.operation === "stop" ? ["cancel_request_id"] : [];
    const keys = Object.keys(body);
    if (!required.every(key => keys.includes(key)) || !keys.every(key => required.includes(key) || optional.includes(key))) throw new RotorError("rotor_invalid_operation", 400);
    for (const key of ["request_id", "cancel_request_id"]) {
      if (key in body && (typeof body[key] !== "string" || !REQUEST_ID.test(body[key]))) throw new RotorError("rotor_invalid_operation", 400);
    }
    if ("lease_id" in body && (typeof body.lease_id !== "string" || body.lease_id.length > 128)) throw new RotorError("rotor_invalid_operation", 400);
    let target = null;
    if (body.operation === "move") {
      if (!isNumber(body.azimuth_deg) || !isNumber(body.elevation_deg) || !inLimits(config, body.azimuth_deg, body.elevation_deg)) throw new RotorError("rotor_invalid_operation", 400);
      target = { azimuth: body.azimuth_deg, elevation: body.elevation_deg };
    } else if (body.operation === "park") {
      if (!config.park) throw new RotorError("rotor_park_not_configured", 409);
      target = { azimuth: config.park.azimuth, elevation: config.park.elevation };
    }
    return target;
  }

  function sameLease(id) {
    const a = Buffer.from(String(lease.id));
    const b = Buffer.from(String(id ?? ""));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // Stop never needs the lease or motionEnabled and is allowed for any authenticated client.
  function operate(body, clientId = "") {
    let target;
    try { target = validate(body); } catch (error) { return Promise.reject(error); }
    return serial(async () => {
      guard();
      const { operation } = body;
      if (operation === "stop") {
        if (body.cancel_request_id) remember(body.cancel_request_id);
        await stopNow();
      } else {
        await expire();
        if (operation === "renew") {
          if (!lease || lease.owner !== clientId || !sameLease(body.lease_id)) throw new RotorError("rotor_lease_expired", 409);
          lease.until = Math.min(now() + LEASE_MS, lease.motionUntil);
        } else {
          if (!config.motionEnabled) throw new RotorError("rotor_motion_disabled", 403);
          if (stopFailed) throw new RotorError("rotor_stop_unconfirmed", 409);
          // One controller at a time; the holder may retarget (satellite tracking) with its lease id.
          if (lease && (lease.owner !== clientId || !sameLease(body.lease_id))) throw new RotorError("rotor_busy", 409);
          if (blocked.includes(body.request_id)) throw new RotorError("rotor_request_cancelled_or_repeated", 409);
          await readPosition();
          const retarget = lease !== null;
          remember(body.request_id);
          const time = now();
          lease = { id: retarget ? lease.id : crypto.randomBytes(32).toString("base64url"), owner: clientId, until: time + LEASE_MS, motionUntil: time + MAX_MOTION_MS };
          try {
            const extra = await exchange(`+P ${target.azimuth - config.azimuthOffset} ${target.elevation - config.elevationOffset}`, "set_pos");
            if (extra.length) throw new RotorError("rotor_invalid_response");
          } catch (error) {
            await stopNow().catch(() => {});
            throw error;
          }
        }
      }
      const result = view(clientId);
      if (operation !== "stop" && lease) result.lease_id = lease.id;
      if (target) result.accepted_target = { azimuth_deg: target.azimuth, elevation_deg: target.elevation };
      return result;
    });
  }

  const timer = setInterval(() => { serial(() => (closed ? null : expire())).catch(() => {}); }, watchdogMs);
  timer.unref?.();

  async function close() {
    clearInterval(timer);
    await serial(async () => {
      if (closed) return;
      closed = true;
      if (lease) await stopNow().catch(() => {});
    });
  }

  // Called when the lease owner disconnects (e.g. SSE closed): safe state without waiting for the deadman.
  function release(clientId) {
    return serial(async () => { if (!closed && lease && lease.owner === clientId) await stopNow().catch(() => {}); });
  }

  return { snapshot, operate, close, release, config };
}

module.exports = { createRotor, normalizeRotorConfig, parsePosition, RotorError, LEASE_MS, MAX_MOTION_MS };
