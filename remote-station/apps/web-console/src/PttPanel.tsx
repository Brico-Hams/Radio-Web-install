import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createControlRequest, getApiData, getTxAudioUrl, isRecord } from './api'
import { RemoteMicrophone } from './RemoteMicrophone'
import { useStableTranslation } from './i18n'
import {
  loadSpeechProcessor, saveSpeechSettings, speechModule, voxModule,
  type SpeechSettings, type Vox, type VoxContext, type VoxStatus,
} from './txProcessing'

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
  const stopping = useRef<Promise<void>>(Promise.resolve())
  const stopRef = useRef<(announce?: boolean) => Promise<void>>(async () => {})
  const processor = useRef(loadSpeechProcessor())
  const [speech, setSpeech] = useState<SpeechSettings>(() => processor.current.settings())
  const [voxState, setVoxState] = useState<VoxStatus>({ armed: false, keyed: false, pending: false, reason: '' })
  const [voxConfig, setVoxConfig] = useState(() => ({
    threshold: voxModule.RANGES.threshold[2], holdMs: voxModule.RANGES.holdMs[2],
  }))
  const voxContext = useRef<VoxContext>({
    guest: false, transmit: false, linkUp: false, controlLost: false, locked: false, hidden: false,
  })
  const actions = useRef<{ start: (viaVox: boolean) => Promise<boolean> }>({ start: async () => false })
  // VOX is never persisted: it lives only in this ref and starts disarmed on every load.
  const vox = useRef<Vox | null>(null)
  if (!vox.current) {
    vox.current = voxModule.createVox({
      ptt: {
        // Same start/stop path (request, lease renew, heartbeat) as the PTT button.
        down: async () => { await stopping.current; return actions.current.start(true) },
        up: () => { stopping.current = stopRef.current(true) },
      },
      onChange: (status) => setVoxState(status),
    })
  }

  const closeMicrophone = useCallback(() => {
    vox.current?.disarm('mic')
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

  useEffect(() => { stopRef.current = stop }, [stop])

  useEffect(() => {
    mounted.current = true
    // A lease held by VOX is released by VOX itself, never by a stray pointer or key release.
    const cancel = () => {
      if (vox.current?.isKeyed() || vox.current?.isPending()) return
      if (held.current || active.current) void stop()
    }
    const leave = () => { vox.current?.disarm('hidden'); cancel(); closeMicrophone() }
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
      vox.current?.disarm('unmount')
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
          vox.current?.agentCut()
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

  const ready = enabledHere && !!data?.enabled && data.rx_confirmed &&
    !data.stop_failed && (!data.tx_audio_required || !!audioSession)
  const canStart = ready && !data?.lease_active
  voxContext.current = { ...voxContext.current, transmit: ready, linkUp: !!audioSession }
  useEffect(() => { stopRef.current = stop; vox.current?.check(voxContext.current) }, [ready, audioSession, stop])
  useEffect(() => { vox.current?.configure(voxConfig) }, [voxConfig])
  useEffect(() => {
    processor.current.configure(speech)
    saveSpeechSettings(processor.current.settings())
  }, [speech])

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
    }, {
      processor: processor.current,
      onLevel: (level) => { vox.current?.processLevel(level) },
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

  async function start(viaVox = false): Promise<boolean> {
    // VOX re-keys after its own release, when the lease flag of the last render may still be stale.
    if (held.current || !ready || (!viaVox && (busy || !canStart))) return false
    const audioId = microphone.current?.sessionId
    if (data?.tx_audio_required && !audioId) return false
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
        return false
      }
      if (!state.lease_active || !state.lease_id) {
        throw new Error(t('pttExclusiveMissing'))
      }
      active.current = state.lease_id
      setLease(state.lease_id)
      setData(state)
      return true
    } catch (failure) {
      setError(`${t('pttUnconfirmed')} ${message(failure, t('pttError'))}`)
      vox.current?.agentCut()
      await stop()
      return false
    } finally { setBusy(false) }
  }
  actions.current = { start }

  // The PTT button pre-empts VOX: it disarms it and releases the line, and that press is consumed.
  function pressPtt() {
    if (vox.current?.isArmed() && vox.current.buttonPressed()) return
    void start()
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="ptt-title">
      <h2 id="ptt-title">{t('pttTitle')}</h2>
      <p>{t('pttSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy || !!lease}
          onClick={() => void load()}>{t('pttRead')}</button>
        <button className="button button-danger" onClick={() => void stop()}>
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
        <button className={`button button-danger button-ptt${holding ? ' is-transmitting' : ''}`} type="button"
          disabled={!holding && (busy || !canStart)}
          onPointerDown={(event) => {
            if (event.button === 0 && event.isPrimary) pressPtt()
          }}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              event.preventDefault()
              pressPtt()
            }
          }}>{t('pttHold')}</button>
        <p>{t('pttLeaseNotice')}</p>
        <fieldset className="tx-audio-options">
          <legend>{t('speechProcessor')}</legend>
          <label><input type="checkbox" checked={speech.enabled}
            onChange={(event) => setSpeech({ ...speech, enabled: event.target.checked })} />
            {t('speechProcessor')}
          </label>
          {([
            ['thresholdDb', 'speechThreshold'], ['ratio', 'speechRatio'], ['presenceDb', 'speechPresence'],
          ] as const).map(([key, label]) => {
            const [min, max] = speechModule.RANGES[key]
            return <label key={key}>{t(label)}: {speech[key]}
              <input type="range" min={min} max={max} step={key === 'ratio' ? 0.5 : 1} value={speech[key]}
                onChange={(event) => setSpeech({ ...speech, [key]: Number(event.target.value) })} />
            </label>
          })}
        </fieldset>
        <fieldset className="tx-audio-options">
          <legend>VOX</legend>
          <button className="button button-secondary" type="button" aria-pressed={voxState.armed}
            disabled={!voxState.armed && !(ready && !!audioSession)}
            onClick={() => {
              if (voxState.armed) vox.current?.disarm('operator')
              else vox.current?.arm(voxContext.current)
            }}>{voxState.armed ? t('voxArmed') : t('voxArm')}</button>
          <label>{t('voxThreshold')}: {voxConfig.threshold}
            <input type="range" min={voxModule.RANGES.threshold[0]} max={voxModule.RANGES.threshold[1]} step={0.01}
              value={voxConfig.threshold}
              onChange={(event) => setVoxConfig({ ...voxConfig, threshold: Number(event.target.value) })} />
          </label>
          <label>{t('voxHold')}: {voxConfig.holdMs} ms
            <input type="range" min={voxModule.RANGES.holdMs[0]} max={voxModule.RANGES.holdMs[1]} step={50}
              value={voxConfig.holdMs}
              onChange={(event) => setVoxConfig({ ...voxConfig, holdMs: Number(event.target.value) })} />
          </label>
          <p>{!voxState.armed && voxState.reason && voxState.reason !== 'operator' ? t('voxDisarmed')
            : !(ready && !!audioSession) ? t('voxUnavailable') : t('voxHint')}</p>
        </fieldset>
      </> : null}
    </section>
  )
}
