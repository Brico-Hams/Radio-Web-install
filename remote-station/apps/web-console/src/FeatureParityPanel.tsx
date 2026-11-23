import { useEffect, useState } from 'react'
import { getApiData, isFeatureParityCatalog, type FeatureParityCatalog, type FeatureParityStatus } from './api'
import { useLanguage, type Message } from './i18n'

const FEATURE_LABELS: Record<string, Message> = {
  freqMode: 'parFeatFreqMode', vfoSplit: 'parFeatVfoSplit', ptt: 'parFeatPtt', smeter: 'parFeatSmeter',
  txMeters: 'parFeatTxMeters', tune: 'parFeatTune', audioRx: 'parFeatAudioRx', audioTx: 'parFeatAudioTx',
  waterfall: 'parFeatWaterfall', rotor: 'parFeatRotor', accessories: 'parFeatAccessories', settings: 'parFeatSettings',
}
const STATUS_LABELS: Record<FeatureParityStatus, Message> = {
  ok: 'parStatusOk', partial: 'parStatusPartial', pendiente: 'parStatusPending', na: 'parStatusNa',
}

// Every radio shows the same controls; unsupported ones stay visible, greyed out, with the matrix reason.
export function FeatureParityPanel({ token }: { token: string }) {
  const { t } = useLanguage()
  const [catalog, setCatalog] = useState<FeatureParityCatalog | null>(null)
  const [radioId, setRadioId] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    let current = true
    getApiData(token, '/feature-parity', isFeatureParityCatalog)
      .then((result) => {
        if (!current) return
        if (!result.allowed) throw new Error('forbidden')
        setCatalog(result.data)
        setRadioId((previous) => previous || result.data.radios[0]?.id || '')
      })
      .catch(() => { if (current) setError(true) })
    return () => { current = false }
  }, [token])

  const radio = catalog?.radios.find((item) => item.id === radioId)

  return (
    <section className="content-card operation-panel" aria-labelledby="parity-title">
      <h2 id="parity-title">{t('parTitle')}</h2>
      <p>{t('parNotice')}</p>
      {error ? <p role="alert">{t('parError')}</p> : null}
      {!catalog && !error ? <p role="status">{t('parLoading')}</p> : null}
      {catalog ? (
        <label>{t('parRadio')}{' '}
          <select value={radioId} onChange={(event) => setRadioId(event.target.value)}>
            {catalog.radios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      ) : null}
      {catalog && radio ? (
        <ul className="parity-list">
          {catalog.feature_order.map((feature) => {
            const state = radio.features[feature]
            const enabled = state?.status === 'ok' || state?.status === 'partial'
            const label = FEATURE_LABELS[feature] ? t(FEATURE_LABELS[feature]) : feature
            const status = state ? t(STATUS_LABELS[state.status]) : t('parStatusPending')
            const reason = enabled ? '' : state?.reason || t('parNoReason')
            return (
              <li key={feature} className={enabled ? 'parity-feature' : 'parity-feature parity-off'}
                aria-disabled={!enabled} title={reason || undefined}
                style={enabled ? undefined : { opacity: 0.55 }}>
                <strong>{label}</strong>: {status}{reason ? ` — ${reason}` : ''}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
