import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createControlRequest, getApiData, getTxAudioUrl, isRecord } from './api'
import { RemoteMicrophone } from './RemoteMicrophone'
import { useStableTranslation } from './i18n'

type PttState = {
  api_version: 'v1'; model: 'FTX-1'; status: 'experimental'
  data_is_simulated: false; hardware_validation_complete: false
  enabled: boolean; lease_active: boolean; rx_confirmed: boolean; stop_failed: boolean
  tx_audio_required: boolean
  lease_seconds: 2; max_transmit_seconds: number
  frequency_min_hz: number; frequency_max_hz: number; power_max_watts: number
  lease_id?: string
}

function isPtt(value: unknown): value is PttState {
  return isRecord(value) && value.api_version === 'v1' && value.model === 'FTX-1' &&
    value.status === 'experimental' && value.data_is_simulated === false &&
    value.hardware_validation_complete === false &&
    ['enabled', 'lease_active', 'rx_confirmed', 'stop_failed', 'tx_audio_required'].every((key) =>
      typeof value[key] === 'boolean') && value.lease_seconds === 2 &&
    typeof value.max_transmit_seconds === 'number' &&
    Number.isInteger(value.max_transmit_seconds) &&
    value.max_transmit_seconds >= 1 && value.max_transmit_seconds <= 30 &&
    typeof value.frequency_min_hz === 'number' && Number.isInteger(value.frequency_min_hz) &&
    typeof value.frequency_max_hz === 'number' && Number.isInteger(value.frequency_max_hz) &&
    value.frequency_min_hz >= 30_000 && value.frequency_min_hz < value.frequency_max_hz &&
    value.frequency_max_hz <= 470_000_000 &&
    typeof value.power_max_watts === 'number' && Number.isInteger(value.power_max_watts) &&
    value.power_max_watts >= 5 && value.power_max_watts <= 100 &&
    (value.lease_id === undefined ||
      typeof value.lease_id === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value.lease_id))
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function PttPanel({ token }: { token: string }) {
  const { t, translate } = useStableTranslation()
  const { send, audioUrl } = useMemo(() => ({
    send: createControlRequest(token), audioUrl: getTxAudioUrl(),
  }), [token])
  const microphone = useRef<RemoteMicrophone | null>(null)
  const [audioSession, setAudioSession] = useState<string | null>(null)
  const [micBusy, setMicBusy] = useState(false)
  const [data, setData] = useState<PttState | null>(null)
  const [enabledHere, setEnabledHere] = useState(false)
  const [busy, setBusy] = useState(false)
  const [holding, setHolding] = useState(false)
  const [lease, setLease] = useState<string | null>(null)
  const [error, setError] = useState('')
  const active = useRef<string | null>(null)
  const requestId = useRef<string | null>(null)
  const held = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(true)

  const closeMicrophone = useCallback(() => {
    microphone.current?.stop()
    microphone.current = null
    setAudioSession(null)
    setMicBusy(false)
  }, [])

  const stop = useCallback(async (announce = true) => {
    const epoch = ++generation.current
    active.current = null
    held.current = false
    if (announce && mounted.current) {
      setLease(null)
      setHolding(false)
    }
    try {
      const state = await send('/ptt', {
        operation: 'stop',
        ...(requestId.current ? { cancel_request_id: requestId.current } : {}),
      }, isPtt, true)
      if (announce && mounted.current && epoch === generation.current) setData(state)
    } catch (failure) {
      const text = `${translate('pttRxUnconfirmed')} ${message(failure, translate('pttError'))}`
      if (announce && mounted.current && epoch === generation.current) {
        setData(null)
        setError(text)
      } else console.error(text)
    }
  }, [send, translate])

  useEffect(() => {
    mounted.current = true
    const cancel = () => { if (held.current || active.current) void stop() }
    const leave = () => { cancel(); closeMicrophone() }
    const visibility = () => { if (document.visibilityState === 'hidden') leave() }
    const keyup = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') cancel()
    }
    window.addEventListener('blur', leave)
    window.addEventListener('pagehide', leave)
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keyup', keyup)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      mounted.current = false
      window.removeEventListener('blur', leave)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keyup', keyup)
      document.removeEventListener('visibilitychange', visibility)
      if (held.current || active.current) void stop(false)
      microphone.current?.stop()
      microphone.current = null
    }
  }, [stop, closeMicrophone])

  useEffect(() => {
    if (!lease) return
    let pending = false
    const timer = window.setInterval(async () => {
      if (pending || active.current !== lease || !held.current) return
      pending = true
      try {
        const state = await send('/ptt', { operation: 'renew', lease_id: lease }, isPtt)
        if (active.current !== lease) return
        if (!state.lease_active || state.lease_id !== lease) {
          throw new Error(translate('pttSessionUnconfirmed'))
        }
        setData(state)
      } catch (failure) {
        if (active.current === lease) {
          setError(`${translate('pttSessionLost')} ${message(failure, translate('pttError'))}`)
          void stop()
        }
      } finally {
        pending = false
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [lease, send, stop, translate])

  async function load() {
    closeMicrophone()
    setBusy(true)
    setEnabledHere(false)
    setError('')
    setData(null)
    try {
      const result = await getApiData(token, '/ptt', isPtt)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setData(result.data)
    } catch (failure) { setError(message(failure, t('pttError'))) }
    finally { setBusy(false) }
  }

  const canStart = enabledHere && data?.enabled && data.rx_confirmed &&
    !data.stop_failed && !data.lease_active && (!data.tx_audio_required || !!audioSession)

  async function prepareMicrophone() {
    if (microphone.current) return
    setError('')
    setMicBusy(true)
    const client = new RemoteMicrophone(audioUrl, token, (id) => {
      if (microphone.current === client) { setAudioSession(id); setMicBusy(false) }
    }, (text) => {
      if (microphone.current !== client) return
      closeMicrophone()
      setError(text)
      if (held.current || active.current) void stop()
    })
    microphone.current = client
    try { await client.start() }
    catch (failure) {
      client.stop()
      if (microphone.current === client) {
        closeMicrophone()
        setError(message(failure, t('pttError')))
      }
    }
  }

  async function start() {
    if (held.current || busy || !canStart) return
    const audioId = microphone.current?.sessionId
    if (data?.tx_audio_required && !audioId) return
    held.current = true
    setHolding(true)
    setBusy(true)
    setError('')
    const epoch = ++generation.current
    try {
      requestId.current = crypto.randomUUID()
      const state = await send('/ptt', {
        operation: 'start', request_id: requestId.current,
        ...(data?.tx_audio_required ? { audio_session_id: audioId } : {}),
      }, isPtt)
      if (generation.current !== epoch || !held.current) {
        await stop()
        return
      }
      if (!state.lease_active || !state.lease_id) {
        throw new Error(t('pttExclusiveMissing'))
      }
      active.current = state.lease_id
      setLease(state.lease_id)
      setData(state)
    } catch (failure) {
      setError(`${t('pttUnconfirmed')} ${message(failure, t('pttError'))}`)
      await stop()
    } finally { setBusy(false) }
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="ptt-title">
      <h2 id="ptt-title">{t('pttTitle')}</h2>
      <p>{t('pttSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy || !!lease}
          onClick={() => void load()}>{t('pttRead')}</button>
        <button className="button button-primary" onClick={() => void stop()}>
          {t('pttStop')}
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {data ? <>
        {data.tx_audio_required ? <div className="session-actions">
          <button className="button button-secondary" disabled={micBusy || !!audioSession}
            onClick={() => void prepareMicrophone()}>{t('pttPrepareMic')}</button>
          <button className="button button-secondary" onClick={() => {
            if (held.current || active.current) void stop()
            closeMicrophone()
          }}>{t('pttDisconnectMic')}</button>
          <p>{audioSession ? t('pttMicReady')
            : micBusy ? t('pttMicPreparing') : t('pttMicBlocked')}</p>
        </div> : <p>{t('pttNoDac')}</p>}
        <p>{data.enabled ? t('pttLocalActive') : t('pttLocalDisabled')}.
          {' '}{t('pttLimits')}: {data.frequency_min_hz}–{data.frequency_max_hz} Hz,
          {' '}{data.power_max_watts} {t('pttSetpoint')}, {data.max_transmit_seconds} {t('pttMaximum')}.
          {' '}{t('pttSession')}: {data.lease_active ? t('pttActive') : t('pttInactive')}.
          {' '}{t('pttRxConfirmed')}: {data.rx_confirmed ? t('radioYes') : t('radioNo')}.</p>
        <label><input type="checkbox" checked={enabledHere} disabled={busy || !!lease}
          onChange={(event) => setEnabledHere(event.target.checked)} />
          {t('pttEnableHere')}
        </label>
        <button className="button button-primary" type="button"
          disabled={!holding && (busy || !canStart)}
          onPointerDown={(event) => {
            if (event.button === 0 && event.isPrimary) void start()
          }}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault()
              void start()
            }
          }}>{t('pttHold')}</button>
        <p>{t('pttLeaseNotice')}</p>
      </> : null}
    </section>
  )
}
