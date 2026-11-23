import { render as renderComponent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCoordinatorUrl } from './api'
import { AccessoriesPanel } from './AccessoriesPanel'
import { LanguageProvider } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))
afterEach(() => setCoordinatorUrl(''))

const state = {
  api_version: 'v1',
  amplifier: { device: null, supported: false, state: 'standby', band: null, operate_allowed: false, standby_reason: null, pending_standby: false, readout: null },
  tuner: { device: null, supported: false, tuning: false, max_seconds: 20, max_power_w: 10 },
  support: [{ id: 'elecraft-kpa500', kind: 'amplifier', maker: 'Elecraft', model: 'KPA500', status: 'pendiente de fuente', enabled: false }],
}

describe('accesorios de estación', () => {
  it('lista dispositivos pendientes de fuente, deja OPERATE desactivado y STANDBY siempre disponible', async () => {
    const operations: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') operations.push(JSON.parse(String(init.body)) as Record<string, unknown>)
      return Response.json(state)
    }))
    const user = userEvent.setup()
    render(<AccessoriesPanel token="operator-token" />)
    await user.click(screen.getByText('Leer accesorios'))
    expect(await screen.findByText('pendiente de fuente')).toBeTruthy()
    expect(screen.getByText('OPERATE (explícito)').hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByText('STANDBY', { selector: 'button' }))
    await user.click(screen.getByText('PARADA DE EMERGENCIA'))
    expect(operations).toEqual([{ operation: 'standby' }, { operation: 'emergency_stop' }])
  })
})
