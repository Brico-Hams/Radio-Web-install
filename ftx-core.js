"use strict";
/*
 * FT8 receive path (plus the transmit-side pieces the tests need), ported to dependency-free CommonJS from the
 * Bricohams Java sources of this repository (android/app/src/main/java/org/bricohams/digital):
 *   ft8/Ft8Decoder, ftx/FtxReceiver, ftx/FtxFrames, ftx/FtxRxProfile, ftx/Unpack77, fec/Ldpc174, fec/Osd174,
 *   fec/Crc14, dsp/Fft, ft8/Ft8Encoder, ftx/Pack77, ftx/GfskSynth.
 * Those Java files carry no licence header of their own; they are Bricohams project code. The LDPC(174,91) matrices
 * are NOT retyped here: they are loaded from data/ftx-ldpc174.json, whose "rights" block (QEX 2020, FT4/FT8
 * protocol description) applies. Its conditions are kept: FT8 naming requires protocol-conforming encoding, FEC and
 * modulation, and robotic or unattended QSOs are disallowed. This module only decodes audio and synthesises test
 * waveforms; it never keys a transmitter.
 *
 * Differences from the Java port, all outside the FT8 profile: the FT4/FT2 profiles, the "enhanced" multi-symbol
 * soft metrics (disabled for FT8) and the a-priori (AP) passes (the Java request leaves them off by default).
 * Belief propagation reports non-convergence with null instead of an exception.
 */

const SAMPLE_RATE = 12000;
const BB_SYM = 32;
const TONE_SPACING_HZ = 6.25;

// Receiver constants (FtxReceiver).
const SYNC_THRESHOLD = 1.5;
const MARGIN_HZ = 300;
const TIME_RANGE = 24;
const COARSE_TIME_STEP = 4;
const DUPLICATE_HZ = 20;
const OSD_MAX_ERRORS = 28;
// Local noise estimate window beside a signal and the guard kept free of the signal's own tones.
const NOISE_SIDE_HZ = 100;
const NOISE_GUARD_HZ = 15;

const FT8_GRAY = [0, 1, 3, 2, 5, 6, 4, 7];
const FT8_COSTAS = [3, 1, 4, 0, 6, 5, 2];

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Java Math.round: halves round up.
function jround(x) {
  return Math.floor(x + 0.5);
}

function popcount32(v) {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return Math.imul(v, 0x01010101) >>> 24;
}

// ---- fec/Crc14 ----

function requireBits(bits, length, name) {
  if (!bits || bits.length !== length) throw new TypeError(`${name} must contain ${length} bits`);
  for (let i = 0; i < length; i += 1) {
    if (bits[i] !== 0 && bits[i] !== 1) throw new TypeError(`${name} bits must be 0 or 1`);
  }
}

const Crc14 = {
  // CRC-14, polynomial 0x6757, MSB first, zero init, over the 77 payload bits followed by 19 zero bits.
  compute(payload77) {
    requireBits(payload77, 77, "payload77");
    let reg = 0;
    for (let i = 0; i < 96; i += 1) {
      const input = i < 77 ? payload77[i] : 0;
      const top = (reg >>> 13) & 1;
      reg = ((reg << 1) & 0x3fff) | input;
      if (top) reg ^= 0x2757;
    }
    return reg;
  },
  appendCrc(payload77) {
    const crc = Crc14.compute(payload77);
    const out = new Uint8Array(91);
    out.set(payload77, 0);
    for (let i = 0; i < 14; i += 1) out[77 + i] = (crc >>> (13 - i)) & 1;
    return out;
  },
};

// ---- fec/Ldpc174 ----

const LDPC_K = 91;
const LDPC_N = 174;
const LDPC_M = 83;
const MESSAGE_LIMIT = 30;

function clamp(v, limit) {
  return v > limit ? limit : (v < -limit ? -limit : v);
}

class Ldpc174 {
  // Reads generator.rows (83 strings of 91 bits) and parity_check.columns (174 triples of 1-based check rows).
  constructor(json) {
    const rows = json && json.generator && json.generator.rows;
    const columns = json && json.parity_check && json.parity_check.columns;
    if (!Array.isArray(rows) || rows.length !== LDPC_M) throw new Error("LDPC generator must have 83 rows");
    if (!Array.isArray(columns) || columns.length !== LDPC_N) throw new Error("LDPC parity check must have 174 columns");
    this.rowBits = new Uint32Array(LDPC_M * 3);
    for (let r = 0; r < LDPC_M; r += 1) {
      const row = rows[r];
      if (typeof row !== "string" || !/^[01]{91}$/.test(row)) throw new Error(`Generator row ${r} is not 91 binary characters`);
      for (let b = 0; b < LDPC_K; b += 1) {
        if (row.charCodeAt(b) === 49) this.rowBits[r * 3 + (b >> 5)] |= 1 << (31 - (b & 31));
      }
    }
    this.checkRows = new Int32Array(LDPC_N * 3);
    for (let c = 0; c < LDPC_N; c += 1) {
      const triple = columns[c];
      if (!Array.isArray(triple) || triple.length !== 3) throw new Error("Parity column must hold 3 rows");
      for (let t = 0; t < 3; t += 1) {
        const value = triple[t];
        if (!Number.isInteger(value) || value < 1 || value > LDPC_M) throw new Error("Parity row index out of range");
        this.checkRows[3 * c + t] = value - 1;
      }
    }
    // Variable-edge indexes (3 * column + slot) grouped by check row.
    const degree = new Int32Array(LDPC_M);
    for (let e = 0; e < 3 * LDPC_N; e += 1) degree[this.checkRows[e]] += 1;
    this.checkStart = new Int32Array(LDPC_M + 1);
    let at = 0;
    let widest = 0;
    for (let m = 0; m < LDPC_M; m += 1) {
      this.checkStart[m] = at;
      at += degree[m];
      widest = Math.max(widest, degree[m]);
    }
    this.checkStart[LDPC_M] = at;
    this.maxCheckDegree = widest;
    this.checkEdges = new Int32Array(LDPC_N * 3);
    const fill = new Int32Array(LDPC_M);
    for (let e = 0; e < 3 * LDPC_N; e += 1) {
      const m = this.checkRows[e];
      this.checkEdges[this.checkStart[m] + fill[m]] = e;
      fill[m] += 1;
    }
  }

  // Sum-product belief propagation. Positive LLR means bit 0. Returns the codeword once every parity check holds,
  // or null after maxIterations updates.
  decode(llr174, maxIterations, budget) {
    if (!llr174 || llr174.length !== LDPC_N || !(maxIterations >= 1) || !budget) {
      throw new TypeError("174 LLRs, a positive iteration limit and a budget are required");
    }
    for (let i = 0; i < LDPC_N; i += 1) {
      if (!Number.isFinite(llr174[i])) throw new TypeError("LLRs must be finite");
    }
    budget.checkpoint();
    const c2v = new Float64Array(3 * LDPC_N);
    const v2c = new Float64Array(3 * LDPC_N);
    const bits = new Uint8Array(LDPC_N);
    const th = new Float64Array(this.maxCheckDegree);
    const prefix = new Float64Array(this.maxCheckDegree + 1);
    const suffix = new Float64Array(this.maxCheckDegree + 1);
    for (let iteration = 0; ; iteration += 1) {
      for (let c = 0; c < LDPC_N; c += 1) {
        const b = 3 * c;
        const total = llr174[c] + c2v[b] + c2v[b + 1] + c2v[b + 2];
        bits[c] = total < 0 ? 1 : 0;
        v2c[b] = clamp(total - c2v[b], MESSAGE_LIMIT);
        v2c[b + 1] = clamp(total - c2v[b + 1], MESSAGE_LIMIT);
        v2c[b + 2] = clamp(total - c2v[b + 2], MESSAGE_LIMIT);
      }
      if (this.parityHolds(bits)) return bits;
      if (iteration >= maxIterations) return null;
      budget.checkpoint();
      for (let m = 0; m < LDPC_M; m += 1) {
        const from = this.checkStart[m];
        const degree = this.checkStart[m + 1] - from;
        prefix[0] = 1;
        for (let i = 0; i < degree; i += 1) {
          // tanh(v/2) = (e^v - 1) / (e^v + 1)
          const e = Math.exp(v2c[this.checkEdges[from + i]]);
          th[i] = (e - 1) / (e + 1);
          prefix[i + 1] = prefix[i] * th[i];
        }
        suffix[degree] = 1;
        for (let i = degree - 1; i >= 0; i -= 1) suffix[i] = suffix[i + 1] * th[i];
        for (let i = 0; i < degree; i += 1) {
          const x = clamp(prefix[i] * suffix[i + 1], 1 - 1e-12);
          c2v[this.checkEdges[from + i]] = clamp(Math.log((1 + x) / (1 - x)), MESSAGE_LIMIT);
        }
      }
    }
  }

