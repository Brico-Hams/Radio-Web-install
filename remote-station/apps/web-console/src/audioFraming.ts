export class AudioFramingError extends Error {
  readonly code: 'frame_too_large' | 'header_invalid' | 'block_invalid'
  constructor(code: AudioFramingError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export class AudioFraming {
  private pending = new Uint8Array(0)
  private rate = 0

  push(data: Uint8Array): { rate?: number; blocks: Int16Array[] } {
    if (data.length + this.pending.length > 1024 * 1024)
      throw new AudioFramingError('frame_too_large', 'Trama audio demasiado grande')
    const bytes = new Uint8Array(this.pending.length + data.length)
    bytes.set(this.pending)
    bytes.set(data, this.pending.length)
    let offset = 0
    let rate: number | undefined
    if (!this.rate && bytes.length >= 12) {
      const view = new DataView(bytes.buffer)
      const r = view.getUint32(4, true)
      if (String.fromCharCode(...bytes.slice(0, 4)) !== 'BHR1' ||
          r < 8000 || r > 48000 || view.getUint16(8, true) !== 1 ||
          view.getUint16(10, true) !== 16)
        throw new AudioFramingError('header_invalid', 'Cabecera de audio inválida')
      rate = this.rate = r
      offset = 12
    }
    const blocks: Int16Array[] = []
    while (this.rate && bytes.length - offset >= 4) {
      const length = new DataView(bytes.buffer, offset, 4).getUint32(0, true)
      if (length > this.rate / 5 || length % 2 !== 0)
        throw new AudioFramingError('block_invalid', 'Bloque de audio inválido')
      if (bytes.length - offset - 4 < length) break
      offset += 4
      if (length) {
        const view = new DataView(bytes.buffer, offset, length)
        const samples = new Int16Array(length / 2)
        for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true)
        blocks.push(samples)
      }
      offset += length
    }
    this.pending = bytes.slice(offset)
    return { rate, blocks }
  }
}
