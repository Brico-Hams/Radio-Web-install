"use strict";
// Receive-only digital text decoders for the remote console: BPSK31 and RTTY. Dependency-free and DOM-free so the
// same file runs in the browser (window.RemoteDigital) and in the tests (require). Nothing here touches PTT, the TX
// audio path or the network: it only turns RX audio samples into text.
//
// Code tables are never retyped here: Varicode, ITA2 and the PSK31 symbol rate / separator come from
// data/digital-code-tables.json (citations are in that file). The RTTY speed, shift and stop-bit values have no
// citation in the repo, so they are operator settings; RTTY_USUAL_PRESET is only an editable convenience labelled
// "valor habitual, pendiente de cita".
(function (root) {
  const TWO_PI = 2 * Math.PI;
  // Receive-chain tuning, not protocol values: samples of the BPSK timing grid per symbol, loop gains, lock thresholds.
  const PSK_SUBSAMPLES = 16;
  const PSK_TIMING_ALPHA = 0.1;
  const PSK_TIMING_CONTRAST = 0.08;
  const PSK_PHASE_LAMBDA = 0.95;
  const PSK_LOCK_ON = 0.6;
  const PSK_LOCK_OFF = 0.4;
  const PSK_AFC_GAIN = 0.03;
  const PSK_AFC_LIMIT_HZ = 10;
  const PSK_WARMUP_TICKS = 2 * PSK_SUBSAMPLES;
  const RTTY_ARM_LEVEL = 0.3;
  const RTTY_DOMINANCE_ON = 0.6;
  const RTTY_DOMINANCE_SYMBOLS = 8;
  const MIN_TONE_HZ = 100;
  const MAX_BUFFER_CHARS = 4000;

  const RTTY_USUAL_PRESET = Object.freeze({
    baud: 45.45, shiftHz: 170, stopBits: 1.5, polarity: "normal", label: "valor habitual, pendiente de cita"
  });

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const toNumber = value => (value === "" || value === null || value === undefined ? NaN : Number(value));

  // CR and LF both end a line; a LF straight after a CR does not add a second one. Other control codes print nothing.
  function createLineBreaks() {
    let afterCr = false;
    return {
      reset() { afterCr = false; },
      map(kind, printable) {
        if (kind === "cr") { afterCr = true; return "\n"; }
        const wasCr = afterCr;
        afterCr = false;
        if (kind === "lf") return wasCr ? "" : "\n";
        return printable || "";
      }
    };
  }

  function createBox(length) {
    const ring = new Float64Array(length);
    let index = 0;
    let sum = 0;
    return {
      push(value) {
        sum += value - ring[index];
        ring[index] = value;
        index = index + 1 === length ? 0 : index + 1;
        return sum / length;
      },
      reset() { ring.fill(0); index = 0; sum = 0; }
    };
  }

  // ---- Varicode (PSK31) ----
  function buildVaricode(tables) {
    const source = tables && tables.varicode;
    if (!source || typeof source !== "object") throw new Error("Falta la tabla Varicode");
    const encode = new Map();
    const decode = new Map();
    for (const [key, bits] of Object.entries(source)) {
      const code = Number(key);
      if (!Number.isInteger(code) || !/^1(?:[01]*1)?$/.test(bits) || bits.includes("00") || decode.has(bits)) {
        throw new Error(`Varicode no valido: ${key}`);
      }
      encode.set(code, bits);
      decode.set(bits, code);
    }
    return { encode, decode };
  }

  function pskSettings(tables) {
    const psk = tables && tables.psk31;
    if (!psk || !(Number(psk.symbolRate) > 0) || psk.separator !== "00") throw new Error("Faltan los datos PSK31 de la tabla");
    return { symbolRate: Number(psk.symbolRate) };
  }

  // Bits in transmit order, each character followed by the 00 separator. Characters outside Varicode are skipped.
  function encodeVaricode(tables, text) {
    const { encode } = buildVaricode(tables);
    let bits = "";
    for (const char of String(text).replace(/\r?\n/g, "\r\n")) {
      const code = char.charCodeAt(0);
      if (encode.has(code)) bits += `${encode.get(code)}00`;
    }
    return bits;
  }

  function createVaricodeDecoder(tables) {
    const { decode } = buildVaricode(tables);
    const breaks = createLineBreaks();
    let pending = "";
    function reset() { pending = ""; breaks.reset(); }
    // Returns the decoded code (0-127) when a separator closes a known character, otherwise -1.
    function pushBit(bit) {
      if (bit) { pending += "1"; if (pending.length > 10) pending = ""; return -1; }
      if (!pending) return -1;
      if (!pending.endsWith("0")) { pending += "0"; return -1; }
      const code = decode.get(pending.slice(0, -1));
      pending = "";
      return code === undefined ? -1 : code;
    }
    function push(bit) {
      const code = pushBit(bit);
      if (code < 0) return "";
      if (code === 13) return breaks.map("cr");
      if (code === 10) return breaks.map("lf");
      return breaks.map("char", code >= 32 && code < 127 ? String.fromCharCode(code) : "");
    }
    return { push, pushBit, reset };
  }

  // ---- BPSK31 ----
  // Differential BPSK at the table's symbol rate: the carrier is mixed to baseband, low-passed (two T/2 boxcars), and
  // sampled on a 16-phase symbol grid whose best phase follows the envelope dips of the phase reversals. Each symbol is
  // compared with the previous one (steady = 1, reversal = 0); the squared difference gives the carrier offset, which
  // also drives a slow AFC. Spectral inversion (USB/LSB) does not matter for a differential decision.
  function createBpsk31Decoder(options) {
    const tables = options.tables;
    const sampleRate = Number(options.sampleRate) || 48000;
    const { symbolRate } = pskSettings(tables);
    const varicode = createVaricodeDecoder(tables);
    const symbolSamples = sampleRate / symbolRate;
    const tickSamples = symbolSamples / PSK_SUBSAMPLES;
    const boxLength = Math.max(2, Math.round(symbolSamples / 2));
    if (!(symbolSamples >= 8 * PSK_SUBSAMPLES / 2)) throw new Error("Frecuencia de muestreo demasiado baja");
    const maxCarrier = sampleRate / 2 - MIN_TONE_HZ;
    const boxes = { i1: createBox(boxLength), i2: createBox(boxLength), q1: createBox(boxLength), q2: createBox(boxLength) };
    const energy = new Float64Array(PSK_SUBSAMPLES);
    const seen = new Uint8Array(PSK_SUBSAMPLES);
    let carrierHz = 0;
    let correctionHz = 0;
    let step = 0;
    let phase = 0;
    let tickPos = 0;
    let tickIndex = 0;
    let ticks = 0;
    let sampleBin = 0;
    let havePrev = false;
    let prevI = 0;
    let prevQ = 0;
    let accRe = 0;
    let accIm = 0;
    let accMag = 0;
    let coherence = 0;
    let locked = false;

    const retune = () => { step = (TWO_PI * (carrierHz + correctionHz)) / sampleRate; };

    function reset() {
      for (const box of Object.values(boxes)) box.reset();
      energy.fill(0);
      seen.fill(0);
      correctionHz = 0;
      phase = 0; tickPos = 0; tickIndex = 0; ticks = 0; sampleBin = 0;
      havePrev = false; prevI = 0; prevQ = 0;
      accRe = 0; accIm = 0; accMag = 0; coherence = 0; locked = false;
      varicode.reset();
      retune();
    }

    function setCarrier(hz) {
      const value = toNumber(hz);
      if (!finite(value) || value < MIN_TONE_HZ || value > maxCarrier) throw new Error("Portadora fuera de la banda de audio");
      carrierHz = value;
      reset();
    }

    function pickTiming() {
      let min = Infinity;
      let max = 0;
      let minBin = sampleBin;
      for (let bin = 0; bin < PSK_SUBSAMPLES; bin++) {
        if (energy[bin] < min) { min = energy[bin]; minBin = bin; }
        if (energy[bin] > max) max = energy[bin];
      }
      // The envelope dips half a symbol away from the instant where the pulses peak.
      if (max > 0 && max - min > PSK_TIMING_CONTRAST * max) sampleBin = (minBin + PSK_SUBSAMPLES / 2) % PSK_SUBSAMPLES;
    }

    function symbol(i, q) {
      let text = "";
      if (havePrev) {
        const dRe = i * prevI + q * prevQ;
        const dIm = q * prevI - i * prevQ;
        const power = dRe * dRe + dIm * dIm;
        accRe = PSK_PHASE_LAMBDA * accRe + (1 - PSK_PHASE_LAMBDA) * (dRe * dRe - dIm * dIm);
        accIm = PSK_PHASE_LAMBDA * accIm + (1 - PSK_PHASE_LAMBDA) * (2 * dRe * dIm);
        accMag = PSK_PHASE_LAMBDA * accMag + (1 - PSK_PHASE_LAMBDA) * power;
        coherence = accMag > 1e-18 ? Math.min(1, Math.hypot(accRe, accIm) / accMag) : 0;
        if (locked) { if (coherence < PSK_LOCK_OFF) locked = false; } else if (coherence >= PSK_LOCK_ON) locked = true;
        if (locked) {
          // theta is the carrier offset times the symbol time; steady symbols point at +theta, reversals at theta + pi.
          const theta = 0.5 * Math.atan2(accIm, accRe);
          text = varicode.push(dRe * Math.cos(theta) + dIm * Math.sin(theta) > 0 ? 1 : 0);
          correctionHz = Math.max(-PSK_AFC_LIMIT_HZ, Math.min(PSK_AFC_LIMIT_HZ,
            correctionHz + (PSK_AFC_GAIN * theta) / (TWO_PI / symbolRate)));
          retune();
        } else varicode.reset();
      }
      prevI = i; prevQ = q; havePrev = true;
      pickTiming();
      return text;
    }

    function tick(i, q) {
      const bin = tickIndex;
      tickIndex = tickIndex + 1 === PSK_SUBSAMPLES ? 0 : tickIndex + 1;
      ticks += 1;
      if (ticks <= PSK_WARMUP_TICKS) return "";
      const magnitude = Math.hypot(i, q);
      if (seen[bin]) energy[bin] += PSK_TIMING_ALPHA * (magnitude - energy[bin]);
      else { energy[bin] = magnitude; seen[bin] = 1; }
      return bin === sampleBin ? symbol(i, q) : "";
    }

    function push(samples) {
      let out = "";
      for (let n = 0; n < samples.length; n++) {
        const x = samples[n];
        const sample = finite(x) ? x : 0;
        const c = Math.cos(phase);
        const s = Math.sin(phase);
        phase += step;
        if (phase > TWO_PI) phase -= TWO_PI;
        const i = boxes.i2.push(boxes.i1.push(sample * c));
        const q = boxes.q2.push(boxes.q1.push(-sample * s));
        tickPos += 1;
        if (tickPos < tickSamples) continue;
        tickPos -= tickSamples;
        out += tick(i, q);
      }
      return out;
    }

    setCarrier(options.carrierHz);
    return {
      push, reset, setCarrier,
      status: () => ({ mode: "bpsk31", locked, coherence, carrierHz, offsetHz: correctionHz })
    };
  }

  // ---- ITA2 (RTTY) ----
  function buildIta2(tables) {
    const source = tables && tables.ita2;
    if (!source || typeof source !== "object") throw new Error("Falta la tabla ITA2");
    const decode = new Map();
    const encode = new Map();
    let figsKey = "";
    let ltrsKey = "";
    for (const [key, entry] of Object.entries(source)) {
      if (!/^[01]{5}$/.test(key) || !entry || typeof entry.ltrs !== "string" || typeof entry.figs !== "string") {
        throw new Error(`ITA2 no valido: ${key}`);
      }
      decode.set(key, entry);
      if (entry.ltrs === "FIGS") figsKey = key;
      if (entry.ltrs === "LTRS") ltrsKey = key;
    }
    if (!figsKey || !ltrsKey) throw new Error("Faltan LTRS/FIGS en la tabla ITA2");
    const named = { SP: " ", CR: "\r", LF: "\n" };
    for (const [key, entry] of decode) {
      for (const shift of ["ltrs", "figs"]) {
        const name = entry[shift];
        const char = name.length === 1 ? name : named[name];
        if (char === undefined) continue;
        const known = encode.get(char);
        if (known) { if (known.key === key) known.shift = "both"; } else encode.set(char, { key, shift });
      }
    }
    return { decode, encode, figsKey, ltrsKey };
  }

  // 5-bit codes (element 5 leftmost, as in the table keys), with LTRS/FIGS inserted where the shift has to change.
  function encodeIta2(tables, text, options = {}) {
    const { encode, figsKey, ltrsKey } = buildIta2(tables);
    const codes = [];
    let shift = "ltrs";
    if (options.announce !== false) codes.push(ltrsKey);
    const emit = char => {
      const entry = encode.get(char);
      if (!entry) return;
      if (entry.shift !== "both" && entry.shift !== shift) {
        shift = entry.shift;
        codes.push(shift === "figs" ? figsKey : ltrsKey);
      }
      codes.push(entry.key);
    };
    for (const char of String(text).toUpperCase().replace(/\r?\n/g, "\r\n")) emit(char);
    return codes;
  }

  function createIta2Decoder(tables) {
    const { decode } = buildIta2(tables);
    const breaks = createLineBreaks();
    let shift = "ltrs";
    return {
      reset() { shift = "ltrs"; breaks.reset(); },
      shift: () => shift,
      push(key) {
        const entry = decode.get(key);
        if (!entry) return "";
        const name = entry[shift];
        if (name === "LTRS") { shift = "ltrs"; return ""; }
        if (name === "FIGS") { shift = "figs"; return ""; }
        if (name === "CR") return breaks.map("cr");
        if (name === "LF") return breaks.map("lf");
        return breaks.map("char", name === "SP" ? " " : name.length === 1 ? name : "");
      }
    };
  }

  // ---- RTTY ----
  // Space is the tone `shiftHz` above the mark tone; "reversed" polarity swaps the meaning of the two tones (inverted
  // sideband). Frame: start (space), five elements with element 1 first, then at least one stop (mark) element.
  function validateRttySettings(settings, sampleRate) {
    const errors = [];
    const input = settings || {};
    const baud = toNumber(input.baud);
    const shiftHz = toNumber(input.shiftHz);
    const markHz = toNumber(input.markHz);
    const stopBits = toNumber(input.stopBits);
    const polarity = input.polarity === "reversed" ? "reversed" : input.polarity === "normal" || input.polarity === undefined ? "normal" : "";
    const rate = Number(sampleRate) || 48000;
    if (!(baud > 0) || !finite(baud)) errors.push("Introduce la velocidad en baudios (mayor que 0).");
    else if (rate / baud < 8) errors.push("La velocidad es demasiado alta para el audio recibido.");
    if (!(shiftHz > 0) || !finite(shiftHz)) errors.push("Introduce el desplazamiento en Hz (mayor que 0).");
    if (!(markHz > 0) || !finite(markHz)) errors.push("Introduce la frecuencia de marca en Hz.");
    else if (finite(shiftHz) && shiftHz > 0 && (markHz < MIN_TONE_HZ || markHz + shiftHz > rate / 2 - MIN_TONE_HZ)) {
      errors.push("Marca y espacio deben quedar dentro de la banda de audio recibida.");
    }
    if (!(stopBits >= 1 && stopBits <= 2)) errors.push("Los bits de parada deben estar entre 1 y 2.");
    if (!polarity) errors.push("Elige polaridad normal o invertida.");
    return { ok: errors.length === 0, errors, value: errors.length ? null : { baud, shiftHz, markHz, spaceHz: markHz + shiftHz, stopBits, polarity } };
  }

  // Non-coherent FSK: each tone is mixed to baseband and integrated over exactly one bit; D = (mark - space) energy
  // difference, normalised. The start-bit edge (D crossing zero, half a bit into the start bit) sets the sampling
  // instants, so each element is read from a window that covers precisely that element.
  function createRttyDecoder(options) {
    const sampleRate = Number(options.sampleRate) || 48000;
    const checked = validateRttySettings(options.settings, sampleRate);
    if (!checked.ok) throw new Error(checked.errors[0]);
    const settings = checked.value;
    const ita2 = createIta2Decoder(options.tables);
    const bitSamples = sampleRate / settings.baud;
    const length = Math.max(2, Math.round(bitSamples));
    const tones = [settings.markHz, settings.spaceHz].map(hz => ({
      step: (TWO_PI * hz) / sampleRate, phase: 0, i: createBox(length), q: createBox(length)
    }));
    const dominanceAlpha = 1 / (RTTY_DOMINANCE_SYMBOLS * bitSamples);
    const IDLE = 0;
    const RECEIVING = 1;
    const REARM = 2;
    let mode = IDLE;
    let armed = false;
    let n = 0;
    let startAt = 0;
    let nextAt = 0;
    let rearmAt = 0;
    let bitIndex = 0;
    let bits = [];
    let dominance = 0;
    let framingErrors = 0;

    function reset() {
      for (const tone of tones) { tone.phase = 0; tone.i.reset(); tone.q.reset(); }
      mode = IDLE; armed = false; n = 0; startAt = 0; nextAt = 0; rearmAt = 0; bitIndex = 0; bits = [];
      dominance = 0; framingErrors = 0;
      ita2.reset();
    }

    function abort() { mode = IDLE; armed = false; }

    // d is the signed mark-minus-space balance after polarity; returns decoded text.
    function advance(d) {
      if (mode === REARM) {
        if (n < rearmAt) return "";
        abort();
      }
      if (mode === IDLE) {
        if (!armed) { if (d > RTTY_ARM_LEVEL) armed = true; return ""; }
        if (d < 0) { mode = RECEIVING; startAt = n; nextAt = n + 0.5 * bitSamples; bitIndex = 0; bits = []; }
        return "";
      }
      if (n < nextAt) return "";
      const index = bitIndex++;
      nextAt += bitSamples;
      if (dominance < RTTY_DOMINANCE_ON) { abort(); return ""; }
      if (index === 0) { if (!(d < 0)) abort(); return ""; }
      if (index <= 5) { bits.push(d > 0 ? 1 : 0); return ""; }
      if (!(d > 0)) { framingErrors += 1; abort(); return ""; }
      mode = REARM;
      rearmAt = startAt + (5.5 + settings.stopBits) * bitSamples;
      // Element 1 was received first; the table keys list element 5 first.
      return ita2.push(bits.slice().reverse().join(""));
    }

    function push(samples) {
      let out = "";
      for (let k = 0; k < samples.length; k++) {
        const x = samples[k];
        const sample = finite(x) ? x : 0;
        const power = [0, 0];
        for (let t = 0; t < 2; t++) {
          const tone = tones[t];
          const re = tone.i.push(sample * Math.cos(tone.phase));
          const im = tone.q.push(-sample * Math.sin(tone.phase));
          tone.phase += tone.step;
          if (tone.phase > TWO_PI) tone.phase -= TWO_PI;
          power[t] = re * re + im * im;
        }
        n += 1;
        if (n < length) continue;
        const total = power[0] + power[1];
        let d = total > 1e-18 ? (power[0] - power[1]) / total : 0;
        if (settings.polarity === "reversed") d = -d;
        dominance += dominanceAlpha * (Math.abs(d) - dominance);
        out += advance(d);
      }
      return out;
    }

    return {
      push, reset,
      status: () => ({ mode: "rtty", locked: dominance >= RTTY_DOMINANCE_ON, dominance, framingErrors, settings: { ...settings } })
    };
  }

  // ---- Console session ----
  // One decoder at a time plus a bounded text buffer; the console feeds it every decoded RX audio block.
  function createDigitalSession(options) {
    const tables = options.tables;
    const sampleRate = Number(options.sampleRate) || 48000;
    const maxChars = options.maxChars > 0 ? options.maxChars : MAX_BUFFER_CHARS;
    let decoder = null;
    let config = { mode: "off" };
    let text = "";

    function configure(next) {
      const wanted = next || { mode: "off" };
      try {
        if (wanted.mode === "bpsk31") {
          decoder = createBpsk31Decoder({ tables, sampleRate, carrierHz: wanted.carrierHz });
        } else if (wanted.mode === "rtty") {
          const checked = validateRttySettings(wanted.rtty, sampleRate);
          if (!checked.ok) { decoder = null; config = { mode: "off" }; return { ok: false, errors: checked.errors }; }
          decoder = createRttyDecoder({ tables, sampleRate, settings: wanted.rtty });
        } else {
          decoder = null;
          config = { mode: "off" };
          return { ok: true, errors: [] };
        }
      } catch {
        decoder = null;
        config = { mode: "off" };
        return { ok: false, errors: [wanted.mode === "bpsk31" ? "Introduce la frecuencia de portadora en Hz." : "Ajustes no validos."] };
      }
      config = { mode: wanted.mode };
      return { ok: true, errors: [] };
    }

    return {
      configure,
      push(samples) {
        if (!decoder) return "";
        const added = decoder.push(samples);
        if (added) text = (text + added).slice(-maxChars);
        return added;
      },
      reset() { if (decoder) decoder.reset(); },
      clear() { text = ""; },
      text: () => text,
      mode: () => config.mode,
      status: () => (decoder ? decoder.status() : { mode: "off", locked: false })
    };
  }

  const api = Object.freeze({
    RTTY_USUAL_PRESET, MAX_BUFFER_CHARS,
    encodeVaricode, createVaricodeDecoder, createBpsk31Decoder,
    encodeIta2, createIta2Decoder, validateRttySettings, createRttyDecoder, createDigitalSession
  });
  root.RemoteDigital = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "object" ? globalThis : this);
