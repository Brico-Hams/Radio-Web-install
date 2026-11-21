/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('plays PCM, reports underflow and refuses overflow', () => {
  let Processor: new (options: object) => {
    port: { onmessage: (event: { data: Int16Array }) => void; postMessage: ReturnType<typeof vi.fn> }
    process: (inputs: unknown[], outputs: Float32Array[][]) => boolean
  }
  class BaseProcessor {
    port = { onmessage: () => {}, postMessage: vi.fn() }
  }
  runInNewContext(readFileSync('public/rx-audio-worklet.js', 'utf8'), {
    AudioWorkletProcessor: BaseProcessor, Int16Array, Float32Array, sampleRate: 8000,
    registerProcessor: (_name: string, value: typeof Processor) => { Processor = value },
  })
  const processor = new Processor!({ processorOptions: { inputRate: 8000 } })
  processor.port.onmessage({ data: new Int16Array(800).fill(16384) })
  const output = new Float32Array(900)
  expect(processor.process([], [[output]])).toBe(true)
  expect(output[0]).toBe(0.5)
  expect(processor.port.postMessage).toHaveBeenCalledWith({ state: 'underflow' })
  processor.port.onmessage({ data: new Int16Array(8001) })
  expect(processor.port.postMessage).toHaveBeenCalledWith({ state: 'overflow' })
  expect(processor.process([], [[output]])).toBe(false)
})
