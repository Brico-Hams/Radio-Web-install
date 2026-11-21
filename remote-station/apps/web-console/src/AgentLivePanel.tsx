import { useState } from 'react'
import { ApiError, getApiData } from './api'

type LivePayload = {
  api_version: 'v1'
  data_is_simulated: false
  model?: string
  status?: unknown
  queries?: string[]
  source?: string
  connected?: boolean
  commands_enabled?: false
  tx_control_enabled?: false
  [key: string]: unknown
}

function isLive(payload: unknown): payload is LivePayload {
  if (typeof payload !== 'object' || payload === null) return false
  const record = Object.fromEntries(Object.entries(payload))
  return record.api_version === 'v1' && record.data_is_simulated === false && (
    (record.source === 'wsjtx_udp' && record.commands_enabled === false &&
      record.authenticated === false && record.suitable_for_control === false &&
      record.trust === 'untrusted_local_udp' &&
      typeof record.connected === 'boolean' && Array.isArray(record.decodes)) ||
    (record.status === 'experimental' && record.tx_control_enabled === false &&
      typeof record.model === 'string' && Array.isArray(record.queries) &&
      record.queries.every((query: unknown) => typeof query === 'string'))
  )
}

export function AgentLivePanel({ token }: { token: string }) {
  const [cat, setCat] = useState<LivePayload | null>(null)
  const [digital, setDigital] = useState<LivePayload | null>(null)
  const [command, setCommand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load(kind: 'cat' | 'digital', read = false) {
    setBusy(true)
    setError('')
    if (kind === 'cat') setCat(null)
    else setDigital(null)
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
        WSJT-X se ejecuta en el equipo de estación; el agente recibe su UDP local y no
        envía comandos ni habilita TX. El estado TX que pueda mostrar WSJT-X es externo a BricoHams.
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
          <pre className="live-data">{JSON.stringify(digital, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  )
}
