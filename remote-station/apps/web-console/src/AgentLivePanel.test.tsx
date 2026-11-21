import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AgentLivePanel } from './AgentLivePanel'

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('agent live panel', () => {
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
