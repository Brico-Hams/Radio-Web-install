import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

function processor() {
  const messages: { pcm?: ArrayBuffer; error?: string }[] = []
  class Processor {
    port = {
      postMessage: (value: { pcm?: ArrayBuffer; error?: string }) => messages.push(value),
      onmessage: undefined as ((event: { data: unknown }) => void) | undefined,
    }
  }
  type Worklet = Processor & { process: (inputs: Float32Array[][]) => boolean }
  let constructor: (new () => Worklet) | undefined
  runInNewContext(readFileSync(new NodeURL('../public/tx-audio-worklet.js', import.meta.url), 'utf8'), {
    AudioWorkletProcessor: Processor, currentTime: 0,
    registerProcessor: (_name: string, value: new () => Worklet) => { constructor = value },
  })
  if (!constructor) throw new Error('Processor was not registered')
  return { worklet: new constructor(), messages }
}

it('emits exactly 960 clamped PCM16 little-endian samples across nonaligned input blocks', () => {
  const { worklet, messages } = processor()
  const samples = Float32Array.from({ length: 960 }, (_, index) => [2, -2, 0.5, -0.5, 0][index % 5])
  worklet.process([[samples.slice(0, 959)]])
  expect(messages).toHaveLength(0)
  worklet.process([[samples.slice(959)]])
  expect(messages).toHaveLength(1)
  const pcm = messages[0].pcm
  if (!pcm) throw new Error('Missing PCM')
  expect(pcm.byteLength).toBe(1920)
  const view = new DataView(pcm)
  expect(Array.from({ length: 5 }, (_, i) => view.getInt16(i * 2, true))).toEqual([
    32767, -32768, 16384, -16384, 0,
  ])
})

it('caps unacknowledged capture at eight frames and fails instead of growing the queue', () => {
  const { worklet, messages } = processor()
  for (let index = 0; index < 8; index++) worklet.process([[new Float32Array(960)]])
  expect(messages.filter((value) => value.pcm)).toHaveLength(8)
  worklet.process([[new Float32Array(960)]])
  expect(messages.at(-1)?.error).toBeTruthy()
  worklet.process([[new Float32Array(960)]])
  expect(messages.filter((value) => value.pcm)).toHaveLength(8)
})
