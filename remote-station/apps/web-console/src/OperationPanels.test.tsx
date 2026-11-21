import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LogbookPanel, ProtocolPanel } from './OperationPanels'

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('operation panels', () => {
  it('distinguishes model, family and missing codecs without offering hardware commands', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      api_version: 'v1', schema_version: '1.0', transport_enabled: false,
      hardware_validation_complete: false,
      candidates: [
        { manufacturer: 'Icom', model: 'IC-7300', protocol: 'Icom CI-V',
          hardware_status: 'unsupported', binding_status: 'model_profile',
          queries: [{ command: '03', reply_decoder: true }] },
        { manufacturer: 'FlexRadio', model: 'FLEX-8600', protocol: 'SmartSDR TCP syntax',
          hardware_status: 'unsupported', binding_status: 'family_syntax_only', queries: [] },
        { manufacturer: 'Icom', model: 'IC-7100', protocol: null,
          hardware_status: 'unsupported', binding_status: 'unimplemented', queries: [] },
      ],
    })))
    const user = userEvent.setup()
    render(<ProtocolPanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar protocolos' }))
    expect(await screen.findByText(/Decoder offline disponible/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Modelo CAT'), 'FLEX-8600')
    expect(screen.getByText(/Solo sintaxis de familia/)).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('Modelo CAT'), 'IC-7100')
    expect(screen.getByText(/Sin perfil implementado/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /enviar|ptt|transmitir/i })).toBeNull()
  })

  it.each(['FT8', 'FT4'])('records an explicit %s contact and reloads the list', async (mode) => {
    let saved = false
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          call: 'EA1ABC', started_at: '2026-11-20T12:00:00Z', frequency_hz: 7074000, mode,
        })
        expect(init.headers).toEqual({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' })
        saved = true
        return json({ api_version: 'v1', qso_id: 1 }, 201)
      }
      return json({ api_version: 'v1', offset: 0, has_more: false, can_write: true,
        qsos: saved ? [{ call: 'EA1ABC', started_at: '2026-11-20T12:00:00+00:00',
          frequency_hz: 7074000, mode }] : [] })
    })
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<LogbookPanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar logbook' }))
    const call = await screen.findByLabelText('Indicativo del contacto')
    expect((call as HTMLInputElement).value).toBe('')
    await user.type(call, 'EA1ABC')
    await user.type(screen.getByLabelText('Fecha/hora ISO con zona'), '2026-11-20T12:00:00Z')
    await user.type(screen.getByLabelText('Frecuencia del QSO (Hz)'), '7074000')
    await user.selectOptions(screen.getByLabelText('Modo del QSO'), mode)
    await user.click(screen.getByRole('button', { name: 'Guardar QSO' }))
    expect(await screen.findByText('EA1ABC')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('QSO guardado en SQLite')
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  })

  it('hides writes from listeners and downloads authenticated ADIF', async () => {
    const createUrl = vi.fn(() => 'blob:test')
    const revokeUrl = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/adif')
        ? new Response('<ADIF_VER:5>3.1.4 <EOH>\n', { headers: { 'Content-Type': 'application/x-adif' } })
        : json({ api_version: 'v1', offset: 0, has_more: false, can_write: false, qsos: [] }))
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<LogbookPanel token="listener-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar logbook' }))
    await screen.findByText(/Tu rol permite leer y exportar/)
    expect(screen.queryByRole('button', { name: 'Guardar QSO' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Exportar ADIF' }))
    expect(fetch).toHaveBeenLastCalledWith('/api/v1/logbook/adif', expect.objectContaining({
      credentials: 'omit', headers: { Authorization: 'Bearer listener-token' },
    }))
    expect(createUrl).toHaveBeenCalledOnce()
    expect(revokeUrl).toHaveBeenCalledWith('blob:test')
  })

  it('reports disabled logbook and failed writes without silently retrying', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST' ? json({}, 400)
        : json({ api_version: 'v1', offset: 0, has_more: false, can_write: true, qsos: [] }))
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<LogbookPanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar logbook' }))
    await user.type(await screen.findByLabelText('Indicativo del contacto'), 'EA1ABC')
    await user.type(screen.getByLabelText('Fecha/hora ISO con zona'), 'invalid')
    await user.type(screen.getByLabelText('Frecuencia del QSO (Hz)'), '7074000')
    await user.click(screen.getByRole('button', { name: 'Guardar QSO' }))
    expect((await screen.findByRole('alert')).textContent).toContain('QSO no válido')
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    fetch.mockImplementation(async () => json({}, 503))
    await user.click(screen.getByRole('button', { name: 'Consultar logbook' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Logbook web desactivado')
  })
})
