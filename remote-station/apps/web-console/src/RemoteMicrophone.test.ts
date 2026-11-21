import { afterEach, expect, it, vi } from 'vitest'
import { RemoteMicrophone } from './RemoteMicrophone'

class Graph {
  connect = vi.fn(() => this)
}
class FakeContext {
  static current: FakeContext
  state = 'running'
  sampleRate = 48000
  currentTime = 0
  destination = {}
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  onstatechange?: () => void
  constructor() { FakeContext.current = this }
  createGain() { return Object.assign(new Graph(), { gain: { value: 1 } }) }
  createMediaStreamSource() { return new Graph() }
}
class FakeNode extends Graph {
  static current: FakeNode
  port = {
    postMessage: vi.fn(), close: vi.fn(),
    onmessage: undefined as ((event: MessageEvent<unknown>) => void) | undefined,
  }
  disconnect = vi.fn()
  constructor() { super(); FakeNode.current = this }
}
class FakeSocket {
  static current: FakeSocket
  static OPEN = 1
  readyState = 1
  bufferedAmount = 0
  send = vi.fn()
  close = vi.fn()
  onopen?: () => void
  onmessage?: (event: { data: unknown }) => void
  constructor(publicUrl: string) { expect(publicUrl).not.toContain('secret'); FakeSocket.current = this }
  reply(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }) }
}

afterEach(() => vi.unstubAllGlobals())

function setup() {
  const track = { stop: vi.fn(), onended: null, onmute: null }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } })
  vi.stubGlobal('AudioContext', FakeContext)
  vi.stubGlobal('AudioWorkletNode', FakeNode)
  vi.stubGlobal('WebSocket', FakeSocket)
  const ready = vi.fn(), failure = vi.fn()
  const client = new RemoteMicrophone('wss://station.example/api/v1/audio/tx', 'secret', ready, failure)
  return { client, ready, failure, track, stream }
}

it('authenticates outside the URL and sends exact PCM only after the agent prepared the DAC', async () => {
  const { client, ready } = setup()
  try {
    await client.start()
    const socket = FakeSocket.current
    socket.onopen?.()
    expect(socket.send).toHaveBeenLastCalledWith('{"token":"secret"}')
    const pcm = new ArrayBuffer(1920)
    const frame = () => FakeNode.current.port.onmessage?.(new MessageEvent('message', {
      data: { pcm, capturedAt: 0 },
    }))
    frame()
    expect(socket.send).toHaveBeenCalledOnce()
    const id = 'a'.repeat(43)
    socket.reply({ event: 'prepared', audio_session_id: id })
    frame()
    expect(socket.send).toHaveBeenLastCalledWith(pcm)
    expect(ready).not.toHaveBeenCalled()
    socket.reply({ event: 'ready', audio_session_id: id })
    expect(ready).toHaveBeenCalledWith(id)
    expect(client.sessionId).toBe(id)
  } finally { client.stop() }
})

it.each(['stale', 'congested'])('fails closed and releases the microphone on %s audio', async (fault) => {
  const { client, failure, track } = setup()
  await client.start()
  FakeSocket.current.reply({ event: 'prepared', audio_session_id: 'a'.repeat(43) })
  if (fault === 'stale') FakeContext.current.currentTime = 0.2
  else FakeSocket.current.bufferedAmount = 9 * 1920
  FakeNode.current.port.onmessage?.(new MessageEvent('message', {
    data: { pcm: new ArrayBuffer(1920), capturedAt: 0 },
  }))
  expect(failure).toHaveBeenCalledOnce()
  expect(FakeSocket.current.send).not.toHaveBeenCalled()
  expect(track.stop).toHaveBeenCalledOnce()
  expect(FakeContext.current.close).toHaveBeenCalledOnce()
  expect(client.sessionId).toBeNull()
})

it('stops a late permission result after cancellation instead of leaving capture running', async () => {
  const { client, track, stream } = setup()
  let resolve: ((value: typeof stream) => void) | undefined
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: () => new Promise((done) => { resolve = done }) },
  })
  const pending = client.start()
  client.stop()
  resolve?.(stream)
  await expect(pending).rejects.toThrow('cancelada')
  expect(track.stop).toHaveBeenCalledOnce()
})
