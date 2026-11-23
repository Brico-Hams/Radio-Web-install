"use strict";
// DOM-free spectrum/waterfall helpers shared by remote-ui.js and the tests (browser global SpectrumCore or CommonJS).
//
// Two sources feed the same display:
//  (a) audio: FFT of the radio's RX audio (the universal fallback for every radio with an audio path). The forward FFT
//      keeps the contract of android/app/src/main/java/org/bricohams/digital/dsp/Fft.java (X[k] = sum x[j]e^(-2*pi*i*j*k/n));
//      only power-of-two sizes are ported because the display sizes are 256..4096.
//  (b) CI-V scope: Icom unsolicited "27 00" scope waveform frames. Layout (documented by the MIT-licensed rigplane project,
//      third_party/ftx1/rigplane-rigplane-core: docs/api/scope.md and src/rigplane/scope/__init__.py, which cite the
//      IC-705/IC-7300/IC-7610/IC-9700 CI-V Reference Guides):
//        FE FE <to> <from> 27 00 <receiver> <seq_bcd> <seq_max_bcd> <data...> FD
//        seq 1 data = mode, start/end frequency (5 bytes BCD each, least significant byte first), out-of-range flag, pixels
//        seq 2..max data = pixels (50 per sequence); pixel amplitude 0x00..0xA0 (0..160).
//      Mode 0 sends centre frequency and half-span: edges are centre -/+ half-span.
(function (root) {
  const MIN_FFT = 64;
  const MAX_FFT = 8192;
  const FLOOR_DB = -140;
  const ICOM_PIXEL_MAX = 160;
  const ICOM_MAX_PIXELS = 689;
  const COLOR_MAPS = Object.freeze(["heat", "ice", "gray"]);

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const isPowerOfTwo = n => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

  // ---- FFT ----
  function fft(re, im) {
    const n = re.length;
    if (im.length !== n || n < 2 || !isPowerOfTwo(n)) throw new RangeError("FFT size must be a power of two");
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i]; re[i] = re[j]; re[j] = tr;
        const ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (let length = 2; length <= n; length <<= 1) {
      const angle = -2 * Math.PI / length;
      const stepRe = Math.cos(angle);
      const stepIm = Math.sin(angle);
      const half = length >> 1;
      for (let start = 0; start < n; start += length) {
        let wr = 1;
        let wi = 0;
        for (let k = 0; k < half; k += 1) {
          const a = start + k;
          const b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
          const next = wr * stepRe - wi * stepIm;
          wi = wr * stepIm + wi * stepRe;
          wr = next;
        }
      }
    }
  }

  function hann(n) {
    const window = new Float64Array(n);
    for (let i = 0; i < n; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    return window;
  }

  // Sliding FFT over RX audio: push() returns the newest dBFS row (size/2 bins) each time `hop` new samples arrived.
  function createAudioAnalyzer({ sampleRate = 48000, size = 1024, hop = size / 2 } = {}) {
    if (!isPowerOfTwo(size) || size < MIN_FFT || size > MAX_FFT) throw new RangeError("size must be a power of two from 64 to 8192");
    if (!Number.isInteger(hop) || hop < 1 || hop > size) throw new RangeError("hop must be an integer from 1 to size");
    if (!Number.isFinite(sampleRate) || sampleRate < 1000) throw new RangeError("invalid sample rate");
    const window = hann(size);
    let windowSum = 0;
    for (const value of window) windowSum += value;
    const reference = windowSum / 2;
    const ring = new Float32Array(size);
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    let position = 0;
    let filled = 0;
    let sinceRow = 0;

    function row() {
      for (let i = 0; i < size; i += 1) {
        re[i] = ring[(position + i) % size] * window[i];
        im[i] = 0;
      }
      fft(re, im);
      const db = new Float32Array(size / 2);
      for (let k = 0; k < db.length; k += 1) {
        db[k] = Math.max(FLOOR_DB, 20 * Math.log10(Math.max(1e-12, Math.hypot(re[k], im[k]) / reference)));
      }
      return db;
    }

    return {
      size, hop, sampleRate, bins: size / 2, binHz: sampleRate / size,
      push(samples) {
        let latest = null;
        for (let i = 0; i < samples.length; i += 1) {
          const value = samples[i];
          ring[position] = Number.isFinite(value) ? value : 0;
          position = (position + 1) % size;
          if (filled < size) filled += 1;
          sinceRow += 1;
          if (filled === size && sinceRow >= hop) { sinceRow = 0; latest = row(); }
        }
        return latest;
      },
      reset() { ring.fill(0); position = 0; filled = 0; sinceRow = 0; }
    };
  }

  // ---- Row shaping ----
  // Resamples the 0..spanHz part of a dB row to `columns` columns keeping the peak of each column.
  function resampleRow(db, binHz, spanHz, columns) {
    const out = new Float32Array(columns);
    const usable = Math.max(1, Math.min(db.length, Math.floor(spanHz / binHz)));
    for (let column = 0; column < columns; column += 1) {
      const first = Math.floor((column * usable) / columns);
      const last = Math.max(first, Math.min(usable, Math.ceil(((column + 1) * usable) / columns)) - 1);
      let peak = FLOOR_DB;
      for (let bin = first; bin <= last; bin += 1) if (db[bin] > peak) peak = db[bin];
      out[column] = peak;
    }
    return out;
  }

  function levelToByte(db, floorDb, ceilDb) {
    if (!Number.isFinite(db) || !(ceilDb > floorDb)) return 0;
    return Math.round(clamp((db - floorDb) / (ceilDb - floorDb), 0, 1) * 255);
  }

  function colorLut(name) {
    const lut = new Uint8Array(256 * 3);
    for (let v = 0; v < 256; v += 1) {
      const t = v / 255;
      let rgb;
      if (name === "gray") rgb = [v, v, v];
      else if (name === "ice") rgb = [255 * clamp((t - 0.6) * 2.5, 0, 1), 255 * clamp((t - 0.2) * 1.5, 0, 1), 40 + 215 * Math.min(1, t * 1.5)];
      else rgb = [255 * clamp((t - 0.45) * 2.2, 0, 1), 255 * clamp((t - 0.15) * 1.6, 0, 1), 40 + 215 * Math.min(1, t * 2)];
      lut[v * 3] = Math.round(rgb[0]); lut[v * 3 + 1] = Math.round(rgb[1]); lut[v * 3 + 2] = Math.round(rgb[2]);
    }
    return lut;
  }

  // ---- Axis ----
  function niceStep(spanHz, maxTicks = 8) {
    const raw = Math.max(1, spanHz) / maxTicks;
    const power = 10 ** Math.floor(Math.log10(raw));
    for (const factor of [1, 2, 5, 10]) if (power * factor >= raw) return power * factor;
    return power * 10;
  }

  function ticks(startHz, endHz, maxTicks = 8) {
    const step = niceStep(endHz - startHz, maxTicks);
    const out = [];
    for (let hz = Math.ceil(startHz / step) * step; hz <= endHz + 1e-6; hz += step) out.push(Math.round(hz));
    return out;
  }

  function formatAudioHz(hz) {
    return hz >= 1000 ? `${Number((hz / 1000).toFixed(2))}k` : String(Math.round(hz));
  }

  function formatRfHz(hz) {
    return `${(hz / 1e6).toFixed(hz % 1e6 === 0 ? 0 : 3)}`;
  }

  // ---- Click to tune (only through the existing set-frequency path of the UI) ----
  const SIDEBAND = Object.freeze({ USB: 1, PKTUSB: 1, LSB: -1, PKTLSB: -1 });

  function sidebandSign(mode) {
    return SIDEBAND[String(mode || "").toUpperCase()] || 0;
  }

  // The audio waterfall shows audio frequency, so the RF position of a signal is only known in SSB: USB RF = dial + audio,
  // LSB RF = dial - audio. The new dial puts the clicked signal at `targetHz` (the centre of the displayed passband).
  // AM/FM/CW/digital modes return null: the audio offset does not identify the RF frequency there.
  function tuneFromAudioClick({ mode, dialHz, clickHz, targetHz }) {
    const sign = sidebandSign(mode);
    if (!sign || ![dialHz, clickHz, targetHz].every(Number.isFinite)) return null;
    const next = dialHz + sign * (clickHz - targetHz);
    return Number.isSafeInteger(Math.round(next)) && next > 0 ? Math.round(next) : null;
  }

  function tuneFromScopeClick({ startHz, endHz, fraction }) {
    if (![startHz, endHz, fraction].every(Number.isFinite) || endHz <= startHz) return null;
    return Math.round(startHz + clamp(fraction, 0, 1) * (endHz - startHz));
  }

  // ---- Icom CI-V scope ("27 00") ----
  function bcdByte(byte) {
    const high = byte >> 4;
    const low = byte & 0x0f;
    if (high > 9 || low > 9) throw new RangeError("invalid BCD");
    return high * 10 + low;
  }

  // Five bytes, least significant byte first (same weights as parse_frequency_reply in icom_civ.py).
  function bcdFrequency(bytes) {
    let hz = 0;
    for (let i = 0; i < 5; i += 1) hz += bcdByte(bytes[i]) * 100 ** i;
    return hz;
  }

  // Extracts the payload (seq, seq_max, data...) of a complete "27 00" CI-V frame, or null for any other frame.
  function parseScopeCivFrame(frame, { radioAddress, controllerAddress = 0xe0 } = {}) {
    const bytes = frame instanceof Uint8Array ? frame : Uint8Array.from(frame || []);
    if (bytes.length < 9 || bytes[0] !== 0xfe || bytes[1] !== 0xfe || bytes[bytes.length - 1] !== 0xfd) return null;
    if (bytes[4] !== 0x27 || bytes[5] !== 0x00 || bytes[2] !== controllerAddress) return null;
    if (radioAddress !== undefined && bytes[3] !== radioAddress) return null;
    return { receiver: bytes[6], payload: bytes.subarray(7, bytes.length - 1) };
  }

  // Reassembles the multi-sequence burst into one frame { mode, startHz, endHz, outOfRange, pixels }.
  function createScopeAssembler() {
    let expected = 0;
    let max = 0;
    let meta = null;
    let chunks = [];
    let size = 0;
    const reset = () => { expected = 0; max = 0; meta = null; chunks = []; size = 0; };

    function finish() {
      const pixels = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { pixels.set(chunk, offset); offset += chunk.length; }
      const frame = { ...meta, pixels };
      reset();
      return frame;
    }

    return {
      reset,
      feed(payload) {
        if (!payload || payload.length < 2) return null;
        let seq;
        let seqMax;
        try { seq = bcdByte(payload[0]); seqMax = bcdByte(payload[1]); } catch { reset(); return null; }
        if (seq === 1) {
          reset();
          if (payload.length < 14 || seqMax < 1) return null;
          let start;
          let end;
          try { start = bcdFrequency(payload.subarray(3, 8)); end = bcdFrequency(payload.subarray(8, 13)); } catch { return null; }
          const mode = payload[2];
          const outOfRange = payload[13] !== 0;
          if (mode === 0) { const centre = start; const half = end; start = centre - half; end = centre + half; }
          meta = { mode, startHz: start, endHz: end, outOfRange };
          if (outOfRange) { const frame = { ...meta, pixels: new Uint8Array(0) }; reset(); return frame; }
          expected = 2;
          max = seqMax;
          const first = payload.subarray(14);
          chunks.push(first);
          size += first.length;
          return seqMax === 1 ? finish() : null;
        }
        if (!meta || seq !== expected || seqMax !== max || seq > max) { reset(); return null; }
        const data = payload.subarray(2);
        size += data.length;
        if (size > ICOM_MAX_PIXELS) { reset(); return null; }
        chunks.push(data);
        expected += 1;
        return seq === max ? finish() : null;
      }
    };
  }

  // 0..160 radio amplitude -> 0..255 level byte shared with the audio rows.
  function scopePixelsToLevels(pixels) {
    const out = new Uint8Array(pixels.length);
    for (let i = 0; i < pixels.length; i += 1) out[i] = Math.round((Math.min(pixels[i], ICOM_PIXEL_MAX) * 255) / ICOM_PIXEL_MAX);
    return out;
  }

  // ---- Canvas renderer (spectrum line with dB scale on top, waterfall below) ----
  function createRenderer(lineCanvas, fallCanvas) {
    let rowImage = null;
    return {
      // columnsDb: Float32Array of dB values, one per output column; axis: { startHz, endHz, rf }
      draw({ columnsDb, floorDb, ceilDb, axis, lut }) {
        const lineCtx = lineCanvas.getContext("2d");
        const fallCtx = fallCanvas.getContext("2d");
        const { width, height } = lineCanvas;
        lineCtx.fillStyle = "#05080A";
        lineCtx.fillRect(0, 0, width, height);
        lineCtx.font = "11px sans-serif";
        lineCtx.strokeStyle = "#38434C";
        lineCtx.fillStyle = "#BAC4CC";
        for (const hz of ticks(axis.startHz, axis.endHz)) {
          const x = Math.min(width - 1, Math.round(((hz - axis.startHz) / (axis.endHz - axis.startHz)) * width));
          lineCtx.beginPath(); lineCtx.moveTo(x, 0); lineCtx.lineTo(x, height); lineCtx.stroke();
          lineCtx.fillText(axis.rf ? formatRfHz(hz) : formatAudioHz(hz), Math.min(x + 3, width - 30), height - 4);
        }
        const dbStep = ceilDb - floorDb >= 60 ? 20 : 10;
        for (let db = Math.ceil(floorDb / dbStep) * dbStep; db <= ceilDb; db += dbStep) {
          const y = Math.round((1 - (db - floorDb) / (ceilDb - floorDb)) * (height - 2)) + 1;
          lineCtx.beginPath(); lineCtx.moveTo(0, y); lineCtx.lineTo(width, y); lineCtx.stroke();
          lineCtx.fillText(`${db} dB`, 3, Math.max(11, y - 2));
        }
        lineCtx.strokeStyle = "#FFB52E";
        lineCtx.beginPath();
        if (!rowImage || rowImage.width !== fallCanvas.width) rowImage = fallCtx.createImageData(fallCanvas.width, 1);
        fallCtx.drawImage(fallCanvas, 0, 1);
        for (let x = 0; x < width; x += 1) {
          const value = columnsDb[Math.min(columnsDb.length - 1, Math.floor((x / width) * columnsDb.length))];
          const level = levelToByte(value, floorDb, ceilDb);
          const y = height - 1 - (level / 255) * (height - 2);
          if (x) lineCtx.lineTo(x, y); else lineCtx.moveTo(x, y);
          if (x < rowImage.width) {
            const at = x * 4;
            rowImage.data[at] = lut[level * 3]; rowImage.data[at + 1] = lut[level * 3 + 1]; rowImage.data[at + 2] = lut[level * 3 + 2];
            rowImage.data[at + 3] = 255;
          }
        }
        lineCtx.stroke();
        fallCtx.putImageData(rowImage, 0, 0);
      },
      clear() {
        for (const canvas of [lineCanvas, fallCanvas]) {
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#05080A";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }

  const api = {
    MIN_FFT, MAX_FFT, FLOOR_DB, ICOM_PIXEL_MAX, ICOM_MAX_PIXELS, COLOR_MAPS,
    fft, hann, createAudioAnalyzer, resampleRow, levelToByte, colorLut, niceStep, ticks, formatAudioHz, formatRfHz,
    sidebandSign, tuneFromAudioClick, tuneFromScopeClick,
    bcdByte, bcdFrequency, parseScopeCivFrame, createScopeAssembler, scopePixelsToLevels, createRenderer
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SpectrumCore = api;
})(typeof self !== "undefined" ? self : globalThis);