  parityHolds(bits) {
    for (let m = 0; m < LDPC_M; m += 1) {
      let parity = 0;
      for (let i = this.checkStart[m], end = this.checkStart[m + 1]; i < end; i += 1) {
        parity ^= bits[(this.checkEdges[i] / 3) | 0];
      }
      if (parity) return false;
    }
    return true;
  }

  // Returns message91 followed by 83 parity bits.
  encode(message91) {
    requireBits(message91, LDPC_K, "message91");
    const words = new Uint32Array(3);
    for (let b = 0; b < LDPC_K; b += 1) {
      if (message91[b]) words[b >> 5] |= 1 << (31 - (b & 31));
    }
    const out = new Uint8Array(LDPC_N);
    out.set(message91, 0);
    for (let j = 0; j < LDPC_M; j += 1) {
      const n = popcount32(this.rowBits[j * 3] & words[0]) + popcount32(this.rowBits[j * 3 + 1] & words[1]) +
        popcount32(this.rowBits[j * 3 + 2] & words[2]);
      out[LDPC_K + j] = n & 1;
    }
    return out;
  }

  checksPass(codeword174) {
    requireBits(codeword174, LDPC_N, "codeword174");
    const syndrome = new Uint8Array(LDPC_M);
    for (let c = 0; c < LDPC_N; c += 1) {
      if (!codeword174[c]) continue;
      syndrome[this.checkRows[3 * c]] ^= 1;
      syndrome[this.checkRows[3 * c + 1]] ^= 1;
      syndrome[this.checkRows[3 * c + 2]] ^= 1;
    }
    for (let m = 0; m < LDPC_M; m += 1) if (syndrome[m]) return false;
    return true;
  }
}

let defaultLdpc = null;

// Loads data/ftx-ldpc174.json next to this file (Node only); the parsed object may also be passed in directly.
function loadLdpc(json) {
  if (json) return json instanceof Ldpc174 ? json : new Ldpc174(json);
  if (!defaultLdpc) {
    const fs = require("node:fs");
    const path = require("node:path");
    defaultLdpc = new Ldpc174(JSON.parse(fs.readFileSync(path.join(__dirname, "data", "ftx-ldpc174.json"), "utf8")));
  }
  return defaultLdpc;
}

// ---- fec/Osd174 ----

const OSD_WORDS = 6;

// Ordered-statistics decoder used after belief propagation fails. Words are 6 x 32 bits, bit c at word c >> 5,
// position c & 31.
class Osd174 {
  constructor(ldpc) {
    if (!ldpc) throw new TypeError("LDPC tables required");
    this.ldpc = ldpc;
    this.generator = [];
    for (let r = 0; r < LDPC_K; r += 1) {
      const unit = new Uint8Array(LDPC_K);
      unit[r] = 1;
      const word = ldpc.encode(unit);
      const g = new Uint32Array(OSD_WORDS);
      for (let c = 0; c < LDPC_N; c += 1) if (word[c]) g[c >> 5] |= 1 << (c & 31);
      this.generator.push(g);
    }
  }

  // Returns {word, distance, hardErrors} for the CRC-valid closest word, or null.
  decode(llr174, order, maxHardErrors, fixedAbove, budget) {
    if (!llr174 || llr174.length !== LDPC_N || !(order >= 0 && order <= 2) || !budget) {
      throw new TypeError("174 LLRs, an order of 0..2 and a budget are required");
    }
    for (let i = 0; i < LDPC_N; i += 1) {
      if (!Number.isFinite(llr174[i])) throw new TypeError("LLRs must be finite");
    }
    budget.checkpoint();

    // Most reliable first; equal reliabilities put the higher index first (as the Java key sort does).
    const mag = new Float32Array(LDPC_N);
    for (let i = 0; i < LDPC_N; i += 1) mag[i] = Math.abs(llr174[i]);
    const order174 = Array.from({ length: LDPC_N }, (_, i) => i).sort((a, b) => mag[a] - mag[b] || a - b);
    const perm = new Int32Array(LDPC_N);
    for (let k = 0; k < LDPC_N; k += 1) perm[k] = order174[LDPC_N - 1 - k];

    const rows = [];
    for (let r = 0; r < LDPC_K; r += 1) {
      const row = new Uint32Array(OSD_WORDS);
      const g = this.generator[r];
      for (let k = 0; k < LDPC_N; k += 1) {
        const src = perm[k];
        if ((g[src >> 5] >>> (src & 31)) & 1) row[k >> 5] |= 1 << (k & 31);
      }
      rows.push(row);
    }
    const pivot = new Int32Array(LDPC_K);
    let rank = 0;
    for (let col = 0; col < LDPC_N && rank < LDPC_K; col += 1) {
      const w = col >> 5;
      const m = 1 << (col & 31);
      let p = -1;
      for (let r = rank; r < LDPC_K; r += 1) {
        if (rows[r][w] & m) {
          p = r;
          break;
        }
      }
      if (p < 0) continue;
      const t = rows[p];
      rows[p] = rows[rank];
      rows[rank] = t;
      const pr = rows[rank];
      for (let r = 0; r < LDPC_K; r += 1) {
        if (r !== rank && (rows[r][w] & m)) {
          for (let i = 0; i < OSD_WORDS; i += 1) rows[r][i] ^= pr[i];
        }
      }
      pivot[rank] = col;
      rank += 1;
    }
    if (rank < LDPC_K) return null;

    const abs = new Float64Array(LDPC_N);
    const hard = new Uint32Array(OSD_WORDS);
    for (let k = 0; k < LDPC_N; k += 1) {
      const v = llr174[perm[k]];
      abs[k] = Math.abs(v);
      if (v < 0) hard[k >> 5] |= 1 << (k & 31);
    }
    const base = new Uint32Array(OSD_WORDS);
    for (let r = 0; r < LDPC_K; r += 1) {
      if ((hard[pivot[r] >> 5] >>> (pivot[r] & 31)) & 1) {
        for (let i = 0; i < OSD_WORDS; i += 1) base[i] ^= rows[r][i];
      }
    }
    let flippable = 0;
    const flips = new Int32Array(LDPC_K);
    for (let r = 0; r < LDPC_K; r += 1) if (abs[pivot[r]] < fixedAbove) flips[flippable++] = r;

    const best = Uint32Array.from(base);
    let bestDistance = osdDistance(base, hard, abs);
    const trial = new Uint32Array(OSD_WORDS);
    const keep = () => {
      const d = osdDistance(trial, hard, abs);
      if (d < bestDistance) {
        best.set(trial);
        bestDistance = d;
      }
    };
    if (order >= 1) {
      for (let a = 0; a < flippable; a += 1) {
        if ((a & 7) === 0) budget.checkpoint();
        const ra = rows[flips[a]];
        for (let i = 0; i < OSD_WORDS; i += 1) trial[i] = base[i] ^ ra[i];
        keep();
        if (order < 2) continue;
        for (let b = a + 1; b < flippable; b += 1) {
          const rb = rows[flips[b]];
          for (let i = 0; i < OSD_WORDS; i += 1) trial[i] = base[i] ^ ra[i] ^ rb[i];
          keep();
        }
      }
    }

    let errors = 0;
    const word = new Uint8Array(LDPC_N);
    for (let k = 0; k < LDPC_N; k += 1) {
      const bit = (best[k >> 5] >>> (k & 31)) & 1;
      word[perm[k]] = bit;
      if (bit !== ((hard[k >> 5] >>> (k & 31)) & 1)) errors += 1;
    }
    if (errors > maxHardErrors) return null;
    const payload = word.slice(0, 77);
    let crc = 0;
    for (let i = 77; i < LDPC_K; i += 1) crc = (crc << 1) | word[i];
    if (Crc14.compute(payload) !== crc) return null;
    if (!this.ldpc.checksPass(word)) return null;
    return { word, distance: bestDistance, hardErrors: errors };
  }
}

