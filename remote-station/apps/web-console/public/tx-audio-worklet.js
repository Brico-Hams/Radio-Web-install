class BricoHamMicrophone extends AudioWorkletProcessor {
  constructor() {
    super()
    this.block = new ArrayBuffer(1920)
    this.view = new DataView(this.block)
    this.offset = 0
    this.pending = 0
    this.failed = false
    this.port.onmessage = ({ data }) => {
      if (data === 'ack') this.pending = Math.max(0, this.pending - 1)
    }
  }

  process(inputs) {
    if (this.failed) return true
    const channel = inputs[0]?.[0]
    if (!channel) return true
    for (const sample of channel) {
      const value = Math.max(-1, Math.min(1, sample))
      this.view.setInt16(this.offset++ * 2, Math.round(value < 0 ? value * 32768 : value * 32767), true)
      if (this.offset === 960) {
        if (this.pending >= 8) {
          this.failed = true
          this.port.postMessage({ error: 'Cola de captura saturada.' })
          return true
        }
        this.pending++
        this.port.postMessage({ pcm: this.block, capturedAt: currentTime }, [this.block])
        this.block = new ArrayBuffer(1920)
        this.view = new DataView(this.block)
        this.offset = 0
      }
    }
    return true
  }
}

registerProcessor('bricoham-microphone', BricoHamMicrophone)
