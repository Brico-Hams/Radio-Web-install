import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError, createControlRequest, getApiData } from './api'
import { useStableTranslation } from './i18n'

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

  const stop = useCallback(async (announce = true) => {
    generation.current += 1
    active.current = null
    moving.current = false
    if (announce) setLease(null)
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
        const state = await sendControl('/rotor', {
          operation: 'renew', lease_id: lease,
        }, isRotor)
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
      if (result.data.limits.elevation_min === result.data.limits.elevation_max) {
        setElevation(String(result.data.limits.elevation_min))
      }
    } catch (loadError) {
      setError(errorText(loadError, t('rotorError')))
    } finally {
      setBusy(false)
    }
  }

  async function move(event: FormEvent) {
    event.preventDefault()
    if (!azimuth.trim() || !elevation.trim()) {
      setError(t('rotorBothAngles'))
      return
    }
    setBusy(true)
    setError('')
    moving.current = true
    const request = ++generation.current
    try {
      requestId.current = crypto.randomUUID()
      const state = await sendControl('/rotor', {
        operation: 'move', request_id: requestId.current,
        azimuth_deg: Number(azimuth), elevation_deg: Number(elevation),
      }, isRotor)
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
          </form>
          <p>{lease ? t('rotorLeaseActive') : t('rotorLeaseInactive')}</p>
        </div>
      ) : null}
    </section>
  )
}