// Sum of |LLR| over the bits where the word disagrees with the hard decisions, in ascending bit order.
function osdDistance(word, hard, abs) {
  let sum = 0;
  for (let w = 0; w < OSD_WORDS; w += 1) {
    let diff = (word[w] ^ hard[w]) | 0;
    while (diff !== 0) {
      const low = diff & -diff;
      sum += abs[(w << 5) + 31 - Math.clz32(low)];
      diff ^= low;
    }
  }
  return sum;
}

// ---- dsp/Fft ----

// In-place forward complex FFT for sizes whose prime factors are 2, 3 and 5 (Stockham autosort, mixed radix).
class Fft {
  constructor(n) {
    if (!Number.isInteger(n) || n < 1) throw new RangeError("FFT size must be positive");
    let rest = n;
    const found = [];
    for (let p = 2; p <= 5; p += 1) {
      if (p === 4) continue;
      while (rest % p === 0) {
        found.push(p);
        rest /= p;
      }
    }
    if (rest !== 1) throw new RangeError("FFT size must have only prime factors 2, 3 and 5");
    this.n = n;
    this.radices = found;
    this.weights = found.map(p => {
      const w = new Int32Array(p * p);
      for (let r = 0; r < p; r += 1) for (let k = 0; k < p; k += 1) w[r * p + k] = ((r * k) % p) * (n / p);
      return w;
    });
    this.cos = new Float64Array(n);
    this.sin = new Float64Array(n);
    for (let k = 0; k < n; k += 1) {
      const angle = (-2 * Math.PI * k) / n;
      this.cos[k] = Math.cos(angle);
      this.sin[k] = Math.sin(angle);
    }
    this.scratchRe = new Float64Array(n);
    this.scratchIm = new Float64Array(n);
    this.aRe = new Float64Array(5);
    this.aIm = new Float64Array(5);
  }

  // X[k] = sum x[j] * exp(-2 pi i j k / n), computed in place.
  forward(re, im) {
    const n = this.n;
    if (!re || !im || re.length !== n || im.length !== n) throw new RangeError("Arrays must have the FFT size");
    const { cos, sin, aRe, aIm } = this;
    let srcRe = re;
    let srcIm = im;
    let dstRe = this.scratchRe;
    let dstIm = this.scratchIm;
    let length = n;
    let stride = 1;
    let stage = 0;
    for (const p of this.radices) {
      const w = this.weights[stage];
      stage += 1;
      const m = length / p;
      const unit = n / length;
      for (let j = 0; j < m; j += 1) {
        for (let q = 0; q < stride; q += 1) {
          for (let r = 0; r < p; r += 1) {
            const at = q + stride * (j + m * r);
            aRe[r] = srcRe[at];
            aIm[r] = srcIm[at];
          }
          for (let k = 0; k < p; k += 1) {
            let sr = 0;
            let si = 0;
            for (let r = 0; r < p; r += 1) {
              const wi = w[r * p + k];
              sr += aRe[r] * cos[wi] - aIm[r] * sin[wi];
              si += aRe[r] * sin[wi] + aIm[r] * cos[wi];
            }
            const t = j * k * unit;
            const out = q + stride * (p * j + k);
            dstRe[out] = sr * cos[t] - si * sin[t];
            dstIm[out] = sr * sin[t] + si * cos[t];
          }
        }
      }
      let swap = srcRe;
      srcRe = dstRe;
      dstRe = swap;
      swap = srcIm;
      srcIm = dstIm;
      dstIm = swap;
      length = m;
      stride *= p;
    }
    if (srcRe !== re) {
      re.set(srcRe);
      im.set(srcIm);
    }
  }
}

// ---- ftx/GfskSynth ----

const RAMP_FT8_EDGE_240 = "FT8_EDGE_240";
const SQRT_PI = Math.sqrt(Math.PI);
const pulseCache = new Map();

// erf(x): series for |x| < 3, continued fraction for larger |x| (both accurate to about 1e-15).
function erf(x) {
  const a = Math.abs(x);
  let result;
  if (a < 3) {
    let term = a;
    let sum = a;
    for (let n = 1; n < 200 && term > 1e-18 * sum; n += 1) {
      term *= (2 * a * a) / (2 * n + 1);
      sum += term;
    }
    result = (2 / SQRT_PI) * Math.exp(-a * a) * sum;
  } else if (a > 6.5) {
    result = 1;
  } else {
    let t = a;
    for (let k = 60; k >= 1; k -= 1) t = a + k / 2 / t;
    result = 1 - Math.exp(-a * a) / (SQRT_PI * t);
  }
  return x < 0 ? -result : result;
}

function pulseTable(sps, bt) {
  const key = `${sps}:${bt}`;
  let table = pulseCache.get(key);
  if (!table) {
    const k = Math.PI * Math.sqrt(2 / Math.log(2));
    table = new Float64Array(3 * sps);
    for (let m = 0; m < table.length; m += 1) {
      const x = (m - 1.5 * sps) / sps;
      table[m] = (erf(k * bt * (x + 0.5)) - erf(k * bt * (x - 0.5))) / 2;
    }
    pulseCache.set(key, table);
  }
  return table;
}

// Gaussian-filtered FSK synthesizer; only the FT8 edge ramp (raised cosine over the first/last symbol/8) is ported.
class GfskSynth {
  constructor(samplesPerSymbol, bt, toneSpacingHz, sampleRate, rampMode) {
    if (!(samplesPerSymbol >= 8) || !(bt > 0) || !Number.isFinite(bt) || !(toneSpacingHz > 0) ||
        !Number.isFinite(toneSpacingHz) || !(sampleRate >= 8000) || rampMode !== RAMP_FT8_EDGE_240) {
      throw new RangeError("Invalid GFSK parameters");
    }
    this.sps = samplesPerSymbol;
    this.spacingHz = toneSpacingHz;
    this.sampleRate = sampleRate;
    this.pulse = pulseTable(samplesPerSymbol, bt);
    const length = (samplesPerSymbol / 8) | 0;
    this.ramp = new Float64Array(length);
    for (let i = 0; i < length; i += 1) this.ramp[i] = 0.5 * (1 - Math.cos((Math.PI * i) / length));
  }

  // The carrier phase starts at startPhase radians (pi/2 gives the cosine form).
  synth(tones, tone0Hz, startPhase = 0) {
    if (!tones || tones.length === 0 || !(tone0Hz >= 0) || !Number.isFinite(tone0Hz)) {
      throw new TypeError("Tones and a finite tone-0 frequency required");
    }
    const sps = this.sps;
    const symbols = tones.length;
    for (let j = 0; j < symbols; j += 1) if (!(tones[j] >= 0)) throw new RangeError("Negative tone");
    const total = symbols * sps;
    const track = new Float64Array(total);
    for (let j = -1; j <= symbols; j += 1) {
      const tone = tones[j < 0 ? 0 : (j >= symbols ? symbols - 1 : j)];
      if (tone === 0) continue;
      const start = (j - 1) * sps;
      const from = Math.max(0, start);
      const to = Math.min(total, start + 3 * sps);
      for (let i = from; i < to; i += 1) track[i] += tone * this.pulse[i - start];
    }
    const out = new Float32Array(total);
    const twoPi = 2 * Math.PI;
    const step = twoPi / this.sampleRate;
    const rampLength = this.ramp.length;
    let phase = startPhase;
    for (let i = 0; i < total; i += 1) {
      let env = 1;
      if (i < rampLength) env = this.ramp[i];
      const fromEnd = total - 1 - i;
      if (fromEnd < rampLength) env = Math.min(env, this.ramp[fromEnd]);
      out[i] = 0.5 * env * Math.sin(phase);
      phase += step * (tone0Hz + this.spacingHz * track[i]);
      if (phase >= twoPi) phase -= twoPi * Math.floor(phase / twoPi);
    }
    return out;
  }
}

// ---- ftx/FtxFrames (FT8 part) ----

function codeword(payload77, ldpc) {
  requireBits(payload77, 77, "payload77");
  const word = ldpc.encode(Crc14.appendCrc(payload77));
  if (!ldpc.checksPass(word)) throw new Error("Encoded word fails parity checks");
  return word;
}

