import { useEffect, useMemo, useState } from 'react'
import { ApiError, createControlRequest, getApiData, isRecord } from './api'
import { useLanguage } from './i18n'

type LivePayload = {
  api_version: 'v1'
  data_is_simulated: false
  model?: string
  status?: unknown
  queries?: string[]
  source?: string
  connected?: boolean
  commands_enabled?: boolean
  commands_ready?: boolean
  tx_control_enabled?: false
  [key: string]: unknown
}

function isLive(payload: unknown): payload is LivePayload {
  if (typeof payload !== 'object' || payload === null) return false
  const record = Object.fromEntries(Object.entries(payload))
  return record.api_version === 'v1' && record.data_is_simulated === false && (
    (record.source === 'wsjtx_udp' &&
      (record.commands_enabled === false ||
        (record.commands_enabled === true && typeof record.commands_ready === 'boolean' &&
          Array.isArray(record.allowed_operations) &&
          record.allowed_operations.length === 2 &&
          record.allowed_operations[0] === 'replay' && record.allowed_operations[1] === 'halt_tx')) &&
      record.authenticated === false && record.suitable_for_control === false &&
      record.trust === 'untrusted_local_udp' &&
      typeof record.connected === 'boolean' && Array.isArray(record.decodes) &&
      record.decodes.length <= 100) ||
    (record.status === 'experimental' && record.tx_control_enabled === false &&
      typeof record.model === 'string' && Array.isArray(record.queries) &&
      record.queries.every((query: unknown) => typeof query === 'string'))
  )
}

function readableText(value: unknown, unknown: string): string {
  return typeof value === 'string' && value.length > 0 && value.length <= 2048 ? value : unknown
}

function readableInteger(value: unknown, unknown: string): string {
  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : unknown
}

function readableFrequency(value: unknown, unknown: string): string {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? String(value) : unknown
}

function decodeTime(value: unknown, unknown: string): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 86_400_000) {
    return unknown
  }
  const hours = Math.floor(value / 3_600_000)
  const minutes = Math.floor((value % 3_600_000) / 60_000)
  const seconds = Math.floor((value % 60_000) / 1000)
  const millis = value % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function elapsedSince(monotonic: number, wall: number): number {
  return Math.max(0, (performance.now() - monotonic) / 1000, (Date.now() - wall) / 1000)
}

