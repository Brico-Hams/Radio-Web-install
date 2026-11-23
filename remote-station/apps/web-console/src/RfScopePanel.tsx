import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createScopeRequest } from './api'
import { useLanguage, type Message } from './i18n'
import { emitScopeClick } from './tuneBus'
import { COLOR_MAPS, colorLut, parseScopeLine, scopeClickHz, scopeColumns, type ColorMap, type ScopeRow } from './spectrum'

const WIDTH = 640
const LINE_HEIGHT = 90
const FALL_HEIGHT = 160
const mapKeys = { heat: 'specHeat', ice: 'specIce', gray: 'specGray' } as const
const MAX_LINE = 8192

// Radio-native RF scope (Icom CI-V 27 00 via the agent's /api/v1/cat/scope). Receive-only: it never keys the radio.
// Clicking sends the RF frequency to the operating panel, which applies it through its existing set_frequency path.
export function RfScopePanel({ token }: { token: string }) {
  const { t } = useLanguage()
  const request = useMemo(() => createScopeRequest(token), [token])
  const line = useRef<HTMLCanvasElement>(null)
  const fall = useRef<HTMLCanvasElement>(null)
  const abort = useRef<AbortController | null>(null)
  const lastRow = useRef<ScopeRow | null>(null)
  const [status, setStatus] = useState<Message>('scopeIdle')
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [map, setMap] = useState<ColorMap>('heat')
  const live = useRef({ paused, map })
  live.current = { paused, map }

  function stop() {
    abort.current?.abort()
    abort.current = null
    setRunning(false)
  }
  useEffect(() => () => abort.current?.abort(), [])

  function draw(row: ScopeRow) {
    const lineCanvas = line.current
    const fallCanvas = fall.current
    const lineCtx = lineCanvas?.getContext('2d')
    const fallCtx = fallCanvas?.getContext('2d')
    if (!lineCanvas || !fallCanvas || !lineCtx || !fallCtx) return
    lastRow.current = row
    const lut = colorLut(live.current.map)
    const columns = scopeColumns(row.pixels, WIDTH)
    lineCtx.fillStyle = '#05080A'
    lineCtx.fillRect(0, 0, WIDTH, LINE_HEIGHT)
    lineCtx.font = '11px sans-serif'
    lineCtx.fillStyle = '#BAC4CC'
    const mhz = (hz: number) => `${(hz / 1e6).toFixed(3)}`
    lineCtx.fillText(`${mhz(row.startHz)} MHz`, 3, LINE_HEIGHT - 4)
    lineCtx.fillText(`${mhz(row.endHz)} MHz`, WIDTH - 80, LINE_HEIGHT - 4)
    lineCtx.strokeStyle = '#FFB52E'
    lineCtx.beginPath()
    fallCtx.drawImage(fallCanvas, 0, 1)
    const image = fallCtx.createImageData(WIDTH, 1)
    for (let x = 0; x < WIDTH; x += 1) {
      const level = columns[x]
      const y = LINE_HEIGHT - 1 - (level / 255) * (LINE_HEIGHT - 2)
      if (x) lineCtx.lineTo(x, y); else lineCtx.moveTo(x, y)
      image.data.set([lut[level * 3], lut[level * 3 + 1], lut[level * 3 + 2], 255], x * 4)
    }
    lineCtx.stroke()
    fallCtx.putImageData(image, 0, 0)
  }

  async function start() {
    stop()
    const controller = new AbortController()
    abort.current = controller
    setRunning(true)
    setStatus('scopeConnecting')
    try {
      const response = await request(controller.signal)
      if (!response.ok) {
        setStatus(response.status === 501 ? 'scopeNotSourced' : 'scopeError')
        return
      }
      if (response.headers.get('content-type') !== 'application/x-ndjson' || !response.body) {
        setStatus('scopeError')
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      setStatus('scopeRunning')
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        if (buffer.length > MAX_LINE * 4) throw new Error('scope line too long')
        let index = buffer.indexOf('\n')
        while (index >= 0) {
          const text = buffer.slice(0, index)
          buffer = buffer.slice(index + 1)
          const row = text.length <= MAX_LINE ? parseScopeLine(text) : null
          if (row && !live.current.paused) draw(row)
          index = buffer.indexOf('\n')
        }
      }
      setStatus('scopeEnded')
    } catch {
      if (!controller.signal.aborted) setStatus('scopeError')
    } finally {
      if (abort.current === controller) { abort.current = null; setRunning(false) }
    }
  }

  function pick(event: MouseEvent<HTMLCanvasElement>) {
    const row = lastRow.current
    const box = event.currentTarget.getBoundingClientRect()
    if (!row || box.width <= 0) return
    const hz = scopeClickHz(row, (event.clientX - box.left) / box.width)
    if (hz !== null) emitScopeClick(hz)
  }

  return <div className="spectrum" role="group" aria-label={t('scopeTitle')}>
    <h3>{t('scopeTitle')}</h3>
    <button type="button" disabled={running} onClick={() => void start()}>{t('scopeStart')}</button>{' '}
    <button type="button" disabled={!running} onClick={() => { stop(); setStatus('scopeEnded') }}>{t('scopeStop')}</button>{' '}
    <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{t(paused ? 'specResume' : 'specPause')}</button>{' '}
    <label>{t('specMap')} <select value={map} onChange={(event) => setMap(event.target.value as ColorMap)}>
      {COLOR_MAPS.map((name) => <option key={name} value={name}>{t(mapKeys[name])}</option>)}
    </select></label>
    <p role="status">{t(status)}</p>
    <canvas ref={line} width={WIDTH} height={LINE_HEIGHT} role="img" aria-label={t('scopeTitle')} onClick={pick} style={{ width: '100%', background: '#05080A' }} />
    <canvas ref={fall} width={WIDTH} height={FALL_HEIGHT} aria-hidden="true" onClick={pick} style={{ width: '100%', background: '#05080A', cursor: 'crosshair' }} />
    <p>{t('scopeNote')}</p>
  </div>
}