function ft8Tones(codeword174) {
  requireBits(codeword174, 174, "codeword");
  const tones = new Array(79).fill(0);
  for (let s = 0; s < 3; s += 1) for (let i = 0; i < 7; i += 1) tones[36 * s + i] = FT8_COSTAS[i];
  for (let k = 0; k < 58; k += 1) {
    const v = (codeword174[3 * k] << 2) | (codeword174[3 * k + 1] << 1) | codeword174[3 * k + 2];
    tones[(k < 29 ? 7 : 14) + k] = FT8_GRAY[v];
  }
  return tones;
}

// Requires the band tone0-2*spacing .. tone0+(toneCount+1)*spacing to lie within 100..5000 Hz.
function checkBand(tone0Hz, spacingHz, toneCount) {
  if (!Number.isFinite(tone0Hz)) throw new RangeError("tone0Hz must be finite");
  const low = tone0Hz - 2 * spacingHz;
  const high = tone0Hz + (toneCount + 1) * spacingHz;
  if (low < 100 || high > 5000) throw new RangeError(`Occupied band ${low}..${high} Hz outside 100..5000 Hz`);
}

// ---- ftx/Pack77 and ftx/Unpack77 (type 1 and type 2) ----

const A0 = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const A1 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const A2 = "0123456789";
const A3 = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const C28_BASE = 6257896;
const G15_GRID_END = 32400;
const G15_NONE = 32401;
const G15_RRR = 32402;
const G15_RR73 = 32403;
const G15_73 = 32404;
const G15_REPORT = 32435;

const isDigit = c => c >= "0" && c <= "9";

function invalidMessage(message) {
  return codedError("INVALID_MESSAGE", `Unsupported message: "${message}"`);
}

function packCall(token, message) {
  const result = { c28: 0, rover: false, portable: false };
  let base = token;
  if (token.endsWith("/R")) {
    result.rover = true;
    base = token.slice(0, -2);
  } else if (token.endsWith("/P")) {
    result.portable = true;
    base = token.slice(0, -2);
  }
  if (base.length < 3 || base.length > 6) throw invalidMessage(message);
  for (const c of base) if (!(isDigit(c) || (c >= "A" && c <= "Z"))) throw invalidMessage(message);
  let norm = "";
  if (!isDigit(base[2]) && isDigit(base[1])) norm += " ";
  norm += base;
  if (norm.length > 6) throw invalidMessage(message);
  norm = norm.padEnd(6, " ");
  const a0 = A0.indexOf(norm[0]);
  const a1 = A1.indexOf(norm[1]);
  const a2 = A2.indexOf(norm[2]);
  const a3 = A3.indexOf(norm[3]);
  const a4 = A3.indexOf(norm[4]);
  const a5 = A3.indexOf(norm[5]);
  if (a0 < 0 || a1 < 0 || a2 < 0 || a3 < 0 || a4 < 0 || a5 < 0) throw invalidMessage(message);
  if ((norm[3] === " " && norm[4] !== " ") || (norm[4] === " " && norm[5] !== " ")) throw invalidMessage(message);
  result.c28 = C28_BASE + ((((a0 * 36 + a1) * 10 + a2) * 27 + a3) * 27 + a4) * 27 + a5;
  return result;
}

function isGrid(t) {
  return t.length === 4 && t[0] >= "A" && t[0] <= "R" && t[1] >= "A" && t[1] <= "R" && isDigit(t[2]) && isDigit(t[3]);
}

function gridValue(t) {
  return ((t.charCodeAt(0) - 65) * 18 + (t.charCodeAt(1) - 65)) * 100 + (t.charCodeAt(2) - 48) * 10 + (t.charCodeAt(3) - 48);
}

function reportValue(t, message) {
  if (t.length !== 3 || (t[0] !== "+" && t[0] !== "-") || !isDigit(t[1]) || !isDigit(t[2])) throw invalidMessage(message);
  let value = (t.charCodeAt(1) - 48) * 10 + (t.charCodeAt(2) - 48);
  if (t[0] === "-") value = -value;
  if (value < -30 || value > 49) throw invalidMessage(message);
  return value;
}

function putBits(bits, start, width, value) {
  for (let i = 0; i < width; i += 1) bits[start + i] = (value >>> (width - 1 - i)) & 1;
}

function getBits(bits, start, width) {
  let v = 0;
  for (let i = 0; i < width; i += 1) v = v * 2 + bits[start + i];
  return v;
}

// Packs the ftx-standard-77-v1 grammar (type 1 and type 2) into 77 bits.
function pack77(message) {
  if (typeof message !== "string") throw invalidMessage("null");
  const tokens = message.split(" ");
  for (const token of tokens) {
    if (token === "") throw invalidMessage(message);
    for (const c of token) {
      if (!(isDigit(c) || (c >= "A" && c <= "Z") || c === "/" || c === "+" || c === "-")) throw invalidMessage(message);
    }
  }
  if (tokens.length < 2 || tokens.length > 4) throw invalidMessage(message);

  const specials = { DE: 0, QRZ: 1, CQ: 2 };
  const first = Object.prototype.hasOwnProperty.call(specials, tokens[0]) ? specials[tokens[0]] : -1;
  let call1 = { c28: 0, rover: false, portable: false };
  let next = 1;
  if (first >= 0) call1.c28 = first;
  else call1 = packCall(tokens[0], message);
  const call2 = packCall(tokens[next], message);
  next += 1;
  let ack = false;
  let g15 = G15_NONE;
  const remaining = tokens.length - next;
  if (remaining > 0) {
    const extra = tokens[next];
    if (first >= 0) {
      if (remaining !== 1 || !isGrid(extra)) throw invalidMessage(message);
      g15 = gridValue(extra);
    } else if (remaining === 2) {
      if (extra !== "R" || !isGrid(tokens[next + 1])) throw invalidMessage(message);
      ack = true;
      g15 = gridValue(tokens[next + 1]);
    } else if (remaining === 1) {
      if (extra === "RRR") g15 = G15_RRR;
      else if (extra === "73") g15 = G15_73;
      else if (isGrid(extra)) g15 = gridValue(extra);
      else {
        let number = extra;
        if (extra[0] === "R") {
          ack = true;
          number = extra.slice(1);
        }
        g15 = G15_REPORT + reportValue(number, message);
      }
    } else {
      throw invalidMessage(message);
    }
  }

  const anyRover = call1.rover || call2.rover;
  const anyPortable = call1.portable || call2.portable;
  if (anyRover && anyPortable) throw invalidMessage(message);
  const bits = new Uint8Array(77);
  putBits(bits, 0, 28, call1.c28);
  putBits(bits, 28, 1, call1.rover || call1.portable ? 1 : 0);
  putBits(bits, 29, 28, call2.c28);
  putBits(bits, 57, 1, call2.rover || call2.portable ? 1 : 0);
  putBits(bits, 58, 1, ack ? 1 : 0);
  putBits(bits, 59, 15, g15);
  putBits(bits, 74, 3, anyPortable ? 2 : 1);
  return bits;
}

function callText(c28) {
  let n = c28 - C28_BASE;
  if (n < 0) return null;
  const a5 = n % 27;
  n = Math.floor(n / 27);
  const a4 = n % 27;
  n = Math.floor(n / 27);
  const a3 = n % 27;
  n = Math.floor(n / 27);
  const a2 = n % 10;
  n = Math.floor(n / 10);
  const a1 = n % 36;
  n = Math.floor(n / 36);
  if (n >= 37) return null;
  const padded = A0[n] + A1[a1] + A2[a2] + A3[a3] + A3[a4] + A3[a5];
  const call = padded.trim();
  if (call.length < 3 || call.length > 6) return null;
  for (const c of call) if (!(isDigit(c) || (c >= "A" && c <= "Z"))) return null;
  let norm = "";
  if (!isDigit(call[2]) && isDigit(call[1])) norm += " ";
  norm += call;
  norm = norm.padEnd(6, " ");
  return norm === padded ? call : null;
}

