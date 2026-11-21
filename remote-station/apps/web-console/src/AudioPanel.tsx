import { useEffect, useMemo, useRef, useState } from 'react'
import { createAudioRequest } from './api'
import { AudioFraming } from './audioFraming'

export function AudioPanel({ token }: { token: string }) {
  const request = useMemo(() => createAudioRequest(token), [token])
  const current = useRef<{ abort: AbortController; context: AudioContext; node?: AudioWorkletNode } | null>(null)
  const [state, setState] = useState('Audio RX experimental detenido; hardware sin validar.')

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
      setState('AudioWorklet no disponible en este navegador o dispositivo.')
      return
    }
    let context: AudioContext
    try {
      context = new AudioContext()
    } catch {
      setState('No se pudo crear el contexto de audio en este dispositivo.')
      return
    }
    const session = { abort: new AbortController(), context, node: undefined as AudioWorkletNode | undefined }
    current.current = session
    try {
      if (!context.audioWorklet) throw new Error('AudioWorklet no disponible en este dispositivo.')
      await context.resume()
      await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}rx-audio-worklet.js`)
      if (current.current !== session) return
      const response = await request(session.abort.signal)
      if (!response.ok) throw new Error(`Audio no disponible (HTTP ${response.status}).`)
      if (response.headers.get('content-type') !== 'application/vnd.bricoham.pcm' || !response.body)
        throw new Error('Respuesta de audio inválida.')
      const reader = response.body.getReader()
      const framing = new AudioFraming()
      let accepted: (() => void) | undefined
      setState('Conectado; llenando búfer de audio…')
      while (current.current === session) {
        const { value, done } = await reader.read()
        if (done) throw new Error('El flujo terminó inesperadamente.')
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
              setState('Error: desbordamiento del búfer de reproducción.')
            } else if (event.data.state === 'underflow') setState('Audio RX: búfer insuficiente; esperando datos…')
            else if (event.data.state === 'playing') setState('Audio RX experimental reproduciendo.')
          }
        }
        for (const block of decoded.blocks) {
          if (!session.node) throw new Error('Cabecera de audio ausente.')
          const node = session.node
          await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => {
              clearTimeout(timer)
              session.abort.signal.removeEventListener('abort', aborted)
              accepted = undefined
              if (error) reject(error)
              else resolve()
            }
            const aborted = () => finish(new Error('Audio detenido.'))
            const timer = setTimeout(() => finish(new Error('AudioWorklet no responde.')), 2000)
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
        setState(error instanceof Error ? `Error de audio: ${error.message}` : 'Error de audio.')
      }
    }
  }

  return <section className="panel">
    <h2>Audio RX experimental</h2>
    <p>{state}</p>
    <button type="button" onClick={() => void start()}>Escuchar RX</button>{' '}
    <button type="button" onClick={() => { stop(); setState('Audio RX detenido.') }}>Detener</button>
    <p>Solo recepción; sin micrófono ni transmisión. La aceptación física está pendiente.</p>
  </section>
}
