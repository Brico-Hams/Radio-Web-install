// Audio-passband spectrum helpers for the web console. Same maths as /spectrum-core.js at the repo root (kept in sync by
// the tests); the forward FFT keeps the contract of android/.../digital/dsp/Fft.java, X[k] = sum x[j] e^(-2 pi i j k / n),
// for power-of-two sizes only.
export const FLOOR_DB = -140
export const COLOR_MAPS = ['heat', 'ice', 'gray'] as const
export type ColorMap = (typeof COLOR_MAPS)[number]

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const isPowerOfTwo = (n: number) => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  if (im.length !== n || n < 2 || !isPowerOfTwo(n)) throw new RangeError('FFT size must be a power of two')
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr
      const ti = im[i]; im[i] = im[j]; im[j] = ti
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length
    const stepRe = Math.cos(angle)
    const stepIm = Math.sin(angle)
    const half = length >> 1
    for (let start = 0; start < n; start += length) {
      let wr = 1
      let wi = 0
      for (let k = 0; k < half; k += 1) {
        const a = start + k
        const b = a + half
        const tr = re[b] * wr - im[b] * wi
        const ti = re[b] * wi + im[b] * wr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const next = wr * stepRe - wi * stepIm
        wi = wr * stepIm + wi * stepRe
        wr = next
      }
    }
  }
}

// Sliding Hann-windowed FFT over int16 PCM: push() returns the newest dBFS row (size / 2 bins) every `hop` samples.
export function createAudioAnalyzer(sampleRate: number, size = 1024, hop = size / 2) {
  if (!isPowerOfTwo(size) || size < 64 || size > 8192) throw new RangeError('invalid FFT size')
  if (!Number.isInteger(hop) || hop < 1 || hop > size) throw new RangeError('invalid hop')
  if (!Number.isFinite(sampleRate) || sampleRate < 1000) throw new RangeError('invalid sample rate')
  const window = new Float64Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size))
  const reference = window.reduce((sum, value) => sum + value, 0) / 2
  const ring = new Float32Array(size)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  let position = 0
  let filled = 0
  let since = 0
  return {
    binHz: sampleRate / size,
    push(samples: Int16Array): Float32Array | null {
      let latest: Float32Array | null = null
      for (let i = 0; i < samples.length; i += 1) {
        ring[position] = samples[i] / 32768
        position = (position + 1) % size
        if (filled < size) filled += 1
        since += 1
        if (filled === size && since >= hop) {
          since = 0
          for (let k = 0; k < size; k += 1) {
            re[k] = ring[(position + k) % size] * window[k]
            im[k] = 0
          }
          fft(re, im)
          const db = new Float32Array(size / 2)
          for (let k = 0; k < db.length; k += 1)
            db[k] = Math.max(FLOOR_DB, 20 * Math.log10(Math.max(1e-12, Math.hypot(re[k], im[k]) / reference)))
          latest = db
        }
      }
      return latest
    },
  }
}

// Keeps the peak of every output column over the 0..spanHz part of a dB row.
export function resampleRow(db: Float32Array, binHz: number, spanHz: number, columns: number): Float32Array {
  const out = new Float32Array(columns)
  const usable = Math.max(1, Math.min(db.length, Math.floor(spanHz / binHz)))
  for (let column = 0; column < columns; column += 1) {
    const first = Math.floor((column * usable) / columns)
    const last = Math.max(first, Math.min(usable, Math.ceil(((column + 1) * usable) / columns)) - 1)
    let peak = FLOOR_DB
    for (let bin = first; bin <= last; bin += 1) if (db[bin] > peak) peak = db[bin]
    out[column] = peak
  }
  return out
}

export function levelToByte(db: number, floorDb: number, ceilDb: number): number {
  if (!Number.isFinite(db) || !(ceilDb > floorDb)) return 0
  return Math.round(clamp((db - floorDb) / (ceilDb - floorDb), 0, 1) * 255)
}