// Returns the message text, or null for payloads outside the supported grammar.
function unpack77(payload77) {
  requireBits(payload77, 77, "payload77");
  const i3 = getBits(payload77, 74, 3);
  if (i3 !== 1 && i3 !== 2) return null;
  const c1 = getBits(payload77, 0, 28);
  const flag1 = payload77[28] === 1;
  const c2 = getBits(payload77, 29, 28);
  const flag2 = payload77[57] === 1;
  const ack = payload77[58] === 1;
  const g15 = getBits(payload77, 59, 15);
  const suffix = i3 === 1 ? "/R" : "/P";

  let first;
  const special = c1 < C28_BASE;
  if (special) {
    if (flag1 || c1 > 2) return null;
    first = c1 === 0 ? "DE" : (c1 === 1 ? "QRZ" : "CQ");
  } else {
    first = callText(c1);
    if (first === null) return null;
    if (flag1) first += suffix;
  }
  if (c2 < C28_BASE) return null;
  let second = callText(c2);
  if (second === null) return null;
  if (flag2) second += suffix;

  let extra;
  if (g15 < G15_GRID_END) {
    extra = String.fromCharCode(65 + Math.floor(g15 / 1800), 65 + (Math.floor(g15 / 100) % 18),
      48 + (Math.floor(g15 / 10) % 10), 48 + (g15 % 10));
    if (ack) {
      if (special) return null;
      extra = `R ${extra}`;
    }
  } else if (special) {
    if (g15 !== G15_NONE || ack) return null;
    extra = null;
  } else if (g15 === G15_NONE) {
    if (ack) return null;
    extra = null;
  } else if (g15 === G15_RRR || g15 === G15_RR73 || g15 === G15_73) {
    if (ack) return null;
    extra = g15 === G15_RRR ? "RRR" : (g15 === G15_RR73 ? "RR73" : "73");
  } else if (g15 > G15_73 && g15 <= G15_REPORT + 49 && g15 >= G15_REPORT - 30) {
    const r = g15 - G15_REPORT;
    const magnitude = Math.abs(r);
    extra = (ack ? "R" : "") + (r < 0 ? "-" : "+") + String.fromCharCode(48 + Math.floor(magnitude / 10), 48 + (magnitude % 10));
  } else {
    return null;
  }
  return extra === null ? `${first} ${second}` : `${first} ${second} ${extra}`;
}

// ---- ft8/Ft8Encoder ----

let ft8Synth = null;

function ft8Waveform(tones, tone0Hz) {
  checkBand(tone0Hz, TONE_SPACING_HZ, 8);
  if (!ft8Synth) ft8Synth = new GfskSynth(1920, 2.0, TONE_SPACING_HZ, SAMPLE_RATE, RAMP_FT8_EDGE_240);
  return ft8Synth.synth(tones, tone0Hz);
}

// Message text to 151680 samples at 12000 Hz (tone 0 at tone0Hz).
function encodeFt8(message, tone0Hz, ldpcTables) {
  const ldpc = loadLdpc(ldpcTables);
  return ft8Waveform(ft8Tones(codeword(pack77(message), ldpc)), tone0Hz);
}

// ---- ftx/FtxRxProfile (FT8) ----

const FT8 = (() => {
  const sps = 1920;
  const tones = 8;
  const dataPos = [];
  for (let i = 7; i <= 35; i += 1) dataPos.push(i);
  for (let i = 43; i <= 71; i += 1) dataPos.push(i);
  const syncTones = [3, 1, 4, 0, 6, 5, 2];
  const bitsPerSymbol = 3;
  if (dataPos.length * bitsPerSymbol !== 174) throw new Error("Profile must carry 174 bits");
  return {
    tones,
    sps,
    symbols: 79,
    toneSpacingHz: SAMPLE_RATE / sps,
    syncStart: [0, 36, 72],
    syncTones: [syncTones, syncTones, syncTones],
    dataPos,
    bitsPerSymbol,
    toneToValue: [0, 1, 3, 2, 6, 4, 5, 7],
    minSamples: 151680,
    maxSamples: 180000,
    startMin: -18000,
    startMax: 30000,
    minBlocks: 2,
    firHalf: 140,
    firCutoffHz: 110,
    refineHz: 2.5,
    hzStep: 0.25,
    maxPasses: 3,
    nominalStartSeconds: 0.5,
    llrScale: 2.8,
    hop: sps / 4,
    fftSize: 2 * sps,
    binHz: SAMPLE_RATE / (2 * sps),
    decim: sps / BB_SYM,
    bbRate: SAMPLE_RATE / (sps / BB_SYM),
    bandCenterHz: ((tones - 1) / 2) * (SAMPLE_RATE / sps),
    dupRefinedHz: 0.32 * (SAMPLE_RATE / sps),
  };
})();

// ---- ftx/FtxReceiver (FT8 profile) ----

function makeBudget(options) {
  if (options.budget && typeof options.budget.checkpoint === "function") return options.budget;
  if (options.maxWorkMs > 0) {
    const now = typeof options.now === "function" ? options.now : Date.now;
    const deadline = now() + options.maxWorkMs;
    return {
      checkpoint() {
        if (now() > deadline) throw codedError("BUDGET_EXCEEDED", "Decode work budget exceeded");
      },
    };
  }
  return { checkpoint() {} };
}

class Run {
  constructor(receiver, samples, request) {
    const p = FT8;
    this.receiver = receiver;
    this.p = p;
    this.x = samples;
    this.len = samples.length;
    this.request = request;
    this.budget = request.budget;
    this.sps = p.sps;
    this.hop = p.hop;
    this.bbSpan = 2 * TIME_RANGE + p.symbols * BB_SYM + 2;
    this.dataSyms = p.dataPos.length;
    this.bps = p.bitsPerSymbol;
    this.later = false;
    this.noiseSigma2 = 0;
    this.unsupported = false;
    this.power = null;
    this.binLo = 0;
    this.binHi = 0;
    this.mixHz = 0;
    this.cosT = [];
    this.sinT = [];
    for (let t = 0; t < p.tones; t += 1) {
      this.cosT.push(new Float64Array(BB_SYM));
      this.sinT.push(new Float64Array(BB_SYM));
    }
    this.amp = new Float64Array(p.tones);
    this.llr = new Float64Array(174);
    this.window = new Float64Array(this.sps);
    this.fir = new Float64Array(2 * p.firHalf + 1);
    this.hcRe = new Float64Array(2 * p.firHalf + 1);
    this.hcIm = new Float64Array(2 * p.firHalf + 1);
    this.bbRe = new Float64Array(this.bbSpan);
    this.bbIm = new Float64Array(this.bbSpan);
    this.firPower = 0;

    this.minStep = Math.floor(p.startMin / this.hop);
    this.maxStep = Math.max(this.minStep, Math.floor(p.startMax / this.hop));
    for (let n = 0; n < this.sps; n += 1) this.window[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / this.sps);
    // Hamming-windowed sinc low-pass with unit DC gain.
    let sum = 0;
    for (let k = -p.firHalf; k <= p.firHalf; k += 1) {
      const a = (2 * p.firCutoffHz) / SAMPLE_RATE;
      const sinc = k === 0 ? a : Math.sin(Math.PI * a * k) / (Math.PI * k);
      const w = 0.54 + 0.46 * Math.cos((Math.PI * k) / p.firHalf);
      this.fir[k + p.firHalf] = sinc * w;
      sum += sinc * w;
    }
    for (let i = 0; i < this.fir.length; i += 1) {
      this.fir[i] /= sum;
      this.firPower += this.fir[i] * this.fir[i];
    }
  }

  execute() {
    const p = this.p;
    const request = this.request;
    const bMin = Math.max(2, Math.ceil(request.minAudioHz / p.binHz));
    const bMax = Math.floor(request.maxAudioHz / p.binHz);
    const marginBins = Math.ceil(MARGIN_HZ / p.binHz);
    const hits = [];
    if (bMax >= bMin) {
      this.binLo = Math.max(0, bMin - marginBins);
      this.binHi = Math.min(p.fftSize / 2, bMax + 2 * p.tones + marginBins);
      this.spectrogram();
      // Mean of an exponential power distribution is its median over ln 2; Hann sum of squares is 3/8 N.
      this.noiseSigma2 = this.bandNoise(bMin, bMax) / Math.log(2) / (0.375 * this.sps);
      this.runPass(hits, bMin, bMax);
      this.later = true;
      const original = this.x;
      let residual = null;
      let before = 0;
      for (let pass = 2; pass <= p.maxPasses; pass += 1) {
        const fromIndex = before;
        before = hits.length;
        if (fromIndex === before && pass > 2) break;
        if (before === 0) break;
        if (residual === null) residual = Float32Array.from(original);
        for (let i = fromIndex; i < before; i += 1) {
          this.budget.checkpoint();
          this.subtract(residual, hits[i]);
        }
        this.x = residual;
        this.spectrogram();
        this.runPass(hits, bMin, bMax);
      }
      this.x = original;
      this.later = false;
    }
    hits.sort((a, b) => {
      if (a.dt !== b.dt) return a.dt < b.dt ? -1 : 1;
      if (a.hz !== b.hz) return a.hz < b.hz ? -1 : 1;
      return a.text < b.text ? -1 : (a.text > b.text ? 1 : 0);
    });
    return hits.map(h => ({ text: h.text, frequencyHz: h.hz, dtSeconds: h.dt, snrDb: h.snr }));
  }

