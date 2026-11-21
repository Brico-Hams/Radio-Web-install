import { useState, type FormEvent } from 'react'
import { buildHostCommand, SetupError, type HostSetup } from './agentSetup'
import { useLanguage } from './i18n'

export function HostConfigurationPanel() {
  const { t } = useLanguage()
  const [form, setForm] = useState<HostSetup>({
    os:'windows', port:'8787', certificate:'', privateKey:'', agentUrl:'',
    agentCa:'', clientCertificate:'', clientKey:'', origins:'',
  })
  const [command, setCommand] = useState('')
  const [error, setError] = useState<'invalidNumber' | 'invalidSetup' | ''>('')
  function update<K extends keyof HostSetup>(key: K, value: HostSetup[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setCommand('')
    setError('')
  }
  function prepare(event: FormEvent) {
    event.preventDefault()
    setCommand('')
    try { setCommand(buildHostCommand(form)); setError('') }
    catch (failure) {
      if (!(failure instanceof SetupError)) console.error('Host configuration failed.', failure)
      setError(failure instanceof SetupError ? failure.reason : 'invalidSetup')
    }
  }
  return <section className="content-card operation-panel" aria-labelledby="host-setup-title">
    <h2 id="host-setup-title">{t('hostSetup')}</h2>
    <p>{t('hostNotice')}</p>
    <form className="setup-grid" onSubmit={prepare}>
      <label>{t('hostSystem')}<select value={form.os} onChange={(event) =>
        update('os', event.target.value === 'windows' ? 'windows' : 'posix')}>
        <option value="windows">Windows / PowerShell</option><option value="posix">Linux / macOS / Raspberry Pi / POSIX</option>
      </select></label>
      <label>{t('hostPort')}<input required type="number" min={1} max={65535} value={form.port}
        onChange={(event) => update('port', event.target.value)} /></label>
      {(['certificate','privateKey','agentCa','clientCertificate','clientKey','origins'] as const).map((key) =>
        <label key={key}>{t(key)}<input value={form[key]} autoComplete="off"
          required={key === 'certificate' || key === 'privateKey' || key === 'agentCa'}
          onChange={(event) => update(key, event.target.value)} /></label>)}
      <label>{t('agentUrl')}<input required type="url" value={form.agentUrl} autoComplete="off"
        placeholder="https://station.example.org:8788" onChange={(event) => update('agentUrl', event.target.value)} /></label>
      <button className="button button-primary" type="submit">{t('prepare')}</button>
    </form>
    {error ? <p role="alert">{t(error)}</p> : null}
    {command ? <><p role="status">{t('setupReady')}</p><pre className="live-data">{command}</pre></> : null}
  </section>
}
