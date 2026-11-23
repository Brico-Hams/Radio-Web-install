import { expect, it } from 'vitest'
import { COLOR_MAPS, colorLut, createAudioAnalyzer, fft, levelToByte, parseScopeLine, resampleRow, scopeClickHz, scopeColumns, tuneFromAudioClick } from './spectrum'

it('parses a scope NDJSON line and rejects malformed ones', () => {
  const ok = parseScopeLine('{"start_hz":14000000,"end_hz":14100000,"out_of_range":false,"pixels":[0,80,160]}')
  expect(ok).toEqual({ startHz: 14000000, endHz: 14100000, outOfRange: false, pixels: [0, 80, 160] })
  expect(parseScopeLine('{"start_hz":1,"end_hz":2,"out_of_range":false,"pixels":[161]}')).toBeNull()
  expect(parseScopeLine('{"start_hz":2,"end_hz":1,"out_of_range":false,"pixels":[1]}')).toBeNull()
  expect(parseScopeLine('not json')).toBeNull()
})

it('maps scope pixels to columns and clicks to RF frequencies', () => {
  expect([...scopeColumns([0, 160], 4)]).toEqual([0, 0, 255, 255])
  const row = { startHz: 14000000, endHz: 14100000, outOfRange: false, pixels: [1] }
  expect(scopeClickHz(row, 0.5)).toBe(14050000)
  expect(scopeClickHz(row, 2)).toBe(14100000)
  expect(scopeClickHz({ ...row, outOfRange: true }, 0.5)).toBeNull()
})

it('click-to-tune maps audio offsets in USB/LSB only', () => {
  expect(tuneFromAudioClick('USB', 14_200_000, 2000)).toBe(14_200_500)
  expect(tuneFromAudioClick('LSB', 7_100_000, 2000)).toBe(7_099_500)
  expect(tuneFromAudioClick('FM', 145_500_000, 2000)).toBeNull()
  expect(tuneFromAudioClick('CW-U', 14_030_000, 2000)).toBeNull()
})

it('finds the bin of a pure tone and rejects non power-of-two sizes', () => {
  const n = 256
  const re = new Float64Array(n).map((_, i) => Math.cos((2 * Math.PI * 16 * i) / n))
  const im = new Float64Array(n)
  fft(re, im)
  expect(Math.hypot(re[16], im[16])).toBeCloseTo(n / 2, 6)
  expect(Math.hypot(re[40], im[40])).toBeLessThan(1e-6)
  expect(() => fft(new Float64Array(100), new Float64Array(100))).toThrow(RangeError)
})

it('analyzer peaks at the tone frequency from int16 PCM', () => {
  const rate = 8000
  const analyzer = createAudioAnalyzer(rate, 256, 128)
  const tone = new Int16Array(1024).map((_, i) => Math.round(16000 * Math.sin((2 * Math.PI * 1000 * i) / rate)))
  let last: Float32Array | null = null
  for (let i = 0; i < tone.length; i += 128) last = analyzer.push(tone.subarray(i, i + 128)) ?? last
  expect(last).not.toBeNull()
  const row = last as Float32Array
  expect(Math.round(row.indexOf(Math.max(...row)) * analyzer.binHz)).toBe(1000)
  expect(() => createAudioAnalyzer(rate, 100)).toThrow(RangeError)
})

it('quantises levels, keeps column peaks and builds colour tables', () => {
  expect(levelToByte(-100, -100, -20)).toBe(0)
  expect(levelToByte(0, -100, -20)).toBe(255)
  expect(levelToByte(Number.NaN, -100, -20)).toBe(0)
  const out = resampleRow(Float32Array.from([-90, -90, -30, -90, -90, -90, -90, -90]), 500, 4000, 4)
  expect(out[1]).toBe(-30)
  for (const name of COLOR_MAPS) expect(colorLut(name)).toHaveLength(768)
})
