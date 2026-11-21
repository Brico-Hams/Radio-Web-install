import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAudioRequest, createQso, getApiData, sendDiagnosticReport, setCoordinatorUrl } from './api'
import { automaticDiagnostics, diagnosticBuffer, setAutomaticDiagnostics } from './diagnosticBuffer'

afterEach(() => {
  setCoordinatorUrl('')
  vi.unstubAllGlobals()
})

describe('host HTTPS', () => {
  it('revoca el consentimiento al cambiar de host y conserva los errores de red sin copiar datos privados', async () => {
    setCoordinatorUrl('https://first.test')
    setAutomaticDiagnostics(true)
    setCoordinatorUrl('https://second.test')
    expect(automaticDiagnostics()).toBe(false)
    const failure = new TypeError('TOKEN private-user C:\\Users\\private')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))
    await expect(getApiData('secret', '/devices', (value): value is object =>
      typeof value === 'object' && value !== null)).rejects.toBe(failure)
    const report = JSON.stringify(diagnosticBuffer.report())
    expect(report).toContain('connection_failed')
    expect(report).not.toContain('private-user')
    expect(report).not.toContain('TOKEN')
  })
  it('solo envía diagnóstico mínimo por HTTPS y exige confirmación exacta', async () => {
    diagnosticBuffer.record('operation_failed', 'api', 'error', 'io')
    const report = diagnosticBuffer.report()
    if (!report) throw new Error('Test report missing')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"accepted":true}', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    setCoordinatorUrl('https://host.test')
    await sendDiagnosticReport('diagnostic-secret', report)
    expect(fetchMock).toHaveBeenCalledWith('https://host.test/api/v1/diagnostic-reports',
      expect.objectContaining({ method: 'POST', redirect: 'error', credentials: 'omit' }))
    expect(JSON.stringify(report)).not.toContain('diagnostic-secret')
    for (const body of ['{"accepted":true,"tracking_id":"private"}', '{', ' '.repeat(257)]) {
      fetchMock.mockResolvedValue(new Response(body, { status: 202 }))
      await expect(sendDiagnosticReport('diagnostic-secret', report)).rejects.toThrow()
    }
    fetchMock.mockResolvedValue(new Response('{"accepted":true}', { status: 200 }))
    await expect(sendDiagnosticReport('diagnostic-secret', report)).rejects.toThrow()
  })
  it('rechaza HTTP, credenciales y URLs que no sean un origen', () => {
    for (const url of ['http://host.test', 'https://u:p@host.test',
      'https://host.test/api', 'https://host.test/?token=secret', 'https://host.test/#token']) {
      expect(() => setCoordinatorUrl(url)).toThrow()
    }
  })

  it('usa el host HTTPS sin cookies, redirecciones ni referrer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    setCoordinatorUrl('https://host.test:8787/')
    await getApiData('secret', '/devices', (value): value is object =>
      typeof value === 'object' && value !== null)
    expect(fetchMock).toHaveBeenCalledWith('https://host.test:8787/api/v1/devices',
      expect.objectContaining({
        credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: { Authorization: 'Bearer secret' },
      }))
  })

  it('envía también las escrituras de logbook al host seleccionado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ api_version: 'v1', qso_id: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    setCoordinatorUrl('https://host.test')
    await createQso('secret', {
      call: 'N0CALL', started_at: '2026-01-01T00:00:00Z', frequency_hz: 14074000, mode: 'FT8',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://host.test/api/v1/logbook',
      expect.objectContaining({ method: 'POST', redirect: 'error', credentials: 'omit' }))
  })

  it('fija el host y token de audio sin redirecciones aunque cambie el host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response())
    vi.stubGlobal('fetch', fetchMock)
    setCoordinatorUrl('https://first.test')
    const request = createAudioRequest('secret')
    setCoordinatorUrl('https://second.test')
    const signal = new AbortController().signal
    await request(signal)
    expect(fetchMock).toHaveBeenCalledWith('https://first.test/api/v1/audio/stream',
      expect.objectContaining({
        credentials: 'omit', redirect: 'error', signal,
        headers: { Authorization: 'Bearer secret' },
      }))
  })
})
