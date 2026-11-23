import { useMemo, useState, type FormEvent } from 'react'
import {
  createControlRequest, getApiData, isRecord, isRadioSettings as isSettings,
  isYaesuControlModel, type YaesuControlModel,
  type RadioSettings as Settings,
} from './api'
import { useLanguage } from './i18n'
import { RadioMenuSettings } from './RadioMenuSettings'
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
  const { t } = useLanguage()
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
      if (!response.allowed) throw new Error(t('radioPermission'))
      setConfig(response.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('radioConfigUnavailable'))
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
      setError(`${t('radioOperationUnconfirmed')} ${
        operationError instanceof Error ? operationError.message : t('radioCatError')
      }`)
    } finally {
      setBusy(false)
    }
  }

  function writeBody(operation: 'set_power' | 'set_tuner', value: object) {
    try {
      void operate({ operation, request_id: crypto.randomUUID(), ...value })
    } catch (identifierError) {
      setError(identifierError instanceof Error ? identifierError.message : t('radioIdentifierError'))
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
      <h2 id="radio-settings-title">{t('radioPowerTitle')}{config ? ` · ${config.model}` : ''}</h2>
      <p>{t('radioPowerSafety')}</p>
      <p>{t(config?.model === 'IC-7300' ? 'radioIcomTunerSafety' : 'radioYaesuTunerSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load()}>{t('radioReadSettings')}</button>
        <button className="button button-secondary" disabled={busy || !config}
          onClick={() => void operate({ operation: 'read' })}>{t('radioReadPower')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {config ? <>
        <p>{t('radioModel')}: {config.model}. {t('radioLocalLimit')}: {config.power_level_max}
          {config.model === 'IC-7300' ? ' / 255 CAT' : ` ${t('radioWattsUnit')}`}.
          {' '}{t('radioExistingLevel')}</p>
        <p>{t('radioLastPower')}: {observed?.power_level ?? t('radioNotRead')}.
          {observed?.model === 'IC-7300' ?
            ` ${t('radioTuner')}: ${['bypass', t('radioTunerInserted'), t('radioTunerTuning')][observed.tuner_state]}.` :
            observed?.model === 'FTX-1' ?
              ` ${t('radioHead')}: ${observed.power_head}. ${t('radioTunerBusy')}: ${t(observed.tuner_busy ? 'radioYes' : 'radioNo')}.` :
              observed && isYaesuControlModel(observed.model) ?
                ` ${t('radioTunerBusy')}: ${t(observed.tuner_busy ? 'radioYes' : 'radioNo')}.` : null}
          {' '}{t('radioTxObserved')}: {observed ? t(observed.tx_active ? 'radioYes' : 'radioNo') : t('radioNotRead')}.</p>
        {!verified ? <p>{t('radioReadRequired')}</p> : null}
        <form onSubmit={power}>
          <label>{t(config.model === 'IC-7300' ? 'radioCatPowerLabel' : 'radioWattsPowerLabel')}
            <input type="number" step="1" min={config.model === 'IC-7300' ? 0 : 5} max={maximum}
              required value={level} onChange={(event) => setLevel(event.target.value)} />
          </label>
          <button type="submit" className="button button-secondary"
            disabled={blocked || !config.power_adjustment_enabled}>{t('radioApplyPower')}</button>
        </form>
        {config.model === 'IC-7300' ? <div className="session-actions">
          <button className="button button-secondary"
            disabled={blocked || !config.tuner_switching_enabled}
            onClick={() => writeBody('set_tuner', { enabled: true })}>{t('radioInsertTuner')}</button>
          <button className="button button-secondary"
            disabled={blocked || !config.tuner_switching_enabled}
            onClick={() => writeBody('set_tuner', { enabled: false })}>{t('radioBypassTuner')}</button>
        </div> : null}
      </> : null}
      {config?.model === 'FTX-1' ? <RadioMenuSettings token={token} /> : null}
    </section>
  )
}
