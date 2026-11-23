import { render as renderComponent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCoordinatorUrl } from './api'
import { FlexPanel } from './FlexPanel'
import { LanguageProvider } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))
afterEach(() => setCoordinatorUrl(''))

function state(tx: Record<string, unknown>) {
  return {
    api_version: 'v1', source: 'smartsdr_tcp', version: '3.4.0',
    tx: { enabled: false, active: false, swr_tripped: false, off_unverified: false, tune_limit: 10, cap_s: 30, ...tx },
    pending_de_fuente: ['keepalive'],
  }
}

describe('panel FlexRadio', () => {
  it('deja TUNE y ATU desactivados con TX por defecto apagada y muestra pendientes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(state({}))))
    render(<FlexPanel token="operator-token" />)
    await userEvent.setup().click(screen.getByText('Leer estado'))
    expect(await screen.findByText(/TX desactivada/)).toBeTruthy()
    expect(screen.getByText('Sintonizar (TUNE)').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('keepalive').hasAttribute('disabled')).toBe(true)
  })

  it('bloquea TUNE cuando el SWR disparó la protección', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(state({ enabled: true, swr_tripped: true }))))
    render(<FlexPanel token="operator-token" />)
    await userEvent.setup().click(screen.getByText('Leer estado'))
    await screen.findByText(/TX habilitada/)
    expect(screen.getByText('Sintonizar (TUNE)').hasAttribute('disabled')).toBe(true)
  })
})
