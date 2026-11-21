import { useState, type FormEvent } from 'react'
import profiles from './agent-profiles.json'
import { buildAgentCommand, SetupError, type AgentSetup } from './agentSetup'
import { useLanguage } from './i18n'

export function ConfigurationPanel() {
  const { t } = useLanguage()
  const [form, setForm] = useState<AgentSetup>({
    os: 'windows', agentFile: 'bricoham-station-agent.pyz', port: '8788', remote: false, listenHost: '127.0.0.1',
    certificate: '', privateKey: '', clientCa: '', cat: false, model: '', serialPort: '', baud: '', stopBits: '1',
  })
  const [command, setCommand] = useState('')
  const [error, setError] = useState<'invalidNumber' | 'invalidSetup' | 'downloadUnavailable' | ''>('')
  function update<K extends keyof AgentSetup>(key: K, value: AgentSetup[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setCommand('')
    setError('')
  }
  function prepare(event: FormEvent) {
    event.preventDefault()
    setCommand('')
    try { setCommand(buildAgentCommand(form)); setError('') }
    catch (failure) {
      if (!(failure instanceof SetupError)) console.error('Agent configuration failed.', failure)
      setError(failure instanceof SetupError ? failure.reason : 'invalidSetup')
    }
  }
  function download() {
    if (!command) return
    if (typeof URL.createObjectURL !== 'function') { setError('downloadUnavailable'); return }
    const url = URL.createObjectURL(new Blob([command + '\n'], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'bricoham-agent-command.txt'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="content-card operation-panel" aria-labelledby="setup-title">
    <h2 id="setup-title">{t('settings')}</h2>
    <p>{t('setupNotice')}</p>
    <form className="setup-grid" onSubmit={prepare}>
      <label>{t('operatingSystem')}<select value={form.os} onChange={(event) =>
        update('os', event.target.value === 'windows' ? 'windows' : 'posix')}>
        <option value="windows">Windows / PowerShell</option>
        <option value="posix">Linux / macOS / Raspberry Pi / POSIX</option>
      </select></label>
      <label>{t('agentFile')}<input value={form.agentFile} autoComplete="off" required
        onChange={(event) => update('agentFile', event.target.value)} /></label>
      <label>{t('agentPort')}<input type="number" min={1} max={65535} value={form.port} required
        onChange={(event) => update('port', event.target.value)} /></label>
      <label className="setup-check"><input type="checkbox" checked={form.remote}
        onChange={(event) => update('remote', event.target.checked)} />{t('remote')}</label>
      {form.remote ? <>
        <p role="alert" className="setup-warning">{t('remoteWarning')}</p>
        <label>{t('listenHost')}<input value={form.listenHost} required autoComplete="off"
          placeholder="192.168.1.10" onChange={(event) => update('listenHost', event.target.value)} /></label>
        <label>{t('certificate')}<input value={form.certificate} required autoComplete="off"
          onChange={(event) => update('certificate', event.target.value)} /></label>
        <label>{t('privateKey')}<input value={form.privateKey} required autoComplete="off"
          onChange={(event) => update('privateKey', event.target.value)} /></label>
        <label>{t('clientCa')}<input value={form.clientCa} autoComplete="off"
          onChange={(event) => update('clientCa', event.target.value)} /></label>
      </> : null}
      <label className="setup-check"><input type="checkbox" checked={form.cat}
        onChange={(event) => update('cat', event.target.checked)} />{t('enableCat')}</label>
      {form.cat ? <>
        <label>{t('model')}<select required value={form.model}
          onChange={(event) => update('model', event.target.value)}>
          <option value="">{t('chooseModel')}</option>
          {profiles.map((profile) => <option key={profile.model} value={profile.model}>{profile.model}</option>)}
        </select></label>
        <label>{t('serialPort')}<input required autoComplete="off" value={form.serialPort}
          onChange={(event) => update('serialPort', event.target.value)} /></label>
        <label>{t('baud')}<input required type="number" min={300} max={115200} value={form.baud}
          onChange={(event) => update('baud', event.target.value)} /></label>
        <label>{t('stopBits')}<select value={form.stopBits}
          onChange={(event) => update('stopBits', event.target.value)}>
          <option value="1">1</option><option value="2">2</option>
        </select></label>
      </> : null}
      <button className="button button-primary" type="submit">{t('prepare')}</button>
    </form>
    <p className="form-hint">{t('sourceHint')}</p>
    <p>{t('setupWarning')}</p>
    {error ? <p role="alert">{t(error)}</p> : null}
    {command ? <>
      <p role="status">{t('setupReady')}</p>
      <h3>{t('launchCommand')}</h3>
      <pre className="live-data">{command}</pre>
      <button className="button button-secondary" onClick={download}>{t('downloadSetup')}</button>
    </> : null}
  </section>
}
