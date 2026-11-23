import { useEffect, useRef, useState, type MouseEvent, type MutableRefObject } from 'react'
import { useLanguage } from './i18n'
import { emitWaterfallClick } from './tuneBus'
import { COLOR_MAPS, colorLut, createAudioAnalyzer, levelToByte, passbandHz, resampleRow, type ColorMap } from './spectrum'

export type SpectrumSink = (samples: Int16Array, sampleRate: number) => void

const WIDTH = 640
const LINE_HEIGHT = 90
const FALL_HEIGHT = 160
const MIN_ROW_INTERVAL_MS = 40
const mapKeys = { heat: 'specHeat', ice: 'specIce', gray: 'specGray' } as const

// Audio-passband waterfall fed with the RX PCM blocks AudioPanel already receives (no second audio listener).
// Receive-only display: no transmit path. Clicking sends the audio offset to the CAT operating panel (tuneBus),
// which applies it through its existing set_frequency path only when the radio, mode (USB/LSB) and state allow it.
export function SpectrumPanel({ sinkRef }: { sinkRef: MutableRefObject<SpectrumSink | null> }) {
  const { t } = useLanguage()
  const line = useRef<HTMLCanvasElement>(null)
  const fall = useRef<HTMLCanvasElement>(null)
  const spanRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [map, setMap] = useState<ColorMap>('heat')
  const [floorDb, setFloorDb] = useState(-100)
  const [ceilDb, setCeilDb] = useState(-20)
  const live = useRef({ paused, map, floorDb, ceilDb })
  useEffect(() => { live.current = { paused, map, floorDb, ceilDb } }, [paused, map, floorDb, ceilDb])

  function pick(event: MouseEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    if (!spanRef.current || box.width <= 0) return
    emitWaterfallClick(((event.clientX - box.left) / box.width) * spanRef.current)
  }

  useEffect(() => {
    let analyzer: ReturnType<typeof createAudioAnalyzer> | null = null
    let rate = 0
    let lastRow = 0
    let lut = colorLut(live.current.map)
    let lutName = live.current.map
    sinkRef.current = (samples, sampleRate) => {
      if (live.current.paused) return
      if (!analyzer || rate !== sampleRate) {
        analyzer = createAudioAnalyzer(sampleRate, 1024, 512)
        rate = sampleRate
      }
      const row = analyzer.push(samples)
      const lineCanvas = line.current
      const fallCanvas = fall.current
      const now = performance.now()
      if (!row || !lineCanvas || !fallCanvas || now - lastRow < MIN_ROW_INTERVAL_MS) return
      const lineCtx = lineCanvas.getContext('2d')
      const fallCtx = fallCanvas.getContext('2d')
      if (!lineCtx || !fallCtx) return
      lastRow = now
      const { floorDb: floor, ceilDb: ceil, map: name } = live.current
      if (name !== lutName) { lut = colorLut(name); lutName = name }
      const span = passbandHz(sampleRate)
      spanRef.current = span
      const columns = resampleRow(row, analyzer.binHz, span, WIDTH)
      lineCtx.fillStyle = '#05080A'
      lineCtx.fillRect(0, 0, WIDTH, LINE_HEIGHT)
      lineCtx.font = '11px sans-serif'
      lineCtx.strokeStyle = '#38434C'
      lineCtx.fillStyle = '#BAC4CC'
      for (let hz = 0; hz <= span; hz += 500) {
        const x = Math.min(WIDTH - 1, Math.round((hz / span) * WIDTH))
        lineCtx.beginPath(); lineCtx.moveTo(x, 0); lineCtx.lineTo(x, LINE_HEIGHT); lineCtx.stroke()
        if (hz % 1000 === 0) lineCtx.fillText(hz ? `${hz / 1000}k` : '0', Math.min(x + 3, WIDTH - 20), LINE_HEIGHT - 4)
      }
      const step = ceil - floor >= 60 ? 20 : 10
      for (let db = Math.ceil(floor / step) * step; db <= ceil; db += step) {
        const y = Math.round((1 - (db - floor) / (ceil - floor)) * (LINE_HEIGHT - 2)) + 1
        lineCtx.beginPath(); lineCtx.moveTo(0, y); lineCtx.lineTo(WIDTH, y); lineCtx.stroke()
        lineCtx.fillText(`${db} dB`, 3, Math.max(11, y - 2))
      }
      lineCtx.strokeStyle = '#FFB52E'
      lineCtx.beginPath()
      fallCtx.drawImage(fallCanvas, 0, 1)
      const image = fallCtx.createImageData(WIDTH, 1)
      for (let x = 0; x < WIDTH; x += 1) {
        const level = levelToByte(columns[x], floor, ceil)
        const y = LINE_HEIGHT - 1 - (level / 255) * (LINE_HEIGHT - 2)
        if (x) lineCtx.lineTo(x, y); else lineCtx.moveTo(x, y)
        image.data.set([lut[level * 3], lut[level * 3 + 1], lut[level * 3 + 2], 255], x * 4)
      }
      lineCtx.stroke()
      fallCtx.putImageData(image, 0, 0)
    }
    return () => { sinkRef.current = null }
  }, [sinkRef])

  return <div className="spectrum" role="group" aria-label={t('specTitle')}>
    <h3>{t('specTitle')}</h3>
    <canvas ref={line} width={WIDTH} height={LINE_HEIGHT} role="img" aria-label={t('specTitle')} onClick={pick} style={{ width: '100%', background: '#05080A' }} />
    <canvas ref={fall} width={WIDTH} height={FALL_HEIGHT} aria-hidden="true" onClick={pick} style={{ width: '100%', background: '#05080A', cursor: 'crosshair' }} />
    <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{t(paused ? 'specResume' : 'specPause')}</button>{' '}
    <label>{t('specMap')} <select value={map} onChange={(event) => setMap(event.target.value as ColorMap)}>
      {COLOR_MAPS.map((name) => <option key={name} value={name}>{t(mapKeys[name])}</option>)}
    </select></label>{' '}
    <label>{t('specFloor')} <input type="range" min={-140} max={-40} step={5} value={floorDb}
      onChange={(event) => setFloorDb(Math.min(Number(event.target.value), ceilDb - 10))} /></label>{' '}
    <label>{t('specCeil')} <input type="range" min={-60} max={0} step={5} value={ceilDb}
      onChange={(event) => setCeilDb(Math.max(Number(event.target.value), floorDb + 10))} /></label>
    <p>{t('specNote')}</p>
  </div>
}
