import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AudioPanel } from './AudioPanel'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('aborts the stream and closes the audio context on unmount', async () => {
  const close = vi.fn().mockResolvedValue(undefined)
  let signal: AbortSignal | undefined
  class FakeContext {
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
    resume = vi.fn().mockResolvedValue(undefined)
    close = close
  }
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('AudioWorkletNode', class {})
  vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
    signal = init.signal ?? undefined
    return new Promise(() => {})
  }))
  const panel = render(<AudioPanel token="test-token" />)
  fireEvent.click(screen.getByText('Escuchar RX'))
  await waitFor(() => expect(signal).toBeDefined())
  panel.unmount()
  expect(signal?.aborted).toBe(true)
  expect(close).toHaveBeenCalledOnce()
})

it('reports unsupported AudioWorklet', () => {
  vi.stubGlobal('AudioWorkletNode', undefined)
  render(<AudioPanel token="test-token" />)
  fireEvent.click(screen.getByText('Escuchar RX'))
  expect(screen.getByText(/AudioWorklet no disponible/)).toBeTruthy()
})
