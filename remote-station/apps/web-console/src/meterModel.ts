// Normalized meter model of the remote consoles. Scales and sources live in data/remote-meter-model.json and are
// mirrored here (remote-meters.cjs is the reference; meterModel.test.ts compares both). Nothing is calibrated.

export type MeterKey = 'smeter' | 'smeter-sub' | 'po' | 'swr' | 'alc' | 'comp' | 'id' | 'vdd'

export interface NormalizedMeter {
  key: MeterKey
  raw: number | null
  value: number | null
  unit: string
  text: string
  pending: boolean
}

export const TUNE_POWER_MAX_W = 10

const PO_POINTS: ReadonlyArray<readonly [number, number]> = [[55, 0.5], [73, 1], [113, 3], [139, 5], [164, 7.5], [189, 10], [255, 15]]
const S_STEPS: ReadonlyArray<readonly [number, number]> = [[0, 0], [14, 1], [42, 3], [81, 5], [103, 7]]
const S_OVER: ReadonlyArray<readonly [number, number]> = [[202, 20], [233, 40], [255, 60]]
const S9_RAW = 128
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits

function lerp(points: ReadonlyArray<readonly [number, number]>, x: number, origin: readonly [number, number] = [0, 0]) {
  if (x <= origin[0]) return origin[1]
  let [x0, y0] = origin
  for (const [x1, y1] of points) {
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    ;[x0, y0] = [x1, y1]
  }
  return y0
}

export function swrFromRaw(raw: number): number {
  if (raw >= 255) return Infinity
  if (raw <= 0) return 1
  return 1 + 0.333 * (Math.exp(0.0151 * raw) - 1)
}

// `head` is the PC P1 digit: 1 field head, 2 SPA-1. PO is only scaled for the field head; otherwise it stays raw and pending.
export function normalizeMeter(key: MeterKey, raw: number, head: 1 | 2 | null = null): NormalizedMeter {
  const clamped = Math.min(255, Math.max(0, Math.round(raw)))
  const base = { key, raw: clamped, value: clamped, unit: 'raw', text: `${clamped}/255`, pending: false }
  switch (key) {
    case 'smeter': case 'smeter-sub': {
      if (clamped < S9_RAW) {
        const units = [...S_STEPS].reverse().find(([from]) => clamped >= from)?.[1] ?? 0
        return { ...base, value: units, unit: 'S', text: `S${units}` }
      }
      const over = round(lerp(S_OVER, clamped, [S9_RAW, 0]), 1)
      return { ...base, value: 9, unit: 'S', text: over > 0 ? `S9+${over} dB` : 'S9' }
    }
    case 'swr': {
      const ratio = swrFromRaw(clamped)
      return Number.isFinite(ratio)
        ? { ...base, value: round(ratio), unit: '', text: `${round(ratio)}:1` }
        : { ...base, value: null, unit: '', text: '∞:1' }
    }
    case 'alc': {
      const value = Math.min(200, (clamped * 200) / 252)
      return { ...base, value: round(value, 1), unit: '%', text: `${Math.round(value)} %` }
    }
    case 'po':
      if (head !== 1) return { ...base, text: `${base.text} (pendiente de fuente)`, pending: true }
      return { ...base, value: round(lerp(PO_POINTS, clamped)), unit: 'W', text: `${round(lerp(PO_POINTS, clamped), 1)} W` }
    case 'vdd': {
      const value = (clamped * 13.8) / 203
      return { ...base, value: round(value), unit: 'V', text: `${round(value, 1)} V` }
    }
    case 'id': {
      const value = (clamped * 3) / 255
      return { ...base, value: round(value), unit: 'A', text: `${round(value, 1)} A` }
    }
    default: {
      const value = (clamped * 30) / 255
      return { ...base, value: round(value), unit: 'dB', text: `${round(value, 1)} dB` }
    }
  }
}

// Tune is refused above TUNE_POWER_MAX_W; the operator lowers the power, it is never lowered automatically.
export function tunePowerCheck(watts: number | null): { ok: boolean; reason: 'unknown' | 'high' | null } {
  if (watts === null || !Number.isFinite(watts)) return { ok: false, reason: 'unknown' }
  return watts > TUNE_POWER_MAX_W ? { ok: false, reason: 'high' } : { ok: true, reason: null }
}
