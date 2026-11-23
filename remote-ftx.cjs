"use strict";
// FT8 receive-only decoder of the remote shack agent. It takes the 12 kHz mono s16le RX PCM that remote-audio.cjs taps
// from the one ffmpeg capture (ffmpeg does the resampling), places it by UTC time into 15 s FT8 slots, and decodes each
// closed slot with ftx-core.js inside a worker_thread. The queue is bounded: a slot is dropped rather than letting the
// decoder fall behind. Off by default; only the authenticated owner switches it on (remote-agent.cjs, POST /api/ftx).
// Licence rule of data/ftx-ldpc174.json: no robotic or unattended QSOs. This module only lists decodes: it has no
// answer, no auto-sequence and no path to the radio, to PTT or to any TX code.
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");

const SAMPLE_RATE = 12000;
const SLOT_MS = 15_000;
const SLOT_SAMPLES = SAMPLE_RATE * 15;
// Shortest buffer ftx-core.decodeFt8 accepts (one full FT8 frame).
const MIN_SLOT_SAMPLES = 151_680;
const QUEUE_MAX = 1;
const DECODES_MAX = 100;
const DECODE_WORK_MS = 12_000;
const DECODE_TIMEOUT_MS = 20_000;
const TICK_MS = 1000;
const RESYNC_MS = 1000;

if (!isMainThread && workerData && workerData.ftxWorker) {
  const core = require("./ftx-core.js");
  const ldpc = core.loadLdpc();
  parentPort.on("message", ({ id, samples }) => {
    try {
      const results = core.decodeFt8(samples, { ldpc, maxWorkMs: DECODE_WORK_MS });
      parentPort.postMessage({ id, ok: true, results });
    } catch (error) {
      parentPort.postMessage({ id, ok: false, error: String(error && error.code || "DECODE_FAILED") });
    }
  });
}

const defaultWorkerFactory = () => new Worker(__filename, { workerData: { ftxWorker: true } });

