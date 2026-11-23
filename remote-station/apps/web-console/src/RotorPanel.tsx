import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError, createControlRequest, getApiData } from './api'
import { useStableTranslation } from './i18n'
import {
  MAX_TRACK_FILE_BYTES,
  PassTrackError,
  parsePassTrack,
  trackTarget,
  type PassTrack,
  type RotorLimits,
  type TrackTarget,
} from './passTrack'

const RETARGET_DEG = 0.5

type RotorState = {
  api_version: 'v1'
  source: 'hamlib_rotctld'
  status: 'experimental'
  data_is_simulated: false
  hardware_validation_complete: false
  label: string
  motion_enabled: boolean
  lease_active: boolean
  stop_failed: boolean
  park?: { azimuth_deg: number; elevation_deg: number } | null
  lease_id?: string
  limits: {
    azimuth_min: number
    azimuth_max: number
    elevation_min: number
    elevation_max: number
  }
  position?: { azimuth_deg: number; elevation_deg: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRotor(value: unknown): value is RotorState {
  if (!isRecord(value) || !isRecord(value.limits)) return false
  const limits = value.limits
  return value.api_version === 'v1' && value.source === 'hamlib_rotctld' &&
    value.status === 'experimental' && value.data_is_simulated === false &&
    value.hardware_validation_complete === false && typeof value.label === 'string' &&
    typeof value.motion_enabled === 'boolean' && typeof value.lease_active === 'boolean' &&
    typeof value.stop_failed === 'boolean' &&
    ['azimuth_min', 'azimuth_max', 'elevation_min', 'elevation_max'].every(
      (key) => typeof limits[key] === 'number' && Number.isFinite(limits[key]),
    ) &&
    (value.lease_id === undefined ||
      (typeof value.lease_id === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value.lease_id))) &&
    (value.position === undefined ||
      (isRecord(value.position) && typeof value.position.azimuth_deg === 'number' &&
        Number.isFinite(value.position.azimuth_deg) && typeof value.position.elevation_deg === 'number' &&
        Number.isFinite(value.position.elevation_deg)))
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function RotorPanel({ token }: { token: string }) {
  const { t, translate } = useStableTranslation()
  const sendControl = useMemo(() => createControlRequest(token), [token])
  const [data, setData] = useState<RotorState | null>(null)
  const [azimuth, setAzimuth] = useState('')
  const [elevation, setElevation] = useState('')
  const [lease, setLease] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<string | null>(null)
  const generation = useRef(0)
  const moving = useRef(false)
  const requestId = useRef<string | null>(null)
  const track = useRef<PassTrack | null>(null)
  const lastTarget = useRef<{ azimuth: number; elevation: number } | null>(null)
  const limitsRef = useRef<RotorLimits | null>(null)
  const [pass, setPass] = useState<PassTrack | null>(null)
  const [following, setFollowing] = useState(false)
  const [trackInfo, setTrackInfo] = useState('')

  const stop = useCallback(async (announce = true) => {
    generation.current += 1
    active.current = null
    moving.current = false
    track.current = null
    lastTarget.current = null
    if (announce) {
      setLease(null)
      setFollowing(false)
    }
    try {
      const state = await sendControl('/rotor', {
        operation: 'stop',
        ...(requestId.current ? { cancel_request_id: requestId.current } : {}),
      }, isRotor, true)
      if (announce) setData(state)
    } catch (stopError) {
      if (announce) {
        setError(`${translate('rotorStopUnconfirmed')} ${errorText(stopError, translate('rotorError'))}`)
      } else {
        console.error('Rotor stop was not confirmed:', errorText(stopError, translate('rotorError')))
      }
    }
  }, [sendControl, translate])

  useEffect(() => {
    const cancel = () => {
      if (active.current || moving.current) void stop()
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') cancel()
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('pagehide', cancel)
      document.removeEventListener('visibilitychange', visibility)
      if (active.current || moving.current) void stop(false)
    }
  }, [stop])

  useEffect(() => {
    if (!lease) return
    let pending = false
    const timer = window.setInterval(async () => {
      if (pending || active.current !== lease) return
      pending = true
      try {
        const followed = track.current
        const limits = limitsRef.current
        let target: TrackTarget | null = null
        if (followed && limits) target = trackTarget(followed, Date.now(), limits, lastTarget.current?.azimuth ?? 0)
        if (target?.phase === 'after') {
          setTrackInfo(translate('rotorPassFinished'))
          void stop()
          return
        }
        const last = lastTarget.current
        let state: RotorState
        if (target?.phase === 'active' && (!last || Math.abs(target.azimuth - last.azimuth) >= RETARGET_DEG ||
          Math.abs(target.elevation - last.elevation) >= RETARGET_DEG)) {
          // Retarget on the live lease: the AZ/EL stream is driven by the clock, never by Doppler.
          requestId.current = crypto.randomUUID()
          state = await sendControl('/rotor', {
            operation: 'move', lease_id: lease, request_id: requestId.current,
            azimuth_deg: target.azimuth, elevation_deg: target.elevation,
          }, isRotor)
          lastTarget.current = { azimuth: target.azimuth, elevation: target.elevation }
          setTrackInfo(`${followed?.name || translate('rotorPassDefaultName')}: ${target.azimuth.toFixed(1)}° / ${target.elevation.toFixed(1)}°`)
        } else {
          state = await sendControl('/rotor', {
            operation: 'renew', lease_id: lease,
          }, isRotor)
          if (target?.phase === 'below') setTrackInfo(translate('rotorPassBelowHorizon'))
          if (target?.phase === 'limits') setTrackInfo(translate('rotorPassOutOfLimits'))
        }
        if (active.current === lease) setData(state)
      } catch (renewError) {
        if (active.current === lease) {
          setError(`${translate('rotorSessionLost')} ${errorText(renewError, translate('rotorError'))}`)
          void stop()
        }
      } finally {
        pending = false
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lease, sendControl, stop, translate])

  async function load(position = false) {
    setBusy(true)
    setError('')
    try {
      const result = await getApiData(token, `/rotor${position ? '?command=position' : ''}`, isRotor)
      if (!result.allowed) throw new Error(t('radioPermission'))
      setData(result.data)
      limitsRef.current = result.data.limits
      if (result.data.limits.elevation_min === result.data.limits.elevation_max) {
        setElevation(String(result.data.limits.elevation_min))
      }
    } catch (loadError) {
      setError(errorText(loadError, t('rotorError')))
    } finally {
      setBusy(false)
    }
  }

  async function begin(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    moving.current = true
    const request = ++generation.current
    try {
      requestId.current = crypto.randomUUID()
      const state = await sendControl('/rotor', { ...body, request_id: requestId.current }, isRotor)
      if (generation.current !== request) {
        void stop()
        return
      }
      if (!state.lease_active || !state.lease_id) {
        throw new Error(t('rotorSessionUnconfirmed'))
      }
      active.current = state.lease_id
      setLease(state.lease_id)
      setData(state)
    } catch (moveError) {
      if (generation.current === request) {
        setError(errorText(moveError, t('rotorError')))
        if (!(moveError instanceof ApiError) || moveError.status >= 500) void stop()
      }
    } finally {
      moving.current = false
      setBusy(false)
    }
  }

  async function loadPass(file: File | undefined) {
    setPass(null)
    setTrackInfo('')
    if (!file) return
    try {
      if (file.size > MAX_TRACK_FILE_BYTES) throw new PassTrackError('invalid')
      const parsed = parsePassTrack(await file.text())
      setPass(parsed)
      const clock = (ms: number) => new Date(ms).toLocaleTimeString()
      setTrackInfo(`${parsed.name || t('rotorPassDefaultName')}: ${clock(parsed.samples[0].t)} - ${clock(parsed.samples[parsed.samples.length - 1].t)}`)
    } catch (passError) {
      setError(t(passError instanceof PassTrackError && passError.code === 'tooLong' ? 'rotorPassTooLong' : 'rotorPassInvalid'))
    }
  }

  async function followPass() {
    if (!pass || !data) return
    // The first target (the pass position now, or its AOS point) is only sent after this explicit click.
    const first = trackTarget(pass, Math.max(Date.now(), pass.samples[0].t), data.limits, 0)
    if (first.phase !== 'active') {
      setError(t('rotorPassNotReachable'))
      return
    }
    limitsRef.current = data.limits
    track.current = pass
    lastTarget.current = { azimuth: first.azimuth, elevation: first.elevation }
    setFollowing(true)
    await begin({ operation: 'move', azimuth_deg: first.azimuth, elevation_deg: first.elevation })
    if (!active.current) {
      track.current = null
      lastTarget.current = null
      setFollowing(false)
    }
  }

  function move(event: FormEvent) {
    event.preventDefault()
    if (!azimuth.trim() || !elevation.trim()) {
      setError(t('rotorBothAngles'))
      return Promise.resolve()
    }
    return begin({ operation: 'move', azimuth_deg: Number(azimuth), elevation_deg: Number(elevation) })
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="rotor-title">
      <h2 id="rotor-title">{t('rotorTitle')}</h2>
      <p>{t('rotorSafety')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy || !!lease}
          onClick={() => void load()}>{t('rotorReadConfig')}</button>
        <button className="button button-secondary" disabled={busy || !!lease}
          onClick={() => void load(true)}>{t('rotorReadPosition')}</button>
        <button className="button button-primary" onClick={() => {
          setError('')
          void stop()
        }}>{t('rotorStop')}</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {data ? (
        <div>
          <p>{data.label} · {data.motion_enabled ? t('rotorOptIn') : t('rotorReadOnly')}</p>
          <p>{t('rotorReportedPosition')}: {data.position
            ? `${data.position.azimuth_deg}° ${t('rotorAzimuth')} / ${data.position.elevation_deg}° ${t('rotorElevation')}`
            : t('radioNotRead')}</p>
          {data.stop_failed ? <p role="alert">{t('rotorStopBlocked')}</p> : null}
          <form onSubmit={(event) => void move(event)}>
            <label>{t('rotorTargetAzimuth')}
              <input type="number" step="any" required value={azimuth}
                min={data.limits.azimuth_min} max={data.limits.azimuth_max}
                onChange={(event) => setAzimuth(event.target.value)} />
            </label>
            <label>{t('rotorTargetElevation')}
              <input type="number" step="any" required value={elevation}
                min={data.limits.elevation_min} max={data.limits.elevation_max}
                onChange={(event) => setElevation(event.target.value)} />
            </label>
            <button type="submit" className="button button-secondary"
              disabled={busy || !!lease || !data.motion_enabled || data.stop_failed}>
              {t('rotorMove')}
            </button>
            <button type="button" className="button button-secondary"
              disabled={busy || !!lease || !data.motion_enabled || data.stop_failed || !data.park}
              title={data.park ? undefined : t('rotorParkUnavailable')}
              onClick={() => void begin({ operation: 'park' })}>
              {t('rotorPark')}
            </button>
          </form>
          <h3>{t('rotorTracking')}</h3>
          <label>{t('rotorPassFile')}
            <input type="file" accept="application/json,.json" disabled={busy || following}
              onChange={(event) => void loadPass(event.target.files?.[0])} />
          </label>
          <button type="button" className="button button-secondary"
            disabled={following ? false : busy || !!lease || !pass || !data.motion_enabled || data.stop_failed}
            onClick={() => (following ? void stop() : void followPass())}>
            {following ? t('rotorUnfollow') : t('rotorFollow')}
          </button>
          {trackInfo ? <p>{trackInfo}</p> : null}
          <p>{lease ? t('rotorLeaseActive') : t('rotorLeaseInactive')}</p>
        </div>
      ) : null}
    </section>
  )
}
