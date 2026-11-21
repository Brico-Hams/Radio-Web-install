import { describe, expect, it } from 'vitest'
import { AudioFraming } from './audioFraming'

describe('BHR1 framing', () => {
  it('handles arbitrary fragmentation and signed PCM samples', () => {
    const data = new Uint8Array([
      66, 72, 82, 49, 64, 31, 0, 0, 1, 0, 16, 0,
      4, 0, 0, 0, 0, 128, 255, 127, 0, 0, 0, 0,
    ])
    const decoder = new AudioFraming()
    let rate = 0
    const samples: number[] = []
    for (const byte of data) {
      const result = decoder.push(new Uint8Array([byte]))
      rate = result.rate ?? rate
      samples.push(...result.blocks.flatMap((block) => Array.from(block)))
    }
    expect(rate).toBe(8000)
    expect(samples).toEqual([-32768, 32767])
  })

  it('rejects invalid format and excessive record length', () => {
    expect(() => new AudioFraming().push(new Uint8Array(12))).toThrow()
    const decoder = new AudioFraming()
    decoder.push(new Uint8Array([66, 72, 82, 49, 64, 31, 0, 0, 1, 0, 16, 0]))
    expect(() => decoder.push(new Uint8Array([255, 255, 255, 255]))).toThrow()
  })
})
