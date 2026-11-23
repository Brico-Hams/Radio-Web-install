// Satellite hand-off: replays a "radicodex-pass-track" file exported by the pass planner (satellite-ui.js) as
// AZ/EL targets by UTC time. Doppler is not involved. Same rules as remote-rotor-ui.js in the Node remote shack.
export const TRACK_FORMAT = 'radicodex-pass-track'
export const MAX_SAMPLES = 2000
export const MAX_TRACK_MS = 30 * 60 * 1000
export const MAX_TRACK_FILE_BYTES = 512 * 1024

export type PassSample = { t: number; az: number; el: number }
export type PassTrack = { name: string; samples: PassSample[] }
export type RotorLimits = {
  azimuth_min: number
  azimuth_max: number
  elevation_min: number
  elevation_max: number
}
export type TrackTarget =
  | { phase: 'before' | 'after' | 'below' | 'limits' }
  | { phase: 'active'; azimuth: number; elevation: number }

export class PassTrackError extends Error {
  readonly code: 'invalid' | 'tooLong'
  constructor(code: 'invalid' | 'tooLong') {
    super(code)
    this.code = code
  }
}

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function parsePassTrack(text: string): PassTrack {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new PassTrackError('invalid')
  }
  const record = data as { format?: unknown; version?: unknown; name?: unknown; samples?: unknown } | null
  if (!record || record.format !== TRACK_FORMAT || record.version !== 1 || !Array.isArray(record.samples)) {
    throw new PassTrackError('invalid')
  }
  const samples = record.samples as Partial<PassSample>[]
  if (samples.length < 2 || samples.length > MAX_SAMPLES) throw new PassTrackError('invalid')
  let previous = -Infinity
  for (const sample of samples) {
    if (!sample || !finite(sample.t) || !finite(sample.az) || !finite(sample.el) ||
      sample.t <= previous || sample.el < -90 || sample.el > 90) {
      throw new PassTrackError('invalid')
    }
    previous = sample.t
  }
  if (samples[samples.length - 1].t! - samples[0].t! > MAX_TRACK_MS) throw new PassTrackError('tooLong')
  return {
    name: typeof record.name === 'string' ? record.name.slice(0, 60) : '',
    samples: (samples as PassSample[]).map(({ t, az, el }) => ({ t, az: wrap(az), el })),
  }
}

// Azimuth equivalent (az + k*360) inside the rotor limits that is closest to `near`; null when none fits.
export function fitAzimuth(azimuth: number, limits: RotorLimits, near: number): number | null {
  let best: number | null = null
  for (let turns = -2; turns <= 2; turns += 1) {
    const candidate = wrap(azimuth) + turns * 360
    if (candidate < limits.azimuth_min || candidate > limits.azimuth_max) continue
    if (best === null || Math.abs(candidate - near) < Math.abs(best - near)) best = candidate
  }
  return best
}

export function trackTarget(track: PassTrack, nowMs: number, limits: RotorLimits, near = 0): TrackTarget {
  const samples = track.samples
  if (nowMs < samples[0].t) return { phase: 'before' }
  if (nowMs > samples[samples.length - 1].t) return { phase: 'after' }
  let index = 1
  while (index < samples.length - 1 && samples[index].t < nowMs) index += 1
  const a = samples[index - 1]
  const b = samples[index]
  const ratio = (nowMs - a.t) / (b.t - a.t)
  const turn = ((b.az - a.az + 540) % 360) - 180
  const azimuth = wrap(a.az + turn * ratio)
  const elevation = a.el + (b.el - a.el) * ratio
  if (elevation < 0) return { phase: 'below' }
  const fitted = fitAzimuth(azimuth, limits, near)
  if (fitted === null) return { phase: 'limits' }
  const clamped = Math.min(limits.elevation_max, Math.max(limits.elevation_min, elevation))
  return { phase: 'active', azimuth: Math.round(fitted * 10) / 10, elevation: Math.round(clamped * 10) / 10 }
}
