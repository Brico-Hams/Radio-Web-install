"use strict";
// VOX for the remote TX path: the microphone level decides when to press and release PTT, but only through the SAME
// PTT adapter as the PTT button (request, heartbeat and lease), so every agent limit applies unchanged. Pure state machine:
// injected clock and PTT adapter, no I/O, never persisted. VOX is armed only by an explicit operator action in the current
// session and any refusal, cut, loss of control or loss of the page disarms it for good until the operator arms it again.
//
// Threshold/hold logic adapted from remoteAudio audio/nodes/vox/vox.go (MIT, Copyright (c) 2016 Tobias Wellnitz, DH1TW;
// SPDX-License-Identifier: MIT): RMS >= threshold activates, deactivation after the hold time below the threshold.
// Changes: JavaScript, bounded ranges, injected clock, PTT gating through the lease path, fail-safe disarm rules.
// See docs/THIRD-PARTY-REUSE.md.
// Classic script and CommonJS/ESM bundle at once: it registers on self (browser, WebView, bundler) and exports under Node.
(function (factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof self !== "undefined") self.RadicodexVox = api;
})(function () {
  // Bounded ranges: [min, max, default]. Defaults come from vox.go (threshold 0.1, hold 500 ms).
  const RANGES = { threshold: [0.02, 0.5, 0.1], holdMs: [250, 2000, 500] };

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function sanitize(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      threshold: clampNumber(src.threshold, RANGES.threshold[0], RANGES.threshold[1], RANGES.threshold[2]),
      holdMs: clampNumber(src.holdMs, RANGES.holdMs[0], RANGES.holdMs[1], RANGES.holdMs[2])
    };
  }

  function rms(block) {
    if (!block || !block.length) return 0;
    let sum = 0;
    for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
    return Math.sqrt(sum / block.length);
  }

  // ctx for arm()/check(): { guest, transmit, linkUp, controlLost, locked, hidden }. Anything but a clean context refuses.
  function allowed(ctx) {
    return !!ctx && !ctx.guest && ctx.transmit === true && ctx.linkUp === true && !ctx.controlLost && !ctx.locked && !ctx.hidden;
  }

  function createVox(options) {
    const now = options.now || Date.now;
    const ptt = options.ptt;
    const onChange = options.onChange || (() => {});
    let config = sanitize(options.settings);
    let armed = false;
    let keyed = false;
    let pending = false;
    let lastVoice = 0;
    let reason = "";
    let epoch = 0;

    function emit() { onChange({ armed, keyed, pending, reason }); }

    // Unkeys through the PTT adapter if VOX holds (or is about to hold) the line.
    function release() {
      const was = keyed || pending;
      keyed = false;
      if (was && !pending) ptt.up();
    }

    function disarm(why) {
      if (!armed && !keyed && !pending) return;
      armed = false;
      reason = why || "";
      epoch++;
      release();
      // A request still in flight is released when it resolves (see key()).
      emit();
    }

    function arm(ctx) {
      if (!allowed(ctx)) {
        reason = "blocked";
        emit();
        return false;
      }
      armed = true;
      keyed = false;
      pending = false;
      reason = "";
      lastVoice = 0;
      epoch++;
      emit();
      return true;
    }

    function key() {
      pending = true;
      const mine = epoch;
      emit();
      let result;
      try { result = Promise.resolve(ptt.down()); } catch { result = Promise.resolve(false); }
      return result.then((ok) => {
        pending = false;
        if (mine !== epoch || !armed) {
          // Disarmed while the request was in flight: give the line back at once.
          if (ok) ptt.up();
          emit();
          return;
        }
        if (ok) { keyed = true; emit(); } else disarm("refused");
      }, () => {
        pending = false;
        if (mine === epoch && armed) disarm("refused");
      });
    }

    // Feeds one block of microphone samples scaled to -1..1.
    function process(block) {
      return armed ? processLevel(rms(block)) : 0;
    }

    // Same as process() for callers that already measured the RMS level of a block.
    function processLevel(level) {
      if (!armed) return 0;
      const time = now();
      if (level >= config.threshold) {
        lastVoice = time;
        if (!keyed && !pending) key();
      } else if (keyed && time - lastVoice > config.holdMs) {
        keyed = false;
        ptt.up();
        emit();
      }
      return level;
    }

    return {
      arm,
      disarm,
      process,
      processLevel,
      // The operator pressed the PTT button: VOX gives way. Returns true when VOX was holding the line.
      buttonPressed() { const held = keyed || pending; disarm("button"); return held; },
      // The agent refused or cut TX (cap, SWR, heartbeat, out of band) or announced PTT off.
      agentCut() { disarm("cut"); },
      // Re-evaluated on every state change; a context that is no longer clean disarms.
      check(ctx) { if (armed && !allowed(ctx)) disarm("context"); },
      configure(next) { config = sanitize({ ...config, ...next }); },
      settings: () => ({ ...config }),
      isArmed: () => armed,
      isKeyed: () => keyed,
      isPending: () => pending,
      lastReason: () => reason
    };
  }

  return { RANGES, sanitize, rms, allowed, createVox };
});
