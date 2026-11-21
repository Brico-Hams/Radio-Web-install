import { useMemo, useState } from 'react'
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
      typeof record.connected === 'boolean' && Array.isArray(record.decodes)) ||
    (record.status === 'experimental' && record.tx_control_enabled === false &&
      typeof record.model === 'string' && Array.isArray(record.queries) &&
      record.queries.every((query: unknown) => typeof query === 'string'))
  )
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
  const [digital, setDigital] = useState<LivePayload | null>(null)
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [commandResult, setCommandResult] = useState<DigitalCommandResult | null>(null)

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
      setDigital(null)
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
      setDigital(null)
      setCommandResult(null)
    }
    try {
      const endpoint = `/${kind}${read ? `?command=${encodeURIComponent(command)}` : ''}`
      const response = await getApiData(token, endpoint, isLive)
      if (!response.allowed) throw new Error('Esta función requiere permiso de admin u operador.')
      if (kind === 'cat') {
        setCat(response.data)
        if (!read) setCommand(response.data.queries?.[0] ?? '')
      } else setDigital(response.data)
    } catch (error) {
      setError(error instanceof ApiError && error.status === 503
        ? `El agente o la integración no están disponibles (${error.code ?? 'HTTP 503'}). Revisa su configuración y diagnóstico; no se muestran datos de demostración.`
        : error instanceof Error ? error.message : 'Error al consultar el agente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="agent-live-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AGENTE · SIN DATOS SIMULADOS</p>
          <h2 id="agent-live-title">CAT experimental y WSJT-X</h2>
        </div>
      </div>
      <p className="device-safety-note">
        CAT solo lee consultas permitidas en un puerto seleccionado explícitamente.
        {t('digitalSafeCommandsNotice')}
      </p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load('cat')}>Consultar configuración CAT</button>
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load('digital')}>Consultar WSJT-X</button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {cat ? (
        <div>
          <p>{cat.model} · EXPERIMENTAL · pendiente de pruebas físicas</p>
          {cat.protocol === 'OpenGD77 USB CPS' ? <p role="note">
            OpenGD77 solo identifica modelo y firmware. USB CPS no ofrece control
            de frecuencia, modo, canal ni PTT; no se sustituye por hotspot MMDVM.
          </p> : null}
          <label>Consulta CAT de lectura
            <select value={command} disabled={busy} onChange={(event) => setCommand(event.target.value)}>
              {cat.queries?.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button className="button button-secondary" disabled={busy || !command}
            onClick={() => void load('cat', true)}>Leer consulta CAT</button>
          <pre className="live-data">{JSON.stringify(cat, null, 2)}</pre>
        </div>
      ) : null}
      {digital ? (
        <div>
          <p role="note">UDP WSJT-X no autenticado: un proceso local puede suplantarlo.
            Estos datos no se usan para autorizar ni controlar la radio.</p>
          <p>{digital.connected ? 'WSJT-X detectado por UDP local' : 'WSJT-X sin actividad reciente; cualquier dato retenido es histórico'}</p>
          {digital.commands_enabled ? <div className="session-actions">
            <button className="button button-secondary" disabled={busy || !digital.commands_ready}
              onClick={() => void operateDigital('replay')}>{t('digitalReplay')}</button>
            <button className="button button-secondary" disabled={busy || !digital.commands_ready}
              onClick={() => void operateDigital('halt_tx')}>{t('digitalHaltTx')}</button>
          </div> : null}
          {digital.commands_enabled ? <p role="note">{t('digitalDeliveryWarning')}</p> : null}
          <pre className="live-data">{JSON.stringify(digital, null, 2)}</pre>
        </div>
      ) : null}
      {commandResult ? <p role="status">
        {commandResult.operation === 'halt_tx' ? t('digitalHaltSent') : t('digitalReplaySent')}
      </p> : null}
    </section>
  )
}
