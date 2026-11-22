import { useRef, useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  ApiError,
  getApiData,
  isCapabilityCatalog,
  isDeviceInventory,
  isDiagnostics,
  isRadioCandidateCatalog,
  isStationSnapshot,
  setCoordinatorUrl,
  type CapabilityCatalog,
  type DeviceInventory,
  type Diagnostics,
  type RadioCandidate,
  type RadioCandidateCatalog,
  type StationSnapshot,
} from './api'
import './App.css'
import { LogbookPanel, ProtocolPanel } from './OperationPanels'
import { AgentLivePanel } from './AgentLivePanel'
import { RotorPanel } from './RotorPanel'
import { RadioSettingsPanel } from './RadioSettingsPanel'
import { RadioOperatingPanel } from './RadioOperatingPanel'
import { PttPanel } from './PttPanel'
import { AudioPanel } from './AudioPanel'
import { useLanguage } from './i18n'
import { LanguageProvider, LanguageSelector } from './LanguageProvider'
import { HelpPanel } from './HelpPanel'
import { ConfigurationPanel } from './ConfigurationPanel'
import { HostConfigurationPanel } from './HostConfigurationPanel'
import { DiagnosticPanel } from './DiagnosticPanel'
import { useDiagnosticReporting } from './diagnosticReporting'

function formatFrequency(frequencyHz: number): string {
  return new Intl.NumberFormat('es-ES').format(frequencyHz)
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ')
}

function capabilityStatusLabel(status: string): string {
  switch (status) {
    case 'verified':
      return 'VERIFICADO'
    case 'implemented_untested':
      return 'SIN VALIDAR'
    case 'experimental':
      return 'EXPERIMENTAL'
    case 'unsupported':
      return 'NO DISPONIBLE'
    default:
      return statusLabel(status).toUpperCase()
  }
}

function groupCandidatesByManufacturer(
  candidates: RadioCandidate[],
): Map<string, RadioCandidate[]> {
  const grouped = new Map<string, RadioCandidate[]>()
  for (const candidate of candidates) {
    const models = grouped.get(candidate.manufacturer) ?? []
    models.push(candidate)
    grouped.set(candidate.manufacturer, models)
  }
  return grouped
}

function scopeClaimLabel(claim: RadioCandidate['third_party_scope_claim']): string {
  switch (claim) {
    case 'yes':
      return 'Scope indicado por la fuente'
    case 'no':
      return 'Scope no listado por la fuente'
    case 'not_stated':
      return 'Scope no especificado'
    case 'not_in_source':
      return 'La fuente de este candidato no trata scope'
  }
}

function testedClaimLabel(claim: RadioCandidate['third_party_tested']): string {
  switch (claim) {
    case 'yes':
      return 'La fuente de terceros dice “probado”; no es una prueba BricoHams'
    case 'not_stated':
      return 'La fuente no declara una prueba'
    case 'not_in_source':
      return 'Fuente primaria de proyecto; prueba de terceros no aplicable'
  }
}

function supportClaimLabel(claim: RadioCandidate['third_party_support_status']): string {
  switch (claim) {
    case 'beta':
      return 'La fuente de terceros identifica soporte beta'
    case 'not_stated':
      return 'La fuente no indica una etiqueta de beta'
    case 'not_in_source':
      return 'La documentación de proyecto no evalúa el soporte de terceros'
  }
}

