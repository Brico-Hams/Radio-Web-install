import { useMemo, useState, type FormEvent } from 'react'
import {
  createControlRequest, getApiData, isRadioSettings, isRecord, type RadioSettings,
} from './api'

type Receiver = 'MAIN' | 'SUB'
type ModeOption = { code: string; label: string }
type Config = RadioSettings & {
  model: 'FTX-1'
  frequency_adjustment_enabled: boolean
  mode_adjustment_enabled: boolean
  mode_options: ModeOption[]
}
type ReceiverState = { frequency_hz: number; mode_code: string }
type Operating = Config & {
  receivers: Record<Receiver, ReceiverState>
  tx_active: boolean
  tuner_busy: boolean
  observed_at: number
}

function isModeOption(value: unknown): value is ModeOption {
  return isRecord(value) && typeof value.code === 'string' &&
    /^[1-9A-FHI]$/.test(value.code) && typeof value.label === 'string' &&
    value.label.length > 0 && value.label.length <= 32
}

function isConfig(value: unknown): value is Config {
  if (!isRecord(value) || typeof value.frequency_adjustment_enabled !== 'boolean' ||
    typeof value.mode_adjustment_enabled !== 'boolean' || !Array.isArray(value.mode_options) ||
    value.mode_options.length === 0 || value.mode_options.length > 32 ||
    !value.mode_options.every(isModeOption) ||
    new Set(value.mode_options.map((mode) => mode.code)).size !== value.mode_options.length) return false
  return isRadioSettings(value) && value.model === 'FTX-1'
}

function isOperating(value: unknown): value is Operating {
  if (!isRecord(value) || !isRecord(value.receivers)) return false
  const receivers = value.receivers
  if (!['MAIN', 'SUB'].every((side) => {
    const state = receivers[side]
    return isRecord(state) && typeof state.frequency_hz === 'number' &&
      Number.isInteger(state.frequency_hz) && state.frequency_hz >= 30_000 &&
      state.frequency_hz <= 470_000_000 && typeof state.mode_code === 'string'
  })) return false
  if (typeof value.tx_active !== 'boolean' || typeof value.tuner_busy !== 'boolean' ||
    typeof value.observed_at !== 'number' || !Number.isFinite(value.observed_at) ||
    !isConfig(value)) return false
  return ['MAIN', 'SUB'].every((side) => {
    const state = receivers[side]
    return isRecord(state) && value.mode_options.some((mode) => mode.code === state.mode_code)
  })
}

export function RadioOperatingPanel({ token }: { token: string }) {
  const send = useMemo(() => createControlRequest(token), [token])
  const [config, setConfig] = useState<Config | null>(null)
  const [observed, setObserved] = useState<Operating | null>(null)
  const [receiver, setReceiver] = useState<Receiver>('MAIN')
  const [frequency, setFrequency] = useState('')
  const [mode, setMode] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function show(state: Operating, side: Receiver) {
    setFrequency(String(state.receivers[side].frequency_hz))
    setMode(state.receivers[side].mode_code)
  }

  async function load() {
    setBusy(true)
    setVerified(false)
    setObserved(null)
    setConfig(null)
    setError('')
    try {
      const result = await getApiData(token, '/radio-settings', isConfig)
      if (!result.allowed) throw new Error('Requiere permiso de admin u operador.')
      setConfig(result.data)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Configuración FTX-1 no disponible.')
    } finally {
      setBusy(false)
    }
  }

  async function operate(body: object) {
    setBusy(true)
    setVerified(false)
    setError('')
    try {
      const result = await send('/radio-settings', body, isOperating)
      setConfig(result)
      setObserved(result)
      show(result, receiver)
      setVerified(true)
    } catch (failure) {
      setError(`Operación no confirmada; lee de nuevo antes de ajustar. No hay reintento automático. ${
        failure instanceof Error ? failure.message : 'Error CAT FTX-1.'
      }`)
    } finally {
      setBusy(false)
    }
  }

  function adjust(event: FormEvent, operation: 'set_frequency' | 'set_mode') {
    event.preventDefault()
    try {
      void operate({
        operation, receiver, request_id: crypto.randomUUID(),
        ...(operation === 'set_frequency' ? { frequency_hz: Number(frequency) } : { mode_code: mode }),
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo identificar la orden.')
    }
  }

  const blocked = busy || !verified || observed?.tx_active !== false || observed.tuner_busy
  return (
    <section className="content-card operation-panel" aria-labelledby="operating-title">
      <h2 id="operating-title">Frecuencia y modo FTX-1</h2>
      <p>CAT experimental real, separado de la demostración. MAIN/SUB son los
        receptores del manual 2508-C; no selecciona VFO activo ni transmisor.
        No habilita PTT. RX/ATU observados no son interlocks físicos: un control
        local puede cambiar el estado entre comandos.</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load()}>Consultar controles FTX-1</button>
        <button className="button button-secondary" disabled={busy || !config}
          onClick={() => void operate({ operation: 'read_operating' })}>Leer receptores FTX-1</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {config ? <>
        <label>Receptor FTX-1
          <select value={receiver} disabled={busy} onChange={(event) => {
            const side = event.target.value
            if (side !== 'MAIN' && side !== 'SUB') {
              setError('Selecciona explícitamente MAIN o SUB.')
              return
            }
            setReceiver(side)
            if (observed) show(observed, side)
          }}>
            <option value="MAIN">MAIN (FA / MD0)</option>
            <option value="SUB">SUB (FB / MD1)</option>
          </select>
        </label>
        {observed ? <p>Última lectura de {receiver}: {observed.receivers[receiver].frequency_hz} Hz,
          modo {config.mode_options.find((option) => option.code === observed.receivers[receiver].mode_code)?.label}.
          TX observado: {observed.tx_active ? 'sí' : 'no'}.
          ATU/ATAS solicita sintonía/movimiento: {observed.tuner_busy ? 'sí' : 'no'}.</p> : null}
        {!verified ? <p>Lectura explícita requerida antes de ajustar.</p> : null}
        <form onSubmit={(event) => adjust(event, 'set_frequency')}>
          <label>Frecuencia del receptor (Hz)
            <input type="number" step="1" min="30000" max="470000000" required
              value={frequency} onChange={(event) => setFrequency(event.target.value)} />
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !config.frequency_adjustment_enabled}>Aplicar frecuencia</button>
        </form>
        <form onSubmit={(event) => adjust(event, 'set_mode')}>
          <label>Modo del receptor
            <select required value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="">Lee el estado primero</option>
              {config.mode_options.map((option) =>
                <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !config.mode_adjustment_enabled}>Aplicar modo</button>
        </form>
      </> : null}
    </section>
  )
}
