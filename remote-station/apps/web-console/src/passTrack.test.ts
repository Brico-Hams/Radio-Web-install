import { describe, expect, it } from 'vitest'
import { fitAzimuth, parsePassTrack, PassTrackError, trackTarget } from './passTrack'

const limits = { azimuth_min: 0, azimuth_max: 450, elevation_min: 0, elevation_max: 90 }
const track = (samples: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ format: 'radicodex-pass-track', version: 1, name: 'ISS', samples, ...extra })
const pass = parsePassTrack(track([
  { t: 0, az: 350, el: 0 },
  { t: 60_000, az: 10, el: 40 },
  { t: 120_000, az: 90, el: 0 },
]))

describe('pass track hand-off', () => {
  it('rejects malformed, unordered and overlong files', () => {
    for (const text of ['nope', '{}', track([{ t: 0, az: 0, el: 0 }]),
      track([{ t: 5, az: 0, el: 0 }, { t: 5, az: 1, el: 0 }]),
      track([{ t: 0, az: 'x', el: 0 }, { t: 1, az: 1, el: 0 }]),
      track([{ t: 0, az: 0, el: 0 }, { t: 1, az: 1, el: 0 }], { version: 2 })]) {
      expect(() => parsePassTrack(text)).toThrow(PassTrackError)
    }
    expect(() => parsePassTrack(track([{ t: 0, az: 0, el: 0 }, { t: 31 * 60_000, az: 1, el: 0 }])))
      .toThrowError(expect.objectContaining({ code: 'tooLong' }))
  })

  it('interpolates by clock time across the north crossing, independent of Doppler', () => {
    expect(trackTarget(pass, 30_000, limits, 350)).toEqual({ phase: 'active', azimuth: 360, elevation: 20 })
    expect(trackTarget(pass, -1, limits)).toEqual({ phase: 'before' })
    expect(trackTarget(pass, 120_001, limits)).toEqual({ phase: 'after' })
  })

  it('holds below the horizon, clamps elevation and reports unreachable azimuths', () => {
    const below = parsePassTrack(track([{ t: 0, az: 10, el: -5 }, { t: 10, az: 10, el: -1 }]))
    expect(trackTarget(below, 5, limits)).toEqual({ phase: 'below' })
    expect(trackTarget(pass, 60_000, { ...limits, elevation_max: 30 }, 0))
      .toMatchObject({ phase: 'active', elevation: 30 })
    expect(trackTarget(pass, 60_000, { ...limits, azimuth_min: 100, azimuth_max: 200 })).toEqual({ phase: 'limits' })
    expect(fitAzimuth(10, limits, 400)).toBe(370)
  })
})