  runPass(hits, bMin, bMax) {
    const candidates = this.syncSearch(bMin, bMax);
    const processed = [];
    for (const c of candidates) {
      this.budget.checkpoint();
      const hit = this.decodeCandidate(c, processed);
      if (hit === null) continue;
      if (this.later) {
        const known = hits.some(old => old.text === hit.text && Math.abs(old.hz - hit.hz) <= DUPLICATE_HZ);
        if (!known) hits.push(hit);
      } else {
        this.addHit(hits, hit);
      }
    }
  }

  // Least-squares amplitude of the regenerated waveform per interval (cosine and sine references), smoothed over
  // +/-2 intervals, then removed from r.
  subtract(r, h) {
    const p = this.p;
    const sps = this.sps;
    const len = this.len;
    const count = p.symbols;
    const ref0 = ft8WaveformPhase(h.tones, h.hz, 0);
    const ref1 = ft8WaveformPhase(h.tones, h.hz, Math.PI / 2);
    const a = new Float64Array(count);
    const b = new Float64Array(count);
    const ok = new Array(count).fill(false);
    for (let k = 0; k < count; k += 1) {
      const base = h.start + k * sps;
      const n0 = Math.max(0, -base);
      const n1 = Math.min(sps, len - base);
      if (n1 <= n0) continue;
      let scc = 0;
      let sss = 0;
      let scs = 0;
      let sxc = 0;
      let sxs = 0;
      for (let n = n0; n < n1; n += 1) {
        const c = ref1[k * sps + n];
        const s = ref0[k * sps + n];
        const v = r[base + n];
        scc += c * c;
        sss += s * s;
        scs += c * s;
        sxc += v * c;
        sxs += v * s;
      }
      const det = scc * sss - scs * scs;
      if (!(det > 1e-9 * (scc * sss) && scc * sss > 0)) continue;
      a[k] = (sxc * sss - sxs * scs) / det;
      b[k] = (sxs * scc - sxc * scs) / det;
      ok[k] = true;
    }
    for (let k = 0; k < count; k += 1) {
      let sa = 0;
      let sb = 0;
      let used = 0;
      for (let j = Math.max(0, k - 2); j <= Math.min(count - 1, k + 2); j += 1) {
        if (!ok[j]) continue;
        sa += a[j];
        sb += b[j];
        used += 1;
      }
      if (used === 0) continue;
      sa /= used;
      sb /= used;
      const base = h.start + k * sps;
      const n0 = Math.max(0, -base);
      const n1 = Math.min(sps, len - base);
      for (let n = n0; n < n1; n += 1) r[base + n] -= sa * ref1[k * sps + n] + sb * ref0[k * sps + n];
    }
  }

  // Median of the spectrogram power over the whole search band and all frames fully inside the buffer.
  bandNoise(bMin, bMax) {
    const p = this.p;
    const lo = bMin - this.binLo;
    const hi = Math.min(this.binHi - this.binLo, bMax + 2 * p.tones - this.binLo);
    return this.medianPower(lo, hi, 1, 0);
  }

  // Median spectrogram power over row indexes lo..hi (skipping skipLo..skipHi) of the frames fully inside the audio.
  medianPower(lo, hi, skipLo, skipHi) {
    const frames = this.power.length;
    const buf = new Float32Array(frames * (hi - lo + 1));
    let count = 0;
    for (let f = 0; f < frames; f += 1) {
      const first = (this.minStep + f) * this.hop;
      if (first < 0 || first + this.sps > this.len) continue;
      const row = this.power[f];
      for (let i = lo; i <= hi; i += 1) {
        if (i >= skipLo && i <= skipHi) continue;
        buf[count++] = row[i];
      }
    }
    if (count === 0) return 0;
    const used = buf.subarray(0, count);
    used.sort();
    return used[Math.floor(count / 2)];
  }

  // White-noise-equivalent variance around one signal. A receiver passband (SSB filter, DSP) leaves most of the
  // 100..4500 Hz search band nearly empty, so the band-wide median underestimates the noise the signal competes with.
  localNoiseSigma2(hz) {
    const p = this.p;
    const lo = Math.max(this.binLo, Math.floor((hz - NOISE_SIDE_HZ) / p.binHz));
    const hi = Math.min(this.binHi, Math.ceil((hz + (p.tones - 1) * p.toneSpacingHz + NOISE_SIDE_HZ) / p.binHz));
    const skipLo = Math.floor((hz - NOISE_GUARD_HZ) / p.binHz);
    const skipHi = Math.ceil((hz + (p.tones - 1) * p.toneSpacingHz + NOISE_GUARD_HZ) / p.binHz);
    if (hi < lo) return this.noiseSigma2;
    const median = this.medianPower(lo - this.binLo, hi - this.binLo, skipLo - this.binLo, skipHi - this.binLo);
    return median > 0 ? median / Math.log(2) / (0.375 * this.sps) : this.noiseSigma2;
  }

  addHit(hits, hit) {
    for (let i = 0; i < hits.length; i += 1) {
      const old = hits[i];
      if (old.text === hit.text && Math.abs(old.hz - hit.hz) <= DUPLICATE_HZ) {
        if (hit.score > old.score) hits[i] = hit;
        return;
      }
    }
    hits.push(hit);
  }

