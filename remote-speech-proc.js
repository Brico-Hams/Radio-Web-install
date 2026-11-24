"use strict";
// Speech processor for the remote TX capture path: high-pass, presence peak and low-pass biquads, a soft-knee compressor
// with smoothed gain and a final peak limiter with a fixed ceiling. Pure and deterministic (no clock, no I/O).
//
// Adapted from RemoteRig common/speechproc.cpp/.h (MIT, Copyright (c) 2026 Yoann; SPDX-License-Identifier: MIT):
// RBJ cookbook biquads, peak-detector envelope, quadratic soft knee, gain smoothed in dB, automatic make-up.
// Changes: JavaScript, bounded operator settings, OFF by default (samples untouched), hard peak ceiling instead of the
// tanh clipper alone, gain-reduction read-out. See docs/THIRD-PARTY-REUSE.md.
// Classic script and CommonJS/ESM bundle at once: it registers on self (browser, WebView, bundler) and exports under Node.
(function (factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof self !== "undefined") self.RadicodexSpeechProc = api;
})(function () {
  const STORAGE_KEY = "bricohams.remote.speechproc";
  const SAMPLE_RATE = 48000;
  // Fixed ceiling, -1 dBFS: no processed sample ever exceeds it.
  const CEILING = 0.891;
  const SOFT_CLIP_START = 0.7;
  const ATTACK_MS = 5;
  const RELEASE_MS = 150;
  const KNEE_DB = 6;
  const PRESENCE_Q = 0.9;
  // Bounded operator ranges: [min, max, default].
  const RANGES = {
    hpHz: [80, 500, 300],
    presenceHz: [1000, 4000, 2000],
    presenceDb: [0, 9, 6],
    lpHz: [2400, 4000, 3200],
    thresholdDb: [-40, -6, -18],
    ratio: [1, 8, 3],
    makeupDb: [0, 12, 0] // 0 = automatic make-up
  };

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function defaults() {
    const out = { enabled: false };
    for (const key of Object.keys(RANGES)) out[key] = RANGES[key][2];
    return out;
  }

  // Any input becomes a valid settings object; enabled is true only for a literal true.
  function sanitize(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const out = { enabled: src.enabled === true };
    for (const key of Object.keys(RANGES)) {
      const [min, max, def] = RANGES[key];
      out[key] = clampNumber(src[key], min, max, def);
    }
    return out;
  }

  function parseStored(text) {
    try {
      return sanitize(JSON.parse(text));
    } catch {
      return defaults();
    }
  }

  function serialize(settings) {
    return JSON.stringify(sanitize(settings));
  }

  // RBJ cookbook biquad, direct form I coefficients normalised by a0.
  function makeBiquad(type, freq, q, gainDb) {
    const w0 = 2 * Math.PI * freq / SAMPLE_RATE;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "hp") {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    } else if (type === "lp") {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    } else {
      const a = Math.pow(10, gainDb / 40);
      b0 = 1 + alpha * a; b1 = -2 * cos; b2 = 1 - alpha * a;
      a0 = 1 + alpha / a; a1 = -2 * cos; a2 = 1 - alpha / a;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  }

  function runBiquad(f, x) {
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1; f.x1 = x;
    f.y2 = f.y1; f.y1 = y;
    return y;
  }

  // Static soft-knee curve: returns the gain reduction in dB (>= 0) for an input level in dB.
  function reductionDb(levelDb, threshold, ratio) {
    const over = levelDb - threshold;
    const slope = 1 - 1 / ratio;
    if (over <= -KNEE_DB / 2) return 0;
    if (over >= KNEE_DB / 2) return over * slope;
    const x = over + KNEE_DB / 2;
    return slope * x * x / (2 * KNEE_DB);
  }

  function softClip(x) {
    const a = Math.abs(x);
    if (a <= SOFT_CLIP_START) return x;
    const room = 1 - SOFT_CLIP_START;
    const y = SOFT_CLIP_START + room * Math.tanh((a - SOFT_CLIP_START) / room);
    return x < 0 ? -y : y;
  }

  function limit(x) {
    const y = softClip(x);
    return y > CEILING ? CEILING : y < -CEILING ? -CEILING : y;
  }

  function createSpeechProcessor(initial) {
    let settings = sanitize(initial);
    let hp, presence, lp;
    let envelope = 0;
    let gainDb = 0;
    let maxReduction = 0;
    let blockReduction = 0;
    let attack = 0;
    let release = 0;

    function build() {
      hp = makeBiquad("hp", settings.hpHz, Math.SQRT1_2, 0);
      presence = makeBiquad("peak", settings.presenceHz, PRESENCE_Q, settings.presenceDb);
      lp = makeBiquad("lp", settings.lpHz, Math.SQRT1_2, 0);
      attack = 1 - Math.exp(-1 / (ATTACK_MS * 0.001 * SAMPLE_RATE));
      release = 1 - Math.exp(-1 / (RELEASE_MS * 0.001 * SAMPLE_RATE));
      envelope = 0;
      gainDb = 0;
      maxReduction = 0;
      blockReduction = 0;
    }
    build();

    function configure(next) {
      const wasEnabled = settings.enabled;
      settings = sanitize(next);
      if (!wasEnabled || !settings.enabled) build();
      else {
        // Keep the running state but pick up new coefficients.
        const fresh = { hp: makeBiquad("hp", settings.hpHz, Math.SQRT1_2, 0), presence: makeBiquad("peak", settings.presenceHz, PRESENCE_Q, settings.presenceDb), lp: makeBiquad("lp", settings.lpHz, Math.SQRT1_2, 0) };
        for (const [target, source] of [[hp, fresh.hp], [presence, fresh.presence], [lp, fresh.lp]]) {
          target.b0 = source.b0; target.b1 = source.b1; target.b2 = source.b2; target.a1 = source.a1; target.a2 = source.a2;
        }
      }
    }

    // Processes Float32 samples in place. With the processor off the buffer is not touched at all.
    function process(samples) {
      if (!settings.enabled) { blockReduction = 0; return samples; }
      let blockMax = 0;
      for (let i = 0; i < samples.length; i++) {
        let x = runBiquad(lp, runBiquad(presence, runBiquad(hp, samples[i])));
        const level = Math.abs(x);
        envelope += (level > envelope ? attack : release) * (level - envelope);
        const levelDb = 20 * Math.log10(envelope + 1e-9);
        const targetReduction = reductionDb(levelDb, settings.thresholdDb, settings.ratio);
        // Gain smoothing in dB, attack when the reduction grows, release when it falls.
        const coeff = targetReduction > -gainDb ? attack : release;
        gainDb += coeff * (-targetReduction - gainDb);
        const reduction = -gainDb;
        if (reduction > maxReduction) maxReduction = reduction;
        if (reduction > blockMax) blockMax = reduction;
        const makeup = settings.makeupDb > 0 ? settings.makeupDb : 0.5 * maxReduction;
        x *= Math.pow(10, (gainDb + makeup) / 20);
        samples[i] = limit(x);
      }
      blockReduction = blockMax;
      return samples;
    }

    // Int16 PCM (React capture path): converts, processes and writes back only when enabled.
    function processInt16(pcm) {
      if (!settings.enabled) { blockReduction = 0; return pcm; }
      const block = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) block[i] = pcm[i] / 32768;
      process(block);
      for (let i = 0; i < pcm.length; i++) {
        const v = Math.round(block[i] * 32768);
        pcm[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
      }
      return pcm;
    }

    return {
      configure,
      process,
      processInt16,
      reset: build,
      isEnabled: () => settings.enabled,
      settings: () => ({ ...settings }),
      // Peak gain reduction (dB, >= 0) of the last processed block, 0 while off.
      gainReductionDb: () => blockReduction
    };
  }

  return { STORAGE_KEY, SAMPLE_RATE, CEILING, RANGES, defaults, sanitize, parseStored, serialize, createSpeechProcessor, reductionDb };
});
