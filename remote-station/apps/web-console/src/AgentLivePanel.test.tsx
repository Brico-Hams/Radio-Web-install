import { fireEvent, render as renderComponent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentLivePanel } from './AgentLivePanel'
import { LanguageProvider, LanguageSelector } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('agent live panel', () => {
  it.each([
    ['en', 'Read-only CAT query', 'Read CAT query'],
    ['fr', 'Requête CAT en lecture seule', 'Lire la requête CAT'],
    ['pt', 'Consulta CAT de leitura', 'Ler consulta CAT'],
  ])('preserves the selected CAT query while changing language to %s', async (lang, label, read) => {
    const fetch = vi.fn(async () => json({
      api_version: 'v1', data_is_simulated: false, status: 'experimental',
      model: 'FTX-1', queries: ['FA', 'FB'], tx_control_enabled: false,
    }))
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<><LanguageSelector /><AgentLivePanel token="test-token" /></>)
    await user.click(screen.getByRole('button', { name: 'Consultar configuración CAT' }))
    const select = await screen.findByLabelText<HTMLSelectElement>('Consulta CAT de lectura')
    await user.selectOptions(select, 'FB')
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: lang } })
    expect(screen.getByLabelText(label)).toBe(select)
    expect(select.value).toBe('FB')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: read }).disabled).toBe(false)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('offers only opt-in Replay and Halt Tx and explicitly marks delivery unconfirmed', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body))
        return json({
          api_version: 'v1', data_is_simulated: false, operation: body.operation,
          delivery: 'sent_unconfirmed', transmission_stopped_confirmed: false,
          trust: 'untrusted_local_udp',
        })
      }
      return json({
        api_version: 'v1', data_is_simulated: false, source: 'wsjtx_udp',
        commands_enabled: true, commands_ready: true, allowed_operations: ['replay', 'halt_tx'],
        connected: true, decodes: [], authenticated: false,
        suitable_for_control: false, trust: 'untrusted_local_udp',
      })
    })
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<AgentLivePanel token="test-token" />)
    expect(fetch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Consultar WSJT-X' }))
    await user.click(await screen.findByRole('button', { name: 'Recuperar decodificaciones WSJT-X' }))
    expect((await screen.findByRole('status')).textContent).toContain('Replay enviado sin confirmación')
    await user.click(screen.getByRole('button', { name: 'Solicitar parada TX de WSJT-X' }))
    expect((await screen.findByRole('status')).textContent).toContain('Halt Tx enviado sin confirmación')
    const posts = fetch.mock.calls.filter(([, options]) => options?.method === 'POST')
    expect(posts).toHaveLength(2)
    expect(posts.map(([, options]) => JSON.parse(String(options?.body)).operation))
      .toEqual(['replay', 'halt_tx'])
    for (const [url, options] of posts) {
      expect(url).toBe('/api/v1/digital')
      expect(options?.headers).toEqual({
        Authorization: 'Bearer test-token', 'Content-Type': 'application/json',
      })
      expect(JSON.parse(String(options?.body)).request_id).toMatch(/^[a-f0-9-]{36}$/)
    }
  })

  it('blocks stale opt-in commands and clears command controls after delivery errors', async () => {
    let reads = 0
    const fetch = vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) =>
      options?.method === 'POST' ? json({
        api_version: 'v1', error: { code: 'wsjtx_instance_unavailable' },
      }, 503) : json({
        api_version: 'v1', data_is_simulated: false, source: 'wsjtx_udp',
        commands_enabled: true, commands_ready: ++reads > 1,
        allowed_operations: ['replay', 'halt_tx'], connected: true, decodes: [],
        authenticated: false, suitable_for_control: false, trust: 'untrusted_local_udp',
      }))
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<AgentLivePanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar WSJT-X' }))
    expect((await screen.findByRole<HTMLButtonElement>('button', {
      name: 'Solicitar parada TX de WSJT-X',
    })).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Consultar WSJT-X' }))
    await user.click(await screen.findByRole('button', { name: 'Solicitar parada TX de WSJT-X' }))
    expect((await screen.findByRole('alert')).textContent).toContain('wsjtx_instance_unavailable')
    expect(screen.queryByRole('button', { name: 'Solicitar parada TX de WSJT-X' })).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('only reads an explicitly selected allowlisted CAT command', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => json({
      api_version: 'v1', data_is_simulated: false, status: 'experimental',
      model: 'K4', queries: ['FA'], tx_control_enabled: false,
      ...(String(input).includes('?') ? { frequency_hz: 14074000 } : {}),
    }))
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(<AgentLivePanel token="test-token" />)
    expect(fetch).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Consultar configuración CAT' }))
    await screen.findByText(/K4 · EXPERIMENTAL/)
    expect(fetch).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Leer consulta CAT' }))
    expect(await screen.findByText(/"frequency_hz": 14074000/)).toBeTruthy()
    expect(fetch).toHaveBeenLastCalledWith('/api/v1/cat?command=FA', expect.objectContaining({
      headers: { Authorization: 'Bearer test-token' },
    }))
  })

  it('marks disconnected WSJT-X data as historical and never offers TX', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      api_version: 'v1', data_is_simulated: false, source: 'wsjtx_udp',
      commands_enabled: false, connected: false, decodes: [],
      authenticated: false, suitable_for_control: false, trust: 'untrusted_local_udp',
    })))
    const user = userEvent.setup()
    render(<AgentLivePanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar WSJT-X' }))
    expect(await screen.findByText(/cualquier dato retenido es histórico/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /transmitir|ptt/i })).toBeNull()
  })

  it('surfaces the agent error code instead of substituting simulated data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({
      api_version: 'v1', error: { code: 'cat_timeout' },
    }, 503)))
    const user = userEvent.setup()
    render(<AgentLivePanel token="test-token" />)
    await user.click(screen.getByRole('button', { name: 'Consultar configuración CAT' }))
    expect((await screen.findByRole('alert')).textContent).toContain('cat_timeout')
    expect(screen.queryByRole('button', { name: 'Leer consulta CAT' })).toBeNull()
  })
})