function DigitalReadout({ data }: { data: LivePayload }) {
  const { t } = useLanguage()
  const unknown = t('digitalUnknown')
  const status = isRecord(data.status) ? data.status : null
  const decodes = Array.isArray(data.decodes) ? data.decodes : []
  const reportedFlag = (value: unknown) =>
    value === true ? t('digitalYes') : value === false ? t('digitalNo') : unknown

  return <>
    <p>{t('digitalSnapshotNotice')}</p>
    <h3>{t('digitalReportedStatus')}</h3>
    {status ? <dl className="digital-status">
      <div><dt>{t('digitalDialFrequency')}</dt>
        <dd>{readableFrequency(status.dial_frequency_hz, unknown)} Hz</dd></div>
      <div><dt>{t('digitalMode')}</dt><dd>{readableText(status.mode, unknown)}</dd></div>
      <div><dt>{t('digitalTxEnabled')}</dt><dd>{reportedFlag(status.tx_enabled_in_wsjtx)}</dd></div>
      <div><dt>{t('digitalTransmitting')}</dt><dd>{reportedFlag(status.transmitting_in_wsjtx)}</dd></div>
      <div><dt>{t('digitalLocalCall')}</dt><dd>{readableText(status.de_call, unknown)}</dd></div>
      <div><dt>{t('digitalRemoteCall')}</dt><dd>{readableText(status.dx_call, unknown)}</dd></div>
    </dl> : <p>{t('digitalStatusUnavailable')}</p>}
    <h3>{t('digitalDecodes')}</h3>
    {decodes.length === 0 ? <p>{t('digitalNoDecodes')}</p> : <div className="table-scroll">
      <table className="qso-table">
        <caption>{t('digitalDecodesCaption')}</caption>
        <thead><tr>
          <th scope="col">{t('digitalTime')}</th><th scope="col">SNR (dB)</th>
          <th scope="col">{t('digitalOffset')}</th><th scope="col">{t('digitalMode')}</th>
          <th scope="col">{t('digitalMessage')}</th><th scope="col">{t('digitalMarkers')}</th>
        </tr></thead>
        <tbody>{decodes.map((value, index) => {
          const row = isRecord(value) ? value : {}
          const markers = [
            row.new === true ? t('digitalNew') : row.new === false ? t('digitalReplayMarker') : unknown,
            row.low_confidence === true ? t('digitalLowConfidence') :
              row.low_confidence === false ? t('digitalNotLowConfidence') : unknown,
            row.off_air === true ? t('digitalOffAir') :
              row.off_air === false ? t('digitalOnAirReported') : unknown,
          ]
          return <tr key={index}>
            <td>{decodeTime(row.time_since_midnight_ms, unknown)}</td>
            <td>{readableInteger(row.snr_db, unknown)}</td>
            <td>{readableFrequency(row.delta_frequency_hz, unknown)}</td>
            <td>{readableText(row.mode, unknown)}</td>
            <td className="digital-message">{readableText(row.message, unknown)}</td>
            <td className="digital-markers">{markers.join(' · ')}</td>
          </tr>
        })}</tbody>
      </table>
    </div>}
    <details><summary>{t('digitalRawDetails')}</summary>
      <pre className="live-data">{JSON.stringify(data, null, 2)}</pre>
    </details>
  </>
}

type DigitalCommandResult = {
  api_version: 'v1'
  data_is_simulated: false
  operation: 'replay' | 'halt_tx'
  delivery: 'sent_unconfirmed'
  transmission_stopped_confirmed: false
  trust: 'untrusted_local_udp'
}

function isDigitalCommandResult(value: unknown): value is DigitalCommandResult {
  return isRecord(value) && value.api_version === 'v1' && value.data_is_simulated === false &&
    (value.operation === 'replay' || value.operation === 'halt_tx') &&
    value.delivery === 'sent_unconfirmed' && value.transmission_stopped_confirmed === false &&
    value.trust === 'untrusted_local_udp'
}