export function colorLut(name: ColorMap): Uint8Array {
  const lut = new Uint8Array(256 * 3)
  for (let v = 0; v < 256; v += 1) {
    const t = v / 255
    const rgb = name === 'gray' ? [v, v, v]
      : name === 'ice' ? [255 * clamp((t - 0.6) * 2.5, 0, 1), 255 * clamp((t - 0.2) * 1.5, 0, 1), 40 + 215 * Math.min(1, t * 1.5)]
      : [255 * clamp((t - 0.45) * 2.2, 0, 1), 255 * clamp((t - 0.15) * 1.6, 0, 1), 40 + 215 * Math.min(1, t * 2)]
    lut.set(rgb.map(Math.round), v * 3)
  }
  return lut
}

// Passband shown for a block of audio: the full usable audio width up to 4 kHz (wider only if the stream is narrower).
export function passbandHz(sampleRate: number): number {
  return Math.min(4000, sampleRate / 2)
}

// One assembled radio scope frame from /api/v1/cat/scope (NDJSON). Pixels are 0..160 (IC-705 CI-V guide p.28).
export type ScopeRow = { startHz: number; endHz: number; outOfRange: boolean; pixels: number[] }
export const SCOPE_PIXEL_MAX = 160
const SCOPE_MAX_PIXELS = 689

export function parseScopeLine(line: string): ScopeRow | null {
  let value: unknown
  try { value = JSON.parse(line) } catch { return null }
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  const { start_hz: start, end_hz: end, out_of_range: outOfRange, pixels } = row
  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isInteger(start) || !Number.isInteger(end) ||
    end <= start || typeof outOfRange !== 'boolean' || !Array.isArray(pixels) || pixels.length > SCOPE_MAX_PIXELS ||
    !pixels.every((p) => Number.isInteger(p) && p >= 0 && p <= SCOPE_PIXEL_MAX)) return null
  if (!outOfRange && pixels.length === 0) return null
  return { startHz: start, endHz: end, outOfRange, pixels: pixels as number[] }
}

// Stretches (or decimates, keeping peaks) the radio's pixels to `columns` columns, scaled 0..255.
export function scopeColumns(pixels: number[], columns: number): Uint8Array {
  const out = new Uint8Array(columns)
  if (!pixels.length) return out
  for (let column = 0; column < columns; column += 1) {
    const first = Math.floor((column * pixels.length) / columns)
    const last = Math.max(first, Math.min(pixels.length, Math.ceil(((column + 1) * pixels.length) / columns)) - 1)
    let peak = 0
    for (let i = first; i <= last; i += 1) if (pixels[i] > peak) peak = pixels[i]
    out[column] = Math.round((peak / SCOPE_PIXEL_MAX) * 255)
  }
  return out
}

// RF frequency under a click at `fraction` (0..1) across the frame, rounded to 10 Hz; null when it is not usable.
export function scopeClickHz(row: ScopeRow, fraction: number): number | null {
  if (row.outOfRange || !Number.isFinite(fraction)) return null
  const hz = Math.round((row.startHz + Math.min(1, Math.max(0, fraction)) * (row.endHz - row.startHz)) / 10) * 10
  return hz > 0 ? hz : null
}

// Same rule as tuneFromAudioClick in /spectrum-core.js: only USB (RF = dial + audio) and LSB (RF = dial - audio) map
// an audio offset to an RF frequency; every other mode returns null. The new dial centres the signal at targetHz.
export function tuneFromAudioClick(
  modeLabel: string, dialHz: number, clickHz: number, targetHz = 1500,
): number | null {
  const sign = /^(PKT)?USB\b/i.test(modeLabel.trim()) ? 1 : /^(PKT)?LSB\b/i.test(modeLabel.trim()) ? -1 : 0
  if (!sign || ![dialHz, clickHz, targetHz].every(Number.isFinite)) return null
  const next = Math.round(dialHz + sign * (clickHz - targetHz))
  return next > 0 ? next : null
}
