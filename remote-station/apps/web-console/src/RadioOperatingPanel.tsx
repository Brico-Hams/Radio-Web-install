import { useMemo, useState, type FormEvent } from 'react'
import {
  createControlRequest, getApiData, isRadioSettings, isRecord, type RadioSettings,
  isYaesuControlModel, type YaesuControlModel,
} from './api'
import { useLanguage } from './i18n'

type Receiver = 'MAIN' | 'SUB'
type ModeOption = { code: string; label: string }
type ReceiverOption = { receiver: Receiver; label: string; mode_supported: boolean }
type Config = RadioSettings & {
  model: 'FTX-1' | YaesuControlModel
  frequency_adjustment_enabled: boolean
  mode_adjustment_enabled: boolean
  mode_options: ModeOption[]
  receiver_options?: ReceiverOption[]
  frequency_min_hz?: number
  frequency_max_hz?: number
}
type ReceiverState = { frequency_hz: number; mode_code: string | null }
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
  if (value.model === 'FTX-1') return value.receiver_options === undefined &&
    value.frequency_min_hz === undefined && value.frequency_max_hz === undefined &&
    isRadioSettings(value)
  if (!isYaesuControlModel(value.model)) return false
  const modePattern = value.model === 'FT-991A' ? /^[1-9A-E]$/ :
    value.model === 'FTDX3000' ? /^[1-9A-D]$/ : /^[1-9A-F]$/
  if (!value.mode_options.every((option) => modePattern.test(option.code))) return false
  const maximum = value.model === 'FT-991A' ? 470_000_000 :
    value.model === 'FTDX3000' ? 60_000_000 : 75_000_000
  return value.frequency_min_hz === 30_000 && value.frequency_max_hz === maximum &&
    Array.isArray(value.receiver_options) && value.receiver_options.length === 2 &&
    value.receiver_options.every((option) => isRecord(option) &&
      (option.receiver === 'MAIN' || option.receiver === 'SUB') &&
      typeof option.label === 'string' && option.label.length > 0 && option.label.length <= 32 &&
      option.mode_supported === (option.receiver === 'MAIN' ||
        (value.model !== 'FT-991A' && value.model !== 'FTDX3000'))) &&
    new Set(value.receiver_options.map((option) => option.receiver)).size === 2 &&
    isRadioSettings(value)
}

function receiverOptions(config: Config | null): ReceiverOption[] {
  return config?.receiver_options ?? [
    { receiver: 'MAIN', label: 'MAIN (FA / MD0)', mode_supported: true },
    { receiver: 'SUB', label: 'SUB (FB / MD1)', mode_supported: true },
  ]
}

function isOperating(value: unknown): value is Operating {
  if (!isRecord(value) || !isRecord(value.receivers)) return false
  const receivers = value.receivers
  if (typeof value.tx_active !== 'boolean' || typeof value.tuner_busy !== 'boolean' ||
    typeof value.observed_at !== 'number' || !Number.isFinite(value.observed_at) ||
    !isConfig(value)) return false
  if (!receiverOptions(value).every((option) => {
    const side = option.receiver
    const state = receivers[side]
    return isRecord(state) && typeof state.frequency_hz === 'number' &&
      Number.isInteger(state.frequency_hz) && state.frequency_hz >= 30_000 &&
      state.frequency_hz <= (value.frequency_max_hz ?? 470_000_000) &&
      (option.mode_supported ? typeof state.mode_code === 'string' : state.mode_code === null)
  })) return false
  return receiverOptions(value).every((option) => {
    const state = receivers[option.receiver]
    return isRecord(state) && (!option.mode_supported ||
      value.mode_options.some((mode) => mode.code === state.mode_code))
  })
}

export function RadioOperatingPanel({ token }: { token: string }) {
  const { t } = useLanguage()
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
    setMode(state.receivers[side].mode_code ?? '')
  }

  async function load() {
    setBusy(true)
    setVerified(false)
    setObserved(null)
    setConfig(null)
    setError('')
    try {
      const result = await getApiData(token, '/radio-settings', isConfig)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setConfig(result.data)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('radioConfigUnavailable'))
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
      setError(`${t('radioOperationUnconfirmed')} ${
        failure instanceof Error ? failure.message : t('radioCatError')
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
      setError(failure instanceof Error ? failure.message : t('radioIdentifierError'))
    }
  }

  const blocked = busy || !verified || observed?.tx_active !== false || observed.tuner_busy
  const options = receiverOptions(config)
  const modeSupported = options.find((option) => option.receiver === receiver)?.mode_supported === true
  return (
    <section className="content-card operation-panel" aria-labelledby="operating-title">
      <h2 id="operating-title">{t('radioOperatingTitle')}{config ? ` · ${config.model}` : ''}</h2>
      <p>{t('radioOperatingSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load()}>{t('radioReadControls')}</button>
        <button className="button button-secondary" disabled={busy || !config}
          onClick={() => void operate({ operation: 'read_operating' })}>{t('radioReadReceivers')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {config ? <>
        <label>{t('radioReceiver')}
          <select value={receiver} disabled={busy} onChange={(event) => {
            const side = event.target.value
            if (side !== 'MAIN' && side !== 'SUB') {
              setError(t('radioInvalidReceiver'))
              return
            }
            setReceiver(side)
            if (observed) show(observed, side)
          }}>
            {options.map((option) => <option key={option.receiver} value={option.receiver}>
              {option.label}
            </option>)}
          </select>
        </label>
        {observed ? <p>{t('radioLastReading')} {receiver}: {observed.receivers[receiver].frequency_hz} Hz,
          {' '}{t('radioMode')} {modeSupported ? config.mode_options.find((option) =>
            option.code === observed.receivers[receiver].mode_code)?.label : t('radioModeUnavailable')}.
          {' '}{t('radioTxObserved')}: {t(observed.tx_active ? 'radioYes' : 'radioNo')}.
          {' '}{t('radioTunerBusy')}: {t(observed.tuner_busy ? 'radioYes' : 'radioNo')}.</p> : null}
        {!verified ? <p>{t('radioReadRequired')}</p> : null}
        <form onSubmit={(event) => adjust(event, 'set_frequency')}>
          <label>{t('radioFrequencyLabel')}
            <input type="number" step="1" min={config.frequency_min_hz ?? 30_000}
              max={config.frequency_max_hz ?? 470_000_000} required
              value={frequency} onChange={(event) => setFrequency(event.target.value)} />
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !config.frequency_adjustment_enabled}>{t('radioApplyFrequency')}</button>
        </form>
        <form onSubmit={(event) => adjust(event, 'set_mode')}>
          <label>{t('radioModeLabel')}
            <select required disabled={!modeSupported} value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="">{t('radioReadModeFirst')}</option>
              {config.mode_options.map((option) =>
                <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !modeSupported || !config.mode_adjustment_enabled}>{t('radioApplyMode')}</button>
        </form>
      </> : null}
    </section>
  )
}
