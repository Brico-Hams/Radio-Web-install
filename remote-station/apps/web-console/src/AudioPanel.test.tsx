import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AudioPanel } from './AudioPanel'
import { LanguageProvider, LanguageSelector } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))

afterEach(() => {
  vi.unstubAllGlobals()
})

it.each([
  ['en', 'Experimental RX audio playing.', 'Stop'],
  ['fr', 'Lecture audio RX expérimentale.', 'Arrêter'],
  ['pt', 'Áudio RX experimental em reprodução.', 'Parar'],
])('keeps the active audio graph and stream while changing to %s', async (lang, playing, stop) => {
  const close = vi.fn().mockResolvedValue(undefined)
  const disconnect = vi.fn()
  let signal: AbortSignal | undefined
  const nodes: FakeNode[] = []
  class FakeContext {
    destination = {}
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
    resume = vi.fn().mockResolvedValue(undefined)
    close = close
  }
  class FakeNode {
    port: { onmessage?: (event: MessageEvent<{ state: string }>) => void } = {}
    connect = vi.fn()
    disconnect = disconnect
    constructor() { nodes.push(this) }
  }
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('AudioWorkletNode', FakeNode)
  const header = new Uint8Array(12)
  header.set(new TextEncoder().encode('BHR1'))
  const view = new DataView(header.buffer)
  view.setUint32(4, 48000, true)
  view.setUint16(8, 1, true)
  view.setUint16(10, 16, true)
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    signal = init.signal ?? undefined
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(header)
        signal?.addEventListener('abort', () => controller.error(new Error('test stream aborted')), {
          once: true,
        })
      },
    }), { headers: { 'Content-Type': 'application/vnd.bricoham.pcm' } })
  })
  vi.stubGlobal('fetch', fetch)
  render(<><LanguageSelector /><AudioPanel token="test-token" /></>)
  fireEvent.click(screen.getByText('Escuchar RX'))
  await waitFor(() => expect(nodes[0]?.port.onmessage).toBeTypeOf('function'))
  await act(async () => {
    nodes[0]?.port.onmessage?.(new MessageEvent('message', { data: { state: 'playing' } }))
  })
  fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: lang } })
  expect(screen.getByText(playing)).toBeTruthy()
  expect(fetch).toHaveBeenCalledOnce()
  expect(close).not.toHaveBeenCalled()
  expect(disconnect).not.toHaveBeenCalled()
  expect(signal?.aborted).toBe(false)
  expect(nodes).toHaveLength(1)
  expect(nodes[0]?.connect).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: stop }))
  expect(close).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledOnce()
  expect(signal?.aborted).toBe(true)
})

it('keeps rejected-frame errors translatable without restarting audio', async () => {
  const close = vi.fn().mockResolvedValue(undefined)
  class FakeContext {
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
    resume = vi.fn().mockResolvedValue(undefined)
    close = close
  }
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('AudioWorkletNode', class {})
  const fetch = vi.fn(async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(12))
      controller.close()
    },
  }), { headers: { 'Content-Type': 'application/vnd.bricoham.pcm' } }))
  vi.stubGlobal('fetch', fetch)
  render(<><LanguageSelector /><AudioPanel token="test-token" /></>)
  fireEvent.click(screen.getByText('Escuchar RX'))
  await screen.findByText('Cabecera de audio inválida.')
  fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: 'en' } })
  expect(screen.getByText('Invalid audio header.')).toBeTruthy()
  expect(close).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledOnce()
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
