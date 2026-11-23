import { useMemo, useState } from 'react'
import { createControlRequest, getApiData, isRecord } from './api'
import { useStableTranslation } from './i18n'

type Support = { id: string; kind: 'tuner' | 'amplifier'; maker: string; model: string; status: string; enabled: boolean; verification?: string | null }

type Accessories = {
  amplifier: {
    device: string | null
    supported: boolean
    state: 'standby' | 'operate' | 'fault'
    band: string | null
    operate_allowed: boolean
    standby_reason: string | null
    pending_standby: boolean
    readout: { power_w: number | null; temp_c: number | null; swr: number | null; fault: string | null } | null
  }
  tuner: { device: string | null; supported: boolean; tuning: boolean; max_seconds: number; max_power_w: number }
  support?: Support[]
}

function isAccessories(value: unknown): value is Accessories {
  if (!isRecord(value) || !isRecord(value.amplifier) || !isRecord(value.tuner)) return false
  return value.api_version === 'v1' &&
    ['standby', 'operate', 'fault'].includes(String(value.amplifier.state)) &&
    typeof value.amplifier.supported === 'boolean' && typeof value.amplifier.operate_allowed === 'boolean' &&
    typeof value.tuner.supported === 'boolean' && typeof value.tuner.tuning === 'boolean' &&
    (value.support === undefined || Array.isArray(value.support))
}

type Operation = 'operate' | 'standby' | 'emergency_stop' | 'stop_tune'

export function AccessoriesPanel({ token }: { token: string }) {
  const { t } = useStableTranslation()
  const sendControl = useMemo(() => createControlRequest(token), [token])
  const [data, setData] = useState<Accessories | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await getApiData(token, '/accessories', isAccessories)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setData(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('accError'))
    } finally {
      setBusy(false)
    }
  }

  async function operate(operation: Operation) {
    setBusy(true)
    setError('')
    try {
      setData(await sendControl('/accessories', { operation }, isAccessories, operation !== 'operate'))
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : t('accError'))
    } finally {
      setBusy(false)
    }
  }

  const amplifier = data?.amplifier
  const stateLabel = amplifier
    ? { standby: t('accStateStandby'), operate: t('accStateOperate'), fault: t('accStateFault') }[amplifier.state]
    : ''

  return (
    <section className="content-card operation-panel" aria-labelledby="accessories-title">
      <h2 id="accessories-title">{t('accTitle')}</h2>
      <p>{t('accSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy} onClick={() => void load()}>{t('accRead')}</button>
        {/* STANDBY and the emergency stop are never disabled by the UI state. */}
        <button className="button button-danger" onClick={() => void operate('emergency_stop')}>{t('accEmergency')}</button>
        <button className="button button-secondary" onClick={() => void operate('standby')}>{t('accStandby')}</button>
        <button className="button button-secondary"
          disabled={busy || !amplifier?.supported || !amplifier.operate_allowed || amplifier.state !== 'standby' ||
            amplifier.pending_standby || data?.tuner.tuning}
          onClick={() => void operate('operate')}>{t('accOperate')}</button>
        <button className="button button-secondary" disabled={!data?.tuner.tuning}
          onClick={() => void operate('stop_tune')}>{t('accStopTune')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {data && amplifier ? (
        <div>
          <p>{t('accAmplifier')}: {amplifier.device ?? t('accNone')} · {stateLabel}
            {amplifier.band ? ` · ${amplifier.band}` : ''}
            {amplifier.standby_reason ? ` · ${amplifier.standby_reason}` : ''}</p>
          {!amplifier.supported ? <p>{t('accNoDriver')}</p> : null}
          {amplifier.supported && !amplifier.operate_allowed ? <p>{t('accOperateDisabled')}</p> : null}
          {amplifier.pending_standby ? <p role="alert">{t('accStandbyUnconfirmed')}</p> : null}
          {amplifier.readout ? (
            <p>{t('accReadout')}: {amplifier.readout.power_w ?? '—'} W · {amplifier.readout.temp_c ?? '—'} °C ·
              SWR {amplifier.readout.swr ?? '—'}{amplifier.readout.fault ? ` · ${amplifier.readout.fault}` : ''}</p>
          ) : null}
          <p>{t('accTuner')}: {data.tuner.device ?? t('accNone')} · {data.tuner.tuning ? t('radioTunerTuning') : '—'}
            {' '}({data.tuner.max_power_w} W / {data.tuner.max_seconds} s)</p>
          {data.support ? (
            <table>
              <caption>{t('accSupport')}</caption>
              <thead><tr><th>{t('accDevice')}</th><th>{t('accStatus')}</th></tr></thead>
              <tbody>
                {data.support.map((row) => (
                  <tr key={row.id}><td>{row.maker} {row.model}</td><td>{row.status}{row.verification ? ` · ${t('accUntested')}` : ''}</td></tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
