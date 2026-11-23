import { render as renderComponent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FeatureParityPanel } from './FeatureParityPanel'
import { LanguageProvider } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))
afterEach(() => vi.unstubAllGlobals())

const order = ['freqMode', 'ptt', 'tune', 'audioRx', 'futureFeature']
const catalog = {
  api_version: 'v1',
  feature_order: order,
  radios: [
    {
      id: 'yaesu-ftx-1', label: 'Yaesu FTX-1',
      features: {
        freqMode: { status: 'ok', reason: '' }, ptt: { status: 'ok', reason: '' },
        tune: { status: 'ok', reason: '' }, audioRx: { status: 'ok', reason: '' },
        futureFeature: { status: 'ok', reason: '' },
      },
    },
    {
      id: 'icom-ic-7300mk2', label: 'Icom IC-7300MK2',
      features: {
        freqMode: { status: 'partial', reason: 'Soporte beta: pueden faltar funciones.' },
        ptt: { status: 'partial', reason: 'Sin verificar en hardware.' },
        tune: { status: 'pendiente', reason: 'pendiente de fuente: sin comando citado.' },
        audioRx: { status: 'ok', reason: '' },
        futureFeature: { status: 'pendiente', reason: 'Motivo de prueba.' },
      },
    },
    {
      id: 'icom-ic-r8600', label: 'Icom IC-R8600',
      features: {
        freqMode: { status: 'ok', reason: '' }, ptt: { status: 'na', reason: 'Receptor sin TX.' },
        tune: { status: 'na', reason: 'Receptor sin TX.' }, audioRx: { status: 'ok', reason: '' },
        // futureFeature is absent: the control must still be listed, greyed out.
      },
    },
  ],
}

const item = (name: string) => screen.getByText(name).closest('li') as HTMLElement

describe('matriz de funciones remotas', () => {
  it('muestra los mismos controles y atenúa con su motivo los no disponibles', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(catalog)))
    const user = userEvent.setup()
    render(<FeatureParityPanel token="listener-token" />)

    // Supported radio: nothing greyed out.
    expect((await screen.findAllByRole('listitem')).length).toBe(order.length)
    expect(item('PTT (explícito, con límite de tiempo)').getAttribute('aria-disabled')).toBe('false')
    expect(item('Tune (portadora explícita)').getAttribute('aria-disabled')).toBe('false')

    // Partial radio: partial stays enabled, pending is disabled with the matrix reason.
    await user.selectOptions(screen.getByRole('combobox'), 'icom-ic-7300mk2')
    expect(screen.getAllByRole('listitem').length).toBe(order.length)
    expect(item('PTT (explícito, con límite de tiempo)').getAttribute('aria-disabled')).toBe('false')
    expect(item('Tune (portadora explícita)').getAttribute('aria-disabled')).toBe('true')
    expect(item('Tune (portadora explícita)').textContent).toContain('pendiente de fuente: sin comando citado.')

    // Receive-only radio: TX controls are disabled, and an unknown or missing feature never crashes.
    await user.selectOptions(screen.getByRole('combobox'), 'icom-ic-r8600')
    expect(screen.getAllByRole('listitem').length).toBe(order.length)
    expect(item('PTT (explícito, con límite de tiempo)').getAttribute('aria-disabled')).toBe('true')
    expect(item('PTT (explícito, con límite de tiempo)').textContent).toContain('Receptor sin TX.')
    expect(item('Audio RX').getAttribute('aria-disabled')).toBe('false')
    expect(item('futureFeature').getAttribute('aria-disabled')).toBe('true')
  })

  it('avisa sin romper si la matriz no se puede cargar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    render(<FeatureParityPanel token="listener-token" />)
    expect((await screen.findByRole('alert')).textContent).toBe('No se pudo cargar la matriz de funciones.')
    expect(screen.queryAllByRole('listitem').length).toBe(0)
  })
})