  // Hann-windowed power for every hop; two real frames share one complex FFT.
  spectrogram() {
    const p = this.p;
    const frames = this.maxStep + 4 * (p.symbols - 1) - this.minStep + 1;
    const width = this.binHi - this.binLo + 1;
    if (this.power === null) this.power = Array.from({ length: frames }, () => new Float32Array(width));
    if (!this.fft) this.fft = new Fft(p.fftSize);
    const fftSize = p.fftSize;
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);
    for (let f = 0; f < frames; f += 2) {
      this.budget.checkpoint();
      re.fill(0);
      im.fill(0);
      this.load(re, (this.minStep + f) * this.hop);
      const pair = f + 1 < frames;
      if (pair) this.load(im, (this.minStep + f + 1) * this.hop);
      this.fft.forward(re, im);
      const rowA = this.power[f];
      const rowB = pair ? this.power[f + 1] : null;
      for (let k = this.binLo; k <= this.binHi; k += 1) {
        const nk = k === 0 ? 0 : fftSize - k;
        const ar = 0.5 * (re[k] + re[nk]);
        const ai = 0.5 * (im[k] - im[nk]);
        rowA[k - this.binLo] = ar * ar + ai * ai;
        if (pair) {
          const br = 0.5 * (im[k] + im[nk]);
          const bi = -0.5 * (re[k] - re[nk]);
          rowB[k - this.binLo] = br * br + bi * bi;
        }
      }
    }
  }

  load(dst, first) {
    for (let n = 0; n < this.sps; n += 1) {
      const at = first + n;
      if (at >= 0 && at < this.len) dst[n] = this.x[at] * this.window[n];
    }
  }

  syncSearch(bMin, bMax) {
    const p = this.p;
    const sps = this.sps;
    const power = this.power;
    const steps = this.maxStep - this.minStep + 1;
    const bins = bMax - bMin + 1;
    const blocks = p.syncStart.length;
    const blockLen = p.syncTones[0].length;
    const blockOk = [];
    const okCount = new Int32Array(steps);
    for (let s = 0; s < steps; s += 1) {
      const start = (this.minStep + s) * this.hop;
      const flags = new Array(blocks).fill(false);
      for (let blk = 0; blk < blocks; blk += 1) {
        const from = start + sps * p.syncStart[blk];
        if (from >= 0 && from + blockLen * sps <= this.len) {
          flags[blk] = true;
          okCount[s] += 1;
        }
      }
      blockOk.push(flags);
    }
    let allSum = 0;
    let allCount = 0;
    for (const row of power) {
      for (let i = 0; i < row.length; i += 1) allSum += row[i];
      allCount += row.length;
    }
    const floor = 1e-6 * (allCount > 0 ? allSum / allCount : 0) + 1e-30;
    const score = new Float32Array(bins * steps);
    let valid = 0;
    const others = p.tones - 1;
    for (let bi = 0; bi < bins; bi += 1) {
      this.budget.checkpoint();
      const base = bMin + bi - this.binLo;
      for (let s = 0; s < steps; s += 1) {
        const at = bi * steps + s;
        score[at] = -1;
        if (okCount[s] < p.minBlocks) continue;
        let sigSum = 0;
        let otherSum = 0;
        let count = 0;
        for (let blk = 0; blk < blocks; blk += 1) {
          if (!blockOk[s][blk]) continue;
          const seq = p.syncTones[blk];
          for (let i = 0; i < blockLen; i += 1) {
            const row = power[s + 4 * (p.syncStart[blk] + i)];
            const signal = row[base + 2 * seq[i]];
            let total = 0;
            for (let t = 0; t < p.tones; t += 1) total += row[base + 2 * t];
            otherSum += (total - signal) / others;
            sigSum += signal;
            count += 1;
          }
        }
        if (count > 0 && sigSum > 2 * otherSum) {
          score[at] = sigSum / (otherSum + count * floor);
          valid += 1;
        }
      }
    }
    const picked = [];
    if (valid === 0) return picked;
    const sorted = new Float32Array(valid);
    let n = 0;
    for (let i = 0; i < score.length; i += 1) if (score[i] >= 0) sorted[n++] = score[i];
    sorted.sort();
    const median = sorted[Math.floor(valid / 2)];
    if (!(median > 0)) return picked;
    const limit = SYNC_THRESHOLD * median;
    const above = [];
    for (let i = 0; i < score.length; i += 1) if (score[i] >= limit) above.push(i);
    // Best score first; equal scores put the higher index first (as the Java key sort does).
    above.sort((a, b) => score[b] - score[a] || b - a);
    for (const idx of above) {
      if (picked.length >= this.request.maxCandidates) break;
      const bi = Math.floor(idx / steps);
      const s = idx % steps;
      const near = picked.some(c => Math.abs(c.bin - (bMin + bi)) <= 4 && Math.abs(c.step - s) <= 3);
      if (near) continue;
      picked.push({ bin: bMin + bi, step: s, score: score[idx] });
    }
    return picked;
  }

  // Mixes the audio by mix Hz and low-pass filters/decimates to bbRate from baseband index first.
  buildBaseband(mix, first) {
    const p = this.p;
    const { fir, hcRe, hcIm, bbRe, bbIm, x, len } = this;
    const firHalf = p.firHalf;
    const decim = p.decim;
    this.mixHz = mix;
    const w = (2 * Math.PI * mix) / SAMPLE_RATE;
    for (let k = -firHalf; k <= firHalf; k += 1) {
      const h = fir[k + firHalf];
      hcRe[k + firHalf] = h * Math.cos(w * k);
      hcIm[k + firHalf] = -h * Math.sin(w * k);
    }
    for (let i = 0; i < this.bbSpan; i += 1) {
      const n = decim * (first + i);
      const k0 = Math.max(-firHalf, -n);
      const k1 = Math.min(firHalf, len - 1 - n);
      let aRe = 0;
      let aIm = 0;
      for (let k = k0; k <= k1; k += 1) {
        const v = x[n + k];
        aRe += v * hcRe[k + firHalf];
        aIm += v * hcIm[k + firHalf];
      }
      const cycles = (mix * (first + i)) / p.bbRate;
      const phi = 2 * Math.PI * (cycles - Math.floor(cycles));
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      bbRe[i] = aRe * c + aIm * s;
      bbIm[i] = aIm * c - aRe * s;
    }
  }

  // Fills the tones x 32 complex tables for tone-0 frequency f0 relative to the baseband mix frequency.
  buildTables(f0) {
    const p = this.p;
    for (let t = 0; t < p.tones; t += 1) {
      const w = (2 * Math.PI * (f0 - this.mixHz + p.toneSpacingHz * t)) / p.bbRate;
      const ct = this.cosT[t];
      const st = this.sinT[t];
      for (let n = 0; n < BB_SYM; n += 1) {
        ct[n] = Math.cos(w * n);
        st[n] = Math.sin(w * n);
      }
    }
  }

  // Noncoherent energy of a tone over one baseband symbol, scaled like a full-symbol 12 kHz correlation.
  toneEnergy(tone, at) {
    const ct = this.cosT[tone];
    const st = this.sinT[tone];
    const { bbRe, bbIm } = this;
    let re = 0;
    let im = 0;
    for (let n = 0; n < BB_SYM; n += 1) {
      const yr = bbRe[at + n];
      const yi = bbIm[at + n];
      re += yr * ct[n] + yi * st[n];
      im += yi * ct[n] - yr * st[n];
    }
    return this.p.decim * this.p.decim * (re * re + im * im);
  }

  syncEnergy(s) {
    const p = this.p;
    let sum = 0;
    for (let blk = 0; blk < p.syncStart.length; blk += 1) {
      const seq = p.syncTones[blk];
      for (let i = 0; i < seq.length; i += 1) sum += this.toneEnergy(seq[i], s + BB_SYM * (p.syncStart[blk] + i));
    }
    return sum;
  }

  syncAt(f0, s) {
    this.buildTables(f0);
    return this.syncEnergy(s);
  }

  decodeCandidate(c, processed) {
    const p = this.p;
    const hop = this.hop;
    const decim = p.decim;
    const f0 = c.bin * p.binHz;
    const first = (this.minStep + c.step) * (hop / decim) - TIME_RANGE;
    this.buildBaseband(f0 + p.bandCenterHz, first);
    const maxS = 2 * TIME_RANGE;
    let bestE = -1;
    let bestF = f0;
    let bestS = TIME_RANGE;
    for (let df = -p.refineHz; df <= p.refineHz + 1e-9; df += p.hzStep) {
      this.budget.checkpoint();
      this.buildTables(f0 + df);
      for (let s = 0; s <= maxS; s += COARSE_TIME_STEP) {
        const e = this.syncEnergy(s);
        if (e > bestE) {
          bestE = e;
          bestF = f0 + df;
          bestS = s;
        }
      }
    }
    const centerF = bestF;
    const centerS = bestS;
    for (let i = -2; i <= 2; i += 1) {
      const f = centerF + p.hzStep * i;
      this.buildTables(f);
      for (let s = Math.max(0, centerS - COARSE_TIME_STEP + 1); s <= Math.min(maxS, centerS + COARSE_TIME_STEP - 1); s += 1) {
        const e = this.syncEnergy(s);
        if (e > bestE) {
          bestE = e;
          bestF = f;
          bestS = s;
        }
      }
    }
    let fineS = bestS;
    if (bestS >= 1 && bestS < maxS) {
      const lo = this.syncAt(bestF, bestS - 1);
      const hi = this.syncAt(bestF, bestS + 1);
      fineS += parabolic(lo, bestE, hi);
    }
    {
      const lo = this.syncAt(bestF - p.hzStep, bestS);
      const hi = this.syncAt(bestF + p.hzStep, bestS);
      bestF += p.hzStep * parabolic(lo, bestE, hi);
    }
    const bestT = jround((first + fineS) * decim);
    const start = (first + bestS) * decim;
    this.buildTables(bestF);
    for (const q of processed) {
      if (Math.abs(q[0] - bestF) <= p.dupRefinedHz && Math.abs(q[1] - bestT) <= hop) return null;
    }
    processed.push([bestF, bestT]);
    return this.decodeBits(c, bestF, bestT, bestS, start);
  }

  // Soft-decision chain for one refined candidate: belief propagation on the linear and the log-domain soft
  // metrics, then the ordered-statistics fallback. Tables for bestF must be built.
  decodeBits(c, bestF, bestT, bestS, start) {
    const request = this.request;
    this.unsupported = false;
    const failed = [];
    for (let set = 0; set < 2; set += 1) {
      if (!this.softBits(bestS, start, set === 1)) continue;
      const word = this.receiver.ldpc.decode(this.llr, request.maxIterations, this.budget);
      if (word !== null) {
        const hit = this.finishWord(word, c, bestF, bestT, bestS);
        if (hit !== null || this.unsupported) return hit;
      }
      if (failed.length < 3) failed.push(Float64Array.from(this.llr));
    }
    if (failed.length === 0) return null;
    const r = this.receiver.osd.decode(failed[0], 2, OSD_MAX_ERRORS, Infinity, this.budget);
    if (r === null) return null;
    return this.finishWord(r.word, c, bestF, bestT, bestS);
  }

  // CRC check and unpacking of a 174-bit word. Null when the CRC fails or the message is outside the supported
  // subset (then the unsupported flag is set).
  finishWord(word, c, bestF, bestT, bestS) {
    const p = this.p;
    const payload = word.slice(0, 77);
    let crc = 0;
    for (let i = 77; i < 91; i += 1) crc = (crc << 1) | word[i];
    if (Crc14.compute(payload) !== crc) return null;
    const text = unpack77(payload);
    if (text === null) {
      this.receiver.unsupportedCount += 1;
      this.unsupported = true;
      return null;
    }
    const tones = ft8Tones(word);
    const start = bestT;
    return {
      text,
      hz: bestF,
      start,
      dt: start / SAMPLE_RATE - p.nominalStartSeconds,
      score: c.score,
      tones,
      snr: this.snr(tones, bestS, bestF),
    };
  }

  // Bit LLRs for the data symbols; false when the soft symbols carry no information.
  softBits(s, start, logDomain) {
    const p = this.p;
    const { dataSyms, bps, amp, llr } = this;
    let meanPower = 0;
    if (logDomain) {
      for (let k = 0; k < dataSyms; k += 1) {
        for (let t = 0; t < p.tones; t += 1) meanPower += this.toneEnergy(t, s + p.dataPos[k] * BB_SYM);
      }
      meanPower /= dataSyms * p.tones;
    }
    const eps = 1e-9 * meanPower + 1e-30;
    for (let k = 0; k < dataSyms; k += 1) {
      const sym = p.dataPos[k];
      for (let t = 0; t < p.tones; t += 1) {
        const e = this.toneEnergy(t, s + sym * BB_SYM);
        amp[t] = logDomain ? Math.log(e + eps) : Math.sqrt(e);
      }
      for (let b = 0; b < bps; b += 1) {
        let best0 = -Infinity;
        let best1 = -Infinity;
        for (let t = 0; t < p.tones; t += 1) {
          if (((p.toneToValue[t] >> (bps - 1 - b)) & 1) === 0) best0 = Math.max(best0, amp[t]);
          else best1 = Math.max(best1, amp[t]);
        }
        llr[bps * k + b] = best0 - best1;
      }
    }
    return this.normalizeLlr(start);
  }

  // Scales the llr field to unit-spread soft values; false when the soft symbols carry no information.
  normalizeLlr(start) {
    const p = this.p;
    const { dataSyms, bps, llr } = this;
    const inside = new Array(dataSyms).fill(false);
    let insideSyms = 0;
    for (let k = 0; k < dataSyms; k += 1) {
      const from = start + p.dataPos[k] * this.sps;
      inside[k] = from >= 0 && from + this.sps <= this.len;
      if (inside[k]) insideSyms += 1;
    }
    const onlyInside = insideSyms * 58 >= 40 * dataSyms;
    let mean = 0;
    let used = 0;
    for (let i = 0; i < 174; i += 1) {
      if (onlyInside && !inside[Math.floor(i / bps)]) continue;
      mean += llr[i];
      used += 1;
    }
    mean /= used;
    let variance = 0;
    for (let i = 0; i < 174; i += 1) {
      if (onlyInside && !inside[Math.floor(i / bps)]) continue;
      variance += (llr[i] - mean) * (llr[i] - mean);
    }
    const sd = Math.sqrt(variance / used);
    if (!(sd > 0) || !Number.isFinite(sd)) return false;
    for (let i = 0; i < 174; i += 1) llr[i] *= p.llrScale / sd;
    return true;
  }

  // SNR in the 2500 Hz reference bandwidth from the decoded tones and the band spectrogram noise level.
  snr(tones, s, hz) {
    const p = this.p;
    const sigma2 = this.localNoiseSigma2(hz);
    if (!(sigma2 > 0)) return NaN;
    // Noise bias of a baseband correlation, scaled like the 12 kHz one (filter noise power gain decim * sum h^2).
    const bias = this.sps * sigma2 * p.decim * this.firPower;
    let signal = 0;
    for (let k = 0; k < p.symbols; k += 1) signal += this.toneEnergy(tones[k], s + k * BB_SYM) - bias;
    signal = ((signal / p.symbols) * 2) / (this.sps * this.sps);
    const noiseRef = (sigma2 * 2500) / (SAMPLE_RATE / 2);
    if (!(signal > 1e-3 * noiseRef)) signal = 1e-3 * noiseRef;
    return jround(10 * Math.log10(signal / noiseRef));
  }
}

