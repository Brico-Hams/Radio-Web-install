import { useState, type FormEvent } from 'react'
import {
  ApiError, createQso, downloadAdif, getApiData, isLogbookPage, isProtocolCatalog,
  type LogbookPage, type ProtocolCatalog,
} from './api'

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud.'
}

export function ProtocolPanel({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<ProtocolCatalog | null>(null)
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const profile = catalog?.candidates.find((candidate) => candidate.model === model)

  async function load() {
    setBusy(true)
    setError('')
    setCatalog(null)
    try {
      const result = await getApiData(token, '/protocols', isProtocolCatalog)
      if (!result.allowed) throw new Error('Tu rol no permite consultar los protocolos.')
      setCatalog(result.data)
      setModel(result.data.candidates[0]?.model ?? '')
    } catch (error) {
      setError(message(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="protocol-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROTOCOLOS · OFFLINE</p>
          <h2 id="protocol-title">Consultas CAT por modelo</h2>
        </div>
        <button className="button button-secondary" disabled={busy} onClick={() => void load()}>
          {busy ? 'Consultando…' : 'Consultar protocolos'}
        </button>
      </div>
      <p className="device-safety-note">
        Solo catálogo de consultas y decoders. No conecta ni envía comandos.
        Todos los modelos siguen sin validación física.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {catalog ? (
        <label>Modelo CAT
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {catalog.candidates.map((candidate) => (
              <option key={candidate.model} value={candidate.model}>
                {candidate.manufacturer} {candidate.model}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {profile ? (
        <div>
          <p><strong>{profile.protocol ?? 'Protocolo no implementado'}</strong></p>
          <p>
            {profile.binding_status === 'model_profile'
              ? 'Perfil de consultas por modelo; no es soporte de hardware.'
              : profile.binding_status === 'family_syntax_only'
                ? 'Solo sintaxis de familia; no acredita compatibilidad del modelo.'
                : 'Sin perfil implementado: no se sustituye por otra radio.'}
          </p>
          <ul className="protocol-queries">
            {profile.queries.map((query) => (
              <li key={query.command}>
                <code>{query.command}</code> · {query.reply_decoder
                  ? 'Decoder offline disponible' : 'Sin decoder de respuesta'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

export function LogbookPanel({ token }: { token: string }) {
  const [page, setPage] = useState<LogbookPage | null>(null)
  const [call, setCall] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [frequency, setFrequency] = useState('')
  const [mode, setMode] = useState('SSB')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function fetchPage(offset: number) {
    const result = await getApiData(token, `/logbook?offset=${offset}`, isLogbookPage)
    if (!result.allowed) throw new Error('Tu rol no permite consultar el logbook.')
    setPage(result.data)
  }

  async function load(offset = 0) {
    setBusy(true)
    setError('')
    setNotice('')
    setPage(null)
    try {
      await fetchPage(offset)
    } catch (error) {
      setError(error instanceof ApiError && error.status === 503
        ? 'Logbook web desactivado. Inicia el coordinador con --logbook-database y una ruta SQLite.'
        : message(error))
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    let saved = false
    try {
      const hz = Number(frequency)
      if (!Number.isSafeInteger(hz) || hz <= 0) throw new Error('Introduce una frecuencia entera positiva en Hz.')
      await createQso(token, { call, started_at: startedAt, frequency_hz: hz, mode })
      saved = true
      setCall('')
      setStartedAt('')
      setFrequency('')
      setNotice('QSO guardado en SQLite. No procede del simulador.')
      await fetchPage(0)
    } catch (error) {
      setError(saved
        ? `El QSO ya está guardado, pero no se pudo actualizar la lista: ${message(error)}`
        : message(error))
    } finally {
      setBusy(false)
    }
  }

  async function exportLogbook() {
    setBusy(true)
    setError('')
    try {
      await downloadAdif(token)
    } catch (error) {
      setError(message(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-card operation-panel" aria-labelledby="logbook-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OPERACIÓN LOCAL · SQLITE</p>
          <h2 id="logbook-title">Logbook</h2>
        </div>
        <button className="button button-secondary" disabled={busy} onClick={() => void load()}>
          {busy ? 'Procesando…' : 'Consultar logbook'}
        </button>
      </div>
      <p className="device-safety-note">
        Registra solo contactos realizados. Los datos se introducen manualmente;
        no se copian la frecuencia ni el indicativo de la demostración.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {page ? (
        <>
          {page.can_write ? (
            <form className="qso-form" onSubmit={(event) => void save(event)}>
              <label>Indicativo del contacto
                <input required disabled={busy} maxLength={32} value={call} onChange={(event) => setCall(event.target.value)} />
              </label>
              <label>Fecha/hora ISO con zona
                <input required disabled={busy} maxLength={64} placeholder="2026-11-20T16:30:00Z"
                  value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
              </label>
              <label>Frecuencia del QSO (Hz)
                <input required disabled={busy} type="number" min="1" step="1" value={frequency}
                  onChange={(event) => setFrequency(event.target.value)} />
              </label>
              <label>Modo del QSO
                <select disabled={busy} value={mode} onChange={(event) => setMode(event.target.value)}>
                  {['CW', 'SSB', 'USB', 'LSB', 'AM', 'FM', 'RTTY', 'FT8'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button className="button button-primary" disabled={busy} type="submit">Guardar QSO</button>
            </form>
          ) : <p>Tu rol permite leer y exportar, pero no guardar contactos.</p>}
          <div className="table-scroll">
            <table className="qso-table">
              <caption>Contactos guardados · orden UTC ascendente</caption>
              <thead><tr><th>Indicativo</th><th>Fecha/hora UTC</th><th>Hz</th><th>Modo</th></tr></thead>
              <tbody>
                {page.qsos.map((qso, index) => (
                  <tr key={`${page.offset}-${index}`}>
                    <td>{qso.call}</td><td>{qso.started_at}</td>
                    <td>{qso.frequency_hz.toLocaleString('es-ES')}</td><td>{qso.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page.qsos.length === 0 ? <p>No hay contactos en esta página.</p> : null}
          <div className="session-actions">
            <button className="button button-secondary" disabled={busy || page.offset === 0}
              onClick={() => void load(Math.max(0, page.offset - 50))}>Página anterior</button>
            <button className="button button-secondary" disabled={busy || !page.has_more}
              onClick={() => void load(page.offset + 50)}>Página siguiente</button>
            <button className="button button-secondary" disabled={busy}
              onClick={() => void exportLogbook()}>Exportar ADIF</button>
          </div>
        </>
      ) : null}
    </section>
  )
}
