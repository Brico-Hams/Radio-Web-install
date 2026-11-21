class BricoHamRx extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.rate = options.processorOptions.inputRate
    this.ring = new Float32Array(this.rate)
    this.read = 0
    this.count = 0
    this.phase = 0
    this.playing = false
    this.failed = false
    this.port.onmessage = ({ data }) => {
      if (this.failed) return
      if (!(data instanceof Int16Array) || this.count + data.length > this.ring.length) {
        this.failed = true
        this.port.postMessage({ state: 'overflow' })
        return
      }
      for (let i = 0; i < data.length; i++) {
        this.ring[(this.read + this.count++) % this.ring.length] = data[i] / 32768
      }
      this.port.postMessage({ state: 'accepted' })
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0][0]
    if (this.failed) return false
    if (!this.playing && this.count >= this.rate / 10) {
      this.playing = true
      this.port.postMessage({ state: 'playing' })
    }
    for (let i = 0; i < output.length && this.playing; i++) {
      if (this.count < 2) {
        this.playing = false
        this.phase = 0
        this.port.postMessage({ state: 'underflow' })
        break
      }
      const a = this.ring[this.read]
      const b = this.ring[(this.read + 1) % this.ring.length]
      output[i] = a + (b - a) * this.phase
      this.phase += this.rate / sampleRate
      const used = Math.min(Math.floor(this.phase), this.count)
      this.read = (this.read + used) % this.ring.length
      this.count -= used
      this.phase -= used
    }
    return true
  }
}
registerProcessor('bricoham-rx', BricoHamRx)