export function AgentLivePanel({ token }: { token: string }) {
  const { t } = useLanguage()
  const sendControl = useMemo(() => createControlRequest(token), [token])
  const [cat, setCat] = useState<LivePayload | null>(null)
  const [digitalSnapshot, setDigitalSnapshot] = useState<{
    data: LivePayload; requestedAt: number; wallTime: number
  } | null>(null)
  const [snapshotAge, setSnapshotAge] = useState(0)
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [commandResult, setCommandResult] = useState<DigitalCommandResult | null>(null)

  useEffect(() => {
    if (!digitalSnapshot) return
    const updateAge = () => setSnapshotAge((previous) => Math.max(previous, elapsedSince(
      digitalSnapshot.requestedAt, digitalSnapshot.wallTime,
    )))
    const timer = window.setInterval(updateAge, 1000)
    document.addEventListener('visibilitychange', updateAge)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', updateAge)
    }
  }, [digitalSnapshot])

  const digital = digitalSnapshot?.data
  const activityAge = digital?.last_seen_age_seconds
  const statusAge = digital?.status_age_seconds
  const validAge = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
  const activityMayBeOld = snapshotAge >= 60 ||
    (validAge(activityAge) && activityAge + snapshotAge >= 60)
  const statusMayBeOld = validAge(statusAge) && statusAge + snapshotAge >= 60

  async function operateDigital(operation: 'replay' | 'halt_tx') {
    setBusy(true)
    setError('')
    setCommandResult(null)
    try {
      const result = await sendControl('/digital', {
        operation, request_id: crypto.randomUUID(),
      }, isDigitalCommandResult)
      if (result.operation !== operation) throw new Error(t('digitalCommandFailed'))
      setCommandResult(result)
    } catch (error) {
      setDigitalSnapshot(null)
      setError(error instanceof Error ? error.message : t('digitalCommandFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function load(kind: 'cat' | 'digital', read = false) {
    setBusy(true)
    setError('')
    if (kind === 'cat') setCat(null)
    else {
      setDigitalSnapshot(null)
      setCommandResult(null)
    }
    try {
      const endpoint = `/${kind}${read ? `?command=${encodeURIComponent(command)}` : ''}`
      const requestedAt = performance.now()
      const wallTime = Date.now()
      const response = await getApiData(token, endpoint, isLive)
      if (!response.allowed) throw new Error(t('radioPermission'))
      if (kind === 'cat') {
        setCat(response.data)
        if (!read) setCommand(response.data.queries?.[0] ?? '')
      } else {
        setSnapshotAge(elapsedSince(requestedAt, wallTime))
        setDigitalSnapshot({ data: response.data, requestedAt, wallTime })
      }
    } catch (error) {
      setError(error instanceof ApiError && error.status === 503
        ? `${t('liveUnavailable')} (${error.code ?? 'HTTP 503'}). ${t('liveCheckConfig')}`
        : error instanceof Error ? error.message : t('liveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="agent-live-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('liveEyebrow')}</p>
          <h2 id="agent-live-title">{t('liveTitle')}</h2>
        </div>
      </div>
      <p className="device-safety-note">
        {t('liveCatNotice')}{' '}
        {t('digitalSafeCommandsNotice')}
      </p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load('cat')}>{t('liveReadCatConfig')}</button>
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load('digital')}>{t('liveReadDigital')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {cat ? (
        <div>
          <p>{cat.model} · {t('liveExperimental')}</p>
          {cat.protocol === 'OpenGD77 USB CPS' ? <p role="note">
            {t('liveOpenGdNotice')}
          </p> : null}
          <label>{t('liveCatQuery')}
            <select value={command} disabled={busy} onChange={(event) => setCommand(event.target.value)}>
              {cat.queries?.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button className="button button-secondary" disabled={busy || !command}
            onClick={() => void load('cat', true)}>{t('liveReadCat')}</button>
          <pre className="live-data">{JSON.stringify(cat, null, 2)}</pre>
        </div>
      ) : null}
      {digital ? (
        <div>
          <p role="note">{t('liveUdpNotice')}</p>
          <p>{t('digitalSnapshotAge')}: {Math.floor(snapshotAge)} s</p>
          <p>{!digital.connected ? t('liveDigitalHistorical') :
            activityMayBeOld ? t('digitalSnapshotOld') : t('liveDigitalConnected')}</p>
          {statusMayBeOld ? <p role="note">{t('liveDigitalStatusOld')}</p> : null}
          {isRecord(digital.status) && !validAge(statusAge)
            ? <p role="note">{t('digitalStatusAgeUnknown')}</p> : null}
          {digital.commands_enabled ? <div className="session-actions">
            <button className="button button-secondary" disabled={busy || !digital.commands_ready}
              onClick={() => void operateDigital('replay')}>{t('digitalReplay')}</button>
            <button className="button button-secondary" disabled={busy || !digital.commands_ready}
              onClick={() => void operateDigital('halt_tx')}>{t('digitalHaltTx')}</button>
          </div> : null}
          {digital.commands_enabled ? <p role="note">{t('digitalDeliveryWarning')}</p> : null}
          <DigitalReadout data={digital} />
        </div>
      ) : null}
      {commandResult ? <p role="status">
        {commandResult.operation === 'halt_tx' ? t('digitalHaltSent') : t('digitalReplaySent')}
      </p> : null}
    </section>
  )
}
