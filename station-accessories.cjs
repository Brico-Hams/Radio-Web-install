"use strict";

// Station accessories layer: external tuner and linear amplifier supervision shared by the remote shack.
// The device list lives in data/station-accessories-catalog.json (also read by the Python station).
// Only devices with a protocol source in the repo get a driver; everything else is "pendiente de fuente".
// Safety contract: the amplifier is STANDBY by default and goes back to STANDBY on disconnect, high SWR,
// fault, lease expiry, band change, emergency stop and shutdown. Nothing here keys a transmitter on its own.

const fs = require("node:fs");
const path = require("node:path");
const R = require("./radio-core.js");
require("./tools-core.js");

const PENDING = "pendiente de fuente";
// 10 W is the FTX-1 field head maximum (remote-station/docs/control-potencia-acoplador.md, PC command).
const TUNE_POWER_MAX_W = 10;
const TUNE_MAX_SECONDS = 20;
const STANDBY_REASONS = Object.freeze(["disconnect", "swr", "fault", "lease", "emergency", "close", "band_change", "mismatch", "operator"]);

function loadCatalog() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", "station-accessories-catalog.json"), "utf8"));
}

function findDevice(catalog, id) {
  return catalog.devices.find(device => device.id === id) || null;
}

// Devices without a driver are listed but can never be enabled.
function supportMatrix(catalog = loadCatalog()) {
  return catalog.devices.map(device => ({
    id: device.id, kind: device.kind, maker: device.maker, model: device.model, link: device.link,
    status: device.status, tune: device.tune, safetyStop: device.safetyStop, source: device.source, enabled: Boolean(device.driver),
    verification: device.driver ? device.verification || null : null
  }));
}