function App() {
  const { t } = useLanguage()
  const [page, setPage] = useState<'console' | 'settings' | 'help'>('console')
  const connectionGeneration = useRef(0)
  const nativeClient = Capacitor.isNativePlatform()
  const [serverInput, setServerInput] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [activeToken, setActiveToken] = useState<string | null>(null)
  useDiagnosticReporting(activeToken)
  const [catalog, setCatalog] = useState<CapabilityCatalog | null>(null)
  const [radioCandidates, setRadioCandidates] = useState<RadioCandidateCatalog | null>(null)
  const [snapshot, setSnapshot] = useState<StationSnapshot | null>(null)
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [deviceInventory, setDeviceInventory] = useState<DeviceInventory | null>(null)
  const [stationAccessDenied, setStationAccessDenied] = useState(false)
  const [diagnosticsAccessDenied, setDiagnosticsAccessDenied] = useState(false)
  const [deviceAccessDenied, setDeviceAccessDenied] = useState(false)
  const [agentUnavailable, setAgentUnavailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadConsole(token: string): Promise<void> {
    const generation = ++connectionGeneration.current
    setLoading(true)
    setError('')
    try {
      const agentRequest = getApiData(token, '/devices', isDeviceInventory)
        .then((result) => ({ kind: 'response' as const, result }))
        .catch((agentError: unknown) => {
          if (agentError instanceof ApiError && agentError.status === 503) {
            return { kind: 'unavailable' as const }
          }
          throw agentError
        })
      const [
        catalogResult,
        statusResult,
        diagnosticsResult,
        agentResult,
        radioCandidateResult,
      ] =
        await Promise.all([
          getApiData(token, '/capabilities', isCapabilityCatalog),
          getApiData(token, '/status', isStationSnapshot),
          getApiData(token, '/diagnostics', isDiagnostics),
          agentRequest,
          getApiData(token, '/radios', isRadioCandidateCatalog),
        ])
      if (generation !== connectionGeneration.current) return

      if (!catalogResult.allowed) {
        throw new Error(t('deniedCatalog'))
      }
      if (!radioCandidateResult.allowed) {
        throw new Error(t('deniedRadios'))
      }

      setCatalog(catalogResult.data)
      setRadioCandidates(radioCandidateResult.data)
      setStationAccessDenied(!statusResult.allowed)
      setSnapshot(statusResult.allowed ? statusResult.data : null)
      setDiagnosticsAccessDenied(!diagnosticsResult.allowed)
      setDiagnostics(diagnosticsResult.allowed ? diagnosticsResult.data : null)
      setAgentUnavailable(agentResult.kind === 'unavailable')
      setDeviceAccessDenied(
        agentResult.kind === 'response' && !agentResult.result.allowed,
      )
      setDeviceInventory(
        agentResult.kind === 'response' && agentResult.result.allowed
          ? agentResult.result.data
          : null,
      )
      setActiveToken(token)
    } catch (loadError) {
      if (generation !== connectionGeneration.current) return
      if (loadError instanceof ApiError && loadError.status === 401) {
        setActiveToken(null)
        setTokenInput('')
        setCatalog(null)
        setRadioCandidates(null)
        setSnapshot(null)
        setDiagnostics(null)
        setDeviceInventory(null)
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : t('connectFailed'),
      )
    } finally {
      if (generation === connectionGeneration.current) setLoading(false)
    }
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const token = tokenInput.trim()
    if (!token) {
      setError(t('tokenRequired'))
      return
    }
    try {
      if (nativeClient && !serverInput.trim()) {
        setError(t('hostRequired'))
        return
      }
      setCoordinatorUrl(nativeClient ? serverInput : '')
    } catch (configurationError) {
      console.warn('Invalid coordinator configuration.', configurationError instanceof Error ? configurationError.name : 'Unknown error')
      setError(t('invalidHost'))
      return
    }
    await loadConsole(token)
  }

  function disconnect(): void {
    connectionGeneration.current++
    setLoading(false)
    setActiveToken(null)
    setTokenInput('')
    setCatalog(null)
    setRadioCandidates(null)
    setSnapshot(null)
    setDiagnostics(null)
    setDeviceInventory(null)
    setStationAccessDenied(false)
    setDiagnosticsAccessDenied(false)
    setDeviceAccessDenied(false)
    setAgentUnavailable(false)
    setError('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('home')}>
          <img className="brand-logo" src="/branding/bricohams_horizontal.svg"
            alt="BricoHams · Radioafición · Hazlo tú mismo" />
          <span className="brand-name">
            <strong>BricoHams</strong>
            <span>Radio Workspace / Remote Station</span>
          </span>
        </a>
        <div className="coordinator-indicator">
          <span className={`indicator-dot${activeToken ? ' is-connected' : ''}`} />
          <span>{activeToken ? t('connected') : t('local')}</span>
        </div>
        <LanguageSelector />
      </header>

      <main className="main-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 id="page-title">{t('title')}</h1>
            <p className="page-description">
              {t('description')}
            </p>
          </div>
          {activeToken ? (
            <div className="session-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void loadConsole(activeToken)}
                disabled={loading}
              >
                {loading ? t('updating') : t('update')}
              </button>
              <button className="text-button" type="button" onClick={disconnect}>
                {t('disconnect')}
              </button>
            </div>
          ) : null}
        </section>
        <nav className="workspace-navigation" aria-label={t('navigation')}>
          {(['console', 'settings', 'help'] as const).map((target) => <button key={target}
            className="button button-secondary" type="button" aria-current={page === target ? 'page' : undefined}
            onClick={() => setPage(target)}>{t(target)}</button>)}
        </nav>
        {page === 'help' ? <HelpPanel /> : null}
        {/* The mobile app is only a client of the remote station: no agent or host setup on the phone. */}
        {page === 'settings' ? <>{nativeClient ? null : <><ConfigurationPanel /><HostConfigurationPanel /></>}<DiagnosticPanel token={activeToken} /></> : null}

        {!activeToken && page === 'console' ? (
          <section className="connect-card" aria-labelledby="connect-title">
            <div className="card-icon" aria-hidden="true">01</div>
            <div className="connect-copy">
              <h2 id="connect-title">{t('connectTitle')}</h2>
              <p>
                {t('connectionNotice')}
              </p>
            </div>
            <form className="connect-form" onSubmit={(event) => void handleConnect(event)}>
              {nativeClient ? (
                <>
                  <label htmlFor="coordinator-url">{t('host')}</label>
                  <input id="coordinator-url" type="url" required
                    autoComplete="off" placeholder="https://estacion.example.org:8790"
                    value={serverInput} onChange={(event) => setServerInput(event.target.value)} />
                </>
              ) : null}
              <label htmlFor="access-token">{t('token')}</label>
              <div className="connect-controls">
                <input
                  autoComplete="off"
                  id="access-token"
                  name="access-token"
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder={t('tokenPlaceholder')}
                  type="password"
                  value={tokenInput}
                />
                <button className="button button-primary" type="submit" disabled={loading}>
                  {loading ? t('connecting') : t('connect')}
                </button>
              </div>
              <p className="form-hint">{t('tokenHint')}</p>
            </form>
          </section>
        ) : null}

        {error ? (
          <div className="error-banner" role="alert">
            <span className="error-symbol" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        ) : null}

        {activeToken && catalog && page === 'console' ? (
          <div className="dashboard">
            {snapshot ? (
              <section className="station-card" aria-labelledby="station-title">
                <div className="station-card-top">
                  <div>
                    <p className="eyebrow">ESTACIÓN ACTIVA</p>
                    <h2 id="station-title">{snapshot.name}</h2>
                    <p className="callsign">{snapshot.callsign}</p>
                  </div>
                  <span className="state-pill state-simulated">
                    <span className="pill-dot" />
                    {snapshot.data_is_simulated
                      ? 'MODO DEMOSTRACIÓN · DATOS SIMULADOS'
                      : 'DATOS DE ESTACIÓN'}
                  </span>
                </div>
                <div className="station-card-bottom">
                  <div className="radio-identification">
                    <span className="radio-icon" aria-hidden="true">RF</span>
                    <div>
                      <span className="meta-label">Perfil de radio</span>
                      <strong>{snapshot.radio_profile.manufacturer} {snapshot.radio_profile.model}</strong>
                    </div>
                  </div>
                  <span className="hardware-state">
                    <span className={`indicator-dot${snapshot.hardware_connected ? ' is-connected' : ''}`} />
                    {snapshot.hardware_connected ? 'Hardware conectado' : 'Hardware no conectado'}
                  </span>
                </div>
              </section>
            ) : null}

            {stationAccessDenied ? (
              <div className="notice-banner" role="status">
                Tu rol puede ver el catálogo, pero no tiene permiso para consultar el
                estado de la estación.
              </div>
            ) : null}

            {snapshot ? (
              <section className="metrics-grid" aria-label="Estado de radio">
                <article className="metric-card metric-frequency">
                  <span className="metric-label">FRECUENCIA</span>
                  <strong className="metric-value">{formatFrequency(snapshot.frequency_hz)}</strong>
                  <span className="metric-unit">Hz</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">VFO</span>
                  <strong className="metric-value">{snapshot.vfo}</strong>
                  <span className="metric-unit">Oscilador activo</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">MODO</span>
                  <strong className="metric-value">{snapshot.mode}</strong>
                  <span className="metric-unit">Operación</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">BANDA</span>
                  <strong className="metric-value">{snapshot.band}</strong>
                  <span className="metric-unit">Banda reportada</span>
                </article>
              </section>
            ) : null}

            <section className="operation-workspace" aria-labelledby="operation-workspace-title">
              <header>
                <h2 id="operation-workspace-title">{t('operationWorkspace')}</h2>
                <p className="muted-copy">{t('operationNotice')}</p>
              </header>
              <nav className="operation-shortcuts" aria-label={t('operationNavigation')}>
                <a href="#operating-title">CAT</a>
                <a href="#ptt-title">PTT</a>
                <a href="#rotor-title">Rotor</a>
                <a href="#radio-settings-title">{t('operationPower')}</a>
                <a href="#logbook-title">Logbook</a>
              </nav>
              <div className="operation-workspace-grid">
                <AgentLivePanel key={`live-${activeToken}`} token={activeToken} />
                <RadioOperatingPanel key={`operating-${activeToken}`} token={activeToken} />
                <PttPanel key={`ptt-${activeToken}`} token={activeToken} />
                <AudioPanel key={`audio-${activeToken}`} token={activeToken} />
                <RotorPanel key={`rotor-${activeToken}`} token={activeToken} />
                <RadioSettingsPanel key={`settings-${activeToken}`} token={activeToken} />
                <LogbookPanel key={`logbook-${activeToken}`} token={activeToken} />
              </div>
            </section>

            {snapshot ? (
              <section className="unavailable-grid" aria-label="Alcances no disponibles">
                <article className="unavailable-card">
                  <div className="section-title-row">
                    <span className="section-icon" aria-hidden="true">S</span>
                    <h2>Espectro nativo</h2>
                    <span className="state-pill state-unavailable">
                      {capabilityStatusLabel(snapshot.spectrum.status)}
                    </span>
                  </div>
                  <div className="scope-placeholder">
                    <span className="scope-grid" aria-hidden="true" />
                    <p>{snapshot.spectrum.message}</p>
                  </div>
                </article>
                <article className="unavailable-card">
                  <div className="section-title-row">
                    <span className="section-icon" aria-hidden="true">W</span>
                    <h2>Waterfall nativo</h2>
                    <span className="state-pill state-unavailable">
                      {capabilityStatusLabel(snapshot.waterfall.status)}
                    </span>
                  </div>
                  <div className="scope-placeholder">
                    <span className="scope-grid" aria-hidden="true" />
                    <p>{snapshot.waterfall.message}</p>
                  </div>
                </article>
              </section>
            ) : null}

            {snapshot ? (
              <section className="tx-banner" aria-labelledby="tx-title">
                <span className="tx-lock" aria-hidden="true">TX</span>
                <div>
                  <h2 id="tx-title">Transmisión remota bloqueada</h2>
                  <p>{snapshot.tx.reason} {t('snapshotTxNotice')}</p>
                </div>
                <span className="state-pill state-blocked">BLOQUEADO</span>
              </section>
            ) : null}

            {catalog ? (
              <section className="content-card" aria-labelledby="capabilities-title">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">COMPATIBILIDAD</p>
                    <h2 id="capabilities-title">Perfiles y capacidades</h2>
                  </div>
                  <span className="catalog-count">{catalog.models.length} perfiles · validación pendiente</span>
                </div>
                <div className="model-list">
                  {catalog.models.map((model) => (
                    <details className="model-item" key={`${model.manufacturer}-${model.model}`}>
                      <summary>
                        <span className="model-summary">
                          <strong>{model.manufacturer} {model.model}</strong>
                          <span>{model.connection}</span>
                        </span>
                        <span className="model-capability-count">
                          {model.capabilities.length} capacidades
                        </span>
                      </summary>
                      <div className="capability-list">
                        {model.capabilities.map((capability) => (
                          <article className="capability-row" key={capability.function}>
                            <div>
                              <strong>{statusLabel(capability.function)}</strong>
                              <p>{capability.implementation}</p>
                              <p className="capability-limitation">{capability.limitations[0]}</p>
                            </div>
                            <span className="state-pill state-unavailable">
                              {capabilityStatusLabel(capability.status)}
                            </span>
                            {capability.source_document ? (
                              <a
                                className="source-link"
                                href={capability.source_document}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Fuente
                              </a>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {radioCandidates ? (
              <section className="content-card" aria-labelledby="radio-candidates-title">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">CATÁLOGO DE INVESTIGACIÓN</p>
                    <h2 id="radio-candidates-title">Radios candidatas</h2>
                  </div>
                  <span className="catalog-count">
                    {radioCandidates.candidates.length} modelos · no validados
                  </span>
                </div>
                <p className="device-safety-note">{radioCandidates.notice}</p>
                <div className="model-list">
                  {[...groupCandidatesByManufacturer(radioCandidates.candidates)].map(
                    ([manufacturer, candidates]) => (
                      <details className="model-item" key={manufacturer}>
                        <summary>
                          <span className="model-summary">
                            <strong>{manufacturer}</strong>
                            <span>{candidates.length} candidatos</span>
                          </span>
                          <span className="model-capability-count">evidencia atribuida</span>
                        </summary>
                        <div className="capability-list">
                          {candidates.map((candidate) => (
                            <article
                              className="capability-row"
                              key={`${candidate.manufacturer}-${candidate.model}`}
                            >
                              <div>
                                <strong>{candidate.model}</strong>
                                <p>Conexión publicada: {candidate.connection_claim}</p>
                                <p>Bandas/alcance publicado: {candidate.bands_claim}</p>
                                <p>{scopeClaimLabel(candidate.third_party_scope_claim)}</p>
                                <p>{supportClaimLabel(candidate.third_party_support_status)}</p>
                                <p className="capability-limitation">
                                  {testedClaimLabel(candidate.third_party_tested)}
                                </p>
                              </div>
                              <span className="state-pill state-unavailable">
                                CANDIDATA · NO VALIDADA
                              </span>
                              <a
                                className="source-link"
                                href={candidate.source_url}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {candidate.evidence_source === 'third_party_listing'
                                  ? 'Ficha de referencia'
                                  : 'Documentación del proyecto'}
                              </a>
                            </article>
                          ))}
                        </div>
                      </details>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            <ProtocolPanel key={`protocol-${activeToken}`} token={activeToken} />

            <section className="content-card diagnostics-card" aria-labelledby="diagnostics-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">SERVICIO LOCAL</p>
                  <h2 id="diagnostics-title">Diagnóstico de demostración</h2>
                </div>
                <span className="catalog-count">API {catalog?.api_version ?? 'v1'}</span>
              </div>
              {diagnosticsAccessDenied ? (
                <p className="muted-copy">
                  El rol actual no tiene permiso para consultar el diagnóstico.
                </p>
              ) : diagnostics ? (
                <dl className="diagnostics-list">
                  <div><dt>Simulador activo</dt><dd>{diagnostics.simulator ? 'Sí' : 'No'}</dd></div>
                  <div><dt>Radio detectada</dt><dd>{diagnostics.hardware_discovered ? 'Sí' : 'No'}</dd></div>
                  <div><dt>Operaciones CAT</dt><dd>{diagnostics.cat_operations_enabled ? 'Habilitadas' : 'Deshabilitadas'}</dd></div>
                  <div><dt>Transmisión remota</dt><dd>{diagnostics.tx_enabled ? 'Habilitada' : 'Bloqueada'}</dd></div>
                </dl>
              ) : (
                <p className="muted-copy">El diagnóstico aún no se ha consultado.</p>
              )}
            </section>

            <section className="content-card device-inventory-card" aria-labelledby="devices-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">AGENTE DE ESTACIÓN · SOLO INVENTARIO</p>
                  <h2 id="devices-title">Interfaces USB y serie</h2>
                </div>
                <span className="catalog-count">
                  {deviceInventory ? `${deviceInventory.devices.length} interfaces` : 'Sin clasificar'}
                </span>
              </div>
              <p className="device-safety-note">
                Enumerar una interfaz no identifica el puerto CAT. El agente no abre
                puertos ni cambia RTS/DTR.
              </p>
              {agentUnavailable ? (
                <p className="muted-copy">
                  El agente local no está disponible. Inícialo con{' '}
                  <code>py -3.12 -m bricoham_station_agent</code> en este equipo y
                  actualiza los datos.
                </p>
              ) : null}
              {deviceAccessDenied ? (
                <p className="muted-copy">
                  El rol actual no tiene permiso para ver el inventario de interfaces.
                </p>
              ) : null}
              {deviceInventory && deviceInventory.devices.length === 0 ? (
                <p className="muted-copy">
                  No se detectaron interfaces serie en esta lectura. Esto no confirma
                  ni descarta compatibilidad de una radio.
                </p>
              ) : null}
              {deviceInventory && deviceInventory.devices.length > 0 ? (
                <div className="device-list">
                  {deviceInventory.devices.map((device) => (
                    <article className="device-row" key={device.port}>
                      <div className="device-heading">
                        <div>
                          <strong>{device.port}</strong>
                          <span>{device.description ?? 'Sin descripción disponible'}</span>
                        </div>
                        <span className="state-pill state-unavailable">NO CLASIFICADO</span>
                      </div>
                      <p>
                        {[device.manufacturer, device.product].filter(Boolean).join(' · ')
                          || 'Fabricante y producto no informados'}
                      </p>
                      <span className="device-identifiers">
                        VID {device.vid ?? '—'} · PID {device.pid ?? '—'}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeToken && !snapshot && !stationAccessDenied && !error ? (
          <div className="notice-banner" role="status">
            No hay datos de estación disponibles en este momento.
          </div>
        ) : null}
      </main>

      <footer className="footer">
        <span>{t('footer')}</span>
        <span>{t('footerSafety')}</span>
      </footer>
    </div>
  )
}

export default function LocalizedApp() {
  return <LanguageProvider><App /></LanguageProvider>
}
