import { useState } from 'react'
import { getApiData, isRecord } from './api'
import { useStableTranslation, type Message } from './i18n'
import { normalizeMeter, tunePowerCheck, type MeterKey, type NormalizedMeter } from './meterModel'

// Read-only view of the FTX-1 raw meters (CAT RM1..RM8 through the existing GET /cat?command=) and of the tune state
// (GET /accessories). It never keys the radio and never starts a tune: PTT and tune stay in their guarded panels.
const METERS: ReadonlyArray<{ command: string; key: MeterKey; label: Message }> = [
  { command: 'RM1', key: 'smeter', label: 'mtrSmeter' },
  { command: 'RM2', key: 'smeter-sub', label: 'mtrSmeterSub' },
  { command: 'RM5', key: 'po', label: 'mtrPo' },
  { command: 'RM6', key: 'swr', label: 'mtrSwr' },
  { command: 'RM4', key: 'alc', label: 'mtrAlc' },
  { command: 'RM3', key: 'comp', label: 'mtrComp' },
  { command: 'RM7', key: 'id', label: 'mtrId' },
  { command: 'RM8', key: 'vdd', label: 'mtrVdd' },
]

type Head = 'field' | 'SPA-1'
type TuneState = {
  tuning: boolean
  max_seconds: number
  max_power_w: number
  last: { reason: string; swr: number | null; seconds: number } | null
}
type Row = { label: Message; meter: NormalizedMeter | null }

function isMeterReply(key: MeterKey) {
  return (payload: unknown): payload is { meter: { key: string; raw: number } } =>
    isRecord(payload) && isRecord(payload.meter) && payload.meter.key === key &&
    typeof payload.meter.raw === 'number' && Number.isInteger(payload.meter.raw) &&
    payload.meter.raw >= 0 && payload.meter.raw <= 255
}

function isPowerReply(payload: unknown): payload is { power_control: { head: Head; watts: number } } {
  return isRecord(payload) && isRecord(payload.power_control) &&
    (payload.power_control.head === 'field' || payload.power_control.head === 'SPA-1') &&
    typeof payload.power_control.watts === 'number' && Number.isFinite(payload.power_control.watts)
}

function isTuneReply(payload: unknown): payload is { tuner: TuneState } {
  if (!isRecord(payload) || !isRecord(payload.tuner)) return false
  const { tuning, max_seconds: seconds, max_power_w: power, last } = payload.tuner
  return typeof tuning === 'boolean' && typeof seconds === 'number' && typeof power === 'number' &&
    (last === null || last === undefined || (isRecord(last) && typeof last.reason === 'string' &&
      typeof last.seconds === 'number' && (last.swr === null || typeof last.swr === 'number')))
}

export function MetersPanel({ token }: { token: string }) {
  const { t } = useStableTranslation()
  const [rows, setRows] = useState<Row[]>([])
  const [watts, setWatts] = useState<number | null>(null)
  const [tune, setTune] = useState<TuneState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tuneError, setTuneError] = useState('')

  async function read() {
    setBusy(true)
    setError('')
    setTuneError('')
    const next: Row[] = []
    let head: Head | null = null
    let power: number | null = null
    let failure = ''
    // The agent serializes serial access, so the reads run one after another.
    try {
      const result = await getApiData(token, '/cat?command=PC', isPowerReply)
      if (!result.allowed) throw new Error(t('radioPermission'))
      head = result.data.power_control.head
      power = result.data.power_control.watts
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : t('mtrError')
    }
    if (!failure) {
      for (const { command, key, label } of METERS) {
        try {
          const result = await getApiData(token, `/cat?command=${command}`, isMeterReply(key))
          if (!result.allowed) throw new Error(t('radioPermission'))
          next.push({ label, meter: normalizeMeter(key, result.data.meter.raw, head === 'field' ? 1 : 2) })
        } catch (cause) {
          next.push({ label, meter: null })
          failure ||= cause instanceof Error ? cause.message : t('mtrError')
        }
      }
    }
    setRows(next)
    setWatts(power)
    setError(failure)
    try {
      const result = await getApiData(token, '/accessories', isTuneReply)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setTune({ ...result.data.tuner, last: result.data.tuner.last ?? null })
    } catch (cause) {
      setTune(null)
      setTuneError(cause instanceof Error ? cause.message : t('accError'))
    }
    setBusy(false)
  }

  const guard = tunePowerCheck(watts)
  return (
    <section className="content-card operation-panel" aria-labelledby="meters-title">
      <h2 id="meters-title">{t('mtrTitle')}</h2>
      <p>{t('mtrSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy} onClick={() => void read()}>{t('mtrRead')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {rows.length > 0 ? (
        <table>
          <caption>{t('mtrCaption')}</caption>
          <thead><tr><th>{t('mtrMeter')}</th><th>{t('mtrValue')}</th><th>{t('mtrRaw')}</th></tr></thead>
          <tbody>
            {rows.map(({ label, meter }) => (
              <tr key={label}>
                <td>{t(label)}</td>
                <td>{meter === null ? t('mtrUnavailable') : meter.pending ? t('mtrPending') : meter.text}</td>
                <td>{meter?.raw ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {tuneError ? <p role="alert">{tuneError}</p> : null}
      {tune ? (
        <div>
          <p>{t('mtrTuneState')}: {t(tune.tuning ? 'radioTunerTuning' : 'mtrTuneIdle')}
            {' '}({tune.max_power_w} W / {tune.max_seconds} s)</p>
          <p>{t('mtrTuneLast')}: {tune.last
            ? `${tune.last.reason} · ${tune.last.seconds} s · SWR ${tune.last.swr ?? '—'}`
            : t('mtrTuneNone')}</p>
          {!guard.ok ? <p>{t(guard.reason === 'high' ? 'mtrTuneHigh' : 'mtrTuneUnknown')}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