function createFtx(options = {}) {
  const audio = options.audio;
  const now = options.now || Date.now;
  const log = options.log || (() => {});
  const workerFactory = options.workerFactory || defaultWorkerFactory;
  const setTick = options.setInterval || setInterval;
  const clearTick = options.clearInterval || clearInterval;
  const decodeTimeoutMs = options.decodeTimeoutMs ?? DECODE_TIMEOUT_MS;
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;

  let enabled = false;
  let unsubscribe = null;
  let tickTimer = null;
  let slot = null;
  let lastClosed = -Infinity;
  let carry = null;
  let anchorMs = null;
  let totalSamples = 0;
  let worker = null;
  let busy = null;
  let watchdog = null;
  let nextId = 1;
  let queue = [];
  let decodes = [];
  const stats = { slots: 0, dropped: 0, skipped: 0, errors: 0 };

  function startSlot(index) {
    slot = { index, samples: new Float32Array(SLOT_SAMPLES), filled: 0 };
  }

  function closeSlot() {
    const closed = slot;
    slot = null;
    if (!closed) return;
    lastClosed = closed.index;
    if (closed.filled < MIN_SLOT_SAMPLES) { stats.skipped += 1; return; }
    enqueue({ utcMs: closed.index * SLOT_MS, samples: closed.samples });
  }

  function enqueue(job) {
    if (!busy) { run(job); return; }
    // Bounded queue: when full the oldest waiting slot is dropped, never the live one.
    while (queue.length >= QUEUE_MAX) { queue.shift(); stats.dropped += 1; }
    queue.push(job);
  }

  function next() {
    clearTimer(watchdog);
    watchdog = null;
    busy = null;
    const job = queue.shift();
    if (job && enabled) run(job);
  }

  function dropWorker() {
    const current = worker;
    worker = null;
    try { current?.terminate?.(); } catch { /* already gone */ }
  }

  function ensureWorker() {
    if (worker) return worker;
    const created = workerFactory();
    worker = created;
    created.unref?.();
    created.on("message", message => {
      if (created !== worker || !busy || message?.id !== busy.id) return;
      const job = busy;
      stats.slots += 1;
      if (message.ok && Array.isArray(message.results)) addDecodes(job.utcMs, message.results);
      else { stats.errors += 1; log(`FT8: decodificacion fallida (${message.error || "error"})`); }
      next();
    });
    created.on("error", error => {
      if (created !== worker) return;
      log(`FT8: worker: ${error && error.message}`);
      dropWorker();
      if (busy) { stats.errors += 1; next(); }
    });
    created.on("exit", () => {
      if (created !== worker) return;
      worker = null;
      if (busy) { stats.errors += 1; next(); }
    });
    return created;
  }

  function run(job) {
    busy = { id: nextId, utcMs: job.utcMs };
    nextId += 1;
    clearTimer(watchdog);
    watchdog = setTimer(() => {
      // A decode that overruns is abandoned together with its worker.
      stats.dropped += 1;
      dropWorker();
      next();
    }, decodeTimeoutMs);
    watchdog.unref?.();
    try { ensureWorker().postMessage({ id: busy.id, samples: job.samples }, [job.samples.buffer]); }
    catch (error) {
      log(`FT8: ${error.message}`);
      stats.errors += 1;
      dropWorker();
      next();
    }
  }

  function addDecodes(utcMs, results) {
    const utc = new Date(utcMs).toISOString();
    const rows = results.map(item => ({
      utc, snr: Math.round(item.snrDb), dt: Math.round(item.dtSeconds * 10) / 10, hz: Math.round(item.frequencyHz), message: String(item.text)
    }));
    decodes = [...rows.reverse(), ...decodes].slice(0, DECODES_MAX);
  }

  // Places s16le mono 12 kHz bytes into UTC-aligned slots. Samples are timed by a counter anchored to the clock and
  // re-anchored whenever the stream drifts from the clock by more than RESYNC_MS (gaps, restarts).
  function feed(chunk) {
    if (!enabled || !chunk || !chunk.length) return;
    const bytes = carry ? Buffer.concat([carry, chunk]) : chunk;
    const count = bytes.length >> 1;
    carry = bytes.length & 1 ? Buffer.from(bytes.subarray(bytes.length - 1)) : null;
    if (!count) return;
    const arrival = now();
    const expectedEnd = anchorMs === null ? null : anchorMs + ((totalSamples + count) * 1000) / SAMPLE_RATE;
    if (anchorMs === null || Math.abs(arrival - expectedEnd) > RESYNC_MS) {
      anchorMs = arrival - (count * 1000) / SAMPLE_RATE;
      totalSamples = 0;
    }
    let done = 0;
    while (done < count) {
      const t = anchorMs + ((totalSamples + done) * 1000) / SAMPLE_RATE;
      const index = Math.floor(t / SLOT_MS);
      // Late bytes of a slot already closed by tick() carry nothing the decoder needs.
      if (index <= lastClosed && (!slot || slot.index !== index)) {
        const skip = Math.min(count - done, Math.max(1, Math.ceil(((index + 1) * SLOT_MS - t) * SAMPLE_RATE / 1000)));
        done += skip;
        continue;
      }
      if (!slot || slot.index !== index) { closeSlot(); startSlot(index); }
      const offset = Math.min(SLOT_SAMPLES - 1, Math.max(0, Math.round(((t - index * SLOT_MS) * SAMPLE_RATE) / 1000)));
      const take = Math.min(count - done, SLOT_SAMPLES - offset);
      for (let k = 0; k < take; k += 1) slot.samples[offset + k] = bytes.readInt16LE((done + k) * 2) / 32768;
      slot.filled += take;
      done += take;
    }
    totalSamples += count;
  }

  function tick() {
    if (enabled && slot && now() >= (slot.index + 1) * SLOT_MS) closeSlot();
  }

  function reset() {
    slot = null;
    lastClosed = -Infinity;
    carry = null;
    anchorMs = null;
    totalSamples = 0;
    queue = [];
    decodes = [];
    clearTimer(watchdog);
    watchdog = null;
    busy = null;
    dropWorker();
  }

  function enable(on) {
    if (on === enabled) return enabled;
    if (on) {
      if (!audio || !audio.rx) return false;
      enabled = true;
      unsubscribe = audio.subscribe({ onPcm: feed });
      tickTimer = setTick(tick, TICK_MS);
      tickTimer.unref?.();
      return true;
    }
    enabled = false;
    unsubscribe?.();
    unsubscribe = null;
    clearTick(tickTimer);
    tickTimer = null;
    reset();
    return false;
  }

  function snapshot() {
    return {
      enabled,
      available: Boolean(audio && audio.rx),
      modes: { ft8: true, ft4: false },
      slotSeconds: SLOT_MS / 1000,
      decodes: decodes.map(row => ({ ...row })),
      stats: { ...stats, queued: queue.length, busy: Boolean(busy) }
    };
  }

  return { enable, feed, tick, snapshot, close: () => enable(false) };
}

module.exports = {
  createFtx, SAMPLE_RATE, SLOT_MS, SLOT_SAMPLES, MIN_SLOT_SAMPLES, QUEUE_MAX, DECODES_MAX, DECODE_TIMEOUT_MS
};
