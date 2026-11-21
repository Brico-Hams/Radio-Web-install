import { useEffect, useMemo, useRef, useState } from 'react'
import { createAudioRequest } from './api'
import { AudioFraming, AudioFramingError } from './audioFraming'
import { useLanguage, type Message } from './i18n'

type AudioStatus = { key: Message; detail?: string }

class AudioDisplayError extends Error {
  readonly key: Message
  readonly detail?: string
  constructor(key: Message, detail?: string) {
    super(key)
    this.key = key
    this.detail = detail
  }
}

const framingMessages = {
  frame_too_large: 'rxFrameTooLarge', header_invalid: 'rxHeaderInvalid', block_invalid: 'rxBlockInvalid',
} as const

export function AudioPanel({ token }: { token: string }) {
  const { t } = useLanguage()
  const request = useMemo(() => createAudioRequest(token), [token])
  const current = useRef<{ abort: AbortController; context: AudioContext; node?: AudioWorkletNode } | null>(null)
  const [state, setState] = useState<AudioStatus>({ key: 'rxStoppedInitial' })

  function stop() {
    const session = current.current
    current.current = null
    if (session) {
      session.abort.abort()
      session.node?.disconnect()
      void session.context.close()
    }
  }
  useEffect(() => () => stop(), [])

  async function start() {
    stop()
    if (!window.AudioContext || !window.AudioWorkletNode) {
      setState({ key: 'rxUnavailable' })
      return
    }
    let context: AudioContext
    try {
      context = new AudioContext()
    } catch {
      setState({ key: 'rxContextFailed' })
      return
    }
    const session = { abort: new AbortController(), context, node: undefined as AudioWorkletNode | undefined }
    current.current = session
    try {
      if (!context.audioWorklet) throw new AudioDisplayError('rxUnavailable')
      await context.resume()
      await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}rx-audio-worklet.js`)
      if (current.current !== session) return
      const response = await request(session.abort.signal)
      if (!response.ok) throw new AudioDisplayError('rxHttpUnavailable', `(HTTP ${response.status}).`)
      if (response.headers.get('content-type') !== 'application/vnd.bricoham.pcm' || !response.body)
        throw new AudioDisplayError('rxInvalidResponse')
      const reader = response.body.getReader()
      const framing = new AudioFraming()
      let accepted: (() => void) | undefined
      setState({ key: 'rxBuffering' })
      while (current.current === session) {
        const { value, done } = await reader.read()
        if (done) throw new AudioDisplayError('rxFlowEnded')
        const decoded = framing.push(value)
        if (decoded.rate) {
          const node = new AudioWorkletNode(context, 'bricoham-rx', {
            processorOptions: { inputRate: decoded.rate },
          })
          session.node = node
          node.connect(context.destination)
          node.port.onmessage = (event: MessageEvent<{ state: string }>) => {
            if (current.current !== session) return
            if (event.data.state === 'accepted') accepted?.()
            else if (event.data.state === 'overflow') {
              stop()
              setState({ key: 'rxOverflow' })
            } else if (event.data.state === 'underflow') setState({ key: 'rxUnderflow' })
            else if (event.data.state === 'playing') setState({ key: 'rxPlaying' })
          }
        }
        for (const block of decoded.blocks) {
          if (!session.node) throw new AudioDisplayError('rxHeaderMissing')
          const node = session.node
          await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => {
              clearTimeout(timer)
              session.abort.signal.removeEventListener('abort', aborted)
              accepted = undefined
              if (error) reject(error)
              else resolve()
            }
            const aborted = () => finish(new AudioDisplayError('rxStopped'))
            const timer = setTimeout(() => finish(new AudioDisplayError('rxWorkletUnresponsive')), 2000)
            accepted = () => finish()
            session.abort.signal.addEventListener('abort', aborted, { once: true })
            if (session.abort.signal.aborted) aborted()
            else node.port.postMessage(block, [block.buffer])
          })
        }
      }
    } catch (error) {
      if (current.current === session) {
        stop()
        setState(error instanceof AudioDisplayError ? { key: error.key, detail: error.detail }
          : error instanceof AudioFramingError ? { key: framingMessages[error.code] }
          : { key: 'rxError', detail: error instanceof Error ? error.message : undefined })
      }
    }
  }

  return <section className="panel">
    <h2>{t('rxTitle')}</h2>
    <p>{t(state.key)}{state.detail ? ` ${state.detail}` : ''}</p>
    <button type="button" onClick={() => void start()}>{t('rxListen')}</button>{' '}
    <button type="button" onClick={() => { stop(); setState({ key: 'rxStopped' }) }}>{t('rxStop')}</button>
    <p>{t('rxSafety')}</p>
  </section>
}
