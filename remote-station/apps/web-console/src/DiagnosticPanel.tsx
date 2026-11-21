import { useState, useSyncExternalStore } from 'react'
import { isDiagnosticReport, type DiagnosticReport } from '../../../../diagnostics-core.mjs'
import { useLanguage } from './i18n'
import { sendDiagnosticReport } from './api'
import {
  automaticDiagnostics, diagnosticBuffer, diagnosticSnapshot, diagnosticUploadState,
  setAutomaticDiagnostics, setDiagnosticUploadState, subscribeDiagnostics,
} from './diagnosticBuffer'

export function DiagnosticPanel({ token }: { token: string | null }) {
  const { t } = useLanguage()
  useSyncExternalStore(subscribeDiagnostics, diagnosticSnapshot)
  const [imported, setImported] = useState<DiagnosticReport | null>(null)
  const [error, setError] = useState('')
  const report = imported ?? diagnosticBuffer.report()
  const state = diagnosticUploadState()

  function download() {
    if (!report) { setError(t('diagnosticsEmpty')); return }
    if (typeof URL.createObjectURL !== 'function') { setError(t('downloadUnavailable')); return }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = 'bricohams-diagnostic-report.json'
      link.click()
    } finally { URL.revokeObjectURL(url) }
  }

  async function upload() {
    if (!token) { setError(t('diagnosticsNeedToken')); return }
    if (!report) { setError(t('diagnosticsEmpty')); return }
    setError('')
    setDiagnosticUploadState('sending')
    try {
      await sendDiagnosticReport(token, report, AbortSignal.timeout(10_000))
      setDiagnosticUploadState('sent')
    } catch (failure) {
      if (!(failure instanceof Error)) throw failure
      setError(t('diagnosticsSendFailed'))
      setDiagnosticUploadState('error')
    }
  }

  async function importFile(file: File) {
    setError('')
    try {
      if (file.size > 4096) throw new TypeError('Diagnostic file too large')
      const value: unknown = JSON.parse(await file.text())
      if (!isDiagnosticReport(value)) throw new TypeError('Invalid diagnostic file')
      setImported(value)
      setError('')
      setDiagnosticUploadState('idle')
    } catch (failure) {
      if (!(failure instanceof Error)) throw failure
      setImported(null)
      setError(t('diagnosticsInvalidImport'))
    }
  }

  return <section className="panel" aria-labelledby="diagnostic-report-title">
    <h2 id="diagnostic-report-title">{t('diagnosticsTitle')}</h2>
    <p>{t('diagnosticsPrivacy')}</p>
    {diagnosticBuffer.storageError ? <p role="alert">{t('diagnosticsLocalError')}</p> : null}
    <label><input type="checkbox" checked={automaticDiagnostics()} disabled={!token}
      onChange={event => setAutomaticDiagnostics(event.target.checked)} />{t('diagnosticsAutomatic')}</label>
    <p>{t('diagnosticsNeedToken')}</p>
    <label>{t('diagnosticsImport')}<input type="file" accept=".json,application/json"
      onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file) }} /></label>
    <details><summary>{t('diagnosticsPreview')}</summary><pre>{JSON.stringify(report, null, 2)}</pre></details>
    <div className="connection-actions">
      <button type="button" className="button button-secondary" onClick={download}>{t('diagnosticsDownload')}</button>
      <button type="button" className="button button-primary" disabled={!token || state === 'sending'}
        onClick={() => { void upload() }}>{t('diagnosticsUpload')}</button>
      <button type="button" className="button button-secondary" onClick={() => {
        setImported(null)
        diagnosticBuffer.clear()
        setError('')
        setDiagnosticUploadState('idle')
      }}>{t('diagnosticsClear')}</button>
    </div>
    {state === 'sent' ? <p role="status">{t('diagnosticsSent')}</p> : null}
    {error || state === 'error' ? <p role="alert">{error || t('diagnosticsSendFailed')}</p> : null}
  </section>
}
