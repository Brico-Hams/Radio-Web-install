import { describe, expect, it } from 'vitest'
import model from '../../../../data/remote-meter-model.json'
import { normalizeMeter, swrFromRaw, tunePowerCheck, TUNE_POWER_MAX_W } from './meterModel'

describe('meter model', () => {
  it('mirrors the shared model data', () => {
    const { meters, tune } = model
    expect(TUNE_POWER_MAX_W).toBe(tune.maxPowerW)
    expect(normalizeMeter('vdd', meters.vdd.raw203).value).toBeCloseTo(meters.vdd.scale, 1)
    expect(normalizeMeter('id', 255).value).toBe(meters.id.scale)
    expect(normalizeMeter('comp', 255).value).toBe(meters.comp.scale)
    expect(normalizeMeter('alc', meters.alc.max).value).toBe(meters.alc.cap)
    expect(swrFromRaw(100)).toBeCloseTo(1 + meters.swr.c * (Math.exp(meters.swr.b * 100) - 1))
    for (const [raw, watts] of meters.po.points) expect(normalizeMeter('po', raw, 1).value).toBeCloseTo(watts)
    for (const [raw, over] of meters.smeter.over) {
      expect(normalizeMeter('smeter', raw).text).toBe(over === 0 ? 'S9' : `S9+${over} dB`)
    }
  })

  it('normalizes the FTX-1 bench frames (SPA-1 head: PO pending)', () => {
    expect(normalizeMeter('vdd', 201).value).toBe(13.66)
    expect(normalizeMeter('smeter', 0).text).toBe('S0')
    expect(normalizeMeter('swr', 0).value).toBe(1)
    expect(normalizeMeter('swr', 255).text).toBe('∞:1')
    expect(normalizeMeter('po', 0, 2)).toMatchObject({ pending: true, unit: 'raw' })
  })

  it('refuses tune above 10 W and when the power is unknown', () => {
    expect(tunePowerCheck(10).ok).toBe(true)
    expect(tunePowerCheck(100)).toEqual({ ok: false, reason: 'high' })
    expect(tunePowerCheck(null).reason).toBe('unknown')
  })
})
