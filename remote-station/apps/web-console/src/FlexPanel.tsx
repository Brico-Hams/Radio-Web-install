import { useMemo, useState, type FormEvent } from 'react'
import { createControlRequest, getApiData, isRecord } from './api'
import { useStableTranslation } from './i18n'

type FlexState = {
  api_version: 'v1'
  source: 'smartsdr_tcp'
  version: string
  tx: { enabled: boolean; active: boolean; swr_tripped: boolean; off_unverified: boolean; tune_limit: number; cap_s: number }
  pending_de_fuente: string[]
}

const SETTINGS = ['rfpower', 'tunepower', 'miclevel'] as const

function isFlex(value: unknown): value is FlexState {
  if (!isRecord(value) || !isRecord(value.tx)) return false
  const tx = value.tx
  return value.api_version === 'v1' && value.source === 'smartsdr_tcp' && typeof value.version === 'string' &&
    typeof tx.enabled === 'boolean' && typeof tx.active === 'boolean' && typeof tx.swr_tripped === 'boolean' &&
    typeof tx.off_unverified === 'boolean' && typeof tx.tune_limit === 'number' && typeof tx.cap_s === 'number' &&
    Array.isArray(value.pending_de_fuente) && value.pending_de_fuente.every((item) => typeof item === 'string')
}

function isOk(value: unknown): value is { ok?: boolean } {
  return isRecord(value) && value.api_version === 'v1'
}

export function FlexPanel({ token }: { token: string }) {
  const { t } = useStableTranslation()
  const sendControl = useMemo(() => createControlRequest(token), [token])
  const [data, setData] = useState<FlexState | null>(null)
  const [power, setPower] = useState('5')
  const [name, setName] = useState<typeof SETTINGS[number]>('miclevel')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(body: object, ok = '') {
    setBusy(true)
    setMessage('')
    try {
      await sendControl('/flex', body, isOk)
      setMessage(ok)
      const result = await getApiData(token, '/flex', isFlex)
      if (result.allowed) setData(result.data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('flexError'))
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    setBusy(true)
    setMessage('')
    try {
      const result = await getApiData(token, '/flex', isFlex)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setData(result.data)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('flexError'))
    } finally {
      setBusy(false)
    }
  }

  function saveSetting(event: FormEvent) {
    event.preventDefault()
    void run({ action: 'set_setting', request_id: crypto.randomUUID(), name, value: Number(value) }, t('flexSettingSent'))
  }

  const txBlocked = !data || !data.tx.enabled || data.tx.swr_tripped || busy
  return (
    <section className="content-card operation-panel" aria-labelledby="flex-title">
      <h2 id="flex-title">{t('flexTitle')}</h2>
      <p>{t('flexSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy} onClick={() => void load()}>{t('flexRead')}</button>
        <button className="button button-primary" disabled={!data || busy}
          onClick={() => void run({ action: 'emergency_stop' }, t('flexStopped'))}>{t('flexStop')}</button>
      </div>
      {message ? <p role="alert">{message}</p> : null}
      {data ? (
        <div>
          <p>SmartSDR {data.version} · {data.tx.enabled ? t('flexTxOptIn') : t('flexTxOff')}</p>
          {data.tx.swr_tripped ? <p role="alert">{t('flexSwrTripped')}</p> : null}
          {data.tx.off_unverified ? <p role="alert">{t('flexOffUnverified')}</p> : null}
          <label>{t('flexTunePower')} (≤ {data.tx.tune_limit})
            <input type="number" min={0} max={data.tx.tune_limit} value={power}
              onChange={(event) => setPower(event.target.value)} />
          </label>
          <div className="session-actions">
            <button className="button button-secondary" disabled={txBlocked}
              onClick={() => void run({ action: 'tune_start', tune_power: Number(power) })}>{t('flexTune')}</button>
            <button className="button button-secondary" disabled={txBlocked}
              onClick={() => void run({ action: 'atu_start', tune_power: Number(power) })}>{t('flexAtu')}</button>
            <button className="button button-secondary" disabled={!data || busy}
              onClick={() => void run({ action: 'tune_stop' })}>{t('flexTuneStop')}</button>
            <button className="button button-secondary" disabled={!data.tx.swr_tripped || busy}
              onClick={() => void run({ action: 'reset_swr' })}>{t('flexResetSwr')}</button>
          </div>
          <form onSubmit={saveSetting}>
            <label>{t('flexSetting')}
              <select value={name} onChange={(event) => setName(event.target.value as typeof SETTINGS[number])}>
                {SETTINGS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>{t('flexValue')}
              <input type="number" min={0} max={100} step={1} required value={value}
                onChange={(event) => setValue(event.target.value)} />
            </label>
            <button type="submit" className="button button-secondary" disabled={busy}>{t('flexApply')}</button>
          </form>
          <p>{t('flexReadback')}</p>
          <ul aria-label={t('flexPending')}>
            {data.pending_de_fuente.map((item) => (
              <li key={item}><button className="button button-secondary" disabled>{item}</button> {t('flexPendingSource')}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
