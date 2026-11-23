import { render as renderComponent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCoordinatorUrl } from './api'
import { LanguageProvider } from './LanguageProvider'
import { MetersPanel } from './MetersPanel'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))
afterEach(() => { setCoordinatorUrl(''); vi.unstubAllGlobals() })

const KEYS: Record<string, string> = {
  RM1: 'smeter', RM2: 'smeter-sub', RM3: 'comp', RM4: 'alc', RM5: 'po', RM6: 'swr', RM7: 'id', RM8: 'vdd',
}
const RAW: Record<string, number> = { RM1: 0, RM2: 0, RM3: 0, RM4: 0, RM5: 0, RM6: 0, RM7: 0, RM8: 201 }
const tuner = { device: null, supported: true, tuning: false, max_seconds: 20, max_power_w: 10, last: { reason: 'time_cap', swr: 1.5, seconds: 20 } }

function stubApi(head: 'field' | 'SPA-1', watts: number) {
  const calls: Array<{ url: string; method: string }> = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, method: init?.method ?? 'GET' })
    if (url.endsWith('/accessories')) return Response.json({ api_version: 'v1', amplifier: {}, tuner })
    const command = new URL(url, 'https://host.test').searchParams.get('command') ?? ''
    if (command === 'PC') return Response.json({ power_control: { head, watts } })
    return Response.json({ meter: { key: KEYS[command], raw: RAW[command] } })
  }))
  return calls
}

describe('medidores y sintonía', () => {
  it('muestra los medidores normalizados, el estado de sintonía y el último resultado sin enviar nada', async () => {
    const calls = stubApi('field', 5)
    const user = userEvent.setup()
    render(<MetersPanel token="operator-token" />)
    await user.click(screen.getByText('Leer medidores'))
    expect(await screen.findByText('13.7 V')).toBeTruthy()
    expect(screen.getAllByText('S0')).toHaveLength(2)
    expect(screen.getByText('1:1')).toBeTruthy()
    expect(screen.getByText('0 W')).toBeTruthy()
    expect(screen.getByText(/time_cap · 20 s · SWR 1\.5/)).toBeTruthy()
    expect(screen.queryByText(/Sintonía bloqueada/)).toBeNull()
    expect(calls.every((call) => call.method === 'GET')).toBe(true)
    expect(calls.map((call) => call.url)).toContain('/api/v1/cat?command=RM8')
  })

  it('deja PO pendiente de fuente con el cabezal SPA-1 y bloquea la sintonía por encima de 10 W', async () => {
    stubApi('SPA-1', 50)
    const user = userEvent.setup()
    render(<MetersPanel token="operator-token" />)
    await user.click(screen.getByText('Leer medidores'))
    expect(await screen.findByText('pendiente de fuente')).toBeTruthy()
    expect(screen.getByText(/Sintonía bloqueada: la potencia supera el límite/)).toBeTruthy()
  })

  it('muestra el error cuando el agente rechaza la lectura', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'cat_invalid_query' }, { status: 400 })))
    const user = userEvent.setup()
    render(<MetersPanel token="operator-token" />)
    await user.click(screen.getByText('Leer medidores'))
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('table')).toBeNull()
  })
})