// Vertex offset in [-0.5, 0.5] of the parabola through three equally spaced samples.
function parabolic(lo, mid, hi) {
  const d = lo - 2 * mid + hi;
  if (!(d < 0)) return 0;
  return Math.max(-0.5, Math.min(0.5, (0.5 * (lo - hi)) / d));
}

// FT8 waveform with a chosen carrier start phase (used for the subtraction references).
function ft8WaveformPhase(tones, tone0Hz, startPhase) {
  if (!ft8Synth) ft8Synth = new GfskSynth(1920, 2.0, TONE_SPACING_HZ, SAMPLE_RATE, RAMP_FT8_EDGE_240);
  return ft8Synth.synth(tones, tone0Hz, startPhase);
}

class FtxReceiver {
  constructor(ldpc) {
    if (!ldpc) throw new TypeError("LDPC tables required");
    this.ldpc = ldpc;
    this.osd = new Osd174(ldpc);
    this.unsupportedCount = 0;
  }

  decode(samples, request) {
    const p = FT8;
    if (samples.length < p.minSamples || samples.length > p.maxSamples) {
      throw codedError("INVALID_AUDIO", `Decoding needs ${p.minSamples}..${p.maxSamples} samples`);
    }
    if (request.maxAudioHz + p.tones * p.toneSpacingHz > 6000) throw codedError("INVALID_AUDIO", "Search band too close to Nyquist");
    request.budget.checkpoint();
    this.unsupportedCount = 0;
    return new Run(this, samples, request).execute();
  }
}

// Decodes one FT8 slot of 12000 Hz audio (151680..180000 samples, frame nominally starting 0.5 s into the slot).
// options: minHz (100), maxHz (4500), maxCandidates (40, 1..64), maxIterations (40, 1..100), ldpc (parsed
// data/ftx-ldpc174.json or an Ldpc174), budget ({checkpoint()}) or maxWorkMs with an injectable now().
// Returns [{text, frequencyHz, dtSeconds, snrDb}] sorted by time offset, then frequency, then text.
function decodeFt8(samples12k, options = {}) {
  if (!samples12k || typeof samples12k.length !== "number") throw new TypeError("12000 Hz samples required");
  const request = {
    minAudioHz: options.minHz === undefined ? 100 : options.minHz,
    maxAudioHz: options.maxHz === undefined ? 4500 : options.maxHz,
    maxCandidates: options.maxCandidates === undefined ? 40 : options.maxCandidates,
    maxIterations: options.maxIterations === undefined ? 40 : options.maxIterations,
    budget: makeBudget(options),
  };
  if (!Number.isFinite(request.minAudioHz) || !Number.isFinite(request.maxAudioHz) || request.minAudioHz < 0 ||
      request.minAudioHz >= request.maxAudioHz || !(request.maxCandidates >= 1 && request.maxCandidates <= 64) ||
      !(request.maxIterations >= 1 && request.maxIterations <= 100)) {
    throw new RangeError("Invalid decode band or limits");
  }
  const samples = samples12k instanceof Float32Array ? samples12k : Float32Array.from(samples12k);
  return new FtxReceiver(loadLdpc(options.ldpc)).decode(samples, request);
}

module.exports = {
  SAMPLE_RATE,
  TONE_SPACING_HZ,
  Crc14,
  Fft,
  Ldpc174,
  Osd174,
  GfskSynth,
  loadLdpc,
  pack77,
  unpack77,
  codeword,
  ft8Tones,
  ft8Waveform,
  encodeFt8,
  decodeFt8,
};
