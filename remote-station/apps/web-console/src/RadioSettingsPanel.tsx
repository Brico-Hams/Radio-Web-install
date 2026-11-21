import { useMemo, useState, type FormEvent } from 'react'
import {
  createControlRequest, getApiData, isRecord, isRadioSettings as isSettings,
  isYaesuControlModel, type YaesuControlModel,
  type RadioSettings as Settings,
} from './api'
type ObservedSettings = Settings & {
  power_level: number
  tx_active: boolean
  observed_at: number
} & (
  { model: 'IC-7300'; tuner_state: number } |
  { model: 'FTX-1'; power_head: 'field' | 'SPA-1'; tuner_busy: boolean }
  | { model: YaesuControlModel; tuner_busy: boolean }
)

function isObserved(value: unknown): value is ObservedSettings {
  if (!isRecord(value)) return false
  return typeof value.power_level === 'number' && Number.isInteger(value.power_level) &&
    ((value.model === 'IC-7300' && value.power_level >= 0 && value.power_level <= 255 &&
      typeof value.tuner_state === 'number' && [0, 1, 2].includes(value.tuner_state)) ||
     (value.model === 'FTX-1' && value.power_level >= 5 &&
      (value.power_head === 'field' || value.power_head === 'SPA-1') &&
      value.power_level <= (value.power_head === 'field' ? 10 : 100) &&
      typeof value.tuner_busy === 'boolean') ||
     (isYaesuControlModel(value.model) && value.power_level >= 5 &&
       value.power_level <= (value.model === 'FTDX101MP' ? 200 : 100) &&
       typeof value.tuner_busy === 'boolean')) &&
    typeof value.tx_active === 'boolean' &&
    typeof value.observed_at === 'number' && Number.isFinite(value.observed_at) && isSettings(value)
}

export function RadioSettingsPanel({ token }: { token: string }) {
  const sendControl = useMemo(() => createControlRequest(token), [token])
  const [config, setConfig] = useState<Settings | null>(null)
  const [observed, setObserved] = useState<ObservedSettings | null>(null)
  const [verified, setVerified] = useState(false)
  const [level, setLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setVerified(false)
    setObserved(null)
    setError('')
    try {
      const response = await getApiData(token, '/radio-settings', isSettings)
      if (!response.allowed) throw new Error('Estos ajustes requieren permiso de admin u operador.')
      setConfig(response.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error de configuración de radio.')
    } finally {
      setBusy(false)
    }
  }

  async function operate(body: object) {
    setBusy(true)
    setVerified(false)
    setError('')
    try {
      const response = await sendControl('/radio-settings', body, isObserved)
      setConfig(response)
      setObserved(response)
      setLevel(String(response.power_level))
      setVerified(true)
    } catch (operationError) {
      setError(`Operación no confirmada. Lee el estado antes de otro ajuste; no se reintenta automáticamente. ${
        operationError instanceof Error ? operationError.message : 'Error de ajustes de radio.'
      }`)
    } finally {
      setBusy(false)
    }
  }

  function writeBody(operation: 'set_power' | 'set_tuner', value: object) {
    try {
      void operate({ operation, request_id: crypto.randomUUID(), ...value })
    } catch (identifierError) {
      setError(identifierError instanceof Error ? identifierError.message : 'No se pudo identificar la orden.')
    }
  }

  function power(event: FormEvent) {
    event.preventDefault()
    writeBody('set_power', { power_level: Number(level) })
  }

  const tunerBusy = observed?.model === 'IC-7300' ? observed.tuner_state === 2 : observed?.tuner_busy
  const blocked = busy || !verified || observed?.tx_active !== false || tunerBusy !== false
  const maximum = config?.model === 'FTX-1' && observed?.model === 'FTX-1' &&
    observed.power_head === 'field' ? Math.min(config.power_level_max, 10) : config?.power_level_max
  return (
    <section className="content-card operation-panel" aria-labelledby="radio-settings-title">
      <h2 id="radio-settings-title">Potencia y acoplador{config ? ` · ${config.model}` : ''}</h2>
      <p>Experimental y opt-in. IC-7300 usa posición CAT 0–255, no vatios. FTX-1
        admite consigna en W del manual 2508-C y cabezal observado, incluido SPA-1
        por el CAT de la radio, nunca por un enlace independiente. No es potencia RF medida.
        El agente comprueba RX antes de ajustar,
        pero esto no es un interlock físico ni impide un PTT local simultáneo.</p>
      {config?.model === 'IC-7300' ? <p>El acoplador IC-7300 solo admite insertar/bypass.
        No se inicia sintonía ni transmisión. Para insertar, PTT Start debe estar
        desactivado localmente; valida la instalación sin accesorios externos.</p> :
        <p>Yaesu ajusta consigna de potencia según modelo. No conmuta ATU/ATAS ni inicia sintonía o transmisión.</p>}
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load()}>Consultar configuración de ajustes</button>
        <button className="button button-secondary" disabled={busy || !config}
          onClick={() => void operate({ operation: 'read' })}>Leer potencia y acoplador</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {config ? <>
        <p>Modelo: {config.model}. Límite local: {config.power_level_max}
          {config.model === 'IC-7300' ? ' / 255 CAT' : ' W de consigna (no medida RF)'}.
          No se cambia automáticamente un nivel existente.</p>
        <p>Último nivel reportado: {observed?.power_level ?? 'no consultado'}.
          {observed?.model === 'IC-7300' ?
            ` Acoplador: ${['bypass', 'insertado', 'sintonizando'][observed.tuner_state]}.` :
            observed?.model === 'FTX-1' ?
              ` Cabezal: ${observed.power_head}. ATU/ATAS solicita sintonía/movimiento: ${observed.tuner_busy ? 'sí' : 'no'}.` :
              observed && isYaesuControlModel(observed.model) ?
                ` ATU solicita sintonía/movimiento: ${observed.tuner_busy ? 'sí' : 'no'}.` : null}
          TX observado: {observed ? (observed.tx_active ? 'sí' : 'no') : 'no consultado'}.</p>
        {!verified ? <p>Consulta el estado antes de habilitar los ajustes.</p> : null}
        <form onSubmit={power}>
          <label>{config.model === 'IC-7300' ? 'Nivel de potencia CAT (no W)' : 'Consigna de potencia (W, no medida RF)'}
            <input type="number" step="1" min={config.model === 'IC-7300' ? 0 : 5} max={maximum}
              required value={level} onChange={(event) => setLevel(event.target.value)} />
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !config.power_adjustment_enabled}>Aplicar nivel de potencia</button>
        </form>
        {config.model === 'IC-7300' ? <div className="session-actions">
          <button className="button button-secondary"
            disabled={blocked || !config.tuner_switching_enabled}
            onClick={() => writeBody('set_tuner', { enabled: true })}>Insertar acoplador</button>
          <button className="button button-secondary"
            disabled={blocked || !config.tuner_switching_enabled}
            onClick={() => writeBody('set_tuner', { enabled: false })}>Bypass de acoplador</button>
        </div> : null}
      </> : null}
    </section>
  )
}
