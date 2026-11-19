"use strict";
// Jitter buffer kept as a plain function so it can be unit-tested without an AudioWorklet.
function createJitterBuffer(options = {}) {
  const rate = options.sampleRate || 48000;
  const targetSamples = Math.round(((options.targetMs ?? 80) / 1000) * rate);
  const maxSamples = Math.round(((options.maxMs ?? 300) / 1000) * rate);
  const chunks = [];
  let queued = 0;
  let offset = 0;
  let primed = false;
  let dropped = 0;

  function trimOldest() {
    while (queued > maxSamples && chunks.length) {
      const excess = queued - maxSamples;
      const available = chunks[0].length - offset;
      if (available <= excess) {
        chunks.shift();
        offset = 0;
        queued -= available;
        dropped += available;
      } else {
        offset += excess;
        queued -= excess;
        dropped += excess;
      }
    }
  }

  return {
    push(samples) {
      if (!samples || !samples.length) return;
      chunks.push(samples);
      queued += samples.length;
      trimOldest();
      if (!primed && queued >= targetSamples) primed = true;
    },
    // Fills `out` completely; silence while priming or after an underrun. Returns true if real audio was played.
    pull(out) {
      out.fill(0);
      if (!primed) return false;
      let written = 0;
      while (written < out.length && chunks.length) {
        const chunk = chunks[0];
        const count = Math.min(out.length - written, chunk.length - offset);
        out.set(chunk.subarray(offset, offset + count), written);
        written += count;
        offset += count;
        queued -= count;
        if (offset >= chunk.length) { chunks.shift(); offset = 0; }
      }
      if (written < out.length) primed = false;
      return written > 0;
    },
    depthMs: () => (queued / rate) * 1000,
    droppedSamples: () => dropped,
    reset() { chunks.length = 0; queued = 0; offset = 0; primed = false; }
  };
}

if (typeof registerProcessor === "function") {
  class RadioRxProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      const config = options.processorOptions || {};
      this.buffer = createJitterBuffer({ sampleRate: sampleRate, targetMs: config.targetMs, maxMs: config.maxMs });
      this.sinceReport = 0;
      this.port.onmessage = event => {
        const data = event.data;
        if (data && data.pcm) this.buffer.push(data.pcm);
        else if (data && data.reset) this.buffer.reset();
      };
    }

    process(inputs, outputs) {
      const channel = outputs[0][0];
      this.buffer.pull(channel);
      for (let index = 1; index < outputs[0].length; index++) outputs[0][index].set(channel);
      this.sinceReport += channel.length;
      if (this.sinceReport >= sampleRate / 5) {
        this.sinceReport = 0;
        this.port.postMessage({ depthMs: Math.round(this.buffer.depthMs()) });
      }
      return true;
    }
  }
  registerProcessor("radio-rx", RadioRxProcessor);

  // Mono capture: forwards 128-frame blocks of the first input channel while enabled.
  class RadioMicProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.enabled = false;
      this.port.onmessage = event => { if (event.data && "on" in event.data) this.enabled = Boolean(event.data.on); };
    }

    process(inputs) {
      const channel = inputs[0] && inputs[0][0];
      if (this.enabled && channel) this.port.postMessage(channel.slice());
      return true;
    }
  }
  registerProcessor("radio-mic", RadioMicProcessor);
}

if (typeof module !== "undefined" && module.exports) module.exports = { createJitterBuffer };
