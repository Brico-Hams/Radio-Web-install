import { isRecord } from './api'

export class RemoteMicrophone {
  sessionId: string | null = null
  private closed = false
  private stream?: MediaStream
  private context?: AudioContext
  private node?: AudioWorkletNode
  private socket?: WebSocket
  private prepared: string | null = null
  private timer?: number
  private heartbeat?: number
  private lastReply = 0
  private url: string
  private token: string
  private onReady: (id: string) => void
  private onFailure: (message: string) => void

  constructor(
    url: string, token: string,
    onReady: (id: string) => void, onFailure: (message: string) => void,
  ) {
    this.url = url
    this.token = token
    this.onReady = onReady
    this.onFailure = onFailure
  }

  private ensureOpen() {
    if (this.closed) throw new Error('Preparación del micrófono cancelada.')
  }

  async start() {
    const target = new URL(this.url)
    if (target.protocol !== 'wss:' && !(target.protocol === 'ws:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) {
      throw new Error('El micrófono remoto requiere un host HTTPS.')
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      throw new Error('Este cliente no dispone de micrófono y AudioWorklet seguros.')
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    })
    if (this.closed) {
      stream.getTracks().forEach((track) => track.stop())
      this.ensureOpen()
    }
    this.stream = stream
    for (const track of stream.getAudioTracks()) {
      track.onended = () => this.fail('Micrófono desconectado.')
      track.onmute = () => this.fail('Micrófono interrumpido por el sistema.')
    }
    const context = new AudioContext({ sampleRate: 48000 })
    this.context = context
    if (context.sampleRate !== 48000) throw new Error('Se requiere captura PCM a 48000 Hz.')
    await context.resume()
    this.ensureOpen()
    if (context.state !== 'running') throw new Error('El sistema ha suspendido el micrófono.')
    await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}tx-audio-worklet.js`)
    this.ensureOpen()
    const node = new AudioWorkletNode(context, 'bricoham-microphone', {
      numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1,
    })
    this.node = node
    const mute = context.createGain()
    mute.gain.value = 0
    context.createMediaStreamSource(stream).connect(node).connect(mute).connect(context.destination)
    context.onstatechange = () => {
      if (context.state !== 'running') this.fail('El sistema ha suspendido el micrófono.')
    }
    node.onprocessorerror = () => this.fail('Fallo del procesador del micrófono.')
    const socket = new WebSocket(this.url, 'bricoham.pcm-tx.v1')
    this.socket = socket
    socket.onopen = () => {
      if (this.closed) return
      try { socket.send(JSON.stringify({ token: this.token })) }
      catch { this.fail('No se pudo autenticar el canal de voz.') }
    }
    socket.onerror = () => this.fail('No se pudo establecer el canal seguro de voz.')
    socket.onclose = () => this.fail('Se perdió el canal de voz; se solicita RX.')
    socket.onmessage = ({ data }) => {
      try {
        if (typeof data !== 'string' || data.length > 4096) throw new Error('Respuesta de voz inválida.')
        const value: unknown = JSON.parse(data)
        if (!isRecord(value)) throw new Error('Respuesta de voz inválida.')
        if (value.event === 'error') throw new Error('El agente ha rechazado el canal de voz.')
        if (value.event === 'alive' && this.prepared) {
          this.lastReply = performance.now()
          return
        }
        if ((value.event !== 'prepared' && value.event !== 'ready') ||
          typeof value.audio_session_id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.audio_session_id)) {
          throw new Error('Sesión de audio inválida.')
        }
        if (value.event === 'prepared' && !this.prepared) this.prepared = value.audio_session_id
        else if (value.event === 'ready' && this.prepared === value.audio_session_id && !this.sessionId) {
          this.sessionId = value.audio_session_id
          window.clearTimeout(this.timer)
          this.onReady(this.sessionId)
        } else throw new Error('Secuencia de audio inválida.')
        this.lastReply = performance.now()
      } catch (error) {
        this.fail(error instanceof Error ? error.message : 'Respuesta de audio inválida.')
      }
    }
    node.port.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (this.closed) return
      node.port.postMessage('ack')
      if (!isRecord(data) || !(data.pcm instanceof ArrayBuffer) || data.pcm.byteLength !== 1920 ||
        typeof data.capturedAt !== 'number' || !Number.isFinite(data.capturedAt)) {
        this.fail('Fallo de captura o cola del micrófono saturada.')
        return
      }
      if (!this.prepared) return
      if (Math.abs(context.currentTime - data.capturedAt) > 0.15 || socket.bufferedAmount > 8 * 1920) {
        this.fail('Audio atrasado o red saturada: transmisión detenida.')
        return
      }
      if (socket.readyState !== WebSocket.OPEN) {
        this.fail('Canal de micrófono cerrado.')
        return
      }
      try { socket.send(data.pcm) }
      catch { this.fail('No se pudo enviar audio; transmisión detenida.') }
    }
    this.timer = window.setTimeout(() => this.fail('El agente no preparó el audio a tiempo.'), 8000)
    this.heartbeat = window.setInterval(() => {
      if (this.prepared && performance.now() - this.lastReply > 3000) this.fail('Canal de voz sin respuesta.')
    }, 500)
  }

  private fail(message: string) {
    if (this.closed) return
    this.stop()
    this.onFailure(message)
  }

  stop() {
    if (this.closed) return
    this.closed = true
    this.sessionId = null
    window.clearTimeout(this.timer)
    window.clearInterval(this.heartbeat)
    this.socket?.close()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.node?.disconnect()
    this.node?.port.close()
    if (this.context) {
      this.context.onstatechange = null
      void this.context.close().catch((error: unknown) => console.error('No se pudo cerrar el micrófono.', error))
    }
  }
}