function createAccessories(options = {}) {
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const catalog = options.catalog || loadCatalog();
  const config = options.config || {};
  const swrLimit = options.swrLimit ?? 3;
  const tuneMaxMs = Math.min(options.tuneMaxSeconds ?? TUNE_MAX_SECONDS, 60) * 1000;
  const ampDevice = config.amplifier?.device ? findDevice(catalog, config.amplifier.device) : null;
  const tunerDevice = config.tuner?.device ? findDevice(catalog, config.tuner.device) : null;
  const ampDriver = ampDevice?.driver && options.amplifier ? options.amplifier : null;
  const tunerBridge = tunerDevice?.driver && options.tuner ? options.tuner : null;
  const operateAllowed = config.amplifier?.operateAllowed === true;

  let ampState = "standby";
  let band = null;
  let standbyReason = null;
  let pendingStandby = false;
  let readout = null;
  let tune = null;
  let tuneResult = null;
  let polling = null;
  let lastPollAt = null;
  const pollIntervalMs = options.pollIntervalMs ?? 0;

  async function standby(reason) {
    if (!STANDBY_REASONS.includes(reason)) reason = "operator";
    ampState = reason === "fault" ? "fault" : "standby";
    standbyReason = reason;
    if (!ampDriver) return { ok: true, confirmed: true };
    try {
      await ampDriver.setOperate(false);
      pendingStandby = false;
      return { ok: true, confirmed: true };
    } catch (error) {
      pendingStandby = true;
      log(`Amplificador: STANDBY no confirmado (${error.message})`);
      return { ok: false, confirmed: false, error: error.message };
    }
  }

  async function operate(context = {}) {
    if (!ampDriver) return { ok: false, reason: "unsupported" };
    if (!operateAllowed) return { ok: false, reason: "disabled" };
    if (context.tx) return { ok: false, reason: "tx" };
    if (context.tuning || tune) return { ok: false, reason: "tuning" };
    if (context.swrTripped) return { ok: false, reason: "swr" };
    if (ampState === "fault") return { ok: false, reason: "fault" };
    if (pendingStandby) return { ok: false, reason: "standby_pending" };
    if (band === null) return { ok: false, reason: "band_unknown" };
    try {
      await ampDriver.setOperate(true);
    } catch (error) {
      await standby("fault");
      return { ok: false, reason: "driver_error", error: error.message };
    }
    ampState = "operate";
    standbyReason = null;
    return { ok: true };
  }

  async function followBand(freqHz, context = {}) {
    const next = Number.isFinite(freqHz) ? R.bandOf(freqHz / 1e6) : null;
    if (next === band) return { ok: true, band };
    if (context.tx) return { ok: false, reason: "tx" };
    // A band change always drops the amplifier out of operate; the operator must re-arm it for the new band.
    if (ampState === "operate") await standby("band_change");
    band = next;
    if (ampDriver?.setBand && next) {
      try { await ampDriver.setBand(next, freqHz); } catch (error) { log(`Amplificador: banda no aplicada (${error.message})`); return { ok: false, reason: "driver_error", band }; }
    }
    return { ok: true, band };
  }

  async function readDriver() {
    let reading;
    try { reading = await ampDriver.read(); } catch (error) {
      if (ampState === "operate") await standby("fault");
      return null;
    }
    readout = { powerW: reading.powerW ?? null, tempC: reading.tempC ?? null, swr: reading.swr ?? null, fault: reading.fault ?? null, at: now() };
    // Re-sending STANDBY on every poll of a persistent condition is pointless; it is repeated only while the amplifier
    // may still be operating or a previous STANDBY was not confirmed.
    const needsStandby = reason => ampState === "operate" || pendingStandby || standbyReason !== reason;
    if (reading.fault) { if (needsStandby("fault")) await standby("fault"); }
    else if (Number.isFinite(reading.swr) && reading.swr > swrLimit) { if (needsStandby("swr")) await standby("swr"); }
    else if (reading.operate === true && ampState !== "operate") await standby("mismatch");
    // The amplifier left OPERATE by itself (its own protection or front panel): follow it, never the other way round.
    else if (reading.operate === false && ampState === "operate") await standby("mismatch");
    // An independent readback that shows STANDBY confirms a standby the write could not confirm.
    else if (reading.operate === false && pendingStandby) pendingStandby = false;
    return readout;
  }

  // One read at a time; a slow link never stacks polls, and pollIntervalMs rate-limits it.
  async function poll() {
    if (!ampDriver?.read) return null;
    if (polling) return readout;
    if (pollIntervalMs > 0 && lastPollAt !== null && now() - lastPollAt < pollIntervalMs) return readout;
    lastPollAt = now();
    polling = readDriver().finally(() => { polling = null; });
    return polling;
  }

  async function startTune(context = {}) {
    if (!tunerBridge) return { ok: false, reason: "unsupported" };
    if (context.tx) return { ok: false, reason: "tx" };
    if (tune) return { ok: false, reason: "busy" };
    if (ampState === "operate") return { ok: false, reason: "amp_operate" };
    if (!Number.isFinite(context.powerW)) return { ok: false, reason: "power_unknown" };
    if (context.powerW > TUNE_POWER_MAX_W) return { ok: false, reason: "power_too_high" };
    try { await tunerBridge.start(); } catch (error) { return { ok: false, reason: "driver_error", error: error.message }; }
    tune = { startedAt: now() };
    return { ok: true };
  }

  async function stopTune(reason, swr = null) {
    const run = tune;
    tune = null;
    try { await tunerBridge?.stop(); } catch (error) { log(`Acoplador: parada no confirmada (${error.message})`); }
    if (run) tuneResult = { reason, swr: Number.isFinite(swr) ? swr : null, seconds: Math.round((now() - run.startedAt) / 1000) };
    return { ok: true };
  }

  async function tick() {
    if (tune && now() - tune.startedAt >= tuneMaxMs) await stopTune("time_cap");
  }

  async function emergencyStop(reason = "emergency") {
    const results = await Promise.allSettled([standby(reason), stopTune(reason)]);
    return { ok: results.every(item => item.status === "fulfilled" && item.value.ok !== false) };
  }

  function snapshot() {
    return {
      amplifier: {
        device: ampDevice?.id || null,
        supported: Boolean(ampDriver),
        status: ampDevice?.status || PENDING,
        verification: ampDriver ? ampDevice.verification || null : null,
        state: ampState,
        band,
        operateAllowed,
        standbyReason,
        pendingStandby,
        readout: readout ? { ...readout } : null
      },
      tuner: {
        device: tunerDevice?.id || null,
        supported: Boolean(tunerBridge),
        status: tunerDevice?.status || PENDING,
        tuning: tune !== null,
        seconds: tune ? Math.max(0, Math.floor((now() - tune.startedAt) / 1000)) : 0,
        maxSeconds: Math.round(tuneMaxMs / 1000),
        maxPowerW: TUNE_POWER_MAX_W,
        features: tunerDevice?.features || null,
        last: tuneResult ? { ...tuneResult } : null
      }
    };
  }

  return { operate, standby, followBand, poll, startTune, stopTune, tick, emergencyStop, snapshot };
}

module.exports = { createAccessories, loadCatalog, findDevice, supportMatrix, TUNE_POWER_MAX_W, STANDBY_REASONS, PENDING };
